import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { RPG_FACTIONS_V27, applyRpgAction, applyRpgChoice } from '../dist/js/rpg-depth-v27.js';
import { FIRST_MISSION_METHODS } from '../dist/js/faction-mission-state.js';
import { firstMissionJournalRow, firstMissionActions, firstMissionTitle, validateFactionFirstMission } from '../dist/js/faction-first-missions.js';
import { evidenceFor } from '../dist/js/objective-evidence.js';
import { journalCommitments } from '../dist/js/journal-commitments.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography, markSiteKnowledge } from '../dist/js/cartography.js';
import { groundedEvent } from '../dist/js/grounded-narrative-content.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base;
const base = E.migrateSave(fixture);
const faction = (s, id) => s.rpg.factions.find(f => f.id === id);
function reload(s) { assert.ok(E.validateSave(s), s.notice); const next = E.migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(next, s); return next; }
function settle(s) {
  for (let n = 0; n < 60; n++) {
    if (s.event) {
      const c = s.event.choices.find(c => ['conclude_correct', 'care', 'animal', 'avoid', 'continue', 'leave', 'later', 'pause'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason);
      const beforeLocation = s.locationId, waitingArrival = s.rpg.factions.find(f => f.firstMission?.status === 'active' && f.firstMission.method === 'access')?.firstMission;
      const beforeArrival = waitingArrival && structuredClone(evidenceFor(waitingArrival, 'route_arrival'));
      s = E.chooseEventOption(s, c.id);
      if (waitingArrival && s.locationId === beforeLocation) assert.deepEqual(evidenceFor(faction(s, waitingArrival.definitionId).firstMission, 'route_arrival'), beforeArrival, 'a road/calendar answer without arrival cannot create arrival proof');
    } else if (s.rpg.project) s = E.chooseAction(s, 'rpg_continue');
    else return s;
  }
  throw Error('The focused fixture could not finish its real interruption.');
}
function walk(s, room) {
  if (!room) return s;
  const path = settlementWalkPath(s, room); assert.notEqual(path, null, `Missing room ${room}`);
  for (const id of path) s = E.chooseAction(s, 'atlas_room_' + id);
  return s;
}
function here(id) {
  const s = structuredClone(base);
  // Controlled location/threshold/material fixtures, not claimed earned lifetimes.
  const place = s.world.locations.find(p => s.realm.sites[p.id]?.regionId === RPG_FACTIONS_V27.find(f => f.id === id).regionId && settlementServices(s, { siteId: p.id }).some(r => r.kind === 'faction' && r.subjectId === id));
  assert.ok(place, 'Faction settlement ' + id); s.locationId = place.id; syncCartography(s);
  for (const skill of ['scholarship', 'persuasion', 'weapons', 'stealth', 'survival']) s.hero.skills[skill] = 4;
  for (const material of ['wood', 'cloth']) s.equipment.materials[material] = 4;
  return s;
}
function offer(id) {
  let s = here(id); const provider = settlementServices(s).find(r => r.kind === 'faction' && r.subjectId === id);
  s = walk(s, provider.roomId); s = E.chooseAction(s, 'rpg_join_' + id); s = E.chooseAction(s, 'rpg_faction_' + id);
  assert.equal(s.rpg.pending.firstOffer, true); assert.equal(s.event.title, firstMissionTitle(id));
  assert.ok(s.event.body.includes('finite agreement')); return reload(s);
}
function accept(id, method, { willing = true } = {}) {
  let s = offer(id); const day = s.day, gold = s.hero.gold;
  const choice = s.event.choices.find(c => c.id === 'accept_' + method); assert.ok(choice && !choice.disabledReason, choice?.disabledReason);
  s = E.chooseEventOption(s, choice.id);
  assert.equal(s.day, day); assert.equal(s.hero.gold, gold); assert.equal(faction(s, id).rank, 0);
  if (id === 'quiet_table') faction(s, id).firstMission.values.recipientWilling = willing; // Explicit authored-answer branch fixture.
  return reload(s);
}
function travel(s, destinationId) {
  const origin = s.locationId; s = E.travelTo(s, destinationId);
  if (s.locationId !== destinationId && !s.timeline?.journey && !s.cartography?.pending && !s.event) assert.fail(`Travel from ${origin} to ${destinationId}: ${s.notice}; offsite=${s.cartography?.offsite}; project=${s.rpg.project?.kind}; travel=${JSON.stringify(s.travel?.pending)}`);
  for (let n = 0; n < 160 && (s.locationId !== destinationId || s.timeline?.journey || s.cartography?.pending); n++) {
    if (s.event) { s = settle(s); continue; }
    assert.notEqual(s.phase, 'retired', s.notice);
    assert.equal(s.battle, null, 'This civilian route fixture must not force combat.');
    if (s.hero.mp <= s.hero.maxMp / 4 && E.getActions(s).some(a => a.id === 'trail_camp' && !a.disabledReason)) { s = settle(E.chooseAction(s, 'trail_camp')); continue; }
    const before = s.day, next = E.continueExploreJourney(s);
    if (next.day === before && !next.event && !next.timeline?.journey && next.locationId !== destinationId) assert.fail(`Travel from ${origin} to ${destinationId}: ${next.notice}; location=${next.locationId}; event=${next.event?.id}; offsite=${next.cartography?.offsite}; year=${next.timeline?.yearTarget}`);
    s = next;
  }
  assert.equal(s.locationId, destinationId); assert.equal(s.timeline.journey, null); return settle(s);
}
function completeStep(s, id) {
  const f = faction(s, id), row = firstMissionJournalRow(s, f); assert.ok(row);
  if (row.locationId !== s.locationId) s = travel(s, row.locationId);
  s = walk(s, row.roomId);
  const a = E.getActions(s).find(a => a.id === row.actionId); assert.ok(a, row.actionId); assert.equal(a.disabledReason, undefined, a.disabledReason);
  return reload(settle(E.chooseAction(s, a.id)));
}

test('six first missions have two concrete methods, complete once, and remember their actual method', { timeout: 180000 }, () => {
  for (const [id, methods] of Object.entries(FIRST_MISSION_METHODS)) for (const method of methods) {
    if (process.env.FACTION_CASE && process.env.FACTION_CASE !== id || process.env.FACTION_METHOD && process.env.FACTION_METHOD !== method) continue;
    let s = accept(id, method), count = 0;
    while (faction(s, id).firstMission.status === 'active' && count++ < 8) s = completeStep(s, id);
    const f = faction(s, id), m = f.firstMission;
    assert.equal(m.status, 'completed', id + '/' + method); assert.equal(f.rank, 1); assert.equal(f.choices.length, 1); assert.equal(f.choices[0].id, method);
    assert.equal(m.rewardApplied, true); assert.ok(m.evidence.length >= 2); assert.equal(new Set(m.evidence.map(e => e.id)).size, m.evidence.length);
    assert.equal(s.rpg.services.some(service => service.source === 'faction-' + id), false, 'rank-three service is not granted early');
    const before = structuredClone(s); s = E.chooseAction(s, `rpg_objective_${id}__report`);
    assert.equal(s.hero.gold, before.hero.gold); assert.deepEqual(faction(s, id), faction(before, id));
    assert.equal(journalCommitments(s).filter(row => row.key === 'faction:' + id).length, 1, 'one later return, not duplicate objective rows');
    assert.equal(journalCommitments(s).find(row => row.key === 'faction:' + id).details.some(text => text.includes(m.ending)), true);
  }
});

test('hearing, opening, leaving and reloading do not accept or flood the Journal', () => {
  let s = offer('salt_ledger'); assert.equal(faction(s, 'salt_ledger').firstMission, undefined);
  assert.equal(journalCommitments(s).some(row => row.key === 'faction:salt_ledger'), false);
  const before = structuredClone(s); E.getActions(s); journalCommitments(s); assert.deepEqual(s, before);
  s = E.chooseEventOption(s, 'leave'); reload(s); assert.equal(faction(s, 'salt_ledger').rank, 0);
  assert.equal(journalCommitments(s).some(row => row.key === 'faction:salt_ledger'), false);
});

test('materials and attended work persist across interruption, then consume exactly once', () => {
  let s = accept('lantern_compact', 'mending'); const m = faction(s, 'lantern_compact').firstMission;
  s = walk(s, m.cast.smith.roomId); const action = firstMissionActions(s).find(a => a.id.endsWith('__mend_covers'));
  const before = s.equipment.materials.cloth;
  const ctx = { spendDays(n) { const actual = Math.min(n, 1); s.day += actual; return actual; }, journalLiteral() {} };
  assert.equal(applyRpgAction(s, action.id, ctx), true); assert.equal(s.rpg.project.remainingDays, 1);
  assert.equal(s.equipment.materials.cloth, before - 2); assert.equal(s.rpg.project.details.materialsSpent, true); s = reload(s);
  assert.equal(applyRpgAction(s, 'rpg_continue', { spendDays(n) { s.day += n; return n; }, journalLiteral() {} }), true);
  assert.equal(s.equipment.materials.cloth, before - 2); assert.equal(s.rpg.project, null);
  assert.ok(evidenceFor(faction(s, 'lantern_compact').firstMission, 'mend_covers')); reload(s);
});

test('eight Gold cannot substitute for actual cloth, consent or a route arrival', () => {
  let s = accept('lantern_compact', 'mending'); s.equipment.materials.cloth = 0; s.hero.gold = 8;
  const m = faction(s, 'lantern_compact').firstMission; s = walk(s, m.cast.smith.roomId);
  const a = E.getActions(s).find(a => a.id.endsWith('__mend_covers')); assert.match(a.disabledReason, /2 actual cloth/);
  const day = s.day; s = E.chooseAction(s, a.id); assert.equal(s.day, day); assert.equal(faction(s, 'lantern_compact').rank, 0);
  s = accept('rootward_circle', 'access'); const field = faction(s, 'rootward_circle').firstMission.fieldLocationId;
  markSiteKnowledge(s, field, 'Visited', 'Controlled pre-existing visit, not mission work');
  assert.equal(evidenceFor(faction(s, 'rootward_circle').firstMission, 'route_arrival'), null);
  E.getActions(s); journalCommitments(s); assert.equal(evidenceFor(faction(s, 'rootward_circle').firstMission, 'route_arrival'), null);
  s = travel(s, field); assert.equal(evidenceFor(faction(s, 'rootward_circle').firstMission, 'route_arrival').kind, 'arrival'); reload(s);
});

test('recipient refusal returns the unique parcel without claiming delivery or willing consent', () => {
  let s = accept('quiet_table', 'direct', { willing: false }); s = completeStep(s, 'quiet_table');
  let m = faction(s, 'quiet_table').firstMission; assert.equal(evidenceFor(m, 'recipient_reply').disposition, 'refused');
  assert.equal(s.journal.at(-1).text, s.notice); assert.match(s.notice, /declines/); s = reload(s);
  assert.equal(firstMissionJournalRow(s, faction(s, 'quiet_table')).actionId.endsWith('__return_parcel'), true);
  s = completeStep(s, 'quiet_table'); m = faction(s, 'quiet_table').firstMission;
  assert.equal(m.status, 'completed'); assert.equal(m.values.parcelState, 'returned'); assert.match(m.ending, /not delivery or consent/);
  assert.equal(m.evidence.some(e => ['direct_delivery', 'relay_receipt'].includes(e.id)), false);
  assert.equal(s.journal.at(-1).text, s.notice); assert.match(s.notice, /not delivery or consent/); reload(s);
});

test('a dead or absent exact participant cannot be replaced with new testimony or consent', () => {
  let s = accept('quiet_table', 'direct'), m = faction(s, 'quiet_table').firstMission;
  const p = s.rpg.contacts.find(p => p.id === m.cast.recipient.id); p.alive = false; p.deathDay = s.day;
  s = walk(s, 'homes'); const before = structuredClone(s), a = E.getActions(s).find(a => a.id.endsWith('__recipient_reply'));
  assert.match(a.disabledReason, /has died/); s = E.chooseAction(s, a.id);
  assert.equal(s.day, before.day); assert.equal(s.hero.gold, before.hero.gold); assert.equal(faction(s, 'quiet_table').firstMission.evidence.length, 0); reload(s);
  s = accept('quiet_table', 'direct'); m = faction(s, 'quiet_table').firstMission;
  s.rpg.contacts.find(p => p.id === m.cast.recipient.id).retired = true;
  assert.match(E.getActions(s).find(a => a.id.endsWith('__recipient_reply')).disabledReason, /not available/);
  assert.equal(m.cast.recipient.id, faction(s, 'quiet_table').firstMission.cast.recipient.id);
});

test('legacy displayed and paid partial first agreements preserve their saved terms and ranks', () => {
  let s = offer('salt_ledger'); delete s.rpg.pending.firstOffer;
  s.event.choices = [{ id: 'care', label: 'Saved care agreement', description: '3 days and 8 Gold.' }, { id: 'trade', label: 'Saved paid agreement', description: '2 days and 20 Gold proceeds.' }, { id: 'scheme', label: 'Saved pressure agreement', description: '2 days and 32 Gold proceeds.' }, { id: 'leave', label: 'Later', description: 'No change.' }];
  const event = structuredClone(s.event), pending = structuredClone(s.rpg.pending); s = reload(s);
  assert.deepEqual(s.event, event); assert.deepEqual(s.rpg.pending, pending);
  s = settle(E.chooseEventOption(s, 'trade')); assert.equal(faction(s, 'salt_ledger').rank, 1); assert.equal(faction(s, 'salt_ledger').firstMission, undefined); reload(s);
  s = offer('salt_ledger'); s.event = null; s.rpg.pending = null;
  s.rpg.project = { kind: 'faction', id: 'salt_ledger', choice: 'care', totalDays: 3, completedDays: 2, remainingDays: 1, cost: 8, paid: true, startedDay: s.day - 2, locationId: s.locationId, details: {} };
  const project = structuredClone(s.rpg.project); s = reload(s); assert.deepEqual(s.rpg.project, project);
  s = settle(E.chooseAction(s, 'rpg_continue')); assert.equal(faction(s, 'salt_ledger').rank, 1); assert.equal(faction(s, 'salt_ledger').firstMission, undefined);
});

test('malformed proof identity, consent, order or target is rejected without migration repair', () => {
  let s = accept('quiet_table', 'direct'); s = completeStep(s, 'quiet_table');
  for (const mutate of [
    m => { m.evidence[0].actorIds = ['a-successor-who-never-consented']; },
    m => { m.evidence[0].disposition = 'observed'; },
    m => { m.evidence[0].objectId = 'another-parcel'; },
    m => { m.completedSteps.push('report'); },
    m => { m.rewardApplied = true; },
  ]) { const bad = structuredClone(s); mutate(faction(bad, 'quiet_table').firstMission); assert.equal(E.validateSave(bad), false); assert.equal(E.migrateSave(bad), null); }
});

test('proof dates and verified arrival precede the actual attended fieldwork', () => {
  let s = accept('salt_ledger', 'marks'); s = completeStep(s, 'salt_ledger'); s = completeStep(s, 'salt_ledger');
  const badDates = structuredClone(s), cargo = faction(badDates, 'salt_ledger').firstMission;
  cargo.evidence[0].day = cargo.evidence[1].day;
  assert.equal(E.validateSave(badDates), false, 'two attended one-day steps cannot acquire proof simultaneously');
  s = accept('rootward_circle', 'access'); s = completeStep(s, 'rootward_circle');
  const field = faction(s, 'rootward_circle').firstMission;
  for (const mutate of [
    m => { evidenceFor(m, 'route_arrival').verified = false; },
    m => { evidenceFor(m, 'route_arrival').objectId = 'another-forest-case'; },
    m => { evidenceFor(m, 'route_arrival').day = evidenceFor(m, 'field_account').day; },
    m => { m.evidence.reverse(); },
  ]) { const bad = structuredClone(s); mutate(faction(bad, 'rootward_circle').firstMission); assert.equal(E.validateSave(bad), false); }
  assert.ok(evidenceFor(field, 'route_arrival').day < evidenceFor(field, 'field_account').day); reload(s);
});

test('public custody is explicit, chronological, and each proof keeps its acquisition-time author', () => {
  let s = accept('salt_ledger', 'marks'); s = completeStep(s, 'salt_ledger');
  const old = faction(s, 'salt_ledger').firstMission.cast.archivist.id;
  // Controlled epoch fixture exercises a real successor service projection, not
  // a claim that the intervening 33 years were played or rewarded.
  s.day = 55 * 365 + 2; s.age = Math.floor((s.day - (s.timeline.birthDay || 0)) / 365);
  s = walk(s, 'archive'); const handoff = E.getActions(s).find(a => a.id === 'rpg_objective_salt_ledger__custody');
  assert.ok(handoff && !handoff.disabledReason, handoff?.disabledReason); s = E.chooseAction(s, handoff.id);
  const accepted = faction(s, 'salt_ledger').firstMission; assert.equal(accepted.cast.archivist.id, old); assert.equal(accepted.custody.length, 1);
  assert.equal(validateFactionFirstMission(accepted, faction(s, 'salt_ledger'), s), true, JSON.stringify(accepted));
  assert.notEqual(accepted.custody[0].to.id, old);
  const ctx = { spendDays(n) { s.day += n; return n; }, journalLiteral() {}, setEvent(id, title, category, body, choices) { s.event = { id, title, category, body, choices }; } };
  assert.equal(applyRpgAction(s, 'rpg_objective_salt_ledger__cargo_manifest', ctx), true);
  s.event = null; assert.equal(applyRpgChoice(s, 'rpg_faction', 'conclude_correct', ctx), true);
  const m = faction(s, 'salt_ledger').firstMission, proof = evidenceFor(m, 'cargo_manifest');
  assert.equal(validateFactionFirstMission(m, faction(s, 'salt_ledger'), s), true);
  assert.deepEqual(proof.actorIds, [m.custody[0].to.id]); assert.equal(proof.sourceRevision, 1);
  for (const mutate of [
    run => { evidenceFor(run, 'cargo_manifest').actorIds = [old]; },
    run => { evidenceFor(run, 'cargo_manifest').sourceRevision = 0; },
    run => { run.custody[0].day = evidenceFor(run, 'cargo_manifest').day + 1; },
    run => { const row = structuredClone(run.custody[0]); row.day--; row.fromId = row.to.id; row.to.id += '-next'; run.custody.push(row); },
  ]) { const bad = structuredClone(s); mutate(faction(bad, 'salt_ledger').firstMission); assert.equal(validateFactionFirstMission(faction(bad, 'salt_ledger').firstMission, faction(bad, 'salt_ledger'), bad), false); }
});

test('a completed comparison never overwrites a waiting birthday or repeats its attended days', () => {
  let s = accept('unbound_archive', 'comparison'); s = walk(s, 'archive');
  const waiting = { id: 'controlled-calendar-interruption', title: 'A waiting birthday', body: 'Preserve this waiting moment.', choices: [{ id: 'continue', label: 'Continue', description: 'Resolve the calendar first.' }] };
  const action = firstMissionActions(s).find(a => a.id.endsWith('__wage_compare'));
  assert.equal(applyRpgAction(s, action.id, { spendDays(n) { s.day += n; s.event = structuredClone(waiting); return n; }, journalLiteral() {}, setEvent() { assert.fail('The birthday must not be overwritten.'); } }), true);
  assert.deepEqual(s.event, waiting); assert.equal(faction(s, 'unbound_archive').firstMission.decisionStep, 'wage_compare');
  s.event = null; const day = s.day, again = E.getActions(s).find(a => a.id.endsWith('__wage_compare')); assert.equal(again.days, 0);
  s = E.chooseAction(s, again.id); assert.equal(s.day, day); assert.equal(s.rpg.pending.objectiveDecision, 'wage_compare'); reload(s);
});

test('later agreements quote the exact first method and retain the real rank-three public service', () => {
  let s = accept('salt_ledger', 'marks'); for (let n = 0; n < 3; n++) s = completeStep(s, 'salt_ledger');
  const first = structuredClone(faction(s, 'salt_ledger').firstMission), provider = settlementServices(s).find(r => r.kind === 'faction' && r.subjectId === 'salt_ledger');
  s = walk(reload(s), provider.roomId);
  // Controlled ready-date fixture tests the returning contract, not 28 earned days.
  faction(s, 'salt_ledger').nextDay = s.day;
  s = E.chooseAction(s, 'rpg_faction_salt_ledger'); assert.ok(s.event.body.includes(first.ending)); assert.match(s.event.body, /packing mark and original manifest/);
  s = settle(E.chooseEventOption(s, 'trade')); assert.equal(faction(s, 'salt_ledger').rank, 2);
  faction(s, 'salt_ledger').nextDay = s.day; s = E.chooseAction(s, 'rpg_faction_salt_ledger'); s = settle(E.chooseEventOption(s, 'care'));
  assert.equal(faction(s, 'salt_ledger').rank, 3); assert.deepEqual(faction(s, 'salt_ledger').firstMission, first);
  const service = s.rpg.services.find(v => v.source === 'faction-salt_ledger'); assert.equal(service.kind, 'market'); assert.equal(service.rule, 'shared'); reload(s);
});

test('public event titles, concrete clues, choices, notices and Journal text retain validated case prose', () => {
  let s = accept('salt_ledger', 'marks');
  assert.match(s.notice, /You accepted/); assert.match(s.journal.at(-1).text, /named people, case and method are saved/);
  assert.equal(s.journal.at(-1).text, s.notice); const acceptedEntry = structuredClone(s.journal.at(-1));
  s = reload(s); assert.deepEqual(s.journal.at(-1), acceptedEntry);
  s = completeStep(s, 'salt_ledger'); assert.match(s.notice, /packing mark reads/); assert.match(s.journal.at(-1).text, /reed-and-ring/);
  const row = firstMissionJournalRow(s, faction(s, 'salt_ledger')); s = walk(s, row.roomId); s = E.chooseAction(s, row.actionId);
  assert.equal(s.event.title, 'What does the evidence support?'); assert.match(s.event.body, /manifest assigns the reed-and-ring mark/);
  const name = faction(s, 'salt_ledger').firstMission.cast.ownerB.name;
  assert.ok(s.event.body.includes(name)); assert.ok(s.event.choices.find(c => c.id === 'conclude_correct').label.includes(name));
  assert.match(s.event.choices.find(c => c.id === 'conclude_wrong').description, /not evidence/);
  const bad = structuredClone(s); faction(bad, 'salt_ledger').firstMission.method = 'forged-method';
  assert.notEqual(groundedEvent(bad, bad.event).title, bad.event.title, 'malformed owner provenance cannot request the authored-scene bypass');
  s = E.chooseEventOption(s, 'conclude_correct'); assert.match(s.notice, /only the conclusion supported/); assert.ok(s.journal.at(-1).text.includes(name)); s = reload(s);
  s = completeStep(s, 'salt_ledger'); assert.equal(faction(s, 'salt_ledger').firstMission.status, 'completed');
  assert.ok(s.notice.includes(name)); assert.match(s.notice, /20 Gold and one rank were awarded once/);
  assert.equal(s.journal.at(-1).text, s.notice); assert.ok(s.journal.some(r => r.id === acceptedEntry.id && r.text === acceptedEntry.text));
  const completeEntry = structuredClone(s.journal.at(-1)); s = reload(s); assert.deepEqual(s.journal.at(-1), completeEntry);
});


test('validated unresolved and withdrawn case notes stay literal without granting proof or reward', () => {
  let s = accept('salt_ledger', 'marks'); s = completeStep(s, 'salt_ledger');
  const row = firstMissionJournalRow(s, faction(s, 'salt_ledger')); s = walk(s, row.roomId); s = E.chooseAction(s, row.actionId);
  const before = structuredClone(faction(s, 'salt_ledger').firstMission), gold = s.hero.gold, day = s.day;
  s = E.chooseEventOption(s, 'conclude_wrong');
  assert.match(s.notice, /not supported/); assert.equal(s.journal.at(-1).text, s.notice); s = reload(s);
  assert.deepEqual(faction(s, 'salt_ledger').firstMission, before); assert.equal(s.hero.gold, gold); assert.equal(s.day, day);
  s = E.chooseAction(s, row.actionId); assert.equal(s.day, day); assert.equal(s.event.title, 'What does the evidence support?');
  s = E.chooseEventOption(s, 'conclude_correct'); assert.match(s.journal.at(-1).text, /only the conclusion supported/); reload(s);
  s = accept('quiet_table', 'direct'); const start = structuredClone(s), f = faction(s, 'quiet_table');
  s = E.chooseAction(s, 'rpg_objective_quiet_table__withdraw');
  assert.equal(faction(s, 'quiet_table').firstMission.status, 'withdrawn'); assert.equal(s.hero.gold, start.hero.gold); assert.equal(s.day, start.day);
  assert.equal(faction(s, 'quiet_table').firstMission.evidence.length, 0); assert.equal(faction(s, 'quiet_table').rank, f.rank);
  assert.equal(s.journal.at(-1).text, s.notice); assert.match(s.notice, /withdrew without claiming/); assert.match(s.notice, /handed the still-sealed parcel back/); reload(s);
});
