#!/usr/bin/env node
// Build only the pinned archive plus its exact import-compatibility overlay.
// --source supplies Git objects; it is never edited or used as a build tree.
//   node scripts/build-archive.mjs [--source <checkout>] [--ref <pinned ref>] [--out out-legacy]
// Hosting gets a small same-origin HTML loader. The full standalone stays in artifacts/.
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, rm, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ARCHIVE_BASELINE = '065d54cd91c8cfea390ba0f71fb046351153d6fa';
const HOST_LIMIT = 256 * 1024 * 1024;
const OVERLAY = path.join(project, 'scripts/archive-compatibility.patch');
const OFFLINE_NAME = 'hearth-and-oath-old-rules.html';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const node = (cwd, script) => execFileSync(process.execPath, [script], { cwd, stdio: 'inherit' });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fileHash(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function treeSize(directory) {
  let bytes = 0, files = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Archive hosting assets may not be symbolic links.');
    if (entry.isDirectory()) { const child = await treeSize(name); bytes += child.bytes; files += child.files; }
    else if (entry.isFile()) { bytes += (await stat(name)).size; files++; }
    else throw Error(`Unsupported archive hosting entry: ${name}`);
  }
  return { bytes, files };
}

export async function buildArchive({ source: suppliedSource = project, ref = ARCHIVE_BASELINE, out = 'out-legacy' } = {}) {
  const repository = path.resolve(suppliedSource), outDir = path.resolve(project, out);
  const commit = git(repository, 'rev-parse', '--verify', `${ref}^{commit}`);
  if (commit !== ARCHIVE_BASELINE) throw Error(`The archive baseline must be ${ARCHIVE_BASELINE}; ${ref} resolves to ${commit}.`);
  if (outDir === project || outDir === repository || project.startsWith(outDir + path.sep) || repository.startsWith(outDir + path.sep)) throw Error('The archive output must not replace a source checkout or its parent.');
  const overlaySha256 = digest(await readFile(OVERLAY));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'hearth-archive-'));
  const source = path.join(temporary, 'src');
  let attached = false;
  try {
    git(repository, 'worktree', 'add', '--detach', source, commit); attached = true;
    if (git(source, 'rev-parse', 'HEAD') !== ARCHIVE_BASELINE) throw Error('The archive worktree does not match its pinned baseline.');
    git(source, 'apply', '--check', OVERLAY);
    git(source, 'apply', OVERLAY);
    if (git(source, 'diff', '--name-only') !== 'dist/js/app.js\ndist/js/edition.js') throw Error('The archive overlay changed files outside import admission and edition validation.');
    const pkg = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
    const storageText = await readFile(path.join(source, 'dist/js/save-storage.js'), 'utf8');
    const indexedDB = storageText.match(/^const DB_NAME = '([^']+)';$/m)?.[1];
    const keyPrefix = storageText.match(/^const OWNED_PREFIX = '([^']+)';$/m)?.[1];
    if (pkg.version !== '0.69.0' || indexedDB !== 'hearth-and-oath-legacy' || keyPrefix !== 'hearth-and-oath-legacy:') throw Error('The pinned source is not the isolated v0.69 Old Rules archive.');
    console.log(`Archive source: ${commit}, version ${pkg.version}; overlay ${overlaySha256}`);
    node(source, 'scripts/build-offline.mjs');
    node(source, 'scripts/package-hosting-v57.mjs');
    const recipe = JSON.parse(await readFile(path.join(source, 'dist/offline/recipe.json'), 'utf8'));
    const offlineSource = path.join(source, 'artifacts/hearth-and-oath.html');
    const offlineBytes = (await stat(offlineSource)).size, artifactSha256 = await fileHash(offlineSource);
    if (recipe.schemaVersion !== 3 || recipe.version !== pkg.version || recipe.bytes !== offlineBytes || recipe.sha256 !== artifactSha256) throw Error('The standalone archive does not match its offline recipe.');
    const loaderSource = path.join(source, 'out/hearth-and-oath.html');
    const loaderBytes = (await stat(loaderSource)).size, loaderSha256 = await fileHash(loaderSource);
    if (loaderBytes > 64 * 1024 || loaderSha256 !== recipe.loaderSha256) throw Error('The hosted alias must be the small, verified same-origin loader.');
    const artifactDir = path.join(project, 'artifacts/old-rules-archive');
    const artifactPath = path.join(artifactDir, OFFLINE_NAME);
    await mkdir(artifactDir, { recursive: true });
    await cp(offlineSource, artifactPath);
    await rm(outDir, { recursive: true, force: true });
    await cp(path.join(source, 'out'), outDir, { recursive: true });
    await cp(loaderSource, path.join(outDir, OFFLINE_NAME));
    const manifest = {
      edition: 'old-rules-archive', version: pkg.version,
      source: { ref, commit, overlay: { file: path.relative(project, OVERLAY).split(path.sep).join('/'), sha256: overlaySha256 }, runtime: recipe.source },
      storage: { indexedDB, keyPrefix },
      offlineFile: OFFLINE_NAME, offlineFileKind: 'same-origin-loader',
      loader: { bytes: loaderBytes, sha256: loaderSha256 },
      artifact: { file: OFFLINE_NAME, path: path.relative(project, artifactPath).split(path.sep).join('/'), bytes: offlineBytes, sha256: artifactSha256, includedInHosting: false },
      hosting: { bytes: 0, files: 0, limitBytes: HOST_LIMIT }, built: new Date().toISOString(),
    };
    const beforeManifest = await treeSize(outDir);
    manifest.hosting.files = beforeManifest.files + 1;
    let text;
    for (let i = 0; i < 6; i++) {
      text = JSON.stringify(manifest, null, 2) + '\n';
      const bytes = beforeManifest.bytes + Buffer.byteLength(text);
      if (bytes === manifest.hosting.bytes) break;
      manifest.hosting.bytes = bytes;
    }
    text = JSON.stringify(manifest, null, 2) + '\n';
    if (beforeManifest.bytes + Buffer.byteLength(text) !== manifest.hosting.bytes) throw Error('The archive manifest size did not settle.');
    if (manifest.hosting.bytes > HOST_LIMIT) throw Error(`Archive hosting exceeds the 256MiB limit: ${manifest.hosting.bytes} bytes.`);
    await writeFile(path.join(outDir, 'ARCHIVE.json'), text);
    const final = await treeSize(outDir);
    if (final.bytes > HOST_LIMIT || final.bytes !== manifest.hosting.bytes || final.files !== manifest.hosting.files) throw Error('The final hosting directory changed during packaging.');
    if (await fileHash(artifactPath) !== artifactSha256) throw Error('The retained standalone archive changed during packaging.');
    console.log(`Archive packaged: ${path.relative(project, outDir)}/ (${final.bytes} hosted bytes); standalone: ${path.relative(project, artifactPath)} (${offlineBytes} bytes)`);
    return { directory: outDir, standalone: artifactPath, manifest };
  } finally {
    if (attached) { try { git(repository, 'worktree', 'remove', '--force', source); } catch { /* the directory is still removed below */ } }
    await rm(temporary, { recursive: true, force: true });
  }
}

function options(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    if (!['--source', '--ref', '--out'].includes(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) throw Error(`Expected --source <checkout>, --ref <pinned ref>, or --out <directory>; got ${key}.`);
    result[key.slice(2)] = argv[i + 1];
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await buildArchive(options(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
