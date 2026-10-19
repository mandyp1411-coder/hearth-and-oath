import { createBattle, combatProfile, combatTraining } from './combat.js';
import { arcanePower } from './combat-rules.js';

export function combatOutlook(battle) {
  const allies = battle.actors.filter(a => a.side === 'party' && a.hp > 0);
  const foes = battle.actors.filter(a => a.side === 'enemy' && a.hp > 0);
  if (!allies.length || !foes.length) return null;
  const physical = a => a.attackPower ?? (['mage','healer','civilian'].includes(a.role) ? 5 + Math.floor((a.attributes?.strength || 3) / 2) : 6 + (a.attributes?.[a.role === 'rogue' ? 'agility' : 'strength'] || 3)) + (a.skills?.[a.role === 'rogue' ? 'stealth' : 'weapons'] || 0) + (a.gear?.attack || 0);
  const averageArmor = foes.reduce((n, a) => n + (a.armor || 0), 0) / foes.length;
  const offense = allies.reduce((n, a) => n + Math.max(1, physical(a) - averageArmor + (a.mp >= 4 && !['healer','civilian'].includes(a.role) ? 5 : 0), a.mp >= 5 && a.role === 'mage' ? arcanePower(a) + 2 : 0), 0);
  const rounds = Math.max(1, foes.reduce((n, a) => n + a.hp + (a.status.ward || 0), 0) / offense);
  // Party reserves help absorb a sustained encounter, while a severely injured
  // companion remains a visible focus-fire risk even in a large group.
  const exposed = [...allies].sort((a,b) => a.hp - b.hp)[0];
  const incoming = foes.reduce((n, a) => n + Math.max(1, (a.attackPower || 5) - (a.role === 'spirit' ? 0 : exposed.armor || 0)), 0);
  const reserves = allies.reduce((n,a)=>n+a.hp+(a.status.ward||0),0);
  const pressure = incoming * Math.max(.5, rounds - .5) * .7 / Math.max(1, reserves * .6 + exposed.hp * .4);
  const fragile = exposed.hp < exposed.maxHp * .3 && incoming >= exposed.hp;
  const band = pressure >= 1.25 ? 'Overwhelming' : pressure >= .75 || fragile ? 'Dangerous' : rounds > 1.5 || pressure >= .35 ? 'Contested' : 'Favorable';
  const mode = allies.length === 1 ? 'Solo' : `Party of ${allies.length}`;
  const warning = band === 'Overwhelming' ? 'An exposed ally may fall before the opposition breaks. Recover, bring willing companions or choose another route.' : band === 'Dangerous' ? 'Expect serious injury without guarding, healing or disruption. Keep a retreat available.' : band === 'Contested' ? 'Expect a reply. Focus a foe, guard an exposed ally and read prepared attacks.' : 'Your current build and numbers have the advantage. Enemy intent and remaining resources still matter.';
  return { band, mode, partyActions: allies.length, enemyActions: foes.length, estimatedRounds: Math.ceil(rounds), warning, summary: `${mode} · ${band}. ${allies.length} allied / ${foes.length} enemy actions per full round. ${warning}`, caveat: 'Rough estimate from current health, power and armor; healing, speed, area attacks, control and elemental matchups can change it.' };
}
export function encounterOutlook(game, encounterId, context = null) {
  return combatOutlook(createBattle(game, encounterId, context, { openingTurns: false }));
}
export function combatTrainingView(game) {
  const p = combatProfile(game), active = game.revision >= 5;
  const rows = Object.entries(game.hero.skills).map(([id, raw]) => ({ id, raw, effective: active ? combatTraining(raw) : raw, use: ({ defense: 'Armor = floor(combat defense / 3) + gear.', weapons: 'Added to weapon attacks.', arcana: 'Added to arcane spells.', devotion: 'Added to sacred spells; half contributes to advanced healing.', stealth: 'Added to rogue weapon attacks.', survival: 'Opens wilderness techniques and life routes.', scholarship: 'Opens learned techniques and life routes.', persuasion: 'Opens social techniques and peaceful routes.' })[id] || 'Supports its trained life routes.' }));
  return { ...p, rows, explanation: active ? 'Life training stays uncapped in your record. Combat uses the full first 12 points, then 12 + 0.8 × √(raw − 12), up to 36. Attributes use the same conversion before gear; curse modifiers apply first. Scholarship and survival unlock options rather than adding their entire raw value to damage.' : 'This older life uses its captured training rules. Raw skills and attributes convert directly before equipment and ability formulas.' };
}
export function defeatGuidance(battle) {
  const allies = battle.actors.filter(a => a.side === 'party' && !a.ephemeral);
  const foes = battle.actors.filter(a => a.side === 'enemy' && a.hp > 0);
  const depleted = allies.every(a => a.mp < 4);
  const reason = allies.length === 1 && foes.length > 1 ? `You faced ${foes.length} surviving enemies alone, giving them more actions each round.` : depleted ? 'The party ran short of magic for its trained techniques and support.' : foes.some(a => a.status.charged) ? 'A surviving foe still held a prepared charge; disruption or guarding can blunt it.' : 'The opposition outlasted the party’s remaining health and protection.';
  return `${reason} Next: recover health and magic in Health & care. ${allies.length === 1 ? 'People and Party can help you find willing companions; solo lives can use preparation, negotiated passage or another route.' : 'Review active companions and use defense, wards or disruption against the announced intent.'} You can leave this encounter unfinished and return later.`;
}
