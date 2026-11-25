// Native fullscreen where available; a focused viewport layout elsewhere.
export function installFullscreen(root,button){
 const doc=root.ownerDocument;
 let expanded=false,native=false;
 function show(value){expanded=value;doc.body.classList.toggle('scratchpad-fullscreen',value);button.setAttribute('aria-pressed',String(value));button.setAttribute('aria-label',value?'Exit fullscreen':'Enter fullscreen');button.title=value?'Exit fullscreen (Esc)':'Enter fullscreen';}
 async function exit(){
  if(doc.fullscreenElement===root){try{await doc.exitFullscreen();}catch{return;}}
  show(false);button.focus();
 }
 button.addEventListener('click',async()=>{
  if(expanded){await exit();return;}
  show(true);
  try{await root.requestFullscreen?.();}catch{/* Keep the viewport layout if native fullscreen is unavailable. */}
 });
 doc.addEventListener('fullscreenchange',()=>{
  if(doc.fullscreenElement===root){native=true;show(true);}
  else if(native){native=false;show(false);button.focus();}
 });
 doc.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&expanded&&!doc.fullscreenElement&&!doc.querySelector('dialog[open]')){event.preventDefault();show(false);button.focus();}
 });
 show(false);
}
