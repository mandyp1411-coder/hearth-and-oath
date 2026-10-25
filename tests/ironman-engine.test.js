import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createBattle, previewBattleAction, takeBattleAction } from '../dist/js/combat.js';
import { encounterOutlook } from '../dist/js/combat-guidance.js';
import { createTacticsPractice, takeTacticsPracticeAction } from '../dist/js/tactics-practice.js';
import { createIronmanMetadata, currentIronmanPerson, ironmanHeroDeath } from '../dist/js/ironman.js';
import { campRecoveryView } from '../dist/js/travel-energy.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mazeLayout, mazeRoomCell } from '../dist/js/maze-v31.js';
import { adultFamily, freshStory } from './helpers/story-life-fixtures.mjs';
import { roomFixture, atGeneric } from './helpers/companion-field-fixtures.mjs';

// Bounded engine-acceptance cases, not earned-party/balance evidence, storage,
// creator/session/UI coverage or a claim that the incomplete mode may ship.
// Controlled captured stats and saved-event preconditions are labeled below;
// each must pass the actual save validator before a public engine command.
// This file is authored only. Execution belongs to the root's frozen gate.
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const copy = value => structuredClone(value);
const actual = (s, id) => s.companions.find(p => p.id === id);
const actor = (s, id) => s.battle.actors.find(p => p.id === id);
const exact = (s, id) => currentIronmanPerson(s, id);
const valid = (s, label = 'fixture') => { assert.equal(E.validateSave(s), true, label + ': ' + s?.notice); return s; };
const unchanged = (next, before, label = '') => { const n = copy(next); n.notice = before.notice; assert.deepEqual(n, before, label); };

function roundtrip(s, label = 'accepted state') {
  valid(s, label);
  const before = copy(s), next = E.migrateSave(JSON.parse(JSON.stringify(s)));
  assert.ok(next, label + ' migrates');
  assert.deepEqual(next, s, label + ' round-trips exactly');
  assert.deepEqual(s, before, 'migration does not mutate its source');
  return next;
}
function optIn(s) {
  valid(s, 'Standard source before controlled opt-in');
  s = copy(s); s.ironman = createIronmanMetadata(s, { randomUUID: () => RUN });
  return roundtrip(s, 'metadata-only Ironman source');
}
const openings = new Map();
function opening(path = 'rogue', ironman = true) {
  if (!openings.has(path)) {
    let s = valid(E.createGame({ seed: 'ironman-engine-opening-' + path, path }), 'generated childhood');
    for (const id of ['investigate', 'apprentice', 'confess']) s = valid(E.chooseEventOption(s, id), 'actual childhood ' + id);
    assert.equal(s.phase, 'adult'); assert.equal(s.event, null);
    s = valid(E.migrateSave(s), 'publicly migrated generated adult');
    s = valid(E.recruitCompanion(s, 'mira'), 'publicly recruited companion');
    assert.equal(actual(s, 'mira').active, true);
    openings.set(path, s);
  }
  const s = copy(openings.get(path));
  return ironman ? optIn(s) : s;
}
function command(s, id, target) {
  valid(s, 'accepted battle command precondition');
  const before = copy(s), next = E.chooseBattleAction(s, id, target);
  assert.deepEqual(s, before, 'engine battle command leaves its input detached');
  return valid(next, 'accepted battle command ' + id);
}
function action(s, id) {
  const offer = E.getActions(s).find(a => a.id === id);
  assert.ok(offer && !offer.disabledReason, id + ': ' + (offer?.disabledReason || s.notice));
  const before = copy(s), next = E.chooseAction(valid(s), id);
  assert.deepEqual(s, before, 'public action leaves its input detached');
  return valid(next, 'offered action ' + id);
}
function settle(initial) {
  let s = initial;
  for (let n = 0; n < 80; n++) {
    if (s.event) {
      const c = ['private', 'continue', 'care', 'later', 'animal', 'avoid', 'support', 'pause', 'keep']
        .map(id => s.event.choices.find(c => c.id === id && !c.disabledReason)).find(Boolean)
        || s.event.choices.find(c => !c.disabledReason);
      assert.ok(c, 'an actual enabled choice closes this bounded fixture interruption');
      s = valid(E.chooseEventOption(s, c.id), 'public interruption choice');
    } else if (s.conversations?.pending) s = valid(E.replyMessage(s, s.conversations.pending.personId, s.conversations.pending.replies[0].id));
    else if (s.stories?.project) s = action(s, 'stories_continue');
    else if (s.timeline.yearTarget !== null) s = valid(E.continueAgeUp(s));
    else return s;
  }
  throw Error('The existing fixture did not reach a bounded uncommitted moment.');
}
function captured(s = opening(), id = 'mira') {
  // Detached capture is a controlled valid saved battle, not proof of earning
  // its entry. The casualty itself must be accepted by chooseBattleAction.
  s = copy(s); assert.ok(actual(s, id)?.alive !== false);
  s.battle = createBattle(s, 'forest', null, { openingTurns: false });
  s.battle.instanceId = 'ironman-engine-controlled-' + s.dynasty.generation + '-' + id;
  s.battle.currentActorId = 'hero';
  s.battle.turnOrder = ['hero', ...s.battle.actors.filter(a => a.id !== 'hero').map(a => a.id)];
  return roundtrip(s, 'controlled captured battle');
}
function statusBoundary(s = captured(), id = 'mira', status = { poison: 2, poisonTurns: 1 }) {
  s = copy(s); actor(s, id).hp = 1; actor(s, id).status = copy(status);
  s.life.happiness = 70; s.life.stress = 20;
  s.battle.currentActorId = 'hero';
  s.battle.turnOrder = ['hero', id, ...s.battle.actors.filter(a => !['hero', id].includes(a.id)).map(a => a.id)];
  return roundtrip(s, 'controlled one-HP status/turn-order boundary');
}
function deathView(s, id = 'mira') {
  const p = exact(s, id);
  return copy({ actual: actual(s, id), person: p, stage: s.rpg.companionStages[id],
    casualties: s.ironman.casualties, grief: s.lineage.grief.filter(g => g.personId === p.id),
    deathJournal: s.journal.filter(j => j.personId === p.id && j.eventId === 'person_died') });
}
function assertDead(s, id, death) {
  const p = actual(s, id), record = exact(s, id);
  assert.ok(p && record); assert.equal(p.alive, false); assert.equal(p.active, false);
  assert.equal(p.recruited, false); assert.equal(p.hp, 0); assert.equal(p.deathDay, death.day);
  assert.equal(record.alive, false); assert.equal(record.deathDay, death.day);
  assert.equal(s.rpg.companionStages[id].status, 'dead');
  assert.deepEqual(s.ironman.casualties.filter(c => c.personId === record.id), [{ personId: record.id, ...death }]);
}
function acceptedDeath(s = statusBoundary(), id = 'mira') {
  const next = command(s, 'attack', 'enemy-1');
  assert.equal(actor(next, id).hp, 0); assert.notEqual(next.battle.outcome, 'ironman-death');
  const death = { day: s.day, battleId: s.battle.instanceId, generation: s.dynasty.generation };
  assertDead(next, id, death);
  return { s: next, death };
}

test('opening enemy turns apply a companion casualty only after exact engine battle identity exists', () => {
  let s = opening('mage');
  // Controlled existing-site projection and initiative/Health, not earned
  // travel or route/balance evidence. The actual offered expedition creates
  // its own actors and opening turns, rather than installing a fake result.
  s.locationId = 'forest'; s.cartography.interior = null; syncCartography(s);
  s.hero.attributes.agility = 1; actual(s, 'mira').agility = 1; actual(s, 'mira').hp = 1;
  roundtrip(s, 'controlled lethal expedition opening'); const before = copy(s);
  s = action(s, 'forest_expedition');
  assert.deepEqual(before.ironman.casualties, []); assert.equal(actual(before, 'mira').alive !== false, true);
  assert.equal(s.battle.encounterId, 'forest'); assert.equal(s.battle.mortality.lethal, true);
  assert.ok(s.battle.instanceId); assert.equal(actor(s, 'mira').hp, 0);
  assertDead(s, 'mira', { day: s.day, battleId: s.battle.instanceId, generation: s.dynasty.generation });
  assert.equal(s.lineage.grief.filter(g => g.personId === exact(s, 'mira').id).length, 1);
  roundtrip(s, 'applied opening death with retained captured actor');
});

test('a real mid-turn enemy hit immediately applies exact dead flags, named grief and family mood once', () => {
  let s = captured(); actor(s, 'mira').hp = 1;
  const enemy = actor(s, 'enemy-1');
  for (const key of ['planId', 'planCycle', 'bossId', 'phasePlan']) delete enemy[key];
  enemy.aiKey = 'striker'; enemy.aiStep = 0; enemy.status = {}; enemy.attackPower = 99; enemy.armor = 100;
  s.battle.turnOrder = ['hero', 'enemy-1', 'mira', ...s.battle.actors.filter(a => !['hero', 'enemy-1', 'mira'].includes(a.id)).map(a => a.id)];
  s.life.happiness = 70; s.life.stress = 20; roundtrip(s, 'controlled accepted lethal hit stats');
  const before = copy(s), { s: dead, death } = acceptedDeath(s);
  assert.deepEqual(s, before); assert.equal(dead.life.happiness, 60); assert.equal(dead.life.stress, 30);
  assert.equal(deathView(dead).grief.length, 1); assert.equal(deathView(dead).deathJournal.length, 1);
  assert.equal(actor(dead, 'mira').hp, 0, 'ongoing battle retains the now inactive/unrecruited actor');
  assert.ok(dead.battle.mortality.deaths.some(d => d.personId === exact(dead, 'mira').id));
  const effects = deathView(dead), rejectedPotion = command(dead, 'potion', 'mira');
  assert.equal(rejectedPotion.battle.potions, dead.battle.potions);
  assert.deepEqual(deathView(rejectedPotion), effects, 're-acceptance cannot duplicate grief, ledger or death journal');
  assertDead(roundtrip(rejectedPotion), 'mira', death);
});

for (const [name, status] of [['poison', { poison: 2, poisonTurns: 1 }], ['bleed', { bleed: 2, bleedTurns: 1 }], ['burn', { burn: 2, burnTurns: 1 }]]) {
  test(`actual ${name} zero at next-turn entry is applied before the engine returns`, () => {
    const before = statusBoundary(captured(), 'mira', status), { s, death } = acceptedDeath(before);
    assert.equal(s.day, before.day); assert.equal(s.lineage.grief.filter(g => g.personId === exact(s, 'mira').id).length, 1);
    assertDead(roundtrip(s), 'mira', death);
  });
}

for (const outcome of ['retreat', 'victory']) test(`actual ${outcome} settlement preserves exact casualty/grief and cannot revive through hero level-up`, () => {
  let boundary = statusBoundary();
  // Controlled one-HP enemies and near-level experience keep the actual
  // victory finite. Outcomes are earned through offered attack commands.
  if (outcome === 'victory') { for (const enemy of boundary.battle.actors.filter(a => a.side === 'enemy')) enemy.hp = 1; boundary.hero.exp = boundary.hero.level * 45 - 1; }
  roundtrip(boundary, 'controlled settlement precondition');
  let { s, death } = acceptedDeath(boundary); const effects = deathView(s), level = s.hero.level;
  if (outcome === 'retreat') s = command(s, 'retreat');
  else {
    for (let n = 0; n < 8 && !s.battle.outcome; n++) {
      const target = s.battle.actors.find(a => a.side === 'enemy' && a.hp > 0);
      assert.ok(target); s = command(s, 'attack', target.id);
    }
  }
  assert.equal(s.battle.outcome, outcome); assert.deepEqual(deathView(s), effects);
  const before = copy(s), completed = copy(s.battle); s = valid(E.resolveBattle(s, completed), 'actual settlement');
  assert.deepEqual(before.battle, completed); assert.equal(s.battle, null); assertDead(s, 'mira', death);
  // Ordinary settlement refreshes this typed death row through the existing
  // narrative edition. Only its three documented presentation fields change.
  const expectedSettledEffects = copy(effects);
  assert.equal(expectedSettledEffects.deathJournal.length, 1);
  const row = expectedSettledEffects.deathJournal[0];
  Object.assign(row, { title: `Remembering ${row.personName}`,
    text: `${row.personName} died at age ${row.personAge}. Your shared memories remain in Relationships.`, narrativeEdition: 30 });
  assert.deepEqual(deathView(s), expectedSettledEffects, 'settlement preserves every death effect and typed journal field');
  if (outcome === 'victory') assert.ok(s.hero.level > level, 'hero really levels up in this settlement');
  else assert.equal(s.hero.level, level);
  const once = copy(s); unchanged(E.resolveBattle(s, completed), once, 'duplicate completed result is idempotent');
  roundtrip(s, 'settled companion death');
});

test('ordinary offered recovery and elapsed time preserve a settled death through exact JSON migration', () => {
  let { s, death } = acceptedDeath(); s = command(s, 'retreat'); s = valid(E.resolveBattle(s, s.battle)); s = settle(s);
  const personId = exact(s, 'mira').id, grief = copy(s.lineage.grief.find(g => g.personId === personId));
  s.hero.hp = Math.max(1, s.hero.maxHp - 30); roundtrip(s, 'controlled injured living hero');
  const care = E.getActions(s).find(a => a.id === 'health_rest' && !a.disabledReason)
    || E.getActions(s).find(a => a.id === 'life_rest' && !a.disabledReason);
  assert.ok(care, 'a genuinely offered ordinary time-consuming recovery action');
  const before = copy(s); s = action(s, care.id);
  assert.ok(s.day > before.day); assert.ok(s.hero.hp > before.hero.hp, 'actual recovery restores a living hero');
  assertDead(s, 'mira', death); assert.deepEqual(s.lineage.grief.find(g => g.personId === personId), grief);
  roundtrip(s, 'ordinary time and recovery after permanent death');
});

test('dead exact people reject recruit, toggle and stale RPG-meet controls without consuming resources', () => {
  // Controlled valid uninvited precondition; invitation and activation below
  // are actual offered/public commands, not a fabricated recruited result.
  let ready = opening(); actual(ready, 'mira').recruited = actual(ready, 'mira').active = false;
  roundtrip(ready, 'controlled uninvited living companion');
  const meet = E.getActions(ready).find(a => a.id === 'rpg_meet_mira' && !a.disabledReason);
  assert.ok(meet, 'the actual living RPG invitation is offered before death');
  ready = action(ready, meet.id); assert.equal(actual(ready, 'mira').recruited, true); assert.equal(actual(ready, 'mira').active, false);
  ready = valid(E.toggleCompanion(ready, 'mira')); assert.equal(actual(ready, 'mira').active, true);
  let { s, death } = acceptedDeath(statusBoundary(captured(ready))); s = command(s, 'retreat'); s = settle(valid(E.resolveBattle(s, s.battle)));
  assert.ok(E.companionActionReason(s, 'mira')); assert.ok(E.companionActionReason(s, 'mira', 'toggle'));
  assert.equal(E.getActions(s).some(a => a.id === 'rpg_meet_mira' && !a.disabledReason), false);
  for (const [label, run] of [['recruit', v => E.recruitCompanion(v, 'mira')], ['toggle', v => E.toggleCompanion(v, 'mira')], ['stale RPG meet', v => E.chooseAction(v, 'rpg_meet_mira')]]) {
    const before = copy(s), next = run(s); unchanged(next, before, label); assertDead(next, 'mira', death); roundtrip(next);
  }
});

function mazeParty() {
  let s = roomFixture('protector');
  // Reuse the small published-maze projection. A second controlled, living
  // helper enables a real positive healing control in the very same room.
  const healer = actual(s, 'sable'); assert.ok(healer && healer.alive !== false);
  healer.recruited = healer.active = true; healer.hp = healer.maxHp; healer.mp = healer.maxMp;
  s.hero.attributes.agility = 12;
  s.rpg.companionStages.sable.status = 'available'; s.hero.potions = 4;
  return optIn(roundtrip(s, 'controlled two-person actual maze party'));
}
function deadMazeParty() {
  let s = mazeParty(); s.maze.position = 0; s.maze.previous = 0; roundtrip(s, 'controlled safe entrance before combat');
  const staleTreatment = E.getActions(s).find(a => a.fieldAssist?.kind === 'healer' && a.fieldAssist.helperId === 'sable' && a.fieldAssist.targetId === 'mira' && !a.disabledReason);
  assert.ok(staleTreatment, 'an actual enabled same-room healer selector targets living Mira before death');
  s = atGeneric(s, 'enemy'); s = action(s, 'maze_fight');
  assert.equal(s.battle.context.kind, 'maze'); assert.equal(s.battle.context.roomId, String(s.maze.position));
  const result = acceptedDeath(statusBoundary(s));
  s = command(result.s, 'retreat'); s = settle(valid(E.resolveBattle(s, s.battle)));
  s.maze.position = 0; s.maze.previous = 0;
  return { s: roundtrip(s, 'controlled safe entrance after actual maze retreat'), death: result.death, staleTreatmentId: staleTreatment.id };
}

test('actual offered field potion and healer assist restore living allies but never the accepted casualty', () => {
  let { s, death, staleTreatmentId } = deadMazeParty();
  const beforeStaleTreatment = copy(s), rejectedTreatment = E.chooseAction(s, staleTreatmentId);
  assert.deepEqual(s, beforeStaleTreatment, 'stale healer action leaves its input unchanged');
  unchanged(rejectedTreatment, beforeStaleTreatment, 'the once-offered same-room healer selector cannot treat the now-dead exact person');
  // Position only is controlled; the public quote/action must verify the
  // current real maze room and supplies before accepting either treatment.
  s = atGeneric(s, 'camp'); s.hero.hp = Math.max(1, s.hero.maxHp - 35); actual(s, 'sable').hp = 10;
  roundtrip(s, 'controlled safe treatment room/resources');
  const liveQuote = E.fieldPotionQuote(s, 'sable'); assert.equal(liveQuote.disabledReason, null); assert.ok(liveQuote.amount > 0);
  assert.ok(E.fieldPotionQuote(s, 'mira').disabledReason);
  const beforeDeadPotion = copy(s), rejectedPotion = E.useConsumable(s, 'potions', 'mira');
  assert.deepEqual(s, beforeDeadPotion, 'dead-target field potion leaves its input unchanged');
  unchanged(rejectedPotion, beforeDeadPotion, 'dead-target field potion is rejected');
  const beforePotion = copy(s); s = valid(E.useConsumable(s, 'potions', 'sable'));
  assert.equal(actual(s, 'sable').hp, actual(beforePotion, 'sable').hp + liveQuote.amount);
  assert.equal(s.hero.potions, beforePotion.hero.potions - 1); assertDead(s, 'mira', death);
  const helper = E.getActions(s).find(a => a.fieldAssist?.kind === 'healer' && a.fieldAssist.helperId === 'sable' && a.fieldAssist.targetId === 'hero');
  assert.ok(helper && !helper.disabledReason, 'actual offered healer action for the injured living hero');
  const quote = E.fieldAssistQuote(s, 'healer', 'sable', 'hero'); assert.equal(quote.disabledReason, null); assert.ok(quote.hpGain > 0);
  assert.ok(E.fieldAssistQuote(s, 'healer', 'sable', 'mira').disabledReason);
  assert.ok(E.fieldAssistQuote(s, 'protector', 'mira').disabledReason, 'the corpse cannot supply field help either');
  const beforeAssist = copy(s); s = action(s, helper.id);
  assert.ok(s.hero.hp > beforeAssist.hero.hp); assert.ok(actual(s, 'sable').mp < actual(beforeAssist, 'sable').mp);
  assertDead(roundtrip(s), 'mira', death);
});

test('actual party maze camp heals an attending living companion while exact dead flags and ledger stay fixed', () => {
  let { s, death } = deadMazeParty(); actual(s, 'sable').hp = 10; actual(s, 'sable').mp = 0; s.hero.hp = Math.max(1, s.hero.maxHp - 20);
  roundtrip(s, 'controlled pre-camp reserves');
  const q = campRecoveryView(s, { party: true }), living = q.travellers.find(p => p.id === 'sable');
  assert.ok(living && living.hp > 0); assert.equal(q.travellers.some(p => p.id === 'mira'), false);
  assert.ok(E.getActions(s).some(a => a.id === 'maze_camp' && !a.disabledReason));
  const before = copy(s), dead = deathView(s); s = action(s, 'maze_camp');
  assert.equal(s.day, before.day + 1); assert.equal(actual(s, 'sable').hp, actual(before, 'sable').hp + living.hp);
  assert.equal(actual(s, 'sable').mp, actual(before, 'sable').mp + living.mp);
  assertDead(s, 'mira', death); assert.deepEqual(deathView(s), dead);
  roundtrip(s, 'actual one-day party camp after casualty');
});

test('filtered legacy camp/rest selectors are honest no-ops, not positive recovery coverage', () => {
  let { s, death } = deadMazeParty();
  assert.ok(s.trail); assert.equal(E.getActions(s).some(a => a.id === 'camp_rest'), false);
  const before = copy(s); unchanged(E.chooseAction(s, 'camp_rest'), before, 'legacy camp_rest is unavailable with trail metadata');
  assertDead(s, 'mira', death);
});

function terminalBoundary(s = captured()) {
  s = copy(s); actor(s, 'hero').hp = 1;
  const enemy = actor(s, 'enemy-1');
  for (const key of ['planId', 'planCycle', 'bossId', 'phasePlan']) delete enemy[key];
  enemy.aiKey = 'striker'; enemy.aiStep = 0; enemy.status = {}; enemy.attackPower = 99; enemy.armor = 100;
  // Most-injured targeting and this exact captured order force the public
  // attack's next enemy turn to kill the hero, with a living companion left.
  for (const p of s.battle.actors.filter(a => a.side === 'party' && a.id !== 'hero')) p.hp = p.maxHp;
  s.battle.currentActorId = 'hero';
  s.battle.turnOrder = ['hero', 'enemy-1', ...s.battle.actors.filter(a => !['hero', 'enemy-1'].includes(a.id)).map(a => a.id)];
  return roundtrip(s, 'controlled accepted hero-fatal enemy boundary');
}
function assertTerminal(s) {
  assert.equal(s.battle.outcome, 'ironman-death'); assert.equal(s.battle.currentActorId, null);
  assert.equal(actor(s, 'hero').hp, 0); assert.ok(s.battle.actors.some(a => a.side === 'party' && a.id !== 'hero' && a.hp > 0));
  assert.deepEqual(ironmanHeroDeath(s), { runId: RUN, personId: s.dynasty.activePersonId, day: s.day, battleId: s.battle.instanceId });
  assert.equal(exact(s, 'hero').alive, true); assert.equal(s.lineage.heroDeath, null);
  assert.equal(s.ironman.casualties.some(c => c.personId === s.dynasty.activePersonId), false);
}

test('matched hero terminal is retained before ordinary settlement, recovery, rewards or hero death records', () => {
  const s = terminalBoundary(), before = copy(s), terminal = command(s, 'attack', 'enemy-1'); assertTerminal(terminal);
  assert.equal(terminal.day, before.day); assert.equal(terminal.hero.hp, before.hero.hp);
  const completed = copy(terminal.battle), accepted = valid(E.resolveBattle(terminal, completed), 'internal accepted terminal');
  assertTerminal(accepted); assert.deepEqual(accepted.battle, completed);
  for (const key of ['day', 'age', 'phase', 'hero', 'health', 'flags', 'equipment', 'lineage', 'dynasty', 'journal']) assert.deepEqual(accepted[key], terminal[key], key + ' is not settled/rewarded/recovered');
  roundtrip(accepted, 'internal terminal descriptor, not a playable-store acceptance');
});

test('resolveBattle itself accepts a genuinely computed matched terminal before settlement and rejects mismatched results', () => {
  const pending = terminalBoundary(), before = copy(pending);
  // Actual pure combat computation, not a manually fabricated terminal result.
  // This separately reaches resolveBattle while the engine save is still live.
  const completed = takeBattleAction(pending.battle, 'attack', 'enemy-1');
  assert.equal(completed.outcome, 'ironman-death'); assert.deepEqual(pending, before);
  const accepted = valid(E.resolveBattle(pending, completed), 'terminal accepted by resolveBattle boundary');
  assertTerminal(accepted); assert.deepEqual(accepted.battle, completed);
  for (const key of ['day', 'age', 'phase', 'hero', 'health', 'flags', 'equipment', 'lineage', 'dynasty', 'journal']) assert.deepEqual(accepted[key], before[key], key + ' stays before ordinary settlement');
  for (const mutate of [b => b.instanceId = 'another-battle', b => b.mortality.runId = '11223344-5566-4788-99aa-bbccddeeff00', b => b.mortality.participants[0].personId = 'another-person']) {
    const mismatch = copy(completed); mutate(mismatch);
    unchanged(E.resolveBattle(pending, mismatch), pending, 'mismatched terminal cannot be accepted');
  }
});

test('actual maze terminal leaves the pending room, expedition accounting and callbacks untouched', () => {
  let s = mazeParty(); s = atGeneric(s, 'enemy'); s = action(s, 'maze_fight');
  s = terminalBoundary(s); const before = copy(s), terminal = command(s, 'attack', 'enemy-1'); assertTerminal(terminal);
  const accepted = valid(E.resolveBattle(terminal, terminal.battle)); assertTerminal(accepted);
  for (const key of ['maze', 'mazeBook', 'adventuring', 'rpg', 'campaign', 'world', 'day', 'health']) assert.deepEqual(accepted[key], before[key], key + ' has no post-terminal callback');
  assert.equal(accepted.maze.pendingRoom, before.maze.pendingRoom); assert.ok(accepted.maze.pendingRoom !== null);
});

test('terminal engine mutation/progression entry points cannot continue or rewrite the run', () => {
  const terminal = command(terminalBoundary(), 'attack', 'enemy-1'); assertTerminal(terminal);
  const calls = [
    ['action', s => E.chooseAction(s, 'health_rest')], ['choice', s => E.chooseEventOption(s, 'continue')],
    ['battle', s => E.chooseBattleAction(s, 'potion', 'hero')], ['age up', E.ageUp], ['continue age up', E.continueAgeUp],
    ['year plan', s => E.planYear(s, {})], ['continue year', E.continueYear], ['journey', E.continueJourney],
    ['travel', s => E.travelTo(s, 'forest')], ['explore start', s => E.startExploreJourney(s, 'forest')],
    ['explore continue', E.continueExploreJourney], ['explore stop', E.stopExploreJourney],
    ['road plan', s => E.updateTravelPlan(s, { pace: 'fast' })], ['heir', s => E.continueAsChild(s, 'child-1')],
    ['recruit', s => E.recruitCompanion(s, 'mira')], ['toggle', s => E.toggleCompanion(s, 'mira')],
    ['consumable', s => E.useConsumable(s, 'potions')], ['preferences', s => E.updatePreferences(s, { pursuit: 'craft' })],
    ['appearance', s => E.updateAppearance(s, {})], ['portrait', s => E.selectCharacterPortrait(s, 'portrait-1')],
    ['heritage', s => E.declareCharacterHeritage(s, 'human')], ['equipment', s => E.equipGear(s, 'starter_sword')],
    ['identity', s => E.updateRomanticIdentity(s, { gender: 'woman', attraction: 'none' })],
    ['personality', s => E.choosePersonalityTrait(s, 'curious')], ['service', s => E.visitService(s, 'healer')],
    ['reply', s => E.replyMessage(s, 'mira', 'listen')], ['hunger', E.attendBloodHunger],
    ['map memory', s => E.updateMazeMapMemory(s, { note: '', mark: null })],
    ['personal note', s => E.keepPlayerNote(s, 'No playable continuation after terminal.')],
    ['edit note', s => E.editPlayerNote(s, {}, 'No change.')], ['archive note', s => E.archivePlayerNote(s, {}, true)],
    ['trade', s => E.completeTrade(s, {})],
  ];
  for (const [label, run] of calls) {
    const before = copy(terminal), next = run(terminal);
    assert.deepEqual(terminal, before, label + ' input is immutable'); unchanged(next, before, label + ' cannot mutate an internal terminal'); assertTerminal(next);
  }
  const organizer = E.gearOrganizerCommand(terminal, {});
  assert.equal(organizer.ok, false); assert.equal(organizer.changed, false); assert.strictEqual(organizer.state, terminal);
  assert.deepEqual(E.getActions(terminal), []); assert.ok(E.equipmentActionReason(terminal));
});

test('previews, encounter outlook and fixed memory-only practice cannot accept real casualties', () => {
  const s = terminalBoundary(), before = copy(s);
  const preview = previewBattleAction(s.battle, 'attack', 'enemy-1'); assert.equal(preview.legal, true);
  encounterOutlook(s, 'forest');
  const practice = createTacticsPractice('protect_ally'), next = takeTacticsPracticeAction(practice, 'defend');
  assert.equal(Object.hasOwn(practice.battle, 'mortality'), false); assert.equal(Object.hasOwn(next.battle, 'mortality'), false);
  assert.deepEqual(s, before); assert.deepEqual(s.ironman.casualties, []); assert.equal(actual(s, 'mira').alive !== false, true);
  assert.equal(ironmanHeroDeath(s), null); roundtrip(s);
});

test('verified supervised Paladin trial permits a companion zero without real death or a ledger entry', () => {
  let s = opening('warrior');
  s.flags.pendingSpecialization = 'paladin'; s.flags.oathType = 'mercy'; s.flags.oathBroken = false;
  s.flags.oath = 'Show mercy: never bind an unwilling soul or feed on an unwilling person.';
  s.event = { id: 'initiation_trial', title: 'A commitment made concrete', category: 'Paladin initiation',
    body: 'The order offers a supervised encounter against trial guardians.',
    choices: [{ id: 'combat', label: 'Enter the controlled trial', description: 'Begin the supervised Paladin encounter.' }] };
  roundtrip(s, 'controlled valid saved Paladin choice'); s = valid(E.chooseEventOption(s, 'combat'));
  assert.equal(s.battle.context.kind, 'initiation'); assert.equal(s.battle.mortality.lethal, false);
  s = statusBoundary(s); const next = command(s, 'attack', 'enemy-1');
  assert.equal(actor(next, 'mira').hp, 0); assert.equal(actual(next, 'mira').alive !== false, true);
  assert.equal(exact(next, 'mira').alive, true); assert.equal(next.rpg.companionStages.mira.status, 'available');
  assert.deepEqual(next.ironman.casualties, []); assert.deepEqual(next.battle.mortality.deaths, []);
  assert.equal(ironmanHeroDeath(next), null); roundtrip(next);
});

test('actual supervised Watchhouse loss settles normally without accepting a real casualty', () => {
  let s = optIn(settle(freshStory())); const path = settlementWalkPath(s, 'watch'); assert.ok(path);
  for (const room of path) s = action(s, 'atlas_room_' + room);
  s = action(s, 'tournament_invite'); assert.equal(s.event.id, 'tournament_invitation');
  s = valid(E.chooseEventOption(s, 'enter')); s = settle(s);
  if (s.adultTournament.stage === 'paused') s = action(s, 'tournament_resume');
  assert.equal(s.adultTournament.stage, 'ready'); s = action(s, 'tournament_bout_0');
  assert.equal(s.battle.mortality.lethal, false); assert.deepEqual(s.battle.mortality.participants.map(p => p.actorId), ['hero']);
  const before = copy(s);
  for (let n = 0; n < 240 && !s.battle.outcome; n++) s = command(s, 'defend');
  assert.equal(s.battle.outcome, 'defeat'); assert.equal(actor(s, 'hero').hp, 0);
  assert.deepEqual(s.battle.mortality.deaths, []); assert.deepEqual(s.ironman.casualties, []); assert.equal(ironmanHeroDeath(s), null);
  s = valid(E.resolveBattle(s, s.battle)); assert.equal(s.battle, null); assert.equal(s.hero.hp, 1);
  assert.equal(s.day, before.day); assert.equal(s.hero.exp, before.hero.exp); assert.equal(s.hero.gold, before.hero.gold);
  assert.deepEqual(s.companions, before.companions); assert.equal(exact(s, 'hero').alive, true); roundtrip(s);
});

test('public retirement and actual child succession preserve the run but not a dead prior-generation roster identity', () => {
  let parent = optIn(adultFamily()); const oldCompanion = actual(parent, 'kest'); assert.ok(oldCompanion?.alive !== false);
  // Controlled current party only; the parent and adult child come from the
  // existing published played fixture, not a constructed family or lifetime.
  for (const p of parent.companions) p.recruited = p.active = p.id === 'kest';
  parent.rpg.companionStages.kest.status = 'available'; oldCompanion.hp = oldCompanion.maxHp;
  roundtrip(parent, 'existing parent with controlled current Kest party');
  let result = acceptedDeath(statusBoundary(captured(parent, 'kest'), 'kest'), 'kest');
  parent = command(result.s, 'retreat'); parent = settle(valid(E.resolveBattle(parent, parent.battle)));
  const oldId = exact(parent, 'kest').id, death = copy(parent.ironman.casualties[0]);
  parent = action(parent, 'retire'); assert.equal(parent.event.id, 'retirement');
  parent = valid(E.chooseEventOption(parent, 'settle')); assert.equal(parent.phase, 'retired');
  const before = copy(parent), heir = roundtrip(E.continueAsChild(parent, 'child-1'), 'actual public child successor');
  assert.deepEqual(parent, before); assert.equal(heir.dynasty.generation, parent.dynasty.generation + 1);
  assert.deepEqual(heir.ironman, parent.ironman); assert.notStrictEqual(heir.ironman, parent.ironman);
  assert.notStrictEqual(heir.ironman.casualties, parent.ironman.casualties); assert.notStrictEqual(heir.ironman.casualties[0], parent.ironman.casualties[0]);
  const historical = heir.lineage.people.find(p => p.id === oldId), regenerated = exact(heir, 'kest');
  assert.equal(historical.alive, false); assert.equal(historical.deathDay, death.day);
  assert.notEqual(regenerated.id, oldId); assert.equal(regenerated.alive, true); assert.equal(actual(heir, 'kest').alive, true);
  assert.ok(actual(heir, 'kest').hp > 0); assert.notEqual(heir.rpg.companionStages.kest.status, 'dead');
  assert.deepEqual(heir.ironman.casualties, [death]); assert.equal(heir.ironman.casualties.some(c => c.personId === regenerated.id), false);
});

test('metadata-absent Standard acceptance keeps ordinary downed/retreat semantics without creating an Ironman ledger', () => {
  let s = statusBoundary(captured(opening('rogue', false)));
  assert.equal(Object.hasOwn(s, 'ironman'), false); assert.equal(Object.hasOwn(s.battle, 'mortality'), false);
  s = command(s, 'attack', 'enemy-1'); assert.equal(actor(s, 'mira').hp, 0);
  assert.equal(actual(s, 'mira').alive !== false, true); assert.equal(actual(s, 'mira').recruited, true); assert.equal(exact(s, 'mira').alive, true);
  s = command(s, 'retreat'); s = valid(E.resolveBattle(s, s.battle));
  // One rulebook (v0.72.3): every life fights on the field, where a companion left lying in an abandoned
  // fight may die (battlecraft) through the family book; Standard still keeps no Ironman ledger.
  assert.equal(actual(s, 'mira').alive === false, exact(s, 'mira').alive === false, 'the roster and the family book agree');
  assert.equal(Object.hasOwn(s, 'ironman'), false); roundtrip(s, 'metadata-free Standard behavior');
});

test('a genuinely offered maze entry accepts an opening hero death before any playable continuation', () => {
  const base = mazeParty(); assert.equal(base.maze.version, 1);
  // Controlled saved Health/initiative and existing-room projections, not
  // earned travel, earned injuries or a route/balance claim. Unlike the forest
  // expedition's 12-HP gate, the real maze_fight offer admits this living hero.
  base.hero.hp = 1; base.hero.attributes.agility = 1;
  for (const p of base.companions.filter(p => p.recruited && p.active)) { p.hp = p.maxHp; p.agility = 1; }
  roundtrip(base, 'controlled one-HP living hero with full living allies');
  let selected = null;
  // Select only among this one fixed, already generated 121-room map. Native
  // opening turns are inspected detached; no predicted result is installed in
  // the engine, and no encounter, enemy plan, damage or outcome is fabricated.
  for (const room of mazeLayout(base.maze).cells.map(c => mazeRoomCell(base.maze, c.id)).filter(c => c.kind === 'enemy' && !c.contentSlot)) {
    const s = copy(base); s.maze.position = room.id; s.maze.previous = room.doors[0];
    s.maze.visited = [...new Set([...s.maze.visited, room.id, room.doors[0]])];
    roundtrip(s, 'controlled existing native opening room');
    const context = { kind: 'maze', mazeId: s.maze.id, roomId: String(room.id), locationId: s.maze.locationId };
    const before = copy(s), probe = createBattle(s, 'free_' + room.enemy, context);
    assert.deepEqual(s, before, 'native opening inspection remains detached');
    if (probe.outcome === 'ironman-death') { selected = s; break; }
  }
  assert.ok(selected, 'the fixed native maze has an actual hero-fatal opening against this controlled one-HP source');
  const selectedRoom = mazeRoomCell(selected.maze);
  const expectedContext = { kind: 'maze', mazeId: selected.maze.id, roomId: String(selectedRoom.id), locationId: selected.maze.locationId };
  const before = copy(selected), terminal = action(selected, 'maze_fight');
  assert.deepEqual(selected, before); assertTerminal(terminal);
  assert.equal(terminal.battle.encounterId, 'free_' + selectedRoom.enemy); assert.deepEqual(terminal.battle.context, expectedContext);
  assert.ok(terminal.battle.instanceId.startsWith('battle-')); assert.equal(terminal.day, before.day);
  assert.equal(terminal.hero.hp, 1, 'opening terminal is not settled into a hero-dead playable life');
  assert.deepEqual(terminal.ironman.casualties, []);
  assert.deepEqual(terminal.companions, before.companions, 'full living allies neither die nor rescue the terminal run');
  roundtrip(terminal, 'accepted internal opening terminal descriptor');
});

test('one accepted enemy wave applies two exact companion deaths atomically and idempotently', () => {
  let source = opening(); source = valid(E.recruitCompanion(source, 'orrin'), 'public second-companion recruitment');
  assert.equal(actual(source, 'orrin').active, true);
  let s = captured(source); const enemy = actor(s, 'enemy-1');
  // Controlled accepted captured plan/stats, not an earned encounter or damage
  // claim. One real wave command targets all three named, living party actors.
  enemy.planId = 'wolf'; enemy.planCycle = [{ action: 'wave', target: 'all_party', amount: 0 }];
  delete enemy.bossId; delete enemy.phasePlan;
  enemy.aiStep = 0; enemy.attackPower = 3; enemy.armor = 100; enemy.status = {};
  actor(s, 'hero').hp = actor(s, 'hero').maxHp;
  for (const id of ['mira', 'orrin']) { actor(s, id).hp = 1; actor(s, id).status = {}; }
  s.battle.currentActorId = 'hero';
  s.battle.turnOrder = ['hero', 'enemy-1', 'mira', 'orrin', ...s.battle.actors.filter(a => !['hero', 'enemy-1', 'mira', 'orrin'].includes(a.id)).map(a => a.id)];
  s.life.happiness = 70; s.life.stress = 20;
  roundtrip(s, 'controlled accepted two-companion wave boundary');
  const before = copy(s), next = command(s, 'attack', 'enemy-1');
  assert.deepEqual(s, before); assert.ok(actor(next, 'hero').hp > 0); assert.notEqual(next.battle.outcome, 'ironman-death');
  const death = { day: before.day, battleId: before.battle.instanceId, generation: before.dynasty.generation };
  const ids = ['mira', 'orrin'].map(id => exact(before, id).id);
  assert.deepEqual(next.ironman.casualties, ids.map(personId => ({ personId, ...death })));
  assert.deepEqual(next.battle.mortality.deaths.map(d => d.personId), ids);
  for (const id of ['mira', 'orrin']) {
    assertDead(next, id, death); assert.equal(actor(next, id).hp, 0);
    assert.equal(deathView(next, id).grief.length, 1); assert.equal(deathView(next, id).deathJournal.length, 1);
  }
  assert.equal(next.life.happiness, 50); assert.equal(next.life.stress, 40);
  const effects = ['mira', 'orrin'].map(id => deathView(next, id));
  const repeated = command(next, 'potion', 'mira');
  assert.equal(repeated.battle.potions, next.battle.potions);
  assert.deepEqual(['mira', 'orrin'].map(id => deathView(repeated, id)), effects);
  roundtrip(repeated, 'both immediately applied wave casualties remain exact and valid');
});

test('a second genuinely offered battle excludes the exact dead companion and keeps the original casualty', () => {
  let s = opening('mage');
  // Controlled existing forest location and first-opening Health/initiative,
  // not earned travel or balance evidence. Both battle entries below use the
  // actual displayed forest_expedition command and its native opening turns.
  s.locationId = 'forest'; s.cartography.interior = null; syncCartography(s);
  s.hero.attributes.agility = 1; actual(s, 'mira').agility = 1; actual(s, 'mira').hp = 1;
  roundtrip(s, 'controlled first native expedition source'); s = action(s, 'forest_expedition');
  const firstBattleId = s.battle.instanceId, deadId = exact(s, 'mira').id;
  const death = { day: s.day, battleId: firstBattleId, generation: s.dynasty.generation };
  assertDead(s, 'mira', death);
  s = command(s, 'retreat'); s = settle(valid(E.resolveBattle(s, s.battle)));
  roundtrip(s, 'settled actual first expedition casualty');
  const before = copy(s), effects = deathView(s); s = action(s, 'forest_expedition');
  assert.notEqual(s.battle.instanceId, firstBattleId); assert.ok(s.day > before.day);
  assert.equal(s.battle.actors.some(a => a.id === 'mira'), false);
  assert.equal(s.battle.mortality.participants.some(p => p.actorId === 'mira' || p.personId === deadId), false);
  assert.deepEqual(s.battle.mortality.deaths, []); assert.ok(actor(s, 'hero').hp > 0);
  assertDead(s, 'mira', death); assert.deepEqual(deathView(s), effects);
  roundtrip(s, 'new native battle excludes the previous exact-person casualty');
});
