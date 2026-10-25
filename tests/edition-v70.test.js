import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as engine from '../dist/js/engine.js';
import { rollBirthCircumstances } from '../dist/js/station.js';
import { createSuccessor, completeLineageHistory } from '../dist/js/lineage.js';
import { rulesOf, rulesLabel, rulesNote, stampEdition, validateEdition, exportFileName, archiveAccepts, GAME_VERSION, EDITION_STEP, OLD, NEW } from '../dist/js/edition.js';

const pick = s => (s.event.choices.find(c => ['rest', 'endure', 'present', 'continue', 'contest', 'plead', 'refuse', 'private'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id;
const settle = s => { for (let n = 0; n < 30 && s.event && s.phase !== 'retired'; n++) s = engine.chooseEventOption(s, pick(s)); return s; };
const born = seed => engine.createBirthGame({ seed, station: rollBirthCircumstances(seed, 'common', 'human'), appearance: { ancestry: 'human' } });
/** A real save written by a past release's own engine (scripts/fixtures/generate-release-saves.mjs). */
const release = v => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/saves/v${v}.json.gz`, import.meta.url))));
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json', import.meta.url), 'utf8'));

test('a life born now is stamped with the rules it lives by and the version it began in', () => {
  const s = born('ed-born-1');
  assert.deepEqual(s.edition, { rules: NEW, began: GAME_VERSION, step: EDITION_STEP });
  assert.equal(rulesLabel(s), `New rules, begun in v${GAME_VERSION.replace(/\.0$/, '')}`);
  assert.equal(rulesNote(s), null);
  assert.equal(exportFileName(s), `hearth-and-oath-${s.hero.name.replace(/[^a-zA-Z0-9_-]/g, '-')}-new-rules.json`);
  assert.equal(archiveAccepts(s), false);
  assert.ok(engine.validateSave(s));
  // the stamp survives a season and a save round trip
  let t = settle(engine.ageUp(s)); assert.deepEqual(t.edition, s.edition);
  t = engine.migrateSave(JSON.parse(JSON.stringify(t))); assert.deepEqual(t.edition, s.edition);
});

test('the markers decide: a station or a debt ledger is the new rules, neither is the old', () => {
  const s = born('ed-mark-1');
  assert.equal(rulesOf(s), NEW);
  const noStation = structuredClone(s); noStation.hero.station = null; assert.equal(rulesOf(noStation), NEW, 'the debt ledger alone is enough');
  const neither = structuredClone(noStation); delete neither.householdBudget.debt; assert.equal(rulesOf(neither), OLD);
  assert.equal(rulesOf(null), OLD); assert.equal(rulesOf({}), OLD);
});

test('an old save is labelled Old rules by what it holds, and the engine reads it into the one rulebook with stated defaults', () => {
  for (const [name, raw] of Object.entries(legacy.states)) {
    assert.equal(rulesOf(raw), OLD, name); assert.equal(rulesLabel(raw), 'Old rules');
    assert.match(rulesNote(raw), /old rules.*archive/); assert.ok(archiveAccepts(raw));
    assert.match(exportFileName(raw), /-old-rules\.json$/);
    // v0.72.2: one rulebook. The main game never reads an old life into play (rulebook.js keeps it as
    // stored); the engine itself reads any life into the one rulebook: nothing owed, luck from today,
    // no station invented, no date given after the fact.
    const s = engine.migrateSave(raw);
    assert.ok(s && engine.validateSave(s), name);
    assert.equal(s.householdBudget.debt, 0); assert.equal(s.fortune.lastSeason, Math.floor(s.day / 92));
    assert.equal(s.hero.station, undefined);
    assert.deepEqual(s.edition, { rules: NEW, began: null, step: EDITION_STEP }, name);
  }
});

test('real saves from v0.60, v0.61, v0.62, v0.66 and v0.69 are told by their stored markers, load into the one rulebook and continue through public commands', () => {
  const expect = { '0600': OLD, '0610': NEW, '0620': NEW, '0660': NEW, '0690': NEW };
  for (const [v, rules] of Object.entries(expect)) {
    const fixture = release(v);
    assert.equal(fixture.source.version.replace(/\./g, ''), v);
    for (const [name, raw] of Object.entries(fixture.states)) {
      assert.equal(raw.edition, undefined, `${v} ${name}: written before the stamp existed`);
      assert.equal(rulesOf(raw), rules, `${v} ${name}: told by what it holds`);
      const s = engine.migrateSave(raw);
      assert.ok(s && engine.validateSave(s), `${v} ${name} loads`);
      assert.equal(s.edition.rules, NEW, `${v} ${name}: read into the one rulebook`);
      assert.equal(s.edition.began, null, 'a life begun before v0.70 is never given a date after the fact');
      assert.equal(s.edition.step, EDITION_STEP);
      assert.equal(rulesLabel(raw), rules === OLD ? 'Old rules' : 'New rules, begun before v0.70');
      assert.equal(rulesLabel(s), 'New rules, begun before v0.70');
      if (v === '0610') {
        // Genuine pre-station births: zero debt is a defined ledger and
        // therefore new rules. No modern fixture has had a marker removed.
        assert.equal(raw.hero.station, undefined, `${name}: the release predates stations`);
        assert.equal(raw.householdBudget.debt, 0, `${name}: the actual release wrote a zero-debt ledger`);
        assert.equal(s.hero.station, undefined, `${name}: migration invents no station`);
        assert.equal(s.householdBudget.debt, raw.householdBudget.debt);
        assert.equal(archiveAccepts(s), false, `${name}: a debt-only life belongs in main`);
      }
      if (name !== 'eighteen') continue;
      let t = s; for (let n = 0; n < 6 && t.phase !== 'retired'; n++) { t = t.event ? engine.chooseEventOption(t, pick(t)) : engine.liveSeason ? engine.liveSeason(t) : engine.ageUp(t); }
      t = settle(t);
      assert.ok(engine.validateSave(t), `${v} plays on`); assert.ok(t.day > s.day || t.phase === 'retired');
      assert.deepEqual(t.edition, s.edition, 'the stamp is kept as the life goes on');
    }
  }
});

test('the stamp is idempotent and never rewrites when a life began', () => {
  const s = born('ed-idem-1');
  const first = structuredClone(s.edition);
  stampEdition(s); stampEdition(s); assert.deepEqual(s.edition, first);
  const dated = structuredClone(s); dated.edition = { rules: NEW, began: '0.66.0', step: 69 };
  stampEdition(dated); assert.deepEqual(dated.edition, { rules: NEW, began: '0.66.0', step: EDITION_STEP }, 'a recorded beginning is kept, the step is brought forward');
  assert.equal(rulesLabel(dated), 'New rules, begun in v0.66');
});

test('the validator accepts a well-formed stamp or none, and refuses a malformed one', () => {
  const s = born('ed-valid-1');
  assert.ok(validateEdition(undefined));
  for (const bad of [{ rules: 'odd', began: null, step: 70 }, { rules: NEW, began: 'yesterday', step: 70 }, { rules: NEW, began: null, step: 68 }, { rules: NEW, began: null, step: EDITION_STEP + 1 }, { rules: OLD, began: null }, 'old', 7]) {
    assert.equal(validateEdition(bad), false, JSON.stringify(bad));
    const t = structuredClone(s); t.edition = bad; assert.equal(engine.validateSave(t), false, JSON.stringify(bad));
  }
  const clean = structuredClone(s); delete clean.edition; assert.ok(engine.validateSave(clean), 'a save from before the stamp still validates');
});

test('an heir begins under the one rulebook, dated to the release that made it', () => {
  // The legacy parent fixture, read into the one rulebook and retired by hand the way lineage.test.js does it.
  const s = engine.migrateSave(structuredClone(legacy.states.parent));
  assert.equal(s.edition.rules, NEW); assert.equal(s.hero.station, undefined);
  s.phase = 'retired'; s.event = null; s.chronicle = `${s.hero.name}'s chapter closes.`;
  completeLineageHistory(s, 'retirement');
  const heir = createSuccessor(s, s.life.children[0].id, engine.createBirthGame);
  assert.ok(heir && engine.validateSave(heir));
  assert.equal(heir.hero.station ?? null, null, 'a parent without a station passes none on'); assert.equal(heir.householdBudget.debt, 0);
  assert.deepEqual(heir.edition, { rules: NEW, began: GAME_VERSION, step: EDITION_STEP }, 'the stamp is recomputed after the budget reset, not copied from the birth');
  assert.equal(rulesLabel(heir), `New rules, begun in v${GAME_VERSION.replace(/\.0$/, '')}`);
});

test('the fixtures of real saves are what the generator says they are', () => {
  const files = readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(f => f.endsWith('.json.gz')).sort();
  assert.deepEqual(files, ['v0600.json.gz', 'v0610.json.gz', 'v0620.json.gz', 'v0660.json.gz', 'v0690.json.gz']);
  for (const f of files) {
    const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/saves/' + f, import.meta.url))));
    assert.equal(fixture.source.madeBy, 'scripts/fixtures/generate-release-saves.mjs');
    assert.deepEqual(Object.keys(fixture.states), ['birth', 'eighteen', 'later']);
    assert.equal(fixture.states.birth.age, 0); assert.equal(fixture.states.eighteen.age, 18);
    assert.ok(fixture.states.later.day > fixture.states.eighteen.day);
  }
});
