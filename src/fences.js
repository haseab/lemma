const PAIRS={')':['(',')'],']':['\\lbrack','\\rbrack'],'}':['\\lbrace','\\rbrace']};
const anticipatedOpenings=new WeakMap();
function confirmOpenings(field){
 const pending=anticipatedOpenings.get(field);
 if(!pending?.size)return;
 for(const [atom,render] of pending){atom.render=render;atom.isDirty=true;}
 pending.clear();
 if(field._mathfield)field._mathfield.dirty=true;
}
// Render the supplied opening as an anticipated delimiter, like the native
// anticipated closing delimiter. This is editing state, never saved in LaTeX.
function anticipateOpening(field,atom){
 const render=atom.render;
 let pending=anticipatedOpenings.get(field);
 if(!pending){pending=new Map();anticipatedOpenings.set(field,pending);}
 pending.set(atom,render);
 atom.render=function(context){
  const box=render.call(this,context);
  const mark=node=>{
   if(node?.classes?.split(' ').includes('ML__open')){node.classes+=' lemma-ghost-open';return true;}
   return node?.children?.some(mark)||false;
  };
  mark(box);return box;
 };
 atom.isDirty=true;
}
const OPENINGS={')':new Set(['(','\\lparen']),']':new Set(['[','\\lbrack']),'}':new Set(['{','\\{','\\lbrace'])};

export function completeOpeningFence(field,key){
 const pair=PAIRS[key];
 if(!pair||field.mode!=='math'||field.pageInputMode==='text'||field.isProseLine?.()||!field.selectionIsCollapsed||field.readOnly||field.disabled)return false;
 const model=field._mathfield?.model,at=model?.at(field.position);if(!at?.parent)return false;
 // Existing fences, including a soft closing fence, remain MathLive's job.
 for(let parent=at.parent;parent&&parent!==model.root;parent=parent.parent)if(parent.type==='leftright')return false;
 const siblings=at.siblings,previous=siblings.slice(0,siblings.indexOf(at)+1);
 for(const atom of previous){
  if(atom.type==='mopen'&&OPENINGS[key].has(atom.value)||atom.type==='leftright'&&['?','.'].includes(atom.rightDelim))return false;
 }
 let first=null;
 for(let i=previous.length-1;i>=0;i--){
  const atom=previous[i];
  if(atom.type==='first'||atom.type==='mrel'||atom.type==='mopen'||atom.mode==='text'&&!/^\s+$/.test(atom.value||''))break;
  first=atom;
 }
 const end=field.position,start=first?model.offsetOf(first.leftSibling):end;
 if(start<0)return false;
 const sources=field.readPhraseSources?.()||[],last=field.lastOffset;
 const perform=()=>{
  field.dismissAutomaticConversion?.();
  const suspended=field.proseSuspended;field.proseSuspended=true;
  try{
   field.selection={ranges:[[start,end]]};
   field.executeCommand(['insert',`\\left${pair[0]}#0\\right${pair[1]}`,{mode:'math',format:'latex',selectionMode:'after'}]);
   const fence=model.at(field.position);
   if(fence?.type==='leftright')anticipateOpening(field,fence);
   field._mathfield.dirty=true;
   const delta=field.lastOffset-last;
   field.restorePhraseSources?.(sources.map(source=>({...source,offset:source.offset<=start?source.offset:source.offset<=end?source.offset+1:source.offset+delta})));
   field._mathfield.model.mode='math';
  }finally{field.proseSuspended=suspended;}
 };
 if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
 return true;
}

export function installClosingFences(field){
 // A following edit accepts the inferred opening. Use the content boundary
 // so typing, paste, templates, and text services share the same behavior.
 // The creating edit fires before the opening is registered above.
 field.addEventListener('beforeinput',()=>confirmOpenings(field),true);
 const style=document.createElement('style');
 style.textContent='.lemma-ghost-open{opacity:var(--smart-fence-opacity,.3)} @media print{.lemma-ghost-open{opacity:1}}';
 field.shadowRoot.append(style);
 // Virtual keyboards and text services can deliver characters without a
 // DOM keydown. Apply the same pairing at MathLive's actual input boundary.
 const editor=field._mathfield,originalInput=editor.onInput.bind(editor);
 editor.onInput=(text,options)=>{
  if(PAIRS[text]&&completeOpeningFence(field,text))return;
  return originalInput(text,options);
 };

 field.addEventListener('keydown',event=>{
  if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||!PAIRS[event.key])return;
  if(!completeOpeningFence(field,event.key))return;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
}
