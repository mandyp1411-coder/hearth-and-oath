import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { closeMazeVisit } from '../dist/js/maze-receipt-runtime.js';
import { DUNGEONS, generateDungeonDefinition } from '../dist/js/exploration.js';
import { initializeGear } from '../dist/js/gear.js';
import { enterMaze, mazeActions, applyMazeAction, mazeLayout, mazeRoomCell, validMazeContext, afterMazeBattle, validateMazes } from '../dist/js/maze-v31.js';

// Controlled content fixtures isolate room/provenance behavior. They are not
// earned playthroughs, safe-route claims, or full engine migration tests.
const base=JSON.parse(readFileSync(new URL('./fixtures/maze-identity/v047-compatibility.json',import.meta.url))).baseState;
function prepared(source=DUNGEONS[0],layout=0){
  const s=structuredClone(base);s.seed=Array.from({length:100},(_,n)=>'authored-runtime-'+n).find(seed=>generateDungeonDefinition(seed,source.id).layout===layout);
  s.locationId=source.locationId;s.hero={...s.hero,name:'Content witness',path:'warrior',specialization:'guardian',level:3,hp:76,maxHp:76,mp:45,maxMp:45,gold:100,
    attributes:{strength:8,agility:6,vitality:6,intellect:5,willpower:5,presence:5},skills:{weapons:12,defense:12,arcana:12,devotion:12,stealth:12,survival:12,scholarship:12,persuasion:12}};
  s.companions=[];s.campaign={facts:{}};s.factions={villagers:0};s.rpg.project=null;s.adventuring.loot=[];s.flags.herbs=20;initializeGear(s);s.equipment.materials.ore=20;s.equipment.materials.cloth=20;
  assert.equal(enterMaze(s,source.id,'content-quest',context(s)),true);valid(s);return s;
}
function context(s,spend){return{spendDays(days){const actual=spend?spend(days):days;s.day+=actual;return actual;},journal(){},standing(id,n){s.factions[id]=(s.factions[id]||0)+n;},touchCampaign(){},witnesses(){return[];},startBattle(encounterId,context){s.battle={encounterId,context,instanceId:'content-battle-1'};}};}
function valid(s){assert.equal(validateMazes(s),true);assert.equal(s.dungeon,undefined);assert.equal(s.rpg.expedition,null);}
function at(s,slot){const cell=s.maze.content.anchors.find(row=>row.slotId===slot).cellId;s.maze.previous=mazeLayout(s.maze).cells[cell].doors[0];s.maze.position=cell;s.maze.visited=[...new Set([...s.maze.visited,cell])];return s;}
function choose(s,id,ctx=context(s)){assert.ok(mazeActions(s).some(row=>row.id===id&&!row.disabledReason),id);assert.equal(applyMazeAction(s,id,ctx),true);valid(s);}
function aid(s){const optional=s.maze.content.definition.rooms.filter(room=>room.optional);if(optional.some(room=>room.id==='service')){at(s,'service');choose(s,'maze_authored_repair_route');}
  else{at(s,'witness');choose(s,'maze_authored_hear_witness');choose(s,'maze_authored_protect_witness');}}

test('new authored entries retain canonical identities without an active legacy dungeon',()=>{
  for(const source of DUNGEONS){const s=prepared(source);assert.equal(s.maze.version,2);assert.deepEqual(s.maze.content.definition,generateDungeonDefinition(s.seed,source.id));assert.equal(mazeRoomCell(s.maze).kind,'entrance');assert.equal(s.maze.contentOutcomes.length,0);}
});

test('hearing, evidence, practical aid and supplies are separately recorded and finite',()=>{
  const s=prepared(),m=s.maze;at(s,'witness');const day=s.day,cloth=s.equipment.materials.cloth;
  choose(s,'maze_authored_hear_witness');assert.equal(s.day,day);assert.equal(m.cleared.includes(m.position),false);assert.equal(m.contentFacts.variantProof,undefined);
  choose(s,'maze_authored_record_witness');assert.equal(s.day,day+1);assert.equal(m.contentFacts.variantProof,true);assert.equal(m.contentFacts.variantAid,undefined);
  choose(s,'maze_authored_protect_witness');assert.equal(s.day,day+2);assert.equal(s.equipment.materials.cloth,cloth-1);assert.equal(m.contentFacts.variantAid,true);
  const before=structuredClone(s);assert.equal(applyMazeAction(s,'maze_authored_protect_witness',context(s)),false);assert.deepEqual(s,before);
  const cache=m.content.definition.rooms.find(room=>room.kind==='treasure');at(s,cache.id);const gold=s.hero.gold;choose(s,'maze_authored_take');assert.equal(s.hero.gold,gold+cache.loot.gold);assert.equal(m.contentFacts.proofSource,'witness');
  assert.equal(applyMazeAction(s,'maze_authored_take',context(s)),false);
});

test('an heir retains physical aid and route history, not personal witness permission or heard trust',()=>{
  const s=prepared(),m=s.maze;at(s,'witness');choose(s,'maze_authored_hear_witness');choose(s,'maze_authored_protect_witness');
  const guardian=m.content.requiredGuardians[0].slotId;at(s,guardian);choose(s,'maze_authored_listen');
  // This minimal actor-handoff fixture explicitly closes the parent visit;
  // the complete public retirement/succession path is covered by the engine file.
  assert.ok(closeMazeVisit(s,m,'life_end'));assert.equal(m.expeditionVisit,undefined);
  const ancestor=s.dynasty?.activePersonId||'hero';s.dynasty={...s.dynasty,generation:(s.dynasty?.generation||1)+1,activePersonId:'heir-test',history:[...(s.dynasty?.history||[]),{personId:ancestor}]};
  valid(s);let parley=mazeActions(s).find(row=>row.id==='maze_authored_parley');assert.ok(parley.disabledReason.includes('First hear'));assert.ok(parley.disabledReason.includes('Missing preserved account'));
  choose(s,'maze_authored_listen');parley=mazeActions(s).find(row=>row.id==='maze_authored_parley');assert.ok(parley.disabledReason.includes('Missing preserved account'));
  at(s,'witness');assert.ok(mazeActions(s).find(row=>row.id==='maze_authored_hear_witness'));const cloth=s.equipment.materials.cloth;choose(s,'maze_authored_hear_witness');choose(s,'maze_authored_record_witness');assert.equal(s.equipment.materials.cloth,cloth);
  assert.equal(mazeActions(s).some(row=>row.id==='maze_authored_protect_witness'),false);at(s,guardian);choose(s,'maze_authored_parley');
  assert.equal(m.contentOutcomes.filter(row=>row.actionId==='protect_witness').length,1);assert.equal(m.contentOutcomes.filter(row=>row.actionId==='record_witness').length,1);assert.equal(m.contentOutcomes.at(-1).actorId,'heir-test');
});

test('aid-only does not manufacture proof and completed formation remains a distinct path',()=>{
  const s=prepared(DUNGEONS[0],1);at(s,'service');choose(s,'maze_authored_aid_only');assert.equal(s.maze.contentFacts.variantAid,true);assert.equal(s.maze.contentFacts.variantProof,undefined);
  const boss=s.maze.content.definition.rooms.find(room=>room.kind==='boss');at(s,boss.id);choose(s,'maze_authored_listen');assert.ok(mazeActions(s).find(row=>row.id==='maze_authored_parley').disabledReason);
  s.hero.specialization='elementalist';s.fellowship={formations:{elementalist:{stage:'completed',completedDay:s.day-1,technique:'Grounding a living storm'}},companions:{}};
  const gold=s.hero.gold;choose(s,'maze_authored_parley');assert.equal(s.hero.gold,gold);assert.equal(s.battle,null);assert.equal(s.maze.contentFacts['formation_'+boss.id],'elementalist');
});

test('one-day work pauses without rewards, blocks other actions, and continues exactly once',()=>{
  const s=prepared();at(s,'service');const day=s.day,ore=s.equipment.materials.ore;
  choose(s,'maze_authored_repair_route',context(s,()=>0));assert.equal(s.day,day);assert.equal(s.equipment.materials.ore,ore);assert.equal(s.maze.contentOutcomes.length,0);assert.equal(s.rpg.project.kind,'maze');
  assert.deepEqual(mazeActions(s).map(row=>row.id),['maze_work_continue','maze_work_cancel']);
  assert.equal(applyMazeAction(s,'maze_exit',context(s)),false);assert.equal(applyMazeAction(s,'maze_camp',context(s)),false);
  const roundtrip=JSON.parse(JSON.stringify(s));valid(roundtrip);choose(roundtrip,'maze_work_continue');assert.equal(roundtrip.day,day+1);assert.equal(roundtrip.equipment.materials.ore,ore-1);assert.equal(roundtrip.rpg.project,null);assert.equal(roundtrip.maze.contentOutcomes.length,1);
  assert.equal(applyMazeAction(roundtrip,'maze_work_continue',context(roundtrip)),false);
});

test('withdrawn or newly unaffordable work preserves attendance but grants no aid',()=>{
  const s=prepared();at(s,'service');choose(s,'maze_authored_repair_route',context(s,()=>0));choose(s,'maze_work_cancel');assert.equal(s.maze.contentFacts.variantAid,undefined);assert.equal(s.rpg.project,null);
  choose(s,'maze_authored_repair_route',context(s,()=>0));s.equipment.materials.ore=0;choose(s,'maze_work_continue');assert.equal(s.maze.contentFacts.variantAid,undefined);assert.equal(s.maze.contentOutcomes.length,0);assert.equal(s.rpg.project,null);assert.equal(s.equipment.materials.ore,0);
});

test('all five guardians require actual heard proof aid and judgment before peaceful passage',()=>{
  for(const source of DUNGEONS){const s=prepared(source);aid(s);const boss=s.maze.content.definition.rooms.find(room=>room.kind==='boss');at(s,boss.id);
    assert.ok(mazeActions(s).find(row=>row.id==='maze_authored_parley').disabledReason);choose(s,'maze_authored_listen');const gold=s.hero.gold;choose(s,'maze_authored_parley');assert.equal(s.hero.gold,gold);assert.equal(s.battle,null);assert.equal(s.maze.contentFacts['peaceful_'+boss.id],true);}
});

test('objectives wait for their exact guardian, preserve consent and cannot repay after archive eviction',()=>{
  for(const source of DUNGEONS){const s=prepared(source,1),m=s.maze,goal=m.content.definition.rooms.find(room=>room.kind==='objective');at(s,goal.id);assert.ok(mazeActions(s).find(row=>row.id==='maze_authored_finish').disabledReason);
    aid(s);const boss=m.content.definition.rooms.find(room=>room.kind==='boss');at(s,boss.id);choose(s,'maze_authored_listen');choose(s,'maze_authored_parley');at(s,goal.id);
    const herbs=s.flags.herbs,standing=s.factions.villagers;choose(s,'maze_authored_finish_public');assert.equal(m.objective,true);assert.equal(m.contentFacts.publicWitnessNamed,false);assert.equal(s.factions.villagers,standing+2);assert.equal(s.campaign.facts['dungeon_content-quest'],true);assert.equal(s.flags.herbs,herbs+(goal.herbs||0));
    assert.equal(s.mazeBook.contentReceipts.length,1);choose(s,'maze_exit');s.mazeBook.records=[];const before=structuredClone(s);assert.equal(enterMaze(s,source.id,null,context(s)),true);assert.equal(s.maze,null);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.flags.herbs,before.flags.herbs);}
});

test('actual source encounters carry exact maze context and wrong identities cannot resolve',()=>{
  const s=prepared(),room=s.maze.content.definition.rooms.find(row=>row.kind==='fight');at(s,room.id);choose(s,'maze_fight');const pending=structuredClone(s.battle),m=s.maze;
  assert.equal(pending.encounterId,room.encounterId);assert.equal(pending.context.kind,'maze');assert.equal(pending.context.slotId,room.id);assert.equal(validMazeContext(s,pending.context,pending),true);
  for(const change of [c=>{c.slotId='wrong';},c=>{c.encounterId='forest';},c=>{c.sourceId='wrong';},c=>{c.roomId='0';},c=>{c.bossId='invented';}]){const bad=structuredClone(pending);change(bad.context);assert.equal(validMazeContext(s,bad.context,bad),false);assert.equal(afterMazeBattle(s,bad,'victory',context(s)),false);}
  s.battle=null;assert.equal(afterMazeBattle(s,pending,'victory',context(s)),true);valid(s);assert.ok(m.contentOutcomes.some(row=>row.actionId==='combat'&&row.slotId===room.id));
});

test('a retained completed run links its receipt to full identity and the actual final actor/day/method',()=>{
  const s=prepared(DUNGEONS[0],1);aid(s);const guardian=s.maze.content.requiredGuardians[0].slotId;at(s,guardian);choose(s,'maze_authored_listen');choose(s,'maze_authored_parley');at(s,s.maze.content.goalSlotId);choose(s,'maze_authored_finish_public');
  for(const mutate of [v=>{v.mazeBook.contentReceipts[0].day--;},v=>{v.mazeBook.contentReceipts[0].method='copy';},v=>{v.dynasty.generation=2;const row=v.mazeBook.contentReceipts[0];row.runGeneration=2;row.runSeed=`${v.seed}:maze:2:authored:${row.sourceId}:${row.locationId}:${row.runId.slice(5)}`;},v=>{v.dynasty.history=[{personId:'an-earlier-actor'}];v.mazeBook.contentReceipts[0].actorId='an-earlier-actor';}]){const bad=structuredClone(s);mutate(bad);assert.equal(validateMazes(bad),false);}
});

test('forged evidence, aid, cleared anchors, outcomes, work bindings and receipts are rejected',()=>{
  const original=prepared();
  for(const change of [s=>{s.maze.contentFacts.variantProof=true;},s=>{s.maze.contentFacts.variantAid=true;},s=>{s.maze.cleared.push(s.maze.content.anchors.find(row=>row.slotId==='witness').cellId);},s=>{s.maze.contentOutcomes.push(null);},s=>{s.mazeBook.contentReceipts=[null];}]){const bad=structuredClone(original);change(bad);assert.equal(validateMazes(bad),false);}
  at(original,'service');choose(original,'maze_authored_repair_route',context(original,()=>0));
  for(const change of [s=>{s.rpg.project.details.cellId=0;},s=>{s.rpg.project.details.slotId='witness';},s=>{s.rpg.project.details.sourceId='root_caverns';},s=>{s.rpg.project.choice='restore';},s=>{s.rpg.project.totalDays=3;}]){const bad=structuredClone(original);change(bad);assert.equal(validateMazes(bad),false);}
});

test('arriving at an anchored room never inherits its underlying empty-room auto-clear',()=>{
  const s=prepared(),m=s.maze,layout=mazeLayout(m),anchor=m.content.anchors.find(row=>row.slotId!=='entry'&&['empty','camp'].includes(layout.cells[row.cellId].kind));
  assert.ok(anchor);const from=layout.cells[anchor.cellId].doors[0];m.position=from;m.previous=anchor.cellId;m.visited=[...new Set([...m.visited,from])];
  assert.equal(applyMazeAction(s,'maze_step_'+anchor.cellId,context(s)),true);assert.equal(m.cleared.includes(anchor.cellId),false);valid(s);
});

test('bounded archive churn preserves unfinished version 2 story manifests',()=>{
  const s=prepared();choose(s,'maze_exit');const first=structuredClone(s.mazeBook.records[0]);
  for(let n=2;n<=80;n++){
    const row={...structuredClone(first),version:1,id:'maze-'+n,kind:'contract',sourceId:'old-contract-'+n,title:'An earlier contract',questId:null};
    delete row.content;delete row.contentFacts;delete row.contentOutcomes;
    row.seed=`${s.seed}:maze:1:contract:${row.sourceId}:${row.locationId}:${n}`;row.guardianRoom=mazeLayout(row).guardian;s.mazeBook.records.push(row);
  }
  s.mazeBook.nextRun=81;s.locationId='ruin';assert.equal(enterMaze(s,'buried_archive',null,context(s)),true);valid(s);choose(s,'maze_exit');
  assert.equal(s.mazeBook.records.length,80);assert.deepEqual(s.mazeBook.records.find(row=>row.id===first.id),first);
});
