import {syncCartography} from '../dist/js/cartography.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { createRadiantChart, radiantChoices, radiantRoom, radiantView, validateRadiant, applyRadiantChoice } from '../dist/js/radiant-descent.js';
import { renderRadiantPanel } from '../dist/js/radiant-ui.js';
import { spatialMoveOffer } from '../dist/js/area-scenes.js';
import { rpgView } from '../dist/js/rpg-depth-v27.js';
import { depthDungeonPanel } from '../dist/js/depth-ui-v27.js';
import { takeBattleAction } from '../dist/js/combat.js';
import { killNamedPerson } from '../dist/js/lineage.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled resources and trained skills isolate expedition rules. These
// fixtures are regressions, not new audited lives or human playtests.
let base=await createLifeAtAge({seed:'dungeon-focus-seven',startAge:18,difficulty:'gentle'});
function settle(s){for(let n=0;s.event&&s.event.id!=='adventure_room'&&n<60;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','later','keep','continue','pause','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
base=settle(base);assert.ok(E.validateSave(base));
// Retain the pre-maze radiant/signature contract; native maze entry is tested separately.
function fresh(){const s=structuredClone(base);delete s.mazeBook;delete s.maze;delete s.delves;s.hero.gold=10000;s.hero.hp=s.hero.maxHp=300;s.hero.mp=s.hero.maxMp=200;for(const k of Object.keys(s.hero.skills))s.hero.skills[k]=12;for(const k of Object.keys(s.hero.attributes))s.hero.attributes[k]=12;s.adventuring.rations=20;s.equipment.materials.ore=20;s.equipment.materials.cloth=20;return s;}
function enter(goal=null){let s=fresh();if(goal){const generation=s.dynasty.generation;for(let n=1;n<=100;n++)if(createRadiantChart(s.seed,`run-${generation}-${n}`,'ossuary').goal.id===goal){s.adventuring.runs=n-1;break;}}s=E.chooseAction(s,'adventure_descend');assert.ok(s.adventuring.expedition);s=E.migrateSave(s);if(goal)assert.equal(s.adventuring.expedition.chart.goal.id,goal);return s;}
function ready(s){s=settle(s);if(s.adventuring.expedition&&!s.event&&!s.battle)s=E.chooseAction(s,'adventure_continue');return s;}
function take(s,id){s=ready(s);const c=s.event?.choices.find(c=>c.id===id);assert.ok(c,`offered ${id}`);assert.ok(!c.disabledReason,c.disabledReason);return E.chooseEventOption(s,id);}
function roundtrip(s){assert.ok(E.validateSave(s),'valid life');const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}
function resolveRoom(s){s=ready(s);const x=s.adventuring.expedition;if(x.cleared.includes(`${x.floor}:${x.room}`))return s;const c=s.event.choices.find(c=>['study','open','repair','sneak'].includes(c.id)&&!c.disabledReason);assert.ok(c);return take(s,c.id);}
function path(x,target){const queue=[[x.room]],seen=new Set();while(queue.length){const row=queue.shift(),n=row.at(-1);if(n===target)return row;if(seen.has(n))continue;seen.add(n);for(const id of x.chart.floors[x.floor-1].rooms[n].neighbors)queue.push([...row,id]);}throw Error('connected route');}
function walk(s,target){for(let n=0;n<20;n++){if(s.adventuring.expedition.room===target)return ready(s);s=resolveRoom(s);const next=path(s.adventuring.expedition,target)[1];s=take(s,'route_'+next);}throw Error('route did not terminate');}
function floor(s,n){while(s.adventuring.expedition.floor<n){s=walk(s,5);s=take(s,'descend');}return s;}
function goalRoom(s){return walk(floor(s,s.adventuring.expedition.chart.goal.floor),4);}
function battleRoom(s){const room=s.adventuring.expedition.chart.floors[0].rooms.find(r=>r.kind==='battle');return walk(s,room.id);}

test('saved charts vary route and purpose while every floor has connected reversible branches',()=>{
 const layouts=new Set(),purposes=new Set();for(let n=0;n<40;n++){const chart=createRadiantChart('chart-qa',`run-1-${n}`,'roots');assert.deepEqual(chart,createRadiantChart('chart-qa',`run-1-${n}`,'roots'));purposes.add(chart.goal.id);layouts.add(JSON.stringify(chart.floors.map(f=>[f.variant,f.rooms.map(r=>r.kind)])));
  for(const f of chart.floors){const seen=new Set(),queue=[0];while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);queue.push(...f.rooms[id].neighbors);}assert.equal(seen.size,6);assert.ok(f.rooms.some(r=>r.neighbors.length>2));for(const r of f.rooms){assert.ok(r.neighbors.length<=3);for(const id of r.neighbors)assert.ok(f.rooms[id].neighbors.includes(r.id));}}
 }assert.equal(purposes.size,3);assert.ok(layouts.size>25);
});
test('entry reserves exactly one ration and one real day and reloads the same chart',()=>{
 const s=fresh(),day=s.day,food=s.adventuring.rations,next=E.chooseAction(s,'adventure_descend');assert.equal(next.day,day+1);assert.equal(next.adventuring.rations,food-1);assert.deepEqual(next.adventuring.expedition.routeState.provisionedFloors,[1]);const imported=E.migrateSave(next);assert.deepEqual(imported.adventuring,next.adventuring);roundtrip(imported);
});
test('doorways disclose different physical directions without revealing room contents',()=>{
 const s=enter(),x=s.adventuring.expedition,rows=s.event.choices.filter(c=>c.id.startsWith('route_'));assert.ok(rows.length);assert.equal(new Set(rows.map(c=>c.label)).size,rows.length);for(const c of rows){assert.match(c.label,/North|South|East|West/);assert.doesNotMatch(c.label,/coffer|occupied|tablet|water gate|guardian/i);}
 const before=structuredClone(s),v=radiantView(s),html=renderRadiantPanel(s,{e:String});assert.equal(v.rooms.length,1+radiantRoom(x).neighbors.length);assert.equal((html.match(/data-op="dungeon-select"/g)||[]).length,v.rooms.length);assert.match(html,/parchment-v22/);assert.deepEqual(s,before);
});
test('unresolved rooms allow backing away to known branches without paying or clearing them',()=>{
 let s=battleRoom(enter());const x=s.adventuring.expedition,key=`${x.floor}:${x.room}`,back=s.event.choices.find(c=>c.id.startsWith('route_'));assert.ok(back);const day=s.day,food=s.adventuring.rations;s=take(s,back.id);assert.equal(s.day,day);assert.equal(s.adventuring.rations,food);assert.ok(!s.adventuring.expedition.cleared.includes(key));roundtrip(s);
});
test('a new depth spends one ration while an ascent and a second descent do not',()=>{
 let s=walk(enter(),5),food=s.adventuring.rations,day=s.day;s=take(s,'descend');assert.equal(s.day,day+1);assert.equal(s.adventuring.rations,food-1);roundtrip(s);s=take(s,'ascend');assert.equal(s.adventuring.rations,food-1);assert.equal(s.adventuring.expedition.room,5);s=take(s,'descend');assert.equal(s.adventuring.rations,food-1);assert.deepEqual(s.adventuring.expedition.routeState.provisionedFloors,[1,2]);roundtrip(s);
});
test('no reserves blocks a new depth but never blocks a free return with earned loot',()=>{
 let s=walk(enter(),5);s.adventuring.rations=0;assert.match(radiantChoices(s,s.adventuring.expedition).find(c=>c.id==='descend').disabledReason,/Requires 1 ration/);const before=structuredClone(s);assert.equal(applyRadiantChoice(s,'descend',{},{}),false);assert.deepEqual(s,before);const day=s.day,gold=s.hero.gold,loot=structuredClone(s.adventuring.loot);s=take(s,'withdraw');assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.deepEqual(s.adventuring.loot,loot);assert.equal(s.adventuring.history.at(-1).objectiveGold,0);roundtrip(s);
});
test('a provisioned camp heals only living travelers and cannot pay twice at one room',()=>{
 let s=enter();s.hero.hp-=20;s.hero.mp-=10;const dead=s.companions[0];assert.ok(killNamedPerson(s,dead.id,'Controlled camp regression',{journal(){}}));dead.hp=0;s.event=null;s=ready(s);const food=s.adventuring.rations,hp=s.hero.hp,mp=s.hero.mp,day=s.day;s=take(s,'camp');assert.equal(s.hero.hp,hp+8);assert.equal(s.hero.mp,mp+5);assert.equal(s.companions[0].hp,0);assert.equal(s.adventuring.rations,food-1);assert.equal(s.day,day+1);assert.ok(!radiantChoices(s,s.adventuring.expedition).some(c=>c.id==='camp'));roundtrip(s);
});
for(const id of ['recover','survey','repair'])test(`${id} objective needs its actual work and pays the stated return reward once`,()=>{
 let s=enter(id);s=goalRoom(s);const g=s.adventuring.expedition.chart.goal;assert.equal(s.adventuring.expedition.routeState.objectiveProof,null);assert.ok(!s.event.choices.some(c=>c.id==='record'));s=resolveRoom(s);if(id==='survey')assert.ok(s.adventuring.expedition.routeState.landmarks.length>=2);s=take(s,'record');assert.equal(s.adventuring.expedition.routeState.objectiveProof.method,id);roundtrip(s);assert.ok(!s.event.choices.some(c=>c.id==='record'));const gold=s.hero.gold,day=s.day,loot=structuredClone(s.adventuring.loot),relic=s.adventuring.expedition.localStory.relic,totalXp=v=>v.hero.exp+45*v.hero.level*(v.hero.level-1)/2,xp=totalXp(s);s=take(s,'withdraw');assert.equal(totalXp(s),xp+g.exp);assert.equal(s.hero.gold,gold+g.gold);assert.equal(s.day,day);assert.deepEqual(s.adventuring.loot,loot);assert.equal(s.adventuring.history.at(-1).objectiveExp,g.exp);assert.equal(s.adventuring.history.at(-1).objectiveCompleted,true);const again=E.chooseAction(s,'adventure_withdraw');assert.equal(again.hero.gold,s.hero.gold);assert.equal(again.adventuring.history.length,s.adventuring.history.length);roundtrip(s);
 if(id==='recover')assert.ok(s.adventuring.loot.some(l=>l.name===relic));
});
test('rushing the objective gate earns no repair proof and the real repair remains available',()=>{
 let s=goalRoom(enter('repair'));const ore=s.equipment.materials.ore,cloth=s.equipment.materials.cloth;s=take(s,'rush');assert.match(s.event.choices.find(c=>c.id==='record').disabledReason,/Repair this water gate/);assert.equal(s.equipment.materials.ore,ore);assert.equal(s.equipment.materials.cloth,cloth);s=take(s,'repair');assert.equal(s.equipment.materials.ore,ore-1);assert.equal(s.equipment.materials.cloth,cloth-1);s=take(s,'record');assert.ok(s.adventuring.expedition.routeState.objectiveProof);roundtrip(s);
});
test('leaving the recovery cache grants nothing and permits returning to the unopened object',()=>{
 let s=goalRoom(enter('recover'));const loot=s.adventuring.loot.length;s=take(s,'leave');assert.equal(s.adventuring.loot.length,loot);assert.match(s.event.choices.find(c=>c.id==='record').disabledReason,/Recover this chamber/);s=take(s,'open');assert.equal(s.adventuring.loot.length,loot+1);assert.equal(s.adventuring.loot.at(-1).name,s.adventuring.expedition.localStory.relic);roundtrip(s);
});
test('revisiting a recovered cache cannot duplicate relics, materials or equipment',()=>{
 let s=goalRoom(enter('recover'));s=take(s,'open');const loot=structuredClone(s.adventuring.loot),gear=structuredClone(s.equipment),day=s.day,x=s.adventuring.expedition,back=s.event.choices.find(c=>c.id.startsWith('route_')&&x.routeState.visited.includes(`${x.floor}:${c.id.slice(6)}`));s=take(s,back.id);s=walk(s,4);assert.equal(s.day,day);assert.ok(!s.event.choices.some(c=>c.id==='open'));assert.deepEqual(s.adventuring.loot,loot);assert.deepEqual(s.equipment,gear);roundtrip(s);
});
test('full relic inventory cannot manufacture recovery proof or consume the unopened coffer',()=>{
 let s=goalRoom(enter('recover'));s.adventuring.loot=Array.from({length:160},(_,n)=>({id:'full-'+n,name:'Existing relic',value:1,stolen:false,source:s.locationId,day:s.day}));const before=structuredClone(s);assert.match(radiantChoices(s,s.adventuring.expedition).find(c=>c.id==='open').disabledReason,/full/);assert.equal(applyRadiantChoice(s,'open',{},{}),false);assert.deepEqual(s,before);roundtrip(s);
});
test('stealth and field agreement requirements quote actual numbers and missing local work',()=>{
 let s=battleRoom(enter());s.hero.skills.stealth=0;s.hero.attributes.agility=2;let rows=radiantChoices(s,s.adventuring.expedition),stealth=rows.find(c=>c.id==='sneak'),talk=rows.find(c=>c.id==='parley');assert.match(stealth.description,/Stealth 0 \+ half agility 1 = 1; needs 8/);assert.match(stealth.disabledReason,/7 more/);assert.match(talk.description,/needs 9/);assert.match(talk.disabledReason,/landmark|crossing/);const before=structuredClone(s);assert.equal(applyRadiantChoice(s,'parley',{},{}),false);assert.deepEqual(s,before);
 s=walk(enter(),3);s=take(s,'study');s=battleRoom(s);rows=radiantChoices(s,s.adventuring.expedition);talk=rows.find(c=>c.id==='parley');assert.ok(!talk.disabledReason);s.adventuring.rations=0;assert.match(radiantChoices(s,s.adventuring.expedition).find(c=>c.id==='parley').disabledReason,/ration/);roundtrip(s);
});
test('actual landmark work and one ration earn peaceful passage without combat spoils',()=>{
 let s=walk(enter(),3);s=take(s,'study');s=battleRoom(s);const before=structuredClone(s),day=s.day;s=take(s,'parley');assert.equal(s.day,day+1);assert.equal(s.adventuring.rations,before.adventuring.rations-1);assert.deepEqual(s.adventuring.loot,before.adventuring.loot);assert.equal(s.battle,null);assert.equal(s.adventuring.expedition.routeState.parleys.length,1);assert.ok(!s.event.choices.some(c=>c.id==='parley'));roundtrip(s);
});
test('material repairs disclose shortages and disabled attempts spend no time or supplies',()=>{
 let s=goalRoom(enter('repair'));s.equipment.materials.ore=0;s.equipment.materials.cloth=0;const c=radiantChoices(s,s.adventuring.expedition).find(c=>c.id==='repair');assert.match(c.disabledReason,/ore 1 \(have 0\).*cloth 1 \(have 0\)/);const before=structuredClone(s);assert.equal(applyRadiantChoice(s,'repair',{},{}),false);assert.deepEqual(s,before);roundtrip(s);
});
test('zero-day calendar interruption reserves no food, repair or loot',()=>{
 for(const action of ['camp','repair','open']){let s=action==='camp'?enter():goalRoom(enter(action==='repair'?'repair':'recover'));if(action==='camp')s.hero.hp-=20;const before=structuredClone(s),ctx={spendDays:()=>0};assert.equal(applyRadiantChoice(s,action,ctx,{awardLoot:()=>assert.fail('no loot'),endRun:()=>assert.fail('no exit')}),true);assert.equal(s.day,before.day);assert.deepEqual(s.equipment,before.equipment);assert.deepEqual(s.adventuring,before.adventuring);}
});
test('a completed room day reaching a birthday preserves its work and opens the birthday first',()=>{
 let s=walk(enter(),3);const year=Math.floor((s.day-(s.timeline.birthDay||0))/365)+1;s.day=(s.timeline.birthDay||0)+year*365-1;s.age=year-1;for(const p of s.companions)p.age=p.baseAge+year-1;const before=s.day;s=take(s,'study');assert.equal(s.day,before+1);assert.equal(s.adventuring.expedition.routeState.landmarks.length,1);assert.match(s.event.id,/^birth_/);const chart=structuredClone(s.adventuring.expedition.chart);s=ready(s);assert.deepEqual(s.adventuring.expedition.chart,chart);assert.ok(!s.event.choices.some(c=>c.id==='study'));roundtrip(s);
});
test('resolved room callbacks keep a pending calendar need ahead of the next dungeon prompt',()=>{
 let s=walk(enter(),3),events=0;const ctx={spendDays:()=>{s.day++;return 1;},pendingNeed:()=>true,setEvent:()=>events++,journalLiteral:()=>{}};applyRadiantChoice(s,'study',ctx,{awardLoot:()=>{},endRun:()=>{}});assert.equal(events,0);assert.ok(s.adventuring.expedition.routeState.landmarks.length===1);
});
test('victory resolves the captured chamber once without auto-advancing or duplicating loot',()=>{
 let s=battleRoom(enter());const room=s.adventuring.expedition.room;s=take(s,'fight');assert.ok(s.battle);roundtrip(s);let b=s.battle;for(let n=0;n<200&&!b.outcome;n++)b=takeBattleAction(b,'attack',b.actors.find(a=>a.side==='enemy'&&a.hp>0)?.id);assert.equal(b.outcome,'victory');s=E.resolveBattle(s,b);assert.equal(s.adventuring.expedition.room,room);assert.ok(s.adventuring.expedition.cleared.includes(`1:${room}`));assert.ok(s.adventuring.loot.length);const again=E.resolveBattle(s,b);assert.deepEqual(again.adventuring,s.adventuring);roundtrip(s);
});
test('actual combat retreat ends the run without objective payment or new spoils',()=>{
 let s=battleRoom(enter());s=take(s,'fight');let b=s.battle;for(let n=0;n<60&&!b.outcome;n++)b=takeBattleAction(b,'retreat');assert.equal(b.outcome,'retreat');const loot=structuredClone(s.adventuring.loot);s=E.resolveBattle(s,b);assert.equal(s.adventuring.expedition,null);assert.deepEqual(s.adventuring.loot,loot);assert.equal(s.adventuring.history.at(-1).objectiveCompleted,false);assert.equal(s.adventuring.history.at(-1).objectiveGold,0);roundtrip(s);
});
test('ongoing unversioned descents retain their original pending words and linear rooms',()=>{
 let s=enter();for(const k of ['layoutVersion','chart','routeState'])delete s.adventuring.expedition[k];s.adventuring.expedition.cleared=[];s.adventuring.expedition.pendingKind=null;s.event=null;s=E.chooseAction(s,'adventure_continue');const event=structuredClone(s.event),x=structuredClone(s.adventuring.expedition);s=roundtrip(s);assert.deepEqual(s.event,event);assert.deepEqual(s.adventuring.expedition,x);assert.ok(!renderRadiantPanel(s,{e:String}));const day=s.day,food=s.adventuring.rations;s=take(s,'withdraw');assert.equal(s.day,day);assert.equal(s.adventuring.rations,food);assert.equal(s.adventuring.history.at(-1).layoutVersion,undefined);roundtrip(s);
});
test('unversioned stair saves retain their original one-day descent without a new ration charge',()=>{
 let s=enter();const x=s.adventuring.expedition;for(const k of ['layoutVersion','chart','routeState'])delete x[k];x.room=5;x.cleared=['1:0','1:1','1:2','1:3','1:4'];x.pendingKind=null;s.adventuring.rations=0;s.event=null;s=ready(s);roundtrip(s);const day=s.day;s=take(s,'descend');assert.equal(s.day,day+1);assert.equal(s.adventuring.expedition.floor,2);assert.equal(s.adventuring.expedition.room,0);assert.equal(s.adventuring.rations,0);assert.equal(s.adventuring.expedition.layoutVersion,undefined);roundtrip(s);
});
for(const corruption of ['edge','purpose','proof','provisions','duplicate'])test(`saved expedition rejects malformed ${corruption} without changing a valid original`,()=>{
 const original=enter(),s=structuredClone(original),x=s.adventuring.expedition;if(corruption==='edge')x.chart.floors[0].rooms[0].neighbors.push(5);if(corruption==='purpose')x.chart.goal.gold=9999;if(corruption==='proof')x.routeState.objectiveProof={day:s.day,roomKey:`${x.chart.goal.floor}:4`,method:x.chart.goal.id};if(corruption==='provisions')x.routeState.provisionsUsed++;if(corruption==='duplicate')x.routeState.visited.push('1:0');assert.equal(E.validateSave(s),false);roundtrip(original);
});
test('every legitimate resolved/unresolved choice set fits the saved event limit',()=>{
 for(const goal of ['recover','survey','repair']){let s=enter(goal);for(let f=1;f<=6;f++){s=floor(s,f);for(let room=0;room<6;room++){s=walk(s,room);assert.ok(radiantChoices(s,s.adventuring.expedition).length<=8);s=resolveRoom(s);assert.ok(radiantChoices(s,s.adventuring.expedition).length<=8);assert.ok(validateRadiant(s,s.adventuring.expedition));}}roundtrip(s);}
});
test('production chart supports keyboard inspection and explicit or double-click movement through actual offered choices',async t=>{
 const s=enter(),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');const first=s.event.choices.find(c=>c.id.startsWith('route_')),id='radiant_'+first.id.slice(6),node=ui.root.querySelector(`[data-op="dungeon-select"][data-id="${id}"]`);assert.ok(node);assert.deepEqual(spatialMoveOffer(s,'dungeon',id,E.getActions(s)),{op:'choice',id:first.id});assert.equal(spatialMoveOffer(s,'dungeon','radiant_5',E.getActions(s)),null);await ui.fire('click',node);ui.flushSpatialClicks();assert.equal(ui.current().adventuring.expedition.room,0);assert.ok(ui.root.querySelector('.dungeon-door-inspection #spatial-selection-title'));const day=s.day;await ui.fire('dblclick',ui.root.querySelector(`[data-op="dungeon-select"][data-id="${id}"]`));assert.equal(ui.current().adventuring.expedition.room,Number(first.id.slice(6)));assert.equal(ui.current().day,day);const back=ui.root.querySelector('[data-op="dungeon-select"][data-id="radiant_0"]');await ui.fire('keydown',back,{key:'Enter'});assert.equal(ui.current().adventuring.expedition.room,Number(first.id.slice(6)));await ui.click('spatial-move','dungeon:radiant_0');assert.equal(ui.current().adventuring.expedition.room,0);assert.equal(ui.current().day,day);roundtrip(ui.current());
});
test('signature dungeon unknown exits use physical cues while utility notes state missing work',()=>{
 let s=fresh();s.locationId='home';syncCartography(s);let a=E.getActions(s).find(a=>a.id.startsWith('rpg_enter_')&&!a.disabledReason);assert.ok(a);s=E.chooseAction(s,a.id);const before=structuredClone(s),v=rpgView(s),x=s.rpg.expedition,current=x.rooms.find(r=>r.id===x.roomId);const exits=v.actions.filter(a=>a.id.startsWith('rpg_move_'));assert.ok(exits.length);for(const a of exits)assert.match(a.label,/North|South|East|West/);const html=depthDungeonPanel(s,{e:String,actionCards:()=>''});assert.match(html,/North|South|East|West/);assert.deepEqual(s,before);for(const r of x.rooms.filter(r=>['hazard','guardian'].includes(r.type)&&!r.bossId)){x.roomId=r.id;r.visited=true;const rows=rpgView(s).actions;if(r.type==='hazard'){assert.match(rows.find(a=>a.id==='rpg_room_survey').description,/Survival 12\/4/);assert.match(rows.find(a=>a.id==='rpg_room_repair').description,/ore 1 \(have 20\)/);}else{const talk=rows.find(a=>a.id==='rpg_room_parley_0');assert.match(talk.description,/persuasion 12\/6/);assert.match(talk.description,/side ledger missing/);assert.match(talk.disabledReason,/ledger/);}}x.roomId=current.id;
});
