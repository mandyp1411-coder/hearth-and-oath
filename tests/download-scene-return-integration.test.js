import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as settle } from 'node:timers/promises';
import { validateSave } from '../dist/js/engine.js';
import { gearOrganizer, projectedEquipment } from '../dist/js/gear.js';
import {
  sceneFixture, openLife, openScene, control, returnControl, panel, savedBytes, storageBytes,
  noteKey, activeSlot, trackWrites, assertPendingAndProvider, deferred, controlledPart,
  installDownload, startDownload, assertCompleteFile, captureSubtree, reconnectBackground,
} from './helpers/download-scene-fixtures.mjs';

// Twelve composed mounted-handler cases for roadmap 36 + 37 with current
// 27/28/35 and 29–33 boundaries. Run only in the parent's serial engine lane.
// This semantic fake DOM proves handler/state/focus bookkeeping, not CSS,
// browser downloads, screen readers, earned progression or balance.
const bytes = new TextEncoder().encode('<!doctype html><title>Complete 世界 🗡️</title>');
const practice = ui => ui.root.querySelector('.practice-modal');
async function notes(ui) { await ui.click('tab', 'journal'); await ui.click('workspace-section', 'journal:notes'); }
async function submitLabel(ui, id, label) {
  const form = ui.root.querySelector('#' + id); assert.ok(form);
  form.querySelector('[name="label"]').value = label; await ui.fire('submit', form); await settle();
}
async function assertTrailRetained(ui, expected, before, provider) {
  assert.ok(returnControl(ui)); assert.equal(returnControl(ui).textContent, expected);
  assert.deepEqual(savedBytes(ui), before); assert.equal(activeSlot(ui), 0);
  assertPendingAndProvider(ui, JSON.parse(before['hearth-and-oath-legacy:life:v1']), provider);
}

test('an active scene survives actual note/gear preview, search, paging, scope, unchanged submit and cancel while downloading', async t => {
  const ui = await openLife(t, sceneFixture({ notes: 21 })), part = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part }]);
  await startDownload(ui); await ui.click('close-modal');
  const provider = await openScene(ui), life = ui.current(), before = savedBytes(ui);
  ui.root.querySelector('.workspace-body').scrollTop = 137;
  ui.root.querySelector('.game-content').scrollTop = 29;
  ui.root.querySelector('#meeting-speaker').focus();
  await ui.click('tab', 'inventory'); const label = returnControl(ui).textContent;
  await ui.click('inventory-item', 'gear:iron_sword');
  await ui.click('gear-preset-preview', 'loadout_1');
  assert.ok(ui.root.querySelector('[data-loadout-preview="loadout_1"]'));
  const apply = control(ui, 'gear-preset-apply', 'loadout_1'); assert.equal(apply.disabled, true);
  await ui.fire('click', apply); // The actual already-equipped Apply is disabled, not force-enabled.
  await submitLabel(ui, 'gear-preset-rename', 'Controlled exact kit');
  await ui.click('gear-preset-replace', 'loadout_1'); await ui.click('gear-preset-confirm', 'loadout_1');
  await ui.click('gear-preset-delete', 'loadout_1'); await ui.key('Escape');
  await ui.click('inventory-category', 'equipment');
  const inventorySearch = ui.root.querySelector('#inventory-search');
  inventorySearch.querySelector('[name="query"]').value = 'sword'; await ui.fire('submit', inventorySearch);
  await assertTrailRetained(ui, label, before, provider);
  await notes(ui); await ui.click('journal-page', 'personal:1');
  assert.match(ui.root.querySelector('#journal-personal-results').textContent, /21–21 of 21/);
  await ui.click('personal-note-edit', noteKey(ui));
  ui.root.querySelector('#personal-note-text').value = 'Cancelled replacement'; await ui.click('close-modal');
  await ui.click('personal-note-edit', noteKey(ui)); await ui.fire('submit', ui.root.querySelector('#personal-note-edit-form'));
  await ui.click('personal-note-archive', noteKey(ui)); await ui.key('Escape');
  for (const scope of ['archived', 'family', 'current']) await ui.click('personal-notes-scope', scope);
  const search = ui.root.querySelector('#journal-search'); search.querySelector('input').value = 'Controlled reminder 1';
  await ui.fire('submit', search); assert.equal(ui.document.activeElement.id, 'journal-query');
  await assertTrailRetained(ui, label, before, provider);
  const main = ui.root.querySelector('#main-content'), focus = ui.document.activeElement, all = storageBytes(ui);
  part.release(); await settle(); await assertCompleteFile(download, bytes);
  assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, focus);
  assert.deepEqual(storageBytes(ui), all); await assertTrailRetained(ui, label, before, provider);
  await ui.click('scene-return');
  assert.ok(ui.root.querySelector('.work-commission-meeting'));
  assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson, provider.personId);
  assert.equal(ui.document.activeElement.id, 'meeting-speaker');
  assert.equal(ui.root.querySelector('.workspace-body').scrollTop, 137);
  assert.equal(ui.root.querySelector('.game-content').scrollTop, 29);
  assert.deepEqual(ui.current(), life); assert.deepEqual(savedBytes(ui), before);
});

for (const kind of ['create', 'edit', 'archive', 'restore']) test(`actual personal-note ${kind} invalidates the active trail without affecting downloader, provider, pending state or date`, async t => {
  const ui = await openLife(t, sceneFixture({ archived: kind === 'restore' })), part = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part }]);
  await startDownload(ui); await ui.click('close-modal');
  const provider = await openScene(ui); await notes(ui);
  if (kind === 'restore') await ui.click('personal-notes-scope', 'archived');
  const stale = returnControl(ui); assert.ok(stale); const before = ui.current(), durable = savedBytes(ui);
  if (kind === 'create') {
    const form = ui.root.querySelector('#player-note'); form.querySelector('textarea').value = 'New controlled reminder';
    await ui.fire('submit', form);
  } else if (kind === 'edit') {
    await ui.click('personal-note-edit', noteKey(ui)); const form = ui.root.querySelector('#personal-note-edit-form');
    form.querySelector('textarea').value = '  Changed controlled reminder Ω  '; await ui.fire('submit', form);
  } else {
    await ui.click('personal-note-archive', noteKey(ui)); await ui.click('personal-note-confirm');
  }
  await settle(); const after = ui.current(); assert.equal(returnControl(ui), null);
  assert.notDeepEqual(savedBytes(ui), durable, 'a genuine write, not an unchanged UI action, occurred');
  assertPendingAndProvider(ui, before, provider);
  const omitNotes = state => { const { playerNotes, notice, ...rest } = state; return rest; };
  assert.deepEqual(omitNotes(after), omitNotes(before));
  if (kind === 'create') { assert.equal(after.playerNotes.length, before.playerNotes.length + 1); assert.equal(after.playerNotes.at(-1).text, 'New controlled reminder'); }
  if (kind === 'edit') { assert.equal(after.playerNotes[0].text, '  Changed controlled reminder Ω  '); assert.equal(after.playerNotes[0].noteVersion, before.playerNotes[0].noteVersion + 1); }
  if (kind === 'archive' || kind === 'restore') { assert.equal(after.playerNotes[0].archived, kind === 'archive'); assert.equal(after.playerNotes[0].text, before.playerNotes[0].text); }
  assert.equal(after.playerNotes[0].day, before.playerNotes[0].day); assert.ok(validateSave(after));
  const postWrite = savedBytes(ui); await ui.fire('click', stale); assert.equal(returnControl(ui), null);
  const main = ui.root.querySelector('#main-content'), focus = ui.document.activeElement, all = storageBytes(ui);
  assert.equal(download.calls.length, 2); part.release(); await settle(); await assertCompleteFile(download, bytes);
  assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, focus);
  assert.deepEqual(savedBytes(ui), postWrite); assert.deepEqual(storageBytes(ui), all); assert.deepEqual(ui.current(), after);
});

for (const kind of ['favorite', 'save', 'apply']) test(`actual organizer ${kind} invalidates the active trail but does not cancel or restart the independent download`, async t => {
  const ui = await openLife(t, sceneFixture({ unequipped: kind === 'apply' })), part = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part }]);
  await startDownload(ui); await ui.click('close-modal');
  const provider = await openScene(ui); await ui.click('tab', 'inventory');
  const stale = returnControl(ui); assert.ok(stale); const before = ui.current(), durable = savedBytes(ui);
  if (kind === 'favorite') { await ui.click('inventory-item', 'gear:iron_sword'); await ui.click('gear-favorite', 'iron_sword'); }
  if (kind === 'save') await submitLabel(ui, 'gear-preset-save', 'Second exact kit');
  if (kind === 'apply') { assert.equal(control(ui, 'gear-preset-apply', 'loadout_1').disabled, false); await ui.click('gear-preset-apply', 'loadout_1'); }
  await settle(); const after = ui.current(); assert.equal(returnControl(ui), null); assert.notDeepEqual(savedBytes(ui), durable);
  const omitEquipment = state => { const { equipment, ...rest } = state; return rest; };
  assert.deepEqual(omitEquipment(after), omitEquipment(before)); assertPendingAndProvider(ui, before, provider);
  if (kind === 'favorite') assert.deepEqual(gearOrganizer(after).favorites, ['iron_sword']);
  if (kind === 'save') { assert.equal(gearOrganizer(after).presets.length, 2); assert.deepEqual(projectedEquipment(after), projectedEquipment(before)); }
  if (kind === 'apply') assert.equal(projectedEquipment(after).weapon, 'iron_sword');
  assert.ok(validateSave(after)); const postWrite = savedBytes(ui); await ui.fire('click', stale);
  const main = ui.root.querySelector('#main-content'), focus = ui.document.activeElement, all = storageBytes(ui);
  part.release(); await settle(); await assertCompleteFile(download, bytes);
  assert.equal(download.calls.length, 2); assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, focus);
  assert.deepEqual(savedBytes(ui), postWrite); assert.deepEqual(storageBytes(ui), all); assert.deepEqual(ui.current(), after); assert.equal(returnControl(ui), null);
});

test('practice intercepts connected real background download, scene-return, note and gear handlers before any workspace/life/trail/session mutation', async t => {
  const ui = await openLife(t, sceneFixture({ unequipped: true })), part = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part }]);
  // Save an enabled idle Start from real markup before a different drawer starts
  // the actual in-flight run. Never enable a disabled button or invent an op.
  await ui.click('menu', 'header'); const idleStart = captureSubtree(ui, control(ui, 'download-game'));
  await ui.click('close-modal'); await startDownload(ui);
  const activeCancel = captureSubtree(ui, control(ui, 'cancel-game-download')); await ui.click('close-modal');
  const provider = await openScene(ui); await ui.click('tab', 'inventory'); await ui.click('inventory-item', 'gear:iron_sword');
  const gearNodes = ['gear-favorite', 'gear-preset-preview', 'gear-preset-apply', 'gear-preset-replace', 'gear-preset-delete'].map(op => captureSubtree(ui, control(ui, op)));
  const gearSave = captureSubtree(ui, ui.root.querySelector('#gear-preset-save'));
  gearSave.node.querySelector('[name="label"]').value = 'Must not be saved';
  await notes(ui); await ui.click('personal-note-edit', noteKey(ui));
  const noteEdit = captureSubtree(ui, ui.root.querySelector('#personal-note-edit-form'));
  noteEdit.node.querySelector('textarea').value = 'Must not overwrite'; await ui.click('close-modal');
  await ui.click('menu', 'header'); await ui.click('practice-open', 'protect_ally'); await settle();
  const dialog = practice(ui); assert.ok(dialog);
  const realBackground = ['scene-return', 'personal-note-edit', 'personal-note-archive', 'personal-notes-scope'].map(op => control(ui, op));
  for (const node of realBackground) assert.ok(node && node.isConnected && !node.closest('.practice-modal'));
  const create = ui.root.querySelector('#player-note'); create.querySelector('textarea').value = 'Must not create';
  const reattached = [idleStart, activeCancel, ...gearNodes, gearSave, noteEdit].map(item => reconnectBackground(ui, item));
  const before = storageBytes(ui), life = ui.current(), label = returnControl(ui).textContent, id = dialog.dataset.practiceSession, text = dialog.textContent;
  const main = ui.root.querySelector('#main-content'), focus = ui.document.activeElement, writes = trackWrites(ui);
  for (const node of [...realBackground, ...reattached.filter(node => node.tagName !== 'FORM')]) {
    assert.equal(node.disabled, false, 'each guard probe reaches the current-session boundary'); await ui.fire('click', node);
  }
  for (const form of [create, gearSave.node, noteEdit.node]) await ui.fire('submit', form);
  assert.equal(part.cancelled(), 0); assert.equal(download.calls[0].signal.aborted, false); assert.equal(download.calls.length, 2);
  assert.equal(practice(ui), dialog); assert.equal(dialog.dataset.practiceSession, id); assert.equal(dialog.textContent, text);
  assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, focus);
  assert.deepEqual(storageBytes(ui), before); assert.deepEqual(writes, []); assert.deepEqual(ui.current(), life); assert.equal(returnControl(ui).textContent, label);
  // Completing a download which was already running is not a game command.
  part.release(); await settle(); await assertCompleteFile(download, bytes);
  await ui.fire('click', idleStart.node); await settle(); // A leaked Start would create an unrequested second manifest.
  assert.equal(download.manifests(), 1); assert.equal(practice(ui), dialog); assert.equal(dialog.textContent, text);
  assert.equal(ui.document.activeElement, focus); assert.deepEqual(storageBytes(ui), before); assert.deepEqual(writes, []);
  await ui.click('practice-close'); await settle(); await ui.click('close-modal');
  assert.equal(returnControl(ui).textContent, label); await ui.click('scene-return');
  assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson, provider.personId);
  assert.deepEqual(ui.current(), life); assert.deepEqual(savedBytes(ui), Object.fromEntries(before.filter(([key]) => ['hearth-and-oath-legacy:slots:v1', 'hearth-and-oath-legacy:life:v1'].includes(key))));
});

test('newer ordinary utility navigation cancels a genuinely pending practice open without discarding the existing scene trail', async t => {
  const held = []; let hold = false;
  const locks = { request: async (_name, _options, operation) => hold ? new Promise(resolve => held.push(() => resolve(operation()))) : operation() };
  const ui = await openLife(t, sceneFixture(), { locks }); const provider = await openScene(ui);
  await ui.click('tab', 'inventory'); const label = returnControl(ui).textContent, durable = savedBytes(ui);
  await ui.click('menu', 'header'); hold = true;
  const opening = ui.click('practice-open', 'protect_ally'); await settle(); assert.equal(held.length, 1); assert.equal(practice(ui), null);
  await ui.click('tab', 'journal'); const before = storageBytes(ui), writes = trackWrites(ui);
  held.shift()(); await opening; await settle();
  assert.equal(practice(ui), null); assert.equal(ui.root.querySelector('.menu-drawer'), null);
  assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'), 'Journal');
  assert.equal(returnControl(ui).textContent, label); assert.deepEqual(savedBytes(ui), durable);
  assert.deepEqual(storageBytes(ui), before); assert.deepEqual(writes, []);
  await ui.click('scene-return'); assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson, provider.personId);
  assert.deepEqual(savedBytes(ui), durable);
});

test('one app-local downloader survives close/reopen and duplicate-identity slots; abort, late errors and retry never restore an old life or partial URL', async t => {
  const first = sceneFixture(), second = structuredClone(first);
  second.playerNotes[0].text = 'Distinct adjacent slot, same hero identity'; assert.ok(validateSave(second));
  const ui = await openLife(t, first, { states: [first, second] }), aborted = controlledPart(bytes), failed = controlledPart(bytes), successful = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part: aborted }, { part: failed }, { part: successful }]);
  const provider = await openScene(ui); await ui.click('tab', 'inventory'); const label = returnControl(ui).textContent, original = ui.current(), durable = savedBytes(ui);
  await startDownload(ui); const start = control(ui, 'download-game'), cancel = control(ui, 'cancel-game-download'); cancel.focus();
  const main = ui.root.querySelector('#main-content'), beforeCancel = storageBytes(ui);
  await ui.click('cancel-game-download'); await settle();
  assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, start); assert.equal(aborted.cancelled(), 1);
  assert.equal(download.calls[0].signal.aborted, true); assert.deepEqual(storageBytes(ui), beforeCancel); assert.deepEqual(savedBytes(ui), durable);
  await ui.click('download-game'); await settle(); await ui.click('close-modal');
  assert.equal(returnControl(ui).textContent, label); await ui.click('menu', 'header');
  assert.equal(Number(panel(ui).querySelector('[data-offline-progress]').value), 3);
  await ui.click('title-menu'); await ui.click('title-load'); await ui.click('slot-load', '1'); await settle();
  assert.equal(activeSlot(ui), 1); assert.deepEqual(ui.current(), second); assert.deepEqual(ui.lives(), [original, second, null]);
  await ui.click('tab', 'journal'); assert.equal(returnControl(ui), null); // Same identity cannot carry slot-zero's trail.
  await ui.click('menu', 'header'); const errorMain = ui.root.querySelector('#main-content'), errorFocus = control(ui, 'practice-open', 'protect_ally'); errorFocus.focus();
  const afterSlot = storageBytes(ui); aborted.fail(); failed.fail(); await settle();
  assert.equal(ui.root.querySelector('#main-content'), errorMain); assert.equal(ui.document.activeElement, errorFocus);
  assert.equal(download.blobs.length, 0); assert.deepEqual(download.clicks, []); assert.match(panel(ui).querySelector('[data-offline-message]').textContent, /could not be prepared/);
  assert.deepEqual(storageBytes(ui), afterSlot); assert.deepEqual(ui.current(), second); assert.equal(activeSlot(ui), 1);
  await ui.click('download-game'); await settle(); await ui.click('practice-open', 'protect_ally'); await settle();
  const dialog = practice(ui), focus = ui.document.activeElement, session = dialog.dataset.practiceSession, rehearsal = dialog.textContent, beforeComplete = storageBytes(ui);
  successful.release(); await settle(); await assertCompleteFile(download, bytes);
  assert.equal(practice(ui), dialog); assert.equal(dialog.dataset.practiceSession, session); assert.equal(dialog.textContent, rehearsal); assert.equal(ui.document.activeElement, focus);
  assert.deepEqual(storageBytes(ui), beforeComplete); assert.deepEqual(ui.current(), second); assert.deepEqual(ui.lives(), [original, second, null]); assert.equal(activeSlot(ui), 1);
  assert.equal(download.calls.length, 6); assert.equal(download.manifests(), 3); assert.equal(returnControl(ui), null);
  assert.deepEqual(ui.current().conversations.pending, second.conversations.pending);
  await ui.click('practice-close'); await settle(); assert.match(panel(ui).querySelector('[data-offline-message]').textContent, /Download started/);
  assert.equal(control(ui, 'cancel-game-download').hidden, true);
});

test('the actual inn repertoire topic returns through Inventory and Journal with the exact innkeeper and no repeated meeting, performance or trade draft', async t => {
  const ui = await openLife(t, sceneFixture({ kind: 'inn' })), part = controlledPart(bytes);
  const download = installDownload(t, ui, bytes, [{ part }]); await startDownload(ui); await ui.click('close-modal');
  const provider = await openScene(ui, 'inn', 'repertoire');
  assert.ok(ui.root.querySelector('.inn-repertoire-meeting')); assert.ok(ui.root.querySelector('#repertoire-heading'));
  const before = ui.current(), durable = savedBytes(ui); ui.root.querySelector('#meeting-speaker').focus();
  await ui.click('tab', 'inventory'); await notes(ui); assert.ok(returnControl(ui));
  const main = ui.root.querySelector('#main-content'), focus = ui.document.activeElement, all = storageBytes(ui);
  part.release(); await settle(); await assertCompleteFile(download, bytes);
  assert.equal(ui.root.querySelector('#main-content'), main); assert.equal(ui.document.activeElement, focus); assert.deepEqual(storageBytes(ui), all);
  await ui.click('scene-return'); assert.ok(ui.root.querySelector('.inn-repertoire-meeting'));
  assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson, provider.personId);
  assert.ok(ui.root.querySelector('#repertoire-heading')); assert.equal(control(ui, 'service-topic', 'inn').disabled, false);
  assert.equal(control(ui, 'shop-confirm'), null); assert.equal(ui.root.querySelector('#trade-item-heading'), null);
  assert.equal(before.repertoire?.project ?? null, null); assert.equal(before.repertoire?.pending ?? null, null);
  assert.deepEqual(ui.current(), before); assert.deepEqual(savedBytes(ui), durable); assertPendingAndProvider(ui, before, provider);
});
