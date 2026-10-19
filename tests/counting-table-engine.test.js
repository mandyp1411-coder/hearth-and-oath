// Run only in the coordinated engine lane. No browser/layout certification.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, settlementServices, countingTableJournalRows, fixtureFor, valid, reload, act, answer, settle, walk, accept, prepare, finish } from './helpers/counting-table-engine.mjs';
import { applyJusticeAction } from '../dist/js/justice.js';
import { journalCommitments } from '../dist/js/journal-commitments.js';
import { inventoryEntries, renderPlayerInventory } from '../dist/js/inventory-ui.js';
import { lootBasketQuote, regionAt } from '../dist/js/realm.js';
import { tradeInventory } from '../dist/js/trading.js';
import { renderActivities } from '../dist/js/activities-v31.js';
const ui = { e: String, chapter: () => '', button: (label, op, id = '', style = '', disabled = false) => `<button data-op="${op}" data-id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>` };

test('engine: reading/leaving is not acceptance, money collection or a duplicated Journal quest', () => {
  let s = fixtureFor(), day = s.day, gold = s.hero.gold, budget = structuredClone(s.householdBudget);
  const before = structuredClone(s); renderActivities(s, ui, { pane: 'crime' }); E.getActions(s); journalCommitments(s); assert.deepEqual(s, before);
  s = act(s, 'justice_job_open'); assert.equal(s.event.title, 'The Counting-Table Silver'); assert.match(s.event.body, /Market awning/);
  assert.equal(s.justice.countingTableJob, undefined); assert.equal(journalCommitments(s).some(r => r.key === 'counting-table-job'), false);
  assert.equal(s.day, day); assert.equal(s.hero.gold, gold); assert.deepEqual(s.householdBudget, budget); reload(s);
  s = answer(s, 'leave'); assert.equal(s.day, day); assert.equal(s.hero.gold, gold); assert.equal(s.justice.countingTableJob, undefined); reload(s);
});

test('engine: each method uses actual sources and five attended job days to claim the same exact valuable once', () => {
  for (const method of ['stealth', 'social', 'inside']) {
    let s = fixtureFor(method); s = accept(s, method); const run = s.justice.countingTableJob, day = s.day, gold = s.hero.gold;
    const owner = s.realm.sites[s.locationId].merchant, merchant = settlementServices(s).find(r => r.kind === 'merchant' && r.subjectId === 'market');
    assert.equal(run.target.ownerId, owner.id); assert.equal(run.cast.merchant.id, merchant.personId); assert.notEqual(run.target.ownerId, run.cast.merchant.id);
    assert.equal(journalCommitments(s).filter(r => r.key === 'counting-table-job').length, 1); reload(s);
    s = finish(s); assert.equal(s.day, day + 5); assert.equal(s.justice.countingTableJob.status, 'completed');
    const final = s.justice.countingTableJob, loot = s.adventuring.loot.find(l => l.id === final.lootId); assert.ok(loot);
    assert.equal(loot.propertyId, run.target.id); assert.equal(loot.ownerId, owner.id); assert.equal(loot.value, run.target.value); assert.equal(loot.stolen, true);
    assert.ok(s.hero.gold <= gold, 'the job awards no Gold; genuine household bills may settle separately');
    assert.equal(inventoryEntries(s).filter(row => row.id === 'loot:' + loot.id).length, 1); assert.equal(journalCommitments(s).some(r => r.key === 'counting-table-job'), false);
    reload(s); const after = structuredClone(s), repeated = E.chooseEventOption(s, 'depart'); assert.deepEqual(repeated.adventuring.loot, after.adventuring.loot); assert.equal(repeated.hero.gold, after.hero.gold);
  }
});

test('engine: a failed approach and an opportunity withdrawal receive no loot or unfinished payout', () => {
  let s = accept(fixtureFor('stealth', 'entry-failure'), 'stealth'); s = prepare(s); const target = s.justice.countingTableJob.target, count = s.adventuring.loot.length;
  s = act(s, 'justice_job_approach'); assert.equal(s.justice.countingTableJob.status, 'failed'); assert.equal(s.adventuring.loot.length, count);
  assert.equal(s.justice.takenProperties.includes(target.id), false); assert.ok(s.legal.incidents.some(i => i.locationId === target.locationId && i.evidence >= 3)); reload(s);
  s = accept(fixtureFor(), 'stealth'); s = prepare(s); s = act(s, 'justice_job_approach'); s = settle(s);
  if (!s.event) s = act(s, 'justice_job_review'); const gold = s.hero.gold, day = s.day;
  s = answer(s, 'withdraw'); assert.equal(s.justice.countingTableJob.status, 'withdrawn'); assert.equal(s.day, day); assert.equal(s.hero.gold, gold);
  assert.equal(s.adventuring.loot.some(l => l.propertyId === s.justice.countingTableJob.target.id), false); reload(s);
});

test('engine: a controlled zero-day interruption saves the original quote and resumes without reroll', () => {
  let s = prepare(accept(fixtureFor(), 'stealth')); const day = s.day;
  assert.ok(applyJusticeAction(s, 'justice_job_approach', { spendDays: () => 0 })); valid(s); const commitment = structuredClone(s.justice.countingTableJob.attempt.approach.commitment);
  assert.equal(s.day, day); assert.equal(s.justice.countingTableJob.stage, 'approach'); s = reload(s);
  s = act(s, 'justice_job_continue'); assert.deepEqual(s.justice.countingTableJob.attempt.approach.commitment, commitment);
  assert.equal(s.day, day + 1); assert.equal(s.adventuring.loot.some(l => l.propertyId === s.justice.countingTableJob.target.id), false); reload(s);
});

test('engine: the real stolen valuable has one enabled local fence descriptor, not barter/bulk laundering or a remote control', () => {
  let s = finish(accept(fixtureFor('stealth', 'success', { unwitnessed: true }), 'stealth')); s = settle(s); s = walk(s, 'market');
  const run = s.justice.countingTableJob, loot = s.adventuring.loot.find(l => l.id === run.lootId), id = 'realm_sellloot_' + loot.id;
  assert.equal(lootBasketQuote(s).items.some(row => row.id === loot.id), false); assert.match(tradeInventory(s).sell.find(row => row.id === 'loot:' + loot.id).disabledReason, /Stolen property/);
  let html = renderPlayerInventory(s, ui, { selectedId: 'loot:' + loot.id }); assert.ok(html.includes('data-id="' + id + '"'));
  assert.match(html, /Original owner:/); assert.ok(html.includes(loot.ownerName)); assert.match(html, /the fence/); assert.match(html, /Taken at/);
  const original = structuredClone(s); s = walk(s, 'gate'); html = renderPlayerInventory(s, ui, { selectedId: 'loot:' + loot.id });
  assert.equal(html.includes('data-id="' + id + '"'), false); const rejected = E.chooseAction(s, id); assert.equal(rejected.hero.gold, s.hero.gold); assert.deepEqual(rejected.adventuring.loot, s.adventuring.loot);
  s = original; const gold = s.hero.gold, proceeds = Math.floor(loot.value * .55); assert.equal(regionAt(s).id, run.regionId);
  s = act(s, id); assert.equal(s.hero.gold, gold + proceeds); assert.equal(s.adventuring.loot.some(l => l.id === loot.id), false); reload(s);
  assert.match(countingTableJournalRows(s, { archive: true })[0].result, /Claimed; no longer carried/);
  const twice = E.chooseAction(s, id); assert.equal(twice.hero.gold, s.hero.gold); assert.deepEqual(twice.adventuring.loot, s.adventuring.loot);
});
