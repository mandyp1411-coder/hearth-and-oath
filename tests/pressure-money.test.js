import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { settleHouseholdBudget, chargeDebtInterest, debtReckoning, applyDebtReckoningChoice, householdAnnualCost, DEBT_INTEREST } from '../dist/js/budget.js';
import { onFortuneTime, fortuneIncomeFactor } from '../dist/js/fortune.js';

function adult(seed = 'pressure-money') {
  let s = engine.createBirthGame({ seed });
  for (let n = 0; n < 400 && s.age < 18; n++) s = s.event ? engine.chooseEventOption(s, s.event.choices[0].id) : engine.ageUp(s);
  for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, s.event.choices[0].id);
  return s;
}
const journal = () => { const rows = []; return { rows, ctx: { journal: (title, text, tag) => rows.push({ title, text, tag }), setEvent: () => {} } }; };

test('a shortfall after the first adult year becomes debt, not communal support', () => {
  const s = adult();
  const b = s.householdBudget;
  assert.equal(b.debt, 0);
  s.hero.gold = 10; b.accruedUnits = 365 * 100; b.billedGold = 0; b.graceUsed = true; s.age = 20;
  const { rows, ctx } = journal();
  settleHouseholdBudget(s, ctx);
  assert.equal(s.hero.gold, 0);
  assert.equal(b.debt, 90);
  assert.equal(b.supportedGold, 0);
  assert.equal(s.life.lifestyle, 'frugal');
  assert.match(rows.at(-1).text, /90 gold, is owed/);
});

test('the first adult year is carried once, then never again', () => {
  const s = adult();
  const b = s.householdBudget;
  s.hero.gold = 0; b.accruedUnits = 365 * 50; b.billedGold = 0;
  settleHouseholdBudget(s, journal().ctx);
  assert.equal(b.supportedGold, 50); assert.equal(b.debt, 0); assert.equal(b.graceUsed, true);
  b.accruedUnits += 365 * 50;
  settleHouseholdBudget(s, journal().ctx);
  assert.equal(b.supportedGold, 50); assert.equal(b.debt, 50);
});

test('interest is charged once a year and the lender comes at three years of costs', () => {
  const s = adult();
  const b = s.householdBudget;
  b.debt = 200; s.age = 22; b.lastInterestYear = null;
  const { ctx } = journal();
  chargeDebtInterest(s, ctx); chargeDebtInterest(s, ctx);
  assert.equal(b.debt, 200 + Math.floor(200 * DEBT_INTEREST));
  b.debt = householdAnnualCost(s) * 3 + 1;
  let event = null;
  assert.equal(debtReckoning(s, { setEvent: (id, title, category, body, choices) => { event = { id, title, choices }; } }), true);
  assert.equal(event.id, 'debt_reckoning');
  assert.deepEqual(event.choices.map(c => c.id), ['sell', 'bond', 'plead', 'flee']);
});

test('bonded labour clears the debt and pays the creditor instead of you', () => {
  const s = adult();
  const b = s.householdBudget;
  b.debt = 500;
  const { ctx } = journal();
  assert.equal(applyDebtReckoningChoice(s, 'debt_reckoning', 'bond', ctx), true);
  assert.equal(b.debt, 0);
  assert.ok(b.bondedUntil > s.day);
  // Public path: a shift while bonded pays nothing.
  const before = s.hero.gold;
  const shift = engine.getActions(s).find(a => a.id === 'career_work' && !a.disabledReason);
  if (shift) { const after = engine.chooseAction(s, 'career_work'); assert.equal(after.hero.gold <= before, true); }
});

test('fortune never rolls in childhood, catches up nothing, and a cost beyond cash becomes debt', () => {
  let s = engine.createBirthGame({ seed: 'pressure-fortune' });
  for (let n = 0; n < 400 && s.age < 18; n++) s = s.event ? engine.chooseEventOption(s, s.event.choices[0].id) : engine.ageUp(s);
  assert.equal(s.fortune.history.length, 0, 'no shocks before adulthood');
  assert.equal(s.fortune.lastSeason, Math.floor(s.day / 92));
  // A clock moved by many seasons at once rolls nothing.
  const jumped = structuredClone(s); const { rows: none, ctx: quiet } = journal();
  const was = jumped.day; jumped.day += 92 * 10; onFortuneTime(jumped, { oldDay: was, newDay: jumped.day }, quiet);
  assert.equal(none.length, 0); assert.equal(jumped.fortune.lastSeason, Math.floor(jumped.day / 92));
  // Force a shock: find a season whose roll lands, by scanning forward with a copy.
  const copy = structuredClone(s); copy.hero.gold = 5; copy.householdBudget.debt = 0;
  const { rows, ctx } = journal();
  // Live twelve seasons one boundary at a time (a clock jump of more than a season rolls nothing).
  for (let n = 0; n < 12; n++) { const oldDay = copy.day; copy.day += 92; onFortuneTime(copy, { oldDay, newDay: copy.day }, ctx); }
  assert.ok(copy.hero.gold >= 0, 'gold never goes negative');
  assert.ok(rows.length > 0, 'twelve seasons produce at least one event');
  assert.ok(copy.householdBudget.debt > 0 || rows.every(r => !/gold/.test(r.text)), 'an unpaid cost is owed');
  assert.ok(fortuneIncomeFactor(copy) >= 0 && fortuneIncomeFactor(copy) <= 2);
  // Through the public engine, lived seasons keep the save valid.
  let lived = s;
  for (let n = 0; n < 12 && lived.age < 21; n++) lived = lived.event ? engine.chooseEventOption(lived, lived.event.choices[0].id) : engine.ageUp(lived);
  assert.equal(engine.validateSave(lived), true);
  assert.ok(lived.fortune.lastSeason >= Math.floor(lived.day / 92) - 1);
});
