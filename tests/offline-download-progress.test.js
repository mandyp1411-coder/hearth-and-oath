import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { loadOfflineGame, MAX_OFFLINE_BYTES } from '../dist/js/offline.js';
import { createOfflineDownload, offlineDownloadBusy } from '../dist/js/offline-download.js';
import { offlineDownloadView, renderOfflineDownload, updateOfflineDownload } from '../dist/js/offline-download-ui.js';

const encode = text => new TextEncoder().encode(text);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const manifestFor = chunks => ({ bytes: chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0), parts: chunks.map((chunk, index) => ({ file: `game-${String(index + 1).padStart(2, '0')}.part`, bytes: chunk.byteLength })) });
const htmlBlob = text => new Blob([text], { type: 'text/html;charset=utf-8' });
function fixture(chunks, overrides = {}) {
  const calls = [], responses = {
    './offline/manifest.json': { ok: true, json: async () => manifestFor(chunks) },
    ...Object.fromEntries(chunks.map((chunk, index) => [`./offline/game-${String(index + 1).padStart(2, '0')}.part`, { ok: true, arrayBuffer: async () => chunk.slice().buffer }])),
    ...overrides,
  };
  const fetcher = async (url, options) => { calls.push({ url, options }); return typeof responses[url] === 'function' ? responses[url](options) : responses[url]; };
  return { calls, fetcher };
}
function streamed(pieces, { error = null, pending = null } = {}) {
  let reads = 0, cancels = 0, released = 0;
  return { ok: true, body: { getReader: () => ({
    async read() { if (pending) return pending.promise; if (reads < pieces.length) return { value: pieces[reads++], done: false }; if (error) throw error; return { done: true }; },
    cancel() { cancels++; }, releaseLock() { released++; },
  }) }, stats: () => ({ reads, cancels, released }) };
}

test('stream progress counts exact payload bytes and complete parts, including split UTF-8, without text decoding', async () => {
  const payload = encode('<!doctype html><title>世界 🗡️ é</title>'), chunks = [payload.slice(0, 23), payload.slice(23, 31), payload.slice(31)];
  const streams = chunks.map(chunk => streamed([chunk.slice(0, 1), chunk.slice(1)]));
  const overrides = Object.fromEntries(streams.map((response, index) => [`./offline/game-${String(index + 1).padStart(2, '0')}.part`, response]));
  const { calls, fetcher } = fixture(chunks, overrides), progress = [], controller = new AbortController();
  const result = await loadOfflineGame(fetcher, { signal: controller.signal, onProgress: next => progress.push(next) });
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), payload);
  assert.equal(progress[0].totalBytes, null, 'unknown size must remain unknown until the manifest is validated');
  assert.equal(progress[1].totalBytes, payload.length);
  assert.equal(progress.at(-1).phase, 'complete');
  assert.equal(progress.at(-1).downloadedBytes, payload.length);
  assert.equal(progress.at(-1).completedParts, 3);
  for (let index = 1; index < progress.length; index++) {
    assert.ok(progress[index].downloadedBytes >= progress[index - 1].downloadedBytes);
    assert.ok(progress[index].downloadedBytes <= payload.length);
  }
  assert.ok(progress.some(next => next.downloadedBytes === 1 && next.completedParts === 0), 'stream bytes are visible before a whole part completes');
  assert.ok(calls.every(call => call.options.signal === controller.signal));
  assert.deepEqual(streams.map(stream => stream.stats()), Array(3).fill({ reads: 2, cancels: 0, released: 1 }));
});

test('unbounded, duplicate, reordered and unsafe manifests fail before any payload fetch', async () => {
  const bad = [
    { bytes: MAX_OFFLINE_BYTES + 1, parts: [{ file: 'game-01.part', bytes: MAX_OFFLINE_BYTES + 1 }] },
    { bytes: 2, parts: [{ file: 'game-01.part', bytes: 1 }, { file: 'game-01.part', bytes: 1 }] },
    { bytes: 2, parts: [{ file: 'game-02.part', bytes: 1 }, { file: 'game-01.part', bytes: 1 }] },
  ];
  for (const manifest of bad) {
    const { calls, fetcher } = fixture([encode('x')], { './offline/manifest.json': { ok: true, json: async () => manifest } });
    await assert.rejects(loadOfflineGame(fetcher), /manifest/);
    assert.equal(calls.length, 1);
  }
});

test('stream truncation, overflow, invalid bytes and read failures cancel/release and never complete', async () => {
  for (const [pieces, options, expected] of [
    [[encode('a')], {}, /unexpected byte count/],
    [[encode('abcd')], {}, /unexpected byte count/],
    [[new Uint16Array([12])], {}, /invalid bytes/],
    [[encode('a')], { error: new Error('connection interrupted') }, /connection interrupted/],
  ]) {
    const response = streamed(pieces, options), progress = [];
    const { calls, fetcher } = fixture([encode('abc'), encode('next')], { './offline/game-01.part': response });
    await assert.rejects(loadOfflineGame(fetcher, { onProgress: next => progress.push(next) }), expected);
    assert.equal(calls.length, 2, 'a failed part must not trigger another part request');
    assert.equal(response.stats().released, 1);
    if (options.error || pieces[0].byteLength > 3 || pieces[0] instanceof Uint16Array) assert.equal(response.stats().cancels, 1);
    assert.ok(!progress.some(next => next.phase === 'complete'));
  }
});

test('abort before the manifest never fetches; abort during manifest fetch or JSON never requests parts', async () => {
  const before = new AbortController(); before.abort(); let calls = 0;
  await assert.rejects(loadOfflineGame(async () => { calls++; }, { signal: before.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
  for (const stage of ['fetch', 'json']) {
    const wait = deferred(), controller = new AbortController();
    const response = stage === 'fetch' ? () => wait.promise : { ok: true, json: () => wait.promise };
    const mock = fixture([encode('abc')], { './offline/manifest.json': response });
    const result = loadOfflineGame(mock.fetcher, { signal: controller.signal });
    await tick(); controller.abort();
    await assert.rejects(result, { name: 'AbortError' });
    wait.resolve(stage === 'fetch' ? { ok: true, json: async () => manifestFor([encode('abc')]) } : manifestFor([encode('abc')]));
    await tick(); assert.equal(mock.calls.length, 1);
  }
});

test('abort during a pending part request or arrayBuffer rejects promptly and ignores its late completion', async () => {
  for (const stage of ['fetch', 'arrayBuffer']) {
    const wait = deferred(), controller = new AbortController(), events = [];
    const response = stage === 'fetch' ? () => wait.promise : { ok: true, arrayBuffer: () => wait.promise };
    const mock = fixture([encode('abc'), encode('def')], { './offline/game-01.part': response });
    const result = loadOfflineGame(mock.fetcher, { signal: controller.signal, onProgress: next => events.push(next) });
    await tick(); assert.equal(mock.calls.length, 2); controller.abort();
    await assert.rejects(result, { name: 'AbortError' });
    wait.resolve(stage === 'fetch' ? { ok: true, arrayBuffer: async () => encode('abc').buffer } : encode('abc').buffer);
    await tick(); assert.equal(mock.calls.length, 2); assert.ok(!events.some(next => next.phase === 'complete'));
  }
});

test('abort cancels a blocked stream reader even if its custom read promise never settles', async () => {
  const wait = deferred(), response = streamed([], { pending: wait }), controller = new AbortController();
  const mock = fixture([encode('abc'), encode('def')], { './offline/game-01.part': response });
  const result = loadOfflineGame(mock.fetcher, { signal: controller.signal });
  await tick(); controller.abort(); await assert.rejects(result, { name: 'AbortError' });
  assert.deepEqual(response.stats(), { reads: 0, cancels: 1, released: 1 });
  wait.resolve({ value: encode('abc'), done: false }); await tick(); assert.equal(mock.calls.length, 2);
});

test('abort from a final progress callback prevents the complete Blob from being returned', async () => {
  const controller = new AbortController(), mock = fixture([encode('abc')]);
  await assert.rejects(loadOfflineGame(mock.fetcher, { signal: controller.signal, onProgress: next => { if (next.completedParts === 1) controller.abort(); } }), { name: 'AbortError' });
});

test('double start shares one request, bounds announcements, and hands off only a valid complete Blob', async () => {
  const wait = deferred(), states = [], files = []; let loads = 0, report;
  const session = createOfflineDownload({ load: async options => { loads++; report = options.onProgress; return wait.promise; }, save: blob => files.push(blob), onChange: state => states.push(state) });
  const first = session.start(); assert.equal(session.start(), first); await tick(); assert.equal(loads, 1);
  for (let i = 0; i <= 1000; i++) report({ phase: 'loading', totalBytes: 1000, totalParts: 1, downloadedBytes: i, completedParts: i === 1000 ? 1 : 0, source: 'hosted-parts' });
  wait.resolve(htmlBlob('x'.repeat(1000))); assert.equal(await first, true);
  assert.equal(files.length, 1); assert.equal(session.state().phase, 'ready');
  const announcements = states.map(state => state.announcement).filter((value, index, all) => index === 0 || value !== all[index - 1]);
  assert.ok(announcements.length <= 6, `bounded live announcements, got ${announcements.length}`);
  assert.ok(announcements.every(text => !/network.*percent|ETA|remaining/i.test(text)));
  assert.equal(offlineDownloadBusy(session.state()), false);
});

test('cancel and immediate retry cannot let late progress, completion or failure save an old result', async () => {
  for (const oldOutcome of ['resolve', 'reject']) {
    const old = deferred(), next = deferred(), files = [], reports = [], signals = []; let count = 0;
    const session = createOfflineDownload({ load: options => { reports.push(options.onProgress); signals.push(options.signal); return ++count === 1 ? old.promise : next.promise; }, save: blob => files.push(blob) });
    const first = session.start(); await tick(); assert.equal(session.cancel(), true); assert.equal(signals[0].aborted, true);
    assert.equal(session.state().phase, 'cancelled'); assert.equal(files.length, 0);
    const retry = session.start(); await tick();
    reports[0]({ phase: 'complete', totalBytes: 999, downloadedBytes: 999 });
    assert.equal(session.state().totalBytes, null, 'stale progress cannot replace retry state');
    if (oldOutcome === 'resolve') old.resolve(htmlBlob('old')); else old.reject(new Error('old failure'));
    assert.equal(await first, false); assert.equal(session.state().phase, 'manifest'); assert.equal(files.length, 0);
    next.resolve(htmlBlob('new')); assert.equal(await retry, true); assert.equal(files.length, 1); assert.equal(await files[0].text(), 'new');
  }
});

test('failure permits a fresh retry and invalid or empty files never reach the save handoff', async () => {
  let loads = 0; const files = [];
  const session = createOfflineDownload({ load: async () => { if (++loads === 1) throw new Error('missing part'); return htmlBlob('complete'); }, save: blob => files.push(blob) });
  assert.equal(await session.start(), false); assert.equal(session.state().phase, 'error');
  assert.equal(await session.start(), true); assert.equal(loads, 2); assert.equal(files.length, 1);
  for (const bad of [null, new Blob(), new Blob(['html'], { type: 'text/plain' })]) {
    const broken = createOfflineDownload({ load: async () => bad, save() { assert.fail('invalid file was handed off'); } });
    assert.equal(await broken.start(), false); assert.equal(broken.state().phase, 'error');
  }
});

test('local copy never invokes the hosted loader and cancellation prevents its save handoff', async () => {
  const wait = deferred(); let local = 0, saves = 0;
  const session = createOfflineDownload({ isLocal: () => true, localCopy: () => { local++; return wait.promise; }, load() { assert.fail('local copy fetched hosted parts'); }, save() { saves++; } });
  const result = session.start(); await tick(); session.cancel(); wait.resolve(htmlBlob('local')); assert.equal(await result, false);
  assert.equal(local, 1); assert.equal(saves, 0);
});

test('view and markup distinguish unknown size, complete bytes, retry and cache uncertainty without an ETA', () => {
  const session = createOfflineDownload(); const idle = renderOfflineDownload(session.state());
  assert.match(idle, /aria-live="polite"/); assert.match(idle, /data-offline-progress aria-label="Offline file bytes reassembled"  hidden/);
  const state = { ...session.state(), phase: 'loading', source: 'hosted-parts', totalBytes: 132480685, downloadedBytes: 8388608, totalParts: 16, completedParts: 1 };
  const view = offlineDownloadView(state), markup = renderOfflineDownload(state);
  assert.match(view.size, /132,480,685 bytes \(126.3 MiB\)/); assert.match(view.received, /8,388,608 \/ 132,480,685 bytes reassembled · 1 \/ 16 parts complete/);
  assert.match(view.source, /may use cached/); assert.match(view.source, /not network-transfer progress/);
  assert.match(markup, /max="132480685" value="8388608"/); assert.match(markup, /data-op="cancel-game-download" >Cancel download/);
  assert.equal(offlineDownloadView({ ...state, phase: 'error' }).action, 'Retry offline download');
  assert.match(offlineDownloadView({ ...state, source: 'local-copy' }).source, /without network requests/);
  assert.doesNotMatch(markup, /[0-9]+ seconds|[0-9]+ minutes|ETA/);
});

function panelFixture() {
  const document = { activeElement: null }, nodes = {};
  for (const name of ['message', 'size', 'received', 'source', 'progress', 'announcement', 'action', 'cancel']) nodes[name] = { ownerDocument: document, textContent: '', attrs: {}, removeAttribute(name) { delete this.attrs[name]; }, focus() { document.activeElement = this; } };
  const panel = { ownerDocument: document, querySelector(selector) { if (selector === '[data-op="download-game"]') return nodes.action; if (selector === '[data-op="cancel-game-download"]') return nodes.cancel; return nodes[selector.match(/data-offline-(\w+)/)[1]]; } };
  const root = { querySelector: () => panel, set innerHTML(_) { assert.fail('a byte update must not replace the game DOM'); } };
  return { root, nodes, document };
}

test('panel byte updates retain nodes/focus and move focus only when its active control becomes unavailable', () => {
  const { root, nodes, document } = panelFixture(), session = createOfflineDownload();
  document.activeElement = nodes.action;
  const state = { ...session.state(), phase: 'loading', totalBytes: 6, downloadedBytes: 1, totalParts: 2, completedParts: 0, announcement: 'Checking offline file.' };
  updateOfflineDownload(root, state); assert.equal(document.activeElement, nodes.cancel); assert.equal(nodes.progress.value, 1);
  updateOfflineDownload(root, { ...state, downloadedBytes: 3, completedParts: 1 }); assert.equal(document.activeElement, nodes.cancel); assert.equal(nodes.progress.value, 3);
  updateOfflineDownload(root, { ...state, phase: 'cancelled' }); assert.equal(document.activeElement, nodes.action); assert.equal(nodes.cancel.hidden, true);
  document.activeElement = { outside: true }; const outside = document.activeElement;
  updateOfflineDownload(root, { ...state, phase: 'ready' }); assert.equal(document.activeElement, outside);
  assert.equal(nodes.action.textContent, 'Download offline game ↓');
});

const app = readFileSync(new URL('../dist/js/app.js', import.meta.url), 'utf8');
const helperStart = app.indexOf('async function downloadGame(){'), helperEnd = app.indexOf('\nfunction compactStory', helperStart);
function actualHandlers({ local = false, load, scripts = [{ src: '', type: 'module', outerHTML: '<script type="module">static runtime only</script>' }] } = {}) {
  const files = [], urls = [], clicks = [], revoked = [], panel = panelFixture(), timers = [], toasts = [];
  const context = createContext({ Blob, AbortController, bootMarkup: '<main id="boot-state">Initial safe shell</main>', root: panel.root,
    document: { head: { innerHTML: '<title>Static title</title>' }, querySelectorAll: () => scripts, createElement: () => ({ click() { clicks.push(this.href); } }) },
    location: { protocol: local ? 'file:' : 'https:' },
    URL: { createObjectURL(blob) { files.push(blob); const url = `blob:complete-${files.length}`; urls.push(url); return url; }, revokeObjectURL(url) { revoked.push(url); } },
    setTimeout(callback) { timers.push(callback); }, toast(message) { toasts.push(message); }, updateOfflineDownload,
    createOfflineDownload(options) { return createOfflineDownload({ ...options, ...(load ? { load } : {}) }); },
  });
  new Script(`${app.slice(helperStart, helperEnd)}\n${app.match(/^const offlineDownload = createOfflineDownload\(.*$/m)[0]}`).runInContext(context);
  return { context, files, urls, clicks, revoked, panel, timers, toasts, run: code => new Script(code).runInContext(context) };
}

for (const phase of ['ready', 'error', 'cancelled']) test(`actual ${phase} feedback has one announcing surface, with a fallback only when the panel is absent`, () => {
  const harness = actualHandlers(), announcement = `Controlled ${phase} outcome.`, assignments = [];
  let current = ''; Object.defineProperty(harness.panel.nodes.announcement, 'textContent', { get: () => current, set(value) { assignments.push(value); current = value; } });
  const focused = { outside: true }; harness.panel.document.activeElement = focused;
  const command = `refreshOfflineDownload(${JSON.stringify({ phase, totalBytes: null, downloadedBytes: 0, totalParts: null, completedParts: 0, source: 'hosted-parts', announcement })})`;
  harness.run(command); harness.run(command);
  assert.deepEqual(assignments, [announcement], 'the exact same panel message is assigned once');
  assert.deepEqual(harness.toasts, [], 'the mounted polite status is not duplicated by a global live toast');
  assert.equal(harness.panel.document.activeElement, focused); assert.deepEqual(harness.files, []);
  const closed = actualHandlers(); closed.panel.root.querySelector = () => null; closed.panel.document.activeElement = focused;
  closed.run(command); assert.equal(closed.toasts.length, 1, 'an absent panel gets one intended fallback assignment');
  assert.equal(closed.panel.document.activeElement, focused); assert.deepEqual(closed.files, []);
});

test('actual app handlers use one complete Blob/URL, exact bytes, and revoke only their own URL', async () => {
  const bytes = encode('<!doctype html><title>世界 🗡️</title>'), mock = fixture([bytes.slice(0, 23), bytes.slice(23)]);
  const harness = actualHandlers({ load: options => loadOfflineGame(mock.fetcher, options) });
  await harness.run('downloadGame()');
  assert.equal(harness.files.length, 1); assert.deepEqual(new Uint8Array(await harness.files[0].arrayBuffer()), bytes);
  assert.deepEqual(harness.clicks, ['blob:complete-1']); assert.deepEqual(harness.revoked, []);
  harness.timers.at(-1)(); assert.deepEqual(harness.revoked, ['blob:complete-1']);
});

test('actual app cancel/retry handlers ignore old completions, survive missing/new panel views, and never access saves', async () => {
  const old = deferred(), fresh = deferred(); let loads = 0;
  const harness = actualHandlers({ load: () => ++loads === 1 ? old.promise : fresh.promise });
  const first = harness.run('downloadGame()'); await tick(); harness.run('cancelGameDownload()');
  assert.deepEqual(harness.toasts, [], 'mounted cancellation uses only the panel status');
  harness.panel.root.querySelector = () => null; // Drawer closed / view or slot changed.
  const retry = harness.run('downloadGame()'); await tick(); old.resolve(htmlBlob('old'));
  assert.equal(await first, false); assert.equal(harness.files.length, 0);
  assert.deepEqual(harness.toasts, [], 'the obsolete token cannot announce or hand off a file');
  fresh.resolve(htmlBlob('new')); assert.equal(await retry, true); assert.equal(harness.files.length, 1); assert.equal(await harness.files[0].text(), 'new');
  assert.deepEqual(harness.toasts, ['Offline game download started. Check your browser downloads.']);
  assert.ok(!/saveStore|activeSlot|game\s*=|render\(/.test(app.slice(helperStart, helperEnd)), 'download handlers must not read/write character or save state');
  assert.match(app, /if\(op==='cancel-game-download'\)\{cancelGameDownload\(\);return;\}/);
});

test('actual local app re-download preserves static boot content and cannot fetch even when inline content is missing', async () => {
  const local = actualHandlers({ local: true, load() { assert.fail('hosted loader used from file:'); } });
  await local.run('downloadGame()'); const text = await local.files[0].text();
  assert.match(text, /Initial safe shell/); assert.match(text, /static runtime only/); assert.doesNotMatch(text, /data-offline-download/);
  const missing = actualHandlers({ local: true, scripts: [{ src: '', type: '', outerHTML: '<script id="boot-guard">guard only, no game</script>' }], load() { assert.fail('missing inline runtime silently fetched hosted file'); } });
  assert.equal(await missing.run('downloadGame()'), false); assert.equal(missing.files.length, 0); assert.equal(missing.clicks.length, 0);
});
