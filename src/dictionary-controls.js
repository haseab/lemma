import {installSymbolPicker} from './symbol-picker.js';
import {notationTemplate,inferNotation} from './notation-templates.js';
import {loadDictionaries,saveDictionaries,validateDictionaries,validateDictionaryEntry,exportDictionaries,importDictionaries,singleDictionary,normalizePhrase,validDictionaryPhrase} from './custom-dictionary.js';
export function installDictionaryControls(container,getField,onMessage=()=>{}){
 const doc=container.ownerDocument;
 let libraries=[],editing=null;
 container.innerHTML='<div class="dictionary-entries"></div><form class="dictionary-form"><label class="dictionary-field">When I type<input name="phrase" aria-label="Phrase" placeholder="e.g. 3x3 matrix" maxlength="80" required></label><section class="dictionary-result" hidden><label class="dictionary-field dictionary-kind">Becomes<select name="notation" aria-label="Notation type"><option value="symbol">Symbol</option><option value="matrix">Matrix or vector</option><option value="fraction">Fraction</option><option value="root">Root</option><option value="power">Power</option><option value="absolute">Absolute value</option><option value="binomial">Binomial coefficient</option></select></label><div class="dictionary-matrix" hidden><label>Rows<input type="number" name="rows" aria-label="Rows" min="1" max="10" value="3"></label><label>Columns<input type="number" name="columns" aria-label="Columns" min="1" max="10" value="3"></label><label>Brackets<select name="fence" aria-label="Matrix brackets"><option value="pmatrix">( )</option><option value="bmatrix">[ ]</option><option value="Bmatrix">{ }</option><option value="vmatrix">| |</option><option value="Vmatrix">‖ ‖</option><option value="matrix">None</option></select></label></div><label class="dictionary-root" hidden>Root index<input type="number" name="rootIndex" aria-label="Root index" min="2" max="12" value="2"></label><div class="dictionary-target"><input name="latex" aria-label="Symbol or LaTeX" placeholder="Symbol, e.g. ∈ or ∑" maxlength="500" required><button type="button" class="dictionary-symbol-picker" aria-expanded="false" aria-label="Choose a symbol">Symbols</button></div><div class="dictionary-symbols" hidden aria-label="Math symbols"></div><div class="dictionary-preview" hidden><span>Preview</span><math-field read-only aria-label="Notation preview" tabindex="-1"></math-field></div><details class="dictionary-options"><summary>Options</summary><label class="dictionary-context" title="Only expand this phrase after a mathematical operand, such as x."><input name="context" type="checkbox" checked>Only after math</label></details><div class="dictionary-submit" hidden><button type="submit">Add phrase</button><button type="button" data-cancel-entry hidden>Cancel</button></div></section></form><p class="dictionary-error" role="alert" hidden></p><details class="dictionary-transfer"><summary>More</summary><div class="dictionary-files"><button type="button" data-import>Import JSON</button><button type="button" data-export>Export JSON</button><input type="file" accept=".json,application/json" hidden></div><p class="dictionary-note">Stored locally. Imported phrases are added to your dictionary.</p></details>';
 const form=container.querySelector('form'),phraseInput=form.elements.namedItem('phrase'),target=form.elements.namedItem('latex'),context=form.elements.namedItem('context'),preview=container.querySelector('math-field'),error=container.querySelector('[role=alert]');
 preview.readOnly=true;preview.mathVirtualKeyboardPolicy='manual';
 const kind=form.elements.namedItem('notation'),rows=form.elements.namedItem('rows'),columns=form.elements.namedItem('columns'),fence=form.elements.namedItem('fence'),rootIndex=form.elements.namedItem('rootIndex');
 let suggested='',lastInference='',manualKind=false;
 const inferenceKey=text=>JSON.stringify(inferNotation(text));
 const definition=()=>kind.value==='symbol'?null:notationTemplate({kind:kind.value,rows:Number(rows.value),columns:Number(columns.value),fence:fence.value,index:Number(rootIndex.value)}).notation;
 const entryValue=()=>({text:phraseInput.value||'preview',latex:target.value,notation:definition(),context:context.checked});
 let symbolsOpen=false;
 const picker=container.querySelector('.dictionary-symbol-picker'),symbolList=container.querySelector('.dictionary-symbols');
 symbolList.id='dictionary-symbols';picker.setAttribute('aria-controls',symbolList.id);
 const symbolPicker=installSymbolPicker(symbolList,symbol=>{target.value=symbol;symbolsOpen=false;updatePreview();target.focus();},()=>{symbolsOpen=false;updatePreview();picker.focus();});
 picker.onclick=()=>{symbolsOpen=!symbolsOpen;symbolList.hidden=!symbolsOpen;picker.setAttribute('aria-expanded',String(symbolsOpen));if(symbolsOpen)symbolPicker.open();};
 function shapeControls(){
  const ready=validDictionaryPhrase(normalizePhrase(phraseInput.value)),structured=kind.value!=='symbol';
  container.querySelector('.dictionary-result').hidden=!ready;
  container.querySelector('.dictionary-matrix').hidden=kind.value!=='matrix';container.querySelector('.dictionary-root').hidden=kind.value!=='root';container.querySelector('.dictionary-target').hidden=structured;
  symbolList.hidden=structured||!symbolsOpen;picker.setAttribute('aria-expanded',String(symbolsOpen&&!structured));
  target.required=ready&&!structured;target.disabled=structured||!ready;for(const input of [rows,columns,fence])input.disabled=!ready||kind.value!=='matrix';rootIndex.disabled=!ready||kind.value!=='root';
  return ready;
 }

 const active=()=>libraries[0];
 const fail=message=>{error.textContent=message;error.hidden=false;};
 const clearError=()=>{error.textContent='';error.hidden=true;};
 function updatePreview(){
  const ready=shapeControls(),hasTarget=kind.value!=='symbol'||!!target.value.trim(),submit=container.querySelector('.dictionary-submit'),options=container.querySelector('.dictionary-options');
  let valid=false;
  clearError();
  try{const entry=validateDictionaryEntry(entryValue());if(ready){preview.value=entry.latex;valid=true;}}
  catch(e){if(ready&&hasTarget)fail(e.message);}
  preview.hidden=!valid;container.querySelector('.dictionary-preview').hidden=!valid;
  if(!valid)preview.value='';
  submit.hidden=!ready||!hasTarget;form.querySelector('[type=submit]').disabled=!valid;options.hidden=!valid;
 }
 function resetForm(){editing=null;suggested='';lastInference='';manualKind=false;symbolsOpen=false;form.reset();symbolPicker.reset();container.querySelector('.dictionary-options').open=false;context.checked=true;form.querySelector('[type=submit]').textContent='Add phrase';container.querySelector('[data-cancel-entry]').hidden=true;updatePreview();}
 function commit(next){
  try{next=validateDictionaries(next);}catch(e){fail(e.message);return false;}
  clearError();libraries=next;
  for(const field of new Set([...doc.querySelectorAll('math-field'),getField()].filter(Boolean)))if(field.setCustomDictionaries)field.setCustomDictionaries(libraries);
  try{saveDictionaries(doc.defaultView.localStorage,libraries);}catch{onMessage('Dictionary changes apply for this session but could not be saved. Export a copy to keep them.');}
  return true;
 }
 function render(){
  const library=active(),entries=container.querySelector('.dictionary-entries');entries.replaceChildren();container.querySelector('[data-export]').disabled=!library.entries.length;
  for(const entry of library.entries){
   const row=doc.createElement('div');row.className='dictionary-entry';
   const toggle=doc.createElement('input');toggle.type='checkbox';toggle.checked=entry.enabled;toggle.setAttribute('aria-label','Enable '+entry.text);
   toggle.onchange=()=>{const next=structuredClone(libraries);next[0].entries.find(e=>e.text===entry.text).enabled=toggle.checked;if(!commit(next))toggle.checked=entry.enabled;};
   const text=doc.createElement('span');text.textContent=entry.text;
   const symbol=doc.createElement('math-field');symbol.readOnly=true;symbol.setAttribute('read-only','');symbol.tabIndex=-1;symbol.setAttribute('aria-label',entry.latex);symbol.mathVirtualKeyboardPolicy='manual';symbol.value=entry.latex;
   const edit=doc.createElement('button');edit.type='button';edit.textContent='Edit';edit.onclick=()=>{editing=entry.text;lastInference=inferenceKey(entry.text);manualKind=true;phraseInput.value=entry.text;target.value=entry.notation?'':entry.latex;kind.value=entry.notation?.kind||'symbol';rows.value=entry.notation?.rows||3;columns.value=entry.notation?.columns||3;fence.value=entry.notation?.fence||'pmatrix';rootIndex.value=entry.notation?.index||2;context.checked=entry.context;form.querySelector('[type=submit]').textContent='Save phrase';container.querySelector('[data-cancel-entry]').hidden=false;updatePreview();phraseInput.focus();};
   const remove=doc.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Delete '+entry.text);remove.onclick=()=>{const next=structuredClone(libraries),l=next[0];l.entries=l.entries.filter(e=>e.text!==entry.text);if(commit(next)){if(editing===entry.text)resetForm();render();}};
   row.append(toggle,text,symbol,edit,remove);entries.append(row);
  }
 }
 function refresh(){
  let previous;try{previous=validateDictionaries(getField()?.customDictionaries||loadDictionaries(doc.defaultView.localStorage));}catch{previous=[];}
  const merged=singleDictionary(previous);
  if(JSON.stringify(previous)!==JSON.stringify(merged)){
   // Keep a local copy of the old library organization during this migration.
   if(previous.length)try{const storage=doc.defaultView.localStorage,key='lemma.dictionaries.before-single.v1';if(!storage.getItem(key))storage.setItem(key,exportDictionaries(previous));}catch{/* Session choices still apply if storage is unavailable. */}
   commit(merged);
  }else libraries=merged;
  clearError();container.querySelector('.dictionary-transfer').open=false;resetForm();render();
 }
 form.onsubmit=event=>{event.preventDefault();try{const entry=validateDictionaryEntry({...entryValue(),text:phraseInput.value,enabled:active()?.entries.find(e=>e.text===editing)?.enabled??true});const next=structuredClone(libraries),library=next[0];if(!library)return;const index=library.entries.findIndex(e=>e.text===editing);if(index>=0)library.entries[index]=entry;else library.entries.push(entry);if(commit(next)){resetForm();render();phraseInput.focus();}}catch(e){fail(e.message);}};
 function suggest(){const text=kind.value==='matrix'?`${rows.value}x${columns.value} matrix`:kind.value==='root'?(Number(rootIndex.value)===2?'square root':Number(rootIndex.value)===3?'cube root':`${rootIndex.value} root`):({fraction:'fraction',power:'power',absolute:'absolute value',binomial:'binomial coefficient'}[kind.value]||'');if(!phraseInput.value||phraseInput.value===suggested){phraseInput.value=text;suggested=text;}}
 kind.onchange=()=>{symbolsOpen=false;context.checked=kind.value==='symbol';suggest();manualKind=true;lastInference=inferenceKey(phraseInput.value);updatePreview();};
 for(const control of [rows,columns,fence,rootIndex])control.onchange=control.oninput=()=>{suggest();updatePreview();};
 phraseInput.oninput=()=>{
  const inferred=inferNotation(phraseInput.value),key=JSON.stringify(inferred);
  if(inferred&&(key!==lastInference||kind.value!==inferred.kind)){
   kind.value=inferred.kind;if(inferred.rows!==undefined)rows.value=inferred.rows;if(inferred.columns!==undefined)columns.value=inferred.columns;if(inferred.index!==undefined)rootIndex.value=inferred.index;
   context.checked=false;symbolsOpen=false;manualKind=false;
  }else if(!inferred&&!manualKind&&lastInference){kind.value='symbol';context.checked=true;}
  lastInference=key;updatePreview();
 };

 target.oninput=updatePreview;container.querySelector('[data-cancel-entry]').onclick=()=>{clearError();resetForm();};
 const file=container.querySelector('[type=file]');container.querySelector('[data-import]').onclick=()=>file.click();
 file.onchange=async()=>{try{const picked=file.files?.[0];if(!picked)return;if(picked.size>2_000_000)throw new Error('Choose a dictionary file smaller than 2 MB.');const incoming=singleDictionary(importDictionaries(await picked.text()))[0].entries;const next=structuredClone(libraries);next[0].entries.push(...incoming);if(commit(next)){resetForm();render();}}catch(e){fail(e.message);}finally{file.value='';}};
 container.querySelector('[data-export]').onclick=()=>{const url=doc.defaultView.URL.createObjectURL(new doc.defaultView.Blob([exportDictionaries(libraries)],{type:'application/json'}));const a=doc.createElement('a');a.href=url;a.download='lemma-dictionaries.json';a.click();doc.defaultView.setTimeout(()=>doc.defaultView.URL.revokeObjectURL(url),1000);};
 return {refresh};
}
