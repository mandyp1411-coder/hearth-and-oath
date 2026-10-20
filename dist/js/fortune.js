// Fortune: the things that go wrong (and, less often, right) with a
// household's money, rolled once a season for adult lives. A life in this
// world is not a steady climb. Effects are immediate and recorded; nothing
// here opens a decision, so routines and journeys are never interrupted.
import { seededRoll } from './world.js';

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

export function initializeFortune(s) {
  if (!s.fortune) s.fortune = { version: 1, lastSeason: Math.floor(s.day / SEASON), incomeFactor: 1, factorUntil: 0, history: [] };
}

/** The multiplier this season's income carries (1 when nothing is in force). */
export function fortuneIncomeFactor(s, day = s.day) {
  const f = s.fortune;
  return f && f.factorUntil > day ? f.incomeFactor : 1;
}

export function onFortuneTime(s, { oldDay, newDay = s.day } = {}, ctx = {}) {
  if (!s.fortune || !s.life || s.phase === 'retired' || newDay <= oldDay) return;
  const f = s.fortune;
  // Childhood seasons pass without a roll; the household's money is not the child's yet.
  if (s.age < 18) { f.lastSeason = Math.floor(newDay / SEASON); return; }
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
  return !!f && f.version === 1 && int(f.lastSeason) && typeof f.incomeFactor === 'number' && f.incomeFactor >= 0 && f.incomeFactor <= 2 && int(f.factorUntil)
    && Array.isArray(f.history) && f.history.length <= 40 && f.history.every(h => h && typeof h.id === 'string' && int(h.day) && h.day <= s.day + SEASON && int(h.gold));
}
