import {MathfieldElement,convertLatexToMarkup} from 'mathlive';
import 'mathlive/static.css';
import {repositorySettings,releaseDownloads} from './releases.js';
import {detectDesktopPlatform,updatePlatformLinks} from './platform.js';
MathfieldElement.fontsDirectory='./fonts';MathfieldElement.soundsDirectory=null;
const $=s=>document.querySelector(s);
const examples={quadratic:'\\displaylines{\\text{Quadratic equation}\\\\x^2+6x+5=0\\\\(x+1)(x+5)=0\\\\\\therefore x=-1\\;\\text{ or }\\;x=-5}',calculus:'\\displaylines{\\text{Definite integral}\\\\f(x)=x^2\\qquad f\'(x)=2x\\\\\\int_0^1 x^2\\,dx=\\left[\\frac{x^3}{3}\\right]_0^1=\\frac{1}{3}}',blank:'\\displaylines{}'};
const field=new MathfieldElement();field.mathVirtualKeyboardPolicy='manual';field.setAttribute('aria-label','Try Lemma: edit the example equation');field.value=examples.quadratic;$('#demo-field').append(field);
let current='quadratic';
function chooseExample(name){current=name;field.value=examples[name];for(const button of document.querySelectorAll('[data-example]'))button.setAttribute('aria-pressed',String(button.dataset.example===name));}
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{chooseExample(button.dataset.example);field.focus();field.position=-1;});
$('#try-demo').addEventListener('click',()=>{$('#scratchpad').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});chooseExample('blank');field.focus({preventScroll:true});});
$('#demo-reset').addEventListener('click',()=>{chooseExample(current);toast('Example reset.');});
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
$('#demo-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(field.value);toast('LaTeX copied.');}catch{toast('Copy isn’t available in this browser. Select the equation to copy it.');}});
$('#feature-math').innerHTML=convertLatexToMarkup('\\frac{d}{dx}\\left(x^n\\right)=nx^{n-1}');
const detected=detectDesktopPlatform(navigator);
const repository=repositorySettings(import.meta.env.VITE_REPOSITORY_URL);
for(const link of document.querySelectorAll('[data-source]')){if(repository){link.href=repository.url;link.target='_blank';link.rel='noopener noreferrer';}else{link.href='#release-note';link.addEventListener('click',()=>toast('The source link will be available when this site launches.'));}}
function updateDownloads(downloads){updatePlatformLinks(document,detected,downloads);for(const platform of ['mac','windows']){const link=document.querySelector(`[data-download="${platform}"]`),status=document.querySelector(`[data-build-status="${platform}"]`),asset=downloads[platform];if(asset){link.href=asset.url;link.textContent=platform==='mac'?'Download for Mac ↓':'Download for Windows ↓';status.textContent=`${asset.version} · ${asset.preview?'Preview release':'Release'}`;}else{link.href=repository?repository.url+'/releases':'#release-note';link.textContent='View preview releases ↗';status.textContent='Public download coming soon';}}}
updateDownloads({});
if(repository){try{const response=await fetch(repository.api,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('No release list');const downloads=releaseDownloads(await response.json(),repository);updateDownloads(downloads);if(downloads.mac||downloads.windows)$('#release-note').textContent='Preview software: read the release notes before installing. Windows builds may show an unsigned-publisher warning; Mac previews may require additional installation steps.';}catch{$('#release-note').textContent='Check GitHub Releases for preview downloads and installation notes. Lemma is in active development.';}}
