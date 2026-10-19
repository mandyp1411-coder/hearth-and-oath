import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compileAgedPortraitCatalog, nativeAvifDimensions } from '../scripts/build-aged-portraits-v57.mjs';
import { AGED_PORTRAIT_ATLASES_V57, AGED_PORTRAIT_COUNTERPARTS_V57 } from '../dist/js/aged-portraits-v57.js';
import { PORTRAIT_LIBRARY, PORTRAIT_FAMILIES, portraitEntry, exactAdultAgePortrait, selectedPortraitArt } from '../dist/js/portrait-library.js';
import { availableHeritages, heritageAllowsPortrait } from '../dist/js/heritages.js';

const stages=['mature','older','elder'],ageFor={mature:45,older:58,elder:72};
const linkedAdults=new Set(PORTRAIT_FAMILIES.map(f=>f.selections.adult));
const anchor=PORTRAIT_LIBRARY.find(p=>p.ancestry==='human'&&p.stage==='adult'&&!p.modern&&!linkedAdults.has(p.key)&&p.complexion==='light');
const olderFamily=PORTRAIT_FAMILIES.find(f=>f.ancestry==='human'&&!f.modern&&f.complexion==='light');
const appearanceFor=p=>({ancestry:p.ancestry,portraitPresentation:p.presentation,heritage:availableHeritages(p.ancestry).find(h=>heritageAllowsPortrait(h,p)).id,heritageVersion:1,preset:p.index>=0?'p'+String(p.index).padStart(4,'0'):'legacy',hair:'black',portraitSelections:{adult:p.key}});

async function compilerFixture(){
  // An existing native asset tests registration mechanics. It is never written
  // to the age catalogue or represented as a newly generated older painting.
  const bytes=await readFile(new URL('../dist/'+anchor.src.slice(2),import.meta.url));
  const {width,height}=nativeAvifDimensions(bytes)[0];
  const receipt={id:'test-native-age-57',adultAtlasId:anchor.key.split(':')[0],ancestry:anchor.ancestry,stage:'mature',src:'./art/presets/test-native-age-57.avif',target:'art/presets/test-native-age-57.avif',width,height,rows:1,columns:1,cells:[[0,0,100,100]],entries:[{cell:0,adultKey:anchor.key,presentation:anchor.presentation,complexion:anchor.complexion,hairTone:anchor.hairTone}],encodedSha256:createHash('sha256').update(bytes).digest('hex'),status:'accepted',visualReview:{fixture:true},provenance:{generator:'test fixture only'}};
  return {bytes,receipt,options:{adultEntries:[anchor],readAsset:async()=>bytes}};
}

test('pending generations never create portrait records or invented adult-age coverage',async()=>{
  const {receipt,options}=await compilerFixture();
  const result=await compileAgedPortraitCatalog([{...receipt,status:'pending-visual-review'}],{...options,readAsset:()=>assert.fail('pending image must not be read')});
  assert.deepEqual(result,{atlases:[],counterparts:{},ignoredReceipts:1});
});

test('accepted registration preserves the exact adult key and observed native rectangle',async()=>{
  const {receipt,options}=await compilerFixture(),result=await compileAgedPortraitCatalog([receipt],options);
  assert.equal(result.atlases.length,1);assert.equal(result.ignoredReceipts,0);
  assert.deepEqual(result.counterparts,{[anchor.key]:{mature:'test-native-age-57:00'}});
  assert.deepEqual(result.atlases[0].cells,receipt.cells);
  assert.equal(result.atlases[0].entries[0].adultKey,anchor.key);
  assert.equal(result.atlases[0].entries[0].stage,'mature');
});

test('accepted age registration rejects altered bytes, false native geometry, repeated identity and phenotype drift',async()=>{
  const {receipt,options}=await compilerFixture();
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,encodedSha256:'0'.repeat(64)}],options),/hash mismatch/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,width:receipt.width+1}],options),/native dimensions mismatch/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,cells:[[99,0,10,100]]}],options),/Out-of-bounds/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,entries:[{...receipt.entries[0],adultKey:'human-adult-99:00'}]}],options),/matching adult identity/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,entries:[{...receipt.entries[0],presentation:anchor.presentation==='feminine'?'masculine':'feminine'}]}],options),/matching adult identity/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,entries:[{...receipt.entries[0],complexion:'deep'}]}],options),/complexion/);
  await assert.rejects(compileAgedPortraitCatalog([{...receipt,visualReview:null}],options),/visual review/);
  await assert.rejects(compileAgedPortraitCatalog([receipt,{...receipt,id:'second-native-age-57',src:'./art/presets/second-native-age-57.avif',target:'art/presets/second-native-age-57.avif'}],options),/Repeated adult age counterpart/);
});

async function runtimeFixture(){
  const anchors=[anchor,portraitEntry(olderFamily.selections.adult)],atlases=[],counterparts={};
  for(const [identity,p]of anchors.entries())for(const stage of stages){
    const id=`test-exact-${identity}-${stage}-57`,key=id+':00';
    atlases.push({id,ancestry:p.ancestry,src:p.src,width:p.width,height:p.height,rows:1,columns:1,cells:[[0,0,100,100]],entries:[{cell:0,adultKey:p.key,stage,presentation:p.presentation,complexion:p.complexion,hairTone:stage==='mature'?p.hairTone:'grey',archetype:p.archetype}]});
    (counterparts[p.key]??={})[stage]=key;
  }
  let source=await readFile(new URL('../dist/js/portrait-library.js',import.meta.url),'utf8');
  source=source.replace(/^import \{ AGED_PORTRAIT_ATLASES_V57, AGED_PORTRAIT_COUNTERPARTS_V57 \} from '.\/aged-portraits-v57.js';$/m,`const AGED_PORTRAIT_ATLASES_V57=${JSON.stringify(atlases)},AGED_PORTRAIT_COUNTERPARTS_V57=${JSON.stringify(counterparts)};`);
  source=source.replace(/from '\.\/([^']+)';/g,(_,name)=>`from '${new URL('../dist/js/'+name,import.meta.url).href}';`);
  const runtime=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  return {runtime,counterparts};
}

test('exact adulthood counterparts switch at 40, 55 and 65 without changing saved identity',async()=>{
  const {runtime,counterparts}=await runtimeFixture(),appearance=appearanceFor(anchor),before=structuredClone(appearance);
  assert.equal(runtime.selectedPortraitArt(appearance,appearance.preset,{age:39}).key,anchor.key);
  for(const [stage,ages]of [['mature',[40,54]],['older',[55,64]],['elder',[65,90]]])for(const age of ages){
    const actual=runtime.selectedPortraitArt(appearance,appearance.preset,{age});
    assert.equal(actual.key,counterparts[anchor.key][stage]);assert.equal(actual.adultKey,anchor.key);assert.equal(actual.stage,stage);
  }
  assert.deepEqual(appearance,before);
  assert.equal(runtime.exactAdultAgePortrait(appearance,appearance.preset,{stage:'child'}),null);
});

test('saved age selections and existing direct elder identities retain precedence',async()=>{
  const {runtime,counterparts}=await runtimeFixture(),appearance=appearanceFor(anchor);
  const saved=PORTRAIT_LIBRARY.find(p=>p.ancestry==='human'&&p.stage==='mature'&&p.complexion==='light');
  appearance.portraitSelections.mature=saved.key;
  assert.equal(runtime.selectedPortraitArt(appearance,appearance.preset,{age:45}).key,saved.key);
  const old=appearanceFor(portraitEntry(olderFamily.selections.adult));
  assert.equal(runtime.selectedPortraitArt(old,old.preset,{age:72}).key,olderFamily.selections.elder);
  assert.notEqual(olderFamily.selections.elder,counterparts[old.portraitSelections.adult].elder);
  const selected=runtime.selectPortrait(old,old.portraitSelections.adult,{age:25});
  assert.equal(selected.portraitSelections.mature,counterparts[old.portraitSelections.adult].mature);
  assert.equal(selected.portraitSelections.older,counterparts[old.portraitSelections.adult].older);
  assert.equal(selected.portraitSelections.elder,olderFamily.selections.elder);
});

test('choosing a registered aged portrait carries later exact ages forward and preserves earlier recorded faces',async()=>{
  const {runtime,counterparts}=await runtimeFixture(),appearance=appearanceFor(portraitEntry(olderFamily.selections.adult));
  const earlier=structuredClone(appearance.portraitSelections),mature=counterparts[anchor.key].mature;
  const selected=runtime.selectPortrait(appearance,mature,{age:45});
  assert.equal(selected.portraitSelections.adult,earlier.adult);
  for(const stage of stages)assert.equal(selected.portraitSelections[stage],counterparts[anchor.key][stage]);
  assert.equal(runtime.selectPortrait(appearance,mature,{age:25}),null);
  assert.deepEqual(appearance.portraitSelections,earlier);
});

test('selecting an adult persists available exact future faces and preserves saved later-age choices',async()=>{
  const {runtime,counterparts}=await runtimeFixture(),appearance=appearanceFor(anchor);
  const selected=runtime.selectPortrait(appearance,anchor.key,{age:25});
  for(const stage of stages)assert.equal(selected.portraitSelections[stage],counterparts[anchor.key][stage]);
  const saved=PORTRAIT_LIBRARY.find(p=>p.ancestry==='human'&&p.stage==='older'&&p.complexion==='light');
  appearance.portraitSelections.older=saved.key;
  assert.equal(runtime.selectPortrait(appearance,anchor.key,{age:25}).portraitSelections.older,saved.key);
  const linked=appearanceFor(portraitEntry(olderFamily.selections.adult));linked.portraitSelections.older=saved.key;
  assert.equal(runtime.selectPortrait(linked,linked.portraitSelections.adult,{age:25}).portraitSelections.older,saved.key);
});

test('each shipped accepted counterpart resolves to its real registered native crop without implying missing stages',()=>{
  const keys=new Set(),mapped=new Set();
  for(const atlas of AGED_PORTRAIT_ATLASES_V57)for(const entry of atlas.entries){
    const key=atlas.id+':'+String(entry.cell).padStart(2,'0'),p=portraitEntry(key),adult=portraitEntry(entry.adultKey);
    assert.ok(p&&adult);assert.equal(p.adultKey,adult.key);assert.equal(p.stage,atlas.stage);assert.equal(p.index,-1);assert.equal(p.modern,true);
    assert.equal(AGED_PORTRAIT_COUNTERPARTS_V57[adult.key][entry.stage],key);
    const actual=exactAdultAgePortrait(appearanceFor(adult),appearanceFor(adult).preset,{stage:entry.stage});
    const existing=PORTRAIT_FAMILIES.find(f=>f.selections.adult===adult.key)?.selections[entry.stage];
    assert.equal(actual.key,existing||key);
    assert.deepEqual(p.sourceRect,Object.fromEntries(['x','y','width','height'].map((name,i)=>[name,atlas.cells[entry.cell][i]])));
    assert.ok(!keys.has(key));keys.add(key);
  }
  for(const [adultKey,ages]of Object.entries(AGED_PORTRAIT_COUNTERPARTS_V57)){
    assert.equal(portraitEntry(adultKey)?.stage,'adult');
    for(const [stage,key]of Object.entries(ages)){assert.ok(stages.includes(stage));assert.ok(keys.has(key));mapped.add(key);}
  }
  assert.equal(mapped.size,keys.size);
});
