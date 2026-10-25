import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {createLifeEntry, LIFE_ENTRY_REFUSED, LIFE_ENTRY_CANCELLED} from '../dist/js/life-entry.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {rulesOf, NEW} from '../dist/js/edition.js';
import {mountApp} from './helpers/ui-surface.mjs';

const KEY = 'hearth-and-oath:slots:v1';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const old = release('0600'), debtOnly = release('0610'), newer = release('0690');
const newOnly = state => rulesOf(state) === NEW;
function envelope() {
  return {version: 1, activeSlot: 1, slots: [old.eighteen, newer.eighteen, null].map((state, id) => ({id, state, updatedAt: null})),
    backups: {1: {state: old.birth, updatedAt: null}}};
}
function disk() {
  const values = new Map([[KEY, JSON.stringify(envelope())], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]);
  return {values, writes: 0, getItem: key => values.get(key) ?? null,
    setItem(key, value) {this.writes++; values.set(key, String(value));}, removeItem(key) {this.writes++; values.delete(key);}};
}
const bytes = storage => [...storage.values];
const view = store => ({lives: store.list(), backup: store.backup(1), tokens: [0, 1, 2].map(id => store.reviewToken(id)), active: store.active(), unsaved: store.hasUnsaved()});
function locks() {
  let pending = Promise.resolve(), active = 0, sequence = 0;
  return {
    get active() {return active;},
    request(name, {mode}, consume) {
      const next = pending.then(async () => {active = ++sequence; try {return await consume({name, mode});} finally {active = 0;}});
      pending = next.catch(() => {}); return next;
    },
    async hold() {
      let unlock, entered; const begun = new Promise(resolve => {entered = resolve;}), barrier = new Promise(resolve => {unlock = resolve;});
      const done = this.request('hearth-and-oath:save:v1', {mode: 'exclusive'}, () => {entered(); return barrier;});
      await begun; return {unlock, done};
    },
  };
}

test('entry refusal leaves genuine old slots and backups readable without queueing a replacement', () => {
  const storage = disk(), store = createSaveStore(storage, migrateSave), initial = bytes(storage), before = view(store);
  let queued = 0;
  const entry = createLifeEntry({store, coordinate: operation => {queued++; return operation();}, acceptPosition: newOnly});
  assert.equal(entry.canEnter(store.read(0)), false); assert.deepEqual(store.read(0), migrateSave(old.eighteen));
  assert.equal(entry.replaceReviewed({state: store.backup(1), slot: 1, token: store.reviewToken(1), isCurrent: () => true}), LIFE_ENTRY_REFUSED);
  assert.equal(queued, 0); assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial); assert.equal(storage.writes, 0);
});

test('a queued ordinary import rechecks admission inside the save lock before replacement', async () => {
  const storage = disk(), store = createSaveStore(storage, migrateSave), manager = locks(), coordinate = createSaveCoordinator(manager);
  const held = await manager.hold(); let allowed = true; const observations = [];
  const entry = createLifeEntry({store, coordinate, acceptPosition: () => {observations.push(manager.active); return allowed;}});
  const initial = bytes(storage), before = view(store);
  const result = entry.replaceReviewed({state: newer.eighteen, slot: 0, token: store.reviewToken(0), isCurrent: () => true});
  allowed = false; held.unlock(); await held.done;
  assert.equal(await result, LIFE_ENTRY_REFUSED); assert.equal(observations.length, 2);
  assert.ok(observations[1] > observations[0], 'the second check belongs to the queued save lock, after the held transaction');
  assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial); assert.equal(storage.writes, 0);
});

test('a dismissed review or altered incoming payload cancels a queued entry without adopting or persisting it', async () => {
  for (const alteration of ['dismiss', 'payload']) {
    const storage = disk(), store = createSaveStore(storage, migrateSave), manager = locks(), coordinate = createSaveCoordinator(manager), held = await manager.hold();
    const entry = createLifeEntry({store, coordinate}), incoming = structuredClone(debtOnly.eighteen), initial = bytes(storage), before = view(store); let current = true;
    const result = entry.replaceReviewed({state: incoming, slot: 0, token: store.reviewToken(0), isCurrent: () => current});
    if (alteration === 'dismiss') current = false; else incoming.hero.gold++;
    held.unlock(); await held.done; assert.equal(await result, LIFE_ENTRY_CANCELLED);
    assert.deepEqual(view(store), before); assert.deepEqual(bytes(storage), initial); assert.equal(storage.writes, 0);
  }
});

test('a genuine zero-debt life enters through reviewed replacement and keeps the previous whole life', async () => {
  const storage = disk(), store = createSaveStore(storage, migrateSave), coordinate = createSaveCoordinator(locks());
  const entry = createLifeEntry({store, coordinate, acceptPosition: newOnly}), incoming = structuredClone(debtOnly.eighteen), original = structuredClone(incoming);
  assert.equal(await entry.replaceReviewed({state: incoming, slot: 0, token: store.reviewToken(0), isCurrent: () => true}), true);
  const actual = store.read(0); assert.ok(validateSave(actual)); assert.deepEqual(actual, migrateSave(original));
  assert.equal(actual.hero.station, undefined); assert.equal(actual.householdBudget.debt, 0); assert.equal(actual.farm, undefined);
  assert.deepEqual(store.backup(0), migrateSave(old.eighteen)); assert.deepEqual(store.backup(1), migrateSave(old.birth));
  assert.deepEqual(incoming, original);
});

test('entry policy cannot bless a stale target token or change a captured import through its own snapshot', async () => {
  const storage = disk(), store = createSaveStore(storage, migrateSave), remote = createSaveStore(storage, migrateSave), token = store.reviewToken(0);
  assert.equal(remote.replace(0, newer.eighteen, {reviewed: true, token: remote.reviewToken(0)}), true); const durable = bytes(storage);
  const entry = createLifeEntry({store, coordinate: operation => operation(), acceptPosition: state => {state.hero.name = 'Changed snapshot'; return true;}});
  assert.equal(await entry.replaceReviewed({state: debtOnly.eighteen, slot: 0, token, isCurrent: () => true}), false);
  assert.deepEqual(bytes(storage), durable); assert.equal(store.conflict().reason, 'changed');
  assert.equal(store.reload(), true);
  assert.equal(await entry.replaceReviewed({state: debtOnly.eighteen, slot: 0, token: store.reviewToken(0), isCurrent: () => true}), true);
  assert.deepEqual(store.read(0), migrateSave(debtOnly.eighteen));
});

test('the default app imports the genuine debt-only life and preserves both neighboring rulebooks', async t => {
  const raw = envelope(), ui = await mountApp(t, {storageEntries: [[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]});
  await ui.import(JSON.stringify(debtOnly.eighteen)); await ui.click('confirm-import');
  assert.deepEqual(ui.current(), migrateSave(debtOnly.eighteen));
  // v0.72.1: the old neighbour and the old backup are kept exactly as stored; they are never decoded here.
  const text = JSON.stringify, lives = ui.lives();
  assert.ok(text(lives[0]) === text(old.eighteen) && text(lives[1]) === text(migrateSave(newer.eighteen)) && text(lives[2]) === text(migrateSave(debtOnly.eighteen)));
  assert.ok(text(JSON.parse(ui.storage.getItem(KEY)).backups[1].state) === text(old.birth));
});

test('the default app no longer brings an old backup back into play, and replaces no neighbouring life', async t => {
  const raw = envelope(), ui = await mountApp(t, {storageEntries: [[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]});
  await ui.click('title-continue'); await ui.click('menu');
  const before = ui.storage.getItem(KEY);
  await ui.click('restore-backup', 1);
  // v0.72: one rulebook. An old backup meets the archive's door, with its export; nothing is restored.
  assert.ok(ui.root.querySelector('[data-archive-door]'));
  assert.equal(ui.root.querySelector('[data-op="confirm-import"]'), null);
  assert.equal(ui.storage.getItem(KEY), before, 'nothing durable moves');
  assert.equal(rulesOf(ui.current()), NEW, 'the life in play is still the new-rules one');
});
