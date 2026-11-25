const $=s=>document.querySelector(s);
$('#access').onsubmit=async event=>{
 event.preventDefault();$('#status').textContent='Loading…';$('#summary').textContent='';$('#rows').replaceChildren();$('table').hidden=true;
 try{
  const response=await fetch('/api/stats?days='+$('#days').value,{headers:{Authorization:'Bearer '+$('#token').value},cache:'no-store'});if(!response.ok)throw Error(response.status===401?'Invalid access token.':'Could not load download counts.');
  const {rows}=await response.json(),groups=new Map();let clicks=0,requests=0;
  for(const row of rows){if(row.event==='click')clicks+=row.count;else requests+=row.count;const key=[row.day,row.version,row.platform,row.source].join('|');if(!groups.has(key))groups.set(key,{...row,click:0,request:0});groups.get(key)[row.event]+=row.count;}
  for(const row of groups.values()){const tr=document.createElement('tr');for(const value of [row.day,row.version,row.platform,row.source,row.click,row.request]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}$('#rows').append(tr);}
  $('#summary').textContent=`${clicks.toLocaleString()} clicks · ${requests.toLocaleString()} download requests`;$('table').hidden=false;$('#status').textContent=rows.length?'':'No downloads in this period.';
 }catch(error){$('#status').textContent=error.message;}
};
