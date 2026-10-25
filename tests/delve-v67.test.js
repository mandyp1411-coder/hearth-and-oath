import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { getBattleActions, takeBattleAction } from '../dist/js/combat.js';
import { SEASON_DAYS, seasonOf } from '../dist/js/living-world.js';
import { delveView, validateDelve, onDelveTime, inheritDelves, CUES, NOISE, AWAKE, STIRRING, TORCH_HOURS, PACK_COST } from '../dist/js/delve.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
function born(seed, station = 'common', ancestry = 'human') { return engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, station, ancestry), appearance: { ancestry } }); }
function grow(s, to) { for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; }
const settle = s => { for (let n = 0; n < 20 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; };
function fight(s, how = 'attack') { let b = s.battle; for (let turn = 0; !b.outcome && turn < 300; turn++) { const options = getBattleActions(b).filter(a => !a.disabledReason), a = options.find(a => a.id === how) || options.find(a => a.id === 'attack') || options[0]; const target = a.needsTarget ? b.actors.find(p => p.side === (a.targetSide === 'party' ? 'party' : 'enemy') && p.hp > 0 && (!a.targetIds || a.targetIds.includes(p.id))) : null; b = takeBattleAction(b, a.id, target?.id); } return engine.resolveBattle(s, b); }
function goTo(s, id) { if (s.locationId === id) return s; s = engine.travelTo(s, id); for (let n = 0; n < 300 && s.timeline?.journey; n++) { if (s.event) { s = engine.chooseEventOption(s, pick(s)); continue; } if (s.battle) { s = fight(s, 'retreat'); continue; } if (s.hero.mp < Math.ceil(s.hero.maxMp * .3) && engine.getActions(s).some(a => a.id === 'trail_camp' && !a.disabledReason)) { s = engine.chooseAction(s, 'trail_camp'); continue; } s = engine.continueJourney(s); } return settle(s); }
/** A grown edition life, strong enough to survive a delve, standing at home with bread and coin. */
function ready(seed = 'dv-1', { strong = true, age = 20 } = {}) {
  let s = grow(born(seed), age); if (s.phase === 'retired') return null;
  if (strong) { s.hero.maxHp = 150; s.hero.hp = 150; s.hero.skills.weapons = 14; s.hero.skills.defense = 6; }
  s.hero.gold = 80; s.adventuring.rations = 3; s.hero.mp = s.hero.maxMp; return s;
}
const act = (s, id) => { const a = engine.getActions(s).find(a => a.id === id); assert.ok(a, `${id} offered`); assert.equal(a.disabledReason, undefined, `${id}: ${a.disabledReason}`); const next = engine.chooseAction(s, id); assert.equal(engine.validateSave(next), true, `${id} leaves a valid save`); return next; };
const room = (s, id) => s.delve.rooms.find(r => r.id === id);
const mock = () => { const rows = []; return { rows, ctx: { journal: (t, x) => rows.push({ title: t, text: x }), journalLiteral: (t, x) => rows.push({ title: t, text: x }), standing: () => {}, setEvent: () => {}, killPerson: () => true, addObligation: () => {}, finishObligation: () => {} } }; };

test('the door: a day and a ration to go down, six gold for the pack if you have it, and the premise over the lintel', () => {
  let s = ready(); if (!s) return;
  const d = engine.getActions(s).find(a => a.id === 'adventure_descend'); assert.ok(d && !d.disabledReason, d?.disabledReason); assert.match(d.label, /a place with a history/);
  const day = s.day, gold = s.hero.gold, rations = s.adventuring.rations;
  s = act(s, 'adventure_descend');
  assert.ok(s.delve); assert.equal(s.day, day + 1); assert.equal(s.hero.gold, gold - PACK_COST); assert.equal(s.adventuring.rations, rations - 1);
  assert.deepEqual(s.delve.supplies, { torches: 3, rope: 1, oil: 1, chalk: true }); assert.equal(s.delve.light, TORCH_HOURS); assert.equal(s.delve.at, 'approach');
  assert.equal(s.delve.rooms.length, 8); assert.deepEqual(s.delve.rooms.map(r => r.kind), ['approach', 'hub', 'chamber', 'chamber', 'chamber', 'secret', 'lair', 'way']);
  assert.ok(room(s, 'secret').hidden); assert.ok(room(s, 'lair').encounter?.encounterId.startsWith('free_')); assert.equal(room(s, 'lair').encounter.boss, true);
  const j = s.journal.at(-1); assert.ok(/They say/.test(j.text) && /Six gold at the door/.test(j.text), j.text);
  assert.equal(validateDelve(s), true); assert.equal(engine.validateSave(s), true);
  assert.ok(engine.getActions(s).every(a => a.id.startsWith('delve_')), 'below ground there is only the dark');
  // Poor: a candle-stub and no rope.
  let p = ready('dv-1'); p.hero.gold = 3; p = act(p, 'adventure_descend'); assert.equal(p.delve.supplies.torches, 0); assert.equal(p.delve.light, 2); assert.equal(p.hero.gold, 3); assert.match(p.journal.at(-1).text, /candle-stub/);
  // The same seed makes the same place.
  const again = act(ready('dv-1'), 'adventure_descend'); assert.deepEqual(again.delve.rooms.map(r => [r.id, r.name, r.exits]), s.delve.rooms.map(r => [r.id, r.name, r.exits]));
});

test('light burns down an hour a room and a search; in the dark nothing is noticed, nothing is searched, and what bites bites harder', () => {
  let s = ready(); if (!s) return; s = act(s, 'adventure_descend');
  s = act(s, 'delve_go_hub'); assert.equal(s.delve.light, TORCH_HOURS - 1); assert.equal(s.delve.hours, 1);
  s = act(s, 'delve_search'); assert.equal(s.delve.light, TORCH_HOURS - 2); assert.equal(s.delve.noise, NOISE.step + NOISE.search);
  // Out of torches, out of light.
  let dark = structuredClone(s); dark.delve.supplies.torches = 0; dark.delve.light = 0;
  assert.ok(engine.getActions(dark).find(a => a.id === 'delve_search') === undefined || engine.getActions(dark).find(a => a.id === 'delve_search').disabledReason);
  assert.equal(delveView(dark).dark, true); assert.match(delveView(dark).noiseWord, /./);
  // Twelve hours below is a day above.
  let late = structuredClone(s); late.delve.hours = 11; const day = late.day; late = act(late, 'delve_go_approach'); assert.equal(late.delve.hours, 12); assert.equal(late.day, day + 1);
});

test('what you notice depends on who you are: letters read the lintel, a thief steps round the wire, a miner hears the hollow wall and finds the hidden door', () => {
  const base = ready('dv-3'); if (!base) return;
  // A reader.
  let r = structuredClone(base); r.education.schooling.literate = true; r = act(r, 'adventure_descend');
  assert.ok(CUES.read.who(r)); assert.ok(room(r, 'approach').inscription ? room(r, 'approach').noticed.includes('read') : true);
  // A thief and the trap.
  let t = structuredClone(base); t.hero.skills.stealth = 3; t = act(t, 'adventure_descend'); t = act(t, 'delve_go_hub');
  const trapped = t.delve.rooms.find(x => x.hazard?.cue === 'thief'); if (trapped) { if (trapped.encounter) { trapped.encounter = null; } const hp = t.hero.hp; t = act(t, `delve_go_${trapped.id}`); assert.ok(room(t, trapped.id).noticed.includes('thief')); assert.equal(room(t, trapped.id).hazard.sprung, true); assert.equal(t.hero.hp, hp, 'the trap noticed is the trap stepped round'); }
  // Nobody's eyes: the trap takes its due.
  let b = structuredClone(base); b = act(b, 'adventure_descend'); b = act(b, 'delve_go_hub'); const trap = b.delve.rooms.find(x => x.hazard); if (trap) { trap.encounter = null; const hp = b.hero.hp; b = act(b, `delve_go_${trap.id}`); assert.ok(b.hero.hp < hp); assert.equal(b.delve.noise, NOISE.step * 2 + NOISE.hazard); }
  // A miner finds the door the builders hid.
  let m = structuredClone(base); m.hero.profession = 'Miner'; m = act(m, 'adventure_descend'); m = act(m, 'delve_go_hub');
  const doorRoom = m.delve.rooms.find(x => x.exits.includes('secret')); doorRoom.encounter = null; doorRoom.hazard = null;
  m = act(m, `delve_go_${doorRoom.id}`); assert.equal(room(m, 'secret').hidden, false); assert.ok(m.delve.log.some(l => l.includes('a way the builders hid')));
  assert.ok(engine.getActions(m).some(a => a.id === 'delve_go_secret'));
  // Searching finds it too, for those without the eyes.
  let q = structuredClone(base); q.hero.skills.stealth = 0; q.hero.skills.survival = 0; q.hero.skills.arcana = 0; q.hero.profession = 'Farmer'; q.hero.specialization = null; q.education.schooling.literate = false; q = act(q, 'adventure_descend'); q = act(q, 'delve_go_hub'); const dr = q.delve.rooms.find(x => x.exits.includes('secret')); dr.encounter = null; dr.hazard = null; q = act(q, `delve_go_${dr.id}`); assert.equal(room(q, 'secret').hidden, true); q = act(q, 'delve_search'); assert.equal(room(q, 'secret').hidden, false);
});

test('the dungeon reacts: fighting wakes the halls and the lair comes looking; a room is safe to camp in only once you have made it so', () => {
  let s = ready(); if (!s) return; s = act(s, 'adventure_descend');
  assert.ok(engine.getActions(s).find(a => a.id === 'delve_camp') && !engine.getActions(s).find(a => a.id === 'delve_camp').disabledReason, 'the approach is safe');
  s = act(s, 'delve_go_hub'); assert.ok(engine.getActions(s).find(a => a.id === 'delve_camp').disabledReason, 'the hub has doors you have not looked through');
  // A fight through the public engine.
  const chamber = s.delve.rooms.find(x => x.kind === 'chamber' && x.encounter); chamber.hazard = null;
  s = engine.chooseAction(s, `delve_go_${chamber.id}`); assert.ok(s.battle); assert.equal(s.battle.context.kind, 'delve'); assert.equal(s.battle.context.roomId, chamber.id); assert.equal(s.battle.context.boss, 'no'); assert.equal(engine.validateSave(s), true);
  const noise = s.delve.noise; s = fight(s); if (s.phase === 'retired') return;
  assert.equal(s.battle, null); assert.equal(room(s, chamber.id).encounter.cleared, true); assert.equal(s.delve.noise, noise + NOISE.fight); assert.ok(s.journal.some(j => j.title === 'Equipment recovered' || j.title === 'A battle returned to a life'));
  // Camp in the cleared chamber: a ration, eight hours, strength back, the halls quieter.
  s.hero.hp = 40; const rations = s.adventuring.rations, hours = s.delve.hours; const camp = engine.getActions(s).find(a => a.id === 'delve_camp'); assert.ok(camp && !camp.disabledReason, camp?.disabledReason);
  s = act(s, 'delve_camp'); assert.equal(s.adventuring.rations, rations - 1); assert.equal(s.delve.hours, hours + 8); assert.equal(s.hero.hp, 40 + Math.round(150 * 0.4)); assert.equal(s.delve.noise, Math.max(0, noise + NOISE.fight + NOISE.camp));
  // Awake: the next fight is a tier harder. Stirring: the lair comes to you.
  let loud = act(structuredClone(s), 'delve_go_hub'); loud.delve.noise = AWAKE; const other = loud.delve.rooms.find(x => x.kind === 'chamber' && x.encounter && !x.encounter.cleared); if (other) { other.hazard = null; loud = engine.chooseAction(loud, `delve_go_${other.id}`); assert.equal(loud.battle.context.tier, String(other.encounter.tier + 1)); }
  let stirring = act(structuredClone(s), 'delve_go_hub'); stirring.delve.noise = STIRRING; const quiet = stirring.delve.rooms.find(x => x.kind === 'chamber' && !x.encounter); if (quiet) { quiet.hazard = null; stirring = engine.chooseAction(stirring, `delve_go_${quiet.id}`); assert.ok(stirring.battle); assert.equal(stirring.battle.context.boss, 'yes'); assert.equal(stirring.battle.context.roomId, 'lair'); assert.equal(stirring.battle.context.cameTo, quiet.id); assert.equal(engine.validateSave(stirring), true); }
});

test('the authored cistern: the campaign quest goes down into the premise, the keeper’s chamber is the lair, the spring is the objective, and the quest is credited', () => {
  let s = ready('dv-5', { age: 18 }); if (!s) return; s.education.schooling.literate = true;
  s = goTo(s, 'marsh'); if (s.locationId !== 'marsh' || s.phase === 'retired') return;
  const q = engine.getActions(s).find(a => a.id === 'quest_begin_well'); if (!q || q.disabledReason) return;
  s = act(s, 'quest_begin_well'); if (!s.delve) return;
  assert.equal(s.delve.id, 'cistern'); assert.equal(s.delve.questId, 'well'); assert.equal(s.delve.title, 'The Drowned Cistern'); assert.equal(s.campaign.pending?.dungeonId, 'cistern');
  assert.equal(room(s, 'lair').encounter.encounterId, 'cistern_keeper'); assert.ok(room(s, 'approach').noticed.includes('read')); assert.match(s.journal.find(j => j.title === 'The Drowned Cistern').text, /engineers/);
  // Straight to the keeper, then the spring.
  s = act(s, 'delve_go_hub'); s = engine.chooseAction(s, 'delve_go_lair'); assert.equal(s.battle?.encounterId, 'cistern_keeper'); assert.equal(s.battle.context.boss, 'yes');
  s = fight(s); if (s.phase === 'retired') return;
  assert.equal(s.delve.lairCleared, true); assert.ok(s.journal.some(j => /keeper is dead/.test(j.text)));
  s = act(s, 'delve_go_way'); s = act(s, 'delve_claim'); assert.equal(s.delve.objectiveDone, true); assert.equal(s.campaign.facts.dungeon_well, true);
  s = act(s, 'delve_relic'); assert.equal(s.delve.finds.at(-1).name, 'the engineers’ sluice-key');
  s = act(s, 'delve_go_lair'); s = act(s, 'delve_go_hub'); s = act(s, 'delve_go_approach');
  const before = structuredClone(s), villagers = s.factions.villagers;
  s = engine.chooseAction(s, 'delve_out'); assert.equal(s.delve, null);
  assert.ok(s.campaign.completed.includes('well'), 'the campaign credited the delve'); assert.equal(s.campaign.pending, null);
  const change = s.world.changes.find(c => c.id === 'delve-quiet-cistern'); assert.ok(change); const above = change.locationId; if (before.realm.sites[above]) assert.equal(s.realm.sites[above].security, Math.min(100, before.realm.sites[above].security + 8)); assert.equal(s.factions.villagers, villagers + 6);
  assert.equal(s.delves.places.cistern.lairCleared, true); assert.equal(s.delves.places.cistern.objectiveDone, true);
  // What you brought up has an owner.
  assert.equal(s.event?.id, 'delve_spoils'); assert.ok(s.event.body.includes('smiths’ guild'));
  const sold = engine.chooseEventOption(s, 'sell'); assert.equal(sold.hero.gold, s.hero.gold + 45); assert.ok(sold.hero.station.ties.some(t => t.kind === 'hates'));
  const kept = engine.chooseEventOption(s, 'continue'); assert.equal(kept.delves.kept.length, 1);
  const back = engine.chooseEventOption(s, 'return'); assert.equal(back.delves.pending, null); assert.equal(engine.validateSave(back), true);
  // Going down again finds the place as you left it, and the quest answered.
  let twice = engine.chooseAction(back, 'explore_enter_cistern'); if (twice.delve) { assert.equal(room(twice, 'lair').encounter.cleared, true); assert.equal(twice.delves.places.cistern.visits, 2); }
});

test('defeat below ground is death; on the gentle setting you are carried out, and the place is left awake', () => {
  let s = ready('dv-6', { strong: false }); if (!s) return; s.hero.maxHp = 20; s.hero.hp = 20; s.hero.skills.weapons = 0;
  s = act(s, 'adventure_descend'); s = act(s, 'delve_go_hub');
  const lair = room(s, 'lair'); s = engine.chooseAction(s, 'delve_go_lair'); if (!s.battle) return;
  const dead = fight(s); assert.equal(dead.phase, 'retired'); assert.ok(dead.journal.some(j => /The place keeps the body/.test(j.text))); assert.match(dead.health?.deathCause || dead.lineage?.heroDeath?.cause || '', /Killed in/);
  let g = structuredClone(s); g.difficulty = 'gentle'; const carried = fight(g); assert.equal(carried.phase, 'adult'); assert.equal(carried.delve, null); assert.equal(carried.hero.hp, 2); assert.ok(carried.journal.some(j => j.title === 'Carried out'));
  const rec = Object.values(carried.delves.places)[0]; assert.equal(rec.awake, true); assert.ok(rec.threat >= 40); assert.equal(engine.validateSave(carried), true);
});

test('a woken place left alone reaches the village: the threat grows by the season and comes up as a raid the village asks you to go down after', () => {
  let s = ready('dv-7'); if (!s) return;
  s.delves.places['descent-barrow-9'] = { id: 'descent-barrow-9', visits: 1, seen: [], cleared: [], lairCleared: false, objectiveDone: false, floorsCleared: 0, awake: true, threat: 70, lastDay: s.day, relicTaken: false, secretFound: false, title: 'The Barrow under Cinderhead', site: s.locationId };
  assert.equal(engine.validateSave(s), true);
  const { rows, ctx } = mock(); const events = s.living.counters.events; const old = s.day; s.day += 2 * SEASON_DAYS; onDelveTime(s, { oldDay: old, newDay: s.day }, ctx);
  assert.equal(s.living.counters.events, events + 1); const ev = s.living.events.find(e => e.beast) || s.living.events.at(-1); assert.equal(ev.kind, 'raid'); assert.equal(ev.beast, 'The Barrow under Cinderhead'); assert.ok(rows.some(r => r.title === 'From below'));
  assert.equal(s.delves.places['descent-barrow-9'].threat, 40); assert.equal(s.delves.places['descent-barrow-9'].raids, 1);
  const t = s.living.threads.find(t => t.def === 'wolves' && t.eventId === ev.id); if (t) { for (const other of s.living.threads) if (other !== t && !other.closed) other.closed = true; assert.equal(t.roles.beast, 'The Barrow under Cinderhead'); for (let n = 0; n < 4 && s.event?.id !== 'living_wolves'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); if (s.event?.id === 'living_wolves') { assert.equal(s.event.title, 'From below'); assert.ok(s.event.choices.find(c => c.id === 'hunt').label.includes('Go down')); } }
  assert.equal(engine.validateSave(s), true);
});

test('deeper floors: the way down wants rope or skin, the next floor is harder, and the heir takes up the places as they were left', () => {
  let s = ready('dv-8'); if (!s) return; s = act(s, 'adventure_descend');
  if (s.delve.floors < 2) { s.delve.floors = 2; }
  s.delve.lairCleared = true; room(s, 'lair').encounter.cleared = true; room(s, 'way').encounter = null;
  s = act(s, 'delve_go_hub'); s = act(s, 'delve_go_lair'); s = act(s, 'delve_go_way');
  const down = engine.getActions(s).find(a => a.id === 'delve_descend'); assert.ok(down && !down.disabledReason, down?.disabledReason);
  let roped = act(s, 'delve_descend'); assert.equal(roped.delve.floor, 2); assert.equal(roped.delve.supplies.rope, 0); assert.equal(roped.delve.at, 'approach'); assert.equal(roped.delve.lairCleared, false); assert.ok(roped.delve.rooms.find(r => r.kind === 'lair').encounter.tier >= room(s, 'lair').encounter.tier); assert.ok(roped.delves.places[s.delve.id].seen.some(x => x.startsWith('1:')));
  let bare = structuredClone(s); bare.delve.supplies.rope = 0; const hp = bare.hero.hp; bare = act(bare, 'delve_descend'); assert.ok(bare.hero.hp < hp, 'no rope, some skin');
  assert.equal(engine.validateSave(roped), true);
  // The heir.
  const heir = born('dv-8-heir'); heir.day = roped.day; inheritDelves(roped, heir); assert.deepEqual(Object.keys(heir.delves.places), Object.keys(roped.delves.places)); assert.equal(validateDelve(heir), true);
});

test('a save that never had the places still loads and is given them when read; no older descent begins', () => {
  let s = ready('dv-9'); if (!s) return; delete s.delves;
  assert.equal(engine.validateSave(s), true);
  assert.ok(!engine.getActions(s).some(a => a.id === 'adventure_descend'), 'no stair without the delve: the radiant maze left in v0.72.4');
  const refused = engine.chooseAction(s, 'adventure_descend'); assert.ok(!refused.maze); assert.equal(refused.delve, undefined); assert.equal(refused.day, s.day);
  const read = engine.migrateSave(s); assert.deepEqual(read.delves, { version: 1, places: {}, descents: 0 }, 'step 72: the places begin when read');
  const d = engine.getActions(read).find(a => a.id === 'adventure_descend'); assert.ok(d); assert.match(d.label, /history/);
});

test('the page: the premise over the door, the room, what you noticed, the pack and the doors', async t => {
  const { mountApp } = await import('./helpers/ui-surface.mjs');
  let s = ready('dv-10'); if (!s) return; s.education.schooling.literate = true; s = act(s, 'adventure_descend');
  const surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue');
  const html = surface.root.innerHTML;
  assert.match(html, /delve-workspace/); assert.match(html, new RegExp(s.delve.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); assert.match(html, /LIGHT AND PACK/); assert.match(html, /3 torches in the pack/); assert.match(html, /data-id="delve_go_hub"/); assert.match(html, /WHAT YOU HAVE SEEN/);
  if (room(s, 'approach').noticed.includes('read')) assert.match(html, /You notice:/);
});
