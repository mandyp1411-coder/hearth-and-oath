import { assertMigrationMechanics, assertEventMechanics } from './helpers/migration-mechanics.mjs';
import { atService } from './helpers/service-visit.mjs';
import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../dist/js/engine.js';
import { getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { generateWorld, validateWorld, findRoute, travelPreview } from '../dist/js/world.js';
import { CLASS_CATALOG, classView } from '../dist/js/classes.js';
import { campaignView } from '../dist/js/campaign.js';
import { DUNGEONS } from '../dist/js/exploration.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { reaches } from '../dist/js/enemy-targets.js';
import { delveView } from '../dist/js/delve.js';

const oldFixture = JSON.parse(readFileSync(new URL('./fixtures/legacy-v2.json', import.meta.url), 'utf8'));
const oldLives = oldFixture.states;

function transition(state, operation) {
  const before = structuredClone(state);
  const next = operation(state);
  assert.deepEqual(state, before, 'public transitions must leave the input save intact');
  assert.notEqual(next, state);
  assert.notEqual(next.hero, state.hero);
  return next;
}

function preserveFields(original,migrated,path='state'){assertMigrationMechanics(original,migrated,path);}

function choose(state, id) {
  assert.ok(state.event?.choices.some(choice => choice.id === id && !choice.disabledReason), `${state.event?.id} must offer an enabled ${id}`);
  return transition(state, value => engine.chooseEventOption(value, id));
}

function act(state, id) {
  while(['health_concern','birth_adult_year'].includes(state.event?.id)||state.event?.id.startsWith('farm_'))state=choose(state,state.event.id==='birth_adult_year'?'care':'continue');
  state=atService(state,id);
  state=knownCurseMeeting(state,id);
  const offered = engine.getActions(state).find(action => action.id === id);
  assert.ok(offered, `${id} must be available at age ${state.age}, ${state.locationId}; waiting ${state.event?.id || 'nothing'}; ${state.notice}`);
  assert.equal(offered.disabledReason, undefined, `${id}: ${offered.disabledReason}`);
  return transition(state, value => engine.chooseAction(value, id));
}

function saveable(state) {
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true, `${state.event?.id || state.battle?.encounterId || state.day} must survive a save roundtrip`);
  assert.ok(state.hero.gold >= 0);
  assert.ok(state.hero.hp >= 1 && state.hero.hp <= state.hero.maxHp);
  return state;
}

function win(state) {
  const pending = structuredClone(state.battle);
  assert.ok(pending, 'the journey must reach an actual encounter');
  let completed = pending;
  for (let turn = 0; turn < 180 && !completed.outcome; turn += 1) {
    const options = getBattleActions(completed).filter(action => !action.disabledReason);
    const hurt = completed.actors.filter(actor => actor.side === 'party' && actor.hp > 0 && actor.hp / actor.maxHp < 0.45)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    let selected;
    let target;
    if (hurt && options.some(action => action.id === 'potion')) {
      selected = options.find(action => action.id === 'potion');
      target = hurt.id;
    } else {
      selected = options.find(action => action.id === 'skill' && action.targetSide === 'enemy') || options.find(action => action.id === 'attack');
      // A field battle (v0.68) is fought at reach: aim at the weakest foe the actor can actually reach.
      const me = completed.actors[completed.turnOrder[completed.turnIndex]] || completed.actors.find(actor => actor.id === completed.currentActorId);
      const living = completed.actors.filter(actor => actor.side === 'enemy' && actor.hp > 0), reachable = living.filter(actor => reaches(completed, me, actor));
      target = (reachable.length ? reachable : living).sort((a, b) => a.hp - b.hp)[0]?.id;
    }
    assert.ok(selected, 'a living party member must have a usable action');
    completed = takeBattleAction(completed, selected.id, target);
  }
  assert.equal(completed.outcome, 'victory', 'a prepared party must be able to complete the authored encounter');
  const result = transition(state, value => engine.resolveBattle(value, completed));
  assert.equal(result.battle, null);
  return { state: saveable(result), completed };
}

function childhoodChoice(state, preference = []) {
  assert.ok(state.event, 'a childhood decision must be pending');
  const preferred = preference.find(id => state.event.choices.some(choice => choice.id === id && !choice.disabledReason));
  const offered = preferred || state.event.choices.find(choice => !choice.disabledReason)?.id;
  assert.ok(offered, `${state.event.id} needs a lawful continuation`);
  return offered;
}

function growTo(state, target, preference = []) {
  // These retained linear-dungeon/quoted-road contracts use the explicit legacy
  // travel and dungeon profile. New energy and maze behavior has separate gates.
  state=structuredClone(state);delete state.trail;delete state.mazeBook;delete state.maze;
  const moments = [];
  for (let step = 0; step < 150 && (state.age < target || state.event); step += 1) {
    saveable(state);
    assert.equal(state.age, Math.floor(state.day / 365));
    assert.equal(state.battle, null, 'growing up cannot silently create or resolve a fight');
    if (state.event) {
      if (state.event.id === 'health_concern') { state = choose(state, 'continue'); continue; }
      if (state.event.id === 'lineage_bereavement') { state = choose(state, 'private'); continue; }
      if (state.event.id === 'hard_winter') { state = choose(state, 'endure'); continue; }
      if (state.event.id.startsWith('living_')) { state = choose(state, 'continue'); continue; } // the world takes its course
      // These campaign/class fixtures leave the optional field to its own course.
      // Every farm scene has an explicit, unpriced continuation; no crop or promise is accepted.
      if (state.event.id.startsWith('farm_')) { state = choose(state, 'continue'); continue; }
      assert.ok(state.event.id.startsWith('birth_') || state.event.id.startsWith('fate_'), `childhood policy cannot hide an unrelated adult scene: ${state.event.id}`);
      moments.push({ id: state.event.id, body: state.event.body, age: state.age });
      state = choose(state, childhoodChoice(state, preference));
    } else {
      const beforeAge = state.age;
      const nextBirthday = (beforeAge + 1) * 365;
      state = transition(state, value => value.timeline.yearTarget == null ? engine.ageUp(value) : engine.continueAgeUp(value));
      assert.ok(state.day <= nextBirthday, 'age advancement cannot skip the next birthday');
      assert.ok(state.day > beforeAge * 365 || state.event, 'an accepted age advancement must progress or explain a decision');
    }
  }
  assert.equal(state.age, target);
  assert.equal(state.day, target * 365);
  assert.equal(state.event, null);
  return { state, moments };
}

function move(state, id) {
  if (state.locationId === id) return state;
  const preview = travelPreview(state, id);
  assert.equal(preview.disabledReason, undefined, `${id}: ${preview.disabledReason}`);
  const startDay = state.day;
  state = transition(state, value => engine.travelTo(value, id));
  let extraDays = 0;
  const picks = { birth_adult_year:'care',life_hunger:'animal',career_year:'care',lineage_bereavement:'private',living_conscription:'continue',living_strike:'continue',living_wolves:'continue',living_purge:'continue',living_refugees:'continue',living_rival:'continue',living_lie:'continue',living_bedside:'continue',travel_messenger:'continue',travel_pilgrims:'continue',travel_grave_robber:'continue',travel_fortune:'continue',travel_wagon:'continue',travel_relic:'continue', travel_lore: 'continue', travel_witness: 'continue', travel_caravan: 'continue', travel_sick_traveler: 'continue', travel_bandits: 'avoid', travel_beasts: 'avoid', travel_weather: 'press', travel_delay: 'continue', health_concern: 'continue' };
  for (let step = 0; step < 60 && (state.timeline.journey || state.event); step += 1) {
    if (state.event) {
      const pick = state.event.id.startsWith('farm_') ? 'continue' : picks[state.event.id];
      assert.ok(pick, `road policy must explicitly handle ${state.event.id}`);
      const before = state.day;
      state = choose(state, pick);
      extraDays += state.day - before;
    } else state = transition(state, value => engine.continueJourney(value));
  }
  assert.equal(state.locationId, id);
  assert.equal(state.day, startDay + preview.days + extraDays, 'displayed road time and chosen detours are each spent exactly once');
  return saveable(state);
}

function earn(state, id) {
  const calling = classView(state).callings.find(item => item.id === id);
  assert.ok(calling);
  state = move(state, calling.locationId);
  if (!state.progression.mentors[id].met) state = act(state, `calling_meet_${id}`);
  for (let lesson = 0; lesson < 20 && Object.entries(calling.skills).some(([key, required]) => state.hero.skills[key] < required); lesson += 1) {
    state = act(state, `calling_train_${id}`);
    saveable(state);
  }
  assert.ok(Object.entries(calling.skills).every(([key, required]) => state.hero.skills[key] >= required));
  state = act(state, `calling_seek_${id}`);
  assert.equal(state.event.id, 'calling_initiation');
  assert.equal(state.progression.pendingCalling, id);
  state = choose(state, 'accept');
  assert.ok(state.progression.learnedClassIds.includes(id));
  assert.equal(state.hero.specialization, id);
  assert.equal(state.hero.path, calling.role);
  return saveable(state);
}

function prepared(seed = 'covenant-journey') {
  let state = growTo(engine.createBirthGame({ name: 'Aster', seed, household: 'tradesfolk', familySetup: 'two_parents', difficulty: 'balanced' }), 18, ['courage']).state;
  state = earn(state, 'guardian');
  state = move(state, 'city');
  for (const id of ['mira', 'orrin', 'kest']) state = transition(state, value => engine.recruitCompanion(value, id));
  assert.equal(state.companions.filter(person => person.recruited && person.active).length, 3);
  state = act(state, 'gear_buy_iron_sword');
  state = transition(state, value => engine.equipGear(value, 'iron_sword'));
  for (let supply = 0; supply < 2 && state.hero.gold >= 10; supply += 1) state = act(state, 'buy_potion');
  return saveable(state);
}

// What a life meets between the campaign's steps: care for a wound first, give back what was
// brought up, and let the field and the world take their course.
function incidental(state) {
  const open = ids => ids.find(id => state.event.choices.some(choice => choice.id === id && !choice.disabledReason));
  const id = state.event.id.startsWith('health_') ? open(['care', 'rest', 'support', 'routine', 'continue'])
    : state.event.id === 'delve_spoils' ? open(['return'])
    : open(['continue', 'endure', 'plead', 'private', 'keep', 'leave']);
  const pick = id || state.event.choices.find(choice => !choice.disabledReason)?.id;
  assert.ok(pick, `${state.event.id} offers a way on`);
  return pick;
}

function completeDelve(state) {
  const id = state.delve.id, battles = [];
  for (let step = 0; step < 240 && state.delve; step += 1) {
    if (state.battle) { battles.push(state.battle.encounterId); ({ state } = win(state)); continue; }
    if (state.event) { state = choose(state, incidental(state)); continue; }
    const view = delveView(state), actions = engine.getActions(state).filter(action => !action.disabledReason), pick = ids => actions.find(action => ids.includes(action.id));
    const hurt = state.hero.hp < state.hero.maxHp * 0.6 || state.companions.some(person => person.active && person.alive !== false && person.hp > 0 && person.hp < person.maxHp * 0.6);
    let next = pick(['delve_take', 'delve_claim', 'delve_relic', 'delve_torch', 'delve_search']);
    if (!next && hurt) next = pick(['delve_camp']);
    const doors = actions.filter(action => action.id.startsWith('delve_go_')), unseen = doors.filter(action => action.label.startsWith('On to')), back = doors.filter(action => action.label.startsWith('Back'));
    if (!next && view.objectiveDone) next = unseen.find(action => action.id.endsWith('lair')) || pick(['delve_descend', 'delve_out']) || ['delve_go_secret', 'delve_go_approach', 'delve_go_hub', 'delve_go_lair'].map(go => doors.find(action => action.id === go)).find(Boolean) || back[0];
    if (!next) next = unseen.find(action => !action.id.endsWith('lair')) || unseen[0];
    if (!next) next = back.find(action => action.id === 'delve_go_hub') || back[0];
    assert.ok(next, `${id}: a delve step exists in ${view.room.id}`);
    state = transition(state, value => engine.chooseAction(value, next.id)); saveable(state);
  }
  assert.equal(state.delve, null, 'the delve ends');
  for (let n = 0; n < 10 && state.event; n += 1) state = choose(state, incidental(state));
  return { state, battles };
}

const campaignPolicy = {
  patients: 'living', letter: 'order', return: 'quiet', inquiry: 'record', ferryman: 'protect',
  accounts: 'compare', patron: 'independent', gate: 'reinforce', refugees: 'camp',
  anchor: 'voluntary', council: 'inclusive', keeper: 'listen', pledge: 'renew',
  prepare: 'wards', final: 'testimony', aftermath: 'people',
};

function campaignUntil(state, stop = 'complete', policy = {}) {
  if(state.questLog?.main!=='active')state=act(state,'journal_main_accept');
  const battles = [];
  for (let step = 0; step < 30 && state.campaign.stage !== stop && state.campaign.stage !== 'complete'; step += 1) {
    for (let n = 0; n < 10 && (state.event?.id.startsWith('farm_') || state.event?.id.startsWith('health_')); n += 1) state = choose(state, incidental(state));
    assert.equal(state.event, null);
    assert.equal(state.battle, null);
    const stage = state.campaign.stage;
    const quest = campaignView(state).quests.find(item => item.id === stage);
    assert.equal(quest.status, 'active');
    state = move(state, quest.locationId);
    const needsRest = () => state.hero.hp < state.hero.maxHp || state.hero.mp < state.hero.maxMp || state.companions.some(person => person.active && (person.hp < person.maxHp || person.mp < person.maxMp));
    for (let rest = 0; rest < 6 && needsRest(); rest += 1) state = act(state, 'camp_rest');
    state = act(state, `quest_begin_${stage}`);
    if (state.delve) {
      const expedition = completeDelve(state);
      state = expedition.state;
      battles.push(...expedition.battles);
    } else {
      const choice = policy[stage] || campaignPolicy[stage];
      assert.ok(choice, `${stage} needs a deliberate campaign choice`);
      state = choose(state, choice);
      if (state.battle) {
        battles.push(state.battle.encounterId);
        ({ state } = win(state));
      }
    }
    assert.ok(state.campaign.completed.includes(stage), `${stage} must finish through its actual event or dungeon`);
    saveable(state);
  }
  assert.equal(state.campaign.stage, stop);
  return { state, battles };
}

test('authentic v0.2 saves migrate with the exact pending annual decision and battle snapshot', () => {
  for (const [name, original] of Object.entries(oldLives)) {
    assert.equal(original.revision, 2, 'fixtures must remain original revision 2 saves');
    assert.equal(Object.hasOwn(original, 'timeline'), false);
    assert.equal(engine.validateSave(original), true, `${name} remains importable`);
    const migrated = transition(original, value => engine.migrateSave(value));
    assert.equal(migrated.version, 1);
    assert.equal(migrated.revision, 5);
    assert.equal(migrated.timeline.mode, 'legacy');
    for (const key of ['hero', 'age', 'day', 'phase', 'locationId', 'companions', 'factions', 'legal', 'obligations', 'event', 'battle', 'life', 'equipment', 'journal']) {
      preserveFields(original[key], migrated[key], `${name}.${key}`);
    }
    assertEventMechanics(original.event,migrated.event);
    assert.deepEqual(migrated.battle, original.battle, 'a pending battle must stay byte-for-byte identical');
    for (const place of original.world.locations) {
      const expanded = migrated.world.locations.find(item => item.id === place.id);
      assert.ok(expanded, `${place.name} remains on the map`);
      for (const [key, value] of Object.entries(place)) {if(key==='description')assert.equal(typeof expanded[key],'string');else assert.deepEqual(expanded[key], value, `${name}: ${place.id}.${key} remains exact`);}
    }
    for (const road of original.world.roads) assert.ok(migrated.world.roads.some(item => Object.entries(road).every(([key, value]) => item[key] === value)), 'existing roads remain connected');
    saveable(migrated);
    assert.deepEqual(engine.migrateSave(migrated), migrated, 'migration cannot append maps or grant resources repeatedly');
  }
});

test('a migrated unfinished battle continues from its saved turn and resolves only once', () => {
  let state = engine.migrateSave(oldLives.midbattle);
  const target = state.battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id;
  assert.deepEqual(takeBattleAction(state.battle, 'attack', target), takeBattleAction(oldLives.midbattle.battle, 'attack', target));
  const completed = takeBattleAction(state.battle, 'retreat');
  const beforeGold = state.hero.gold;
  state = transition(state, value => engine.resolveBattle(value, completed));
  assert.equal(state.battle, null);
  assert.equal(state.hero.gold, beforeGold);
  assert.equal(state.hero.profession, oldLives.midbattle.hero.profession);
  const duplicate = transition(state, value => engine.resolveBattle(value, completed));
  assert.deepEqual(duplicate.hero, state.hero);
  assert.deepEqual(duplicate.journal, state.journal);
  saveable(state);
});

test('an authentic unfinished v0.2 year retains its exact remaining decisions and accounting', () => {
  let state = engine.migrateSave(oldLives.annualPlan);
  const expected = oldFixture.expectations.annualContinuation;
  let decision = 0;
  for (let step = 0; step < 40 && (state.event || state.life.plan); step += 1) {
    saveable(state);
    if (state.event) {
      if (state.event.id === 'health_concern') { state = choose(state, 'continue'); continue; }
      assert.equal(state.event.id, expected.choices[decision]?.event, 'compatibility cannot replace an unfinished annual decision with a new campaign event');
      state = choose(state, expected.choices[decision].choice);
      decision += 1;
    } else state = transition(state, value => engine.continueYear(value));
  }
  assert.equal(decision, expected.choices.length);
  assert.equal(state.life.plan, null);
  assert.equal(state.event, null);
  assert.equal(state.day, expected.day);
  assert.equal(state.age, expected.age);
  assert.equal(state.hero.gold, expected.gold);
  assert.equal(state.hero.skills.scholarship, expected.scholarship);
  assert.deepEqual(state.life.yearHistory, expected.yearHistory);
  const repeated = transition(state, value => engine.continueYear(value));
  assert.deepEqual(repeated.hero, state.hero);
  assert.deepEqual(repeated.life.yearHistory, state.life.yearHistory);
});

test('expanded seeds vary real geography while every site has a connected weighted route', () => {
  const geometries = new Set();
  const terrains = new Set();
  for (const seed of ['copper', 'ash', 'reed', 'hearth', 'willow', 'star', 'rain', 'briar']) {
    const world = generateWorld(seed, { expanded: true });
    assert.deepEqual(generateWorld(seed, { expanded: true }), world);
    assert.equal(validateWorld(world), true);
    assert.ok(world.locations.length >= 13);
    assert.equal(world.map.nodes.length, world.locations.length);
    geometries.add(JSON.stringify(world.map.nodes));
    terrains.add(JSON.stringify(world.map.terrain));
    for (const destination of world.locations) {
      const route = findRoute(world, 'home', destination.id);
      assert.equal(route[0], 'home');
      assert.equal(route.at(-1), destination.id);
      const preview = travelPreview({ world, locationId: 'home', timeline: { mode: 'birth' }, age: 18, event: null, battle: null, dungeon: null }, destination.id);
      assert.deepEqual(preview.route, route);
      let cost = 0;
      for (let index = 1; index < route.length; index += 1) {
        const from = route[index - 1], to = route[index];
        const road = world.roads.find(item => item.from === from && item.to === to || item.from === to && item.to === from);
        assert.ok(road, 'a displayed route must consist of actual roads');
        cost += road.days;
      }
      assert.equal(preview.days, cost);
      assert.equal(preview.days, preview.legs.reduce((sum, leg) => sum + leg.days, 0));
    }
  }
  assert.ok(geometries.size > 1, 'seeds must change the board positions, not only place names');
  assert.ok(terrains.size > 1, 'seeds must change the terrain geometry');
});

test('a new life begins at birth without a purchased class and pending moments cannot be skipped', () => {
  const state = engine.createBirthGame({ name: 'Newborn Rowan', seed: 'birth-integrity', path: 'mage', household: 'poor' });
  assert.equal(state.revision, 5);
  assert.equal(state.timeline.mode, 'birth');
  assert.equal(state.day, 0);
  assert.equal(state.age, 0);
  assert.equal(state.hero.path, 'unformed', 'legacy creation path input cannot assign a newborn class');
  assert.equal(state.hero.specialization, null);
  assert.deepEqual(state.progression.learnedClassIds, []);
  assert.equal(state.equipment.equipped.weapon, null);
  assert.equal(state.hero.profession, 'Unemployed');
  saveable(state);
  assert.ok(state.event, 'birth begins with a real guardian decision');
  for (const operation of [engine.ageUp, engine.continueAgeUp]) {
    const blocked = transition(state, value => operation(value));
    assert.equal(blocked.day, 0);
    assert.deepEqual(blocked.event, state.event);
    assert.deepEqual(blocked.hero, state.hero);
  }
});

test('seeded childhood reproduces a complete zero-to-eighteen life and grows actual skills', () => {
  const configuration = { name: 'Growing Rowan', seed: 'remembered-childhood', household: 'poor', origin: 'village' };
  const first = growTo(engine.createBirthGame(configuration), 18);
  const replay = growTo(engine.createBirthGame(configuration), 18);
  assert.deepEqual(replay, first, 'the same seed and decisions must reproduce the life');
  assert.equal(first.state.phase, 'adult');
  assert.ok(first.moments.length >= 18, 'each early year needs a meaningful remembered decision');
  assert.ok(Object.values(first.state.hero.skills).some(value => value > 0), 'childhood must teach real skills');
  assert.ok(Object.values(first.state.hero.attributes).some(value => value > 1), 'childhood must develop real attributes');
  assert.equal(first.state.flags.plagueStage, 0, 'new lives use the connected campaign rather than duplicate legacy plague letters');
  const different = growTo(engine.createBirthGame({ ...configuration, seed: 'another-childhood' }), 18);
  assert.notDeepEqual(different.moments.map(moment => moment.body), first.moments.map(moment => moment.body));
  assert.notDeepEqual(different.state.life.people.map(person => person.name), first.state.life.people.map(person => person.name));
  assert.notDeepEqual(different.state.world.map.nodes, first.state.world.map.nodes);
});

test('age gates reject direct adult API calls and actual regional travel opens at fourteen', () => {
  let state = growTo(engine.createBirthGame({ name: 'Young Ash', seed: 'age-gate-life', origin: 'city' }), 10).state;
  assert.equal(state.event, null);
  for (const id of ['work', 'choose_profession', 'life_court_river', 'life_family', 'vampire_invitation', 'lycan_invitation', 'retire', 'calling_seek_paladin', 'explore_enter_cistern']) {
    const rejected = transition(state, value => engine.chooseAction(value, id));
    assert.equal(rejected.day, state.day, `${id} must not spend a child's time`);
    assert.deepEqual(rejected.hero, state.hero, `${id} must not apply adult rewards or conditions`);
    assert.deepEqual(rejected.campaign, state.campaign);
    assert.equal(rejected.dungeon, null);
  }
  const youngParty = transition(state, value => engine.recruitCompanion(value, 'mira'));
  assert.deepEqual(youngParty.companions, state.companions, 'recruitment cannot bypass the sixteen-year gate');
  const youngPlanner = transition(state, value => engine.planYear(value, { focus: 'livelihood', lifestyle: 'frugal' }));
  assert.equal(youngPlanner.day, state.day);
  assert.equal(youngPlanner.life.plan, null, 'new childhood cannot enter the old adult yearly planner');
  state = growTo(state, 13).state;
  const blockedPreview = travelPreview(state, 'marsh');
  assert.ok(blockedPreview.disabledReason);
  const blocked = transition(state, value => engine.travelTo(value, 'marsh'));
  assert.equal(blocked.locationId, state.locationId);
  assert.equal(blocked.day, state.day);
  state = growTo(state, 14).state;
  const preview = travelPreview(state, 'marsh');
  assert.equal(preview.disabledReason, undefined);
  assert.ok(preview.route.length > 2, 'travel must follow the route across the seeded region');
  const traveled = move(state, 'marsh');
  assert.equal(traveled.locationId, 'marsh');
  assert.ok(traveled.day >= state.day + preview.days, 'a disclosed detour may add days to the real route');
  saveable(traveled);
});

test('age-appropriate practice teaches a real skill without granting a class or unlimited yearly farming', () => {
  let state = growTo(engine.createBirthGame({ name: 'Learning Ash', seed: 'yearly-practice' }), 9).state;
  assert.equal(engine.getAgeActivities(state).some(action => action.id === 'grow_weapons'), false);
  state = growTo(state, 10).state;
  const initialWeapons = state.hero.skills.weapons;
  for (let practice = 0; practice < 2; practice += 1) {
    const offered = engine.getAgeActivities(state).find(action => action.id === 'grow_weapons');
    const day = state.day;
    state = act(state, 'grow_weapons');
    assert.equal(state.day, day + offered.days);
    assert.equal(state.hero.skills.weapons, initialWeapons + practice + 1);
    assert.equal(state.hero.path, 'unformed');
    assert.equal(state.hero.specialization, null);
  }
  assert.ok(engine.getAgeActivities(state).find(action => action.id === 'grow_weapons').disabledReason);
  const limited = transition(state, value => engine.chooseAction(value, 'grow_weapons'));
  assert.equal(limited.day, state.day);
  assert.deepEqual(limited.hero, state.hero);
  state = growTo(state, 11).state;
  assert.equal(engine.getAgeActivities(state).find(action => action.id === 'grow_weapons').disabledReason, undefined);
  saveable(state);
});

test('chosen childhood practice opens different earned callings and switching cannot stack class bonuses', () => {
  const configuration = { name: 'Two possible lives', seed: 'earned-identity', household: 'poor' };
  function practicedLife(actions) {
    let s=growTo(engine.createBirthGame(configuration),10,['curiosity']).state;
    for(let age=10;age<18;age++) {
      for(const id of actions)s=act(s,id);
      s=growTo(s,age+1,['curiosity']).state;
    }
    return s;
  }
  const academic = practicedLife(['grow_arcana','grow_devotion']);
  const martial = practicedLife(['grow_weapons','grow_defense','grow_survival']);
  assert.equal(academic.hero.path, 'unformed');
  assert.equal(martial.hero.path, 'unformed');
  assert.equal(academic.hero.specialization, null);
  assert.ok(academic.hero.skills.arcana > martial.hero.skills.arcana);
  assert.ok(martial.hero.skills.weapons > academic.hero.skills.weapons);
  const canTrain = (state, id) => Object.entries(CLASS_CATALOG.find(item => item.id === id).skills).every(([key, required]) => state.hero.skills[key] >= required);
  assert.equal(canTrain(academic, 'healer'), true);
  assert.equal(canTrain(martial, 'berserker'), true);
  let state = earn(academic, 'healer');
  assert.equal(state.hero.path, 'mage');
  state = earn(state, 'guardian');
  assert.deepEqual(state.progression.learnedClassIds, ['healer', 'guardian']);
  const base = { attributes: structuredClone(state.hero.attributes), skills: structuredClone(state.hero.skills), maxHp: state.hero.maxHp, maxMp: state.hero.maxMp };
  for (const id of ['healer', 'guardian', 'healer', 'guardian']) {
    state = act(state, `calling_switch_${id}`);
    assert.equal(state.hero.specialization, id);
    assert.equal(state.progression.learnedClassIds.length, 2);
    assert.deepEqual({ attributes: state.hero.attributes, skills: state.hero.skills, maxHp: state.hero.maxHp, maxMp: state.hero.maxMp }, base);
  }
  saveable(state);
});

test('a complete consent campaign reaches a materially preserved world through actual dungeons and bosses', () => {
  const outcome = campaignUntil(prepared('the-willing-compact'));
  const state = outcome.state;
  assert.equal(state.campaign.ending.id, 'renew');
  assert.equal(state.campaign.stage, 'complete');
  assert.equal(state.campaign.completed.length, 20);
  assert.equal(new Set(state.campaign.completed).size, 20);
  assert.equal(state.campaign.facts.withdrawalRights, true);
  assert.equal(state.campaign.facts.publicConsent, true);
  assert.equal(state.world.locations.find(place => place.id === 'brook').status, 'scarred');
  assert.equal(state.world.locations.find(place => place.id === 'home').status, 'thriving');
  for(const place of state.world.locations.filter(p=>p.status==='destroyed'))assert.ok(state.world.changes.some(c=>c.locationId===place.id&&c.id.startsWith('realm-')),'renewal does not erase unrelated recorded war losses');
  assert.ok(travelPreview(state, 'city').services.includes('academy'));
  assert.ok(outcome.battles.includes('cistern_keeper'));
  assert.ok(outcome.battles.includes('archive_warden'));
  assert.ok(outcome.battles.includes('thornheart'));
  assert.ok(outcome.battles.includes('core_warden'));
  assert.equal(state.hero.condition, null);
  const repeat = transition(state, value => engine.chooseAction(value, 'quest_begin_final'));
  assert.deepEqual(repeat.hero, state.hero);
  assert.deepEqual(repeat.campaign, state.campaign);
  assert.deepEqual(repeat.world.changes, state.world.changes);
  saveable(state);
});

test('a destructive ending leaves visitable ruins, displaced people, and genuinely unavailable services', () => {
  const outcome = campaignUntil(prepared('the-broken-anchor'), 'complete', { gate: 'evacuate', refugees: 'camp', pledge: 'shatter', prepare: 'evacuate', final: 'fight' });
  let state = outcome.state;
  assert.equal(state.campaign.ending.id, 'shatter');
  assert.equal(state.campaign.facts.anchorDestroyed, true);
  assert.ok(outcome.battles.includes('covenant_guardian'), 'the final route must really fight its guardian');
  for (const id of ['brook', 'home', 'citadel']) {
    assert.equal(state.world.locations.find(place => place.id === id).status, 'destroyed');
    const preview = travelPreview(state, id);
    assert.ok(preview.route.length, 'lost settlements remain reachable');
    assert.deepEqual(preview.services, []);
  }
  const caregiver = state.life.people.find(person => person.id === 'kin');
  assert.equal(caregiver.locationId, 'camp');
  assert.ok(caregiver.memories.some(memory => memory.includes('displaced')));
  state = move(state, 'home');
  for (const id of ['work', 'choose_profession', 'study', 'buy_potion', 'gear_buy_ash_staff', 'life_home_cottage']) {
    const offered = engine.getActions(state).find(action => action.id === id);
    assert.ok(!offered || offered.disabledReason, `${id} cannot use a destroyed settlement's services`);
    const rejected = transition(state, value => engine.chooseAction(value, id));
    assert.equal(rejected.day, state.day);
    assert.deepEqual(rejected.hero, state.hero);
    assert.deepEqual(rejected.equipment, state.equipment);
  }
  state = move(state, 'camp');
  state=atService(state,'work');
  assert.ok(engine.getActions(state).some(action => action.id === 'work' && !action.disabledReason), 'civilian work needs a reachable surviving alternative');
  assert.ok(classView(state).callings.every(calling => !['destroyed', 'evacuated'].includes(state.world.locations.find(place => place.id === calling.locationId).status)), 'lost mentors relocate to surviving alternatives');
  saveable(state);
});

test('a named local conversation keeps private transformation knowledge with only the chosen participant',()=>{
 let state=growTo(engine.createBirthGame({name:'Private Selene',seed:'one-person-confidence'}),18,['curiosity']).state;
 state=move(state,'city');state=choose(act(state,'vampire_invitation'),'accept');const person=getContacts(state).find(p=>p.id==='fellow');state=move(state,person.locationId);
 const known=Object.fromEntries(state.life.people.map(p=>[p.id,structuredClone(p.knownFacts)])),day=state.day;
 state=act(state,'confide_fellow');assert.equal(state.day,day);assert.ok(state.life.people.find(p=>p.id==='fellow').knownFacts.includes('condition_vampire'));
 for(const p of state.life.people.filter(p=>p.id!=='fellow'))assert.deepEqual(p.knownFacts,known[p.id]);
 assert.equal(engine.getActions(state).some(a=>a.id==='confide_fellow'),false);saveable(state);
});

test('a real dungeon remedy supports curing vampirism without erasing earned identity or duplicating herbs', () => {
  let state = prepared('the-spring-remedy');
  const originalMaxMp = state.hero.maxMp;
  state = act(state, 'vampire_invitation');
  state = choose(state, 'accept');
  assert.equal(state.hero.maxMp, originalMaxMp + 6);
  state = act(state, 'night_travel');
  state = move(state, 'forest');
  state = act(state, 'explore_enter_root_caverns');
  assert.ok(state.delve, 'the Moonroot Caverns are a delve for every life (v0.72.3)');
  const herbsBefore = state.flags.herbs || 0;
  const discovery = completeDelve(state);
  state = discovery.state;
  assert.ok(discovery.battles.includes('thornheart'));
  assert.equal(state.flags.herbs, herbsBefore + 3, 'the spring gives three bundles of moonroot, once');
  state = move(state, 'brook');
  state.hero.gold = Math.max(state.hero.gold, 40); // the delve's torches and days took the purse; the cure's fee is found as controlled data
  const skills = structuredClone(state.hero.skills);
  const earned = structuredClone(state.progression.learnedClassIds);
  const gold = state.hero.gold;
  const herbs = state.flags.herbs;
  const beforeCureMaxMp = state.hero.maxMp;
  state = act(state, 'seek_cure');
  assert.equal(state.hero.condition, null);
  assert.equal(state.hero.maxMp, beforeCureMaxMp - 6, 'curing removes only the vampire bonus and preserves dungeon-earned level growth');
  assert.equal(state.hero.gold, gold - 20);
  assert.equal(state.flags.herbs, herbs - 2);
  assert.deepEqual(state.hero.skills, skills);
  assert.deepEqual(state.progression.learnedClassIds, earned);
  assert.equal(state.hero.specialization, 'guardian');
  const repeated = transition(state, value => engine.chooseAction(value, 'seek_cure'));
  assert.deepEqual(repeated.hero, state.hero);
  assert.equal(repeated.flags.herbs, state.flags.herbs);
  state = move(state, 'forest');
  const repeatedSpring = transition(state, value => engine.chooseAction(value, 'explore_enter_root_caverns'));
  assert.equal(repeatedSpring.flags.herbs, state.flags.herbs, 'going back to the spring takes nothing at the door');
  saveable(state);
});

test('blood hunger interrupts a real road with a usable feeding choice and preserves remaining travel cost', () => {
  let state = prepared('hunger-road-boundary');
  state = act(state, 'vampire_invitation');
  state = choose(state, 'accept');
  state = act(state, 'night_travel');
  for (let recovery = 0; recovery < 13; recovery += 1) {
    if(state.event?.id==='health_concern')state=choose(state,'continue');
    state = act(state, 'camp_rest');
  }
  if(state.event?.id==='health_concern')state=choose(state,'continue');
  assert.equal(state.hero.condition.hunger, 74, 'the boundary must arise through ordinary elapsed days');
  const started = state.day;
  const preview = travelPreview(state, 'marsh');
  state = transition(state, value => engine.travelTo(value, 'marsh'));
  assert.equal(state.event.id, 'life_hunger', 'a journey must expose its pending need rather than deadlock behind Continue');
  assert.ok(state.timeline.journey);
  assert.ok(state.day > started && state.day < started + preview.days);
  assert.notEqual(state.locationId, 'marsh', 'an interrupted partial leg cannot teleport to its destination');
  const journey = structuredClone(state.timeline.journey);
  saveable(state);
  const restored = engine.migrateSave(JSON.parse(JSON.stringify(state)));delete restored.trail;delete restored.mazeBook;delete restored.maze;
  assert.deepEqual(engine.chooseEventOption(restored, 'animal'), engine.chooseEventOption(state, 'animal'));
  const ownArrangement = choose(state, 'pause');
  assert.ok(engine.getActions(ownArrangement).some(action => action.id === 'feed_vampire' && !action.disabledReason), 'a paused hunger choice must still allow the promised day activity');
  const stillHungry = transition(ownArrangement, value => engine.continueJourney(value));
  assert.equal(stillHungry.day, ownArrangement.day);
  assert.equal(stillHungry.event.id, 'life_hunger', 'unmet hunger cannot be silently skipped');
  state = choose(state, 'animal');
  assert.deepEqual(state.timeline.journey, journey, 'feeding spends a day but cannot count as road progress');
  assert.ok(state.hero.condition.hunger < 75);
  let detourDays = 0;
  const roadChoices = { living_conscription:'continue',living_strike:'continue',living_wolves:'continue',living_purge:'continue',living_refugees:'continue',living_rival:'continue',living_lie:'continue',living_bedside:'continue',travel_messenger:'continue',travel_pilgrims:'continue',travel_grave_robber:'continue',travel_fortune:'continue',travel_wagon:'continue',travel_relic:'continue', travel_lore: 'continue', travel_witness: 'continue', travel_caravan: 'continue', travel_sick_traveler: 'continue', travel_bandits: 'avoid', travel_beasts: 'avoid', travel_weather: 'press', health_concern: 'continue' };
  for (let step = 0; step < 40 && (state.timeline.journey || state.event); step += 1) {
    if (state.event) {
      assert.ok(roadChoices[state.event.id], `the road response must explicitly handle ${state.event.id}`);
      const beforeDay = state.day;
      state = choose(state, roadChoices[state.event.id]);
      detourDays += state.day - beforeDay;
    } else state = transition(state, value => engine.continueJourney(value));
  }
  assert.equal(state.locationId, 'marsh');
  assert.equal(state.timeline.journey, null);
  assert.equal(state.day, started + preview.days + 1 + detourDays, 'road days, feeding and chosen detours must each be charged once');
  assert.equal(state.legal.evidence, 0);
  saveable(state);
});
