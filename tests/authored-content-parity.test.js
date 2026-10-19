import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authoredParityCases } from './helpers/authored-content-parity.mjs';

const frozen = JSON.parse(readFileSync(new URL('./fixtures/maze-identity/authored-helper-v047-parity.json', import.meta.url)));
test('shared authored helper extraction retains exact legacy offers, effects, scenes and records', () => {
  assert.deepEqual(authoredParityCases(), frozen.rows);
});
