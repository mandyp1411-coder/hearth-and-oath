import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { applyPersonalityBuild, personalityView, natureIds, hasNature, shiftNature, applyPersonalityImpact, personalityImpact, cultureRegard, ACQUIRED_TRAITS, personalityTrait } from '../dist/js/personality.js';
import { renderTraitPicker } from '../dist/js/personality-ui.js';
import { debtReckoning, applyDebtReckoningChoice, householdAnnualCost } from '../dist/js/budget.js';
import { flushWinterEvent, applyWinterChoice } from '../dist/js/fortune.js';
import { rollBirthCircumstances } from '../dist/js/station.js';

const answer = s => s.event.id === 'health_concern' && s.event.choices.some(c => c.id === 'rest') ? 'rest' : s.event.choices[0].id;
function adult(seed, traits = []) {
  let s = engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, 'common', 'human') });
  for (let n = 0; n < 700 && s.age < 18 && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, answer(s)) : engine.ageUp(s);
  for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, answer(s));
  if (traits.length) applyPersonalityBuild(s, traits, { creation: true });
  return s;
}
const journal = () => { const rows = []; return { rows, ctx: { journal: (title, text, tag) => rows.push({ title, text, tag }), setEvent: () => {}, standing: () => {}, killPerson: () => false } }; };

test('a nature is a trade-off on a new life: no attribute points come with it', () => {
  const s = engine.createBirthGame({ seed: 'no-bonus' });
  s.age = 18;
  const before = { ...s.hero.attributes }, hp = s.hero.maxHp;
  assert.equal(applyPersonalityBuild(s, ['brave', 'curious'], { creation: true }), true);
  assert.deepEqual(s.hero.attributes, before);
  assert.equal(s.hero.maxHp, hp);
  assert.deepEqual(s.hero.personality.traits, ['brave', 'curious']);
  assert.deepEqual(s.hero.personality.applied, ['brave', 'curious']);
  assert.deepEqual(personalityView(s).bonuses, {});
  const picker = renderTraitPicker(['brave'], 18, { creation: false, state: s });
  assert.match(picker, /A trade-off, not a bonus/);
  assert.doesNotMatch(picker, /\+1 Strength/);
  // An older life keeps what its traits bought.
  const old = engine.createBirthGame({ seed: 'old-bonus', station: null });
  old.age = 18; delete old.householdBudget.debt;
  applyPersonalityBuild(old, ['brave'], { creation: true });
  assert.equal(old.hero.attributes.strength, before.strength + 1);
});

test('life writes a nature: a mark reads like a trait, counts against choices, and can undo a chosen opposite', () => {
  const s = adult('marks', ['generous']);
  const { rows, ctx } = journal();
  assert.equal(shiftNature(s, 'greedy', 'What hunger made of you', 'Bread under the straw.', ctx), true);
  assert.deepEqual(natureIds(s), ['greedy']);
  assert.deepEqual(s.hero.personality.traits, [], 'the chosen opposite is gone');
  assert.ok(s.hero.marks.some(m => m.id === 'greedy' && m.source === 'life'));
  assert.equal(rows[0].title, 'What hunger made of you');
  assert.equal(shiftNature(s, 'greedy', 't', 'x', ctx), false, 'not twice');
  // The mark weighs on choices like any trait.
  const against = personalityImpact(s, { kind: 'choice', eventId: 'hard_winter', id: 'share' });
  assert.ok(against.impacts.some(i => i.id === 'greedy' && i.delta > 0));
  assert.equal(engine.validateSave(s), true);
  // Coping that stuck after a break is read the same way.
  for (const t of ACQUIRED_TRAITS) assert.equal(personalityTrait(t.id), t);
  const view = personalityView(s);
  assert.equal(view.acquired[0].id, 'greedy');
});

test('acting against a trait for years flips it', () => {
  const s = adult('strain', ['honest']);
  s.life.stress = 10;
  let flipped = false;
  for (let n = 0; n < 14 && !flipped; n++) {
    s.day += 2;
    applyPersonalityImpact(s, { kind: 'choice', eventId: 'career_invoice', id: 'conceal', label: 'conceal the invoice' });
    if (n === 0) s.hero.personality.strain.honest.sinceDay = s.day - 800; // the first lie was years ago
    s.life.stress = 10;
    flipped = hasNature(s, 'deceitful');
  }
  assert.ok(flipped, 'twelve lies across two years and more make a liar');
  assert.ok(!hasNature(s, 'honest'));
  assert.ok(s.journal.some(e => e.title === 'What the years did to you'));
  assert.equal(engine.validateSave(s), true);
});

test('some answers exist only for some natures: the lender hears a forged ledger or a held door', () => {
  const plain = adult('reckon-plain'), sly = adult('reckon-sly', ['deceitful']), bold = adult('reckon-bold', ['brave']);
  for (const s of [plain, sly, bold]) {
    s.householdBudget.debt = householdAnnualCost(s) * 3 + 10; s.householdBudget.lastReckoningYear = null; s.age = 25;
    let event = null;
    assert.equal(debtReckoning(s, { setEvent: (id, title, category, body, choices) => { event = { id, choices }; } }), true);
    const ids = event.choices.map(c => c.id);
    assert.equal(ids.includes('forge'), s === sly);
    assert.equal(ids.includes('defy'), s === bold);
  }
  const { ctx } = journal();
  assert.equal(applyDebtReckoningChoice(plain, 'debt_reckoning', 'forge', ctx), false, 'not in your nature');
  const owed = sly.householdBudget.debt;
  assert.equal(applyDebtReckoningChoice(sly, 'debt_reckoning', 'forge', ctx), true);
  assert.notEqual(sly.householdBudget.debt, owed);
  const bowed = bold.householdBudget.debt;
  assert.equal(applyDebtReckoningChoice(bold, 'debt_reckoning', 'defy', ctx), true);
  assert.ok(bold.householdBudget.debt > bowed && bold.householdBudget.lastReckoningYear === null, 'he goes away and comes back');
});

test('a hard winter answered twice with your portion makes you generous; a brave child can take a hare', () => {
  const s = engine.createBirthGame({ seed: 'winter-nature', station: rollBirthCircumstances('winter-nature', 'bound', 'human') });
  applyPersonalityBuild(s, [], { creation: true });
  s.age = 10; s.day = 10 * 365; s.event = null;
  s.hero.marks = [{ id: 'brave', day: 0, source: 'life' }];
  for (const season of [39, 43]) {
    s.fortune.pending = { season, day: s.day };
    let event = null;
    flushWinterEvent(s, { setEvent: (id, title, category, body, choices) => { event = { id, choices }; s.event = event; } });
    assert.ok(event.choices.some(c => c.id === 'poach' && c.nature === 'brave'));
    s.event = null;
    assert.equal(applyWinterChoice(s, 'hard_winter', 'share', journal().ctx), true);
  }
  assert.ok(hasNature(s, 'generous'), 'two winters of giving');
  s.fortune.pending = { season: 47, day: s.day };
  assert.equal(applyWinterChoice(s, 'hard_winter', 'poach', journal().ctx), true);
  assert.equal(s.fortune.pending, null);
  // Under eight the adults decide and the child endures.
  const small = engine.createBirthGame({ seed: 'winter-small', station: rollBirthCircumstances('winter-small', 'bound', 'human') });
  small.age = 5; small.day = 5 * 365; small.event = null; small.fortune.pending = { season: 23, day: small.day };
  let shown = false;
  flushWinterEvent(small, { setEvent: () => { shown = true; }, journal: () => {} });
  assert.equal(shown, false); assert.equal(small.fortune.pending, null);
});

test('people hold you by what their own people respect', () => {
  assert.equal(cultureRegard('orc', 'honest'), 1);
  assert.equal(cultureRegard('orc', 'deceitful'), -1);
  assert.equal(cultureRegard('goblin', 'deceitful'), 1);
  assert.equal(cultureRegard('human', 'patient'), 0);
  const s = adult('regard', ['honest']);
  const orc = s.life.people.find(p => p.alive !== false && p.id !== 'kin');
  orc.appearance = { ...(orc.appearance || {}), ancestry: 'orc' }; orc.locationId = s.locationId; orc.bond = 50;
  s.hero.personality.cooldowns = {};
  applyPersonalityImpact(s, { kind: 'choice', eventId: 'career_invoice', id: 'community', label: 'tell the truth' });
  assert.equal(orc.bond, 51, 'an orc respects a plain account');
});
