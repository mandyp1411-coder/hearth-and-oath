import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { fakeSurface } from './helpers/ui-surface.mjs';
import { createOfflineDownload } from '../dist/js/offline-download.js';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const entryTag = '<script type="module" src="./js/app.js"></script>';

// Execute the production HTML's guard. This models DOM/event contracts, not a
// browser's module loader, CSS, or the visibility of a real rendered page.
function mountBoot(source = html, href = 'https://game.invalid/index.html') {
  const surface = fakeSurface();
  const { root, document } = surface;
  const channels = new WeakMap();
  function eventTarget(target) {
    const listeners = new Map();
    channels.set(target, listeners);
    target.addEventListener = (type, handler, capture = false) => {
      const rows = listeners.get(type) || [];
      if (!rows.some(row => row.handler === handler && row.capture === capture)) rows.push({ handler, capture });
      listeners.set(type, rows);
    };
    target.removeEventListener = (type, handler, capture = false) => {
      listeners.set(type, (listeners.get(type) || []).filter(row => row.handler !== handler || row.capture !== capture));
    };
    return target;
  }
  function emit(target, type, event = {}) {
    for (const { handler } of [...(channels.get(target)?.get(type) || [])]) handler({ target, ...event });
  }
  const originalHTML = Object.getOwnPropertyDescriptor(root, 'innerHTML');
  Object.defineProperty(root, 'innerHTML', {
    get() { return originalHTML.get.call(root); },
    set(value) {
      originalHTML.set.call(root, value);
      for (const node of root.nodes) eventTarget(node);
    },
  });
  const initial = source.match(/<div id="app">([\s\S]*?)<\/div>\s*<div id="view-status"/);
  assert.ok(initial, 'the real placeholder precedes the independent selection status');
  root.innerHTML = initial[1];
  const moduleTags = [...source.matchAll(/<script type="module"([^>]*)>/g)];
  assert.equal(moduleTags.length, 1, 'one entry only, including after bundling');
  const src = moduleTags[0][1].match(/src="([^"]+)"/)?.[1] || null;
  const entry = eventTarget({ getAttribute: name => name === 'src' ? src : null, hasAttribute: name => name === 'src' && src !== null });
  const window = eventTarget({});
  eventTarget(document);
  document.baseURI = href;
  document.querySelector = selector => selector === 'script[type="module"]' ? entry : root.querySelector(selector);
  const saved = new Map([
    ['hearth-and-oath-legacy:slots:v1', '{"slots":[{"synthetic":"existing life"}]}'],
    ['hearth-and-oath-legacy:life:v1', '{"synthetic":"current life"}'],
    ['unrelated-setting', 'preserve me'],
  ]);
  const before = [...saved];
  let reloads = 0, storageAccesses = 0, networkCalls = 0, timers = 0;
  const context = createContext({
    document, window, URL,
    location: { href, reload() { reloads++; } },
    get localStorage() { storageAccesses++; throw new Error('Boot must not access browser storage'); },
    fetch() { networkCalls++; throw new Error('Boot must not request another resource'); },
    setTimeout() { timers++; throw new Error('Slow startup must not be timed out'); },
  });
  const guard = source.match(/<script id="boot-guard">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(guard, 'execute the actual inline guard, not a copied implementation');
  new Script(guard, { filename: 'boot-guard.js' }).runInContext(context);
  return {
    root, document, entry, window, emit, saved, before, bodyClasses: surface.bodyClasses,
    listeners: (target, type) => channels.get(target)?.get(type) || [],
    failed: () => root.querySelector('#boot-recovery')?.hidden === false,
    message: () => root.querySelector('#boot-message')?.textContent,
    stats: () => ({ reloads, storageAccesses, networkCalls, timers }),
    assertSafe() {
      assert.deepEqual([...saved], before, 'every stored byte is unchanged');
      assert.deepEqual({ storageAccesses, networkCalls, timers }, { storageAccesses: 0, networkCalls: 0, timers: 0 });
    },
  };
}

function assertClean(boot) {
  assert.equal(boot.listeners(boot.window, 'error').length, 0);
  assert.equal(boot.listeners(boot.document, 'DOMContentLoaded').length, 0);
  boot.assertSafe();
}

function inlineFixture() {
  assert.equal(html.split(entryTag).length - 1, 1);
  const builder = readFileSync(new URL('../scripts/build-offline.mjs', import.meta.url), 'utf8');
  const replacement = builder.split('\n').find(line => line.startsWith(`html = html.replace('${entryTag}'`));
  assert.ok(replacement, 'the production builder still replaces the entry tag');
  const context = createContext({ html, moduleMedia:{}, bundle: 'document.getElementById("app").innerHTML = "<main>Ready</main>";' });
  new Script(replacement).runInContext(context);
  assert.equal(context.html.includes(entryTag), false, 'the offline entry does not import hosted app.js');
  return context.html;
}

test('delayed module loading stays quiet, with no timeout, retry request, or storage access', async () => {
  const boot = mountBoot();
  assert.match(boot.message(), /^Loading Hearth & Oath/);
  assert.equal(boot.failed(), false);
  assert.equal(boot.listeners(boot.window, 'error')[0].capture, true, 'non-bubbling resource errors need capture');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.match(boot.message(), /^Loading Hearth & Oath/);
  assert.equal(boot.failed(), false);
  boot.assertSafe();
});

for (const scenario of ['blocked entry', 'missing dependency']) {
  test(`${scenario} entry error reveals one save-safe recovery and locks fast double Retry`, () => {
    const boot = mountBoot();
    // Browsers report a failed module graph on its owning script element,
    // including when the requested entry exists but a dependency does not.
    boot.emit(boot.window, 'error', { target: boot.entry });
    assert.equal(boot.failed(), true);
    assert.equal(boot.message(), 'Hearth & Oath could not start.');
    assert.equal(boot.root.querySelector('#boot-state').dataset.phase, 'failed', 'failed startup ends the decorative loading animation');
    assert.match(boot.root.querySelector('#boot-recovery').textContent, /does not mean your saved lives have been erased/);
    const retry = boot.root.querySelector('#boot-retry');
    const failedMessage = boot.root.querySelector('#boot-message');
    boot.emit(boot.window, 'error', { target: boot.entry });
    boot.emit(boot.document, 'DOMContentLoaded');
    assert.equal(boot.root.querySelector('#boot-message'), failedMessage, 'late/repeated events cannot recreate recovery');
    assert.equal(boot.listeners(retry, 'click').length, 1);
    boot.emit(retry, 'click');
    boot.emit(retry, 'click'); // Even a queued click cannot request a second reload.
    assert.equal(boot.stats().reloads, 1);
    assert.equal(retry.disabled, true);
    assert.equal(retry.textContent, 'Reloading…');
    assertClean(boot);
  });
}

for (const filename of ['https://game.invalid/js/app.js', 'https://game.invalid/js/engine.js']) {
  test(`scoped startup runtime/parse error from ${new URL(filename).pathname} recovers even after partial render`, () => {
    const boot = mountBoot();
    boot.root.innerHTML = '<main id="partial-title">A partially initialized title</main>';
    for (const name of ['title-mode', 'creation-mode', 'game-mode', 'has-dialog', 'unrelated-preference']) boot.document.body.classList.toggle(name, true);
    boot.emit(boot.window, 'error', { filename, message: 'private diagnostic must not reach the UI' });
    assert.equal(boot.failed(), true);
    assert.equal(boot.root.querySelector('#partial-title'), null);
    assert.deepEqual([...boot.bodyClasses], ['unrelated-preference'], 'recovery clears only app modes that can clip Retry');
    assert.doesNotMatch(boot.root.querySelector('#boot-state').textContent, /private diagnostic/);
    assertClean(boot);
  });
}

test('images, styles, extension errors, unrelated sources and unknown filenames cannot replace startup', () => {
  const boot = mountBoot();
  for (const event of [
    { target: { tagName: 'IMG' } },
    { target: { tagName: 'LINK' } },
    { filename: 'chrome-extension://example/content.js' },
    { filename: 'moz-extension://example/content.js' },
    { filename: 'https://other.invalid/js/app.js' },
    { filename: 'https://game.invalid/js-other/app.js' },
    { filename: 'https://game.invalid/unrelated.js' },
    { filename: 'https://game.invalid/index.html' },
    { filename: '' },
    { message: 'Script error.' },
  ]) boot.emit(boot.window, 'error', event);
  assert.equal(boot.failed(), false);
  assert.match(boot.message(), /^Loading Hearth & Oath/);
  boot.root.innerHTML = '<main id="title-screen">Ready</main>';
  boot.emit(boot.document, 'DOMContentLoaded');
  assertClean(boot);
});

test('successful first render removes the placeholder naturally and detaches temporary guards', () => {
  const boot = mountBoot();
  boot.root.innerHTML = '<main id="title-screen">Ready</main>';
  boot.emit(boot.document, 'DOMContentLoaded');
  const title = boot.root.innerHTML;
  assert.equal(boot.root.querySelector('#boot-state'), null);
  assert.equal(boot.root.querySelector('#boot-retry'), null);
  boot.emit(boot.window, 'error', { filename: 'https://game.invalid/js/app.js' });
  boot.emit(boot.document, 'DOMContentLoaded');
  assert.equal(boot.root.innerHTML, title, 'post-start errors are not relabelled as loading failures');
  assertClean(boot);
});

test('deferred module completion without a first render cannot strand Loading', () => {
  // The entry opens its save database before rendering (a top-level await),
  // so DOMContentLoaded alone is not a verdict: the guard waits for the
  // entry's own load event, and only a completed entry with no render fails.
  const boot = mountBoot();
  boot.emit(boot.document, 'DOMContentLoaded');
  assert.equal(boot.failed(), false);
  assert.match(boot.message(), /^Loading Hearth & Oath/);
  boot.emit(boot.entry, 'load');
  assert.equal(boot.failed(), true);
  assertClean(boot);
});

test('an entry that renders after DOMContentLoaded settles on its load event without a retry prompt', () => {
  const boot = mountBoot();
  boot.emit(boot.document, 'DOMContentLoaded');
  boot.root.innerHTML = '<main id="title-screen">Ready</main>';
  boot.emit(boot.entry, 'load');
  assert.equal(boot.failed(), false);
  assert.equal(boot.root.querySelector('#boot-retry'), null);
  assertClean(boot);
});

test('Retry starts a new document, with one entry and one set of temporary handlers', () => {
  const first = mountBoot();
  first.emit(first.window, 'error', { target: first.entry });
  first.emit(first.root.querySelector('#boot-retry'), 'click');
  assert.equal(first.stats().reloads, 1);
  const next = mountBoot();
  assert.equal(next.listeners(next.window, 'error').length, 1);
  assert.equal(next.listeners(next.document, 'DOMContentLoaded').length, 1);
  next.root.innerHTML = '<main id="title-screen">Ready after reload</main>';
  next.emit(next.document, 'DOMContentLoaded');
  assertClean(first);
  assertClean(next);
});

test('unchanged app tag and actual offline-builder replacement retain equivalent recovery without another import', () => {
  const standalone = inlineFixture();
  for (const href of ['file:///downloads/hearth-and-oath.html', 'https://game.invalid/download.html']) {
    const failure = mountBoot(standalone, href);
    failure.emit(failure.window, 'error', { filename: href, message: 'bundled module initialization failed' });
    assert.equal(failure.failed(), true, 'same-document bundled runtime/parse failures are recognized');
    assertClean(failure);
    const success = mountBoot(standalone, href);
    const inlineModule = standalone.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
    new Script(inlineModule).runInNewContext({ document: { getElementById: () => success.root } });
    success.emit(success.document, 'DOMContentLoaded');
    assert.equal(success.root.querySelector('#boot-state'), null);
    assert.equal(success.failed(), false);
    assertClean(success);
  }
});

test('the actual standalone re-download path preserves the opening shell and guard, never live session markup', async () => {
  const standalone = inlineFixture();
  const boot = mountBoot(standalone, 'file:///downloads/hearth-and-oath.html');
  const app = readFileSync(new URL('../dist/js/app.js', import.meta.url), 'utf8');
  const capture = app.match(/^const bootMarkup = root\.innerHTML;$/m)?.[0];
  assert.ok(capture, 'the app captures its pre-render static shell');
  assert.ok(app.indexOf(capture) < app.indexOf('\nrender();'), 'capture must precede the initial render');
  const opening = new Script(`${capture}\nbootMarkup;`).runInNewContext({ root: boot.root });
  boot.root.innerHTML = '<main id="live-session">private synthetic session, never export this markup</main>';

  const scripts = [...standalone.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/g)].map(match => ({ src: match[1].match(/src="([^"]+)"/)?.[1] || '', type: match[1].match(/type="([^"]+)"/)?.[1] || '', outerHTML: match[0] }));
  const start = app.indexOf('async function downloadGame(){');
  const end = app.indexOf('\nfunction compactStory', start);
  assert.ok(start >= 0 && end > start);
  let artifact = null, clicks = 0, revocations = 0;
  const context = createContext({
    bootMarkup: opening, Blob, AbortController, createOfflineDownload, root: boot.root,
    updateOfflineDownload() {},
    location: { protocol: 'file:' },
    document: {
      head: { innerHTML: standalone.match(/<head>([\s\S]*?)<\/head>/)[1] },
      querySelectorAll: selector => { assert.equal(selector, 'body > script'); return scripts; },
      createElement: tag => { assert.equal(tag, 'a'); return { click() { clicks++; } }; },
    },
    URL: { createObjectURL(blob) { artifact = blob; return 'blob:test-only'; }, revokeObjectURL() { revocations++; } },
    toast() {},
    setTimeout(callback) { callback(); },
    loadOfflineGame() { throw new Error('Re-downloading a file must not fetch the hosted game'); },
  });
  const placeHelper = app.match(/^function location\(\) \{.*\}$/m)?.[0];
  assert.ok(placeHelper, 'retain the real local place-helper shadow in this regression');
  await new Script(`(async () => {\n${placeHelper}\n${app.slice(start, end)}\n${app.match(/^const offlineDownload = createOfflineDownload\(.*$/m)[0]}\nawait downloadGame();\n})();`).runInContext(context);
  assert.ok(artifact instanceof Blob, 'the real export path produced a standalone Blob');
  assert.equal(clicks, 1);
  assert.equal(revocations, 1);
  const exported = await artifact.text();
  assert.ok(exported.includes(opening));
  assert.doesNotMatch(exported, /private synthetic session|live-session/);
  assert.equal((exported.match(/id="boot-guard"/g) || []).length, 1);
  const next = mountBoot(exported, 'file:///downloads/hearth-and-oath-copy.html');
  assert.match(next.message(), /^Loading Hearth & Oath/);
  next.emit(next.window, 'error', { target: next.entry });
  assert.equal(next.failed(), true);
  next.emit(next.root.querySelector('#boot-retry'), 'click');
  assert.equal(next.stats().reloads, 1);
  assertClean(next);
  boot.assertSafe();
});

test('the HTML retains plain JavaScript-disabled guidance and save-safe reload instructions', () => {
  const guidance = [...html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)].find(match => match[1].includes('JavaScript is needed'))?.[1];
  assert.match(guidance, /JavaScript is needed/);
  assert.match(guidance, /then reload/);
  assert.match(guidance, /does not erase your saved lives/);
  const noScriptStyle=html.match(/<head>[\s\S]*?<noscript><style>([^]*?)<\/style><\/noscript>[\s\S]*?<\/head>/)?.[1];
  assert.match(noScriptStyle, /#boot-message \{ display: none; \}/, 'no permanent Loading label without JavaScript');
  assert.match(noScriptStyle, /\.boot-loading, \.boot-caption \{ display: none; \}/, 'no animated loading claim without JavaScript');
});
