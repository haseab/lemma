import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plainInputToLatex,liveFractionInput,lowercasePastedVariables} from '../src/plain-input.js';
import {validateLatex} from 'mathlive/ssr';
import {ALL_NOTATION_GROUPS} from '../src/math-words.js';
import {tokenizeMath} from '../src/spoken-math.js';
test('change in and change of compose as prefix operators with fractions and indexed operands',()=>{
 for(const phrase of ['change in','change of'])for(const space of [' ','\u00a0','\u202f']){
  const source=`V = ${phrase} D over ${phrase} T.`.replaceAll(' ',space);
  assert.equal(plainInputToLatex(source),'V= \\frac{\\Delta D}{\\Delta T}\\text{.}');
 }
 assert.equal(plainInputToLatex('change in m1 over change of t2'),'\\frac{\\Delta m_{1}}{\\Delta t_{2}}');
 assert.equal(plainInputToLatex('change in open parenthesis x plus y close parenthesis'),'\\Delta \\left(x+ y\\right)');
 for(const source of ['A change in the weather.','The change of plans was welcome.','change in the temperature','change in'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
 assert.equal(plainInputToLatex('change in D',{mode:'text'}),'\\text{change in D}');
 assert.equal(plainInputToLatex('change in D',{groups:ALL_NOTATION_GROUPS.filter(group=>group!=='calculus')}),'\\text{change in D}');
});
test('numeric variable suffixes are subscripts while leading coefficients retain multiplication',()=>{
 for(const [source,expected]of [['m1m2','m_{1} m_{2}'],['m12 plus q2','m_{12}+ q_{2}'],['2m1','2 m_{1}'],['m one plus m two','m_{1}+ m_{2}'],['capital M1 plus theta2','M_{1}+ \\theta_{2}'],['μ3 plus 2x','μ_{3}+ 2 x'],['F equals g m1 m2 over r squared','F= \\frac{g m_{1} m_{2}}{r^{2}}']])assert.equal(plainInputToLatex(source),expected);
 assert.equal(plainInputToLatex('2m'),'2 m');assert.equal(plainInputToLatex('m 2'),'m 2');
 assert.equal(plainInputToLatex('m1 and m2',{mode:'text'}),'\\text{m1 and m2}');
 assert.equal(plainInputToLatex('Version model12 is available.'),'\\text{Version model12 is available.}');
});
test('spoken division shares completed and pending fraction structure',()=>{
 for(const operator of ['over','all over','divided by']){
  assert.equal(liveFractionInput(`E = P ${operator} t`).latex,'E= \\frac{P}{t}');
  const pending=liveFractionInput(`E = P ${operator} `);assert(pending.pendingFraction);assert.equal(pending.latex,'E= \\frac{P}{#?}');
  assert.equal(plainInputToLatex(`E = P ${operator} `),pending.latex);
  assert.equal(liveFractionInput(`E = P ${operator}`),null);
 }
 for(const text of ['We went over the hill.','P overtakes t','This is divided by topic.'])assert.equal(liveFractionInput(text),null);
});
test('compact products in complete equations use mathematical atoms instead of prose fallback',()=>{
 for(const [source,expected]of [['F = -kx.','F= -k x\\text{.}'],['F=-kx','F= -k x'],['F equals minus kx','F= -k x'],['uv equals w','u v= w'],['p equals QR','p= Q R']])assert.equal(plainInputToLatex(source),expected);
 for(const source of ['A note about kx.','F equals mystery','x plus fox'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
 assert.equal(plainInputToLatex('F = -kx.',{mode:'text'}),'\\text{F = -kx.}');
});
test('spoken sums, roots and fraction bars form nested expressions without formula-specific rules',()=>{
 assert.equal(plainInputToLatex('plus or minus'),'{\\pm}');
 assert.equal(plainInputToLatex('plus minus'),'{\\pm}');
 assert.equal(plainInputToLatex('plus\u00a0minus'),'{\\pm}');
 assert.equal(plainInputToLatex('p plus minus q'),'p\\pm q');
 assert.equal(plainInputToLatex('minus or plus'),'{\\mp}');
 for(const space of [' ','\u00a0','\u202f']){
  const source='Minus q plus or minus the square root of q squared minus 5uv over 3u.'.replaceAll(' ',space);
  const expected='\\frac{-q\\pm \\sqrt{q^{2}- 5 u v}}{3 u}\\text{.}';
  for(const mode of ['auto','math'])assert.equal(plainInputToLatex(source,{mode}),expected);
  assert.equal(validateLatex(expected).length,0);
  assert.equal(plainInputToLatex(source,{mode:'text'}),`\\text{${source}}`);
 }
 for(const [source,expected]of [
  ['p plus q over r','\\frac{p+ q}{r}'],
  ['the cube root of t cubed minus 8 over 3t','\\frac{\\sqrt[3]{t^{3}- 8}}{3 t}'],
  ['u minus or plus v','u\\mp v'],
  ['square root of open parenthesis p plus q close parenthesis plus r','\\sqrt{\\left(p+ q\\right)}+ r'],
  ['5pq plus 3PQ','5 p q+ 3 P Q']
 ])assert.equal(plainInputToLatex(source),expected);
 for(const source of ['We have 2cats in the room.','The square root of the problem is unclear.','p plus or minus','the square root of','p plus q over'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
});
test('spoken arithmetic preserves variable case including at the start of a sentence',()=>{
 for(const variable of ['x','X','t','T']){
  const source=`${variable} squared plus 2${variable} plus 1.`;
  assert.equal(plainInputToLatex(source),`${variable}^{2}+ 2 ${variable}+ 1\\text{.}`);
 }
 assert.equal(plainInputToLatex('X squared plus 2x plus 1.'),'X^{2}+ 2 x+ 1\\text{.}');
});
test('relative comparisons form mathematical chains across dictated whitespace and punctuation',()=>{
 const sentence='4 is less than t, which is less than eleven.';
 for(const space of [' ','\u00a0','\u202f','  ','\t']){
  const source=sentence.replaceAll(' ',space),latex=plainInputToLatex(source);
  assert.equal(latex,'4< t< 11\\text{.}');assert.equal(validateLatex(latex).length,0);
  for(const token of tokenizeMath(source))if(token.type==='op')assert.equal(source.slice(token.start,token.end).replace(/\s+/g,' '),'is less than');
 }
 for(const [source,expected]of [['nine is greater than q, which is greater than one','9> q> 1'],['4 is less than t which is at most eleven','4< t\\le 11'],['4 is less than t, which is less than eleven, which is less than twenty','4< t< 11< 20']])assert.equal(plainInputToLatex(source),expected);
 assert.equal(plainInputToLatex(sentence,{mode:'text'}),`\\text{${sentence}}`);
 assert(!plainInputToLatex(sentence,{groups:ALL_NOTATION_GROUPS.filter(group=>group!=='sets')}).includes('<'));
});
test('relative-clause prose and incomplete or ambiguous comparisons are preserved',()=>{
 for(const source of ['4 is less than t, which is a useful bound.','4 is less than t, which is less than the limit.','4 is less than t, which is less than','t, which is less than eleven.','4 plus t, which is less than eleven.'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
 const source='This\u00a0is\u00a0in\u00a0the\u00a0notebook.';assert.equal(plainInputToLatex(source),`\\text{${source}}`);
 assert.equal(plainInputToLatex('square\u00a0root\u00a0of\u00a081'),'\\sqrt{81}');
});
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
 for(const text of ['for all T, this is a sentence','for all T,','for all T, u plus'])assert.match(plainInputToLatex(text),/\\forall/);
 assert.equal(plainInputToLatex('At most seven people, including us, arrived.'),'\\text{At most seven people, including us, arrived.}');
 assert.equal(plainInputToLatex('for all T, u is less than or equal to'),'\\forall T, u\\le');
 const disabled=plainInputToLatex('for all T, u is at most seven',{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='logic')});assert(!disabled.includes('\\forall'));assert.match(disabled,/for all T/);
});

test('quantifier wording prefers notation while explicit Text mode preserves prose',()=>{
 for(const phrase of ['for all values','for all value']){
  assert.match(plainInputToLatex(phrase+' V'),/\\forall V/);
  assert.match(plainInputToLatex(phrase+' V, V is at most two'),/\\forall V, V\\le 2/);
  for(const suffix of [' we measured',' of the experiment']){assert.match(plainInputToLatex(phrase+suffix),/\\forall/);assert.equal(plainInputToLatex(phrase+suffix,{mode:'text'}),`\\text{${phrase+suffix}}`);}
 }
});

test('arbitrary quantified labels are retained rather than silently discarded',()=>{
 for(const noun of ['chickens','objects','vectors']){
  const result=plainInputToLatex(`for all ${noun} C`);assert.match(result,/\\forall/);assert(result.includes(noun));assert.equal(validateLatex(result).length,0);
  const prose=`for all ${noun} we observed`;assert.match(plainInputToLatex(prose),/\\forall/);assert.equal(plainInputToLatex(prose,{mode:'text'}),`\\text{${prose}}`);
 }
});

test('quantifier fallback converts recognized notation without discarding unknown labels',()=>{
 for(const [source,pattern] of [['for all people less than 2',/</],['for all people greater than 2',/>/],['for all people at most 2',/\\le/],['for all people element of real numbers',/\\in.*\\mathbb\{R\}/]]){
  const result=plainInputToLatex(source);assert.match(result,/\\forall/);assert.match(result,/people/);assert.match(result,pattern);assert.equal(validateLatex(result).length,0);
 }
 const source='for all people less than 2';assert.equal(plainInputToLatex(source,{mode:'text'}),`\\text{${source}}`);
 assert(!plainInputToLatex(source,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='sets')}).includes('<'));
});

test('pasted variable case defaults to lowercase with explicit case and prose preserved',()=>{
 for(const [source,expected]of [['X squared plus 2X plus 1.','x squared plus 2x plus 1.'],['V = change in D over change in T.','v = change in d over change in t.'],['capital V equals uppercase D plus lowercase T','capital V equals uppercase D plus lowercase T'],['Please Find X in the Diagram.','Please Find X in the Diagram.']])assert.equal(lowercasePastedVariables(source),expected);
 assert.equal(lowercasePastedVariables('My Diagram is ready.'),'My Diagram is ready.');
 assert.equal(lowercasePastedVariables('X equals Y',{mode:'text'}),'X equals Y');
 assert.equal(plainInputToLatex(lowercasePastedVariables('capital V equals X')),'V= x');
});

test('vector accents compose with change prefixes, fractions, indices and explicit case',()=>{
 const source='Vector v equals change in vector d over change in vector t.';
 assert.equal(plainInputToLatex(source),'\\vec{v}= \\frac{\\Delta \\vec{d}}{\\Delta \\vec{t}}\\text{.}');
 for(const [input,expected]of [['vector m1','\\vec{m_{1}}'],['vector capital V','\\vec{V}'],['vector open parenthesis x plus y close parenthesis','\\vec{\\left(x+ y\\right)}']])assert.equal(plainInputToLatex(input),expected);
 assert.equal(plainInputToLatex('vector v',{groups:ALL_NOTATION_GROUPS.filter(group=>group!=='linear')}),'\\text{vector v}');
 assert.equal(plainInputToLatex('The vector is useful.'),'\\text{The vector is useful.}');
});

test('delta defaults to uppercase while explicit lowercase delta stays lowercase',()=>{
 for(const source of ['delta','Delta','DELTA','capital delta','uppercase delta'])assert.match(plainInputToLatex(source),/\\Delta/);
 assert.match(plainInputToLatex('lowercase delta'),/\\delta/);
 assert.equal(plainInputToLatex('delta x over delta t'),'\\frac{\\Delta x}{\\Delta t}');
 assert.equal(plainInputToLatex('lowercase delta x over lowercase delta t'),'\\frac{\\delta x}{\\delta t}');
 assert.equal(plainInputToLatex('delta2 plus lowercase delta3'),'\\Delta_{2}+ \\delta_{3}');
 assert.equal(plainInputToLatex('delta',{mode:'text'}),'\\text{delta}');
 assert.equal(lowercasePastedVariables('ΔX equals 2'),'Δx equals 2');
});

test('bare spoken bracket starts a following product outside a spoken fraction denominator',()=>{
 for(const space of [' ','\u00a0','\u202f'])assert.equal(plainInputToLatex('Capital V equals 1 over 3 bracket pi r cubed'.replaceAll(' ',space)),'V= \\frac{1}{3} \\left(\\pi r^{3}\\right)');
 assert.equal(plainInputToLatex('a over b bracket x plus y close bracket'),'\\frac{a}{b} \\left(x+ y\\right)');
 assert.equal(plainInputToLatex('a over bracket x plus y'),'\\frac{a}{\\left(x+ y\\right)}');
 assert.equal(plainInputToLatex('2 bracket x plus y.'),'2 \\left(x+ y\\right)\\text{.}');
 assert.equal(plainInputToLatex('a over open parenthesis b plus c close parenthesis'),'\\frac{a}{\\left(b+ c\\right)}');
 assert.equal(plainInputToLatex('The bracket is loose.'),'\\text{The bracket is loose.}');
});

test('sub is a composable subscript alias rather than literal multiplication',()=>{
 for(const alias of ['sub','subscript'])for(const space of [' ','\u00a0','\u202f']){
  const source=`Vector epsilon equals vector F ${alias} e over q.`.replaceAll(' ',space);
  assert.equal(plainInputToLatex(source),'\\vec{\\epsilon}= \\frac{\\vec{F_{e}}}{q}\\text{.}');
 }
 for(const variable of ['x','m','theta'])for(const index of ['e','two','n'])assert.equal(plainInputToLatex(`${variable} sub ${index}`),plainInputToLatex(`${variable} subscript ${index}`));
 assert.equal(plainInputToLatex('capital F sub e squared'),'F_{e}^{2}');
 for(const source of ['The sub is ready.','A submarine is underwater.','sub e'])assert.equal(plainInputToLatex(source),`\\text{${source}}`);
});

test('commas are ignored for equation recognition without changing prose or mathematical separators',()=>{
 const expected=plainInputToLatex('Vector capital F sub e.');
 for(const source of ['Vector, capital F sub e.','Vector,, capital, F, sub, e.','Vector, capital F sub e,.'])assert.equal(plainInputToLatex(source),expected);
 assert.equal(plainInputToLatex('x, is, less, than, or, equal, to, two.'),plainInputToLatex('x is less than or equal to two.'));
 assert.equal(plainInputToLatex('one, half, m, v, squared'),plainInputToLatex('one half m v squared'));
 assert.equal(plainInputToLatex('f of open parenthesis x, y close parenthesis'),'f\\left(x,y\\right)');
 assert.equal(plainInputToLatex('Vector, capital F sub e.',{mode:'text'}),'\\text{Vector, capital F sub e.}');
 assert.equal(plainInputToLatex('Hello, this is prose.'),'\\text{Hello, this is prose.}');
});
