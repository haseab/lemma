import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createPageTabs} from '../src/page-tabs.js';
test('shared tabs expose selection, support keyboard navigation, and provide a new-page action',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<div id="tabs"><input id="title" value="First"></div><div id="surface"></div>';
 const pages=[{id:'first',title:'First'},{id:'second',title:'Second'}];let selected='first',created=0;
 const tabs=createPageTabs(d.querySelector('#tabs'),{onSelect:id=>{selected=id;d.querySelector('#title').value=pages.find(p=>p.id===id).title;tabs.render(pages,id);},onNew:()=>created++});tabs.render(pages,selected);
 assert.equal(d.querySelector('[role="tab"][aria-selected="true"]').textContent,'First');assert.equal(d.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby'),'page-tab-first');
 d.querySelector('[role="tab"]').dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(selected,'second');assert.equal(d.activeElement.getAttribute('aria-selected'),'true');assert.equal(d.querySelectorAll('[role="tab"][tabindex="0"]').length,1);
 d.querySelector('#new-tab').click();assert.equal(created,1);await browser.happyDOM.close();
});
