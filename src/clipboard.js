import {insertPageBreak} from './editing.js';
import {convertLatexToMathMl,validateLatex} from 'mathlive';
import {importLatex,looksLikeLatex,mixedTextToLatex,readableSelection,splitDisplayRows} from './formats.js';
import {looksLikeProse} from './prose.js';
export function clipboardPayload(field){
 const latex=field.getValue(field.selection,'latex');
 const mathml=convertLatexToMathMl(latex);
 return {'text/plain':readableSelection(field),'application/x-latex':latex,'text/html':mathml.startsWith('<math')?mathml:`<math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math>`};
}
export function insertClipboard(field,types,{onError=()=>{}}={}){
 const latex=types['application/x-latex'];let source=latex||types['text/plain'];
 if(!source)return false;
 if(source.length>2_000_000){onError('Pasted content exceeds the page limit.');return true;}
 try{
  let value;
  if(latex||field.pageInputMode!=='text'&&looksLikeLatex(source))value=importLatex(source);
  else if(field.pageInputMode==='text'||looksLikeProse(source))value=mixedTextToLatex(source);
  else value=source;
  if(validateLatex(value).length)throw Error('Pasted content contains unsupported or incomplete LaTeX. The current selection was preserved.');
  field.proseSuspended=true;
  const insert=()=>insertLatexContent(field,value);
  if(field.pageHistory)field.pageHistory.transaction(insert);else insert();
  setTimeout(()=>{field.proseSuspended=false;},0);
  return true;
 }catch(error){onError(error.message);return true;}
}
export function installClipboard(field,onError){
 field.addEventListener('copy',event=>{
  if(field.selectionIsCollapsed||!event.clipboardData)return;
  const payload=clipboardPayload(field);for(const [type,value]of Object.entries(payload))event.clipboardData.setData(type,value);
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 field.addEventListener('cut',event=>{
  if(field.selectionIsCollapsed||!event.clipboardData)return;
  const payload=clipboardPayload(field);for(const [type,value]of Object.entries(payload))event.clipboardData.setData(type,value);
  event.preventDefault();event.stopImmediatePropagation();field.executeCommand('deleteBackward');
 },true);
 field.addEventListener('paste',event=>{
  if(!event.clipboardData)return;
  const types={};for(const type of ['application/x-latex','text/plain'])types[type]=event.clipboardData.getData(type);
  if(insertClipboard(field,types,{onError})){event.preventDefault();event.stopImmediatePropagation();}
 },true);
}

export function insertLatexContent(field,latex){
 if(!field.value||field.selection.ranges.length===1&&field.selection.ranges[0][0]===0&&field.selection.ranges[0][1]===field.lastOffset){
  field._mathfield.model.mode='math';field.setValue(latex,{mode:'math',format:'latex',insertionMode:'replaceAll'});field.position=-1;return;
 }
 const cursor=field._mathfield.model.at(field.position);
 const canSplit=cursor.parent===field._mathfield.model.root||Array.isArray(cursor.parentBranch)&&cursor.parent?.isMultiline;
 const rows=canSplit?splitDisplayRows(latex):[latex];
 for(let i=0;i<rows.length;i++){
  if(i)insertPageBreak(field);
  if(rows[i])field.executeCommand(['insert',rows[i],{format:'latex',mode:'math',selectionMode:'after'}]);
 }
}
