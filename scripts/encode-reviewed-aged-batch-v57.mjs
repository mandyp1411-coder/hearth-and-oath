// Independent per-atlas receipts can be encoded concurrently; aggregate once settled.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const docs=path.join(root,'docs/art-v57'),queue=JSON.parse(await fs.readFile(path.join(docs,'generation-queue.json')));
const args=process.argv.slice(2),excluded=args.find(a=>a.startsWith('--exclude='))?.slice(10)||'';
const read=async p=>fs.readFile(p,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
const jobs=queue.jobs.filter(j=>!excluded||!j.id.startsWith(excluded));let next=0,accepted=0;const failures=[];
async function worker(){while(next<jobs.length){
 const job=jobs[next++],receipt=await read(path.join(docs,'registration',job.id+'.json'));
 if(receipt?.status==='accepted'&&receipt.encoding?.quality===85&&receipt.encoding?.effort===6)continue;
 const review=path.join(docs,'reviews',job.id+'.json');if(!await read(review))continue;
 const meta=await read(path.join(docs,'imagegen-metadata',job.id+'.json'));
 const retained=path.join(root,'reference-art/aged-v57/source',job.ancestry,job.id+'.png');
 const source=await fs.access(meta?.sourcePath||'').then(()=>meta.sourcePath).catch(()=>retained);
 const prompt=path.join(docs,'prompts',job.id+'.txt');
 const parameters=['scripts/encode-aged-portraits-v57.mjs','--job',job.id,'--source',source,'--review',review,'--prompt-file',prompt];
 const result=await new Promise(resolve=>{let error='';const child=spawn(process.execPath,parameters,{cwd:root,stdio:['ignore','ignore','pipe']});child.stderr.on('data',b=>error+=b);child.on('error',e=>resolve({code:1,error:e.message}));child.on('close',code=>resolve({code,error}));});
 if(result.code===0){accepted++;console.log(JSON.stringify({id:job.id,status:'accepted'}));}else failures.push({id:job.id,error:result.error.trim()});
}}
await Promise.all(Array.from({length:4},worker));
console.log(JSON.stringify({accepted,failures}));if(failures.length)process.exitCode=1;
