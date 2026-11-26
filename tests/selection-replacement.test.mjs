import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const browser=new Window({url:'http://localhost/'});
for(const key of ['UIEvent','CSSStyleSheet','ShadowRoot','DocumentFragment','HTMLButtonElement','HTMLTextAreaElement','HTMLInputElement','PointerEvent','MouseEvent','Range','Selection','window','document','HTMLElement','customElements','navigator','MutationObserver','ResizeObserver','getComputedStyle','DOMRect','DOMParser','Event','CustomEvent','InputEvent','KeyboardEvent','Node','Element','requestAnimationFrame','cancelAnimationFrame','location','CSS','HTMLSlotElement','HTMLSpanElement','HTMLDivElement','HTMLStyleElement']){
 if(browser[key]!==undefined)Object.defineProperty(globalThis,key,{configurable:true,value:typeof browser[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?browser[key].bind(browser):browser[key]});
}
document.fonts={ready:Promise.resolve(),check:()=>true,load:async()=>[]};
const {createPageMathfield,MathfieldElement}=await import('../src/page-editor.js');
const {installPageHistory}=await import('../src/history.js');
const {replacementPosition}=await import('../src/selection-replacement.js');
const {convertLatexToMathMl}=await import('mathlive/ssr');
MathfieldElement.fontsDirectory=null;MathfieldElement.soundsDirectory=null;
after(()=>browser.happyDOM.abort());
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
function scratch(latex='x+\\frac{f_e}{q}+y'){
 const container=document.createElement('div');document.body.append(container);
 const f=createPageMathfield(container,latex,()=>{});installPageHistory(f);
 return f;
}
function selectNumerator(f){
 const model=f._mathfield.model,leaf=Array.from({length:f.lastOffset+1},(_,i)=>model.at(i)).find(atom=>atom?.value==='f');
 const fraction=leaf.parent;assert.equal(fraction.type,'genfrac');
 const body=fraction.above;f.selection={ranges:[[model.offsetOf(body[0]),model.offsetOf(body.at(-1))]]};
}
function shortcut(f,options={}){
 const event=new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true,composed:true,cancelable:true,...options});
 f.shadowRoot.querySelector('[part=keyboard-sink]').dispatchEvent(event);return event;
}
const popup=()=>document.querySelector('.selection-replacement');
function enter(source,inputType='insertText'){
 const input=popup().querySelector('textarea');input.value=source;input.dispatchEvent(new InputEvent('input',{inputType,bubbles:true}));
}
function key(value,options={}){const event=new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options});popup().querySelector('textarea').dispatchEvent(event);return event;}
function dispose(f){popup()?.querySelector('[data-cancel]').click();f.pageHistory.dispose();f.parentElement.remove();}

test('selection replacement is anchored above its target and clamped or flipped at viewport edges',()=>{
 const target={left:200,top:300,bottom:330,width:50};
 assert.deepEqual(replacementPosition(target,{width:380,height:150},{width:1000,height:700}),{left:200,top:140,placement:'above',width:380,arrow:25});
 const edge=replacementPosition({left:990,top:10,bottom:40,width:20},{width:380,height:150},{width:1000,height:700});assert.equal(edge.left,608);assert.equal(edge.placement,'below');assert.equal(edge.top,50);
 const narrow=replacementPosition(target,{width:380,height:150},{width:320,height:400});assert.equal(narrow.width,296);assert.equal(narrow.left,12);assert(narrow.top>=12);
});
test('Cmd+K previews natural language without changing the page and replaces only the selected numerator in one undo step',async()=>{
 const f=scratch();try{
  selectNumerator(f);const selection=structuredClone(f.selection),original=f.value;
  assert(shortcut(f).defaultPrevented);assert(popup());assert.equal(popup().getAttribute('aria-modal'),'false');assert(popup().querySelector('[data-submit]').disabled);
  enter('vector capital G sub i');await settle();const preview=popup().querySelector('math-field');assert(preview.value.includes('\\vec'));assert(preview.value.includes('G'));assert.equal(f.value,original);assert.deepEqual(f.selection,selection);
  assert(key('Enter').defaultPrevented);await settle();assert(!popup());assert.match(f.value,/x\+\\frac\{\\vec\{G_\{?i\}?\}\}\{q\}\+y/);assert.equal(f.errors.length,0);
  const replaced=f.value;f.pageHistory.undo();assert.equal(convertLatexToMathMl(f.value),convertLatexToMathMl(original));f.pageHistory.redo();assert.equal(convertLatexToMathMl(f.value),convertLatexToMathMl(replaced));
 }finally{dispose(f);}
});
test('pasted and dictated replacement previews use lowercase defaults and Enter submits the same result',async()=>{
 for(const inputType of ['insertFromPaste','insertReplacementText']){
  const f=scratch();try{
   selectNumerator(f);shortcut(f);enter('X squared plus capital Y',inputType);await settle();const preview=popup().querySelector('math-field').value;assert.match(preview,/x\^\{?2\}?\+\s*Y/);key('Enter');await settle();assert.match(f.value,/\\frac\{x\^\{?2\}?\+\s*Y\}\{q\}/);assert.equal(f.errors.length,0);
  }finally{dispose(f);}
 }
});
test('Escape preserves the content and selected range while outside clicks dismiss without applying',async()=>{
 const f=scratch();try{
  selectNumerator(f);const selection=structuredClone(f.selection),original=f.value;shortcut(f);enter('z plus 3');assert(key('Escape').defaultPrevented);await settle();assert(!popup());assert.equal(f.value,original);assert.deepEqual(f.selection,selection);
  shortcut(f);enter('z plus 3');document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));assert(!popup());assert.equal(f.value,original);assert(!f.pageHistory.canUndo);
 }finally{dispose(f);}
});
test('collapsed, read-only and composing shortcuts do not open a replacement editor',()=>{
 const f=scratch();try{
  f.position=-1;assert(!shortcut(f).defaultPrevented);assert(!popup());selectNumerator(f);f.readOnly=true;assert(!shortcut(f).defaultPrevented);assert(!popup());f.readOnly=false;assert(!shortcut(f,{isComposing:true}).defaultPrevented);assert(!popup());
 }finally{dispose(f);}
});
test('stale pages, field disposal and empty drafts cannot replace content',async()=>{
 const f=scratch();try{
  selectNumerator(f);const original=f.value;shortcut(f);key('Enter');assert(popup());assert.equal(f.value,original);enter('z');
  f.value='a+b';key('Enter');assert(!popup());assert.equal(f.value,'a+b');
  f.selection={ranges:[[0,f.lastOffset]]};shortcut(f);assert(popup());f.parentElement.remove();await settle();assert(!popup());
 }finally{dispose(f);}
});
test('composition Enter never submits an unfinished replacement',async()=>{
 const f=scratch();try{
  selectNumerator(f);const original=f.value;shortcut(f);const input=popup().querySelector('textarea');input.dispatchEvent(new Event('compositionstart'));enter('z');key('Enter');assert(popup());assert.equal(f.value,original);input.dispatchEvent(new Event('compositionend'));key('Enter');await settle();assert(!popup());assert.notEqual(f.value,original);
 }finally{dispose(f);}
});

test('replacement recognition ignores dictation commas while preserving the complete draft input',async()=>{
 for(const inputType of ['insertText','insertFromPaste','insertReplacementText']){
  const f=scratch();try{
   selectNumerator(f);const original=f.value;shortcut(f);const source='Vector, capital, F, sub, e.';enter(source,inputType);await settle();
   assert.equal(popup().querySelector('textarea').value,source);
   assert.match(popup().querySelector('math-field').value,/\\vec\{F_\{?e\}?\}/);assert.equal(f.value,original);
   key('Enter');await settle();assert(!popup());assert.match(f.value,/\\vec\{F_\{?e\}?\}/);assert.equal(f.errors.length,0);
  }finally{dispose(f);}
 }
});

test('hovering a selected numerator exposes Edit without moving the selection or changing content',async()=>{
 const f=scratch();try{
  selectNumerator(f);await settle();const original=f.value,selected=structuredClone(f.selection),model=f._mathfield.model;
  const atom=model.findAtom(atom=>atom.value==='f'),element=f._mathfield.getHTMLElement(atom);
  element.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,composed:true,pointerType:'mouse'}));await new Promise(resolve=>setTimeout(resolve,220));
  const tip=document.querySelector('.selection-edit-tip');assert(tip);assert.equal(tip.textContent,'Edit');assert.equal(f.value,original);assert.deepEqual(f.selection,selected);
  tip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));tip.click();await settle();assert(popup());assert(!document.querySelector('.selection-edit-tip'));assert.deepEqual(f.selection,selected);
  enter('vector capital G');key('Enter');await settle();assert.match(f.value,/x\+\\frac\{\\vec\{G\}\}\{q\}\+y/);assert.equal(f.errors.length,0);
 }finally{dispose(f);}
});
test('hover Edit can target an unselected symbol and dismisses on typing or document removal',async()=>{
 const f=scratch();try{
  f.position=-1;await settle();const original=f.value,position=f.position,model=f._mathfield.model,atom=model.findAtom(atom=>atom.value==='q'),element=f._mathfield.getHTMLElement(atom);
  const hover=()=>f._mathfield.getHTMLElement(f._mathfield.model.findAtom(atom=>atom.value==='q')).dispatchEvent(new PointerEvent('pointermove',{bubbles:true,composed:true,pointerType:'mouse'}));
  hover();await new Promise(resolve=>setTimeout(resolve,220));const tip=document.querySelector('.selection-edit-tip');assert(tip);assert.equal(f.position,position);assert.equal(f.value,original);
  tip.click();await settle();assert(popup());assert.equal(f.getValue(f.selection,'latex'),'q');key('Escape');await settle();
  hover();await new Promise(resolve=>setTimeout(resolve,220));assert(document.querySelector('.selection-edit-tip'));f.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'}));assert(!document.querySelector('.selection-edit-tip'));
  hover();await new Promise(resolve=>setTimeout(resolve,220));assert(document.querySelector('.selection-edit-tip'));f.parentElement.remove();await settle();assert(!document.querySelector('.selection-edit-tip'));
 }finally{dispose(f);}
});
test('hover targets preserve vector accents, subscripts and prose words as logical units',async()=>{
 const {hoverEditRange}=await import('../src/selection-edit-tip.js');
 for(const [latex,value,expected]of [['\\frac{\\vec{F_e}}{q}','F','\\vec{F_e}'],['\\frac{\\vec{F_e}}{q}','e','\\vec{F_e}'],['\\frac{F_e}{q}','e','F_e'],['\\text{hello world}','e','\\text{hello}']]){
  const f=scratch(latex);try{
   f.position=-1;await settle();const atom=f._mathfield.model.findAtom(atom=>atom.value===value);let element;for(let candidate=atom;candidate&&!element;candidate=candidate.parent)if(candidate.id)element=f._mathfield.getHTMLElement(candidate);const range=hoverEditRange(f,element);assert(range,`${latex}/${value}`);assert.equal(convertLatexToMathMl(f.getValue(range,'latex')),convertLatexToMathMl(expected));
  }finally{dispose(f);}
 }
});

test('hovering a highlighted partial range retains that exact range even when a larger atom owns its rendered element',async()=>{
 const f=scratch('\\frac{F_e}{q}');try{
  f.focus();
  const model=f._mathfield.model,atom=model.findAtom(atom=>atom.value==='F'),offset=model.offsetOf(atom);f.selection={ranges:[[offset-1,offset]]};await settle();
  // HappyDOM has no layout; provide the highlight rectangle a browser renders.
  if(!f.shadowRoot.querySelector('.ML__selection')){const rectangle=document.createElement('span');rectangle.className='ML__selection';f.shadowRoot.append(rectangle);}
  for(const node of f.shadowRoot.querySelectorAll('.ML__selection'))node.getBoundingClientRect=()=>({left:100,right:120,top:100,bottom:120,width:20,height:20});
  const element=f._mathfield.getHTMLElement(model.findAtom(atom=>atom.type==='genfrac'));assert.equal(f.getValue(f.selection,'latex'),'F');
  element.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,composed:true,pointerType:'mouse',clientX:110,clientY:110}));await new Promise(resolve=>setTimeout(resolve,220));
  assert(document.querySelector('.selection-edit-tip'));document.querySelector('.selection-edit-tip').click();await settle();assert(popup());assert.equal(f.getValue(f.selection,'latex'),'F');
 }finally{dispose(f);}
});

test('selection-overlay hover and pointer release show Edit without an atom in the event path',async()=>{
 const f=scratch();try{
  selectNumerator(f);await settle();const selected=structuredClone(f.selection),original=f.value;
  const overlay=f.shadowRoot.querySelector('.ML__selection')||document.createElement('div');
  overlay.classList.add('ML__selection');if(!overlay.isConnected)f.shadowRoot.append(overlay);
  overlay.getBoundingClientRect=()=>({left:100,right:150,top:100,bottom:130,width:50,height:30});
  for(const type of ['pointermove','pointerup']){
   overlay.dispatchEvent(new PointerEvent(type,{bubbles:true,composed:true,pointerType:'mouse',clientX:120,clientY:115}));
   await new Promise(resolve=>setTimeout(resolve,220));
   assert(document.querySelector('.selection-edit-tip'),type);assert.deepEqual(f.selection,selected);assert.equal(f.value,original);
   f.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  }
 }finally{dispose(f);}
});
test('right-click menu includes Edit, preserves the selection and opens the shared replacement editor',async()=>{
 const f=scratch();try{
  selectNumerator(f);await settle();const selected=structuredClone(f.selection),original=f.value;
  const item=f.menuItems.find(item=>item.id==='edit-expression');assert(item);assert.equal(item.label,'Edit');assert(item.enabled());assert(f.menuItems.length>2);
  f.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));assert.deepEqual(f.selection,selected);
  item.onMenuSelect();assert(popup());assert.equal(f.value,original);enter('z');key('Enter');await settle();assert.match(f.value,/\\frac\{z\}\{q\}/);
  f.position=-1;assert(!item.enabled());f.readOnly=true;assert(!item.enabled());
 }finally{dispose(f);}
});
test('right-click on an unselected symbol resolves its target without replacing the native menu',async()=>{
 const f=scratch();try{
  f.position=-1;await settle();const model=f._mathfield.model,atom=model.findAtom(atom=>atom.value==='q'),element=f._mathfield.getHTMLElement(atom),original=f.value;
  // Call the host capture listener via a host event with a composed symbol path;
  // this avoids invoking MathLive menu layout in the layout-free test DOM.
  const event=new MouseEvent('contextmenu',{cancelable:true});event.composedPath=()=>[element,f];
  f.dispatchEvent(event);assert(!event.defaultPrevented);assert.equal(f.getValue(f.selection,'latex'),'q');assert.equal(f.value,original);
  f.menuItems.find(item=>item.id==='edit-expression').onMenuSelect();assert(popup());key('Escape');
 }finally{dispose(f);}
});
