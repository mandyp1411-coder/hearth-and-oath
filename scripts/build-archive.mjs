#!/usr/bin/env node
// Build the Old Rules archive: the v0.69 game, kept at its own address with
// its own storage, for lives written under the old rules.
//
//   node scripts/build-archive.mjs [--source <checkout>] [--ref v0.69-archive] [--out out-legacy]
//
// The archive's source is the `v0.69-archive` branch (the v0.69.0 release
// plus the storage renamed to `hearth-and-oath-legacy`, the rules label on
// every slot, and the import that turns a new-rules life away). This script
// checks that branch out into a temporary worktree (or uses --source), runs
// its own offline build and hosting package, and leaves:
//
//   out-legacy/                      the hosting directory to publish at the archive's address
//   out-legacy/hearth-and-oath-old-rules.html   the self-contained offline file (the hosted
//                                    directory keeps its loader and parts as every build does)
//
// The main game names the archive's address in dist/js/archive-link.js once
// it is published. Nothing here touches the main game's build.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), option = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
const ref = option('--ref') || 'v0.69-archive';
const outDir = path.resolve(project, option('--out') || 'out-legacy');
let source = option('--source') ? path.resolve(option('--source')) : null, temporary = null;
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const node = (cwd, script) => execFileSync(process.execPath, [script], { cwd, stdio: 'inherit' });

try {
  if (!source) {
    temporary = await import('node:fs/promises').then(fs => fs.mkdtemp(path.join(os.tmpdir(), 'hearth-archive-')));
    source = path.join(temporary, 'src');
    git(project, 'worktree', 'add', '--detach', source, ref);
  }
  const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
  const head = git(source, 'rev-parse', '--short', 'HEAD');
  const storage = await readFile(path.join(source, 'dist/js/save-storage.js'), 'utf8');
  if (!storage.includes("const DB_NAME = 'hearth-and-oath-legacy';")) throw Error(`${source} is not the archive: its storage is not hearth-and-oath-legacy.`);
  console.log(`Archive source: ${ref} at ${head}, version ${pkg.version}`);
  node(source, 'scripts/build-offline.mjs');
  node(source, 'scripts/package-hosting-v57.mjs');
  await rm(outDir, { recursive: true, force: true });
  await cp(path.join(source, 'out'), outDir, { recursive: true });
  await cp(path.join(source, 'artifacts/hearth-and-oath.html'), path.join(outDir, 'hearth-and-oath-old-rules.html'));
  const offline = await stat(path.join(outDir, 'hearth-and-oath-old-rules.html'));
  await writeFile(path.join(outDir, 'ARCHIVE.json'), JSON.stringify({ edition: 'old-rules-archive', version: pkg.version, source: { ref, commit: head }, storage: { indexedDB: 'hearth-and-oath-legacy', keyPrefix: 'hearth-and-oath-legacy:' }, offlineFile: 'hearth-and-oath-old-rules.html', built: new Date().toISOString() }, null, 2) + '\n');
  console.log(`Archive packaged: ${path.relative(project, outDir)}/ (offline file ${(offline.size / 1048576).toFixed(0)} MB)`);
} finally {
  if (temporary) { try { git(project, 'worktree', 'remove', '--force', path.join(temporary, 'src')); } catch { /* already gone */ } await rm(temporary, { recursive: true, force: true }); }
}
