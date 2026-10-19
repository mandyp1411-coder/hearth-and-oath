// Ingest completed visual reviews sequentially; generation and reviews happen separately.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const docs=path.join(root,'docs/art-v57'),reviews=path.join(docs,'reviews');
const queue=JSON.parse(await fs.readFile(path.join(docs,'generation-queue.json'),'utf8'));
const prefix=process.argv[2]||'',failures=[];
let ingested=0;
const readJson=async file=>fs.readFile(file,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
for(const job of queue.jobs){
  if(!job.id.startsWith(prefix))continue;
  const existing=await readJson(path.join(docs,'registration',job.id+'.json'));
  if(existing?.status==='accepted'&&existing.encoding?.quality===85&&existing.encoding?.effort===6)continue;
  const reviewPath=path.join(reviews,job.id+'.json'),review=await readJson(reviewPath);
  if(!review)continue;
  const retained=path.join(root,'reference-art/aged-v57/source',job.ancestry,job.id+'.png');
  const metadata=await readJson(path.join(docs,'imagegen-metadata',job.id+'.json'));
  const original=review.imagegenMetadata?.generatedPath||metadata?.sourcePath||retained;
  const source=await fs.access(original).then(()=>original).catch(()=>retained);
  const prompt=path.join(docs,'prompts',job.id+'.txt');
  const promptExists=await fs.access(prompt).then(()=>true).catch(()=>false);
  const args=['scripts/encode-aged-portraits-v57.mjs','--job',job.id,'--source',source,'--review',reviewPath,...(promptExists?['--prompt-file',prompt]:[])];
  const result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  if(result.status!==0){failures.push({id:job.id,error:(result.stderr||result.error?.message||'Encoding failed').trim()});continue;}
  ingested++;console.log(JSON.stringify({id:job.id,status:'accepted'}));
}
for(const script of ['scripts/refresh-aged-portrait-manifest-v57.mjs','scripts/build-aged-portraits-v57.mjs']){
  const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||'Failed '+script);
  console.log(result.stdout.trim());
}
console.log(JSON.stringify({ingested,failures}));
if(failures.length)process.exitCode=1;
