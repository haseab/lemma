import {phraseAtEnd} from './math-words.js';
import {withEquationTypography} from './formatting.js';
const activeIndices=new WeakMap();
function clearNumericIndex(field){
 const state=activeIndices.get(field);if(!state)return;
 state.target.removeEventListener('keydown',state.keydown,true);
 field.removeEventListener('pointerdown',state.cancel,true);
 field.removeEventListener('blur',state.cancel,true);
 activeIndices.delete(field);
}
function finishNumericIndex(field){
 if(!activeIndices.has(field))return;
 const atom=field._mathfield.model.at(field.position);
 if(atom?.parentBranch==='subscript'&&atom.parent?.type==='subsup')field.executeCommand('moveAfterParent');
 clearNumericIndex(field);
}
function beginNumericIndex(field){
 clearNumericIndex(field);
 // Capture before MathLive's own Space/operator bindings act on the script.
 const target=field.parentElement||field,cancel=()=>clearNumericIndex(field);
 const keydown=event=>{
  if(!field.isConnected){cancel();return;}
  if(!event.composedPath().includes(field)||event.isComposing)return;
  if(event.metaKey||event.ctrlKey||event.altKey||event.key.startsWith('Arrow')){cancel();return;}
  if(event.key.length===1&&!/^\d$/.test(event.key))finishNumericIndex(field);
 };
 activeIndices.set(field,{target,keydown,cancel});
 target.addEventListener('keydown',keydown,true);
 field.addEventListener('pointerdown',cancel,true);field.addEventListener('blur',cancel,true);
}
// Adjacency is the convention: m12 is an indexed variable; 12m is a
// coefficient. Reuse the native subscript branch so later digits stay inside.
export function insertNumericIndex(field,text,insert){
 if(!/^\d+$/.test(text))finishNumericIndex(field);
 if(field.readOnly||field.disabled||!field._mathfield?.isSelectionEditable||!/^\d+$/.test(text)||!field.selectionIsCollapsed||field.mode!=='math'||field.pageInputMode==='text'||field.isProseLine?.())return false;
 const atom=field._mathfield.model.at(field.position);
 if(atom?.mode!=='math'||! /^\p{L}$/u.test(atom.value||'')||atom.hasChildren||atom.subscript?.length||atom.parent?.command==='\\operatorname')return false;
 const left=field.getValue([Math.max(0,field.position-80),field.position],'plain-text').replace(/\u00a0/g,' ');
 // Dimension syntax and user-defined numeric triggers retain their meaning.
 if(/\d+\s*[x×]$/i.test(left)||phraseAtEnd(left+text,field.notationGroups,false,field.customDictionaries)?.custom)return false;
 const perform=()=>withEquationTypography(field,()=>{field.executeCommand('moveToSubscript');insert();beginNumericIndex(field);});
 if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
 return true;
}
