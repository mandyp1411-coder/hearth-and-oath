import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Real engine commands on a fictional life; the handler surface deliberately
// makes no browser geometry or accessibility claim.
function farmerAtSixteen() {
  const seed = 'farm-ui-v071';
  let s = engine.createBirthGame({ seed, name: 'Edra Merrow', household: 'poor', station: rollBirthCircumstances(seed, 'common', 'human') });
  for (let guard = 0; guard < 1000 && s.phase !== 'retired' && s.event?.id !== 'farm_ambition'; guard++) {
    if (s.event) {
      const choice = s.event.choices.find(c => ['endure', 'continue', 'plead', 'rest', 'present', 'contest'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason);
      assert.ok(choice, 'the childhood has a way forward');
      s = engine.chooseEventOption(s, choice.id);
    } else if (s.timeline.yearTarget !== null) s = engine.continueAgeUp(s);
    else if (s.age < 16) s = engine.ageUp(s);
    else break;
  }
  assert.equal(s.age, 16);
  assert.equal(s.event?.id, 'farm_ambition');
  assert.equal(engine.validateSave(s), true);
  return s;
}

test('the farmer screen uses public choices, and reading the Book changes no farm or purse', async t => {
  const initial = farmerAtSixteen(), before = structuredClone(initial);
  const ui = await mountApp(t, { states: [initial] });
  await ui.click('title-continue');
  assert.ok(ui.root.querySelector('[data-farmer-day]'));
  assert.equal(ui.root.querySelector('[data-op="footing-dismiss"]'), null);
  const choices = ui.root.querySelectorAll('.farm-choice');
  assert.ok(choices.length >= 3);
  for (const choice of choices) assert.ok(choice.querySelector('[data-farm-choice-cost]'), 'each rendered choice has its time and risk');
  await ui.click('choice', 'keep');
  const afterChoice = ui.current(), expected = engine.chooseEventOption(initial, 'keep');
  assert.deepEqual(initial, before, 'the handler did not mutate its source save');
  assert.deepEqual(afterChoice.farm, expected.farm);
  assert.equal(afterChoice.day, expected.day);
  assert.equal(afterChoice.hero.gold, expected.hero.gold);
  assert.equal(engine.validateSave(afterChoice), true);
  const reading = structuredClone(afterChoice);
  await ui.click('tab', 'journal');
  assert.ok(ui.root.querySelector('[data-farm-book]'));
  assert.match(ui.root.markup, /The Book of Edra Merrow/);
  assert.deepEqual(ui.current().farm, reading.farm);
  assert.equal(ui.current().day, reading.day);
  assert.equal(ui.current().hero.gold, reading.hero.gold);
});
