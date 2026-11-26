import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainInputToLatex} from '../src/plain-input.js';
import {validateLatex} from 'mathlive/ssr';
import {ALL_NOTATION_GROUPS} from '../src/math-words.js';
test('bulk input assesses each line and expands complete mathematical phrases',()=>{
 const output=plainInputToLatex('A note about sets.\r\nfor all x element of real numbers\nx is in complex numbers');
 assert.match(output,/\\text\{A note about sets\.\}/);assert.match(output,/\\forall/);assert.match(output,/\\in/);assert.match(output,/\\mathbb\{[RC]\}/);assert.equal(validateLatex(output).length,0);
 for(const prose of ['This is in my notes.','The element of surprise matters.','At most ten people arrived.'])assert.equal(plainInputToLatex(prose),`\\text{${prose}}`);
});
test('bulk input respects dictionaries, disabled categories, forced text, and inline math',()=>{
 const libraries=[{id:'custom',name:'Custom',enabled:true,entries:[{text:'my tensor',latex:'⊗',context:true,enabled:true}]}];
 assert.match(plainInputToLatex('x my tensor y',{libraries}),/⊗/);assert.match(plainInputToLatex('my tensor is a phrase',{libraries}),/\\text/);
 assert.match(plainInputToLatex('for all x',{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='logic')}),/\\text/);
 assert.equal(plainInputToLatex('for all x',{mode:'text'}),'\\text{for all x}');
 assert.equal(plainInputToLatex('A note with `x^2`.'),'\\text{A note with }x^2\\text{.}');
 assert.equal(validateLatex(plainInputToLatex('3x3 matrix')).length,0);
});
test('conventional spoken arithmetic converts only when the complete line is mathematical',()=>{
 for(const [source,pattern] of [['x squared plus two equals nine',/x\s*\^\{2\}\s*\+\s*2\s*=\s*9/],['square root of 9',/\\sqrt\{9\}/],['x to the power of 2',/x\s*\^\{2\}/]]){
  const result=plainInputToLatex(source);assert.match(result,pattern);assert.equal(validateLatex(result).length,0);
 }
 assert.equal(plainInputToLatex('The two times we tried were useful.'),'\\text{The two times we tried were useful.}');
 assert.equal(plainInputToLatex('is in'),'\\text{is in}');
});

test('bulk recognition can continue a mathematical operand already on the page',()=>{
 assert.match(plainInputToLatex(' is in real numbers',{afterMath:true}),/\\in/);
 assert.match(plainInputToLatex(' squared plus two',{afterMath:true}),/\^\{2\}/);
 assert.equal(plainInputToLatex(' is in my notebook',{afterMath:true}),'\\text{ is in my notebook}');
});
test('quantified statements accept comma-separated predicates without changing prose',()=>{
 const result=plainInputToLatex('for all T, u is less than or equal to seven');
 assert.match(result,/\\forall T, u\\le 7/);assert.equal(validateLatex(result).length,0);
 assert.match(plainInputToLatex('there exists q, q is greater than three.'),/\\exists q, q> 3/);
 assert.match(plainInputToLatex('for all p, q, r is at most nine'),/\\forall p, q, r\\le 9/);
 for(const text of ['for all T, this is a sentence','for all T,','for all T, u is less than or equal to','At most seven people, including us, arrived.'])assert.equal(plainInputToLatex(text),`\\text{${text}}`);
 const disabled=plainInputToLatex('for all T, u is at most seven',{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='logic')});assert(!disabled.includes('\\forall'));assert.match(disabled,/for all T/);
});
