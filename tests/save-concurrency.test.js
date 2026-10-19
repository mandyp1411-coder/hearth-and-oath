import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { createBirthGame, chooseEventOption, migrateSave } from '../dist/js/engine.js';
const key = 'hearth-and-oath:slots:v1';
const life = (name, step = 0) => ({ hero: { name }, seed: name, step, pending: { choices: ['keep', 'leave'] } });
const validate = value => value?.hero?.name && Number.isInteger(value.step) ? structuredClone(value) : null;
function disk(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { values, failKey: null, unreadable: false, writes: [],
    getItem(k) { if (this.unreadable) throw Error('Read unavailable'); return values.get(k) ?? null; },
    setItem(k, v) { if (this.failKey === k || this.failKey === '*') throw Error('Quota'); this.writes.push(k); values.set(k, String(v)); },
    removeItem(k) { values.delete(k); },
  };
}
const load = storage => createSaveStore(storage, validate);
const bytes = storage => [...storage.values];
function twoTabs(states = [life('Original')]) {
  const storage = disk(), initial = load(storage);
  states.forEach((state, id) => initial.write(id, state));
  return { storage, a: load(storage), b: load(storage) };
}

test('the genuine two-tab newborn regression keeps the life created in the neighboring slot', () => {
  const storage = disk(), original = createBirthGame({ name: 'Original', seed: 'cross-tab-original' });
  assert.ok(createSaveStore(storage, migrateSave).write(0, original));
  const a = createSaveStore(storage, migrateSave), b = createSaveStore(storage, migrateSave);
  const second = createBirthGame({ name: 'Second Life', seed: 'cross-tab-second' });
  assert.ok(b.write(1, second));
  const advanced = chooseEventOption(original, original.event.choices[0].id);
  assert.ok(a.write(0, advanced));
  const restored = createSaveStore(storage, migrateSave);
  assert.deepEqual(restored.read(0), advanced); assert.deepEqual(restored.read(1), second);
  assert.equal(restored.active(), 0);
});

test('independent slot writes merge latest lives, active selection, timestamps and backups', () => {
  const { storage, a, b } = twoTabs([life('Oak'), life('Ash')]);
  assert.ok(b.replace(1, life('Birch'), { reviewed: true }));
  const remote = load(storage).list()[1], backup = b.backup(1);
  assert.ok(a.select(2)); assert.ok(a.select(0));
  assert.ok(a.write(0, life('Oak', 1)));
  assert.deepEqual(a.list()[1], remote); assert.deepEqual(a.backup(1), backup);
  assert.deepEqual(load(storage).list()[1], remote); assert.deepEqual(load(storage).backup(1), backup);
  assert.equal(load(storage).active(), 0);
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_SAVE_KEY)), life('Oak', 1));
});

test('a stale autosave cannot revive a deleted neighboring life or its backup', () => {
  const { storage, a, b } = twoTabs([life('Oak'), life('Ash')]);
  assert.ok(b.replace(1, life('New Ash'), { reviewed: true }));
  assert.ok(b.remove(1, { reviewed: true, token: b.deletionToken(1) }));
  const tombstone = load(storage).list()[1]; assert.ok(tombstone.revision);
  assert.ok(a.write(0, life('Oak', 1)));
  assert.deepEqual(load(storage).list()[1], tombstone); assert.equal(load(storage).backup(1), null);
});

test('same-slot progress rejects every stale retry and holds the local position for export until explicit reload', () => {
  const { storage, a, b } = twoTabs();
  assert.ok(b.write(0, life('Original', 2))); const durable = bytes(storage);
  assert.equal(a.write(0, life('Original', 1)), false);
  assert.equal(a.conflict().reason, 'changed'); assert.equal(a.available(), true); assert.ok(a.hasUnsaved(0));
  assert.deepEqual(a.read(0), life('Original', 1)); assert.deepEqual(bytes(storage), durable);
  assert.equal(a.write(0, life('Original', 3)), false); assert.deepEqual(bytes(storage), durable);
  assert.ok(a.reload()); assert.equal(a.conflict(), null); assert.equal(a.hasUnsaved(0), false);
  assert.deepEqual(a.read(0), life('Original', 2));
  assert.ok(a.write(0, life('Original', 4))); assert.deepEqual(load(storage).read(0), life('Original', 4));
});

test('same-slot deletion and identity ABA are conflicts even when the recreated state has identical content', () => {
  for (const recreate of [false, true]) {
    const { storage, a, b } = twoTabs();
    assert.ok(b.remove(0, { reviewed: true, token: b.deletionToken(0) }));
    if (recreate) assert.ok(b.write(0, life('Original')));
    const durable = bytes(storage);
    assert.equal(a.write(0, life('Original', 1)), false);
    assert.equal(a.conflict().reason, recreate ? 'changed' : 'deleted');
    assert.deepEqual(bytes(storage), durable); assert.deepEqual(a.read(0), life('Original', 1));
  }
});

test('two stale creators cannot claim the same empty slot, while an unrelated empty slot still works', () => {
  const { storage, a, b } = twoTabs();
  assert.ok(b.write(1, life('New life B'))); const durable = bytes(storage);
  assert.equal(a.write(1, life('New life A')), false); assert.deepEqual(bytes(storage), durable);
  assert.ok(a.write(2, life('Third life')));
  assert.deepEqual(load(storage).read(1), life('New life B'));
  assert.deepEqual(a.read(1), life('New life A'), 'unrelated success retains the unsaved rejected life');
  assert.equal(a.write(1, life('New life A', 1)), false, 'unrelated merging never blesses a stale baseline');
});

test('reviewed import uses the exact reviewed target token even after unrelated writes refresh the list', () => {
  const { storage, a, b } = twoTabs([life('Oak'), life('Ash')]), token = a.reviewToken(1);
  assert.ok(b.replace(1, life('Birch'), { reviewed: true }));
  assert.ok(a.write(0, life('Oak', 1)));
  const durable = bytes(storage);
  assert.equal(a.replace(1, life('Imported'), { reviewed: true, token }), false);
  assert.deepEqual(bytes(storage), durable); assert.deepEqual(load(storage).backup(1), life('Ash'));
  assert.ok(a.reload());
  assert.ok(a.replace(1, life('Imported'), { reviewed: true, token: a.reviewToken(1) }));
  assert.deepEqual(load(storage).backup(1), life('Birch'));
});

test('an empty-slot import and an old deletion review never displace a new neighboring save', () => {
  const { storage, a, b } = twoTabs(), importToken = a.reviewToken(1), deleteToken = a.deletionToken(0);
  assert.ok(b.write(1, life('New neighbor'))); const durable = bytes(storage);
  assert.equal(a.replace(1, life('Imported'), { reviewed: true, token: importToken }), false);
  assert.equal(a.remove(0, { reviewed: true, token: deleteToken }), false);
  assert.deepEqual(bytes(storage), durable);
});

test('quota failures leave durable lives and backups exact, retain session progress, and retry merges new neighbors', () => {
  for (const failKey of [key, LEGACY_SAVE_KEY, '*']) {
    const { storage, a, b } = twoTabs();
    const before = bytes(storage); storage.failKey = failKey;
    assert.equal(a.write(0, life('Original', 1)), false); assert.equal(a.available(), false);
    assert.deepEqual(bytes(storage), before); assert.deepEqual(a.read(0), life('Original', 1));
    storage.failKey = null; assert.ok(b.write(1, life('New neighbor')));
    assert.ok(a.write(0, life('Original', 1))); assert.equal(a.hasUnsaved(0), false);
    assert.deepEqual(load(storage).read(1), life('New neighbor'));
    const token = a.reviewToken(0), beforeImport = bytes(storage), old = a.read(0);
    storage.failKey = failKey;
    assert.equal(a.replace(0, life('Import'), { reviewed: true, token }), false);
    assert.deepEqual(bytes(storage), beforeImport); assert.deepEqual(a.read(0), old); assert.equal(a.backup(0), null);
  }
});

test('a read-only conflict warning retains the original baseline through writes to other slots', () => {
  const { storage, a, b } = twoTabs();
  assert.ok(b.write(0, life('Original', 2))); const before = bytes(storage);
  assert.ok(a.checkForConflict(0)); assert.deepEqual(a.read(0), life('Original')); assert.deepEqual(bytes(storage), before);
  assert.ok(a.write(1, life('Neighbor')));
  assert.equal(a.conflict().id, 0); assert.deepEqual(a.read(0), life('Original'));
  assert.equal(a.write(0, life('Original', 1)), false); assert.deepEqual(load(storage).read(0), life('Original', 2));
});

test('a new unreadable envelope or unavailable read cannot be overwritten by an old session', () => {
  for (const inaccessible of [false, true]) {
    const { storage, a } = twoTabs();
    if (inaccessible) storage.unreadable = true; else storage.values.set(key, '{not readable');
    const before = bytes(storage);
    assert.equal(a.write(0, life('Original', 1)), false); assert.equal(a.available(), false);
    assert.deepEqual(bytes(storage), before); assert.deepEqual(a.read(0), life('Original', 1));
    assert.equal(a.reload(), false); assert.deepEqual(a.read(0), life('Original', 1));
  }
});

test('old v1 envelopes gain revisions lazily without losing pending content, and empty envelopes defeat obsolete mirrors', () => {
  const original = life('Legacy'), neighbor = life('Neighbor');
  const storage = disk({ [key]: JSON.stringify({ version: 1, activeSlot: 1, slots: [{ id: 0, state: original, updatedAt: null }, { id: 1, state: neighbor, updatedAt: null }], backups: { 1: { state: life('Prior'), updatedAt: null } } }) });
  const a = load(storage), b = load(storage); assert.equal(storage.writes.length, 0);
  assert.ok(b.write(1, life('Neighbor', 1))); assert.ok(a.write(0, life('Legacy', 1)));
  assert.deepEqual(load(storage).read(1), life('Neighbor', 1)); assert.deepEqual(load(storage).backup(1), life('Prior'));
  const empty = disk({ [key]: JSON.stringify({ version: 1, activeSlot: 0, slots: [] }), [LEGACY_SAVE_KEY]: JSON.stringify(original) });
  assert.equal(load(empty).read(0), null); assert.equal(empty.writes.length, 0);
});

function lockManager() {
  let pending = Promise.resolve(), held = 0, maxHeld = 0;
  return { get maxHeld() { return maxHeld; }, request(name, options, operation) {
    assert.equal(name, 'hearth-and-oath:save:v1'); assert.equal(options.mode, 'exclusive');
    const result = pending.then(async () => { held++; maxHeld = Math.max(held, maxHeld); try { return await operation(); } finally { held--; } });
    pending = result.catch(() => {}); return result;
  } };
}
test('two browser coordinators serialize overlapping same-slot and independent-slot writes under Web Locks', async () => {
  const { storage, a, b } = twoTabs(), locks = lockManager(), runA = createSaveCoordinator(locks), runB = createSaveCoordinator(locks);
  const results = await Promise.all([runA(() => a.write(0, life('Original', 1))), runB(() => b.write(0, life('Original', 2))), runB(() => b.write(1, life('Neighbor')))]);
  assert.deepEqual(results, [true, false, true]); assert.equal(locks.maxHeld, 1);
  assert.deepEqual(load(storage).read(0), life('Original', 1)); assert.deepEqual(load(storage).read(1), life('Neighbor'));
});
test('coordinator fallback runs once only when Locks is unavailable, not when an entered operation fails', async () => {
  let calls = 0; const operation = () => ++calls;
  assert.equal(createSaveCoordinator(null)(operation), 1);
  const denied = createSaveCoordinator({ request: async () => { throw Object.assign(Error('Opaque origin'), { name: 'SecurityError' }); } });
  assert.equal(await denied(operation), 2);
  const run = createSaveCoordinator(lockManager());
  await assert.rejects(run(() => { calls++; throw Error('Write failed'); }), /Write failed/);
  assert.equal(calls, 3); assert.equal(await run(operation), 4, 'a failed callback does not poison the queue');
});

test('an old-build whole-envelope write is detected and the new tab preserves the life it erased for export', () => {
  const { storage, a } = twoTabs([life('First'), life('Second')]);
  storage.setItem(key, JSON.stringify({ version: 1, activeSlot: 0, slots: [{ id: 0, state: life('First', 1), updatedAt: null }, { id: 1, state: null, updatedAt: null }, { id: 2, state: null, updatedAt: null }], backups: {} }));
  const durable = bytes(storage);
  assert.equal(a.write(1, life('Second', 1)), false);assert.equal(a.conflict().reason, 'deleted');
  assert.deepEqual(a.read(1), life('Second', 1));assert.deepEqual(bytes(storage), durable);
});

test('an origin denied Web Locks preserves same-tab queued save order while switching to fallback', async () => {
  const order=[];let release;const gate=new Promise(resolve=>{release=resolve;});
  const run=createSaveCoordinator({request:async()=>{await gate;throw Object.assign(Error('Opaque origin'),{name:'SecurityError'});}});
  const first=run(()=>{order.push(1);return 1;}),second=run(()=>{order.push(2);return 2;});
  release();await first;const third=run(()=>{order.push(3);return 3;});await Promise.all([second,third]);
  assert.deepEqual(order,[1,2,3]);assert.equal(run.locking(),false);
});
