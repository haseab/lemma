export function repositorySettings(value){
 if(!value)return null;
 try{const url=new URL(value);if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash)return null;const parts=url.pathname.replace(/\/$/,'').split('/').filter(Boolean);if(parts.length!==2||parts.some(p=>!/^[-\w.]+$/.test(p)))return null;return {url:`https://github.com/${parts.join('/')}`,api:`https://api.github.com/repos/${parts.join('/')}/releases?per_page=10`};}catch{return null;}
}
export function releaseDownloads(releases,repository){
 const matches={mac:null,windows:null};if(!Array.isArray(releases)||!repository)return matches;
 for(const release of releases){
  if(release.draft||!Array.isArray(release.assets))continue;
  for(const asset of release.assets){
   if(typeof asset.name!=='string'||typeof asset.browser_download_url!=='string')continue;
   const platform=/^Lemma-[\d.]+(?:-[\w.]+)?-mac-arm64\.(zip|dmg)$/i.test(asset.name)?'mac':/^Lemma-[\d.]+(?:-[\w.]+)?-windows-x64\.(zip|exe)$/i.test(asset.name)?'windows':null;
   if(!platform||matches[platform])continue;
   const url=new URL(asset.browser_download_url,repository.url);
   if(!url.href.startsWith(repository.url+'/releases/download/')||url.protocol!=='https:'||url.username||url.password)continue;
   matches[platform]={url:url.href,name:asset.name,version:String(release.tag_name||''),preview:!!release.prerelease};
  }
 }
 return matches;
}
