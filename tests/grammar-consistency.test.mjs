import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
import {plainInputToLatex,liveMathInput} from '../src/plain-input.js';
import {tokenizeMath,parseMath} from '../src/spoken-math.js';
import {NOTATION_GROUPS,ALL_NOTATION_GROUPS} from '../src/math-words.js';
const structure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');
const check=(source,expected,options={})=>{
 const actual=plainInputToLatex(source,options);
 assert.deepEqual(validateLatex(actual),[],source);
 assert.equal(structure(actual),structure(expected),source);
};
test('advertised functions and named operators accept arguments, coefficients and nesting',()=>{
 const functions=[['sinh',String.raw`\sinh`],['cosh',String.raw`\cosh`],['tanh',String.raw`\tanh`],['arcsin',String.raw`\arcsin`],['arccos',String.raw`\arccos`],['arctan',String.raw`\arctan`],['max',String.raw`\max`],['min',String.raw`\min`],['sup',String.raw`\sup`],['inf',String.raw`\inf`],['arg',String.raw`\arg`],['det',String.raw`\det`],['ker',String.raw`\ker`],['dim',String.raw`\dim`],['gcd',String.raw`\gcd`],['lcm',String.raw`\operatorname{lcm}`],['deg',String.raw`\deg`]];
 for(const group of NOTATION_GROUPS)for(const name of group.operators)functions.push([name,String.raw`\operatorname{`+name+'}']);
 for(const [name,latex]of functions)for(const mode of ['auto','math'])for(const [source,expected]of [
  [`3 ${name} of x`,`3 ${latex}\\left(x\\right)`],
  [`sine of ${name} of x`,String.raw`\sin\left(`+latex+String.raw`\left(x\right)\right)`],
  [`fraction ${name} of x y`,String.raw`\frac{`+latex+String.raw`\left(x\right)}{y}`]
 ])check(source,expected,{mode});
});
test('function aliases, enabled groups and user overrides follow the same declarations',()=>{
 for(const [source,expected]of [['3 hyperbolic sine of x',String.raw`3\sinh\left(x\right)`],['2 inverse cosine of x',String.raw`2\arccos\left(x\right)`]])check(source,expected);
 for(const [group,source]of [['calculus','3 sinh of x'],['linear','rank of x'],['number','gcd of x']]){
  const options={groups:ALL_NOTATION_GROUPS.filter(id=>id!==group)};
  assert.equal(plainInputToLatex(source,options),String.raw`\text{`+source+'}');
 }
 const libraries=[{id:'custom-functions',name:'Custom',enabled:true,entries:[{text:'sinh',latex:'z',enabled:true}]}];
 assert.equal(plainInputToLatex('3 sinh plus x',{libraries}),String.raw`3 \mathord{z}+ x`);
 assert.equal(plainInputToLatex('3 sinh of x',{mode:'text'}),String.raw`\text{3 sinh of x}`);
});
test('function scripts compose through the ordinary postfix grammar',()=>{
 for(const mode of ['auto','math'])for(const [source,expected]of [
  ['2 log subscript 3 of x',String.raw`2\log_3\left(x\right)`],
  ['sine to the power 3 of x',String.raw`\sin^3\left(x\right)`],
  ['cosine to the third of x',String.raw`\cos^3\left(x\right)`],
  ['sinh squared of log base 2 of x',String.raw`\sinh^2\left(\log_2\left(x\right)\right)`],
  ['sine of x squared',String.raw`\sin\left(x^2\right)`]
 ])check(source,expected,{mode});
});
test('template slots accept signed operands while juxtaposition preserves subtraction',()=>{
 for(const mode of ['auto','math'])for(const [source,expected]of [
  ['fraction negative x y',String.raw`\frac{-x}{y}`],
  ['fraction x negative y',String.raw`\frac{x}{-y}`],
  ['fraction negative log base 2 of x square root of y',String.raw`\frac{-\log_2\left(x\right)}{\sqrt{y}}`],
  ['2 minus x','2-x'],['2 open parenthesis negative x close parenthesis',String.raw`2\left(-x\right)`],
  ['open parenthesis x comma negative y close parenthesis',String.raw`\left(x,-y\right)`]
 ])check(source,expected,{mode});
});
test('operand endings and postfix continuations include every postfix production',()=>{
 for(const [suffix,expected]of [['squared','x^2'],['to the third','x^3'],['factorial','x!'],['prime',String.raw`x^{\prime}`],['hat',String.raw`\hat{x}`],['bar',String.raw`\bar{x}`],['subscript two','x_2']]){
  const parsed=liveMathInput(suffix,{mode:'math',leftOperand:'x'});
  assert(parsed,suffix);assert.equal(structure(parsed.latex),structure(expected),suffix);
  check(`x ${suffix} choose 2`,String.raw`\binom{`+expected+'}{2}');
 }
 check('x squared is y','x^2=y',{mode:'math'});
 check('x factorial is y','x!=y',{mode:'math'});
 assert.equal(structure(plainInputToLatex('bar')),structure(String.raw`\mathrm{bar}`),'standalone unit meaning is preserved');
});
test('symbolic, Unicode and spoken operator spellings preserve structure and precedence',()=>{
 for(const [symbol,words,latex]of [['≤','less than or equal to',String.raw`\le`],['≥','greater than or equal to',String.raw`\ge`],['≠','not equal to',String.raw`\ne`],['∈','element of',String.raw`\in`],['⊆','subset of',String.raw`\subseteq`],['⊕','direct sum',String.raw`\oplus`],['∩','intersection',String.raw`\cap`],['∪','union',String.raw`\cup`],['∧','and',String.raw`\wedge`],['∨','or',String.raw`\vee`]]){
  check(`x ${symbol} y`,`x${latex} y`);check(`x ${words} y`,`x${latex} y`);
 }
 check('x <= y',String.raw`x\le y`);check('x != y',String.raw`x\ne y`);
 check('square root of x direct sum y',String.raw`\sqrt{x\oplus y}`);
 check('square root of x union y intersection z',String.raw`\sqrt{x\cup y\cap z}`);
 check('square root of x and y',String.raw`\sqrt{x}\wedge y`);
 // Relations are recognized uniformly when the next clause continues a chain.
 const source='x is in real numbers, which less than y';
 const parsed=parseMath(tokenizeMath(source));assert(parsed?.relativeComparison);
 assert.equal(structure(parsed.latex),structure(String.raw`x\in\mathbb{R}<y`));
});

test('postfix recognition never invents a base for an unrecognized mathematical operand',()=>{
 for(const suffix of ['factorial','prime','hat','to the third','subscript 2']){
  const source='🙂 '+suffix;assert.equal(plainInputToLatex(source,{mode:'math'}),source.replaceAll(' ','\\ '),suffix);
 }
});

test('function names remain values until an argument is supplied and prose keeps its wording',()=>{
 for(const [source,expected]of [['rank',String.raw`\operatorname{rank}`],['sin',String.raw`\sin`],['rank plus x',String.raw`\operatorname{rank}+x`]])check(source,expected);
 assert.equal(plainInputToLatex('it is in'),String.raw`\text{it is in}`);
 check('Let z is in complex numbers.',String.raw`\text{Let }z\in\mathbb{C}\text{.}`);
 assert.equal(plainInputToLatex('rank of'),String.raw`\text{rank of}`);
 const native=liveMathInput('prime',{mode:'math',leftTokens:[{type:'atom',value:'x^2',scripts:{'^':true},start:0,end:0}]});
 assert.equal(structure(native.latex),structure(String.raw`{x^2}^{\prime}`));
});

test('logarithm spellings and bases use ordinary function scripts and arguments',()=>{
 for(const name of ['log','logarithm'])for(const base of ['2','two','b'])check(`5 ${name} base ${base} of x`,String.raw`5\log_{`+(base==='two'?'2':base)+String.raw`}\left(x\right)`);
 for(const name of ['natural log','natural logarithm']){
  check(`${name} of x`,String.raw`\ln\left(x\right)`);
  check(`2 ${name} to the third of x`,String.raw`2\ln^3\left(x\right)`);
 }
 assert.equal(plainInputToLatex('The base of our work'),String.raw`\text{The base of our work}`);
});
