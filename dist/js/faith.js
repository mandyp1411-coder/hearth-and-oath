// The cloth (v0.69): the church as a path, built to the Bible's anatomy on
// the faiths the realm already has. Ways in (given as a child, called at the
// shrine, ordained by the Seminary, vowed in a crisis), daily life (the
// offices, the tithe, the three vows, the prior's assignment), its own people
// (the prior, the rival novice, the penitent, the doubter, the preacher), its
// own stories, a world that reacts (the court's purge at the house door, the
// tithe in a hungry village), ways out (the priory, lapsing, the defrocking,
// the door held against the court), and a legacy. `state.faith` is on every
// life from v0.72.3; `realm.faithId` stays the congregation, and the cloth is
// what a few of the congregation take.
import { seededRoll, isSettlement, generatePersonName } from './world.js';
import { FAITHS, REGION_TEMPLATES } from './realm-content-v18.js';
import { hasNature, shiftNature, natureChoice } from './personality.js';
import { addStationTie } from './station.js';
import { seasonOf, activeEvents } from './living-world.js';
import { hasCredential } from './schooling.js';

export const RANKS = Object.freeze(['oblate', 'novice', 'brother', 'keeper', 'prior']);
export const TITHE = 5, STIPEND = 10, OFFICE_DAYS = 3, NOVICE_SEASONS = 4, VOWS_STANDING = 40, KEEPER_STANDING = 70, KEEPER_YEARS = 5, ARREARS_DOOR = 3, ARREARS_OUT = 4, NOVICE_MISSED = 2, PENANCE_DAYS = 30, CALLED_DEVOTION = 3;
const LIMITS = Object.freeze({ threads: 10, history: 24 });
const ANCESTRY_WORD = Object.freeze({ tiefling: 'the horned', goblin: 'the goblin-born', orc: 'the orc-born', beastfolk: 'the beastfolk', elf: 'the elven', dwarf: 'the dwarven', halfling: 'the halfling', human: 'the human' });
// Each faith's doctrine names a dispute; the house has two wings over it.
const WINGS = Object.freeze({
  lantern: { open: 'shelter whoever reaches the door', strict: 'decide who may enter' },
  ancestors: { open: 'remember the dead without owning them', strict: 'bind the living to the family\'s dead' },
  wilds: { open: 'keep the balance between hearth and forest', strict: 'let the forest take what it will' },
  forge: { open: 'honour the hand that makes', strict: 'make hands into instruments' },
  moon: { open: 'let a changed face keep its name', strict: 'keep the secret as a weapon' },
  ash: { open: 'keep free hearths among the ruins', strict: 'promise the fire to a conqueror' },
});
export const FAITH_EVENTS = { ids: () => ({ faith_oblate: ['accept', 'continue'], faith_vow: ['swear', 'continue'], faith_heresy: ['denounce', 'listen', 'shelter', 'continue'], faith_tithe: ['collect', 'forgive', 'pay', 'continue'], faith_relic: ['return', 'keep', 'continue'], faith_doubter: ['report', 'keep', 'persuade', 'continue'], faith_door: ['open', 'shut', 'stand', 'continue'], faith_inquiry: ['confess', 'deny', 'leave', 'continue'], faith_succession: ['stand', 'back', 'continue'], faith_confession: ['counsel', 'report', 'absolve', 'continue'] }) };

export const faith = s => s.faith || null;
export const cloth = s => s.faith?.member || null;
const faithOf = id => FAITHS.find(f => f.id === id) || null;
const house = id => { const f = faithOf(id); return f ? `the house of ${f.name.replace(/^The /, 'the ')}` : 'the house'; };
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const note = (ctx, title, text, tag = 'faith') => (ctx?.journalLiteral || ctx?.journal)?.(title, text, tag);
const waiting = s => s.event || s.battle || s.conversations?.pending || s.dungeon || s.maze || s.delve || s.timeline?.journey || s.timeline?.yearTarget || s.careers?.batch || s.cartography?.offsite;
const regionOf = (s, siteId) => s.realm?.sites?.[siteId]?.regionId || null;
const regionName = id => REGION_TEMPLATES.find(r => r.id === id)?.name || id;
const homeOf = s => s.life?.home?.locationId || s.hero.birthplaceId || 'home';
const placeName = (s, id) => s.world?.locations?.find(p => p.id === id)?.name || id;
const site = (s, id = s.locationId) => s.realm?.sites?.[id] || null;
const shrineHere = s => !!site(s)?.hasShrine && isSettlement(s.world, s.locationId);
const localFaith = (s, id = s.locationId) => site(s, id)?.faithId || s.realm?.regions?.find(r => r.id === regionOf(s, id))?.faithId || null;
const devotion = s => Number(s.hero.skills?.devotion) || 0;
const remember = (s, text) => { const f = faith(s); f.history.push({ day: s.day, text }); if (f.history.length > LIMITS.history) f.history.splice(0, f.history.length - LIMITS.history); };
const peopleOf = s => (s.life?.people || []).filter(p => p.alive !== false);
const stress = (s, n) => { if (s.life) s.life.stress = clamp((s.life.stress || 0) + n); };
const joy = (s, n) => { if (s.life) s.life.happiness = clamp((s.life.happiness || 0) + n); };
const devote = (s, n) => { if (s.realm) s.realm.devotion = clamp((s.realm.devotion || 0) + n); };
const title = (s, m = cloth(s)) => m ? ({ oblate: 'an oblate', novice: 'a novice', brother: s.hero.pronouns === 'she/her' ? 'a sister' : 'a brother', keeper: 'a keeper', prior: s.hero.pronouns === 'she/her' ? 'the prioress' : 'the prior' })[m.rank] : null;
const priorWord = m => m.prior.wing === 'strict' ? 'the strict wing' : 'the open wing';

// ---------------------------------------------------------------------------
export function initializeFaith(s) {
  if (s.faith) return;
  s.faith = { version: 1, member: null, past: [], heir: null, threads: [], history: [], counters: { threads: 0 }, lastSeason: seasonOf(s.day), vow: null, oblateAsked: false, evidenceSeen: s.legal?.evidence || 0 };
}
/** The house's seat: the shrine at the capital of the region the faith is dominant in, or the nearest shrine. */
export function faithSeat(s, faithId) {
  const region = s.realm?.regions?.find(r => r.faithId === faithId) || s.realm?.regions?.find(r => r.id === regionOf(s, homeOf(s))) || s.realm?.regions?.[0];
  const sites = Object.values(s.realm?.sites || {}).filter(x => x.regionId === region?.id && !/^(seat|reach)-/.test(x.id) && isSettlement(s.world, x.id) && x.hasShrine !== false);
  const seat = sites.find(x => ['sanctuary', 'city', 'citadel'].includes(s.world.locations.find(p => p.id === x.id)?.type)) || sites[0];
  return { regionId: region?.id || null, locationId: seat?.id || (shrineHere(s) ? s.locationId : homeOf(s)) };
}
const priorOf = (s, faithId) => { const seat = faithSeat(s, faithId), k = site(s, seat.locationId)?.keeper; return { name: k?.name || generatePersonName(s.seed, `faith:prior:${faithId}`), since: k ? k.createdDay : s.day - 8 * 365, wing: seededRoll(s.seed, `faith:wing:${faithId}:${k?.id || 'x'}`, 100) < 55 ? 'open' : 'strict', bornDay: k ? k.createdDay - (k.baseAge || 40) * 365 : s.day - 50 * 365 }; };

// ---------------------------------------------------------------------------
// Ways in.
export function joinReason(s, how) {
  const f = faith(s); if (!f || s.phase === 'retired') return 'There is no house here.';
  if (f.member) return `You are ${title(s)} of ${house(f.member.faithId)} already.`;
  const faithId = how === 'ordained' ? (s.realm?.faithId || localFaith(s)) : s.realm?.faithId;
  if (f.past.some(p => p.left === 'defrocked')) return 'The house that put you out does not take the name back.';
  if (how === 'called') { if (s.age < 16) return 'The house takes novices at sixteen.'; if (!faithId) return 'Join the congregation first; the house takes its novices from it.'; if (!shrineHere(s) || localFaith(s) !== faithId) return `Ask at a shrine of ${faithOf(faithId)?.name || 'your faith'}.`; const known = f.heir?.faithId === faithId && f.heir.left === 'kept'; if (devotion(s) < CALLED_DEVOTION && !known && (s.factions?.order || 0) < 40) return `The keeper wants to see devotion in you first (devotion ${CALLED_DEVOTION}), or a name the Order knows.`; return null; }
  if (how === 'ordained') { if (!hasCredential(s, 'orders')) return 'Holy orders come from the Seminary.'; if (!shrineHere(s)) return 'Present your orders at a shrine.'; return null; }
  if (how === 'vowed') return f.vow ? null : 'You made no vow.';
  return 'There is no door for you here.';
}
function enrol(s, faithId, rank, how, ctx) {
  const f = faith(s), seat = faithSeat(s, faithId), prior = priorOf(s, faithId), name = house(faithId);
  const standing = { given: 35, called: 30, ordained: 45, vowed: 25, heir: 40 }[how] || 30;
  f.member = { faithId, rank, since: s.day, how, standing, seat: seat.locationId, region: seat.regionId, shrine: null, wing: prior.wing, prior, rival: { name: generatePersonName(s.seed, `faith:rival:${faithId}:${f.past.length}`), standing: 30 + seededRoll(s.seed, `faith:rival:${s.day}`, 25), sermons: [] }, penitent: null, offices: { season: seasonOf(s.day), kept: 0, missed: 0 }, tithe: { arrears: 0, paid: 0, season: seasonOf(s.day) }, assignment: null, penance: null, vows: null, doubter: null };
  if (s.realm) { s.realm.faithId = faithId; devote(s, how === 'vowed' ? 10 : 5); }
  if (f.heir?.faithId === faithId) f.heir = null;
  const line = { given: `${prior.name} takes your hand at the shrine door and your mother does not come in. One less mouth at home and one more at ${name}. An oblate: you sweep, you fetch oil, you learn the words, and at sixteen the house asks whether you will stay.`, called: `You ask at the shrine and ${prior.name}, who keeps the house, looks at you the way keepers look. ${devotion(s) >= CALLED_DEVOTION ? 'The devotion is in you; they have seen it.' : 'The Order knows your name, which is why the door opens.'} A novice of ${name}: a year of the offices, ${OFFICE_DAYS} days a season, and then the vows, if you still want them and the house still wants you.`, ordained: `The Seminary's paper and the oil on your forehead. ${prior.name} reads the orders aloud at the shrine and that is that: ${title(s, { rank })} of ${name}, with the vows already sworn in the lecture hall and the tithe owed from this season.`, vowed: `You promised, when it was bad, and the house heard. ${prior.name} does not ask whether you meant it; the house takes vows made in the dark as the truest kind. A novice of ${name}, and the offices begin tomorrow.`, heir: `The house knew your parent, and knows the name. ${prior.name} opens the book and finds it. A novice of ${name}, with the house's regard already half earned.` }[how];
  note(ctx, 'The cloth', line);
  remember(s, `Entered ${name} as ${title(s)}, ${{ given: 'given as a child', called: 'at the shrine door', ordained: 'by the Seminary\'s orders', vowed: 'on a vow made in the dark', heir: 'by the name in the house\'s book' }[how]}.`);
  return true;
}
function ordain(s, ctx) {
  const m = cloth(s); if (!m) return false;
  const married = !!s.life?.partnerId;
  m.rank = 'brother'; m.vows = { poverty: true, chastity: !married || m.wing === 'strict', obedience: true, since: s.day }; m.tithe.season = seasonOf(s.day);
  note(ctx, 'The vows', `Three vows on your knees on the shrine floor with ${m.prior.name}'s hand on your head: poverty, which means the house holds what you hold; ${m.vows.chastity ? 'chastity, which means what it says' : `chastity, which ${priorWord(m)} reads kindly for a brother with a household already`}; obedience, which means ${m.prior.name}. ${title(s)} of ${house(m.faithId)}. The tithe is ${TITHE} gold a season now, and the offices still ${OFFICE_DAYS} days.`);
  remember(s, `Took the vows: ${title(s)} of ${house(m.faithId)}.`);
  return true;
}

// ---------------------------------------------------------------------------
// Actions: what the cloth does, where.
const action = (id, label, description, days = 0, cost = 0, reason = null) => ({ id, label, description, days, cost, group: 'Faith', ...(reason ? { disabledReason: reason } : {}) });
export function faithActions(s) {
  const f = faith(s); if (!f || s.phase === 'retired' || waiting(s) || !isSettlement(s.world, s.locationId)) return [];
  const rows = [], m = f.member;
  if (!m) {
    if (!shrineHere(s)) return rows;
    if (hasCredential(s, 'orders')) rows.push(action('faith_ordain', 'Present your orders at the shrine', `The Seminary's paper makes you ${s.hero.pronouns === 'she/her' ? 'a sister' : 'a brother'} of the house without the noviciate: the vows, the tithe of ${TITHE} gold a season, the offices.`, 1, 0, joinReason(s, 'ordained')));
    else if (s.age >= 16) rows.push(action('faith_novice', 'Ask the keeper for the novice\'s place', `A year of the offices, ${OFFICE_DAYS} days a season at the shrine, no pay and no tithe; then the vows, if the house will have you. The house takes its novices from the congregation.`, 1, 0, joinReason(s, 'called')));
    return rows;
  }
  const name = house(m.faithId), season = seasonOf(s.day), here = m.shrine || m.seat;
  if (m.rank === 'oblate') return rows;
  if (m.offices.season < season) rows.push(action('faith_offices', 'Keep the offices', `${OFFICE_DAYS} days of the shrine's work: the lamps, the words, the sick, the dead. The house counts the seasons kept.${m.rank === 'novice' ? ` ${m.offices.kept} of ${NOVICE_SEASONS} toward the vows.` : ''}`, OFFICE_DAYS, 0, !shrineHere(s) ? 'The offices are kept at a shrine.' : m.penance ? 'Your penance comes first.' : null));
  if (m.penance) rows.push(action('faith_penance', 'Do your penance', `${m.penance.days} days of it left: the floor, the lamps, the silence. ${m.prior.name} set it and will know when it is done.`, Math.min(10, m.penance.days), 0, !shrineHere(s) ? 'Penance is done at a shrine.' : null));
  if (m.tithe.arrears > 0) rows.push(action('faith_tithe_pay', `Pay the tithe owed: ${m.tithe.arrears * TITHE} gold`, `${m.tithe.arrears} season${m.tithe.arrears === 1 ? '' : 's'} owed to ${name}. At ${ARREARS_OUT} the house puts you out.`, 0, m.tithe.arrears * TITHE, s.hero.gold < m.tithe.arrears * TITHE ? `You have ${s.hero.gold} gold.` : null));
  if (m.rank === 'novice') rows.push(action('faith_vows', 'Take the vows', `Poverty, chastity, obedience. ${title(s, { rank: 'brother' })} of ${name}: the tithe of ${TITHE} gold a season, the prior's work, the house's roof and word.`, 1, 0, m.offices.kept < NOVICE_SEASONS ? `The house wants ${NOVICE_SEASONS} seasons of the offices kept first (${m.offices.kept}).` : m.standing < VOWS_STANDING ? 'The house is not sure of you yet.' : s.life?.partnerId && m.wing === 'strict' ? `${cap(priorWord(m))} takes no married brothers. Leave the household, or wait for a kinder prior.` : !shrineHere(s) ? 'Vows are taken at a shrine.' : null));
  if (m.assignment && !m.assignment.done) rows.push(action('faith_assignment', `The prior's work at ${placeName(s, m.assignment.locationId)}`, `${cap(m.assignment.what)}: four days, and the house's regard. Left a year, the prior remembers.`, 4, 0, m.assignment.locationId !== s.locationId ? `The work is at ${placeName(s, m.assignment.locationId)}.` : null));
  if (m.rank === 'brother') rows.push(action('faith_keep', 'Ask for a shrine to keep', `A shrine of your own in ${regionName(m.region)}: the lamps, the flock, a stipend of ${STIPEND} gold a season instead of the tithe, and the house's roof.`, 1, 0, m.standing < KEEPER_STANDING ? 'The house gives shrines to those it trusts.' : s.day - (m.vows?.since || m.since) < KEEPER_YEARS * 365 ? `${KEEPER_YEARS} years in the cloth first.` : !shrineHere(s) || s.locationId === m.seat ? 'Ask at the shrine you would keep, not the house\'s seat.' : site(s)?.keeperIsYou ? 'Kept already.' : null));
  if (m.rank === 'keeper' && m.penitent) rows.push(action('faith_hear', `Hear ${m.penitent.name}`, `${m.penitent.name} has been at the shrine door three evenings running. A day, and whatever they carry becomes yours too.`, 1, 0, s.locationId !== m.shrine ? `At ${placeName(s, m.shrine)}.` : m.penitent.heard ? 'Heard this season.' : null));
  rows.push(action('faith_leave', `Leave the cloth`, m.rank === 'novice' ? 'A novice who goes is a novice who went. The house shrugs; the congregation remembers a little.' : `${cap(title(s))} who leaves the cloth is lapsed, and the house and the Order say the word. No roof, no word, the vows unsaid.`, 0, 0, m.rank === 'oblate' ? 'The house does not let children walk out.' : null));
  void here;
  return rows;
}
/** The engine has spent the days and the fee before this runs. */
export function applyFaithAction(s, id, ctx = {}) {
  const f = faith(s); if (!f || typeof id !== 'string' || !id.startsWith('faith_')) return false;
  const m = f.member;
  if (id === 'faith_novice') { if (joinReason(s, 'called')) return false; return enrol(s, s.realm.faithId, 'novice', f.heir?.faithId === s.realm.faithId && f.heir.left === 'kept' ? 'heir' : 'called', ctx); }
  if (id === 'faith_ordain') { if (joinReason(s, 'ordained')) return false; const faithId = s.realm?.faithId || localFaith(s); enrol(s, faithId, 'novice', 'ordained', ctx); return ordain(s, ctx); }
  if (!m) return false;
  if (id === 'faith_offices') { if (m.offices.season >= seasonOf(s.day) || !shrineHere(s) || m.penance) return false; m.offices.season = seasonOf(s.day); m.offices.kept++; m.standing = clamp(m.standing + (m.rank === 'novice' ? 3 : 2)); if (Number.isFinite(s.hero.skills?.devotion) && (m.rank === 'novice' || m.offices.kept % 2 === 0)) s.hero.skills.devotion += 1; devote(s, 2); stress(s, -3); if (m.offices.kept % 4 === 0) ctx.standing?.('order', 1); note(ctx, 'The offices', `${OFFICE_DAYS} days at the shrine: the lamps trimmed, the words said over two graves and a child, the sick sat with. ${m.rank === 'novice' ? `${m.offices.kept} of ${NOVICE_SEASONS} seasons toward the vows.` : 'The house counts it.'}`); return true; }
  if (id === 'faith_penance') { if (!m.penance || !shrineHere(s)) return false; const days = Math.min(10, m.penance.days); m.penance.days -= days; if (m.penance.days <= 0) { m.penance = null; m.standing = clamp(m.standing + 5); note(ctx, 'Penance done', `${m.prior.name} says nothing about it, which is how the house says it is finished.`); } else note(ctx, 'Penance', `${days} days of the floor and the lamps. ${m.penance.days} left.`); return true; }
  if (id === 'faith_tithe_pay') { const owed = m.tithe.arrears; if (!owed) return false; m.tithe.paid += owed * TITHE; m.tithe.arrears = 0; m.tithe.season = seasonOf(s.day); note(ctx, 'The tithe', `${owed * TITHE} gold into the house's box. ${m.prior.name} draws the line under the name.`); return true; }
  if (id === 'faith_vows') { if (m.rank !== 'novice' || m.offices.kept < NOVICE_SEASONS || m.standing < VOWS_STANDING || s.life?.partnerId && m.wing === 'strict' || !shrineHere(s)) return false; return ordain(s, ctx); }
  if (id === 'faith_assignment') { const a = m.assignment; if (!a || a.done || a.locationId !== s.locationId) return false; a.done = true; m.standing = clamp(m.standing + 4); ctx.standing?.('villagers', 2); ctx.standing?.('order', 2); devote(s, 2); note(ctx, 'The prior\'s work', `${cap(a.what)} at ${placeName(s, a.locationId)}: four days of it. ${m.prior.name} will hear, and the house's book will have it.`); return true; }
  if (id === 'faith_keep') { if (m.rank !== 'brother' || m.standing < KEEPER_STANDING || s.day - (m.vows?.since || m.since) < KEEPER_YEARS * 365 || !shrineHere(s) || s.locationId === m.seat) return false; m.rank = 'keeper'; m.shrine = s.locationId; m.tithe.arrears = 0; const st = site(s); if (st) st.keeperIsYou = true; m.penitent = { name: generatePersonName(s.seed, `faith:penitent:${s.day}`), since: s.day, heard: false, confessions: 0 }; note(ctx, 'A shrine to keep', `${m.prior.name} gives you the keys to the shrine at ${placeName(s, s.locationId)}, and the lamp-oil ledger, and the flock, who look at you the way a village looks at a new keeper. ${STIPEND} gold a season from the house, the roof, and nobody over you nearer than ${placeName(s, m.seat)}.`); remember(s, `Given the shrine at ${placeName(s, s.locationId)} to keep.`); return true; }
  if (id === 'faith_hear') { if (m.rank !== 'keeper' || !m.penitent || m.penitent.heard || s.locationId !== m.shrine) return false; m.penitent.heard = true; openThread(s, 'confession', { name: m.penitent.name, sin: ['a theft from the tithe barn', 'a child that is not the husband\'s', 'a word spoken for the other wing', 'a debt to the wrong people', 'a grave opened for the ring'][seededRoll(s.seed, `faith:sin:${s.day}`, 5)] }, ctx); return true; }
  if (id === 'faith_leave') { if (m.rank === 'oblate') return false; leave(s, 'lapsed', ctx); return true; }
  return false;
}
function leave(s, how, ctx) {
  const f = faith(s), m = f.member; if (!m) return;
  f.past.push({ faithId: m.faithId, rank: m.rank, from: m.since, to: s.day, how: m.how, left: how });
  const name = house(m.faithId), st = m.shrine ? site(s, m.shrine) : null; if (st) delete st.keeperIsYou;
  f.member = null;
  if (how === 'lapsed') { if (m.rank !== 'novice') { ctx.standing?.('order', -10); addStationTie(s, { kind: 'knows', name, note: 'the one who left the cloth' }); } note(ctx, 'Lapsed', m.rank === 'novice' ? `You hand the novice's grey back to ${m.prior.name} and walk out of the shrine into an ordinary morning. The house shrugs.` : `You leave the cloth. ${m.prior.name} does not try to keep you; the house has a word for it and the Order has a longer one. The roof is gone, the word is gone, the vows are unsaid and everyone who knew you in grey knows it.`); remember(s, `Left ${name}, lapsed, as ${title(s, m)}.`); }
  else if (how === 'defrocked') { ctx.standing?.('order', -20); ctx.standing?.('villagers', -4); addStationTie(s, { kind: 'hates', name, note: 'put you out of the cloth' }); note(ctx, 'Defrocked', `${m.prior.name} reads it at the shrine door with the congregation behind: the vows broken, the name struck, the grey taken back. ${cap(name)} will not have you again, and where its lamps are lit people will know the face.`); remember(s, `Put out of ${name}.`); }
  else if (how === 'dismissed') { note(ctx, 'Sent home', `${m.prior.name} tells you kindly that the house is not for everyone and the offices were not kept. The grey comes off. Nobody much minds; a novice who goes is a novice who went.`); remember(s, `Sent home from ${name} as a novice.`); }
}

// ---------------------------------------------------------------------------
// The seasonal tick: the offices and the tithe, the prior's work, the stories, the ways in that come to you.
function tickSeason(s, f, season, ctx) {
  const m = f.member;
  if (!m) { comeToYou(s, f, season, ctx); return; }
  const name = house(m.faithId), atShrine = shrineHere(s) || isSettlement(s.world, s.locationId);
  if (m.rank === 'oblate') { if (s.age >= 16) { m.rank = 'novice'; m.offices = { season, kept: 0, missed: 0 }; note(ctx, 'Sixteen', `${m.prior.name} asks, at the shrine door where you were given, whether you will stay. You are a novice now if you keep the offices, and nothing if you do not.`); } return; }
  // The offices missed.
  if (m.offices.season < season - 1 && !m.penance) { m.offices.missed++; m.standing = clamp(m.standing - 3); m.offices.season = season - 1; if (m.rank === 'novice' && m.offices.missed >= NOVICE_MISSED) { leave(s, 'dismissed', ctx); return; } if (m.offices.missed === 2) note(ctx, 'The offices', `Two seasons without the offices. ${m.prior.name} says nothing and the lamps are trimmed by someone else.`); }
  // The tithe (brothers) and the stipend (keepers, the prior).
  if (m.rank === 'brother' && m.tithe.season < season) { m.tithe.season = season; if (s.hero.gold >= TITHE) { s.hero.gold -= TITHE; m.tithe.paid += TITHE; } else { m.tithe.arrears++; if (m.tithe.arrears === ARREARS_DOOR) note(ctx, 'The tithe', `Three seasons of tithe owed to ${name}. ${m.prior.name} says the house is patient and means that it is not.`); else if (m.tithe.arrears >= ARREARS_OUT) { leave(s, 'defrocked', ctx); return; } } }
  if (['keeper', 'prior'].includes(m.rank)) { s.hero.gold += m.rank === 'prior' ? STIPEND * 2 : STIPEND; }
  // Poverty: the house holds what you hold.
  if (m.vows?.poverty && s.hero.gold > 200 && season % 4 === 0) { const excess = Math.floor((s.hero.gold - 200) / 2); s.hero.gold -= excess; m.standing = clamp(m.standing + 2); ctx.standing?.('villagers', 2); note(ctx, 'The vow of poverty', `${excess} gold to the house's poor-box, which is where a brother's surplus goes, and ${m.prior.name} says so in front of people.`); }
  // The prior's work, each spring.
  if (m.rank === 'brother' && season % 4 === 1 && !(m.assignment && !m.assignment.done)) { const where = atShrine ? s.locationId : m.seat; m.assignment = { season, locationId: where, what: ['the sick at the lower houses', 'the burials the village could not pay for', 'the lamp carried to the crossing where the lantern went out', 'the words at the levy\'s leaving', 'the tithe barn\'s ledger set right'][seededRoll(s.seed, `faith:work:${season}`, 5)], done: false }; }
  else if (m.assignment && !m.assignment.done && season - m.assignment.season >= 4) { m.standing = clamp(m.standing - 5); note(ctx, 'Work left undone', `${m.prior.name} does not fine; the house does not fine. It remembers, and your standing in it is less.`); m.assignment = null; }
  if (m.rank !== 'novice' && atShrine && !m.tithe.arrears && season % 2 === 0) m.standing = clamp(m.standing + 1);
  // The sermon at the fair: you or the rival.
  if (season % 4 === 2 && ['novice', 'brother'].includes(m.rank)) { const won = seededRoll(s.seed, `faith:sermon:${season}`, 100) < 30 + Math.min(20, devotion(s)) + Math.min(15, Number(s.hero.skills?.persuasion) || 0) - Math.floor(m.rival.standing / 5); m.rival.sermons.push({ season, won }); m.rival.sermons = m.rival.sermons.slice(-10); if (won) { m.standing = clamp(m.standing + 3); m.rival.standing = clamp(m.rival.standing - 2); } else m.rival.standing = clamp(m.rival.standing + 3); note(ctx, 'The sermon at the fair', won ? `The house let you give the sermon at the fair this year, and ${m.rival.name} listened from the back.` : `${m.rival.name} gave the sermon at the fair this year, and gave it well, and ${m.prior.name} said so.`); }
  // The penitent comes back.
  if (m.rank === 'keeper' && m.penitent && season % 4 === 0) m.penitent.heard = false;
  // The world: the court's purge at the house door; a hungry village and the tithe; vows broken; the doubter; the preacher; the succession.
  const home = m.region, open = f.threads.filter(t => !t.closed).length;
  if (!open) {
    const purge = activeEvents(s).find(e => e.kind === 'purge' && e.regionId === home);
    const hunger = activeEvents(s).find(e => ['raid', 'war'].includes(e.kind) && e.regionId === home);
    const brokenVow = m.vows && ((m.vows.chastity && s.life?.partnerId) || (s.legal?.evidence || 0) > f.evidenceSeen);
    if (brokenVow) openThread(s, 'inquiry', { what: m.vows.chastity && s.life?.partnerId ? 'a household kept against the vow' : 'a name in the court\'s book' }, ctx);
    else if (purge && m.rank !== 'novice' && !f.threads.some(t => t.def === 'door' && t.roles?.eventId === purge.id)) openThread(s, 'door', { eventId: purge.id, target: ANCESTRY_WORD[purge.target] || 'the marked' }, ctx);
    else if (hunger && ['brother', 'keeper'].includes(m.rank) && seededRoll(s.seed, `faith:tithe:${season}`, 100) < 35) openThread(s, 'tithe', { village: placeName(s, hunger.siteIds?.[0] || m.shrine || homeOf(s)), siteId: hunger.siteIds?.[0] || m.shrine || homeOf(s) }, ctx);
    else if ((s.delves?.kept || []).some(k => k.owner === 'faith') && m.rank !== 'novice' && seededRoll(s.seed, `faith:relic:${season}`, 100) < 40) openThread(s, 'relic', { name: (s.delves.kept.find(k => k.owner === 'faith') || {}).name }, ctx);
    else if (m.rank !== 'oblate' && seededRoll(s.seed, `faith:heresy:${season}`, 100) < 6) openThread(s, 'heresy', { preacher: generatePersonName(s.seed, `faith:preacher:${season}`), wing: m.wing === 'open' ? 'strict' : 'open' }, ctx);
    else if (['brother', 'keeper'].includes(m.rank) && !m.doubter && seededRoll(s.seed, `faith:doubter:${season}`, 100) < 5) openThread(s, 'doubter', { name: generatePersonName(s.seed, `faith:doubter:${season}`) }, ctx);
    else if (m.rank === 'keeper' && s.age >= 35 && s.day - m.prior.bornDay >= 70 * 365 && s.day - m.since >= 10 * 365 && seededRoll(s.seed, `faith:succession:${season}`, 100) < 15) openThread(s, 'succession', { prior: m.prior.name, rival: m.rival.name }, ctx);
  }
  f.evidenceSeen = s.legal?.evidence || 0;
}
/** The ways in that come to you: the shrine asks for a child; a vow is made when it is bad. */
function comeToYou(s, f, season, ctx) {
  if (f.past.some(p => p.left === 'defrocked')) return;
  // The oblate: a poor house's child at the shrine school, asked for once at nine or ten.
  if (!f.oblateAsked && s.age >= 9 && s.age <= 10 && s.education?.route === 'shrine' && s.education?.enrolled && ['bound', 'common'].includes(s.hero.station?.id) && shrineHere(s)) { f.oblateAsked = true; openThread(s, 'oblate', { keeper: priorOf(s, localFaith(s)).name, faithId: localFaith(s) }, ctx); return; }
  // The vow in the dark: a lost child or sibling, a beating taken, a winter survived — once, and only for the congregation.
  if (!f.vow && s.age >= 16 && s.realm?.faithId && !f.threads.some(t => t.def === 'vow')) {
    const grief = (s.life?.people || []).some(p => p.alive === false && p.deathDay >= s.day - 92) || (s.battlecraft?.injuries || []).some(i => i.day >= s.day - 92 && i.id !== 'bruised');
    if (grief && seededRoll(s.seed, `faith:vow:${season}`, 100) < 30) openThread(s, 'vow', { faithId: s.realm.faithId }, ctx);
  }
}
export function onFaithTime(s, { newDay }, ctx = {}) {
  const f = faith(s); if (!f || s.phase === 'retired' || !s.realm) return;
  const to = seasonOf(newDay);
  for (let n = f.lastSeason + 1; n <= to; n++) { tickSeason(s, f, n, ctx); for (const t of f.threads) if (t.followUp && t.followUp.season <= n && !t.closed) followUp(s, n, t, ctx); f.lastSeason = n; }
}

// ---------------------------------------------------------------------------
// Threads: the scene, the choice, the memory.
const THREAD_COOLDOWN = 8;
function openThread(s, def, roles, ctx) {
  const f = faith(s), season = seasonOf(s.day); if (f.threads.filter(t => !t.closed).length >= 3) return null;
  if (!['inquiry', 'door'].includes(def) && f.threads.some(t => t.def === def && season - t.season < (def === 'confession' ? 4 : THREAD_COOLDOWN))) return null;
  f.counters.threads++;
  const t = { id: `ft-${f.counters.threads}`, def, roles, season, stage: 'open', choice: null, followUp: null, memory: [], closed: false };
  f.threads.push(t); if (f.threads.length > LIMITS.threads) f.threads.splice(Math.max(0, f.threads.findIndex(x => x.closed)), 1);
  void ctx; return t;
}
export function flushFaithEvent(s, ctx = {}) {
  const f = faith(s); if (!f || s.event || s.battle || s.phase === 'retired') return false;
  const t = f.threads.find(t => t.stage === 'open' && !t.closed); if (!t) return false;
  const m = f.member, r = t.roles;
  if (!m && !['oblate', 'vow'].includes(t.def)) { t.closed = true; return false; }
  const name = house(m?.faithId || r.faithId);
  if (t.def === 'oblate') { ctx.setEvent?.('faith_oblate', 'The keeper asks', 'The cloth', `${r.keeper}, who keeps the shrine, speaks to your mother at the door and then to you. The house would take you: a bed, bread, the letters, the words, the lamps. One less mouth at home. Your mother is looking at the floor.`, [{ id: 'accept', label: 'Go with the keeper', description: `An oblate of ${name}. Home is a place you visit.` }, { id: 'continue', label: 'Stay at home', description: 'The keeper nods, and the school goes on as it was, and the house asks nobody twice.' }]); return true; }
  if (t.def === 'vow') { ctx.setEvent?.('faith_vow', 'The vow in the dark', 'The cloth', `It was bad, and in the worst of it you promised ${faithOf(r.faithId)?.name || 'the house'} that if you came through you would give it the rest. You came through. The promise is still there in the morning, and so is the shrine.`, [{ id: 'swear', label: 'Keep the promise', description: `A novice of ${name}, by a vow made in the dark. The house takes those as the truest kind.` }, natureChoice(s, 'skeptical', { id: 'continue', label: 'It was the fever talking', description: 'Vows made in the dark are the dark\'s. The morning owes it nothing.' }) || { id: 'continue', label: 'Let it lie', description: 'You will remember that you did. So, in its way, will the house.' }]); return true; }
  if (t.def === 'heresy') { ctx.setEvent?.('faith_heresy', 'The preacher', 'The cloth', `${r.preacher} preaches at the well, to a crowd that is bigger every evening: that the house should ${WINGS[m.faithId]?.[r.wing] || 'change'}, which is what ${r.wing === m.wing ? 'you' : 'the other wing'} says and ${m.prior.name} does not. ${m.prior.name} wants a name denounced at the shrine door.`, [{ id: 'denounce', label: `Denounce ${r.preacher}`, description: 'The Order hears; the village hears too. The preacher leaves, or is made to.' }, { id: 'listen', label: 'Go and listen', description: 'An evening at the well. Devotion, or doubt, or both.' }, { id: 'shelter', label: `Give ${r.preacher} the shrine's roof`, description: `${cap(priorWord(m))} will mark you for it. The village will remember it the other way.`, ...(m.rank === 'novice' ? { disabledReason: 'A novice has no roof to give.' } : {}) }, { id: 'continue', label: 'Say nothing either way', description: 'The crowd thins or it does not. The prior notices who was not at the door.' }]); return true; }
  if (t.def === 'tithe') { ctx.setEvent?.('faith_tithe', 'The tithe in a hungry year', 'The cloth', `${m.prior.name} sends you to ${r.village} for the house's tithe, and ${r.village} has had the kind of year where the tithe is the seed corn. The barn is half empty and a woman at the door asks whether the house eats children now.`, [{ id: 'collect', label: 'Collect it', description: `${TITHE * 4} gold to the house, and ${r.village} remembers whose hands.` }, { id: 'forgive', label: 'Forgive it this year', description: `${r.village} remembers that too. ${m.prior.name} does not forgive it.` }, { id: 'pay', label: 'Pay it yourself', description: `${TITHE * 4} gold from your own purse into the house's box, and nobody the wiser but you.`, ...(s.hero.gold < TITHE * 4 ? { disabledReason: `You have ${s.hero.gold} gold.` } : {}) }, { id: 'continue', label: 'Come back without it and without a reason', description: 'The prior sends someone else, who collects it.' }]); return true; }
  if (t.def === 'relic') { ctx.setEvent?.('faith_relic', 'What sits on your shelf', 'The cloth', `${m.prior.name} has heard — the house hears everything — that ${r.name || 'a relic of the faith'} sits on your shelf, brought up from below. The house would like it on the altar, where it belongs, and would like to have been told.`, [{ id: 'return', label: 'Bring it to the altar', description: 'The house’s regard, and a feast day with your name in it.' }, { id: 'keep', label: 'Keep it', description: 'It is yours by the climb. The prior will not forget who said so.' }, { id: 'continue', label: 'Say you will think about it', description: 'The house thinks about it too.' }]); return true; }
  if (t.def === 'doubter') { ctx.setEvent?.('faith_doubter', 'The doubter', 'The cloth', `${r.name}, who took the vows the year you did, tells you at the lamps, quietly, that there is nothing behind them. No light, no dead, no wild. ${r.name} keeps the offices as well as anyone and means to go on keeping them. Nobody else knows.`, [{ id: 'report', label: `Tell ${m.prior.name}`, description: `${r.name} is put out. The prior trusts you more and the house less.` }, { id: 'keep', label: 'Keep the secret', description: 'If it comes out, it comes out with your name beside it.' }, { id: 'persuade', label: 'Argue the light back into them', description: 'Persuasion, and devotion. It may work. It may cost you your own.', ...((Number(s.hero.skills?.persuasion) || 0) < 4 ? { disabledReason: 'You have not the words for it.' } : {}) }, { id: 'continue', label: 'Say nothing, and trim the lamps', description: `${r.name} nods and goes on. So do you.` }]); return true; }
  if (t.def === 'door') { ctx.setEvent?.('faith_door', 'The court at the door', 'The cloth', `The court's men are in the street with the list, and ${r.target} are at the shrine door asking for the old right of the roof. ${m.prior.name} is of ${priorWord(m)}: ${m.wing === 'open' ? 'the door is open, and the court knows it' : 'the door is shut, and the court knows it'}. You are the one at the door.`, [{ id: 'open', label: 'Open the door', description: m.wing === 'open' ? 'As the prior would. The court marks the house, and you with it.' : 'Against the prior. The court marks the house, the prior marks you, the village marks you the other way.' }, { id: 'shut', label: 'Shut it', description: m.wing === 'strict' ? 'As the prior would. The village remembers the faces at the window.' : 'Against the prior, who will hear of it. The court approves.' }, { id: 'stand', label: 'Stand in it', description: 'Neither open nor shut: you, in the doorway, in the grey, and the court’s men deciding. Some keepers have died in doorways. Those are the ones with feast days.' }, { id: 'continue', label: 'Be at the back of the shrine', description: 'Someone else answers the door. The prior notices.' }]); return true; }
  if (t.def === 'inquiry') { ctx.setEvent?.('faith_inquiry', 'The prior\'s inquiry', 'The cloth', `${m.prior.name} has you at the altar rail with the book open: ${r.what}, against the vows you took on this floor. The house does not shout. It asks.`, [{ id: 'confess', label: 'Confess it', description: `${PENANCE_DAYS} days of penance and the house's thin regard, and the cloth kept.` }, { id: 'deny', label: 'Deny it', description: 'Persuasion against a prior who has heard every denial. If it holds, nothing; if it does not, the grey comes off.', ...((Number(s.hero.skills?.persuasion) || 0) < 5 ? { disabledReason: 'The prior would see through you.' } : {}) }, { id: 'leave', label: 'Take the grey off yourself', description: 'Lapsed, not defrocked. It is a smaller word.' }, { id: 'continue', label: 'Say nothing', description: 'The house takes silence for an answer, and puts you out.' }]); return true; }
  if (t.def === 'succession') { ctx.setEvent?.('faith_succession', 'The priory', 'The cloth', `${r.prior} is dying, slowly and with visitors, and the house will choose at the next chapter. ${r.rival} has been at every keeper's door with a candle. Your standing in the house is ${m.standing >= 65 ? 'high' : m.standing >= 45 ? 'fair' : 'thin'}.`, [{ id: 'stand', label: 'Stand for the priory', description: 'The chapter votes. Win, and the house is yours to turn open or strict; lose, and the rival turns it, and you.', ...(m.standing < 45 || m.rank !== 'keeper' ? { disabledReason: m.rank !== 'keeper' ? 'The chapter chooses from the keepers.' : 'The chapter would not hear your name.' } : {}) }, { id: 'back', label: `Back ${r.rival}`, description: 'A prior who owes you. Not nothing.' }, { id: 'continue', label: 'Stay out of it', description: 'The house will have a prior either way, and remembers who did not help choose.' }]); return true; }
  if (t.def === 'confession') { ctx.setEvent?.('faith_confession', 'A confession', 'The cloth', `${r.name} kneels and says it: ${r.sin}. The shrine is empty. Whatever you say next, ${r.name} will carry out of here and so will you.`, [{ id: 'counsel', label: 'Counsel them', description: 'Devotion, and an hour. They go lighter; the thing is still done.' }, { id: 'report', label: 'Tell the court', description: 'What was said under the lamp is said in the hall. The court approves; the village learns what the shrine is for.' }, { id: 'absolve', label: 'Absolve them and say nothing', description: 'The house’s old right. The village trusts the shrine; the court, less.' }, { id: 'continue', label: 'Send them away unheard', description: 'They do not come back.' }]); return true; }
  t.closed = true; return false;
}
export function applyFaithChoice(s, eventId, pick, ctx = {}) {
  const f = faith(s); if (!f) return false;
  const t = f.threads.find(t => t.stage === 'open' && !t.closed && `faith_${t.def}` === eventId); if (!t) return false;
  if (s.event?.id === eventId) s.event = null;
  t.choice = pick; t.stage = 'chosen';
  const result = decide(s, f, t, pick, ctx);
  if (!t.followUp) t.closed = true;
  return result;
}
function decide(s, f, t, pick, ctx) {
  const m = f.member, r = t.roles, season = seasonOf(s.day), later = (n, roles = {}) => { t.followUp = { season: season + n, ...roles }; };
  const say = (text) => { t.memory.push(text); if (t.memory.length > 6) t.memory.shift(); };
  switch (t.def) {
    case 'oblate': if (pick === 'accept') { enrol(s, r.faithId, 'oblate', 'given', ctx); if (s.family) s.family.support = clamp((s.family.support || 50) - 5); say('Given to the house as a child.'); } else say('The keeper asked for you once, and your mother kept you.'); return true;
    case 'vow': f.vow = { day: s.day, kept: pick === 'swear' }; if (pick === 'swear') { enrol(s, r.faithId, 'novice', 'vowed', ctx); say('A vow made in the dark, kept in the morning.'); } else { stress(s, 3); say('A vow made in the dark, and left there.'); } return true;
    case 'heresy':
      if (pick === 'denounce') { m.standing = clamp(m.standing + 6); ctx.standing?.('order', 6); ctx.standing?.('villagers', -6); addStationTie(s, { kind: 'hates', name: r.preacher, note: 'denounced at the shrine door' }); note(ctx, 'Denounced', `You name ${r.preacher} at the shrine door and the Order's men do the rest. The well is quiet by the week's end. The village looks at the grey differently.`); say(`Denounced ${r.preacher}.`); }
      else if (pick === 'listen') { if (Number.isFinite(s.hero.skills?.devotion)) s.hero.skills.devotion += 1; if (r.wing !== m.wing && seededRoll(s.seed, `faith:listen:${t.id}`, 100) < 40) { m.wing = r.wing; note(ctx, 'An evening at the well', `${r.preacher} preaches that the house should ${WINGS[m.faithId]?.[r.wing]}, and somewhere in the second hour you find you agree. You are of the other wing now, and ${m.prior.name} is not.`); say(`Went over to the ${r.wing} wing at the well.`); } else { note(ctx, 'An evening at the well', `${r.preacher} preaches well. You go home with your own faith and the sound of theirs.`); say(`Listened to ${r.preacher}.`); } }
      else if (pick === 'shelter') { m.standing = clamp(m.standing - 12); ctx.standing?.('villagers', 6); ctx.standing?.('order', -4); note(ctx, 'The shrine\'s roof', `${r.preacher} sleeps under the shrine's roof three nights while ${priorWord(m)} finds out. ${m.prior.name} writes something down. The village, which liked the preaching, likes you.`); say(`Sheltered ${r.preacher}.`); later(2, { what: 'shelter' }); }
      else { m.standing = clamp(m.standing - 2); say('Said nothing about the preacher at the well.'); }
      return true;
    case 'tithe':
      if (pick === 'collect') { m.standing = clamp(m.standing + 5); m.tithe.paid += TITHE * 4; ctx.standing?.('villagers', -8); note(ctx, 'The tithe collected', `${TITHE * 4} gold from ${r.village} into the house's box, the seed corn with it. ${m.prior.name} is pleased and says so. ${r.village} remembers whose hands.`); say(`Collected the tithe from ${r.village} in a hungry year.`); }
      else if (pick === 'forgive') { m.standing = clamp(m.standing - 8); ctx.standing?.('villagers', 6); devote(s, 3); note(ctx, 'The tithe forgiven', `You tell ${r.village} the house will wait a year, which is not what the house said. ${m.prior.name} hears by evening and says nothing to you for a month, which is how priors shout.`); say(`Forgave ${r.village} the tithe.`); }
      else if (pick === 'pay') { s.hero.gold -= TITHE * 4; m.tithe.paid += TITHE * 4; devote(s, 5); ctx.standing?.('villagers', 3); note(ctx, 'The tithe paid', `${TITHE * 4} gold of your own into the house's box with ${r.village}'s name on the line. Nobody the wiser, except the woman at the door, who saw your face.`); say(`Paid ${r.village}'s tithe from your own purse.`); }
      else { m.standing = clamp(m.standing - 4); say('Came back without the tithe.'); }
      return true;
    case 'relic':
      if (pick === 'return') { const i = (s.delves?.kept || []).findIndex(k => k.owner === 'faith'); if (i >= 0) s.delves.kept.splice(i, 1); m.standing = clamp(m.standing + 12); devote(s, 8); ctx.standing?.('order', 4); ctx.standing?.('villagers', 3); note(ctx, 'The altar', `${r.name || 'The relic'} on the altar where it belongs, and a feast day with your name in the prayers. ${m.prior.name} is almost warm.`); say(`Brought ${r.name || 'the relic'} to the altar.`); }
      else if (pick === 'keep') { m.standing = clamp(m.standing - 8); note(ctx, 'The shelf', `It is yours by the climb, you say, and ${m.prior.name} says nothing, and writes it down.`); say(`Kept ${r.name || 'the relic'} from the house.`); }
      else say('Said you would think about the relic.');
      return true;
    case 'doubter':
      m.doubter = { name: r.name, told: pick };
      if (pick === 'report') { m.standing = clamp(m.standing + 5); ctx.standing?.('villagers', -3); addStationTie(s, { kind: 'hates', name: r.name, note: 'put out of the cloth on your word' }); note(ctx, 'The doubter', `${r.name} is put out of the house by the week's end and does not look at you as they go. ${m.prior.name} trusts you more. You trust the lamps less.`); say(`Told the prior about ${r.name}.`); }
      else if (pick === 'keep') { say(`Kept ${r.name}'s doubt.`); later(6, { what: 'doubt' }); }
      else if (pick === 'persuade') { const won = seededRoll(s.seed, `faith:persuade:${t.id}`, 100) < 30 + Math.min(20, Number(s.hero.skills?.persuasion) || 0) + Math.min(20, devotion(s)); if (won) { m.standing = clamp(m.standing + 3); devote(s, 4); note(ctx, 'The doubter', `A long night of it at the lamps, and toward morning ${r.name} says perhaps, which is more than they had. You are tired and surer.`); say(`Argued the light back into ${r.name}.`); } else { devote(s, -6); stress(s, 6); if (hasNature(s, 'zealous')) shiftNature(s, 'skeptical', 'The lamps', `A night arguing for the light with ${r.name}, and in the morning it is you who is not sure.`, ctx); else note(ctx, 'The doubter', `A long night of it, and you lose. ${r.name} goes on keeping the offices. So do you, with less behind them.`); say(`Argued with ${r.name} and lost.`); } }
      else say(`Said nothing to ${r.name}, and trimmed the lamps.`);
      return true;
    case 'door': {
      const defied = (pick === 'open' && m.wing === 'strict') || (pick === 'shut' && m.wing === 'open');
      if (pick === 'open') { ctx.standing?.('villagers', 8); ctx.standing?.('order', -4); ctx.addEvidence?.(1, 'The court marked the shrine door that opened to the list.'); if (defied) { m.standing = clamp(m.standing - 15); note(ctx, 'The door opened', `You open it, against ${m.prior.name}, and ${r.target} come in past you and the court's men write the house's name and yours. The village saw. ${m.prior.name} saw.`); } else { m.standing = clamp(m.standing + 6); note(ctx, 'The door opened', `You open it, as the house would, and the court's men write the house's name and yours and go. The village saw.`); } say(`Opened the shrine door to ${r.target} in the purge.`); }
      else if (pick === 'shut') { ctx.standing?.('villagers', -8); ctx.standing?.('order', 3); if (defied) { m.standing = clamp(m.standing - 12); note(ctx, 'The door shut', `You shut it, against ${m.prior.name}, and the court's men take ${r.target} from the step. The court approves of you. Nobody else in the street does, and the prior least.`); } else { m.standing = clamp(m.standing + 4); note(ctx, 'The door shut', `You shut it, as the house would, and the court's men take ${r.target} from the step. The village remembers the faces at the window.`); } say(`Shut the shrine door on ${r.target} in the purge.`); }
      else if (pick === 'stand') { const killed = seededRoll(s.seed, `faith:door:${t.id}`, 100) < 20; ctx.standing?.('villagers', 12); ctx.standing?.('order', 2); m.standing = clamp(m.standing + 10); devote(s, 10); if (killed) { note(ctx, 'The doorway', `You stand in the doorway in the grey and the court's men decide. There is a feast day with your name on it now.`); remember(s, 'Died in the shrine doorway.'); ctx.endLife?.(`Killed in the doorway of the shrine at ${placeName(s, s.locationId)}, standing between the court and ${r.target}`); return true; } note(ctx, 'The doorway', `You stand in the doorway in the grey and the court's men decide, and decide not. ${r.target} are behind you and then gone out the back. The village will tell it for years. The court writes your name in a different book.`); ctx.addEvidence?.(1, 'The court remembers the keeper in the doorway.'); say(`Stood in the shrine doorway against the court.`); }
      else { m.standing = clamp(m.standing - 5); say('Was at the back of the shrine when the court came.'); }
      return true;
    }
    case 'inquiry':
      if (pick === 'confess') { m.standing = clamp(m.standing - 10); m.penance = { days: PENANCE_DAYS, since: s.day }; note(ctx, 'Confessed', `You say it at the rail. ${PENANCE_DAYS} days of penance, the floor and the lamps and the silence, and the house's regard thin as water. The cloth kept.`); say(`Confessed to the prior: ${r.what}.`); }
      else if (pick === 'deny') { const held = seededRoll(s.seed, `faith:deny:${t.id}`, 100) < 25 + Math.min(30, Number(s.hero.skills?.persuasion) || 0); if (held) { note(ctx, 'Denied', `You deny it and ${m.prior.name} looks at you a long time and closes the book. It holds. You will remember the look.`); if (hasNature(s, 'honest')) stress(s, 10); say('Denied the prior\'s inquiry and was believed.'); } else { say('Denied the prior\'s inquiry and was not believed.'); leave(s, 'defrocked', ctx); } }
      else if (pick === 'leave') { say('Took the grey off at the rail.'); leave(s, 'lapsed', ctx); }
      else { say('Said nothing at the rail.'); leave(s, 'defrocked', ctx); }
      return true;
    case 'succession':
      if (pick === 'stand') { const won = seededRoll(s.seed, `faith:chapter:${t.id}`, 100) < 25 + Math.min(45, m.standing - 20) - Math.floor(m.rival.standing / 5); if (won) { m.rank = 'prior'; m.prior = { name: s.hero.name, since: s.day, wing: m.wing, bornDay: s.timeline?.birthDay ?? s.day - s.age * 365 }; m.shrine = m.seat; note(ctx, 'The priory', `The chapter votes, and it is you. ${r.rival} kisses your hand with a face like a shut door. The house is yours: open or strict, as you say, and the court will want to know which.`); remember(s, `Chosen prior of ${house(m.faithId)}.`); } else { m.prior = { name: r.rival, since: s.day, wing: m.wing === 'open' ? 'strict' : 'open', bornDay: s.day - 45 * 365 }; m.wing = m.wing; m.standing = clamp(m.standing - 10); note(ctx, 'The priory', `The chapter votes, and it is ${r.rival}, who turns the house ${m.prior.wing} within the month and gives you the far shrine to keep.`); } say(won ? 'Stood for the priory and won.' : 'Stood for the priory and lost.'); }
      else if (pick === 'back') { m.prior = { name: r.rival, since: s.day, wing: seededRoll(s.seed, `faith:rivalwing:${t.id}`, 2) ? 'open' : 'strict', bornDay: s.day - 45 * 365 }; m.standing = clamp(m.standing + 8); m.rival.standing = clamp(m.rival.standing + 10); note(ctx, 'The priory', `${r.rival} is prior, and owes you, and knows it. The house turns ${m.prior.wing}.`); say(`Backed ${r.rival} for the priory.`); }
      else { m.prior = { name: r.rival, since: s.day, wing: seededRoll(s.seed, `faith:rivalwing:${t.id}`, 2) ? 'open' : 'strict', bornDay: s.day - 45 * 365 }; m.standing = clamp(m.standing - 4); say('Stayed out of the succession.'); }
      return true;
    case 'confession':
      if (m.penitent) m.penitent.confessions++;
      if (pick === 'counsel') { if (Number.isFinite(s.hero.skills?.devotion)) s.hero.skills.devotion += 1; devote(s, 3); ctx.standing?.('villagers', 2); note(ctx, 'The confession', `An hour under the lamp, and ${r.name} goes lighter. The thing is still done. You carry it now too.`); say(`Counselled ${r.name} over ${r.sin}.`); }
      else if (pick === 'report') { ctx.standing?.('order', 4); ctx.standing?.('villagers', -8); m.standing = clamp(m.standing - 4); addStationTie(s, { kind: 'hates', name: r.name, note: 'told the court what was said under the lamp' }); m.penitent = null; note(ctx, 'The confession', `What was said under the lamp is said in the hall by evening. The court approves. The village learns what the shrine is for, and the door is quieter after.`); say(`Told the court what ${r.name} confessed.`); }
      else if (pick === 'absolve') { ctx.standing?.('villagers', 5); ctx.standing?.('order', -2); devote(s, 2); note(ctx, 'The confession', `You say the old words and ${r.name} goes out into the evening with it lifted. The village trusts the shrine a little more; the court, a little less.`); say(`Absolved ${r.name}.`); }
      else { ctx.standing?.('villagers', -2); m.penitent = null; say(`Sent ${r.name} away unheard.`); }
      return true;
  }
  return true;
}
function followUp(s, season, t, ctx) {
  const m = cloth(s); t.followUp = null; t.closed = true; if (!m) return;
  if (t.def === 'heresy' && t.choice === 'shelter') { if (seededRoll(s.seed, `faith:shelter:${t.id}`, 100) < 50) { openThread(s, 'inquiry', { what: 'the shrine\'s roof over a preacher of the other wing' }, ctx); } else note(ctx, 'The preacher, after', `${t.roles.preacher} is heard of in another region, preaching the same. Nothing comes of the three nights. ${m.prior.name} has not forgotten them.`); }
  if (t.def === 'doubter' && t.choice === 'keep') { if (seededRoll(s.seed, `faith:doubt:${t.id}`, 100) < 35) { m.standing = clamp(m.standing - 10); note(ctx, 'The doubt comes out', `${t.roles.name}'s doubt comes out, as doubts do, and with it that you knew. ${m.prior.name} says nothing to you for a season.`); } else note(ctx, 'The doubter, after', `${t.roles.name} keeps the offices and the secret, and so do you.`); }
}

// ---------------------------------------------------------------------------
// The world reacts: what the cloth cannot do.
const MARTIAL = /soldier|mercenar|assassin|thief|smuggl|bandit|sell-?sword|pit/i;
export function applyFaithGates(s, actions) {
  const m = cloth(s); if (!m) return actions;
  // The vows' reasons win over the room's: the point is that the cloth shuts these, not that the Homes area is elsewhere.
  for (const a of actions) {
    if (a.id === 'realm_leavefaith' || /^realm_join_/.test(a.id)) { a.disabledReason = 'Leave the cloth first; the congregation goes with it.'; continue; }
    if (!m.vows) continue;
    if (m.vows.chastity && /^life_(court|commit)_/.test(a.id)) a.disabledReason = 'The cloth. You took a vow about this on the shrine floor.';
    else if (m.vows.poverty && /^life_home_/.test(a.id)) a.disabledReason = 'The house holds what you hold. A brother keeps no house of his own.';
    else if (/^career_choose_/.test(a.id) && MARTIAL.test(`${a.id} ${a.label || ''}`)) a.disabledReason = 'Not under the cloth.';
  }
  return actions;
}
/** The heir takes the name in the house's book: a kept cloth opens the novice's door; a defrocked parent's child starts in the Order's shade. */
export function inheritFaith(old, s) {
  if (!old.faith || !s.faith) return;
  const m = old.faith.member, last = old.faith.past.at(-1);
  if (m) { s.faith.heir = { faithId: m.faithId, from: old.hero.name, rank: m.rank, left: 'kept' }; if (s.realm) s.realm.faithId = m.faithId; }
  else if (last) { s.faith.heir = { faithId: last.faithId, from: old.hero.name, rank: last.rank, left: last.left }; if (last.left === 'defrocked' && s.factions) s.factions.order = clamp((s.factions.order || 0) - 10, -100); }
}

// ---------------------------------------------------------------------------
// Read models.
export function faithView(s) {
  const f = faith(s); if (!f) return null;
  const m = f.member;
  return { member: m ? { ...m, title: title(s), house: house(m.faithId), faith: faithOf(m.faithId)?.name, seatName: placeName(s, m.seat), shrineName: m.shrine ? placeName(s, m.shrine) : null, wingLine: WINGS[m.faithId]?.[m.wing] || null, priorWing: priorWord(m), years: Math.floor((s.day - m.since) / 365) } : null, heir: f.heir ? { ...f.heir, house: house(f.heir.faithId) } : null, past: f.past.map(p => ({ ...p, house: house(p.faithId) })), vow: f.vow, threads: f.threads.filter(t => t.memory.length).slice(-6), history: f.history.slice(-6), congregation: s.realm?.faithId ? faithOf(s.realm.faithId)?.name : null, devotion: s.realm?.devotion || 0 };
}
export function faithRightNow(s) {
  const rows = [], m = cloth(s); if (!m) return rows;
  if (m.tithe.arrears >= 2) rows.push({ id: 'faith_tithe_pay', text: `${m.tithe.arrears} seasons of tithe owed to the house. At ${ARREARS_OUT} it puts you out.` });
  if (m.offices.season < seasonOf(s.day) && m.rank !== 'oblate') rows.push({ id: 'faith_offices', text: 'The offices this season are not kept yet.' });
  if (m.penance) rows.push({ id: 'faith_penance', text: `${m.penance.days} days of penance owed.` });
  if (m.rank === 'novice' && m.offices.kept >= NOVICE_SEASONS && m.standing >= VOWS_STANDING) rows.push({ id: 'faith_vows', text: 'The house will hear your vows.' });
  if (m.assignment && !m.assignment.done) rows.push({ id: 'faith_assignment', text: `The prior's work waits at ${placeName(s, m.assignment.locationId)}.` });
  return rows;
}
export function faithSummary(s) {
  const f = faith(s); if (!f) return null;
  const m = f.member;
  return { member: m ? `${m.rank} (${m.how})` : f.past.length ? `out (${f.past.at(-1).left})` : f.vow ? (f.vow.kept ? 'vowed' : 'a vow left in the dark') : null, threads: f.threads.filter(t => t.choice).length, standing: m?.standing ?? null, wing: m?.wing ?? null };
}
export function validateFaith(f, s) {
  if (f === undefined) return true;
  if (!f || typeof f !== 'object' || f.version !== 1 || !Array.isArray(f.past) || !Array.isArray(f.threads) || f.threads.length > LIMITS.threads || !Array.isArray(f.history) || !Number.isInteger(f.lastSeason)) return false;
  const m = f.member;
  if (m !== null) {
    if (!m || !faithOf(m.faithId) || !RANKS.includes(m.rank) || !Number.isInteger(m.since) || !['given', 'called', 'ordained', 'vowed', 'heir'].includes(m.how) || !Number.isFinite(m.standing) || m.standing < 0 || m.standing > 100) return false;
    if (!['open', 'strict'].includes(m.wing) || !m.prior || typeof m.prior.name !== 'string' || !['open', 'strict'].includes(m.prior.wing) || !m.rival || typeof m.rival.name !== 'string') return false;
    if (!m.offices || !Number.isInteger(m.offices.season) || !Number.isInteger(m.offices.kept) || !m.tithe || !Number.isInteger(m.tithe.arrears) || m.tithe.arrears > ARREARS_OUT) return false;
    if (m.vows !== null && (!m.vows || typeof m.vows.poverty !== 'boolean' || typeof m.vows.chastity !== 'boolean' || !Number.isInteger(m.vows.since))) return false;
    if (m.penance !== null && (!m.penance || !Number.isInteger(m.penance.days) || m.penance.days < 1)) return false;
    if (m.shrine !== null && typeof m.shrine !== 'string') return false;
    if (s?.realm && s.realm.faithId !== m.faithId) return false;
  }
  if (f.heir !== null && (!f.heir || !faithOf(f.heir.faithId) || !['kept', 'lapsed', 'defrocked', 'dismissed'].includes(f.heir.left))) return false;
  if (!f.past.every(p => faithOf(p.faithId) && RANKS.includes(p.rank) && ['lapsed', 'defrocked', 'dismissed'].includes(p.left))) return false;
  for (const t of f.threads) if (!t || typeof t.id !== 'string' || !Object.keys(FAITH_EVENTS.ids()).includes(`faith_${t.def}`) || !['open', 'chosen'].includes(t.stage) || typeof t.closed !== 'boolean') return false;
  return true;
}
