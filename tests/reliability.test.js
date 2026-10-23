import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { chooseEventOption, replyMessage, continueAgeUp, chooseBattleAction, resolveBattle, validateSave, migrateSave } from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { executeEnemyPlan, attachEnemyPlan } from '../dist/js/enemy-plans-v27.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { createSaveStore } from '../dist/js/saves.js';
import { mountApp } from './helpers/ui-surface.mjs';

const finiteStatuses = battle => {
  for (const actor of battle.actors) {
    for (const value of Object.values(actor.status)) assert.ok(typeof value === 'boolean' || Number.isFinite(value) && value >= 0, `${actor.id}: finite, nonnegative status`);
    for (const key of ['hp', 'mp']) assert.ok(Number.isFinite(actor[key]) && actor[key] >= 0 && actor[key] <= actor[key === 'hp' ? 'maxHp' : 'maxMp']);
  }
};
const unitActor = (id, side = 'enemy') => ({ id, name: id, side, hp: 1000, maxHp: 1000, mp: 0, maxMp: 0, armor: 0, agility: 4, attackPower: 5, status: {}, aiStep: 0 });
const unitHelpers = battle => ({ log: text => battle.log.push(text), damage: (_, target, amount) => {
  const damage = Math.min(target.hp, Math.max(0, amount)); target.hp -= damage; return damage;
} });
let adult;
async function fresh() {
  if (!adult) {
    let state = await createLifeAtAge({ seed: 'focus-one-reliability', startAge: 18, difficulty: 'gentle' });
    for (let n = 0; n < 100 && (state.event || state.conversations?.pending || state.timeline?.yearTarget !== null); n++) {
      if (state.event) state = chooseEventOption(state, state.event.choices.find(c => !c.disabledReason).id);
      else if (state.conversations?.pending) state = replyMessage(state, state.conversations.pending.personId, state.conversations.pending.replies[0].id);
      else state = continueAgeUp(state);
    }
    assert.ok(validateSave(state)); assert.equal(state.event, null); assert.equal(state.conversations.pending, null);
    adult = state;
  }
  return structuredClone(adult);
}

test('ward transfer moves only actual living-ally ward, including an absent or exhausted ward', () => {
  for (const [initial, expected] of [[undefined, 0], [0, 0], [3, 3], [9, 4], [NaN, 0], [Infinity, 0]]) {
    const hero = unitActor('hero', 'party'), caster = unitActor('caster'), donor = unitActor('donor');
    if (initial !== undefined) donor.status.ward = initial;
    caster.planCycle = [{ action: 'ally_ward_transfer', target: 'most_warded_enemy', amount: 4 }];
    const battle = { actors: [hero, caster, donor], log: [] };
    executeEnemyPlan(battle, caster, unitHelpers(battle));
    assert.equal(caster.status.ward, expected);
    assert.equal(caster.status.charged, expected);
    assert.equal(donor.status.ward, Number.isFinite(initial) ? Math.max(0, initial - expected) : 0);
    finiteStatuses(battle);
    assert.deepEqual(JSON.parse(JSON.stringify(battle)), battle, 'export cannot turn a status into null');
  }
});

test('ward transfer ignores dead donors, chooses the most warded living donor and retains the existing ward cap', () => {
  const caster = unitActor('caster'), empty = unitActor('empty'), donor = unitActor('donor'), dead = unitActor('dead');
  caster.status.ward = 39; donor.status.ward = 7; dead.status.ward = 30; dead.hp = 0;
  caster.planCycle = [{ action: 'ally_ward_transfer', target: 'most_warded_enemy', amount: 4 }];
  const battle = { actors: [unitActor('hero', 'party'), caster, empty, donor, dead], log: [] };
  executeEnemyPlan(battle, caster, unitHelpers(battle));
  assert.equal(caster.status.ward, 40); assert.equal(caster.status.charged, 4);
  assert.equal(donor.status.ward, 3); assert.equal(dead.status.ward, 30); assert.equal(empty.status.ward, undefined);
  battle.actors = battle.actors.filter(a => a.side === 'party' || a.id === 'caster');
  executeEnemyPlan(battle, caster, unitHelpers(battle));
  assert.equal(caster.status.ward, 40); assert.equal(caster.status.charged, 0);
  finiteStatuses(battle);
});

test('all enemy cadences remain finite with a second living, unwarded enemy across repeated cycles', () => {
  for (const design of ENCOUNTER_DESIGN_V27.species) {
    const actor = attachEnemyPlan(unitActor(design.id), design.id);
    const battle = { actors: [unitActor('hero', 'party'), actor, unitActor('unwarded')], log: [], round: 1, lastDamagingAction: 'attack', lastAttackerId: 'hero' };
    for (let n = 0; n < actor.planCycle.length * 3; n++) {
      executeEnemyPlan(battle, actor, unitHelpers(battle)); finiteStatuses(battle);
    }
  }
});

test('a real aberration encounter completes, reloads and resolves once without changing its captured rewards', async () => {
  let state = await fresh();
  // Controlled survival/attack fixture, not a counted life or a balance judgment.
  state.hero.maxHp = state.hero.hp = 1000; state.hero.attributes.strength = 50; state.hero.attributes.agility = 100; state.hero.level = 12;
  state.hero.skills.blades = 40;
  let encounter;
  for (let count = 0; count < 100; count++) {
    state.flags.battlesStarted = count;
    const candidate = createBattle(state, 'free_aberration');
    const firstEnemy = candidate.turnOrder.map(id => candidate.actors.find(a => a.id === id)).find(a => a.side === 'enemy');
    if (candidate.variant === 0 && candidate.actors.filter(a => a.side === 'enemy').length > 1 && firstEnemy.planCycle[0].action === 'ally_ward_transfer') { encounter = candidate; break; }
  }
  assert.ok(encounter, 'a real formation transfers from an unwarded living donor before any enemy can ward it');
  assert.ok(encounter.actors.filter(a => a.side === 'enemy').every(a => a.status.ward === undefined));
  state.battle = { ...encounter, instanceId: 'reliability-aberration' };
  assert.ok(validateSave(state));
  const rewards = structuredClone(state.battle.rewards);
  for (let n = 0; n < 100 && !state.battle.outcome; n++) {
    const target = state.battle.actors.find(a => a.side === 'enemy' && a.hp > 0);
    state = chooseBattleAction(state, n < 2 ? 'defend' : 'attack', target.id);
    finiteStatuses(state.battle); assert.ok(validateSave(state), `action ${n} stays valid`);
    assert.deepEqual(state.battle.rewards, rewards);
    state = migrateSave(JSON.parse(JSON.stringify(state))); assert.ok(state);
  }
  assert.equal(state.battle.outcome, 'victory');
  assert.ok(state.battle.log.some(line => line.includes('gains 0 ward')), 'the formerly failing empty transfer actually executes');
  const completed = structuredClone(state.battle), gold = state.hero.gold;
  const resolved = resolveBattle(state, completed); assert.equal(resolved.battle, null); assert.ok(validateSave(resolved));
  assert.ok(resolved.hero.gold >= gold + rewards.gold);
  const repeated = resolveBattle(resolved, completed); assert.equal(repeated.hero.gold, resolved.hero.gold);
  const storage = new Map(), store = createSaveStore({ getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) }, migrateSave);
  assert.equal(store.write(0, resolved), true);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(store.read(0)))), resolved);
});

async function completedFixture(gold = 10000000) {
  const state = await fresh(); state.hero.gold = gold;
  state.battle = { ...createBattle(state, 'forest'), instanceId: 'rejected-result-fixture' };
  for (const actor of state.battle.actors) if (actor.side === 'enemy') actor.hp = 0;
  state.battle.outcome = 'victory'; state.battle.currentActorId = null;
  assert.ok(validateSave(state)); return state;
}

test('invalid combat resources and numeric statuses cannot overwrite a valid saved position', async () => {
  const original = await completedFixture(100), values = new Map();
  const store = createSaveStore({ getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }, migrateSave);
  assert.equal(store.write(0, original), true);
  const envelope = values.get('hearth-and-oath-legacy:slots:v1');
  for (const key of ['hp', 'mp', 'ward', 'charged']) for (const value of [NaN, Infinity, -1, null]) {
    const invalid = structuredClone(original), actor = invalid.battle.actors[0];
    if (['ward', 'charged'].includes(key)) actor.status[key] = value; else actor[key] = value;
    assert.equal(validateSave(invalid), false, `${key} rejects ${value}`);
    assert.equal(store.write(0, invalid), false);
    assert.deepEqual(store.read(0), original);
    assert.equal(values.get('hearth-and-oath-legacy:slots:v1'), envelope);
    assert.equal(store.available(), true, 'validation failure is not a storage outage');
  }
});

function captureExports(t, surface) {
  const blobs = [], original = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:reliability-export'; };
  URL.revokeObjectURL = () => {};
  surface.document.createElement = () => ({ click() {} });
  t.after(() => { URL.createObjectURL = original; URL.revokeObjectURL = revoke; });
  return blobs;
}

test('a deliberately invalid result preserves the active combat position, all slots and the recovery/export path', async t => {
  // A legal completed encounter at the gold ceiling deliberately makes its
  // computed reward result invalid. No production fault-injection hook is used.
  const before = await completedFixture(), neighbor = await fresh();
  assert.equal(validateSave(resolveBattle(before, before.battle)), false);
  const surface = await mountApp(t, { states: [before, neighbor] });
  await surface.click('title-continue');
  const current = surface.current(), slots = surface.lives(), envelope = surface.storage.getItem('hearth-and-oath-legacy:slots:v1');
  const exports = captureExports(t, surface);
  await surface.click('battle-finish');
  assert.ok(surface.root.querySelector('[data-recovery-dialog]'));
  assert.match(surface.root.innerHTML, /action was not applied/i);
  assert.doesNotMatch(surface.root.innerHTML, /permanent(?:ly)? (?:lost|deleted)|Browser storage is unavailable/);
  assert.deepEqual(surface.current(), current); assert.deepEqual(surface.lives(), slots);
  assert.equal(surface.storage.getItem('hearth-and-oath-legacy:slots:v1'), envelope, 'rejection writes no save or timestamp');
  await surface.click('export-slot', '0');
  assert.deepEqual(JSON.parse(await exports[0].text()), current);
  await surface.click('recover-current');
  assert.equal(surface.root.querySelector('[data-recovery-dialog]'), null);
  assert.ok(surface.root.controls.some(c => c.dataset.op === 'battle-finish'));
  assert.deepEqual(surface.current(), current); assert.deepEqual(surface.lives(), slots);
  await surface.click('battle-finish'); await surface.key('Escape');
  assert.equal(surface.root.querySelector('[data-recovery-dialog]'), null);
  assert.ok(surface.root.controls.some(c => c.dataset.op === 'battle-finish'));
});

test('recovery offers a retained slot backup for explicit review without replacing it on rejection', async t => {
  const before = await completedFixture(), backup = await fresh();
  const envelope = { version: 1, activeSlot: 0, slots: [{ id: 0, state: before, updatedAt: null }], backups: { 0: { state: backup, updatedAt: null } } };
  const surface = await mountApp(t, { storageEntries: [['hearth-and-oath-legacy:slots:v1', JSON.stringify(envelope)]] });
  await surface.click('title-continue'); const current = surface.current();
  await surface.click('battle-finish');
  await surface.click('restore-backup', '0');
  assert.ok(surface.root.querySelector('[data-op="confirm-import"]'));
  assert.deepEqual(surface.current(), current, 'opening the backup review is not replacement');
  await surface.click('close-modal'); assert.deepEqual(surface.current(), current);
});

test('storage exhaustion still accepts a valid result for session play and export', async t => {
  const before = await completedFixture(100), expected = resolveBattle(before, before.battle);
  assert.ok(validateSave(expected));
  const surface = await mountApp(t, { states: [before] }); await surface.click('title-continue');
  const durable = surface.storage.getItem('hearth-and-oath-legacy:slots:v1'), write = surface.storage.setItem;
  surface.storage.setItem = (key, value) => { if (['hearth-and-oath-legacy:slots:v1', 'hearth-and-oath-legacy:life:v1'].includes(key)) throw Error('Quota unavailable'); return write(key, value); };
  const exports = captureExports(t, surface);
  await surface.click('battle-finish');
  assert.equal(surface.root.querySelector('[data-recovery-dialog]'), null);
  assert.match(surface.root.innerHTML, /Browser storage is unavailable/);
  assert.equal(surface.storage.getItem('hearth-and-oath-legacy:slots:v1'), durable);
  await surface.click('menu', 'header'); await surface.click('export'); assert.deepEqual(JSON.parse(await exports[0].text()), expected);
});
