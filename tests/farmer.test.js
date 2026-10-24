import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { seasonOf } from '../dist/js/living-world.js';
import { farmView } from '../dist/js/farmer.js';
import { killNamedPerson } from '../dist/js/lineage.js';

const cache = new Map();
const clone = s => structuredClone(s);
function born(seed = 'farm-proof-common', station = 'common') {
  return engine.createBirthGame({ seed, difficulty: 'gentle', station: rollBirthCircumstances(seed, station, 'human'), appearance: { ancestry: 'human' } });
}
function choice(s) {
  const preferred = { farm_ambition: 'keep', hard_winter: 'endure', debt_reckoning: 'plead', farm_due: 'pay', farm_reckoning: 'pay', farm_harvest: 'store' }[s.event.id];
  const offered = s.event.choices.filter(c => !c.disabledReason);
  return (offered.find(c => c.id === preferred) || offered.find(c => ['continue', 'endure', 'rest', 'care', 'present', 'plead', 'private', 'wait', 'refuse'].includes(c.id)) || offered[0])?.id;
}
function answer(s, id = choice(s)) {
  assert.ok(s.event && s.event.choices.some(c => c.id === id && !c.disabledReason), `${s.event?.id}: ${id} is a lawful answer`);
  const before = clone(s), next = engine.chooseEventOption(s, id);
  assert.deepEqual(s, before, 'a command never mutates the prior save');
  assert.ok(engine.validateSave(next), `${s.event.id}: ${id} leaves a valid save`);
  return next;
}
function settle(s) {
  for (let n = 0; s.event && n < 50 && s.phase !== 'retired'; n++) s = answer(s);
  assert.equal(s.event, null, 'pending scenes have a finite continuation');
  return s;
}
function grow(s, age, { stopAt } = {}) {
  for (let n = 0; n < 1400 && s.phase !== 'retired' && (s.age < age || s.event || s.timeline.yearTarget !== null); n++) {
    if (stopAt && s.event?.id === stopAt) return s;
    s = s.event ? answer(s) : s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.ageUp(s);
  }
  assert.notEqual(s.phase, 'retired', 'the controlled gentle fixture reaches its opening');
  assert.equal(s.age, age);
  assert.equal(s.timeline.yearTarget, null);
  assert.ok(engine.validateSave(s));
  return s;
}
function ready(station = 'common') {
  const key = `ready:${station}`;
  if (!cache.has(key)) cache.set(key, grow(born(`farm-proof-${station}`, station), 16));
  return clone(cache.get(key));
}
function act(s, id) {
  const a = engine.getActions(s).find(a => a.id === id);
  assert.ok(a && !a.disabledReason, `${id} is offered: ${a?.disabledReason || 'absent'}`);
  const before = clone(s), next = engine.chooseAction(s, id);
  assert.deepEqual(s, before);
  assert.ok(engine.validateSave(next), `${id} leaves a valid save`);
  return next;
}
function season(s, { stopAt } = {}) {
  const target = seasonOf(s.day) + 1;
  for (let n = 0; n < 100 && s.phase !== 'retired'; n++) {
    if (stopAt && s.event?.id === stopAt) return s;
    if (s.event) { s = answer(s); continue; }
    if (seasonOf(s.day) >= target && s.timeline.yearTarget === null) return s;
    s = s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.liveSeason(s);
  }
  assert.fail('a season must advance or stop for a real scene');
}
function whenOffered(s, id) {
  for (let n = 0; n < 9; n++) {
    if (engine.getActions(s).some(a => a.id === id && !a.disabledReason)) return s;
    s = season(s);
  }
  assert.fail(`${id} did not become available in two years`);
}
function untilScene(s, id) {
  for (let n = 0; n < 12 && s.event?.id !== id; n++) s = season(s, { stopAt: id });
  assert.equal(s.event?.id, id, `${id} returns through the public season command`);
  return s;
}

test('only new common and bound lives receive land; infancy offers no farmer decisions', () => {
  for (const station of ['common', 'bound', 'trade', 'gentry', 'noble', 'royal']) {
    const s = born(`farm-eligibility-${station}`, station);
    assert.ok(engine.validateSave(s), station);
    assert.equal(Boolean(s.farm), ['common', 'bound'].includes(station), station);
    assert.equal(engine.getActions(s).some(a => a.id.startsWith('farm_')), false, `${station}: infants do not choose a crop`);
    if (!s.farm) continue;
    assert.equal(s.farm.active, false);
    assert.equal(s.farm.ambition, null);
    assert.equal(s.farm.field.crop, null);
    assert.equal(s.farm.tenure, station === 'common' ? 'freeholder' : 'tenant');
  }
});

test('a real pre-farmer new-rules save gains no field, spouse, debt or invented memories on import', () => {
  const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/saves/v0690.json.gz', import.meta.url))));
  for (const raw of Object.values(fixture.states)) {
    const before = clone(raw), next = engine.migrateSave(raw);
    assert.ok(next && engine.validateSave(next));
    assert.deepEqual(raw, before, 'import leaves the exported file alone');
    assert.equal(next.farm, undefined);
    assert.equal(farmView(next), null);
    assert.deepEqual(next.life.people, raw.life.people, 'import invents no earlier neighbour or spouse');
    assert.equal(engine.getActions(next).some(a => a.id.startsWith('farm_')), false);
  }
});

test('at sixteen a farmer chooses a purpose in a scene, and a quiet chapter does not fulfil it', () => {
  let s = grow(born('farm-purpose-scene'), 16, { stopAt: 'farm_ambition' });
  assert.equal(s.age, 16);
  assert.equal(s.event.id, 'farm_ambition');
  assert.ok(s.event.choices.filter(c => !c.disabledReason).length >= 5, 'several different purposes are possible');
  assert.equal(s.farm.ambition, null);
  const day = s.day;
  s = answer(s, 'keep');
  assert.equal(s.farm.ambition.id, 'farm_keep');
  assert.equal(s.farm.ambition.chosenDay, day);
  assert.equal(s.farm.ambition.fulfilledDay, null);
  s = settle(s);
  s = season(s);
  assert.equal(s.farm.ambition.fulfilledDay, null, 'time alone never fulfils an ambition');
});

test('reading the farm, actions and Book is pure, and its complete state survives export and import', () => {
  const s = ready(), before = clone(s);
  for (let n = 0; n < 3; n++) { farmView(s); engine.getActions(s); }
  assert.deepEqual(s, before, 'read models do not introduce people, spend time, or collect grain');
  const exported = JSON.parse(JSON.stringify(s)), restored = engine.migrateSave(exported);
  assert.ok(restored && engine.validateSave(restored));
  assert.deepEqual(restored.farm, s.farm);
  assert.deepEqual(farmView(restored), farmView(s));
});

test('sowing charges the crop fee and three days once; replaying a stale command buys no second crop', () => {
  let s = ready();
  s.hero.gold = 60; // This fixture is about a paid crop, not earning seed money.
  s = whenOffered(s, 'farm_sow');
  const opening = act(s, 'farm_sow');
  assert.equal(opening.event?.id, 'farm_sow');
  const prior = clone(opening), gold = opening.hero.gold, day = opening.day;
  const a = answer(opening, 'barley'), b = answer(prior, 'barley');
  assert.deepEqual(a, b, 'the same commitment and seed produce the same crop');
  assert.equal(a.hero.gold, gold - 3);
  assert.equal(a.day, day + 3);
  assert.equal(a.farm.field.crop.kind, 'barley');
  assert.equal(a.farm.field.crop.sownDay, a.day);
  assert.equal(a.farm.field.crop.harvested, false);
  const replayed = engine.chooseEventOption(a, 'barley');
  assert.equal(replayed.day, a.day);
  assert.equal(replayed.hero.gold, a.hero.gold);
  assert.deepEqual(replayed.farm, a.farm, 'a stale answer is not a second sowing');
  const again = engine.chooseAction(a, 'farm_sow');
  assert.equal(again.day, a.day);
  assert.equal(again.hero.gold, a.hero.gold);
  assert.deepEqual(again.farm.field.crop, a.farm.field.crop);
});

test('an empty purse cannot commit paid seed, and refusing the cost leaves the field unchanged', () => {
  let s = ready();
  s.hero.gold = 0;
  s = whenOffered(s, 'farm_sow');
  s = act(s, 'farm_sow');
  assert.ok(s.event.choices.find(c => c.id === 'barley').disabledReason);
  assert.ok(s.event.choices.find(c => c.id === 'beans').disabledReason);
  const before = clone(s), denied = engine.chooseEventOption(s, 'barley');
  assert.equal(denied.day, before.day);
  assert.equal(denied.hero.gold, before.hero.gold);
  assert.deepEqual(denied.farm, before.farm);
  const left = answer(s, 'continue');
  assert.equal(left.farm.field.crop, null);
  assert.equal(left.hero.gold, 0);
});

test('malformed farm ledgers and forged people cannot enter a save', () => {
  const s = ready();
  const corruptions = [
    ['negative grain', t => { t.farm.field.grain = -1; }],
    ['unbounded land', t => { t.farm.field.strips = 1000000; }],
    ['unknown tenure', t => { t.farm.tenure = 'duke'; }],
    ['future beginning', t => { t.farm.startedDay = t.day + 1; }],
    ['invalid season', t => { t.farm.lastSeason = -1; }],
    ['future purpose', t => { t.farm.ambition.chosenDay = t.day + 1; }],
    ['unknown purpose', t => { t.farm.ambition.id = 'farm_invented'; }],
    ['negative arrears', t => { t.farm.due.arrears = -1; }],
    ['unknown field state', t => { t.farm.field.status = 'mint'; }],
  ];
  for (const [name, corrupt] of corruptions) {
    const t = clone(s); corrupt(t);
    assert.equal(engine.validateSave(t), false, name);
    assert.equal(engine.migrateSave(t), null, `${name} is not repaired into invented history`);
  }
  assert.ok(s.farm.people.neighbour, 'the active farm has a named neighbour');
  const missing = clone(s);
  missing.farm.people.neighbour.source = 'life';
  missing.farm.people.neighbour.id = 'a-person-who-never-existed';
  assert.equal(engine.validateSave(missing), false, 'a remembered actor must refer to a real person');
  const stranger = born('farm-forged-gentry', 'gentry');
  stranger.farm = clone(s.farm);
  assert.equal(engine.validateSave(stranger), false, 'a field cannot be smuggled into an ineligible birth');
});

test('the neighbour has their own want, and a two-exchange talk remembers the player’s costly help', () => {
  const s = ready(), ref = s.farm.people.neighbour;
  assert.ok(ref && ref.want && ref.voice && ref.traits.length >= 2);
  const before = clone(ref), day = s.day;
  let next = act(s, 'farm_talk_neighbour');
  assert.equal(next.event?.id, 'farm_neighbour');
  assert.ok(next.event.body.includes(ref.name), 'the speaker is a particular neighbour');
  next = answer(next, 'help');
  assert.equal(next.event?.id, 'farm_neighbour_reply', 'the neighbour answers rather than ending after one reply');
  next = answer(next, 'accept');
  assert.equal(next.day - day, 5, 'one day talking, three helping and one agreed day are spent once');
  const after = next.farm.people.neighbour;
  assert.equal(after.id, before.id); assert.equal(after.source, before.source);
  assert.ok(after.opinion > before.opinion);
  assert.ok(after.memories.some(m => /ditch|hands/.test(m)), 'their opinion names an actual deed');
  const actor = after.source === 'life' ? next.life.people.find(p => p.id === after.id) : next.society.people.find(p => p.id === after.id);
  assert.ok(actor && actor.name === after.name, 'a read model is not a second simulated person');
  assert.ok(actor.memories.some(m => after.memories.includes(m)));
  assert.equal(engine.getActions(next).some(a => a.id === 'farm_talk_neighbour' && !a.disabledReason), false, 'the same season cannot be used to farm repeated conversations');
});

test('harvest help belongs to the person who agreed, and a dead or absent helper earns no invented work', () => {
  let s = whenOffered(ready(), 'farm_sow'); s.hero.gold = 100;
  s = answer(answer(act(s, 'farm_talk_neighbour'), 'help'), 'accept');
  const agreement = clone(s.farm.helpSeason);
  assert.equal(agreement.person.name, s.farm.people.neighbour.name);
  assert.equal(agreement.agreedDay, s.day);
  assert.equal(agreement.yield, 3);
  s = answer(act(s, 'farm_sow'), 'barley');
  const corrupted = clone(s); corrupted.farm.helpSeason.agreedDay = s.day + 1;
  assert.equal(engine.validateSave(corrupted), false, 'the help cannot have been agreed tomorrow');
  const forged = clone(s); forged.farm.helpSeason.person.name = 'A different neighbour';
  assert.equal(engine.validateSave(forged), false, 'a captured agreement cannot change its speaker');
  function actor(state) {
    return agreement.person.source === 'life' ? state.life.people.find(p => p.id === agreement.person.id)
      : state.society.people.find(p => p.id === agreement.person.id);
  }
  const live = untilScene(settle(engine.chooseAction(clone(s), 'life_rest')), 'farm_harvest');
  const liveThread = live.farm.threads.find(t => t.def === 'harvest' && !t.closed);
  assert.deepEqual(liveThread.data.helper, agreement.person);
  assert.ok(live.farm.history.some(h => h.title === 'The work returned' && h.people.includes(agreement.person.name)));
  for (const condition of ['dead', 'away', 'unagreed']) {
    let other = clone(s), helper = actor(other);
    if (condition === 'dead') assert.equal(killNamedPerson(other, helper.sourcePersonId || helper.id, 'A fever before harvest.', { journal(title, text, tag) { other.journal.push({ id: `farm-helper-death-${other.journal.length}`, day: other.day, age: other.age, generation: other.dynasty.generation, title, text, tag }); } }), true);
    if (condition === 'away') {
      const away = other.world.locations.find(p => p.id !== other.farm.homeId).id;
      helper.locationId = away;
      if (helper.sourcePersonId) other.life.people.find(p => p.id === helper.sourcePersonId).locationId = away;
    }
    if (condition === 'unagreed') other.farm.helpSeason = null;
    other = untilScene(settle(engine.chooseAction(other, 'life_rest')), 'farm_harvest');
    assert.ok(engine.validateSave(other), condition);
    const thread = other.farm.threads.find(t => t.def === 'harvest' && !t.closed);
    assert.equal(thread.data.helper, null, condition);
    assert.equal(liveThread.data.yield - thread.data.yield, 3, `${condition}: the unworked bonus does not pass to another neighbour`);
    assert.equal(other.farm.history.some(h => h.title === 'The work returned'), false, condition);
    other = answer(other, 'store');
    const harvest = other.farm.history.findLast(h => h.kind === 'harvest');
    assert.equal(harvest.text.includes('helped'), false, `${condition}: the Book claims no unworked help`);
    assert.equal(other.farm.helpSeason, null, 'the named harvest ends the agreement');
  }
});

test('a spouse can love the player and disapprove of them, without conflating opinion and bond', () => {
  let s = ready(); s.hero.gold = 500;
  s = grow(s, 18);
  const p = s.life.people.find(p => p.id === 'fellow' && p.alive !== false);
  assert.ok(p && p.age >= 18);
  // An already freely established partnership is the precondition; this test is about its conversation.
  s.life.partnerId = p.id; p.relation = 'partner'; p.bond = 90;
  s = settle(engine.chooseAction(s, 'life_rest'));
  assert.ok(engine.validateSave(s));
  assert.equal(s.farm.people.spouse?.id, p.id);
  const opinion = s.farm.people.spouse.opinion;
  s = act(s, 'farm_talk_spouse');
  assert.equal(s.event?.id, 'farm_spouse');
  s = answer(s, 'dismiss');
  assert.equal(s.event?.id, 'farm_spouse_reply');
  assert.ok(s.farm.people.spouse.opinion < opinion);
  assert.equal(s.life.people.find(a => a.id === p.id).bond, 90, 'love can remain when judgement falls');
  assert.ok(s.farm.people.spouse.memories.some(m => /spoke over/.test(m)));
  assert.equal(s.farm.promises.length, 0, 'a conversation is not silently an oath');
  s = answer(s, 'continue');
  assert.ok(engine.validateSave(s));
});

test('the boundary plan captures its people and fee, waits a season, and returns as a new decision', () => {
  let s = ready(); s.hero.gold = 60;
  s = act(s, 'farm_plan');
  assert.equal(s.event?.id, 'farm_boundary');
  const neighbour = clone(s.farm.people.neighbour), gold = s.hero.gold, day = s.day;
  s = answer(s, 'witness');
  assert.equal(s.hero.gold, gold - 4);
  assert.equal(s.day, day + 2);
  assert.equal(s.farm.plan.status, 'open');
  assert.equal(s.farm.plan.stage, 2);
  assert.ok(s.farm.plan.dueSeason > seasonOf(s.day));
  assert.equal(s.farm.plan.roles.neighbour.id, neighbour.id, 'a later stage uses the person at the commitment');
  const waiting = clone(s), repeated = engine.chooseAction(s, 'farm_plan');
  assert.equal(repeated.day, waiting.day); assert.equal(repeated.hero.gold, waiting.hero.gold);
  assert.deepEqual(repeated.farm.plan, waiting.farm.plan);
  for (let n = 0; n < 4 && s.event?.id !== 'farm_boundary_turn'; n++) s = season(s, { stopAt: 'farm_boundary_turn' });
  assert.equal(s.event?.id, 'farm_boundary_turn');
  assert.ok(s.event.body.includes(neighbour.name));
  const strips = s.farm.field.strips;
  s = answer(s, 'confess');
  assert.equal(s.farm.plan.status, 'kept');
  assert.equal(s.farm.plan.stage, 3);
  assert.equal(s.farm.field.strips, strips + 1);
  assert.ok(s.farm.history.some(h => h.kind === 'plan' && h.people.includes(neighbour.name)));
});

test('one crop offers a real choice between food and money, and a stale harvest cannot pay twice', () => {
  let s = ready(); s.hero.gold = 60;
  s = whenOffered(s, 'farm_sow');
  s = answer(act(s, 'farm_sow'), 'barley');
  s = untilScene(s, 'farm_harvest');
  assert.equal(s.farm.field.crop.harvested, true, 'the crop is claimed before its outcome can be answered');
  const gold = s.hero.gold, grain = s.farm.field.grain, day = s.day;
  const stored = answer(clone(s), 'store'), sold = answer(clone(s), 'sell');
  assert.equal(stored.day, day + 3); assert.equal(sold.day, day + 3);
  assert.equal(stored.hero.gold, gold, 'keeping food earns no invented sale income');
  const yieldCount = stored.farm.field.grain - grain;
  assert.ok(yieldCount > 0);
  assert.equal(sold.farm.field.grain, grain, 'a sold crop cannot also sit in the chest');
  assert.equal(sold.hero.gold - gold, yieldCount * 4);
  assert.equal(stored.farm.harvests, 1); assert.equal(sold.farm.harvests, 1);
  const replayed = engine.chooseEventOption(sold, 'sell');
  assert.equal(replayed.hero.gold, sold.hero.gold);
  assert.deepEqual(replayed.farm.field, sold.farm.field);
  const later = season(stored);
  assert.equal(later.farm.harvests, 1, 'the season tick cannot harvest the same standing crop twice');
});

test('unpaid dues return with distinct ways forward: another person’s loan, the bond, or loss of land', () => {
  let s = ready(); s.hero.gold = 0;
  s = untilScene(s, 'farm_due');
  assert.ok(s.event.choices.find(c => c.id === 'pay').disabledReason);
  s = answer(s, 'plead');
  assert.ok(s.farm.due.deferredUntil > seasonOf(s.day));
  s = untilScene(s, 'farm_reckoning');
  const neighbour = clone(s.farm.people.neighbour);
  const amount = s.farm.threads.find(t => t.def === 'reckoning' && !t.closed).data.amount;
  const helped = answer(clone(s), 'neighbour');
  assert.equal(helped.farm.field.status, 'held');
  assert.equal(helped.farm.neighbourDebt, amount);
  assert.ok(helped.farm.people.neighbour.opinion < neighbour.opinion);
  assert.ok(helped.hero.station.ties.some(t => t.kind === 'owes' && t.name === neighbour.name));
  const bonded = answer(clone(s), 'bond');
  assert.equal(bonded.farm.field.status, 'bonded');
  assert.ok(engine.getActions(settle(bonded)).some(a => a.id === 'farm_reclaim'), 'the bond opens a route back');
  const lost = answer(clone(s), 'continue');
  assert.equal(lost.farm.field.status, 'lost');
  assert.ok(lost.farm.history.some(h => h.kind === 'defeat'));
  assert.ok(engine.getActions(settle(lost)).some(a => a.id === 'farm_reclaim'), 'ruin changes the situation without ending the life');
});

test('changing a private ambition breaks no promise; an ordinary farmer who breaks a winter promise carries the mark', () => {
  let s = ready(); s.hero.gold = 1000;
  s = grow(s, 20);
  const p = s.life.people.find(p => p.id === 'fellow' && p.alive !== false);
  assert.ok(p && p.age >= 18);
  s.life.partnerId = p.id; p.relation = 'partner'; p.bond = 90;
  s = settle(engine.chooseAction(s, 'life_rest'));
  s = answer(act(s, 'farm_talk_spouse'), 'promise');
  s = settle(answer(s, 'continue'));
  const promise = s.farm.promises.find(o => o.status === 'open');
  assert.ok(promise && promise.personId === p.id, 'a promise is to a real person');
  const promiseId = promise.id, marks = clone(s.hero.marks || []);
  s = answer(act(s, 'farm_change_ambition'), 'sea');
  assert.equal(s.farm.ambition.id, 'farm_sea');
  assert.ok(s.farm.ambition.turns.some(t => t.id === 'farm_keep'));
  assert.deepEqual(s.hero.marks || [], marks, 'a new hope is never an oathbreaker mark');
  assert.equal(s.farm.promises.find(o => o.id === promiseId).status, 'open');
  assert.equal(engine.getActions(s).some(a => a.id === 'farm_change_ambition'), false, 'quiet changes have a chapter boundary');
  const replayed = engine.chooseAction(s, 'farm_change_ambition');
  assert.equal(replayed.day, s.day); assert.deepEqual(replayed.farm.ambition, s.farm.ambition);
  s.farm.field.grain = 0; // The captured winter promise is put to the test against an empty chest.
  for (let n = 0; n < 6 && s.farm.promises.find(o => o.id === promiseId).status === 'open'; n++) s = season(s);
  assert.equal(s.farm.promises.find(o => o.id === promiseId).status, 'broken');
  assert.ok(s.hero.marks.some(m => m.id === 'oathbreaker'), 'the mark belongs to ordinary lives as well as paladins');
  assert.equal(s.hero.specialization, null);
  assert.ok(s.farm.history.some(h => h.kind === 'promise' && h.people.includes(p.name)));
});

test('a birthday interrupts costly farm work; the remaining days resume without an early reward or second payment', () => {
  let s = ready(); s.hero.gold = 1000;
  const birthday = s.timeline.birthDay + 17 * 365, target = birthday - 2;
  assert.equal((target - s.day) % 3, 0, 'three-day recovery periods reach the controlled boundary');
  for (let n = 0; s.day < target && n < 200; n++) {
    assert.ok(target - s.day >= 3, 'the recovery route stops before the birthday');
    s = settle(act(s, 'health_rest'));
  }
  assert.equal(s.day, target);
  const beforeBoundaryWork = clone(s);
  s = act(s, 'farm_talk_neighbour');
  assert.equal(s.day, birthday - 1);
  assert.equal(s.event?.id, 'farm_neighbour');
  const gold = s.hero.gold, opinion = s.farm.people.neighbour.opinion;
  s = answer(s, 'help');
  assert.equal(s.day, birthday, 'one of the three days reaches the birthday');
  assert.equal(s.event?.id, 'birth_year_17', 'the birthday takes priority over the unfinished farm work');
  assert.equal(s.farm.people.neighbour.opinion, opinion, 'unfinished help gives no opinion reward');
  let thread = s.farm.threads.find(t => t.def === 'neighbour' && !t.closed);
  assert.ok(thread?.data.work, 'the interrupted work is a captured commitment');
  assert.equal(thread.data.work.pick, 'help');
  assert.equal(thread.data.work.remaining, 2);
  assert.equal(thread.data.work.completedDay, null);
  assert.equal(s.hero.gold, gold, 'the original help had no hidden fee');
  for (let n = 0; s.event?.id !== 'farm_neighbour' && n < 20; n++) {
    assert.ok(s.event, 'the birthday has a lawful answer before the work resumes');
    s = answer(s);
  }
  assert.equal(s.event?.id, 'farm_neighbour');
  const resume = s.event.choices.find(c => c.id === 'help');
  assert.ok(resume && !resume.disabledReason);
  assert.equal(resume.days, 2); assert.equal(resume.cost, 0);
  const resumeGold = s.hero.gold; // The answered birthday may have given the station’s yearly coin.
  s = answer(s, 'help');
  assert.equal(s.day, birthday + 2);
  assert.equal(s.hero.gold, resumeGold, 'resuming the captured work charges no second fee');
  assert.ok(s.farm.people.neighbour.opinion > opinion, 'only the completed help changes the neighbour’s judgement');
  thread = s.farm.threads.find(t => t.def === 'neighbour' && t.data.work?.pick === 'help');
  assert.equal(thread.data.work.remaining, 0);
  assert.equal(thread.data.work.completedDay, s.day);
  s = settle(s);
  const beforeReplay = clone(s), replay = engine.chooseEventOption(s, 'help');
  assert.equal(replay.day, beforeReplay.day);
  assert.equal(replay.hero.gold, beforeReplay.hero.gold);
  assert.equal(replay.farm.people.neighbour.opinion, beforeReplay.farm.people.neighbour.opinion);

  // The same real boundary also proves that a nonzero fee is paid once.
  let paid = settle(act(beforeBoundaryWork, 'grow_family'));
  assert.equal(paid.day, birthday - 1);
  paid = act(paid, 'farm_plan');
  assert.equal(paid.event?.id, 'farm_boundary');
  const quoted = paid.event.choices.find(c => c.id === 'witness');
  assert.ok(quoted.cost > 0); assert.equal(quoted.days, 2);
  const paidGold = paid.hero.gold;
  paid = answer(paid, 'witness');
  assert.equal(paid.day, birthday);
  assert.equal(paid.event?.id, 'birth_year_17');
  assert.equal(paid.hero.gold, paidGold - quoted.cost, 'the agreed fee is paid once when the work starts');
  assert.equal(paid.farm.plan.stage, 1, 'the hearing has not been completed after one day');
  const paidThread = paid.farm.threads.find(t => t.def === 'boundary' && !t.closed);
  assert.equal(paidThread.data.work.gold, quoted.cost);
  assert.equal(paidThread.data.work.remaining, 1);
  for (let n = 0; paid.event?.id !== 'farm_boundary' && n < 20; n++) {
    assert.ok(paid.event);
    paid = answer(paid);
  }
  assert.equal(paid.event?.id, 'farm_boundary');
  const paidResume = paid.event.choices.find(c => c.id === 'witness');
  assert.equal(paidResume.cost, 0); assert.equal(paidResume.days, 1);
  const beforeResumeGold = paid.hero.gold;
  paid = answer(paid, 'witness');
  assert.equal(paid.day, birthday + 1);
  assert.equal(paid.hero.gold, beforeResumeGold, 'the resumed paid hearing cannot charge its fee twice');
  assert.equal(paid.farm.plan.stage, 2);
  const completed = paid.farm.threads.find(t => t.def === 'boundary' && t.data.work?.pick === 'witness');
  assert.ok(completed.closed);
  assert.equal(completed.data.work.remaining, 0);
  assert.equal(completed.data.work.completedDay, paid.day);
});

test('repaying two households retires exactly the displayed fee, even when the first loan is smaller', () => {
  let s = ready(); s.hero.gold = 60;
  const first = s.farm.people.neighbour;
  const second = s.life.people.find(p => p.alive !== false && !p.familyRole && p.id !== first.id && p.age >= 16);
  assert.ok(second, 'a second real household can hold a distinct loan');
  // Two captured loans are the controlled precondition, not a second copy of one debt.
  s.farm.loans = [
    { source: first.source, id: first.id, name: first.name, amount: 3 },
    { source: 'life', id: second.id, name: second.name, amount: 8 },
  ];
  s.farm.creditor = { source: first.source, id: first.id, name: first.name };
  s.farm.neighbourDebt = 11;
  assert.ok(engine.validateSave(s));
  const initialGold = s.hero.gold, initialDay = s.day;
  let repayments = 0;
  for (; s.farm.neighbourDebt > 0 && repayments < 4; repayments++) {
    const quoted = engine.getActions(s).find(a => a.id === 'farm_repay' && !a.disabledReason);
    assert.ok(quoted);
    const beforeDebt = s.farm.neighbourDebt, beforeGold = s.hero.gold;
    s = act(s, 'farm_repay');
    assert.equal(beforeGold - s.hero.gold, quoted.cost, 'the purse pays the displayed amount');
    assert.equal(beforeDebt - s.farm.neighbourDebt, quoted.cost, 'every paid gold actually retires a gold of debt');
    assert.equal(s.farm.loans.reduce((n, l) => n + l.amount, 0), s.farm.neighbourDebt);
  }
  assert.equal(s.farm.neighbourDebt, 0);
  assert.equal(initialGold - s.hero.gold, 11);
  assert.equal(s.day - initialDay, repayments, 'each repayment takes its one displayed day');
  assert.equal(s.farm.loans.length, 0);
  assert.equal(s.farm.creditor, null);
  assert.equal(engine.getActions(s).some(a => a.id === 'farm_repay'), false);
  const replay = engine.chooseAction(s, 'farm_repay');
  assert.equal(replay.hero.gold, s.hero.gold);
  assert.equal(replay.day, s.day);
});








