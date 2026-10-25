import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSaveStore, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {rulesOf, OLD, NEW} from '../dist/js/edition.js';
import {mountApp} from './helpers/ui-surface.mjs';

const KEY = 'hearth-and-oath:slots:v1';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const older = release('0600'), newer = release('0690');
function envelope() {
  return {version: 1, activeSlot: 1,
    slots: [older.eighteen, newer.eighteen, older.later].map((state, id) => ({id, state, updatedAt: null})),
    backups: {1: {state: older.birth, updatedAt: null}}};
}
function memory(raw) {
  const values = new Map([[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]);
  return {values, writes: 0, getItem: key => values.get(key) ?? null,
    setItem(key, value) {this.writes++; values.set(key, String(value));}, removeItem(key) {this.writes++; values.delete(key);}};
}

// Cutover regression: migration is also the slot decoder. Rejecting an old
// life there must never turn its occupied slot or recoverable backup into an
// apparent empty place for a new character.
test('mixed old/new durable slots and old backups remain complete and occupied across read and reload', () => {
  const raw = envelope(), storage = memory(raw), bytes = [...storage.values], original = structuredClone(raw);
  const store = createSaveStore(storage, migrateSave);
  for (let pass = 0; pass < 2; pass++) {
    assert.equal(store.active(), 1); assert.equal(store.empty(), null);
    for (const [id, slot] of raw.slots.entries()) {
      const state = store.read(id); assert.ok(state && validateSave(state), `slot ${id} remains a valid whole life`);
      assert.deepEqual(state, migrateSave(slot.state));
      assert.equal(rulesOf(state), id === 1 ? NEW : OLD);
      assert.equal(store.health(id).hasDurableState, true);
    }
    assert.deepEqual(store.backup(1), migrateSave(older.birth), 'the new life retains its actual older previous-life backup');
    assert.equal(rulesOf(store.backup(1)), OLD);
    assert.equal(store.reload(), true);
  }
  assert.equal(storage.writes, 0); assert.deepEqual([...storage.values], bytes); assert.deepEqual(raw, original);
});

test('old slots stay exportable beside a new life through the actual app, without changing durable saves', async t => {
  const raw = envelope(), ui = await mountApp(t, {storageEntries: [[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]});
  const durable = ui.storage.getItem(KEY), mirror = ui.storage.getItem(LEGACY_SAVE_KEY), blobs = [], anchors = [];
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => {blobs.push(blob); return 'blob:retention-check';}; URL.revokeObjectURL = () => {};
  t.after(() => {URL.createObjectURL = create; URL.revokeObjectURL = revoke;});
  ui.document.createElement = () => {const anchor = {click() {}}; anchors.push(anchor); return anchor;};
  await ui.click('title-load');
  for (const id of [0, 2]) {
    const row = ui.root.querySelector(`[data-op="slot-load"][data-id="${id}"]`)?.closest('.save-slot-row');
    assert.ok(row?.querySelector('[data-rules="old"]'), `old slot ${id} is visibly occupied`);
    // v0.72.1: an old life is kept undecoded, so its export is the life exactly as stored.
    await ui.fire('click', row.querySelector('[data-archive-note] [data-op="export-kept"]'));
    assert.ok(JSON.stringify(JSON.parse(await blobs.at(-1).text())) === JSON.stringify(raw.slots[id].state), 'the downloaded payload is the entire historical life, as stored');
    assert.match(anchors.at(-1).download, /-old-rules\.json$/);
  }
  assert.equal(blobs.length, 2); assert.equal(ui.storage.getItem(KEY), durable); assert.equal(ui.storage.getItem(LEGACY_SAVE_KEY), mirror);
});

test('reviewing and cancelling an old backup in a new-life slot preserves both generations', async t => {
  const raw = envelope(), ui = await mountApp(t, {storageEntries: [[KEY, JSON.stringify(raw)], [LEGACY_SAVE_KEY, JSON.stringify(newer.eighteen)]]});
  await ui.click('title-continue'); await ui.click('menu');
  // Resuming may persist the new life's ordinary migration. The review and
  // cancellation must preserve that actual resumed position, too.
  const durable = ui.storage.getItem(KEY), mirror = ui.storage.getItem(LEGACY_SAVE_KEY);
  // v0.72.1: the old neighbours and the old backup are kept exactly as stored, never decoded or migrated here.
  for (const id of [0, 2]) assert.ok(JSON.stringify(JSON.parse(durable).slots[id].state) === JSON.stringify(raw.slots[id].state), 'resuming the new life keeps its old neighbours as stored');
  const backup = JSON.parse(durable).backups;
  assert.ok(JSON.stringify(backup[1].state) === JSON.stringify(raw.backups[1].state));
  const current = ui.current();
  await ui.click('restore-backup', 1);
  const review = ui.root.querySelector('.modal');
  assert.ok(review?.querySelector('[data-rules="old"]'));
  assert.match(review.textContent, new RegExp(older.birth.hero.name));
  // v0.72: one rulebook. The old backup cannot be brought back into play; it meets the door, which exports it whole.
  assert.equal(review.querySelector('[data-op="confirm-import"]'), null, 'no replacement into play is offered');
  assert.ok(review.querySelector('[data-archive-door]')); assert.ok(review.querySelector('[data-archive-link]'));
  const blobs = [], create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:old-backup'; }; URL.revokeObjectURL = () => {};
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  const anchors = []; ui.document.createElement = () => { const anchor = {click() {}}; anchors.push(anchor); return anchor; };
  await ui.click('export-pending');
  assert.equal(blobs.length, 1, 'the old backup is exported');
  assert.equal(JSON.stringify(JSON.parse(await blobs[0].text())), JSON.stringify(backup[1].state), 'whole, as kept');
  assert.match(anchors[0].download, /-old-rules\.json$/);
  assert.equal(ui.storage.getItem(KEY), durable); assert.equal(ui.storage.getItem(LEGACY_SAVE_KEY), mirror);
  assert.deepEqual(ui.current(), current);
  await ui.click('close-modal');
  assert.equal(ui.storage.getItem(KEY), durable); assert.equal(ui.storage.getItem(LEGACY_SAVE_KEY), mirror);
  assert.deepEqual(ui.current(), current); assert.deepEqual(JSON.parse(ui.storage.getItem(KEY)).backups, backup);
});
