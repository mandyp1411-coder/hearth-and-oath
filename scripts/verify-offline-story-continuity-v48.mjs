// Run serially, after the exact current v0.48-or-later build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-story-continuity-v48.mjs
// One unmodified standalone module graph, actual delegated handlers, disposable
// in-memory fixture copies only. This is bounded semantic acceptance evidence,
// not browser/layout/screen-reader, natural-death or earned-lifetime evidence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import { validateOfflineIdentity, validateUnchangedOfflineIdentity } from './lib/release-identity.mjs';
import * as E from '../dist/js/engine.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { RPG_FACTIONS_V27 } from '../dist/js/rpg-depth-v27.js';
import { firstMissionJournalRow } from '../dist/js/faction-first-missions.js';
import { evidenceFor } from '../dist/js/objective-evidence.js';
import { projectLifePerson } from '../dist/js/world-people-v31.js';
import { registerWorldLifeRecord } from '../dist/js/lineage.js';
import { initializeFamilyDepth } from '../dist/js/household.js';
import { reconcileNpcContinuity, validateNpcContinuity } from '../dist/js/npc-continuity.js';
import { initializeFamilyOrigins } from '../dist/js/family-origins.js';
import { seededRoll } from '../dist/js/world.js';

const root = new URL('../', import.meta.url), rootPath = fileURLToPath(root);
const read = path => readFileSync(new URL(path, root));
const copy = value => structuredClone(value);
const version = JSON.parse(read('package.json')).version;
assert.ok(/^0\.\d+\.\d+$/.test(version) && Number(version.split('.')[1]) >= 48,
  'this acceptance gate requires the current v0.48-or-later source');
// Shared strict gate checks schema 2, current runtime/build inputs, every ordered
// part checksum, no extra/missing parts, whole artifact and exact hosted loader.
const identity = await validateOfflineIdentity(rootPath);
const manifest = JSON.parse(read('dist/offline/manifest.json'));
assert.equal(manifest.schemaVersion, 2);
assert.equal(identity.version, version);
let bytes = read('artifacts/hearth-and-oath.html');
assert.equal(bytes.length, identity.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'), identity.sha256,
  'the exact bytes about to execute are the validated standalone');
let offset = 0;
for (const [index, entry] of manifest.parts.entries()) {
  assert.equal(entry.file, `game-${String(index + 1).padStart(2, '0')}.part`);
  const part = read('dist/offline/' + entry.file);
  assert.equal(part.length, entry.bytes);
  assert.ok(part.equals(bytes.subarray(offset, offset + part.length)),
    entry.file + ': exact ordered standalone bytes');
  offset += part.length;
}
assert.equal(offset, bytes.length, 'ordered parts cover the entire artifact');
let html = installOfflineDocument(bytes.toString('utf8')); bytes = null;
assert.ok(html.includes('v' + version), 'standalone identifies the current release');
const moduleTag = '<script type="module">', start = html.indexOf(moduleTag);
assert.ok(start >= 0, 'actual standalone contains its embedded entry');
const end = html.indexOf('</script>', start + moduleTag.length);
assert.ok(end > start);
assert.equal(html.indexOf(moduleTag, end), -1, 'one embedded module graph only');
assert.equal([...html.matchAll(/<script\b/g)].length, 3,
  'the embedded graph, inert media and retained production boot guard');
assert.ok(html.includes('<script id="boot-guard">'), 'production boot guard is retained');
let code = html.slice(start + moduleTag.length, end); html = null;
assert.doesNotMatch(code, /^import\s/m, 'embedded module graph has no external static imports');
let compiled = new Script(code, { filename: 'standalone-story-continuity-v48.js' }); code = null;
globalThis.gc?.();

function valid(state, label = 'controlled whole save') {
  assert.ok(E.validateSave(state), label + ': ' + state?.notice);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(state))), state,
    label + ': exact source reload');
  return state;
}
function action(state, id) {
  const row = E.getActions(state).find(a => a.id === id);
  assert.ok(row, 'genuinely offered source action ' + id);
  assert.equal(row.disabledReason, undefined, id + ': ' + row.disabledReason);
  return valid(E.chooseAction(state, id), id);
}
function choice(state, id) {
  assert.ok(state.event?.choices.some(row => row.id === id && !row.disabledReason),
    'genuinely offered source choice ' + id);
  return valid(E.chooseEventOption(state, id), 'choice ' + id);
}
function walk(state, room) {
  const path = settlementWalkPath(state, room);
  assert.ok(path, 'real current-settlement room route ' + room);
  for (const id of path) state = action(state, 'atlas_room_' + id);
  return state;
}
function settle(state) {
  for (let count = 0; state.event && count < 20; count++) {
    const row = state.event.choices.find(c =>
      ['continue', 'conclude_correct', 'care', 'avoid', 'leave', 'later', 'pause'].includes(c.id) && !c.disabledReason)
      || state.event.choices.find(c => !c.disabledReason);
    assert.ok(row, 'bounded fixture interruption has a legitimate response');
    state = choice(state, row.id);
  }
  assert.equal(state.event, null, 'bounded fixture interruptions settle');
  return state;
}
// Controlled recorded-death vacancy, identical to the integrated source test.
// This does not claim a naturally played death or alter a live browser/storage.
function vacancy(state, ref) {
  const old = settlementServices(state, { siteId: ref.locationId }).find(r => r.personId === ref.id);
  assert.ok(old, 'actual current public actor before the controlled vacancy');
  const person = projectLifePerson(state, { ...old.person, roomId: old.roomId });
  assert.ok(person); person.alive = false; person.deathDay = state.day;
  registerWorldLifeRecord(state, person); initializeFamilyDepth(state); reconcileNpcContinuity(state);
  assert.ok(validateNpcContinuity(state));
  assert.equal(state.npcContinuity.people[ref.id].retiredDay, state.day);
  const next = settlementServices(state, { siteId: ref.locationId })
    .find(r => r.kind === old.kind && r.subjectId === old.subjectId);
  assert.ok(next); assert.notEqual(next.personId, ref.id);
  valid(state, 'recorded public vacancy'); return next;
}
const mission = state => state.rpg.factions.find(f => f.id === 'quiet_table').firstMission;
function nextMissionStep(state) {
  const row = firstMissionJournalRow(state, state.rpg.factions.find(f => f.id === 'quiet_table'));
  assert.equal(row.locationId, state.locationId, 'relay fixture uses the actual settlement');
  return settle(action(walk(state, row.roomId), row.actionId));
}
const base = valid(E.migrateSave(JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz'))).states.base));

// Fixture 1 stops after genuine relay receipt and a controlled vacancy, before
// the actual downloaded Journal custody/report commands under examination.
let faction = copy(base);
const definition = RPG_FACTIONS_V27.find(f => f.id === 'quiet_table');
const place = faction.world.locations.find(p =>
  faction.realm.sites[p.id]?.regionId === definition.regionId
  && settlementServices(faction, { siteId: p.id }).some(r => r.kind === 'faction' && r.subjectId === definition.id));
assert.ok(place); faction.locationId = place.id; syncCartography(faction);
faction.hero.skills.persuasion = 4; faction.hero.skills.stealth = 4;
faction = valid(E.migrateSave(faction), 'normalized controlled faction location');
const sender = settlementServices(faction).find(r => r.kind === 'faction' && r.subjectId === definition.id);
faction = walk(faction, sender.roomId);
faction = action(faction, 'rpg_join_quiet_table'); faction = action(faction, 'rpg_faction_quiet_table');
faction = choice(faction, 'accept_relay');
assert.equal(mission(faction).values.recipientWilling, true, 'fixed fixture has the authored willing relay branch');
for (let count = 0; count < 3; count++) faction = nextMissionStep(faction);
const originalMission = copy(mission(faction)), originalReceipt = copy(evidenceFor(originalMission, 'relay_receipt'));
const originalSender = copy(originalMission.cast.faction);
assert.ok(originalReceipt.actorIds.includes(originalSender.id)); assert.equal(originalReceipt.sourceRevision, 0);
const successor = vacancy(faction, originalSender); faction = walk(faction, successor.roomId);
assert.equal(faction.day, originalReceipt.day, 'same-day vacancy distinguishes custody by revision, not elapsed day');
valid(faction, 'before downloaded explicit custody');

// Fixture 2 stops after the valid public archivist handover, before acceptance.
// Select an actually offered next-day walk only if the authored acceptance-day
// response would be refusal. Never edit a response, participant or proof token.
let family = copy(base); family.event = null; family.battle = null; family.flags.familyOriginInterest = true;
for (const key of ['birthThread', 'birthVisitor', 'birthName', 'cradleSong', 'firstWord']) delete family.timeline.storybook.flags[key];
family.timeline.storybook.flags.birthThread = 'registered';
const guardian = family.life.people.find(p => p.id === 'kin');
family.locationId = guardian.locationId; syncCartography(family); family.realm.sites[family.locationId].hasShrine = true;
delete family.familyOrigins; initializeFamilyOrigins(family);
family = valid(E.migrateSave(family), 'normalized controlled family setup'); family = walk(family, 'archive');
const oldArchivist = copy(settlementServices(family).find(r => r.kind === 'archivist'));
const archivist = vacancy(family, { id: oldArchivist.personId, locationId: family.locationId });
for (let count = 0; count < 8 && seededRoll(family.seed,
  `family-origin-${family.dynasty.generation}-${family.day}:custodian-response`, 5) === 0; count++) {
  family = settle(action(family, 'leisure_walk'));
}
assert.notEqual(seededRoll(family.seed,
  `family-origin-${family.dynasty.generation}-${family.day}:custodian-response`, 5), 0,
  'bounded actual walks reach the authored willing account');
family = walk(family, 'homes'); valid(family, 'before downloaded family acceptance');
assert.equal(family.familyOrigins.run, null);
const familySource = copy(family.timeline.storybook);
const expectedSlots = [faction, family, base].map(state => copy(valid(state)));

// The only storage is this disposable Map. No host or browser localStorage is
// read, replaced or imported. All exported JSON Blobs remain in this process.
const ui = fakeSurface(), slotsKey = 'hearth-and-oath:slots:v1', lifeKey = 'hearth-and-oath:life:v1';
const seededEnvelope = { version: 1, activeSlot: 0, backups: {}, slots: expectedSlots.map((state, id) =>
  ({ id, state, updatedAt: '2026-10-17T00:00:00.000Z', revision: 'story-v48-controlled-' + id })) };
ui.storage.setItem(slotsKey, JSON.stringify(seededEnvelope)); ui.storage.setItem(lifeKey, JSON.stringify(faction));
let networkAttempts = 0, timerId = 0, downloadClicks = 0, revoked = 0, slot = 0;
const timers = new Map(), exports = [], urls = new Set();
function noNetwork() { networkAttempts++; throw Error('Network forbidden during downloaded story-handler verification'); }
class OfflineURL extends URL {
  static createObjectURL(blob) {
    assert.ok(blob instanceof Blob); exports.push(blob);
    const url = 'blob:story-v48-' + exports.length; urls.add(url); return url;
  }
  static revokeObjectURL(url) { assert.ok(urls.delete(url), 'export object URL revoked once'); revoked++; }
}
ui.document.createElement = tag => { assert.equal(tag, 'a'); return { click() { downloadClicks++; } }; };
const context = createContext({
  document: ui.document, localStorage: ui.storage, FormData: ui.FormData,
  window: { innerWidth: 431, innerHeight: 900, scrollTo() {}, scrollBy() {} },
  location: { href: 'file:///downloads/hearth-and-oath.html', protocol: 'file:' },
  requestAnimationFrame(callback) { callback(); return 1; },
  getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  Blob, URL: OfflineURL, TextEncoder, TextDecoder, console, queueMicrotask,
  fetch: noNetwork, XMLHttpRequest: class { constructor() { noNetwork(); } },
  WebSocket: class { constructor() { noNetwork(); } },
});
new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);
compiled.runInContext(context, { timeout: 30000 }); compiled = null; globalThis.gc?.();
const embeddedValidity = new Script('__engine.validateSave(JSON.parse(globalThis.qaSave))');
const embeddedMigration = new Script('__engine.migrateSave(JSON.parse(globalThis.qaSave))');
const durable = () => JSON.parse(ui.storage.getItem(slotsKey));
let parityChecks = 0, acceptedHandlers = 0;
function parity(label) {
  const actual = ui.current(); valid(actual, label);
  assert.deepEqual(actual, expectedSlots[slot], label + ': entire embedded/source current life');
  assert.deepEqual(ui.lives(), expectedSlots, label + ': all three complete independent lives');
  assert.deepEqual(durable().slots[2], seededEnvelope.slots[2], label + ': untouched third-slot bytes/metadata');
  assert.deepEqual(durable().backups, {}, label + ': no replacement/recovery histories invented');
  assert.equal(networkAttempts, 0, label + ': no network attempts'); parityChecks++;
}
function rendered(op, id, within = ui.root) {
  const selector = `[data-op="${op}"]${id === undefined ? '' : `[data-id="${id}"]`}`;
  const node = within.querySelector(selector);
  assert.ok(node && !node.disabled && node.isConnected, 'actual enabled rendered command ' + op + '/' + (id ?? ''));
  for (let parent = node; parent; parent = parent.parentElement) {
    assert.equal(parent.hidden, false, 'command is not in a hidden semantic subtree');
    if (parent.tagName === 'DETAILS') assert.ok(parent.open, 'native disclosure is open before command activation');
  }
  return node;
}
async function click(op, id, { within = ui.root, label = op + '/' + (id ?? '') } = {}) {
  const before = durable(), node = rendered(op, id, within);
  await ui.fire('click', node); parity(label);
  for (const row of before.slots) if (row.id !== slot) {
    assert.deepEqual(durable().slots[row.id], row, label + ': neighboring slot state/revision/timestamp preserved');
  }
  return node;
}
async function disclose(selector) {
  const node = ui.root.querySelector(selector); assert.ok(node, 'actual native disclosure ' + selector);
  node.open = true; await ui.fire('toggle', node); parity('open ' + selector); return node;
}
async function journal(section = 'active') {
  await click('menu', 'header'); await click('tab', 'journal');
  await click('workspace-section', 'journal:' + section);
}
async function journalCard(key) {
  await journal(); await disclose('[data-journal-commitments]');
  const card = ui.root.querySelector(`[data-commitment="${key}"]`);
  assert.ok(card, 'actual current Journal commitment ' + key); return card;
}
async function command(id, within, label = id) {
  expectedSlots[slot] = action(expectedSlots[slot], id);
  await click('activity', id, { within, label }); acceptedHandlers++;
}
async function pick(id, label = 'choice ' + id) {
  expectedSlots[slot] = choice(expectedSlots[slot], id);
  await click('choice', id, { label }); acceptedHandlers++;
}
async function load(id) {
  await click('title-menu'); await click('title-load'); slot = id;
  await click('slot-load', String(id), { label: 'reload complete controlled slot ' + id });
  globalThis.gc?.();
}
async function exportCurrent(label) {
  const before = exports.length;
  await click('menu', 'header'); await click('export', undefined, { label });
  assert.equal(exports.length, before + 1); assert.equal(exports.at(-1).type, 'application/json');
  assert.deepEqual(JSON.parse(await exports.at(-1).text()), expectedSlots[slot], label + ': exact whole-life export');
  for (const [id, timer] of [...timers]) if (timer.delay === 1000) { timers.delete(id); timer.callback(); }
  assert.equal(urls.size, 0); await click('close-modal');
}
function rejects(state, label) {
  assert.equal(E.validateSave(state), false, label + ': source owner rejects');
  assert.equal(E.migrateSave(copy(state)), null, label + ': source import rejects');
  // JSON models the actual save boundary; cross-realm host objects are never
  // passed to an embedded validator whose plain-object contract would reject
  // them for a reason unrelated to this negative ownership proof.
  context.qaSave = JSON.stringify(state);
  assert.equal(embeddedValidity.runInContext(context), false, label + ': embedded owner rejects');
  assert.equal(embeddedMigration.runInContext(context), null, label + ': embedded import rejects');
  delete context.qaSave;
}

await click('title-continue', undefined, { label: 'mount actual downloaded faction life' });
let card = await journalCard('faction:quiet_table');
assert.ok(card.textContent.includes(successor.name));
const custodyDay = expectedSlots[slot].day;
const detachedCustody = await command('rpg_objective_quiet_table__custody', card,
  'Journal explicitly accepts successor custody without rewriting old evidence');
assert.equal(expectedSlots[slot].day, custodyDay);
assert.equal(mission(ui.current()).custody[0].day, originalReceipt.day);
assert.equal(mission(ui.current()).custody[0].to.id, successor.personId);
assert.deepEqual(mission(ui.current()).evidence, originalMission.evidence,
  'custody transfers remaining public work, not old authorship, consent or proof');
assert.deepEqual(mission(ui.current()).cast, originalMission.cast, 'original accepted cast remains historical');
card = await journalCard('faction:quiet_table');
const report = firstMissionJournalRow(expectedSlots[slot], expectedSlots[slot].rpg.factions.find(f => f.id === 'quiet_table'));
assert.equal(report.actionId, 'rpg_objective_quiet_table__report');
await command(report.actionId, card, 'Journal files the completed report under the explicit new custodian');
assert.equal(mission(ui.current()).status, 'completed');
assert.equal(evidenceFor(mission(ui.current()), 'report').sourceRevision, 1);
assert.ok(evidenceFor(mission(ui.current()), 'report').actorIds.includes(successor.personId));
assert.deepEqual(evidenceFor(mission(ui.current()), 'relay_receipt'), originalReceipt);
for (const [label, mutate] of [
  ['old receipt relabeled to successor', m => { evidenceFor(m, 'relay_receipt').actorIds = evidenceFor(m, 'relay_receipt').actorIds.map(id => id === originalSender.id ? successor.personId : id); }],
  ['same-day old receipt assigned later source revision', m => { evidenceFor(m, 'relay_receipt').sourceRevision = 1; }],
  ['new report attributed to departed sender', m => { evidenceFor(m, 'report').actorIds = [originalSender.id]; }],
]) { const bad = copy(expectedSlots[slot]); mutate(mission(bad)); rejects(bad, label); }
await exportCurrent('completed faction JSON export'); await load(0);
assert.deepEqual(evidenceFor(mission(ui.current()), 'relay_receipt'), originalReceipt, 'reload preserves exact old authors and revision');

await load(1); await journal(); await disclose('[data-family-origin-invitation]');
await command('origin_accept', ui.root.querySelector('[data-family-origin-invitation]'), 'Journal accepts the single optional family search');
assert.equal(ui.current().familyOrigins.run.cast.archivist.id, archivist.personId,
  'acceptance captures the actual post-handover archivist, not an old office alias');
const acceptedAnchor = copy(ui.current().familyOrigins.run.anchor), acceptedFamily = copy(ui.current().familyOrigins.run.family);
card = await journalCard('family-origin');
await command('origin_guardian', card, 'Journal opens the actual caregiver scene');
assert.equal(ui.current().event.id, 'origin_guardian'); await pick('object');
assert.ok(evidenceFor(ui.current().familyOrigins.run, 'guardian_account'));

// Exact production activity-visit behavior: offered walking actions followed by
// E.visitService, including conversation service-person/meeting bookkeeping.
// Merely walking to the room or changing interior coordinates is not equivalent.
async function visitFromJournal(ref, kind) {
  const card = await journalCard('family-origin');
  const provider = settlementServices(expectedSlots[slot])
    .find(row => row.personId === ref.id && row.locationId === ref.locationId && row.roomId === ref.roomId);
  assert.ok(provider && provider.kind === kind, 'exact actual current ' + kind);
  assert.equal(provider.here, false, 'Journal offers a real visit before the next scene');
  expectedSlots[slot] = walk(expectedSlots[slot], provider.roomId);
  const arrived = settlementServices(expectedSlots[slot]).find(row => row.id === provider.id && row.here);
  assert.ok(arrived, 'same exact provider remains present after actual walking');
  expectedSlots[slot] = valid(E.visitService(expectedSlots[slot], provider.id), 'source exact activity-visit ' + kind);
  await click('activity-visit', provider.id, { within: card, label: 'Journal walks to and visits the exact ' + kind });
  assert.ok(ui.current().conversations.meetings[ref.id], 'actual provider meeting is recorded');
  assert.ok(ui.root.querySelector('.service-meeting'), 'actual provider meeting is rendered'); acceptedHandlers++;
  return provider;
}
await visitFromJournal(copy(ui.current().familyOrigins.run.cast.archivist), 'archivist');
await command('origin_register', ui.root.querySelector('.service-meeting'), 'actual successor archivist opens the register proposal');
assert.equal(ui.current().event.id, 'origin_register'); await pick('inspect');
let run = ui.current().familyOrigins.run;
assert.ok(run.cast.lead, 'real register comparison supplies a concrete current-custody lead');
assert.deepEqual(evidenceFor(run, 'register_inspected').actorIds, [archivist.personId]);
assert.equal(Object.hasOwn(evidenceFor(run, 'register_inspected'), 'sourceRevision'), false,
  'family inspection does not invent faction custody-revision vocabulary');
const archiveProof = copy(run.evidence);
await visitFromJournal(copy(run.cast.lead), 'keeper');
await command('origin_contact', ui.root.querySelector('.service-meeting'), 'actual verified keeper opens the bounded account request');
assert.equal(ui.current().event.id, 'origin_contact'); await pick('ask');
run = ui.current().familyOrigins.run;
assert.equal(run.ending, 'custodian_account'); assert.equal(run.status, 'completed');
assert.deepEqual(run.evidence.slice(0, archiveProof.length), archiveProof, 'later testimony preserves all exact historical archive proof');
assert.deepEqual(evidenceFor(run, 'custodian_consent').actorIds, [run.cast.lead.id]);
assert.deepEqual(evidenceFor(run, 'custodian_account').actorIds, [run.cast.lead.id]);
assert.ok(run.evidence.every(row => !Object.hasOwn(row, 'sourceRevision')), 'family proof keeps the optional faction revision absent');
assert.deepEqual(run.anchor, acceptedAnchor); assert.deepEqual(run.family, acceptedFamily);
assert.deepEqual(ui.current().timeline.storybook, familySource, 'no retrospective childhood choice is rewritten');
for (const [label, mutate] of [
  ['successor archivist given the retired individual name', r => { r.cast.archivist.name = oldArchivist.name; }],
  ['inspection attributed to the retired individual', r => { evidenceFor(r, 'register_inspected').actorIds = [oldArchivist.personId]; }],
  ['keeper account attributed to the archivist', r => { evidenceFor(r, 'custodian_account').actorIds = [archivist.personId]; }],
]) { const bad = copy(expectedSlots[slot]); mutate(bad.familyOrigins.run); rejects(bad, label); }
await exportCurrent('completed family JSON export'); await load(1);
assert.deepEqual(ui.current().familyOrigins.run, run, 'explicit reload keeps the complete final family account');

// The neighboring third life is never progressed. Load and export it too, then
// revisit each progressed life so every independent stored life crosses both
// the actual load and actual JSON-export handler boundaries unchanged.
await load(2); await exportCurrent('untouched third-life JSON export');
await load(0); await exportCurrent('reloaded faction JSON export');
await load(1); await exportCurrent('reloaded family JSON export');
assert.equal(downloadClicks, exports.length); assert.equal(revoked, exports.length);
assert.equal(exports.length, 5); assert.equal(urls.size, 0); parity('final complete three-slot preservation');
await validateUnchangedOfflineIdentity(rootPath, identity);
console.log(JSON.stringify({
  version, schemaVersion: manifest.schemaVersion, bytes: identity.bytes, parts: identity.parts,
  sha256: identity.sha256, loaderSha256: identity.loaderSha256, runtimeSha256: identity.source.sha256,
  manifestSha256: identity.manifestSha256, parityChecks, acceptedHandlers, exports: exports.length,
  checks: [
    'strict schema-2 current runtime/build-source, ordered per-part, loader and whole artifact identity before and after execution',
    'one exact unmodified standalone module graph compiled and mounted once',
    'actual Journal custody/report commands on same-day successor faction handover',
    'old receipt authors/consent/sourceRevision unchanged; only later report belongs to explicit successor revision',
    'actual Journal family accept, caregiver object question, exact successor archivist visit/register inspection, verified keeper visit/account request',
    'source expectation reproduces offered room walking and visitService bookkeeping without hidden commands',
    'family historical proof and childhood/family sources preserved with absent optional faction revision fields',
    'six negative attribution forgeries rejected by both source and actual embedded save validation/import',
    'whole current-state source-engine parity and all three complete saved lives at every modeled handler boundary',
    'neighbor state/revision/timestamp preservation, untouched third slot, explicit reloads and five exact JSON exports',
  ],
  storage: 'disposable in-memory Map only; no live browser or user storage',
  network: 'forbidden; zero attempts',
  limits: 'bounded compiled-handler/semantic-DOM behavior only; not browser, native layout, screen-reader, physical keyboard, performance, naturally played death, earned lifetime or balance certification',
}, null, 2));
