import {fontById,fontByFamily} from './font-catalog.js';
const atoms=field=>Array.from({length:field.lastOffset+1},(_,offset)=>({atom:field._mathfield.model.at(offset),offset}));
function textRanges(field,ranges,predicate=()=>true){
 const result=[];
 for(const [a,b]of ranges){let run=null;for(let offset=Math.min(a,b)+1;offset<=Math.max(a,b);offset++){
  const atom=field._mathfield.model.at(offset);
  if(atom?.mode==='text'&&!atom.hasChildren&&predicate(atom)){
   if(run&&run.end===offset-1&&run.parent===atom.parent)run.end=offset;
   else{run={start:offset-1,end:offset,parent:atom.parent};result.push(run);}
  }else run=null;
 }}return result;
}
// MathLive accepts arbitrary font families for text, but only mathematical
// variants for equations. Never put a prose font on a mathematical atom.
export function applyTextFont(field,id){
 const font=fontById(id);if(!font||!field._mathfield?.isSelectionEditable)return false;
 const selection=structuredClone(field.selection);
 field.textFont=id;
 if(!field.selectionIsCollapsed){
  for(const range of textRanges(field,selection.ranges))field.applyStyle({fontFamily:font.family},{range:[range.start,range.end],operation:'set'});
 }
 if(field.selectionIsCollapsed&&field.mode==='text')field.applyStyle({fontFamily:font.family},{range:[field.position,field.position],operation:'set'});
 field.selection=selection;
 field.dispatchEvent(new Event('text-font-change'));
 return true;
}
export function currentTextFont(field){
 if(!field?._mathfield)return fontById('system');
 const ranges=field.selection.ranges,selected=[];
 if(!field.selectionIsCollapsed)for(const [a,b]of ranges)for(let offset=Math.min(a,b)+1;offset<=Math.max(a,b);offset++){
  const atom=field._mathfield.model.at(offset);if(atom?.mode==='text'&&!atom.hasChildren)selected.push(fontByFamily(atom.style?.fontFamily)?.id||'system');
 }
 if(selected.length)return selected.every(id=>id===selected[0])?fontById(selected[0]):null;
 const atom=field._mathfield.model.at(field.position);
 return (field.mode==='text'?fontByFamily(field._mathfield.defaultStyle?.fontFamily):null)||fontByFamily(atom?.mode==='text'?atom.style?.fontFamily:null)||fontById(field.textFont)||fontById('system');
}
// MathLive serializes custom text families as a bare {\fontfamily{…} …}
// group, although the declaration only parses in text mode. Put that run in
// its required text scope at the serialization boundary so history, clipboard,
// exports and reload all receive valid LaTeX. Native generic families are intact.
export function serializeTextFonts(source){
 // The serializer's declaration separator is not text content.
 source=source.replace(/(\{\\fontfamily\{[^{}]+\}) /g,'$1');
 return source.replace(/\{\\fontfamily\{/g,(match,offset)=>/\\text(?:rm|sf|tt|bf|it|normal)?$/.test(source.slice(0,offset))?match:String.raw`\text{\fontfamily{`);
}
const serializers=new WeakSet();
function installFontSerialization(model){
 // Option changes reparse through Atom.serialize directly, bypassing public
 // getValue(). Cover that same serialization boundary as history and exports.
 let Atom=model.root.constructor;
 while(Atom&&!Object.hasOwn(Atom,'serialize'))Atom=Object.getPrototypeOf(Atom);
 if(!Atom||serializers.has(Atom))return;
 serializers.add(Atom);const native=Atom.serialize;let depth=0;
 Atom.serialize=function(value,options){
  if(depth||options?.skipStyles)return native.call(this,value,options);
  const temporary=[];depth++;
  try{
   const original=native.call(this,value,options);
   if(!original.includes('\\fontfamily{'))return original;
   const nodes=(Array.isArray(value)?value:[value]).flatMap(atom=>atom?[atom,...atom.children]:[]);
   // MathLive suppresses the wrapper of unstyled runs after a custom family.
   // Explicit upright text scope preserves those adjacent runs. Atom styles
   // are restored immediately; serialization never changes the live selection.
   for(const atom of nodes)if(atom.mode==='text'&&!atom.hasChildren&&!atom.style?.fontFamily&&!atom.style?.fontShape){temporary.push([atom,atom.style]);atom.style={...atom.style,fontShape:'n'};}
   return serializeTextFonts(temporary.length?native.call(this,value,options):original);
  }finally{for(const [atom,style]of temporary)atom.style=style;depth--;}

 };
}
export function installTextFonts(field){
 installFontSerialization(field._mathfield.model);
 let known=new WeakSet(atoms(field).map(({atom})=>atom).filter(Boolean)),applying=false;
 field.addEventListener('beforeinput',()=>{if(!applying&&fontById(field.textFont))known=new WeakSet(atoms(field).map(({atom})=>atom).filter(Boolean));},{capture:true});
 field.addEventListener('text-font-change',()=>{known=new WeakSet(atoms(field).map(({atom})=>atom).filter(Boolean));});
 // A mode switch must not carry a text-only family into native equation input.
 field.addEventListener('mode-change',()=>{
  const editor=field._mathfield;if(!editor)return;
  if(field.mode==='text'&&fontById(field.textFont))field.applyStyle({fontFamily:fontById(field.textFont).family});
  else if(fontByFamily(editor.defaultStyle.fontFamily)&&!['roman','sans-serif','monospace'].includes(editor.defaultStyle.fontFamily)){
   delete editor.defaultStyle.fontFamily;editor.styleBias='none';
  }
 });
 field.addEventListener('input',()=>{
  if(applying||!field._mathfield||!fontById(field.textFont))return;
  const entries=atoms(field),font=fontById(field.textFont),selection=structuredClone(field.selection);
  // Automatic prose recognition replaces native math atoms with text atoms.
  // Style those newly created text runs before autosave/history reads them.
  applying=true;
  try{
   if(font)for(const range of textRanges(field,[[0,field.lastOffset]],atom=>!known.has(atom)&&!atom.style?.fontFamily)){
    field.applyStyle({fontFamily:font.family},{range:[range.start,range.end],operation:'set',silenceNotifications:true});
   }
   known=new WeakSet(entries.map(({atom})=>atom).filter(Boolean));
   field.selection=selection;
  }finally{applying=false;}
 });
}
