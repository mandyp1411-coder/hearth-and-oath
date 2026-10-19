import test from 'node:test';
import assert from 'node:assert/strict';
import { householdSilver, validateHouseholdSilver, householdSilverReason, propertyAlreadyTaken, takenPropertiesWith, claimHouseholdSilver, inheritTakenProperties } from '../dist/js/silver-property.js';
import { COUNTING_TABLE_METHODS, COUNTING_TABLE_STEPS, countingTableLife, makeCountingTableCase, nextCountingTablePreparation,
  recordCountingTablePreparation, countingTableRiskQuote, countingTableRolls, countingTablePhaseCommitment,
  validateCountingTablePhaseCommitment, validateCountingTableCase } from '../dist/js/counting-table-case.js';

// Small, explicitly controlled subsystem fixtures, not earned played lives.
// IDs deliberately differ from today's generated spelling: capture real source
// fields, never reverse-engineer a person's ID from a merchant or office ID.
function fixture() {
  return { seed: 'counting-table-leaf', age: 24, phase: 'adult', day: 8030, locationId: 'quay',
    dynasty: { activePersonId: 'actual-person-7', generation: 2 }, timeline: { birthDay: 7000 },
    hero: { gold: 24, skills: { stealth: 4, persuasion: 3, scholarship: 2 }, attributes: { agility: 7, presence: 6, intellect: 5 } },
    world: { locations: [{ id: 'quay', status: 'thriving', servicesAvailable: true }, { id: 'elsewhere', status: 'thriving', servicesAvailable: true }] },
    realm: { regions: [{ id: 'bellwater' }, { id: 'rainward' }], sites: {
      quay: { id: 'quay', regionId: 'bellwater', phase: 'town', merchant: { id: 'canonical-owner-A', name: 'Tova', stock: { iron_sword: 1 } } },
      elsewhere: { id: 'elsewhere', regionId: 'rainward', phase: 'village', merchant: { id: 'canonical-owner-B', name: 'Linn', stock: {} } },
    } }, rpg: { factions: [{ id: 'quiet_table', rank: 1 }] },
    cartography: { interior: { siteId: 'quay', roomId: 'market' }, offsite: false, pending: null },
    justice: { thefts: 0, takenProperties: [] }, adventuring: { loot: [] }, equipment: { instances: [] } };
}
function service(kind, subjectId, id, name, roomId = 'market') {
  return { kind, subjectId, personId: id, name, role: kind, locationId: 'quay', roomId,
    person: { id, name, role: kind, locationId: 'quay', available: true, alive: true } };
}
const merchant = () => service('merchant', 'market', 'actual-market-person-A', 'Tova');
const quiet = () => service('faction', 'quiet_table', 'actual-npc16-source-23', 'Maren', 'hall');
const accept = (s, method = 'stealth') => makeCountingTableCase(s, { method, merchantService: merchant(), quietTableService: quiet() });
function prepare(s, run) {
  for (const id of COUNTING_TABLE_STEPS[run.method]) {
    const provider = id === 'counter_copy_shared' ? quiet() : ['valuation_terms', 'valuation_entry_checked'].includes(id) ? merchant() : null;
    s.cartography.interior.roomId = provider?.roomId || 'market';
    const startedDay = s.day++;
    assert.equal(recordCountingTablePreparation(s, run, id, { startedDay, provider, willing: true }), true, id);
    assert.equal(validateCountingTableCase(run, s), true, id + ' validates');
  }
  s.cartography.interior.roomId = 'market';
  return run;
}

test('silver resolver captures the existing exact annual property and owner, without changing stock', () => {
  const s = fixture(), before = structuredClone(s), p = householdSilver(s);
  assert.equal(p.id, 'household-canonical-owner-A-22'); assert.equal(p.ownerId, s.realm.sites.quay.merchant.id);
  assert.equal(p.ownerName, 'Tova'); assert.equal(p.name, 'Tova’s engraved household silver');
  assert.equal(p.regionId, 'bellwater'); assert.ok(p.value >= 90 && p.value <= 140);
  assert.equal(validateHouseholdSilver(p, s), true); assert.equal(householdSilverReason(s, p), null); assert.deepEqual(s, before);
});

test('capture keeps actual owner and actual service person IDs separate, method and life bound', () => {
  const s = fixture(), before = structuredClone(s), run = accept(s, 'inside');
  assert.ok(run); assert.equal(run.target.ownerId, 'canonical-owner-A'); assert.equal(run.cast.merchant.id, 'actual-market-person-A');
  assert.equal(run.cast.merchant.sourceId, 'canonical-owner-A'); assert.equal(run.cast.quietTable.id, quiet().personId);
  assert.deepEqual(run.life, countingTableLife(s)); assert.equal(run.method, 'inside'); assert.equal(validateCountingTableCase(run, s), true);
  assert.deepEqual(s, before, 'a leaf capture does not accept or install itself');
  s.justice.countingTableJob = run; assert.equal(accept(s, 'social'), null, 'one case for this hero life');
  s.dynasty.activePersonId = 'another-real-person'; assert.equal(validateCountingTableCase(run, s), false, 'no inherited private preparation');
});

test('adult/region/current-owner/source and inside-relationship requirements reject without mutation', () => {
  for (const change of [s => s.age = 17, s => s.phase = 'childhood', s => s.realm.sites.quay.regionId = 'rainward',
    s => s.realm.sites.quay.merchant.retired = true, s => s.justice.takenProperties.push(householdSilver(s).id)]) {
    const s = fixture(); change(s); const before = structuredClone(s); assert.equal(accept(s), null); assert.deepEqual(s, before);
  }
  const s = fixture(); s.rpg.factions[0].rank = 0; assert.equal(accept(s, 'inside'), null); assert.ok(accept(s, 'stealth'));
  const wrong = merchant(); wrong.person.id = 'different-source'; assert.equal(makeCountingTableCase(s, { method: 'stealth', merchantService: wrong }), null);
  const ownerAsPerson = merchant(); ownerAsPerson.personId = ownerAsPerson.person.id = s.realm.sites.quay.merchant.id;
  assert.equal(makeCountingTableCase(s, { method: 'stealth', merchantService: ownerAsPerson }), null);
});

test('each method earns three distinct, ordered one-day proofs and exactly three preparation days', () => {
  for (const method of COUNTING_TABLE_METHODS) {
    const s = fixture(), run = accept(s, method), day = s.day, gold = s.hero.gold;
    prepare(s, run); assert.equal(s.day, day + 3); assert.equal(s.hero.gold, gold); assert.equal(run.stage, 'prepared');
    assert.equal(nextCountingTablePreparation(run), null); assert.deepEqual(run.work.map(w => w.id), COUNTING_TABLE_STEPS[method]);
    assert.deepEqual(run.evidence.map(e => e.id), COUNTING_TABLE_STEPS[method]);
    assert.ok(run.evidence.every(e => e.objectId === run.target.id));
    assert.equal(s.adventuring.loot.length, 0); assert.equal(s.justice.takenProperties.length, 0);
    const saved = JSON.parse(JSON.stringify(run)); assert.deepEqual(saved, run); assert.equal(validateCountingTableCase(saved, s), true);
  }
});

test('a payment, zero attended day, old visit, wrong method or repeated preparation gives no proof', () => {
  const s = fixture(), run = accept(s), before = structuredClone(run);
  s.hero.gold = 10000;
  assert.equal(recordCountingTablePreparation(s, run, 'silver_inspected', { startedDay: s.day }), false);
  assert.equal(recordCountingTablePreparation(s, run, 'valuation_terms', { startedDay: s.day - 1, provider: merchant() }), false);
  assert.deepEqual(run, before);
  const startedDay = s.day++; assert.ok(recordCountingTablePreparation(s, run, 'silver_inspected', { startedDay }));
  const after = structuredClone(run); assert.equal(recordCountingTablePreparation(s, run, 'silver_inspected', { startedDay }), false); assert.deepEqual(run, after);
});

test('inside information requires the exact willing living source at their real current room', () => {
  const s = fixture(), run = accept(s, 'inside'); let startedDay = s.day++;
  assert.ok(recordCountingTablePreparation(s, run, 'silver_inspected', { startedDay }));
  s.cartography.interior.roomId = 'hall'; startedDay = s.day++;
  const noConsent = structuredClone(run);
  assert.equal(recordCountingTablePreparation(s, run, 'counter_copy_shared', { startedDay, provider: quiet() }), false);
  assert.deepEqual(run, noConsent, 'current presence alone is not a willing reply');
  for (const change of [p => p.personId = p.person.id = 'successor-person', p => p.person.alive = false,
    p => p.person.available = false, p => p.person.retired = true, p => p.roomId = 'tavern', p => p.subjectId = 'other_faction']) {
    const source = quiet(); change(source); s.cartography.interior.roomId = 'hall'; const before = structuredClone(run); startedDay = s.day++;
    assert.equal(recordCountingTablePreparation(s, run, 'counter_copy_shared', { startedDay, provider: source, willing: true }), false); assert.deepEqual(run, before);
  }
  startedDay = s.day++; assert.ok(recordCountingTablePreparation(s, run, 'counter_copy_shared', { startedDay, provider: quiet(), willing: true }));
  assert.deepEqual(run.evidence.at(-1).actorIds, [quiet().personId]); assert.equal(run.evidence.at(-1).disposition, 'willing');
});

test('prepared historical proof remains valid after source/owner retirement or valuation year ends, but target blocks', () => {
  const s = fixture(), run = prepare(s, accept(s, 'inside'));
  s.realm.sites.quay.merchant = { id: 'actual-replacement-owner', name: 'New Merchant', stock: {} };
  s.day += 365;
  assert.equal(validateCountingTableCase(run, s), true); assert.match(householdSilverReason(s, run.target), /original merchant/);
  assert.equal(run.cast.quietTable.id, quiet().personId); assert.equal(run.target.ownerId, 'canonical-owner-A');
});

test('preparation validator rejects forged identity, target, temporal, method and unsupported proofs', () => {
  const s = fixture(), run = prepare(s, accept(s, 'social'));
  for (const change of [r => r.target.id += '-replacement', r => r.target.value++, r => r.target.worldYear++, r => r.regionId = 'rainward',
    r => r.cast.merchant.id = r.target.ownerId, r => r.method = 'stealth', r => r.evidence[1].actorIds = ['successor-person'],
    r => r.evidence[0].day = r.acceptedDay, r => r.work[1].startedDay = r.work[0].startedDay,
    r => r.evidence[1].verified = false, r => r.evidence[1].disposition = 'refused', r => r.evidence[0].sourceRevision = 1,
    r => r.evidence[0].objectId = null, r => r.evidence.push(structuredClone(r.evidence[0])), r => r.surpriseReward = 1000]) {
    const altered = structuredClone(run); change(altered); assert.equal(validateCountingTableCase(altered, s), false);
  }
});

test('risk quotes disclose separate chances, exact same five days, zero Gold and actual enforcement', () => {
  const s = fixture(), expected = { stealth: [70, 86, 20], social: [77, 69, 35], inside: [78, 76, 25] }, before = structuredClone(s);
  for (const method of COUNTING_TABLE_METHODS) {
    const run = accept(s, method), quote = countingTableRiskQuote(s, run, { enforcement: 60 });
    assert.deepEqual([quote.entryChance, quote.escapeChance, quote.witnessChance], expected[method]);
    assert.equal(quote.combinedChance, Math.round(quote.entryChance * quote.escapeChance / 10) / 10);
    assert.equal(quote.totalDays, 5); assert.equal(quote.preparationDays + quote.approachDays + quote.departureDays, 5);
    assert.equal(quote.cost, 0); assert.equal(quote.failureEvidence, 3); assert.equal(quote.householdCostsSeparate, true);
    assert.equal(countingTableRiskQuote(s, run), null, 'no guessed regional law');
  }
  assert.deepEqual(s, before);
});

test('a committed phase freezes disclosed inputs, law and roll across interruption, training and reload', () => {
  const s = fixture(), run = accept(s, 'social'), frozen = countingTablePhaseCommitment(s, run, 'approach', { enforcement: 60 });
  assert.equal(frozen.chance, 77); assert.equal(validateCountingTablePhaseCommitment(frozen, run, s), true);
  s.day++; s.hero.skills.persuasion += 5; s.hero.attributes.presence += 2;
  assert.equal(countingTableRiskQuote(s, run, { enforcement: 90 }).entryChance, 90);
  assert.equal(frozen.chance, 77); assert.equal(frozen.enforcement, 60); assert.equal(validateCountingTablePhaseCommitment(frozen, run, s), true);
  assert.equal(validateCountingTablePhaseCommitment(JSON.parse(JSON.stringify(frozen)), run, s), true);
  for (const change of [q => q.chance++, q => q.roll = (q.roll + 1) % 100, q => q.skill = 'stealth', q => q.method = 'stealth',
    q => q.committedDay = s.day + 1, q => q.witnessChance++, q => q.undisclosed = true]) {
    const forged = structuredClone(frozen); change(forged); assert.equal(validateCountingTablePhaseCommitment(forged, run, s), false);
  }
  const departure = countingTablePhaseCommitment(s, run, 'departure', { enforcement: 90 });
  assert.equal(departure.chance, 80); assert.equal(departure.witnessChance, 45);
});

test('risk caps and per-job rolls are deterministic across reload, elapsed days and unrelated thefts', () => {
  const s = fixture(), run = accept(s), rolls = countingTableRolls(s, run);
  s.hero.skills.stealth = 10000; s.hero.attributes.agility = 10000;
  const quote = countingTableRiskQuote(s, run, { enforcement: 100 }); assert.equal(quote.entryChance, 85); assert.equal(quote.escapeChance, 90);
  s.justice.thefts = 123; s.day += 2; assert.deepEqual(countingTableRolls(s, run), rolls);
  assert.deepEqual(countingTableRolls(s, JSON.parse(JSON.stringify(run))), rolls); assert.ok(Object.values(rolls).every(n => n >= 0 && n < 100));
});

test('claim creates one existing stolen valuable and no Gold, stock, gear or invented receipt', () => {
  const s = fixture(), target = householdSilver(s), gold = s.hero.gold, stock = structuredClone(s.realm.sites.quay.merchant.stock), gear = structuredClone(s.equipment);
  const loot = claimHouseholdSilver(s, target, { lootId: 'theft-2-1' }); assert.ok(loot); assert.equal(loot.name, target.name);
  assert.deepEqual(loot, { id: 'theft-2-1', name: target.name, value: target.value, stolen: true, source: 'quay', day: s.day,
    ownerId: target.ownerId, ownerName: target.ownerName, propertyId: target.id });
  assert.deepEqual(s.justice.takenProperties, [target.id]); assert.equal(s.adventuring.loot.length, 1);
  assert.equal(s.hero.gold, gold); assert.deepEqual(s.realm.sites.quay.merchant.stock, stock); assert.deepEqual(s.equipment, gear);
  assert.equal(s.justice.propertyTransfers, undefined); assert.equal(propertyAlreadyTaken(s, target.id), true);
  const after = structuredClone(s); assert.equal(claimHouseholdSilver(s, target, { lootId: 'theft-2-2' }), null); assert.deepEqual(s, after);
});

test('a prior burglary, a removed/fenced asset, or historical completed job prevents a second claim', () => {
  for (const source of ['taken', 'carried', 'case', 'gear', 'receipt']) {
    const s = fixture(), target = householdSilver(s);
    if (source === 'taken') s.justice.takenProperties.push(target.id); // Existing sale can remove the loot, not this claim.
    if (source === 'carried') s.adventuring.loot.push({ id: 'earlier', stolen: true, propertyId: target.id });
    if (source === 'case') s.justice.countingTableJob = { status: 'completed', target };
    if (source === 'gear') s.equipment.instances.push({ stolen: true, provenance: { propertyId: target.id } });
    if (source === 'receipt') s.justice.propertyTransfers = [{ stolen: true, provenance: { propertyId: target.id } }];
    const before = structuredClone(s); assert.equal(claimHouseholdSilver(s, target, { lootId: 'later' }), null, source); assert.deepEqual(s, before);
  }
});

test('year, owner, jurisdiction, closure, location and capacity changes cannot retarget or partially grant', () => {
  for (const change of [s => s.day = (Math.floor(s.day / 365) + 1) * 365, s => s.realm.sites.quay.merchant.id = 'replacement',
    s => s.realm.sites.quay.regionId = 'rainward', s => s.world.locations[0].status = 'destroyed',
    s => s.realm.politics = { holds: [{ siteId: 'quay', status: 'held' }] }, s => s.locationId = 'elsewhere',
    s => s.adventuring.loot = Array.from({ length: 160 }, (_, i) => ({ id: 'full-' + i }))]) {
    const s = fixture(), target = householdSilver(s); change(s); const before = structuredClone(s);
    assert.equal(claimHouseholdSilver(s, target, { lootId: 'attempt' }), null); assert.deepEqual(s, before);
  }
});

test('bounded history preserves current exact silver and the accepted case through many later stock claims', () => {
  const s = fixture(), target = householdSilver(s); s.justice.countingTableJob = accept(s);
  s.justice.takenProperties = [target.id, ...Array.from({ length: 199 }, (_, i) => 'old-stock-' + i)];
  for (let i = 0; i < 250; i++) s.justice.takenProperties = takenPropertiesWith(s, 'later-stock-' + i);
  assert.equal(s.justice.takenProperties.length, 200); assert.ok(s.justice.takenProperties.includes(target.id));
  assert.equal(new Set(s.justice.takenProperties).size, 200); assert.equal(takenPropertiesWith(s, ''), null);
});

test('succession clones only the actual bounded world claims, never guilt, private testimony or job odds', () => {
  const old = fixture(), next = fixture(), target = householdSilver(old);
  old.justice.takenProperties = [target.id]; old.justice.countingTableJob = accept(old); old.justice.prison = { evidence: 9 };
  old.legal = { incidents: [{ locationId: old.locationId, evidence: 9, description: 'The earlier hero’s charge.' }] };
  next.justice = { version: 1, takenProperties: [], thefts: 0, prison: null, arrest: null, history: [] }; next.legal = { incidents: [] };
  const before = structuredClone(old); assert.equal(inheritTakenProperties(old, next), true);
  assert.deepEqual(next.justice.takenProperties, [target.id]); assert.notEqual(next.justice.takenProperties, old.justice.takenProperties);
  assert.equal(next.justice.countingTableJob, undefined); assert.equal(next.justice.thefts, 0); assert.equal(next.justice.prison, null); assert.deepEqual(next.legal.incidents, []);
  next.justice.takenProperties.push('another-world-claim'); assert.deepEqual(old, before);
  assert.equal(propertyAlreadyTaken(next, target.id), true);
  for (const invalid of [null, ['x'.repeat(241)], Array.from({ length: 201 }, () => 'x'), [123]]) {
    const bad = fixture(), destination = fixture(); bad.justice.takenProperties = invalid; const original = structuredClone(destination);
    assert.equal(inheritTakenProperties(bad, destination), false); assert.deepEqual(destination, original);
  }
});

test('absent legacy world claims remain compatible without changing the original', () => {
  for (const omitJustice of [false, true]) {
    const old = fixture(), next = fixture();
    if (omitJustice) delete old.justice;
    else delete old.justice.takenProperties;
    const before = structuredClone(old);
    assert.equal(inheritTakenProperties(old, next), true);
    assert.deepEqual(next.justice.takenProperties, []); assert.deepEqual(old, before);
  }
});
