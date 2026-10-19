import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { addCampingKit, campRecoveryView, mazeCampDescription, restAtCamp } from '../dist/js/travel-energy.js';
import { applyMazeAction, mazeActions, mazeLayout } from '../dist/js/maze-v31.js';
import { householdCostPreview } from '../dist/js/budget.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled fixtures isolate camp accounting. They are not earned-life balance
// evidence or claims about expedition win rates.
function traveller(id, extra = {}) {
  return { id, name: id, recruited: true, active: true, hp: 10, maxHp: 58, mp: 0, maxMp: 22, ...extra };
}
function sample() {
  return {
    seed: 'party-camp-unit', day: 10, phase: 'adult', event: null, battle: null,
    hero: { name: 'The Traveller', hp: 10, maxHp: 60, mp: 0, maxMp: 30, skills: {}, attributes: {} },
    life: { stress: 20 }, companions: [traveller('Mira')],
    trail: { version: 1, daysWithoutRest: 3, daysTravelled: 9, lastRestDay: 2, kits: [], nextKit: 1 },
    maze: { seed: 'party-camp-maze', position: 0, previous: 0, visited: [0], cleared: [0], collected: [], kind: 'radiant', steps: 0 },
  };
}
function context(s, spend) {
  const calls = [], journals = [];
  return {
    calls, journals,
    spendDays(n, options) { calls.push({ n, options }); if (spend) return spend(n); s.day += n; return n; },
    journalLiteral(...args) { journals.push(args); },
    journal(...args) { journals.push(args); },
  };
}
const reserves = s => [s.hero, ...s.companions].map(p => ({ id: p.id || 'hero', hp: p.hp, mp: p.mp, alive: p.alive }));

for (const [kind, hp, heroMp, allyMp] of [[null, 2, 6, 5], ['bedroll', 8, 17, 13], ['tent', 8, 17, 13], ['expedition', 8, 17, 13]]) {
  test(`${kind || 'bare'} camp quotes exact named capped party recovery without mutating`, () => {
    const s = sample(); if (kind) addCampingKit(s, kind);
    const before = structuredClone(s), quote = campRecoveryView(s, { party: true });
    assert.deepEqual(quote.travellers, [
      { id: 'hero', name: 'The Traveller', hp, mp: heroMp },
      { id: 'Mira', name: 'Mira', hp, mp: allyMp },
    ]);
    const description = mazeActions(s).find(a => a.id === 'maze_camp').description;
    assert.ok(description.includes(`Mira: +${hp} Health, +${allyMp} Focus`));
    assert.ok(description.includes(`The Traveller: +${hp} Health, +${heroMp} Focus`));
    assert.match(description, /One attended day; ordinary living costs apply/);
    assert.match(description, /does not revive downed or deceased/);
    assert.deepEqual(s, before);
    const ctx = context(s); assert.ok(applyMazeAction(s, 'maze_camp', ctx));
    assert.equal(s.day, before.day + 1);
    assert.equal(s.hero.hp, before.hero.hp + hp); assert.equal(s.hero.mp, heroMp);
    assert.equal(s.companions[0].hp, before.companions[0].hp + hp); assert.equal(s.companions[0].mp, allyMp);
    assert.equal(s.life.stress, before.life.stress - (kind ? 10 : 3));
    assert.deepEqual(ctx.calls, [{ n: 1, options: { outdoors: false, night: true } }]);
    assert.equal(s.trail.daysWithoutRest, 0); assert.equal(s.trail.lastRestDay, s.day);
    if (kind) assert.equal(s.trail.kits[0].remaining, before.trail.kits[0].remaining - 1);
    assert.equal(ctx.journals.length, 1); assert.deepEqual(ctx.journals[0][3], { narrativeEdition: 30 });
    assert.ok(ctx.journals[0][1].includes(`Mira: +${hp} Health, +${allyMp} Focus`));
    assert.deepEqual(s.maze, before.maze, 'camp does not alter topology, fog, rooms or stair progress');
  });
}

test('caps quote actual gains rather than full allowance, including full and zero maximum Focus', () => {
  const s = sample(); addCampingKit(s, 'bedroll');
  s.hero.hp = 59; s.hero.mp = 29; s.life.stress = 2;
  s.companions = [traveller('Near', { hp: 57, mp: 21 }), traveller('Full', { hp: 58, mp: 22 }), traveller('No magic', { mp: 0, maxMp: 0 })];
  const q = campRecoveryView(s, { party: true });
  assert.deepEqual(q.travellers.map(p => [p.hp, p.mp]), [[1, 1], [1, 1], [0, 0], [8, 0]]);
  assert.equal(q.stress, 2); restAtCamp(s, context(s), { party: true });
  assert.equal(s.hero.hp, 60); assert.equal(s.hero.mp, 30); assert.equal(s.life.stress, 0);
  assert.equal(s.companions[0].hp, 58); assert.equal(s.companions[0].mp, 22); assert.equal(s.companions[2].mp, 0);
});

for (const [label, patch, status] of [
  ['reserve', { active: false }], ['unrecruited', { recruited: false }],
  ['deceased', { alive: false }], ['downed', { hp: 0 }],
  ['away', {}, 'away'], ['departed', {}, 'departed'], ['dead stage', {}, 'dead'],
]) {
  test(`${label} companion receives no Health or Focus and never changes alive state`, () => {
    const s = sample(); Object.assign(s.companions[0], patch);
    if (status) s.rpg = { companionStages: { Mira: { status, locationId: 'elsewhere' } } };
    const before = reserves(s); assert.equal(campRecoveryView(s, { party: true }).travellers.length, 1);
    restAtCamp(s, context(s), { party: true }); assert.deepEqual(reserves(s).slice(1), before.slice(1));
    if (label === 'downed') assert.match(mazeCampDescription(s), /Mira \(downed\)/);
  });
}

test('active travelling companions recover despite a saved home anchor elsewhere', () => {
  const s = sample(); s.rpg = { companionStages: { Mira: { status: 'available', locationId: 'home' } } }; s.locationId = 'distant-maze';
  restAtCamp(s, context(s), { party: true }); assert.equal(s.companions[0].hp, 12); assert.equal(s.companions[0].mp, 5);
});

test('readiness filtering never promotes a hidden fourth active companion into a camp slot', () => {
  const s = sample(); s.companions = [traveller('Down', { hp: 0 }), traveller('Dead', { alive: false }), traveller('Ready'), traveller('Fourth')];
  assert.deepEqual(campRecoveryView(s, { party: true }).travellers.map(p => p.id), ['hero', 'Ready']);
  restAtCamp(s, context(s), { party: true }); assert.equal(s.companions[2].hp, 12); assert.equal(s.companions[3].hp, 10); assert.equal(s.companions[3].mp, 0);
});

test('missing or nonfinite companion stats neither invent reserves nor write NaN', () => {
  for (const key of ['hp', 'maxHp', 'mp', 'maxMp']) {
    const s = sample(); delete s.companions[0][key];
    assert.doesNotThrow(() => mazeCampDescription(s)); restAtCamp(s, context(s), { party: true });
    assert.equal(Object.hasOwn(s.companions[0], key), false, `${key} stays absent`);
    for (const value of Object.values(s.companions[0])) if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }
  const s = sample(); s.companions[0].mp = NaN;
  assert.equal(campRecoveryView(s, { party: true }).travellers[1].mp, 0);
});

test('zero-day interruption charges no kit, recovery, stress relief or trail reset', () => {
  const s = sample(); addCampingKit(s, 'bedroll'); const before = structuredClone(s), ctx = context(s, () => 0);
  assert.ok(applyMazeAction(s, 'maze_camp', ctx)); assert.deepEqual(s, before); assert.equal(ctx.journals.length, 0);
  assert.ok(applyMazeAction(s, 'maze_camp', context(s)));
  assert.equal(s.day, before.day + 1); assert.equal(s.trail.kits[0].remaining, 1); assert.equal(s.companions[0].hp, 18);
});

test('retirement during the day grants no camp reward or kit charge', () => {
  const s = sample(); addCampingKit(s, 'bedroll'); const before = structuredClone(s);
  restAtCamp(s, context(s, n => { s.day += n; s.phase = 'retired'; return n; }), { party: true });
  assert.deepEqual(reserves(s), reserves(before)); assert.deepEqual(s.trail, before.trail); assert.equal(s.life.stress, before.life.stress);
});

test('death, departure and return at the day boundary cannot revive or add a non-attendee', () => {
  const s = sample(); s.companions = [traveller('Dying'), traveller('Leaving'), traveller('Returning')];
  s.rpg = { companionStages: { Returning: { status: 'away' } } }; const before = reserves(s);
  restAtCamp(s, context(s, n => {
    s.day += n; s.companions[0].alive = false; s.rpg.companionStages.Leaving = { status: 'departed' }; s.rpg.companionStages.Returning.status = 'available'; return n;
  }), { party: true });
  assert.deepEqual(reserves(s).slice(1).map(p => [p.hp, p.mp]), before.slice(1).map(p => [p.hp, p.mp]));
  assert.equal(s.companions[0].alive, false);
});

test('each repeated camp costs another full day and the first usable kit switches to bare rest when exhausted', () => {
  const s = sample(); addCampingKit(s, 'bedroll'); s.trail.kits[0].remaining = 1;
  const day = s.day; restAtCamp(s, context(s), { party: true });
  assert.equal(s.companions[0].hp, 18); assert.equal(s.companions[0].mp, 13); assert.equal(s.trail.kits[0].remaining, 0);
  restAtCamp(s, context(s), { party: true });
  assert.equal(s.companions[0].hp, 20); assert.equal(s.companions[0].mp, 18); assert.equal(s.day, day + 2); assert.equal(s.trail.kits[0].remaining, 0);
});

test('trail callers retain hero-only recovery and the original one-day sheltered allowance', () => {
  const s = sample(); s.maze = null; addCampingKit(s, 'bedroll'); const before = reserves(s), ctx = context(s);
  restAtCamp(s, ctx); assert.equal(s.hero.hp, 18); assert.equal(s.hero.mp, 17);
  assert.deepEqual(reserves(s).slice(1), before.slice(1)); assert.equal(s.day, 11); assert.equal(s.trail.kits[0].remaining, 1);
  assert.deepEqual(ctx.calls[0].options, { outdoors: true, night: true });
});

test('a pending decision or unresolved hostile room cannot be bypassed with a stale camp command', () => {
  const s = sample(); s.event = { id: 'pending' }; let before = structuredClone(s);
  assert.equal(applyMazeAction(s, 'maze_camp', context(s)), false); assert.deepEqual(s, before);
  s.event = null; s.maze.position = mazeLayout(s.maze).cells.find(c => c.kind === 'enemy').id; before = structuredClone(s);
  assert.equal(applyMazeAction(s, 'maze_camp', context(s)), false); assert.deepEqual(s, before);
});

let base = await createLifeAtAge({ seed: 'party-camp-recovery', startAge: 18, difficulty: 'gentle' });
function drain(s) {
  for (let n = 0; s.event && n < 100; n++) s = E.chooseEventOption(s, (s.event.choices.find(c => ['continue', 'keep', 'care', 'pause', 'leave', 'later', 'friends'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id);
  return s;
}
base = drain(base);
function roundtrip(s) { assert.ok(E.validateSave(s), s.notice); assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))), s); return s; }
function delve() {
  const s = structuredClone(base); s.hero.gold = 2000; s.hero.skills.stealth = 100; s.hero.skills.persuasion = 100; s.hero.skills.survival = 100; s.adventuring.rations = 2;
  for (const p of s.companions) { p.recruited = p.id === 'mira'; p.active = p.id === 'mira'; }
  const p = s.companions.find(p => p.id === 'mira'); p.hp = 10; p.mp = 0;
  return roundtrip(E.chooseAction(s, 'adventure_descend'));
}

test('public maze camp applies its quote once, bills ordinary upkeep, and round-trips without new run fields', () => {
  let s = delve(); addCampingKit(s, 'bedroll'); s.hero.hp = 10; s.hero.mp = 0;
  const before = structuredClone(s), q = campRecoveryView(s, { party: true }), upkeep = householdCostPreview(s, 1);
  s = roundtrip(E.chooseAction(s, 'maze_camp'));
  assert.equal(s.day, before.day + 1); assert.equal(s.hero.gold, before.hero.gold - upkeep.totalDue);
  for (const row of q.travellers) {
    const p = row.id === 'hero' ? s.hero : s.companions.find(p => p.id === row.id), old = row.id === 'hero' ? before.hero : before.companions.find(p => p.id === row.id);
    assert.equal(p.hp, old.hp + row.hp); assert.equal(p.mp, old.mp + row.mp);
  }
  const offered=E.getActions(before).find(a=>a.id==='maze_camp');assert.equal(offered.durationDays??offered.days,1);assert.equal(q.kit.kind,'bedroll');
  const expectedMaze=structuredClone(before.maze);expectedMaze.expeditionVisit.days.inside+=1;expectedMaze.expeditionVisit.used.kitNights+=1;
  assert.deepEqual(s.maze, expectedMaze, 'only the actual one attended inside day and one used kit-night receipt change'); assert.equal(s.trail.kits[0].remaining, 1);
  const receipt = s.journal.findLast(j => j.title === 'A Night beside the Trail');
  assert.ok(receipt); assert.ok(receipt.text.includes(`${s.companions[0].name}: +8 Health, +13 Focus`));
  assert.equal(receipt.narrativeEdition, 30);
});

test('a completed camp at a birthday pays once before the interruption, and a blocked repeated click pays nothing', () => {
  let s = delve(); addCampingKit(s, 'bedroll'); s.hero.mp = 0;
  s.day = (s.timeline.birthDay || 0) + (s.age + 1) * 365 - 1;
  s.health.lastPhysicalCheckDay = s.day; s.health.lastMentalCheckDay = s.day; s.health.lastAgeCheckYear = Math.floor(s.day / 365);
  const before = structuredClone(s); s = roundtrip(E.chooseAction(s, 'maze_camp'));
  assert.equal(s.day, before.day + 1); assert.equal(s.event?.id, 'birth_adult_year');
  assert.equal(s.trail.kits[0].remaining, 1); assert.equal(s.companions[0].hp, before.companions[0].hp + 8);
  const repeated = E.chooseAction(s, 'maze_camp');
  assert.deepEqual(reserves(repeated), reserves(s)); assert.deepEqual(repeated.trail, s.trail); assert.equal(repeated.day, s.day);
  s = roundtrip(drain(s)); assert.equal(s.trail.kits[0].remaining, 1, 'resolving interruption does not reapply camp');
});

test('an actual lineage death during the attended night cannot receive its earlier quoted recovery', () => {
  let s = delve(); addCampingKit(s, 'bedroll');
  const p = s.companions.find(p => p.id === 'mira'), record = s.lineage.people.find(r => r.source === 'companion' && r.localId === p.id);
  record.deathAge = 80; record.bornDay = s.day + 1 - record.deathAge * 365; p.bornDay = record.bornDay; p.age = 79;
  roundtrip(s); assert.ok(campRecoveryView(s, { party: true }).travellers.some(r => r.id === p.id));
  const hp = p.hp, mp = p.mp, day = s.day; s = roundtrip(E.chooseAction(s, 'maze_camp'));
  const deceased = s.companions.find(p => p.id === 'mira');
  assert.equal(s.day, day + 1); assert.equal(deceased.alive, false); assert.equal(deceased.active, false);
  assert.equal(deceased.hp, hp); assert.equal(deceased.mp, mp); assert.equal(s.trail.kits[0].remaining, 1);
  assert.equal(s.rpg.companionStages.mira.status, 'dead');
  assert.ok(!s.journal.findLast(j => j.title === 'A Night beside the Trail').text.includes(`${p.name}: +`));
});

test('the actual maze UI exposes named gains and non-revival without revealing unseen rooms', async t => {
  const s = delve(); addCampingKit(s, 'bedroll'); const before = structuredClone(s);
  const ui = await mountApp(t, { states: [s] }); await ui.click('title-continue');
  assert.ok(ui.root.innerHTML.includes(`${s.companions[0].name}: +8 Health, +13 Focus`));
  assert.match(ui.root.innerHTML, /does not revive downed or deceased/);
  assert.equal((ui.root.innerHTML.match(/class="maze-cell /g) || []).length, mazeLayout(ui.current().maze).cells.length);
  assert.deepEqual(ui.current(), before);
});

test('authentic older six-floor saves retain their captured expedition and gain no new camp fields on migration', () => {
  const original = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz', import.meta.url)))).descent;
  const s = E.migrateSave(original); assert.ok(s); assert.ok(s.adventuring.expedition); assert.equal(s.maze, null);
  assert.deepEqual(s.adventuring.expedition, original.adventuring.expedition); assert.equal(Object.hasOwn(s.adventuring.expedition, 'campRecovery'), false);
  roundtrip(s);
});

test('a controlled long peaceful crawl keeps the 121-room route, finite objectives and reserves while camps cost days', t => {
  let s = delve(); addCampingKit(s, 'expedition'); s.hero.hp = 10; s.hero.mp = 0;
  const m = s.maze, layout = structuredClone(mazeLayout(m)), queue = [[m.position]], seen = new Set([m.position]);
  let route;
  for (let n = 0; n < queue.length; n++) {
    const path = queue[n], at = path.at(-1); if (at === layout.goal) { route = path.slice(1); break; }
    for (const id of layout.cells[at].doors) if (!seen.has(id)) { seen.add(id); queue.push([...path, id]); }
  }
  assert.ok(route.length >= 10); const reserve = s.companions.find(p => p.id === 'orrin'), reserveBefore = structuredClone(reserve), day = s.day;
  let camps = 0;
  for (const id of route) {
    if (E.getActions(s).some(a => a.id === 'maze_camp') && s.hero.mp < 4) { s = roundtrip(E.chooseAction(s, 'maze_camp')); camps++; }
    s = roundtrip(drain(E.chooseAction(s, 'maze_step_' + id)));
    for (const action of ['maze_sneak', 'maze_disarm', 'maze_parley']) if (E.getActions(s).some(a => a.id === action && !a.disabledReason)) s = roundtrip(drain(E.chooseAction(s, action)));
  }
  assert.ok(camps > 0); assert.ok(s.day >= day + camps); assert.equal(s.trail.kits[0].remaining, 10 - camps);
  assert.deepEqual(mazeLayout(s.maze), layout); assert.equal(s.maze.position, layout.goal); assert.deepEqual(s.companions.find(p => p.id === 'orrin'), reserveBefore);
  assert.ok(s.companions[0].hp < s.companions[0].maxHp, 'a modest camp is not a full-party heal');
  t.diagnostic(JSON.stringify({ seed:s.seed, controlledPeacefulRoute:true, steps:route.length, attendedDays:s.day-day, camps, kitNightsSpent:10-s.trail.kits[0].remaining, hero:{hp:s.hero.hp,mp:s.hero.mp}, activeCompanion:{hp:s.companions[0].hp,mp:s.companions[0].mp}, reserveUnchanged:true }));
  s = roundtrip(E.chooseAction(s, 'maze_objective')); assert.ok(s.maze.objective);
  const loot = structuredClone(s.adventuring.loot); s = roundtrip(E.chooseAction(s, 'maze_exit')); assert.equal(s.maze, null);
  assert.deepEqual(s.adventuring.loot, loot, 'the actual return stair grants no second reward');
});
