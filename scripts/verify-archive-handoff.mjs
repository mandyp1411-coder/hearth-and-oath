#!/usr/bin/env node
// Source-engine handoffs, not a browser, offline or human playtest.
// node scripts/verify-archive-handoff.mjs --archive /retained/patched/source
//   [--out artifacts/archive-handoff/report.json]
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as mainEngine from '../dist/js/engine.js';
import * as mainEdition from '../dist/js/edition.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { runtimeIdentity, verificationIdentity, gitIdentity, hashFile, sha256 } from './lib/release-identity.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), options = {};
for (let i = 0; i < args.length; i++) {
  const flag = args[i];
  if (!['--archive', '--out'].includes(flag) || options[flag] || !args[i + 1] || args[i + 1].startsWith('--')) throw Error('Usage: --archive /patched/source [--out artifacts/archive-handoff/report.json]');
  options[flag] = args[++i];
}
if (!options['--archive']) throw Error('--archive must name the retained patched archive source checkout.');
const archiveRoot = path.resolve(options['--archive']);
assert.notEqual(archiveRoot, root, 'the archive must be a separate source checkout');
let output = options['--out'] ? path.resolve(root, options['--out']) : null;
if (output && !output.endsWith('.json')) output = path.join(output, 'report.json');
if (output) {
  assert.ok(output.startsWith(path.join(root, 'artifacts') + path.sep), '--out must be beneath the ignored artifacts/ directory');
  execFileSync('git', ['check-ignore', '--quiet', '--', path.relative(root, output)], { cwd: root });
}

const clone = value => structuredClone(value);
const exportPayload = value => JSON.parse(JSON.stringify(value, null, 2));
const fingerprint = value => sha256(JSON.stringify(value));
const report = {
  schemaVersion: 1, startedAt: new Date().toISOString(), status: 'NOT RUN',
  command: ['node', 'scripts/verify-archive-handoff.mjs', ...args], node: process.version,
  scope: 'Actual main and patched archive source engines; complete JSON payloads and public commands.',
  cases: [], limits: [
    'No browser, file chooser, IndexedDB, fallback storage or offline bundle is executed here.',
    'The archive import admission predicate is checked; its visible refusal and preservation of browser slots require the browser handoff check.',
    'Each legacy state advances through a bounded public action or season; these are mechanical fixture continuations, not full lives or human participants.',
    'No fixture is regenerated, and no age, money, skill, person, battle result or story history is granted to advance a fixture.',
  ],
};
let archiveEngine, archiveEdition, archiveCombat;
async function snapshot() {
  return {
    main: { runtime: await runtimeIdentity(root), verification: await verificationIdentity(root), git: gitIdentity(root) },
    archive: { runtime: await runtimeIdentity(archiveRoot), verification: await verificationIdentity(archiveRoot), git: gitIdentity(archiveRoot) },
  };
}
async function check(name, run) {
  const row = { name, status: 'NOT RUN', trace: [] }, began = performance.now();
  report.cases.push(row);
  try { Object.assign(row, await run(row)); row.status = 'PASS'; }
  catch (error) { row.status = 'FAIL'; row.error = error.stack || String(error); }
  row.elapsedMs = Math.round(performance.now() - began);
  console.log(`${row.status}: ${name}${row.error ? ` — ${row.error.split('\n')[0]}` : ''}`);
}
function migrate(engine, input, label) {
  const before = clone(input), next = engine.migrateSave(input);
  assert.deepEqual(input, before, `${label}: importing preserves its complete incoming file`);
  assert.ok(next && engine.validateSave(next), `${label}: the complete incoming payload imports`);
  return next;
}
function remainOld(state, label) {
  assert.equal(mainEdition.rulesOf(state), mainEdition.OLD, `${label}: actual markers still describe old rules`);
  assert.equal(archiveEdition.rulesOf(state), archiveEdition.OLD);
  assert.ok(!state.hero.station, `${label}: no station is invented`);
  assert.equal(state.householdBudget?.debt, undefined, `${label}: no debt ledger is invented`);
  assert.equal(state.farm, undefined, `${label}: no family field is invented`);
}
function eventChoice(state) {
  const safe = state.event.choices.filter(choice => !choice.disabledReason);
  const preferred = { hard_winter: 'endure', debt_reckoning: 'plead', health_concern: state.age < 3 ? 'continue' : 'rest', life_family_start: 'wait' }[state.event.id];
  const choice = safe.find(c => c.id === preferred) || safe.find(c => ['continue', 'defer', 'later', 'wait', 'refuse', 'private', 'rest', 'present', 'contest', 'plead', 'endure', 'care'].includes(c.id)) || safe[0];
  assert.ok(choice, `${state.event.id} offers a lawful continuation`);
  return choice.id;
}
function publicStep(state, row) {
  const before = clone(state), hash = fingerprint(before);
  let command, next;
  if (state.battle) {
    if (state.battle.outcome) { command = 'resolveBattle'; next = archiveEngine.resolveBattle(state, state.battle); }
    else {
      const offers = archiveCombat.getBattleActions(state.battle).filter(a => !a.disabledReason);
      const offer = offers.find(a => a.id === 'retreat');
      assert.ok(offer, 'the genuine pending battle offers an actual retreat');
      command = 'chooseBattleAction:retreat'; next = archiveEngine.chooseBattleAction(state, offer.id);
    }
  } else if (state.event) {
    const pick = eventChoice(state); command = `chooseEventOption:${state.event.id}:${pick}`;
    next = archiveEngine.chooseEventOption(state, pick);
  } else if (state.timeline?.journey) { command = 'continueJourney'; next = archiveEngine.continueJourney(state); }
  else {
    const offers = archiveEngine.getActions(state).filter(a => !a.disabledReason);
    // Continue actual captured work before starting an unrelated rest.
    const commitment = offers.find(a => /^(?:workshop_continue|career_batch_continue|.*_continue|.*_resume)$/.test(a.id) && !/^(?:journal_|stories_|quest_)/.test(a.id));
    const ordinary = ['life_rest', 'health_rest'].map(id => offers.find(a => a.id === id)).find(Boolean);
    if (commitment) { command = `chooseAction:${commitment.id}`; next = archiveEngine.chooseAction(state, commitment.id); }
    else if (state.timeline?.yearTarget !== null && state.timeline?.yearTarget !== undefined) { command = 'continueAgeUp'; next = archiveEngine.continueAgeUp(state); }
    else if (ordinary) { command = `chooseAction:${ordinary.id}`; next = archiveEngine.chooseAction(state, ordinary.id); }
    else { command = 'liveSeason'; next = archiveEngine.liveSeason(state); }
  }
  assert.deepEqual(state, before, `${command}: the public command preserves its entire input`);
  assert.ok(next && archiveEngine.validateSave(next), `${command}: the archive state remains valid`);
  remainOld(next, command);
  row.trace.push({ command, dayBefore: before.day, dayAfter: next.day, ageAfter: next.age, eventAfter: next.event?.id || null, beforeSha256: hash, afterSha256: fingerprint(next) });
  return next;
}
function advance(state, row) {
  const startDay = state.day;
  let unchanged = 0;
  for (let guard = 0; guard < 80; guard++) {
    const prior = fingerprint(state), next = publicStep(state, row);
    unchanged = fingerprint(next) === prior ? unchanged + 1 : 0;
    assert.ok(unchanged < 3, 'a fixture cannot loop on a refused continuation');
    state = next;
    // Retiring is not substituted for actually advancing the world clock.
    if (state.day > startDay) return state;
    assert.notEqual(state.phase, 'retired', 'the bounded continuation must advance a living fixture');
  }
  throw Error('The archive fixture reached the 80-command guard without advancing a real day.');
}

try {
  const archivePackage = JSON.parse(await readFile(path.join(archiveRoot, 'package.json'), 'utf8'));
  assert.equal(archivePackage.version, '0.69.0', 'the supplied archive retains the v0.69 game');
  const storageSource = await readFile(path.join(archiveRoot, 'dist/js/save-storage.js'), 'utf8');
  for (const statement of ["const DB_NAME = 'hearth-and-oath-legacy';", "const CHANNEL = 'hearth-and-oath-legacy:storage';", "const OWNED_PREFIX = 'hearth-and-oath-legacy:';"]) assert.ok(storageSource.includes(statement), 'the supplied archive has its own storage namespace');
  report.before = await snapshot();
  [archiveEngine, archiveEdition, archiveCombat] = await Promise.all([
    import(pathToFileURL(path.join(archiveRoot, 'dist/js/engine.js')).href),
    import(pathToFileURL(path.join(archiveRoot, 'dist/js/edition.js')).href),
    import(pathToFileURL(path.join(archiveRoot, 'dist/js/combat.js')).href),
  ]);
  assert.equal(mainEdition.EDITION_STEP, 71, 'this bounded overlay verifies current step 71');
  assert.equal(archiveEdition.EDITION_STEP, 70, 'the archive new-rules migration ceiling stays at 70');
  const fixtureFiles = ['tests/fixtures/legacy-v5.json', 'tests/fixtures/saves/v0600.json.gz'];
  const [legacy, generated] = await Promise.all(fixtureFiles.map(async file => {
    const bytes = await readFile(path.join(root, file));
    return JSON.parse(file.endsWith('.gz') ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8'));
  }));
  assert.equal(Object.keys(legacy.states).length, 11, 'all eleven genuine v5 states are included');
  assert.equal(generated.source.version, '0.60.0');
  assert.equal(generated.source.madeBy, 'scripts/fixtures/generate-release-saves.mjs');
  assert.deepEqual(Object.keys(generated.states), ['birth', 'eighteen', 'later']);
  report.fixtures = await Promise.all(fixtureFiles.map(async file => ({ path: file, sha256: await hashFile(path.join(root, file)) })));
  for (const [family, source] of [['v5', legacy], ['v0600', generated]]) for (const [name, raw] of Object.entries(source.states)) {
    await check(`${family}/${name}: main → archive → public continuation → main`, row => {
      const rawBefore = clone(raw), main = migrate(mainEngine, raw, `${family}/${name}: current main`);
      remainOld(main, name);
      assert.equal(main.edition.step, 71);
      const stamp = clone(main.edition), payload = exportPayload(main), payloadBefore = clone(payload);
      const imported = migrate(archiveEngine, payload, `${family}/${name}: archive`);
      assert.ok(archiveEdition.archiveAccepts(imported), 'the same gate used by archive import admits these actual old-rule markers');
      assert.deepEqual(imported, payload, 'archive import preserves the entire JSON export, without deleting or projecting any field');
      assert.deepEqual(imported.edition, stamp, 'the complete current typed stamp survives, including step 71');
      const continued = advance(imported, row), returnedPayload = exportPayload(continued);
      assert.deepEqual(continued.edition, stamp, 'real archive play retains the actual incoming stamp');
      const returned = migrate(mainEngine, returnedPayload, `${family}/${name}: main return`);
      assert.deepEqual(returned, returnedPayload, 'main return preserves the entire archive export, not just selected mechanical fields');
      assert.deepEqual(returned.edition, stamp);
      remainOld(returned, 'returned main life');
      assert.deepEqual(raw, rawBefore, 'the genuine fixture is never regenerated or rewritten');
      assert.deepEqual(payload, payloadBefore, 'the incoming file remains exact after archive play');
      return { stamp, inputDay: main.day, continuedDay: continued.day, commands: row.trace.length, mainExportSha256: fingerprint(payload), archiveImportSha256: fingerprint(imported), archiveExportSha256: fingerprint(returnedPayload), mainReturnSha256: fingerprint(returned) };
    });
  }
  await check('bounded metadata validation and actual new-rule admission', () => {
    for (const step of [69, 70, 71]) assert.ok(archiveEdition.validateEdition({ rules: archiveEdition.OLD, began: null, step }), `old step ${step}`);
    assert.ok(archiveEdition.validateEdition(undefined), 'genuine unstamped older saves remain supported');
    for (const stamp of [
      { rules: archiveEdition.NEW, began: '0.71.0', step: 71 },
      { rules: archiveEdition.OLD, began: null, step: 72 },
      { rules: archiveEdition.OLD, began: null, step: '71' },
      { rules: archiveEdition.OLD, began: null, step: 70.5 },
      { rules: archiveEdition.OLD, began: null, step: 68 },
      { rules: 'unknown', began: null, step: 71 },
      { rules: archiveEdition.OLD, began: 'yesterday', step: 71 },
    ]) assert.equal(archiveEdition.validateEdition(stamp), false, JSON.stringify(stamp));
    const seed = 'archive-handoff-current-new';
    const current = mainEngine.createBirthGame({ seed, station: rollBirthCircumstances(seed, 'common', 'human'), appearance: { ancestry: 'human' } });
    assert.ok(mainEngine.validateSave(current));
    for (const [name, stamp] of [['actual new stamp', current.edition], ['forged old 71 stamp', { ...current.edition, rules: archiveEdition.OLD }], ['forged old 70 stamp', { ...current.edition, rules: archiveEdition.OLD, step: 70 }]]) {
      const incoming = clone(current); incoming.edition = clone(stamp);
      const before = clone(incoming);
      assert.equal(archiveEdition.archiveAccepts(incoming), false, `${name}: actual station/debt markers outrank the stamp`);
      const migrated = archiveEngine.migrateSave(incoming);
      assert.ok(!migrated || !archiveEdition.archiveAccepts(migrated), `${name}: import is refused whether parsing or the post-migration admission gate catches it`);
      assert.deepEqual(incoming, before, `${name}: refusal changes no incoming file`);
    }
    return { rejectedNewRuleVariants: 3, scope: 'Public import admission predicate and source migration; visible UI and browser save isolation are separate checks.' };
  });
  await check('a life actually begun in the archive exports forward to main', () => {
    const seed = 'archive-handoff-born-there';
    const born = archiveEngine.createBirthGame({ seed, station: rollBirthCircumstances(seed, 'common', 'human'), appearance: { ancestry: 'human' } });
    assert.ok(archiveEngine.validateSave(born));
    assert.equal(born.edition.began, '0.69.0'); assert.equal(born.edition.rules, archiveEdition.NEW);
    const payload = exportPayload(born), before = clone(payload), imported = migrate(mainEngine, payload, 'archive-born main import');
    const expected = clone(payload); expected.edition.step = mainEdition.EDITION_STEP;
    assert.deepEqual(imported, expected, 'only the explicit no-op edition step advances; the whole recorded life stays exact');
    assert.deepEqual(payload, before);
    assert.equal(imported.farm, undefined, 'a later main game never invents a field for an archive-born person');
    assert.equal(imported.edition.began, '0.69.0');
    return { sourceStamp: born.edition, importedStamp: imported.edition, inputSha256: fingerprint(payload), importedSha256: fingerprint(imported) };
  });
} catch (error) { report.infrastructureError = error.stack || String(error); }
try {
  if (report.before) {
    report.after = await snapshot();
    report.immutableSource = ['main', 'archive'].every(kind => report.before[kind].runtime.sha256 === report.after[kind].runtime.sha256 && report.before[kind].verification.sha256 === report.after[kind].verification.sha256 && report.before[kind].git.head === report.after[kind].git.head);
    assert.ok(report.immutableSource, 'both source trees, verification inputs and HEAD stay frozen throughout');
  }
} catch (error) { report.infrastructureError = [report.infrastructureError, error.stack || String(error)].filter(Boolean).join('\n'); }
report.finishedAt = new Date().toISOString();
report.summary = { legacyStates: report.cases.filter(row => /^(v5|v0600)\//.test(row.name)).length, passed: report.cases.filter(row => row.status === 'PASS').length, failed: report.cases.filter(row => row.status === 'FAIL').length, publicCommands: report.cases.reduce((n, row) => n + row.trace.length, 0) };
report.status = !report.infrastructureError && report.immutableSource && report.summary.legacyStates === 14 && report.summary.passed === 16 && report.summary.failed === 0 ? 'PASS' : 'FAIL';
if (output) { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ status: report.status, summary: report.summary, immutableSource: report.immutableSource ?? false, output: output ? path.relative(root, output) : null, infrastructureError: report.infrastructureError || null }));
process.exitCode = report.status === 'PASS' ? 0 : 1;
