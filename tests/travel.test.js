import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { createBattle, takeBattleAction } from '../dist/js/combat.js';
import { initializeTravel, normalizeTravelPlan, setTravelPlan, travelPlanPreview, beginTravelJourney, onTravelLeg, flushTravelEvent, applyTravelChoice, afterTravelBattle, travelActions, applyTravelAction, travelEventIds, travelView, validateTravel } from '../dist/js/travel.js';

// These paid-preparation fixtures model the pre-regional road rules. Regional
// and Focus journeys use actual full-life fixtures in destination-travel-v34.
function life(seed = 'road-care') {
  const state = { seed, day: 0, age: 18, phase: 'adult', revision: 5, difficulty: 'balanced', locationId: 'home', world: generateWorld(seed, { expanded: true, regional: false }), hero: { name: 'Wren', path: 'unformed', specialization: null, gold: 50, hp: 56, maxHp: 56, mp: 25, maxMp: 25, potions: 2, attributes: { strength: 3, agility: 3, vitality: 3, intellect: 3, willpower: 3, presence: 3 }, skills: { weapons: 0, defense: 0, scholarship: 0 }, condition: null }, companions: [], flags: { herbs: 0 }, life: { happiness: 60, stress: 20 }, factions: { villagers: 0, order: 0 }, equipment: { owned: [], equipped: { weapon: null, armor: null, trinket: null }, materials: { ore: 0, cloth: 0, wood: 0, stone: 0, hide: 0, crystal: 0 } }, timeline: { mode: 'birth', journey: null }, event: null, battle: null, conversations: { pending: null }, dungeon: null, workshop: { project: null } };
  initializeTravel(state); return state;
}
function context(state, maxDays = Infinity) {
  return { spendDays(days) { const actual = Math.min(days, maxDays); state.day += actual; return actual; }, journal() {}, standing(faction, amount) { state.factions[faction] += amount; }, setEvent(id, title, category, body, choices) { state.event = { id, title, category, body, choices }; }, startBattle(id, details) { state.battle = createBattle(state, id); state.battle.instanceId = 'road-instance'; state.battle.context = structuredClone(details); } };
}
function depart(state, destination = 'forest', plan = { pace: 'fast' }) {
  assert.equal(setTravelPlan(state, plan), true);
  const preview = travelPlanPreview(state, destination);
  assert.equal(preview.disabledReason, undefined);
  const gold = state.hero.gold; state.hero.gold -= preview.cost;
  assert.equal(beginTravelJourney(state, preview, context(state)), true);
  assert.equal(state.hero.gold, gold - preview.cost, 'the module must not repay or recharge departure preparations');
  assert.equal(validateTravel(state.travel, state), true);
  return preview;
}
function move(state, ctx = context(state), actualDays) {
  const journey = state.timeline.journey;
  const leg = journey.legs[journey.legIndex];
  const actual = actualDays ?? leg.totalDays - journey.legProgress;
  state.day += actual; journey.legProgress += actual;
  return onTravelLeg(state, { actualDays: actual, legIndex: journey.legIndex }, ctx);
}
const cache = new Map();
function meeting(type, plan = { pace: 'fast' }) {
  const key = JSON.stringify([type, plan]);
  if (cache.has(key)) return structuredClone(cache.get(key));
  for (let index = 0; index < 1000; index++) {
    const state = life(`road-fixture-${index}`);
    depart(state, 'forest', plan); move(state);
    if (state.travel.pending?.type === type) { cache.set(key, state); return structuredClone(state); }
  }
  throw new Error(`No seeded ${type} scene found`);
}
function choose(state, pick, ctx = context(state)) {
  assert.ok(state.event?.choices.some(option => option.id === pick), `${state.event?.id} must offer ${pick}`);
  assert.equal(applyTravelChoice(state, state.event.id, pick, ctx), true);
}

test('plans preview actual roads and show consistent preparation fees, leg times and risk without committing', () => {
  const state = life(), original = structuredClone(state);
  assert.equal(normalizeTravelPlan(null).pace, 'steady');
  const steady = travelPlanPreview(state, 'ruin');
  assert.equal(steady.days, steady.legs.reduce((sum, leg) => sum + leg.totalDays, 0));
  assert.equal(steady.cost, 0); assert.deepEqual(state, original);
  assert.equal(setTravelPlan(state, { pace: 'cautious', supplies: true, scout: true, escort: true, night: true }), true);
  const base = state.world.roads;
  const preview = travelPlanPreview(state, 'ruin');
  const rawDays = preview.legs.reduce((sum, leg) => sum + base.find(road => [road.from, road.to].includes(leg.from) && [road.from, road.to].includes(leg.to)).days, 0);
  assert.equal(preview.days, rawDays + preview.legs.length + 1);
  assert.equal(preview.cost, 3 + Math.ceil(rawDays / 2) + 2 + 4 + preview.legs.length * 2);
  assert.ok(preview.risk <= steady.risk);
  assert.match(preview.description, /paid once/); assert.ok(preview.precautions.some(text => /dusk/.test(text)));
  assert.equal(state.hero.gold, 50); assert.equal(state.day, 0); assert.equal(state.timeline.journey, null);
  state.hero.gold = 0;
  assert.match(travelPlanPreview(state, 'ruin').disabledReason, /Requires/);
  assert.match(travelPlanPreview(state, 'missing').disabledReason, /Unknown/);
  assert.match(travelPlanPreview({ ...state, age: 13 }, 'forest').disabledReason, /fourteen/);
});

test('survival practice, active scouts and actual cartography work contribute bounded visible road guidance', () => {
  const novice = life('trained-road-guidance');
  setTravelPlan(novice, { pace: 'fast' });
  const baseline = travelPlanPreview(novice, 'ruin');
  const trained = structuredClone(novice);
  trained.hero.skills.survival = 6;
  trained.companions = [{ id:'guide', name:'Neris Vale', role:'Scout', recruited:true, active:true, alive:true, hp:20 }];
  trained.careers = { records:{ Cartographer:{ workedDays:30, experience:60 } } };
  const before = structuredClone(trained), preview = travelPlanPreview(trained, 'ruin');
  assert.deepEqual(trained, before, 'training remains a preview until departure');
  assert.equal(preview.cost, baseline.cost); assert.equal(preview.days, baseline.days);
  preview.legs.forEach((leg,index)=>assert.equal(leg.risk, Math.max(0, baseline.legs[index].risk - 10)));
  assert.ok(preview.precautions.some(text=>text.includes('Neris Vale')));
  assert.ok(preview.precautions.some(text=>/cartography/.test(text)));
  assert.ok(preview.precautions.some(text=>/capped at 10/.test(text)));
  trained.companions[0].active = false;
  trained.hero.skills.survival = 0;
  trained.careers.records.Cartographer.workedDays = 0;
  assert.equal(travelPlanPreview(trained, 'ruin').risk, baseline.risk, 'inactive companions and unworked professional titles provide no guidance');
});

test('physical exhaustion is quoted before departure and resting never rewrites committed road risk', () => {
  const state = life('fatigued-road'); setTravelPlan(state,{pace:'fast'});
  const baseline = travelPlanPreview(state, 'forest');
  state.hero.hp = 10;
  const exhausted = travelPlanPreview(state, 'forest');
  exhausted.legs.forEach((leg,index)=>assert.equal(leg.risk, Math.min(45, baseline.legs[index].risk + 5)));
  assert.ok(exhausted.precautions.some(text=>/physical reserves/.test(text)));
  assert.equal(beginTravelJourney(state, exhausted, context(state)), true);
  const committed = structuredClone(state.timeline.journey);
  state.hero.hp = state.hero.maxHp; state.hero.skills.survival = 100;
  assert.deepEqual(state.timeline.journey, committed, 'an already agreed leg has one fixed encounter chance across recovery or reload');
});

test('migration keeps an old interrupted journey exact and grants no retroactive encounter or preparation fee', () => {
  const state = life(); delete state.travel;
  state.flags.travelByNight = true;
  state.timeline.journey = { destinationId: 'forest', route: ['home', 'forest'], legIndex: 0, legProgress: 1, startedDay: 0, traversedIds: ['home'] };
  const before = structuredClone(state);
  initializeTravel(state, { migration: true });
  assert.deepEqual(state.timeline.journey, before.timeline.journey);
  assert.deepEqual(state.hero, before.hero); assert.equal(state.travel.plan.night, true);
  assert.equal(onTravelLeg(state, { actualDays: 1 }, context(state)), false);
  const initialized = structuredClone(state); initializeTravel(state, { migration: true });
  assert.deepEqual(state, initialized); assert.equal(validateTravel(state.travel, state), true);
  state.timeline.journey = null; state.travel.journeys = 9; state.day = 22000;
  initializeTravel(state, { reset: true });
  assert.equal(state.travel.journeys, 0); assert.deepEqual(state.travel.history, []); assert.equal(state.travel.plan.night, false);
});

test('committed supplies are paid once, snapshotted independently, and cannot be changed during a journey', () => {
  const state = life();
  const preview = depart(state, 'ruin', { pace: 'cautious', supplies: true, escort: true });
  const committed = structuredClone(state.timeline.journey), gold = state.hero.gold;
  preview.legs[0].totalDays = 90; preview.plan.supplies = false;
  assert.deepEqual(state.timeline.journey, committed);
  assert.equal(setTravelPlan(state, { pace: 'fast' }), false);
  assert.equal(beginTravelJourney(state, travelPlanPreview(state, 'city'), context(state)), false);
  assert.equal(state.hero.gold, gold);
  assert.equal(validateTravel(state.travel, state), true);
});

test('career batches and annual plans visibly block destinations and plan changes until the commitment ends', () => {
  for (const commitment of ['career', 'year']) {
    const state = life();
    if (commitment === 'career') state.careers = { batch: { remainingDays: 2 } };
    else state.life.plan = { focus: 'work', remainingDays: 120 };
    const original = structuredClone(state);
    const preview = travelPlanPreview(state, 'forest');
    assert.match(preview.disabledReason, commitment === 'career' ? /committed career work/ : /annual plan/);
    assert.equal(setTravelPlan(state, { pace: 'fast' }), false);
    assert.equal(beginTravelJourney(state, preview, context(state)), false);
    assert.deepEqual(state, original);
    if (commitment === 'career') state.careers.batch = null;
    else state.life.plan = null;
    assert.equal(travelPlanPreview(state, 'forest').disabledReason, undefined);
    assert.equal(setTravelPlan(state, { pace: 'fast' }), true);
  }
});

test('encounters require actual elapsed days and are checked once across reload, previews and repeated hooks', () => {
  const seed = meeting('bandits').seed, state = life(seed);
  depart(state);
  assert.equal(onTravelLeg(state, { actualDays: 0 }, context(state)), false);
  assert.equal(state.timeline.journey.legs[0].checked, false);
  move(state);
  assert.equal(state.event.id, 'travel_bandits');
  const saved = structuredClone(state), restored = JSON.parse(JSON.stringify(state));
  travelView(state); travelActions(state); travelPlanPreview(state, 'city');
  assert.equal(onTravelLeg(state, { actualDays: 1 }, context(state)), false);
  assert.deepEqual(state, saved); assert.equal(validateTravel(restored.travel, restored), true);
  choose(state, 'bribe'); choose(restored, 'bribe'); assert.deepEqual(state, restored);
  assert.equal(onTravelLeg(state, { actualDays: 1 }, context(state)), false);
  assert.equal(state.event, null); assert.equal(state.travel.history.length, 1);
});

test('road scenes queue behind existing stories, conversations and explicit calendar needs without moving the waypoint', () => {
  const seed = meeting('bandits').seed, state = life(seed); depart(state);
  state.event = { id: 'birth_year_18' };
  move(state); assert.equal(state.event.id, 'birth_year_18'); assert.equal(state.locationId, 'home');
  assert.ok(state.travel.pending); assert.equal(validateTravel(state.travel, state), true);
  state.event = null; state.conversations.pending = { personId: 'teacher' };
  assert.equal(flushTravelEvent(state, context(state)), false);
  state.conversations.pending = null;
  assert.equal(flushTravelEvent(state, { ...context(state), pendingNeed: () => 'deadline' }), false);
  assert.equal(flushTravelEvent(state, context(state)), true);
  assert.equal(state.event.id, 'travel_bandits');
});

test('free avoidance persists through a zero-day interruption and resumes only the remaining time', () => {
  const state = meeting('bandits'); state.hero.gold = 0;
  const journey = structuredClone(state.timeline.journey), day = state.day;
  choose(state, 'avoid', context(state, 0));
  assert.equal(state.day, day); assert.equal(state.hero.gold, 0);
  assert.equal(state.event.id, 'travel_delay'); assert.equal(state.travel.pending.remainingDays, 1);
  assert.equal(validateTravel(state.travel, state), true);
  const restored = JSON.parse(JSON.stringify(state));
  choose(restored, 'continue');
  assert.equal(restored.day, day + 1); assert.equal(restored.travel.pending, null);
  assert.deepEqual(restored.timeline.journey, journey, 'the real unfinished road remains exactly snapshotted');
  assert.equal(restored.hero.gold, 0); assert.equal(restored.battle, null);
  assert.equal(applyTravelAction(restored, 'travel_continue_response', context(restored)), false);
});

test('returning or abandoning road work ends the trip at its real last waypoint without refunding committed costs', () => {
  const state = meeting('bandits'), day = state.day, gold = state.hero.gold;
  choose(state, 'turn_back');
  assert.equal(state.day, day + 1); assert.equal(state.locationId, 'home');
  assert.equal(state.timeline.journey, null); assert.equal(state.travel.pending, null); assert.equal(state.hero.gold, gold);
  const paused = meeting('beasts'); choose(paused, 'avoid', context(paused, 0));
  paused.event = null;
  const offered = travelActions(paused).find(action => action.id === 'travel_continue_response');
  assert.equal(offered.days, 0); assert.equal(offered.cost, 0);
  assert.equal(applyTravelAction(paused, 'travel_continue_response', context(paused, 0)), true);
  choose(paused, 'abandon'); assert.equal(paused.timeline.journey, null); assert.equal(paused.locationId, 'home');
});

test('bandit fees and caravan trades are explicit, affordable, applied once and never notify hidden identities', () => {
  const state = meeting('bandits'); state.hero.gold = 0;
  choose(state, 'bribe'); assert.equal(state.event.id, 'travel_bandits'); assert.equal(state.hero.gold, 0);
  assert.match(state.notice, /free route/); assert.match(state.event.body, /not seen your hidden studies/);
  choose(state, 'avoid'); assert.equal(state.travel.pending, null);
  const traded = meeting('caravan'), gold = traded.hero.gold;
  choose(traded, 'trade'); assert.equal(traded.hero.gold, gold - 4); assert.equal(traded.equipment.materials.cloth, 2);
  assert.equal(applyTravelChoice(traded, 'travel_caravan', 'trade', context(traded)), false);
  const shared = meeting('caravan'), mood = shared.life.happiness, stress = shared.life.stress;
  choose(shared, 'share'); assert.equal(shared.life.happiness, mood + 3); assert.equal(shared.life.stress, stress - 3);
  assert.equal(shared.hero.gold, 50);
});

test('teenagers retain safe free road choices, while adult combat holds the route and dispatches only actual road IDs', () => {
  const teenager = meeting('bandits'); teenager.age = 14; teenager.event = null; flushTravelEvent(teenager, context(teenager));
  assert.ok(teenager.event.choices.some(option => option.id === 'avoid'));
  assert.ok(!teenager.event.choices.some(option => option.id === 'fight'));
  assert.equal(applyTravelChoice(teenager, 'travel_bandits', 'fight', context(teenager)), false);
  assert.equal(teenager.battle, null); choose(teenager, 'avoid');
  for (const type of ['bandits', 'beasts']) {
    const state = meeting(type), journey = structuredClone(state.timeline.journey), gold = state.hero.gold;
    choose(state, 'fight');
    assert.equal(state.battle.encounterId, `road_${type}`); assert.equal(state.event, null);
    assert.equal(state.battle.context.kind, 'travel'); assert.equal(state.travel.pending.stage, 'battle');
    assert.deepEqual(state.timeline.journey, journey); assert.equal(validateTravel(state.travel, state), true);
    const battleContext = structuredClone(state.battle.context);
    for (let turn = 0; !state.battle.outcome && turn < 20; turn++) state.battle = takeBattleAction(state.battle, 'attack', state.battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id);
    assert.equal(state.battle.outcome, 'victory', 'a healthy classless civilian can win the optional low-level road fight');
    state.battle = null;
    assert.equal(afterTravelBattle(state, battleContext, 'victory', context(state)), true);
    assert.equal(afterTravelBattle(state, battleContext, 'victory', context(state)), false);
    assert.equal(state.hero.gold, gold, 'combat reward accounting belongs only to the engine');
    assert.deepEqual(state.timeline.journey, journey); assert.equal(validateTravel(state.travel, state), true);
  }
});

test('retreat and defeat clear one road threat without deleting its route or applying duplicate combat recovery', () => {
  for (const outcome of ['retreat', 'defeat']) {
    const state = meeting('bandits'); choose(state, 'fight');
    const details = structuredClone(state.battle.context), hero = structuredClone(state.hero), journey = structuredClone(state.timeline.journey);
    assert.equal(afterTravelBattle(state, { ...details, legId: 'wrong-leg' }, outcome, context(state)), false);
    state.battle = null;
    assert.equal(afterTravelBattle(state, details, outcome, context(state)), true);
    assert.deepEqual(state.hero, hero); assert.deepEqual(state.timeline.journey, journey);
    assert.equal(state.travel.pending, null);
  }
});

test('weather and prepared supplies have visible small effects, and free care for a sick traveler earns actual trust', () => {
  const wet = meeting('weather'); wet.hero.hp = 2; choose(wet, 'press'); assert.equal(wet.hero.hp, 1);
  const packed = meeting('weather', { pace: 'fast', supplies: true }), hp = packed.hero.hp;
  choose(packed, 'press'); assert.equal(packed.hero.hp, hp - 1);
  const beasts = meeting('beasts', { pace: 'fast', supplies: true }), gold = beasts.hero.gold;
  choose(beasts, 'supplies'); assert.equal(beasts.hero.gold, gold); assert.equal(beasts.travel.pending, null);
  const sick = meeting('sick_traveler'), day = sick.day; sick.hero.gold = 0;
  choose(sick, 'aid'); assert.equal(sick.day, day + 1); assert.equal(sick.factions.villagers, 2); assert.equal(sick.hero.gold, 0);
  const limit = meeting('sick_traveler'); choose(limit, 'continue'); assert.equal(limit.factions.villagers, 0);
  const herb = meeting('sick_traveler'); herb.flags.herbs = 1; choose(herb, 'herb'); assert.equal(herb.flags.herbs, 0); assert.equal(herb.factions.villagers, 2);
});

test('road lore is a real persistent discovery with a once-only scholarship benefit; witness listening respects local knowledge', () => {
  const lore = meeting('lore'), snapshot = structuredClone(lore), original = lore.hero.skills.scholarship;
  choose(lore, 'record'); assert.equal(lore.hero.skills.scholarship, original + 1); assert.equal(lore.travel.discoveries.length, 1);
  snapshot.travel.discoveries = [...lore.travel.discoveries]; snapshot.hero.skills.scholarship = lore.hero.skills.scholarship;
  choose(snapshot, 'record'); assert.equal(snapshot.hero.skills.scholarship, original + 1);
  const witness = meeting('witness'); assert.match(witness.event.body, /does not create evidence/);
  choose(witness, 'listen'); assert.equal(witness.factions.villagers, 1);
  assert.equal(validateTravel(lore.travel, lore), true);
});

test('travel views stay pure, scenes survive JSON, malformed route/status combinations fail validation, and death stops road benefits', () => {
  const state = meeting('bandits'), original = structuredClone(state);
  travelView(state); travelActions(state); travelEventIds(); assert.deepEqual(state, original);
  assert.equal(validateTravel(state.travel, state), true);
  for (const mutate of [value => { value.timeline.journey.legIndex = 999; }, value => { value.timeline.journey.legs[0].checked = false; }, value => { value.timeline.journey.legProgress = 999; }, value => { value.timeline.journey.route = null; }, value => { value.travel.pending.choiceId = 'unoffered'; }, value => { value.travel.pending.type = 'unknown'; }, value => { value.travel.history = Array.from({ length: 121 }, () => ({})); }]) {
    const invalid = structuredClone(state); mutate(invalid); assert.equal(validateTravel(invalid.travel, invalid), false);
  }
  const final = meeting('sick_traveler');
  choose(final, 'aid', { ...context(final), spendDays() { final.day++; final.phase = 'retired'; final.timeline.journey = null; return 1; } });
  assert.equal(final.travel.pending, null); assert.equal(final.factions.villagers, 0);
  assert.equal(final.travel.history.length, 0); assert.equal(validateTravel(final.travel, final), true);
});

test('six new road scenes have stable illustrated people, valid choices and safe teenage alternatives',()=>{
  for(const type of ['messenger','pilgrims','grave_robber','fortune','wagon','relic']){
    const state=meeting(type),saved=JSON.parse(JSON.stringify(state));
    assert.ok(state.travel.pending.person?.appearance);assert.deepEqual(saved.travel.pending.person,state.travel.pending.person);
    assert.equal(validateTravel(saved.travel,saved),true);
    const original=structuredClone(saved.event);saved.event=null;flushTravelEvent(saved,context(saved));assert.deepEqual(saved.event,original);
    for(const option of state.event.choices)assert.ok(travelEventIds()[state.event.id].includes(option.id));
    state.age=12;state.event=null;flushTravelEvent(state,context(state));
    assert.ok(!state.event.choices.some(option=>['extort','join','pocket','fight'].includes(option.id)));
    assert.ok(state.event.choices.some(option=>option.id==='continue'));
  }
});

test('new road payments cannot be charged twice and unaffordable offers preserve free choices',()=>{
  for(const [type,pick,cost] of [['pilgrims','offering',3],['fortune','reading',2],['relic','donate',4]]){
    const state=meeting(type),eventId=state.event.id,gold=state.hero.gold;
    choose(state,pick);assert.equal(state.hero.gold,gold-cost);assert.equal(state.travel.pending,null);
    assert.equal(applyTravelChoice(state,eventId,pick,context(state)),false);assert.equal(state.hero.gold,gold-cost);
    const poor=meeting(type);poor.hero.gold=0;choose(poor,pick);assert.equal(poor.hero.gold,0);assert.ok(poor.travel.pending);assert.ok(poor.event.choices.some(c=>c.id==='continue'));
    assert.equal(validateTravel(poor.travel,poor),true);
  }
});

test('road discoveries are bounded, darker choices have witnessed consequences and work spends actual time',()=>{
  const seer=meeting('fortune'),before=structuredClone(seer);choose(seer,'study');assert.equal(seer.hero.skills.arcana,1);
  before.travel.insights=[...seer.travel.insights];before.hero.skills.arcana=1;choose(before,'study');assert.equal(before.hero.skills.arcana,1);
  const messenger=meeting('messenger'),gold=messenger.hero.gold;choose(messenger,'extort');assert.equal(messenger.hero.gold,gold+6);assert.equal(messenger.factions.villagers,-3);
  const grave=meeting('grave_robber');grave.factions.order=0;choose(grave,'join');assert.equal(grave.factions.order,-3);
  const wagon=meeting('wagon'),day=wagon.day;choose(wagon,'aid',context(wagon,0));
  assert.equal(wagon.day,day);assert.equal(wagon.factions.villagers,0);assert.equal(wagon.travel.pending.remainingDays,1);assert.equal(validateTravel(wagon.travel,wagon),true);
  choose(wagon,'continue',context(wagon));assert.equal(wagon.day,day+1);assert.equal(wagon.factions.villagers,2);assert.equal(wagon.travel.pending,null);
});

test('recent harmless road encounters are excluded before the next seeded selection',()=>{
  const state=meeting('caravan');
  state.travel.recentEncounters=['caravan','pilgrims','fortune'];state.travel.pending=null;state.event=null;
  const leg=state.timeline.journey.legs[0];leg.checked=false;leg.encounterKey=null;
  assert.equal(onTravelLeg(state,{actualDays:1,legIndex:0},context(state)),true);
  assert.ok(!['caravan','pilgrims','fortune'].includes(state.travel.pending.type));
  assert.equal(validateTravel(state.travel,state),true);
});
