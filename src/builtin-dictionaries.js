import {notationTemplate} from './notation-templates.js';
// The inspector reads the same catalogue and shortcut definitions as typing.
export function builtinEntries(group,shortcuts={}){
 const entries=group.phrases.map(entry=>({...entry})),seen=new Set(entries.map(entry=>entry.text.toLowerCase()));
 for(const word of group.operators){if(seen.has(word.toLowerCase()))continue;seen.add(word.toLowerCase());entries.push({text:word,latex:`\\operatorname{\\mathrm{${word}}}`});}
 for(const word of group.words){if(seen.has(word.toLowerCase()))continue;seen.add(word.toLowerCase());const shortcut=shortcuts[word],latex=typeof shortcut==='string'?shortcut:shortcut?.value;entries.push({text:word,latex:latex||word,note:latex?'':'Recognized mathematical word'});}
 if(group.id==='linear')for(const text of ['3x3 matrix','3×3 matrix','3 by 3 matrix'])entries.push({text,...notationTemplate({kind:'matrix',rows:3,columns:3}),note:'Matrix dimensions can range from 1 to 10.'});
 return entries;
}
export function appendBuiltinRows(root,entries){
 const doc=root.ownerDocument;
 for(const entry of entries){
  const row=doc.createElement('div');row.className='dictionary-entry builtin-entry';
  const phrase=doc.createElement('span');phrase.textContent=entry.text;if(entry.note)phrase.title=entry.note;
  const arrow=doc.createElement('span');arrow.className='builtin-mapping-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
  const symbol=doc.createElement('math-field');symbol.readOnly=true;symbol.setAttribute('read-only','');symbol.tabIndex=-1;symbol.mathVirtualKeyboardPolicy='manual';symbol.setAttribute('aria-label','Notation for '+entry.text);symbol.value=entry.latex;
  row.append(phrase,arrow,symbol);root.append(row);
 }
}
