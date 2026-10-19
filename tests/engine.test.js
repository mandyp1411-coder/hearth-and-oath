import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, chooseEventOption, getActions, chooseAction, travelTo, recruitCompanion, toggleCompanion, resolveBattle, validateSave, planYear, getMoonForecast } from '../dist/js/engine.js';
import { seededRoll } from '../dist/js/world.js';
import { takeBattleAction } from '../dist/js/combat.js';

function adult(config = {}, school = 'apprentice') {
  let state = createGame({ seed: 'engine-life', ...config });
  for (const id of ['investigate', school, 'confess']) state = chooseEventOption(state, id);
  return state;
}
function dismiss(state) {
  while (state.event && ['plague_letter', 'orrin_request'].includes(state.event.id)) state = chooseEventOption(state, state.event.choices[0].id);
  return state;
}
function activity(state, id) { return dismiss(chooseAction(dismiss(state), id)); }

test('creation sanitizes optional configuration and returns a structurally useful childhood', () => {
  const state = createGame({ path: 'unreal', household: 'unknown', appearance: null, name: '   ', seed: 'deterministic' });
  assert.equal(state.hero.path, 'warrior');
  assert.equal(state.hero.household, 'tradesfolk');
  assert.equal(state.hero.name, 'Rowan');
  assert.equal(state.event.id, 'childhood_1');
  assert.equal(validateSave(state), true);
  assert.deepEqual(createGame({ path: 'unreal', household: 'unknown', appearance: null, name: '   ', seed: 'deterministic' }), state);
});

test('poverty never closes recovery, education funding, or earned class training', () => {
  let state = adult({ household: 'poor', path: 'mage' }, 'scholarship');
  state.hero.gold = 0; state.hero.hp = 1; state.hero.mp = 0;
  const blocked = chooseAction(state, 'study');
  assert.equal(blocked.day, state.day);
  assert.equal(blocked.hero.gold, 0);
  assert.match(blocked.notice, /gold/);
  state = activity(state, 'camp_rest');
  assert.ok(state.hero.hp > 1 && state.hero.mp > 0);
  state = activity(state, 'work');
  assert.ok(state.hero.gold >= 12);
  state = activity(state, 'study');
  assert.ok(state.hero.skills.scholarship > 2);
  assert.equal(validateSave(state), true);
});

test('city and village upbringings retain their own family homes', () => {
  for (const origin of ['city', 'village']) {
    let state = adult({ origin });
    assert.ok(getActions(state).some(item => item.id === 'visit_family'));
    state = travelTo(state, origin === 'city' ? 'home' : 'city');
    assert.equal(getActions(state).some(item => item.id === 'visit_family'), false);
  }
});

test('a years-long civilian life advances the hero and companions on the same honest calendar', () => {
  let state = adult();
  while (state.day < 365) state = activity(state, 'work');
  assert.equal(state.age, 19);
  assert.equal(state.companions.find(person => person.id === 'mira').age, 19);
  assert.equal(state.companions.find(person => person.id === 'orrin').age, 23);
  assert.equal(validateSave(state), true);
});

test('unknown inputs and party changes return independent saves without moving the calendar', () => {
  const state = adult();
  for (const operation of [
    value => chooseAction(value, 'missing'), value => chooseEventOption(value, 'missing'),
    value => travelTo(value, 'missing'), value => recruitCompanion(value, 'missing'),
    value => toggleCompanion(value, 'missing'), value => resolveBattle(value, null),
  ]) {
    const next = operation(state);
    assert.notEqual(next, state); assert.notEqual(next.hero, state.hero);
    assert.notEqual(next.world, state.world); assert.notEqual(next.journal, state.journal);
    assert.equal(next.day, state.day); assert.equal(next.hero.gold, state.hero.gold);
    next.world.locations[0].name = 'changed';
    assert.notEqual(state.world.locations[0].name, 'changed');
  }
});

test('a twilight assault leaves local evidence and restitution is possible outside the city', () => {
  let state = adult({ origin: 'city' });
  for (let index = 0; index < 4; index++) state = activity(state, 'work');
  state = chooseEventOption(chooseAction(knownCurseMeeting(state,'vampire_invitation'), 'vampire_invitation'), 'accept');
  state = travelTo(state, 'home');
  state = chooseEventOption(chooseAction(state, 'feed_vampire'), 'predation');
  assert.equal(state.legal.evidence, 3);
  assert.equal(state.legal.wanted, true);
  assert.ok(getActions(state).some(item => item.id === 'settle_fine'));
  const charged = structuredClone(state);
  state = travelTo(state, 'city');
  assert.equal(state.legal.evidence, 0);
  assert.equal(state.legal.wanted, false);
  state = travelTo(state, 'home');
  assert.equal(state.legal.evidence, 3);
  const before = state.hero.gold;
  state = activity(state, 'settle_fine');
  assert.equal(before - state.hero.gold, 36);
  assert.equal(state.legal.incidents.length, 0);
  assert.equal(charged.legal.evidence, 3);
});

test('a forged reward amount cannot inflate combat earnings', () => {
  let state = adult();
  state = travelTo(state, 'forest');
  state = activity(state, 'forest_expedition');
  let result = state.battle;
  result = takeBattleAction(result, 'retreat');
  result.rewards.gold = 999999;
  const before = state.hero.gold;
  const next = resolveBattle(state, result);
  assert.equal(next.hero.gold, before);
  assert.equal(next.battle?.instanceId, state.battle.instanceId, 'structurally invalid combat results are refused');
});

test('authored event and activity graph stays saveable through varied connected lives', () => {
  for (const path of ['warrior', 'mage', 'rogue']) {
    for (let run = 0; run < 3; run++) {
      let state = adult({ path, seed: `graph-${path}-${run}`, household: ['poor', 'tradesfolk', 'noble'][run] });
      for (let step = 0; step < 100 && state.phase === 'adult'; step++) {
        if (state.event) {
          const choices = state.event.choices;
          state = chooseEventOption(state, choices[seededRoll(state.seed, `choice-${step}`, choices.length)].id);
        } else if (state.battle) {
          const completed = takeBattleAction(state.battle, 'retreat');
          state = resolveBattle(state, completed);
        } else if (step % 11 === 0) {
          state = travelTo(state, ['city', 'forest', 'ruin', 'home', 'brook'][seededRoll(state.seed, `road-${step}`, 5)]);
        } else {
          const actions = getActions(state).filter(item => !item.disabledReason);
          assert.ok(actions.length > 0, 'every living adult has a useful choice');
          state = chooseAction(state, actions[seededRoll(state.seed, `action-${step}`, actions.length)].id);
        }
        assert.equal(validateSave(JSON.parse(JSON.stringify(state))), true, `${path} run ${run} step ${step}: ${state.event?.id || state.notice}`);
        assert.ok(state.hero.gold >= 0 && state.hero.hp >= 1 && state.hero.hp <= state.hero.maxHp);
      }
    }
  }
});

test('ordinary work and purchases during an annual pause appear once in the year ledger', () => {
  let state = adult({ household: 'tradesfolk' });
  state = planYear(state, { focus: 'livelihood', lifestyle: 'frugal' });
  assert.equal(state.event?.id, 'plague_letter', 'annual activity must introduce the region’s existing crisis');
  state = chooseEventOption(state, 'later');
  const beforeWork = state.life.plan.income;
  const gold = state.hero.gold;
  state = activity(state, 'work');
  assert.equal(state.life.plan.income - beforeWork, state.hero.gold - gold);
  const expenses = state.life.plan.expenses;
  const day = state.day;
  state = activity(state, 'buy_potion');
  assert.equal(state.life.plan.expenses - expenses, 10);
  assert.equal(state.day, day);
  const visit = activity(state, 'visit_family');
  const prior = visit.life.plan.expenses;
  state = chooseEventOption(visit, 'gift');
  assert.equal(state.life.plan.expenses - prior, 10);
  assert.equal(validateSave(state), true);
});

test('unprepared full moons always offer a safe recovery route without informing absent people', () => {
  let state = adult();
  state.hero.condition = { type: 'lycanthrope', control: 0, preparedUntil: 0, lastFullMoon: 0 };
  const companions = structuredClone(state.companions);
  const people = structuredClone(state.life.people);
  state = planYear(state, { focus: 'rest', lifestyle: 'frugal' });
  assert.equal(state.day, 14);
  assert.equal(state.event.id, 'lycan_fullmoon');
  assert.equal(state.event.choices.some(item => item.id === 'safe'), false);
  state = chooseEventOption(state, 'isolate');
  assert.equal(state.hero.condition.lastFullMoon, 14);
  assert.equal(getMoonForecast(state).nextFullMoon, 42);
  assert.deepEqual(state.companions, companions);
  assert.deepEqual(state.life.people.map(person => person.knownFacts), people.map(person => person.knownFacts));
  assert.equal(state.legal.incidents.length, 0);
  assert.equal(validateSave(state), true);
});

test('extended imports reject unsafe lunar dates and malformed pending combat conditions', () => {
  let state = adult();
  state.hero.condition = { type: 'lycanthrope', control: 35, preparedUntil: 1, lastFullMoon: 0 };
  assert.equal(validateSave(state), false);
  state.hero.condition = null;
  state = travelTo(state, 'forest');
  state = activity(state, 'forest_expedition');
  assert.equal(validateSave(state), true);
  const broken = structuredClone(state);
  broken.battle.actors.find(actor => actor.id === 'hero').condition = { type: 'lycanthrope', control: 'unlimited', preparedUntil: 14, lastFullMoon: 0 };
  assert.equal(validateSave(broken), false);
  assert.ok(state.battle.actors.find(actor => actor.id === 'hero').condition === null);
});
