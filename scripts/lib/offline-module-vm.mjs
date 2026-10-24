// Exact downloaded-code evaluation for semantic VM verification.
// True module scope is the default; legacy probes are explicitly marked.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as vm from 'node:vm';
import { spawnSync } from 'node:child_process';

// Keep every existing checker command usable. The child evaluates the same
// checker with Node's required VM-module switch; failures/signals stay failures.
if (typeof vm.SourceTextModule !== 'function') {
  const child = spawnSync(process.execPath, [...process.execArgv, '--experimental-vm-modules', ...process.argv.slice(1)], { stdio: 'inherit', env: process.env });
  if (child.error) throw child.error;
  if (child.signal) process.kill(process.pid, child.signal);
  process.exit(child.status ?? 1);
}

const hash = text => createHash('sha256').update(text).digest('hex');
const appBoundary = /^await \(async \(\) => \{\n/gm;

function requireModuleVM() {
  assert.equal(typeof vm.SourceTextModule, 'function', 'Run this verifier with --experimental-vm-modules; do not fall back to classic await parsing');
}

/** Compile unchanged downloaded bytes in actual module scope for every session. */
export function compileExactOfflineModule(code, { filename = 'standalone.js' } = {}) {
  requireModuleVM();
  const sha256 = hash(code);
  code = Buffer.from(code, 'utf8').toString('utf8');
  assert.equal(hash(code), sha256, 'flattening source storage changes no code byte');
  return {
    sha256,
    async evaluate(context, { timeout = 30000, wallTimeout = 45000 } = {}) {
      const module = new vm.SourceTextModule(code, { context, identifier: filename });
      await module.link(specifier => { throw Error(`Unexpected external standalone import: ${specifier}`); });
      let timer;
      try {
        await Promise.race([
          module.evaluate({ timeout }),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Error(`Standalone startup did not finish within ${wallTimeout}ms`)), wallTimeout); }),
        ]);
        assert.equal(module.status, 'evaluated', 'the whole asynchronous standalone entry finished');
        assert.equal(hash(code), sha256, 'the evaluated module bytes remain unchanged');
      } finally { clearTimeout(timer); }
      return Object.freeze({ status: module.status });
    },
  };
}

/**
 * Legacy semantic-probe mode, explicitly not full module-scope evidence.
 * Old checkers inspect __engine and other graph lexicals with vm.Script. Their
 * original assertions can remain intact if the immutable graph prefix stays in
 * that classic scope while the exact asynchronous app tail is a real module.
 * No source bytes are added, removed, replaced, or debug-exported.
 */
export function compileLegacyOfflineProbe(code, { filename = 'standalone-legacy-probe.js', shareInertMedia = false } = {}) {
  requireModuleVM();
  const boundaries = [...code.matchAll(appBoundary)];
  assert.equal(boundaries.length, 1, 'the current builder has exactly one asynchronous app entry boundary');
  const index = boundaries[0].index;
  const prefix = code.slice(0, index), tail = code.slice(index), sha256 = hash(code);
  assert.equal(prefix + tail, code, 'the two unchanged source slices cover every byte exactly once');
  const graph = new vm.Script(prefix, { filename: filename + ':graph' });
  const entry = compileExactOfflineModule(tail, { filename: filename + ':entry' });
  return {
    sha256,
    async evaluate(context, options = {}) {
      let nativeParse = shareInertMedia ? shareExactInertMedia(context) : null;
      graph.runInContext(context, { timeout: options.timeout ?? 30000 });
      if (nativeParse) {
        assert.equal(new vm.Script('JSON.parse').runInContext(context), nativeParse, 'the exact media parse immediately restores the native realm parser before app startup');
        nativeParse = null;
      }
      await entry.evaluate(context, options);
      assert.equal(hash(prefix + tail), sha256, 'all original downloaded code bytes were evaluated unchanged');
    },
  };
}

// Proposed legacy-only semantic-platform adapter. Never used by true-module mode.
let sharedOfflineMedia = null;
function shareExactInertMedia(context) {
  const text = context.document?.getElementById('offline-media')?.textContent;
  assert.equal(typeof text, 'string', 'the exact downloaded inert media element exists');
  const sha256 = hash(text), bytes = Buffer.byteLength(text, 'utf8');
  if (!sharedOfflineMedia) {
    const table = JSON.parse(text);
    assert.ok(table && !Array.isArray(table) && typeof table === 'object');
    const entries = Object.entries(table);
    assert.ok(entries.length > 0);
    for (const [key, value] of entries) {
      assert.match(key, /^media-\d+$/);
      assert.equal(typeof value, 'string');
      assert.match(value, /^data:/);
    }
    // All leaves are primitive strings; freezing this flat table deeply freezes
    // the complete asset lookup. No game state or executable module is shared.
    Object.freeze(table);
    sharedOfflineMedia = Object.freeze({ text, sha256, bytes, table });
  }
  assert.equal(bytes, sharedOfflineMedia.bytes, 'all disposable sessions use the exact same inert bytes');
  assert.equal(sha256, sharedOfflineMedia.sha256, 'the raw inert element hash matches the first native parse');
  assert.equal(text, sharedOfflineMedia.text);
  const install = vm.compileFunction(`
    const nativeParse = JSON.parse, nativeStringify = JSON.stringify;
    JSON.parse = function parse(text, reviver) {
      if (arguments.length === 1 && typeof text === 'string' && text === exactText) {
        JSON.parse = nativeParse;
        return sharedTable;
      }
      return Reflect.apply(nativeParse, this, arguments);
    };
    return { nativeParse, nativeStringify, actualStringify: JSON.stringify };
  `, ['exactText', 'sharedTable'], { parsingContext: context, filename: 'legacy-immutable-inert-media-platform.js' });
  const installed = install(sharedOfflineMedia.text, sharedOfflineMedia.table);
  assert.equal(installed.actualStringify, installed.nativeStringify, 'native JSON.stringify is untouched');
  return installed.nativeParse;
}

/** Deterministic timer platform; test code explicitly advances deadlines. */
export function controlledTimers() {
  let time = 0, sequence = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(callback, delay = 0) {
      assert.equal(typeof callback, 'function');
      const id = ++sequence;
      pending.set(id, { callback, delay: Number(delay), due: time + Number(delay) });
      return id;
    },
    clearTimeout(id) { pending.delete(id); },
    advance(milliseconds) {
      const until = time + milliseconds;
      let count = 0;
      while (true) {
        const next = [...pending.entries()].filter(([, item]) => item.due <= until).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
        if (!next) break;
        assert.ok(++count < 1000, 'timer continuations are bounded');
        const [id, item] = next;
        pending.delete(id); time = item.due; item.callback();
      }
      time = until;
    },
  };
}

export function compileOfflineModule(code, options = {}) {
  console.log(JSON.stringify({ vmMode: options.legacyProbes ? 'legacy graph probes with exact async-module entry' : 'complete unchanged SourceTextModule', filename: options.filename ?? 'standalone.js', inertMedia: options.shareInertMedia ? 'exact immutable asset table shared; native parser restored before app startup' : 'native per-realm JSON parse', codeSha256: hash(code) }));
  return options.legacyProbes ? compileLegacyOfflineProbe(code, options) : compileExactOfflineModule(code, options);
}
