import {validateManifest,VERSION} from '../src/release-manifest.js';
const sources=new Set(['header','releases','direct']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const bot=request=>/bot|crawler|spider|preview|headless/i.test(request.headers.get('User-Agent')||'');
export function parseRange(value,size){
 if(!value)return null;
 const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||(!m[1]&&!m[2]))throw Error('Invalid range');
 let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Number(m[2]):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start||(!m[1]&&Number(m[2])===0))throw Error('Invalid range');
 end=Math.min(end,size-1);return {offset:start,length:end-start+1};
}
async function manifest(env,version){
 const object=await env.RELEASES.get(version?`releases/${version}/manifest.json`:'releases/latest.json');
 if(!object)return null;
 const m=validateManifest(await object.json());if(version&&m.version!==version)throw Error('Mismatched release');return m;
}
function count(env,ctx,request,version,platform,source,event){
 if(request.headers.get('Authorization')===`Bearer ${env.STATS_TOKEN}`&&env.STATS_TOKEN)return;
 if(!env.DOWNLOADS||bot(request)||request.headers.get('Purpose')==='prefetch'||request.headers.get('Sec-Purpose')?.includes('prefetch'))return;
 const day=new Date().toISOString().slice(0,10);
 // Persist only aggregate dimensions. No IP, browser details, cookies, or page content.
 ctx.waitUntil(env.DOWNLOADS.prepare('INSERT INTO download_counts(day,version,platform,source,event,count) VALUES (?1,?2,?3,?4,?5,1) ON CONFLICT(day,version,platform,source,event) DO UPDATE SET count=count+1').bind(day,version,platform,source,event).run().catch(()=>{}));
}
async function limitedJson(request){
 const reader=request.body?.getReader();if(!reader)throw Error('Empty body');let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>512)throw Error('Body too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const all=new Uint8Array(size);let offset=0;for(const chunk of chunks){all.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(all));
}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname;
 if(env.CANONICAL_HOST&&[env.CANONICAL_HOST,'www.'+env.CANONICAL_HOST].includes(url.hostname)&&(url.protocol!=='https:'||url.hostname!==env.CANONICAL_HOST)){url.protocol='https:';url.hostname=env.CANONICAL_HOST;return Response.redirect(url.href,308);}
 try{
  if(path==='/api/releases'){
   if(request.method!=='GET')return json({error:'Method not allowed'},405);
   const m=await manifest(env);return m?json(m):json({error:'No release published'},404);
  }
  if(path==='/api/download-click'){
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Invalid request'},403);
   let p;try{p=await limitedJson(request);}catch{return json({error:'Invalid payload'},400);}
   if(Object.keys(p||{}).sort().join(',')!=='platform,source,version'||!VERSION.test(p.version)||!['mac','windows'].includes(p.platform)||!sources.has(p.source))return json({error:'Invalid payload'},400);
   const m=await manifest(env,p.version);if(!m?.downloads[p.platform])return json({error:'Release not found'},404);
   count(env,ctx,request,p.version,p.platform,p.source,'click');return new Response(null,{status:204});
  }
  if(path==='/api/stats'){
   if(request.method!=='GET')return json({error:'Method not allowed'},405);
   if(!env.STATS_TOKEN||request.headers.get('Authorization')!==`Bearer ${env.STATS_TOKEN}`)return json({error:'Unauthorized'},401);
   const days=Math.min(90,Math.max(1,Number(url.searchParams.get('days'))||30));
   const from=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
   const rows=await env.DOWNLOADS.prepare('SELECT day,version,platform,source,event,count FROM download_counts WHERE day>=?1 ORDER BY day DESC,version,platform,source,event').bind(from).all();
   return json({metric:'Button clicks and download requests; not unique people or completed installations.',days,rows:rows.results});
  }
  if(path.startsWith('/download/')){
   if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
   const match=/^\/download\/([^/]+)\/(mac|windows)$/.exec(path);if(!match||!VERSION.test(match[1]))return json({error:'Not found'},404);
   const [,version,platform]=match,m=await manifest(env,version),a=m?.downloads[platform];if(!a)return json({error:'Release not found'},404);
   const info=await env.RELEASES.head(a.key);if(!info||info.size!==a.size)return json({error:'Artifact unavailable'},503);
   const headers=new Headers({'Content-Type':platform==='mac'?'application/x-apple-diskimage':'application/zip','Content-Disposition':`attachment; filename="${a.name}"`,'Content-Length':String(info.size),'Accept-Ranges':'bytes','ETag':info.httpEtag,'X-Checksum-SHA256':a.sha256,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
   if(request.headers.get('If-None-Match')===info.httpEtag)return new Response(null,{status:304,headers});
   if(request.method==='HEAD')return new Response(null,{headers});
   let range;try{range=parseRange(request.headers.get('Range'),info.size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${info.size}`}});}
   if(request.headers.get('If-Range')&&request.headers.get('If-Range')!==info.httpEtag)range=null;
   const object=await env.RELEASES.get(a.key,range?{range}:undefined);if(!object?.body||object.httpEtag!==info.httpEtag)return json({error:'Artifact unavailable'},503);
   if(range){headers.set('Content-Length',String(range.length));headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${info.size}`);}
   if(!range||range.offset===0){const source=url.searchParams.get('source');count(env,ctx,request,version,platform,sources.has(source)?source:'direct','request');}
   return new Response(object.body,{status:range?206:200,headers});
  }
  if(path.startsWith('/api/'))return json({error:'Not found'},404);
  const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');return new Response(response.body,{status:response.status,headers});
 }catch{return json({error:'Service temporarily unavailable'},503);}
}};
