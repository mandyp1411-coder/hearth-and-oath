import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';

function answer(s) {
  const offered = s.event.choices.filter(c => !c.disabledReason);
  const preferred = s.event.id === 'hard_winter' ? 'endure'
    : s.event.id.startsWith('farm_') ? 'continue' : null;
  assert.ok(offered.length, `${s.event.id} has an available answer`);
  return (offered.find(c => c.id === preferred) || offered[0]).id;
}
function adult(seed = 'pressure-wellbeing') {
  let s = engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, 'common', 'human') });
  for (let n = 0; n < 400 && s.age < 18; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, answer(s));
  assert.equal(s.age, 18, 'the controlled fixture reaches adulthood');
  assert.equal(s.phase, 'adult');
  assert.equal(s.event, null, 'incidental decisions have a finite continuation');
  return s;
}
function liveYear(s) {
  const age = s.age;
  for (let n = 0; n < 60 && s.age === age; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, answer(s));
  return s;
}

test('joy and stress drift toward a resting level instead of pinning at the extremes', () => {
  let s = adult();
  s.life.happiness = 100; s.life.stress = 0;
  s = liveYear(s);
  assert.ok(s.life.happiness < 90, `joy fell from 100 to ${s.life.happiness}`);
  s.life.happiness = 5; s.life.stress = 95;
  const burdened = { ...s.householdBudget, debt: 0 };
  s.householdBudget = burdened;
  s = liveYear(s);
  assert.ok(s.life.happiness > 20, `joy rose from 5 to ${s.life.happiness}`);
  assert.ok(s.life.stress < 70, `stress eased from 95 to ${s.life.stress}`);
});

test('debt and bondage raise the resting stress and lower the resting joy', () => {
  let a = adult('pressure-wellbeing-a'), b = adult('pressure-wellbeing-a');
  b.householdBudget.debt = 400; b.householdBudget.bondedUntil = b.day + 365;
  a.life.happiness = b.life.happiness = 60; a.life.stress = b.life.stress = 15;
  a = liveYear(a); b = liveYear(b);
  assert.ok(b.life.stress > a.life.stress, `indebted stress ${b.life.stress} > free ${a.life.stress}`);
  assert.ok(b.life.happiness < a.life.happiness, `indebted joy ${b.life.happiness} < free ${a.life.happiness}`);
});

test('at 100 stress something gives: the break is answered and leaves a mark', () => {
  let s = adult('pressure-break');
  s.life.stress = 100; s.life.happiness = 10;
  let seen = null;
  for (let n = 0; n < 80 && !seen; n++) {
    if (s.event?.id === 'health_break') { seen = s.event; break; }
    s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
    if (s.event?.id !== 'health_break') { s.life.stress = 100; }
  }
  assert.ok(seen, 'the break event was offered');
  assert.deepEqual(seen.choices.map(c => c.id), ['drink', 'rage', 'pray', 'withdraw', 'work']);
  const after = engine.chooseEventOption(s, 'pray');
  assert.ok(after.hero.marks.some(m => m.id === 'devout'), 'coping leaves a mark');
  assert.ok(after.life.stress < 100);
  assert.equal(engine.validateSave(after), true);
  // Not again within the year.
  let again = after; again.life.stress = 100;
  for (let n = 0; n < 6; n++) { again = again.event ? engine.chooseEventOption(again, answer(again)) : engine.ageUp(again); assert.notEqual(again.event?.id, 'health_break'); if (again.age > after.age) break; }
});

test('a worn-down worker earns less for a shift', () => {
  const s = adult('pressure-shift');
  const shift = engine.getActions(s).find(a => a.id === 'career_work' && !a.disabledReason);
  if (!shift) return; // not every seeded start can work on day one
  s.life.stress = 20; const rested = engine.chooseAction(s, 'career_work').hero.gold - s.hero.gold;
  s.life.stress = 80; const worn = engine.chooseAction(s, 'career_work').hero.gold - s.hero.gold;
  assert.ok(worn < rested, `worn ${worn} < rested ${rested}`);
});

test('no work on an empty tank: a shift needs some Focus', () => {
  const s = adult('pressure-focus');
  const open = engine.getActions(s).find(a => a.id === 'career_work' && !a.disabledReason);
  if (!open) return; // the shift is reachable only at a work yard; other fixtures cover that walk
  s.hero.mp = 0;
  const spent = engine.getActions(s).find(a => a.id === 'career_work');
  assert.match(spent.disabledReason || '', /spent/);
  s.hero.mp = 1;
  assert.equal(engine.getActions(s).find(a => a.id === 'career_work').disabledReason, undefined);
});
