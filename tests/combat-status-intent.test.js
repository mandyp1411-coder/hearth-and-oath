import test from 'node:test';
import assert from 'node:assert/strict';
import { combatStatusRows } from '../dist/js/combat-statuses.js';
import { renderCombatStatuses, enemyRecipientPrediction, renderEnemyPrediction } from '../dist/js/combat-status-ui.js';
import { resolveEnemyTargets } from '../dist/js/enemy-targets.js';
import { executeEnemyPlan } from '../dist/js/enemy-plans-v27.js';

// Small captured-actor fixtures only. No life generation, media or app mounting.
function fixture(action = 'strike', policy = 'most_injured') {
  const party = [
    { id: 'hero', name: 'Ash', side: 'party', hp: 20, maxHp: 40, mp: 3, maxMp: 10, armor: 3, agility: 5, status: {} },
    { id: 'mira', name: 'Mira', side: 'party', hp: 40, maxHp: 80, mp: 9, maxMp: 40, armor: 5, agility: 3, status: { pack_mark: 1, ward: 6 } },
    { id: 'orrin', name: 'Orrin', side: 'party', hp: 15, maxHp: 30, mp: 15, maxMp: 30, armor: 1, agility: 9, status: { fear: 3, ward: 9 } },
    { id: 'down', name: 'Down', side: 'party', hp: 0, maxHp: 80, mp: 99, maxMp: 99, armor: 0, agility: 99, status: { pack_mark: 1, protecting: true } },
  ];
  const actor = { id: 'enemy', name: 'Watcher', side: 'enemy', hp: 30, maxHp: 40, mp: 0, maxMp: 0, armor: 2, agility: 4, attackPower: 5, aiKey: 'striker', aiStep: 0, intent: 'The visible current action.', status: {}, planCycle: [{ action, target: policy, amount: 3 }] };
  const foes = [actor,
    { id: 'support', name: 'Root', side: 'enemy', hp: 10, maxHp: 40, status: { ward: 8 } },
    { id: 'support-2', name: 'Branch', side: 'enemy', hp: 20, maxHp: 80, status: { ward: 8 } },
    { id: 'down-foe', name: 'Fallen root', side: 'enemy', hp: 0, maxHp: 40, status: { ward: 99 } },
  ];
  return { actors: [...party, ...foes], effectsVersion: 27, round: 1, lastAttackerId: 'orrin', lastDamagingAction: 'tech_winter_prison', seed: 'unchanged', rngState: { draw: 7 } };
}
const enemy = b => b.actors.find(a => a.id === 'enemy');
const rowIds = selection => selection.recipients.map(a => a.id);
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; }

test('magnitude and duration are one readable row, with no independent bookkeeping badges', () => {
  const actor = { status: { poison: 3, poisonTurns: 2, bleed: 2, bleedTurns: 1, burn: 4, burnTurns: 3, veil: 4, veilTurns: 2, bramble: 3, brambleTurns: 2, ghostTurns: 7, ward: 0, weakened: false } };
  const before = structuredClone(actor), rows = combatStatusRows(actor), html = renderCombatStatuses(actor);
  assert.deepEqual(rows.map(r => r.key), ['poison', 'bleed', 'burn', 'veil', 'bramble']);
  assert.equal(rows[0].label, 'Poison · 3 damage/turn · 2 turns left');
  assert.equal(rows[1].label, 'Bleeding · 2 damage/turn · 1 turn left');
  assert.equal(rows[2].label, 'Burning · 4 damage/turn · 3 turns left');
  assert.equal(rows[3].label, 'Veil · next hit −4 · 2 turns left');
  assert.equal(rows[4].label, 'Bramble · 3 retaliation · 2 turns left');
  assert.doesNotMatch(html, /poisonTurns|bleedTurns|burnTurns|veilTurns|brambleTurns|ghostTurns|Poison Turns/);
  assert.match(html, /<summary>Effects explained<\/summary>/);
  assert.deepEqual(actor, before);
});

const effectLabels = {
  ward: /damage blocked/, marked: /opening.*\+4 per hit/, pack_mark: /Prey mark/,
  charged: /Charge.*power/, stolenWard: /Stolen power/, weakened: /next hit −/,
  fear: /Afraid/, rooted: /Rooted/, stunned: /miss next action/, silenced: /this action/,
  sealed: /Seal.*Winter prison.*1 action/, veil: /Veil/, bramble: /retaliation/,
  exposedArmor: /armor/, phaseBonus: /Heavy-strike bonus/, phaseTriggered: /Second phase active/,
  inspected: /Studied/, surrenderable: /Surrender offered/, captured: /Left fighting alive/,
};
for (const [key, label] of Object.entries(effectLabels)) test(`${key} has a human effect label and a meaningful explanation`, () => {
  const actor = { status: { [key]: 1 }, sealedTechnique: 'tech_winter_prison' }, rows = combatStatusRows(actor);
  assert.equal(rows.length, 1); assert.equal(rows[0].key, key); assert.match(rows[0].label, label); assert.ok(rows[0].detail.length > 30);
  assert.doesNotMatch(rows[0].label, /true|false|pack_mark|stolenWard|phaseTriggered|phaseBonus|exposedArmor/);
});

test('guarding damage reduction and protecting target override are distinct effects', () => {
  assert.match(combatStatusRows({ defending: true, status: {} })[0].label, /^Guarding$/);
  assert.match(combatStatusRows({ status: { protecting: true } })[0].label, /^Intercepting/);
  const combined = combatStatusRows({ defending: true, status: { protecting: true } });
  assert.equal(combined.length, 1); assert.match(combined[0].label, /Guarding.*draws aimed actions/);
  assert.match(combined[0].detail, /65%/); assert.match(combined[0].detail, /first living protector/);
});

test('unknown effect values are not hidden and duration-only legacy poison retains its real default tick', () => {
  const rows = combatStatusRows({ status: { futureEffect: 3, futureEffectTurns: 2, poisonTurns: 1 } });
  assert.match(rows[0].label, /Future Effect · 3 · 2 turns left/);
  assert.match(rows[1].label, /Poison · 2 damage\/turn · 1 turn left/);
  rows[0].label = 'detached'; assert.equal(combatStatusRows({ status: {} }).length, 0);
});

test('status markup escapes technique names rather than injecting HTML', () => {
  const html = renderCombatStatuses({ status: { sealed: 1 }, sealedTechnique: '<img src=x onerror=oops>' });
  assert.doesNotMatch(html, /<img/); assert.match(html, /&lt;img/);
});

test('the old burning alias is visible but never promises a nonexistent damage tick', () => {
  const rows = combatStatusRows({ status: { burning: 2, burningTurns: 3 } });
  assert.equal(rows.length, 1); assert.match(rows[0].label, /Old burn record · inactive/);
  assert.doesNotMatch(rows[0].label, /damage\/turn/); assert.match(rows[0].detail, /no ongoing damage tick/);
});

const policies = {
  largest_magic: 'mira', largest_current_magic: 'orrin', least_armored: 'orrin', highest_armor: 'mira',
  least_warded: 'hero', most_warded: 'orrin', highest_agility: 'orrin', marked_prey: 'mira',
  last_target: 'hero', last_attacker: 'orrin', unafraid_party: 'hero', next_party_actor: 'hero',
  most_injured: 'hero', protector: 'hero', unknown_fallback: 'hero',
};
for (const [policy, expected] of Object.entries(policies)) test(`typed ${policy} prediction uses the execution target, stable ties and no dead actors`, () => {
  const b = fixture('strike', policy), a = enemy(b), before = structuredClone(b);
  const predicted = resolveEnemyTargets(b, a);
  assert.equal(predicted.target.id, expected); assert.deepEqual(rowIds(predicted), [expected]); assert.deepEqual(b, before);
  const hits = []; executeEnemyPlan(b, a, { damage: (_, target, n) => { hits.push(target.id); return n; }, log() {} });
  assert.deepEqual(hits, [expected]); assert.equal(a.lastTargetId, expected);
});

test('remembered living targets win; dead or absent remembered targets fall back exactly', () => {
  const b = fixture('strike', 'last_target'), a = enemy(b);
  a.lastTargetId = 'mira'; assert.equal(resolveEnemyTargets(b, a).target.id, 'mira');
  for (const id of ['down', 'missing']) { a.lastTargetId = id; assert.equal(resolveEnemyTargets(b, a).target.id, 'hero'); }
  a.planCycle[0].target = 'last_attacker';
  for (const id of ['down', 'missing']) { b.lastAttackerId = id; assert.equal(resolveEnemyTargets(b, a).target.id, 'mira'); }
  a.planCycle[0].target = 'marked_prey'; delete b.actors[1].status.pack_mark;
  assert.equal(resolveEnemyTargets(b, a).target.id, 'hero');
});

test('guard override selects the first living protector for every aimed plan, not a merely defending actor', () => {
  for (const policy of Object.keys(policies)) {
    const b = fixture('strike', policy), a = enemy(b);
    b.actors[2].defending = true; assert.equal(resolveEnemyTargets(b, a).target.id, policies[policy]);
    b.actors[1].status.protecting = true; b.actors[2].status.protecting = true;
    assert.equal(resolveEnemyTargets(b, a).target.id, 'mira');
    b.actors[1].hp = 0; assert.equal(resolveEnemyTargets(b, a).target.id, 'orrin');
  }
});

test('typed injury ties retain actor order; legacy injury ties use lower actual HP then actor order', () => {
  const b = fixture(), a = enemy(b);
  assert.equal(resolveEnemyTargets(b, a).target.id, 'hero');
  delete b.effectsVersion; assert.equal(resolveEnemyTargets(b, a).target.id, 'orrin');
  a.aiKey = 'sniper'; assert.equal(resolveEnemyTargets(b, a).target.id, 'mira');
  b.actors[0].maxMp = 40; assert.equal(resolveEnemyTargets(b, a).target.id, 'hero');
  b.actors[2].status.protecting = true; assert.equal(resolveEnemyTargets(b, a).target.id, 'orrin');
});

for (const action of ['wave', 'burning_wave', 'poisoning_wave']) test(`${action} predicts and executes every living party recipient, regardless of the nominal guard`, () => {
  const b = fixture(action, 'most_injured'), a = enemy(b); a.status.charged = 4; b.actors[1].status.protecting = true;
  const selected = resolveEnemyTargets(b, a); assert.equal(selected.scope, 'all_party'); assert.equal(selected.target.id, 'mira');
  assert.deepEqual(rowIds(selected), ['hero', 'mira', 'orrin']);
  const hits = []; executeEnemyPlan(b, a, { damage: (_, target, n) => { hits.push(target.id); return n; }, log() {} });
  assert.deepEqual(hits, rowIds(selected)); assert.equal(a.lastTargetId, 'mira');
});

for (const [action, policy, scope, ids] of [
  ['charge', 'self', 'self', ['enemy']], ['ritual', 'self', 'self', ['enemy']], ['predict', 'largest_magic', 'self', ['enemy']],
  ['ward', 'self', 'self', ['enemy']], ['heal', 'self', 'self', ['enemy']],
  ['ward', 'most_injured_enemy', 'enemy', ['support']], ['ward', 'all_enemies', 'all_enemies', ['enemy', 'support', 'support-2']],
  ['ally_ward_transfer', 'most_warded_enemy', 'self', ['enemy']],
]) test(`${action}/${policy} displays real support recipients while retaining nominal target memory`, () => {
  const b = fixture(action, policy), a = enemy(b); b.actors[1].status.protecting = true;
  const selected = resolveEnemyTargets(b, a); assert.equal(selected.scope, scope); assert.deepEqual(rowIds(selected), ids); assert.equal(selected.target.id, 'mira');
  const hits = []; executeEnemyPlan(b, a, { damage: (_, target, n) => { hits.push(target.id); return n; }, log() {} });
  assert.deepEqual(hits, []); assert.equal(a.lastTargetId, 'mira');
  if (action === 'ward') for (const id of ids) assert.equal(b.actors.find(x => x.id === id).status.ward, id === 'enemy' ? 3 : 11);
  if (action === 'predict') assert.equal(selected.aim.id, 'mira');
  if (action === 'ally_ward_transfer') { assert.equal(selected.donor.id, 'support'); assert.equal(a.status.ward, 3); assert.equal(b.actors.find(x => x.id === 'support').status.ward, 5); }
});

test('broken and silenced actions predict no recipients without cancelling legal base strikes or poison waves', () => {
  for (const action of ['burning_wave', 'drain_and_share']) {
    const b = fixture(action), a = enemy(b); assert.deepEqual(rowIds(resolveEnemyTargets(b, a)), []);
    const hits = []; executeEnemyPlan(b, a, { damage: (_, target, n) => { hits.push(target.id); return n; }, log() {} }); assert.deepEqual(hits, []);
  }
  for (const action of ['ritual', 'wave', 'burning_wave', 'mana_drain', 'seal_last_technique']) {
    const b = fixture(action), a = enemy(b); a.status = { silenced: 1, charged: 4 };
    assert.equal(resolveEnemyTargets(b, a).scope, 'none');
  }
  for (const action of ['charged_strike', 'poisoning_wave']) {
    const b = fixture(action), a = enemy(b); a.status.silenced = 1; assert.ok(resolveEnemyTargets(b, a).recipients.length);
  }
  const b = fixture('heal'), a = enemy(b); b.actors = b.actors.filter(x => x.side === 'party' || x.id === a.id);
  assert.equal(resolveEnemyTargets(b, a).scope, 'none');
});

test('drain recovery names the exact self or first injured living foe without promising healing', () => {
  for (const action of ['drain', 'conditional_drain', 'drain_and_share']) {
    const b = fixture(action), a = enemy(b); a.status.charged = 4; b.actors[0].hp = 10;
    const expected = action === 'drain_and_share' ? 'support' : 'enemy', selected = resolveEnemyTargets(b, a);
    assert.equal(selected.recoveryRecipient.id, expected); assert.match(enemyRecipientPrediction(b, a).text, /Recovery: .*from actual damage, if any/);
    const before = selected.recoveryRecipient.hp;
    executeEnemyPlan(b, a, { damage: () => 4, log() {} }); assert.equal(selected.recoveryRecipient.hp, before + 2);
  }
  const b = fixture('conditional_drain'), a = enemy(b); assert.equal(resolveEnemyTargets(b, a).recoveryRecipient, undefined);
  a.planCycle[0].action = 'drain_and_share'; a.status.charged = 4;
  for (const foe of b.actors.filter(x => x.side === 'enemy' && x.id !== a.id)) foe.hp = foe.maxHp;
  assert.equal(resolveEnemyTargets(b, a).recoveryRecipient.id, 'enemy');
  delete b.effectsVersion; a.aiKey = 'leech'; assert.equal(resolveEnemyTargets(b, a).recoveryRecipient.id, 'enemy');
});

const legacyCycles = {
  keeper: ['self', 'all_party', 'party'], archivist: ['party', 'self', 'all_party'], thornheart: ['party', 'self'],
  captain: ['party', 'all_enemies', 'all_party'], warden: ['party', 'self', 'all_party'], covenant: ['all_party', 'party', 'self'],
  warder: ['enemy', 'party'], leech: ['party'], sniper: ['party'], hexer: ['party'], barbed: ['party'], basic: ['party'], striker: ['party'],
};
for (const [key, cycle] of Object.entries(legacyCycles)) test(`legacy ${key} keeps current single/group/self/support targeting for its full cycle`, () => {
  for (let step = 0; step < cycle.length * 2; step++) {
    const b = fixture(), a = enemy(b); delete b.effectsVersion; a.aiKey = key; a.aiStep = step;
    const selected = resolveEnemyTargets(b, a); assert.equal(selected.scope, cycle[step % cycle.length]);
    assert.equal(selected.target.id, key === 'sniper' ? 'mira' : 'orrin');
    if (selected.scope === 'all_party') assert.deepEqual(rowIds(selected), ['hero', 'mira', 'orrin']);
    if (selected.scope === 'all_enemies') assert.deepEqual(rowIds(selected), ['enemy', 'support', 'support-2']);
    if (selected.scope === 'enemy') assert.deepEqual(rowIds(selected), ['support']);
  }
});

test('legacy support turns retain their odd-round nominal trait recipient', () => {
  const b = fixture(), a = enemy(b); delete b.effectsVersion; a.aiKey = 'keeper'; a.trait = 'barbed';
  assert.deepEqual(rowIds(resolveEnemyTargets(b, a)), ['enemy']);
  assert.match(enemyRecipientPrediction(b, a).text, /Current support: Self.*Current trait target: Orrin/);
  b.round = 2; assert.doesNotMatch(enemyRecipientPrediction(b, a).text, /trait target/);
});

test('current predictions handle missing/dead targets and finished encounters without inventing a recipient', () => {
  const b = fixture(), a = enemy(b); for (const p of b.actors.filter(x => x.side === 'party')) p.hp = 0;
  assert.equal(resolveEnemyTargets(b, a).target, null); assert.deepEqual(rowIds(resolveEnemyTargets(b, a)), []);
  assert.match(enemyRecipientPrediction(b, a).text, /No living party target/);
  b.outcome = 'defeat'; assert.equal(enemyRecipientPrediction(b, a), null); assert.equal(renderEnemyPrediction(b, a), '');
  b.outcome = null; a.hp = 0; assert.equal(enemyRecipientPrediction(b, a), null);
});

test('read-only status and intent rendering does not draw RNG, mutate actors, advance plans or leak future actions', () => {
  const b = fixture('predict', 'largest_magic'), a = enemy(b); a.planCycle.push({ action: 'hidden_future_action', target: 'secret_future_target' });
  a.status = { charged: 4, poison: 2, poisonTurns: 2 }; const before = JSON.stringify(b); freeze(b);
  const random = Math.random; Math.random = () => { throw Error('A read must not draw random numbers.'); };
  try {
    for (let i = 0; i < 5; i++) {
      const selection = resolveEnemyTargets(b, a), view = enemyRecipientPrediction(b, a), html = renderEnemyPrediction(b, a) + renderCombatStatuses(a);
      assert.equal(selection.target.id, 'mira'); assert.equal(view.scope, 'self'); assert.equal(a.aiStep, 0);
      assert.match(view.text, /Current aim: Mira.*preparation only/); assert.doesNotMatch(html, /hidden_future|secret_future/);
    }
  } finally { Math.random = random; }
  assert.equal(JSON.stringify(b), before);
});

test('prediction labels distinguish party-wide, self/support and no-effect actions and escape actor names', () => {
  for (const [action, policy, pattern] of [['wave', 'all_party', /Party-wide/], ['charge', 'self', /Current preparation: Self/], ['ward', 'all_enemies', /All living enemies/], ['burning_wave', 'all_party', /Broken charge/]]) {
    const b = fixture(action, policy); assert.match(enemyRecipientPrediction(b, enemy(b)).text, pattern);
  }
  const b = fixture(); b.actors[0].name = '<script>oops</script>';
  assert.doesNotMatch(renderEnemyPrediction(b, enemy(b)), /<script>/); assert.match(renderEnemyPrediction(b, enemy(b)), /&lt;script&gt;/);
  enemy(b).intent = ''; assert.equal(enemyRecipientPrediction(b, enemy(b)), null);
});
