import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setImmediate} from 'node:timers/promises';
import {createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {rulesOf, OLD, NEW} from '../dist/js/edition.js';
import {createIronmanMetadata, recordCombatZero, ironmanHeroDeath} from '../dist/js/ironman.js';
import {createBattle} from '../dist/js/combat.js';
import {ironmanRecordKey, ironmanEndedKey} from '../dist/js/ironman-storage.js';

const KEY = 'hearth-and-oath:slots:v1', RUN = '00112233-4455-4677-8899-aabbccddeeff';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const oldRaw = release('0600'), newRaw = release('0690');
const old = migrateSave(oldRaw.eighteen), newer = migrateSave(newRaw.eighteen);
assert.ok(validateSave(old) && validateSave(newer));
assert.equal(rulesOf(old), OLD); assert.equal(rulesOf(newer), NEW);
const clone = value => structuredClone(value);
const newOnly = state => rulesOf(state) === NEW;
function envelope(states = [oldRaw.eighteen, newRaw.eighteen, null]) {
  return {version: 1, activeSlot: 1,
    slots: states.map((state, id) => ({id, state, updatedAt: null, revision: `retained-${id}`})),
    backups: {1: {state: oldRaw.birth, updatedAt: null}}};
}
function disk(raw = envelope()) {
  const values = new Map([[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(raw.slots[raw.activeSlot].state)]]);
  return {values, writes: 0, get length() {return values.size;}, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem(key, value) {this.writes++; values.set(key, String(value));},
    removeItem(key) {this.writes++; values.delete(key);}};
}
const bytes = storage => [...storage.values].sort(([a], [b]) => a.localeCompare(b));
function view(store) {
  return {list: store.list(), backups: [0, 1, 2].map(id => store.backup(id)), active: store.active(),
    tokens: [0, 1, 2].map(id => store.reviewToken(id)), health: [0, 1, 2].map(id => store.health(id)),
    conflict: store.conflict(), unsaved: store.hasUnsaved()};
}
function ironman(storage, acceptPosition) {
  // A controlled exclusive lock/entropy surface tests storage contracts, not
  // browser scheduling. Both actual decode and mortality validators still run.
  let sequence = 0;
  const coordinate = createSaveCoordinator({async request(name, {mode}, consume) {return consume({name, mode});}});
  return createSaveStore(storage, migrateSave, {coordinate, acceptPosition,
    crypto: {randomUUID: () => `aaaaaaaa-bbbb-4ccc-8ddd-${(++sequence).toString(16).padStart(12, '0')}`}});
}
function optedIn() {
  // Explicit modern opt-in on a genuine old-rule life, not a claim that the
  // historical release wrote Ironman metadata. All past deeds stay untouched.
  const state = clone(old); state.ironman = createIronmanMetadata(state, {randomUUID: () => RUN});
  assert.ok(validateSave(state)); assert.deepEqual(migrateSave(state), state); return state;
}
async function claim(store, state) {
  const review = await store.inspectIronman(state, {intent: 'create', slot: 2});
  assert.equal(review.status, 'review');
  const result = await store.commitIronman(2, state, {intent: 'create', token: review.token});
  assert.equal(result.status, 'committed'); return result;
}
async function head(store, intent = 'export') {
  const result = await store.inspectIronman(RUN, {intent, slot: 2,
    consume: (state, authority) => ({state, ...authority})});
  assert.equal(result.status, 'ready'); return result.value;
}

test('a stricter incoming-write policy cannot hide old durable slots, backups or a mirror-only life', () => {
  let calls = 0;
  const storage = disk(), initial = bytes(storage);
  const store = createSaveStore(storage, migrateSave, {acceptPosition: state => {calls++; return newOnly(state);}});
  for (let iteration = 0; iteration < 2; iteration++) {
    assert.deepEqual(store.read(0), old); assert.deepEqual(store.read(1), newer);
    assert.deepEqual(store.backup(1), migrateSave(oldRaw.birth));
    assert.equal(store.empty(), 2); assert.equal(store.health(0).hasDurableState, true);
    assert.ok(store.reviewToken(0)); assert.ok(store.deletionToken(0)); assert.equal(store.reload(), true);
  }
  assert.equal(calls, 0); assert.equal(storage.writes, 0); assert.deepEqual(bytes(storage), initial);
  storage.values.delete(KEY); storage.values.set(LEGACY_SAVE_KEY, JSON.stringify(oldRaw.eighteen));
  const mirror = createSaveStore(storage, migrateSave, {acceptPosition: () => {throw Error('not a read policy');}});
  assert.deepEqual(mirror.read(0), old); assert.equal(mirror.empty(), 1); assert.equal(storage.writes, 0);
});

test('refused ordinary writes and replacements leave occupancy, tokens, selection and unsaved state exact', () => {
  const storage = disk(), store = createSaveStore(storage, migrateSave, {acceptPosition: newOnly});
  const initial = bytes(storage), before = view(store), input = clone(old);
  for (const slot of [0, 1, 2]) {
    assert.equal(store.write(slot, input), false);
    assert.equal(store.replace(slot, input, {reviewed: true, token: store.reviewToken(slot)}), false);
    assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial);
  }
  assert.deepEqual(input, old); assert.equal(storage.writes, 0);
  assert.equal(store.write(2, newer), true);
  assert.deepEqual(store.read(0), old); assert.deepEqual(store.backup(1), migrateSave(oldRaw.birth));
  assert.equal(store.replace(0, newer, {reviewed: true, token: store.reviewToken(0)}), true);
  assert.deepEqual(store.backup(0), old, 'an explicit admitted replacement keeps the complete previous old life');
});

test('genuine zero-debt v0.61 lives pass new-rule admission without inventing a station or field', () => {
  const debtOnly = release('0610'), storage = disk(), store = createSaveStore(storage, migrateSave, {acceptPosition: newOnly});
  for (const [name, raw] of Object.entries(debtOnly)) {
    assert.equal(raw.hero.station, undefined); assert.equal(raw.householdBudget.debt, 0);
    const original = clone(raw), expected = migrateSave(raw);
    assert.equal(store.write(2, raw), true, name); assert.deepEqual(store.read(2), expected);
    assert.equal(store.read(2).hero.station, undefined); assert.equal(store.read(2).farm, undefined);
    assert.deepEqual(raw, original); assert.deepEqual(store.read(0), old);
  }
});

test('admission cannot grant validity to a malformed save and refusal preserves earlier unsaved work', () => {
  const storage = disk(); let allowed = true, calls = 0;
  const store = createSaveStore(storage, migrateSave, {acceptPosition: () => {calls++; return allowed;}});
  const initial = bytes(storage), original = view(store);
  assert.equal(store.write(2, {version: 1}), false); assert.equal(store.replace(2, {version: 1}), false);
  assert.equal(calls, 0); assert.deepEqual(view(store), original); assert.deepEqual(bytes(storage), initial);
  const write = storage.setItem; storage.setItem = () => {throw Error('controlled quota failure');};
  assert.equal(store.write(2, newer), false); assert.equal(store.hasUnsaved(2), true);
  const retained = view(store); allowed = false;
  assert.equal(store.write(0, old), false); assert.equal(store.replace(0, newer, {reviewed: true, token: store.reviewToken(0)}), false);
  assert.deepEqual(view(store), retained); assert.deepEqual(bytes(storage), initial);
  storage.setItem = write; allowed = true; assert.equal(store.write(2, newer), true);
  assert.equal(store.hasUnsaved(2), false); assert.deepEqual(store.read(0), old);
});

test('predicate mutation, exceptions and nonboolean results cannot alter or admit an ordinary candidate', async () => {
  for (const result of [() => false, () => undefined, () => 1, () => 'yes', () => ({}), () => Promise.resolve(true), () => Promise.reject(Error('async refusal'))]) {
    const storage = disk(), store = createSaveStore(storage, migrateSave, {acceptPosition: state => {state.hero.gold = 999999; return result();}});
    const initial = bytes(storage), before = view(store), input = clone(newer);
    assert.equal(store.write(2, input), false);
    assert.equal(store.replace(0, input, {reviewed: true, token: store.reviewToken(0)}), false);
    assert.deepEqual(input, newer); assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial);
    await setImmediate();
  }
  const storage = disk(), initial = bytes(storage);
  const store = createSaveStore(storage, migrateSave, {acceptPosition: state => {state.hero.name = 'Changed'; throw Error('refuse');}});
  assert.equal(store.write(2, newer), false); assert.deepEqual(bytes(storage), initial); assert.deepEqual(store.read(1), newer);
  const accepting = createSaveStore(storage, migrateSave, {acceptPosition: state => {state.hero.name = 'Changed'; return true;}});
  assert.equal(accepting.write(2, newer), true); assert.deepEqual(accepting.read(2), newer, 'admission cannot rewrite an accepted candidate');
  for (const value of [null, false, 'new', {}]) assert.throws(() => createSaveStore(storage, migrateSave, {acceptPosition: value}), /acceptPosition must be a function/);
});

test('a refused ordinary candidate cannot bless a stale replacement review', () => {
  const storage = disk(), local = createSaveStore(storage, migrateSave, {acceptPosition: newOnly});
  const other = createSaveStore(storage, migrateSave), token = local.reviewToken(0);
  assert.equal(other.replace(0, newer, {reviewed: true, token: other.reviewToken(0)}), true);
  const durable = bytes(storage);
  assert.equal(local.replace(0, old, {reviewed: true, token}), false);
  assert.equal(local.replace(0, newer, {reviewed: true, token}), false, 'the old token remains stale even after policy refusal');
  assert.deepEqual(bytes(storage), durable); assert.deepEqual(other.backup(0), old);
});

test('refused Ironman create/import commits leave every retained ordinary life and raw empty token untouched', async () => {
  const storage = disk(), store = ironman(storage, newOnly), state = optedIn(), original = clone(state);
  for (const intent of ['create', 'import']) {
    const review = await store.inspectIronman(state, {intent, slot: 2}); assert.equal(review.status, 'review');
    const before = view(store), initial = bytes(storage);
    const result = await store.commitIronman(2, state, {intent, token: review.token});
    assert.equal(result.status, 'blocked'); assert.equal(result.reason, 'position-not-admitted');
    assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial); assert.deepEqual(state, original);
  }
  assert.equal(storage.writes, 0);
});

test('a retained Ironman head remains readable and exportable when further writes are refused', async () => {
  const storage = disk(), state = optedIn(), writer = ironman(storage); await claim(writer, state);
  let calls = 0;
  const store = ironman(storage, s => {calls++; return newOnly(s);}), initial = bytes(storage), before = view(store);
  assert.deepEqual(store.read(2), state); assert.equal(store.empty(), null);
  const exported = await head(store); assert.deepEqual(exported.state, state); assert.equal(calls, 0);
  const result = await store.commitIronman(2, state, {intent: 'continue', token: exported.token});
  assert.equal(result.status, 'blocked'); assert.equal(result.reason, 'position-not-admitted'); assert.equal(calls, 1);
  assert.deepEqual(bytes(storage), initial); assert.deepEqual(view(store), before);
  const resumed = await head(store, 'resume'); assert.deepEqual(resumed, exported);
});

test('Ironman predicate failures cannot mutate a candidate, revision, attachment or casualty floor', async () => {
  const storage = disk(), state = optedIn(); await claim(ironman(storage), state);
  for (const predicate of [s => {s.ironman.casualties.push({forged: true}); throw Error('no');}, s => {s.hero.gold = 100000; return {};}, async () => {throw Error('async no');}]) {
    const store = ironman(storage, predicate), input = clone(state), exported = await head(store), initial = bytes(storage);
    const result = await store.commitIronman(2, input, {intent: 'continue', token: exported.token});
    assert.equal(result.reason, 'position-not-admitted'); assert.deepEqual(input, state);
    assert.deepEqual(bytes(storage), initial); assert.deepEqual(await head(store), exported); await setImmediate();
  }
});

test('a refused Ironman life can still be reviewed, archived, reattached and explicitly deleted', async () => {
  const storage = disk(), state = optedIn(); await claim(ironman(storage), state);
  const store = ironman(storage, () => {throw Error('lifecycle is not incoming play');}), exported = await head(store);
  const archived = await store.archiveIronman(RUN, {reviewed: true, token: exported.token}); assert.equal(archived.status, 'archived');
  assert.equal(store.read(2), null); const retained = await store.listRecoverableIronman();
  assert.equal(retained.status, 'ready'); assert.equal(retained.runs[0].runId, RUN);
  const review = await store.inspectIronman(RUN, {intent: 'reattach', slot: 2}); assert.equal(review.status, 'review');
  const attached = await store.reattachIronman(RUN, 2, {reviewed: true, token: review.token}); assert.equal(attached.status, 'committed');
  assert.deepEqual((await head(store)).state, state);
  const removed = await store.deleteIronman(RUN, {reviewed: true, token: (await head(store)).token}); assert.equal(removed.status, 'deleted');
  const record = JSON.parse(storage.getItem(ironmanRecordKey(RUN))); assert.equal(record.state, null); assert.deepEqual(record.casualties, state.ironman.casualties);
  assert.deepEqual(store.read(0), old); assert.deepEqual(store.read(1), newer); assert.deepEqual(store.backup(1), migrateSave(oldRaw.birth));
});

test('an incoming-write refusal cannot block a verified Ironman terminal marker and full-position cleanup', async () => {
  const storage = disk(), state = optedIn(); await claim(ironman(storage), state);
  const store = ironman(storage, () => false), authority = await head(store), terminal = clone(state);
  // A native detached capture plus a controlled zero boundary isolates marker
  // ordering. This is storage evidence, not a naturally earned combat death.
  terminal.battle = createBattle(terminal, 'forest', null, {openingTurns: false});
  terminal.battle.instanceId = 'admission-controlled-terminal';
  const hero = terminal.battle.actors.find(actor => actor.id === 'hero'), hp = hero.hp;
  hero.hp = 0; assert.equal(recordCombatZero(terminal.battle, 'hero', hp), true);
  assert.ok(validateSave(terminal)); assert.ok(ironmanHeroDeath(terminal));
  const ended = await store.endIronman(2, terminal, {token: authority.token}); assert.equal(ended.status, 'ended');
  assert.ok(storage.getItem(ironmanEndedKey(RUN))); assert.equal(storage.getItem(ironmanRecordKey(RUN)), null);
  assert.equal(store.read(2), null); assert.equal(store.empty(), 2);
  assert.equal((await store.inspectIronman(RUN, {intent: 'resume', slot: 2, consume() {throw Error('ended run cannot resume');}})).status, 'ended');
  assert.deepEqual(store.read(0), old); assert.deepEqual(store.read(1), newer);
});
