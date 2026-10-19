import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, getBattleActions, takeBattleAction, takeBattleActionDetailed, previewBattleAction } from '../dist/js/combat.js';
import { encounterOutlook } from '../dist/js/combat-guidance.js';
import { createTacticsPractice, takeTacticsPracticeAction } from '../dist/js/tactics-practice.js';
import { applyAdvancedTechnique, advancedTechnique } from '../dist/js/techniques-v27.js';
import { recordCombatZero, ironmanBattleDeaths, ironmanHeroDeath, validateBattleMortality, paladinTrialContext } from '../dist/js/ironman.js';
import { tournamentContext, validTournamentContext } from '../dist/js/adult-tournament-state.js';

// Detached, bounded combat fixtures only. These are not earned lives, durable
// storage acceptance, browser coverage or evidence that the full mode ships.
const copy = value => structuredClone(value);
const actor = (battle, id) => battle.actors.find(value => value.id === id);
const hero = battle => actor(battle, 'hero');
const foe = battle => actor(battle, 'enemy-1');
const RUN = '00112233-4455-4677-8899-aabbccddeeff';

function source({ ironman = true, companions = ['mira', 'kest'] } = {}) {
  const s = {
    seed: 'ironman-detached-combat', revision: 5, difficulty: 'balanced', day: 6570, age: 18, phase: 'adult', flags: {}, realm: {},
    dynasty: { id: 'line-combat', generation: 1, activePersonId: 'line-combat-g1-hero-hero' },
    hero: { name: 'Ash', path: 'warrior', specialization: null, hp: 50, maxHp: 50, mp: 30, maxMp: 30,
      level: 1, potions: 2, condition: null,
      attributes: { strength: 3, agility: 12, vitality: 4, intellect: 4, willpower: 4, presence: 3 },
      skills: { weapons: 2, defense: 0, arcana: 3, devotion: 3, stealth: 0, survival: 0, scholarship: 0, persuasion: 0 } },
    companions: companions.map((id, i) => ({ id, name: id, role: 'healer', bornDay: -365 * (i + 1), alive: true,
      recruited: true, active: true, hp: 30, maxHp: 34, mp: 25, maxMp: 25, agility: 3 - i })),
    rpg: { trainedTechniques: [], companionStages: Object.fromEntries(companions.map(id => [id, { status: 'available' }])) },
  };
  s.lineage = { people: [{ id: s.dynasty.activePersonId, source: 'hero', localId: 'hero', name: s.hero.name, bornDay: 0, alive: true, deathDay: null },
    ...s.companions.map(person => ({ id: `${s.dynasty.id}-g1-companion-${person.id}`, source: 'companion', localId: person.id,
      name: person.name, bornDay: person.bornDay, alive: true, deathDay: null }))] };
  if (ironman) s.ironman = { version: 1, runId: RUN, startedDay: s.day, casualties: [] };
  return s;
}

function battle(s = source()) {
  const b = createBattle(s, 'forest', null, { openingTurns: false });
  b.instanceId = 'ironman-combat-fixture-1';
  return b;
}

function oneEnemy(b) {
  b.actors = b.actors.filter(value => value.side === 'party' || value.id === 'enemy-1');
  b.turnOrder = b.turnOrder.filter(id => b.actors.some(value => value.id === id));
  const e = foe(b); delete e.planCycle; delete e.planId; delete e.bossId; delete e.phasePlan;
  e.aiKey = 'striker'; e.aiStep = 0; e.attackPower = 3; e.status = {};
  return b;
}

test('ordinary nonfatal Standard combat stays exactly equal apart from the captured opt-in policy', () => {
  const standard = source({ ironman: false }), ironman = source();
  const plain = battle(standard), marked = battle(ironman);
  const strip = value => { const result = copy(value); delete result.mortality; return result; };
  assert.deepEqual(strip(marked), plain);
  assert.deepEqual(strip(takeBattleAction(marked, 'inspect', 'enemy-1')), takeBattleAction(plain, 'inspect', 'enemy-1'));
  assert.equal(Object.hasOwn(standard, 'ironman'), false);
  assert.equal(Object.hasOwn(plain, 'mortality'), false);
});

test('malformed explicit metadata cannot silently create a Standard battle or mutate its source', () => {
  for (const claim of [undefined, null, false, {}, { version: 1, runId: RUN }]) {
    const s = source(); s.ironman = claim; const before = copy(s);
    assert.throws(() => createBattle(s, 'forest'));
    assert.deepEqual(s, before);
  }
});

test('opening enemy turns capture identities before hero death and stop with living allies', () => {
  const s = source(); s.hero.hp = 1; s.hero.attributes.agility = 1;
  for (const p of s.companions) p.agility = 1;
  const before = copy(s), b = createBattle(s, 'forest'); b.instanceId = 'opening-hero-death';
  assert.equal(b.outcome, 'ironman-death'); assert.equal(b.currentActorId, null);
  assert.equal(hero(b).hp, 0);
  assert.ok(b.actors.some(value => value.side === 'party' && value.id !== 'hero' && value.hp > 0));
  assert.deepEqual(b.mortality.deaths, [{ actorId: 'hero', personId: s.dynasty.activePersonId }]);
  assert.equal(b.log.filter(line => / hits Ash for /.test(line)).length, 1, 'no later enemy turn follows death');
  assert.equal(validateBattleMortality(b, s), true);
  assert.deepEqual(ironmanHeroDeath({ ...s, battle: b }), { runId: RUN, personId: s.dynasty.activePersonId, day: s.day, battleId: b.instanceId });
  assert.deepEqual(s, before, 'battle computation never changes live lineage, resources or casualties');
});

for (const [name, status] of [
  ['poison', { poison: 2, poisonTurns: 1 }],
  ['bleeding', { bleed: 2, bleedTurns: 1 }],
  ['burning', { burn: 2, burnTurns: 1 }],
]) test(`${name} at hero turn entry ends the run immediately with allies alive`, () => {
  const s = source(), before = copy(s), b = oneEnemy(battle(s));
  hero(b).hp = 1; hero(b).status = status;
  b.currentActorId = 'mira'; b.turnOrder = ['mira', 'hero', 'enemy-1', 'kest'];
  const result = takeBattleAction(b, 'defend');
  assert.equal(result.outcome, 'ironman-death'); assert.equal(result.currentActorId, null);
  assert.equal(hero(result).hp, 0); assert.equal(foe(result).hp, foe(b).hp);
  assert.equal(actor(result, 'kest').hp, actor(b, 'kest').hp);
  assert.deepEqual(result.mortality.deaths.map(value => value.actorId), ['hero']);
  assert.deepEqual(s, before);
});

for (const [name, status] of [
  ['poison', { poison: 2, poisonTurns: 1 }],
  ['bleeding', { bleed: 2, bleedTurns: 1 }],
  ['burning', { burn: 2, burnTurns: 1 }],
]) test(`a companion's ${name} death advances to the actual next living ally without ending the run`, () => {
  const s = source(), b = oneEnemy(battle(s));
  actor(b, 'mira').hp = 1; actor(b, 'mira').status = status;
  b.currentActorId = 'hero'; b.turnOrder = ['hero', 'mira', 'kest', 'enemy-1'];
  const result = takeBattleAction(b, 'inspect', 'enemy-1');
  assert.equal(result.outcome, null); assert.equal(result.currentActorId, 'kest');
  assert.equal(actor(result, 'mira').hp, 0);
  assert.deepEqual(result.mortality.deaths.map(value => value.actorId), ['mira']);
  assert.equal(hero(result).hp, hero(b).hp); assert.equal(foe(result).hp, foe(b).hp);
});

function fallenCompanion() {
  const s = source(), b = oneEnemy(battle(s));
  actor(b, 'mira').hp = 1; foe(b).attackPower = 99;
  b.currentActorId = 'hero'; b.turnOrder = ['hero', 'enemy-1', 'mira', 'kest'];
  return { s, before: b, after: takeBattleAction(b, 'inspect', 'enemy-1') };
}

test('a direct companion zero is permanent in battle, including attempted healing and retreat', () => {
  const { s, before, after } = fallenCompanion();
  assert.equal(after.outcome, null); assert.equal(after.currentActorId, 'kest');
  assert.equal(actor(after, 'mira').hp, 0); assert.ok(hero(after).hp > 0);
  assert.deepEqual(after.mortality.deaths.map(value => value.actorId), ['mira']);
  const noPotionRevival = takeBattleAction(after, 'potion', 'mira');
  assert.equal(actor(noPotionRevival, 'mira').hp, 0); assert.equal(noPotionRevival.potions, after.potions);
  assert.equal(noPotionRevival.currentActorId, after.currentActorId);
  const forged = copy(after); actor(forged, 'mira').hp = 4;
  const denied = takeBattleAction(forged, 'potion', 'mira');
  assert.equal(denied.potions, forged.potions, 'a death latch cannot be bypassed by later positive HP');
  assert.match(denied.log.at(-1), /living ally/);
  const retreat = takeBattleAction(after, 'retreat');
  assert.equal(retreat.outcome, 'retreat'); assert.equal(actor(retreat, 'mira').hp, 0);
  assert.deepEqual(ironmanBattleDeaths(s, retreat), [{ personId: 'line-combat-g1-companion-mira', day: s.day, battleId: retreat.instanceId, generation: 1 }]);
  assert.equal(s.companions[0].alive, true); assert.deepEqual(s.ironman.casualties, []);
  assert.equal(actor(before, 'mira').hp, 1, 'accepted combat still returns a detached copy');
});

test('genuine restorative skills, tactics and group healing work on living targets but never revive a latched companion', () => {
  const { after } = fallenCompanion();
  // Controlled captured healer variant, not Kest's default Ranger attack.
  const cast = copy(after), healer = actor(cast, 'kest');
  healer.role = 'healer'; healer.specialization = 'healer'; healer.mp = healer.maxMp;
  for (const actionId of ['skill', 'tactic']) {
    const offered = getBattleActions(cast).find(action => action.id === actionId);
    assert.equal(offered.targetSide, 'party'); assert.equal(offered.disabledReason, undefined);
    const live = copy(cast); hero(live).hp = 10;
    const healed = takeBattleAction(live, actionId, 'hero');
    assert.ok(hero(healed).hp > 10, `${actionId} actually restores a living injured target`);
    assert.ok(actor(healed, 'kest').mp < actor(live, 'kest').mp);
    assert.equal(actor(healed, 'mira').hp, 0);
    const denied = takeBattleAction(cast, actionId, 'mira');
    assert.equal(actor(denied, 'mira').hp, 0);
    assert.equal(actor(denied, 'kest').mp, healer.mp);
    assert.equal(denied.currentActorId, cast.currentActorId);
    assert.match(denied.log.at(-1), /living ally/);
  }
  const group = copy(cast); hero(group).hp = 10; actor(group, 'kest').hp = 10;
  actor(group, 'kest').trainedTechniques = ['shared_renewal'];
  const offered = getBattleActions(group).find(action => action.id === 'tech_shared_renewal');
  assert.ok(offered && !offered.disabledReason);
  const healed = takeBattleAction(group, 'tech_shared_renewal');
  assert.ok(hero(healed).hp > 10); assert.ok(actor(healed, 'kest').hp > 10);
  assert.equal(actor(healed, 'mira').hp, 0);
  assert.deepEqual(healed.mortality.deaths, group.mortality.deaths);
});

test('a companion casualty survives an actual victory, without converting victory to hero death', () => {
  const { s, after } = fallenCompanion();
  foe(after).hp = 1; foe(after).armor = 0;
  const result = takeBattleAction(after, 'attack', 'enemy-1');
  assert.equal(result.outcome, 'victory'); assert.equal(actor(result, 'mira').hp, 0);
  assert.equal(ironmanHeroDeath({ ...s, battle: result }), null);
  assert.equal(ironmanBattleDeaths(s, result).length, 1);
});

test('simultaneous hero and last-enemy zero is terminal even while companions survive', () => {
  const s = source(), b = oneEnemy(battle(s));
  hero(b).hp = 1; hero(b).status.bramble = 10;
  foe(b).hp = 1; foe(b).attackPower = 99;
  b.currentActorId = 'hero'; b.turnOrder = ['hero', 'enemy-1', 'mira', 'kest'];
  const result = takeBattleAction(b, 'inspect', 'enemy-1');
  assert.equal(hero(result).hp, 0); assert.equal(foe(result).hp, 0);
  assert.ok(actor(result, 'mira').hp > 0);
  assert.equal(result.outcome, 'ironman-death'); assert.equal(result.currentActorId, null);
  assert.equal(validateBattleMortality(result, s), true);
});

for (const planned of [false, true]) test(`${planned ? 'planned' : 'ordinary'} drain cannot heal its source after killing the Ironman hero`, () => {
  const b = oneEnemy(battle()); hero(b).hp = 1; hero(b).status.bramble = 10;
  foe(b).hp = 1; foe(b).attackPower = 99; foe(b).aiKey = 'leech';
  if (planned) foe(b).planCycle = [{ action: 'drain', target: 'most_injured' }];
  b.currentActorId = 'hero'; b.turnOrder = ['hero', 'enemy-1', 'mira', 'kest'];
  const result = takeBattleAction(b, 'inspect', 'enemy-1');
  assert.equal(result.outcome, 'ironman-death');
  assert.equal(hero(result).hp, 0); assert.equal(foe(result).hp, 0, 'post-zero drain healing is not processed after terminal');
  assert.equal(actor(result, 'mira').hp, actor(b, 'mira').hp);
});

for (const planned of [false, true]) test(`${planned ? 'planned' : 'ordinary'} multi-target enemy wave stops before later allies after hero death`, () => {
  const b = oneEnemy(battle()); hero(b).hp = 1; foe(b).attackPower = 99;
  if (planned) foe(b).planCycle = [{ action: 'wave', target: 'all_party', amount: 0 }];
  else { foe(b).aiKey = 'keeper'; foe(b).aiStep = 1; }
  b.currentActorId = 'hero'; b.turnOrder = ['hero', 'enemy-1', 'mira', 'kest'];
  const result = takeBattleAction(b, 'inspect', 'enemy-1');
  assert.equal(result.outcome, 'ironman-death'); assert.equal(hero(result).hp, 0);
  assert.equal(actor(result, 'mira').hp, actor(b, 'mira').hp);
  assert.equal(actor(result, 'kest').hp, actor(b, 'kest').hp);
  assert.deepEqual(result.mortality.deaths.map(value => value.actorId), ['hero']);
});

for (const [id, cost] of [['blood_momentum', 4], ['iron_fury', 5]]) test(`advanced ${id} latches an exact self-cost zero before damage or recovery`, () => {
  const b = battle(), h = hero(b), targets = b.actors.filter(value => value.side === 'enemy');
  h.hp = cost; let hits = 0;
  applyAdvancedTechnique(b, h, advancedTechnique(id), targets[0], {
    power: () => 10, log: line => b.log.push(line),
    stopped: () => b.outcome === 'ironman-death',
    loseHealth(value, amount) { const previous = value.hp; value.hp -= amount; recordCombatZero(b, value.id, previous); },
    damage() { hits++; return 9; },
    heal() { throw Error('No healing may follow a terminal self-cost.'); },
  });
  assert.equal(h.hp, 0); assert.equal(b.outcome, 'ironman-death'); assert.equal(hits, 0);
  assert.deepEqual(b.mortality.deaths.map(value => value.actorId), ['hero']);
  assert.ok(targets.every(value => value.hp > 0));
});

test('advanced multi-target commands stop their later hit callback as soon as the hero latch fires', () => {
  for (const id of ['chain_lightning', 'hunters_volley']) {
    const b = battle(), h = hero(b), targets = b.actors.filter(value => value.side === 'enemy'); let hits = 0;
    applyAdvancedTechnique(b, h, advancedTechnique(id), targets[0], {
      power: () => 10, log: () => {}, stopped: () => b.outcome === 'ironman-death',
      damage() { hits++; const previous = h.hp; h.hp = 0; recordCombatZero(b, h.id, previous); return 3; },
    });
    assert.equal(hits, 1, id); assert.equal(b.outcome, 'ironman-death');
  }
});

test('previews, outlook and detailed command evidence never install death in the live life or input battle', () => {
  const s = source(), b = battle(s); foe(b).hp = 1;
  const lifeBefore = copy(s), before = copy(b);
  previewBattleAction(b, 'attack', 'enemy-1');
  encounterOutlook(s, 'forest');
  takeBattleActionDetailed(b, 'attack', 'enemy-1');
  assert.deepEqual(s, lifeBefore); assert.deepEqual(b, before);
  assert.deepEqual(s.ironman.casualties, []); assert.deepEqual(b.mortality.deaths, []);
});

test('tactics rehearsal remains fictional and metadata-free after ordinary real resolver actions', () => {
  // This is only the rehearsal module's fixed-source scope. It does not claim
  // an app/session or storage guard; those are later implementation phases.
  const practice = createTacticsPractice('protect_ally');
  assert.equal(Object.hasOwn(practice.battle, 'mortality'), false);
  const result = takeTacticsPracticeAction(practice, 'defend');
  assert.equal(Object.hasOwn(result.battle, 'mortality'), false);
});

function supervisedPaladin() {
  const s = source(); s.locationId = 'home'; s.world = { locations: [{ id: 'home' }] };
  s.flags.pendingSpecialization = 'paladin'; s.flags.oathType = 'mercy';
  s.flags.oath = 'Show mercy: never bind an unwilling soul or feed on an unwilling person.';
  return s;
}

test('verified Paladin trial captures the actual normal party as nonlethal before opening turns', () => {
  const s = supervisedPaladin(), before = copy(s), context = paladinTrialContext(s);
  assert.ok(context);
  s.hero.hp = 1; s.hero.attributes.agility = 1;
  for (const p of s.companions) p.agility = 1;
  const b = createBattle(s, 'initiation', context);
  assert.equal(b.mortality.lethal, false);
  assert.deepEqual(b.mortality.participants.map(value => value.actorId), b.actors.filter(value => value.side === 'party' && !value.ephemeral).map(value => value.id));
  assert.equal(hero(b).hp, 0, 'opening zero does not create Ironman death inside this verified supervised trial');
  assert.deepEqual(b.mortality.deaths, []); assert.notEqual(b.outcome, 'ironman-death');
  assert.equal(validateBattleMortality(b, s), true);
  assert.deepEqual(s.lineage, before.lineage); assert.deepEqual(s.ironman, before.ironman);
  for (const mutate of [
    x => x.context.classId = 'necromancer', x => x.context.ownerId = 'not-this-person',
    x => x.context.locationId = 'other-place', x => x.context.oathType = 'truth',
    x => delete x.context, x => x.mortality.lethal = true,
  ]) { const invalid = copy(b); mutate(invalid); assert.equal(validateBattleMortality(invalid, s), false); }
});

test('unmarked, Necromancer and Assassin initiations stay lethal; a generic caller flag cannot exempt them', () => {
  for (const pendingSpecialization of ['paladin', 'necromancer', 'assassin']) {
    const s = source(); s.flags.pendingSpecialization = pendingSpecialization;
    const b = createBattle(s, 'initiation', null, { openingTurns: false, nonlethal: true });
    assert.equal(b.mortality.lethal, true, pendingSpecialization);
  }
  const s = supervisedPaladin(), context = paladinTrialContext(s);
  for (const edit of [x => x.classId = 'assassin', x => x.ownerId = 'other-owner', x => x.nonlethal = true]) {
    const invalid = copy(context); edit(invalid);
    assert.throws(() => createBattle(s, 'initiation', invalid));
  }
});

function watchhouse() {
  const s = source(); s.locationId = 'home'; s.world = { locations: [{ id: 'home' }] };
  s.cartography = { interior: { siteId: 'home', roomId: 'watch' } };
  s.realm = { sites: { home: { regionId: 'rainward' } } };
  s.npcContinuity = { slots: { 'service:home:watch': { personId: 'captain' } }, people: {} };
  const host = { id: 'captain', name: 'Captain', age: 35, appearance: {} };
  const opponents = ['watch_guard', 'measured_charge', 'counter_step'].map((profileId, i) => ({ id: `entrant-${i}`, name: `Entrant ${i}`, age: 30, appearance: {}, profileId }));
  for (const person of [host, ...opponents]) s.npcContinuity.people[person.id] = { slotKey: person.id === 'captain' ? 'service:home:watch' : `town:home:${person.id}`, retiredDay: null, retireDay: s.day + 1000 };
  s.adultTournament = { id: 'bounded-watchhouse', ownerId: s.dynasty.activePersonId, locationId: 'home', host, opponents,
    stage: 'bout', paidDays: 1, results: [], jurisdiction: { regionId: 'rainward' }, difficulty: 'balanced' };
  return s;
}

test('watchhouse authenticates the dedicated tournament and captures only its actual solo hero', () => {
  const s = watchhouse(), context = tournamentContext(s), before = copy(s);
  assert.equal(validTournamentContext(s, context), true, 'controlled current-owner tournament context first');
  const b = createBattle(s, 'watchhouse_duel', context, { openingTurns: false });
  assert.deepEqual(b.actors.filter(value => value.side === 'party').map(value => value.id), ['hero']);
  assert.deepEqual(b.mortality.participants, [{ actorId: 'hero', personId: s.dynasty.activePersonId, kind: 'hero' }]);
  assert.equal(b.mortality.lethal, false); assert.equal(validateBattleMortality(b, s), true);
  assert.deepEqual(s, before);
  s.adultTournament.stage = 'ready';
  assert.throws(() => createBattle(s, 'watchhouse_duel', context), 'no generic supervised-encounter bypass');
});

test('a terminal battle exposes no further commands and stale repeated actions remain detached no-ops', () => {
  const s = source(); s.hero.hp = 1; s.hero.attributes.agility = 1;
  const b = createBattle(s, 'forest'), before = copy(b);
  assert.equal(b.outcome, 'ironman-death'); assert.deepEqual(getBattleActions(b), []);
  assert.deepEqual(takeBattleAction(b, 'retreat'), before);
  assert.deepEqual(takeBattleAction(b, 'potion', 'hero'), before);
});
