export const FONTS={system:'sans-serif',serif:'roman',mono:'monospace'};
export const FONT_SIZES=[{value:1,label:'10'},{value:2,label:'14'},{value:3,label:'16'},{value:4,label:'18'},{value:5,label:'20'},{value:6,label:'24'},{value:7,label:'29'},{value:8,label:'35'},{value:9,label:'42'},{value:10,label:'50'}];
export function withEquationTypography(field,action,range){
 const offsets=range||field.selection.ranges.flat(),start=Math.min(...offsets),end=Math.max(...offsets),last=field.lastOffset;
 const previous=new Set(Array.from({length:end-start+1},(_,index)=>field._mathfield.model.at(start+index)));
 // Custom prose families cannot be rendered as native mathematical variants.
 // Clear the insertion override before conversion, rather than rendering an
 // invalid math family once and only cleaning up its atoms afterward.
 const editor=field._mathfield,family=editor.defaultStyle?.fontFamily,bias=editor.styleBias;
 const customFamily=family&&!['none','roman','sans-serif','monospace'].includes(family);
 if(customFamily){editor.defaultStyle={...editor.defaultStyle};delete editor.defaultStyle.fontFamily;editor.styleBias='none';}
 let result;
 try{result=action();}finally{if(customFamily&&field.mode==='text'){editor.defaultStyle.fontFamily=family;editor.styleBias=bias;}}

 // Conversion creates math atoms. They use the math font even if the source
 // or insertion point uses a prose font. Keep text labels and existing atoms,
 // along with color, size, weight, and explicit mathematical variants.
 const finish=Math.min(field.lastOffset,end+field.lastOffset-last);
 for(let offset=start+1;offset<=finish;offset++){
  const atom=field._mathfield.model.at(offset);
  if(previous.has(atom)||atom?.mode!=='math'||atom.hasChildren||atom.type==='first')continue;
  if(atom.style?.fontFamily&&atom.style.fontFamily!=='none'||atom.style?.fontShape&&atom.style.fontShape!=='auto'){
   field.applyStyle({fontFamily:'none',fontShape:'auto'},{range:[offset-1,offset],operation:'set',silenceNotifications:true});
  }
 }
 return result;
}
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
