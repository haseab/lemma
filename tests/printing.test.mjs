import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {installPrinting} from '../src/printing.js';

test('Command/Ctrl-P wait for fonts, print once, and preserve page and selection',async()=>{
 const host=new Window();let ready;host.document.fonts={ready:new Promise(resolve=>ready=resolve)};
 host.document.body.innerHTML='<p>Page content</p>';let calls=0;host.print=()=>calls++;
 const selection=host.getSelection(),range=host.document.createRange();range.selectNodeContents(host.document.querySelector('p'));selection.addRange(range);
 const printing=installPrinting({window:host});
 const press=options=>{const event=new host.KeyboardEvent('keydown',{key:'p',bubbles:true,cancelable:true,...options});host.document.dispatchEvent(event);return event;};
 assert(press({metaKey:true}).defaultPrevented);press({ctrlKey:true});assert.equal(calls,0);
 ready();await new Promise(setImmediate);assert.equal(calls,1);assert.equal(selection.toString(),'Page content');
 press({ctrlKey:true});await new Promise(setImmediate);assert.equal(calls,2);
 assert(!press({metaKey:true,shiftKey:true}).defaultPrevented);
 assert(!press({}).defaultPrevented);printing.dispose();assert(!press({metaKey:true}).defaultPrevented);
 await host.happyDOM.close();
});

test('desktop PDF and Print use separate native actions and recover from failures',async()=>{
 const host=new Window();host.document.fonts={ready:Promise.resolve()};const calls=[];let errors=0;
 host.lemma={print:async()=>{calls.push('print');throw Error('No printer');},exportPDF:async()=>calls.push('pdf')};
 const printing=installPrinting({window:host,onError:()=>errors++});
 await printing.print();assert.equal(errors,1);await printing.pdf();assert.deepEqual(calls,['print','pdf']);
 printing.dispose();await host.happyDOM.close();
});
