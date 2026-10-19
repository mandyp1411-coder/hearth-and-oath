import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MATURE_PORTRAIT_ATLASES_V40 } from '../dist/js/mature-portraits-v40.js';
import { LIFECYCLE_PORTRAIT_ATLASES_V40, LIFECYCLE_PORTRAIT_FAMILIES_V40 } from '../dist/js/lifecycle-portraits-v40.js';
import { PORTRAIT_LIBRARY, portraitEntry, selectPortrait, selectedPortraitArt, availablePortraits, assignHeritage, legacyCursePortraitFamily, exactAdultAgePortrait } from '../dist/js/portrait-library.js';
import { normalizeAppearance, isCanonicalAppearance, portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { PORTRAIT_RACES } from '../dist/js/portrait-catalog.js';
import { availableHeritages, heritageAllowsPortrait } from '../dist/js/heritages.js';
import { generateCharacter } from '../dist/js/characters.js';
const ages={infant:1,child:7,adolescent:14,adult:25,mature:45,older:58,elder:72};
const key=(a,e)=>a.id+':'+String(e.cell).padStart(2,'0');
const newAtlases=[...MATURE_PORTRAIT_ATLASES_V40,...LIFECYCLE_PORTRAIT_ATLASES_V40];
const newKeys=new Set(newAtlases.flatMap(a=>a.entries.map(e=>key(a,e))));
const matureKeys=new Set(MATURE_PORTRAIT_ATLASES_V40.flatMap(a=>a.entries.map(e=>key(a,e))));
function appearance(p){const h=availableHeritages(p.ancestry).find(h=>heritageAllowsPortrait(h,p));assert.ok(h,p.key);return normalizeAppearance({ancestry:p.ancestry,heritage:h.id,heritageVersion:1,portraitPresentation:p.presentation,preset:'legacy',hair:p.hairTone==='light'?'gold':'black'});}
function sameCohort(p,f){assert.equal(p.ancestry,f.ancestry);assert.equal(p.presentation,f.presentation);if(['human','elf'].includes(f.ancestry))assert.equal(p.complexion,f.complexion);if(f.ancestry==='beastfolk'){assert.equal(p.morphology,f.morphology);assert.equal(p.furTone,f.furTone);if(f.morphology==='other')assert.equal(p.speciesFamily,f.speciesFamily);}}

test('the expansion adds 512 distinct mature paintings and 96 complete seven-age identities',()=>{
  assert.equal(MATURE_PORTRAIT_ATLASES_V40.length,8);assert.equal(MATURE_PORTRAIT_ATLASES_V40.reduce((n,a)=>n+a.entries.length,0),512);assert.equal(LIFECYCLE_PORTRAIT_FAMILIES_V40.length,96);
  assert.equal(newKeys.size,newAtlases.reduce((n,a)=>n+a.entries.length,0));assert.equal(PORTRAIT_LIBRARY.filter(p=>newKeys.has(p.key)).length,newKeys.size);
  for(const race of PORTRAIT_RACES){assert.equal(MATURE_PORTRAIT_ATLASES_V40.filter(a=>a.ancestry===race).reduce((n,a)=>n+a.entries.length,0),64);assert.equal(LIFECYCLE_PORTRAIT_FAMILIES_V40.filter(f=>f.ancestry===race).length,12);}
  const linked=LIFECYCLE_PORTRAIT_FAMILIES_V40.flatMap(f=>Object.values(f.selections));assert.equal(linked.length,672);assert.equal(new Set(linked).size,672);
});
test('all new registered native rectangles are in bounds and every painting is reachable in its real age and heritage',()=>{
  for(const a of newAtlases){assert.ok(a.width>500&&a.height>500,a.id);assert.ok(readFileSync(new URL('../dist/'+a.src.slice(2),import.meta.url)).length>10000);for(const e of a.entries){const p=portraitEntry(key(a,e));assert.ok(p);assert.ok(p.modern);assert.equal(p.index,-1);const [x,y,w,h]=a.cells[e.cell];assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=100.0001&&y+h<=100.0001,p.key);assert.deepEqual(p.sourceRect,{x,y,width:w,height:h});const base=appearance(p),age=ages[p.stage],selected=selectPortrait(base,p.key,{age});assert.ok(selected,p.key);assert.ok(isCanonicalAppearance(selected));assert.equal(portraitLayers({appearance:selected},{age}).preset.key,p.key);assert.ok(availablePortraits({appearance:base},age,{presentation:p.presentation}).some(r=>r.key===p.key));assert.equal((renderAvatar({appearance:selected},{age}).match(/<img /g)||[]).length,1);}}
});
test('every new lifecycle keeps its exact drawn identity, phenotype and stage at every age boundary',()=>{
  for(const f of LIFECYCLE_PORTRAIT_FAMILIES_V40){assert.ok(f.modern);assert.deepEqual(Object.keys(f.selections).sort(),Object.keys(ages).sort());const a=normalizeAppearance({...appearance(portraitEntry(f.selections.adult)),portraitSelections:{...f.selections}}),saved=structuredClone(a);for(const [stage,age]of Object.entries(ages)){const p=selectedPortraitArt(a,a.preset,{age});assert.equal(p.key,f.selections[stage]);assert.equal(p.stage,stage);sameCohort(p,f);const other=selectPortrait(a,p.key,{age:stage==='elder'?58:72});assert.equal(other,null);}assert.deepEqual(a,saved);}
});
test('selecting a later lifecycle face preserves the earlier recorded faces and saves its actual later ages',()=>{
  for(const race of PORTRAIT_RACES){const choices=LIFECYCLE_PORTRAIT_FAMILIES_V40.filter(f=>f.ancestry===race),pair=choices.flatMap(first=>{const h=availableHeritages(race).find(h=>heritageAllowsPortrait(h,portraitEntry(first.selections.adult))),second=choices.find(f=>f!==first&&heritageAllowsPortrait(h,portraitEntry(f.selections.mature)));return second?[[first,second]]:[];})[0];assert.ok(pair,race);const [first,second]=pair;let a=selectPortrait(appearance(portraitEntry(first.selections.adult)),first.selections.adult,{age:25});const earlier=structuredClone(a.portraitSelections);a=selectPortrait(a,second.selections.mature,{age:45});for(const stage of ['infant','child','adolescent','adult'])assert.equal(a.portraitSelections[stage],earlier[stage]);for(const stage of ['mature','older','elder'])assert.equal(portraitLayers({appearance:JSON.parse(JSON.stringify(a))},{age:ages[stage]}).preset.key,second.selections[stage]);}
});
test('standalone mature choices cover all 44 established Beastfolk coat and species cohorts',()=>{
  const cohort=p=>JSON.stringify([p.presentation,p.morphology,p.furTone,p.morphology==='other'?p.speciesFamily:null]);
  const old=new Set(PORTRAIT_LIBRARY.filter(p=>!p.modern&&p.ancestry==='beastfolk'&&p.stage==='adult'&&p.morphology!=='unknown'&&['dark','light','mixed'].includes(p.furTone)).map(cohort));const added=new Set(PORTRAIT_LIBRARY.filter(p=>matureKeys.has(p.key)&&p.ancestry==='beastfolk').map(cohort));assert.equal(old.size,44);for(const c of old)assert.ok(added.has(c),c);
});
test('new NPCs use expanded lifecycles and exact adult-age paintings, with deterministic saved choices',()=>{
  const full=new Set(LIFECYCLE_PORTRAIT_FAMILIES_V40.map(f=>f.selections.adult)),seenFull=new Set(),seenExact=new Set();
  for(const race of PORTRAIT_RACES)for(let n=0;n<100;n++){const p=generateCharacter('expanded-faces-40',race+n,{ancestry:race,age:45}),a=p.appearance,old=structuredClone(a);if(full.has(a.portraitSelections.adult))seenFull.add(race);const anchor=portraitEntry(a.portraitSelections.adult),mature=portraitEntry(a.portraitSelections.mature);if(mature?.adultKey===anchor.key){seenExact.add(race);assert.equal(mature.key,exactAdultAgePortrait(a,a.preset,{stage:'mature'}).key);}for(const [stage,age]of Object.entries(ages)){const actual=portraitLayers(p,{age}).preset;assert.equal(actual.key,a.portraitSelections[stage]);sameCohort(actual,anchor);}assert.deepEqual(assignHeritage(a,a.heritage),a);assert.deepEqual(a,old);assert.deepEqual(generateCharacter('expanded-faces-40',race+n,{ancestry:race,age:45}),p);}
  assert.deepEqual([...seenFull].sort(),[...PORTRAIT_RACES].sort());assert.deepEqual([...seenExact].sort(),[...PORTRAIT_RACES].sort());
});
test('accepted mature files match the reviewed native asset hash receipts',()=>{
  const rows=JSON.parse(readFileSync(new URL('../docs/art-v40/mature-registration.json',import.meta.url)));assert.equal(rows.length,8);for(const row of rows){const data=readFileSync(new URL('../dist/'+row.target,import.meta.url));assert.equal(data.length,row.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),row.encodedSha256);}
});

test('new lifecycle transformations use separate legacy indexes or the matching native fallback',()=>{
  let linkedCount=0,fallbackCount=0;
  for(const f of LIFECYCLE_PORTRAIT_FAMILIES_V40){
    const a=normalizeAppearance({...appearance(portraitEntry(f.selections.adult)),portraitSelections:{...f.selections}}),before=structuredClone(a),linked=legacyCursePortraitFamily(a,{age:45});
    if(linked){linkedCount++;assert.ok(!linked.modern);assert.ok(Number.isInteger(linked.half)&&Number.isInteger(linked.localFamilyIndex));}else fallbackCount++;
    for(const age of [45,72])for(const condition of [{type:'vampire',curseVersion:1,stage:'changed',form:'composed',hunger:20,humanity:90,apparentAge:age,bloodline:'blackroot'},{type:'lycanthrope',curseVersion:1,stage:'changed',form:'beast'}]){
      const p=portraitLayers({appearance:a,condition},{age}).preset;assert.equal(p.ancestry,f.ancestry);assert.equal(p.presentation,f.presentation);assert.ok(p.src.endsWith('.avif'));assert.ok(readFileSync(new URL('../dist/'+p.src.replace(/^\.\//,''),import.meta.url)).length>10000);
      if(linked)assert.ok(p.key.startsWith('curse-linked:'),f.id);else{assert.ok(p.key.startsWith('curse:'),f.id);if(condition.type==='vampire'&&f.ancestry==='beastfolk')assert.equal(p.family,{bear:'bear',horned:'goat',long_eared:'hare',feline:'feline',canine:'canine',other:'mustelid'}[f.morphology]);}
      const r=p.sourceRect;assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=100.001&&r.y+r.height<=100.001);
    }
    assert.deepEqual(a,before);
  }
  assert.ok(linkedCount>0&&fallbackCount>0);
});

test('recorded v0.34 choices stay stable except implicit fallbacks replaced by an accepted exact age painting',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/portrait-fallback-v034.json',import.meta.url)));assert.equal(fixture.sourceCommit,'0dbd95317f725dd79c1cb194d4c1e5f91edf48c2');assert.equal(fixture.rows.length,72);
  for(const row of fixture.rows){const before=structuredClone(row.appearance);assert.equal(Object.keys(row.selections).length,7);for(const [age,key]of Object.entries(row.selections)){const stage=Number(age)>=65?'elder':Number(age)>=55?'older':Number(age)>=40?'mature':null,exact=stage&&!row.appearance.portraitSelections?.[stage]?exactAdultAgePortrait(row.appearance,row.appearance.preset,{stage}):null;assert.equal(selectedPortraitArt(row.appearance,row.appearance.preset,{age:Number(age)}).key,exact?.key||key);}assert.deepEqual(row.appearance,before);}
});
