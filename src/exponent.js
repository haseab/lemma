// MathLive 0.111.4 has no public operation for moving sibling atoms into a
// script. Keep this version-specific structural adapter isolated and tested:
// moving the atoms preserves nested scripts, fractions, styles and undo.
export function pullTermIntoExponent(field){
 if(!field.selectionIsCollapsed||field.mode!=='math'||field.readOnly||field.disabled)return false;
 const editor=field._mathfield,model=editor?.model;
 if(!model?.at||!model.deferNotifications||!editor.snapshot)return false;
 const script=model.at(model.position);
 if(!script?.superscript?.length||!script.parent)return false;
 const siblings=script.siblings;
 const term=[];
 for(const atom of siblings.slice(siblings.indexOf(script)+1)){
  // Stay in the current row/group and stop before prose or a relation. A
  // sum such as pi^2 + 1 is one connected expression for this operation.
  if(atom.mode!=='math'||atom.type==='mrel'||atom.type==='mpunct')break;
  term.push(atom);
 }
 if(!term.length)return false;
 if(!model.contentWillChange({inputType:'deleteContentBackward'}))return true;
 editor.flushInlineShortcutBuffer();
 editor.stopCoalescingUndo();
 model.deferNotifications({content:true,selection:true,type:'deleteContentBackward'},()=>{
  let destination=script,branch='superscript';
  const last=script.superscript.at(-1);
  if(last?.type==='leftright'&&['.','?'].includes(last.rightDelim)){
   destination=last;branch='body';
  }
  const children=destination.createBranch(branch);
  if(children.length===2&&children[1].type==='placeholder')destination.removeChild(children[1]);
  const join=destination.branch(branch).at(-1);
  for(const atom of term){atom.parent.removeChild(atom);destination.addChild(atom,branch);}
  model.position=model.offsetOf(join);
 });
 editor.snapshot('pull-term-into-exponent');
 // Public setter schedules MathLive's renderer after the structural move.
 field.position=model.position;
 return true;
}

export function installExponentBackspace(field){
 field.addEventListener('keydown',event=>{
  if(event.key!=='Backspace'||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
  if(!pullTermIntoExponent(field))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
}
