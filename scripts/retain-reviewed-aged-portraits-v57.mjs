// Retain outputs only after a human or agent has supplied a completed visual review.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let input='';for await(const chunk of process.stdin)input+=chunk;
const records=JSON.parse(input),checks=['grid8x8','identityPreserved','ageAppropriate','presentationPreserved','phenotypePreserved'];
if(!Array.isArray(records))throw Error('Expected an array of reviewed outputs on stdin.');
for(const record of records){
  const {id,ancestry,source,prompt,review,referencePaths=[]}=record;
  if(!/^[a-z][a-z0-9-]+-57$/.test(id)||!['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'].includes(ancestry)||typeof prompt!=='string'||!prompt||!review?.reviewer||checks.some(k=>review[k]!==true))throw Error('A complete affirmative visual review and exact prompt are required.');
  const retained=`reference-art/aged-v57/source/${ancestry}/${id}.png`;
  for(const directory of [path.dirname(retained),'docs/art-v57/prompts','docs/art-v57/reviews','docs/art-v57/imagegen-metadata'])await fs.mkdir(path.join(root,directory),{recursive:true});
  await fs.copyFile(source,path.join(root,retained));
  await fs.writeFile(path.join(root,'docs/art-v57/prompts',id+'.txt'),prompt+'\n');
  await fs.writeFile(path.join(root,'docs/art-v57/reviews',id+'.json'),JSON.stringify({...review,reviewedAt:review.reviewedAt||new Date().toISOString()},null,2)+'\n');
  await fs.writeFile(path.join(root,'docs/art-v57/imagegen-metadata',id+'.json'),JSON.stringify({tool:'built-in image_gen',sourcePath:source,retainedSource:retained,referencePaths},null,2)+'\n');
  console.log(id);
}
