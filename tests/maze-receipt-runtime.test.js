import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateExpeditionReceipts, expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { prepareMazeObservation,ensureMazeVisit,reconcileMazeDays,recordMazeDays,recordMazeFee,recordMazeUse,closeMazeVisit,inheritedExpeditionReceiptFields,physicalMazeForInheritance } from '../dist/js/maze-receipt-runtime.js';
const clone = value => structuredClone(value);
function fixture(){return clone(JSON.parse(readFileSync(new URL('./fixtures/maze-receipts/id19-legacy-active.json',import.meta.url))).state);}

test('preparing observation or an interrupted zero-day action does not alter an old save',()=>{
 const s=fixture(),before=clone(s),m=s.maze,candidate=prepareMazeObservation(s,m);assert.ok(candidate);assert.deepEqual(s,before);
 reconcileMazeDays(s,m,candidate);assert.deepEqual(s,before);assert.equal(s.mazeBook.expeditionReceipts,undefined);
});

test('actual source-context attendance is reconciled once without doubling central day accounting',()=>{
 const s=fixture(),m=s.maze,candidate=prepareMazeObservation(s,m),start=s.day;
 s.day++;recordMazeFee(s,'work',8,m);assert.equal(m.expeditionVisit.start.day,start+1,'fee opens observation only at its actual mutation');
 reconcileMazeDays(s,m,candidate);assert.equal(m.expeditionVisit.start.day,start);assert.equal(m.expeditionVisit.days.inside,1);assert.equal(m.expeditionVisit.fees.work,8);assert.equal(validateExpeditionReceipts(s),true);
 s.day++;recordMazeDays(s,1,'inside',m);reconcileMazeDays(s,m,candidate);
 assert.equal(m.expeditionVisit.days.inside,2);assert.equal(validateExpeditionReceipts(s),true);
});

test('real close freezes one receipt, removes the live ledger and retains no reward authority',()=>{
 const s=fixture(),m=s.maze;ensureMazeVisit(s,m);recordMazeUse(s,'potions',1,m);s.hero.potions=0;
 const journals=[],beforeGold=s.hero.gold,receipt=closeMazeVisit(s,m,'stair',{journalLiteral:(...a)=>journals.push(a)});
 assert.ok(receipt);assert.equal(m.expeditionVisit,undefined);assert.equal(s.mazeBook.expeditionReceipts.length,1);assert.equal(s.hero.gold,beforeGold);assert.equal(journals.length,1);assert.deepEqual(journals[0][3],{narrativeEdition:30});assert.equal(validateExpeditionReceipts(s),true);
 assert.equal(closeMazeVisit(s,m,'stair',{journalLiteral:(...a)=>journals.push(a)}),receipt);assert.equal(s.mazeBook.expeditionReceipts.length,1);assert.equal(journals.length,1);
 assert.equal(expeditionVisitTotals(receipt).costs.potions,1);
});

test('all-v1 inheritance copies only closed display receipts and their independent numbering',()=>{
 const parent=fixture();closeMazeVisit(parent,parent.maze,'life_end');const before=clone(parent),fields=inheritedExpeditionReceiptFields(parent);
 const heir=fixture();heir.maze=null;heir.mazeBook={version:1,nextRun:1,records:[],...fields};heir.dynasty={generation:2,activePersonId:'heir',history:[{personId:'hero'}]};
 assert.equal(validateExpeditionReceipts(heir),true);assert.equal(heir.mazeBook.nextRun,1);assert.equal(heir.mazeBook.records.length,0);assert.equal(heir.mazeBook.expeditionReceipts[0].actorId,'hero');
 heir.mazeBook.expeditionReceipts[0].actorName='changed in child copy';assert.deepEqual(parent,before);
});

test('direct active-parent physical projection strips the ledger without ending or mutating that life',()=>{
 const parent=fixture();ensureMazeVisit(parent);parent.maze.version=2;parent.maze.content={family:'authored'};const before=clone(parent);
 const physical=physicalMazeForInheritance(parent.maze),fields=inheritedExpeditionReceiptFields(parent);
 assert.equal(physical.expeditionVisit,undefined);assert.deepEqual(physical.visited,parent.maze.visited);assert.equal(fields.expeditionReceipts.length,0);assert.equal(parent.mazeBook.expeditionReceipts.length,0);
 assert.deepEqual(parent,before);assert.equal(parent.phase,'adult');assert.equal(parent.maze.expeditionVisit.id,'maze-visit-1');
});
