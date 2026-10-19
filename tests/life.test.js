import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeLife, lifeActions, applyLifeAction, applyLifeChoice, startYearPlan, continueYearPlan, yearPreview, validateLife, lifeEventIds } from '../dist/js/life.js';

function fixture(seed = 'a-civilian-life') {
  const state = {
    seed, day: 0, age: 18, phase: 'adult', locationId: 'home', world: generateWorld(seed),
    hero: { name: 'Rowan', gold: 40, path: 'mage', household: 'poor', profession: 'Healer', temperament: 'curious', belief: 'lantern', specialization: null, condition: null, hp: 50, maxHp: 60, mp: 20, maxMp: 30, exp: 0, skills: Object.fromEntries(['weapons', 'defense', 'arcana', 'devotion', 'stealth', 'survival', 'scholarship', 'persuasion'].map(k => [k, 0])) },
    flags: { education: 0 }, factions: { villagers: 0, academy: 0, order: 0, underworld: 0 }, obligations: [], companions: [], journal: [], event: null, battle: null,
  };
  initializeLife(state);
  return state;
}

function context(s, extras = {}) {
  const ctx = {
    setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; },
    spendDays(days) {
      const boundary = ctx.nextInterruptionDay?.();
      const actual = Math.max(0, Math.min(days, boundary == null ? days : boundary - s.day));
      s.day += actual; s.age = 18 + Math.floor(s.day / 365);
      if (s.hero.condition?.type === 'vampire') s.hero.condition.hunger = Math.min(100, s.hero.condition.hunger + actual * 2);
      for (const p of s.life.people) p.age = p.baseAge + Math.floor(s.day / 365);
      for (const child of s.life.children) child.age = Math.floor((s.day - child.bornDay) / 365);
      return actual;
    },
    earnExperience(amount) { s.hero.exp += amount; },
    journal(title, text, tag) { s.journal.push({ title, text, tag, day: s.day }); },
    standing(key, amount) { s.factions[key] = Math.max(-100, Math.min(100, s.factions[key] + amount)); },
    remember() {}, addObligation() {}, finishObligation() {}, breakOath() {}, witnesses() { return []; }, addEvidence(amount) { s.flags.evidence = (s.flags.evidence || 0) + amount; },
    nextInterruptionDay() { return s.hero.condition?.type === 'vampire' ? s.day + Math.max(0, Math.ceil((75 - s.hero.condition.hunger) / 2)) : null; },
    pendingNeed() { return s.hero.condition?.type === 'vampire' && s.hero.condition.hunger >= 75 ? 'vampire' : null; },
    ...extras,
  };
  return ctx;
}

const FREE_CHOICES = {
  life_healer_consent: 'living', life_scholar_citation: 'challenge', life_soldier_orders: 'appeal', life_herbalist_grove: 'teach', life_grove_return: 'mentor', life_family_roof: 'honest', life_friend_ambition: 'listen', life_friend_ward: 'clinic', life_rival_race: 'together', life_lantern_vigil: 'all', life_ancestor_chair: 'stories', life_secular_debate: 'evidence', life_noble_table: 'insist', life_budget_feast: 'help', life_smuggler_offer: 'decline', life_receipt_returns: 'defend', life_vampire_guest: 'dusk', life_wolf_confidant: 'boundary', life_partner_time: 'explain', life_child_school: 'public', life_child_question: 'ask', life_overwork: 'share', life_open_hearth: 'shelter', life_border_story: 'around', life_birthday: 'people', life_hunger: 'animal', life_budget: 'simplify',
};
function decide(s, ctx, choice) {
  const id = s.event.id;
  s.event = null;
  assert.equal(applyLifeChoice(s, id, choice || FREE_CHOICES[id] || 'fair', ctx), true);
}
function finishPlan(s, ctx) {
  for (let guard = 0; guard < 100 && s.life.plan; guard++) {
    if (s.event) decide(s, ctx);
    else continueYearPlan(s, ctx);
  }
  assert.equal(s.life.plan, null);
}

test('initialization adds remembered people without granting legacy resources or changing a pending situation', () => {
  const s = fixture(); delete s.life;
  s.event = { id: 'legacy-story', body: 'Keep me' }; s.battle = { turn: 3 }; s.journal.push({ text: 'An old memory' });
  const before = structuredClone(s);
  initializeLife(s, { migration: true });
  assert.deepEqual(s.hero, before.hero);
  assert.deepEqual(s.event, before.event); assert.deepEqual(s.battle, before.battle); assert.deepEqual(s.journal, before.journal);
  const initialized = structuredClone(s.life);
  initializeLife(s);
  assert.deepEqual(s.life, initialized);
  assert.equal(validateLife(s.life, s), true);
});

test('a planned year stops for genuine quarterly decisions, matches the baseline forecast, and records a birthday once', () => {
  const s = fixture(), ctx = context(s);
  const preview = yearPreview(s, { focus: 'livelihood', lifestyle: 'frugal' });
  startYearPlan(s, { focus: 'livelihood', lifestyle: 'frugal' }, ctx);
  assert.equal(s.day, 90); assert.ok(s.event.id.startsWith('life_')); assert.equal(s.life.yearHistory.length, 0);
  const halted = s.day;
  continueYearPlan(s, ctx);
  assert.equal(s.day, halted, 'continuing while a choice is unresolved does not advance');
  finishPlan(s, ctx);
  assert.equal(s.day, 365); assert.equal(s.age, 19);
  assert.equal(s.life.yearHistory[0].income, preview.income);
  assert.equal(s.life.yearHistory[0].expenses, preview.expenses);
  assert.equal(s.hero.gold, 40 + preview.income - preview.expenses);
  assert.equal(s.event.id, 'life_birthday');
  continueYearPlan(s, ctx);
  assert.equal(s.life.yearHistory.length, 1);
  assert.equal(validateLife(s.life, s), true);
});

test('the same seed and choices reproduce a life while independent seeds change people and dilemmas', () => {
  function live(seed) {
    const s = fixture(seed), ctx = context(s);
    startYearPlan(s, {}, ctx); finishPlan(s, ctx);
    return s;
  }
  assert.deepEqual(live('same'), live('same'));
  const a = live('different-a'), b = live('different-b');
  assert.notDeepEqual(a.life.people.map(p => p.name), b.life.people.map(p => p.name));
  assert.notDeepEqual(a.life.eventHistory, b.life.eventHistory);
});

test('partial annual periods accrue only actual time and stop before a known promise', () => {
  const s = fixture();
  let reviewed = false;
  const ctx = context(s, {
    nextInterruptionDay() { return reviewed ? null : 17; },
    pendingNeed() { return !reviewed && s.day >= 17 ? 'deadline_review' : null; },
    afterAction() { if (!reviewed && s.day >= 17) ctx.setEvent('deadline', 'An approaching promise', 'Obligation', 'Review it.', [{ id: 'review' }]); },
  });
  startYearPlan(s, {}, ctx);
  assert.equal(s.day, 17); assert.equal(s.event.id, 'deadline');
  assert.equal(s.life.plan.income, Math.floor(640 * 17 / 365));
  reviewed = true; s.event = null;
  finishPlan(s, ctx);
  assert.equal(s.day, 365);
  assert.equal(s.life.yearHistory[0].income, 640);
});

test('vampire annual planning stops at hunger and a free feeding leaves the year paused', () => {
  const s = fixture(), ctx = context(s);
  s.hero.condition = { type: 'vampire', hunger: 50 };
  startYearPlan(s, {}, ctx);
  assert.equal(s.day, 13); assert.equal(s.event.id, 'life_hunger'); assert.equal(s.hero.condition.hunger, 76);
  const gold = s.hero.gold;
  // Feeding is permitted to advance one recovery day while the planner itself remains stopped.
  ctx.spendDays = days => { s.day += days; s.hero.condition.hunger += days * 2; return days; };
  decide(s, ctx, 'animal');
  assert.equal(s.day, 14); assert.equal(s.hero.condition.hunger, 33); assert.equal(s.hero.gold, gold);
  assert.ok(s.life.plan); assert.equal(s.event, null);
  assert.equal(s.life.people.some(p => p.knownFacts.includes('vampire')), false);
});

test('an unaffordable standard offers a viable adjustment before deducting impossible expenses', () => {
  const s = fixture(), ctx = context(s);
  s.hero.gold = 0;
  assert.ok(yearPreview(s, { focus: 'rest', lifestyle: 'generous' }).warnings.length);
  startYearPlan(s, { focus: 'rest', lifestyle: 'generous' }, ctx);
  assert.equal(s.day, 0); assert.equal(s.hero.gold, 0); assert.equal(s.event.id, 'life_budget');
  decide(s, ctx, 'simplify');
  finishPlan(s, ctx);
  assert.ok(s.hero.gold >= 0); assert.equal(s.life.yearHistory.length, 1);
});

test('an emergency commission is paid for actual days, including a zero-day barrier', () => {
  for (const days of [0, 1, 2, 3]) {
    const s = fixture(), ctx = context(s, { nextInterruptionDay() { return days; } });
    s.hero.gold = 0;
    assert.equal(applyLifeChoice(s, 'life_budget', 'work', ctx), true);
    assert.equal(s.day, days);
    assert.equal(s.hero.gold, Math.floor(25 * days / 3));
  }
});

test('career mastery and a home follow actual experience and purchases, with no double fee', () => {
  const s = fixture(), ctx = context(s);
  assert.ok(lifeActions(s).find(a => a.id === 'life_promotion').disabledReason);
  s.hero.gold -= 10; ctx.spendDays(4);
  applyLifeAction(s, 'life_career_train', ctx);
  assert.equal(s.hero.gold, 30); assert.equal(s.life.career.experience, 8);
  s.life.career.experience = 20;
  applyLifeAction(s, 'life_promotion', ctx);
  assert.equal(s.life.career.rank, 1);
  assert.equal(yearPreview(s).income, Math.floor(760 * (365 - s.day) / 365));
  s.hero.gold = 200;
  applyLifeAction(s, 'life_goal_settle', ctx);
  s.hero.gold -= 120; ctx.spendDays(7); applyLifeAction(s, 'life_home_cottage', ctx);
  assert.equal(s.hero.gold, 80); assert.equal(s.life.home.tier, 'cottage');
  assert.equal(s.life.goals[0].completed, true);
  assert.equal(s.life.achievements.length, 1);
});

test('adult friendship, courtship, partnership, and adoption remain distinct choices', () => {
  const s = fixture(), ctx = context(s);
  assert.ok(lifeActions(s).find(a => a.id === 'life_court_river').disabledReason);
  for (let i = 0; i < 3; i++) applyLifeAction(s, 'life_visit_river', ctx);
  assert.ok(!lifeActions(s).find(a => a.id === 'life_court_river').disabledReason);
  applyLifeAction(s, 'life_court_river', ctx); decide(s, ctx, 'yes');
  assert.equal(s.life.courtshipId, 'river'); assert.equal(s.life.partnerId, null);
  applyLifeAction(s, 'life_visit_river', ctx);
  applyLifeAction(s, 'life_commit_river', ctx); decide(s, ctx, 'pledge');
  assert.equal(s.life.partnerId, 'river'); assert.equal(s.life.courtshipId, null);
  assert.ok(lifeActions(s).find(a => a.id === 'life_court_river').disabledReason, 'a committed partner is not offered a second courtship');
  s.life.home.tier = 'cottage';
  applyLifeAction(s, 'life_family', ctx); decide(s, ctx, 'adopt');
  assert.equal(s.life.children.length, 1);
  const born = s.life.children[0].bornDay;
  ctx.spendDays(365);
  assert.equal(s.life.children[0].age, 1); assert.equal(s.life.children[0].bornDay, born);
  assert.equal(s.life.people.find(p => p.id === 'river').age, 23);
  assert.equal(validateLife(s.life, s), true);
});

test('disclosure creates knowledge only in the named participant and rejected courtship cannot be forged', () => {
  const s = fixture(), ctx = context(s);
  s.hero.condition = { type: 'vampire', hunger: 0 };
  applyLifeChoice(s, 'life_vampire_guest', 'truth', ctx);
  assert.deepEqual(s.life.people.filter(p => p.knownFacts.includes('vampire')).map(p => p.id), ['fellow']);
  s.life.pendingEvent = { personId: 'kin' };
  assert.equal(applyLifeChoice(s, 'life_courtship', 'yes', ctx), false);
  assert.equal(s.life.courtshipId, null);
  assert.equal(applyLifeChoice(s, 'life_hunger', 'made_up', ctx), false);
});

test('twenty consecutive civilian years remain playable, age everyone, and preserve bounded event memory', () => {
  const s = fixture('a-long-life'), ctx = context(s);
  for (let year = 0; year < 20; year++) {
    if (s.event) decide(s, ctx);
    startYearPlan(s, { focus: 'livelihood', lifestyle: 'frugal' }, ctx);
    finishPlan(s, ctx);
    assert.equal(s.day, (year + 1) * 365);
    assert.equal(s.life.yearHistory.length, year + 1);
    assert.equal(validateLife(s.life, s), true);
  }
  assert.equal(s.age, 38); assert.equal(s.life.people.find(p => p.id === 'kin').age, 63);
  assert.ok(s.hero.gold > 0); assert.ok(s.life.eventHistory.length <= 160);
  assert.ok(new Set(s.life.eventHistory.map(e => e.id)).size >= 8);
});

test('extended-save validation rejects malformed nested data without throwing', () => {
  const base = fixture();
  for (const modify of [s => s.life.people[0] = null, s => s.life.goals.push(null), s => s.life.children.push(null), s => s.life.happiness = Infinity, s => s.life.partnerId = 'kin', s => s.life.yearHistory.push(null), s => s.life.eventHistory.push({ id: 'life_fake', day: 0, choice: 'x' }), s => s.life.pendingEvent = { personId: 'stranger' }]) {
    const s = structuredClone(base); modify(s);
    assert.equal(validateLife(s.life, s), false);
  }
  assert.ok(Object.keys(lifeEventIds()).length >= 25);
});
