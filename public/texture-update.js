/** Keep the displayed frame intact while a newer immutable snapshot is prepared. */
export function createLatestUpdater({prepare,commit,release,onError=()=>{}}){
 let version=0,pending=null,running=false,closed=false,idle=[];
 async function drain(){
  if(running||closed)return;
  running=true;
  while(pending&&!closed){
   const job=pending;pending=null;let result;
   try{result=await prepare(job.snapshot);if(closed||job.version!==version)release(result);else{commit(result,job.snapshot);result=null;}}
   catch(error){if(result)release(result);if(!closed&&job.version===version)onError(error);}
  }
  running=false;idle.splice(0).forEach(resolve=>resolve());
 }
 return {
  update(snapshot){if(closed)return;pending={version:++version,snapshot:structuredClone(snapshot)};void drain();},
  whenIdle(){return running?new Promise(resolve=>idle.push(resolve)):Promise.resolve();},
  dispose(){closed=true;version++;pending=null;},
 };
}
