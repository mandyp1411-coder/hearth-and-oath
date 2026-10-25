import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeHealth, healthActions, applyHealthAction, applyHealthChoice, onHealthTime, flushHealthEvent, healthView, healthEventIds, validateHealth } from '../dist/js/health.js';
import { seededRoll } from '../dist/js/world.js';

function life(seed = 'gentle-care') {
  const state = { seed, day: 0, age: 18, phase: 'adult', hero: { gold: 20, hp: 40, maxHp: 60, mp: 20, maxMp: 30, skills: { scholarship: 2 }, attributes: { strength: 3 } }, life: { happiness: 60, stress: 20, health: 80 }, event: null, battle: null, conversations: { pending: null }, dungeon: null, factions: { villagers: 0 }, flags: {} };
  initializeHealth(state); return state;
}
function context(state, maxDays = Infinity) {
  return { spendDays(days) { const oldDay = state.day, actual = Math.min(days, maxDays); state.day += actual; onHealthTime(state, { oldDay, newDay: state.day }, this); return actual; }, journal() {}, setEvent(id, title, category, body, choices) { state.event = { id, title, category, body, choices }; }, endLife(cause) { state.phase = 'retired'; state.ended = cause; state.event = null; } };
}
function tick(state, days, outdoors = false) { const oldDay = state.day; state.day += days; onHealthTime(state, { oldDay, newDay: state.day, outdoors }, context(state)); }
function condition(state, type, severity = 1) {
  const entry = { id: `${type}-${state.day}`, type, severity, sinceDay: state.day, lastEffectDay: state.day, careUntil: 0, acknowledged: false };
  state.health[['infection', 'fever', 'injury', 'chronic'].includes(type) ? 'physical' : 'mental'].push(entry);
  return entry;
}
function act(state, id) {
  state=atService(state,id);
  const offered = healthActions(state).find(action => action.id === id);
  assert.ok(offered); assert.equal(offered.disabledReason, undefined);
  const gold = state.hero.gold; state.hero.gold -= offered.cost;
  context(state).spendDays(offered.days);
  assert.equal(applyHealthAction(state, id, context(state)), true);
  assert.equal(state.hero.gold, gold - offered.cost, 'normal handler must not recharge the engine fee');
  assert.equal(validateHealth(state.health, state), true);
}

test('health migration and successor reset are additive and never diagnose or kill on import', () => {
  const state = life(); state.day = 44000; state.age = 121;
  delete state.health;
  const original = structuredClone(state);
  initializeHealth(state, { migration: true });
  assert.deepEqual(state.hero, original.hero); assert.deepEqual(state.life, original.life);
  assert.deepEqual(state.health.physical, []); assert.deepEqual(state.health.mental, []);
  assert.equal(state.health.lastPhysicalCheckDay, 44000);
  assert.equal(state.health.lastMentalCheckDay, 44000);
  assert.equal(state.health.lastAgeCheckYear, Math.floor(44000 / 365));
  assert.equal(state.health.deathCause, null);
  const saved = structuredClone(state.health); initializeHealth(state, { migration: true });
  assert.deepEqual(state.health, saved);
  condition(state, 'chronic'); state.day += 100;
  initializeHealth(state, { reset: true });
  assert.equal(state.health.lastPhysicalCheckDay, state.day);
  assert.deepEqual(state.health.physical, []);
});

test('risk checks require actual time, stay seeded, and never reroll on view or save queries', () => {
  const seed = Array.from({ length: 100 }, (_, index) => `physical-${index}`).find(value => seededRoll(value, 'health:physical:30', 100) < 10);
  const state = life(seed), same = life(seed);
  onHealthTime(state, { oldDay: 0, newDay: 0, outdoors: true }, context(state));
  assert.deepEqual(state.health.physical, []);
  tick(state, 30, true); tick(same, 30, true);
  assert.ok(state.health.physical.length);
  assert.deepEqual(state.health, same.health);
  const snapshot = structuredClone(state);
  healthView(state); healthActions(state); validateHealth(state.health, state);
  onHealthTime(state, { oldDay: 30, newDay: 30 }, context(state));
  assert.deepEqual(state, snapshot);
  const restored = JSON.parse(JSON.stringify(state));
  tick(state, 1); tick(restored, 1);
  assert.deepEqual(state, restored);
});

test('queued concerns preserve existing birth scenes, combat and threads', () => {
  const state = life(); condition(state, 'fever');
  state.event = { id: 'birth_age' };
  assert.equal(flushHealthEvent(state, context(state)), false);
  assert.equal(state.event.id, 'birth_age'); assert.equal(state.health.pending.conditionId, 'fever-0');
  state.event = null; state.battle = { encounterId: 'forest' };
  assert.equal(flushHealthEvent(state, context(state)), false);
  state.battle = null; state.conversations.pending = { personId: 'kin' };
  assert.equal(flushHealthEvent(state, context(state)), false);
  state.conversations.pending = null; // the older room engine's decisions left in v0.72.4
  assert.equal(flushHealthEvent(state, context(state)), true);
  assert.equal(state.event.id, 'health_concern');
  assert.match(state.event.body, /severity 1\/3/);
  assert.ok(state.event.choices.some(option => option.id === 'rest'));
  assert.ok(state.event.choices.some(option => option.id === 'support'));
});

test('paid treatment charges once and physical recovery requires actual lived time', () => {
  const state = life(); const illness = condition(state, 'infection', 2); illness.acknowledged = true;
  const stats = structuredClone(state.hero.attributes);
  act(state, 'health_clinic');
  assert.equal(state.day, 2); assert.equal(state.hero.gold, 14);
  assert.equal(state.hero.hp, 52); assert.equal(state.life.health, 90);
  assert.equal(illness.severity, 1); assert.equal(state.health.physical.length, 1);
  tick(state, 14);
  assert.equal(state.health.physical.length, 0);
  assert.ok(state.health.history.some(entry => entry.result === 'recovered'));
  assert.deepEqual(state.hero.attributes, stats);
});

test('free bodily and emotional care remain accessible with no gold', () => {
  const state = life(); state.hero.gold = 0;
  condition(state, 'injury'); condition(state, 'anxiety');
  const actions = healthActions(state);
  assert.ok(actions.find(action => action.id === 'health_clinic').disabledReason);
  assert.equal(actions.find(action => action.id === 'health_rest').cost, 0);
  assert.equal(actions.find(action => action.id === 'health_support').cost, 0);
  act(state, 'health_rest');
  assert.equal(state.hero.hp, 50); assert.equal(state.life.health, 86);
  const happiness = state.life.happiness, stress = state.life.stress;
  act(state, 'health_support');
  assert.equal(state.life.happiness, happiness + 6); assert.equal(state.life.stress, Math.max(0, stress - 12));
  assert.equal(state.hero.gold, 0);
  assert.ok(state.health.physical[0].careUntil > state.day);
  assert.ok(state.health.mental[0].careUntil > state.day);
});

test('children have real free sponsored treatment without inventing a parent or money', () => {
  const state = life(); state.age = 3; state.phase = 'childhood'; state.hero.gold = 0;
  state.family = { setup: 'homeless', members: [{ personId: 'kin', biological: false, relationship: 'shelter guardian' }] };
  const originalFamily = structuredClone(state.family);
  condition(state, 'fever'); flushHealthEvent(state, context(state));
  assert.match(state.event.choices.find(option => option.id === 'care').description, /0 gold/);
  assert.equal(applyHealthChoice(state, 'health_concern', 'care', context(state)), true);
  assert.equal(state.hero.gold, 0); assert.equal(state.day, 2);
  assert.deepEqual(state.family, originalFamily);
  assert.ok(state.health.physical[0].careUntil > state.day);
});

test('mental symptoms are seeded from sustained pressures and have no moral, combat or legal penalty', () => {
  const seed = Array.from({ length: 100 }, (_, index) => `emotional-${index}`).find(value => seededRoll(value, 'health:depression:30', 100) < 10);
  const state = life(seed); state.life.happiness = 20; state.life.stress = 85;
  const hero = structuredClone(state.hero), factions = structuredClone(state.factions);
  tick(state, 30);
  assert.ok(state.health.mental.some(entry => entry.type === 'depression'));
  assert.deepEqual(state.hero, hero);
  assert.deepEqual(state.factions, factions);
  const view = healthView(state);
  assert.ok(view.mental.every(entry => entry.symptoms && entry.description));
  assert.match(view.mental.find(entry => entry.type === 'depression').description, /lived weeks/);
});

test('support improves mood immediately while depressive symptom recovery takes continuing care and weeks', () => {
  const state = life(); condition(state, 'depression');
  state.life.happiness = 45; state.life.stress = 55;
  act(state, 'health_support');
  assert.equal(state.health.mental.length, 1, 'one conversation does not cure symptoms');
  tick(state, 14);
  assert.equal(state.health.mental.length, 1);
  act(state, 'health_support');
  tick(state, 21);
  assert.equal(state.health.mental.length, 0);
  assert.ok(state.health.history.some(entry => entry.conditionType === 'depression' && entry.result === 'recovered'));
});

test('care lived early in a long action is credited before later unsupported weeks', () => {
  const state = life(); condition(state, 'fever');
  act(state, 'health_rest');
  const healthyHp = state.hero.hp, bodily = state.life.health;
  tick(state, 60);
  assert.equal(state.health.physical.length, 0, 'the supported first fortnight resolves the fever even though its care window ended before day sixty');
  assert.equal(state.hero.hp, healthyHp, 'a recovered illness cannot damage the following unsupported weeks');
  assert.equal(state.life.health, bodily);
  assert.ok(state.health.history.some(entry => entry.conditionType === 'fever' && entry.result === 'recovered'));
});

test('acknowledged physical symptoms ask for a new decision only when they genuinely worsen', () => {
  const state = life(); const illness = condition(state, 'infection'); illness.acknowledged = true;
  tick(state, 28);
  assert.equal(illness.severity, 2);
  assert.equal(illness.acknowledged, false);
  assert.equal(state.health.pending.conditionId, illness.id);
  flushHealthEvent(state, context(state));
  assert.equal(applyHealthChoice(state, 'health_concern', 'continue', context(state)), true);
  tick(state, 14);
  assert.equal(illness.severity, 3); assert.equal(illness.acknowledged, false);
  flushHealthEvent(state, context(state)); applyHealthChoice(state, 'health_concern', 'continue', context(state));
  tick(state, 28);
  assert.equal(state.health.pending, null, 'an unchanged severity-three diagnosis does not spam the same warning');
});

test('gathered healing herbs support physical care through a real consumed resource and lived recovery', () => {
  const state = life(); state.flags.herbs = 1; const illness = condition(state, 'infection');
  const gold = state.hero.gold;
  act(state, 'health_herbs');
  assert.equal(state.day, 2); assert.equal(state.flags.herbs, 0); assert.equal(state.hero.gold, gold);
  assert.equal(state.health.physical.length, 1, 'herbs support rather than instantly erase a diagnosis');
  assert.equal(illness.careUntil, 26);
  assert.ok(!healthActions(state).some(action => action.id === 'health_herbs'));
  tick(state, 12);
  assert.equal(state.health.physical.length, 0);
});

test('chronic conditions can be managed without pretending that a care routine erased them', () => {
  const state = life(); condition(state, 'chronic', 2);
  act(state, 'health_routine');
  const hp = state.hero.hp;
  tick(state, 11);
  assert.equal(state.health.physical.length, 1);
  assert.equal(state.health.physical[0].severity, 1);
  assert.equal(state.hero.hp, hp);
  assert.match(healthView(state).physical[0].description, /manages symptoms/);
});

test('concern choices are saveable, charge only attended care once, and can acknowledge without concealing symptoms', () => {
  const state = life(); condition(state, 'fever'); flushHealthEvent(state, context(state));
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(validateHealth(restored.health, restored), true);
  assert.equal(applyHealthChoice(restored, 'health_concern', 'care', context(restored, 0)), true);
  assert.equal(restored.hero.gold, 20); assert.equal(restored.day, 0);
  assert.ok(restored.health.pending);
  assert.equal(applyHealthChoice(restored, 'health_concern', 'care', context(restored)), true);
  assert.equal(restored.hero.gold, 14); assert.equal(restored.day, 2);
  assert.equal(restored.health.pending, null);
  assert.equal(applyHealthChoice(restored, 'health_concern', 'care', context(restored)), false);
  const continued = life(); condition(continued, 'anxiety'); flushHealthEvent(continued, context(continued));
  assert.equal(applyHealthChoice(continued, 'health_concern', 'continue', context(continued)), true);
  assert.equal(continued.health.mental.length, 1);
  assert.equal(continued.health.mental[0].acknowledged, true);
  assert.equal(continued.health.pending, null);
  assert.deepEqual(continued.factions, { villagers: 0 });
});

test('mortality depends on actual advanced age and physical frailty, never merely a mental diagnosis', () => {
  const seed = Array.from({ length: 200 }, (_, index) => `elder-${index}`).find(value => seededRoll(value, 'health:mortality:1', 100) < 8);
  const elder = life(seed); elder.age = 120;
  tick(elder, 365);
  assert.equal(elder.phase, 'retired'); assert.match(elder.ended, /Natural death/);
  const endedHistory = elder.health.history.length; tick(elder, 365);
  assert.equal(elder.health.history.length, endedHistory);
  const young = life(seed); young.life.health = 1; condition(young, 'depression', 3);
  tick(young, 365);
  assert.equal(young.phase, 'adult'); assert.equal(young.health.deathCause, null);
  const vampire = life(seed); vampire.age = 150; vampire.hero.condition = { type: 'vampire', hunger: 0 };
  tick(vampire, 365);
  assert.equal(vampire.phase, 'adult'); assert.equal(vampire.health.deathCause, null);
});

test('health validators reject future clocks, mismatched concerns, invalid conditions and unbounded history', () => {
  const state = life(); condition(state, 'infection'); flushHealthEvent(state, context(state));
  assert.equal(validateHealth(state.health, state), true);
  assert.deepEqual(Object.keys(healthEventIds()), ['health_concern', 'health_break']);
  for (const change of [
    value => { value.physical[0].severity = 0; }, value => { value.physical[0].sinceDay = 1; },
    value => { value.physical[0].type = 'evil'; }, value => { value.physical.push({ ...value.physical[0] }); },
    value => { value.care.restUntil = Infinity; }, value => { value.lastPhysicalCheckDay = 1; },
    value => { value.lastMentalCheckDay = -1; }, value => { value.lastAgeCheckYear = 1; },
    value => { value.pending.kind = 'mental'; }, value => { value.pending.conditionId = 'absent'; },
    value => { value.history = Array(121).fill({ day: 0, id: 'x', title: 'x', text: 'x' }); },
  ]) { const copy = structuredClone(state.health); change(copy); assert.equal(validateHealth(copy, state), false); }
  assert.equal(validateHealth(null, state), false);
  assert.equal(applyHealthAction(state, 'health_missing', context(state)), false);
  assert.equal(applyHealthChoice(state, 'health_concern', 'missing', context(state)), false);
});
