import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {installTooltips} from '../src/tooltips.js';
test('tooltips appear immediately, follow dynamic labels, and preserve accessible descriptions',async()=>{
 const w=new Window(),d=w.document;d.body.innerHTML='<button title="Enter fullscreen" aria-describedby="help"><svg></svg></button><p id="help">Help</p>';
 installTooltips(d);const button=d.querySelector('button');assert.equal(button.hasAttribute('title'),false);
 button.querySelector('svg').dispatchEvent(new w.Event('pointerover',{bubbles:true}));let tip=d.querySelector('[role="tooltip"]');assert.equal(tip.hidden,false);assert.equal(tip.textContent,'Enter fullscreen');assert.equal(button.getAttribute('aria-describedby'),'help control-tooltip');
 button.title='Exit fullscreen';await w.happyDOM.whenAsyncComplete();assert.equal(tip.textContent,'Exit fullscreen');assert.equal(button.hasAttribute('title'),false);
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(tip.hidden,true);assert.equal(button.getAttribute('aria-describedby'),'help');
 const dynamic=d.createElement('button');dynamic.setAttribute('aria-label','New page');d.body.append(dynamic);dynamic.focus();assert.equal(tip.hidden,false);assert.equal(tip.textContent,'New page');dynamic.blur();assert.equal(tip.hidden,true);assert.equal(dynamic.hasAttribute('aria-describedby'),false);
 await w.happyDOM.close();
});
