#!/usr/bin/env node
// Make a real save with a past release's own engine, so the migration tests
// read what that release actually wrote rather than what we remember of it.
//
//   node scripts/fixtures/generate-release-saves.mjs <checkout> <version> <out.json>
//
// <checkout> is a checkout of the release (a git worktree at its merge
// commit); the script imports that checkout's dist/js/engine.js and writes
// three states: the birth, the life at eighteen, and the life a season on,
// each as the release's engine left it. The same seed every time, so a
// fixture can be regenerated and compared.
import { writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [checkout, version, out] = process.argv.slice(2);
if (!checkout || !version || !out) { console.error('usage: generate-release-saves.mjs <checkout> <version> <out.json>'); process.exit(2); }
const root = path.resolve(checkout);
const url = file => pathToFileURL(path.join(root, 'dist/js', file)).href;
const engine = await import(url('engine.js'));
let station = null;
try { await access(path.join(root, 'dist/js/station.js')); const { rollBirthCircumstances } = await import(url('station.js')); station = rollBirthCircumstances('release-save-' + version, 'common', 'human'); } catch { /* before stations */ }

const seed = 'release-save-' + version;
const config = { seed, name: 'Tamsin Reed', appearance: { ancestry: 'human' } };
if (station) config.station = station;
const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse', 'private'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
const settle = s => { for (let n = 0; n < 30 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; };
function grow(s, to) { for (let n = 0; n < 900 && s.age < to && s.phase !== 'retired'; n++) s = s.event ? engine.chooseEventOption(s, pick(s)) : engine.ageUp(s); return settle(s); }

let birth = engine.createBirthGame(config);
if (!birth) throw new Error('createBirthGame made nothing');
const eighteen = grow(structuredClone(birth), 18);
let later = eighteen;
if (later.phase !== 'retired') { later = engine.liveSeason ? engine.liveSeason(later) : engine.ageUp(later); later = settle(later); }
for (const [name, s] of Object.entries({ birth, eighteen, later })) if (!engine.validateSave(s)) throw new Error(`${name} does not validate under its own engine`);
const fixture = { source: { version, checkout: path.basename(root), seed, madeBy: 'scripts/fixtures/generate-release-saves.mjs', date: new Date().toISOString().slice(0, 10) }, states: { birth, eighteen, later } };
await mkdir(path.dirname(path.resolve(out)), { recursive: true });
await writeFile(path.resolve(out), JSON.stringify(fixture) + '\n');
console.log(`${version}: birth age ${birth.age}, eighteen age ${eighteen.age} (${eighteen.phase}), later day ${later.day}; station ${station ? 'rolled' : 'none'}; ${(JSON.stringify(fixture).length / 1024).toFixed(0)} KB → ${out}`);
