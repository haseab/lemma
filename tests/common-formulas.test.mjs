import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
import {commonFormulas} from './fixtures/common-formulas.mjs';
import {plainInputToLatex} from '../src/plain-input.js';
import {ALL_NOTATION_GROUPS} from '../src/math-words.js';
// Keep fractions, scripts, bounds, operator order, case and visible grouping.
// Only remove redundant presentation rows, invisible multiplication and spaces.
export const mathStructure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');
test('100 standard formulas match independently authored mathematical structures',()=>{
 assert.equal(commonFormulas.length,100);assert.equal(new Set(commonFormulas.map(c=>c.input)).size,100);
 for(const c of commonFormulas)for(const mode of ['auto','math'])for(const whitespace of [' ','\u00a0','\u202f']){
  const actual=plainInputToLatex(c.input.replaceAll(' ',whitespace),{mode});
  assert.deepEqual(validateLatex(actual),[],`${c.id}: ${c.name}`);
  assert.equal(mathStructure(actual),mathStructure(c.expected),`${c.id}: ${c.name}: ${mode}`);
 }
});
test('structural operators compose across unseen variables, bounds, powers and nested bodies',()=>{
 let count=0;
 for(const variable of ['u','z','t','q'])for(const power of [2,3,7])for(const lower of [0,2]){
  const body=`${variable} to the power ${power}`,latex=`${variable}^{${power}}`;
  for(const [source,expected]of [
   [`derivative with respect to ${variable} of ${body}`,`\\frac{d}{d ${variable}}${latex}`],
   [`integral from ${lower} to 9 of ${body} d ${variable}`,`\\int_{${lower}}^{9}${latex}\\,d ${variable}`],
   [`sum from ${variable} equals ${lower} to m of ${body}`,`\\sum_{${variable}=${lower}}^{m}${latex}`],
   [`sum from j equals ${lower} to m of integral from zero to one of ${body} d ${variable}`,`\\sum_{j=${lower}}^{m}\\int_{0}^{1}${latex}\\,d ${variable}`],
   [`limit as ${variable} approaches ${lower} of ${body}`,`\\lim_{${variable}\\to ${lower}}${latex}`]
  ]){assert.equal(mathStructure(plainInputToLatex(source)),mathStructure(expected),source);count++;}
 }
 assert.equal(count,120);
});
test('incomplete structures, prose, case and disabled categories remain explicit',()=>{
 for(const input of ['The derivative of our plans is unclear.','We sum from memory.','The capital city is nearby.','The integral of our work matters.','integral from zero to one of x squared','sum from i equals one to','derivative with respect to x of','log base two of','limit as x approaches'])assert.equal(plainInputToLatex(input),`\\text{${input}}`,input);
 for(const input of ['derivative with respect to x of x squared','integral from zero to one of x d x','sum from i equals one to n of i'])assert.equal(plainInputToLatex(input,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='calculus')}),`\\text{${input}}`);
 assert.equal(mathStructure(plainInputToLatex('v subscript zero squared')),mathStructure('v_0^2'));
 assert.equal(mathStructure(plainInputToLatex('capital X plus x')),mathStructure('X+x'));
 assert.equal(mathStructure(plainInputToLatex('v subscript negative one squared')),mathStructure('v_{-1}^2'));
 assert.equal(mathStructure(plainInputToLatex('capital alpha plus capital beta')),mathStructure('A+B'));
 assert.equal(mathStructure(plainInputToLatex('integral from zero to one of sine of theta d theta')),mathStructure('\\int_0^1\\sin\\left(\\theta\\right)\\,d\\theta'));
 for(const source of ['derivative with respect to two of x squared','limit as two approaches zero of x'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
 const libraries=[{id:'custom',name:'Custom',enabled:true,entries:[{text:'capital p',latex:'\\zeta',context:false,enabled:true}]}];
 assert.equal(plainInputToLatex('capital p plus x',{libraries}),'\\mathord{\\zeta}+ x');
});

test('dictation commas do not block the 100 common formula readings',()=>{
 for(const c of commonFormulas){
  const input=c.input.replaceAll(' ', ', ');
  assert.equal(mathStructure(plainInputToLatex(input)),mathStructure(c.expected),`${c.id}: ${c.name}`);
 }
});
