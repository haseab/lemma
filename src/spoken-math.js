import {vocabulary,phraseAtEnd} from './math-words.js';
const SMALL='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const ORDINAL={second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
const UPPER_GREEK={alpha:'A',beta:'B',epsilon:'E',zeta:'Z',eta:'H',iota:'I',kappa:'K',mu:'M',nu:'N',omicron:'O',rho:'P',tau:'T',chi:'X'};
const FUNCTIONS={sine:'sin',cosine:'cos',tangent:'tan',logarithm:'log',secant:'sec',cosecant:'csc',cotangent:'cot',sec:'sec',csc:'csc',cot:'cot',sin:'sin',cos:'cos',tan:'tan',log:'log',ln:'ln',exp:'exp'};
const BINARY=new Set(['\\pm','\\mp','\\in','\\notin','\\subseteq','\\subset','\\supseteq','\\supset','\\cup','\\cap','\\ne','\\le','\\ge','\\approx','\\cong','\\propto','\\parallel','\\perp','\\mid','\\nmid','\\equiv','\\otimes','\\oplus','\\cdot','\\times','\\circ','\\dashv','\\mapsto','\\to','\\leftarrow','\\Rightarrow','\\Leftrightarrow','\\iff','\\wedge','\\vee','<','>','=']);
const COMPARISONS=new Set(['<','>','=','\\le','\\ge','\\ne','\\approx']);
const isPause=token=>token?.type==='punctuation'&&token.value===',';
const isComma=token=>token?.type==='comma'||isPause(token);
const SPEECH=[
 ['vector','prefix','\\vec'],['change in','prefix','\\Delta'],['change of','prefix','\\Delta'],
 ['the derivative with respect to','derivative','d'],['derivative with respect to','derivative','d'],
 ['integral from','integral','bounded'],['integral of','integral',''],['sum from','sum','bounded'],['limit as','limit',''],
 ['natural logarithm of','function','\\ln'],['natural log of','function','\\ln'],['log base','logBase',''],
 ['the fraction','naturalFraction',''],['all over','op','/'],['given','op','\\mid'],['choose','op','\\choose'],
 ['factorial','factorial',''],['prime','prime',''],['bar','accent','\\bar'],['hat','accent','\\hat'],
 ['comma','comma',','],['from','boundFrom',''],['approaches','approaches',''],['to','boundTo',''],
 ['the square root of','root','2'],['the cube root of','root','3'],
 ['open parenthesis','open','('],['left parenthesis','open','('],['close parenthesis','close',')'],['right parenthesis','close',')'],
 ['bracket','spokenGroup','('],['open bracket','open','['],['close bracket','close',']'],
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
export function tokenizeMath(source,{groups,libraries,shortcuts={}}={}){
 const config=vocabulary(groups,libraries),tokens=[],patterns=new Map();let i=0;
 const phraseLength=(rest,text,lower)=>{
  // Dictation and copied text can contain NBSP, narrow NBSP, or repeated
  // spaces. Match them without normalizing the source or losing offsets.
  let entry=patterns.get(text);
  if(!entry){entry={head:text.split(' ',1)[0],pattern:null};patterns.set(text,entry);}
  if(!lower.startsWith(entry.head))return 0;
  if(!entry.pattern)entry.pattern=new RegExp('^'+text.split(/\s+/).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('[\\s,]+')+'(?![\\p{L}\\p{N}])','iu');
  return rest.match(entry.pattern)?.[0].length||0;
 };
 const put=(type,value,length,extra={})=>{tokens.push({type,value,start:i,end:i+length,...extra});i+=length;};
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
  const caseName=rest.match(/^(capital|uppercase|lowercase)[\s,]+([A-Za-z]+)(?![A-Za-z])/i);
  if(caseName){
   const name=caseName[2].toLowerCase(),greek=config.phrases.find(p=>p.group==='greek'&&p.text===name);
   if(name.length===1||greek){const upper=caseName[1].toLowerCase()!=='lowercase';const value=greek?(upper?(UPPER_GREEK[name]||'\\'+name[0].toUpperCase()+name.slice(1)):'\\'+name):(upper?name.toUpperCase():name);put('atom',value,caseName[0].length,{variable:true});continue;}
  }
  const fractionNumber=rest.match(/^(one|two|three|four|five|six|seven|eight|nine)[\s,]+(half|halves|thirds?|quarters?|fourths?|fifths?|sixths?|sevenths?|eighths?|ninths?|tenths?)\b/i);
  if(fractionNumber){const numerator=SMALL.indexOf(fractionNumber[1].toLowerCase()),part=fractionNumber[2].toLowerCase().replace(/s$/,'');const denominator={half:2,halve:2,third:3,quarter:4,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10}[part];put('atom',`\\frac{${numerator}}{${denominator}}`,fractionNumber[0].length,{number:true});continue;}
  const number=rest.match(/^\d+(?:\.\d+)?/);if(number){
   const previous=tokens.at(-1);
   if(previous?.variable&&previous.end===i&&!number[0].includes('.')){
    previous.value+=`_{${number[0]}}`;previous.end=i+number[0].length;i+=number[0].length;continue;
   }
   put('atom',number[0],number[0].length,{number:true});continue;
  }
  const spokenNumber=numberAt(lower);if(spokenNumber){
   const previous=tokens.at(-1);
   if(previous?.variable&&!spokenNumber.value.includes('.')){previous.value+=`_{${spokenNumber.value}}`;previous.end=i+spokenNumber.text.length;i+=spokenNumber.text.length;continue;}
   put('atom',spokenNumber.value,spokenNumber.text.length,{number:true});continue;
  }
  const indexedName=config.phrases.find(p=>p.group==='greek'&&lower.startsWith(p.text)&&/\d/.test(rest[p.text.length]||''));
  if(indexedName){put('atom',indexedName.latex,indexedName.text.length,{variable:true});continue;}
  const phrase=config.phrases.find(p=>phraseLength(rest,p.text,lower));
  // Shared multiword definitions outrank shorter spoken operators, so
  // "plus" cannot consume the start of "plus or minus".
  const speech=SPEECH.find(([text])=>(text!=='choose'||['atom','close','factorial'].includes(previousToken?.type))&&phraseLength(rest,text,lower)&&(!phrase||phraseLength(rest,text,lower)>=phraseLength(rest,phrase.text,lower)));
  if(speech){
   const [text,type,value]=speech;
   const structural=['prefix','root','rootStart','absolute','fraction','endFraction','endRoot','naturalFraction','derivative','integral','sum','limit','logBase','function'].includes(type);
   if(structural&&!config.phrases.some(p=>p.group===(value==='\\vec'?'linear':'calculus')))put('disabledStructure',text,phraseLength(rest,text,lower));
   else put(type,value,phraseLength(rest,text,lower),{spoken:true,dividedBy:text==='divided by'});
   continue;
  }
  const matrix=lower.match(/^\d{1,2}\s*(?:x|×|by)\s*\d{1,2}\s+matrix\b/); // Numeric matrices are handled by the caller's template path.
  if(matrix){const phrase=phraseAtEnd(matrix[0],groups,false,libraries);if(phrase){put('atom',phrase.latex,matrix[0].length,{template:true});continue;}}
  if(phrase){put(['\\forall','\\exists','\\nexists'].includes(phrase.latex)?'quantifier':BINARY.has(phrase.latex)?'op':'atom',phrase.latex,phraseLength(rest,phrase.text,lower),{template:phrase.template,context:phrase.context,variable:phrase.group==='greek'});continue;}
  const word=rest.match(/^[A-Za-z]+/);
  if(word){const text=word[0],name=text.toLowerCase(),fn=FUNCTIONS[name];
   if(fn&&config.words.has(fn)){put('function','\\'+fn,text.length);continue;}
   if(ORDINAL[name]){put('ordinalNumber',String(ORDINAL[name]),text.length);continue;}
   if(text.length===1){put('atom',text,1,{variable:true});continue;}
   // Compact coefficient notation, such as 5pq, denotes adjacent variables.
   // Leave longer words and known function names to their existing paths.
   if(text.length<=3&&!config.words.has(name)&&(tokens.at(-1)?.number&&tokens.at(-1).end===i||/^\d/.test(rest.slice(text.length)))){
    for(const letter of text)put('atom',letter,1,{variable:true});continue;
   }
   if(config.words.has(name)){const shortcut=shortcuts[text]||shortcuts[name];put('atom',config.operators.has(name)?`\\operatorname{${text}}`:typeof shortcut==='string'?shortcut:shortcut?.value||text,text.length);continue;}
   put('word',text,text.length);continue;
  }
  const char=source[i];
  if('([{'.includes(char)){put('open',char,1);continue;}if(')]}'.includes(char)){put('close',char,1);continue;}
  if('^_'.includes(char)){put('script',char,1);continue;}
  if('+-=<>*/'.includes(char)){put('op',char==='*'?'\\times':char,1);continue;}
  if(/[α-ωΑ-Ω∞ℝℤℕℚℂ]/u.test(char)){put('atom',char,1,{variable:/[α-ωΑ-Ω]/u.test(char)});continue;}
  put('punctuation',char,1);
 }
 // In a fully mathematical equation, compact letter products are identifiers,
 // not prose words. Require a relation and an otherwise complete math token
 // stream; never split words inside ordinary sentences or named domains.
 const compactEquation=tokens.some(token=>token.type==='op'&&COMPARISONS.has(token.value))&&
  tokens.some(token=>token.type==='word')&&!tokens.some((token,index)=>token.type==='word'&&tokens[index+1]?.type==='word')&&tokens.every(token=>token.type==='word'?/^[A-Za-z]{2,3}$/.test(token.value):token.type!=='disabledStructure');
 if(compactEquation)return tokens.flatMap(token=>token.type==='word'?[...token.value].map((value,index)=>({type:'atom',value,variable:true,start:token.start+index,end:token.start+index+1})):token);
 return tokens;
}
function precedence(value){return ['+','-'].includes(value)?20:['/','\\times','\\cdot','\\otimes','\\circ'].includes(value)?30:10;}
export function hasPendingSpokenOperator(source,options={}){
 const text=source.trimEnd().toLowerCase();
 for(const [phrase,type]of SPEECH){
  if(type!=='op')continue;
  for(let length=phrase.length;length>0;length--){
   if(!text.endsWith(' '+phrase.slice(0,length)))continue;
   const left=source.trimEnd().slice(0,-length).trimEnd(),tokens=tokenizeMath(left,options),parsed=parseMath(tokens);
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
 const separators=tokens.every((token,index)=>!isComma(token)||['atom','close','postfix','factorial','prime'].includes(tokens[index-1]?.type)&&['atom','prefix','open','function','negative','root','absolute'].includes(tokens[index+1]?.type));
 if(complete(direct)&&direct.latex.includes(',')&&(separators||tokens[start]?.type==='quantifier'))return direct;
 // Retry a recognition view with pauses removed. Keep original tokens and
 // source offsets intact, including for mixed prose and replacement inputs.
 const indices=[],filtered=tokens.filter((token,index)=>{if(isPause(token))return false;indices.push(index);return true;});
 const offset=indices.findIndex(index=>index>=start);if(offset<0)return direct;
 const parsed=parseTokens(filtered,offset,options);if(!parsed)return direct;
 const result={...parsed,end:indices[parsed.end]??tokens.length};
 return !direct||result.end>=direct.end?result:direct;
}
function parseTokens(tokens,start=0,{afterMath=false,allowIncompleteRelation=false,allowIncompleteFraction=false,allowIncompletePrefix=false,stopAtComma=false}={}){
 let index=start,depth=0,relativeComparison=false,pendingFraction=false,pendingPrefix=false;const peek=()=>tokens[index],take=()=>tokens[index++];
 function coordinate(){
  const token=peek();if(!token?.variable)throw Error('Expected an identifier');return atom({scripts:false});
 }
 function atom({scripts=true,apply=true}={}){
  if(++depth>64)throw Error('Math nesting limit');
  while(isComma(peek()))take();
  let result;const token=take();if(!token)throw Error('Missing operand');
  if(token.type==='atom'){
   if(token.context&&!afterMath&&index===start+1)throw Error('Missing left operand');
   result=node(token.value,token.variable||token.number?0:1,{simple:true,numeric:!!token.number,template:token.template});
  }else if(['open','spokenGroup'].includes(token.type)){
   let body=expression(0,new Set(['comma']));
   while(isComma(peek())){take();if(peek()?.type==='close')break;const next=expression(0,new Set(['comma']));body=node(body.latex+','+next.latex,body.evidence+next.evidence);}
   const expected={'(':')','[':']','{':'}'}[token.value];
   let closing=peek();
   if(closing?.type==='close'&&(closing.value===expected||token.type==='spokenGroup'&&[')',']'].includes(closing.value))){take();if(token.type==='spokenGroup')closing={...closing,value:expected};}
   else if(token.type==='spokenGroup'&&(!closing||closing.type==='punctuation'&&'.;?!'.includes(closing.value)))closing={value:expected};
   else throw Error('Unclosed group');
   result=node(`\\left${token.value==='{'?'\\{':token.value}${body.latex}\\right${closing.value==='}'?'\\}':closing.value}`,body.evidence+1,{grouped:true});
  }else if(token.type==='negative'||token.type==='op'&&['-','+'].includes(token.value)){
   const child=atom({scripts,apply});result=node(token.value+child.latex,child.evidence,{simple:child.simple,numeric:child.numeric});
  }else if(token.type==='prefix'){
   const wrap=body=>token.value==='\\vec'?`${token.value}{${body}}`:token.value+' '+body;
   if(!peek()&&allowIncompletePrefix&&token.value!=='\\vec'){result=node(wrap('#?'),2);pendingPrefix=true;}
   else{const child=atom();result=node(wrap(child.latex),child.evidence+2);}
  }else if(token.type==='derivative'){
   const variable=coordinate();if(take()?.type!=='of')throw Error('Missing derivative body');
   const body=expression(15);result=node(`\\frac{d}{d ${variable.latex}}${body.latex}`,3);
  }else if(['integral','sum'].includes(token.type)){
   let bounds='';
   if(token.value==='bounded'){const lower=expression(0,new Set(['boundTo']));if(take()?.type!=='boundTo')throw Error('Missing upper bound');const upper=expression(0,new Set(['of']));if(take()?.type!=='of')throw Error('Missing bounded body');bounds=`_{${lower.latex}}^{${upper.latex}}`;}
   const body=expression(15,token.type==='integral'?new Set(['differential']):new Set(['over']));
   let differential='';if(token.type==='integral'){if(take()?.value!=='d')throw Error('Missing differential');const variable=take();if(!variable?.variable)throw Error('Missing differential variable');differential=`\\,d ${variable.value}`;}
   result=node(`\\${token.type==='integral'?'int':'sum'}${bounds} ${body.latex}${differential}`,3);
  }else if(token.type==='limit'){
   const variable=coordinate();if(take()?.type!=='approaches')throw Error('Missing limit direction');const target=expression(0,new Set(['of']));if(take()?.type!=='of')throw Error('Missing limit body');const body=expression(15);result=node(`\\lim_{${variable.latex}\\to ${target.latex}}${body.latex}`,3);
  }else if(token.type==='naturalFraction'){
   const numerator=expression(0,new Set(['over']));if(take()?.value!=='/')throw Error('Missing fraction bar');const denominator=expression(15);result=node(`\\frac{${numerator.latex}}{${denominator.latex}}`,3,{grouped:true});
  }else if(token.type==='logBase'){
   const base=atom({scripts:false});if(take()?.type!=='of')throw Error('Missing logarithm argument');const argument=atom();result=node(`\\log_{${base.latex}}${argument.grouped?argument.latex:`\\left(${argument.latex}\\right)`}`,3);
  }else if(token.type==='fraction'){
   const numerator=expression(0,new Set(['over']));
   if(peek()?.value!=='/'||!peek()?.spoken)throw Error('Missing fraction bar');take();
   const denominator=expression(0);if(take()?.type!=='endFraction')throw Error('Unclosed fraction');
   result=node(`\\frac{${numerator.latex}}{${denominator.latex}}`,3,{grouped:true});
  }else if(token.type==='rootStart'){
   const child=expression(0);if(take()?.type!=='endRoot')throw Error('Unclosed root');result=node(`\\sqrt{${child.latex}}`,3,{grouped:true});
  }else if(['root','absolute','function'].includes(token.type)){
   if(token.type==='function'&&peek()?.type==='of')take();
   // Spoken roots extend through the following sum, ending at an outer
   // fraction bar, comparison, or explicit closing delimiter.
   let functionPower='';if(token.type==='function'&&peek()?.type==='postfix')functionPower=`^{${take().value}}`;
   const child=token.type==='root'&&peek()?.type!=='open'?expression(20,new Set(['over'])):atom();
   result=node(token.type==='root'?`\\sqrt${token.value==='3'?'[3]':''}{${child.latex}}`:token.type==='absolute'?`\\left|${child.latex}\\right|`:`${token.value}${functionPower}${child.grouped?child.latex:`\\left(${child.latex}\\right)`}`,2,{grouped:child.grouped});
  }else if(token.type==='quantifier'){
   // A named domain binds one explicit variable; a following word is prose,
   // rather than an implicit product of the binder and its first letter.
   if(token.binder&&['atom','function','open'].includes(tokens[index+1]?.type))throw Error('Expected a predicate after the binding');
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
  while(scripts&&['postfix','script','ordinal','factorial','prime','accent'].includes(peek()?.type)){
   if(peek().type==='factorial'){take();result=node(result.latex+'!',result.evidence+1);continue;}
   if(peek().type==='prime'){take();result=node(result.latex+'^{\\prime}',result.evidence+1);continue;}
   if(peek().type==='accent'){const accent=take();result=node(`${accent.value}{${result.latex}}`,result.evidence+1);continue;}
   const operation=take();let child;
   if(operation.type==='postfix')child=node(operation.value);
   else if(operation.type==='ordinal'){const n=take();if(n?.type!=='ordinalNumber')throw Error('Unknown ordinal');child=node(n.value);}
   else child=atom({scripts:false});
   result=node(`${result.latex}${operation.value==='_'?'_':'^'}{${child.latex}}`,result.evidence+2,{numeric:child.numeric});
  }
  if(apply&&scripts&&peek()?.type==='of'&&token.variable){take();const argument=atom();result=node(`${result.latex}${argument.grouped?argument.latex:`\\left(${argument.latex}\\right)`}`,2);}
  depth--;return result;
 }
 function expression(minimum=0,stops=new Set()){
  let left;
  if(afterMath&&index===start&&['op','postfix','script'].includes(peek()?.type))left=node('',1);
  else left=atom({apply:!stops.has('of')});
  // A dictation fragment can apply a postfix to an existing canvas operand.
  if(!left.latex&&peek()?.type==='postfix')left=node(`^{${take().value}}`,2);
  if(!left.latex&&peek()?.type==='script'){const op=take(),right=atom();left=node(`${op.value}{${right.latex}}`,2);}
  while(index<tokens.length){
   let token=peek();
   // A relative comparison refers to the preceding comparison's right side:
   // a < b, which < c means a < b < c. Ordinary relative-clause prose does
   // not qualify, and all operands must still pass the mathematical grammar.
   if(left.comparison&&minimum<=10){
    let relative=index;if(tokens[relative]?.type==='punctuation'&&tokens[relative].value===',')relative++;
    if(tokens[relative]?.type==='word'&&tokens[relative].value.toLowerCase()==='which'&&tokens[relative+1]?.type==='op'&&COMPARISONS.has(tokens[relative+1].value)){index=relative+1;token=peek();relativeComparison=true;}
   }
   // Dictation punctuation is a pause, not a reason to reject math. Groups
   // and quantified predicates explicitly retain their separator semantics.
   if(isComma(token)){if(stops.has('comma')||tokens[index+1]?.type==='word')break;take();continue;}
   if(stops.has(token.type)||token.type==='op'&&token.value==='/'&&stops.has('over')||stops.has('differential')&&token.variable&&token.value==='d'&&tokens[index+1]?.variable)break;
   if(token.type==='op'){
    // Spoken "over" is a fraction bar over the surrounding sum. A slash
    // or "divided by" retains ordinary division precedence.
    const fractionBar=token.spoken&&token.value==='/'&&!token.dividedBy;
    const rank=token.value==='\\choose'?35:fractionBar?15:['\\pm','\\mp'].includes(token.value)?20:precedence(token.value);if(rank<minimum)break;
    // A function, ordinary spoken division, or exponent with ungrouped scope is
    // structurally ambiguous. Preserve its original text instead of choosing.
    if(left.scope&&rank>=20)throw Error('Ambiguous scope');
    take();
    if(allowIncompleteFraction&&token.spoken&&token.value==='/'&&index===tokens.length){
     left=node(`\\frac{${left.latex}}{#?}`,left.evidence+2);pendingFraction=true;break;
    }
    // An explicitly quantified scratchpad statement may end at a comparison.
    // Do not accept missing arithmetic operands or salvage incomplete prose.
    if(allowIncompleteRelation&&tokens[start]?.type==='quantifier'&&index===tokens.length&&['=','<','>','\\le','\\ge','\\ne','\\in','\\notin'].includes(token.value)){
     left=node(left.latex+token.value,left.evidence+2);break;
    }
    // Bare spoken “bracket” starts a following grouped product once the
    // denominator has an operand. Explicit opening delimiters retain scope.
    const right=expression(fractionBar?31:rank+1,fractionBar?new Set([...stops,'spokenGroup']):stops);
    if(rank===20&&right.divisionScope)throw Error('Ambiguous fraction scope');
    left=node(token.value==='\\choose'?`\\binom{${left.latex}}{${right.latex}}`:token.value==='/'?`\\frac{${left.latex}}{${right.latex}}`:left.latex+token.value+' '+right.latex,left.evidence+right.evidence+2,{scope:token.dividedBy&&!right.grouped,divisionScope:token.dividedBy&&!right.grouped,comparison:COMPARISONS.has(token.value)});
   }else if(token.type==='atom'||token.type==='open'||token.type==='spokenGroup'||token.type==='function'||token.type==='prefix'){
    if(40<minimum)break;const right=atom({apply:!stops.has('of')});left=node(left.latex+' '+right.latex,left.evidence+right.evidence,{scope:left.scope||right.scope});
   }else break;
  }
  return left;
 }
 try{const result=expression(0,new Set(stopAtComma?['comma']:[]));return {...result,end:index,relativeComparison,pendingFraction,pendingPlaceholder:pendingFraction||pendingPrefix};}catch{return null;}
}
