import {vocabulary,phraseAtEnd} from './math-words.js';
const SMALL='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
const ORDINAL={second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
const FUNCTIONS={sine:'sin',cosine:'cos',tangent:'tan',logarithm:'log',sin:'sin',cos:'cos',tan:'tan',log:'log',ln:'ln',exp:'exp'};
const BINARY=new Set(['\\in','\\notin','\\subseteq','\\subset','\\supseteq','\\supset','\\cup','\\cap','\\ne','\\le','\\ge','\\approx','\\cong','\\propto','\\parallel','\\perp','\\mid','\\nmid','\\equiv','\\otimes','\\oplus','\\cdot','\\times','\\circ','\\dashv','\\mapsto','\\to','\\leftarrow','\\Rightarrow','\\Leftrightarrow','\\iff','\\wedge','\\vee','<','>','=']);
const SPEECH=[
 ['open parenthesis','open','('],['left parenthesis','open','('],['close parenthesis','close',')'],['right parenthesis','close',')'],
 ['open bracket','open','['],['close bracket','close',']'],
 ['start fraction','fraction',''],['end fraction','endFraction',''],['start root','rootStart',''],['end root','endRoot',''],
 ['to the power of','script','^'],['to the power','script','^'],['raised to','script','^'],['to the','ordinal',''],
 ['subscript','script','_'],['superscript','script','^'],['squared','postfix','2'],['cubed','postfix','3'],
 ['divided by','op','/'],['multiplied by','op','\\times'],['plus','op','+'],['minus','op','-'],['negative','negative','-'],['times','op','\\times'],['over','op','/'],
 ['absolute value of','absolute',''],['square root of','root','2'],['cube root of','root','3'],['of','of','']
];
function numberAt(text){
 const matches=[...text.slice(0,180).matchAll(/[a-z]+/g)];
 const words=[];let end=0;for(const match of matches){if(match.index===0||words.length&&/^[\s-]+$/.test(text.slice(end,match.index))){words.push(match[0]);end=match.index+match[0].length;}else break;}
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
 const config=vocabulary(groups,libraries),tokens=[];let i=0;
 const put=(type,value,length,extra={})=>{tokens.push({type,value,start:i,end:i+length,...extra});i+=length;};
 while(i<source.length){
  if(/\s/.test(source[i])){i++;continue;}
  const rest=source.slice(i),lower=rest.toLowerCase();
  const number=rest.match(/^\d+(?:\.\d+)?/);if(number){put('atom',number[0],number[0].length,{number:true});continue;}
  const spokenNumber=numberAt(lower);if(spokenNumber){put('atom',spokenNumber.value,spokenNumber.text.length,{number:true});continue;}
  // User definitions win over grammatical shorthand as well as built-in words.
  const custom=config.phrases.find(p=>p.custom&&lower.startsWith(p.text)&&!/[\p{L}\p{N}]/u.test(rest[p.text.length]||''));
  if(custom){put('atom',custom.latex,custom.text.length,{custom:true,context:custom.context,template:custom.template});continue;}
  const speech=SPEECH.find(([text])=>lower.startsWith(text)&&!/[\p{L}\p{N}]/u.test(rest[text.length]||''));
  if(speech){const [text,type,value]=speech;if(!['root','rootStart','absolute','fraction','endFraction','endRoot'].includes(type)||config.phrases.some(p=>p.group==='calculus')){put(type,value,text.length,{spoken:true});continue;}}
  const matrix=lower.match(/^\d{1,2}\s*(?:x|×|by)\s*\d{1,2}\s+matrix\b/); // Numeric matrices are handled by the caller's template path.
  if(matrix){const phrase=phraseAtEnd(matrix[0],groups,false,libraries);if(phrase){put('atom',phrase.latex,matrix[0].length,{template:true});continue;}}
  const phrase=config.phrases.find(p=>lower.startsWith(p.text)&&!/[\p{L}\p{N}]/u.test(rest[p.text.length]||''));
  if(phrase){put(['\\forall','\\exists','\\nexists'].includes(phrase.latex)?'quantifier':BINARY.has(phrase.latex)?'op':'atom',phrase.latex,phrase.text.length,{template:phrase.template,context:phrase.context});continue;}
  const word=rest.match(/^[A-Za-z]+/);
  if(word){const text=word[0],name=text.toLowerCase(),fn=FUNCTIONS[name];
   if(fn&&config.words.has(fn)){put('function','\\'+fn,text.length);continue;}
   if(ORDINAL[name]){put('ordinalNumber',String(ORDINAL[name]),text.length);continue;}
   if(text.length===1){put('atom',text,1,{variable:true});continue;}
   if(config.words.has(name)){const shortcut=shortcuts[text]||shortcuts[name];put('atom',config.operators.has(name)?`\\operatorname{${text}}`:typeof shortcut==='string'?shortcut:shortcut?.value||text,text.length);continue;}
   put('word',text,text.length);continue;
  }
  const char=source[i];
  if('([{'.includes(char)){put('open',char,1);continue;}if(')]}'.includes(char)){put('close',char,1);continue;}
  if('^_'.includes(char)){put('script',char,1);continue;}
  if('+-=<>*/'.includes(char)){put('op',char==='*'?'\\times':char,1);continue;}
  if(/[α-ωΑ-Ω∞ℝℤℕℚℂ]/u.test(char)){put('atom',char,1);continue;}
  put('punctuation',char,1);
 }
 return tokens;
}
function precedence(value){return ['+','-'].includes(value)?20:['/','\\times','\\cdot','\\otimes','\\circ'].includes(value)?30:10;}
const node=(latex,evidence=0,extra={})=>({latex,evidence,...extra});
// A small structural grammar, with explicit failure instead of speculative fixes.
export function parseMath(tokens,start=0,{afterMath=false}={}){
 let index=start,depth=0;const peek=()=>tokens[index],take=()=>tokens[index++];
 function atom(){
  if(++depth>64)throw Error('Math nesting limit');
  let result;const token=take();if(!token)throw Error('Missing operand');
  if(token.type==='atom'){
   if(token.context&&!afterMath&&index===start+1)throw Error('Missing left operand');
   result=node(token.value,token.variable||token.number?0:1,{simple:true,numeric:!!token.number,template:token.template});
   if(token.variable&&peek()?.type==='of'){take();const argument=atom();result=node(`${result.latex}${argument.grouped?argument.latex:`\\left(${argument.latex}\\right)`}`,2);}
  }else if(token.type==='open'){
   const body=expression(0),closing=take(),expected={'(':')','[':']','{':'}'}[token.value];
   if(closing?.type!=='close'||closing.value!==expected)throw Error('Unclosed group');
   result=node(`\\left${token.value==='{'?'\\{':token.value}${body.latex}\\right${closing.value==='}'?'\\}':closing.value}`,body.evidence+1,{grouped:true});
  }else if(token.type==='negative'||token.type==='op'&&['-','+'].includes(token.value)){
   const child=atom();result=node(token.value+child.latex,child.evidence,{simple:child.simple,numeric:child.numeric});
  }else if(token.type==='fraction'){
   const numerator=expression(0,new Set(['over']));
   if(peek()?.value!=='/'||!peek()?.spoken)throw Error('Missing fraction bar');take();
   const denominator=expression(0);if(take()?.type!=='endFraction')throw Error('Unclosed fraction');
   result=node(`\\frac{${numerator.latex}}{${denominator.latex}}`,3,{grouped:true});
  }else if(token.type==='rootStart'){
   const child=expression(0);if(take()?.type!=='endRoot')throw Error('Unclosed root');result=node(`\\sqrt{${child.latex}}`,3,{grouped:true});
  }else if(['root','absolute','function'].includes(token.type)){
   if(token.type==='function'&&peek()?.type==='of')take();
   const child=atom();
   result=node(token.type==='root'?`\\sqrt${token.value==='3'?'[3]':''}{${child.latex}}`:token.type==='absolute'?`\\left|${child.latex}\\right|`:`${token.value}${child.grouped?child.latex:`\\left(${child.latex}\\right)`}`,2,{scope:!child.grouped,grouped:child.grouped});
  }else if(token.type==='quantifier'){
   const child=expression(0);result=node(token.value+' '+child.latex,child.evidence+2);
  }else throw Error('Not a mathematical operand');
  while(['postfix','script','ordinal'].includes(peek()?.type)){
   const operation=take();let child;
   if(operation.type==='postfix')child=node(operation.value);
   else if(operation.type==='ordinal'){const n=take();if(n?.type!=='ordinalNumber')throw Error('Unknown ordinal');child=node(n.value);}
   else child=atom();
   result=node(`${result.latex}${operation.value==='_'?'_':'^'}{${child.latex}}`,result.evidence+2,{scope:operation.spoken&&operation.type==='script'&&!child.grouped&&!child.numeric});
  }
  depth--;return result;
 }
 function expression(minimum=0,stops=new Set()){
  let left;
  if(afterMath&&index===start&&['op','postfix','script'].includes(peek()?.type))left=node('',1);
  else left=atom();
  // A dictation fragment can apply a postfix to an existing canvas operand.
  if(!left.latex&&peek()?.type==='postfix')left=node(`^{${take().value}}`,2);
  if(!left.latex&&peek()?.type==='script'){const op=take(),right=atom();left=node(`${op.value}{${right.latex}}`,2);}
  while(index<tokens.length){
   const token=peek();if(token.type==='op'&&token.value==='/'&&stops.has('over'))break;
   if(token.type==='op'){
    const rank=precedence(token.value);if(rank<minimum)break;
    // A spoken root, division, or exponent followed by an ungrouped sum is
    // structurally ambiguous. Preserve its original text instead of choosing.
    if(left.scope&&rank>=20)throw Error('Ambiguous scope');
    take();const right=expression(rank+1,stops);
    if(rank===20&&right.divisionScope)throw Error('Ambiguous fraction scope');
    left=node(token.value==='/'?`\\frac{${left.latex}}{${right.latex}}`:left.latex+token.value+' '+right.latex,left.evidence+right.evidence+2,{scope:token.spoken&&token.value==='/'&&!right.grouped,divisionScope:token.spoken&&token.value==='/'&&!right.grouped});
   }else if(token.type==='atom'||token.type==='open'||token.type==='function'){
    if(40<minimum)break;const right=atom();left=node(left.latex+' '+right.latex,left.evidence+right.evidence,{scope:left.scope||right.scope});
   }else break;
  }
  return left;
 }
 try{const result=expression();return {...result,end:index};}catch{return null;}
}
