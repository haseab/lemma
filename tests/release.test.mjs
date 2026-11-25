import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker,{parseRange} from '../cloudflare/worker.js';
import {validateManifest,publicDownloads} from '../src/release-manifest.js';
import {signingOptions} from '../scripts/lib/release-config.mjs';
const sample=()=>({schema:1,version:'1.2.3',publishedAt:'2026-01-01T00:00:00.000Z',notesUrl:'https://github.com/example/lemma/releases/tag/v1.2.3',downloads:{mac:{name:'Lemma-1.2.3-mac-arm64.dmg',key:'releases/1.2.3/Lemma-1.2.3-mac-arm64.dmg',size:8,sha256:'a'.repeat(64),minimumSystem:'macOS 13.0+',notarized:true}}});
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('cloudflare/schema.sql','utf8'));const waits=[],m=sample();
 const info={size:8,httpEtag:'"etag"'};
 const env={STATS_TOKEN:'test-secret-access-token',DOWNLOADS:{prepare:sql=>({bind:(...values)=>({run:async()=>db.prepare(sql).run(...values),all:async()=>({results:db.prepare(sql).all(...values)})})})},RELEASES:{head:async key=>key===m.downloads.mac.key?info:null,get:async(key,options)=>{if(key==='releases/latest.json'||key==='releases/1.2.3/manifest.json')return {json:async()=>m};if(key!==m.downloads.mac.key)return null;const text='abcdefgh',r=options?.range;return {...info,body:r?text.slice(r.offset,r.offset+r.length):text};}},ASSETS:{fetch:async()=>new Response('site')}};
 return {env,db,request:(path,init)=>worker.fetch(new Request('https://example.org'+path,init),env,{waitUntil:p=>waits.push(p)}),flush:()=>Promise.all(waits),close:()=>db.close()};
}
test('release schema rejects unnotarized Mac artifacts, unsafe keys and incomplete signing configuration',()=>{
 assert.equal(publicDownloads(sample()).mac.url,'/download/1.2.3/mac?source=header');
 for(const change of [m=>m.downloads.mac.notarized=false,m=>m.downloads.mac.key='../private',m=>m.downloads.mac.sha256='invalid',m=>m.notesUrl='https://example.org/notes',m=>m.version='../1']){const m=sample();change(m);assert.throws(()=>validateManifest(m));}
 assert.throws(()=>signingOptions({LEMMA_SIGN_IDENTITY:'-'}));assert.throws(()=>signingOptions({LEMMA_SIGN_IDENTITY:'a'.repeat(40)}),/NOTARY_PROFILE/);
});
test('worker streams releases, supports suffix/resume ranges, excludes HEAD and non-initial ranges from counts',async()=>{
 const f=fixture();assert.equal((await f.request('/api/releases')).status,200);
 assert.equal((await f.request('/download/1.2.3/mac',{method:'HEAD'})).headers.get('Content-Length'),'8');
 const full=await f.request('/download/1.2.3/mac?source=header');assert.equal(full.status,200);assert.equal(await full.text(),'abcdefgh');
 const range=await f.request('/download/1.2.3/mac',{headers:{Range:'bytes=3-5'}});assert.equal(range.status,206);assert.equal(await range.text(),'def');assert.equal(range.headers.get('Content-Range'),'bytes 3-5/8');
 const suffix=await f.request('/download/1.2.3/mac',{headers:{Range:'bytes=-2'}});assert.equal(await suffix.text(),'gh');
 assert.equal((await f.request('/download/1.2.3/mac',{headers:{Range:'bytes=99-'}})).status,416);assert.equal((await f.request('/download/1.2.3/mac',{headers:{'If-None-Match':'"etag"'}})).status,304);
 await f.flush();assert.equal(f.db.prepare('SELECT SUM(count) AS n FROM download_counts').get().n,1);f.close();
});
test('click counters enforce same-origin bounded enum-only payloads and protected aggregate reporting',async()=>{
 const f=fixture(),payload={version:'1.2.3',platform:'mac',source:'header'},post=p=>({method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify(p)});
 assert.equal((await f.request('/api/download-click',post(payload))).status,204);
 assert.equal((await f.request('/api/download-click',post({...payload,equations:'x+1'}))).status,400);
 assert.equal((await f.request('/api/download-click',post({...payload,version:'9.9.9'}))).status,404);
 assert.equal((await f.request('/api/download-click',{...post(payload),headers:{Origin:'https://elsewhere.example','Content-Type':'application/json'}})).status,403);
 assert.equal((await f.request('/api/download-click',post({...payload,source:'x'.repeat(1000)}))).status,400);
 await f.request('/download/1.2.3/mac',{headers:{'User-Agent':'test crawler'}});await f.flush();
 assert.equal((await f.request('/api/stats')).status,401);const report=await f.request('/api/stats',{headers:{Authorization:'Bearer test-secret-access-token'}});assert.equal(report.status,200);const data=await report.json();assert.equal(data.rows.length,1);assert.equal(data.rows[0].event,'click');assert.deepEqual(Object.keys(data.rows[0]).sort(),['count','day','event','platform','source','version']);
 assert.deepEqual(f.db.prepare('PRAGMA table_info(download_counts)').all().map(r=>r.name),['day','version','platform','source','event','count']);f.close();
});
test('range parser bounds malformed and multiple ranges',()=>{assert.deepEqual(parseRange('bytes=0-99',8),{offset:0,length:8});for(const r of ['bytes=','bytes=2-1','bytes=-0','bytes=0-1,3-4','bytes=9007199254740993-'])assert.throws(()=>parseRange(r,8));});

const {notaryArguments}=await import('../scripts/lib/notary.mjs');
test('notarization supports Keychain or runtime credentials and rejects incomplete credentials',()=>{
 assert.deepEqual(notaryArguments({LEMMA_NOTARY_PROFILE:'example-profile'}),['--keychain-profile','example-profile']);
 assert.throws(()=>notaryArguments({APPLE_ID:'person@example.org'}),/Configure/);
 assert.deepEqual(notaryArguments({APPLE_ID:'person@example.org',APPLE_TEAM_ID:'EXAMPLE123',APPLE_APP_PASSWORD:'example-test-value'}),['--apple-id','person@example.org','--team-id','EXAMPLE123','--password','example-test-value']);
});
