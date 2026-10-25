import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { voiceAction, voiceActions, voiceEvent, epitaph, chapterHeading, chapterOf, whatMatters } from '../dist/js/voice.js';

const answer = s => {
  const offered = s.event.choices.filter(c => !c.disabledReason);
  const preferred = s.event.id === 'health_concern' ? 'rest' : s.event.id === 'hard_winter' ? 'endure'
    : s.event.id.startsWith('farm_') ? 'continue' : null;
  assert.ok(offered.length, `${s.event.id} has an available answer`);
  return (offered.find(c => c.id === preferred) || offered[0]).id;
};
function adult(seed, station = 'common') {
  let s = engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, 'human') });
  for (let n = 0; n < 700 && s.age < 18 && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, answer(s));
  assert.equal(s.phase, 'adult');
  return s;
}

test('a season is a quarter of a year that stops only for things that matter, and the last one runs to the birthday', () => {
  let s = adult('voice-season');
  const start = s.day;
  s = engine.liveSeason(s);
  assert.equal(s.day - start, 92, 'a season is ninety-two days');
  assert.equal(s.timeline.yearTarget, null, 'a season that stops short of the birthday turns quietly');
  assert.equal(s.timeline.season, undefined);
  assert.equal(s.event, null);
  assert.equal(engine.validateSave(s), true);
  // A year is four seasons, the fourth ending on the birthday with its scene.
  let stops = 0;
  for (let n = 0; n < 8 && s.age === 18; n++) { if (s.event) { stops++; s = engine.chooseEventOption(s, answer(s)); } else s = engine.liveSeason(s); }
  assert.equal(s.age, 19);
  assert.equal(s.event?.id, 'birth_adult_year', 'the birthday still has its page');
  assert.equal(stops, 0);
  // Deterministic.
  const a = engine.liveSeason(adult('voice-season')), b = engine.liveSeason(adult('voice-season'));
  assert.deepEqual(a, b);
  // Older lives do not have it: the command falls back to Age up.
  const old = adult('voice-season-old'); delete old.hero.station; delete old.farm;
  const year = engine.liveSeason(old);
  assert.ok(year.timeline.yearTarget === null ? year.age === 19 : year.timeline.yearTarget - (year.timeline.birthDay || 0) === 19 * 365);
});

test('while a season is lived, a slight complaint is nursed at home; one that is getting worse still asks', () => {
  const s = adult('voice-nursed');
  s.timeline.yearStartDay = s.day; s.timeline.yearTarget = s.day + 14; s.timeline.season = true;
  s.health.physical.push({ id: 'fever-slight', type: 'fever', severity: 1, sinceDay: s.day, lastEffectDay: s.day, careUntil: 0, acknowledged: false });
  s.health.pending = { eventId: 'health_concern', conditionId: 'fever-slight', kind: 'physical', offeredDay: s.day };
  const next = engine.continueAgeUp(s);
  assert.ok(next.health.history.some(h => h.result === 'nursed'), 'seen to at home');
  assert.ok(!next.journal.some(j => j.title === 'Room for the body to recover'));
  const worse = adult('voice-nursed');
  worse.timeline.yearStartDay = worse.day; worse.timeline.yearTarget = worse.day + 92; worse.timeline.season = true;
  worse.health.physical.push({ id: 'fever-bad', type: 'fever', severity: 2, sinceDay: worse.day, lastEffectDay: worse.day, careUntil: 0, acknowledged: false });
  worse.health.pending = { eventId: 'health_concern', conditionId: 'fever-bad', kind: 'physical', offeredDay: worse.day };
  const asked = engine.continueAgeUp(worse);
  assert.equal(asked.event?.id, 'health_concern');
  assert.equal(engine.validateSave(asked), true);
});

test('a sickness on the last day of a season is seen to past its end, and the season turns after', () => {
  const s = adult('voice-last-day');
  s.timeline.yearStartDay = s.day - 89; s.timeline.yearTarget = s.day + 3; s.timeline.season = true;
  s.health.physical.push({ id: 'fever-last', type: 'fever', severity: 2, sinceDay: s.day, lastEffectDay: s.day, careUntil: 0, acknowledged: false });
  s.health.pending = { eventId: 'health_concern', conditionId: 'fever-last', kind: 'physical', offeredDay: s.day };
  s.event = null;
  const shown = engine.continueAgeUp(s);
  assert.equal(shown.event?.id, 'health_concern');
  assert.equal(shown.day, shown.timeline.yearTarget, 'the complaint is asked on the last day of the season');
  const rested = engine.chooseEventOption(shown, 'rest');
  assert.ok(rested.day > shown.day, 'the care session spent its days');
  assert.equal(engine.validateSave(rested), true);
  const turned = engine.continueAgeUp(rested);
  assert.equal(turned.timeline.yearTarget, null); assert.equal(turned.timeline.season, undefined);
  assert.equal(engine.validateSave(turned), true);
});

test('the voice rewrites what the player reads and keeps the engine’s figures as detail', () => {
  const s = adult('voice-lines');
  const shift = voiceAction(s, { id: 'career_work', label: 'Work a shift at the yard', description: 'Earn 25 gold; lose 4 reputation.', days: 3, cost: 0, group: 'Career' });
  assert.equal(shift.label, 'Work a shift');
  assert.equal(shift.description, 'Three days of it. The pay comes after.');
  assert.equal(shift.detail, 'Earn 25 gold; lose 4 reputation.');
  assert.equal(shift.days, 3);
  const room = voiceAction(s, { id: 'atlas_room_bathhouse', label: 'Enter bathhouse', description: 'Walk within the settlement.' });
  assert.equal(room.label, 'bathhouse'); assert.equal(room.description, 'Walk there. It costs no days.');
  const talk = voiceAction(s, { id: 'talk_river', label: 'Speak with Mara', description: 'Sit together and exchange a few words.' });
  assert.equal(talk.label, 'Speak with Mara'); assert.match(talk.description, /remembered/);
  const unknown = { id: 'some_other_thing', label: 'X', description: 'Y' };
  assert.deepEqual(voiceAction(s, unknown), unknown);
  // One rulebook (v0.72.2): every life the main game plays is voiced; there is no older life to leave alone.
  // Through the real action list every voiced action keeps its id, days and cost.
  const real = engine.getActions(s), voiced = voiceActions(s, real);
  assert.equal(voiced.length, real.length);
  for (const [i, a] of voiced.entries()) { assert.equal(a.id, real[i].id); assert.equal(a.days, real[i].days); assert.equal(a.cost, real[i].cost); assert.equal(a.disabledReason, real[i].disabledReason); }
  assert.ok(voiced.some(a => a.detail), 'the common actions are voiced');
});

test('a sickness is told as a sickness, a promise as a promise', () => {
  const s = adult('voice-event');
  s.health.physical.push({ id: 'fever-told', type: 'fever', severity: 2, sinceDay: s.day, lastEffectDay: s.day, careUntil: 0, acknowledged: false, circumstance: 'ordinary' });
  s.health.pending = { eventId: 'health_concern', conditionId: 'fever-told', kind: 'physical', offeredDay: s.day };
  const shown = engine.ageUp(s);
  assert.equal(shown.event?.id, 'health_concern');
  const told = voiceEvent(shown, shown.event);
  assert.equal(told.title, 'The body');
  assert.match(told.body, /^A fever\. It is (getting worse|as bad as it gets)\./);
  assert.doesNotMatch(told.body, /severity|fortnightly|care window/);
  const rest = told.choices.find(c => c.id === 'rest');
  assert.equal(rest.label, 'Take to bed'); assert.ok(rest.detail.length > 20);
  assert.deepEqual(told.choices.map(c => c.id), shown.event.choices.map(c => c.id), 'the choices are the engine’s');
});

test('the book has chapters, and closes with an epitaph that judges the life', () => {
  assert.equal(chapterHeading(0), 'Chapter I · The cradle');
  assert.equal(chapterHeading(7), 'Chapter II · The yard');
  assert.equal(chapterHeading(18), 'Chapter IV · The road');
  assert.equal(chapterOf(75).title, 'The long evening');
  const s = adult('voice-epitaph');
  s.hero.name = 'Ishkaren Javulessa'; s.hero.pronouns = 'he/him'; s.hero.profession = 'Blacksmith';
  s.householdBudget.debt = 0; s.life.children = [];
  assert.match(epitaph(s, 'Death in old age'), /^Ishkaren Javulessa, blacksmith of .+\. He never went further than .+\.$/);
  s.householdBudget.debt = 120;
  assert.match(epitaph(s), /He died owing /);
  const child = adult('voice-epitaph'); child.age = 5; child.hero.pronouns = 'she/her';
  assert.match(epitaph(child, 'A winter fever'), /child of .+\. She did not see the thaw\./);
  // Through the engine: a closed book carries its epitaph and stays a valid save.
  const dying = adult('voice-epitaph-engine');
  dying.health.physical.push({ id: 'fever-end', type: 'fever', severity: 3, sinceDay: dying.day - 200, lastEffectDay: dying.day - 14, careUntil: 0, acknowledged: true });
  let closed = dying, guard = 0;
  while (closed.phase !== 'retired' && guard++ < 40) closed = closed.event ? engine.chooseEventOption(closed, 'continue') : engine.ageUp(closed);
  if (closed.phase === 'retired') {
    assert.ok(closed.epitaph && closed.epitaph.startsWith(closed.hero.name), closed.epitaph);
    assert.ok(closed.journal.some(j => j.title === 'The book closes' && j.text === closed.epitaph));
    assert.ok(closed.chronicle.startsWith(closed.epitaph));
    assert.equal(engine.validateSave(closed), true);
    assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(closed))), closed);
  }
  const alive = adult('voice-epitaph'); alive.epitaph = 'Too soon.';
  assert.equal(engine.validateSave(alive), false, 'no epitaph on an open book');
});

test('right now: three to five things that matter today, chosen from what is offered, written as situations', () => {
  const s = adult('voice-now');
  const actions = voiceActions(s, engine.getActions(s));
  const rows = whatMatters(s, actions);
  assert.ok(rows.length >= 3 && rows.length <= 5, `${rows.length} rows`);
  for (const r of rows) { assert.ok(actions.some(a => a.id === r.id && !a.disabledReason), `${r.id} is offered and open`); assert.ok(r.why && r.why.length < 90, r.why); }
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, 'no repeats');
  // What matters changes with the situation.
  s.householdBudget.debt = 120; s.hero.gold = 200;
  assert.ok(whatMatters(s, voiceActions(s, engine.getActions(s))).some(r => r.id === 'budget_repay' && /owe 120 gold/.test(r.why)));
  s.health.physical.push({ id: 'fever-now', type: 'fever', severity: 2, sinceDay: s.day, lastEffectDay: s.day, careUntil: 0, acknowledged: true });
  const sick = whatMatters(s, voiceActions(s, engine.getActions(s)));
  assert.equal(sick[0]?.id, 'health_rest'); assert.match(sick[0].why, /getting worse/);
  // Never during a scene.
  s.event = { id: 'x', title: 't', category: 'c', body: 'b', choices: [{ id: 'a', label: 'A', description: '' }] };
  assert.deepEqual(whatMatters(s, actions), []);
});
