import {createPageTabs} from './page-tabs.js';
import {brandMark} from './brand.js';
import {validateLatex as checkLatex} from 'mathlive';
import {createAutosaveScheduler} from './autosave.js';
import {insertLatexContent} from './clipboard.js';
import {templates} from './templates.js';
import {installPageHistory} from './history.js';
import {findMatches,replaceMatch,replaceAll} from './find.js';
import {importPageFile,importLatex,exportLatex,readableSelection} from './formats.js';
import {MathfieldElement,createPageMathfield} from './page-editor.js';
import {createIcons,icons} from 'lucide';
import {EMPTY_PAGE,freshDocument,validateNotebook,validateDocument} from './document.js';
import {FONTS,FONT_SIZES,applyFormatting} from './formatting.js';
import './style.css';
MathfieldElement.fontsDirectory=new URL('./fonts',document.baseURI).href;
MathfieldElement.soundsDirectory=null;
const isMac=/Mac/i.test(navigator.platform);document.documentElement.dataset.platform=isMac?'mac':'windows';
const icon=name=>`<i data-lucide="${name}"></i>`;
const button=(id,name,label)=>`<button id="${id}" title="${label}" aria-label="${label}">${icon(name)}</button>`;
document.querySelector('#app').innerHTML=`<aside id="library"><div class="brand"><span class="brand-mark" aria-hidden="true">${brandMark}</span><span>lemma</span></div><button id="new">${icon('plus')} New page</button><input id="search" placeholder="Find a page…" aria-label="Find a page"><nav id="documents" aria-label="Pages"></nav></aside><div class="workspace"><header>${button('library-toggle','panel-left','Pages')}<div class="page-tabs" id="page-tabs"><input id="title" placeholder="Untitled page" aria-label="Page title" maxlength="200" hidden></div><span id="save-status" role="status">Ready</span>${button('find-open','search','Find and replace')}${button('source-open','code','LaTeX source')}${button('versions-open','history','Previous versions')}${button('open','folder-open','Open page')}${button('export','download','Export editable page')}${button('pdf','file-text','Export PDF')}</header><div class="toolbar" role="toolbar" aria-label="Scratchpad formatting"><div class="type-controls"><select id="font" aria-label="Font" title="Font for selected text or next typing"><option value="system">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select><select id="font-size" aria-label="Font size" title="Size for selection or next typing">${FONT_SIZES.map(size=>`<option value="${size.value}" ${size.value===5?'selected':''}>${size.label}</option>`).join('')}</select><input id="ink" type="color" value="#28382c" aria-label="Text color" title="Text color"></div><span class="divider"></span><div class="modes" aria-label="Input mode"><button id="mode-auto" title="Recognize words and equations as you type">Auto</button><button id="mode-math" title="Write equations">Math</button><button id="mode-text" title="Write normal text">Text</button></div><span class="divider"></span><button id="fraction" title="Fraction" aria-label="Fraction">⁄</button><button id="power" title="Power" aria-label="Power">𝑥²</button><button id="root" title="Square root" aria-label="Square root">√</button><button id="integral" title="Integral" aria-label="Integral">∫</button><button id="sum" title="Sum" aria-label="Sum">∑</button><button id="matrix" title="Matrix" aria-label="Matrix">[▦]</button><span class="divider"></span>${button('bold','bold','Bold')}${button('italic','italic','Italic')}<span class="divider"></span>${button('undo','undo-2','Undo')}${button('redo','redo-2','Redo')}${button('keyboard','keyboard','Math keyboard')}<button id="help" class="help">?</button></div><div id="findbar" role="search" aria-label="Find and replace" hidden><label>Find <input id="find-query" type="search" autocomplete="off"></label><label>Replace <input id="replace-value" autocomplete="off"></label><label class="case-option"><input id="find-case" type="checkbox"> Match case</label><button id="find-prev" aria-label="Previous match">↑</button><button id="find-next" aria-label="Next match">↓</button><span id="find-count" role="status" aria-live="polite"></span><button id="replace-one">Replace</button><button id="replace-all">Replace all</button><button id="find-close" aria-label="Close find">×</button></div><main id="page"><div id="surface"></div></main><footer><span id="mode-status">Auto</span><span>${/Mac/i.test(navigator.platform)?'⌘M math · ⌘T text':'Ctrl+M math · Ctrl+T text'} · Tab to indent</span></footer></div><dialog id="help-dialog"><button id="close-help" aria-label="Close help">×</button><h2>One page. Just type.</h2><p>Start each line with math. Recognized words become plain prose. Use backticks to enter and leave inline math; Enter starts another math line.</p><dl><dt>New line / indent</dt><dd>Enter / Tab</dd><dt>Font, size, and color</dt><dd>Select text, then format</dd><dt>Math / text</dt><dd>⌘M / ⌘T</dd><dt>Fraction / power</dt><dd>/ &nbsp; ^</dd><dt>Navigate fractions and roots</dt><dd>Arrow keys</dd><dt>Find / replace</dt><dd>⌘F</dd><dt>Leave editor for formatting</dt><dd>Escape</dd><dt>More symbols and formatting</dt><dd>Math keyboard or right-click</dd></dl></dialog><div id="toast" role="alert"></div>`.replaceAll('⌘',isMac?'⌘':'Ctrl+');

createIcons({icons});
const $=s=>document.querySelector(s);
const addDialog=(id,html)=>{const d=document.createElement('dialog');d.id=id;d.innerHTML=html;const heading=d.querySelector('h2');heading.id=id+'-title';d.setAttribute('aria-labelledby',heading.id);document.body.append(d);return d;};
addDialog('export-dialog','<h2>Export page</h2><p>Keep an editable copy, share a PDF, or use the source in another editor.</p><div class="dialog-actions"><button data-export="lemma">Editable .lemma</button><button data-export="latex">LaTeX .tex</button><button data-export="pdf">PDF</button><button data-export="text">Plain text</button></div><button data-close>Close</button>');
addDialog('source-dialog','<h2>LaTeX source</h2><label for="source-value">Equation source or a simple LaTeX document</label><textarea id="source-value" spellcheck="false"></textarea><p id="source-error" role="alert"></p><div class="dialog-actions"><button id="source-apply">Apply to page</button><button id="source-insert">Insert at cursor</button><button id="source-export">Export .tex</button><button data-close>Cancel</button></div>');
addDialog('versions-dialog','<h2>Previous versions</h2><p>Restore this page from an automatic notebook backup. Your other pages stay as they are. You can undo the restore.</p><div id="version-list"></div><button data-close>Close</button>');
for(const dialog of document.querySelectorAll('dialog'))dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
let notebook,mf,loading=false,blocked=false,dirty=false,failures=0,revision=0,editRevision=0,formatSelection=null,sourceSelection=null,matchIndex=-1;
const autosave=createAutosaveScheduler(persist,{shouldRetry:()=>!blocked});
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),6000);}
const active=()=>notebook.documents.find(d=>d.id===notebook.activeId);
function trimHistories(){
 const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
 let total=0;for(const d of notebook.documents)if(d.history)total+=bytes(d.history);
 while(total>8_000_000){let changed=false;for(const d of notebook.documents){const h=d.history;if(!h||h.entries.length<2)continue;const before=bytes(h);if(h.index>0){h.entries.shift();h.index--;}else h.entries.pop();total-=before-bytes(h);changed=true;if(total<=8_000_000)break;}if(!changed)break;}
 // A lone current state is already stored in content. Drop that redundant
 // snapshot before allowing many large pages to exceed the notebook budget.
 if(total>8_000_000)for(const d of notebook.documents){if(d.history){total-=bytes(d.history);delete d.history;if(total<=8_000_000)break;}}
}
function capture(){
 if(!mf||loading||!notebook)return;
 active().content={type:'math-page',latex:mf.value,mode:active().content.mode};active().history=mf.pageHistory.serialize();active().title=$('#title').value||'Untitled page';if(dirty)active().updatedAt=Date.now();trimHistories();
}
function scheduleSave(){if(loading)return;dirty=true;editRevision++;if(blocked)return;$('#save-status').textContent='Saving…';autosave.schedule();}
async function persist(){
 if(blocked)return false;capture();const rev=++revision,capturedEdit=editRevision;
 try{
  const data=JSON.stringify(notebook);
  if(window.lemma)await window.lemma.save(data);
  else{const old=localStorage.getItem('folio.notebook');localStorage.setItem('folio.notebook.recovery',data);if(old)localStorage.setItem('folio.notebook.backup',old);localStorage.setItem('folio.notebook',data);localStorage.removeItem('folio.notebook.recovery');}
  if(rev===revision&&capturedEdit===editRevision){$('#save-status').textContent='All changes saved';dirty=false;failures=0;}return true;
 }catch{if(!failures)toast('Save failed. Your previous file is preserved. Retrying automatically; export a copy before closing.');failures++;$('#save-status').textContent='Save failed · retrying';return false;}
}
const tabs=createPageTabs($('#page-tabs'),{onSelect:id=>switchDocument(id),onNew:()=>actions.new(),onClose:closePage,getPage:id=>{capture();return notebook.documents.find(d=>d.id===id);}});
function closePage(id){
 capture();const index=notebook.documents.findIndex(d=>d.id===id);if(index<0)return;
 const selected=id===notebook.activeId;notebook.documents.splice(index,1);
 if(!notebook.documents.length)notebook.documents.push(freshDocument('Untitled page'));
 if(selected){mf.pageHistory.dispose();mf.remove();mf=null;switchDocument(notebook.documents[Math.max(0,index-1)]?.id||notebook.documents[0].id);}
 else{renderList();mf.focus();}
 scheduleSave();
}
function renderList(){tabs.render(notebook.documents.map(d=>d.id===notebook.activeId?{...d,title:$('#title').value}:d),notebook.activeId);const query=$('#search').value.toLowerCase();$('#documents').replaceChildren();for(const d of notebook.documents.filter(d=>d.title.toLowerCase().includes(query))){const b=document.createElement('button');b.textContent=d.title;b.classList.toggle('active',d.id===notebook.activeId);b.setAttribute('aria-current',String(d.id===notebook.activeId));b.onclick=()=>{if(d.id!==notebook.activeId)switchDocument(d.id);};$('#documents').append(b);}}
function mode(value,focus=true){
 active().content.mode=value;mf.pageInputMode=value;mf.smartMode=false;mf.resetProseInput();
 if(focus){mf.pageHistory.flush();if(value!=='auto')mf.mode=value;}else if(!active().history&&value!=='auto')mf.mode=value;
 for(const m of ['auto','math','text'])$('#mode-'+m).setAttribute('aria-pressed',String(m===value));$('#mode-status').textContent=value==='auto'?'Auto · words & equations':value==='math'?'Math':'Text';if(focus)mf.focus();
}
function switchDocument(id){
 const switching=!!mf;capture();notebook.activeId=id;loading=true;if(mf){mf.pageHistory.dispose();mf.remove();}
 mf=createPageMathfield($('#surface'),active().content.latex||EMPTY_PAGE,scheduleSave);
 installPageHistory(mf,active().history,scheduleSave);
 mf.addEventListener('editor-error',e=>toast(e.detail));
 mf.addEventListener('selection-change',()=>{for(const [id,style]of [['bold',{fontSeries:'b'}],['italic',{fontShape:'it'}]])$('#'+id).setAttribute('aria-pressed',String(mf.queryStyle(style)==='all'));});
 mf.addEventListener('input',()=>{if(!$('#findbar').hidden)updateFind();});
 mf.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&mf.mode!=='latex'){e.preventDefault();e.stopPropagation();if(!$('#findbar').hidden)closeFind();else $('#font').focus();return;}
  if(!(e.metaKey||e.ctrlKey))return;const key=e.key.toLowerCase();
  if(['m','t','f','g'].includes(key)){e.preventDefault();e.stopPropagation();if(key==='m'||key==='t'){mode(key==='m'?'math':'text');scheduleSave();}else if(key==='f')openFind();else nextMatch(e.shiftKey?-1:1);}
 },true);
 $('#title').value=active().title;mode(active().content.mode,false);loading=false;formatSelection=null;renderList();$('#page').scrollTop=0;requestAnimationFrame(()=>mf.focus());updateFind();if(switching)scheduleSave();
}
async function boot(){
 let recovered;
 try{
  if(window.lemma){const result=await window.lemma.load();if(result.notebook)notebook=validateNotebook(result.notebook);recovered=result.recovery;}
  else{
   for(const key of ['folio.notebook.recovery','folio.notebook','folio.notebook.backup']){const raw=localStorage.getItem(key);if(!raw)continue;try{notebook=validateNotebook(JSON.parse(raw));if(key!=='folio.notebook')recovered={source:'local recovery copy'};break;}catch{}}
  }
 }catch{blocked=true;toast('Saved pages could not be recovered. Original files are preserved. Export any new work before closing.');$('#save-status').textContent='Recovery mode';}
 if(!notebook){const d=freshDocument('Untitled page');notebook={version:2,activeId:d.id,documents:[d]};}
 switchDocument(notebook.activeId);if(!blocked)$('#save-status').textContent='All changes saved';
 if(recovered)toast('Recovered your notebook from '+recovered.source+'.');
 await window.lemma?.ready();
}
function download(data,extension,mime='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:mime}));a.download='Page.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function validateLatex(latex){if(checkLatex(latex).length)throw Error('This source contains unsupported or incomplete LaTeX. Simplify it and try again.');}

async function importFile(file){
 try{
  const data=importPageFile(file),d=freshDocument(String(data.title||file.name.replace(/\.[^.]+$/,'')||'Imported page').slice(0,200));
  d.content=validateDocument(data.content);validateLatex(d.content.latex);
  if(data.content.type==='doc')d.legacyContent=data.content;else if(data.legacyContent)d.legacyContent=data.legacyContent;
  capture();notebook.documents.push(d);switchDocument(d.id);scheduleSave();
 }catch(error){toast(error.message||'Could not open this file.');}
}
async function exportPage(kind){
 capture();
 try{
  if(kind==='pdf'){await document.fonts.ready;if(window.lemma)await window.lemma.exportPDF();else window.print();return;}
  let data,extension;
  if(kind==='lemma'){data=JSON.stringify({version:2,title:active().title,content:active().content,...(active().legacyContent?{legacyContent:active().legacyContent}:{})},null,2);extension='lemma';}
  else if(kind==='latex'){data=exportLatex(mf.value);extension='tex';}
  else{const selection=mf.selection;mf.selection={ranges:[[0,mf.lastOffset]]};data=readableSelection(mf);mf.selection=selection;extension='txt';}
  if(window.lemma){const fn=kind==='lemma'?'exportDocument':kind==='latex'?'exportLatex':'exportText';if(await window.lemma[fn](data))toast('Page exported.');}
  else download(data,extension,kind==='lemma'?'application/json':'text/plain');
 }catch{toast('Export failed. Please try again.');}
}
function openFind(){ $('#findbar').hidden=false;updateFind();$('#find-query').focus();$('#find-query').select();}
function closeFind(){$('#findbar').hidden=true;mf.focus();}
const findOptions=()=>({caseSensitive:$('#find-case').checked});
function updateFind(){const matches=findMatches(mf,$('#find-query').value,findOptions());$('#find-count').textContent=matches.length+' match'+(matches.length===1?'':'es');if(matchIndex>=matches.length)matchIndex=-1;return matches;}
function nextMatch(delta=1){const matches=updateFind();if(!matches.length)return;matchIndex=matchIndex<0?(delta>0?0:matches.length-1):(matchIndex+delta+matches.length)%matches.length;mf.selection={ranges:[matches[matchIndex].range]};mf.executeCommand('scrollIntoView');$('#find-count').textContent=(matchIndex+1)+' of '+matches.length;}
function showSource(){sourceSelection=structuredClone(mf.selection);$('#source-value').value=mf.selectionIsCollapsed?mf.value:mf.getValue(mf.selection,'latex');$('#source-error').textContent='';$('#source-dialog').showModal();$('#source-value').focus();}
function applySource(whole){
 try{const latex=importLatex($('#source-value').value);validateLatex(latex);mf.pageHistory.flush();mf.proseSuspended=true;mf.pageHistory.transaction(()=>{if(whole){mf._mathfield.model.mode='math';mf.setValue(latex,{mode:'math',format:'latex',insertionMode:'replaceAll'});}else{mf.selection=sourceSelection;insertLatexContent(mf,latex);}});setTimeout(()=>{mf.proseSuspended=false;},0);$('#source-dialog').close();scheduleSave();mf.focus();}
 catch(error){$('#source-error').textContent=error.message;}
}
async function showVersions(){
 $('#version-list').replaceChildren();$('#versions-dialog').showModal();
 if(!window.lemma){$('#version-list').textContent='Previous versions are available in the desktop app.';return;}
 try{
  const versions=await window.lemma.versions();if(!versions.length){$('#version-list').textContent='No previous versions yet. Backups are made automatically while you work.';return;}
  for(const v of versions){const button=document.createElement('button');button.textContent='Restore page content · '+new Date(v.createdAt).toLocaleString();button.onclick=async()=>{
   try{const previous=validateNotebook(await window.lemma.readVersion(v.id));const d=previous.documents.find(d=>d.id===notebook.activeId);if(!d){toast('This page did not exist in that backup.');return;}
    if(!await autosave.flush())return;mf.pageHistory.restore({latex:d.content.latex,typingMode:d.content.mode==='text'?'text':'math',selection:{ranges:[[0,0]]}});$('#versions-dialog').close();scheduleSave();toast('Page restored. Undo will return to your latest version.');
   }catch{toast('That backup could not be opened. Other backups are preserved.');}
  };$('#version-list').append(button);}
 }catch{toast('Could not list previous versions.');}
}
const textControlFocused=()=>['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
const actions={
 new:()=>{capture();const d=freshDocument('Untitled page');notebook.documents.push(d);switchDocument(d.id);scheduleSave();},
 open:async()=>{try{
  let file;if(window.lemma)file=await window.lemma.importDocument();
  else{const input=document.createElement('input');input.type='file';input.accept='.lemma,.folio,.json,.tex,.latex';file=await new Promise(resolve=>{input.onchange=async()=>{const f=input.files[0];resolve(f?{name:f.name,data:await f.text()}:null);};input.oncancel=()=>resolve(null);input.click();});}
  if(file)await importFile(file);
 }catch(error){toast(error.message||'Could not open the file.');}},
 export:()=>$('#export-dialog').showModal(),latex:()=>exportPage('latex'),text:()=>exportPage('text'),pdf:()=>exportPage('pdf'),
 undo:()=>textControlFocused()?document.execCommand('undo'):mf.pageHistory.undo(),redo:()=>textControlFocused()?document.execCommand('redo'):mf.pageHistory.redo(),find:openFind,replace:openFind,findNext:()=>nextMatch(1),findPrevious:()=>nextMatch(-1),versions:showVersions,insertLatex:showSource,
 copyLatex:async()=>{try{const data=mf.selectionIsCollapsed?mf.value:mf.getValue(mf.selection,'latex');if(window.lemma)await window.lemma.copyText(data);else await navigator.clipboard.writeText(data);toast('LaTeX copied.');}catch{toast('Could not copy. Open LaTeX source to select and copy it.');}}
};
for(const action of ['new','open','export','pdf'])$('#'+action).onclick=()=>actions[action]();
$('#find-open').onclick=openFind;$('#source-open').onclick=showSource;$('#versions-open').onclick=showVersions;
for(const button of document.querySelectorAll('[data-export]'))button.onclick=()=>{exportPage(button.dataset.export);$('#export-dialog').close();};
$('#source-apply').onclick=()=>applySource(true);$('#source-insert').onclick=()=>applySource(false);$('#source-export').onclick=()=>exportPage('latex');
$('#find-query').oninput=()=>{matchIndex=-1;updateFind();};$('#find-case').onchange=()=>{matchIndex=-1;updateFind();};$('#find-next').onclick=()=>nextMatch(1);$('#find-prev').onclick=()=>nextMatch(-1);$('#find-close').onclick=closeFind;
$('#find-query').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();nextMatch(e.shiftKey?-1:1);}if(e.key==='Escape')closeFind();};
$('#replace-one').onclick=()=>{const matches=updateFind();if(!matches.length)return;mf.pageHistory.flush();replaceMatch(mf,matches[Math.max(matchIndex,0)],$('#replace-value').value);matchIndex=-1;scheduleSave();setTimeout(updateFind,25);};
$('#replace-all').onclick=()=>{mf.pageHistory.flush();const count=mf.pageHistory.transaction(()=>replaceAll(mf,$('#find-query').value,$('#replace-value').value,findOptions()));matchIndex=-1;scheduleSave();setTimeout(updateFind,25);toast('Replaced '+count+' matches.');};
for(const value of ['auto','math','text'])$('#mode-'+value).onclick=()=>{mode(value);scheduleSave();};
for(const [id,latex]of Object.entries(templates)){$('#'+id).onmousedown=e=>e.preventDefault();$('#'+id).onclick=()=>{mf.pageHistory.flush();mf.focus();mf.executeCommand(['insert',latex,{mode:'math'}]);};}
for(const command of ['undo','redo']){$('#'+command).onmousedown=e=>e.preventDefault();$('#'+command).onclick=()=>{mf.focus();mf.pageHistory[command]();};}
for(const [id,style]of [['bold',{fontSeries:'b'}],['italic',{fontShape:'it'}]]){$('#'+id).onmousedown=e=>e.preventDefault();$('#'+id).onclick=()=>{mf.pageHistory.flush();mf.focus();applyFormatting(mf,style,{toggle:true});scheduleSave();};}
for(const id of ['font','font-size','ink'])$('#'+id).addEventListener('pointerdown',()=>{mf.pageHistory.flush();formatSelection=structuredClone(mf.selection);});
function format(style){if(formatSelection)mf.selection=formatSelection;applyFormatting(mf,style);scheduleSave();mf.focus();formatSelection=structuredClone(mf.selection);}
$('#font').onchange=()=>format({fontFamily:FONTS[$('#font').value]});$('#font-size').onchange=()=>format({fontSize:Number($('#font-size').value)});
$('#ink').oninput=()=>{if(formatSelection)mf.selection=formatSelection;applyFormatting(mf,{color:$('#ink').value});scheduleSave();};$('#ink').onchange=()=>mf.focus();
$('#keyboard').onmousedown=e=>e.preventDefault();$('#keyboard').onclick=()=>{mf.focus();mf.executeCommand('toggleVirtualKeyboard');};
$('#library-toggle').onclick=()=>document.body.classList.toggle('show-library');$('#search').oninput=renderList;
$('#title').oninput=()=>{scheduleSave();renderList();};$('#title').onkeydown=e=>{if(e.key==='Enter')mf.focus();};
$('#page').addEventListener('click',e=>{if(e.target===$('#page')||e.target===$('#surface')){mf.focus();mf.position=-1;}});
$('.toolbar').addEventListener('keydown',event=>{if(event.target.tagName!=='BUTTON'||!['ArrowLeft','ArrowRight'].includes(event.key))return;const controls=[...$('.toolbar').querySelectorAll('button,select,input')];const index=controls.indexOf(event.target);controls[(index+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length].focus();event.preventDefault();});
$('#findbar').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeFind();}});
$('#help').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();
window.lemma?.onAction(action=>actions[action]?.());window.lemma?.onOpenFile(file=>importFile(file));window.lemma?.onFileError(toast);
window.lemma?.onBeforeClose(async()=>{if((blocked&&!dirty)||await autosave.flush())window.lemma.finishClose();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!blocked){autosave.flush();}});
window.addEventListener('beforeunload',()=>{if(!window.lemma){autosave.flush();}});
boot().catch(()=>{blocked=true;$('#save-status').textContent='Editor could not start';toast('The editor could not start. Your saved notebook is preserved.');});
