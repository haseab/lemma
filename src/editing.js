// MathLive's first newline converts a plain root into a multiline array.
// Preserve its right-hand content explicitly during that conversion.
export function insertPageBreak(field){
 const wasProse=field.isProseLine?.();
 const perform=()=>{
  const model=field._mathfield.model,cursor=model.at(model.position);
  if(model.root.type!=='root'||cursor.parent!==model.root){field.executeCommand('addRowAfter');return;}
  if(!field.selectionIsCollapsed)field.executeCommand('deleteBackward');
  const position=field.position,tail=field.getValue([position,field.lastOffset],'latex');
  if(tail){field.selection={ranges:[[position,field.lastOffset]]};field.executeCommand('deleteBackward');}
  field.executeCommand('addRowAfter');
  if(tail)field.executeCommand(['insert',tail,{mode:'math',format:'latex',selectionMode:'before'}]);
 };
 if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
 field.resumeAutomaticLine?.(wasProse);
}
