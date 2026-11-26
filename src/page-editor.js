import {installSelectionReplacement} from './selection-replacement.js';
import {installPageLines} from './page-lines.js';
import {installProseNavigation} from './navigation.js';
import {insertPageBreak} from './editing.js';
import {installClipboard} from './clipboard.js';
import {installPasteDiagnostics} from './paste-diagnostics.js';
import {installPageWrapping} from './layout.js';
import {MathfieldElement} from 'mathlive';
import {indent} from './formatting.js';
import {installAutomaticConversion} from './automatic-conversion.js';
import {installProseInput} from './prose.js';
import {installClosingFences} from './fences.js';
import {installExponentBackspace} from './exponent.js';
export {MathfieldElement};
export function createPageMathfield(container,latex,onInput){
 const field=new MathfieldElement();
 field.id='math-page';
 field.setAttribute('aria-label','Page: write text and equations');
 field.setAttribute('aria-multiline','true');
 field.defaultMode='math';
 // Ordinary spaces are content in math, including within nested structures.
 field.mathModeSpace='\\ ';
 field.mathVirtualKeyboardPolicy='manual';
 field.value=latex||'\\displaylines{}';
 // MathLive keyboard configuration requires a connected field.
 container.replaceChildren(field);
 field.position=-1;
 installPageLines(field);
 installAutomaticConversion(field);
 installProseInput(field);
 installClosingFences(field);
 installExponentBackspace(field);
 installPageWrapping(field);
 installProseNavigation(field);
 const diagnosePaste=installPasteDiagnostics(field);
 installClipboard(field,message=>field.dispatchEvent(new CustomEvent('editor-error',{detail:message})),diagnosePaste);
 installSelectionReplacement(field);
 field.addEventListener('input',onInput);
 field.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.altKey&&!event.metaKey&&!event.ctrlKey&&field.mode!=='latex'){event.preventDefault();event.stopImmediatePropagation();insertPageBreak(field);return;}
  if(event.key!=='Tab'||event.altKey||event.metaKey||event.ctrlKey||field.mode==='latex')return;
  event.preventDefault();event.stopPropagation();indent(field,event.shiftKey);
 },true);
 field.keybindings=[{key:'[Enter]',command:'addRowAfter'},{key:'shift+[Enter]',command:'addRowAfter'},...field.keybindings.filter(k=>k.key!=='[Enter]'&&k.key!=='shift+[Enter]'&&(!['[Tab]','shift+[Tab]'].includes(k.key)||k.ifMode==='latex'))];
 return field;
}
