// The guild as a path: the first path built with the whole anatomy (v0.66).
// Ways in (born to it, apprenticed, bought, recruited, inherited); a daily life
// that changes (dues every season, the guild's work, fines, the monopoly, the
// journeyman's seasons on the road); its own people (the warden who speaks for
// you, the rival at the next bench, the rival guild, your apprentice); its own
// stories (the contract the court wants and the faith forbids, the strike, the
// secret, the succession); a world that reacts (the court taxes masters, the
// poor resent the mark, the rival guild undercuts); ways out (rise to the
// wardenship, betray it, be cast out, walk out); and a legacy (the name on the
// rolls, the feud, the arrears, the workshop) that passes to an heir.
//
// Built on the living world: the three guilds are its actors, their contracts,
// strikes and monopolies its events; this module reads those and adds the
// member's side. Threads follow living-world.js: open → scene → choice →
// follow-up → memory. Every life has it from v0.72.3 (a life that predates it
// begins it when read, with no guild family decided after the fact).
import { seededRoll, isSettlement, generatePersonName } from './world.js';
import { companionOpinion } from './battlecraft.js';
import { REGION_TEMPLATES } from './realm-content-v18.js';
import { hasNature, shiftNature, natureChoice } from './personality.js';
import { addStationTie } from './station.js';
import { seasonOf, activeEvents } from './living-world.js';
import { professionWage } from './careers.js';

export const GUILD_CRAFTS = Object.freeze(['blacksmith', 'merchant', 'miner']);
export const CRAFT_PROFESSION = Object.freeze({ blacksmith: 'Blacksmith', merchant: 'Merchant', miner: 'Miner' });
const PROFESSION_CRAFT = Object.freeze({ Blacksmith: 'blacksmith', Merchant: 'merchant', Miner: 'miner' });
const CRAFT_SKILL = Object.freeze({ blacksmith: 'defense', merchant: 'persuasion', miner: 'survival' });
export const GUILD_NAME = Object.freeze({ blacksmith: 'the smiths’ guild', merchant: 'the merchants’ guild', miner: 'the miners’ guild' });
const BENCH = Object.freeze({ blacksmith: 'the forge', merchant: 'the counting table', miner: 'the face' });
const MASTERPIECE = Object.freeze({ blacksmith: 'a lock with seven wards', merchant: 'a ledger that balances across three currencies', miner: 'a gallery timbered to hold' });
const SECRET = Object.freeze({ blacksmith: 'the quench that makes the guild’s steel', merchant: 'the cipher the guild’s ledgers are kept in', miner: 'the assay that tells the true vein from the false' });
export const RANKS = Object.freeze(['journeyman', 'master', 'warden', 'guildmaster']);
export const DUES = Object.freeze({ journeyman: 8, master: 12, warden: 0, guildmaster: 0 });
const CAREER_RANK = Object.freeze({ journeyman: 1, master: 2, warden: 3, guildmaster: 3 });
export const BUY_IN = 80, ARREARS_WARNING = 2, ARREARS_DOOR = 3, ARREARS_OUT = 4, WANDER_SEASONS = 3, MASTERPIECE_MASTERY = 2, MASTERPIECE_FEE = 40, FINE = 10, COURT_TAX = 20, SHARE = 6;
const LIMITS = Object.freeze({ threads: 10, history: 24 });

// The house convention: 'continue' is always the choice that lets the world take its course.
export const GUILD_EVENTS = { ids: () => ({ guild_invite: ['accept', 'continue'], guild_forbidden: ['work', 'refuse', 'persuade', 'continue'], guild_secret: ['sell', 'haggle', 'refuse', 'report', 'continue'], guild_succession: ['stand', 'back', 'continue'], guild_protege: ['speak', 'keep', 'continue'], guild_arrears: ['pay', 'time', 'continue'], guild_judgement: ['present', 'sweeten', 'continue'] }) };

export const guild = s => s.guild || null;
export const member = s => s.guild?.member || null;
const regionName = id => REGION_TEMPLATES.find(r => r.id === id)?.name || id;
const regionOf = (s, siteId) => s.realm?.sites?.[siteId]?.regionId || null;
const homeOf = s => s.life?.home?.locationId || s.hero.birthplaceId || 'home';
const placeName = (s, id) => s.world.locations.find(p => p.id === id)?.name || id;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const note = (ctx, title, text, tag = 'guild') => (ctx?.journalLiteral || ctx?.journal)?.(title, text, tag);
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const craftOf = s => PROFESSION_CRAFT[s.hero.profession] || null;
const ledger = (s, craft) => s.careers?.records?.[CRAFT_PROFESSION[craft]] || null;
const mastery = (s, craft) => ledger(s, craft)?.mastery || 0;
const waiting = s => s.event || s.battle || s.conversations?.pending || s.dungeon || s.maze || s.timeline?.journey || s.timeline?.yearTarget || s.careers?.batch || s.cartography?.offsite;
const peopleOf = s => (s.life?.people || []).filter(p => p.alive !== false);
const bond = (s, id, n) => { const p = peopleOf(s).find(p => p.id === id); if (p) p.bond = clamp((p.bond || 0) + n); };
const addTie = (s, tie) => addStationTie(s, tie);
const remember = (s, text) => { const g = guild(s); g.history.push({ day: s.day, text }); if (g.history.length > LIMITS.history) g.history.splice(0, g.history.length - LIMITS.history); };
/** The guild's seat: the hall at the capital of the region its actor sits in. */
export function guildSeat(s, craft) {
  const actor = s.living?.actors?.find(a => a.id === `guild:${craft}`), regionId = actor?.regionId || s.realm?.regions?.[0]?.id;
  const sites = Object.values(s.realm?.sites || {}).filter(x => x.regionId === regionId && !/^(seat|reach)-/.test(x.id) && isSettlement(s.world, x.id));
  const seat = sites.find(x => ['city', 'citadel', 'tower'].includes(s.world.locations.find(p => p.id === x.id)?.type)) || sites[0];
  return { regionId, locationId: seat?.id || homeOf(s) };
}
/** A journeyman credential from the apprenticeship bond, in a guild craft. */
const servedCraft = s => { const c = (s.education?.schooling?.credentials || []).find(c => c.kind === 'journeyman' && GUILD_CRAFTS.includes(c.major)); return c ? c.major : null; };
const syncCareerRank = s => { if (s.life?.career) s.life.career.rank = member(s) ? CAREER_RANK[member(s).rank] : Math.min(s.life.career.rank, 0); };

// ---------------------------------------------------------------------------
// Birth: a trade family may be a guild family, and that is a way in.
/** `born`: a guild family is something a birth decides. A life that predates the
 * guild (read with it from v0.72.3) is not given a family table after the fact. */
export function initializeGuild(s, { born = false } = {}) {
  if (s.guild) return;
  const trade = born && s.hero.station?.id === 'trade' && seededRoll(s.seed, 'guild:family', 100) < 55;
  const family = trade ? GUILD_CRAFTS[seededRoll(s.seed, 'guild:family:craft', GUILD_CRAFTS.length)] : null;
  s.guild = { version: 1, family, member: null, past: [], heir: null, threads: [], history: [], counters: { threads: 0 }, lastSeason: seasonOf(s.day) };
  if (family) { const parent = (s.life?.people || []).find(p => p.familyRole === 'parent'); if (parent) parent.occupation = family === 'merchant' ? 'merchant of the guild' : family; }
}

// ---------------------------------------------------------------------------
// Ways in.
export function joinReason(s, how) {
  const g = guild(s); if (!g || s.phase === 'retired') return 'The guild has no rolls here.';
  if (g.member) return `You are already on the rolls of ${GUILD_NAME[g.member.craft]}.`;
  if (s.age < 16) return 'The guild does not take children.';
  const craft = craftOf(s); if (!craft) return 'The guild takes only its own trade.';
  if (g.past.some(p => p.craft === craft && p.left === 'expelled')) return 'The guild struck your name out once. It does not take that name again at any price.';
  if (how === 'born') return g.family === craft ? null : 'Your family has no name at this guild’s table.';
  if (how === 'apprenticed') return servedCraft(s) === craft ? null : 'No master of this craft has signed your paper.';
  if (how === 'inherited') return g.heir?.craft === craft ? null : 'No name of yours is on these rolls.';
  if (how === 'bought') { if (s.age < 18) return 'The guild sells places to grown people.'; if (mastery(s, craft) < 1) return 'The guild buys work it has seen. Earn practitioner mastery first.'; return null; }
  return 'There is no door for you here.';
}
function enrol(s, craft, how, ctx) {
  const g = guild(s), seat = guildSeat(s, craft), standing = { born: 40, apprenticed: 35, bought: 20, recruited: 45, inherited: 30 }[how];
  const rivalPerson = peopleOf(s).find(p => p.role === 'rival');
  const warden = g.heir?.craft === craft && g.heir.warden ? g.heir.warden : generatePersonName(s.seed, `guild:warden:${craft}:${g.past.length}`);
  const sponsor = how === 'apprenticed' ? s.education?.schooling?.bond?.master || null : how === 'inherited' ? g.heir?.from || null : null; // the master who took you, or the parent whose name it was
  g.member = { craft, rank: 'journeyman', joinedDay: s.day, how, standing, seat: seat.locationId, region: regionOf(s, homeOf(s)) || seat.regionId, dues: { season: seasonOf(s.day), arrears: 0, paid: 0 }, wander: { seasons: 0, regions: [], done: how === 'inherited' }, assignment: null, masterpiece: null, rival: { id: rivalPerson?.id || null, name: rivalPerson?.name || generatePersonName(s.seed, `guild:rival:${craft}:${g.past.length}`), standing: 35 + seededRoll(s.seed, `guild:rival:standing:${s.day}`, 20), contests: [] }, warden: { name: warden, since: s.day - (6 + seededRoll(s.seed, `guild:warden:since:${s.day}`, 8)) * 365 }, apprentice: null, secret: null, masterSince: null, sponsor };
  if (how === 'inherited') g.heir = null;
  syncCareerRank(s);
  const name = GUILD_NAME[craft];
  const line = { born: `Your name was on the rolls of ${name} before you could write it. ${warden} reads it out at the table and nobody argues; the family has paid its dues for longer than you have been alive. You are a journeyman, which is what the family was hoping for, and the dues are yours now.`, apprenticed: `The paper from the bench${sponsor ? `, ${sponsor}’s mark on it,` : ''} and ${warden} looking at it longer than it needs. A journeyman of ${name}, then, by the master’s word. The dues are ${DUES.journeyman} gold a season and the hall will find you work whether or not you want it.`, bought: `Eighty gold on the table and ${warden} counting it twice. The guild takes your gold and not your name: a journeyman of ${name}, on the rolls, and every master in the hall knows what you paid and that you had to.`, recruited: `${warden} came to find you. The guild has seen your work and wants it inside the hall rather than against it. A journeyman of ${name}, with the dues waived this first season, which is as near to welcome as a guild comes.`, inherited: `${warden} finds the name in the old book and nods. The rolls remember the family; the dues owed on it are yours, and so is the bench. A journeyman of ${name}, which your parent was before you and would have wanted.` }[how];
  note(ctx, 'The rolls', line);
  remember(s, `Entered ${name} as a journeyman, ${{ born: 'born to it', apprenticed: 'by the master’s word', bought: 'for eighty gold', recruited: 'at the guild’s asking', inherited: 'by the name in the old book' }[how]}.`);
  if (how === 'recruited') g.member.dues.season = seasonOf(s.day) + 1;
  return true;
}

// ---------------------------------------------------------------------------
// Actions: what a member can do, where.
const action = (id, label, description, days = 0, cost = 0, reason = null) => ({ id, label, description, days, cost, group: 'Guild', ...(reason ? { disabledReason: reason } : {}) });
export function guildActions(s) {
  const g = guild(s); if (!g || s.phase === 'retired' || waiting(s) || !isSettlement(s.world, s.locationId)) return [];
  const rows = [], m = g.member, craft = craftOf(s);
  if (!m) {
    const struck = craft && g.past.some(p => p.craft === craft && p.left === 'expelled');
    const how = struck ? null : g.heir?.craft === craft ? 'inherited' : g.family && g.family === craft ? 'born' : servedCraft(s) === craft && craft ? 'apprenticed' : null;
    if (how) rows.push(action('guild_join', 'Put your name on the rolls', `${cap(GUILD_NAME[craft])} keeps its rolls at ${placeName(s, guildSeat(s, craft).locationId)}. ${how === 'born' ? 'The family’s name is on them already.' : how === 'apprenticed' ? 'The master’s paper is your word.' : 'The old book has the name.'} A journeyman pays ${DUES.journeyman} gold a season and does the guild’s work when it is given.`, 1, 0, joinReason(s, how)));
    else if (craft && s.age >= 18) rows.push(action('guild_buy_in', 'Buy a place on the rolls', `${BUY_IN} gold on the table and a journeyman’s place in ${GUILD_NAME[craft]}. The guild takes your gold and not your name; it will take years to forget what you paid.`, 1, BUY_IN, joinReason(s, 'bought') || (s.hero.gold < BUY_IN ? `You have ${s.hero.gold} gold.` : null)));
    return rows;
  }
  const name = GUILD_NAME[m.craft], here = regionOf(s, s.locationId), season = seasonOf(s.day);
  if (m.dues.arrears > 0) rows.push(action('guild_dues', `Settle your dues: ${m.dues.arrears * DUES[m.rank]} gold`, `${m.dues.arrears} season${m.dues.arrears === 1 ? '' : 's'} owed to ${name}. At ${ARREARS_OUT} the name comes off the rolls.`, 0, m.dues.arrears * DUES[m.rank], s.hero.gold < m.dues.arrears * DUES[m.rank] ? `You have ${s.hero.gold} gold.` : null));
  if (m.assignment && !m.assignment.done) rows.push(action('guild_assignment', `Do the guild’s work at ${placeName(s, m.assignment.locationId)}`, `${cap(m.assignment.what)}: six days, ${m.assignment.pay} gold from the hall’s chest, and the hall’s good opinion. Left undone when the year turns, a ${FINE}-gold fine and the warden’s long memory.`, 6, 0, m.assignment.locationId !== s.locationId ? `The work is at ${placeName(s, m.assignment.locationId)}.` : craft !== m.craft ? 'You have left the bench. The guild notices.' : null));
  if (m.rank === 'journeyman') {
    const wandered = m.wander.regions.includes(here), done = m.wander.done || m.wander.seasons >= WANDER_SEASONS;
    rows.push(action('guild_wander', 'Work a season as a journeyman on the road', `${WANDER_SEASONS} seasons in other regions’ halls before the masterpiece: ${m.wander.seasons} of ${WANDER_SEASONS} served. Six days at a strange bench for a good wage and a word in the hall’s book. Dues are waived while you are on the road.`, 6, 0, done ? 'Your road years are served.' : here === m.region ? 'Your own region does not count. Take the road.' : wandered ? `${regionName(here)} is already in the book. Another region.` : m.wander.lastSeason === season ? 'One season is one entry. Come back after the turn.' : craft !== m.craft ? 'A journeyman of the guild works its trade.' : null));
    rows.push(action('guild_masterpiece', `Make your masterpiece: ${MASTERPIECE[m.craft]}`, `Fourteen days and ${MASTERPIECE_FEE} gold of materials on ${MASTERPIECE[m.craft]}, and then the wardens look at it. Pass and you are a master of ${name}; fail and a year passes before they will look again.`, 14, MASTERPIECE_FEE, !done ? `The wardens will not look before the road years are served (${m.wander.seasons} of ${WANDER_SEASONS}).` : mastery(s, m.craft) < MASTERPIECE_MASTERY ? 'The wardens want journeyworker mastery in the trade before they look.' : m.masterpiece && s.day - m.masterpiece.day < 365 ? 'The wardens looked this year. Next year.' : craft !== m.craft ? 'A masterpiece is made at the bench you left.' : s.hero.gold < MASTERPIECE_FEE ? `You have ${s.hero.gold} gold.` : null));
  }
  if (['master', 'warden', 'guildmaster'].includes(m.rank)) rows.push(action('guild_apprentice', 'Take an apprentice', 'A child from the lower houses, bound to your bench for three years. They cost you time and teach you patience; the guild counts it toward the wardenship.', 1, 0, m.apprentice ? `${m.apprentice.name} is at your bench already.` : s.age < 25 ? 'The guild does not give children to the young.' : null));
  rows.push(action('guild_leave', `Walk out of ${name}`, `Your name off the rolls, no dues, no work, no hall. ${m.rank === 'journeyman' ? 'Journeymen leave; the guild shrugs.' : 'A master who walks out takes the guild’s secrets with him, and the guild knows it.'} Under a monopoly you will not work the trade in the guild’s regions again.`, 0, 0));
  return rows;
}
export function applyGuildAction(s, id, ctx = {}) {
  const g = guild(s); if (!g || typeof id !== 'string' || !id.startsWith('guild_')) return false;
  const m = g.member, craft = craftOf(s);
  if (id === 'guild_join') { const how = g.heir?.craft === craft ? 'inherited' : g.family && g.family === craft ? 'born' : servedCraft(s) === craft ? 'apprenticed' : null; if (!how || joinReason(s, how)) return false; return enrol(s, craft, how, ctx); }
  if (id === 'guild_buy_in') { if (joinReason(s, 'bought')) return false; return enrol(s, craft, 'bought', ctx); } // the engine took the fee
  if (!m) return false;
  if (id === 'guild_dues') { const owed = m.dues.arrears; if (!owed) return false; m.dues.paid += owed * DUES[m.rank]; m.dues.arrears = 0; m.dues.season = seasonOf(s.day); note(ctx, 'The dues', `${owed * DUES[m.rank]} gold into the hall’s chest, and the warden draws a line under your name without looking up. Paid.`); return true; }
  if (id === 'guild_assignment') { const a = m.assignment; if (!a || a.done || a.locationId !== s.locationId) return false; a.done = true; s.hero.gold += a.pay; m.standing = clamp(m.standing + 3); const r = ledger(s, m.craft); if (r) { r.workedDays += 6; r.paidWorkedDays += 6; r.experience = Math.min(1000000, r.experience + 6); } note(ctx, 'The guild’s work', `${cap(a.what)} at ${placeName(s, a.locationId)}, six days of it, and ${a.pay} gold from the hall’s chest. The warden writes it in the book, which is the point.`); return true; }
  if (id === 'guild_wander') { const here = regionOf(s, s.locationId); if (m.rank !== 'journeyman' || m.wander.done || here === m.region || m.wander.regions.includes(here) || m.wander.lastSeason === seasonOf(s.day)) return false; const pay = professionWage(s, 6) + 15; s.hero.gold += pay; m.wander.seasons++; m.wander.regions.push(here); m.wander.lastSeason = seasonOf(s.day); if (Number.isFinite(s.hero.skills?.[CRAFT_SKILL[m.craft]])) s.hero.skills[CRAFT_SKILL[m.craft]] += 1; if (m.wander.seasons >= WANDER_SEASONS) m.wander.done = true; note(ctx, 'The road years', `Six days at a strange bench in ${regionName(here)}, where they do the trade differently and say so. ${pay} gold and a word in the hall’s book: ${m.wander.seasons} of ${WANDER_SEASONS} seasons.${m.wander.done ? ' The road years are served. The wardens will look at a masterpiece now.' : ''}`); remember(s, `A season’s work on the road in ${regionName(here)}.`); return true; }
  if (id === 'guild_masterpiece') { if (m.rank !== 'journeyman' || !(m.wander.done || m.wander.seasons >= WANDER_SEASONS) || mastery(s, m.craft) < MASTERPIECE_MASTERY || m.masterpiece && s.day - m.masterpiece.day < 365) return false; const quality = clamp(20 + mastery(s, m.craft) * 8 + Math.min(8, s.hero.skills?.[CRAFT_SKILL[m.craft]] || 0) * 2 + (m.masterpiece?.polish || 0) + seededRoll(s.seed, `guild:masterpiece:${s.day}`, 30)); m.masterpiece = { day: s.day, quality, name: MASTERPIECE[m.craft], judged: false }; openThread(s, 'judgement', { quality }, ctx); note(ctx, 'The masterpiece', `Fourteen days on ${MASTERPIECE[m.craft]}, with the door shut and the ${MASTERPIECE_FEE} gold of materials on the bench. It is done, or as done as it will be. The wardens sit on the first of the month.`); return true; }
  if (id === 'guild_apprentice') { if (!['master', 'warden', 'guildmaster'].includes(m.rank) || m.apprentice || s.age < 25) return false; const name = generatePersonName(s.seed, `guild:apprentice:${s.day}`); m.apprentice = { name, since: s.day, progress: 0, bornDay: s.day - (12 + seededRoll(s.seed, `guild:apprentice:age:${s.day}`, 3)) * 365 }; note(ctx, 'An apprentice', `${name}, twelve or thirteen, from the lower houses, with a mark on the paper and a mother at the door who did not come in. Three years at your bench. They do not look at you when you speak, yet.`); remember(s, `Took ${name} as an apprentice.`); return true; }
  if (id === 'guild_leave') { leave(s, 'left', ctx); return true; }
  return false;
}
function leave(s, how, ctx) {
  const g = guild(s), m = g.member; if (!m) return;
  g.past.push({ craft: m.craft, rank: m.rank, from: m.joinedDay, to: s.day, how: m.how, left: how });
  g.member = null; syncCareerRank(s);
  const name = GUILD_NAME[m.craft];
  if (how === 'left') { if (m.rank !== 'journeyman') addTie(s, { kind: 'hates', name, note: 'a master who walked out of the hall with its secrets' }); note(ctx, 'The hall door', m.rank === 'journeyman' ? `You took your name off the rolls of ${name}. The warden shrugged. The dues stop; so does the work, and the hall’s word for you when you need it.` : `A master who walks out of ${name} takes its secrets with him, and the hall watched you go with that in its face. No bench of theirs will have you, and under their mark no bench at all.`); remember(s, `Walked out of ${name} as a ${m.rank}.`); }
  else if (how === 'expelled') { addTie(s, { kind: 'hates', name, note: 'struck your name from the rolls' }); ctx.standing?.('villagers', -2); note(ctx, 'Struck out', `The warden reads your name at the table and draws a line through it, and the hall is quiet while he does. ${name[0].toUpperCase()}${name.slice(1)} will not have you again at any price, and where its mark is on the doors you will not work the trade.`); remember(s, `Struck from the rolls of ${name}.`); }
}

// ---------------------------------------------------------------------------
// The seasonal tick: dues, the court's hand, the hall's share, the work, the apprentice, the stories.
function tickSeason(s, g, season, ctx) {
  const m = g.member; if (!m) { recruit(s, season, ctx); return; }
  const craft = craftOf(s), atBench = craft === m.craft, name = GUILD_NAME[m.craft], wandering = m.wander.lastSeason === season - 1 && m.rank === 'journeyman';
  // Dues, and the arrears that follow a thin purse.
  const dues = DUES[m.rank];
  if (dues && m.dues.season < season && !wandering) {
    if (s.hero.gold >= dues) { s.hero.gold -= dues; m.dues.paid += dues; m.dues.season = season; }
    else { m.dues.arrears++; m.dues.season = season; if (m.dues.arrears === ARREARS_WARNING) note(ctx, 'The dues', `Two seasons owed to ${name}. The warden says nothing, and writes it down.`); else if (m.dues.arrears === ARREARS_DOOR) openThread(s, 'arrears', { owed: m.dues.arrears * dues }, ctx); else if (m.dues.arrears >= ARREARS_OUT) { leave(s, 'expelled', ctx); return; } }
  }
  // The court taxes masters once a year; the poor resent the mark; the hall shares the prices under its monopoly.
  if (season % 4 === 0 && ['master', 'warden', 'guildmaster'].includes(m.rank)) { const tax = Math.min(COURT_TAX, s.hero.gold); s.hero.gold -= tax; if (tax < COURT_TAX && s.householdBudget) s.householdBudget.debt = (s.householdBudget.debt || 0) + (COURT_TAX - tax); note(ctx, 'The court’s hand', `${COURT_TAX} gold to the court’s man for the master’s tax, which the guild negotiated and the masters pay.${tax < COURT_TAX ? ' What the purse could not meet is written against the house.' : ''}`, 'household'); }
  const monopoly = activeEvents(s).find(e => e.kind === 'monopoly' && e.craft === m.craft && [regionOf(s, s.locationId), regionOf(s, homeOf(s))].includes(e.regionId));
  if (monopoly) { s.hero.gold += SHARE; if (season % 4 === 1) ctx.standing?.('villagers', -1); }
  // The hall's work is given each spring and fined when a year has passed with it undone.
  if (m.assignment && !m.assignment.done && season - m.assignment.season >= 4 && !wandering) { const fine = Math.min(FINE, s.hero.gold); s.hero.gold -= fine; m.standing = clamp(m.standing - 4); note(ctx, 'Work left undone', `The hall’s work at ${placeName(s, m.assignment.locationId)} was not done, and the warden fined you ${FINE} gold for it in front of the table.`); m.assignment = null; }
  if (atBench && !wandering && m.rank !== 'guildmaster' && season % 4 === 1 && !(m.assignment && !m.assignment.done)) { const where = isSettlement(s.world, s.locationId) ? s.locationId : homeOf(s); const what = { blacksmith: ['the court’s horseshoes', 'nails for the new hall', 'the watch’s lantern fittings', 'a ploughshare run for the manor'], merchant: ['the hall’s accounts for the quarter', 'the salt convoy’s tallies', 'a buyer’s weights to check', 'the tithe barn’s ledger'], miner: ['the gallery props at the old working', 'a survey of the north face', 'sorting the court’s ore', 'the pump at the flooded shaft'] }[m.craft][seededRoll(s.seed, `guild:work:${season}`, 4)]; m.assignment = { season, locationId: where, what, pay: professionWage(s, 6) + 20, done: false }; }
  else if (!atBench && m.rank !== 'guildmaster') { m.assignment = null; if (season % 4 === 2) { m.standing = clamp(m.standing - 2); note(ctx, 'An empty bench', `${name[0].toUpperCase()}${name.slice(1)} notices your bench is empty and your dues still come. The warden asks after you, in the way wardens ask.`); } }
  if (atBench && !m.dues.arrears) m.standing = clamp(m.standing + 1);
  // The apprentice learns, and one day is done.
  if (m.apprentice) { m.apprentice.progress = clamp(m.apprentice.progress + 9 + (mastery(s, m.craft) >= 3 ? 3 : 0) + (hasNature(s, 'patient') ? 2 : 0)); if (m.apprentice.progress >= 100 && !g.threads.some(t => t.def === 'protege' && !t.closed)) openThread(s, 'protege', { name: m.apprentice.name }, ctx); }
  // The yearly prize at the hall's fair: you or the rival.
  if (season % 4 === 2 && atBench && m.rank === 'journeyman' && m.rival) { const won = seededRoll(s.seed, `guild:prize:${season}`, 100) < 35 + mastery(s, m.craft) * 8 + Math.min(20, s.hero.skills?.[CRAFT_SKILL[m.craft]] || 0) - Math.floor(m.rival.standing / 5); m.rival.contests.push({ season, won }); m.rival.contests = m.rival.contests.slice(-10); if (won) { m.standing = clamp(m.standing + 3); m.rival.standing = clamp(m.rival.standing - 2); if (m.rival.id) bond(s, m.rival.id, -3); } else { m.rival.standing = clamp(m.rival.standing + 3); } note(ctx, 'The hall’s prize', won ? `The hall’s prize at the fair went to your bench this year, and ${m.rival.name} watched it go.` : `The hall’s prize at the fair went to ${m.rival.name}’s bench this year, and the wardens said so loudly.`); }
  // Stories: the contract the court wants and the faith forbids; the secret; the succession.
  const home = regionOf(s, homeOf(s));
  if (!g.threads.some(t => !t.closed)) {
    const trouble = activeEvents(s).find(e => ['war', 'purge'].includes(e.kind) && e.regionId === home);
    if (trouble && seededRoll(s.seed, `guild:forbidden:${season}`, 100) < 30) openThread(s, 'forbidden', { kind: trouble.kind, eventId: trouble.id }, ctx);
    else if ((m.rank !== 'journeyman' || s.day - m.joinedDay >= 4 * 365) && m.secret === null && seededRoll(s.seed, `guild:secret:${season}`, 100) < 6) openThread(s, 'secret', { buyer: generatePersonName(s.seed, `guild:buyer:${season}`), guild: GUILD_NAME[GUILD_CRAFTS[(GUILD_CRAFTS.indexOf(m.craft) + 1) % 3]] }, ctx);
    else if (m.rank === 'master' && s.day - m.warden.since >= 12 * 365 && seededRoll(s.seed, `guild:succession:${season}`, 100) < 25) openThread(s, 'succession', { warden: m.warden.name, rival: m.rival.name }, ctx);
    else if (m.rank === 'journeyman' && s.day - m.warden.since >= 14 * 365 && season % 4 === 3) { const next = generatePersonName(s.seed, `guild:warden:${m.craft}:${season}`); note(ctx, 'A new warden', `${m.warden.name} is dead, or as good as, and ${name} has a new warden: ${next}, who does not know you and will.`); m.warden = { name: next, since: s.day }; }
  }
}
/** The ways in that come to you: the guild recruits a hand it has seen stand with it, or work it wants. */
function recruit(s, season, ctx) {
  const g = guild(s), craft = craftOf(s); if (!craft || s.age < 16 || g.past.some(p => p.craft === craft && p.left === 'expelled')) return;
  if (g.threads.some(t => t.def === 'invite' && season - t.season < 20)) return;
  const stood = (s.living?.threads || []).find(t => t.def === 'strike' && t.roles?.craft === craft && t.choice === 'continue' && season - t.season <= 3);
  const hiring = activeEvents(s).find(e => e.kind === 'works' && e.regionId === regionOf(s, s.locationId) && /guild/.test(e.text));
  if (stood || hiring && mastery(s, craft) >= 2 && seededRoll(s.seed, `guild:recruit:${season}`, 100) < 30) openThread(s, 'invite', { warden: generatePersonName(s.seed, `guild:warden:${craft}:${g.past.length}`), why: stood ? 'stood' : 'work' }, ctx);
}
export function onGuildTime(s, { newDay }, ctx = {}) {
  const g = guild(s); if (!g || s.phase === 'retired' || !s.realm) return;
  const to = seasonOf(newDay);
  for (let n = g.lastSeason + 1; n <= to; n++) {
    // A member who worked through the guild's own strike is struck out.
    const m = g.member; if (m) { const blackleg = (s.living?.threads || []).find(t => t.def === 'strike' && t.roles?.craft === m.craft && t.choice === 'work' && !t.guildSeen); if (blackleg) { blackleg.guildSeen = true; note(ctx, 'Blackleg', `The hall knows whose face was at the yard gate while it stood outside. ${GUILD_NAME[m.craft][0].toUpperCase()}${GUILD_NAME[m.craft].slice(1)} does not keep blacklegs on its rolls.`); leave(s, 'expelled', ctx); } }
    tickSeason(s, g, n, ctx);
    for (const t of g.threads) if (t.followUp && t.followUp.season <= n && !t.closed) followUp(s, n, t, ctx);
    g.lastSeason = n;
  }
}

// ---------------------------------------------------------------------------
// Threads: the scene, the choice, the memory.
const THREAD_COOLDOWN = 8;
function openThread(s, def, roles, ctx) {
  const g = guild(s), season = seasonOf(s.day); if (g.threads.filter(t => !t.closed).length >= 3) return null;
  if (def !== 'judgement' && def !== 'protege' && g.threads.some(t => t.def === def && season - t.season < THREAD_COOLDOWN)) return null;
  g.counters.threads++;
  const t = { id: `gt-${g.counters.threads}`, def, roles, season, stage: 'open', choice: null, followUp: null, memory: [], closed: false };
  g.threads.push(t); if (g.threads.length > LIMITS.threads) g.threads.splice(g.threads.findIndex(x => x.closed) >= 0 ? g.threads.findIndex(x => x.closed) : 0, 1);
  return t;
}
export function flushGuildEvent(s, ctx = {}) {
  const g = guild(s); if (!g || s.event || s.battle || s.phase === 'retired') return false;
  const t = g.threads.find(t => t.stage === 'open' && !t.closed); if (!t) return false;
  const m = g.member, r = t.roles, name = m ? GUILD_NAME[m.craft] : GUILD_NAME[craftOf(s) || 'blacksmith'];
  if (!m && t.def !== 'invite') { t.closed = true; return false; } // a story for a member the hall no longer has
  if (t.def === 'invite') { ctx.setEvent?.('guild_invite', 'A word from the hall', 'The guild', `${r.warden}, warden of ${name}, finds you at the bench. ${r.why === 'stood' ? 'The hall saw you stand with it outside the yard gate, and the hall has a long memory for that as well as the other thing.' : 'The hall has seen your work and would rather have it inside than against it.'} A journeyman’s place on the rolls, this season’s dues waived, and the guild’s work when it is given.`, [{ id: 'accept', label: 'Put your name on the rolls', description: `${DUES.journeyman} gold a season after this one, the hall’s work, the hall’s word.` }, { id: 'continue', label: 'Keep your own bench', description: 'The warden nods as if he expected it, and will remember it the next time the guild wants something.' }]); return true; }
  if (t.def === 'forbidden') { const faith = !!s.realm?.faithId, what = r.kind === 'war' ? 'chains and pike-heads for the levy, and shackles for the ones who run' : 'locks and chains for the marked doors, and the carts to carry what is forfeit'; ctx.setEvent?.('guild_forbidden', 'The court’s contract', 'The guild', `The court has given ${name} a contract and the hall has taken it: ${m.craft === 'merchant' ? (r.kind === 'war' ? 'the levy’s supply, bought cheap from the hearths it empties' : 'the forfeit goods of the marked, to be sold at the hall’s price') : what}. Every bench is to work it. ${faith ? 'Your faith forbids it in so many words.' : 'You have seen the doors it is for.'} The warden is coming down the row.`, [{ id: 'work', label: 'Work it like the rest', description: 'Thirty gold and the hall’s good opinion. The street will know what the hall made, and whose hands.' }, { id: 'refuse', label: 'Refuse it at your bench', description: `The hall fines you and remembers.${faith ? ' Your faith remembers the other way.' : ''}` }, { id: 'persuade', label: 'Speak against it at the table', description: 'If the table can be moved. Persuasion.', ...((s.hero.skills?.persuasion || 0) < 4 ? { disabledReason: 'The table would not hear you.' } : {}) }, { id: 'continue', label: 'Be elsewhere when the work is given out', description: 'Neither hands nor voice. The warden notices that too, a little.' }]); return true; }
  if (t.def === 'secret') { ctx.setEvent?.('guild_secret', 'The secret', 'The guild', `${r.buyer}, who says he is from ${r.guild} and may be, buys you a drink and then another and asks, as if it were nothing, about ${SECRET[m.craft]}. Sixty gold for it, he says, and nobody need know where it came from.`, [{ id: 'sell', label: 'Sell it: 60 gold', description: 'The hall’s secret for two seasons’ wages. If it comes out, the hall will know whose it was.' }, natureChoice(s, 'greedy', { id: 'haggle', label: 'Make him pay a hundred', description: 'He will. A hundred is a sum people talk about.' }), { id: 'refuse', label: 'Refuse him', description: 'And say nothing. He will try another bench.' }, { id: 'report', label: 'Tell the warden', description: `${r.buyer} will not drink in this town again. The hall remembers who told it.` }, { id: 'continue', label: 'Finish the drink and go home', description: 'Neither yes nor no. He will ask again, or someone will.' }].filter(Boolean)); return true; }
  if (t.def === 'succession') { ctx.setEvent?.('guild_succession', 'The wardenship', 'The guild', `${r.warden} is dead, and ${name} will choose its warden at the next table. ${r.rival} has been at every master’s door this week with a bottle. Your standing in the hall is ${m.standing >= 65 ? 'high' : m.standing >= 45 ? 'fair' : 'thin'}.`, [{ id: 'stand', label: 'Stand for the wardenship', description: 'The table votes. Win and the hall is yours to run; lose and the rival runs it, and you.', ...(m.standing < 45 ? { disabledReason: 'The table would not seat you.' } : {}) }, { id: 'back', label: `Back ${r.rival}`, description: 'A warden who owes you. It is not nothing.' }, { id: 'continue', label: 'Stay out of it', description: 'The hall will have a warden either way, and will remember who did not help choose.' }]); return true; }
  if (t.def === 'protege') { ctx.setEvent?.('guild_protege', 'The apprentice’s paper', 'The guild', `${r.name} has served the three years and the work is good, better in one thing than yours. The paper is on the bench. A word from you at the table makes a journeyman; another year at your bench makes you money.`, [{ id: 'speak', label: `Speak for ${r.name} at the table`, description: 'A journeyman of the guild, by your word. They will not forget whose.' }, { id: 'keep', label: 'Keep them another year', description: 'Twenty gold of work for bed and board. They will know why.' }, { id: 'continue', label: 'Give them the paper and no word', description: 'Done with, and no more than that.' }]); return true; }
  if (t.def === 'arrears') { ctx.setEvent?.('guild_arrears', 'The warden at the door', 'The guild', `${m.warden.name} at the door with the book. ${r.owed} gold owed to ${name}, three seasons of it, and the table has asked him to ask. One more season and the name comes off the rolls.`, [{ id: 'pay', label: `Pay it: ${r.owed} gold`, description: 'And the line under your name.', ...(s.hero.gold < r.owed ? { disabledReason: `You have ${s.hero.gold} gold.` } : {}) }, { id: 'time', label: 'Ask for the season', description: 'He has heard it before. Persuasion decides whether he writes it down kindly.' }, { id: 'continue', label: 'Tell him to come back when you have it', description: 'He will not come back. The table will strike the name.' }]); return true; }
  if (t.def === 'judgement') { ctx.setEvent?.('guild_judgement', 'The wardens look', 'The guild', `${MASTERPIECE[m.craft][0].toUpperCase()}${MASTERPIECE[m.craft].slice(1)} on the table and three wardens around it, saying nothing. ${r.quality >= 70 ? 'It is good and they know it.' : r.quality >= 55 ? 'It is good enough, or nearly.' : 'There is a flaw in it and you know where.'} ${m.warden.name} looks at you and then at the chest where the fees go.`, [{ id: 'present', label: 'Let the work speak', description: 'The wardens judge it as it is.' }, { id: 'sweeten', label: `Sweeten the chest: 20 gold`, description: 'The wardens judge it a little kindly. Everyone in the hall will know by evening.', ...(hasNature(s, 'honest') ? { disabledReason: 'You could not make your hand do it.' } : s.hero.gold < 20 ? { disabledReason: `You have ${s.hero.gold} gold.` } : {}) }, { id: 'continue', label: 'Withdraw it for another year', description: 'Take it home and mend the flaw. The next one will be better for it.' }]); return true; }
  t.closed = true; return false;
}
export function applyGuildChoice(s, eventId, pick, ctx = {}) {
  const g = guild(s); if (!g) return false;
  const t = g.threads.find(t => t.stage === 'open' && !t.closed && `guild_${t.def}` === eventId); if (!t) return false;
  const stress = n => { if (s.life) s.life.stress = clamp((s.life.stress || 0) + n); };
  if (s.event?.id === eventId) s.event = null;
  t.choice = pick; t.stage = 'chosen';
  const result = decide(s, g, t, pick, ctx, stress);
  if (!t.followUp) t.closed = true;
  return result;
}
function decide(s, g, t, pick, ctx, stress) {
  const m = g.member, r = t.roles, season = seasonOf(s.day);
  if (t.def === 'invite') { if (pick === 'accept') { const craft = craftOf(s); if (!craft || m) return true; enrol(s, craft, 'recruited', ctx); t.memory.push('You joined the guild at its asking.'); } else { t.memory.push('You kept your own bench when the guild asked.'); note(ctx, 'A word from the hall', `${r.warden} nodded as if he had expected it. The hall will remember the next time it wants something, and the next time you do.`); } return true; }
  if (!m) return true;
  const name = GUILD_NAME[m.craft];
  if (t.def === 'forbidden') {
    if (pick === 'work') { s.hero.gold += 30; m.standing = clamp(m.standing + 8); ctx.standing?.('villagers', -6); if (s.realm?.faithId) { s.realm.devotion = Math.max(0, (s.realm.devotion || 0) - 10); shiftNature(s, 'hard', 'The court’s contract', 'You made what the court asked and did not look at the doors it was for, and found you could.', ctx); } t.memory.push('You worked the court’s contract.'); note(ctx, 'The court’s contract', `You worked it like the rest. Thirty gold, and the hall’s good opinion, and the street knows what the hall made this season and whose hands. ${r.kind === 'purge' ? 'Some of the doors it was for are on your street.' : 'Some of the shackles came back.'}`); }
    else if (pick === 'refuse') { m.standing = clamp(m.standing - 12); s.hero.gold = Math.max(0, s.hero.gold - FINE); ctx.standing?.('villagers', 4); if (s.realm?.faithId) s.realm.devotion = Math.min(100, (s.realm.devotion || 0) + 6); t.memory.push('You refused the court’s contract at your bench.'); note(ctx, 'The court’s contract', `You put the hammer down and said so, and the warden fined you ${FINE} gold in front of the row and wrote your name in the book under a different heading. The street heard. So did the court.`); t.followUp = { kind: 'refused', season: season + 2 }; }
    else if (pick === 'persuade') { const moved = seededRoll(s.seed, `guild:persuade:${t.id}`, 100) < 25 + Math.min(8, s.hero.skills?.persuasion || 0) * 7 + (m.rank !== 'journeyman' ? 15 : 0); if (moved) { m.standing = clamp(m.standing + 5); ctx.standing?.('villagers', 6); ctx.standing?.('order', -4); if (Number.isFinite(s.hero.skills?.persuasion)) s.hero.skills.persuasion += 1; t.memory.push('You turned the table against the court’s contract.'); note(ctx, 'The court’s contract', `You stood at the table and said what the contract was for, and the table, which knew, voted it down by two. The court will remember the hall for it, and the hall will remember you.`); } else { m.standing = clamp(m.standing - 6); t.memory.push('You spoke against the court’s contract and the table worked it anyway.'); note(ctx, 'The court’s contract', `You stood at the table and said what the contract was for. The table knew. It voted the other way, and worked it, and you did not, and the warden has that in the book.`); } }
    else { m.standing = clamp(m.standing - 2); t.memory.push('You were elsewhere when the court’s contract was given out.'); note(ctx, 'The court’s contract', 'You were at a cousin’s the week the work was given out, and nobody asked, and the warden noticed that nobody asked.'); }
    return true;
  }
  if (t.def === 'secret') {
    if (pick === 'sell' || pick === 'haggle') { const sum = pick === 'haggle' ? 100 : 60; s.hero.gold += sum; companionOpinion(s, 'greed', ctx); m.secret = 'sold'; stress(6); t.memory.push(`You sold ${SECRET[m.craft]} to ${r.buyer}${pick === 'haggle' ? ' for a hundred' : ''}.`); note(ctx, 'The secret', `${pick === 'haggle' ? 'A hundred' : 'Sixty'} gold in a purse under the table, and ${r.buyer} gone by morning. You told him. It is in ${r.guild} now, or it is in a court somewhere, and it was the hall’s and now it is not.${pick === 'haggle' ? ' A hundred is a sum people talk about.' : ''}`); t.followUp = { kind: 'sold', season: season + 3, loud: pick === 'haggle' }; }
    else if (pick === 'refuse') { m.secret = 'kept'; m.standing = clamp(m.standing + 2); t.memory.push('You would not sell the hall’s secret.'); note(ctx, 'The secret', `You finished the drink he bought and said no, and he smiled as if you had said something else, and tried the next bench. The hall does not know. You do.`); }
    else if (pick === 'report') { m.secret = 'kept'; m.standing = clamp(m.standing + 10); ctx.standing?.('underworld', -4); t.memory.push(`You told the warden about ${r.buyer}.`); note(ctx, 'The secret', `You told ${m.warden.name} before the drink was warm. ${r.buyer} was found by the hall’s men in the yard the next morning and will not drink in this town again. The hall remembers who told it, in the book and out of it.`); }
    else { m.secret = 'kept'; t.memory.push('You finished the drink and went home.'); note(ctx, 'The secret', 'You finished the drink and went home and told nobody, which is also a thing the hall could ask about one day.'); }
    return true;
  }
  if (t.def === 'succession') {
    if (pick === 'stand') { const won = seededRoll(s.seed, `guild:election:${t.id}`, 100) < 20 + m.standing * 0.6 - m.rival.standing * 0.3 + (m.apprentice || g.history.some(h => /apprentice|Spoke for/.test(h.text)) ? 8 : 0) + (hasNature(s, 'ambitious') ? 8 : 0); if (won) { m.rank = 'warden'; m.warden = { name: s.hero.name, since: s.day }; m.rival.standing = clamp(m.rival.standing - 10); if (m.rival.id) bond(s, m.rival.id, -15); syncCareerRank(s); ctx.standing?.('villagers', 2); t.memory.push(`You were made warden of ${name} over ${r.rival}.`); remember(s, `Made warden of ${name}.`); note(ctx, 'The wardenship', `The table voted, and voted again because ${r.rival} asked it to, and you are warden of ${name}. The chest is yours to keep and the court’s man will come to you now. ${r.rival} shook your hand with a face like a shut door.`); } else { m.standing = clamp(m.standing - 8); m.rival.standing = clamp(m.rival.standing + 10); m.warden = { name: r.rival, since: s.day }; t.memory.push(`${r.rival} was made warden over you.`); note(ctx, 'The wardenship', `The table voted and ${r.rival} is warden of ${name}, and you are a master under a warden who remembers you stood. The assignments will be the far ones for a while.`); } }
    else if (pick === 'back') { m.warden = { name: r.rival, since: s.day }; m.rival.standing = clamp(m.rival.standing + 10); m.standing = clamp(m.standing + 4); if (m.rival.id) bond(s, m.rival.id, 12); t.memory.push(`You backed ${r.rival} for the wardenship.`); note(ctx, 'The wardenship', `${r.rival} is warden of ${name} by two votes, and one of them was yours, and ${r.rival} knows it. A warden who owes you. It is not nothing.`); }
    else { const next = seededRoll(s.seed, `guild:warden:next:${t.id}`, 100) < 50 ? r.rival : generatePersonName(s.seed, `guild:warden:${m.craft}:${t.id}`); m.warden = { name: next, since: s.day }; m.standing = clamp(m.standing - 3); t.memory.push(`${next} was made warden while you stayed out of it.`); note(ctx, 'The wardenship', `${next} is warden of ${name}. You were not at the table, and the table noticed the empty chair.`); }
    return true;
  }
  if (t.def === 'protege') {
    const a = m.apprentice; if (!a) return true;
    if (pick === 'speak') { m.standing = clamp(m.standing + 4); addTie(s, { kind: 'knows', name: a.name, note: 'a journeyman you spoke for at the guild’s table' }); t.memory.push(`You spoke for ${a.name} at the table.`); remember(s, `Spoke for ${a.name}: a journeyman by your word.`); note(ctx, 'The apprentice’s paper', `You spoke for ${a.name} at the table and the table took your word. A journeyman of ${name}, with a bench of their own by spring, and your name under theirs on the paper for as long as the paper lasts.`); m.apprentice = null; }
    else if (pick === 'keep') { s.hero.gold += 20; m.standing = clamp(m.standing - 2); a.progress = 60; a.kept = true; t.memory.push(`You kept ${a.name} another year.`); note(ctx, 'The apprentice’s paper', `Another year at the bench for bed and board. ${a.name} said nothing, and worked, and knows exactly what the year was worth to you.`); }
    else { t.memory.push(`You gave ${a.name} the paper and no word.`); note(ctx, 'The apprentice’s paper', `${a.name} took the paper and went, a journeyman of ${name} with nobody’s word on it. You will see them at the fair, at the far bench.`); m.apprentice = null; }
    return true;
  }
  if (t.def === 'arrears') {
    if (pick === 'pay' && s.hero.gold >= r.owed) { s.hero.gold -= r.owed; m.dues.paid += r.owed; m.dues.arrears = 0; t.memory.push('You paid the warden at the door.'); note(ctx, 'The warden at the door', `${r.owed} gold into the book at the door, and the line drawn under it. ${m.warden.name} did not say thank you. Wardens do not.`); }
    else if (pick === 'time') { const kind = seededRoll(s.seed, `guild:time:${t.id}`, 100) < 40 + Math.min(5, s.hero.skills?.persuasion || 0) * 10; m.standing = clamp(m.standing - (kind ? 3 : 8)); if (kind) m.dues.season = season; else m.dues.arrears = ARREARS_OUT - 1; t.memory.push(kind ? 'The warden gave you the season.' : 'The warden would not give you the season.'); note(ctx, 'The warden at the door', kind ? `${m.warden.name} wrote it down kindly, which is to say without an underline, and gave you the season. The next one he will not.` : `${m.warden.name} wrote it down, underlined it, and said the table would decide. The table will.`); }
    else { m.standing = clamp(m.standing - 10); m.dues.arrears = ARREARS_OUT - 1; t.memory.push('You sent the warden away.'); note(ctx, 'The warden at the door', `${m.warden.name} closed the book and went. He will not come back; the table will send the paper instead.`); }
    return true;
  }
  if (t.def === 'judgement') {
    const mp = m.masterpiece; if (!mp) return true;
    if (pick === 'continue') { mp.judged = true; mp.polish = (mp.polish || 0) + 8; t.memory.push('You withdrew the masterpiece for another year.'); note(ctx, 'The wardens look', `You took it off the table before they could speak and carried it home, and spent a winter on the flaw. Next year’s will be better for it.`); return true; }
    const threshold = pick === 'sweeten' ? 45 : 55; if (pick === 'sweeten') { s.hero.gold = Math.max(0, s.hero.gold - 20); m.standing = clamp(m.standing - 4); }
    mp.judged = true;
    if (r.quality >= threshold) { m.rank = 'master'; m.masterSince = s.day; syncCareerRank(s); m.standing = clamp(m.standing + 12); const rec = ledger(s, m.craft); if (rec) rec.reputation = clamp(rec.reputation + 8); t.memory.push(`Made a master of ${name}: ${mp.name}.`); remember(s, `Made a master of ${name} on ${mp.name}.`); note(ctx, 'Master', `${m.warden.name} ran a thumb along it and said nothing for a long time and then said the word. A master of ${name}. The hall drank to it, at your expense, and the dues are ${DUES.master} now and the court’s man will want ${COURT_TAX} a year, and you may take an apprentice and a bench with your own mark over it.${pick === 'sweeten' ? ' Everyone in the hall knew about the twenty gold by evening, and said so, and drank anyway.' : ''}`); }
    else { m.standing = clamp(m.standing - 5); stress(8); t.memory.push(`The wardens refused ${mp.name}.`); note(ctx, 'The wardens look', `${m.warden.name} found the flaw with one finger and the other two looked at the ceiling. Not this year. The journeyman’s dues, the journeyman’s work, and a winter to think about where the flaw was.${pick === 'sweeten' ? ' The twenty gold is in the chest anyway.' : ''}`); }
    return true;
  }
  return true;
}
function followUp(s, season, t, ctx) {
  const g = guild(s), m = g.member, f = t.followUp; t.followUp = null; t.closed = true; if (!m) return;
  if (f.kind === 'sold') { const out = seededRoll(s.seed, `guild:secret:out:${t.id}`, 100) < (f.loud ? 55 : 35); if (out) { t.memory.push('The sold secret came back to your bench.'); note(ctx, 'The secret', `It came out, the way these things do: ${t.roles.guild} has the quench, or the cipher, or the assay, and the hall counted the benches and the drinks and arrived at yours.`); leave(s, 'expelled', ctx); } else { t.memory.push('The sold secret stayed sold.'); } }
  else if (f.kind === 'refused') { const court = seededRoll(s.seed, `guild:court:${t.id}`, 100) < 40; if (court) { ctx.standing?.('order', -6); t.memory.push('The court marked you for refusing its contract.'); note(ctx, 'The court’s contract', 'A clerk from the court at the bench with a paper: your name, the contract, the word refused. He did not say what it was for. Clerks do not.'); } else { ctx.standing?.('villagers', 3); t.memory.push('The street remembered who refused the court’s contract.'); note(ctx, 'The court’s contract', 'The street remembers whose hammer stayed down. A loaf on the step, once, and no note.'); } }
}

// ---------------------------------------------------------------------------
// The world reacts: the monopoly bars those outside, and the old recognition yields to the hall's ranks.
export function applyGuildGates(s, actions) {
  const g = guild(s); if (!g || !Array.isArray(actions)) return actions;
  const craft = craftOf(s), here = regionOf(s, s.locationId);
  if (craft) {
    for (const a of actions) if (a.id === 'life_promotion') a.disabledReason = `${cap(GUILD_NAME[craft])} gives its ranks at its own table.`;
    const monopoly = !g.member || g.member.craft !== craft ? activeEvents(s).find(e => e.kind === 'monopoly' && e.craft === craft && e.regionId === here) : null;
    if (monopoly) for (const a of actions) if (/^career_(work$|accept_|make_|open_shop$|shop_operate$)/.test(a.id)) a.disabledReason = `${cap(GUILD_NAME[craft])}’s mark is on every door in ${regionName(here)}. No one works the trade here without it.`;
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Legacy: the name on the rolls, the feud, the arrears, the workshop.
export function inheritGuild(old, s) {
  if (!old.guild || !s.guild) return;
  const m = old.guild.member; s.guild.family = m && m.rank !== 'journeyman' ? m.craft : old.guild.family; s.guild.lastSeason = seasonOf(s.day);
  if (s.guild.family) { const parent = (s.life?.people || []).find(p => p.familyRole === 'parent'); if (parent && !m) parent.occupation = s.guild.family === 'merchant' ? 'merchant of the guild' : s.guild.family; }
  if (m) {
    s.guild.heir = { craft: m.craft, from: old.hero.name, rank: m.rank, warden: m.rank === 'warden' || m.rank === 'guildmaster' ? null : m.warden?.name || null };
    if (m.dues.arrears > 0 && s.householdBudget) s.householdBudget.debt += m.dues.arrears * DUES[m.rank];
    if (m.rival && m.rival.contests.some(c => !c.won) && s.hero.station?.ties) addTie(s, { kind: 'hates', name: m.rival.name, note: `${old.hero.name}’s rival at the guild’s bench, who has not forgotten the fair` });
  }
  for (const p of old.guild.past.filter(p => p.left === 'expelled')) if (s.hero.station?.ties) addTie(s, { kind: 'hates', name: GUILD_NAME[p.craft], note: `struck ${old.hero.name}’s name from its rolls` });
}

// ---------------------------------------------------------------------------
// Reading it back.
export function guildView(s) {
  const g = guild(s); if (!g) return null;
  const m = g.member, season = seasonOf(s.day);
  return {
    family: g.family ? { craft: g.family, name: GUILD_NAME[g.family] } : null,
    heir: g.heir ? { ...g.heir, name: GUILD_NAME[g.heir.craft] } : null,
    member: m ? { craft: m.craft, name: GUILD_NAME[m.craft], rank: m.rank, how: m.how, years: Math.floor((s.day - m.joinedDay) / 365), standing: m.standing, standingWord: m.standing >= 65 ? 'high' : m.standing >= 45 ? 'fair' : m.standing >= 25 ? 'thin' : 'bad', dues: DUES[m.rank], arrears: m.dues.arrears, seat: placeName(s, m.seat), region: regionName(m.region), wander: { ...m.wander, need: WANDER_SEASONS }, assignment: m.assignment && !m.assignment.done ? { ...m.assignment, place: placeName(s, m.assignment.locationId), overdue: season - m.assignment.season >= 3 } : null, masterpiece: m.masterpiece ? { ...m.masterpiece } : null, rival: m.rival ? { name: m.rival.name, won: m.rival.contests.filter(c => c.won).length, lost: m.rival.contests.filter(c => !c.won).length } : null, warden: m.warden.name, sponsor: m.sponsor || null, apprentice: m.apprentice ? { name: m.apprentice.name, years: Math.floor((s.day - m.apprentice.since) / 365), progress: m.apprentice.progress } : null, secret: m.secret } : null,
    past: g.past.map(p => ({ ...p, name: GUILD_NAME[p.craft] })),
    history: g.history.slice(-8).map(h => ({ ...h })),
    threads: g.threads.filter(t => t.memory.length).slice(-4).map(t => ({ id: t.id, def: t.def, memory: [...t.memory] })),
  };
}
export function guildSummary(s) {
  const m = member(s); if (!m) { const g = guild(s); return g?.family ? `Born to ${GUILD_NAME[g.family]}.` : ''; }
  return `${cap(m.rank)} of ${GUILD_NAME[m.craft]}, ${Math.max(1, Math.floor((s.day - m.joinedDay) / 365))} year${Math.floor((s.day - m.joinedDay) / 365) === 1 ? '' : 's'} on the rolls${m.dues.arrears ? `, ${m.dues.arrears} season${m.dues.arrears === 1 ? '' : 's'} of dues owed` : ''}.`;
}
export function validateGuild(g, s) {
  if (g === undefined) return true;
  const int = (n, max = 1000000) => Number.isSafeInteger(n) && n >= 0 && n <= max, str = (v, max = 400) => typeof v === 'string' && v.length <= max;
  if (!g || typeof g !== 'object' || g.version !== 1 || !int(g.lastSeason) || (s && g.lastSeason > seasonOf(s.day))) return false;
  if (!(g.family === null || GUILD_CRAFTS.includes(g.family))) return false;
  if (!(g.heir === null || g.heir && GUILD_CRAFTS.includes(g.heir.craft) && str(g.heir.from, 100) && RANKS.includes(g.heir.rank) && (g.heir.warden === null || str(g.heir.warden, 100)))) return false;
  const m = g.member;
  if (m !== null) {
    if (!m || !GUILD_CRAFTS.includes(m.craft) || !RANKS.includes(m.rank) || !int(m.joinedDay) || (s && m.joinedDay > s.day) || !['born', 'apprenticed', 'bought', 'recruited', 'inherited'].includes(m.how) || !int(m.standing, 100) || !str(m.seat, 80) || !REGION_TEMPLATES.some(r => r.id === m.region)) return false;
    if (!m.dues || !int(m.dues.season) || !int(m.dues.arrears, 10) || !int(m.dues.paid)) return false;
    if (!m.wander || !int(m.wander.seasons, 20) || !Array.isArray(m.wander.regions) || m.wander.regions.length > 8 || typeof m.wander.done !== 'boolean' || (m.wander.lastSeason !== undefined && !int(m.wander.lastSeason))) return false;
    if (!(m.assignment === null || m.assignment && int(m.assignment.season) && str(m.assignment.locationId, 80) && str(m.assignment.what, 120) && int(m.assignment.pay, 10000) && typeof m.assignment.done === 'boolean')) return false;
    if (!(m.masterpiece === null || m.masterpiece && int(m.masterpiece.day) && int(m.masterpiece.quality, 100) && str(m.masterpiece.name, 120) && typeof m.masterpiece.judged === 'boolean' && (m.masterpiece.polish === undefined || int(m.masterpiece.polish, 100)))) return false;
    if (!(m.rival === null || m.rival && (m.rival.id === null || str(m.rival.id, 80)) && str(m.rival.name, 100) && int(m.rival.standing, 100) && Array.isArray(m.rival.contests) && m.rival.contests.length <= 10 && m.rival.contests.every(c => c && int(c.season) && typeof c.won === 'boolean'))) return false;
    if (!m.warden || !str(m.warden.name, 100) || !Number.isSafeInteger(m.warden.since)) return false;
    if (!(m.apprentice === null || m.apprentice && str(m.apprentice.name, 100) && int(m.apprentice.since) && int(m.apprentice.progress, 100) && Number.isSafeInteger(m.apprentice.bornDay))) return false;
    if (!(m.secret === null || ['sold', 'kept'].includes(m.secret)) || !(m.masterSince === null || int(m.masterSince)) || !(m.sponsor === undefined || m.sponsor === null || str(m.sponsor, 100))) return false;
  }
  if (!Array.isArray(g.past) || g.past.length > 8 || !g.past.every(p => p && GUILD_CRAFTS.includes(p.craft) && RANKS.includes(p.rank) && int(p.from) && int(p.to) && ['left', 'expelled'].includes(p.left))) return false;
  if (!Array.isArray(g.threads) || g.threads.length > LIMITS.threads || !g.threads.every(t => t && str(t.id, 20) && ['invite', 'forbidden', 'secret', 'succession', 'protege', 'arrears', 'judgement'].includes(t.def) && t.roles && typeof t.roles === 'object' && int(t.season) && ['open', 'chosen'].includes(t.stage) && (t.choice === null || str(t.choice, 20)) && (t.followUp === null || t.followUp && ['sold', 'refused'].includes(t.followUp.kind) && int(t.followUp.season) && (t.followUp.loud === undefined || typeof t.followUp.loud === 'boolean')) && Array.isArray(t.memory) && t.memory.length <= 12 && t.memory.every(x => str(x, 300)) && typeof t.closed === 'boolean')) return false;
  if (!Array.isArray(g.history) || g.history.length > LIMITS.history || !g.history.every(h => h && int(h.day) && str(h.text, 300))) return false;
  if (!g.counters || !int(g.counters.threads)) return false;
  if (s?.event?.id?.startsWith('guild_') && !g.threads.some(t => t.stage === 'open' && !t.closed && `guild_${t.def}` === s.event.id)) return false;
  return true;
}
