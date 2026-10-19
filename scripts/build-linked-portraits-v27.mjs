import fs from 'node:fs/promises';
const anchors=JSON.parse(await fs.readFile(new URL('../reference-art/linked-v27/anchor-families.json',import.meta.url),'utf8'));
const atlases=[],families=[];
for(const group of anchors.families){
 for(const half of [0,1]){const id=group.ancestry+'-linked-ages-'+String(half).padStart(2,'0'),r=JSON.parse(await fs.readFile('reference-art/linked-v27/'+id+'.registration.json','utf8'));const fsForHalf=group.families.filter(f=>f.supplementHalf===half);
  atlases.push({id,ancestry:group.ancestry,src:'./art/presets/'+id+'.avif',width:r.width,height:r.height,cells:r.cells.map(c=>c.source),entries:fsForHalf.flatMap(f=>Object.entries(f.stageCells).map(([stage,cell])=>({cell,stage,presentation:f.presentation,complexion:f.complexion,morphology:f.morphology,furTone:f.furTone,speciesFamily:f.speciesFamily,hairTone:stage==='elder'?'grey':f.hairTone,archetype:stage==='elder'?'elder':'young',familyId:f.familyId}))) });
 }
 for(const f of group.families){const id=group.ancestry+'-linked-ages-'+String(f.supplementHalf).padStart(2,'0');families.push({id:f.familyId,ancestry:group.ancestry,adultKey:f.adultKey,adultPreset:f.adultPreset,presentation:f.presentation,heritage:f.heritage,compatibleHeritages:f.compatibleHeritages,hairTone:f.hairTone,complexion:f.complexion,morphology:f.morphology,furTone:f.furTone,speciesFamily:f.speciesFamily,archetype:f.archetype,half:f.supplementHalf,localFamilyIndex:Math.floor(f.stageCells.infant/8)*2+(f.stageCells.infant%8>=4?1:0),selections:{adult:f.adultKey,...Object.fromEntries(Object.entries(f.stageCells).map(([stage,cell])=>[stage,id+':'+String(cell).padStart(2,'0')]))}});}
}
await fs.writeFile('dist/js/linked-portraits-v27.js','// Curated complete five-age identity families; no parts or morphing.\nexport const LINKED_AGE_ATLASES_V27 = '+JSON.stringify(atlases,null,2)+';\nexport const LINKED_PORTRAIT_FAMILIES_V27 = '+JSON.stringify(families,null,2)+';\n');
console.log(JSON.stringify({families:families.length,newPaintings:atlases.length*64}));
