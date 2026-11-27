// A notation catalog, not a formula lookup or a unit-conversion engine.
// Quantity symbols are conventional defaults; qualified names resolve ambiguity.
const quantities=(category,rows)=>rows.map(([names,symbol,unit,vector=false,change=false])=>({category,names:names.split('|'),symbol:(change?'\\Delta ':'')+(vector?`\\vec{${symbol}}`:symbol),unit,vector,change}));
export const PHYSICAL_QUANTITIES=[
 ...quantities('Coordinate geometry',[['slope','m','1']]),
 ...quantities('Mechanics',[
  ['energy|total energy','E','J'],['kinetic energy','E_k','J'],['potential energy','E_p','J'],['mechanical energy','E_m','J'],['work','W','J'],['power','P','W'],
  ['velocity','v','m/s',true],['speed','v','m/s'],['initial velocity','v_0','m/s',true],['initial speed','v_0','m/s'],['final velocity','v_f','m/s',true],['final speed','v_f','m/s'],['acceleration','a','m/s^2',true],['jerk','j','m/s^3',true],
  ['force|net force','F','N',true],['weight|gravitational force','F_g','N',true],['normal force','F_N','N',true],['frictional force|friction force','F_f','N',true],['tension','T','N',true],['spring force','F_s','N',true],
  ['momentum|linear momentum','p','kg m/s',true],['impulse','J','N s',true],['mass','m','kg'],['reduced mass','\\mu','kg'],['time|elapsed time','t','s'],['period|orbital period','T','s'],
  ['position','r','m',true],['displacement','r','m',true,true],['distance|length','d','m'],['height','h','m'],['radius','r','m'],['diameter','d','m'],['area','A','m^2'],['volume','V','m^3'],
  ['density|mass density','\\rho','kg/m^3'],['pressure','p','Pa'],['torque|moment of force','\\tau','N m',true],['angular momentum','L','kg m^2/s',true],['moment of inertia','I','kg m^2'],
  ['angle|angular displacement','\\theta','rad'],['angular velocity','\\omega','rad/s',true],['angular speed|angular frequency','\\omega','rad/s'],['angular acceleration','\\alpha','rad/s^2',true],
  ['spring constant','k','N/m'],['coefficient of friction','\\mu','1'],['coefficient of static friction','\\mu_s','1'],['coefficient of kinetic friction','\\mu_k','1'],
  ['gravitational acceleration|acceleration due to gravity','g','m/s^2',true],['gravitational constant','G','N m^2/kg^2'],['stress','\\sigma','Pa'],['strain','\\epsilon','1'],["young's modulus|youngs modulus",'Y','Pa'],['bulk modulus','B','Pa'],['shear modulus','G','Pa'],
  ['dynamic viscosity|viscosity','\\eta','Pa s'],['kinematic viscosity','\\nu','m^2/s'],['surface tension','\\gamma','N/m'],['volume flow rate|volumetric flow rate','Q','m^3/s'],['mass flow rate','\\dot{m}','kg/s'],['buoyant force','F_b','N',true]
 ]),
 ...quantities('Waves and optics',[
  ['frequency','f','Hz'],['wavelength','\\lambda','m'],['wave number|wavenumber','k','1/m'],['amplitude','A','m'],['phase|phase angle','\\phi','rad'],['wave speed|speed of sound','v','m/s'],['wave intensity|intensity','I','W/m^2'],
  ['refractive index|index of refraction','n','1'],['focal length','f','m'],['optical power','P','1/m'],['magnification','M','1'],['object distance','d_o','m'],['image distance','d_i','m'],['speed of light','c','m/s'],
  ['luminous intensity','I_v','cd'],['luminous flux','\\Phi_v','lm'],['illuminance','E_v','lx'],['luminance','L_v','cd/m^2'],['solid angle','\\Omega','sr']
 ]),
 ...quantities('Thermodynamics',[
  ['temperature|absolute temperature','T','K'],['heat|heat transfer','Q','J'],['internal energy','U','J'],['enthalpy','H','J'],['entropy','S','J/K'],['gibbs free energy','G','J'],['helmholtz free energy','F','J'],
  ['heat capacity','C','J/K'],['specific heat|specific heat capacity','c','J/(kg K)'],['molar heat capacity','C_m','J/(mol K)'],['specific latent heat|latent heat','L','J/kg'],['thermal conductivity','k','W/(m K)'],['thermal diffusivity','\\alpha','m^2/s'],
  ['thermal expansion coefficient|coefficient of thermal expansion','\\alpha','1/K'],['heat flux','q','W/m^2',true],['thermal resistance','R','K/W'],['amount of substance','n','mol'],['molar mass','M','kg/mol'],['molar volume','V_m','m^3/mol'],['gas constant','R','J/(mol K)'],['boltzmann constant', 'k_B','J/K'],['efficiency|thermal efficiency','\\eta','1']
 ]),
 ...quantities('Electromagnetism',[
  ['electric charge|charge','q','C'],['electric current|current','I','A'],['current density','J','A/m^2',true],['voltage|electric potential|potential difference','V','V'],['electromotive force','\\epsilon','V'],
  ['electric field|electric field strength','E','V/m',true],['electric flux','\\Phi_E','V m'],['electric dipole moment','p','C m',true],['electric displacement field','D','C/m^2',true],['polarization density','P','C/m^2',true],
  ['resistance|electrical resistance','R','\\Omega'],['resistivity|electrical resistivity','\\rho','\\Omega m'],['conductance|electrical conductance','G','S'],['conductivity|electrical conductivity','\\sigma','S/m'],
  ['capacitance','C','F'],['inductance|self inductance','L','H'],['mutual inductance','M','H'],['impedance','Z','\\Omega'],['reactance','X','\\Omega'],['admittance','Y','S'],
  ['magnetic field|magnetic flux density','B','T',true],['magnetic field strength','H','A/m',true],['magnetic flux','\\Phi_B','Wb'],['magnetic dipole moment','\\mu','A m^2',true],['magnetization','M','A/m',true],
  ['permittivity','\\epsilon','F/m'],['vacuum permittivity','\\epsilon_0','F/m'],['permeability','\\mu','H/m'],['vacuum permeability','\\mu_0','H/m'],['relative permittivity|dielectric constant','\\epsilon_r','1'],['relative permeability','\\mu_r','1'],
  ['electric potential energy|electrical energy','U_e','J'],['magnetic energy','U_B','J'],['energy density','u','J/m^3'],['linear charge density','\\lambda','C/m'],['surface charge density','\\sigma','C/m^2'],['volume charge density','\\rho','C/m^3'],['poynting vector','S','W/m^2',true]
 ]),
 ...quantities('Atomic and nuclear physics',[
  ['planck constant','h','J s'],['reduced planck constant','\\hbar','J s'],['photon energy','E','J'],['rest energy','E_0','J'],['rest mass','m_0','kg'],['binding energy','E_b','J'],['work function','\\phi','J'],
  ['elementary charge','e','C'],['electron mass','m_e','kg'],['proton mass','m_p','kg'],['neutron mass','m_n','kg'],['avogadro constant','N_A','1/mol'],['particle number|number of particles','N','1'],
  ['radioactive activity','A','Bq'],['decay constant','\\lambda','1/s'],['half life|half-life','t_{1/2}','s'],['absorbed dose','D','Gy'],['equivalent dose|dose equivalent','H','Sv'],['catalytic activity','z','kat'],['cross section','\\sigma','m^2'],['probability density','\\rho','1/m^3']
 ])
];
// Seven SI base units and all 22 named SI derived units, plus accepted/common
// measurement units. Names are case-insensitive; symbol case is significant.
const unit=(symbol,names,prefix=true)=>({symbol,names:names.split('|'),prefix});
export const PHYSICAL_UNITS=[
 unit('m','meter|meters|metre|metres'),unit('g','gram|grams'),unit('s','second|seconds'),unit('A','ampere|amperes|amp|amps'),unit('K','kelvin|kelvins'),unit('mol','mole|moles'),unit('cd','candela|candelas'),
 unit('rad','radian|radians'),unit('sr','steradian|steradians'),unit('Hz','hertz'),unit('N','newton|newtons'),unit('Pa','pascal|pascals'),unit('J','joule|joules'),unit('W','watt|watts'),unit('C','coulomb|coulombs'),unit('V','volt|volts'),unit('F','farad|farads'),unit('\\Omega','ohm|ohms'),unit('S','siemens'),unit('Wb','weber|webers'),unit('T','tesla|teslas'),unit('H','henry|henries'),unit('lm','lumen|lumens'),unit('lx','lux'),unit('Bq','becquerel|becquerels'),unit('Gy','gray|grays'),unit('Sv','sievert|sieverts'),unit('kat','katal|katals'),unit('{}^\\circ\\mathrm{C}','degree celsius|degrees celsius',false),
 unit('L','liter|liters|litre|litres'),unit('min','minute|minutes',false),unit('h','hour|hours',false),unit('d','day|days',false),unit('t','tonne|tonnes'),unit('eV','electron volt|electron volts|electronvolt|electronvolts'),unit('Da','dalton|daltons'),unit('u','atomic mass unit|atomic mass units'),unit('ha','hectare|hectares',false),unit('{}^\\circ','degree|degrees',false),
 unit('bar','bar|bars'),unit('atm','atmosphere|atmospheres',false),unit('\\mathrm{mmHg}','millimeter of mercury|millimeters of mercury|millimetre of mercury|millimetres of mercury',false),unit('\\mathring{\\mathrm{A}}','angstrom|angstroms',false),unit('{}^\\circ\\mathrm{F}','degree fahrenheit|degrees fahrenheit',false),
 unit('in','inch|inches',false),unit('ft','foot|feet',false),unit('yd','yard|yards',false),unit('mi','mile|miles',false),unit('lb','pound|pounds',false),unit('oz','ounce|ounces',false)
];
export const SI_PREFIXES=[['quecto','q'],['ronto','r'],['yocto','y'],['zepto','z'],['atto','a'],['femto','f'],['pico','p'],['nano','n'],['micro','\\mu '],['milli','m'],['centi','c'],['deci','d'],['deca','da'],['deka','da'],['hecto','h'],['kilo','k'],['mega','M'],['giga','G'],['tera','T'],['peta','P'],['exa','E'],['zetta','Z'],['yotta','Y'],['ronna','R'],['quetta','Q']];
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=name=>new RegExp('^'+name.split(/[ -]/).map(escape).join('[\\s,-]+')+'(?![\\p{L}\\p{N}])','iu');
export const unitSymbolLatex=symbol=>symbol.includes('{}')||symbol.startsWith('\\mathrm')||symbol.startsWith('\\mathring')?symbol:`\\mathrm{${symbol}}`;
const roman=unitSymbolLatex;
const names=PHYSICAL_UNITS.flatMap(u=>u.names.flatMap(name=>[{name,latex:roman(u.symbol)},...(u.prefix?SI_PREFIXES.flatMap(([prefix,symbol])=>[prefix+name,prefix+' '+name].map(name=>({name,latex:roman(symbol+u.symbol)}))):[])])).sort((a,b)=>b.name.length-a.name.length).map(u=>({...u,head:u.name.split(' ')[0],pattern:pattern(u.name)}));
const symbols=PHYSICAL_UNITS.filter(u=>/^[A-Za-z]+$/.test(u.symbol)||u.symbol==='\\Omega').flatMap(u=>{
 const base=u.symbol==='\\Omega'?'Ω':u.symbol;
 return [{name:base,latex:roman(u.symbol)},...(u.prefix?SI_PREFIXES.flatMap(([,s])=>(s.startsWith('\\')?['µ','μ']:[s]).map(prefix=>({name:prefix+base,latex:roman(s+u.symbol)}))):[])];
}).concat([{name:'kg',latex:'\\mathrm{kg}'},{name:'°C',latex:'{}^\\circ\\mathrm{C}'},{name:'°F',latex:'{}^\\circ\\mathrm{F}'}]).sort((a,b)=>b.name.length-a.name.length);
const quantityNames=PHYSICAL_QUANTITIES.flatMap(q=>q.names.map(name=>({name,head:name.split(/[ -]/)[0],symbol:q.symbol,vector:q.vector,pattern:pattern(name)}))).sort((a,b)=>b.name.length-a.name.length);
export function quantityAt(source){const lower=source.toLowerCase();for(const q of quantityNames){if(!lower.startsWith(q.head))continue;const match=source.match(q.pattern);if(match)return {value:q.symbol,vector:q.vector,length:match[0].length};}return null;}
function unitAt(source,allowSymbols){
 const lower=source.toLowerCase();
 for(const u of names){if(!lower.startsWith(u.head))continue;const match=source.match(u.pattern);if(match)return {latex:u.latex,length:match[0].length};}
 if(allowSymbols)for(const u of symbols)if(source.startsWith(u.name)&&!/[\p{L}\p{N}]/u.test(source[u.name.length]||''))return {latex:u.latex,length:u.name.length};
 return null;
}
// Scientific notation is a magnitude, before any unit is attached. Its
// exponent stays dimensionless instead of accidentally swallowing a unit.
export function measurementMagnitudeAt(source,cardinal,readNumber){
 const rest=source.slice(cardinal.text.length);
 const compact=rest.match(/^[eE]([+-]?\d+)/);
 if(compact)return {value:`${cardinal.value}\\times 10^{${compact[1].replace(/^\+/,'')}}`,text:source.slice(0,cardinal.text.length+compact[0].length)};
 const lead=rest.match(/^[\s,]*(?:times|multiplied[\s,]+by|×|x)[\s,]*(?:10|ten)(?:[\s,]+(?:to[\s,]+the[\s,]+power(?:[\s,]+of)?|raised[\s,]+to)[\s,]+|\^)[\s,]*(negative[\s,]+|minus[\s,]+|-)?/i);
 if(!lead)return cardinal;
 const from=cardinal.text.length+lead[0].length,exponent=readNumber(source.slice(from));
 if(!exponent||!/^\d+$/.test(exponent.value))return cardinal;
 return {value:`${cardinal.value}\\times 10^{${lead[1]?'-':''}${exponent.value}}`,text:source.slice(0,from+exponent.text.length)};
}
export function unitExpressionAt(source,{symbols=false,blocked}={}){
 symbols=symbols&&/^[\s,]/.test(source);
 let index=0;
 const space=()=>{const m=source.slice(index).match(/^[\s,-]+/);if(m)index+=m[0].length;};
 function factor(){
  const saved=index;space();let power='';const before=source.slice(index).match(/^(square|cubic)[\s,]+/i);if(before){power=before[1].toLowerCase()==='square'?'2':'3';index+=before[0].length;}
  if(blocked?.(source.slice(index))){index=saved;return null;}
  const u=unitAt(source.slice(index),symbols);if(!u){index=saved;return null;}index+=u.length;
  const after=source.slice(index).match(/^(?:[\s,]+(squared|cubed)|[\s,]+(?:to[\s,]+the[\s,]+power(?:[\s,]+of)?|raised[\s,]+to)[\s,]+(negative[\s,]+|minus[\s,]+)?(\d+|one|two|three|four|five|six|seven|eight|nine)|\^(-?\d+)|([²³]))(?![\p{L}\p{N}])/iu);
  if(after){index+=after[0].length;power=after[1]?(after[1].toLowerCase()==='squared'?'2':'3'):after[4]||({'²':'2','³':'3'}[after[5]])||((after[2]?'-':'')+({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9}[after[3]?.toLowerCase()]||after[3]));}
  return {latex:u.latex,power:Number(power||1)};
 }
 function product(){const parts=[],first=factor();if(!first)return null;parts.push(first);
  while(parts.length<16){const saved=index;space();const times=source.slice(index).match(/^(?:times|multiplied by|[·⋅*])[\s,]*/i);if(times)index+=times[0].length;const next=factor();if(!next){index=saved;break;}parts.push(next);}return parts;
 }
 const format=parts=>{
  const combined=new Map();for(const part of parts)combined.set(part.latex,(combined.get(part.latex)||0)+part.power);
  return [...combined].filter(([,power])=>power!==0).map(([latex,power])=>latex+(power===1?'':`^{${power}}`)).join('\\,')||'1';
 };
 const numerator=product();if(!numerator)return null;
 const denominator=[];
 while(denominator.length<16){const saved=index;space();const per=source.slice(index).match(/^(?:per\b|\/)[\s,]*/i);
  if(!per){index=saved;break;}index+=per[0].length;const next=product();if(!next)return null;denominator.push(...next);
 }
 const tail=source.slice(index).trimStart();
 // A following unrelated identifier means this was an algebraic product,
 // rather than a spelled-out measurement. Do not steal its first variable.
 if(symbols&&/^[A-Za-z]/.test(tail)&&!/^(?:plus|minus|times|over|equals|is|and|where|when|then)\b/i.test(tail))return null;
 return {latex:denominator.length?`\\frac{${format(numerator)}}{${format(denominator)}}`:format(numerator),length:index};
}
