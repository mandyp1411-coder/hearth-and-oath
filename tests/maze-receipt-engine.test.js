import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { mazeLayout } from '../dist/js/maze-v31.js';
import { expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { closeMazeVisit } from '../dist/js/maze-receipt-runtime.js';
import { addCampingKit } from '../dist/js/travel-energy.js';
import {contractDescent} from './helpers/one-rulebook.mjs';

// Controlled room/resources and completed combat fixtures isolate accounting.
// These cases are not earned routing, difficulty or combat fairness evidence.
const clone=v=>structuredClone(v);
function valid(s){assert.ok(E.validateSave(s),s.notice);return s;}
function drain(s){for(let n=0;s.event&&n<40;n++){const pick=s.event.choices.find(c=>['withdraw','later','care','keep','continue','pause','ask','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);assert.ok(pick);s=E.chooseEventOption(s,pick.id);}assert.equal(s.event,null);return valid(s);}
function act(s,id){assert.ok(E.getActions(s).some(a=>a.id===id&&!a.disabledReason),id);return drain(E.chooseAction(s,id));}
let base;
function fresh(){
 if(!base){const old=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent;base=valid(E.migrateSave(old));base=drain(E.chooseEventOption(base,'withdraw'));assert.equal(base.maze,null);assert.equal(base.adventuring.expedition,null);}
 const s=clone(base);s.hero.hp=s.hero.maxHp;s.hero.mp=s.hero.maxMp;s.hero.gold=500;s.hero.potions=3;s.adventuring.rations=5;return valid(s);
}
// One rulebook (v0.72.3): the board's descent is a delve; a contract's descent is the native maze.
function enter(){const s=fresh();return act(s,contractDescent(s));}
function cell(s,kind){const l=mazeLayout(s.maze),r=l.cells.find(r=>r.kind===kind);assert.ok(r,kind);s.maze.position=r.id;s.maze.previous=r.doors[0];s.maze.visited=[...new Set([...s.maze.visited,r.id,r.doors[0]])];return valid(s);}
function completed(s,outcome){
 const b=clone(s.battle);for(const a of b.actors)if(outcome==='victory'?a.side==='enemy':outcome==='defeat'?a.side==='party':false)a.hp=0;
 b.outcome=outcome;b.currentActorId=null;b.turnOrder=b.actors.filter(a=>a.hp>0).map(a=>a.id);return b;
}
function roundtrip(s){const restored=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.deepEqual(restored,s);return restored;}

test('real contract admission and entrance return issue one finite receipt including actual entry costs',()=>{
 const before=fresh(),s=act(before,contractDescent(before));assert.equal(s.day,before.day+1);assert.equal(s.maze.expeditionVisit.days.entry,1);assert.equal(s.maze.expeditionVisit.used.rations,before.adventuring.rations-s.adventuring.rations);
 const returned=act(s,'maze_exit'),r=returned.mazeBook.expeditionReceipts.at(-1);assert.equal(returned.maze,null);assert.equal(r.reason,'stair');assert.equal(r.objective.complete,false);assert.equal(r.end.explored,1);assert.equal(r.end.day-r.start.day,1);assert.equal(expeditionVisitTotals(r).gains.gold,0);const note=returned.journal.find(j=>j.title==='An Expedition Account');assert.ok(note);assert.equal(note.narrativeEdition,30);assert.deepEqual(roundtrip(returned).journal.find(j=>j.id===note.id),note);
});

test('actual cache settlement counts finite finds but not unrelated Gold or relic assessed value',()=>{
 let s=cell(enter(),'cache');s.hero.gold+=100;const gold=s.hero.gold;s=act(s,'maze_search');const totals=expeditionVisitTotals(s.maze.expeditionVisit);
 assert.equal(totals.gains.gold,0);assert.equal(s.hero.gold,gold);assert.equal(totals.gains.relics.length,1);assert.ok(Object.values(totals.gains.materials).some(n=>n>0));
 const snapshot=clone(s);assert.deepEqual(E.chooseAction(s,'maze_search').adventuring.loot,snapshot.adventuring.loot);roundtrip(s);
 s.maze.position=0;s.maze.previous=0;s=act(s,'maze_exit');assert.equal(s.mazeBook.expeditionReceipts.at(-1).settlements.length,1);roundtrip(s);
});

test('accepted victory coalesces base Gold and experience with afterMazeBattle finite spoils once',()=>{
 let s=act(cell(enter(),'enemy'),'maze_fight');const before=clone(s),b=completed(s,'victory'),reward=s.battle.rewards;
 s=valid(E.resolveBattle(s,b));assert.ok(s.maze);const totals=expeditionVisitTotals(s.maze.expeditionVisit);
 assert.equal(s.maze.expeditionVisit.settlements.length,1);assert.equal(totals.gains.gold,reward.gold);assert.equal(totals.gains.experience,reward.exp);assert.equal(totals.gains.relics.length,1);
 const again=valid(E.resolveBattle(s,b));assert.deepEqual(again.maze.expeditionVisit,s.maze.expeditionVisit);assert.equal(again.hero.gold,s.hero.gold);assert.deepEqual(before.battle.context,b.context);roundtrip(s);
});

test('accepted retreat remains the same active visit and defeat closes after actual recovery',()=>{
 let s=act(cell(enter(),'enemy'),'maze_fight'),visitId=s.maze.expeditionVisit.id;
 s=valid(E.resolveBattle(s,completed(s,'retreat')));assert.equal(s.mazeBook.expeditionReceipts.length,0);assert.equal(s.maze.expeditionVisit.id,visitId);assert.equal(s.maze.expeditionVisit.retreats,1);roundtrip(s);
 s=act(cell(s,'enemy'),'maze_fight');const b=completed(s,'defeat'),gold=s.hero.gold,lost=Math.min(gold,Math.max(4,Math.floor(gold*.15))),day=s.day;
 s=valid(E.resolveBattle(s,b));assert.equal(s.maze,null);const r=s.mazeBook.expeditionReceipts.at(-1);assert.equal(r.id,visitId);assert.equal(r.reason,'defeat');assert.equal(r.fees.recovery,lost);assert.equal(r.days.recovery,s.day-day);assert.equal(r.retreats,1);
 const again=E.resolveBattle(s,b);assert.equal(again.mazeBook.expeditionReceipts.length,s.mazeBook.expeditionReceipts.length);assert.equal(again.hero.gold,s.hero.gold);roundtrip(s);
});

test('actual potion and kit use remain separate from carried reserves and attended camp days',()=>{
 let s=enter();s.hero.hp=Math.max(1,s.hero.maxHp-20);addCampingKit(s,'bedroll');s=valid(s);
 s=valid(E.useConsumable(s,'potions'));assert.equal(s.maze.expeditionVisit.used.potions,1);
 const before=s.day;s=act(s,'maze_camp');assert.equal(s.day,before+1);assert.equal(s.maze.expeditionVisit.used.kitNights,1);assert.equal(s.maze.expeditionVisit.days.inside,1);roundtrip(s);
});

test('real all-v1 public successor preserves terminal receipts without inheriting private maps or old run numbering',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/v21-vampire-grievance-paused.json',import.meta.url)));let parent=drain(valid(E.migrateSave(old)));
 assert.ok(parent.life.children.some(c=>c.id==='child-1'&&c.age>=18));if(parent.hero.condition?.type==='vampire')parent.hero.condition.hunger=0;
 // Isolate a valid pre-existing v1 record at the real parent's current clock.
 // It is controlled historical accounting, not a claimed prior playthrough.
 const m={version:1,id:'maze-1',generation:parent.dynasty.generation,kind:'radiant',sourceId:'uncharted',locationId:parent.locationId,title:'A Legacy Descent',tier:1,questId:null,
  seed:`${parent.seed}:maze:${parent.dynasty.generation}:radiant:uncharted:${parent.locationId}:1`,position:0,previous:0,visited:[0],cleared:[0],collected:[],steps:0,objective:false,pendingRoom:null,proofBattleId:null,proofCaptured:false,startedDay:parent.day,status:'inside'};
 m.guardianRoom=mazeLayout(m).guardian;parent.mazeBook={version:1,nextRun:2,records:[]};parent.maze=m;assert.ok(closeMazeVisit(parent,m,'stair'));
 parent.mazeBook.records=[{...clone(m),status:'unfinished',endedDay:parent.day}];parent.maze=null;valid(parent);
 assert.ok(E.getActions(parent).some(a=>a.id==='retire'&&!a.disabledReason));parent=E.chooseAction(parent,'retire');assert.equal(parent.event.id,'retirement');parent=valid(E.chooseEventOption(parent,'settle'));
 assert.equal(parent.phase,'retired');const before=clone(parent),heir=E.continueAsChild(parent,'child-1');assert.deepEqual(parent,before);
 assert.equal(heir.dynasty.generation,parent.dynasty.generation+1);assert.equal(heir.mazeBook.nextRun,1);assert.equal(heir.mazeBook.records.length,0);
 assert.equal(heir.mazeBook.expeditionReceipts.length,1);assert.equal(heir.mazeBook.expeditionReceipts[0].actorId,parent.dynasty.activePersonId);valid(heir);roundtrip(heir);
});
