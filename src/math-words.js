import {notationTemplate} from './notation-templates.js';
import {dictionaryPhrases} from './custom-dictionary.js';
// Only curated mathematical phrases and conventional abbreviations belong here.
// Ambiguous relational phrases require a mathematical operand on their left.
// Automatic shorthand only. Disabling a group never disables explicit LaTeX.
const group=(id,label,words,operators='',phrases=[])=>({id,label,words:words.split(' ').filter(Boolean),operators:operators.split(' ').filter(Boolean),phrases:phrases.map(([text,latex,meaning=text,context=false])=>({text,latex,meaning,context,group:id}))});
export const NOTATION_GROUPS=[
 group('logic','Logic','', '',[
  ['for all','\\forall'],['there exists','\\exists'],['there does not exist','\\nexists'],
  ['if and only if','\\Leftrightarrow'],['iff','\\iff','if and only if'],['implies','\\Rightarrow'],['and','\\wedge'],['or','\\vee'],['not','\\neg'],['therefore','\\therefore'],['because','\\because']]),
 group('sets','Sets & relations','', '',[
  ['element of','\\in'],['not in','\\notin'],['subset of','\\subseteq'],['proper subset of','\\subset'],
  ['superset of','\\supseteq'],['proper superset of','\\supset'],['union','\\cup'],['intersection','\\cap'],['empty set','\\varnothing'],
  ['real numbers','\\mathbb{R}'],['natural numbers','\\mathbb{N}'],['integers','\\mathbb{Z}'],['rational numbers','\\mathbb{Q}'],['complex numbers','\\mathbb{C}'],
  ['not equal','\\ne'],['less than or equal','\\le'],['greater than or equal','\\ge'],['approximately','\\approx'],['isomorphic to','\\cong']]),
 group('calculus','Calculus & functions','sin cos tan sec csc cot sinh cosh tanh arcsin arccos arctan log ln exp lim max min sup inf arg sqrt frac int sum prod','',[
  ['plus or minus','\\pm'],['plus minus','\\pm'],['minus or plus','\\mp'],
  ['change in','\\Delta'],['change of','\\Delta'],
  ['integral','\\int'],['sum','\\sum'],['product','\\prod'],['infinity','\\infty'],['partial','\\partial'],['nabla','\\nabla']]),
 group('linear','Linear algebra','det ker dim rank trace vector','rank trace diag span GL SL',[
  ['tensor product','\\otimes'],['direct sum','\\oplus'],['dot product','\\cdot'],['cross product','\\times']]),
 group('algebra','Algebra & categories','hom','Hom End Aut Obj Ob Mor Fun Nat Cat Set Grp Ring Vect Top Spec Tor Ext colim coker coim im id dom cod',[
  ['maps to','\\mapsto'],['right arrow','\\to'],['left arrow','\\leftarrow'],['adjoint to','\\dashv'],['compose','\\circ']]),
 group('statistics','Probability & statistics','','Var Cov Corr Pr Expect',[
  ['independent of','\\perp']]),
 group('number','Number theory','gcd lcm mod deg','ord char'),
 group('greek','Greek letters','alpha beta gamma delta epsilon theta lambda sigma omega pi','',[
  ...'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi pi rho sigma tau upsilon phi chi psi omega'.split(' ').map(name=>[name,'\\'+(name==='delta'?'Delta':name)]),
  ['lowercase delta','\\delta'],['uppercase delta','\\Delta'],['capital delta','\\Delta']])
];
// Conventional readings of relations, rather than unconstrained English synonyms.
// These are only automatic after a mathematical operand, never bare prose.
const RELATION_ALIASES={
 sets:[
  ['is in','\\in'],['is an element of','\\in'],['belongs to','\\in'],
  ['is not in','\\notin'],['is not an element of','\\notin'],['does not belong to','\\notin'],
  ['is a subset of','\\subseteq'],['is a proper subset of','\\subset'],
  ['is a superset of','\\supseteq'],['is a proper superset of','\\supset'],
  ['less than','<'],['greater than','>'],['at most','\\le'],['no greater than','\\le'],
  ['at least','\\ge'],['no less than','\\ge'],
  ['less than or equal to','\\le'],['greater than or equal to','\\ge'],
  ['is less than','<'],['is greater than','>'],['is at most','\\le'],['is at least','\\ge'],
  ['is less than or equal to','\\le'],['is greater than or equal to','\\ge'],
  ['equal to','='],['is equal to','='],['equals','='],['not equal to','\\ne'],['is not equal to','\\ne'],
  ['approximately equal to','\\approx'],['is approximately equal to','\\approx'],
  ['proportional to','\\propto'],['is proportional to','\\propto'],['is isomorphic to','\\cong']],
 linear:[['perpendicular to','\\perp'],['is perpendicular to','\\perp'],['parallel to','\\parallel'],['is parallel to','\\parallel']],
 algebra:[['is adjoint to','\\dashv'],['composed with','\\circ'],['mapped to','\\mapsto']],
 number:[['divides','\\mid'],['does not divide','\\nmid'],['is congruent to','\\equiv'],['congruent to','\\equiv']]
};
for(const group of NOTATION_GROUPS)for(const [text,latex] of RELATION_ALIASES[group.id]||[])group.phrases.push({text,latex,meaning:text,context:true,group:group.id});
// Structured shorthand opens an editable template, rather than a bare command.
for(const [text,latex] of [['square root','\\sqrt{#?}'],['sqrt','\\sqrt{#?}'],['cube root','\\sqrt[3]{#?}'],['cbrt','\\sqrt[3]{#?}'],['nth root','\\sqrt[#?]{#?}'],['nthroot','\\sqrt[#?]{#?}'],['fraction','\\frac{#?}{#?}'],['frac','\\frac{#?}{#?}']])NOTATION_GROUPS.find(g=>g.id==='calculus').phrases.push({text,latex,meaning:text,context:false,template:true,group:'calculus'});
for(const [group,text,latex] of [
 ['calculus','absolute value','\\left|#?\\right|'],['calculus','ceiling','\\left\\lceil#?\\right\\rceil'],['calculus','floor','\\left\\lfloor#?\\right\\rfloor'],['calculus','limit','\\lim_{#?\\to#?}'],
 ['linear','matrix','\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}'],['number','binomial coefficient','\\binom{#?}{#?}']
])NOTATION_GROUPS.find(g=>g.id===group).phrases.push({text,latex,meaning:text,context:false,template:true,group});
export const ALL_NOTATION_GROUPS=NOTATION_GROUPS.map(group=>group.id);
export function normalizeGroups(value){return Array.isArray(value)?ALL_NOTATION_GROUPS.filter(id=>value.includes(id)):[...ALL_NOTATION_GROUPS];}
const CACHE=new Map();
export function vocabulary(enabled=ALL_NOTATION_GROUPS,libraries=[]){
 const custom=dictionaryPhrases(libraries);
 const key=normalizeGroups(enabled).join(',')+JSON.stringify(custom);if(CACHE.has(key))return CACHE.get(key);
 const groups=NOTATION_GROUPS.filter(g=>enabled.includes(g.id));
 const phrases=[...custom,...groups.flatMap(g=>g.phrases).filter(p=>!custom.some(c=>c.text===p.text))];
 const config={words:new Set(['abc','xyz','uvw','dxd',...groups.flatMap(g=>[...g.words,...g.operators]),...phrases.filter(p=>!p.text.includes(' ')).map(p=>p.text)].map(w=>w.toLowerCase())),
  operators:new Set(groups.flatMap(g=>g.operators).map(w=>w.toLowerCase())),phrases:phrases.sort((a,b)=>b.text.length-a.text.length)};
 if(CACHE.size>64)CACHE.clear();CACHE.set(key,config);return config;
}
export const MATH_WORDS=vocabulary().words;
export function namedOperator(word,enabled,libraries){return vocabulary(enabled,libraries).operators.has(word.toLowerCase())?`\\operatorname{${word}}`:null;}
export function phraseAtEnd(text,enabled=ALL_NOTATION_GROUPS,multiOnly=false,libraries){
 const phrases=vocabulary(enabled,libraries).phrases;
 // Explicit user definitions take precedence over parameterized built-ins too.
 const custom=phrases.find(p=>p.custom&&(!multiOnly||p.text.includes(' '))&&(text.toLowerCase()===p.text||text.toLowerCase().endsWith(' '+p.text)));if(custom)return custom;
 const matrix=text.match(/(?:^| )((\d{1,2})\s*(?:x|×|by)\s*(\d{1,2})\s+matrix)$/i);
 if(matrix){if(!enabled.includes('linear'))return null;try{return {text:matrix[1].toLowerCase(),...notationTemplate({kind:'matrix',rows:Number(matrix[2]),columns:Number(matrix[3])}),template:true,context:false,group:'linear'};}catch{return null;}}
 return phrases.find(p=>(!multiOnly||p.text.includes(' '))&&(text.toLowerCase()===p.text||text.toLowerCase().endsWith(' '+p.text)));
}
// Symbols must remain traversable even after their group is switched off.
export function symbolPhrase(source,atom){
 if(!atom?.command?.startsWith('\\')&&!source.includes('\\mathbb')&&!['<','>','='].includes(atom?.value))return null;
 const entries=vocabulary().phrases;
 const number=source.match(/\\mathbb\{([RNZQC])\}/);
 if(number)return entries.find(p=>p.latex===`\\mathbb{${number[1]}}`);
 return entries.find(p=>p.latex===atom?.command||p.latex===source||['<','>','='].includes(atom?.value)&&p.latex===atom.value);
}
const SETTINGS_KEY='lemma.notation-groups.v1';
export function loadNotationGroups(storage){try{const raw=storage?.getItem(SETTINGS_KEY);return normalizeGroups(raw?JSON.parse(raw):undefined);}catch{return normalizeGroups();}}
export function saveNotationGroups(storage,groups){storage.setItem(SETTINGS_KEY,JSON.stringify(normalizeGroups(groups)));}
export function hasPendingPhrase(text,enabled,libraries){
 const value=text.trim().toLowerCase();
 return vocabulary(enabled,libraries).phrases.some(phrase=>{
  for(let length=phrase.text.length-1;length>0;length--){const prefix=phrase.text.slice(0,length);if(value===prefix||value.endsWith(' '+prefix))return true;}
  return false;
 });
}
export function shortcutEnabled(shortcut,enabled){
 const source=typeof shortcut==='string'?shortcut:shortcut.value;
 const aliases={'\\iff':'\\Leftrightarrow','\\implies':'\\Rightarrow','\\rightarrow':'\\to','\\neq':'\\ne','\\leq':'\\le','\\geq':'\\ge','\\land':'\\wedge','\\lor':'\\vee','\\emptyset':'\\varnothing'};
 const command=aliases[source]||source,groups=NOTATION_GROUPS.filter(group=>group.phrases.some(phrase=>phrase.latex===command));
 return !groups.length||groups.some(group=>enabled.includes(group.id));
}
