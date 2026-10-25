import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { mazeMovementForecast, mazeMovementDescription, isMazeEntry } from '../dist/js/maze-rules.js';
import { mazeExpeditionView } from '../dist/js/maze-expedition.js';
import { renderMazeExpedition } from '../dist/js/maze-ui-v31.js';
import { mazeActions, applyMazeAction, mazeLayout } from '../dist/js/maze-v31.js';
import { addCampingKit, mazeCampDescription } from '../dist/js/travel-energy.js';
import { adventureActions, refreshAdventureBoard } from '../dist/js/adventuring.js';
import { syncCartography } from '../dist/js/cartography.js';
import { isSettlement } from '../dist/js/world.js';
import { CONTRACT_FLAVOR } from '../dist/js/realm-content-v18.js';
import { adventurePage } from '../dist/js/rpg-ui.js';
import { mountApp } from './helpers/ui-surface.mjs';
import {contractDescent} from './helpers/one-rulebook.mjs';

// Controlled resource fixtures test existing rules, not earned-life difficulty.
function sample(steps=0,mp=10) {
 return { seed:'maze-resource-unit',day:10,phase:'adult',event:null,battle:null,
  hero:{name:'Traveller',hp:20,maxHp:60,mp,maxMp:30,potions:2,skills:{},attributes:{}},
  life:{stress:10},companions:[],adventuring:{rations:4},
  trail:{version:1,daysWithoutRest:0,daysTravelled:0,lastRestDay:10,kits:[],nextKit:1},
  maze:{seed:'maze-resource-layout',position:0,previous:0,visited:[0],cleared:[0],collected:[],steps,kind:'radiant',tier:1,objective:false},
 };
}
function context(s,spend) {
 const calls=[];return {calls,spendDays(n,options){calls.push({n,options});if(spend)return spend(n);s.day+=n;return n;}};
}
function firstMove(s){return mazeActions(s).find(a=>a.id.startsWith('maze_step_')&&!a.disabledReason);}
function companion(id,extra={}){return {id,name:id,recruited:true,active:true,hp:10,maxHp:58,mp:0,maxMp:22,...extra};}
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

for(const [steps,mp,days,until] of [[5,10,1,1],[2,0,1,1],[2,1,0,4],[0,1,0,3],[5,1,1,1],[4,0,0,2]]) {
 test(`step ${steps} with ${mp} Focus preserves pre-step cadence, quote and execution`,()=>{
  const s=sample(steps,mp),before=structuredClone(s),q=mazeMovementForecast(s),move=firstMove(s);
  assert.equal(q.days,days);assert.equal(q.stepsUntilDay,until);assert.equal(q.dayOnStep,steps+until);
  assert.equal(q.focusSpent,Math.min(1,mp));assert.equal(q.focusAfter,Math.max(0,mp-1));
  assert.equal(move.days,days);assert.ok(move.description.includes(mazeMovementDescription(q)));assert.deepEqual(s,before);
  const ctx=context(s);assert.equal(applyMazeAction(s,move.id,ctx),true);
  assert.equal(s.maze.steps,steps+1);assert.equal(s.maze.position,Number(move.id.slice(10)));assert.equal(s.hero.mp,q.focusAfter);
  assert.equal(s.day,before.day+days);assert.deepEqual(ctx.calls,days?[{n:1,options:{outdoors:false}}]:[]);
 });
}

test('the pure movement horizon reproduces the original formula without resetting steps at exhaustion',()=>{
 for(let steps=0;steps<18;steps++)for(let mp=0;mp<9;mp++){
  const s=sample(steps,mp),before=structuredClone(s),q=mazeMovementForecast(s);
  let count=0,focus=mp,at=steps,days=0;
  do{count++;at++;days=at%(focus<=0?3:6)===0?1:0;focus=Math.max(0,focus-1);}while(!days&&count<7);
  assert.equal(q.days,(steps+1)%(mp<=0?3:6)===0?1:0);assert.equal(q.stepsUntilDay,count);assert.deepEqual(s,before);
 }
 assert.equal(mazeMovementForecast({...sample(),maze:null}),null);
});

test('a zero-day calendar interruption spends no Focus and does not move, reveal or increment; retry pays once',()=>{
 const s=sample(5,1),before=structuredClone(s),move=firstMove(s),ctx=context(s,()=>0);
 assert.equal(applyMazeAction(s,move.id,ctx),true);assert.deepEqual(s,before);
 assert.deepEqual(mazeMovementForecast(s),mazeMovementForecast(before));
 assert.equal(applyMazeAction(s,move.id,context(s)),true);assert.equal(s.day,11);assert.equal(s.hero.mp,0);assert.equal(s.maze.steps,6);
});

test('retirement during a charged day does not execute the walk or spend its Focus',()=>{
 const s=sample(5,10),before=structuredClone(s),move=firstMove(s);
 assert.equal(applyMazeAction(s,move.id,context(s,n=>{s.day+=n;s.phase='retired';return n;})),true);
 assert.deepEqual(s.maze,before.maze);assert.equal(s.hero.mp,before.hero.mp);assert.equal(s.day,11);
});

test('the successful walk still charges against post-calendar Focus, matching the existing execution order',()=>{
 const s=sample(2,0),move=firstMove(s);
 applyMazeAction(s,move.id,context(s,n=>{s.day+=n;s.hero.mp=5;return n;}));
 assert.equal(s.maze.steps,3);assert.equal(s.hero.mp,4);
});

test('blocked, nonexistent and pending-moment moves never charge or reveal; the prior doorway remains legal',()=>{
 const s=sample(5,10),cell=mazeLayout(s.maze).cells.find(c=>['enemy','trap'].includes(c.kind)&&c.doors.length>1);
 assert.ok(cell);s.maze.position=cell.id;s.maze.previous=cell.doors[0];s.maze.visited.push(cell.id);
 const forward=cell.doors[1],before=structuredClone(s),ctx=context(s);
 assert.ok(mazeActions(s).find(a=>a.id==='maze_step_'+forward).disabledReason);
 assert.equal(applyMazeAction(s,'maze_step_'+forward,ctx),false);assert.deepEqual(s,before);assert.deepEqual(ctx.calls,[]);
 const wall=mazeLayout(s.maze).cells.find(c=>!cell.doors.includes(c.id));
 assert.equal(applyMazeAction(s,'maze_step_'+wall.id,ctx),false);assert.deepEqual(s,before);
 s.event={id:'pending'};const pending=structuredClone(s);assert.equal(applyMazeAction(s,'maze_step_'+s.maze.previous,ctx),false);assert.deepEqual(s,pending);
 s.event=null;assert.equal(applyMazeAction(s,'maze_step_'+s.maze.previous,ctx),true);assert.equal(s.maze.steps,6);assert.equal(s.hero.mp,9);
});

test('expedition view shows real carried reserves, exact capped camp quote, eligibility and usable pack nights without mutation',()=>{
 const s=sample();s.companions=[companion('Present'),companion('Downed',{hp:0}),companion('Away'),companion('Reserve',{active:false})];
 s.rpg={companionStages:{Away:{status:'away'}}};addCampingKit(s,'bedroll');addCampingKit(s,'tent');s.trail.kits.unshift({id:'used',kind:'bedroll',remaining:0});
 const before=structuredClone(s),v=mazeExpeditionView(s),markup=renderMazeExpedition(s,{e},mazeActions(s));
 assert.equal(v.kitNights,7);assert.equal(v.kit.name,'Traveller’s Bedroll');assert.equal(v.kit.remaining,2);
 assert.deepEqual(v.party.map(p=>[p.name,p.unavailable]),[['Traveller',null],['Present',null],['Downed','downed'],['Away','not present']]);
 assert.equal(v.campDescription,mazeCampDescription(s));assert.ok(v.campDescription.includes('Present: +8 Health, +13 Focus'));
 assert.ok(!v.campDescription.includes('Downed: +'));assert.ok(!v.campDescription.includes('Away: +'));assert.ok(!markup.includes('Reserve'));
 assert.ok(markup.includes('Health 0/58'));assert.ok(markup.includes('7 kit nights carried'));assert.ok(markup.includes('Stair exit:'));
 assert.equal(v.campAvailable,true);assert.equal(v.exitAvailable,true);assert.deepEqual(s,before);
 const another=structuredClone(s);another.maze.seed='unrelated-hidden-rooms';assert.deepEqual(mazeExpeditionView(another),v,'hidden topology and contents do not enter the resource model');
});

test('resource panel safely escapes names, marks missing reserves unavailable, and only quotes available actions as usable',()=>{
 const s=sample();s.hero.name='<script>unsafe</script>';s.companions=[companion('Missing')];delete s.companions[0].mp;
 s.event={id:'pending'};const before=structuredClone(s),v=mazeExpeditionView(s),markup=renderMazeExpedition(s,{e},[]);
 assert.equal(v.campAvailable,false);assert.equal(v.exitAvailable,false);assert.ok(markup.includes('Focus unavailable'));
 assert.ok(!markup.includes('<script>unsafe</script>'));assert.ok(markup.includes('&lt;script&gt;'));assert.deepEqual(s,before);
});

test('a maze begins by contract or a regional road, or resumes an authored maze already begun; nothing else is a maze entry',()=>{
 // v0.72.4: the board's descent is a delve, and an older record (a room-engine walk, a v0.27 descent) opens no maze.
 const s={mazeBook:{records:[{kind:'authored',sourceId:'watchtower'}]},flags:{dungeonRecords:{cistern:{complete:false}}},rpg:{expeditions:[{id:'old',locationId:'here'}]},locationId:'here',maze:null};
 assert.equal(isMazeEntry(s,'adventure_descend'),false);assert.equal(isMazeEntry(s,'adventure_pursue_contract'),true);
 assert.equal(isMazeEntry(s,'explore_enter_cistern'),false);assert.equal(isMazeEntry(s,'explore_enter_watchtower'),true);
 assert.equal(isMazeEntry(s,'rpg_enter_old'),true);assert.equal(isMazeEntry({...s,locationId:'elsewhere'},'rpg_enter_old'),true);
 assert.equal(isMazeEntry({...s,mazeBook:undefined},'adventure_pursue_contract'),false);assert.equal(isMazeEntry(s,'maze_fight'),false);
});

let base=await createLifeAtAge({seed:'maze-resource-rules',startAge:18,difficulty:'gentle'});
function drain(s){for(let n=0;s.event&&n<100;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['continue','keep','care','pause','leave','later','friends'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
base=drain(base);
function roundtrip(s){assert.ok(E.validateSave(s),s.notice);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);return s;}
// One rulebook (v0.72.3): a contract's descent is the native maze.
function delve(){const s=structuredClone(base);s.adventuring.rations=2;return roundtrip(E.chooseAction(s,contractDescent(s)));}
function contractBoard(){
 const s=structuredClone(base);s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)).id;
 s.cartography.pending=null;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);refreshAdventureBoard(s);
 assert.ok(s.adventuring.contracts.length);return s;
}

test('new maze entry text describes variable expedition lengths without a single-fight forecast; the peaceful contract route stays unchanged',()=>{
 const s=contractBoard(),before=structuredClone(s),page=adventurePage(s,E.getActions(s),{section:'delves'});
 assert.match(page,/short, medium and deep/);assert.match(page,/Every sixth total step/);assert.doesNotMatch(page,/Six floors of branching/);
 const c=s.adventuring.contracts[0],flavor=CONTRACT_FLAVOR.find(f=>f.type==='bounty'&&f.targetType==='bandit');
 Object.assign(c,{flavorId:flavor.id,type:flavor.type,targetType:flavor.targetType,status:'active',acceptedDay:s.day,destinationId:s.locationId});
 const rows=adventureActions(s),offer=rows.find(a=>a.id==='adventure_pursue_'+c.id);
 assert.match(offer.description,/saved maze, not a single encounter/);assert.doesNotMatch(offer.description,/A tier .* encounter/);
 const route=rows.find(a=>a.id==='adventure_resolve_'+c.id);assert.ok(route,'a known bandit contract has a peaceful field route');const legacy=structuredClone(s);delete legacy.mazeBook;delete legacy.delves;
 const legacyRows=adventureActions(legacy);assert.match(legacyRows.find(a=>a.id===offer.id).description,/encounter/);
 assert.deepEqual(legacyRows.find(a=>a.id===route?.id),route,'existing peaceful field quote is unchanged');
 assert.deepEqual(before.hero,s.hero);
});

test('the actual modern contract entry card omits the old single-encounter combat outlook',async t=>{
 const s=contractBoard(),c=s.adventuring.contracts[0];c.status='active';c.acceptedDay=s.day;c.destinationId=s.locationId;
 const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');await ui.click('place-area','gate');
 const card=ui.root.querySelector('[data-op="activity"][data-id="adventure_pursue_'+c.id+'"]');assert.ok(card);
 assert.equal(card.querySelector('[data-combat-offer]'),null);assert.ok(ui.root.innerHTML.includes('saved maze, not a single encounter'));
});

test('a completed movement day at a birthday moves exactly once, saves its new quote, and blocks repeated input',()=>{
 let s=delve();s.maze.steps=5;s.hero.mp=1;s.day=(s.timeline.birthDay||0)+(s.age+1)*365-1;
 s.health.lastPhysicalCheckDay=s.day;s.health.lastMentalCheckDay=s.day;s.health.lastAgeCheckYear=Math.floor(s.day/365);
 const before=structuredClone(s),move=firstMove(s),q=mazeMovementForecast(s);assert.equal(q.days,1);
 s=roundtrip(E.chooseAction(s,move.id));assert.equal(s.day,before.day+1);assert.equal(s.event?.id,'birth_adult_year');
 assert.equal(s.maze.steps,6);assert.equal(s.maze.position,Number(move.id.slice(10)));assert.equal(s.hero.mp,0);
 const repeated=E.chooseAction(s,move.id);assert.deepEqual(repeated.maze,s.maze);assert.equal(repeated.hero.mp,s.hero.mp);assert.equal(repeated.day,s.day);
 assert.equal(mazeMovementForecast(s).stepsUntilDay,3,'pending birthday is still at empty Focus');
 const paused=structuredClone(s.maze);s=roundtrip(drain(s));assert.deepEqual(s.maze,paused);
 // A birthday choice may legitimately replenish Focus. Re-quote that reserve
 // rather than persisting the pre-interruption horizon as a new movement rule.
 const resumed=mazeMovementForecast(s),next=firstMove(s),mp=s.hero.mp,day=s.day;
 assert.equal(next.days,resumed.days);s=roundtrip(E.chooseAction(s,next.id));
 assert.equal(s.hero.mp,Math.max(0,mp-1));assert.equal(s.day,day+resumed.days);assert.equal(s.maze.steps,7);
});

test('the actual UI updates the visible movement quote after one arrow-key move and preserves fog/resources on viewing',async t=>{
 const s=delve();s.maze.steps=2;s.hero.mp=1;const before=structuredClone(s),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');
 assert.match(ui.root.innerHTML,/Next walk:/);assert.match(ui.root.innerHTML,/1 Focus \(0 after walking\)/);assert.match(ui.root.innerHTML,/Next movement day in 4 walks/);
 assert.ok(ui.root.innerHTML.includes('aria-describedby="maze-controls maze-movement-cost"'));
 assert.equal((ui.root.innerHTML.match(/class="maze-cell /g)||[]).length,mazeLayout(s.maze).cells.length);assert.deepEqual(ui.current(),before);
 const to=mazeLayout(s.maze).cells[0].doors[0];ui.root.querySelector('.maze-grid').focus();await ui.key(to===1?'ArrowRight':'ArrowDown');
 assert.equal(ui.current().maze.position,to);assert.equal(ui.current().maze.steps,3);assert.equal(ui.current().hero.mp,0);assert.equal(ui.current().day,before.day);
 assert.match(ui.root.innerHTML,/0 Focus \(0 after walking\)/);assert.match(ui.root.innerHTML,/Next movement day in 3 walks/);
 roundtrip(ui.current());
});

// The older expedition engines and their pages left in v0.72.4 (tests/older-walks-v0724.test.js); their tests went with them.
