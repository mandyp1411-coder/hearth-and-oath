import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { householdCostPreview } from '../dist/js/budget.js';
import { farmView } from '../dist/js/farmer.js';
import { renderFarmerDay, renderFarmerScene } from '../dist/js/farmer-ui.js';
import { mountApp } from './helpers/ui-surface.mjs';

const clone = s => structuredClone(s), cache = new Map();
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ui = { e, paragraphs: text => `<p>${e(text)}</p>`, button: (text, op, id = '') => `<button data-op="${op}" data-id="${id}">${text}</button>` };
function pick(s) {
  const safe = s.event.choices.filter(c => !c.disabledReason);
  const preferred = { farm_due: 'pay', farm_reckoning: 'pay', hard_winter: 'endure', debt_reckoning: 'plead' }[s.event.id];
  return (safe.find(c => c.id === preferred) || safe.find(c => ['continue', 'endure', 'plead'].includes(c.id)) || safe[0]).id;
}
function settle(s, until) {
  for (let n = 0; s.event && s.event.id !== until && n < 60; n++) {
    s = engine.chooseEventOption(s, pick(s));
    assert.ok(engine.validateSave(s));
  }
  assert.ok(!s.event || s.event.id === until, 'the incidental scenes have a guarded way forward');
  return s;
}
function ready(age = 18) {
  if (!cache.has(age)) {
    const seed = 'farm-ui-v071';
    let s = engine.createBirthGame({ seed, name: 'Edra Merrow', difficulty: 'gentle', household: 'poor', station: rollBirthCircumstances(seed, 'common', 'human') });
    for (let n = 0; n < 1000 && (s.age < age || s.event || s.timeline.yearTarget !== null); n++) {
      s.hero.gold = 1000; // The fixture isolates costs, rather than earning seed money.
      s = s.event ? engine.chooseEventOption(s, pick(s)) : s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.ageUp(s);
      assert.ok(engine.validateSave(s));
    }
    assert.equal(s.age, age); assert.equal(s.event, null); assert.equal(s.timeline.yearTarget, null);
    for (let n = 0; n < 100 && !engine.getActions(s).some(a => a.id === 'farm_sow' && !a.disabledReason); n++) {
      s.hero.gold = 1000;
      s = s.event ? engine.chooseEventOption(s, pick(s)) : s.timeline.yearTarget !== null ? engine.continueAgeUp(s) : engine.liveSeason(s);
      assert.ok(engine.validateSave(s));
    }
    assert.ok(engine.getActions(s).some(a => a.id === 'farm_sow' && !a.disabledReason));
    s.hero.gold = 100;
    cache.set(age, s);
  }
  return clone(cache.get(age));
}
function open(s, action) {
  const offer = engine.getActions(s).find(a => a.id === action && !a.disabledReason);
  assert.ok(offer, `${action} is actually offered`);
  const next = engine.chooseAction(s, action);
  assert.ok(engine.validateSave(next));
  return next;
}
const card = (markup, id) => markup.match(new RegExp(`<button[^>]*data-id="${id}"[\\s\\S]*?<\\/button>`))?.[0] || '';
function scene(s) { return renderFarmerScene(s.event, ui, { state: s, showNumbers: false }); }
function keepText(quote) { return quote.totalDue ? quote.outstanding ? `The house needs about ${quote.totalDue} gold in all. ${quote.outstanding} of that is already due from earlier days.` : `The house needs about ${quote.totalDue} gold over this work.` : 'No gold for the house falls due over this work.'; }

test('adult crop and witness choices disclose their direct fee and household keep before the public command', async t => {
  for (const [action, choiceId] of [['farm_sow', 'barley'], ['farm_plan', 'witness']]) {
    const s = open(ready(), action), before = clone(s), choice = s.event.choices.find(c => c.id === choiceId);
    const quote = householdCostPreview(s, choice.days);
    assert.ok(quote.totalDue > 0, 'the real adult ledger has keep falling due');
    const markup = card(scene(s), choiceId);
    assert.match(markup, new RegExp(`${choice.cost} gold to pay`));
    assert.ok(markup.includes(keepText(quote)));
    const next = engine.chooseEventOption(s, choiceId);
    assert.ok(engine.validateSave(next));
    assert.equal(next.day - s.day, choice.days);
    assert.equal(s.hero.gold - next.hero.gold, choice.cost + quote.totalDue);
    assert.equal(next.householdBudget.paidGold - s.householdBudget.paidGold, quote.totalDue);
    assert.deepEqual(s, before, 'rendering and command dispatch preserve the input');
  }
  const initial = open(ready(), 'farm_sow'), before = clone(initial), mounted = await mountApp(t, { states: [initial] });
  await mounted.click('title-continue');
  assert.ok(card(mounted.root.markup, 'barley').includes(keepText(householdCostPreview(initial, 3))), 'the actual app supplies the life to the scene renderer');
  assert.deepEqual(mounted.current(), before, 'reading the rendered quote does not collect it');
  await mounted.click('choice', 'barley');
  const expected = engine.chooseEventOption(initial, 'barley');
  assert.equal(mounted.current().hero.gold, expected.hero.gold);
  assert.deepEqual(mounted.current().householdBudget, expected.householdBudget);
});

test('ordinary farm actions show keep becoming due, including earlier unpaid days, without collecting a second fee', () => {
  let s = settle(open(ready(20), 'health_rest'));
  assert.ok(householdCostPreview(s, 0).outstanding > 0, 'earlier ordinary days left an unpaid household bill');
  const offered = engine.getActions(s).find(a => a.id === 'farm_talk_neighbour' && !a.disabledReason);
  assert.ok(offered);
  const quote = householdCostPreview(s, offered.days), before = clone(s);
  const day = renderFarmerDay(s, farmView(s), engine.getActions(s), ui);
  assert.ok(card(day, offered.id).includes(keepText(quote)));
  assert.ok(card(day, offered.id).includes(`The house needs about ${quote.totalDue} gold in all. ${quote.outstanding} of that is already due from earlier days.`), 'the earlier bill is part of the total, rather than an extra charge');
  assert.match(card(day, offered.id), /No gold to pay/);
  const next = engine.chooseAction(s, offered.id);
  assert.ok(engine.validateSave(next));
  assert.equal(next.hero.gold, s.hero.gold, 'this normal action leaves keep due for the next collection');
  assert.equal(householdCostPreview(next, 0).outstanding, quote.totalDue);
  assert.deepEqual(s, before, 'reading the action leaves the calendar, purse and people exact');
  s = engine.chooseEventOption(next, 'help');
  const reply = s.event.choices.find(c => c.id === 'accept');
  assert.ok(reply);
  const replyKeep = householdCostPreview(s, reply.days);
  assert.ok(card(scene(s), 'accept').includes(keepText(replyKeep)));
});

test('an affordable fee still warns when household keep must become debt, while the first adult rescue stays truthful', () => {
  let s = open(ready(20), 'farm_sow');
  const choice = s.event.choices.find(c => c.id === 'barley');
  s.hero.gold = choice.cost;
  const quote = householdCostPreview(s, choice.days), before = clone(s), markup = card(scene(s), 'barley');
  assert.match(markup, new RegExp(`Without other coin, the house will owe about ${quote.totalDue} gold\\.`));
  assert.match(markup, /data-farm-debt-risk/);
  const next = engine.chooseEventOption(s, 'barley');
  assert.ok(engine.validateSave(next));
  assert.equal(next.hero.gold, 0);
  assert.equal(next.householdBudget.debt - s.householdBudget.debt, quote.totalDue);
  assert.deepEqual(s, before);
  s = open(ready(), 'farm_sow'); s.hero.gold = 3;
  assert.equal(s.householdBudget.graceUsed, false);
  assert.match(card(scene(s), 'barley'), /Without other coin, the neighbours carry the house this once\./);
  assert.doesNotMatch(card(scene(s), 'barley'), /the house will owe/);
  const carried = engine.chooseEventOption(s, 'barley');
  assert.equal(carried.householdBudget.debt, s.householdBudget.debt);
  assert.equal(carried.householdBudget.graceUsed, true);
});

test('prepaid birthday work shows only its remaining days, the household keep and the already-paid witness fee', () => {
  let s = ready(); s.hero.gold = 1000;
  const birthday = s.timeline.birthDay + 19 * 365, target = birthday - 1;
  for (let guard = 0; (target - s.day) % 3 !== 0 && guard < 3; guard++) {
    s = settle(open(s, 'grow_family'));
  }
  assert.equal((target - s.day) % 3, 0);
  for (let guard = 0; s.day < target && guard < 200; guard++) s = settle(open(s, 'health_rest'));
  assert.equal(s.day, target);
  s = open(s, 'farm_plan');
  const originalGold = s.hero.gold;
  s = engine.chooseEventOption(s, 'witness');
  assert.equal(s.day, birthday);
  assert.ok(s.event && !s.event.id.startsWith('farm_'));
  assert.ok(s.hero.gold <= originalGold - 4);
  s = settle(s, 'farm_boundary');
  assert.equal(s.event?.id, 'farm_boundary');
  const resumed = s.event.choices.find(c => c.id === 'witness');
  assert.equal(resumed.days, 1); assert.equal(resumed.cost, 0);
  const quote = householdCostPreview(s, resumed.days), before = clone(s), markup = card(scene(s), 'witness');
  assert.match(markup, /1 day · No more gold to pay/);
  assert.match(markup, /4 gold already paid\./);
  assert.match(markup, /A hearing may save the strip; your neighbour may resent the witnesses\./);
  assert.doesNotMatch(markup, /Two days and four gold|4 gold to pay/);
  assert.ok(markup.includes(keepText(quote)));
  const next = engine.chooseEventOption(s, 'witness');
  assert.ok(engine.validateSave(next));
  assert.equal(next.day - s.day, 1);
  assert.equal(s.hero.gold - next.hero.gold, quote.totalDue, 'only the house can take another gold; the witness is paid already');
  assert.deepEqual(s, before);
});
