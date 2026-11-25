import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {validateLatex} from 'mathlive/ssr';
import {ALL_NOTATION_GROUPS,NOTATION_GROUPS,loadNotationGroups,saveNotationGroups,normalizeGroups} from '../src/math-words.js';
import {installNotationControl} from '../src/notation-controls.js';
test('all groups start enabled, choices persist, and malformed settings recover',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 assert.deepEqual(loadNotationGroups(storage),ALL_NOTATION_GROUPS);saveNotationGroups(storage,['logic','sets','invalid']);assert.deepEqual(loadNotationGroups(storage),['logic','sets']);
 saveNotationGroups(storage,[]);assert.deepEqual(loadNotationGroups(storage),[]);data.set('lemma.notation-groups.v1','bad');assert.deepEqual(loadNotationGroups(storage),ALL_NOTATION_GROUPS);
 assert.deepEqual(normalizeGroups(null),ALL_NOTATION_GROUPS);
});
test('notation control changes the shared editor immediately, persists choices, and supports all on/off',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;
 doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';const field={notationGroups:ALL_NOTATION_GROUPS};
 const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);
 button.click();assert(dialog.open);assert(!dialog.querySelector('[role=tab]'));const builtins=dialog.querySelector('#notation-builtins');assert(!builtins.open);builtins.querySelector('summary').click();assert(builtins.open);assert(!dialog.querySelector('#notation-custom').hidden);const inputs=[...dialog.querySelectorAll('.notation-options input')];assert(inputs.every(input=>input.checked));
 inputs[0].checked=false;inputs[0].dispatchEvent(new host.Event('change',{bubbles:true}));assert(!field.notationGroups.includes('logic'));assert(!loadNotationGroups(host.localStorage).includes('logic'));
 dialog.querySelector('[data-all=off]').click();assert.deepEqual(field.notationGroups,[]);assert.equal(dialog.querySelector('[data-notation-count]').textContent,'Off');dialog.querySelector('[data-all=on]').click();assert.deepEqual(field.notationGroups,ALL_NOTATION_GROUPS);
 dialog.close();await host.happyDOM.close();
});
test('catalogue has unique phrase spellings and every expansion is supported LaTeX',()=>{
 const phrases=NOTATION_GROUPS.flatMap(group=>group.phrases);assert.equal(new Set(phrases.map(p=>p.text)).size,phrases.length);
 for(const phrase of phrases)assert.deepEqual(validateLatex(phrase.latex),[],phrase.text);
});

test('the curated alias catalogue links iff to equivalence with explicit context requirements for ambiguous English',()=>{
 const phrases=NOTATION_GROUPS.flatMap(group=>group.phrases);
 const iff=phrases.find(phrase=>phrase.text==='iff');assert.equal(iff.meaning,'if and only if');assert.equal(iff.latex,'\\iff');
 for(const text of ['there is','there are','is equivalent to'])assert(!phrases.some(phrase=>phrase.text===text),text);
});

test('ambiguous relation aliases explicitly require mathematical context',()=>{
 const phrases=NOTATION_GROUPS.flatMap(group=>group.phrases);
 for(const text of ['is in','at most','no greater than','at least','belongs to'])assert.equal(phrases.find(p=>p.text===text)?.context,true,text);
});

test('each built-in dictionary expands to read-only phrase mappings without changing enabled groups',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document;doc.body.innerHTML='<div class="toolbar"><div class="modes"></div></div>';
 const field={notationGroups:[...ALL_NOTATION_GROUPS],getNotationShortcuts:()=>({sin:'\\sin',log:'\\log_{#?}'})};const {button,dialog}=installNotationControl(doc.querySelector('.toolbar'),()=>field);button.click();
 const categories=[...dialog.querySelectorAll('.builtin-dictionary')];assert.equal(categories.length,NOTATION_GROUPS.length);assert(categories.every(category=>!category.open));assert.equal(dialog.querySelectorAll('.builtin-entry').length,0);
 const logic=categories.find(d=>d.dataset.dictionary==='logic');logic.querySelector('summary').click();await new Promise(resolve=>setTimeout(resolve,5));assert(logic.open);assert.deepEqual(field.notationGroups,ALL_NOTATION_GROUPS);
 const row=[...logic.querySelectorAll('.builtin-entry')].find(row=>row.firstElementChild.textContent==='for all');assert(row);assert.equal(row.querySelector('math-field').value,'\\forall');assert(row.querySelector('math-field').readOnly);assert.equal(row.querySelectorAll('button,input').length,0);
 const toggle=logic.parentElement.querySelector('input');toggle.checked=false;toggle.dispatchEvent(new host.Event('change',{bubbles:true}));assert(logic.open);assert(!field.notationGroups.includes('logic'));assert(!loadNotationGroups(host.localStorage).includes('logic'));
 for(const details of categories){details.open=true;}await new Promise(resolve=>setTimeout(resolve,5));assert(categories.every(d=>d.querySelectorAll('.builtin-entry').length>0));
 const calculus=categories.find(d=>d.dataset.dictionary==='calculus');assert.equal([...calculus.querySelectorAll('.builtin-entry')].find(row=>row.firstElementChild.textContent==='sin').querySelector('math-field').value,'\\sin');
 assert(!dialog.querySelector('#notation-custom').hidden);dialog.close();await host.happyDOM.close();
});

test('built-in inspection includes all phrases, named operators and recognized words without duplicates',async()=>{
 const {builtinEntries}=await import('../src/builtin-dictionaries.js');
 for(const group of NOTATION_GROUPS){const entries=builtinEntries(group,{sin:'\\sin'}),names=entries.map(e=>e.text.toLowerCase());assert.equal(new Set(names).size,names.length,group.id);for(const text of [...group.phrases.map(p=>p.text),...group.words,...group.operators])assert(names.includes(text.toLowerCase()),text);for(const entry of entries)assert.deepEqual(validateLatex(entry.latex),[],entry.text);}
});
