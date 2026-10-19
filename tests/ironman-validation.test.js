import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  createGame, chooseEventOption, chooseAction, replyMessage, continueAgeUp,
  recruitCompanion, resolveBattle, migrateSave, validateSave,
} from '../dist/js/engine.js';
import { createBattle, getBattleActions, previewBattleAction, takeBattleActionDetailed } from '../dist/js/combat.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import {
  createIronmanMetadata, currentIronmanPerson, recordCombatZero, sameBattleMortalityPolicy,
} from '../dist/js/ironman.js';

// Phase 1 validation integration only. These controlled snapshots exercise the
// real save validator/migrator, not engine casualty settlement, durable storage,
// creator opt-in, UI, browser deletion or release acceptance. Authoring this
// file does not execute it; runtime belongs to the separately approved gate.
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const OATHS = {
  mercy: 'Show mercy: never bind an unwilling soul or feed on an unwilling person.',
  truth: 'Speak and act honestly: do not deceive through theft, coerce souls, or prey on unwilling people.',
  protection: 'Protect the vulnerable: do not steal from others, prey on travelers, or bind an unwilling soul.',
};
const copy = value => structuredClone(value);
const actor = (state, id) => state.battle.actors.find(value => value.id === id);
const person = (state, id) => currentIronmanPerson(state, id);
const openings = new Map();

function standardOpening(path = 'rogue') {
  if (!openings.has(path)) {
    // Reuse the actual three-choice opening in tests/engine.test.js. createGame
    // is revision 2, so migrate it through the public migrator before opt-in.
    // No years of simulation or guessed adult/calendar state are necessary.
    let state = createGame({ seed: 'ironman-validation-opening-' + path, path });
    assert.equal(validateSave(state), true, 'generated childhood is valid first');
    for (const id of ['investigate', 'apprentice', 'confess']) {
      state = chooseEventOption(state, id);
      assert.equal(validateSave(state), true, `actual childhood choice ${id}`);
    }
    assert.equal(state.phase, 'adult');
    assert.equal(state.event, null);
    state = migrateSave(state);
    assert.ok(state, 'the real current-generated opening migrates');
    assert.equal(state.revision, 5);
    assert.equal(validateSave(state), true, 'revision-5 fixture is valid first');

    state = recruitCompanion(state, 'mira');
    assert.equal(state.companions.find(value => value.id === 'mira').active, true);
    assert.equal(validateSave(state), true, 'real recruitment remains valid');
    assert.equal(Object.hasOwn(state, 'ironman'), false);
    openings.set(path, state);
  }
  return copy(openings.get(path));
}

function ironmanOpening() {
  const state = standardOpening();
  state.ironman = createIronmanMetadata(state, { randomUUID: () => RUN });
  assert.equal(validateSave(state), true, 'opted-in fixture is valid first');
  return state;
}

function battleFixture({ ironman = true } = {}) {
  const state = ironman ? ironmanOpening() : standardOpening();
  const before = copy(state);
  state.battle = createBattle(state, 'forest', null, { openingTurns: false });
  // createBattle is detached; the engine normally assigns its instance ID.
  // The generated rogue acts before this ordinary forest encounter's enemies.
  state.battle.instanceId = 'battle-ironman-validation-1';
  assert.equal(state.battle.currentActorId, 'hero');
  assert.equal(validateSave(state), true, 'generated battle fixture is valid first');
  const withoutBattle = copy(state); withoutBattle.battle = null;
  assert.deepEqual(withoutBattle, before, 'battle capture does not change live people');
  return state;
}

function appliedCasualtyFixture() {
  const state = battleFixture(), mira = actor(state, 'mira'), previousHp = mira.hp;
  mira.hp = 0;
  assert.equal(recordCombatZero(state.battle, 'mira', previousHp), true);
  // A controlled already-applied snapshot proves the validator boundary only.
  // This does not call, implement or certify phase-2 engine death settlement.
  Object.assign(state.companions.find(p => p.id === 'mira'), {
    alive: false, active: false, recruited: false, hp: 0, deathDay: state.day,
  });
  Object.assign(person(state, 'mira'), { alive: false, deathDay: state.day });
  state.rpg.companionStages.mira.status = 'dead';
  state.ironman.casualties = [{
    personId: person(state, 'mira').id, day: state.day,
    battleId: state.battle.instanceId, generation: state.dynasty.generation,
  }];
  assert.equal(validateSave(state), true, 'exact applied ongoing casualty fixture is valid first');
  return state;
}

function accepted(state, label) {
  assert.equal(validateSave(state), true, label);
  const before = copy(state), restored = migrateSave(state);
  assert.ok(restored, `${label}: migrator accepts the valid snapshot`);
  assert.equal(validateSave(restored), true, `${label}: restored snapshot stays valid`);
  assert.deepEqual(state, before, `${label}: validation/migration leave input untouched`);
  assert.equal(Object.hasOwn(restored, 'ironman'), Object.hasOwn(state, 'ironman'));
  if (Object.hasOwn(state, 'ironman')) assert.deepEqual(restored.ironman, state.ironman);
  assert.deepEqual(restored.battle, state.battle, `${label}: battle is not rebuilt or stripped`);
  return restored;
}

function rejected(state, label) {
  const before = copy(state);
  assert.equal(validateSave(state), false, label);
  assert.equal(migrateSave(state), null, `${label}: migration cannot downgrade or repair it`);
  assert.deepEqual(state, before, `${label}: rejected source is not changed`);
}

function terminalFixture({ enemiesDead = false } = {}) {
  const state = battleFixture(), hero = actor(state, 'hero'), previousHp = hero.hp;
  hero.hp = 0;
  assert.equal(recordCombatZero(state.battle, 'hero', previousHp), true);
  if (enemiesDead) for (const enemy of state.battle.actors.filter(value => value.side === 'enemy')) enemy.hp = 0;
  assert.equal(state.battle.outcome, 'ironman-death');
  assert.equal(state.battle.currentActorId, null);
  assert.ok(actor(state, 'mira').hp > 0, 'a living companion cannot rescue the run');
  assert.equal(validateSave(state), true, 'captured terminal fixture is valid first');
  return state;
}

function trialChoiceFixture({ ironman = true, oathType = 'mercy' } = {}) {
  const state = standardOpening('warrior');
  if (ironman) state.ironman = createIronmanMetadata(state, { randomUUID: () => RUN });
  // Controlled imported trial precondition, not an earned-class/mentor proof.
  // Keep actual generated identity, calendar and party; offer a supported saved
  // event and let the public choice handler create the captured battle.
  state.flags.pendingSpecialization = 'paladin';
  state.flags.oathType = oathType;
  state.flags.oath = OATHS[oathType];
  state.flags.oathBroken = false;
  state.event = {
    id: 'initiation_trial', title: 'A commitment made concrete', category: 'paladin initiation',
    body: 'The order offers a supervised encounter against trial guardians.',
    choices: [
      { id: 'combat', label: 'Enter the controlled trial', description: 'Begin the supervised Paladin encounter.' },
      { id: 'service', label: 'Complete the four-day field trial', description: 'Complete initiation through practical work.' },
      { id: 'pause', label: 'Prepare before making the final commitment', description: 'Leave without a specialization.' },
    ],
  };
  assert.ok(state.hero.hp >= 20, 'actual generated hero can enter the offered combat trial');
  return accepted(state, 'controlled valid saved Paladin trial choice');
}

function paladinBattleFixture(options) {
  const choice = trialChoiceFixture(options), before = copy(choice);
  const state = chooseEventOption(choice, 'combat');
  assert.deepEqual(choice, before, 'public trial entry leaves the input save detached');
  assert.equal(state.event, null);
  assert.equal(state.battle?.encounterId, 'initiation');
  assert.equal(validateSave(state), true, 'publicly created Paladin battle is valid first');
  return state;
}

test('metadata-only opt-in and Standard absence survive actual save validation and migration', () => {
  const standard = standardOpening(), before = copy(standard);
  const metadata = createIronmanMetadata(standard, { randomUUID: () => RUN });
  assert.deepEqual(metadata, { version: 1, runId: RUN, startedDay: standard.day, casualties: [] });
  assert.deepEqual(standard, before, 'creation returns metadata, not a mutated game');
  assert.equal(Object.hasOwn(metadata, 'hero'), false);
  accepted(standard, 'Standard opening');
  accepted({ ...standard, ironman: metadata }, 'explicit Ironman opening');
});

test('any present malformed mode is rejected rather than silently becoming Standard', () => {
  const valid = ironmanOpening();
  const modes = [
    ['null', null], ['undefined own property', undefined], ['false', false], ['array', []], ['empty object', {}],
    ['unsupported version', { ...valid.ironman, version: 2 }],
    ['non-v4 identity', { ...valid.ironman, runId: 'lineage-derived-identity' }],
    ['future start', { ...valid.ironman, startedDay: valid.day + 1 }],
    ['non-array casualties', { ...valid.ironman, casualties: {} }],
    ['unexpected metadata', { ...valid.ironman, selected: true }],
  ];
  for (const [label, ironman] of modes) rejected({ ...copy(valid), ironman }, label);

  const legacy = createGame({ seed: 'ironman-validation-unmigrated' });
  assert.equal(validateSave(legacy), true, 'unmigrated generated Standard is valid first');
  legacy.ironman = copy(valid.ironman);
  rejected(legacy, 'present Ironman cannot be retrofitted by revision migration');
});

test('Standard battles stay metadata-free, and present mode/battle mismatches fail closed', () => {
  const standard = battleFixture({ ironman: false }), ironman = battleFixture();
  assert.equal(Object.hasOwn(standard.battle, 'mortality'), false);
  accepted(standard, 'ordinary Standard battle');
  accepted(ironman, 'captured Ironman battle');

  for (const mortality of [copy(ironman.battle.mortality), null, undefined]) {
    const state = copy(standard); state.battle.mortality = mortality;
    rejected(state, 'Standard may not carry even a malformed mortality claim');
  }
  const missing = copy(ironman); delete missing.battle.mortality;
  rejected(missing, 'Ironman battle requires captured mortality');
  const droppedMode = copy(ironman); delete droppedMode.ironman;
  rejected(droppedMode, 'dropping mode cannot sanitize a captured battle');
  const unsupportedTerminal = copy(standard);
  unsupportedTerminal.battle.outcome = 'ironman-death';
  unsupportedTerminal.battle.currentActorId = null;
  actor(unsupportedTerminal, 'hero').hp = 0;
  rejected(unsupportedTerminal, 'Standard may not claim the Ironman terminal literal');
});

test('captured run, exact hero/companion identities and lethal rules are preserved through reload', () => {
  const state = battleFixture();
  assert.deepEqual(state.battle.mortality, {
    version: 1, runId: RUN, lethal: true,
    participants: [
      { actorId: 'hero', personId: state.dynasty.activePersonId, kind: 'hero' },
      { actorId: 'mira', personId: person(state, 'mira').id, kind: 'companion' },
    ],
    deaths: [],
  });
  const restored = accepted(JSON.parse(JSON.stringify(state)), 'JSON captured identity');
  assert.deepEqual(restored.ironman.casualties, [], 'phase 1 has no applied casualty floor');

  for (const [label, change] of [
    ['null snapshot', s => { s.battle.mortality = null; }],
    ['unsupported version', s => { s.battle.mortality.version = 2; }],
    ['other run', s => { s.battle.mortality.runId = OTHER_RUN; }],
    ['unsupported key', s => { s.battle.mortality.nonlethal = false; }],
    ['non-boolean lethal', s => { s.battle.mortality.lethal = 'true'; }],
    ['ordinary battle disguised nonlethal', s => { s.battle.mortality.lethal = false; }],
    ['hero roster alias is not a person', s => { s.battle.mortality.participants[0].personId = 'hero'; }],
    ['companion roster alias is not a person', s => { s.battle.mortality.participants[1].personId = 'mira'; }],
    ['different exact companion', s => { s.battle.mortality.participants[1].personId = person(s, 'orrin').id; }],
    ['wrong participant kind', s => { s.battle.mortality.participants[1].kind = 'hero'; }],
    ['missing active companion', s => { s.battle.mortality.participants.pop(); }],
    ['duplicate captured participant', s => { s.battle.mortality.participants.push(copy(s.battle.mortality.participants[1])); }],
    ['enemy cannot be a participant', s => { s.battle.mortality.participants[1].actorId = 'enemy-1'; }],
    ['living actor cannot be recorded dead', s => { s.battle.mortality.deaths.push({ actorId: 'mira', personId: person(s, 'mira').id }); }],
  ]) {
    const invalid = copy(state); change(invalid); rejected(invalid, label);
  }
});

test('companion zero/death capture is retained without applying live lineage or casualties in phase 1', () => {
  const state = battleFixture(), livePeople = copy(state.lineage), liveParty = copy(state.companions);
  const mira = actor(state, 'mira'), previousHp = mira.hp;
  mira.hp = 0;
  assert.equal(recordCombatZero(state.battle, 'mira', previousHp), true);
  assert.deepEqual(state.battle.mortality.deaths, [{ actorId: 'mira', personId: person(state, 'mira').id }]);
  assert.equal(state.battle.outcome, null);
  const restored = accepted(JSON.parse(JSON.stringify(state)), 'detached captured companion death');
  assert.deepEqual(restored.lineage, livePeople);
  assert.deepEqual(restored.companions, liveParty);
  assert.deepEqual(restored.ironman.casualties, [], 'capture is not engine settlement');
  assert.equal(person(restored, 'mira').alive, true);
  assert.equal(restored.rpg.companionStages.mira.status, 'available');

  for (const [label, change] of [
    ['zero companion requires its captured death', s => { s.battle.mortality.deaths = []; }],
    ['death must match the exact captured person', s => { s.battle.mortality.deaths[0].personId = person(s, 'orrin').id; }],
    ['duplicate death', s => { s.battle.mortality.deaths.push(copy(s.battle.mortality.deaths[0])); }],
    ['recorded casualty cannot be healed', s => { actor(s, 'mira').hp = 1; }],
  ]) {
    const invalid = copy(state); change(invalid); rejected(invalid, label);
  }
});

test('validated internal Ironman terminal permits living companions and simultaneous enemy zero', () => {
  for (const enemiesDead of [false, true]) {
    const state = terminalFixture({ enemiesDead }), before = copy(state);
    const restored = accepted(JSON.parse(JSON.stringify(state)), `terminal enemiesDead=${enemiesDead}`);
    assert.deepEqual(restored.battle.mortality.deaths, [{ actorId: 'hero', personId: state.dynasty.activePersonId }]);
    assert.equal(restored.hero.hp, before.hero.hp, 'no engine settlement in the validation phase');
    assert.ok(restored.hero.hp > 0);
    assert.equal(person(restored, 'hero').alive, true);
    assert.deepEqual(restored.lineage, before.lineage);
    assert.deepEqual(restored.companions, before.companions);
    assert.deepEqual(restored.ironman.casualties, [], 'heroes never enter the companion-only floor');
  }
});

test('Ironman terminal requires its recorded exact dead hero, lethal capture and no current actor', () => {
  const state = terminalFixture();
  for (const [label, change] of [
    ['current actor after termination', s => { s.battle.currentActorId = 'mira'; }],
    ['living hero with death record', s => { actor(s, 'hero').hp = 1; }],
    ['missing recorded hero death', s => { s.battle.mortality.deaths = []; }],
    ['wrong exact hero death', s => { s.battle.mortality.deaths[0].personId = person(s, 'mira').id; }],
    ['nonlethal hero death', s => { s.battle.mortality.lethal = false; }],
    ...['victory', 'defeat', 'retreat', null].map(outcome => [
      `recorded hero death cannot become ${outcome}`,
      s => { s.battle.outcome = outcome; },
    ]),
  ]) {
    const invalid = copy(state); change(invalid); rejected(invalid, label);
  }
});

test('Standard defeat and victory still enforce their original whole-party/enemy invariants', () => {
  const source = battleFixture({ ironman: false });
  const finish = (outcome, { deadParty = false, deadEnemies = false, deadHero = false } = {}) => {
    const state = copy(source);
    for (const a of state.battle.actors) {
      if (deadParty && a.side === 'party' || deadEnemies && a.side === 'enemy' || deadHero && a.id === 'hero') a.hp = 0;
    }
    state.battle.outcome = outcome; state.battle.currentActorId = null;
    return state;
  };
  accepted(finish('defeat', { deadParty: true }), 'Standard whole-party defeat');
  rejected(finish('defeat', { deadHero: true }), 'Standard defeat still rejects a living companion');
  accepted(finish('victory', { deadEnemies: true }), 'Standard victory with living party');
  accepted(finish('victory', { deadEnemies: true, deadHero: true }), 'Standard victory may retain a downed hero and living companion');
  rejected(finish('victory'), 'Standard victory still rejects a living enemy');
  rejected(finish('victory', { deadParty: true, deadEnemies: true }), 'Standard victory still requires a living party member');
});

test('save-level casualty claims cannot smuggle hero or unapplied companion deaths through migration', () => {
  const source = ironmanOpening();
  for (const actorId of ['hero', 'mira']) {
    const state = copy(source);
    state.ironman.casualties = [{
      personId: person(state, actorId).id, day: state.day,
      battleId: 'battle-ironman-validation-1', generation: state.dynasty.generation,
    }];
    rejected(state, actorId === 'hero' ? 'hero is not a companion casualty' : 'captured but unapplied companion is not a durable casualty');
  }
});

test('public Paladin trial combat captures the exact supervised context and normal recruited party for every authored oath', () => {
  for (const oathType of Object.keys(OATHS)) {
    const state = paladinBattleFixture({ oathType });
    assert.deepEqual(state.battle.context, {
      kind: 'initiation', classId: 'paladin', ownerId: state.dynasty.activePersonId,
      locationId: state.locationId, oathType,
    });
    assert.deepEqual(state.battle.mortality, {
      version: 1, runId: RUN, lethal: false,
      participants: [
        { actorId: 'hero', personId: state.dynasty.activePersonId, kind: 'hero' },
        { actorId: 'mira', personId: person(state, 'mira').id, kind: 'companion' },
      ],
      deaths: [],
    });
    assert.ok(actor(state, 'mira'), 'Paladin supervision does not impose watchhouse solo rules');
    accepted(JSON.parse(JSON.stringify(state)), `public supervised ${oathType} trial reload`);
  }
});

test('imported Paladin supervision cannot survive missing or altered exact context, oath, class, owner or run', () => {
  const source = paladinBattleFixture();
  for (const [label, change] of [
    ['missing captured context', s => { delete s.battle.context; }],
    ['null captured context', s => { s.battle.context = null; }],
    ['unexpected captured context key', s => { s.battle.context.supervised = true; }],
    ['another class context', s => { s.battle.context.classId = 'necromancer'; }],
    ['another exact owner context', s => { s.battle.context.ownerId = person(s, 'mira').id; }],
    ['another location context', s => { s.battle.context.locationId = s.world.locations.find(p => p.id !== s.locationId).id; }],
    ['another oath context', s => { s.battle.context.oathType = 'truth'; }],
    ['missing pending class', s => { delete s.flags.pendingSpecialization; }],
    ['another pending class', s => { s.flags.pendingSpecialization = 'necromancer'; }],
    ['missing authored oath', s => { delete s.flags.oath; }],
    ['altered authored oath', s => { s.flags.oath += ' A different condition.'; }],
    ['missing oath type', s => { delete s.flags.oathType; }],
    ['changed oath flags', s => { s.flags.oathType = 'truth'; s.flags.oath = OATHS.truth; }],
    ['wrong hero path', s => { s.hero.path = 'mage'; }],
    ['no living hero health', s => { s.hero.hp = 0; }],
    ['site no longer usable', s => { s.world.locations.find(p => p.id === s.locationId).servicesAvailable = false; }],
    ['captured run mismatch', s => { s.battle.mortality.runId = OTHER_RUN; }],
    ['supervision cannot switch to lethal capture', s => { s.battle.mortality.lethal = true; }],
    ['nonlethal trial cannot capture even an exact companion death', s => {
      actor(s, 'mira').hp = 0;
      s.battle.turnOrder = s.battle.turnOrder.filter(id => id !== 'mira');
      s.battle.currentActorId = 'hero';
      s.battle.mortality.deaths = [{ actorId: 'mira', personId: person(s, 'mira').id }];
    }],
  ]) {
    const state = copy(source); change(state); rejected(state, label);
  }
});

test('supervised Paladin zero-health snapshots remain nonlethal rather than acquiring captured deaths or an Ironman terminal', () => {
  const source = paladinBattleFixture();
  for (const downedIds of [['mira'], ['hero'], ['hero', 'mira']]) {
    const state = copy(source);
    for (const id of downedIds) actor(state, id).hp = 0;
    state.battle.turnOrder = state.battle.turnOrder.filter(id => !downedIds.includes(id));
    const survivor = state.battle.actors.find(a => a.side === 'party' && a.hp > 0);
    state.battle.currentActorId = survivor?.id || null;
    state.battle.outcome = survivor ? null : 'defeat';
    assert.deepEqual(state.battle.mortality.deaths, []);
    const restored = accepted(state, `nonlethal supervised zero: ${downedIds.join(', ')}`);
    assert.deepEqual(restored.ironman.casualties, []);
    assert.deepEqual(restored.lineage, source.lineage);
    assert.deepEqual(restored.companions, source.companions);
  }
});

test('public Paladin entry refuses a stale oath or under-20-health offer without starting any battle', () => {
  for (const [label, change] of [
    ['missing oath', s => { delete s.flags.oath; }],
    ['changed oath', s => { s.flags.oath = 'A new unauthenticated oath.'; }],
    ['health below entry requirement', s => { s.hero.hp = 19; }],
  ]) {
    const source = trialChoiceFixture(); change(source);
    assert.equal(validateSave(source), true, `${label}: controlled pending save is still valid`);
    const before = copy(source), next = chooseEventOption(source, 'combat');
    assert.deepEqual(source, before);
    assert.equal(next.battle, null, label);
    assert.deepEqual(next.event, source.event, `${label}: original offered choice is retained`);
    assert.equal(next.hero.hp, source.hero.hp);
    assert.deepEqual(next.ironman, source.ironman);
    accepted(next, `${label}: refused public entry remains reloadable`);
  }
});

test('Standard Paladin initiation keeps the old public branch with no new context or mortality metadata', () => {
  const state = paladinBattleFixture({ ironman: false });
  assert.equal(Object.hasOwn(state, 'ironman'), false);
  assert.equal(Object.hasOwn(state.battle, 'mortality'), false);
  assert.equal(Object.hasOwn(state.battle, 'context'), false);
  assert.ok(actor(state, 'mira'), 'ordinary recruited party is unchanged');
  accepted(state, 'unchanged Standard initiation');
});

test('result comparison permits new captured deaths but rejects removal or any captured mortality policy change', () => {
  const state = battleFixture(), before = copy(state), completed = copy(state.battle);
  const mira = completed.actors.find(a => a.id === 'mira'), previousHp = mira.hp;
  mira.hp = 0;
  assert.equal(recordCombatZero(completed, 'mira', previousHp), true);
  assert.equal(sameBattleMortalityPolicy(state.battle, completed), true, 'new captured deaths may accumulate');
  assert.equal(sameBattleMortalityPolicy(completed, state.battle), false, 'a captured death cannot disappear');
  assert.deepEqual(state, before, 'comparison never applies a death to live people');

  for (const [label, change] of [
    ['removed mortality', b => { delete b.mortality; }],
    ['other captured version', b => { b.mortality.version = 2; }],
    ['other captured run', b => { b.mortality.runId = OTHER_RUN; }],
    ['changed lethality', b => { b.mortality.lethal = false; }],
    ['changed exact participant', b => { b.mortality.participants[1].personId = person(state, 'orrin').id; }],
    ['reordered captured participants', b => { b.mortality.participants.reverse(); }],
  ]) {
    const result = copy(state.battle);
    result.outcome = 'retreat'; result.currentActorId = null;
    change(result);
    assert.equal(sameBattleMortalityPolicy(state.battle, result), false, label);
    const refused = resolveBattle(state, result);
    assert.match(refused.notice, /captured combat mortality rules/, label);
    assert.deepEqual({ ...refused, notice: state.notice }, state, `${label}: rejected before any settlement`);
    assert.deepEqual(state, before, `${label}: source remains untouched`);
  }
});

test('an exact already-applied ongoing companion casualty reloads despite its now-inactive and unrecruited live roster flags', () => {
  const state = appliedCasualtyFixture(), expected = copy(state.ironman.casualties);
  const mira = state.companions.find(p => p.id === 'mira');
  assert.equal(mira.alive, false); assert.equal(mira.active, false); assert.equal(mira.recruited, false);
  assert.equal(mira.hp, 0); assert.equal(mira.deathDay, state.day);
  assert.equal(person(state, 'mira').alive, false);
  assert.equal(person(state, 'mira').deathDay, state.day);
  assert.equal(state.rpg.companionStages.mira.status, 'dead');
  const restored = accepted(JSON.parse(JSON.stringify(state)), 'exact current-battle applied casualty');
  assert.deepEqual(restored.ironman.casualties, expected);
  assert.deepEqual(restored.battle.mortality.deaths, [{ actorId: 'mira', personId: person(state, 'mira').id }]);
});

test('applied companion death cannot be resurrected by healing, removing its latch or reviving live roster flags', () => {
  const source = appliedCasualtyFixture();
  for (const [label, change] of [
    ['positive captured HP without death latch', s => {
      actor(s, 'mira').hp = 1;
      s.battle.mortality.deaths = [];
      s.battle.turnOrder.push('mira');
    }],
    ['zero captured HP without death latch', s => { s.battle.mortality.deaths = []; }],
    ['positive captured HP retaining death latch', s => {
      actor(s, 'mira').hp = 1;
      s.battle.turnOrder.push('mira');
    }],
    ['revived live companion despite durable casualty', s => {
      Object.assign(s.companions.find(p => p.id === 'mira'), {
        alive: true, active: true, recruited: true, hp: 1, deathDay: null,
      });
      Object.assign(person(s, 'mira'), { alive: true, deathDay: null });
      s.rpg.companionStages.mira.status = 'available';
    }],
  ]) {
    const state = copy(source); change(state); rejected(state, label);
  }
});

test('old-battle and unledgered deceased companions cannot be reintroduced as newly captured deaths', () => {
  const source = appliedCasualtyFixture();
  for (const [label, change] of [
    ['casualty belongs to an earlier battle', s => { s.ironman.casualties[0].battleId = 'battle-ironman-validation-prior'; }],
    ['dead lineage has no matching applied casualty', s => { s.ironman.casualties = []; }],
  ]) {
    const state = copy(source); change(state);
    // The deceased person's non-battle record is itself valid. It is the
    // attempted re-entry, even with a forged exact zero/death latch, that fails.
    const outsideBattle = copy(state); outsideBattle.battle = null;
    accepted(outsideBattle, `${label}: standalone deceased-person record`);
    rejected(state, `${label}: exact actor zero and death latch do not authorize re-entry`);
    actor(state, 'mira').hp = 1;
    state.battle.mortality.deaths = [];
    state.battle.turnOrder.push('mira');
    rejected(state, `${label}: positive captured actor without a death latch cannot return either`);
  }
});

test('a roster actor cannot evade captured person validation by declaring itself ephemeral and dropping its participant', () => {
  const state = battleFixture();
  actor(state, 'mira').ephemeral = true;
  state.battle.mortality.participants = state.battle.mortality.participants.filter(p => p.actorId !== 'mira');
  rejected(state, 'caller-controlled ephemeral flag cannot erase a real companion identity');
});

test('a real roster actor cannot evade captured person validation by changing sides and dropping its participant', () => {
  const state = battleFixture();
  actor(state, 'mira').side = 'enemy';
  state.battle.mortality.participants = state.battle.mortality.participants.filter(p => p.actorId !== 'mira');
  rejected(state, 'caller-controlled enemy side cannot erase a real companion identity');
});

test('the actual generated ash construct stays separate from named people and requires its exact temporary flag', () => {
  const state = ironmanOpening();
  // Controlled captured-technique precondition, not an earned-technique claim.
  state.rpg.trainedTechniques.push('grave_attendant');
  assert.equal(validateSave(state), true, 'controlled actual technique list is valid first');
  state.battle = createBattle(state, 'forest', null, { openingTurns: false });
  state.battle.instanceId = 'battle-ironman-validation-construct';
  const construct = actor(state, 'ash_attendant');
  assert.ok(construct); assert.equal(construct.ephemeral, true); assert.equal(construct.hp, 0);
  assert.equal(state.battle.mortality.participants.some(p => p.actorId === construct.id), false);
  accepted(state, 'actual generated dormant ash construct');

  construct.hp = construct.maxHp;
  state.battle.turnOrder.push(construct.id);
  accepted(state, 'living construct does not acquire a lineage participant');
  const previousHp = construct.hp; construct.hp = 0;
  state.battle.turnOrder = state.battle.turnOrder.filter(id => id !== construct.id);
  assert.equal(recordCombatZero(state.battle, construct.id, previousHp), false);
  assert.deepEqual(state.battle.mortality.deaths, []);
  accepted(state, 'construct zero is not a named-person casualty');

  for (const ephemeral of [false, undefined, 'true']) {
    const invalid = copy(state); actor(invalid, 'ash_attendant').ephemeral = ephemeral;
    rejected(invalid, 'only the known construct with ephemeral exactly true is exempt');
  }
});

test('accepted captured negative healing previews and records the same detached hero death before any later turn', () => {
  const state = battleFixture(), hero = actor(state, 'hero');
  // This is deliberately an accepted captured-stat boundary, not earned gear
  // or a rebuilt live hero. Ordinary non-tournament captured stats allow magic
  // down to -200. Keep every other generated actor/stat and live person intact.
  hero.role = 'healer'; hero.specialization = 'healer'; hero.gear.magic = -21; hero.hp = 1;
  assert.equal(state.battle.currentActorId, 'hero');
  assert.ok(hero.mp >= 5);
  assert.equal(validateSave(state), true, 'real validator accepts the controlled captured-stat boundary first');
  accepted(state, 'controlled negative-healing captured stats survive migration');
  const before = copy(state), skill = getBattleActions(state.battle).find(a => a.id === 'skill');
  assert.ok(skill && !skill.disabledReason); assert.equal(skill.targetSide, 'party');
  const preview = previewBattleAction(state.battle, 'skill', 'hero');
  assert.equal(preview.legal, true, 'the offered self-target command is legal');
  assert.equal(preview.effects.find(effect => effect.id === 'hero')?.hp, -1, 'preview actually crosses the named hero to zero');
  assert.deepEqual(state, before, 'even a fatal preview leaves the input game and battle exactly untouched');

  const result = takeBattleActionDetailed(state.battle, 'skill', 'hero');
  assert.equal(result.accepted, true); assert.equal(result.actorId, 'hero'); assert.equal(result.targetId, 'hero');
  assert.ok(result.afterCommand);
  assert.deepEqual(result.battle, result.afterCommand, 'the lethal command stops before any automatic next turn');
  for (const effect of preview.effects) {
    const original = before.battle.actors.find(a => a.id === effect.id);
    const actual = result.afterCommand.actors.find(a => a.id === effect.id);
    assert.equal(actual.hp - original.hp, effect.hp, `${effect.id}: preview HP matches actual detached command evidence`);
    assert.equal(actual.mp - original.mp, effect.mp, `${effect.id}: preview MP matches actual detached command evidence`);
    assert.equal((actual.status.ward || 0) - (original.status.ward || 0), effect.ward, `${effect.id}: preview ward matches actual evidence`);
  }
  for (const [label, battle] of [['afterCommand', result.afterCommand], ['result', result.battle]]) {
    assert.equal(battle.actors.find(a => a.id === 'hero').hp, 0);
    assert.equal(battle.outcome, 'ironman-death'); assert.equal(battle.currentActorId, null);
    assert.deepEqual(battle.mortality.deaths, [{ actorId: 'hero', personId: state.dynasty.activePersonId }]);
    accepted({ ...copy(state), battle: copy(battle) }, `${label}: validated internal captured-stat terminal`);
  }
  assert.deepEqual(state, before, 'detailed fatal command and terminal validation never mutate input game/battle');
  assert.deepEqual(state.ironman.casualties, []);
  assert.equal(person(state, 'hero').alive, true);
});

test('a real public Watchhouse bout retains exact solo nonlethal mortality through import and rejects context-owner tampering', () => {
  // Reuse only the published data and bounded public route from the existing
  // adult-tournament engine suite. Do not import another registering test file.
  const published = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base;
  let state = migrateSave(published);
  assert.ok(state); assert.equal(validateSave(state), true, 'published base is valid before any controlled opt-in');
  const settle = initial => {
    let next = initial;
    for (let n = 0; n < 100; n++) {
      if (next.event) {
        const choice = ['continue', 'care', 'later', 'animal', 'avoid', 'support', 'pause', 'keep']
          .map(id => next.event.choices.find(c => c.id === id && !c.disabledReason)).find(Boolean)
          || next.event.choices.find(c => !c.disabledReason);
        assert.ok(choice, 'bounded published-fixture continuation has an offered choice');
        next = chooseEventOption(next, choice.id);
      } else if (next.conversations?.pending) {
        next = replyMessage(next, next.conversations.pending.personId, next.conversations.pending.replies[0].id);
      } else if (next.stories?.project) next = chooseAction(next, 'stories_continue');
      else if (next.timeline.yearTarget !== null) next = continueAgeUp(next);
      else return next;
    }
    throw new Error('No bounded legal end to this published waiting moment.');
  };
  state = settle(state);
  const path = settlementWalkPath(state, 'watch');
  assert.ok(path, 'actual saved settlement has a public path to its watchhouse');
  for (const room of path) state = chooseAction(state, 'atlas_room_' + room);
  assert.equal(validateSave(state), true, 'playable public watchhouse opening is valid before opt-in');
  assert.equal(state.event, null); assert.equal(state.battle, null);
  state.ironman = createIronmanMetadata(state, { randomUUID: () => RUN });
  assert.equal(validateSave(state), true, 'controlled Ironman opening is valid before invitation');
  state = chooseAction(state, 'tournament_invite');
  assert.equal(state.event?.id, 'tournament_invitation');
  state = chooseEventOption(state, 'enter');
  state = settle(state);
  if (state.adultTournament.stage === 'paused') state = chooseAction(state, 'tournament_resume');
  assert.equal(state.adultTournament.stage, 'ready', state.notice);
  assert.equal(validateSave(state), true, 'actual accepted ready card is valid before beginning');
  state = chooseAction(state, 'tournament_bout_0');
  assert.equal(state.battle?.context.kind, 'tournament');
  assert.equal(state.battle.actors.length, 2);
  assert.deepEqual(state.battle.actors.filter(a => a.side === 'party').map(a => a.id), ['hero']);
  assert.deepEqual(state.battle.mortality, {
    version: 1, runId: RUN, lethal: false,
    participants: [{ actorId: 'hero', personId: state.dynasty.activePersonId, kind: 'hero' }], deaths: [],
  });
  accepted(JSON.parse(JSON.stringify(state)), 'actual public solo supervised Watchhouse import');
  const wrongOwner = copy(state); wrongOwner.battle.context.ownerId = 'another-exact-owner';
  rejected(wrongOwner, 'Watchhouse context must retain its exact accepted owner');
  const omittedContext = copy(state); delete omittedContext.battle.context;
  rejected(omittedContext, 'Watchhouse supervision cannot survive omitted captured context');
});
