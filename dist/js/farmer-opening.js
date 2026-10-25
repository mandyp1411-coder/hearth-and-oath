// Read the actual unanswered birthday, never today's childhood catalogue.
// Old saves can have lost their captions while retaining the typed effects.
const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const generic = text => /^Choose this (?:action|approach)\.$/.test(text);
const PICKS = ['care', 'curiosity', 'courage'];
const quoted = choice => ['days', 'durationDays', 'cost', 'quotedCost'].some(key => choice[key] !== undefined && choice[key] !== 0);

function consequence(s, effect) {
  const words = ['No time passes.'], figures = ['No time passes.'];
  if (!plain(effect)) return null;
  if (['money', 'health', 'stress'].some(key => effect[key] !== undefined && !finite(effect[key]))) return null;
  if (effect.money < 0) {
    if (!finite(effect.money) || !finite(s.hero?.gold) || s.hero.gold < 0) return null;
    const lost = Math.min(s.hero.gold, -effect.money);
    if (lost > 0) { words.push('Coin will leave your purse.'); figures.push(`Up to ${lost} gold lost from your purse.`); }
    else { words.push('No gold to pay.'); figures.push('No gold to pay.'); }
  }
  else { words.push('No gold to pay.'); figures.push('No gold to pay.'); }
  if (effect.health < 0) {
    if (!finite(effect.health) || !finite(s.life?.health) || s.life.health < 0 || s.life.health > 100) return null;
    const lost = Math.min(s.life.health, -effect.health);
    if (lost > 0) { words.push('Your health may suffer.'); figures.push(`Bodily wellbeing −${lost}.`); }
  }
  if (effect.stress > 0) {
    if (!finite(effect.stress) || !finite(s.life?.stress) || s.life.stress < 0 || s.life.stress > 100) return null;
    const gained = Math.min(100 - s.life.stress, effect.stress);
    if (gained > 0) { words.push('Strain may rise.'); figures.push(`Stress +${gained}.`); }
  }
  let frayed = false;
  if (effect.bonds !== undefined && !plain(effect.bonds)) return null;
  for (const [id, amount] of Object.entries(effect.bonds || {})) {
    if (!finite(amount)) return null;
    if (amount >= 0) continue;
    // This is the same live-person lookup used by applyChildhoodScene.
    const person = s.life?.people?.find(p => p.id === id && p.alive !== false);
    if (!person) continue;
    if (!finite(person.bond) || person.bond < 0 || person.bond > 100) return null;
    const lost = Math.min(person.bond, -amount);
    if (!lost) continue;
    frayed = true;
    const who = typeof person.name === 'string' && person.name.trim() ? person.name : 'Someone you know';
    figures.push(`${who}: bond −${lost}.`);
  }
  if (frayed) words.push('A bond may fray.');
  return { words: words.join(' '), figures: figures.join(' ') };
}

/** A pure presentation of a captured age-sixteen farmer birthday. */
export function farmerOpeningEvent(s, ev) {
  if (!s?.farm || s.age !== 16 || s.timeline?.mode !== 'birth' || s.timeline.contentVersion !== 7 || ev?.id !== 'birth_year_16') return ev;
  const pending = s.timeline.storybook?.pending, scene = pending?.scene;
  if (!Number.isSafeInteger(s.day) || s.day < 0 || pending?.age !== s.age || pending?.day !== s.day || !plain(scene) || typeof scene.title !== 'string' || !scene.title.trim() || typeof scene.body !== 'string' || !scene.body.trim() || scene.title !== ev.title || scene.body !== ev.body || !Array.isArray(scene.choices) || !Array.isArray(ev.choices) || scene.choices.length !== 3 || ev.choices.length !== 3) return ev;
  if (new Set(ev.choices.map(c => c?.id)).size !== 3 || ev.choices.some((c, i) => !plain(c) || !plain(scene.choices[i]) || c.id !== PICKS[i] || scene.choices[i].id !== c.id || typeof c.label !== 'string' || !c.label.trim() || c.label !== scene.choices[i].label || quoted(c) || quoted(scene.choices[i]))) return ev;
  const costs = scene.choices.map(c => consequence(s, c.effect));
  if (costs.some(value => value === null)) return ev;
  let changed = false;
  const choices = ev.choices.map((choice, i) => {
    const risk = costs[i], caption = typeof choice.description === 'string' && !generic(choice.description) ? choice.description : '';
    const description = caption.endsWith(risk.words) ? caption : `${caption}${caption ? ' ' : ''}${risk.words}`;
    const prior = typeof choice.detail === 'string' && !generic(choice.detail) ? choice.detail : '';
    const detail = prior.endsWith(risk.figures) ? prior : `${prior}${prior ? ' ' : ''}${risk.figures}`;
    if (description === choice.description && detail === choice.detail) return choice;
    changed = true;
    return { ...choice, description, detail };
  });
  return changed ? { ...ev, choices } : ev;
}
