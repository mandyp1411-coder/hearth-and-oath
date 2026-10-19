import { observationalInfancy } from '../dist/js/development.js';
import { atService } from './helpers/service-visit.mjs';
import { assertMigrationMechanics, assertEventMechanics } from './helpers/migration-mechanics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_APPEARANCE, AVATAR_OPTIONS, isCanonicalAppearance } from '../dist/js/avatar.js';
import { createBirthGame, chooseAction, migrateSave, validateSave } from '../dist/js/engine.js';

const extensions = ['headgear', 'stature', 'relic', 'mantle', 'portraitFace', 'facialHair', 'faceVariant', 'facewear', 'coverColor', 'heritage', 'portraitPresentation', 'preset'];
const historicalAppearance = value => Object.fromEntries(Object.entries(value).filter(([key]) => !extensions.includes(key)));
const fixture = version => JSON.parse(readFileSync(new URL(`./fixtures/legacy-v${version}.json`, import.meta.url), 'utf8')).states;

test('canonical old portraits may omit only the new expression fields', () => {
  const original = historicalAppearance(DEFAULT_APPEARANCE);
  assert.equal(isCanonicalAppearance(original), true);
  assert.equal(isCanonicalAppearance(DEFAULT_APPEARANCE), true);
  for (const field of AVATAR_OPTIONS) {
    const missing = { ...DEFAULT_APPEARANCE };
    delete missing[field.key];
    assert.equal(isCanonicalAppearance(missing), extensions.includes(field.key), field.key);
    assert.equal(isCanonicalAppearance({ ...original, [field.key]: 'unsupported' }), false, field.key);
    assert.equal(isCanonicalAppearance({ ...original, [field.key]: null }), false, field.key);
  }
  assert.equal(isCanonicalAppearance({ ...original, undocumented: 'none' }), false);
  assert.equal(isCanonicalAppearance(null), false);
  assert.equal(isCanonicalAppearance([]), false);
});

test('every genuine earlier save validates and migrates without losing pending mechanics', () => {
  for (let version = 1; version <= 5; version++) {
    for (const [id, original] of Object.entries(fixture(version))) {
      const snapshot = structuredClone(original);
      assert.equal(validateSave(original), true, `v${version}/${id} still validates`);
      const restored = migrateSave(original);
      assert.ok(restored && validateSave(restored), `v${version}/${id} restores`);
      assert.deepEqual(original, snapshot, 'migration never mutates an imported file');
      if(observationalInfancy(original)&&original.event&&(original.event.id==='birth_arrival'||/^birth_year_[012]$/.test(original.event.id)||original.event.id==='health_concern')){assert.equal(restored.event.id,original.event.id);assert.deepEqual(restored.event.choices.map(c=>c.id),['continue']);}else assertEventMechanics(original.event,restored.event);
      assert.deepEqual(restored.battle, original.battle, `${id}: exact combat turn`);
      assertMigrationMechanics(original.journal,restored.journal,'journal');
      if (original.conversations) assert.equal(restored.conversations.pending?.personId, original.conversations.pending?.personId);
      if (original.revision >= 2) assert.deepEqual(restored.hero.appearance, original.hero.appearance, 'canonical original faces stay saved exactly');
    }
  }
});

test('hero and family portraits reject invalid new choices without normalizing them away', () => {
  const state = createBirthGame({ name: 'Old Face', seed: 'expression-compatibility' });
  state.hero.appearance = historicalAppearance(state.hero.appearance);
  const person = state.lineage.people.find(p => p.source === 'hero');
  person.appearance = { ...state.hero.appearance };
  assert.equal(validateSave(state), true, 'old hero and family portrait shape is still valid');
  assert.deepEqual(migrateSave(state).hero.appearance, state.hero.appearance);
  assert.deepEqual(migrateSave(state).lineage.people.find(p => p.id === person.id).appearance, person.appearance);
  for (const field of extensions) {
    const invalidHero = structuredClone(state);
    invalidHero.hero.appearance[field] = 'unsupported';
    assert.equal(validateSave(invalidHero), false, `${field} is checked on the hero`);
    assert.equal(migrateSave(invalidHero), null);
    const invalidFamily = structuredClone(state);
    invalidFamily.lineage.people.find(p => p.id === person.id).appearance[field] = 'unsupported';
    assert.equal(validateSave(invalidFamily), false, `${field} is checked on family records`);
    assert.equal(migrateSave(invalidFamily), null);
  }
});

test('a saved adoption retains its exact child identity and waiting decision with an old portrait', () => {
  const parent = migrateSave(fixture(5).partner);
  assert.ok(parent);
  const state = chooseAction(atService(parent,'lineage_adoption_12'), 'lineage_adoption_12');
  const candidate = state.lineage.adoption.candidates.at(-1);
  assert.ok(candidate, 'the public action creates a real named candidate');
  candidate.appearance = historicalAppearance(candidate.appearance);
  const before = structuredClone(state);
  assert.equal(validateSave(state), true);
  const restored = migrateSave(state);
  assert.ok(restored);
  assert.deepEqual(restored.lineage.adoption, before.lineage.adoption);
  assert.deepEqual(restored.event, before.event);
  for (const field of extensions) {
    const invalid = structuredClone(state);
    invalid.lineage.adoption.candidates.at(-1).appearance[field] = 'unsupported';
    assert.equal(validateSave(invalid), false, `${field} is checked on adoption candidates`);
    assert.equal(migrateSave(invalid), null);
  }
});
