import { createBattle, getBattleActions } from '../../dist/js/combat.js';
import { TECHNIQUES_V27 } from '../../dist/js/techniques-v27.js';
import { TACTICS_LESSONS, createTacticsPractice } from '../../dist/js/tactics-practice.js';

// Small captured inputs only. They never initialize a full life or save store.
export function resolverParityCases() {
  const cases = [];
  const add = (name, battle) => {
    for (const action of getBattleActions(battle)) {
      const target = battle.actors.find(a => a.hp > 0 && a.side === action.targetSide && (!action.targetIds || action.targetIds.includes(a.id)))?.id;
      cases.push({ name: `${name}/${action.id}`, battle, actionId: action.id, targetId: target });
      if (action.needsTarget) cases.push({ name: `${name}/${action.id}/missing-target`, battle, actionId: action.id, targetId: 'missing-actor' });
    }
    cases.push({ name: `${name}/unknown`, battle, actionId: 'unknown-command' });
    const depleted = structuredClone(battle);
    depleted.actors.find(a => a.id === depleted.currentActorId).mp = 0;
    cases.push({ name: `${name}/depleted`, battle: depleted, actionId: 'tactic', targetId: 'hero' });
    for (const outcome of ['victory', 'defeat', 'retreat']) cases.push({ name: `${name}/ended-${outcome}`, battle: { ...battle, outcome }, actionId: 'defend' });
  };
  for (const lesson of TACTICS_LESSONS) add(lesson.id, createTacticsPractice(lesson.id).battle);
  for (const path of ['warrior', 'mage', 'rogue']) {
    add('legacy-' + path, createBattle({ seed: 'practice-legacy-parity', flags: {}, companions: [], hero: {
      name: 'Legacy practice actor', path, specialization: null, hp: 56, maxHp: 56, mp: 25, maxMp: 25, potions: 1,
      attributes: { strength: 5, agility: 9, vitality: 4, intellect: 5, willpower: 4, presence: 3 },
      skills: { weapons: 2, defense: 3, arcana: 3, devotion: 3, stealth: 2, survival: 0, scholarship: 0, persuasion: 0 },
    } }, 'forest'));
  }
  for (const id of ['intercede', 'winter_prison', 'purifying_touch', 'venom_edge', 'second_wind', 'grave_attendant']) {
    const battle = createTacticsPractice('cleanse_wound').battle;
    const hero = battle.actors.find(a => a.id === 'hero');
    hero.specialization = TECHNIQUES_V27.find(t => t.id === id).classId;
    hero.trainedTechniques = [id];
    add('advanced-' + id, battle);
  }
  cases.push({ name: 'no-battle', battle: null, actionId: 'attack' });
  return cases;
}
