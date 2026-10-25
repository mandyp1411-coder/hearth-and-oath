import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {createSaveStore, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {storedLifeDecoder} from '../dist/js/rulebook.js';
import {mountApp} from './helpers/ui-surface.mjs';

// A stored life this build cannot decode is kept exactly as written: never an
// empty slot, never dropped by another slot's save, replaced only by review,
// deleted only by review, exported whole. Two honest sources of such a life:
// a save written by a later build (an unknown revision) opened here, and since
// v0.72.1 every old-rules life: the main game's decoder reads only new-rules
// lives (rulebook.js `storedLifeDecoder`), so an old one is kept as stored.
const KEY = 'hearth-and-oath:slots:v1';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const older = release('0600'), newer = release('0690');
const flush = async () => { for (let i = 0; i < 8; i++) await nextTurn(); };
/** A life a later build wrote: the v0.69 engine's own save with a revision this build does not know. */
function fromLaterBuild(state) { const s = structuredClone(state); s.revision = 6; return s; }
const laterLife = fromLaterBuild(newer.eighteen);
const afterCutover = storedLifeDecoder(migrateSave); // the main game's decoder
const text = value => JSON.stringify(value);
function memory(raw, mirror) {
  const values = new Map([[KEY, text(raw)], [LEGACY_SAVE_KEY, text(mirror)]]);
  return {values, writes: 0, getItem: key => values.get(key) ?? null,
    setItem(key, value) { this.writes++; values.set(key, String(value)); }, removeItem(key) { this.writes++; values.delete(key); }};
}
const stored = storage => JSON.parse(storage.values.get(KEY));
function envelope(slots, backups = {}, activeSlot = 1) {
  return {version: 1, activeSlot, backups, slots: slots.map((state, id) => ({id, state, updatedAt: state ? `2026-10-1${id}T00:00:00.000Z` : null, revision: `kept-${id}`}))};
}

test('a later build’s life is kept in its slot exactly, and another slot’s save does not drop it', () => {
  assert.equal(migrateSave(structuredClone(laterLife)), null, 'this build cannot decode it');
  const v69 = migrateSave(newer.eighteen);
  const raw = envelope([laterLife, v69, null], {1: {state: fromLaterBuild(newer.birth), updatedAt: 'kept-backup'}});
  const storage = memory(raw, v69), store = createSaveStore(storage, migrateSave, {coordinate: null});
  assert.equal(store.read(0), null, 'it does not play here');
  assert.equal(text(store.kept(0)), text(laterLife), 'it is kept as written');
  assert.equal(text(store.keptBackup(1)), text(raw.backups[1].state), 'so is the kept backup');
  assert.equal(store.empty(), 2, 'its slot is not offered as empty');
  assert.equal(store.list()[0].kept !== undefined, true);
  assert.equal(store.health(0).hasDurableState, true); assert.equal(store.health(0).status, 'saved'); assert.equal(store.health(0).kept, true);
  const next = migrateSave(newer.eighteen); next.hero.gold += 3;
  assert.equal(store.write(1, next), true, 'the playable life saves');
  const after = stored(storage);
  assert.equal(text(after.slots[0].state), text(laterLife), 'the kept life is written back byte for byte');
  assert.equal(after.slots[0].revision, 'kept-0', 'and its revision is its own');
  assert.equal(text(after.backups[1].state), text(raw.backups[1].state), 'the kept backup survives');
  assert.equal(after.slots[1].state.hero.gold, next.hero.gold);
  assert.equal(store.write(0, migrateSave(newer.later)), false, 'a live position never writes over it');
  assert.equal(text(stored(storage).slots[0].state), text(laterLife));
});

test('a kept life is replaced only by review, and then it is the slot’s backup; deletion needs review too', () => {
  const v69 = migrateSave(newer.eighteen), storage = memory(envelope([laterLife, v69, null]), v69);
  const store = createSaveStore(storage, migrateSave, {coordinate: null}), incoming = migrateSave(newer.later);
  assert.equal(store.replace(0, incoming), false, 'an unreviewed replacement is refused');
  assert.equal(text(stored(storage).slots[0].state), text(laterLife));
  assert.equal(store.replace(0, incoming, {reviewed: true, token: store.reviewToken(0)}), true);
  const after = stored(storage);
  assert.equal(text(after.backups[0].state), text(laterLife), 'the replaced kept life becomes the backup, exactly');
  assert.equal(text(store.keptBackup(0)), text(laterLife));
  assert.equal(after.slots[0].state.hero.name, incoming.hero.name);
  // Deletion: a fresh store over a kept slot.
  const second = memory(envelope([laterLife, v69, null]), v69), other = createSaveStore(second, migrateSave, {coordinate: null});
  assert.equal(other.remove(0, {reviewed: true, token: 'wrong'}), false);
  assert.ok(other.deletionToken(0), 'a kept life can be reviewed for deletion');
  assert.equal(other.remove(0, {reviewed: true, token: other.deletionToken(0)}), true);
  assert.equal(stored(second).slots[0].state, null, 'the reviewed delete removes it');
  assert.equal(text(stored(second).slots[1].state), text(v69));
});

test('under the cutover’s decoder, the genuine v0.60 lives stay occupied and survive every other save', () => {
  const v69 = migrateSave(newer.eighteen);
  const raw = envelope([older.eighteen, v69, older.later], {1: {state: older.birth, updatedAt: null}});
  const storage = memory(raw, v69), store = createSaveStore(storage, afterCutover, {coordinate: null});
  for (const id of [0, 2]) { assert.equal(store.read(id), null); assert.equal(text(store.kept(id)), text(raw.slots[id].state), `old slot ${id} is kept`); }
  assert.equal(text(store.keptBackup(1)), text(older.birth));
  assert.equal(store.empty(), null, 'no slot is free: all three are someone’s');
  const next = migrateSave(newer.eighteen); next.day += 1;
  assert.equal(store.write(1, next), true);
  const after = stored(storage);
  for (const id of [0, 2]) assert.equal(text(after.slots[id].state), text(raw.slots[id].state), `old slot ${id} survives the save`);
  assert.equal(text(after.backups[1].state), text(older.birth), 'the old backup survives the save');
  assert.equal(store.replace(0, migrateSave(newer.later)), false, 'an old slot is not taken without review');
  assert.equal(store.reload(), true); assert.equal(text(store.kept(0)), text(older.eighteen), 'and a reload still keeps it');
});

test('an envelope of nothing but kept lives stays the envelope: it is not mistaken for unreadable and replaced by the mirror', () => {
  const raw = envelope([older.eighteen, null, older.later], {}, 0), storage = memory(raw, migrateSave(newer.eighteen));
  const store = createSaveStore(storage, afterCutover, {coordinate: null});
  assert.equal(text(store.kept(0)), text(older.eighteen)); assert.equal(text(store.kept(2)), text(older.later));
  assert.equal(store.read(0), null, 'the mirror is not adopted into slot 0');
  assert.equal(store.empty(), 1);
  const fresh = migrateSave(newer.eighteen);
  assert.equal(store.replace(1, fresh, {reviewed: true, token: store.reviewToken(1)}), true, 'a new life takes the one empty slot');
  const after = stored(storage);
  assert.equal(text(after.slots[0].state), text(older.eighteen)); assert.equal(text(after.slots[2].state), text(older.later));
  assert.equal(after.slots[1].state.hero.name, fresh.hero.name);
});

test('something that is not a life is still read as nothing, as before', () => {
  const v69 = migrateSave(newer.eighteen);
  for (const junk of [42, 'a string', [1, 2], {hero: {}}, {hero: {name: '   '}}, {notALife: true}]) {
    const storage = memory(envelope([junk, v69, null]), v69), store = createSaveStore(storage, migrateSave, {coordinate: null});
    assert.equal(store.kept(0), null, JSON.stringify(junk)); assert.equal(store.read(0), null); assert.equal(store.empty(), 0);
  }
});

function downloads(t, ui) {
  const blobs = [], anchors = [], create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:kept-life'; }; URL.revokeObjectURL = () => {};
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  ui.document.createElement = () => { const anchor = {click() {}}; anchors.push(anchor); return anchor; };
  return {blobs, anchors};
}
const row = (ui, id) => ui.root.querySelector(`.save-slot[data-id="${id}"]`)?.closest('.save-slot-row');

test('in the app, a later build’s life shows as kept, exports whole, opens nothing, and leaves only by review', async t => {
  const v69 = migrateSave(newer.eighteen), raw = envelope([laterLife, v69, null]);
  const ui = await mountApp(t, {storageEntries: [[KEY, text(raw)], [LEGACY_SAVE_KEY, text(v69)]]}), files = downloads(t, ui);
  assert.match(ui.root.querySelector('[data-op="title-load"]').textContent, /2 of 3 slots occupied · 1 kept for the archive/);
  assert.ok(ui.root.querySelector('[data-op="title-continue"][data-id="1"]'), 'the playable life continues');
  await ui.click('title-load');
  const kept = row(ui, 0);
  assert.ok(ui.root.querySelector('.save-slot-row[data-kept-life] .save-slot[data-id="0"]'), 'the row is marked as a kept life');
  assert.equal(kept.querySelector('[data-op="slot-load"]').disabled, true);
  assert.match(kept.textContent, new RegExp(laterLife.hero.name)); assert.match(kept.textContent, /Kept as it was written/);
  assert.match(kept.querySelector('[data-archive-note]').textContent, /could not be read here/);
  assert.equal(kept.querySelector('[data-archive-link]'), null, 'a new-rules life is not sent to the archive');
  await ui.click('export-kept', 0);
  assert.equal(text(JSON.parse(await files.blobs[0].text())), text(laterLife), 'the export is the life exactly as stored');
  assert.match(files.anchors[0].download, /-new-rules\.json$/);
  assert.equal(ui.root.querySelector('.game-frame'), null);
  await ui.click('slot-delete', 0);
  assert.match(ui.root.innerHTML, new RegExp(laterLife.hero.name), 'the delete review names it');
  await ui.click('confirm-delete-life'); await flush();
  assert.equal(JSON.parse(ui.storage.getItem(KEY)).slots[0].state, null, 'reviewed, it is deleted');
  assert.equal(text(JSON.parse(ui.storage.getItem(KEY)).slots[1].state), text(v69));
});

test('in the app, a new life asks before it takes a kept life’s slot, and the title shows a kept life when it is the only one', async t => {
  const ui = await mountApp(t, {storageEntries: [[KEY, text(envelope([laterLife, null, null], {}, 0))], [LEGACY_SAVE_KEY, text(laterLife)]]});
  const card = ui.root.querySelector('.title-life-kept');
  assert.ok(card, 'the only life is shown, kept'); assert.match(card.textContent, /Kept as it was written/);
  assert.equal(ui.root.querySelector('[data-op="title-continue"]'), null);
  await ui.click('title-new');
  await ui.click('slot-new', 0);
  assert.match(ui.root.innerHTML, /REPLACE A SAVED LIFE/); assert.match(ui.root.innerHTML, new RegExp(`Replace ${laterLife.hero.name}`));
  await ui.click('close-modal');
  assert.equal(text(JSON.parse(ui.storage.getItem(KEY)).slots[0].state), text(laterLife), 'kept while the player decides');
});
