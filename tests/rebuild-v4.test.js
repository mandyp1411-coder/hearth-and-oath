import { assertMigrationMechanics, assertEventMechanics, assertCapturedMigration } from './helpers/migration-mechanics.mjs';
import { atService } from './helpers/service-visit.mjs';
import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import { rollBirthCircumstances } from '../dist/js/station.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../dist/js/engine.js';
import { takeBattleAction } from '../dist/js/combat.js';
import { travelPreview } from '../dist/js/world.js';
import { workshopView, buildingBenefits, workshopTier } from '../dist/js/workshop.js';
import { AVATAR_OPTIONS, renderAvatar } from '../dist/js/avatar.js';
import { loreView } from '../dist/js/lore.js';
import { householdView } from '../dist/js/household.js';
import { classView } from '../dist/js/classes.js';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v3.json', import.meta.url), 'utf8'));

function transition(state, operation) {
  const before = structuredClone(state);
  const next = operation(state);
  assert.deepEqual(state, before, 'public operations must preserve the original save');
  assert.notEqual(next, state);
  assert.notEqual(next.hero, state.hero);
  return next;
}

function preserved(original,migrated,path='state'){assertMigrationMechanics(original,migrated,path);}

function saveable(state) {
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true, `${state.event?.id || state.battle?.encounterId || state.day} must survive export and import`);
  assert.ok(state.hero.gold >= 0);
  return state;
}

function choose(state, id) {
  if(state.age<3&&state.event?.choices.length===1&&state.event.choices[0].id==='continue')id='continue';
  assert.ok(state.event?.choices.some(choice => choice.id === id), `${state.event?.id} must offer ${id}`);
  return transition(state, value => engine.chooseEventOption(value, id));
}

function act(state, id) {
  if(state.event?.id==='health_concern')state=choose(state,'continue');
  state=atService(state,id);
  state=knownCurseMeeting(state,id);
  const action = engine.getActions(state).find(item => item.id === id);
  assert.ok(action, `${id} must be available at age ${state.age}, ${state.locationId}`);
  assert.equal(action.disabledReason, undefined, `${id}: ${action.disabledReason}`);
  return transition(state, value => engine.chooseAction(value, id));
}

function grow(state, target) {
  // These quoted project and road timings retain the explicit legacy energy profile.
  state=structuredClone(state);delete state.trail;
  for (let step = 0; step < 150 && (state.age < target || state.event); step += 1) {
    saveable(state);
    if (state.event) {
      if (state.event.id === 'health_concern') { state = choose(state, 'continue'); continue; }
      if (state.event.id === 'lineage_bereavement') { state = choose(state, 'private'); continue; }
      if (state.event.id === 'hard_winter') { state = choose(state, 'endure'); continue; }
      if (state.event.id.startsWith('living_')) { state = choose(state, 'continue'); continue; } // the world takes its course
      assert.match(state.event.id, /^(birth_|fate_)/, 'growing policy must expose any unexpected interruption');
      state = choose(state, state.event.choices.some(item => item.id === 'curiosity') ? 'curiosity' : state.event.choices[0].id);
    } else state = transition(state, value => value.timeline.yearTarget == null ? engine.ageUp(value) : engine.continueAgeUp(value));
  }
  assert.equal(state.age, target);
  assert.equal(state.day, target * 365);
  assert.equal(state.event, null);
  return saveable(state);
}

function move(state, id) {
  if (state.locationId === id) return state;
  const preview = travelPreview(state, id);
  assert.equal(preview.disabledReason, undefined, `${id}: ${preview.disabledReason}`);
  const startDay = state.day;
  state = transition(state, value => engine.travelTo(value, id));
  let extraDays = 0;
  const picks = { lycan_fullmoon:'isolate',living_conscription:'continue',living_strike:'continue',living_wolves:'continue',living_purge:'continue',travel_messenger:'continue',travel_pilgrims:'continue',travel_grave_robber:'continue',travel_fortune:'continue',travel_wagon:'continue',travel_relic:'continue', travel_lore: 'continue', travel_witness: 'continue', travel_caravan: 'continue', travel_sick_traveler: 'continue', travel_bandits: 'avoid', travel_beasts: 'avoid', travel_weather: 'press', travel_delay: 'continue', health_concern: 'continue' };
  for (let step = 0; step < 60 && (state.timeline.journey || state.event); step += 1) {
    if (state.event) {
      const pick = picks[state.event.id];
      assert.ok(pick, `road policy must explicitly handle ${state.event.id}`);
      const before = state.day;
      state = choose(state, pick);
      extraDays += state.day - before;
    } else state = transition(state, value => engine.continueJourney(value));
  }
  assert.equal(state.locationId, id);
  assert.equal(state.day, startDay + preview.days + extraDays, 'displayed road time and chosen detours are each spent exactly once');
  return saveable(state);
}

function chargedActivity(state, id) {
  const descriptor = engine.getActions(state).find(item => item.id === id);
  assert.ok(descriptor, `${id} must have a visible descriptor`);
  const next = act(state, id);
  assert.equal(next.day - state.day, descriptor.days, 'an uninterrupted activity spends its displayed time once');
  assert.equal(state.hero.gold - next.hero.gold, descriptor.cost, 'an activity pays its displayed fee once');
  return saveable(next);
}

function project(state, id) {
  const descriptor = engine.getActions(state).find(item => item.id === id);
  assert.ok(descriptor);
  const next = chargedActivity(state, id);
  for (const [material, amount] of Object.entries(descriptor.materials || {})) {
    assert.equal(next.equipment.materials[material], state.equipment.materials[material] - amount, `${id} consumes ${material} once`);
  }
  assert.equal(next.workshop.project, null, 'uninterrupted work must complete after its displayed duration');
  return next;
}

function homelessAdult(seed = 'a-home-made-by-hand', station = rollBirthCircumstances(seed, 'common', 'human')) {
  return grow(engine.createBirthGame({ name: 'Lark', seed, household: 'poor', familySetup: 'homeless', station }), 18);
}

function shelterSupplies(state) {
  state = move(state, 'home');
  for (const id of ['wood', 'wood', 'stone', 'cloth']) state = chargedActivity(state, `workshop_gather_${id}`);
  return state;
}

function earnCalling(state, id) {
  const calling = classView(state).callings.find(item => item.id === id);
  assert.ok(calling);
  state = move(state, calling.locationId);
  state = act(state, `calling_meet_${id}`);
  for (let lesson = 0; lesson < 20 && Object.entries(calling.skills).some(([key, required]) => state.hero.skills[key] < required); lesson += 1) state = act(state, `calling_train_${id}`);
  assert.ok(Object.entries(calling.skills).every(([key, required]) => state.hero.skills[key] >= required));
  assert.equal(state.hero.path, 'unformed', 'education and training must leave the actual class choice to initiation');
  state = act(state, `calling_seek_${id}`);
  state = choose(state, 'accept');
  assert.ok(state.progression.learnedClassIds.includes(id));
  return saveable(state);
}

test('authentic family-less v0.3 lives migrate additively with no rewritten history or resources', () => {
  for (const [id, original] of Object.entries(legacy.states)) {
    assert.equal(original.revision, 3);
    assert.equal(Object.hasOwn(original, 'family'), false, 'the fixture must remain a genuine pre-family save');
    assert.equal(Object.hasOwn(original, 'education'), false);
    assert.equal(engine.validateSave(original), true, `${id} remains importable`);
    const migrated = transition(original, value => engine.migrateSave(value));
    assert.equal(migrated.version, 1);
    assert.equal(migrated.revision, 5);
    assertCapturedMigration(original,migrated);
    if(original.age>=3)assertEventMechanics(original.event,migrated.event);
    assert.deepEqual(migrated.battle, original.battle, 'an imported midbattle snapshot stays byte-for-byte identical');
    assert.equal(migrated.conversations.pending?.personId, original.conversations.pending?.personId);
    assert.ok(migrated.family && migrated.education, 'new systems are initialized without resetting the life');
    saveable(migrated);
    assert.deepEqual(engine.migrateSave(migrated), migrated, 'repeat imports cannot invent ancestors, certificates, resources, or rewards');
  }
});

test('v0.3 campaign, conversation, and combat continue with their captured pre-expansion effects', () => {
  const campaign = engine.migrateSave(legacy.states.campaign);
  const choice = legacy.expectations.campaignChoice;
  const nextCampaign = choose(campaign, choice.id);
  assert.deepEqual(nextCampaign.campaign, choice.campaign);
  preserved(choice.hero, nextCampaign.hero, 'hero');
  preserved(choice.companions, nextCampaign.companions, 'companions');
  saveable(nextCampaign);

  const conversation = engine.migrateSave(legacy.states.conversation);
  const pending=conversation.conversations.pending,resources={day:conversation.day,gold:conversation.hero.gold,skills:structuredClone(conversation.hero.skills)};
  assert.deepEqual(pending,legacy.states.conversation.conversations.pending);const expectedReply=legacy.expectations.conversationReply;const nextReply=transition(conversation,value=>engine.replyMessage(value,expectedReply.personId,expectedReply.replyId));
  preserved(expectedReply.people,nextReply.life.people,'people');
  assert.equal(nextReply.conversations.pending,null);assert.equal(nextReply.day,resources.day);assert.equal(nextReply.hero.gold,resources.gold);assert.deepEqual(nextReply.hero.skills,resources.skills);saveable(nextReply);

  const combat = engine.migrateSave(legacy.states.midbattle);
  const turn = legacy.expectations.battleTurn;
  assert.deepEqual(takeBattleAction(combat.battle, turn.action, turn.target), turn.battle);
  const retreated = takeBattleAction(combat.battle, 'retreat');
  const resolved = transition(combat, value => engine.resolveBattle(value, retreated));
  assert.equal(resolved.battle, null);
  assert.equal(resolved.hero.gold, combat.hero.gold);
  assert.equal(resolved.dungeon.cleared.includes('sluice'), false);
  assert.equal(resolved.campaign.completed.includes('well'), false);
  saveable(resolved);
});

test('parented, orphan, and homeless lives retain actual caregivers and free learning access', () => {
  for (const setup of ['two_parents', 'single_parent', 'orphan', 'homeless']) {
    let state = engine.createBirthGame({ name: 'Robin', seed: 'the-people-who-are-present', familySetup: setup, household: 'noble' });
    assert.equal(state.family.setup, setup);
    assert.equal(state.hero.household, setup === 'homeless' ? 'poor' : 'noble');
    const parents = state.family.members.filter(member => member.availability === 'present' && member.relationship === 'parent');
    assert.equal(parents.length, setup === 'two_parents' ? 2 : setup === 'single_parent' ? 1 : 0);
    const kin = state.life.people.find(person => person.id === 'kin');
    assert.equal(kin.familyRole, ['orphan', 'homeless'].includes(setup) ? 'guardian' : 'parent');
    for (const member of state.family.members) {
      if (member.availability === 'present') assert.ok(state.life.people.some(person => person.id === member.personId && person.name === member.name && person.role === 'relative'));
      else assert.equal(member.personId, null, 'absent or deceased parents must remain records, not fabricated living contacts');
    }
    state = choose(state, 'care');
    if (setup === 'homeless') {
      const caregiverName = kin.name;
      assert.deepEqual(engine.getActions(state),[],'an infant watches while the caregiver arranges shelter');
      assert.equal(state.family.housing, 'shelter');
      assert.equal(state.life.people.find(person => person.id === 'kin').name, caregiverName);
      assert.equal(state.hero.gold, 0, 'welfare access does not require an inherited purse');
    }
    assert.equal(engine.getActions(state).some(item => item.id.startsWith('school_enroll_')), false);
    state = grow(state, 6);
    state=atService(state,'grow_school');assert.match(engine.getActions(state).find(item => item.id === 'grow_school').disabledReason, /enroll/i);
    assert.ok(!engine.getActions(state).some(item=>item.id==='grow_read'),'teacher-led reading requires an enrolled course');
    const learned = state.hero.skills.scholarship;
    state = chargedActivity(state, 'school_enroll_community');
    assert.ok(engine.getActions(state).some(item=>item.id==='grow_read'),'enrollment opens actual teacher-led reading');
    state = chargedActivity(state, 'school_attend');
    assert.equal(state.education.attendance, 1);
    assert.equal(state.hero.skills.scholarship, learned + 1);
    assert.ok(householdView(state).education.schoolName.includes(state.world.locations.find(place => place.id === 'home').name));
    state = grow(state, 18);
    assert.equal(state.hero.path, 'unformed');
    for (const person of state.life.people.filter(contact => contact.role === 'relative')) {
      assert.equal(person.age, person.baseAge + state.age);
      assert.equal(engine.getActions(state).some(item => item.id === `life_court_${person.id}`), false, 'every actual parent, sibling, and guardian is excluded from courtship');
      const refused = transition(state, value => engine.chooseAction(value, `life_court_${person.id}`));
      assert.equal(refused.life.courtshipId, null);
      assert.equal(refused.day, state.day);
      assert.equal(refused.hero.gold, state.hero.gold);
    }
    saveable(state);
  }
});

test('a homeless pupil earns free qualifications, keeps named school memories, and chooses a calling', () => {
  // The rules a legacy save keeps: free school, a scholarship by service, letters for everyone. A new life pays tuition and
  // sits examinations instead (tests/education-v64.test.js), so this fixture is born without a station.
  let state = engine.createBirthGame({ name: 'Lark', seed: 'a-school-with-room', familySetup: 'homeless', household: 'poor', station: null });
  state = choose(state, 'care');
  assert.equal(state.family.housing,'shelter','the caregiver arranged shelter during infancy');
  state = grow(state, 6);
  state = chargedActivity(state, 'school_enroll_community');
  const school = householdView(state).education;
  const initialScholarship = state.hero.skills.scholarship;
  for (let lesson = 0; lesson < 6; lesson += 1) state = chargedActivity(state, 'school_attend');
  assert.equal(state.education.attendance, 6);
  assert.equal(state.education.progress, 6);
  assert.equal(state.hero.skills.scholarship, initialScholarship + 6);
  state = chargedActivity(state, 'school_dilemma');
  assert.match(state.event.title, /lessons|teacher.s table/i);
  saveable(state);
  state = engine.migrateSave(JSON.parse(JSON.stringify(state)));
  state = choose(state, 'ask');
  assert.ok(state.life.people.find(person => person.id === 'fellow').memories.some(memory => /helped me study/i.test(memory)));
  assert.ok(state.conversations.relationships[school.teacher.id].memories.some(memory => /lessons|teacher.s table/i.test(memory)));
  state = grow(state, 10);
  state = chargedActivity(state, 'school_exam');
  state = choose(state, 'present');
  assert.ok(state.flags.literacyCertificate);
  assert.equal(state.education.qualifications[0].route, 'community');
  assert.equal(state.education.qualifications[0].schoolId, state.education.schoolId);
  assert.ok(state.conversations.relationships[school.teacher.id].memories.some(memory => /earned.*certificate/i.test(memory)));
  state = grow(state, 12);
  state = chargedActivity(state, 'school_scholarship');
  state = choose(state, 'service');
  assert.ok(state.education.scholarship);
  const obligation = state.obligations.find(item => item.id === 'school_service');
  assert.equal(obligation.dueDay - state.day, 60);
  state = chargedActivity(state, 'school_service');
  assert.equal(state.obligations.find(item => item.id === 'school_service').resolved, true);
  state = chargedActivity(state, 'school_enroll_academy');
  for (let lesson = 0; lesson < 6; lesson += 1) state = chargedActivity(state, 'school_attend');
  assert.equal(state.hero.path, 'unformed');
  state = grow(state, 14);
  state = move(state, 'city');
  state = chargedActivity(state, 'school_exam');
  state = choose(state, 'present');
  assert.equal(state.flags.certified, true);
  assert.deepEqual(state.education.qualifications.map(item => item.route), ['community', 'academy']);
  state = grow(state, 18);
  state = earnCalling(state, 'healer');
  assert.equal(state.hero.specialization, 'healer');
  assert.equal(state.family.setup, 'homeless');
  assert.equal(state.family.housing, 'shelter');
  saveable(state);
});

test('a homeless adult gathers a roof, builds a forge, and equips an actual crafted weapon', () => {
  let state = shelterSupplies(homelessAdult());
  assert.equal(state.family.housing, 'shelter','the caregiver’s temporary shelter remains until an actual home is built');
  state = project(state, 'workshop_build_shelter');
  assert.equal(state.family.housing, 'shelter');
  assert.equal(buildingBenefits(state).shelter, true);
  assert.equal(state.workshop.structures[0].locationId, 'home');
  assert.ok(engine.getActions(state).some(item => item.id === 'workshop_rest' && !item.disabledReason));
  assert.ok(state.world.changes.some(change => change.locationId === 'home' && /shelter/i.test(change.title)));

  state = move(state, 'forest');
  for (const id of ['wood', 'wood', 'ore', 'hide']) state = chargedActivity(state, `workshop_gather_${id}`);
  state = move(state, 'home');
  state = project(state, 'workshop_craft_woodland_spear');
  assert.ok(state.equipment.owned.includes('woodland_spear'));
  const beforeEquip = structuredClone(state);
  state = transition(state, value => engine.equipGear(value, 'woodland_spear'));
  state = transition(state, value => engine.equipGear(value, 'woodland_spear'));
  assert.deepEqual(state.hero.attributes, beforeEquip.hero.attributes);
  assert.deepEqual(state.hero.skills, beforeEquip.hero.skills);
  assert.equal(state.hero.gold, beforeEquip.hero.gold);
  assert.equal(state.day, beforeEquip.day);

  for (let shift = 0; shift < 2; shift += 1) {
    const previous = state;
    state = act(state, 'work');
    assert.equal(state.day - previous.day, 3);
    assert.ok(state.hero.gold > previous.hero.gold, 'a poor character must be able to earn project supplies');
  }
  state = move(state, 'ruin');
  for (let gather = 0; gather < 2; gather += 1) state = chargedActivity(state, 'workshop_gather_ore');
  state = move(state, 'home');
  for (let gather = 0; gather < 3; gather += 1) state = chargedActivity(state, 'workshop_gather_stone');
  assert.equal(workshopTier(state), 1);
  state = project(state, 'workshop_build_forge');
  assert.equal(workshopTier(state), 2, 'the completed forge changes actual crafting access at this site');
  assert.equal(workshopView(state).recipes.find(item => item.itemId === 'steel_sword').tier, 2);
  state = move(state, 'forest');
  while(state.hero.hp<12)state=chargedActivity(state,'camp_rest');
  state = act(state, 'forest_expedition');
  const hero = state.battle.actors.find(actor => actor.id === 'hero');
  assert.equal(hero.equipment.weapon, 'woodland_spear');
  assert.equal(hero.gear.attack, 5, 'the new weapon reaches the real combat snapshot once');
  assert.deepEqual(state.hero.attributes, beforeEquip.hero.attributes);
  saveable(state);
});

test('a full moon pauses a committed building after one day and save/load resumes only its remaining work', () => {
  let state = homelessAdult('a-roof-between-moons');
  state = transition(state, value => engine.updatePreferences(value, { pursuit: 'knowledge', socialStyle: 'bold', value: 'freedom', food: 'plant' }));
  state = shelterSupplies(state);
  state = move(state, 'brook');
  state = act(state, 'lycan_invitation');
  state = choose(state, 'accept');
  state = move(state, 'home');
  if ((engine.getMoonForecast(state).nextFullMoon - state.day) % 2 === 0) state = chargedActivity(state, 'workshop_gather_cloth');
  for (let rest = 0; rest < 14 && engine.getMoonForecast(state).nextFullMoon - state.day > 1; rest += 1) state = chargedActivity(state, 'camp_rest');
  assert.equal(engine.getMoonForecast(state).nextFullMoon - state.day, 1);
  state = transition(state, value => engine.updatePreferences(value, { pursuit: 'craft', socialStyle: 'bold', value: 'freedom', food: 'plant' }));
  assert.equal(state.preferenceHistory.lastEnjoymentDay, null);
  const start = structuredClone(state);
  const descriptor = engine.getActions(state).find(item => item.id === 'workshop_build_shelter');
  state = act(state, descriptor.id);
  assert.equal(state.day - start.day, 1, 'known moon timing must stop actual work after one day');
  assert.equal(state.event.id, 'lycan_fullmoon');
  assert.equal(state.hero.gold, start.hero.gold - descriptor.cost);
  assert.equal(state.workshop.project.remainingDays, descriptor.days - 1);
  assert.equal(state.workshop.structures.length, 0);
  assert.equal(state.family.housing, 'shelter','the caregiver’s temporary shelter remains until an actual home is built');
  assert.equal(state.preferenceHistory.lastEnjoymentDay, null, 'partially finished favored work earns no pleasure');
  for (const [material, amount] of Object.entries(descriptor.materials)) assert.equal(state.equipment.materials[material], start.equipment.materials[material] - amount);
  saveable(state);
  const exported = JSON.parse(JSON.stringify(state));
  state = transition(exported, value => engine.migrateSave(value));
  assert.deepEqual(state.workshop.project, exported.workshop.project);
  assert.deepEqual(state.event, exported.event);
  state = choose(state, 'isolate');
  const paused = structuredClone(state);
  const blockedAge = transition(state, value => engine.ageUp(value));
  const blockedTravel = transition(state, value => engine.travelTo(value, 'city'));
  for (const blocked of [blockedAge, blockedTravel]) {
    assert.equal(blocked.day, paused.day);
    assert.equal(blocked.locationId, paused.locationId);
    assert.deepEqual(blocked.workshop.project, paused.workshop.project);
  }
  state = act(state, 'workshop_continue');
  assert.equal(state.day - paused.day, descriptor.days - 1);
  assert.equal(state.hero.gold, paused.hero.gold);
  assert.deepEqual(state.equipment.materials, paused.equipment.materials);
  assert.equal(state.workshop.project, null);
  assert.equal(state.workshop.structures.length, 1);
  assert.equal(state.family.housing, 'shelter');
  assert.equal(state.preferenceHistory.lastEnjoymentDay, state.day);
  assert.equal(state.preferenceHistory.memories.length, 1, 'completed favored work receives one award');
  const repeated = transition(state, value => engine.chooseAction(value, 'workshop_continue'));
  assert.deepEqual(repeated.workshop, state.workshop);
  assert.equal(repeated.day, state.day);
  assert.equal(repeated.hero.gold, state.hero.gold);
  saveable(repeated);
});

test('a school promise interrupts a project without duplicate fees or phantom completion', () => {
  // The service promise belongs to the legacy scholarship; a new life sits an examination instead, so this life is born without a station.
  let state = shelterSupplies(homelessAdult('a-roof-and-a-kept-promise', null));
  state = chargedActivity(state, 'school_scholarship');
  state = choose(state, 'service');
  const dueDay = state.obligations.find(item => item.id === 'school_service').dueDay;
  for (let week = 0; week < 8; week += 1) state = chargedActivity(state, 'life_rest');
  assert.equal(state.day, dueDay - 4);
  const start = structuredClone(state);
  state = act(state, 'workshop_build_shelter');
  assert.equal(state.day, dueDay - 3);
  assert.equal(state.event.id, 'annual_deadline_review');
  assert.equal(state.workshop.project.remainingDays, 2);
  assert.equal(state.workshop.structures.length, 0);
  assert.equal(state.hero.gold, start.hero.gold - 6);
  saveable(state);
  state = engine.migrateSave(JSON.parse(JSON.stringify(state)));
  state = choose(state, 'pause');
  state = chargedActivity(state, 'school_service');
  assert.equal(state.obligations.find(item => item.id === 'school_service').resolved, true);
  assert.equal(state.workshop.structures.length, 0, 'other activities do not perform the waiting project’s labor');
  const paid = structuredClone(state);
  state = act(state, 'workshop_continue');
  assert.equal(state.day, paid.day + 2);
  assert.equal(state.hero.gold, paid.hero.gold);
  assert.deepEqual(state.equipment.materials, paid.equipment.materials);
  assert.equal(state.family.housing, 'shelter');
  assert.equal(state.workshop.structures.length, 1);
  assert.equal(state.obligations.find(item => item.id === 'school_service').missed, undefined);
  saveable(state);
});

test('new ancestry and hair choices survive real childhood without buying abilities', () => {
  const ancestries = AVATAR_OPTIONS.find(field => field.key === 'ancestry').options;
  const styles = AVATAR_OPTIONS.find(field => field.key === 'hairStyle').options;
  assert.ok(ancestries.length >= 8 && styles.length >= 14);
  const drawings = new Set();
  let reference;
  for (const [index, ancestry] of ancestries.entries()) {
    let state = engine.createBirthGame({ name: 'Wren', seed: 'many-faces-one-opportunity', familySetup: 'single_parent', household: 'poor', appearance: { ancestry: ancestry.value, hairStyle: styles[index % styles.length].value, hair: 'rose' } });
    assert.equal(state.hero.appearance.ancestry, ancestry.value);
    state = grow(state, 18);
    if (reference) {
      assert.deepEqual(state.hero.attributes, reference.hero.attributes);
      assert.deepEqual(state.hero.skills, reference.hero.skills);
      assert.equal(state.hero.gold, reference.hero.gold);
      assert.deepEqual(state.progression.learnedClassIds, reference.progression.learnedClassIds);
    } else reference = state;
    assert.equal(state.hero.path, 'unformed');
    const portrait = renderAvatar(state.hero, { age: state.age });
    assert.match(portrait, /data-age="18"/);
    drawings.add(portrait.replace(/<title>[\s\S]*?<\/title>|aria-label="[^"]*"|data-ancestry="[^"]*"|class="[^"]*"|id="[^"]*"|url\(#[^)]*\)/g, ''));
  }
  assert.equal(drawings.size, ancestries.length, 'the ancestry choices change visible geometry or color');
  const edited = transition(reference, value => engine.updateAppearance(value, { ...value.hero.appearance, hairStyle: 'waves', hair: 'blue', outfit: 'ritual', accessory: 'feather' }));
  assert.equal(edited.hero.appearance.hairStyle, 'waves');
  assert.equal(edited.hero.appearance.outfit, 'ritual');
  assert.deepEqual(edited.hero.attributes, reference.hero.attributes);
  assert.deepEqual(edited.hero.skills, reference.hero.skills);
  assert.equal(edited.hero.exp, reference.hero.exp);
  assert.equal(edited.hero.gold, reference.hero.gold);
  assert.equal(edited.day, reference.day);
  assert.deepEqual(edited.life, reference.life);
  saveable(edited);
});

test('preferences give bounded enjoyment from completed activities, never free edits or repeated clicks', () => {
  let state = grow(engine.createBirthGame({ name: 'Finch', seed: 'a-small-real-pleasure', familySetup: 'single_parent', household: 'poor', station: rollBirthCircumstances('a-small-real-pleasure', 'common', 'human'), preferences: { pursuit: 'knowledge', socialStyle: 'quiet', value: 'ambition', food: 'sweet' } }), 6);
  state.hero.gold += 10; // the village school wants its fee on a new life; this test is about what the lessons are worth to the child
  state=chargedActivity(state,'school_enroll_community');
  const unaffected = structuredClone(state);
  const alternate = transition(state, value => engine.updatePreferences(value, { pursuit: 'nature', socialStyle: 'warm', value: 'mercy', food: 'plant' }));
  assert.deepEqual(alternate.preferenceHistory, state.preferenceHistory);
  assert.deepEqual(alternate.life, state.life);
  assert.deepEqual(alternate.hero.attributes, state.hero.attributes);
  assert.deepEqual(alternate.hero.skills, state.hero.skills);
  assert.equal(alternate.hero.gold, state.hero.gold);
  assert.equal(alternate.hero.exp, state.hero.exp);
  assert.equal(alternate.day, state.day);
  state = chargedActivity(state, 'grow_read');
  let other = chargedActivity(alternate, 'grow_read');
  assert.equal(state.life.happiness - other.life.happiness, 3);
  assert.equal(state.preferenceHistory.lastEnjoymentDay, state.day);
  assert.equal(state.preferenceHistory.memories.length, 1);
  assert.equal(other.preferenceHistory.memories.length, 0);
  assert.ok(state.hero.skills.scholarship > unaffected.hero.skills.scholarship);
  state = chargedActivity(state, 'grow_read');
  other = chargedActivity(other, 'grow_read');
  assert.equal(state.life.happiness - other.life.happiness, 3, 'repeated real study within 30 days cannot farm the bonus');
  const enjoyedDay = state.preferenceHistory.lastEnjoymentDay;
  state = transition(state, value => engine.updatePreferences(value, { pursuit: 'community', socialStyle: 'warm', value: 'duty', food: 'hearty' }));
  assert.equal(state.preferenceHistory.lastEnjoymentDay, enjoyedDay, 'editing tastes cannot reset the cooldown');
  state = chargedActivity(state, 'grow_family');
  assert.equal(state.preferenceHistory.memories.length, 1, 'a new favored pursuit respects the same cooldown');
  state = grow(state, 7);
  state = chargedActivity(state, 'grow_family');
  assert.equal(state.preferenceHistory.memories.length, 2, 'enjoyment returns after actual time has passed');
  assert.ok(state.preferenceHistory.lastEnjoymentDay - enjoyedDay >= 30);
  saveable(state);
});

test('seeded local lore records real sources and discoveries without exposing unrelated private conditions', () => {
  const signatures = new Set();
  for (const seed of ['tide-memory', 'a-maker-remembers', 'lantern-register', 'a-common-grove']) {
    const state = engine.createBirthGame({ name: 'Sable', seed, familySetup: 'orphan', appearance: { ancestry: 'goblin' } });
    const replay = engine.createBirthGame({ name: 'Sable', seed, familySetup: 'orphan', appearance: { ancestry: 'goblin' } });
    assert.deepEqual(state.lore, replay.lore);
    assert.deepEqual(loreView(state), loreView(replay));
    const view = loreView(state);
    assert.equal(view.ancestry.name, 'Goblin');
    for (const id of ['home', 'brook', 'city']) assert.ok(view.culture.description.includes(state.world.locations.find(place => place.id === id).name));
    assert.deepEqual(state.lore.records, [], 'an origin provides context without fabricated research memories');
    signatures.add(`${state.lore.cultureId}:${state.lore.traditionId}:${state.lore.historyId}`);
    saveable(state);
  }
  assert.ok(signatures.size > 1, 'a new seed changes connected culture, tradition, or regional history');

  let state = grow(engine.createBirthGame({ name: 'Sable', seed: 'the-source-and-the-secret', familySetup: 'orphan', household: 'poor', appearance: { ancestry: 'goblin' } }), 18);
  state = move(state, 'city');
  state = act(state, 'vampire_invitation');
  state = choose(state, 'accept');
  const privateKnowledge = structuredClone(state.life.people.map(person => ({ id: person.id, knownFacts: person.knownFacts })));
  const privateCompanions = structuredClone(state.companions.map(person => ({ id: person.id, memories: person.memories, knownFacts: person.knownFacts })));
  const startingScholarship = state.hero.skills.scholarship;
  const startingTrust = state.factions.academy;
  state = chargedActivity(state, 'lore_read_academy');
  assert.equal(state.event.id, 'lore_academy');
  assert.ok(state.event.body.includes(state.world.locations.find(place => place.id === 'city').name));
  saveable(state);
  state = JSON.parse(JSON.stringify(state));
  state = choose(state, 'share');
  assert.equal(state.hero.skills.scholarship, startingScholarship + 1);
  assert.equal(state.factions.academy, startingTrust + 2);
  assert.ok(state.lore.discovered.includes('academy'));
  assert.equal(state.lore.records.length, 1);
  assert.equal(state.lore.records[0].locationId, 'city');
  assert.ok(state.lore.records[0].witness);
  assert.deepEqual(state.life.people.map(person => ({ id: person.id, knownFacts: person.knownFacts })), privateKnowledge);
  assert.deepEqual(state.companions.map(person => ({ id: person.id, memories: person.memories, knownFacts: person.knownFacts })), privateCompanions);
  assert.equal(state.legal.evidence, 0);
  assert.equal(engine.getActions(state).some(item => item.id === 'lore_read_academy'), false);
  const repeated = transition(state, value => engine.chooseAction(value, 'lore_read_academy'));
  assert.deepEqual(repeated.lore, state.lore);
  assert.equal(repeated.hero.skills.scholarship, state.hero.skills.scholarship);
  assert.equal(repeated.day, state.day);
  saveable(repeated);
});
