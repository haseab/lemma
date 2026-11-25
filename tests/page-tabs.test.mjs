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

test('close controls skip confirmation for blank pages and require confirmation for current content',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<div id="tabs"><input id="title" value="Example"></div><div id="surface"></div>';
 const pages=[{id:'empty',title:'Empty',content:{latex:'\\displaylines{\\\\}'}},{id:'filled',title:'Example',content:{latex:''}}],closed=[];
 const tabs=createPageTabs(d.querySelector('#tabs'),{onSelect:()=>{},onNew:()=>{},onClose:id=>closed.push(id),getPage:id=>id==='filled'?{...pages[1],content:{latex:'x+1'}}:pages[0]});tabs.render(pages,'filled');
 d.querySelector('[data-close-page="empty"]').click();assert.deepEqual(closed,['empty']);assert.equal(d.querySelector('dialog'),null);
 d.querySelector('[data-close-page="filled"]').click();assert(d.querySelector('dialog').open);assert.equal(d.activeElement,d.querySelector('[data-cancel]'));assert.deepEqual(closed,['empty']);
 d.querySelector('[data-cancel]').click();await Promise.resolve();assert.equal(d.querySelector('dialog'),null);assert.deepEqual(closed,['empty']);
 d.querySelector('[data-close-page="filled"]').click();d.querySelector('dialog').dispatchEvent(new browser.Event('cancel',{cancelable:true}));await Promise.resolve();assert.deepEqual(closed,['empty']);
 d.querySelector('[data-close-page="filled"]').click();d.querySelector('[data-confirm]').click();await Promise.resolve();assert.deepEqual(closed,['empty','filled']);await browser.happyDOM.close();
});

const {pageHasContent}=await import('../src/page-tabs.js');
test('empty rows and prose whitespace are blank, while equations and empty math structures are content',()=>{
 for(const value of ['',' ','\\displaylines{}','\\displaylines{\\\\}','\\displaylines{\\text{ }}'])assert.equal(pageHasContent(value),false);
 for(const value of ['x+1','\\text{A note}','\\frac{}{}','x^{}','\\sqrt{}'])assert.equal(pageHasContent(value),true);
});

test('tab context menu targets the clicked page, supports keyboard dismissal, and confirms deletion',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<div id="tabs"><input id="title" value="First"></div><div id="surface"></div>';
 const pages=[{id:'first',title:'First',content:{latex:'x+1'}},{id:'second',title:'Second',content:{latex:''}}],duplicated=[],removed=[],selected=[];
 const tabs=createPageTabs(d.querySelector('#tabs'),{onSelect:id=>selected.push(id),onNew:()=>{},onDuplicate:id=>duplicated.push(id),onClose:id=>removed.push(id)});tabs.render(pages,'first');
 const rightClick=id=>d.querySelector(`[data-page-id="${id}"]`).dispatchEvent(new browser.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:100,clientY:100}));
 rightClick('second');assert(d.querySelector('[role="menu"]'));assert.deepEqual(selected,[]);d.querySelector('[data-tab-action="duplicate"]').click();assert.deepEqual(duplicated,['second']);assert.equal(d.querySelector('[role="menu"]'),null);
 d.querySelector('[role="tab"]').dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ContextMenu',bubbles:true,cancelable:true}));const menu=d.querySelector('[role="menu"]');menu.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(d.activeElement.dataset.tabAction,'duplicate');menu.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(d.querySelector('[role="menu"]'),null);assert.equal(d.activeElement.dataset.pageId,'first');
 rightClick('first');d.querySelector('[data-tab-action="delete"]').click();assert.equal(d.querySelector('#close-page-heading').textContent,'Delete this page?');assert.deepEqual(removed,[]);d.querySelector('[data-cancel]').click();await Promise.resolve();assert.deepEqual(removed,[]);
 rightClick('first');d.querySelector('[data-tab-action="delete"]').click();d.querySelector('[data-confirm]').click();await Promise.resolve();assert.deepEqual(removed,['first']);await browser.happyDOM.close();
});


test('context rename selects the targeted page, commits on Enter, and restores its name on Escape',async()=>{
 const browser=new Window(),d=browser.document;d.body.innerHTML='<div id="tabs"><input id="title" value="First"></div><div id="surface"></div>';
 const pages=[{id:'first',title:'First'},{id:'second',title:'Second'}];let selected='first';
 const title=d.querySelector('#title');title.addEventListener('input',()=>{pages.find(p=>p.id===selected).title=title.value;});
 const tabs=createPageTabs(d.querySelector('#tabs'),{onSelect:id=>{selected=id;title.value=pages.find(p=>p.id===id).title;tabs.render(pages,id);},onNew:()=>{}});tabs.render(pages,selected);
 const rename=()=>{d.querySelector('[data-page-id="second"]').dispatchEvent(new browser.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));d.querySelector('[data-tab-action="rename"]').click();};
 rename();assert.equal(selected,'second');assert.equal(d.activeElement,title);assert.equal(title.hidden,false);assert.equal(title.selectionStart,0);assert.equal(title.selectionEnd,6);
 title.value='Notes';title.dispatchEvent(new browser.Event('input',{bubbles:true}));title.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(title.hidden,true);assert.equal(d.querySelector('[data-page-id="second"]').textContent,'Notes');assert.equal(pages[0].title,'First');
 rename();title.value='Discard';title.dispatchEvent(new browser.Event('input',{bubbles:true}));title.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(pages[1].title,'Notes');assert.equal(d.querySelector('[data-page-id="second"]').textContent,'Notes');await browser.happyDOM.close();
});
