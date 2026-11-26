import {tokenizeMath,parseMath} from './spoken-math.js';
import {escapeText,mixedTextToLatex} from './formats.js';
import {phraseAtEnd} from './math-words.js';

export function plainInputToLatex(source,options={}){
 if(options.mode==='text')return mixedTextToLatex(source);
 const rows=source.replace(/\r\n?/g,'\n').split('\n').map((line,row)=>{
  if(line.length>16000)return `\\text{${escapeText(line)}}`;
  if(/`|\$/.test(line))return mixedTextToLatex(line);
  const tokens=tokenizeMath(line,options),afterMath=row===0&&options.afterMath;
  if(!tokens.length)return '';
  // Preserve the established editable-template path for a standalone dictionary
  // phrase or dimensioned matrix, without letting it expand inside prose.
  const definition=phraseAtEnd(line.trim().toLowerCase(),options.groups,false,options.libraries);
  if(!definition&&/^\s*\d+\s*(?:x|×|by)\s*\d+\s+matrix\s*$/i.test(line))return `\\text{${escapeText(line)}}`;
  if(definition?.text===line.trim().toLowerCase()&&(!definition.context||afterMath))return `{${definition.latex}}`;
  const complete=parseMath(tokens,0,{afterMath});
  if(complete?.end===tokens.length&&(complete.evidence||tokens.every(t=>t.type==='atom'&&t.variable||t.number)||options.mode==='math'))return complete.latex;
  if(complete?.end===tokens.length-1&&complete.evidence>=2&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value))return complete.latex+`\\text{${escapeText(line.slice(tokens.at(-1).start))}}`;
  if(options.mode==='math')return line;
  // A failed math-only utterance must not be salvaged as a different suffix.
  const proseLead=tokens[0].variable&&['I','A','a'].includes(tokens[0].value)&&tokens[1]?.type==='word';
  if(!proseLead&&tokens[0].type!=='word'&&tokens[0].type!=='punctuation')return `\\text{${escapeText(line)}}`;
  const pieces=[];let copied=0,index=0;
  while(index<tokens.length){
   const token=tokens[index];
   if(!['atom','function','quantifier','root','rootStart','fraction','open','negative','absolute'].includes(token.type)){index++;continue;}
   const parsed=parseMath(tokens,index);
   if(!parsed&&(['root','rootStart','fraction','function','open','absolute'].includes(token.type)||['op','script','postfix'].includes(tokens[index+1]?.type)))break;
   if(!parsed||parsed.evidence<2||parsed.end<=index+1){index=parsed?Math.max(index+1,parsed.end):index+1;continue;}
   const following=tokens[parsed.end];
   // Do not turn the beginning of a prose noun phrase into an expression.
   if(following?.type==='word'&&!['where','when','and','then','for','is'].includes(following.value.toLowerCase())){index++;continue;}
   const end=tokens[parsed.end-1].end;
   if(token.start>copied)pieces.push(`\\text{${escapeText(line.slice(copied,token.start))}}`);
   pieces.push(parsed.latex);copied=end;index=parsed.end;
  }
  if(copied<line.length)pieces.push(`\\text{${escapeText(line.slice(copied))}}`);
  return pieces.join('')||`\\text{${escapeText(line)}}`;
 });
 return rows.length===1?rows[0]:`\\displaylines{${rows.join('\\\\')}}`;
}
