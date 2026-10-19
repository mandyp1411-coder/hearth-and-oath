import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileAgedPortraitCatalog, nativeAvifDimensions } from './build-aged-portraits-v57.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stages=['mature','older','elder'];
const ageFor={infant:1,child:6,adolescent:14,adult:27,mature:45,older:58,elder:72};
const expectedFull={adultAtlases:130,adultAnchors:8224,jobs:390,paintings:24672,modernAdultFamilies:312};
const reviewChecks=['grid8x8','identityPreserved','ageAppropriate','presentationPreserved','phenotypePreserved'];
const keyFor=(id,cell)=>`${id}:${String(cell).padStart(2,'0')}`;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireThat=(condition,message)=>{if(!condition)throw Error(message);};
const known=value=>value&&!['unknown','uncertain'].includes(value);

function samePhenotype(adult,painting,label){
  requireThat(painting?.ancestry===adult.ancestry&&painting.presentation===adult.presentation,`${label}: ancestry or presentation changed`);
  if(['human','elf'].includes(adult.ancestry)&&known(adult.complexion))requireThat(painting.complexion===adult.complexion,`${label}: complexion changed`);
  if(adult.ancestry==='beastfolk')for(const field of ['morphology','furTone','speciesFamily'])if(known(adult[field]))requireThat(painting[field]===adult[field],`${label}: ${field} changed`);
}

/** Final release check only. It reads assets and exercises the shipped runtime; it writes no files. */
export async function verifyAgedPortraitCoverage({inventory,queue,receipts,atlases,counterparts,runtime,heritages,readAsset,expected=expectedFull}){
  const {PORTRAIT_LIBRARY:library,PORTRAIT_FAMILIES:families,portraitEntry,selectedPortraitArt,selectPortrait}=runtime;
  const {availableHeritages,heritageAllowsPortrait}=heritages;
  const sourceAtlases=inventory.atlases,jobs=queue.jobs;
  requireThat(Array.isArray(sourceAtlases)&&sourceAtlases.length===expected.adultAtlases,`Expected ${expected.adultAtlases} inventoried adult atlases`);
  requireThat(Array.isArray(jobs)&&jobs.length===expected.jobs,`Expected ${expected.jobs} generation jobs`);
  requireThat(Array.isArray(receipts)&&receipts.length===expected.jobs&&receipts.every(r=>r.status==='accepted'),`Expected ${expected.jobs} accepted registration receipts`);
  const anchors=new Map(),sources=new Map(),jobsById=new Map(),receiptsById=new Map();
  for(const source of sourceAtlases){
    requireThat(!sources.has(source.id),`Duplicate adult source ${source.id}`);sources.set(source.id,source);
    for(const entry of source.entries){
      const adult=portraitEntry(entry.adultKey);
      requireThat(adult?.stage==='adult'&&!adult.modern&&!anchors.has(adult.key)&&adult.key===keyFor(source.id,entry.cell),`Invalid inventoried adult ${entry.adultKey}`);
      samePhenotype({...entry,ancestry:source.ancestry},adult,entry.adultKey);
      anchors.set(adult.key,adult);
    }
  }
  requireThat(anchors.size===expected.adultAnchors,`Expected ${expected.adultAnchors} adult identity anchors`);
  const legacyAdults=library.filter(p=>p.stage==='adult'&&!p.modern);
  requireThat(legacyAdults.length===anchors.size&&legacyAdults.every(p=>anchors.has(p.key)),'Adult inventory omits a base or supplement identity');
  for(const job of jobs){
    requireThat(job.status==='accepted'&&!jobsById.has(job.id)&&sources.has(job.adultAtlasId)&&stages.includes(job.stage),`Unaccepted or invalid generation job ${job.id}`);
    jobsById.set(job.id,job);
  }
  for(const receipt of receipts){
    const job=jobsById.get(receipt.id),source=sources.get(receipt.adultAtlasId);
    requireThat(job&&source&&!receiptsById.has(receipt.id),`Unexpected or repeated receipt ${receipt.id}`);
    for(const field of ['adultAtlasId','ancestry','stage','target'])requireThat(receipt[field]===job[field],`${receipt.id}: job ${field} differs`);
    requireThat(receipt.rows===source.rows&&receipt.columns===source.columns&&receipt.entries.length===source.entries.length&&receipt.entries.length===job.expectedPortraits,`${receipt.id}: source layout or registered population differs`);
    requireThat(reviewChecks.every(field=>receipt.visualReview?.[field]===true)&&receipt.visualReview.reviewer&&!Number.isNaN(Date.parse(receipt.visualReview.reviewedAt)),`${receipt.id}: incomplete visual acceptance`);
    requireThat(receipt.provenance?.generator==='built-in image_gen'&&receipt.provenance.prompt?.trim()&&receipt.provenance.referenceSha256===source.referenceSha256&&job.referenceSha256===source.referenceSha256,`${receipt.id}: generation provenance differs from its adult source`);
    const sourceCells=new Map(source.entries.map(e=>[e.cell,e.adultKey]));
    for(const entry of receipt.entries)requireThat(sourceCells.get(entry.cell)===entry.adultKey,`${receipt.id}: source cell changed identity`);
    receiptsById.set(receipt.id,receipt);
  }
  const assets=new Map();
  const assetBytes=target=>{
    target=target.replace(/^\.\//,'');
    if(!assets.has(target))assets.set(target,Promise.resolve(readAsset(target)));
    return assets.get(target);
  };
  const compiled=await compileAgedPortraitCatalog(receipts,{adultEntries:library,readAsset:assetBytes});
  // Source serialization omits optional own-properties whose value is undefined.
  // Compare the exported JSON value, including when packed source expands it.
  requireThat(isDeepStrictEqual(JSON.parse(JSON.stringify(compiled.atlases)),JSON.parse(JSON.stringify(atlases))),'Shipped age atlas catalogue differs from accepted receipts');
  requireThat(isDeepStrictEqual(compiled.counterparts,counterparts),'Shipped counterpart mapping differs from accepted receipts');
  const paintings=atlases.reduce((n,a)=>n+a.entries.length,0);
  requireThat(paintings===expected.paintings&&Object.keys(counterparts).length===anchors.size,`Expected ${expected.paintings} registered adult-age paintings with every adult mapped`);
  for(const source of sourceAtlases){
    requireThat(/^dist\//.test(source.referencePath),`${source.id}: unexpected adult reference location`);
    requireThat(digest(await assetBytes(source.referencePath.slice(5)))===source.referenceSha256,`${source.id}: adult source hash changed`);
  }
  const dimensions=new Map();
  async function nativeCrop(p){
    requireThat(p&&p.src&&p.sourceRect,`Missing native portrait ${p?.key}`);
    const src=p.src.replace(/^\.\//,'');
    if(!dimensions.has(src))dimensions.set(src,nativeAvifDimensions(await assetBytes(src)));
    requireThat(dimensions.get(src).some(d=>d.width===p.width&&d.height===p.height),`${p.key}: native dimensions differ`);
    const {x,y,width,height}=p.sourceRect;
    requireThat([x,y,width,height].every(Number.isFinite)&&x>=0&&y>=0&&width>0&&height>0&&x+width<=100.00001&&y+height<=100.00001&&width*p.width/100>=32&&height*p.height/100>=32,`${p.key}: invalid native crop`);
  }
  const byAncestry={},byPresentation={};
  for(const adult of anchors.values()){
    (byAncestry[adult.ancestry]??={adultAnchors:0,mature:0,older:0,elder:0,modernAdultFamilies:0}).adultAnchors++;
    (byPresentation[adult.presentation]??={adultAnchors:0,mature:0,older:0,elder:0}).adultAnchors++;
  }
  for(const atlas of atlases)for(const entry of atlas.entries){
    const adult=anchors.get(entry.adultKey),p=portraitEntry(keyFor(atlas.id,entry.cell));
    requireThat(adult&&p?.adultKey===adult.key&&p.stage===atlas.stage&&counterparts[adult.key]?.[p.stage]===p.key,`${atlas.id}:${entry.cell}: registered runtime identity differs`);
    samePhenotype(adult,p,p.key);
    requireThat(isDeepStrictEqual(Object.values(p.sourceRect),atlas.cells[entry.cell]),`${p.key}: runtime crop differs from accepted painting`);
    await nativeCrop(p);
    byAncestry[adult.ancestry][p.stage]++;byPresentation[adult.presentation][p.stage]++;
  }
  const familyByAdult=new Map(families.map(f=>[f.selections.adult,f]));
  const candidates=new Map();
  let runtimeAgeChecks=0,legacyPresetChecks=0,preservedDirectLinks=0,explicitSelectionChecks=0,adultReselectionChecks=0,modernAgeVariantChecks=0;
  function appearanceFor(adult){
    const heritage=availableHeritages(adult.ancestry).find(h=>heritageAllowsPortrait(h,adult));
    requireThat(heritage,`${adult.key}: no compatible heritage`);
    return Object.freeze({ancestry:adult.ancestry,portraitPresentation:adult.presentation,heritage:heritage.id,heritageVersion:1,preset:adult.index>=0?'p'+String(adult.index).padStart(4,'0'):'legacy',hair:adult.hairTone==='light'?'gold':'black',portraitSelections:Object.freeze({adult:adult.key})});
  }
  function verifyExplicit(adult,appearance,expectedKeys){
    const heritage=availableHeritages(adult.ancestry).find(h=>h.id===appearance.heritage),saved={adult:adult.key};
    for(const stage of stages){
      const group=[adult.ancestry,adult.presentation,heritage.id,stage].join(':');
      if(!candidates.has(group))candidates.set(group,library.filter(p=>p.stage===stage&&p.ancestry===adult.ancestry&&p.presentation===adult.presentation&&heritageAllowsPortrait(heritage,p)));
      const pool=candidates.get(group),choice=pool.find(p=>p.key!==expectedKeys[stage])||pool[0];
      requireThat(choice,`${adult.key}: no saved ${stage} selection fixture`);saved[stage]=choice.key;
    }
    const explicit=Object.freeze({...appearance,portraitSelections:Object.freeze(saved)});
    for(const stage of stages){
      requireThat(selectedPortraitArt(explicit,explicit.preset,{age:ageFor[stage]})?.key===saved[stage],`${adult.key}: explicit saved ${stage} selection was replaced`);explicitSelectionChecks++;
    }
    const reselected=selectPortrait(explicit,adult.key,{age:27});
    requireThat(reselected&&stages.every(stage=>reselected.portraitSelections[stage]===saved[stage]),`${adult.key}: adult reselection replaced an explicit later-age choice`);adultReselectionChecks++;
  }
  for(const adult of anchors.values()){
    const appearance=appearanceFor(adult),family=familyByAdult.get(adult.key),expectedKeys={};
    for(const stage of stages){
      const key=counterparts[adult.key]?.[stage],mapped=portraitEntry(key),direct=portraitEntry(family?.selections[stage]);
      requireThat(mapped?.adultKey===adult.key&&mapped.stage===stage,`${adult.key}: missing exact ${stage} counterpart`);
      const heritage=availableHeritages(adult.ancestry).find(h=>h.id===appearance.heritage);
      expectedKeys[stage]=direct&&heritageAllowsPortrait(heritage,direct)?direct.key:key;
      const actual=selectedPortraitArt(appearance,appearance.preset,{age:ageFor[stage]});
      requireThat(actual?.key===expectedKeys[stage],`${adult.key}: age ${ageFor[stage]} resolved to unrelated fallback ${actual?.key}`);
      samePhenotype(adult,actual,`${adult.key} at ${ageFor[stage]}`);runtimeAgeChecks++;
      if(expectedKeys[stage]!==key){await nativeCrop(actual);preservedDirectLinks++;}
      if(adult.index>=0){
        const implicit=Object.freeze({...appearance,portraitSelections:Object.freeze({})});
        requireThat(selectedPortraitArt(implicit,implicit.preset,{age:ageFor[stage]})?.key===expectedKeys[stage],`${adult.key}: legacy preset-only save lost its exact ${stage} identity`);legacyPresetChecks++;
      }
    }
    verifyExplicit(adult,appearance,expectedKeys);
  }
  const modern=families.filter(f=>f.modern),modernAdults=library.filter(p=>p.stage==='adult'&&p.modern);
  requireThat(modern.length===expected.modernAdultFamilies&&modernAdults.length===modern.length&&new Set(modern.map(f=>f.selections.adult)).size===modern.length,`Expected ${expected.modernAdultFamilies} distinct existing modern adult families`);
  for(const family of modern){
    const adult=portraitEntry(family.selections.adult),appearance=appearanceFor(adult);
    for(const stage of stages)requireThat(family.selections[stage],`${family.id}: existing ${stage} variant is missing`);
    for(const [stage,key]of Object.entries(family.selections)){
      const p=portraitEntry(key);requireThat(p?.stage===stage,`${family.id}: invalid existing ${stage} variant`);
      samePhenotype(adult,p,`${family.id} ${stage}`);await nativeCrop(p);
      requireThat(selectedPortraitArt(appearance,appearance.preset,{age:ageFor[stage]})?.key===key,`${family.id}: existing ${stage} identity changed`);modernAgeVariantChecks++;
    }
    (byAncestry[adult.ancestry]??={adultAnchors:0,mature:0,older:0,elder:0,modernAdultFamilies:0}).modernAdultFamilies++;
    verifyExplicit(adult,appearance,family.selections);
  }
  return {status:'passed',acceptedJobs:receipts.length,registeredAgePaintings:paintings,adultAnchors:anchors.size,modernAdultFamilies:modern.length,nativeAssetsVerified:assets.size,runtimeAgeChecks,legacyPresetChecks,preservedDirectLinks,modernAgeVariantChecks,explicitSelectionChecks,adultReselectionChecks,byAncestry,byPresentation};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const json=async name=>JSON.parse(await readFile(path.join(root,'docs/art-v57',name),'utf8'));
    const [inventory,queue,receipts,runtime,heritages,aged]=await Promise.all([json('adult-inventory.json'),json('generation-queue.json'),json('aged-registration.json'),import('../dist/js/portrait-library.js'),import('../dist/js/heritages.js'),import('../dist/js/aged-portraits-v57.js')]);
    console.log(JSON.stringify(await verifyAgedPortraitCoverage({inventory,queue,receipts,runtime,heritages,atlases:aged.AGED_PORTRAIT_ATLASES_V57,counterparts:aged.AGED_PORTRAIT_COUNTERPARTS_V57,readAsset:target=>readFile(path.join(root,'dist',target))})));
  }catch(error){console.log(JSON.stringify({status:'failed',error:error.message}));process.exitCode=1;}
}
