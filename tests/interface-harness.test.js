// The interface harness (scripts/interface-harness.py) measures the pages in
// headless Chromium. This test runs its quick mode (the title screen and the
// Life screen, one viewport) and checks the shape of the JSON report. It is
// skipped cleanly where Python Playwright is not importable, the way the art
// tests skip when reference-art/ is absent, and where Chromium cannot launch
// (the harness exits with code 3 for both).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const harness = new URL('../scripts/interface-harness.py', import.meta.url).pathname;
const python = process.env.PYTHON || 'python3';
const probe = spawnSync(python, ['-c', 'import playwright.sync_api'], { encoding: 'utf8' });
const needsPlaywright = probe.status === 0 ? false : 'Python Playwright is not importable';

test('the interface harness measures the title and Life screens and writes its report', { skip: needsPlaywright, timeout: 85_000 }, t => {
  const out = mkdtempSync(join(tmpdir(), 'interface-harness-'));
  try {
    const run = spawnSync(python, [harness, '--quick', '--out', out], { encoding: 'utf8', timeout: 80_000 });
    if (run.status === 3) { t.skip(run.stderr.trim()); return; }
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const path = join(out, 'report.json');
    assert.ok(existsSync(path), 'report.json is written');
    assert.ok(existsSync(join(out, 'report.md')), 'report.md is written');
    const report = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(report.quick, true);
    for (const key of ['harness', 'generatedAt', 'browser', 'url', 'viewports', 'scales', 'baselines', 'methods', 'measures', 'views', 'fight', 'reached', 'notes', 'errors', 'durationSeconds']) assert.ok(key in report, `report has ${key}`);
    for (const key of ['decision', 'costVisibility', 'fightHeight', 'phoneContent', 'subTabRows', 'smallestFont', 'requests', 'toast', 'viewHeights', 'firstControl']) {
      assert.ok(key in report.measures, `measures has ${key}`);
      assert.ok('method' in report.measures[key] && 'results' in report.measures[key], `${key} carries its method and results`);
    }
    const run0 = report.views['desktop/default'];
    assert.ok(run0, 'the desktop/default run is recorded');
    for (const view of ['title', 'life', 'life-right-now']) {
      assert.ok(run0[view], `${view} was measured`);
      for (const key of ['unrolledHeight', 'fits', 'firstControlTop', 'fonts', 'subTabRows', 'choices', 'readingScale']) assert.ok(key in run0[view], `${view} has ${key}`);
    }
    assert.equal(typeof run0.title.requests.total, 'number', 'requests to the title screen are counted');
    assert.ok(run0.title.requests.total > 0);
    const decision = report.measures.decision.results['desktop/default'];
    assert.ok(decision.asArrived && decision.rightNow, 'the decision distance is recorded in both states');
    assert.equal(report.reached['desktop/default/practice'] !== undefined, true, 'the tactics rehearsal is recorded as reached or not');
    assert.deepEqual(report.errors.filter(e => e.stage === 'life'), [], 'the Life screen was reached');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
