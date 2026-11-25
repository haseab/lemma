export function findMatches(field,query,{caseSensitive=false}={}){
 if(!query)return [];
 const model=field._mathfield.model;const runs=[];let current=null;
 for(let i=0;i<=field.lastOffset;i++){
  const atom=model.at(i);
  if(!atom||!['text','mord','mbin','mrel','mpunct'].includes(atom.type)||typeof atom.value!=='string'||[...atom.value].length!==1){current=null;continue;}
  const branch=Array.isArray(atom.parentBranch)?atom.parentBranch.join(','):atom.parentBranch;
  if(!current||current.parent!==atom.parent||current.branch!==branch||current.mode!==atom.mode){current={parent:atom.parent,branch,mode:atom.mode,text:'',offsets:[]};runs.push(current);}
  current.text+=atom.value;for(let c=0;c<atom.value.length;c++)current.offsets.push(i);
 }
 const needle=caseSensitive?query:query.toLowerCase(),matches=[];
 for(const run of runs){const haystack=caseSensitive?run.text:run.text.toLowerCase();let start=0,index;
  while((index=haystack.indexOf(needle,start))>=0){matches.push({range:[run.offsets[index]-1,run.offsets[index+needle.length-1]],mode:run.mode});start=index+needle.length;}
 }
 return matches;
}
export function replaceMatch(field,match,value){field.selection={ranges:[match.range]};field.executeCommand(['insert',value,{mode:match.mode,format:match.mode==='text'?'text':'latex',selectionMode:'after'}]);}
export function replaceAll(field,query,value,options){const matches=findMatches(field,query,options);for(const match of matches.reverse())replaceMatch(field,match,value);return matches.length;}
