const {app,BrowserWindow,ipcMain,dialog,Menu}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
let win; let quitting=false; let closing=false; let writes=Promise.resolve();
const send=(action)=>win?.webContents.send('menu-action',action);
app.setName('Lemma');
// Retain the original storage location so existing notebooks and preferences survive the rename.
const notebookDirectory=path.join(app.getPath('appData'),'Folio');
require('node:fs').mkdirSync(notebookDirectory,{recursive:true});
app.setPath('userData',notebookDirectory);
app.whenReady().then(()=>{
 const statePath=path.join(app.getPath('userData'),'notebook.json');
 ipcMain.handle('load',async()=>{try{return JSON.parse(await fs.readFile(statePath,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('Could not read saved notebook. Your existing file has been preserved.');}});
 ipcMain.handle('save',(_,data)=>{if(typeof data!=='string'||Buffer.byteLength(data)>20_000_000)throw Error('Notebook exceeds the 20 MB limit');JSON.parse(data);
  const task=writes.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(statePath),{recursive:true});if(JSON.parse(data).version===2){try{const previous=JSON.parse(await fs.readFile(statePath,'utf8'));if(previous.version===1)await fs.copyFile(statePath,statePath+'.before-math-page',require('node:fs').constants.COPYFILE_EXCL);}catch(error){if(!['ENOENT','EEXIST'].includes(error.code))throw error;}}await fs.writeFile(statePath+'.tmp',data);await fs.rename(statePath+'.tmp',statePath);});writes=task;return task;});
 ipcMain.handle('export-document',async(_,data)=>{if(typeof data!=='string'||Buffer.byteLength(data)>20_000_000)throw Error('Invalid document');const result=await dialog.showSaveDialog(win,{defaultPath:'Canvas.lemma',filters:[{name:'Lemma canvas',extensions:['lemma']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,data);return true;});
 ipcMain.handle('import-document',async()=>{const r=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'Lemma canvas',extensions:['lemma','folio','json']}]});if(r.canceled)return null;const p=r.filePaths[0];if((await fs.stat(p)).size>20_000_000)throw Error('File exceeds 20 MB');return fs.readFile(p,'utf8');});
 ipcMain.handle('export-pdf',async()=>{const r=await dialog.showSaveDialog(win,{defaultPath:'Canvas.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;const pdf=await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true});await fs.writeFile(r.filePath,pdf);return true;});
 const template=[{label:'Lemma',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},{label:'File',submenu:[{label:'New canvas',accelerator:'CmdOrCtrl+N',click:()=>send('new')},{label:'Open canvas…',accelerator:'CmdOrCtrl+O',click:()=>send('open')},{label:'Export canvas…',accelerator:'CmdOrCtrl+Shift+S',click:()=>send('export')},{label:'Export PDF…',accelerator:'CmdOrCtrl+Shift+P',click:()=>send('pdf')}]},{role:'editMenu'},{label:'View',submenu:[{role:'reload'},{role:'toggleDevTools'},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}];Menu.setApplicationMenu(Menu.buildFromTemplate(template));
 ipcMain.on('finish-close',()=>{closing=true;if(quitting)app.quit();else win.close();});
 function createWindow(){closing=false;win=new BrowserWindow({width:1280,height:880,minWidth:760,minHeight:560,title:'Lemma',backgroundColor:'#faf9f6',titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:22},webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.on('close',e=>{if(!closing){e.preventDefault();win.webContents.send('before-close');}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'../dist/index.html'));}
 createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('before-quit',()=>{quitting=true;});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
