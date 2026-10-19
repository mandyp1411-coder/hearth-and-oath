import test from 'node:test';
import assert from 'node:assert/strict';
import { bossState,bossContext } from './helpers/maze-signature-state.js';
import { RPG_DUNGEONS_V27,rpgContacts,inheritRpg } from '../dist/js/rpg-depth-v27.js';
import { validateBossStories } from '../dist/js/boss-stories-v27.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { mazeLayout,archiveStoryMazeAtLifeEnd,inheritStoryMazes } from '../dist/js/maze-v31.js';
import { signatureMazeAllowed,initializeSignatureMaze,signatureMazeActions,applySignatureMazeAction,enterSignatureMazeRoom,signatureMazeRoomText,signatureMazeBattleSpec,afterSignatureMazeBattle,validateSignatureMaze,validSignatureMazeWork } from '../dist/js/maze-signature.js';

const sources=RPG_DUNGEONS_V27.filter(d=>d.signature),catalog=ENCOUNTER_DESIGN_V27.bosses;
function prepared(source=sources[0]){
 const s=bossState(source.regionId);s.dynasty.generation=1;s.dynasty.history=[];s.dungeon=null;s.rpg.expedition=null;s.rpg.contacts=[];s.rpg.project=null;s.equipment.materials.crystal=20;s.equipment.materials.stone=20;s.mazeBook={version:1,nextRun:2,records:[]};
 const m={version:1,id:'maze-1',generation:1,kind:'regional',sourceId:source.id,regionId:source.regionId,locationId:s.locationId,title:source.title,seed:`${s.seed}:maze:1:regional:${source.id}:${s.locationId}:1`,position:0,previous:0,visited:[0],cleared:[0],collected:[],objective:false,pendingRoom:null,startedDay:s.day,questId:null};s.maze=m;
 const layout=mazeLayout(m);assert.equal(initializeSignatureMaze(s,m,layout),true);return {s,m,layout,...bossContext(s)};
}
function move(f,slotId){f.m.previous=f.m.position;f.m.position=f.m.content.anchors.find(a=>a.slotId===slotId).cellId;f.m.visited=[...new Set([...f.m.visited,f.m.position])];enterSignatureMazeRoom(f.s,f.m);}
function act(f,id){assert.equal(applySignatureMazeAction(f.s,id,f.ctx),true,id);assert.equal(f.s.dungeon,null);assert.equal(f.s.rpg.expedition,null);assert.equal(validateSignatureMaze(f.s,f.m,f.layout),true,id+' progress validates');assert.equal(validateBossStories(f.s),true,id+' global boss ledger validates');}
function ownLeads(f,bossIndex=0){move(f,'entry');act(f,'maze_signature_lead_contact_'+bossIndex);move(f,'ledger');if(!f.m.contentFacts.archive)act(f,'maze_signature_copy');act(f,'maze_signature_lead_archive_'+bossIndex);move(f,'stores');if(!f.m.contentFacts.claimedStores)act(f,'maze_signature_cache');act(f,'maze_signature_lead_survey_'+bossIndex);}
function battle(f,slotId){move(f,slotId);const spec=signatureMazeBattleSpec(f.m),pending={encounterId:spec.encounterId,instanceId:'battle-'+slotId,context:{kind:'maze',mazeId:f.m.id,runSeed:f.m.seed,runGeneration:String(f.m.generation),actorId:f.s.dynasty.activePersonId,contentVersion:'1',sourceId:f.m.sourceId,locationId:f.m.locationId,roomId:String(f.m.position),...spec}};f.m.cleared=[...new Set([...f.m.cleared,f.m.position])];assert.equal(afterSignatureMazeBattle(f.s,f.m,pending,f.ctx),true);return pending;}

test('all six signatures restore twelve canonical guardians and thirty-six exact approaches',()=>{
 let approaches=0;
 for(const source of sources)for(const [i,boss]of catalog.filter(b=>b.regionId===source.regionId).entries())for(const approach of boss.noncombatApproaches){
  const f=prepared(source);ownLeads(f,i);move(f,i?'last':'guardian');
  const rows=signatureMazeActions(f.s).filter(a=>a.id.startsWith('maze_signature_approach_'));assert.equal(rows.length,3);
  const pick=rows.find(a=>a.id==='maze_signature_approach_'+approach.id);assert.ok(pick);assert.equal(pick.days,approach.costs.days);assert.equal(pick.cost,approach.costs.gold||0);assert.equal(pick.disabledReason,undefined);
  const old=f.s.day;act(f,pick.id);assert.equal(f.s.day-old,approach.costs.days);assert.equal(f.s.rpg.bosses[i].resolutions[0].id,approach.id);assert.equal(f.m.contentOutcomes.at(-1).bossId,boss.id);approaches++;
 }
 assert.equal(approaches,36);
});
test('eager initialization and undiscovered goal/actions reveal no hidden boss names or IDs',()=>{
 const f=prepared();assert.equal(rpgContacts(f.s).length,0);
 const initial=JSON.stringify({text:signatureMazeRoomText(f.m,f.s),actions:signatureMazeActions(f.s)});
 for(const b of f.m.content.definition.bosses){assert.ok(!initial.includes(b.name));assert.ok(!initial.includes(b.id));}
 move(f,'goal');const goal=JSON.stringify({text:signatureMazeRoomText(f.m,f.s),actions:signatureMazeActions(f.s)});
 for(const b of f.m.content.definition.bosses){assert.ok(!goal.includes(b.name));assert.ok(!goal.includes(b.id));}
 move(f,'entry');act(f,'maze_signature_lead_contact_0');assert.equal(rpgContacts(f.s).length,2);move(f,'goal');assert.ok(signatureMazeActions(f.s)[0].disabledReason.includes(f.m.content.definition.bosses[0].name));
});
test('goal needs both exact guardian resolutions, keeps the original fee/proceeds, and creates only its selected global service',()=>{
 for(const method of ['care','trade','scheme']){
  const f=prepared();move(f,'goal');assert.ok(signatureMazeActions(f.s).every(a=>a.disabledReason));battle(f,'last');move(f,'goal');assert.ok(signatureMazeActions(f.s).every(a=>a.disabledReason));battle(f,'guardian');move(f,'goal');
  const gold=f.s.hero.gold,day=f.s.day;act(f,'maze_signature_'+method);assert.equal(f.s.day-day,3);assert.equal(f.s.hero.gold-gold,method==='care'?4:method==='trade'?35:55);assert.equal(f.s.rpg.services.length,1);assert.equal(f.s.rpg.services[0].rule,{care:'shared',trade:'priced',scheme:'controlled'}[method]);assert.equal(f.s.rpg.services[0].source,f.m.sourceId);assert.equal(f.s.mazeBook.contentReceipts.length,1);assert.equal(applySignatureMazeAction(f.s,'maze_signature_'+method,f.ctx),false);assert.deepEqual(signatureMazeAllowed(f.s,{sourceId:f.m.sourceId}),{allowed:true,priorComplete:true});
 }
});
test('boss identities remain bound to their original hearth and old expeditions cannot be hijacked',()=>{
 const f=prepared(),before=structuredClone(f.s.rpg.bosses);f.s.realm.sites.other={id:'other',regionId:f.m.regionId};f.s.locationId='other';assert.equal(signatureMazeAllowed(f.s,{sourceId:f.m.sourceId}).allowed,false);assert.deepEqual(f.s.rpg.bosses,before);
 f.s.locationId=f.m.locationId;f.s.rpg.expeditions=[{id:f.m.sourceId,locationId:f.m.locationId,completed:false}];assert.equal(signatureMazeAllowed(f.s,{sourceId:f.m.sourceId}).allowed,false);
});
test('an earlier canonical resolution grants passage without cloning rewards, property or services',()=>{
 const f=prepared();const b=f.s.rpg.bosses[0];b.resolutions=[{id:'combat',day:f.s.day-1,days:0,gold:0,outcome:'Already overcome',participantIds:[]}];const gold=f.s.hero.gold;move(f,'guardian');assert.equal(f.m.contentOutcomes[0].actionId,'prior_resolution');assert.equal(signatureMazeActions(f.s).length,0);assert.equal(f.s.hero.gold,gold);assert.equal(f.s.rpg.services.length,0);assert.equal(f.s.rpg.properties.length,0);assert.equal(validateSignatureMaze(f.s,f.m,f.layout),true);enterSignatureMazeRoom(f.s,f.m);assert.equal(f.m.contentOutcomes.length,1);
});
test('own attended leads cannot be replaced with another guardian’s or another run’s evidence',()=>{
 const f=prepared();ownLeads(f,0);move(f,'last');assert.ok(signatureMazeActions(f.s).filter(a=>a.id.startsWith('maze_signature_approach_')).every(a=>a.disabledReason));
 move(f,'guardian');f.s.rpg.bosses[0].leads.archive.mazeId='wrong-run';assert.ok(signatureMazeActions(f.s).find(a=>a.id==='maze_signature_approach_repair_pump').disabledReason);assert.equal(validateSignatureMaze(f.s,f.m,f.layout),false);
});
test('attendance resumes with once-paid fees and cancellation never invents an outcome',()=>{
 const f=prepared();ownLeads(f);move(f,'guardian');let allowance=1;f.ctx.spendDays=n=>{const actual=Math.min(n,allowance);f.s.day+=actual;return actual;};const gold=f.s.hero.gold;act(f,'maze_signature_approach_bring_passenger');assert.equal(f.s.rpg.project.completedDays,1);assert.equal(f.s.hero.gold,gold-8);assert.equal(validSignatureMazeWork(f.s,f.m),true);assert.deepEqual(signatureMazeActions(f.s).map(a=>a.id),['maze_work_continue','maze_work_cancel']);
 const reloaded=JSON.parse(JSON.stringify(f.s));Object.assign(f.s,reloaded);f.m=f.s.maze;assert.equal(validSignatureMazeWork(f.s,f.m),true);act(f,'maze_work_continue');assert.equal(f.s.rpg.project,null);assert.equal(f.s.hero.gold,gold-8);assert.equal(f.s.rpg.bosses[0].resolutions.length,1);
 const g=prepared();ownLeads(g);move(g,'guardian');g.ctx.spendDays=n=>0;act(g,'maze_signature_approach_bring_passenger');assert.equal(g.s.rpg.project.paid,false);act(g,'maze_work_cancel');assert.equal(g.s.rpg.bosses[0].resolutions.length,0);
});
test('completion rechecks actual living present participants and remaining supplies',()=>{
 for(const change of ['death','moved','supplies']){
  const f=prepared();ownLeads(f);move(f,'guardian');f.ctx.spendDays=n=>{f.s.day++;return 1;};act(f,'maze_signature_approach_repair_pump');assert.ok(f.s.rpg.project);if(change==='death')f.s.rpg.bosses[0].people[0].alive=false;else if(change==='moved')f.s.rpg.bosses[0].people[0].locationId='elsewhere';else f.s.equipment.materials.ore=0;
  act(f,'maze_work_continue');act(f,'maze_work_continue');assert.equal(f.s.rpg.project,null);assert.equal(f.s.rpg.bosses[0].resolutions.length,0);assert.ok(!f.m.cleared.includes(f.m.position));
 }
});
test('battle provenance rejects wrong boss/run/slot/encounter and victory never invents peaceful effects',()=>{
 const f=prepared();move(f,'guardian');const spec=signatureMazeBattleSpec(f.m),pending={encounterId:'rpg_guardian',instanceId:'battle-canonical',context:{kind:'maze',contentVersion:'1',runSeed:f.m.seed,runGeneration:String(f.m.generation),actorId:f.s.dynasty.activePersonId,sourceId:f.m.sourceId,mazeId:f.m.id,roomId:String(f.m.position),locationId:f.m.locationId,...spec}};f.m.cleared.push(f.m.position);
 for(const field of ['bossId','mazeId','runSeed','runGeneration','actorId','slotId','encounterId','locationId','sourceId']){const wrong=structuredClone(pending);wrong.context[field]='wrong';assert.equal(afterSignatureMazeBattle(f.s,f.m,wrong,f.ctx),false);}
 assert.equal(afterSignatureMazeBattle(f.s,f.m,pending,f.ctx),true);assert.equal(validateSignatureMaze(f.s,f.m,f.layout),true);assert.equal(afterSignatureMazeBattle(f.s,f.m,pending,f.ctx),false);assert.equal(f.s.rpg.services.length,0);assert.equal(f.s.rpg.properties.length,0);assert.deepEqual(f.s.rpg.bosses[0].resolutions[0].participantIds,[]);
});
test('validation rejects forged progress, anchors, cleared guardians, objectives and stale work recipes',()=>{
 const f=prepared();for(const mutate of [v=>v.maze.contentFacts.archive=true,v=>v.maze.cleared.push(v.maze.content.anchors.find(a=>a.slotId==='guardian').cellId),v=>v.maze.objective=true,v=>v.maze.content.anchors[1].cellId=0,v=>v.maze.content.definition.rooms.find(r=>r.id==='stores').loot.gold=800]){const s=structuredClone(f.s);mutate(s);assert.equal(validateSignatureMaze(s,s.maze,f.layout),false);}
 ownLeads(f);move(f,'guardian');f.ctx.spendDays=()=>0;act(f,'maze_signature_approach_repair_pump');for(const mutate of [p=>p.totalDays++,p=>p.details.bossId='wrong',p=>p.details.cellId++,p=>p.details.actionId='maze_signature_approach_bring_passenger',p=>p.details.participantIds.reverse()]){const s=structuredClone(f.s);mutate(s.rpg.project);assert.equal(validSignatureMazeWork(s,s.maze),false);}
});

test('modern global lead/discovery provenance is validated while untouched legacy ledgers remain valid',()=>{
 const f=prepared();assert.equal(validateBossStories(f.s),true);ownLeads(f);move(f,'guardian');act(f,'maze_signature_approach_repair_pump');
 for(const mutate of [s=>s.rpg.bosses[0].leads.archive.cellId++,s=>s.rpg.bosses[0].leads.archive.participantIds=['wrong','other'],s=>s.rpg.bosses[0].leads.archive.startedDay=s.day,s=>s.rpg.bosses[0].mazeDiscovery.sourceId='signature_other',s=>s.rpg.bosses[0].resolutions[0].slotId='last']){const bad=structuredClone(f.s);mutate(bad);assert.equal(validateBossStories(bad),false);}
 for(const outcomes of [null,[null],[{slotId:'entry'}],[{slotId:'entry',actionId:3}]]){const bad=structuredClone(f.s);bad.maze.contentOutcomes=outcomes;assert.equal(validateSignatureMaze(bad,bad.maze,f.layout),false);}
 const legacy=structuredClone(f.s);delete legacy.rpg.bosses[0].mazeDiscovery;for(const b of legacy.rpg.bosses){for(const kind of ['archive','survey','contact'])if(b.leads[kind])b.leads[kind]={day:b.leads[kind].day,roomId:b.leads[kind].roomId,participantIds:b.leads[kind].participantIds};b.resolutions=b.resolutions.map(r=>({id:r.id,day:r.day,days:r.days,gold:r.gold,outcome:r.outcome,consequence:r.consequence,participantIds:r.participantIds}));}assert.equal(validateBossStories(legacy),true);
});

function succeed(f){
 for(const key of ['contacts','contactArchive','warAccounts','arcs','inheritedAccounts'])f.s.rpg[key]||=[];
 archiveStoryMazeAtLifeEnd(f.s);const parent=structuredClone(f.s),next=structuredClone(f.s);next.maze=null;next.mazeBook={version:1,nextRun:1,records:[]};next.rpg.project=null;
 next.dynasty={...next.dynasty,generation:next.dynasty.generation+1,activePersonId:'heir-'+(next.dynasty.generation+1),history:[...next.dynasty.history,{personId:next.dynasty.activePersonId}]};
 inheritRpg(next,parent);inheritStoryMazes(next,parent);next.maze=structuredClone(next.mazeBook.records.find(row=>row.id===f.m.id));next.maze.status='inside';delete next.maze.endedDay;next.maze.position=0;next.maze.previous=0;
 const result={s:next,m:next.maze,layout:mazeLayout(next.maze),...bossContext(next)};assert.equal(validateSignatureMaze(next,next.maze,result.layout),true);assert.equal(validateBossStories(next),true);return result;
}
test('succession transfers public route/proof and physical claims but requires personal contact renewal without replacing original receipts',()=>{
 const source=sources.find(d=>d.regionId==='blackgrove'),f=prepared(source);ownLeads(f,1);const oldLeads=structuredClone(f.s.rpg.bosses[1].leads),oldRows=structuredClone(f.m.contentOutcomes),oldHerbs=f.s.flags.herbs;
 f.s.rpg.bosses[1].people[0].bond=80;f.s.rpg.bosses[1].people[0].memories=['A private conversation with the parent.'];
 const heir=succeed(f);assert.equal(heir.s.mazeBook.nextRun,2);assert.equal(heir.s.rpg.project,null);assert.equal(heir.s.rpg.bosses[1].people[0].bond,35);assert.deepEqual(heir.s.rpg.bosses[1].people[0].memories,[]);assert.equal(heir.s.rpg.bosses[1].people[0].knownBondsByPerson.hero,80);
 assert.match(signatureMazeRoomText(heir.m,heir.s).body,/recorded route knowledge, not your own memories/);assert.deepEqual(heir.m.contentOutcomes,oldRows);assert.equal(heir.m.contentFacts.claimedStores,true);
 move(heir,'last');assert.match(signatureMazeActions(heir.s).find(a=>a.id==='maze_signature_approach_release_breath').disabledReason,/own contact lead/);move(heir,'stores');assert.ok(!signatureMazeActions(heir.s).some(a=>a.id==='maze_signature_cache'||a.id==='maze_signature_lead_survey_1'));
 move(heir,'entry');const gold=heir.s.hero.gold,day=heir.s.day;act(heir,'maze_signature_lead_contact_1');assert.equal(heir.s.day-day,2);assert.equal(heir.s.hero.gold,gold);assert.equal(heir.s.flags.herbs,oldHerbs);assert.deepEqual(heir.s.rpg.bosses[1].leads,oldLeads);assert.deepEqual(heir.m.contentOutcomes.slice(0,oldRows.length),oldRows);assert.equal(heir.m.contentOutcomes.at(-1).actionId,'renew_contact');assert.equal(heir.m.contentOutcomes.at(-1).actorId,'heir-2');
 move(heir,'last');act(heir,'maze_signature_approach_release_breath');assert.equal(heir.s.rpg.bosses[1].resolutions[0].actorId,'heir-2');assert.equal(heir.s.rpg.bosses[1].resolutions[0].runGeneration,1);
 const restored=JSON.parse(JSON.stringify(heir.s));assert.equal(validateSignatureMaze(restored,restored.maze,heir.layout),true);assert.equal(validateBossStories(restored),true);
});
test('personal renewal cannot be repeated by one actor or inherited as the next actor’s agreement',()=>{
 const f=prepared();ownLeads(f);const heir=succeed(f);move(heir,'entry');act(heir,'maze_signature_lead_contact_0');assert.equal(applySignatureMazeAction(heir.s,'maze_signature_lead_contact_0',heir.ctx),false);const second=succeed(heir);move(second,'guardian');assert.ok(signatureMazeActions(second.s).find(a=>a.id==='maze_signature_approach_repair_pump').disabledReason);move(second,'entry');act(second,'maze_signature_lead_contact_0');assert.equal(second.m.contentOutcomes.filter(row=>row.actionId==='renew_contact').length,2);
 const bad=structuredClone(second.s);bad.maze.contentOutcomes.at(-1).actorId='unrecorded-stranger';assert.equal(validateSignatureMaze(bad,bad.maze,second.layout),false);
});
test('full run identity rejects same numeric run IDs with different seeds/generations, and stale actor work',()=>{
 const f=prepared();ownLeads(f);for(const key of ['runSeed','runGeneration','sourceId','locationId','manifestVersion']){const s=structuredClone(f.s);s.rpg.bosses[0].leads.archive[key]=key==='runGeneration'||key==='manifestVersion'?99:'wrong';assert.equal(validateBossStories(s),false);assert.equal(validateSignatureMaze(s,s.maze,f.layout),false);}
 move(f,'guardian');f.ctx.spendDays=()=>0;act(f,'maze_signature_approach_repair_pump');for(const key of ['runSeed','runGeneration','actorId','actorGeneration']){const s=structuredClone(f.s);s.rpg.project.details[key]=key==='runGeneration'||key==='actorGeneration'?99:'wrong';assert.equal(validSignatureMazeWork(s,s.maze),false);}
});
test('lethal crossing records its physical outcome before life-end archival',()=>{
 const f=prepared();move(f,'crossing');f.s.hero.hp=5;let snapshot=null;f.ctx.endLife=()=>{archiveStoryMazeAtLifeEnd(f.s);snapshot=structuredClone(f.s.mazeBook.records[0]);f.s.maze=null;f.s.phase='retired';};
 assert.equal(applySignatureMazeAction(f.s,'maze_signature_risk',f.ctx),true);assert.equal(snapshot.contentOutcomes.at(-1).actionId,'risk');assert.equal(snapshot.contentOutcomes.at(-1).actorId,'hero');assert.equal(validateSignatureMaze(f.s,snapshot,f.layout),true);
});

test('retained same-ID runs cannot be mistaken for evicted provenance from another canonical generation',()=>{
 const f=prepared();ownLeads(f);f.s.dynasty.generation=2;
 const canonicalOtherSeed=`${f.s.seed}:maze:2:regional:${f.m.sourceId}:${f.m.locationId}:1`;
 for(const target of ['lead','discovery']){const s=structuredClone(f.s),v=target==='lead'?s.rpg.bosses[0].leads.archive:s.rpg.bosses[0].mazeDiscovery;v.runGeneration=2;v.runSeed=canonicalOtherSeed;assert.equal(validateBossStories(s),false,target+' cannot use eviction fallback while same ID is retained');}
 const future=structuredClone(f.s);future.rpg.bosses[0].leads.archive.runGeneration=3;future.rpg.bosses[0].leads.archive.runSeed=`${f.s.seed}:maze:3:regional:${f.m.sourceId}:${f.m.locationId}:1`;future.maze=null;future.mazeBook.records=[];assert.equal(validateBossStories(future),false,'future generations cannot pass the archive-expired fallback');
});
