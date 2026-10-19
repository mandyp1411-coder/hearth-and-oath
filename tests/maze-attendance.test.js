import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyRpgAction } from '../dist/js/rpg-depth-v27.js';

const frozen=JSON.parse(readFileSync(new URL('./fixtures/maze-identity/attendance-v047-parity.json',import.meta.url)));
for(const row of frozen.fixtures)test('legacy attendance output remains exact: '+row.name,()=>{
  const state=structuredClone(row.initial),records=[];
  const result=applyRpgAction(state,row.action,{spendDays(days){const actual=Math.min(days,row.actual);state.day+=actual;return actual;},journal(...args){records.push(args);}});
  assert.equal(result,row.result);assert.deepEqual(state,row.expected);assert.deepEqual(records,row.records);
});
