// Print and PDF share the same print stylesheet and leave editor state intact.
export function installPrinting({window:host=window,onError=()=>{}}={}){
 let busy=false;
 async function output(pdf=false){
  if(busy)return;
  busy=true;
  try{
   await host.document.fonts.ready;
   if(host.lemma)await (pdf?host.lemma.exportPDF():host.lemma.print());
   else host.print();
  }catch{onError();}
  finally{busy=false;}
 }
 const keydown=event=>{
  if(!(event.metaKey||event.ctrlKey)||event.altKey||event.shiftKey||event.key.toLowerCase()!=='p')return;
  event.preventDefault();event.stopImmediatePropagation();void output();
 };
 host.document.addEventListener('keydown',keydown,true);
 return {print:()=>output(),pdf:()=>output(true),dispose:()=>host.document.removeEventListener('keydown',keydown,true)};
}
