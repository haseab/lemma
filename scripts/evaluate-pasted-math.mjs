import {pastedMathCases} from '../tests/fixtures/pasted-math-cases.mjs';
import {escapeText} from '../src/formats.js';
import {plainInputToLatex} from '../src/plain-input.js';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
export function normalizedMath(latex){return convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');}
let selected=process.argv.includes('--development')?pastedMathCases.filter(c=>c.split==='development'):pastedMathCases;
if(process.argv.includes('--mathspeech')){
 const url='https://datasets-server.huggingface.co/rows?dataset=AAAI2025%2FMathSpeech&config=default&split=train&offset=0&length=100';
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Public dataset metadata unavailable: '+response.status);
 const data=await response.json();selected=data.rows.map(({row,row_idx})=>({id:String(row_idx),split:'external-first-100',category:'lecture',input:row.transcription,expected:row.LaTeX.replace(/^\s*\$|\$\s*$/g,'').replace(/\\displaystyle\b/g,'')}));
}

const counts={};let failed=0,proseChanged=0,invalid=0,preservedAsText=0;
for(const c of selected){const actual=plainInputToLatex(c.input),valid=!validateLatex(actual).length,pass=valid&&normalizedMath(actual)===normalizedMath(c.expected);if(actual===`\\text{${escapeText(c.input)}}`)preservedAsText++;const key=c.split+'/'+c.category;counts[key]??={pass:0,total:0};counts[key].total++;if(pass)counts[key].pass++;else{failed++;if(c.category==='prose')proseChanged++;if(!valid)invalid++;if(process.argv.includes('--failures')&&!process.argv.includes('--mathspeech'))console.log(JSON.stringify({id:c.id,input:c.input,expected:c.expected,actual}));}}
console.log(JSON.stringify({cases:selected.length,passed:selected.length-failed,failed,proseChanged,preservedAsText,invalid,counts},null,2));

if(failed&&!process.argv.includes('--mathspeech'))process.exitCode=1;
