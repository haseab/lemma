import {MathfieldElement} from 'mathlive';
import {indent} from './formatting.js';
import {installProseInput} from './prose.js';
import {installExponentBackspace} from './exponent.js';
export {MathfieldElement};
export function createPageMathfield(container,latex,onInput){
 const field=new MathfieldElement();
 field.id='math-page';
 field.setAttribute('aria-label','Page: write text and equations');
 field.setAttribute('aria-multiline','true');
 field.defaultMode='math';
 field.mathVirtualKeyboardPolicy='manual';
 field.value=latex||'\\displaylines{}';
 // MathLive keyboard configuration requires a connected field.
 container.replaceChildren(field);
 field.position=-1;
 installProseInput(field);
 installExponentBackspace(field);
 field.addEventListener('input',onInput);
 field.addEventListener('keydown',event=>{
  if(event.key!=='Tab'||event.altKey||event.metaKey||event.ctrlKey||field.mode==='latex')return;
  event.preventDefault();event.stopPropagation();indent(field,event.shiftKey);
 },true);
 field.keybindings=[{key:'[Enter]',command:'addRowAfter'},{key:'shift+[Enter]',command:'addRowAfter'},...field.keybindings.filter(k=>k.key!=='[Enter]'&&k.key!=='shift+[Enter]'&&(!['[Tab]','shift+[Tab]'].includes(k.key)||k.ifMode==='latex'))];
 return field;
}
