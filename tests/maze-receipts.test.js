import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mazeActorId,validMazeActor,mazeRunIdentity } from './fixtures/maze-receipts/id19-provenance-reference.mjs';
import {
 EXPEDITION_RECEIPT_LIMIT, EXPEDITION_SETTLEMENT_LIMIT, expeditionRunIdentity, sameExpeditionRun,
 expeditionEntrySnapshot, createExpeditionVisit, addExpeditionDays, addExpeditionUse, addExpeditionFee,
 noteExpeditionRetreat, recordExpeditionVictory, expeditionSettlementSnapshot, expeditionSettlementDelta, recordExpeditionSettlement,
 expeditionVisitTotals, expeditionObjectiveSnapshot, finishExpeditionVisit, validateExpeditionReceipts,
} from '../dist/js/maze-receipts.js';

const clone = v => structuredClone(v);
function fixture(version=1) {
 const maze={version,id:'maze-1',generation:1,kind:'authored',sourceId:'cistern',locationId:'ruin',seed:'receipt-fixture:maze:1:authored:cistern:ruin:1',title:'The Cistern',
  visited:[0],cleared:[0],collected:[],steps:0,position:0,objective:false,proofBattleId:null,proofCaptured:false,startedDay:11};
 if(version===2){maze.content={family:'authored',anchors:[{cellId:3,slotId:'cache'},{cellId:4,slotId:'goal'}]};maze.contentFacts={};maze.contentOutcomes=[];}
 return {seed:'receipt-fixture',day:10,hero:{name:'Aster',hp:30,mp:15,gold:20,potions:3},dynasty:{generation:1,activePersonId:'person-1',history:[]},lineage:{people:[]},
  world:{locations:[{id:'ruin'}]},flags:{herbs:2},adventuring:{rations:4,loot:[]},equipment:{owned:[],instances:[],materials:{ore:2,cloth:2,wood:0,stone:0,hide:0,crystal:0}},
  trail:{kits:[{id:'camp-1',remaining:2},{id:'camp-2',remaining:0},{id:'camp-3',remaining:5}]},rpg:{properties:[]},
  maze,mazeBook:{nextRun:2,records:[],nextExpeditionVisit:2,expeditionReceipts:[]}};
}
function entered(s=fixture()) {
 const before=expeditionEntrySnapshot(s);s.day++;
 s.maze.expeditionVisit=createExpeditionVisit(s,s.maze,1,{entry:before,entryDays:1});
 assert.ok(s.maze.expeditionVisit);assert.equal(validateExpeditionReceipts(s),true);return s;
}
const source=(kind='cache',cellId=3,slotId=null,actionId=null)=>({kind,cellId,slotId,actionId,subjectId:null});
function settlement(s,change,src=source()) {
 const before=expeditionSettlementSnapshot(s);change(s);
 if(['authored','signature'].includes(src.kind))s.maze.contentOutcomes.push({slotId:src.slotId,actionId:src.actionId,day:s.day,actorId:s.dynasty.activePersonId,...(src.subjectId?{bossId:src.subjectId}:{})});
 const effect=expeditionSettlementDelta(before,expeditionSettlementSnapshot(s));assert.ok(effect);
 s.maze.expeditionVisit=recordExpeditionSettlement(s.maze.expeditionVisit,s.maze,src,s.day,effect);return effect;
}
function expose(s){s.maze.visited.push(3);s.maze.cleared.push(3);s.maze.steps++;}
function archive(s,reason='stair') {
 const receipt=finishExpeditionVisit(s.maze.expeditionVisit,s,s.maze,reason);assert.ok(receipt);
 delete s.maze.expeditionVisit;s.mazeBook.records=[clone(s.maze)];s.mazeBook.expeditionReceipts.push(receipt);s.maze=null;
 assert.equal(validateExpeditionReceipts(s),true);return receipt;
}

test('identity is explicit and v1 never acquires a story manifest',()=>{
 const s=fixture(),before=clone(s),id=expeditionRunIdentity(s.maze);
 assert.equal(id.mazeVersion,1);assert.equal(id.family,null);assert.equal(id.manifestVersion,null);assert.equal(sameExpeditionRun(id,s.maze),true);
 for(const [key,value] of [['mazeId','maze-2'],['runSeed','other'],['runGeneration',2],['kind','regional'],['sourceId','archive'],['locationId','town']])assert.equal(sameExpeditionRun({...id,[key]:value},s.maze),false,key);
 assert.deepEqual(s,before);
 const modern=fixture(2);assert.equal(expeditionRunIdentity(modern.maze).family,'authored');
 assert.equal(sameExpeditionRun({...id,extra:true},s.maze),false);
});

test('entry snapshot is primitive, counts only usable nights, and admits the actual entry day',()=>{
 const s=fixture(),before=clone(s),entry=expeditionEntrySnapshot(s);
 assert.deepEqual(entry,{day:10,explored:1,cleared:1,steps:0,potions:3,rations:4,kitNights:7,health:30,focus:15});assert.deepEqual(s,before);
 s.day++;const v=createExpeditionVisit(s,s.maze,1,{entry,entryDays:1});assert.ok(v);assert.equal(v.start.day,10);assert.equal(v.days.entry,1);
 assert.equal(createExpeditionVisit(s,s.maze,1,{entry,entryDays:0}),null);assert.equal(createExpeditionVisit(s,s.maze,0,{entry,entryDays:1}),null);
 assert.equal(Object.values(entry).every(v=>typeof v==='number'),true);
});

test('active legacy observation starts now and never invents the missing entry or prior gains',()=>{
 const s=fixture();s.day=90;s.maze.visited=[0,3,4];s.maze.cleared=[0,3];s.maze.steps=43;
 s.maze.expeditionVisit=createExpeditionVisit(s,s.maze,1,{coverage:'observed'});
 assert.ok(s.maze.expeditionVisit);assert.equal(s.maze.expeditionVisit.start.day,90);assert.equal(s.maze.expeditionVisit.start.explored,3);
 assert.equal(expeditionVisitTotals(s.maze.expeditionVisit).days,0);assert.equal(expeditionVisitTotals(s.maze.expeditionVisit).gains.gold,0);assert.equal(validateExpeditionReceipts(s),true);
 const r=archive(s);assert.equal(r.coverage,'observed');assert.equal(r.days.entry,0);
});

test('counter updates are immutable, accept actual zero, and reject invalid kinds or overflow',()=>{
 const s=entered(),v=s.maze.expeditionVisit,before=clone(v);
 assert.equal(addExpeditionDays(v,'inside',0),v);assert.equal(addExpeditionDays(v,'fake',1),v);assert.equal(addExpeditionUse(v,'walkFocus',-1),v);
 assert.equal(addExpeditionFee(v,'work',1.5),v);assert.deepEqual(v,before);
 assert.equal(addExpeditionDays(v,'inside',2).days.inside,2);assert.equal(addExpeditionUse(v,'kitNights',1).used.kitNights,1);
 assert.equal(addExpeditionFee(v,'recovery',3).fees.recovery,3);assert.equal(noteExpeditionRetreat(v).retreats,1);
 const huge={...v,used:{...v.used,potions:Number.MAX_SAFE_INTEGER}};assert.equal(addExpeditionUse(huge,'potions',1),huge);
});

test('finite direct settlement captures real relic, gear and materials without copying the world',()=>{
 const s=entered();expose(s);const before=clone(s);
 const effect=settlement(s,s=>{s.hero.gold+=8;s.equipment.materials.ore+=2;s.adventuring.loot.push({id:'loot-1',name:'Ashen Seal',value:20,source:'ruin',day:s.day});
  const g={id:'found_ab_1',baseId:'iron_sword',quality:'common',affix:'plain',tier:2,source:'ruin',day:s.day};s.equipment.instances.push(g);s.equipment.owned.push(g.id);});
 assert.equal(effect.gold,8);assert.equal(effect.materials.ore,2);assert.equal(effect.gear[0].id,'found_ab_1');
 const t=expeditionVisitTotals(s.maze.expeditionVisit);assert.equal(t.gains.gold,8);assert.equal(t.gains.relics.length,1);assert.equal(t.gains.gear.length,1);assert.equal(t.gains.materials.ore,2);
 assert.deepEqual(s.world,before.world);assert.equal(validateExpeditionReceipts(s),true);
 const receipt=archive(s);assert.equal(receipt.end.explored-receipt.start.explored,1);assert.equal(receipt.end.steps-receipt.start.steps,1);
});

test('income outside the exact settlement boundary is never labelled recovered loot',()=>{
 const s=entered();expose(s);s.hero.gold+=100;s.day++;
 s.maze.expeditionVisit=addExpeditionDays(s.maze.expeditionVisit,'inside',1);
 settlement(s,s=>{s.hero.gold+=8;s.equipment.materials.ore++;});
 const r=archive(s),totals=expeditionVisitTotals(r);assert.equal(totals.gains.gold,8);assert.equal(totals.days,2);
 assert.equal(s.hero.gold,128);assert.equal(Object.hasOwn(r.start,'gold'),false);
});

test('no-op/full-pack settlement is omitted and replayed or mismatched sources do not double-credit',()=>{
 const s=entered();expose(s);const v=s.maze.expeditionVisit;
 settlement(s,()=>{});assert.equal(s.maze.expeditionVisit,v);
 const effect=settlement(s,s=>{s.equipment.materials.ore++;}),recorded=s.maze.expeditionVisit;
 assert.equal(recordExpeditionSettlement(recorded,s.maze,source(),s.day,effect),recorded);
 assert.equal(recordExpeditionSettlement(recorded,{...s.maze,seed:'different'},source('battle'),s.day,effect),recorded);
 assert.equal(recordExpeditionSettlement(recorded,s.maze,source('cache',99),s.day,effect),recorded);
 assert.equal(recordExpeditionSettlement(recorded,s.maze,source('signature',3,'cache','take'),s.day,effect),recorded);
 assert.equal(expeditionVisitTotals(recorded).gains.materials.ore,1);
});

test('post-attendance authored effect separates spent resources from gains and validates its source anchor',()=>{
 const s=entered(fixture(2));expose(s);
 settlement(s,s=>{s.equipment.materials.cloth--;s.flags.herbs+=2;s.adventuring.rations--;},source('authored',3,'cache','take'));
 const totals=expeditionVisitTotals(s.maze.expeditionVisit);assert.equal(totals.costs.materials.cloth,1);assert.equal(totals.costs.rations,1);assert.equal(totals.gains.herbs,2);assert.equal(validateExpeditionReceipts(s),true);
 const bad=clone(s);bad.maze.expeditionVisit.settlements[0].source.slotId='other';assert.equal(validateExpeditionReceipts(bad),false);
});

test('battle reward experience is exact input, not a level-dependent character difference',()=>{
 const s=entered();expose(s);const before=expeditionSettlementSnapshot(s);s.hero.gold+=12;
 const effect={...expeditionSettlementDelta(before,expeditionSettlementSnapshot(s)),experience:20};
 assert.equal(recordExpeditionSettlement(s.maze.expeditionVisit,s.maze,source('battle'),s.day,effect),s.maze.expeditionVisit,'base rewards cannot capture a partial battle packet');
 s.maze.expeditionVisit=recordExpeditionVictory(s.maze.expeditionVisit,s.maze,3,s.day,before,expeditionSettlementSnapshot(s),20);
 assert.equal(expeditionVisitTotals(s.maze.expeditionVisit).gains.experience,20);assert.equal(validateExpeditionReceipts(s),true);
});

test('retreat remains active across serialization; defeat receipt retains its real fees and recovery',()=>{
 let s=entered();s.maze.expeditionVisit=noteExpeditionRetreat(s.maze.expeditionVisit);s=JSON.parse(JSON.stringify(s));
 assert.equal(s.mazeBook.expeditionReceipts.length,0);assert.equal(validateExpeditionReceipts(s),true);
 s.maze.expeditionVisit=addExpeditionFee(s.maze.expeditionVisit,'recovery',4);s.hero.gold-=4;s.day+=3;
 s.maze.expeditionVisit=addExpeditionDays(s.maze.expeditionVisit,'recovery',3);
 const r=archive(s,'defeat');assert.equal(r.reason,'defeat');assert.equal(r.objective.complete,false);assert.equal(r.retreats,1);
 assert.equal(expeditionVisitTotals(r).costs.gold,4);assert.equal(expeditionVisitTotals(r).days,4);
 assert.equal(validateExpeditionReceipts(JSON.parse(JSON.stringify(s))),true);
});

test('re-entry uses a new visit ID and baseline while earlier receipt totals stay frozen',()=>{
 const s=entered();expose(s);const first=archive(s),firstCopy=clone(first);
 s.maze=clone(s.mazeBook.records[0]);s.maze.position=0;const entry=expeditionEntrySnapshot(s);s.day++;
 s.mazeBook.nextExpeditionVisit=3;s.maze.expeditionVisit=createExpeditionVisit(s,s.maze,2,{entry,entryDays:1});
 s.maze.visited.push(4);s.maze.cleared.push(4);s.maze.steps++;
 assert.equal(validateExpeditionReceipts(s),true);assert.deepEqual(s.mazeBook.expeditionReceipts[0],firstCopy);
 const second=archive(s);assert.equal(second.id,'maze-visit-2');assert.equal(second.start.explored,2);assert.equal(second.end.explored,3);assert.equal(first.end.explored,2);
});

test('completed v2 objective copies existing exact actor/day/method proof and grants nothing',()=>{
 const s=entered(fixture(2));s.maze.objective=true;s.maze.contentFacts.objectiveMethod='copy';s.maze.visited.push(4);s.maze.cleared.push(4);
 const id=expeditionRunIdentity(s.maze);s.mazeBook.contentReceipts=[{mazeId:id.mazeId,runId:id.mazeId,runSeed:id.runSeed,runGeneration:id.runGeneration,
  family:id.family,manifestVersion:1,sourceId:id.sourceId,locationId:id.locationId,method:'copy',actorId:'person-1',day:s.day}];
 const before=clone(s),proof=expeditionObjectiveSnapshot(s,s.maze);assert.equal(proof.completionActorId,'person-1');assert.equal(proof.method,'copy');assert.deepEqual(s,before);
 const r=archive(s);assert.equal(r.objective.complete,true);assert.equal(expeditionVisitTotals(r).gains.gold,0);
 const bad=clone(s);bad.mazeBook.contentReceipts[0].actorId='other';assert.equal(validateExpeditionReceipts(bad),false);
});

test('unfinished legacy objectives and proof metadata do not invent a completion method or date',()=>{
 const s=entered();s.maze.proofBattleId='battle-1';s.maze.proofCaptured=true;
 const proof=expeditionObjectiveSnapshot(s,s.maze);assert.equal(proof.complete,false);assert.equal(proof.battleId,'battle-1');assert.equal(proof.method,null);assert.equal(proof.completionDay,null);
 assert.equal(archive(s,'life_end').reason,'life_end');
});

test('historical receipts remain attributed to the ancestor and active ledgers cannot transfer to the heir',()=>{
 const s=entered(fixture(2)),active=clone(s),r=archive(s,'life_end');
 s.dynasty.history.push({personId:'person-1'});s.dynasty.activePersonId='person-2';s.dynasty.generation=2;s.hero.name='Birch';
 assert.equal(validateExpeditionReceipts(s),true);assert.equal(r.actorName,'Aster');assert.equal(r.actorGeneration,1);
 active.dynasty.history.push({personId:'person-1'});active.dynasty.activePersonId='person-2';active.dynasty.generation=2;
 assert.equal(validateExpeditionReceipts(active),false);
});

test('old saves and evicted physical records stay usable; retained identity collisions are rejected',()=>{
 const old=fixture();delete old.mazeBook.nextExpeditionVisit;delete old.mazeBook.expeditionReceipts;const before=clone(old);
 assert.equal(validateExpeditionReceipts(old),true);assert.deepEqual(old,before);
 const s=entered();archive(s);s.mazeBook.records=[];assert.equal(validateExpeditionReceipts(s),true);
 s.mazeBook.records=[{...clone(before.maze),seed:'wrong-same-numeric-id'}];assert.equal(validateExpeditionReceipts(s),false);
});

test('strict optional schema rejects malformed counters, sources, dates, IDs and archival active state',()=>{
 const s=entered();expose(s);settlement(s,s=>{s.equipment.materials.ore++;});
 for(const mutate of [
  x=>x.maze.expeditionVisit.extra=true,x=>x.maze.expeditionVisit.used.potions=-1,x=>x.maze.expeditionVisit.used.walkFocus=1.5,
  x=>x.maze.expeditionVisit.days.inside=1,x=>x.maze.expeditionVisit.start.explored=122,
  x=>x.maze.expeditionVisit.identity.runGeneration=2,x=>x.maze.expeditionVisit.actorId='missing-person',
  x=>x.maze.expeditionVisit.settlements.push(clone(x.maze.expeditionVisit.settlements[0])),
  x=>x.maze.expeditionVisit.settlements[0].day=12,x=>x.maze.expeditionVisit.settlements[0].effect.materials.ore=Number.MAX_SAFE_INTEGER+1,
  x=>x.maze.expeditionVisit.id='maze-visit-2',x=>x.mazeBook.records.push(clone(x.maze)),
 ]){const bad=clone(s);mutate(bad);assert.equal(validateExpeditionReceipts(bad),false,mutate.toString());}
 const saved=clone(s);archive(saved);
 for(const mutate of [x=>x.mazeBook.expeditionReceipts[0].reason='retreat',x=>x.mazeBook.expeditionReceipts[0].end.steps=-1,
  x=>x.mazeBook.expeditionReceipts[0].objective.method='made-up',x=>x.mazeBook.expeditionReceipts.push(clone(x.mazeBook.expeditionReceipts[0]))]){
  const bad=clone(saved);mutate(bad);assert.equal(validateExpeditionReceipts(bad),false,mutate.toString());}
});

test('receipt and settlement limits are explicit and no engine or world-sized dependency is imported',()=>{
 assert.equal(EXPEDITION_RECEIPT_LIMIT,80);assert.equal(EXPEDITION_SETTLEMENT_LIMIT,256);
 const code=readFileSync(new URL('../dist/js/maze-receipts.js',import.meta.url),'utf8');assert.doesNotMatch(code,/^import /m);
 const s=entered(),world={};world.self=world;s.world.locations[0].unrelated=world;
 assert.doesNotThrow(()=>expeditionEntrySnapshot(s));assert.doesNotThrow(()=>expeditionSettlementSnapshot(s));
 const saved=fixture();saved.maze=null;saved.mazeBook.nextExpeditionVisit=100;saved.mazeBook.expeditionReceipts=Array(81).fill({});assert.equal(validateExpeditionReceipts(saved),false);
});

test('one coalesced accepted victory records both base rewards and awardLoot, never competing captures',()=>{
 const s=entered();expose(s);const before=expeditionSettlementSnapshot(s),visit=s.maze.expeditionVisit;
 s.hero.gold+=18; // Existing resolveBattle reward.
 s.adventuring.loot.push({id:'victory-relic',name:'Moon-worn Seal',value:33});s.equipment.materials.ore+=2; // Existing afterMazeBattle awardLoot.
 const after=expeditionSettlementSnapshot(s);
 const result=recordExpeditionVictory(visit,s.maze,3,s.day,before,after,24),t=expeditionVisitTotals(result);
 assert.equal(result.settlements.length,1);assert.equal(t.gains.gold,18);assert.equal(t.gains.experience,24);assert.equal(t.gains.relics[0].id,'victory-relic');assert.equal(t.gains.materials.ore,2);
 assert.equal(recordExpeditionVictory(result,s.maze,3,s.day,before,after,24),result,'replayed complete capture is idempotent');
 const partial=recordExpeditionVictory(visit,s.maze,3,s.day,before,{...before,gold:before.gold+18},24);
 const conflict=recordExpeditionVictory(partial,s.maze,3,s.day,before,after,24);
 assert.equal(conflict.settlementsIncomplete,true,'incorrect split captures cannot silently claim a complete receipt');assert.equal(expeditionVisitTotals(conflict).settlementsComplete,false);
});

test('two guardian effects at the same signature slot/action retain separate subject identities',()=>{
 const s=fixture(2);s.maze.kind='regional';s.maze.sourceId='signature_rainward';s.maze.seed=`${s.seed}:maze:1:regional:${s.maze.sourceId}:ruin:1`;
 s.maze.content.family='signature';s.maze.content.definition={bosses:[{id:'guardian-a'},{id:'guardian-b'}]};entered(s);expose(s);
 for(const subjectId of ['guardian-a','guardian-b'])settlement(s,s=>{s.flags.herbs++;},{kind:'signature',cellId:3,slotId:'cache',actionId:'lead_survey',subjectId});
 assert.equal(s.maze.expeditionVisit.settlements.length,2);assert.equal(expeditionVisitTotals(s.maze.expeditionVisit).gains.herbs,2);assert.equal(validateExpeditionReceipts(s),true);
 const wrong=clone(s);wrong.maze.expeditionVisit.settlements[1].source.subjectId='missing-guardian';assert.equal(validateExpeditionReceipts(wrong),false);
});

test('supported finite source capacity is conservative and overflow is bounded and explicitly incomplete',()=>{
 assert.equal(EXPEDITION_SETTLEMENT_LIMIT,256);assert.ok(EXPEDITION_SETTLEMENT_LIMIT>=121+8);
 const s=entered(fixture(2));expose(s);const visit=s.maze.expeditionVisit;
 const empty=expeditionSettlementDelta(expeditionSettlementSnapshot(s),expeditionSettlementSnapshot(s)),effect={...empty,gold:1};
 // Synthetic future content at the storage ceiling tests degradation, not a
 // currently valid ID19 visit: its finite source maximum is at most 129.
 visit.settlements=Array.from({length:EXPEDITION_SETTLEMENT_LIMIT},(_,i)=>({source:source('authored',3,'cache','future-'+i),day:s.day,effect:clone(effect)}));
 const next=source('authored',3,'cache','future-overflow');s.maze.contentOutcomes.push({slotId:'cache',actionId:'future-overflow',day:s.day,actorId:'person-1'});
 const result=recordExpeditionSettlement(visit,s.maze,next,s.day,effect);
 assert.notEqual(result,visit);assert.equal(result.settlements.length,EXPEDITION_SETTLEMENT_LIMIT);assert.equal(result.settlementsIncomplete,true);
 assert.equal(expeditionVisitTotals(result).settlementsComplete,false);assert.equal(recordExpeditionSettlement(result,s.maze,next,s.day,effect).settlements.length,EXPEDITION_SETTLEMENT_LIMIT);
});

function completedStory(){
 const s=entered(fixture(2));s.maze.objective=true;s.maze.contentFacts.objectiveMethod='copy';s.maze.content.goalSlotId='goal';s.maze.visited.push(4);s.maze.cleared.push(4);
 s.maze.contentOutcomes.push({slotId:'goal',actionId:'finish',actorId:'person-1',day:s.day});
 const id=expeditionRunIdentity(s.maze);s.mazeBook.contentReceipts=[{mazeId:id.mazeId,runId:id.mazeId,runSeed:id.runSeed,runGeneration:id.runGeneration,
  family:id.family,manifestVersion:1,sourceId:id.sourceId,locationId:id.locationId,method:'copy',actorId:'person-1',day:s.day}];archive(s);return s;
}

test('historical completion survives both proof stores being absent without accepting retained conflicts',()=>{
 const s=completedStory();delete s.mazeBook.contentReceipts;
 assert.equal(validateExpeditionReceipts(s),true,'retained matching physical final outcome suffices');
 const conflictingPhysical=clone(s);conflictingPhysical.mazeBook.records[0].contentOutcomes[0].actorId='someone-else';assert.equal(validateExpeditionReceipts(conflictingPhysical),false);
 s.mazeBook.records=[];assert.equal(validateExpeditionReceipts(s),true,'frozen historical display receipt may outlive physical archive and proof list');
 const malformed=clone(s);malformed.mazeBook.expeditionReceipts[0].objective.method='made-up';assert.equal(validateExpeditionReceipts(malformed),false);
 for(const change of [r=>r.actorId='person-2',r=>r.day--,r=>r.method='public',r=>r.runSeed='other',r=>r.runGeneration=2]){
  const conflict=completedStory();conflict.mazeBook.records=[];change(conflict.mazeBook.contentReceipts[0]);assert.equal(validateExpeditionReceipts(conflict),false,change.toString());
 }
 const noNewProof=entered(fixture(2));noNewProof.maze.objective=true;noNewProof.maze.contentFacts.objectiveMethod='copy';assert.equal(finishExpeditionVisit(noNewProof.maze.expeditionVisit,noNewProof,noNewProof.maze,'stair'),null,'historical fallback cannot mint a new completed receipt');
});


test('actual ID19 frozen v1 fixture preserves exact actor, run identity and observed clock without inventing entry',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/maze-receipts/id19-legacy-active.json',import.meta.url),'utf8'));
 const helper=readFileSync(new URL('./fixtures/maze-receipts/id19-provenance-reference.mjs',import.meta.url));
 assert.equal(createHash('sha256').update(helper).digest('hex'),fixture.helperSha256,'canonical helper is frozen verbatim from ID19');
 const s=fixture.state,before=clone(s),m=s.maze;
 assert.deepEqual(expeditionRunIdentity(m),{mazeId:m.id,runSeed:m.seed,runGeneration:m.generation,mazeVersion:1,kind:m.kind,family:null,manifestVersion:null,sourceId:m.sourceId,locationId:m.locationId});
 const v=createExpeditionVisit(s,m,1,{coverage:'observed'});assert.ok(v);
 assert.equal(v.actorId,mazeActorId(s));assert.equal(validMazeActor(s,v.actorId),true);assert.equal(v.actorName,null,'absent fixture name stays unknown');
 assert.equal(v.start.day,s.day);assert.equal(v.days.entry,0);assert.equal(v.identity.runGeneration,m.generation);assert.equal(v.actorGeneration,s.dynasty.generation);
 assert.equal(v.start.day,m.startedDay);assert.deepEqual(s,before);
 // The canonical manifest helper is v2-only. Using it on legacy data would
 // invent or require fields that the real compatibility fixture never held.
 assert.throws(()=>mazeRunIdentity(m));
});

test('v1 historical run numbering is independent of the heir reset and same numeric IDs across generations coexist',()=>{
 const s=entered();const parentRun=clone(s.maze);delete parentRun.expeditionVisit;const parentReceipt=archive(s);
 s.dynasty.history=[{personId:'person-1'}];s.dynasty.generation=2;s.dynasty.activePersonId='person-2';s.hero.name='Birch';
 s.mazeBook.records=[];s.mazeBook.nextRun=1;
 assert.equal(validateExpeditionReceipts(s),true,'old closed maze-1 is valid when the all-v1 heir has nextRun1');
 s.maze={...parentRun,generation:2,seed:`${s.seed}:maze:2:authored:cistern:ruin:1`,visited:[0],cleared:[0],steps:0,startedDay:s.day+1};
 const entry=expeditionEntrySnapshot(s);s.day++;s.mazeBook.nextRun=2;s.mazeBook.nextExpeditionVisit=3;
 s.maze.expeditionVisit=createExpeditionVisit(s,s.maze,2,{entry,entryDays:1});assert.ok(s.maze.expeditionVisit);
 assert.equal(validateExpeditionReceipts(s),true,'heir maze-1/gen2 is not a collision with parent maze-1/gen1');
 assert.equal(s.mazeBook.expeditionReceipts[0].identity.runGeneration,1);assert.equal(parentReceipt.actorId,'person-1');
 const collision=clone(s);collision.mazeBook.records=[{...parentRun,seed:'same-generation-wrong-seed'}];assert.equal(validateExpeditionReceipts(collision),false,'same generation conflicting full identity is still rejected');
 const unknownNumber=clone(s);unknownNumber.maze.expeditionVisit.identity.mazeId='maze-2';assert.equal(validateExpeditionReceipts(unknownNumber),false,'active run number remains bounded by current nextRun');
});
