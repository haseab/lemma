import {insertPageBreak} from './editing.js';
// Recognize words, rather than repeatedly guessing whether each character is math.
// Once a run becomes prose, its numbers and punctuation remain prose until a
// newline or an explicit backtick math span. Deletion re-evaluates the run
// so removing the prose evidence restores math.
const MATH_WORDS=new Set('sin cos tan sec csc cot sinh cosh tanh arcsin arccos arctan log ln exp lim det max min mod gcd lcm sup inf ker dim arg deg hom rank trace sqrt frac int sum prod alpha beta gamma delta epsilon theta lambda sigma omega pi infinity abc xyz uvw dxd'.split(' '));
const SHORT_WORDS=new Set('an as at be by do he if in is it of on or so to us we'.split(' '));

export function looksLikeProse(text){
 const words=text.match(/[A-Za-z]+/g)||[];
 return words.some(word=>word.length>=3&&!MATH_WORDS.has(word.toLowerCase())&&
   !(text.endsWith(word)&&[...MATH_WORDS].some(math=>math.startsWith(word.toLowerCase()))))||
  (/\s$/.test(text)&&words.some(word=>SHORT_WORDS.has(word.toLowerCase())));
}

function unwrapText(latex){
 let out='';
 for(let i=0;i<latex.length;){
  if(latex.startsWith('\\text{',i)){
   const begin=i+6;let j=begin,depth=1;
   for(;j<latex.length&&depth;j++){
    if(latex[j]==='\\'){j++;continue;}
    if(latex[j]==='{')depth++;else if(latex[j]==='}')depth--;
   }
   out+=unwrapText(latex.slice(begin,j-1));i=j;
  }else out+=latex[i++];
 }
 return out;
}

function connectedRun(field,whole=false){
 let end=field.position,start=end,text='',hasMath=false,hasText=false;
 const literal=offset=>{
  const char=field.getValue([offset,offset+1],'plain-text');
  if(!/^[A-Za-z\s,'’!?\.:;]$/.test(char))return null;
  if(/\\text(?:rm|sf|tt|bf|it)?\{/.test(field.getValue([offset,offset+1],'latex')))hasText=true;
  else hasMath=true;
  return char;
 };
 // Structural atoms (fractions, powers, operators, row boundaries) stop the
 // scan. Only literal letters, spaces and prose punctuation can be converted.
 while(start>0&&end-start<4096){
  const char=literal(start-1);if(char===null)break;
  text=char+text;start--;
 }
 while(whole&&end<field.lastOffset&&end-start<4096){
  const char=literal(end);if(char===null)break;
  text+=char;end++;
 }
 return {start,end,text,hasMath,hasText};
}

export function installProseInput(field){
 let converting=false,explicitMath=false,mathStart=0;
 const shortcuts={...field.inlineShortcuts};
 const safeShortcuts=Object.fromEntries(Object.entries(shortcuts).filter(([key])=>!/[A-Za-z]/.test(key)));
 const updateShortcuts=()=>{field.inlineShortcuts=field.pageInputMode==='auto'&&!explicitMath?safeShortcuts:shortcuts;};
 field.pageInputMode='auto';
 field.smartMode=false;
 field.resetProseInput=()=>{explicitMath=false;updateShortcuts();};
 updateShortcuts();
 field.addEventListener('input',event=>{
  if(converting||field.proseSuspended||field.pageInputMode!=='auto'||explicitMath||field.mode==='latex'||!field.selectionIsCollapsed)return;
  const deletion=/^delete/.test(event.inputType||'');
  if(event.inputType&&!deletion&&!['insertText','insertFromPaste'].includes(event.inputType))return;
  const run=connectedRun(field,deletion),prose=looksLikeProse(run.text);
  let replaced=false;
  if(!prose&&!deletion)return;
  // Keep LaTeX style wrappers while changing the literal run to text. No
  // serialized whole-page replacement, so surrounding math stays untouched.
  converting=true;field.proseConverting=true;
  try{
   if(prose?run.hasMath:run.hasText){
    const cursor=field.position-run.start;
    const latex=prose?unwrapText(field.getValue([run.start,run.end],'latex')):
     Array.from({length:run.end-run.start},(_,index)=>{
      const range=[run.start+index,run.start+index+1];
      const source=field.getValue(range,'latex');
      return /^\s$/.test(field.getValue(range,'plain-text'))?source:unwrapText(source);
     }).join('');
    // The classification correction belongs to the deletion, not a second
    // Undo step. MathLive dispatches input after recording the deletion.
    if(deletion&&field._mathfield){
     if(field._mathfield.canUndo())field._mathfield.popUndoStack();
     // Set the insertion mode without switchMode() recording an intermediate
     // snapshot of the already-deleted word. The insert records the final edit.
     field._mathfield.model.mode='math';
     field._mathfield.stopCoalescingUndo();
    }
    field.selection={ranges:[[run.start,run.end]]};
    field.executeCommand(['insert',prose?`\\text{${latex}}`:latex,{format:'latex',mode:'math',selectionMode:'after'}]);
    replaced=true;
    if(deletion)field.position=Math.min(field.position,run.start+cursor);
   }
   if(deletion&&field._mathfield){
    const editor=field._mathfield;editor.model.mode=prose?'text':'math';
    // The current undo snapshot already records this deletion/replacement.
    // Update its pending typing mode without adding an empty history step.
    const state=editor.undoManager.stack[editor.undoManager.index];
    if(replaced&&state)state.mode=editor.model.mode;
    field.position=field.position;
   }else field.mode=prose?'text':'math';
  }finally{converting=false;field.proseConverting=false;}
 });
 field.addEventListener('keydown',event=>{
  if(field.pageInputMode!=='auto'||event.metaKey||event.ctrlKey||event.altKey||event.isComposing||field.mode==='latex')return;
  // Alphabetic shortcuts must wait for a word boundary: "in" must not become
  // a membership symbol while someone is still typing "inline".
  if(!explicitMath&&field.mode==='math'&&field.selectionIsCollapsed&&
   (event.key==='Enter'||event.key.length===1&&!/[A-Za-z`]/.test(event.key))){
   const word=connectedRun(field).text.match(/[A-Za-z]+$/)?.[0];
   const shortcut=word&&MATH_WORDS.has(word.toLowerCase())&&shortcuts[word];
   if(shortcut){
    const end=field.position;field.selection={ranges:[[end-word.length,end]]};
    field.executeCommand(['insert',typeof shortcut==='string'?shortcut:shortcut.value,{format:'latex',mode:'math',selectionMode:'after'}]);
   }
  }
  if(event.key==='`'){
   event.preventDefault();event.stopImmediatePropagation();
   if(explicitMath&&field.position>mathStart){
    const end=field.position,latex=field.getValue([mathStart,end],'latex');
    field.selection={ranges:[[mathStart,end]]};
    field.executeCommand(['insert',`\\mathord{${latex}}`,{format:'latex',mode:'math',selectionMode:'after'}]);
   }
   explicitMath=!explicitMath;mathStart=field.position;
   updateShortcuts();
   field.mode=explicitMath?'math':'text';
  }else if(event.key==='Enter'){
   event.preventDefault();event.stopImmediatePropagation();
   insertPageBreak(field);explicitMath=false;updateShortcuts();field.mode='math';
  }else if(event.key===' '&&field.mode==='math'&&!explicitMath){
   // MathLive normally discards ordinary math spaces. Retain them so earlier
   // short words can become part of a subsequently recognized sentence.
   event.preventDefault();event.stopImmediatePropagation();
   field.executeCommand(['insert',' ',{mode:'text',format:'text',selectionMode:'after'}]);
   // insert() may choose the adjacent text atom's mode. Unrecognized runs
   // must continue in math until there is actual evidence of prose.
   if(!looksLikeProse(connectedRun(field).text))field.mode='math';
  }
 },true);
}
