// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
// Production delegated handlers on a synthetic DOM; not real browser/layout QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureFor, E } from './helpers/counting-table-engine.mjs';
import { mountApp } from './helpers/ui-surface.mjs';
const crime = async surface => { await surface.click('tab', 'activities'); await surface.click('activities-pane', 'crime'); };

test('production UI: finite Crime proposal, separate chances, empty interim bag, real Inventory valuable and one existing fence sale', async t => {
  const s = fixtureFor('stealth', 'success', { unwitnessed: true }), surface = await mountApp(t, {rulebooks:'both',  states: [s] });
  await surface.click('title-continue'); await crime(surface); assert.ok(surface.root.querySelector('[data-disclosure="crime:counting-table"]'));
  await surface.click('activity', 'justice_job_open'); assert.equal(surface.current().event.title, 'The Counting-Table Silver');
  assert.match(surface.root.innerHTML, /Approach \d+%; departure \d+%/); await surface.click('choice', 'accept_stealth');
  for (let i = 0; i < 3; i++) { await crime(surface); await surface.click('activity', 'justice_job_prepare'); assert.ok(E.validateSave(surface.current())); }
  await crime(surface); await surface.click('activity', 'justice_job_approach');
  const run = surface.current().justice.countingTableJob; assert.equal(run.stage, 'opportunity'); assert.equal(surface.current().adventuring.loot.some(l => l.propertyId === run.target.id), false);
  assert.equal(surface.current().event.id, 'justice_counting_departure'); await surface.click('choice', 'depart');
  const final = surface.current().justice.countingTableJob, loot = surface.current().adventuring.loot.find(l => l.id === final.lootId); assert.ok(loot); assert.equal(final.status, 'completed');
  await surface.click('tab', 'inventory'); await surface.click('inventory-item', 'loot:' + loot.id);
  assert.match(surface.root.innerHTML, /Original owner:/); assert.ok(surface.root.innerHTML.includes(loot.ownerName)); assert.match(surface.root.innerHTML, /the fence/);
  const gold = surface.current().hero.gold; await surface.click('activity', 'realm_sellloot_' + loot.id);
  assert.equal(surface.current().hero.gold, gold + Math.floor(loot.value * .55)); assert.equal(surface.current().adventuring.loot.some(l => l.id === loot.id), false); assert.ok(E.validateSave(surface.current()));
});
