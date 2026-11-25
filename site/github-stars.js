export async function loadGitHubStars(link,repository,fetcher=globalThis.fetch){
 if(!link||!repository)return;
 try{
  const response=await fetcher(repository.url.replace('https://github.com/','https://api.github.com/repos/'),{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(6000)});
  if(!response.ok)return;
  const {stargazers_count:count}=await response.json();
  if(!Number.isSafeInteger(count)||count<0)return;
  link.querySelector('[data-star-count]').textContent=count.toLocaleString('en-US');
  link.querySelector('.github-stars').hidden=false;
  link.setAttribute('aria-label',`Lemma on GitHub, ${count.toLocaleString('en-US')} ${count===1?'star':'stars'}`);
 }catch{/* Keep the repository link usable when GitHub is unavailable. */}
}
