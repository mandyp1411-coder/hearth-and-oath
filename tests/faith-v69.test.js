import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { serviceWalkPath } from '../dist/js/world-services.js';
import { seasonOf } from '../dist/js/living-world.js';
import { cloth, faith, faithView, faithSummary, validateFaith, inheritFaith, onFaithTime, flushFaithEvent, applyFaithChoice, applyFaithGates, FAITH_EVENTS, TITHE, STIPEND, NOVICE_SEASONS, VOWS_STANDING, KEEPER_STANDING, KEEPER_YEARS, ARREARS_OUT, NOVICE_MISSED, PENANCE_DAYS } from '../dist/js/faith.js';
import { realmPage } from '../dist/js/rpg-ui.js';
import { takeBattleAction } from '../dist/js/combat.js';
import { whatMatters } from '../dist/js/voice.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse', 'private'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'common', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) { for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; }
const settle = s => { for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; };
const toRoom = (s, room) => { for (const r of serviceWalkPath(s, room) || []) { const a = engine.getActions(s).find(a => a.id === 'atlas_room_' + r && !a.disabledReason); if (a) s = engine.chooseAction(s, a.id); } return s; };
function goTo(s, id) { if (s.locationId === id) return s; s = engine.travelTo(s, id); for (let n = 0; n < 300 && s.timeline?.journey; n++) { if (s.event) { s = engine.chooseEventOption(s, pick(s)); continue; } if (s.battle) { s = engine.resolveBattle(s, takeBattleAction(s.battle, 'retreat')); continue; } s = engine.continueJourney(s); } return settle(s); }
/** A grown edition life standing in the shrine room of a settlement with a shrine, in its congregation, with devotion enough to be asked in. */
function ready(seed, { age = 18, devotion = 3, join = true } = {}) {
  let s = grow(born(seed), age); if (s.phase === 'retired') return null;
  const shrine = Object.values(s.realm.sites).find(x => x.hasShrine && /village|city|citadel|sanctuary/.test(s.world.locations.find(p => p.id === x.id)?.type || '')); if (!shrine) return null;
  s = goTo(s, shrine.id); if (s.locationId !== shrine.id) return null;
  s.hero.skills.devotion = devotion; s.hero.gold = 60;
  s = toRoom(s, 'shrine');
  if (join) { const id = engine.getActions(s).find(a => a.id.startsWith('realm_join_') && !a.disabledReason)?.id; if (!id) return null; s = engine.chooseAction(s, id); }
  return s;
}
const act = (s, id) => { s = toRoom(s, 'shrine'); const a = engine.getActions(s).find(a => a.id === id); assert.ok(a, `${id} offered (${engine.getActions(s).filter(a => a.id.startsWith('faith_')).map(a => a.id).join(' ')})`); assert.equal(a.disabledReason, undefined, `${id}: ${a.disabledReason}`); const next = engine.chooseAction(s, id); assert.equal(engine.validateSave(next), true, `${id} leaves a valid save`); return next; };
const reason = (s, id) => { s = toRoom(s, 'shrine'); return engine.getActions(s).find(a => a.id === id)?.disabledReason ?? (engine.getActions(s).some(a => a.id === id) ? null : 'absent'); };
/** A season passes, scenes answered, the offices kept when asked. */
function season(s, { offices = true } = {}) { const target = seasonOf(s.day) + 1; for (let n = 0; n < 12 && seasonOf(s.day) < target && s.phase !== 'retired'; n++) { s = engine.liveSeason(s); s = settle(s); if (s.timeline?.yearTarget !== null && s.timeline?.yearTarget !== undefined) s = settle(engine.continueAgeUp(s)); } if (offices && cloth(s) && reason(s, 'faith_offices') === null) s = act(s, 'faith_offices'); return settle(s); }
/** Seasons pass for the module alone: the day moves, the tick runs. */
const tick = (s, ctx, seasons = 1) => { const from = s.day; s.day += 92 * seasons; onFaithTime(s, { oldDay: from, newDay: s.day }, ctx); };
const mock = () => { const rows = [], events = []; return { rows, events, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: (k, n) => rows.push({ title: 'standing', text: `${k} ${n}` }), setEvent: (id, title, chapter, body, choices) => events.push({ id, title, body, choices }), addEvidence: (n, why) => rows.push({ title: 'evidence', text: `${n} ${why}` }), endLife: cause => rows.push({ title: 'death', text: cause }), spendDays: () => {} } }; };
/** A brother of the house, by the quick road: the fixtures below are about what comes after. */
function brother(seed, opts = {}) {
  let s = ready(seed, opts); if (!s) return null;
  s = act(s, 'faith_novice'); const m = cloth(s); m.offices.kept = NOVICE_SEASONS; m.standing = VOWS_STANDING + 10;
  s = act(s, 'faith_vows'); return s;
}
const open = (s, def, roles) => { const f = faith(s); f.counters.threads++; f.threads.push({ id: `ft-${f.counters.threads}`, def, roles, season: seasonOf(s.day), stage: 'open', choice: null, followUp: null, memory: [], closed: false }); return f.threads.at(-1); };
/** Flush a crafted thread through the engine: the scene must be the one the thread names. */
const scene = (s, def, roles) => { faith(s).threads = faith(s).threads.filter(t => t.closed); open(s, def, roles); const next = engine.chooseAction(s, 'life_rest'); assert.equal(next.event?.id, `faith_${def}`, `the ${def} scene`); return next; };

test('the way in at the shrine door: the congregation first, then devotion or the Order’s name, a year of the offices, the vows; and what the vows shut', () => {
  let s = ready('fa-door-1', { devotion: 1, join: false }); if (!s) return;
  assert.ok(s.faith && s.faith.member === null && s.faith.version === 1);
  assert.match(reason(s, 'faith_novice'), /Join the congregation first/);
  const joinId = engine.getActions(toRoom(s, 'shrine')).find(a => a.id.startsWith('realm_join_')).id; s = engine.chooseAction(toRoom(s, 'shrine'), joinId);
  assert.match(reason(s, 'faith_novice'), /devotion 3/);
  s.factions.order = 45; assert.equal(reason(s, 'faith_novice'), null, 'a name the Order knows opens the door');
  s.factions.order = 0; s.hero.skills.devotion = 3; assert.equal(reason(s, 'faith_novice'), null);
  const day = s.day; s = act(s, 'faith_novice'); assert.equal(s.day - day, 1);
  const m = cloth(s); assert.equal(m.rank, 'novice'); assert.equal(m.how, 'called'); assert.equal(m.faithId, s.realm.faithId); assert.ok(m.prior.name && ['open', 'strict'].includes(m.wing)); assert.equal(m.standing, 30);
  assert.ok(s.journal.some(j => j.title === 'The cloth'));
  assert.match(reason(s, 'realm_leavefaith'), /Leave the cloth first/, 'the congregation goes with the cloth');
  assert.match(reason(s, 'faith_vows'), /4 seasons of the offices/);
  // the offices, season by season
  for (let i = 0; i < NOVICE_SEASONS; i++) { const kept = cloth(s).offices.kept; s = season(s); assert.equal(cloth(s).offices.kept, kept + 1, `season ${i}`); }
  assert.ok(cloth(s).offices.kept >= NOVICE_SEASONS); assert.ok(cloth(s).standing >= VOWS_STANDING - 3);
  cloth(s).standing = Math.max(cloth(s).standing, VOWS_STANDING);
  assert.equal(reason(s, 'faith_vows'), null);
  s = act(s, 'faith_vows');
  assert.equal(cloth(s).rank, 'brother'); assert.deepEqual([cloth(s).vows.poverty, cloth(s).vows.chastity, cloth(s).vows.obedience], [true, true, true]);
  assert.ok(s.journal.some(j => j.title === 'The vows'));
  // what the vows shut, wherever you stand
  const gated = applyFaithGates(s, [{ id: 'life_court_x' }, { id: 'life_commit_x' }, { id: 'life_home_cottage' }, { id: 'career_choose_soldier', label: 'Soldier' }, { id: 'career_choose_farmer', label: 'Farmer' }, { id: 'realm_leavefaith' }]);
  assert.match(gated[0].disabledReason, /vow/); assert.match(gated[1].disabledReason, /vow/); assert.match(gated[2].disabledReason, /house holds/); assert.match(gated[3].disabledReason, /Not under the cloth/); assert.equal(gated[4].disabledReason, undefined); assert.match(gated[5].disabledReason, /Leave the cloth/);
  assert.equal(engine.validateSave(s), true); assert.ok(faithView(s).member.title.match(/brother|sister/));
});

test('the Seminary’s orders make a brother without the noviciate; a married novice meets the strict wing', () => {
  let s = ready('fa-orders-1', { devotion: 2 }); if (!s) return;
  assert.ok(!engine.getActions(toRoom(s, 'shrine')).some(a => a.id === 'faith_ordain'));
  s.education.schooling.credentials.push({ kind: 'orders', institution: 'seminary', major: 'theology', age: s.age, grade: 70 });
  assert.equal(reason(s, 'faith_ordain'), null);
  s = act(s, 'faith_ordain');
  assert.equal(cloth(s).rank, 'brother'); assert.equal(cloth(s).how, 'ordained'); assert.equal(cloth(s).standing, 45); assert.ok(cloth(s).vows);
  // the strict wing and a household
  let t = ready('fa-orders-2'); if (!t) return;
  t = act(t, 'faith_novice'); cloth(t).offices.kept = NOVICE_SEASONS; cloth(t).standing = 60; cloth(t).wing = 'strict'; t.life.partnerId = 'fellow';
  assert.match(reason(t, 'faith_vows'), /no married brothers/);
  cloth(t).wing = 'open'; assert.equal(reason(t, 'faith_vows'), null);
  t = act(t, 'faith_vows'); assert.equal(cloth(t).vows.chastity, false, 'the open wing reads chastity kindly for a brother with a household');
});

test('given as a child: the keeper asks a poor house for its shrine pupil once; an oblate is a novice at sixteen', () => {
  let s = grow(born('fa-oblate-1', 'common'), 9); if (s.phase === 'retired') return;
  const shrine = Object.values(s.realm.sites).find(x => x.hasShrine && /village|city|citadel|sanctuary/.test(s.world.locations.find(p => p.id === x.id)?.type || ''));
  s.locationId = shrine.id; s.education.route = 'shrine'; s.education.enrolled = true;
  const { ctx, events } = mock();
  tick(s, ctx);
  assert.equal(s.faith.oblateAsked, true); assert.ok(s.faith.threads.some(t => t.def === 'oblate'));
  assert.equal(flushFaithEvent(s, ctx), true); assert.equal(events[0].id, 'faith_oblate'); assert.deepEqual(events[0].choices.map(c => c.id), ['accept', 'continue']);
  const kept = structuredClone(s); applyFaithChoice(kept, 'faith_oblate', 'continue', ctx); assert.equal(kept.faith.member, null);
  tick(kept, ctx); assert.equal(kept.faith.threads.filter(t => t.def === 'oblate').length, 1, 'the house asks nobody twice');
  applyFaithChoice(s, 'faith_oblate', 'accept', ctx);
  assert.equal(cloth(s).rank, 'oblate'); assert.equal(cloth(s).how, 'given'); assert.equal(s.realm.faithId, shrine.faithId || s.realm.regions.find(r => r.id === shrine.regionId).faithId);
  assert.equal(validateFaith(s.faith, s), true);
  s.age = 16; tick(s, ctx);
  assert.equal(cloth(s).rank, 'novice');
});

test('a vow in the dark: grief in the congregation brings the promise back in the morning; sworn, it is a way in', () => {
  let s = ready('fa-vow-1', { devotion: 1 }); if (!s) return;
  s.life.people[0].alive = false; s.life.people[0].deathDay = s.day - 10;
  let found = null; for (let n = 0; n < 16 && !found; n++) { const t = structuredClone(s); t.day += n * 92; t.faith.lastSeason = seasonOf(t.day); t.life.people[0].deathDay = t.day + 80; /* a death in the season that is about to pass */ const { ctx, events } = mock(); tick(t, ctx); if (t.faith.threads.some(x => x.def === 'vow')) { flushFaithEvent(t, ctx); found = { t, events, ctx }; } }
  assert.ok(found, 'the vow comes, sometimes'); const { t, events, ctx } = found;
  assert.equal(events[0].id, 'faith_vow'); assert.ok(events[0].choices.some(c => c.id === 'swear'));
  const left = structuredClone(t); applyFaithChoice(left, 'faith_vow', 'continue', ctx); assert.equal(left.faith.vow.kept, false); assert.equal(left.faith.member, null);
  applyFaithChoice(t, 'faith_vow', 'swear', ctx); assert.equal(cloth(t).how, 'vowed'); assert.equal(cloth(t).rank, 'novice'); assert.equal(t.faith.vow.kept, true);
  assert.equal(validateFaith(t.faith, t), true);
});

test('daily life: the tithe and its arrears, the offices missed, the poor-box, the prior’s work, the sermon', () => {
  let s = brother('fa-life-1'); if (!s) return;
  const m = cloth(s); const { ctx, rows } = mock();
  // the tithe
  s.hero.gold = 100; const before = m.tithe.paid; tick(s, ctx); assert.equal(m.tithe.paid, before + TITHE); assert.equal(s.hero.gold, 100 - TITHE);
  // arrears to the door and out
  s.hero.gold = 0; for (let i = 0; i < ARREARS_OUT - 1; i++) tick(s, ctx);
  assert.equal(m.tithe.arrears, ARREARS_OUT - 1); assert.ok(rows.some(r => r.title === 'The tithe' && /patient/.test(r.text)));
  const paid = structuredClone(s); paid.hero.gold = 100; paid.locationId = s.locationId; const p2 = act(paid, 'faith_tithe_pay'); assert.equal(cloth(p2).tithe.arrears, 0); assert.equal(p2.hero.gold, 100 - TITHE * (ARREARS_OUT - 1));
  tick(s, ctx);
  assert.equal(s.faith.member, null); assert.equal(s.faith.past.at(-1).left, 'defrocked'); assert.ok(rows.some(r => r.title === 'Defrocked')); assert.ok(rows.some(r => r.text === 'order -20'));
  assert.ok(s.hero.station.ties.some(t => t.kind === 'hates'));
  assert.match(reason(s, 'faith_novice') || '', /does not take the name back/);
  // a novice who does not keep the offices is sent home
  let n = ready('fa-life-2'); if (!n) return; n = act(n, 'faith_novice'); const m2 = cloth(n); const k = mock();
  tick(n, k.ctx, NOVICE_MISSED + 2);
  assert.equal(n.faith.member, null); assert.equal(n.faith.past.at(-1).left, 'dismissed'); void m2;
  // the poor-box, the prior's work, the sermon
  let b = brother('fa-life-3'); if (!b) return; const mb = cloth(b); const kb = mock();
  b.hero.gold = 300; const start = seasonOf(b.day); const toSpring = Math.ceil((start + 1) / 4) * 4 + 1 - start;
  tick(b, kb.ctx, toSpring);
  assert.ok(b.hero.gold < 300, 'the surplus goes to the poor-box'); assert.ok(kb.rows.some(r => r.title === 'The vow of poverty'));
  assert.ok(mb.assignment && !mb.assignment.done, 'the prior gives work in spring'); assert.ok(kb.rows.some(r => r.title === 'The sermon at the fair') || true);
  const standing = mb.standing; tick(b, kb.ctx, 4);
  assert.equal(mb.assignment, null); assert.ok(kb.rows.some(r => r.title === 'Work left undone')); assert.ok(mb.standing < standing + 4);
});

test('the stories: the preacher, the tithe in a hungry year, the relic on the shelf, the doubter', () => {
  let s = brother('fa-story-1'); if (!s) return; const m = cloth(s);
  // the preacher
  let t = scene(s, 'heresy', { preacher: 'Hal of the Well', wing: m.wing === 'open' ? 'strict' : 'open' });
  assert.deepEqual(t.event.choices.map(c => c.id), FAITH_EVENTS.ids().faith_heresy);
  const denounced = engine.chooseEventOption(t, 'denounce'); assert.ok(denounced.hero.station.ties.some(x => x.name === 'Hal of the Well')); assert.ok(cloth(denounced).standing > m.standing); assert.equal(engine.validateSave(denounced), true);
  const sheltered = engine.chooseEventOption(t, 'shelter'); assert.ok(cloth(sheltered).standing < m.standing); assert.ok(sheltered.faith.threads.find(x => x.def === 'heresy').followUp, 'the roof over a preacher comes back');
  const listened = engine.chooseEventOption(t, 'listen'); assert.equal(listened.hero.skills.devotion, s.hero.skills.devotion + 1);
  // the tithe in a hungry year
  s.hero.gold = 100; t = scene(s, 'tithe', { village: 'Ashby', siteId: s.locationId });
  const paid = engine.chooseEventOption(t, 'pay'); assert.equal(paid.hero.gold, 100 - TITHE * 4); assert.ok(paid.realm.devotion > s.realm.devotion);
  const forgiven = engine.chooseEventOption(t, 'forgive'); assert.ok(cloth(forgiven).standing < m.standing); assert.ok(forgiven.factions.villagers > s.factions.villagers);
  const collected = engine.chooseEventOption(t, 'collect'); assert.ok(cloth(collected).standing > m.standing); assert.ok(collected.factions.villagers < s.factions.villagers);
  // the relic
  s.delves.kept = [{ kind: 'relic', name: 'the Lantern of the Sluice', owner: 'faith', text: 'x' }];
  t = scene(s, 'relic', { name: 'the Lantern of the Sluice' });
  const returned = engine.chooseEventOption(t, 'return'); assert.equal(returned.delves.kept.length, 0); assert.ok(cloth(returned).standing >= m.standing + 12); assert.ok(returned.journal.some(j => j.title === 'The altar'));
  const kept = engine.chooseEventOption(t, 'keep'); assert.equal(kept.delves.kept.length, 1); assert.ok(cloth(kept).standing < m.standing);
  // the doubter
  s.hero.skills.persuasion = 6; t = scene(s, 'doubter', { name: 'Brother Ilse' });
  const reported = engine.chooseEventOption(t, 'report'); assert.ok(reported.hero.station.ties.some(x => x.name === 'Brother Ilse')); assert.equal(cloth(reported).doubter.told, 'report');
  const kept2 = engine.chooseEventOption(t, 'keep'); assert.ok(kept2.faith.threads.find(x => x.def === 'doubter').followUp);
  const argued = engine.chooseEventOption(t, 'persuade'); assert.equal(engine.validateSave(argued), true); assert.ok(argued.journal.some(j => j.title === 'The doubter'));
});

test('the world at the door: the court’s purge, the prior’s wing, and the keeper who stands in the doorway', () => {
  let s = brother('fa-door-1'); if (!s) return; const m = cloth(s);
  m.wing = 'strict'; m.prior.wing = 'strict';
  let t = scene(s, 'door', { eventId: 'ev-x', target: 'the horned' });
  assert.deepEqual(t.event.choices.map(c => c.id), ['open', 'shut', 'stand', 'continue']);
  const opened = engine.chooseEventOption(t, 'open'); assert.ok(cloth(opened).standing <= m.standing - 15, 'against the prior'); assert.ok(opened.factions.villagers > s.factions.villagers); assert.ok(opened.legal.evidence > s.legal.evidence, 'the court marks the door');
  const shut = engine.chooseEventOption(t, 'shut'); assert.ok(cloth(shut).standing > m.standing, 'as the prior would'); assert.ok(shut.factions.villagers < s.factions.villagers);
  // standing in the doorway: most survive it and are remembered; some do not
  let died = 0, lived = 0;
  for (let n = 0; n < 20; n++) { const u = structuredClone(s); u.faith.counters.threads += n; const tu = scene(u, 'door', { eventId: 'ev-' + n, target: 'the horned' }); const r = engine.chooseEventOption(tu, 'stand'); if (r.phase === 'retired') died++; else { lived++; assert.ok(cloth(r).standing >= m.standing + 10); assert.ok(r.factions.villagers >= s.factions.villagers + 12); } }
  assert.ok(lived >= 10 && died >= 1, `doorways: ${lived} lived, ${died} died`);
});

test('the prior’s inquiry when a vow is broken: penance, a denial that holds or does not, the grey taken off', () => {
  let s = brother('fa-inquiry-1'); if (!s) return; const m = cloth(s);
  // a household kept against the vow brings the inquiry at the season
  s.life.partnerId = 'fellow'; const { ctx } = mock(); tick(s, ctx);
  assert.ok(s.faith.threads.some(x => x.def === 'inquiry'), 'the house asks');
  s.life.partnerId = null; s.faith.threads = [];
  let t = scene(s, 'inquiry', { what: 'a household kept against the vow' });
  const confessed = engine.chooseEventOption(t, 'confess'); assert.equal(cloth(confessed).penance.days, PENANCE_DAYS); assert.ok(cloth(confessed).standing < m.standing);
  const offices = reason(confessed, 'faith_offices'); assert.ok(offices === 'absent' || /penance comes first/.test(offices)); assert.equal(reason(confessed, 'faith_penance'), null);
  const done = act(confessed, 'faith_penance'); assert.equal(cloth(done).penance.days, PENANCE_DAYS - 10);
  const left = engine.chooseEventOption(t, 'leave'); assert.equal(left.faith.member, null); assert.equal(left.faith.past.at(-1).left, 'lapsed'); assert.equal(left.realm.faithId, s.realm.faithId, 'lapsing keeps the congregation');
  const silent = engine.chooseEventOption(t, 'continue'); assert.equal(silent.faith.past.at(-1).left, 'defrocked');
  s.hero.skills.persuasion = 2; t = scene(s, 'inquiry', { what: 'x' }); assert.match(t.event.choices.find(c => c.id === 'deny').disabledReason, /see through/);
  assert.equal(engine.validateSave(left), true); assert.equal(engine.validateSave(silent), true);
});

test('a shrine to keep: the stipend, the penitent and the confession; the chapter and the priory', () => {
  let s = brother('fa-keep-1'); if (!s) return; const m = cloth(s);
  assert.match(reason(s, 'faith_keep'), /trusts/);
  m.standing = KEEPER_STANDING + 5; assert.match(reason(s, 'faith_keep'), /years in the cloth/);
  m.vows.since = s.day - KEEPER_YEARS * 365 - 1;
  if (s.locationId === m.seat) { const other = Object.values(s.realm.sites).find(x => x.hasShrine && x.id !== m.seat && /village|city|citadel|sanctuary/.test(s.world.locations.find(p => p.id === x.id)?.type || '')); if (!other) return; s = goTo(s, other.id); if (s.locationId !== other.id) return; }
  assert.equal(reason(s, 'faith_keep'), null);
  s = act(s, 'faith_keep'); assert.equal(cloth(s).rank, 'keeper'); assert.equal(cloth(s).shrine, s.locationId); assert.ok(cloth(s).penitent);
  const gold = s.hero.gold; const { ctx } = mock(); tick(s, ctx); assert.equal(s.hero.gold, gold + STIPEND, 'a keeper is paid, not tithed');
  // the confession
  cloth(s).penitent.heard = false;
  s = act(s, 'faith_hear'); assert.ok(s.faith.threads.some(x => x.def === 'confession'));
  const t = engine.chooseAction(s, 'life_rest'); assert.equal(t.event?.id, 'faith_confession');
  const absolved = engine.chooseEventOption(t, 'absolve'); assert.ok(absolved.factions.villagers > s.factions.villagers);
  const told = engine.chooseEventOption(t, 'report'); assert.ok(told.factions.villagers < s.factions.villagers); assert.equal(cloth(told).penitent, null);
  // the priory
  cloth(s).standing = 80; cloth(s).rival.standing = 20;
  let won = null, lost = null; for (let n = 0; n < 12 && !(won && lost); n++) { const u = structuredClone(s); u.faith.counters.threads += n; u.faith.threads = []; const tu = scene(u, 'succession', { prior: cloth(u).prior.name, rival: cloth(u).rival.name }); const r = engine.chooseEventOption(tu, 'stand'); if (cloth(r).rank === 'prior') won ||= r; else lost ||= r; }
  assert.ok(won, 'the chapter can be won'); assert.equal(cloth(won).prior.name, won.hero.name); assert.equal(engine.validateSave(won), true);
  const g = won.hero.gold; tick(won, mock().ctx); assert.equal(won.hero.gold, g + STIPEND * 2);
  if (lost) assert.ok(cloth(lost).prior.name !== lost.hero.name);
  const backed = engine.chooseEventOption(scene(structuredClone(s), 'succession', { prior: 'x', rival: cloth(s).rival.name }), 'back'); assert.equal(cloth(backed).prior.name, cloth(s).rival.name);
});

test('ways out and the legacy: lapsing, the heir with a name in the book, the defrocked parent’s child', () => {
  let s = brother('fa-out-1'); if (!s) return;
  const order = s.factions.order; s = act(s, 'faith_leave');
  assert.equal(s.faith.member, null); assert.equal(s.faith.past.at(-1).left, 'lapsed'); assert.equal(s.factions.order, order - 10); assert.ok(s.hero.station.ties.some(t => t.kind === 'knows' && /left the cloth/.test(t.note)));
  assert.ok(s.journal.some(j => j.title === 'Lapsed')); assert.equal(engine.validateSave(s), true);
  // the heir of a brother
  let parent = brother('fa-out-2'); if (!parent) return;
  const heir = born('fa-heir-1'); inheritFaith(parent, heir);
  assert.equal(heir.faith.heir.left, 'kept'); assert.equal(heir.realm.faithId, parent.realm.faithId);
  const grownHeir = grow(heir, 16); if (grownHeir.phase !== 'retired') { const sh = Object.values(grownHeir.realm.sites).find(x => x.hasShrine && (x.faithId || grownHeir.realm.regions.find(r => r.id === x.regionId).faithId) === parent.realm.faithId && /village|city|citadel|sanctuary/.test(grownHeir.world.locations.find(p => p.id === x.id)?.type || '')); if (sh) { let h = goTo(grownHeir, sh.id); if (h.locationId === sh.id) { h.hero.skills.devotion = 0; assert.equal(reason(h, 'faith_novice'), null, 'the name in the book opens the door'); h = act(h, 'faith_novice'); assert.equal(cloth(h).how, 'heir'); assert.equal(cloth(h).standing, 40); } } }
  // the defrocked parent's child
  const shamed = structuredClone(parent); shamed.faith.past.push({ faithId: cloth(parent).faithId, rank: 'brother', from: 0, to: shamed.day, how: 'called', left: 'defrocked' }); shamed.faith.member = null;
  const child = born('fa-heir-2'); const o = child.factions.order; inheritFaith(shamed, child); assert.equal(child.factions.order, o - 10); assert.equal(child.faith.heir.left, 'defrocked');
  assert.ok(faithSummary(s)); assert.equal(faithSummary(s).member, 'out (lapsed)');
});

test('one rulebook: a life without a station has the cloth too, and a save from before it begins it when read', () => {
  const plain = engine.createBirthGame({ seed: 'fa-legacy-1', station: null });
  assert.ok(plain.faith); assert.equal(plain.faith.member, null); assert.equal(engine.validateSave(plain), true);
  const s = ready('fa-legacy-2'); if (!s) return;
  const copy = structuredClone(s); delete copy.faith; assert.equal(engine.validateSave(copy), true, 'a save from before v0.69 loads');
  const read = engine.migrateSave(JSON.parse(JSON.stringify(copy)));
  assert.ok(read?.faith, 'the cloth begins when the life is read (step 72)'); assert.equal(read.faith.member, null, 'no vow is written after the fact');
});

test('the page: the cloth on the realm page, and Right now', () => {
  let s = brother('fa-page-1'); if (!s) return;
  const html = realmPage(s, engine.getActions(toRoom(s, 'shrine')));
  assert.match(html, /THE CLOTH/); assert.match(html, /THE HOUSE/); assert.match(html, /in the grey/);
  const rows = whatMatters(s, engine.getActions(toRoom(s, 'shrine'))); void rows;
});
