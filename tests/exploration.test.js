import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS, initializeExploration, explorationActions, validateExploration, encounterIds } from '../dist/js/exploration.js';
import { createBattle, getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { initializeGear } from '../dist/js/gear.js';

function prepared(locationId = 'marsh') {
  const state = { version: 1, revision: 3, seed: 'deliberate-party', phase: 'adult', timeline: { mode: 'birth' }, age: 18, day: 6570, locationId, event: null, battle: null, flags: {}, campaign: { facts: {} },
    hero: { name: 'Rice', path: 'warrior', specialization: 'guardian', level: 3, hp: 76, maxHp: 76, mp: 45, maxMp: 45, gold: 50, potions: 6, attributes: { strength: 8, agility: 6, vitality: 6, intellect: 5, willpower: 5, presence: 5 }, skills: { weapons: 5, defense: 3, arcana: 3, devotion: 3, stealth: 3, survival: 3, scholarship: 3, persuasion: 3 }, condition: null },
    companions: [
      { id: 'mira', name: 'Mira', role: 'warrior', hp: 58, maxHp: 58, mp: 30, maxMp: 30, agility: 5, recruited: true, active: true },
      { id: 'orrin', name: 'Orrin', role: 'mage', hp: 48, maxHp: 48, mp: 40, maxMp: 40, agility: 4, recruited: true, active: true },
      { id: 'kest', name: 'Kest', role: 'rogue', hp: 48, maxHp: 48, mp: 35, maxMp: 35, agility: 8, recruited: true, active: true },
    ], journal: [], expEarned: 0, campaignTouches: 0 };
  initializeExploration(state); initializeGear(state, { starter: true });
  return state;
}

// The older room engine left in v0.72.4: the five campaign places are delves for every life (an authored
// maze already begun is walked to its end). What stays here is the places' data, which the delve and the
// begun mazes read, the doors that open them, and the encounters they hold.
test('all five places have real branches, reachable objectives, valid encounter IDs, and a door at their site', () => {
  assert.equal(DUNGEONS.length, 5);
  const known = encounterIds();
  assert.ok(known.length >= 15);
  for (const dungeon of DUNGEONS) {
    assert.ok(dungeon.rooms[0].exits.length >= 2);
    const pending = ['entry']; const visited = new Set();
    while (pending.length) { const id = pending.pop(); if (visited.has(id)) continue; visited.add(id); const here = dungeon.rooms.find((entry) => entry.id === id); assert.ok(here); pending.push(...here.exits); if (here.encounterId) assert.ok(known.includes(here.encounterId), here.encounterId); }
    assert.equal(visited.size, dungeon.rooms.length);
    assert.equal(dungeon.rooms.filter((here) => here.kind === 'boss').length, 1);
    const state = prepared(dungeon.locationId);
    const door = explorationActions(state).find(action => action.id === `explore_enter_${dungeon.id}`);
    assert.ok(door && !door.disabledReason, dungeon.id); assert.equal(door.days, 1); assert.equal(door.cost, 0);
    assert.equal(validateExploration(state.dungeon, state), true);
  }
});

test('the doors open at sixteen and at their own site only; no older walk is held', () => {
  const state = prepared(); state.age = 15;
  assert.deepEqual(explorationActions(state), []);
  state.age = 18; state.locationId = 'city';
  assert.ok(!explorationActions(state).some(action => action.id === 'explore_enter_cistern'));
  state.locationId = 'marsh';
  assert.ok(explorationActions(state).some(action => action.id === 'explore_enter_cistern'));
  assert.equal(validateExploration(null, state), true);
  assert.equal(validateExploration({ id: 'cistern', roomId: 'entry', visited: ['entry'], cleared: [], facts: {}, pendingRoom: null, complete: false }, state), false, 'a walk in the older room engine is not a save this build holds');
  state.flags.dungeonRecords = { cistern: { visited: ['entry'], cleared: [], facts: {}, complete: true } };
  assert.equal(validateExploration(null, state), false, 'a record must agree with its place');
  state.flags.dungeonRecords.cistern.complete = false;
  assert.equal(validateExploration(null, state), true, 'what a life walked there stays as its record');
});

for (const id of encounterIds().filter((id) => !['forest', 'ruin', 'initiation'].includes(id))) {
  test(`prepared party can beat ${id}, with meaningful inspectable enemy intent`, () => {
    const state = prepared();
    state.battle = createBattle(state, id);
    assert.equal(state.battle.encounterId, id);
    assert.ok(state.battle.actors.filter((actor) => actor.side === 'enemy').every((actor) => actor.intent.length > 20));
    const original = state.battle;
    // This verifies the encounter itself; it does not fabricate its outcome.
    let result = original;
    for (let step = 0; !result.outcome && step < 120; step++) {
      const actor = result.actors.find((actor) => actor.id === result.currentActorId);
      const foes = result.actors.filter((actor) => actor.side === 'enemy' && actor.hp > 0).sort((a, b) => a.hp - b.hp);
      const action = getBattleActions(result).find((action) => action.id === 'skill');
      result = takeBattleAction(result, action && !action.disabledReason ? 'skill' : 'attack', foes[0].id);
    }
    assert.equal(result.outcome, 'victory', JSON.stringify(result.log));
    assert.equal(original.outcome, null);
  });
}

for (const id of ['cistern_keeper', 'archive_warden', 'thornheart', 'tower_captain', 'core_warden', 'covenant_guardian']) {
  test(`an unformed sixteen-year-old with baseline companions can beat ${id}`, () => {
    const state = prepared(); state.age = 16;
    Object.assign(state.hero, { path: 'unformed', specialization: null, level: 1, hp: 53, maxHp: 53, mp: 25, maxMp: 25, potions: 2 });
    for (const key of Object.keys(state.hero.attributes)) state.hero.attributes[key] = 3;
    for (const key of Object.keys(state.hero.skills)) state.hero.skills[key] = 0;
    Object.assign(state.companions[0], { mp: 22, maxMp: 22 });
    Object.assign(state.companions[1], { hp: 43, maxHp: 43, mp: 38, maxMp: 38 });
    Object.assign(state.companions[2], { mp: 24, maxMp: 24 });
    state.equipment.equipped = { weapon: null, armor: null, trinket: null };
    let battle = createBattle(state, id);
    for (let step = 0; !battle.outcome && step < 120; step++) {
      const foes = battle.actors.filter((actor) => actor.side === 'enemy' && actor.hp > 0).sort((a, b) => a.hp - b.hp);
      const allies = battle.actors.filter((actor) => actor.side === 'party' && actor.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      const skill = getBattleActions(battle).find((action) => action.id === 'skill');
      if (allies[0].hp < 15 && battle.potions > 0) battle = takeBattleAction(battle, 'potion', allies[0].id);
      else battle = takeBattleAction(battle, skill && !skill.disabledReason ? 'skill' : 'attack', foes[0].id);
    }
    assert.equal(battle.outcome, 'victory', JSON.stringify(battle.log));
  });
}
