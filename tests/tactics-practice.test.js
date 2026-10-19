import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { takeBattleAction, takeBattleActionDetailed, previewBattleAction } from '../dist/js/combat.js';
import { resolveEnemyTargets } from '../dist/js/enemy-targets.js';
import { TACTICS_LESSONS, createTacticsPractice, takeTacticsPracticeAction } from '../dist/js/tactics-practice.js';
import { resolverParityCases } from './helpers/tactics-resolver-cases.mjs';

const member = (session, id = 'hero') => session.battle.actors.find(a => a.id === id);
const foe = session => session.battle.actors.find(a => a.side === 'enemy');
const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };

test('ordinary and detailed results exactly preserve the public-v48 resolver outputs', () => {
  const outputs = [];
  for (const item of resolverParityCases()) {
    const before = structuredClone(item.battle);
    const ordinary = takeBattleAction(item.battle, item.actionId, item.targetId);
    const detailed = takeBattleActionDetailed(item.battle, item.actionId, item.targetId);
    assert.deepEqual(detailed.battle, ordinary, item.name);
    assert.equal(JSON.stringify(detailed.battle), JSON.stringify(ordinary), item.name);
    assert.deepEqual(item.battle, before, item.name);
    outputs.push({ name: item.name, result: ordinary });
  }
  // Recorded from the unchanged b24cba8 combat.js resolver, not the new wrapper.
  const digest = createHash('sha256').update(JSON.stringify(outputs)).digest('hex');
  assert.equal(digest, 'c921da23f888771fbf863c6541438de5623a277e8216f04ade667af37662b2a3');
});

test('ordinary real combat retains one clone; only requested detailed capture adds a snapshot', () => {
  const battle = createTacticsPractice('disrupt_charge').battle;
  const original = globalThis.structuredClone;
  let calls = 0;
  globalThis.structuredClone = value => { calls += 1; return original(value); };
  try {
    takeBattleAction(battle, 'defend'); assert.equal(calls, 1);
    calls = 0; takeBattleActionDetailed(battle, 'defend'); assert.equal(calls, 2);
    calls = 0; takeBattleActionDetailed(battle, 'missing'); assert.equal(calls, 1);
  } finally { globalThis.structuredClone = original; }
});

test('detailed evidence is detached, distinguishes rejection and captures before charge consumption', () => {
  const session = createTacticsPractice('disrupt_charge'), before = structuredClone(session);
  const target = foe(session).id;
  const report = takeBattleActionDetailed(session.battle, 'attack', target);
  assert.equal(report.accepted, true); assert.equal(report.actorId, 'hero'); assert.equal(report.targetId, target);
  assert.equal(report.afterCommand.actors.find(a => a.id === target).status.charged, 4);
  assert.equal(report.battle.actors.find(a => a.id === target).status.charged, undefined);
  const result = structuredClone(report.battle); report.afterCommand.actors[0].hp = 1;
  assert.deepEqual(report.battle, result); assert.deepEqual(session, before);
  const rejected = takeBattleActionDetailed(session.battle, 'weapon_counter', 'hero');
  assert.equal(rejected.accepted, false); assert.equal(rejected.afterCommand, null); assert.match(rejected.reason, /living enemy/);
  assert.equal(rejected.battle.round, session.battle.round); assert.equal(member({ battle: rejected.battle }).mp, member(session).mp);
});

test('all four deterministic fixed lessons use only detached public starter plans and zero spoils', () => {
  for (const lesson of TACTICS_LESSONS) {
    const s = createTacticsPractice(lesson.id);
    assert.deepEqual(s, createTacticsPractice(lesson.id));
    assert.equal(s.kind, 'tactics-practice'); assert.equal(s.battle.currentActorId, 'hero');
    assert.deepEqual(s.battle.rewards, { gold: 0, exp: 0 }); assert.equal(s.battle.context, undefined); assert.equal(s.battle.instanceId, undefined);
    assert.equal(s.battle.actors.filter(a => a.side === 'enemy').length, 1);
    for (const enemy of s.battle.actors.filter(a => a.side === 'enemy')) { assert.ok(['wolf', 'boar'].includes(enemy.planId)); assert.equal(enemy.bossId, undefined); assert.equal(enemy.phasePlan, undefined); }
  }
  assert.throws(() => createTacticsPractice('hidden-boss'), RangeError);
  assert.throws(() => takeTacticsPracticeAction({ battle: {} }, 'attack'), TypeError);
  const source = readFileSync(new URL('../dist/js/tactics-practice.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"][^'"]*(?:engine|saves|app)\.js|localStorage|sessionStorage|resolveBattle\(/);
});

test('protecting an ally requires actual redirection and absorption, not merely a guard label', () => {
  const session = freeze(createTacticsPractice('protect_ally')), enemy = foe(session), ally = member(session, 'practice-ally');
  assert.equal(resolveEnemyTargets(session.battle, enemy).target.id, ally.id);
  const after = takeTacticsPracticeAction(session, 'defend');
  assert.equal(after.status, 'completed'); assert.equal(member(after, ally.id).hp, ally.hp);
  assert.equal(foe(after).lastTargetId, 'hero'); assert.ok(member(after).hp < member(session).hp);
  assert.equal(takeTacticsPracticeAction(session, 'inspect', enemy.id).status, 'active');
  const alreadyGuarding = structuredClone(session); member(alreadyGuarding).status.protecting = true;
  assert.notEqual(takeTacticsPracticeAction(alreadyGuarding, 'defend').status, 'completed');
});

test('charge disruption completes through real Inspect or staff counter, not natural consumption or a kill', () => {
  const session = freeze(createTacticsPractice('disrupt_charge')), target = foe(session).id;
  for (const move of ['inspect', 'weapon_counter']) {
    const next = takeTacticsPracticeAction(session, move, target);
    assert.equal(next.status, 'completed', move); assert.ok(member(next).hp < member(session).hp);
    assert.ok(foe(next).hp > 0); assert.equal(foe(next).status.charged, undefined);
    assert.equal(member(session).mp - member(next).mp, move === 'inspect' ? 0 : 3);
  }
  const normal = takeTacticsPracticeAction(session, 'attack', target);
  assert.equal(foe(normal).status.charged, undefined); assert.equal(normal.status, 'active');
  const nearDeath = structuredClone(session); foe(nearDeath).hp = 1;
  assert.equal(takeTacticsPracticeAction(nearDeath, 'attack', target).status, 'ended');
  const depleted = structuredClone(session); member(depleted).mp = 0;
  const rejected = takeTacticsPracticeAction(depleted, 'weapon_counter', target);
  assert.equal(rejected.status, 'active'); assert.equal(rejected.acceptedActions, 0); assert.equal(foe(rejected).status.charged, 4);
});

test('weakness completion requires an accepted inspection and matching real damage with MP cost', () => {
  const session = freeze(createTacticsPractice('exploit_weakness')), target = foe(session).id;
  let next = takeTacticsPracticeAction(session, 'inspect', target);
  assert.equal(next.status, 'active'); assert.deepEqual(next.inspectedEnemyIds, [target]);
  const beforeCast = structuredClone(next); next = takeTacticsPracticeAction(next, 'spell_fire', target);
  assert.equal(next.status, 'completed'); assert.equal(member(beforeCast).mp - member(next).mp, 5); assert.ok(foe(next).hp < foe(beforeCast).hp);
  assert.notEqual(takeTacticsPracticeAction(session, 'spell_fire', target).status, 'completed');
  assert.notEqual(takeTacticsPracticeAction(beforeCast, 'spell_ice', target).status, 'completed');
  const guessed = structuredClone(beforeCast); guessed.inspectedEnemyIds = [];
  assert.notEqual(takeTacticsPracticeAction(guessed, 'spell_fire', target).status, 'completed');
  const rejected = takeTacticsPracticeAction(session, 'inspect', 'hero'); assert.deepEqual(rejected.inspectedEnemyIds, []);
});

test('cleansing removes the actual wound before its tick; healing, wrong targeting and natural expiry do not count', () => {
  const session = freeze(createTacticsPractice('cleanse_wound')), ally = member(session, 'practice-ally');
  const preview = previewBattleAction(session.battle, 'tactic', ally.id);
  assert.equal(preview.legal, true);
  const next = takeTacticsPracticeAction(session, 'tactic', ally.id);
  assert.equal(next.status, 'completed'); assert.equal(member(session).mp - member(next).mp, 4);
  assert.equal(next.battle.currentActorId, ally.id); assert.equal(member(next, ally.id).hp, ally.hp);
  assert.equal(member(next, ally.id).status.bleed, undefined); assert.equal(member(next, ally.id).status.bleedTurns, undefined);
  for (const [action, target] of [['skill', ally.id], ['potion', ally.id], ['tactic', 'hero']]) assert.notEqual(takeTacticsPracticeAction(session, action, target).status, 'completed', action + '/' + target);
  const expires = structuredClone(session); member(expires, ally.id).status.bleedTurns = 1;
  const normal = takeTacticsPracticeAction(expires, 'defend');
  assert.equal(member(normal, ally.id).status.bleed, undefined); assert.equal(normal.status, 'active');
});

test('retreat, completed sessions and retries remain ephemeral with no continued battle or progress', () => {
  for (const lesson of TACTICS_LESSONS) {
    const session = createTacticsPractice(lesson.id), next = takeTacticsPracticeAction(session, 'retreat');
    assert.equal(next.status, 'ended'); assert.equal(next.battle.outcome, 'retreat');
    assert.deepEqual(takeTacticsPracticeAction(next, 'defend'), next);
    assert.deepEqual(createTacticsPractice(lesson.id), session);
  }
  const complete = takeTacticsPracticeAction(createTacticsPractice('protect_ally'), 'defend');
  assert.equal(complete.status, 'completed'); assert.deepEqual(takeTacticsPracticeAction(complete, 'attack', foe(complete).id), complete);
});
