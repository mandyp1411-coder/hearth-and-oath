import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdir, mkdtemp, readFile, rm, symlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256, treeFiles} from '../scripts/lib/release-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('the cutover index is reproducible and every source reference resolves to the captured bytes', async t => {
  await mkdir(path.join(root, 'artifacts'), {recursive: true});
  const output = await mkdtemp(path.join(root, 'artifacts/one-rulebook-test-'));
  t.after(() => rm(output, {recursive: true, force: true}));
  const run = () => execFileSync(process.execPath, ['scripts/plan-one-rulebook.mjs', '--out', output], {cwd: root, encoding: 'utf8'});
  run(); const first = await readFile(path.join(output, 'inventory.json'), 'utf8');
  run(); assert.equal(await readFile(path.join(output, 'inventory.json'), 'utf8'), first);
  const report = JSON.parse(first), sources = new Map();
  assert.equal(report.releaseDecision, 'NOT EVALUATED');
  assert.deepEqual(report.files.map(row => row.file), (await treeFiles(root, 'dist/js')).filter(file => file.endsWith('.js')));
  for (const file of report.files) {
    const source = await readFile(path.join(root, file.file), 'utf8');
    assert.equal(sha256(source), file.sha256); assert.equal(Buffer.byteLength(source), file.bytes);
    sources.set(file.file, source.split('\n'));
  }
  for (const ref of report.references) assert.ok(sources.get(ref.file).slice(ref.line - 1).join('\n').slice(ref.column - 1).startsWith(ref.match), `${ref.file}:${ref.line}:${ref.column}`);
  for (const [file, category, code] of [
    ['dist/js/edition.js', 'debt', 'householdBudget?.debt'],
    ['dist/js/lineage.js', 'debt', 'householdBudget?.debt'],
    ['dist/js/engine.js', 'station', 'hero.station'],
    ['dist/js/app.js', 'saved-mode', 'fieldVersion'],
  ]) assert.ok(report.references.some(ref => ref.file === file && ref.category === category && ref.match === code), `${file}: known cutover boundary is indexed`);
});

test('the inventory refuses source-tree output rather than overwriting a runtime file', () => {
  const result = spawnSync(process.execPath, ['scripts/plan-one-rulebook.mjs', '--out', 'dist/js'], {cwd: root, encoding: 'utf8'});
  assert.notEqual(result.status, 0); assert.match(result.stderr, /beneath ignored artifacts/);
});

test('an ignored symlink cannot redirect inventory output into runtime source', async t => {
  await mkdir(path.join(root, 'artifacts'), {recursive: true});
  const output = await mkdtemp(path.join(root, 'artifacts/one-rulebook-test-'));
  t.after(() => rm(output, {recursive: true, force: true}));
  const link = path.join(output, 'redirect'); await symlink(path.join(root, 'dist/js'), link);
  const result = spawnSync(process.execPath, ['scripts/plan-one-rulebook.mjs', '--out', link], {cwd: root, encoding: 'utf8'});
  assert.notEqual(result.status, 0); assert.match(result.stderr, /ancestry cannot contain symlinks/);
});
