// Describe every exact adult-to-older portrait job. This script never edits images.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PORTRAIT_LIBRARY} from '../dist/js/portrait-library.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const docs=path.join(root,'docs/art-v57');
const stages=[{id:'mature',age:45,min:40,max:54},{id:'older',age:58,min:55,max:64},{id:'elder',age:72,min:65,max:null}];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const clean=object=>Object.fromEntries(Object.entries(object).filter(([,value])=>value!==undefined));
const byAtlas=new Map();
for(const p of PORTRAIT_LIBRARY.filter(p=>p.stage==='adult'&&!p.modern)){
  const adultAtlasId=p.key.slice(0,p.key.lastIndexOf(':'));
  let atlas=byAtlas.get(adultAtlasId);
  if(!atlas){
    const referencePath=p.src.replace(/^\.\//,'dist/');
    atlas={id:adultAtlasId,ancestry:p.ancestry,referencePath,width:p.width,height:p.height,columns:p.columns,rows:p.rows,entries:[]};
    if(atlas.columns!==8||atlas.rows!==8)throw Error('Source requires a different measured grid: '+adultAtlasId);
    atlas.referenceSha256=hash(await fs.readFile(path.join(root,referencePath)));
    byAtlas.set(adultAtlasId,atlas);
  }
  atlas.entries.push(clean({cell:p.cell,adultKey:p.key,presentation:p.presentation,complexion:p.complexion,morphology:p.morphology,furTone:p.furTone,speciesFamily:p.speciesFamily,hairTone:p.hairTone,archetype:p.archetype,sourceRect:[p.sourceRect.x,p.sourceRect.y,p.sourceRect.width,p.sourceRect.height]}));
}
const atlases=[...byAtlas.values()].sort((a,b)=>a.id.localeCompare(b.id));
for(const atlas of atlases)atlas.entries.sort((a,b)=>a.cell-b.cell);
const receipts=await fs.readFile(path.join(docs,'aged-registration.json'),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
if(!Array.isArray(receipts))throw Error('aged-registration.json must be an array.');
const existing=new Map(receipts.map(record=>[record.id,record]));
function promptFor(atlas,stage){
  const selected=atlas.entries.map(p=>p.cell+1);
  const all=selected.length===64;
  const ageDetails=stage.id==='mature'?'visibly middle-aged, about 45: natural forehead lines, crow’s feet, subtle nasolabial lines and modest early gray; healthy faces, not elderly':stage.id==='older'?'visibly older, about 58: established wrinkles, slight facial volume loss and neck aging, natural gray streaks or gray hair; clearly older than the 45-year version':'visibly elderly, about 72: deep expressive age lines, thinner or white/gray hair where appropriate, aged eyelids and neck, natural elderly bone and soft tissue changes';
  return `Use case: identity-preserve. Asset type: exact age counterpart atlas for Hearth & Oath.\nInput image 1 is the EDIT TARGET, not merely a style reference: ${atlas.id}, ${atlas.ancestry} ancestry.\nPrimary request: age ${all?'all 64 existing adult people':`ONLY portrait positions ${selected.join(', ')} (positions are 1–64, left to right, top to bottom)`} into ${ageDetails}. ${all?'Keep all 64 people in their original positions.':'Keep the other portrait cells unchanged; they are not registered as adult counterparts.'}\nIdentity invariants: preserve each individual’s recognizable face, nose, eyes, bone structure, complexion, hair texture and hairstyle, facial hair, clothing, accessories, ancestry anatomy, and masculine/feminine/androgynous presentation. Preserve every Beastfolk species, muzzle, ears, horns and coat pattern. Do not substitute different people, change heritage, add beards to androgynous people, or make feminine people masculine. Hair may gray and thin naturally with age.\nStyle invariants: retain the reference’s grounded medieval graphite/charcoal drawing, hatchwork, near-black background, restrained natural expressions, monochrome values and clothing. No beautification, glamour or fantasy glow.\nLayout invariants: exactly 8 COLUMNS × 8 ROWS; 64 complete opaque square portrait panels in the exact same row-major order, thin clean black gutters. Whole head, ears or horns, chin and upper shoulders inside every panel. Keep all gutter lines straight and dark. No text, labels, numbers, headers, logos, added panels, missing cells, duplicated people, or rearrangement. Change age only in the specified adult portraits.`;
}
const jobs=atlases.flatMap(atlas=>stages.map(stage=>{
  const id=`${atlas.id}-${stage.id}-57`,record=existing.get(id);
  return {id,adultAtlasId:atlas.id,ancestry:atlas.ancestry,stage:stage.id,illustratedAge:stage.age,gameAgeRange:{min:stage.min,max:stage.max},referencePath:atlas.referencePath,referenceSha256:atlas.referenceSha256,columns:8,rows:8,expectedPortraits:atlas.entries.length,target:`art/presets/${id}.avif`,status:record?.status==='accepted'?'accepted':record?'pending-visual-review':'missing',prompt:promptFor(atlas,stage)};
}));
const summary={adultAtlases:atlases.length,adultPortraits:atlases.reduce((n,a)=>n+a.entries.length,0),expectedAgeAtlases:jobs.length,expectedAgePortraits:jobs.reduce((n,j)=>n+j.expectedPortraits,0),acceptedAgeAtlases:jobs.filter(j=>j.status==='accepted').length,missingAgeAtlases:jobs.filter(j=>j.status==='missing').length,pendingVisualReviewAtlases:jobs.filter(j=>j.status==='pending-visual-review').length};
await fs.mkdir(docs,{recursive:true});
await fs.writeFile(path.join(docs,'adult-inventory.json'),JSON.stringify({version:57,scope:'Every non-modern adult portrait, including the human and elf light-lifecycle adult supplements.',summary,atlases},null,2)+'\n');
await fs.writeFile(path.join(docs,'generation-queue.json'),JSON.stringify({version:57,generator:'built-in image_gen only; queue describes jobs and does not generate images',summary,stages,jobs},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
