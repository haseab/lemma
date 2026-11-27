// Mathematical syntax lives here. The tokenizer, parser and native editor
// continuations share these properties instead of maintaining feature lists.
const rules={
 atom:{production:'literal'},open:{production:'group'},spokenGroup:{production:'group'},
 negative:{production:'sign'},prefix:{production:'prefix',group:'calculus'},
 derivative:{production:'derivative',group:'calculus'},integral:{production:'bounded',group:'calculus'},sum:{production:'bounded',group:'calculus'},limit:{production:'limit',group:'calculus'},
 naturalFraction:{production:'naturalFraction',group:'calculus'},fraction:{production:'fraction',group:'calculus'},rootStart:{production:'rootStart',group:'calculus'},
 root:{production:'application',group:'calculus'},absolute:{production:'application',group:'calculus'},function:{production:'application',group:'calculus'},quantifier:{production:'quantifier',group:'logic'},
 endFraction:{group:'calculus'},endRoot:{group:'calculus'},
 script:{postfix:true},postfix:{postfix:true,endsOperand:true},ordinal:{postfix:true},factorial:{postfix:true,endsOperand:true},prime:{postfix:true,endsOperand:true},accent:{postfix:true,endsOperand:true},
 close:{endsOperand:true},ordinalNumber:{endsOperand:true}
};
for(const rule of Object.values(rules))Object.freeze(rule);
const syntax=token=>Object.hasOwn(rules,token?.type)?rules[token.type]:{};
export const operandRule=token=>token?.type==='op'&&['-','+'].includes(token.value)?'sign':syntax(token).production;
export function startsMathOperand(token,{product=false,slot=false}={}){
 const rule=operandRule(token);
 // Signs need grouping in a product, but are valid arguments/template values.
 return !!rule&&(!(product||slot)||rule!=='quantifier')&&(!product||rule!=='sign');
}
export const isMathPostfix=token=>!!syntax(token).postfix;
export const continuesMathOperand=token=>token?.type==='op'||isMathPostfix(token);
export const endsMathOperand=token=>token?.type==='atom'||!!syntax(token).endsOperand;
export const isStructuredMathOperand=token=>startsMathOperand(token)&&!['literal','sign','quantifier'].includes(operandRule(token));
export const mathSyntaxGroup=token=>token?.value==='\\vec'?'linear':token?.value==='\\neg'?'logic':syntax(token).group;

// Each operator declares classification and precedence together. Spellings and
// native Unicode values normalize to the same operator used by the parser.
const operators=new Map(),spellings=new Map();
function operator(rank,kind,definitions,{establishesMath=false}={}){
 for(const [value,...aliases]of definitions){
  operators.set(value,Object.freeze({value,rank,kind,establishesMath}));
  for(const alias of [value,...aliases])spellings.set(alias,value);
 }
}
operator(1,'logical',[[String.raw`\Leftrightarrow`,String.raw`\iff`,'⇔'],[String.raw`\Rightarrow`,String.raw`\implies`,'⇒']]);
operator(3,'logical',[[String.raw`\vee`,String.raw`\lor`,'∨']]);
operator(4,'logical',[[String.raw`\wedge`,String.raw`\land`,'∧']]);
operator(10,'relation',[
 ['=','=='],['<'],['>'],[String.raw`\le`,String.raw`\leq`,'≤','<='],[String.raw`\ge`,String.raw`\geq`,'≥','>='],[String.raw`\ne`,String.raw`\neq`,'≠','!='],[String.raw`\approx`,'≈']
],{establishesMath:true});
operator(10,'relation',[
 [String.raw`\in`,'∈'],[String.raw`\notin`,'∉'],[String.raw`\subset`,'⊂'],[String.raw`\subseteq`,'⊆'],[String.raw`\supset`,'⊃'],[String.raw`\supseteq`,'⊇'],
 [String.raw`\cong`,'≅'],[String.raw`\equiv`,'≡'],[String.raw`\propto`,'∝'],[String.raw`\parallel`,'∥'],[String.raw`\perp`,'⊥'],[String.raw`\mid`,'∣'],[String.raw`\nmid`,'∤'],[String.raw`\dashv`,'⊣'],
 [String.raw`\mapsto`,'↦'],[String.raw`\to`,String.raw`\rightarrow`,'→'],[String.raw`\leftarrow`,'←']
]);
operator(20,'sum',[['+'],['-','−'],[String.raw`\pm`,'±'],[String.raw`\mp`,'∓'],[String.raw`\oplus`,'⊕'],[String.raw`\cup`,'∪']]);
operator(30,'product',[['/'],[String.raw`\times`,'*','×'],[String.raw`\cdot`,'·'],[String.raw`\otimes`,'⊗'],[String.raw`\circ`,'∘'],[String.raw`\cap`,'∩']]);
operator(35,'binomial',[[String.raw`\choose`]]);
export const mathOperator=value=>operators.get(spellings.get(value));
export const normalizeMathOperator=value=>mathOperator(value)?.value||value;
export const establishesMathContext=token=>!!mathOperator(token?.value)?.establishesMath;
export const isMathComparison=token=>mathOperator(token?.value)?.kind==='relation';
export function mathOperatorRank(token={}){
 const definition=mathOperator(token.value);
 return definition?.value==='/'&&token.spoken&&!token.dividedBy?15:definition?.rank??10;
}
const symbolic=[...spellings.keys()].filter(value=>!value.startsWith('\\')).sort((a,b)=>b.length-a.length);
export function symbolicOperatorAt(source){const text=symbolic.find(value=>source.startsWith(value));return text?{text,value:spellings.get(text)}:null;}
const quantifiers=new Set([String.raw`\forall`,String.raw`\exists`,String.raw`\nexists`]);
export const isMathQuantifier=value=>quantifiers.has(value);
export const mathPhraseType=value=>isMathQuantifier(value)?'quantifier':mathOperator(value)?'op':value===String.raw`\neg`?'prefix':'atom';

// The notation catalogue and callable recognition are generated from the same
// declarations. Named operator words are added by vocabulary(), not copied here.
export const MATH_FUNCTIONS=Object.freeze([
 ...['sin','cos','tan','sec','csc','cot','sinh','cosh','tanh','arcsin','arccos','arctan','log','ln','exp','max','min','sup','inf','arg'].map(name=>({group:'calculus',name,latex:'\\'+name})),
 ...['det','ker','dim'].map(name=>({group:'linear',name,latex:'\\'+name})),
 ...['gcd','deg'].map(name=>({group:'number',name,latex:'\\'+name})),
 {group:'number',name:'lcm',latex:String.raw`\operatorname{lcm}`}
]);
export const FUNCTION_ALIASES=Object.freeze({sine:'sin',cosine:'cos',tangent:'tan',secant:'sec',cosecant:'csc',cotangent:'cot',logarithm:'log','natural log':'ln','natural logarithm':'ln','hyperbolic sine':'sinh','hyperbolic cosine':'cosh','hyperbolic tangent':'tanh','inverse sine':'arcsin','inverse cosine':'arccos','inverse tangent':'arctan'});
export const functionWords=group=>MATH_FUNCTIONS.filter(entry=>entry.group===group).map(entry=>entry.name).join(' ');

// Spoken fence actions and shapes are independent. A generic spoken
// “bracket” closer uses its opener's shape; explicit shapes remain strict.
export const SPOKEN_FENCES=[
 {names:['parenthesis','parentheses','paren','round bracket'],open:'(',close:')'},
 {names:['bracket'],open:'[',close:']',genericClose:true},
 {names:['square bracket'],open:'[',close:']'},
 {names:['brace','curly bracket'],open:'{',close:'}'}
].flatMap(fence=>fence.names.flatMap(name=>[
 ...['open','start','begin','left'].map(action=>[`${action} ${name}`,'open',fence.open]),
 ...['close','end','right'].map(action=>[`${action} ${name}`,'close',fence.close,{genericClose:!!fence.genericClose}])
]));
