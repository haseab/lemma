import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
import {plainInputToLatex,liveMathInput,lowercasePastedVariables} from '../src/plain-input.js';
import {mathInputOptions} from '../src/math-input-options.js';
import {ALL_NOTATION_GROUPS,NOTATION_GROUPS} from '../src/math-words.js';
import {mathModeCases} from './fixtures/math-mode-semantics.mjs';
const structure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mspace[^>]*\/>/g,'');
test('Math mode supplies intent for standalone expressions, operators and editable structures',()=>{
 for(const [source,expected]of mathModeCases){
  const actual=plainInputToLatex(source,{mode:'math'}),live=liveMathInput(source,{mode:'math'});
  assert.deepEqual(validateLatex(actual),[],source);assert.equal(structure(actual),structure(expected),source);
  assert(live,source);assert.equal(structure(live.latex),structure(expected),'live '+source);
 }
});
test('Math products have no relation, grouping, length or identifier whitelist requirement',()=>{
 for(const word of ['qz','qzx','qzxy','qzxyuv','qzxyrvuw']){
  const product=[...word].join(' ');
  for(const [source,expected]of [[word,product],[`${word} over t`,`\\frac{${product}}{t}`],[`${word} squared`,product.slice(0,-1)+word.at(-1)+'^{2}']]){
   assert.equal(structure(plainInputToLatex(source,{mode:'math'})),structure(expected),source);
  }
 }
 assert.equal(plainInputToLatex('qzxy over t'),'\\text{qzxy over t}');
 assert.equal(plainInputToLatex('x divided by y plus z'),'\\text{x divided by y plus z}');
 assert.equal(lowercasePastedVariables('QZXY over T',{mode:'math'}),'qzxy over t');
});
test('all enabled contextual aliases work without a left operand in Math mode',()=>{
 for(const entry of NOTATION_GROUPS.flatMap(group=>group.phrases).filter(entry=>entry.context))assert.equal(structure(plainInputToLatex(entry.text,{mode:'math'})),structure(entry.latex),entry.text);
 assert.equal(plainInputToLatex('is less than'),'\\text{is less than}');
});
test('explicit mode does not override Text, disabled groups or custom meanings',()=>{
 const source='kx over t';assert.equal(plainInputToLatex(source,{mode:'text'}),'\\text{kx over t}');
 assert(!plainInputToLatex('vector x',{mode:'math',groups:ALL_NOTATION_GROUPS.filter(group=>group!=='linear')}).includes('\\vec'));
 assert(!plainInputToLatex('less than',{mode:'math',groups:ALL_NOTATION_GROUPS.filter(group=>group!=='sets')}).includes('<'));
 const libraries=[{id:'custom',enabled:true,entries:[{text:'qzxy',latex:'\\xi',context:false,enabled:true}]}];
 assert.equal(structure(plainInputToLatex('qzxy over t',{mode:'math',libraries})),structure('\\frac{\\mathord{\\xi}}{t}'));
 const field={pageInputMode:'math',notationGroups:['sets'],customDictionaries:libraries,getNotationShortcuts:()=>({})};
 assert.equal(mathInputOptions(field).mode,'math');assert.equal(mathInputOptions({...field,isProseLine:()=>true}).mode,'text');
});
