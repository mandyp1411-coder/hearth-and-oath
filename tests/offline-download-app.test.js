import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setImmediate as settle } from 'node:timers/promises';
import { migrateSave, validateSave } from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Actual app/module/engine integration in the semantic fake DOM. This is not
// browser layout, native download behavior, compiled HTML or screen-reader QA.
// Prepared for the parent's serialized engine lane; do not run concurrently.
const captured = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states;
// Preserve every captured identity record. Renaming only hero.name would make
// the active lineage hero disagree and correctly fail production validation.
function fixture(key = 'base') {
  const life = migrateSave(structuredClone(captured[key]));
  assert.ok(life, `captured ${key} life migrates through the canonical save gate`);
  assert.ok(validateSave(life));
  return life;
}
function deferred() { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; }
const saves = ui => Object.fromEntries(['hearth-and-oath:slots:v1', 'hearth-and-oath:life:v1'].map(key => [key, ui.storage.getItem(key)]));
const control = (ui, op) => ui.root.querySelector(`[data-op="${op}"]`);
const panel = ui => ui.root.querySelector('[data-offline-download]');
function panelOwnsStatus(ui, downloads, message) {
  assert.match(panel(ui).querySelector('[data-offline-announcement]').textContent, message);
  // This semantic fixture's synthetic toast does not parse the real shell's
  // hidden attribute. Observe actual live-text assignments, not CSS visibility.
  assert.deepEqual(downloads.toastAssignments, [], 'the mounted panel receives no duplicate global live-text assignment');
}
function installLocation(t) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { protocol: 'https:' } });
  t.after(() => original ? Object.defineProperty(globalThis, 'location', original) : delete globalThis.location);
}
function captureDownloads(t, ui) {
  const blobs = [], clicks = [], revoked = [], toastAssignments = [];
  const toast=ui.root.querySelector('#toast');let toastText=toast.textContent;
  Object.defineProperty(toast,'textContent',{configurable:true,get:()=>toastText,set(value){toastText=value;toastAssignments.push(value);}});
  t.mock.method(URL, 'createObjectURL', blob => { blobs.push(blob); return `blob:offline-${blobs.length}`; });
  t.mock.method(URL, 'revokeObjectURL', url => revoked.push(url));
  ui.document.createElement = tag => { assert.equal(tag, 'a'); return { click() { clicks.push(this.href); } }; };
  return { blobs, clicks, revoked, toastAssignments };
}
function controlledPart(bytes) {
  const gate = deferred(); let reads = 0, cancels = 0;
  return { gate, response: { ok: true, body: { getReader: () => ({
    read() { reads++; return reads === 1 ? Promise.resolve({ value: bytes.slice(0, 3), done: false }) : reads === 2 ? gate.promise : Promise.resolve({ done: true }); },
    cancel() { cancels++; }, releaseLock() {},
  }) } }, release() { gate.resolve({ value: bytes.slice(3), done: false }); }, cancelled: () => cancels };
}

test('actual drawer progress/cancel/retry survives reopening and another active slot without changing any durable life', async t => {
  installLocation(t);
  const initial = fixture('base'), neighbor = fixture('offsite');
  assert.notDeepEqual(initial, neighbor, 'distinct captured positions distinguish the active slot without renaming anyone');
  const ui = await mountApp(t, {rulebooks:'both',  states: [initial, neighbor] });
  await ui.click('title-continue'); await settle();
  const before = saves(ui), lives = structuredClone(ui.lives()), downloads = captureDownloads(t, ui);
  const bytes = new TextEncoder().encode('<!doctype html><title>世界 🗡️</title>');
  const attempts = [controlledPart(bytes), controlledPart(bytes)], calls = []; let partAttempt = 0;
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => {
    calls.push({ url, signal });
    if (url.endsWith('manifest.json')) return { ok: true, json: async () => ({ bytes: bytes.length, parts: [{ file: 'game-01.part', bytes: bytes.length }] }) };
    assert.equal(url, './offline/game-01.part'); return attempts[partAttempt++].response;
  });
  await ui.click('menu', 'header'); const start = control(ui, 'download-game'); start.focus();
  await ui.click('download-game'); await settle();
  assert.equal(control(ui, 'download-game'), start, 'byte progress cannot replace the app or its controls');
  assert.equal(start.disabled, true); assert.equal(ui.document.activeElement, control(ui, 'cancel-game-download'));
  assert.equal(Number(panel(ui).querySelector('[data-offline-progress]').value), 3);
  assert.match(panel(ui).querySelector('[data-offline-size]').textContent, new RegExp(`${bytes.length} bytes`));
  await ui.fire('click', start); await settle(); assert.equal(partAttempt, 1, 'a repeated click cannot start another fetch chain');
  assert.deepEqual(saves(ui), before); assert.equal(downloads.blobs.length, 0);
  await ui.click('cancel-game-download'); await settle();
  panelOwnsStatus(ui, downloads, /cancelled/);
  assert.equal(attempts[0].cancelled(), 1); assert.ok(calls[0].signal.aborted);
  assert.equal(ui.document.activeElement, start); assert.match(start.textContent, /Retry/);
  assert.equal(downloads.blobs.length, 0); assert.deepEqual(saves(ui), before);
  await ui.click('download-game'); await settle(); assert.equal(partAttempt, 2);
  await ui.click('close-modal'); assert.equal(panel(ui), null);
  await ui.click('menu', 'header');
  assert.equal(Number(panel(ui).querySelector('[data-offline-progress]').value), 3);
  assert.equal(control(ui, 'download-game').disabled, true);
  assert.deepEqual(saves(ui), before);

  // A download belongs to the application, not the life that started it.
  await ui.click('title-menu'); await ui.click('title-load'); await ui.click('slot-load', '1'); await settle();
  const afterSlotChange = saves(ui); assert.deepEqual(ui.lives(), lives); assert.deepEqual(ui.current(), lives[1]); assert.equal(JSON.parse(ui.storage.getItem('hearth-and-oath:slots:v1')).activeSlot, 1);
  await ui.click('menu', 'header'); assert.equal(Number(panel(ui).querySelector('[data-offline-progress]').value), 3);
  attempts[0].release(); await settle(); assert.equal(downloads.blobs.length, 0, 'late aborted bytes cannot create a file');
  attempts[1].release(); await settle();
  assert.equal(downloads.blobs.length, 1); assert.deepEqual(new Uint8Array(await downloads.blobs[0].arrayBuffer()), bytes);
  assert.deepEqual(downloads.clicks, ['blob:offline-1']); assert.deepEqual(downloads.revoked, []);
  assert.match(panel(ui).querySelector('[data-offline-message]').textContent, /Download started/);
  panelOwnsStatus(ui, downloads, /download started/);
  assert.equal(control(ui, 'cancel-game-download').hidden, true);
  assert.deepEqual(saves(ui), afterSlotChange); assert.deepEqual(ui.lives(), lives); assert.deepEqual(ui.current(), lives[1]); assert.equal(JSON.parse(ui.storage.getItem('hearth-and-oath:slots:v1')).activeSlot, 1);
  assert.equal(calls.length, 4, 'exactly one manifest and one part per user attempt');
});

test('actual app cancels an unknown-size manifest and retries a failed request without partial files or save changes', async t => {
  installLocation(t);
  const ui = await mountApp(t, {rulebooks:'both',  states: [fixture()] }); await ui.click('title-continue'); await settle();
  const before = saves(ui), downloads = captureDownloads(t, ui), oldManifest = deferred(), bytes = new TextEncoder().encode('<!doctype html>complete'); let manifests = 0, parts = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('manifest.json')) { manifests++; return manifests === 1 ? oldManifest.promise : manifests === 2 ? { ok: false } : { ok: true, json: async () => ({ bytes: bytes.length, parts: [{ file: 'game-01.part', bytes: bytes.length }] }) }; }
    parts++; return { ok: true, arrayBuffer: async () => bytes.buffer };
  });
  await ui.click('menu', 'header'); await ui.click('download-game'); await settle();
  assert.match(panel(ui).querySelector('[data-offline-message]').textContent, /Checking/);
  assert.equal(panel(ui).querySelector('[data-offline-received]').textContent, '');
  await ui.click('cancel-game-download'); await settle(); assert.equal(downloads.blobs.length, 0);
  panelOwnsStatus(ui, downloads, /cancelled/);
  await ui.click('download-game'); await settle(); assert.match(control(ui, 'download-game').textContent, /Retry/);
  assert.match(panel(ui).querySelector('[data-offline-message]').textContent, /could not be prepared/);
  panelOwnsStatus(ui, downloads, /could not be prepared/);
  oldManifest.resolve({ ok: true, json: async () => ({ bytes: bytes.length, parts: [{ file: 'game-01.part', bytes: bytes.length }] }) });
  await settle(); assert.equal(parts, 0); assert.equal(downloads.blobs.length, 0);
  await ui.click('download-game'); await settle(); assert.equal(downloads.blobs.length, 1); assert.equal(parts, 1);
  panelOwnsStatus(ui, downloads, /download started/);
  assert.deepEqual(saves(ui), before);
});
