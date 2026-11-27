export const HISTORY_LIMIT=1000;
export const HISTORY_BYTES=4_000_000;
const size=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function validateHistory(value,currentLatex){
 if(!value||value.version!==1||!Array.isArray(value.entries)||!Number.isInteger(value.index)||value.index<0||value.index>=value.entries.length||value.entries.length>HISTORY_LIMIT||size(value)>HISTORY_BYTES)return null;
 const entries=[];
 for(const e of value.entries){
  if(typeof e?.latex!=='string'||e.latex.length>2_000_000||!['math','text'].includes(e.typingMode))return null;
  const ranges=e.selection?.ranges;
  if(!Array.isArray(ranges)||!ranges.length||ranges.length>20||ranges.some(r=>!Array.isArray(r)||r.length!==2||r.some(n=>!Number.isSafeInteger(n)||n<0||n>5_000_000)))return null;
  const phraseSources=Array.isArray(e.phraseSources)?e.phraseSources.filter(p=>Number.isSafeInteger(p?.offset)&&p.offset>=0&&p.offset<=5_000_000&&typeof p.text==='string'&&p.text.length<=(p.parsedSource===true?16000:100)&&typeof p.latex==='string'&&p.latex.length<=(p.parsedSource===true?16000:600)).slice(0,4096).map(p=>({offset:p.offset,text:p.text,latex:p.latex,custom:p.custom===true,context:p.context!==false,parsedSource:p.parsedSource===true,...(p.parsedSource===true&&Number.isSafeInteger(p.start)&&p.start>=0&&p.start<=p.offset?{start:p.start}:{}),...(typeof p.source==='string'&&p.source.length<=(p.parsedSource===true?16000:2000)?{source:p.source}:{})})):[];
  const proseLines=Array.isArray(e.proseLines)?e.proseLines.filter(n=>Number.isSafeInteger(n)&&n>=0&&n<=5_000_000).slice(0,4096):[];
  entries.push({proseLines,phraseSources,latex:e.latex,typingMode:e.typingMode,selection:{ranges:ranges.map(r=>[...r]),direction:e.selection.direction==='backward'?'backward':'forward'}});
 }
 if(entries[value.index].latex!==currentLatex)return null;
 return {version:1,index:value.index,entries};
}
export function installPageHistory(field,saved,onChange=()=>{}){
 const read=()=>({proseLines:field.readProseLines?.()||[],phraseSources:field.readPhraseSources?.()||[],latex:field.value,typingMode:field.mode==='text'?'text':'math',selection:structuredClone(field.selection)});
 let state=validateHistory(saved,field.value)||{version:1,index:0,entries:[read()]};
 let applying=false,timer,transactionDepth=0;
 const editor=field._mathfield;
 function trim(){
  while(state.entries.length>1&&(state.entries.length>HISTORY_LIMIT||size(state)>HISTORY_BYTES)){
   if(state.index>0){state.entries.shift();state.index--;}
   else state.entries.pop();
  }
 }
 function flush(){
  clearTimeout(timer);if(applying||transactionDepth||!field._mathfield)return;
  const next=read(),current=state.entries[state.index];
  if(next.latex===current.latex){current.selection=next.selection;current.typingMode=next.typingMode;current.phraseSources=next.phraseSources;current.proseLines=next.proseLines;return;}
  state.entries.splice(state.index+1);state.entries.push(next);state.index=state.entries.length-1;trim();
 }
 function apply(entry){
  applying=true;clearTimeout(timer);
  editor.model.mode='math';
  field.setValue(entry.latex,{mode:'math',format:'latex',insertionMode:'replaceAll',style:{},silenceNotifications:true});
  field.restorePhraseSources?.(entry.phraseSources);
  field.restoreProseLines?.(entry.proseLines);
  editor.model.mode=entry.typingMode;
  field.selection={ranges:entry.selection.ranges.map(r=>r.map(n=>Math.min(n,field.lastOffset))),direction:entry.selection.direction};
  // Equivalent LaTeX can canonicalize on reload (s^{2} becomes s^2).
  // Record that serialization so the next flush cannot truncate Redo by
  // mistaking restoration itself for a fresh edit.
  entry.latex=field.value;
  editor.model.announce('line');
  applying=false;
 }
 function move(delta){flush();const index=state.index+delta;if(index<0||index>=state.entries.length)return false;state.index=index;apply(state.entries[index]);onChange();return true;}
 const api={flush,transaction(fn){flush();transactionDepth++;try{return fn();}finally{transactionDepth--;clearTimeout(timer);timer=setTimeout(flush,20);}},undo:()=>move(-1),redo:()=>move(1),serialize:()=>{flush();return structuredClone(state);},restore:entry=>{flush();apply(entry);flush();onChange();},get canUndo(){flush();return state.index>0;},get canRedo(){flush();return state.index+1<state.entries.length;},dispose(){clearTimeout(timer);}};
 field.addEventListener('beforeinput',()=>{if(!applying&&!field.proseConverting&&!transactionDepth)flush();},true);
 field.addEventListener('input',()=>{if(!applying){clearTimeout(timer);timer=setTimeout(flush,20);}});
 field.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){
   event.preventDefault();event.stopImmediatePropagation();event.shiftKey?api.redo():api.undo();
  }else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='y'){
   event.preventDefault();event.stopImmediatePropagation();api.redo();
  }
 },true);
 // Route MathLive's context menu and command API to the same page history.
 editor.undo=api.undo;editor.redo=api.redo;
 apply(state.entries[state.index]);
 field.pageHistory=api;
 return api;
}
