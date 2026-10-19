import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_OPTIONS, PORTRAIT_FIELDS, DEFAULT_APPEARANCE, normalizeAppearance, isCanonicalAppearance, portraitLayers, renderAvatar, appearanceFields, appearanceFromForm, describeAppearance } from '../dist/js/avatar.js';

// Ignore accessible descriptions and references so a changed label cannot masquerade as a changed picture.
function drawing(markup) {
  return markup.replace(/<title>[^]*?<\/title>/g, '').replace(/aria-label="[^"]*"/g, '')
    .replace(/\sid="portrait-[^"]*"/g, '').replace(/\sdata-[\w-]+="[^"]*"/g, '').replace(/\sclass="(?!portrait-layer\b)[^"]*"/g, '');
}

test('appearance has complete canonical choices, with independent defaults', () => {
  const first = normalizeAppearance(null);
  assert.deepEqual(first, DEFAULT_APPEARANCE);
  assert.notEqual(first, DEFAULT_APPEARANCE);
  assert.deepEqual(Object.keys(first), AVATAR_OPTIONS.map(field => field.key));
  for (const field of AVATAR_OPTIONS) {
    assert.equal(new Set(field.options.map(option => option.value)).size, field.options.length);
    assert.ok(field.options.some(option => option.value === first[field.key]));
    for (const option of field.options) assert.equal(normalizeAppearance({ [field.key]: option.value })[field.key], option.value);
  }
  first.skin = 'deep';
  assert.equal(DEFAULT_APPEARANCE.skin, 'warm');
});

test('legacy free text and existing palettes become recognizable canonical appearances', () => {
  const value = normalizeAppearance({ skin: 'warm brown', hair: 'dark, loosely tied', eyes: 'Hazel', build: 'Medium' });
  assert.equal(value.skin, 'warm');
  assert.equal(value.hair, 'black');
  assert.equal(value.hairStyle, 'tied');
  assert.equal(value.eyes, 'hazel');
  assert.equal(value.build, 'average');
  assert.equal(normalizeAppearance({ skin: '#946343', hair: '#c5c3b9', eyes: 'Gray', build: 'Broad' }).skin, 'brown');
  assert.equal(normalizeAppearance({ skin: '#946343', hair: '#c5c3b9', eyes: 'Gray', build: 'Broad' }).hair, 'silver');
  assert.equal(normalizeAppearance({ eyes: 'Gray', build: 'Broad' }).eyes, 'grey');
  assert.equal(normalizeAppearance({ build: 'Broad' }).build, 'broad');
});

