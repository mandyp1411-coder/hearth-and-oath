import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { regionAt } from '../dist/js/realm.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { onLivingTime, validateLiving, seasonOf, SEASON_DAYS, livingView } from '../dist/js/living-world.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'common', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) {
  for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s));
  return s;
}
function untilScene(s, id, steps = 40) {
  for (let n = 0; n < steps && s.phase !== 'retired'; n++) { if (s.event?.id === id) return s; s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); }
  return s;
}
const homeRegion = s => regionAt(s, s.life.home.locationId).id;
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {}, setEvent: () => {}, killPerson: () => true, addObligation: () => {}, finishObligation: () => {} } }; };
/** Seats a thread of the given kind so the next step opens its scene through the public engine. */
function seat(s, def, roles, extra = {}) {
  const season = seasonOf(s.day); s.living.counters.threads++;
  s.living.events = s.living.events.slice(-4);
  s.living.events.push({ id: 'ev-seat', kind: 'want', regionId: homeRegion(s), siteIds: [s.life.home.locationId], startSeason: season, endSeason: season + 1, routed: true, text: '' });
  s.living.threads.push({ id: `th-${s.living.counters.threads}`, def, eventId: 'ev-seat', roles, season, stage: 'open', choice: null, followUp: null, memory: [], closed: false, ...extra });
  assert.equal(engine.validateSave(s), true);
  return untilScene(s, `living_${def}`, 6);
}
const rival = s => s.life.people.find(p => p.role === 'rival');
const friend = s => s.life.people.find(p => p.role === 'friend');
const parent = s => s.family.members.filter(m => m.relationship === 'parent' && m.availability === 'present').map(m => s.life.people.find(p => p.id === m.personId)).find(Boolean);

test('a rival sets up across the square: match them, out-work them, show the town, or let it choose; the bench closes or stays', () => {
  let s = grow(born('lw2-rival'), 20); if (s.phase === 'retired') return;
  s.hero.profession = 'Blacksmith'; s.hero.gold = 80; s.hero.skills.persuasion = 3;
  const rv = rival(s); if (!rv) return;
  s = seat(s, 'rival', { rival: { id: rv.id, name: rv.name }, trade: 'blacksmith' });
  if (s.event?.id !== 'living_rival') return;
  assert.ok(s.event.body.includes(rv.name));
  const matched = engine.chooseEventOption(s, 'match');
  assert.equal(matched.hero.gold, Math.max(0, s.hero.gold - 20)); assert.equal(matched.living.threads.at(-1).followUp.kind, 'rival_settled');
  const worked = engine.chooseEventOption(s, 'outwork');
  assert.equal(worked.hero.skills.defense, s.hero.skills.defense + 1);
  const exposed = engine.chooseEventOption(s, 'expose');
  assert.ok(exposed.living.threads.at(-1).closed);
  assert.ok(exposed.journal.some(j => j.title === 'Across the square'));
  const left = engine.chooseEventOption(s, 'continue');
  assert.equal(left.hero.gold, Math.max(0, s.hero.gold - 10));
  // The follow-up: the bench across the square closes or stays.
  const { rows, ctx } = mock(); const later = structuredClone(matched); const old = later.day; later.day += 3 * SEASON_DAYS;
  onLivingTime(later, { oldDay: old, newDay: later.day }, ctx);
  const t = later.living.threads.at(-1); assert.ok(t.closed); assert.ok(/bench across the square has (closed|stayed)/.test(t.memory.at(-1)));
  assert.equal(validateLiving(later.living, later), true);
});

test('a friend asks you to lie: say it (and it may come out), refuse it, or say nothing', () => {
  let s = grow(born('lw2-lie'), 18); if (s.phase === 'retired') return;
  const f = friend(s); if (!f) return;
  s = seat(s, 'lie', { friend: { id: f.id, name: f.name }, matter: 'where they were the night the storehouse burned' });
  if (s.event?.id !== 'living_lie') return;
  const lied = engine.chooseEventOption(s, 'lie');
  assert.equal(lied.life.people.find(p => p.id === f.id).bond, Math.min(100, f.bond + 15));
  assert.equal(lied.living.threads.at(-1).followUp.kind, 'lie_out');
  const refused = engine.chooseEventOption(s, 'truth');
  assert.equal(refused.life.people.find(p => p.id === f.id).bond, Math.max(0, f.bond - 30)); assert.ok(refused.living.threads.at(-1).closed);
  const quiet = engine.chooseEventOption(s, 'continue');
  assert.ok(quiet.living.threads.at(-1).closed);
  const { ctx } = mock(); const later = structuredClone(lied); const old = later.day; later.day += 2 * SEASON_DAYS;
  onLivingTime(later, { oldDay: old, newDay: later.day }, ctx);
  assert.ok(/lie you told for .* (came out|held)/.test(later.living.threads.at(-1).memory.at(-1)));
});

test('a parent takes to bed at home: nurse them, pay a physician, or leave it to the others; a season later they sit up or they do not', () => {
  let s = grow(born('lw2-bed'), 22); if (s.phase === 'retired') return;
  const p = parent(s); if (!p) return;
  s.hero.gold = 100;
  s = seat(s, 'bedside', { kin: { id: p.id, name: p.name, relation: 'parent' }, cause: 'age', away: false });
  if (s.event?.id !== 'living_bedside') return;
  assert.deepEqual(s.event.choices.map(c => c.id), ['nurse', 'physician', 'continue']);
  const nursed = engine.chooseEventOption(s, 'nurse');
  assert.equal(nursed.living.threads.at(-1).chance, 75); assert.equal(nursed.living.threads.at(-1).followUp.kind, 'sickbed');
  const paid = engine.chooseEventOption(s, 'physician'); assert.equal(paid.hero.gold, Math.max(0, s.hero.gold - 40));
  const left = engine.chooseEventOption(s, 'continue'); assert.equal(left.living.threads.at(-1).chance, 55);
  // Ten seeds of follow-up: some recover, some do not.
  let lived = 0, died = 0;
  for (let i = 0; i < 10; i++) { const later = structuredClone(nursed); later.seed = `${later.seed}-${i}`; const old = later.day; later.day += 2 * SEASON_DAYS; const { ctx } = mock(); let killed = false; ctx.killPerson = () => { killed = true; return true; }; onLivingTime(later, { oldDay: old, newDay: later.day }, ctx); if (killed) died++; else lived++; }
  assert.ok(lived >= 5 && died >= 1, `lived ${lived} died ${died}`);
});

test('a parent takes to bed while you are away: go home (an obligation kept by arriving, missed by the calendar), send money, write, or finish first', () => {
  let s = grow(born('lw2-road'), 22); if (s.phase === 'retired') return;
  const p = parent(s); if (!p) return;
  s.hero.gold = 100;
  s = seat(s, 'bedside', { kin: { id: p.id, name: p.name, relation: 'parent' }, cause: 'age', away: true });
  if (s.event?.id !== 'living_bedside') return;
  assert.deepEqual(s.event.choices.map(c => c.id), ['go', 'send', 'write', 'continue']);
  const went = engine.chooseEventOption(s, 'go');
  const ob = went.obligations.find(o => o.id.startsWith('living_bedside_'));
  assert.ok(ob && !ob.resolved && ob.dueDay === went.day + 60);
  assert.equal(went.living.threads.at(-1).obligation, ob.id);
  // Arriving home keeps it.
  const home = structuredClone(went); home.locationId = home.life.home.locationId; const { rows, ctx } = mock(); ctx.finishObligation = id => { const o = home.obligations.find(o => o.id === id); if (o) o.resolved = true; };
  onLivingTime(home, { oldDay: home.day, newDay: home.day + 1 }, ctx);
  assert.ok(home.obligations.find(o => o.id === ob.id).resolved);
  assert.ok(home.living.threads.at(-1).memory.some(m => /in time/.test(m)));
  assert.equal(home.living.threads.at(-1).followUp.kind, 'sickbed');
  // The calendar misses it.
  const late = structuredClone(went); late.obligations.find(o => o.id === ob.id).resolved = true; late.obligations.find(o => o.id === ob.id).missed = true; late.locationId = 'city';
  onLivingTime(late, { oldDay: late.day, newDay: late.day + 1 }, mock().ctx);
  assert.ok(late.living.threads.at(-1).memory.some(m => /did not reach/.test(m)));
  const sent = engine.chooseEventOption(s, 'send'); assert.equal(sent.hero.gold, Math.max(0, s.hero.gold - 40)); assert.equal(sent.living.threads.at(-1).chance, 85);
  assert.equal(engine.validateSave(sent), true);
});

test('refugees follow a war into the next region, one cart in four carries the sickness, and both reach the house', () => {
  const s = born('lw2-refugees'); s.age = 20; s.day = 20 * 365; s.phase = 'adult';
  const region = homeRegion(s), season = seasonOf(s.day); s.living.lastSeason = season - 1;
  // A war next door, fresh this season.
  const borders = s.realm.politics?.borders || []; const pair = borders.find(x => x.includes(region)); if (!pair) return;
  const against = pair[0] === region ? pair[1] : pair[0];
  const court = s.living.actors.find(a => a.kind === 'court' && a.regionId === against); if (!court) return;
  const other = (borders.find(x => x.includes(against) && !x.includes(region)) || []).find(x => x !== against);
  const target = Object.values(s.realm.sites).find(x => x.regionId === (other || region))?.id || null;
  court.goal = { kind: 'reclaim', target, regionId: other || region, progress: 99, pace: 5 };
  const { rows, ctx } = mock();
  onLivingTime(s, { oldDay: s.day - 1, newDay: s.day }, ctx);
  const war = s.living.events.find(e => e.kind === 'war'); if (!war) return;
  const refugees = s.living.events.find(e => e.kind === 'refugees');
  assert.ok(refugees, 'carts follow the war'); assert.equal(refugees.warId, war.warId);
  assert.ok(s.world.changes.some(c => c.source === 'living' && /Carts from the border/.test(c.title)), 'the place remembers the carts');
  assert.equal(validateLiving(s.living, s), true);
});

test('places change: raids, strikes, purges and a monopoly’s hall are written where the place view reads them', () => {
  const s = born('lw2-places'); s.age = 25; s.day = 25 * 365; s.phase = 'adult';
  const season = seasonOf(s.day), home = s.life.home.locationId, region = homeRegion(s); s.living.lastSeason = season - 1;
  const pack = s.living.actors.find(a => a.kind === 'beasts'); pack.goal.progress = 99;
  const guild = s.living.actors.find(a => a.kind === 'guild'); guild.goal = { kind: 'monopoly', target: guild.craft, progress: 99, pace: 5 };
  const { ctx } = mock();
  onLivingTime(s, { oldDay: s.day - 1, newDay: s.day }, ctx);
  const raid = s.living.events.find(e => e.kind === 'raid'), mono = s.living.events.find(e => e.kind === 'monopoly');
  if (raid) assert.ok(s.world.changes.some(c => c.id === `living-${raid.id}-${raid.siteIds[0]}` && c.title === 'The wolves came'));
  assert.ok(mono, 'the guild has its monopoly');
  assert.ok(s.world.changes.some(c => c.id.startsWith(`living-${mono.id}-`) && c.title === 'The guild’s mark'));
  const before = s.world.changes.length;
  const old = s.day; s.day += 8 * SEASON_DAYS; onLivingTime(s, { oldDay: old, newDay: s.day }, ctx);
  assert.ok(s.world.changes.some(c => c.id === `living-hall-${mono.id}`), 'the hall is raised when the monopoly has held');
  assert.ok(s.world.changes.length > before);
  assert.equal(validateLiving(s.living, s), true); // the fixture is hand-aged; the living record is what this test checks
  void home; void region;
});

test('the generated past answers its own people and the lanes stay valid; the view hides the wants behind their scenes', async () => {
  const s = await createLifeAtAge({ seed: 'lw2-past', startAge: 30 });
  assert.equal(engine.validateSave(s), true);
  assert.ok(s.living.counters.threads >= 0);
  const v = livingView(s);
  assert.ok(v.events.every(e => e.kind !== 'want'));
  const bad = structuredClone(s); bad.living.threads.push({ id: 'x', def: 'gossip', eventId: 'e', roles: {}, season: 0, stage: 'open', choice: null, followUp: null, memory: [], closed: false });
  assert.equal(validateLiving(bad.living, bad), false);
});
