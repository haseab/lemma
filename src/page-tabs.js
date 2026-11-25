export function createPageTabs(root,{onSelect,onNew,panelId='surface'}){
 const doc=root.ownerDocument,title=root.querySelector('#title');
 const list=doc.createElement('div');list.className='page-tab-list';list.setAttribute('role','tablist');list.setAttribute('aria-label','Pages');
 const add=doc.createElement('button');add.type='button';add.id='new-tab';add.className='new-tab';add.textContent='+';add.title='New page';add.setAttribute('aria-label','New page');add.onclick=onNew;
 let pages=[],activeId,buttons=new Map(),editing=false,original='';
 title.hidden=true;title.classList.add('tab-title-editor');root.replaceChildren(list,add,title);
 function finish(){if(!editing)return;editing=false;title.hidden=true;const button=buttons.get(activeId);if(button){button.hidden=false;button.textContent=title.value||'Untitled page';}root.append(title);}
 title.addEventListener('blur',finish);
 title.addEventListener('input',()=>{const button=buttons.get(activeId);if(button)button.textContent=title.value||'Untitled page';});
 title.addEventListener('keydown',event=>{
  if(!['Enter','Escape'].includes(event.key))return;
  event.preventDefault();if(event.key==='Escape'){title.value=original;title.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}
  finish();buttons.get(activeId)?.focus();
 });
 function render(next,id){
  if(editing&&activeId===id&&pages.map(p=>p.id).join('\0')===next.map(p=>p.id).join('\0'))return;
  finish();pages=next;activeId=id;buttons=new Map();list.replaceChildren();
  for(const page of pages){
   const button=doc.createElement('button');button.type='button';button.className='page-tab';button.dataset.pageId=page.id;button.id='page-tab-'+encodeURIComponent(page.id);button.setAttribute('role','tab');button.setAttribute('aria-controls',panelId);button.setAttribute('aria-selected',String(page.id===activeId));button.tabIndex=page.id===activeId?0:-1;button.textContent=page.title||'Untitled page';button.title='Double-click to rename';
   button.onclick=()=>{if(page.id!==activeId)onSelect(page.id);};
   button.ondblclick=()=>{if(page.id!==activeId)return;original=title.value;editing=true;title.hidden=false;button.hidden=true;list.insertBefore(title,button);title.focus();title.select();};
   button.onkeydown=event=>{
    if(event.key==='F2'){event.preventDefault();button.ondblclick();return;}
    const index=pages.findIndex(p=>p.id===page.id);let target;
    if(event.key==='ArrowRight')target=pages[(index+1)%pages.length];else if(event.key==='ArrowLeft')target=pages[(index+pages.length-1)%pages.length];else if(event.key==='Home')target=pages[0];else if(event.key==='End')target=pages.at(-1);else return;
    event.preventDefault();onSelect(target.id);buttons.get(target.id)?.focus();
   };
   buttons.set(page.id,button);list.append(button);
  }
  buttons.get(activeId)?.scrollIntoView?.({block:'nearest',inline:'nearest'});
  const panel=doc.getElementById(panelId);panel?.setAttribute('role','tabpanel');panel?.setAttribute('aria-labelledby',buttons.get(activeId)?.id||'');
 }
 return {render};
}
