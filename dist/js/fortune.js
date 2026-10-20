// Fortune: the things that go wrong (and, less often, right) with a
// household's money, rolled once a season for adult lives. A life in this
// world is not a steady climb. Effects are immediate and recorded; nothing
// here opens a decision, so routines and journeys are never interrupted.
import { seededRoll } from './world.js';
import { hasNature, shiftNature } from './personality.js';

const SEASON = 92;

// weight: relative chance when a season rolls an event at all.
// A bad season happens about one year in three; a good one about one in eight.
const SHOCKS = [
  { id: 'bad_harvest', weight: 22, title: 'A thin harvest', text: ({ gold }) => `The harvest came in thin and every price in the market knows it. Provisions cost you ${gold} gold more than they should this season.`, gold: s => 20 + Math.floor(annualCost(s) * 0.12) },
  { id: 'war_tax', weight: 12, title: 'The levy', text: ({ gold }) => `The court's men come through with ledgers. A war tax of ${gold} gold, and no one asks whether you can spare it.`, gold: s => 25 + Math.floor(annualCost(s) * 0.15), onlyIf: s => s.realm?.wars?.some(w => w.status === 'active') },
  { id: 'theft', weight: 10, title: 'Robbed', text: ({ gold }) => `Someone knew where you kept it. ${gold} gold gone, and the lock was not even forced.`, gold: s => Math.min(Math.max(10, Math.floor(s.hero.gold * 0.25)), 150) },
  { id: 'lost_work', weight: 18, title: 'No work this season', text: () => `The work dried up. Whatever you earn this season, half of it goes to simply waiting for the next.`, incomeFactor: 0.5 },
  { id: 'repair', weight: 14, title: 'The roof', text: ({ gold }) => `The roof gave in the first hard rain. ${gold} gold to make it right, or live under the hole.`, gold: s => 15 + Math.floor(annualCost(s) * 0.1), onlyIf: s => !!s.life?.home?.tier && s.life.home.tier !== 'lodgings' },
  { id: 'rent_rise', weight: 10, title: 'The rent goes up', text: ({ gold }) => `The landlord has found someone who will pay more. You pay ${gold} gold to keep the door, or you look for another.`, gold: s => 12 + Math.floor(annualCost(s) * 0.08), onlyIf: s => (!s.life?.home?.tier || s.life.home.tier === 'lodgings') && !(s.family?.housing && s.family.housing !== 'secure') },
  { id: 'sick_season', weight: 10, title: 'A season lost to sickness', text: () => `Fever took the household for weeks. Little was earned and less was done.`, incomeFactor: 0.4, stress: 8 },
  { id: 'windfall', weight: 9, title: 'A stroke of luck', text: ({ gold }) => `A debt you had written off was paid, or a buyer paid more than the thing was worth. ${gold} gold you did not expect.`, gold: s => -(20 + Math.floor(annualCost(s) * 0.15)) },
  { id: 'good_year', weight: 6, title: 'A good season', text: () => `Prices held, the work was steady and the weather kind. For once, the season paid what it promised.`, incomeFactor: 1.3 },
];

function annualCost(s) { const tier = s.life?.home?.tier, sheltered = s.family?.housing && s.family.housing !== 'secure'; return 180 + (tier && tier !== 'lodgings' ? ({ cottage: 30, townhouse: 90, estate: 240 })[tier] ?? 0 : sheltered ? 0 : 60); }

export function initializeFortune(s, { attempt = 0 } = {}) {
  if (!s.fortune) s.fortune = { version: 1, lastSeason: Math.floor(s.day / SEASON), incomeFactor: 1, factorUntil: 0, history: [], ...(attempt ? { attempt } : {}) };
}
// A cradle drawn again after a childhood death rolls its winters afresh.
const salted = (f, salt) => f.attempt ? `${salt}:${f.attempt}` : salt;

/** The multiplier this season's income carries (1 when nothing is in force). */
export function fortuneIncomeFactor(s, day = s.day) {
  const f = s.fortune;
  return f && f.factorUntil > day ? f.incomeFactor : 1;
}

// The fourth season of a year, when the grain runs out before the cold does.
const WINTER = 3;
const caregiverOf = s => s.life.people.find(p => p.id === 'kin' && p.alive !== false) || s.life.people.find(p => ['parent', 'guardian'].includes(p.familyRole) && p.alive !== false);
const youngestSibling = s => s.family.members.filter(m => m.relationship === 'sibling' && m.availability === 'present' && m.personId).map(m => s.life.people.find(p => p.id === m.personId)).filter(p => p && p.alive !== false).sort((a, b) => a.age - b.age)[0] || null;
export const WINTER_EVENT = { id: 'hard_winter', ids: () => ({ hard_winter: ['share', 'hoard', 'endure', 'poach'] }) };
/** A hard winter in a poor childhood. The cold and the hunger land at once;
 * what the child does about them waits for the next quiet moment, and the
 * youngest in the house may not see the thaw. Children die of these; the
 * deaths are written with weight and are rare enough to land. */
function childhoodWinter(s, season) {
  const st = s.hero.station, f = s.fortune;
  if (!st || st.diet > 1 || season % 4 !== WINTER || !s.family || f.pending) return;
  if (seededRoll(s.seed, salted(f, `fortune:winter:${season}`), 100) >= (st.diet === 0 ? 24 : 12)) return;
  const thin = st.diet === 0;
  f.hardWinterUntil = season * SEASON + SEASON;
  s.life.health = Math.max(0, (s.life.health ?? 80) - (thin ? 10 : 6));
  s.life.stress = Math.min(100, (s.life.stress || 0) + 6);
  s.family.support = Math.max(0, s.family.support - 4);
  f.pending = { season, day: s.day };
  f.history.push({ id: 'hard_winter', day: season * SEASON, gold: 0 });
  f.history = f.history.slice(-40);
}
/** The winter's decision, once the calendar is quiet. A small child has none:
 * the adults decide, and the child endures. */
export function flushWinterEvent(s, ctx = {}) {
  const f = s.fortune;
  if (!f?.pending || s.event || s.battle || s.phase === 'retired') return false;
  if (s.age < 8) { applyWinterChoice(s, 'hard_winter', 'endure', ctx); return !!s.event; }
  const thin = s.hero.station?.diet === 0, carer = caregiverOf(s), youngest = youngestSibling(s);
  const body = thin
    ? `The winter is long and the grain ran out before it did. ${carer ? carer.name + ' eats last and least' : 'The adults eat last and least'}, and you are learning what hunger does to a night.${youngest ? ` ${youngest.name} has stopped crying about it, which is worse.` : ''}`
    : `A hard winter. The woodpile went early and the pot is thinner every week.${youngest ? ` ${youngest.name} coughs at night.` : ''} Everyone is shorter with each other.`;
  const choices = [
    { id: 'share', label: youngest ? `Give ${youngest.name} your portion` : 'Give your portion to whoever needs it', description: 'You go hungrier so someone smaller does not. It costs your own strength.' },
    { id: 'hoard', label: 'Keep back what you can', description: 'A heel of bread under the straw is yours. The house will notice less than you fear, and more than you hope.' },
    { id: 'endure', label: 'Endure it with the rest', description: 'Eat what you are given and wait for the thaw.' },
  ];
  if (['bound', 'common'].includes(s.hero.station?.id) && (hasNature(s, 'brave') || hasNature(s, 'deceitful'))) choices.push({ id: 'poach', label: 'Take a hare from the lord’s wood', description: 'Meat for the pot, if you are not seen. The keeper beats children he catches, and remembers them.', nature: hasNature(s, 'brave') ? 'brave' : 'deceitful' });
  ctx.setEvent?.('hard_winter', 'The dark of the year', 'Household', body, choices);
  return !!s.event;
}
export function applyWinterChoice(s, eventId, pick, ctx = {}) {
  const f = s.fortune;
  if (eventId !== 'hard_winter' || !f?.pending || !['share', 'hoard', 'endure', 'poach'].includes(pick)) return false;
  if (pick === 'poach' && !(hasNature(s, 'brave') || hasNature(s, 'deceitful'))) return false;
  if (s.event?.id === eventId) s.event = null;
  const { season } = f.pending; f.pending = null;
  const st = s.hero.station, thin = st.diet === 0, carer = caregiverOf(s), youngest = youngestSibling(s);
  f.winters = f.winters || { shared: 0, hoarded: 0 };
  let lossChance = thin ? 16 : 8, text = thin
    ? `The winter was long and the grain ran out before it did. ${carer ? carer.name + ' ate last and least' : 'The adults ate last and least'}, and you learned what hunger does to a night.`
    : `A hard winter. The woodpile went early and the pot was thinner every week; the household came through it leaner and shorter with each other.`;
  if (pick === 'share') { lossChance = Math.floor(lossChance / 2); s.life.health = Math.max(0, s.life.health - 6); f.winters.shared++; text += ` You gave your portion away more nights than you kept it.`; }
  else if (pick === 'hoard') { lossChance = Math.floor(lossChance * 1.5); s.family.support = Math.max(0, s.family.support - 6); f.winters.hoarded++; if (youngest) youngest.bond = Math.max(0, (youngest.bond || 0) - 5); text += ` You kept back what you could, and ate it alone in the dark.`; }
  else if (pick === 'poach') {
    if (seededRoll(s.seed, `fortune:poach:${season}`, 100) < 60) { lossChance = 0; s.life.health = Math.min(100, s.life.health + 4); text += ` One night you came back from the lord’s wood with a hare under your coat, and the house ate meat.`; }
    else { s.hero.hp = Math.max(1, s.hero.hp - 10); s.life.stress = Math.min(100, s.life.stress + 10); s.legal.evidence = (s.legal.evidence || 0) + 1; text += ` The keeper caught you in the lord’s wood and beat you for it; he will know your face now.`; }
  }
  // A death the child is old enough to remember; before three there is no grief to answer.
  if (youngest && s.age >= 3 && !f.winterLoss && seededRoll(s.seed, salted(f, `fortune:winter:loss:${season}`), 100) < lossChance) {
    const taken = ctx.killPerson?.(youngest.id, 'a winter fever', s.day, { title: `${youngest.name}`, text: `${youngest.name} took a fever in the dark of the year and did not see the thaw. ${carer ? carer.name + ' dug the grave' : 'The grave was dug'}; the ground was hard.` });
    if (taken) {
      f.winterLoss = { day: s.day, personId: youngest.id, name: youngest.name };
      text += ` ${youngest.name} took a fever and did not see the thaw.`;
      shiftNature(s, 'bereaved', 'A grave dug too young', `You were ${s.age} when ${youngest.name} died. You will not take the people you have for granted again.`, ctx);
    }
  }
  // Hunger writes a nature: what you did with your portion, twice over, is who you are.
  if (f.winters.shared >= 2 && !hasNature(s, 'generous')) shiftNature(s, 'generous', 'What hunger made of you', 'Two winters of giving your portion away. It is not a decision any more; it is who you are.', ctx);
  if (f.winters.hoarded >= 2 && !hasNature(s, 'greedy')) shiftNature(s, 'greedy', 'What hunger made of you', 'Two winters of bread under the straw. You will never again trust that there will be enough.', ctx);
  ctx.journal?.('A hard winter', text, 'household');
  s.notice = text;
  return true;
}

export function onFortuneTime(s, { oldDay, newDay = s.day } = {}, ctx = {}) {
  if (!s.fortune || !s.life || s.phase === 'retired' || newDay <= oldDay) return;
  const f = s.fortune;
  // Childhood seasons carry no money shocks; the household's money is not the
  // child's yet. Winters are another matter in a poor house.
  if (s.age < 18) {
    const current = Math.floor(newDay / SEASON);
    if (current - f.lastSeason > 1) f.lastSeason = current - 1;
    for (let season = f.lastSeason + 1; season <= current; season++) { f.lastSeason = season; childhoodWinter(s, season); }
    return;
  }
  // One roll per season boundary actually lived through in this step. A clock
  // moved by more than a season (an import, a long commitment) does not pile
  // up rolls: the missed seasons are treated as lived quietly.
  const current = Math.floor(newDay / SEASON);
  if (current - f.lastSeason > 1) f.lastSeason = current - 1;
  for (let season = f.lastSeason + 1; season <= current; season++) {
    f.lastSeason = season;
    // One roll in three seasons lands on something; the table decides what.
    if (seededRoll(s.seed, `fortune:season:${season}`, 100) >= 38) continue;
    const pool = SHOCKS.filter(e => !e.onlyIf || e.onlyIf(s));
    const total = pool.reduce((n, e) => n + e.weight, 0);
    let pick = seededRoll(s.seed, `fortune:pick:${season}`, total);
    const event = pool.find(e => (pick -= e.weight) < 0) || pool[0];
    const gold = event.gold ? event.gold(s) : 0;
    if (gold < 0) s.hero.gold -= gold; // a windfall
    else if (gold) {
      // A cost you cannot meet is owed, not forgiven. The debt ledger exists
      // only on new-edition lives; older saves simply pay what they can.
      const paid = Math.min(gold, Math.max(0, s.hero.gold)), short = gold - paid;
      s.hero.gold -= paid;
      if (short && s.householdBudget && s.householdBudget.debt !== undefined) s.householdBudget.debt += short;
    }
    if (event.incomeFactor) { f.incomeFactor = event.incomeFactor; f.factorUntil = season * SEASON + SEASON; }
    if (event.stress && s.life) s.life.stress = Math.min(100, (s.life.stress || 0) + event.stress);
    f.history.push({ id: event.id, day: season * SEASON, gold });
    f.history = f.history.slice(-40);
    ctx.journal?.(event.title, event.text({ gold: Math.abs(gold) }), 'household');
  }
}

export function validateFortune(f, s) {
  if (f === undefined) return true;
  const int = n => Number.isSafeInteger(n);
  return !!f && f.version === 1 && int(f.lastSeason) && (s.event?.id !== 'hard_winter' || !!f.pending) && (f.attempt === undefined || (int(f.attempt) && f.attempt >= 1 && f.attempt <= 12)) && typeof f.incomeFactor === 'number' && f.incomeFactor >= 0 && f.incomeFactor <= 2 && int(f.factorUntil)
    && (f.hardWinterUntil === undefined || int(f.hardWinterUntil))
    && (f.pending === undefined || f.pending === null || (f.pending && int(f.pending.season) && int(f.pending.day) && f.pending.day <= s.day))
    && (f.winters === undefined || (f.winters && int(f.winters.shared) && int(f.winters.hoarded) && f.winters.shared >= 0 && f.winters.hoarded >= 0))
    && (f.winterLoss === undefined || (f.winterLoss && int(f.winterLoss.day) && f.winterLoss.day <= s.day && typeof f.winterLoss.personId === 'string' && typeof f.winterLoss.name === 'string' && f.winterLoss.name.length <= 60))
    && Array.isArray(f.history) && f.history.length <= 40 && f.history.every(h => h && typeof h.id === 'string' && int(h.day) && h.day <= s.day + SEASON && int(h.gold));
}
