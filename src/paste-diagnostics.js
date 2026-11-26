// Explicit debugging. Only metadata can reach the private development receiver.
export function installPasteDiagnostics(field,{enabled=new URLSearchParams(location.search).get('pasteDebug')==='1'}={}){
 if(!enabled)return ()=>{};
 const sink=field.shadowRoot.querySelector('[part=keyboard-sink]');
 const panel=document.createElement('details');panel.open=true;
 panel.setAttribute('data-paste-diagnostics','');
 panel.style.cssText='position:fixed;right:16px;bottom:16px;z-index:10000;width:min(540px,calc(100vw - 32px));padding:12px;background:#fcfdf8;color:#293c30;border:1px solid #b9c9af;border-radius:12px;box-shadow:0 6px 24px #0002;font:12px/1.5 system-ui;text-align:left';
 const summary=document.createElement('summary');summary.textContent='Paste diagnostics · local only';summary.style.cursor='pointer';
 const hint=document.createElement('p');hint.textContent='Events and character counts only. No document text is recorded. Checking development autosave…';
 const output=document.createElement('pre');output.style.cssText='max-height:220px;overflow:auto;white-space:pre-wrap;font:11px/1.5 monospace';output.setAttribute('aria-label','Paste event log');
 const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';
 const download=document.createElement('button');download.type='button';download.textContent='Save report';download.style.marginLeft='8px';
 panel.append(summary,hint,output,clear,download);field.parentElement.append(panel);
 let rows=[],sequence=0,started=performance.now(),autosave=false,timer=null,saving=false,dirty=false;
 const capture=crypto.randomUUID(),endpoint='/paste-diagnostics.json';
 const snapshot=()=>({schema:1,capture,events:rows.map(row=>({...row}))});
 const schedule=()=>{dirty=true;clearTimeout(timer);if(autosave&&!saving)timer=setTimeout(save,150);};
 const save=async()=>{
  if(!field.isConnected||!autosave||saving)return;
  saving=true;dirty=false;
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot()),credentials:'same-origin'});
   if(!response.ok||(await response.json()).saved!==true)throw Error('Unavailable');
   hint.textContent='Metadata autosaved to the private development folder. No document text is sent.';
  }catch{autosave=false;hint.textContent='Autosave unavailable. Report remains here; use Save report.';}
  finally{saving=false;if(dirty&&autosave)schedule();}
 };
 fetch(endpoint,{credentials:'same-origin',cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error('Unavailable');const config=await response.json();
  if(config.service!=='lemma-paste-diagnostics'||config.schema!==1||config.enabled!==true)throw Error('Unavailable');
  autosave=true;hint.textContent='Metadata autosave enabled for this development preview. No document text is sent.';schedule();
 }).catch(()=>{hint.textContent='Local report only. Development autosave unavailable; use Save report.';});
 const record=(kind,metadata={})=>{
  const row={id:++sequence,ms:Math.round(performance.now()-started),kind};
  // Whitelist metadata so an accidental caller cannot log source text.
  for(const key of ['trusted','cancelled','focused','changed','characters','bufferCharacters','native','handled'])if(['boolean','number'].includes(typeof metadata[key]))row[key]=metadata[key];
  rows.push(row);if(rows.length>120)rows.shift();
  output.textContent=rows.map(row=>JSON.stringify(row)).join('\n');output.scrollTop=output.scrollHeight;
  schedule();
 };
 field.pasteDiagnostics={snapshot};
 for(const type of ['paste','beforeinput','input','focus','blur','compositionstart','compositionend'])field.addEventListener(type,event=>{
  if(event.composedPath()[0]!==sink)return;
  const before=field.value;
  const inputType=['insertFromPaste','insertText','insertReplacementText','insertCompositionText','deleteContentBackward'].includes(event.inputType)?event.inputType:'other';
  const kind=type==='input'||type==='beforeinput'?`${type}:${inputType}`:type;
  record(kind,{trusted:event.isTrusted,cancelled:event.defaultPrevented,focused:field.shadowRoot.activeElement===sink,bufferCharacters:sink.textContent.length,characters:typeof event.data==='string'?event.data.length:0});
  // Browser microtasks may run between native event listeners. Use a new task
  // so this observes the completed dispatch, including our clipboard handler.
  setTimeout(()=>{if(field.isConnected)record(`${kind}:settled`,{cancelled:event.defaultPrevented,changed:field.value!==before,focused:field.shadowRoot.activeElement===sink,bufferCharacters:sink.textContent.length});},0);
 },true);
 clear.addEventListener('click',()=>{rows=[];sequence=0;started=performance.now();output.textContent='';schedule();});
 download.addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='paste-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
 });
 return record;
}
