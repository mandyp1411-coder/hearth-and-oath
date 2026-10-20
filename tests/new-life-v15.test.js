import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { defaultCreatorDraft } from '../dist/js/creator.js';
import { validateSave, migrateSave, chooseEventOption, ageUp } from '../dist/js/engine.js';
import { portraitLayers, normalizeAppearance } from '../dist/js/avatar.js';
import { rollLifeCircumstances, normalizeStartAge } from '../dist/js/origins.js';
import { firstDayGuideVisible } from '../dist/js/first-day-guide.js';

for(const requested of [0,2,3,6,9,10,15,16,17,18,27,40,64,65,80])test(`a new life really begins at age ${requested}, with a matching past and save`,async()=>{
  const d={...defaultCreatorDraft(`start-boundary-${requested}`),originId:'shrine_foundling',startAge:requested},copy=structuredClone(d);
  // A people that ages fast cannot enter as old as a human can.
  const age=normalizeStartAge(requested,18,d.appearance.ancestry);
  const s=await createLifeAtAge(d),f=rollLifeCircumstances(d.seed,d.originId);
  assert.deepEqual(d,copy);assert.deepEqual(s.hero.firstDayGuide,{version:1,dismissed:false});assert.equal(firstDayGuideVisible(s),true);assert.equal(s.age,age);assert.equal(s.day,age*365);assert.equal(s.timeline.birthDay,0);
  assert.equal(s.timeline.yearHistory.length,age);assert.ok(s.timeline.yearHistory.every(y=>y.age<age&&y.day===y.age*365));
  assert.equal(s.hero.lifeOrigin.id,'shrine_foundling');assert.equal(s.hero.lifeOrigin.startingAge,age);assert.equal(s.family.setup,'orphan');
  assert.equal(s.hero.temperament,f.temperament);assert.equal(s.hero.belief,f.belief);assert.deepEqual(s.hero.preferences,f.preferences);
  assert.equal(s.phase,age<18?'childhood':'adult');assert.equal(s.hero.path,'unformed');assert.equal(s.hero.specialization,null);
  assert.equal(s.event.id,age===0?'birth_arrival':age<=18?`birth_year_${age}`:'birth_adult_year');
  assert.ok(s.lineage.people.find(p=>p.source==='hero').deathAge>=age+8);
  // Not everyone gets school: a bound child in a house that does not read, or an owned one, is put to work instead.
  if(age>6){const barred=s.hero.station.freedom==='owned'||s.hero.station.id==='bound'&&!s.family.literate;assert.ok(barred||s.education.attendance>0||s.education.progress>0,`schooled unless barred (${s.hero.station.id}, reads ${s.family.literate})`);}
  if(age>16)assert.notEqual(s.hero.profession,'Unemployed');
  const p=portraitLayers({...s.hero,age});assert.equal(p.years,age);if(age<3)assert.equal(p.hair,null);if(age<18)assert.equal(p.beard,null);if(age>=65)assert.equal(p.baseAtlas,'elder');
  assert.ok(validateSave(s));assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))),s,'reload preserves the drawn history and waiting birthday');
});

test('the same generated opening is deterministic and its next birthday stays playable',async()=>{
  const d={...defaultCreatorDraft('same-opening'),originId:'exile',startAge:20};
  const a=await createLifeAtAge(d),b=await createLifeAtAge(d);assert.deepEqual(a,b);
  let s=chooseEventOption(a,a.event.choices[0].id);s=ageUp(s);
  for(let i=0;i<100&&s.age===20;i++){
    if(s.event){const id=s.event.id==='health_concern'?'support':s.event.choices[0].id;s=chooseEventOption(s,id);}
    else {const {continueAgeUp}=await import('../dist/js/engine.js');s=continueAgeUp(s);}
  }
  assert.equal(s.age,21);assert.equal(s.day,21*365);assert.ok(validateSave(s));
});

test('starting appearance cannot grant equipment, money or traits selected outside the creator',async()=>{
  const d={...defaultCreatorDraft('no-gifts'),startAge:0,household:'noble',difficulty:'gentle',temperament:'ambitious',gold:9999,items:['iron_sword']};
  const s=await createLifeAtAge(d);assert.equal(s.hero.gold,0);assert.equal(s.hero.potions,0);assert.equal(s.hero.level,1);
  assert.equal(s.difficulty,'gentle');assert.deepEqual(s.hero.skills,Object.fromEntries(Object.keys(s.hero.skills).map(k=>[k,0])));
  assert.equal(s.hero.temperament,rollLifeCircumstances(d.seed,d.originId).temperament);
});

test('a cancelled generation returns no life and never mutates the creator draft',async()=>{
  const d={...defaultCreatorDraft('cancelled-opening'),startAge:65},copy=structuredClone(d);let cancelled=false,progress=0;
  const result=await createLifeAtAge(d,{onProgress:()=>{progress++;cancelled=true;},shouldCancel:()=>cancelled});
  assert.equal(result,null);assert.equal(progress,1);assert.deepEqual(d,copy);
});

test('new opening metadata is validated without making it compulsory for old saves',async()=>{
  const s=await createLifeAtAge({...defaultCreatorDraft('metadata'),startAge:0});
  const bad=structuredClone(s);bad.hero.lifeOrigin.id='<script>';assert.equal(validateSave(bad),false);
  bad.hero.lifeOrigin.id='exile';bad.hero.lifeOrigin.startingAge=81;assert.equal(validateSave(bad),false);
  delete bad.hero.lifeOrigin;assert.ok(validateSave(bad));
  assert.equal(normalizeStartAge('bogus'),18);assert.equal(normalizeStartAge(-9),0);assert.equal(normalizeStartAge(900),80);assert.equal(normalizeStartAge(900,18,'goblin'),60);assert.equal(normalizeStartAge(900,18,'elf'),120);
});
