import {FONT_CATALOG,FONT_CATEGORIES,fontById,matchingFonts} from './font-catalog.js';
import {applyTextFont,currentTextFont} from './text-fonts.js';
const chevron='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const searchIcon='<svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.5" cy="7.5" r="4.75"/><path d="m11 11 4 4"/></svg>';
export function installFontPicker(select,getField,onChange=()=>{}){
 const document=select.ownerDocument,win=document.defaultView;
 const button=document.createElement('button');button.id=select.id;button.type='button';button.className='font-picker-trigger';button.setAttribute('aria-label','Font family');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.innerHTML='<span class="font-trigger-sample" aria-hidden="true">Aa</span><span class="font-trigger-name">System Sans</span>'+chevron;select.replaceWith(button);
 const panel=document.createElement('section');panel.className='font-picker';panel.id='font-picker-panel';panel.hidden=true;panel.dataset.noTooltip='';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Choose a typeface');
 panel.innerHTML=`<div class="font-picker-heading"><div><span class="font-eyebrow">MAKE IT YOURS</span><h2>Typography</h2></div><span class="font-count">${FONT_CATALOG.length} typefaces</span></div><label class="font-search">${searchIcon}<input type="search" placeholder="Find a typeface…" aria-label="Search fonts" autocomplete="off" spellcheck="false"></label><div class="font-categories" role="group" aria-label="Typeface categories"></div><div class="font-options" id="font-options" role="listbox" aria-label="Font families"></div><div class="font-preview"><span class="font-preview-label">PREVIEW</span><div class="font-preview-sentence"></div><div class="font-preview-alphabet">Aa Bb Cc &nbsp; 0123456789</div></div><div class="font-picker-footer"><span>Text typefaces · equations keep their math font</span><kbd>esc</kbd></div>`;
 document.body.append(panel);button.setAttribute('aria-controls',panel.id);
 const input=panel.querySelector('input'),list=panel.querySelector('.font-options'),tabs=panel.querySelector('.font-categories');input.setAttribute('aria-controls',list.id);
 let category='All',active=0,fonts=[],savedSelection,owner,selected='system',sample='Make room for a good idea.',disposed=false;
 const controller=new AbortController(),listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:controller.signal});
 const preview=font=>{
  if(!font)return;panel.querySelector('.font-preview-sentence').textContent=sample;
  panel.querySelector('.font-preview').style.setProperty('--preview-font',font.css);
  panel.querySelector('.font-preview-label').textContent=font.name.toUpperCase();
 };
 function sync(){
  if(disposed||!panel.hidden)return;
  const font=currentTextFont(getField());selected=font?.id||null;
  button.querySelector('.font-trigger-name').textContent=font?.name||'Mixed fonts';
  button.querySelector('.font-trigger-sample').style.fontFamily=font?.css||'inherit';
 }
 function setActive(index,scroll=false){
  active=Math.max(0,Math.min(index,fonts.length-1));
  for(const [index,row]of [...list.querySelectorAll('[role=option]')].entries())row.classList.toggle('is-active',index===active);
  const row=list.querySelectorAll('[role=option]')[active];
  if(row){input.setAttribute('aria-activedescendant',row.id);if(scroll)row.scrollIntoView({block:'nearest'});preview(fonts[active]);}
  else{input.removeAttribute('aria-activedescendant');preview(fontById(selected)||fontById('system'));}
 }
 function render(){
  fonts=matchingFonts(input.value,category);list.replaceChildren();
  for(const font of fonts){
   const row=document.createElement('button');row.type='button';row.className='font-option';row.id='font-option-'+font.id;row.setAttribute('role','option');row.setAttribute('aria-selected',String(font.id===selected));row.tabIndex=-1;
   const text=document.createElement('span');text.className='font-option-copy';const name=document.createElement('span');name.className='font-option-name';name.textContent=font.name;name.style.fontFamily=font.css;const detail=document.createElement('span');detail.className='font-option-detail';detail.textContent=font.description;text.append(name,detail);
   const swatch=document.createElement('span');swatch.className='font-option-sample';swatch.setAttribute('aria-hidden','true');swatch.style.fontFamily=font.css;swatch.textContent='Ag';
   const check=document.createElement('span');check.className='font-option-check';check.textContent=font.id===selected?'✓':'';check.setAttribute('aria-hidden','true');row.append(text,swatch,check);list.append(row);
   row.addEventListener('pointerenter',()=>setActive(fonts.indexOf(font)));row.addEventListener('mousedown',event=>event.preventDefault());row.addEventListener('click',()=>choose(font));
  }
  if(!fonts.length){const empty=document.createElement('p');empty.className='font-empty';empty.textContent='No typefaces found. Try another name or category.';empty.setAttribute('role','status');list.append(empty);}
  setActive(Math.max(0,fonts.findIndex(font=>font.id===selected)));
  for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.textContent===category));
 }
 function position(){
  if(panel.hidden)return;const rect=button.getBoundingClientRect(),gap=8,margin=12;
  panel.style.width=Math.min(370,win.innerWidth-margin*2)+'px';panel.style.maxHeight=(win.innerHeight-margin*2)+'px';list.style.maxHeight='287px';
  const chrome=panel.getBoundingClientRect().height-list.getBoundingClientRect().height;
  const below=win.innerHeight-rect.bottom-gap-margin,above=rect.top-gap-margin;
  const ideal=panel.getBoundingClientRect().height,down=below>=ideal||below>=above;
  let available=Math.max(0,down?below:above),floating=available<chrome+63;
  if(floating)available=win.innerHeight-margin*2;
  const rows=Math.max(1,Math.min(5,Math.floor((available-chrome-7)/56)));
  list.style.maxHeight=(rows*56+7)+'px';panel.style.maxHeight=available+'px';
  const height=panel.getBoundingClientRect().height,left=Math.max(margin,Math.min(rect.left,win.innerWidth-panel.getBoundingClientRect().width-margin));
  const top=floating?Math.max(margin,Math.min(rect.bottom+gap,win.innerHeight-height-margin)):down?rect.bottom+gap:rect.top-height-gap;
  panel.style.left=left+'px';panel.style.top=top+'px';
 }
 function close({focus=false}={}){panel.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();sync();}
 function choose(font){
  if(getField()!==owner){close();return;}
  owner.selection=structuredClone(savedSelection);
  const apply=()=>applyTextFont(owner,font.id);
  if(owner.pageHistory)owner.pageHistory.transaction(apply);else apply();
  close();onChange();owner.focus();sync();
 }
 function open(){
  owner=getField();if(!owner||owner.readOnly||owner.disabled)return;
  owner.pageHistory?.flush();savedSelection=structuredClone(owner.selection);
  selected=currentTextFont(owner)?.id||owner.textFont||'system';
  const text=owner.selectionIsCollapsed?'':owner.getValue(owner.selection,'plain-text').trim();sample=text?text.slice(0,90):'Make room for a good idea.';
  input.value='';category='All';panel.hidden=false;button.setAttribute('aria-expanded','true');render();position();input.focus();
 }
 for(const name of FONT_CATEGORIES){const tab=document.createElement('button');tab.type='button';tab.textContent=name;tab.setAttribute('aria-pressed',String(name===category));tabs.append(tab);tab.onclick=()=>{category=name;render();position();input.focus();};}
 listen(button,'mousedown',event=>event.preventDefault());listen(button,'click',()=>panel.hidden?open():close({focus:true}));
 listen(input,'input',()=>{render();position();});
 listen(panel,'keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close({focus:true});}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&!event.ctrlKey&&!event.metaKey&&(!['Home','End'].includes(event.key)||event.target!==input||!input.value)){event.preventDefault();setActive(event.key==='Home'?0:event.key==='End'?fonts.length-1:active+(event.key==='ArrowDown'?1:-1),true);}
  else if(event.key==='Enter'&&event.target===input&&fonts[active]){event.preventDefault();choose(fonts[active]);}
 });
 listen(document,'pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target))close();}, {capture:true});
 listen(document,'focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button)close();else sync();});
 for(const name of ['selection-change','input','text-font-change'])listen(document,name,sync,{capture:true});
 listen(win,'resize',position);listen(document,'scroll',event=>{if(!panel.contains(event.target))position();},{capture:true});
 sync();return {sync,close,dispose(){disposed=true;controller.abort();panel.remove();}};
}
