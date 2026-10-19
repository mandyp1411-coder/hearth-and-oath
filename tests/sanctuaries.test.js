import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame } from '../dist/js/engine.js';
import { regionAt } from '../dist/js/realm.js';
import { seededRoll } from '../dist/js/world.js';
import { initializeSanctuaries, onEvidence, sanctuaryActions, applySanctuaryAction, flushSanctuaryEvent, applySanctuaryChoice, onSanctuaryTime, sanctuaryView, validateSanctuaries, onSanctuaryNeed, applySanctuaryNeed, sanctuaryNeedsBypass } from '../dist/js/sanctuaries.js';

function adult(seed = 'boundaries') {
  const s = createBirthGame({ seed, name: 'Merren', birthplace: 'village', household: 'tradesfolk' });
  s.day = 18 * 365; s.age = 18; s.phase = 'adult'; s.event = null; s.locationId = 'home'; s.hero.gold = 120;
  s.hero.skills.stealth = 0; s.hero.attributes.agility = 3;
  for (const p of s.life.people) { p.age = 35; p.locationId = 'home'; p.bond = 80; }
  initializeSanctuaries(s, { reset: true });
  return s;
}
function context(s, attendance = Infinity) {
  return {
    spendDays(days) { const oldDay = s.day, actual = Math.min(attendance, days); s.day += actual; if (s.hero.condition?.type === 'vampire') s.hero.condition.hunger = Math.min(100, s.hero.condition.hunger + actual * 2); onSanctuaryTime(s, { oldDay, newDay: s.day }, this); return actual; },
    setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; }, journal() {}, standing(key, amount) { s.factions[key] += amount; },
    addEvidence(amount, description) { let i = s.legal.incidents.find(i => i.locationId === s.locationId); if (!i) { i = { locationId: s.locationId, evidence: 0, description }; s.legal.incidents.push(i); } i.evidence += amount; i.description = description; onEvidence(s, amount, description, this); },
  };
}
function report(s, amount = 3, description = 'The market clerk retained your signed parcel receipt.') {
  s.legal.incidents.push({ locationId: s.locationId, evidence: amount, description });
  assert.equal(onEvidence(s, amount, description, context(s)), true);
  return s.sanctuaries.cases[0];
}
function choose(s, id, attendance = Infinity) {
  assert.ok(s.event.choices.some(c => c.id === id), `${s.event.id} must actually offer ${id}`);
  assert.equal(applySanctuaryChoice(s, s.event.id, id, context(s, attendance)), true);
  assert.equal(validateSanctuaries(s.sanctuaries, s), true);
}
function action(s, id, attendance = Infinity) {
  assert.ok(sanctuaryActions(s).some(a => a.id === id && !a.disabledReason), `${id} must actually be usable`);
  assert.equal(applySanctuaryAction(s, id, context(s, attendance)), true);
  assert.equal(validateSanctuaries(s.sanctuaries, s), true);
}

test('optional migration starts now without inventing accusations, feeding or private knowledge', () => {
  const s = adult(); s.day = 40000; delete s.sanctuaries;
  s.legal.incidents.push({ locationId: 'city', evidence: 4, description: 'An older witnessed report.' });
  const original = structuredClone(s);
  initializeSanctuaries(s);
  assert.equal(s.sanctuaries.startedDay, 40000); assert.deepEqual(s.sanctuaries.cases, []);
  assert.deepEqual(s.hero, original.hero); assert.deepEqual(s.life, original.life); assert.deepEqual(s.legal, original.legal);
  const saved = structuredClone(s); initializeSanctuaries(s); assert.deepEqual(s, saved);
  sanctuaryActions(s); sanctuaryView(s); flushSanctuaryEvent(s, context(s)); assert.deepEqual(s, saved);
});

test('only actual new local evidence queues an accusation and never overwrites a childhood or need scene', () => {
  const s = adult(); s.event = { id: 'life_hunger' };
  const c = report(s);
  assert.equal(flushSanctuaryEvent(s, context(s)), false); assert.equal(s.event.id, 'life_hunger');
  s.event = null; s.locationId = 'city';
  assert.equal(flushSanctuaryEvent(s, context(s)), false); assert.equal(s.sanctuaries.queue.length, 1);
  s.locationId = 'home'; assert.equal(flushSanctuaryEvent(s, context(s)), true);
  assert.equal(s.event.id, 'sanctuary_case_accusation'); assert.match(s.event.body, /signed parcel receipt/);
  assert.equal(c.locationId, 'home'); assert.equal(s.legal.incidents.length, 1);
  assert.equal(onEvidence(s, 0, 'An invented universal rumor.', context(s)), false);
});

test('restitution uses actual attendance, exact local fee and a preserved partial commitment', () => {
  const s = adult(); const c = report(s); flushSanctuaryEvent(s, context(s)); choose(s, 'cooperate');
  const start = s.day, gold = s.hero.gold, fee=3*regionAt(s).law.theftFinePerEvidence;
  choose(s, 'pay', 0);
  assert.equal(s.day, start); assert.equal(s.hero.gold, gold); assert.equal(s.legal.incidents[0].evidence, 3);
  action(s, 'sanctuary_continue', 1);
  assert.equal(s.hero.gold, gold - fee); assert.equal(s.sanctuaries.commitment.remainingDays, 1);
  assert.equal(s.legal.incidents[0].evidence, 3);
  const restored = JSON.parse(JSON.stringify(s));
  action(s, 'sanctuary_continue'); action(restored, 'sanctuary_continue');
  assert.deepEqual(s, restored); assert.equal(s.day - start, 2); assert.equal(s.hero.gold, gold - fee);
  assert.equal(c.status, 'resolved'); assert.equal(s.legal.incidents.length, 0);
  flushSanctuaryEvent(s, context(s)); choose(s, 'quiet');
  assert.ok(s.sanctuaries.history.some(h => h.result === 'legal_followup'));
});

test('free supervised work answers a real report and a willing advocate narrows rather than erases it', () => {
  const s = adult(); report(s, 4); flushSanctuaryEvent(s, context(s)); choose(s, 'cooperate');
  const start = s.day; choose(s, 'advocate');
  assert.equal(s.day - start, 3); assert.equal(s.hero.gold, 108); assert.equal(s.legal.incidents[0].evidence, 3);
  flushSanctuaryEvent(s, context(s));
  assert.equal(s.event.choices.some(c => c.id === 'advocate'), false, 'one actual advocacy, no repeat discount');
  s.hero.gold = 0; choose(s, 'service');
  assert.equal(s.day - start, 9); assert.equal(s.hero.gold, 0); assert.equal(s.legal.incidents.length, 0);
  assert.ok(s.life.people.some(p => p.memories.some(m => m.includes('local hearing'))));
});

test('flight has both seeded outcomes and capture creates a survivable service route', () => {
  for (const success of [true, false]) {
    const seed = Array.from({ length: 200 }, (_, i) => `flight-${i}`).find(seed => (seededRoll(seed, 'case-flight-local-case-1-6570', 100) < 34) === success);
    const s = adult(seed); const c = report(s); flushSanctuaryEvent(s, context(s));
    const hp = s.hero.hp, possessions = structuredClone(s.equipment); choose(s, 'escape');
    assert.equal(c.status, success ? 'fugitive' : 'captured'); assert.equal(s.hero.hp, hp); assert.deepEqual(s.equipment, possessions);
    assert.equal(s.phase, 'adult'); assert.ok(s.legal.incidents.length);
    if (success) { context(s).spendDays(7); assert.equal(c.status, 'captured'); }
    flushSanctuaryEvent(s, context(s)); assert.equal(s.event.id, 'sanctuary_case_capture');
    choose(s, 'service'); assert.equal(s.hero.hp, hp);
    if (s.legal.incidents.length) { flushSanctuaryEvent(s, context(s)); choose(s, 'service'); }
    assert.equal(s.legal.incidents.length, 0);
  }
});

test('a deferred hearing has one explicit deadline and records no remote arrest', () => {
  const s = adult(); const c = report(s); flushSanctuaryEvent(s, context(s)); choose(s, 'later');
  const deadline = c.returnDay; assert.equal(deadline, s.day + 7);
  s.locationId = 'city'; context(s).spendDays(20); assert.equal(c.status, 'deferred');
  assert.equal(flushSanctuaryEvent(s, context(s)), false);
  s.locationId = 'home'; context(s).spendDays(1); flushSanctuaryEvent(s, context(s));
  assert.equal(s.event.id, 'sanctuary_case_hearing'); assert.equal(s.event.choices.some(c => c.id === 'later'), false);
});

function vampire() {
  const seed = Array.from({ length: 100 }, (_, i) => `donor-${i}`).find(seed => seededRoll(seed, 'donor-boundary-kin', 100) < 75);
  const s = adult(seed); s.hero.condition = { type: 'vampire', hunger: 80 };
  return s;
}
test('named donor agreements disclose only through an actual discussion and never feed from a menu', () => {
  const s = vampire(); const p = s.life.people.find(p => p.id === 'kin');
  const before = structuredClone(s.hero.condition);
  action(s, 'sanctuary_donor_kin'); assert.deepEqual(s.hero.condition, before); assert.equal(p.knownFacts.includes('vampire'), false);
  choose(s, 'agree', 0); assert.equal(s.sanctuaries.agreements.length, 0); assert.equal(p.knownFacts.includes('vampire'), false);
  action(s, 'sanctuary_continue');
  assert.equal(s.sanctuaries.agreements.length, 1); assert.equal(s.hero.condition.hunger, 82); assert.equal(p.knownFacts.includes('vampire'), true);
  assert.equal(s.life.people.filter(p => p.knownFacts.includes('vampire')).length, 1);
  const a = s.sanctuaries.agreements[0], start = s.day, gold = s.hero.gold;
  const quotation = sanctuaryActions(s).find(action => action.id === `sanctuary_feed_${a.id}`);
  assert.equal(quotation.durationDays, 1); assert.equal(quotation.quotedCost, 8);
  assert.equal(quotation.days, 0); assert.equal(quotation.cost, 0, 'UI quotes must not trigger a second generic engine fee');
  assert.equal(onSanctuaryNeed(s, 'vampire')[0].id, 'agreement');
  assert.equal(sanctuaryNeedsBypass(s, `sanctuary_feed_${a.id}`), 'vampire');
  assert.equal(applySanctuaryNeed(s, 'vampire', 'agreement', context(s, 0)), true);
  assert.equal(s.hero.gold, gold); assert.equal(s.hero.condition.hunger, 82);
  const remainingQuotation = sanctuaryActions(s).find(action => action.id === 'sanctuary_continue');
  assert.equal(remainingQuotation.durationDays, 1); assert.equal(remainingQuotation.quotedCost, 8);
  action(s, 'sanctuary_continue');
  assert.equal(s.day - start, 1); assert.equal(s.hero.gold, gold - 8); assert.equal(s.hero.condition.hunger, 24);
  assert.equal(a.sessions, 1); assert.equal(a.nextSessionDay, s.day + 14); assert.deepEqual(onSanctuaryNeed(s, 'vampire'), []);
  const blocked = sanctuaryActions(s).find(x => x.id === `sanctuary_feed_${a.id}`); assert.match(blocked.disabledReason, /next possible session/);
});

test('consent can be declined or withdrawn, and remote or dead donors provide no feeding', () => {
  const s = vampire(); action(s, 'sanctuary_donor_kin'); choose(s, 'private');
  assert.equal(s.sanctuaries.agreements.length, 0); assert.equal(s.hero.condition.hunger, 80);
  action(s, 'sanctuary_donor_kin'); choose(s, 'agree');
  const a = s.sanctuaries.agreements[0];
  s.locationId = 'city'; assert.ok(sanctuaryActions(s).find(x => x.id === `sanctuary_feed_${a.id}`).disabledReason);
  assert.deepEqual(onSanctuaryNeed(s, 'vampire'), []);
  s.locationId = 'home'; s.life.people.find(p => p.id === 'kin').alive = false;
  context(s).spendDays(1); assert.equal(a.status, 'ended'); assert.equal(a.endReason, 'participant no longer living or available');
  assert.equal(a.sessions, 0); assert.equal(s.hero.gold, 120);
});

test('actual homes and funded refuges support a location-specific once-per-moon plan', () => {
  const s = adult(); s.hero.condition = { type: 'lycanthrope', control: 35, preparedUntil: 0, lastFullMoon: 6566 };
  s.workshop.structures.push({ id: 'home_shelter', type: 'shelter', locationId: 'home', level: 1, condition: 'sound', completedDay: 6570 });
  const start = s.day; action(s, 'sanctuary_household');
  const plan = s.sanctuaries.plans[0]; assert.equal(s.day, start + 1); assert.equal(plan.preparedMoon, 6594);
  assert.equal(s.hero.condition.control, 38); assert.equal(s.hero.condition.preparedUntil, 6594);
  const repeat = sanctuaryActions(s).find(a => a.id === `sanctuary_prepare_${plan.id}`); assert.ok(repeat.disabledReason);
  const snapshot = structuredClone(s); sanctuaryView(s); sanctuaryActions(s); assert.deepEqual(s, snapshot);
  s.locationId = 'city'; assert.ok(sanctuaryActions(s).find(a => a.id === `sanctuary_prepare_${plan.id}`).disabledReason);
});

test('moon-watch circles use consenting contacts and cannot grant preparation after their target moon', () => {
  const s = adult(); s.day = 6592; s.sanctuaries.startedDay = s.day; s.sanctuaries.lastDay = s.day;
  s.hero.condition = { type: 'lycanthrope', control: 35, preparedUntil: 0, lastFullMoon: 6566 };
  action(s, 'sanctuary_pack_kin'); choose(s, 'agree', 1);
  assert.equal(s.sanctuaries.commitment.remainingDays, 1); assert.equal(s.hero.gold, 114); assert.equal(s.hero.condition.control, 35);
  action(s, 'sanctuary_continue');
  assert.equal(s.day, 6594); assert.equal(s.sanctuaries.plans.length, 1); assert.equal(s.sanctuaries.plans[0].preparedMoon, 0);
  assert.equal(s.hero.condition.control, 35); assert.equal(s.life.people.find(p => p.id === 'kin').knownFacts.includes('lycanthrope'), true);
  assert.ok(s.sanctuaries.history.some(h => h.result === 'moon_late'));
});

test('save validation rejects malformed commitments, absent references and future histories', () => {
  const s = adult(); report(s); flushSanctuaryEvent(s, context(s)); choose(s, 'cooperate'); choose(s, 'service', 1);
  assert.equal(validateSanctuaries(s.sanctuaries, s), true);
  for (const mutate of [v => v.commitment.remainingDays = -1, v => v.commitment.refId = 'missing', v => v.history[0].day = s.day + 1, v => v.cases[0].sources[0].description = null, v => v.queue.push({ eventId: 'imaginary', refId: v.cases[0].id })]) {
    const value = structuredClone(s.sanctuaries); mutate(value); assert.equal(validateSanctuaries(value, s), false);
  }
});
