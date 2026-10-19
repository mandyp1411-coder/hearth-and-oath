import test from 'node:test';
import assert from 'node:assert/strict';
import { ORIGIN_ANCESTRIES, STARTING_ORIGINS, MAX_START_AGE, availableOrigins, originAllowed, originById, rollLifeCircumstances, normalizeStartAge } from '../dist/js/origins.js';
import { BIRTHPLACES, resolveBirthplace } from '../dist/js/world.js';
import { createBirthGame, validateSave } from '../dist/js/engine.js';
import { normalizeAppearance } from '../dist/js/avatar.js';

test('every ancestry has three exclusive beginnings and five legacy origins remain valid',()=>{
  assert.equal(STARTING_ORIGINS.length,29);
  assert.equal(new Set(STARTING_ORIGINS.map(o=>o.id)).size,29);
  assert.equal(STARTING_ORIGINS.filter(o=>!o.ancestries.length).length,5);
  for(const ancestry of ORIGIN_ANCESTRIES){
    const origins=availableOrigins(ancestry);
    assert.equal(origins.length,3,ancestry);
    assert.equal(origins.filter(o=>o.ancestries.includes(ancestry)).length,3);
    assert.ok(originAllowed('random',ancestry));
    for(const origin of STARTING_ORIGINS){
      assert.equal(originAllowed(origin.id,ancestry),!origin.ancestries.length||origins.includes(origin),`${ancestry}: ${origin.id}`);
      assert.ok(Object.isFrozen(origin));assert.ok(Object.isFrozen(origin.ancestries));
      for(const place of origin.places)assert.ok(BIRTHPLACES.some(p=>p.id===place),place);
      assert.ok(origin.birthDescription.length>60);assert.ok(origin.communityName.length>6);
    }
  }
});

test('fate draws every eligible origin across all ancestries and opening ages, without permitting a foreign tradition',()=>{
  for(const ancestry of ORIGIN_ANCESTRIES){
    const expected=new Set(availableOrigins(ancestry).map(o=>o.id)),seen=new Set();
    for(const age of [0,MAX_START_AGE])for(let i=0;i<240;i++){
      const fate=rollLifeCircumstances(`origins-${ancestry}-${normalizeStartAge(age)}-${i}`,'random',ancestry);
      assert.deepEqual(fate,rollLifeCircumstances(fate.seed,'random',ancestry));
      assert.equal(fate.ancestry,ancestry);assert.ok(expected.has(fate.originId));seen.add(fate.originId);
      assert.ok(!('path' in fate));assert.ok(!('equipment' in fate));assert.ok(!('gold' in fate));
    }
    assert.deepEqual(seen,expected,ancestry);
    const foreign=STARTING_ORIGINS.find(o=>o.ancestries.length&&!o.ancestries.includes(ancestry));
    for(let i=0;i<30;i++){
      const seed=`foreign-${ancestry}-${i}`;
      assert.deepEqual(rollLifeCircumstances(seed,foreign.id,ancestry),rollLifeCircumstances(seed,'random',ancestry));
    }
  }
});

test('each explicit origin has varied hidden circumstances while guardian copy matches its actual family setup',()=>{
  for(const origin of STARTING_ORIGINS){
    const ancestry=origin.ancestries[0]||'human',places=new Set(),means=new Set(),families=new Set(),beliefs=new Set(),natures=new Set(),names=new Set();
    for(let i=0;i<100;i++){
      const f=rollLifeCircumstances(`tradition-${i}`,origin.id,ancestry);
      assert.equal(f.originId,origin.id);assert.ok(origin.places.includes(f.birthplace));assert.ok(origin.means.includes(f.household));
      assert.ok(origin.families.includes(f.familySetup));assert.equal(f.originCommunity,origin.communityName);
      assert.ok(f.originBirthDescription.startsWith(origin.birthDescription));
      if(f.familySetup==='homeless'){assert.equal(f.household,'poor');assert.match(f.originBirthDescription,/shelter guardian/);}
      if(f.familySetup==='orphan')assert.match(f.originBirthDescription,/Guardians from the community/);
      if(f.familySetup==='single_parent')assert.match(f.originBirthDescription,/One present parent/);
      if(f.familySetup==='two_parents')assert.match(f.originBirthDescription,/Two parents/);
      places.add(f.birthplace);means.add(f.household);families.add(f.familySetup);beliefs.add(f.belief);natures.add(f.temperament);names.add(f.name);
    }
    assert.ok(places.size>=Math.min(3,new Set(origin.places).size),origin.id);assert.ok(means.size>=Math.min(2,new Set(origin.means).size),origin.id);
    assert.deepEqual(families,new Set(origin.families));assert.equal(beliefs.size,4);assert.equal(natures.size,5);assert.ok(names.size>65);
  }
});

test('newborn origins set the real starting community, guardians, housing and household without granting a calling or possessions',()=>{
  for(const ancestry of ORIGIN_ANCESTRIES)for(const origin of availableOrigins(ancestry)){
    const fate=rollLifeCircumstances(`newborn-${ancestry}-${origin.id}`,origin.id,ancestry);
    const s=createBirthGame({...fate,startAge:0,appearance:normalizeAppearance({ancestry})});
    assert.equal(s.age,0);assert.equal(s.day,0);assert.equal(s.hero.appearance.ancestry,ancestry);
    assert.equal(s.locationId,resolveBirthplace(fate.birthplace).locationId);
    assert.equal(s.hero.birthplaceId,s.locationId);
    assert.equal(s.family.setup,fate.familySetup);assert.equal(s.hero.household,fate.household);
    assert.equal(s.family.housing,fate.familySetup==='homeless'?'unsheltered':fate.familySetup==='orphan'?'shelter':'secure');
    const guardians=s.family.members.filter(p=>p.availability==='present'&&p.relationship!=='sibling');
    assert.equal(guardians.length,fate.familySetup==='two_parents'?2:1);
    for(const guardian of guardians){const person=s.life.people.find(p=>p.id===guardian.personId);assert.equal(person.locationId,s.locationId);}
    assert.equal(s.hero.path,'unformed');assert.equal(s.hero.gold,0);assert.equal(s.hero.potions,0);
    assert.ok(validateSave(s),`${ancestry}: ${origin.id}`);
  }
});

test('shared origin IDs and older two-argument creation calls remain usable',()=>{
  for(const id of ['hearthborn','roadborn','shrine_foundling','exile','fallen_house']){
    assert.ok(originById(id));
    assert.deepEqual(rollLifeCircumstances('old-origin',id),rollLifeCircumstances('old-origin',id,'human'));
    for(const ancestry of ORIGIN_ANCESTRIES)assert.ok(originAllowed(id,ancestry));
  }
  assert.equal(originById('exile').label,'Borderborn');assert.equal(originById('missing'),null);
  assert.equal(originAllowed('missing','elf'),false);assert.deepEqual(availableOrigins('missing'),availableOrigins('human'));
  assert.deepEqual(rollLifeCircumstances('unknown','missing','missing'),rollLifeCircumstances('unknown','random','human'));
  const list=availableOrigins('elf');list.splice(0,1);assert.equal(availableOrigins('elf').length,3);
});
