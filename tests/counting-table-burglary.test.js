import test from 'node:test';
import assert from 'node:assert/strict';
import { applyJusticeAction, justiceActions } from '../dist/js/justice.js';
import { householdSilver, claimHouseholdSilver } from '../dist/js/silver-property.js';
import { seededRoll } from '../dist/js/world.js';

// Controlled justice subsystem fixtures, not a public-action earned-life run.
function fixture() {
  const s = { seed: 'counting-table-burglary', age: 24, phase: 'adult', day: 8035, locationId: 'quay',
    dynasty: { generation: 2 }, hero: { gold: 100, skills: { stealth: 4 }, attributes: { agility: 5 } },
    world: { locations: [{ id: 'quay', status: 'thriving', servicesAvailable: true }] },
    realm: { regions: [{ id: 'bellwater' }], sites: { quay: { id: 'quay', regionId: 'bellwater', phase: 'town',
      merchant: { id: 'real-merchant-23', name: 'Neris', stock: { iron_sword: 1 }, prices: { iron_sword: 55 }, season: 87 } } } },
    justice: { version: 1, prison: null, arrest: null, lastCheckDay: -1, history: [], thefts: 0, takenProperties: [] },
    legal: { incidents: [] }, adventuring: { loot: [] }, equipment: { owned: [], equipped: {}, instances: [] },
    cartography: { offsite: false, pending: null } };
  const chance = 35 + Math.min(45, s.hero.skills.stealth * 3 + s.hero.attributes.agility) - 20;
  for (let n = 1; n <= 100; n++) if (seededRoll(s.seed, `theft:${n}:${s.locationId}`, 100) < chance) { s.justice.thefts = n - 1; break; }
  return s;
}
function context(s, { afterDays = () => {}, attendedDays = null } = {}) {
  return { spendDays(n) { const actual = attendedDays ?? n; s.day += actual; afterDays(s); return actual; },
    standing(id, amount) { s.standingChanges ||= []; s.standingChanges.push({ id, amount }); },
    addEvidence(amount, description) { s.legal.incidents.push({ locationId: s.locationId, evidence: amount, description }); },
    journalLiteral() {}, breakOath(reason) { s.oathReason = reason; } };
}

test('ordinary burglary keeps its exact action, two days, existing reward and actual named silver', () => {
  const s = fixture(), target = householdSilver(s), day = s.day, gold = s.hero.gold, stock = structuredClone(s.realm.sites.quay.merchant.stock), before = structuredClone(s);
  const action = justiceActions(s).find(a => a.id === 'justice_burglary'); assert.equal(action.days, 2); assert.equal(action.cost, 0);
  assert.equal(action.label, 'Burgle Neris’s household'); assert.deepEqual(s, before);
  assert.equal(applyJusticeAction(s, action.id, context(s)), true); assert.equal(s.day, day + 2); assert.equal(s.hero.gold, gold);
  assert.equal(s.adventuring.loot.length, 1); assert.equal(s.adventuring.loot[0].propertyId, target.id);
  assert.equal(s.adventuring.loot[0].value, target.value); assert.equal(s.adventuring.loot[0].ownerId, target.ownerId);
  assert.equal(s.hero.skills.stealth, 5); assert.ok(s.standingChanges.some(row => row.id === 'underworld' && row.amount === 2));
  assert.equal(s.oathReason, 'You took another household’s property.'); assert.deepEqual(s.realm.sites.quay.merchant.stock, stock);
});

test('ordinary burglary freezes the original year and owner before its attended days', () => {
  for (const afterDays of [s => s.day = (Math.floor(s.day / 365) + 1) * 365,
    s => s.realm.sites.quay.merchant = { ...s.realm.sites.quay.merchant, id: 'real-replacement-24', name: 'A successor' }]) {
    const s = fixture(), target = householdSilver(s), thefts = s.justice.thefts, gold = s.hero.gold;
    assert.equal(applyJusticeAction(s, 'justice_burglary', context(s, { afterDays })), true);
    assert.equal(s.adventuring.loot.length, 0); assert.deepEqual(s.justice.takenProperties, []); assert.equal(s.justice.thefts, thefts);
    assert.equal(s.hero.gold, gold); assert.equal(s.hero.skills.stealth, 4); assert.deepEqual(s.legal.incidents, []);
    assert.match(s.notice, /took nothing/); assert.equal(s.adventuring.loot.some(loot => loot.propertyId !== target.id), false);
  }
});

test('a target claimed during attended days cannot be duplicated by the finishing burglary', () => {
  const s = fixture(), target = householdSilver(s), thefts = s.justice.thefts;
  assert.equal(applyJusticeAction(s, 'justice_burglary', context(s, { afterDays: s => {
    assert.ok(claimHouseholdSilver(s, target, { lootId: 'claimed-by-planned-job' }));
  } })), true);
  assert.equal(s.adventuring.loot.length, 1); assert.equal(s.adventuring.loot[0].id, 'claimed-by-planned-job');
  assert.equal(s.justice.thefts, thefts); assert.match(s.notice, /already been claimed/);
});

test('a planned-job claim or its later sale blocks ordinary burglary before time', () => {
  const s = fixture(), target = householdSilver(s); assert.ok(claimHouseholdSilver(s, target, { lootId: 'planned-job-asset' }));
  s.adventuring.loot = []; // Existing individual valuable sale removes the asset.
  assert.match(justiceActions(s).find(a => a.id === 'justice_burglary').disabledReason, /already missing/);
  const before = structuredClone(s); assert.equal(applyJusticeAction(s, 'justice_burglary', context(s)), false); assert.deepEqual(s, before);
});

test('interrupted burglary and capacity filling after attendance take no silver or reward', () => {
  const interrupted = fixture(), target = householdSilver(interrupted);
  assert.equal(applyJusticeAction(interrupted, 'justice_burglary', context(interrupted, { attendedDays: 1 })), true);
  assert.equal(interrupted.adventuring.loot.length, 0); assert.equal(interrupted.justice.takenProperties.includes(target.id), false);
  const s = fixture(), thefts = s.justice.thefts;
  assert.equal(applyJusticeAction(s, 'justice_burglary', context(s, { afterDays: s => s.adventuring.loot = Array.from({ length: 160 }, (_, i) => ({ id: 'other-' + i })) })), true);
  assert.equal(s.adventuring.loot.length, 160); assert.deepEqual(s.justice.takenProperties, []); assert.equal(s.justice.thefts, thefts);
  assert.equal(s.hero.skills.stealth, 4); assert.deepEqual(s.legal.incidents, []); assert.match(s.notice, /bag filled/);
});
