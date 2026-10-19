import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS, generateDungeonDefinition, initializeExploration, enterDungeon, applyExplorationChoice, validateExploration, dungeonView, explorationActions, afterExplorationBattle } from '../dist/js/exploration.js';
import { createBattle } from '../dist/js/combat.js';
import { initializeGear } from '../dist/js/gear.js';

function prepared(id = 'cistern', seed = 'v8-dungeon-witness') {
  const state = { seed, phase: 'adult', timeline: { mode: 'birth' }, age: 21, day: 7665, flags: {}, locationId: DUNGEONS.find(d => d.id === id).locationId, event: null, battle: null, campaign: { facts: {} }, companions: [], journal: [], standings: { villagers: 0 },
    hero: { name: 'The witness', path: 'warrior', specialization: 'guardian', level: 3, hp: 76, maxHp: 76, mp: 45, maxMp: 45, gold: 100, potions: 4, attributes: { strength: 8, agility: 6, vitality: 6, intellect: 5, willpower: 5, presence: 5 }, skills: { weapons: 5, defense: 3, arcana: 3, devotion: 3, stealth: 3, survival: 4, scholarship: 4, persuasion: 4 }, condition: null } };
  initializeGear(state); initializeExploration(state, { fresh: true });
  state.equipment.materials.ore = 10; state.equipment.materials.cloth = 10; state.flags.herbs = 10;
  return state;
}
function context(state, override = {}) {
  return { spendDays(days) { state.day += days; }, journal(title, text, tag) { state.journal.push({ title, text, tag }); },
    setEvent(id, title, category, body, choices) { state.event = { id, title, category, body, choices }; },
    startBattle(id, context) { state.battle = createBattle(state, id); state.battle.context = context; },
    witnesses() { return state.companions.filter(p => p.active); }, remember(id, text, change) { const p = state.companions.find(p => p.id === id); p.memories.push(text); p.relationship += change; },
    standing(id, amount) { state.standings[id] = (state.standings[id] || 0) + amount; }, touchCampaign() {}, ...override };
}
function choose(state, id, override) {
  const event = state.event;
  assert.ok(event.choices.some(c => c.id === id && !c.disabledReason), `${event.id} does not allow ${id}`);
  state.event = null;
  assert.equal(applyExplorationChoice(state, event.id, id, context(state, override)), true);
  assert.ok(validateExploration(state.dungeon, state));
}
function route(state, to) {
  const definition = state.dungeon.definition, from = state.dungeon.roomId;
  const paths = [[from]], seen = new Set([from]);
  while (paths.length) {
    const path = paths.shift(), here = definition.rooms.find(r => r.id === path.at(-1));
    if (here.id === to) { for (const id of path.slice(1)) choose(state, `route_${id}`); return; }
    for (const id of here.exits) if (!seen.has(id) && (state.dungeon.cleared.includes(id) || definition.rooms.find(r => r.id === id).kind === 'safe' || id === to)) { seen.add(id); paths.push([...path, id]); }
  }
  throw Error(`No cleared route from ${from} to ${to}`);
}

test('five seeded expedition definitions vary objective, motive and connected routes while retaining all critical encounters', () => {
  for (const base of DUNGEONS) {
    const variants = new Set(), objectives = new Set(), motives = new Set(), layouts = new Set();
    for (let n = 0; n < 100; n++) {
      const definition = generateDungeonDefinition(`routes-${n}`, base.id);
      assert.deepEqual(definition, generateDungeonDefinition(`routes-${n}`, base.id));
      assert.equal(definition.rooms.length, 8);
      for (const here of base.rooms) assert.equal(definition.rooms.find(r => r.id === here.id).encounterId, here.encounterId);
      const queue = ['entry'], reached = new Set();
      while (queue.length) { const id = queue.shift(); if (reached.has(id)) continue; reached.add(id); const here = definition.rooms.find(r => r.id === id); assert.ok(here); for (const next of here.exits) { assert.ok(definition.rooms.find(r => r.id === next).exits.includes(id), 'two-way exits'); queue.push(next); } }
      assert.equal(reached.size, definition.rooms.length);
      const boss = definition.rooms.find(r => r.kind === 'boss'), goal = definition.rooms.find(r => r.kind === 'objective');
      assert.deepEqual(goal.exits, [boss.id], 'no alternate route skips the mandatory last guardian');
      variants.add(`${definition.layout}:${definition.objective.id}:${definition.motive.id}`); objectives.add(definition.objective.id); motives.add(definition.motive.id); layouts.add(definition.layout);
    }
    assert.ok(variants.size >= 20); assert.equal(objectives.size, 3); assert.equal(motives.size, 3); assert.equal(layouts.size, 3);
  }
});

test('active snapshots survive leave/reentry exactly and reject altered rewards, routes, names or foreign seeds', () => {
  const state = prepared(); enterDungeon(state, 'cistern', null, context(state));
  const snapshot = structuredClone(state.dungeon.definition);
  choose(state, 'leave'); enterDungeon(state, 'cistern', null, context(state));
  assert.deepEqual(state.dungeon.definition, snapshot);
  assert.deepEqual(state.flags.dungeonRecords.cistern.definition, snapshot);
  for (const change of [d => d.rooms.find(r => r.loot).loot.gold++, d => d.rooms[0].exits.push('source'), d => d.custodian.name = 'A changed keeper', d => d.seed = 'a foreign world']) {
    const bad = structuredClone(state.dungeon); change(bad.definition);
    assert.equal(validateExploration(bad, state), false);
  }
  assert.equal(dungeonView(state).variant, 1);
});

test('unmarked old active battles and partial or complete records retain the exact legacy definition', () => {
  const state = prepared(); delete state.flags.explorationVersion;
  enterDungeon(state, 'cistern', 'saved-quest', context(state)); choose(state, 'route_sluice'); choose(state, 'fight');
  const battle = structuredClone(state.battle), legacy = structuredClone(state.dungeon);
  initializeExploration(state, { fresh: true });
  assert.deepEqual(state.battle, battle); assert.deepEqual(state.dungeon, legacy); assert.equal(state.dungeon.definition, undefined);
  state.battle = null; afterExplorationBattle(state, battle.context, 'retreat', context(state));
  choose(state, 'leave'); enterDungeon(state, 'cistern', 'saved-quest', context(state));
  assert.equal(state.dungeon.definition, undefined, 'enabling future content must not reroll this entered expedition');
  assert.equal(dungeonView(state).variant, undefined);
  assert.ok(validateExploration(state.dungeon, state));
  state.dungeon = null; state.event = null;
  state.flags.dungeonRecords.cistern = { visited: DUNGEONS[0].rooms.map(r => r.id), cleared: DUNGEONS[0].rooms.map(r => r.id), facts: { discovery: true }, complete: true };
  const completed = structuredClone(state.flags.dungeonRecords.cistern), gold = state.hero.gold;
  assert.ok(validateExploration(null, state));
  assert.equal(enterDungeon(state, 'cistern', 'later-quest', context(state)), true);
  assert.deepEqual(state.flags.dungeonRecords.cistern, completed); assert.equal(state.dungeon, null); assert.equal(state.hero.gold, gold);
  assert.equal(state.campaign.facts['dungeon_later-quest'], true, 'the original completed discovery answers a later question without a reroll or reward');
});

test('optional evidence, practical aid and tool salvage have separate real costs and cannot be claimed twice', () => {
  const seed = Array.from({ length: 100 }, (_, n) => `witness-${n}`).find(seed => generateDungeonDefinition(seed, 'cistern').layout === 0);
  const state = prepared('cistern', seed); enterDungeon(state, 'cistern', null, context(state)); choose(state, 'route_witness');
  const before = { day: state.day, cloth: state.equipment.materials.cloth, gold: state.hero.gold };
  assert.ok(state.event.choices.find(c => c.id === 'protect_witness').disabledReason);
  choose(state, 'hear_witness');
  assert.equal(state.day, before.day); assert.equal(state.dungeon.cleared.includes('witness'), false);
  choose(state, 'protect_witness');
  assert.equal(state.day, before.day + 1); assert.equal(state.equipment.materials.cloth, before.cloth - 1); assert.equal(state.hero.gold, before.gold);
  assert.equal(state.dungeon.facts.variantProof, true); assert.equal(state.dungeon.facts.variantAid, true);
  assert.ok(!state.event.choices.some(c => ['protect_witness', 'record_witness'].includes(c.id)));
  choose(state, 'route_entry'); choose(state, 'route_flooded'); choose(state, 'search'); choose(state, 'route_service');
  const repairDay = state.day, ore = state.equipment.materials.ore;
  choose(state, 'repair_route', { spendDays() {} });
  assert.equal(state.day, repairDay); assert.equal(state.equipment.materials.ore, ore); assert.ok(!state.dungeon.cleared.includes('service'));
  state.event = null; assert.equal(applyExplorationChoice(state, 'dungeon_cistern_service', 'repair_route', context(state)), true);
  assert.equal(state.day, repairDay + 1); assert.equal(state.equipment.materials.ore, ore - 1);
  assert.ok(!state.event.choices.some(c => c.id === 'repair_route'));
});

test('a companion can negotiate only through an actual trusted memory, and listening never clears a guarded room', () => {
  const state = prepared(); enterDungeon(state, 'cistern', null, context(state)); choose(state, 'route_sluice');
  const definition = state.dungeon.definition;
  state.hero.skills[definition.motive.skill] = 0;
  state.companions.push({ id: 'mira', name: 'An actual companion', role: definition.motive.role, recruited: true, active: true, alive: true, hp: 40, relationship: 12, memories: [] });
  choose(state, 'listen'); assert.ok(!state.dungeon.cleared.includes('sluice')); assert.ok(state.event.choices.find(c => c.id === 'parley').disabledReason);
  state.companions[0].memories.push('You helped protect my family when it cost you time.');
  state.event = null;
  assert.equal(applyExplorationChoice(state, 'dungeon_cistern_sluice', 'parley', context(state)), true);
  assert.equal(state.dungeon.facts.companion_sluice, 'mira'); assert.equal(state.dungeon.cleared.includes('sluice'), true);
  assert.equal(state.battle, null); assert.equal(state.hero.gold, 100);
  assert.match(state.journal.at(-1).text, /real shared memory/);
});

test('every fresh objective still completes the campaign quest only after its guardian and records one concrete stewardship', () => {
  for (const base of DUNGEONS) {
    const seed = Array.from({ length: 100 }, (_, n) => `steward-${n}`).find(seed => generateDungeonDefinition(seed, base.id).layout === 1);
    const state = prepared(base.id, seed); enterDungeon(state, base.id, `critical-${base.id}`, context(state));
    choose(state, 'route_service'); choose(state, 'repair_route');
    const cache = base.rooms.find(r => r.kind === 'treasure'), boss = base.rooms.find(r => r.kind === 'boss'), goal = base.rooms.find(r => r.kind === 'objective');
    choose(state, `route_${cache.id}`); choose(state, 'take'); choose(state, `route_${boss.id}`);
    assert.equal(state.campaign.facts[`dungeon_critical-${base.id}`], undefined);
    assert.ok(state.event.choices.find(c => c.id === 'parley').disabledReason);
    choose(state, 'listen'); choose(state, 'parley');
    assert.equal(state.campaign.facts[`dungeon_critical-${base.id}`], undefined);
    choose(state, `route_${goal.id}`);
    const day = state.day, materials = structuredClone(state.equipment.materials), herbs = state.flags.herbs;
    choose(state, 'finish_stewardship');
    assert.equal(state.day, day + 1); assert.equal(state.dungeon.complete, true);
    assert.equal(state.campaign.facts[`dungeon_critical-${base.id}`], true);
    assert.equal(state.flags.dungeonRecords[base.id].facts.objectiveMethod, 'stewardship');
    for (const [key, count] of Object.entries(state.dungeon.definition.objective.materials)) {
      assert.equal(key === 'herbs' ? state.flags.herbs : state.equipment.materials[key], (key === 'herbs' ? herbs + (goal.herbs || 0) : materials[key]) - count);
    }
    assert.ok(!state.event.choices.some(c => c.id.startsWith('finish')));
    assert.ok(state.event.choices.length <= 8);
    assert.ok(explorationActions(state).every(a => !a.disabledReason));
  }
});

test('completed formation supplies genuinely different proof when practical aid leaves personal records in place', () => {
  const seed = Array.from({ length: 100 }, (_, n) => `formation-${n}`).find(seed => generateDungeonDefinition(seed, 'cistern').layout === 1);
  const state = prepared('cistern', seed); state.hero.specialization = 'elementalist'; state.hero.path = 'mage';
  state.fellowship = { formations: { elementalist: { stage: 'training', completedDay: null, technique: 'Grounding a living storm' } }, companions: {} };
  enterDungeon(state, 'cistern', null, context(state)); choose(state, 'route_service');
  const day = state.day, ore = state.equipment.materials.ore;
  choose(state, 'aid_only');
  assert.equal(state.day, day + 1); assert.equal(state.equipment.materials.ore, ore - 1);
  assert.equal(state.dungeon.facts.variantAid, true); assert.equal(state.dungeon.facts.variantProof, undefined);
  choose(state, 'route_cache'); choose(state, 'take'); choose(state, 'route_keeper'); choose(state, 'listen');
  assert.ok(state.event.choices.find(c => c.id === 'parley').disabledReason);
  state.fellowship.formations.elementalist.stage = 'completed';
  assert.ok(explorationActions({ ...state, event: null }).find(a => a.id === 'explore_parley').disabledReason, 'a null completion is not completed work');
  state.fellowship.formations.elementalist.completedDay = state.day - 1;
  state.event = null; assert.equal(applyExplorationChoice(state, 'dungeon_cistern_keeper', 'parley', context(state)), true);
  assert.equal(state.dungeon.facts.formation_keeper, 'elementalist'); assert.equal(state.dungeon.cleared.includes('keeper'), true);
  assert.equal(state.battle, null); assert.match(state.journal.at(-1).text, /Grounding a living storm/);
  choose(state, 'route_source'); choose(state, 'finish_public');
  assert.equal(state.dungeon.facts.publicWitnessNamed, false);
  assert.ok(state.journal.some(j => /personal names redacted/.test(j.text)), 'publishing does not invent a witness’s consent');
});
