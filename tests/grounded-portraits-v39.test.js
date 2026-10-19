import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GROUNDED_AGE_ATLASES_V39, GROUNDED_PORTRAIT_FAMILIES_V39 } from '../dist/js/grounded-portraits-v39.js';
import { LIFECYCLE_PORTRAIT_FAMILIES_V40 } from '../dist/js/lifecycle-portraits-v40.js';
import { LINKED_PORTRAIT_FAMILIES_V27 } from '../dist/js/linked-portraits-v27.js';
import { LINKED_CURSE_ATLASES_V27 } from '../dist/js/linked-curse-art-v27.js';
import { CURSE_STYLE_OVERRIDES_V39 } from '../dist/js/curse-style-v39.js';
import { PORTRAIT_RACES, portraitStage, portraitPreset, presetPresentation } from '../dist/js/portrait-catalog.js';
import { PORTRAIT_LIBRARY, PORTRAIT_STAGES, PORTRAIT_FAMILIES, portraitEntry, portraitPhenotype, linkedPortraitFamily, modernPortraitFamily, legacyCursePortraitFamily, selectPortrait, selectedPortraitArt, assignHeritage, availablePortraits, exactAdultAgePortrait } from '../dist/js/portrait-library.js';
import { normalizeAppearance, isCanonicalAppearance, portraitLayers, portraitComponents, renderAvatar } from '../dist/js/avatar.js';
import { HERITAGES, availableHeritages, heritageAllowsPortrait } from '../dist/js/heritages.js';
import { generateCharacter } from '../dist/js/characters.js';
import { defaultCreatorDraft, captureCreatorDraft, selectCreatorPortrait, randomizeCreatorDraft } from '../dist/js/creator.js';
import { portraitGalleryPage, renderPortraitGallery } from '../dist/js/portrait-gallery.js';
import { linkedTransformationPortrait } from '../dist/js/linked-transformations-v27.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { validateSave, migrateSave, selectCharacterPortrait } from '../dist/js/engine.js';

const ageByStage={infant:0,child:7,adolescent:15,adult:25,mature:45,older:58,elder:72};
const appearanceForFamily=family=>normalizeAppearance({ancestry:family.ancestry,heritage:family.compatibleHeritages[0],heritageVersion:1,portraitPresentation:family.presentation,preset:family.adultPreset||'legacy',hair:family.hairTone==='light'?'gold':'black',portraitSelections:{...family.selections}});
const appearanceForEntry=entry=>{
  const heritage=availableHeritages(entry.ancestry).find(h=>heritageAllowsPortrait(h,entry));
  return normalizeAppearance({ancestry:entry.ancestry,heritage:heritage.id,heritageVersion:1,portraitPresentation:entry.presentation,preset:entry.index>=0?'p'+String(entry.index).padStart(4,'0'):'legacy',hair:entry.hairTone==='light'?'gold':'black',portraitSelections:{adult:entry.key}});
};
function assertPhenotype(actual,anchor){
  assert.equal(actual.ancestry,anchor.ancestry);assert.equal(actual.presentation,anchor.presentation);
  if(['human','elf'].includes(anchor.ancestry))assert.equal(actual.complexion,anchor.complexion);
  if(anchor.ancestry==='beastfolk'){
    assert.equal(actual.morphology,anchor.morphology);assert.equal(actual.furTone,anchor.furTone);
    if(anchor.morphology==='other')assert.equal(actual.speciesFamily,anchor.speciesFamily);
  }
}

test('adult faces age at 40 and 55 while all legacy preset atlas lookups remain valid',()=>{
  assert.deepEqual([0,2,3,9,10,17,18,39,40,54,55,64,65,80].map(portraitStage),['infant','infant','child','child','adolescent','adolescent','adult','adult','mature','mature','older','older','elder','elder']);
  assert.equal(PORTRAIT_STAGES.length,7);
  for(const ancestry of PORTRAIT_RACES)for(const index of [0,24,48,511,1023])for(const age of [40,54,55,64]){
    const preset='p'+String(index).padStart(4,'0'),adult=portraitPreset(preset,{ancestry,age:25}),aged=portraitPreset(preset,{ancestry,age});
    assert.equal(aged.stage,portraitStage(age));assert.equal(aged.src,adult.src);assert.deepEqual(aged.sourceRect,adult.sourceRect);assert.equal(aged.presentation,presetPresentation(index));
    if(ancestry==='beastfolk')assert.equal(portraitPreset(preset,{ancestry,age,morphology:'canine'}).morphology,'canine');
  }
});

test('the additive library contains 216 whole four-age identities and 878 portraits with registered native geometry',()=>{
  assert.equal(GROUNDED_AGE_ATLASES_V39.length,25);assert.equal(GROUNDED_PORTRAIT_FAMILIES_V39.length,216);
  assert.equal(PORTRAIT_FAMILIES.length,472+LIFECYCLE_PORTRAIT_FAMILIES_V40.length);assert.equal(LINKED_PORTRAIT_FAMILIES_V27.length,256);
  const shapes=GROUNDED_AGE_ATLASES_V39.reduce((counts,atlas)=>{const shape=atlas.columns+'x'+atlas.rows;counts[shape]=(counts[shape]||0)+1;return counts;},{});
  assert.deepEqual(shapes,{'6x8':11,'6x7':7,'4x2':7});
  const oldKeys=new Set(GROUNDED_AGE_ATLASES_V39.flatMap(a=>a.entries.map(e=>a.id+':'+String(e.cell).padStart(2,'0'))));const modern=PORTRAIT_LIBRARY.filter(p=>oldKeys.has(p.key));assert.equal(modern.length,878);assert.equal(new Set(modern.map(p=>p.key)).size,878);
  for(const family of GROUNDED_PORTRAIT_FAMILIES_V39)for(const [stage,key] of Object.entries(family.selections)){
    const entry=portraitEntry(key),appearance=appearanceForFamily(family),person={appearance},age=ageByStage[stage];
    const atlas=GROUNDED_AGE_ATLASES_V39.find(a=>a.id===key.split(':')[0]);
    assert.equal(entry.index,-1);assert.equal(entry.stage,stage);assert.equal(entry.columns,atlas.columns);assert.equal(entry.rows,atlas.rows);assert.ok(entry.modern);
    assert.ok(isCanonicalAppearance(appearance));assert.equal(portraitLayers(person,{age}).preset.key,key);
    const component=portraitComponents(person,{age})[0];assert.equal(component.columns,atlas.columns);assert.equal(component.rows,atlas.rows);assert.deepEqual(component.sourceRect,entry.sourceRect);
    const rect=entry.sourceRect;assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=100&&rect.y+rect.height<=100);
    assert.equal((renderAvatar(person,{age}).match(/<img /g)||[]).length,1);
  }
});

test('all 14 standalone elder portraits can be selected and render their exact registered native crops',()=>{
  const linkedKeys=new Set(GROUNDED_PORTRAIT_FAMILIES_V39.flatMap(f=>Object.values(f.selections))),extras=PORTRAIT_LIBRARY.filter(p=>GROUNDED_AGE_ATLASES_V39.some(a=>p.key.startsWith(a.id+':'))&&!linkedKeys.has(p.key));
  assert.equal(linkedKeys.size,864);assert.equal(extras.length,14);
  for(const entry of extras){
    const heritage=availableHeritages(entry.ancestry).find(h=>heritageAllowsPortrait(h,entry));assert.ok(heritage,entry.key);
    const appearance=normalizeAppearance({ancestry:entry.ancestry,heritage:heritage.id,heritageVersion:1,portraitPresentation:entry.presentation,preset:'legacy'});
    assert.equal(entry.stage,'elder');assert.equal(entry.columns,4);assert.equal(entry.rows,2);assert.equal(entry.index,-1);assert.equal(selectPortrait(appearance,entry.key,{age:64}),null);
    const selected=selectPortrait(appearance,entry.key,{age:72});assert.ok(selected);assert.ok(isCanonicalAppearance(selected));assert.equal(selected.portraitSelections.elder,entry.key);
    const person={appearance:selected},actual=portraitLayers(person,{age:72}).preset,atlas=GROUNDED_AGE_ATLASES_V39.find(a=>a.id===entry.key.split(':')[0]),rect=atlas.cells[entry.cell];
    assert.equal(actual.key,entry.key);assert.equal(actual.src,atlas.src);assert.equal(actual.width,atlas.width);assert.equal(actual.height,atlas.height);assert.deepEqual(actual.sourceRect,{x:rect[0],y:rect[1],width:rect[2],height:rect[3]});
    const component=portraitComponents(person,{age:72})[0];assert.equal(component.columns,4);assert.equal(component.rows,2);assert.deepEqual(component.sourceRect,actual.sourceRect);assert.equal((renderAvatar(person,{age:72}).match(/<img /g)||[]).length,1);
  }
});

test('all 44 known legacy Beastfolk coats gain stable mature and older illustrations without rewriting choices',()=>{
  const cohorts=new Set();let checked=0;
  for(const entry of PORTRAIT_LIBRARY.filter(p=>!p.modern&&p.stage==='adult'&&p.ancestry==='beastfolk'&&p.morphology!=='unknown'&&['dark','light','mixed'].includes(p.furTone))){
    const appearance=appearanceForEntry(entry),before=structuredClone(appearance),family=modernPortraitFamily(appearance);
    cohorts.add(JSON.stringify([entry.morphology,entry.presentation,entry.furTone,entry.speciesFamily??null]));
    assert.ok(family,entry.key);assertPhenotype(family,entry);
    for(const [stage,age] of [['mature',45],['older',58]]){
      const actual=selectedPortraitArt(appearance,appearance.preset,{age}),exact=exactAdultAgePortrait(appearance,appearance.preset,{stage});assert.equal(actual.key,exact?.key||family.selections[stage]);assertPhenotype(actual,entry);
      assert.equal(portraitLayers({appearance:JSON.parse(JSON.stringify(appearance))},{age}).preset.key,actual.key);
    }
    assert.deepEqual(appearance,before);checked++;
  }
  assert.equal(cohorts.size,44);assert.ok(checked>=1000);
});

test('every old adult in the seven other ancestries gains age art without changing heritage or complexion',()=>{
  const checked={};
  for(const entry of PORTRAIT_LIBRARY.filter(p=>!p.modern&&p.stage==='adult'&&p.ancestry!=='beastfolk')){
    const appearance=appearanceForEntry(entry),before=structuredClone(appearance),heritage=HERITAGES.find(h=>h.ancestry===appearance.ancestry&&h.id===appearance.heritage);
    for(const [stage,age] of [['mature',45],['older',58]]){
      const actual=selectedPortraitArt(appearance,appearance.preset,{age});
      assert.ok(actual.modern,entry.key);assert.equal(actual.stage,stage);assert.notEqual(actual.key,entry.key);assert.equal(actual.ancestry,entry.ancestry);assert.equal(actual.presentation,entry.presentation);assert.ok(heritageAllowsPortrait(heritage,actual));
      if(['human','elf'].includes(entry.ancestry)&&entry.complexion&&entry.complexion!=='unknown')assert.equal(actual.complexion,entry.complexion);
    }
    assert.deepEqual(appearance,before);checked[entry.ancestry]=(checked[entry.ancestry]||0)+1;
  }
  assert.deepEqual(checked,{human:1040,elf:1040,dwarf:1024,halfling:1024,orc:1024,goblin:1024,tiefling:1024});
});

test('legacy linked identities retain their selected adult and elder while gaining one compatible age bridge',()=>{
  for(const family of LINKED_PORTRAIT_FAMILIES_V27){
    const appearance=appearanceForFamily(family),before=structuredClone(appearance),modern=modernPortraitFamily(appearance);
    assert.ok(modern,family.id);assert.equal(linkedPortraitFamily(appearance).id,family.id);
    assert.equal(selectedPortraitArt(appearance,appearance.preset,{age:25}).key,family.selections.adult);
    assert.equal(selectedPortraitArt(appearance,appearance.preset,{age:72}).key,family.selections.elder);
    for(const stage of ['mature','older'])assert.equal(selectedPortraitArt(appearance,appearance.preset,{age:ageByStage[stage]}).key,exactAdultAgePortrait(appearance,appearance.preset,{stage})?.key||modern.selections[stage]);
    assert.deepEqual(appearance,before);
  }
});

test('fresh NPCs preserve heritage and observed phenotype across seven saved stages',()=>{
  const sources=new Set();
  for(const heritage of HERITAGES)for(const pronouns of ['he/him','she/her','they/them']){
    const person=generateCharacter('grounded-lifecycle',heritage.ancestry+':'+heritage.id+':'+pronouns,{ancestry:heritage.ancestry,heritage:heritage.id,pronouns,age:0}),appearance=person.appearance,anchor=portraitEntry(appearance.portraitSelections.adult);
    sources.add(anchor.modern?'modern':'legacy');assert.ok(isCanonicalAppearance(appearance));
    assert.deepEqual(Object.keys(appearance.portraitSelections).sort(),Object.keys(ageByStage).sort());
    for(const [stage,age] of Object.entries(ageByStage)){
      const actual=portraitLayers(person,{age}).preset;assert.equal(actual.key,appearance.portraitSelections[stage]);assert.equal(actual.stage,stage);assert.ok(heritageAllowsPortrait(heritage,actual));assertPhenotype(actual,anchor);
    }
    assert.deepEqual(generateCharacter('grounded-lifecycle',heritage.ancestry+':'+heritage.id+':'+pronouns,{ancestry:heritage.ancestry,heritage:heritage.id,pronouns,age:0}),person);
  }
  assert.deepEqual([...sources].sort(),['legacy','modern']);
});

test('choosing a linked later face preserves recorded earlier faces and opens its future age sequence',()=>{
  let appearance=generateCharacter('grounded-past','hero',{ancestry:'human',heritage:'ashlands',pronouns:'he/him'}).appearance;
  const first=GROUNDED_PORTRAIT_FAMILIES_V39.find(f=>f.ancestry==='human'&&f.compatibleHeritages.includes('ashlands')&&f.presentation==='masculine');
  const second=GROUNDED_PORTRAIT_FAMILIES_V39.find(f=>f.ancestry==='human'&&f.compatibleHeritages.includes('ashlands')&&f.presentation==='feminine');
  appearance=selectPortrait(appearance,first.selections.adult,{age:25});const earlier=structuredClone(appearance.portraitSelections);
  appearance=selectPortrait(appearance,second.selections.mature,{age:45});assert.ok(isCanonicalAppearance(appearance));
  for(const stage of ['infant','child','adolescent','adult'])assert.equal(appearance.portraitSelections[stage],earlier[stage]);
  assert.equal(linkedPortraitFamily(appearance).id,first.id);assert.equal(linkedPortraitFamily(appearance,{stage:'mature'}).id,second.id);
  for(const stage of ['mature','older','elder'])assert.equal(portraitLayers({appearance},{age:ageByStage[stage]}).preset.key,second.selections[stage]);
  assert.equal(selectPortrait(appearance,second.selections.mature,{age:25}),null);
  assert.deepEqual(assignHeritage(appearance,'ashlands'),appearance);
});

test('creator fate uses seven-stage modern portraits and preserves selected past ages through form changes',()=>{
  let draft=captureCreatorDraft({ancestry:'elf',identity:'he/him',heritageChoice:'sable_coast',startAge:25},defaultCreatorDraft('grounded-creator'));
  assert.ok(portraitEntry(draft.appearance.portraitSelections.adult).modern);assert.equal(Object.keys(draft.appearance.portraitSelections).length,7);
  const adult=draft.appearance.portraitSelections.adult,name=draft.name;
  draft=captureCreatorDraft({startAge:45},draft);const entry=availablePortraits(draft,45,{presentation:'feminine'})[0];draft=selectCreatorPortrait(draft,entry.key);
  assert.equal(draft.appearance.portraitSelections.adult,adult);assert.equal(portraitLayers(draft,{age:45}).preset.key,entry.key);assert.equal(draft.pronouns,'he/him');assert.equal(draft.name,name);
  const roll=randomizeCreatorDraft(draft);assert.equal(roll.startAge,45);assert.equal(roll.appearance.ancestry,'elf');assert.equal(roll.appearance.heritage,'sable_coast');assert.equal(Object.keys(roll.appearance.portraitSelections).length,7);assert.ok(portraitEntry(roll.appearance.portraitSelections.adult).modern);
});

test('new age selections survive a real life save, migration and lineage copy without changing pending mechanics',async()=>{
  let state=await createLifeAtAge({...defaultCreatorDraft('grounded-save'),startAge:45,difficulty:'gentle'});assert.ok(validateSave(state));
  const before=structuredClone(state),entry=availablePortraits(state.hero,state.age).at(-1);
  state=selectCharacterPortrait(state,entry.key);assert.ok(validateSave(state));
  for(const key of ['age','day','event','battle','equipment','world','life','family','campaign'])assert.deepEqual(state[key],before[key],key);
  const loaded=migrateSave(JSON.parse(JSON.stringify(state)));assert.ok(loaded&&validateSave(loaded));assert.deepEqual(loaded.hero.appearance,state.hero.appearance);
  assert.equal(portraitLayers(loaded.hero,{age:loaded.age}).preset.key,entry.key);
  assert.deepEqual(loaded.lineage.people.find(p=>p.id===loaded.dynasty.activePersonId).appearance,loaded.hero.appearance);
});

test('old snapshots preserve stored appearance and exact unfinished combat through migration',()=>{
  const states=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states;
  for(const original of Object.values(states)){
    const before=structuredClone(original),loaded=migrateSave(original);assert.ok(loaded&&validateSave(loaded));
    assert.deepEqual(loaded.hero.appearance,original.hero.appearance);assert.deepEqual(loaded.battle,original.battle);assert.deepEqual(original,before);
  }
});

test('modern faces resolve only legacy curse indexes and human-form werewolves use their normal age art',()=>{
  for(const family of GROUNDED_PORTRAIT_FAMILIES_V39){
    const appearance=appearanceForFamily(family),anchor=legacyCursePortraitFamily(appearance),before=structuredClone(appearance);
    if(anchor){assert.ok(LINKED_PORTRAIT_FAMILIES_V27.includes(anchor));assert.ok(!anchor.modern);assertPhenotype(anchor,family);}
    const condition={type:'vampire',curseVersion:1,stage:'changed',form:'composed',hunger:20,humanity:90,apparentAge:45,bloodline:'blackroot'};
    for(const age of [45,58,72]){
      const art=linkedTransformationPortrait({appearance,condition},appearance,age);
      if(anchor){assert.equal(art.familyId,anchor.id);assert.equal(art.stage,'adult');assert.ok(art.cell>=0&&art.cell<64);assert.equal(art.columns,8);}else assert.equal(art,null);
    }
    const person={appearance,condition:{type:'lycanthrope',curseVersion:1,stage:'changed',form:'human'}};
    for(const stage of ['mature','older'])assert.equal(portraitLayers(person,{age:ageByStage[stage]}).preset.key,family.selections[stage]);
    assert.deepEqual(appearance,before);
  }
  for(const family of LINKED_PORTRAIT_FAMILIES_V27){const appearance=appearanceForFamily(family);assert.equal(legacyCursePortraitFamily(appearance).id,family.id);}
});

test('fallback mortal and curse portraits retain all ancestry and presentation choices without rewriting saved appearances',()=>{
  for(const ancestry of PORTRAIT_RACES)for(const presentation of ['masculine','feminine','androgynous']){
    const mismatched=presentation==='androgynous'?'p0000':'p0048';
    for(const preset of ['legacy','p9999',mismatched]){
      const appearance={...normalizeAppearance({ancestry,portraitPresentation:presentation}),preset},before=structuredClone(appearance),mortal=portraitLayers({appearance},{age:35}).preset,anchor=portraitPhenotype(appearance);
      assert.equal(anchor.ancestry,ancestry);assert.equal(anchor.presentation,presentation);assert.equal(mortal.key,anchor.key);
      for(const condition of [{type:'vampire',curseVersion:1,stage:'changed',form:'composed',hunger:20,humanity:90,bloodline:'blackroot'},{type:'lycanthrope',curseVersion:1,stage:'changed',form:'beast'}]){
        const person={appearance,condition},saved=structuredClone(person),art=portraitLayers(person,{age:35}).preset;
        assert.equal(art.ancestry,ancestry);assert.equal(art.presentation,presentation);assert.deepEqual(person,saved);
      }
      assert.equal(portraitLayers({appearance,condition:{type:'lycanthrope',curseVersion:1,stage:'changed',form:'human'}},{age:35}).preset.key,mortal.key);
      assert.deepEqual(appearance,before);
    }
    // A stored face or linked family remains authoritative even when an old presentation field differs.
    const family=LINKED_PORTRAIT_FAMILIES_V27.find(f=>f.ancestry===ancestry&&f.presentation===presentation);
    for(const selections of [{adult:family.selections.adult},{child:family.selections.child}]){
      const appearance={...appearanceForFamily(family),preset:'legacy',portraitPresentation:presentation==='masculine'?'feminine':'masculine',portraitSelections:selections},before=structuredClone(appearance);
      assert.equal(portraitPhenotype(appearance).key,family.selections.adult);assert.equal(portraitLayers({appearance},{age:35}).preset.key,family.selections.adult);assert.equal(legacyCursePortraitFamily(appearance).id,family.id);
      assert.deepEqual(appearance,before);
    }
  }
});

test('faithful curse redraws preserve logical family and form while using their own native geometry',()=>{
  for(const [id,replacement] of Object.entries(CURSE_STYLE_OVERRIDES_V39)){
    const original=LINKED_CURSE_ATLASES_V27.find(atlas=>atlas.id===id),family=LINKED_PORTRAIT_FAMILIES_V27.find(f=>f.ancestry===original.ancestry&&f.half===original.half),appearance=appearanceForFamily(family),age=original.age==='elder'?72:27;
    for(const form of [0,1,2,3]){
      const condition=form===3?{type:'lycanthrope',curseVersion:1,stage:'changed',form:'beast'}:{type:'vampire',curseVersion:1,stage:'changed',form:form===2?'feral':'composed',hunger:[20,65,90][form],humanity:90,apparentAge:age,bloodline:'blackroot'};
      const art=linkedTransformationPortrait({appearance,condition},appearance,age),rect=replacement.cells[art.cell];
      assert.equal(art.key,`curse-linked:${family.id}:${original.age}:${form}`);assert.equal(art.familyId,family.id);assert.equal(art.cell%4,form);assert.equal(art.src,replacement.src);assert.equal(art.width,replacement.width);assert.equal(art.height,replacement.height);
      assert.deepEqual(art.sourceRect,{x:rect[0],y:rect[1],width:rect[2],height:rect[3]});
    }
  }
});

test('curse identity follows a changed current face and a vampire frozen at an earlier apparent age',()=>{
  const masculine=GROUNDED_PORTRAIT_FAMILIES_V39.find(f=>f.ancestry==='human'&&f.presentation==='masculine'&&f.compatibleHeritages.includes('ashlands'));
  const feminine=GROUNDED_PORTRAIT_FAMILIES_V39.find(f=>f.ancestry==='human'&&f.presentation==='feminine'&&f.compatibleHeritages.includes('ashlands'));
  const appearance=selectPortrait(appearanceForFamily(masculine),feminine.selections.mature,{age:45}),condition={type:'vampire',curseVersion:1,stage:'changed',form:'composed',hunger:20,humanity:90,apparentAge:45,bloodline:'blackroot'};
  assert.equal(appearance.portraitSelections.adult,masculine.selections.adult);
  assert.equal(linkedTransformationPortrait({appearance,condition},appearance,72).presentation,'feminine');
  condition.apparentAge=25;assert.equal(linkedTransformationPortrait({appearance,condition},appearance,72).presentation,'masculine');
});

test('the portrait book exposes both new adult aging stages with exact current-stage choices',()=>{
  const person=generateCharacter('grounded-gallery','hero',{ancestry:'human',heritage:'sunlands'});
  for(const age of [45,58]){
    const page=portraitGalleryPage(person,{age,state:{showLocked:true}}),expected=PORTRAIT_LIBRARY.filter(p=>p.ancestry==='human'&&p.stage===portraitStage(age));
    assert.equal(page.total,expected.length);assert.deepEqual(page.rows.map(p=>p.key),expected.slice(0,page.rows.length).map(p=>p.key));
    const shown=[];for(let n=0;n<page.pages;n++)shown.push(...portraitGalleryPage(person,{age,state:{showLocked:true,page:n}}).rows.map(p=>p.key));assert.deepEqual(shown,expected.map(p=>p.key));
    const html=renderPortraitGallery(person,{age,state:{showLocked:true}});assert.match(html,/40–54/);assert.match(html,/55–64/);assert.equal((html.match(/data-op="gallery-preview"/g)||[]).length,page.rows.length);
  }
});
