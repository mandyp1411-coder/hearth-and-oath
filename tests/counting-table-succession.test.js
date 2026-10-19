// ENGINE LANE ONLY. Public continueAsChild on explicitly controlled retired
// parent fixtures, not a claim to have played this parent's entire lifetime.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, valid, reload, settle, walk, act } from './helpers/counting-table-engine.mjs';
import { completeLineageHistory } from '../dist/js/lineage.js';
import { householdSilver, householdSilverReason, propertyAlreadyTaken } from '../dist/js/silver-property.js';
import { seededRoll } from '../dist/js/world.js';
import { syncCartography } from '../dist/js/cartography.js';

const rawParent = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url))).states.parent;
function parentWithActualSilver() {
  const base = settle(E.migrateSave(structuredClone(rawParent)));
  for (const place of base.world.locations.filter(p => base.realm.sites[p.id]?.merchant && !['destroyed', 'evacuated'].includes(p.status))) {
    let s = structuredClone(base); s.locationId = place.id; syncCartography(s); s = walk(s, 'market');
    const chance = 35 + Math.min(45, s.hero.skills.stealth * 3 + s.hero.attributes.agility) - 20;
    if (seededRoll(s.seed, `theft:${s.justice.thefts + 1}:${s.locationId}`, 100) >= chance) continue;
    const target = householdSilver(s); s = act(s, 'justice_burglary');
    assert.ok(s.adventuring.loot.some(loot => loot.propertyId === target.id)); return { s, target };
  }
  throw Error('No actual existing merchant gives this controlled burglary success');
}
function closeControlledParent(s) {
  // Retirement eligibility is not under test. Preserve a genuine playable
  // retired parent envelope, then exercise the actual public succession API.
  s = settle(s); s.phase = 'retired'; s.event = null; s.battle = null;
  s.chronicle = 'Controlled retired parent with actual household property history.';
  completeLineageHistory(s, 'retirement'); valid(s); return s;
}

test('public succession refuses malformed world claims without changing or aliasing the parent', () => {
  const parent = closeControlledParent(settle(E.migrateSave(structuredClone(rawParent))));
  for (const claims of [null, [123], ['x'.repeat(241)], Array.from({ length: 201 }, () => 'x')]) {
    const s = structuredClone(parent); s.justice.takenProperties = claims;
    assert.equal(E.validateSave(s), false, 'the controlled parent has malformed world claims');
    const before = structuredClone(s), next = E.continueAsChild(s, 'child-1');
    assert.equal(next.notice, 'That child cannot continue this family story.');
    assert.equal(next.dynasty.generation, before.dynasty.generation);
    assert.deepEqual(next, { ...before, notice: next.notice }, 'only the refusal notice changes');
    assert.deepEqual(s, before, 'the malformed original is not changed or repaired');
    assert.notEqual(next, s); assert.notEqual(next.justice, s.justice);
    if (Array.isArray(claims)) assert.notEqual(next.justice.takenProperties, s.justice.takenProperties);
  }
});

for (const disposition of ['carried', 'sold']) test(`public succession: ${disposition} silver stays claimed in the same world year without inherited guilt or aliasing`, () => {
  let { s, target } = parentWithActualSilver(); s = settle(s); s = walk(s, 'market');
  if (disposition === 'sold') { const loot = s.adventuring.loot.find(loot => loot.propertyId === target.id); s = act(s, 'realm_sellloot_' + loot.id); s = settle(s); }
  const year = Math.floor(s.day / 365); s = closeControlledParent(s);
  const old = structuredClone(s), next = E.continueAsChild(s, 'child-1'); valid(next); assert.equal(next.dynasty.generation, old.dynasty.generation + 1);
  assert.equal(Math.floor(next.day / 365), year); assert.ok(propertyAlreadyTaken(next, target.id)); assert.match(householdSilverReason(next, target, { requireHere: false }), /already been claimed/);
  assert.deepEqual(next.justice.takenProperties, old.justice.takenProperties); assert.notEqual(next.justice.takenProperties, s.justice.takenProperties);
  assert.equal(next.adventuring.loot.some(loot => loot.propertyId === target.id), disposition === 'carried');
  assert.deepEqual(next.legal.incidents, []); assert.equal(next.legal.evidence, 0); assert.equal(next.legal.wanted, false);
  assert.equal(next.justice.prison, null); assert.equal(next.justice.arrest, null); assert.equal(next.justice.countingTableJob, undefined); assert.equal(next.justice.countingTableOffer, undefined);
  reload(next); next.justice.takenProperties.push('controlled-distinct-future-property'); assert.deepEqual(s, old, 'public successor never aliases the parent claims');
});

test('public successor: another actual owner and a genuinely advanced world year are different targets, never silent replacements', () => {
  let { s, target } = parentWithActualSilver(); s = settle(s); const loot = s.adventuring.loot.find(loot => loot.propertyId === target.id);
  s = act(walk(s, 'market'), 'realm_sellloot_' + loot.id); s = closeControlledParent(s); let next = E.continueAsChild(s, 'child-1'); valid(next);
  const other = next.world.locations.map(place => householdSilver(next, place.id)).find(p => p && p.ownerId !== target.ownerId && householdSilverReason(next, p, { requireHere: false }) === null);
  assert.ok(other, 'a different real merchant has a different actual silver target'); assert.notEqual(other.id, target.id); assert.equal(propertyAlreadyTaken(next, other.id), false);
  const year = Math.floor(next.day / 365);
  for (let guard = 0; guard < 40 && Math.floor(next.day / 365) === year; guard++) {
    next = settle(next); if (Math.floor(next.day / 365) > year) break;
    next = valid(next.timeline.yearTarget !== null ? E.continueAgeUp(next) : E.ageUp(next));
  }
  assert.ok(Math.floor(next.day / 365) > year, 'ordinary calendar progression actually crosses a world-year boundary');
  const later = householdSilver(next, target.locationId); assert.ok(later); assert.notEqual(later.id, target.id);
  assert.equal(propertyAlreadyTaken(next, target.id), true); assert.equal(propertyAlreadyTaken(next, later.id), false);
  assert.match(householdSilverReason(next, target, { requireHere: false }), /year has ended|original merchant/); reload(next);
});
