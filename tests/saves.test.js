import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSaveStore, LEGACY_SAVE_KEY, SAVE_SLOT_COUNT } from '../dist/js/saves.js';
import { createBirthGame, chooseEventOption, migrateSave, validateSave } from '../dist/js/engine.js';

const slotsKey = 'hearth-and-oath:slots:v1';
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url), 'utf8')).states;
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values, failWrites: false, writes: [],
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      if (this.failWrites) throw new Error('Quota unavailable');
      this.writes.push(key);
      values.set(key, String(value));
    },
  };
}

test('three independent slots round-trip complete lives and exact unfinished decisions', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage, migrateSave);
  const lives = [createBirthGame({ name: 'Ash', seed: 'three-life-ash' }), migrateSave(legacy.midbattle), migrateSave(legacy.pendingRoad)];
  assert.equal(SAVE_SLOT_COUNT, 3);
  for (const [id, life] of lives.entries()) {
    assert.ok(validateSave(life));
    assert.equal(store.write(id, life), true);
    assert.deepEqual(store.read(id), life);
  }
  assert.equal(store.empty(), null);
  assert.equal(store.active(), 2);
  const restored = createSaveStore(storage, migrateSave);
  for (const [id, life] of lives.entries()) {
    assert.deepEqual(restored.read(id), life, `slot ${id} retains its entire simulation`);
    assert.deepEqual(restored.read(id).event, life.event);
    assert.deepEqual(restored.read(id).battle, life.battle);
    assert.deepEqual(restored.read(id).timeline.journey, life.timeline.journey);
    assert.ok(Number.isFinite(Date.parse(restored.list()[id].updatedAt)));
  }
  assert.equal(restored.active(), 2);
  assert.deepEqual(JSON.parse(storage.getItem(LEGACY_SAVE_KEY)), lives[2], 'the compatibility key mirrors only the active life');
});

test('legacy saves recover from absent, malformed and incompatible slot envelopes without a write', () => {
  for (const envelope of [undefined, '{bad json', JSON.stringify({ version: 99, slots: [] }), JSON.stringify({ version: 1, slots: 'bad shape' })]) {
    const initial = { [LEGACY_SAVE_KEY]: JSON.stringify(legacy.pendingProject) };
    if (envelope !== undefined) initial[slotsKey] = envelope;
    const storage = memoryStorage(initial);
    const store = createSaveStore(storage, migrateSave);
    const expected = migrateSave(legacy.pendingProject);
    assert.deepEqual(store.read(0), expected, `fallback for ${envelope ?? 'missing slots'}`);
    assert.deepEqual(store.read(0).event, expected.event);
    assert.deepEqual(store.read(0).workshop.project, expected.workshop.project);
    assert.equal(store.empty(), 1);
    assert.deepEqual(storage.writes, [], 'loading or migrating never replaces persisted data');
    assert.equal(storage.getItem(LEGACY_SAVE_KEY), initial[LEGACY_SAVE_KEY]);
  }
});

test('invalid slot entries and illegal writes cannot displace a valid neighboring life', () => {
  const life = createBirthGame({ name: 'Keep Me', seed: 'safe-neighbor' });
  const storage = memoryStorage({ [slotsKey]: JSON.stringify({ version: 1, activeSlot: 99, slots: [{ id: 0, state: { version: 1 } }, { id: 1, state: life, updatedAt: '2026-10-11T00:00:00.000Z' }] }) });
  const store = createSaveStore(storage, migrateSave);
  assert.equal(store.read(0), null);
  assert.deepEqual(store.read(1), life);
  assert.equal(store.active(), 0);
  assert.equal(store.select(1), true);
  const before = store.list();
  assert.equal(store.write(1, { version: 1 }), false);
  for (const id of [-1, 3, 'invalid']) {
    assert.equal(store.select(id), false);
    assert.equal(store.write(id, life), false);
  }
  assert.deepEqual(store.list(), before);
  assert.equal(store.active(), 1);
  assert.deepEqual(storage.writes, []);
});

test('read and list return detached snapshots and selection spends no time or writes', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage, migrateSave);
  const original = createBirthGame({ name: 'Rowan', seed: 'copy-of-a-life' });
  assert.equal(store.write(0, original), true);
  const persisted = store.read(0), writeCount = storage.writes.length;
  original.hero.name = 'Changed source';
  const read = store.read(0), list = store.list();
  read.hero.name = 'Changed read';
  list[0].state.event.choices[0].label = 'Changed list';
  list[0].state.world.locations.length = 0;
  assert.deepEqual(store.read(0), persisted);
  assert.equal(store.select(2), true);
  assert.equal(store.select(0), true);
  assert.deepEqual(store.read(0), persisted);
  assert.equal(storage.writes.length, writeCount);
});

test('failed persistence keeps the current playable session and earlier durable snapshots safe', () => {
  const storage = memoryStorage();
  const store = createSaveStore(storage, migrateSave);
  const first = createBirthGame({ seed: 'storage-limit-life' });
  assert.equal(store.write(0, first), true);
  const slotsBefore = storage.getItem(slotsKey), mirrorBefore = storage.getItem(LEGACY_SAVE_KEY);
  const progressed = chooseEventOption(first, first.event.choices[0].id);
  assert.ok(validateSave(progressed));
  storage.failWrites = true;
  assert.equal(store.write(0, progressed), false);
  assert.equal(store.available(), false);
  assert.deepEqual(store.read(0), progressed, 'current session remains exportable and playable');
  assert.equal(storage.getItem(slotsKey), slotsBefore);
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), mirrorBefore);
  storage.failWrites = false;
  assert.equal(store.write(0, progressed), true);
  assert.equal(store.available(), true);
  assert.deepEqual(createSaveStore(storage, migrateSave).read(0), progressed);
});

test('an unavailable storage surface still preserves the complete life for session export', () => {
  const store = createSaveStore(null, migrateSave);
  const life = createBirthGame({ seed: 'private-session' });
  assert.equal(store.write(0, life), false);
  assert.equal(store.available(), false);
  assert.deepEqual(store.read(0), life);
  assert.equal(store.empty(), 1);
});
