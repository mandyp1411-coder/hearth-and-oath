// Consolidate completed per-atlas receipts after parallel native encodes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),docs=path.join(root,'docs/art-v57'),directory=path.join(docs,'registration');
await fs.mkdir(directory,{recursive:true});
const receipts=[];
for(const name of (await fs.readdir(directory)).filter(name=>name.endsWith('.json')).sort()){
  const record=JSON.parse(await fs.readFile(path.join(directory,name),'utf8'));
  if(name!==record.id+'.json'||!['accepted','pending-visual-review'].includes(record.status))throw Error('Invalid per-atlas receipt: '+name);
  receipts.push(record);
}
async function atomicJson(file,value){const temporary=file+`.${process.pid}.tmp`;await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');await fs.rename(temporary,file);}
await atomicJson(path.join(docs,'aged-registration.json'),receipts);
const queuePath=path.join(docs,'generation-queue.json');
const queue=await fs.readFile(queuePath,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(queue){
  const byId=new Map(receipts.map(r=>[r.id,r]));
  for(const job of queue.jobs)job.status=byId.get(job.id)?.status||'missing';
  queue.summary.acceptedAgeAtlases=queue.jobs.filter(j=>j.status==='accepted').length;
  queue.summary.pendingVisualReviewAtlases=queue.jobs.filter(j=>j.status==='pending-visual-review').length;
  queue.summary.missingAgeAtlases=queue.jobs.filter(j=>j.status==='missing').length;
  await atomicJson(queuePath,queue);
  console.log(JSON.stringify(queue.summary,null,2));
}else console.log(JSON.stringify({registeredAgeAtlases:receipts.length},null,2));
