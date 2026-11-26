import {insertPageBreak} from './editing.js';

// Rejection is the next editing action, not a timed shortcut. Moving the caret
// or making another edit dismisses it; modifiers retain their native behavior.
export function installAutomaticConversion(field){
 let pending=null,rejecting=false,lastLocked=false;
 const locked=new Set();
 const anchor=(position=field.position)=>{
  const model=field._mathfield?.model;if(!model)return null;let atom=model.at(position);
  while(atom?.parent&&atom.parent!==model.root&&!(atom.parent.isMultiline&&Array.isArray(atom.parentBranch)))atom=atom.parent;
  return atom?.siblings?.[0]||model.root.body?.[0];
 };
 field.isProseLine=()=>field.pageInputMode==='auto'&&locked.has(anchor());
 field.readProseLines=()=>field._mathfield?[...locked].map(atom=>field._mathfield.model.offsetOf(atom)).filter(offset=>offset>=0):[];
 field.keepLineProse=()=>{const key=anchor();if(key)locked.add(key);if(field._mathfield)field._mathfield.model.mode='text';};
 field.restoreProseLines=offsets=>{pending=null;lastLocked=false;locked.clear();for(const offset of offsets||[]){if(offset<0||offset>field.lastOffset)continue;const key=anchor(offset);if(key)locked.add(key);}};
 field.dismissAutomaticConversion=()=>{pending=null;};
 field.offerAutomaticRejection=source=>{
  if(field.pageInputMode==='auto'&&!field.isProseLine())pending={before:{latex:field.value,sources:field.readPhraseSources?.()||[],lines:field.readProseLines()},source,latex:field.value,selection:JSON.stringify(field.selection)};
 };
 field.trackAutomaticConversion=(source,action)=>{
  if(rejecting||field.pageInputMode!=='auto'||field.isProseLine())return action();
  const before={latex:field.value,sources:field.readPhraseSources?.()||[],lines:field.readProseLines()};
  const result=action();
  if(field.value!==before.latex)pending={before,source,latex:field.value,selection:JSON.stringify(field.selection)};
  return result;
 };
 field.resumeAutomaticLine=wasProse=>{
  pending=null;
  // MathLive replaces the initial root when it first becomes multiline.
  // Transfer the preference to the previous row's new first atom.
  const key=anchor();
  if(wasProse&&key?.parent?.isMultiline&&Array.isArray(key.parentBranch)){
   const [row,column]=key.parentBranch,previous=key.parent.rows[row-1]?.[column]?.[0];
   if(previous)locked.add(previous);
  }
  if(field.pageInputMode==='auto')field._mathfield.model.mode=field.isProseLine()?'text':'math';
 };
 field.rejectAutomaticConversion=()=>{
  const change=pending;pending=null;
  if(!change||field.readOnly||field.disabled||field.pageInputMode!=='auto'||field.value!==change.latex||JSON.stringify(field.selection)!==change.selection)return false;
  const {source,before}=change,cursor=source.cursor??source.text.length;
  if(cursor<=0)return false;
  // Delete one Unicode code point from the source before restoring prose.
  const head=Array.from(source.text.slice(0,cursor));head.pop();
  const text=head.join('')+source.text.slice(cursor),deleted=cursor-head.join('').length;
  const styles=source.styles?[...source.styles.slice(0,cursor-deleted),...source.styles.slice(cursor)]:[];
  const perform=()=>{
   rejecting=true;const suspended=field.proseSuspended;field.proseSuspended=true;
   try{
    field._mathfield.model.mode='math';
    field.setValue(before.latex,{mode:'math',format:'latex',insertionMode:'replaceAll',style:{},silenceNotifications:true});
    field.restorePhraseSources?.(before.sources);field.restoreProseLines(before.lines);
    field.selection={ranges:[[source.start,source.end]]};
    const rows=text.split('\n');
    for(let i=0;i<rows.length;i++){
     if(i)insertPageBreak(field);
     field.executeCommand(['insert',rows[i],{mode:'text',format:'text',selectionMode:'after'}]);
    }
    const end=field.position;
    if(rows.length===1){
     for(let i=0;i<styles.length;i++)if(Object.keys(styles[i]).length){field.selection={ranges:[[source.start+i,source.start+i+1]]};field.applyStyle(styles[i],{operation:'set'});}
     field.position=Math.min(end,source.start+cursor-deleted);
    }
    field._mathfield.model.mode='text';
    field.resetProseInput?.();
    const key=anchor();if(key)locked.add(key);lastLocked=true;
   }finally{field.proseSuspended=suspended;rejecting=false;}
  };
  if(field.pageHistory)field.pageHistory.transaction(perform);else perform();
  return true;
 };
 field.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(event.key==='Backspace'&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&field.rejectAutomaticConversion()){
   event.preventDefault();event.stopImmediatePropagation();return;
  }
  if((event.key.length!==1&&!['Shift','Alt','Control','Meta'].includes(event.key))||event.key==='`')pending=null;
  const isLocked=field.isProseLine();
  if(!event.metaKey&&!event.ctrlKey&&event.key!=='Enter'&&field.pageInputMode==='auto'){
   if(isLocked)field._mathfield.model.mode='text';
   else if(lastLocked)field._mathfield.model.mode='math';
  }
  lastLocked=isLocked;
 },true);
 field.addEventListener('pointerdown',()=>{pending=null;},true);
 field.addEventListener('beforeinput',()=>{if(!rejecting&&!field.proseConverting&&!field.proseSuspended)pending=null;},true);
}
