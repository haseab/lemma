const {app,BrowserWindow,ipcMain,dialog,Menu,clipboard}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {NotebookStore}=require('./notebook-store.cjs');
let win,store,quitting=false,closing=false,rendererReady=false;
const pendingFiles=[];
const send=(action)=>win?.webContents.send('menu-action',action);
app.setName('Lemma');
const profile=process.env.LEMMA_DATA_DIR||(process.env.LEMMA_PREVIEW==='1'?path.join(app.getPath('appData'),'Lemma Preview'):null);
if(profile&&!path.isAbsolute(profile))throw Error('LEMMA_DATA_DIR must be an absolute directory.');
const notebookDirectory=profile||path.join(app.getPath('appData'),'Folio');
require('node:fs').mkdirSync(notebookDirectory,{recursive:true});
app.setPath('userData',notebookDirectory);
function queueFile(file){if(!/\.(?:lemma|folio|json|tex|latex)$/i.test(file))return;if(!pendingFiles.includes(file))pendingFiles.push(file);if(app.isReady()&&!win)createWindow();drainFiles();}
app.on('open-file',(event,file)=>{event.preventDefault();queueFile(file);});
app.on('second-instance',(_event,argv)=>{for(const file of argv.slice(1))queueFile(file);win?.show();});
async function readPageFile(file){
 const stat=await fs.stat(file);if(!stat.isFile()||stat.size>20_000_000)throw Error('Choose a page smaller than 20 MB.');
 return {name:path.basename(file),data:await fs.readFile(file,'utf8')};
}
let draining=false;
async function drainFiles(){
 if(draining||!rendererReady||!win)return;draining=true;
 try{while(pendingFiles.length){const file=pendingFiles.shift();try{win.webContents.send('open-page-file',await readPageFile(file));}catch(error){win.webContents.send('file-open-error',error.message);}}}
 finally{draining=false;}
}
function trusted(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Invalid application request');}
function handle(channel,fn){ipcMain.handle(channel,(event,...args)=>{trusted(event);return fn(...args);});}
async function exportText(data,extension,label){
 if(typeof data!=='string'||Buffer.byteLength(data)>20_000_000)throw Error('Invalid document');
 const r=await dialog.showSaveDialog(win,{defaultPath:'Canvas.'+extension,filters:[{name:label,extensions:[extension]}]});
 if(r.canceled)return false;
 // The same durable replacement used for notebooks avoids partial exports.
 await store.atomic(r.filePath,data);return true;
}
function createWindow(){
 closing=false;rendererReady=false;
 win=new BrowserWindow({width:1280,height:880,minWidth:760,minHeight:560,title:'Lemma',backgroundColor:'#faf9f6',titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:22},webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.on('close',event=>{if(!closing){event.preventDefault();win.webContents.send('before-close');}});
 win.once('closed',()=>{win=null;rendererReady=false;});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
 win.loadFile(path.join(__dirname,'../dist/index.html'));
}
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(()=>{
 store=new NotebookStore(notebookDirectory);
 handle('load',()=>store.load());
 handle('save',data=>store.save(data));
 handle('copy-text',data=>{if(typeof data!=='string'||data.length>2_000_000)throw Error('Invalid clipboard content');clipboard.writeText(data);});
 handle('versions',()=>store.listVersions());
 handle('read-version',id=>store.readVersion(id));
 handle('renderer-ready',()=>{rendererReady=true;return drainFiles();});
 handle('export-document',data=>exportText(data,'lemma','Lemma page'));
 handle('export-latex',data=>exportText(data,'tex','LaTeX document'));
 handle('export-text',data=>exportText(data,'txt','Plain text'));
 handle('import-document',async()=>{
  const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Lemma or LaTeX',extensions:['lemma','folio','json','tex','latex']}]});
  return r.canceled?null:readPageFile(r.filePaths[0]);
 });
 handle('export-pdf',async()=>{
  const r=await dialog.showSaveDialog(win,{defaultPath:'Canvas.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;
  const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});await store.atomic(r.filePath,pdf);return true;
 });
 const action=(label,accelerator,name)=>({label,accelerator,click:()=>send(name)});
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'Lemma',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
  {label:'File',submenu:[action('New canvas','CmdOrCtrl+N','new'),action('Open canvas…','CmdOrCtrl+O','open'),{type:'separator'},action('Export page…','CmdOrCtrl+Shift+S','export'),action('Export LaTeX…',null,'latex'),action('Export plain text…',null,'text'),action('Export PDF…','CmdOrCtrl+Shift+P','pdf'),{type:'separator'},action('Previous versions…',null,'versions')]},
  {label:'Edit',submenu:[action('Undo','CmdOrCtrl+Z','undo'),action('Redo','CmdOrCtrl+Shift+Z','redo'),{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{type:'separator'},action('Find…','CmdOrCtrl+F','find'),action('Find next','CmdOrCtrl+G','findNext'),action('Find previous','CmdOrCtrl+Shift+G','findPrevious'),action('Replace…','Alt+CmdOrCtrl+F','replace'),action('Insert LaTeX…','CmdOrCtrl+Shift+L','insertLatex'),action('Copy selection as LaTeX',null,'copyLatex')]},
  {label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}
 ]));
 ipcMain.on('finish-close',async event=>{trusted(event);await store.writes.catch(()=>{});closing=true;if(quitting)app.quit();else win.close();});
 createWindow();
 for(const file of process.argv.slice(1))queueFile(file);
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('before-quit',()=>{quitting=true;});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
