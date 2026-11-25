const MATRIX_FENCES=['pmatrix','bmatrix','Bmatrix','matrix','vmatrix','Vmatrix'];
export function notationTemplate(value){
 if(!value||typeof value!=='object')throw Error('Choose a notation type.');
 const kind=value.kind;
 if(kind==='matrix'){
  const {rows,columns,fence='pmatrix'}=value;
  if(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||rows>10||columns<1||columns>10||!MATRIX_FENCES.includes(fence))throw Error('Choose 1–10 rows and columns and a supported bracket style.');
  const body=Array.from({length:rows},()=>Array.from({length:columns},()=>'#?').join('&')).join('\\\\');
  return {notation:{kind,rows,columns,fence},latex:`\\begin{${fence}}${body}\\end{${fence}}`};
 }
 if(kind==='root'){
  const index=value.index??2;if(!Number.isInteger(index)||index<2||index>12)throw Error('Choose a root index from 2 to 12.');
  return {notation:{kind,index},latex:`\\sqrt${index===2?'':`[${index}]`}{#?}`};
 }
 const values={fraction:'\\frac{#?}{#?}',absolute:'\\left|#?\\right|',binomial:'\\binom{#?}{#?}',power:'{#?}^{#?}'};
 if(!values[kind])throw Error('Choose a supported notation type.');
 return {notation:{kind},latex:values[kind]};
}

// Whole notation keywords only. The last keyword reflects the latest intent;
// ordinary substrings such as 'empowered' must not change the selection.
export function inferNotation(text){
 const value=String(text||'').trim().toLowerCase(),pattern=/\b(absolute\s+values?|binomial(?:\s+coefficient)?|fractions?|matri(?:x|ces)|vectors?|powers?|exponents?|roots?|sqrt|cbrt)\b/g;
 const matches=[...value.matchAll(pattern)],match=matches.at(-1);if(!match)return null;
 const word=match[0],before=value.slice(0,match.index);
 if(/^matri|^vector/.test(word)){
  const dimensions=before.match(/(\d{1,2})\s*(?:x|×|by)\s*(\d{1,2})\s*$/);
  if(dimensions)return {kind:'matrix',rows:Number(dimensions[1]),columns:Number(dimensions[2])};
  if(/^vector/.test(word)){const size=Number(before.match(/(\d{1,2})(?:d|\s+components?)?\s*(?:row|column)?\s*$/)?.[1]||3);return {kind:'matrix',rows:/\brow\s*$/.test(before)?1:size,columns:/\brow\s*$/.test(before)?size:1};}
  return {kind:'matrix',rows:3,columns:3};
 }
 if(/^root|sqrt|cbrt/.test(word)){const index=word==='cbrt'||/\bcube\s*$/.test(before)?3:Number(before.match(/(\d{1,2})(?:st|nd|rd|th)?\s*$/)?.[1]||2);return {kind:'root',index};}
 return {kind:/^fraction/.test(word)?'fraction':/^absolute/.test(word)?'absolute':/^binomial/.test(word)?'binomial':'power'};
}
