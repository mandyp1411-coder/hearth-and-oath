import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { createIronmanMetadata, currentIronmanPerson, ironmanHeroDeath } from '../dist/js/ironman.js';
import { createIronmanSession } from '../dist/js/ironman-session.js';
import { createSaveCoordinator, createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { ironmanRecordKey, ironmanEndedKey, ironmanRecordToken, isIronmanStorageKey } from '../dist/js/ironman-storage.js';
import { freshStory } from './helpers/story-life-fixtures.mjs';

// Phase-4A SOURCE ONLY: this suite is authored, not executed. Its execution
// requires the parent's separate checkpoint and finite gate authorization.
// These are DOM-free session/store acceptance cases, not app/creator/browser
// coverage, exhaustive concurrent schedules, earned-party/balance evidence,
// or release acceptance. Cache one published adult fixture. Controlled living
// party and saved-battle stats/order are labeled; actual engine commands must
// produce companion death and hero-terminal results before session acceptance.
const SLOT_KEY = 'hearth-and-oath:slots:v1';
const LOCK_NAME = 'hearth-and-oath:save:v1';
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const copy = value => structuredClone(value);
const actor = (state, id) => state.battle.actors.find(person => person.id === id);
const person = (state, id = 'mira') => state.companions.find(value => value.id === id);
const bytes = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
const sharedBytes = storage => [storage.values.get(SLOT_KEY) ?? null, storage.values.get(LEGACY_SAVE_KEY) ?? null];
const record = (storage, runId = RUN) => JSON.parse(storage.values.get(ironmanRecordKey(runId)) || 'null');
const marker = (storage, runId = RUN) => JSON.parse(storage.values.get(ironmanEndedKey(runId)) || 'null');
let cachedStandard, entropy = 0;
const callbackErrors = [];
function checkedCallback(callback) {
  return (...args) => {
    try { return callback(...args); }
    catch (error) { callbackErrors.push(error); throw error; }
  };
}
afterEach(() => {
  // Production intentionally catches UI callbacks. Surface their test-oracle
  // failures outside those catches, without retaining any harness registry.
  const errors = callbackErrors.splice(0);
  if (errors.length) throw errors[0];
});

function valid(state, label = 'controlled session fixture') {
  assert.equal(E.validateSave(state), true, label + ': ' + state?.notice);
  return state;
}
function accepted(state, label = 'controlled session position') {
  valid(state, label);
  const before = copy(state), migrated = E.migrateSave(JSON.parse(JSON.stringify(state)));
  assert.ok(migrated, label + ' migrates using the actual engine');
  assert.deepEqual(migrated, state, label + ' preserves its exact position');
  assert.deepEqual(state, before, 'migration does not alter the source');
  return state;
}
function standard() {
  cachedStandard ||= accepted(freshStory(), 'cached published adult Standard fixture');
  return copy(cachedStandard);
}
function opening(runId = RUN) {
  const state = standard();
  // Controlled living party, not a claim of earned recruitment or balance.
  for (const companion of state.companions) {
    companion.active = companion.recruited = companion.id === 'mira';
    if (companion.id === 'mira') {
      assert.equal(currentIronmanPerson(state, 'mira').alive, true);
      companion.hp = companion.maxHp;
      state.rpg.companionStages.mira.status = 'available';
    }
  }
  valid(state, 'controlled Standard party before explicit opt-in');
  state.ironman = createIronmanMetadata(state, { randomUUID: () => runId });
  return accepted(state, 'metadata-only explicit Ironman opening');
}
function progressed(source) {
  const next = copy(source);
  // A controlled legal saved-resource increment isolates authority revisions.
  next.hero.gold += 1;
  return accepted(next, 'controlled resource-only next position');
}
function captured(source) {
  const state = copy(source);
  assert.equal(state.battle, null);
  state.battle = createBattle(state, 'forest', null, { openingTurns: false });
  state.battle.instanceId = 'session-controlled-forest-' + state.day;
  state.battle.currentActorId = 'hero';
  state.battle.turnOrder = ['hero', ...state.battle.actors.filter(a => a.id !== 'hero').map(a => a.id)];
  for (const enemy of state.battle.actors.filter(a => a.side === 'enemy')) {
    enemy.hp = enemy.maxHp = 10000;
    enemy.armor = 100;
  }
  return accepted(state, 'controlled native battle capture/stats/order');
}
function companionDeath(source) {
  const state = captured(source), mira = actor(state, 'mira');
  assert.ok(mira, 'controlled living party has a real captured Mira');
  mira.hp = 1; mira.status = { poison: 2, poisonTurns: 1 };
  state.battle.turnOrder = ['hero', 'mira', ...state.battle.actors.filter(a => !['hero', 'mira'].includes(a.id)).map(a => a.id)];
  // Controlled one-HP poison/turn-order setup; the public command below,
  // not a fabricated ledger or terminal outcome, actually applies the death.
  state.life.happiness = 70; state.life.stress = 20;
  accepted(state, 'controlled poison boundary before actual engine command');
  const before = copy(state), next = E.chooseBattleAction(state, 'attack', 'enemy-1');
  assert.deepEqual(state, before, 'the engine command is detached');
  assert.equal(person(next).alive, false); assert.equal(person(next).hp, 0);
  assert.equal(next.ironman.casualties.length, 1);
  assert.equal(next.ironman.casualties[0].personId, currentIronmanPerson(next, 'mira').id);
  assert.equal(ironmanHeroDeath(next), null);
  return accepted(next, 'actual engine-accepted companion death');
}
function terminal(source) {
  // Preserve an already captured battle and every existing casualty. No
  // recapture drops its dead actor, instance or captured mortality policy.
  const state = source.battle ? copy(source) : captured(source);
  const hero = actor(state, 'hero'), enemy = actor(state, 'enemy-1');
  hero.hp = 1; hero.status = {};
  for (const ally of state.battle.actors.filter(a => a.side === 'party' && a.id !== 'hero' && a.hp > 0)) ally.hp = ally.maxHp;
  for (const key of ['planId', 'planCycle', 'bossId', 'phasePlan']) delete enemy[key];
  Object.assign(enemy, { aiKey: 'striker', aiStep: 0, status: {}, attackPower: 9999 });
  state.battle.currentActorId = 'hero';
  state.battle.turnOrder = ['hero', 'enemy-1', ...state.battle.actors.filter(a => a.hp > 0 && !['hero', 'enemy-1'].includes(a.id)).map(a => a.id)];
  accepted(state, 'controlled one-HP enemy-hit boundary');
  const before = copy(state), next = E.chooseBattleAction(state, 'attack', 'enemy-1');
  assert.deepEqual(state, before, 'actual fatal engine command is detached');
  assert.ok(ironmanHeroDeath(next), 'the actual enemy turn kills the hero');
  return accepted(next, 'actual accepted internal terminal descriptor');
}
function effects(state) {
  const id = currentIronmanPerson(state, 'mira').id;
  return copy({ companion: person(state), exactPerson: currentIronmanPerson(state, 'mira'),
    stage: state.rpg.companionStages.mira, casualties: state.ironman.casualties,
    grief: state.lineage.grief.filter(row => row.personId === id),
    deaths: state.journal.filter(row => row.personId === id && row.eventId === 'person_died'),
    happiness: state.life.happiness, stress: state.life.stress });
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function lockManager() {
  let pending = Promise.resolve(), depth = 0;
  const manager = {
    requests: [], afterCallback: null, get depth() { return depth; },
    request(name, options, callback) {
      assert.equal(name, LOCK_NAME); assert.equal(options.mode, 'exclusive');
      manager.requests.push({ name, mode: options.mode });
      const result = pending.then(async () => {
        assert.equal(depth, 0, 'the controlled lock grants one actual owner');
        depth++;
        try {
          const value = await callback({ name, mode: 'exclusive' });
          manager.afterCallback?.();
          return value;
        }
        finally { depth--; }
      });
      pending = result.catch(() => {});
      return result;
    },
    hold() {
      const entered = deferred(), released = deferred();
      const done = manager.request(LOCK_NAME, { mode: 'exclusive' }, async () => {
        entered.resolve(); await released.promise;
      });
      return { entered: entered.promise, release: () => released.resolve(), done };
    },
  };
  return manager;
}
function envelope() {
  return JSON.stringify({ version: 1, activeSlot: 2,
    slots: [0, 1, 2].map(id => ({ id, state: id === 2 ? standard() : null,
      updatedAt: id === 2 ? '2026-10-18T00:00:00.000Z' : null, revision: 'session-raw-' + id })),
    backups: { 1: { state: standard(), updatedAt: 'retain-ordinary-backup-exactly' } },
  });
}
function memoryStorage() {
  const values = new Map([[SLOT_KEY, envelope()], [LEGACY_SAVE_KEY, JSON.stringify(standard())], ['unrelated', 'untouched']]);
  return {
    values, operations: [], failGet: new Set(), failSet: new Set(), failRemove: new Set(), afterSet: null, readOverride: null,
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (this.failGet.has(key)) throw Error('Controlled read unavailable: ' + key);
      const value = values.get(key) ?? null;
      return this.readOverride ? this.readOverride(key, value) : value;
    },
    setItem(key, value) {
      this.operations.push({ kind: 'set', key });
      if (this.failSet.has(key)) throw Object.assign(Error('Controlled quota'), { name: 'QuotaExceededError' });
      values.set(key, String(value)); this.afterSet?.(key, String(value));
    },
    removeItem(key) {
      this.operations.push({ kind: 'remove', key });
      if (this.failRemove.has(key)) throw Error('Controlled removal failure');
      values.delete(key);
    },
    clearLog() { this.operations.length = 0; },
  };
}
const STATUS_KEYS = ['phase', 'epoch', 'busy', 'unresolved', 'kind', 'operationId', 'runId', 'slot', 'reason', 'cleanupPending'];
function metadata(status) {
  assert.deepEqual(Object.keys(status).sort(), [...STATUS_KEYS].sort(), 'session snapshots expose metadata only');
  assert.ok(['dormant', 'ready', 'pending', 'blocked', 'ended'].includes(status.phase));
  assert.equal(typeof status.busy, 'boolean'); assert.equal(typeof status.unresolved, 'boolean');
  assert.equal(typeof status.cleanupPending, 'boolean'); assert.ok(Number.isSafeInteger(status.epoch));
  for (const key of ['state', 'candidate', 'source', 'token', 'payload', 'terminal', 'head', 'value']) assert.equal(Object.hasOwn(status, key), false);
  return status;
}
function harness({ locking = true } = {}) {
  const storage = memoryStorage(), locks = lockManager(), coordinate = createSaveCoordinator(locks);
  const crypto = { randomUUID: () => '8899aabb-ccdd-4eef-8a11-' + (++entropy).toString(16).padStart(12, '0') };
  const store = createSaveStore(storage, E.migrateSave, { coordinate: locking ? coordinate : createSaveCoordinator(null), crypto });
  const h = { storage, locks, store, coordinate, crypto, context: { state: null, slot: null }, adoptions: [], endings: [], detachments: [], statuses: [], afterOnAdopt: null, failContextRead: false };
  h.session = createIronmanSession({ store,
    readContext() {
      if (h.failContextRead) throw Error('Controlled shell context unavailable');
      return { state: h.context.state, slot: h.context.slot };
    },
    onAdopt: checkedCallback((state, context) => {
      assert.equal(locks.depth, 1, 'playable adoption runs inside the actual entered exclusive lock');
      assert.equal(context.runId, state.ironman.runId); assert.ok(context.token);
      assert.ok(Number.isSafeInteger(context.epoch)); assert.ok(context.operationId != null);
      assert.equal(typeof context.kind, 'string');
      h.context = { state, slot: context.slot };
      h.adoptions.push({ context: { kind: context.kind, operationId: context.operationId } });
      h.afterOnAdopt?.();
    }),
    onEnd: checkedCallback(outcome => {
      assert.equal(typeof outcome.runId, 'string');
      assert.equal(typeof outcome.cleanupPending, 'boolean');
      assert.ok(Object.keys(outcome).every(key => ['runId', 'marker', 'cleanupPending'].includes(key)), 'end callback never receives a full save');
      if (h.context.state?.ironman?.runId === outcome.runId) h.context = { state: null, slot: null };
      h.endings.push(copy(outcome));
    }),
    onDetach: checkedCallback(outcome => {
      assert.deepEqual(Object.keys(outcome).sort(), ['deleted', 'runId']);
      assert.equal(typeof outcome.runId, 'string'); assert.equal(typeof outcome.deleted, 'boolean');
      if (h.context.state?.ironman?.runId === outcome.runId) h.context = { state: null, slot: null };
      h.detachments.push(copy(outcome));
    }),
    onStatus: checkedCallback(status => h.statuses.push(copy(metadata(status)))),
  });
  return h;
}
async function admit(h, state = opening(), slot = 0, intent = 'create') {
  const review = await h.store.inspectIronman(state, { intent, slot }); assert.equal(review.status, 'review');
  const result = await h.store.commitIronman(slot, state, { intent, token: review.token });
  assert.equal(result.status, 'committed'); return result;
}
async function ready(h, state = opening(), slot = 0, intent = 'create') {
  const saved = await admit(h, state, slot, intent);
  assert.equal(h.session.resume(state.ironman.runId, slot), false, 'resume reserves but never grants synchronous success');
  assert.equal(metadata(h.session.status()).phase, 'pending');
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.deepEqual(h.context, { state, slot });
  return saved;
}
function blocked(h, { unresolved = true } = {}) {
  const status = metadata(h.session.status());
  assert.equal(status.phase, 'blocked'); assert.equal(status.busy, false); assert.equal(status.unresolved, unresolved);
  assert.equal(typeof status.reason, 'string'); assert.ok(status.reason.length > 0);
  return status;
}
function onlyIndependentMutations(h) {
  assert.ok(h.storage.operations.every(op => isIronmanStorageKey(op.key)), 'session Ironman never mutates Standard or unrelated storage');
  assert.equal(h.storage.values.get('unrelated'), 'untouched');
}
function orphanNextRecordWrite(h) {
  h.storage.afterSet = key => {
    if (key !== ironmanRecordKey(RUN)) return;
    h.storage.afterSet = null;
    // A controlled actually-unlocked older writer changes the raw empty-base
    // token after the head write. It cannot overwrite the independent head.
    const raw = JSON.parse(h.storage.values.get(SLOT_KEY));
    raw.slots[0].revision = 'controlled-unlocked-empty-base-change';
    h.storage.values.set(SLOT_KEY, JSON.stringify(raw));
  };
}

test('session status snapshots are detached metadata and constructor does not acquire authority or mutate storage', () => {
  const h = harness(), before = bytes(h.storage), requests = h.locks.requests.length;
  const status = metadata(h.session.status()); assert.equal(status.phase, 'dormant');
  assert.equal(status.busy, false); assert.equal(status.unresolved, false);
  status.phase = 'ready'; status.epoch = -1; status.runId = OTHER_RUN;
  assert.equal(metadata(h.session.status()).phase, 'dormant');
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.locks.requests.length, requests);
});

test('resume reserves immediately, adopts only inside the held lock, and explicitly installs the virtual slot', async () => {
  const h = harness(), state = opening(); await admit(h, state, 1);
  assert.equal(h.store.active(), 2, 'ordinary active-slot state is intentionally different');
  const hold = h.locks.hold(); await hold.entered;
  assert.equal(h.session.resume(RUN, 1), false);
  const pending = metadata(h.session.status()); assert.equal(pending.phase, 'pending'); assert.equal(pending.busy, true);
  assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0);
  hold.release(); await hold.done;
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.equal(h.context.slot, 1); assert.deepEqual(h.context.state, state);
  assert.equal(h.adoptions.length, 1); assert.equal(h.store.active(), 2);
  assert.deepEqual(h.storage.operations.map(op => op.key), [ironmanRecordKey(RUN)]);
});

test('accept reserves a detached candidate before lock entry and cannot adopt or run effects early', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const next = progressed(source), original = copy(next), shared = sharedBytes(h.storage), hold = h.locks.hold();
  await hold.entered; let effectsRun = 0; const effectObservations = [];
  assert.equal(h.session.accept(next, { afterAdopt(state, context) {
    effectsRun++;
    effectObservations.push({ depth: h.locks.depth, state: copy(state), context: copy(context), requests: h.locks.requests.length });
  } }), false);
  assert.equal(h.session.status().phase, 'pending'); assert.equal(h.session.status().unresolved, true);
  assert.deepEqual(h.context.state, source); assert.equal(effectsRun, 0);
  next.hero.gold += 999; // Caller mutation after reservation cannot change it.
  hold.release(); await hold.done;
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.deepEqual(h.context.state, original); assert.deepEqual(record(h.storage).state, original);
  assert.equal(effectObservations.length, 1); assert.equal(effectObservations[0].depth, 1);
  assert.deepEqual(effectObservations[0].state, original); assert.equal(effectObservations[0].context.slot, 0);
  assert.equal(effectsRun, 1); assert.deepEqual(sharedBytes(h.storage), shared); onlyIndependentMutations(h);
});

test('duplicate and newer gameplay controls cannot replace an already reserved candidate', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const first = progressed(source), second = progressed(first), hold = h.locks.hold(); await hold.entered;
  let firstEffects = 0, rejectedEffects = 0;
  assert.equal(h.session.accept(first, { afterAdopt() { firstEffects++; } }), false);
  const operationId = h.session.status().operationId;
  assert.equal(h.session.accept(second, { afterAdopt() { rejectedEffects++; } }), false);
  assert.equal(h.session.resume(RUN, 0), false); assert.equal(h.session.releaseStandard(), false);
  assert.equal(h.session.status().operationId, operationId);
  hold.release(); await hold.done; await h.session.settled();
  assert.deepEqual(h.context.state, first); assert.deepEqual(record(h.storage).state, first);
  assert.equal(firstEffects, 1); assert.equal(rejectedEffects, 0); assert.equal(h.adoptions.length, 2);
});

test('real companion casualty effects and the exact floor are adopted once after durable confirmation', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source), before = copy(dead), deathEffects = effects(dead);
  assert.equal(deathEffects.grief.length, 1); assert.equal(deathEffects.deaths.length, 1);
  let after = 0; assert.equal(h.session.accept(dead, { afterAdopt() { after++; } }), false);
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.deepEqual(dead, before); assert.deepEqual(effects(h.context.state), deathEffects);
  assert.deepEqual(record(h.storage).casualties, dead.ironman.casualties);
  await h.session.refresh(); await h.session.retry();
  assert.equal(after, 1); assert.equal(h.adoptions.length, 2); assert.deepEqual(effects(h.context.state), deathEffects);
  assert.equal(h.store.hasUnsaved(), false); onlyIndependentMutations(h);
});

test('record quota failure freezes a real casualty and unchanged-source refresh cannot resurrect or discard it', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source), before = bytes(h.storage); let after = 0;
  h.storage.failSet.add(ironmanRecordKey(RUN));
  assert.equal(h.session.accept(dead, { afterAdopt() { after++; } }), false); await h.session.settled();
  const failed = blocked(h); assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source);
  const operationId = failed.operationId;
  // Model matching record-key and storage-clear notifications with unchanged
  // underlying source bytes. The app adapter owns actual event routing.
  for (const reason of ['storage-record-change', 'storage-clear']) {
    const epoch = h.session.status().epoch; h.session.invalidate(reason);
    assert.ok(h.session.status().epoch > epoch); assert.equal(h.session.status().operationId, operationId);
    await h.session.refresh(); blocked(h);
    assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source);
    assert.equal(h.session.resume(RUN, 0), false); assert.equal(h.session.releaseStandard(), false);
  }
  assert.equal(after, 0); assert.equal(h.adoptions.length, 1); assert.equal(h.store.hasUnsaved(), false);
  h.storage.failSet.clear(); await h.session.retry();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
  assert.deepEqual(effects(h.context.state), effects(dead)); assert.equal(after, 0, 'invalidated UI effects never run after reconciliation');
  onlyIndependentMutations(h);
});

test('unconfirmed successful casualty write reconciles the exact candidate once without engine replay or another write', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source), expected = effects(dead); let after = 0;
  h.storage.clearLog(); h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  h.session.accept(dead, { afterAdopt() { after++; } }); await h.session.settled(); blocked(h);
  assert.deepEqual(record(h.storage).state, dead, 'the physical write did execute, but was not confirmed');
  assert.deepEqual(h.context.state, source); assert.equal(after, 0);
  h.storage.afterSet = null; h.storage.failGet.clear();
  assert.equal((await h.session.refresh()).phase, 'ready');
  assert.deepEqual(h.context.state, dead); assert.deepEqual(effects(h.context.state), expected);
  assert.equal(after, 1); assert.equal(h.storage.operations.filter(op => op.kind === 'set').length, 1);
  await h.session.refresh(); await h.session.retry(); assert.equal(after, 1); assert.equal(h.adoptions.length, 2);
  onlyIndependentMutations(h);
});

test('a mismatched readback that still shows the old source cannot clear a physically stored casualty obligation', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source), oldBytes = h.storage.values.get(ironmanRecordKey(RUN));
  h.storage.clearLog(); h.storage.afterSet = key => {
    if (key === ironmanRecordKey(RUN)) h.storage.readOverride = (readKey, actual) => readKey === key ? oldBytes : actual;
  };
  let after = 0; h.session.accept(dead, { afterAdopt() { after++; } }); await h.session.settled();
  const operationId = blocked(h).operationId;
  assert.deepEqual(record(h.storage).state, dead, 'actual bytes differ from the controlled stale confirmation read');
  h.session.invalidate('storage-record-change'); await h.session.refresh(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source);
  assert.equal(h.storage.operations.length, 1); assert.equal(after, 0);
  h.storage.afterSet = null; h.storage.readOverride = null; await h.session.refresh();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
  assert.deepEqual(effects(h.context.state), effects(dead)); assert.equal(h.storage.operations.length, 1); assert.equal(after, 0);
});

test('invalidation during a held casualty commit suppresses late adoption but retains the candidate for fresh reconciliation', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source), hold = h.locks.hold(); await hold.entered; let after = 0;
  h.session.accept(dead, { afterAdopt() { after++; } }); const id = h.session.status().operationId;
  h.session.invalidate('storage-clear'); assert.equal(h.session.status().operationId, id);
  hold.release(); await hold.done; await h.session.settled(); blocked(h);
  assert.deepEqual(h.context.state, source); assert.equal(after, 0);
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready');
  assert.deepEqual(h.context.state, dead); assert.equal(after, 0); assert.equal(h.adoptions.length, 2);
});

test('a changed external context prevents late adoption and prevents retry from reinstalling the prior run', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const next = progressed(source), hold = h.locks.hold(); await hold.entered; let after = 0;
  h.session.accept(next, { afterAdopt() { after++; } });
  const replacement = standard(); h.context = { state: replacement, slot: 2 };
  hold.release(); await hold.done; await h.session.settled(); blocked(h);
  assert.equal(h.context.state, replacement); assert.equal(after, 0); assert.equal(h.adoptions.length, 1);
  await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.equal(h.context.state, replacement); assert.equal(h.context.slot, 2); assert.equal(after, 0);
});

test('source bytes changed in place during a held commit cannot be overwritten by a late candidate adoption', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const next = progressed(source), hold = h.locks.hold(); await hold.entered; let after = 0;
  h.session.accept(next, { afterAdopt() { after++; } });
  // Controlled out-of-band mutation models a missed shell write. Reference
  // equality alone cannot establish the exact originally reserved position.
  h.context.state.hero.gold += 50; const changed = copy(h.context.state);
  hold.release(); await hold.done; await h.session.settled(); blocked(h);
  assert.deepEqual(h.context.state, changed); assert.equal(after, 0); assert.equal(h.adoptions.length, 1);
  await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.deepEqual(h.context.state, changed); assert.equal(after, 0); assert.equal(h.adoptions.length, 1);
});

test('a newer authoritative head blocks the old candidate without relabeling its token or adopting the newer head', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  const external = progressed(progressed(source)), candidate = progressed(source);
  const changed = await h.store.commitIronman(0, external, { intent: 'continue', token: saved.token }); assert.equal(changed.status, 'committed');
  const durable = h.storage.values.get(ironmanRecordKey(RUN)); h.storage.clearLog();
  h.session.accept(candidate); await h.session.settled(); blocked(h);
  const operationId = h.session.status().operationId;
  await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source);
  assert.equal(h.storage.values.get(ironmanRecordKey(RUN)), durable); assert.deepEqual(h.storage.operations, []);
});

test('missing live authority freezes the binding instead of recreating a run from an in-memory source', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  // Controlled external deletion models a storage event, not session deletion.
  h.storage.values.delete(ironmanRecordKey(RUN)); const before = bytes(h.storage); h.storage.clearLog();
  h.session.invalidate('storage-clear'); await h.session.refresh(); blocked(h, { unresolved: false });
  assert.equal(h.session.accept(progressed(source)), false); await h.session.settled();
  assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.storage.operations, []);
  assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1);
});

test('missing authority cannot cancel an unresolved companion death or make the previous living source ready', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const dead = companionDeath(source); h.storage.failSet.add(ironmanRecordKey(RUN));
  h.session.accept(dead); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); h.storage.values.delete(ironmanRecordKey(RUN));
  h.session.invalidate('storage-clear'); await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.deepEqual(h.context.state, source); assert.equal(record(h.storage), null);
  assert.equal(h.session.releaseStandard(), false); assert.equal(h.adoptions.length, 1);
});

test('a simulated actual storage clear never recreates a run or cancels an unresolved companion casualty', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(companionDeath(source)); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); h.storage.values.clear(); h.storage.clearLog();
  h.session.invalidate('storage-clear'); await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.deepEqual(bytes(h.storage), []); assert.deepEqual(h.storage.operations, []);
  assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1); assert.equal(h.session.releaseStandard(), false);
});

test('hero death writes a tiny marker first, ends without adopting the terminal, and leaves unrelated bytes exact', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const fatal = terminal(source), before = copy(fatal), shared = sharedBytes(h.storage); let after = 0;
  h.storage.clearLog(); assert.equal(h.session.accept(fatal, { afterAdopt() { after++; } }), false);
  assert.equal(h.session.status().phase, 'pending');
  assert.equal((await h.session.settled()).phase, 'ended');
  assert.deepEqual(fatal, before); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 1); assert.equal(after, 0);
  assert.equal(h.endings.length, 1); assert.equal(h.endings[0].runId, RUN); assert.equal(h.endings[0].cleanupPending, false);
  assert.deepEqual(Object.keys(marker(h.storage)).sort(), ['version', 'runId', 'personId', 'day', 'battleId'].sort());
  assert.equal(record(h.storage), null); assert.equal(h.session.status().unresolved, false);
  assert.deepEqual(h.storage.operations.map(op => [op.kind, op.key]), [['set', ironmanEndedKey(RUN)], ['remove', ironmanRecordKey(RUN)]]);
  assert.deepEqual(sharedBytes(h.storage), shared); onlyIndependentMutations(h);
});

test('terminal priority preserves already applied companion casualties through marker-first end without duplicate effects', async () => {
  const h = harness(), source = companionDeath(opening()); await ready(h, source, 0, 'import');
  const fatal = terminal(source), deathEffects = effects(source);
  assert.deepEqual(effects(fatal), deathEffects); assert.equal(actor(fatal, 'mira').hp, 0);
  h.session.accept(fatal); await h.session.settled();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 1);
  assert.equal(record(h.storage), null); assert.ok(marker(h.storage)); assert.deepEqual(effects(source), deathEffects);
});

test('failed marker persistence retains a fatal obligation across unchanged-head and clear notifications', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const fatal = terminal(source), before = bytes(h.storage); let after = 0;
  h.storage.failSet.add(ironmanEndedKey(RUN)); h.session.accept(fatal, { afterAdopt() { after++; } }); await h.session.settled();
  const operationId = blocked(h).operationId;
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.endings.length, 0); assert.equal(after, 0);
  for (const reason of ['storage-record-change', 'storage-ended-marker-change', 'storage-clear']) {
    h.session.invalidate(reason); await h.session.refresh(); blocked(h);
    assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.resume(RUN, 0), false);
    assert.equal(h.session.accept(progressed(source)), false); assert.equal(h.session.releaseStandard(), false);
    assert.deepEqual(h.context.state, source);
  }
  h.storage.failSet.clear(); await h.session.retry();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.context.state, null); assert.equal(h.endings.length, 1); assert.equal(after, 0);
});

test('an unconfirmed marker is not an ended outcome until a fresh actual-store retry verifies it', async () => {
  const h = harness(), source = opening(); await ready(h, source); const fatal = terminal(source);
  h.storage.clearLog(); h.storage.afterSet = key => { if (key === ironmanEndedKey(RUN)) h.storage.failGet.add(key); };
  h.session.accept(fatal); await h.session.settled(); blocked(h);
  assert.ok(marker(h.storage)); assert.ok(record(h.storage)); assert.equal(h.endings.length, 0);
  assert.equal(h.storage.operations.some(op => op.kind === 'remove'), false); assert.deepEqual(h.context.state, source);
  h.storage.afterSet = null; h.storage.failGet.clear(); await h.session.retry();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.context.state, null); assert.equal(h.endings.length, 1);
  assert.equal(record(h.storage), null); onlyIndependentMutations(h);
});

test('a missing marker-free head cannot falsely complete a pending fatal obligation', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const fatal = terminal(source); h.storage.failSet.add(ironmanEndedKey(RUN));
  h.session.accept(fatal); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); h.storage.values.delete(ironmanRecordKey(RUN)); h.storage.clearLog();
  h.session.invalidate('storage-clear'); await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.equal(marker(h.storage), null); assert.equal(h.endings.length, 0); assert.deepEqual(h.storage.operations, []);
  assert.deepEqual(h.context.state, source); assert.equal(h.session.releaseStandard(), false);
});

test('confirmed terminal cleanup failure drops playable authority and retries only the exact marker-owned run', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const neighbor = opening(OTHER_RUN); await admit(h, neighbor, 1);
  const neighborBytes = h.storage.values.get(ironmanRecordKey(OTHER_RUN)), shared = sharedBytes(h.storage);
  h.storage.failRemove.add(ironmanRecordKey(RUN)); h.session.accept(terminal(source)); await h.session.settled();
  const ended = metadata(h.session.status()); assert.equal(ended.phase, 'ended'); assert.equal(ended.cleanupPending, true);
  assert.equal(h.context.state, null); assert.equal(ended.unresolved, false); assert.equal(h.endings.length, 1);
  assert.equal(h.adoptions.length, 1); assert.ok(marker(h.storage)); assert.ok(record(h.storage));
  h.storage.failRemove.clear(); h.storage.clearLog(); await h.session.retry();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.session.status().cleanupPending, false);
  assert.equal(record(h.storage), null); assert.equal(h.storage.values.get(ironmanRecordKey(OTHER_RUN)), neighborBytes);
  assert.deepEqual(sharedBytes(h.storage), shared);
  assert.ok(h.storage.operations.every(op => op.kind === 'remove' && op.key === ironmanRecordKey(RUN)));
});

test('cleanup-only retry with a missing marker cannot resurrect authority or report a successful run end', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  h.storage.failRemove.add(ironmanRecordKey(RUN)); h.session.accept(terminal(source)); await h.session.settled();
  assert.equal(h.session.status().cleanupPending, true); assert.equal(h.context.state, null);
  h.storage.failRemove.clear(); h.storage.values.delete(ironmanEndedKey(RUN));
  const before = bytes(h.storage); h.storage.clearLog(); await h.session.retry();
  assert.equal(h.context.state, null); assert.equal(h.session.status().cleanupPending, true);
  assert.notEqual(h.session.status().phase, 'ready'); assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.storage.operations, []);
});

test('late fatal completion after invalidation may not adopt a terminal or run stale UI effects', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const fatal = terminal(source), hold = h.locks.hold(); await hold.entered; let after = 0;
  h.session.accept(fatal, { afterAdopt() { after++; } }); const operationId = h.session.status().operationId;
  h.session.invalidate('storage-clear'); assert.equal(h.session.status().operationId, operationId);
  hold.release(); await hold.done; await h.session.settled();
  assert.equal(h.adoptions.length, 1); assert.equal(after, 0); assert.ok(marker(h.storage));
  await h.session.refresh();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.context.state, null); assert.equal(h.endings.length, 1);
});

test('an idle matching marker notification stops a ready run after fresh verification and never exports it', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  const result = await h.store.endIronman(0, terminal(source), { token: saved.token }); assert.equal(result.status, 'ended');
  h.session.invalidate('storage-ended-marker-change'); assert.equal(h.session.status().phase, 'blocked');
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ended');
  let consumed = 0; await h.session.protect(() => ++consumed);
  assert.equal(consumed, 0); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 1);
});

test('first-save quota uncertainty retains the fixed opening and exact original review without a Standard fallback', async () => {
  const h = harness(), state = opening(), other = opening(OTHER_RUN);
  const review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 }); assert.equal(review.status, 'review');
  const before = bytes(h.storage); h.storage.failSet.add(ironmanRecordKey(RUN)); let after = 0;
  assert.equal(h.session.create(0, state, { token: review.token, afterAdopt() { after++; } }), false);
  await h.session.settled(); const operationId = blocked(h).operationId;
  assert.equal(h.context.state, null); assert.deepEqual(bytes(h.storage), before); assert.equal(h.store.hasUnsaved(), false);
  assert.equal(h.session.create(0, other, { token: review.token }), false);
  assert.equal(h.session.import(0, other, { token: review.token }), false); assert.equal(h.session.resume(OTHER_RUN, 0), false);
  h.session.invalidate('storage-clear'); await h.session.refresh(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().runId, RUN);
  h.storage.failSet.clear(); await h.session.retry();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, state); assert.equal(h.context.slot, 0);
  assert.equal(record(h.storage).runId, RUN); assert.equal(record(h.storage, OTHER_RUN), null); assert.equal(after, 0);
  onlyIndependentMutations(h);
});

test('first-save successful but unconfirmed write is adopted exactly once from fresh authority without creating a second run', async () => {
  const h = harness(), state = opening();
  const review = await h.store.inspectIronman(null, { intent: 'create', slot: 1 }); assert.equal(review.status, 'review');
  h.storage.clearLog(); h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  let after = 0; h.session.create(1, state, { token: review.token, afterAdopt() { after++; } }); await h.session.settled(); blocked(h);
  const savedBytes = h.storage.values.get(ironmanRecordKey(RUN)); assert.ok(savedBytes); assert.equal(h.context.state, null);
  h.storage.afterSet = null; h.storage.failGet.clear(); await h.session.refresh();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, state); assert.equal(h.context.slot, 1);
  assert.equal(h.storage.values.get(ironmanRecordKey(RUN)), savedBytes); assert.equal(h.storage.operations.length, 1);
  assert.equal(h.adoptions.length, 1); assert.equal(after, 1); onlyIndependentMutations(h);
});

test('an occupied first-save target cannot be overwritten by retry or a refreshed/relabelled empty-slot review', async () => {
  const h = harness(), state = opening(), review = await h.store.inspectIronman(state, { intent: 'create', slot: 0 });
  assert.equal(review.status, 'review'); h.storage.failSet.add(ironmanRecordKey(RUN));
  h.session.create(0, state, { token: review.token }); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); const raw = JSON.parse(h.storage.values.get(SLOT_KEY));
  raw.slots[0] = { id: 0, state: standard(), updatedAt: 'new-ordinary-owner', revision: 'new-ordinary-owner' };
  h.storage.values.set(SLOT_KEY, JSON.stringify(raw)); const before = bytes(h.storage); h.storage.clearLog();
  h.session.invalidate('storage-slot-change'); await h.session.refresh(); await h.session.retry(); blocked(h);
  assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.storage.operations, []); assert.equal(h.context.state, null);
  assert.equal(record(h.storage), null); assert.equal(h.adoptions.length, 0); assert.equal(h.session.releaseStandard(), false);
});

test('reviewed unknown import adopts actual companion-death authority, never a revived or normalized copy', async () => {
  const h = harness(), dead = companionDeath(opening());
  const review = await h.store.inspectIronman(dead, { intent: 'import', slot: 1 }); assert.equal(review.status, 'review');
  let after = 0; assert.equal(h.session.import(1, dead, { token: review.token, afterAdopt() { after++; } }), false);
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.deepEqual(h.context.state, dead); assert.deepEqual(effects(h.context.state), effects(dead)); assert.equal(h.context.slot, 1);
  assert.equal(after, 1); assert.deepEqual(record(h.storage).casualties, dead.ironman.casualties); onlyIndependentMutations(h);
});

test('known-run import cannot overwrite a later authoritative casualty with an older living JSON', async () => {
  const h = harness(), old = opening(), dead = companionDeath(old); await admit(h, dead, 0, 'import');
  const before = bytes(h.storage), review = await h.store.inspectIronman(old, { intent: 'import', slot: 1 });
  assert.equal(review.status, 'known-head'); let after = 0;
  h.session.import(1, old, { token: review.token, afterAdopt() { after++; } }); await h.session.settled();
  assert.notDeepEqual(h.context.state, old); assert.equal(after, 0); assert.deepEqual(bytes(h.storage), before);
  assert.deepEqual(record(h.storage).state, dead); assert.equal(h.adoptions.length, 0);
});

test('idle invalidation may restore only the same unchanged binding, without duplicating adoption effects', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const before = bytes(h.storage), count = h.adoptions.length, epoch = h.session.status().epoch;
  h.session.invalidate('storage-record-change'); assert.equal(h.session.status().phase, 'blocked');
  assert.ok(h.session.status().epoch > epoch); await h.session.refresh();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, source);
  assert.equal(h.adoptions.length, count); assert.deepEqual(bytes(h.storage), before);
});

test('idle refresh never silently adopts a different durable head after an external update', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), next = progressed(source);
  assert.equal((await h.store.commitIronman(0, next, { intent: 'continue', token: saved.token })).status, 'committed');
  const before = bytes(h.storage); h.session.invalidate('storage-record-change'); await h.session.refresh(); blocked(h, { unresolved: false });
  assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1); assert.deepEqual(bytes(h.storage), before);
});

test('protect refuses a blocked or pending mortality obligation without exposing its old living source', async () => {
  const h = harness(), source = opening(); await ready(h, source); let consumed = 0;
  const hold = h.locks.hold(); await hold.entered;
  h.session.accept(companionDeath(source)); const pendingRead = h.session.protect(() => ++consumed);
  hold.release(); await hold.done; await pendingRead; await h.session.settled();
  assert.equal(consumed, 0, 'a protected operation requested while pending cannot become a late old-source export');
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(progressed(h.context.state)); await h.session.settled(); blocked(h);
  await h.session.protect(() => ++consumed); assert.equal(consumed, 0);
});

test('protect refuses a newer head instead of handing it to a stale current view', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  assert.equal((await h.store.commitIronman(0, progressed(source), { intent: 'continue', token: saved.token })).status, 'committed');
  let consumed = 0; await h.session.protect(() => ++consumed);
  assert.equal(consumed, 0); assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1);
  assert.notEqual(h.session.status().phase, 'ready');
});

test('protect exposes only a freshly locked detached current position and returns the consumer value without store authority', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const before = bytes(h.storage), adoptions = h.adoptions.length; let calls = 0;
  const result = await h.session.protect((state, context) => {
    calls++; assert.equal(h.locks.depth, 1); assert.deepEqual(state, source);
    assert.equal(context.runId, RUN); assert.equal(context.slot, 0); assert.ok(context.token);
    assert.ok(Number.isSafeInteger(context.epoch)); assert.ok(context.operationId != null);
    state.hero.gold += 5000; // An export/practice consumer cannot mutate authority.
    return { proof: 'current-locked-position', runId: context.runId };
  });
  assert.deepEqual(result, { status: 'ready', value: { proof: 'current-locked-position', runId: RUN } });
  assert.equal(calls, 1); assert.equal(h.session.status().phase, 'ready');
  assert.deepEqual(h.context.state, source); assert.deepEqual(record(h.storage).state, source);
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.adoptions.length, adoptions);
});

test('invalidation after a successful locked protect callback stays blocked after its promise settles until fresh refresh', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const before = bytes(h.storage), adoptions = h.adoptions.length;
  let calls = 0, hookCalls = 0, promiseSettled = false;
  // Faithful finite boundary: the actual exclusive callback has completed,
  // but its lock-request Promise has not yet delivered the result upstream.
  h.locks.afterCallback = () => {
    hookCalls++; h.locks.afterCallback = null;
    assert.equal(h.locks.depth, 1); assert.equal(calls, 1); assert.equal(promiseSettled, false);
    assert.equal(h.session.status().phase, 'ready', 'protected readiness was settled inside the locked consumer');
    h.session.invalidate('storage-after-protected-consumer');
    assert.equal(h.session.status().phase, 'blocked'); assert.equal(h.session.canMutate(), false);
  };
  const result = await h.session.protect((state, context) => {
    calls++; assert.equal(h.locks.depth, 1); assert.deepEqual(state, source); assert.equal(context.runId, RUN);
    return 'completed-locked-export';
  }).then(value => { promiseSettled = true; return value; });
  assert.deepEqual(result, { status: 'ready', value: 'completed-locked-export' }, 'completed result does not grant current session authority');
  assert.equal(hookCalls, 1); assert.equal(calls, 1); assert.equal(promiseSettled, true);
  blocked(h, { unresolved: false }); assert.equal(h.session.canMutate(), false);
  assert.equal((await h.session.settled()).phase, 'blocked');
  assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, adoptions);
  assert.equal((await h.session.refresh()).phase, 'ready'); assert.equal(h.session.canMutate(), true);
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.adoptions.length, adoptions);
});

test('an asynchronous protected consumer is refused rather than outliving the exclusive read', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const before = bytes(h.storage); let calls = 0;
  const result = await h.session.protect(() => { calls++; return Promise.resolve('not-a-synchronous-export'); });
  assert.equal(calls, 1); assert.equal(result.status, 'blocked');
  assert.equal(Object.hasOwn(result, 'state'), false); assert.equal(Object.hasOwn(result, 'token'), false);
  assert.notEqual(h.session.status().phase, 'ready'); assert.deepEqual(bytes(h.storage), before);
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready'); assert.equal(h.adoptions.length, 1);
});

test('invalidation while protect awaits the lock prevents its stale consumer and cannot manufacture a ready view', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const hold = h.locks.hold(); await hold.entered; let calls = 0;
  const protectedRead = h.session.protect(() => ++calls); h.session.invalidate('storage-record-change');
  hold.release(); await hold.done;
  assert.equal((await protectedRead).status, 'blocked'); assert.equal(calls, 0); blocked(h, { unresolved: false });
  assert.deepEqual(h.context.state, source); await h.session.refresh(); assert.equal(h.session.status().phase, 'ready');
});

test('invalidation cancels a queued load presentation without creating a gameplay obligation or a late adoption', async () => {
  const h = harness(), source = opening(); await admit(h, source);
  const before = bytes(h.storage), hold = h.locks.hold(); await hold.entered; let after = 0;
  h.session.resume(RUN, 0, { afterAdopt() { after++; } }); h.session.invalidate('storage-clear');
  hold.release(); await hold.done; await h.session.settled(); blocked(h, { unresolved: false });
  assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0); assert.equal(after, 0);
  assert.deepEqual(bytes(h.storage), before);
  h.session.resume(RUN, 0); await h.session.settled(); assert.equal(h.session.status().phase, 'ready');
  assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1); assert.equal(after, 0);
});

test('absent exclusive coordination blocks Ironman admission and never invokes an unsaved Standard fallback', async () => {
  const h = harness({ locking: false }), state = opening(), before = bytes(h.storage);
  assert.equal(h.session.create(0, state, { token: 'untrusted-empty-review' }), false);
  await h.session.settled(); blocked(h, { unresolved: false });
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0);
  assert.equal(h.store.hasUnsaved(), false); assert.equal(h.locks.requests.length, 0);
  const ordinary = progressed(standard()); assert.equal(h.store.write(2, ordinary), true);
  assert.deepEqual(h.store.read(2), ordinary, 'ordinary Standard remains durable without Web Locks');
});

test('Standard lives remain outside the session and retain ordinary save semantics without independent Ironman writes', async () => {
  const h = harness(), source = standard(); h.context = { state: source, slot: 2 };
  const next = progressed(source), before = bytes(h.storage), requests = h.locks.requests.length;
  assert.equal(h.session.accept(next), false); await h.session.settled();
  assert.equal(h.session.status().phase, 'dormant'); assert.equal(h.session.status().unresolved, false);
  assert.equal(h.context.state, source); assert.equal(h.adoptions.length, 0); assert.equal(h.endings.length, 0);
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.locks.requests.length, requests);
  assert.equal(h.session.releaseStandard(), true); assert.deepEqual(bytes(h.storage), before);
  assert.equal(h.store.write(2, next), true, 'actual ordinary Standard store path remains available');
  assert.deepEqual(h.store.read(2), next); assert.equal(h.store.hasUnsaved(), false);
  assert.ok(h.storage.operations.every(op => !isIronmanStorageKey(op.key)));
});

test('invalid or Standard inputs cannot be downgraded into guarded Ironman admission', async () => {
  const h = harness(), malformed = opening(); malformed.ironman.version = 99;
  const before = bytes(h.storage);
  for (const state of [standard(), malformed, null]) {
    assert.equal(h.session.create(0, state, { token: 'not-an-authority' }), false); await h.session.settled();
    assert.equal(h.session.import(0, state, { token: 'not-an-authority' }), false); await h.session.settled();
  }
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0);
});

test('reviewed session archive retains the exact casualty head/floor and detaches only matching playable copies', async () => {
  const h = harness(), dead = companionDeath(opening()), saved = await ready(h, dead, 0, 'import');
  const shared = sharedBytes(h.storage), deathEffects = effects(dead); h.storage.clearLog();
  assert.equal(h.session.archive(RUN, { reviewed: true, token: saved.token }), false);
  assert.equal(h.session.status().phase, 'pending'); await h.session.settled();
  assert.deepEqual(h.detachments, [{ runId: RUN, deleted: false }]); assert.equal(h.context.state, null);
  assert.equal(h.session.canMutate(), false); assert.equal(h.session.status().unresolved, false);
  assert.deepEqual(record(h.storage).state, dead); assert.deepEqual(record(h.storage).casualties, dead.ironman.casualties);
  assert.equal(record(h.storage).attachment, null); assert.equal(marker(h.storage), null);
  assert.deepEqual(effects(dead), deathEffects); assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 0);
  const recovery = await h.store.listRecoverableIronman(); assert.equal(recovery.status, 'ready'); assert.equal(recovery.runs[0].runId, RUN);
  assert.deepEqual(sharedBytes(h.storage), shared); onlyIndependentMutations(h);
});

test('reviewed session delete leaves only the actual store floor tombstone and never fabricates a combat end', async () => {
  const h = harness(), dead = companionDeath(opening()), saved = await ready(h, dead, 0, 'import');
  const shared = sharedBytes(h.storage); h.storage.clearLog();
  assert.equal(h.session.delete(RUN, { reviewed: true, token: saved.token }), false); await h.session.settled();
  assert.deepEqual(h.detachments, [{ runId: RUN, deleted: true }]); assert.equal(h.context.state, null);
  assert.equal(record(h.storage).state, null); assert.equal(record(h.storage).attachment, null);
  assert.deepEqual(record(h.storage).casualties, dead.ironman.casualties); assert.equal(marker(h.storage), null);
  assert.equal(h.endings.length, 0); assert.equal(h.session.status().unresolved, false); assert.equal(h.session.canMutate(), false);
  assert.deepEqual((await h.store.listRecoverableIronman()).runs, []); assert.deepEqual(sharedBytes(h.storage), shared);
  onlyIndependentMutations(h);
});

test('lifecycle reservation while the actual lock is held cannot be replaced by a double archive/delete request', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), hold = h.locks.hold(); await hold.entered;
  const before = h.storage.values.get(ironmanRecordKey(RUN));
  assert.equal(h.session.archive(RUN, { reviewed: true, token: saved.token }), false);
  const operationId = h.session.status().operationId;
  assert.equal(h.session.delete(RUN, { reviewed: true, token: saved.token }), false);
  assert.equal(h.session.archive(RUN, { reviewed: true, token: saved.token }), false);
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source);
  assert.equal(h.storage.values.get(ironmanRecordKey(RUN)), before); assert.equal(h.detachments.length, 0);
  hold.release(); await hold.done; await h.session.settled();
  assert.deepEqual(record(h.storage).state, source); assert.equal(record(h.storage).attachment, null);
  assert.deepEqual(h.detachments, [{ runId: RUN, deleted: false }]); assert.equal(h.context.state, null);
});

test('archive/delete require their actual explicit review and never accept an omitted reviewed flag', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), before = bytes(h.storage);
  for (const kind of ['archive', 'delete']) {
    assert.equal(h.session[kind](RUN, { token: saved.token }), false); await h.session.settled();
    assert.equal(h.session[kind](RUN, { reviewed: false, token: saved.token }), false); await h.session.settled();
  }
  assert.deepEqual(bytes(h.storage), before); assert.equal(h.detachments.length, 0); assert.deepEqual(h.context.state, source);
  assert.equal(h.session.canMutate(), true);
});

test('a quota-blocked lifecycle action retries only its original actual head token and confirms detach once', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), before = bytes(h.storage);
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.delete(RUN, { reviewed: true, token: saved.token });
  await h.session.settled(); const operationId = blocked(h).operationId;
  assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source); assert.equal(h.detachments.length, 0);
  h.session.invalidate('storage-record-change'); await h.session.refresh();
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.detachments.length, 0);
  h.storage.failSet.clear(); await h.session.retry();
  assert.equal(record(h.storage).state, null); assert.deepEqual(h.detachments, [{ runId: RUN, deleted: true }]);
  assert.equal(h.context.state, null); assert.equal(h.session.status().unresolved, false); onlyIndependentMutations(h);
});

test('an uncertain successful archive stays blocked on its old token until a fresh same-run reviewed lifecycle request supersedes it', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  h.session.archive(RUN, { reviewed: true, token: saved.token }); await h.session.settled();
  const operationId = blocked(h).operationId; assert.equal(record(h.storage).attachment, null);
  assert.equal(h.detachments.length, 0); assert.deepEqual(h.context.state, source);
  h.storage.afterSet = null; h.storage.failGet.clear(); h.storage.clearLog(); await h.session.retry(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.storage.operations, []);
  const recovered = await h.store.listRecoverableIronman(); assert.equal(recovered.status, 'ready');
  const fresh = recovered.runs.find(row => row.runId === RUN); assert.ok(fresh); assert.notEqual(fresh.token, saved.token);
  assert.equal(h.session.archive(RUN, { reviewed: true, token: fresh.token }), false);
  assert.notEqual(h.session.status().operationId, operationId); await h.session.settled();
  assert.deepEqual(h.detachments, [{ runId: RUN, deleted: false }]); assert.equal(h.context.state, null);
  assert.equal(h.session.status().unresolved, false); assert.deepEqual(record(h.storage).state, source);
});

test('an unrelated reviewed archive preserves the current binding but keeps it blocked until a fresh unchanged idle refresh', async () => {
  const h = harness(), source = opening(); await ready(h, source);
  const other = opening(OTHER_RUN), saved = await admit(h, other, 1), current = h.context.state;
  const sourceBytes = h.storage.values.get(ironmanRecordKey(RUN));
  h.session.archive(OTHER_RUN, { reviewed: true, token: saved.token }); await h.session.settled();
  assert.deepEqual(h.detachments, [{ runId: OTHER_RUN, deleted: false }]); assert.equal(h.context.state, current); assert.equal(h.context.slot, 0);
  assert.equal(h.session.status().phase, 'blocked'); assert.equal(h.session.canMutate(), false); assert.equal(h.session.status().unresolved, false);
  assert.equal(h.storage.values.get(ironmanRecordKey(RUN)), sourceBytes); assert.equal(record(h.storage, OTHER_RUN).attachment, null);
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready'); assert.equal(h.session.canMutate(), true);
  assert.equal(h.context.state, current); assert.equal(h.adoptions.length, 1);
});

test('reviewed reattachment requires a second actual locked inspection before adopting its authoritative slot and once-only effects', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  h.session.archive(RUN, { reviewed: true, token: saved.token }); await h.session.settled(); assert.equal(h.context.state, null);
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const requests = h.locks.requests.length, shared = sharedBytes(h.storage); let after = 0; const effectObservations = [];
  assert.equal(h.session.reattach(RUN, 1, { reviewed: true, token: review.token, afterAdopt(state, context) {
    after++;
    effectObservations.push({ depth: h.locks.depth, state: copy(state), context: copy(context), requests: h.locks.requests.length });
  } }), false);
  assert.equal(h.context.state, null); assert.equal(h.session.status().phase, 'pending');
  assert.equal((await h.session.settled()).phase, 'ready'); assert.equal(h.context.slot, 1); assert.deepEqual(h.context.state, source);
  assert.equal(record(h.storage).attachment.slotId, 1); assert.equal(after, 1); assert.equal(h.adoptions.length, 2);
  assert.equal(effectObservations.length, 1); assert.equal(effectObservations[0].depth, 1);
  assert.deepEqual(effectObservations[0].state, source); assert.equal(effectObservations[0].context.kind, 'reattach');
  assert.ok(effectObservations[0].requests >= requests + 2, 'adoption is not the returned reattach commit state');
  await h.session.refresh(); await h.session.retry(); assert.equal(after, 1); assert.equal(h.adoptions.length, 2);
  assert.deepEqual(sharedBytes(h.storage), shared); onlyIndependentMutations(h);
});

test('a competing actual-store head queued after reattach commit cannot be adopted by its fresh expected-token inspection', async () => {
  const h = harness(), source = opening(), saved = await admit(h, source);
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const external = progressed(source); let competing = null, after = 0;
  h.locks.afterCallback = () => {
    h.locks.afterCallback = null;
    const committed = record(h.storage); assert.equal(committed.attachment.slotId, 1);
    // This real store command is queued before the session can request its
    // separate adoption inspection; it changes the authoritative head token.
    competing = h.store.commitIronman(1, external, { intent: 'continue', token: ironmanRecordToken(committed) });
  };
  h.session.reattach(RUN, 1, { reviewed: true, token: review.token, afterAdopt() { after++; } });
  await h.session.settled(); assert.ok(competing); assert.equal((await competing).status, 'committed'); blocked(h);
  assert.deepEqual(record(h.storage).state, external); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0); assert.equal(after, 0);
  await h.session.retry(); blocked(h); assert.equal(h.adoptions.length, 0); assert.equal(after, 0);
});

test('unconfirmed reattachment cannot relabel its old review and requires a fresh reviewed same-run lifecycle resolution', async () => {
  const h = harness(), source = opening(), saved = await admit(h, source);
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  h.session.reattach(RUN, 1, { reviewed: true, token: review.token }); await h.session.settled(); const oldOperation = blocked(h).operationId;
  assert.equal(record(h.storage).attachment.slotId, 1); assert.equal(h.adoptions.length, 0);
  h.storage.afterSet = null; h.storage.failGet.clear(); h.storage.clearLog(); await h.session.retry(); blocked(h);
  assert.equal(h.session.status().operationId, oldOperation); assert.deepEqual(h.storage.operations, []);
  const authority = await h.store.inspectIronman(RUN, { intent: 'resume', slot: 1, consume: (_, context) => context.token });
  assert.equal(authority.status, 'ready');
  h.session.archive(RUN, { reviewed: true, token: authority.value }); await h.session.settled();
  assert.equal(h.session.status().unresolved, false); assert.equal(record(h.storage).attachment, null);
  const fresh = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 0 }); assert.equal(fresh.status, 'review');
  h.session.reattach(RUN, 0, { reviewed: true, token: fresh.token }); await h.session.settled();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, source); assert.equal(h.context.slot, 0); assert.equal(h.adoptions.length, 1);
});

test('actual ended-marker authority outranks reviewed archive/delete requests and invokes only run-end cleanup', async () => {
  for (const kind of ['archive', 'delete']) {
    const h = harness(), source = opening(), saved = await ready(h, source);
    assert.equal((await h.store.endIronman(0, terminal(source), { token: saved.token })).status, 'ended');
    const before = bytes(h.storage);
    h.session[kind](RUN, { reviewed: true, token: saved.token }); await h.session.settled();
    assert.equal(h.session.status().phase, 'ended'); assert.equal(h.context.state, null); assert.equal(h.endings.length, 1);
    assert.equal(h.detachments.length, 0); assert.equal(h.adoptions.length, 1); assert.deepEqual(bytes(h.storage), before);
  }
});

test('a marker confirmed after reattachment review prevents that reviewed operation from adopting a playable run', async () => {
  const h = harness(), source = opening(), saved = await admit(h, source);
  assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const attached = await h.store.reattachIronman(RUN, 1, { reviewed: true, token: review.token }); assert.equal(attached.status, 'committed');
  assert.equal((await h.store.endIronman(1, terminal(source), { token: attached.token })).status, 'ended');
  let after = 0; h.session.reattach(RUN, 1, { reviewed: true, token: review.token, afterAdopt() { after++; } }); await h.session.settled();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0); assert.equal(after, 0);
  assert.equal(h.endings.length, 1); assert.equal(h.detachments.length, 0); assert.equal(record(h.storage), null);
});

test('fresh reviewed lifecycle controls cannot supersede an unresolved real companion casualty', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), dead = companionDeath(source);
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(dead); await h.session.settled();
  const operationId = blocked(h).operationId, before = bytes(h.storage);
  h.session.archive(RUN, { reviewed: true, token: saved.token }); h.session.delete(RUN, { reviewed: true, token: saved.token });
  h.session.reattach(RUN, 1, { reviewed: true, token: saved.token }); await h.session.settled();
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(bytes(h.storage), before); assert.equal(h.detachments.length, 0);
  h.storage.failSet.clear(); await h.session.retry(); assert.equal(h.session.status().phase, 'ready');
  assert.deepEqual(h.context.state, dead); assert.deepEqual(record(h.storage).state, dead); assert.equal(record(h.storage).attachment.slotId, 0);
});

test('fresh reviewed lifecycle controls cannot supersede an unresolved terminal marker obligation', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  h.storage.failSet.add(ironmanEndedKey(RUN)); h.session.accept(terminal(source)); await h.session.settled();
  const operationId = blocked(h).operationId;
  h.session.archive(RUN, { reviewed: true, token: saved.token }); h.session.delete(RUN, { reviewed: true, token: saved.token });
  h.session.reattach(RUN, 1, { reviewed: true, token: saved.token }); await h.session.settled();
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.detachments.length, 0); assert.deepEqual(h.context.state, source);
  h.storage.failSet.clear(); await h.session.retry(); assert.equal(h.session.status().phase, 'ended');
  assert.equal(h.context.state, null); assert.equal(h.endings.length, 1); assert.equal(h.detachments.length, 0);
});

test('reviewed lifecycle controls cannot replace uncertain first-save create/import candidates', async () => {
  for (const kind of ['create', 'import']) {
    const h = harness(), state = kind === 'import' ? companionDeath(opening()) : opening();
    const review = await h.store.inspectIronman(state, { intent: kind, slot: 0 }); assert.equal(review.status, 'review');
    h.storage.failSet.add(ironmanRecordKey(RUN)); h.session[kind](0, state, { token: review.token }); await h.session.settled();
    const operationId = blocked(h).operationId;
    h.session.archive(RUN, { reviewed: true, token: review.token }); h.session.delete(RUN, { reviewed: true, token: review.token });
    h.session.reattach(RUN, 1, { reviewed: true, token: review.token }); await h.session.settled();
    assert.equal(h.session.status().operationId, operationId); assert.equal(h.detachments.length, 0); assert.equal(record(h.storage), null);
    h.storage.failSet.clear(); await h.session.retry(); assert.equal(h.session.status().phase, 'ready');
    assert.deepEqual(h.context.state, state); assert.deepEqual(record(h.storage).state, state); assert.equal(h.context.slot, 0);
  }
});

test('explicit reviewed changed-body and changed-token authority resolves stale actual companion and hero obligations without replaying their candidates', async () => {
  for (const kind of ['companion', 'hero']) {
    const h = harness(), source = opening(), saved = await ready(h, source);
    const candidate = kind === 'hero' ? terminal(source) : companionDeath(source);
    const failKey = kind === 'hero' ? ironmanEndedKey(RUN) : ironmanRecordKey(RUN); let after = 0;
    h.storage.failSet.add(failKey); h.session.accept(candidate, { afterAdopt() { after++; } }); await h.session.settled(); blocked(h);
    h.storage.failSet.clear(); const external = progressed(source);
    const changed = await h.store.commitIronman(0, external, { intent: 'continue', token: saved.token }); assert.equal(changed.status, 'committed');
    assert.notEqual(changed.token, saved.token); assert.notDeepEqual(external, source);
    const review = await h.store.inspectIronman(RUN, { intent: 'resume', slot: 0, consume: (_, context) => context.token }); assert.equal(review.status, 'ready');
    h.storage.clearLog(); assert.equal(h.session.chooseAuthority(RUN, 0, { reviewed: true, token: review.value }), false);
    assert.equal(h.session.status().phase, 'pending'); assert.equal((await h.session.settled()).phase, 'ready');
    assert.deepEqual(h.context.state, external); assert.deepEqual(record(h.storage).state, external);
    assert.equal(h.adoptions.length, 2); assert.equal(h.adoptions[1].context.kind, 'reviewed-authority');
    assert.equal(after, 0, 'explicit authority choice drops effects from the rejected old candidate');
    assert.equal(h.session.status().unresolved, false); assert.equal(h.endings.length, 0); assert.equal(marker(h.storage), null);
    assert.deepEqual(h.storage.operations, [], 'choosing authority is a locked read, not a replay or rewritten old candidate');
    await h.session.refresh(); await h.session.retry(); assert.equal(h.adoptions.length, 2); assert.equal(after, 0);
  }
});

test('a new revision of the identical original source cannot escape actual companion or hero mortality obligations', async () => {
  for (const kind of ['companion', 'hero']) {
    const h = harness(), source = opening(), saved = await ready(h, source);
    const candidate = kind === 'hero' ? terminal(source) : companionDeath(source);
    h.storage.failSet.add(kind === 'hero' ? ironmanEndedKey(RUN) : ironmanRecordKey(RUN));
    h.session.accept(candidate); await h.session.settled(); const operationId = blocked(h).operationId; h.storage.failSet.clear();
    const resaved = await h.store.commitIronman(0, source, { intent: 'continue', token: saved.token }); assert.equal(resaved.status, 'committed');
    assert.notEqual(resaved.token, saved.token); assert.deepEqual(record(h.storage).state, source);
    const review = await h.store.inspectIronman(RUN, { intent: 'resume', slot: 0, consume: (_, context) => context.token }); assert.equal(review.status, 'ready');
    h.storage.clearLog(); h.session.chooseAuthority(RUN, 0, { reviewed: true, token: review.value }); await h.session.settled(); blocked(h);
    assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1);
    assert.equal(h.endings.length, 0); assert.equal(h.session.releaseStandard(), false); assert.deepEqual(h.storage.operations, []);
  }
});

test('reviewing the unchanged original token cannot discard a still-uncommitted actual casualty', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  h.storage.failSet.add(ironmanRecordKey(RUN)); const dead = companionDeath(source); h.session.accept(dead); await h.session.settled();
  const operationId = blocked(h).operationId; h.storage.failSet.clear();
  h.session.chooseAuthority(RUN, 0, { reviewed: true, token: saved.token }); await h.session.settled(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1);
  await h.session.retry(); assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
});

test('explicit authority choice can adopt its exact already stored nonterminal candidate once without repeating casualty effects', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), dead = companionDeath(source); let after = 0;
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(dead, { afterAdopt() { after++; } }); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); const written = await h.store.commitIronman(0, dead, { intent: 'continue', token: saved.token }); assert.equal(written.status, 'committed');
  h.storage.clearLog(); h.session.chooseAuthority(RUN, 0, { reviewed: true, token: written.token }); await h.session.settled();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead); assert.deepEqual(effects(h.context.state), effects(dead));
  assert.equal(after, 0); assert.equal(h.adoptions.length, 2); assert.deepEqual(h.storage.operations, []);
  h.session.chooseAuthority(RUN, 0, { reviewed: true, token: written.token }); await h.session.settled();
  assert.equal(h.adoptions.length, 2); assert.equal(after, 0);
});

test('authority choice refuses wrong-run and unreviewed controls without touching the pending casualty', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), neighbor = await admit(h, opening(OTHER_RUN), 1);
  const dead = companionDeath(source); h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(dead); await h.session.settled();
  const operationId = blocked(h).operationId, requests = h.locks.requests.length, before = bytes(h.storage);
  assert.equal(h.session.chooseAuthority(OTHER_RUN, 1, { reviewed: true, token: neighbor.token }), false);
  assert.equal(h.session.chooseAuthority(RUN, 0, { token: saved.token }), false);
  assert.equal(h.session.chooseAuthority(RUN, 0, { reviewed: false, token: saved.token }), false);
  assert.equal(h.locks.requests.length, requests); assert.equal(h.session.status().operationId, operationId);
  assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1);
  h.storage.failSet.clear(); await h.session.retry(); assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
});

test('actual ended-marker authority outranks a reviewed authority-choice token and never returns a playable head', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), fatal = terminal(source);
  h.storage.failSet.add(ironmanEndedKey(RUN)); h.session.accept(fatal); await h.session.settled(); blocked(h);
  h.storage.failSet.clear(); assert.equal((await h.store.endIronman(0, fatal, { token: saved.token })).status, 'ended');
  h.session.chooseAuthority(RUN, 0, { reviewed: true, token: saved.token }); await h.session.settled();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.session.status().unresolved, false); assert.equal(h.context.state, null);
  assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 1); assert.equal(record(h.storage), null); assert.ok(marker(h.storage));
});

test('missing or unreadable authority cannot let a reviewed choice discard an unresolved hero death', async () => {
  for (const failure of ['missing', 'unreadable']) {
    const h = harness(), source = opening(), saved = await ready(h, source);
    h.storage.failSet.add(ironmanEndedKey(RUN)); h.session.accept(terminal(source)); await h.session.settled();
    const operationId = blocked(h).operationId; h.storage.failSet.clear();
    if (failure === 'missing') h.storage.values.delete(ironmanRecordKey(RUN));
    else h.storage.failGet.add(ironmanRecordKey(RUN));
    const before = bytes(h.storage); h.storage.clearLog();
    h.session.chooseAuthority(RUN, 0, { reviewed: true, token: saved.token }); await h.session.settled(); blocked(h);
    assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.releaseStandard(), false);
    assert.deepEqual(h.context.state, source); assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 0);
    assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.storage.operations, []);
  }
});

test('onAdopt invalidation resolves the durable casualty binding but cannot be overwritten into ready by adoption completion', async () => {
  const h = harness(), source = opening(); await ready(h, source); const dead = companionDeath(source); let after = 0;
  h.afterOnAdopt = () => { h.afterOnAdopt = null; h.session.invalidate('invalidated-inside-onAdopt'); };
  h.session.accept(dead, { afterAdopt() { after++; } }); await h.session.settled(); blocked(h, { unresolved: false });
  assert.equal(h.session.canMutate(), false); assert.deepEqual(h.context.state, dead); assert.deepEqual(record(h.storage).state, dead);
  assert.equal(h.adoptions.length, 2); assert.equal(after, 0, 'onAdopt invalidation cancels the now-stale later UI effect');
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready'); assert.equal(h.session.canMutate(), true);
  assert.equal(h.adoptions.length, 2); assert.equal(after, 0); assert.deepEqual(effects(h.context.state), effects(dead));
});

test('afterAdopt invalidation runs that effect once but leaves the accepted casualty blocked until fresh idle verification', async () => {
  const h = harness(), source = opening(); await ready(h, source); const dead = companionDeath(source); let after = 0;
  h.session.accept(dead, { afterAdopt() { after++; h.session.invalidate('invalidated-inside-afterAdopt'); } });
  await h.session.settled(); blocked(h, { unresolved: false }); assert.equal(h.session.canMutate(), false);
  assert.deepEqual(h.context.state, dead); assert.deepEqual(record(h.storage).state, dead); assert.equal(h.adoptions.length, 2); assert.equal(after, 1);
  await h.session.refresh(); await h.session.retry(); assert.equal(h.session.status().phase, 'ready'); assert.equal(h.session.canMutate(), true);
  assert.equal(h.adoptions.length, 2); assert.equal(after, 1); assert.deepEqual(effects(h.context.state), effects(dead));
});

test('malformed reattach targets and failed context reads preserve each uncertain lifecycle obligation unchanged', async () => {
  for (const kind of ['archive', 'delete', 'reattach']) {
    const h = harness(), source = opening(), saved = await ready(h, source); let token = saved.token;
    if (kind === 'reattach') {
      assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token })).status, 'archived');
      const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review'); token = review.token;
    }
    h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
    if (kind === 'reattach') h.session.reattach(RUN, 1, { reviewed: true, token });
    else h.session[kind](RUN, { reviewed: true, token });
    await h.session.settled(); const original = blocked(h);
    h.storage.afterSet = null; h.storage.failGet.clear(); const before = bytes(h.storage), requests = h.locks.requests.length;
    for (const target of [NaN, -1, 3, Infinity]) {
      assert.equal(h.session.reattach(RUN, target, { reviewed: true, token }), false);
      assert.equal(h.session.status().operationId, original.operationId); assert.equal(h.session.status().kind, kind);
    }
    h.failContextRead = true;
    assert.equal(h.session.archive(RUN, { reviewed: true, token }), false);
    assert.equal(h.session.reattach(RUN, 1, { reviewed: true, token }), false);
    h.failContextRead = false;
    assert.equal(h.session.status().operationId, original.operationId); assert.equal(h.session.status().kind, kind);
    assert.equal(h.session.status().unresolved, true); assert.equal(h.locks.requests.length, requests);
    assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source); assert.equal(h.detachments.length, 0);
  }
});

test('an unbound archive/delete marker outcome with slot null can retry marker-owned cleanup without a fabricated slot', async () => {
  for (const kind of ['archive', 'delete']) {
    const h = harness(), source = opening(), saved = await admit(h, source); const shared = sharedBytes(h.storage);
    h.storage.failRemove.add(ironmanRecordKey(RUN));
    assert.equal((await h.store.endIronman(0, terminal(source), { token: saved.token })).status, 'ended-cleanup-pending');
    h.session[kind](RUN, { reviewed: true, token: saved.token }); await h.session.settled();
    assert.equal(h.session.status().phase, 'ended'); assert.equal(h.session.status().slot, null); assert.equal(h.session.status().cleanupPending, true);
    assert.equal(h.context.state, null); assert.equal(h.adoptions.length, 0); assert.equal(h.detachments.length, 0);
    h.storage.failRemove.clear(); h.storage.clearLog(); await h.session.retry();
    assert.equal(h.session.status().phase, 'ended'); assert.equal(h.session.status().cleanupPending, false); assert.equal(h.session.status().unresolved, false);
    assert.equal(record(h.storage), null); assert.ok(marker(h.storage)); assert.deepEqual(sharedBytes(h.storage), shared);
    assert.ok(h.storage.operations.every(op => op.kind === 'remove' && op.key === ironmanRecordKey(RUN)));
  }
});

test('reviewed candidate recovery adopts the exact actual stored-orphan companion casualty in a new slot without changing its operation identity', async () => {
  const h = harness(), source = opening(); await ready(h, source); const dead = companionDeath(source);
  orphanNextRecordWrite(h); h.session.accept(dead); await h.session.settled(); const operationId = blocked(h).operationId;
  assert.equal(record(h.storage).attachment, null); assert.deepEqual(record(h.storage).state, dead); assert.deepEqual(h.context.state, source);
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const shared = sharedBytes(h.storage), requests = h.locks.requests.length;
  assert.equal(h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }), false);
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().kind, 'live');
  assert.equal((await h.session.settled()).phase, 'ready');
  assert.deepEqual(h.context.state, dead); assert.deepEqual(effects(h.context.state), effects(dead)); assert.equal(h.context.slot, 1);
  assert.equal(h.adoptions.length, 2); assert.equal(h.adoptions[1].context.operationId, operationId);
  assert.ok(h.locks.requests.length >= requests + 2, 'recovery uses actual reattachment and fresh locked exact-candidate inspection');
  assert.equal(record(h.storage).attachment.slotId, 1); assert.deepEqual(sharedBytes(h.storage), shared); onlyIndependentMutations(h);
});

test('reviewed first-save recovery preserves fixed create/import identity and adopts only the stored-orphan original candidate', async () => {
  for (const kind of ['create', 'import']) {
    const h = harness(), state = kind === 'import' ? companionDeath(opening()) : opening();
    const first = await h.store.inspectIronman(state, { intent: kind, slot: 0 }); assert.equal(first.status, 'review');
    orphanNextRecordWrite(h); h.session[kind](0, state, { token: first.token }); await h.session.settled(); const operationId = blocked(h).operationId;
    assert.equal(record(h.storage).attachment, null); assert.deepEqual(record(h.storage).state, state); assert.equal(h.context.state, null);
    const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
    h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }); assert.equal(h.session.status().operationId, operationId);
    assert.equal((await h.session.settled()).phase, 'ready'); assert.deepEqual(h.context.state, state); assert.equal(h.context.slot, 1);
    assert.equal(h.adoptions.length, 1); assert.equal(h.adoptions[0].context.operationId, operationId); assert.equal(record(h.storage).runId, RUN);
    assert.equal(h.session.status().unresolved, false); onlyIndependentMutations(h);
  }
});

test('uncertain candidate reattachment retains its original gameplay obligation and reconciles exact authority without another candidate write', async () => {
  const h = harness(), source = opening(); await ready(h, source); const dead = companionDeath(source);
  orphanNextRecordWrite(h); h.session.accept(dead); await h.session.settled(); const operationId = blocked(h).operationId;
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  h.storage.clearLog(); h.storage.afterSet = key => { if (key === ironmanRecordKey(RUN)) h.storage.failGet.add(key); };
  h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }); await h.session.settled(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().kind, 'live');
  assert.equal(record(h.storage).attachment.slotId, 1); assert.deepEqual(record(h.storage).state, dead); assert.deepEqual(h.context.state, source);
  h.storage.afterSet = null; h.storage.failGet.clear(); const writes = h.storage.operations.length;
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead); assert.equal(h.context.slot, 1);
  assert.equal(h.adoptions[1].context.operationId, operationId); assert.equal(h.storage.operations.length, writes);
  assert.deepEqual(effects(h.context.state), effects(dead));
});

test('wrong-run, unreviewed, malformed-target and unavailable-context recovery controls cannot replace a stored-orphan casualty obligation', async () => {
  const h = harness(), source = opening(); await ready(h, source); const dead = companionDeath(source);
  orphanNextRecordWrite(h); h.session.accept(dead); await h.session.settled(); const operationId = blocked(h).operationId;
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const before = bytes(h.storage), requests = h.locks.requests.length;
  assert.equal(h.session.recoverCandidate(OTHER_RUN, 1, { reviewed: true, token: review.token }), false);
  assert.equal(h.session.recoverCandidate(RUN, 1, { token: review.token }), false);
  for (const target of [NaN, -1, 3]) assert.equal(h.session.recoverCandidate(RUN, target, { reviewed: true, token: review.token }), false);
  h.failContextRead = true; assert.equal(h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }), false); h.failContextRead = false;
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().unresolved, true);
  assert.equal(h.locks.requests.length, requests); assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source);
  h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }); await h.session.settled();
  assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
});

test('recovery of a different/source head never relabels it as the reserved companion casualty', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source), dead = companionDeath(source);
  h.storage.failSet.add(ironmanRecordKey(RUN)); h.session.accept(dead); await h.session.settled(); const operationId = blocked(h).operationId;
  h.storage.failSet.clear(); assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }); await h.session.settled(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().kind, 'live');
  assert.deepEqual(h.context.state, source); assert.deepEqual(record(h.storage).state, source); assert.equal(h.adoptions.length, 1);
  const before = bytes(h.storage); await h.session.retry(); blocked(h); assert.deepEqual(bytes(h.storage), before);
  const persisted = await h.store.commitIronman(1, dead, { intent: 'continue', token: ironmanRecordToken(record(h.storage)) }); assert.equal(persisted.status, 'committed');
  await h.session.refresh(); assert.equal(h.session.status().phase, 'ready'); assert.deepEqual(h.context.state, dead);
  assert.equal(h.adoptions[1].context.operationId, operationId); assert.deepEqual(effects(h.context.state), effects(dead));
});

test('reviewed candidate recovery never supersedes a pending actual hero-terminal obligation', async () => {
  const h = harness(), source = opening(), saved = await ready(h, source);
  h.storage.failSet.add(ironmanEndedKey(RUN)); h.session.accept(terminal(source)); await h.session.settled(); const operationId = blocked(h).operationId;
  h.storage.failSet.clear(); assert.equal((await h.store.archiveIronman(RUN, { reviewed: true, token: saved.token })).status, 'archived');
  const review = await h.store.inspectIronman(RUN, { intent: 'reattach', slot: 1 }); assert.equal(review.status, 'review');
  const before = bytes(h.storage), requests = h.locks.requests.length;
  assert.equal(h.session.recoverCandidate(RUN, 1, { reviewed: true, token: review.token }), false); await h.session.settled(); blocked(h);
  assert.equal(h.session.status().operationId, operationId); assert.equal(h.session.status().kind, 'terminal');
  assert.equal(h.locks.requests.length, requests); assert.deepEqual(bytes(h.storage), before); assert.deepEqual(h.context.state, source);
  assert.equal(h.adoptions.length, 1); assert.equal(h.endings.length, 0); assert.equal(h.session.releaseStandard(), false);
});
