import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {installWelcome} from '../src/welcome.js';
const creator={name:'example_author',url:'https://x.com/example_author',avatar:'data:image/png;base64,iVBORw0KGgo='};
test('welcome shows once, bundles its image, opens the profile only on click, and returns to writing',async()=>{
 const host=new Window({url:'file:///example/index.html'});let done=0;const links=[];
 host.lemma={openCreator:async url=>links.push(url)};
 const dialog=installWelcome({window:host,creator,onDone:()=>done++});assert(dialog.open);
 assert.match(dialog.textContent,/no telemetry whatsoever/);assert.equal(dialog.querySelector('img').getAttribute('src'),creator.avatar);assert.equal(links.length,0);
 dialog.querySelector('a').click();assert.deepEqual(links,[creator.url]);
 dialog.querySelector('.welcome-start').click();assert.equal(done,1);assert(!dialog.isConnected);
 assert.equal(installWelcome({window:host,creator}),null);
 const reopened=installWelcome({window:host,creator,force:true});assert(reopened.open);assert.equal(installWelcome({window:host,creator,force:true}),reopened);reopened.close();
 await host.happyDOM.close();
});
test('closing welcome also dismisses it, missing credit is graceful, storage failures do not prevent writing',async()=>{
 const host=new Window();let done=0;
 const dialog=installWelcome({window:host,creator:{url:'javascript:alert(1)'},onDone:()=>done++});
 assert.equal(dialog.querySelector('a'),null);assert.equal(dialog.querySelector('img'),null);
 dialog.querySelector('.welcome-close').click();assert.equal(done,1);assert.equal(installWelcome({window:host,creator}),null);
 Object.defineProperty(host,'localStorage',{value:{getItem(){throw Error('Unavailable');},setItem(){throw Error('Unavailable');}}});
 const retry=installWelcome({window:host,creator:{},onDone:()=>done++});assert(retry.open);retry.close();assert.equal(done,2);
 await host.happyDOM.close();
});
