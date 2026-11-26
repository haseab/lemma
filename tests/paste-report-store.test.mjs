import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createPasteReportStore,validatePasteReport} from '../scripts/paste-report-store.mjs';
const capture='12345678-1234-1234-1234-123456789abc';
const report=()=>({schema:1,capture,events:[{id:1,ms:3,kind:'paste:converted',changed:true,handled:true}]});
test('paste report receiver stores metadata atomically and rejects text and cross-site writes',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'paste-report-test-'));
 const server=http.createServer(createPasteReportStore(directory));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 const post=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await(await fetch(url)).json()).enabled,true);
  assert.equal((await post(report())).status,200);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory,`${capture}.json`),'utf8')),report());
  assert.deepEqual(await readdir(directory),[`${capture}.json`]);
  for(const body of [{...report(),text:'confidential sample'},{...report(),capture:'../../elsewhere'}, {...report(),events:[{...report().events[0],source:'confidential sample'}]}])assert.equal((await post(body)).status,400);
  const blocked=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Sec-Fetch-Site':'cross-site'},body:JSON.stringify(report())});assert.equal(blocked.status,403);
  assert.equal((await fetch(url,{method:'POST',body:JSON.stringify(report())})).status,403);
  const next=report();next.events[0].id=2;assert.equal((await post(next)).status,200);
  assert.equal(JSON.parse(await readFile(path.join(directory,`${capture}.json`),'utf8')).events[0].id,2);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
test('paste reports reject invalid event kinds, values and excessive events',()=>{
 for(const events of [[{id:1,ms:2,kind:'secret wording'}],[{id:1,ms:-1,kind:'paste'}],[{id:1,ms:2,kind:'paste',characters:'wording'}],Array.from({length:121},()=>report().events[0])])assert.throws(()=>validatePasteReport({...report(),events}));
});
