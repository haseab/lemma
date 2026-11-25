import {builtinEntries,appendBuiltinRows} from './builtin-dictionaries.js';
import {installDictionaryControls} from './dictionary-controls.js';
import {NOTATION_GROUPS,ALL_NOTATION_GROUPS,loadNotationGroups,saveNotationGroups} from './math-words.js';
export function installNotationControl(toolbar,getField,onMessage=()=>{}){
 const doc=toolbar.ownerDocument,button=doc.createElement('button');button.type='button';button.className='notation-toggle';button.textContent='∀';button.title='Notation & dictionaries';button.setAttribute('aria-label','Notation & dictionaries');button.setAttribute('aria-haspopup','dialog');
 toolbar.querySelector('.modes').after(button);
 const dialog=doc.createElement('dialog');dialog.className='notation-dialog';dialog.setAttribute('aria-label','Automatic notation');
 dialog.innerHTML='<button class="notation-close" aria-label="Close notation settings">×</button><h2>Automatic notation</h2><p>Turn words and phrases into notation.</p><details id="notation-builtins" class="notation-builtins"><summary>Built-in notation<span data-notation-count></span></summary><div class="notation-all"><button data-all="on">All on</button><button data-all="off">All off</button></div><div class="notation-options"></div></details><section id="notation-custom" aria-label="My dictionary"></section>';

 for(const group of NOTATION_GROUPS){
  const row=doc.createElement('div');row.className='builtin-group';
  const details=doc.createElement('details');details.className='builtin-dictionary';details.dataset.dictionary=group.id;
  const summary=doc.createElement('summary'),label=doc.createElement('span'),size=doc.createElement('span');label.textContent=group.label;size.className='builtin-entry-count';size.textContent=String(builtinEntries(group).length);size.setAttribute('aria-label',size.textContent+' entries');summary.append(label,size);
  const list=doc.createElement('div');list.className='builtin-entries';list.setAttribute('aria-label',group.label+' dictionary');
  details.append(summary,list);let loaded=false;
  details.addEventListener('toggle',()=>{if(details.open&&!loaded){appendBuiltinRows(list,builtinEntries(group,getField()?.getNotationShortcuts?.()||{}));loaded=true;}});
  const input=doc.createElement('input');input.type='checkbox';input.value=group.id;input.className='builtin-enable';input.setAttribute('aria-label','Enable '+group.label);
  row.append(details,input);dialog.querySelector('.notation-options').append(row);
 }
 const inputs=[...dialog.querySelectorAll('input')];
 function count(){const enabled=inputs.filter(input=>input.checked).length;dialog.querySelector('[data-notation-count]').textContent=enabled===inputs.length?'All on':enabled===0?'Off':`${enabled} of ${inputs.length} on`;}
 function render(){let selected;try{selected=getField()?.notationGroups||loadNotationGroups(doc.defaultView.localStorage);}catch{selected=[...ALL_NOTATION_GROUPS];}for(const input of inputs)input.checked=selected.includes(input.value);count();}
 function save(){
  count();
  const selected=inputs.filter(input=>input.checked).map(input=>input.value);
  const fields=new Set([...doc.querySelectorAll('math-field'),getField()].filter(Boolean));
  for(const field of fields)if(field.setNotationGroups)field.setNotationGroups(selected);else field.notationGroups=selected;
  try{saveNotationGroups(doc.defaultView.localStorage,selected);}catch{onMessage('Notation settings could not be saved. This session still uses your choices.');}
 }
 dialog.querySelector('#notation-builtins').addEventListener('change',event=>{if(inputs.includes(event.target))save();});dialog.querySelector('.notation-close').onclick=()=>dialog.close();
 for(const control of dialog.querySelectorAll('[data-all]'))control.onclick=()=>{for(const input of inputs)input.checked=control.dataset.all==='on';save();};
 const custom=installDictionaryControls(dialog.querySelector('#notation-custom'),getField,onMessage);
 button.onclick=()=>{render();custom.refresh();dialog.querySelector('#notation-builtins').open=false;dialog.showModal();};dialog.addEventListener('close',()=>button.focus());doc.body.append(dialog);
 return {button,dialog};
}
