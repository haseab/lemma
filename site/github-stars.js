export async function loadGitHubStars(link,repository,fetcher=globalThis.fetch){
 if(!link||!repository)return;
 const badge=link.querySelector('.github-stars');if(badge)badge.hidden=false;
 const key='lemma.github-stars.v1';
 const display=count=>{link.querySelector('[data-star-count]').textContent=count.toLocaleString('en-US');link.setAttribute('aria-label',`Lemma on GitHub, ${count.toLocaleString('en-US')} ${count===1?'star':'stars'}`);};
 try{const cached=JSON.parse(link.ownerDocument.defaultView.localStorage.getItem(key));if(cached?.repository===repository.url&&Number.isSafeInteger(cached.count)&&cached.count>=0)display(cached.count);}catch{/* Storage is optional. */}
 try{
  const response=await fetcher(repository.url.replace('https://github.com/','https://api.github.com/repos/'),{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(6000)});
  if(!response.ok)return;
  const {stargazers_count:count}=await response.json();
  if(!Number.isSafeInteger(count)||count<0)return;
  display(count);
  try{link.ownerDocument.defaultView.localStorage.setItem(key,JSON.stringify({repository:repository.url,count}));}catch{/* Keep the live count when storage is unavailable. */}
 }catch{/* Keep the repository link usable when GitHub is unavailable. */}
}
