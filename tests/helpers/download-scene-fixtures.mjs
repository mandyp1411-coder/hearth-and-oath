import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setImmediate as settle } from 'node:timers/promises';
import * as E from '../../dist/js/engine.js';
import { settlementServices } from '../../dist/js/world-services.js';
import { settlementWalkPath } from '../../dist/js/exploration-ui.js';
import { personalNoteRows } from '../../dist/js/personal-notes.js';
import { mountApp } from './ui-surface.mjs';

// Canonical historical captures, not newly simulated or action-earned lives.
// Explicit equipment/note inputs are controlled QA data. Keep every captured
// identity, date and resource intact; walk only the real provider's room path.
const captured = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/v30-explore-travel.json.gz', import.meta.url)))).states;
let canonical;
export function sceneFixture({ kind = 'work', notes = 1, archived = false, unequipped = false } = {}) {
  canonical ||= E.migrateSave(structuredClone(captured.base));
  assert.ok(canonical && E.validateSave(canonical), 'canonical capture passes the unmodified save gate');
  let state = structuredClone(canonical);
  state.equipment.owned = [...new Set([...state.equipment.owned, 'iron_sword', 'travel_cloak'])];
  state = E.equipGear(state, 'iron_sword');
  state = E.equipGear(state, 'travel_cloak');
  const result = E.gearOrganizerCommand(state, { kind: 'save', id: 'loadout_1', label: 'Controlled exact kit' });
  assert.equal(result.ok, true); state = result.state;
  if (unequipped) state = E.equipGear(state, 'unequip_weapon');
  state.playerNotes = Array.from({ length: notes }, (_, index) => ({
    id: 'note-' + (index + 1), ownerId: state.dynasty.activePersonId,
    generation: state.dynasty.generation, day: state.day, noteVersion: 0,
    archived: archived && index === 0, text: 'Controlled reminder ' + (index + 1) + ' · élan Ω <literal>',
  }));
  const provider = settlementServices(state).find(row => row.kind === kind);
  assert.ok(provider, 'captured world provides the requested actual service');
  const path = settlementWalkPath(state, provider.roomId); assert.ok(path);
  for (const room of path) {
    const action = E.getActions(state).find(row => row.id === 'atlas_room_' + room && !row.disabledReason);
    assert.ok(action, 'controlled setup uses an offered room walk');
    state = E.chooseAction(state, action.id);
  }
  assert.ok(E.validateSave(state));
  assert.equal(state.event, null); assert.equal(state.battle, null); assert.equal(state.conversations.pending, null);
  assert.equal(state.day, canonical.day, 'fixture room walks do not spend days');
  return state;
}

export async function openLife(t, state = sceneFixture(), options = {}) {
  const ui = await mountApp(t, { states: [state], ...options });
  await ui.click('title-continue'); await settle(); return ui;
}
export async function openScene(ui, kind = 'work', topic = kind === 'work' ? 'commissions' : null) {
  const provider = settlementServices(ui.current()).find(row => row.kind === kind && row.here);
  assert.ok(provider, 'provider is actually in this life and room');
  await ui.click('place-open'); await ui.click('service-open', provider.id); await settle();
  if (topic) await ui.click('service-topic', topic);
  assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson, provider.personId);
  const current = settlementServices(ui.current()).find(row => row.id === provider.id && row.here);
  assert.ok(current); return current;
}
export const control = (ui, op, id) => ui.root.querySelector(`[data-op="${op}"]${id === undefined ? '' : `[data-id="${id}"]`}`);
export const returnControl = ui => control(ui, 'scene-return');
export const panel = ui => ui.root.querySelector('[data-offline-download]');
export const savedBytes = ui => Object.fromEntries(['hearth-and-oath-legacy:slots:v1', 'hearth-and-oath-legacy:life:v1'].map(key => [key, ui.storage.getItem(key)]));
export const storageBytes = ui => [...ui.values].sort(([a], [b]) => a.localeCompare(b));
export const noteKey = (ui, id = 'note-1') => { const note = personalNoteRows(ui.current()).find(row => row.id === id && row.own); assert.ok(note); return note.key; };
export const activeSlot = ui => JSON.parse(ui.storage.getItem('hearth-and-oath-legacy:slots:v1')).activeSlot;
export function trackWrites(ui) {
  const writes = [], set = ui.storage.setItem.bind(ui.storage);
  ui.storage.setItem = (key, value) => { writes.push([key, String(value)]); return set(key, value); };
  return writes;
}
export function assertPendingAndProvider(ui, before, provider) {
  const after = ui.current();
  for (const key of ['day', 'age', 'event', 'battle', 'cartography', 'conversations', 'timeline', 'locationId', 'hero', 'life', 'pastimes', 'repertoire']) assert.deepEqual(after[key], before[key], key + ' remains exact');
  const actual = settlementServices(after).find(row => row.id === provider.id);
  assert.deepEqual(actual, provider, 'the complete actual provider/person binding remains exact');
}
export function deferred() {
  let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function controlledPart(bytes) {
  const gate = deferred(); let reads = 0, cancels = 0;
  return { response: { ok: true, body: { getReader: () => ({
    read() { reads++; return reads === 1 ? Promise.resolve({ value: bytes.slice(0, 3), done: false }) : reads === 2 ? gate.promise : Promise.resolve({ done: true }); },
    cancel() { cancels++; }, releaseLock() {},
  }) } }, release() { gate.resolve({ value: bytes.slice(3), done: false }); }, fail(error = Error('Controlled late stream failure')) { gate.reject(error); }, cancelled: () => cancels };
}
export function installDownload(t, ui, bytes, attempts) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { protocol: 'https:' } });
  t.after(() => original ? Object.defineProperty(globalThis, 'location', original) : delete globalThis.location);
  const blobs = [], clicks = [], revoked = [], calls = []; let manifestCount = 0, current;
  t.mock.method(URL, 'createObjectURL', blob => { blobs.push(blob); return 'blob:composed-' + blobs.length; });
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  ui.document.createElement = tag => { assert.equal(tag, 'a'); return { click() { clicks.push(this.href); } }; };
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => {
    calls.push({ url, signal });
    if (url === './offline/manifest.json') {
      current = attempts[manifestCount++]; assert.ok(current, 'no unrequested download attempt');
      return current.manifest || { ok: true, json: async () => ({ bytes: bytes.length, parts: [{ file: 'game-01.part', bytes: bytes.length }] }) };
    }
    assert.equal(url, './offline/game-01.part'); assert.ok(current.part); return current.part.response;
  });
  return { blobs, clicks, revoked, calls, manifests: () => manifestCount };
}
export async function startDownload(ui) {
  await ui.click('menu', 'header'); await ui.click('download-game'); await settle();
  assert.equal(Number(panel(ui).querySelector('[data-offline-progress]').value), 3);
}
export async function assertCompleteFile(download, bytes) {
  assert.equal(download.blobs.length, 1, 'only one complete file is handed off');
  assert.equal(download.blobs[0].type, 'text/html;charset=utf-8');
  assert.deepEqual(new Uint8Array(await download.blobs[0].arrayBuffer()), bytes);
  assert.deepEqual(download.clicks, ['blob:composed-1']); assert.deepEqual(download.revoked, []);
}

// The real drawer is replaced by practice, so there are no naturally connected
// download buttons then. Reattach exact previously rendered production nodes
// as a controlled inert-background handler probe. No data-op is manufactured,
// no ownership/token is rewritten, and this is NOT browser-retention evidence.
export function captureSubtree(ui, node) {
  assert.ok(node && node.isConnected);
  const nodes = ui.root.nodes.filter(item => item === node || (() => { for (let parent = item.parentElement; parent; parent = parent.parentElement) if (parent === node) return true; return false; })());
  return { node, nodes, ownerDocument: node.ownerDocument };
}
export function reconnectBackground(ui, captured) {
  const background = ui.root.querySelector('.app-shell'); assert.ok(background && background.inert);
  captured.node.parentElement = background;
  for (const node of captured.nodes) { node.isConnected = true; if (!ui.root.nodes.includes(node)) ui.root.nodes.push(node); }
  assert.equal(captured.node.ownerDocument, captured.ownerDocument, 'the original DOM owner is preserved');
  assert.equal(captured.node.closest('.practice-modal'), null);
  return captured.node;
}
