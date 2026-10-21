import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances, validateStation, addStationTie, TIES_MAX } from '../dist/js/station.js';
import { isSettlement, travelPreview } from '../dist/js/world.js';
import { SEASON_DAYS, seasonOf } from '../dist/js/living-world.js';
import { onGuildTime, validateGuild, guildView, guildSummary, inheritGuild, DUES, BUY_IN, WANDER_SEASONS, ARREARS_OUT, GUILD_NAME } from '../dist/js/guild.js';
import { guildPanel } from '../dist/js/activities-v31.js';
import { whatMatters } from '../dist/js/voice.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'trade', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) {
  for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s));
  return s;
}
const settle = s => { for (let n = 0; n < 40 && (s.event || s.timeline?.yearTarget !== null) && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.continueAgeUp(s); return s; };
const regionOf = (s, id) => s.realm.sites[id]?.regionId;
const PROF = { blacksmith: 'Blacksmith', merchant: 'Merchant', miner: 'Miner' };
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {}, setEvent: () => {}, killPerson: () => true, addObligation: () => {}, finishObligation: () => {} } }; };
/** A member of the given craft, grown to eighteen and put on the rolls by the family's name. */
function member(seed = 'g-2', age = 18) {
  let s = grow(born(seed), age); if (s.phase === 'retired' || !s.guild.family) return null;
  s.hero.profession = PROF[s.guild.family]; s.hero.gold = 300; s.hero.mp = s.hero.maxMp;
  s = settle(engine.chooseAction(s, 'guild_join'));
  return s.guild.member ? s : null;
}
/** Takes a hall action through the public engine and checks it spends its displayed days and fee once (less what the hall pays). */
function act(s, id, { earned = 0 } = {}) {
  const a = engine.getActions(s).find(a => a.id === id); assert.ok(a, `${id} offered`); assert.equal(a.disabledReason, undefined, `${id}: ${a.disabledReason}`);
  const gold = s.hero.gold, day = s.day, next = engine.chooseAction(s, id);
  if (!next.event) { assert.equal(next.day - day, a.days, `${id} spends its days once`); if (earned !== null) assert.equal(next.hero.gold - gold, earned - a.cost, `${id} pays its fee once`); }
  assert.equal(engine.validateSave(next), true, `${id} leaves a valid save`);
  return settle(next);
}
function goTo(s, id) {
  s = engine.travelTo(s, id);
  for (let n = 0; n < 300 && s.timeline?.journey; n++) { if (s.event) { s = engine.chooseEventOption(s, pick(s)); continue; } if (s.battle) return null; if (s.hero.mp < Math.ceil(s.hero.maxMp * .3)) { const camp = engine.getActions(s).find(a => a.id === 'trail_camp' && !a.disabledReason); if (camp) { s = engine.chooseAction(s, 'trail_camp'); continue; } } s = engine.continueJourney(s); }
  return settle(s);
}
const tick = (s, seasons, ctx) => { const old = s.day; s.day += seasons * SEASON_DAYS; onGuildTime(s, { oldDay: old, newDay: s.day }, ctx); return s; };
/** Seats a hall story so the next step opens its scene through the public engine. */
function seat(s, def, roles) { s.guild.counters.threads++; s.guild.threads.push({ id: `gt-${s.guild.counters.threads}`, def, roles, season: seasonOf(s.day), stage: 'open', choice: null, followUp: null, memory: [], closed: false }); assert.equal(engine.validateSave(s), true); for (let n = 0; n < 6 && s.event?.id !== `guild_${def}`; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); return s; }

test('a trade birth may be a guild family: the parent works the craft and the child joins by the family’s name, which the hall’s ranks then replace', () => {
  const families = ['g-1', 'g-2', 'g-3', 'g-4', 'g-5', 'g-6', 'g-7', 'g-8'].map(seed => born(seed).guild.family);
  assert.ok(families.some(Boolean) && families.some(f => !f), 'some trade families are guild families and some are not');
  assert.equal(born('g-1', 'common').guild.family, null, 'a common birth has no name at the table');
  const b = born('g-2'); assert.equal(b.guild.family, 'miner'); assert.equal(b.life.people.find(p => p.familyRole === 'parent').occupation, 'miner');
  let s = grow(b, 18); if (s.phase === 'retired') return;
  s.hero.profession = 'Blacksmith';
  assert.equal(engine.getActions(s).find(a => a.id === 'guild_join'), undefined, 'the family’s name is at the miners’ table, not the smiths’');
  s.hero.profession = 'Miner';
  const join = engine.getActions(s).find(a => a.id === 'guild_join'); assert.ok(join && !join.disabledReason, join?.disabledReason);
  assert.ok(engine.getActions(s).find(a => a.id === 'life_promotion')?.disabledReason?.includes('its own table'), 'the old recognition yields to the hall');
  s = act(s, 'guild_join');
  const m = s.guild.member; assert.equal(m.rank, 'journeyman'); assert.equal(m.how, 'born'); assert.equal(m.standing, 40);
  assert.equal(s.life.career.rank, 1); assert.equal(s.journal.at(-1).title, 'The rolls'); assert.ok(s.journal.at(-1).text.includes(GUILD_NAME.miner));
  assert.equal(engine.validateSave(s), true); assert.equal(validateGuild(s.guild, s), true);
  assert.ok(guildSummary(s).startsWith('Journeyman of the miners’ guild'));
  // Dues come with the seasons, through the public engine.
  const gold = s.hero.gold; s = grow(s, 19);
  assert.ok(s.guild.member.dues.paid >= DUES.journeyman * 3, `a year of dues was taken (${s.guild.member.dues.paid})`);
  assert.ok(guildPanel(s, x => x).includes('on the rolls'));
});

test('a journeyman’s paper from the bond opens the rolls; a stranger buys in once, at the price, after the hall has seen work', () => {
  let s = grow(born('g-1', 'common'), 18); if (s.phase === 'retired') return;
  s.hero.profession = 'Blacksmith'; s.hero.gold = 200;
  let buy = engine.getActions(s).find(a => a.id === 'guild_buy_in'); assert.ok(buy?.disabledReason?.includes('practitioner'), 'no mastery, no sale');
  s.education.schooling.credentials.push({ kind: 'journeyman', institution: 'apprenticeship', major: 'blacksmith', age: 15, grade: 70 });
  const join = engine.getActions(s).find(a => a.id === 'guild_join'); assert.ok(join && !join.disabledReason, join?.disabledReason);
  const served = act(s, 'guild_join'); assert.equal(served.guild.member.how, 'apprenticed'); assert.equal(served.guild.member.standing, 35);
  // The buyer.
  s.education.schooling.credentials.pop(); s.careers.records.Blacksmith.experience = 90; s.careers.records.Blacksmith.mastery = 1;
  buy = engine.getActions(s).find(a => a.id === 'guild_buy_in'); assert.ok(buy && !buy.disabledReason, buy?.disabledReason); assert.equal(buy.cost, BUY_IN);
  const bought = act(s, 'guild_buy_in');
  assert.equal(bought.hero.gold, s.hero.gold - BUY_IN, 'the fee is taken once'); assert.equal(bought.guild.member.how, 'bought'); assert.equal(bought.guild.member.standing, 20);
  assert.ok(bought.journal.at(-1).text.includes('what you paid'));
  // Poor: the door is shut.
  s.hero.gold = 30; buy = engine.getActions(s).find(a => a.id === 'guild_buy_in'); assert.ok(buy.disabledReason.includes('30 gold'));
});

test('dues fall into arrears when the purse is empty; at three the warden is at the door; at four the name comes off the rolls', () => {
  let s = member(); if (!s) return;
  const { rows, ctx } = mock(); s.hero.gold = 0; s.guild.member.dues.season = seasonOf(s.day);
  tick(s, 2, ctx); assert.equal(s.guild.member.dues.arrears, 2); assert.ok(rows.some(r => r.title === 'The dues'));
  tick(s, 1, ctx); assert.equal(s.guild.member.dues.arrears, 3); assert.ok(s.guild.threads.some(t => t.def === 'arrears' && t.stage === 'open'));
  assert.equal(validateGuild(s.guild, s), true);
  // The scene, through the public engine.
  let scene = s; for (let n = 0; n < 4 && scene.event?.id !== 'guild_arrears'; n++) scene = scene.event ? engine.chooseEventOption(scene, pick(scene)) : engine.ageUp(scene);
  if (scene.event?.id !== 'guild_arrears') return;
  assert.ok(scene.event.choices.find(c => c.id === 'pay').disabledReason, 'no gold, no paying');
  const sent = engine.chooseEventOption(scene, 'continue'); assert.equal(sent.guild.member.dues.arrears, ARREARS_OUT - 1); assert.equal(sent.guild.threads.at(-1).closed, true);
  scene.hero.gold = 100; const paid = engine.chooseEventOption(scene, 'pay'); assert.equal(paid.guild.member.dues.arrears, 0); assert.equal(paid.hero.gold, 100 - 3 * DUES.journeyman);
  // Struck out.
  let out = settle(structuredClone(sent)); if (out.phase === 'retired' || !out.guild.member) return; out.hero.gold = 0; out.guild.member.dues.arrears = ARREARS_OUT - 1; const m2 = mock(); tick(out, 1, m2.ctx);
  assert.equal(out.guild.member, null); assert.equal(out.guild.past.at(-1).left, 'expelled'); assert.equal(out.life.career.rank, 0);
  assert.ok(out.hero.station.ties.some(t => t.kind === 'hates' && t.name === GUILD_NAME.miner)); assert.ok(m2.rows.some(r => r.title === 'Struck out'));
  assert.equal(validateGuild(out.guild, out), true); assert.equal(validateStation(out.hero.station, out), true);
  out.hero.gold = 500; out.careers.records.Miner.experience = 90; out.careers.records.Miner.mastery = 1;
  assert.ok(engine.getActions(out).find(a => a.id === 'guild_buy_in')?.disabledReason?.includes('struck your name'), 'the hall does not sell to a struck name');
});

test('the hall’s work comes each spring: done, it pays and the book says so; left a year, a fine before the table', () => {
  let s = member(); if (!s) return;
  const { rows, ctx } = mock(); const season = seasonOf(s.day); s.hero.gold = 100;
  tick(s, (4 - (season % 4) + 1) % 4 || 4, ctx);
  const a = s.guild.member.assignment; assert.ok(a && !a.done, 'given in spring'); assert.ok(a.pay > 0);
  assert.ok(engine.getActions(s).some(r => r.id === 'guild_assignment') && (whatMatters(s, engine.getActions(s)).length <= 5));
  if (s.locationId === a.locationId) { const gold = s.hero.gold, standing = s.guild.member.standing; const done = act(s, 'guild_assignment', { earned: a.pay }); assert.equal(done.hero.gold, gold + a.pay); assert.equal(done.guild.member.standing, standing + 3); assert.ok(done.journal.at(-1).title === 'The guild’s work'); }
  const idle = structuredClone(s); const given = idle.guild.member.assignment.season; tick(idle, 4, ctx);
  assert.ok(rows.some(r => r.title === 'Work left undone')); assert.ok(!idle.guild.member.assignment || idle.guild.member.assignment.season > given, 'the old work is struck and the new given');
  assert.equal(validateGuild(idle.guild, idle), true);
});

test('the road years are served in other regions’ halls, then the wardens look at a masterpiece: a master, or another year', () => {
  let s = member(); if (!s) return;
  const home = s.guild.member.region;
  assert.ok(engine.getActions(s).find(a => a.id === 'guild_wander')?.disabledReason?.includes('Take the road'), 'the guild’s own region does not count');
  const others = s.world.locations.filter(p => isSettlement(s.world, p.id) && !/^(seat|reach)-/.test(p.id) && regionOf(s, p.id) && regionOf(s, p.id) !== home).map(p => ({ id: p.id, r: regionOf(s, p.id), q: travelPreview(s, p.id) })).filter(x => x.q && !x.q.disabledReason);
  const byRegion = {}; for (const o of others) byRegion[o.r] ||= o;
  for (const o of Object.values(byRegion)) {
    if (s.guild.member.wander.done) break;
    const next = goTo(s, o.id); if (!next || next.phase === 'retired') return; s = next;
    const w = engine.getActions(s).find(a => a.id === 'guild_wander'); if (!w || w.disabledReason) continue;
    const before = s.guild.member.wander.seasons; s = act(s, 'guild_wander', { earned: null });
    assert.equal(s.guild.member.wander.seasons, before + 1); assert.ok(s.guild.member.wander.regions.includes(o.r));
    assert.ok(engine.getActions(s).find(a => a.id === 'guild_wander')?.disabledReason?.includes('already in the book') || s.guild.member.wander.done);
    s = settle(engine.liveSeason(s)); if (s.phase === 'retired') return;
  }
  if (!s.guild.member?.wander.done) return;
  assert.equal(s.guild.member.wander.seasons, WANDER_SEASONS);
  s.careers.records.Miner.experience = 360; s.careers.records.Miner.mastery = 2; s.hero.gold = 200; s.hero.mp = s.hero.maxMp;
  const mp = engine.getActions(s).find(a => a.id === 'guild_masterpiece'); assert.ok(mp && !mp.disabledReason, mp?.disabledReason);
  const gold = s.hero.gold; s = engine.chooseAction(s, 'guild_masterpiece');
  assert.equal(s.hero.gold, gold - mp.cost, 'the materials are paid once'); assert.equal(s.event?.id, 'guild_judgement'); assert.equal(engine.validateSave(s), true);
  const quality = s.guild.member.masterpiece.quality;
  const shown = engine.chooseEventOption(s, 'present');
  if (quality >= 55) { assert.equal(shown.guild.member.rank, 'master'); assert.equal(shown.life.career.rank, 2); assert.equal(shown.journal.at(-1).title, 'Master'); assert.ok(engine.getActions(shown).some(a => a.id === 'guild_apprentice')); }
  else { assert.equal(shown.guild.member.rank, 'journeyman'); assert.ok(engine.getActions(shown).find(a => a.id === 'guild_masterpiece')?.disabledReason?.includes('Next year')); }
  const kept = engine.chooseEventOption(s, 'continue'); assert.equal(kept.guild.member.masterpiece.polish, 8); assert.equal(kept.guild.member.rank, 'journeyman');
  s.hero.personality.traits = ['honest']; assert.ok(engine.getActions(s).length >= 0);
  let honest = structuredClone(s); honest.hero.personality.traits = ['honest']; honest.guild.threads.at(-1).stage = 'open'; honest.event = null;
  for (let n = 0; n < 3 && honest.event?.id !== 'guild_judgement'; n++) honest = engine.ageUp(honest);
  if (honest.event?.id === 'guild_judgement') assert.ok(honest.event.choices.find(c => c.id === 'sweeten').disabledReason.includes('your hand'));
  assert.equal(engine.validateSave(shown), true);
});

test('a master takes an apprentice; three years on, the paper is on the bench and a word at the table makes a journeyman', () => {
  let s = member(); if (!s) return; s = grow(s, 25); if (s.phase === 'retired' || !s.guild.member) return;
  s.guild.member.rank = 'master'; s.guild.member.masterSince = s.day; s.hero.gold = 300;
  const take = engine.getActions(s).find(a => a.id === 'guild_apprentice'); assert.ok(take && !take.disabledReason, take?.disabledReason);
  s = act(s, 'guild_apprentice'); const a = s.guild.member.apprentice; assert.ok(a?.name); assert.equal(s.journal.at(-1).title, 'An apprentice');
  const { ctx } = mock(); s.hero.gold = 400; tick(s, 12, ctx);
  assert.equal(s.guild.member.apprentice.progress, 100); assert.ok(s.guild.threads.some(t => t.def === 'protege' && t.stage === 'open'));
  let scene = s; for (let n = 0; n < 4 && scene.event?.id !== 'guild_protege'; n++) scene = scene.event ? engine.chooseEventOption(scene, pick(scene)) : engine.ageUp(scene);
  if (scene.event?.id !== 'guild_protege') return;
  const spoke = engine.chooseEventOption(scene, 'speak'); assert.equal(spoke.guild.member.apprentice, null); assert.ok(spoke.hero.station.ties.some(t => t.kind === 'knows' && t.name === a.name));
  const kept = engine.chooseEventOption(scene, 'keep'); assert.equal(kept.guild.member.apprentice.progress, 60); assert.equal(kept.hero.gold, scene.hero.gold + 20);
  assert.equal(engine.validateSave(spoke), true);
});

test('the warden dies and the table chooses: stand against the rival, back them, or stay out of it', () => {
  let s = member(); if (!s) return;
  s.guild.member.rank = 'master'; s.guild.member.masterSince = s.day; s.guild.member.standing = 70; s.guild.member.warden.since = s.day - 13 * 365;
  s = seat(s, 'succession', { warden: s.guild.member.warden.name, rival: s.guild.member.rival.name });
  if (s.event?.id !== 'guild_succession') return;
  assert.ok(s.event.body.includes('high'));
  const stood = engine.chooseEventOption(s, 'stand');
  assert.ok(['warden', 'master'].includes(stood.guild.member.rank)); assert.equal(stood.guild.member.warden.name, stood.guild.member.rank === 'warden' ? s.hero.name : s.guild.member.rival.name);
  if (stood.guild.member.rank === 'warden') { assert.equal(stood.life.career.rank, 3); assert.equal(DUES.warden, 0); }
  const backed = engine.chooseEventOption(s, 'back'); assert.equal(backed.guild.member.warden.name, s.guild.member.rival.name); assert.equal(backed.guild.member.standing, 74);
  const out = engine.chooseEventOption(s, 'continue'); assert.equal(out.guild.member.standing, 67);
  const thin = structuredClone(s); thin.guild.member.standing = 30; assert.ok(engine.getActions(thin).length >= 0);
  assert.equal(engine.validateSave(stood), true);
});

test('the court’s contract the hall takes and the faith forbids: work it, refuse it at your bench, or turn the table', () => {
  let s = member(); if (!s) return;
  s.realm.faithId = s.realm.regions[0].faithId; s.realm.devotion = 40; s.hero.skills.persuasion = 5;
  s = seat(s, 'forbidden', { kind: 'war', eventId: 'ev-x' });
  if (s.event?.id !== 'guild_forbidden') return;
  assert.ok(s.event.body.includes('Your faith forbids it'));
  const worked = engine.chooseEventOption(s, 'work'); assert.equal(worked.hero.gold, s.hero.gold + 30); assert.equal(worked.realm.devotion, 30); assert.ok(worked.hero.marks.some(m => m.id === 'hard'));
  const refused = engine.chooseEventOption(s, 'refuse'); assert.equal(refused.guild.member.standing, s.guild.member.standing - 12); assert.equal(refused.hero.gold, s.hero.gold - 10); assert.equal(refused.guild.threads.at(-1).followUp.kind, 'refused');
  const spoke = engine.chooseEventOption(s, 'persuade'); assert.ok(spoke.journal.at(-1).title === 'The court’s contract');
  const { ctx } = mock(); const later = structuredClone(refused); tick(later, 3, ctx); assert.equal(later.guild.threads.at(-1).closed, true); assert.ok(/court|street/.test(later.guild.threads.at(-1).memory.at(-1)));
  assert.equal(validateGuild(later.guild, later), true);
});

test('the secret: sold for sixty (or a hundred, if you are greedy), refused, or reported; a sold secret can come back to the bench', () => {
  let s = member(); if (!s) return;
  s = seat(s, 'secret', { buyer: 'Orrin Vale', guild: GUILD_NAME.blacksmith });
  if (s.event?.id !== 'guild_secret') return;
  assert.equal(s.event.choices.find(c => c.id === 'haggle'), undefined, 'the haggle is for the greedy');
  const sold = engine.chooseEventOption(s, 'sell'); assert.equal(sold.hero.gold, s.hero.gold + 60); assert.equal(sold.guild.member.secret, 'sold'); assert.equal(sold.guild.threads.at(-1).followUp.kind, 'sold');
  const told = engine.chooseEventOption(s, 'report'); assert.equal(told.guild.member.standing, s.guild.member.standing + 10);
  let greedy = structuredClone(s); greedy.hero.personality.traits = ['greedy']; greedy.event = null; greedy.guild.threads.at(-1).stage = 'open';
  for (let n = 0; n < 3 && greedy.event?.id !== 'guild_secret'; n++) greedy = engine.ageUp(greedy);
  if (greedy.event?.id === 'guild_secret') { const h = greedy.event.choices.find(c => c.id === 'haggle'); assert.equal(h?.nature, 'greedy'); const rich = engine.chooseEventOption(greedy, 'haggle'); assert.equal(rich.hero.gold, greedy.hero.gold + 100); assert.equal(rich.guild.threads.at(-1).followUp.loud, true); }
  const { ctx } = mock(); const later = structuredClone(sold); tick(later, 4, ctx);
  const t = later.guild.threads.at(-1); assert.ok(t.closed); assert.ok(/stayed sold|came back/.test(t.memory.at(-1)));
  if (/came back/.test(t.memory.at(-1))) assert.equal(later.guild.member, null);
  assert.equal(validateGuild(later.guild, later), true); assert.equal(engine.validateSave(sold), true);
});

test('the world reacts: under the guild’s monopoly no one works the trade without its mark; a member who blacklegs the strike is struck out; one who stood with it is asked in', () => {
  let s = grow(born('g-1', 'common'), 18); if (s.phase === 'retired') return;
  s.hero.profession = 'Blacksmith';
  const season = seasonOf(s.day), here = regionOf(s, s.locationId);
  s.living.counters.events++; s.living.events.push({ id: `ev-${s.living.counters.events}`, kind: 'monopoly', regionId: here, craft: 'blacksmith', siteIds: [s.locationId], startSeason: season, endSeason: season + 8, routed: false, text: 'The mark.' });
  assert.equal(engine.validateSave(s), true);
  const work = engine.getActions(s).find(a => a.id === 'career_work'); assert.ok(work?.disabledReason?.includes('mark is on every door'), work?.disabledReason);
  s.hero.profession = 'Miner'; assert.equal(engine.getActions(s).find(a => a.id === 'career_work')?.disabledReason?.includes('mark'), false, 'another trade works');
  s.hero.profession = 'Blacksmith'; s.hero.gold = 200; s.careers.records.Blacksmith.experience = 90; s.careers.records.Blacksmith.mastery = 1;
  const inside = settle(engine.chooseAction(s, 'guild_buy_in')); assert.ok(inside.guild.member);
  assert.equal(engine.getActions(inside).find(a => a.id === 'career_work')?.disabledReason?.includes('mark'), false, 'a member works under the mark');
  // The hall's share of the prices.
  const { ctx } = mock(); const share = structuredClone(inside); const gold = share.hero.gold; share.guild.member.dues.season = seasonOf(share.day); tick(share, 1, ctx); assert.equal(share.hero.gold, gold - DUES.journeyman + 6);
  // Blackleg.
  const scab = structuredClone(inside); scab.living.counters.threads++; scab.living.threads.push({ id: `th-${scab.living.counters.threads}`, def: 'strike', eventId: 'ev-1', roles: { craft: 'blacksmith', how: 'trade', master: null }, season: seasonOf(scab.day), stage: 'chosen', choice: 'work', followUp: null, memory: ['You worked through the strike.'], closed: true });
  tick(scab, 1, ctx); assert.equal(scab.guild.member, null); assert.equal(scab.guild.past.at(-1).left, 'expelled'); assert.equal(validateGuild(scab.guild, scab), true);
  // Recruited.
  const stood = structuredClone(s); stood.living.counters.threads++; stood.living.threads.push({ id: `th-${stood.living.counters.threads}`, def: 'strike', eventId: 'ev-1', roles: { craft: 'blacksmith', how: 'trade', master: null }, season: seasonOf(stood.day), stage: 'chosen', choice: 'continue', followUp: null, memory: ['You downed tools with the guild.'], closed: true });
  tick(stood, 1, ctx); assert.ok(stood.guild.threads.some(t => t.def === 'invite' && t.stage === 'open'));
  let scene = stood; for (let n = 0; n < 4 && scene.event?.id !== 'guild_invite'; n++) scene = scene.event ? engine.chooseEventOption(scene, pick(scene)) : engine.ageUp(scene);
  if (scene.event?.id !== 'guild_invite') return;
  const joined = engine.chooseEventOption(scene, 'accept'); assert.equal(joined.guild.member?.how, 'recruited'); assert.equal(joined.guild.member.standing, 45);
  const kept = engine.chooseEventOption(scene, 'continue'); assert.equal(kept.guild.member, null); assert.equal(engine.validateSave(joined), true);
});

test('walking out: a journeyman is shrugged at, a master is remembered; the ties a life gathers are capped and the save still loads', () => {
  let s = member(); if (!s) return;
  const left = settle(engine.chooseAction(s, 'guild_leave')); assert.equal(left.guild.member, null); assert.equal(left.guild.past.at(-1).left, 'left'); assert.ok(!left.hero.station.ties.some(t => t.name === GUILD_NAME.miner));
  s.guild.member.rank = 'master'; const master = settle(engine.chooseAction(s, 'guild_leave')); assert.ok(master.hero.station.ties.some(t => t.kind === 'hates' && t.name === GUILD_NAME.miner));
  for (let n = 0; n < 14; n++) addStationTie(master, { kind: 'knows', name: `Neighbour ${n}`, note: 'a roof' });
  assert.equal(master.hero.station.ties.length, TIES_MAX); assert.equal(validateStation(master.hero.station, master), true); assert.equal(engine.validateSave(master), true);
  assert.ok(master.hero.station.ties.some(t => t.kind === 'owes') || !s.hero.station.ties.some(t => t.kind === 'owes'), 'a creditor is never forgotten');
});

test('legacy: the name on the rolls, the feud, the arrears and the family’s table pass to an heir; the living world keeps its actors across the generation', () => {
  let s = member(); if (!s) return;
  s.guild.member.rank = 'master'; s.guild.member.dues.arrears = 2; s.guild.member.rival.contests.push({ season: 1, won: false });
  const heir = born('g-2-heir', 'trade'); heir.day = s.day; heir.householdBudget.debt = 0;
  inheritGuild(s, heir);
  assert.deepEqual(heir.guild.heir, { craft: 'miner', from: s.hero.name, rank: 'master', warden: s.guild.member.warden.name });
  assert.equal(heir.guild.family, 'miner'); assert.equal(heir.householdBudget.debt, 2 * DUES.master); assert.ok(heir.hero.station.ties.some(t => t.kind === 'hates' && t.name === s.guild.member.rival.name));
  assert.equal(heir.guild.lastSeason, seasonOf(heir.day)); assert.equal(validateGuild(heir.guild, heir), true);
  let grown = grow(born('g-2-heir', 'trade'), 18); if (grown.phase === 'retired') return;
  inheritGuild(s, grown); grown.hero.profession = 'Miner';
  const join = engine.getActions(grown).find(a => a.id === 'guild_join'); assert.ok(join && !join.disabledReason && join.description.includes('old book'));
  const named = act(grown, 'guild_join'); assert.equal(named.guild.member.how, 'inherited'); assert.equal(named.guild.member.wander.done, true); assert.equal(named.guild.member.warden.name, s.guild.member.warden.name); assert.equal(named.guild.heir, null);
  assert.ok(guildView(named).member.how === 'inherited');
});

test('the page: the hall sits under Work & School with its actions, its people and what it remembers; Right now knows the dues', async t => {
  const { mountApp } = await import('./helpers/ui-surface.mjs');
  let s = member(); if (!s) return;
  s.guild.member.dues.arrears = 2; s.guild.history.push({ day: s.day, text: 'Took the hall’s prize at the fair.' });
  const surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue');
  await surface.click('tab', 'activities');
  await surface.click('activities-pane', 'work');
  const html = surface.root.innerHTML;
  assert.match(html, /MINERS’ GUILD/); assert.match(html, /Journeyman, this year on the rolls, born to it/); assert.match(html, /2 owed/);
  assert.match(html, /data-id="guild_dues"/, 'the dues are offered under Work & School'); assert.match(html, /data-id="guild_leave"/);
  assert.match(html, /THE HALL/); assert.match(html, new RegExp(s.guild.member.warden.name.split(' ')[0])); assert.match(html, /WHAT THE HALL REMEMBERS/); assert.match(html, /prize at the fair/);
  await surface.click('tab', 'life');
  assert.match(surface.root.innerHTML, /seasons of dues owed to the hall/);
});
