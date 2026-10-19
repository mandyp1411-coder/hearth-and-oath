// Composed SOURCE-CAPTURE regression cases, not an earned whole-life or balance
// certification. Run only in the coordinated engine lane after runtime edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResearchAction, researchActions } from '../dist/js/research-runtime.js';
import { startRepertoireRehearsal, repertoireReason } from '../dist/js/repertoire.js';
import { applyRepertoireAction, repertoireActions } from '../dist/js/repertoire-gameplay.js';
import { applyCountingTableAction, countingTableActions } from '../dist/js/counting-table-job.js';
import { applyTournamentAction, tournamentActions } from '../dist/js/adult-tournament.js';
import { personalNoteRows, reviewPersonalNote } from '../dist/js/personal-notes.js';
import { propertyAlreadyTaken } from '../dist/js/silver-property.js';
import { childRecord } from './helpers/story-life-fixtures.mjs';
import {
  E, copy, valid, roundtrip, act, walk, pieceId,
  captureClaimsTournamentBase, capturePreparedClaim, captureClaimOpportunity,
  captureClaimProject, captureResearchProject, captureRepertoireProject,
  captureLockedTournament, capturePausedTournament, captureCombinedSuccessorParent,
} from './helpers/claims-tournament-fixtures.mjs';

const withoutNotice = s => ({ ...s, notice: '' });
const neverAttend = { spendDays() { assert.fail('an excluded command must not enter the calendar'); } };
function offered(s, id) {
  const row = E.getActions(s).find(a => a.id === id);
  assert.ok(row && !row.disabledReason, `${id}: ${row?.disabledReason || s.notice}`);
  return row;
}
function rejected(s, id) {
  const before = copy(s), next = E.chooseAction(s, id);
  assert.deepEqual(s, before, 'the refused command leaves its original input exact');
  assert.deepEqual(withoutNotice(next), withoutNotice(before), `${id} changes only the refusal notice`);
  return roundtrip(next);
}
function leafReject(s, run, label) {
  const detached = copy(s), before = copy(detached);
  assert.equal(run(detached), false, label);
  assert.deepEqual(detached, before, label + ' has no detached side effect');
}
function controlledRoom(s, roomId) {
  // A detached valid room projection isolates an ownership condition from an
  // unrelated room requirement. This is not a claim of walking while locked.
  const next = copy(s);
  next.cartography.interior = { siteId: next.locationId, roomId };
  return roundtrip(valid(next, 'controlled room projection for an exclusion antecedent'));
}
const ownProject = (kind, base) => kind === 'research' ? captureResearchProject(base) : captureRepertoireProject(base);
const cancelOwn = kind => kind === 'research' ? 'research_cancel' : 'repertoire_cancel';

test('accepted counting-table plans and genuinely paused cards leave ordinary care, research and private rehearsal unlocked', () => {
  const base = capturePausedTournament(), before = copy(base);
  assert.equal(base.justice.countingTableJob.status, 'active');
  assert.equal(base.justice.countingTableJob.stage, 'preparation');
  assert.equal(base.justice.countingTableJob.attempt, null);
  assert.equal(base.researchPortfolio.runs[0].status, 'active');
  assert.equal(base.researchPortfolio.project, null);
  assert.equal(base.adultTournament.paidDays, 1);
  assert.equal(E.getLifeCommitment(base), null);
  assert.equal(repertoireReason(base), null);
  assert.ok(repertoireActions(base).some(a => a.id === `repertoire_rehearse_${pieceId(base)}_solo` && !a.disabledReason));
  const care = ['health_rest', 'life_rest'].map(id => E.getActions(base).find(a => a.id === id && !a.disabledReason)).find(Boolean);
  assert.ok(care && care.days > 0, 'a real ordinary paid-in-time care action is enabled');
  let cared = act(copy(base), care.id);
  assert.ok(cared.day > base.day);
  assert.deepEqual(cared.justice.countingTableJob, base.justice.countingTableJob);
  assert.deepEqual(cared.adultTournament, base.adultTournament);
  roundtrip(cared);
  let research = walk(copy(base), 'homes'), day = research.day;
  offered(research, 'research_copy_axle_rubbing');
  research = act(research, 'research_copy_axle_rubbing');
  assert.equal(research.day, day + 1);
  assert.equal(research.researchPortfolio.runs[0].copies.length, 1);
  assert.equal(research.researchPortfolio.project, null);
  assert.deepEqual(research.justice.countingTableJob, base.justice.countingTableJob);
  assert.deepEqual(research.adultTournament, base.adultTournament);
  roundtrip(research);
  let rehearsal = copy(base); day = rehearsal.day;
  rehearsal = act(rehearsal, `repertoire_rehearse_${pieceId(rehearsal)}_solo`);
  assert.equal(rehearsal.day, day + 1);
  assert.equal(rehearsal.repertoire.project, null);
  assert.equal(rehearsal.repertoire.pieces[0].rehearsal.attendedDays, 1);
  assert.deepEqual(rehearsal.justice.countingTableJob, base.justice.countingTableJob);
  assert.deepEqual(rehearsal.adultTournament, base.adultTournament);
  roundtrip(rehearsal);
  assert.deepEqual(base, before, 'independent public branches never change the common source');
});

test('a saved successful approach opportunity is still a freely deferred plan, not a hidden attendance lock', () => {
  const base = captureClaimOpportunity(), before = copy(base), day = base.day;
  assert.equal(base.justice.countingTableJob.attempt.approach.succeeded, true);
  assert.equal(base.justice.countingTableJob.attempt.departure, null);
  assert.equal(base.justice.takenProperties.includes(base.justice.countingTableJob.target.id), false);
  assert.equal(base.adventuring.loot.some(l => l.propertyId === base.justice.countingTableJob.target.id), false);
  assert.equal(E.getLifeCommitment(base), null);
  let s = walk(copy(base), 'homes');
  s = act(s, 'research_copy_axle_rubbing');
  assert.equal(s.day, day + 1);
  assert.deepEqual(s.justice.countingTableJob, before.justice.countingTableJob);
  assert.deepEqual(s.adultTournament, before.adultTournament);
  assert.equal(s.researchPortfolio.runs[0].copies.length, 1);
  roundtrip(s);
  assert.deepEqual(base, before);
});

for (const kind of ['research', 'repertoire']) test(`actual interrupted ${kind} attendance excludes otherwise-enabled counting approach and card resumption in both public and leaf reducers`, () => {
  const prepared = capturePreparedClaim(), original = ownProject(kind, prepared);
  assert.equal(E.getLifeCommitment(original).kind, kind);
  assert.ok(E.getActions(original).every(a => a.id.startsWith(kind + '_')));
  const atMarket = controlledRoom(original, 'market');
  const claimControl = act(copy(atMarket), cancelOwn(kind));
  offered(claimControl, 'justice_job_approach');
  assert.ok(countingTableActions(claimControl).some(a => a.id === 'justice_job_approach' && !a.disabledReason));
  rejected(atMarket, 'justice_job_approach');
  leafReject(atMarket, s => applyCountingTableAction(s, 'justice_job_approach', neverAttend), '32 approach cannot steal the 30/31 calendar');
  const claimed = act(claimControl, 'justice_job_approach');
  assert.equal(claimed.day, claimControl.day + 1);
  assert.equal(claimed.justice.countingTableJob.attempt.approach.succeeded, true);
  roundtrip(claimed);
  const atWatch = controlledRoom(original, 'watch');
  const cardControl = act(copy(atWatch), cancelOwn(kind));
  offered(cardControl, 'tournament_resume');
  assert.ok(tournamentActions(cardControl).some(a => a.id === 'tournament_resume' && !a.disabledReason));
  rejected(atWatch, 'tournament_resume');
  leafReject(atWatch, s => applyTournamentAction(s, 'tournament_resume', neverAttend), '33 resume cannot steal the 30/31 calendar');
  const resumed = act(cardControl, 'tournament_resume');
  assert.equal(resumed.day, cardControl.day);
  assert.equal(resumed.adultTournament.stage, 'ready');
  assert.equal(resumed.adultTournament.paidDays, 1);
  roundtrip(resumed);
  roundtrip(original);
});

const ownerCaptures = [
  ['counting approach', () => captureClaimProject(), 'justice_job', 'justice_job_withdraw'],
  ['counting departure', () => captureClaimProject(undefined, { stage: 'departure' }), 'justice_job', 'justice_job_withdraw'],
  ['tournament preparation', () => captureClaimsTournamentBase({ tournament: 'preparing' }), 'tournament', 'tournament_suspend'],
  ['tournament ready card', () => captureLockedTournament(), 'tournament', 'tournament_suspend'],
];
for (const [label, capture, owner, release] of ownerCaptures) test(`actual ${label} excludes research/repertoire start and stale continue without changing any other saved system`, () => {
  const s = capture(), before = copy(s);
  assert.equal(E.getLifeCommitment(s).kind, owner);
  assert.ok(E.getActions(s).every(a => a.id.startsWith(owner + '_')));
  assert.deepEqual(researchActions(s), []);
  assert.deepEqual(repertoireActions(s), []);
  assert.equal(repertoireReason(s), 'Finish your current commitment first.');
  for (const id of ['research_copy_axle_rubbing', 'research_continue', `repertoire_rehearse_${pieceId(s)}_solo`, 'repertoire_continue']) rejected(s, id);
  leafReject(s, n => applyResearchAction(n, 'research_copy_axle_rubbing', neverAttend), '30 start');
  leafReject(s, n => applyResearchAction(n, 'research_continue', neverAttend), '30 stale continue');
  leafReject(s, n => applyRepertoireAction(n, 'repertoire_continue', neverAttend), '31 stale continue');
  const detached = copy(s);
  assert.equal(startRepertoireRehearsal(detached, pieceId(s), 'solo').ok, false);
  assert.deepEqual(detached, s);
  // A genuine public withdrawal/suspension proves that existing accepted30
  // authority and the exact31 manuscript are independently usable afterwards.
  const free = act(copy(s), release);
  assert.equal(E.getLifeCommitment(free), null);
  let research = walk(copy(free), 'homes'), day = research.day;
  offered(research, 'research_copy_axle_rubbing');
  research = act(research, 'research_copy_axle_rubbing');
  assert.equal(research.day, day + 1);
  assert.equal(research.researchPortfolio.runs[0].copies.length, 1);
  roundtrip(research);
  let rehearsal = copy(free); day = rehearsal.day;
  rehearsal = act(rehearsal, `repertoire_rehearse_${pieceId(rehearsal)}_solo`);
  assert.equal(rehearsal.day, day + 1);
  assert.equal(rehearsal.repertoire.pieces[0].rehearsal.attendedDays, 1);
  roundtrip(rehearsal);
  assert.deepEqual(s, before);
});

const fieldFor = { research: 'researchPortfolio', repertoire: 'repertoire', claim: 'justice', tournament: 'adultTournament' };
function releaseCapturedOwner(s, kind, base) {
  if (kind === 'research') s.researchPortfolio.project = null;
  else if (kind === 'repertoire') s.repertoire.project = null;
  else if (kind === 'claim') s.justice = copy(base.justice);
  else s.adultTournament = copy(base.adultTournament);
  return s;
}
function lockedReducer(s, kind) {
  if (kind === 'research') return n => applyResearchAction(n, 'research_continue', neverAttend);
  if (kind === 'repertoire') return n => applyRepertoireAction(n, 'repertoire_continue', neverAttend);
  if (kind === 'claim') return n => applyCountingTableAction(n, 'justice_job_continue', neverAttend);
  const id = s.adultTournament.stage === 'preparing' ? 'tournament_prepare' : 'tournament_bout_' + s.adultTournament.results.length;
  return n => applyTournamentAction(n, id, neverAttend);
}

test('whole-save validation rejects every captured double-owner pair without normalizing either project into progress', () => {
  const base = captureClaimsTournamentBase();
  const states = [
    ['research', captureResearchProject(base)], ['repertoire', captureRepertoireProject(base)],
    ['claim', captureClaimProject(base)], ['claim', captureClaimProject(base, { stage: 'departure' })],
    ['tournament', captureLockedTournament(base)], ['tournament', captureClaimsTournamentBase({ tournament: 'preparing' })],
  ];
  const snapshots = states.map(([, s]) => copy(roundtrip(s)));
  // Continue has a real, enabled, captured project/card antecedent in each
  // independent valid save, unlike a merely forged continuation ID.
  for (const [kind, s] of states) {
    const id = kind === 'research' ? 'research_continue' : kind === 'repertoire' ? 'repertoire_continue' : kind === 'claim' ? 'justice_job_continue' : s.adultTournament.stage === 'preparing' ? 'tournament_prepare' : 'tournament_bout_0';
    offered(s, id);
    const before = copy(s), continued = act(copy(s), id);
    if (kind === 'research') {
      assert.equal(continued.day, s.day + 1);
      assert.equal(continued.researchPortfolio.project, null);
      assert.equal(continued.researchPortfolio.runs[0].copies.length, 1);
    } else if (kind === 'repertoire') {
      assert.equal(continued.day, s.day + 1);
      assert.equal(continued.repertoire.project, null);
      assert.equal(continued.repertoire.pieces[0].rehearsal.attendedDays, 1);
    } else if (kind === 'claim') {
      assert.equal(continued.day, s.day + 1);
      assert.equal(continued.justice.countingTableJob.stage, s.justice.countingTableJob.stage === 'approach' ? 'opportunity' : 'closed');
      assert.equal(continued.justice.countingTableJob.attempt[s.justice.countingTableJob.stage].succeeded, true);
    } else if (s.adultTournament.stage === 'preparing') {
      assert.equal(continued.day, s.day + 1);
      assert.equal(continued.adultTournament.paidDays, 1);
      assert.equal(continued.adultTournament.stage, 'ready');
    } else {
      assert.equal(continued.day, s.day);
      assert.equal(continued.battle.context.kind, 'tournament');
      assert.equal(continued.adultTournament.stage, 'bout');
    }
    roundtrip(continued);
    assert.deepEqual(s, before);
  }
  for (let i = 0; i < states.length; i++) for (let j = i + 1; j < states.length; j++) {
    const [a, left] = states[i], [b, right] = states[j];
    if (a === b) continue;
    const bad = copy(left.day >= right.day ? left : right);
    bad[fieldFor[a]] = copy(left[fieldFor[a]]);
    bad[fieldFor[b]] = copy(right[fieldFor[b]]);
    // Each removal yields a wholly valid, byte-exact reload. Thus the failing
    // composition is specifically simultaneous ownership, not stale dates,
    // missing sources, absent NPCs, a changed target or unrelated malformed data.
    roundtrip(releaseCapturedOwner(copy(bad), a, base));
    roundtrip(releaseCapturedOwner(copy(bad), b, base));
    const before = copy(bad);
    assert.equal(E.validateSave(bad), false, `${a}/${b} double-owner save`);
    assert.equal(E.migrateSave(copy(bad)), null, `${a}/${b} must not silently drop a project`);
    assert.deepEqual(bad, before);
    // Defense in depth on rejected untrusted double-owner snapshots: both
    // actual continuation reducers reject before touching calendar/resources.
    leafReject(bad, lockedReducer(bad, a), `${a} continue behind ${b}`);
    leafReject(bad, lockedReducer(bad, b), `${b} continue behind ${a}`);
  }
  states.forEach(([, s], i) => assert.deepEqual(s, snapshots[i]));
});

test('one genuine public successor composes own adult life, closed100-note book, nonempty maze/receipts and world claims without parent-private authority or guilt', () => {
  const parent = captureCombinedSuccessorParent(), original = copy(parent);
  const own = copy(childRecord(parent).adultLife), target = copy(parent.justice.countingTableJob.target);
  const notes = copy(parent.playerNotes), maze = copy(parent.mazeBook), journal = copy(parent.journal);
  assert.equal(own.work.trainingDays, 14);
  assert.ok(own.residence);
  assert.equal(notes.length, 100);
  assert.equal(notes[0].archived, true);
  assert.ok(notes.every(n => n.ownerId === parent.dynasty.activePersonId));
  assert.ok(maze.records.length > 0 && maze.expeditionReceipts.length > 0);
  assert.equal(parent.researchPortfolio.runs[0].finalization.audience, 'private');
  assert.ok(parent.researchPortfolio.runs[0].finalization.recipientId);
  assert.equal(parent.repertoire.pieces[0].privacy, 'private');
  assert.ok(parent.repertoire.pieces[0].rehearsal);
  assert.equal(parent.adultTournament.stage, 'finished');
  assert.equal(parent.adultTournament.results.length, 1);
  assert.ok(parent.adultTournament.recognition?.personId);
  assert.equal(parent.adultTournament.recognition.consumedDay, null);
  assert.equal(parent.justice.countingTableJob.status, 'completed');
  assert.ok(parent.justice.takenProperties.includes(target.id));
  assert.ok(parent.legal.incidents.length && parent.legal.evidence > 0, 'positive, explicitly controlled parent guilt antecedent');
  const heir = roundtrip(E.continueAsChild(parent, 'child-1'));
  assert.deepEqual(parent, original, 'the actual public successor never mutates the closed parent');
  assert.equal(heir.dynasty.generation, parent.dynasty.generation + 1);
  assert.equal(heir.day, parent.day);
  assert.equal(heir.locationId, own.residence.locationId);
  assert.equal(heir.hero.profession, 'Blacksmith');
  assert.deepEqual(heir.hero.upbringing.adultLife, own);
  assert.deepEqual(heir.hero.skills, childRecord(parent).development.skills);
  assert.equal(heir.careers.records.Blacksmith.workedDays, 14);
  assert.equal(heir.careers.records.Blacksmith.paidWorkedDays, 0);
  assert.equal(heir.careers.records.Blacksmith.earnedGold, 0);
  assert.equal(heir.careers.records.Blacksmith.mastery, 0);
  const closed = heir.dynasty.history.find(h => h.personId === parent.dynasty.activePersonId);
  assert.deepEqual(closed.personalNotes, notes);
  assert.deepEqual(heir.playerNotes, []);
  const inheritedRows = personalNoteRows(heir).filter(n => n.ownerId === parent.dynasty.activePersonId);
  assert.equal(inheritedRows.length, 100);
  assert.ok(inheritedRows.every(n => !n.own && reviewPersonalNote(heir, n.key) === null));
  assert.equal(heir.researchPortfolio, undefined);
  assert.equal(heir.repertoire, undefined);
  assert.equal(heir.adultTournament, undefined, 'no inherited card or personal rival recognition');
  assert.deepEqual(heir.legal.incidents, []);
  assert.equal(heir.legal.evidence, 0);
  assert.equal(heir.legal.wanted, false);
  assert.equal(heir.justice.prison, null);
  assert.equal(heir.justice.arrest, null);
  assert.equal(heir.justice.countingTableJob, undefined);
  assert.equal(heir.justice.countingTableOffer, undefined);
  assert.deepEqual(heir.justice.takenProperties, parent.justice.takenProperties);
  assert.notEqual(heir.justice.takenProperties, parent.justice.takenProperties);
  assert.equal(propertyAlreadyTaken(heir, target.id), true);
  assert.deepEqual(heir.mazeBook.records, maze.records);
  assert.deepEqual(heir.mazeBook.expeditionReceipts, maze.expeditionReceipts);
  assert.notEqual(heir.mazeBook.records, parent.mazeBook.records);
  assert.notEqual(heir.mazeBook.expeditionReceipts, parent.mazeBook.expeditionReceipts);
  assert.deepEqual(heir.journal.slice(0, journal.length), journal);
  const written = roundtrip(E.keepPlayerNote(heir, 'A separate heir reminder Ω'));
  assert.equal(written.playerNotes.length, 1, 'the closed100-note book takes none of the heir capacity');
  assert.equal(written.playerNotes[0].id, 'note-1');
  assert.equal(written.playerNotes[0].ownerId, heir.dynasty.activePersonId);
  assert.equal(written.playerNotes[0].generation, heir.dynasty.generation);
  assert.deepEqual(written.dynasty.history, heir.dynasty.history);
  const ownRow = personalNoteRows(written).find(n => n.own);
  assert.ok(reviewPersonalNote(written, ownRow.key));
  written.justice.takenProperties.push('controlled-distinct-future-world-claim');
  assert.deepEqual(parent, original, 'mutating the returned claim clone cannot rewrite the parent');
  assert.deepEqual(heir.justice.takenProperties, original.justice.takenProperties, 'the earlier returned heir is detached too');
});

test('malformed world claims refuse the same fully composed public successor and preserve its original private archives exactly', () => {
  const parent = captureCombinedSuccessorParent();
  for (const claims of [null, [123], ['x'.repeat(241)], Array.from({ length: 201 }, (_, i) => 'claim-' + i)]) {
    const bad = copy(parent);
    bad.justice.takenProperties = claims;
    assert.equal(E.validateSave(bad), false);
    const before = copy(bad), next = E.continueAsChild(bad, 'child-1');
    assert.equal(next.notice, 'That child cannot continue this family story.');
    assert.deepEqual(next, { ...before, notice: next.notice }, 'no partial heir, repaired claim array or rewritten archive escapes');
    assert.deepEqual(bad, before, 'the malformed original is neither changed nor repaired');
    assert.notEqual(next, bad);
    assert.notEqual(next.justice, bad.justice);
    assert.notEqual(next.dynasty.history, bad.dynasty.history);
    if (Array.isArray(claims)) assert.notEqual(next.justice.takenProperties, bad.justice.takenProperties);
  }
  roundtrip(parent);
});
