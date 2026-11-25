import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {applyFormatting} from '../src/formatting.js';
import {Window} from 'happy-dom';
const browser=new Window({url:'http://localhost/'});
for(const key of ['CSSStyleSheet','ShadowRoot','DocumentFragment','HTMLButtonElement','HTMLTextAreaElement','HTMLInputElement','PointerEvent','MouseEvent','Range','Selection','window','document','HTMLElement','customElements','navigator','MutationObserver','ResizeObserver','getComputedStyle','DOMRect','DOMParser','Event','CustomEvent','InputEvent','KeyboardEvent','Node','Element','requestAnimationFrame','cancelAnimationFrame','location','CSS','HTMLSlotElement','HTMLSpanElement','HTMLDivElement','HTMLStyleElement']) {
 if(browser[key]!==undefined)Object.defineProperty(globalThis,key,{configurable:true,value:typeof browser[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?browser[key].bind(browser):browser[key]});
}
document.fonts={ready:Promise.resolve(),check:()=>true,load:async()=>[]};
const {createPageMathfield,MathfieldElement}=await import('../src/page-editor.js');
MathfieldElement.fontsDirectory=null;MathfieldElement.soundsDirectory=null;
test('full-page field mounts and edits math, multiple lines, and ordinary text',async(t)=>{
 const container=document.createElement('div');document.body.append(container);
 const field=createPageMathfield(container,'\\displaylines{}',()=>{});
 assert.equal(container.querySelectorAll('math-field').length,1);
 assert(field.keybindings.some(k=>k.key==='[Enter]'&&k.command==='addRowAfter'));
 field.executeCommand(['insert','x^{2}']);
 field.executeCommand('addRowAfter');
 field.executeCommand(['insert','\\frac{3}{4}']);
 field.executeCommand('addRowAfter');
 field.executeCommand(['switchMode','text']);
 field.executeCommand(['insert','A simple explanation.',{mode:'text',format:'text'}]);
 assert.equal(field.mode,'text');field.executeCommand('addRowAfter');field.executeCommand(['switchMode','math']);field.executeCommand(['insert','y=2']);assert.equal(field.mode,'math');
 const saved=field.value;
 assert.match(saved,/x\^/);assert.match(saved,/\\frac(?:\{3\}|3)(?:\{4\}|4)/);assert.match(saved,/A simple explanation\./);assert.match(saved,/\\\\/);
 const restored=createPageMathfield(container,saved,()=>{});
 assert.equal(restored.value,saved);
 field.remove();restored.remove();container.remove();

});

after(()=>browser.happyDOM.close());

test('reopening and Tab keep a caret instead of selecting a prose group',()=>{
 const c=document.createElement('div');document.body.append(c);
 const f=createPageMathfield(c,'\\displaylines{a^2\\text{ sample words}}',()=>{});
 assert.equal(f.selectionIsCollapsed,true);
 assert(!f.keybindings.some(k=>['moveToNextGroup','moveToPreviousGroup'].includes(k.command)));
 f.mode='text';f.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
 assert.equal(f.selectionIsCollapsed,true);assert.match(f.value,/sample words/);
 const text=f.getValue('plain-text');assert.match(f.value,/\\quad/);assert.equal(f.mode,'text');
 f.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
 assert.equal(f.selectionIsCollapsed,true);assert(!f.value.includes('\\quad'));assert.match(f.value,/sample words/);
 f.remove();c.remove();
});
test('selected prose retains font, size, color, and intentional selection after formatting and reload',()=>{
 const c=document.createElement('div');document.body.append(c);
 const f=createPageMathfield(c,'\\text{Example note}',()=>{});
 f.selection={ranges:[[0,f.lastOffset]]};const before=JSON.stringify(f.selection);
 applyFormatting(f,{fontFamily:'roman',fontSize:6,color:'#315b42'});
 assert.equal(JSON.stringify(f.selection),before);assert.equal(f.selectionIsCollapsed,false);
 const saved=f.value;assert.match(saved,/\\textrm/);assert.match(saved,/315b42/);assert.equal(f.errors.length,0);
 const restored=createPageMathfield(c,saved,()=>{});assert.equal(restored.value,saved);assert.equal(restored.selectionIsCollapsed,true);
 restored.mode='text';restored.executeCommand(['insert',' more',{mode:'text',format:'text'}]);assert.match(restored.getValue('plain-text'),/Example note more/);
 f.remove();restored.remove();c.remove();
});

test('Tab indents an intentional selection without replacing its text',()=>{
 const c=document.createElement('div');document.body.append(c);
 const f=createPageMathfield(c,'\\text{Keep this note}',()=>{});f.selection={ranges:[[0,f.lastOffset]]};
 f.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
 assert.match(f.value,/Keep this note/);assert.match(f.value,/\\quad/);assert.equal(f.errors.length,0);
 f.remove();c.remove();
});

async function type(f,text){
 for(const char of text){
  const event=new KeyboardEvent('keydown',{key:char==='\n'?'Enter':char,bubbles:true,cancelable:true});
  f.dispatchEvent(event);
  if(!event.defaultPrevented)f.executeCommand(['insert',char,{mode:f.mode,format:f.mode==='text'?'text':'latex',selectionMode:'after'}]);
  await new Promise(resolve=>setTimeout(resolve,1));
 }
}
function scratch(){const c=document.createElement('div');document.body.append(c);return createPageMathfield(c,'\\displaylines{}',()=>{});}
test('Auto retroactively converts connected short words and keeps subsequent short words as prose',async()=>{
 const f=scratch();await type(f,'a bright day is here');
 assert.equal(f.mode,'text');assert.equal(f.selectionIsCollapsed,true);
 assert.equal(f.getValue('plain-text'),'a bright day is here');
 for(let i=0;i<f.lastOffset;i++)assert.match(f.getValue([i,i+1],'latex'),/\\text/);
 assert.equal(f.errors.length,0);f.parentElement.remove();
});
test('Auto preserves equations and recognized mathematical functions',async()=>{
 const f=scratch();await type(f,'x+y=2');assert.equal(f.mode,'math');assert(!f.value.includes('\\text'));
 await type(f,'\n');await type(f,'sin');assert.equal(f.mode,'math');f.parentElement.remove();
});
test('newline resets prose to math and backticks keep inline math explicit',async()=>{
 const f=scratch();await type(f,'A useful note `xyz+2` is clear');
 assert.equal(f.mode,'text');assert.match(f.value,/xyz\+2/);assert(!f.value.includes('`'));
 assert.match(f.value,/is clear/);await type(f,'\n');assert.equal(f.mode,'math');await type(f,'y=3');assert.match(f.value,/y=3/);
 const saved=f.value;const restored=createPageMathfield(f.parentElement,saved,()=>{});assert.equal(restored.value,saved);assert.equal(restored.errors.length,0);restored.parentElement.remove();
});
test('prose conversion stops at structured math and respects explicit Math mode',async()=>{
 const f=scratch();f.executeCommand(['insert','\\frac{a}{b}']);await type(f,' useful note');
 assert.match(f.value,/\\frac/);assert.match(f.value,/useful note/);assert.equal(f.errors.length,0);
 f.pageInputMode='math';f.mode='math';await type(f,'variable');assert.equal(f.mode,'math');f.parentElement.remove();
});

test('explicit inline words stay math when attached prose continues',async()=>{
 const f=scratch();await type(f,'A note `abc` is useful');
 assert.match(f.value,/\\mathord\{abc\}/);assert.match(f.value,/is useful/);
 assert.equal(f.errors.length,0);f.parentElement.remove();
});
test('recognition preserves selected typography and handles mathematical function prefixes',async()=>{
 const f=scratch();applyFormatting(f,{fontSize:6,color:'#315b42'});await type(f,'bright day');
 assert.match(f.value,/315b42/);assert.equal(f.mode,'text');assert.equal(f.errors.length,0);
 await type(f,'\n');await type(f,'arctan');assert.equal(f.mode,'math');f.parentElement.remove();
});

test('single variables followed by spaces remain an equation',async()=>{
 const f=scratch();await type(f,'a + b = c');assert.equal(f.mode,'math');
 assert(!f.value.includes('\\text{a'));assert(!f.value.includes('\\text{b'));
 assert.equal(f.errors.length,0);f.parentElement.remove();
});
test('Auto defers alphabetic shortcuts so ordinary word prefixes cannot turn into symbols',async()=>{
 const f=scratch();assert(!Object.keys(f.inlineShortcuts).some(key=>/[A-Za-z]/.test(key)));
 await type(f,'inline math is useful');assert.equal(f.getValue('plain-text'),'inline math is useful');assert.equal(f.mode,'text');
 await type(f,'\n');await type(f,'sin ');assert.match(f.value,/\\sin/);assert.equal(f.mode,'math');
 await type(f,'`');assert(f.inlineShortcuts.in);await type(f,'`');assert(!f.inlineShortcuts.in);
 f.parentElement.remove();
});

function backspace(f,options={}){
 const e=new KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true,...options});f.dispatchEvent(e);return e;
}
function exponentScratch(latex){const c=document.createElement('div');document.body.append(c);return createPageMathfield(c,latex,()=>{});}
function exponentBoundary(f){
 const model=f._mathfield.model;
 for(let i=0;i<=f.lastOffset;i++){
  const atom=model.at(i);
  if(atom?.superscript?.length&&atom.parent?.type!=='subsup')return i;
 }
 throw Error('Missing exponent boundary');
}
test('Backspace joins the following expression into an open exponent fence, with one-step undo and redo',()=>{
 const f=exponentScratch('e^{\\left(\\right.}\\pi^2+1');
 f.position=exponentBoundary(f);const original=f.value,originalPosition=f.position;
 assert.equal(backspace(f).defaultPrevented,true);
 assert.equal(f.value,'e^{\\left(\\pi^2+1\\right.}');assert.equal(f.errors.length,0);assert.equal(f.selectionIsCollapsed,true);
 const joined=f.value;assert.equal(f._mathfield.model.at(f.position).parent.type,'leftright');
 f.executeCommand('undo');assert.equal(f.value,original);assert.equal(f.position,originalPosition);
 f.executeCommand('redo');assert.equal(f.value,joined);
 const restored=createPageMathfield(f.parentElement,joined,()=>{});assert.equal(restored.value,joined);restored.parentElement.remove();
});
test('joining preserves fraction structure and styles, stops at relations and stays in the current row',()=>{
 const f=exponentScratch('\\displaylines{e^{x}\\textcolor{#315b42}{\\frac{a}{b}}+1=7\\\\z=3}');
 f.position=exponentBoundary(f);assert.equal(backspace(f).defaultPrevented,true);
 assert.match(f.value,/e\^\{x.*\\frac.*\+1\}=7/);assert.match(f.value,/315b42/);assert.match(f.value,/\\\\\s*z=3/);assert.equal(f.errors.length,0);
 f.parentElement.remove();
});
test('ordinary deletion, selections, modifiers and prose retain native Backspace behavior',()=>{
 for(const latex of ['x+1','e^2','e^2=1','e^2\\text{ a note}']){
  const f=exponentScratch(latex);if(latex.startsWith('e'))f.position=exponentBoundary(f);else f.position=1;
  const original=f.value;assert.equal(backspace(f).defaultPrevented,false);assert.equal(f.value,original);f.parentElement.remove();
 }
 const f=exponentScratch('e^2+x');f.position=exponentBoundary(f);const original=f.value;
 assert.equal(backspace(f,{metaKey:true}).defaultPrevented,false);assert.equal(f.value,original);
 f.selection={ranges:[[0,1]]};assert.equal(backspace(f).defaultPrevented,false);assert.equal(f.value,original);f.parentElement.remove();
});

async function erase(f,command='deleteBackward'){
 f.executeCommand(command);await new Promise(resolve=>setTimeout(resolve,5));
}
test('deleting the prose-triggering letter reverses pie to mathematical pi and can be undone once',async()=>{
 const f=scratch();await type(f,'pi');assert.equal(f.mode,'math');await type(f,'e');assert.equal(f.mode,'text');
 await erase(f);assert.equal(f.mode,'math');assert.equal(f.value,'pi');assert.equal(f.selectionIsCollapsed,true);
 f.executeCommand('undo');assert.equal(f.getValue('plain-text'),'pie');assert.match(f.value,/\\text/);
 f.executeCommand('redo');assert.equal(f.value,'pi');assert.equal(f.errors.length,0);f.parentElement.remove();
});
test('deletion checks the complete connected prose run and keeps explicit Text mode literal',async()=>{
 const f=scratch();await type(f,'a bright pie');await erase(f);assert.equal(f.mode,'text');assert.equal(f.getValue('plain-text'),'a bright pi');
 f.position=2;await erase(f,'deleteForward');assert.equal(f.mode,'text');
 const g=scratch();g.pageInputMode='text';g.mode='text';await type(g,'pie');await erase(g);assert.equal(g.mode,'text');assert.match(g.value,/\\text\{pi\}/);
 f.parentElement.remove();g.parentElement.remove();
});
test('forward deletion reclassifies a word while preserving the caret and styling',async()=>{
 const f=scratch();applyFormatting(f,{color:'#315b42',fontSize:6});await type(f,'pie');
 f.position=2;await erase(f,'deleteForward');assert.equal(f.mode,'math');assert(!f.value.includes('\\text{'));assert.equal(f.position,2);
 assert.match(f.value,/315b42/);assert.equal(f.errors.length,0);f.parentElement.remove();
});

test('reclassification retains spaces and examines letters to the right of a forward deletion',async()=>{
 const f=scratch();await type(f,'pie x');f.position=2;await erase(f,'deleteForward');
 assert.equal(f.mode,'math');assert.match(f.value,/pi\\text\{ \}x/);assert.equal(f.position,2);
 const g=scratch();await type(g,'pie');g.position=0;await erase(g,'deleteForward');
 assert.equal(g.mode,'math');assert.equal(g.value,'ie');assert.equal(g.position,0);
 f.parentElement.remove();g.parentElement.remove();
});

const {installPageHistory}=await import('../src/history.js');
const {insertClipboard,clipboardPayload}=await import('../src/clipboard.js');
const {findMatches,replaceAll}=await import('../src/find.js');
const {validateNotebook}=await import('../src/document.js');
const settle=()=>new Promise(r=>setTimeout(r,30));
test('page undo persists independently across page switches, serialized restart, and redo',async()=>{
 const f=scratch();const h=installPageHistory(f);await type(f,'pi');await type(f,'e');await settle();
 assert.match(f.value,/\\text\{pie\}/);h.undo();assert.equal(f.value,'pi');h.redo();assert.match(f.value,/pie/);
 const state=h.serialize(),latex=f.value;h.dispose();f.parentElement.remove();
 const other=scratch();installPageHistory(other);await type(other,'x+2');other.pageHistory.undo();assert.notEqual(other.value,latex);other.parentElement.remove();
 const restored=exponentScratch(latex);installPageHistory(restored,JSON.parse(JSON.stringify(state)));restored.executeCommand('undo');assert.equal(restored.value,'pi');restored.executeCommand('redo');assert.match(restored.value,/pie/);restored.parentElement.remove();
});
test('automatic reverse classification, fractions and exponent joining are complete persistent Undo/Redo edits',async()=>{
 const f=exponentScratch('e^{\\left(\\right.}\\pi^2+1');const h=installPageHistory(f);const before=f.value;f.position=exponentBoundary(f);backspace(f);await settle();assert.notEqual(f.value,before);h.undo();assert.equal(f.value,before);h.redo();assert.match(f.value,/e\^\{\\left\(\\pi\^2\+1/);f.parentElement.remove();
 const g=scratch();installPageHistory(g);await type(g,'pie');await settle();await erase(g);await settle();assert.equal(g.value,'pi');g.pageHistory.undo();assert.match(g.value,/pie/);g.pageHistory.redo();assert.equal(g.value,'pi');
 insertClipboard(g,{'application/x-latex':'\\frac{3}{4}'});await settle();const fraction=g.value;assert.match(fraction,/\\frac/);g.pageHistory.undo();assert.equal(g.value,'pi');g.pageHistory.redo();assert.equal(g.value,fraction);g.parentElement.remove();
});
test('find/replace preserves structured math and Replace All is one undoable transaction',async()=>{
 const f=exponentScratch('\\displaylines{\\text{Example note. Example note.}\\\\x^{2}=3}');const h=installPageHistory(f),before=f.value;
 assert.equal(findMatches(f,'example').length,2);h.transaction(()=>replaceAll(f,'Example','Clear'));await settle();assert.equal(findMatches(f,'Clear').length,2);assert.match(f.value,/x\^2=3/);h.undo();assert.equal(f.value,before);f.parentElement.remove();
});
test('clipboard carries readable text, MathML and LaTeX; prose and source paste round trip',async()=>{
 const f=scratch();installPageHistory(f);insertClipboard(f,{'text/plain':'A clear note with `x^2`.'});await settle();assert.match(f.value,/A clear note with/);assert.match(f.value,/x\^2/);
 f.selection={ranges:[[0,f.lastOffset]]};const payload=clipboardPayload(f);assert.match(payload['text/plain'],/A clear note with/);assert.match(payload['application/mathml+xml'],/<math/);assert.match(payload['application/x-latex'],/x\^2/);
 const g=scratch();insertClipboard(g,payload);await settle();assert.equal(g.value,f.value);assert.equal(g.errors.length,0);f.parentElement.remove();g.parentElement.remove();
});
test('notebook validation retains valid history and safely drops malformed optional history',async()=>{
 const f=scratch();installPageHistory(f);await type(f,'x+1');await settle();
 const doc={id:'page',title:'Example',updatedAt:1,content:{type:'math-page',latex:f.value,mode:'auto'},history:f.pageHistory.serialize()};
 const n=validateNotebook({version:2,activeId:'page',documents:[doc]});assert.deepEqual(n.documents[0].history.entries.map(e=>e.latex),doc.history.entries.map(e=>e.latex));
 doc.history.entries[0].latex=42;const recovered=validateNotebook({version:2,documents:[doc]});assert.equal(recovered.documents[0].history,undefined);assert.equal(recovered.documents[0].content.latex,f.value);f.parentElement.remove();
});
const {templates}=await import('../src/templates.js');
test('actual toolbar fraction and power templates support filling, selection replacement, Undo and redo',async()=>{
 const f=scratch();installPageHistory(f);await type(f,'a');f.executeCommand(['insert',templates.fraction,{mode:'math'}]);await settle();assert.match(f.value,/\\frac/);assert.equal(f.errors.length,0);
 await type(f,'b');await settle();assert.match(f.value,/\\frac\{a\}\{b\}/);const filled=f.value;f.pageHistory.undo();assert.notEqual(f.value,filled);f.pageHistory.redo();assert.equal(f.value,filled);
 f.selection={ranges:[[0,f.lastOffset]]};f.executeCommand(['insert','x',{mode:'math'}]);await settle();assert.equal(f.value,'x');f.pageHistory.undo();assert.equal(f.value,filled);f.parentElement.remove();
});
test('plain clipboard preserves multiple rows and renders nested fractions and exponents readably',()=>{
 const f=exponentScratch('\\displaylines{\\text{A note}\\\\x^{2}+\\frac{3}{4}}');f.selection={ranges:[[0,f.lastOffset]]};const payload=clipboardPayload(f);
 assert.equal(payload['text/plain'],'A note\nx^(2)+(3)/(4)');assert.match(payload['application/mathml+xml'],/mfrac/);assert.match(payload['text/html'],/A note/);f.parentElement.remove();
});
test('multiline paste splits a prose row, preserves the suffix, and undoes as one edit',async()=>{
 const f=exponentScratch('\\text{Start end}');installPageHistory(f);f.position=6;const original=f.value;
 insertClipboard(f,{'text/plain':'First line\nSecond line'});await settle();
 assert.match(f.value,/\\displaylines/);assert(!f.value.includes('\\displaylines{\\displaylines'));
 assert.match(f.value,/end/);f.selection={ranges:[[0,f.lastOffset]]};assert.equal(clipboardPayload(f)['text/plain'],'Start First line\nSecond lineend');
 f.pageHistory.undo();assert.equal(f.value,original);f.parentElement.remove();
});
test('Enter in the middle of a prose paragraph preserves both halves and is one undoable edit',async()=>{
 const f=exponentScratch('\\text{Start end}');installPageHistory(f);const original=f.value;f.position=6;await type(f,'\n');await settle();
 f.selection={ranges:[[0,f.lastOffset]]};assert.equal(clipboardPayload(f)['text/plain'],'Start \nend');f.pageHistory.undo();assert.equal(f.value,original);f.parentElement.remove();
});
test('unsupported LaTeX paste reports a problem without replacing selected work',()=>{
 const f=exponentScratch('x+1');f.selection={ranges:[[0,f.lastOffset]]};const original=f.value;let message='';
 insertClipboard(f,{'application/x-latex':'\\unknownExampleCommand{a}'},{onError:value=>{message=value;}});
 assert.match(message,/unsupported/);assert.equal(f.value,original);f.parentElement.remove();
});

test('clipboard serializes matrix cells with rows and columns intact',()=>{
 const f=exponentScratch('\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}');f.selection={ranges:[[0,f.lastOffset]]};const payload=clipboardPayload(f);
 assert.equal(payload['text/plain'],'a\tb\nc\td');assert.match(payload['application/x-latex'],/pmatrix/);f.parentElement.remove();
});
test('persistent history restores formatting exactly and records the final empty state after deletion',async()=>{
 const f=exponentScratch('\\text{Example}');installPageHistory(f);const plain=f.value;f.selection={ranges:[[0,f.lastOffset]]};applyFormatting(f,{color:'#315b42',fontFamily:'roman',fontSize:6});await settle();const styled=f.value;
 f.pageHistory.undo();assert.equal(f.value,plain);f.pageHistory.redo();assert.equal(f.value,styled);f.parentElement.remove();
 const g=scratch();installPageHistory(g);await type(g,'pie');await settle();await erase(g);await erase(g);await erase(g);await settle();assert.equal(g.value,'');g.pageHistory.undo();assert.equal(g.value,'p');g.pageHistory.redo();assert.equal(g.value,'');g.parentElement.remove();
});

test('Undo and Redo refresh the accessible equation description',()=>{
 const f=exponentScratch('x+1');
 const entries=['x','x+1'].map(latex=>({latex,typingMode:'math',selection:{ranges:[[0,0]],direction:'forward'}}));
 const h=installPageHistory(f,{version:1,index:1,entries});
 const label=()=>f.shadowRoot.querySelector('[role="textbox"]').getAttribute('aria-label');
 const complete=label();assert.match(complete,/plus|\+/i);
 h.undo();assert.notEqual(label(),complete);assert.doesNotMatch(label(),/plus|\+/i);
 h.redo();assert.equal(label(),complete);f.parentElement.remove();
});


test('rich-text clipboard fallback keeps a single equation inline and escapes prose markup',()=>{
 const f=exponentScratch('x+1');f.selection={ranges:[[0,f.lastOffset]]};
 let payload=clipboardPayload(f);assert.equal(payload['text/plain'],'x+1');assert.match(payload['text/html'],/>x\+1<\/span>/);assert.doesNotMatch(payload['text/html'],/<mrow|<p|<div/);
 f.setValue('\\text{A < B \\& C}',{mode:'math'});f.selection={ranges:[[0,f.lastOffset]]};payload=clipboardPayload(f);assert.match(payload['text/html'],/A &lt; B &amp; C/);f.parentElement.remove();
});

test('empty-row carets keep inline geometry before typing and after deleting a row',async()=>{
 const c=document.createElement('div');document.body.append(c);
 const f=createPageMathfield(c,'\\displaylines{}',()=>{});
 const rowSelector='.ML__multiline_environment > .col-align-l > .ML__vlist-t > .ML__vlist-r:first-child > .ML__vlist > span';
 const check=()=>{
  const row=f.shadowRoot.querySelector(rowSelector);assert(row);
  const anchor=row.querySelector('.ML__empty-line-anchor');assert(anchor);
  const blockRule=f.shadowRoot.querySelector('[data-lemma-wrapping]').sheet.cssRules;
  const contentRule=[...blockRule].find(rule=>rule.selectorText?.includes('span:last-child'));
  assert(contentRule);assert(!row.querySelector('.ML__empty-line-anchor').matches(contentRule.selectorText));
  const caret=document.createElement('span');caret.className='ML__caret';row.append(caret);
  assert(!caret.matches(contentRule.selectorText));caret.remove();
 };
 await new Promise(r=>setTimeout(r,30));check();
 f.executeCommand(['insert','x']);await new Promise(r=>setTimeout(r,30));
 assert(f.shadowRoot.querySelector(rowSelector+' > span:last-child').textContent.includes('x'));
 f.selection={ranges:[[0,f.lastOffset]]};f.executeCommand('deleteBackward');
 await new Promise(r=>setTimeout(r,30));check();
 f.remove();c.remove();
});
