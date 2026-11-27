import {PROSE_WORDS} from './input-language.js';
import {isMathPostfix,continuesMathOperand,isStructuredMathOperand,isMathQuantifier} from './math-grammar.js';
import {tokenizeMath,parseMath,hasPendingSpokenOperator,startsMathOperand} from './spoken-math.js';
import {escapeText,mixedTextToLatex} from './formats.js';
import {phraseAtEnd,hasPendingPhrase} from './math-words.js';
import {PLAIN_INPUT_LIMIT} from './math-input-options.js';
export {PLAIN_INPUT_LIMIT} from './math-input-options.js';

// Normalize literal identifiers before parsing pasted plain text. Token boundaries
// protect prose, commands, custom definitions and explicit spoken case qualifiers.
export function lowercasePastedVariables(source,options={}){
 if(options.mode==='text')return source;
 if(/[\r\n]/.test(source))return source.split(/(\r\n|\r|\n)/).map(part=>/[\r\n]/.test(part)?part:lowercasePastedVariables(part,options)).join('');
 if(source.length>PLAIN_INPUT_LIMIT||/`|\$/.test(source))return source;
 const tokens=tokenizeMath(source,options),eligible=new Set();
 for(let index=0;index<tokens.length;index++){
  const parsed=parseMath(tokens,index,{...options,allowIncompleteRelation:true,allowIncompleteFraction:options.mode==='math'||/\s$/.test(source),allowIncompletePrefix:options.mode==='math'||/\s$/.test(source)});
  if(!parsed)continue;
  const whole=index===0&&(parsed.end===tokens.length||parsed.end===tokens.length-1&&'.;?!'.includes(tokens.at(-1).value));
  if(!whole&&parsed.evidence<2)continue;
  const following=tokens[parsed.end];
  if(!whole&&following?.type==='word'&&!['where','when','and','then','for','is'].includes(following.value.toLowerCase()))continue;
  for(let n=index;n<parsed.end;n++)eligible.add(tokens[n]);
  index=parsed.end-1;
 }
 const edits=tokens.filter(token=>eligible.has(token)&&token.variable&&!token.custom&&!token.explicitCase&&/^[A-Za-zα-ωΑ-Ω]+\d*$/u.test(source.slice(token.start,token.end)));
 // Keep token boundaries when lowercasing an Auto-mode letter product.
 // Otherwise an ASR-cased identifier can become an ambiguous prose word.
 for(const token of edits.reverse())source=source.slice(0,token.start)+(options.mode!=='math'&&token.fromWord&&token.wordOffset?' ':'')+source.slice(token.start,token.end).replace(/[A-Za-zΑ-Ω]/gu,letter=>letter==='Δ'?letter:letter.toLowerCase())+source.slice(token.end);
 return source;
}

export function plainInputToLatex(source,options={}){
 if(options.mode==='text')return mixedTextToLatex(source);
 const rows=source.replace(/\r\n?/g,'\n').split('\n').map((line,row)=>{
  if(line.length>PLAIN_INPUT_LIMIT)return options.mode==='math'?line.replace(/\s/g,'\\ '):`\\text{${escapeText(line)}}`;
  if(/`|\$/.test(line))return mixedTextToLatex(line);
  const tokens=tokenizeMath(line,options),afterMath=row===0&&options.afterMath;
  if(!tokens.length)return '';
  const complete=assessMathInput(line,{...options,afterMath},tokens);
  if(options.mode!=='math'&&!complete?.dictionary&&/^\s*\d+\s*(?:x|×|by)\s*\d+\s+matrix\s*$/i.test(line))return `\\text{${escapeText(line)}}`;
  if(complete?.dictionary)return `{${complete.latex}}`;
  if(complete?.end===tokens.length&&(complete.evidence||tokens.every(t=>t.type==='atom'&&t.variable||t.number)||options.mode==='math'))return complete.latex;
  if(complete?.end===tokens.length-1&&complete.evidence>=2&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value))return complete.latex+`\\text{${escapeText(line.slice(tokens.at(-1).start))}}`;
  if(options.mode==='math')return line.replace(/ /g,'\\ ');
  // A failed math-only utterance must not be salvaged as a different suffix.
  const proseLead=tokens[0].variable&&!tokens[0].explicitCase&&PROSE_WORDS.has(line.slice(tokens[0].start,tokens[0].end).toLowerCase())&&tokens[1]?.type==='word';
  if(!proseLead&&tokens[0].type!=='word'&&tokens[0].type!=='punctuation')return `\\text{${escapeText(line)}}`;
  const pieces=[];let copied=0,index=0;
  while(index<tokens.length){
   const token=tokens[index];
   if(proseLead&&token.type==='quantifier'){index++;continue;}
   if(!startsMathOperand(token)){index++;continue;}
   const parsed=parseMath(tokens,index,{...options,stopAtComma:true});
   if(!parsed&&(isStructuredMathOperand(token)||continuesMathOperand(tokens[index+1])))break;
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

// Completed spoken division and a fraction bar followed by a word boundary
// share the same grammar. A pending denominator is an editable placeholder.
function liveStructureInput(source,options,kind){
 const tokens=tokenizeMath(source,options);
 if(!tokens.some(token=>kind==='prefix'?token.type==='prefix':token.type==='op'&&token.spoken&&token.value==='/'))return null;
 const parsed=parseMath(tokens,0,{...options,afterMath:options.afterMath,allowIncompleteFraction:options.mode==='math'||/\s$/.test(source),allowIncompletePrefix:options.mode==='math'||/\s$/.test(source)});
 if(!parsed)return null;
 if(parsed.end===tokens.length)return {...parsed,latex:parsed.latex+(parsed.pendingPlaceholder?'':mixedTextToLatex(source.match(/\s+$/)?.[0]||''))};
 if(parsed.end===tokens.length-1&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value))return {...parsed,latex:parsed.latex+mixedTextToLatex(source.slice(tokens.at(-1).start)),end:tokens.length};
 return null;
}

export const liveFractionInput=(source,options={})=>liveStructureInput(source,options,'fraction');
export const livePrefixInput=(source,options={})=>liveStructureInput(source,options,'prefix');

// In explicit Math mode, an unfinished or unknown word must not erase the
// notation already recognized around it. Parse independent spans with the same
// grammar and leave only the unconsumed source literal in mathematical mode.
function mathModeInput(source,options,tokens){
 const pieces=[];let copied=0,index=0,evidence=0;
 const literal=text=>text.replace(/\s/gu,'\\ ');
 while(index<tokens.length){
  const token=tokens[index];
  const unparsedLeft=continuesMathOperand(token)&&source.slice(copied,token.start).trim();
  const parsed=unparsedLeft?null:parseMath(tokens,index,{...options,afterMath:options.afterMath||index>0,allowIncompleteRelation:true,allowIncompleteFraction:true,allowIncompletePrefix:options.mode==='math'||/\s$/.test(source)});
  if(parsed&&parsed.end>index){
   pieces.push(literal(source.slice(copied,token.start)),parsed.latex);
   copied=tokens[parsed.end-1].end;evidence+=parsed.evidence||0;index=parsed.end;
  }else if(token.type==='op'||token.type==='atom'&&!token.template){
   pieces.push(literal(source.slice(copied,token.start)),token.value);
   copied=token.end;evidence++;index++;
  }else index++;
 }
 pieces.push(literal(source.slice(copied).trimEnd()));
 return {latex:pieces.join(''),end:tokens.length,evidence};
}

// Complete-input and incremental recognition share this entry point. The
// editor retains source words only to re-run this parser as input continues.
export function assessMathInput(source,options={},tokens=tokenizeMath(source,options)){
 if(!tokens.length)return null;
 const standalone=source.trim().replace(/\s+/g,' ').toLowerCase(),definition=phraseAtEnd(standalone,options.groups,false,options.libraries);
 if(definition?.text===standalone&&!tokens.some(token=>token.type==='prefix')&&(options.mode==='math'||!definition.context||options.afterMath)&&!isMathQuantifier(definition.latex))return {latex:definition.latex,end:tokens.length,evidence:2,pendingPlaceholder:!!definition.template,dictionary:true};
 const parsed=tokens[0]?.type==='quantifier'?quantifiedInput(source,options):parseMath(tokens,0,{...options,afterMath:options.afterMath,allowIncompleteRelation:true,allowIncompleteFraction:true,allowIncompletePrefix:options.mode==='math'||/\s$/.test(source)});
 if(parsed&&(parsed.end===tokens.length||parsed.end===tokens.length-1&&tokens.at(-1).type==='punctuation'))return parsed;
 if((options.mode==='math'||!tokens[0]?.context)&&tokens.at(-1)?.type==='op'&&tokens.every(token=>['atom','op'].includes(token.type))&&(hasPendingSpokenOperator(source,options)||hasPendingPhrase(source,options.groups,options.libraries))&&tokens.some(token=>token.type==='op'))return {latex:tokens.map(token=>['atom','op'].includes(token.type)?token.value:`\\text{${escapeText(source.slice(token.start,token.end))}}`).join(' '),end:tokens.length,evidence:2};
 // An incomplete dictionary phrase is still mathematical input. Keep a
 // completely recognized left expression while the next phrase is being typed,
 // without treating arbitrary unknown words as evidence for Auto conversion.
 if(parsed?.evidence>=2&&parsed.end<tokens.length&&
    (hasPendingPhrase(source.slice(tokens[parsed.end].start),options.groups,options.libraries,{whole:true})||hasPendingSpokenOperator(source,options)))return mathModeInput(source,options,tokens);
 // Operator-led fragments depend on the expression before the insertion point.
 // Let the existing continuation path join that source before reassessment.
 if(options.mode==='math'&&!continuesMathOperand(tokens[0]))return mathModeInput(source,options,tokens);
 return parsed;
}
export function liveMathInput(source,options={}){
 if(options.leftTokens||options.leftOperand!==undefined)return continuedMathInput(source,options);
 const tokens=tokenizeMath(source,options),parsed=assessMathInput(source,options,tokens);
 if(!parsed)return null;
 const complete=parsed.end===tokens.length;
 const punctuation=parsed.end===tokens.length-1&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value);
 if(!complete&&!punctuation||options.mode!=='math'&&!parsed.evidence&&!tokens.some(token=>token.quantity||token.variable))return null;
 const suffix=punctuation?mixedTextToLatex(source.slice(tokens.at(-1).start)):mixedTextToLatex(source.match(/\s+$/)?.[0]||'');
 const latex=parsed.latex+(parsed.dictionary&&parsed.pendingPlaceholder?'':suffix);
 return {...parsed,parsedSource:true,interpreted:tokens.some(token=>token.type!=='punctuation'&&source.slice(token.start,token.end).trim()!==token.value),requiresSource:options.mode==='math'||!!parsed.pendingPlaceholder||!!options.afterMath||!!(parsed.dictionary&&parsed.pendingPlaceholder)||tokens.length>1||tokens.some(token=>token.variable&&source.slice(token.start,token.end).trim()!==token.value||token.caseNormalized||token.explicitCase||token.measurement||token.quantity||token.number&&/[A-Za-z]/.test(source.slice(token.start,token.end))),contentLatex:latex,latex};
}

// Positive language evidence distinguishes an unfinished spoken source from
// a native expression whose letter case and grouping must remain authoritative.
export function recognizedMathLanguage(source,options={}){
 const proofOptions={...options,mode:'auto'},parsed=liveMathInput(source,proofOptions);
 if(!parsed||parsed.evidence<2)return null;
 return tokenizeMath(source,proofOptions).some(token=>/[A-Za-z]{2,}/.test(source.slice(token.start,token.end))&&source.slice(token.start,token.end).trim()!==token.value)?parsed:null;
}

// Reassess a completed relative comparison during ordinary incremental typing.
// Require the structural parser to consume the whole mathematical statement.
export function relativeComparisonInput(source,options={}){
 if(!/\bwhich\b/i.test(source))return null;
 const tokens=tokenizeMath(source,options),parsed=parseMath(tokens,0,{...options,afterMath:options.afterMath});
 if(!parsed?.relativeComparison)return null;
 if(parsed.end===tokens.length)return {...parsed,latex:parsed.latex+mixedTextToLatex(source.match(/\s+$/)?.[0]||'')};
 if(parsed.end===tokens.length-1&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value))return {...parsed,latex:parsed.latex+mixedTextToLatex(source.slice(tokens.at(-1).start)),end:tokens.length};
 return null;
}

// Shared assessment for a connected quantified run, regardless of how it arrived.
export function quantifiedInput(source,options={}){
 const tokens=tokenizeMath(source,options);
 if(tokens[0]?.type!=='quantifier')return null;
 // A word being typed can temporarily look like a second single-letter
 // variable. Keep its space rather than prematurely multiplying it away.
 if(tokens.some((token,index)=>index>1&&token.variable&&(tokens[index-1].variable||tokens[index-1].number)&&/\s/.test(source.slice(tokens[index-1].end,token.start))))return literalQuantifier(source,tokens);
 const parsed=parseMath(tokens,0,{...options,allowIncompleteRelation:true});
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

// A real native expression can supply the left operand of a dictated or typed
// continuation. It remains LaTeX, rather than being reverse-translated to prose.
function continuedMathInput(source,options){
 const tokens=tokenizeMath(source,options);if(!tokens.length)return null;
 const postfix=isMathPostfix(tokens[0]);
 const left=options.leftTokens?.map(token=>({...token}))??(options.leftOperand!==undefined?[{type:'atom',value:postfix?`{${options.leftOperand}}`:options.leftOperand,start:0,end:0}]:[]);
 if(!left.length)return null;
 const all=[...left,...tokens];
 const parsed=parseMath(all,0,{...options,afterMath:false,allowIncompleteRelation:true,allowIncompleteFraction:true,allowIncompletePrefix:true});
 if(!parsed)return null;
 const complete=parsed.end===all.length,punctuation=parsed.end===all.length-1&&all.at(-1).type==='punctuation'&&'.;?!'.includes(all.at(-1).value);
 if(!complete&&!punctuation)return null;
 const suffix=punctuation?mixedTextToLatex(source.slice(tokens.at(-1).start)):parsed.pendingPlaceholder?'':mixedTextToLatex(source.match(/\s+$/)?.[0]||'');
 const latex=parsed.latex+suffix;
 return {...parsed,latex,contentLatex:latex,parsedSource:false,requiresSource:true,interpreted:true};
}
