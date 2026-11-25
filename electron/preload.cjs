const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lemma',{
 onBeforeClose:fn=>ipcRenderer.on('before-close',fn),finishClose:()=>ipcRenderer.send('finish-close'),
 load:()=>ipcRenderer.invoke('load'),save:data=>ipcRenderer.invoke('save',data),
 copyText:data=>ipcRenderer.invoke('copy-text',data),
 versions:()=>ipcRenderer.invoke('versions'),readVersion:id=>ipcRenderer.invoke('read-version',id),
 ready:()=>ipcRenderer.invoke('renderer-ready'),
 exportDocument:data=>ipcRenderer.invoke('export-document',data),
 exportLatex:data=>ipcRenderer.invoke('export-latex',data),exportText:data=>ipcRenderer.invoke('export-text',data),
 importDocument:()=>ipcRenderer.invoke('import-document'),exportPDF:()=>ipcRenderer.invoke('export-pdf'),print:()=>ipcRenderer.invoke('print-page'),
 onAction:fn=>ipcRenderer.on('menu-action',(_,action)=>fn(action)),
 onOpenFile:fn=>ipcRenderer.on('open-page-file',(_,file)=>fn(file)),onFileError:fn=>ipcRenderer.on('file-open-error',(_,message)=>fn(message))
});
