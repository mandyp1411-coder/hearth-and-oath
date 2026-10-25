import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { createBattle, previewBattleAction, takeBattleAction } from '../dist/js/combat.js';
import * as Maze from '../dist/js/maze-v31.js';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Controlled saved-life and handler checks, not earned-party balance or visual QA.
const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url))));
const base = E.migrateSave(fixture.states.base);
function fresh() {
  const s = structuredClone(base); s.hero.potions = 4; s.hero.gold = 1000; s.hero.hp = s.hero.maxHp - 35; s.adventuring.rations = 10;
  for (const p of s.companions) { p.recruited = p.id === 'mira'; p.active = p.id === 'mira'; }
  const mira = s.companions.find(p => p.id === 'mira'); mira.hp = 1; mira.alive = true; s.rpg.companionStages.mira.status = 'available';
  assert.ok(E.validateSave(s)); return s;
}
function unchanged(next, before) { const restored = structuredClone(next); restored.notice = before.notice; assert.deepEqual(restored, before); }
async function open(t, s = fresh()) { const ui = await mountApp(t, {rulebooks:'both',  states: [s] }); await ui.click('title-continue'); return ui; }

test('public quote and execution agree exactly, remain pure, and round-trip without new save fields', () => {
  const s = fresh(), before = structuredClone(s), q = E.fieldPotionQuote(s, 'mira'); assert.deepEqual(s, before);
  assert.equal(q.amount, 30); assert.equal(q.potionCost, 1); assert.equal(q.days, 0); assert.equal(E.consumableReason(s, 'potions', 'mira'), null);
  const next = E.useConsumable(s, 'potions', 'mira'), expected = structuredClone(s); expected.companions.find(p => p.id === 'mira').hp += q.amount; expected.hero.potions--;
  expected.notice = next.notice; expected.journal = next.journal;
  assert.deepEqual(next, expected); assert.deepEqual(s, before); assert.equal(next.journal.length, s.journal.length + 1); assert.ok(next.notice.includes(q.targetName));
  assert.ok(E.validateSave(next)); assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(next))), next); assert.deepEqual(Object.keys(next).sort(), Object.keys(s).sort());
  const hero = E.useConsumable(s, 'potions'); assert.equal(hero.hero.hp, s.hero.hp + 30); assert.equal(hero.notice, 'You drink a healing potion and recover 30 Health.'); assert.equal(hero.day, s.day);
});

test('public stale-target revalidation never spends a potion or changes other state', () => {
  for (const change of [s => s.companions.find(p => p.id === 'mira').hp = 58, s => s.companions.find(p => p.id === 'mira').hp = 0, s => s.companions.find(p => p.id === 'mira').alive = false, s => s.companions.find(p => p.id === 'mira').active = false, s => s.rpg.companionStages.mira.status = 'away', s => s.hero.potions = 0]) {
    const s = fresh(); assert.equal(E.fieldPotionQuote(s, 'mira').disabledReason, null); change(s); const before = structuredClone(s);
    const next = E.useConsumable(s, 'potions', 'mira'); assert.ok(next.notice); unchanged(next, before);
  }
  const s = fresh(); for (const target of ['enemy-1', 'missing', '', null]) unchanged(E.useConsumable(s, 'potions', target), s);
});

test('companion commitment/custody/work locks are canonical while existing hero eligibility is preserved', () => {
  for (const lock of [s => s.workshop.project = {}, s => s.careers.batch = {}, s => s.life.plan = {}, s => s.rpg.project = {}, s => s.health.recovery = {}, s => s.justice.prison = {}, s => s.yardTournament = { stage: 'preparing' }]) {
    const s = fresh(); lock(s); const before = structuredClone(s); assert.match(E.fieldPotionQuote(s, 'mira').disabledReason, /commitment/);
    unchanged(E.useConsumable(s, 'potions', 'mira'), before); assert.equal(E.fieldPotionQuote(s).disabledReason, null, 'no new work lock is imposed on existing hero use');
  }
});

test('public canonical maze quote admits entrance/cleared rooms but blocks unresolved current enemy/trap/guardian', () => {
  const source=fresh();let s;
  for(let run=source.mazeBook.nextRun;run<source.mazeBook.nextRun+40;run++){
    const next=structuredClone(source);next.mazeBook.nextRun=run;const entered=E.chooseAction(next,'adventure_descend');
    const kinds=new Set(Maze.mazeLayout(entered.maze).cells.map(c=>Maze.mazeRoomCell(entered.maze,c.id).kind));
    if(['enemy','trap','guardian'].every(kind=>kinds.has(kind))){s=entered;break;}
  }
  assert.ok(s,'a bounded set of real generated descents contains all tested danger kinds');assert.ok(s.maze); assert.ok([1, 2].includes(s.maze.version)); assert.equal(E.fieldPotionQuote(s, 'mira').disabledReason, null);
  const entered = structuredClone(s), healed = E.useConsumable(s, 'potions', 'mira'), expectedMaze=structuredClone(entered.maze); expectedMaze.expeditionVisit.used.potions++; assert.deepEqual(healed.maze, expectedMaze, 'the only maze change is its one actual potion consumption'); assert.deepEqual(healed.mazeBook, entered.mazeBook); assert.deepEqual(healed.cartography, entered.cartography);
  for (const kind of ['enemy', 'trap', 'guardian']) {
    const controlled = structuredClone(s), room = Maze.mazeLayout(controlled.maze).cells.map(c => Maze.mazeRoomCell ? Maze.mazeRoomCell(controlled.maze, c.id) : c).find(c => c.kind === kind); assert.ok(room, kind);
    controlled.maze.position = room.id; if (!controlled.maze.visited.includes(room.id)) controlled.maze.visited.push(room.id);
    assert.match(E.fieldPotionQuote(controlled, 'mira').disabledReason, /danger/); unchanged(E.useConsumable(controlled, 'potions', 'mira'), controlled);
    assert.equal(E.fieldPotionQuote(controlled).disabledReason, null, 'existing hero in-maze treatment stays available');
    controlled.maze.cleared.push(room.id); assert.equal(E.fieldPotionQuote(controlled, 'mira').disabledReason, null);
  }
  const unknown = structuredClone(s); unknown.maze.version = 999; assert.match(E.fieldPotionQuote(unknown, 'mira').disabledReason, /safety is not available/, 'unknown future room formats fail closed');
});

test('shared scalar leaves battle potion preview and actual chosen-ally execution exactly aligned', () => {
  for (const hp of [1, 28, 55, 57]) {
    const s = fresh(), battle = createBattle(s, 'forest', null, { openingTurns: false }), target = battle.actors.find(a => a.id === 'mira'); target.hp = hp;
    battle.currentActorId = 'hero'; battle.turnOrder = ['hero', 'mira', ...battle.actors.filter(a => a.side === 'enemy').map(a => a.id)];
    const before = structuredClone(battle), preview = previewBattleAction(battle, 'potion', 'mira'); assert.equal(preview.legal, true); assert.deepEqual(battle, before);
    const expected = Math.min(30, target.maxHp - hp), actual = takeBattleAction(battle, 'potion', 'mira');
    assert.equal(preview.effects.find(e => e.id === 'mira').hp, expected); assert.equal(actual.actors.find(a => a.id === 'mira').hp, hp + expected); assert.equal(actual.potions, battle.potions - 1); assert.equal(actual.potionsUsed, battle.potionsUsed + 1);
    assert.equal(actual.currentActorId, 'mira'); assert.equal(actual.actors.find(a => a.id === 'mira').maxHp, target.maxHp);
    assert.equal(previewBattleAction(battle, 'potion', 'enemy-1').legal, false); const rejected = takeBattleAction(battle, 'potion', 'enemy-1'); assert.equal(rejected.potions, battle.potions);
  }
});

test('Inventory Enter/Space choose only the named ally, keep scroll, and detached stale buttons do nothing', async t => {
  const ui = await open(t); await ui.click('tab', 'inventory'); await ui.click('inventory-item', 'supply:potions');
  const before = ui.current(), target = ui.root.querySelector('[data-op="field-potion"][data-id="mira"]'); assert.ok(target); target.focus(); ui.root.querySelector('.game-content').scrollTop = 333;
  await ui.key('Enter'); assert.equal(ui.current().companions.find(p => p.id === 'mira').hp, 31); assert.equal(ui.current().hero.hp, before.hero.hp); assert.equal(ui.current().hero.potions, before.hero.potions - 1); assert.equal(ui.root.querySelector('.game-content').scrollTop, 333);
  assert.equal(ui.document.activeElement.dataset.op, 'field-potion'); assert.equal(ui.document.activeElement.dataset.id, 'mira'); assert.equal(target.isConnected, false);
  const once = structuredClone(ui.current()); await ui.fire('click', target); assert.deepEqual(ui.current(), once);
  await ui.key(' '); assert.equal(ui.current().companions.find(p => p.id === 'mira').hp, 58); assert.equal(ui.current().hero.potions, before.hero.potions - 2); assert.ok(ui.root.querySelector('[data-op="field-potion"][data-id="mira"]').disabled); assert.ok(E.validateSave(ui.current()));
});

test('Party uses the same named exact quote and Inventory does not invent target rows for an empty traveling circle', async t => {
  const ui = await open(t); await ui.click('tab', 'party'); const s = ui.current(), q = E.fieldPotionQuote(s, 'mira'), button = ui.root.querySelector('[data-op="field-potion"][data-id="mira"]'); assert.ok(button); assert.ok(button.textContent.includes(`+${q.amount} Health`));
  await ui.click('field-potion', 'mira'); assert.equal(ui.current().companions.find(p => p.id === 'mira').hp, 1 + q.amount); assert.equal(ui.current().hero.potions, s.hero.potions - 1);
});

test('Inventory with no recruited companions keeps only the existing hero action', async t => {
  const s = fresh(); for (const p of s.companions) { p.active = false; p.recruited = false; }
  const ui = await open(t, s); await ui.click('tab', 'inventory'); await ui.click('inventory-item', 'supply:potions');
  assert.equal(ui.root.querySelector('.field-party-treatment'), null); assert.equal(ui.root.querySelectorAll('[data-op="field-potion"]').length, 0); assert.ok(ui.root.querySelector('[data-op="use-consumable"][data-id="potions"]'));
});
