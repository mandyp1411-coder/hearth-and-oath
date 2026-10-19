// Shared move descriptions for battle commands and the read-only Party profile.
// These functions describe existing actions; they never spend resources.
export function skillOf(actor) {
  const earned = {
    guardian: { label: 'Intercept', cost: 4, targetSide: 'enemy', description: 'Strike, gain a 5-point ward, and guard the party until your next turn.' },
    berserker: { label: 'Reckless cleave', cost: 4, targetSide: 'enemy', description: 'Spend 4 health for a powerful strike. You must have more than 4 health.' },
    knight: { label: 'Challenge', cost: 4, targetSide: 'enemy', description: 'A disciplined strike weakens the enemy’s next attack by 3 and draws its allies toward your defense.' },
    healer: { label: 'Mend and ward', cost: 5, targetSide: 'party', description: 'Restore 20 health plus equipment spell power, then grant a 3-point ward.' },
    elementalist: { label: 'Elemental burst', cost: 5, targetSide: 'enemy', description: 'An armor-piercing spell leaves a 2-damage burn for two turns.' },
    druid: { label: 'Entangling roots', cost: 5, targetSide: 'enemy', description: 'Magic weakens the enemy’s next attack by 4, marks an opening, and restores 3 of your health.' },
    thief: { label: 'Feint and pilfer', cost: 4, targetSide: 'enemy', description: 'Steal up to 4 of an enemy’s ward before a precise strike, then weaken its next attack.' },
    ranger: { label: 'Marked shot', cost: 4, targetSide: 'enemy', description: 'A precise shot leaves two marked openings for party follow-ups.' },
    bard: { label: 'Rallying verse', cost: 4, targetSide: 'party', description: 'Restore up to 6 health and 3 MP to an ally, and grant a 4-point ward.' },
  };
  if (earned[actor.specialization]) return earned[actor.specialization];
  if (actor.specialization === 'paladin') return {
    label: 'Oath strike', cost: 5, targetSide: 'enemy',
    description: 'Strike with sacred power and protect the party until your next turn. Requires an intact oath.',
  };
  if (actor.specialization === 'necromancer') return {
    label: 'Grave lantern', cost: 6, targetSide: 'enemy',
    description: 'Drain an enemy, weaken its next attack, and gain a protective ward.',
  };
  if (actor.specialization === 'assassin') return {
    label: 'Exposed weakness', cost: 5, targetSide: 'enemy',
    description: 'A precise strike ignores armor and deals extra damage to wounded enemies.',
  };
  if (actor.role === 'healer') return {
    label: 'Mending light', cost: 5, targetSide: 'party',
    description: 'Restore 20 health to one living ally.',
  };
  if (actor.role === 'mage') return {
    label: 'Arc bolt', cost: 5, targetSide: 'enemy',
    description: 'A powerful spell ignores armor and grants you a small ward.',
  };
  if (actor.role === 'rogue') return {
    label: 'Feint', cost: 4, targetSide: 'enemy',
    description: 'Strike past armor and weaken the enemy’s next attack by 3.',
  };
  return {
    label: 'Shield bash', cost: 4, targetSide: 'enemy',
    description: 'A heavy strike; then draw enemy attacks and defend until your next turn.',
  };
}

export function tacticOf(actor) {
  const earned = {
    guardian: { label: 'Shield wall', cost: 4, targetSide: 'party', description: 'Grant an ally a 10-point ward, cleanse bleeding, and defend the party yourself.' },
    berserker: { label: 'Battle roar', cost: 3, targetSide: 'enemy', description: 'Mark every living enemy once and weaken all their next attacks by 2. No target required.', needsTarget: false },
    knight: { label: 'Hold the line', cost: 3, targetSide: 'enemy', description: 'Mark two openings, weaken the enemy’s next strike by 4, and guard the party.' },
    healer: { label: 'Restorative seal', cost: 4, targetSide: 'party', description: 'Restore 4 health, grant a 9-point ward, and cleanse bleeding, burning and weakness.' },
    elementalist: { label: 'Quenching wind', cost: 3, targetSide: 'enemy', description: 'Remove up to 8 enemy ward and weaken its next attack by 4.' },
    druid: { label: 'Wild renewal', cost: 4, targetSide: 'party', description: 'Restore 12 health plus equipment spell power, cleanse ongoing wounds, and grant a 3-point ward.' },
    thief: { label: 'Disarm', cost: 3, targetSide: 'enemy', description: 'Weaken the next attack by 5 and mark one opening. Even a guardian can be distracted.' },
    ranger: { label: 'Pinning shot', cost: 3, targetSide: 'enemy', description: 'A light shot weakens the next attack by 4 and causes 2 bleeding damage for two turns.' },
    bard: { label: 'Dissonant verse', cost: 3, targetSide: 'enemy', description: 'Mark two openings, weaken the next attack by 3, and grant every ally a 2-point ward.' },
  };
  if (earned[actor.specialization]) return earned[actor.specialization];
  if (actor.specialization === 'paladin') return {
    label: 'Oath shelter', cost: 4, targetSide: 'party',
    description: 'Restore 10 health, grant an 8-point ward, and cleanse one ally’s bleeding and weakness. Requires an intact oath.',
  };
  if (actor.specialization === 'necromancer') return {
    label: 'Ancestral bind', cost: 4, targetSide: 'enemy',
    description: 'Mark an enemy for the next two party hits (+4 damage each) and weaken its next strike by 4.',
  };
  if (actor.specialization === 'assassin') return {
    label: 'Bleeding edge', cost: 3, targetSide: 'enemy',
    description: 'A light strike opens a wound: 4 bleeding damage before the enemy’s next two turns. Also mark its next opening (+4 damage).',
  };
  if (actor.role === 'mage' || actor.role === 'healer') return {
    label: actor.role === 'healer' ? 'Cleansing ward' : 'Warding circle', cost: 4, targetSide: 'party',
    description: 'Grant a 9-point ward to a living ally and cleanse bleeding and weakness. Equipment spell power strengthens the ward.',
  };
  if (actor.role === 'rogue') return {
    label: 'Hamstring', cost: 3, targetSide: 'enemy',
    description: 'A light strike causes 3 bleeding damage before the next two enemy turns and marks its next opening (+4 damage).',
  };
  return {
    label: 'Expose guard', cost: 3, targetSide: 'enemy',
    description: 'Mark an enemy for the next two party hits (+4 damage each) and weaken its next strike by 3. Set up your allies.',
  };
}
