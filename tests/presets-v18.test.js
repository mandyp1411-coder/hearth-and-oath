import { PORTRAIT_LIBRARY, portraitEntry } from '../dist/js/portrait-library.js';
import test from 'node:test';
import { needsReferenceArt } from './helpers/reference-art.mjs';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { portraitGrid } from '../scripts/preset-grid-v18.mjs';
import { DRAFT_CATALOG, AGE_SUPPLEMENT_CATALOG, PORTRAIT_RACES, PORTRAIT_CATALOG, PRESET_COUNT, STAGE_PRESET_COUNT, portraitPreset, portraitStage, presetPresentation, choosePortraitPreset } from '../dist/js/portrait-catalog.js';
import { normalizeAppearance, isCanonicalAppearance, portraitLayers, portraitComponents, renderAvatar, appearanceFields } from '../dist/js/avatar.js';
import { generateCharacter } from '../dist/js/characters.js';
import { defaultCreatorDraft, captureCreatorDraft, randomizeCreatorDraft, toggleCreatorLock, renderCharacterCreator, creatorStepTitles } from '../dist/js/creator.js';
import * as engine from '../dist/js/engine.js';
import { registerChild } from '../dist/js/lineage.js';

const stages={infant:0,child:7,adolescent:14,adult:27,elder:75};
const preset=index=>'p'+String(index).padStart(4,'0');

test('the published catalog contains 1024 complete adults and 64 portraits per other life stage for each ancestry',{skip:needsReferenceArt},()=>{
  assert.equal(DRAFT_CATALOG,false,'no placeholder catalog can be published');
  assert.equal(PRESET_COUNT,1024);assert.equal(STAGE_PRESET_COUNT,64);assert.equal(Object.keys(PORTRAIT_CATALOG).length,160);
  const hashes=new Set(),counts={};
  for(const [key,atlas] of Object.entries(PORTRAIT_CATALOG)){
    const [race,stage]=key.split('-'),record=JSON.parse(readFileSync(new URL(`../reference-art/preset-v18/registration/${key}.json`,import.meta.url),'utf8'));
    const bytes=readFileSync(new URL('../dist/'+atlas.src.slice(2),import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,key);
    assert.equal(atlas.cells.length,64);assert.equal(record.cells.length,64);assert.ok(bytes.length>10000);
    assert.equal(atlas.width,record.width);assert.equal(atlas.height,record.height);
    assert.equal(record.grid.rowGutters.length,7);assert.equal(record.grid.columnGuttersByRow.length,8);assert.ok([...record.grid.rowGutters,...record.grid.columnGuttersByRow.flat()].every(g=>g.mean<=18&&g.darkFraction>=.9));
    for(const cell of record.cells){assert.ok(!hashes.has(cell.sha256),key+'/'+cell.cell+' must be a distinct painted cell');hashes.add(cell.sha256);assert.ok(cell.meanLight>8);}
    for(const [x,y,w,h] of atlas.cells){assert.ok(x>=0&&y>=0&&w>10&&h>10);assert.ok(x+w<=100.00001&&y+h<=100.00001);}
    counts[race]??={adult:0,infant:0,child:0,adolescent:0,elder:0};counts[race][stage]+=64;
  }
  assert.equal(hashes.size,10240);
  for(const race of PORTRAIT_RACES)assert.deepEqual(counts[race],{adult:1024,infant:64,child:64,adolescent:64,elder:64});
  assert.equal(AGE_SUPPLEMENT_CATALOG.length,1);
  for(const atlas of AGE_SUPPLEMENT_CATALOG){const record=JSON.parse(readFileSync(new URL(`../reference-art/preset-v18/registration/${atlas.id}.json`,import.meta.url))),bytes=readFileSync(new URL('../dist/'+atlas.src.slice(2),import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);for(const c of record.cells){assert.ok(!hashes.has(c.sha256));hashes.add(c.sha256);}assert.equal(atlas.entries.length,64);}
  assert.equal(hashes.size,10304);
});

test('illustrated human and elf complexions remain consistent through all age stages without image filters',()=>{
  for(const race of ['human','elf'])for(let index=0;index<1024;index++){
    const adult=portraitPreset(preset(index),{ancestry:race,age:27});
    for(const age of [0,7,14,75]){const p=portraitPreset(preset(index),{ancestry:race,age});assert.equal(p.complexion,adult.complexion==='unknown'?'light':adult.complexion);assert.equal(p.presentation,adult.presentation);assert.equal(p.id,adult.id);}
  }
  const p=portraitPreset('p0024',{ancestry:'human',age:75});assert.equal(p.complexion,'light','the originally mismatched elder complexion is corrected');
});

test('an actual rejected seven-row child atlas cannot be mislabeled as 64 portraits',{skip:needsReferenceArt},async()=>{
  const require=createRequire(import.meta.url),sharp=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/sharp`);
  const {data,info}=await sharp(new URL('../reference-art/preset-v18/regressions/human-child-7-rows.webp',import.meta.url).pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.throws(()=>portraitGrid(data,info),/Missing real .*gutter|eight complete cells/);
});

test('Beastfolk preserve the illustrated animal family across age, and lycanthropes always use canines',()=>{
  for(let index=0;index<1024;index++){
    const adult=portraitPreset(preset(index),{ancestry:'beastfolk',age:27});
    for(const age of [0,7,14,75]){const young=portraitPreset(preset(index),{ancestry:'beastfolk',age});if(adult.morphology!=='unknown')assert.equal(young.morphology,adult.morphology);assert.equal(young.presentation,presetPresentation(index));}
    for(const age of [0,14,27,75]){const p=portraitLayers({age,condition:{type:'lycanthrope'},appearance:normalizeAppearance({ancestry:'human',preset:preset(index),portraitPresentation:presetPresentation(index)})});assert.equal(p.preset.morphology,'canine');const atlas=Object.values(PORTRAIT_CATALOG).find(a=>a.src===p.preset.src);assert.equal(atlas.morphologies[p.preset.cell],'canine');}
  }
});

test('every preset uses exactly one complete image and the registered whole-cell source rectangle',()=>{
  for(const race of PORTRAIT_RACES)for(const [stage,age] of Object.entries(stages))for(let index=0;index<(stage==='adult'?1024:64);index++){
    const a=normalizeAppearance({ancestry:race,preset:preset(index),portraitPresentation:presetPresentation(index)}),person={id:'one',appearance:a,age};
    const actual=portraitLayers(person).preset,expected=PORTRAIT_LIBRARY.find(p=>p.src===actual.src&&p.cell===actual.cell),parts=portraitComponents(person),markup=renderAvatar(person);assert.ok(expected);
    assert.equal(parts.length,1);assert.equal(parts[0].kind,'preset');assert.equal(parts[0].src,expected.src);assert.deepEqual(parts[0].sourceRect,expected.sourceRect);
    assert.deepEqual(parts[0].fit,[1,1,0,0]);assert.deepEqual(parts[0].clips,[]);
    assert.equal((markup.match(/<img /g)||[]).length,1);assert.doesNotMatch(markup,/<svg|clip-path|transform:|portrait-hair|portrait-beard|portrait-cover|portrait-marks/);
    assert.match(markup,new RegExp(`stage-${actual.stage}`));assert.match(markup,new RegExp(`data-preset="${actual.id}"`));
  }
});

test('age stages change only at actual boundaries and keep a stable identity on redraw and reload',()=>{
  assert.deepEqual([0,2,3,9,10,17,18,39,40,54,55,64,65,80].map(portraitStage),['infant','infant','child','child','adolescent','adolescent','adult','adult','mature','mature','older','older','elder','elder']);
  for(const race of PORTRAIT_RACES){
    const person={id:'person',...generateCharacter('consistent-age','person',{ancestry:race,pronouns:'she/her'})},before=structuredClone(person);
    const images=[];
    for(const age of [0,7,14,27,45,58,75]){
      const first=renderAvatar(person,{age}),p=portraitLayers(person,{age});
      assert.equal(first,renderAvatar(JSON.parse(JSON.stringify(person)),{age}));assert.equal(p.preset.key,person.appearance.portraitSelections[p.preset.stage]);images.push(p.preset.src+':'+p.preset.cell);
      for(const part of ['hair','beard','cover','mask','accessory'])assert.equal(p[part],null);
    }
    assert.equal(new Set(images).size,7);assert.deepEqual(person,before);
  }
});

test('old cosmetics and equipped gear cannot clip, recolor or reshape a complete portrait',()=>{
  const person={name:'Ossa',age:27,...generateCharacter('no-overlays','hero',{ancestry:'orc',pronouns:'she/her'})},base=renderAvatar(person);
  for(const [key,value] of Object.entries({hairStyle:'warbraids',facialHair:'long',headgear:'visor',facewear:'bone',scar:'burn',skin:'deep',heritage:'sable_coast',faceVariant:'third',portraitFace:'gaunt',outfit:'plate',hair:'rose'})){
    assert.equal(renderAvatar({...person,appearance:{...person.appearance,[key]:value}}),base,key);
  }
  assert.equal(renderAvatar({...person,equipment:{armor:'plate'},inventory:['iron_helm'],gold:999,hp:1}),base);
  assert.equal(appearanceFields(person.appearance),'');
});

test('people get complete presets matching their saved identity, ancestry and role without gaining stats',()=>{
  const seen=new Set();
  for(let index=0;index<600;index++){
    const person=generateCharacter('role-'+index,'watch',{ancestry:PORTRAIT_RACES[index%8],role:'Guard',pronouns:['he/him','she/her','they/them'][index%3]});
    const p=portraitLayers(person);assert.equal(person.character.archetype,'watch');assert.equal(p.preset.presentation,person.appearance.portraitPresentation);assert.equal(p.preset.ancestry,person.appearance.ancestry);
    assert.ok(isCanonicalAppearance(person.appearance));assert.deepEqual(person,generateCharacter('role-'+index,'watch',{ancestry:PORTRAIT_RACES[index%8],role:'Guard',pronouns:['he/him','she/her','they/them'][index%3]}));seen.add(p.preset.key);
  }
  assert.ok(seen.size>256,'Six hundred residents use more distinct illustrated faces than the original 256-family pool.');
  for(const presentation of ['masculine','feminine','androgynous'])for(let index=0;index<100;index++)assert.equal(presetPresentation(Number(choosePortraitPreset(index,{presentation}).slice(1))),presentation);
});

test('attributes replace all part controls and only permitted creation choices can override fate',()=>{
  assert.deepEqual(creatorStepTitles,['Beginning','Nature & Abilities','Review']);
  const allowed=new Set(['ancestry','identity','originId','startAge','heritageChoice','name','lifeMode']);
  const d=defaultCreatorDraft('attributes-contract');
  assert.equal(d.ancestryChoice,'fate');assert.equal(d.identityChoice,'fate');assert.equal(d.originId,'random');
  const next=captureCreatorDraft({ancestry:'orc',identity:'she/her',startAge:7,originId:'exile',hairStyle:'heavybangs',preset:'p0000',heritage:'sable_coast',name:'Injected',gold:9999,temperament:'ambitious',outfit:'plate'},d);
  assert.equal(next.name,'Injected');assert.equal(next.seed,d.seed);assert.equal(next.pronouns,'she/her');assert.equal(next.appearance.ancestry,'orc');assert.equal(next.startAge,7);assert.equal(next.originId,'exile');
  const control=captureCreatorDraft({ancestry:'orc',identity:'she/her',startAge:7,originId:'exile',name:'Injected'},d);
  assert.deepEqual(next.appearance,control.appearance,'Unpermitted part controls cannot override a whole portrait.');assert.equal(next.appearance.heritageVersion,1);assert.equal(Object.keys(next.appearance.portraitSelections).length,7);assert.ok(portraitEntry(next.appearance.portraitSelections.adult).modern);
  for(const step of [0,1]){
    const html=renderCharacterCreator(next,step);assert.match(html,/Character attributes/);
    for(const match of html.matchAll(/<(?:input|select)[^>]+name="([^"]+)"/g))assert.ok(allowed.has(match[1]),match[1]);
    assert.doesNotMatch(html,/portrait-cycle|portrait-lock|portrait-random|Heritage &amp;|Shape portrait/);
    assert.match(html,/<img class="preset-portrait-img"/);
  }
  let locked=next;for(const key of ['ancestry','pronouns','origin'])if(!locked.creatorLocks.includes(key))locked=toggleCreatorLock(locked,key);const rolls=new Set();for(let index=0;index<40;index++){const cast=randomizeCreatorDraft(locked);assert.equal(cast.startAge,7);assert.equal(cast.appearance.ancestry,'orc');assert.equal(cast.pronouns,'she/her');assert.equal(cast.originId,'exile');const face=portraitLayers(cast,{age:18}).preset;assert.ok(face.modern);rolls.add(face.key);}assert.ok(rolls.size>=6,'Fate varies across multiple new feminine Orc identities.');
});

test('eight actual childhood journeys keep saved presets and transition through age-specific illustrations',()=>{
  for(const race of PORTRAIT_RACES){
    const generated=generateCharacter('age-journey-'+race,'hero',{ancestry:race,pronouns:'she/her'});
    let s=engine.createBirthGame({seed:'age-journey-'+race,pronouns:'she/her',appearance:generated.appearance}),guard=0;
    const id=s.hero.appearance.preset,stages=new Set();
    while((s.age<18||s.event||s.timeline.yearTarget!==null)&&guard++<300){
      stages.add(portraitLayers(s.hero,{age:s.age}).preset.stage);
      const next=s.event?engine.chooseEventOption(s,s.event.choices.find(c=>c.id==='care'&&!c.disabledReason)?.id||s.event.choices.find(c=>!c.disabledReason).id):s.timeline.yearTarget===null?engine.ageUp(s):engine.continueAgeUp(s);
      assert.ok(engine.validateSave(next));s=engine.migrateSave(JSON.parse(JSON.stringify(next)));assert.equal(s.hero.appearance.preset,id);
    }
    assert.ok(guard<300);assert.equal(s.age,18);for(const stage of ['infant','child','adolescent'])assert.ok(stages.has(stage));
    assert.equal(portraitLayers(s.hero,{age:s.age}).preset.stage,'adult');
    const child={id:'child-preset',name:'The next generation',age:0,bornDay:s.day};s.life.children.push(child);
    const record=registerChild(s,child,{newArrival:true,welcome:true});assert.equal(record.appearance.ancestry,race);assert.equal(portraitLayers({...child,appearance:record.appearance}).preset.stage,'infant');
  }
});

test('portrait markup safely escapes names and never accepts paths, paint or classes from saved input',()=>{
  const html=renderAvatar({id:'one',name:'<img src=x onerror="bad">',appearance:{ancestry:'" onload="bad',preset:'../../bad',portraitPresentation:'" class="bad'}},{size:'large" onload="bad',age:NaN});
  assert.match(html,/&lt;img src=x onerror=&quot;bad&quot;&gt;/);assert.doesNotMatch(html,/ onload="|<svg|<img src=x/);assert.match(html,/size-small/);
  assert.match(html,/src="\.\/art\/presets\/human-adult-\d{2}\.avif"/);assert.equal((html.match(/<img /g)||[]).length,1);
  assert.doesNotThrow(()=>renderAvatar(null));assert.doesNotThrow(()=>portraitLayers(null));
});
