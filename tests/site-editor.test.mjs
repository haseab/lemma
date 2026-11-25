import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {Window} from 'happy-dom';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const output=mkdtempSync(path.join(os.tmpdir(),'lemma-web-test-'));
after(()=>rmSync(output,{recursive:true,force:true}));
execFileSync(path.resolve('node_modules/.bin/vite'),['build','--config','site/vite.config.js','--outDir',output],{stdio:'pipe',env:{...process.env,VITE_REPOSITORY_URL:''}});
const asset=path.resolve(output,'assets',readdirSync(path.join(output,'assets')).find(n=>/^index-.*\.js$/.test(n)));
async function boot(saved,suffix){
 const browser=new Window({url:'https://example.org/'});
 for(const key of ['CSSStyleSheet','ShadowRoot','DocumentFragment','HTMLButtonElement','HTMLTextAreaElement','HTMLInputElement','PointerEvent','MouseEvent','Range','Selection','window','document','HTMLElement','customElements','navigator','MutationObserver','ResizeObserver','getComputedStyle','DOMRect','DOMParser','Event','CustomEvent','InputEvent','UIEvent','KeyboardEvent','Node','Element','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','location','CSS','HTMLSlotElement','HTMLSpanElement','HTMLDivElement','HTMLStyleElement','localStorage']){
  if(browser[key]!==undefined)Object.defineProperty(globalThis,key,{configurable:true,value:typeof browser[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval'].includes(key)?browser[key].bind(browser):browser[key]});
 }
 document.fonts={ready:Promise.resolve(),check:()=>true,load:async()=>[],add:()=>{}};
 globalThis.FontFace=class{constructor(family){this.family=family;this.status='loaded';this.loaded=Promise.resolve(this);}load(){return this.loaded;}};
 const style=document.createElement('style');style.textContent=readFileSync(path.join(output,'assets',readdirSync(path.join(output,'assets')).find(n=>/^index-.*\.css$/.test(n))),'utf8');document.head.append(style);
 document.body.innerHTML=readFileSync('site/index.html','utf8').match(/<body>([\s\S]*)<script type="module"/)[1];
 if(saved)localStorage.setItem('lemma.web.scratchpad.v1',saved);
 await import(pathToFileURL(asset).href+'?test='+suffix);await wait(40);
 const $=s=>document.querySelector(s);
 return {$,browser,async close(){document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));const saved=localStorage.getItem('lemma.web.scratchpad.v1');$('#math-page').pageHistory.dispose();$('#math-page').remove();await browser.happyDOM.close();return saved;}};
}
test('website scratchpad edits with the shared engine, reverses clear/source edits, and restores undo after reload',async()=>{
 const a=await boot(null,'first'),f=a.$('#math-page');
 assert(f.pageHistory);assert.equal(f.pageInputMode,'auto');
 assert.equal(getComputedStyle(f).getPropertyValue('--highlight-text'),'transparent');assert.equal(getComputedStyle(f).getPropertyValue('--text-highlight-background-color'),'transparent');assert.equal(f.getValue('plain-text'),'');
 a.$('[data-example="quadratic"]').click();await wait(30);assert.match(f.value,/x\^2/);assert(a.$('#scratchpad').classList.contains('has-content'));
 const equation=f.value;
 f.selection={ranges:[[0,f.lastOffset]]};assert.equal(f.selectionIsCollapsed,false);assert.notEqual(getComputedStyle(f).getPropertyValue('--selection-background-color'),'transparent');f.position=-1;
 f.mode='text';a.$('#clear-page').click();await wait(30);assert.equal(f.getValue('plain-text'),'');assert.equal(f.mode,'math');a.$('#undo').click();assert.equal(f.value,equation);
 a.$('#source-open').click();a.$('#source-value').value='\\frac{3}{4}';a.$('#source-value').dispatchEvent(new Event('input'));await wait(30);assert.match(f.value,/\\frac/);
 a.$('[data-mode="text"]').click();assert.equal(f.pageInputMode,'text');a.$('[data-mode="auto"]').click();
 const saved=await a.close();assert.match(saved,/\\\\frac/);assert(JSON.parse(saved).documents[0].history.entries.length>1);
 const b=await boot(saved,'reload');assert.match(b.$('#math-page').value,/\\frac/);b.$('#undo').click();assert.equal(b.$('#math-page').value,equation);await b.close();
});

test('browser tabs migrate an existing page, isolate edits and undo, rename, and persist all tabs on reload',async()=>{
 const legacy={version:1,title:'Existing page',content:{type:'math-page',latex:'x^2',mode:'auto'},history:{version:1,index:1,entries:[{latex:'x',typingMode:'math',selection:{ranges:[[1,1]]}},{latex:'x^2',typingMode:'math',selection:{ranges:[[1,1]]}}]}};
 const app=await boot(JSON.stringify(legacy),'tabs');assert.equal(app.$('[role="tab"]').textContent,'Existing page');const firstId=app.$('[role="tab"]').dataset.pageId;
 app.$('#new-tab').click();assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,2);assert.equal(app.$('#math-page').getValue('plain-text'),'');
 app.$('[role="tab"][aria-selected="true"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));app.$('[data-tab-action="rename"]').click();assert.equal(app.$('#title').hidden,false);app.$('#title').value='Second page';app.$('#title').dispatchEvent(new Event('input'));app.$('#title').blur();assert.equal(app.$('#title').hidden,true);
 app.$('#source-open').click();app.$('#source-value').value='y+2';app.$('#source-value').dispatchEvent(new Event('input'));await wait(30);
 [...app.browser.document.querySelectorAll('[role="tab"]')].find(b=>b.dataset.pageId===firstId).click();assert.equal(app.$('#math-page').value,'x^2');app.$('#undo').click();assert.equal(app.$('#math-page').value,'x');
 const saved=await app.close();assert.equal(JSON.parse(saved).documents.length,2);
 const restored=await boot(saved,'tabs-reload');assert.equal(restored.$('[role="tab"][aria-selected="true"]').textContent,'Existing page');assert.equal(restored.$('#math-page').value,'x');restored.$('#redo').click();assert.equal(restored.$('#math-page').value,'x^2');
 [...restored.browser.document.querySelectorAll('[role="tab"]')].find(b=>b.textContent==='Second page').click();assert.equal(restored.$('#math-page').value,'y+2');restored.$('#undo').click();assert.equal(restored.$('#math-page').getValue('plain-text'),'');await restored.close();
});

test('web close confirmation preserves cancelled pages, removes accepted pages, and keeps a blank last tab',async()=>{
 const app=await boot(JSON.stringify({version:1,title:'Protected page',content:{type:'math-page',latex:'x+1',mode:'auto'}}),'close-tabs');const first=app.$('[role="tab"]').dataset.pageId;
 app.$('#new-tab').click();const empty=app.$('[role="tab"][aria-selected="true"]').dataset.pageId;
 app.$(`[data-close-page="${first}"]`).click();assert(app.$('#close-page-dialog').open);app.$('[data-cancel]').click();await wait(5);assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,2);assert.equal(app.$('[role="tab"][aria-selected="true"]').dataset.pageId,empty);
 app.$(`[data-close-page="${empty}"]`).click();assert.equal(app.$('#close-page-dialog'),null);assert.equal(app.$('#math-page').value,'x+1');
 app.$(`[data-close-page="${first}"]`).click();app.$('[data-confirm]').click();await wait(5);assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,1);assert.notEqual(app.$('[role="tab"]').dataset.pageId,first);assert.equal(app.$('#math-page').getValue('plain-text'),'');
 const blank=app.$('[role="tab"]').dataset.pageId;app.$(`[data-close-page="${blank}"]`).click();assert.equal(app.$('#close-page-dialog'),null);assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,1);
 const saved=await app.close();assert.equal(JSON.parse(saved).documents.length,1);assert(!JSON.parse(saved).documents.some(d=>d.id===first));
 const restored=await boot(saved,'closed-tabs-reload');assert.equal(restored.$('#math-page').getValue('plain-text'),'');await restored.close();
});

test('web context duplication uses current edits, isolates the copy, and persists both pages',async()=>{
 const app=await boot(null,'context-copy');app.$('#source-open').click();app.$('#source-value').value='x^2';app.$('#source-value').dispatchEvent(new Event('input'));
 const original=app.$('[role="tab"]').dataset.pageId;app.$('[role="tab"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:100}));app.$('[data-tab-action="duplicate"]').click();assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,2);assert.equal(app.$('#math-page').value,'x^2');assert.match(app.$('[role="tab"][aria-selected="true"]').textContent,/copy$/);
 app.$('#source-open').click();app.$('#source-value').value='y^3';app.$('#source-value').dispatchEvent(new Event('input'));await wait(30);
 [...app.browser.document.querySelectorAll('[role="tab"]')].find(b=>b.dataset.pageId===original).click();assert.equal(app.$('#math-page').value,'x^2');const saved=await app.close();assert.equal(JSON.parse(saved).documents.length,2);assert.equal(JSON.parse(saved).documents[1].content.latex,'y^3');
});


test('inline source previews valid edits, retains incomplete drafts per page, and syncs undo',async()=>{
 const app=await boot(null,'inline-source'),f=app.$('#math-page');
 app.$('#source-open').click();assert.equal(app.$('#source-panel').hidden,false);assert.equal(app.$('#source-open').getAttribute('aria-expanded'),'true');assert.equal(app.$('#source-dialog'),null);
 const input=app.$('#source-value');input.value='x^2';input.dispatchEvent(new Event('input'));await wait(30);assert.equal(f.value,'x^2');assert.equal(document.activeElement,input);
 input.value='\\notacommand{';input.dispatchEvent(new Event('input'));assert.equal(f.value,'x^2');assert.equal(input.getAttribute('aria-invalid'),'true');assert(app.$('#source-error').textContent);
 const first=app.$('[role="tab"]').dataset.pageId;app.$('#new-tab').click();assert.notEqual(input.value,'\\notacommand{');app.$(`[data-page-id="${first}"]`).click();assert.equal(input.value,'\\notacommand{');assert.equal(app.$('#math-page').value,'x^2');
 input.value='y+1';input.dispatchEvent(new Event('input'));await wait(30);assert.equal(app.$('#math-page').value,'y+1');assert.equal(input.getAttribute('aria-invalid'),'false');
 app.$('#undo').click();assert.equal(app.$('#math-page').value,'x^2');assert.equal(input.value,'x^2');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(app.$('#source-panel').hidden,true);assert.equal(app.$('#source-open').getAttribute('aria-expanded'),'false');assert.equal(document.activeElement,app.$('#source-open'));await app.close();
});
