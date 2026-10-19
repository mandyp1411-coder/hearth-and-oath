// SOURCE-CAPTURE FIXTURES, not an earned lifetime or civilian-route balance proof.
// Existing-save locations/home access and the same-day deadline are explicitly
// controlled. Work, card attendance, bout resolution, property and retirement
// are captured through public commands. No mutation is repaired by migration:
// validateSave must accept it before the exact whole-save roundtrip is checked.
import assert from 'node:assert/strict';
import * as E from '../../dist/js/engine.js';
import { syncCartography } from '../../dist/js/cartography.js';
import { settlementServices } from '../../dist/js/world-services.js';
import { regionAt } from '../../dist/js/realm.js';
import { makeCountingTableCase, countingTableRiskQuote, countingTableRolls } from '../../dist/js/counting-table-case.js';
import { personalNoteRows, reviewPersonalNote } from '../../dist/js/personal-notes.js';
import { settle, prepare } from './counting-table-engine.mjs';
import {
  copy, valid, roundtrip, freshStory, act, pick, walk, acceptResearch, draft,
  pieceId, deadline, pauseDeadline, adultFamily, introduceFamily, childRecord,
  calendarYear, researchFinished, archiveVisit,
} from './story-life-fixtures.mjs';
export { E, copy, valid, roundtrip, act, pick, walk, pieceId };

function controlledSite(source, locationId, { homeAnchor = false } = {}) {
  const s = copy(source);
  assert.ok(s.world.locations.some(p => p.id === locationId));
  s.locationId = locationId;
  if (homeAnchor) s.hero.birthplaceId = locationId;
  s.cartography.interior = { siteId: locationId, roomId: 'gate' };
  syncCartography(s);
  valid(s, 'controlled existing-site/home-access projection');
  // The projection is already valid. A real zero-day room command now lets
  // afterAction adopt this site's public roster (including its Animal Keeper);
  // migration is never used to fill missing sidecars after a fixture change.
  const next = act(s, 'atlas_room_market');
  assert.equal(next.day, s.day);
  return roundtrip(next);
}

function acceptSuccessfulClaim(source, { homeAnchor = false, prepareStories = false } = {}) {
  for (const place of source.world.locations.filter(p =>
    source.realm.sites[p.id]?.regionId === 'bellwater' && source.realm.sites[p.id].merchant &&
    ['village', 'city', 'camp'].includes(p.type) && !['destroyed', 'evacuated'].includes(p.status))) {
    let s = controlledSite(source, place.id, { homeAnchor });
    if (prepareStories) s = draft(acceptResearch(s));
    s = walk(s, 'market');
    const offered = E.getActions(s).find(a => a.id === 'justice_job_open' && !a.disabledReason);
    if (!offered) continue;
    const rows = settlementServices(s);
    for (const method of ['stealth', 'social']) {
      const run = makeCountingTableCase(s, { method,
        merchantService: rows.find(r => r.kind === 'merchant' && r.subjectId === 'market'),
        quietTableService: rows.find(r => r.kind === 'faction' && r.subjectId === 'quiet_table') });
      if (!run) continue;
      const quote = countingTableRiskQuote(s, run, { enforcement: regionAt(s).law.enforcement });
      const rolls = countingTableRolls(s, run);
      // Selection only, never a seed/stat/roll change. The exact accepted day,
      // original owner and ordinary source stats determine both saved phases.
      if (rolls.entry >= quote.entryChance || rolls.escape >= quote.escapeChance || rolls.witness < quote.witnessChance) continue;
      const day = s.day;
      s = act(s, 'justice_job_open');
      assert.equal(s.event.id, 'justice_counting_offer');
      s = pick(s, 'accept_' + method);
      assert.equal(s.day, day);
      assert.deepEqual(s.justice.countingTableJob, run, 'public acceptance captures the selected exact case');
      return roundtrip(s);
    }
  }
  throw Error('No actual existing Bellwater merchant supplies a successful unwitnessed controlled source capture.');
}

function enterTournament(source, { interrupt = false } = {}) {
  let s = walk(source, 'watch');
  s = act(s, 'tournament_invite');
  assert.equal(s.event.id, 'tournament_invitation');
  if (interrupt) s = deadline(s);
  const day = s.day;
  s = pick(s, 'enter');
  if (interrupt) {
    assert.equal(s.day, day);
    assert.equal(s.adultTournament.paidDays, 0);
    s = pauseDeadline(s);
    assert.equal(s.adultTournament.stage, 'preparing');
  } else {
    assert.equal(s.day, day + 1);
    assert.equal(s.adultTournament.paidDays, 1);
    s = settle(s);
    if (s.adultTournament.stage === 'paused') s = act(walk(s, 'watch'), 'tournament_resume');
    assert.equal(s.adultTournament.stage, 'ready');
  }
  assert.equal(s.adultTournament.results.length, 0);
  assert.equal(s.battle, null);
  return roundtrip(s);
}

let commonPaused, commonPreparing;
export function captureClaimsTournamentBase({ tournament = 'paused' } = {}) {
  assert.ok(['paused', 'preparing'].includes(tournament));
  const cached = tournament === 'paused' ? commonPaused : commonPreparing;
  if (cached) return copy(cached);
  // The published source already contains an adult. The projected existing
  // settlement and family-home anchor are controls, not earned road travel.
  let s = acceptSuccessfulClaim(freshStory(), { homeAnchor: true, prepareStories: true });
  s = enterTournament(s, { interrupt: tournament === 'preparing' });
  if (tournament === 'paused') s = act(s, 'tournament_suspend');
  assert.equal(s.researchPortfolio.project, null);
  assert.equal(s.repertoire.project, null);
  assert.equal(s.justice.countingTableJob.stage, 'preparation');
  assert.equal(s.justice.countingTableJob.work.length, 0);
  assert.equal(s.adultTournament.stage, tournament);
  s = roundtrip(s);
  if (tournament === 'paused') commonPaused = copy(s); else commonPreparing = copy(s);
  return s;
}

export function capturePausedTournament(base = captureClaimsTournamentBase()) {
  let s = copy(base);
  if (s.adultTournament.stage !== 'paused') s = act(s, 'tournament_suspend');
  assert.equal(s.adultTournament.stage, 'paused');
  assert.equal(s.adultTournament.paidDays, 1);
  assert.equal(E.getLifeCommitment(s), null);
  return roundtrip(s);
}
export function captureLockedTournament(base = captureClaimsTournamentBase()) {
  let s = walk(copy(base), 'watch');
  s = act(s, 'tournament_resume');
  assert.equal(s.adultTournament.stage, 'ready');
  assert.equal(s.adultTournament.paidDays, 1);
  assert.equal(E.getLifeCommitment(s).kind, 'tournament');
  return roundtrip(s);
}

export function captureResearchProject(base = captureClaimsTournamentBase()) {
  let s = walk(copy(base), 'homes');
  const day = s.day;
  s = act(deadline(s), 'research_copy_axle_rubbing');
  assert.equal(s.day, day);
  assert.equal(s.researchPortfolio.project.completedDays, 0);
  assert.equal(s.researchPortfolio.project.remainingDays, 1);
  s = pauseDeadline(s);
  assert.equal(E.getLifeCommitment(s).kind, 'research');
  return roundtrip(s);
}
export function captureRepertoireProject(base = captureClaimsTournamentBase()) {
  let s = walk(copy(base), 'homes');
  const day = s.day;
  s = act(deadline(s), `repertoire_rehearse_${pieceId(s)}_solo`);
  assert.equal(s.day, day);
  assert.equal(s.repertoire.project.completedDays, 0);
  assert.equal(s.repertoire.project.remainingDays, 1);
  s = pauseDeadline(s);
  assert.equal(E.getLifeCommitment(s).kind, 'repertoire');
  return roundtrip(s);
}

export function capturePreparedClaim(base = captureClaimsTournamentBase()) {
  const s = roundtrip(prepare(copy(base)));
  assert.equal(s.justice.countingTableJob.status, 'active');
  assert.equal(s.justice.countingTableJob.stage, 'prepared');
  assert.equal(s.justice.countingTableJob.work.length, 3);
  return s;
}
export function captureClaimOpportunity(base = captureClaimsTournamentBase()) {
  let s = walk(capturePreparedClaim(base), 'market');
  s = act(s, 'justice_job_approach');
  assert.equal(s.justice.countingTableJob.stage, 'opportunity');
  assert.equal(s.justice.countingTableJob.attempt.approach.succeeded, true);
  assert.equal(s.event.id, 'justice_counting_departure');
  s = pick(s, 'later');
  assert.equal(E.getLifeCommitment(s), null);
  return roundtrip(s);
}
export function captureClaimProject(base = captureClaimsTournamentBase(), { stage = 'approach' } = {}) {
  assert.ok(['approach', 'departure'].includes(stage));
  let s = stage === 'approach' ? walk(capturePreparedClaim(base), 'market') : captureClaimOpportunity(base);
  if (stage === 'departure') s = act(s, 'justice_job_review');
  s = deadline(s);
  const day = s.day;
  s = stage === 'approach' ? act(s, 'justice_job_approach') : pick(s, 'depart');
  assert.equal(s.day, day);
  assert.equal(s.justice.countingTableJob.stage, stage);
  const phase = s.justice.countingTableJob.attempt[stage];
  assert.ok(phase.commitment);
  assert.equal(phase.completedDay, null);
  assert.equal(phase.succeeded, null);
  assert.equal(s.justice.takenProperties.includes(s.justice.countingTableJob.target.id), false);
  assert.equal(s.adventuring.loot.some(l => l.propertyId === s.justice.countingTableJob.target.id), false);
  s = pauseDeadline(s);
  assert.equal(E.getLifeCommitment(s).kind, 'justice_job');
  return roundtrip(s);
}

let combinedParent;
export function captureCombinedSuccessorParent() {
  if (combinedParent) return copy(combinedParent);
  let s = calendarYear(introduceFamily(adultFamily()));
  assert.ok(childRecord(s).adultLife.residence, 'the actual public calendar gave this child their own address');
  assert.equal(childRecord(s).adultLife.work.trainingDays, 14);
  s = researchFinished(walk(s, 'homes'), 'private');
  assert.equal(s.researchPortfolio.runs[0].finalization.audience, 'private');
  s = draft(walk(s, 'tavern'));
  s = act(s, `repertoire_rehearse_${pieceId(s)}_solo`);
  assert.equal(s.repertoire.pieces[0].privacy, 'private');
  assert.ok(s.repertoire.pieces[0].rehearsal);
  s = archiveVisit(s);
  for (let i = 0; i < 100; i++) {
    const before = copy(s), n = E.keepPlayerNote(s, `Exact parent ${i} Ω\n\n<&> preserved`);
    assert.deepEqual(s, before);
    s = valid(n);
  }
  assert.equal(s.playerNotes.length, 100);
  const first = personalNoteRows(s).find(n => n.own);
  s = valid(E.archivePlayerNote(s, reviewPersonalNote(s, first.key), true));
  assert.equal(s.playerNotes[0].archived, true);
  s = roundtrip(s);
  // Short-case resource boundary only. No skill, calling, child progress,
  // identity, elapsed day, claim, combat outcome or authority is fabricated.
  s = copy(s);
  s.hero.condition.hunger = 0;
  s.hero.hp = s.hero.maxHp;
  s = roundtrip(valid(s, 'controlled short-case care boundary'));
  s = enterTournament(s);
  s = act(s, 'tournament_bout_0');
  assert.equal(s.battle.context.kind, 'tournament');
  const beforeMove = copy(s), retreated = E.chooseBattleAction(s, 'retreat');
  assert.deepEqual(s, beforeMove, 'public battle action does not change its input');
  s = valid(retreated);
  assert.equal(beforeMove.battle.outcome, null);
  assert.equal(s.battle.outcome, 'retreat');
  s = roundtrip(s);
  const beforeResolve = copy(s), completed = copy(s.battle);
  const next = E.resolveBattle(s, completed);
  assert.deepEqual(s, beforeResolve, 'public battle resolution does not change its input');
  s = roundtrip(next);
  assert.equal(s.adultTournament.endReason, 'withdrawn');
  assert.ok(s.adultTournament.recognition?.personId);
  s = acceptSuccessfulClaim(s);
  s = captureClaimOpportunity(s);
  s = act(s, 'justice_job_review');
  s = pick(s, 'depart');
  assert.equal(s.justice.countingTableJob.status, 'completed');
  assert.equal(s.justice.countingTableJob.attempt.reported, false);
  assert.ok(s.justice.takenProperties.includes(s.justice.countingTableJob.target.id));
  assert.ok(s.adventuring.loot.some(l => l.propertyId === s.justice.countingTableJob.target.id));
  // A controlled, non-warrant report is a positive guilt-reset antecedent.
  // It is not presented as an earned allegation or forged completed job.
  s = copy(s);
  assert.equal(s.legal.incidents.length, 0);
  s.legal.incidents.push({ locationId: s.locationId, evidence: 1, description: 'Controlled earlier local report for the succession reset boundary.' });
  s.legal.evidence = 1;
  s.legal.description = s.legal.incidents[0].description;
  s = roundtrip(valid(s, 'controlled non-warrant parent report'));
  s = act(s, 'retire');
  assert.equal(s.event.id, 'retirement');
  s = pick(s, 'settle');
  assert.equal(s.phase, 'retired');
  assert.equal(s.legal.incidents.length, 1);
  combinedParent = copy(roundtrip(s));
  return s;
}
