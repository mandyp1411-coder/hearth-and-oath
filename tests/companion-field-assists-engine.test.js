import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { mazeLayout, mazeRoomCell, mazeFieldAssistRuntime } from '../dist/js/maze-v31.js';
import { validateMazeFieldAssists, validateMazeFieldAssistReceipt } from '../dist/js/companion-field-assists.js';
import { validateExpeditionReceipts, expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { genericMazeInscriptionNote } from '../dist/js/maze-inscription-note.js';
import { copy, valid, roundtrip, action, atGeneric, select, roomFixture, realParent, unchangedExceptNotice } from './helpers/companion-field-fixtures.mjs';
const rules = { validateFieldAssist: validateMazeFieldAssistReceipt };

for (const [kind, helperId] of [['scout', 'kest'], ['protector', 'mira'], ['scholar', 'orrin'], ['healer', 'sable']]) test(`actual ${kind} public action matches exact quote, records once and round-trips`, () => {
  const s = roomFixture(kind), before = copy(s), a = select(s, kind, helperId), q = E.fieldAssistQuote(s, kind, helperId); assert.equal(q.disabledReason, null); assert.deepEqual(s, before);
  const next = roundtrip(E.chooseAction(s, a.id)), helper = next.companions.find(p => p.id === helperId); assert.deepEqual(s, before);
  assert.equal(next.day, s.day); assert.equal(next.hero.hp, q.targetHpAfter); assert.equal(next.hero.mp, q.targetFocusAfter); assert.equal(helper.mp, q.helperFocusAfter); assert.equal(next.flags.herbs, s.flags.herbs - q.herbCost);
  assert.equal(next.hero.potions, s.hero.potions); assert.equal(next.hero.gold, s.hero.gold); assert.equal(next.hero.exp, s.hero.exp); assert.deepEqual(next.hero.skills, s.hero.skills); assert.deepEqual(next.cartography, s.cartography); assert.deepEqual(next.equipment, s.equipment); assert.deepEqual(mazeLayout(next.maze), mazeLayout(s.maze)); assert.deepEqual(next.maze.visited, s.maze.visited);
  const row = next.maze.fieldAssists.entries[0]; assert.equal(row.helperPerson.name, helper.name); assert.equal(row.helperPerson.personId, next.lineage.people.find(p => p.source === 'companion' && p.localId === helperId).id); assert.equal(row.visitId, next.maze.expeditionVisit.id);
  assert.deepEqual(next.maze.expeditionVisit.assists, [row]); assert.equal(expeditionVisitTotals(next.maze.expeditionVisit).companionFocusUsed, q.focusCost); assert.equal(expeditionVisitTotals(next.maze.expeditionVisit).costs.herbs, q.herbCost); assert.ok(validateExpeditionReceipts(next, rules));
  assert.equal(next.journal.filter(j => j.title === 'Companion Field Help').length, s.journal.filter(j => j.title === 'Companion Field Help').length + 1);
  if (kind === 'scholar') { assert.equal((next.playerNotes?.length || 0), Math.min(100, (s.playerNotes?.length || 0) + 1)); assert.equal(next.journal.filter(j => j.title === 'A Note from Below').length, s.journal.filter(j => j.title === 'A Note from Below').length + 1); const note = next.journal.findLast(j => j.title === 'A Note from Below'); assert.equal(note.text, genericMazeInscriptionNote(mazeRoomCell(s.maze)).text); assert.equal(note.narrativeEdition, 30); }
  unchangedExceptNotice(E.chooseAction(next, a.id), next);
});

test('normal inscription reading retains the exact same note and zero-day/no-Scholarship semantics', () => {
  const s = roomFixture('scholar'), assisted = action(s, select(s, 'scholar', 'orrin').id), ordinary = action(s, 'maze_read');
  assert.deepEqual(assisted.playerNotes, ordinary.playerNotes); assert.equal(ordinary.day, s.day); assert.equal(assisted.day, s.day); assert.deepEqual(ordinary.hero.skills, s.hero.skills); assert.deepEqual(assisted.hero.skills, s.hero.skills);
  assert.equal(ordinary.maze.fieldAssists, undefined); assert.equal(ordinary.maze.expeditionVisit.assists, undefined); assert.equal(ordinary.companions.find(p => p.id === 'orrin').mp, s.companions.find(p => p.id === 'orrin').mp);
});

test('rejected stale/no-op helper commands never initialize observation or help metadata', () => {
  for (const change of [s => s.companions.find(p => p.id === 'mira').mp = 3, s => s.companions.find(p => p.id === 'mira').active = false,
    s => { const a = s.rpg.companionStages.mira; a.status = 'away'; a.awayUntil = s.day + 28; }, s => s.hero.hp = 1]) {
    const s = roomFixture('protector'), id = select(s, 'protector', 'mira').id; delete s.maze.expeditionVisit; change(s); valid(s); const before = copy(s), next = E.chooseAction(s, id);
    unchangedExceptNotice(next, before); assert.equal(next.maze.expeditionVisit, undefined); assert.equal(next.maze.fieldAssists, undefined); assert.deepEqual(next.mazeBook, before.mazeBook);
  }
});

test('a legacy unobserved visit begins from actual pre-help resources only after accepted use', () => {
  const s = roomFixture('healer'); delete s.maze.expeditionVisit; roundtrip(s); const q = E.fieldAssistQuote(s, 'healer', 'sable');
  const next = action(s, select(s, 'healer', 'sable').id); assert.equal(next.maze.expeditionVisit.coverage, 'observed'); assert.equal(next.maze.expeditionVisit.start.health, s.hero.hp); assert.equal(next.maze.expeditionVisit.start.focus, s.hero.mp); assert.equal(next.maze.expeditionVisit.assists[0].helper.mp, q.helperFocus); assert.equal(next.maze.expeditionVisit.assists[0].herbsBefore, s.flags.herbs); roundtrip(next);
});

test('an old action selector cannot spend another room’s shared slot after movement', () => {
  const s = roomFixture('scout'), old = select(s, 'scout', 'kest'), cell = s.maze.position; atGeneric(s, 'trap', [cell]);
  const current = select(s, 'scout', 'kest'); assert.notEqual(current.id, old.id); const before = copy(s); unchangedExceptNotice(E.chooseAction(s, old.id), before); assert.equal(s.maze.fieldAssists, undefined);
});

test('v2 contentSlot excludes all assists and retains its attended story choices', () => {
  const s = realParent(), anchor = s.maze.content.anchors[0]; s.maze.position = anchor.cellId; s.maze.visited = [...new Set([...s.maze.visited, anchor.cellId])]; roundtrip(s); assert.ok(mazeRoomCell(s.maze).contentSlot);
  const before = copy(s); assert.equal(E.getActions(s).some(a => a.id.startsWith('maze_assist_')), false); assert.ok(E.fieldAssistQuote(s, 'scout', 'kest').disabledReason); assert.deepEqual(s, before); assert.equal(s.maze.fieldAssists, undefined);
});

test('real public retirement/succession keeps the old person’s physical slot and receipt, not the regenerated helper', () => {
  let parent = realParent(); const oldAction = select(parent, 'scout', 'kest'), parentName = parent.companions.find(p => p.id === 'kest').name;
  parent = action(parent, oldAction.id); const original = copy(parent.maze.fieldAssists.entries[0]), usedCell = parent.maze.position;
  parent.maze.position = 0; parent.maze.previous = 0; parent = action(parent, 'maze_exit'); parent = E.chooseAction(parent, 'retire'); assert.equal(parent.event.id, 'retirement');
  parent = valid(E.chooseEventOption(parent, 'settle')); assert.equal(parent.phase, 'retired'); const before = copy(parent), heir = roundtrip(E.continueAsChild(parent, 'child-1')); assert.deepEqual(parent, before);
  assert.equal(heir.dynasty.generation, 2); const regenerated = heir.companions.find(p => p.id === 'kest'); assert.notEqual(regenerated.name, parentName); assert.deepEqual(heir.rpg.companionStages.kest.trainedTechniques || [], []);
  const physical = heir.mazeBook.records.find(m => m.seed === original.runSeed); assert.deepEqual(physical.fieldAssists.entries, [original]); assert.equal(physical.fieldAssists.entries[0].helperPerson.name, parentName);
  assert.ok(validateMazeFieldAssists(heir, physical, mazeFieldAssistRuntime(heir))); assert.equal(heir.mazeBook.expeditionReceipts.find(r => r.id === original.visitId).assists[0].helperPerson.name, parentName);
  for (const p of heir.companions) p.active = p.recruited = p.id === 'kest'; regenerated.hp = regenerated.maxHp; regenerated.mp = regenerated.maxMp; heir.rpg.companionStages.kest.status = 'available';
  assert.equal(heir.locationId, physical.locationId, 'the actual successor returns to the retained native source settlement');
  const reentryId = 'rpg_enter_' + physical.sourceId; assert.ok(E.getActions(valid(heir)).some(a => a.id === reentryId && !a.disabledReason));
  let resumed = action(heir, reentryId); resumed.maze.position = usedCell; roundtrip(resumed); assert.ok(E.fieldAssistQuote(resumed, 'scout', 'kest').disabledReason);
  resumed = atGeneric(resumed, 'trap', [usedCell]); resumed.hero.attributes.agility = 6; resumed.hero.skills.survival = 8 + 2 * resumed.maze.tier - 7; valid(resumed);
  unchangedExceptNotice(E.chooseAction(resumed, oldAction.id), resumed); const fresh = select(resumed, 'scout', 'kest'); assert.notEqual(fresh.id, oldAction.id);
  const used = action(resumed, fresh.id), newest = used.maze.fieldAssists.entries.at(-1); assert.equal(newest.actorGeneration, 2); assert.equal(newest.helperPerson.name, regenerated.name); assert.notEqual(newest.helperPerson.personId, original.helperPerson.personId); assert.equal(newest.mastery, null); assert.deepEqual(used.maze.fieldAssists.entries[0], original); roundtrip(used);
});
