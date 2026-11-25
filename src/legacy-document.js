const types = new Set(['doc','paragraph','text','heading','bulletList','orderedList','listItem','blockquote','codeBlock','hardBreak','horizontalRule','math','equation']);
const marks = new Set(['bold','italic','strike','code','underline']);
export function validateDocument(value) {
  let count=0;
  function visit(n,depth=0) {
    if (!n || typeof n!=='object' || !types.has(n.type) || depth>40 || ++count>50000) throw Error('Unsupported or oversized document');
    const out={type:n.type};
    if(n.type==='text') { if(typeof n.text!=='string'||!n.text.length) throw Error('Invalid text'); out.text=n.text; }
    if(n.type==='math'||n.type==='equation') out.attrs={latex:String(n.attrs?.latex??'').slice(0,100000)};
    if(n.type==='heading') out.attrs={level:[1,2,3].includes(n.attrs?.level)?n.attrs.level:2};
    if(n.type==='orderedList') out.attrs={start:Number.isSafeInteger(n.attrs?.start)?n.attrs.start:1};
    if(n.marks) out.marks=n.marks.filter(m=>marks.has(m.type)).map(m=>({type:m.type}));
    if(n.content) {if(!Array.isArray(n.content))throw Error('Invalid content');out.content=n.content.map(c=>visit(c,depth+1));}
    return out;
  }
  if(value?.type!=='doc') throw Error('Not a Lemma document');
  return visit(value);
}
export function freshDocument(title='Untitled canvas') {
  return {id:crypto.randomUUID(),title,updatedAt:Date.now(),content:{type:'doc',content:[{type:'paragraph'}]}};
}
export function validateNotebook(data) {
 if(data?.version!==1 || !Array.isArray(data.documents) || !data.documents.length || data.documents.length>1000)throw Error('Invalid notebook');
 const ids=new Set();
 const documents=data.documents.map(d=>{
  if(typeof d.id!=='string'||ids.has(d.id))throw Error('Invalid document ID');ids.add(d.id);
  return {id:d.id,title:String(d.title||'Untitled canvas').slice(0,200),updatedAt:Number(d.updatedAt)||Date.now(),content:validateDocument(d.content)};
 });
 return {version:1,activeId:ids.has(data.activeId)?data.activeId:documents[0].id,documents};
}
