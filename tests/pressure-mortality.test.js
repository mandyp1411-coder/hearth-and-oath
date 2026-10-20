import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { mortalityChance } from '../dist/js/health.js';

const human = { elder: 65, frail: 90, late: 105, extreme: 120 };
const fit = { life: { health: 85, stress: 15 }, health: { physical: [], care: {} }, householdBudget: { debt: 0 } };
const worn = { life: { health: 25, stress: 80 }, health: { physical: [{}], care: {} }, householdBudget: { debt: 200 } };

test('the death curve starts near the elder age and climbs; a worn body climbs faster', () => {
  assert.equal(mortalityChance(fit, 50, human, 85), 0);
  assert.ok(mortalityChance(fit, 65, human, 85) > 1 && mortalityChance(fit, 65, human, 85) < 3);
  assert.ok(mortalityChance(fit, 80, human, 85) > 15);
  for (const age of [65, 72, 80]) assert.ok(mortalityChance(worn, age, human, 25) > mortalityChance(fit, age, human, 85) * 2, `worn at ${age}`);
  assert.ok(mortalityChance(worn, 95, human, 25) <= 60);
});

test('a comfortable human life now ends in its seventies or eighties, not past a hundred', () => {
  // Simulate the yearly roll with a fixed healthy profile across many seeds.
  let total = 0, n = 0;
  for (let seed = 0; seed < 200; seed++) {
    let age = 60, alive = true;
    while (alive && age < 120) {
      const c = mortalityChance(fit, age, human, 85);
      const roll = (Math.imul((seed + 1) * 2654435761, age * 40503) >>> 0) % 10000 / 100;
      if (roll < c) alive = false; else age++;
    }
    total += age; n++;
  }
  const mean = total / n;
  assert.ok(mean >= 72 && mean <= 86, `mean age at death ${mean.toFixed(1)}`);
});

test('an untreated infection at its worst can end a life, through the public engine', () => {
  let died = 0, tried = 0;
  for (let i = 0; i < 6 && died === 0; i++) {
    let s = engine.createBirthGame({ seed: 'pressure-fatal-' + i });
    for (let n = 0; n < 400 && s.age < 18; n++) s = s.event ? engine.chooseEventOption(s, s.event.choices[0].id) : engine.ageUp(s);
    for (let n = 0; s.event && n < 20; n++) s = engine.chooseEventOption(s, s.event.choices[0].id);
    s.health.physical = [{ id: 'fatal-test', type: 'infection', severity: 3, sinceDay: s.day - 60, lastEffectDay: s.day - 14, careUntil: 0, acknowledged: true, circumstance: 'ordinary' }];
    s.life.health = 20;
    tried++;
    for (let n = 0; n < 40 && s.phase !== 'retired'; n++) {
      s = s.event ? engine.chooseEventOption(s, s.event.choices.find(c => c.id === 'continue')?.id || s.event.choices[0].id) : engine.ageUp(s);
    }
    if (s.phase === 'retired' && /left untreated/.test(s.health.deathCause || '')) died++;
  }
  assert.ok(died > 0, `an untreated severity-3 infection killed in at least one of ${tried} lives`);
});
