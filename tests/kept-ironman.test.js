import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {storedLifeDecoder, NEW_ONLY, BOTH} from '../dist/js/rulebook.js';
import {rulesOf, OLD, NEW} from '../dist/js/edition.js';
import {createIronmanMetadata} from '../dist/js/ironman.js';
import {ironmanRecordKey} from '../dist/js/ironman-storage.js';
import {fakeSurface, mountApp} from './helpers/ui-surface.mjs';

// v0.72.1: the main game reads a stored life only when it lives by the new
// rules (rulebook.js `storedLifeDecoder`); an old life is kept as it was
// written. An Ironman record is its own key, so a kept run needs its own path:
// it must not make run discovery fail, it holds its slot, it exports whole,
// and it is released or deleted only by review. Genuine v0.60 and v0.69 saves.
const KEY = 'hearth-and-oath:slots:v1';
const OLD_RUN = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', NEW_RUN = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const older = release('0600'), newer = release('0690');
const flush = async () => { for (let i = 0; i < 8; i++) await nextTurn(); };
const decode = storedLifeDecoder(NEW_ONLY, migrateSave);
function locks() {
  let serial = Promise.resolve();
  return {request(name, options, callback) { const result = serial.then(() => callback({name, mode: 'exclusive'})); serial = result.catch(() => {}); return result; }};
}
const ids = () => { let n = 0; return {randomUUID: () => `11112222-3333-4444-8555-${(++n).toString(16).padStart(12, '0')}`}; };
function run(source, runId) {
  const state = migrateSave(source);
  state.ironman = createIronmanMetadata(state, {randomUUID: () => runId});
  assert.ok(validateSave(state));
  return state;
}
function envelope(states, activeSlot = 0) {
  return {version: 1, activeSlot, backups: {},
    slots: [0, 1, 2].map(id => ({id, state: states[id] || null, updatedAt: states[id] ? `2026-10-2${id}T00:00:00.000Z` : null, revision: `run-${id}`}))};
}
/** An old run put in slot 0 by a store that still admitted both rulebooks, as v0.72.0 and earlier did. */
async function seeded({others = [null, null, migrateSave(newer.eighteen)], activeSlot = 2} = {}) {
  const surface = fakeSurface(), manager = locks(), state = run(older.eighteen, OLD_RUN);
  surface.storage.setItem(KEY, JSON.stringify(envelope(others, activeSlot)));
  const before = createSaveStore(surface.storage, migrateSave, {coordinate: createSaveCoordinator(manager), crypto: ids()});
  const review = await before.inspectIronman(state, {intent: 'import', slot: 0}); assert.equal(review.status, 'review');
  const committed = await before.commitIronman(0, state, {intent: 'import', token: review.token}); assert.equal(committed.status, 'committed');
  return {surface, manager, state, head: surface.storage.getItem(ironmanRecordKey(OLD_RUN))};
}
const now = ({surface, manager}) => createSaveStore(surface.storage, decode, {coordinate: createSaveCoordinator(manager), crypto: ids(), acceptPosition: s => rulesOf(s) === NEW});
const same = (a, b, label) => assert.ok(JSON.stringify(a) === JSON.stringify(b), label);

test('the decoder reads only new-rules lives, by their own stored markers', () => {
  assert.equal(decode(older.eighteen), null, 'an old life is not decoded');
  assert.equal(rulesOf(decode(newer.eighteen)), NEW);
  const v61 = release('0610').eighteen; assert.equal(rulesOf(decode(v61)), NEW, 'a v0.61 debt-only life is read');
  assert.equal(storedLifeDecoder(BOTH, migrateSave)(older.eighteen)?.edition?.rules, OLD, 'the harness still decodes both');
});

test('a kept old run does not stop run discovery: it holds its slot, and a new run can still be begun', async () => {
  const seed = await seeded(), store = now(seed);
  const rows = store.list();
  assert.equal(rows[0].state, null, 'the old run is not read');
  same(rows[0].kept, seed.state, 'it is kept whole');
  assert.equal(rows[0].ironman, true);
  same(store.kept(0), seed.state, 'its slot names it');
  assert.equal(store.read(0), null);
  assert.equal(store.health(0).kept, true); assert.equal(store.health(0).hasDurableState, true);
  assert.equal(store.empty(), 1, 'the kept slot is not empty');
  const listed = await store.listRecoverableIronman(); assert.equal(listed.status, 'ready'); assert.deepEqual(listed.runs, []);
  // Another run is begun beside it, in an empty slot.
  const fresh = run(newer.eighteen, NEW_RUN);
  const review = await store.inspectIronman(fresh, {intent: 'import', slot: 1}); assert.equal(review.status, 'review');
  assert.equal((await store.commitIronman(1, fresh, {intent: 'import', token: review.token})).status, 'committed');
  assert.equal(store.list()[1].ironman, true); same(store.read(1), fresh, 'the new run plays');
  assert.equal(seed.surface.storage.getItem(ironmanRecordKey(OLD_RUN)), seed.head, 'the kept record is untouched');
});

test('a kept run is never opened, reattached, imported over, begun again or written over', async () => {
  const seed = await seeded(), store = now(seed);
  for (const intent of ['resume', 'reattach', 'import', 'create']) {
    const result = await store.inspectIronman(intent === 'import' || intent === 'create' ? seed.state : OLD_RUN, {intent, slot: 0, consume: () => assert.fail('nothing is consumed')});
    assert.equal(result.reason, 'kept-position', intent);
  }
  assert.equal((await store.reattachIronman(OLD_RUN, 1, {reviewed: true, token: 'x'})).reason, 'kept-position');
  // The slot is protected from an ordinary life, and from a new run.
  assert.equal(store.write(0, migrateSave(newer.eighteen)), false);
  assert.equal(store.replace(0, migrateSave(newer.eighteen), {reviewed: true, token: store.reviewToken(0)}), false);
  const fresh = run(newer.eighteen, NEW_RUN);
  assert.equal((await store.inspectIronman(fresh, {intent: 'import', slot: 0})).reason, 'ironman-slot-occupied');
  assert.equal(seed.surface.storage.getItem(ironmanRecordKey(OLD_RUN)), seed.head);
});

test('a kept run exports its head whole, from its slot, without anything being written', async () => {
  const seed = await seeded(), store = now(seed), before = [...seed.surface.values];
  let exported = null;
  const result = await store.inspectIronman(OLD_RUN, {intent: 'export', slot: 0, consume: (head, authority) => { exported = head; return authority.slot; }});
  assert.equal(result.status, 'ready'); assert.equal(result.value, 0);
  same(exported, JSON.parse(seed.head).state, 'the authoritative head');
  assert.equal((await store.inspectIronman(OLD_RUN, {intent: 'export', slot: 1, consume: () => true})).reason, 'orphaned-position', 'only from the slot it holds');
  same([...seed.surface.values], before, 'nothing durable changed');
});

test('released by review, the kept run frees its slot and stays whole among the retained runs; deleted by review, it is gone', async () => {
  const seed = await seeded(), store = now(seed);
  let token = null;
  await store.inspectIronman(OLD_RUN, {intent: 'export', slot: 0, consume: (head, authority) => { token = authority.token; }});
  assert.equal((await store.archiveIronman(OLD_RUN, {reviewed: true, token: 'stale'})).reason, 'stale-run-revision');
  const released = await store.archiveIronman(OLD_RUN, {reviewed: true, token});
  assert.equal(released.status, 'archived');
  const record = JSON.parse(seed.surface.storage.getItem(ironmanRecordKey(OLD_RUN)));
  same(record.state, seed.state, 'the life is kept byte for byte'); assert.equal(record.attachment, null);
  assert.equal(store.list()[0].kept, undefined); assert.equal(store.empty(), 0, 'the slot is free');
  const listed = await store.listRecoverableIronman();
  assert.equal(listed.runs.length, 1); assert.equal(listed.runs[0].kept, true); assert.equal(listed.runs[0].name, seed.state.hero.name);
  let exported = null;
  assert.equal((await store.inspectIronman(OLD_RUN, {intent: 'export', slot: null, token: listed.runs[0].token, consume: head => { exported = head; }})).status, 'ready');
  same(exported, seed.state, 'still exported whole once released');
  assert.equal((await store.inspectIronman(OLD_RUN, {intent: 'reattach', slot: 0})).reason, 'kept-position');
  const deleted = await store.deleteIronman(OLD_RUN, {reviewed: true, token: listed.runs[0].token});
  assert.equal(deleted.status, 'deleted');
  assert.equal(JSON.parse(seed.surface.storage.getItem(ironmanRecordKey(OLD_RUN))).state, null);
  assert.deepEqual((await store.listRecoverableIronman()).runs, []);
});

test('a run whose life decodes to something else is still unreadable, as before: only a refused life is kept', async () => {
  const seed = await seeded({others: [null, null, null], activeSlot: 0});
  const changing = value => rulesOf(value) === OLD ? {...migrateSave(value), seed: 'different'} : migrateSave(value);
  const store = createSaveStore(seed.surface.storage, changing, {coordinate: createSaveCoordinator(seed.manager), crypto: ids()});
  assert.equal((await store.listRecoverableIronman()).reason, 'unreadable-run-record');
});

test('an old life known only from the mirror is kept in the first slot and written into it by the next save', () => {
  const surface = fakeSurface(), mirror = JSON.stringify(older.eighteen);
  surface.storage.setItem(LEGACY_SAVE_KEY, mirror);
  const store = createSaveStore(surface.storage, decode, {coordinate: null});
  assert.equal(store.read(0), null);
  same(store.kept(0), older.eighteen, 'kept as the mirror held it');
  assert.equal(store.empty(), 1);
  assert.equal(store.write(1, migrateSave(newer.eighteen)), true);
  const written = JSON.parse(surface.storage.getItem(KEY));
  assert.equal(JSON.stringify(written.slots[0].state), JSON.stringify(older.eighteen), 'the old life is in its slot, byte for byte');
});

// Through the actual app.
function downloads(t, ui) {
  const blobs = [], anchors = [], create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:kept-ironman'; }; URL.revokeObjectURL = () => {};
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  ui.document.createElement = () => { const anchor = {click() {}}; anchors.push(anchor); return anchor; };
  return {blobs, anchors};
}
const row = (ui, id) => ui.root.querySelector(`.save-slot[data-id="${id}"]`)?.closest('.save-slot-row');

test('in the app, a kept run holds its slot, exports for the archive, and is released only by review', async t => {
  const seed = await seeded();
  const ui = await mountApp(t, {storageEntries: [...seed.surface.values], locks: seed.manager}); await flush();
  const files = downloads(t, ui), head = JSON.parse(seed.head).state;
  assert.equal(ui.root.querySelector('[data-op="title-continue"][data-id="0"]'), null, 'the run is not offered to continue');
  await ui.click('title-load');
  const kept = row(ui, 0);
  assert.ok(kept.querySelector('[data-op="export-kept"]'), 'the row exports the kept run');
  assert.match(kept.textContent, /Kept for the archive/); assert.match(kept.textContent, /Ironman/);
  assert.equal(kept.querySelector('[data-op="slot-load"]').disabled, true);
  assert.equal(kept.querySelector('[data-op="slot-delete"]'), null, 'a run is released or deleted through its review, not the ordinary delete');
  await ui.fire('click', kept.querySelector('.slot-row-actions [data-op="export-kept"]')); await flush();
  assert.equal(files.blobs.length, 1);
  same(JSON.parse(await files.blobs[0].text()), head, 'the head, whole');
  assert.match(files.anchors[0].download, /-old-rules\.json$/);

  await ui.fire('click', kept.querySelector('[data-op="ironman-review"]')); await flush();
  assert.match(ui.root.innerHTML, /KEPT FOR THE ARCHIVE/);
  assert.match(ui.root.innerHTML, /never opened; export it and open it in the archive/);
  assert.ok(ui.root.querySelector('[data-archive-link]'), 'the way to the archive');
  await ui.click('ironman-export-kept', OLD_RUN); await flush();
  assert.equal(files.blobs.length, 2); same(JSON.parse(await files.blobs[1].text()), head, 'exported from its review too');
  assert.equal(ui.storage.getItem(ironmanRecordKey(OLD_RUN)), seed.head, 'nothing written yet');

  await ui.click('ironman-archive'); for (let i = 0; i < 4; i++) await flush();
  const record = JSON.parse(ui.storage.getItem(ironmanRecordKey(OLD_RUN)));
  assert.equal(record.attachment, null, 'the slot is released');
  same(record.state, seed.state, 'and the run is kept whole');
  assert.equal(record.state.hero.name, seed.state.hero.name);
  await ui.click('title-menu'); await ui.click('title-load');
  assert.equal(row(ui, 0).querySelector('[data-op="export-kept"]'), null, 'the slot is free');
  await ui.click('ironman-recoveries'); await flush();
  assert.ok(ui.root.querySelector('[data-kept-run]'), 'the released run is among the retained positions');
  assert.match(ui.root.innerHTML, /Kept, not played here/);
  await ui.click('ironman-review', OLD_RUN); await flush();
  assert.match(ui.root.innerHTML, /KEPT FOR THE ARCHIVE/);
  assert.equal(ui.root.querySelector('[data-op="ironman-archive"]'), null, 'released already');
  await ui.click('ironman-export-kept', OLD_RUN); await flush();
  assert.equal(files.blobs.length, 3); same(JSON.parse(await files.blobs[2].text()), seed.state, 'still exported whole');
  assert.equal(ui.root.querySelector('.game-frame'), null, 'nothing was opened');
});

test('in the app, an old backup kept undecoded is named, meets its door and exports exactly as stored', async t => {
  const surface = fakeSurface();
  const backups = {0: {state: older.eighteen, updatedAt: '2026-10-01T00:00:00.000Z'}};
  surface.storage.setItem(KEY, JSON.stringify({...envelope([migrateSave(newer.eighteen)], 0), backups}));
  const ui = await mountApp(t, {storageEntries: [...surface.values]}); await flush();
  const files = downloads(t, ui);
  await ui.click('title-load'); await ui.click('slot-delete', 0);
  assert.match(ui.root.innerHTML, /The recovery backup in this slot will be removed too/, 'the kept backup is named');
  await ui.click('close-modal'); await ui.click('title-menu');
  await ui.click('title-continue', 0); await ui.click('menu');
  await ui.click('restore-backup', 0);
  assert.match(ui.root.innerHTML, /cannot be brought back here; export it and open it in the archive/);
  assert.equal(ui.root.querySelector('.modal [data-op="confirm-import"]'), null, 'no replacement into play is offered');
  await ui.click('export-pending');
  same(JSON.parse(await files.blobs[0].text()), older.eighteen, 'the old backup, exactly as stored');
});
