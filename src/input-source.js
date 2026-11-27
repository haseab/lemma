import {continuesMathOperand} from './math-grammar.js';
import {mathLeftContext} from './math-context.js';
import {mathInputOptions} from './math-input-options.js';
import {liveMathInput,plainInputToLatex,recognizedMathLanguage,PLAIN_INPUT_LIMIT} from './plain-input.js';
import {looksLikeProse} from './prose.js';
import {tokenizeMath} from './spoken-math.js';
import {hasPendingPhrase} from './math-words.js';
import {pasteFollowsMath} from './clipboard.js';
const controllers=new WeakMap();

// Preserve the source of an uninterrupted typing run independently of the
// rendered tree. A fraction's placeholder or a script's caret must not split
// the sentence the shared parser sees. Native navigation/deletion still edits
// the math tree; its next insertion starts a new source run.
export function installInputSource(field,container){
 controllers.get(container)?.dispose();
 const editor=field._mathfield,originalInput=editor.onInput.bind(editor);
 let run=null,queued=null,editing=false,explicit=false,composing=false;
 const state=()=>field.value+'\0'+JSON.stringify(field.selection);
 const settings=()=>JSON.stringify([field.pageInputMode,field.notationGroups,field.customDictionaries]);
 const allowed=()=>!composing&&!explicit&&!field.proseSuspended&&!field.isProseLine?.()&&!field.readOnly&&!field.disabled&&['auto','math'].includes(field.pageInputMode)&&field.mode!=='latex';
 const reset=()=>{run=null;queued=null;field.sourceInputActive=false;};
 function begin(text){
  if(!allowed()){reset();return false;}
  const changedSettings=run&&run.settings!==settings();
  if(changedSettings)reset();
  if(!run||run.state!==state()){
   // A pending math placeholder is an input position, not a user selection
   // to preserve. Keep it in the source run so filling a template uses the
   // same variable grammar and casing as ordinary typing.
   const ranges=field.selection.ranges,range=ranges[0];
   const placeholder=ranges.length===1&&Math.abs(range[1]-range[0])===1&&editor.model.at(Math.max(...range))?.type==='placeholder';
   if(!field.selectionIsCollapsed&&!placeholder){reset();return false;}
   let connected=placeholder?{start:Math.min(...range),end:Math.max(...range),text:'',styles:[],units:[]}:changedSettings?{start:field.position,end:field.position,text:'',styles:[],units:[]}:field.readConnectedInput();
   if(!placeholder&&field.position!==connected.end){reset();return false;}
   // A native text-service prefix can become mathematical when the actual
   // next character arrives. Require complete Auto-mode grammar evidence
   // before crossing a text boundary in explicit Math mode.
   let recoveredText=false;
   if(!changedSettings&&field.pageInputMode==='math'){
    const textRun=connected.text?connected:field.readConnectedInput({includeText:true});
    const proofOptions=mathInputOptions(field);
    if(textRun.text&&recognizedMathLanguage(textRun.text+text,proofOptions)&&!recognizedMathLanguage(textRun.text,proofOptions)){connected=textRun;recoveredText=true;}
   }
   const firstStyle=connected.styles[0]||{},uniform=connected.styles.every(s=>JSON.stringify(s)===JSON.stringify(firstStyle));
   if(!uniform&&field.pageInputMode!=='math'){reset();return false;}
   const existing=(uniform?firstStyle:connected.styles.at(-1))||{};
   const style={...Object.fromEntries(['color','backgroundColor','fontSize','fontSeries','fontShape','fontFamily'].filter(key=>editor.defaultStyle?.[key]!==undefined).map(key=>[key,editor.defaultStyle[key]])),...existing};
   run={start:connected.start,end:connected.end,text:connected.text,style,state:state(),settings:settings(),afterMath:recoveredText?false:pasteFollowsMath(field,connected.start),managed:connected.units.some(unit=>unit.parsedSource)};
   if(placeholder&&!connected.text){run.start=Math.min(...range);run.end=Math.max(...range);run.afterMath=false;}
   const native=!recoveredText&&field.pageInputMode==='math'&&mathLeftContext(field,field.position);
   if(native&&!placeholder&&(!connected.text||native.start<connected.start)){run.start=native.start;run.text='';run.leftTokens=native.tokens;run.style={};}
   const token=tokenizeMath(run.text,mathInputOptions(field)).at(-1);
   if(connected.units.at(-1)?.notation&&!connected.units.at(-1)?.wordlike&&/[A-Za-z]$/.test(run.text)&&/^[A-Za-z0-9]/.test(text)&&(token?.type==='op'||token?.template||['quantifier','prefix'].includes(token?.type)))run.text+=' ';
  }
  if(run.boundary&&/^[A-Za-z0-9]/.test(text)&&!hasPendingPhrase(run.text+text,field.notationGroups,field.customDictionaries))run.text+=' ';
  run.boundary=false;
  if(run.text.length+text.length+(run.leftTokens?.length||0)>PLAIN_INPUT_LIMIT){reset();return false;}
  run.text+=text;
  field.sourceInputActive=!!run.managed;
  return true;
 }
 function finish(previousLast){
  if(!run||!allowed()){reset();return;}
  run.end+=field.lastOffset-previousLast;
  const options=mathInputOptions(field,{afterMath:run.afterMath,preserveSpacing:true,deferPendingWords:true}),tokens=tokenizeMath(run.text,options);
  if(tokens[0]?.type!=='word'&&tokens.some(token=>!['atom','word','op','punctuation','ordinalNumber','disabledStructure'].includes(token.type)&&run.text.slice(token.start,token.end)!==token.value)){run.managed=true;field.sourceInputActive=true;}
  if(run.leftTokens)options.leftTokens=run.leftTokens;
  const candidate=liveMathInput(run.text,options);
  // Native symbolic editing already has a structured result. Only replace it
  // when the shared recognizer consumed language requiring interpretation.
  // A Greek name can be the prefix of an ordinary word, such as pi/pie.
  // Keep Auto's word-boundary behavior while complete bulk input and explicit
  // case qualifiers still use the same canonical variable representation.
  const pendingName=field.pageInputMode==='auto'&&candidate?.dictionary&&tokens.length===1&&tokens[0].variable&&!tokens[0].explicitCase&&/^[A-Za-z]+$/.test(run.text);
  const assessment=!pendingName&&(candidate?.requiresSource||run.managed&&candidate)&&candidate.interpreted?candidate:null;
  run.boundary=!!assessment&&/[A-Za-z]$/.test(run.text)&&tokenizeMath(run.text,mathInputOptions(field)).at(-1)?.type==='op';
  if(assessment){
   run.managed=true;field.sourceInputActive=true;
   const canonical=value=>value.replace(/([_^])\{([A-Za-z0-9])\}/g,'$1$2');
   if(canonical(field.getValue([run.start,run.end],'latex'))===canonical(assessment.contentLatex)){run.state=state();return;}
   const before=field.lastOffset;
   const source=assessment.dictionary&&assessment.pendingPlaceholder?run.text.trimEnd():run.text;
   field.reassessProseInput(assessment,{start:run.start,end:run.end,text:source,cursor:source.length,styles:Array.from(source,()=>run.style)});
   run.end+=field.lastOffset-before;
  }else if(!run.leftTokens&&run.managed&&looksLikeProse(run.text,field.notationGroups,field.customDictionaries)){
   // Reassess a formerly mathematical run as ordinary prose through the same
   // completed-input decision as paste; its original words remain available.
   const value=plainInputToLatex(run.text,mathInputOptions(field));
   if(field.getValue([run.start,run.end],'latex')!==value){
    const before=field.lastOffset;field.proseSuspended=true;
    try{field.selection={ranges:[[run.start,run.end]]};field.executeCommand(['insert',value,{format:'latex',mode:'math',selectionMode:'after'}]);const end=field.position;if(Object.keys(run.style).length){field.selection={ranges:[[run.start,end]]};field.applyStyle(run.style,{operation:'set'});field.position=end;}field._mathfield.model.mode=field.pageInputMode==='math'?'math':'text';}
    finally{field.proseSuspended=false;}
    run.end+=field.lastOffset-before;
   }
  }
  run.state=state();
 }
 // Capture outside the field: its native space handler can stop propagation.
 const keydown=event=>{
  if(!event.composedPath().includes(field))return;
  if(queued&&!queued.event.defaultPrevented)reset();
  else queued=null;
  if(event.key==='`'){explicit=!explicit;reset();return;}
  if(event.isComposing||event.metaKey||event.ctrlKey||event.altKey||event.key.length!==1){if(!['Shift','Alt','Control','Meta'].includes(event.key))reset();return;}
  const previousLast=field.lastOffset;
  if(!begin(event.key))return;
  const pending={text:event.key,previousLast,before:state(),event};queued=pending;
  queueMicrotask(()=>{
   // Browser text insertion may happen after this microtask checkpoint. Only
   // finish here when a key handler consumed the key (space/template commands).
   // Otherwise onInput owns the character and finishes after its native edit.
   if(queued!==pending||!event.defaultPrevented||state()===pending.before)return;
   queued=null;finish(previousLast);
  });
 };
 container.addEventListener('keydown',keydown,true);
 field.addEventListener('pointerdown',()=>{explicit=false;reset();},true);
 field.addEventListener('compositionstart',()=>{composing=true;reset();},true);
 field.addEventListener('compositionend',()=>{composing=false;reset();},true);
 const setValue=field.setValue.bind(field);
 field.setValue=(...args)=>{reset();return setValue(...args);};
 field.resetInputSource=reset;
 editor.onInput=(text,options)=>{
  if(editing)return originalInput(text,options);
  if(typeof text!=='string'||Array.from(text).length!==1){reset();return originalInput(text,options);}
  const previousLast=field.lastOffset;
  const pending=queued;queued=null;
  if(pending&&pending.text!==text)reset();
  const active=pending?.text===text?!!run:begin(text);
  editing=true;
  try{return originalInput(text,options);}
  finally{editing=false;if(active)finish(pending?.previousLast??previousLast);}
 };
 const api={dispose(){container.removeEventListener('keydown',keydown,true);reset();}};
 controllers.set(container,api);return api;
}
