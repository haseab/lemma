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
  if(definition?.text===line.trim().toLowerCase()&&(!definition.context||afterMath)){
   if(['\\forall','\\exists','\\nexists'].includes(definition.latex))return definition.latex+mixedTextToLatex(line.match(/\s+$/)?.[0]||'');
   return `{${definition.latex}}`;
  }
  const complete=tokens[0]?.type==='quantifier'?quantifiedInput(line,options):parseMath(tokens,0,{afterMath,allowIncompleteRelation:true});
  if(complete?.end===tokens.length&&(complete.evidence||tokens.every(t=>t.type==='atom'&&t.variable||t.number)||options.mode==='math'))return complete.latex;
  if(complete?.end===tokens.length-1&&complete.evidence>=2&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value))return complete.latex+`\\text{${escapeText(line.slice(tokens.at(-1).start))}}`;
  if(options.mode==='math')return line.replace(/ /g,'\\ ');
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

// Shared assessment for a connected quantified run, regardless of how it arrived.
export function quantifiedInput(source,options={}){
 const tokens=tokenizeMath(source,options);
 if(tokens[0]?.type!=='quantifier')return null;
 // A word being typed can temporarily look like a second single-letter
 // variable. Keep its space rather than prematurely multiplying it away.
 if(tokens.some((token,index)=>index>1&&token.variable&&(tokens[index-1].variable||tokens[index-1].number)&&/\s/.test(source.slice(tokens[index-1].end,token.start))))return literalQuantifier(source,tokens);
 const parsed=parseMath(tokens,0,{allowIncompleteRelation:true});
 if(!parsed)return literalQuantifier(source,tokens);
 if(parsed.end===tokens.length-1&&parsed.evidence>=2&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value)){
  return {...parsed,latex:parsed.latex+`\\text{${escapeText(source.slice(tokens.at(-1).start))}}`,end:tokens.length,binder:tokens[0].binder||null};
 }
 if(parsed.end!==tokens.length)return literalQuantifier(source,tokens);
 const trailing=source.match(/\s+$/)?.[0]||'';
 return {...parsed,latex:parsed.latex+(trailing?`\\text{${escapeText(trailing)}}`:''),binder:tokens[0].binder||null};
}

// Recognition does not require a complete predicate or a named variable.
// Keep the quantifier, and preserve unparsed wording until the user rejects it.
function literalQuantifier(source,tokens){
 let latex=tokens[0].value,copied=tokens[0].end;
 for(const token of tokens.slice(1)){
  // The quantifier establishes mathematical context. Recognized symbols can
  // coexist with unknown labels without requiring the entire line to parse.
  if(!['op','atom','function','quantifier'].includes(token.type))continue;
  latex+=mixedTextToLatex(source.slice(copied,token.start))+token.value;
  copied=token.end;
 }
 latex+=mixedTextToLatex(source.slice(copied));
 return {latex,end:tokens.length,evidence:2,binder:null,literal:true};
}
