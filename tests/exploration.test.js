import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS, initializeExploration, enterDungeon, explorationActions, applyExplorationAction, applyExplorationChoice, afterExplorationBattle, explorationEventIds, validateExploration, dungeonView, encounterIds } from '../dist/js/exploration.js';
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

function context(state) {
  return {
    spendDays(days) { state.day += days; },
    journal(title, text, tag) { state.journal.push({ title, text, tag }); },
    setEvent(id, title, category, body, choices) { state.event = { id, title, category, body, choices }; },
    startBattle(id, battleContext) { state.battle = createBattle(state, id); state.battle.context = structuredClone(battleContext); },
    touchCampaign() { state.campaignTouches += 1; },
    standing() {}, witnesses() { return []; },
  };
}

function choose(state, id) {
  assert.ok(state.event?.choices.some((choice) => choice.id === id), `Missing ${id} at ${state.dungeon?.id}/${state.dungeon?.roomId}`);
  const eventId = state.event.id;
  state.event = null;
  assert.equal(applyExplorationChoice(state, eventId, id, context(state)), true);
}

function fight(state) {
  const pending = state.battle;
  let battle = pending;
  let turns = 0;
  while (!battle.outcome && turns++ < 150) {
    const actor = battle.actors.find((member) => member.id === battle.currentActorId);
    const foes = battle.actors.filter((member) => member.side === 'enemy' && member.hp > 0).sort((a, b) => a.hp - b.hp);
    const allies = battle.actors.filter((member) => member.side === 'party' && member.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const skill = getBattleActions(battle).find((action) => action.id === 'skill');
    if (allies[0].hp < 18 && battle.potions > 0) battle = takeBattleAction(battle, 'potion', allies[0].id);
    else if (skill && !skill.disabledReason && (skill.targetSide === 'enemy' || allies[0].hp < allies[0].maxHp)) battle = takeBattleAction(battle, 'skill', skill.targetSide === 'party' ? allies[0].id : foes[0].id);
    else battle = takeBattleAction(battle, 'attack', foes[0].id);
  }
  assert.equal(battle.outcome, 'victory', JSON.stringify(battle.log));
  for (const person of [state.hero, ...state.companions]) {
    const actor = battle.actors.find((member) => member.id === (person === state.hero ? 'hero' : person.id));
    if (actor) { person.hp = actor.hp; person.mp = actor.mp; }
  }
  state.hero.potions = battle.potions;
  state.hero.gold += pending.rewards.gold;
  state.expEarned += pending.rewards.exp;
  state.battle = null;
  const gold = state.hero.gold;
  const exp = state.expEarned;
  assert.equal(afterExplorationBattle(state, pending.context, 'victory', context(state)), true);
  assert.equal(state.hero.gold, gold, 'room hook must not pay combat gold twice');
  assert.equal(state.expEarned, exp, 'room hook must not pay combat experience twice');
  return battle;
}

test('all five room graphs have real branches, reachable objectives, valid encounter IDs, and safe exits', () => {
  assert.equal(DUNGEONS.length, 5);
  const known = encounterIds();
  assert.ok(known.length >= 15);
  for (const dungeon of DUNGEONS) {
    assert.ok(dungeon.rooms[0].exits.length >= 2);
    const pending = ['entry']; const visited = new Set();
    while (pending.length) { const id = pending.pop(); if (visited.has(id)) continue; visited.add(id); const here = dungeon.rooms.find((entry) => entry.id === id); assert.ok(here); pending.push(...here.exits); if (here.encounterId) assert.ok(known.includes(here.encounterId)); }
    assert.equal(visited.size, dungeon.rooms.length);
    assert.equal(dungeon.rooms.filter((here) => here.kind === 'boss').length, 1);
    const state = prepared(dungeon.locationId);
    assert.equal(enterDungeon(state, dungeon.id, null, context(state)), true);
    assert.ok(state.event.choices.some((choice) => choice.id === 'leave'));
    assert.equal(validateExploration(state.dungeon, state), true);
  }
});

test('hearing a guardian account adds persistent roleplay without free passage, rewards or repeatable journal farming', () => {
  const state = prepared('marsh'); const ctx = context(state);
  enterDungeon(state,'cistern',null,ctx); choose(state,'route_sluice');
  const before = {day:state.day,gold:state.hero.gold,hp:state.hero.hp,mp:state.hero.mp,exp:state.expEarned,cleared:[...state.dungeon.cleared]};
  choose(state,'listen');
  assert.equal(state.day,before.day); assert.equal(state.hero.gold,before.gold);
  assert.equal(state.hero.hp,before.hp); assert.equal(state.hero.mp,before.mp); assert.equal(state.expEarned,before.exp);
  assert.deepEqual(state.dungeon.cleared,before.cleared);
  assert.equal(state.dungeon.facts.listened_sluice,true);
  assert.match(state.event.body,/maintenance tally/);
  assert.ok(!state.event.choices.some(option=>option.id==='listen'));
  assert.ok(!state.event.choices.some(option=>option.id==='route_cache'),'hearing history does not clear a guarded room');
  choose(state,'leave'); enterDungeon(state,'cistern',null,ctx); choose(state,'route_sluice');
  assert.match(state.event.body,/maintenance tally/);
  assert.equal(state.journal.filter(entry=>entry.title==='A place with its own account').length,1);
  assert.equal(validateExploration(state.dungeon,state),true);
});

test('interrupted dungeon time cannot move rooms or restore resources after a calendar hold or actual death', () => {
  const state = prepared('marsh'); const ctx = context(state); enterDungeon(state,'cistern',null,ctx);
  const eventId = state.event.id; state.event = null;
  assert.equal(applyExplorationChoice(state,eventId,'route_sluice',{...ctx,spendDays(){return 0;}}),true);
  assert.equal(state.dungeon.roomId,'entry'); assert.deepEqual(state.dungeon.visited,['entry']);
  assert.match(state.notice,/real day/);
  assert.equal(applyExplorationChoice(state,eventId,'rest',{...ctx,spendDays(){state.day++;state.phase='retired';state.dungeon=null;return 1;}}),true);
  assert.equal(state.dungeon,null); assert.equal(state.hero.hp,76);
});

test('cistern journey uses real room battles and boss, preserves supplies once and completes only at its source', () => {
  const state = prepared();
  enterDungeon(state, 'cistern', 'cistern-investigation', context(state));
  choose(state, 'route_sluice'); choose(state, 'fight'); fight(state);
  assert.equal(state.dungeon.complete, false);
  assert.equal(state.campaign.facts['dungeon_cistern-investigation'], undefined);
  choose(state, 'route_cache'); choose(state, 'take');
  const gold = state.hero.gold;
  const materials = structuredClone(state.equipment.materials);
  choose(state, 'route_sluice'); choose(state, 'route_cache');
  assert.ok(!state.event.choices.some((choice) => choice.id === 'take'));
  assert.equal(state.hero.gold, gold);
  assert.deepEqual(state.equipment.materials, materials);
  choose(state, 'route_keeper'); choose(state, 'fight'); const boss = fight(state);
  assert.ok(boss.log.some((line) => line.includes('grants Cistern keeper')));
  assert.equal(state.dungeon.complete, false);
  choose(state, 'route_source'); choose(state, 'finish');
  assert.equal(state.dungeon.complete, true);
  assert.equal(state.campaign.facts['dungeon_cistern-investigation'], true);
  assert.equal(state.campaignTouches, 1);
  const view = dungeonView(state);
  assert.equal(view.complete, true);
  assert.equal(view.rooms.find((here) => here.id === 'source').cleared, true);
  assert.equal(validateExploration(state.dungeon, state), true);
  choose(state, 'leave');
  assert.equal(state.dungeon, null);
  assert.equal(enterDungeon(state, 'cistern', 'later-discovery', context(state)), true);
  assert.equal(state.campaign.facts['dungeon_later-discovery'], true);
  assert.equal(state.hero.gold, gold + boss.rewards.gold);
});

test('retreat keeps the room unfinished and defeat leaves the site without phantom quest success', () => {
  const state = prepared();
  enterDungeon(state, 'cistern', 'pending-quest', context(state));
  choose(state, 'route_sluice'); choose(state, 'fight');
  const first = state.battle.context;
  state.battle = null;
  assert.equal(afterExplorationBattle(state, first, 'retreat', context(state)), true);
  assert.ok(!state.dungeon.cleared.includes('sluice'));
  assert.ok(state.event.choices.some((choice) => choice.id === 'route_entry'));
  choose(state, 'fight'); const second = state.battle.context; state.battle = null;
  afterExplorationBattle(state, second, 'defeat', context(state));
  assert.equal(state.dungeon, null);
  assert.equal(state.campaign.facts['dungeon_pending-quest'], undefined);
  assert.equal(enterDungeon(state, 'cistern', 'pending-quest', context(state)), true);
  assert.ok(state.dungeon.visited.includes('sluice'));
  assert.ok(!state.dungeon.cleared.includes('sluice'));
});

test('a safe search route works without a class and peaceful passage gives no battle reward', () => {
  const state = prepared(); state.hero.path = 'unformed'; state.hero.specialization = null;
  enterDungeon(state, 'cistern', null, context(state));
  choose(state, 'route_flooded'); const hp = state.hero.hp; choose(state, 'search');
  assert.equal(state.hero.hp, hp);
  assert.ok(state.dungeon.cleared.includes('flooded'));
  assert.equal(state.battle, null);
  choose(state, 'route_entry'); choose(state, 'route_sluice');
  const gold = state.hero.gold; choose(state, 'parley');
  assert.equal(state.hero.gold, gold);
  assert.ok(state.dungeon.cleared.includes('sluice'));
  assert.equal(state.battle, null);
});

test('claimed caches survive exit/reentry and untrained hazard injury cannot kill a character', () => {
  const state = prepared();
  state.hero.skills.survival = 0; state.hero.skills.stealth = 0; state.hero.skills.scholarship = 0;
  enterDungeon(state, 'cistern', null, context(state)); choose(state, 'route_flooded');
  state.hero.hp = 3; choose(state, 'search'); assert.equal(state.hero.hp, 1);
  choose(state, 'route_cache');
  const cacheChoice = state.event.choices.find(choice => choice.id === 'take');
  assert.equal(cacheChoice.label, 'Recover the cache and its records');
  assert.doesNotMatch(cacheChoice.description, /optional account|negotiation evidence/);
  choose(state, 'take'); choose(state, 'leave');
  const gold = state.hero.gold;
  enterDungeon(state, 'cistern', null, context(state)); choose(state, 'route_flooded'); choose(state, 'route_cache');
  assert.ok(!state.event.choices.some((choice) => choice.id === 'take'));
  assert.equal(state.hero.gold, gold);
});

test('root spring retrieves real cure herbs once after an actual guardian battle', () => {
  const state = prepared('forest');
  enterDungeon(state, 'root_caverns', 'wild-route', context(state));
  choose(state, 'route_thorns'); choose(state, 'search'); choose(state, 'route_refuge'); choose(state, 'take');
  assert.equal(state.flags.herbs, 2);
  choose(state, 'route_thornheart'); choose(state, 'fight'); fight(state);
  choose(state, 'route_spring'); choose(state, 'finish');
  assert.equal(state.flags.herbs, 5);
  assert.equal(state.campaign.facts['dungeon_wild-route'], true);
  assert.ok(!state.event.choices.some((choice) => choice.id === 'finish'));
});

test('room validation rejects fabricated routes, duplicates, premature completion and foreign context', () => {
  const state = prepared(); enterDungeon(state, 'cistern', null, context(state));
  const snapshot = structuredClone(state.dungeon);
  for (const change of [d => { d.roomId = 'missing'; }, d => { d.visited.push('entry'); }, d => { d.complete = true; }, d => { d.pendingRoom = 'keeper'; }, d => { d.facts.bad = Infinity; }]) {
    const bad = structuredClone(snapshot); change(bad); assert.equal(validateExploration(bad, state), false);
  }
  assert.equal(applyExplorationChoice(state, 'dungeon_watchtower_entry', 'route_cells', context(state)), false);
  assert.equal(afterExplorationBattle(state, { kind: 'dungeon', dungeonId: 'cistern', roomId: 'keeper' }, 'victory', context(state)), false);
  assert.deepEqual(state.dungeon, snapshot);
  assert.ok(explorationEventIds().dungeon_cistern_entry.includes('route_sluice'));
});

test('age and location gates work in module entry; descriptors charge time only once', () => {
  const state = prepared(); state.age = 15;
  assert.equal(enterDungeon(state, 'cistern', null, context(state)), false);
  assert.deepEqual(explorationActions(state), []);
  state.age = 18; state.locationId = 'city';
  assert.equal(enterDungeon(state, 'cistern', null, context(state)), false);
  state.locationId = 'marsh';
  const action = explorationActions(state).find((action) => action.id === 'explore_enter_cistern');
  assert.equal(action.days, 1); state.day += action.days;
  const day = state.day;
  assert.equal(applyExplorationAction(state, action.id, context(state)), true);
  assert.equal(state.day, day);
  state.event = null;
  const move = explorationActions(state).find((action) => action.id === 'explore_route_sluice');
  state.day += move.days; const movedDay = state.day;
  applyExplorationAction(state, move.id, context(state)); assert.equal(state.day, movedDay);
});

test('an interruption can take priority without discarding the dungeon room', () => {
  const state = prepared();
  const ctx = context(state); ctx.pendingNeed = () => 'lycan_fullmoon';
  enterDungeon(state, 'cistern', null, ctx);
  assert.equal(state.event, null);
  assert.equal(state.dungeon.roomId, 'entry');
  assert.ok(explorationActions(state).length > 0);
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
