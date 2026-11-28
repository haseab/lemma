const LIMIT=2_000_000;
export function escapeText(text){return text.replace(/[\\{}$&#%_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'}[c]));}
export function mixedTextToLatex(source){
 const rows=[''];let literal='';
 const flush=()=>{if(literal){rows[rows.length-1]+=`\\text{${escapeText(literal)}}`;literal='';}};
 for(let i=0;i<source.length;){
  if(source[i]==='\n'){flush();rows.push('');i++;continue;}
  const opener=['$$','\\[','\\(','$','`'].find(mark=>source.startsWith(mark,i)&&(i===0||source[i-1]!=='\\'));
  if(!opener){literal+=source[i++];continue;}
  const closer={'\\[':'\\]','\\(':'\\)'}[opener]||opener;
  let end=source.indexOf(closer,i+opener.length);
  while(end>0&&source[end-1]==='\\')end=source.indexOf(closer,end+closer.length);
  if(end<0){literal+=source[i++];continue;}
  flush();rows[rows.length-1]+=source.slice(i+opener.length,end);i=end+closer.length;
 }
 flush();return rows.length===1?rows[0]:`\\displaylines{${rows.join('\\\\')}}`;
}
export function importLatex(source){
 if(typeof source!=='string'||source.length>LIMIT)throw Error('LaTeX exceeds the page limit.');
 source=source.replace(/\r\n?/g,'\n').replace(/(?<!\\)%[^\n]*/g,'').trim();
 if(/\\(?:newcommand|renewcommand|def|newenvironment|input|include|write|catcode|csname)\b/.test(source))throw Error('Custom macros and document includes are not supported. Import the equation source directly.');
 const document=source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
 if(/\\documentclass\b/.test(source)&&!document)throw Error('The LaTeX document is missing its document body.');
 if(document)source=document[1].trim();
 for(const [left,right]of [['$$','$$'],['\\[','\\]'],['\\(','\\)'],['$','$']]){
  if(source.startsWith(left)&&source.endsWith(right)&&source.length>=left.length+right.length){source=source.slice(left.length,-right.length).trim();return normalizeEnvironment(source);}
 }
 if(document&&!/^\\begin\{(?:equation\*?|align\*?|aligned|gather\*?|gathered)\}/.test(source))return mixedTextToLatex(source);
 return normalizeEnvironment(source);
}
function normalizeEnvironment(source){
 const match=source.match(/^\\begin\{(equation\*?|align\*?|aligned|gather\*?|gathered)\}([\s\S]*)\\end\{\1\}$/);
 if(!match)return source||'\\displaylines{}';
 if(match[1].startsWith('equation'))return match[2].trim();
 if(match[1].startsWith('align'))return `\\begin{aligned}${match[2]}\\end{aligned}`;
 return `\\displaylines{${match[2].trim()}}`;
}
export function exportLatex(latex){
 const lines=latex.match(/^\\displaylines\{([\s\S]*)\}$/);
 const body=(lines?`\\begin{gathered}\n${lines[1]}\n\\end{gathered}`:latex).replace(/\\imaginaryI\b/g,'\\mathrm{i}').replace(/\\exponentialE\b/g,'\\mathrm{e}').replace(/\\differentialD\b/g,'\\mathrm{d}').replace(/\\placeholder(?:\[[^\]]*\])?\{[^}]*\}/g,'\\square');
 return `\\documentclass{article}\n\\usepackage{amsmath,amssymb,xcolor}\n\\begin{document}\n\\[\n${body}\n\\]\n\\end{document}\n`;
}
export function looksLikeLatex(source){return /\\[a-zA-Z]+|^\s*(?:\$|\\\[|\\\()|[_^]\{[^}]*\}/.test(source);}
export function importPageFile(file){
 if(/\.(?:tex|latex)$/i.test(file.name))return {title:file.name.replace(/\.[^.]+$/,''),content:{type:'math-page',latex:importLatex(file.data),mode:'auto'}};
 return JSON.parse(file.data);
}
export function readableSelection(field){
 const model=field._mathfield?.model;if(!model)return field.getValue(field.selection,'plain-text');
 function atomText(atom){
  const branch=name=>(atom[name]||[]).map(atomText).join('');
  if(atom.type==='first')return '';
  let base;
  if(atom.type==='array')base=atom.rows.map(row=>row.map(cell=>cell.map(atomText).join('')).join('\t')).join('\n');
  else if(atom.type==='genfrac')base=`(${branch('above')})/(${branch('below')})`;
  else if(atom.type==='surd')base=`sqrt(${branch('body')})`;
  else if(atom.type==='leftright')base=(atom.leftDelim==='.'?'':atom.leftDelim)+branch('body')+(atom.rightDelim==='.'||atom.rightDelim==='?'?'':atom.rightDelim);
  else base=atom.value||branch('body');
  if(atom.superscript?.length)base+=`^(${branch('superscript')})`;
  if(atom.subscript?.length)base+=`_(${branch('subscript')})`;
  return base;
 }
 const [start,end]=field.selection.ranges[0];
 const selected=new Set();for(let i=Math.min(start,end)+1;i<=Math.max(start,end);i++)selected.add(model.at(i));
 const atoms=[...selected].filter(atom=>{let p=atom?.parent;while(p){if(selected.has(p))return false;p=p.parent;}return !!atom;});
 let out='',previousRow=null,previousColumn=null;
 for(const atom of atoms){let child=atom,parent=atom.parent;while(parent&&!parent.isRoot){child=parent;parent=parent.parent;}
  const row=parent?.type==='array'&&Array.isArray(child.parentBranch)?child.parentBranch[0]:null;
  const column=parent?.type==='array'&&Array.isArray(child.parentBranch)?child.parentBranch[1]:null;
  if(previousRow!==null&&row!==null&&row!==previousRow)out+='\n';
  else if(previousColumn!==null&&column!==null&&column!==previousColumn)out+='\t';
  out+=atomText(atom);if(row!==null)previousRow=row;if(column!==null)previousColumn=column;
 }
 return out;
}
export function splitDisplayRows(latex){
 const match=latex.match(/^\\displaylines\{([\s\S]*)\}$/);if(!match)return [latex];
 const body=match[1],rows=[''];let depth=0,environments=0;
 for(let i=0;i<body.length;){
  const env=body.slice(i).match(/^\\(begin|end)\{[^}]+\}/);
  if(env){environments+=env[1]==='begin'?1:-1;rows[rows.length-1]+=env[0];i+=env[0].length;continue;}
  if(body.startsWith('\\\\',i)&&depth===0&&environments===0){rows.push('');i+=2;continue;}
  if(body[i]==='\\'&&/[{}]/.test(body[i+1]||'')){rows[rows.length-1]+=body.slice(i,i+2);i+=2;continue;}
  if(body[i]==='{')depth++;else if(body[i]==='}')depth--;
  rows[rows.length-1]+=body[i++];
 }
 return rows;
}
