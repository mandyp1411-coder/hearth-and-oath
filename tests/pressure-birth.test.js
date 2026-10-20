import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { STATIONS, rollStation, rollBirthCircumstances, heirStation, stationDues, comeOfAge, householdPhysician } from '../dist/js/station.js';
import { rollLifeCircumstances, originStations, originById } from '../dist/js/origins.js';
import { householdAnnualCost } from '../dist/js/budget.js';
import { onFortuneTime, flushWinterEvent, applyWinterChoice } from '../dist/js/fortune.js';

const journal = () => { const rows = []; return { rows, ctx: { journal: (title, text, tag) => rows.push({ title, text, tag }), setEvent: () => {}, killPerson: () => false } }; };
const answer = s => s.event.id === 'health_concern' && s.event.choices.some(c => c.id === 'rest') ? 'rest' : s.event.choices[0].id;
function grow(s, to) {
  for (let n = 0; n < 700 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, answer(s));
  return s;
}

test('station is rolled by rarity: most births are hard, royal blood is under one in two hundred', () => {
  const count = {};
  for (let i = 0; i < 3000; i++) { const id = rollStation(`rarity-${i}`); count[id] = (count[id] || 0) + 1; }
  const share = id => (count[id] || 0) / 3000;
  assert.ok(share('bound') > 0.30 && share('bound') < 0.40, `bound ${share('bound')}`);
  assert.ok(share('common') > 0.35 && share('common') < 0.45, `common ${share('common')}`);
  assert.ok(share('trade') > 0.13 && share('trade') < 0.21, `trade ${share('trade')}`);
  assert.ok(share('gentry') > 0.03 && share('gentry') < 0.09, `gentry ${share('gentry')}`);
  assert.ok(share('noble') < 0.03, `noble ${share('noble')}`);
  assert.ok(share('royal') < 0.01 && share('royal') > 0, `royal ${share('royal')}`);
  assert.equal(STATIONS.reduce((n, s) => n + s.weight, 0), 1000);
  // Deterministic for a seed.
  assert.equal(rollStation('the-same'), rollStation('the-same'));
  assert.deepEqual(rollBirthCircumstances('the-same', 'bound', 'orc'), rollBirthCircumstances('the-same', 'bound', 'orc'));
});

test('a birth decides freedom, debt, letters, diet, roof and who the family owes, in the ancestry’s own words', () => {
  const bound = rollBirthCircumstances('born-owing', 'bound', 'dwarf');
  assert.equal(bound.rank, 'a clanless family');
  assert.ok(['bound', 'owned'].includes(bound.freedom));
  assert.ok(bound.debt >= 120 && bound.debt <= 320);
  assert.ok(bound.ties.some(t => t.kind === 'owes'), 'a bound family owes someone by name');
  assert.equal(bound.diet, 0); assert.equal(bound.roof, 0);
  const royal = rollBirthCircumstances('born-high', 'royal', 'elf');
  assert.equal(royal.rank, 'one of the first lines');
  assert.equal(royal.freedom, 'free'); assert.equal(royal.debt, 0); assert.equal(royal.literate, true);
  assert.ok(royal.ties.some(t => t.kind === 'hates'), 'a high birth has enemies before it has teeth');
  assert.equal(royal.nameWeight, 'feared');
  // An origin's story is laid over a station it fits: a fallen house is never bound to the land it lost.
  assert.deepEqual(originStations(originById('fallen_house')), ['bound', 'common', 'trade', 'gentry', 'noble', 'royal']);
  assert.deepEqual(originStations(originById('halfling_seedcellar')), ['bound', 'common']);
  for (let i = 0; i < 40; i++) {
    const fate = rollLifeCircumstances(`fit-${i}`, 'random', 'halfling');
    assert.ok(originStations(originById(fate.originId)).includes(fate.station.id), `${fate.originId} fits ${fate.station.id}`);
    assert.equal(fate.household, STATIONS.find(s => s.id === fate.station.id).means);
  }
});

test('the record is kept on the hero, the household reads or does not, and the save stays valid', () => {
  const s = engine.createBirthGame({ seed: 'station-record' });
  assert.ok(STATIONS.some(st => st.id === s.hero.station.id));
  assert.equal(typeof s.family.literate, 'boolean');
  assert.equal(s.family.support, STATIONS.find(st => st.id === s.hero.station.id).support);
  assert.match(s.journal[0].text, /was born in .* to a[n]? /);
  assert.equal(engine.validateSave(s), true);
  const broken = structuredClone(s); broken.hero.station.freedom = 'king';
  assert.equal(engine.validateSave(broken), false);
  // A bare household narrows the ladder instead of ignoring it.
  const noble = engine.createBirthGame({ seed: 'station-noble', household: 'noble' });
  assert.ok(['gentry', 'noble', 'royal'].includes(noble.hero.station.id));
  assert.equal(noble.hero.household, 'noble');
  // A caller that passes no station at all gets none: older rules, older heirs.
  assert.equal(engine.createBirthGame({ seed: 'station-none', station: null }).hero.station, undefined);
});

test('at eighteen the house hands over a portion, or the family’s debt and bond', () => {
  const rich = engine.createBirthGame({ seed: 'portion-rich', station: rollBirthCircumstances('portion-rich', 'noble', 'human') });
  rich.age = 18; rich.day = 18 * 365; rich.phase = 'adult';
  const { rows, ctx } = journal();
  const before = rich.hero.gold;
  comeOfAge(rich, ctx); comeOfAge(rich, ctx);
  assert.equal(rich.hero.gold - before, 600, 'a noble portion, once');
  assert.equal(rows.length, 1);
  const owing = engine.createBirthGame({ seed: 'portion-owing', station: { ...rollBirthCircumstances('portion-owing', 'bound', 'human'), freedom: 'owned', debt: 200 } });
  owing.age = 18; owing.day = 18 * 365; owing.phase = 'adult';
  const o = journal();
  comeOfAge(owing, o.ctx);
  assert.equal(owing.householdBudget.debt, 200);
  assert.equal(owing.householdBudget.bondedUntil, owing.day + 730, 'two years of labour owed on the bond');
  assert.match(o.rows[0].text, /yours now/);
  assert.equal(stationDues(owing), 80);
  assert.ok(householdAnnualCost(owing) >= 180 + 80, 'dues are part of what the year costs');
});

test('through the public engine a bound life comes of age owing, and a gentry one comes of age with rents', () => {
  let poor = engine.createBirthGame({ seed: 'eighteen-poor', station: rollBirthCircumstances('eighteen-poor', 'bound', 'human') });
  poor = grow(poor, 19);
  if (poor.phase !== 'retired') {
    assert.equal(poor.age, 19);
    assert.ok(poor.householdBudget.debt > 0, `born owing: ${poor.householdBudget.debt}`);
    assert.ok(poor.journal.some(e => e.title === 'What you were born owing'));
    assert.equal(engine.validateSave(poor), true);
  }
  let high = engine.createBirthGame({ seed: 'eighteen-high', station: rollBirthCircumstances('eighteen-high', 'gentry', 'human') });
  high = grow(high, 19);
  assert.equal(high.age, 19);
  assert.ok(high.hero.gold >= 200, `a portion and a year of rents: ${high.hero.gold}`);
  assert.ok(high.journal.some(e => e.title === 'Your portion'));
  assert.equal(high.householdBudget.debt, 0);
});

test('children of the bound and the common are nursed at home; houses with means keep a physician', () => {
  const low = engine.createBirthGame({ seed: 'nurse-low', station: rollBirthCircumstances('nurse-low', 'common', 'human') });
  const high = engine.createBirthGame({ seed: 'nurse-high', station: rollBirthCircumstances('nurse-high', 'gentry', 'human') });
  assert.equal(householdPhysician(low), 'none'); assert.equal(householdPhysician(high), 'household');
  for (const born of [low, high]) {
    const s = grow(born, 9);
    if (s.phase === 'retired') continue;
    s.health.physical.push({ id: 'fever-test', type: 'fever', severity: 2, sinceDay: s.day, lastEffectDay: s.day, careUntil: 0, acknowledged: false });
    s.health.pending = { eventId: 'health_concern', conditionId: 'fever-test', kind: 'physical', offeredDay: s.day };
    const shown = engine.continueAgeUp(engine.ageUp(s));
    const ids = (shown.event?.id === 'health_concern' ? shown.event.choices : []).map(c => c.id);
    assert.ok(ids.includes('rest'), `${s.hero.station.id}: rest is always there (${shown.event?.id})`);
    assert.equal(ids.includes('care'), s.hero.station.id === 'gentry', `${s.hero.station.id}: a healer comes only to a door that pays`);
  }
});

test('a hard winter falls on the poor: the winter is a decision from eight, and the youngest may not see the thaw', async () => {
  const s = engine.createBirthGame({ seed: 'winter-house', station: rollBirthCircumstances('winter-house', 'bound', 'human') });
  // Live to nine through the engine so every record exists, then force a hard winter season.
  let lived = grow(s, 9);
  if (lived.phase === 'retired') return;
  const f = lived.fortune;
  let season = f.lastSeason + 1; while (season % 4 !== 3) season++;
  // Find a season whose roll lands, scanning forward with the real roll.
  const { seededRoll } = await import('../dist/js/world.js');
  while (seededRoll(lived.seed, `fortune:winter:${season}`, 100) >= 24) season += 4;
  f.lastSeason = season - 1; lived.day = season * 92; lived.age = Math.floor(lived.day / 365);
  const bodilyBefore = lived.life.health;
  onFortuneTime(lived, { oldDay: lived.day - 1, newDay: lived.day }, {});
  assert.ok(f.pending, 'the winter waits for a quiet moment');
  assert.ok(lived.life.health < bodilyBefore, 'the cold lands at once');
  let event = null;
  flushWinterEvent(lived, { setEvent: (id, title, category, body, choices) => { event = { id, title, body, choices }; lived.event = event; } });
  assert.equal(event?.id, 'hard_winter');
  assert.ok(event.choices.map(c => c.id).includes('share'));
  assert.ok(!event.choices.some(c => c.id === 'poach'), 'no nature, no hare');
  const killed = [];
  const ctx = { journal: () => {}, killPerson: (id, cause, day, wording) => { killed.push({ id, wording }); return true; } };
  assert.equal(applyWinterChoice(lived, 'hard_winter', 'share', ctx), true);
  assert.equal(lived.fortune.pending, null);
  assert.equal(lived.fortune.winters.shared, 1);
  if (killed.length) { assert.match(killed[0].wording.text, /did not see the thaw/); assert.ok(lived.hero.marks.some(m => m.id === 'bereaved')); }
});

test('a cradle that dies in childhood is drawn again, and the heir of a ruined house is born a rung lower', async () => {
  const { createLifeAtAge } = await import('../dist/js/new-life.js');
  const s = await createLifeAtAge({ seed: 'survivor-1', startAge: 18 });
  assert.equal(s.age, 18);
  assert.ok(s.hero.station);
  assert.equal(engine.validateSave(s), true);
  // Falling and climbing are both real.
  const parent = engine.createBirthGame({ seed: 'heir-fall', station: rollBirthCircumstances('heir-fall', 'trade', 'human') });
  parent.householdBudget.debt = 300; parent.life.home = { ...parent.life.home, tier: 'lodgings' };
  assert.equal(heirStation(parent, 'heir-fall:1', 'human').id, 'common');
  parent.householdBudget.debt = 0; parent.life.home = { ...parent.life.home, tier: 'estate' };
  assert.equal(heirStation(parent, 'heir-fall:2', 'human').id, 'gentry');
  const bonded = engine.createBirthGame({ seed: 'heir-bond', station: { ...rollBirthCircumstances('heir-bond', 'bound', 'human'), freedom: 'owned' } });
  bonded.householdBudget.bondedUntil = bonded.day + 100;
  assert.equal(heirStation(bonded, 'heir-bond:1', 'human').freedom, 'owned', 'a bond not worked off passes down');
});

test('the bound are not schooled unless someone at home reads; the academy does not take them at all', async () => {
  const s = engine.createBirthGame({ seed: 'no-school', station: { ...rollBirthCircumstances('no-school', 'bound', 'human'), freedom: 'bound' } });
  let lived = grow(s, 7);
  if (lived.phase === 'retired') return;
  const { householdActions } = await import('../dist/js/household.js');
  lived.family.literate = false;
  const community = householdActions(lived).find(a => a.id === 'school_enroll_community');
  assert.ok(community?.disabledReason, 'no school for a bound child in a house that does not read');
  assert.match(community.disabledReason, /field does not wait/);
  assert.ok(!/field does not wait/.test(householdActions(lived).find(a => a.id === 'school_enroll_apprenticeship')?.disabledReason || ''), 'a trade is still a door');
  lived.family.literate = true;
  assert.ok(!/field does not wait/.test(householdActions(lived).find(a => a.id === 'school_enroll_community')?.disabledReason || ''));
  lived.age = 12;
  assert.match(householdActions(lived).find(a => a.id === 'school_enroll_academy')?.disabledReason || '', /does not take the bound/);
  lived.hero.station.freedom = 'owned';
  assert.match(householdActions(lived).find(a => a.id === 'school_enroll_apprenticeship')?.disabledReason || '', /spoken for/);
  // Through the public engine the refusal holds: the action is not performed.
  lived.age = 7; lived.family.literate = false; lived.hero.station.freedom = 'bound';
  const tried = engine.chooseAction(lived, 'school_enroll_community');
  assert.equal(tried.education.enrolled, false);
});
