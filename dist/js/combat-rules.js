// Shared by player commands, enemy plans and their read-only previews.
const n = value => Number.isFinite(value) ? value : 0;
export function arcanePower(actor) {
  return 9 + Math.round((actor.attributes?.intellect ?? 4) * 1.3) + n(actor.skills?.arcana) + n(actor.gear?.magic);
}
export function sacredPower(actor) {
  return 9 + Math.round((actor.attributes?.willpower ?? 4) * 1.3) + n(actor.skills?.devotion) + n(actor.gear?.magic);
}
export function restorativePower(actor, base) {
  return base + Math.floor(n(actor.attributes?.willpower) / 2) + Math.floor(n(actor.skills?.devotion) / 2) + n(actor.gear?.magic);
}
export function elementalMultiplier(target, element) {
  return (target.weakness === element ? 1.4 : 1) * ((target.resistances || []).includes(element) ? .7 : 1);
}
export function resistsStatus(target, key) {
  return (target.resistances || []).includes(key) || target.bloodless === true && ['bleed', 'poison'].includes(key);
}
export function applyStatus(target, key, amount, turns, log = () => {}) {
  if (target.hp <= 0) return false;
  if (resistsStatus(target, key)) { log(`${target.name} resists ${key === 'burn' ? 'burning' : key}.`); return false; }
  target.status ||= {};
  target.status[key] = amount;
  if (turns !== undefined) target.status[key + 'Turns'] = turns;
  return true;
}
export function resistanceReadout(target) {
  const statuses = ['bleed', 'poison', 'burn', 'fear', 'silenced', 'rooted', 'stunned', 'weakened'];
  const immune = statuses.filter(key => resistsStatus(target, key));
  const elements = (target.resistances || []).filter(key => ['fire', 'ice', 'lightning', 'radiance', 'physical'].includes(key));
  return [immune.length ? `Resists status: ${immune.map(key => key === 'burn' ? 'burning' : key).join(', ')}.` : 'No declared status resistance.', elements.length ? `Damage resistance: ${elements.join(', ')} (30% less elemental damage).` : '', target.bloodless ? 'Carries no blood.' : ''].filter(Boolean).join(' ');
}

// The shared potion effect is intentionally independent of combat stats, roles
// and equipment. Invalid or downed targets never receive ordinary treatment.
export function healingPotionAmount(target) {
  if (!target || !Number.isFinite(target.hp) || !Number.isFinite(target.maxHp) || target.hp <= 0 || target.maxHp <= 0) return 0;
  return Math.max(0, Math.min(30, target.maxHp - target.hp));
}
