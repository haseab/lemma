import {PROSE_WORDS} from './input-language.js';
import {SPOKEN_FENCES,operandRule,startsMathOperand,isMathPostfix,continuesMathOperand,endsMathOperand,mathSyntaxGroup,mathOperator,mathOperatorRank,isMathComparison,isStructuredMathOperand,establishesMathContext,symbolicOperatorAt,mathPhraseType} from './math-grammar.js';
export {startsMathOperand,mathOperatorRank,normalizeMathOperator} from './math-grammar.js';
import {quantityAt,unitExpressionAt,measurementMagnitudeAt} from './physical-notation.js';
import {vocabulary,phraseAtEnd} from './math-words.js';
const SMALL='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const ORDINAL={second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
const UPPER_GREEK={alpha:'A',beta:'B',epsilon:'E',zeta:'Z',eta:'H',iota:'I',kappa:'K',mu:'M',nu:'N',omicron:'O',rho:'P',tau:'T',chi:'X'};
const isPause=token=>token?.type==='punctuation'&&token.value===',';
const isComma=token=>token?.type==='comma'||isPause(token);
const SPEECH=[
 // Relative comparison references are grammar, not variable-letter products.
 ['which','word','which'],
 ['vector','prefix','\\vec'],['change in','prefix','\\Delta'],['change of','prefix','\\Delta'],
 ['the derivative with respect to','derivative','d'],['derivative with respect to','derivative','d'],
 ['integral from','integral','bounded'],['integral of','integral',''],['sum from','sum','bounded'],['limit as','limit',''],
 ['the fraction','naturalFraction',''],['all over','op','/'],['given','op','\\mid'],['choose','op','\\choose'],
 ['factorial','factorial',''],['prime','prime',''],['bar','accent','\\bar'],['hat','accent','\\hat'],
 ['comma','comma',','],['from','boundFrom',''],['approaches','approaches',''],['to','boundTo',''],
 ['the square root of','root','2'],['the cube root of','root','3'],
 ...SPOKEN_FENCES,['bracket','spokenGroup','('],
 ['start fraction','fraction',''],['end fraction','endFraction',''],['start root','rootStart',''],['end root','endRoot',''],
 ['to the power of','script','^'],['to the power','script','^'],['raised to','script','^'],['to the','ordinal',''],
 ['subscript','script','_'],['sub','script','_'],['superscript','script','^'],['squared','postfix','2'],['cubed','postfix','3'],
 ['divided by','op','/'],['multiplied by','op','\\times'],['plus','op','+'],['minus','op','-'],['negative','negative','-'],['times','op','\\times'],['over','op','/'],
 ['absolute value of','absolute',''],['square root of','root','2'],['cube root of','root','3'],['of','of','']
].sort((a,b)=>b[0].length-a[0].length);
function numberAt(text){
 const matches=[...text.slice(0,180).matchAll(/[a-z]+/g)];
 const words=[];let end=0;for(const match of matches){if(match.index===0||words.length&&/^[\s,-]+$/.test(text.slice(end,match.index))){words.push(match[0]);end=match.index+match[0].length;}else break;}
 let value=0,current=0,count=0,decimal=false,digits='';
 for(const word of words){
  const small=SMALL.indexOf(word);
  if(decimal){if(small<0||small>9)break;digits+=small;count++;continue;}
  if(small>=0){if(count&&current%100>=1&&current%100<20)break;if(count&&small>=10&&current%100)break;current+=small;count++;}
  else if(TENS[word]){if(current%100)break;current+=TENS[word];count++;}
  else if(word==='hundred'&&current>0&&current<10){current*=100;count++;}
  else if(word==='thousand'&&current>0&&!value){value=current*1000;current=0;count++;}
  else if(word==='point'&&count){decimal=true;count++;}
  else break;
 }
 if(!count||decimal&&!digits)return null;
 return {text:text.slice(0,matches[count-1].index+matches[count-1][0].length),value:String(value+current)+(decimal?'.'+digits:'')};
}
// Numeral spelling and the denominator name are independent grammar pieces.
// Reuse cardinal-number parsing so “1 half” and “twenty one thirds” have
// the same structure as their entirely spoken equivalents.
const FRACTION_PARTS={half:2,halves:2,third:3,thirds:3,quarter:4,quarters:4,fourth:4,fourths:4,fifth:5,fifths:5,sixth:6,sixths:6,seventh:7,sevenths:7,eighth:8,eighths:8,ninth:9,ninths:9,tenth:10,tenths:10};
function fractionNumberAt(source,numerator){
 if(!numerator||!/^\d+$/.test(numerator.value))return null;
 const part=source.slice(numerator.text.length).match(/^[\s,]+([a-z]+)\b/i);
 const name=part?.[1].toLowerCase(),denominator=Object.hasOwn(FRACTION_PARTS,name)?FRACTION_PARTS[name]:null;
 return denominator?{value:`\\frac{${numerator.value}}{${denominator}}`,length:numerator.text.length+part[0].length}:null;
}
export function tokenizeMath(source,{groups,libraries,shortcuts={},mode,afterMath=false,leftOperand,leftTokens,preserveSpacing=false,deferPendingWords=false}={}){
 const config=vocabulary(groups,libraries),tokens=[],patterns=new Map(),physics=!groups||groups.includes('physics');let i=0;
 const phraseLength=(rest,text,lower)=>{
  // Dictation and copied text can contain NBSP, narrow NBSP, or repeated
  // spaces. Match them without normalizing the source or losing offsets.
  let entry=patterns.get(text);
  if(!entry){entry={head:text.split(' ',1)[0],pattern:null};patterns.set(text,entry);}
  if(!lower.startsWith(entry.head))return 0;
  if(!entry.pattern)entry.pattern=new RegExp('^'+text.split(/\s+/).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s,]+')+'(?![\\p{L}\\p{N}])','iu');
  return rest.match(entry.pattern)?.[0].length||0;
 };
 const blockedUnit=source=>config.phrases.some(p=>p.custom&&phraseLength(source,p.text,source.toLowerCase()));
 // Preserve literal variable case here. Clipboard normalization belongs at the
 // input boundary; semantic commands and quantity notation keep their case.
 const put=(type,value,length,extra={})=>{
  const gap=source.slice(tokens.at(-1)?.end??0,i);
  tokens.push({type,value,start:i,end:i+length,...(preserveSpacing&&/^\s+$/.test(gap)?{spaceBefore:gap}:{}),...extra});i+=length;
 };
 // A complete unit expression does not need a magnitude. Use the identical
 // product/ratio/power grammar as measurements, without stealing unit words
 // from prose or ordinal words from larger mathematical expressions.
 const standaloneUnits=physics&&!afterMath&&leftOperand===undefined&&!leftTokens?.length&&unitExpressionAt(source,{blocked:blockedUnit});
 if(standaloneUnits&&/^[\s]*[.;?!]?[\s]*$/.test(source.slice(standaloneUnits.length)))
  put('atom',standaloneUnits.latex,standaloneUnits.length,{measurement:true});
 while(i<source.length){
  if(/\s/.test(source[i])){i++;continue;}
  const rest=source.slice(i),lower=rest.toLowerCase();
  // A binder noun is grammatical only immediately after a quantifier.
  const previousToken=tokens.findLast(token=>!isComma(token));
  const binder=previousToken?.type==='quantifier'&&rest.match(/^([A-Za-z]{2,})[\s,]+(?=[A-Za-z](?:\s|,|$))/);
  if(binder&&!config.words.has(binder[1].toLowerCase())&&!config.phrases.some(p=>p.text===binder[1].toLowerCase())){
   if(!/^values?$/i.test(binder[1]))previousToken.binder=binder[1];
   i+=binder[0].length;continue;
  }
  // User definitions win over grammatical shorthand as well as built-in words.
  const custom=config.phrases.find(p=>p.custom&&phraseLength(rest,p.text,lower));
  if(custom){put('atom',custom.latex,phraseLength(rest,custom.text,lower),{custom:true,context:custom.context,template:custom.template});continue;}
  if((previousToken?.quantity||mode==='math'&&endsMathOperand(previousToken))&&/^is(?![\p{L}\p{N}])/iu.test(rest)&&!config.phrases.some(p=>phraseLength(rest,p.text,lower))){put('op','=',2,{spoken:true});continue;}
  const caseName=rest.match(/^(capital|uppercase|lowercase)[\s,]+([\p{L}]+)(?![\p{L}])/iu);
  if(caseName){
   const name=caseName[2].toLowerCase(),greek=config.phrases.find(p=>p.group==='greek'&&p.text===name);
   if(!greek&&name.length>1&&!config.words.has(name)&&(mode==='math'||/^[A-Z]+$/.test(caseName[2]))){
    const upper=caseName[1].toLowerCase()!=='lowercase',begin=i,end=i+caseName[0].length,letters=end-caseName[2].length;
    for(let n=0;n<name.length;n++)tokens.push({type:'atom',value:upper?name[n].toUpperCase():name[n],variable:true,explicitCase:true,start:n?letters+n:begin,end:letters+n+1});
    i=end;continue;
   }
   if(name.length===1||greek){const upper=caseName[1].toLowerCase()!=='lowercase';const value=greek?(upper?(UPPER_GREEK[name]||'\\'+name[0].toUpperCase()+name.slice(1)):'\\'+name):(upper?name.toUpperCase():name);put('atom',value,caseName[0].length,{variable:true,explicitCase:true});continue;}
  }
  const dimensionedMatrix=rest.match(/^\d{1,2}\s*(?:x|×|by)\s*\d{1,2}\s+matrix\b/i);
  if(dimensionedMatrix){const definition=phraseAtEnd(dimensionedMatrix[0],groups,false,libraries);if(definition){put('atom',definition.latex,dimensionedMatrix[0].length,{template:true});continue;}}
  const digits=rest.match(/^\d+(?:\.\d+)?/);
  const cardinal=digits?{text:digits[0],value:digits[0]}:numberAt(lower);
  const fractionNumber=fractionNumberAt(rest,cardinal);
  if(fractionNumber){
   const units=physics&&unitExpressionAt(rest.slice(fractionNumber.length),{blocked:blockedUnit});
   put('atom',fractionNumber.value+(units?'\\,'+units.latex:''),fractionNumber.length+(units?.length||0),{number:true,measurement:!!units});continue;
  }
  if(cardinal){
   const magnitude=physics?measurementMagnitudeAt(rest,cardinal,source=>{const digits=source.match(/^\d+(?:\.\d+)?/);return digits?{text:digits[0],value:digits[0]}:numberAt(source.toLowerCase());}):cardinal;
   const units=physics&&!['script','ordinal'].includes(previousToken?.type)&&unitExpressionAt(rest.slice(magnitude.text.length),{symbols:!!digits,blocked:blockedUnit});
   if(units){put('atom',magnitude.value+'\\,'+units.latex,magnitude.text.length+units.length,{number:true,measurement:true});continue;}
   const previous=tokens.at(-1);
   if(previous?.variable&&(!digits||previous.end===i)&&!cardinal.value.includes('.')){
    previous.value+=`_{${cardinal.value}}`;previous.end=i+cardinal.text.length;i+=cardinal.text.length;continue;
   }
   put('atom',cardinal.value,cardinal.text.length,{number:true});continue;
  }
  // A spoken base is a function subscript, using the ordinary script and
  // argument grammar for every function spelling. Outside that context it
  // remains a word, so prose does not acquire a mathematical subscript.
  if(previousToken?.type==='function'&&/^base(?![\p{L}\p{N}])/iu.test(rest)){put('script','_',4,{spoken:true});continue;}
  const indexedName=config.phrases.find(p=>p.group==='greek'&&lower.startsWith(p.text)&&/\d/.test(rest[p.text.length]||''));
  if(indexedName){put('atom',indexedName.latex,indexedName.text.length,{variable:true});continue;}
  const phrase=config.phrases.find(p=>phraseLength(rest,p.text,lower));
  // Shared multiword definitions outrank shorter spoken operators, so
  // "plus" cannot consume the start of "plus or minus".
  const speech=SPEECH.find(([text])=>(text!=='choose'||mode==='math'||endsMathOperand(previousToken))&&phraseLength(rest,text,lower)&&(!phrase||phraseLength(rest,text,lower)>=phraseLength(rest,phrase.text,lower)));
  if(speech){
   const [text,type,value,properties={}]=speech;
   const group=mathSyntaxGroup({type,value});
   if(group&&!config.groups.has(group))put('disabledStructure',text,phraseLength(rest,text,lower));
   else put(type,value,phraseLength(rest,text,lower),{spoken:true,dividedBy:text==='divided by',...properties});
   continue;
  }
  const fn=config.functions.find(entry=>phraseLength(rest,entry.text,lower)&&(!phrase||entry.text.length>=phrase.text.length));
  if(fn){put('function',fn.latex,phraseLength(rest,fn.text,lower));continue;}
  if(phrase){put(mathPhraseType(phrase.latex),mathOperator(phrase.latex)?.value||phrase.latex,phraseLength(rest,phrase.text,lower),{template:phrase.template,context:phrase.context,variable:phrase.group==='greek'});continue;}
  const quantity=physics&&quantityAt(rest);
  if(quantity){put('atom',quantity.value,quantity.length,{variable:true,quantity:true,vector:quantity.vector});continue;}
  const word=rest.match(/^[A-Za-z]+/);
  if(word){const text=word[0],name=text.toLowerCase();
   if(ORDINAL[name]){put('ordinalNumber',String(ORDINAL[name]),text.length);continue;}
   // Keep a trailing notation-name prefix together during typing. Functions
   // must not consume its first letter as a completed argument.
   if(deferPendingWords&&i+text.length===source.length&&[...config.phrases,...config.functions].some(entry=>entry.text.length>name.length&&entry.text.startsWith(name))){put('atom',text,text.length,{pending:true});continue;}
   if(text.length===1){put('atom',text,1,{variable:true});continue;}
   // Explicit Math mode already establishes intent. Unknown letter runs are
   // products, with no equation, grouping, length or vocabulary prerequisite.
   if(mode==='math'&&!config.words.has(name)){for(const letter of text)put('atom',letter,1,{variable:true});continue;}
   // Compact coefficient notation, such as 5pq, denotes adjacent variables.
   // Leave longer words and known function names to their existing paths.
   if(text.length<=3&&!config.words.has(name)&&(tokens.at(-1)?.number&&tokens.at(-1).end===i||/^\d/.test(rest.slice(text.length)))){
    for(const letter of text)put('atom',letter,1,{variable:true});continue;
   }
   if(config.words.has(name)){const shortcut=shortcuts[text]||shortcuts[name];put('atom',config.operators.has(name)?`\\operatorname{${text}}`:typeof shortcut==='string'?shortcut:shortcut?.value||text,text.length);continue;}
   put('word',text,text.length);continue;
  }
  const char=String.fromCodePoint(source.codePointAt(i));
  if('([{'.includes(char)){put('open',char,1);continue;}if(')]}'.includes(char)){put('close',char,1);continue;}
  if('^_'.includes(char)){put('script',char,1);continue;}
  const symbol=symbolicOperatorAt(rest);if(symbol){put('op',symbol.value,symbol.text.length);continue;}
  if(/[α-ωΑ-Ω∞ℝℤℕℚℂ]/u.test(char)){put('atom',char,1,{variable:/[α-ωΑ-Ω]/u.test(char)});continue;}
  if(mode==='math'&&/^[\p{L}\p{M}]$/u.test(char)){put('atom',char,char.length,{variable:true});continue;}
  put('punctuation',char,char.length);
 }
 // Compact products need mathematical context, which can come from a group
 // as well as an equation. A separately entered bracket must not depend on
 // retaining the source of an earlier relation or fraction.
 const mathematicalContext=tokens.some(token=>token.type==='op'&&establishesMathContext(token)||['open','spokenGroup'].includes(token.type));
 // A complete structural operand also establishes mathematical context. A
 // leading compact product must not depend on an unrelated equals sign.
 const structuralContext=tokens.some((token,index)=>{
  if(!isStructuredMathOperand(token))return false;
  const parsed=parseMath(tokens,index,{mode});
  return parsed&&parsed.end>index+1;
 });
 const compactIdentifier=token=>!PROSE_WORDS.has(token.value.toLowerCase())&&(/^[A-Za-z]{2,3}$/.test(token.value)||structuralContext&&/^[A-Z]{2,}$/.test(token.value));
 const compactProduct=(mathematicalContext||structuralContext)&&
  tokens.some(token=>token.type==='word')&&!tokens.some((token,index)=>token.type==='word'&&tokens[index+1]?.type==='word')&&tokens.every(token=>token.type==='word'?compactIdentifier(token):token.type!=='disabledStructure');
 if(compactProduct)return tokens.flatMap(token=>token.type==='word'?[...token.value].map((value,index)=>({type:'atom',value,variable:true,fromWord:true,wordOffset:index,...(index===0&&token.spaceBefore?{spaceBefore:token.spaceBefore}:{}),start:token.start+index,end:token.start+index+1})):token);
 return tokens;
}
export function hasPendingSpokenOperator(source,options={}){
 const text=source.trimEnd().toLowerCase();
 for(const [phrase,type]of SPEECH){
  if(type!=='op')continue;
  for(let length=phrase.length;length>0;length--){
   if(!text.endsWith(' '+phrase.slice(0,length)))continue;
   const left=source.trimEnd().slice(0,-length).trimEnd(),tokens=tokenizeMath(left,options),parsed=parseMath(tokens,0,options);
   if(parsed&&parsed.end===tokens.length)return true;
  }
 }
 return false;
}
const node=(latex,evidence=0,extra={})=>({latex,evidence,...extra});
// A small structural grammar, with explicit failure instead of speculative fixes.
export function parseMath(tokens,start=0,options={}){
 const direct=parseTokens(tokens,start,options);
 const complete=result=>result&&(result.end===tokens.length||result.end===tokens.length-1&&tokens.at(-1).type==='punctuation'&&'.;?!'.includes(tokens.at(-1).value));
 if(options.stopAtComma||!tokens.some(isPause))return direct;
 const separators=tokens.every((token,index)=>!isComma(token)||endsMathOperand(tokens[index-1])&&startsMathOperand(tokens[index+1],{slot:true}));
 if(complete(direct)&&direct.latex.includes(',')&&(separators||tokens[start]?.type==='quantifier'))return direct;
 // Retry a recognition view with pauses removed. Keep original tokens and
 // source offsets intact, including for mixed prose and replacement inputs.
 const indices=[],filtered=tokens.filter((token,index)=>{if(isPause(token))return false;indices.push(index);return true;});
 const offset=indices.findIndex(index=>index>=start);if(offset<0)return direct;
 const parsed=parseTokens(filtered,offset,options);if(!parsed)return direct;
 const result={...parsed,end:indices[parsed.end]??tokens.length};
 return !direct||result.end>=direct.end?result:direct;
}
function parseTokens(tokens,start=0,{mode,afterMath=false,allowIncompleteRelation=false,allowIncompleteFraction=false,allowIncompletePrefix=false,stopAtComma=false,preserveSpacing=false}={}){
 let index=start,depth=0,relativeComparison=false,pendingFraction=false,pendingPrefix=false;const peek=()=>tokens[index],take=()=>tokens[index++];
 function coordinate(){
  const token=peek();if(!token?.variable)throw Error('Expected an identifier');return atom({scripts:false});
 }
 function atom({scripts=true,apply=true}={}){
  if(++depth>64)throw Error('Math nesting limit');
  while(isComma(peek()))take();
  let result;const leadingScript=mode==='math'&&index===start&&isMathPostfix(peek());
  const token=leadingScript?{type:'atom',value:'#?'}:take();if(leadingScript)pendingPrefix=true;
  const rule=operandRule(token);
  if(!token){if(mode==='math'){index--;pendingPrefix=true;depth--;return node('#?',2);}throw Error('Missing operand');}
  if(rule==='literal'){
   if(token.context&&mode!=='math'&&!afterMath&&index===start+1)throw Error('Missing left operand');
   result=node(token.value,token.measurement?2:token.variable||token.number?0:1,{simple:true,numeric:!!token.number,template:token.template,vector:!!token.vector,scripts:token.scripts});
   if(token.template){
    while(result.latex.includes('#?')&&startsMathOperand(peek(),{slot:true})){
     const child=atom();result=node(result.latex.replace('#?',()=>child.latex),result.evidence+child.evidence+1,{template:true});
    }
    if(result.latex.includes('#?'))pendingPrefix=true;
   }
  }else if(rule==='group'){
   let body=expression(0,new Set(['comma']));
   while(isComma(peek())){take();if(peek()?.type==='close')break;const next=expression(0,new Set(['comma']));body=node(body.latex+','+next.latex,body.evidence+next.evidence);}
   const expected={'(':')','[':']','{':'}'}[token.value];
   let closing=peek();
   if(closing?.type==='close'&&(closing.value===expected||closing.genericClose||token.type==='spokenGroup'&&[')',']'].includes(closing.value))){take();if(token.type==='spokenGroup'||closing.genericClose)closing={...closing,value:expected};}
   else if(token.type==='spokenGroup'&&(!closing||closing.type==='punctuation'&&'.;?!'.includes(closing.value)))closing={value:expected};
   else throw Error('Unclosed group');
   result=node(`\\left${token.value==='{'?'\\{':token.value}${body.latex}\\right${closing.value==='}'?'\\}':closing.value}`,body.evidence+1,{grouped:true});
  }else if(rule==='sign'){
   const child=atom({scripts,apply});result=node(token.value+child.latex,child.evidence,{simple:child.simple,numeric:child.numeric});
  }else if(rule==='prefix'){
   const wrap=body=>token.value==='\\vec'?`${token.value}{${body}}`:token.value+' '+body;
   if(!peek()&&token.value!=='\\vec'){result=node(allowIncompletePrefix?wrap('#?'):token.value,2);pendingPrefix=allowIncompletePrefix;}
   else{const child=atom();const vector=token.value==='\\vec';result=node(vector&&child.vector?child.latex:wrap(child.latex),child.evidence+2,{vector});}
  }else if(rule==='derivative'){
   const variable=coordinate();if(take()?.type!=='of')throw Error('Missing derivative body');
   const body=expression(15);result=node(`\\frac{d}{d ${variable.latex}}${body.latex}`,3);
  }else if(rule==='bounded'){
   let bounds='';
   if(token.value==='bounded'){const lower=expression(0,new Set(['boundTo']));if(take()?.type!=='boundTo')throw Error('Missing upper bound');const upper=expression(0,new Set(['of']));if(take()?.type!=='of')throw Error('Missing bounded body');bounds=`_{${lower.latex}}^{${upper.latex}}`;}
   const body=expression(15,token.type==='integral'?new Set(['differential']):new Set(['over']));
   let differential='';if(token.type==='integral'){if(take()?.value!=='d')throw Error('Missing differential');const variable=take();if(!variable?.variable)throw Error('Missing differential variable');differential=`\\,d ${variable.value}`;}
   result=node(`\\${token.type==='integral'?'int':'sum'}${bounds} ${body.latex}${differential}`,3);
  }else if(rule==='limit'){
   const variable=coordinate();if(take()?.type!=='approaches')throw Error('Missing limit direction');const target=expression(0,new Set(['of']));if(take()?.type!=='of')throw Error('Missing limit body');const body=expression(15);result=node(`\\lim_{${variable.latex}\\to ${target.latex}}${body.latex}`,3);
  }else if(rule==='naturalFraction'){
   const numerator=expression(0,new Set(['over']));if(take()?.value!=='/')throw Error('Missing fraction bar');const denominator=expression(15);result=node(`\\frac{${numerator.latex}}{${denominator.latex}}`,3,{grouped:true});
  }else if(rule==='fraction'){
   const numerator=expression(0,new Set(['over']));
   if(peek()?.value!=='/'||!peek()?.spoken)throw Error('Missing fraction bar');take();
   const denominator=expression(0);if(take()?.type!=='endFraction')throw Error('Unclosed fraction');
   result=node(`\\frac{${numerator.latex}}{${denominator.latex}}`,3,{grouped:true});
  }else if(rule==='rootStart'){
   const child=expression(0);if(take()?.type!=='endRoot')throw Error('Unclosed root');result=node(`\\sqrt{${child.latex}}`,3,{grouped:true});
  }else if(rule==='application'){
   let functionHead=node(token.value);
   if(token.type==='function'){
    functionHead=postfixed(functionHead);
    const explicitArgument=peek()?.type==='of';if(explicitArgument)take();
    // Function names are also values. Without an explicit argument, leave
    // following infix operators and prose to their enclosing grammar.
    if(!explicitArgument&&(peek()?.pending||!startsMathOperand(peek(),{slot:true})||continuesMathOperand(peek()))){depth--;return {...functionHead,evidence:2};}
   }
   // Spoken roots extend through the following sum, ending at an outer
   // fraction bar, comparison, or explicit closing delimiter.
   const child=token.type==='root'&&peek()?.type!=='open'?expression(20,new Set(['over'])):atom();
   result=node(token.type==='root'?`\\sqrt${token.value==='3'?'[3]':''}{${child.latex}}`:token.type==='absolute'?`\\left|${child.latex}\\right|`:`${functionHead.latex}${child.grouped?child.latex:`\\left(${child.latex}\\right)`}`,2,{grouped:child.grouped});
  }else if(rule==='quantifier'){
   // A named domain binds one explicit variable; a following word is prose,
   // rather than an implicit product of the binder and its first letter.
   if(token.binder&&startsMathOperand(tokens[index+1],{product:true}))throw Error('Expected a predicate after the binding');
   const child=expression(0,new Set(['comma']));result=node(token.value+' '+(token.binder?`\\text{${token.binder} }`:'')+child.latex,child.evidence+2);
   // A comma separates quantified variables from their mathematical predicate.
   // Keep this local to quantifiers so ordinary prose commas do not imply math.
   while(isComma(peek())){
    while(isComma(peek()))take();
    if(!peek()||peek().type==='close'||peek().type==='punctuation'&&'.;?!'.includes(peek().value)){result=node(result.latex+', ',result.evidence);break;}
    const predicate=expression(0,new Set(['comma']));
    result=node(result.latex+', '+predicate.latex,result.evidence+predicate.evidence);
   }
  }else throw Error('Not a mathematical operand');
  if(scripts)result=postfixed(result);
  if(apply&&scripts&&peek()?.type==='of'&&token.variable&&(!token.quantity||mode==='math')){take();const argument=atom();result=node(`${result.latex}${argument.grouped?argument.latex:`\\left(${argument.latex}\\right)`}`,2);}
  depth--;return result;
 }
 function postfixed(result){
  while(isMathPostfix(peek())){
   if(peek().type==='factorial'){take();result=node(result.latex+'!',result.evidence+1);continue;}
   if(peek().type==='accent'){const accent=take();result=node(`${accent.value}{${result.latex}}`,result.evidence+1);continue;}
   const operation=take();let child;
   if(operation.type==='prime')child=node('\\prime');
   else if(operation.type==='postfix')child=node(operation.value);
   else if(operation.type==='ordinal'){const n=take();if(n?.type!=='ordinalNumber')throw Error('Unknown ordinal');child=node(n.value);}
   else child=atom({scripts:false});
   const slot=operation.value==='_'?'_':'^',base=result.scripts?.[slot]?`{${result.latex}}`:result.latex;
   result=node(`${base}${slot}{${child.latex}}`,result.evidence+2,{numeric:child.numeric,vector:result.vector,scripts:{...(result.scripts?.[slot]?{}:result.scripts),[slot]:true}});
  }
  return result;
 }
 function expression(minimum=0,stops=new Set()){
  let left;
  if(afterMath&&index===start&&continuesMathOperand(peek()))left=node('',1);
  else if(mode==='math'&&index===start&&peek()?.type==='op'&&!['-','+'].includes(peek().value)){left=node('#?',2);pendingPrefix=true;}
  else left=atom({apply:!stops.has('of')});
  // A dictation fragment can apply a postfix to an existing canvas operand.
  if(!left.latex&&isMathPostfix(peek()))left=postfixed(left);
  while(index<tokens.length){
   let token=peek();
   // A relative comparison refers to the preceding comparison's right side:
   // a < b, which < c means a < b < c. Ordinary relative-clause prose does
   // not qualify, and all operands must still pass the mathematical grammar.
   if(left.comparison&&minimum<=10){
    let relative=index;if(tokens[relative]?.type==='punctuation'&&tokens[relative].value===',')relative++;
    if(tokens[relative]?.type==='word'&&tokens[relative].value.toLowerCase()==='which'&&tokens[relative+1]?.type==='op'&&isMathComparison(tokens[relative+1])){index=relative+1;token=peek();relativeComparison=true;}
   }
   // Dictation punctuation is a pause, not a reason to reject math. Groups
   // and quantified predicates explicitly retain their separator semantics.
   if(isComma(token)){if(stops.has('comma')||tokens[index+1]?.type==='word')break;take();continue;}
   if(stops.has(token.type)||token.type==='op'&&token.value==='/'&&stops.has('over')||stops.has('differential')&&token.variable&&token.value==='d'&&tokens[index+1]?.variable)break;
   if(token.type==='op'){
    // Spoken "over" is a fraction bar over the surrounding sum. A slash
    // or "divided by" retains ordinary division precedence.
    const fractionBar=token.spoken&&token.value==='/'&&!token.dividedBy;
    const rank=mathOperatorRank(token);if(rank<minimum)break;
    // A function, ordinary spoken division, or exponent with ungrouped scope is
    // structurally ambiguous. Preserve its original text instead of choosing.
    if(mode!=='math'&&left.scope&&rank>=20)throw Error('Ambiguous scope');
    take();
    // Optional spoken connector belongs to the equality production. Keep
    // the existing short equality shortcut immediate during live typing.
    if(token.value==='='&&peek()?.type==='boundTo')take();
    if(allowIncompleteFraction&&token.spoken&&token.value==='/'&&index===tokens.length){
     left=node(`\\frac{${left.latex}}{#?}`,left.evidence+2);pendingFraction=true;break;
    }
    // A recognized scratchpad expression can await its next operand. This
    // preserves notation during editing without accepting unknown prose.
    if(allowIncompleteRelation&&(index===tokens.length||index===tokens.length-1&&peek()?.type==='punctuation'&&'.;?!'.includes(peek().value))&&token.value!=='/'){
     if(mode==='math'&&token.value==='\\choose'){left=node(`\\binom{${left.latex}}{#?}`,left.evidence+2);pendingPrefix=true;}
     else left=node(left.latex+token.value,left.evidence+2);break;
    }
    // Bare spoken “bracket” starts a following grouped product once the
    // denominator has an operand. Explicit opening delimiters retain scope.
    const right=expression(fractionBar?31:rank+1,fractionBar?new Set([...stops,'spokenGroup']):stops);
    if(mode!=='math'&&rank===20&&right.divisionScope)throw Error('Ambiguous fraction scope');
    left=node(token.value==='\\choose'?`\\binom{${left.latex}}{${right.latex}}`:token.value==='/'?`\\frac{${left.latex}}{${right.latex}}`:left.latex+token.value+' '+right.latex,left.evidence+right.evidence+2,{scope:token.dividedBy&&!right.grouped,divisionScope:token.dividedBy&&!right.grouped,comparison:isMathComparison(token)});
   }else if(startsMathOperand(token,{product:true})){
    if(40<minimum)break;
    // LaTeX ignores ordinary spaces. An incremental source run must retain
    // the spaces actually typed between operands, including compound words.
    const space=preserveSpacing&&token.spaceBefore?token.spaceBefore.replace(/\s/gu,'\\ '):' ';
    const right=atom({apply:!stops.has('of')});left=node(left.latex+space+right.latex,left.evidence+right.evidence,{scope:left.scope||right.scope});
   }else break;
  }
  return left;
 }
 try{const result=expression(0,new Set(stopAtComma?['comma']:[]));return {...result,end:index,relativeComparison,pendingFraction,pendingPlaceholder:pendingFraction||pendingPrefix};}catch{return null;}
}
