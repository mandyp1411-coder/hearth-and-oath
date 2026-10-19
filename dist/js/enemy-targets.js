// The current action only. This module reads captured battle actors; it never
// rolls, advances a plan, applies an effect or sorts the saved actor array.
const living = (battle, side) => (battle.actors || []).filter(a => a.side === side && a.hp > 0);
const firstBy = (actors, key, descending = false) => [...actors].sort((a, b) => (descending ? -1 : 1) * (key(a) - key(b)))[0];
const finite = value => Number.isFinite(value) ? value : 0;
const wardValue = value => Math.max(0, finite(value));

/**
 * `target` preserves the execution's nominal party selection, including the
 * remembered-target bookkeeping on self/support/group plans. `recipients`
 * describes this action's actual aim, not the next action in its cycle.
 * Typed and legacy battles deliberately retain their different injury ties.
 */
export function resolveEnemyTargets(battle, actor, { planned = battle.effectsVersion === 27 && Boolean(actor.planCycle?.length) } = {}) {
  const party = living(battle, 'party'), foes = living(battle, 'enemy');
  if (!party.length) return { target: null, recipients: [], secondaryRecipients: [], scope: 'none', reason: 'No living party target.' };
  const protector = party.find(a => a.status?.protecting);
  if (planned) {
    const plan = actor.planCycle?.[(actor.aiStep || 0) % actor.planCycle.length];
    if (!plan) return { target: null, recipients: [], secondaryRecipients: [], scope: 'none', reason: 'No current plan.' };
    const injured = () => firstBy(party, a => a.hp / a.maxHp);
    const policies = {
      largest_magic: () => firstBy(party, a => a.maxMp, true),
      largest_current_magic: () => firstBy(party, a => a.mp, true),
      least_armored: () => firstBy(party, a => a.armor || 0),
      highest_armor: () => firstBy(party, a => a.armor || 0, true),
      least_warded: () => firstBy(party, a => a.status?.ward || 0),
      most_warded: () => firstBy(party, a => a.status?.ward || 0, true),
      highest_agility: () => firstBy(party, a => a.agility, true),
      marked_prey: () => party.find(a => a.status?.pack_mark) || injured(),
      last_target: () => party.find(a => a.id === actor.lastTargetId) || injured(),
      last_attacker: () => party.find(a => a.id === battle.lastAttackerId) || firstBy(party, a => a.maxMp, true),
      unafraid_party: () => party.find(a => !a.status?.fear) || party[0],
      next_party_actor: () => party[0],
    };
    // In the original executor, guard wins even for mark, siphon and seal.
    // Self/support/group actions ignore this nominal selection for effects,
    // but still remember it after executing. Keep those behaviors separate.
    const target = protector || policies[plan.target]?.() || injured();
    const result = { target, plan, recipients: [target], secondaryRecipients: [], scope: 'party' };
    if (actor.status?.silenced && ['ritual', 'wave', 'burning_wave', 'mana_drain', 'seal_last_technique'].includes(plan.action)) {
      return { ...result, recipients: [], scope: 'none', reason: 'Silenced: this prepared action has no effect.' };
    }
    if (['burning_wave', 'drain_and_share'].includes(plan.action) && !actor.status?.charged) {
      return { ...result, recipients: [], scope: 'none', reason: 'Broken charge: this prepared action has no effect.' };
    }
    if (['wave', 'burning_wave', 'poisoning_wave'].includes(plan.action)) return { ...result, recipients: party, scope: 'all_party' };
    if (['charge', 'ritual', 'predict'].includes(plan.action)) return { ...result, recipients: [actor], scope: 'self', preparation: true, aim: plan.action === 'predict' ? target : null };
    if (plan.action === 'ward') {
      if (plan.target === 'all_enemies') return { ...result, recipients: foes, scope: 'all_enemies' };
      const recipient = plan.target === 'most_injured_enemy' ? firstBy(foes, a => a.hp / a.maxHp) : actor;
      return { ...result, recipients: recipient ? [recipient] : [], scope: recipient?.id === actor.id ? 'self' : 'enemy' };
    }
    if (plan.action === 'heal') {
      if (!(actor.status?.ward > 0 || foes.some(a => a.id !== actor.id))) return { ...result, recipients: [], scope: 'none', reason: 'Broken support: no regeneration.' };
      return { ...result, recipients: [actor], scope: 'self' };
    }
    if (plan.action === 'ally_ward_transfer') {
      const donor = firstBy(foes.filter(a => a.id !== actor.id), a => wardValue(a.status?.ward), true);
      return { ...result, recipients: [actor], donor: donor || null, scope: 'self' };
    }
    if (['drain', 'conditional_drain', 'drain_and_share'].includes(plan.action) && !(plan.action === 'conditional_drain' && target.hp >= target.maxHp / 2)) {
      const recoveryRecipient = plan.action === 'drain_and_share' && foes.find(a => a.id !== actor.id && a.hp < a.maxHp) || actor;
      return { ...result, recoveryRecipient };
    }
    return result;
  }
  const target = protector || (actor.aiKey === 'sniper'
    ? firstBy(party, a => a.maxMp, true)
    : [...party].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.hp - b.hp)[0]);
  const step = finite(actor.aiStep), key = actor.aiKey;
  const result = {
    target, recipients: [target], scope: 'party',
    // Legacy traits apply to the nominal target even during a support turn.
    secondaryRecipients: ['snare', 'barbed'].includes(actor.trait) && battle.round % 2 === 1 ? [target] : [],
    ...(key === 'leech' ? { recoveryRecipient: actor } : {}),
  };
  if ((key === 'keeper' && step % 3 === 1) || (key === 'archivist' && step % 3 === 2) || (key === 'captain' && step % 3 === 2) || (key === 'warden' && step % 3 === 2) || (key === 'covenant' && step % 3 === 0)) {
    return { ...result, recipients: party, scope: 'all_party' };
  }
  if (key === 'captain' && step % 3 === 1) return { ...result, recipients: foes, scope: 'all_enemies' };
  if (key === 'warder' && step % 2 === 0) {
    const recipient = firstBy(foes, a => a.hp / a.maxHp);
    return { ...result, recipients: recipient ? [recipient] : [], scope: recipient?.id === actor.id ? 'self' : 'enemy' };
  }
  if ((key === 'keeper' && step % 3 === 0) || (key === 'archivist' && step % 3 === 1) || (key === 'thornheart' && step % 2 === 1) || (key === 'warden' && step % 3 === 1) || (key === 'covenant' && step % 3 === 2)) {
    return { ...result, recipients: [actor], scope: 'self' };
  }
  return result;
}
