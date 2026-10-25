import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { copy, roomFixture, select } from './helpers/companion-field-fixtures.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

for (const key of ['Enter', ' ']) test(`native selected help ${JSON.stringify(key)} executes exactly once, preserves adjacent life and moves focus to its result`, async t => {
  const s = roomFixture('protector'), adjacent = copy(s), id = select(s, 'protector', 'mira').id, ui = await mountApp(t, {rulebooks:'both',  states: [s, adjacent], width: 390, height: 844 });
  await ui.click('title-continue'); const trigger = ui.root.querySelector(`[data-op="activity"][data-id="${id}"]`); assert.ok(trigger && !trigger.disabled); assert.match(ui.root.querySelector('.maze-field-assists').textContent, /Alone: lose/); assert.match(ui.root.querySelector('.maze-field-assists').textContent, /personal Focus/);
  trigger.focus(); const expected = E.chooseAction(s, id); await ui.key(key); assert.deepEqual(ui.current(), expected); assert.deepEqual(ui.lives()[1], adjacent); assert.equal(ui.document.activeElement.id, 'maze-field-assists-title');
  const once = copy(ui.current()), disk = [ui.storage.getItem('hearth-and-oath:slots:v1'), ui.storage.getItem('hearth-and-oath:life:v1')], writes = [], write = ui.storage.setItem;
  ui.storage.setItem = (key, value) => { writes.push(key); write(key, value); }; await ui.fire('click', trigger); assert.deepEqual(ui.current(), once); assert.deepEqual(writes, []); assert.deepEqual([ui.storage.getItem('hearth-and-oath:slots:v1'), ui.storage.getItem('hearth-and-oath:life:v1')], disk);
  assert.match(ui.root.querySelector('[data-maze-assist-used]').textContent, /Companion help already used/); assert.equal(ui.current().maze.fieldAssists.entries.length, 1);
});

test('disabled full-Focus scholarly help cannot spend/write, while ordinary current inscription reading remains available', async t => {
  const s = roomFixture('scholar'); s.hero.mp = s.hero.maxMp; const id = select(s, 'scholar', 'orrin').id, ui = await mountApp(t, {rulebooks:'both',  states: [s] }); await ui.click('title-continue');
  const helper = ui.root.querySelector(`[data-op="activity"][data-id="${id}"]`), ordinary = ui.root.querySelector('[data-op="activity"][data-id="maze_read"]'); assert.ok(helper.disabled); assert.ok(ordinary && !ordinary.disabled);
  const before = copy(ui.current()), writes = [], write = ui.storage.setItem; ui.storage.setItem = (key, value) => { writes.push(key); write(key, value); }; helper.focus(); await ui.key('Enter'); await ui.fire('click', helper); assert.deepEqual(ui.current(), before); assert.deepEqual(writes, []);
  await ui.click('activity', 'maze_read'); const expected = E.chooseAction(s, 'maze_read'); assert.deepEqual(ui.current(), expected); assert.equal(ui.current().maze.fieldAssists, undefined);
});

test('selected healer target uses herb and personal Focus once; a second target cannot stack in the room', async t => {
  const s = roomFixture('healer'), source = s.companions.find(p => p.id === 'sable'), id = select(s, 'healer', 'sable', 'sable').id, ui = await mountApp(t, {rulebooks:'both',  states: [s] }); await ui.click('title-continue');
  const hero = select(s, 'healer', 'sable', 'hero').id, staleOther = ui.root.querySelector(`[data-op="activity"][data-id="${hero}"]`); assert.ok(staleOther && !staleOther.disabled);
  await ui.click('activity', id); const expected = E.chooseAction(s, id); assert.deepEqual(ui.current(), expected); assert.equal(ui.current().hero.hp, s.hero.hp); assert.ok(ui.current().companions.find(p => p.id === 'sable').hp > source.hp); assert.equal(ui.current().flags.herbs, s.flags.herbs - 1);
  const before = copy(ui.current()); await ui.fire('click', staleOther); assert.deepEqual(ui.current(), before); assert.equal(ui.current().maze.fieldAssists.entries.length, 1); assert.equal(ui.current().maze.expeditionVisit.assists.length, 1);
});
