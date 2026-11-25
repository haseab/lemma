import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const {NotebookStore}=createRequire(import.meta.url)('../electron/notebook-store.cjs');
const data=text=>JSON.stringify({version:2,activeId:'page',documents:[{id:'page',title:'Example',content:{type:'math-page',latex:text,mode:'auto'}}]});
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lemma-store-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('durable saves serialize concurrent edits and retain bounded previous versions',async t=>{
 const dir=await temp(t);let clock=1700000000000;const store=new NotebookStore(dir,{keep:3,interval:0,now:()=>clock++});
 await Promise.all(['a','b','c','d','e'].map(s=>store.save(data(s))));
 assert.equal((await store.load()).notebook.documents[0].content.latex,'e');
 const versions=await store.listVersions();assert.equal(versions.length,3);
 assert.equal((await store.readVersion(versions[0].id)).documents[0].content.latex,'d');
 await assert.rejects(store.readVersion('../notebook.json'));await assert.rejects(fs.stat(store.journal),{code:'ENOENT'});
});
test('a failed main-file replacement preserves the original and recovers the latest journal on restart',async t=>{
 const dir=await temp(t);const store=new NotebookStore(dir);await store.save(data('original'));
 const io={...fs,rename:async(from,to)=>{if(to===path.join(dir,'notebook.json'))throw Object.assign(Error('Simulated disk failure'),{code:'EIO'});return fs.rename(from,to);}};
 await assert.rejects(new NotebookStore(dir,{io}).save(data('latest')),/Simulated/);
 assert.equal(await fs.readFile(store.file,'utf8'),data('original'));
 const recovered=await new NotebookStore(dir).load();assert.equal(recovered.notebook.documents[0].content.latex,'latest');assert.equal(recovered.recovery.source,'interrupted save');
 await store.save(data('latest'));assert.equal((await store.load()).recovery,null);
});
test('corrupt notebook falls back to a validated version and preserves the corrupt original during repair',async t=>{
 const dir=await temp(t);const store=new NotebookStore(dir,{interval:0});await store.save(data('known good'));await store.save(data('newer'));
 await fs.writeFile(store.file,'broken{');const recovered=await new NotebookStore(dir).load();assert.equal(recovered.notebook.documents[0].content.latex,'known good');
 await store.save(JSON.stringify(recovered.notebook));const original=(await fs.readdir(dir)).find(n=>n.startsWith('recovery-original-'));assert(original);assert.equal(await fs.readFile(path.join(dir,original),'utf8'),'broken{');
});
test('invalid or oversized save cannot replace a valid notebook; corrupt files without recovery are never treated as a new notebook',async t=>{
 const dir=await temp(t);const store=new NotebookStore(dir);await store.save(data('retained'));
 await assert.rejects(store.save('{'));await assert.rejects(store.save('x'.repeat(20_000_001)));assert.equal(await fs.readFile(store.file,'utf8'),data('retained'));
 const other=await temp(t);await fs.writeFile(path.join(other,'notebook.json'),'{}');await assert.rejects(new NotebookStore(other).load(),/preserved/);
});
test('a recovery journal survives a backup write failure and remains loadable',async t=>{
 const dir=await temp(t);const store=new NotebookStore(dir);await store.save(data('before'));
 const io={...fs,mkdir:async(p,...args)=>{if(p===path.join(dir,'versions'))throw Object.assign(Error('Backup directory unavailable'),{code:'EACCES'});return fs.mkdir(p,...args);}};
 await assert.rejects(new NotebookStore(dir,{io}).save(data('after')),/unavailable/);
 assert.equal((await new NotebookStore(dir).load()).notebook.documents[0].content.latex,'after');
});
test('corrupt recovery journal is preserved and invalid legacy content falls back to a validated backup',async t=>{
 const dir=await temp(t);const store=new NotebookStore(dir,{interval:0});await store.save(data('good'));await store.save(data('newer'));
 await fs.writeFile(store.journal,'unreadable journal');await store.save(data('next'));
 const original=(await fs.readdir(dir)).find(n=>n.startsWith('recovery-original-journal-'));assert(original);assert.equal(await fs.readFile(path.join(dir,original),'utf8'),'unreadable journal');
 await fs.writeFile(store.file,JSON.stringify({version:1,documents:[{id:'page',content:{type:'doc',content:[{type:'script'}]}}]}));
 const recovered=await store.load();assert.equal(recovered.recovery.source,'automatic backup');
});
test('an abruptly terminated save process recovers its durable journal on the next launch',async t=>{
 const {spawnSync}=await import('node:child_process');const dir=await temp(t);const store=new NotebookStore(dir);await store.save(data('before crash'));
 const script="const fs=require('node:fs/promises');const {NotebookStore}=require(process.argv[1]);const io={...fs,rename:async(a,b)=>{await fs.rename(a,b);if(b.endsWith('.recovery'))process.exit(71);}};new NotebookStore(process.argv[2],{io}).save(process.argv[3]);";
 const child=spawnSync(process.execPath,['-e',script,path.resolve('electron/notebook-store.cjs'),dir,data('recovered after crash')],{encoding:'utf8'});assert.equal(child.status,71,child.stderr);
 assert.equal(await fs.readFile(store.file,'utf8'),data('before crash'));assert.equal((await new NotebookStore(dir).load()).notebook.documents[0].content.latex,'recovered after crash');
});
