import {createPageTabs} from '../src/page-tabs.js';
import 'mathlive/static.css';
import {brandMark} from '../src/brand.js';
import {loadGitHubStars} from './github-stars.js';
import {installFullscreen} from './fullscreen.js';
import {validateLatex} from 'mathlive';
import {createIcons,Github,Star,ArrowUpRight,FileText,FolderOpen,Download,Bold,Italic,Undo2,Redo2,CodeXml,CircleHelp,Plus,Eraser,Maximize2,Minimize2} from 'lucide';
import {MathfieldElement,createPageMathfield} from '../src/page-editor.js';
import {installPageHistory} from '../src/history.js';
import {EMPTY_PAGE,validateDocument,freshDocument} from '../src/document.js';
import {templates} from '../src/templates.js';
import {FONTS,applyFormatting} from '../src/formatting.js';
import {importLatex,importPageFile,exportLatex} from '../src/formats.js';
import {insertLatexContent} from '../src/clipboard.js';
import {loadScratchpad,saveScratchpad} from './scratchpad-store.js';
import {repositorySettings,releaseDownloads} from './releases.js';
import {detectDesktopPlatform,updatePlatformLinks} from './platform.js';
MathfieldElement.fontsDirectory=new URL('./fonts',document.baseURI).href;MathfieldElement.soundsDirectory=null;
createIcons({icons:{Github,Star,ArrowUpRight,FileText,FolderOpen,Download,Bold,Italic,Undo2,Redo2,CodeXml,CircleHelp,Plus,Eraser,Maximize2,Minimize2}});
const $=s=>document.querySelector(s);
for(const mark of document.querySelectorAll('[data-brand-mark]'))mark.innerHTML=brandMark;
installFullscreen(document.documentElement,$('#fullscreen'));
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5500);}
const first=freshDocument('Untitled page');
let notebook={version:2,activeId:first.id,documents:[first]},page=first,blocked=false;
try{const loaded=loadScratchpad(localStorage);if(loaded.page)notebook=loaded.page;if(loaded.recovered)toast('Recovered your previous saved copy.');}catch(error){blocked=true;toast(error.message);}
let field,saveTimer,selection,loading=false;
const tabs=createPageTabs($('#page-tabs'),{onSelect:switchPage,onNew:newPage});
function updateEmpty(){ $('#scratchpad').classList.toggle('has-content',!!field.getValue('plain-text').trim()); }
function capture(){if(!field||loading)return;page.title=$('#title').value||'Untitled page';page.content={type:'math-page',latex:field.value,mode:page.content.mode};page.history=field.pageHistory.serialize();page.updatedAt=Date.now();}
function save(){
 clearTimeout(saveTimer);if(!field)return;capture();
 if(blocked){$('#save-status').textContent='Export to keep your work';$('#save-status').classList.add('error');return;}
 try{saveScratchpad(localStorage,notebook);$('#save-status').textContent='Saved on this device';$('#save-status').classList.remove('error');}
 catch{$('#save-status').textContent='Not saved · export a copy';$('#save-status').classList.add('error');toast('Browser storage is unavailable or full. Export a copy before leaving.');}
}
function changed(){if(!field||loading)return;updateEmpty();$('#save-status').textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(save,250);}
function mode(value,focus=true){page.content.mode=value;field.pageInputMode=value;field.smartMode=false;field.resetProseInput();if(value!=='auto')field.mode=value;else if(focus)field.mode='math';for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===value));if(focus){field.focus();changed();}}
function switchPage(id){
 if(field&&id===notebook.activeId)return;
 const switching=!!field;capture();loading=true;
 if(field){field.pageHistory.dispose();field.remove();}
 notebook.activeId=id;page=notebook.documents.find(d=>d.id===id);$('#title').value=page.title;
 field=createPageMathfield($('#surface'),page.content.latex,changed);installPageHistory(field,page.history,changed);
 field.addEventListener('editor-error',e=>toast(e.detail));field.addEventListener('selection-change',()=>{selection=structuredClone(field.selection);});
 field.addEventListener('keydown',e=>{if(e.key==='Escape'&&field.mode!=='latex'){e.preventDefault();e.stopPropagation();document.querySelector('[data-mode="auto"]').focus();}},true);
 mode(page.content.mode,false);selection=null;loading=false;updateEmpty();tabs.render(notebook.documents,notebook.activeId);
 if(switching){save();field.focus();}
}
function newPage(){if(notebook.documents.length>=1000){toast('Page limit reached. Export a backup before starting another notebook.');return;}const d=freshDocument('Untitled page');notebook.documents.push(d);switchPage(d.id);}
switchPage(notebook.activeId);$('#save-status').textContent=blocked?'Export to keep your work':'Saved in this browser';
for(const b of document.querySelectorAll('[data-mode]')){b.onmousedown=e=>e.preventDefault();b.onclick=()=>mode(b.dataset.mode);}
for(const b of document.querySelectorAll('[data-insert]')){b.onmousedown=e=>e.preventDefault();b.onclick=()=>{field.focus();field.pageHistory.transaction(()=>field.executeCommand(['insert',templates[b.dataset.insert]]));changed();};}
for(const [id,style]of [['bold',{fontSeries:'b'}],['italic',{fontShape:'it'}]]){$('#'+id).onmousedown=e=>e.preventDefault();$('#'+id).onclick=()=>{field.focus();field.pageHistory.transaction(()=>applyFormatting(field,style,{toggle:true}));changed();};}
for(const id of ['font','font-size'])$('#'+id).addEventListener('pointerdown',()=>{selection=structuredClone(field.selection);});
function format(style){if(selection)field.selection=selection;field.pageHistory.transaction(()=>applyFormatting(field,style));field.focus();changed();}
$('#font').onchange=()=>format({fontFamily:FONTS[$('#font').value]});$('#font-size').onchange=()=>format({fontSize:Number($('#font-size').value)});
for(const id of ['undo','redo']){$('#'+id).onmousedown=e=>e.preventDefault();$('#'+id).onclick=()=>{field.pageHistory[id]();field.focus();updateEmpty();};}
$('#title').addEventListener('input',changed);
const examples={quadratic:'\\displaylines{x^2+6x+5=0\\\\(x+1)(x+5)=0\\\\x=-1\\;\\text{or}\\;x=-5}',calculus:'\\displaylines{f(x)=x^2\\qquad f\'(x)=2x\\\\\\int_0^1x^2\\,dx=\\left[\\frac{x^3}{3}\\right]_0^1=\\frac{1}{3}}'};
for(const b of document.querySelectorAll('[data-example]'))b.onclick=()=>{field.focus();field.pageHistory.transaction(()=>insertLatexContent(field,examples[b.dataset.example]));changed();};
$('#clear-page').onclick=()=>{field.pageHistory.transaction(()=>{field.value=EMPTY_PAGE;field.mode=page.content.mode==='text'?'text':'math';field.position=-1;});field.resetProseInput();field.focus();changed();toast('Page cleared. Undo to bring it back.');};
for(const name of ['source','help','privacy'])$('#'+name+'-open').onclick=()=>{if(name==='source'){$('#source-value').value=field.value;$('#source-error').textContent='';}$('#'+name+'-dialog').showModal();};
$('#keyboard-open').onclick=()=>{$('#help-dialog').close();field.focus();window.mathVirtualKeyboard.show();};
for(const el of document.querySelectorAll('[data-mod]'))el.textContent=/Mac/i.test(navigator.platform)?'⌘':'Ctrl+';
$('#source-apply').onclick=()=>{try{const latex=importLatex($('#source-value').value);if(validateLatex(latex).length)throw Error('This source contains unsupported or incomplete LaTeX.');field.pageHistory.transaction(()=>{field.value=latex;field.mode=page.content.mode==='text'?'text':'math';field.position=-1;});field.resetProseInput();$('#source-dialog').close();field.focus();changed();}catch(error){$('#source-error').textContent=error.message;}};
$('#copy-latex').onclick=async()=>{try{await navigator.clipboard.writeText($('#source-value').value);toast('LaTeX copied.');}catch{toast('Select the source above to copy it.');}};
function download(data,extension){const url=URL.createObjectURL(new Blob([data],{type:extension==='lemma'?'application/json':'text/plain'})),a=document.createElement('a');a.href=url;a.download=($('#title').value.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim()||'Page')+'.'+extension;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const b of document.querySelectorAll('[data-export]'))b.onclick=async()=>{ $('#export-menu').open=false;const kind=b.dataset.export;if(kind==='pdf'){await document.fonts.ready;window.print();return;}if(kind==='latex')download(exportLatex(field.value),'tex');else if(kind==='text')download(field.getValue('plain-text'),'txt');else download(JSON.stringify({version:2,title:$('#title').value||'Untitled page',content:{type:'math-page',latex:field.value,mode:page.content.mode}},null,2),'lemma');};
$('#open-file').onclick=()=>$('#file-input').click();
$('#file-input').onchange=async()=>{const file=$('#file-input').files[0];if(!file)return;try{if(file.size>4_000_000)throw Error('This file exceeds the page limit.');const imported=importPageFile({name:file.name,data:await file.text()}),content=validateDocument(imported.content);if(validateLatex(content.latex).length)throw Error('This file contains unsupported or incomplete LaTeX.');const d=freshDocument(String(imported.title||file.name.replace(/\.[^.]+$/,'')).slice(0,200));d.content=content;notebook.documents.push(d);switchPage(d.id);toast('Page imported in a new tab.');}catch(error){toast(error.message||'Could not import this file.');}finally{$('#file-input').value='';}};
// No page content is sent over the network. Saving runs synchronously on exit.
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
document.addEventListener('pointerdown',e=>{if(!$('#export-menu').contains(e.target))$('#export-menu').open=false;});
const detected=detectDesktopPlatform(navigator),repository=repositorySettings(import.meta.env.VITE_REPOSITORY_URL);
for(const link of document.querySelectorAll('[data-source]')){if(repository){link.href=repository.url;link.target='_blank';link.rel='noopener noreferrer';}else link.addEventListener('click',()=>toast('Source code link has not been configured.'));}
void loadGitHubStars($('.github-link'),repository);
function updateDownloads(downloads){updatePlatformLinks(document,detected,downloads,repository?repository.url+'/releases':'#scratchpad');for(const link of document.querySelectorAll('[data-primary-download]'))link.hidden=!repository;}
updateDownloads({});
if(repository){try{const response=await fetch(repository.api,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('No releases');updateDownloads(releaseDownloads(await response.json(),repository));}catch{/* The header keeps its GitHub Releases fallback. */}}
