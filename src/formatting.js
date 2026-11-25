export const FONTS={system:'sans-serif',serif:'roman',mono:'monospace'};
export const FONT_SIZES=[{value:1,label:'10'},{value:2,label:'14'},{value:3,label:'16'},{value:4,label:'18'},{value:5,label:'20'},{value:6,label:'24'},{value:7,label:'29'},{value:8,label:'35'},{value:9,label:'42'},{value:10,label:'50'}];
export function applyFormatting(field,style,{toggle=false}={}){
 // Formatting intentionally preserves the user's selection and never changes
 // the text/math mode, so the same selection can be styled repeatedly.
 field.applyStyle(style,{operation:toggle?'toggle':'set'});
}
export function indent(field,backward=false){
 if(backward){
  const pos=field.position;
  if(pos>=4&&field.getValue([pos-4,pos],'plain-text')==='    '){field.selection={ranges:[[pos-4,pos]]};field.executeCommand('deleteBackward');}
  else if(pos>0&&/\\(?:quad|qquad)\s*$/.test(field.getValue([pos-1,pos],'latex')))field.executeCommand('deleteBackward');
  return;
 }
 const previousMode=field.mode;
 field.executeCommand(['insert','\\quad',{mode:'math',format:'latex',insertionMode:field.selectionIsCollapsed?'replaceSelection':'insertBefore',selectionMode:'after'}]);
 field.mode=previousMode;
}
