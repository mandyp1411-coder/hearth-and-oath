// Bounded resource experiment, not a population win-rate or dungeon balance test.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { LifeRun, engine as E, ordinaryChoice } from './playtest-utils.mjs';
import { serviceWalkPath } from '../dist/js/world-services.js';
import { classView } from '../dist/js/classes.js';
import { atService } from '../tests/helpers/service-visit.mjs';
const { createBattle, getBattleActions, takeBattleAction, previewBattleAction } = await import(process.env.SECOND_WIND_COMBAT_MODULE || '../dist/js/combat.js');
const dir='artifacts/balance-second-wind';mkdirSync(dir,{recursive:true});
const policy=(event)=>ordinaryChoice(event)||['accept','listen','care','support','quiet','record','honest','pause','later','decline','rest','wait','leave','remember','share'].find(id=>event.choices.some(c=>c.id===id&&!c.disabledReason))||event.choices.find(c=>!c.disabledReason)?.id;
const name=process.argv[2]||'candidate';
assert.ok(['earn','verify-save','baseline','candidate'].includes(name),'Use earn, verify-save, baseline or candidate.');
const assertSave=s=>assert.ok(E.validateSave(JSON.parse(JSON.stringify(s))),'valid earned save');
function act(run,id){run.settle();run.step('visit-service:'+id,s=>atService(s,id));run.act(id).settle();while(run.state.rpg.project)run.act('rpg_continue').settle();return run;}
function move(run,id){run.settle();if(run.state.locationId===id)return;for(const room of serviceWalkPath(run.state,'gate')||[])run.act('atlas_room_'+room);run.step('travel:'+id,s=>E.travelTo(s,id));for(let i=0;i<500;i++){run.settle();if(!run.state.timeline.journey){if(run.state.locationId!==id){writeFileSync(`${dir}/move-error.json`,JSON.stringify({id,state:run.state,log:run.log},null,2));throw Error(`Travel to ${id}: ${run.state.notice}`);}return;}if(run.state.hero.mp<run.state.hero.maxMp*.25&&run.available('trail_camp'))run.act('trail_camp');else run.step('continue-road',E.continueJourney);}throw Error('Travel did not settle');}
function learn(run,id){move(run,classView(run.state).callings.find(c=>c.id===id).locationId);act(run,'calling_meet_'+id);for(let i=0;i<40&&classView(run.state).callings.find(c=>c.id===id).requirements.some(r=>!r.met);i++)act(run,'calling_train_'+id);act(run,'calling_seek_'+id);assert.equal(run.state.hero.specialization,id);}
if(name==='earn'){
 for(const [index,traits] of [['compassionate','curious','brave'],['patient','diligent','honest'],['cautious','stoic','content']].entries()){
  const config={seed:'balance-earned-bard-'+String.fromCharCode(97+index),name:'Earned Bard '+index,startAge:18,difficulty:'balanced',personalityTraits:traits};
  const run=new LifeRun('balance-earned-'+index,config,policy);const cache=`${dir}/start-${index}.json`;run.state=existsSync(cache)?JSON.parse(readFileSync(cache)):await createLifeAtAge(config);if(!existsSync(cache))writeFileSync(cache,JSON.stringify(run.state));run.settle();const start=structuredClone(run.state);
  move(run,'city');for(let i=0;i<2;i++)act(run,'work');learn(run,'bard');
  while(run.state.hero.gold<20)act(run,'work');
  while(run.state.hero.skills.persuasion<8)act(run,'rpg_practice_second_wind');
  act(run,'rpg_train_second_wind');assert.ok(run.state.rpg.trainedTechniques.includes('second_wind'));
  // Ordinary recovery spends actual days, never injecting a resource refill.
  if(run.state.hero.hp<run.state.hero.maxHp||run.state.hero.mp<run.state.hero.maxMp){move(run,'city');act(run,'rest');}
  const solo=structuredClone(run.state);assertSave(solo);
  move(run,'city');for(const id of ['mira','orrin','kest']){run.step('recruit:'+id,s=>E.recruitCompanion(s,id));assert.ok(run.state.companions.find(c=>c.id===id).active);}
  const party=structuredClone(run.state);assertSave(party);
  // Retained techniques may be used under another genuinely earned calling.
  learn(run,'guardian');const cross=structuredClone(run.state);assertSave(cross);
  const proof={config,start:{day:start.day,gold:start.hero.gold,hp:start.hero.hp,mp:start.hero.mp,skills:start.hero.skills,traits:start.hero.personality?.traits,attributes:start.hero.attributes},setup:{day:solo.day,days:solo.day-start.day,gold:solo.hero.gold,goldDelta:solo.hero.gold-start.hero.gold,level:solo.hero.level,training:run.log.filter(x=>/calling_|rpg_practice|rpg_train|rpg_continue|work|rest/.test(x.operation)),soloHero:solo.hero},states:{solo,party,cross},log:run.log};
  writeFileSync(`${dir}/earned-${index}.json`,JSON.stringify(proof,null,2)+'\n');console.log('earned',index,JSON.stringify({days:proof.setup.days,gold:solo.hero.gold,level:solo.hero.level,hp:solo.hero.hp,mp:solo.hero.mp,traits:solo.hero.personality?.traits}));
 }
 process.exit(0);
}
if(name==='verify-save'){
 const earned=JSON.parse(readFileSync(`${dir}/earned-0.json`));
 const run=new LifeRun('second-wind-save',{},policy);run.state=earned.states.solo;
 move(run,'forest');run.act('forest_expedition');assert.ok(run.state.battle);
 const startingMP=run.state.battle.actors.find(a=>a.id==='hero').mp;let casts=0;
 while(!run.state.battle.outcome&&getBattleActions(run.state.battle).some(a=>a.id==='tech_second_wind'&&!a.disabledReason)){
  run.step('second-wind',s=>E.chooseBattleAction(s,'tech_second_wind','hero'));assert.ok(++casts<30);
  const reload=JSON.parse(JSON.stringify(run.state));assertSave(reload);
  assert.deepEqual(E.chooseBattleAction(reload,'defend'),E.chooseBattleAction(run.state,'defend'));
 }
 assert.ok(!run.state.battle.outcome);const remainingMP=run.state.battle.actors.find(a=>a.id==='hero').mp;
 assert.equal(remainingMP,startingMP-5*casts);const before=structuredClone(run.state.battle);
 run.step('rejected-empty',s=>E.chooseBattleAction(s,'tech_second_wind','hero'));
 assert.deepEqual({...run.state.battle,log:[]},{...before,log:[]});
 run.step('retreat',s=>E.chooseBattleAction(s,'retreat'));run.step('resolve-retreat',s=>E.resolveBattle(s,s.battle));assert.equal(run.state.battle,null);
 const result={entry:'Actual forest_expedition after real travel',startingMP,casts,remainingMP,roundTripSaveValid:true,reloadNextActionEquivalent:true,rejectedEmptyCastSpendsNoMPOrTurn:true,retreatResolved:true};
 writeFileSync(`${dir}/save-contract.json`,JSON.stringify(result,null,2)+'\n');console.log(result);process.exit(0);
}
function summarize(b,initial,actions,counts){return {outcome:b.outcome||'ongoing',stopReason:b.outcome?'encounter resolved':actions===240?'240-action probe limit':'Second Wind unavailable after MP depletion',actions,counts,round:b.round,party:b.actors.filter(a=>a.side==='party').map(a=>({id:a.id,hp:a.hp,maxHp:a.maxHp,mp:a.mp,maxMp:a.maxMp,ward:a.status.ward||0})),enemyHp:b.actors.filter(a=>a.side==='enemy').reduce((s,a)=>s+a.hp,0),initialParty:initial.actors.filter(a=>a.side==='party').map(a=>({id:a.id,hp:a.hp,mp:a.mp})),log:b.log.slice(-6)};}
function simulate(state,encounter,mode,limit=240){let b=createBattle(state,encounter),initial=structuredClone(b),actions=0;const counts={};
 for(;actions<limit&&!b.outcome;actions++){
  const actor=b.actors.find(a=>a.id===b.currentActorId),options=getBattleActions(b).filter(a=>!a.disabledReason),self=actor.id==='hero',sw=options.find(a=>a.id==='tech_second_wind'),foes=b.actors.filter(a=>a.side==='enemy'&&a.hp>0),target=foes.sort((a,b)=>a.hp-b.hp)[0],allies=b.actors.filter(a=>a.side==='party'&&a.hp>0),injured=allies.filter(a=>a.id!==actor.id&&(a.hp<=a.maxHp-8||a.mp<=a.maxMp-5)).sort((a,b)=>(b.maxHp-b.hp+b.maxMp-b.mp)-(a.maxHp-a.hp+a.maxMp-a.mp))[0];let pick={id:'attack',target:target?.id};
  if(self&&mode==='rally'&&actor.specialization==='bard'&&options.some(a=>a.id==='skill')&&actor.hp<=actor.maxHp-6)pick={id:'skill',target:actor.id};
  else if(self&&mode==='repeat'&&sw)pick={id:sw.id,target:actor.id};
  else if(self&&mode==='cycle')pick=sw?{id:sw.id,target:actor.id}:{id:'defend'};
  else if(self&&mode==='sustain'&&sw&&actor.hp<=actor.maxHp-8)pick={id:sw.id,target:actor.id};
  else if(self&&mode==='support'&&sw&&injured&&injured.id!==actor.id&&(injured.hp<=injured.maxHp-8||injured.mp<=injured.maxMp-5))pick={id:sw.id,target:injured.id};
  else if(!self&&mode==='support'&&actor.role==='mage'&&options.some(a=>a.id==='skill'&&a.targetSide==='enemy'))pick={id:'skill',target:target?.id};
  // Unavailable repeated heal after resource exhaustion is observed, not a retry loop.
  if(self&&mode==='repeat'&&!sw)break;
  const next=takeBattleAction(b,pick.id,pick.target);assert.notDeepEqual(next,b,'each selected action progresses');b=next;counts[pick.id]=(counts[pick.id]||0)+1;
 }
 return summarize(b,initial,actions,counts);
}
const probeState=JSON.parse(readFileSync(`${dir}/earned-0.json`)).states.solo;
const probe=createBattle(probeState,'road_bandits',null,{openingTurns:false});
const selfDelta=previewBattleAction(probe,'tech_second_wind','hero').effects.find(e=>e.id==='hero').mp;
assert.equal(selfDelta,name==='baseline'?0:-5,'The selected combat module graph does not match the requested experiment version.');
const results=[];
for(let index=0;index<3;index++){
 assert.ok(existsSync(`${dir}/earned-${index}.json`),'Run the earn mode first; all three earned fixtures are required.');const earned=JSON.parse(readFileSync(`${dir}/earned-${index}.json`));
 for(const cohort of ['solo','one','party','cross'])for(const encounter of ['road_bandits','forest','ruin','covenant_guardian'])for(const mode of ['attack','sustain','rally','repeat','cycle','support']){
  let state=structuredClone(earned.states[cohort==='one'?'party':cohort]);if(cohort==='one')for(const c of [...state.companions])if(c.active&&c.id!=='orrin')state=E.toggleCompanion(state,c.id);assertSave(state);
  results.push({index,cohort,encounter,mode,...simulate(state,encounter,mode)});
 }
}
writeFileSync(`${dir}/${name}.json`,JSON.stringify({method:'Three deterministic naturally generated age-18 builds; actual work, mentor initiation, paid three-day technique training, recovery and recruitment. Matched cloned earned states, normal encounter opening turns; no stat/equipment/health grants. Fixed action policies are not optimal play, difficulty acceptance or a sampled population win rate. Repeat and cycle are bounded 240-action resource probes, not full-world playthroughs.',results},null,2)+'\n');
console.log(name,results.length,'cases',JSON.stringify(results.filter(r=>r.cohort==='solo'&&['repeat','cycle','sustain'].includes(r.mode)).map(r=>({seed:r.index,encounter:r.encounter,mode:r.mode,outcome:r.outcome,actions:r.actions,hp:r.party[0].hp,mp:r.party[0].mp,counts:r.counts}))));
