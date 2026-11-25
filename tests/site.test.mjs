import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repositorySettings,releaseDownloads} from '../site/releases.js';
const repository=repositorySettings('https://github.com/example/lemma');
test('website release selection uses published matching platform assets and rejects foreign download URLs',()=>{
 const asset=(name,url)=>({name,browser_download_url:url});
 const releases=[{draft:true,assets:[asset('Lemma-0.3.0-windows-x64.zip','https://github.com/example/lemma/releases/download/v0.3.0/draft.zip')]},{tag_name:'v0.3.0',prerelease:true,assets:[asset('Lemma-0.3.0-windows-x64.zip','https://example.org/download.exe'),asset('Lemma-0.3.0-mac-arm64.zip','https://github.com/example/lemma/releases/download/v0.3.0/mac.zip'),asset('Lemma-0.3.0-windows-x64.zip','https://github.com/example/lemma/releases/download/v0.3.0/windows.zip')]}];
 const found=releaseDownloads(releases,repository);assert.equal(found.mac.version,'v0.3.0');assert.equal(found.mac.preview,true);assert.equal(found.windows.url,'https://github.com/example/lemma/releases/download/v0.3.0/windows.zip');assert.deepEqual(releaseDownloads([],repository),{mac:null,windows:null});
});
test('repository configuration accepts only an HTTPS GitHub repository and never credentials or a query',()=>{for(const input of ['javascript:alert(1)','https://github.com@example.org/example/lemma','https://user:secret@github.com/example/lemma','https://github.com/example/lemma?token=secret','https://github.com/example/lemma/tree/main'])assert.equal(repositorySettings(input),null);assert.equal(repository.url,'https://github.com/example/lemma');});

const {detectDesktopPlatform,updatePlatformLinks}=await import('../site/platform.js');
const {Window}=await import('happy-dom');
test('desktop download detection handles Mac, Windows, mobile devices and unknown platforms',()=>{
 for(const profile of [{platform:'MacIntel'},{userAgentData:{platform:'macOS',mobile:false}},{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}])assert.equal(detectDesktopPlatform(profile),'mac');
 for(const profile of [{platform:'Win32'},{userAgentData:{platform:'Windows',mobile:false}},{platform:'',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}])assert.equal(detectDesktopPlatform(profile),'windows');
 for(const profile of [{platform:'MacIntel',maxTouchPoints:5,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)'},{platform:'iPhone'},{userAgentData:{platform:'Android',mobile:true}},{platform:'Linux x86_64'},{}])assert.equal(detectDesktopPlatform(profile),null);
});
test('primary buttons select the detected OS, prioritize its card, and use only its available asset',async()=>{
 const browser=new Window();const d=browser.document;d.body.innerHTML='<a data-primary-download></a><a data-primary-download></a><div><article data-platform="mac" id="download-mac"></article><article data-platform="windows" id="download-windows"></article></div>';
 updatePlatformLinks(d,'windows',{mac:{url:'https://example.org/mac.zip'}});
 assert.equal(d.querySelector('[data-primary-download]').textContent,'Download for Windows ↓');assert.equal(d.querySelector('[data-primary-download]').getAttribute('href'),'#download-windows');assert.equal(d.querySelector('article').id,'download-windows');
 updatePlatformLinks(d,'windows',{windows:{url:'https://example.org/windows.zip'}});
 for(const link of d.querySelectorAll('[data-primary-download]'))assert.equal(link.getAttribute('href'),'https://example.org/windows.zip');
 updatePlatformLinks(d,'mac');assert.equal(d.querySelector('article').id,'download-mac');assert.equal(d.querySelector('[data-primary-download]').textContent,'Download for Mac ↓');
 updatePlatformLinks(d,null);assert.equal(d.querySelector('[data-primary-download]').getAttribute('href'),'#download');assert.equal(d.querySelector('[data-primary-download]').textContent,'View downloads ↓');await browser.happyDOM.close();
});

const {STORAGE_KEY,loadScratchpad,saveScratchpad}=await import('../site/scratchpad-store.js');
const storedPage=(latex='x^2')=>({version:1,title:'Example page',content:{type:'math-page',latex,mode:'auto'},history:{version:1,index:1,entries:[{latex:'x',typingMode:'math',selection:{ranges:[[1,1]]}},{latex,typingMode:'math',selection:{ranges:[[1,1]]}}]}});
function memoryStorage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
test('web scratchpad restores content and undo history and recovers a corrupt primary from its previous copy',()=>{
 const storage=memoryStorage();assert.deepEqual(loadScratchpad(storage),{page:null,recovered:false});
 saveScratchpad(storage,storedPage());assert.equal(loadScratchpad(storage).page.documents[0].history.entries.length,2);
 saveScratchpad(storage,storedPage('y^2'));storage.setItem(STORAGE_KEY,'{broken');
 const recovered=loadScratchpad(storage);assert.equal(recovered.recovered,true);assert.equal(recovered.page.documents[0].content.latex,'x^2');
 saveScratchpad(storage,storedPage('z^2'));assert.equal(loadScratchpad(storage).page.documents[0].content.latex,'z^2');assert.equal(JSON.parse(storage.getItem(STORAGE_KEY+'.backup')).documents[0].content.latex,'x^2');
});
test('web storage failures preserve the previous saved page and corrupt-only storage is not silently overwritten',()=>{
 const storage=memoryStorage();saveScratchpad(storage,storedPage());const old=storage.getItem(STORAGE_KEY);
 const full={getItem:storage.getItem,setItem:()=>{throw new DOMException('Full','QuotaExceededError');}};
 assert.throws(()=>saveScratchpad(full,storedPage('z')),/Full/);assert.equal(storage.getItem(STORAGE_KEY),old);
 storage.setItem(STORAGE_KEY,'bad');assert.throws(()=>loadScratchpad(storage),/preserved/);
});

const {installFullscreen}=await import('../site/fullscreen.js');
test('fullscreen fallback toggles the writing layout and respects Escape in open dialogs',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<button id="fullscreen"></button><dialog open></dialog>';const button=d.querySelector('button');installFullscreen(d.documentElement,button);
 button.click();assert(d.body.classList.contains('scratchpad-fullscreen'));assert.equal(button.getAttribute('aria-label'),'Exit fullscreen');
 d.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape'}));assert(d.body.classList.contains('scratchpad-fullscreen'));
 d.querySelector('dialog').removeAttribute('open');d.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape'}));assert(!d.body.classList.contains('scratchpad-fullscreen'));assert.equal(button.getAttribute('aria-pressed'),'false');
 await browser.happyDOM.close();
});
test('native fullscreen follows browser Escape and failed requests retain a working viewport toggle',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<button></button>';const button=d.querySelector('button'),root=d.documentElement;let current=null;
 Object.defineProperty(d,'fullscreenElement',{get:()=>current});root.requestFullscreen=async()=>{current=root;d.dispatchEvent(new browser.Event('fullscreenchange'));};d.exitFullscreen=async()=>{current=null;d.dispatchEvent(new browser.Event('fullscreenchange'));};installFullscreen(root,button);
 button.click();assert.equal(current,root);current=null;d.dispatchEvent(new browser.Event('fullscreenchange'));assert.equal(button.getAttribute('aria-pressed'),'false');
 root.requestFullscreen=async()=>{throw Error('Unavailable');};button.click();await Promise.resolve();assert.equal(button.getAttribute('aria-pressed'),'true');button.click();await Promise.resolve();assert.equal(button.getAttribute('aria-pressed'),'false');
 await browser.happyDOM.close();
});

test('header download works without a download section and switches from releases to the matching asset',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<a data-primary-download></a>';
 const fallback='https://github.com/example/lemma/releases';updatePlatformLinks(d,'windows',{},fallback);assert.equal(d.querySelector('a').getAttribute('href'),fallback);
 const url=fallback+'/download/v1/windows.zip';updatePlatformLinks(d,'windows',{windows:{url}},fallback);assert.equal(d.querySelector('a').getAttribute('href'),url);
 updatePlatformLinks(d,null,{},fallback);assert.equal(d.querySelector('a').getAttribute('href'),fallback);await browser.happyDOM.close();
});

const {loadGitHubStars}=await import('../site/github-stars.js');
test('GitHub badge uses live star counts including zero and keeps its link on API failure',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<a href="https://github.com/example/lemma"><span class="github-stars" hidden><span data-star-count></span></span></a>';const link=d.querySelector('a');
 let requested;
 await loadGitHubStars(link,repository,async url=>{requested=url;return {ok:true,json:async()=>({stargazers_count:1234})};});
 assert.equal(requested,'https://api.github.com/repos/example/lemma');assert.equal(link.querySelector('[data-star-count]').textContent,'1,234');assert.equal(link.querySelector('.github-stars').hidden,false);assert.match(link.getAttribute('aria-label'),/1,234 stars/);
 await loadGitHubStars(link,repository,async()=>({ok:true,json:async()=>({stargazers_count:0})}));assert.equal(link.querySelector('[data-star-count]').textContent,'0');
 link.querySelector('.github-stars').hidden=true;
 for(const fetcher of [async()=>({ok:false}),async()=>{throw Error('Offline');},async()=>({ok:true,json:async()=>({stargazers_count:'invalid'})})]){await loadGitHubStars(link,repository,fetcher);assert.equal(link.querySelector('.github-stars').hidden,true);assert.equal(link.getAttribute('href'),repository.url);}
 await browser.happyDOM.close();
});
