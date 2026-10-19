import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LifeRun, ordinaryChoice, engine } from './playtest-utils.mjs';
import { CLASS_CATALOG, classView } from '../dist/js/classes.js';

const summaries=[];
for(const [index,c] of CLASS_CATALOG.entries()) {
 const approach=index%2?'independent':'service',branch=index%3?'b':'a',recognition=index%2?'private':'public';
 const companionId=['mira','orrin','kest'][index%3];
 const resolution={mira:index%2?'order-agreement':'neighborhood',orrin:index%2?'teach-relief':'shared-rota',kest:index%2?'careful-record':'private-letter'}[companionId];
 const policy=(event)=> {
  if(event.id==='calling_initiation')return approach;
  if(/^fellowship_formation_(start|resume)$/.test(event.id))return approach;
  if(event.id==='fellowship_formation_decision')return branch;
  if(event.id==='fellowship_formation_review')return recognition;
  if(event.id==='fellowship_companion_request')return index%2?'no-deadline':'promise';
  if(event.id==='fellowship_companion_decision')return resolution;
  if(event.id==='annual_deadline_review')return 'continue';
  const ordinary=ordinaryChoice(event);if(ordinary)return ordinary;
  return ['listen','support','care','quiet','record','honest','pause','later','decline','rest','wait','leave','remember','share'].find(id=>event.choices.some(c=>c.id===id)) || event.choices[0].id;
 };
 const run=new LifeRun(`v8-fellowship-${c.id}`,{seed:`v8-fellowship-${c.id}-fieldcase`,name:`${c.name} witness`,origin:index%2?'city':'village',difficulty:'gentle'},policy);
 run.grow(18).settle();
 // Savings and every qualification are earned through the actual offered work
 // and supervised lessons. No date, skill, party or resource is injected.
 for(let i=0;i<6;i++)run.act('work').settle();
 const calling=()=>classView(run.state).callings.find(item=>item.id===c.id);
 run.move(calling().locationId).settle();
 if(!calling().mentor.met)run.act(`calling_meet_${c.id}`).settle();
 for(let i=0;i<50&&calling().requirements.some(r=>!r.met);i++)run.act(`calling_train_${c.id}`).settle();
 assert.ok(calling().requirements.every(r=>r.met));
 run.act(`calling_seek_${c.id}`).settle();assert.equal(run.state.hero.specialization,c.id);
 if(approach==='service')run.act(`calling_service_${c.id}`).settle();
 const preFormation=structuredClone(run.state.hero.attributes),startDay=run.state.day;
 run.act(`fellowship_formation_${c.id}`).settle();
 for(let i=0;i<100&&run.state.fellowship.formations[c.id]?.stage!=='completed';i++) {
  run.settle();
  if(run.state.fellowship.project)run.act('fellowship_continue');
  else if(run.available(`fellowship_discuss_${c.id}`))run.act(`fellowship_discuss_${c.id}`);
  else throw new Error(`${c.id}: formation stalled at ${run.state.day}: ${run.state.notice}`);
 }
 run.settle();const formed=run.state.fellowship.formations[c.id];assert.equal(formed.stage,'completed');assert.equal(formed.workDays,16);assert.deepEqual(run.state.hero.attributes,preFormation);assert.ok(run.state.day-startDay>=16);
 const home=companionId==='kest'?'city':run.state.hero.birthplaceId;run.move(home).settle();
 run.step(`recruit:${companionId}`,s=>engine.recruitCompanion(s,companionId));assert.ok(run.state.companions.find(p=>p.id===companionId).recruited);
 run.act(`fellowship_companion_${companionId}`).settle();
 for(let i=0;i<100&&run.state.fellowship.companions[companionId]?.stage!=='completed';i++) {
  run.settle();if(run.state.fellowship.project)run.act('fellowship_continue');else throw new Error(`${c.id}: companion request stalled`);
 }
 const requested=run.state.fellowship.companions[companionId];assert.equal(requested.workDays,8);assert.equal(requested.resolution,resolution);
 let expedition=null;
 if(c.id==='ranger') {
  // This seed's maintenance route permits aid without copying its owner's
  // account. The actually earned formation supplies the distinct proof needed
  // for the guardian's negotiation; no flags or cleared rooms are injected.
  run.move('forest').settle().act('workshop_gather_ore').settle();
  while(run.state.workshop.project)run.act('workshop_continue').settle();
  run.act('explore_enter_root_caverns').choose('route_service').choose('aid_only').choose('route_refuge').choose('take').choose('route_thornheart').choose('listen');
  assert.equal(run.state.dungeon.facts.variantProof,undefined);assert.equal(run.state.dungeon.facts.variantAid,true);
  assert.ok(!run.state.event.choices.find(c=>c.id==='parley').disabledReason);
  run.choose('parley');assert.equal(run.state.dungeon.facts.formation_thornheart,'ranger');assert.equal(run.state.dungeon.facts.variantProof,undefined);
  run.choose('route_spring').choose('finish').choose('leave').settle();
  expedition={id:'root_caverns',actualFormationProof:run.state.flags.dungeonRecords.root_caverns.facts.formation_thornheart,objectiveMethod:run.state.flags.dungeonRecords.root_caverns.facts.objectiveMethod,aidWithoutCopiedAccount:true};
 }
 run.retire();const summary=run.save('artifacts/playtest/v8-fellowship');summary.formation={classId:c.id,approach,interpretation:formed.interpretation,recognition,technique:formed.technique,workDays:formed.workDays};summary.companion={id:companionId,resolution,workDays:requested.workDays,boundary:requested.boundary};summary.expedition=expedition;summaries.push(summary);
}
mkdirSync('docs/playtest',{recursive:true});
writeFileSync('docs/playtest/fellowship-v8.json',JSON.stringify({method:'Twelve distinct lives from birth to actual retirement, public game APIs only; qualification and story work use actual offered actions. Input immutability, JSON save validation and nonnegative savings checked after every transition.',lives:summaries},null,2)+'\n');
process.stdout.write(JSON.stringify({completed:summaries.length,operations:summaries.reduce((sum,s)=>sum+s.operations,0),callings:summaries.map(s=>s.formation.classId),formationBranches:[...new Set(summaries.map(s=>s.formation.interpretation))],companionResolutions:[...new Set(summaries.map(s=>s.companion.resolution))]})+'\n');
