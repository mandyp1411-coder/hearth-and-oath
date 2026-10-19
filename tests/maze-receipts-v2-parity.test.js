import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mazeActorId, validMazeActor, mazeRunIdentity } from './fixtures/maze-receipts/id19-provenance-reference.mjs';
import { expeditionRunIdentity, createExpeditionVisit, expeditionVisitTotals, expeditionObjectiveSnapshot, finishExpeditionVisit, validateExpeditionReceipts } from '../dist/js/maze-receipts.js';
import { inheritedExpeditionReceiptFields, physicalMazeForInheritance } from '../dist/js/maze-receipt-runtime.js';

// Exact ID19 public-engine capture committed in ab021de. These tests exercise
// pure receipt projections on its real saved states, not engine-emitted receipt
// or earned-route evidence. No engine or handler module is imported here.
const bytes=readFileSync(new URL('./fixtures/maze-identity/v2-successor.json.gz',import.meta.url));
const artifact=JSON.parse(gunzipSync(bytes));
const original=JSON.stringify(artifact);
const clone=value=>structuredClone(value);
const run=s=>s.maze||s.mazeBook.records.at(-1);

test('actual five-state v2 capture matches canonical full identity, actor generation and observed clock',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'fcc1b79ed79a052ded974d65ef0350d99526f88e1381884b596d86edb843ffbe');
 assert.equal(artifact.version,1);assert.equal(artifact.earnedRoute,false);
 assert.deepEqual(Object.keys(artifact.states),['unresolvedParent','unresolvedHeir','renewedHeir','completedParent','completedHeir']);
 const expectedDays={unresolvedParent:23733,unresolvedHeir:23733,renewedHeir:23736,completedParent:23747,completedHeir:23747};
 for(const [name,s]of Object.entries(artifact.states)){
  const m=run(s),identity=expeditionRunIdentity(m),{mazeVersion,kind,...canonical}=identity;
  assert.deepEqual(canonical,mazeRunIdentity(m),name);assert.equal(mazeVersion,2);assert.equal(kind,'regional');assert.equal(identity.runGeneration,1);
  assert.equal(s.day,expectedDays[name]);assert.equal(validateExpeditionReceipts(s),true,'untouched older save remains usable');
  const visit=createExpeditionVisit(s,m,1,{coverage:'observed'});assert.ok(visit,name);
  assert.equal(visit.actorId,mazeActorId(s));assert.equal(validMazeActor(s,visit.actorId),true);assert.equal(visit.actorName,s.hero.name);
  assert.equal(visit.actorGeneration,name.endsWith('Parent')?1:2);assert.equal(visit.start.day,s.day);assert.equal(visit.days.entry,0);
  assert.equal(visit.start.explored,m.visited.length);assert.equal(visit.start.cleared,m.cleared.length);assert.equal(visit.start.steps,m.steps);
  const totals=expeditionVisitTotals(visit);assert.equal(totals.days,0);assert.equal(totals.gains.gold,0);assert.equal(totals.costs.gold,0);assert.equal(visit.settlements.length,0);
  const objective=expeditionObjectiveSnapshot(s,m);assert.equal(objective.complete,name.startsWith('completed'));
  if(!objective.complete)assert.deepEqual([objective.method,objective.completionDay,objective.completionActorId],[null,null,null]);
 }
 assert.equal(JSON.stringify(artifact),original,'read-only projections cannot mutate the captured parents or heirs');
});

test('actual v2 completed proof remains parent-attributed in heir projections and rejects retained conflicts',()=>{
 const parent=clone(artifact.states.completedParent),m=run(parent),proof=parent.mazeBook.contentReceipts[0];
 const visit=createExpeditionVisit(parent,m,1,{coverage:'observed'});
 // A hypothetical pure stair projection, not a claim that the ID19 capture
 // already emitted an ID23 receipt or that its archived parent re-entered.
 const receipt=finishExpeditionVisit(visit,parent,m,'stair');assert.ok(receipt);
 assert.equal(receipt.actorId,parent.dynasty.activePersonId);assert.equal(receipt.actorGeneration,1);
 assert.deepEqual(receipt.objective,{complete:true,method:proof.method,completionDay:proof.day,completionActorId:proof.actorId,battleId:m.proofBattleId||null,captured:m.proofCaptured===true});
 Object.assign(parent.mazeBook,{nextExpeditionVisit:2,expeditionReceipts:[receipt]});assert.equal(validateExpeditionReceipts(parent),true);
 const parentBefore=JSON.stringify(parent),heir=clone(artifact.states.completedHeir);
 Object.assign(heir.mazeBook,inheritedExpeditionReceiptFields(parent));assert.equal(validateExpeditionReceipts(heir),true);
 assert.equal(heir.mazeBook.expeditionReceipts[0].actorId,proof.actorId);assert.equal(heir.mazeBook.expeditionReceipts[0].identity.runGeneration,1);
 const heirVisit=createExpeditionVisit(heir,run(heir),2,{coverage:'observed'}),heirReceipt=finishExpeditionVisit(heirVisit,heir,run(heir),'stair');assert.ok(heirReceipt);
 assert.equal(heirReceipt.actorId,heir.dynasty.activePersonId);assert.equal(heirReceipt.actorGeneration,2);assert.equal(heirReceipt.objective.completionActorId,proof.actorId);
 assert.equal(heirReceipt.objective.completionDay,proof.day);assert.equal(validateExpeditionReceipts(JSON.parse(JSON.stringify(heir))),true);
 for(const change of [s=>s.mazeBook.contentReceipts[0].actorId=s.dynasty.activePersonId,s=>s.mazeBook.contentReceipts[0].day--,s=>run(s).contentOutcomes.find(r=>r.slotId==='goal').actorId=s.dynasty.activePersonId]){
  const conflict=clone(heir);change(conflict);assert.equal(validateExpeditionReceipts(conflict),false,change.toString());
 }
 heir.mazeBook.expeditionReceipts[0].actorName='child copy only';assert.equal(JSON.stringify(parent),parentBefore);
 assert.equal(JSON.stringify(artifact),original);
});

test('actual renewed v2 heir observes inherited rooms without prior counters or fabricated lifecycle closure',()=>{
 const s=clone(artifact.states.renewedHeir),m=s.maze;
 Object.assign(s.mazeBook,{nextExpeditionVisit:2,expeditionReceipts:[]});m.expeditionVisit=createExpeditionVisit(s,m,1,{coverage:'observed'});
 assert.ok(m.expeditionVisit);assert.equal(validateExpeditionReceipts(s),true);assert.equal(m.expeditionVisit.actorGeneration,2);assert.equal(m.expeditionVisit.identity.runGeneration,1);
 assert.ok(m.expeditionVisit.start.day>m.startedDay);assert.equal(m.expeditionVisit.days.entry,0);assert.equal(m.expeditionVisit.settlements.length,0);
 const before=JSON.stringify(s),physical=physicalMazeForInheritance(m),history=inheritedExpeditionReceiptFields(s);
 assert.equal(physical.expeditionVisit,undefined);assert.deepEqual(physical.visited,m.visited);assert.deepEqual(physical.contentOutcomes,m.contentOutcomes);
 assert.deepEqual(history.expeditionReceipts,[]);assert.equal(JSON.stringify(s),before);assert.equal(JSON.stringify(artifact),original);
});
