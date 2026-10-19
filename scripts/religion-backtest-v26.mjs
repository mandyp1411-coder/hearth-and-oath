// Reproducible public-command lives. No stat, faith, clock, reward or condition patches.
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {normalizeAppearance} from '../dist/js/avatar.js';
import {getBattleActions} from '../dist/js/combat.js';
import {campaignView} from '../dist/js/campaign.js';
import {regionAt} from '../dist/js/realm.js';
import {curseLawAt,curseView,CURSE_ORDERS} from '../dist/js/curses.js';
import {getContacts} from '../dist/js/conversations.js';
import {isSettlement} from '../dist/js/world.js';
const start=Number(process.argv[2]||0),count=Number(process.argv[3]||20),out=resolve(process.argv[4]||'docs/religion-v26/lives.json');
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'],faiths=['lantern','ancestors','wilds','forge','moon','ash'];
const profiles=['devout_civilian','pilgrim_explorer','skeptical_artisan','cross_faith_friend','sustained_vampire','prepared_werewolf','predatory_vampire','refusing_vampire','untamed_werewolf','covenant_adventurer'];
const ages=[0,10,18,18,18,18,18,18,18,18,80,65,45,25,18,18,18,18,18,18],campaignFull=new Set([0,1,9,10,11,19]);
const hash=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const runtimeDigest=()=>createHash('sha256').update(readdirSync(new URL('../dist/js/',import.meta.url)).filter(f=>f.endsWith('.js')).sort().map(f=>f+'\n'+readFileSync(new URL('../dist/js/'+f,import.meta.url),'utf8')).join('\n')).digest('hex');
const digest=runtimeDigest(),harnessDigest=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),reports=[];
mkdirSync(dirname(out),{recursive:true});
for(let index=start;index<start+count;index++){
 const mode=index%10,seed=index===10?'religion-v26-elder':`hearth-faith-v26-${String(index+1).padStart(2,'0')}`,race=index===10?'human':races[index%8],begin=Date.now(),commands=[],scenes=[],journal=[],portraits=new Set(),checks=[],stats={commands:0,reloads:0,battles:0,events:{},actions:{}};
 let s,returnHex,stalls=0,curseAttempts=0,darkAttempts=0,faithChosen=false,donorTried=false,donorPlanTried=false,sideTried=new Set(),annual=new Set(),dungeonMoves=new Map(),trainingNeeded=0;
 let targetFaith=faiths[index%6];const requestedFaith=targetFaith,membership=index%4===2?null:faiths[(index+1)%6],startingAge=ages[index]??18;
 function assertStory(state){
  if(!state.event)return;
  if(state.event.id==='quest_patients'){
   const kin=state.life.people.find(p=>p.id==='kin');if(kin?.alive===false){assert.ok(!state.event.body.includes(kin.name+' waits'),'dead parent awaits outside clinic');checks.push('deceased_parent_not_resurrected');}
  }
  if(state.event.id==='quest_inquiry'&&state.companions.find(p=>p.id==='mira')?.alive===false){assert.equal(state.event.title,'The Order’s difficult inquiry');checks.push('deceased_mira_archival_inquiry');}
  if(state.event.id==='life_vampire_guest'&&state.life.people.find(p=>p.id==='fellow')?.knownFacts?.includes('vampire')){assert.match(state.event.body,/remembers your daylight limits/);checks.push('vampire_confidence_retained');}
  if(state.event.id==='life_wolf_confidant'&&state.hero.condition?.curseVersion===1)assert.ok(!state.event.choices.some(c=>/Gain (5|8) control/.test(c.description||'')));
 }
 function commit(op,id,fn){
  const before=s,old=hash(s),membershipBefore=s.realm.faithId,oldJournal=new Set(s.journal.map(j=>JSON.stringify(j))),previousEvent=s.event;
  s=fn(s);assert.equal(hash(before),old,'operation mutated input');assert.ok(E.validateSave(s),`${op} ${id}: invalid save / ${s.notice}`);
  if(op==='action'&&/^realm_(petition|inquiry|report_|custom)/.test(id)){assert.equal(s.realm.faithId,membershipBefore,'service forced a faith change');checks.push('religious_service_preserved_membership');}
  assertStory(s);stats.commands++;if(stats.commands%100===0){writeFileSync(out+`.checkpoint-${index}.json`,JSON.stringify(s));console.log(JSON.stringify({progress:true,index,commands:stats.commands,age:s.age,event:s.event?.id,faithRecords:s.realm.faithRecords.length,campaign:s.campaign.stage}));}
  const row={step:stats.commands,op,id,day:s.day,age:s.age,locationId:s.locationId,event:s.event?.id||null,condition:s.hero.condition?.type||null,stage:s.hero.condition?.stage||null,hunger:s.hero.condition?.hunger??null,humanity:s.hero.condition?.humanity??null,control:s.hero.condition?.control??null,phase:s.phase};commands.push(row);
  if(s.event&&(!previousEvent||s.event.id!==previousEvent.id||s.event.body!==previousEvent.body))scenes.push({step:stats.commands,day:s.day,age:s.age,id:s.event.id,title:s.event.title,body:s.event.body,choices:s.event.choices.map(c=>({id:c.id,label:c.label,description:c.description,disabledReason:c.disabledReason}))});
  for(const j of s.journal)if(!oldJournal.has(JSON.stringify(j)))journal.push({...j,step:stats.commands});
  if(s.hero.condition){const v=curseView(s);if(v)portraits.add(v.form+':'+v.bloodline+':'+s.age);assert.equal(curseLawAt(s).policy,CURSE_ORDERS[regionAt(s).id].policy);}
  if(stats.commands%20===0||s.event?.id.startsWith('curse_')||s.event?.id.startsWith('quest_')){const r=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(r,'reload rejected');assert.equal(hash(r),hash(s),'reload changed life');s=r;stats.reloads++;}
  return hash(s)!==old;
 }
 function act(id){const a=E.getActions(s).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;stats.actions[id]=(stats.actions[id]||0)+1;const origin=s.cartography?.position;const changed=commit('action',id,x=>E.chooseAction(x,id));if(id.startsWith('atlas_step_')&&s.cartography?.offsite)returnHex=origin;return changed;}
 function available(ids){for(const id of ids)if(act(id))return true;return false;}
 function road(id){if(s.locationId===id)return false;return commit('travel',id,x=>E.travelTo(x,id));}
 function dungeonChoice(cs){
  if(s.dungeon?.complete)return cs.find(c=>c.id==='leave');
  const room=s.dungeon?.roomId,key=s.dungeon?.id+':'+room;
  const direct=['hear_witness','record_witness','protect_witness','listen','repair_route','search','restore','preserve','take','finish_stewardship','finish_public','finish'];
  let c=cs.find(c=>direct.includes(c.id));
  if(c)return c;
  c=mode===9?cs.find(c=>c.id==='fight'):cs.find(c=>c.id==='parley')||cs.find(c=>c.id==='fight');if(c)return c;
  const routes=cs.filter(c=>c.id.startsWith('route_')).sort((a,b)=>(dungeonMoves.get(s.dungeon.id+':'+a.id.slice(6))||0)-(dungeonMoves.get(s.dungeon.id+':'+b.id.slice(6))||0));
  if(routes.length){dungeonMoves.set(key,(dungeonMoves.get(key)||0)+1);return routes[0];}
  return cs.find(c=>c.id==='leave');
 }
 function eventPick(){
  const id=s.event.id,cs=s.event.choices.filter(c=>!c.disabledReason);let pick;
  if(id.startsWith('dungeon_'))pick=dungeonChoice(cs);
  else if(id.startsWith('birth_'))pick=cs[(index+s.age)%cs.length];
  else if(id==='life_hunger')pick=cs.find(c=>c.id===(mode===7?'endure':mode===6&&(s.day-(s.timeline.birthDay||0)+1)%365===0?'endure':mode===6?'pause':'agreement'))||cs.find(c=>['animal','jailer'].includes(c.id));
  else if(id==='vampire_offer'||id==='lycan_offer')pick=cs.find(c=>c.id==='accept');
  else if(id==='vampire_feeding')pick=cs.find(c=>c.id===(mode===6?'predation':'animal'));
  else if(id==='lycan_fullmoon')pick=cs.find(c=>c.id===(mode===8?'roam':'safe'))||cs.find(c=>c.id==='isolate');
  else if(id==='curse_frenzy')pick=cs.find(c=>c.id===(mode===6?'hunt':mode===7?'contain':'feed'));
  else if(id==='curse_hunters')pick=cs.find(c=>c.id===([6,8].includes(mode)?'answer':'hide'));
  else if(id==='curse_trial')pick=cs.find(c=>c.id===([6,8].includes(mode)?'accept':'records'));
  else if(id==='sanctuary_donor_terms'||id==='sanctuary_pack_terms')pick=cs.find(c=>c.id==='agree')||cs.find(c=>c.id==='animal');
  else if(id==='way_encounter')pick=cs.find(c=>c.id===(s.hero.gold>=4?'care':'leave'));
  else if(id==='quest_patients')pick=cs.find(c=>c.id===['living','willing','coerce'][index%3]);
  else if(id==='quest_letter')pick=cs.find(c=>c.id===['academy','order','independent'][index%3]);
  else if(id==='quest_return')pick=cs.find(c=>c.id===(index===10?'mira':['open','quiet','mira'][index%3]));
  else if(id==='quest_inquiry')pick=cs.find(c=>c.id===['record','limited','accuse'][index%3]);
  else if(id==='quest_pledge')pick=cs.find(c=>c.id===['renew','release','keeper','dominion','shatter','haven'][[0,1,9,10,11,19].indexOf(index)]);
  else if(id==='quest_final')pick=cs.find(c=>c.id==='testimony')||cs.find(c=>c.id==='negotiate');
  else if(id==='quest_resolution')pick=cs.find(c=>c.id===s.campaign.facts.plannedEnding);
  else if(id==='life_vampire_guest')pick=cs.find(c=>c.id==='truth');
  else if(id==='life_wolf_confidant')pick=cs.find(c=>c.id==='tell');
  else if(id==='retirement')pick=cs.find(c=>c.id==='settle');
  else if(id==='plague_letter')pick=cs.find(c=>c.id==='later');
  else if(id==='life_budget')pick=cs.find(c=>c.id==='simplify');
  else if(id==='health_concern')pick=cs.find(c=>c.id===(s.hero.condition?.hunger>=75||s.flags.pendingMoonDays?.length?'continue':'rest'))||cs.find(c=>c.id==='continue');
  else if(id==='justice_arrest')pick=cs.find(c=>c.id==='surrender');
  pick||=cs.find(c=>['continue','keep','wait','leave','listen','honest','later','decline','private','cancel','pause'].includes(c.id))||cs[0];assert.ok(pick,'no offered event choice');
  stats.events[id]=(stats.events[id]||0)+1;commit('choice',id+':'+pick.id,x=>E.chooseEventOption(x,pick.id));
 }
 function battleTurn(){
  const b=s.battle,a=b.actors.find(a=>a.id===b.currentActorId);
  if(b.outcome){stats.battles++;if(b.outcome!=='victory')trainingNeeded=4;return commit('battle_result',b.outcome,x=>E.resolveBattle(x,x.battle));}
  const options=getBattleActions(b).filter(o=>!o.disabledReason),targets=o=>b.actors.filter(t=>t.hp>0&&t.side===o.targetSide&&(!o.targetIds||o.targetIds.includes(t.id))),hurt=targets({targetSide:'party'}).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  let choice=options.find(o=>o.id==='potion'&&hurt?.hp<hurt?.maxHp*.45)||options.find(o=>o.id==='blood'&&a.hp<a.maxHp*.65)||options.find(o=>o.id==='skill'&&o.targetSide==='enemy')||options.find(o=>o.id==='attack')||options[0];
  if(a.hp<a.maxHp*.2)choice=options.find(o=>o.id==='retreat')||choice;
  assert.ok(choice);const target=choice.targetSide==='party'?hurt:targets(choice).sort((a,b)=>a.hp-b.hp)[0];return commit('battle_action',choice.id,x=>E.chooseBattleAction(x,choice.id,target?.id));
 }
 function annualActivity(){const key=s.age+':'+mode;if(annual.has(key))return false;annual.add(key);
  if(mode===1){const a=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason);if(a)return act(a.id);}
  if(mode===2)return available(['career_work','workshop_gather_wood','grow_read']);
  if(mode===3){const p=getContacts(s).find(p=>E.getActions(s).some(a=>a.id==='talk_'+p.id&&!a.disabledReason));if(p)return act('talk_'+p.id);}
  if(mode===9)return available(['grow_weapons','grow_defense','train']);
  if(mode===0)return available(['health_rest','grow_family','grow_read']);return false;
 }
 try{
  s=process.argv[5]?E.migrateSave(JSON.parse(readFileSync(process.argv[5],'utf8'))):await createLifeAtAge({seed,startAge:startingAge,difficulty:[6,7,8].includes(mode)?'balanced':'gentle',appearance:normalizeAppearance({ancestry:race,portraitPresentation:['masculine','feminine','androgynous'][index%3]})});assert.ok(E.validateSave(s));
  const opening={day:s.day,age:s.age,name:s.hero.name,membership:s.realm.faithId,kinAlive:s.life.people.find(p=>p.id==='kin')?.alive,companionLives:s.companions.map(p=>({id:p.id,alive:p.alive}))};
  const targetAge=Math.max(32,startingAge+4),religionGoal=3,questGoal=campaignFull.has(index)?'complete':'ferryman';
  for(let step=0;step<4800&&s.phase!=='retired';step++){
   const before=hash(s),rows=E.getActions(s);
   if(s.event)eventPick();
   else if(s.battle)battleTurn();
   else if(s.conversations.pending){const p=s.conversations.pending;commit('reply',p.personId,x=>E.replyMessage(x,p.personId,p.replies[0].id));}
   else if(s.justice.prison){if(s.hero.condition?.type==='vampire'&&s.hero.condition.hunger>=70)available(['curse_prison_blood','curse_prison_rations']);else if(s.hero.condition?.type==='lycanthrope'&&!E.getMoonForecast(s).prepared)act('curse_prison_refuge');else act('justice_serve');}
   else if(s.dungeon){if(s.dungeon.complete)act('explore_leave');else if(s.hero.hp<s.hero.maxHp*.35)act('explore_leave');else{const c=dungeonChoice(rows.filter(a=>!a.disabledReason).map(a=>({...a,id:a.id.slice(8)})));if(c)act('explore_'+c.id);}}
   else if(s.cartography?.pending)act('atlas_continue');
   else if(s.cartography?.offsite&&returnHex){const [q,r]=returnHex.split(',');act(`atlas_step_${q}_${r}`);}
   else if(s.timeline.journey){if(s.hero.condition?.type==='vampire'&&s.hero.condition.hunger>=70)act('feed_vampire');else commit('continue_journey','road',x=>E.continueJourney(x));}
   else if(E.getLifeCommitment(s)){const a=rows.find(a=>!a.disabledReason&&/(continue|stage)$/.test(a.id))||rows.find(a=>!a.disabledReason&&/(cancel|abandon|withdraw)$/.test(a.id));if(a)act(a.id);}
   else if(s.hero.condition?.type==='vampire'&&s.hero.condition.hunger>=70){if(mode===7){if(!act('curse_abstain'))commit('age_up','hunger_boundary',x=>E.ageUp(x));}else if(mode===6){if(!act('feed_vampire'))commit('age_up','hunger_boundary',x=>E.ageUp(x));}else if(!available(['curse_animal','feed_vampire']))commit('age_up','hunger_boundary',x=>E.ageUp(x));}
   else if(s.hero.condition?.type==='lycanthrope'&&mode===5&&!E.getMoonForecast(s).prepared){if(!s.hero.condition.accepted&&act('curse_accept')){}else available(['lycan_prepare','lycan_control']);}
   else if(s.hero.hp<s.hero.maxHp*.65&&!(mode===7&&s.hero.condition))available(['health_rest','camp_rest','atlas_rest']);
   else if(s.age>=16&&s.companions.some(p=>!p.recruited&&p.alive!==false&&!E.companionActionReason(s,p.id))){const p=s.companions.find(p=>!p.recruited&&p.alive!==false&&!E.companionActionReason(s,p.id));commit('recruit',p.id,x=>E.recruitCompanion(x,p.id));}
   else if(trainingNeeded>0){if(available(['grow_weapons','grow_defense','train']))trainingNeeded--;else trainingNeeded=0;}
   else if(s.age>=18&&mode>=4&&mode<=8&&!s.hero.condition&&curseAttempts<2){const vampire=[4,6,7].includes(mode),desired=vampire?'city':'forest',id=vampire?'vampire_invitation':'lycan_invitation';if(s.locationId!==desired)road(desired);else if(act(id))curseAttempts++;else{curseAttempts++;act('camp_rest');}}
   else if(s.hero.condition?.type==='vampire'&&!s.flags.travelByNight)act('night_travel');
   else if(s.age>=18&&s.hero.condition?.type==='vampire'&&mode===4&&!donorTried){const a=rows.find(a=>a.id.startsWith('sanctuary_donor_')&&!a.disabledReason);donorTried=true;if(a)act(a.id);else act('curse_remember');}
   else if(s.hero.condition?.type==='vampire'&&mode===4&&!donorPlanTried&&rows.some(a=>a.id==='curse_plan_blood')){donorPlanTried=true;act('curse_plan_blood');}
   else if(s.age>=16&&!faithChosen){const settlement=s.world.locations.find(p=>isSettlement(s.world,p.id));if(!rows.some(a=>a.id.startsWith('realm_join_'))){road(settlement.id);}else{faithChosen=true;if(membership)act('realm_join_'+membership);else if(s.realm.faithId)act('realm_leavefaith');else act('realm_custom');}}
   else if(s.age>=16&&s.realm.faithRecords.filter(r=>r.faithId===targetFaith).length<religionGoal){
    const p=s.realm.petition;
    if(p){if(p.stage==='field'){if(s.locationId!==p.destinationId)road(p.destinationId);else act('realm_inquiry');}else if(s.locationId!==p.boardId)road(p.boardId);else act('realm_report_'+['share','sell','suppress'][(index+p.index)%3]);}
    else if(regionAt(s).faithId===targetFaith&&rows.some(a=>a.id==='realm_petition')){act('realm_petition');}
    else{const board=s.world.locations.find(p=>isSettlement(s.world,p.id)&&regionAt(s,p.id)?.faithId===targetFaith);if(board)road(board.id);else{checks.push('no_surviving_'+targetFaith+'_institution');const alternate=s.world.locations.find(p=>isSettlement(s.world,p.id));assert.ok(alternate,'No surviving settlement');targetFaith=regionAt(s,alternate.id).faithId;road(alternate.id);}}
   }
   else if(s.age>=16&&!annual.has('ritual')){annual.add('ritual');if(!available(['realm_ritual','realm_custom']))act('grow_read');}
   else if(s.age>=16&&s.campaign.stage!==questGoal&&s.campaign.stage!=='complete'){
    if(s.hero.potions<2&&s.hero.gold>=20&&act('realm_potion')){}
    else if(s.campaign.act>=2&&!sideTried.has('confidant')){const q=campaignView(s).quests.find(q=>q.id==='side_confidant');if(q?.locationId===s.locationId){if(act('quest_side_confidant'))sideTried.add('confidant');else sideTried.add('confidant');}else if(q)road(q.locationId);}
    else if(s.campaign.act>=2&&index===10&&!sideTried.has('rival')){const q=campaignView(s).quests.find(q=>q.id==='side_rival');if(q.locationId===s.locationId){act('quest_side_rival');sideTried.add('rival');}else road(q.locationId);}
    else {const a=rows.find(a=>a.id==='quest_resume_expedition')||rows.find(a=>a.id==='quest_begin_'+s.campaign.stage),q=campaignView(s).quests.find(q=>q.id===s.campaign.stage);if(a&&!a.disabledReason)act(a.id);else if(q)road(q.locationId);}
   }
   else if(mode===9&&darkAttempts<3){darkAttempts++;act('curse_darkness');}
   else if(s.age>=targetAge){if(!act('retire')){if(s.timeline.yearTarget!==null)commit('continue_age','year',x=>E.continueAgeUp(x));else commit('age_up','year',x=>E.ageUp(x));}}
   else if(!annualActivity()){if(s.timeline.yearTarget!==null)commit('continue_age','year',x=>E.continueAgeUp(x));else commit('age_up','year',x=>E.ageUp(x));}
   if(hash(s)===before){if(++stalls>5)throw Error('No progress; '+s.notice+' / available: '+E.getActions(s).map(a=>a.id+(a.disabledReason?'!':'')).join(','));}else stalls=0;
  }
  assert.equal(s.phase,'retired','life did not conclude');assert.ok(s.chronicle);const reloaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(reloaded);assert.equal(hash(reloaded),hash(s));stats.reloads++;
  const report={index,seed,race,presentation:['masculine','feminine','androgynous'][index%3],profile:profiles[mode],requestedFaith,targetFaith,chosenMembership:membership,opening,status:'passed',ending:s.lineage.heroDeath?'death':'retirement',cause:s.lineage.heroDeath?.cause||null,age:s.age,day:s.day,name:s.hero.name,condition:s.hero.condition||null,faithRecords:s.realm.faithRecords.map(({faithId,index,setting,destinationId,archiveOnly,method,followedUp})=>({faithId,index,setting,destinationId,archiveOnly,method,followedUp})),campaign:{stage:s.campaign.stage,completed:s.campaign.completed,ending:s.campaign.ending,facts:s.campaign.facts},checks:[...new Set(checks)],stats,finalHash:hash(s),elapsedMs:Date.now()-begin,commands,scenes,journal};
  reports.push(report);writeFileSync(out+`.final-${index}.json`,JSON.stringify(s));
 }catch(error){reports.push({index,seed,race,profile:profiles[mode],targetFaith,status:'failed',error:error.stack,stats,trace:commands.slice(-40),commands,scenes,journal});if(s)writeFileSync(out+`.failed-${index}.json`,JSON.stringify(s));}
 assert.equal(runtimeDigest(),digest,'runtime changed during the life');
 writeFileSync(out,JSON.stringify({kind:'Automated public-command playthroughs; no human critics, stat patches or browser play',runtimeSha256:digest,harnessSha256:harnessDigest,start,count,completed:reports.length,reports},null,2)+'\n');
 console.log(JSON.stringify({index,status:reports.at(-1).status,age:reports.at(-1).age,commands:stats.commands,faithRecords:reports.at(-1).faithRecords?.length,campaign:reports.at(-1).campaign?.stage,error:reports.at(-1).error?.slice(0,500)}));
}
if(reports.some(r=>r.status==='failed'))process.exitCode=1;
