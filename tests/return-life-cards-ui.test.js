// Semantic handler cases prepared for the serialized release test lane.
// This fixture does not establish real-browser geometry, downloads or AT output.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame, chooseEventOption } from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';
const KEY = 'hearth-and-oath:slots:v1', MIRROR = 'hearth-and-oath:life:v1', STAMP = '2026-10-12T00:00:00.000Z';
const originals = new Map();
function fixture(name = 'Rowan') { if (!originals.has(name)) originals.set(name, createBirthGame({ name, seed: 'return-card-' + name })); return structuredClone(originals.get(name)); }
const row = (ui, id) => ui.root.querySelectorAll('[data-return-life-card]')[id];
const exported = (ui, id) => row(ui, id).querySelector('.slot-export');
function capture(t, ui, { fail = false } = {}) {
  const blobs = [], create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = blob => { if (fail) throw Error('Download blocked'); blobs.push(blob); return 'blob:return-life-card-test'; }; URL.revokeObjectURL = () => {};
  ui.document.createElement = () => ({ click() {} });
  t.after(() => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; });
  return blobs;
}
function blockWrites(ui) { const write = ui.storage.setItem; ui.storage.setItem = (key, value) => { if ([KEY, MIRROR].includes(key)) throw Error('Quota'); write(key, value); }; }

test('three independent cards show their own name, pending moment, durable timestamp and exact local-copy export target', async t => {
  const states = [fixture(), fixture('Alder'), fixture('Mira')], stamps = [STAMP, '2026-10-13T00:00:00.000Z', null];
  const envelope = JSON.stringify({ version: 1, activeSlot: 0, backups: {}, slots: states.map((state, id) => ({ id, state, updatedAt: stamps[id] })) });
  const ui = await mountApp(t, { states, storageEntries: [[KEY, envelope]] });
  const before = ui.storage.getItem(KEY), mirror = ui.storage.getItem(MIRROR);
  await ui.click('title-load');
  assert.equal(ui.root.querySelectorAll('[data-return-life-card]').length, 3);
  for (let id = 0; id < 3; id++) {
    assert.match(row(ui, id).textContent, new RegExp(states[id].hero.name));
    assert.equal(row(ui, id).querySelector('.slot-pending-context').textContent, 'Watching your first years: ' + states[id].event.title);
    assert.equal(row(ui, id).querySelector('[data-save-health]').dataset.saveAt, stamps[id] || '');
    assert.equal(exported(ui, id).getAttribute('aria-label'), `Export this tab’s copy of ${states[id].hero.name} from slot ${id + 1}`);
    assert.equal(exported(ui, id).closest('.save-slot'), null, 'export is a sibling, never a nested button');
    assert.equal(row(ui, id).querySelector('[data-save-health]').querySelector('button'), null, 'one non-duplicated export per card');
  }
  assert.equal(row(ui, 2).querySelector('[data-save-time]').textContent, 'Save time unavailable');
  assert.equal(ui.storage.getItem(KEY), before); assert.equal(ui.storage.getItem(MIRROR), mirror);
});

test('empty rows keep native disabled load behavior and offer no empty export; new-life slots stay creatable', async t => {
  const ui = await mountApp(t, { states: [fixture()] }); await ui.click('title-load');
  for (const id of [1, 2]) { assert.equal(row(ui, id).querySelector('[data-op="slot-load"]').disabled, true); assert.equal(exported(ui, id), null); assert.equal(row(ui, id).querySelector('[data-save-health]'), null); }
  await ui.click('title-menu'); await ui.click('title-new');
  for (const id of [1, 2]) { assert.equal(row(ui, id).querySelector('[data-op="slot-new"]').disabled, false); assert.equal(exported(ui, id), null); }
});

test('Enter, Space and repeated slot exports keep focus, navigation, saved bytes and other slots unchanged', async t => {
  const states = [fixture(), fixture('Alder')], ui = await mountApp(t, { states }); await ui.click('title-load');
  const files = capture(t, ui), before = ui.storage.getItem(KEY), mirror = ui.storage.getItem(MIRROR), control = exported(ui, 1);
  control.focus(); await ui.key('Enter', control); await ui.key(' ', control); await ui.click('export-session', '1');
  assert.equal(files.length, 3); for (const file of files) assert.deepEqual(JSON.parse(await file.text()), states[1]);
  assert.equal(ui.document.activeElement, control); assert.equal(control.isConnected, true); assert.ok(ui.root.querySelector('.save-slots-screen'));
  assert.equal(ui.storage.getItem(KEY), before); assert.equal(ui.storage.getItem(MIRROR), mirror);
  assert.match(ui.toast.textContent, /Browser save status is unchanged/);
});

test('active unsaved card exports its exact latest session while a neighboring card exports only its own local copy', async t => {
  const before = fixture(), neighbor = fixture('Alder'), ui = await mountApp(t, { states: [before, neighbor] }); await ui.click('title-continue');
  blockWrites(ui); const expected = chooseEventOption(before, before.event.choices[0].id), files = capture(t, ui), durable = ui.storage.getItem(KEY);
  await ui.click('choice', before.event.choices[0].id); await ui.click('title-menu'); await ui.click('title-load');
  assert.match(exported(ui, 0).getAttribute('aria-label'), /Export latest session for Rowan from slot 1/);
  assert.match(row(ui, 0).querySelector('[data-slot-source]').textContent, /Latest session; not yet saved/);
  assert.equal(row(ui, 0).querySelector('[data-save-health]').dataset.saveAt, STAMP);
  assert.match(row(ui, 0).querySelector('[data-save-label]').textContent, /Not saved/);
  await ui.click('export-session', '0'); await ui.click('export-session', '1');
  assert.deepEqual(JSON.parse(await files[0].text()), expected); assert.deepEqual(JSON.parse(await files[1].text()), neighbor);
  assert.equal(ui.storage.getItem(KEY), durable); assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented, true);
  assert.equal(row(ui, 0).querySelector('[data-slot-source]').hidden, false, 'a file export never blesses browser persistence');
});

test('failed slot export preserves focused control and unsaved warning for retry', async t => {
  const before = fixture(), ui = await mountApp(t, { states: [before] }); await ui.click('title-continue'); blockWrites(ui);
  await ui.click('choice', before.event.choices[0].id); await ui.click('title-menu'); await ui.click('title-load'); capture(t, ui, { fail: true });
  const control = exported(ui, 0), durable = ui.storage.getItem(KEY); control.focus(); await ui.key('Enter', control);
  assert.match(ui.toast.textContent, /could not be downloaded/); assert.equal(ui.document.activeElement, control); assert.equal(control.isConnected, true);
  assert.match(row(ui, 0).querySelector('[data-save-label]').textContent, /Not saved/); assert.equal(ui.storage.getItem(KEY), durable);
});

test('delete and replacement still require their existing review and cancellation changes no saved life', async t => {
  const ui = await mountApp(t, { states: [fixture(), fixture('Alder')] }); await ui.click('title-load'); const durable = ui.storage.getItem(KEY);
  await ui.click('slot-delete', '1'); assert.ok(ui.root.querySelector('[data-op="confirm-delete-life"]')); await ui.key('Escape');
  assert.equal(ui.storage.getItem(KEY), durable); assert.ok(exported(ui, 1));
  await ui.click('title-menu'); await ui.click('title-new'); await ui.click('slot-new', '1');
  assert.ok(ui.root.querySelector('[data-op="confirm-overwrite"]')); await ui.key('Escape'); assert.equal(ui.storage.getItem(KEY), durable); assert.ok(exported(ui, 1));
});
