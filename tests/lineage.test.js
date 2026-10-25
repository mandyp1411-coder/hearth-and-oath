import test from 'node:test';
import {positionAtContact} from './helpers/contact-position.mjs';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../dist/js/engine.js';
import { initializeLineage, lineageActions, applyLineageAction, applyLineageChoice, onLineageTime, flushLineageEvent, completeLineageHistory, createSuccessor, lineageView, validateLineage } from '../dist/js/lineage.js';
import { lifeActions, startYearPlan, continueYearPlan, applyLifeChoice, familyAnnualScene, applyFamilyAnnualChoice } from '../dist/js/life.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url)));
const parent = () => engine.migrateSave(structuredClone(fixture.states.parent));
const row = (s, source, id) => s.lineage.people.find(p => p.source === source && p.localId === id);
const childLearning = (s, id = 'child-1') => row(s, 'child', id).development;
function context(s) {
  return {
    journal(title, text, tag) { s.journal.push({ id: `unit-${s.journal.length}`, day: s.day, age: s.age, generation: s.dynasty.generation, title, text, tag }); },
    setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; },
    standing() {}, earnExperience() {}, addObligation() {}, finishObligation() {}, remember() {},
    nextInterruptionDay() { return null; }, pendingNeed() { return null; },
    spendDays(days) { advance(s, days, this); return days; },
  };
}
function advance(s, days, ctx = context(s)) {
  const oldDay = s.day; s.day += days;
  s.age = Math.floor((s.day - (s.timeline.birthDay || 0)) / 365);
  for (const p of [...s.life.people, ...s.life.children, ...s.companions]) {
    const day = p.alive === false && Number.isInteger(p.deathDay) ? p.deathDay : s.day;
    p.age = Number.isInteger(p.bornDay) ? Math.max(0, Math.floor((day - p.bornDay) / 365)) : p.baseAge + Math.floor(day / 365);
  }
  onLineageTime(s, { oldDay, newDay: s.day, outdoors: false }, ctx);
}
function act(s, id, ctx = context(s)) {
  const a = lineageActions(s).find(a => a.id === id);
  assert.ok(a && !a.disabledReason, `${id} is available: ${a?.disabledReason}`);
  s.hero.gold -= a.cost; advance(s, a.days, ctx);
  assert.equal(applyLineageAction(s, id, ctx), true);
}
function choose(s, id, ctx = context(s)) {
  const event = s.event;
  assert.ok(event.choices.some(c => c.id === id)); s.event = null;
  assert.equal(applyLineageChoice(s, event.id, id, ctx), true);
}
function schoolAge(s, age = 12) {
  advance(s, Math.max(0, s.life.children[0].bornDay + age * 365 - s.day));
  return s;
}
function retire(s, reason = 'retirement') {
  s.phase = 'retired'; s.event = null; s.chronicle = `${s.hero.name}'s actual family chapter.`;
  completeLineageHistory(s, reason); return s;
}
function publicAction(s,id){
 if(/^life_(separate|endcourt)_/.test(id))s=positionAtContact(s,id.replace(/^life_(separate|endcourt)_/,''));
 if(id.startsWith('life_home_')){s=structuredClone(s);syncCartography(s);for(const room of settlementWalkPath(s,'homes'))s=engine.chooseAction(s,'atlas_room_'+room);}
  const action = engine.getActions(s).find(a => a.id === id);
  assert.ok(action && !action.disabledReason, `${id}: ${action?.disabledReason}`);
  const before = structuredClone(s), next = engine.chooseAction(s, id);
  assert.deepEqual(s, before); assert.equal(engine.validateSave(next), true); return next;
}
function settle(s, wanted) {
  for (let guard = 0; guard < 40 && s.event; guard++) {
    const id = wanted || s.event.choices[0].id; wanted = null;
    s = engine.chooseEventOption(s, id); assert.equal(engine.validateSave(s), true);
  }
  assert.equal(s.event, null); return s;
}
function grow(s, age) {
  for (let guard = 0; guard < 150 && (s.age < age || s.event || s.timeline.yearTarget !== null); guard++) {
    if (s.event) {
      const policy = { health_concern: 'support', lineage_bereavement: 'share', career_year: 'care', deadline_review: 'pause', life_birthday: 'people' };
      // One rulebook (v0.72.2): an untreated wound or fever can kill, so a health concern takes the best open care.
      const care = ['care', 'rest', 'support', 'routine', 'continue'].find(id => s.event.choices.some(c => c.id === id && !c.disabledReason));
      const choice = s.event.id.startsWith('birth_') ? s.event.choices.some(c => c.id === 'care') ? 'care' : 'curiosity' : s.event.id === 'health_concern' ? care : policy[s.event.id];
      assert.ok(choice, `A lawful continuation needs a policy for ${s.event.id}`);
      s = settle(s, choice);
    } else s = s.timeline.yearTarget === null ? engine.ageUp(s) : engine.continueAgeUp(s);
    assert.equal(engine.validateSave(s), true);
  }
  assert.equal(s.age, age); assert.equal(s.timeline.yearTarget, null); return s;
}

test('lineage migration adds deterministic dates and relationships without rewriting authentic pending lives', () => {
  for (const original of Object.values(fixture.states)) {
    const s = structuredClone(original), before = structuredClone(s);
    initializeLineage(s, { migration: true });
    for (const field of Object.keys(before)) assert.deepEqual(s[field], before[field], `${field} is unchanged`);
    assert.equal(s.lineage.lastDay, before.day);
    assert.equal(s.lineage.grief.length, 0, 'no death is triggered by import');
    assert.equal(s.lineage.queue.length, 0);
    assert.equal(s.dynasty.generation, 1);
    const initialized = structuredClone(s); initializeLineage(s, { migration: true });
    assert.deepEqual(s, initialized, 'repeated initialization adds neither people nor estate money');
    assert.equal(validateLineage(s.lineage, s), true);
  }
});

test('fresh lineage records actual named birth parents and respects an orphan’s recorded deceased parents', () => {
  const intact = engine.createBirthGame({ seed: 'two-real-parents', familySetup: 'two_parents', household: 'poor' });
  const p = row(intact, 'hero', 'hero');
  assert.equal(p.parentIds.length, 2);
  assert.ok(p.parentIds.every(id => intact.lineage.people.some(a => a.id === id && a.source === 'life' && a.alive)));
  const orphan = engine.createBirthGame({ seed: 'lost-real-parents', familySetup: 'orphan', household: 'poor' });
  const ancestry = row(orphan, 'hero', 'hero').parentIds.map(id => orphan.lineage.people.find(a => a.id === id));
  assert.equal(ancestry.length, 2);
  assert.ok(ancestry.every(a => !a.alive && a.bornDay === null && a.deathDay === null));
  assert.equal(orphan.life.people.find(p => p.id === 'kin').familyRole, 'guardian');
  assert.equal(engine.validateSave(orphan), true);
});

test('an existing willing partnership can become a marriage, with the displayed preparations charged once', () => {
  const old = parent(), before = structuredClone(old);
  let s = publicAction(old, 'lineage_marry');
  assert.equal(s.day - before.day, 2); assert.equal(before.hero.gold - s.hero.gold, 12);
  assert.equal(s.lineage.unions[0].kind, 'pledge');
  s = settle(s, 'vow');
  assert.equal(s.lineage.unions[0].kind, 'marriage');
  assert.equal(s.lineage.unions[0].partnerId, row(s, 'life', 'fellow').id);
  assert.ok(s.life.people.find(p => p.id === 'fellow').memories.some(m => m.includes('marriage vow')));
  assert.ok(engine.getActions(s).find(a => a.id === 'lineage_marry').disabledReason);
  const ignored = engine.chooseAction(s, 'lineage_marry');
  assert.equal(ignored.day, s.day); assert.equal(ignored.hero.gold, s.hero.gold);
  assert.deepEqual(old, before, 'the saved pre-wedding life remains immutable');
});

test('marriage does not bypass consent, childhood, loss, or location requirements', () => {
  for (const mutate of [s => s.life.people.find(p => p.id === 'fellow').bond = 69, s => s.age = 17, s => s.locationId = 'forest']) {
    const s = parent(); mutate(s); const before = structuredClone(s);
    assert.equal(applyLineageAction(s, 'lineage_marry', context(s)), false);
    assert.deepEqual(s, before);
  }
  const s = parent(); s.life.partnerId = null;
  assert.equal(lineageActions(s).some(a => a.id === 'lineage_marry'), false);
});

test('early care shapes this child’s traits; older care teaches actual child skills, with a real cooldown', () => {
  const s = parent(), ctx = context(s), own = structuredClone(s.hero.skills);
  act(s, 'lineage_nurture_child-1', ctx); choose(s, 'curiosity', ctx);
  const d = childLearning(s);
  assert.equal(d.traits.curiosity, 1); assert.ok(Object.values(d.skills).every(n => n === 0));
  assert.deepEqual(s.hero.skills, own);
  const ignored = structuredClone(s);
  assert.equal(applyLineageAction(s, 'lineage_nurture_child-1', ctx), false);
  assert.deepEqual(s, ignored, 'failed care cannot leave a new pending scene');
  schoolAge(s, 10);
  act(s, 'lineage_nurture_child-1', ctx); choose(s, 'courage', ctx);
  assert.equal(d.skills.survival, 1); assert.equal(d.skills.weapons, 1);
  assert.deepEqual(s.hero.skills, own);
});

test('school access requires six actual sessions, and a new route cannot reuse old attendance', () => {
  const s = schoolAge(parent()), ctx = context(s), own = structuredClone(s.hero.skills);
  s.hero.gold = 100;
  act(s, 'lineage_school_child-1', ctx); choose(s, 'public', ctx);
  const d = childLearning(s);
  assert.equal(d.education.attendance, 0); assert.equal(d.education.qualifications.length, 0);
  for (let n = 0; n < 6; n++) {
    if (n) advance(s, 30, ctx);
    act(s, 'lineage_lesson_child-1', ctx);
    assert.equal(d.education.qualifications.length, n === 5 ? 1 : 0);
  }
  assert.equal(d.skills.scholarship, 6); assert.equal(d.skills.persuasion, 6);
  assert.deepEqual(s.hero.skills, own);
  act(s, 'lineage_school_child-1', ctx);
  const feeBefore = s.hero.gold; choose(s, 'academy', ctx);
  assert.equal(feeBefore - s.hero.gold, 20); assert.equal(d.education.attendance, 0);
  advance(s, 30, ctx); const lessonFee = s.hero.gold;
  act(s, 'lineage_lesson_child-1', ctx);
  assert.equal(lessonFee - s.hero.gold, 4); assert.equal(d.education.attendance, 1);
  assert.equal(d.education.qualifications.length, 1, 'the prior community certificate survives without inventing an academy certificate');
  assert.equal(validateLineage(s.lineage, s), true);
});

test('an unaffordable academy decision keeps the same school question and a free route open', () => {
  let s = schoolAge(parent()); s.hero.gold = 0;
  const ctx = context(s); act(s, 'lineage_school_child-1', ctx);
  const before = structuredClone(s);
  s = engine.chooseEventOption(s, 'academy');
  assert.equal(s.event.id, before.event.id); assert.deepEqual(s.lineage.pending, before.lineage.pending);
  assert.equal(s.hero.gold, 0); assert.equal(childLearning(s).education.route, null);
  s = engine.chooseEventOption(s, 'public');
  assert.equal(s.event, null); assert.equal(childLearning(s).education.route, 'public');
});

test('a partner’s death widows the actual household, freezes their age and queues named grief without overwriting a scene', () => {
  const s = parent(), ctx = context(s), partner = row(s, 'life', 'fellow');
  for (const p of s.lineage.people) if (p.alive) p.deathAge = 500;
  partner.deathAge = 31;
  const date = partner.bornDay + 31 * 365;
  s.event = { id: 'an-existing-question', choices: [{ id: 'stay' }] };
  advance(s, date + 2 - s.day, ctx);
  assert.equal(s.event.id, 'an-existing-question'); assert.equal(flushLineageEvent(s, ctx), false);
  const actual = s.life.people.find(p => p.id === 'fellow');
  assert.equal(actual.alive, false); assert.equal(actual.age, 31); assert.equal(actual.deathDay, date);
  assert.equal(s.life.partnerId, null); assert.equal(s.lineage.unions[0].endReason, 'widowed');
  assert.equal(s.lineage.unions[0].endedDay, date);
  assert.equal(lifeActions(s).some(a => a.id === 'life_visit_fellow'), false);
  assert.ok(s.journal.some(j => j.text.includes(partner.name) && j.text.includes('age 31')));
  s.event = null; assert.equal(flushLineageEvent(s, ctx), true);
  assert.ok(s.event.body.includes(partner.name)); choose(s, 'memorial', ctx);
  assert.equal(s.lineage.grief[0].remembered, true); assert.equal(s.lineage.queue.length, 0);
  const count = s.journal.length; onLineageTime(s, { oldDay: s.day, newDay: s.day }, ctx);
  assert.equal(s.journal.length, count); assert.equal(flushLineageEvent(s, ctx), false);
  advance(s, 10, ctx); assert.equal(actual.age, 31);
  assert.equal(validateLineage(s.lineage, s), true);
});

test('a deceased companion leaves the active party, while an archived namesake never kills a new companion', () => {
  const s = parent(), ctx = context(s), actual = s.companions[0], record = row(s, 'companion', actual.id);
  actual.active = true; actual.recruited = true;
  record.deathAge = Math.floor((s.day - record.bornDay) / 365) + 1;
  advance(s, record.bornDay + record.deathAge * 365 - s.day, ctx);
  assert.equal(actual.alive, false); assert.equal(actual.active, false); assert.equal(actual.recruited, false);
  const newer = s.companions[1], oldName = `Historical ${newer.name}`;
  s.lineage.people.push({ ...structuredClone(row(s, 'companion', newer.id)), id: 'an-archived-namesake', name: oldName, source: 'ancestor', bornDay: s.day - 30 * 365 + 1, deathAge: 30, alive: true, deathDay: null });
  advance(s, 1, ctx);
  assert.equal(newer.alive, undefined, 'the new companion remains living');
  assert.equal(s.lineage.people.find(p => p.id === 'an-archived-namesake').alive, false);
});

test('a recorded child continues in the same world, with conserved estate cash and their own learned skills', () => {
  const s = schoolAge(parent(), 10), ctx = context(s);
  act(s, 'lineage_nurture_child-1', ctx); choose(s, 'curiosity', ctx);
  s.hero.gold = 101; s.hero.skills.weapons = 50; s.workshop.crafting = 17; s.workshop.patterns=['duelist'];
  retire(s); const before = structuredClone(s);
  const next = createSuccessor(s, 'child-1', engine.createBirthGame);
  assert.ok(next); assert.equal(engine.validateSave(next), true);
  assert.deepEqual(s, before);
  assert.equal(next.day, s.day); assert.equal(next.timeline.birthDay, s.life.children[0].bornDay);
  assert.equal(next.hero.name, s.life.children[0].name); assert.equal(next.age, s.life.children[0].age);
  assert.deepEqual(next.hero.skills, childLearning(s).skills); assert.equal(next.hero.skills.weapons, 0);
  assert.equal(next.hero.path, 'unformed'); assert.equal(next.hero.specialization, null); assert.equal(next.hero.condition, null);
  assert.equal(next.hero.profession, 'Unemployed'); assert.equal(next.life.career.rank, 0);
  assert.equal(next.workshop.crafting, 0); assert.equal(next.workshop.patterns,undefined); assert.deepEqual(next.workshop.structures, s.workshop.structures);
  assert.deepEqual(next.world, s.world); assert.deepEqual(next.lore.records, s.lore.records);
  assert.equal(next.dynasty.generation, 2); assert.equal(next.hero.gold, 51);
  assert.equal(next.dynasty.history[0].inheritance.shares[0].gold, 50);
  assert.equal(next.life.people.find(p => p.id === 'kin').name, s.hero.name);
  assert.equal(next.life.people.find(p => p.id === 'kin').alive, true);
  assert.deepEqual(next.journal.slice(0, s.journal.length), s.journal);
  assert.ok(next.journal.slice(s.journal.length).every(j => j.generation === 2));
  assert.equal(next.life.people.find(p => p.id === 'family_sibling_1').name, s.life.children[1].name);
  assert.equal(next.family.members.find(m => m.personId === 'family_sibling_1').biological, false, 'a real adopted sibling belongs to the family without invented genetic ties');
});

test('a deceased parent remains named and frozen in an orphan successor’s family, with an actual living guardian', () => {
  const s = schoolAge(parent(), 7);
  s.life.partnerId = null;
  // A single-parent child has the recorded parent; removing a co-parent here
  // isolates succession’s guardian response to the lifecycle death hook.
  row(s, 'child', 'child-1').parentIds = [s.dynasty.activePersonId];
  retire(s, 'A recorded mortal illness ended this life.');
  const next = createSuccessor(s, 'child-1', engine.createBirthGame);
  assert.ok(next); assert.equal(engine.validateSave(next), true);
  const dead = next.life.people.find(p => p.id === 'kin');
  assert.equal(dead.name, s.hero.name); assert.equal(dead.alive, false);
  assert.equal(dead.deathDay, s.day); assert.equal(dead.age, s.age);
  assert.ok(next.life.people.some(p => p.familyRole === 'guardian' && p.alive));
  assert.equal(next.family.members.find(m => m.personId === 'kin').availability, 'deceased');
  advance(next, 1); assert.equal(dead.age, s.age);
});

test('authentic covenant endings and destroyed settlements survive actual adoption, retirement and succession', () => {
  for (const id of ['renew', 'shatter']) {
    let s = engine.migrateSave(JSON.parse(readFileSync(new URL(`./fixtures/campaign-${id}.json`, import.meta.url))));
    assert.equal(engine.validateSave(s), true);
    const ending = structuredClone(s.campaign.ending);
    s = engine.travelTo(s, 'city');
    for (let guard = 0; guard < 40 && (s.event || s.timeline.journey); guard++) {
      if (s.event) s = settle(s);
      else s = engine.continueJourney(s);
      assert.equal(engine.validateSave(s), true);
    }
    assert.equal(s.locationId, 'city');
    s = publicAction(s, 'life_home_cottage'); s = settle(s);
    s = publicAction(s, 'life_family'); s = settle(s, 'adopt');
    const child = s.life.children[0]; assert.ok(child);
    s = grow(s, 30);
    s = publicAction(s, 'retire'); s = settle(s, 'settle');
    const old = structuredClone(s), next = engine.continueAsChild(s, child.id);
    assert.equal(next.dynasty.generation, 2); assert.equal(engine.validateSave(next), true);
    assert.deepEqual(next.world, old.world); assert.deepEqual(next.campaign.ending, ending);
    assert.equal(next.campaign.stage, 'complete'); assert.equal(next.campaign.pending, null);
    assert.equal(next.campaign.facts.originalNotesReturned, undefined, 'the child has not read the parent’s private evidence');
    assert.equal(next.hero.birthplaceId, next.locationId);
    if (id === 'shatter') assert.equal(next.world.locations.find(p => p.id === 'home').status, 'destroyed');
  }
});

test('deceased relatives, friends and children cannot become speaking actors or receive new secrets in annual life scenes', () => {
  const s = parent(), ctx = context(s);
  for (const p of s.life.people) p.alive = false;
  for (const c of s.life.children) c.alive = false;
  s.life.partnerId = null; s.life.focus = 'education'; s.hero.profession = 'Scholar';
  const memories = structuredClone(s.life.people.map(p => [p.memories, p.knownFacts]));
  startYearPlan(s, {}, ctx);
  const forbidden = ['life_family_roof', 'life_friend_ambition', 'life_friend_ward', 'life_scholar_citation', 'life_rival_race', 'life_ancestor_chair', 'life_noble_table', 'life_vampire_guest', 'life_wolf_confidant', 'life_child_school', 'life_child_question'];
  for (let guard = 0; guard < 30 && s.life.plan; guard++) {
    if (s.event) {
      assert.ok(!forbidden.includes(s.event.id));
      const event = s.event; s.event = null;
      assert.equal(applyLifeChoice(s, event.id, event.choices[0].id, ctx), true);
    } else continueYearPlan(s, ctx);
  }
  assert.deepEqual(s.life.people.map(p => [p.memories, p.knownFacts]), memories);
});

test('lineage validation rejects missing people, invented parent links, forged grief and invalid learned heir records', () => {
  const initial = parent(); assert.equal(validateLineage(initial.lineage, initial), true);
  const bad = [
    s => s.lineage.people.splice(s.lineage.people.findIndex(p => p.source === 'life' && p.localId === 'river'), 1),
    s => row(s, 'child', 'child-1').parentIds.push(row(s, 'child', 'child-1').id),
    s => row(s, 'child', 'child-1').development.skills.arcana = -1,
    s => row(s, 'child', 'child-1').appearance.hair = 'url(unknown)',
    s => row(s, 'child', 'child-1').adopted = 'yes',
    s => s.lineage.lastDay = s.day + 1,
    s => s.dynasty.generation = 0,
    s => s.lineage.heroDeath = { day: s.day, cause: 'An invented death while still living' },
    s => s.lineage.grief.push({ personId: row(s, 'life', 'kin').id, name: 'An invented person', day: s.day, untilDay: s.day + 365, remembered: false }),
    s => { retire(s); s.dynasty.history[0].inheritance = { gold: 10, estateGold: 5, homeTier: 'cottage', shares: [] }; },
  ];
  for (const mutate of bad) { const s = structuredClone(initial); mutate(s); assert.equal(validateLineage(s.lineage, s), false); }
  const view = lineageView(initial); view.children[0].development.skills.arcana = 999;
  assert.equal(childLearning(initial).skills.arcana, 0, 'inspectable view data is independent');
});

test('new lineage lifespans follow an actual ancestry while existing save lifespans remain exact', () => {
  const elf = engine.createBirthGame({ seed: 'long-family-years', appearance: { ancestry: 'elf' }, familySetup: 'two_parents' });
  const dwarf = engine.createBirthGame({ seed: 'long-family-years', appearance: { ancestry: 'dwarf' }, familySetup: 'two_parents' });
  assert.ok(row(elf, 'hero', 'hero').deathAge >= 145);
  assert.ok(row(dwarf, 'hero', 'hero').deathAge >= 105);
  assert.ok(row(elf, 'life', 'kin').deathAge >= 145, 'a visibly elven parent does not receive a human lifespan');
  const existing = parent(), dates = existing.lineage.people.map(p => [p.id, p.deathAge, p.deathDay]);
  assert.deepEqual(engine.migrateSave(existing).lineage.people.map(p => [p.id, p.deathAge, p.deathDay]), dates);
});

test('a newly adopted child has a seeded individual portrait and tastes that survive genuine succession', () => {
  const old = parent();
  let s = publicAction(old, 'life_family'); s = settle(s, 'adopt');
  const child = s.life.children.at(-1), record = row(s, 'child', child.id);
  assert.equal(record.adopted, true);
  assert.ok(record.appearance && record.preferences);
  assert.deepEqual(record, row(settle(publicAction(parent(), 'life_family'), 'adopt'), 'child', child.id), 'the same real arrival reproduces identity');
  assert.equal(record.parentIds.includes(s.dynasty.activePersonId), true, 'an individual adopted child belongs to the actual household');
  const identity = structuredClone(record); advance(s, 4); registerAgain(s, child);
  assert.deepEqual(row(s, 'child', child.id).appearance, identity.appearance);
  assert.deepEqual(row(s, 'child', child.id).preferences, identity.preferences);
  retire(s); const heir = createSuccessor(s, child.id, engine.createBirthGame);
  assert.equal(engine.validateSave(heir), true);
  assert.deepEqual(heir.hero.appearance, identity.appearance);
  assert.deepEqual(heir.hero.preferences, identity.preferences);
  function registerAgain(state, actual) { onLineageTime(state, { oldDay: state.day - 1, newDay: state.day }, context(state)); }
});

test('every surviving hearth or market settlement permits family life, while wilderness and ruined services do not', () => {
  for (const id of ['home', 'city', 'brook', 'camp', 'coast', 'citadel', 'sanctuary', 'tower']) {
    const s = parent(); s.locationId = id;
    assert.ok(lifeActions(s).some(a => a.id === 'life_family'), `${id} has household consultations`);
    assert.ok(!lineageActions(s).find(a => a.id === 'lineage_marry').disabledReason, `${id} supports a meeting with actual willing partners`);
    const node = s.world.locations.find(p => p.id === id); node.status = 'destroyed';
    assert.equal(lifeActions(s).some(a => a.id === 'life_family'), false);
    assert.ok(lineageActions(s).find(a => a.id === 'lineage_marry').disabledReason);
  }
  const wild = parent(); wild.locationId = 'forest';
  assert.equal(lifeActions(wild).some(a => a.id === 'life_family'), false);
});

test('annual family questions develop the actual child rather than a parent or a fabricated school certificate', () => {
  for (const [age, kind] of [[2, 'small_child'], [8, 'school_child'], [15, 'teen_child'], [22, 'adult_child']]) {
    const s = schoolAge(parent(), age), own = structuredClone(s.hero.skills), child = s.life.children[0], before = structuredClone(childLearning(s));
    const payload = { kind, personId: child.id, choiceId: 'curiosity' };
    assert.equal(applyFamilyAnnualChoice(s, payload, context(s)), true);
    const learned = childLearning(s);
    assert.equal(learned.traits.curiosity, before.traits.curiosity + 1);
    assert.equal(learned.skills.scholarship, before.skills.scholarship + (age >= 3 ? 1 : 0));
    assert.equal(learned.skills.arcana, before.skills.arcana + (age >= 6 ? 1 : 0));
    assert.deepEqual(s.hero.skills, own);
    assert.deepEqual(learned.education, before.education, 'a conversation cannot replace attended school sessions');
    const once = structuredClone(s); assert.equal(applyFamilyAnnualChoice(s, payload, context(s)), false); assert.deepEqual(s, once);
    assert.equal(engine.validateSave(s), true);
  }
});

test('annual family scenes use living actual participants, respect partner work tradeoffs and never disclose secrets', () => {
  const s = schoolAge(parent(), 12), before = structuredClone(s.life.people.find(p => p.id === 'fellow'));
  const first = familyAnnualScene(s);
  assert.ok(first); assert.deepEqual(familyAnnualScene(structuredClone(s)), first);
  assert.deepEqual(first.choices.map(c => c.id), ['care', 'curiosity', 'courage']);
  assert.equal(applyFamilyAnnualChoice(s, { kind: 'partner_time', personId: 'fellow', choiceId: 'courage' }, context(s)), true);
  const partner = s.life.people.find(p => p.id === 'fellow');
  assert.equal(partner.bond, before.bond - 3); assert.deepEqual(partner.knownFacts, before.knownFacts);
  assert.ok(partner.memories.some(m => m.includes('busy work season')));
  const impossible = structuredClone(s); assert.equal(applyFamilyAnnualChoice(s, { kind: 'teen_child', personId: 'no-child', choiceId: 'care' }, context(s)), false); assert.deepEqual(s, impossible);
  assert.equal(engine.validateSave(s), true);
});

test('public separation keeps co-parent links, real children and estate, and permits a later chosen partnership', () => {
  let s = parent();
  const links = s.lineage.people.filter(p => p.source === 'child').map(p => [p.id, [...p.parentIds]]), names = s.life.children.map(c => c.name), estate = structuredClone(s.life.home), cash = s.hero.gold, knowledge = structuredClone(s.life.people.map(p => [p.id, p.knownFacts]));
  s = publicAction(s, 'life_separate_fellow'); s = settle(s, 'stay');
  assert.equal(s.life.partnerId, 'fellow'); assert.equal(s.lineage.unions[0].endedDay, null);
  s = publicAction(s, 'life_separate_fellow'); s = settle(s, 'end');
  assert.equal(s.life.partnerId, null); assert.equal(s.life.people.find(p => p.id === 'fellow').relation, 'friend');
  assert.equal(s.lineage.unions[0].endReason, 'separation'); assert.equal(s.lineage.unions[0].endedDay, s.day);
  assert.deepEqual(s.lineage.people.filter(p => p.source === 'child').map(p => [p.id, p.parentIds]), links);
  assert.deepEqual(s.life.children.map(c => c.name), names); assert.deepEqual(s.life.home, estate); assert.equal(s.hero.gold, cash);
  assert.deepEqual(s.life.people.map(p => [p.id, p.knownFacts]), knowledge);
  assert.equal(s.lineage.grief.length, 0, 'a breakup is not a death');
  s=engine.updateRomanticIdentity(s,{gender:'woman',attraction:'any'});
  while (s.life.people.find(p => p.id === 'river').bond < 55) s = settle(publicAction(s, 'life_visit_river'));
  s = settle(publicAction(s, 'life_court_river'), 'yes');
  while (s.life.people.find(p => p.id === 'river').bond < 70) s = settle(publicAction(s, 'life_visit_river'));
  s = settle(publicAction(s, 'life_commit_river'), 'pledge');
  assert.equal(s.lineage.unions.length, 2); assert.equal(s.lineage.unions[0].endReason, 'separation'); assert.equal(s.lineage.unions[1].endedDay, null);
  assert.deepEqual(s.lineage.people.filter(p => p.source === 'child').map(p => [p.id, p.parentIds]), links, 'a new relationship does not rewrite old children’s parents');
});

test('a courtship can be ended without entering a household pledge, and forged relationship endings are rejected', () => {
  let s = settle(publicAction(parent(), 'life_separate_fellow'), 'end');
  s=engine.updateRomanticIdentity(s,{gender:'woman',attraction:'any'});
  while (s.life.people.find(p => p.id === 'river').bond < 55) s = settle(publicAction(s, 'life_visit_river'));
  s = settle(publicAction(s, 'life_court_river'), 'yes');
  const previous = structuredClone(s);
  s = settle(publicAction(s, 'life_endcourt_river'), 'end');
  assert.equal(s.life.courtshipId, null); assert.equal(s.life.partnerId, null);
  assert.equal(s.life.people.find(p => p.id === 'river').relation, 'friend');
  assert.equal(s.lineage.unions.length, previous.lineage.unions.length);
  const invalid = structuredClone(s); invalid.event = { id: 'life_separation', title: 'A forged ending', category: 'Courtship', body: 'No active partner exists.', choices: [{ id: 'end', label: 'End', description: 'Invalid' }] }; invalid.life.pendingEvent = { personId: 'river' };
  assert.equal(engine.validateSave(invalid), false);
});
