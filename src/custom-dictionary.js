import {notationTemplate} from './notation-templates.js';
import {validateLatex} from 'mathlive/ssr';
const KEY='lemma.dictionaries.v1';
export const DICTIONARY_LIMIT=500;
export function normalizePhrase(text){return typeof text==='string'?text.trim().replace(/\s+/g,' ').toLowerCase():'';}
export function validDictionaryPhrase(text){return text.length>=2&&text.length<=80&&/^[a-z0-9]+(?:[ ×][a-z0-9]+)*$/.test(text)&&/[a-z]/.test(text);}
function balancedGroups(latex){
 let depth=0;
 for(let i=0;i<latex.length;i++){if(latex[i]==='\\'){i++;continue;}if(latex[i]==='{')depth++;else if(latex[i]==='}'&&--depth<0)return false;}
 return depth===0;
}
export function validateDictionaryEntry(value){
 const text=normalizePhrase(value?.text),structured=value?.notation?notationTemplate(value.notation):null,latex=structured?.latex||(typeof value?.latex==='string'?value.latex.trim():'');
 if(!validDictionaryPhrase(text))throw new Error('Use 2–80 letters, numbers, spaces, or ×, including at least one letter.');
 if(!latex||latex.length>500||!balancedGroups(latex)||/[\r\n]/.test(latex)||!structured&&/\\(?:begin|end|def|gdef|newcommand|renewcommand|html\w*|href|url|class|cssId|style)\b/.test(latex)||validateLatex(latex).length)throw new Error('Enter a supported symbol or expression, such as ∈ or ∑.');
 return {text,latex,context:value.context!==false,enabled:value.enabled!==false,...(structured?{notation:structured.notation}:{})};
}
export function validateDictionaries(value){
 if(!Array.isArray(value)||value.length>32)throw new Error('Use at most 32 dictionaries.');
 const ids=new Set(),phrases=new Set();let count=0;
 return value.map(library=>{
  if(typeof library?.id!=='string'||! /^[\w-]{1,80}$/.test(library.id)||ids.has(library.id))throw new Error('Dictionary identifiers must be unique.');ids.add(library.id);
  const name=typeof library.name==='string'?library.name.trim():'';
  if(!name||name.length>64||/[\x00-\x1f<>]/.test(name))throw new Error('Give the dictionary a name of 1–64 characters.');
  if(!Array.isArray(library.entries)||(count+=library.entries.length)>DICTIONARY_LIMIT)throw new Error('Use at most 500 custom phrases.');
  const entries=library.entries.map(value=>{const entry=validateDictionaryEntry(value);if(phrases.has(entry.text))throw new Error('Each custom phrase must be unique: '+entry.text);phrases.add(entry.text);return entry;});
  return {id:library.id,name,enabled:library.enabled!==false,entries};
 });
}
export function loadDictionaries(storage){try{const raw=storage?.getItem(KEY);return raw?validateDictionaries(JSON.parse(raw)):[];}catch{return [];}}
export function saveDictionaries(storage,value){const libraries=validateDictionaries(value);storage.setItem(KEY,JSON.stringify(libraries));return libraries;}
export function dictionaryPhrases(libraries=[],includeDisabled=false){return libraries.filter(library=>includeDisabled||library.enabled).flatMap(library=>library.entries.filter(entry=>includeDisabled||entry.enabled).map(entry=>({...entry,latex:entry.notation?entry.latex:`\\mathord{${entry.latex}}`,target:entry.latex,template:!!entry.notation,custom:true,group:'custom'})));}
export function exportDictionaries(libraries){return JSON.stringify({version:1,libraries:validateDictionaries(libraries)},null,2)+'\n';}
export function importDictionaries(text){if(typeof text!=='string'||text.length>2_000_000)throw new Error('Choose a dictionary file smaller than 2 MB.');let data;try{data=JSON.parse(text);}catch{throw new Error('Choose a valid dictionary JSON file.');}if(data?.version!==1)throw new Error('Unsupported dictionary version.');return validateDictionaries(data.libraries);}
// Older versions stored multiple libraries. Merge entries without re-enabling
// phrases that belonged to a disabled library.
export function singleDictionary(libraries=[]){
 const entries=validateDictionaries(libraries).flatMap(library=>library.entries.map(entry=>({...entry,enabled:library.enabled&&entry.enabled})));
 return [{id:'my-dictionary',name:'My dictionary',enabled:true,entries}];
}
