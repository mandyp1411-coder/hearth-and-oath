import fs from 'node:fs/promises';
import { LINKED_PORTRAIT_FAMILIES_V27 } from '../dist/js/linked-portraits-v27.js';
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'],atlases=[];
for(const age of ['adult','elder'])for(const race of races)for(const half of ['00','01']){const id=age==='adult'?`${race}-linked-curses-${half}`:`${race}-linked-elder-curses-${half}`,record=JSON.parse(await fs.readFile('reference-art/linked-v27/'+id+'.registration.json','utf8'));atlases.push({id,age,ancestry:race,half:Number(half),src:'./art/curses/'+id+'.avif',width:record.width,height:record.height,cells:record.cells.map(c=>c.source)});}
await fs.writeFile('dist/js/linked-curse-art-v27.js','// Registered complete paintings. Each16-identity sheet has four full forms per identity.\nexport const LINKED_CURSE_ATLASES_V27 = '+JSON.stringify(atlases,null,2)+';\n');
console.log(JSON.stringify({atlases:atlases.length,paintings:atlases.length*64,identityFamilies:LINKED_PORTRAIT_FAMILIES_V27.length}));
