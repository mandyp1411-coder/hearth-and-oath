import {romanceProfile} from '../dist/js/world-people-v31.js';
import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import {positionAtContact} from './helpers/contact-position.mjs';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../dist/js/engine.js';
import * as world from '../dist/js/world.js';
import { takeBattleAction } from '../dist/js/combat.js';
import { travelPlanPreview } from '../dist/js/travel.js';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url), 'utf8'));
const requiredSites = ['home', 'city', 'brook', 'forest', 'ruin', 'marsh', 'coast', 'sanctuary', 'gate', 'camp', 'tower', 'citadel', 'mountain'];

const preserved=assertCapturedMigration;

function saveable(state) {
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true,
    `${state.event?.id || state.battle?.encounterId || state.day} must survive export/import`);
  assert.ok(state.hero.gold >= 0, 'a lawful life never spends money it does not have');
  return state;
}

function transition(state, operation) {
  const before = structuredClone(state);
  const next = operation(state);
  assert.deepEqual(state, before, 'public operations preserve the previous save');
  assert.notEqual(next, state);
  return saveable(next);
}

function act(state,id){
  if(id.startsWith('life_home_')){state=structuredClone(state);syncCartography(state);for(const room of settlementWalkPath(state,'homes'))state=engine.chooseAction(state,'atlas_room_'+room);}
  if(/^life_(visit|court|commit)_/.test(id))state=positionAtContact(state,id.replace(/^life_(visit|court|commit)_/,''));
  state=atService(state,id);
  const descriptor = engine.getActions(state).find(action => action.id === id);
  assert.ok(descriptor, `${id} must be advertised at age ${state.age} in ${state.locationId}`);
  assert.equal(descriptor.disabledReason, undefined, `${id}: ${descriptor.disabledReason}`);
  return transition(state, value => engine.chooseAction(value, id));
}

function choose(state, id) {
  if(state.age<3&&(state.event?.id==='birth_arrival'||/^birth_year_[012]$/.test(state.event?.id||'')||state.event?.id==='health_concern'))id='continue';
  assert.ok(state.event?.choices.some(choice => choice.id === id), `${state.event?.id} must offer ${id}`);
  return transition(state, value => engine.chooseEventOption(value, id));
}

test('genuine v0.5 lives keep their geography, careers, kin, children, history and pending work on revision-five migration', () => {
  assert.equal(legacy.states.professional.hero.profession, 'Merchant');
  assert.equal(legacy.states.professional.life.career.rank, 3, 'the fixture reached mastery through actual work and promotion');
  assert.equal(legacy.states.parent.life.partnerId, 'fellow');
  assert.equal(legacy.states.parent.life.children.length, 2);
  assert.ok(legacy.states.parent.journal.some(entry => /through adoption/.test(entry.text)));
  assert.ok(legacy.states.parent.journal.some(entry => /partner’s freely given agreement/.test(entry.text)));
  for (const [id, original] of Object.entries(legacy.states)) {
    assert.equal(original.revision, 4, 'fixtures remain genuine pre-expansion saves');
    const migrated = transition(original, value => engine.migrateSave(value));
    assert.equal(migrated.version, 1);
    assert.equal(migrated.revision, 5);
    preserved(original, migrated);
    for (const field of ['world', 'journal', 'event', 'battle', 'equipment']) {
      assertCapturedMigration(original[field],migrated[field],`${id}.${field}`);
    }
    preserved(original.education,migrated.education,`${id}.education`);
    assert.deepEqual(migrated.education.pending,original.education.pending,'an existing examination or teacher decision remains exact');
    assert.deepEqual(migrated.education.projects || [],[],'future projects invent no earlier attended work');
    assert.deepEqual(migrated.education.teacherHistory || [],[],'import invents no earlier teacher retirement');
    assert.equal(migrated.education.academicPath || null,null,'import does not choose a pupil’s academic direction');
    preserved(original.life.people,migrated.life.people,`${id}.life.people`);
    for(const person of migrated.life.people)if(person.compatibility){
      assert.deepEqual(person.compatibility.known,[],'an individual’s future wishes are unknown until actually discussed');
      assert.deepEqual(person.compatibility.history,[],'import creates no conversation or agreement');
      assert.equal(person.compatibility.lastDiscussionDay,null,'import grants no completed values discussion');
    }
    assert.deepEqual(migrated.life.children, original.life.children, 'import cannot age, replace or invent a child');
    assert.deepEqual(migrated.timeline.journey, original.timeline.journey);
    assert.deepEqual(migrated.workshop.project, original.workshop.project);
    assert.deepEqual(engine.migrateSave(migrated), migrated, 'repeat imports grant no inheritance or duplicate resources');
  }
});

test('fresh worlds vary real topology and starting circumstances, while repeated seeds reproduce actual state', () => {
  const counts = new Set(), topologies = new Set(), names = new Set(), positions = new Set(), birthStories = new Set();
  for (let index = 0; index < 16; index += 1) {
    const config = { name: 'Wren', seed: `dynasty-world-${index}`, birthplace: 'random', household: 'poor', familySetup: 'homeless' };
    const first = saveable(engine.createBirthGame(config));
    const second = saveable(engine.createBirthGame(config));
    assert.deepEqual(second, first, 'a specified seed and choices reproduce the entire initial life');
    assert.equal(first.revision, 5);
    assert.equal(first.day, 0);
    assert.equal(first.age, 0);
    assert.equal(world.validateWorld(first.world), true);
    const ids = first.world.locations.map(location => location.id);
    for (const id of requiredSites) assert.ok(ids.includes(id), `promised site ${id} remains reachable`);
    const generatedBase=world.generateWorld(first.seed,{expanded:true});const optional=generatedBase.locations.map(p=>p.id).filter(id=>!requiredSites.includes(id)&&!id.startsWith('seat-')&&!id.startsWith('reach-'));for(const id of optional)assert.ok(ids.includes(id));
    assert.ok(optional.length >= 12 && optional.length <= 19, 'fresh maps contain the advertised seeded optional sites');
    for (const id of ids) {
      const route = world.findRoute(first.world, first.locationId, id);
      assert.equal(route[0], first.locationId);
      assert.equal(route.at(-1), id);
      for (let leg = 1; leg < route.length; leg += 1) {
        assert.ok(first.world.roads.some(road =>
          road.from === route[leg - 1] && road.to === route[leg] || road.to === route[leg - 1] && road.from === route[leg]));
      }
    }
    counts.add(ids.length);
    topologies.add(JSON.stringify(first.world.roads.map(road => [road.from, road.to]).sort()));
    names.add(first.world.locations.map(location => location.name).join('|'));
    positions.add(JSON.stringify(first.world.map.nodes));
    birthStories.add(first.event.body);
  }
  assert.ok(counts.size >= 2, 'seed variation changes map size');
  assert.ok(topologies.size >= 4, 'seed variation changes actual road connections');
  assert.ok(names.size >= 8, 'different regions have different named places');
  assert.ok(positions.size >= 8, 'different regions have different real geometry');
  assert.ok(birthStories.size >= 8, 'the recorded birth uses the actual region and household');
});

test('all twelve advertised birthplaces create a living newborn in the selected real site', () => {
  assert.equal(world.BIRTHPLACES.length, 12);
  for (const birthplace of world.BIRTHPLACES) {
    const state = saveable(engine.createBirthGame({ name: 'Lark', seed: 'twelve-open-doors', birthplace: birthplace.id, familySetup: 'homeless', household: 'poor' }));
    assert.equal(state.locationId, birthplace.locationId, `${birthplace.label} must be an actual starting place`);
    assert.equal(state.hero.origin, birthplace.origin);
    assert.equal(state.age, 0);
    assert.equal(state.hero.path, 'unformed');
    assert.equal(state.hero.gold, 0);
    const home = state.world.locations.find(location => location.id === state.locationId);
    assert.ok(home && home.status !== 'destroyed');
    assert.ok(state.journal.some(entry => entry.text.includes(home.name)), 'the recorded birth names the selected settlement');
    const settled = choose(state, 'care');
    assert.equal(settled.age, 0);
    assert.equal(settled.day, 0);
    assert.deepEqual(engine.getActions(settled),[]);assert.equal(settled.family.housing,'shelter','the actual guardian arranges the free roof without an infant decision');
  }
});

// These policies resolve authored situations through their advertised choices;
// an unknown interruption fails the journey instead of being silently skipped.
function settle(state) {
  for (let step = 0; state.event && step < 80; step += 1) {
    const id = state.event.id;
    let pick;
    if (/^(birth_|fate_)/.test(id)) pick = state.event.choices.some(c => c.id === 'care') ? 'care' : 'curiosity';
    else if(id==='society_staff')pick=state.event.choices.some(c=>c.id==='boundary')?'boundary':'prepare';
    else pick = ({ career_year: 'care', life_birthday: 'people', plague_letter: 'later', deadline_review: 'pause', health_concern: 'support', lineage_bereavement: 'share', society_customer:'decline',society_neighbor:'welcome',society_launch:'independent' })[id];
    // This parent prioritizes the already agreed work and their children's
    // schooling: tell customers an honest limit, welcome new neighbors and
    // leave unfunded staff requests open. Funded positive arcs are exercised by
    // the separate public-API people journeys, rather than erased here.
    assert.ok(pick, `The lawful journey needs an explicit policy for ${id}`);
    state = choose(state, pick);
  }
  assert.equal(state.event, null);
  return state;
}

function grow(state, target) {
  const targetDay = (state.timeline.birthDay || 0) + target * 365;
  for (let step = 0; step < 180 && (state.age < target || state.event || state.timeline.yearTarget !== null); step += 1) {
    if (state.event) state = settle(state);
    else state = transition(state, value => value.timeline.yearTarget === null ? engine.ageUp(value) : engine.continueAgeUp(value));
  }
  assert.equal(state.age, target);
  assert.equal(state.day, targetDay, 'a birthday is relative to this actual person’s birth, not the beginning of the world');
  assert.equal(state.event, null);
  return state;
}

function finishBatch(state) {
  for (let step = 0; step < 80 && (state.careers.batch || state.event && state.event.id !== 'career_legacy'); step += 1) {
    state = state.event ? settle(state) : act(state, 'career_batch_continue');
  }
  assert.equal(state.careers.batch, null);
  return state;
}

function workDays(state,days){const start=state.careers.records[state.hero.profession].workedDays;for(let step=0;step<1500&&state.careers.records[state.hero.profession].workedDays-start<days;step++){state=settle(state);if(state.timeline.yearTarget!==null||state.day+3>state.timeline.birthDay+(state.age+1)*365){state=settle(transition(state,value=>value.timeline.yearTarget!==null?engine.continueAgeUp(value):engine.ageUp(value)));continue;}const before=state.day;state=settle(act(state,'career_work'));assert.ok(state.day>before,'an actual shift advances time');}assert.ok(state.careers.records[state.hero.profession].workedDays-start>=days);return state;}

function completeCommission(state) {
  let offer;
  for (let month = 0; month < 4; month += 1) {
    offer = engine.getActions(state).find(action => action.id.startsWith('career_accept_') && !action.disabledReason);
    if (offer) break;
    state = workDays(state,30);
  }
  assert.ok(offer, 'living customers offer work in this actual settlement');
  state = act(state, offer.id);
  const commission = structuredClone(state.careers.active);
  for (const [material, count] of Object.entries(commission.materials)) {
    while (state.equipment.materials[material] < count + 1) state = settle(act(state, `career_buy_${material}`));
  }
  const before = state;
  const descriptor = engine.getActions(state).find(action => action.id === 'career_make_fine');
  state = act(state, 'career_make_fine');
  assert.equal(state.day - before.day, descriptor.days);
  assert.equal(before.hero.gold - state.hero.gold, descriptor.cost);
  assert.equal(state.careers.active.status, 'ready');
  state = act(state, 'career_invoice');
  const readySave = structuredClone(state);
  const delivered = choose(state, 'honest');
  assert.equal(delivered.careers.active, null);
  assert.equal(delivered.careers.records.Blacksmith.commissions, before.careers.records.Blacksmith.commissions + 1);
  assert.equal(delivered.obligations.some(o => o.id === commission.id && o.status === 'active'), false);
  assert.deepEqual(choose(engine.migrateSave(JSON.parse(JSON.stringify(readySave))), 'honest'), JSON.parse(JSON.stringify(delivered)),
    'a named customer and completed item cannot reroll at invoicing after import');
  const twice = engine.chooseEventOption(delivered, 'honest');
  assert.equal(twice.hero.gold, delivered.hero.gold, 'an already delivered invoice pays only once');
  return settle(delivered);
}

function partnerAndChildren(state) {
  state = act(state, 'life_home_cottage');
  const partner=state.life.people.find(p=>p.id==='fellow');
  const profile=romanceProfile(state,partner);assert.notEqual(profile.attraction,'none','this fixture has a consenting potential partner');
  const gender=profile.attraction==='men'?'man':profile.attraction==='women'?'woman':'nonbinary';
  state=engine.updateRomanticIdentity(state,{gender,attraction:'any'});
  while (state.life.people.find(p => p.id === 'fellow').bond < 55) state = settle(act(state, 'life_visit_fellow'));
  state = act(state, 'life_court_fellow');
  state = choose(state, 'yes');
  while (state.life.people.find(p => p.id === 'fellow').bond < 70) state = settle(act(state, 'life_visit_fellow'));
  state = act(state, 'life_commit_fellow');
  state = choose(state, 'pledge');
  state = act(state, 'lineage_marry');
  state = choose(state, 'vow');
  assert.ok(state.lineage.unions.some(u => u.kind === 'marriage' && u.endedDay === null));
  for (const choice of ['welcome', 'adopt']) {
    for (let visit = 0; state.life.health < 40 && visit < 10; visit += 1) state = settle(act(state, 'health_clinic'));
    state = act(state, 'life_family');
    state = choose(state, choice);
  }
  assert.equal(state.life.children.length, 2);
  return state;
}

function smithLife() {
  let state = engine.createBirthGame({ name: 'Vesper Hearthkeeper', seed: 'two-lives-at-the-forge', birthplace: 'village', household: 'poor', familySetup: 'homeless', appearance: { ancestry: 'dwarf' } });
  state = choose(state, 'care');
  assert.equal(state.family.housing,'shelter');
  state = grow(state, 6);
  state = act(state, 'school_enroll_community');
  for (let lesson = 0; lesson < 6; lesson += 1) state = act(state, 'school_attend');
  state = grow(state, 10);
  state = act(state, 'school_exam');
  state = choose(state, 'present');
  assert.ok(state.education.qualifications.some(q => q.route === 'community'), 'a penniless child earns literacy through actual lessons and an examination');
  state = grow(state, 16);
  state = act(state, 'career_choose_blacksmith');
  assert.equal(state.hero.profession, 'Blacksmith');
  assert.equal(state.hero.path, 'unformed', 'civilian work does not assign a combat class');
  state = grow(state, 18);
  state = workDays(state,30);
  assert.ok(state.careers.records.Blacksmith.workedDays >= 30);
  state = act(state, 'career_open_shop');
  state = act(state, 'career_shop_operate');
  assert.equal(state.careers.shop.weeks, 1);
  assert.ok(state.careers.shop.turnover > 0, 'an actual operating week earns business revenue');
  for (let commission = 0; commission < 5; commission += 1) state = completeCommission(state);
  return partnerAndChildren(state);
}

test('a penniless schoolchild builds a civilian smith’s livelihood, family, masterwork and an actual educated successor', () => {
  let state = smithLife();
  const child = structuredClone(state.life.children[0]);
  state = act(state, `lineage_nurture_${child.id}`);
  state = choose(state, 'curiosity');
  const afterNurture = state;
  const ignored = engine.chooseAction(state, `lineage_nurture_${child.id}`);
  assert.equal(ignored.day, afterNurture.day, 'care has an honest cooldown and cannot be spammed for inherited skills');
  assert.equal(ignored.hero.gold, afterNurture.hero.gold);
  state = grow(state, 25);
  assert.ok(state.life.children[0].age >= 6);
  state = act(state, `lineage_school_${child.id}`);
  state = choose(state, 'public');
  for (let lesson = 0; lesson < 6; lesson += 1) {
    if (lesson) state = workDays(state,30);
    state = act(state, `lineage_lesson_${child.id}`);
  }
  const learning = state.lineage.people.find(p => p.source === 'child' && p.localId === child.id).development;
  assert.equal(learning.education.attendance, 6);
  assert.ok(learning.education.qualifications.some(q => q.route === 'public'));
  state = grow(state, 30);
  for(let year=0;state.careers.records.Blacksmith.mastery<4&&year<6;year+=1)state=workDays(state,365);
  assert.equal(state.careers.records.Blacksmith.mastery, 4);
  assert.ok(state.workshop.crafting >= 1, 'actual smith work develops crafting without a combat class');
  for (const [material, count] of Object.entries({ ore: 4, wood: 4, cloth: 3 })) {
    while (state.equipment.materials[material] < count) state = act(state, `career_buy_${material}`);
  }
  const beforeMasterwork = structuredClone(state);
  state = finishBatch(act(state, 'career_masterwork'));
  assert.equal(state.event?.id, 'career_legacy');
  state = choose(state, 'household');
  assert.equal(state.careers.masterworks.length, 1);
  assert.equal(state.day - beforeMasterwork.day, 14);
  assert.equal(beforeMasterwork.hero.gold - state.hero.gold-(state.householdBudget.paidGold-beforeMasterwork.householdBudget.paidGold), 35, 'the upfront masterwork fee remains distinct from actual calendar living costs');
  for (const [material, count] of Object.entries({ ore: 4, wood: 4, cloth: 3 })) assert.equal(beforeMasterwork.equipment.materials[material] - state.equipment.materials[material], count);
  state = act(state, `lineage_heir_${child.id}`);
  state = act(state, 'retire');
  state = choose(state, 'settle');
  assert.equal(state.phase, 'retired');
  assert.equal(state.lineage.heroDeath, null, 'retirement keeps the parent alive');
  const closed = structuredClone(state);
  const successor = transition(state, value => engine.continueAsChild(value, child.id));
  const offeredSuccessor = act(closed, `lineage_continue_${child.id}`);
  assert.deepEqual(offeredSuccessor, successor, 'the actual advertised UI action continues the same child as the public continuation API');
  assert.equal(successor.dynasty.generation, 2);
  assert.equal(successor.hero.name, child.name);
  assert.equal(successor.timeline.birthDay, child.bornDay);
  assert.equal(successor.day, closed.day, 'inheritance never rewinds the world calendar');
  assert.equal(successor.age, Math.floor((closed.day - child.bornDay) / 365));
  assert.equal(successor.hero.path, 'unformed');
  assert.equal(successor.hero.profession, 'Unemployed');
  assert.deepEqual(successor.hero.skills, closed.lineage.people.find(p=>p.source==='child'&&p.localId===child.id).development.skills, 'a child inherits their actual lessons and family learning, with no parent expertise');
  assert.deepEqual(successor.world, closed.world, 'roads, names, laws and settlement changes belong to the same world');
  assert.deepEqual(successor.equipment, { ...closed.equipment, equipped: { weapon: null, armor: null, trinket: null } });
  for (const field of ['structures', 'sites', 'history']) assert.deepEqual(successor.workshop[field], closed.workshop[field], 'inherited buildings and their actual resource history survive');
  assert.equal(successor.workshop.crafting, 0, 'toolwork is learned knowledge, not inherited property');
  assert.deepEqual(successor.careers.shop, closed.careers.shop, 'the earned smithy and its real employees remain physical family property');
  assert.deepEqual(successor.careers.masterworks, closed.careers.masterworks, 'the retired maker’s signed works remain recorded under their name');
  const inheritedCareerIds=new Set(closed.careers.history.map(r=>r.id)),retainedCareer=successor.careers.history.filter(r=>inheritedCareerIds.has(r.id)),newCareer=successor.careers.history.filter(r=>!inheritedCareerIds.has(r.id));
  assert.ok(newCareer.length>0,'succession adds its own real career receipt');assert.equal(successor.careers.history.length,Math.min(120,closed.careers.history.length+newCareer.length),'the existing bounded history retains its actual cap');assert.deepEqual(retainedCareer,closed.careers.history.slice(-retainedCareer.length),'every retained parent entry remains exact; only cap overflow can leave the short history');
  assert.equal(successor.careers.records.Blacksmith.experience, 0, 'a child does not inherit the parent’s professional expertise');
  const distribution = successor.dynasty.history.at(-1).inheritance;
  assert.equal(successor.hero.gold + distribution.shares.reduce((sum, share) => sum + share.gold, 0), closed.hero.gold, 'the estate is divided, never duplicated');
  assert.equal(successor.life.people.find(p => p.id === 'kin').name, closed.hero.name);
  assert.equal(successor.life.people.find(p => p.id === 'kin').alive, true);
  assert.ok(successor.education.qualifications.some(q => q.route === 'community'));
  assert.deepEqual(successor.journal.slice(0, closed.journal.length), closed.journal);
  assert.equal(successor.journal.at(-1).day, closed.day);
  assert.equal(successor.journal.at(-1).generation, 2);
  let nextBirthday = grow(successor, successor.age + 1);
  assert.equal(nextBirthday.day, child.bornDay + nextBirthday.age * 365);
  assert.equal(nextBirthday.dynasty.generation, 2);
  nextBirthday = act(nextBirthday, 'school_enroll_community');
  const scholarship = nextBirthday.hero.skills.scholarship;
  nextBirthday = act(nextBirthday, 'school_attend');
  assert.equal(nextBirthday.hero.skills.scholarship, scholarship + 1, 'the actual successor can continue their own schooling');
});

test('an interrupted work agreement credits actual days once and survives birthday export and resume', () => {
  let state = engine.migrateSave(legacy.states.beforeBirthday);delete state.worldServicesVersion; // Exercise an admitted legacy batch, not a new modern annual-work start.
  const before = structuredClone(state);
  state = act(state, 'career_batch_month');
  assert.equal(state.day - before.day, 1);
  assert.equal(state.event.id, 'birth_adult_year');
  assert.equal(state.careers.batch.completedDays, 1);
  assert.equal(state.careers.batch.remainingDays, 29);
  const wage = state.careers.batch.wage;
  assert.equal(state.hero.gold - before.hero.gold, Math.floor(wage / 3));
  const imported = engine.migrateSave(JSON.parse(JSON.stringify(state)));
  assertCapturedMigration(state,imported);assert.deepEqual(engine.migrateSave(imported),imported);
  state = settle(imported);
  const paidAtBirthday = state.hero.gold;
  const livingPaidAtBirthday=state.householdBudget.paidGold;
  state = finishBatch(act(state, 'career_batch_continue'));
  assert.equal(state.day, before.day + 30);
  assert.equal(state.hero.gold - paidAtBirthday+state.householdBudget.paidGold-livingPaidAtBirthday, Math.floor(wage * 30 / 3) - Math.floor(wage / 3), 'gross remaining wages exclude money already paid and automatic age-up income; actual household costs are recorded separately');
  assert.equal(state.careers.records.Unemployed.workedDays, 30);
  const alreadyComplete = engine.chooseAction(state, 'career_batch_continue');
  assert.equal(alreadyComplete.day, state.day);
  assert.equal(alreadyComplete.hero.gold, state.hero.gold);
});

test('genuine pending roads and paid shelter projects retain their original commitment through migration', () => {
  for (const key of ['pendingRoad', 'pendingProject']) {
    let state = engine.migrateSave(legacy.states[key]);
    const snapshot = structuredClone(state);
    state = choose(state, 'curiosity');
    if (key === 'pendingRoad') {
      state = transition(state, value => engine.continueJourney(value));
      assert.equal(state.locationId, snapshot.timeline.journey.destinationId);
      assert.equal(state.timeline.journey, null);
      assert.equal(state.travel.pending, null, 'old journeys receive no retroactive encounter');
      assert.equal(state.travel.history.length, 0);
    } else {
      const remaining = snapshot.workshop.project.remainingDays;
      const materialSnapshot = structuredClone(state.equipment.materials);
      const gold = state.hero.gold;
      state = act(state, 'workshop_continue');
      assert.equal(state.day - snapshot.day, remaining);
      assert.equal(state.hero.gold, gold, 'committed shelter supplies and fee are not charged after migration');
      assert.deepEqual(state.equipment.materials, materialSnapshot);
      assert.equal(state.workshop.project, null);
      assert.equal(state.workshop.structures.filter(building => building.type === 'shelter').length, 1);
      const repeat = engine.chooseAction(state, 'workshop_continue');
      assert.equal(repeat.day, state.day);
      assert.deepEqual(repeat.workshop.structures, state.workshop.structures);
    }
    assert.deepEqual(state.world.map, snapshot.world.map);
    saveable(state);
  }
});

test('a genuine old midbattle retains its exact next turn and resolves party resources and rewards once', () => {
  let state = engine.migrateSave(legacy.states.midbattle);
  const original = legacy.states.midbattle.battle;
  const target = original.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id;
  const first = takeBattleAction(original, 'attack', target);
  assert.deepEqual(takeBattleAction(state.battle, 'attack', target), first, 'migration never rerolls combat state or the next result');
  let battle = first;
  for (let turn = 0; !battle.outcome && turn < 120; turn += 1) {
    const enemy = battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0);
    battle = takeBattleAction(battle, 'attack', enemy?.id);
  }
  assert.equal(battle.outcome, 'victory');
  const gold = state.hero.gold;
  state = transition(state, value => engine.resolveBattle(value, battle));
  assert.equal(state.battle, null);
  const hero = battle.actors.find(actor => actor.id === 'hero');
  assert.equal(state.hero.hp, hero.hp);
  assert.equal(state.hero.mp, hero.mp);
  assert.equal(state.hero.potions, battle.potions);
  assert.equal(state.hero.gold - gold, battle.rewards.gold);
  const duplicate = engine.resolveBattle(state, battle);
  assert.equal(duplicate.hero.gold, state.hero.gold);
  assert.deepEqual(duplicate.journal, state.journal, 'the same encounter cannot be rewarded or recorded twice');
});

test('actual local rest, healer review and support spend their displayed costs without changing anyone’s knowledge or allegiance', () => {
  let state = engine.migrateSave(legacy.states.adult18);
  for (const id of ['health_rest', 'health_clinic', 'health_support']) {
    const descriptor = engine.getActions(state).find(action => action.id === id);
    const before = structuredClone(state);
    state = act(state, id);
    assert.equal(state.day - before.day, descriptor.days);
    assert.equal(before.hero.gold - state.hero.gold, descriptor.cost);
    assert.deepEqual(state.factions, before.factions);
    assert.deepEqual(state.legal, before.legal);
    for (let person = 0; person < before.life.people.length; person += 1) assert.deepEqual(state.life.people[person].knownFacts, before.life.people[person].knownFacts);
  }
  assert.ok(state.health.care.restUntil > state.day);
  assert.ok(state.health.care.medicineUntil > state.day);
  assert.ok(state.health.care.supportUntil > state.day);
  assert.ok(state.health.history.some(entry => entry.title === 'Care offered without judgment'));
});

function finishRoad(state) {
  const policies = { travel_messenger:'continue',travel_pilgrims:'continue',travel_grave_robber:'continue',travel_fortune:'continue',travel_wagon:'continue',travel_relic:'continue', travel_lore: 'record', travel_witness: 'listen', travel_caravan: 'share', travel_sick_traveler: 'aid', travel_bandits: 'avoid', travel_beasts: 'avoid', travel_weather: 'shelter', travel_delay: 'continue' };
  for (let step = 0; step < 80 && (state.timeline.journey || state.event); step += 1) {
    if (state.event) state = policies[state.event.id] ? choose(state, policies[state.event.id]) : settle(state);
    else state = transition(state, value => engine.continueJourney(value));
  }
  assert.equal(state.timeline.journey, null);
  assert.equal(state.travel.pending, null);
  return state;
}

test('prepared roads produce actual noncombat meetings and saved danger choices without rerolls, teleportation or forced combat', () => {
  const plan = { pace: 'fast', supplies: false, scout: false, escort: false, night: false };
  let scholar=engine.migrateSave(legacy.states.adult18);delete scholar.trail;scholar=transition(scholar,value=>engine.updateTravelPlan(value,plan));
  const before = structuredClone(scholar);
  scholar = transition(scholar, value => engine.travelTo(value, 'forest'));
  assert.equal(scholar.event.id, 'travel_lore');
  const paused = JSON.parse(JSON.stringify(scholar));
  assert.ok(scholar.timeline.journey.legs[0].checked);
  scholar = choose(scholar, 'record');
  const imported=engine.migrateSave(paused);delete imported.trail;
  const replay = choose(imported, 'record');
  assert.deepEqual(JSON.parse(JSON.stringify(scholar)), replay, 'a saved road meeting and inscription do not reroll');
  scholar = finishRoad(scholar);
  assert.equal(scholar.locationId, 'forest');
  assert.equal(scholar.hero.skills.scholarship, before.hero.skills.scholarship + 1);
  assert.equal(scholar.travel.discoveries.length, 1);
  assert.equal(scholar.hero.gold, before.hero.gold, 'unprepared departure and recording a stone have no invented payment');
  assert.deepEqual(scholar.world, before.world);

  let traveler=engine.migrateSave(legacy.states.professional);delete traveler.trail;traveler=transition(traveler,value=>engine.updateTravelPlan(value,plan));
  traveler = finishRoad(transition(traveler, value => engine.travelTo(value, 'forest')));
  traveler = finishRoad(transition(traveler, value => engine.travelTo(value, 'ruin')));
  traveler = transition(traveler, value => engine.travelTo(value, 'mountain'));
  assert.equal(traveler.event.id, 'travel_bandits');
  const decision = JSON.parse(JSON.stringify(traveler));
  const gold = traveler.hero.gold;
  const day = traveler.day;
  const detour = choose(traveler, 'avoid');
  assert.equal(detour.day - day, 1);
  assert.equal(detour.hero.gold, gold);
  assert.equal(detour.battle, null, 'the explicitly offered free detour avoids a fight');
  const restored=engine.migrateSave(decision);delete restored.trail;assert.deepEqual(choose(restored, 'avoid'), JSON.parse(JSON.stringify(detour)));
  const arrived = finishRoad(detour);
  assert.equal(arrived.locationId, 'mountain');
  assert.equal(arrived.hero.gold, gold, 'safe choices never silently charge a toll');
  for (let index = 0; index < traveler.life.people.length; index += 1) assert.deepEqual(arrived.life.people[index].knownFacts, traveler.life.people[index].knownFacts, 'road witnesses do not learn undisclosed personal facts');

  let fighting = choose(engine.migrateSave(decision), 'fight');
  assert.ok(fighting.battle);
  assert.equal(fighting.battle.context.kind, 'travel');
  assert.deepEqual(fighting.timeline.journey, traveler.timeline.journey, 'combat preserves the exact checked leg and remaining road');
  let battle = fighting.battle;
  const savedBattle = JSON.parse(JSON.stringify(fighting));
  const target = battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id;
  const turn = takeBattleAction(battle, 'attack', target);
  assert.deepEqual(takeBattleAction(engine.migrateSave(savedBattle).battle, 'attack', target), turn);
  battle = turn;
  for (let round = 0; !battle.outcome && round < 80; round += 1) battle = takeBattleAction(battle, 'attack', battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0)?.id);
  assert.ok(['victory', 'defeat'].includes(battle.outcome));
  fighting = transition(fighting, value => engine.resolveBattle(value, battle));
  assert.equal(fighting.travel.pending, null);
  const once = fighting.hero.gold;
  assert.equal(engine.resolveBattle(fighting, battle).hero.gold, once);
  fighting = finishRoad(fighting);
  assert.equal(fighting.locationId, 'mountain');
  assert.equal(fighting.travel.history.filter(entry => entry.result === battle.outcome).length, 1, 'combat on one checked leg resolves exactly once');
});


test('paid preparations use the quoted road time and departure fee once through a saved journey', () => {
  let state = engine.migrateSave(legacy.states.professional);delete state.trail;
  const beforeSetting = structuredClone(state);
  state = transition(state, value => engine.updateTravelPlan(value, { pace: 'cautious', supplies: true, scout: true, escort: true, night: false }));
  assert.equal(state.day, beforeSetting.day, 'choosing a plan does not secretly start a journey');
  assert.equal(state.hero.gold, beforeSetting.hero.gold);
  const quote = travelPlanPreview(state, 'forest');
  assert.ok(quote.cost > 0);
  const before = structuredClone(state);
  state = transition(state, value => engine.travelTo(value, 'forest'));
  assert.equal(before.hero.gold - state.hero.gold, quote.cost, 'the exact preparation fee is paid at departure');
  if (state.timeline.journey) assert.equal(state.timeline.journey.legs.reduce((total, leg) => total + leg.totalDays, 0), quote.days);
  state = finishRoad(engine.migrateSave(JSON.parse(JSON.stringify(state))));
  assert.equal(state.locationId, 'forest');
  assert.equal(state.day - before.day, quote.days, 'cautious travel and the scouting day use the actual planned leg durations');
  assert.equal(before.hero.gold - state.hero.gold, quote.cost, 'resume cannot charge a second supplies, escort or scouting fee');
});
