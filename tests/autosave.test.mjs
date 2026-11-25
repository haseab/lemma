import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveScheduler} from '../src/autosave.js';
function clock(){let now=0,next=1;const tasks=new Map();return {get now(){return now;},setTimer(fn,ms){const id=next++;tasks.set(id,{fn,when:now+ms});return id;},clearTimer(id){tasks.delete(id);},async advance(ms){const end=now+ms;while(true){const due=[...tasks].filter(([,t])=>t.when<=end).sort((a,b)=>a[1].when-b[1].when)[0];if(!due)break;now=due[1].when;tasks.delete(due[0]);await due[1].fn();}now=end;}};}
test('continuous typing still saves within one second and a pause saves after the short delay',async()=>{
 const time=clock(),saved=[];const autosave=createAutosaveScheduler(async()=>{saved.push(time.now);return true;},time);
 for(let i=0;i<10;i++){autosave.schedule();await time.advance(100);}assert.deepEqual(saved,[1000]);
 autosave.schedule();await time.advance(250);assert.deepEqual(saved,[1000,1250]);autosave.cancel();
});
test('failed saves retry automatically without another keystroke; explicit flush cancels stale timers',async()=>{
 const time=clock();let attempts=0;const autosave=createAutosaveScheduler(async()=>++attempts>1,time);
 autosave.schedule();await time.advance(250);assert.equal(attempts,1);await time.advance(2000);assert.equal(attempts,2);
 autosave.schedule();await autosave.flush();await time.advance(5000);assert.equal(attempts,3);
});
