import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { createIronmanMetadata, currentIronmanPerson, ironmanHeroDeath } from '../dist/js/ironman.js';
import { createSaveCoordinator, createSaveStore, LEGACY_SAVE_KEY, SAVE_SLOT_COUNT } from '../dist/js/saves.js';
import {
  IRONMAN_RECORD_PREFIX, IRONMAN_ENDED_PREFIX, ironmanRecordKey, ironmanEndedKey, isIronmanStorageKey,
} from '../dist/js/ironman-storage.js';
import { freshStory } from './helpers/story-life-fixtures.mjs';

// Authored phase-3 store acceptance only. Execution belongs to the parent's
// frozen gate. These bounded fixtures use a published adult, the actual
// validator/migrator, and actual combat/engine commands. Controlled party,
// saved-battle stats/order, and one-day projections are explicitly labeled.
// This is not earned-party/balance evidence, app/UI coverage, or release QA.
const SLOT_KEY = 'hearth-and-oath:slots:v1';
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const THIRD_RUN = '22334455-6677-4899-aabb-ccddeeff0011';
let entropySequence = 0;
const clone = value => structuredClone(value);
const disk = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
const actor = (state, id) => state.battle.actors.find(value => value.id === id);
const rawRecord = (storage, runId = RUN) => JSON.parse(storage.values.get(ironmanRecordKey(runId)) || 'null');
const failure = result => {
  assert.ok(['blocked', 'stale', 'unconfirmed'].includes(result?.status), JSON.stringify(result));
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
  return result;
};
function accepted(state, label = 'actual engine fixture') {
  assert.equal(E.validateSave(state), true, label + ': ' + state?.notice);
  const before = clone(state), restored = E.migrateSave(JSON.parse(JSON.stringify(state)));
  assert.ok(restored, label + ' migrates through the actual engine');
  assert.deepEqual(restored, state, label + ' round-trips exactly');
  assert.deepEqual(state, before, 'migration never changes its source');
  return restored;
}
function standard() { return accepted(freshStory(), 'published adult Standard fixture'); }
function opening(runId = RUN) {
  const state = standard();
  // Controlled living-party projection, not an earned recruitment claim.
  for (const person of state.companions) {
    person.recruited = person.active = person.id === 'mira';
    if (person.id === 'mira') {
      assert.equal(currentIronmanPerson(state, 'mira').alive, true);
      person.hp = person.maxHp;
      state.rpg.companionStages.mira.status = 'available';
    }
  }
  accepted(state, 'controlled Standard party before opt-in');
  state.ironman = createIronmanMetadata(state, { randomUUID: () => runId });
  return accepted(state, 'explicit metadata-only Ironman opt-in');
}
function progressed(source) {
  const state = clone(source);
  // A controlled legal saved-resource change isolates store revisions.
  state.hero.gold += 1;
  return accepted(state, 'controlled resource-only progress');
}
function captured(source = opening()) {
  const state = clone(source); state.battle = null;
  accepted(state, 'controlled uncommitted moment before capture');
  state.battle = createBattle(state, 'forest', null, { openingTurns: false });
  state.battle.instanceId = 'ironman-store-controlled-' + state.day;
  // Controlled accepted battle stats/order keep this a bounded store fixture.
  state.battle.currentActorId = 'hero';
  state.battle.turnOrder = ['hero', ...state.battle.actors.filter(a => a.id !== 'hero').map(a => a.id)];
  for (const enemy of state.battle.actors.filter(a => a.side === 'enemy')) {
    enemy.hp = enemy.maxHp = 10000;
    enemy.armor = 100;
  }
  return accepted(state, 'controlled captured native forest battle');
}
function companionDeath(source = opening(), { nextDay = false } = {}) {
  source = clone(source);
  if (nextDay) {
    // One-day current-position projection, not an earned time/action claim.
    source.day += 1;
    accepted(source, 'controlled next-day source before actual casualty');
  }
  const state = captured(source), mira = actor(state, 'mira');
  assert.ok(mira, 'the controlled real party contains living Mira');
  mira.hp = 1; mira.status = { poison: 2, poisonTurns: 1 };
  state.battle.turnOrder = ['hero', 'mira', ...state.battle.actors.filter(a => !['hero', 'mira'].includes(a.id)).map(a => a.id)];
  accepted(state, 'controlled one-HP poison/turn-order boundary');
  const before = clone(state), result = E.chooseBattleAction(state, 'attack', 'enemy-1');
  assert.deepEqual(state, before, 'the actual engine command is detached');
  assert.equal(result.companions.find(p => p.id === 'mira').alive, false);
  assert.equal(result.ironman.casualties.length, 1);
  assert.equal(result.ironman.casualties[0].personId, currentIronmanPerson(result, 'mira').id);
  return accepted(result, 'actual accepted companion casualty');
}
function terminal(source = opening()) {
  // Continue an already captured battle, including its exact instance, policy,
  // and prior deaths. Recapturing would drop an applied dead participant and
  // would correctly fail the store's existing-battle ownership guard.
  const state = source.battle ? clone(source) : captured(source);
  const hero = actor(state, 'hero'), enemy = actor(state, 'enemy-1');
  // Controlled accepted enemy boundary. The real next enemy attack, not a
  // fabricated mortality ledger/outcome, produces the terminal descriptor.
  hero.hp = 1; hero.status = {};
  for (const person of state.battle.actors.filter(a => a.side === 'party' && a.id !== 'hero' && a.hp > 0)) person.hp = person.maxHp;
  for (const key of ['planId', 'planCycle', 'bossId', 'phasePlan']) delete enemy[key];
  Object.assign(enemy, { aiKey: 'striker', aiStep: 0, status: {}, attackPower: 9999 });
  state.battle.currentActorId = 'hero';
  state.battle.turnOrder = ['hero', 'enemy-1', ...state.battle.actors.filter(a => a.hp > 0 && !['hero', 'enemy-1'].includes(a.id)).map(a => a.id)];
  accepted(state, 'controlled hero-fatal captured stats/order');
  const before = clone(state), result = E.chooseBattleAction(state, 'attack', 'enemy-1');
  assert.deepEqual(state, before);
  assert.ok(ironmanHeroDeath(result), 'actual engine attack reaches a matched hero terminal');
  return accepted(result, 'actual accepted hero terminal descriptor');
}
function openingTerminal(source) {
  const state = clone(source); state.battle = null;
  // Controlled living one-HP/initiative projection. Native opening turns run
  // during createBattle, before a playable battle position can be persisted.
  state.hero.hp = 1; state.hero.attributes.agility = 1;
  for (const p of state.companions) if (p.active) { p.hp = p.maxHp; p.agility = 1; }
  accepted(state, 'controlled native opening-turn precondition');
  const before = clone(state), battle = createBattle(state, 'forest');
  assert.deepEqual(state, before);
  battle.instanceId = 'ironman-store-native-opening';
  state.battle = battle;
  assert.ok(ironmanHeroDeath(state), 'native opening turns genuinely kill the one-HP hero');
  return accepted(state, 'native opening terminal descriptor');
}
function envelope({ states = {}, backups = {}, activeSlot = 0 } = {}) {
  return JSON.stringify({ version: 1, activeSlot,
    slots: Array.from({ length: 3 }, (_, id) => ({ id, state: states[id] ?? null, updatedAt: states[id] ? '2026-10-18T00:00:00.000Z' : null, revision: 'raw-slot-' + id })),
    backups: clone(backups),
  });
}
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values, operations: [], reads: [], enumerated: [], failGet: new Set(), failSet: new Set(), failRemove: new Set(),
    failLength: false, failKey: false, afterSet: null, readOverride: null,
    get length() { if (this.failLength) throw Error('Storage length unavailable'); return values.size; },
    key(index) { if (this.failKey) throw Error('Storage key enumeration unavailable'); const key = [...values.keys()][index] ?? null; this.enumerated.push(key); return key; },
    getItem(key) {
      this.reads.push(key);
      if (this.failGet.has(key)) throw Error('Storage read unavailable: ' + key);
      const value = values.get(key) ?? null;
      return this.readOverride ? this.readOverride(key, value) : value;
    },
    setItem(key, value) {
      this.operations.push({ kind: 'set', key, value: String(value) });
      if (this.failSet.has(key)) throw Object.assign(Error('Quota unavailable'), { name: 'QuotaExceededError' });
      values.set(key, String(value)); this.afterSet?.(key, String(value));
    },
    removeItem(key) {
      this.operations.push({ kind: 'remove', key });
      if (this.failRemove.has(key)) throw Error('Storage removal unavailable');
      values.delete(key);
    },
    clearLog() { this.operations.length = 0; this.reads.length = 0; this.enumerated.length = 0; },
  };
}
function harness(storage = memoryStorage({ [SLOT_KEY]: envelope() }), cryptoProvider) {
  let depth = 0;
  const locks = { calls: [], async request(name, options, callback) {
    assert.equal(options.mode, 'exclusive');
    this.calls.push({ name, mode: options.mode }); depth++;
    try { return await callback({ name, mode: 'exclusive' }); } finally { depth--; }
  } };
  const crypto = cryptoProvider === undefined ? {
    randomUUID: () => '8899aabb-ccdd-4eef-8a11-' + (++entropySequence).toString(16).padStart(12, '0'),
  } : cryptoProvider;
  const coordinate = createSaveCoordinator(locks);
  const store = createSaveStore(storage, E.migrateSave, { coordinate, crypto });
  return { storage, store, locks, coordinate, get depth() { return depth; } };
}
async function admit(h, state = opening(), slot = 0, intent = 'create') {
  const before = clone(state), review = await h.store.inspectIronman(state, { intent, slot });
  assert.equal(review.status, 'review'); assert.equal(review.slot, slot); assert.ok(review.token);
  const result = await h.store.commitIronman(slot, state, { intent, token: review.token });
  assert.equal(result.status, 'committed', JSON.stringify(result));
  assert.deepEqual(result.state, state); assert.equal(result.runId, state.ironman.runId); assert.equal(result.slot, slot); assert.ok(result.token);
  assert.deepEqual(state, before, 'review/commit do not mutate their incoming fixture');
  return result;
}
function onlyIronmanMutations(storage) {
  assert.ok(storage.operations.every(op => isIronmanStorageKey(op.key)), 'Ironman never mutates the shared envelope, compatibility mirror, or unrelated storage');
}
function exactRecord(record, state, slot) {
  assert.deepEqual(Object.keys(record).sort(), ['attachment', 'casualties', 'revision', 'runId', 'startedDay', 'state', 'updatedAt', 'version']);
  assert.equal(record.version, 1); assert.equal(record.runId, state.ironman.runId); assert.equal(record.startedDay, state.ironman.startedDay);
  assert.deepEqual(record.state, state); assert.deepEqual(record.casualties, state.ironman.casualties);
  assert.ok(record.revision != null); assert.ok(Number.isFinite(Date.parse(record.updatedAt)));
  if (slot == null) assert.equal(record.attachment, null);
  else {
    assert.deepEqual(Object.keys(record.attachment).sort(), ['baseToken', 'nonce', 'slotId']);
    assert.equal(record.attachment.slotId, slot);
    assert.equal(typeof record.attachment.nonce, 'string'); assert.ok(record.attachment.nonce);
    assert.equal(typeof record.attachment.baseToken, 'string'); assert.ok(record.attachment.baseToken);
  }
}

test('Ironman namespaces identify only their own per-run records and ended markers', () => {
  assert.equal(IRONMAN_RECORD_PREFIX, 'hearth-and-oath:ironman-run:v1:');
  assert.equal(IRONMAN_ENDED_PREFIX, 'hearth-and-oath:ironman-ended:v1:');
  assert.equal(ironmanRecordKey(RUN), IRONMAN_RECORD_PREFIX + RUN);
  assert.equal(ironmanEndedKey(RUN), IRONMAN_ENDED_PREFIX + RUN);
  for (const key of [ironmanRecordKey(RUN), ironmanEndedKey(RUN)]) assert.equal(isIronmanStorageKey(key), true);
  for (const key of [SLOT_KEY, LEGACY_SAVE_KEY, 'unrelated', 'hearth-and-oath:ironman-run:v2:' + RUN]) assert.equal(isIronmanStorageKey(key), false);
});

test('creation claims an empty virtual slot with one atomic head/floor/attachment write', async () => {
  const h = harness(), state = opening(), beforeEnvelope = h.storage.getItem(SLOT_KEY);
  h.storage.clearLog(); await admit(h, state, 1);
  assert.equal(h.storage.operations.length, 1);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanRecordKey(RUN)]]);
  exactRecord(rawRecord(h.storage), state, 1); onlyIronmanMutations(h.storage);
  assert.equal(h.storage.getItem(SLOT_KEY), beforeEnvelope); assert.equal(h.storage.getItem(LEGACY_SAVE_KEY), null);
  assert.deepEqual(h.store.read(1), state); assert.equal(h.store.list().length, SAVE_SLOT_COUNT);
  assert.equal(h.store.backup(1), null);
  const read = h.store.read(1); read.hero.gold += 500;
  assert.deepEqual(h.store.read(1), state, 'virtual display snapshots are detached');
  assert.deepEqual((await h.store.listRecoverableIronman()).runs, [], 'valid attached heads are not recovery entries');
});

test('null-input empty-slot review is write-free and binds a later validated fresh opening', async () => {
  const h = harness(), before = disk(h.storage); h.storage.clearLog();
  const review = await h.store.inspectIronman(null, { intent: 'create', slot: 2 });
  assert.equal(review.status, 'review'); assert.equal(review.slot, 2); assert.ok(review.token);
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  const state = opening(), result = await h.store.commitIronman(2, state, { intent: 'create', token: review.token });
  assert.equal(result.status, 'committed'); exactRecord(rawRecord(h.storage), state, 2); onlyIronmanMutations(h.storage);
});

test('an atomic continuation stores the actual companion death and its floor together', async () => {
  const h = harness(), state = opening(), committed = await admit(h, state), dead = companionDeath(state);
  h.storage.clearLog();
  const result = await h.store.commitIronman(0, dead, { intent: 'continue', token: committed.token });
  assert.equal(result.status, 'committed'); assert.notEqual(result.token, committed.token);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanRecordKey(RUN)]]);
  exactRecord(rawRecord(h.storage), dead, 0);
  assert.deepEqual(rawRecord(h.storage).casualties, dead.ironman.casualties);
  assert.deepEqual(h.store.read(0), dead); onlyIronmanMutations(h.storage);
});

test('actual migrated saves create, strictly decode in a fresh store, resume, and continue canonically', async () => {
  const h = harness(), state = opening(); await admit(h, state, 1);
  assert.deepEqual(E.migrateSave(clone(rawRecord(h.storage).state)), state, 'stored authority is actually migration-idempotent');
  const reopened = harness(h.storage), before = disk(h.storage); h.storage.clearLog();
  let source, token;
  const resumed = await reopened.store.inspectIronman(RUN, { intent: 'resume', slot: 1, consume(current, context) {
    assert.equal(reopened.depth, 1); source = current; token = context.token; return 'resumed-in-lock';
  } });
  assert.equal(resumed.status, 'ready'); assert.equal(resumed.value, 'resumed-in-lock'); assert.deepEqual(source, state);
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  const next = companionDeath(source), result = await reopened.store.commitIronman(1, next, { intent: 'continue', token });
  assert.equal(result.status, 'committed'); exactRecord(rawRecord(h.storage), next, 1);
  const third = harness(h.storage);
  assert.deepEqual(third.store.read(1), next, 'another fresh actual-migrator store decodes the continued head');
  onlyIronmanMutations(h.storage);
});

test('three simultaneous Ironman slots have independent run keys and preserve every raw backup byte', async () => {
  const prior = standard(), backups = Object.fromEntries([0, 1, 2].map(id => [id, { state: prior, updatedAt: 'old-' + id, opaqueBackupNote: 'keep-' + id }]));
  const storage = memoryStorage({ [SLOT_KEY]: envelope({ backups }), [LEGACY_SAVE_KEY]: JSON.stringify(prior), unrelated: 'opaque' });
  const h = harness(storage), original = disk(storage), lives = [opening(RUN), opening(OTHER_RUN), opening(THIRD_RUN)];
  storage.clearLog();
  for (const [slot, state] of lives.entries()) await admit(h, state, slot);
  assert.equal(h.store.empty(), null); assert.equal(h.store.list().length, 3);
  for (const [slot, state] of lives.entries()) {
    exactRecord(rawRecord(storage, state.ironman.runId), state, slot);
    assert.deepEqual(h.store.read(slot), state); assert.deepEqual(h.store.backup(slot), prior);
  }
  for (const [key, value] of original) assert.equal(storage.values.get(key), value, key + ' remains byte-exact');
  assert.equal(storage.operations.length, 3); onlyIronmanMutations(storage);
});

test('Standard synchronous save/fallback behavior remains separate from the virtual Ironman cache', async () => {
  const h = harness(), plain = standard(), iron = opening();
  assert.equal(h.store.write(2, plain), true); const first = JSON.parse(h.storage.getItem(SLOT_KEY));
  await admit(h, iron, 0); const before = rawRecord(h.storage), nextPlain = progressed(plain);
  assert.equal(h.store.write(2, nextPlain), true);
  assert.deepEqual(rawRecord(h.storage), before, 'Standard draft never clones or rewrites the Ironman head');
  const after = JSON.parse(h.storage.getItem(SLOT_KEY));
  assert.deepEqual(after.slots[0], first.slots[0]); assert.deepEqual(after.slots[1], first.slots[1]);
  assert.equal(JSON.stringify(after).includes('"ironman"'), false);
  assert.deepEqual(JSON.parse(h.storage.getItem(LEGACY_SAVE_KEY)), nextPlain);
  const third = progressed(nextPlain); h.storage.failSet.add(SLOT_KEY);
  assert.equal(h.store.write(2, third), false); assert.deepEqual(h.store.read(2), third);
  assert.deepEqual(rawRecord(h.storage), before);
  h.storage.failSet.clear(); assert.equal(h.store.write(2, third), true);
  assert.deepEqual(h.store.read(0), iron);
});

test('Standard legacy migration remains read-only and never admits Ironman from a legacy mirror or raw envelope', async () => {
  const plain = standard(), iron = opening();
  const legacy = memoryStorage({ [LEGACY_SAVE_KEY]: JSON.stringify(plain) }), ordinary = harness(legacy);
  assert.deepEqual(ordinary.store.read(0), plain); assert.deepEqual(legacy.operations, []);
  for (const initial of [
    { [LEGACY_SAVE_KEY]: JSON.stringify(iron) },
    { [SLOT_KEY]: envelope({ states: { 0: iron } }), [LEGACY_SAVE_KEY]: JSON.stringify(iron) },
  ]) {
    const h = harness(memoryStorage(initial)), before = disk(h.storage);
    assert.equal(h.store.read(0), null, 'Ironman is not an ordinary fallback/draft');
    assert.equal(h.store.list().some(row => row.state?.ironman), false);
    assert.deepEqual(await h.store.listRecoverableIronman(), { status: 'ready', runs: [] });
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('ordinary write/replace/remove refuse Ironman input and active virtual ownership without touching storage', async () => {
  const h = harness(), state = opening(), committed = await admit(h, state), before = disk(h.storage);
  h.storage.clearLog();
  assert.equal(h.store.write(1, state), false);
  assert.equal(h.store.replace(1, state, { reviewed: true, token: h.store.reviewToken(1) }), false);
  assert.equal(h.store.write(0, standard()), false);
  assert.equal(h.store.replace(0, standard(), { reviewed: true, token: committed.token }), false);
  assert.equal(h.store.remove(0, { reviewed: true, token: h.store.deletionToken(0) }), false);
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('creation rejects occupied, malformed-current, and incompatible raw target data even when migration displays empty', async () => {
  const iron = opening(), plain = standard();
  const occupied = envelope({ states: { 1: plain } });
  const malformedCurrent = JSON.parse(envelope()); malformedCurrent.slots[1].state = { version: 1, broken: true };
  const sources = [occupied, JSON.stringify(malformedCurrent), '{broken', JSON.stringify({ version: 99, slots: [] }), JSON.stringify({ version: 1, slots: 'invalid' })];
  for (const source of sources) {
    const h = harness(memoryStorage({ [SLOT_KEY]: source })), before = disk(h.storage);
    failure(await h.store.inspectIronman(iron, { intent: 'create', slot: 1 }));
    failure(await h.store.commitIronman(1, iron, { intent: 'create', token: h.store.reviewToken(1) }));
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('creation requires an actual create review, fresh start day, no casualties, and no captured battle', async () => {
  const state = opening();
  for (const source of [state, { ...clone(state), ironman: { ...state.ironman, startedDay: state.day - 1 } }, captured(state), companionDeath(state)]) {
    const h = harness(), before = disk(h.storage);
    if (source === state) failure(await h.store.commitIronman(0, source, { intent: 'create', token: h.store.reviewToken(0) }));
    else {
      const review = await h.store.inspectIronman(source, { intent: 'create', slot: 0 });
      if (review.status === 'review') failure(await h.store.commitIronman(0, source, { intent: 'create', token: review.token }));
      else failure(review);
    }
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('unknown validated imported runs may carry an actual casualty but terminal imports never become heads', async () => {
  const h = harness(), dead = companionDeath(); await admit(h, dead, 0, 'import');
  exactRecord(rawRecord(h.storage), dead, 0);
  const other = harness(), ended = terminal(opening(OTHER_RUN)), before = disk(other.storage);
  failure(await other.store.inspectIronman(ended, { intent: 'import', slot: 0 }));
  assert.deepEqual(disk(other.storage), before); assert.deepEqual(other.storage.operations, []);
});

test('known-head stale imports identify the authoritative retained run and cannot overwrite it', async () => {
  const h = harness(), old = opening(), first = await admit(h, old), current = companionDeath(old);
  const saved = await h.store.commitIronman(0, current, { intent: 'continue', token: first.token }); assert.equal(saved.status, 'committed');
  const before = disk(h.storage); h.storage.clearLog();
  const review = await h.store.inspectIronman(old, { intent: 'import', slot: 1 });
  assert.equal(review.status, 'known-head'); assert.equal(review.runId, RUN);
  const attempt = await h.store.commitIronman(1, old, { intent: 'import', token: first.token });
  assert.notEqual(attempt.status, 'committed'); assert.equal(attempt.runId, RUN);
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  assert.deepEqual(h.store.read(0), current); assert.equal(h.store.read(1), null);
});

test('an old pre-casualty snapshot cannot rewind a head even with the current expected token', async () => {
  const h = harness(), old = opening(), first = await admit(h, old), current = companionDeath(old, { nextDay: true });
  const saved = await h.store.commitIronman(0, current, { intent: 'continue', token: first.token }); assert.equal(saved.status, 'committed');
  const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.commitIronman(0, old, { intent: 'continue', token: h.store.reviewToken(0) }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  assert.deepEqual(rawRecord(h.storage).casualties, current.ironman.casualties);
  assert.ok(current.ironman.casualties[0].day > old.day, 'the floor is genuinely future-dated relative to this old source');
  assert.deepEqual(old.ironman.casualties, [], 'storage never injects a future death to make an old input pass');
});

test('floor entries cannot be rewritten, removed, or moved to a different start date on continuation', async () => {
  const h = harness(), dead = companionDeath(), saved = await admit(h, dead, 0, 'import'), before = disk(h.storage);
  for (const change of [s => s.ironman.casualties = [], s => {
    s.ironman.casualties[0].battleId = 'rewritten-death'; s.battle.instanceId = 'rewritten-death';
    accepted(s, 'valid alternate battle identity still cannot rewrite a retained death');
  }, s => { s.ironman.startedDay -= 1; accepted(s, 'valid earlier start still cannot rewrite a retained run floor'); }]) {
    const candidate = clone(dead); change(candidate); h.storage.clearLog();
    failure(await h.store.commitIronman(0, candidate, { intent: 'continue', token: saved.token }));
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('resume/export consume only an authoritative detached head synchronously inside the real exclusive lock', async () => {
  const h = harness(), state = opening(); await admit(h, state);
  for (const intent of ['resume', 'export']) {
    let calls = 0; const before = disk(h.storage); h.storage.clearLog();
    const result = await h.store.inspectIronman(RUN, { intent, slot: 0, consume(current, context) {
      calls++; assert.equal(h.depth, 1); assert.deepEqual(current, state);
      assert.equal(context.runId, RUN); assert.equal(context.slot, 0); assert.ok(context.token);
      current.hero.gold += 123; return { intent, consumed: true };
    } });
    assert.equal(result.status, 'ready'); assert.deepEqual(result.value, { intent, consumed: true }); assert.equal(calls, 1);
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
    assert.deepEqual(rawRecord(h.storage).state, state, 'consumer cannot mutate the durable head');
  }
  failure(await h.store.inspectIronman(RUN, { intent: 'resume', slot: 0 }));
  assert.ok(h.locks.calls.length >= 4); assert.ok(h.locks.calls.every(call => call.mode === 'exclusive'));
});

test('resume/export reject asynchronous consumers instead of returning an unlocked deferred save permit', async () => {
  const h = harness(); await admit(h, opening()); const before = disk(h.storage); h.storage.clearLog();
  for (const intent of ['resume', 'export']) {
    let calls = 0;
    const result = await h.store.inspectIronman(RUN, { intent, slot: 0, consume() {
      calls++; assert.equal(h.depth, 1); return Promise.resolve('not-a-synchronous-consumption');
    } });
    failure(result); assert.equal(result.state, undefined); assert.equal(result.value, undefined); assert.equal(calls, 1);
  }
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('the create review binds the exact raw target and its backup, never the neighboring slot', async () => {
  const prior = standard(), h = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 0: { state: prior, updatedAt: 'keep' } } }) }));
  const state = opening(), review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 }); assert.equal(review.status, 'review');
  const raw = JSON.parse(h.storage.getItem(SLOT_KEY)); raw.slots[2].state = progressed(prior); raw.slots[2].updatedAt = 'neighbor-changed';
  h.storage.values.set(SLOT_KEY, JSON.stringify(raw)); const rawBefore = h.storage.getItem(SLOT_KEY); h.storage.clearLog();
  const result = await h.store.commitIronman(0, state, { intent: 'create', token: review.token });
  assert.equal(result.status, 'committed', 'unrelated neighboring changes do not stale an exact-target review');
  assert.equal(h.storage.getItem(SLOT_KEY), rawBefore); onlyIronmanMutations(h.storage);
  for (const change of [value => value.slots[0].revision = 'target-new-raw-revision', value => value.backups[0].updatedAt = 'backup-changed']) {
    const second = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 0: { state: prior, updatedAt: 'keep' } } }) }));
    const claim = await second.store.inspectIronman(state, { intent: 'create', slot: 0 }); assert.equal(claim.status, 'review');
    const changed = JSON.parse(second.storage.getItem(SLOT_KEY)); change(changed); second.storage.values.set(SLOT_KEY, JSON.stringify(changed));
    const before = disk(second.storage); second.storage.clearLog();
    assert.equal((await second.store.commitIronman(0, state, { intent: 'create', token: claim.token })).status, 'stale');
    assert.deepEqual(disk(second.storage), before); assert.deepEqual(second.storage.operations, []);
  }
});

test('archive retains the latest head and floor, clears only its attachment, and permits separately reviewed reattachment', async () => {
  const prior = standard(), h = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 0: { state: prior, updatedAt: 'raw-backup' } } }), [LEGACY_SAVE_KEY]: JSON.stringify(prior) }));
  const state = companionDeath(), saved = await admit(h, state, 0, 'import'), originalRaw = h.storage.getItem(SLOT_KEY), originalMirror = h.storage.getItem(LEGACY_SAVE_KEY);
  const originalNonce = rawRecord(h.storage).attachment.nonce;
  h.storage.clearLog();
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  exactRecord(rawRecord(h.storage), state, null); assert.equal(h.store.read(0), null);
  const recoverable = await h.store.listRecoverableIronman(); assert.equal(recoverable.status, 'ready'); assert.equal(recoverable.runs.length, 1);
  assert.equal(recoverable.runs[0].runId, RUN); assert.ok(recoverable.runs[0].token);
  assert.equal(recoverable.runs[0].state, undefined, 'recovery listing is display metadata, not an export permit');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 0 }); assert.equal(review.status, 'review');
  const result = await h.store.reattachIronman(RUN, 0, { reviewed: true, token: review.token }); assert.equal(result.status, 'committed');
  assert.deepEqual(result.state, state); exactRecord(rawRecord(h.storage), state, 0);
  assert.notEqual(rawRecord(h.storage).attachment.nonce, originalNonce, 'reattachment has a fresh secure ownership nonce');
  assert.equal(h.storage.getItem(SLOT_KEY), originalRaw); assert.equal(h.storage.getItem(LEGACY_SAVE_KEY), originalMirror);
  assert.deepEqual(h.store.backup(0), prior); onlyIronmanMutations(h.storage);
});

test('manual deletion is a floor-only tombstone, not an end marker or a retained playable recovery head', async () => {
  const h = harness(), original = opening(), dead = companionDeath(original), saved = await admit(h, dead, 0, 'import');
  h.storage.clearLog(); assert.equal((await h.store.deleteIronman(RUN, { reviewed: true, token: saved.token })).status, 'deleted');
  const tombstone = rawRecord(h.storage);
  assert.equal(tombstone.state, null); assert.equal(tombstone.attachment, null);
  assert.deepEqual(tombstone.casualties, dead.ironman.casualties); assert.equal(tombstone.startedDay, dead.ironman.startedDay);
  assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null); assert.equal(h.store.read(0), null);
  assert.deepEqual(await h.store.listRecoverableIronman(), { status: 'ready', runs: [] });
  const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.inspectIronman(original, { intent: 'import', slot: 0 }));
  failure(await h.store.inspectIronman(dead, { intent: 'import', slot: 0 }));
  failure(await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 0 }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('archive/delete require reviewed current-run tokens and never act on a stale revision', async () => {
  for (const method of ['archiveIronman', 'deleteIronman']) {
    const h = harness(), state = opening(), first = await admit(h, state), next = progressed(state);
    const current = await h.store.commitIronman(0, next, { intent: 'continue', token: first.token }); assert.equal(current.status, 'committed');
    const before = disk(h.storage); h.storage.clearLog();
    for (const options of [{ reviewed: false, token: current.token }, { reviewed: true }, { reviewed: true, token: first.token }]) failure(await h.store[method](RUN, options));
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('reattachment uses the authoritative head, rejects occupied targets, and cannot use a generic slot token', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state);
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  assert.equal(h.store.write(2, standard()), true); const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 2 }));
  failure(await h.store.reattachIronman(RUN, 1, { reviewed: true, token: h.store.reviewToken(1) }));
  failure(await h.store.reattachIronman(RUN, 1, { reviewed: false }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const result = await h.store.reattachIronman(RUN, 1, { reviewed: true, token: review.token });
  assert.equal(result.status, 'committed'); assert.deepEqual(result.state, state);
  assert.equal(h.store.read(0), null); assert.deepEqual(h.store.read(1), state);
});

test('reattachment review becomes stale after either head revision or exact empty-target backup changes', async () => {
  const prior = standard();
  for (const change of ['head', 'backup']) {
    const h = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 1: { state: prior, updatedAt: 'original' } } }) }));
    const state = opening(), saved = await admit(h, state);
    assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
    const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
    if (change === 'head') {
      const recovery = await h.store.listRecoverableIronman();
      assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: recovery.runs[0].token })).status, 'archived');
    } else {
      const raw = JSON.parse(h.storage.getItem(SLOT_KEY)); raw.backups[1].updatedAt = 'changed'; h.storage.values.set(SLOT_KEY, JSON.stringify(raw));
    }
    const before = disk(h.storage); h.storage.clearLog();
    assert.equal((await h.store.reattachIronman(RUN, 1, { reviewed: true, token: review.token })).status, 'stale');
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('an underlying current-slot or backup change orphans its Ironman head instead of overwriting either life', async () => {
  const prior = standard();
  for (const change of ['slot', 'backup']) {
    const h = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 0: { state: prior, updatedAt: 'original' } } }) }));
    const state = opening(), saved = await admit(h, state), retained = rawRecord(h.storage);
    const raw = JSON.parse(h.storage.getItem(SLOT_KEY));
    if (change === 'slot') raw.slots[0] = { id: 0, state: prior, updatedAt: 'new-underlying-life', revision: 'new' };
    else raw.backups[0].updatedAt = 'new-backup';
    h.storage.values.set(SLOT_KEY, JSON.stringify(raw)); const before = disk(h.storage); h.storage.clearLog();
    let consumed = false;
    failure(await h.store.inspectIronman(RUN, { intent: 'resume', slot: 0, consume() { consumed = true; } }));
    failure(await h.store.commitIronman(0, progressed(state), { intent: 'continue', token: saved.token }));
    assert.equal(consumed, false);
    const revoked = rawRecord(h.storage);
    assert.deepEqual(revoked.state, retained.state); assert.deepEqual(revoked.casualties, retained.casualties);
    assert.equal(revoked.attachment, null, 'a detected orphan may revoke only its obsolete attachment');
    const recovery = await h.store.listRecoverableIronman(); assert.equal(recovery.status, 'ready');
    assert.equal(recovery.runs.length, 1); assert.equal(recovery.runs[0].runId, RUN); assert.ok(recovery.runs[0].token);
    for (const [key, value] of before) if (key !== ironmanRecordKey(RUN)) assert.equal(h.storage.values.get(key), value);
    onlyIronmanMutations(h.storage);
    const claim = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(claim.status, 'review');
    const attached = await h.store.reattachIronman(RUN, 1, { reviewed: true, token: claim.token }); assert.equal(attached.status, 'committed');
    assert.deepEqual(attached.state, state); assert.equal(h.storage.getItem(SLOT_KEY), before.find(([key]) => key === SLOT_KEY)[1]);
  }
});

test('a target changed during atomic record persistence leaves a stored orphan, never an admitted playable continuation', async () => {
  const h = harness(), state = opening(), review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 }); assert.equal(review.status, 'review');
  h.storage.afterSet = key => {
    if (key !== ironmanRecordKey(RUN)) return;
    const raw = JSON.parse(h.storage.values.get(SLOT_KEY)); raw.slots[0].state = standard(); raw.slots[0].revision = 'concurrent-underlying-writer';
    h.storage.values.set(SLOT_KEY, JSON.stringify(raw));
  };
  let consumed = false;
  const result = await h.store.commitIronman(0, state, { intent: 'create', token: review.token, consume() { consumed = true; } });
  assert.equal(result.status, 'stored-orphan'); assert.equal(consumed, false); assert.equal(result.state, undefined);
  assert.deepEqual(rawRecord(h.storage).state, state);
  const recovery = await h.store.listRecoverableIronman(); assert.equal(recovery.status, 'ready'); assert.equal(recovery.runs[0].runId, RUN);
  onlyIronmanMutations(h.storage);
});

test('a normal hero terminal writes its ended marker first, removes only its run head, and preserves all unrelated backups', async () => {
  const prior = standard(), h = harness(memoryStorage({ [SLOT_KEY]: envelope({ backups: { 0: { state: prior, updatedAt: 'keep-exactly' } } }), [LEGACY_SAVE_KEY]: JSON.stringify(prior), unrelated: 'do-not-touch' }));
  const state = opening(), saved = await admit(h, state), neighbor = opening(OTHER_RUN); await admit(h, neighbor, 1);
  const rawBefore = h.storage.getItem(SLOT_KEY), mirrorBefore = h.storage.getItem(LEGACY_SAVE_KEY), neighborBefore = h.storage.getItem(ironmanRecordKey(OTHER_RUN));
  const ended = terminal(state); h.storage.clearLog();
  const result = await h.store.endIronman(0, ended, { token: saved.token }); assert.equal(result.status, 'ended');
  assert.equal(result.state, undefined); assert.equal(result.value, undefined, 'end never returns a full terminal save');
  assert.equal(h.storage.operations[0].kind, 'set'); assert.equal(h.storage.operations[0].key, ironmanEndedKey(RUN));
  assert.equal(h.storage.operations[1].kind, 'remove'); assert.equal(h.storage.operations[1].key, ironmanRecordKey(RUN));
  const marker = JSON.parse(h.storage.getItem(ironmanEndedKey(RUN))); assert.equal(marker.runId, RUN); assert.equal(marker.state, undefined);
  assert.equal(h.storage.getItem(ironmanRecordKey(RUN)), null); assert.equal(h.store.read(0), null);
  assert.equal(h.storage.getItem(SLOT_KEY), rawBefore); assert.equal(h.storage.getItem(LEGACY_SAVE_KEY), mirrorBefore);
  assert.equal(h.storage.getItem(ironmanRecordKey(OTHER_RUN)), neighborBefore); assert.equal(h.storage.getItem('unrelated'), 'do-not-touch');
  assert.deepEqual(h.store.backup(0), prior); onlyIronmanMutations(h.storage);
  assert.equal((await h.store.inspectIronman(state, { intent: 'import', slot: 2 })).status, 'ended');
  assert.deepEqual((await h.store.listRecoverableIronman()).runs, []);
});

test('native opening-turn hero death uses the same marker-first cleanup before any living continuation', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), ended = openingTerminal(state);
  h.storage.clearLog(); const result = await h.store.endIronman(0, ended, { token: saved.token });
  assert.equal(result.status, 'ended'); assert.equal(result.state, undefined);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanEndedKey(RUN)], ['remove', ironmanRecordKey(RUN)]]);
  assert.equal(h.store.read(0), null); assert.equal(h.storage.getItem(ironmanRecordKey(RUN)), null); onlyIronmanMutations(h.storage);
});

test('an actual terminal continuing the stored battle preserves its captured companion death and prior floor through end', async () => {
  const h = harness(), dead = companionDeath(), saved = await admit(h, dead, 0, 'import'), ended = terminal(dead);
  assert.equal(ended.battle.instanceId, dead.battle.instanceId);
  assert.deepEqual(ended.battle.mortality.participants, dead.battle.mortality.participants);
  assert.deepEqual(ended.ironman.casualties, dead.ironman.casualties);
  assert.equal(actor(ended, 'mira').hp, 0, 'the existing captured dead ally is never revived to make a terminal fixture');
  for (const death of dead.battle.mortality.deaths) assert.ok(ended.battle.mortality.deaths.some(row => row.actorId === death.actorId && row.personId === death.personId));
  h.storage.clearLog(); const result = await h.store.endIronman(0, ended, { token: saved.token });
  assert.equal(result.status, 'ended'); assert.equal(result.state, undefined);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanEndedKey(RUN)], ['remove', ironmanRecordKey(RUN)]]);
  onlyIronmanMutations(h.storage);
});

test('a valid same-owner terminal from an earlier day cannot end a later head even with its fresh token', async () => {
  const h = harness(), old = opening(), first = await admit(h, old), newer = clone(old);
  // Controlled one-day saved-position projection isolates the history guard.
  newer.day += 1; accepted(newer, 'valid later-day head with unchanged living owner and no casualties');
  const latest = await h.store.commitIronman(0, newer, { intent: 'continue', token: first.token }); assert.equal(latest.status, 'committed');
  const ended = terminal(old); assert.equal(ended.dynasty.activePersonId, newer.dynasty.activePersonId); assert.ok(ended.day < newer.day);
  const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.endIronman(0, ended, { token: latest.token }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []); assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null);
});

test('a changed-generation terminal cannot end the current same-person head with a fresh token', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), ended = terminal(state);
  // Controlled generation-counter mismatch, not earned succession. The
  // immutable current person remains the same; store ownership must still
  // bind the exact generation rather than accepting a newer-looking counter.
  ended.dynasty.generation += 1;
  accepted(ended, 'valid controlled different-generation terminal with the same current person');
  assert.equal(ended.dynasty.activePersonId, state.dynasty.activePersonId);
  const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.endIronman(0, ended, { token: saved.token }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []); assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null);
});

test('end rejects the wrong run, old token, different started day, nonterminal input, and omitted prior companion floor', async () => {
  const h = harness(), state = opening(), first = await admit(h, state), dead = companionDeath(state);
  const current = await h.store.commitIronman(0, dead, { intent: 'continue', token: first.token }); assert.equal(current.status, 'committed');
  const good = terminal(dead), alteredStart = clone(good); alteredStart.ironman.startedDay -= 1;
  const before = disk(h.storage); h.storage.clearLog();
  for (const [candidate, token] of [[terminal(opening(OTHER_RUN)), current.token], [good, first.token], [alteredStart, current.token], [dead, current.token], [terminal(state), current.token]]) {
    failure(await h.store.endIronman(0, candidate, { token }));
    assert.deepEqual(disk(h.storage), before);
  }
  assert.deepEqual(h.storage.operations, []); assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null);
});

test('a failed ended-marker write cannot delete a head or make an old run silently playable again', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), before = disk(h.storage);
  h.storage.failSet.add(ironmanEndedKey(RUN)); h.storage.clearLog();
  failure(await h.store.endIronman(0, terminal(state), { token: saved.token }));
  assert.deepEqual(disk(h.storage), before);
  assert.equal(h.storage.operations.some(op => op.kind === 'remove'), false);
  assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null); onlyIronmanMutations(h.storage);
});

test('durable ended markers block resume/export/import while failed cleanup is retried without an old token', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), ended = terminal(state);
  h.storage.failRemove.add(ironmanRecordKey(RUN)); h.storage.clearLog();
  const result = await h.store.endIronman(0, ended, { token: saved.token }); assert.equal(result.status, 'ended-cleanup-pending');
  assert.ok(h.storage.getItem(ironmanEndedKey(RUN))); assert.ok(h.storage.getItem(ironmanRecordKey(RUN)));
  assert.equal(h.store.read(0), null); assert.equal(result.state, undefined);
  for (const intent of ['resume', 'export']) {
    let consumed = false;
    assert.equal((await h.store.inspectIronman(RUN, { intent, slot: 0, consume() { consumed = true; } })).status, 'ended');
    assert.equal(consumed, false);
  }
  assert.equal((await h.store.inspectIronman(state, { intent: 'import', slot: 1 })).status, 'ended');
  assert.deepEqual(await h.store.listRecoverableIronman(), { status: 'ready', runs: [] });
  const markerBefore = h.storage.getItem(ironmanEndedKey(RUN)); h.storage.failRemove.clear(); h.storage.clearLog();
  assert.equal((await h.store.endIronman(0, ended, {})).status, 'ended');
  assert.equal(h.storage.getItem(ironmanRecordKey(RUN)), null); assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), markerBefore);
  onlyIronmanMutations(h.storage);
});

test('a changed underlying base prevents unmarked end cleanup and leaves unrelated current/backup data byte-exact', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), ended = terminal(state), raw = JSON.parse(h.storage.getItem(SLOT_KEY));
  raw.slots[0].state = standard(); raw.slots[0].revision = 'replacement-current';
  raw.backups[0] = { state: standard(), updatedAt: 'replacement-backup' };
  h.storage.values.set(SLOT_KEY, JSON.stringify(raw)); const before = disk(h.storage); h.storage.clearLog();
  failure(await h.store.endIronman(0, ended, { token: saved.token }));
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('recovery enumerates the entire storage prefix, not a fixed first-key window or cached slot list', async () => {
  const h = harness();
  for (let index = 0; index < 180; index++) h.storage.values.set('unrelated-prefix-' + index, 'opaque-' + index);
  const saved = await admit(h, opening(), 2);
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  h.storage.clearLog(); const before = disk(h.storage), result = await h.store.listRecoverableIronman();
  assert.equal(result.status, 'ready'); assert.equal(result.runs.length, 1); assert.equal(result.runs[0].runId, RUN); assert.ok(result.runs[0].token);
  assert.ok(h.storage.enumerated.includes(ironmanRecordKey(RUN)), 'the record after 180 unrelated entries is visited');
  assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('malformed records anywhere in a full-prefix recovery scan fail closed instead of returning a partial clean list', async () => {
  for (const kind of ['record-json', 'marker-json', 'key-identity', 'floor-shape']) {
    const h = harness(), saved = await admit(h, opening());
    assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
    for (let index = 0; index < 130; index++) h.storage.values.set('unrelated-' + index, 'opaque');
    if (kind === 'record-json') h.storage.values.set(ironmanRecordKey(OTHER_RUN), '{malformed');
    if (kind === 'marker-json') h.storage.values.set(ironmanEndedKey(OTHER_RUN), '{malformed');
    if (kind === 'key-identity') h.storage.values.set(ironmanRecordKey(OTHER_RUN), JSON.stringify(rawRecord(h.storage)));
    if (kind === 'floor-shape') { const record = rawRecord(h.storage); record.casualties = { wrong: true }; h.storage.values.set(ironmanRecordKey(RUN), JSON.stringify(record)); }
    const before = disk(h.storage); h.storage.clearLog(); const result = await h.store.listRecoverableIronman(); failure(result);
    assert.ok(!result.runs || result.runs.length === 0, 'a blocked scan never presents a partial authoritative recovery list');
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('inaccessible length/key/record reads block recovery without modifying any key', async () => {
  for (const kind of ['length', 'key', 'record']) {
    const h = harness(), saved = await admit(h, opening());
    assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
    if (kind === 'length') h.storage.failLength = true;
    if (kind === 'key') h.storage.failKey = true;
    if (kind === 'record') h.storage.failGet.add(ironmanRecordKey(RUN));
    const before = disk(h.storage); h.storage.clearLog(); failure(await h.store.listRecoverableIronman());
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('missing or failed secure randomness blocks new claims without time/Math.random fallback', async () => {
  for (const crypto of [null, {}, { randomUUID() { throw Error('Secure entropy unavailable'); } }, { randomUUID: () => 'not-a-secure-uuid' }]) {
    const h = harness(undefined, crypto), state = opening(), before = disk(h.storage); h.storage.clearLog();
    const review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 });
    if (review.status === 'review') failure(await h.store.commitIronman(0, state, { intent: 'create', token: review.token }));
    else failure(review);
    assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('raw target, run-head, and marker read failures fail closed without durable writes or consumer execution', async () => {
  for (const key of [SLOT_KEY, ironmanRecordKey(RUN), ironmanEndedKey(RUN)]) {
    const h = harness(), state = opening(), saved = await admit(h, state), before = disk(h.storage);
    h.storage.failGet.add(key); h.storage.clearLog(); let consumed = false;
    failure(await h.store.inspectIronman(RUN, { intent: 'resume', slot: 0, consume() { consumed = true; } }));
    failure(await h.store.commitIronman(0, progressed(state), { intent: 'continue', token: saved.token }));
    assert.equal(consumed, false); assert.deepEqual(disk(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('record quota failure preserves the previous head and its companion floor, with no Standard mirror rollback writes', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), dead = companionDeath(state), before = disk(h.storage);
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.storage.clearLog(); let consumed = false;
  failure(await h.store.commitIronman(0, dead, { intent: 'continue', token: saved.token, consume() { consumed = true; } }));
  assert.equal(consumed, false); assert.deepEqual(disk(h.storage), before);
  assert.deepEqual(rawRecord(h.storage).casualties, []); assert.deepEqual(rawRecord(h.storage).state, state);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanRecordKey(RUN)]]); onlyIronmanMutations(h.storage);
});

test('archive/delete quota failures retain the latest authoritative head and never write an ended marker', async () => {
  for (const method of ['archiveIronman', 'deleteIronman']) {
    const h = harness(), state = companionDeath(), saved = await admit(h, state, 0, 'import'), before = disk(h.storage);
    h.storage.failSet.add(ironmanRecordKey(RUN)); h.storage.clearLog();
    failure(await h.store[method](RUN, { reviewed: true, token: saved.token }));
    assert.deepEqual(disk(h.storage), before); exactRecord(rawRecord(h.storage), state, 0);
    assert.equal(h.storage.getItem(ironmanEndedKey(RUN)), null);
    assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanRecordKey(RUN)]]); onlyIronmanMutations(h.storage);
  }
});

test('unconfirmed atomic head persistence never yields a playable state or runs its consumer', async () => {
  const h = harness(), state = opening(), review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 }); assert.equal(review.status, 'review');
  h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  h.storage.clearLog(); let consumed = false;
  const result = await h.store.commitIronman(0, state, { intent: 'create', token: review.token, consume() { consumed = true; } });
  assert.equal(result.status, 'unconfirmed'); assert.equal(result.state, undefined); assert.equal(consumed, false);
  assert.deepEqual(rawRecord(h.storage).state, state, 'the write may have executed despite a failed confirmation read');
  onlyIronmanMutations(h.storage);
});

test('a mismatched head confirmation read cannot be mistaken for a committed write', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), previousBytes = h.storage.getItem(ironmanRecordKey(RUN));
  h.storage.afterSet = key => {
    if (key === ironmanRecordKey(RUN)) h.storage.readOverride = (readKey, actual) => readKey === key ? previousBytes : actual;
  };
  h.storage.clearLog(); let consumed = false;
  const result = await h.store.commitIronman(0, progressed(state), { intent: 'continue', token: saved.token, consume() { consumed = true; } });
  assert.equal(result.status, 'unconfirmed'); assert.equal(result.state, undefined); assert.equal(consumed, false); onlyIronmanMutations(h.storage);
});

test('an unconfirmed ended marker preserves the head until marker durability can be verified', async () => {
  const h = harness(), state = opening(), saved = await admit(h, state), ended = terminal(state);
  h.storage.afterSet = key => { if (key === ironmanEndedKey(RUN)) h.storage.failGet.add(key); };
  h.storage.clearLog(); const result = await h.store.endIronman(0, ended, { token: saved.token });
  failure(result); assert.equal(result.state, undefined);
  assert.ok(h.storage.values.has(ironmanEndedKey(RUN))); assert.ok(h.storage.values.has(ironmanRecordKey(RUN)));
  assert.equal(h.storage.operations.some(op => op.kind === 'remove'), false); onlyIronmanMutations(h.storage);
});
