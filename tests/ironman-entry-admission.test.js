import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setImmediate} from 'node:timers/promises';
import {createSaveCoordinator, createSaveStore, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {createIronmanSession} from '../dist/js/ironman-session.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {rulesOf, NEW, OLD} from '../dist/js/edition.js';
import {createIronmanMetadata, recordCombatZero, ironmanHeroDeath} from '../dist/js/ironman.js';
import {createBattle} from '../dist/js/combat.js';
import {ironmanRecordKey, ironmanEndedKey, ironmanRecordToken} from '../dist/js/ironman-storage.js';

// Actual storage/authority and session integration over genuine historical
// states. The modern metadata opt-in, exclusive lock/entropy surface and
// controlled resource/zero transitions are explicitly bounded test setup.
// This supplies no earned lifetime, browser schedule or cutover verdict.
const KEY = 'hearth-and-oath:slots:v1', RUN = '00112233-4455-4677-8899-aabbccddeeff';
const copy = value => structuredClone(value), newOnly = state => rulesOf(state) === NEW;
const release = version => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${version}.json.gz`, import.meta.url)))).states;
const historical = Object.fromEntries(['0600', '0610', '0690'].map(version => [version, release(version)]));
// v0.72.2: the engine reads any life into the one rulebook, so these store/session tests decode
// with a reader that keeps an old life as its own stored rules: the subject is the entry fence.
const readBoth = value => rulesOf(value) === OLD ? (validateSave(value) ? structuredClone(value) : null) : migrateSave(value);
const old = readBoth(historical['0600'].eighteen), newer = migrateSave(historical['0690'].eighteen);
let entropy = 0;
function optedIn(version = '0600') {
  const state = readBoth(historical[version].eighteen);
  state.ironman = createIronmanMetadata(state, {randomUUID: () => RUN});
  assert.ok(validateSave(state)); assert.deepEqual(readBoth(state), state); return state;
}
function deferred() {let resolve; const promise = new Promise(yes => {resolve = yes;}); return {promise, resolve};}
function locks() {
  let pending = Promise.resolve(), held = false;
  const manager = {
    request(name, {mode}, consume) {
      const result = pending.then(async () => {
        assert.equal(held, false); held = true;
        try {return await consume({name, mode});} finally {held = false;}
      });
      pending = result.catch(() => {}); return result;
    },
    hold() {
      const entered = deferred(), release = deferred();
      const done = manager.request('hearth-and-oath:save:v1', {mode: 'exclusive'}, async () => {entered.resolve(); await release.promise;});
      return {entered: entered.promise, release: release.resolve, done};
    },
  }; return manager;
}
function setup() {
  const raw = {version: 1, activeSlot: 1,
    slots: [old, newer, null].map((state, id) => ({id, state, updatedAt: null, revision: `entry-retained-${id}`})),
    backups: {1: {state: historical['0600'].birth, updatedAt: null}}};
  const values = new Map([[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer)]]);
  const storage = {values, writes: 0, get length() {return values.size;}, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {this.writes++; values.set(key, String(value));}, removeItem(key) {this.writes++; values.delete(key);}};
  const manager = locks(), coordinate = createSaveCoordinator(manager);
  const store = createSaveStore(storage, readBoth, {coordinate,
    crypto: {randomUUID: () => `aaaaaaaa-bbbb-4ccc-8ddd-${(++entropy).toString(16).padStart(12, '0')}`}});
  return {storage, manager, store};
}
const bytes = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
const rawRecord = storage => JSON.parse(storage.getItem(ironmanRecordKey(RUN)) || 'null');
function sessionFor(store, acceptPosition) {
  let current = {state: null, slot: 1};
  const adopted = [], ended = [], detached = [];
  const session = createIronmanSession({store, acceptPosition, readContext: () => current,
    onAdopt(state, authority) {adopted.push({state: copy(state), authority: copy(authority)}); current = {state, slot: authority.slot};},
    onEnd(info) {ended.push(info); if (current.state?.ironman?.runId === info.runId) current = {state: null, slot: current.slot};},
    onDetach(info) {detached.push(info); if (current.state?.ironman?.runId === info.runId) current = {state: null, slot: current.slot};}});
  return {session, adopted, ended, detached, current: () => current};
}
async function review(store, state, intent = 'create') {
  const result = await store.inspectIronman(state, {intent, slot: 2}); assert.equal(result.status, 'review'); return result;
}
async function claim(store, state = optedIn()) {
  const checked = await review(store, state), result = await store.commitIronman(2, state, {intent: 'create', token: checked.token});
  assert.equal(result.status, 'committed'); return result;
}
async function exported(store) {
  const result = await store.inspectIronman(RUN, {intent: 'export', slot: 2,
    acceptForPlay: () => {throw Error('export is not simulation entry');}, consume: (state, authority) => ({state, ...authority})});
  assert.equal(result.status, 'ready'); return result.value;
}
function assertNeighbours(store) {
  assert.deepEqual(store.read(0), old); assert.deepEqual(store.read(1), newer);
  assert.deepEqual(store.backup(1), readBoth(historical['0600'].birth));
}

test('default sessions still enter an exact old life; configured new-rule sessions admit genuine zero-debt and later lives', async () => {
  for (const version of ['0600', '0610', '0690']) {
    const {store} = setup(), state = optedIn(version), h = sessionFor(store, version === '0600' ? undefined : newOnly);
    const checked = await review(store, state); h.session.create(2, state, {token: checked.token}); await h.session.settled();
    assert.equal(h.session.status().phase, 'ready'); assert.equal(h.adopted.length, 1); assert.deepEqual(h.current().state, state);
    if (version === '0610') {assert.equal(state.hero.station, undefined); assert.equal(state.householdBudget.debt, 0); assert.equal(state.farm, undefined);}
    assertNeighbours(store);
  }
});

test('old create/import preflight refuses before reservation, adoption or persistence', async () => {
  for (const intent of ['create', 'import']) {
    const {storage, store} = setup(), state = optedIn(), original = copy(state), checked = await review(store, state, intent);
    const h = sessionFor(store, newOnly), initial = bytes(storage), before = h.session.status();
    h.session[intent](2, state, {token: checked.token}); await h.session.settled();
    const status = h.session.status(); assert.equal(status.reason, 'position-not-admitted');
    assert.equal(status.operationId, before.operationId); assert.equal(status.epoch, before.epoch); assert.equal(status.unresolved, false);
    assert.equal(h.adopted.length, 0); assert.deepEqual(h.current(), {state: null, slot: 1});
    assert.deepEqual(bytes(storage), initial); assert.equal(storage.writes, 0); assert.deepEqual(state, original); assertNeighbours(store);
  }
});

test('locked resume refusal retains the complete authority and does not call app adoption; export remains available', async () => {
  const {storage, store} = setup(), state = optedIn(); await claim(store, state);
  const h = sessionFor(store, newOnly), initial = bytes(storage), original = rawRecord(storage);
  h.session.resume(RUN, 2); await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().unresolved, false);
  assert.equal(h.adopted.length, 0); assert.deepEqual(h.current(), {state: null, slot: 1});
  assert.deepEqual(bytes(storage), initial); assert.deepEqual(rawRecord(storage), original);
  assert.deepEqual((await exported(store)).state, state); assert.equal(store.empty(), null); assertNeighbours(store);
});

test('a policy changed while create/import waits for the real store lock refuses before any write and retains the reserved candidate', async () => {
  for (const intent of ['create', 'import']) {
    const {storage, store, manager} = setup(), state = optedIn(), checked = await review(store, state, intent);
    let allowed = true, effects = 0; const h = sessionFor(store, () => allowed), hold = manager.hold(); await hold.entered;
    const initial = bytes(storage);
    h.session[intent](2, state, {token: checked.token, afterAdopt: () => effects++}); await setImmediate();
    const id = h.session.status().operationId; assert.ok(id); allowed = false; hold.release(); await hold.done; await h.session.settled();
    assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().operationId, id); assert.equal(h.session.status().unresolved, true);
    assert.deepEqual(bytes(storage), initial); assert.equal(h.adopted.length, 0); assert.equal(effects, 0);
    assert.equal(h.session.releaseStandard(), false, 'a refused reserved write does not discard its original obligation');
    allowed = true; await h.session.retry();
    assert.equal(h.session.status().phase, 'ready'); assert.equal(h.adopted.length, 1); assert.equal(effects, 1); assert.deepEqual(h.current().state, state);
    assertNeighbours(store);
  }
});

test('reattachment checks the actual archived head under lock before writing an attachment', async () => {
  const {storage, store, manager} = setup(), state = optedIn(); const initialHead = await claim(store, state);
  assert.equal((await store.archiveIronman(RUN, {reviewed: true, token: initialHead.token})).status, 'archived');
  const checked = await store.inspectIronman(RUN, {intent: 'reattach', slot: 2}); assert.equal(checked.status, 'review');
  let allowed = true; const h = sessionFor(store, () => allowed), hold = manager.hold(); await hold.entered;
  const initial = bytes(storage), archived = rawRecord(storage);
  h.session.reattach(RUN, 2, {reviewed: true, token: checked.token}); await setImmediate(); allowed = false;
  hold.release(); await hold.done; await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().unresolved, true);
  assert.deepEqual(bytes(storage), initial); assert.deepEqual(rawRecord(storage), archived); assert.equal(h.adopted.length, 0);
  allowed = true; await h.session.retry(); assert.equal(h.session.status().phase, 'ready');
  assert.deepEqual(h.current().state, state); assert.equal(h.adopted.length, 1); assertNeighbours(store);
});

test('adoption defense refuses before app side effects when a policy changes after locked inspection', async () => {
  const {storage, store} = setup(), state = optedIn(); await claim(store, state);
  let checks = 0; const h = sessionFor(store, () => ++checks === 1), initial = bytes(storage);
  h.session.resume(RUN, 2); await h.session.settled();
  assert.equal(checks, 2); assert.equal(h.session.status().reason, 'position-not-admitted');
  assert.equal(h.adopted.length, 0); assert.deepEqual(h.current(), {state: null, slot: 1}); assert.deepEqual(bytes(storage), initial);
});

test('a durable but unadopted candidate keeps its obligation through denied retry, reviewed authority and candidate recovery', async () => {
  const {storage, store} = setup(), state = optedIn(), checked = await review(store, state);
  let remaining = 2, effects = 0;
  // Preflight and locked commit admit; the final adoption defense refuses.
  // This deliberately changes the policy after persistence, not before it.
  const h = sessionFor(store, () => remaining-- > 0);
  h.session.create(2, state, {token: checked.token, afterAdopt: () => effects++}); await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().unresolved, true);
  const id = h.session.status().operationId, authority = await exported(store), durable = bytes(storage);
  assert.deepEqual(authority.state, state); assert.equal(h.adopted.length, 0);
  await h.session.retry(); assert.equal(h.session.status().operationId, id); assert.deepEqual(bytes(storage), durable);
  h.session.chooseAuthority(RUN, 2, {reviewed: true, token: authority.token}); await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().operationId, id); assert.deepEqual(bytes(storage), durable);
  assert.equal(h.session.releaseStandard(), false);
  assert.equal((await store.archiveIronman(RUN, {reviewed: true, token: authority.token})).status, 'archived');
  const recovery = await store.inspectIronman(RUN, {intent: 'reattach', slot: 2}); assert.equal(recovery.status, 'review');
  const archived = bytes(storage);
  h.session.recoverCandidate(RUN, 2, {reviewed: true, token: recovery.token}); await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().operationId, id);
  assert.equal(h.session.status().unresolved, true); assert.deepEqual(bytes(storage), archived); assert.equal(h.adopted.length, 0);
  remaining = Infinity; await h.session.retry(); assert.equal(h.session.status().phase, 'ready');
  assert.equal(h.adopted.length, 1); assert.equal(effects, 0, 'explicit recovery does not replay the abandoned presentation effect');
  assert.deepEqual(h.current().state, state); assertNeighbours(store);
});

test('denied live preflight preserves current export and terminal cleanup without creating a new obligation', async () => {
  const {storage, store} = setup(), state = optedIn(); await claim(store, state);
  let allowed = true; const h = sessionFor(store, () => allowed); h.session.resume(RUN, 2); await h.session.settled();
  const current = h.current().state, next = copy(current); next.hero.gold++;
  assert.ok(validateSave(next)); allowed = false; const initial = bytes(storage), before = h.session.status();
  h.session.accept(next); await h.session.settled();
  assert.equal(h.session.status().reason, 'position-not-admitted'); assert.equal(h.session.status().operationId, before.operationId);
  assert.equal(h.session.status().unresolved, false); assert.deepEqual(h.current().state, current); assert.deepEqual(bytes(storage), initial);
  const exported = await h.session.protect(saved => copy(saved)); assert.equal(exported.status, 'ready'); assert.deepEqual(exported.value, current);
  // Native detached battle capture and a controlled zero isolate cleanup.
  const terminal = copy(current); terminal.battle = createBattle(terminal, 'forest', null, {openingTurns: false});
  terminal.battle.instanceId = 'entry-controlled-terminal';
  const hero = terminal.battle.actors.find(actor => actor.id === 'hero'), hp = hero.hp; hero.hp = 0;
  assert.equal(recordCombatZero(terminal.battle, 'hero', hp), true); assert.ok(validateSave(terminal)); assert.ok(ironmanHeroDeath(terminal));
  h.session.accept(terminal); await h.session.settled();
  assert.equal(h.session.status().phase, 'ended'); assert.equal(h.ended.length, 1);
  assert.ok(storage.getItem(ironmanEndedKey(RUN))); assert.equal(storage.getItem(ironmanRecordKey(RUN)), null); assertNeighbours(store);
});

test('entry refusal never blocks explicit archive/delete or recognition of an already ended run', async () => {
  const {storage, store} = setup(), state = optedIn(), claimed = await claim(store, state), h = sessionFor(store, newOnly);
  h.session.archive(RUN, {reviewed: true, token: claimed.token}); await h.session.settled();
  assert.equal(h.detached.length, 1); assert.equal(rawRecord(storage).attachment, null);
  const archived = rawRecord(storage); h.session.delete(RUN, {reviewed: true, token: ironmanRecordToken(archived)}); await h.session.settled();
  assert.equal(h.detached.length, 2); assert.equal(rawRecord(storage).state, null); assertNeighbours(store);

  const second = setup(), life = optedIn(), head = await claim(second.store, life), terminal = copy(life);
  terminal.battle = createBattle(terminal, 'forest', null, {openingTurns: false}); terminal.battle.instanceId = 'entry-prior-terminal';
  const hero = terminal.battle.actors.find(actor => actor.id === 'hero'), hp = hero.hp; hero.hp = 0;
  assert.equal(recordCombatZero(terminal.battle, 'hero', hp), true); assert.equal((await second.store.endIronman(2, terminal, {token: head.token})).status, 'ended');
  let calls = 0; const ended = sessionFor(second.store, () => {calls++; return false;});
  ended.session.resume(RUN, 2); await ended.session.settled();
  assert.equal(calls, 0); assert.equal(ended.session.status().phase, 'ended'); assert.equal(ended.ended.length, 1);
  assert.equal(ended.adopted.length, 0); assert.equal(second.storage.getItem(ironmanRecordKey(RUN)), null);
});
