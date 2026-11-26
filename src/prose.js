import {quantifiedInput} from './plain-input.js';
import {tokenizeMath} from './spoken-math.js';
import {loadDictionaries,validateDictionaries,dictionaryPhrases,validDictionaryPhrase} from './custom-dictionary.js';
import {MATH_WORDS,namedOperator,vocabulary,phraseAtEnd,symbolPhrase,loadNotationGroups,hasPendingPhrase,normalizeGroups,shortcutEnabled} from './math-words.js';
import {insertPageBreak} from './editing.js';
// Recognize words, rather than repeatedly guessing whether each character is math.
// Once a run becomes prose, its numbers and punctuation remain prose until a
// newline or an explicit backtick math span. Deletion re-evaluates the run
// so removing the prose evidence restores math.
const phraseSources=new WeakMap();
const SHORT_WORDS=new Set('an as at be by do he if in is it of on or so to us we'.split(' '));

export function looksLikeProse(text,enabled,libraries){
 const config=vocabulary(enabled,libraries),mathWords=config.words;
 let candidate=text.toLowerCase(),prefixLength=0;
 const trimmed=candidate.trimEnd(),trailing=candidate.length-trimmed.length;
 // Prefer a longer unfinished phrase over a shorter complete word, e.g.
 // "if and" must wait for "only if" rather than converting "and" alone.
 for(const phrase of config.phrases){
  for(let length=phrase.text.length;length>prefixLength;length--){
   const prefix=phrase.text.slice(0,length);
   if(trimmed===prefix||trimmed.endsWith(' '+prefix)){prefixLength=length;break;}
  }
 }
 if(prefixLength)candidate=candidate.slice(0,-prefixLength-trailing);
 for(const phrase of config.phrases)candidate=candidate.replace(new RegExp('\\b'+phrase.text+'\\b','g'),' ');
 const words=candidate.match(/[A-Za-z]+/g)||[];
 return words.some(word=>word.length>=3&&!mathWords.has(word.toLowerCase())&&
   !(candidate.endsWith(word)&&[...mathWords].some(math=>math.startsWith(word.toLowerCase()))))||
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
 const caret=field.position,model=field._mathfield?.model;
 let end=caret,start=end,text='',hasMath=false,hasText=false;
 const units=[];
 const styleOf=atom=>Object.fromEntries(['color','backgroundColor','fontSize','fontSeries','fontShape','fontFamily'].filter(key=>atom?.style?.[key]!==undefined).map(key=>[key,atom.style[key]]));
 const read=(offset,backward)=>{
  const atom=model?.at(backward?offset:offset+1);
  // Explicit math spaces serialize as control spaces and render as NBSP.
  // Match phrases across them exactly as across ordinary typed spaces.
  if(atom?.type==='space'&&['\\ ','\\space'].includes(atom.command)){const begin=backward?offset-1:offset;return {start:begin,end:begin+1,text:' ',math:true,styles:[styleOf(atom)]};}
  // A literal multiplication sign is also a dimension separator in 3×3.
  // Preserve the character rather than reading it as the phrase 'cross product'.
  if(atom?.value==='×'&&!phraseSources.has(atom)&&!atom.hasChildren){const begin=backward?offset-1:offset;return {start:begin,end:begin+1,text:'×',math:atom.mode!=='text',styles:[styleOf(atom)]};}
  for(let candidate=atom;candidate&&candidate!==model?.root;candidate=candidate.parent){
   if(candidate.superscript?.length||candidate.subscript?.length)break;
   const finish=model.offsetOf(candidate),begin=candidate.hasChildren?model.offsetOf(candidate.firstChild)-1:finish-1;
   if(backward?finish!==offset:begin!==offset)continue;
   const known=phraseSources.get(candidate)||symbolPhrase('',candidate);
   if(!known&&(candidate.hasChildren||!candidate.style?.variant))continue;
   const phrase=known||symbolPhrase(field.getValue([begin,finish],'latex'),candidate);
   if(phrase)return {start:begin,end:finish,text:phrase.text,math:true,notation:true,styles:[...phrase.text].map(()=>styleOf(candidate))};
  }
  let operator=atom;
  if(!backward&&atom?.type==='first'&&atom.parent?.command==='\\operatorname')operator=atom.parent;
  if(operator?.command==='\\operatorname'&&!operator.superscript?.length&&!operator.subscript?.length){
   const finish=model.offsetOf(operator),begin=model.offsetOf(operator.body?.[0])-1;
   const body=operator.body?.filter(atom=>atom.type!=='first')||[];
   const word=body.length&&body.every(atom=>/^[A-Za-z]$/.test(atom.value||'')&&!atom.superscript?.length&&!atom.subscript?.length)?body.map(atom=>atom.value).join(''):null;
   if(word&&MATH_WORDS.has(word.toLowerCase())&&(backward?finish===offset:begin===offset))return {start:begin,end:finish,text:word,math:true,notation:true,wordlike:true,styles:body.map(styleOf)};
  }
  const begin=backward?offset-1:offset,finish=begin+1;
  const source=field.getValue([begin,finish],'latex'),leaf=model?.at(finish);
  const plain=leaf&&!leaf.body?.length&&!leaf.superscript?.length&&!leaf.subscript?.length&&/^[A-Za-z0-9×\s,'’!?\.:;]$/.test(leaf.value||'')?leaf.value:field.getValue([begin,finish],'plain-text');
  const operatorWord=leaf?.type==='operator'&&leaf.command?.slice(1);
  if(operatorWord&&MATH_WORDS.has(operatorWord.toLowerCase())&&/^[A-Za-z]+\s*$/.test(leaf.value||''))return {start:begin,end:finish,text:operatorWord,math:true,notation:true,wordlike:true,styles:[...operatorWord].map(()=>styleOf(leaf))};
  if(!/^[A-Za-z0-9×\s,'’!?\.:;]$/.test(plain))return null;
  return {start:begin,end:finish,text:plain,math:leaf?.mode?leaf.mode!=='text':! /\\text(?:rm|sf|tt|bf|it)?\{/.test(source),styles:[styleOf(leaf)]};
 };
 // Traverse recognized word operators as units, but never cross structural
 // math such as fractions, scripts, explicit inline groups, or row boundaries.
 while(start>0&&end-start<4096){const unit=read(start,true);if(!unit)break;units.unshift(unit);start=unit.start;}
 while(whole&&end<field.lastOffset&&end-start<4096){const unit=read(end,false);if(!unit)break;units.push(unit);end=unit.end;}
 // Serialized math normally omits spaces between symbols and identifiers.
 // Supply word boundaries when reading multiword notation back as language;
 // keep the padding in its unit so styles and cursor mapping remain aligned.
 for(let i=0;i<units.length;i++){
  const unit=units[i],previous=units[i-1],next=units[i+1];
  const prepend=unit.notation&&unit.text.includes(' ')&&/[A-Za-z0-9]$/.test(previous?.text||'')&&/^[A-Za-z]/.test(unit.text);
  const append=(unit.notation&&unit.text.includes(' ')&&/[A-Za-z]$/.test(unit.text)||unit.math&&unit.text===',')&&/^[A-Za-z0-9]/.test(next?.text||'');
  if(prepend){unit.text=' '+unit.text;unit.styles.unshift(unit.styles[0]||{});}
  if(append){unit.text+=' ';unit.styles.push(unit.styles.at(-1)||{});}
 }
 for(const unit of units){text+=unit.text;if(unit.math)hasMath=true;else hasText=true;}

 return {start,end,text,units,classificationText:units.map((unit,index)=>unit.notation&&(!unit.wordlike||!/[A-Za-z]$/.test(units[index-1]?.text||'')&&!/^[A-Za-z]/.test(units[index+1]?.text||''))?' ':unit.text).join(''),hasMath,hasText,styles:units.flatMap(unit=>unit.styles),cursor:units.filter(u=>u.end<=caret).reduce((n,u)=>n+u.text.length,0)};
}

function phraseRange(run,phrase,position){
 if(!phrase)return null;
 const units=run.units.filter(unit=>unit.end<=position),text=units.map(unit=>unit.text).join('');
 const trailing=text.length-text.trimEnd().length,to=text.length-trailing,from=to-phrase.text.length;
 if(from<0||text.slice(from,to).toLowerCase()!==phrase.text)return null;
 let offset=0,start,end;
 for(const unit of units){if(offset===from)start=unit.start;offset+=unit.text.length;if(offset===to)end=unit.end;}
 return start===undefined||end===undefined?null:{start,end,trailing};
}

// A relation needs an operand, not merely an earlier word in the sentence.
function phraseHasContext(field,run,phrase){
 if(!phrase?.context)return true;
 const text=run.text.trimEnd(),left=text.slice(0,-phrase.text.length).trim();
 if(left){
  // A leading quantifier establishes mathematical context even when its
  // bound objects have an ordinary-language label.
  if(quantifiedInput(left,{groups:field.notationGroups,libraries:field.customDictionaries,shortcuts:field.getNotationShortcuts?.()}))return true;
  if(looksLikeProse(left+' ',field.notationGroups,field.customDictionaries))return false;
  const words=left.match(/[A-Za-z]+/g)||[];
  return words.every(word=>!SHORT_WORDS.has(word.toLowerCase())&&word!=='I')&&
   words.every(word=>word.length===1||vocabulary(field.notationGroups,field.customDictionaries).words.has(word.toLowerCase()));
 }
 // Fractions and powers end the connected literal run, but are still operands.
 const previous=field._mathfield?.model.at(run.start);
 return !!previous&&previous.mode==='math'&&previous.type!=='first'&&
  (!!previous.superscript?.length||!!previous.subscript?.length||previous.type==='genfrac'||/^[0-9]$/.test(previous.value||''));
}

export function installProseInput(field){
 let converting=false,explicitMath=false,mathStart=0,pendingTemplateSpace=false,lastQuantifiedAssessment=null;
 const sources=new Map();
 try{field.customDictionaries=loadDictionaries(field.ownerDocument.defaultView.localStorage);}catch{field.customDictionaries=[];}
 field.setCustomDictionaries=libraries=>{field.customDictionaries=validateDictionaries(libraries);};
 field.notePhraseSource=phrase=>{const atom=field._mathfield.model.at(field.position);phraseSources.set(atom,phrase);sources.set(atom,phrase);};
 field.readPhraseSources=()=>{
  const model=field._mathfield.model,result=[];
  for(const [atom,phrase] of sources){const offset=model.offsetOf(atom);if(offset<0||model.at(offset)!==atom){sources.delete(atom);continue;}const begin=atom.hasChildren?model.offsetOf(atom.firstChild)-1:offset-1;result.push({offset,text:phrase.text,latex:phrase.latex,source:field.getValue([begin,offset],'latex'),custom:!!phrase.custom,context:!!phrase.context});}
  return result;
 };
 field.restorePhraseSources=entries=>{
  sources.clear();
  for(const entry of entries||[]){
   const phrase=[...dictionaryPhrases(field.customDictionaries,true),...vocabulary().phrases].find(p=>p.text===entry.text&&p.latex===entry.latex)||
    (entry.latex==='\\forall'&&/^for all values?$/.test(entry.text)?{text:entry.text,latex:entry.latex,context:false}:null)||
    (entry.custom&&validDictionaryPhrase(entry.text)?{text:entry.text,latex:entry.latex,custom:true,context:entry.context!==false}:null),atom=field._mathfield.model.at(entry.offset);
   const begin=atom?.hasChildren?field._mathfield.model.offsetOf(atom.firstChild)-1:entry.offset-1;
   const sourceMatches=entry.source&&field.getValue([begin,entry.offset],'latex')===entry.source;
   if(phrase&&atom&&(sourceMatches||atom.command===phrase.latex||atom.value===phrase.latex)){phraseSources.set(atom,phrase);sources.set(atom,phrase);}
  }
 };
 field.noteQuantifiedSources=(source,start,end)=>{
  const tokens=tokenizeMath(source,{groups:field.notationGroups,libraries:field.customDictionaries});
  if(tokens[0]?.type!=='quantifier')return;
  let offset=start+1;const caret=field.position,model=field._mathfield.model;
  for(const token of tokens){
   if(!['op','quantifier'].includes(token.type))continue;
   const text=source.slice(token.start,token.end).toLowerCase();if(!/[A-Za-z]/.test(text))continue;
   for(let i=offset;i<=end;i++){
    const atom=model.at(i);
    if(atom?.command===token.value||atom?.value===token.value){
     field.position=i;field.notePhraseSource({text,latex:token.value,custom:!!token.custom,context:!!token.context});offset=i+1;break;
    }
   }
  }
  field.position=caret;
 };
 const shortcuts={...field.inlineShortcuts};
 field.getNotationShortcuts=()=>({...shortcuts});
 const safeShortcuts=Object.fromEntries(Object.entries(shortcuts).filter(([key])=>!/[A-Za-z]/.test(key)));
 const updateShortcuts=()=>{field.inlineShortcuts=Object.fromEntries(Object.entries(safeShortcuts).filter(([,value])=>shortcutEnabled(value,field.notationGroups,field.customDictionaries)));};
 field.setNotationGroups=groups=>{field.notationGroups=normalizeGroups(groups);updateShortcuts();};
 try{field.notationGroups=loadNotationGroups(field.ownerDocument.defaultView.localStorage);}catch{field.notationGroups=loadNotationGroups();}
 field.pageInputMode='auto';
 field.smartMode=false;
 field.resetProseInput=()=>{field.dismissAutomaticConversion?.();explicitMath=false;pendingTemplateSpace=false;updateShortcuts();};
 updateShortcuts();
 field.reassessProseInput=()=>{
  if(converting||field.proseSuspended||field.isProseLine?.()||!['auto','math'].includes(field.pageInputMode)||explicitMath||field.mode==='latex'||!field.selectionIsCollapsed)return false;
  const run=connectedRun(field,true);
  // Use the bulk-input grammar for a whole connected quantified statement.
  // Only literal non-space text needs replacement; preserve existing math spaces.
  const assessed=quantifiedInput(run.text,{groups:field.notationGroups,libraries:field.customDictionaries,shortcuts});
  if(assessed)field._mathfield.model.mode='math';
  if(assessed&&field.position===run.end){
   const settings=JSON.stringify([field.pageInputMode,field.notationGroups,field.customDictionaries]);
   if(lastQuantifiedAssessment?.latex===field.value&&lastQuantifiedAssessment.position===field.position&&lastQuantifiedAssessment.settings===settings)return false;
   const style=run.styles[0]||{},uniform=run.styles.every(value=>JSON.stringify(value)===JSON.stringify(style));
   if(uniform){
    const latex=assessed.latex;
    if(field.getValue([run.start,run.end],'latex')!==latex){
     converting=true;field.proseConverting=true;
     try{field.trackAutomaticConversion(run,()=>{
      field.selection={ranges:[[run.start,run.end]]};
      field.executeCommand(['insert',latex,{format:'latex',mode:'math',selectionMode:'after'}]);
      const end=field.position;
      field.noteQuantifiedSources(run.text,run.start,end);
      const binder=run.text.trimStart().match(/^(for all values?)\s+[A-Za-z]\b/i);
      if(binder){field.position=run.start+1;field.notePhraseSource({text:binder[1].toLowerCase(),latex:'\\forall',context:false});field.position=end;}
      if(Object.keys(style).length){field.selection={ranges:[[run.start,end]]};field.applyStyle(style,{operation:'set'});field.position=end;}
      field._mathfield.model.mode='math';
     });}finally{converting=false;field.proseConverting=false;}
     // MathLive canonicalizes equivalent LaTeX spellings on insertion. Do not
     // rewrite that canonical result on the input event our own insert emits.
     lastQuantifiedAssessment={latex:field.value,position:field.position,settings};
     return true;
    }
   }
  }
  return false;
 };
 field.addEventListener('input',event=>{
  // A whitespace text atom must not switch a forced or explicit math run to prose.
  if((field.pageInputMode==='math'||explicitMath)&&field.mode==='text')field._mathfield.model.mode='math';
  if(converting||field.proseSuspended||field.isProseLine?.()||!['auto','math'].includes(field.pageInputMode)||field.mode==='latex'||!field.selectionIsCollapsed)return;
  const forcedMath=field.pageInputMode==='math'||explicitMath;
  const deletion=/^delete/.test(event.inputType||'');
  if(forcedMath&&deletion)return;
  if(event.inputType&&!deletion&&!['insertText','insertFromPaste'].includes(event.inputType))return;
  const run=connectedRun(field,deletion),match=phraseAtEnd(run.text.trimEnd(),field.notationGroups,false,field.customDictionaries);
  const quantified=quantifiedInput(run.text,{groups:field.notationGroups,libraries:field.customDictionaries,shortcuts});
  if(quantified&&!forcedMath){
   if(!deletion&&field.reassessProseInput())return;
   field._mathfield.model.mode='math';
   if(!deletion)field.offerAutomaticRejection(run);
   return;
  }
  const lastUnit=run.units.findLast(unit=>unit.text.trim());
  const renderedMatch=!!match&&lastUnit?.notation&&lastUnit.text.trim()===match.text;
  // Context checks decide whether literal words may become a relation. An
  // already rendered relation stays math when its right operand is deleted.
  const prose=!forcedMath&&(looksLikeProse(run.classificationText,field.notationGroups,field.customDictionaries)||!!(match?.context&&!renderedMatch&&!phraseHasContext(field,run,match)));
  const word=run.text.trimEnd().match(/[A-Za-z]+$/)?.[0],operator=word&&namedOperator(word,field.notationGroups,field.customDictionaries);
  const formatPhrase=(phrase)=>{
   if(!phraseHasContext(field,run,phrase))return false;
   const range=phraseRange(run,phrase,field.position);if(!range||field.getValue([range.start,range.end],'latex')===phrase.latex)return false;
   if(deletion&&field._mathfield.canUndo())field._mathfield.popUndoStack();
   field.selection={ranges:[[range.start,range.end]]};field.executeCommand(['insert',phrase.latex,{format:'latex',mode:'math',selectionMode:phrase.template?'placeholder':'after'}]);
   if(phrase.template){pendingTemplateSpace=true;field._mathfield.model.mode='math';}else{field.notePhraseSource(phrase);field.position+=range.trailing;field.mode='math';}
   return true;
  };
  const formatOperator=()=>{
   const trailing=run.text.length-run.text.trimEnd().length;
   if(!operator||!trailing&&word===word.toLowerCase()&&hasPendingPhrase(run.text,field.notationGroups,field.customDictionaries))return false;
   const end=field.position-trailing,begin=end-word.length;
   if(begin<0||![...word].every((char,index)=>{
    const atom=field._mathfield.model.at(begin+index+1);
    return atom?.type==='mord'&&atom.mode==='math'&&atom.value===char&&!atom.superscript?.length&&!atom.subscript?.length;
   }))return false;
   if(deletion&&field._mathfield.canUndo())field._mathfield.popUndoStack();
   const content=field.getValue([begin,end],'latex');
   field.selection={ranges:[[begin,end]]};
   field.executeCommand(['insert',`\\operatorname{\\mathrm{${content}}}`,{format:'latex',mode:'math',selectionMode:'after'}]);field.position+=trailing;
   return true;
  };
  if(!prose&&!deletion){
   converting=true;field.proseConverting=true;
   try{field.trackAutomaticConversion(run,()=>{if(!formatPhrase(phraseAtEnd(run.text,field.notationGroups,true,field.customDictionaries)))formatOperator();});}finally{converting=false;field.proseConverting=false;}
   // A completed numeric trigger (e.g. tensor2) can finish after its letter
   // prefix was provisionally prose. Let the following boundary expand it.
   if(match&&field.selectionIsCollapsed)field._mathfield.model.mode='math';
   return;
  }
  let replaced=false;
  // Keep LaTeX style wrappers while changing the literal run to text. No
  // serialized whole-page replacement, so surrounding math stays untouched.
  converting=true;field.proseConverting=true;
  try{
   if(prose?run.hasMath:run.hasText){
    const cursor=run.cursor;
    const latex=prose?null:
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
    field.executeCommand(['insert',prose?run.text:latex,{format:prose?'text':'latex',mode:prose?'text':'math',selectionMode:'after'}]);
    if(prose){
     const end=field.position;
     for(let i=0;i<run.styles.length;){
      let j=i+1;while(j<run.styles.length&&JSON.stringify(run.styles[i])===JSON.stringify(run.styles[j]))j++;
      if(Object.keys(run.styles[i]).length){field.selection={ranges:[[run.start+i,run.start+j]]};field.applyStyle(run.styles[i],{operation:'set'});}
      i=j;
     }
     field.position=end;
    }
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
   if(deletion&&!prose){if(!formatPhrase(phraseAtEnd(run.text.trimEnd(),field.notationGroups,true,field.customDictionaries)))formatOperator();}
  }finally{converting=false;field.proseConverting=false;}
 });
 field.addEventListener('keydown',event=>{
  if(!['auto','math'].includes(field.pageInputMode)||field.isProseLine?.()||event.metaKey||event.ctrlKey||event.altKey||event.isComposing||field.mode==='latex')return;
  if(pendingTemplateSpace){pendingTemplateSpace=false;if(event.key===' '){event.preventDefault();event.stopImmediatePropagation();return;}}
  // Alphabetic shortcuts must wait for a word boundary: "in" must not become
  // a membership symbol while someone is still typing "inline".
  if(field.mode==='math'&&field.selectionIsCollapsed&&
   (event.key==='Enter'||event.key.length===1&&!/[A-Za-z`]/.test(event.key))){
   const run=connectedRun(field),word=run.text.match(/[A-Za-z]+$/)?.[0];
   const match=phraseAtEnd(run.text,field.notationGroups,false,field.customDictionaries);
   const phrase=(field.pageInputMode==='math'||explicitMath||!looksLikeProse(run.classificationText,field.notationGroups,field.customDictionaries))&&match&&phraseHasContext(field,run,match)&&(!hasPendingPhrase(run.text,field.notationGroups,field.customDictionaries)||match.text===run.text.trim().toLowerCase())&&match;
   const range=phrase&&phraseRange(run,phrase,field.position);
   if(range&&field.getValue([range.start,range.end],'latex')!==phrase.latex){
    converting=true;field.proseConverting=true;
    try{field.trackAutomaticConversion(run,()=>{field.selection={ranges:[[range.start,range.end]]};field.executeCommand(['insert',phrase.latex,{format:'latex',mode:'math',selectionMode:phrase.template?'placeholder':'after'}]);if(!phrase.template)field.notePhraseSource(phrase);});}finally{converting=false;field.proseConverting=false;}
    if(phrase.template&&event.key===' '){event.preventDefault();event.stopImmediatePropagation();return;}
   }
   const shortcut=!hasPendingPhrase(run.text,field.notationGroups,field.customDictionaries)&&word&&vocabulary(field.notationGroups,field.customDictionaries).words.has(word.toLowerCase())&&shortcuts[word];
   if(shortcut&&field.getValue([field.position-word.length,field.position],'plain-text')===word){
    const end=field.position;field.selection={ranges:[[end-word.length,end]]};
    const value=typeof shortcut==='string'?shortcut:shortcut.value,template=value.includes('#?');
    field.trackAutomaticConversion(run,()=>field.executeCommand(['insert',value,{format:'latex',mode:'math',selectionMode:template?'placeholder':'after'}]));
    if(template&&event.key===' '){event.preventDefault();event.stopImmediatePropagation();return;}
   }
  }
  // Forced Math uses the native space/Enter handlers and never switches to prose.
  if(field.pageInputMode==='math')return;
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
   if(!looksLikeProse(connectedRun(field).classificationText,field.notationGroups,field.customDictionaries))field.mode='math';
  }
 },true);
}
