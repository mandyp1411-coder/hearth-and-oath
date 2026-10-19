import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, validateWorld } from '../dist/js/world.js';
import {
  createGame, getActions, chooseAction, chooseEventOption, travelTo,
  recruitCompanion, toggleCompanion, resolveBattle, validateSave,
} from '../dist/js/engine.js';
import { getBattleActions, takeBattleAction } from '../dist/js/combat.js';

function transition(state, operation) {
  const before = structuredClone(state);
  const next = operation(state);
  assert.deepEqual(state, before, 'the input save must not be mutated');
  assert.notEqual(next, state);
  assert.notEqual(next.hero, state.hero);
  assert.notEqual(next.world, state.world);
  return next;
}

function choose(state, optionId) {
  assert.ok(state.event?.choices.some(option => option.id === optionId), `${state.event?.id} must offer ${optionId}`);
  return transition(state, value => chooseEventOption(value, optionId));
}

function acknowledgeFollowups(state) {
  for (let count = 0; count < 3; count += 1) {
    if (state.event?.id === 'plague_letter') state = choose(state, 'promise');
    else if (state.event?.id === 'orrin_request') state = choose(state, 'honest');
    else return state;
  }
  assert.fail('unexpectedly repeated routine followup');
}

function activity(state, actionId) {
  state=knownCurseMeeting(state,actionId);
  state = acknowledgeFollowups(state);
  const action = getActions(state).find(item => item.id === actionId);
  assert.ok(action, `${actionId} must be available at ${state.locationId}`);
  assert.equal(action.disabledReason, undefined, `${actionId}: ${action.disabledReason}`);
  const next = transition(state, value => chooseAction(value, actionId));
  assert.equal(next.day, state.day + action.days, `${actionId} must spend its advertised time`);
  assert.ok(next.hero.gold >= 0, 'activities cannot spend money the player lacks');
  assert.ok(next.hero.hp >= 1 && next.hero.hp <= next.hero.maxHp);
  assert.ok(next.hero.mp >= 0 && next.hero.mp <= next.hero.maxMp);
  return next;
}

function growUp(config = {}, education = 'apprentice', curiosity = 'question') {
  let state = createGame({ name: 'Rowan', path: 'mage', origin: 'village', household: 'poor', seed: 'journey-life', ...config });
  for (const [eventId, optionId] of [['childhood_1', 'defend'], ['childhood_2', education], ['childhood_3', curiosity]]) {
    assert.equal(state.phase, 'childhood');
    assert.equal(state.event.id, eventId);
    state = choose(state, optionId);
  }
  assert.equal(state.phase, 'adult');
  assert.equal(state.age, 18);
  assert.equal(state.day, 0);
  assert.equal(state.event, null);
  return state;
}

function move(state, locationId) {
  state = acknowledgeFollowups(state);
  const next = transition(state, value => travelTo(value, locationId));
  assert.equal(next.locationId, locationId);
  assert.ok(next.day > state.day);
  assert.ok(next.hero.gold >= 0);
  return next;
}

function resources(state) {
  return { day: state.day, age: state.age, locationId: state.locationId, hero: state.hero, event: state.event, battle: state.battle };
}

function winBattle(state, usePotion = false) {
  let next = structuredClone(state);
  let potionSpent = false;
  for (let turn = 0; turn < 100 && !next.battle.outcome; turn += 1) {
    const battle = next.battle;
    const options = getBattleActions(battle).filter(item => !item.disabledReason);
    const injured = battle.actors.filter(actor => actor.side === 'party' && actor.hp > 0 && actor.hp < actor.maxHp)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    const potion = options.find(item => item.id === 'potion');
    let selected;
    let target;
    if (usePotion && !potionSpent && potion && injured) {
      selected = potion;
      target = injured.id;
      potionSpent = true;
    } else {
      selected = options.find(item => item.id === 'skill' && item.targetSide === 'enemy') || options.find(item => item.id === 'attack');
      target = battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0)?.id;
    }
    assert.ok(selected, 'a living party actor must have an available move');
    next.battle = takeBattleAction(battle, selected.id, target);
  }
  assert.equal(next.battle.outcome, 'victory', 'ordinary prepared party must be able to finish the encounter');
  if (usePotion) assert.equal(potionSpent, true, 'journey must actually consume a potion');
  return next;
}

function ancestralQuestion(recruits = []) {
  let state = growUp({ seed: 'private-rite' });
  for (const id of recruits) state = transition(state, value => recruitCompanion(value, id));
  for (let count = 0; count < 3; count += 1) state = activity(state, 'work');
  state = move(state, 'city');
  state = activity(state, 'consult_academy');
  state = choose(state, 'research');
  state = move(state, 'ruin');
  return activity(state, 'ask_ancestor');
}

test('seeded worlds are reproducible, connected, and preserve every advertised route', () => {
  const signatures = new Set();
  for (let index = 0; index < 60; index += 1) {
    const seed = `journey-${index}`;
    const world = generateWorld(seed);
    assert.deepEqual(generateWorld(seed), world);
    assert.equal(validateWorld(world), true, seed);
    assert.deepEqual(world.locations.map(location => location.type).sort(), ['city', 'forest', 'ruin', 'village', 'village']);

    const reachable = new Set(['home']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const { from, to } of world.roads) {
        if (reachable.has(from) && !reachable.has(to)) { reachable.add(to); changed = true; }
        if (reachable.has(to) && !reachable.has(from)) { reachable.add(from); changed = true; }
      }
    }
    assert.equal(reachable.size, world.locations.length);
    for (const path of ['paladin', 'necromancer', 'assassin']) {
      const route = world.routes[path];
      const mentor = world.mentors.find(person => person.id === route.mentorId);
      assert.equal(mentor.specialization, path);
      assert.equal(mentor.available, true);
      assert.equal(reachable.has(mentor.locationId), true);
      assert.equal(route.locationIds.every(id => reachable.has(id)), true);
    }
    signatures.add(JSON.stringify(world));
  }
  assert.ok(signatures.size > 1, 'seeds must change meaningful world circumstances');
});

test('world validation rejects disconnected maps and missing class entry routes', () => {
  const disconnected = generateWorld('broken-road');
  disconnected.roads = disconnected.roads.filter(road => road.to !== 'ruin' && road.from !== 'ruin');
  assert.equal(validateWorld(disconnected), false);
  const noMentor = generateWorld('broken-mentor');
  noMentor.mentors = noMentor.mentors.filter(mentor => mentor.specialization !== 'necromancer');
  assert.equal(validateWorld(noMentor), false);
});

test('childhood choices become an adult life with a remembered friend and civilian work', () => {
  let state = growUp({ path: 'rogue' });
  const mira = state.companions.find(person => person.id === 'mira');
  assert.ok(mira.memories.length > 0, 'childhood friendship must survive the age transition');
  state = activity(state, 'choose_profession');
  state = choose(state, 'healer');
  assert.equal(state.hero.profession, 'Healer');
  assert.equal(state.hero.path, 'rogue');
  const gold = state.hero.gold;
  const devotion = state.hero.skills.devotion;
  state = activity(state, 'work');
  assert.ok(state.hero.gold > gold);
  assert.ok(state.hero.skills.devotion > devotion);
  state = acknowledgeFollowups(state);
  state = transition(state, value => recruitCompanion(value, 'mira'));
  assert.equal(state.companions.find(person => person.id === 'mira').recruited, true);
  assert.ok(state.journal.some(entry => entry.tag === 'livelihood'));
  assert.equal(validateSave(JSON.parse(JSON.stringify(state))), true);
});

test('pending childhood events and unavailable activities cannot spend resources or skip decisions', () => {
  const child = createGame({ seed: 'paused-childhood' });
  assert.deepEqual(getActions(child), []);
  for (const operation of [
    value => chooseAction(value, 'work'),
    value => chooseEventOption(value, 'nonexistent-choice'),
    value => travelTo(value, 'ruin'),
  ]) {
    const next = transition(child, operation);
    assert.deepEqual(resources(next), resources(child));
  }

  const adult = growUp();
  const pending = activity(adult, 'choose_profession');
  for (const operation of [value => chooseAction(value, 'work'), value => travelTo(value, 'city')]) {
    const next = transition(pending, operation);
    assert.deepEqual(resources(next), resources(pending));
  }
  assert.deepEqual(resources(transition(adult, value => chooseAction(value, 'unknown-action'))), resources(adult));
});

test('a scholarship promise has a visible deadline and a remembered once-only penalty', () => {
  let state = growUp({}, 'scholarship');
  const obligation = state.obligations.find(item => item.id === 'scholarship_service');
  assert.ok(obligation && !obligation.resolved);
  assert.ok(Number.isInteger(obligation.dueDay) && obligation.dueDay > state.day);
  while (state.day <= obligation.dueDay) state = acknowledgeFollowups(activity(state, 'camp_rest'));
  const missed = state.obligations.find(item => item.id === 'scholarship_service');
  assert.equal(missed.resolved, true);
  assert.equal(missed.missed, true);
  assert.equal(state.flags.scholarshipMissed, true);
  assert.ok(state.journal.some(entry => entry.title === 'A promise came due' && entry.text.includes(obligation.title)));
  const academy = state.factions.academy;
  state = activity(state, 'camp_rest');
  assert.equal(state.factions.academy, academy, 'an already missed deadline must not charge again');
  state = activity(state, 'help_clinic');
  assert.equal(state.obligations.find(item => item.id === 'scholarship_service').resolved, true);
});

test('each advertised specialization is reachable from a poor household without abandoning a livelihood', () => {
  for (const [path, specialization, seekId, commitment] of [
    ['warrior', 'paladin', 'seek_order', 'mercy'],
    ['mage', 'necromancer', 'seek_necromancy', 'consent'],
    ['rogue', 'assassin', 'seek_assassin', 'ledger'],
  ]) {
    let state = growUp({ path, origin: path === 'rogue' ? 'city' : 'village', seed: `poor-${path}` });
    if (path === 'mage') {
      state = activity(state, 'study');
      state = activity(state, 'train');
      state = activity(state, 'train');
    } else {
      for (let count = 0; count < 3; count += 1) state = activity(state, 'train');
      if (path === 'warrior') {
        state = activity(state, 'pray');
        state = activity(state, 'pray');
      }
    }
    state = acknowledgeFollowups(state);
    if (state.locationId !== 'city') state = move(state, 'city');
    state = activity(state, seekId);
    state = choose(state, commitment);
    assert.equal(state.event.id, 'initiation_trial');
    const beforeTrial = state.day;
    state = choose(state, 'service');
    assert.equal(state.day, beforeTrial + 4);
    assert.equal(state.hero.specialization, specialization);
    assert.equal(state.hero.path, path);
    assert.equal(state.hero.profession, 'Herbalist');
    assert.equal(validateSave(state), true, `${specialization} life must remain saveable`);
    if (specialization === 'paladin') {
      assert.ok(state.flags.oath.includes('mercy'));
      assert.ok(state.obligations.some(item => item.id === 'oath_service' && !item.resolved));
    }
    if (specialization === 'necromancer') assert.equal(state.legal.evidence, 0, 'consensual study does not create an automatic criminal record');
  }
});

test('forbidden research can save home while gratitude, friendship, and local evidence remain separate', () => {
  const seed = Array.from({ length: 60 }, (_, index) => `law-journey-${index}`)
    .find(value => generateWorld(value).locations.find(place => place.id === 'home').necromancyLaw === 'forbidden');
  assert.ok(seed, 'scenario requires a home where public necromancy is forbidden');
  let state = growUp({ seed });
  state = transition(state, value => recruitCompanion(value, 'mira'));
  for (let count = 0; count < 3; count += 1) state = activity(state, 'work');
  state = acknowledgeFollowups(state);
  state = move(state, 'city');
  state = activity(state, 'consult_academy');
  state = choose(state, 'research');
  assert.equal(state.flags.researchBorrowed, true);
  assert.ok(state.obligations.some(item => item.id === 'return_research' && !item.resolved));
  assert.equal(state.legal.evidence, 0);
  state = move(state, 'ruin');
  state = activity(state, 'ask_ancestor');
  state = choose(state, 'consent');
  assert.equal(state.flags.plagueStage, 3);
  assert.equal(state.flags.remedyMethod, 'ancestral');
  assert.equal(state.hero.specialization, null, 'the story must not require an advanced combat class');
  assert.equal(state.legal.incidents.length, 0, 'private study must not inform authorities');
  assert.ok(state.companions.find(person => person.id === 'mira').memories.some(memory => memory.includes('willing ancestor')));
  state = move(state, 'home');
  state = activity(state, 'deliver_remedy');
  const friendship = state.companions.find(person => person.id === 'mira').relationship;
  const publicAccount = choose(state, 'open');
  assert.equal(publicAccount.flags.villageSaved, true);
  assert.ok(publicAccount.factions.villagers > state.factions.villagers);
  assert.ok(publicAccount.companions.find(person => person.id === 'mira').relationship > friendship);
  assert.equal(publicAccount.legal.evidence, 2, 'public disclosure leaves witnessed evidence in a prohibiting village');
  assert.equal(publicAccount.legal.wanted, false, 'a report and a warrant are different situations');
  assert.ok(publicAccount.journal.some(entry => entry.title === 'Homecoming after the Ashfall'));
  assert.equal(publicAccount.event.id, 'homecoming_aftermath');

  const privateAccount = choose(state, 'private');
  assert.equal(privateAccount.flags.villageSaved, true);
  assert.equal(privateAccount.flags.miraKnowsResearch, true);
  assert.equal(privateAccount.legal.evidence, 0, 'a private confidence creates no automatic official report');
  const retired = choose(privateAccount, 'chronicle');
  assert.equal(retired.phase, 'retired');
  assert.ok(retired.chronicle.includes('ancestral testimony'));
  assert.ok(retired.chronicle.includes(retired.hero.name));
  assert.ok(retired.chronicle.includes(retired.world.locations.find(place => place.id === 'home').name));
  assert.deepEqual(getActions(retired), []);
  assert.equal(validateSave(JSON.parse(JSON.stringify(retired))), true);
  state = choose(publicAccount, 'continue');
  state = activity(state, 'visit_family');
  assert.ok(state.event.body.includes('grateful for your research'), 'returning home must mention its remembered history');
  state = choose(state, 'time');
  state = move(state, 'city');
  assert.equal(state.legal.evidence, 0, 'home evidence does not become a city charge');
  state = activity(state, 'return_research');
  assert.equal(state.flags.researchReturned, true);
  assert.equal(state.flags.knowsAncestralRite, true, 'returning a borrowed original does not erase learned knowledge');
  assert.equal(validateSave(state), true);
});

test('travel charges the displayed days and unavailable purchases preserve resources', () => {
  let state = growUp({}, 'martial');
  state = activity(state, 'buy_potion');
  assert.equal(state.hero.gold, 2);
  const blocked = getActions(state).find(item => item.id === 'study');
  assert.ok(blocked.disabledReason);
  assert.deepEqual(resources(transition(state, value => chooseAction(value, 'study'))), resources(state));
  assert.deepEqual(resources(transition(state, value => travelTo(value, 'missing-town'))), resources(state));
  assert.deepEqual(resources(transition(state, value => travelTo(value, state.locationId))), resources(state));
  for (const destination of ['city', 'brook', 'forest', 'ruin', 'home']) {
    const before = acknowledgeFollowups(state);
    const days = before.world.locations.find(place => place.id === destination).travelDays;
    state = move(before, destination);
    assert.equal(state.day, before.day + days, 'travel must match the map button time');
    assert.equal(state.hero.gold, before.hero.gold, 'the map does not advertise a travel fee');
    assert.equal(state.age, 18 + Math.floor(state.day / 365));
  }
});

test('unfinished events and battles survive JSON saves and malformed imports are rejected', () => {
  const child = createGame({ seed: 'save-child', name: 'Save Rowan' });
  const restoredChild = JSON.parse(JSON.stringify(child));
  assert.equal(validateSave(restoredChild), true);
  assert.deepEqual(chooseEventOption(restoredChild, 'defend'), chooseEventOption(child, 'defend'));
  let state = growUp({ seed: 'save-battle' });
  state = transition(state, value => recruitCompanion(value, 'mira'));
  state = move(state, 'forest');
  state = activity(state, 'forest_expedition');
  assert.ok(state.battle && !state.battle.outcome);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(validateSave(restored), true);
  assert.deepEqual(restored.battle, state.battle);
  const enemyId = state.battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id;
  assert.deepEqual(takeBattleAction(restored.battle, 'attack', enemyId), takeBattleAction(state.battle, 'attack', enemyId));

  const invalids = [['null', null], ['missing fields', {}], ['unsupported version', { ...child, version: 999 }]];
  for (const [label, corrupt] of [
    ['negative gold', value => { value.hero.gold = -1; }],
    ['health above maximum', value => { value.hero.hp = value.hero.maxHp + 1; }],
    ['negative calendar', value => { value.day = -1; }],
    ['unknown location', value => { value.locationId = 'nowhere'; }],
    ['disconnected world', value => { value.world.roads = []; }],
    ['unknown current actor', value => { value.battle.currentActorId = 'absent-actor'; }],
    ['defeated current actor', value => { value.battle.actors.find(actor => actor.id === value.battle.currentActorId).hp = 0; }],
    ['enemy current actor', value => { value.battle.currentActorId = value.battle.actors.find(actor => actor.side === 'enemy').id; }],
    ['unearned victory', value => { value.battle.outcome = 'victory'; value.battle.currentActorId = null; }],
    ['combat health above maximum', value => { value.battle.actors[0].hp = value.battle.actors[0].maxHp + 1; }],
  ]) {
    const malformed = structuredClone(restored);
    corrupt(malformed);
    invalids.push([label, malformed]);
  }
  for (const [label, malformed] of invalids) assert.equal(validateSave(malformed), false, `${label} must not be importable`);
});

test('combat returns spent supplies and companion vitals to life and pays rewards only once', () => {
  let state = growUp({ seed: 'battle-to-life', household: 'tradesfolk' });
  for (const id of ['mira', 'kest']) state = transition(state, value => recruitCompanion(value, id));
  state = move(state, 'forest');
  state = activity(state, 'forest_expedition');
  const unfinished = transition(state, value => resolveBattle(value, value.battle));
  assert.deepEqual(resources(unfinished), resources(state), 'incomplete encounters cannot be resolved');
  const paused = state;
  for (const operation of [value => chooseAction(value, 'camp_rest'), value => travelTo(value, 'city')]) {
    assert.deepEqual(resources(transition(paused, operation)), resources(paused), 'a pending battle pauses ordinary life');
  }
  state = winBattle(state, true);
  assert.equal(validateSave(JSON.parse(JSON.stringify(state))), true, 'completed battle must also remain resumable');
  const completed = structuredClone(state.battle);
  const gold = state.hero.gold;
  const potions = state.hero.potions;
  const oldMaxHp = state.hero.maxHp;
  const oldMaxMp = state.hero.maxMp;
  state = transition(state, value => resolveBattle(value, completed));
  assert.equal(state.battle, null);
  assert.equal(state.hero.gold, gold + completed.rewards.gold);
  assert.equal(state.hero.potions, potions - completed.potionsUsed);
  const heroActor = completed.actors.find(actor => actor.id === 'hero');
  assert.equal(state.hero.hp, Math.min(state.hero.maxHp, heroActor.hp + state.hero.maxHp - oldMaxHp));
  assert.equal(state.hero.mp, Math.min(state.hero.maxMp, heroActor.mp + state.hero.maxMp - oldMaxMp));
  for (const actor of completed.actors.filter(item => item.side === 'party' && item.id !== 'hero')) {
    const companion = state.companions.find(person => person.id === actor.id);
    assert.equal(companion.hp, actor.hp);
    assert.equal(companion.mp, actor.mp);
  }
  assert.equal(state.flags.roadSafe, true);
  const again = transition(state, value => resolveBattle(value, completed));
  assert.deepEqual(resources(again), resources(state), 'reapplying a completed battle cannot grant rewards');
  assert.equal(validateSave(state), true);
});

test('an unwitnessed rite stays private while a present companion can enforce her stated limit', () => {
  const alone = ancestralQuestion();
  const privateBinding = choose(alone, 'bind');
  assert.equal(privateBinding.flags.soulBound, true);
  assert.equal(privateBinding.legal.evidence, 0);
  for (const id of ['mira', 'orrin', 'kest']) {
    const before = alone.companions.find(person => person.id === id);
    const after = privateBinding.companions.find(person => person.id === id);
    assert.equal(after.relationship, before.relationship, `${id} cannot react to an unknown private act`);
    assert.deepEqual(after.memories, before.memories);
  }
  assert.notEqual(privateBinding.flags.miraWithdrawn, true);
  let state = move(privateBinding, 'home');
  state = transition(state, value => recruitCompanion(value, 'mira'));
  assert.equal(state.companions.find(person => person.id === 'mira').active, true);
  state = activity(state, 'deliver_remedy');
  state = choose(state, 'private');
  assert.equal(state.flags.miraKnowsResearch, true);
  assert.equal(state.flags.miraWithdrawn, true, 'learning the truth in private can still cross a personal limit');
  assert.equal(state.legal.evidence, 0, 'personal knowledge and official evidence are separate');

  const witnessed = choose(ancestralQuestion(['mira']), 'bind');
  assert.equal(witnessed.flags.miraWithdrawn, true);
  const mira = witnessed.companions.find(person => person.id === 'mira');
  assert.equal(mira.active, false);
  assert.ok(mira.memories.some(memory => memory.includes('unwilling souls')));
  const refused = transition(witnessed, value => toggleCompanion(value, 'mira'));
  assert.equal(refused.companions.find(person => person.id === 'mira').active, false);
  assert.equal(witnessed.legal.evidence, 0, 'witnessing companions do not automatically report the player');
});

test('a truth oath responds to concealed theft and offers visible atonement', () => {
  let state = growUp({ path: 'warrior', origin: 'city', seed: 'truth-oath-2' }, 'apprentice', 'hide');
  for (let count = 0; count < 3; count += 1) state = activity(state, 'train');
  for (let count = 0; count < 2; count += 1) state = activity(state, 'pray');
  state = activity(state, 'seek_order');
  state = choose(state, 'truth');
  state = choose(state, 'service');
  const gold = state.hero.gold;
  const order = state.factions.order;
  state = activity(state, 'lift_purse');
  assert.equal(state.hero.gold, gold + 24, 'scenario must use a successful concealed theft');
  assert.equal(state.legal.evidence, 0);
  assert.equal(state.flags.oathBroken, true);
  assert.ok(state.factions.order < order);
  assert.equal(state.hero.specialization, 'paladin');
  assert.ok(state.journal.some(entry => entry.title === 'An oath broken'));
  state = activity(state, 'fulfill_oath');
  assert.equal(state.flags.oathBroken, false);
  assert.ok(state.journal.some(entry => entry.title === 'An oath broken'), 'atonement cannot erase history');
});

test('vampirism changes routine costs and a cure removes its bonus without erasing the existing life', () => {
  let state = growUp({ seed: 'vampire-routine' });
  for (let count = 0; count < 4; count += 1) state = activity(state, 'work');
  state = move(state, 'city');
  state = activity(state, 'vampire_invitation');
  const profession = state.hero.profession;
  const memories = structuredClone(state.companions.find(person => person.id === 'mira').memories);
  const mortalMaxMp = state.hero.maxMp;
  state = choose(state, 'accept');
  assert.equal(state.hero.condition.type, 'vampire');
  assert.equal(state.hero.maxMp, mortalMaxMp + 6);
  assert.equal(state.hero.profession, profession);
  assert.deepEqual(state.companions.find(person => person.id === 'mira').memories, memories);
  assert.equal(state.legal.evidence, 0);
  const beforeDaylight = state;
  state = move(state, 'forest');
  const travelDays = state.day - beforeDaylight.day;
  assert.equal(state.hero.hp, beforeDaylight.hero.hp - travelDays * 2);
  assert.equal(state.hero.condition.hunger, beforeDaylight.hero.condition.hunger + travelDays * 2);
  state = activity(state, 'night_travel');
  const beforeNight = state;
  state = move(state, 'home');
  assert.equal(state.hero.hp, beforeNight.hero.hp, 'planned dusk travel avoids daylight damage');
  for (let count = 0; count < 2; count += 1) state = activity(state, 'gather_herbs');
  const skills = structuredClone(state.hero.skills);
  const vampireMaxMp = state.hero.maxMp;
  state = activity(state, 'seek_cure');
  assert.equal(state.hero.condition, null);
  assert.equal(state.hero.maxMp, vampireMaxMp - 6, 'a cure removes the condition bonus while preserving level gains');
  assert.equal(state.hero.profession, profession);
  assert.deepEqual(state.hero.skills, skills);
  assert.deepEqual(state.companions.find(person => person.id === 'mira').memories, memories, 'an undisclosed condition and cure remain private');
  const curedMaxMp = state.hero.maxMp;
  state = move(state, 'city');
  const repeatOffer = getActions(acknowledgeFollowups(state)).find(item => item.id === 'vampire_invitation');
  if (repeatOffer) {
    state = activity(state, 'vampire_invitation');
    state = choose(state, 'accept');
    assert.equal(state.hero.maxMp, curedMaxMp + 6, 'another transformation cannot stack a previous condition bonus');
  }
  assert.equal(validateSave(state), true);
});
