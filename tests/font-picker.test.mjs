import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {FONT_CATALOG,matchingFonts} from '../src/font-catalog.js';
import {Window} from 'happy-dom';
const browser=new Window({url:'http://localhost/'});
for(const key of ['UIEvent','CSSStyleSheet','ShadowRoot','DocumentFragment','HTMLButtonElement','HTMLTextAreaElement','HTMLInputElement','PointerEvent','MouseEvent','Range','Selection','window','document','HTMLElement','customElements','navigator','MutationObserver','ResizeObserver','getComputedStyle','DOMRect','DOMParser','Event','CustomEvent','InputEvent','KeyboardEvent','Node','Element','requestAnimationFrame','cancelAnimationFrame','location','CSS','HTMLSlotElement','HTMLSpanElement','HTMLDivElement','HTMLStyleElement'])if(browser[key]!==undefined)Object.defineProperty(globalThis,key,{configurable:true,value:typeof browser[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?browser[key].bind(browser):browser[key]});
document.fonts={ready:Promise.resolve(),check:()=>true,load:async()=>[]};
const {createPageMathfield,MathfieldElement}=await import('../src/page-editor.js');MathfieldElement.fontsDirectory=null;MathfieldElement.soundsDirectory=null;
const {applyTextFont}=await import('../src/text-fonts.js');
const {installFontPicker}=await import('../src/font-picker.js');
const {installPageHistory}=await import('../src/history.js');
const {validateDocument}=await import('../src/document.js');
const settle=()=>new Promise(resolve=>setTimeout(resolve,45));
const make=(latex=String.raw`\text{A quiet idea}`)=>{const host=document.createElement('div');document.body.append(host);return createPageMathfield(host,latex,()=>{});};
after(async()=>{document.body.replaceChildren();await browser.happyDOM.abort();});
test('all bundled typefaces have unique stable IDs, searchable categories and local font assets',()=>{
 assert.equal(FONT_CATALOG.length,18);assert.equal(new Set(FONT_CATALOG.map(f=>f.id)).size,18);
 for(const category of ['Sans','Serif','Mono','Handwritten'])assert(matchingFonts('',category).length>=2);
 assert.deepEqual(matchingFonts('source serif').map(f=>f.id),['source-serif']);assert.equal(matchingFonts('unknown typeface').length,0);
 const css=readFileSync('src/text-fonts.css','utf8');assert(!/https?:/.test(css));
 for(const [,url]of css.matchAll(/url\("([^\"]+)"\)/g))assert(existsSync('node_modules/'+url),url);
 for(const font of FONT_CATALOG.slice(0))assert.match(font.family,/^[a-zA-Z0-9 -]+$/);
 assert.equal(validateDocument({type:'math-page',latex:'x',textFont:'lora'}).textFont,'lora');assert(!('textFont' in validateDocument({type:'math-page',latex:'x',textFont:'untrusted-font'})));
});
test('every family renders text, survives LaTeX reload and keeps the intentional selection',async()=>{
 await new Promise(resolve=>setTimeout(resolve,75));
 for(const font of FONT_CATALOG){
  const f=make();f.selection={ranges:[[0,f.lastOffset]]};const selection=structuredClone(f.selection);installPageHistory(f);
  try{
   const before=f.value;f.pageHistory.transaction(()=>applyTextFont(f,font.id));assert.deepEqual(f.selection,selection,font.name);assert.equal(f.errors.length,0,font.name);
   const saved=f.value,restored=make(saved);assert.equal(restored.value,saved,font.name+': '+restored.value);assert.equal(restored.getValue('plain-text'),'A quiet idea');
   const text=Array.from({length:f.lastOffset+1},(_,i)=>f._mathfield.model.at(i)).filter(a=>a?.mode==='text'&&!a.hasChildren&&a.value);
   assert(text.every(a=>a.style.fontFamily===font.family),font.name);
   f.pageHistory.undo();assert.equal(f.value,before);f.pageHistory.redo();assert.equal(f.value,saved);restored.parentElement.remove();
  }finally{f.pageHistory.dispose();f.parentElement.remove();}
 }
});
test('text families leave mathematical atoms intact and native typing can switch back to equations',async()=>{
 const f=make(String.raw`\text{Force }+x^2`);f.pageInputMode='text';f.mode='text';f.selection={ranges:[[0,f.lastOffset]]};
 try{
  applyTextFont(f,'lora');assert.equal(f.errors.length,0);const math=Array.from({length:f.lastOffset+1},(_,i)=>f._mathfield.model.at(i)).filter(a=>a?.mode==='math'&&!a.hasChildren&&a.value);
  assert(math.every(a=>a.style?.fontFamily!=='Lora Variable'));assert.match(f.value,/x\^2/);
  f.position=f.lastOffset;f.mode='text';applyTextFont(f,'jetbrains');f._mathfield.onInput(' note');await settle();assert.match(f.value,/JetBrains Mono Variable/);
  f.mode='math';f.pageInputMode='math';f.resetProseInput();f._mathfield.onInput('z');await settle();assert.equal(f.errors.length,0);assert.equal(f._mathfield.model.at(f.position).style?.fontFamily,undefined);
 }finally{f.parentElement.remove();}
});
test('picker search, keyboard application and outside dismissal preserve editor selection',async()=>{
 const f=make();f.mode='text';f.selection={ranges:[[0,f.lastOffset]]};const before=structuredClone(f.selection);installPageHistory(f);
 const select=document.createElement('select');select.id='font';document.body.append(select);let changes=0;const picker=installFontPicker(select,()=>f,()=>changes++),button=document.querySelector('#font');
 try{
  button.click();const panel=document.querySelector('.font-picker'),search=panel.querySelector('input');assert.equal(panel.hidden,false);assert.deepEqual(f.selection,before);
  search.value='Lora';search.dispatchEvent(new Event('input',{bubbles:true}));assert.equal(panel.querySelectorAll('[role=option]').length,1);search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(panel.hidden,true);assert.equal(changes,1);assert.match(f.value,/Lora Variable/);assert.deepEqual(f.selection,before);
  button.click();search.value='no such font';search.dispatchEvent(new Event('input',{bubbles:true}));assert(panel.querySelector('[role=status]'));search.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert(panel.hidden);assert.equal(document.activeElement,button);
  button.click();document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));assert(panel.hidden);assert.equal(changes,1);
 }finally{picker.dispose();button.remove();f.pageHistory.dispose();f.parentElement.remove();}
});

test('partial font runs retain adjacent text and mathematical structures on saved-page reload',()=>{
 for(const base of [String.raw`\text{The quick brown fox jumps over a dog}x^2`,String.raw`\textsf{The quick brown fox jumps over a dog}x^2`,String.raw`\textbf{\textit{The quick brown fox jumps over a dog}}x^2`])for(const range of [[0,19],[4,9]]){
  const f=make(base);f.selection={ranges:[range]};installPageHistory(f);
  try{
   f.pageHistory.transaction(()=>applyTextFont(f,'lora'));f.pageHistory.transaction(()=>applyTextFont(f,'caveat'));const saved=f.value;
   const history=f.pageHistory.serialize(),restored=make(saved);installPageHistory(restored,JSON.parse(JSON.stringify(history)));try{assert.equal(restored.errors.length,0,saved);assert.equal(restored.getValue('plain-text'),f.getValue('plain-text'),saved);assert.equal(restored.value,saved);}finally{restored.pageHistory?.dispose();restored.parentElement.remove();}
  }finally{f.pageHistory.dispose();f.parentElement.remove();}
 }
});

test('natural-language conversion uses math typography after a custom prose font was chosen',async()=>{
 for(const mode of ['auto','math']){
  const f=make('');f.mode='text';f.pageInputMode=mode;applyTextFont(f,'lora');
  try{
   f._mathfield.onInput('force equals mass');await settle();assert.equal(f.errors.length,0,f.value);
   const math=Array.from({length:f.lastOffset+1},(_,i)=>f._mathfield.model.at(i)).filter(a=>a?.mode==='math'&&!a.hasChildren&&a.value);assert(math.length);assert(math.every(a=>a.style?.fontFamily!=='Lora Variable'),f.value);
   f.mode='math';f.pageInputMode='math';f.resetProseInput();f._mathfield.onInput('z');await settle();assert.equal(f.errors.length,0);assert.notEqual(f._mathfield.model.at(f.position).style?.fontFamily,'Lora Variable');
  }finally{f.parentElement.remove();}
 }
});

test('font runs inside page displaylines parse after saved history reload',()=>{
 const f=make(String.raw`\displaylines{\text{The quick brown fox jumps over a dog}\\x^2}`);f.pageInputMode='text';f.mode='text';f.selection={ranges:[[0,19]]};installPageHistory(f);
 try{
  f.pageHistory.transaction(()=>applyTextFont(f,'caveat'));const saved=f.value,history=f.pageHistory.serialize();
  const restored=make(saved);restored.pageInputMode='text';restored.textFont='caveat';installPageHistory(restored,history);
  try{assert.equal(restored.errors.length,0,saved);assert.equal(restored.getValue('plain-text'),f.getValue('plain-text'),saved);assert.equal(restored.value,saved);}finally{restored.pageHistory.dispose();restored.parentElement.remove();}
 }finally{f.pageHistory.dispose();f.parentElement.remove();}
});
