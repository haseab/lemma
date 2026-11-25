import {validateDocument} from '../src/document.js';
import {validateHistory} from '../src/history.js';
export const STORAGE_KEY='lemma.web.scratchpad.v1';
export function validateScratchpad(value){
 if(value?.version!==1||typeof value.title!=='string')throw Error('Invalid saved scratchpad');
 const content=validateDocument(value.content);
 return {version:1,title:value.title.slice(0,200),content,history:validateHistory(value.history,content.latex)};
}
export function loadScratchpad(storage){
 let found=false;
 for(const key of [STORAGE_KEY,STORAGE_KEY+'.backup']){
  const raw=storage.getItem(key);if(!raw)continue;found=true;
  try{return {page:validateScratchpad(JSON.parse(raw)),recovered:key!==STORAGE_KEY};}catch{}
 }
 if(found)throw Error('Saved scratchpad could not be read. Export new work before closing; the saved data has been preserved.');
 return {page:null,recovered:false};
}
export function saveScratchpad(storage,page){
 const data=JSON.stringify(validateScratchpad(page));
 const old=storage.getItem(STORAGE_KEY);
 // Keep a valid prior copy, and never replace it with corrupt data.
 if(old){try{validateScratchpad(JSON.parse(old));storage.setItem(STORAGE_KEY+'.backup',old);}catch(error){if(error?.name==='QuotaExceededError'||error?.name==='SecurityError')throw error;}}
 storage.setItem(STORAGE_KEY,data);
}
