import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultCreatorDraft, captureCreatorDraft, randomizeCreatorDraft,
  rollCreatorName, toggleCreatorTrait, adjustCreatorAttribute,
  selectCreatorOrigin, selectCreatorHeritage, renderCharacterCreator,
} from '../dist/js/creator.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { validateSave } from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';

// These cases exercise the real creator controls and delegated app handlers on
// the semantic test surface. They do not certify layout or native browser UI.
// Authored at the integration stage; execution requires a source checkpoint.
async function openCreator(t) {
  const ui = await mountApp(t);
  await ui.click('title-new');
  await ui.click('slot-new', '0');
  assert.ok(ui.root.querySelector('#character-form'));
  return ui;
}
async function choose(ui, name, value) {
  ui.set(name, value);
  const control = ui.root.querySelector(`[name="${name}"]`);
  assert.ok(control && !control.disabled, `enabled creator control ${name}`);
  await ui.fire('input', control);
}
const mode = ui => ui.root.querySelector('[name="lifeMode"]')?.value;

test('a new creator draft defaults to Standard and only the explicit Ironman value opts in', () => {
  const draft = defaultCreatorDraft('ironman-creator-default');
  assert.equal(draft.lifeMode, 'standard');
  assert.equal(Object.hasOwn(draft, 'ironman'), false);
  for (const value of ['', 'Ironman', 'unknown', 'true', null, {}]) {
    assert.equal(captureCreatorDraft({ lifeMode: value }, draft).lifeMode, 'standard');
  }
  const selected = captureCreatorDraft({ lifeMode: 'ironman' }, draft);
  assert.equal(selected.lifeMode, 'ironman');
  assert.equal(Object.hasOwn(selected, 'ironman'), false);
  assert.equal(captureCreatorDraft({}, selected).lifeMode, 'ironman');
  assert.equal(captureCreatorDraft({ lifeMode: 'standard' }, selected).lifeMode, 'standard');
});

test('draft changes retain the explicit mode without allocating a run or changing the mode into state metadata', () => {
  let draft = captureCreatorDraft({ lifeMode: 'ironman', startAge: 18 }, defaultCreatorDraft('ironman-draft-edits'));
  const changes = [
    d => captureCreatorDraft({ name: 'Elia', startAge: 0 }, d),
    d => captureCreatorDraft({ startAge: 18, ancestry: 'human' }, d),
    d => selectCreatorOrigin(d, 'random'),
    d => selectCreatorHeritage(d, 'fate'),
    rollCreatorName,
    d => toggleCreatorTrait(d, 'brave'),
    d => adjustCreatorAttribute(d, 'strength', 1),
    randomizeCreatorDraft,
  ];
  for (const change of changes) {
    draft = change(draft);
    assert.equal(draft.lifeMode, 'ironman');
    assert.equal(Object.hasOwn(draft, 'ironman'), false);
  }
});

test('the actual creator keeps the life-mode selector without the rules block on either step', async t => {
  const ui = await openCreator(t);
  for (const step of ['0', '1']) {
    await ui.click('creator-step', step);
    assert.equal(mode(ui), 'standard');
    const control = ui.root.querySelector('[name="lifeMode"]');
    assert.equal(control.getAttribute('aria-describedby'), null);
    assert.equal(control.closest('fieldset[hidden]'), null);
    assert.equal(ui.root.querySelector('#life-mode-rules'), null);
    assert.match(ui.root.innerHTML, /option value="ironman"/);
    assert.equal(ui.root.querySelector('#character-form .begin-button'),null);
    await ui.click('creator-step','2');assert.ok(ui.root.querySelector('#character-form .begin-button'));
  }
});

test('real Back, step, reroll, name and age controls preserve an explicit Ironman choice without saving a life', async t => {
  const ui = await openCreator(t);
  const before = [...ui.values];
  await choose(ui, 'lifeMode', 'ironman');
  await ui.click('creator-step', '1');
  assert.equal(mode(ui), 'ironman');
  await ui.click('creator-back');
  assert.equal(mode(ui), 'ironman');
  await ui.click('creator-random');
  assert.equal(mode(ui), 'ironman');
  await ui.click('creator-name');
  assert.equal(mode(ui), 'ironman');
  for (const age of ['0', '18', '65', '0']) {
    await choose(ui, 'startAge', age);
    await ui.click('creator-step', '1');
    assert.equal(mode(ui), 'ironman');
    assert.equal(ui.root.querySelector('[name="startAge"]').value, age);
    await ui.click('creator-back');
    assert.equal(mode(ui), 'ironman');
  }
  assert.equal(ui.current(), null);
  assert.deepEqual([...ui.values], before);
});

test('changing identity and ancestry through actual controls preserves Ironman; returning to Standard remains explicit', async t => {
  const ui = await openCreator(t);
  await choose(ui, 'lifeMode', 'ironman');
  await choose(ui, 'identity', 'they/them');
  await choose(ui, 'ancestry', 'human');
  assert.equal(mode(ui), 'ironman');
  await ui.click('creator-step', '1');
  await ui.click('creator-attribute', 'strength:1');
  assert.equal(mode(ui), 'ironman');
  await choose(ui, 'lifeMode', 'standard');
  await ui.click('creator-random');
  await ui.click('creator-back');
  assert.equal(mode(ui), 'standard');
  assert.equal(ui.current(), null);
  assert.equal([...ui.values.keys()].some(key => key.startsWith('hearth-and-oath-legacy:ironman-')), false);
});

test('leaving an unsubmitted Ironman draft and opening a new creator resets to Standard', async t => {
  const ui = await openCreator(t);
  await choose(ui, 'lifeMode', 'ironman');
  await ui.click('title-menu');
  assert.ok(ui.root.querySelector('[data-op="creator-discard"]'));await ui.click('creator-discard');
  await ui.click('title-new');
  await ui.click('slot-new', '0');
  assert.equal(mode(ui), 'standard');
  assert.equal(ui.current(), null);
});

test('birth and adult prehistory stay Standard even when the new-life draft explicitly requests Ironman', async () => {
  for (const startAge of [0, 18]) {
    const draft = captureCreatorDraft({ lifeMode: 'ironman', startAge }, defaultCreatorDraft(`ironman-prehistory-${startAge}`));
    let progress = 0;
    const life = await createLifeAtAge(draft, { onProgress: () => { progress++; } });
    assert.equal(draft.lifeMode, 'ironman');
    assert.equal(life.age, startAge);
    assert.equal(life.day, startAge * 365);
    assert.ok(progress > 0);
    assert.equal(Object.hasOwn(life, 'ironman'), false);
    assert.equal(Object.hasOwn(life, 'lifeMode'), false);
    assert.equal(life.battle?.mortality, undefined);
    assert.equal(validateSave(life), true);
  }
});

test('missing mode in an earlier draft renders Standard and never exposes mode conversion for a saved life', () => {
  const draft = defaultCreatorDraft('ironman-legacy-draft');
  delete draft.lifeMode;
  for (const step of [0, 1]) {
    const html = renderCharacterCreator(draft, step);
    assert.match(html, /<option value="standard" selected>Standard<\/option>/);
    assert.doesNotMatch(html, /<option value="ironman" selected>/);
    assert.match(html, /option value="ironman"/);
    assert.doesNotMatch(html, /life-mode-rules/);
  }
  assert.equal(Object.hasOwn(draft, 'ironman'), false);
});
