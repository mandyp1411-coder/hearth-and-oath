import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_DEFINITIONS, researchCatalog, researchDefinition, researchObjectId, researchInterpretation } from '../dist/js/research-definitions.js';
import { researchRecallScene } from '../dist/js/research-recall-content.js';
import { researchOfferScene, researchRunScene, preserveResearchEvent, validateResearchScene } from '../dist/js/research-scenes.js';
import { researchConversation, authenticResearchConversation, recordResearchConversation } from '../dist/js/research-dialogue.js';
import { renderResearchShelf, renderResearchArchive } from '../dist/js/research-ui.js';
import { makeResearchPortfolio, makeResearchRun, captureResearchActor, researchSourceEvidenceId,
  selectResearchInterpretation, researchInterpretationReason, researchConclusionPreview, researchRecallCandidate,
  validateResearchPortfolio, validateResearchRun, researchActorAvailable } from '../dist/js/research-portfolio.js';

const clone = value => structuredClone(value);
function state() {
  const s = { day: 30, age: 18, phase: 'adult', locationId: 'home', cartography: { interior: { siteId: 'home', roomId: 'homes' } }, hero: { name: 'Neris', skills: { scholarship: 0 } }, dynasty: { activePersonId: 'hero-one', generation: 1 },
    world: { locations: [
      { id: 'home', institutions: [{ id: 'home_community', kind: 'community' }] },
      { id: 'mill', institutions: [{ id: 'mill_workshop', kind: 'workshop' }] },
      { id: 'citadel', institutions: [{ id: 'citadel_order', kind: 'order' }] },
      { id: 'tower', institutions: [{ id: 'tower_academy', kind: 'academy' }] },
    ] }, npcContinuity: { people: {} } };
  addPerson(s, 'clerk-one', 'archivist', 'Avel');
  addPerson(s, 'maker-one', 'smith', 'Tamsin');
  return s;
}
function addPerson(s, id, kind, name, observedDay = 0) {
  const role = kind === 'archivist' ? 'Archivist' : 'Craftsperson';
  s.npcContinuity.people[id] = { slotKey: `service:home:${kind}:`, snapshot: { id, name, role, locationId: 'home' }, observedDay, retiredDay: null };
  return s.npcContinuity.people[id].snapshot;
}
function fixture(definitionId = 'third_mark') {
  const s = state(), accepted = { ...s, day: 2 };
  const actor = captureResearchActor(s.npcContinuity.people['clerk-one'].snapshot, { serviceKind: 'archivist', roomId: 'archive', day: 2 });
  s.researchPortfolio = makeResearchPortfolio(accepted);
  const run = makeResearchRun(accepted, definitionId, { locationId: 'home', archivist: actor });
  s.researchPortfolio.runs.push(run); s.researchPortfolio.invitations[definitionId] = 'accepted'; s.researchPortfolio.activeRunId = run.id;
  return { s, run };
}
function evidence(run, id, kind, day, actorIds, objectId, disposition, sourceRevision = 0) {
  run.evidence.push({ id, kind, day, locationId: 'home', actorIds, objectId, verified: true, disposition, sourceRevision });
}
function acquire(run, sourceId, startedDay, { mode = 'home-copy', revision = run.custody.length } = {}) {
  const source = researchDefinition(run.definitionId).sources.find(row => row.id === sourceId);
  const actor = revision === 0 ? run.cast.archivist : run.custody[revision - 1].to;
  const id = researchSourceEvidenceId(sourceId), day = startedDay + 1;
  run.steps.push({ id, sourceId, mode, actorId: actor.id, locationId: 'home', roomId: mode === 'home-copy' ? 'homes' : 'archive', startedDay, completedDay: day, days: 1, sourceRevision: revision });
  run.copies.push({ sourceId, objectId: researchObjectId(run.definitionId, sourceId), originLocationId: source.originLocationId,
    institutionId: `${source.originLocationId}_${source.institutionKind}`, custodyLocationId: 'home', custodianId: actor.id,
    requestedDay: startedDay, preparedDay: startedDay, receivedDay: day, sourceRevision: revision });
  evidence(run, id, 'record', day, [actor.id], researchObjectId(run.definitionId, sourceId), 'intact', revision);
}
function compare(run, day) {
  run.steps.push({ id: 'comparison', sourceId: null, mode: 'comparison', actorId: null, locationId: 'home', roomId: 'homes', startedDay: day, completedDay: day + 1, days: 1, sourceRevision: 0 });
  run.comparison = { startedDay: day, completedDay: day + 1, days: 1, practiceApplied: true, sourceIds: researchDefinition(run.definitionId).requiredSources.slice() };
  evidence(run, 'comparison', 'inspection', day + 1, [], run.id, 'observed');
}
function ready(definitionId = 'third_mark') {
  const f = fixture(definitionId); let day = 3;
  for (const id of researchDefinition(definitionId).requiredSources) acquire(f.run, id, day++);
  compare(f.run, day);
  selectResearchInterpretation(f.run, definitionId === 'third_mark' ? 'shared_repair' : 'lantern_sequence');
  return f;
}
function finish(f, audience = 'self', quoteSourceIds = []) {
  const { s, run } = f, day = 12;
  if (audience !== 'self') {
    run.steps.push({ id: 'deposit', sourceId: null, mode: 'home-collection', actorId: run.cast.archivist.id,
      locationId: 'home', roomId: 'homes', startedDay: day - 1, completedDay: day, days: 1, sourceRevision: 0 });
    evidence(run, 'deposit', 'receipt', day, [run.cast.archivist.id], run.id, 'returned');
  }
  run.finalization = { audience, day, recipientId: audience === 'self' ? null : run.cast.archivist.id,
    quoteSourceIds, mode: audience === 'self' ? 'self' : 'home-collection' };
  run.status = 'completed'; run.endedDay = day; s.researchPortfolio.activeRunId = null;
  return f;
}
function maker(f) {
  const { s, run } = f;
  run.cast.craftsperson = captureResearchActor(s.npcContinuity.people['maker-one'].snapshot, { serviceKind: 'smith', roomId: 'market', day: 7 });
}
function permission(run, scope, decision, day) {
  run.permissions.push({ sourceId: 'maker_margin', personId: run.cast.craftsperson.id, ownerId: run.ownerId, day, scope, decision });
  evidence(run, `consent-${scope}-maker_margin`, 'consent', day, [run.cast.craftsperson.id], researchObjectId(run.definitionId, 'maker_margin'), decision);
}
function hearMaker(f) {
  maker(f); const { run } = f; permission(run, 'hear', 'willing', 7);
  run.steps.push({ id: 'source-maker_margin', sourceId: 'maker_margin', mode: 'consultation', actorId: run.cast.craftsperson.id,
    locationId: 'home', roomId: 'market', startedDay: 8, completedDay: 9, days: 1, sourceRevision: 0 });
  evidence(run, 'source-maker_margin', 'testimony', 9, [run.cast.craftsperson.id], researchObjectId(run.definitionId, 'maker_margin'), 'intact');
}

test('two original closed questions expose a pure immutable catalog, not accepted work', () => {
  const s = state(), before = clone(s), catalog = researchCatalog(s);
  assert.equal(catalog.length, 2); assert.deepEqual(s, before); assert.equal(s.researchPortfolio, undefined);
  assert.equal(RESEARCH_DEFINITIONS[0].sources.length, 3); assert.equal(RESEARCH_DEFINITIONS[1].sources.length, 3);
  assert.throws(() => { RESEARCH_DEFINITIONS[0].sources[0].text = 'Rewritten'; });
  assert.equal(validateResearchPortfolio(undefined, s), true);
});

test('lazy choice-only envelope and accepted case require exact owner, definition and actor', () => {
  const f = fixture(); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  for (const change of [{ ownerId: 'heir-two' }, { definitionId: 'other-question' }, { id: 'free-case' }, { generation: 2 }, { acceptedDay: 31 }, { hidden: true }]) {
    const run = { ...clone(f.run), ...change }; assert.equal(validateResearchRun(run, f.s), false, JSON.stringify(change));
  }
  const unknown = clone(f.run); unknown.cast.archivist.id = 'clerk-successor'; assert.equal(validateResearchRun(unknown, f.s), false);
  const alias = clone(f.run); alias.cast.archivist.name = 'Same office, another name'; assert.equal(validateResearchRun(alias, f.s), false);
});

test('both home-copy cases preserve dated local copies and original provenance without original visits', () => {
  for (const id of ['third_mark', 'early_bell']) {
    const f = ready(id); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true, id);
    assert.ok(f.run.evidence.every(entry => entry.locationId === 'home'));
    assert.ok(f.run.copies.every(copy => copy.originLocationId !== copy.custodyLocationId && copy.receivedDay > copy.requestedDay));
    assert.equal(f.s.hero.skills.scholarship, 0, 'state constructors/validators do not award practice or wages');
    assert.equal(Object.hasOwn(f.run, 'gold'), false);
  }
});

test('owner rejects individually well-typed but false source meaning and acquisition chronology', () => {
  const f = ready();
  for (const change of [{ kind: 'arrival' }, { objectId: f.run.id }, { locationId: 'mill' }, { actorIds: ['maker-one'] },
    { day: 2 }, { sourceRevision: 1 }, { disposition: 'observed' }, { verified: false }, { arbitrary: 1 }]) {
    const run = clone(f.run); Object.assign(run.evidence[0], change); assert.equal(validateResearchRun(run, f.s), false, JSON.stringify(change));
  }
  for (const change of [{ originLocationId: 'home' }, { institutionId: 'mill_community' }, { receivedDay: 2 }, { preparedDay: 1 }, { custodianId: 'maker-one' }]) {
    const run = clone(f.run); Object.assign(run.copies[0], change); assert.equal(validateResearchRun(run, f.s), false, JSON.stringify(change));
  }
  const overlap = clone(f.run); overlap.steps[1].startedDay = overlap.steps[0].startedDay; overlap.copies[1].requestedDay--;
  assert.equal(validateResearchRun(overlap, f.s), false, 'several copied records cannot invent parallel attended days');
});

test('missing source, duplicate proof, missing attendance and premature comparison cannot pass', () => {
  const f = ready();
  for (const mutate of [run => run.evidence.splice(0, 1), run => run.copies.splice(0, 1), run => run.steps.splice(0, 1),
    run => run.evidence.push(clone(run.evidence[0])), run => run.comparison.sourceIds.pop(), run => { run.comparison.practiceApplied = false; },
    run => { run.steps[2].startedDay = 2; run.comparison.startedDay = 2; }, run => { run.claims[0].status = 'documented'; }]) {
    const run = clone(f.run); mutate(run); assert.equal(validateResearchRun(run, f.s), false);
  }
});

test('unsupported readings are recoverable drafts, never a punishment or terminal verdict', () => {
  const f = ready(), before = clone(f.s.hero);
  assert.equal(selectResearchInterpretation(f.run, 'ownership_chain'), true);
  assert.match(researchInterpretationReason(f.run, 'ownership_chain'), /payment, not a sale/);
  assert.equal(validateResearchRun(f.run, f.s), true);
  assert.equal(researchConclusionPreview(f.run), null);
  assert.equal(f.run.status, 'active'); assert.deepEqual(f.s.hero, before);
  assert.equal(selectResearchInterpretation(f.run, 'older_marks_open'), true);
  assert.equal(researchInterpretationReason(f.run, 'older_marks_open'), null);
  assert.ok(researchConclusionPreview(f.run).openQuestions.length);
  assert.equal(validateResearchRun(f.run, f.s), true);
  finish(f); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  assert.equal(selectResearchInterpretation(f.run, 'shared_repair'), false, 'terminal case does not reopen');
});

test('public, private and self folios retain precise supported conclusions and public credits', () => {
  for (const definition of RESEARCH_DEFINITIONS) for (const reading of definition.interpretations.filter(row => row.supported)) for (const audience of ['public', 'private', 'self']) {
    const f = ready(definition.id); selectResearchInterpretation(f.run, reading.id); finish(f, audience);
    assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true, `${definition.id}/${reading.id}/${audience}`);
    assert.equal(researchConclusionPreview(f.run, { audience }).conclusion, reading.conclusion);
    assert.ok(researchConclusionPreview(f.run, { audience }).credits.length >= 2);
  }
});

test('public records need no personal consent; hearing a private account does not release it', () => {
  const f = ready(); hearMaker(f); permission(f.run, 'quote', 'refused', 10);
  assert.equal(validateResearchRun(f.run, f.s), true);
  assert.ok(researchConclusionPreview(f.run, { audience: 'public', quoteSourceIds: ['repair_shares'] }));
  assert.equal(researchConclusionPreview(f.run, { audience: 'public', quoteSourceIds: ['maker_margin'] }), null);
  assert.ok(researchConclusionPreview(f.run, { audience: 'self', quoteSourceIds: ['maker_margin'] }));
  finish(f, 'public', ['repair_shares']); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  f.run.finalization.quoteSourceIds.push('maker_margin'); assert.equal(validateResearchRun(f.run, f.s), false);
});

test('personal quotation needs exact-person, exact-owner, timely scoped consent', () => {
  const f = ready(); hearMaker(f); permission(f.run, 'quote', 'willing', 10); finish(f, 'private', ['maker_margin']);
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  for (const change of [{ personId: 'clerk-one' }, { ownerId: 'heir-two' }, { scope: 'all-future-uses' }, { day: 20 }]) {
    const run = clone(f.run); Object.assign(run.permissions[1], change);
    if (change.day) run.evidence.find(row => row.id === 'consent-quote-maker_margin').day = change.day;
    assert.equal(validateResearchRun(run, f.s), false, JSON.stringify(change));
  }
  const refused = clone(f.run); refused.permissions[0].decision = 'refused'; refused.evidence.find(row => row.id === 'consent-hear-maker_margin').disposition = 'refused';
  assert.equal(validateResearchRun(refused, f.s), false, 'verified refusal cannot support testimony');
});

test('explicit dated custody moves only public copying, not the original speaker or memory', () => {
  const f = fixture(); acquire(f.run, 'axle_rubbing', 3);
  f.s.npcContinuity.people['clerk-one'].retiredDay = 10;
  const next = addPerson(f.s, 'clerk-two', 'archivist', 'Elowen', 10);
  const ref = captureResearchActor(next, { serviceKind: 'archivist', roomId: 'archive', day: 10 });
  f.run.custody.push({ day: 10, fromId: 'clerk-one', to: ref, sourceRevision: 1 });
  acquire(f.run, 'repair_shares', 10); compare(f.run, 11); selectResearchInterpretation(f.run, 'shared_repair');
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  assert.equal(f.run.evidence[0].actorIds[0], 'clerk-one'); assert.equal(f.run.evidence[1].actorIds[0], 'clerk-two');
  const alias = clone(f.run); alias.evidence[0].actorIds = ['clerk-two']; assert.equal(validateResearchRun(alias, f.s), false);
  const backdate = clone(f.run); backdate.custody[0].day = 5; assert.equal(validateResearchRun(backdate, f.s), false);
  const expired = clone(f.run); expired.steps[1].actorId = 'clerk-one'; assert.equal(validateResearchRun(expired, f.s), false);
});

test('actual recipient receipt is necessary for specific later recall; no self or heir telepathy', () => {
  const self = finish(ready()); assert.equal(researchRecallCandidate(self.s, 'clerk-one'), null);
  const f = finish(ready(), 'private'), candidate = researchRecallCandidate(f.s, 'clerk-one');
  assert.equal(candidate.interpretationId, 'shared_repair'); assert.match(candidate.recall, /share of flour/);
  assert.equal(researchRecallCandidate(f.s, 'maker-one'), null);
  f.s.day = 12; assert.equal(researchRecallCandidate(f.s, 'clerk-one'), null, 'not a same-day invented return'); f.s.day = 30;
  const scene = researchRecallScene(f.run, f.s.npcContinuity.people['clerk-one'].snapshot), choice = scene.choices[0];
  f.s.conversations = { sequence: 3, threads: { 'clerk-one': [{ id: 'letter-1', speaker: 'clerk-one', text: scene.body, day: 15 }, { id: 'letter-2', speaker: 'hero', text: choice.text, day: 15 }, { id: 'letter-3', speaker: 'clerk-one', text: choice.response, day: 15 }] } };
  f.run.recalls.push({ personId: 'clerk-one', day: 15, interpretationId: 'shared_repair', openingId: 'letter-1', replyId: 'letter-3', choiceId: 'source' });
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true); assert.equal(researchRecallCandidate(f.s, 'clerk-one'), null);
  f.s.dynasty.activePersonId = 'heir-two'; f.s.dynasty.generation = 2;
  assert.equal(researchRecallCandidate(f.s, 'clerk-one'), null); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
});

test('one active case and one completed definition per life, with no automatic acceptance', () => {
  const f = fixture(), second = makeResearchRun({ ...f.s, day: 3 }, 'early_bell', { locationId: 'home', archivist: { ...f.run.cast.archivist, capturedDay: 3 } });
  f.s.researchPortfolio.invitations.early_bell = 'accepted'; f.s.researchPortfolio.runs.push(second);
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
  f.s.researchPortfolio.runs.pop(); delete f.s.researchPortfolio.invitations.early_bell;
  f.s.researchPortfolio.invitations.early_bell = 'later'; assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  f.s.researchPortfolio.runs.push(clone(f.run)); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
});

test('pending source/comparison proposals do not stand in for acquired evidence', () => {
  const f = fixture(); f.s.researchPortfolio.pending = { runId: f.run.id, sceneId: 'source', sourceId: 'axle_rubbing', actorId: 'clerk-one' };
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true); assert.equal(f.run.evidence.length, 0);
  f.s.researchPortfolio.pending.sceneId = 'compare'; f.s.researchPortfolio.pending.sourceId = null; f.s.researchPortfolio.pending.actorId = null;
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
});

test('interrupted one-day copy project is bounded and still supplies no acquired source', () => {
  const f = fixture();
  f.s.researchPortfolio.project = { runId: f.run.id, id: 'source-axle_rubbing', sourceId: 'axle_rubbing', mode: 'home-copy', actorId: 'clerk-one',
    locationId: 'home', roomId: 'homes', startedDay: 30, completedDay: null, days: 1, sourceRevision: 0, totalDays: 1, completedDays: 0, remainingDays: 1 };
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true); assert.equal(f.run.evidence.length, 0);
  f.s.researchPortfolio.project.completedDays = 1; assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
});

test('terminal folios cannot acquire later testimony or permissions', () => {
  const f = finish(ready(), 'private'); hearMaker(f); permission(f.run, 'quote', 'willing', 20);
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false);
});

test('malformed nested structures are rejected without throwing', () => {
  const f = ready(); hearMaker(f); permission(f.run, 'quote', 'willing', 10);
  for (const mutate of [run => { run.copies = [null]; }, run => { run.permissions = [null]; }, run => { run.steps = [null]; },
    run => { run.evidence = {}; }, run => { run.evidence = [null]; }, run => { run.cast = null; }, run => { run.custody = [null]; },
    run => { run.comparison = []; }, run => { run.recalls = [null]; }]) {
    const run = clone(f.run); mutate(run);
    assert.doesNotThrow(() => assert.equal(validateResearchRun(run, f.s), false));
  }
  f.s.researchPortfolio.runs = [null]; assert.doesNotThrow(() => assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), false));
});

test('pre-reconciliation proof retains same-day retirement, while a retired actor cannot begin new work', () => {
  const f = fixture(), ref = f.run.cast.archivist;
  const services = [{ personId: ref.id, kind: 'archivist', locationId: 'home', roomId: 'archive', person: f.s.npcContinuity.people[ref.id].snapshot }];
  assert.equal(researchActorAvailable(f.s, ref, services), true);
  acquire(f.run, 'axle_rubbing', 3);
  f.s.npcContinuity.people[ref.id].retiredDay = 4;
  assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true, 'proof completed before afterAction reconciliation remains valid on its retirement day');
  assert.equal(researchActorAvailable(f.s, ref, services), false, 'a known retirement blocks the next action, even on the same day');
  const later = clone(f.run); later.steps[0].completedDay = 5; later.copies[0].receivedDay = 5; later.evidence[0].day = 5;
  assert.equal(validateResearchRun(later, f.s), false, 'same-day historical boundary is not permission for proof on later days');
  const personal = ready(); hearMaker(personal); permission(personal.run, 'quote', 'willing', 9);
  personal.s.npcContinuity.people['maker-one'].retiredDay = 9;
  assert.equal(validateResearchRun(personal.run, personal.s), true, 'a consultation and consent completed before same-day reconciliation also survive');
});

test('literal research offers and run scenes require exact owner provenance, not just a flavor marker', () => {
  const s = state(), actor = captureResearchActor(s.npcContinuity.people['clerk-one'].snapshot, { serviceKind: 'archivist', roomId: 'archive', day: s.day });
  const context = { version: 1, definitionId: 'third_mark', locationId: 'home', archivist: actor, offeredDay: s.day };
  s.event = researchOfferScene(context);
  assert.equal(preserveResearchEvent(s, s.event), true); assert.equal(validateResearchScene(s), true); assert.equal(s.researchPortfolio, undefined);
  for (const change of [event => { event.body = 'Generic filler'; }, event => { event.choices[0].label = 'Grant all knowledge'; }, event => { event.researchOffer.archivist.id = 'other-clerk'; }, event => { event.researchOffer.extra = true; }]) {
    const event = clone(s.event); change(event); assert.equal(preserveResearchEvent(s, event), false);
  }
  const f = ready(); f.s.researchPortfolio.pending = { runId: f.run.id, sceneId: 'interpret', sourceId: null, actorId: null };
  f.s.event = researchRunScene(f.run, 'interpret'); assert.equal(preserveResearchEvent(f.s, f.s.event), true);
  assert.match(f.s.event.body, /ownership deed/); assert.ok(f.s.event.choices.some(choice => choice.id === 'ownership_chain'));
  const forged = clone(f.s.event); forged.body += ' An unrelated secret.'; assert.equal(preserveResearchEvent(f.s, forged), false);
  f.s.researchPortfolio.pending = null; assert.equal(preserveResearchEvent(f.s, f.s.event), false);
});

test('real reply receipt preserves a specific conclusion once and rejects successor or arbitrary pending text', () => {
  const f = finish(ready(), 'private'); f.s.cartography.interior.roomId = 'archive';
  const person = { ...f.s.npcContinuity.people['clerk-one'].snapshot, roomId: 'archive', available: true };
  const scene = researchConversation(f.s, person); assert.ok(scene); assert.match(scene.body, /share of flour/);
  const home = clone(f.s); home.cartography.interior.roomId = 'homes'; const unlocatedServicePerson = { ...person }; delete unlocatedServicePerson.roomId;
  assert.equal(researchConversation(home, unlocatedServicePerson), null, 'the actual captured archive room governs even when a derived service contact omits roomId');
  const otherTown = clone(f.s); otherTown.locationId = 'mill'; otherTown.cartography.interior = { siteId: 'mill', roomId: 'archive' };
  assert.equal(researchConversation(otherTown, unlocatedServicePerson), null, 'another settlement’s archive is not the original recipient’s location');
  assert.equal(researchConversation(f.s, { ...person, locationId: 'mill' }), null, 'the recipient cannot silently move to a different archive');
  const retired = clone(f.s); retired.npcContinuity.people[person.id].retiredDay = 20;
  addPerson(retired, 'clerk-successor', 'archivist', 'Another Clerk', 20);
  assert.equal(researchConversation(retired, person), null, 'a stale available projection does not revive a retired participant');
  assert.equal(researchConversation(retired, { ...retired.npcContinuity.people['clerk-successor'].snapshot, roomId: 'archive' }), null, 'the same role inherits no private memory');
  const deceased = clone(f.s); deceased.life = { people: [{ id: person.id, alive: false }] };
  assert.equal(researchConversation(deceased, person), null, 'a known death outranks a stale public projection');
  assert.equal(authenticResearchConversation(f.s, person, scene), true);
  const forged = clone(scene); forged.choices[0].effect.bond = 20; assert.equal(authenticResearchConversation(f.s, person, forged), false);
  assert.equal(researchConversation(f.s, { ...person, id: 'office-successor' }), null);
  const choice = scene.choices[0];
  f.s.conversations = { sequence: 3, threads: { [person.id]: [{ id: 'letter-1', speaker: person.id, text: scene.body, day: 30 }, { id: 'letter-2', speaker: 'hero', text: choice.text, day: 30 }, { id: 'letter-3', speaker: person.id, text: choice.response, day: 30 }] } };
  recordResearchConversation(f.s, person, scene, choice); assert.equal(f.run.recalls.length, 1); assert.equal(validateResearchPortfolio(f.s.researchPortfolio, f.s), true);
  recordResearchConversation(f.s, person, scene, choice); assert.equal(f.run.recalls.length, 1); assert.equal(researchConversation(f.s, person), null);
  const bad = clone(f.run); f.s.conversations.threads[person.id][2].text = 'An unperformed conclusion'; assert.equal(validateResearchRun(bad, f.s), false);
});

test('Home and archive folios render acquired provenance and uncertainty without mutating or publishing', () => {
  const f = ready(), escape = text => String(text ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const ui = { e: escape, actionCards: rows => rows.map(row => `<button>${escape(row.label)}</button>`).join('') };
  const before = clone(f.s), actions = [{ id: 'research_interpret', label: 'Test a reading' }];
  const home = renderResearchShelf(f.s, actions, ui);
  assert.match(home, /new local copy prepared/); assert.match(home, /Actual reading and custody/); assert.match(home, /original-builder line stays open/);
  assert.doesNotMatch(home, /practice piece bearing/); assert.deepEqual(f.s, before);
  finish(f); const archived = renderResearchArchive(f.s, ui); assert.match(archived, /Self-only/); assert.match(archived, /0 Gold earned/);
  assert.equal(renderResearchArchive(f.s, ui, { query: 'not-a-question' }), '');
});
