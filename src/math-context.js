import {PLAIN_INPUT_LIMIT} from './math-input-options.js';
import {normalizeMathOperator} from './spoken-math.js';
// Preserve native operands as math tokens. Flatten only the current branch's
// operators, so the ordinary parser still determines precedence and scope.
export function mathLeftContext(field,position){
 const model=field._mathfield?.model,atom=model?.at(position);
 if(!atom||atom.type==='first'||!atom.siblings)return null;
 const siblings=atom.siblings;let last=siblings.indexOf(atom);
 if(last<1)return null;
 while(last>0&&/^\s+$/.test(siblings[last]?.value||''))last--;
 if(!last||siblings[last].mode!=='math'||['mbin','mrel','mpunct','placeholder'].includes(siblings[last].type))return null;
 let first=last;
 while(first>1&&siblings[first-1].mode==='math'&&!['mrel','mpunct'].includes(siblings[first-1].type))first--;
 if(last-first>PLAIN_INPUT_LIMIT)return null;
 const tokens=[];let start;
 for(let n=first;n<=last;n++){
  const current=siblings[n],end=model.offsetOf(current);
  const begin=current.hasChildren?model.offsetOf(current.firstChild)-1:end-1;
  if(start===undefined)start=begin;
  if(current.type==='subsup'&&tokens.length&&tokens.at(-1).type==='atom'){
   const base=tokens.at(-1);base.value=field.getValue([base.nativeStart,end],'latex');
   base.scripts={_:(current.subscript?.length||0)>1,'^':(current.superscript?.length||0)>1};continue;
  }
  const operator=['mbin','mrel'].includes(current.type);
  tokens.push({type:operator?'op':'atom',value:operator?normalizeMathOperator(current.command||current.value):field.getValue([begin,end],'latex'),variable:!operator&&/^\p{L}$/u.test(current.value||''),nativeStart:begin,start:0,end:0});
 }
 const end=model.offsetOf(siblings[last]);
 return start>=0&&end>start?{start,end,tokens,latex:field.getValue([start,end],'latex')}:null;
}
