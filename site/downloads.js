import {publicDownloads} from '../src/release-manifest.js';
export async function loadReleaseManifest(fetcher=fetch){
 const response=await fetcher('/api/releases',{signal:AbortSignal.timeout(6000)});if(!response.ok)return null;return publicDownloads(await response.json());
}
export function installDownloadTracking(link,getDownload,fetcher=fetch){
 link.addEventListener('click',()=>{const a=getDownload();if(!a||!/^\/download\//.test(a.url))return;
  // Only these three enum/version fields leave the browser; never editor state.
  void fetcher('/api/download-click',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({version:a.version,platform:a.platform,source:'header'})}).catch(()=>{});
 });
}
export function showDownloadDetails(root,download){
 const detail=root.querySelector('[data-release-notes]');if(!detail)return;
 detail.hidden=!download?.notesUrl;if(!download?.notesUrl)return;
 detail.href=download.notesUrl;detail.textContent=`v${download.version.replace(/^v/,'')} · ${download.architecture} · ${Math.ceil(download.size/1048576)} MB`;
 detail.setAttribute('aria-label',`Release notes: ${download.minimumSystem}, ${download.architecture}, ${Math.ceil(download.size/1048576)} MB`);
 detail.title=`${download.minimumSystem} · Release notes`;
}
