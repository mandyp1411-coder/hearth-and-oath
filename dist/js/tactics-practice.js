import { createBattle, takeBattleAction, takeBattleActionDetailed } from './combat.js';
import { resolveEnemyTargets } from './enemy-targets.js';
import { applyStatus } from './combat-rules.js';

// These fixed, fictional situations are not lives, save fields or unlocks.
// Enemy values/plans come from the public root_spoor encounter, never bosses.
export const TACTICS_LESSONS = Object.freeze([
  Object.freeze({ id: 'protect_ally', title: 'Protect an ally', objective: 'Draw the wolf’s next strike away from the injured practice ally.', hint: 'Read the current recipient, then use Defend. Guarding redirects this single-target strike and reduces its damage.', completion: 'You drew the actual strike away from your ally and absorbed its reduced damage.' }),
  Object.freeze({ id: 'disrupt_charge', title: 'Disrupt a visible charge', objective: 'Remove the boar’s prepared charge before its next heavy strike.', hint: 'Read the enemy or use the practice staff’s counter. Breaking the charge removes its bonus, not the underlying physical strike.', completion: 'You broke the visible charge before the boar acted. Its remaining base strike could still land.' }),
  Object.freeze({ id: 'exploit_weakness', title: 'Use an inspected weakness', objective: 'Read this wolf, then damage it with the element you discovered.', hint: 'Read the enemy first. Choose the matching spell afterward; ordinary attacks and guessing an element do not complete this lesson.', completion: 'You studied this foe, then spent real practice Focus on a spell matching its revealed weakness.' }),
  Object.freeze({ id: 'cleanse_wound', title: 'Cleanse a wound', objective: 'Remove the practice ally’s bleeding before their next turn.', hint: 'Select the injured ally as your support target, then use Cleansing ward. Healing alone does not remove the wound.', completion: 'You removed the bleeding and its duration before the ally’s next turn. The wound did not tick.' }),
]);

export const TACTICS_PRACTICE_NOTICE = 'Practice only. This fictional party uses the real battle rules. No days, life resources, rewards, discoveries, relationships, proof or deaths change. Leaving or reloading discards practice.';

const clone = value => structuredClone(value);
const actor = (battle, id) => battle.actors.find(a => a.id === id);
const lessonOf = id => TACTICS_LESSONS.find(lesson => lesson.id === id);
const amount = value => Number.isFinite(value) ? value : 0;

function trainingSource({ mage = false, healer = false, ally = false, allyAgility = 3 } = {}) {
  return {
    seed: 'tactics-rehearsal-28', revision: 5, difficulty: 'balanced', flags: {}, realm: {},
    rpg: { trainedTechniques: [], companionStages: {} },
    hero: {
      name: healer ? 'Practice healer' : mage ? 'Practice caster' : 'Practice guardian',
      path: mage || healer ? 'mage' : 'warrior', specialization: healer ? 'healer' : null,
      hp: 56, maxHp: 56, mp: 25, maxMp: 25, potions: 1, level: 1,
      attributes: { strength: 3, agility: 9, vitality: 4, intellect: 4, willpower: 4, presence: 3 },
      skills: { weapons: 2, defense: 3, arcana: mage ? 3 : 0, devotion: healer ? 3 : 0, stealth: 0, survival: 0, scholarship: 0, persuasion: 0 },
      condition: null,
    },
    equipment: { owned: mage ? ['starter_staff'] : [], equipped: { weapon: mage ? 'starter_staff' : null } },
    companions: ally ? [{ id: 'practice-ally', name: 'Practice ally', role: 'healer', recruited: true, active: true, alive: true, hp: 10, maxHp: 34, mp: 16, maxMp: 16, agility: allyAgility }] : [],
  };
}

function starterBattle(species, options) {
  const battle = createBattle(trainingSource(options), 'root_spoor', null, { openingTurns: false });
  // Bound the situation to one existing public starter, without copying stats,
  // constructing another enemy plan or changing any of its combat rules.
  battle.actors = battle.actors.filter(a => a.side === 'party' || a.illustration?.species === species);
  const ids = new Set(battle.actors.map(a => a.id));
  battle.turnOrder = battle.turnOrder.filter(id => ids.has(id));
  battle.currentActorId = battle.turnOrder[0];
  battle.title = 'Tactics rehearsal';
  battle.rewards = { gold: 0, exp: 0 };
  battle.log = ['A fictional practice situation. No life resources or progress can change.'];
  return battle;
}

export function createTacticsPractice(lessonId) {
  const lesson = lessonOf(lessonId);
  if (!lesson) throw new RangeError('Choose an available tactics lesson.');
  let battle;
  if (lessonId === 'protect_ally') {
    battle = starterBattle('wolf', { ally: true });
    const enemy = battle.actors.find(a => a.side === 'enemy');
    // Real opening commands let the actual wolf mark the injured ally, then
    // return to the guardian before its pack strike. No authored fake damage.
    battle = takeBattleAction(battle, 'inspect', enemy.id);
    battle = takeBattleAction(battle, 'inspect', enemy.id);
  } else if (lessonId === 'disrupt_charge') {
    battle = starterBattle('boar', { mage: true });
    // Let the normal enemy resolver prepare its visible charge.
    battle = takeBattleAction(battle, 'defend');
  } else if (lessonId === 'exploit_weakness') {
    battle = starterBattle('wolf', { mage: true });
  } else {
    battle = starterBattle('wolf', { healer: true, ally: true, allyAgility: 7 });
    // The captured training situation begins with a normal, two-turn wound.
    applyStatus(actor(battle, 'practice-ally'), 'bleed', 2, 2);
    // Use the ordinary healer role's Cleansing ward, not a specialist unlock.
    actor(battle, 'hero').specialization = null;
  }
  return { kind: 'tactics-practice', lessonId, status: 'active', battle, inspectedEnemyIds: [], acceptedActions: 0, feedback: lesson.objective };
}

function completedLesson(session, report) {
  if (!report.accepted) return false;
  const before = session.battle, command = report.afterCommand, after = report.battle;
  const source = actor(before, report.actorId), resultSource = actor(command, report.actorId);
  if (session.lessonId === 'protect_ally') {
    const ally = actor(before, 'practice-ally'), foe = before.actors.find(a => a.side === 'enemy' && a.hp > 0);
    if (!ally || ally.hp <= 0 || !foe || source.id === ally.id || resolveEnemyTargets(before, foe).target?.id !== ally.id) return false;
    const guardedFoe = actor(command, foe.id), actualFoe = actor(after, foe.id), actualSource = actor(after, source.id);
    return resultSource.defending && Boolean(resultSource.status.protecting)
      && resolveEnemyTargets(command, guardedFoe).target?.id === source.id
      && actualFoe.aiStep === foe.aiStep + 1 && actualFoe.lastTargetId === source.id
      && actor(after, ally.id).hp === ally.hp && actualSource.hp > 0
      && (actualSource.hp < resultSource.hp || amount(actualSource.status.ward) < amount(resultSource.status.ward));
  }
  if (session.lessonId === 'disrupt_charge') {
    const foe = actor(before, report.targetId), disrupted = actor(command, report.targetId), actual = actor(after, report.targetId);
    return Boolean(foe?.side === 'enemy' && foe.hp > 0 && amount(foe.status.charged) > 0
      && foe.planCycle?.[foe.aiStep % foe.planCycle.length]?.action === 'charged_strike'
      && disrupted?.hp > 0 && !disrupted.status.charged && !disrupted.status.stolenWard
      && actual.aiStep === foe.aiStep + 1);
  }
  if (session.lessonId === 'exploit_weakness') {
    const foe = actor(before, report.targetId), damaged = actor(command, report.targetId);
    return Boolean(foe?.side === 'enemy' && foe.hp > 0 && foe.status.inspected
      && session.inspectedEnemyIds.includes(foe.id) && report.actionId === 'spell_' + foe.weakness
      && damaged.hp < foe.hp && source.mp - resultSource.mp === 5);
  }
  const ally = actor(before, report.targetId), cleansed = actor(command, report.targetId), next = actor(after, report.targetId);
  return Boolean(ally?.id === 'practice-ally' && ally.hp > 0 && amount(ally.status.bleed) > 0 && amount(ally.status.bleedTurns) > 0
    && cleansed.hp > 0 && !Object.hasOwn(cleansed.status, 'bleed') && !Object.hasOwn(cleansed.status, 'bleedTurns')
    && source.mp - resultSource.mp === 4 && after.currentActorId === ally.id && next.hp === cleansed.hp);
}

/** Pure ephemeral-session transition. It deliberately has no life or save API. */
export function takeTacticsPracticeAction(session, actionId, targetId) {
  if (session?.kind !== 'tactics-practice' || !lessonOf(session.lessonId)) throw new TypeError('A tactics practice session is required.');
  const next = clone(session);
  if (session.status !== 'active') return next;
  const report = takeBattleActionDetailed(session.battle, actionId, targetId);
  next.battle = report.battle;
  if (!report.accepted) { next.feedback = report.reason; return next; }
  next.acceptedActions += 1;
  if (completedLesson(session, report)) {
    next.status = 'completed';
    next.feedback = lessonOf(session.lessonId).completion;
  } else if (next.battle.outcome) {
    next.status = 'ended';
    next.feedback = 'Practice ended without completing this objective. Retry the same situation or leave; your life has not changed.';
  } else next.feedback = lessonOf(session.lessonId).objective;
  if (actionId === 'inspect' && report.targetId && actor(report.afterCommand, report.targetId)?.status.inspected && !next.inspectedEnemyIds.includes(report.targetId)) next.inspectedEnemyIds.push(report.targetId);
  return next;
}
