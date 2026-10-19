import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCountingTableCase, COUNTING_TABLE_STEPS, recordCountingTablePreparation, countingTableRiskQuote, countingTableRolls,
  beginCountingTablePhase, recordCountingTablePhaseAttendance, resolveCountingTablePhase, withdrawCountingTableCase,
  validateCountingTableCase } from '../dist/js/counting-table-case.js';
import { householdSilver, claimHouseholdSilver } from '../dist/js/silver-property.js';

// Controlled small owner fixtures. These are not engine or earned-life claims.
function fixture(seed) {
  return { seed, age: 24, phase: 'adult', day: 8035, locationId: 'quay',
    dynasty: { activePersonId: 'actual-hero', generation: 2 }, timeline: { birthDay: 7000 },
    hero: { gold: 24, skills: { stealth: 4, persuasion: 3, scholarship: 2 }, attributes: { agility: 7, presence: 6, intellect: 5 } },
    world: { locations: [{ id: 'quay', status: 'thriving', servicesAvailable: true }] },
    realm: { regions: [{ id: 'bellwater' }], sites: { quay: { id: 'quay', regionId: 'bellwater', phase: 'town',
      merchant: { id: 'actual-owner', name: 'Tova', stock: { iron_sword: 1 } } } } },
    rpg: { factions: [{ id: 'quiet_table', rank: 1 }] }, cartography: { interior: { siteId: 'quay', roomId: 'market' } },
    justice: { thefts: 0, takenProperties: [] }, legal: { incidents: [] }, adventuring: { loot: [] }, equipment: { instances: [] } };
}
function provider(kind, subjectId, id, name, roomId) {
  return { kind, subjectId, personId: id, locationId: 'quay', roomId, person: { id, name, role: kind, locationId: 'quay', alive: true, available: true } };
}
const merchant = () => provider('merchant', 'market', 'actual-merchant-person', 'Tova', 'market');
const source = () => provider('faction', 'quiet_table', 'actual-npc16-person', 'Maren', 'hall');
function create(method = 'stealth', wanted = 'success', witnessed = null) {
  for (let n = 0; n < 1000; n++) {
    const s = fixture('counting-terminal-' + n), run = makeCountingTableCase(s, { method, merchantService: merchant(), quietTableService: source() });
    const quote = countingTableRiskQuote(s, run, { enforcement: 60 }), rolls = countingTableRolls(s, run);
    if ((wanted === 'entry-failure' ? rolls.entry >= quote.entryChance : rolls.entry < quote.entryChance)
      && (wanted === 'departure-failure' ? rolls.escape >= quote.escapeChance : wanted !== 'success' || rolls.escape < quote.escapeChance)
      && (witnessed === null || (rolls.witness < quote.witnessChance) === witnessed)) {
      s.justice.countingTableJob = run; return { s, run };
    }
  }
  throw Error('No deterministic controlled seed for requested route');
}
function prepare(s, run) {
  for (const id of COUNTING_TABLE_STEPS[run.method]) {
    const row = id === 'counter_copy_shared' ? source() : ['valuation_terms', 'valuation_entry_checked'].includes(id) ? merchant() : null;
    s.cartography.interior.roomId = row?.roomId || 'market'; const startedDay = s.day++;
    assert.ok(recordCountingTablePreparation(s, run, id, { startedDay, provider: row, willing: true }));
  }
  s.cartography.interior.roomId = 'market'; assert.ok(validateCountingTableCase(run, s));
}
function context(s) {
  return { addEvidence(amount, description) { s.legal.incidents.push({ locationId: s.locationId, evidence: amount, description }); },
    standing(id, amount) { s.standingChanges ||= []; s.standingChanges.push({ id, amount }); },
    breakOath(reason) { s.oathReason = reason; } };
}
function phase(s, run, id) {
  assert.ok(beginCountingTablePhase(s, run, id, { enforcement: 60 })); assert.ok(validateCountingTableCase(run, s));
  const startedDay = s.day++; assert.ok(recordCountingTablePhaseAttendance(s, run, id, { startedDay })); assert.ok(validateCountingTableCase(run, s));
  const outcome = resolveCountingTablePhase(s, run, id, context(s)); assert.ok(validateCountingTableCase(run, s), JSON.stringify(run)); return outcome;
}
function roundtrip(s) {
  const next = JSON.parse(JSON.stringify(s)); assert.deepEqual(next, s); assert.ok(validateCountingTableCase(next.justice.countingTableJob, next)); return next;
}

test('all three methods complete in five actual days with one real target, no upfront Gold or early loot', () => {
  for (const method of ['stealth', 'social', 'inside']) {
    const { s, run } = create(method), day = s.day, gold = s.hero.gold, skill = countingTableRiskQuote(s, run, { enforcement: 60 }).skill, beforeSkill = s.hero.skills[skill];
    prepare(s, run); assert.equal(s.adventuring.loot.length, 0);
    assert.equal(phase(s, run, 'approach').status, 'opportunity'); assert.equal(s.adventuring.loot.length, 0); roundtrip(s);
    assert.equal(phase(s, run, 'departure').status, 'completed'); assert.equal(s.day, day + 5); assert.equal(s.hero.gold, gold);
    assert.equal(s.adventuring.loot.length, 1); assert.equal(s.adventuring.loot[0].propertyId, run.target.id); assert.equal(s.adventuring.loot[0].ownerId, run.target.ownerId);
    assert.equal(run.lootId, s.adventuring.loot[0].id); assert.equal(s.justice.thefts, 1); assert.equal(s.hero.skills[skill], beforeSkill + 1);
    assert.equal(s.oathReason, 'You took another household’s property.'); assert.ok(s.standingChanges.some(row => row.id === 'underworld' && row.amount === 2)); roundtrip(s);
    const after = structuredClone(s); assert.equal(resolveCountingTablePhase(s, run, 'departure', context(s)).status, 'unavailable');
    assert.equal(withdrawCountingTableCase(s, run), false); assert.deepEqual(s, after);
  }
});

test('failed entry and failed departure grant no valuable, no skill and exactly one named three-evidence report', () => {
  for (const wanted of ['entry-failure', 'departure-failure']) {
    const { s, run } = create('social', wanted), skills = structuredClone(s.hero.skills), gold = s.hero.gold;
    prepare(s, run); const entry = phase(s, run, 'approach');
    const outcome = wanted === 'entry-failure' ? entry : phase(s, run, 'departure');
    assert.equal(outcome.status, 'failed'); assert.equal(s.adventuring.loot.length, 0); assert.deepEqual(s.justice.takenProperties, []);
    assert.deepEqual(s.hero.skills, skills); assert.equal(s.hero.gold, gold); assert.equal(s.legal.incidents.length, 1);
    assert.equal(s.legal.incidents[0].locationId, 'quay'); assert.equal(s.legal.incidents[0].evidence, 3); assert.match(s.legal.incidents[0].description, /Tova/);
    assert.equal(s.standingChanges.filter(row => row.id === 'villagers').length, 1); assert.equal(s.oathReason, undefined); roundtrip(s);
    const after = structuredClone(s); resolveCountingTablePhase(s, run, wanted === 'entry-failure' ? 'approach' : 'departure', context(s)); assert.deepEqual(s, after);
  }
});

test('successful identification uses the frozen actual regional exposure and the same existing report path', () => {
  for (const witnessed of [false, true]) {
    const { s, run } = create('social', 'success', witnessed); prepare(s, run); phase(s, run, 'approach'); phase(s, run, 'departure');
    assert.equal(s.adventuring.loot.length, 1); assert.equal(run.attempt.reported, witnessed);
    assert.equal(s.legal.incidents.length, witnessed ? 1 : 0); if (witnessed) assert.equal(s.legal.incidents[0].evidence, 3);
    roundtrip(s);
  }
});

test('withdrawal before preparation, after preparation, and at opportunity is empty-handed and terminal', () => {
  for (const stop of ['accepted', 'prepared', 'opportunity', 'committed-approach', 'committed-departure']) {
    const { s, run } = create(); if (stop !== 'accepted') prepare(s, run);
    if (['opportunity', 'committed-departure'].includes(stop)) phase(s, run, 'approach');
    if (stop === 'committed-approach') assert.ok(beginCountingTablePhase(s, run, 'approach', { enforcement: 60 }));
    if (stop === 'committed-departure') assert.ok(beginCountingTablePhase(s, run, 'departure', { enforcement: 60 }));
    const gold = s.hero.gold, day = s.day; assert.ok(withdrawCountingTableCase(s, run));
    assert.equal(run.status, 'withdrawn'); assert.equal(s.day, day); assert.equal(s.hero.gold, gold); assert.equal(s.adventuring.loot.length, 0);
    assert.deepEqual(s.justice.takenProperties, []); assert.deepEqual(s.legal.incidents, []); roundtrip(s);
  }
});

test('zero attendance pauses the saved phase; stats, enforcement, reload and another theft do not reroll it', () => {
  const { s, run } = create(); prepare(s, run); assert.ok(beginCountingTablePhase(s, run, 'approach', { enforcement: 60 }));
  const commitment = structuredClone(run.attempt.approach.commitment), before = structuredClone(run);
  assert.equal(recordCountingTablePhaseAttendance(s, run, 'approach', { startedDay: s.day }), false); assert.deepEqual(run, before); roundtrip(s);
  s.day += 2; s.hero.skills.stealth += 3; s.justice.thefts += 2;
  assert.equal(beginCountingTablePhase(s, run, 'approach', { enforcement: 90 }), false); assert.deepEqual(run.attempt.approach.commitment, commitment);
  const startedDay = s.day++; assert.ok(recordCountingTablePhaseAttendance(s, run, 'approach', { startedDay }));
  assert.equal(resolveCountingTablePhase(s, run, 'approach', context(s)).status, 'opportunity');
  assert.equal(run.attempt.theftNumber, 3); assert.deepEqual(run.attempt.approach.commitment, commitment); roundtrip(s);
});

test('target changing after attended work truthfully blocks, retains time and allows withdrawal without replacement', () => {
  for (const change of [s => s.day = (Math.floor(s.day / 365) + 1) * 365,
    s => s.realm.sites.quay.merchant = { ...s.realm.sites.quay.merchant, id: 'actual-successor-owner' },
    s => s.world.locations[0].servicesAvailable = false]) {
    const { s, run } = create(); prepare(s, run); assert.ok(beginCountingTablePhase(s, run, 'approach', { enforcement: 60 }));
    const startedDay = s.day++; assert.ok(recordCountingTablePhaseAttendance(s, run, 'approach', { startedDay })); change(s);
    assert.equal(resolveCountingTablePhase(s, run, 'approach', context(s)).status, 'blocked'); assert.equal(s.adventuring.loot.length, 0);
    assert.equal(s.justice.thefts, 0); assert.equal(run.target.ownerId, 'actual-owner'); assert.ok(validateCountingTableCase(run, s));
    assert.ok(withdrawCountingTableCase(s, run)); roundtrip(s);
  }
});

test('capacity filling after departure attendance blocks atomic acquisition and can resume the same recorded phase', () => {
  const { s, run } = create(); prepare(s, run); phase(s, run, 'approach'); assert.ok(beginCountingTablePhase(s, run, 'departure', { enforcement: 60 }));
  const startedDay = s.day++; assert.ok(recordCountingTablePhaseAttendance(s, run, 'departure', { startedDay }));
  const commitment = structuredClone(run.attempt.departure.commitment);
  s.adventuring.loot = Array.from({ length: 160 }, (_, i) => ({ id: 'unrelated-' + i }));
  assert.equal(resolveCountingTablePhase(s, run, 'departure', context(s)).status, 'blocked'); assert.equal(run.status, 'active');
  assert.equal(run.lootId, null); assert.deepEqual(s.justice.takenProperties, []); roundtrip(s);
  s.adventuring.loot = []; const day = s.day;
  assert.equal(resolveCountingTablePhase(s, run, 'departure', context(s)).status, 'completed'); assert.equal(s.day, day);
  assert.deepEqual(run.attempt.departure.commitment, commitment); assert.equal(s.adventuring.loot.length, 1); roundtrip(s);
});

test('another silver acquisition after entry blocks the job final claim even if the earlier valuable is sold', () => {
  const { s, run } = create(); prepare(s, run); phase(s, run, 'approach');
  assert.ok(claimHouseholdSilver(s, householdSilver(s), { lootId: 'other-real-theft' })); s.adventuring.loot = [];
  assert.equal(beginCountingTablePhase(s, run, 'departure', { enforcement: 60 }), false);
  assert.equal(run.lootId, null); assert.ok(withdrawCountingTableCase(s, run)); assert.equal(s.adventuring.loot.length, 0); roundtrip(s);
});

test('successor availability cannot overwrite earned original testimony or change a completed historical target', () => {
  const { s, run } = create('inside'); prepare(s, run); const evidence = structuredClone(run.evidence);
  phase(s, run, 'approach'); phase(s, run, 'departure');
  s.realm.sites.quay.merchant = { id: 'successor-owner', name: 'A new merchant', stock: {} }; s.day += 365;
  assert.deepEqual(run.evidence.slice(0, 3), evidence); assert.equal(run.cast.quietTable.id, source().personId); roundtrip(s);
});

test('a later sale or closed legal report does not reconstruct silver or invalidate honest completion history', () => {
  const { s, run } = create('social'); prepare(s, run); phase(s, run, 'approach'); phase(s, run, 'departure');
  const original = structuredClone(run); s.adventuring.loot = []; s.legal.incidents = []; roundtrip(s);
  assert.deepEqual(run, original); assert.equal(resolveCountingTablePhase(s, run, 'departure', context(s)).status, 'unavailable');
  assert.equal(s.adventuring.loot.length, 0);
});

test('terminal validator rejects forged wins, early acquisition, duplicate assets and incompatible outcome proofs without throwing', () => {
  const { s, run } = create(); prepare(s, run); phase(s, run, 'approach'); phase(s, run, 'departure');
  for (const change of [s => s.justice.countingTableJob.attempt.departure.succeeded = false,
    s => s.justice.countingTableJob.attempt.approach.commitment.chance++, s => s.justice.countingTableJob.attempt.departure.commitment.roll = 99,
    s => s.justice.countingTableJob.completedDay--, s => s.justice.countingTableJob.lootId = 'unearned-id',
    s => s.justice.takenProperties = [], s => s.justice.countingTableJob.evidence = [],
    s => s.justice.countingTableJob.evidence[3].day = s.justice.countingTableJob.acceptedDay,
    s => s.justice.countingTableJob.status = 'withdrawn', s => s.justice.countingTableJob.attempt.reported = !s.justice.countingTableJob.attempt.reported,
    s => s.adventuring.loot.push(structuredClone(s.adventuring.loot[0])), s => s.adventuring.loot[0].value++,
    s => s.adventuring.loot[0].ownerId = 'successor-owner', s => s.adventuring.loot[0].day--,
    s => s.equipment.instances.push({ provenance: { lootId: s.justice.countingTableJob.lootId } })]) {
    const forged = structuredClone(s); change(forged);
    assert.doesNotThrow(() => validateCountingTableCase(forged.justice.countingTableJob, forged));
    assert.equal(validateCountingTableCase(forged.justice.countingTableJob, forged), false);
  }
});
