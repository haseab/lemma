import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
import {plainInputToLatex,liveMathInput} from '../src/plain-input.js';
import {tokenizeMath,parseMath} from '../src/spoken-math.js';
import {ALL_NOTATION_GROUPS} from '../src/math-words.js';
const structure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');
const operands=[
 ['x','x'],
 ['open parenthesis x plus one close parenthesis',String.raw`\left(x+1\right)`],
 ['bracket x plus one',String.raw`\left(x+1\right)`],
 ['open parenthesis negative x close parenthesis',String.raw`\left(-x\right)`],
 ['vector x',String.raw`\vec{x}`],
 ['derivative with respect to x of x squared',String.raw`\frac{d}{d x}x^2`],
 ['integral from zero to one of x d x',String.raw`\int_0^1 x\,d x`],
 ['sum from i equals one to n of i',String.raw`\sum_{i=1}^n i`],
 ['limit as x approaches zero of x',String.raw`\lim_{x\to 0}x`],
 ['the fraction a over b',String.raw`\frac{a}{b}`],
 ['log base 2 of 4',String.raw`\log_2\left(4\right)`],
 ['start fraction a over b end fraction',String.raw`\frac{a}{b}`],
 ['start root x plus one end root',String.raw`\sqrt{x+1}`],
 ['square root of x plus one',String.raw`\sqrt{x+1}`],
 ['absolute value of x',String.raw`\left|x\right|`],
 ['sine of x',String.raw`\sin\left(x\right)`]
];
test('operand productions compose with coefficients, groups, sums and fractions through bulk and live input',()=>{
 for(const [operand,latex]of operands)for(const mode of ['auto','math'])for(const whitespace of [' ','\u00a0','\u202f']){
  for(const [source,expected]of [
   [`5 ${operand}`,`5 ${latex}`],
   [`open parenthesis a plus b close parenthesis ${operand}`,String.raw`\left(a+b\right) `+latex],
   [`one plus 5 ${operand}`,`1+5 ${latex}`],
   [`1 / 5 ${operand}`,String.raw`\frac{1}{5 `+latex+'}']
  ]){
   const input=source.replaceAll(' ',whitespace);
   const results=[plainInputToLatex(input,{mode})];
   // Auto mode needs notation evidence before interpreting an incremental run.
   if(mode==='math'||parseMath(tokenizeMath(input),0,{mode})?.evidence)results.push(liveMathInput(input,{mode})?.latex);
   for(const actual of results){
    assert.equal(typeof actual,'string',input);
    assert.deepEqual(validateLatex(actual),[],input);
    assert.equal(structure(actual),structure(expected),`${mode}: ${input}`);
   }
  }
 }
});
test('nested structures can fill template slots using the same operand grammar',()=>{
 for(const [operand,latex]of operands){
  const tokens=[{type:'atom',value:String.raw`\boxed{#?}`,template:true,start:0,end:1},...tokenizeMath(operand)];
  const parsed=parseMath(tokens);
  assert.equal(parsed?.end,tokens.length,operand);
  assert.equal(structure(parsed.latex),structure(String.raw`\boxed{`+latex+'}'),operand);
 }
});
test('structural operands are recognized in mixed prose without dropping their introducers',()=>{
 for(const [operand,latex]of operands.filter(([source])=>!['x','open parenthesis negative x close parenthesis'].includes(source))){
  assert.equal(structure(plainInputToLatex(`We compute ${operand}.`)),structure(String.raw`\text{We compute }`+latex+String.raw`\text{.}`),operand);
 }
});
test('composition respects logarithm scope, signs, bounds, separators and incomplete input',()=>{
 for(const [source,expected]of [
  ['5 log base 2 of 4',String.raw`5\log_2\left(4\right)`],
  ['5 log base 2 of 4 plus 3',String.raw`5\log_2\left(4\right)+3`],
  ['5 log base 2 of open parenthesis x plus 4 close parenthesis',String.raw`5\log_2\left(x+4\right)`],
  ['2 square root of x over y',String.raw`\frac{2\sqrt{x}}{y}`],
  ['2 minus x','2-x'],
  ['2 plus x','2+x'],
  ['open parenthesis 2 comma log base 2 of 4 close parenthesis',String.raw`\left(2,\log_2\left(4\right)\right)`]
 ])assert.equal(structure(plainInputToLatex(source)),structure(expected),source);
 for(const source of ['5 log base 2 of','5 start fraction a over b','5 start root x','5 derivative with respect to x of','5 integral from zero to one of x','5 limit as x approaches zero of'])assert.equal(plainInputToLatex(source),`\\text{${source}}`,source);
 const disabled={groups:ALL_NOTATION_GROUPS.filter(group=>group!=='calculus')};
 assert.equal(plainInputToLatex('5 log base 2 of 4',disabled),String.raw`\text{5 log base 2 of 4}`);
 assert.equal(plainInputToLatex('5 log base 2 of 4',{mode:'text'}),String.raw`\text{5 log base 2 of 4}`);
 const quantified=tokenizeMath('2 for all x');
 assert.equal(parseMath(quantified)?.end,1,'a quantifier does not form an implicit product');
});
