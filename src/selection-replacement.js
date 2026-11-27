import {mathInputOptions} from './math-input-options.js';
import {installSelectionEditTip,editRangeAtPoint} from './selection-edit-tip.js';
import {MathfieldElement,validateLatex} from 'mathlive';
import {plainInputToLatex,lowercasePastedVariables} from './plain-input.js';
import {insertLatexContent} from './clipboard.js';
import {withEquationTypography} from './formatting.js';

export function replacementPosition(anchor,size,viewport){
 const margin=12,gap=10,width=Math.min(size.width||380,Math.max(0,viewport.width-margin*2));
 const left=Math.max(margin,Math.min(anchor.left,viewport.width-width-margin));
 const above=anchor.top-size.height-gap,below=anchor.bottom+gap;
 const placement=above>=margin||below+size.height>viewport.height-margin?'above':'below';
 return {left,top:Math.max(margin,Math.min(placement==='above'?above:below,Math.max(margin,viewport.height-size.height-margin))),placement,width,arrow:Math.max(18,Math.min(anchor.left+anchor.width/2-left,width-18))};
}
function selectionAnchor(field,selection){
 let rects=(JSON.stringify(selection.ranges)===JSON.stringify(field.selection.ranges)?[...field.shadowRoot.querySelectorAll('.ML__selection')]:[]).map(element=>element.getBoundingClientRect()).filter(rect=>rect.width&&rect.height);
 if(!rects.length){
  const editor=field._mathfield;
  for(const range of selection.ranges){
   const start=Math.min(...range),end=Math.max(...range);
   for(let offset=start+1;offset<=Math.min(end,start+4096);offset++){
    const rect=editor.getHTMLElement(editor.model.at(offset))?.getBoundingClientRect();
    if(rect?.width&&rect.height)rects.push(rect);
   }
  }
 }
 if(!rects.length)return field.getBoundingClientRect();
 // Anchor to the first visual row when the selection spans several rows.
 const top=Math.min(...rects.map(rect=>rect.top));rects=rects.filter(rect=>rect.top<top+Math.max(4,rect.height/2));
 const left=Math.min(...rects.map(rect=>rect.left)),right=Math.max(...rects.map(rect=>rect.right));
 return {left,right,top,bottom:Math.max(...rects.map(rect=>rect.bottom)),width:right-left};
}
export function installSelectionReplacement(field){
 const doc=field.ownerDocument,view=doc.defaultView;
 const style=doc.createElement('style');style.textContent=':host([data-replacement-open]) .ML__selection{background:var(--selection-background-color,#cfe0ca)!important}';field.shadowRoot.append(style);
 field.setAttribute('aria-keyshortcuts','Meta+K Control+K');
 let panel,input,preview,error,submit,selection,original,latex='',applying=false,composing=false,observer,hoverEdit;
 function position(){
  if(!panel)return;
  if(!field.isConnected){close(false);return;}
  const anchor=selectionAnchor(field,selection),bounds=panel.getBoundingClientRect();
  const next=replacementPosition(anchor,{width:bounds.width||380,height:bounds.height||150},{width:view.innerWidth,height:view.innerHeight});
  panel.style.left=next.left+'px';panel.style.top=next.top+'px';panel.style.width=next.width+'px';panel.style.setProperty('--replacement-arrow',next.arrow+'px');panel.dataset.placement=next.placement;
 }
 function close(restoreFocus=true){
  if(!panel)return;
  const saved=selection;
  observer?.disconnect();observer=null;
  doc.removeEventListener('pointerdown',outside,true);view.removeEventListener('scroll',position,true);view.removeEventListener('resize',position);
  const oldPanel=panel;panel=input=preview=error=submit=null;latex='';composing=false;oldPanel.remove();field.removeAttribute('data-replacement-open');
  field.removeAttribute('aria-controls');field.removeAttribute('aria-expanded');
  if(restoreFocus&&field.isConnected){field.focus({preventScroll:true});if(field.value===original)field.selection=saved;}
 }
 function outside(event){if(panel&&!event.composedPath().includes(panel))close(false);}
 function update(event){
  if(!panel)return;
  const options=mathInputOptions(field);
  let source=input.value;
  if(['insertFromPaste','insertReplacementText'].includes(event?.inputType)){source=lowercasePastedVariables(source,options);input.value=source;}
  try{
   if(source.length>16000)throw Error('Keep the replacement under 16,000 characters.');
   latex=source.trim()?plainInputToLatex(source,options):'';
   if(latex&&validateLatex(latex).length)throw Error('This expression is incomplete or unsupported.');
   preview.value=latex;preview.hidden=!latex;submit.disabled=!latex;error.textContent='';input.removeAttribute('aria-invalid');
  }catch(problem){latex='';preview.hidden=true;submit.disabled=true;error.textContent=problem.message;input.setAttribute('aria-invalid','true');}
  position();
 }
 function replace(){
  if(!panel||composing)return;
  if(field.value!==original||field.readOnly||field.disabled||!field._mathfield?.isSelectionEditable){close(false);return;}
  update();if(!latex)return;
  const value=latex,saved=selection;
  applying=true;field.dismissAutomaticConversion?.();
  const previousSuspended=field.proseSuspended;field.proseSuspended=true;
  try{
   const perform=()=>{field.selection=saved;withEquationTypography(field,()=>insertLatexContent(field,value));};
   if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
   close(false);field.focus({preventScroll:true});
  }finally{field.proseSuspended=previousSuspended;applying=false;}
 }
 function open(){
  hoverEdit?.hide();
  if(panel){input.focus();return true;}
  if(field.selectionIsCollapsed||field.readOnly||field.disabled||!field._mathfield?.isSelectionEditable||field.mode==='latex')return false;
  original=field.value;selection=structuredClone(field.selection);
  panel=doc.createElement('section');panel.className='selection-replacement';panel.id='selection-replacement';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Replace selection');panel.setAttribute('aria-modal','false');
  panel.innerHTML='<div class="replacement-heading"><span>Replace selection</span><button type="button" data-cancel aria-label="Cancel replacement">×</button></div><textarea rows="1" aria-label="Replacement in words" placeholder="Type the replacement in words…" spellcheck="false" maxlength="16000"></textarea><p class="replacement-error" role="status"></p><div class="replacement-footer"><span>Esc to cancel</span><button type="button" data-submit disabled>Replace <span aria-hidden="true">↵</span></button></div>';
  input=panel.querySelector('textarea');error=panel.querySelector('.replacement-error');submit=panel.querySelector('[data-submit]');
  preview=new MathfieldElement();preview.className='replacement-preview';preview.readOnly=true;preview.mathVirtualKeyboardPolicy='manual';preview.tabIndex=-1;preview.setAttribute('aria-label','Replacement preview');preview.hidden=true;error.before(preview);
  panel.querySelector('[data-cancel]').onclick=()=>close();submit.onclick=replace;
  input.addEventListener('input',event=>{input.style.height='auto';input.style.height=Math.min(96,Math.max(32,input.scrollHeight))+'px';update(event);});
  panel.addEventListener('focusout',event=>{if(event.relatedTarget&&!panel?.contains(event.relatedTarget))close(false);});
  input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;update();});
  panel.addEventListener('keydown',event=>{
   if(event.isComposing||composing)return;
   if(event.key==='Escape'||(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();event.stopPropagation();close();}
   else if(event.key==='Enter'&&!event.shiftKey&&!event.altKey&&!event.metaKey&&!event.ctrlKey){event.preventDefault();event.stopPropagation();replace();}
  });
  field.setAttribute('data-replacement-open','');doc.body.append(panel);field.setAttribute('aria-controls',panel.id);field.setAttribute('aria-expanded','true');
  position();input.focus({preventScroll:true});
  doc.addEventListener('pointerdown',outside,true);view.addEventListener('scroll',position,true);view.addEventListener('resize',position);
  observer=new view.MutationObserver(()=>{if(!field.isConnected)close(false);});observer.observe(doc.body,{childList:true,subtree:true});
  return true;
 }
 field.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&!event.isComposing&&event.key.toLowerCase()==='k'&&open()){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 field.addEventListener('input',()=>{if(panel&&!applying&&field.value!==original)close(false);});
 // Extend MathLive's menu so copy/paste and its other commands remain intact.
 field.menuItems=[{id:'edit-expression',label:'Edit',keyboardShortcut:/Mac|iPhone|iPad/.test(view.navigator.platform)?'meta+K':'ctrl+K',enabled:()=>!field.selectionIsCollapsed&&!field.readOnly&&!field.disabled&&field.mode!=='latex',onMenuSelect:()=>open()},{type:'divider'},...field.menuItems];
 field.addEventListener('contextmenu',event=>{
  hoverEdit?.hide();
  if(field.selectionIsCollapsed&&!field.readOnly&&!field.disabled){
   const target=editRangeAtPoint(field,event);
   if(target)field.selection=target;
  }
 },true);
 hoverEdit=installSelectionEditTip(field,{open,anchorFor:selection=>selectionAnchor(field,selection)});
 return {open,close};
}
