import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCharacter, randomizePortrait } from '../dist/js/characters.js';
import { normalizeAppearance, isCanonicalAppearance, portraitLayers, renderAvatar, AVATAR_OPTIONS } from '../dist/js/avatar.js';
import { defaultCreatorDraft, randomizeCreatorDraft, randomizeCreatorPortrait, renderCharacterCreator } from '../dist/js/creator.js';
import { createBirthGame, validateSave, migrateSave } from '../dist/js/engine.js';
import { getContacts } from '../dist/js/conversations.js';
import { educationTeacher, householdView } from '../dist/js/household.js';

test('world people have varied, coherent identities that remain stable across reloads',()=>{
  const ancestries=new Set(),looks=new Set();
  for(let i=0;i<240;i++){
    const person=generateCharacter(`world-${i}`,'watcher',{role:'Soldier',age:32});
    assert.deepEqual(person,generateCharacter(`world-${i}`,'watcher',{role:'Soldier',age:32}));
    assert.equal(isCanonicalAppearance(person.appearance),true);
    assert.equal(person.character.archetype,'watch');
    assert.ok(['none','nasal','sallet','kettle','coif'].includes(person.appearance.headgear));
    assert.equal(person.appearance.facewear,'none');
    if(person.pronouns==='she/her')assert.equal(person.appearance.facialHair,'none');
    ancestries.add(person.appearance.ancestry);looks.add(JSON.stringify(person.appearance));
  }
  assert.equal(ancestries.size,8);assert.ok(looks.size>220);
  const child=generateCharacter('age-fit','pupil',{role:'Scholar',age:7});
  for(const key of ['facialHair','headgear','facewear','scar','tattoo','accessory'])assert.equal(child.appearance[key],'none');
  assert.equal(portraitLayers(generateCharacter('age-fit','elder',{age:80}),{age:80}).preset.stage,'elder');
});

test('families inherit features without inheriting a player mask or an identical portrait',()=>{
  const appearance=normalizeAppearance({ancestry:'orc',skin:'moss',hair:'copper',eyes:'amber',portraitFace:'rugged',hairStyle:'mohawk',headgear:'cowl',facewear:'plague',scar:'burn',tattoo:'thorns'});
  const game=createBirthGame({seed:'orc-household-v12',name:'Ossa',familySetup:'two_parents',appearance});
  assert.equal(validateSave(game),true);
  const relatives=game.life.people.filter(p=>p.role==='relative');
  assert.ok(relatives.length>=2);
  for(const person of relatives){
    assert.equal(person.appearance.ancestry,'orc');assert.equal(person.appearance.skin,'moss');
    assert.equal(person.appearance.headgear,'none');assert.equal(person.appearance.facewear,'none');
    assert.equal(person.appearance.scar,'none');assert.equal(person.appearance.tattoo,'none');
    assert.notDeepEqual(person.appearance,appearance);
  }
  assert.ok(new Set(relatives.map(p=>JSON.stringify(p.appearance))).size>1);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(game))),game);
  const teacher=educationTeacher(game);
  assert.equal(isCanonicalAppearance(teacher.appearance),true);assert.equal(teacher.character.archetype,'scholar');
  assert.equal(householdView(game).family.members.find(p=>p.personId==='kin').pronouns,relatives.find(p=>p.id==='kin').pronouns);
});

test('companion likenesses vary by world and keep the pronouns used in their stories',()=>{
  const a=createBirthGame({seed:'portrait-world-a'}),b=createBirthGame({seed:'portrait-world-b'});
  assert.equal(a.companions.find(p=>p.id==='mira').pronouns,'she/her');
  assert.equal(a.companions.find(p=>p.id==='orrin').pronouns,'he/him');
  assert.notDeepEqual(a.companions.map(p=>p.appearance),b.companions.map(p=>p.appearance));
  a.age=20;for(const p of a.companions)p.age+=20;for(const p of a.life.people)p.age+=20;
  const contacts=getContacts(a);
  for(const p of a.companions){const contact=contacts.find(c=>c.id===p.id);assert.deepEqual(contact.appearance,p.appearance);assert.equal(contact.pronouns,p.pronouns);}
});

