import {test} from 'node:test';
import assert from 'node:assert/strict';
import {convertLatexToMathMl,validateLatex} from 'mathlive/ssr';
import {plainInputToLatex,liveMathInput,lowercasePastedVariables} from '../src/plain-input.js';
import {tokenizeMath} from '../src/spoken-math.js';
const structure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mo>(?:&#829[0-2];|[⁡⁢⁣])<\/mo>/g,'').replace(/<mspace[^>]*\/>/g,'');
const typed={
 'QVB sine theta.':String.raw`Q V B\sin\left(\theta\right)\text{.}`,
 'Q V B sine theta':String.raw`Q V B\sin\left(\theta\right)`,
 'QVBD cosine theta':String.raw`Q V B D\cos\left(\theta\right)`,
 'QR exp x':String.raw`Q R\exp\left(x\right)`,
 'capital Q V capital B sine theta':String.raw`Q V B\sin\left(\theta\right)`,
 'X plus Y':'X+Y','capital X plus Y':'X+Y'
};
const cases=[
 ['QVB sine theta.',String.raw`q v b\sin\left(\theta\right)\text{.}`],
 ['qvb sine theta',String.raw`q v b\sin\left(\theta\right)`],
 ['Q V B sine theta',String.raw`q v b\sin\left(\theta\right)`],
 ['QVBD cosine theta',String.raw`q v b d\cos\left(\theta\right)`],
 ['QR exp x',String.raw`q r\exp\left(x\right)`],
 ['capital Q V capital B sine theta',String.raw`Q v B\sin\left(\theta\right)`],
 ['capital QVB sine theta',String.raw`Q V B\sin\left(\theta\right)`],
 ['lowercase QVB sine capital theta',String.raw`q v b\sin\left(\Theta\right)`],
 ['X plus Y','x+y'],['capital X plus Y','X+y'],
 ['delta plus capital delta',String.raw`\Delta+\Delta`]
];
test('compact variable products compose with functions and preserve literal case and normalize clipboard input',()=>{
 for(const [source,expected]of cases)for(const mode of ['auto','math'])for(const space of [' ','\u00a0','\u202f','\t','  ']){
  const input=source.replaceAll(' ',space),options={mode};
  for(const [actual,wanted] of [[plainInputToLatex(input,options),typed[source]??expected],[liveMathInput(input,options)?.latex,typed[source]??expected],[plainInputToLatex(lowercasePastedVariables(input,options),options),expected]]){
   assert.equal(typeof actual,'string',input);assert.deepEqual(validateLatex(actual),[],input);assert.equal(structure(actual),structure(wanted),input);
  }
 }
});
test('unqualified single letters preserve literal case and case qualifiers preserve their source ownership',()=>{
 for(const [source,expected]of [['X','X'],['capital X','X'],['uppercase Q','Q'],['lowercase Q','q'],['THETA',String.raw`\theta`],['Delta','{\\Delta}'],['THETA2',String.raw`\theta_{2}`]]){
  assert.equal(structure(plainInputToLatex(source)),structure(expected));const live=liveMathInput(source);assert(live,source);assert.equal(structure(live.latex),structure(expected));
 }
 const source='capital QVB sine theta',tokens=tokenizeMath(source);
 assert.equal(source.slice(tokens[0].start,tokens[0].end),'capital Q');
 assert.equal(tokens.slice(0,3).map(token=>token.value).join(''),'QVB');assert(tokens.slice(0,3).every(token=>token.explicitCase));
 assert.equal(lowercasePastedVariables(source),source);
});
test('prose, explicit Text, named quantities, units and custom meanings retain their intended case',()=>{
 for(const source of ['NASA reports today.','A short note.','I am here.'])assert.equal(plainInputToLatex(source),String.raw`\text{`+source+'}');
 for(const lead of ['Use','The','See','Let','My']){
  const actual=plainInputToLatex(`${lead} sine theta.`);assert.equal(structure(actual),structure(String.raw`\text{`+lead+String.raw` }\sin\left(\theta\right)\text{.}`),lead);
 }
 assert.equal(structure(plainInputToLatex('I know X squared equals Y.')),structure(String.raw`\text{I know }X^2=Y\text{.}`));
 assert.equal(plainInputToLatex('QVB Sine Theta',{mode:'text'}),String.raw`\text{QVB Sine Theta}`);
 assert.equal(structure(plainInputToLatex('5 MW')),structure(String.raw`5\,\mathrm{MW}`));
 assert.equal(structure(plainInputToLatex('force equals mass times acceleration')),structure(String.raw`\vec{F}=m\times\vec{a}`));
 assert.equal(structure(plainInputToLatex('change in X')),structure(String.raw`\Delta X`));
 const libraries=[{id:'custom',name:'Custom',enabled:true,entries:[{text:'qvb',latex:String.raw`\Omega`,enabled:true}]}];
 assert.equal(plainInputToLatex('QVB sine theta',{libraries}),String.raw`\mathord{\Omega} \sin\left(\theta\right)`);
});
