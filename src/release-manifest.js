export const VERSION=/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
export function validateManifest(raw){
 if(!raw||raw.schema!==1||!VERSION.test(raw.version)||!Number.isFinite(Date.parse(raw.publishedAt)))throw Error('Invalid release manifest');
 const notes=new URL(raw.notesUrl);if(notes.protocol!=='https:'||notes.hostname!=='github.com'||notes.username||notes.password||notes.search||notes.hash||!/^\/[-\w.]+\/[-\w.]+\/releases\/tag\/[-\w.]+$/.test(notes.pathname))throw Error('Invalid release notes');
 const downloads={};
 for(const platform of ['mac','windows']){
  const a=raw.downloads?.[platform];if(!a)continue;
  const suffix=platform==='mac'?'mac-arm64.dmg':'windows-x64.zip';
  if(a.name!==`Lemma-${raw.version}-${suffix}`||a.key!==`releases/${raw.version}/${a.name}`||!Number.isSafeInteger(a.size)||a.size<1||!/^[a-f0-9]{64}$/.test(a.sha256)||typeof a.minimumSystem!=='string'||a.minimumSystem.length>80)throw Error('Invalid release artifact');
  if(platform==='mac'&&a.notarized!==true)throw Error('Mac release must be notarized');
  downloads[platform]={name:a.name,key:a.key,size:a.size,sha256:a.sha256,minimumSystem:a.minimumSystem,architecture:platform==='mac'?'Apple Silicon':'64-bit',...(platform==='mac'?{notarized:true}:{preview:true})};
 }
 if(!Object.keys(downloads).length)throw Error('Release has no downloads');
 return {schema:1,version:raw.version,publishedAt:raw.publishedAt,notesUrl:notes.href,downloads};
}
export function publicDownloads(raw){
 const m=validateManifest(raw),downloads={};
 for(const [platform,a]of Object.entries(m.downloads))downloads[platform]={...a,url:`/download/${m.version}/${platform}?source=header`,version:m.version,notesUrl:m.notesUrl};
 return downloads;
}
