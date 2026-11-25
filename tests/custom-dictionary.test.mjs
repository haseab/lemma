import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {validateDictionaryEntry,validateDictionaries,loadDictionaries,saveDictionaries,exportDictionaries,importDictionaries,dictionaryPhrases,singleDictionary} from '../src/custom-dictionary.js';
import {vocabulary} from '../src/math-words.js';
import {installNotationControl} from '../src/notation-controls.js';
const libraries=()=>[{id:'example-library',name:'Example notation',enabled:true,entries:[{text:'belongs here',latex:'\\in',context:true,enabled:true},{text:'sample ratio',latex:'\\frac{a}{b}',context:false,enabled:true}]}];
test('custom dictionaries validate, round trip locally and as files, and recover malformed storage',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 const saved=saveDictionaries(storage,libraries());assert.deepEqual(loadDictionaries(storage),saved);assert.deepEqual(importDictionaries(exportDictionaries(saved)),saved);
 assert.deepEqual(validateDictionaryEntry({text:'  Belongs   Here ',latex:'∈'}),{text:'belongs here',latex:'∈',context:true,enabled:true});
 for(const raw of ['bad','{}','[{"id":"bad"}]']){data.set('lemma.dictionaries.v1',raw);assert.deepEqual(loadDictionaries(storage),[]);}
 for(const raw of ['{}','bad',JSON.stringify({version:2,libraries:[]})])assert.throws(()=>importDictionaries(raw));
});
test('custom definitions reject malformed targets, duplicate phrases and unreasonable file sizes',()=>{
 for(const entry of [{text:'a',latex:'x'},{text:'a.*',latex:'x'},{text:'example phrase',latex:'\\unknowncommand'},{text:'example phrase',latex:'\\frac{'},{text:'example phrase',latex:'\\htmlData{x=y}{z}'},{text:'example phrase',latex:'\\begin{matrix}a\\end{matrix}'}])assert.throws(()=>validateDictionaryEntry(entry));
 const duplicate=libraries();duplicate[0].entries.push({...duplicate[0].entries[0]});assert.throws(()=>validateDictionaries(duplicate),/unique/);
 assert.throws(()=>importDictionaries(' '.repeat(2000001)),/2 MB/);
});
test('custom entries take precedence, toggle independently, and do not alter built-in dictionaries',()=>{
 const custom=libraries();custom[0].entries.push({text:'pi',latex:'\\partial',enabled:true,context:false});
 assert.equal(vocabulary(undefined,custom).phrases.find(p=>p.text==='pi').target,'\\partial');assert.equal(vocabulary().phrases.find(p=>p.text==='pi').latex,'\\pi');
 custom[0].entries[2].enabled=false;assert.equal(vocabulary(undefined,custom).phrases.find(p=>p.text==='pi').latex,'\\pi');
 custom[0].enabled=false;assert.equal(dictionaryPhrases(custom).length,0);assert.equal(dictionaryPhrases(custom,true).length,3);
});
test('compact notation settings create, edit, toggle, validate and delete dictionary entries',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 let applied=[];const field={customDictionaries:[],setCustomDictionaries(value){this.customDictionaries=value;applied.push(value);}};
 const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 assert(!dialog.querySelector('[role=tab]'));assert(!dialog.querySelector('#notation-custom').hidden);assert(!dialog.querySelector('#notation-builtins').open);
 const area=dialog.querySelector('#notation-custom');assert.equal(field.customDictionaries.length,1);assert(!area.querySelector('[data-create]'));assert(!area.querySelector('[aria-label=\"Dictionary\"]'));
 const form=area.querySelector('form'),phrase=form.elements.namedItem('phrase'),target=form.elements.namedItem('latex');
 phrase.value='belongs here';target.value='\\in';target.dispatchEvent(new host.Event('input'));assert.equal(area.querySelector('math-field').value,'\\in');
 form.dispatchEvent(new host.Event('submit',{cancelable:true}));assert.equal(field.customDictionaries[0].entries[0].text,'belongs here');assert.equal(field.customDictionaries[0].entries[0].context,true);
 assert.equal(loadDictionaries(host.localStorage)[0].name,'My dictionary');
 area.querySelector('.dictionary-entry button').click();target.value='∈';form.dispatchEvent(new host.Event('submit',{cancelable:true}));assert.equal(field.customDictionaries[0].entries[0].latex,'∈');
 const toggle=area.querySelector('.dictionary-entry input');toggle.checked=false;toggle.dispatchEvent(new host.Event('change'));assert.equal(field.customDictionaries[0].entries[0].enabled,false);
 phrase.value='broken phrase';target.value='\\unknowncommand';form.dispatchEvent(new host.Event('submit',{cancelable:true}));assert(!area.querySelector('[role=alert]').hidden);assert.equal(field.customDictionaries[0].entries.length,1);
 area.querySelector('.dictionary-entry button[aria-label^=Delete]').click();assert.equal(field.customDictionaries.length,1);assert.equal(field.customDictionaries[0].entries.length,0);assert(!form.hidden);assert(applied.length>3);
 dialog.close();await host.happyDOM.close();
});

test('notation builders serialize validated dimensions and numeric phrases without requiring source code',()=>{
 const entry=validateDictionaryEntry({text:'3x3 matrix',notation:{kind:'matrix',rows:3,columns:3,fence:'bmatrix'},context:false});
 assert.match(entry.latex,/\\begin\{bmatrix\}/);assert.equal((entry.latex.match(/#\?/g)||[]).length,9);assert.equal(entry.context,false);
 const library=[{id:'matrices',name:'Matrices',entries:[entry]}];const restored=importDictionaries(exportDictionaries(library));assert.deepEqual(restored[0].entries[0],entry);
 const phrase=dictionaryPhrases(restored)[0];assert(phrase.template);assert.equal(phrase.latex,entry.latex);assert(!phrase.latex.startsWith('\\mathord'));
 for(const text of ['3×3 matrix','3 by 3 matrix','tensor 2'])assert.equal(validateDictionaryEntry({text,latex:'∈'}).text,text);
 for(const notation of [{kind:'matrix',rows:0,columns:3},{kind:'matrix',rows:3,columns:11},{kind:'matrix',rows:3,columns:3,fence:'unknown'},{kind:'root',index:0},{kind:'unknown'}])assert.throws(()=>validateDictionaryEntry({text:'sample notation',notation}));
});

test('dictionary form recognizes a matrix phrase and exposes dimensions, brackets and a live preview',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const field={customDictionaries:[],setCustomDictionaries(value){this.customDictionaries=value;}};const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 const area=dialog.querySelector('#notation-custom');const form=area.querySelector('form'),phrase=form.elements.namedItem('phrase');
 phrase.value='3x3 matrix';phrase.dispatchEvent(new host.Event('input'));assert.equal(form.elements.namedItem('notation').value,'matrix');assert.equal(form.elements.namedItem('rows').value,'3');assert.equal(form.elements.namedItem('columns').value,'3');assert(!area.querySelector('.dictionary-matrix').hidden);assert.equal(form.elements.namedItem('context').checked,false);assert.match(area.querySelector('math-field').value,/\\begin\{pmatrix\}/);
 form.elements.namedItem('fence').value='bmatrix';form.elements.namedItem('fence').dispatchEvent(new host.Event('change'));form.dispatchEvent(new host.Event('submit',{cancelable:true}));const entry=field.customDictionaries[0].entries[0];assert.equal(entry.notation.rows,3);assert.equal(entry.notation.columns,3);assert.equal(entry.notation.fence,'bmatrix');
 area.querySelector('.dictionary-entry button').click();assert.equal(form.elements.namedItem('notation').value,'matrix');assert.equal(form.elements.namedItem('fence').value,'bmatrix');assert(form.elements.namedItem('latex').disabled);
 dialog.close();await host.happyDOM.close();
});

test('single dictionary migration preserves all entries and disabled states',()=>{
 const older=libraries();older.push({id:'other',name:'Other notation',enabled:false,entries:[{text:'custom symbol',latex:'∂',enabled:true,context:false}]});
 const merged=singleDictionary(older);assert.equal(merged.length,1);assert.equal(merged[0].entries.length,3);assert.equal(merged[0].entries[2].enabled,false);assert.equal(merged[0].entries[0].enabled,true);assert.deepEqual(singleDictionary(merged),merged);assert.equal(singleDictionary([])[0].entries.length,0);
});
test('opening dictionary settings merges existing libraries and keeps a local migration backup',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const older=libraries();older[0].enabled=false;const field={customDictionaries:older,setCustomDictionaries(value){this.customDictionaries=value;}};
 const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();assert.equal(field.customDictionaries.length,1);assert.equal(field.customDictionaries[0].entries.length,2);assert(field.customDictionaries[0].entries.every(e=>!e.enabled));assert.deepEqual(importDictionaries(host.localStorage.getItem('lemma.dictionaries.before-single.v1')),older);
 assert(!dialog.querySelector('[data-remove-library]'));assert(!dialog.querySelector('[data-create]'));assert.equal(dialog.querySelector('#notation-custom').getAttribute('aria-label'),'My dictionary');dialog.close();await host.happyDOM.close();
});

test('dictionary editor progressively reveals notation, symbols, preview and secondary controls',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const field={customDictionaries:[],setCustomDictionaries(value){this.customDictionaries=value;}};const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 const area=dialog.querySelector('#notation-custom'),form=area.querySelector('form'),phrase=form.elements.namedItem('phrase'),target=form.elements.namedItem('latex');
 const result=area.querySelector('.dictionary-result'),submit=area.querySelector('.dictionary-submit'),options=area.querySelector('.dictionary-options'),preview=area.querySelector('.dictionary-preview'),symbols=area.querySelector('.dictionary-symbols');
 assert(result.hidden);assert(submit.hidden);assert(preview.hidden);assert(options.hidden);assert(!area.querySelector('.dictionary-transfer').open);assert(target.disabled);
 phrase.value='custom membership';phrase.dispatchEvent(new host.Event('input'));assert(!result.hidden);assert(!area.querySelector('.dictionary-target').hidden);assert(symbols.hidden);assert(submit.hidden);assert(preview.hidden);assert(!target.disabled);
 const picker=area.querySelector('.dictionary-symbol-picker');picker.click();assert(!symbols.hidden);assert.equal(picker.getAttribute('aria-expanded'),'true');symbols.querySelector('button').click();assert.equal(target.value,'∈');assert(symbols.hidden);assert(!submit.hidden);assert(!preview.hidden);assert(!options.hidden);assert(!options.open);assert(!form.querySelector('[type=submit]').disabled);
 target.value='\\unknowncommand';target.dispatchEvent(new host.Event('input'));assert(form.querySelector('[type=submit]').disabled);assert(preview.hidden);assert(!area.querySelector('[role=alert]').hidden);
 target.value='';target.dispatchEvent(new host.Event('input'));assert(submit.hidden);assert(options.hidden);assert(preview.hidden);
 phrase.value='3x3 matrix';phrase.dispatchEvent(new host.Event('input'));assert(!area.querySelector('.dictionary-matrix').hidden);assert(area.querySelector('.dictionary-target').hidden);assert(symbols.hidden);assert(!preview.hidden);assert(!submit.hidden);assert(!options.open);
 phrase.value='';phrase.dispatchEvent(new host.Event('input'));assert(result.hidden);assert(submit.hidden);assert(target.disabled);
 dialog.close();await host.happyDOM.close();
});

test('notation keyword inference is exact, dimension aware and supports common structures',async()=>{
 const {inferNotation}=await import('../src/notation-templates.js');
 for(const [text,expected] of [['fraction',{kind:'fraction'}],['my absolute value',{kind:'absolute'}],['power',{kind:'power'}],['binomial coefficient',{kind:'binomial'}],['vector',{kind:'matrix',rows:3,columns:1}],['4d row vector',{kind:'matrix',rows:1,columns:4}],['2 by 5 matrix',{kind:'matrix',rows:2,columns:5}],['cube root',{kind:'root',index:3}],['5th root',{kind:'root',index:5}],['fraction changed to matrix',{kind:'matrix',rows:3,columns:3}]])assert.deepEqual(inferNotation(text),expected,text);
 for(const text of ['refraction','empowered','my notation'])assert.equal(inferNotation(text),null,text);
});
test('editing a trigger anticipates its notation and rechecks the type on phrase edits while allowing manual overrides',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const field={customDictionaries:[],setCustomDictionaries(value){this.customDictionaries=value;}};const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 const form=dialog.querySelector('#notation-custom form'),phrase=form.elements.namedItem('phrase'),kind=form.elements.namedItem('notation');
 const type=text=>{phrase.value=text;phrase.dispatchEvent(new host.Event('input'));};
 type('3x3 matrix');assert.equal(kind.value,'matrix');type('fraction');assert.equal(kind.value,'fraction');assert(dialog.querySelector('.dictionary-matrix').hidden);assert.match(dialog.querySelector('.dictionary-preview math-field').value,/\\frac/);
 kind.value='root';kind.dispatchEvent(new host.Event('change'));assert.equal(kind.value,'root');type('fraction example');assert.equal(kind.value,'fraction');
 type('column vector');assert.equal(kind.value,'matrix');assert.equal(form.elements.namedItem('rows').value,'3');assert.equal(form.elements.namedItem('columns').value,'1');
 type('absolute value');assert.equal(kind.value,'absolute');type('power');assert.equal(kind.value,'power');type('custom notation');assert.equal(kind.value,'symbol');
 type('cube root');assert.equal(form.elements.namedItem('rootIndex').value,'3');form.dispatchEvent(new host.Event('submit',{cancelable:true}));dialog.querySelector('.dictionary-entry button').click();type('fraction');assert.equal(kind.value,'fraction');form.dispatchEvent(new host.Event('submit',{cancelable:true}));assert.equal(field.customDictionaries[0].entries[0].notation.kind,'fraction');
 dialog.close();await host.happyDOM.close();
});

test('correcting a matrix trigger to power of 2 replaces stale matrix controls and preview',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const field={customDictionaries:[],setCustomDictionaries(value){this.customDictionaries=value;}};const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 const form=dialog.querySelector('#notation-custom form'),phrase=form.elements.namedItem('phrase'),kind=form.elements.namedItem('notation');
 const type=text=>{phrase.value=text;phrase.dispatchEvent(new host.Event('input'));};
 type('3x3 matrix');assert.equal(kind.value,'matrix');assert(!dialog.querySelector('.dictionary-matrix').hidden);
 type('power of 2');assert.equal(kind.value,'power');assert(dialog.querySelector('.dictionary-matrix').hidden);assert.match(dialog.querySelector('.dictionary-preview math-field').value,/\^/);assert(!dialog.querySelector('.dictionary-preview math-field').value.includes('pmatrix'));
 // A manual choice applies now; the next text edit must recheck even the same keyword.
 kind.value='matrix';kind.dispatchEvent(new host.Event('change'));assert.equal(kind.value,'matrix');type('power of 3');assert.equal(kind.value,'power');assert(dialog.querySelector('.dictionary-matrix').hidden);
 form.dispatchEvent(new host.Event('submit',{cancelable:true}));assert.equal(field.customDictionaries[0].entries[0].notation.kind,'power');assert.equal(field.customDictionaries[0].entries[0].text,'power of 3');
 dialog.close();await host.happyDOM.close();
});
