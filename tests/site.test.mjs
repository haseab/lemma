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
