import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateLatex,convertLatexToMathMl} from 'mathlive/ssr';
import {pastedMathCases} from './fixtures/pasted-math-cases.mjs';
import {plainInputToLatex} from '../src/plain-input.js';
const normalized=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');
for(const split of ['development','holdout'])test(`research-informed original ${split} cases preserve mathematical structure and prose`,()=>{
 for(const c of pastedMathCases.filter(c=>c.split===split)){const actual=plainInputToLatex(c.input);assert.equal(validateLatex(actual).length,0,c.id);assert.equal(normalized(actual),normalized(c.expected),c.id+': '+c.input);}
});
test('generated combinations retain complete expression trees, not just matching words',()=>{
 const atoms=[['x','x'],['y','y'],['seven','7'],['thirteen','13']];let count=0;
 const group=([speech,latex])=>['open parenthesis '+speech+' close parenthesis',`\\left(${latex}\\right)`];
 const branches=[];
 for(const a of atoms)for(const b of atoms)for(const op of [['plus','+'],['minus','-'],['times','\\times']])branches.push([`${a[0]} ${op[0]} ${b[0]}`,`${a[1]}${op[1]} ${b[1]}`]);
 for(const b of branches){
  const [speech,latex]=group(b);
  const variants=[
   [`${speech} squared`,`${latex}^{2}`],
   [`square root of ${speech}`,`\\sqrt{${latex}}`],
   [`sine of ${speech}`,`\\sin${latex}`],
   [`start fraction ${b[0]} over eleven end fraction`,`\\frac{${b[1]}}{11}`],
   [`z to the power of ${speech}`,`z^{${latex}}`],
   [`start root ${b[0]} end root`,`\\sqrt{${b[1]}}`]
  ];
  for(const [input,expected] of variants){const actual=plainInputToLatex(input);assert.equal(normalized(actual),normalized(expected),input);count++;}
 }
 assert.equal(count,288);
});
test('ambiguous scopes and unknown transcript repairs are never salvaged as a different expression',()=>{
 for(const input of ['Please use start fraction a plus b over c.','e to the power of i x equals cosine of x plus i side of x','The root of an idea matters.'])assert.equal(plainInputToLatex(input),`\\text{${input}}`,input);
 assert.equal(normalized(plainInputToLatex('I know x squared equals twenty five.')),normalized('\\text{I know }x^{2}=25\\text{.}'));
});
test('malformed delimiters, excessive nesting, punctuation and unknown identifiers remain text',()=>{
 for(const input of ['x plus mystery','open parenthesis x close square bracket','x to the power of','open parenthesis '.repeat(80)+'x','This uses customer_name in code.'])assert.equal(plainInputToLatex(input),`\\text{${input.replace(/_/g,'\\_')}}`,input);
});
test('command boundaries distinguish spoken fraction bars from slash precedence',()=>{
 const result=plainInputToLatex('rho p squared');assert.equal(validateLatex(result).length,0);assert.equal(normalized(result),normalized('\\rho p^{2}'));
 for(const [input,expected] of [['b minus a over n','\\frac{b-a}{n}'],['Please compute b minus a over n.','\\text{Please compute }\\frac{b-a}{n}\\text{.}'],['square root of x over seven','\\frac{\\sqrt{x}}{7}'],['Compute square root of x plus y.','\\text{Compute }\\sqrt{x+y}\\text{.}'],['Consider one over x plus two.','\\text{Consider }\\frac{1}{x}+2\\text{.}']])assert.equal(normalized(plainInputToLatex(input)),normalized(expected));
 assert.equal(normalized(plainInputToLatex('x to the power of n times y')),normalized('x^{n}\\times y'));
 assert.equal(normalized(plainInputToLatex('b - a/n')),normalized('b-\\frac{a}{n}'));
});
test('disabled notation and oversized matrix requests cannot fall back to another structure',()=>{
 for(const input of ['11x11 matrix','0 by 3 matrix'])assert.equal(plainInputToLatex(input),`\\text{${input}}`);
 for(const input of ['start fraction a over b end fraction','square root of seven'])assert.equal(plainInputToLatex(input,{groups:[]}),`\\text{${input}}`);
 const long='a'.repeat(16001);assert.equal(plainInputToLatex(long),`\\text{${long}}`);
});
test('sentence-final dictation punctuation stays outside the mathematical expression',()=>{
 for(const c of pastedMathCases.filter(c=>c.category!=='prose'&&c.category!=='mixed')){
  const actual=plainInputToLatex(c.input+'.');assert.equal(normalized(actual),normalized(c.expected+'\\text{.}'),c.input);
 }
 assert.equal(normalized(plainInputToLatex('X squared equals twenty five.')),normalized('X^{2}=25\\text{.}'));
});
