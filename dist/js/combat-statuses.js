const number = value => Number.isFinite(value) ? value : 0;
const words = value => String(value).replace(/^(tech|spell)_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const turns = count => `${count} turn${count === 1 ? '' : 's'} left`;
const actions = count => `${count} action${count === 1 ? '' : 's'}`;

/** Pure, detached display rows. Duration keys belong to effects, not badges. */
export function combatStatusRows(actor) {
  const status = actor?.status || {}, rows = [];
  const add = (key, label, detail) => rows.push({ key, label, detail });
  if (actor?.defending || status.protecting) {
    add('guard', actor.defending ? `Guarding${status.protecting ? ' · draws aimed actions' : ''}` : 'Intercepting · draws aimed actions',
      [actor.defending ? 'Reduces incoming hit damage by 65%, rounded up, before wards.' : '', status.protecting ? 'The first living protector draws aimed enemy actions; party-wide attacks still reach everyone.' : '', 'Ends at the start of this actor’s next turn.'].filter(Boolean).join(' '));
  }
  const definitions = {
    ward: n => [`Ward · ${n} damage blocked`, 'Absorbs incoming hit damage until these ward points are spent.'],
    marked: n => [`${n} opening${n === 1 ? '' : 's'} · +4 per hit`, 'Each party strike against this enemy spends one opening for 4 extra raw damage. In current-rule battles, striking a marked enemy also breaks its charge and stolen power.'],
    pack_mark: () => ['Prey mark', 'Pack strikes can gain power against this marked actor. Defending suppresses that bonus; Watch the Line clears the mark.'],
    charged: n => [`Charge · ${n} power`, 'Prepared power for this enemy’s announced action. Counters, disruption, inspection or a party hit on a marked or studied enemy can remove it. A charge does not guarantee damage.'],
    stolenWard: n => [`Stolen power · ${n}`, 'Existing ward taken by a siphon. Adds to a precision strike; counters and disruption can discard it.'],
    weakened: n => [`Weakened · next hit −${n}`, 'Reduces the next raw hit, then clears. Cleansing can remove it first.'],
    fear: n => [`Afraid · next hit −${n}`, 'In current-rule battles, reduces the next raw hit, then clears. Rally and cleansing can remove fear.'],
    rooted: n => [`Rooted · next hit −${n}`, 'In current-rule battles, reduces the next raw hit, then clears. This does not remove a turn or prevent a command.'],
    stunned: () => ['Stunned · miss next action', 'In current-rule battles, skips this actor’s next action when its turn begins.'],
    silenced: () => ['Silenced · this action', 'Blocks the affected magical commands for one accepted action. Physical attacks, defense and supplies remain available.'],
    sealed: n => [`Seal · ${actor?.sealedTechnique ? words(actor.sealedTechnique) : 'last technique'} · ${actions(n)}`, 'Only the named technique is blocked. The seal counts down on this actor’s accepted decisions, not rejected commands or another actor’s turn.'],
    veil: n => [`Veil · next hit −${n}`, 'In current-rule battles, reduces the next incoming raw hit by this amount, then clears.'],
    bramble: n => [`Bramble · ${n} retaliation`, 'In current-rule battles, deals this much damage back to an enemy that causes actual hit damage.'],
    exposedArmor: n => [`Armor exposed · −${n} armor`, 'Reduces effective armor by this amount, never below zero.'],
    phaseBonus: n => [`Heavy-strike bonus · +${n}`, 'Visible second-phase power added to the next charged strike, then spent.'],
    phaseTriggered: () => ['Second phase active', 'This enemy has already entered its announced second phase.'],
    inspected: () => ['Studied', 'Its weakness and resistances are shown below. Inspection breaks charge and stolen power and removes an opening ambush bonus. In current-rule battles, further party hits keep breaking prepared power.'],
    surrenderable: () => ['Surrender offered', 'Accept the offered surrender with the battle command to let this living enemy leave the fight.'],
    captured: () => ['Left fighting alive', 'This actor is no longer fighting after restraint or an accepted surrender.'],
    burning: () => ['Old burn record · inactive', 'This older burning entry has no ongoing damage tick in the current battle resolver. Cleansing can clear it.'],
  };
  const damageOverTime = { bleed: 'Bleeding', burn: 'Burning', poison: 'Poison' };
  for (const [key, value] of Object.entries(status)) {
    if (!value || key === 'protecting' || key.endsWith('Turns')) continue;
    const duration = number(status[key + 'Turns']);
    if (Object.hasOwn(damageOverTime, key)) {
      add(key, `${damageOverTime[key]} · ${number(value)} damage/turn${duration > 0 ? ' · ' + turns(duration) : ''}`, 'Loses this much Health at the start of its own turn while the effect has turns remaining. Cleansing can remove it; wards do not absorb this ongoing Health loss.');
      continue;
    }
    const [label, detail] = definitions[key]?.(typeof value === 'number' ? value : 1) || [words(key) + (typeof value === 'number' ? ` · ${value}` : ''), 'Recorded combat effect.'];
    add(key, label + (duration > 0 ? ' · ' + turns(duration) : ''), detail);
  }
  // The poison tick already has a default magnitude in execution. A legacy
  // duration-only poison is still an effect, not a reason to hide its damage.
  if (!status.poison && status.poisonTurns > 0) add('poison', `Poison · 2 damage/turn · ${turns(status.poisonTurns)}`, 'Loses 2 Health at the start of its own turn. Cleansing removes poison; wards do not absorb this ongoing Health loss.');
  return rows;
}
