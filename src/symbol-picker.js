import {SYMBOL_GROUPS,MATH_SYMBOLS,findSymbols} from './math-symbols.js';
export function installSymbolPicker(root,onSelect,onClose){
 const doc=root.ownerDocument;
 root.setAttribute('aria-label','Math symbols');
 root.innerHTML='<div class="symbol-picker-tools"><input type="search" aria-label="Search symbols" placeholder="Search symbols…" autocomplete="off"><select aria-label="Symbol category"><option value="common">Common</option><option value="all">All symbols</option></select></div><div class="symbol-picker-grid" role="group" aria-label="Symbol results"></div><span class="symbol-picker-status" role="status" aria-live="polite"></span>';
 const search=root.querySelector('input'),category=root.querySelector('select'),grid=root.querySelector('.symbol-picker-grid'),status=root.querySelector('[role=status]');
 for(const group of SYMBOL_GROUPS){const option=doc.createElement('option');option.value=group.id;option.textContent=group.label;category.append(option);}
 function render(){
  const entries=findSymbols(search.value,category.value);grid.replaceChildren();
  for(const [index,entry] of entries.entries()){
   const button=doc.createElement('button');button.type='button';button.textContent=entry.symbol;button.title=entry.label;button.setAttribute('aria-label',entry.label+' '+entry.symbol);button.dataset.symbol=entry.symbol;button.tabIndex=index===0?0:-1;button.onclick=()=>onSelect(entry.symbol);grid.append(button);
  }
  status.textContent=entries.length?`${entries.length} of ${MATH_SYMBOLS.length} symbols`:'No symbols found. Try another name or category.';
 }
 search.oninput=render;category.onchange=render;
 search.onkeydown=event=>{if(event.key==='Enter'||event.key==='ArrowDown'){event.preventDefault();const first=grid.querySelector('button');if(first){if(event.key==='Enter')first.click();else first.focus();}}};
 grid.onkeydown=event=>{
  const buttons=[...grid.querySelectorAll('button')],index=buttons.indexOf(event.target);if(index<0)return;
  const style=doc.defaultView.getComputedStyle(grid),tracks=style.gridTemplateColumns.split(' ').filter(Boolean),columns=tracks.length>1?tracks.length:8;
  const offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[event.key];
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:offset!==undefined?Math.max(0,Math.min(buttons.length-1,index+offset)):null;
  if(next!==null){event.preventDefault();buttons[index].tabIndex=-1;buttons[next].tabIndex=0;buttons[next].focus();}
 };
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}});
 return {open(){render();search.focus();},reset(){search.value='';category.value='common';}};
}
