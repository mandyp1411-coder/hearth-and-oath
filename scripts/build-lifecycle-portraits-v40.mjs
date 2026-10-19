import { readFile, writeFile } from 'node:fs/promises';
import { availableHeritages, heritageAllowsPortrait } from '../dist/js/heritages.js';

const root=new URL('../',import.meta.url);
const load=name=>readFile(new URL(name,root),'utf8').then(JSON.parse);
const sources=await load('docs/art-v40/lifecycle-source-inputs.json');
const observations=await load('docs/art-v40/lifecycle-observed-grids.json');
const receipts=await load('docs/art-v40/lifecycle-registration.json');
const ages=[1,7,14,25,45,58,72],stages=['infant','child','adolescent','adult','mature','older','elder'];
const atlases=[],families=[],byId=new Map(),familyById=new Map();
const keyFor=(atlas,cell)=>`${atlas.id}:${String(cell).padStart(2,'0')}`;
const stageFor=age=>stages[ages.indexOf(age)];
for(const src of sources){
  const obs=observations.find(o=>o.id===src.id),receipt=receipts.find(r=>r.id===src.id);
  if(!obs||!receipt)throw Error('Missing native measurement for '+src.id);
  if(obs.columnBoundaries.length!==src.columns+1||obs.rowBoundaries.length!==src.rows+1)throw Error('False grid '+src.id);
  const {width,height}=receipt,inset=obs.insetPx;
  const cells=Array.from({length:src.columns*src.rows},(_,cell)=>{
    const row=Math.floor(cell/src.columns),col=cell%src.columns;
    const x=obs.columnBoundaries[col]+inset,y=obs.rowBoundaries[row]+inset;
    const w=obs.columnBoundaries[col+1]-x-inset,paintedHeight=obs.rowBoundaries[row+1]-y-inset;
    // Some generated final panels include a long torso. The portrait window uses their actual top square, retaining the whole face.
    const h=paintedHeight>w*1.3?w:paintedHeight;
    return [x*100/width,y*100/height,w*100/width,h*100/height];
  });
  const atlas={id:src.id,ancestry:src.ancestry,src:`./art/presets/${src.id}.avif`,width,height,columns:src.columns,rows:src.rows,cells,entries:[]};
  atlases.push(atlas);byId.set(src.id,atlas);
  if(src.role!=='primary')continue;
  for(let identity=0;identity<6;identity++){
    const p=src.identities[identity];
    const family={id:`${src.id.replace('-expansion-','-family-')}-${identity}`,ancestry:src.ancestry,presentation:p.presentation,complexion:p.complexion||'unknown',hairTone:p.hairTone,archetype:['watch','craft','scholar','healer','field','wanderer'][identity],modern:true,lifecycleExpansion:true,adultPreset:null};
    if(src.ancestry==='beastfolk')Object.assign(family,{morphology:p.morphology,furTone:p.furTone,...(p.speciesFamily?{speciesFamily:p.speciesFamily}:{})});
    family.compatibleHeritages=availableHeritages(src.ancestry).filter(h=>heritageAllowsPortrait(h,family)).map(h=>h.id);family.selections={};
    for(let ageIndex=0;ageIndex<src.ages.length;ageIndex++){
      const age=src.ages[ageIndex],cell=src.transposed?identity*src.columns+ageIndex:ageIndex*src.columns+identity;
      if(src.excludedCells.includes(cell))continue;
      const stage=stageFor(age),key=keyFor(atlas,cell);
      family.selections[stage]=key;atlas.entries.push({...family,cell,stage,familyId:family.id,...(age>=58&&src.ancestry!=='beastfolk'?{hairTone:'grey'}:{})});
    }
    families.push(family);familyById.set(src.id+':'+identity,family);
  }
}
function add(srcId,cell,age,primaryId,identity,{select=true}={}){
  if(sources.find(s=>s.id===srcId)?.excludedCells.includes(cell))return;
  const atlas=byId.get(srcId),family=familyById.get(primaryId+':'+identity),stage=stageFor(age);
  if(!atlas||!family)throw Error('Missing repair target '+srcId+' '+primaryId);
  if(atlas.entries.some(e=>e.cell===cell))throw Error('Repeated crop '+srcId+':'+cell);
  atlas.entries.push({...family,cell,stage,familyId:family.id,...(age>=58&&family.ancestry!=='beastfolk'?{hairTone:'grey'}:{})});
  if(select)family.selections[stage]=keyFor(atlas,cell);
}
// Two early generators omitted their last row. These elders are separately painted, never inferred from absent cells.
for(const race of ['elf','goblin']){
  for(let identity=0;identity<6;identity++){
    add(`${race}-lifecycle-repair-40`,6+identity,72,`${race}-lifecycle-expansion-a-40`,identity);
    if(identity!==2)add(`${race}-lifecycle-repair-40`,identity,1,`${race}-lifecycle-expansion-a-40`,identity,{select:race==='goblin'&&identity===5});
  }
}
for(let identity=0;identity<6;identity++)add('halfling-lifecycle-repair-40',identity,1,'halfling-lifecycle-expansion-a-40',identity,{select:identity===2});
for(const race of ['elf','dwarf','goblin']){
  add(`${race}-lifecycle-infants-40`,0,1,`${race}-lifecycle-expansion-a-40`,2);
}
for(let identity=0;identity<6;identity++)add('dwarf-lifecycle-elders-b-40',identity,72,'dwarf-lifecycle-expansion-b-40',identity);
// Native contact sheets identified a long-haired child prompt bias. Those cells are excluded and replaced by actual young faces.
for(const race of ['human','elf','dwarf','halfling','goblin']){
  add(`${race}-lifecycle-young-a2-40`,0,1,`${race}-lifecycle-expansion-a-40`,2);
  add(`${race}-lifecycle-young-a2-40`,1,7,`${race}-lifecycle-expansion-a-40`,2);
}
for(let identity=0;identity<6;identity++)add('human-lifecycle-elders-a-40',identity,72,'human-lifecycle-expansion-a-40',identity);
for(let row=0;row<2;row++)for(let age=0;age<4;age++)add('dwarf-lifecycle-aged-a-40',row*4+age,[25,45,58,72][age],'dwarf-lifecycle-expansion-a-40',[1,4][row]);
for(const race of ['elf','goblin'])add(`${race}-lifecycle-elder-a2-40`,0,72,`${race}-lifecycle-expansion-a-40`,2);
for(const family of families){
  for(const stage of stages)if(!family.selections[stage])throw Error('Missing drawn stage '+family.id+' '+stage);
  if(!family.compatibleHeritages.length)throw Error('Unreachable heritage '+family.id);
}
for(const atlas of atlases)for(const entry of atlas.entries){
  const family=families.find(f=>f.id===entry.familyId);entry.selections={...family.selections};
  const [x,y,w,h]=atlas.cells[entry.cell];if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||x+w>100.00001||y+h>100.00001)throw Error('Invalid cell '+atlas.id+':'+entry.cell);
}
const out='// Complete life sequences; every source rectangle is measured from an actual painted native grid.\n'+
  'export const LIFECYCLE_PORTRAIT_ATLASES_V40 = '+JSON.stringify(atlases,null,2)+';\n'+
  'export const LIFECYCLE_PORTRAIT_FAMILIES_V40 = '+JSON.stringify(families,null,2)+';\n';
await writeFile(new URL('dist/js/lifecycle-portraits-v40.js',root),out);
console.log(JSON.stringify({atlases:atlases.length,families:families.length,paintings:atlases.reduce((n,a)=>n+a.entries.length,0),stages:stages.length}));
