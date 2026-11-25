import {readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {validateManifest} from '../src/release-manifest.js';
import {publicRepository} from './lib/release-config.mjs';
import {config,wrangler} from './lib/cloudflare-cli.mjs';
const version=JSON.parse(await readFile('package.json','utf8')).version,out=path.resolve('release',version),repository=publicRepository(process.env.LEMMA_REPOSITORY_URL),repo=repository.split('/').slice(-2).join('/'),origin=new URL(process.env.LEMMA_PUBLIC_URL||'');
if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Set LEMMA_PUBLIC_URL to the deployed HTTPS website.');
const m=validateManifest(JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'))),provenance=JSON.parse(await readFile(path.join(out,'provenance.json'),'utf8'));
if(m.version!==version||m.notesUrl!==`${repository}/releases/tag/v${version}`||!provenance.notarized||!/^[a-f0-9]{40}$/.test(provenance.commit))throw Error('Release metadata mismatch');
for(const label of ['app','dmg'])if(JSON.parse(await readFile(path.join(out,label+'-notary.json'),'utf8')).status!=='Accepted')throw Error('Notarization receipt missing');
for(const a of Object.values(m.downloads)){
 const file=path.join(out,a.name),hash=createHash('sha256');let size=0;for await(const chunk of createReadStream(file)){hash.update(chunk);size+=chunk.length;}
 if(hash.digest('hex')!==a.sha256||size!==a.size)throw Error('Artifact checksum mismatch');
 // Versioned releases are immutable. Never replace an existing object.
 const existing=await fetch(new URL(`/download/${version}/${a.name.includes('-mac-')?'mac':'windows'}`,origin),{method:'HEAD'});if(!process.argv.includes('--promote-only')&&existing.status!==404)throw Error('This version already exists or the service is unavailable. Bump the version instead of replacing it.');
}
const promoteOnly=process.argv.includes('--promote-only');
const gh=(args)=>execFileSync('gh',args,{stdio:'inherit'});
if(!promoteOnly){
gh(['release','create',`v${version}`,'--repo',repo,'--target',provenance.commit,'--draft','--prerelease','--title',`Lemma ${version}`,'--notes-file',path.join(out,'notes.md')]);
for(const a of Object.values(m.downloads))wrangler(['r2','object','put',`lemma-releases/${a.key}`,'--file',path.join(out,a.name),'--remote','--config',config]);
wrangler(['r2','object','put',`lemma-releases/releases/${version}/manifest.json`,'--file',path.join(out,'manifest.json'),'--remote','--content-type','application/json','--config',config]);
}
for(const [platform,a]of Object.entries(m.downloads)){
 const response=await fetch(new URL(`/download/${version}/${platform}`,origin),{headers:process.env.LEMMA_STATS_TOKEN?{Authorization:`Bearer ${process.env.LEMMA_STATS_TOKEN}`}:{}});
 const received=createHash('sha256');if(response.ok)for await(const chunk of response.body)received.update(chunk);
 if(!response.ok||received.digest('hex')!==a.sha256||Number(response.headers.get('Content-Length'))!==a.size||response.headers.get('X-Checksum-SHA256')!==a.sha256)throw Error('Published artifact verification failed; release remains a draft.');
}
if(!promoteOnly)gh(['release','upload',`v${version}`,'--repo',repo,...Object.values(m.downloads).map(a=>path.join(out,a.name)),path.join(out,'SHA256SUMS')]);
if(!process.argv.includes('--publish')&&!promoteOnly){console.log('Verified draft prepared. Re-run promotion with release:promote.');process.exit(0);}
gh(['release','edit',`v${version}`,'--repo',repo,'--draft=false']);
const previous=await fetch(new URL('/api/releases',origin));if(previous.ok)await writeFile(path.join(out,'previous-manifest.json'),JSON.stringify(await previous.json(),null,2));
wrangler(['r2','object','put','lemma-releases/releases/latest.json','--file',path.join(out,'manifest.json'),'--remote','--content-type','application/json','--config',config]);
const current=await fetch(new URL('/api/releases',origin));if(!current.ok||(await current.json()).version!==version)throw Error('Release promotion could not be verified.');
console.log('Release published and website manifest verified.');
