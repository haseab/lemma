import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {MATH_SYMBOLS,SYMBOL_GROUPS,findSymbols} from '../src/math-symbols.js';
import {validateDictionaryEntry} from '../src/custom-dictionary.js';
import {installSymbolPicker} from '../src/symbol-picker.js';
test('expanded symbol catalogue is unique, categorized, searchable and supported by the editor',()=>{
 assert(MATH_SYMBOLS.length>=250);assert.equal(new Set(MATH_SYMBOLS.map(s=>s.symbol)).size,MATH_SYMBOLS.length);
 for(const entry of MATH_SYMBOLS){assert(SYMBOL_GROUPS.some(g=>g.id===entry.category));assert.doesNotThrow(()=>validateDictionaryEntry({text:'sample symbol',latex:entry.symbol}),entry.label);}
 for(const [query,symbol] of [['for all','∀'],['adjunction','⊣'],['tensor product','⊗'],['omega','Ω'],['subseteq','⊆'],['double integral','∬'],['≤','≤'],['<=','≤'],['probability','ℙ']])assert(findSymbols(query).some(s=>s.symbol===symbol),query);
 assert(findSymbols('', 'greek').every(s=>s.categories.includes('greek')));assert.equal(findSymbols('no matching symbol').length,0);assert.equal(findSymbols().length,22);assert.equal(findSymbols('', 'all').length,MATH_SYMBOLS.length);
});
test('symbol picker searches globally, filters categories, supports keyboard selection and closes with Escape',async()=>{
 const host=new Window({url:'https://example.org/'}),doc=host.document,root=doc.createElement('div');doc.body.append(root);let selected=null,closed=false;
 const picker=installSymbolPicker(root,symbol=>{selected=symbol;},()=>{closed=true;});picker.open();
 const search=root.querySelector('input'),category=root.querySelector('select'),grid=root.querySelector('.symbol-picker-grid');assert.equal(doc.activeElement,search);assert.equal(grid.querySelectorAll('button').length,22);
 search.value='adjunction';search.dispatchEvent(new host.Event('input'));assert.equal(grid.querySelector('button').dataset.symbol,'⊣');search.dispatchEvent(new host.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(selected,'⊣');
 search.value='';category.value='greek';category.dispatchEvent(new host.Event('change'));assert(grid.querySelector('[data-symbol="Ω"]'));assert.equal(grid.querySelectorAll('button[tabindex="0"]').length,1);
 const first=grid.querySelector('button');first.focus();first.dispatchEvent(new host.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,grid.querySelectorAll('button')[1]);assert.equal(grid.querySelectorAll('button[tabindex="0"]').length,1);
 search.value='nothing matches here';search.dispatchEvent(new host.Event('input'));assert.equal(grid.children.length,0);assert.match(root.querySelector('[role=status]').textContent,/No symbols/);
 const escape=new host.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});search.dispatchEvent(escape);assert(escape.defaultPrevented);assert(closed);picker.reset();assert.equal(search.value,'');assert.equal(category.value,'common');await host.happyDOM.close();
});
