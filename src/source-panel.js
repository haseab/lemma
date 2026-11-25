import {validateLatex} from 'mathlive';
import {importLatex} from './formats.js';

export function installSourcePanel({anchor,button,getPageId,getField,onChange,onMessage}){
 const doc=anchor.ownerDocument,panel=doc.createElement('section');panel.id='source-panel';panel.className='source-panel';panel.hidden=true;panel.setAttribute('aria-label','LaTeX source');
 panel.innerHTML='<div class="source-panel-heading"><label for="source-value">LaTeX</label><div><button id="copy-latex" type="button" aria-label="Copy LaTeX">Copy</button><button id="source-close" type="button" aria-label="Close LaTeX panel">×</button></div></div><textarea id="source-value" aria-label="LaTeX source" aria-describedby="source-error" spellcheck="false" placeholder="Type or paste LaTeX…"></textarea><p id="source-error" role="status" aria-live="polite"></p>';
 anchor.after(panel);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
 const input=panel.querySelector('textarea'),error=panel.querySelector('#source-error'),drafts=new Map();let pageId,lastValue,applying=false;
 function sync(){
  if(applying||panel.hidden)return;
  const id=getPageId(),value=getField().value;
  if(id!==pageId){pageId=id;lastValue=value;const draft=drafts.get(id);input.value=draft?.error?draft.text:value;error.textContent=draft?.error||'';input.setAttribute('aria-invalid',String(!!draft?.error));}
  else if(value!==lastValue){lastValue=value;if(!drafts.get(id)?.error){input.value=value;error.textContent='';input.setAttribute('aria-invalid','false');}}
 }
 function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
 function open(){panel.hidden=false;pageId=undefined;sync();button.setAttribute('aria-expanded','true');input.focus();}
 button.onclick=()=>{if(!panel.hidden)close();else open();};
 panel.querySelector('#source-close').onclick=close;
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 input.addEventListener('input',()=>{
  try{
   if(input.value.length>2_000_000)throw Error('LaTeX exceeds the page limit.');
   const latex=importLatex(input.value);if(validateLatex(latex).length)throw Error('Incomplete or unsupported LaTeX. Preview keeps the last valid version.');
   const field=getField();applying=true;
   try{if(latex!==field.value){field.pageHistory.transaction(()=>{field._mathfield.model.mode='math';field.setValue(latex,{mode:'math',format:'latex',insertionMode:'replaceAll',silenceNotifications:true});field.mode=field.pageInputMode==='text'?'text':'math';field.position=-1;});field.resetProseInput();onChange();}lastValue=field.value;}
   finally{applying=false;}
   error.textContent='';input.setAttribute('aria-invalid','false');drafts.delete(pageId);
  }catch(e){error.textContent=e.message;input.setAttribute('aria-invalid','true');drafts.set(pageId,{text:input.value,error:e.message});}
 });
 panel.querySelector('#copy-latex').onclick=async()=>{try{await doc.defaultView.navigator.clipboard.writeText(input.value);onMessage('LaTeX copied.');}catch{input.focus();input.select();onMessage('Source selected. Copy with your keyboard.');}};
 return {sync,open};
}
