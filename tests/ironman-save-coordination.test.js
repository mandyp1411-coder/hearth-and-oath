import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveCoordinator, createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { migrateSave, validateSave } from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { createIronmanMetadata, currentIronmanPerson, recordCombatZero, ironmanHeroDeath } from '../dist/js/ironman.js';
import {
  IRONMAN_RECORD_PREFIX, IRONMAN_ENDED_PREFIX,
  ironmanRecordKey, ironmanEndedKey, isIronmanStorageKey,
} from '../dist/js/ironman-storage.js';
import { freshStory } from './helpers/story-life-fixtures.mjs';

// Finite, controlled storage/coordination cases only. These do not execute a
// browser, prove every concurrent schedule, certify session/UI integration,
// earn a lifetime/party, or authorize publication. Synchronous storage hooks
// explicitly model an actually UNLOCKED Standard writer at a selected boundary.
// Real Web Locks do not serialize that writer. Raw-token ABA can be unobserved;
// this suite does not claim to detect it or provide cross-profile anti-cheat.
// This file is authored only; execution belongs to a separately approved gate.
const SLOT_KEY = 'hearth-and-oath:slots:v1';
const LOCK_NAME = 'hearth-and-oath:save:v1';
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const copy = value => structuredClone(value);
const valid = (state, label = 'controlled storage fixture') => {
  assert.equal(validateSave(state), true, label);
  return state;
};
let opening;
function standard(delta = 0) {
  // Reuse one actual migrated fixture, not repeated generated adult lifetimes.
  opening ||= valid(migrateSave(freshStory()), 'actual freshStory fixture migrates');
  const state = copy(opening);
  state.hero.gold += delta;
  return valid(state);
}
function ironman(runId = RUN) {
  const state = standard();
  assert.equal(state.battle, null);
  state.ironman = createIronmanMetadata(state, { randomUUID: () => runId });
  return valid(state, 'metadata-only controlled Ironman opt-in');
}
function advance(state, delta = 1) {
  const next = copy(state);
  next.hero.gold += delta;
  return valid(next, 'detached gold-only storage position');
}
function casualty(state, id = 'mira') {
  // Controlled already-applied valid snapshot, not engine casualty evidence.
  const next = copy(state), actual = next.companions.find(person => person.id === id);
  const person = currentIronmanPerson(next, id);
  assert.ok(actual && person && actual.alive !== false && person.alive === true);
  const death = { personId: person.id, day: next.day, battleId: 'storage-controlled-casualty', generation: next.dynasty.generation };
  Object.assign(actual, { alive: false, active: false, recruited: false, hp: 0, deathDay: next.day });
  Object.assign(person, { alive: false, deathDay: next.day });
  next.rpg.companionStages[id].status = 'dead';
  next.ironman.casualties.push(death);
  return valid(next, 'controlled already-applied companion casualty');
}
function terminal(state) {
  // Real detached battle capture plus a controlled zero transition. This tests
  // durable marker ordering, not the engine's damage/acceptance boundary.
  const next = copy(state);
  assert.equal(next.battle, null);
  next.battle = createBattle(next, 'forest', null, { openingTurns: false });
  next.battle.instanceId = 'storage-controlled-hero-terminal';
  const hero = next.battle.actors.find(actor => actor.id === 'hero'), hp = hero.hp;
  hero.hp = 0;
  assert.equal(recordCombatZero(next.battle, 'hero', hp), true);
  valid(next, 'controlled validated internal hero-terminal descriptor');
  assert.ok(ironmanHeroDeath(next));
  return next;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function locks() {
  let pending = Promise.resolve(), active = null, maxHeld = 0, held = 0;
  const requests = [];
  const manager = {
    requests,
    get active() { return active; },
    get maxHeld() { return maxHeld; },
    request(name, options, operation) {
      assert.equal(name, LOCK_NAME);
      assert.equal(options.mode, 'exclusive');
      requests.push({ name, mode: options.mode });
      const result = pending.then(async () => {
        assert.equal(active, null, 'the fake grants only one actual lock at a time');
        active = Object.freeze({ name, mode: 'exclusive' });
        held++; maxHeld = Math.max(maxHeld, held);
        try { return await operation(active); }
        finally { held--; active = null; }
      });
      pending = result.catch(() => {});
      return result;
    },
    hold() {
      const entered = deferred(), release = deferred();
      const done = manager.request(LOCK_NAME, { mode: 'exclusive' }, async () => {
        entered.resolve();
        await release.promise;
      });
      return { entered: entered.promise, release: () => release.resolve(), done };
    },
  };
  return manager;
}
function disk(initial = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    values, audit: [], hooks: {}, source: 'guarded', failSet: null, failRemove: null,
    failEnumeration: false, keyOverride: null,
    get length() {
      storage.hooks.enumerate?.();
      if (storage.failEnumeration) throw Error('Controlled discovery denied');
      return values.size;
    },
    key(index) {
      storage.hooks.enumerate?.();
      if (storage.failEnumeration) throw Error('Controlled discovery denied');
      return storage.keyOverride ? storage.keyOverride(index, [...values.keys()]) : [...values.keys()][index] ?? null;
    },
    getItem(key) {
      storage.hooks.beforeGet?.(key);
      const value = values.get(key) ?? null;
      storage.hooks.afterGet?.(key, value);
      return value;
    },
    setItem(key, value) {
      storage.hooks.beforeSet?.(key, String(value));
      if (storage.failSet === key || storage.failSet === '*') throw Error('Controlled quota failure');
      values.set(key, String(value));
      storage.audit.push({ op: 'set', key, value: String(value), source: storage.source });
      storage.hooks.afterSet?.(key, String(value));
    },
    removeItem(key) {
      storage.hooks.beforeRemove?.(key);
      if (storage.failRemove === key || storage.failRemove === '*') throw Error('Controlled cleanup failure');
      values.delete(key);
      storage.audit.push({ op: 'remove', key, source: storage.source });
      storage.hooks.afterRemove?.(key);
    },
  };
  return storage;
}
function populatedDisk() {
  const slots = [
    { id: 0, state: null, updatedAt: null, revision: 'raw-empty-0' },
    { id: 1, state: standard(10), updatedAt: '2026-10-16T01:00:00.000Z', revision: 'raw-neighbor-1' },
    { id: 2, state: standard(20), updatedAt: '2026-10-16T02:00:00.000Z', revision: 'raw-neighbor-2' },
  ];
  const backups = {
    1: { state: standard(5), updatedAt: '2026-10-15T01:00:00.000Z' },
    2: { state: standard(15), updatedAt: '2026-10-15T02:00:00.000Z' },
  };
  return disk({
    [SLOT_KEY]: JSON.stringify({ version: 1, activeSlot: 1, slots, backups }),
    [LEGACY_SAVE_KEY]: JSON.stringify(slots[1].state),
  });
}
const bytes = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
const sharedBytes = storage => [storage.values.get(SLOT_KEY) ?? null, storage.values.get(LEGACY_SAVE_KEY) ?? null];
const record = (storage, runId = RUN) => JSON.parse(storage.values.get(ironmanRecordKey(runId)) || 'null');
const marker = (storage, runId = RUN) => JSON.parse(storage.values.get(ironmanEndedKey(runId)) || 'null');
function setup({ populated = true } = {}) {
  const storage = populated ? populatedDisk() : disk(), manager = locks();
  const coordinateA = createSaveCoordinator(manager), coordinateB = createSaveCoordinator(manager);
  const provider = { randomUUID: (() => {
    let id = 0;
    return () => `aaaaaaaa-bbbb-4ccc-8ddd-${(++id).toString(16).padStart(12, '0')}`;
  })() };
  const load = (coordinate = createSaveCoordinator(manager)) => createSaveStore(storage, migrateSave, { coordinate, crypto: provider });
  return { storage, manager, coordinateA, coordinateB, load, a: load(coordinateA), b: load(coordinateB) };
}
async function claim(store, state = ironman(), slot = 0, intent = 'create') {
  const review = await store.inspectIronman(state, { intent, slot });
  assert.equal(review.status, 'review'); assert.equal(review.slot, slot); assert.ok(review.token);
  const result = await store.commitIronman(slot, state, { intent, token: review.token });
  assert.equal(result.status, 'committed'); assert.equal(result.slot, slot); assert.ok(result.token);
  assert.equal(result.runId, state.ironman.runId);
  assert.deepEqual(result.state, state);
  return result;
}
async function position(store, runId = RUN, slot = 0, intent = 'resume') {
  const result = await store.inspectIronman(runId, {
    intent, slot,
    consume(state, context) { return { state: copy(state), ...context }; },
  });
  assert.equal(result.status, 'ready'); assert.ok(result.value.token);
  assert.equal(result.value.slot, slot); assert.equal(result.value.runId, runId);
  return result.value;
}
async function reattach(store, runId = RUN, slot = 0) {
  const review = await store.inspectIronman(runId, { intent: 'reattach', slot });
  assert.equal(review.status, 'review'); assert.ok(review.token);
  const result = await store.reattachIronman(runId, slot, { reviewed: true, token: review.token });
  assert.equal(result.status, 'committed');
  return result;
}
function rejected(result, label = 'guard refuses the stale operation') {
  assert.ok(['blocked', 'stale', 'stored-orphan', 'ended'].includes(result.status), `${label}: ${result.status}`);
}
function mutateRawTarget(storage, change) {
  const raw = JSON.parse(storage.values.get(SLOT_KEY));
  change(raw);
  storage.values.set(SLOT_KEY, JSON.stringify(raw));
}
function assertOnlyIndependentWrites(storage, from = 0) {
  for (const event of storage.audit.slice(from).filter(event => event.source === 'guarded')) {
    assert.equal(isIronmanStorageKey(event.key), true, `Ironman never mutates shared/other key ${event.key}`);
  }
}

test('required exclusive coordination never executes on absent, denied or unsupported Locks', async () => {
  for (const supplied of [null, {}, { request: async () => undefined }, ...['SecurityError', 'NotSupportedError', 'Error'].map(name => ({
    request() { return Promise.reject(Object.assign(Error('Controlled denial'), { name })); },
  }))]) {
    const coordinate = createSaveCoordinator(supplied);
    let calls = 0;
    await assert.rejects(async () => coordinate.exclusive(() => ++calls));
    assert.equal(calls, 0, 'no Standard fallback is an Ironman lock');
  }
});

test('required exclusive coordination verifies the actual callback lock name and mode', async () => {
  for (const suppliedLock of [undefined, null, {}, { name: LOCK_NAME }, { name: LOCK_NAME, mode: 'shared' }, { name: 'different-lock', mode: 'exclusive' }]) {
    let calls = 0;
    const coordinate = createSaveCoordinator({ request: async (name, options, callback) => callback(suppliedLock) });
    await assert.rejects(async () => coordinate.exclusive(() => ++calls));
    assert.equal(calls, 0, 'API presence or a callback without the actual exclusive lock cannot authorize execution');
  }
});

test('Standard coordinator fallback remains synchronous when absent and preserves denial queue order', async () => {
  let calls = 0;
  assert.equal(createSaveCoordinator(null)(() => ++calls), 1);
  for (const name of ['SecurityError', 'NotSupportedError']) {
    const gate = deferred(), order = [];
    const coordinate = createSaveCoordinator({ async request() { await gate.promise; throw Object.assign(Error('Controlled denied origin'), { name }); } });
    const first = coordinate(() => { order.push(1); return 1; });
    const second = coordinate(() => { order.push(2); return 2; });
    gate.resolve();
    assert.deepEqual(await Promise.all([first, second]), [1, 2]);
    assert.equal(await coordinate(() => { order.push(3); return 3; }), 3);
    assert.deepEqual(order, [1, 2, 3]); assert.equal(coordinate.locking(), false);
  }
});

test('Standard and required-exclusive operations share a queue and failed entered operations run once', async () => {
  const manager = locks(), coordinate = createSaveCoordinator(manager), order = [];
  const held = manager.hold(); await held.entered;
  const first = coordinate(() => { order.push('standard'); return 's'; });
  const second = coordinate.exclusive(() => { assert.ok(manager.active); order.push('ironman'); throw Error('Controlled entered failure'); });
  const failure = assert.rejects(second, /Controlled entered failure/);
  const third = coordinate(() => { order.push('standard-after'); return 'after'; });
  assert.deepEqual(order, []);
  held.release(); await held.done;
  assert.equal(await first, 's'); await failure; assert.equal(await third, 'after');
  assert.deepEqual(order, ['standard', 'ironman', 'standard-after']);
  assert.equal(manager.maxHeld, 1);
  assert.ok(manager.requests.every(request => request.name === LOCK_NAME && request.mode === 'exclusive'));
});

test('Standard denial fallback does not grant a required operation permission to run without a later actual lock', async () => {
  let requests = 0, calls = 0;
  const coordinate = createSaveCoordinator({ async request(name, options, callback) {
    requests++;
    if (requests < 3) throw Object.assign(Error('Controlled SecurityError'), { name: 'SecurityError' });
    return callback({ name, mode: options.mode });
  } });
  assert.equal(await coordinate(() => ++calls), 1);
  assert.equal(coordinate.locking(), false);
  await assert.rejects(async () => coordinate.exclusive(() => ++calls));
  assert.equal(calls, 1);
  assert.equal(await coordinate.exclusive(() => ++calls), 2);
  assert.equal(requests, 3, 'strict operations still request and verify an actual lock after Standard fallback');
});

test('store refuses caller booleans, custom coordinators and replaced fake exclusive methods', async () => {
  const fake = operation => operation(); fake.exclusive = operation => operation();
  const registeredWithoutLocks = createSaveCoordinator(null);
  registeredWithoutLocks.exclusive = operation => operation();
  for (const coordinate of [undefined, true, fake, registeredWithoutLocks]) {
    const storage = populatedDisk(), store = createSaveStore(storage, migrateSave, { coordinate, exclusive: true });
    const before = bytes(storage);
    rejected(await store.inspectIronman(ironman(), { intent: 'create', slot: 0 }));
    rejected(await store.commitIronman(0, ironman(), { intent: 'create', token: store.reviewToken(0), exclusive: true }));
    assert.deepEqual(bytes(storage), before);
  }
});

test('store captures the registered private capability instead of consulting a public exclusive property', async () => {
  const { storage, manager, coordinateA, a } = setup();
  coordinateA.exclusive = () => { throw Error('Caller replaced public property'); };
  const original = sharedBytes(storage), result = await claim(a);
  assert.ok(manager.requests.length >= 2);
  assert.deepEqual(record(storage).state, result.state);
  assert.deepEqual(sharedBytes(storage), original); assertOnlyIndependentWrites(storage);
});

test('Standard-only writes keep mirror-first durability and the existing session-only fallback', () => {
  for (const failKey of [SLOT_KEY, LEGACY_SAVE_KEY, '*']) {
    const storage = populatedDisk(), store = createSaveStore(storage, migrateSave), before = bytes(storage);
    const next = standard(33); storage.failSet = failKey;
    assert.equal(store.write(1, next), false);
    assert.deepEqual(bytes(storage), before); assert.deepEqual(store.read(1), next);
    assert.equal(store.available(), false);
    storage.failSet = null; assert.equal(store.write(1, next), true);
    const restored = createSaveStore(storage, migrateSave);
    assert.deepEqual(restored.read(1), next); assert.deepEqual(restored.backup(2), standard(15));
  }
});

test('normal guarded operations discover under the real lock; confirmed ended cleanup is the deliberate exception', async () => {
  const { storage, manager, a } = setup();
  let probes = 0;
  storage.hooks.enumerate = () => { assert.deepEqual(manager.active, { name: LOCK_NAME, mode: 'exclusive' }); probes++; };
  async function discovered(operation) {
    const before = probes, result = await operation();
    assert.ok(probes > before, 'each operation performs fresh complete-prefix discovery');
    return result;
  }
  const state = ironman();
  const review = await discovered(() => a.inspectIronman(state, { intent: 'create', slot: 0 }));
  assert.equal(review.status, 'review');
  const initial = await discovered(() => a.commitIronman(0, state, { intent: 'create', token: review.token }));
  assert.equal(initial.status, 'committed');
  const resumed = await discovered(() => a.inspectIronman(RUN, { intent: 'resume', slot: 0, consume: value => value.hero.gold }));
  assert.equal(resumed.status, 'ready'); assert.equal(resumed.value, state.hero.gold);
  const exported = await discovered(() => a.inspectIronman(state, { intent: 'export', slot: 0, consume: value => JSON.stringify(value) }));
  assert.equal(exported.status, 'ready'); assert.deepEqual(JSON.parse(exported.value), state);
  const committed = await discovered(() => a.commitIronman(0, advance(state), { intent: 'continue', token: initial.token }));
  assert.equal(committed.status, 'committed');
  assert.equal((await discovered(() => a.listRecoverableIronman())).status, 'ready');
  assert.equal((await discovered(() => a.archiveIronman(RUN, { reviewed: true, token: committed.token }))).status, 'archived');
  const attachReview = await discovered(() => a.inspectIronman(RUN, { intent: 'reattach', slot: 0 }));
  assert.equal(attachReview.status, 'review');
  const attached = await discovered(() => a.reattachIronman(RUN, 0, { reviewed: true, token: attachReview.token }));
  assert.equal(attached.status, 'committed');
  assert.equal((await discovered(() => a.deleteIronman(RUN, { reviewed: true, token: attached.token }))).status, 'deleted');
  const otherState = ironman(OTHER_RUN);
  const otherReview = await discovered(() => a.inspectIronman(otherState, { intent: 'create', slot: 0 }));
  assert.equal(otherReview.status, 'review');
  const other = await discovered(() => a.commitIronman(0, otherState, { intent: 'create', token: otherReview.token }));
  assert.equal(other.status, 'committed');
  const retainedBytes = storage.values.get(ironmanRecordKey(OTHER_RUN));
  assert.equal((await discovered(() => a.endIronman(0, terminal(otherState), { token: other.token }))).status, 'ended');
  // Controlled reappearing dead bytes plus an unrelated malformed record. A
  // confirmed valid marker must permit exact dead-key cleanup, not creation or
  // adoption, without requiring a ceremonial successful global discovery.
  storage.values.set(ironmanRecordKey(OTHER_RUN), retainedBytes);
  const unrelatedKey = ironmanRecordKey('22334455-6677-4899-aabb-ccddeeff0011');
  storage.values.set(unrelatedKey, '{unrelated malformed record');
  rejected(await a.listRecoverableIronman(), 'normal discovery still blocks');
  const beforeCleanup = bytes(storage), markerBytes = storage.values.get(ironmanEndedKey(OTHER_RUN));
  const auditFrom = storage.audit.length;
  let markerReads = 0, enumerations = 0;
  storage.hooks.enumerate = () => { enumerations++; throw Error('Controlled unrelated discovery failure'); };
  storage.hooks.beforeGet = key => {
    if (key === ironmanEndedKey(OTHER_RUN)) {
      assert.deepEqual(manager.active, { name: LOCK_NAME, mode: 'exclusive' }); markerReads++;
    }
  };
  storage.hooks.beforeRemove = key => {
    assert.deepEqual(manager.active, { name: LOCK_NAME, mode: 'exclusive' });
    assert.equal(key, ironmanRecordKey(OTHER_RUN));
    assert.ok(markerReads > 0, 'the valid marker is freshly checked before cleanup');
  };
  assert.equal((await a.endIronman(0, terminal(otherState), { token: other.token })).status, 'ended');
  assert.equal(enumerations, 0); assert.ok(markerReads > 0);
  assert.deepEqual(bytes(storage), beforeCleanup.filter(([key]) => key !== ironmanRecordKey(OTHER_RUN)));
  assert.equal(storage.values.get(ironmanEndedKey(OTHER_RUN)), markerBytes);
  assert.deepEqual(storage.audit.slice(auditFrom), [{ op: 'remove', key: ironmanRecordKey(OTHER_RUN), source: 'guarded' }]);
  storage.hooks = {};
});

test('resume/export require an immediate synchronous consumer and expose no reusable approval', async () => {
  const { storage, manager, a } = setup(), initial = await claim(a), before = bytes(storage);
  for (const intent of ['resume', 'export']) {
    rejected(await a.inspectIronman(RUN, { intent, slot: 0 }));
    rejected(await a.inspectIronman(RUN, { intent, slot: 0, consume: () => Promise.resolve('not-synchronous') }));
    let calls = 0;
    const result = await a.inspectIronman(RUN, { intent, slot: 0, consume(state, context) {
      calls++;
      assert.deepEqual(manager.active, { name: LOCK_NAME, mode: 'exclusive' });
      assert.deepEqual(state, initial.state);
      assert.equal(context.token, initial.token); assert.equal(context.slot, 0); assert.equal(context.runId, RUN);
      return state.hero.gold;
    } });
    assert.equal(result.status, 'ready'); assert.equal(result.value, initial.state.hero.gold); assert.equal(calls, 1);
    assert.equal(Object.hasOwn(result, 'approved'), false);
  }
  assert.deepEqual(bytes(storage), before);
});

test('malformed record/marker prefix discovery blocks Ironman but preserves valid Standard operation', async () => {
  for (const [key, value] of [
    [ironmanRecordKey(OTHER_RUN), '{not-json'],
    [ironmanEndedKey(OTHER_RUN), '{not-json'],
    [IRONMAN_RECORD_PREFIX + 'invalid-identity', '{}'],
    [IRONMAN_ENDED_PREFIX + 'invalid-identity', '{}'],
  ]) {
    const { storage, a } = setup(); storage.values.set(key, value);
    const before = bytes(storage);
    rejected(await a.inspectIronman(ironman(), { intent: 'create', slot: 0 }));
    rejected(await a.listRecoverableIronman());
    assert.deepEqual(bytes(storage), before);
    assert.equal(a.write(1, standard(44)), true, 'unrelated valid Standard mutation is not disabled');
    assert.equal(storage.values.get(key), value, 'unknown mortality bytes survive exactly');
    assert.deepEqual(createSaveStore(storage, migrateSave).backup(2), standard(15));
  }
});

test('incomplete or unavailable key enumeration cannot pretend an Ironman origin has no retained runs', async () => {
  for (const fault of ['throw', 'missing-key', 'duplicate-key']) {
    const { storage, a } = setup();
    await claim(a); const before = bytes(storage);
    if (fault === 'throw') storage.failEnumeration = true;
    if (fault === 'missing-key') storage.keyOverride = () => null;
    if (fault === 'duplicate-key') storage.keyOverride = (index, keys) => keys[0];
    let consumes = 0;
    rejected(await a.inspectIronman(RUN, { intent: 'export', slot: 0, consume() { consumes++; } }));
    rejected(await a.listRecoverableIronman()); assert.equal(consumes, 0);
    assert.deepEqual(bytes(storage), before);
    storage.failEnumeration = false; storage.keyOverride = null;
    assert.equal(a.write(1, standard(45)), true);
    assert.deepEqual(record(storage).state, ironman());
  }
});

test('ordinary synchronous write/replace/remove cannot create or displace a virtual Ironman position', async () => {
  const { storage, a } = setup(), state = ironman(), pristine = bytes(storage);
  assert.equal(a.write(0, state), false);
  assert.equal(a.replace(0, state, { reviewed: true, token: a.reviewToken(0) }), false);
  assert.deepEqual(bytes(storage), pristine);
  await claim(a, state); const before = bytes(storage);
  assert.equal(a.write(0, advance(state)), false);
  assert.equal(a.write(0, standard(51)), false);
  assert.equal(a.replace(0, standard(52), { reviewed: true, token: a.reviewToken(0) }), false);
  assert.equal(a.remove(0, { reviewed: true, token: a.deletionToken(0) }), false);
  assert.deepEqual(bytes(storage), before);
});

test('successful continuation consumes the exact new head once under the actual lock with a detached mutable copy', async () => {
  const { storage, manager, a, b } = setup(), initial = await claim(a), prior = copy(record(storage));
  const input = advance(initial.state, 17), beforeInput = copy(input);
  let calls = 0, consumedContext, newHead, newHeadBytes, mutatedConsumerCopy;
  const result = await a.commitIronman(0, input, {
    intent: 'continue', token: initial.token,
    consume(state, context) {
      calls++;
      assert.deepEqual(manager.active, { name: LOCK_NAME, mode: 'exclusive' });
      newHead = copy(record(storage)); newHeadBytes = storage.values.get(ironmanRecordKey(RUN));
      assert.deepEqual(state, beforeInput); assert.deepEqual(newHead.state, beforeInput);
      assert.notEqual(newHead.revision, prior.revision);
      assert.deepEqual(newHead.attachment, prior.attachment);
      assert.equal(context.token, a.reviewToken(0), 'consumer receives the freshly stored authoritative head token');
      assert.equal(context.slot, 0); assert.equal(context.runId, RUN);
      consumedContext = copy(context);
      state.hero.gold += 10000;
      state.ironman.runId = OTHER_RUN;
      mutatedConsumerCopy = state;
      return 'consumed-exact-new-head';
    },
  });
  assert.equal(result.status, 'committed'); assert.equal(calls, 1);
  assert.equal(result.value, 'consumed-exact-new-head'); assert.equal(result.token, consumedContext.token);
  assert.notEqual(result.token, initial.token); assert.deepEqual(result.state, beforeInput);
  assert.notDeepEqual(mutatedConsumerCopy, beforeInput);
  assert.deepEqual(input, beforeInput, 'mutating the detached consumer state cannot mutate the caller input');
  assert.deepEqual(record(storage), newHead); assert.equal(storage.values.get(ironmanRecordKey(RUN)), newHeadBytes);
  const resumed = await position(b);
  assert.deepEqual(resumed.state, beforeInput); assert.equal(resumed.token, result.token);
  assert.deepEqual(record(storage), newHead); assert.equal(calls, 1);
});

test('a held lock queues a stale command behind a newer head without adopting or storing its result', async () => {
  const { storage, manager, a, b } = setup(), initial = await claim(a), remote = await position(b);
  const originalHead = copy(record(storage));
  const held = manager.hold(); await held.entered;
  const newerState = advance(remote.state, 20), staleState = advance(initial.state, 1);
  let newerHead, newerHeadBytes, newerToken;
  const newer = b.commitIronman(0, newerState, { intent: 'continue', token: remote.token, consume(state, context) {
    newerHead = copy(record(storage)); newerHeadBytes = storage.values.get(ironmanRecordKey(RUN)); newerToken = context.token;
    assert.deepEqual(state, newerState);
  } });
  let consumed = 0;
  const stale = a.commitIronman(0, staleState, { intent: 'continue', token: initial.token, consume() { consumed++; } });
  assert.deepEqual(record(storage).state, initial.state);
  held.release(); await held.done;
  const newerResult = await newer;
  assert.equal(newerResult.status, 'committed'); rejected(await stale);
  assert.equal(newerResult.token, newerToken); assert.notEqual(newerResult.token, initial.token);
  assert.notEqual(newerHead.revision, originalHead.revision);
  assert.deepEqual(newerHead.attachment, originalHead.attachment); assert.equal(newerHead.attachment.slotId, 0);
  assert.equal(consumed, 0); assert.deepEqual(record(storage), newerHead);
  assert.equal(storage.values.get(ironmanRecordKey(RUN)), newerHeadBytes, 'the stale attempt preserves every new-head byte, including revision and active binding');
  assert.deepEqual(newerHead.state, newerState); assert.deepEqual(newerHead.casualties, newerState.ironman.casualties);
  const resumed = await position(a);
  assert.deepEqual(resumed.state, newerState); assert.equal(resumed.token, newerResult.token);
  assert.deepEqual(record(storage), newerHead); assert.equal(storage.values.get(ironmanRecordKey(RUN)), newerHeadBytes);
  assert.equal(manager.maxHeld, 1); assertOnlyIndependentWrites(storage);
});

test('a current-token continuation at the wrong valid slot cannot revoke the still-active original owner', async () => {
  const { storage, a, b } = setup({ populated: false }), initial = await claim(a);
  const current = await position(b), head = copy(record(storage)), before = bytes(storage);
  assert.equal(current.token, initial.token); assert.equal(head.attachment.slotId, 0);
  rejected(await b.commitIronman(1, advance(current.state), { intent: 'continue', token: current.token }));
  assert.deepEqual(bytes(storage), before, 'a wrong-slot request is not an orphan and must not archive or change either slot');
  assert.deepEqual(record(storage), head); assert.deepEqual(record(storage).attachment, head.attachment);
  const resumed = await position(a, RUN, 0);
  assert.deepEqual(resumed.state, initial.state); assert.equal(resumed.token, initial.token);
  assert.deepEqual(bytes(storage), before); assert.equal(marker(storage), null);
});

test('archive and cross-slot reattachment revoke an older owner even while its command waits for a lock', async () => {
  const { storage, manager, a, b } = setup({ populated: false }), initial = await claim(a), prior = await position(b);
  assert.equal((await b.archiveIronman(RUN, { reviewed: true, token: prior.token })).status, 'archived');
  assert.equal(record(storage).attachment, null);
  const attached = await reattach(b, RUN, 1), authoritative = copy(record(storage));
  assert.equal(authoritative.attachment.slotId, 1);
  const held = manager.hold(); await held.entered;
  const stale = a.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token });
  held.release(); await held.done; rejected(await stale);
  assert.deepEqual(record(storage), authoritative);
  const resumed = await position(b, RUN, 1); assert.equal(resumed.token, attached.token);
});

test('archive then recreate the same apparent owner defeats token ABA through fresh revision and nonce', async () => {
  const { storage, a, b } = setup(), initial = await claim(a), first = copy(record(storage));
  const current = await position(b);
  assert.equal((await b.archiveIronman(RUN, { reviewed: true, token: current.token })).status, 'archived');
  const again = await reattach(b), second = copy(record(storage));
  assert.deepEqual(second.state, first.state, 'same visible content does not mean same ownership');
  assert.equal(second.attachment.slotId, first.attachment.slotId);
  assert.notEqual(second.revision, first.revision); assert.notEqual(second.attachment.nonce, first.attachment.nonce);
  assert.notEqual(again.token, initial.token);
  const durable = bytes(storage);
  rejected(await a.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token }));
  rejected(await a.endIronman(0, terminal(initial.state), { token: initial.token }));
  assert.deepEqual(bytes(storage), durable); assert.equal(marker(storage), null);
});

test('duplicate exact slot/base claims never choose a winner through implicit resume, continue, post-check or listing', async () => {
  function duplicateOf(head, state) {
    const other = copy(head);
    other.runId = OTHER_RUN;
    other.state = copy(state);
    other.state.ironman.runId = OTHER_RUN;
    other.revision = 'bbbbbbbb-cccc-4ddd-8eee-000000000001';
    other.attachment.nonce = 'bbbbbbbb-cccc-4ddd-8eee-000000000002';
    valid(other.state, 'controlled second individually valid run claims the identical raw base');
    return other;
  }
  {
    const { storage, a, b } = setup(), initial = await claim(a);
    const firstBytes = storage.values.get(ironmanRecordKey(RUN));
    const second = duplicateOf(record(storage), initial.state);
    storage.values.set(ironmanRecordKey(OTHER_RUN), JSON.stringify(second));
    const before = bytes(storage); let consumed = 0;
    for (const runId of [RUN, OTHER_RUN]) {
      rejected(await a.inspectIronman(runId, { intent: 'resume', slot: 0, consume() { consumed++; } }));
      assert.deepEqual(bytes(storage), before, 'resume does not implicitly archive either claimant');
    }
    rejected(await a.inspectIronman(initial.state, { intent: 'export', slot: 0, consume() { consumed++; } }));
    rejected(await a.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token, consume() { consumed++; } }));
    rejected(await a.inspectIronman(RUN, { intent: 'reattach', slot: 0 }));
    rejected(await a.listRecoverableIronman());
    assert.equal(consumed, 0); assert.deepEqual(bytes(storage), before);
    assert.equal(storage.values.get(ironmanRecordKey(RUN)), firstBytes);
    const known = await b.inspectIronman(second.state, { intent: 'import', slot: 0 });
    assert.equal(known.status, 'known-head'); assert.ok(known.token); assert.deepEqual(bytes(storage), before);
    // Only an explicit reviewed archive deliberately resolves this conflict.
    assert.equal((await b.archiveIronman(OTHER_RUN, { reviewed: true, token: known.token })).status, 'archived');
    assert.equal(record(storage, OTHER_RUN).attachment, null);
    assert.equal(storage.values.get(ironmanRecordKey(RUN)), firstBytes);
    assert.deepEqual((await position(a)).state, initial.state);
  }
  {
    const { storage, a } = setup(), initial = await claim(a), next = advance(initial.state, 19);
    let inserted = false, atCollision, consumed = 0;
    storage.hooks.afterSet = key => {
      if (key !== ironmanRecordKey(RUN) || inserted) return;
      inserted = true;
      // Synchronously interleave an individually valid competing record after
      // this operation's atomic head write but before its adoption/post-check.
      const second = duplicateOf(record(storage), next);
      storage.values.set(ironmanRecordKey(OTHER_RUN), JSON.stringify(second));
      atCollision = bytes(storage);
    };
    const result = await a.commitIronman(0, next, { intent: 'continue', token: initial.token, consume() { consumed++; } });
    storage.hooks.afterSet = null;
    assert.equal(inserted, true); assert.equal(result.status, 'unconfirmed'); assert.equal(consumed, 0);
    assert.deepEqual(bytes(storage), atCollision, 'post-check does not archive either conflicting head or choose the first key');
    rejected(await a.listRecoverableIronman());
    assert.deepEqual(bytes(storage), atCollision);
    assert.deepEqual(record(storage).state, next);
    assert.deepEqual(record(storage, OTHER_RUN).attachment.baseToken, record(storage).attachment.baseToken);
  }
});

test('first Ironman creation cannot lose an unrelated actually-unlocked Standard write', async () => {
  const { storage, a } = setup(), unlocked = createSaveStore(storage, migrateSave);
  const state = ironman(), review = await a.inspectIronman(state, { intent: 'create', slot: 0 });
  assert.equal(review.status, 'review');
  let entered = false, standardBytes;
  storage.hooks.beforeSet = key => {
    if (key !== ironmanRecordKey(RUN) || entered) return;
    entered = true; storage.source = 'unlocked-standard';
    try { assert.equal(unlocked.write(1, standard(61)), true); standardBytes = sharedBytes(storage); }
    finally { storage.source = 'guarded'; }
  };
  const result = await a.commitIronman(0, state, { intent: 'create', token: review.token });
  storage.hooks.beforeSet = null;
  assert.equal(entered, true); assert.equal(result.status, 'committed');
  assert.deepEqual(sharedBytes(storage), standardBytes, 'no stale whole-envelope write follows the independent commit');
  assert.deepEqual(createSaveStore(storage, migrateSave).read(1), standard(61));
  assert.deepEqual(createSaveStore(storage, migrateSave).backup(2), standard(15));
  assertOnlyIndependentWrites(storage);
});

test('an actually-unlocked target write during first commit leaves a recoverable orphan, never a clobbered Standard save', async () => {
  const { storage, a } = setup(), unlocked = createSaveStore(storage, migrateSave), state = ironman();
  const review = await a.inspectIronman(state, { intent: 'create', slot: 0 });
  assert.equal(review.status, 'review');
  let changed = false, standardBytes;
  storage.hooks.beforeSet = key => {
    if (key !== ironmanRecordKey(RUN) || changed) return;
    changed = true; storage.source = 'unlocked-standard';
    try { assert.equal(unlocked.write(0, standard(62)), true); standardBytes = sharedBytes(storage); }
    finally { storage.source = 'guarded'; }
  };
  const result = await a.commitIronman(0, state, { intent: 'create', token: review.token });
  storage.hooks.beforeSet = null;
  assert.equal(changed, true); assert.equal(result.status, 'stored-orphan');
  assert.deepEqual(sharedBytes(storage), standardBytes);
  assert.deepEqual(record(storage).state, state);
  const recovery = await a.listRecoverableIronman();
  assert.equal(recovery.status, 'ready'); assert.ok(recovery.runs.some(run => run.runId === RUN));
  assert.deepEqual(createSaveStore(storage, migrateSave).read(0), standard(62));
  assertOnlyIndependentWrites(storage);
});

test('a changed raw underlying slot or backup orphans the head instead of replacing or reviving that raw target', async () => {
  for (const kind of ['slot', 'backup']) {
    const { storage, a } = setup(), initial = await claim(a);
    mutateRawTarget(storage, raw => {
      if (kind === 'slot') raw.slots[0] = { id: 0, state: standard(70), updatedAt: '2026-10-17T00:00:00.000Z', revision: 'unlocked-new-owner' };
      else raw.backups[0] = { state: standard(71), updatedAt: '2026-10-17T00:00:00.000Z' };
    });
    const shared = sharedBytes(storage), oldState = copy(record(storage).state);
    let consumes = 0;
    rejected(await a.inspectIronman(RUN, { intent: 'resume', slot: 0, consume() { consumes++; } }));
    rejected(await a.inspectIronman(initial.state, { intent: 'export', slot: 0, consume() { consumes++; } }));
    rejected(await a.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token }));
    rejected(await a.endIronman(0, terminal(initial.state), { token: initial.token }));
    assert.equal(consumes, 0); assert.equal(marker(storage), null);
    assert.deepEqual(record(storage).state, oldState); assert.deepEqual(sharedBytes(storage), shared);
    const recovery = await a.listRecoverableIronman();
    assert.equal(recovery.status, 'ready'); assert.ok(recovery.runs.some(run => run.runId === RUN));
    assertOnlyIndependentWrites(storage);
  }
});

test('reattachment review is bound to the empty raw target, including unvalidated raw backup/slot bytes', async () => {
  for (const kind of ['invalid-slot', 'invalid-backup', 'changed-empty-revision']) {
    const { storage, a } = setup(), initial = await claim(a);
    assert.equal((await a.archiveIronman(RUN, { reviewed: true, token: initial.token })).status, 'archived');
    const review = await a.inspectIronman(RUN, { intent: 'reattach', slot: 0 });
    assert.equal(review.status, 'review');
    mutateRawTarget(storage, raw => {
      if (kind === 'invalid-slot') raw.slots[0].state = { nonempty: 'not a valid save' };
      if (kind === 'invalid-backup') raw.backups[0] = { state: { nonempty: 'not a valid save' }, updatedAt: null };
      if (kind === 'changed-empty-revision') raw.slots[0].revision = 'another-empty-owner';
    });
    const before = bytes(storage);
    rejected(await a.reattachIronman(RUN, 0, { reviewed: true, token: review.token }));
    assert.deepEqual(bytes(storage), before);
    if (kind === 'invalid-slot') {
      rejected(await a.inspectIronman(RUN, { intent: 'reattach', slot: 0 }));
      assert.deepEqual(bytes(storage), before, 'migration cannot turn malformed nonempty raw bytes into an empty target');
    }
  }
});

test('a pre-existing unrelated backup at an empty target is preserved through creation, archive, reattachment and death', async () => {
  const { storage, a } = setup();
  mutateRawTarget(storage, raw => { raw.backups[0] = { state: standard(75), updatedAt: '2026-10-15T00:00:00.000Z' }; });
  const shared = sharedBytes(storage), initial = await claim(a);
  const head = record(storage);
  assert.deepEqual(Object.keys(head).sort(), ['attachment', 'casualties', 'revision', 'runId', 'startedDay', 'state', 'updatedAt', 'version']);
  assert.deepEqual(Object.keys(head.attachment).sort(), ['baseToken', 'nonce', 'slotId']);
  assert.equal(head.version, 1); assert.equal(head.runId, RUN); assert.equal(head.startedDay, initial.state.day);
  assert.deepEqual(head.casualties, initial.state.ironman.casualties);
  const raw = JSON.parse(storage.values.get(SLOT_KEY));
  assert.equal(head.attachment.baseToken, JSON.stringify({ slot: raw.slots[0], backup: raw.backups[0] }));
  assert.equal((await a.archiveIronman(RUN, { reviewed: true, token: initial.token })).status, 'archived');
  const attached = await reattach(a);
  assert.equal((await a.endIronman(0, terminal(attached.state), { token: attached.token })).status, 'ended');
  assert.deepEqual(sharedBytes(storage), shared);
  assert.deepEqual(createSaveStore(storage, migrateSave).backup(0), standard(75));
  assertOnlyIndependentWrites(storage);
});

test('a known retained import cannot roll back the authoritative head or its exact casualty floor', async () => {
  const { storage, a, b } = setup(), initial = await claim(a), dead = casualty(advance(initial.state, 80));
  const committed = await a.commitIronman(0, dead, { intent: 'continue', token: initial.token });
  assert.equal(committed.status, 'committed');
  const head = copy(record(storage)), before = bytes(storage);
  let consumes = 0;
  const reviewed = await b.inspectIronman(initial.state, { intent: 'import', slot: 0, consume() { consumes++; } });
  assert.equal(reviewed.status, 'known-head'); assert.equal(consumes, 0);
  assert.equal((await b.commitIronman(0, initial.state, { intent: 'import', token: initial.token })).status, 'known-head');
  rejected(await a.commitIronman(0, initial.state, { intent: 'continue', token: committed.token }));
  rejected(await a.endIronman(0, terminal(initial.state), { token: committed.token }));
  assert.equal(marker(storage), null, 'even the current head token cannot authorize a terminal missing the prior casualty floor');
  assert.deepEqual(record(storage), head); assert.deepEqual(bytes(storage), before);
  assert.deepEqual(head.casualties, dead.ironman.casualties);
  const resumed = await position(b); assert.deepEqual(resumed.state, dead);
});

test('a marker committed first defeats every stale queued continuation, resume and export callback', async () => {
  const { storage, manager, a, b } = setup(), initial = await claim(a), remote = await position(b);
  const shared = sharedBytes(storage), held = manager.hold(); await held.entered;
  const ending = b.endIronman(0, terminal(remote.state), { token: remote.token });
  let consumes = 0;
  const continuing = a.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token, consume() { consumes++; } });
  const resuming = a.inspectIronman(RUN, { intent: 'resume', slot: 0, consume() { consumes++; } });
  const exporting = a.inspectIronman(initial.state, { intent: 'export', slot: 0, consume() { consumes++; } });
  held.release(); await held.done;
  assert.equal((await ending).status, 'ended');
  for (const result of await Promise.all([continuing, resuming, exporting])) rejected(result);
  assert.equal(consumes, 0); assert.ok(marker(storage)); assert.equal(record(storage), null);
  assert.deepEqual(sharedBytes(storage), shared);
  const mutations = storage.audit.filter(event => event.source === 'guarded');
  const marked = mutations.findIndex(event => event.op === 'set' && event.key === ironmanEndedKey(RUN));
  const removed = mutations.findIndex(event => event.op === 'remove' && event.key === ironmanRecordKey(RUN));
  assert.ok(marked >= 0 && removed > marked, 'the confirmed independent marker precedes run-key cleanup');
  assertOnlyIndependentWrites(storage);
});

test('failure before the marker never reports confirmed deletion or removes the durable live head', async () => {
  const { storage, a } = setup(), initial = await claim(a), before = bytes(storage);
  storage.failSet = ironmanEndedKey(RUN);
  const result = await a.endIronman(0, terminal(initial.state), { token: initial.token });
  assert.equal(result.status, 'unconfirmed');
  assert.deepEqual(bytes(storage), before); assert.equal(marker(storage), null);
  assert.equal(storage.audit.some(event => event.op === 'remove' && event.key === ironmanRecordKey(RUN)), false);
  storage.failSet = null;
  assert.equal((await a.endIronman(0, terminal(initial.state), { token: initial.token })).status, 'ended');
  assert.ok(marker(storage)); assert.equal(record(storage), null);
});

test('failure after a confirmed marker is cleanup-pending and cannot permit an old playable copy', async () => {
  const { storage, a, b } = setup(), initial = await claim(a), shared = sharedBytes(storage);
  storage.failRemove = ironmanRecordKey(RUN);
  const result = await a.endIronman(0, terminal(initial.state), { token: initial.token });
  assert.equal(result.status, 'ended-cleanup-pending'); assert.ok(marker(storage)); assert.ok(record(storage));
  const before = bytes(storage); let consumes = 0;
  rejected(await b.inspectIronman(initial.state, { intent: 'export', slot: 0, consume() { consumes++; } }));
  rejected(await b.inspectIronman(initial.state, { intent: 'import', slot: 0 }));
  rejected(await b.commitIronman(0, advance(initial.state), { intent: 'continue', token: initial.token }));
  assert.equal(consumes, 0); assert.deepEqual(bytes(storage), before);
  const recoverable = await b.listRecoverableIronman();
  assert.equal(recoverable.status, 'ready'); assert.equal(recoverable.runs.some(run => run.runId === RUN), false);
  assert.deepEqual(sharedBytes(storage), shared); assertOnlyIndependentWrites(storage);
});

test('an independent head write with uncertain readback is not approved for adoption or replayed over newer progress', async () => {
  const { storage, a, b } = setup(), initial = await claim(a), next = advance(initial.state, 90), shared = sharedBytes(storage);
  let wrote = false, denied = false;
  storage.hooks.afterSet = key => { if (key === ironmanRecordKey(RUN)) wrote = true; };
  storage.hooks.beforeGet = key => {
    if (key === ironmanRecordKey(RUN) && wrote && !denied) { denied = true; throw Error('Controlled confirmation uncertainty'); }
  };
  let consumes = 0;
  const result = await a.commitIronman(0, next, { intent: 'continue', token: initial.token, consume() { consumes++; } });
  storage.hooks.afterSet = null; storage.hooks.beforeGet = null;
  assert.equal(wrote, true); assert.equal(denied, true); assert.equal(result.status, 'unconfirmed');
  assert.equal(consumes, 0); assert.deepEqual(record(storage).state, next); assert.deepEqual(sharedBytes(storage), shared);
  const current = await position(b); assert.deepEqual(current.state, next);
  const newer = advance(current.state, 1);
  assert.equal((await b.commitIronman(0, newer, { intent: 'continue', token: current.token })).status, 'committed');
  const before = bytes(storage);
  rejected(await a.commitIronman(0, next, { intent: 'continue', token: initial.token }));
  assert.deepEqual(bytes(storage), before); assert.deepEqual(record(storage).state, newer);
});

test('uncertain marker confirmation leaves the marker authoritative and cleanup can be retried without a stale ownership token', async () => {
  const { storage, a, b } = setup(), initial = await claim(a), dead = terminal(initial.state), shared = sharedBytes(storage);
  let wrote = false, denied = false;
  storage.hooks.afterSet = key => { if (key === ironmanEndedKey(RUN)) wrote = true; };
  storage.hooks.beforeGet = key => {
    if (key === ironmanEndedKey(RUN) && wrote && !denied) { denied = true; throw Error('Controlled marker confirmation uncertainty'); }
  };
  const result = await a.endIronman(0, dead, { token: initial.token });
  storage.hooks.afterSet = null; storage.hooks.beforeGet = null;
  assert.equal(wrote, true); assert.equal(denied, true); assert.equal(result.status, 'unconfirmed');
  assert.ok(marker(storage)); assert.ok(record(storage), 'no cleanup precedes confirmed marker readback');
  let consumes = 0;
  rejected(await b.inspectIronman(RUN, { intent: 'resume', slot: 0, consume() { consumes++; } }));
  assert.equal(consumes, 0);
  assert.equal((await b.endIronman(0, dead, { token: 'obsolete-token-after-confirmed-marker' })).status, 'ended');
  assert.equal(record(storage), null); assert.ok(marker(storage)); assert.deepEqual(sharedBytes(storage), shared);
});

test('cleanup retry after an unrelated replacement preserves the entire latest envelope, mirror and every backup byte', async () => {
  const { storage, a, load } = setup(), initial = await claim(a), dead = terminal(initial.state);
  storage.failRemove = ironmanRecordKey(RUN);
  assert.equal((await a.endIronman(0, dead, { token: initial.token })).status, 'ended-cleanup-pending');
  storage.failRemove = null;
  // A new ordinary writer is not coordinated. The marker has already ended
  // the virtual owner; cleanup must not touch this unrelated replacement.
  storage.source = 'unlocked-standard';
  const standardStore = load();
  assert.equal(standardStore.write(0, standard(101)), true);
  assert.equal(standardStore.replace(0, standard(102), { reviewed: true, token: standardStore.reviewToken(0) }), true);
  storage.source = 'guarded';
  const shared = sharedBytes(storage), raw = JSON.parse(storage.values.get(SLOT_KEY));
  const backupBytes = JSON.stringify(raw.backups);
  const result = await a.endIronman(0, dead, { token: 'stale-owner-is-not-needed-for-marker-cleanup' });
  assert.equal(result.status, 'ended'); assert.equal(record(storage), null); assert.ok(marker(storage));
  assert.deepEqual(sharedBytes(storage), shared);
  assert.equal(JSON.stringify(JSON.parse(storage.values.get(SLOT_KEY)).backups), backupBytes);
  const restored = load();
  assert.deepEqual(restored.read(0), standard(102)); assert.deepEqual(restored.backup(0), standard(101));
  assert.deepEqual(restored.backup(1), standard(5)); assert.deepEqual(restored.backup(2), standard(15));
  assertOnlyIndependentWrites(storage);
});

test('archived/orphan heads remain recoverable while deleted tiny-floor records and ended runs do not', async () => {
  const { storage, a } = setup({ populated: false }), initial = await claim(a), dead = casualty(initial.state);
  const saved = await a.commitIronman(0, dead, { intent: 'continue', token: initial.token });
  assert.equal(saved.status, 'committed');
  assert.equal((await a.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const retained = record(storage); assert.deepEqual(retained.state, dead); assert.equal(retained.attachment, null);
  const recovery = await a.listRecoverableIronman();
  assert.equal(recovery.status, 'ready'); const row = recovery.runs.find(run => run.runId === RUN); assert.ok(row?.token);
  assert.equal((await a.deleteIronman(RUN, { reviewed: true, token: row.token })).status, 'deleted');
  const floor = record(storage); assert.equal(floor.state, null); assert.equal(floor.attachment, null);
  assert.deepEqual(floor.casualties, dead.ironman.casualties);
  assert.ok(JSON.stringify(floor).length < JSON.stringify(retained).length);
  assert.equal((await a.listRecoverableIronman()).runs.some(run => run.runId === RUN), false);
  rejected(await a.inspectIronman(initial.state, { intent: 'import', slot: 0 }));
  const other = await claim(a, ironman(OTHER_RUN), 1);
  assert.equal((await a.endIronman(1, terminal(other.state), { token: other.token })).status, 'ended');
  assert.equal((await a.listRecoverableIronman()).runs.some(run => run.runId === OTHER_RUN), false);
});

test('new mortality records discovered after review prevent a commit from treating discovery as a cached approval', async () => {
  const { storage, a } = setup(), state = ironman();
  const review = await a.inspectIronman(state, { intent: 'create', slot: 0 });
  assert.equal(review.status, 'review');
  storage.values.set(ironmanEndedKey(OTHER_RUN), '{new unreadable mortality data');
  const before = bytes(storage);
  rejected(await a.commitIronman(0, state, { intent: 'create', token: review.token }));
  assert.deepEqual(bytes(storage), before); assert.equal(record(storage), null);
});

test('raw target change after a head write is confirmed leaves its full state and floor recoverable, not an overwritten envelope', async () => {
  const { storage, a } = setup(), initial = await claim(a), next = casualty(advance(initial.state, 110));
  let changed = false;
  storage.hooks.afterSet = key => {
    if (key !== ironmanRecordKey(RUN) || changed) return;
    changed = true;
    mutateRawTarget(storage, raw => { raw.backups[0] = { state: standard(111), updatedAt: '2026-10-17T11:00:00.000Z' }; });
  };
  const result = await a.commitIronman(0, next, { intent: 'continue', token: initial.token });
  storage.hooks.afterSet = null;
  assert.equal(changed, true); assert.equal(result.status, 'stored-orphan');
  assert.deepEqual(record(storage).state, next); assert.deepEqual(record(storage).casualties, next.ironman.casualties);
  const shared = sharedBytes(storage), recovery = await a.listRecoverableIronman();
  assert.equal(recovery.status, 'ready'); assert.ok(recovery.runs.some(run => run.runId === RUN));
  assert.deepEqual(sharedBytes(storage), shared);
  assertOnlyIndependentWrites(storage);
});

test('an admitted unobserved raw-token ABA does not prove detection and still cannot roll back the independent casualty floor', async () => {
  const { storage, a } = setup(), initial = await claim(a), next = casualty(advance(initial.state, 120));
  const raw = storage.values.get(SLOT_KEY);
  // Deliberately restore exact raw bytes before the guard can observe them.
  // No assertion claims that this uncoordinated Standard ABA is detectable.
  mutateRawTarget(storage, value => { value.slots[0].revision = 'transient-unlocked-owner'; });
  storage.values.set(SLOT_KEY, raw);
  const result = await a.commitIronman(0, next, { intent: 'continue', token: initial.token });
  assert.equal(result.status, 'committed');
  const head = copy(record(storage)), before = bytes(storage);
  rejected(await a.commitIronman(0, initial.state, { intent: 'continue', token: result.token }));
  assert.deepEqual(record(storage), head); assert.deepEqual(bytes(storage), before);
  assert.deepEqual(head.casualties, next.ironman.casualties);
});
