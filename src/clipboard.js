import {continuesMathOperand} from './math-grammar.js';
import {mathLeftContext} from './math-context.js';
import {tokenizeMath} from './spoken-math.js';
import {mathInputOptions,PLAIN_INPUT_LIMIT} from './math-input-options.js';
import {insertPageBreak} from './editing.js';
import {convertLatexToMathMl,validateLatex} from 'mathlive';
import {importLatex,looksLikeLatex,readableSelection,splitDisplayRows} from './formats.js';
import {plainInputToLatex,liveMathInput,lowercasePastedVariables} from './plain-input.js';
import {withEquationTypography} from './formatting.js';
import {insertNumericIndex} from './indices.js';
export function clipboardPayload(field){
 const latex=field.getValue(field.selection,'latex');
 const mathml=convertLatexToMathMl(latex);
 const text=readableSelection(field),html=text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Rich-text apps can import unknown MathML elements as separate paragraphs.
 // Supply a readable HTML fallback and keep structured math in its own type.
 return {'text/plain':text,'application/x-latex':latex,'text/html':`<span style="white-space:pre-wrap">${html}</span>`,'application/mathml+xml':mathml.startsWith('<math')?mathml:`<math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math>`};
}
export function insertClipboard(field,types,{onError=()=>{}}={}){
 if(!field._mathfield?.isSelectionEditable)return false;
 const latex=types['application/x-latex'];let source=latex||types['text/plain'];
 if(!source)return false;
 if(source.length>2_000_000){onError('Pasted content exceeds the page limit.');return true;}
 field.dismissAutomaticConversion?.();
 try{
  const originalSource=source,inputOptions=mathInputOptions(field,{afterMath:pasteFollowsMath(field)});
  if(!latex&&!looksLikeLatex(source))source=lowercasePastedVariables(source,inputOptions);
  let continuation=null,retainedSource=true;
  if(!latex&&!looksLikeLatex(source)&&!/[\r\n`$]/.test(source)&&inputOptions.mode==='math'&&field.selectionIsCollapsed){
   const first=tokenizeMath(source,inputOptions)[0];
   if(continuesMathOperand(first)){
    const run=field.readConnectedInput?.(),at=field.position,native=mathLeftContext(field,at);
    if(native&&(!run?.text||native.start<run.start)){
     const parsed=liveMathInput(source,{...inputOptions,leftTokens:native.tokens});
     if(parsed){continuation={start:native.start,end:at,latex:parsed.latex};retainedSource=false;}
    }
    if(!continuation){
    if(run?.end===at&&run.start<at&&run.hasMath&&run.styles.every(style=>JSON.stringify(style)===JSON.stringify(run.styles[0]))){
     const boundary=/[A-Za-z]$/.test(run.text)&&/^[A-Za-z]/.test(source)?' ':'';
     const combined=run.text+boundary+source,tokens=tokenizeMath(combined,inputOptions);
     if(!continuesMathOperand(tokens[0])){
      const parsed=combined.length<=PLAIN_INPUT_LIMIT&&liveMathInput(combined,{...inputOptions,afterMath:pasteFollowsMath(field,run.start)});
      if(parsed){continuation={start:run.start,end:at,latex:parsed.latex};source=combined;}
     }else{
      const left=mathLeftContext(field,run.start,tokens[0]);
      const parsed=left&&liveMathInput(combined,{...inputOptions,leftTokens:left.tokens});
      if(parsed){continuation={start:left.start,end:at,latex:parsed.latex};retainedSource=false;}
     }
    }else{
     const left=mathLeftContext(field,at,first),parsed=left&&liveMathInput(source,{...inputOptions,leftTokens:left.tokens});
     if(parsed){continuation={start:left.start,end:at,latex:parsed.latex};retainedSource=false;}
    }
    }
   }
  }
  let value;
  if(continuation)value=continuation.latex;
  else if(latex||field.pageInputMode!=='text'&&!field.isProseLine?.()&&looksLikeLatex(source))value=importLatex(source);
  else value=plainInputToLatex(source,inputOptions);
  if(validateLatex(value).length)throw Error('Pasted content contains unsupported or incomplete LaTeX. The current selection was preserved.');
  const locked=field.isProseLine?.();
  field.proseSuspended=true;
  const converted=!latex&&field.pageInputMode!=='text'&&!locked&&!looksLikeLatex(source)&&value!==plainInputToLatex(source,{mode:'text'});
  const automatic=converted&&field.pageInputMode==='auto';
  const pendingPlaceholder=converted&&value.includes('#?');
  const insertValue=()=>{
   if(continuation)field.selection={ranges:[[continuation.start,continuation.end]]};
   const start=Math.min(...field.selection.ranges.flat());
   const result=insertLatexContent(field,value);
   if(converted&&retainedSource)field.noteParsedSource?.(source,start,field.position,inputOptions);
   if(pendingPlaceholder)for(let offset=field.position;offset>start;offset--){
    if(field._mathfield.model.at(offset)?.type==='placeholder'){field.selection={ranges:[[offset-1,offset]]};break;}
   }
   return result;
  };
  const insert=()=>{
   if(!automatic){const result=converted?withEquationTypography(field,insertValue):insertValue();if(locked)field.keepLineProse?.();return result;}
   const range=field.selection.ranges.flat();
   return field.trackAutomaticConversion({start:Math.min(...range),end:Math.max(...range),text:originalSource,cursor:originalSource.length},()=>{
    insertValue();const selection=field.selection;field.noteQuantifiedSources?.(source,Math.min(...range),field.position);
    if(pendingPlaceholder)field.selection=selection;
   });
  };
  if(field.pageHistory)field.pageHistory.transaction(insert);else insert();
  setTimeout(()=>{field.proseSuspended=false;const reassess=()=>field.reassessProseInput?.();if(field.reconcileNativeReadback)field.reconcileNativeReadback(reassess);else reassess();},0);
  return true;
 }catch(error){onError(error.message);return true;}
}
export function pasteFollowsMath(field,position=Math.min(...field.selection.ranges.flat())){
 const model=field._mathfield.model;
 let offset=position;
 // A separating space can be a text atom, even within an otherwise math row.
 for(let scanned=0;offset>0&&scanned<100;scanned++,offset--){
  const atom=model.at(offset);
  if(/^\s+$/.test(atom?.value||''))continue;
  return atom?.mode==='math'&&(!!atom.superscript?.length||!!atom.subscript?.length||['genfrac','surd','leftright'].includes(atom.type)||/^[\p{L}\p{N}]$/u.test(atom.value||''));
 }
 return false;
}
export function installClipboard(field,onError,diagnose=()=>{}){
 const sink=field.shadowRoot.querySelector('[part=keyboard-sink]');
 // This is an editable multiline document, including for text-service clients.
 sink.setAttribute('aria-multiline','true');sink.setAttribute('inputmode','text');
 // Keep keyboard auto-capitalization out of prose input. The shared math
 // tokenizer applies variable casing and explicit spoken case overrides.
 sink.setAttribute('autocapitalize','off');
 const debugParams=new URLSearchParams(location.search);
 const retainNativeReadback=debugParams.get('pasteReadback')!=='0';
 let pasteReceipt=null,pendingPaste=null,composing=false,nativeReadback=null,reconcilingReadback=false;
 const state=()=>field.value+'\u0000'+JSON.stringify(field.selection);
 const reset=()=>{pasteReceipt=null;pendingPaste=null;};
 const clearReadback=()=>{if(nativeReadback&&!reconcilingReadback){sink.textContent='';nativeReadback=null;}};
 field.addEventListener('keydown',()=>{reset();clearReadback();},true);field.addEventListener('pointerdown',()=>{reset();clearReadback();},true);
 if(retainNativeReadback){
  field.reconcileNativeReadback=fn=>{
   if(!nativeReadback||nativeReadback.state!==state())return fn();
   // This synchronous callback only finishes formatting the accepted paste.
   // No new user input can interleave; keep its receipt valid after formatting.
   reconcilingReadback=true;
   try{return fn();}finally{reconcilingReadback=false;if(nativeReadback){nativeReadback.state=state();if(sink.textContent!==nativeReadback.buffer)sink.textContent=nativeReadback.buffer;}}
  };
  // Readback is a receipt for the last insertion, not a second document model.
  // Expire it whenever editing, navigation, history or page replacement makes
  // the received text an inaccurate representation of the current position.
  sink.addEventListener('blur',clearReadback);
  field.addEventListener('beforeinput',event=>{if(event.inputType!=='insertFromPaste')clearReadback();},true);
  field.addEventListener('selection-change',()=>{if(nativeReadback&&nativeReadback.state!==state())clearReadback();});
  field.addEventListener('input',()=>{if(nativeReadback&&nativeReadback.state!==state())clearReadback();});
  const setValue=field.setValue.bind(field);
  field.setValue=(...args)=>{clearReadback();return setValue(...args);};
 }
 sink.addEventListener('compositionstart',()=>{composing=true;reset();clearReadback();});
 sink.addEventListener('compositionend',()=>{composing=false;});
 sink.addEventListener('input',event=>{
  if(composing||event.isComposing||/Composition/.test(event.inputType||''))return;
  let source=event.data||sink.textContent||'';
  // A buffer-only insertion can append to the retained receipt. Only the new
  // suffix is input; re-inserting the whole buffer would repeat old dictation.
  if(event.inputType==='insertText'&&!event.data&&nativeReadback&&source.startsWith(nativeReadback.buffer))source=source.slice(nativeReadback.buffer.length);
  if(event.inputType!=='insertFromPaste'&&(event.data||!source||!['insertText','insertReplacementText'].includes(event.inputType))){reset();return;}
  // Some accessibility clients write the editable buffer, then send an input
  // event without data. Others deliver paste input without a ClipboardEvent.
  const readback=retainNativeReadback&&event.inputType==='insertFromPaste'&&pendingPaste?sink.textContent:null;
  event.preventDefault();event.stopImmediatePropagation();if(readback===null){clearReadback();sink.textContent='';}
  const receipt=pasteReceipt,payload=pendingPaste;reset();
  if(event.inputType==='insertFromPaste'&&payload){
   const before=field.value,handled=insertClipboard(field,payload,{onError});
   if(readback!==null&&handled&&field.value!==before){if(sink.textContent!==readback)sink.textContent=readback;nativeReadback={buffer:readback,state:state()};diagnose('input:readback-retained',{bufferCharacters:sink.textContent.length});}
   else if(readback!==null){clearReadback();sink.textContent='';}
   diagnose('paste:converted',{native:true,handled,changed:field.value!==before});
   pasteReceipt={source:payload['text/plain']||payload['application/x-latex'],state:state()};
   return;
  }
  // A trailing insertFromPaste belongs to the clipboard event already consumed.
  // A new paste/key/caret action resets this receipt, so deliberate repeats work.
  if(event.inputType==='insertFromPaste'&&receipt&&receipt.state===state()&&(!source||source===receipt.source)){diagnose('paste:echo-suppressed');return;}
  if(source){const before=field.value,handled=insertClipboard(field,{'text/plain':source},{onError});diagnose('input:recovered',{handled,changed:field.value!==before,characters:source.length});}
 },true);

 // The keyboard delegate receives completed text from transcription tools.
 // Hook that boundary rather than beforeinput, which MathLive also emits for
 // internal formatting, source edits, and caret operations.
 const editor=field._mathfield,originalInput=editor.onInput.bind(editor);
 editor.onInput=(text,options)=>{
  if(!field.proseSuspended&&insertNumericIndex(field,text,()=>originalInput(text,options)))return;
  // Text services bypass the physical Space binding. Insert its configured
  // math spacing as LaTeX so auto-format detection cannot strip the space.
  if(text===' '&&field.mode==='math'&&field.mathModeSpace&&field.pageInputMode!=='text'&&!field.isProseLine?.()){
   field.executeCommand(['insert',field.mathModeSpace,{format:'latex',mode:'math',selectionMode:'after'}]);return;
  }
  if(!field.proseSuspended&&field.mode!=='latex'&&typeof text==='string'&&Array.from(text).length>1){
   insertClipboard(field,{'text/plain':text},{onError});return;
  }
  return originalInput(text,options);
 };
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
  reset();
  const types={};for(const type of ['application/x-latex','text/plain'])types[type]=event.clipboardData.getData(type);
  if(event.composedPath()[0]===sink&&field._mathfield?.isSelectionEditable&&(types['text/plain']||types['application/x-latex'])){
   // Let Chromium complete its native editable paste. Cancelling the paste
   // after inserting only into the math model can look like a failed native
   // insertion to text services. Consume its resulting input exactly once.
   pendingPaste=types;
   diagnose('paste:awaiting-native-input',{native:true,characters:(types['text/plain']||types['application/x-latex']).length});
   event.stopImmediatePropagation();
   return;
  }
  if(insertClipboard(field,types,{onError})){
   // Match MathLive's native paste cleanup when taking ownership of the event.
   sink.textContent='';sink.focus({preventScroll:true});
   pasteReceipt={source:types['text/plain']||types['application/x-latex'],state:state()};
   event.preventDefault();event.stopImmediatePropagation();
  }
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
