// Run serially, only after the exact current v0.49-or-later build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-save-guide-v49.mjs
// IDs20–22 only. One unchanged compiled graph, one semantic surface, captured
// fixture copies and disposable storage. No generated years or live saves.
// This is not browser/layout, screen-reader, physical-keyboard, performance,
// balance, lifetime, full-suite or aggregate-release certification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import { setImmediate as nextTurn } from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import { uiSoundProbe } from '../tests/helpers/ui-sound-probe.mjs';
import { validateOfflineIdentity, validateUnchangedOfflineIdentity } from './lib/release-identity.mjs';
import * as E from '../dist/js/engine.js';
import { firstDayGuideView, dismissFirstDayGuide } from '../dist/js/first-day-guide.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { serviceMeetingOffers } from '../dist/js/world-services-ui.js';

const root = new URL('../', import.meta.url), rootPath = fileURLToPath(root);
const read = path => readFileSync(new URL(path, root));
const copy = value => structuredClone(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const verifierPath = 'scripts/verify-offline-save-guide-v49.mjs', verifierSha256 = hash(read(verifierPath));
const audioProbePath = 'tests/helpers/ui-sound-probe.mjs', audioProbeSha256 = hash(read(audioProbePath));
const version = JSON.parse(read('package.json')).version;
assert.ok(/^0\.\d+\.\d+$/.test(version) && Number(version.split('.')[1]) >= 49,
  'this IDs20–22 acceptance gate requires the exact current v0.49-or-later source');
// Strict shared schema-2 gate covers current runtime/build sources, every
// ordered part, extra/missing parts, complete artifact, and hosted loader.
const identity = await validateOfflineIdentity(rootPath);
const manifest = JSON.parse(read('dist/offline/manifest.json'));
assert.equal(manifest.schemaVersion, 2); assert.equal(identity.version, version);
let bytes = read('artifacts/hearth-and-oath.html');
assert.equal(bytes.length, identity.bytes); assert.equal(hash(bytes), identity.sha256);
let offset = 0;
for (const [index, part] of manifest.parts.entries()) {
  assert.equal(part.file, `game-${String(index + 1).padStart(2, '0')}.part`);
  const chunk = read('dist/offline/' + part.file);
  assert.equal(chunk.length, part.bytes); assert.equal(hash(chunk), part.sha256);
  assert.ok(chunk.equals(bytes.subarray(offset, offset + chunk.length)), part.file + ': exact ordered bytes');
  offset += chunk.length;
}
assert.equal(offset, bytes.length);
let html = installOfflineDocument(bytes.toString('utf8')); bytes = null;
assert.ok(html.includes('v' + version));
const tag = '<script type="module">', start = html.indexOf(tag), end = html.indexOf('</script>', start + tag.length);
assert.ok(start >= 0 && end > start); assert.equal(html.indexOf(tag, end), -1);
assert.equal([...html.matchAll(/<script\b/g)].length, 3, 'embedded graph, inert media and production boot guard');
assert.ok(html.includes('<script id="boot-guard">'));
let code = html.slice(start + tag.length, end); html = null;
assert.doesNotMatch(code, /^import\s/m); assert.doesNotMatch(code, /(?<![\w.])import\s*\(/);
let compiled = new Script(code, { filename: 'standalone-save-guide-v49.js' }); code = null;
globalThis.gc?.();

function valid(state, label) { assert.ok(state && E.validateSave(state), label); return state; }
function fixture(raw, guide = false) {
  const state = E.migrateSave(copy(raw)); assert.ok(state, 'captured fixture migrates');
  if (guide) state.hero.firstDayGuide = { version: 1, dismissed: false };
  else delete state.hero.firstDayGuide;
  valid(state, 'complete captured fixture');
  assert.deepEqual(E.migrateSave(copy(state)), state, 'fixture survives exact JSON-compatible migration');
  return state;
}
const capturedBytes = read('tests/fixtures/v30-explore-travel.json.gz');
const legacyBytes = read('tests/fixtures/legacy-v4.json');
const fixtureHashes = { capturedSha256: hash(capturedBytes), legacySha256: hash(legacyBytes) };
const captured = JSON.parse(gunzipSync(capturedBytes)).states;
const legacy = JSON.parse(legacyBytes).states;
const expected = [fixture(captured.base), fixture(legacy.birth0, true), fixture(legacy.pendingConversation)];
// Controlled prior-result text only. No reward is awarded by this fixture;
// the actual dismissal below must preserve every resource and Journal record.
expected[0].notice = 'A prior cargo agreement awarded 20 Gold and one rank once.';
valid(expected[0], 'controlled prior reward notice');
assert.deepEqual(E.migrateSave(copy(expected[0])), expected[0]);
const originalBirth = copy(expected[1]);
assert.equal(expected[0].event, null); assert.ok(expected[1].event && expected[2].conversations.pending);
const guideReaders = { actions: E.getActions, unlocks: E.getAgeUnlocks, services: settlementServices,
  walkPath: settlementWalkPath, offers: serviceMeetingOffers, commitment: E.getLifeCommitment, ageControl: () => ({}) };
const guideView = state => firstDayGuideView(state, guideReaders);
const KEY = 'hearth-and-oath:slots:v1', MIRROR = 'hearth-and-oath:life:v1';
const stamps = ['2026-10-12T00:00:00.000Z', '2026-10-13T00:00:00.000Z', null];
const envelope = { version: 1, activeSlot: 0, backups: {}, slots: expected.map((state, id) =>
  ({ id, state: copy(state), updatedAt: stamps[id], revision: 'save-guide-v49-captured-' + id })) };
const ui = fakeSurface();
ui.storage.setItem(KEY, JSON.stringify(envelope)); ui.storage.setItem(MIRROR, JSON.stringify(expected[0]));
// Checker observations must still see the disposable durable bytes when the
// application-facing storage read is deliberately denied in the final case.
const rawStorageRead = ui.storage.getItem.bind(ui.storage);
let failWrites = false, storageWrites = 0;
const audioProbe = uiSoundProbe();
ui.storage.setItem('hearth-and-oath:audio:v1', JSON.stringify({enabled:true,volume:0.35,musicEnabled:false,musicVolume:0.42}));
const write = ui.storage.setItem.bind(ui.storage);
ui.storage.setItem = (key, value) => { storageWrites++; if (failWrites && [KEY, MIRROR].includes(key)) throw Error('Controlled quota failure'); write(key, value); };
ui.storage.removeItem = key => ui.values.delete(key);
// Controlled Web Locks scheduling, not a substitute save implementation.
// The real embedded coordinator/store still own every queued operation.
let held = false;
const gates = [], lock = { async request(_name, _options, operation) {
  if (held) await new Promise(resolve => gates.push(resolve)); return operation();
} };
const hold = () => { held = true; };
const release = () => { held = false; for (const resolve of gates.splice(0)) resolve(); };
const windowListeners = new Map(), timers = new Map(), urls = new Set();
let timerId = 0, networkAttempts = 0, exportedCount = 0, downloadClicks = 0, revoked = 0, failedDownloads = 0;
let failDownload = false, lastBlob = null, lastAnchor = null;
function noNetwork() { networkAttempts++; throw Error('Network forbidden during exact v0.49 save/guide verification'); }
class OfflineURL extends URL {
  static createObjectURL(blob) {
    assert.ok(blob instanceof Blob);
    if (failDownload) { failedDownloads++; throw Error('Controlled download failure'); }
    lastBlob = blob; const url = 'blob:save-guide-v49-' + (++exportedCount); urls.add(url); return url;
  }
  static revokeObjectURL(url) { assert.ok(urls.delete(url), 'each export URL revoked exactly once'); revoked++; }
}
ui.document.createElement = tagName => {
  assert.equal(tagName, 'a'); return lastAnchor = { click() { downloadClicks++; } };
};
const window = { innerWidth: 431, innerHeight: 900, scrollTo() {}, scrollBy() {},
  navigator: { locks: lock, sendBeacon: noNetwork }, fetch: noNetwork,
  addEventListener(type, handler) { const rows = windowListeners.get(type) || []; rows.push(handler); windowListeners.set(type, rows); } };
const context = createContext({ AudioContext: audioProbe.AudioContext, navigator: {userActivation:{isActive:true}}, document: ui.document, localStorage: ui.storage, FormData: ui.FormData, window,
  location: { href: 'file:///downloads/hearth-and-oath.html', protocol: 'file:' },
  requestAnimationFrame(callback) { callback(); return 1; }, getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; }, clearTimeout(id) { timers.delete(id); },
  Blob, URL: OfflineURL, TextEncoder, TextDecoder, console, queueMicrotask, fetch: noNetwork,
  XMLHttpRequest: class { constructor() { noNetwork(); } }, WebSocket: class { constructor() { noNetwork(); } },
  EventSource: class { constructor() { noNetwork(); } }, Worker: class { constructor() { noNetwork(); } },
});
new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);
compiled.runInContext(context, { timeout: 30000 }); compiled = null; globalThis.gc?.();
function recordMessages(node) { let value = node.textContent; const messages = []; Object.defineProperty(node, 'textContent', { configurable: true, get: () => value, set(next) { value = next; if (next) messages.push(next); } }); return messages; }
const outcomeMessages = recordMessages(ui.viewStatus), toastMessages = recordMessages(ui.toast);
let guideFeedbackChecks = 0, repeatedGuideCloses = 0;
const feedbackCheckpoint = () => [outcomeMessages.length, toastMessages.length];
function dismissalFeedback(before) {
  assert.deepEqual(outcomeMessages.slice(before[0]), [], 'guide dismissal cannot republish an old gameplay/reward notice');
  assert.deepEqual(toastMessages.slice(before[1]), ['Guide hidden.'], 'one truthful nonpersisted guide outcome');
  guideFeedbackChecks++;
}
const disk = () => JSON.parse(rawStorageRead(KEY));
const diskBytes = () => [rawStorageRead(KEY), rawStorageRead(MIRROR)];
async function drain() { await nextTurn(); await Promise.resolve(); }
async function windowEvent(type, extra = {}) {
  const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
  for (const handler of windowListeners.get(type) || []) await handler(event);
  await drain(); return event;
}
function available(node) {
  if (!node?.isConnected || node.disabled) return false;
  for (let parent = node; parent; parent = parent.parentElement) {
    // fakeSurface reflects the assigned inert property through getAttribute;
    // boolean false is absent, whereas a real DOM attribute is a string.
    const inert = parent.getAttribute?.('inert');
    if (parent.hidden || parent.inert === true || inert === true || typeof inert === 'string' || parent.getAttribute?.('aria-hidden') === 'true') return false;
    if (parent.tagName === 'DETAILS' && !parent.open) return false;
  }
  return true;
}
let handlerChecks = 0, sourceParityChecks = 0;
function rendered(op, id, within = ui.root) {
  const selector = `[data-op="${op}"]${id === undefined ? '' : `[data-id="${id}"]`}`;
  const node = within?.querySelectorAll(selector).find(available);
  assert.ok(node, 'actual enabled semantic command ' + op + '/' + (id ?? '')); return node;
}
async function click(op, id, within = ui.root) {
  const node = rendered(op, id, within); await ui.fire('click', node); await drain(); handlerChecks++; return node;
}
async function escape() { await ui.key('Escape'); await drain(); handlerChecks++; }
const guide = () => ui.root.querySelector('.first-day-guide');
const card = id => ui.root.querySelectorAll('[data-return-life-card]')[id];
const health = (id, within = ui.root) => within.querySelector(`[data-save-health][data-save-slot="${id}"]`);
const label = id => health(id).querySelector('[data-save-label]').textContent;
function status(id, state, timestamp) {
  assert.equal(health(id).dataset.saveState, state); assert.equal(health(id).dataset.saveAt, timestamp || '');
}
function neighbors(before, id, label) {
  const after = disk();
  for (const row of before.slots) if (row.id !== id) assert.deepEqual(after.slots[row.id], row, label + ': independent neighboring state/revision/time');
  assert.deepEqual(after.backups, before.backups, label + ': recovery history unchanged');
}
function savedParity(slot, label) {
  assert.deepEqual(ui.current(), expected[slot], label + ': complete source/embedded live-state parity');
  assert.deepEqual(ui.lives(), expected, label + ': all complete independent lives');
  sourceParityChecks++;
}
async function openFooting() {
  await click('menu', 'header'); await click('help', undefined, ui.root.querySelector('.menu-drawer'));
  await click('footing-open', undefined, ui.root.querySelector('.modal'));
  assert.ok(guide()?.open); assert.equal(ui.document.activeElement.id, 'first-day-guide-heading');
  assert.equal(ui.document.activeElement.isConnected, true);
}
async function load(id) {
  await click('title-menu'); await click('title-load'); await click('slot-load', String(id));
}
async function exportExact(id, state, within = ui.root, key = null, op = 'export-session') {
  const commandId = op === 'export' ? undefined : String(id);
  const before = diskBytes(), prior = exportedCount, control = rendered(op, commandId, within);
  control.focus();
  if (key) { await ui.key(key, { target: control }); await drain(); handlerChecks++; }
  else await click(op, commandId, within);
  assert.equal(exportedCount, prior + 1); assert.equal(lastBlob.type, 'application/json');
  assert.deepEqual(JSON.parse(await lastBlob.text()), state, 'exact whole-life export from the actual handler'); lastBlob = null;
  assert.equal(lastAnchor.download, `hearth-and-oath-${state.hero.name.replace(/[^a-zA-Z0-9_-]/g, '-')}.json`);
  assert.equal(ui.document.activeElement, control); assert.equal(control.isConnected, true);
  assert.deepEqual(diskBytes(), before, 'export changes neither durable envelope nor mirror');
  assert.match(ui.toast.textContent, /Browser save status is unchanged/);
  for (const [id, timer] of [...timers]) if (timer.delay === 1000) { timers.delete(id); timer.callback(); }
  assert.equal(urls.size, 0);
  return control;
}
// These are the actual embedded store/engine APIs on the same disposable disk,
// modeling a separate tab. JSON is the real cross-realm save boundary.
function remote(operation, id, state) {
  context.qaId = id; context.qaState = state ? JSON.stringify(state) : null;
  const result = new Script(`(() => {
    const store = __saves.createSaveStore(localStorage, __engine.migrateSave);
    return ${operation === 'remove'
      ? 'store.remove(globalThis.qaId, { reviewed: true, token: store.deletionToken(globalThis.qaId) })'
      : 'store.write(globalThis.qaId, JSON.parse(globalThis.qaState))'};
  })()`).runInContext(context, { timeout: 30000 });
  delete context.qaId; delete context.qaState;
  assert.equal(result, true, 'actual embedded remote ' + operation);
}

// Independent return cards, actual pending contexts and native sibling export
// buttons. Merely inspecting/exporting/canceling must not select or mutate a life.
const initial = diskBytes(); await click('title-load');
assert.equal(ui.root.querySelectorAll('[data-return-life-card]').length, 3);
for (let id = 0; id < 3; id++) {
  const row = card(id), control = row.querySelector('.slot-export');
  assert.ok(row.textContent.includes(expected[id].hero.name)); status(id, 'saved', stamps[id]);
  assert.equal(control.getAttribute('aria-label'), `Export this tab’s copy of ${expected[id].hero.name} from slot ${id + 1}`);
  assert.equal(control.closest('.save-slot'), null, 'no nested export button');
  assert.equal(health(id, row).querySelector('button'), null, 'one nonduplicated export per card');
}
assert.equal(card(0).querySelector('.slot-pending-context'), null, 'no invented unfinished moment');
assert.equal(card(1).querySelector('.slot-pending-context').textContent, 'Watching your first years: ' + expected[1].event.title);
assert.equal(card(2).querySelector('.slot-pending-context').textContent, 'Reply waiting');
assert.equal(card(2).querySelector('[data-save-time]').textContent, 'Save time unavailable');
await exportExact(2, expected[2], card(2), 'Enter'); await exportExact(2, expected[2], card(2), ' ');
await click('slot-delete', '2'); assert.ok(ui.root.querySelector('[data-op="confirm-delete-life"]')); await escape();
await click('title-menu'); await click('title-new'); await click('slot-new', '2');
assert.ok(ui.root.querySelector('[data-op="confirm-overwrite"]')); await escape();
assert.deepEqual(diskBytes(), initial, 'delete and replacement cancellations are non-destructive');
await click('title-menu'); await click('title-load'); await click('slot-load', '0'); savedParity(0, 'legacy adult load');

// An old life remains quiet. Explicit Help reopens without changing it. The
// guide uses exactly the existing walk/visit and ordinary-action transitions.
assert.equal(guide(), null, 'missing optional legacy marker never auto-opens');
const quiet = diskBytes(); await openFooting(); assert.deepEqual(diskBytes(), quiet);
const rewardDismissDisk = disk(), rewardFeedback = feedbackCheckpoint();
assert.match(expected[0].notice, /20 Gold and one rank/);
expected[0] = dismissFirstDayGuide(expected[0]); await click('footing-dismiss'); dismissalFeedback(rewardFeedback);
savedParity(0, 'prior reward notice remains saved but never re-announced by marker-only dismissal'); neighbors(rewardDismissDisk, 0, 'prior reward guide dismissal');
await openFooting();
const beforePreview = JSON.stringify(expected[0]), adultView = guideView(expected[0]);
guideView(expected[0]); assert.equal(JSON.stringify(expected[0]), beforePreview, 'actual bounded preview is read-only');
assert.deepEqual(guide().querySelectorAll('[data-op="footing-step"]').map(node => node.dataset.id), adultView.steps.map(step => step.key));
assert.equal(guide().querySelector('[data-save-health]'), null, 'guide does not invent another save-health authority');
const visit = adultView.steps.find(step => step.op === 'activity-visit'); assert.ok(visit);
const provider = settlementServices(expected[0]).find(row => row.id === visit.id); assert.ok(provider);
const beforeVisit = disk(), visitDay = expected[0].day, visitGold = expected[0].hero.gold, profession = expected[0].hero.profession;
for (const room of settlementWalkPath(expected[0], provider.roomId)) {
  assert.ok(E.getActions(expected[0]).some(row => row.id === 'atlas_room_' + room && !row.disabledReason));
  expected[0] = E.chooseAction(expected[0], 'atlas_room_' + room);
}
expected[0] = valid(E.visitService(expected[0], provider.id), 'source exact guide visit');
await click('footing-step', visit.key); savedParity(0, 'guide actual walk and visit'); neighbors(beforeVisit, 0, 'guide visit');
assert.ok(ui.root.querySelector(`[data-service-person="${provider.personId}"]`));
assert.equal(expected[0].day, visitDay); assert.equal(expected[0].hero.gold, visitGold); assert.equal(expected[0].hero.profession, profession);
await click('menu', 'header'); await click('tab', 'life', ui.root.querySelector('.menu-drawer'));
const ordinary = guideView(expected[0]).steps.find(step => step.op === 'activity'); assert.ok(ordinary);
assert.ok(E.getActions(expected[0]).some(row => row.id === ordinary.id && !row.disabledReason));
const actionBefore = disk(), trigger = rendered('footing-step', ordinary.key);
expected[0] = valid(E.chooseAction(expected[0], ordinary.id), 'source ordinary guide action');
trigger.focus(); await ui.key('Enter', { target: trigger }); await drain(); handlerChecks++;
savedParity(0, 'guide ordinary action once'); neighbors(actionBefore, 0, 'ordinary guide action');
const afterOnce = diskBytes(); await ui.fire('click', trigger); await drain();
assert.deepEqual(diskBytes(), afterOnce, 'detached old suggestion cannot replay');
const beforeDismiss = disk(), normalFeedback = feedbackCheckpoint(); expected[0] = dismissFirstDayGuide(expected[0]);
await click('footing-dismiss'); dismissalFeedback(normalFeedback); savedParity(0, 'dismissal changes only the optional marker'); neighbors(beforeDismiss, 0, 'guide dismissal');
assert.equal(guide(), null); assert.equal(ui.document.activeElement.isConnected, true);
await click('title-menu'); await click('title-continue'); assert.equal(guide(), null); savedParity(0, 'dismissed guide stays dismissed on reload');
await openFooting(); savedParity(0, 'manual reopen keeps dismissed marker');
for (let repeat=0;repeat<2;repeat++) {
  const before=diskBytes(), writes=storageWrites, tones=audioProbe.tones.length, feedback=feedbackCheckpoint(); audioProbe.advance();
  await click('footing-dismiss'); dismissalFeedback(feedback);
  assert.equal(guide(),null);assert.equal(ui.document.activeElement.isConnected,true);
  assert.equal(storageWrites,writes,'already-dismissed Help close performs no additional storage write');
  assert.deepEqual(diskBytes(),before,'exact save/revision/timestamp/neighbor bytes remain unchanged');
  assert.deepEqual(audioProbe.tones.slice(tones),[220,660],'actual audio.js schedules only its ordinary click, not an error or gameplay-action tone');
  assert.equal((await windowEvent('beforeunload')).defaultPrevented,false); repeatedGuideCloses++;
  await openFooting();
}
await click('footing-step', 'saving'); assert.ok(ui.root.querySelector('.menu-drawer [data-op="export"]'));
assert.equal(guide().querySelector('[data-save-health]'), null); await escape();

// A pending infant observation remains the only offered guide destination.
// Focusing the guide never answers the scene or advances the calendar.
await load(1); savedParity(1, 'independent childhood load'); assert.ok(guide());
const pendingView = guideView(expected[1]), waiting = diskBytes();
assert.deepEqual(pendingView.steps.map(step => step.key), ['event:' + expected[1].event.id, 'saving']);
assert.deepEqual(guide().querySelectorAll('[data-op="footing-step"]').map(node => node.dataset.id), pendingView.steps.map(step => step.key));
await click('footing-step', pendingView.steps[0].key);
assert.equal(ui.document.activeElement, ui.root.querySelector('.story-scene h2')); assert.equal(ui.document.activeElement.isConnected, true);
assert.deepEqual(diskBytes(), waiting, 'guide moment focus preserves exact pending scene');
const offered = expected[1].event.choices.filter(row => !row.disabledReason); assert.deepEqual(offered.map(c=>c.id),['continue']);assert.equal(offered[0].owner,'observer');
const birthChoice = offered[0].id, queuedStamp = disk().slots[1].updatedAt;
const queuedDisk = diskBytes(), queuedNeighbors = disk();
expected[1] = valid(E.chooseEventOption(expected[1], birthChoice), 'source real infant observation');
hold(); await click('choice', birthChoice);
status(1, 'pending', queuedStamp); assert.equal(label(1), 'Saving in this browser…');
assert.equal((await windowEvent('beforeunload')).defaultPrevented, true); assert.deepEqual(diskBytes(), queuedDisk);
assert.equal(health(1).querySelector('[data-op="export-session"]').hidden, true,
  'healthy pending status does not invent a failure-only export escape');
await click('menu', 'header');
const pendingDrawer = ui.root.querySelector('.menu-drawer'), queuedHost = health(1, pendingDrawer);
const queuedExport = await exportExact(1, expected[1], pendingDrawer, null, 'export'); status(1, 'pending', queuedStamp);
assert.equal((await windowEvent('beforeunload')).defaultPrevented, true, 'queued export does not acknowledge persistence');
release(); await drain();
assert.equal(health(1, ui.root.querySelector('.menu-drawer')), queuedHost, 'queued completion updates health in place');
assert.equal(queuedExport.isConnected, true); assert.equal(ui.document.activeElement, queuedExport, 'queued completion retains canonical Export life focus');
const committedStamp = disk().slots[1].updatedAt;
assert.notEqual(committedStamp, queuedStamp); status(1, 'saved', committedStamp);
assert.equal((await windowEvent('beforeunload')).defaultPrevented, false); await escape();
savedParity(1, 'queued save commits exact choices'); neighbors(queuedNeighbors, 1, 'queued save');

// A real quota failure retains the newest session while neighboring cards keep
// their own copies. Downloading or failed downloading never clears save health.
const failedDisk = diskBytes(), failedNeighbors = disk(); failWrites = true;
expected[1] = dismissFirstDayGuide(expected[1]); const quotaFeedback = feedbackCheckpoint(); await click('footing-dismiss'); dismissalFeedback(quotaFeedback);
status(1, 'unsaved', committedStamp); assert.equal((await windowEvent('beforeunload')).defaultPrevented, true);
await click('title-menu'); await click('title-load');
assert.equal(card(1).querySelector('.slot-export').getAttribute('aria-label'), `Export latest session for ${expected[1].hero.name} from slot 2`);
assert.match(card(1).querySelector('[data-slot-source]').textContent, /Latest session; not yet saved/);
assert.equal(card(0).querySelector('.slot-export').getAttribute('aria-label'), `Export this tab’s copy of ${expected[0].hero.name} from slot 1`);
status(1, 'unsaved', committedStamp); await exportExact(1, expected[1], card(1)); await exportExact(0, expected[0], card(0), ' ');
const retry = rendered('export-session', '1', card(1)); retry.focus(); failDownload = true;
await ui.key('Enter', { target: retry }); await drain(); handlerChecks++; failDownload = false;
assert.match(ui.toast.textContent, /could not be downloaded/); assert.equal(ui.document.activeElement, retry); assert.equal(retry.isConnected, true);
status(1, 'unsaved', committedStamp); assert.deepEqual(diskBytes(), failedDisk); neighbors(failedNeighbors, 1, 'failed save/export');
assert.equal((await windowEvent('beforeunload')).defaultPrevented, true); assert.equal(card(1).querySelector('[data-slot-source]').hidden, false);
failWrites = false; await click('slot-load', '1'); savedParity(1, 'explicit retry keeps latest held session');
status(1, 'saved', disk().slots[1].updatedAt); assert.equal((await windowEvent('beforeunload')).defaultPrevented, false);

// A changed durable copy alone is stale, not new unsaved choices. Only an
// explicit reload adopts it. The current-session export remains the older copy.
const staleLocal = copy(expected[1]), staleStamp = disk().slots[1].updatedAt, beforeRemote = disk();
// Another tab watches the same sole control, then advances its actual calendar.
// A differing durable head never requires giving an infant a second choice.
const remoteLife = valid(E.ageUp(valid(E.chooseEventOption(originalBirth,birthChoice))), 'source other tab advances the observed early years');assert.ok(remoteLife.day>originalBirth.day);
remote('write', 1, remoteLife); neighbors(beforeRemote, 1, 'other-tab change');
const changedDisk = diskBytes(); await windowEvent('storage', { key: KEY });
assert.ok(ui.root.querySelector('[data-save-conflict-dialog]')); await escape();
status(1, 'stale', staleStamp); assert.equal(label(1), 'Saved copy changed in another tab');
assert.equal((await windowEvent('beforeunload')).defaultPrevented, false);
await exportExact(1, staleLocal); assert.deepEqual(diskBytes(), changedDisk);
await click('review-save-conflict'); await click('reload-conflicted-life'); expected[1] = remoteLife;
savedParity(1, 'explicit stale reload'); status(1, 'saved', disk().slots[1].updatedAt);

// A remotely deleted slot cannot be resurrected by local changes. Dismissing
// conflict review is non-destructive; export keeps the exact held session, and
// explicit reload finally exposes an honestly empty row without an empty export.
const deletedStamp = disk().slots[1].updatedAt, beforeDelete = disk(); remote('remove', 1);
const deletedDisk = diskBytes(); assert.equal(disk().slots[1].state, null); neighbors(beforeDelete, 1, 'other-tab deletion');
const heldDeleted = dismissFirstDayGuide(expected[1]), conflictFeedback = feedbackCheckpoint(); await click('footing-dismiss'); dismissalFeedback(conflictFeedback);
assert.ok(ui.root.querySelector('[data-save-conflict-dialog]')); await escape();
status(1, 'conflict', deletedStamp); assert.equal((await windowEvent('beforeunload')).defaultPrevented, true);
await exportExact(1, heldDeleted); status(1, 'conflict', deletedStamp);
assert.deepEqual(diskBytes(), deletedDisk, 'conflict dismissal and export cannot recreate deleted life');
await click('review-save-conflict'); await click('reload-conflicted-life'); expected[1] = null;
assert.ok(ui.root.querySelector('.save-slots-screen')); assert.deepEqual(ui.lives(), expected);
assert.equal(card(1).querySelector('[data-op="slot-load"]').disabled, true);
assert.equal(card(1).querySelector('.slot-export'), null); assert.equal(health(1, card(1)), null);
assert.equal((await windowEvent('beforeunload')).defaultPrevented, false);
assert.deepEqual(diskBytes(), deletedDisk, 'explicit deleted-slot reload only reads, never replaces or restores');

// An unchanged autosave with unreadable storage is not proof of a successful
// browser save, but it is not new unsaved progress either. Use the existing
// Main menu autosave and direct export, then the actual Continue/retry path.
await click('slot-load', '0'); savedParity(0, 'remaining life before read denial');
const unreadableDisk = diskBytes(), unreadableNeighbors = disk(), unreadableStamp = disk().slots[0].updatedAt;
const unchangedLife = copy(expected[0]);
assert.deepEqual(JSON.parse(rawStorageRead(MIRROR)), unchangedLife, 'capture exact current whole life before denying reads');
const applicationRead = ui.storage.getItem;
ui.storage.getItem = key => {
  if ([KEY, MIRROR].includes(key)) throw Error('Controlled save-key read denial');
  return rawStorageRead(key);
};
try {
  await click('title-menu'); assert.ok(ui.root.querySelector('.title-screen'));
  status(0, 'saved', unreadableStamp); assert.equal(label(0), 'Browser saves unavailable');
  assert.match(health(0).querySelector('[data-save-problem]').textContent, /Browser storage is unavailable/);
  assert.equal((await windowEvent('beforeunload')).defaultPrevented, false, 'unchanged failed autosave invents no unsaved choices');
  assert.deepEqual(diskBytes(), unreadableDisk, 'read denial changes no durable bytes');
  await exportExact(0, unchangedLife);
  status(0, 'saved', unreadableStamp); assert.equal(label(0), 'Browser saves unavailable', 'export does not bless unavailable browser storage');
  assert.equal((await windowEvent('beforeunload')).defaultPrevented, false);
  assert.deepEqual(diskBytes(), unreadableDisk); neighbors(unreadableNeighbors, 0, 'unchanged unavailable save/export');
} finally { ui.storage.getItem = applicationRead; }
await click('title-continue'); savedParity(0, 'actual retry after read access returns');
status(0, 'saved', unreadableStamp); assert.equal(label(0), 'Saved in this browser');
assert.equal((await windowEvent('beforeunload')).defaultPrevented, false);
assert.deepEqual(diskBytes(), unreadableDisk, 'unchanged successful retry preserves exact progress and prior durable timestamp');
neighbors(unreadableNeighbors, 0, 'recovered unchanged save');

assert.equal(failedDownloads, 1); assert.equal(downloadClicks, exportedCount); assert.equal(revoked, exportedCount); assert.equal(urls.size, 0);
assert.equal(held, false); assert.equal(gates.length, 0);
await validateUnchangedOfflineIdentity(rootPath, identity);
assert.equal(hash(read(verifierPath)), verifierSha256, 'verifier source is unchanged throughout execution');
assert.equal(hash(read(audioProbePath)), audioProbeSha256, 'controlled Web Audio probe is unchanged throughout execution');
assert.deepEqual({ capturedSha256: hash(read('tests/fixtures/v30-explore-travel.json.gz')),
  legacySha256: hash(read('tests/fixtures/legacy-v4.json')) }, fixtureHashes, 'both exact captured fixture files are unchanged throughout execution');
assert.equal(networkAttempts, 0, 'terminal assertion: no network API was attempted across the complete verifier');
console.log(JSON.stringify({ version, scope: 'IDs20–22 only', schemaVersion: 2,
  bytes: identity.bytes, parts: identity.parts, sha256: identity.sha256, loaderSha256: identity.loaderSha256,
  manifestSha256: identity.manifestSha256, runtimeSha256: identity.source.sha256, buildGit: identity.buildGit,
  verifierSha256, audioProbeSha256, fixtures: fixtureHashes,
  handlerChecks, sourceParityChecks, guideFeedbackChecks, repeatedGuideCloses, exports: exportedCount, failedDownloads, networkAttempts,
  checks: [
    'strict unchanged schema-2 runtime/build-source, part, artifact and loader provenance',
    'one exact unchanged compiled graph mounted once; captured whole-save fixtures only',
    'legacy quiet load, explicit Help reopen, pending-scene focus, per-life dismissal/reload, existing saving menu',
    'real guide provider walk/visit and ordinary action match complete source-engine transitions once',
    'prior reward notice, ordinary, quota-held and conflicted marker-only dismissals publish only Guide hidden, without replaying rewards or altering saved notice',
    'two repeated Help closes preserve exact bytes/timestamps with zero storage writes and only ordinary Web Audio click notes, no action/error notes',
    'independent actual pending-context cards, named accessible sibling export controls and honest unknown/durable dates',
    'queued save/export/unload protection and in-place committed status; quota-held latest session vs neighbor-copy exports',
    'download failure, repeat native Enter/Space model, exact JSON and non-destructive delete/overwrite cancellation',
    'stale and deleted-slot conflicts preserve exact local export, old durable timestamp and other lives until explicit reload',
    'unchanged unreadable-storage autosave/export has unavailable wording without an invented unload warning; actual retry preserves progress timestamp',
  ],
  storage: 'disposable in-memory Map only; no live browser or user storage',
  network: 'forbidden; terminal zero-attempt assertion',
  limits: 'bounded compiled-handler/semantic-DOM evidence only; no browser/layout, screen-reader, physical-keyboard, performance, balance, generated-year/lifetime or full-suite claims',
}, null, 2));
