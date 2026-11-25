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
 document.body.innerHTML=readFileSync('site/index.html','utf8').match(/<body>([\s\S]*)<script type="module"/)[1];
 if(saved)localStorage.setItem('lemma.web.scratchpad.v1',saved);
 await import(pathToFileURL(asset).href+'?test='+suffix);await wait(40);
 const $=s=>document.querySelector(s);
 return {$,browser,async close(){document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));const saved=localStorage.getItem('lemma.web.scratchpad.v1');$('#math-page').pageHistory.dispose();$('#math-page').remove();await browser.happyDOM.close();return saved;}};
}
test('website scratchpad edits with the shared engine, reverses clear/source edits, and restores undo after reload',async()=>{
 const a=await boot(null,'first'),f=a.$('#math-page');
 assert(f.pageHistory);assert.equal(f.pageInputMode,'auto');assert.equal(f.getValue('plain-text'),'');
 a.$('[data-example="quadratic"]').click();await wait(30);assert.match(f.value,/x\^2/);assert(a.$('#scratchpad').classList.contains('has-content'));
 const equation=f.value;f.mode='text';a.$('#clear-page').click();await wait(30);assert.equal(f.getValue('plain-text'),'');assert.equal(f.mode,'math');a.$('#undo').click();assert.equal(f.value,equation);
 a.$('#source-open').click();a.$('#source-value').value='\\frac{3}{4}';a.$('#source-apply').click();await wait(30);assert.match(f.value,/\\frac/);
 a.$('[data-mode="text"]').click();assert.equal(f.pageInputMode,'text');a.$('[data-mode="auto"]').click();
 const saved=await a.close();assert.match(saved,/\\\\frac/);assert(JSON.parse(saved).history.entries.length>1);
 const b=await boot(saved,'reload');assert.match(b.$('#math-page').value,/\\frac/);b.$('#undo').click();assert.equal(b.$('#math-page').value,equation);await b.close();
});
