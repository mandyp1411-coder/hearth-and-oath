import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { researchDefinition } from '../dist/js/research-definitions.js';
import { validateResearchPortfolio } from '../dist/js/research-portfolio.js';
import { researchActions, applyResearchAction, applyResearchChoice, closeResearchLife } from '../dist/js/research-runtime.js';
import { settlementServices, serviceWalkPath } from '../dist/js/world-services.js';
import { getContacts } from '../dist/js/conversations.js';
import { journalCommitments } from '../dist/js/journal-commitments.js';
import { renderResearchArchive, renderResearchShelf } from '../dist/js/research-ui.js';
import { renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { editionEvent } from '../dist/js/narrative-edition.js';

// Controlled scenarios cloned from one genuine played save. They are not new
// full lifetimes, independent visual QA, or a substitute for release checks.
const raw = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base;
const base = E.migrateSave(raw);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const ui = { e: escape, button: (label, op, id = '', cls = '', disabled = false) => `<button data-op="${op}" data-id="${escape(id)}" ${disabled ? 'disabled' : ''}>${escape(label)}</button>`,
  actionCards: actions => actions.map(action => `<button data-op="activity" data-id="${escape(action.id)}" ${action.disabledReason ? 'disabled' : ''}>${escape(action.label)}</button>`).join(''),
  paragraphs: value => `<p>${escape(value)}</p>`, date: day => `Day ${day}`, livingCosts: () => '' };
function valid(s, label = '') { assert.equal(validateResearchPortfolio(s.researchPortfolio, s), true, `research owner ${label}`); assert.equal(E.validateSave(s), true, `whole save ${label}`); return s; }
function roundtrip(s) { valid(s); const next = E.migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(next, s); return next; }
function walk(s, target) {
  const path = serviceWalkPath(s, target); assert.ok(path, `connected room ${target}`);
  for (const room of path) s = act(s, `atlas_room_${room}`);
  return s;
}
function fresh() { assert.ok(base); return walk(structuredClone(base), 'homes'); }
function act(s, id) { const action = E.getActions(s).find(row => row.id === id); assert.ok(action, `${id} offered: ${s.notice}`); assert.ok(!action.disabledReason, `${id}: ${action.disabledReason}`); return E.chooseAction(s, id); }
function pick(s, id) { assert.ok(s.event?.choices.some(choice => choice.id === id), `${s.event?.id} offers ${id}`); return E.chooseEventOption(s, id); }
function accept(s, definitionId = 'third_mark') { s = act(s, `research_offer_${definitionId}`); assert.equal(s.researchPortfolio, undefined); s = roundtrip(s); s = pick(s, 'accept'); valid(s, 'accept'); return s; }
function sources(s, definitionId = 'third_mark') { for (const id of researchDefinition(definitionId).requiredSources) s = act(s, `research_copy_${id}`); return s; }
function comparison(s) { s = act(s, 'research_compare'); assert.match(s.event.body, /Limit:/); s = pick(s, 'compare'); assert.equal(s.researchPortfolio.project, null); assert.ok(s.researchPortfolio.runs.at(-1).comparison); return s; }
function reading(s, id = 'shared_repair') { s = act(s, 'research_interpret'); s = pick(s, id); return s; }
function finished(s = fresh(), { definitionId = 'third_mark', audience = 'self', interpretationId = definitionId === 'third_mark' ? 'shared_repair' : 'lantern_sequence' } = {}) {
  s = accept(s, definitionId); s = sources(s, definitionId); s = comparison(s); s = reading(s, interpretationId); s = act(s, 'research_conclude'); s = pick(s, audience); return s;
}
function context(s, { limit = Infinity, onSpend = () => {} } = {}) { return {
  spendDays(days) { const actual = Math.min(days, limit); s.day += actual; onSpend(actual); return actual; },
  setResearchEvent(snapshot) { s.event = editionEvent(s, snapshot); },
  journalLiteral(title, text, tag, meta) { s.journal.push({ id: `entry-${s.journal.length + 1}`, day: s.day, age: s.age, title, text, tag, ...meta, generation: s.dynasty.generation }); },
}; }

test('migration and pure Home/catalog views create no envelope, task or discovery', () => {
  let s = fresh(); const before = structuredClone(s);
  assert.equal(s.researchPortfolio, undefined); const actions = E.getActions(s);
  assert.equal(actions.filter(action => action.id.startsWith('research_offer_')).length, 2);
  assert.ok(!journalCommitments(s).some(row => row.kind === 'research'));
  assert.match(renderResearchShelf(s, actions, ui), /two finite questions/); assert.deepEqual(s, before);
  s = act(s, 'research_offer_third_mark'); assert.match(s.event.body, /three people who kept it turning/); assert.equal(s.researchPortfolio, undefined); roundtrip(s);
  s = pick(s, 'later'); assert.equal(s.researchPortfolio.runs.length, 0); assert.equal(s.day, before.day); assert.equal(s.hero.skills.scholarship, before.hero.skills.scholarship);
  s = act(s, 'research_offer_third_mark'); s = pick(s, 'decline'); assert.equal(s.researchPortfolio.runs.length, 0); roundtrip(s);
  s = act(s, 'research_reconsider_third_mark'); assert.equal(s.researchPortfolio.invitations.third_mark, 'later'); assert.ok(!journalCommitments(s).some(row => row.kind === 'research'));
});

for (const definitionId of ['third_mark', 'early_bell']) test(`${definitionId}: the whole civilian research route works from actual lodgings, without a profession or class gate`, () => {
  let s = fresh(); const original = structuredClone(s), home = s.locationId, initial = s.hero.skills.scholarship;
  assert.equal(s.life.home.tier, 'lodgings'); assert.equal(s.hero.path, 'unformed'); assert.notEqual(s.hero.profession, 'Scholar');
  s = finished(s, { definitionId }); const run = s.researchPortfolio.runs[0];
  assert.equal(run.status, 'completed'); assert.equal(s.hero.skills.scholarship, initial + 1); assert.equal(s.hero.profession, original.hero.profession);
  assert.equal(s.hero.path, original.hero.path); assert.equal(s.life.home.tier, 'lodgings'); assert.equal(s.locationId, home); assert.equal(s.cartography.interior.roomId, 'homes');
  assert.equal(s.day - original.day, researchDefinition(definitionId).requiredSources.length + 1);
  assert.ok(s.hero.gold <= original.hero.gold, 'living costs can accrue, but research pays no Gold');
  assert.deepEqual(s.careers.records, original.careers.records, 'research is not a paid shift or commission');
  assert.ok(run.copies.every(copy => copy.custodyLocationId === home && copy.originLocationId !== home && copy.preparedDay > copy.requestedDay));
  assert.ok(run.evidence.every(proof => proof.locationId === home && proof.kind !== 'arrival'));
  assert.equal(E.getActions(s).some(action => action.id === `research_offer_${definitionId}`), false);
  const again = E.chooseAction(s, 'research_compare'); assert.equal(again.hero.skills.scholarship, s.hero.skills.scholarship); assert.deepEqual(again.researchPortfolio, s.researchPortfolio);
  assert.match(renderResearchArchive(s, ui), /Research folios/); assert.match(renderSimpleJournal(s, [], { ...ui, section: 'archive' }), /Research folios/);
  assert.match(s.journal.filter(entry => entry.tag === 'research').at(-1).text, definitionId === 'third_mark' ? /share of flour is not ownership/ : /lights carried a warning before the order/);
  roundtrip(s);
});

test('a Scholar also finishes at home and keeps existing paid work separate', () => {
  let s = fresh(); const work = settlementServices(s).find(row => row.kind === 'work'); s = walk(s, work.roomId);
  // One rulebook (v0.72.3): the archive takes a scholar only with a grammar school certificate; this
  // controlled life carries one, as the society fixtures' QA scholar does.
  s.education.qualifications.push({ id: 'academy-certificate', label: 'Academy certificate', route: 'academy', schoolId: 'school-academy', grade: 72, day: s.day, age: Math.min(17, s.age) });
  s = act(s, 'career_choose_scholar'); s = walk(s, 'homes');
  const before = structuredClone(s), home = s.locationId; s = finished(s);
  assert.equal(s.hero.profession, 'Scholar'); assert.equal(s.locationId, home); assert.equal(s.cartography.interior.roomId, 'homes');
  assert.deepEqual(s.careers.records.Scholar, before.careers.records.Scholar); assert.ok(s.hero.gold <= before.hero.gold);
  roundtrip(s);
});

test('a wrong reading remains revisable and does not repeat comparison practice', () => {
  let s = comparison(sources(accept(fresh()))), initial = s.hero.skills.scholarship;
  s = reading(s, 'ownership_chain'); assert.equal(s.researchPortfolio.runs[0].status, 'active'); assert.match(s.notice, /payment, not a sale/); assert.equal(s.hero.skills.scholarship, initial);
  assert.equal(E.getActions(s).some(row => row.id === 'research_conclude'), false); roundtrip(s);
  s = reading(s, 'older_marks_open'); s = act(s, 'research_conclude'); s = pick(s, 'self');
  assert.equal(s.researchPortfolio.runs[0].status, 'completed'); assert.equal(s.hero.skills.scholarship, initial); assert.match(s.notice, /older marks.*unresolved/); roundtrip(s);
});

test('a received private finding is recalled by the exact living NPC in an actual later conversation', () => {
  let s = finished(fresh(), { audience: 'private' }); const run = s.researchPortfolio.runs[0], recipient = run.finalization.recipientId;
  assert.ok(run.evidence.some(proof => proof.id === 'deposit')); assert.equal(run.finalization.audience, 'private');
  // Another actual local source day establishes a genuinely later meeting.
  s = act(s, 'research_offer_early_bell'); s = pick(s, 'accept'); s = act(s, 'research_copy_warning_log');
  s = walk(s, 'archive'); assert.ok(getContacts(s).some(person => person.id === recipient)); s = act(s, `talk_${recipient}`);
  assert.equal(s.conversations.pending.nodeId, 'research_recall'); assert.match(s.conversations.pending.snapshot.body, /share of flour/); s = roundtrip(s);
  const moved = structuredClone(s), sequence = moved.conversations.sequence; moved.cartography.interior.roomId = 'homes';
  const notHere = E.replyMessage(moved, recipient, 'source'); assert.equal(notHere.conversations.pending, null); assert.equal(notHere.conversations.sequence, sequence); assert.equal(notHere.researchPortfolio.runs[0].recalls.length, 0);
  const before = { day: s.day, gold: s.hero.gold, skills: structuredClone(s.hero.skills) }; s = E.replyMessage(s, recipient, 'source');
  assert.equal(s.researchPortfolio.runs[0].recalls.length, 1); assert.match(s.conversations.relationships[recipient].memories.at(-1), /specific finding/);
  assert.equal(s.day, before.day); assert.equal(s.hero.gold, before.gold); assert.deepEqual(s.hero.skills, before.skills); roundtrip(s);
  s = E.replyMessage(s, recipient, 'source'); assert.equal(s.researchPortfolio.runs[0].recalls.length, 1);
});

test('public copying does not unlock generic remote dialogue or private testimony at home', () => {
  let s = sources(accept(fresh())); const archivist = s.researchPortfolio.runs[0].cast.archivist;
  const remote = E.getActions(s).find(row => row.id === `talk_${archivist.id}`); assert.ok(!remote || remote.disabledReason, 'the ordinary service access layer blocks archive talk from Homes');
  const remoteAttempt = E.chooseAction(s, `talk_${archivist.id}`); assert.equal(remoteAttempt.conversations.sequence, s.conversations.sequence); assert.equal(remoteAttempt.conversations.pending, null);
  assert.ok(E.getActions(s).find(row => row.id === 'research_consult').disabledReason);
  const before = structuredClone(s.researchPortfolio), denied = E.chooseAction(s, 'research_consult'); assert.deepEqual(denied.researchPortfolio, before);
  const maker = settlementServices(s).find(row => row.kind === 'smith'); s = walk(s, maker.roomId); s = act(s, 'research_consult'); assert.equal(s.researchPortfolio.runs[0].evidence.some(proof => proof.id === 'source-maker_margin'), false);
  s = pick(s, 'hear'); assert.ok(s.researchPortfolio.runs[0].evidence.some(proof => proof.id === 'source-maker_margin'));
  assert.equal(s.researchPortfolio.runs[0].permissions.some(permission => permission.scope === 'quote'), false); roundtrip(s);
  s = act(s, 'research_quote'); s = pick(s, 'ask'); const answer = s.researchPortfolio.runs[0].permissions.find(permission => permission.scope === 'quote'); assert.ok(['willing', 'refused'].includes(answer.decision));
  s = walk(s, 'homes'); s = comparison(s); s = reading(s); s = act(s, 'research_conclude');
  assert.equal(s.event.choices.some(choice => choice.id === 'public_quote'), answer.decision === 'willing');
  s = pick(s, 'public'); assert.equal(s.researchPortfolio.runs[0].finalization.quoteSourceIds.length, 0); roundtrip(s);
});

test('a due calendar interruption saves the exact unworked copy, then resumes only remaining attendance', () => {
  let s = accept(fresh()), before = s.day;
  s.obligations.push({ id: 'research-controlled-deadline', title: 'A previously accepted promise', description: 'Controlled interruption fixture.', dueDay: s.day, resolved: false });
  s = act(s, 'research_copy_axle_rubbing'); assert.equal(s.day, before); assert.equal(s.researchPortfolio.project.remainingDays, 1); assert.equal(s.researchPortfolio.runs[0].copies.length, 0); assert.equal(s.event.id, 'annual_deadline_review'); s = roundtrip(s);
  s = pick(s, 'pause'); s = act(s, 'research_continue'); assert.equal(s.day, before + 1); assert.equal(s.researchPortfolio.project, null); assert.equal(s.researchPortfolio.runs[0].copies.length, 1); roundtrip(s);
});

test('zero attendance and cancellation retain no phantom source and private consultation can be resumed', () => {
  let s = sources(accept(fresh())); const maker = settlementServices(s).find(row => row.kind === 'smith'); s = walk(s, maker.roomId);
  assert.equal(applyResearchAction(s, 'research_consult', context(s)), true); const event = s.event; s.event = null;
  assert.equal(applyResearchChoice(s, event, 'hear', context(s, { limit: 0 })), true); assert.ok(s.researchPortfolio.project); assert.equal(s.researchPortfolio.runs[0].evidence.some(proof => proof.id === 'source-maker_margin'), false);
  assert.equal(applyResearchAction(s, 'research_cancel', context(s)), true);
  assert.equal(applyResearchAction(s, 'research_consult', context(s)), true); assert.equal(s.researchPortfolio.runs[0].permissions.filter(permission => permission.scope === 'hear').length, 1);
  assert.ok(s.researchPortfolio.runs[0].evidence.some(proof => proof.id === 'source-maker_margin')); valid(s);
});

test('the owner rejects forged import evidence, private releases and recipient conversation text', () => {
  const s = finished(fresh(), { audience: 'public' });
  for (const mutate of [run => { run.evidence[0].kind = 'arrival'; }, run => { run.copies[0].originLocationId = s.locationId; }, run => { run.finalization.quoteSourceIds = ['maker_margin']; }, run => { run.claims[0].text = 'A fabricated ownership deed'; }, run => { run.cast.archivist.name = 'Another person in the same office'; }]) {
    const bad = structuredClone(s); mutate(bad.researchPortfolio.runs[0]); assert.equal(E.validateSave(bad), false);
  }
});

test('the focused life-closure adapter records unfinished work without a verdict or reward', () => {
  let s = accept(fresh()); s = act(s, 'research_copy_axle_rubbing'); const skill = s.hero.skills.scholarship;
  // This is the lifecycle adapter, not a played retirement at the fixture’s age 22.
  closeResearchLife(s); assert.equal(s.researchPortfolio.runs[0].status, 'interrupted'); assert.equal(s.researchPortfolio.activeRunId, null); assert.equal(s.researchPortfolio.project, null); assert.equal(s.hero.skills.scholarship, skill); valid(s);
});
