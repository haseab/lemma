export function verticalTarget(candidates,origin,direction,x){
 const threshold=Math.max(4,origin.height*.5),center=(origin.top+origin.bottom)/2;
 const possible=candidates.filter(c=>direction*(c.rect.top+c.rect.height/2-center)>threshold);
 if(!possible.length)return null;
 const nearest=Math.min(...possible.map(c=>Math.abs(c.rect.top+c.rect.height/2-center)));
 const line=possible.filter(c=>Math.abs(Math.abs(c.rect.top+c.rect.height/2-center)-nearest)<threshold);
 let best=null,distance=Infinity;
 for(const c of line){const d=Math.min(Math.abs(x-c.rect.left),Math.abs(x-c.rect.right));if(d<distance){best=c;distance=d;}}
 return x<(best.rect.left+best.rect.right)/2?best.before:best.offset;
}
export function installProseNavigation(field){
 let preferredX=null;
 field.addEventListener('pointerdown',()=>{preferredX=null;});
 field.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown'].includes(event.key)){preferredX=null;return;}
  if(event.metaKey||event.ctrlKey||event.altKey||field.mode==='latex')return;
  const editor=field._mathfield,model=editor.model,atom=model.at(field.position),root=model.root;
  if(atom?.parent!==root||!(atom.mode==='text'||atom.type==='first'&&atom.rightSibling?.mode==='text'))return;
  if(root.type==='array'&&!root.isMultiline)return;
  const atoms=root.type==='array'?root.rows.flatMap(row=>row.flatMap(cell=>cell||[])):root.body||[];
  const candidates=[];
  for(const a of atoms){
   const element=editor.getHTMLElement(a);if(!element)continue;
   let rect=element.getBoundingClientRect();
   if(a.type==='first'&&!rect.height){const next=a.rightSibling&&editor.getHTMLElement(a.rightSibling)?.getBoundingClientRect();const parent=next?.height?next:element.parentElement?.getBoundingClientRect();if(parent?.height)rect={...parent.toJSON(),right:parent.left,width:0};}
   if(!rect.height)continue;
   const left=a.leftSibling&&editor.getHTMLElement(a.leftSibling)?.getBoundingClientRect();
   const sameLine=left&&Math.abs((left.top+left.bottom-rect.top-rect.bottom)/2)<Math.max(4,rect.height*.5);
   candidates.push({offset:model.offsetOf(a),before:sameLine?model.offsetOf(a.leftSibling):model.offsetOf(a),rect});
  }
  const current=candidates.find(c=>c.offset===field.position);if(!current)return;
  preferredX??=current.rect.right;
  const target=verticalTarget(candidates,current.rect,event.key==='ArrowDown'?1:-1,preferredX);
  if(target===null||target===field.position)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.shiftKey){const anchor=model.anchor;field.selection={ranges:[[Math.min(anchor,target),Math.max(anchor,target)]],direction:target<anchor?'backward':'forward'};}
  else field.position=target;
  field.executeCommand('scrollIntoView');
 },true);
}
