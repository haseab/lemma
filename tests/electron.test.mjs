import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../electron/main.cjs',import.meta.url));
async function harness(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lemma-electron-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const handlers=new Map(),sent=[],app=new EventEmitter();let ready=false,resolveReady;
 Object.assign(app,{getPath:()=>dir,setPath:()=>{},setName:()=>{},whenReady:()=>new Promise(resolve=>{resolveReady=resolve;}),isReady:()=>ready,requestSingleInstanceLock:()=>true,quit:()=>{}});
 class Window extends EventEmitter{
  static windows=[];static getAllWindows(){return this.windows;}
  constructor(){super();this.webContents=new EventEmitter();Object.assign(this.webContents,{mainFrame:{},send:(...args)=>sent.push(args),setWindowOpenHandler:()=>{}});Window.windows.push(this);}
  loadFile(){}show(){}close(){this.emit('closed');Window.windows=Window.windows.filter(w=>w!==this);}
 }
 const ipc=new EventEmitter();ipc.handle=(name,fn)=>handlers.set(name,fn);
 const context={require:name=>name==='electron'?{app,BrowserWindow:Window,ipcMain:ipc,dialog:{},Menu:{buildFromTemplate:t=>t,setApplicationMenu:()=>{}},clipboard:{writeText:()=>{}}}:require(name),process:{env:{},argv:['electron'],platform:'darwin'},__dirname:path.resolve('electron'),console,setTimeout,Buffer};
 vm.runInNewContext(await fs.readFile(new URL('../electron/main.cjs',import.meta.url),'utf8'),context);
 const invoke=(name,...args)=>{const w=Window.windows.at(-1);return handlers.get(name)({sender:w.webContents,senderFrame:w.webContents.mainFrame},...args);};
 const start=async()=>{ready=true;resolveReady();await new Promise(setImmediate);};
 return {dir,app,Window,sent,invoke,start,handlers};
}
test('Finder-open requests queue before startup and deliver the original editable file after renderer readiness',async t=>{
 const h=await harness(t);const file=path.join(h.dir,'example.lemma');const raw=JSON.stringify({version:2,title:'Example',content:{type:'math-page',latex:'x^2',mode:'auto'}});await fs.writeFile(file,raw);
 let prevented=false;h.app.emit('open-file',{preventDefault(){prevented=true;}},file);assert(prevented);await h.start();assert.equal(h.sent.length,0);await h.invoke('renderer-ready');
 assert.equal(h.sent[0][0],'open-page-file');assert.deepEqual(JSON.parse(JSON.stringify(h.sent[0][1])),{name:'example.lemma',data:raw});
});
test('IPC rejects untrusted frames and opening a file after closing the window creates a new window',async t=>{
 const h=await harness(t);await h.start();await assert.rejects(async()=>h.handlers.get('load')({sender:{},senderFrame:{}}),/Invalid application request/);
 h.Window.windows[0].close();const file=path.join(h.dir,'equation.tex');await fs.writeFile(file,'x^2');h.app.emit('open-file',{preventDefault(){}},file);assert.equal(h.Window.windows.length,1);
 await h.invoke('renderer-ready');assert.equal(h.sent[0][1].name,'equation.tex');
});
