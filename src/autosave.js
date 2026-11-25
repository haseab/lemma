export function createAutosaveScheduler(save,{delay=250,maxDelay=1000,retryBase=1000,setTimer=setTimeout,clearTimer=clearTimeout,shouldRetry=()=>true}={}){
 let pending=null,deadline=null,retry=null,failures=0;
 function cancel(){for(const id of [pending,deadline,retry])if(id!==null)clearTimer(id);pending=deadline=retry=null;}
 async function flush(){
  cancel();const success=await save();
  if(success)failures=0;
  else if(shouldRetry()&&pending===null&&deadline===null){failures++;retry=setTimer(flush,Math.min(30000,retryBase*2**Math.min(failures,5)));}
  return success;
 }
 function schedule(){
  if(retry!==null){clearTimer(retry);retry=null;}
  if(pending!==null)clearTimer(pending);
  pending=setTimer(flush,delay);if(deadline===null)deadline=setTimer(flush,maxDelay);
 }
 return {schedule,flush,cancel};
}
