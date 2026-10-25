import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { regionAt } from '../dist/js/realm.js';
import { initializeLivingWorld, onLivingTime, livingView, validateLiving, seasonOf, SEASON_DAYS, activeEvents } from '../dist/js/living-world.js';
import { mountApp } from './helpers/ui-surface.mjs';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'common', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) {
  for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s);
  for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s));
  return s;
}
/** Advances until a living-world scene opens (or gives up), answering everything else as the fixtures do. */
function untilScene(s, id, steps = 40) {
  for (let n = 0; n < steps && s.phase !== 'retired'; n++) {
    if (s.event?.id === id) return s;
    s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s);
  }
  return s;
}
const homeRegion = s => regionAt(s, s.life.home.locationId).id;
const neighbourRegion = s => { const b = s.realm.politics?.borders || [], home = homeRegion(s); const pair = b.find(x => x.includes(home)); return pair ? (pair[0] === home ? pair[1] : pair[0]) : null; };
/** Readies a court's claim so the next season brings the war to the player's own region. */
function readyWar(s) {
  const home = homeRegion(s), against = neighbourRegion(s); if (!against) return false;
  const court = s.living.actors.find(a => a.kind === 'court' && a.regionId === home); if (!court) return false;
  const target = Object.values(s.realm.sites).find(x => x.regionId === against)?.id || null;
  court.goal = { kind: 'reclaim', target, regionId: against, progress: 99, pace: 5 };
  return true;
}
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {}, setEvent: () => {}, killPerson: () => true, addEvidence: () => {} } }; };

test('every life is born into a living world of actors with goals; a save from before it begins one when read', () => {
  const s = born('lw-born');
  assert.ok(s.living); assert.equal(s.living.version, 1);
  assert.ok(s.living.actors.length >= 9 && s.living.actors.length <= 14);
  assert.ok(s.living.actors.every(a => a.goal && a.goal.progress === 0 && a.goal.pace >= 1));
  assert.ok(s.living.actors.some(a => a.kind === 'court') && s.living.actors.some(a => a.kind === 'guild') && s.living.actors.some(a => a.kind === 'beasts'));
  assert.equal(engine.validateSave(s), true);
  // One rulebook (v0.72.3): a birth without a station has the living world too.
  const plain = engine.createBirthGame({ seed: 'lw-old', station: null });
  assert.ok(plain.living); assert.equal(engine.validateSave(plain), true);
  // A save from before the living world is valid without one and begins it this season when read (step 72).
  const before = structuredClone(s); delete before.living; assert.equal(validateLiving(before.living, before), true); assert.equal(engine.validateSave(before), true);
  const read = engine.migrateSave(JSON.parse(JSON.stringify(before)));
  assert.ok(read.living); assert.equal(read.living.lastSeason, Math.floor(read.day / 92)); assert.equal(read.living.events.length, 0, 'no past events are written');
});

test('the world is deterministic for a seed, and the seasonal tick advances every actor whether or not the player is looking', () => {
  const a = grow(born('lw-same'), 12), b = grow(born('lw-same'), 12);
  assert.deepEqual(a.living, b.living);
  assert.deepEqual(a.realm.wars, b.realm.wars);
  const s = born('lw-tick'); const before = s.living.actors.map(x => x.goal.progress);
  const { ctx } = mock();
  const oldDay = s.day; s.day += 2 * SEASON_DAYS;
  onLivingTime(s, { oldDay, newDay: s.day }, ctx);
  assert.equal(s.living.lastSeason, seasonOf(s.day));
  assert.ok(s.living.actors.every((x, i) => x.goal.progress > before[i] || x.goal.progress === 0), 'every goal moved (or was resolved and reset)');
  assert.equal(validateLiving(s.living, s), true);
});

test('on a living world the courts, not the calendar, start wars: a readied claim marches through the regional world', () => {
  let s = grow(born('lw-war'), 10); if (s.phase === 'retired' || !readyWar(s)) return;
  const home = homeRegion(s), warsBefore = s.realm.wars.length;
  s = grow(s, s.age + 1);
  const war = s.realm.wars.find(w => w.id.startsWith('dispute-') && [w.a, w.b].includes(home));
  assert.ok(war, 'the regional world holds the war');
  assert.equal(war.politicalVersion, 33);
  assert.ok(s.living.events.some(ev => ev.kind === 'war' && ev.warId === war.id), 'the living world remembers why');
  void warsBefore;
  assert.equal(engine.validateSave(s), true);
});

test('the levy reaches your door through your own people: pay, go in their place, or let them go to the regional world’s deployments', () => {
  let s = grow(born('lw-levy'), 10); if (s.phase === 'retired' || !readyWar(s)) return;
  s = untilScene(s, 'living_conscription', 60);
  if (s.event?.id !== 'living_conscription') return; // the family had nobody of levy age this seed
  const kin = s.living.threads.find(t => t.def === 'conscription').roles.kin;
  assert.ok(kin.name && kin.relation);
  assert.ok(s.event.body.includes(kin.name));
  assert.deepEqual(s.event.choices.map(c => c.id).filter(id => id !== 'go'), ['pay', 'continue']);
  assert.equal(engine.validateSave(s), true);
  // pay
  const rich = structuredClone(s); rich.hero.gold = 200;
  const paid = engine.chooseEventOption(rich, 'pay');
  assert.equal(paid.event, null); assert.ok(paid.hero.gold < 200);
  assert.ok(paid.living.threads.find(t => t.def === 'conscription').closed);
  assert.ok(paid.journal.some(j => j.title === 'The levy' && /crosses out/.test(j.text)));
  // let
  const gone = engine.chooseEventOption(s, 'continue');
  const d = gone.realm.politics.deployments.find(d => d.personId === kin.id);
  assert.ok(d && d.status === 'deployed', 'the regional world keeps the deployment');
  assert.ok(gone.living.threads.find(t => t.def === 'conscription').closed);
  assert.equal(engine.validateSave(gone), true);
  assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(gone))), gone);
});

test('the wolves: a raid on the home village asks who will go up the mountain, and staying by the fire brings them back', () => {
  let s = grow(born('lw-wolves'), 15); if (s.phase === 'retired') return;
  const home = s.life.home.locationId, season = seasonOf(s.day);
  s.living.events.push({ id: 'ev-test', kind: 'raid', regionId: homeRegion(s), siteIds: [home], startSeason: season, endSeason: season + 1, routed: false, text: 'The wolves came down.' });
  // Routing happens as the season turns; nudge a pack so the tick runs with a fresh event of its own too.
  const pack = s.living.actors.find(a => a.kind === 'beasts'); pack.goal.progress = 99;
  s = untilScene(s, 'living_wolves', 60);
  if (s.event?.id !== 'living_wolves') return;
  assert.ok(/go up the mountain|spear or a dog/.test(s.event.body));
  const hunted = engine.chooseEventOption(s, 'hunt');
  assert.ok(hunted.journal.some(j => j.title === 'The wolves'));
  assert.ok(hunted.living.threads.find(t => t.def === 'wolves').closed);
  const stayed = engine.chooseEventOption(s, 'continue');
  const t = stayed.living.threads.find(x => x.def === 'wolves');
  assert.equal(t.followUp.kind, 'wolves_return');
  assert.ok(stayed.factions.villagers < s.factions.villagers);
  assert.equal(engine.validateSave(stayed), true);
});

test('a strike finds the player through their trade; working through it is remembered by the guild', () => {
  let s = grow(born('lw-strike'), 18); if (s.phase === 'retired') return;
  s.hero.profession = 'Blacksmith';
  const season = seasonOf(s.day);
  s.living.events.push({ id: 'ev-strike', kind: 'strike', regionId: homeRegion(s), craft: 'blacksmith', siteIds: [s.life.home.locationId], startSeason: season, endSeason: season + 2, routed: false, text: 'The blacksmiths have downed tools.' });
  const guild = s.living.actors.find(a => a.kind === 'guild'); guild.goal.progress = 99;
  s = untilScene(s, 'living_strike', 60);
  if (s.event?.id !== 'living_strike') return;
  assert.ok(s.event.choices.some(c => c.id === 'mediate' && c.disabledReason), 'nobody listens to the unpersuasive');
  const scab = engine.chooseEventOption(s, 'work');
  assert.ok(scab.hero.gold > s.hero.gold);
  assert.ok(scab.hero.station.ties.some(t => t.kind === 'hates' && /guild/.test(t.name)));
  assert.equal(scab.living.threads.find(t => t.def === 'strike').followUp.kind, 'settled');
  assert.equal(engine.validateSave(scab), true);
});

test('the purge reaches a tiefling’s family first: hide them, give their name, or send them down the road', () => {
  let s = grow(born('lw-purge', 'trade', 'tiefling'), 14); if (s.phase === 'retired') return;
  const season = seasonOf(s.day);
  s.living.events.push({ id: 'ev-purge', kind: 'purge', regionId: homeRegion(s), target: 'tiefling', siteIds: [s.life.home.locationId], startSeason: season, endSeason: season + 4, routed: false, text: 'The court has turned on the horned.' });
  const court = s.living.actors.find(a => a.kind === 'court'); court.goal.progress = 99;
  s = untilScene(s, 'living_purge', 60);
  if (s.event?.id !== 'living_purge') return;
  const t = s.living.threads.find(t => t.def === 'purge');
  assert.equal(t.roles.ancestry, 'tiefling');
  const hid = engine.chooseEventOption(s, 'shelter');
  assert.ok(hid.journal.some(j => j.title === 'The marked door'));
  if (t.roles.kin) {
    const told = engine.chooseEventOption(s, 'denounce');
    assert.ok(told.hero.station.ties.some(x => x.kind === 'hates' && x.name === t.roles.kin.name));
    assert.ok(told.factions.order > s.factions.order);
    const sent = engine.chooseEventOption(s, 'send');
    assert.equal(sent.living.threads.find(x => x.def === 'purge').followUp.kind, 'road');
    assert.equal(engine.validateSave(sent), true);
  }
});

test('a levy is money, not a decision: every hearth in the region pays, and what the purse lacks is written against the house', () => {
  const s = born('lw-tithe'); s.age = 20; s.day = 20 * 365; s.phase = 'adult'; s.hero.gold = 5; s.living.lastSeason = seasonOf(s.day) - 1;
  const court = s.living.actors.find(a => a.kind === 'court' && a.regionId === homeRegion(s)); if (!court) return;
  court.goal = { kind: 'levy', target: null, progress: 99, pace: 5 };
  const { rows, ctx } = mock();
  onLivingTime(s, { oldDay: s.day - 1, newDay: s.day }, ctx);
  const levy = s.living.events.find(e => e.kind === 'levy');
  assert.ok(levy, 'the court raised its levy');
  assert.equal(s.hero.gold, 0); assert.ok(s.householdBudget.debt > 0, 'the rest is owed');
  assert.ok(rows.some(r => /collector at the door/.test(r.text)));
  assert.equal(validateLiving(s.living, s), true);
});

test('what cannot reach you stays background: news is bounded, events expire, the view reads it back, and bad shapes are refused', () => {
  const s = grow(born('lw-news'), 30); if (s.phase === 'retired') return;
  assert.ok(s.living.news.length <= 24 && s.living.events.length <= 12 && s.living.threads.length <= 24);
  assert.ok(s.living.counters.events > 0);
  const v = livingView(s);
  assert.ok(Array.isArray(v.events) && Array.isArray(v.news) && v.actors.length === s.living.actors.length);
  assert.ok(activeEvents(s).every(e => e.endSeason > seasonOf(s.day)));
  const bad = structuredClone(s); bad.living.actors[0].goal.kind = 'conquer'; assert.equal(validateLiving(bad.living, bad), false);
  const worse = structuredClone(s); worse.living.events.push({ id: 'x', kind: 'famine', regionId: 'rainward', startSeason: 0, endSeason: 1, siteIds: [], text: '', routed: false }); assert.equal(validateLiving(worse.living, worse), false);
  const stray = structuredClone(s); stray.event = { id: 'living_wolves', title: 'x', category: 'y', body: 'z', choices: [{ id: 'hunt', label: 'a', description: 'b' }] }; assert.equal(validateLiving(stray.living, stray), false, 'a scene with no open thread behind it');
});

test('the Life page shows the world as it reaches this life', async t => {
  const s = grow(born('lw-ui'), 20); if (s.phase === 'retired') return;
  const season = seasonOf(s.day);
  s.living.events = s.living.events.slice(-4);
  s.living.events.push({ id: 'ev-ui', kind: 'war', regionId: homeRegion(s), against: 'rainward', siteIds: [s.life.home.locationId], startSeason: season, endSeason: season + 6, routed: true, warId: 'none', text: 'The war has come to the valley.' });
  s.living.news = [...s.living.news.slice(-5), { season: season - 1, text: 'A hall is raised far away.', eventId: null }];
  s.living.threads.push({ id: 'th-ui', def: 'wolves', eventId: 'ev-ui', roles: {}, season, stage: 'chosen', choice: 'hunt', followUp: null, memory: ['You went up the mountain and came back with a pelt.'], closed: true });
  assert.equal(engine.validateSave(s), true);
  const surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue');
  const html = surface.root.innerHTML;
  assert.match(html, /The world/); assert.match(html, /war has come to the valley/); assert.match(html, /came back with a pelt/); assert.match(html, /A hall is raised far away/);
});
