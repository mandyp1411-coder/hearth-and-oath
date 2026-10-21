// Station: what fate decides at birth. Two children born the same year in the
// same town live different lives because of it. The player chooses ancestry,
// looks, name, pronouns and nature; station, wealth and family are rolled,
// weighted by how rare each birth is. New-edition lives only.
import { seededRoll, generatePersonName } from './world.js';

// weight: births per thousand. gift: a birthday's pocket money from six.
// portion: what the household hands over at eighteen. dues: what a bound
// household owes the land each year. income: rents and allowances a year,
// for houses that own something. literacy: the chance anyone at home reads.
// diet and roof: 0 thin / 1 plain / 2 full / 3 rich, and 0 hovel / 1 cottage
// / 2 house / 3 hall. They decide who survives a hard winter.
export const STATIONS = Object.freeze([
  Object.freeze({ id: 'bound', label: 'Bound', weight: 350, means: 'poor', gift: 0, portion: 0, dues: 40, income: 0, literacy: 5, diet: 0, roof: 0, support: 40, physician: 'none', debt: [120, 320] }),
  Object.freeze({ id: 'common', label: 'Common and free', weight: 400, means: 'poor', gift: 1, portion: 8, dues: 0, income: 0, literacy: 15, diet: 1, roof: 1, support: 50, physician: 'none', debt: [0, 80] }),
  Object.freeze({ id: 'trade', label: 'Trade', weight: 170, means: 'tradesfolk', gift: 4, portion: 40, dues: 0, income: 0, literacy: 60, diet: 2, roof: 2, support: 60, physician: 'paid', debt: [0, 0] }),
  Object.freeze({ id: 'gentry', label: 'Gentry', weight: 60, means: 'noble', gift: 10, portion: 200, dues: 0, income: 120, literacy: 90, diet: 3, roof: 3, support: 68, physician: 'household', debt: [0, 0] }),
  Object.freeze({ id: 'noble', label: 'Noble', weight: 16, means: 'noble', gift: 25, portion: 600, dues: 0, income: 400, literacy: 98, diet: 3, roof: 3, support: 72, physician: 'household', debt: [0, 0] }),
  Object.freeze({ id: 'royal', label: 'Royal blood', weight: 4, means: 'noble', gift: 60, portion: 1500, dues: 0, income: 900, literacy: 100, diet: 3, roof: 3, support: 75, physician: 'household', debt: [0, 0] }),
]);
const ORDER = STATIONS.map(s => s.id);

// Each ancestry has its own ladder. The rank is how the household is spoken
// of where it lives; it is the same station under another name.
const LADDERS = Object.freeze({
  human: ['a serf family', 'a freeholder family', 'a guild family', 'a landed family', 'a titled house', 'a cadet line of the crown'],
  elf: ['a line without a grove', 'a young line', 'an archive line', 'an old line', 'an elder line', 'one of the first lines'],
  dwarf: ['a clanless family', 'hall-kin', 'a maker family', 'a forge-elder’s family', 'a clan lord’s house', 'the deep king’s line'],
  halfling: ['a tenant family', 'a garden family', 'a table-keeping family', 'an orchard-holding family', 'a hearth-elder’s house', 'the Thain’s line'],
  orc: ['a thrall family', 'a hearth family', 'a maker family', 'a warleader’s family', 'a chieftain’s house', 'the great chief’s line'],
  goblin: ['a quarter-bound family', 'a quarter family', 'a workshop family', 'a broker family', 'a quarter-master’s house', 'the Nest-mother’s line'],
  tiefling: ['a marked and bound family', 'a tolerated family', 'a letter-house family', 'a sheltered house', 'an old marked house', 'the Ember line'],
  beastfolk: ['a penned family', 'a path family', 'a landing family', 'a keeper family', 'a warden house', 'the Old Path line'],
});

export function stationById(id) { return STATIONS.find(s => s.id === id) || null; }
export function stationRank(station, ancestry = 'human') { return (LADDERS[ancestry] || LADDERS.human)[ORDER.indexOf(station)] || LADDERS.human[0]; }

/** Roll a station by rarity. `allowed` narrows the ladder when an origin's
 * story only fits some births; the weights keep their proportion. */
export function rollStation(seed, allowed = ORDER, salt = 'birth:station') {
  const pool = STATIONS.filter(s => allowed.includes(s.id));
  if (!pool.length) return 'common';
  const total = pool.reduce((n, s) => n + s.weight, 0);
  let pick = seededRoll(seed, salt, total);
  return (pool.find(s => (pick -= s.weight) < 0) || pool[0]).id;
}

/** What a birth decides: the record kept on the hero for the rest of the life. */
export function rollBirthCircumstances(seed, stationId, ancestry = 'human', attempt = 0) {
  const station = stationById(stationId) || stationById('common');
  const roll = (salt, range) => seededRoll(seed, `birth:${salt}${attempt ? ':' + attempt : ''}`, range);
  const freedom = station.id === 'bound' ? (roll('freedom', 100) < 35 ? 'owned' : 'bound') : 'free';
  const literate = roll('literacy', 100) < station.literacy;
  const debt = station.debt[1] ? station.debt[0] + roll('debt', station.debt[1] - station.debt[0] + 1) : 0;
  const ties = [];
  // The people a family knows are mostly its own people.
  const name = salt => generatePersonName(seed, `birth:tie:${salt}`, { appearance: { ancestry } });
  if (freedom === 'owned') ties.push({ kind: 'owes', name: name('holder'), note: 'holds the family’s bond' });
  else if (station.id === 'bound') ties.push({ kind: 'owes', name: name('lord'), note: 'holds the land your family works' });
  else if (debt) ties.push({ kind: 'owes', name: name('lender'), note: 'lent the household what it could not earn' });
  if (station.id === 'common' || station.id === 'trade') ties.push({ kind: 'knows', name: name('friend'), note: station.id === 'trade' ? 'speaks for your family at the guild table' : 'would take you in for a season' });
  if (station.id === 'trade' && roll('rival', 100) < 40) ties.push({ kind: 'hates', name: name('rival'), note: 'undercut your family and was undercut back' });
  if (['gentry', 'noble', 'royal'].includes(station.id)) {
    ties.push({ kind: 'knows', name: name('patron'), note: station.id === 'gentry' ? 'owes your family a favour at court' : 'sits at the same table as your house' });
    ties.push({ kind: 'hates', name: name('enemy'), note: station.id === 'royal' ? 'would be nearer the throne without your line' : 'has carried a grievance against your house for a generation' });
  }
  const nameWeight = station.id === 'royal' ? 'feared' : ['gentry', 'noble'].includes(station.id) ? 'weighted' : station.id === 'trade' ? 'known' : ancestry === 'tiefling' && station.id === 'bound' ? 'marked' : 'none';
  return { version: 1, id: station.id, rank: stationRank(station.id, ancestry), freedom, literate, debt, ties, nameWeight, diet: station.diet, roof: station.roof };
}

/** The station an heir is born to: the parent's, climbed by what the parent
 * built or fallen by what they owed. A bond not yet worked off passes down. */
export function heirStation(old, seed, ancestry = 'human') {
  const parent = old.hero.station;
  if (!parent) return null;
  let idx = ORDER.indexOf(parent.id);
  const tier = old.life?.home?.tier, debt = old.householdBudget?.debt || 0, gold = old.hero.gold || 0;
  if (tier === 'estate' && idx < 3) idx = 3;
  else if (tier === 'townhouse' && idx < 2) idx = 2;
  else if (gold >= 1500 && idx < 2) idx = 2;
  if (old.householdBudget?.fledDebt || (debt > 0 && (!tier || tier === 'lodgings'))) idx = Math.max(0, idx - 1);
  const st = rollBirthCircumstances(seed, ORDER[idx], ancestry);
  if (parent.freedom === 'owned' && (old.householdBudget?.bondedUntil || 0) > old.day) st.freedom = 'owned';
  if (st.id === 'bound' && debt > 0) st.debt = Math.min(1000, st.debt + Math.floor(debt / 2));
  return st;
}

/** Pocket money on a birthday from six to eighteen. */
export function birthdayGift(s) {
  const station = stationById(s.hero.station?.id);
  if (station) return station.gift;
  return s.hero.household === 'noble' ? 10 : s.hero.household === 'tradesfolk' ? 6 : 3;
}
/** What the household hands over, or hands down, at eighteen. */
export function comingOfAgePortion(s) { return stationById(s.hero.station?.id)?.portion || 0; }
/** Rents and allowances a year for houses that own land or hold office. */
export function stationIncome(s) { return s.hero.station && s.phase !== 'retired' ? stationById(s.hero.station.id)?.income || 0 : 0; }
/** What a bound household owes the land each year; an owned one owes more. */
export function stationDues(s) {
  const station = stationById(s.hero.station?.id);
  if (!station || !station.dues) return 0;
  return s.hero.station.freedom === 'owned' ? station.dues * 2 : station.dues;
}
/** Extra monthly chance of falling ill, from what the household eats and
 * sleeps under. Thin diet and a leaking roof are what kill children. */
export function stationHealthRisk(s) {
  const st = s.hero.station;
  if (!st) return 0;
  const diet = [1, 0, 0, -1][st.diet] ?? 0, roof = [1, 0, 0, 0][st.roof] ?? 0;
  return diet + roof + (s.age < 6 && st.diet <= 1 ? 1 : 0);
}
/** Who pays the healer for a child: nobody for the bound and the common,
 * the household for trade and above. */
/** A thin diet makes every fever worse: a sickness starts a step more severe. */
export function stationSeverity(s) { return s.hero.station?.diet === 0 ? 1 : 0; }
export function householdPhysician(s) { return stationById(s.hero.station?.id)?.physician || (s.hero.station ? 'none' : 'paid'); }

/** At eighteen the household hands over what it has: a portion for those
 * born to something, the family's debt and bond for those born owing. */
export function comeOfAge(s, ctx = {}) {
  const st = s.hero.station;
  if (!st || st.portionDay !== undefined) return;
  st.portionDay = s.day;
  const portion = comingOfAgePortion(s), b = s.householdBudget, holder = st.ties.find(t => t.kind === 'owes');
  if (portion) {
    s.hero.gold += portion;
    ctx.journal?.('Your portion', `You are eighteen. The house hands you ${portion} gold and the name that comes with it, and expects both to be spent well.`, 'household');
  }
  if (st.debt && b && b.debt !== undefined) {
    b.debt += st.debt;
    const bond = st.freedom === 'owned' ? 2 * 365 : 0;
    if (bond) b.bondedUntil = Math.max(b.bondedUntil || 0, s.day + bond);
    ctx.journal?.('What you were born owing', st.freedom === 'owned'
      ? `You are eighteen, and the bond ${holder ? holder.name + ' holds' : 'on your family'} is yours now: ${st.debt} gold, and two years of your labour before a copper of it is your own.`
      : `You are eighteen. The ${st.debt} gold your family owes ${holder ? holder.name : 'its lender'} is written against your name now.`, 'household');
  } else if (!portion && st.id === 'bound') {
    ctx.journal?.('No portion', `You are eighteen. There is no portion; there is the land, the dues on it, and the work.`, 'household');
  }
}

export function stationSummary(s) {
  const st = s.hero.station; if (!st) return '';
  const freedom = st.freedom === 'owned' ? 'The family is owned, its bond held by another.' : st.freedom === 'bound' ? 'The family is bound to the land it works.' : '';
  const letters = st.literate ? 'Someone at home reads.' : 'No one at home reads.';
  const owes = st.ties.find(t => t.kind === 'owes'), knows = st.ties.find(t => t.kind === 'knows'), hates = st.ties.find(t => t.kind === 'hates');
  return [`${st.rank[0].toUpperCase()}${st.rank.slice(1)}.`, freedom, letters,
    owes ? `The household owes ${owes.name}, who ${owes.note}.` : '',
    knows ? `It counts on ${knows.name}, who ${knows.note}.` : '',
    hates ? `It has an enemy in ${hates.name}, who ${hates.note}.` : '',
    st.nameWeight === 'feared' ? 'Your name is known before you are, and not always kindly.' : st.nameWeight === 'weighted' ? 'Your name opens doors; it also closes some.' : st.nameWeight === 'marked' ? 'Your name is marked, and some will beat you for it.' : ''].filter(Boolean).join(' ');
}

/** A life adds to the family's ties as it goes: a name that hates yours, a name that owes you a roof. Ten at most; the oldest that is not a creditor makes room. */
export const TIES_MAX = 10;
export function addStationTie(s, tie) {
  const ties = s?.hero?.station?.ties; if (!ties || !tie || !['owes', 'knows', 'hates'].includes(tie.kind)) return false;
  if (ties.some(t => t.kind === tie.kind && t.name === tie.name)) return false;
  ties.push({ kind: tie.kind, name: String(tie.name).slice(0, 60), note: String(tie.note || '').slice(0, 120) });
  if (ties.length > TIES_MAX) { const at = ties.findIndex(t => t.kind !== 'owes'); ties.splice(at >= 0 ? at : 0, 1); }
  return true;
}

export function validateStation(v, s) {
  if (v === undefined) return true;
  if (!v || typeof v !== 'object' || v.version !== 1 || !stationById(v.id)) return false;
  if (typeof v.rank !== 'string' || v.rank.length > 60 || !['free', 'bound', 'owned'].includes(v.freedom) || typeof v.literate !== 'boolean') return false;
  if (!Number.isSafeInteger(v.debt) || v.debt < 0 || v.debt > 1000 || ![0, 1, 2, 3].includes(v.diet) || ![0, 1, 2, 3].includes(v.roof)) return false;
  if (!['none', 'known', 'weighted', 'feared', 'marked'].includes(v.nameWeight)) return false;
  return Array.isArray(v.ties) && v.ties.length <= TIES_MAX && v.ties.every(t => t && ['owes', 'knows', 'hates'].includes(t.kind) && typeof t.name === 'string' && t.name.length <= 60 && typeof t.note === 'string' && t.note.length <= 120)
    && (v.portionDay === undefined || (Number.isSafeInteger(v.portionDay) && v.portionDay >= 0 && v.portionDay <= s.day));
}
