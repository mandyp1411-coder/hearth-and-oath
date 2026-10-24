#!/usr/bin/env node
// Discovery for the v0.72 cutover. Textual references are review candidates,
// not proof that a branch is obsolete or permission to delete it.
import {readFile, mkdir, writeFile, lstat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {treeFiles, sha256, gitIdentity} from './lib/release-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) {
  throw Error('Usage: node scripts/plan-one-rulebook.mjs [--out artifacts/one-rulebook-v072]');
}
const output = path.resolve(root, args[1] || 'artifacts/one-rulebook-v072');
if (!output.startsWith(path.join(root, 'artifacts') + path.sep)) {
  throw Error('The inventory must be written beneath ignored artifacts/.');
}
// An ignored path must not reach source through an existing symlink.
let ancestor = root;
for (const part of path.relative(root, output).split(path.sep)) {
  ancestor = path.join(ancestor, part);
  try {if ((await lstat(ancestor)).isSymbolicLink()) throw Error('Inventory output ancestry cannot contain symlinks.');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
}
for (const name of ['inventory.json', 'inventory.md']) {
  try {if ((await lstat(path.join(output, name))).isSymbolicLink()) throw Error('Inventory output files cannot be symlinks.');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
}
execFileSync('git', ['check-ignore', '--quiet', '--', path.relative(root, output) + '/inventory.json'], {cwd: root});

const rules = [
  {id: 'station', pattern: /\bhero\s*(?:\?\.|\.)\s*station\b/g},
  {id: 'debt', pattern: /\bhouseholdBudget\s*(?:\?\.|\.)\s*debt\b/g},
  {id: 'edition-policy', pattern: /\b(?:oldRules|rulesOf|stampEdition|validateEdition|archiveAccepts)\b/g},
  // These saved-mode flags also occur on NEW-rule lives. Inventory them;
  // never treat their absence as an old-rule classification.
  {id: 'saved-mode', pattern: /\b(?:mazeBook|delves|battlecraft|fieldVersion)\b/g},
];
const before = gitIdentity(root), files = [], references = [], imports = [];
for (const file of (await treeFiles(root, 'dist/js')).filter(file => file.endsWith('.js'))) {
  const source = await readFile(path.join(root, file), 'utf8');
  files.push({file, sha256: sha256(source), bytes: Buffer.byteLength(source)});
  for (const rule of rules) {
    for (const match of source.matchAll(rule.pattern)) {
      const start = source.lastIndexOf('\n', match.index) + 1;
      const end = source.indexOf('\n', match.index + match[0].length);
      references.push({file, line: source.slice(0, start).split('\n').length, column: match.index - start + 1,
        category: rule.id, match: match[0],
        context: source.slice(Math.max(start, match.index - 100), Math.min(end < 0 ? source.length : end, match.index + match[0].length + 100)).trim()});
    }
  }
  // Same static named-import form used by the offline builder. This lists
  // direct callers; it does not infer reachability or unused exports.
  for (const match of source.matchAll(/^import\s+\{[^}]+\}\s+from\s+'(\.\/[^']+\.js)';\s*$/gm)) {
    imports.push({from: file, to: path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]))});
  }
}
references.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.category.localeCompare(b.category));
imports.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
const relevant = new Set(references.map(row => row.file));
const report = {
  schemaVersion: 1, target: '0.72', currentVersion: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version,
  git: before, sourceSha256: sha256(JSON.stringify(files)), files,
  scope: 'Textual review candidates in every dist/js JavaScript file, including comments and strings. Not a JavaScript parser or a complete control-flow/deletion analysis.',
  releaseDecision: 'NOT EVALUATED',
  gateNote: 'This command does not perform the archive browser round trip or farmer/heir human playtest. Review their current evidence before any cutover.',
  categories: rules.map(rule => ({id: rule.id, references: references.filter(row => row.category === rule.id).length,
    files: new Set(references.filter(row => row.category === rule.id).map(row => row.file)).size})),
  references, directImports: imports.filter(row => relevant.has(row.from) || relevant.has(row.to)),
  warnings: [
    'A station OR a defined debt ledger means new rules. A stamp alone does not decide.',
    'Do not make migrateSave reject old lives while it is also the save-store decoder: mixed occupied slots and backups could disappear from the view.',
    'An absent subsystem, an old revision, a maze or an older pending battle can belong to a new-rule save. Preserve the actual unfinished commitment.',
    'Retain raw export/recovery, Ironman authority, save concurrency and genuine historical fixtures before removing simulation branches.',
  ],
};
// Refuse to publish a mixed-source index if a concurrent editor changed inputs.
for (const file of files) if (sha256(await readFile(path.join(root, file.file), 'utf8')) !== file.sha256) throw Error('Runtime changed while inventorying it. Run again from a stable checkout.');
if (JSON.stringify((await treeFiles(root, 'dist/js')).filter(file => file.endsWith('.js'))) !== JSON.stringify(files.map(file => file.file))) throw Error('JavaScript file inventory changed while reading it.');
if (JSON.stringify(gitIdentity(root)) !== JSON.stringify(before)) throw Error('Git identity changed while inventorying it.');
const lines = ['# One Rulebook: source inventory', '',
  `Current game: v${report.currentVersion}. Target: v0.72. Source: \`${report.sourceSha256}\`.`, '',
  report.scope, '', '**This inventory grants no deletion or release approval.**', '',
  '| Reference family | Occurrences | Files |', '| --- | ---: | ---: |',
  ...report.categories.map(row => `| ${row.id} | ${row.references} | ${row.files} |`), '',
  ...report.warnings.map(text => `- ${text}`), '',
  'The JSON includes every matched source line and the direct static imports around those files.',
  'See `docs/one-rulebook-v072.md` for the ordered cutover and remaining gates.', ''];
await mkdir(output, {recursive: true});
await writeFile(path.join(output, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(path.join(output, 'inventory.md'), lines.join('\n'));
console.log(`${files.length} JavaScript files; ${references.length} textual references.\n${path.relative(root, output)}/inventory.json\nCutover gates are not evaluated by this command.`);
