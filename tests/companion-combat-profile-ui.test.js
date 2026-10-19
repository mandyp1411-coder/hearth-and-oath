import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEventOption, validateSave, migrateSave } from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { companionCombatProfile } from '../dist/js/companion-combat-profile.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Read-only handler evidence uses a controlled valid save. It does not claim
// recruitment or progression was earned by playing the game.
let base;
async function fixture() {
  if (!base) {
    base = await createLifeAtAge({ name: 'Rowan', seed: 'companion-combat-party-handler', startAge: 18, difficulty: 'gentle' });
    for (let n = 0; base.event && n < 100; n++) {
      const choice = base.event.choices.find(c => ['continue', 'keep', 'care', 'pause', 'leave', 'later', 'friends'].includes(c.id) && !c.disabledReason) || base.event.choices.find(c => !c.disabledReason);
      base = chooseEventOption(base, choice.id);
    }
    assert.ok(!base.event); assert.ok(validateSave(base));
  }
  const s = structuredClone(base);
  for (const [i, c] of s.companions.entries()) { c.recruited = true; c.active = i < 3; c.combatExperience = i * i * 4; }
  return s;
}
const snapshot = ui => JSON.stringify([ui.current(), ui.lives()]);

test('actual Party route shows one collapsed profile per recruited person and retains exact life and saved slots', async t => {
  const s = await fixture(); assert.ok(validateSave(s)); assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))), s);
  const ui = await mountApp(t, { states: [s] }); await ui.click('title-continue');
  const before = snapshot(ui); await ui.click('tab', 'party');
  const profiles = ui.root.querySelectorAll('[data-companion-profile]');
  assert.equal(profiles.length, s.companions.length); assert.ok(profiles.length >= 6);
  assert.equal(ui.root.querySelectorAll('.companion-card').length, profiles.length);
  for (const c of s.companions) {
    const node = ui.root.querySelector(`[data-companion-profile="${c.id}"]`), p = companionCombatProfile(s, c);
    assert.ok(node); assert.notEqual(node.getAttribute('open'), true); assert.ok(!node.open);
    assert.equal(node.querySelectorAll('details').length, 0, 'no nested disclosures or new action controls');
    for (const text of [`Health ${p.actor.hp}/${p.actor.maxHp}`, `Focus ${p.actor.mp}/${p.actor.maxMp}`, `Attack ${p.attack}`, `Armor ${p.armor}`, `Initiative ${p.initiative}`, p.calling]) assert.ok(node.textContent.includes(text), `${c.id}: ${text}`);
    assert.equal(node.querySelectorAll('[data-companion-move]').length, p.moves.length + p.techniques.length);
  }
  assert.equal(snapshot(ui), before);
  // Native disclosure state is presentation-only. The fixture does not emulate
  // browser summary activation or CSS geometry; it verifies app preservation.
  const mira = ui.root.querySelector('[data-companion-profile="mira"]'); mira.open = true; await ui.fire('toggle', mira);
  await ui.click('tab', 'character'); await ui.click('tab', 'party');
  assert.equal(ui.root.querySelector('[data-companion-profile="mira"]').open, true);
  assert.ok(!ui.root.querySelector('[data-companion-profile="orrin"]').open);
  assert.equal(snapshot(ui), before);
  const shown = ui.root.querySelector('[data-companion-profile="mira"]'); shown.open = false; await ui.fire('toggle', shown);
  await ui.click('tab', 'life'); await ui.click('tab', 'party');
  assert.equal(ui.root.querySelector('[data-companion-profile="mira"]').open, false); assert.equal(snapshot(ui), before);
});

test('Party availability remains visible outside the disclosure, and view navigation cannot heal or revive', async t => {
  const s = await fixture(), [mira, orrin, kest, sable, tovin, vesper] = s.companions;
  mira.hp = 0; orrin.active = false; s.rpg.companionStages.orrin.status = 'away'; s.rpg.companionStages.orrin.awayUntil = s.day + 28;
  kest.active = false; s.rpg.companionStages.kest.status = 'departed';
  sable.alive = false; sable.active = false; sable.hp = 0; s.rpg.companionStages.sable.status = 'dead';
  const remembered = s.lineage.people.find(p => p.source === 'companion' && p.localId === sable.id); assert.ok(remembered); remembered.alive = false;
  tovin.active = false; vesper.active = false; assert.ok(validateSave(s));
  const ui = await mountApp(t, { states: [s] }); await ui.click('title-continue'); const before = snapshot(ui); await ui.click('tab', 'party');
  for (const [c, code] of [[mira, 'downed'], [orrin, 'away'], [kest, 'departed'], [sable, 'dead'], [tovin, 'reserve'], [vesper, 'reserve']]) {
    const node = ui.root.querySelector(`[data-companion-profile="${c.id}"]`), card = node.closest('.companion-card');
    const readiness = card.querySelector(`[data-companion-readiness="${code}"]`);
    assert.ok(readiness); assert.equal(readiness.closest('details'), null);
  }
  await ui.click('tab', 'life'); await ui.click('tab', 'party'); assert.equal(snapshot(ui), before);
  assert.equal(ui.current().companions.find(c => c.id === 'mira').hp, 0);
  assert.equal(ui.current().companions.find(c => c.id === 'sable').alive, false);
});
