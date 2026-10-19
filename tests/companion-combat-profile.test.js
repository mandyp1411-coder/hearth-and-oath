import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createBattle, getBattleActions } from '../dist/js/combat.js';
import { companionCombatProfile } from '../dist/js/companion-combat-profile.js';
import { renderCompanionCombatProfile } from '../dist/js/companion-combat-ui.js';
import { TECHNIQUES_V27 } from '../dist/js/techniques-v27.js';

// Controlled profiles prove parity, not recruitment, balance or earned-life pace.
const roster = [
  ['mira', 'warrior', 'guardian', 58, 22, 5], ['orrin', 'mage', 'elementalist', 43, 38, 4],
  ['kest', 'rogue', 'ranger', 48, 24, 8], ['sable', 'healer', 'healer', 34, 24, 4],
  ['tovin', 'warrior', 'knight', 44, 16, 4], ['vesper', 'rogue', 'bard', 34, 24, 7],
];
function sample(row = roster[0], victories = 0, learned = 0, revision = 5) {
  const [id, role, calling, maxHp, maxMp, agility] = row;
  const companion = { id, name: id, role, recruited: true, active: true, alive: true, hp: maxHp - 2, maxHp, mp: maxMp - 3, maxMp, agility, combatExperience: victories };
  return { seed: 'companion-profile-parity', revision, day: 14, flags: {}, companions: [companion],
    hero: { name: 'You', path: 'warrior', hp: 56, maxHp: 56, mp: 25, maxMp: 25, attributes: { strength: 6, agility: 3 }, skills: {}, potions: 2 },
    rpg: { trainedTechniques: [], companionStages: { [id]: { status: 'available', stage: learned ? learned === 1 ? 3 : 5 : 0, trainedTechniques: TECHNIQUES_V27.filter(t => t.classId === calling).slice(0, learned).map(t => t.id) } } },
  };
}
function expectedActor(row, victories, trainedTechniques, revision = 5) {
  const [id, role, specialization, maxHp, maxMp, agility] = row;
  const p = revision >= 5 ? Math.min(9, Math.floor(Math.sqrt(victories) / 2)) : 0;
  return { id, name: id, side: 'party', role, hp: maxHp - 2, maxHp, mp: maxMp - 3, maxMp, agility,
    attackPower: (role === 'warrior' ? 11 : role === 'rogue' ? 10 : 7) + p,
    attributes: { intellect: 4 + p, willpower: 4 + p, strength: 4 + p, agility: 4 + p },
    skills: { arcana: 2 + Math.floor(p / 2), devotion: 2 + Math.floor(p / 2) },
    armor: (role === 'warrior' ? 1 : 0) + Math.floor(p / 3), defending: false, status: {}, specialization, trainedTechniques: [...trainedTechniques] };
}
for (const row of roster) for (const wins of [0, 4, 16, 36, 100, 324]) for (const learned of [0, 1, 2]) {
  test(`${row[0]} at ${wins} victories and ${learned} chapter techniques matches the unchanged actor and real commands`, () => {
    const s = sample(row, wins, learned), before = structuredClone(s), c = s.companions[0];
    const profile = companionCombatProfile(s, c), battle = createBattle(s, 'forest', null, { openingTurns: false });
    const actor = battle.actors.find(a => a.id === c.id), trained = s.rpg.companionStages[c.id].trainedTechniques;
    const expected = expectedActor(row, wins, trained);
    assert.equal(JSON.stringify(profile.actor), JSON.stringify(expected), 'actor fields and their serialized values match the pre-extraction construction');
    assert.equal(JSON.stringify(actor), JSON.stringify(expected));
    assert.equal(profile.attack, actor.attackPower); assert.equal(profile.armor, actor.armor); assert.equal(profile.initiative, actor.agility);
    battle.currentActorId = c.id;
    const actions = getBattleActions(battle);
    for (const move of [...profile.moves, ...profile.techniques]) {
      const command = actions.find(a => a.id === move.id); assert.ok(command, move.id);
      assert.equal(move.label, command.label); assert.equal(move.description, command.description);
      assert.equal(move.cost ? move.cost + ' MP' : 'Free', command.cost);
      if (move.targetSide) assert.equal(move.targetSide, command.targetSide);
    }
    assert.equal(profile.techniques.length, learned);
    const html = renderCompanionCombatProfile(s, c);
    for (const value of [`Health ${actor.hp}/${actor.maxHp}`, `Focus ${actor.mp}/${actor.maxMp}`, `Attack ${actor.attackPower}`, `Armor ${actor.armor}`, `Initiative ${actor.agility}`]) assert.ok(html.includes(value), value);
    assert.deepEqual(s, before);
    profile.actor.hp = 0; profile.actor.attributes.intellect = 999; profile.actor.trainedTechniques.push('not-earned');
    assert.deepEqual(s, before, 'returned actor and technique list are detached');
  });
}

test('every actual growth step announces the next exact threshold and changes neither resource caps nor initiative', () => {
  for (const wins of [0, 1, 3, 4, 15, 16, 35, 36, 63, 64, 99, 100, 143, 144, 195, 196, 255, 256, 323, 324]) {
    const s = sample(roster[0], wins), p = companionCombatProfile(s, s.companions[0]), step = Math.min(9, Math.floor(Math.sqrt(wins) / 2));
    assert.equal(p.growth.step, step); assert.equal(p.growth.nextAt, step < 9 ? 4 * (step + 1) ** 2 : null);
    assert.equal(p.growth.remaining, step < 9 ? 4 * (step + 1) ** 2 - wins : null);
    assert.equal(p.actor.maxHp, 58); assert.equal(p.actor.maxMp, 22); assert.equal(p.initiative, 5);
  }
  const s = sample(roster[0], 324, 2, 4), c = s.companions[0], p = companionCombatProfile(s, c);
  assert.equal(p.growth.enabled, false); assert.equal(p.growth.nextAt, null); assert.equal(p.growth.step, 0);
  assert.deepEqual(p.actor, expectedActor(roster[0], 324, s.rpg.companionStages[c.id].trainedTechniques, 4));
  assert.match(renderCompanionCombatProfile(s, c), /without victory-based growth/);
});

for (const [label, patch, status, expected] of [
  ['reserve', { active: false }, 'available', 'reserve'], ['away', { active: false }, 'away', 'away'],
  ['departed', { active: false }, 'departed', 'departed'], ['dead', { alive: false, active: false, hp: 0 }, 'dead', 'dead'],
  ['downed', { hp: 0 }, 'available', 'downed'], ['reserve downed', { active: false, hp: 0 }, 'available', 'downed'],
  ['unrecruited', { recruited: false }, 'available', 'unrecruited'],
]) test(`${label} stays explicit and profile viewing never recruits, revives, heals or changes availability`, () => {
  const s = sample(), c = s.companions[0]; Object.assign(c, patch); Object.assign(s.rpg.companionStages[c.id], { status, awayUntil: status === 'away' ? 42 : null });
  const before = structuredClone(s), p = companionCombatProfile(s, c), html = renderCompanionCombatProfile(s, c);
  assert.equal(p.readiness.code, expected); assert.ok(html.includes(`data-companion-readiness="${expected}"`));
  if (status === 'away') assert.match(html, /until day 42/);
  if (c.hp === 0) assert.equal(p.actor.hp, 0);
  assert.ok(!createBattle(s, 'forest', null, { openingTurns: false }).actors.some(a => a.id === c.id));
  assert.deepEqual(s, before);
});

test('legacy absent or malformed fields remain readable, detached and do not create learned techniques', () => {
  for (const patch of [{ role: undefined, hp: undefined, mp: undefined, combatExperience: undefined }, { role: null, hp: NaN, mp: Infinity, maxHp: -1, maxMp: -1, combatExperience: -9 }, { combatExperience: Infinity }]) {
    const s = sample(), c = s.companions[0]; Object.assign(c, patch); s.rpg.companionStages[c.id].trainedTechniques = null;
    const before = structuredClone(s), p = companionCombatProfile(s, c), html = renderCompanionCombatProfile(s, c);
    for (const value of [p.attack, p.armor, p.initiative, p.actor.hp, p.actor.mp, p.growth.step]) assert.ok(Number.isFinite(value));
    assert.equal(p.techniques.length, 0); assert.ok(!/NaN|Infinity|undefined/.test(html)); assert.deepEqual(s, before);
  }
  const malformed = sample(); malformed.rpg.companionStages.mira.trainedTechniques = [{ id: 'intercede' }, null, 9];
  const malformedBefore = structuredClone(malformed); assert.deepEqual(companionCombatProfile(malformed, malformed.companions[0]).actor.trainedTechniques, []); assert.deepEqual(malformed, malformedBefore);
  const s = sample(); delete s.rpg; delete s.companions[0].combatExperience;
  const before = structuredClone(s), p = companionCombatProfile(s, s.companions[0]);
  assert.equal(p.actor.specialization, undefined); assert.equal(p.techniques.length, 0); assert.deepEqual(s, before);
  assert.deepEqual(p.actor, createBattle(s, 'forest', null, { openingTurns: false }).actors.find(a => a.id === 'mira'));
});

test('chapter stage alone grants nothing and unknown recorded IDs do not invent a move', () => {
  const s = sample(), c = s.companions[0]; s.rpg.companionStages[c.id].stage = 5;
  s.rpg.companionStages[c.id].trainedTechniques = ['nonexistent'];
  const before = structuredClone(s), p = companionCombatProfile(s, c);
  assert.deepEqual(p.techniques, []); assert.deepEqual(s, before);
});

test('readiness and growth are recomputed from the current snapshot, not cached or stored', () => {
  const s = sample(), c = s.companions[0]; assert.equal(companionCombatProfile(s, c).growth.step, 0);
  c.combatExperience = 16; c.mp = 0; c.hp = 0;
  const before = structuredClone(s), p = companionCombatProfile(s, c), html = renderCompanionCombatProfile(s, c);
  assert.equal(p.growth.step, 2); assert.equal(p.readiness.code, 'downed'); assert.match(html, /Not enough current Focus/); assert.deepEqual(s, before);
});

test('extracted skill and tactic tables remain byte-for-byte identical to the published v44 functions', () => {
  const source = readFileSync(new URL('../dist/js/combat-moves.js', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('export function skillOf')).replaceAll('export function', 'function').trimEnd() + '\n';
  // Captured from v44 combat.js skillOf through tacticOf, including whitespace except the separating blank line at module end.
  assert.equal(createHash('sha256').update(functions).digest('hex'), '02b5d443871a2ed811659ab2ae963458574961baaec86ad5a1fdf9ac33527712');
});
