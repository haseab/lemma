import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateLatex,convertLatexToMathMl} from 'mathlive/ssr';
import {plainInputToLatex,lowercasePastedVariables} from '../src/plain-input.js';
import {PHYSICAL_QUANTITIES,PHYSICAL_UNITS,SI_PREFIXES,quantityAt,unitExpressionAt,unitSymbolLatex} from '../src/physical-notation.js';
import {ALL_NOTATION_GROUPS} from '../src/math-words.js';
const structure=latex=>convertLatexToMathMl(latex).replace(/<\/?mrow>/g,'').replace(/<mspace[^>]*\/>/g,'');
const assess=source=>plainInputToLatex(lowercasePastedVariables(source));
import {measurementCases} from './fixtures/physical-measurements.mjs';
test('physical quantity readings and measurements compose across domains and whitespace',()=>{
 for(const [source,expected]of measurementCases)for(const separator of [' ','\u00a0','\u202f']){
  const input=source.replaceAll(' ',separator),actual=assess(input);assert.deepEqual(validateLatex(actual),[],source);assert.equal(structure(actual),structure(expected),source);
 }
});
test('all named SI units and prefix combinations produce valid upright unit symbols',()=>{
 for(const u of PHYSICAL_UNITS)for(const name of u.names){
  const actual=assess(`7 ${name}`);assert.deepEqual(validateLatex(actual),[],name);assert.equal(structure(actual),structure('7\\,'+unitSymbolLatex(u.symbol)),name);
  assert.equal(structure(assess(name)),structure(unitSymbolLatex(u.symbol)),`standalone ${name}`);
 }
 for(const [prefix,symbol]of SI_PREFIXES)for(const [base,expected]of [['meter','m'],['joules','J'],['grams','g'],['farads','F']]){
  for(const separator of ['', ' ']){const actual=assess(`3 ${prefix}${separator}${base}`);assert.equal(structure(actual),structure(`3\\,\\mathrm{${symbol}${expected}}`),prefix+base);}
 }
 assert(PHYSICAL_QUANTITIES.length>=120);assert.equal(new Set(PHYSICAL_QUANTITIES.flatMap(q=>q.names)).size,PHYSICAL_QUANTITIES.flatMap(q=>q.names).length);
 for(const q of PHYSICAL_QUANTITIES)for(const name of q.names){assert.equal(quantityAt(name).value,q.symbol);assert.deepEqual(validateLatex(q.symbol),[],name);}
});
test('standalone units reuse measurement grammar while preserving prose, ordinals and settings',()=>{
 for(const source of ['Kilogram meters per second squared','kilograms metres per second per second','kilogram meters per second to the power two']){
  assert.equal(structure(assess(source)),structure('\\frac{\\mathrm{kg}\\,\\mathrm m}{\\mathrm s^2}'),source);
 }
 for(const source of ['Meters are useful.','I waited a second.','kilogram meters per','joules of energy'])assert.equal(assess(source),`\\text{${source}}`,source);
 const source='kilogram meters per second squared';
 assert.equal(plainInputToLatex(source,{mode:'text'}),`\\text{${source}}`);
 assert.equal(plainInputToLatex(source,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='physics')}),`\\text{${source}}`);
 const libraries=[{id:'units',enabled:true,entries:[{text:'joules',latex:'q',context:false,enabled:true}]}];
 assert(!plainInputToLatex('joules',{libraries}).includes('mathrm'));
 assert.equal(structure(assess('x to the second')),structure('x^2'));
});
test('measurements preserve variable case, symbols, custom definitions and prose boundaries',()=>{
 for(const source of ['The energy is conserved.','We need more time.','Force of habit is hard to change.','The momentum of this project matters.','I have five newtons in mind.'])assert.equal(assess(source),`\\text{${source}}`,source);
 assert.equal(assess('2m'),'2 m');assert.equal(assess('5 sin x'),'5 \\sin\\left(x\\right)');
 const input='force equals 5 newtons';assert.equal(plainInputToLatex(input,{mode:'text'}),`\\text{${input}}`);
 assert.equal(plainInputToLatex(input,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='physics')}),`\\text{${input}}`);
 assert.equal(unitExpressionAt(' meters per '),null);
 const libraries=[{id:'custom',name:'Custom',enabled:true,entries:[{text:'energy',latex:'\\xi',context:false,enabled:true}]}];assert.match(plainInputToLatex('energy equals 5 joules',{libraries}),/^\\mathord\{\\xi\}/);
 const unitOverride=[{id:'units',name:'Units',enabled:true,entries:[{text:'joules',latex:'q',context:false,enabled:true}]}];assert.equal(plainInputToLatex('5 joules',{libraries:unitOverride}),'5 \\mathord{q}');
 assert.equal(assess('capital X equals 5 megawatts'),'X= 5\\,\\mathrm{MW}');
 assert.equal(assess('velocity equals displacement over time'),'\\vec{v}= \\frac{\\Delta \\vec{r}}{t}');
 assert.equal(assess('pressure equals force over area'),'p= \\frac{\\vec{F}}{A}');
 assert.equal(assess('vector velocity equals 5 meters per second'),'\\vec{v}= 5\\,\\frac{\\mathrm{m}}{\\mathrm{s}}');
 assert.equal(assess('energy equals mass times speed of light squared'),'E= m\\times c^{2}');
});

test('quantity names compose with independent change prefixes and fraction operands',()=>{
 for(const [name,symbol]of [['slope','m'],['velocity','\\vec{v}'],['acceleration','\\vec{a}']]){
  for(const [numerator,denominator]of [['y','x'],['v','t'],['x','t']])for(const change of ['change in','change of']){
   const source=`${name} equals ${change} ${numerator} over ${change} ${denominator}`;
   assert.equal(structure(assess(source)),structure(`${symbol}=\\frac{\\Delta ${numerator}}{\\Delta ${denominator}}`),source);
  }
 }
 assert.equal(structure(assess('slope is change in y over change in x')),structure('m=\\frac{\\Delta y}{\\Delta x}'));
 for(const source of ['The slope is steep.','We walked down the slope.','slopes are useful'])assert.equal(assess(source),`\\text{${source}}`,source);
 const source='slope equals change in y over change in x';
 assert.equal(plainInputToLatex(source,{mode:'text'}),`\\text{${source}}`);
 assert(plainInputToLatex(source,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='physics')}).includes('slope'));
 const libraries=[{id:'custom',enabled:true,entries:[{text:'slope',latex:'s',context:false,enabled:true}]}];
 assert.equal(structure(plainInputToLatex(source,{libraries})),structure('\\mathord{s}=\\frac{\\Delta y}{\\Delta x}'));
});

test('vector quantity defaults distinguish scalar names and avoid redundant explicit arrows',()=>{
 const vectors=[['force','F'],['acceleration','a'],['velocity','v'],['initial velocity','v_0'],['final velocity','v_f'],['momentum','p'],['position','r'],['torque','\\tau'],['angular momentum','L'],['angular velocity','\\omega'],['angular acceleration','\\alpha'],['electric field','E'],['magnetic field','B'],['current density','J'],['heat flux','q'],['poynting vector','S']];
 for(const [name,symbol]of vectors){
  const expected=`\\vec{${symbol}}`;
  assert.equal(structure(assess(name)),structure(expected),name);
  assert.equal(structure(assess('vector '+name)),structure(expected),'explicit '+name);
  assert.equal(structure(assess(`change in ${name} over time`)),structure(`\\frac{\\Delta ${expected}}{t}`),name);
  assert.equal(plainInputToLatex(name,{mode:'text'}),`\\text{${name}}`);
  assert.equal(plainInputToLatex(name,{groups:ALL_NOTATION_GROUPS.filter(g=>g!=='physics')}),`\\text{${name}}`);
 }
 for(const [name,symbol]of [['speed','v'],['initial speed','v_0'],['final speed','v_f'],['angular speed','\\omega'],['angular frequency','\\omega'],['pressure','p'],['energy','E'],['mass','m'],['electric current','I'],['magnetic flux','\\Phi_B'],['electromotive force','\\epsilon'],['moment of inertia','I']])assert.equal(structure(assess(name)),structure(symbol),name);
 assert.equal(structure(assess('vector force sub e')),structure('\\vec{F}_{e}'));
 assert.equal(structure(assess('f equals m a')),structure('f=m a'),'literal variable names do not acquire quantity semantics');
 const libraries=[{id:'custom',enabled:true,entries:[{text:'force',latex:'Q',context:false,enabled:true}]}];
 assert(!plainInputToLatex('force equals mass times acceleration',{libraries}).startsWith('\\vec'));
});

test('displacement is a change in position rather than a position coordinate',()=>{
 const expected='\\Delta \\vec{r}';
 for(const source of ['displacement','vector displacement','change in position','change of position'])assert.equal(structure(assess(source)),structure(expected),source);
 assert.equal(structure(assess('position')),structure('\\vec{r}'));
 assert.equal(structure(assess('velocity equals displacement over time')),structure('\\vec{v}=\\frac{\\Delta \\vec{r}}{t}'));
 assert.equal(structure(assess('x equals 2')),structure('x=2'));
 assert.equal(structure(assess('electric displacement field')),structure('\\vec{D}'));
});
