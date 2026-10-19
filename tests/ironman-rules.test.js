import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isIronman,
  validateIronman,
  createIronmanMetadata,
  currentIronmanPerson,
  captureBattleMortality,
  validateBattleMortality,
  recordCombatZero,
  ironmanBattleDeaths,
  ironmanHeroDeath,
  validateCasualtyFloor,
  mergeCasualtyFloor,
} from '../dist/js/ironman.js';

// Controlled pure-module fixtures prove only the Ironman identity, captured
// mortality and casualty-floor contract. These are not generated lives and do
// not claim engine, durable-store, browser or release acceptance.
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const copy = value => structuredClone(value);
const personId = id => `line-test-g1-companion-${id}`;
const row = (s, id) => s.lineage.people.find(p => p.id === id);
const actor = (b, id) => b.actors.find(a => a.id === id);

function companion(id, patch = {}) {
  return { id, name: id, role: 'warrior', bornDay: -1000, alive: true,
    recruited: true, active: true, hp: 20, maxHp: 40, mp: 10, maxMp: 20,
    agility: 5, ...patch };
}

function fixture({ optedIn = true, companions = ['mira', 'kest', 'orrin'] } = {}) {
  const roster = companions.map(id => typeof id === 'string' ? companion(id) : copy(id));
  const s = { revision: 5, seed: 'same-seed', day: 100, phase: 'adult', battle: null,
    hero: { name: 'Same hero', hp: 30, maxHp: 50, mp: 10, maxMp: 20 },
    dynasty: { id: 'line-test', generation: 1, activePersonId: 'line-test-g1-hero-hero', history: [] },
    lineage: { people: [{ id: 'line-test-g1-hero-hero', source: 'hero', localId: 'hero',
      name: 'Same hero', bornDay: 0, alive: true, deathDay: null },
    ...roster.map(p => ({ id: personId(p.id), source: 'companion', localId: p.id,
      name: p.name, bornDay: p.bornDay, alive: p.alive, deathDay: p.deathDay ?? null }))] },
    companions: roster,
    rpg: { companionStages: Object.fromEntries(roster.map(p => [p.id, { id: p.id,
      stage: 0, status: p.alive === false ? 'dead' : 'available', choices: [] }])) } };
  if (optedIn) s.ironman = { version: 1, runId: RUN, startedDay: 90, casualties: [] };
  return s;
}

function rememberDeath(s, id = 'mira', { day = 99, battleId = 'earlier-battle', generation = 1 } = {}) {
  const p = s.companions.find(p => p.id === id), line = row(s, personId(id));
  p.alive = false; p.active = false; p.recruited = false; p.hp = 0; p.deathDay = day;
  line.alive = false; line.deathDay = day;
  s.rpg.companionStages[id].status = 'dead';
  const casualty = { personId: line.id, day, battleId, generation };
  s.ironman.casualties.push(casualty);
  return casualty;
}

function battleFixture(s = fixture(), { nonlethal = false } = {}) {
  // This helper's nonlethal branch represents the verified solo watchhouse
  // context, not every possible nonlethal encounter policy.
  const recruited = nonlethal ? [] : s.companions.filter(p => p.recruited && p.active).slice(0, 3)
    .filter(p => p.alive !== false && p.hp > 0);
  const actors = [{ id: 'hero', side: 'party', hp: s.hero.hp, maxHp: s.hero.maxHp,
    status: {}, name: s.hero.name }, ...recruited.map(p => ({ id: p.id,
    side: 'party', hp: p.hp, maxHp: p.maxHp, status: {}, name: p.name })),
  { id: 'enemy-1', side: 'enemy', hp: 30, maxHp: 30, status: {}, name: 'Foe' },
  { id: 'ash_attendant', side: 'party', hp: 18, maxHp: 18, ephemeral: true,
    status: {}, name: 'Temporary ally' }];
  const b = { instanceId: 'battle-100-1', encounterId: nonlethal ? 'watchhouse_duel' : 'forest',
    actors, turnOrder: actors.map(p => p.id), currentActorId: 'hero', round: 1,
    outcome: null, rulesVersion: 18, log: [], rewards: { gold: 0, exp: 0 } };
  if (nonlethal) { b.tournamentRulesVersion = 1; b.context = { kind: 'tournament' }; }
  const mortality = captureBattleMortality(s, { nonlethal, solo: nonlethal });
  if (mortality !== undefined) b.mortality = mortality;
  return b;
}

function zero(b, id, previousHp = actor(b, id).hp) {
  actor(b, id).hp = 0;
  recordCombatZero(b, id, previousHp);
}

test('Standard absence is not an opt-in, while every own metadata claim is Ironman even when malformed', () => {
  const standard = fixture({ optedIn: false }), before = copy(standard);
  assert.equal(isIronman(standard), false);
  assert.equal(validateIronman(standard), true);
  assert.equal(captureBattleMortality(standard), undefined);
  assert.equal(ironmanHeroDeath(standard), null);
  assert.deepEqual(standard, before);
  assert.equal(Object.hasOwn(standard, 'ironman'), false);
  for (const value of [undefined, null, false, '', [], {}, { version: 1 }]) {
    const s = fixture({ optedIn: false }); s.ironman = value;
    assert.equal(isIronman(s), true, `present ${String(value)} must not downgrade to Standard`);
    assert.equal(validateIronman(s), false);
    assert.throws(() => captureBattleMortality(s));
    assert.equal(Object.hasOwn(s, 'ironman'), true, 'validation never strips a malformed claim');
  }
  const inherited = Object.assign(Object.create({ ironman: fixture().ironman }), standard);
  assert.equal(isIronman(inherited), false, 'only an own metadata claim opts in');
});

test('minimal exact metadata validates without mutating it or adding fields', () => {
  const s = fixture(), before = copy(s);
  assert.equal(isIronman(s), true);
  assert.equal(validateIronman(s), true);
  assert.deepEqual(s, before);
});

for (const [label, change] of [
  ['unsupported version', s => s.ironman.version = 2],
  ['non-v4 run identity', s => s.ironman.runId = '00112233-4455-1677-8899-aabbccddeeff'],
  ['invalid UUID variant', s => s.ironman.runId = '00112233-4455-4677-7899-aabbccddeeff'],
  ['seed-like identity', s => s.ironman.runId = s.seed],
  ['noncanonical uppercase UUID', s => s.ironman.runId = RUN.toUpperCase()],
  ['missing start day', s => delete s.ironman.startedDay],
  ['future start', s => s.ironman.startedDay = s.day + 1],
  ['negative start', s => s.ironman.startedDay = -1],
  ['fractional start', s => s.ironman.startedDay = 90.5],
  ['missing casualties', s => delete s.ironman.casualties],
  ['non-array casualties', s => s.ironman.casualties = {}],
  ['unexpected metadata key', s => s.ironman.enabled = true],
  ['missing lineage', s => delete s.lineage],
  ['missing active hero identity', s => s.dynasty.activePersonId = 'unknown-person'],
  ['duplicate exact person identity', s => s.lineage.people.push(copy(s.lineage.people[0]))],
]) test(`metadata rejects ${label} without repairing the state`, () => {
  const s = fixture(); change(s); const before = copy(s);
  assert.equal(validateIronman(s), false);
  assert.deepEqual(s, before);
});

test('creation uses supplied secure UUIDs, remains detached and never derives run identity from seed or name', () => {
  const s = fixture({ optedIn: false }), before = copy(s);
  const ids = [RUN, OTHER_RUN];
  const cryptoProvider = { randomUUID() { return ids.shift(); } };
  const first = createIronmanMetadata(s, cryptoProvider);
  const second = createIronmanMetadata(s, cryptoProvider);
  assert.deepEqual(first, { version: 1, runId: RUN, startedDay: 100, casualties: [] });
  assert.deepEqual(second, { version: 1, runId: OTHER_RUN, startedDay: 100, casualties: [] });
  assert.match(first.runId, UUID_V4); assert.match(second.runId, UUID_V4);
  assert.notEqual(first.runId, second.runId);
  first.casualties.push({ personId: 'detached' });
  assert.deepEqual(second.casualties, []);
  assert.deepEqual(s, before);
  assert.equal(Object.hasOwn(s, 'ironman'), false);
});

test('secure random bytes generate canonical RFC4122 v4 identity with version and variant bits', () => {
  const s = fixture({ optedIn: false }), before = copy(s);
  const cryptoProvider = { getRandomValues(bytes) {
    for (let index = 0; index < bytes.length; index++) bytes[index] = index;
    return bytes;
  } };
  const metadata = createIronmanMetadata(s, cryptoProvider);
  assert.equal(metadata.runId, '00010203-0405-4607-8809-0a0b0c0d0e0f');
  assert.match(metadata.runId, UUID_V4);
  assert.deepEqual(s, before);
});

test('creation refuses existing claims, unusable secure randomness and invalid lineage without mutation', () => {
  for (const value of [fixture().ironman, null, undefined]) {
    const s = fixture({ optedIn: false }); s.ironman = value; const before = copy(s);
    assert.throws(() => createIronmanMetadata(s, { randomUUID: () => RUN }));
    assert.deepEqual(s, before);
  }
  for (const provider of [null, {}, { randomUUID: () => 'not-a-uuid' },
    { randomUUID() { throw new Error('secure randomness unavailable'); } }]) {
    const s = fixture({ optedIn: false }), before = copy(s);
    assert.throws(() => createIronmanMetadata(s, provider));
    assert.deepEqual(s, before);
  }
  for (const change of [s => delete s.lineage, s => delete s.dynasty,
    s => s.dynasty.activePersonId = 'missing', s => s.day = -1,
    s => s.lineage.people.push(copy(s.lineage.people[0])), s => s.battle = {},
    s => s.revision = 4]) {
    const s = fixture({ optedIn: false }); change(s); const before = copy(s);
    assert.throws(() => createIronmanMetadata(s, { randomUUID: () => RUN }));
    assert.deepEqual(s, before);
  }
});

test('creation requires a living positive-Health nonretired playable hero', () => {
  for (const change of [s => row(s, s.dynasty.activePersonId).alive = false,
    s => s.hero.hp = 0, s => s.hero.hp = -1, s => s.phase = 'retired']) {
    const s = fixture({ optedIn: false }); change(s); const before = copy(s);
    assert.throws(() => createIronmanMetadata(s, { randomUUID: () => RUN }));
    assert.deepEqual(s, before);
    assert.equal(Object.hasOwn(s, 'ironman'), false, 'a nonplayable opening never receives a mode claim');
  }
});

test('current identities resolve exact active hero and current-source companion, never historical roster-ID first match', () => {
  const s = fixture();
  const archived = { id: 'line-test-g0-companion-mira', source: 'ancestor', localId: 'mira',
    name: 'Earlier Mira', bornDay: -20000, alive: false, deathDay: 80 };
  s.lineage.people.unshift(archived);
  const oldHero = copy(s.lineage.people.find(p => p.source === 'hero'));
  oldHero.source = 'ancestor';
  const heir = { ...oldHero, id: 'line-test-g2-child-child-1', source: 'hero',
    name: 'Heir', bornDay: 40, alive: true, deathDay: null };
  s.lineage.people = s.lineage.people.filter(p => p.id !== oldHero.id);
  s.lineage.people.unshift(oldHero); s.lineage.people.push(heir);
  s.dynasty.activePersonId = heir.id; s.dynasty.generation = 2; s.hero.name = heir.name;
  const before = copy(s);
  assert.equal(currentIronmanPerson(s, 'hero').id, heir.id);
  assert.equal(currentIronmanPerson(s, 'mira').id, personId('mira'));
  assert.equal(currentIronmanPerson(s, 'unknown'), null);
  assert.equal(currentIronmanPerson(s, 'enemy-1'), null);
  assert.equal(currentIronmanPerson(s, 'ash_attendant'), null);
  assert.deepEqual(s, before);
});

test('capture exactly matches first-three active recruited living positive-HP slots and does not backfill excluded slots', () => {
  const s = fixture({ companions: [companion('tovin', { active: false }),
    companion('mira'), companion('kest', { hp: 0 }), companion('orrin', { alive: false }),
    companion('sable'), companion('vesper', { recruited: false })] });
  const before = copy(s), captured = captureBattleMortality(s);
  assert.deepEqual(captured, { version: 1, runId: RUN, lethal: true,
    participants: [{ actorId: 'hero', personId: s.dynasty.activePersonId, kind: 'hero' },
      { actorId: 'mira', personId: personId('mira'), kind: 'companion' }], deaths: [] });
  assert.deepEqual(s, before);
  captured.participants[0].personId = 'changed-detached-capture';
  captured.deaths.push({ actorId: 'mira', personId: personId('mira') });
  assert.deepEqual(s, before);
});

test('captured identities use the successor rather than names or reused historical actor IDs', () => {
  const s = fixture();
  const old = copy(row(s, personId('mira'))); old.source = 'ancestor'; old.alive = false; old.deathDay = 95;
  const current = { ...row(s, personId('mira')), id: 'line-test-g2-companion-mira', bornDay: 30 };
  s.lineage.people = s.lineage.people.filter(p => p.id !== old.id);
  s.lineage.people.unshift(old); s.lineage.people.push(current);
  s.companions[0].bornDay = current.bornDay; s.dynasty.generation = 2;
  const capture = captureBattleMortality(s);
  assert.equal(capture.participants.find(p => p.actorId === 'mira').personId, current.id);
  assert.notEqual(capture.participants.find(p => p.actorId === 'mira').personId, old.id);
});

test('capture refuses missing, ambiguous, deceased or birth-mismatched current companion identities', () => {
  for (const change of [s => s.lineage.people = s.lineage.people.filter(p => p.id !== personId('mira')),
    s => s.lineage.people.push(copy(row(s, personId('mira')))),
    s => row(s, personId('mira')).alive = false,
    s => row(s, personId('mira')).bornDay--]) {
    const s = fixture(); change(s); const before = copy(s);
    assert.throws(() => captureBattleMortality(s));
    assert.deepEqual(s, before);
  }
  const s = fixture();
  s.lineage.people.push(copy(row(s, personId('mira'))));
  assert.equal(currentIronmanPerson(s, 'mira'), null, 'duplicate current records do not choose an arbitrary person');
});

test('explicit solo nonlethal capture excludes recruited active companions', () => {
  const s = fixture(), before = copy(s);
  assert.deepEqual(captureBattleMortality(s, { nonlethal: true, solo: true }), { version: 1, runId: RUN,
    lethal: false, participants: [{ actorId: 'hero', personId: s.dynasty.activePersonId, kind: 'hero' }], deaths: [] });
  assert.deepEqual(s, before);
});

test('nonlethal capture defaults to the normal actual party unless solo is explicitly requested', () => {
  const s = fixture(), before = copy(s);
  const expected = { version: 1, runId: RUN, lethal: false,
    participants: [{ actorId: 'hero', personId: s.dynasty.activePersonId, kind: 'hero' },
      ...['mira', 'kest', 'orrin'].map(id => ({ actorId: id, personId: personId(id), kind: 'companion' }))], deaths: [] };
  assert.deepEqual(captureBattleMortality(s, { nonlethal: true }), expected);
  assert.deepEqual(captureBattleMortality(s, { nonlethal: true, solo: false }), expected);
  assert.deepEqual(s, before);
});

test('captured lethal rules validate and Standard battles remain metadata-free', () => {
  const s = fixture(), b = battleFixture(s), before = copy({ s, b });
  assert.equal(validateBattleMortality(b, s), true);
  assert.deepEqual({ s, b }, before);
  const standard = fixture({ optedIn: false }), ordinary = battleFixture(standard);
  assert.equal(Object.hasOwn(ordinary, 'mortality'), false);
  assert.equal(validateBattleMortality(ordinary, standard), true);
  assert.deepEqual(ironmanBattleDeaths(standard, ordinary), []);
  ordinary.mortality = copy(b.mortality);
  assert.equal(validateBattleMortality(ordinary, standard), false, 'Standard never silently adopts Ironman battle metadata');
});

test('a lethal companion positive-to-zero crossing latches one exact death without touching its source state', () => {
  const s = fixture(), before = copy(s), b = battleFixture(s);
  actor(b, 'mira').hp = -4;
  recordCombatZero(b, 'mira', 20);
  assert.equal(actor(b, 'mira').hp, 0);
  assert.equal(b.turnOrder.includes('mira'), false);
  assert.deepEqual(b.mortality.deaths, [{ actorId: 'mira', personId: personId('mira') }]);
  assert.equal(b.outcome, null);
  recordCombatZero(b, 'mira', 20); recordCombatZero(b, 'mira', 0);
  assert.equal(b.mortality.deaths.length, 1, 'repeated acceptance does not duplicate a person');
  assert.deepEqual(s, before);
  assert.equal(validateBattleMortality(b, s), true);
});

test('death latch clamps a previously recorded participant back to zero rather than allowing revival', () => {
  const s = fixture(), b = battleFixture(s); zero(b, 'mira');
  actor(b, 'mira').hp = 10;
  recordCombatZero(b, 'mira', 0);
  assert.equal(actor(b, 'mira').hp, 0);
  assert.deepEqual(b.mortality.deaths, [{ actorId: 'mira', personId: personId('mira') }]);
});

test('zero latch ignores non-crossings, enemies, uncaptured and ephemeral actors', () => {
  const s = fixture(), b = battleFixture(s);
  recordCombatZero(b, 'mira', 20);
  actor(b, 'kest').hp = 0; recordCombatZero(b, 'kest', 0);
  actor(b, 'orrin').hp = 0; recordCombatZero(b, 'orrin', -1);
  zero(b, 'enemy-1'); zero(b, 'ash_attendant');
  recordCombatZero(b, 'missing-actor', 20);
  assert.deepEqual(b.mortality.deaths, []);
  assert.equal(b.outcome, null);
});

test('hero death is immediately terminal even with living allies or a simultaneous prior victory', () => {
  for (const priorOutcome of [null, 'victory']) {
    const s = fixture(), before = copy(s), b = battleFixture(s); b.outcome = priorOutcome;
    zero(b, 'hero');
    assert.equal(b.outcome, 'ironman-death');
    assert.equal(b.currentActorId, null);
    assert.ok(actor(b, 'mira').hp > 0, 'living companions cannot keep a dead hero run active');
    assert.deepEqual(b.mortality.deaths, [{ actorId: 'hero', personId: s.dynasty.activePersonId }]);
    assert.deepEqual(s, before);
    assert.equal(validateBattleMortality(b, s), true);
    s.battle = b;
    assert.deepEqual(ironmanHeroDeath(s), { runId: RUN, personId: s.dynasty.activePersonId,
      day: s.day, battleId: b.instanceId });
    assert.deepEqual(ironmanBattleDeaths(s, b), [], 'hero terminal descriptors are not companion floor records');
    recordCombatZero(b, 'hero', 30);
    assert.equal(b.mortality.deaths.length, 1);
  }
});

test('nonlethal supervised bout captures rules without producing companion or hero permadeath', () => {
  const s = fixture(), b = battleFixture(s, { nonlethal: true });
  assert.equal(b.mortality.lethal, false);
  assert.deepEqual(b.mortality.participants.map(p => p.actorId), ['hero']);
  assert.equal(validateBattleMortality(b, s), true);
  zero(b, 'hero');
  assert.deepEqual(b.mortality.deaths, []);
  assert.notEqual(b.outcome, 'ironman-death');
  s.battle = b;
  assert.equal(ironmanHeroDeath(s), null);
  assert.deepEqual(ironmanBattleDeaths(s, b), []);
});

test('nonlethal rules require every genuine watchhouse tournament marker and cannot excuse ordinary combat', () => {
  for (const change of [b => b.encounterId = 'forest',
    b => delete b.tournamentRulesVersion, b => delete b.context,
    b => b.context.kind = 'preview', b => b.mortality.lethal = true]) {
    const s = fixture({ companions: [] }), b = battleFixture(s, { nonlethal: true });
    change(b); const before = copy({ s, b });
    assert.equal(validateBattleMortality(b, s), false);
    assert.deepEqual({ s, b }, before);
  }
});

test('Standard zero Health never creates mortality metadata or Ironman termination', () => {
  const s = fixture({ optedIn: false }), before = copy(s), b = battleFixture(s);
  zero(b, 'hero'); zero(b, 'mira');
  assert.equal(Object.hasOwn(b, 'mortality'), false);
  assert.notEqual(b.outcome, 'ironman-death');
  assert.deepEqual(s, before);
});

for (const [label, change] of [
  ['missing captured rules', b => delete b.mortality],
  ['unsupported rules version', b => b.mortality.version = 2],
  ['another run', b => b.mortality.runId = OTHER_RUN],
  ['missing hero participant', b => b.mortality.participants.shift()],
  ['duplicate participant', b => b.mortality.participants.push(copy(b.mortality.participants[0]))],
  ['historical hero substitution', b => b.mortality.participants[0].personId = 'earlier-hero'],
  ['companion identity substitution', b => b.mortality.participants[1].personId = personId('kest')],
  ['wrong participant kind', b => b.mortality.participants[1].kind = 'hero'],
  ['enemy participant', b => b.mortality.participants.push({ actorId: 'enemy-1', personId: 'foe-person', kind: 'companion' })],
  ['temporary participant', b => b.mortality.participants.push({ actorId: 'ash_attendant', personId: 'temporary-person', kind: 'companion' })],
  ['missing participant actor', b => b.actors = b.actors.filter(a => a.id !== 'mira')],
  ['captured actor changes side', b => actor(b, 'mira').side = 'enemy'],
  ['captured actor becomes ephemeral', b => actor(b, 'mira').ephemeral = true],
  ['nonboolean lethality', b => b.mortality.lethal = 'yes'],
  ['invented death', b => b.mortality.deaths.push({ actorId: 'missing', personId: 'missing' })],
  ['living companion recorded dead', b => b.mortality.deaths.push({ actorId: 'mira', personId: personId('mira') })],
]) test(`battle mortality validation rejects ${label} without mutation`, () => {
  const s = fixture(), b = battleFixture(s); change(b); const before = copy({ s, b });
  assert.equal(validateBattleMortality(b, s), false);
  assert.deepEqual({ s, b }, before);
});

test('battle validation rejects omitted zero-Health deaths, duplicate death records and person mismatches', () => {
  for (const change of [b => b.mortality.deaths = [],
    b => b.mortality.deaths.push(copy(b.mortality.deaths[0])),
    b => b.mortality.deaths[0].personId = personId('kest'),
    b => actor(b, 'mira').hp = 1]) {
    const s = fixture(), b = battleFixture(s); zero(b, 'mira'); change(b);
    assert.equal(validateBattleMortality(b, s), false);
  }
});

test('terminal descriptors require the exact validated lethal hero terminal, not merely an outcome label', () => {
  const s = fixture(), b = battleFixture(s); zero(b, 'hero'); s.battle = b;
  assert.ok(ironmanHeroDeath(s));
  for (const change of [x => x.battle.outcome = 'defeat',
    x => x.battle.currentActorId = 'mira', x => actor(x.battle, 'hero').hp = 1,
    x => x.battle.mortality.deaths = [], x => x.battle.mortality.lethal = false,
    x => x.battle.mortality.runId = OTHER_RUN,
    x => x.dynasty.activePersonId = personId('mira')]) {
    const bad = copy(s); change(bad);
    assert.equal(validateBattleMortality(bad.battle, bad), false);
    assert.equal(ironmanHeroDeath(bad), null);
  }
  const forged = fixture(); forged.battle = battleFixture(forged); forged.battle.outcome = 'ironman-death';
  assert.equal(ironmanHeroDeath(forged), null);
});

test('battle casualty extraction is exact, companion-only, detached and excludes already recorded deaths', () => {
  const s = fixture(), b = battleFixture(s), before = copy(s); zero(b, 'mira'); zero(b, 'kest');
  const expected = [{ personId: personId('mira'), day: s.day, battleId: b.instanceId, generation: 1 },
    { personId: personId('kest'), day: s.day, battleId: b.instanceId, generation: 1 }];
  const records = ironmanBattleDeaths(s, b);
  assert.deepEqual(records, expected);
  assert.deepEqual(s, before);
  records[0].day = 9999;
  assert.deepEqual(ironmanBattleDeaths(s, b), expected);
  rememberDeath(s, 'mira', { day: 100, battleId: b.instanceId });
  assert.deepEqual(ironmanBattleDeaths(s, b), [expected[1]]);
  delete b.instanceId;
  assert.deepEqual(ironmanBattleDeaths(s, b), [], 'no casualty record is invented without an exact battle identity');
});

test('casualties require the exact current person to be dead consistently in lineage, roster and RPG status', () => {
  const s = fixture(); rememberDeath(s);
  assert.equal(validateIronman(s), true);
  for (const change of [x => row(x, personId('mira')).alive = true,
    x => row(x, personId('mira')).deathDay = 98,
    x => x.companions[0].alive = true, x => x.companions[0].active = true,
    x => x.companions[0].recruited = true, x => x.companions[0].hp = 1,
    x => x.companions[0].deathDay = 98,
    x => x.rpg.companionStages.mira.status = 'available']) {
    const bad = copy(s); change(bad); assert.equal(validateIronman(bad), false);
  }
});

test('a companion-shaped ID cannot turn unrelated lineage sources into valid companion casualties', () => {
  for (const source of ['life', 'child', 'hero', 'unknown']) {
    const s = fixture(); rememberDeath(s);
    row(s, personId('mira')).source = source;
    const before = copy(s);
    assert.equal(validateIronman(s), false, `${source} is not a current or archived companion record`);
    assert.deepEqual(s, before);
  }
});

for (const [label, change] of [
  ['omitted person', s => s.ironman.casualties[0].personId = 'unknown-person'],
  ['local actor ID instead of immutable person', s => s.ironman.casualties[0].personId = 'mira'],
  ['hero in companion ledger', s => s.ironman.casualties[0].personId = s.dynasty.activePersonId],
  ['future casualty', s => s.ironman.casualties[0].day = s.day + 1],
  ['casualty before opt-in', s => s.ironman.casualties[0].day = 89],
  ['casualty before birth', s => row(s, personId('mira')).bornDay = 100],
  ['fractional casualty date', s => s.ironman.casualties[0].day = 99.5],
  ['missing battle identity', s => s.ironman.casualties[0].battleId = ''],
  ['invalid generation', s => s.ironman.casualties[0].generation = 0],
  ['future generation', s => s.ironman.casualties[0].generation = 2],
  ['duplicate person casualty', s => s.ironman.casualties.push(copy(s.ironman.casualties[0]))],
]) test(`casualty validation rejects ${label} without editing the record`, () => {
  const s = fixture(); rememberDeath(s); change(s); const before = copy(s);
  assert.equal(validateIronman(s), false); assert.deepEqual(s, before);
});

test('an archived casualty stays on its exact old person when a successor reuses the roster ID', () => {
  const s = fixture(); const casualty = copy(rememberDeath(s));
  const archived = row(s, personId('mira')); archived.source = 'ancestor';
  const newCompanion = companion('mira', { bornDay: 30 });
  const current = { id: 'line-test-g2-companion-mira', source: 'companion', localId: 'mira',
    name: newCompanion.name, bornDay: newCompanion.bornDay, alive: true, deathDay: null };
  s.companions[0] = newCompanion; s.lineage.people.push(current); s.dynasty.generation = 2;
  s.rpg.companionStages.mira.status = 'available';
  const before = copy(s);
  assert.equal(validateIronman(s), true);
  assert.equal(currentIronmanPerson(s, 'mira').id, current.id);
  assert.deepEqual(s.ironman.casualties, [casualty]);
  assert.deepEqual(s, before);
  const forged = copy(s); forged.ironman.casualties[0].personId = current.id;
  assert.equal(validateIronman(forged), false, 'an old death cannot kill or become a different namesake');
});

test('casualty floor validates an exact known ledger and merges additional valid deaths without mutating inputs', () => {
  const s = fixture(); const first = copy(rememberDeath(s, 'mira', { day: 98 }));
  const floor = { startedDay: s.ironman.startedDay, casualties: [first] };
  rememberDeath(s, 'kest', { day: 99, battleId: 'second-battle' });
  const before = copy({ s, floor });
  assert.equal(validateCasualtyFloor(s, floor), true);
  const merged = mergeCasualtyFloor(floor, s);
  assert.deepEqual(merged, { startedDay: 90, casualties: s.ironman.casualties });
  assert.deepEqual({ s, floor }, before);
  merged.casualties[0].day = 12345;
  assert.deepEqual({ s, floor }, before, 'merge returns detached rows, not state/floor aliases');
});

test('an absent floor can start from an exact valid Ironman state; Standard never acquires a ledger', () => {
  const s = fixture(); rememberDeath(s); const before = copy(s);
  assert.equal(validateCasualtyFloor(s, null), true);
  assert.deepEqual(mergeCasualtyFloor(null, s), { startedDay: 90, casualties: s.ironman.casualties });
  assert.deepEqual(s, before);
  const standard = fixture({ optedIn: false }), ordinaryBefore = copy(standard);
  assert.equal(mergeCasualtyFloor(null, standard), null);
  assert.deepEqual(standard, ordinaryBefore);
  assert.equal(Object.hasOwn(standard, 'ironman'), false);
});

test('known floor death omission, start mismatch and conflicting date/battle/generation all fail closed', () => {
  const s = fixture(); rememberDeath(s);
  const floor = { startedDay: 90, casualties: copy(s.ironman.casualties) };
  for (const change of [x => x.ironman.casualties = [], x => x.ironman.startedDay = 91,
    x => x.ironman.casualties[0].day = 98,
    x => x.ironman.casualties[0].battleId = 'replacement-battle',
    x => { x.dynasty.generation = 2; x.ironman.casualties[0].generation = 2; }]) {
    const candidate = copy(s); change(candidate); const before = copy({ candidate, floor });
    assert.equal(validateCasualtyFloor(candidate, floor), false);
    assert.equal(mergeCasualtyFloor(floor, candidate), null);
    assert.deepEqual({ candidate, floor }, before);
  }
});

test('an old snapshot never has a future known casualty injected into its earlier day', () => {
  const current = fixture(); rememberDeath(current);
  const floor = { startedDay: 90, casualties: copy(current.ironman.casualties) };
  const old = fixture(); old.day = 98;
  const before = copy({ old, floor });
  assert.equal(validateCasualtyFloor(old, floor), false);
  assert.equal(mergeCasualtyFloor(floor, old), null);
  assert.deepEqual({ old, floor }, before);
  assert.equal(old.companions[0].alive, true, 'rejection does not rewrite an older person into a future death');
});

test('malformed casualty floors cannot be repaired into an empty or permissive ledger', () => {
  const s = fixture(); rememberDeath(s);
  const valid = { startedDay: 90, casualties: copy(s.ironman.casualties) };
  const floors = [{}, [], { startedDay: 90, casualties: null },
    { ...valid, startedDay: 101 }, { ...valid, casualties: [...valid.casualties, copy(valid.casualties[0])] },
    { ...valid, casualties: [{ ...valid.casualties[0], personId: 'unknown-person' }] },
    { ...valid, casualties: [{ ...valid.casualties[0], day: 101 }] }];
  for (const floor of floors) {
    const before = copy({ s, floor });
    assert.equal(validateCasualtyFloor(s, floor), false);
    assert.equal(mergeCasualtyFloor(floor, s), null);
    assert.deepEqual({ s, floor }, before);
  }
});
