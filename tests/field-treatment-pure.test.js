import test from 'node:test';
import assert from 'node:assert/strict';
import { healingPotionAmount } from '../dist/js/combat-rules.js';
import { quoteFieldPotion, applyFieldPotion, companionFieldRoomReason } from '../dist/js/field-treatment.js';
import { renderFieldPotionTreatment } from '../dist/js/field-treatment-ui.js';

// Controlled pure fixtures prove accounting and presentation contracts only.
// They do not claim earned-life balance, engine persistence or browser coverage.
const companion = (id = 'mira', patch = {}) => ({ id, name: id, recruited: true, active: true, hp: 12, maxHp: 58, mp: 2, maxMp: 22, ...patch });
const sample = () => ({ day: 14, phase: 'adult', locationId: 'forest', event: null, battle: null, hero: { name: 'You', hp: 21, maxHp: 60, mp: 4, maxMp: 25, potions: 2 }, companions: [companion()], rpg: { companionStages: { mira: { status: 'available', locationId: 'home' } } }, journal: [], flags: { proof: false }, cartography: { known: ['forest'] } });
const e = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ui = { e, button: (label, op, id, cls, disabled) => `<button type="button" data-op="${e(op)}" data-id="${e(id)}"${disabled ? ' disabled' : ''}>${label}</button>` };

for (const [hp, maxHp, expected] of [[1, 58, 30], [50, 58, 8], [57, 58, 1], [58, 58, 0], [59, 58, 0], [0, 58, 0], [-1, 58, 0], [12, 0, 0], [NaN, 58, 0], [12, Infinity, 0], [Infinity, 58, 0], [undefined, 58, 0], [0.5, 1, 0.5]]) {
  test(`shared scalar ${hp}/${maxHp} restores exactly ${expected}`, () => assert.equal(healingPotionAmount({ hp, maxHp }), expected));
}

test('quote is detached and exact; execution spends one shared potion and changes only selected Health', () => {
  const s = sample(), before = structuredClone(s), q = quoteFieldPotion(s, 'mira');
  assert.equal(q.disabledReason, null); assert.equal(q.amount, 30); assert.equal(q.hpAfter, 42); assert.equal(q.potionCost, 1); assert.equal(q.days, 0); assert.deepEqual(s, before);
  q.targetName = 'Not authority'; q.amount = 900; q.hpAfter = 999;
  const used = applyFieldPotion(s, 'mira'); assert.equal(used.amount, 30);
  assert.equal(s.companions[0].hp, 42); assert.equal(s.hero.potions, 1);
  const expected = structuredClone(before); expected.companions[0].hp += 30; expected.hero.potions--;
  assert.deepEqual(s, expected, 'no Focus, time, disease, proof, XP, reward, map, event or journal mutation in the effect');
});

test('near cap quote, repeat, empty inventory and explicit/default hero behavior agree', () => {
  const s = sample(); s.companions[0].hp = 55;
  assert.equal(quoteFieldPotion(s, 'mira').amount, 3); applyFieldPotion(s, 'mira');
  const full = structuredClone(s); assert.ok(applyFieldPotion(s, 'mira').disabledReason); assert.deepEqual(s, full);
  const a = sample(), b = structuredClone(a); assert.deepEqual(applyFieldPotion(a), applyFieldPotion(b, 'hero')); assert.deepEqual(a, b); assert.equal(a.hero.hp, 51);
  const empty = sample(); empty.hero.potions = 0; const before = structuredClone(empty); assert.match(applyFieldPotion(empty, 'mira').disabledReason, /no healing potions/); assert.deepEqual(empty, before);
  empty.hero.hp = empty.hero.maxHp; assert.match(quoteFieldPotion(empty).disabledReason, /no healing potions/, 'hero retains its existing no-potion reason priority');
});

for (const [label, patch, stage] of [
  ['full', { hp: 58 }], ['reserve', { active: false }], ['unrecruited', { recruited: false }], ['dead', { alive: false }], ['downed', { hp: 0 }], ['negative', { hp: -1 }], ['missing health', { hp: undefined }], ['invalid cap', { maxHp: Infinity }], ['wrong side', { side: 'enemy' }], ['unavailable', { available: false }], ['away', {}, 'away'], ['departed', {}, 'departed'], ['dead stage', {}, 'dead'],
]) test(`${label} spends no potion and cannot change the target or alive state`, () => {
  const s = sample(); Object.assign(s.companions[0], patch); if (stage) s.rpg.companionStages.mira.status = stage;
  const before = structuredClone(s), q = applyFieldPotion(s, 'mira');
  assert.ok(q.disabledReason); assert.equal(q.amount, 0); assert.equal(q.potionCost, 0); assert.deepEqual(s, before);
  if (label === 'downed') assert.match(q.disabledReason, /separate stabilization/);
});

test('missing, malformed and enemy-like identifiers never fall back to healing the hero', () => {
  for (const id of ['enemy-1', 'missing', '', null, 7, { targetId: 'mira' }]) {
    const s = sample(), before = structuredClone(s); assert.ok(applyFieldPotion(s, id).disabledReason); assert.deepEqual(s, before);
  }
});

test('a stale named click is rechecked after target deletion, death, reserve change or potion depletion', () => {
  for (const change of [s => s.companions.splice(0), s => s.companions[0].alive = false, s => s.companions[0].active = false, s => s.rpg.companionStages.mira.status = 'away', s => s.companions[0].hp = s.companions[0].maxHp, s => s.hero.potions = 0]) {
    const s = sample(); assert.equal(quoteFieldPotion(s, 'mira').disabledReason, null); change(s);
    const current = structuredClone(s); assert.ok(applyFieldPotion(s, 'mira').disabledReason); assert.deepEqual(s, current);
  }
});

test('active slot order never promotes a hidden fourth traveler; old saves need no new fields', () => {
  const s = sample(); s.companions = [companion('dead', { alive: false }), companion('down', { hp: 0 }), companion('third'), companion('fourth')];
  assert.equal(quoteFieldPotion(s, 'third').disabledReason, null); assert.match(quoteFieldPotion(s, 'fourth').disabledReason, /first three/);
  const old = sample(); delete old.rpg; const before = structuredClone(old); applyFieldPotion(old, 'mira');
  assert.equal(old.companions[0].hp, 42); assert.deepEqual(Object.keys(old).sort(), Object.keys(before).sort()); assert.equal(old.rpg, undefined);
  const modern = sample(); assert.equal(quoteFieldPotion(modern, 'mira').disabledReason, null, 'active companions travel despite a separate saved home anchor');
});

for (const [label, patch] of [['battle', { battle: {} }], ['conversation', { conversations: { pending: {} } }], ['crossing', { cartography: { pending: {} } }], ['journey', { timeline: { journey: {} } }], ['pending event', { event: { id: 'birthday' } }], ['retired', { phase: 'retired' }]]) {
  test(`${label} blocks both default hero and named companion treatment without mutation`, () => {
    for (const id of ['hero', 'mira']) { const s = Object.assign(sample(), patch), before = structuredClone(s); assert.ok(applyFieldPotion(s, id).disabledReason); assert.deepEqual(s, before); }
  });
}

test('canonical commitment reason blocks companion execution, not a new time-paying or context-clearing path', () => {
  const s = sample(), before = structuredClone(s), options = { contextReason: 'Finish the attended commitment first.' };
  assert.match(quoteFieldPotion(s, 'mira', options).disabledReason, /commitment/); assert.ok(applyFieldPotion(s, 'mira', options).disabledReason); assert.deepEqual(s, before);
});

for (const version of [1, 2]) for (const kind of ['enemy', 'guardian', 'trap']) {
  test(`v${version} canonical current ${kind} descriptor blocks until resolved, never reads a target room`, () => {
    const s = sample(); s.maze = { version, position: 7, pendingRoom: null, cleared: [0], visited: [0, 7] };
    const options = { mazeRoom: { id: 7, kind } }, before = structuredClone(s);
    assert.match(applyFieldPotion(s, 'mira', options).disabledReason, /danger/); assert.deepEqual(s, before);
    s.maze.cleared.push(7); const quietBefore = structuredClone(s); assert.equal(applyFieldPotion(s, 'mira', options).amount, 30); assert.deepEqual(s.maze, quietBefore.maze);
    s.hero.potions = 2; s.companions[0].hp = 12; s.maze.pendingRoom = 7;
    assert.ok(applyFieldPotion(s, 'mira', options).disabledReason);
  });
}

test('unknown/mismatched effective room fails closed; entrance and quiet current rooms need no map discovery', () => {
  const s = sample(); s.maze = { version: 2, position: 0, cleared: [0], pendingRoom: null };
  for (const mazeRoom of [null, { id: 9, kind: 'empty' }, { id: 0, kind: 'unknown' }]) assert.ok(quoteFieldPotion(s, 'mira', { mazeRoom }).disabledReason);
  for (const kind of ['entrance', 'empty', 'camp', 'cache', 'inscription', 'objective']) assert.equal(quoteFieldPotion(s, 'mira', { mazeRoom: { id: 0, kind } }).disabledReason, null);
});

test('legacy dungeon exception must match a real quiet or resolved room, while hero pause behavior is unchanged', () => {
  const s = sample(); s.event = { id: 'dungeon_cistern_entry', choices: [{ id: 'route_sluice' }] }; s.dungeon = { id: 'cistern', roomId: 'entry', pendingRoom: null, cleared: [] };
  const options = { legacyDungeonRooms: [{ id: 'entry', kind: 'safe' }, { id: 'sluice', kind: 'fight' }] };
  assert.equal(quoteFieldPotion(s, 'mira', options).disabledReason, null);
  s.dungeon.roomId = 'sluice'; s.event.id = 'dungeon_cistern_sluice'; const before = structuredClone(s);
  assert.match(applyFieldPotion(s, 'mira', options).disabledReason, /danger/); assert.deepEqual(s, before);
  assert.equal(quoteFieldPotion(s).disabledReason, null, 'existing hero can drink at this dungeon pause');
  s.dungeon.cleared.push('sluice'); assert.equal(quoteFieldPotion(s, 'mira', options).disabledReason, null);
  s.event.id = 'dungeon_other_entry'; assert.ok(quoteFieldPotion(s, 'mira', options).disabledReason);
  delete s.dungeon; assert.ok(quoteFieldPotion(s, 'mira', options).disabledReason);
});

test('adventure pause must match its captured kind and unresolved trap/fight stays blocked', () => {
  const s = sample(); s.event = { id: 'adventure_room', choices: [{ id: 'withdraw' }] };
  assert.ok(quoteFieldPotion(s, 'mira').disabledReason);
  s.adventuring = { expedition: { floor: 1, room: 2, pendingKind: 'stairs', cleared: [], pendingBattle: false } };
  assert.equal(quoteFieldPotion(s, 'mira').disabledReason, null);
  for (const kind of ['trap', 'battle']) { s.adventuring.expedition.pendingKind = kind; assert.match(quoteFieldPotion(s, 'mira').disabledReason, /danger/); }
  s.adventuring.expedition.cleared.push('1:2'); assert.equal(quoteFieldPotion(s, 'mira').disabledReason, null);
  s.adventuring.expedition.pendingBattle = true; assert.ok(quoteFieldPotion(s, 'mira').disabledReason);
  assert.equal(quoteFieldPotion(s).disabledReason, null);
});

test('regional legacy current hazard/guardian must be resolved, and a pending battle cannot be bypassed', () => {
  const s = sample(); s.rpg.expedition = { roomId: 'gate', pendingRoom: null, rooms: [{ id: 'gate', type: 'guardian', resolved: false }] };
  const before = structuredClone(s); assert.match(applyFieldPotion(s, 'mira').disabledReason, /danger/); assert.deepEqual(s, before);
  s.rpg.expedition.rooms[0].resolved = true; assert.equal(quoteFieldPotion(s, 'mira').disabledReason, null);
  s.rpg.expedition.pendingRoom = 'gate'; assert.ok(companionFieldRoomReason(s));
});

test('named native buttons show exact effect/cost, preserve hero op, escape names and explain invalid treatment', () => {
  const s = sample(); s.companions[0].name = '<Mira & "Oath">'; s.companions[0].hp = 57;
  const before = structuredClone(s), html = renderFieldPotionTreatment(quoteFieldPotion(s, 'mira'), ui);
  assert.match(html, /type="button" data-op="field-potion" data-id="mira"/);
  assert.ok(html.includes('Treat &lt;Mira &amp; &quot;Oath&quot;&gt; · +1 Health · 1 potion'));
  assert.match(html, /Health 57\/58/); assert.match(html, /\+1 Health → 58\/58 · 1 potion · No time/); assert.ok(!html.includes('<Mira'));
  const hero = renderFieldPotionTreatment(quoteFieldPotion(s), ui, { hero: true }); assert.match(hero, /data-op="use-consumable" data-id="potions"/); assert.match(hero, />Drink Potion</);
  s.companions[0].hp = 0; const blocked = renderFieldPotionTreatment(quoteFieldPotion(s, 'mira'), ui); assert.match(blocked, / disabled/); assert.match(blocked, /No potion used/); assert.match(blocked, /separate stabilization/);
  s.companions[0].hp = 57; assert.deepEqual(s, before);
});
