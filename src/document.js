import {validateHistory} from './history.js';
import {validateDocument as validateLegacy} from './legacy-document.js';
export const EMPTY_PAGE='\\displaylines{}';
function escapeText(text){return text.replace(/[\\{}$&#%_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]));}
function inline(node){
 if(node.type==='text') {let text=escapeText(node.text);for(const mark of node.marks||[]){if(mark.type==='bold')text=`\\textbf{${text}}`;if(mark.type==='italic')text=`\\textit{${text}}`;}return `\\text{${text}}`;}
 if(node.type==='math'||node.type==='equation')return node.attrs.latex;
 if(node.type==='hardBreak')return '\\\\';
 return (node.content||[]).map(inline).join('');
}
function lines(node){if(['paragraph','heading','codeBlock','equation','math'].includes(node.type))return [inline(node)];if(node.type==='horizontalRule')return [''];return (node.content||[]).flatMap(lines);}
const demoText=['Every idea starts somewhere.','A few words. A beautiful equation. Space to follow your thinking.','Make yourself at home','Click an equation and start typing. Use / for fractions, ^ for powers, and the arrow keys to move around.','Add math anywhere with ⌘M, or give an equation its own line with ⇧⌘M. Press Escape to return to your writing.'].join('');
function untouchedDemo(node){let text='',math=[];function scan(n){if(n.type==='text')text+=n.text;if(['math','equation'].includes(n.type))math.push(n.attrs.latex);for(const c of n.content||[])scan(c);}scan(node);return text===demoText&&math.every(s=>!s||s==='e^{i\\pi}+1=0');}
export function validateDocument(value){
 if(value?.type==='math-page') {if(typeof value.latex!=='string'||value.latex.length>2_000_000)throw Error('Invalid or oversized page');return {type:'math-page',latex:value.latex,mode:['auto','math','text'].includes(value.mode)?value.mode:'auto'};}
 const legacy=validateLegacy(value);
 return {type:'math-page',latex:untouchedDemo(legacy)?EMPTY_PAGE:`\\displaylines{${lines(legacy).join('\\\\')}}`,mode:'auto'};
}
export function freshDocument(title='Untitled canvas'){return {id:crypto.randomUUID(),title,updatedAt:Date.now(),content:{type:'math-page',latex:EMPTY_PAGE,mode:'auto'}};}
export function validateNotebook(data){
 if(![1,2,3].includes(data?.version)||!Array.isArray(data.documents)||!data.documents.length||data.documents.length>1000)throw Error('Invalid notebook');
 const ids=new Set();const documents=data.documents.map(d=>{if(typeof d.id!=='string'||ids.has(d.id))throw Error('Invalid document ID');ids.add(d.id);const result={id:d.id,title:String(d.title||'Untitled canvas').slice(0,200),updatedAt:Number(d.updatedAt)||Date.now(),content:validateDocument(d.content)};const legacy=d.content?.type==='doc'?d.content:d.legacyContent;if(legacy)result.legacyContent=validateLegacy(legacy);const history=validateHistory(d.history,result.content.latex);if(history)result.history=history;return result;});
 return {version:2,activeId:ids.has(data.activeId)?data.activeId:documents[0].id,documents};
}

export function duplicateDocument(source){
 const copy=freshDocument(source.title.slice(0,195)+' copy');
 copy.content=structuredClone(source.content);
 if(source.legacyContent)copy.legacyContent=structuredClone(source.legacyContent);
 return copy;
}
