import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATURE_PORTRAIT_ATLASES_V40 } from '../dist/js/mature-portraits-v40.js';
import { LIFECYCLE_PORTRAIT_ATLASES_V40 } from '../dist/js/lifecycle-portraits-v40.js';
import { AGED_PORTRAIT_ATLASES_V57 } from '../dist/js/aged-portraits-v57.js';
import { PORTRAIT_LIBRARY, PORTRAIT_STAGES, portraitEntry, portraitIdentity, portraitContext, effectiveHeritage, assignHeritage, selectPortrait, availablePortraits } from '../dist/js/portrait-library.js';
import { availableHeritages, heritageAllowsPortrait } from '../dist/js/heritages.js';
import { PORTRAIT_RACES, portraitPreset } from '../dist/js/portrait-catalog.js';
import { normalizeAppearance, isCanonicalAppearance, portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { portraitGalleryPage, renderPortraitGallery, PORTRAITS_PER_PAGE } from '../dist/js/portrait-gallery.js';
import { defaultCreatorDraft, captureCreatorDraft, selectCreatorPortrait, selectCreatorHeritage, randomizeCreatorDraft, renderCharacterCreator } from '../dist/js/creator.js';
import { createBirthGame, selectCharacterPortrait, declareCharacterHeritage, migrateSave, validateSave } from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { generateCharacter } from '../dist/js/characters.js';
import { loreView } from '../dist/js/lore.js';
import { registerChild } from '../dist/js/lineage.js';

const appearance=(race,id)=>normalizeAppearance(assignHeritage(normalizeAppearance({ancestry:race,preset:'p0048',portraitPresentation:'androgynous'}),id,'heritage-test'));
const stageAge=id=>PORTRAIT_STAGES.find(s=>s.id===id).min;
test('the book exposes every real illustrated cell exactly once, including supplemental Elf ages',()=>{
  const added=[...MATURE_PORTRAIT_ATLASES_V40,...LIFECYCLE_PORTRAIT_ATLASES_V40,...AGED_PORTRAIT_ATLASES_V57],extra=added.reduce((n,a)=>n+a.entries.length,0);
  assert.equal(PORTRAIT_LIBRARY.length,12654+extra);assert.equal(new Set(PORTRAIT_LIBRARY.map(p=>p.key)).size,12654+extra);
  const counts={human:1568,elf:1636,dwarf:1504,halfling:1508,orc:1508,goblin:1504,tiefling:1506,beastfolk:1920};
  for(const race of PORTRAIT_RACES)assert.equal(PORTRAIT_LIBRARY.filter(p=>p.ancestry===race).length,counts[race]+added.filter(a=>a.ancestry===race).reduce((n,a)=>n+a.entries.length,0));
});

test('every heritage, ancestry, age stage and presentation has real available portraits',()=>{
  for(const race of PORTRAIT_RACES)for(const h of availableHeritages(race))for(const stage of PORTRAIT_STAGES){
    const a=appearance(race,h.id),age=stage.min;
    for(const presentation of ['masculine','feminine','androgynous']){
      const pool=availablePortraits({appearance:a},age,{presentation});assert.ok(pool.length,`${race}/${h.id}/${stage.id}/${presentation}`);
      for(const p of pool){assert.equal(p.stage,stage.id);assert.equal(p.ancestry,race);assert.equal(p.presentation,presentation);assert.ok(heritageAllowsPortrait(h,p));}
      const p=pool.at(-1),selected=selectPortrait(a,p.key,{age});assert.ok(isCanonicalAppearance(normalizeAppearance(selected)));
      assert.equal(portraitLayers({appearance:selected},{age}).preset.key,p.key);
    }
  }
});

test('every artwork is reachable through at least one heritage and resolves its exact native crop',()=>{
  for(const p of PORTRAIT_LIBRARY){
    const h=availableHeritages(p.ancestry).find(h=>heritageAllowsPortrait(h,p));assert.ok(h,p.key);
    const a=selectPortrait(appearance(p.ancestry,h.id),p.key,{age:stageAge(p.stage)}),actual=portraitLayers({appearance:a},{age:stageAge(p.stage)}).preset;
    assert.equal(actual.src,p.src,p.key);assert.equal(actual.cell,p.cell,p.key);assert.deepEqual(actual.sourceRect,p.sourceRect,p.key);
  }
});

test('pages expose the complete eligible library without duplicating images or eagerly making thousands of cards',()=>{
  for(const race of PORTRAIT_RACES)for(const age of [0,3,10,18,40,55,65]){
    const a=appearance(race,availableHeritages(race)[0].id),person={appearance:a};
    const first=portraitGalleryPage(person,{age,state:{showLocked:true}}),seen=[];
    for(let page=0;page<first.pages;page++){const v=portraitGalleryPage(person,{age,state:{showLocked:true,page}});assert.ok(v.rows.length<=PORTRAITS_PER_PAGE);seen.push(...v.rows.map(p=>p.key));}
    assert.deepEqual(seen,PORTRAIT_LIBRARY.filter(p=>p.ancestry===race&&p.stage===first.context.stage).map(p=>p.key));
    const html=renderPortraitGallery(person,{age,state:{showLocked:true}});assert.equal((html.match(/data-op="gallery-preview"/g)||[]).length,first.rows.length);
    assert.equal((html.match(/<img /g)||[]).length,first.rows.length+1);assert.match(html,/loading="lazy"/);assert.doesNotMatch(html,/<svg|clip-path|portrait-hair|portrait-beard|skin-filter/);
    assert.match(html,/Locked|Preview only/);assert.match(html,/aria-live="polite"/);
  }
});

test('age locks reject every other stage while allowing the current stage at each boundary',()=>{
  const a=appearance('human','ashlands');
  for(const age of [0,2,3,9,10,17,18,39,40,54,55,64,65,85]){
    const stage=portraitContext({appearance:a},age).stage;
    for(const s of PORTRAIT_STAGES){const p=availablePortraits({appearance:a},s.min)[0];assert.equal(Boolean(selectPortrait(a,p.key,{age})),s.id===stage);}
  }
});

test('native complexion and animal families gate portraits rather than recoloring drawings',()=>{
  const human=appearance('human','ashlands'),dark=availablePortraits({appearance:appearance('human','sable_coast')},18).find(p=>p.complexion==='deep');
  assert.ok(dark);assert.equal(selectPortrait(human,dark.key,{age:18}),null);
  const wolf=appearance('beastfolk','wolfkin'),cat=availablePortraits({appearance:appearance('beastfolk','catkin')},7)[0];
  assert.equal(selectPortrait(wolf,cat.key,{age:7}),null);
  const html=renderPortraitGallery({appearance:human},{age:18,state:{showLocked:true,page:Math.floor(PORTRAIT_LIBRARY.filter(p=>p.ancestry==='human'&&p.stage==='adult').indexOf(dark)/24)}});
  assert.match(html,/is-locked/);assert.match(html,/Locked · Sable Coast/);
});

test('creation preserves selected portraits and heritage through forms, steps and age changes without changing fate gifts',()=>{
  let d=captureCreatorDraft({ancestry:'human',identity:'he/him',startAge:3},defaultCreatorDraft('chosen-gallery'));
  d=selectCreatorHeritage(d,'sable_coast');const circumstances={name:d.name,seed:d.seed,household:d.household,temperament:d.temperament};
  const child=availablePortraits(d,3,{presentation:'masculine'})[0];d=selectCreatorPortrait(d,child.key);
  d=captureCreatorDraft({startAge:18},d);const adult=availablePortraits(d,18,{presentation:'feminine'})[0];d=selectCreatorPortrait(d,adult.key);
  assert.equal(d.pronouns,'he/him');assert.equal(d.appearance.portraitSelections.child,child.key);assert.equal(d.appearance.portraitSelections.adult,adult.key);
  for(const [k,v] of Object.entries(circumstances))assert.equal(d[k],v,k);
  d=captureCreatorDraft({startAge:3,gold:'99999',name:'Fake'},d);assert.equal(portraitLayers(d,{age:3}).preset.key,child.key);
  assert.equal(d.heritageChoice,'sable_coast');assert.equal(d.name,'Fake');
  for(const step of [0,1]){const html=renderCharacterCreator(d,step);assert.match(html,/creator-portraits/);assert.match(html,/name="heritageChoice"/);assert.doesNotMatch(html,/name="hairStyle"|name="skin"|name="face"/);}
  d=captureCreatorDraft({identity:'they/them'},d);assert.equal(d.pronouns,'they/them');assert.equal(portraitLayers(d,{age:3}).preset.key,child.key);
});

test('casting the bones respects chosen heritage and clears handpicked faces while retaining starting age',()=>{
  let d=selectCreatorHeritage(captureCreatorDraft({ancestry:'beastfolk',startAge:7},defaultCreatorDraft('roll-heritage')),'harekin');
  const p=availablePortraits(d,7)[0];d=selectCreatorPortrait(d,p.key);const faces=new Set();
  for(let i=0;i<30;i++){const next=randomizeCreatorDraft(d);assert.equal(next.startAge,7);assert.equal(next.appearance.ancestry,'beastfolk');assert.equal(next.appearance.heritage,'harekin');assert.equal(Object.keys(next.appearance.portraitSelections).length,7);const adult=portraitLayers(next,{age:18}).preset;assert.ok(adult.modern);faces.add(adult.key);for(const age of [0,3,10,18,40,55,65]){const p=portraitLayers(next,{age}).preset;assert.ok(['long_eared','unknown'].includes(p.morphology));}}
  assert.ok(faces.size>=4,'Fate varies among the eight new Harekin identities.');
});

test('a chosen stage portrait survives the actual birth simulation, save export and reload',async()=>{
  let d=selectCreatorHeritage(captureCreatorDraft({ancestry:'elf',startAge:3},defaultCreatorDraft('elf-choice-life')),'sable_coast');
  const p=availablePortraits(d,3,{presentation:'feminine'}).at(-1);d=selectCreatorPortrait(d,p.key);
  const s=await createLifeAtAge(d),loaded=migrateSave(JSON.parse(JSON.stringify(s)));
  assert.ok(s&&loaded&&validateSave(s));assert.equal(s.age,3);assert.equal(loaded.hero.appearance.portraitSelections.child,p.key);
  assert.equal(portraitLayers(loaded.hero,{age:loaded.age}).preset.key,p.key);assert.equal(loreView(loaded).heritage.name,'Nighttide kindreds');
});

test('changing the current face preserves pending choices, calendar, stats, inventory, people and the source state',()=>{
  const s=createBirthGame({seed:'portrait-change-safe',appearance:appearance('human','sunlands')}),snapshot=structuredClone(s),p=availablePortraits(s.hero,0).at(-1);
  const next=selectCharacterPortrait(s,p.key);assert.deepEqual(s,snapshot);assert.ok(validateSave(next));
  for(const field of ['age','day','event','battle','equipment','world','life','family','campaign'])assert.deepEqual(next[field],s[field],field);
  for(const field of ['attributes','skills','gold','potions','hp','mp','pronouns','belief','temperament','origin','household','condition'])assert.deepEqual(next.hero[field],s.hero[field],field);
  assert.equal(next.hero.appearance.portraitSelections.infant,p.key);assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(next))).hero.appearance,next.hero.appearance);
  const record=next.lineage.people.find(r=>r.id===next.dynasty.activePersonId);assert.deepEqual(record.appearance,next.hero.appearance);
  const adult=availablePortraits(s.hero,18)[0],locked=selectCharacterPortrait(s,adult.key);assert.deepEqual(locked.hero,s.hero);assert.match(locked.notice,/another age/);
});

test('older lives retain exact saved portraits and decisions until heritage is explicitly recorded once',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states.partner;
  const s=migrateSave(original);assert.deepEqual(s.hero.appearance,original.hero.appearance);assert.deepEqual(s.event,original.event);
  const h=availableHeritages(s.hero.appearance.ancestry)[1],next=declareCharacterHeritage(s,h.id);assert.ok(validateSave(next));assert.equal(next.hero.appearance.heritageVersion,1);
  assert.equal(loreView(next).heritage.id,h.id);assert.deepEqual(next.event,s.event);assert.equal(next.day,s.day);
  const repeat=declareCharacterHeritage(next,availableHeritages(s.hero.appearance.ancestry)[0].id);assert.deepEqual(repeat.hero.appearance,next.hero.appearance);
});

test('the inferred heritage of a legacy likeness follows the exact displayed identity',()=>{
  for(let i=0;i<40;i++){
    const person={name:'Old '+i,appearance:normalizeAppearance({ancestry:'elf',preset:'legacy',heritage:'sunlands'})};
    const p=portraitPreset(portraitIdentity(person),{ancestry:'elf',age:27}),h=effectiveHeritage(person);
    if(p.complexion!=='unknown')assert.equal(h.complexion,p.complexion);
  }
});

test('pending combat and finished lives keep their exact recorded faces',()=>{
  const states=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states;
  const battle=Object.values(states).find(s=>s.battle);assert.ok(battle);
  for(const original of [battle,Object.values(states).find(s=>s.phase==='retired')].filter(Boolean)){
    const s=migrateSave(original),p=availablePortraits(s.hero,s.age)[0],next=selectCharacterPortrait(s,p.key),declared=declareCharacterHeritage(s,availableHeritages(s.hero.appearance.ancestry)[0].id);
    assert.deepEqual(next.hero,s.hero);assert.deepEqual(next.battle,s.battle);assert.deepEqual(next.event,s.event);assert.equal(next.day,s.day);
    assert.deepEqual(declared.hero,s.hero);assert.deepEqual(declared.battle,s.battle);
    assert.match(next.notice,/Finish the encounter|recorded history/);assert.ok(validateSave(next));
  }
});

test('new children inherit declared family heritage without copying the parent’s selected face',()=>{
  for(const race of ['human','elf','beastfolk'])for(const h of availableHeritages(race)){
    const a=appearance(race,h.id),p=availablePortraits({appearance:a},18)[0],parent=normalizeAppearance(selectPortrait(a,p.key,{age:18}));
    const child=generateCharacter('new-child',h.id,{age:0,familyAppearance:parent});assert.equal(child.appearance.heritage,h.id);assert.equal(child.appearance.heritageVersion,1);assert.equal(Object.keys(child.appearance.portraitSelections).length,7);
    for(const age of [0,3,10,18,40,55,65])assert.ok(heritageAllowsPortrait(h,portraitLayers(child,{age}).preset));
  }
});

test('a parent in an older world can declare heritage and have new children with their own portrait identity',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states.partner;
  let s=declareCharacterHeritage(migrateSave(original),'sunlands');
  const p=availablePortraits(s.hero,s.age)[0];s=selectCharacterPortrait(s,p.key);assert.equal(s.flags.portraitGeneration,undefined);
  // No partner determines this test child's ancestry, so it follows this parent.
  s.life.partnerId=null;
  const child={id:'new-heritage-child',name:'New child',age:0,bornDay:s.day,alive:true};
  const record=registerChild(s,child,{newArrival:true,welcome:true});
  assert.equal(record.appearance.heritage,'sunlands');assert.equal(record.appearance.heritageVersion,1);assert.equal(Object.keys(record.appearance.portraitSelections).length,7);
  assert.equal(portraitLayers({appearance:record.appearance},{age:0}).preset.stage,'infant');
});

test('wolf forms offer only canines and preserve the mortal stage selections',()=>{
  let a=appearance('human','ashlands');const mortal=availablePortraits({appearance:a},18)[0];a=selectPortrait(a,mortal.key,{age:18});
  const condition={type:'lycanthrope'},pool=availablePortraits({appearance:a,condition},18);assert.ok(pool.length);assert.ok(pool.every(p=>p.morphology==='canine'));
  const wolf=pool.at(-1),next=selectPortrait(a,wolf.key,{age:18,condition});assert.equal(next.portraitSelections.adult,mortal.key);assert.equal(next.wolfPortraitSelections.adult,wolf.key);assert.ok(isCanonicalAppearance(next));
  assert.equal(portraitLayers({appearance:next,condition},{age:18}).preset.key,wolf.key);assert.equal(portraitLayers({appearance:next},{age:18}).preset.key,mortal.key);
});

test('saved selectors reject invalid paths, stage keys, cross-race faces and incompatible heritage',()=>{
  const a=appearance('human','ashlands'),p=availablePortraits({appearance:a},3)[0];
  for(const selections of [{child:'../../bad'},{adult:p.key},{unknown:p.key},{child:PORTRAIT_LIBRARY.find(p=>p.ancestry==='orc'&&p.stage==='child').key},[]])assert.equal(isCanonicalAppearance({...a,portraitSelections:selections}),false);
  const dark=availablePortraits({appearance:appearance('human','sable_coast')},3).find(p=>p.complexion==='deep');assert.equal(isCanonicalAppearance({...a,portraitSelections:{child:dark.key}}),false);
  assert.equal(isCanonicalAppearance({...a,heritageVersion:2}),false);
  const selected=normalizeAppearance(selectPortrait(a,p.key,{age:3})),html=renderAvatar({name:'<script>bad</script>',appearance:selected},{age:3});
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|https:\/\/|onerror=/);
});
