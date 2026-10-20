import {atService} from './helpers/service-visit.mjs';
import { knownCurseMeeting } from './helpers/known-curse-meeting.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { travelPreview } from '../dist/js/world.js';
import { travelPlanPreview } from '../dist/js/travel.js';

function choice(state, pick = 'curiosity') {
  if(state.age<3)pick='continue';
  if(state.event?.id==='health_concern')pick=state.health?.pending?.kind==='physical'&&state.age>=3&&state.event.choices.some(c=>c.id==='rest')?'rest':'continue';
  assert.ok(state.event?.choices.some(c => c.id === pick));
  const before = structuredClone(state);
  const next = engine.chooseEventOption(state, pick);
  assert.deepEqual(state, before);
  assert.equal(engine.validateSave(next), true, `${next.age}: ${next.event?.id || next.notice}`);
  return next;
}
function grow(seed, age = 18) {
  // A common birth: poor, but not the thin house whose winters take small children.
  let state = engine.createBirthGame({ seed, household: 'poor', station: rollBirthCircumstances(seed, 'common', 'human') });
  for (let guard = 0; state.age < age || state.event; guard++) {
    assert.ok(guard < 4000 && state.phase !== 'retired', `the fixture life must reach ${age} (age ${state.age}, ${state.health?.deathCause || state.notice})`);
    if (state.event) state = choice(state,state.event.id==='lineage_bereavement'?'private':state.event.id==='hard_winter'?'endure':state.event.id.startsWith('birth_')?'curiosity':'continue');
    else {
      const before = state.age;
      state = state.timeline.yearTarget!==null?engine.continueAgeUp(state):engine.ageUp(state);
      assert.ok(state.age===before || state.age===before+1,'A health need may pause before the birthday.');
      if(state.event?.id.startsWith('birth_'))assert.equal(state.day,state.age*365);
      assert.equal(engine.validateSave(state), true);
    }
  }
  return state;
}

test('actual caregivers shape infancy and unenrolled children keep reading without automatic academy admission', () => {
  for (const familySetup of ['two_parents', 'single_parent', 'orphan', 'homeless']) {
    let state = engine.createBirthGame({ seed: 'family-boundaries', familySetup, household: 'noble',birthplace:'village' });
    const kin = state.life.people.find(p => p.id === 'kin');
    assert.ok(state.event.body.includes(kin.name));
    assert.equal(kin.familyRole, ['orphan', 'homeless'].includes(familySetup) ? 'guardian' : 'parent');
    assert.equal(state.life.home.tier, 'lodgings');
    if (familySetup === 'homeless') assert.equal(state.hero.household, 'poor');
    for(let step=0;step<100&&(state.age<12||state.event||state.timeline.yearTarget!==null);step++)state=state.event?choice(state,state.event.id==='lineage_bereavement'?'private':'care'):state.timeline.yearTarget!==null?engine.continueAgeUp(state):engine.ageUp(state);
    assert.equal(state.age,12);assert.equal(state.event,null);assert.equal(state.timeline.yearTarget,null);
    assert.equal(state.education.enrolled, false);
    assert.equal(state.education.scholarship, false);
    assert.equal(state.flags.scholarship, false);
    assert.equal(state.flags.apprenticeship, false);
    const actions = engine.getActions(state);
    assert.match(actions.find(a => a.id === 'grow_school').disabledReason, /Enroll|School|Tutor/);
    assert.ok(!actions.some(a=>a.id==='grow_read'));assert.equal(actions.find(a=>a.id==='leisure_read').disabledReason,undefined);
    const before = state.hero.skills.scholarship;
    state = engine.chooseAction(state, 'leisure_read');
    assert.equal(state.hero.skills.scholarship, before + 1);
    assert.equal(state.education.attendance, 0);
    assert.equal(state.education.qualifications.length, 0);
    assert.equal(engine.validateSave(state), true);
  }
});

test('a committed project pauses at its actual birthday, remains saveable, and finishes once after the choice', () => {
  let state = grow('birthday-project', 16);
  for (const id of ['workshop_gather_wood', 'workshop_gather_cloth', 'workshop_gather_stone', 'workshop_gather_wood', 'work']) {
    state=atService(state,id);
    const descriptor = engine.getActions(state).find(a => a.id === id);
    assert.equal(descriptor?.disabledReason, undefined, id);
    state = engine.chooseAction(state, id);
    assert.equal(engine.validateSave(state), true);
  }
  for(let n=0;state.day<17*365-1&&n<500;n++){
    if(state.event){state=choice(state,state.event.id==='lineage_bereavement'?'private':'continue');continue;}
    const day=state.day,remaining=17*365-1-day,id=remaining>=3&&engine.getActions(state).some(a=>a.id==='health_rest'&&!a.disabledReason)?'health_rest':'leisure_read';state=engine.chooseAction(state,id);assert.ok(state.day>day,state.notice);
  }
  assert.equal(state.day,17*365-1);
  const gold = state.hero.gold;
  const history = state.preferenceHistory.memories.length;
  const original = structuredClone(state);
  state=atService(state,'workshop_build_shelter');
  state = engine.chooseAction(state, 'workshop_build_shelter');
  assert.deepEqual(original.workshop.structures, []);
  assert.equal(state.age, 17);
  assert.equal(state.day, 17 * 365);
  assert.equal(state.event.id, 'birth_year_17');
  assert.equal(state.workshop.project.remainingDays, 2);
  assert.equal(state.workshop.structures.length, 0);
  assert.equal(state.preferenceHistory.memories.length, history);
  assert.equal(state.hero.gold, gold - 6);
  assert.equal(engine.validateSave(JSON.parse(JSON.stringify(state))), true);
  state = choice(state);
  const blockedAge = engine.ageUp(state);
  const blockedTravel = engine.travelTo(state, 'city');
  assert.equal(blockedAge.day, state.day);
  assert.equal(blockedTravel.day, state.day);
  assert.match(blockedAge.notice, /project/);
  assert.match(blockedTravel.notice, /project/);
  const saved = JSON.parse(JSON.stringify(state));
  const finished = engine.chooseAction(saved, 'workshop_continue');
  assert.equal(finished.day, saved.day + 2);
  assert.equal(finished.workshop.project, null);
  assert.equal(finished.workshop.structures.length, 1);
  assert.equal(finished.equipment.materials.wood, 0);
  assert.equal(finished.hero.gold, saved.hero.gold);
  assert.equal(engine.validateSave(finished), true);
  const repeated = engine.chooseAction(finished, 'workshop_continue');
  assert.deepEqual(repeated.workshop, finished.workshop);
  assert.equal(repeated.day, finished.day);
});

test('seeded ordinary childhood changes the actual situation, choices, skills and remembered facts', () => {
  const situations = new Map();
  for (let seed = 0; seed < 16; seed++) {
    let state = grow(`growing-${seed}`, 2);
    state = engine.ageUp(state);
    const title = state.event.title;
    const before = structuredClone(state.hero.skills);
    state = choice(state, 'curiosity');
    const gains = Object.keys(before).filter(k => state.hero.skills[k] > before[k]);
    situations.set(title, { gains, fact: state.timeline.childhoodFacts.year_3 });
  }
  assert.ok(situations.size >= 3, 'different seeds need different situations rather than only a flavor sentence');
  assert.ok(new Set([...situations.values()].map(v => JSON.stringify(v.gains))).size >= 3);
  assert.ok(new Set([...situations.values()].map(v => v.fact)).size >= 3);
});

test('adult birthdays offer new civilian dilemmas and settle a real remembered consequence exactly once', () => {
  let state = grow('adult-calendar');
  const titles = new Set();
  for (let year = 19; year < 26; year++) {
    const oldHistory = state.timeline.yearHistory.length;
    state = engine.ageUp(state);
    for(let n=0;n<80&&state.event?.id!=='birth_adult_year';n++){
      if(state.event){const pick=['continue','private','later'].map(id=>state.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||state.event.choices.find(c=>!c.disabledReason);state=choice(state,pick.id);}
      else state=engine.continueAgeUp(state);
    }
    assert.equal(state.age, year);
    assert.equal(state.event.id, 'birth_adult_year');
    assert.notEqual(state.event.title, 'A life you choose for yourself');
    titles.add(state.event.title);
    const pending = structuredClone(state);
    const blocked = engine.continueAgeUp(state);
    assert.equal(blocked.day, state.day);
    assert.deepEqual(blocked.event, pending.event);
    state = choice(state, 'care');
    assert.equal(state.timeline.yearHistory.length, oldHistory + 1);
    assert.equal(state.timeline.yearTarget, null);
    const duplicate = engine.chooseEventOption(state, 'care');
    assert.deepEqual(duplicate.timeline.yearHistory, state.timeline.yearHistory);
    assert.deepEqual(duplicate.hero, state.hero);
  }
  assert.ok(titles.size >= 3);
  assert.equal(state.hero.path, 'unformed', 'a civilian remains unformed across adult years');
});

test('birth Age up pauses before a known promise and never skips its visible decision', () => {
  let state = grow('birthday-promise');
  state.obligations.push({ id: 'test_promise', title: 'Bring notes home', dueDay: state.day + 12, description: 'The notes are expected soon.', resolved: false });
  const before = structuredClone(state);
  state = engine.ageUp(state);
  assert.deepEqual(before.age, 18);
  assert.equal(state.day, before.day + 9);
  assert.equal(state.event.id, 'annual_deadline_review');
  assert.equal(state.obligations[0].resolved, false);
  const frozen = engine.continueAgeUp(state);
  assert.equal(frozen.day, state.day);
  state = choice(state, 'continue');
  state = engine.continueAgeUp(state);
  // The year may still pause for the body (a fever, a wound); each pause is a
  // decision the player answers, never one the clock skips.
  for (let guard = 0; guard < 12 && state.age === 18; guard++) {
    assert.equal(state.event?.id, 'health_concern', `an unexpected pause: ${state.event?.id || state.notice}`);
    state = choice(state, 'continue');
    if (!state.event) state = engine.continueAgeUp(state);
  }
  assert.equal(state.age, 19);
  assert.equal(state.obligations[0].missed, true);
  assert.equal(state.event.id, 'birth_adult_year');
});

function completeRoad(state) {
  for(let n=0;n<60 && (state.timeline.journey || state.event?.id.startsWith('travel_'));n++) {
    if(state.event?.id.startsWith('travel_')) {
      const id=['continue','avoid','press','share','listen','record'].find(id=>state.event.choices.some(c=>c.id===id));
      assert.ok(id,`A civilian road response must exist for ${state.event.id}`);state=choice(state,id);
    } else if(state.event?.id==='lycan_fullmoon'){const held=engine.continueJourney(state);assert.equal(held.day,state.day);assert.equal(held.locationId,state.locationId);assert.deepEqual(held.timeline.journey,state.timeline.journey);state=choice(state,'isolate');}
    else if(state.event?.id==='health_concern')state=choice(state,'continue');
    else if(!state.event){const next=engine.continueJourney(state),progress=JSON.stringify([next.locationId,next.timeline.journey,next.travel?.pending,next.event])!==JSON.stringify([state.locationId,state.timeline.journey,state.travel?.pending,state.event]);/* Arrival after an already paid leg can change progress without another day. */if(next.day===state.day&&!progress&&next.timeline.journey){const camp=engine.getActions(state).find(a=>a.id==='trail_camp'&&!a.disabledReason);assert.ok(camp,state.notice);state=engine.chooseAction(state,camp.id);}else state=next;}
    else break;
  }
  return state;
}

test('actual road travel stops at a full moon without teleporting across the unfinished leg', () => {
  let state = grow('moon-road');delete state.trail; // Isolate the saved planned-leg/full-moon contract; travel-energy behavior has its own current-path suite.
  state = completeRoad(engine.travelTo(state, 'forest'));
  assert.equal(state.locationId,'forest');
  state = engine.chooseAction(knownCurseMeeting(state,'lycan_invitation'), 'lycan_invitation');
  state = choice(state, 'accept');
  const forecast = engine.getMoonForecast(state);
  // Use the legacy recovery action, then one actual day sketching outdoors.
  while (state.day < forecast.nextFullMoon - 2) {
    if(state.event?.id==='health_concern'){state=choice(state,'continue');continue;}
    const next = engine.chooseAction(state, 'camp_rest');
    if (next.day === state.day) break;
    state = next;
  }
  for(let n=0;n<3&&state.day<forecast.nextFullMoon-1;n++){const before=state.day;state=engine.chooseAction(state,'leisure_sketch');assert.ok(state.day>before,state.notice);}
  assert.equal(state.day, forecast.nextFullMoon - 1);
  state=engine.updateTravelPlan(state,{pace:'cautious'});
  const preview = travelPlanPreview(state, 'citadel');
  assert.ok(preview.legs[0].totalDays>1,'the moon arrives partway through the first planned leg');
  const origin = state.locationId;
  state = engine.travelTo(state, 'citadel');
  assert.equal(state.day, forecast.nextFullMoon);
  assert.equal(state.event.id, 'lycan_fullmoon');
  assert.equal(state.locationId, origin);
  assert.ok(state.timeline.journey);
  assert.equal(state.timeline.journey.legProgress, 1);
  assert.equal(engine.validateSave(state), true);
  const frozen = engine.continueJourney(state);
  assert.equal(frozen.day, state.day);
  state = choice(state, 'isolate');
  state = completeRoad(state);
  assert.equal(state.locationId,'citadel',JSON.stringify({notice:state.notice,event:state.event?.id,journey:state.timeline.journey,day:state.day,energy:state.trail}));
  assert.equal(state.timeline.journey, null);
  assert.equal(engine.validateSave(state), true);
});
