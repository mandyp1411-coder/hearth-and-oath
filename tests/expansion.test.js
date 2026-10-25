import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import * as engine from '../dist/js/engine.js';
import { createBattle, getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { normalizeAppearance } from '../dist/js/avatar.js';
import { GEAR_CATALOG, gearBonuses } from '../dist/js/gear.js';
import { yearPreview } from '../dist/js/life.js';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1.json', import.meta.url), 'utf8')).states;

function transition(state, operation) {
  const before = structuredClone(state);
  const next = operation(state);
  assert.deepEqual(state, before, 'transitions must preserve the original save');
  assert.notEqual(next, state);
  assert.notEqual(next.hero, state.hero);
  assert.notEqual(next.world, state.world);
  return next;
}

function choose(state, id) {
  assert.ok(state.event?.choices.some(option => option.id === id), `${state.event?.id} must offer ${id}`);
  return transition(state, value => engine.chooseEventOption(value, id));
}

function acknowledge(state) {
  for (let count = 0; count < 5; count += 1) {
    if (state.event?.id === 'plague_letter') state = choose(state, 'later');
    else if (state.event?.id === 'orrin_request') state = choose(state, 'honest');
    else return state;
  }
  assert.fail('routine followups must end');
}

function adult(config = {}, education = 'apprentice') {
  let state = engine.createGame({ name: 'Expansion Rowan', seed: 'expanded-life', path: 'mage', household: 'poor', ...config });
  for (const id of ['defend', education, 'question']) state = choose(state, id);
  assert.equal(state.phase, 'adult');
  return state;
}

function activity(state, id) {
  state=knownCurseMeeting(state,id);
  if(id==='help_clinic'||id.startsWith('life_home_')){syncCartography(state);for(const room of settlementWalkPath(state,id==='help_clinic'?'shrine':'homes'))state=engine.chooseAction(state,'atlas_room_'+room);}
  state = acknowledge(state);
  const action = engine.getActions(state).find(item => item.id === id);
  assert.ok(action, `${id} must be offered at ${state.locationId}`);
  assert.equal(action.disabledReason, undefined, `${id}: ${action.disabledReason}`);
  const next = transition(state, value => engine.chooseAction(value, id));
  assert.equal(next.day, state.day + action.days, `${id} must charge its displayed time exactly once`);
  assert.ok(next.hero.gold >= 0);
  return next;
}

function move(state, id) {
  state = acknowledge(state);
  const next = transition(state, value => engine.travelTo(value, id));
  assert.equal(next.locationId, id);
  return next;
}

function assertOldFields(original, migrated, path = 'state') {
  if (path === 'state.hero.appearance') return;
    if (path === 'state.world.locations') {
    for (const place of original) assertOldFields(place, migrated.find(item => item.id === place.id), `${path}.${place.id}`);
    return;
  }
  if (path === 'state.world.roads') {
    for (const road of original) assertOldFields(road, migrated.find(item => item.from === road.from && item.to === road.to), `${path}.${road.from}-${road.to}`);
    return;
  }
  if(Array.isArray(original)){assertCapturedMigration(original,migrated,path);return;}
  if (original && typeof original === 'object' && !Array.isArray(original)) {
    for (const [key, value] of Object.entries(original)) {
      assert.ok(Object.hasOwn(migrated, key), `${path}.${key} must survive migration`);
      assertOldFields(value, migrated[key], `${path}.${key}`);
    }
  } else {
    assert.deepEqual(migrated, original, `${path} must survive migration`);
  }
}

function moonbound(config = {}) {
  let state = adult({ seed: 'moonbound-life', ...config });
  state = activity(state, 'work');
  state = activity(state, 'work');
  state = move(state, 'forest');
  state = activity(state, 'lycan_invitation');
  state = choose(state, 'accept');
  state = acknowledge(state);
  assert.equal(state.hero.condition.type, 'lycanthrope');
  return state;
}

const yearChoices = {
  life_trade_shortage: 'fair', life_healer_consent: 'living', life_scholar_citation: 'challenge',
  life_soldier_orders: 'appeal', life_herbalist_grove: 'teach', life_grove_return: 'mentor',
  life_family_roof: 'honest', life_friend_ambition: 'listen', life_friend_ward: 'clinic',
  life_rival_race: 'together', life_lantern_vigil: 'all', life_ancestor_chair: 'stories',
  life_secular_debate: 'evidence', life_noble_table: 'insist', life_budget_feast: 'help',
  life_smuggler_offer: 'decline', life_receipt_returns: 'defend', life_vampire_guest: 'dusk',
  life_wolf_confidant: 'boundary', life_partner_time: 'explain', life_child_school: 'public',
  life_child_question: 'ask', life_overwork: 'share', life_open_hearth: 'shelter',
  life_border_story: 'around', life_birthday: 'people', life_budget: 'simplify',
  life_hunger: 'animal', annual_deadline_review: 'continue', plague_letter: 'later',
  orrin_request: 'honest', health_concern: 'continue', lineage_bereavement: 'private',
};

function finishYear(state) {
  const events = [];
  for (let step = 0; step < 60; step += 1) {
    assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true, `annual state ${state.event?.id || state.day} must remain saveable`);
    assert.ok(state.hero.gold >= 0);
    for (const key of ['health', 'stress', 'happiness']) assert.ok(state.life[key] >= 0 && state.life[key] <= 100);
    if (state.event) {
      const id = state.event.id;
      // One rulebook (v0.72.2): an untreated severe fever can kill, so the year's policy seeks what care it can.
      const open = c => state.event.choices.some(item => item.id === c && !item.disabledReason);
      const optionId = id === 'lycan_fullmoon' ? (state.event.choices.some(item => item.id === 'safe') ? 'safe' : 'isolate') : id === 'health_concern' ? ['care', 'rest', 'continue'].find(open) : yearChoices[id];
      assert.ok(optionId, `year policy needs a deliberate choice for ${id}`);
      events.push({ id, body: state.event.body, choice: optionId });
      state = choose(state, optionId);
    } else if (state.life.plan) {
      const next = transition(state, value => engine.continueYear(value));
      assert.ok(next.day > state.day || next.event || !next.life.plan, 'an accepted annual plan must progress or explain its interruption');
      state = next;
    } else return { state, events };
  }
  assert.fail('a single planned year must finish with a bounded number of decisions');
}

test('genuine v1 lives migrate without resetting history, resources, pending decisions, or combat', () => {
  for (const [name, original] of Object.entries(legacy)) {
    assert.equal(Object.hasOwn(original, 'revision'), false, 'fixture must remain an authentic legacy state');
    assert.equal(engine.validateSave(original), true, `${name} remains importable`);
    const migrated = transition(original, value => engine.migrateSave(value));
    assert.equal(migrated.version, 1);
    assert.equal(migrated.revision, 5);
    assertOldFields(original, migrated);
    if (!isDeepStrictEqual(original.hero.appearance, migrated.hero.appearance)) {
      assert.deepEqual(migrated.hero.legacyAppearance, original.hero.appearance);
    }
    assertCapturedMigration(original.event,migrated.event,'state.event');
    assert.deepEqual(migrated.battle, original.battle);
    assert.ok(migrated.life && migrated.equipment);
    assert.equal(engine.validateSave(JSON.parse(JSON.stringify(migrated))), true);
    assert.deepEqual(engine.migrateSave(migrated), migrated, 'migration must be idempotent and cannot regrant gear or resources');
  }

  const corrupted = structuredClone(legacy.adult);
  corrupted.hero.gold = -1;
  assert.equal(engine.migrateSave(corrupted), null, 'migration must reject a malformed life rather than repair it into a new one');
});

test('migrated pending childhood and combat states continue from their exact choices and turn', () => {
  const child = engine.migrateSave(legacy.childhood);
  const grown = choose(child, 'scholarship');
  assert.equal(grown.event.id, 'childhood_3');
  assert.ok(grown.obligations.some(item => item.id === 'scholarship_service'));

  const battle = engine.migrateSave(legacy.battle);
  const target = battle.battle.actors.find(actor => actor.side === 'enemy' && actor.hp > 0).id;
  assert.deepEqual(takeBattleAction(battle.battle, 'attack', target), takeBattleAction(legacy.battle.battle, 'attack', target));
  const retreated = takeBattleAction(battle.battle, 'retreat');
  const result = transition(battle, value => engine.resolveBattle(value, retreated));
  assert.equal(result.battle, null);
  assert.equal(result.hero.gold, battle.hero.gold);
  assert.equal(result.hero.specialization, 'necromancer');
  assert.equal(result.hero.profession, 'Healer');
  assert.equal(engine.validateSave(result), true);
});

test('extended appearance and roleplay choices survive creation and cosmetic changes preserve the life', () => {
  const originalLook = {
    ancestry: 'elf', skin: 'deep', hair: 'silver', hairStyle: 'braided', eyes: 'violet',
    face: 'angular', build: 'slender', outfit: 'scholar', outfitColor: 'plum',
    accessory: 'glasses', scar: 'cheek', tattoo: 'sigil',
  };
  const state = adult({ appearance: originalLook, temperament: 'rebellious', belief: 'ancestors', pronouns: 'they/them' });
  assert.deepEqual(state.hero.appearance, normalizeAppearance(originalLook));
  assert.equal(state.hero.temperament, 'rebellious');
  assert.equal(state.hero.belief, 'ancestors');
  assert.equal(state.hero.pronouns, 'they/them');
  const changedLook = { ...originalLook, ancestry: 'dwarf', face: 'bearded', outfit: 'work', accessory: 'amulet', hairStyle: 'short' };
  const changed = transition(state, value => engine.updateAppearance(value, changedLook));
  assert.deepEqual(changed.hero.appearance, normalizeAppearance(changedLook));
  const { appearance: oldAppearance, ...oldHero } = state.hero;
  const { appearance: newAppearance, ...newHero } = changed.hero;
  assert.deepEqual(newHero, oldHero, 'appearance cannot alter attributes, class, wellbeing, or resources');
  for (const key of ['day', 'age', 'phase', 'life', 'equipment', 'factions', 'legal', 'companions', 'obligations']) {
    assert.deepEqual(changed[key], state[key], `${key} must not depend on a cosmetic edit`);
  }
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(changed))), true);
});

test('a prepared full moon interrupts a planned year at its forecast and resolves once', () => {
  let state = moonbound();
  const before = engine.getMoonForecast(state);
  assert.equal(before.nextFullMoon, 14);
  assert.equal(before.daysUntil, 14 - state.day);
  state = activity(state, 'lycan_prepare');
  assert.equal(engine.getMoonForecast(state).prepared, true);
  const control = state.hero.condition.control;
  state = transition(state, value => engine.planYear(value, { focus: 'rest', lifestyle: 'frugal' }));
  assert.equal(state.day, before.nextFullMoon, 'a year plan cannot silently pass the transformation night');
  assert.equal(state.event.id, 'lycan_fullmoon');
  assert.ok(state.life.plan, 'the interrupted plan remains available to continue');
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(engine.validateSave(restored), true);
  assert.deepEqual(engine.chooseEventOption(restored, 'safe'), engine.chooseEventOption(state, 'safe'));
  state = choose(state, 'safe');
  assert.equal(state.hero.condition.lastFullMoon, 14);
  assert.ok(state.hero.condition.control > control);
  assert.equal(engine.getMoonForecast(state).nextFullMoon, 42);
  assert.equal(state.legal.evidence, 0, 'private refuge does not create official knowledge');
  const duplicate = transition(state, value => engine.chooseEventOption(value, 'safe'));
  assert.equal(duplicate.day, state.day);
  assert.deepEqual(duplicate.hero, state.hero, 'an already resolved moon choice cannot grant control twice');
  assert.equal(engine.validateSave(state), true);
});

test('a lunar choice waits for a pending battle and returns after combat instead of overwriting it', () => {
  let state = moonbound({ seed: 'moon-and-battle' });
  state = activity(state, 'lycan_prepare');
  state = activity(state, 'forest_expedition');
  assert.equal(state.day, 14);
  assert.ok(state.battle);
  assert.equal(state.event, null);
  assert.ok(state.flags.pendingMoonDays.includes(14));
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true);
  const completed = takeBattleAction(state.battle, 'retreat');
  state = transition(state, value => engine.resolveBattle(value, completed));
  assert.equal(state.battle, null);
  assert.equal(state.event.id, 'lycan_fullmoon');
  state = choose(state, 'safe');
  assert.equal(state.hero.condition.lastFullMoon, 14);
  assert.equal(state.legal.evidence, 0);
});

test('lycanthropy stays exclusive, disclosures target one person, and a cure preserves the existing life', () => {
  let state = moonbound({ seed: 'moonbound-secret' });
  assert.ok(state.life.people.every(person => !person.knownFacts.includes('lycanthrope')));
  state = activity(state, 'lycan_confide');
  const option = state.event.choices.find(item => item.id.startsWith('person_'));
  assert.ok(option, 'an established contact must be available for a voluntary confidence');
  const toldId = option.id.slice('person_'.length);
  const beforePeople = structuredClone(state.life.people);
  state = choose(state, option.id);
  for (const person of state.life.people) {
    if (person.id === toldId) assert.ok(person.knownFacts.includes('lycanthrope'));
    else assert.deepEqual(person.knownFacts, beforePeople.find(item => item.id === person.id).knownFacts, 'untold contacts cannot learn by proximity to another contact');
  }
  assert.equal(state.legal.evidence, 0);
  state = activity(state, 'lycan_prepare');
  for (let count = 0; count < 3; count += 1) {
    state = activity(state, 'gather_herbs');
    if (state.event?.id === 'lycan_fullmoon') state = choose(state, state.event.choices.some(item => item.id === 'safe') ? 'safe' : 'isolate');
  }
  state = move(state, 'city');
  assert.equal(engine.getActions(state).some(item => item.id === 'vampire_invitation'), false);
  const rejected = transition(state, value => engine.chooseAction(value, 'vampire_invitation'));
  assert.deepEqual(rejected.hero.condition, state.hero.condition);
  assert.equal(rejected.day, state.day);
  const skills = structuredClone(state.hero.skills);
  const profession = state.hero.profession;
  const herbs = state.flags.herbs;
  const gold = state.hero.gold;
  state = activity(state, 'lycan_cure');
  assert.equal(state.hero.condition, null);
  assert.equal(state.hero.profession, profession);
  assert.deepEqual(state.hero.skills, skills);
  assert.equal(state.flags.herbs, herbs - 3);
  assert.equal(state.hero.gold, gold - 25);
  assert.deepEqual(state.flags.pendingMoonDays, []);
  assert.equal(engine.validateSave(state), true);
});

test('purchased equipment changes the next encounter without stacking bonuses into base stats', () => {
  let state = adult({ household: 'tradesfolk', seed: 'gear-purchase' });
  const gold = state.hero.gold;
  const item = GEAR_CATALOG.find(piece => piece.id === 'ash_staff');
  state = activity(state, 'gear_buy_ash_staff');
  assert.equal(state.hero.gold, gold - item.price, 'engine and gear module must charge a purchase once');
  assert.equal(state.equipment.owned.filter(id => id === item.id).length, 1);
  const baseHero = structuredClone(state.hero);
  state = transition(state, value => engine.equipGear(value, item.id));
  assert.deepEqual(state.hero, baseHero);
  assert.equal(gearBonuses(state).magic, item.bonuses.magic);
  const unarmed = transition(state, value => engine.equipGear(value, 'unequip_weapon'));
  const reequipped = transition(unarmed, value => engine.equipGear(value, item.id));
  assert.deepEqual(reequipped.hero, baseHero);
  assert.deepEqual(gearBonuses(reequipped), gearBonuses(state), 'equip cycles cannot accumulate a temporary bonus');

  const ordinaryBattle = createBattle(unarmed, 'initiation');
  const equippedBattle = createBattle(reequipped, 'initiation');
  assert.deepEqual(equippedBattle.actors.find(actor => actor.id === 'hero').gear, gearBonuses(reequipped));
  const targetId = ordinaryBattle.actors.filter(actor => actor.side === 'enemy' && actor.hp > 0)
    .sort((a, b) => b.hp - a.hp)[0].id;
  const damage = battle => {
    const beforeHp = battle.actors.find(actor => actor.id === targetId).hp;
    const after = takeBattleAction(battle, 'skill', targetId);
    return beforeHp - after.actors.find(actor => actor.id === targetId).hp;
  };
  assert.ok(damage(equippedBattle) > damage(ordinaryBattle), 'equipped spell power must change actual combat damage');
  assert.deepEqual(reequipped.hero, baseHero, 'creating or acting in a battle cannot change life base stats');
  const pending = activity(move(reequipped, 'forest'), 'forest_expedition');
  const blocked = transition(pending, value => engine.equipGear(value, 'unequip_weapon'));
  assert.deepEqual(blocked.equipment, pending.equipment, 'equipment cannot change in a pending encounter');
  assert.deepEqual(blocked.battle, pending.battle);
  assert.equal(blocked.day, pending.day);
  assert.equal(engine.validateSave(reequipped), true);
});

test('crafting consumes advertised gold, time, and materials once and cannot duplicate owned gear', () => {
  let state = adult({ seed: 'gear-crafting' });
  state = move(state, 'forest');
  state = activity(state, 'gear_gather_ore');
  state = activity(state, 'gear_gather_ore');
  state = move(state, 'home');
  const item = GEAR_CATALOG.find(piece => piece.id === 'iron_sword');
  const gold = state.hero.gold;
  const materials = structuredClone(state.equipment.materials);
  state = activity(state, 'gear_craft_iron_sword');
  assert.equal(state.hero.gold, gold - item.recipe.gold);
  assert.equal(state.equipment.materials.ore, materials.ore - item.recipe.ore);
  assert.equal(state.equipment.materials.cloth, materials.cloth - item.recipe.cloth);
  assert.equal(state.equipment.owned.filter(id => id === item.id).length, 1);
  state = acknowledge(state);
  const duplicate = transition(state, value => engine.chooseAction(value, 'gear_craft_iron_sword'));
  assert.equal(duplicate.day, state.day);
  assert.equal(duplicate.hero.gold, state.hero.gold);
  assert.deepEqual(duplicate.equipment, state.equipment);
  assert.equal(engine.validateSave(state), true);
});

test('a planned year matches its forecast, pauses for decisions, resumes identically, and settles once', () => {
  const start = adult({ seed: 'year-ledger' });
  const config = { focus: 'livelihood', lifestyle: 'frugal' };
  const preview = yearPreview(start, config);
  assert.equal(preview.days, 365);
  let state = transition(start, value => engine.planYear(value, config));
  assert.ok(state.event && state.life.plan);
  assert.ok(state.day > start.day && state.day < state.life.plan.targetDay);
  const blocked = transition(state, value => engine.continueYear(value));
  assert.equal(blocked.day, state.day);
  assert.equal(blocked.hero.gold, state.hero.gold);
  assert.deepEqual(blocked.life.plan, state.life.plan);
  assert.deepEqual(blocked.event, state.event, 'a pending choice cannot reroll its story');
  const saved = JSON.parse(JSON.stringify(state));
  const originalJourney = finishYear(state);
  const restoredJourney = finishYear(engine.migrateSave(saved));
  assert.deepEqual(restoredJourney, originalJourney, 'a saved annual decision must resume with identical results');
  state = originalJourney.state;
  assert.equal(state.day, 365);
  assert.equal(state.age, 19);
  assert.equal(state.life.plan, null);
  assert.equal(state.life.yearHistory.length, 1);
  const row = state.life.yearHistory[0];
  assert.equal(row.income, preview.income);
  assert.equal(row.expenses, preview.expenses);
  assert.equal(state.hero.gold, start.hero.gold + row.income - row.expenses);
  assert.equal(row.day, state.day);
  assert.ok(new Set(originalJourney.events.filter(event => event.id.startsWith('life_')).map(event => event.id)).size >= 3, 'the year needs varied relevant decisions');
  const duplicate = transition(state, value => engine.continueYear(value));
  assert.equal(duplicate.day, state.day);
  assert.equal(duplicate.hero.gold, state.hero.gold);
  assert.deepEqual(duplicate.life.yearHistory, state.life.yearHistory);
});

test('consecutive priorities develop different skills while earning career and housing progress', () => {
  let state = adult({ seed: 'work-and-scholarship' });
  state = finishYear(engine.planYear(state, { focus: 'livelihood', lifestyle: 'frugal' })).state;
  assert.ok(state.life.career.experience >= 20);
  const previewBefore = yearPreview(state, { focus: 'livelihood', lifestyle: 'frugal' });
  state = activity(state, 'life_promotion');
  assert.equal(state.life.career.rank, 1);
  const promotedPreview = yearPreview(state, { focus: 'livelihood', lifestyle: 'frugal' });
  assert.ok(promotedPreview.income > previewBefore.income, 'recognized civilian work must improve future earnings');
  state = activity(state, 'life_goal_settle');
  const gold = state.hero.gold, luck = state.fortune.history.length;
  const purchase = engine.getActions(state).find(item => item.id === 'life_home_cottage');
  state = activity(state, purchase.id);
  // One rulebook (v0.72.2): a season's luck can land on the same day; the cottage itself costs its price once.
  const shocks = state.fortune.history.slice(luck).reduce((n, row) => n + row.gold, 0);
  assert.equal(state.hero.gold, gold - purchase.cost - shocks);
  assert.equal(state.life.home.tier, 'cottage');
  assert.equal(state.life.goals.find(goal => goal.id === 'settle').completed, true);
  assert.equal(state.life.achievements.filter(item => item.id === 'goal-settle').length, 1);
  const scholarship = state.hero.skills.scholarship;
  const secondPreview = yearPreview(state, { focus: 'education', lifestyle: 'frugal' });
  state = finishYear(engine.planYear(state, { focus: 'education', lifestyle: 'frugal' })).state;
  assert.equal(state.day, 730);
  assert.equal(state.age, 20);
  assert.equal(state.life.yearHistory.length, 2);
  assert.deepEqual(state.life.yearHistory.map(row => row.focus), ['livelihood', 'education']);
  assert.ok(state.hero.skills.scholarship > scholarship);
  assert.ok(secondPreview.expenses > 120 * secondPreview.days / 365, 'school and a lasting home must have visible upkeep');
  assert.equal(state.life.achievements.filter(item => item.id === 'goal-settle').length, 1, 'later years cannot repeat a completed ambition reward');
  assert.equal(engine.validateSave(state), true);
});

test('an annual plan stops before a known promise so the player can fulfill it through ordinary life', () => {
  let state = adult({ seed: 'year-with-promise' }, 'scholarship');
  const promise = state.obligations.find(item => item.id === 'scholarship_service');
  assert.ok(yearPreview(state, { focus: 'livelihood', lifestyle: 'frugal' }).warnings.some(message => message.includes(promise.title)));
  state = transition(state, value => engine.planYear(value, { focus: 'livelihood', lifestyle: 'frugal' }));
  assert.equal(state.event.id, 'annual_deadline_review');
  assert.ok(state.day < promise.dueDay, 'the warning must leave time to act');
  assert.ok(state.event.body.includes(promise.title));
  state = choose(state, 'pause');
  state = activity(state, 'help_clinic');
  assert.equal(state.obligations.find(item => item.id === promise.id).resolved, true);
  assert.notEqual(state.flags.scholarshipMissed, true);
  state = finishYear(state).state;
  assert.equal(state.day, 365);
  assert.equal(state.life.yearHistory.length, 1);
  assert.notEqual(state.flags.scholarshipMissed, true);
});

test('a named friendship can become a consensual household with a child who grows on the calendar', () => {
  let state = adult({ seed: 'a-shared-hearth', household: 'noble', path: 'rogue' });
  assert.equal(engine.getActions(state).some(item => item.id === 'life_court_kin'), false, 'a relative cannot be offered as a romantic target');
  state = activity(state, 'life_goal_household');
  state = activity(state, 'work');
  state = activity(state, 'life_home_cottage');
  const contacts = structuredClone(state.life.people);
  state = activity(state, 'life_visit_river');
  for (const person of state.life.people) {
    if (person.id === 'river') assert.ok(person.memories.length > contacts.find(item => item.id === person.id).memories.length);
    else assert.deepEqual(person.memories, contacts.find(item => item.id === person.id).memories, 'private time with one person cannot become every contact’s memory');
  }
  state = activity(state, 'life_visit_river');
  state = activity(state, 'life_visit_river');
  state = activity(state, 'life_court_river');
  assert.equal(state.life.courtshipId, null, 'asking must leave room for an explicit answer');
  state = choose(state, 'yes');
  assert.equal(state.life.courtshipId, 'river');
  state = activity(state, 'life_visit_river');
  state = activity(state, 'life_commit_river');
  state = choose(state, 'pledge');
  assert.equal(state.life.partnerId, 'river');
  assert.equal(state.life.goals.find(goal => goal.id === 'household').completed, true);
  assert.equal(state.life.achievements.filter(item => item.id === 'goal-household').length, 1);
  const otherCourtship = engine.getActions(state).find(item => item.id === 'life_court_fellow');
  assert.ok(otherCourtship.disabledReason);
  const rejected = transition(state, value => engine.chooseAction(value, otherCourtship.id));
  assert.equal(rejected.day, state.day);
  assert.equal(rejected.life.partnerId, 'river');
  state = activity(state, 'work');
  const gold = state.hero.gold;
  state = activity(state, 'life_family');
  assert.equal(state.hero.gold, gold - 30);
  assert.equal(state.life.children.length, 0, 'the consultation is distinct from choosing parenthood');
  state = choose(state, 'welcome');
  assert.equal(state.life.children.length, 1);
  const child = state.life.children[0];
  assert.equal(child.bornDay, state.day);
  assert.equal(child.age, 0);
  assert.ok(state.life.people.find(person => person.id === 'river').memories.some(memory => memory.includes(child.name)));
  state = finishYear(engine.planYear(state, { focus: 'relationships', lifestyle: 'frugal' })).state;
  assert.equal(state.life.children[0].age, Math.floor((state.day - child.bornDay) / 365));
  state = finishYear(engine.planYear(state, { focus: 'relationships', lifestyle: 'frugal' })).state;
  assert.equal(state.life.children[0].age, 1);
  assert.equal(state.life.people.find(person => person.id === 'river').age, 24);
  assert.equal(state.life.partnerId, 'river');
  assert.equal(state.life.achievements.filter(item => item.id === 'goal-household').length, 1);
  assert.equal(engine.validateSave(state), true);
});

test('poverty leaves free recovery and an unaffordable annual lifestyle prompts a viable adjustment', () => {
  let state = adult({ seed: 'a-life-without-savings' });
  state.hero.gold = 0;
  state.hero.hp = 1;
  state.life.health = 10;
  state.life.stress = 98;
  assert.equal(engine.validateSave(state), true);
  state = activity(state, 'life_rest');
  assert.equal(state.hero.gold, 0);
  assert.ok(state.hero.hp > 1 && state.life.health > 10 && state.life.stress < 98);
  const config = { focus: 'rest', lifestyle: 'generous' };
  assert.ok(yearPreview(state, config).warnings.some(message => message.includes('do not cover')));
  const before = state;
  state = transition(state, value => engine.planYear(value, config));
  assert.equal(state.event.id, 'life_budget');
  assert.equal(state.day, before.day, 'an unfunded period must wait before spending time');
  assert.equal(state.hero.gold, 0);
  state = choose(state, 'simplify');
  assert.equal(state.life.plan.focus, 'livelihood');
  assert.equal(state.life.plan.lifestyle, 'frugal');
  state = finishYear(state).state;
  assert.equal(state.day, 365);
  assert.ok(state.hero.gold >= 0 && state.hero.hp >= 1);
  assert.equal(state.life.yearHistory.length, 1);
});

test('annual planning respects legacy decision and combat barriers and cannot replace an active plan', () => {
  for (const source of [legacy.childhood, legacy.battle]) {
    const state = engine.migrateSave(source);
    for (const operation of [value => engine.planYear(value, { focus: 'adventure', lifestyle: 'frugal' }), value => engine.continueYear(value)]) {
      const blocked = transition(state, operation);
      assert.equal(blocked.day, state.day);
      assert.equal(blocked.hero.gold, state.hero.gold);
      assert.deepEqual(blocked.event, state.event);
      assert.deepEqual(blocked.battle, state.battle);
      assert.deepEqual(blocked.life.plan, state.life.plan);
    }
  }
  let state = engine.planYear(adult({ seed: 'one-plan' }), { focus: 'education', lifestyle: 'frugal' });
  while (state.event) state = choose(state, yearChoices[state.event.id]);
  assert.ok(state.life.plan);
  const replacement = transition(state, value => engine.planYear(value, { focus: 'adventure', lifestyle: 'generous' }));
  assert.equal(replacement.day, state.day);
  assert.equal(replacement.hero.gold, state.hero.gold);
  assert.deepEqual(replacement.life.plan, state.life.plan);
});
