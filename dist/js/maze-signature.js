import { mazeJournal, bufferMazeJournal } from './maze-narrative.js';
import { beginMazeSettlement, endMazeSettlement } from './maze-receipt-runtime.js';
import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
import { RPG_DUNGEONS_V27, addRpgService, startMazeWork, continueMazeWork } from './rpg-depth-v27.js';
import { initializeBossStories, bossContactJournal, bossTargetActions, bossChoiceReason, resolveBossApproach, ownBossLead, bossLeadForTarget } from './boss-stories-v27.js';
import { generateMazeContentManifest, validateMazeContentManifest } from './maze-content-v1.js';
import { rememberMazeCompletion } from './maze-authored.js';
import { mazeActorId, mazeRunIdentity, sameMazeRun, validMazeActor } from './maze-provenance.js';

const catalog=ENCOUNTER_DESIGN_V27.bosses,unique=list=>[...new Set(list)];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':object(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
const offer=(id,label,description,days=0,cost=0,reason)=>({id,label,description,days,cost,group:'Dungeon',...(reason?{disabledReason:reason}:{})});
const sourceFor=id=>RPG_DUNGEONS_V27.find(d=>d.signature&&d.id===id);
const bossFor=(s,id)=>s.rpg?.bosses.find(b=>b.id===id);
const here=m=>m.content?.definition.rooms.find(r=>r.id===m.content.anchors.find(a=>a.cellId===m.position)?.slotId);
const anchor=(m,id)=>m.content.anchors.find(a=>a.slotId===id);
const seenBosses=m=>m.content.definition.bosses.filter(b=>m.visited.includes(anchor(m,m.content.definition.rooms.find(r=>r.bossId===b.id).id).cellId)||m.contentOutcomes.some(row=>row.bossId===b.id&&(row.actionId.startsWith('lead_')||row.actionId==='renew_contact'))).map(b=>b.id);
function refreshKnown(m){const known=seenBosses(m);if(known.length)m.contentFacts.knownBosses=known;else delete m.contentFacts.knownBosses;}
function target(s,m,bossId=null){
 const room=here(m),identity=mazeRunIdentity(m),actorId=mazeActorId(s),actorGeneration=s.dynasty?.generation||1;
 const contactLeads=m.contentOutcomes.filter(row=>['lead_contact','renew_contact'].includes(row.actionId)&&row.actorId===actorId&&row.actorGeneration===actorGeneration).map(row=>({...identity,...row,cellId:anchor(m,row.slotId).cellId}));
 return {...identity,actorId,actorGeneration,regionId:m.regionId,cellId:m.position,room:room?{...room,resolved:m.cleared.includes(m.position)}:null,knownBossIds:seenBosses(m),contactLeads,...(bossId?{bossId}:{})};
}
function note(s,m,ctx,text){s.notice=text;mazeJournal(s,m,ctx,'A decision becomes part of the world',text,'rpg');s.rpg.history.push({day:s.day,title:'A decision becomes part of the world',text,locationId:s.locationId});s.rpg.history=s.rpg.history.slice(-180);}
function record(s,m,actionId,work,extra={}){m.contentOutcomes.push({slotId:here(m).id,actionId,startedDay:work?.startedDay??s.day,day:s.day,days:work?.totalDays??0,cost:work?.cost??0,actorId:work?.details?.actorId||mazeActorId(s),actorGeneration:work?.details?.actorGeneration||s.dynasty?.generation||1,...extra});refreshKnown(m);}
function cleared(m,id=here(m).id){m.cleared=unique([...m.cleared,anchor(m,id).cellId]);}
const present=(s,b,m)=>!!b&&b.locationId===m.locationId&&s.locationId===m.locationId&&b.people.every(p=>p.alive!==false&&p.locationId===m.locationId);
function discover(s,m,bossId){const b=bossFor(s,bossId);if(b?.mazeDiscovery&&b.mazeDiscovery.discoveredDay===null){b.mazeDiscovery.discoveredDay=s.day;b.mazeDiscovery.actorId=mazeActorId(s);b.mazeDiscovery.actorGeneration=s.dynasty?.generation||1;}refreshKnown(m);}

/** Read-only global identity decision, before spending an entry day. */
export function signatureMazeAllowed(s,spec){
 const source=sourceFor(spec.sourceId);if(!source)return {allowed:true};
 const locationId=spec.locationId||s.locationId,regionId=s.realm?.sites[locationId]?.regionId;
 if(regionId!==source.regionId)return {allowed:false,reason:'This descent belongs to another region.'};
 if(s.mazeBook?.contentReceipts?.some(r=>r.family==='signature'&&r.sourceId===source.id)||s.rpg?.expeditions?.some(x=>x.id===source.id&&x.completed)||s.rpg?.services?.some(v=>v.source===source.id&&v.kind==='route'))return {allowed:true,priorComplete:true};
 const bosses=catalog.filter(b=>b.regionId===source.regionId).map(d=>bossFor(s,d.id)).filter(Boolean);
 if(bosses.some(b=>b.locationId!==locationId))return {allowed:false,reason:'This account is already bound to its original hearth. Its people and earlier decisions cannot be copied here.'};
 if(s.rpg?.expeditions?.some(x=>x.id===source.id&&!x.completed))return {allowed:false,reason:'Resume the original saved descent. Its people and attended accounts remain there.'};
 if(bosses.some(b=>!b.resolutions.length&&Object.values(b.leads).some(lead=>lead!==null)&&!b.mazeDiscovery))return {allowed:false,reason:'This account already has attended work in its original descent. Resume that record instead.'};
 return {allowed:true};
}
export function initializeSignatureMaze(s,m,layout){
 const decision=signatureMazeAllowed(s,m),content=generateMazeContentManifest({...m,version:2},s.seed,layout);
 if(!decision.allowed||decision.priorComplete||!content||content.family!=='signature')return false;
 const before=new Set(s.rpg.bosses.map(b=>b.id));initializeBossStories(s,{regionId:m.regionId,locationId:m.locationId});
 m.version=2;m.content=content;
 for(const b of s.rpg.bosses)if(!before.has(b.id))b.mazeDiscovery={...mazeRunIdentity(m),discoveredDay:null,actorId:null,actorGeneration:null};
 m.contentFacts=m.questId?{questId:m.questId}:{};m.contentOutcomes=[];return true;
}
export function enterSignatureMazeRoom(s,m){
 if(m.content?.family!=='signature')return false;const room=here(m);if(!room?.bossId)return false;
 discover(s,m,room.bossId);const b=bossFor(s,room.bossId);
 if(b?.resolutions.length&&!m.cleared.includes(m.position)){
  cleared(m);record(s,m,'prior_resolution',null,{bossId:b.id,resolutionId:b.resolutions[0].id,resolutionDay:b.resolutions[0].day});
  s.notice='This guardian’s earlier resolution already grants passage. No reward, property or service is repeated.';
 }
 return true;
}
function missingGuardReason(s,m){
 const missing=m.content.requiredGuardians.filter(g=>!m.cleared.includes(anchor(m,g.slotId).cellId));if(!missing.length)return null;
 const named=missing.find(g=>seenBosses(m).includes(g.bossId));return named?catalog.find(b=>b.id===named.bossId).name+' still holds an unresolved passage.':'A second passage seal is still shut. The room gives no name or route to its keeper.';
}
function recipes(s,m,{paidGold=false}={}){
 const room=here(m);if(!room)return [];const done=m.cleared.includes(m.position),result=[],row=(id,label,description,days=0,cost=0,reason,extra={})=>result.push({...offer('maze_signature_'+id,label,description,days,cost,reason),choice:id,...extra});
 if(room.id==='crossing'&&!done){
  row('repair','Repair the crossing',`2 actual days, ore 1 (have ${s.equipment.materials.ore}) and cloth 1 (have ${s.equipment.materials.cloth}). Permanently clear this hazard.`,2,0,s.equipment.materials.ore<1||s.equipment.materials.cloth<1?'Requires one ore and one cloth.':null);
  row('survey','Survey a safe passage',`2 actual days. Survival ${s.hero.skills.survival}/4; a completed survey finds a safe passage and two herbs.`,2,0,s.hero.skills.survival<4?'Requires survival 4.':null);
  row('risk','Cross the broken span','1 actual day and ten health. This can end a weak life.',1);
 }
 if(room.id==='ledger'&&!done)row('copy','Copy the surviving ledger','1 actual day. Retain actual archive evidence.',1);
 if(room.id==='stores'){
  if(!m.collected.includes(m.position))row('cache','Recover the side stores','1 actual day. Two ore, one cloth and eight gold, once.',1);
  if(!done)row('leave_stores','Leave the empty stores','Clear this side room without receiving a reward.');
 }
 const t=target(s,m);
 for(const item of bossTargetActions(s,t)){
  const match=item.id.match(/^rpg_boss_(.+)_(archive|survey|contact)$/);
  if(match){row('lead_'+match[2]+'_'+m.content.definition.bosses.findIndex(b=>b.id===match[1]),item.label,item.description,item.days,item.cost,item.disabledReason,{choice:'lead_'+match[2],bossId:match[1]});continue;}
  const d=room.bossId&&catalog.find(b=>b.id===room.bossId),a=d?.noncombatApproaches[Number(item.id.slice(16))];
  if(a)row('approach_'+a.id,item.label,item.description,item.days,item.cost,bossChoiceReason(s,d.id,a.id,{paidGold,target:t}),{choice:a.id,bossId:d.id});
 }
 if(room.bossId&&!done&&!bossFor(s,room.bossId)?.resolutions.length)result.push({...offer('maze_fight','Face the guardian','Start the displayed battle. Victory clears only this actual guardian; no unperformed rescue, returned property or peaceful service is claimed.'),choice:'combat',bossId:room.bossId});
 if(room.id==='goal'&&!m.objective)for(const id of ['care','trade','scheme'])row(id,id==='care'?'Open the recovered room to its neighbors':id==='trade'?'Establish a limited paid practice':'Claim the recovered resource for yourself','3 actual days. Receive '+(id==='care'?12:id==='trade'?35:55)+' gold and create a usable '+(id==='care'?'shared':id==='trade'?'priced':'controlled')+' service.',3,id==='care'?8:0,missingGuardReason(s,m)||(!paidGold&&id==='care'&&s.hero.gold<8?'Requires 8 gold.':null));
 return result;
}
export function signatureMazeActions(s){
 const m=s.maze;if(m?.content?.family!=='signature')return [];
 if(s.rpg?.project?.kind==='maze')return [offer('maze_work_continue','Keep the time you agreed',`${s.rpg.project.remainingDays} actual days remain. Paid fees are not charged again.`),offer('maze_work_cancel','Withdraw from this work','Keep attended time and fees. Receive no unfinished result.')];
 return recipes(s,m).map(({choice,bossId,...row})=>row);
}
export function signatureMazeRoomText(m,s=null){
 const room=here(m);if(!room)return null;let body={entry:'Daylight reaches the outside stair. Living households keep separate accounts of the passages below. The ordinary maze still has its own dangers.',crossing:'A broken span interrupts the working route. Repair it, survey a safe passage, or accept the actual danger.',ledger:'A surviving side ledger holds particular accounts. Copying it and attending each guardian’s own account are separate work.',stores:'The side stores hold two ore, one cloth and eight gold, once. A working-route survey and the waiting households keep their own accounts.',goal:m.objective?'Your work here is complete. A return stair leads to the surface.':'The working room can become a shared, priced or controlled service after both guardians’ passages are resolved.'}[room.id];
 if(room.bossId){const d=m.content.definition.bosses.find(b=>b.id===room.bossId),b=s&&bossFor(s,room.bossId);body=d.rumor+'\n\n'+d.mechanic+(d.objective?'\n\n'+d.objective:'');
  if(b&&!m.cleared.includes(m.position))body+='\n\nThis guardian’s own leads: '+['archive','survey','contact'].map(k=>k+' '+(ownBossLead(bossLeadForTarget(b,k,target(s,m)),b,target(s,m))?'attended':'not attended')).join(' · ')+'.';
 }
 if(room.id==='entry'&&s&&(s.dynasty?.generation||1)!==m.generation)body+=' The explored map is the earlier expedition’s recorded route knowledge, not your own memories. Personal household permission must be renewed with the living people here.';
 if(m.cleared.includes(m.position)&&room.id!=='goal')body+=' You have already resolved this room.';
 return {title:room.title,body};
}
function finishChoice(s,m,work,ctx){
 if(s.maze!==m||!validWorkTarget(s,m,work))return false;
 const pick=recipes(s,m,{paidGold:work.paid}).find(row=>row.choice===work.choice&&row.bossId===(work.details.bossId||undefined)&&row.id===work.details.actionId&&!row.disabledReason);
 if(!pick){s.notice='The recorded work cannot finish under the present conditions. Attendance and paid fees remain spent; no result was granted.';return false;}
 const choice=work.choice,room=here(m),before=beginMazeSettlement(s,m),outcomeCount=m.contentOutcomes.length;let text='',fatal=false;
 if(pick.bossId){const b=bossFor(s,pick.bossId);if(!present(s,b,m)||stable(work.details.participantIds)!==stable(b.people.map(p=>p.id)))return false;
  const journal=bufferMazeJournal(s,m,ctx);resolveBossApproach(s,work,journal.context,{target:target(s,m,b.id),onLead(b,kind,lead,{renewal}){record(s,m,renewal?'renew_contact':'lead_'+kind,work,{bossId:b.id,participantIds:b.people.map(p=>p.id)});discover(s,m,b.id);},onResolved(b,a){cleared(m);record(s,m,'approach_'+a.id,work,{bossId:b.id,participantIds:b.people.map(p=>p.id)});}});const outcome=m.contentOutcomes.length>outcomeCount?m.contentOutcomes.at(-1):null;if(outcome)endMazeSettlement(s,m,{kind:'signature',cellId:m.position,slotId:room.id,actionId:outcome.actionId,subjectId:pick.bossId},before);journal.flush();return true;
 }
 if(choice==='copy'){cleared(m);m.contentFacts.archive=true;text='You copied the side ledger during one attended day. Its evidence remains in this descent.';}
 else if(choice==='repair'){s.equipment.materials.ore--;s.equipment.materials.cloth--;cleared(m);m.contentFacts.repair=true;text='One ore and one cloth repaired the actual crossing; the same hazard will not return.';}
 else if(choice==='survey'){cleared(m);m.contentFacts.survey=true;s.flags.herbs=(s.flags.herbs||0)+2;text='Two real survey days found a safe passage and two herb bundles.';}
 else if(choice==='risk'){cleared(m);s.hero.hp=Math.max(0,s.hero.hp-10);fatal=!s.hero.hp;text='You crossed the unrepaired hazard and lost ten actual health.';}
 else if(choice==='cache'){cleared(m);m.collected=unique([...m.collected,m.position]);m.contentFacts.claimedStores=true;s.equipment.materials.ore+=2;s.equipment.materials.cloth++;s.hero.gold+=8;text='You recovered two ore, one cloth, and eight gold from the finite side cache. 8 gold actually changed hands.';}
 else if(choice==='leave_stores'){cleared(m);text='You left the side stores without receiving a reward.';}
 else if(['care','trade','scheme'].includes(choice)){
  // The source service and receipt are global. Earlier resolutions never pay twice.
  if(s.mazeBook.contentReceipts?.some(r=>r.family==='signature'&&r.sourceId===m.sourceId)||s.rpg.services.some(v=>v.source===m.sourceId&&v.kind==='route'))return false;
  cleared(m);m.objective=true;m.contentFacts.objectiveMethod=choice;const reward=choice==='care'?12:choice==='trade'?35:55;s.hero.gold+=reward;
  addRpgService(s,{kind:'route',rule:choice==='scheme'?'controlled':choice==='trade'?'priced':'shared',locationId:m.locationId,source:m.sourceId});rememberMazeCompletion(s,m,choice);
  if(choice==='scheme')ctx.breakOath?.('You claimed a shared dungeon resource through pressure.');
  text=(choice==='care'?'You establish a shared service using the accounts and people actually met in this descent.':choice==='trade'?'You establish a priced service with its limits recorded.':'You establish a controlled service. Excluded households retain the account of your claim.')+` ${reward} gold actually changed hands.`;
 }else return false;
 record(s,m,choice,work);endMazeSettlement(s,m,{kind:'signature',cellId:m.position,slotId:room.id,actionId:choice,subjectId:null},before);note(s,m,ctx,text);if(fatal)ctx.endLife?.('An unrepaired dungeon crossing ended this life.');return true;
}
export function applySignatureMazeAction(s,id,ctx){
 const m=s.maze;if(m?.content?.family!=='signature')return false;
 if(id==='maze_work_continue'){if(!validSignatureMazeWork(s,m))return false;return continueMazeWork(s,ctx,work=>finishChoice(s,m,work,ctx));}
 if(id==='maze_work_cancel'){const p=s.rpg?.project;if(p?.kind!=='maze'||p.details.mazeId!==m.id)return false;s.notice=`${p.completedDays} days and ${p.paid?p.cost:0} gold remain spent. No unfinished result was received.`;const current=validSignatureMazeWork(s,m);s.rpg.project=null;mazeJournal(s,m,ctx,'A commitment withdrawn',s.notice,'exploration',{},current);return true;}
 const pick=recipes(s,m).find(row=>row.id===id&&!row.disabledReason);if(!id.startsWith('maze_signature_')||!pick||s.rpg?.project)return false;
 const details={...mazeRunIdentity(m),actorId:mazeActorId(s),actorGeneration:s.dynasty?.generation||1,slotId:here(m).id,cellId:m.position,actionId:id,...(pick.bossId?{bossId:pick.bossId,participantIds:bossFor(s,pick.bossId).people.map(p=>p.id)}:{})};
 return startMazeWork(s,details,pick.choice,pick.days,pick.cost,ctx,work=>finishChoice(s,m,work,ctx));
}
export function signatureMazeBattleSpec(m){const room=here(m);return room?.bossId?{encounterId:'rpg_guardian',bossId:room.bossId,slotId:room.id}:null;}
export function afterSignatureMazeBattle(s,m,pending,ctx){
 const spec=signatureMazeBattleSpec(m),c=pending.context;if(!spec||!m.cleared.includes(m.position)||c?.kind!=='maze'||c.mazeId!==m.id||c.runSeed!==m.seed||c.runGeneration!==String(m.generation)||c.actorId!==mazeActorId(s)||c.contentVersion!=='1'||c.sourceId!==m.sourceId||c.locationId!==m.locationId||s.locationId!==m.locationId||c.slotId!==spec.slotId||c.bossId!==spec.bossId||c.encounterId!==spec.encounterId||c.roomId!==String(m.position)||pending.encounterId!==spec.encounterId||typeof pending.instanceId!=='string'||!pending.instanceId||pending.instanceId.length>160)return false;
 const b=bossFor(s,spec.bossId);if(!b||b.locationId!==m.locationId||b.resolutions.length||m.contentOutcomes.some(r=>r.bossId===b.id&&['combat','prior_resolution'].includes(r.actionId)||r.actionId.startsWith('approach_')&&r.bossId===b.id))return false;
 b.resolutions.push({id:'combat',day:s.day,days:0,gold:0,outcome:'The actual guardian was defeated. No unperformed rescue or returned property was claimed.',participantIds:[],...mazeRunIdentity(m),actorId:mazeActorId(s),actorGeneration:s.dynasty?.generation||1,slotId:spec.slotId,cellId:m.position});
 record(s,m,'combat',null,{bossId:b.id,battleId:pending.instanceId,participantIds:[]});discover(s,m,b.id);note(s,m,ctx,'Victory clears '+here(m).title+'. The side accounts and final room remain separate work.');return true;
}
function validWorkTarget(s,m,p){
 const d=p.details,room=here(m);if(!object(d)||Object.keys(d).some(key=>!['mazeId','runSeed','runGeneration','manifestVersion','family','sourceId','locationId','actorId','actorGeneration','slotId','cellId','actionId','bossId','participantIds'].includes(key)))return false;return p.kind==='maze'&&p.id===m.id&&p.locationId===m.locationId&&s.locationId===m.locationId&&sameMazeRun(d,m)&&d.actorId===mazeActorId(s)&&d.actorGeneration===(s.dynasty?.generation||1)&&d.cellId===m.position&&d.slotId===room?.id;
}
export function validSignatureMazeWork(s,m){
 const p=s.rpg?.project;if(p?.kind!=='maze')return true;if(!validWorkTarget(s,m,p))return false;
 const pick=recipes(s,m,{paidGold:p.paid}).find(row=>row.id===p.details.actionId&&row.choice===p.choice&&row.bossId===(p.details.bossId||undefined));
 if(!pick||pick.days!==p.totalDays||pick.cost!==p.cost)return false;
 return !pick.bossId||Array.isArray(p.details.participantIds)&&stable(p.details.participantIds)===stable(bossFor(s,pick.bossId)?.people.map(p=>p.id));
}

export function validateSignatureMaze(s,m,layout){
 if(m.version!==2||m.content?.family!=='signature'||!validateMazeContentManifest(m.content,m,s.seed,layout)||!object(m.contentFacts)||!Array.isArray(m.contentOutcomes)||m.contentOutcomes.length>448||![m.visited,m.cleared,m.collected].every(v=>Array.isArray(v)&&v.length<=121)||s.realm.sites[m.locationId]?.regionId!==m.regionId)return false;
 const facts=m.questId?{questId:m.questId}:{},clear=new Set(['entry']),collected=new Set(),leadKeys=new Set(),contactKeys=new Set();let lastDay=m.startedDay,complete=false;
 for(const row of m.contentOutcomes){
  if(!object(row)||typeof row.slotId!=='string'||typeof row.actionId!=='string'||row.actionId.length>100)return false;
  const extra=row.actionId==='combat'?['bossId','battleId','participantIds']:row.actionId==='prior_resolution'?['bossId','resolutionId','resolutionDay']:(row.actionId.startsWith('lead_')||row.actionId==='renew_contact')||row.actionId.startsWith('approach_')?['bossId','participantIds']:[];
  if(Object.keys(row).some(key=>!['slotId','actionId','startedDay','day','days','cost','actorId','actorGeneration',...extra].includes(key)))return false;
  const room=m.content.definition.rooms.find(r=>r.id===row.slotId),cell=room&&anchor(m,room.id).cellId,id=row.actionId,b=row.bossId&&bossFor(s,row.bossId),def=row.bossId&&catalog.find(b=>b.id===row.bossId),int=(v,a=0,z=s.day)=>Number.isSafeInteger(v)&&v>=a&&v<=z;
  if(!room||!m.visited.includes(cell)||!validMazeActor(s,row.actorId)||!int(row.actorGeneration,1,s.dynasty?.generation||5000)||!int(row.day,lastDay)||!int(row.startedDay,lastDay,row.day)||!int(row.days,0,7)||!int(row.cost,0,1000)||row.day-row.startedDay<row.days)return false;lastDay=row.day;
  let days=0,cost=0;
  if(id.startsWith('lead_')){
   const kind=id.slice(5),key=row.bossId+':'+kind,allowed=kind==='archive'?room.id==='ledger'&&clear.has('ledger'):kind==='survey'?room.id==='stores'&&clear.has('stores'):kind==='contact'&&['entry','crossing','stores'].includes(room.id);
   if(!allowed||!b||b.locationId!==m.locationId||!def||def.regionId!==m.regionId||leadKeys.has(key)||b.resolutions.some(r=>r.day<row.day)||!ownBossLead(b.leads[kind],b,mazeRunIdentity(m))||b.leads[kind].day!==row.day||b.leads[kind].slotId!==room.id||b.leads[kind].cellId!==cell||b.leads[kind].actorId!==row.actorId||b.leads[kind].actorGeneration!==row.actorGeneration||stable(row.participantIds)!==stable(b.people.map(p=>p.id)))return false;
   leadKeys.add(key);if(kind==='contact')contactKeys.add(b.id+':'+row.actorGeneration+':'+row.actorId);days=kind==='archive'?1:2;
  }else if(id==='renew_contact'){
   const key=row.bossId+':'+row.actorGeneration+':'+row.actorId;
   if(!['entry','crossing','stores'].includes(room.id)||!b||b.locationId!==m.locationId||!leadKeys.has(b.id+':contact')||contactKeys.has(key)||b.resolutions.some(r=>r.day<row.day)||stable(row.participantIds)!==stable(b.people.map(p=>p.id)))return false;
   contactKeys.add(key);days=2;
  }else if(id.startsWith('approach_')||id==='combat'||id==='prior_resolution'){
   if(!room.bossId||room.bossId!==row.bossId||!b||b.locationId!==m.locationId||clear.has(room.id))return false;const resolution=b.resolutions[0];if(!resolution)return false;
   if(id==='prior_resolution'){if(row.resolutionId!==resolution.id||row.resolutionDay!==resolution.day||resolution.day>row.day||sameMazeRun(resolution,m))return false;}
   else{
    if(!sameMazeRun(resolution,m)||resolution.actorId!==row.actorId||resolution.actorGeneration!==row.actorGeneration||resolution.slotId!==room.id||resolution.cellId!==cell||resolution.day!==row.day)return false;
    if(id==='combat'){if(resolution.id!=='combat'||typeof row.battleId!=='string'||row.battleId.length>160||!row.battleId||stable(row.participantIds)!=='[]')return false;}
    else{const a=def?.noncombatApproaches.find(a=>a.id===id.slice(9));if(!a||resolution.id!==a.id||!['archive','survey'].every(k=>leadKeys.has(b.id+':'+k))||!contactKeys.has(b.id+':'+row.actorGeneration+':'+row.actorId)||stable(row.participantIds)!==stable(b.people.map(p=>p.id)))return false;days=a.costs.days;cost=a.costs.gold||0;}
   }
   clear.add(room.id);
  }else if(id==='copy'){if(room.id!=='ledger'||clear.has(room.id))return false;days=1;facts.archive=true;clear.add(room.id);}
  else if(['repair','survey','risk'].includes(id)){if(room.id!=='crossing'||clear.has(room.id))return false;days=id==='risk'?1:2;if(id!=='risk')facts[id]=true;clear.add(room.id);}
  else if(id==='cache'){if(room.id!=='stores'||collected.has(room.id))return false;days=1;facts.claimedStores=true;collected.add(room.id);clear.add(room.id);}
  else if(id==='leave_stores'){if(room.id!=='stores'||clear.has(room.id))return false;clear.add(room.id);}
  else if(['care','trade','scheme'].includes(id)){if(room.id!=='goal'||complete||!m.content.requiredGuardians.every(g=>clear.has(g.slotId)))return false;days=3;cost=id==='care'?8:0;complete=true;facts.objectiveMethod=id;clear.add(room.id);}
  else return false;
  if(row.days!==days||row.cost!==cost)return false;
 }
 const known=seenBosses(m);if(known.length)facts.knownBosses=known;
 if(stable(m.contentFacts)!==stable(facts)||m.objective!==complete)return false;
 for(const a of m.content.anchors)if(m.cleared.includes(a.cellId)!==clear.has(a.slotId)||m.collected.includes(a.cellId)!==collected.has(a.slotId))return false;
 for(const g of m.content.requiredGuardians){const b=bossFor(s,g.bossId);if(!b||b.locationId!==m.locationId)return false;if(b.mazeDiscovery&&sameMazeRun(b.mazeDiscovery,m)){const discovered=known.includes(b.id),snapshotDay=['unfinished','complete'].includes(m.status)&&Number.isSafeInteger(m.endedDay)?m.endedDay:s.day;/* Archived physical snapshots predate later attended discovery in a resumed run. */if(discovered!==(b.mazeDiscovery.discoveredDay!==null&&b.mazeDiscovery.discoveredDay<=snapshotDay))return false;}}
 return true;
}


// Called only after complete maze/RPG validation. Canonical text alone is not
// proof: require the retained attended owner and its exact original history.
export function signatureContactNarratives(s,m){
 if(m?.version!==2||m.content?.family!=='signature')return [];
 const rows=[];
 for(const outcome of m.contentOutcomes){
  if(!['lead_contact','renew_contact'].includes(outcome.actionId))continue;
  const generation=outcome.actorId===s.dynasty?.activePersonId?s.dynasty.generation:s.dynasty?.history.find(r=>r.personId===outcome.actorId)?.generation;
  if(generation!==outcome.actorGeneration)continue;
  const boss=bossFor(s,outcome.bossId),definition=catalog.find(b=>b.id===outcome.bossId);
  if(!boss||!definition)continue;
  const note=bossContactJournal(boss,definition,{renewal:outcome.actionId==='renew_contact'});
  if(s.rpg.history.filter(r=>r.day===outcome.day&&r.locationId===m.locationId&&r.title===note.title&&r.text===note.text).length!==1)continue;
  rows.push({...note,day:outcome.day,generation,key:JSON.stringify([mazeRunIdentity(m),outcome])});
 }
 return rows;
}
