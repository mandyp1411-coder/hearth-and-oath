import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEventOption, validateSave, migrateSave } from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { createBattle } from '../dist/js/combat.js';
import { planIntent } from '../dist/js/enemy-plans-v27.js';
import { resolveEnemyTargets } from '../dist/js/enemy-targets.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled valid captured battles, not earned-life or browser-layout proof.
let base;
async function fixture() {
  if (!base) {
    base = await createLifeAtAge({ name: 'Ash', seed: 'status-intent-handler', startAge: 18, difficulty: 'gentle' });
    for (let n = 0; base.event && n < 100; n++) {
      const choice = base.event.choices.find(c => ['continue', 'keep', 'care', 'pause', 'leave', 'later', 'friends'].includes(c.id) && !c.disabledReason) || base.event.choices.find(c => !c.disabledReason);
      base = chooseEventOption(base, choice.id);
    }
    assert.ok(!base.event); assert.ok(validateSave(base));
  }
  const s = structuredClone(base);
  for (const [i, c] of s.companions.entries()) { c.recruited = i < 3; c.active = i < 3; }
  s.battle = { ...createBattle(s, 'forest', null, { openingTurns: false }), instanceId: 'status-intent-controlled' };
  const b = s.battle, party = b.actors.filter(a => a.side === 'party'), foes = b.actors.filter(a => a.side === 'enemy');
  b.currentActorId = 'hero'; b.turnOrder = [...party.map(a => a.id), ...foes.map(a => a.id)];
  for (const a of party) { a.hp = a.maxHp; a.status = {}; }
  party[1].hp = 1;
  party[0].status = { poison: 3, poisonTurns: 2, ward: 8, sealed: 1 }; party[0].sealedTechnique = 'attack';
  foes[0].planCycle = [{ action: 'poisoning_strike', target: 'most_injured', amount: 2 }, { action: 'charge', target: 'self' }];
  foes[0].aiStep = 0; foes[0].status = { charged: 4, stolenWard: 3 }; foes[0].intent = planIntent(foes[0]);
  foes[1].planCycle = [{ action: 'wave', target: 'all_party', amount: -2 }]; foes[1].aiStep = 0; foes[1].status = {}; foes[1].intent = planIntent(foes[1]);
  assert.ok(validateSave(s)); assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))), s);
  return s;
}
const snapshot = ui => JSON.stringify([ui.current(), ui.lives()]);

test('actual actor cards join poison duration, explain effects and show current single/party-wide recipients without state writes', async t => {
  const s = await fixture(), ui = await mountApp(t, { states: [s] }); await ui.click('title-continue');
  const before = snapshot(ui), b = ui.current().battle, injured = b.actors.find(a => a.side === 'party' && a.hp === 1);
  assert.ok(ui.root.querySelector('[data-combat-status="poison"]').textContent.includes('Poison · 3 damage/turn · 2 turns left'));
  assert.equal(ui.root.querySelector('[data-combat-status="poisonTurns"]'), null);
  assert.doesNotMatch(ui.root.innerHTML, /PoisonTurns|Poison Turns/);
  assert.ok(ui.root.querySelector('[data-combat-status="sealed"]').textContent.includes('Seal · Attack · 1 action'));
  assert.ok(ui.root.querySelector('[data-combat-status="stolenWard"]').textContent.includes('Stolen power'));
  assert.match(ui.root.querySelector('[data-enemy-prediction="enemy-1"]').textContent, new RegExp(`Current recipient: ${injured.name}`));
  assert.match(ui.root.querySelector('[data-enemy-prediction="enemy-2"]').textContent, /Party-wide/);
  assert.match(ui.root.querySelector('[data-enemy-prediction-note]').textContent, /Guarding, Health, Focus, marks/);
  assert.match(ui.root.querySelector('[data-preview-explanation]').textContent, /immediate result before turn effects and enemy replies/);
  for (const details of ui.root.querySelectorAll('[data-combat-status-details]')) { assert.ok(!details.open); details.open = true; await ui.fire('toggle', details); }
  await ui.click('menu'); await ui.click('close-modal');
  for (const name of ['battle-target', 'battle-ally-target']) {
    const controls = ui.root.querySelectorAll(`[name="${name}"]`), control = controls.at(-1); assert.ok(control); control.checked = true; await ui.fire('change', control);
  }
  assert.equal(snapshot(ui), before); assert.ok(validateSave(ui.current()));
});

test('accepted Defend immediately refreshes the displayed predicted recipient without changing party-wide coverage', async t => {
  const s = await fixture(), ui = await mountApp(t, { states: [s] }); await ui.click('title-continue');
  const old = ui.root.querySelector('[data-enemy-prediction="enemy-1"]').textContent;
  await ui.click('battle-action', 'defend');
  const b = ui.current().battle, a = b.actors.find(a => a.id === 'hero'), e = b.actors.find(a => a.id === 'enemy-1');
  assert.equal(a.defending, true); assert.equal(a.status.protecting, true); assert.equal(resolveEnemyTargets(b, e).target.id, 'hero');
  const current = ui.root.querySelector('[data-enemy-prediction="enemy-1"]').textContent;
  assert.notEqual(current, old); assert.ok(current.includes(`Current recipient: ${a.name}`));
  assert.match(ui.root.querySelector('[data-enemy-prediction="enemy-2"]').textContent, /Party-wide/);
  assert.ok(ui.root.querySelector('[data-combat-status="guard"]').textContent.includes('Guarding'));
  assert.equal(a.status.sealed, undefined); assert.equal(a.sealedTechnique, undefined); assert.ok(validateSave(ui.current()));
});
