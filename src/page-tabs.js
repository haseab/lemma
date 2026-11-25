export function createPageTabs(root,{onSelect,onNew,onClose,onDuplicate,getPage,panelId='surface'}){
 const doc=root.ownerDocument,title=root.querySelector('#title');
 const list=doc.createElement('div');list.className='page-tab-list';list.setAttribute('role','tablist');list.setAttribute('aria-label','Pages');
 const add=doc.createElement('button');add.type='button';add.id='new-tab';add.className='new-tab';add.textContent='+';add.title='New page';add.setAttribute('aria-label','New page');add.onclick=onNew;
 let pages=[],activeId,buttons=new Map(),editing=false,original='',confirming=false,menu=null,menuTarget=null;
 function closeMenu(restore=false){if(!menu)return;menu.remove();menu=null;if(restore)buttons.get(menuTarget)?.focus();}
 function openMenu(id,x,y){
  closeMenu();menuTarget=id;menu=doc.createElement('div');menu.className='tab-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Page actions');
  for(const [action,label,handler] of [['rename','Rename page',()=>renamePage(id)],['duplicate','Duplicate page',()=>onDuplicate?.(id)],['delete','Delete page',()=>{void requestClose(id,'Delete');}]]){
   if(action==='duplicate'&&!onDuplicate||action==='delete'&&!onClose)continue;
   const item=doc.createElement('button');item.type='button';item.setAttribute('role','menuitem');item.dataset.tabAction=action;item.textContent=label;item.onclick=()=>{closeMenu();handler();};menu.append(item);
  }
  if(!menu.children.length){menu=null;return;}
  doc.body.append(menu);const rect=menu.getBoundingClientRect(),view=doc.defaultView;menu.style.left=Math.max(8,Math.min(x,view.innerWidth-(rect.width||180)-8))+'px';menu.style.top=Math.max(8,Math.min(y,view.innerHeight-(rect.height||88)-8))+'px';
  menu.onkeydown=event=>{const items=[...menu.querySelectorAll('button')],index=items.indexOf(doc.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus();}else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);}else if(event.key==='Tab')closeMenu(true);};
  menu.querySelector('button')?.focus();
 }
 doc.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target))closeMenu();});
 doc.addEventListener('scroll',()=>closeMenu(),true);
 async function requestClose(id,action='Close'){
  if(!onClose||confirming)return;
  const page=getPage?.(id)||pages.find(p=>p.id===id);if(!page)return;confirming=true;
  try{if(pageHasContent(page.content?.latex)&&!await confirmPageClose(doc,page.title,action)){buttons.get(id)?.focus();return;}onClose(id);}finally{confirming=false;}
 }
 title.hidden=true;title.classList.add('tab-title-editor');root.replaceChildren(list,add,title);
 function updateTitle(){const button=buttons.get(activeId);if(button){button.textContent=title.value||'Untitled page';button.parentElement.querySelector('.close-tab')?.setAttribute('aria-label','Close '+(title.value||'Untitled page'));}}
 function finish(){if(!editing)return;editing=false;title.hidden=true;const button=buttons.get(activeId);if(button)button.hidden=false;updateTitle();root.append(title);}
 title.addEventListener('blur',finish);
 title.addEventListener('input',updateTitle);
 title.addEventListener('keydown',event=>{
  if(!['Enter','Escape'].includes(event.key))return;
  event.preventDefault();if(event.key==='Escape'){title.value=original;title.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}
  finish();buttons.get(activeId)?.focus();
 });
 function renamePage(id){
  if(id!==activeId)onSelect(id);
  const button=buttons.get(id);if(id!==activeId||!button)return;
  original=title.value;editing=true;title.hidden=false;button.hidden=true;button.parentElement.insertBefore(title,button);title.focus();title.select();
 }
 function render(next,id){
  closeMenu();
  if(editing&&activeId===id&&pages.map(p=>p.id).join('\0')===next.map(p=>p.id).join('\0'))return;
  finish();pages=next;activeId=id;buttons=new Map();list.replaceChildren();
  for(const page of pages){
   const button=doc.createElement('button');button.type='button';button.className='page-tab';button.dataset.pageId=page.id;button.id='page-tab-'+encodeURIComponent(page.id);button.setAttribute('role','tab');button.setAttribute('aria-controls',panelId);button.setAttribute('aria-selected',String(page.id===activeId));button.tabIndex=page.id===activeId?0:-1;button.textContent=page.title||'Untitled page';button.title='Double-click to rename';
   button.onclick=()=>{if(page.id!==activeId)onSelect(page.id);};
   button.ondblclick=()=>renamePage(page.id);
   button.onkeydown=event=>{
    if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();const rect=button.getBoundingClientRect();openMenu(page.id,rect.left,rect.bottom);return;}
    if(event.key==='Delete'){event.preventDefault();void requestClose(page.id);return;}
    if(event.key==='F2'){event.preventDefault();button.ondblclick();return;}
    const index=pages.findIndex(p=>p.id===page.id);let target;
    if(event.key==='ArrowRight')target=pages[(index+1)%pages.length];else if(event.key==='ArrowLeft')target=pages[(index+pages.length-1)%pages.length];else if(event.key==='Home')target=pages[0];else if(event.key==='End')target=pages.at(-1);else return;
    event.preventDefault();onSelect(target.id);buttons.get(target.id)?.focus();
   };
   buttons.set(page.id,button);
   const item=doc.createElement('div');item.className='page-tab-item';item.setAttribute('role','presentation');item.append(button);
   item.oncontextmenu=event=>{if(event.target===title)return;event.preventDefault();event.stopPropagation();openMenu(page.id,event.clientX,event.clientY);};
   if(onClose){const close=doc.createElement('button');close.type='button';close.className='close-tab';close.dataset.closePage=page.id;close.textContent='×';close.setAttribute('aria-label','Close '+(page.title||'Untitled page'));close.title='Close page';close.onclick=event=>{event.stopPropagation();void requestClose(page.id);};item.append(close);}
   list.append(item);
  }
  buttons.get(activeId)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  const panel=doc.getElementById(panelId);panel?.setAttribute('role','tabpanel');panel?.setAttribute('aria-labelledby',buttons.get(activeId)?.id||'');
 }
 return {render};
}

export function pageHasContent(latex=''){
 return latex.replace(/\\(?:displaylines|text)\b/g,'').replace(/\\\\/g,'').replace(/[{}\s]/g,'').length>0;
}
function confirmPageClose(doc,title,action='Close'){
 return new Promise(resolve=>{
  const dialog=doc.createElement('dialog');dialog.id='close-page-dialog';dialog.className='close-page-dialog';dialog.setAttribute('aria-labelledby','close-page-heading');dialog.setAttribute('aria-describedby','close-page-description');
  dialog.innerHTML='<h2 id="close-page-heading">Close this page?</h2><p id="close-page-description"></p><div class="close-page-actions"><button type="button" data-cancel autofocus>Cancel</button><button type="button" data-confirm>Close page</button></div>';
  dialog.querySelector('h2').textContent=action+' this page?';dialog.querySelector('[data-confirm]').textContent=action+' page';
  dialog.querySelector('p').textContent='“'+(title||'Untitled page')+'” and its contents will be removed.';
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close('cancel');dialog.querySelector('[data-confirm]').onclick=()=>dialog.close('close');
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close('cancel');});
  const previous=doc.activeElement;
  dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='close';dialog.remove();if(!confirmed&&previous?.isConnected)previous.focus();resolve(confirmed);},{once:true});
  doc.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
 });
}
