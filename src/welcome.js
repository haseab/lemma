const SEEN='lemma.welcome.v1';
export function installWelcome({window:host=window,onDone=()=>{},force=false,creator={name:import.meta.env?.VITE_CREATOR_NAME,url:import.meta.env?.VITE_CREATOR_URL,avatar:import.meta.env?.VITE_CREATOR_AVATAR}}={}){
 const existing=host.document.querySelector('#welcome-dialog');if(existing)return existing;
 try{if(!force&&host.localStorage.getItem(SEEN))return null;}catch{/* Storage must not block writing. */}
 const doc=host.document,dialog=doc.createElement('dialog');dialog.id='welcome-dialog';
 dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-story');
 dialog.innerHTML='<button class="welcome-close" aria-label="Close welcome">×</button><h2 id="welcome-title">Welcome to Lemma.</h2><p id="welcome-story">I couldn’t find the math editor I wanted, so I made one. It’s free, open source, and entirely local, with no telemetry whatsoever. I hope it’s useful to you, too.</p><div class="welcome-creator"></div><button class="welcome-start" autofocus>Start writing</button>';
 const credit=dialog.querySelector('.welcome-creator');
 if(creator?.name&&/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(creator.url||'')){
  const link=doc.createElement('a');link.href=creator.url;link.target='_blank';link.rel='noopener noreferrer';
  if(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(creator.avatar||'')){
   const avatar=doc.createElement('img');avatar.src=creator.avatar;avatar.alt='';avatar.width=28;avatar.height=28;link.append(avatar);
  }
  const label=doc.createElement('span');label.textContent='@'+creator.name.replace(/^@/,'');link.append(label);credit.append(link);
  if(host.lemma)link.addEventListener('click',event=>{event.preventDefault();host.lemma.openCreator(creator.url).catch(()=>{label.textContent=creator.url;});});
 }else credit.remove();
 dialog.addEventListener('close',()=>{try{host.localStorage.setItem(SEEN,'1');}catch{}dialog.remove();onDone();},{once:true});
 for(const button of dialog.querySelectorAll('button'))button.onclick=()=>dialog.close();
 doc.body.append(dialog);dialog.showModal();return dialog;
}
