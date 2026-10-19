import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame } from '../dist/js/engine.js';
import { healthActions, applyHealthAction } from '../dist/js/health.js';
import { travelPlanPreview, beginTravelJourney } from '../dist/js/travel.js';
import { workshopActions, applyWorkshopAction, workshopView, validateWorkshop } from '../dist/js/workshop.js';
import { initializeCommunity } from '../dist/js/community.js';
import { initializeSanctuaries, sanctuaryActions, applySanctuaryAction, sanctuaryMoonPrepared, onSanctuaryRefugePrepared } from '../dist/js/sanctuaries.js';

function adult() {
  const s = createBirthGame({ seed: 'services-that-actually-operate', birthplace: 'village' });
  s.day = 6570; s.age = 18; s.phase = 'adult'; s.event = null; s.locationId = 'home'; s.hero.gold = 100;
  initializeCommunity(s); initializeSanctuaries(s, { reset: true });
  return s;
}
function work(s, kind, fromDay = s.day, toDay = s.day + 365) {
  const w = { id: `funded-${kind}`, name: `Local ${kind}`, kind, locationId: 'home', completedDay: fromDay, scope: 'open', status: 'standing', enabled: true, fundedUntil: toDay, fundingPeriods: [{ fromDay, toDay, gold: 300 }], servicePauses: [] };
  s.community.works.push(w); return w;
}
const ctx = s => ({ spendDays(days) { s.day += days; return days; }, journal() {} });

test('a funded local clinic changes an attended plan, not symptoms through a screen render', () => {
  const s = adult(); const w = work(s, 'clinic');
  const original = structuredClone(s);
  const plan = healthActions(s).find(a => a.id === 'health_clinic');
  assert.equal(plan.cost, 0); assert.match(plan.description, /44 days/); assert.match(plan.description, /funded local clinic/);
  assert.deepEqual(s, original);
  s.day += plan.days; assert.equal(applyHealthAction(s, plan.id, ctx(s)), true);
  assert.equal(s.health.care.medicineUntil, s.day + 44); assert.equal(s.hero.gold, 100);
  s.day = w.fundedUntil; assert.equal(healthActions(s).find(a => a.id === plan.id).cost, 6);
  s.locationId = 'city'; w.fundedUntil = s.day + 365;
  assert.equal(healthActions(s).find(a => a.id === plan.id).cost, 6, 'a remote clinic does not pay every settlement fee');
});

test('funded roads quote the real legs once and never retroactively rewrite a committed journey', () => {
  const s = adult();delete s.trail;const baseline = travelPlanPreview(s, 'city'); work(s, 'road');
  const quoted = travelPlanPreview(s, 'city');
  for (const [index, leg] of quoted.legs.entries()) if ([leg.from, leg.to].includes('home')) assert.equal(leg.risk, Math.max(0, baseline.legs[index].risk - 8));
  assert.ok(quoted.precautions.some(line => line.includes('funded road undertaking')));
  const snapshot = structuredClone(s); travelPlanPreview(s, 'city'); assert.deepEqual(s, snapshot);
  assert.equal(beginTravelJourney(s, quoted, ctx(s)), true);
  const legs = structuredClone(s.timeline.journey.legs);
  s.community.works[0].enabled = false;
  assert.deepEqual(s.timeline.journey.legs, legs);
});

test('commons regrowth accounts only for real funded days and rendering never consumes or creates materials', () => {
  const s = adult(); s.day = 6580;
  s.workshop.sites.home = { wood: { stock: 0, updatedDay: 6563 } };
  const w = work(s, 'garden', 6570, 6580);
  const original = structuredClone(s), materials = s.equipment.materials.wood;
  const view = workshopView(s), stock = view.gathering.find(r => r.id === 'workshop_gather_wood');
  assert.match(stock.description, /Stock: 3\//, 'seven ordinary days plus ten funded days yield three timber, not a retroactive bonus');
  workshopActions(s); workshopView(s); assert.deepEqual(s, original);
  assert.equal(s.equipment.materials.wood, materials);
  assert.equal(applyWorkshopAction(s, 'workshop_gather_wood', ctx(s)), true);
  assert.equal(s.equipment.materials.wood, materials + 2); assert.equal(s.workshop.sites.home.wood.stock, 1);
  assert.equal(s.workshop.sites.home.wood.updatedDay, 6580);
  assert.equal(validateWorkshop(s.workshop, s), true);
  w.servicePauses = [{ fromDay: 6570, toDay: 6580 }];
  s.workshop.sites.home.wood = { stock: 0, updatedDay: 6563 }; s.day = 6580;
  assert.match(workshopView(s).gathering.find(r => r.id === 'workshop_gather_wood').description, /Stock: 2\//, 'paused service never accelerates stock');
});

test('a funded refuge supports an actual safety plan at its own place and leaves a destroyed town destroyed', () => {
  const s = adult(); work(s, 'refuge');
  s.hero.condition = { type: 'lycanthrope', control: 35, preparedUntil: 0, lastFullMoon: 6566 };
  assert.ok(sanctuaryActions(s).some(a => a.id === 'sanctuary_household'));
  assert.equal(applySanctuaryAction(s, 'sanctuary_household', ctx(s)), true);
  assert.equal(sanctuaryMoonPrepared(s, 6594), true);
  s.locationId = 'city'; assert.equal(sanctuaryMoonPrepared(s, 6594), false);
  s.hero.condition.preparedUntil = 6594; onSanctuaryRefugePrepared(s);
  assert.equal(sanctuaryMoonPrepared(s, 6594), true, 'an independently prepared field refuge keeps its established semantics');
  s.locationId = 'home'; s.world.locations.find(p => p.id === 'home').status = 'destroyed';
  assert.equal(sanctuaryActions(s).some(a => a.id === 'sanctuary_household'), false);
  assert.equal(s.world.locations.find(p => p.id === 'home').status, 'destroyed');
});
