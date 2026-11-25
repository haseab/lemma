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
