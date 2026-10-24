import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {migrateSave, validateSave} from '../dist/js/engine.js';
import {rulesOf, OLD, NEW, OLD_RULES_DOOR} from '../dist/js/edition.js';
import {admissionPolicy, admittedRulebooks, MAIN_ADMITS, BOTH, NEW_ONLY} from '../dist/js/rulebook.js';
import {ARCHIVE_URL} from '../dist/js/archive-link.js';
import {createIronmanMetadata} from '../dist/js/ironman.js';
import {ironmanRecordKey} from '../dist/js/ironman-storage.js';
import {fakeSurface, mountApp} from './helpers/ui-surface.mjs';

// The door an old-rules life meets once the main game refuses it (Volume II,
// v0.72, step 3 of docs/one-rulebook-v072.md). The cutover is not taken:
// rulebook.js still admits both rulebooks, and the first test holds that.
// The rest mount the actual app with the cutover rehearsed and play genuine
// saves written by the v0.60 and v0.69 engines.
const KEY = 'hearth-and-oath:slots:v1', RUN = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url)))).states;
const older = release('0600'), newer = release('0690');
const flush = async () => { for (let i = 0; i < 8; i++) await nextTurn(); };
function envelope(states, activeSlot = 0) {
  return {version: 1, activeSlot, backups: {},
    slots: [0, 1, 2].map(id => ({id, state: states[id] || null, updatedAt: states[id] ? `2026-10-2${id}T00:00:00.000Z` : null, revision: `door-${id}`}))};
}
const entries = (states, activeSlot = 0) => [[KEY, JSON.stringify(envelope(states, activeSlot))], [LEGACY_SAVE_KEY, JSON.stringify(states[activeSlot] || states.find(Boolean))]];
function downloads(t, ui) {
  const blobs = [], anchors = [], create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { blobs.push(blob); return 'blob:old-life-door'; }; URL.revokeObjectURL = () => {};
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  ui.document.createElement = () => { const anchor = {click() {}}; anchors.push(anchor); return anchor; };
  return {blobs, anchors};
}
const row = (ui, id) => ui.root.querySelector(`.save-slot[data-id="${id}"]`)?.closest('.save-slot-row');
const durable = ui => [ui.storage.getItem(KEY), ui.storage.getItem(LEGACY_SAVE_KEY)];
/** Whole lives are compared as text: a failing deepEqual on two whole lives renders a diff large enough to exhaust memory. */
function sameLife(actual, expected, label) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) return;
  let at = 0; while (at < a.length && a[at] === b[at]) at++;
  assert.fail(`${label}: differs at character ${at} (${a.length} vs ${b.length}): …${a.slice(Math.max(0, at - 60), at + 60)}… / …${(b || '').slice(Math.max(0, at - 60), at + 60)}…`);
}
const playing = ui => ui.root.querySelector('.game-frame') !== null;

test('the rulebook still admits both; only a rehearsal refuses, and nothing widens it', () => {
  assert.equal(MAIN_ADMITS, BOTH, 'the cutover is not taken in this branch');
  assert.equal(admissionPolicy(), undefined, 'the live game admits every decoded life');
  assert.equal(admittedRulebooks({}), BOTH);
  assert.equal(admittedRulebooks({__hearthRehearseCutover: true}), NEW_ONLY);
  for (const value of ['true', 1, {}, 'both', 'old']) assert.equal(admittedRulebooks({__hearthRehearseCutover: value}), BOTH, `only literal true rehearses (${JSON.stringify(value)})`);
  const hostile = {get __hearthRehearseCutover() { throw Error('hostile'); }};
  assert.equal(admittedRulebooks(hostile), BOTH);
  const refuse = admissionPolicy(NEW_ONLY);
  for (const [name, raw] of Object.entries(older)) assert.equal(refuse(migrateSave(raw)), false, `v0.60 ${name} is old rules`);
  for (const [name, raw] of Object.entries(newer)) assert.equal(refuse(migrateSave(raw)), true, `v0.69 ${name} is new rules`);
  const v61 = release('0610').eighteen; assert.equal(v61.hero.station, undefined); assert.equal(refuse(migrateSave(v61)), true, 'a zero-debt ledger alone is the new rules');
  const claimed = migrateSave(older.eighteen); claimed.edition = {rules: NEW, began: null, step: claimed.edition.step};
  assert.equal(refuse(claimed), false, 'a claimed stamp alone admits nothing');
});

test('while both rulebooks play, an old slot returns and plays as it did', async t => {
  const ui = await mountApp(t, {storageEntries: entries([migrateSave(older.eighteen), migrateSave(newer.eighteen)], 0)});
  assert.ok(ui.root.querySelector('[data-op="title-continue"][data-id="0"]'), 'the old life is the one to continue');
  assert.equal(ui.root.querySelector('[data-refused-life]'), null);
  await ui.click('title-load');
  const old = row(ui, 0);
  assert.equal(old.querySelector('[data-op="slot-load"]').disabled, false);
  assert.match(old.querySelector('[data-archive-note]').textContent, /plays on here for now/);
  assert.equal(old.querySelector('[data-archive-note][data-refused-life]'), null, 'nothing is refused');
  await ui.click('slot-load', 0); await flush();
  assert.ok(playing(ui), 'the old life opens and plays here');
  assert.equal(rulesOf(ui.current()), OLD);
});

test('rehearsed cutover: the title continues the newest admitted life and counts the kept ones', async t => {
  const states = [migrateSave(older.eighteen), migrateSave(newer.eighteen), migrateSave(older.later)];
  const ui = await mountApp(t, {rehearseCutover: true, storageEntries: entries(states, 0)}), before = durable(ui);
  assert.equal(ui.root.querySelector('[data-op="title-continue"][data-id="0"]'), null, 'the active old life is not offered to continue');
  assert.ok(ui.root.querySelector('[data-op="title-continue"][data-id="1"]'), 'the admitted life is');
  assert.match(ui.root.querySelector('[data-op="title-load"]').textContent, /3 of 3 slots occupied · 2 kept for the archive/);
  assert.equal(ui.root.querySelector('.title-life-kept'), null, 'no kept card while a life can be continued');
  await ui.click('title-continue', 1); await flush();
  assert.ok(playing(ui)); assert.equal(rulesOf(ui.current()), NEW);
  sameLife(ui.current(), states[1], 'the admitted life is the one opened');
  const after = JSON.parse(ui.storage.getItem(KEY)).slots;
  for (const id of [0, 2]) sameLife(after[id].state, states[id], `kept slot ${id} is untouched`);
});

test('rehearsed cutover: with only old lives, the title shows the kept life, its export and the way to the archive', async t => {
  const states = [migrateSave(older.eighteen), null, migrateSave(older.later)];
  const ui = await mountApp(t, {rehearseCutover: true, storageEntries: entries(states, 2)}), files = downloads(t, ui), before = durable(ui);
  const card = ui.root.querySelector('.title-life-kept');
  assert.ok(card, 'the kept card is shown');
  assert.equal(ui.root.querySelector('[data-op="title-continue"]'), null, 'nothing offers to continue');
  assert.match(card.textContent, /Kept for the archive/); assert.match(card.textContent, new RegExp(states[2].hero.name));
  assert.match(card.textContent, /archive keeps them now/);
  assert.equal(card.querySelector('[data-archive-link]').getAttribute?.('href') ?? card.querySelector('[data-archive-link]').href, ARCHIVE_URL);
  assert.ok(ui.root.querySelector('[data-op="title-new"]'), 'a new life can still begin');
  await ui.fire('click', card.querySelector('[data-op="export-session"]'));
  assert.equal(files.blobs.length, 1);
  sameLife(JSON.parse(await files.blobs[0].text()), states[2], 'the whole life, as kept');
  assert.match(files.anchors[0].download, /-old-rules\.json$/);
  assert.ok(durable(ui).every((text, i) => text === before[i]), 'exporting changes nothing durable');
  assert.equal(playing(ui), false, 'nothing was opened');
});

test('rehearsed cutover: an old slot is kept, not loaded; its export and delete review remain', async t => {
  const states = [migrateSave(older.eighteen), migrateSave(newer.eighteen), null];
  const ui = await mountApp(t, {rehearseCutover: true, storageEntries: entries(states, 1)}), files = downloads(t, ui), before = durable(ui);
  await ui.click('title-load');
  const old = row(ui, 0), fresh = row(ui, 1), empty = row(ui, 2);
  const load = old.querySelector('[data-op="slot-load"]');
  assert.equal(load.disabled, true); assert.ok(old.querySelector('.save-slot[data-refused-life]'));
  assert.match(old.textContent, /Kept for the archive/); assert.match(old.textContent, /Old rules/);
  assert.match(old.querySelector('[data-archive-note][data-refused-life]').textContent, /Its place here is kept until you do/);
  assert.ok(old.querySelector('[data-op="slot-delete"]'), 'an explicit delete review is still the player’s');
  assert.equal(fresh.querySelector('[data-op="slot-load"]').disabled, false);
  assert.equal(empty.querySelector('[data-op="slot-load"]').disabled, true, 'an empty slot is empty; the old one is not');
  // A stale or forced click on the kept slot opens nothing and writes nothing.
  await ui.fire('click', load); await flush();
  assert.equal(playing(ui), false);
  assert.ok(durable(ui).every((text, i) => text === before[i]), 'the durable saves are unchanged');
  for (const control of [old.querySelector('[data-archive-note] [data-op="export-session"]'), old.querySelector('.slot-export')]) {
    await ui.fire('click', control);
    sameLife(JSON.parse(await files.blobs.at(-1).text()), states[0], 'the old slot’s export');
    assert.match(files.anchors.at(-1).download, /-old-rules\.json$/);
  }
  assert.ok(durable(ui).every((text, i) => text === before[i]), 'the durable saves are unchanged');
});

test('rehearsed cutover: an old file meets the archive’s door; a new one is reviewed as before', async t => {
  const ui = await mountApp(t, {rehearseCutover: true, storageEntries: entries([migrateSave(newer.eighteen)], 0)}), before = durable(ui);
  await ui.click('title-load');
  await ui.import(JSON.stringify(older.eighteen)); await flush();
  const door = ui.root.querySelector('[data-archive-door]');
  assert.ok(door, 'the door is shown'); assert.equal(door.textContent, OLD_RULES_DOOR);
  assert.equal(ui.root.querySelector('[data-op="confirm-import"]'), null, 'no slot is offered');
  assert.equal(ui.root.querySelector('[data-archive-link]').getAttribute?.('href') ?? ui.root.querySelector('[data-archive-link]').href, ARCHIVE_URL);
  assert.ok(durable(ui).every((text, i) => text === before[i]), 'the durable saves are unchanged');
  await ui.click('close-modal');
  await ui.import(JSON.stringify(newer.later)); await flush();
  assert.equal(ui.root.querySelector('[data-archive-door]'), null);
  assert.ok(ui.root.querySelector('[data-op="confirm-import"]'), 'a new-rules file is reviewed for a slot');
  assert.match(ui.root.innerHTML, /New rules, begun before v0\.70/);
});

// A kept Ironman run: genuine v0.60 life, opted in with metadata only, put in
// a slot by an actual store that admits it (as before the cutover).
function locks() {
  let serial = Promise.resolve();
  return {request(name, options, callback) { const result = serial.then(() => callback({name, mode: 'exclusive'})); serial = result.catch(() => {}); return result; }};
}
async function keptIronman() {
  const surface = fakeSurface(), manager = locks(), state = migrateSave(older.eighteen);
  state.ironman = createIronmanMetadata(state, {randomUUID: () => RUN});
  assert.ok(validateSave(state)); assert.equal(rulesOf(state), OLD);
  surface.storage.setItem(KEY, JSON.stringify(envelope([null, null, migrateSave(newer.eighteen)], 2)));
  let entropy = 0;
  const store = createSaveStore(surface.storage, migrateSave, {coordinate: createSaveCoordinator(manager), crypto: {randomUUID: () => `11112222-3333-4444-8555-${(++entropy).toString(16).padStart(12, '0')}`}});
  const review = await store.inspectIronman(state, {intent: 'import', slot: 0}); assert.equal(review.status, 'review');
  const committed = await store.commitIronman(0, state, {intent: 'import', token: review.token}); assert.equal(committed.status, 'committed');
  return {storageEntries: [...surface.values], manager, state};
}

test('rehearsed cutover: a kept Ironman run is exported from its head without being opened', async t => {
  const seed = await keptIronman();
  const ui = await mountApp(t, {rehearseCutover: true, storageEntries: seed.storageEntries, locks: seed.manager}); await flush();
  const files = downloads(t, ui), head = ui.storage.getItem(ironmanRecordKey(RUN)), before = durable(ui);
  assert.equal(ui.root.querySelector('[data-op="title-continue"][data-id="0"]'), null, 'the run is not offered to continue');
  await ui.click('title-load');
  const kept = row(ui, 0);
  assert.equal(kept.querySelector('[data-op="slot-load"]').disabled, true);
  assert.equal([...kept.querySelectorAll('[data-op="slot-load"]')].length, 1, 'no “Resume to export”');
  assert.ok(kept.querySelector('[data-archive-note][data-refused-life]'));
  await ui.fire('click', kept.querySelector('.slot-row-actions [data-op="export-session"]')); await flush();
  assert.equal(files.blobs.length, 1, 'the head is exported');
  const exported = JSON.parse(await files.blobs[0].text());
  sameLife(exported, JSON.parse(head).state, 'the authoritative head, whole');
  assert.equal(exported.ironman.runId, RUN);
  assert.equal(playing(ui), false, 'the run is not opened');
  assert.equal(ui.storage.getItem(ironmanRecordKey(RUN)), head, 'its record is untouched');
  assert.ok(durable(ui).every((text, i) => text === before[i]), 'the durable saves are unchanged');
});

test('without the rehearsal, a kept-looking Ironman run still asks to be resumed before export', async t => {
  const seed = await keptIronman();
  const ui = await mountApp(t, {storageEntries: seed.storageEntries, locks: seed.manager}); await flush();
  await ui.click('title-load');
  const slot = row(ui, 0);
  assert.equal(slot.querySelector('.save-slot').disabled, false);
  assert.ok([...slot.querySelectorAll('.slot-row-actions [data-op="slot-load"]')].some(control => /Resume to export/.test(control.textContent)), 'today’s export path is unchanged');
});
