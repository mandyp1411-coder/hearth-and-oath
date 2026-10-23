// Validate the content tree: every content/**/*.json against its kind, the
// references between files, the voice of every text field, and the
// placeholders. Reports to artifacts/content-validation/ (gitignored) as JSON
// and Markdown, and to a snapshot path when asked.
//
//   node scripts/content/validate.mjs [--content content] [--out artifacts/content-validation]
//                                     [--snapshot docs/measures/content-validation-v070.md] [--strict] [--quiet]
//
// Exit 0 always in v0.70 (the validator reports); --strict exits 1 on errors.
import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFile, crossCheck, KINDS, SCHEMA_VERSION } from './schema.mjs';

export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN_ASSET_DIRS = ['content/expansion-v27']; // files here carry no kind: design assets the engine does not read
export const DIALOGUE_TARGET = Object.freeze([15, 20]); // the Bible: lines per role

export function walk(dir) {
  const out = [];
  const visit = d => { for (const name of readdirSync(d).sort()) { const p = path.join(d, name); if (statSync(p).isDirectory()) visit(p); else if (name.endsWith('.json')) out.push(p); } };
  if (statSync(dir).isDirectory()) visit(dir);
  return out;
}

/** Validate every JSON file under `contentDir`; paths in the result are relative to `root`. */
export function validateTree(contentDir, root = project) {
  const files = walk(contentDir), results = [];
  for (const abs of files) {
    const file = path.relative(root, abs).split(path.sep).join('/');
    const designAsset = DESIGN_ASSET_DIRS.some(d => file.startsWith(d + '/'));
    let doc;
    try { doc = JSON.parse(readFileSync(abs, 'utf8')); }
    catch (e) { results.push({ file, kind: null, ids: [], items: 0, errors: [{ file, path: '', code: 'file.parse', message: `does not parse: ${e.message}` }], warnings: [], voice: [], refs: [], texts: 0, dialogueRoles: {} }); continue; }
    results.push(validateFile(doc, { file, designAsset }));
  }
  const cross = crossCheck(results);
  return summarize(results, cross, contentDir, root);
}

function summarize(results, cross, contentDir, root) {
  const errors = [...results.flatMap(r => r.errors), ...cross], warnings = results.flatMap(r => r.warnings), voice = results.flatMap(r => r.voice);
  const byKind = {};
  for (const k of KINDS) byKind[k] = { files: 0, items: 0 };
  for (const r of results) if (r.kind) { byKind[r.kind].files++; byKind[r.kind].items += r.items; }
  const dialogue = {};
  for (const r of results) for (const [role, n] of Object.entries(r.dialogueRoles || {})) dialogue[role] = (dialogue[role] || 0) + n;
  return {
    schemaVersion: SCHEMA_VERSION, content: path.relative(root, contentDir).split(path.sep).join('/') || '.',
    files: results.length, items: results.reduce((n, r) => n + r.items, 0), texts: results.reduce((n, r) => n + r.texts, 0),
    errors: errors.length, warnings: warnings.length, voiceHits: voice.length,
    byKind, dialogue: { target: DIALOGUE_TARGET, linesByRole: dialogue },
    perFile: results.map(r => ({ file: r.file, kind: r.kind, items: r.items, texts: r.texts, errors: r.errors.length, warnings: r.warnings.length, voice: r.voice.length })),
    errorRows: errors, warningRows: warnings, voiceRows: voice,
  };
}

export function toMarkdown(report, { title = 'Content validation', when = new Date().toISOString().slice(0, 10) } = {}) {
  const lines = [`# ${title}`, '', `Schema ${report.schemaVersion}; tree \`${report.content}\`; ${when}.`, '',
    `| Files | Items | Text fields | Errors | Warnings | Voice hits |`, `| --- | --- | --- | --- | --- | --- |`,
    `| ${report.files} | ${report.items} | ${report.texts} | ${report.errors} | ${report.warnings} | ${report.voiceHits} |`, '',
    '## By kind', '', '| Kind | Files | Items |', '| --- | --- | --- |',
    ...Object.entries(report.byKind).map(([k, v]) => `| ${k} | ${v.files} | ${v.items} |`), '',
    '## By file', '', '| File | Kind | Items | Text fields | Errors | Warnings | Voice hits |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...report.perFile.map(r => `| ${r.file} | ${r.kind || '—'} | ${r.items} | ${r.texts} | ${r.errors} | ${r.warnings} | ${r.voice} |`), ''];
  const roles = Object.entries(report.dialogue.linesByRole);
  lines.push('## Dialogue lines per role', '', `The Bible asks for ${report.dialogue.target[0]} to ${report.dialogue.target[1]} lines a role.`, '');
  if (!roles.length) lines.push('No dialogue in the tree.', '');
  else { lines.push('| Role | Lines | Against the target |', '| --- | --- | --- |'); for (const [role, n] of roles) lines.push(`| ${role} | ${n} | ${n < report.dialogue.target[0] ? `${report.dialogue.target[0] - n} short` : n > report.dialogue.target[1] ? `${n - report.dialogue.target[1]} over` : 'within'} |`); lines.push(''); }
  const rows = (name, list) => { lines.push(`## ${name}`, ''); if (!list.length) { lines.push('None.', ''); return; } lines.push('| File | Path | Code | Message |', '| --- | --- | --- | --- |'); for (const e of list) lines.push(`| ${e.file} | ${e.path} | ${e.code} | ${String(e.message).replace(/\|/g, '\\|')} |`); lines.push(''); };
  rows('Errors', report.errorRows);
  rows('Warnings', report.warningRows);
  lines.push('## Voice hits', '');
  if (!report.voiceRows.length) lines.push('None.', '');
  else { lines.push('| File | Path | Phrase |', '| --- | --- | --- |'); for (const v of report.voiceRows) lines.push(`| ${v.file} | ${v.path} | ${v.phrase} |`); lines.push(''); }
  return lines.join('\n');
}

function args(argv) {
  const o = { content: 'content', out: 'artifacts/content-validation', snapshot: null, strict: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') o.strict = true; else if (a === '--quiet') o.quiet = true;
    else if (['--content', '--out', '--snapshot'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`Unknown argument ${a}`);
  }
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = args(process.argv.slice(2));
  const contentDir = path.resolve(project, o.content), outDir = path.resolve(project, o.out);
  const report = validateTree(contentDir);
  const md = toMarkdown(report);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(path.join(outDir, 'report.md'), md);
  if (o.snapshot) { const snap = path.resolve(project, o.snapshot); mkdirSync(path.dirname(snap), { recursive: true }); writeFileSync(snap, toMarkdown(report, { title: 'Content validation — v0.70 snapshot' })); }
  if (!o.quiet) {
    console.log(`${report.files} files, ${report.items} items, ${report.texts} text fields: ${report.errors} errors, ${report.warnings} warnings, ${report.voiceHits} voice hits.`);
    for (const e of report.errorRows) console.log(`  error  ${e.file} ${e.path}: ${e.message}`);
    for (const w of report.warningRows) console.log(`  warn   ${w.file} ${w.path}: ${w.message}`);
    console.log(`Report: ${path.relative(project, path.join(outDir, 'report.md'))}${o.snapshot ? ` and ${o.snapshot}` : ''}`);
  }
  process.exit(o.strict && report.errors ? 1 : 0);
}
