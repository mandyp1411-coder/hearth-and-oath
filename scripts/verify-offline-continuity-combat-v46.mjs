import { compileOfflineModule, controlledTimers } from './lib/offline-module-vm.mjs';
// Run serially after the current build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-continuity-combat-v46.mjs
// Execute one exact downloaded module graph against controlled fixture copies.
// This proves bounded semantic handler parity, not CSS, native keyboard behavior,
// screen-reader speech, earned recruitment/progression, or long-run balance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { setImmediate as turn } from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { tradeInventory } from '../dist/js/trading.js';
import { companionCombatProfile } from '../dist/js/companion-combat-profile.js';
import { TECHNIQUES_V27 } from '../dist/js/techniques-v27.js';
import { createBattle, getBattleActions, battleActorDisplayName, battleNamedTargetId } from '../dist/js/combat.js';
import { combatStatusRows } from '../dist/js/combat-statuses.js';
import { enemyRecipientPrediction } from '../dist/js/combat-status-ui.js';
import { planIntent } from '../dist/js/enemy-plans-v27.js';
import { resolveEnemyTargets } from '../dist/js/enemy-targets.js';

const root = new URL('../', import.meta.url), read = path => readFileSync(new URL(path, root));
const version = JSON.parse(read('package.json')).version;
assert.ok(/^0\.\d+\.\d+$/.test(version) && Number(version.split('.')[1]) >= 46, 'this retained acceptance gate needs v0.46-or-later source');
const manifest = JSON.parse(read('dist/offline/manifest.json'));
let bytes = read('artifacts/hearth-and-oath.html');
assert.equal(manifest.version, version, 'manifest identifies the current source release');
assert.equal(manifest.bytes, bytes.length, 'manifest exact standalone byte length');
assert.ok(manifest.parts.length > 0, 'standalone parts exist');
const sha256 = createHash('sha256').update(bytes).digest('hex'), partHash = createHash('sha256');
let offset = 0;
for (const [index, entry] of manifest.parts.entries()) {
  assert.equal(entry.file, `game-${String(index + 1).padStart(2, '0')}.part`, 'ordered current parts');
  const part = read('dist/offline/' + entry.file);
  assert.equal(part.length, entry.bytes, entry.file + ' byte length');
  assert.ok(part.equals(bytes.subarray(offset, offset + part.length)), entry.file + ' exact artifact bytes');
  offset += part.length; partHash.update(part);
}
assert.equal(offset, manifest.bytes, 'parts cover the complete standalone');
assert.equal(partHash.digest('hex'), sha256, 'artifact and ordered parts have identical SHA-256');
let html = installOfflineDocument(bytes.toString('utf8')); bytes = null;
assert.ok(html.includes('v' + version), 'standalone labels this release');
const moduleTag = '<script type="module">', moduleStart = html.indexOf(moduleTag);
assert.ok(moduleStart >= 0, 'standalone embeds its module graph');
const moduleEnd = html.indexOf('</script>', moduleStart + moduleTag.length);
assert.ok(moduleEnd > moduleStart, 'embedded graph closes');
assert.equal(html.indexOf(moduleTag, moduleEnd), -1, 'one embedded entry only');
const moduleMarkup = html.slice(moduleStart, moduleEnd + '</script>'.length);
const guardStart = html.indexOf('<script id="boot-guard">', moduleEnd);
assert.ok(guardStart > moduleEnd, 'standalone retains the production boot guard');
const guardEnd = html.indexOf('</script>', guardStart);
assert.ok(guardEnd > guardStart, 'boot guard closes');
const guardMarkup = html.slice(guardStart, guardEnd + '</script>'.length);
const guardCode = html.slice(guardStart + '<script id="boot-guard">'.length, guardEnd);
const bootMarkup = html.match(/<div id="app">([\s\S]*?)<\/div>\s*<div id="view-status"/)?.[1];
assert.ok(bootMarkup, 'actual static opening shell precedes the independent live status');
const headMarkup = html.slice(html.indexOf('<head>') + '<head>'.length, html.indexOf('</head>'));
assert.equal([...html.matchAll(/<script\b/g)].length, 3, 'the inline entry, inert media and boot guard are exported');
assert.match(bootMarkup, /JavaScript is needed[\s\S]*then reload[\s\S]*does not erase your saved lives/);
assert.match(headMarkup, /<noscript><style>#boot-message \{ display: none; \}[^<]*<\/style><\/noscript>/);
let code = html.slice(moduleStart + moduleTag.length, moduleEnd); html = null;
assert.doesNotMatch(code, /^import\s/m, 'downloaded graph has no external static imports');
let compiled = compileOfflineModule(code,{filename: 'standalone-continuity-combat-v46.js' }); code = null;
const compiledGuard = new Script(guardCode, { filename: 'standalone-boot-guard-v46.js' });
globalThis.gc?.();

// Exercise the real static shell and guard, never a reimplementation of fail().
// Events and DOM ancestry are modeled; browser module loading and layout are not.
function bootSurface(href = 'file:///downloads/hearth-and-oath.html') {
  const ui = fakeSurface(), channels = new WeakMap();
  function eventTarget(target) {
    const listeners = new Map(), originalAdd = target.addEventListener?.bind(target);
    channels.set(target, listeners);
    target.addEventListener = (type, handler, capture = false) => {
      const rows = listeners.get(type) || [];
      if (!rows.some(row => row.handler === handler && row.capture === capture)) rows.push({ handler, capture });
      listeners.set(type, rows); originalAdd?.(type, handler, capture);
    };
    target.removeEventListener = (type, handler, capture = false) => {
      listeners.set(type, (listeners.get(type) || []).filter(row => row.handler !== handler || row.capture !== capture));
    };
    return target;
  }
  const originalHTML = Object.getOwnPropertyDescriptor(ui.root, 'innerHTML');
  Object.defineProperty(ui.root, 'innerHTML', {
    get() { return originalHTML.get.call(ui.root); },
    set(value) { originalHTML.set.call(ui.root, value); for (const node of ui.root.nodes) eventTarget(node); },
  });
  ui.root.innerHTML = bootMarkup;
  const entry = eventTarget({ getAttribute: () => null, hasAttribute: () => false });
  const window = eventTarget({ innerWidth: 390, innerHeight: 844, scrollTo() {}, scrollBy() {} });
  eventTarget(ui.document);
  ui.document.baseURI = href;
  ui.document.head = { innerHTML: headMarkup };
  ui.document.querySelector = selector => selector === 'script[type="module"]' ? entry : ui.root.querySelector(selector);
  ui.document.querySelectorAll = selector => {
    assert.equal(selector, 'body > script', 'download reads only the original body scripts');
    return [{ src: '', type: 'module', outerHTML: moduleMarkup }, { src: '', type: '', outerHTML: guardMarkup }];
  };
  const stats = { reloads: 0, storageAccesses: 0, networkCalls: 0, timers: 0 };
  return {
    ui, window, entry, href, stats,
    location: { href, protocol: new URL(href).protocol, reload() { stats.reloads++; } },
    emit(target, type, event = {}) {
      for (const { handler } of [...(channels.get(target)?.get(type) || [])]) handler({ target, ...event });
    },
    listeners: (target, type) => channels.get(target)?.get(type) || [],
    failed: () => ui.root.querySelector('#boot-recovery')?.hidden === false,
    message: () => ui.root.querySelector('#boot-message')?.textContent,
  };
}
function quietBoot(href) {
  const boot = bootSurface(href), clock = controlledTimers();
  boot.clock = clock; boot.expectedTimers = 0;
  for (const [key, value] of [['hearth-and-oath:slots:v1', '{"synthetic":"existing slots"}'], ['hearth-and-oath:life:v1', '{"synthetic":"current life"}'], ['unrelated-setting', 'preserve me']]) boot.ui.storage.setItem(key, value);
  const before = [...boot.ui.values];
  const context = createContext({
    document: boot.ui.document, window: boot.window, location: boot.location, URL,
    get localStorage() { boot.stats.storageAccesses++; throw Error('Boot must not access browser storage'); },
    fetch() { boot.stats.networkCalls++; throw Error('Boot must not request another resource'); },
    setTimeout(callback, delay) { boot.stats.timers++; return clock.setTimeout(callback, delay); },
    clearTimeout(id) { clock.clearTimeout(id); },
  });
  compiledGuard.runInContext(context, { timeout: 1000 });
  boot.safe = () => {
    assert.deepEqual([...boot.ui.values], before, 'startup recovery preserves every stored byte');
    assert.deepEqual({ storageAccesses: boot.stats.storageAccesses, networkCalls: boot.stats.networkCalls, timers: boot.stats.timers }, { storageAccesses: 0, networkCalls: 0, timers: boot.expectedTimers });
  };
  boot.clean = () => {
    assert.equal(boot.listeners(boot.window, 'error').length, 0, 'temporary startup error guard detached');
    assert.equal(boot.listeners(boot.ui.document, 'DOMContentLoaded').length, 0, 'temporary ready guard detached');
    boot.safe();
  };
  return boot;
}
function retryOnce(boot) {
  assert.equal(boot.failed(), true);
  assert.equal(boot.message(), 'Hearth & Oath could not start.');
  assert.match(boot.ui.root.querySelector('#boot-recovery').textContent, /does not mean your saved lives have been erased/);
  const retry = boot.ui.root.querySelector('#boot-retry');
  assert.equal(boot.listeners(retry, 'click').length, 1);
  boot.emit(retry, 'click'); boot.emit(retry, 'click');
  assert.equal(boot.stats.reloads, 1, 'fast repeated Retry requests exactly one document reload');
  assert.equal(retry.disabled, true); assert.equal(retry.textContent, 'Reloading…'); boot.clean();
}
for (const href of ['file:///downloads/hearth-and-oath.html', 'https://game.invalid/download.html']) {
  const delayed = quietBoot(href);
  assert.match(delayed.message(), /^Loading Hearth & Oath/); assert.equal(delayed.failed(), false);
  assert.equal(delayed.listeners(delayed.window, 'error')[0].capture, true);
  await Promise.resolve();
  for (const event of [{ target: { tagName: 'IMG' } }, { filename: 'chrome-extension://example/content.js' }, { filename: 'https://other.invalid/js/app.js' }, { filename: '' }]) delayed.emit(delayed.window, 'error', event);
  assert.match(delayed.message(), /^Loading Hearth & Oath/); assert.equal(delayed.failed(), false); delayed.safe();
  delayed.emit(delayed.ui.document, 'DOMContentLoaded');
  delayed.expectedTimers = 1;
  assert.equal(delayed.failed(), false, 'an unresolved asynchronous inline entry is allowed to keep opening');
  assert.equal(delayed.clock.pending.size, 1);
  assert.equal([...delayed.clock.pending.values()][0].delay, 15000, 'the real inline-entry startup deadline is retained');
  delayed.clock.advance(14999); assert.equal(delayed.failed(), false); delayed.safe();
  delayed.clock.advance(1); retryOnce(delayed);
  const resource = quietBoot(href);
  resource.emit(resource.window, 'error', { target: resource.entry });
  const message = resource.ui.root.querySelector('#boot-message');
  resource.emit(resource.window, 'error', { target: resource.entry }); resource.emit(resource.ui.document, 'DOMContentLoaded');
  assert.equal(resource.ui.root.querySelector('#boot-message'), message, 'late events do not recreate recovery'); retryOnce(resource);
  const runtime = quietBoot(href);
  runtime.ui.root.innerHTML = '<main id="partial-title">Partially initialized synthetic title</main>';
  const shellClasses = ['title-mode', 'creation-mode', 'game-mode', 'has-dialog'];
  for (const name of [...shellClasses, 'unrelated-shell-marker']) runtime.ui.document.body.classList.toggle(name, true);
  runtime.emit(runtime.window, 'error', { filename: href, message: 'PRIVATE_STARTUP_DIAGNOSTIC' });
  assert.equal(runtime.ui.root.querySelector('#partial-title'), null);
  for (const name of shellClasses) assert.equal(runtime.ui.document.body.classList.contains(name), false, 'partial-render shell mode cleared: ' + name);
  assert.equal(runtime.ui.document.body.classList.contains('unrelated-shell-marker'), true, 'unrelated body classes survive recovery');
  assert.doesNotMatch(runtime.ui.root.innerHTML, /PRIVATE_STARTUP_DIAGNOSTIC/); retryOnce(runtime);
}

function valid(state) { assert.ok(E.validateSave(state), 'complete valid controlled save: ' + state?.notice); return state; }
function roundtrip(state) {
  valid(state); assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(state))), state, 'source migration is lossless'); return state;
}
const base = roundtrip(E.migrateSave(JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz'))).states.base));
function fresh(kind = null) {
  let state = structuredClone(base); state.hero.gold = 1000;
  for (const key of Object.keys(state.equipment.materials)) state.equipment.materials[key] = 30;
  if (kind) {
    const provider = settlementServices(state).find(row => row.kind === kind); assert.ok(provider, kind);
    const path = settlementWalkPath(state, provider.roomId); assert.ok(path, 'reachable controlled provider');
    for (const id of path) state = valid(E.chooseAction(state, 'atlas_room_' + id));
  }
  return state;
}
// Same controlled setups as keyboard-feedback, companion-combat-profile-ui and
// combat-status-intent-ui acceptance tests, on copies of a genuine older save.
const activity = fresh('materials');
activity.equipment.owned.push('scholar_hood'); activity.equipment.equipped.head = null;
activity.playerNotes = [{ day: activity.day, text: 'PRIVATE_OFFLINE_NOTE_NOT_AN_ACTION_RESULT' }];
const party = fresh();
for (const [index, companion] of party.companions.entries()) {
  companion.recruited = true; companion.active = index < 3; companion.combatExperience = index * index * 4;
  const profile = companionCombatProfile(party, companion), technique = TECHNIQUES_V27.find(row => row.classId === profile.actor.specialization);
  assert.ok(technique, 'controlled chapter technique for ' + companion.id);
  Object.assign(party.rpg.companionStages[companion.id], {
    stage: 3, trainedTechniques: [technique.id],
    choices: Array.from({ length: 3 }, () => ({ id: 'care', day: party.day, outcome: 'Controlled recorded chapter fixture, not earned-play evidence.' })),
  });
}
assert.equal(party.companions.length, 6, 'all six shared calling profiles covered');
const [mira, orrin, kest, sable, tovin, vesper] = party.companions;
mira.hp = 0; orrin.active = false;
Object.assign(party.rpg.companionStages.orrin, { status: 'away', awayUntil: party.day + 28 });
kest.active = false; party.rpg.companionStages.kest.status = 'departed';
sable.alive = false; sable.active = false; sable.hp = 0; party.rpg.companionStages.sable.status = 'dead';
const remembered = party.lineage.people.find(row => row.source === 'companion' && row.localId === sable.id);
assert.ok(remembered, 'controlled deceased companion has a lineage record'); remembered.alive = false;
tovin.active = false; vesper.active = false;
const combat = fresh();
for (const [index, companion] of combat.companions.entries()) { companion.recruited = index < 3; companion.active = index < 3; }
combat.battle = { ...createBattle(combat, 'forest', null, { openingTurns: false }), instanceId: 'continuity-combat-v46-controlled' };
const battle = combat.battle, actors = battle.actors.filter(row => row.side === 'party'), foes = battle.actors.filter(row => row.side === 'enemy');
assert.equal(battle.effectsVersion, 27); assert.equal(actors.length, 4); assert.equal(foes.length, 2);
for (const companion of combat.companions.filter(row => row.active)) assert.deepEqual(actors.find(row => row.id === companion.id), companionCombatProfile(combat, companion).actor, 'source battle construction shares the Party actor read model');
battle.currentActorId = 'hero'; battle.turnOrder = [...actors.map(row => row.id), ...foes.map(row => row.id)];
for (const actor of actors) { actor.hp = actor.maxHp; actor.status = {}; }
actors[1].hp = 1;
actors[0].status = { poison: 3, poisonTurns: 2, ward: 8, sealed: 1 }; actors[0].sealedTechnique = 'attack';
foes[0].planCycle = [{ action: 'poisoning_strike', target: 'most_injured', amount: 2 }, { action: 'charge', target: 'self' }];
foes[0].aiStep = 0; foes[0].status = { charged: 4, stolenWard: 3 }; foes[0].intent = planIntent(foes[0]);
foes[1].planCycle = [{ action: 'wave', target: 'all_party', amount: -2 }]; foes[1].aiStep = 0; foes[1].status = {}; foes[1].intent = planIntent(foes[1]);
const expectedSlots = [activity, party, combat].map(state => structuredClone(roundtrip(state)));

const boot = bootSurface(), ui = boot.ui;
ui.storage.setItem('hearth-and-oath:slots:v1', JSON.stringify({ version: 1, activeSlot: 0, backups: {}, slots: expectedSlots.map((state, id) => ({ id, state, updatedAt: '2026-10-17T00:00:00.000Z' })) }));
ui.storage.setItem('hearth-and-oath:life:v1', JSON.stringify(activity));
let networkAttempts = 0, download = null, downloadClicks = 0, revocations = 0, timerId = 0, deferFrames = false;
const timers = new Map(), frames = [];
function noNetwork() { networkAttempts++; throw Error('Network forbidden during downloaded-handler verification'); }
class DownloadURL extends URL {
  static createObjectURL(blob) { assert.ok(blob instanceof Blob); assert.equal(download, null, 'one bounded offline download'); download = blob; return 'blob:offline-verifier'; }
  static revokeObjectURL(url) { assert.equal(url, 'blob:offline-verifier'); revocations++; }
}
ui.document.createElement = tag => { assert.equal(tag, 'a'); return { click() { downloadClicks++; } }; };
const context = createContext({
  document: ui.document, localStorage: ui.storage, FormData: ui.FormData, window: boot.window, location: boot.location,
  requestAnimationFrame(callback) { if (deferFrames) frames.push(callback); else callback(); return 1; },
  getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  Blob, URL: DownloadURL, AbortController, AbortSignal, TextEncoder, TextDecoder, console, queueMicrotask,
  fetch: noNetwork, XMLHttpRequest: class { constructor() { noNetwork(); } }, WebSocket: class { constructor() { noNetwork(); } },
});
new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
compiledGuard.runInContext(context, { timeout: 1000 });
await compiled.evaluate(context, { timeout: 30000 }); compiled = null; globalThis.gc?.();
boot.emit(ui.document, 'DOMContentLoaded');
assert.equal(ui.root.querySelector('#boot-state'), null, 'the actual downloaded graph replaces its original opening shell');
assert.equal(boot.failed(), false);
assert.equal(boot.listeners(boot.window, 'error').length, 0); assert.equal(boot.listeners(ui.document, 'DOMContentLoaded').length, 0);
const readyTitle = ui.root.innerHTML;
boot.emit(boot.window, 'error', { filename: boot.href });
assert.equal(ui.root.innerHTML, readyTitle, 'post-ready runtime errors cannot masquerade as startup failures');
let slot = 0;
function parity(label) {
  valid(ui.current()); assert.deepEqual(ui.current(), expectedSlots[slot], label + ': full embedded/source current-life parity');
  assert.deepEqual(ui.lives(), expectedSlots, label + ': three independent saved lives preserved');
  assert.equal(networkAttempts, 0, label + ': no network attempted');
}
function control(op, id) {
  const node = ui.root.querySelector(`[data-op="${op}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
  assert.ok(node, 'actual rendered command ' + op + '/' + (id ?? '')); return node;
}
function focused(op, id) {
  assert.equal(ui.document.activeElement?.dataset?.op, op); assert.equal(ui.document.activeElement.isConnected, true);
  if (id !== undefined) assert.equal(ui.document.activeElement.dataset.id, id);
}
function flushFrames() {
  for (let turns = 0; frames.length && turns < 20; turns++) for (const callback of frames.splice(0)) callback();
  assert.equal(frames.length, 0, 'bounded focus/announcement callbacks settle');
}
let announcement = ui.viewStatus.textContent;
const messages = [];
Object.defineProperty(ui.viewStatus, 'textContent', { configurable: true, get: () => announcement, set(value) { announcement = value; if (value) messages.push(value); } });
async function preview(op, id) { await ui.click(op, id); parity('read-only ' + op + '/' + (id ?? '')); }
async function load(id) {
  await ui.click('title-menu'); await ui.click('title-load'); await ui.click('slot-load', String(id)); slot = id;
  parity('load controlled slot ' + id); globalThis.gc?.();
}

// ID10: genuine reroll handlers replace the trigger and restore the replacement.
await ui.click('title-new'); await ui.click('slot-new', '0'); await ui.click('confirm-overwrite');
const creatorLives = JSON.stringify(ui.lives());
for (const op of ['creator-random', 'creator-name']) for (const key of ['Enter', ' ', 'Enter']) {
  const previous = control(op); previous.focus(); await ui.key(key); focused(op, '');
  assert.notEqual(ui.document.activeElement, previous); assert.equal(previous.isConnected, false);
  assert.equal(JSON.stringify(ui.lives()), creatorLives, 'rerolling never creates or replaces any saved life');
}
// A newer modal owns focus even when an earlier reroll restoration was queued.
deferFrames = true; control('creator-name').focus(); await ui.click('creator-name'); await ui.click('creator-portraits');
await Promise.resolve(); flushFrames(); assert.ok(ui.document.activeElement.classList.contains('modal-close'));
const modalControls = ui.root.querySelectorAll('.modal button:not(:disabled), .modal a[href], .modal input:not(:disabled), .modal select:not(:disabled), .modal textarea:not(:disabled), .modal [tabindex="0"]').filter(node => node.getClientRects().length);
assert.ok(modalControls.length); modalControls[0].focus();
assert.equal((await ui.key('Tab', { shiftKey: true })).defaultPrevented, true); assert.equal(ui.document.activeElement, modalControls.at(-1));
modalControls.at(-1).focus(); assert.equal((await ui.key('Tab')).defaultPrevented, true); assert.equal(ui.document.activeElement, modalControls[0]);
await ui.key('Escape'); flushFrames(); assert.equal(ui.root.querySelector('.modal'), null); focused('creator-portraits', ''); deferFrames = false;
await ui.click('creator-back'); assert.ok(ui.root.querySelector('[data-op="creator-discard"]')); await ui.click('creator-discard'); await ui.click('title-menu'); await ui.click('title-continue'); parity('cancel creator without replacing a life');

// Quantity labels name direction, item and unit, using the actual shop handlers.
await preview('place-open');
const provider = settlementServices(expectedSlots[slot]).find(row => row.kind === 'materials' && row.here); assert.ok(provider);
expectedSlots[slot] = valid(E.visitService(expectedSlots[slot], provider.id)); await ui.click('service-open', provider.id); parity('meet real materials provider');
await preview('shop-browse');
for (const [side, id] of [['buy', 'material:hide'], ['sell', 'gear:scholar_hood']]) {
  const row = tradeInventory(expectedSlots[slot], 'materials')[side].find(item => item.id === id); assert.ok(row);
  await preview('shop-item', side + ':' + id);
  assert.equal(ui.root.querySelector('.trade-inspector [data-op="shop-add"]').getAttribute('aria-label'), 'Increase ' + side + ' quantity for ' + row.name + ' by one' + (side === 'buy' ? ' bundle' : ''));
  await preview('shop-add', side + ':' + id);
  for (const [op, direction] of [['shop-remove', 'Decrease'], ['shop-add', 'Increase']]) assert.equal(ui.root.querySelector(`.trade-offer [data-op="${op}"][data-id="${side}:${id}"]`).getAttribute('aria-label'), direction + ' ' + side + ' quantity for ' + row.name + ' by one' + (side === 'buy' ? ' bundle' : ''));
}
await preview('shop-clear'); assert.equal(ui.document.activeElement.id, 'trade-heading');
await preview('shop-conversation'); assert.equal(ui.document.activeElement.id, 'meeting-speaker');
await preview('tab', 'activities'); await preview('activities-pane', 'fun'); messages.length = 0;
const walkTrigger = control('activity', 'leisure_walk'), beforeWalk = expectedSlots[slot];
walkTrigger.focus(); expectedSlots[slot] = valid(E.chooseAction(beforeWalk, 'leisure_walk')); await ui.key('Enter'); parity('ordinary accepted walk');
assert.equal(expectedSlots[slot].day, beforeWalk.day + 1); assert.deepEqual(messages, [expectedSlots[slot].notice]);
assert.ok(messages[0].length <= 280); assert.doesNotMatch(messages[0], /PRIVATE_OFFLINE|HEARTH|Your next birthday|Screen sections/);
assert.equal(ui.root.querySelector('.latest-result [role="status"]'), null, 'no duplicate outcome live region');
await ui.fire('click', walkTrigger); parity('detached ordinary action ignored'); assert.equal(messages.length, 1);
// A new navigation invalidates both queued outcome speech and obsolete focus.
messages.length = 0; deferFrames = true;
control('activity', 'leisure_sketch').focus(); expectedSlots[slot] = valid(E.chooseAction(expectedSlots[slot], 'leisure_sketch'));
await ui.click('activity', 'leisure_sketch'); await ui.click('tab', 'inventory'); flushFrames(); deferFrames = false;
parity('newer navigation suppresses stale outcome'); assert.deepEqual(messages, []);
assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'), 'Inventory'); assert.notEqual(ui.document.activeElement?.dataset?.id, 'leisure_sketch');

// ID12: all six actual Party disclosures read the shared source model, remain
// collapsed initially, and cannot change availability, resources or any slot.
await load(1); await preview('tab', 'party');
const profiles = ui.root.querySelectorAll('[data-companion-profile]');
assert.equal(profiles.length, party.companions.length); assert.equal(ui.root.querySelectorAll('.companion-card').length, profiles.length);
for (const companion of expectedSlots[slot].companions) {
  const node = ui.root.querySelector(`[data-companion-profile="${companion.id}"]`), profile = companionCombatProfile(expectedSlots[slot], companion);
  assert.ok(node); assert.ok(!node.open); assert.notEqual(node.getAttribute('open'), true); assert.equal(node.querySelectorAll('details').length, 0);
  for (const text of [`Health ${profile.actor.hp}/${profile.actor.maxHp}`, `Focus ${profile.actor.mp}/${profile.actor.maxMp}`, `Attack ${profile.attack}`, `Armor ${profile.armor}`, `Initiative ${profile.initiative}`, `Spell power ${profile.spellPower}`, profile.calling, `Growth ${profile.growth.step}/${profile.growth.max}`, `${profile.growth.victories} shared victories`]) assert.ok(node.textContent.includes(text), companion.id + ': authoritative ' + text);
  assert.equal(node.querySelectorAll('[data-companion-move]').length, profile.moves.length + profile.techniques.length);
  for (const move of [...profile.moves, ...profile.techniques]) {
    const shown = node.querySelector(`[data-companion-move="${move.id}"]`); assert.ok(shown);
    assert.ok(shown.textContent.includes(move.label)); assert.ok(shown.textContent.includes(move.description)); assert.ok(shown.textContent.includes(move.cost ? move.cost + ' MP' : 'Free'));
  }
  const readiness = node.closest('.companion-card').querySelector(`[data-companion-readiness="${profile.readiness.code}"]`);
  assert.ok(readiness); assert.equal(readiness.closest('details'), null, 'availability stays outside the disclosure');
}
assert.deepEqual(expectedSlots[slot].companions.map(companion => companionCombatProfile(expectedSlots[slot], companion).readiness.code), ['downed', 'away', 'departed', 'dead', 'reserve', 'reserve']);
let disclosure = ui.root.querySelector('[data-companion-profile="mira"]'); disclosure.open = true; await ui.fire('toggle', disclosure);
await preview('tab', 'character'); await preview('tab', 'party'); assert.equal(ui.root.querySelector('[data-companion-profile="mira"]').open, true); assert.ok(!ui.root.querySelector('[data-companion-profile="orrin"]').open);
disclosure = ui.root.querySelector('[data-companion-profile="mira"]'); disclosure.open = false; await ui.fire('toggle', disclosure);
await preview('tab', 'life'); await preview('tab', 'party'); assert.equal(ui.root.querySelector('[data-companion-profile="mira"]').open, false);
assert.equal(ui.current().companions.find(companion => companion.id === 'mira').hp, 0); assert.equal(ui.current().companions.find(companion => companion.id === 'sable').alive, false);

// ID13: actual actor cards label effects and the current single/group recipient.
// Compare text with the same resolver/display-name path used by source combat.
await load(2);
function battleReadout(label) {
  const state = expectedSlots[slot], captured = state.battle, namedTargetId = battleNamedTargetId(state, captured);
  const current = namedTargetId ? { ...captured, namedTargetId } : captured, displayName = actor => battleActorDisplayName(actor, current);
  for (const actor of current.actors) {
    const card = ui.root.querySelectorAll('.actor-card').find(node => node.querySelector('.actor-heading strong')?.textContent === displayName(actor)); assert.ok(card, 'actual card ' + actor.id);
    for (const row of combatStatusRows(actor)) {
      const shown = card.querySelector(`[data-combat-status="${row.key}"]`); assert.ok(shown, actor.id + '/' + row.key);
      assert.equal(shown.textContent, row.label); assert.equal(shown.getAttribute('title'), row.detail);
    }
    if (actor.side === 'enemy') {
      const selection = resolveEnemyTargets(current, actor), prediction = enemyRecipientPrediction(current, actor, displayName), shown = ui.root.querySelector(`[data-enemy-prediction="${actor.id}"]`);
      assert.ok(prediction && shown); assert.equal(shown.textContent, prediction.text);
      assert.deepEqual(prediction.recipientIds, selection.recipients.map(recipient => recipient.id)); assert.equal(prediction.targetId, selection.target?.id || null); assert.equal(prediction.scope, selection.scope);
    }
  }
  parity(label);
}
battleReadout('initial readable effects and current predictions');
assert.ok(ui.root.querySelector('[data-combat-status="poison"]').textContent.includes('Poison · 3 damage/turn · 2 turns left'));
assert.equal(ui.root.querySelector('[data-combat-status="poisonTurns"]'), null); assert.doesNotMatch(ui.root.innerHTML, /PoisonTurns|Poison Turns/);
assert.ok(ui.root.querySelector('[data-combat-status="sealed"]').textContent.includes('Seal · Attack · 1 action'));
assert.ok(ui.root.querySelector('[data-combat-status="stolenWard"]').textContent.includes('Stolen power'));
assert.match(ui.root.querySelector('[data-enemy-prediction="enemy-2"]').textContent, /Party-wide/);
assert.match(ui.root.querySelector('[data-enemy-prediction-note]').textContent, /Guarding, Health, Focus, marks/);
assert.match(ui.root.querySelector('[data-preview-explanation]').textContent, /immediate result before turn effects and enemy replies/);
for (const details of ui.root.querySelectorAll('[data-combat-status-details]')) { assert.ok(!details.open); details.open = true; await ui.fire('toggle', details); }
await preview('menu'); await preview('close-modal');
for (const name of ['battle-target', 'battle-ally-target']) {
  const target = ui.root.querySelectorAll(`[name="${name}"]`).at(-1); assert.ok(target); target.checked = true; await ui.fire('change', target); parity('read-only actual ' + name);
}
battleReadout('target inspection keeps captured battle and all resources');
const oldRecipient = ui.root.querySelector('[data-enemy-prediction="enemy-1"]').textContent;
assert.ok(getBattleActions(expectedSlots[slot].battle).some(row => row.id === 'defend' && !row.disabledReason));
const defendTrigger = control('battle-action', 'defend');
expectedSlots[slot] = valid(E.chooseBattleAction(expectedSlots[slot], 'defend')); await ui.click('battle-action', 'defend'); battleReadout('accepted Defend exact resolver and full-state parity');
const guarded = expectedSlots[slot].battle.actors.find(actor => actor.id === 'hero');
assert.equal(guarded.defending, true); assert.equal(guarded.status.protecting, true); assert.equal(guarded.status.sealed, undefined); assert.equal(guarded.sealedTechnique, undefined);
assert.equal(resolveEnemyTargets(expectedSlots[slot].battle, expectedSlots[slot].battle.actors.find(actor => actor.id === 'enemy-1')).target.id, 'hero');
assert.notEqual(ui.root.querySelector('[data-enemy-prediction="enemy-1"]').textContent, oldRecipient);
assert.match(ui.root.querySelector('[data-enemy-prediction="enemy-2"]').textContent, /Party-wide/);
assert.ok(ui.root.querySelector('[data-combat-status="guard"]').textContent.includes('Guarding'));
await ui.fire('click', defendTrigger); parity('detached battle command cannot defend for the next actor');

// ID14: invoke the actual downloaded app's file-mode download handler. Verify
// the entire resulting Blob by streaming its hash, without making another huge
// HTML string or compiling the media-heavy graph a second time.
await load(0); await preview('menu');
assert.ok(ui.root.innerHTML.includes('PRIVATE_OFFLINE_NOTE_NOT_AN_ACTION_RESULT') || ui.current().playerNotes.some(row => row.text === 'PRIVATE_OFFLINE_NOTE_NOT_AN_ACTION_RESULT'));
await ui.click('download-game');
// ID36 is an abortable asynchronous controller; observe its actual accepted
// completion, never infer success from dispatch or reuse an earlier Blob.
for(let step=0;step<50&&!download;step++)await turn();
assert.ok(download instanceof Blob, 'actual download handler creates the standalone file'); assert.equal(downloadClicks, 1);
assert.equal(download.type, 'text/html;charset=utf-8');
const prefix = '<!doctype html><html lang="en"><head>' + headMarkup + '</head><body><div id="app">' + bootMarkup + '</div><div id="view-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>';
const exportedParts = [prefix, moduleMarkup, '\n', guardMarkup, '</body></html>'];
const exportedHash = createHash('sha256'); let exportedBytes = 0;
for (const part of exportedParts) { exportedHash.update(part); exportedBytes += Buffer.byteLength(part); }
assert.equal(download.size, exportedBytes, 're-download contains only original head, boot shell, status and exact scripts');
const blobHash = createHash('sha256'); for await (const chunk of download.stream()) blobHash.update(chunk);
const redownloadSha256 = blobHash.digest('hex'); assert.equal(redownloadSha256, exportedHash.digest('hex'), 'every re-downloaded byte matches the save-free static document contract');
assert.equal(await download.slice(0, Buffer.byteLength(prefix)).text(), prefix, 'actual exported opening is the initial static shell, never live save/session markup');
for (const [id, timer] of [...timers]) if (timer.delay === 60000) { timers.delete(id); timer.callback(); }
assert.equal(revocations, 1); assert.equal(networkAttempts,0,'terminal zero network attempts, including actual local re-download'); parity('file-mode re-download is read-only and network-free');
// Exact exported composition above establishes that this guard/opening pair is
// retained in the copy; exercise its retry contract without recompiling entry.
const copied = quietBoot('file:///downloads/hearth-and-oath-copy.html');
assert.match(copied.message(), /^Loading Hearth & Oath/); copied.emit(copied.window, 'error', { target: copied.entry }); retryOnce(copied);
download = null; globalThis.gc?.();
console.log(JSON.stringify({
  version, bytes: manifest.bytes, parts: manifest.parts.length, sha256, redownloadBytes: exportedBytes, redownloadSha256,
  checks: [
    'exact current manifest bytes, ordered parts and SHA-256',
    'one unmodified downloaded module graph compiled and mounted once',
    'creator random/name Enter and Space replacement focus without save replacement',
    'newer modal focus, trap/Escape and stale reroll callback guard',
    'actual buy/sell quantity direction, item and bundle names without a trade',
    'ordinary accepted action full source parity and exactly one concise live outcome',
    'detached action and newer-navigation focus/announcement guards',
    'six collapsed Party profiles with actual shared values, moves, costs and readiness',
    'Party disclosure continuity with no healing, revival or saved-slot changes',
    'actual effect labels/details, poison duration and single/party-wide current recipients',
    'accepted Defend full source parity, refreshed aimed recipient and unchanged group coverage',
    'actual static boot delayed/failure/ready, partial-render shell class cleanup and save-safe once-only Retry',
    'actual file-mode re-download exact streamed save-free static-shell/script contract',
    'three independent controlled saved lives preserved throughout',
  ],
  network: 'forbidden; zero attempts',
  limits: 'semantic DOM and production-handler evidence only; no browser layout, screen-reader, physical keyboard, earned-life or balance claims',
}, null, 2));
