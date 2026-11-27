// Page-level line operations must climb out of fractions, scripts and matrices.
// MathLive's native group boundaries describe those inner structures instead.
export function pageLineRange(field,position=field.position){
 const model=field._mathfield?.model;let atom=model?.at(position);
 if(!atom)return null;
 while(atom.parent&&atom.parent!==model.root)atom=atom.parent;
 const siblings=atom.siblings;
 if(!siblings?.length)return null;
 const start=model.offsetOf(siblings[0]),end=model.offsetOf(siblings.at(-1));
 return start>=0&&end>=start?{start,end}:null;
}
// Math mode stores ordinary words as individual letter atoms. Select a run in
// the same branch, without crossing spaces, operators or fraction/script edges.
export function pageWordRange(field,position=field.position){
 const model=field._mathfield?.model;
 const word=atom=>atom&&!atom.hasChildren&&/^[\p{L}\p{M}\p{N}]+$/u.test(atom.value||'');
 let atom=model?.at(position);
 if(!word(atom)&&word(atom?.rightSibling))atom=atom.rightSibling;
 if(!word(atom))return null;
 let first=atom,last=atom;
 while(word(first.leftSibling))first=first.leftSibling;
 while(word(last.rightSibling))last=last.rightSibling;
 return {start:model.offsetOf(first)-1,end:model.offsetOf(last)};
}
export function installPageLines(field){
 // PointerEvent.detail is commonly zero. Mouse down/click carry the native
 // multi-click count, after MathLive's pointer handler has made its selection.
 let lastPointer=null,pointerCount=0;
 const selectClickedRange=event=>{
  let count=event.detail;
  if(event.type==='pointerdown'){
   const now=Date.now();
   pointerCount=lastPointer&&now-lastPointer.time<500&&Math.abs(event.clientX-lastPointer.x)<5&&Math.abs(event.clientY-lastPointer.y)<5?pointerCount+1:1;
   lastPointer={time:now,x:event.clientX,y:event.clientY};
   count=Math.max(count,pointerCount);
  }
  if(count<2||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||field.mode==='latex')return;
  // Prefer the actual glyph over the nearest caret boundary at word edges.
  const id=event.composedPath().find(node=>node?.dataset?.atomId)?.dataset.atomId;
  const model=field._mathfield?.model,atom=id&&model?.findAtom(candidate=>candidate.id===id);
  const position=atom?model.offsetOf(atom):field.getOffsetFromPoint(event.clientX,event.clientY);
  if(!Number.isInteger(position)||position<0)return;
  const range=count>=3?pageLineRange(field,position):pageWordRange(field,position);if(!range)return;
  event.preventDefault();event.stopImmediatePropagation();
  field.dismissAutomaticConversion?.();field.focus();
  field.selection={ranges:[[range.start,range.end]],direction:'forward'};
 };
 for(const type of ['pointerdown','mousedown','click','dblclick'])field.addEventListener(type,selectClickedRange,true);
 field.addEventListener('keydown',event=>{
  if(!event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing||!['Backspace','Delete'].includes(event.key)||field.mode==='latex'||field.readOnly||field.disabled)return;
  const range=pageLineRange(field);if(!range)return;
  event.preventDefault();event.stopImmediatePropagation();
  field.dismissAutomaticConversion?.();
  const perform=()=>{
   const suspended=field.proseSuspended;field.proseSuspended=true;
   try{
    if(field.selectionIsCollapsed){
     const caret=field.position,start=event.key==='Backspace'?range.start:caret,end=event.key==='Backspace'?caret:range.end;
     // At the edge, keep the current row instead of joining its neighbour.
     if(start===end)return;
     field.selection={ranges:[[start,end]]};
    }
    field.executeCommand('deleteBackward');
   }finally{field.proseSuspended=suspended;}
  };
  if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
 },true);
}
