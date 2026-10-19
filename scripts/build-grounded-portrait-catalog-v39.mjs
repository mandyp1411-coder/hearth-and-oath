import {readFile,writeFile} from 'node:fs/promises';
import {availableHeritages,heritageAllowsPortrait} from '../dist/js/heritages.js';
const read=(name,fallback)=>readFile(new URL(name,import.meta.url),'utf8').then(JSON.parse).catch(()=>fallback);
const receipts=await read('../docs/art-v39/registration.json',[]),observed=await read('../docs/art-v39/observed-grids.json',[]);
const profiles=await read('./grounded-beastfolk-profiles-v39.json',{});
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const stages=['adult','mature','older','elder'],ageStage={25:'adult',45:'mature',58:'older',72:'elder'},atlases=[],families=[];
function atlasFor(id,ancestry,sourceId,columns,rows){
  const obs=observed.find(r=>r.id===sourceId),src=`./art/presets/${id}.avif`,receipt=receipts.find(r=>r.target===src.slice(2));
  const width=receipt?.width||obs?.width||(columns===4?1536:1086),height=receipt?.height||obs?.height||(columns===4?1024:1448);
  const ys=obs?.rowBoundaries||Array.from({length:rows+1},(_,i)=>i*height/rows),xs=obs?.columnBoundaries||Array.from({length:columns+1},(_,i)=>i*width/columns),inset=obs?.recommendedInsetPx||2;
  if(ys.length!==rows+1||xs.length!==columns+1)throw Error('False atlas geometry: '+sourceId);
  const cells=Array.from({length:columns*rows},(_,i)=>{const c=i%columns,r=Math.floor(i/columns),cx=obs?.columnsByRow?.[r]||xs;return[(cx[c]+inset)*100/width,(ys[r]+inset)*100/height,(cx[c+1]-cx[c]-inset*2)*100/width,(ys[r+1]-ys[r]-inset*2)*100/height];});
  return {atlas:{id,ancestry,src,width,height,columns,rows,cells,entries:[]},obs};
}
for(const ancestry of races)for(const sheet of ancestry==='beastfolk'?['a','b','c','d']:['a','b']){
  const sourceId=`${ancestry}-${sheet}`,obs=observed.find(r=>r.id===sourceId),rows=obs?.observedRows||8;
  const {atlas}=atlasFor(`${ancestry}-grounded-ages-${sheet}-39`,ancestry,sourceId,6,rows),sheetFamilies=[];
  for(let identity=0;identity<12;identity++){
    const col=identity%6,block=identity<6?0:1;
    const presentation=sheet==='a'?(block?'feminine':'masculine'):(block?(col<3?'masculine':'feminine'):'androgynous');
    const complexion=block&&sheet==='b'?['light','medium','deep','light','medium','deep'][col]:['light','light','medium','medium','deep','deep'][col];
    const p={...(ancestry==='beastfolk'?profiles[sheet.toUpperCase()][identity]:{presentation,complexion,hairTone:block&&sheet==='b'?'dark':col%2?'light':'dark'})};
    const measured=obs?.identities?.find(p=>p.index===identity);if(measured)for(const key of ['hairTone','complexion','morphology','furTone','speciesFamily'])if(measured[key])p[key]=measured[key];
    if(p.complexion==='dark')p.complexion='deep';
    const family={id:`${ancestry}-grounded-${sheet}-${String(identity).padStart(2,'0')}-39`,ancestry,presentation:p.presentation,complexion:p.complexion||'unknown',hairTone:p.hairTone||(p.furTone==='light'?'light':'dark'),archetype:['watch','craft','scholar','healer','field','wanderer'][col],modern:true,adultPreset:null};
    if(ancestry==='beastfolk')Object.assign(family,{morphology:p.morphology,furTone:p.furTone,...(p.speciesFamily?{speciesFamily:p.speciesFamily}:{})});
    family.compatibleHeritages=availableHeritages(ancestry).filter(h=>heritageAllowsPortrait(h,family)).map(h=>h.id);family.selections={};
    const painted=measured?.cellsByAge||Object.fromEntries([25,45,58,72].map((age,r)=>[age,(block*4+r)*6+col]));
    for(const [age,cell] of Object.entries(painted)){
      const stage=ageStage[age],key=`${atlas.id}:${String(cell).padStart(2,'0')}`;family.selections[stage]=key;
      atlas.entries.push({...family,stage,cell,familyId:family.id});
    }
    families.push(family);sheetFamilies.push(family);
  }
  atlases.push(atlas);
  if(rows===7){
    const {atlas:elder,obs:elderObserved}=atlasFor(`${ancestry}-grounded-elder-${sheet}-39`,ancestry,sourceId+'-elder',4,2);
    for(let cell=0;cell<6;cell++){
      const family=sheetFamilies[obs.elderSupplementIdentityOrder[cell]],key=`${elder.id}:${String(cell).padStart(2,'0')}`;
      family.selections.elder=key;elder.entries.push({...family,stage:'elder',cell,familyId:family.id});
    }
    for(let cell=6;cell<8;cell++){
      const measured=elderObserved?.identities?.find(p=>p.index===cell)||{},complexion=measured.complexion==='dark'?'deep':measured.complexion||'light';
      elder.entries.push({cell,stage:'elder',presentation:cell===6?'masculine':'feminine',complexion,hairTone:'grey',archetype:'elder',modern:true});
    }
    atlases.push(elder);
  }
}
for(const family of families)if(stages.some(stage=>!family.selections[stage]))throw Error('Missing illustrated age for '+family.id);
const source='// Individually illustrated age sequences; native grids are registered as actually painted.\n'+
 'export const GROUNDED_AGE_ATLASES_V39 = '+JSON.stringify(atlases,null,2)+';\n'+
 'export const GROUNDED_PORTRAIT_FAMILIES_V39 = '+JSON.stringify(families,null,2)+';\n';
await writeFile(new URL('../dist/js/grounded-portraits-v39.js',import.meta.url),source);
console.log(`${atlases.length} native atlases; ${families.length} identities; ${atlases.reduce((n,a)=>n+a.entries.length,0)} portraits`);
