import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const kinds=new Set(['paste','beforeinput','input','focus','blur','compositionstart','compositionend'].flatMap(type=>{
 const names=['input','beforeinput'].includes(type)?['insertFromPaste','insertText','insertReplacementText','insertCompositionText','deleteContentBackward','other'].map(value=>`${type}:${value}`):[type];
 return names.flatMap(name=>[name,`${name}:settled`]);
}).concat(['paste:converted','paste:echo-suppressed','input:recovered','input:readback-retained','paste:awaiting-native-input']));
const booleans=['trusted','cancelled','focused','changed','native','handled'];
const numbers=['id','ms','characters','bufferCharacters'];
export function validatePasteReport(body){
 if(body?.schema!==1||!/^[-a-f0-9]{36}$/.test(body.capture||'')||!Array.isArray(body.events)||body.events.length>120)throw Error('Invalid report');
 if(Object.keys(body).some(key=>!['schema','capture','events'].includes(key)))throw Error('Unexpected report data');
 for(const row of body.events){
  if(!row||!kinds.has(row.kind)||!Number.isSafeInteger(row.id)||!Number.isSafeInteger(row.ms))throw Error('Invalid event');
  for(const [key,value]of Object.entries(row)){
   if(key==='kind')continue;
   if(booleans.includes(key)&&typeof value==='boolean')continue;
   if(numbers.includes(key)&&Number.isSafeInteger(value)&&value>=0)continue;
   throw Error('Unexpected event data');
  }
 }
 return body;
}
// Only the development server imports this module. Production has no receiver.
export function createPasteReportStore(directory){
 let queue=Promise.resolve();
 return async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(!directory){reply(404,{enabled:false});return;}
  if(req.method==='GET'){reply(200,{service:'lemma-paste-diagnostics',schema:1,enabled:true});return;}
  if(req.method!=='POST'){reply(405,{error:'Unsupported method'});return;}
  if(req.headers['sec-fetch-site']==='cross-site'||req.headers['content-type']!=='application/json'){reply(403,{error:'Same-origin JSON required'});return;}
  try{
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>65536){reply(413,{error:'Report too large'});return;}chunks.push(chunk);}
   const report=validatePasteReport(JSON.parse(Buffer.concat(chunks).toString('utf8')));
   const save=async()=>{
    await mkdir(directory,{recursive:true,mode:0o700});
    const target=path.join(directory,`${report.capture}.json`),temporary=path.join(directory,`.${randomUUID()}.tmp`);
    await writeFile(temporary,JSON.stringify(report,null,2),{mode:0o600,flag:'wx'});await rename(temporary,target);
   };
   const saved=queue.then(save);queue=saved.catch(()=>{});await saved;
   reply(200,{saved:true});
  }catch{reply(400,{error:'Report rejected or unavailable'});}
 };
}
