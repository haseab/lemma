const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
function valid(raw){
 const n=JSON.parse(raw);
 if(![1,2,3].includes(n?.version)||!Array.isArray(n.documents)||!n.documents.length||n.documents.length>1000)throw Error('Invalid notebook');
 const ids=new Set();for(const d of n.documents){
  if(typeof d?.id!=='string'||ids.has(d.id))throw Error('Invalid page');ids.add(d.id);
  if(d.content?.type==='math-page'){if(typeof d.content.latex!=='string'||d.content.latex.length>2_000_000)throw Error('Invalid page');}
  else{
   if(d.content?.type!=='doc'||!Array.isArray(d.content.content))throw Error('Invalid page');
   const types=new Set(['doc','paragraph','text','heading','bulletList','orderedList','listItem','blockquote','codeBlock','hardBreak','horizontalRule','math','equation']);let count=0;
   function check(node,depth=0){if(!node||!types.has(node.type)||depth>40||++count>50000)throw Error('Invalid legacy page');if(node.type==='text'&&typeof node.text!=='string')throw Error('Invalid legacy text');if(node.content){if(!Array.isArray(node.content))throw Error('Invalid legacy content');for(const child of node.content)check(child,depth+1);}}check(d.content);
  }
 }
 return n;
}
class NotebookStore{
 constructor(directory,{io=fs,keep=40,now=()=>Date.now(),interval=60_000}={}){this.io=io;this.directory=directory;this.file=path.join(directory,'notebook.json');this.journal=this.file+'.recovery';this.versions=path.join(directory,'versions');this.keep=keep;this.now=now;this.interval=interval;this.writes=Promise.resolve();}
 async atomic(file,raw){
  await this.io.mkdir(path.dirname(file),{recursive:true});
  const temp=file+'.'+crypto.randomUUID()+'.tmp';let handle;
  try{
   handle=await this.io.open(temp,'wx',0o600);await handle.writeFile(raw,'utf8');await handle.sync();await handle.close();handle=null;
   await this.io.rename(temp,file);
   let dir;try{dir=await this.io.open(path.dirname(file),'r');await dir.sync();}catch(e){if(!['EINVAL','EISDIR','EPERM','ENOTSUP'].includes(e.code))throw e;}finally{await dir?.close();}
  }finally{await handle?.close();await this.io.unlink(temp).catch(()=>{});}
 }
 async candidates(){
  const versions=await this.listVersions();return [this.file,this.journal,...versions.map(v=>path.join(this.versions,v.id))];
 }
 async load(){
  let main=null,journal=null,hadMain=false;
  for(const [file,key]of [[this.file,'main'],[this.journal,'journal']]){
   try{const stat=await this.io.stat(file);if(stat.size>20_000_000)throw Error('Invalid oversized notebook');const raw=await this.io.readFile(file,'utf8'),notebook=valid(raw);if(key==='main'){main={notebook,raw,time:stat.mtimeMs};hadMain=true;}else journal={notebook,raw,time:stat.mtimeMs};}
   catch(e){if(e.code!=='ENOENT')hadMain=true;}
  }
  if(journal&&(!main||journal.time>=main.time)&&journal.raw!==main?.raw)return {notebook:journal.notebook,recovery:{source:'interrupted save'}};
  if(main)return {notebook:main.notebook,recovery:null};
  for(const v of await this.listVersions()){
   try{return {notebook:await this.readVersion(v.id),recovery:{source:'automatic backup',createdAt:v.createdAt}};}catch{}
  }
  if(hadMain)throw Error('Saved notebook could not be recovered. The original files are preserved.');
  return {notebook:null,recovery:null};
 }
 save(raw){
  if(typeof raw!=='string'||Buffer.byteLength(raw)>20_000_000)return Promise.reject(Error('Notebook exceeds the 20 MB limit'));
  try{valid(raw);}catch(error){return Promise.reject(error);}
  const job=this.writes.catch(()=>{}).then(()=>this.write(raw));this.writes=job;return job;
 }
 async write(raw){
  try{const old=await this.io.readFile(this.journal,'utf8');try{valid(old);}catch{await this.atomic(path.join(this.directory,'recovery-original-journal-'+this.now()+'.json'),old);}}catch(error){if(error.code!=='ENOENT')throw error;}
  await this.atomic(this.journal,raw);
  let previous;
  try{previous=await this.io.readFile(this.file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous&&previous!==raw){
   try{valid(previous);await this.backup(previous);}catch(e){
    if(e instanceof SyntaxError||e.message.startsWith('Invalid'))await this.atomic(path.join(this.directory,'recovery-original-'+this.now()+'.json'),previous);
    else throw e;
   }
  }
  await this.atomic(this.file,raw);
  await this.io.unlink(this.journal).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await this.prune().catch(()=>{});
 }
 async backup(raw){
  const hash=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
  const existing=await this.listVersions();if(existing[0]?.id.includes(hash)||existing[0]&&this.now()-existing[0].createdAt<this.interval)return;
  await this.atomic(path.join(this.versions,String(this.now())+'-'+hash+'.json'),raw);
 }
 async listVersions(){
  let names;try{names=await this.io.readdir(this.versions);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  return names.filter(n=>/^\d{13,}-[a-f0-9]{16}\.json$/.test(n)).sort().reverse().map(id=>({id,createdAt:Number(id.split('-')[0])}));
 }
 async readVersion(id){
  if(!/^\d{13,}-[a-f0-9]{16}\.json$/.test(id))throw Error('Invalid backup');
  const file=path.join(this.versions,id);if((await this.io.stat(file)).size>20_000_000)throw Error('Invalid backup size');
  const raw=await this.io.readFile(file,'utf8');if(crypto.createHash('sha256').update(raw).digest('hex').slice(0,16)!==id.split('-')[1].slice(0,16))throw Error('Invalid backup checksum');
  return valid(raw);
 }
 async prune(){const list=await this.listVersions();for(const v of list.slice(this.keep))await this.io.unlink(path.join(this.versions,v.id));}
}
module.exports={NotebookStore,valid};
