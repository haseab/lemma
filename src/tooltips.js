// Shared, immediate tooltips for editor controls, including dynamically added tabs.
export function installTooltips(doc){
 const selector='button,summary,a,select,input',view=doc.defaultView;
 const tip=doc.createElement('div');tip.id='control-tooltip';tip.className='control-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;
 let active=null,previousDescription=null;
 function prepare(control){if(control.hasAttribute('title')){control.dataset.tooltip=control.getAttribute('title');control.removeAttribute('title');}}
 function prepareTree(root){if(root.matches?.(selector))prepare(root);root.querySelectorAll?.(selector).forEach(prepare);}
 function hide(){if(active){if(previousDescription===null)active.removeAttribute('aria-describedby');else active.setAttribute('aria-describedby',previousDescription);}active=null;tip.hidden=true;}
 function show(control){
  prepare(control);const label=control.dataset.tooltip||control.getAttribute('aria-label');if(!label)return;
  hide();active=control;previousDescription=control.getAttribute('aria-describedby');control.setAttribute('aria-describedby',[previousDescription,tip.id].filter(Boolean).join(' '));
  (control.closest('dialog[open]')||doc.body).append(tip);tip.textContent=label;tip.hidden=false;
  const r=control.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(8,Math.min(r.left+(r.width-t.width)/2,view.innerWidth-t.width-8))+'px';tip.style.top=(r.bottom+t.height+14>view.innerHeight?Math.max(8,r.top-t.height-7):r.bottom+7)+'px';
 }
 function target(event){return event.target.closest?.(selector);}
 doc.addEventListener('pointerover',event=>{const control=target(event);if(control&&!control.contains(event.relatedTarget))show(control);});
 doc.addEventListener('pointerout',event=>{if(active&&!active.contains(event.relatedTarget))hide();});
 doc.addEventListener('focusin',event=>{const control=target(event);if(control)show(control);});
 doc.addEventListener('focusout',hide);doc.addEventListener('pointerdown',hide);doc.addEventListener('scroll',hide,true);view.addEventListener('resize',hide);
 doc.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 prepareTree(doc);
 const observer=new view.MutationObserver(records=>{for(const record of records){if(record.type==='attributes'){prepare(record.target);if(record.target===active)show(active);}else for(const node of record.addedNodes)if(node.nodeType===1&&node!==tip)prepareTree(node);}if(active&&!active.isConnected)hide();});
 observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title','aria-label']});
 return {hide};
}
