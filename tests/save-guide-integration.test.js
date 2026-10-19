import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../dist/js/engine.js';
import { completeLineageHistory } from '../dist/js/lineage.js';
import { firstDayGuideVisible } from '../dist/js/first-day-guide.js';

// Controlled captured parent, not a claim to have played an entire lifetime.
const raw=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states.parent;
for(const oldMarker of [undefined,{version:1,dismissed:true}])test(`public succession creates a fresh optional guide without backfilling or resetting the ${oldMarker?'dismissed':'legacy'} parent`,()=>{
 const parent=E.migrateSave(structuredClone(raw));assert.ok(parent);
 if(oldMarker)parent.hero.firstDayGuide=structuredClone(oldMarker);else delete parent.hero.firstDayGuide;
 parent.phase='retired';parent.event=null;parent.chronicle='A controlled captured parent chapter.';completeLineageHistory(parent,'retirement');
 assert.ok(E.validateSave(parent));const before=structuredClone(parent),next=E.continueAsChild(parent,'child-1');assert.ok(next);assert.equal(next.dynasty.generation,2);
 assert.deepEqual(next.hero.firstDayGuide,{version:1,dismissed:false});assert.equal(firstDayGuideVisible(next),true);assert.ok(next.npcContinuity);assert.ok(next.familyOrigins);assert.ok(E.validateSave(next));
 assert.deepEqual(E.migrateSave(structuredClone(next)),next);assert.deepEqual(parent,before,'the historical parent remains exactly unchanged');
});
