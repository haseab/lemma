// An interactive hover action uses a real button, rather than a tooltip role
// containing controls. It shares the selection-replacement editor with Cmd+K.
export function hoverEditRange(field,element){
 const model=field._mathfield?.model,id=element?.dataset?.atomId;
 if(!model||!id)return null;
 let atom=model.findAtom(candidate=>candidate.id===id);
 if(!atom||atom.type==='first'||atom.type==='space')return null;
 const offset=model.offsetOf(atom);
 if(!field.selectionIsCollapsed&&field.selection.ranges.some(range=>offset>Math.min(...range)&&offset<=Math.max(...range)))return structuredClone(field.selection);
 // A vector accent is one target; a subscript belongs with its base. Keep
 // these local, so hovering the numerator never selects its whole fraction.
 for(let parent=atom.parent;parent&&parent!==model.root;parent=parent.parent){
  if(['genfrac','surd','leftright','array'].includes(parent.type))break;
  if(['accent','overunder'].includes(parent.type))atom=parent;
 }
 let first=atom,last=atom;
 if(atom.parent?.type==='subsup'){last=atom.parent;first=last.leftSibling||last;}
 else if(atom.type==='subsup')first=atom.leftSibling||atom;
 else if(atom.rightSibling?.type==='subsup')last=atom.rightSibling;
 if(atom.mode==='text'&&!atom.hasChildren&&/^[\p{L}\p{N}]$/u.test(atom.value||'')){
  const letter=node=>node?.mode==='text'&&!node.hasChildren&&/^[\p{L}\p{N}]$/u.test(node.value||'');
  while(letter(first.leftSibling))first=first.leftSibling;
  while(letter(last.rightSibling))last=last.rightSibling;
 }
 const start=first.hasChildren?model.offsetOf(first.firstChild)-1:model.offsetOf(first)-1,end=model.offsetOf(last);
 return start>=0&&end>start?{ranges:[[start,end]],direction:'forward'}:null;
}
// Selection overlays and layout spans can receive the pointer instead of an
// atom. Resolve those hits geometrically without moving the editor's caret.
export function editRangeAtPoint(field,event){
 const point={x:event.clientX,y:event.clientY};
 const contains=node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&point.x>=r.left&&point.x<=r.right&&point.y>=r.top&&point.y<=r.bottom;};
 if(!field.selectionIsCollapsed&&[...field.shadowRoot.querySelectorAll('.ML__selection')].some(contains))return structuredClone(field.selection);
 let element=event.composedPath?.().find(node=>node?.dataset?.atomId);
 if(!element){
  const hits=[...field.shadowRoot.querySelectorAll('[data-atom-id]')].filter(contains);
  hits.sort((a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.width*x.height-y.width*y.height;});
  element=hits[0];
 }
 return hoverEditRange(field,element);
}
export function installSelectionEditTip(field,{open,anchorFor}){
 const doc=field.ownerDocument,view=doc.defaultView;
 let tip,range,original,showTimer,hideTimer,observer,lastPoint;
 const canShow=()=>field.isConnected&&!field.readOnly&&!field.disabled&&field.mode!=='latex'&&!field.hasAttribute('data-replacement-open');
 function hide(){
  clearTimeout(showTimer);clearTimeout(hideTimer);lastPoint=null;
  observer?.disconnect();observer=null;
  doc.removeEventListener('pointerdown',outside,true);view.removeEventListener('scroll',hide,true);view.removeEventListener('resize',hide);
  const old=tip;tip=null;range=null;old?.remove();
 }
 function outside(event){if(tip&&!event.composedPath().includes(tip))hide();}
 function leave(){clearTimeout(showTimer);clearTimeout(hideTimer);hideTimer=setTimeout(hide,200);}
 function show(event){
  if(!canShow())return;
  const next=editRangeAtPoint(field,event);if(!next){hide();return;}
  if(tip&&original===field.value&&JSON.stringify(range)===JSON.stringify(next))return;
  hide();range=next;original=field.value;lastPoint={x:event.clientX,y:event.clientY};
  tip=doc.createElement('button');tip.type='button';tip.className='selection-edit-tip';tip.textContent='Edit';tip.setAttribute('aria-label','Edit expression');tip.setAttribute('aria-haspopup','dialog');
  tip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));tip.addEventListener('pointerleave',leave);
  tip.addEventListener('pointerdown',event=>event.preventDefault());
  tip.addEventListener('click',()=>{
   if(!canShow()||field.value!==original){hide();return;}
   const selected=range;hide();field.focus({preventScroll:true});field.selection=selected;open();
  });
  tip.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hide();field.focus();}});
  doc.body.append(tip);
  const anchor=anchorFor(range),bounds=tip.getBoundingClientRect(),width=bounds.width||48,height=bounds.height||29;
  tip.style.left=Math.max(8,Math.min(anchor.left+(anchor.width-width)/2,view.innerWidth-width-8))+'px';
  tip.style.top=(anchor.top-height-7>=8?anchor.top-height-7:Math.min(anchor.bottom+7,view.innerHeight-height-8))+'px';
  doc.addEventListener('pointerdown',outside,true);view.addEventListener('scroll',hide,true);view.addEventListener('resize',hide);
  observer=new view.MutationObserver(()=>{if(!canShow()||field.value!==original)hide();});observer.observe(doc.body,{childList:true,subtree:true});
 }
 function schedule(event){
  if(event.pointerType==='touch'||event.buttons||!canShow()){hide();return;}
  clearTimeout(hideTimer);
  if(tip&&lastPoint&&Math.abs(event.clientX-lastPoint.x)<2&&Math.abs(event.clientY-lastPoint.y)<2)return;
  const path=event.composedPath(),point={clientX:event.clientX,clientY:event.clientY,composedPath:()=>path};
  clearTimeout(showTimer);showTimer=setTimeout(()=>show(point),180);
 }
 field.addEventListener('pointermove',schedule);
 // A drag selection should expose the action even if the pointer stops on
 // release, without requiring an extra mouse movement.
 field.addEventListener('pointerup',schedule);
 field.addEventListener('pointerleave',leave);
 for(const type of ['pointerdown','keydown','input','selection-change'])field.addEventListener(type,hide,true);
 return {hide};
}
