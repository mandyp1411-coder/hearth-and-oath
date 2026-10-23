import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as settle } from 'node:timers/promises';
import { createBirthGame, chooseEventOption, migrateSave } from '../dist/js/engine.js';
import { createSaveStore } from '../dist/js/saves.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Handler/storage integration only. Browser focus/layout still requires QA.
const KEY = 'hearth-and-oath-legacy:slots:v1';
let base;
const fixture = () => structuredClone(base ||= createBirthGame({ name: 'Rowan', seed: 'tactics-practice-ui-original' }));
const snapshot = ui => JSON.stringify([...ui.values]);
const dialog = ui => ui.root.querySelector('.practice-modal');
function trackWrites(ui) {
  const writes = [], set = ui.storage.setItem.bind(ui.storage);
  ui.storage.setItem = (key, value) => { writes.push(key); return set(key, value); };
  return writes;
}
async function openLivePractice(ui) { await ui.click('menu'); await ui.click('practice-open', 'protect_ally'); assert.ok(dialog(ui)); }

test('title-only rehearsal has distinct controls and Escape/retreat/retry never create a save', async t => {
  const ui = await mountApp(t), before = snapshot(ui), writes = trackWrites(ui);
  await ui.click('practice-open', 'protect_ally'); assert.ok(dialog(ui));
  assert.match(dialog(ui).textContent, /Practice only/); assert.ok(ui.root.querySelector('.title-screen').inert);
  const stateId = dialog(ui).dataset.practiceSession;
  for (const control of dialog(ui).querySelectorAll('button,input')) assert.equal(control.dataset.practiceSession, stateId);
  assert.equal(dialog(ui).querySelector('[data-op="battle-finish"]'), null);
  await ui.click('practice-action', 'retreat'); assert.match(dialog(ui).textContent, /Practice ended/);
  await ui.click('practice-retry'); assert.notEqual(dialog(ui).dataset.practiceSession, stateId);
  await ui.key('Escape'); assert.equal(dialog(ui), null); assert.equal(ui.document.activeElement.dataset.op, 'practice-open');
  assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
});

test('all four actual rehearsal handlers preserve every canonical storage byte and restore the original drawer focus', async t => {
  const ui = await mountApp(t, { states: [fixture()] }); await ui.click('title-continue'); await settle();
  const before = snapshot(ui), original = ui.current(), writes = trackWrites(ui);
  await openLivePractice(ui);
  await ui.click('practice-action', 'defend'); assert.match(dialog(ui).textContent, /Lesson completed/);
  await ui.click('practice-lesson', 'disrupt_charge'); await ui.click('practice-action', 'weapon_counter'); assert.match(dialog(ui).textContent, /Lesson completed/);
  await ui.click('practice-lesson', 'exploit_weakness'); await ui.click('practice-action', 'inspect'); await ui.click('practice-action', 'spell_fire'); assert.match(dialog(ui).textContent, /Lesson completed/);
  assert.doesNotMatch(dialog(ui).textContent, /Your party earns|Recovery takes 3 days/);
  await ui.click('practice-lesson', 'cleanse_wound');
  const target = dialog(ui).querySelector('input[value="practice-ally"]'); target.checked = true; await ui.fire('change', target);
  await ui.click('practice-action', 'tactic'); assert.match(dialog(ui).textContent, /Lesson completed/);
  assert.equal(snapshot(ui), before); assert.deepEqual(ui.current(), original); assert.deepEqual(writes, []);
  await ui.click('practice-close'); await Promise.resolve();
  assert.equal(dialog(ui), null); assert.ok(ui.root.querySelector('.menu-drawer')); assert.equal(ui.document.activeElement.dataset.op, 'practice-open');
  assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
});

test('connected background operations, aliases, shortcuts and old session controls cannot mutate or navigate the life', async t => {
  const ui = await mountApp(t, { states: [fixture()] }); await ui.click('title-continue'); await settle(); await openLivePractice(ui);
  const before = snapshot(ui), writes = trackWrites(ui), stateId = dialog(ui).dataset.practiceSession;
  for (const op of ['tab', 'age-up', 'footing-step']) {
    const background = ui.root.querySelectorAll(`[data-op="${op}"]`).find(node => !node.closest('.practice-modal'));
    if (background) await ui.fire('click', background);
  }
  await ui.key('i'); await ui.key('l');
  assert.equal(dialog(ui).dataset.practiceSession, stateId);
  const old = dialog(ui).querySelector('[data-op="practice-action"][data-id="defend"]');
  await ui.click('practice-retry'); await ui.fire('click', old);
  assert.doesNotMatch(dialog(ui).textContent, /Lesson completed/);
  assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
});

test('undurable original choices block rehearsal with save-health remediation and no attempted practice write', async t => {
  const original = fixture(), ui = await mountApp(t, { states: [original] }); await ui.click('title-continue'); await settle();
  const set = ui.storage.setItem.bind(ui.storage);
  ui.storage.setItem = (key, value) => { if (key === KEY) throw Error('Quota'); return set(key, value); };
  await ui.click('choice', original.event.choices[0].id); await ui.click('menu');
  const before = snapshot(ui), writes = trackWrites(ui);
  await ui.click('practice-open', 'protect_ally');
  assert.equal(dialog(ui), null); assert.match(ui.toast.textContent, /Saving needs attention/);
  assert.match(ui.root.innerHTML, /Not saved/); assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
});

test('an actual competing save discards rehearsal without restoring or overwriting the newer life', async t => {
  const original = fixture(), ui = await mountApp(t, { states: [original] }); await ui.click('title-continue'); await settle(); await openLivePractice(ui);
  const newer = chooseEventOption(original, original.event.choices[0].id);
  assert.ok(createSaveStore(ui.storage, migrateSave).write(0, newer));
  const before = snapshot(ui), writes = trackWrites(ui);
  await ui.windowEvent('storage', { key: KEY }); await settle();
  assert.equal(dialog(ui), null); assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));
  assert.equal(snapshot(ui), before); assert.deepEqual(ui.current(), newer); assert.deepEqual(writes, []);
});

test('Escape while the real save coordinator is held cancels pending entry rather than opening late', async t => {
  const held = []; let hold = false;
  const locks = { request: async (_name, _options, operation) => hold ? new Promise(resolve => held.push(() => resolve(operation()))) : operation() };
  const ui = await mountApp(t, { states: [fixture()], locks }); await ui.click('title-continue'); await settle(); await ui.click('menu');
  const before = snapshot(ui), writes = trackWrites(ui); hold = true;
  const opening = ui.click('practice-open', 'protect_ally'); await settle(); assert.equal(held.length, 1);
  await ui.key('Escape'); held.shift()(); await opening; await settle();
  assert.equal(dialog(ui), null); assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
});

test('reload during an actual rehearsal returns only the exact original saved life', async t => {
  let entries, expected;
  await t.test('capture during rehearsal', async child => {
    const ui = await mountApp(child, { states: [fixture()] }); await ui.click('title-continue'); await settle(); await openLivePractice(ui);
    expected = ui.current(); const before = snapshot(ui), writes = trackWrites(ui);
    await ui.click('practice-action', 'defend'); entries = [...ui.values];
    assert.equal(snapshot(ui), before); assert.deepEqual(writes, []);
  });
  await t.test('fresh page load', async child => {
    const ui = await mountApp(child, { storageEntries: entries }); assert.equal(dialog(ui), null);
    assert.deepEqual(ui.current(), expected); await ui.click('title-continue'); assert.deepEqual(ui.current(), expected);
  });
});
