import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {Window} from 'happy-dom';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
execFileSync(path.resolve('node_modules/.bin/vite'),['build'],{stdio:'pipe'});
const asset=path.resolve('dist/assets',readdirSync('dist/assets').find(n=>/^index-.*\.js$/.test(n)));
async function boot(data,suffix){
 const browser=new Window({url:'file:///example/index.html'});
 for(const key of ['CSSStyleSheet','ShadowRoot','DocumentFragment','HTMLButtonElement','HTMLTextAreaElement','HTMLInputElement','PointerEvent','MouseEvent','Range','Selection','window','document','HTMLElement','customElements','navigator','MutationObserver','ResizeObserver','getComputedStyle','DOMRect','DOMParser','Event','CustomEvent','InputEvent','KeyboardEvent','Node','Element','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','location','CSS','HTMLSlotElement','HTMLSpanElement','HTMLDivElement','HTMLStyleElement']){
  if(browser[key]!==undefined)Object.defineProperty(globalThis,key,{configurable:true,value:typeof browser[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval'].includes(key)?browser[key].bind(browser):browser[key]});
 }
 document.fonts={ready:Promise.resolve(),check:()=>true,load:async()=>[],add:()=>{}};
 globalThis.FontFace=class {constructor(family){this.family=family;this.status='loaded';this.loaded=Promise.resolve(this);}load(){return this.loaded;}};
 const calls={saved:null,ready:false,close:null,open:null,finished:false};
 browser.lemma={load:async()=>({notebook:data,recovery:null}),save:async raw=>{calls.saved=JSON.parse(raw);},ready:async()=>{calls.ready=true;},onAction:()=>{},onBeforeClose:fn=>{calls.close=fn;},onOpenFile:fn=>{calls.open=fn;},onFileError:()=>{},finishClose:()=>{calls.finished=true;},versions:async()=>[]};
 document.body.innerHTML='<div id="app"></div>';
 await import(pathToFileURL(asset).href+'?test='+suffix);await wait(50);
 const $=selector=>document.querySelector(selector);
 const close=async()=>{await calls.close();$('#math-page')?.pageHistory.dispose();$('#math-page')?.remove();await browser.happyDOM.close();};
 return {browser,calls,$,close};
}
test('bundled renderer boots, searches, replaces, imports source, saves history and restores it on restart',async()=>{
 const fixture={version:2,activeId:'first',documents:[{id:'first',title:'First example',updatedAt:1,content:{type:'math-page',latex:'\\text{Example note. Example note.}',mode:'auto'}},{id:'second',title:'Second example',updatedAt:1,content:{type:'math-page',latex:'x+1',mode:'auto'}}]};
 const app=await boot(fixture,'first');assert(app.calls.ready);assert.equal(app.$('#save-status').textContent,'All changes saved');
 app.$('#find-open').click();app.$('#find-query').value='Example';app.$('#find-query').dispatchEvent(new Event('input'));assert.equal(app.$('#find-count').textContent,'2 matches');
 app.$('#replace-value').value='Clear';app.$('#replace-all').click();await wait(35);assert.match(app.$('#math-page').value,/Clear note/);
 app.$('#find-close').click();app.$('#undo').click();assert.match(app.$('#math-page').value,/Example note/);
 app.$('#source-open').click();app.$('#source-value').value='\\frac{3}{4}';app.$('#source-apply').click();await wait(35);assert.match(app.$('#math-page').value,/\\frac/);
 const second=[...app.$('#documents').children].find(b=>b.textContent==='Second example');second.click();assert.equal(app.$('#math-page').value,'x+1');
 [...app.$('#documents').children].find(b=>b.textContent==='First example').click();app.$('#undo').click();assert.match(app.$('#math-page').value,/Example note/);
 await app.close();assert(app.calls.finished);const saved=app.calls.saved;assert(saved.documents[0].history);assert.equal(saved.documents.length,2);
 const restored=await boot(saved,'restart');assert.match(restored.$('#math-page').value,/Example note/);restored.$('#redo').click();assert.match(restored.$('#math-page').value,/\\frac/);
 await restored.calls.open({name:'external.lemma',data:JSON.stringify({version:2,title:'Imported example',content:{type:'math-page',latex:'y^2',mode:'auto'}})});await wait(35);assert.equal(restored.$('#title').value,'Imported example');
 await restored.close();assert.equal(restored.calls.saved.documents.length,3);
});

test('desktop tabs add pages, retain independent history, and reopen the selected page',async()=>{
 const fixture={version:2,activeId:'first',documents:[{id:'first',title:'First page',updatedAt:1,content:{type:'math-page',latex:'x+1',mode:'auto'}},{id:'second',title:'Second page',updatedAt:1,content:{type:'math-page',latex:'z+1',mode:'auto'}}]};
 const app=await boot(fixture,'desktop-tabs');assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,2);
 app.$('#new-tab').click();assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,3);const id=app.$('[role="tab"][aria-selected="true"]').dataset.pageId;
 app.$('#source-open').click();app.$('#source-value').value='y^3';app.$('#source-apply').click();await wait(35);
 [...app.browser.document.querySelectorAll('[role="tab"]')].find(b=>b.dataset.pageId==='first').click();assert.equal(app.$('#math-page').value,'x+1');
 [...app.browser.document.querySelectorAll('[role="tab"]')].find(b=>b.dataset.pageId===id).click();assert.equal(app.$('#math-page').value,'y^3');await app.close();
 const reopened=await boot(app.calls.saved,'desktop-tabs-reload');assert.equal(reopened.$('[role="tab"][aria-selected="true"]').dataset.pageId,id);assert.equal(reopened.$('#math-page').value,'y^3');reopened.$('#undo').click();assert.equal(reopened.$('#math-page').getValue('plain-text'),'');await reopened.close();
});

test('desktop close prompts before deleting content and persists the remaining page',async()=>{
 const fixture={version:2,activeId:'first',documents:[{id:'first',title:'Protected page',updatedAt:1,content:{type:'math-page',latex:'x+1',mode:'auto'}}]};
 const app=await boot(fixture,'desktop-close');app.$('[data-close-page="first"]').click();assert(app.$('#close-page-dialog').open);app.$('[data-cancel]').click();await wait(5);assert.equal(app.$('#math-page').value,'x+1');
 app.$('#new-tab').click();const empty=app.$('[role="tab"][aria-selected="true"]').dataset.pageId;app.$(`[data-close-page="${empty}"]`).click();assert.equal(app.$('#close-page-dialog'),null);assert.equal(app.$('#math-page').value,'x+1');
 app.$('[data-close-page="first"]').click();app.$('[data-confirm]').click();await wait(5);assert.equal(app.browser.document.querySelectorAll('[role="tab"]').length,1);assert.equal(app.$('#math-page').getValue('plain-text'),'');await app.close();
 assert.equal(app.calls.saved.documents.length,1);assert.notEqual(app.calls.saved.documents[0].id,'first');
});
