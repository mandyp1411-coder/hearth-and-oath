import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeMaze, mazeEntrySpec, mazeLayout } from '../../dist/js/maze-v31.js';

const template=JSON.parse(readFileSync(new URL('../fixtures/maze-identity/v047-compatibility.json',import.meta.url))).activeState.maze;

/** Controlled pre-existing v0.47 record, not a conversion of a new version 2 run. */
export function recordExistingVersionOneMaze(s,id,questId=null){
  assert.ok(!s.maze);initializeMaze(s);const spec=mazeEntrySpec(s,id,questId);assert.ok(spec);
  const number=s.mazeBook.nextRun++,generation=s.dynasty?.generation||1;
  const row={...structuredClone(template),id:'maze-'+number,generation,
    kind:spec.kind,sourceId:spec.sourceId,title:spec.title,tier:spec.tier,questId,
    locationId:s.locationId,startedDay:s.day,status:'unfinished',endedDay:s.day,
    seed:`${s.seed}:maze:${generation}:${spec.kind}:${spec.sourceId}:${s.locationId}:${number}`};
  row.guardianRoom=mazeLayout(row).guardian;s.mazeBook.records.push(row);return row;
}
