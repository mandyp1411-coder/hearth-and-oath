import { skillOf, tacticOf } from './combat-moves.js';
import { advancedTechnique } from './techniques-v27.js';
import { arcanePower } from './combat-rules.js';

const CALLINGS = Object.freeze({ mira: 'guardian', orrin: 'elementalist', kest: 'ranger', sable: 'healer', tovin: 'knight', vesper: 'bard' });
const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const title = value => value.charAt(0).toUpperCase() + value.slice(1);
function roleOf(role) {
  const value = typeof role === 'string' ? role.toLowerCase() : '';
  if (/heal|herbal|medic|priest/.test(value)) return 'healer';
  if (/mage|scholar|caster|arcan|ritual/.test(value)) return 'mage';
  if (/rogue|scout|ranger|thief|assassin|bard/.test(value)) return 'rogue';
  return 'warrior';
}
function readiness(game, companion, actor) {
  const stage = game.rpg?.companionStages?.[companion.id];
  if (companion.alive === false || stage?.status === 'dead') return { code: 'dead', label: 'Deceased', detail: 'Remembered, not available for battle. These are recorded combat values, not restored resources.' };
  if (stage?.status === 'departed') return { code: 'departed', label: 'Departed', detail: 'They have left the traveling circle and are not available to invite.' };
  if (stage?.status === 'away') return { code: 'away', label: 'Away', detail: Number.isFinite(stage.awayUntil) ? `Attending their own work until day ${stage.awayUntil}.` : 'Attending their own work; no return day is recorded.' };
  if (!companion.recruited) return { code: 'unrecruited', label: 'Not recruited', detail: 'An invitation is required before they can travel with you.' };
  if (!Number.isFinite(companion.hp)) return { code: 'unknown', label: 'Health not recorded', detail: 'Legacy battle defaults are shown below; viewing does not restore health or make them entry-ready.' };
  if (actor.hp <= 0) return { code: 'downed', label: 'Downed', detail: `${companion.active ? 'Active slot' : 'In reserve'} · recover health before battle entry.` };
  if (!companion.active) return { code: 'reserve', label: 'In reserve', detail: 'Not in the battle party. Invite them to an available active slot when their own boundaries and your preparations allow.' };
  const active = (game.companions || []).filter(c => c.recruited && c.active).slice(0, 3);
  if (!active.some(c => c.id === companion.id)) return { code: 'outside', label: 'Outside active three', detail: 'Only the first three active companion slots enter battle.' };
  return { code: 'ready', label: 'Active · Health ready', detail: 'Has health for battle entry. Focus costs still apply to each move.' };
}

/** One detached, non-mutating read model for Party and newly created actors.
 * Saved battles retain their captured actors. This does not recruit, heal, grant
 * growth or change which companions the existing battle-entry rules select. */
export function companionCombatProfile(game = {}, companion = {}) {
  const victories = Math.max(0, number(companion.combatExperience));
  const growthEnabled = game.revision >= 5;
  const step = growthEnabled ? Math.min(9, Math.floor(Math.sqrt(victories) / 2)) : 0;
  const role = roleOf(companion.role);
  const maxHp = Math.max(1, number(companion.maxHp, role === 'warrior' ? 44 : 34));
  const maxMp = Math.max(0, number(companion.maxMp, role === 'warrior' ? 16 : 24));
  const actor = {
    id: companion.id, name: companion.name, side: 'party', role,
    hp: clamp(number(companion.hp, maxHp), 0, maxHp), maxHp,
    mp: clamp(number(companion.mp, maxMp), 0, maxMp), maxMp,
    agility: Math.max(1, number(companion.agility, role === 'rogue' ? 7 : 4)),
    attackPower: (role === 'warrior' ? 11 : role === 'rogue' ? 10 : 7) + step,
    attributes: { intellect: 4 + step, willpower: 4 + step, strength: 4 + step, agility: 4 + step },
    skills: { arcana: 2 + Math.floor(step / 2), devotion: 2 + Math.floor(step / 2) },
    armor: (role === 'warrior' ? 1 : 0) + Math.floor(step / 3),
    defending: false, status: {},
    ...(game.rpg ? { specialization: CALLINGS[companion.id], trainedTechniques: Array.isArray(game.rpg.companionStages?.[companion.id]?.trainedTechniques) ? game.rpg.companionStages[companion.id].trainedTechniques.filter(id => typeof id === 'string') : [] } : {}),
  };
  const skill = skillOf(actor), tactic = tacticOf(actor);
  const moves = [
    { id: 'attack', label: 'Attack', cost: 0, kind: 'Damage', description: 'Strike a living enemy without spending magic.' },
    { id: 'skill', ...skill, kind: skill.targetSide === 'party' ? 'Support' : 'Damage / control' },
    { id: 'tactic', ...tactic, kind: tactic.targetSide === 'party' ? 'Support' : 'Control' },
    { id: 'defend', label: 'Defend', cost: 0, kind: 'Protection', description: 'Draw enemy attacks and reduce incoming damage by 65% until your next turn. Recover 2 MP.' },
  ];
  const techniques = (actor.trainedTechniques || []).flatMap(id => {
    const technique = advancedTechnique(id);
    return technique ? [{ id: 'tech_' + id, label: technique.name, cost: technique.cost, description: technique.description, targetSide: technique.targetSide, kind: technique.targetSide === 'party' ? 'Support' : 'Damage / control' }] : [];
  });
  const nextAt = growthEnabled && step < 9 ? 4 * (step + 1) ** 2 : null;
  return {
    actor, role: title(role), calling: actor.specialization ? title(actor.specialization) : title(role),
    attack: actor.attackPower, armor: actor.armor, initiative: actor.agility, spellPower: arcanePower(actor),
    moves, techniques, readiness: readiness(game, companion, actor),
    legacyDefaults: !Number.isFinite(companion.hp) || !Number.isFinite(companion.mp),
    growth: { enabled: growthEnabled, step, max: 9, victories, nextAt, remaining: nextAt === null ? null : Math.max(0, nextAt - victories) },
  };
}
