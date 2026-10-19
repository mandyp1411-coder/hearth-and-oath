import { mazeDimensions, newMazeDimensions, validMazeDimensions } from './maze-dimensions.js';
import { mazeJournal } from './maze-narrative.js';
import { validateExpeditionReceipts } from './maze-receipts.js';
import { quoteMazeFieldAssist, applyMazeFieldAssist, validateMazeFieldAssists, validateMazeFieldAssistReceipt } from './companion-field-assists.js';
import { describeMazeFieldAssist, mazeFieldAssistLabel } from './companion-field-assists-ui.js';
import { recordGenericMazeInscription } from './maze-inscription-note.js';
import { personalReadiness } from './people-context.js';
import { mazeReceiptEntrySnapshot, openMazeEntryVisit, prepareMazeObservation, reconcileMazeDays, ensureMazeVisit, recordMazeUse, recordMazeFee, recordMazeRetreat, recordMazeFieldAssist, beginMazeSettlement, endMazeSettlement, closeMazeVisit, inheritedExpeditionReceiptFields, physicalMazeForInheritance } from './maze-receipt-runtime.js';
import { seededRoll } from './world.js';
import { mazeMovementForecast, mazeMovementDescription } from './maze-rules.js';
import { DUNGEONS } from './exploration.js';
import { RPG_DUNGEONS_V27, addRpgService, validateRpg } from './rpg-depth-v27.js';
import { awardLoot } from './adventuring.js';
import { restAtCamp, mazeCampDescription } from './travel-energy.js';
import { mazeManifestRoom, validateMazeContentManifest } from './maze-content-v1.js';
import { mazeActorId, validMazeActor, sameMazeRun, mazeRunIdentity } from './maze-provenance.js';
import { validateMazeMapMemory } from './maze-map-memory.js';
import { initializeAuthoredMaze, authoredMazeRoomText, authoredMazeActions, applyAuthoredMazeAction, afterAuthoredMazeBattle, authoredMazeBattleSpec, validateAuthoredMaze, validAuthoredMazeWork } from './maze-authored.js';
import { signatureContactNarratives, signatureMazeAllowed, initializeSignatureMaze, signatureMazeActions, signatureMazeRoomText, applySignatureMazeAction, signatureMazeBattleSpec, afterSignatureMazeBattle, enterSignatureMazeRoom, validateSignatureMaze, validSignatureMazeWork } from './maze-signature.js';

const copy=v=>structuredClone(v),N=11,COUNT=N*N,dirs=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]],cache=new Map();
const action=(id,label,description,days=0,cost=0,disabledReason)=>({id,label,description,days,cost,group:'Dungeon',...(disabledReason?{disabledReason}:{})});
const waiting=s=>s.phase==='retired'||s.event||s.battle||s.conversations?.pending;
const unique=a=>[...new Set(a)];
export function initializeMaze(s){if(!s.mazeBook)s.mazeBook={version:1,nextRun:1,records:[]};if(s.maze===undefined)s.maze=null;}
/** Every square is a room. Walls and a stable maze seed define its doors. */
export function mazeLayout(m){
 const {size:N,count:COUNT}=mazeDimensions(m),key=m.seed+(m.layoutVersion===1?':layout1:'+N:'');if(cache.has(key))return cache.get(key);
 const cells=Array.from({length:COUNT},(_,id)=>({id,x:id%N,y:Math.floor(id/N),doors:[],kind:'empty'}));let sequence=0;
 const roll=max=>seededRoll(key,'carve:'+sequence++,max),seen=new Set([0]),stack=[0];
 while(stack.length){const at=stack.at(-1),c=cells[at],choices=dirs.map(([,dx,dy])=>[c.x+dx,c.y+dy]).filter(([x,y])=>x>=0&&x<N&&y>=0&&y<N).map(([x,y])=>y*N+x).filter(id=>!seen.has(id));if(!choices.length){stack.pop();continue;}const to=choices[roll(choices.length)];cells[at].doors.push(to);cells[to].doors.push(at);seen.add(to);stack.push(to);}
 const distance=Array(COUNT).fill(-1),parents=Array(COUNT).fill(-1),queue=[0];distance[0]=0;for(let i=0;i<queue.length;i++)for(const to of cells[queue[i]].doors)if(distance[to]<0){distance[to]=distance[queue[i]]+1;parents[to]=queue[i];queue.push(to);}
 const goal=distance.indexOf(Math.max(...distance)),guardian=parents[goal];
 for(const c of cells)for(const [,dx,dy] of dirs.slice(1,3)){const x=c.x+dx,y=c.y+dy,to=y*N+x;if(x>=N||y>=N||x<0||y<0||c.id===goal||to===goal||c.doors.includes(to))continue;if(roll(100)<8){c.doors.push(to);cells[to].doors.push(c.id);}}
 for(const c of cells){const r=seededRoll(key,'room:'+c.id,100);c.kind=r<48?'empty':r<63?'cache':r<77?'enemy':r<86?'trap':r<94?'camp':'inscription';c.variant=seededRoll(key,'description:'+c.id,6);c.enemy=['beast','undead','spirit','construct','bandit','aberration'][seededRoll(key,'enemy:'+c.id,6)];}
 cells[0].kind='entrance';cells[goal].kind='objective';cells[guardian].kind='guardian';
 const layout={size:N,cells,goal,guardian};cache.set(key,layout);if(cache.size>100)cache.delete(cache.keys().next().value);return layout;
}
export function mazeEntrySpec(s,id,questId=null){
 if(id==='adventure_descend')return {kind:'radiant',sourceId:'uncharted',title:'The Uncharted Depths',tier:Math.min(4,1+Math.floor(s.hero.level/5)),questId:null};
 if(id.startsWith('adventure_pursue_')){const c=s.adventuring.contracts.find(c=>c.id===id.slice(17)&&c.status==='active'&&c.destinationId===s.locationId);return c?{kind:'contract',sourceId:c.id,title:c.type==='relic'?'The Sealed Chambers':c.type==='escort'?'The Lost Passage':'The Outlaw’s Hideout',tier:c.tier,questId:null}:null;}
 if(id.startsWith('rpg_enter_')){const d=RPG_DUNGEONS_V27.find(d=>d.id===id.slice(10));return d?{kind:'regional',sourceId:d.id,title:d.title,tier:d.signature?3:2,questId:null,...(d.signature?{regionId:d.regionId}:{})}:null;}
 const sourceId=id.replace(/^explore_enter_/,''),d=DUNGEONS.find(d=>d.id===sourceId&&d.locationId===s.locationId);return d?{kind:'authored',sourceId,title:d.title,tier:sourceId==='covenant_core'?4:sourceId==='watchtower'?3:2,questId}:null;
}
/** Content never changes the cached layout or its doors. */
export function mazeRoomCell(m,id=m.position){const cell=mazeLayout(m).cells[id];return m.version===2?mazeManifestRoom(m.content,cell):cell;}
export function mazeFieldAssistRuntime(s){
 const blocked=s.justice?.prison||s.society?.project||s.community?.project?.commitment||s.lineage?.adoption?.preparation||['preparing','bout'].includes(s.yardTournament?.stage);
 return {roomAt:mazeRoomCell,runIdentity:mazeRunIdentity,actorId:mazeActorId,validActor:validMazeActor,
  participationReason:(state,id)=>personalReadiness(state,id)||(id==='mira'&&state.flags?.miraWithdrawn?'This companion’s stated refusal of active travel remains in force.':null),
  ...(blocked?{contextReason:'Finish or pause your current commitment before asking for field help.'}:{})};
}
export function mazeFieldAssistQuote(s,kind,helperId,targetId='hero'){return quoteMazeFieldAssist(s,kind,helperId,targetId,mazeFieldAssistRuntime(s));}
function assistSelector(s,kind,helperId,targetId){
 const personId=id=>s.lineage?.people?.find(p=>p.source==='companion'&&p.localId===id)?.id||id;
 const m=s.maze;
 return 'maze_assist_'+[kind,helperId,targetId,mazeActorId(s),s.dynasty?.generation||1,personId(helperId),targetId==='hero'?mazeActorId(s):personId(targetId),m.id,m.seed,m.generation,m.position,m.version].map(encodeURIComponent).join('|');
}
export function mazeFieldAssistActions(s){
 const m=s.maze;if(!m||waiting(s))return [];const c=mazeRoomCell(m);if(c.contentSlot)return [];
 const done=m.cleared.includes(c.id),result=[],roles={rogue:'scout',warrior:'protector',mage:'scholar',healer:'healer'};
 const party=(s.companions||[]).filter(p=>p.recruited&&p.active).slice(0,3);
 for(const helper of party){const kind=roles[helper.role];if(!kind||(['scout','protector'].includes(kind)?c.kind!=='trap'||done:kind==='scholar'?c.kind!=='inscription'||done:false))continue;
  for(const targetId of kind==='healer'?['hero',...party.map(p=>p.id)]:['hero']){
   const q=mazeFieldAssistQuote(s,kind,helper.id,targetId),label=helper.name+': '+mazeFieldAssistLabel(kind)+(kind==='healer'?' · '+q.targetName:'');
   result.push({...action(assistSelector(s,kind,helper.id,targetId),label,describeMazeFieldAssist(q),0,0,q.disabledReason),fieldAssist:{kind,helperId:helper.id,targetId}});
  }
 }
 return result;
}
/** Shared read-only adapter: annotation data is not room/action authority. */
export function mazeMapRuntime(s){
 const m=s.maze,generation=s.dynasty?.generation||1;
 return {context:{day:s.day,generation,actor:{id:mazeActorId(s),name:s.hero?.name||'',generation},
  editingAllowed:!!m&&m.status==='inside'&&!waiting(s)&&m.pendingRoom===null&&s.rpg?.project?.kind!=='maze'},
  rules:{contentIdentity:mazeRunIdentity,kindAt:(run,id)=>mazeRoomCell(run,id).kind,validActor:id=>validMazeActor(s,id)}};
}
function archive(s,m,status){const row={...copy(m),status,pendingRoom:null,endedDay:s.day},i=s.mazeBook.records.findIndex(r=>r.id===m.id);if(i>=0)s.mazeBook.records[i]=row;else s.mazeBook.records.push(row);while(s.mazeBook.records.length>80){let at=s.mazeBook.records.findIndex(r=>r.kind==='radiant');if(at<0)at=s.mazeBook.records.findIndex(r=>r.version!==2||r.objective);s.mazeBook.records.splice(at<0?0:at,1);}}
// Physical rooms and public accounts survive a life; unfinished attendance does
// not. Keep this strictly v2-only so old saved-life inheritance stays unchanged.
export function archiveStoryMazeAtLifeEnd(s){if(s.maze)closeMazeVisit(s,s.maze,'life_end');if(s.maze?.version===2)archive(s,s.maze,s.maze.objective?'complete':'unfinished');}
export function inheritStoryMazes(s,parent){
 const records=(parent.mazeBook?.records||[]).filter(m=>m.version===2),receiptHistory=inheritedExpeditionReceiptFields(parent);
 if(!records.length&&parent.maze?.version!==2&&!parent.mazeBook?.contentReceipts?.length){if(Object.keys(receiptHistory).length){initializeMaze(s);Object.assign(s.mazeBook,receiptHistory);}return;}
 s.mazeBook={version:1,nextRun:parent.mazeBook.nextRun,records:copy(records),...receiptHistory};s.maze=null;
 if(parent.mazeBook.contentReceipts)s.mazeBook.contentReceipts=copy(parent.mazeBook.contentReceipts);
 if(parent.maze?.version===2){const physical=physicalMazeForInheritance(parent.maze);archive({...s,day:parent.day},physical,parent.maze.objective?'complete':'unfinished');}
}
export function enterMaze(s,id,questId,ctx){
 const spec=mazeEntrySpec(s,id,questId);if(!spec||s.age<16||waiting(s)||s.maze||s.dungeon||s.rpg?.expedition||s.rpg?.project||s.adventuring?.expedition||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite)return false;
 initializeMaze(s);const old=spec.kind!=='radiant'&&s.mazeBook.records.findLast(r=>r.kind===spec.kind&&r.sourceId===spec.sourceId&&r.locationId===s.locationId);
 if(old?.objective||s.mazeBook.contentReceipts?.some(row=>row.sourceId===spec.sourceId&&row.family===(spec.kind==='authored'?'authored':'signature'))){if(questId){s.campaign.facts['dungeon_'+questId]=true;ctx.touchCampaign?.();}s.notice='Your earlier discovery already answers this objective. Nothing is awarded twice.';return true;}
 if(!old&&spec.kind==='regional'){const decision=signatureMazeAllowed(s,spec);if(!decision.allowed){s.notice=decision.reason;return false;}if(decision.priorComplete){s.notice='Your earlier discovery already answers this objective. Nothing is awarded twice.';return true;}}
 if(spec.kind==='radiant'&&s.adventuring.rations<1)return false;
 const entry=mazeReceiptEntrySnapshot(s,old||{visited:[0],cleared:[0],steps:0});
 if(ctx.spendDays(1,{outdoors:false})!==1||s.phase==='retired')return true;
 if(old){s.maze={...copy(old),position:0,previous:0,pendingRoom:null,questId:questId||old.questId,status:'inside'};delete s.maze.endedDay;}
 else{const run=s.mazeBook.nextRun++,seed=`${s.seed}:maze:${s.dynasty?.generation||1}:${spec.kind}:${spec.sourceId}:${s.locationId}:${run}`;s.maze={version:1,id:'maze-'+run,generation:s.dynasty?.generation||1,seed,...spec,locationId:s.locationId,position:0,previous:0,visited:[0],cleared:[0],collected:[],steps:0,objective:false,pendingRoom:null,proofBattleId:null,proofCaptured:false,startedDay:s.day,status:'inside'};}
 if(!old&&['radiant','contract'].includes(spec.kind))Object.assign(s.maze,newMazeDimensions(s.maze));
 s.maze.guardianRoom=mazeLayout(s.maze).guardian;
 if(!old&&spec.kind==='authored')initializeAuthoredMaze(s,s.maze,mazeLayout(s.maze));
 if(!old&&spec.kind==='regional'&&spec.regionId)initializeSignatureMaze(s,s.maze,mazeLayout(s.maze));
 if(old?.version===2&&questId)s.maze.contentFacts.questId=questId;
 if(spec.kind==='radiant')s.adventuring.rations--;
 openMazeEntryVisit(s,s.maze,entry,spec.kind==='radiant'?1:0);
 mazeJournal(s,s.maze,ctx,'Below the Surface',`You entered ${spec.title}. The passages will stay as you find them. The stair at the entrance leads out.`,'exploration');s.notice='A stair rises behind you. Choose a neighbouring room on the map.';return true;
}
export function mazeRoomText(m,state=null){
 if(m.version===2&&m.content?.family==='authored'){const text=authoredMazeRoomText(m,state);if(text)return text;}
 if(m.version===2&&m.content?.family==='signature'){const text=signatureMazeRoomText(m,state);if(text)return text;}
 const c=mazeLayout(m).cells[m.position],names={empty:['A Low Stone Room','A Broken Hall','A Dry Alcove','A Narrow Chamber','A Fallen Gallery','An Abandoned Storeroom'],cache:['A Dust-covered Coffer','A Traveller’s Lost Pack','A Sealed Stone Chest','A Cracked Strongbox','Shelves behind Rubble','A Bundle under the Stairs'],enemy:['Movement in the Dark','Fresh Tracks','An Occupied Chamber','A Guarded Passage','Breathing behind the Pillar','A Watchful Shape'],trap:['A Taut Wire','A Crumbling Floor','An Unstable Arch','A Row of Hidden Spikes','An Old Pressure Plate','A Suspended Stone'],camp:['A Sheltered Niche','A Dry Fireplace','A Quiet Side Room','An Old Bed of Straw','A Roof above the Damp','A Defensible Corner'],inscription:['A Mason’s Mark','Names on the Wall','A Faded Route Sketch','A Carved Memorial','A Warning in Charcoal','A Painted Doorway']};
 const descriptions={empty:['Dust lies undisturbed. There is nothing to take, but the doors lead further in.','Your footsteps echo between bare walls. You find no one here.','A broken bench rests against the stone. The room is quiet.','Water drips somewhere beyond the walls. This chamber is empty.','Someone left a burnt-out torch on the floor. There is no other sign of them.','Cool air enters through a crack too small to pass. The room holds no treasure.'],cache:['A shut container has survived the damp. You can search it or leave it alone.'],enemy:['Something has made this room its shelter. You can confront it, attempt to slip past, or retreat.'],trap:['The passage has a visible hazard. Look closely before stepping through.'],camp:['The floor is dry and the approaches are easy to watch. This is a good place to rest.'],inscription:['A short account survives on the wall. Take time to copy it if you wish.']};
 if(c.kind==='entrance')return {title:'The Entrance Stair',body:'Daylight reaches the first steps. This stair is your way back to the surface.'};
 if(c.kind==='guardian')return {title:'The Last Guard',body:'A guardian blocks the chamber beyond. The next room holds the reason for this descent.'};
 if(c.kind==='objective')return {title:m.kind==='authored'?(DUNGEONS.find(d=>d.id===m.sourceId)?.rooms.at(-1).title||'The Last Chamber'):m.kind==='contract'?'The Contract’s Objective':'The Deep Chamber',body:m.objective?'Your work here is complete. A narrow return stair now leads to the surface.':m.kind==='authored'?DUNGEONS.find(d=>d.id===m.sourceId)?.rooms.at(-1).description:'You have reached the last chamber. Finish the task here, then decide when to return.'};
 const details=['Small niches have been cut into the north wall.','A worn channel crosses the floor.','A carved lintel has fallen beside one door.','Old tool marks remain under the soot.','A shallow basin catches water from the ceiling.','Rust stains spread beneath an empty hook.','Pale roots have reached the mortar.','An uneven step divides the floor.','The ceiling is supported by short stone pillars.','A cold draught enters through a blocked vent.','A narrow ledge runs above the doors.','A patch of old paint survives beneath the dust.'];
 return {title:names[c.kind][c.variant%names[c.kind].length],body:descriptions[c.kind][c.variant%descriptions[c.kind].length]+' '+details[seededRoll(m.seed,'detail:'+c.id,details.length)]+(m.cleared.includes(c.id)?' You have already dealt with this room.':'')};
}
export function mazeActions(s){
 const m=s.maze;if(!m||waiting(s))return [];const layout=mazeLayout(m),c=mazeRoomCell(m),done=m.cleared.includes(c.id),result=[];
 if(m.version===2&&s.rpg?.project?.kind==='maze')return m.content.family==='signature'?signatureMazeActions(s):authoredMazeActions(s);
 if(m.version===2&&c.contentSlot)result.push(...(m.content.family==='signature'?signatureMazeActions(s):authoredMazeActions(s)));
 else if(!done&&(c.kind==='enemy'||c.kind==='guardian')){
  result.push(action('maze_fight','Face the Enemy','Begin turn-based party combat. Your Health, Focus and supplies carry back into the maze.'));
  if(c.kind==='enemy')result.push(action('maze_sneak','Try to Slip Past',`Stealth ${s.hero.skills.stealth} + Agility ${s.hero.attributes.agility}; needs ${8+m.tier*2}. Failure starts combat.`));
  if(c.kind==='guardian'&&m.kind!=='contract')result.push(action('maze_parley','Offer Terms for Passage',`Spend 8 Gold and one day. Requires Persuasion ${8+m.tier*2}. Gain passage without combat spoils.`,1,8,s.hero.gold<8?'Requires 8 Gold.':s.hero.skills.persuasion<8+m.tier*2?'Your persuasion is not yet strong enough.':null));
 }else if(!done&&c.kind==='trap')result.push(action('maze_disarm','Examine the Hazard',`Survival + Agility of ${8+m.tier*2} avoids injury. Below that, lose ${4+m.tier*2} Health.`,0),action('maze_cross','Cross Carefully',`Lose ${2+m.tier} Health, then pass the hazard.`));
 else if(c.kind==='cache'&&!m.collected.includes(c.id))result.push(action('maze_search','Search the Cache','Claim the contents once. The room will stay empty afterward.'));
 else if(c.kind==='inscription'&&!done)result.push(action('maze_read','Read the Inscription','Keep the earned discovery in Journal Archive. An editable personal copy is kept only if this life’s notebook has room; existing notes are never replaced. No quest is accepted by reading.'));
 else if(c.kind==='objective'&&!m.objective)result.push(action('maze_objective','Complete the Objective','Record the actual discovery. Accepted work keeps its own return and payment requirements.',0,0,!m.cleared.includes(layout.guardian)?'The guardian’s passage must be resolved first.':null));
 result.push(...mazeFieldAssistActions(s));
 const blocked=!done&&['enemy','guardian','trap'].includes(c.kind),movement=mazeMovementForecast(s);
 for(const to of c.doors){const n=layout.cells[to],direction=dirs.find(([,dx,dy])=>c.x+dx===n.x&&c.y+dy===n.y)?.[0]||'onward',back=to===m.previous;result.push(action('maze_step_'+to,'Walk '+direction[0].toUpperCase()+direction.slice(1),(m.visited.includes(to)?'Return to an explored room. ':'Step into an unknown room. ')+mazeMovementDescription(movement),movement.days,0,blocked&&!back?'Resolve the room or go back through the door you used.':null));}
 if(c.kind==='camp'||c.kind==='entrance'||done&&!['enemy','guardian','trap'].includes(c.kind))result.push(action('maze_camp','Make Camp',mazeCampDescription(s),1));
 if(c.kind==='entrance'||c.kind==='objective'&&m.objective)result.push(action('maze_exit','Return to the Surface','Use this actual stair. Keep your discoveries and earned loot.'));
 return result;
}
function fight(s,ctx){const m=s.maze,c=mazeRoomCell(m);ensureMazeVisit(s,m);m.pendingRoom=m.position;const content=m.version===2?(m.content.family==='signature'?signatureMazeBattleSpec(m):authoredMazeBattleSpec(m)):null;const authored=m.kind==='authored'&&c.kind==='guardian'?DUNGEONS.find(d=>d.id===m.sourceId)?.rooms.find(r=>r.kind==='boss')?.encounterId:null;const contract=m.kind==='contract'&&c.kind==='guardian'?s.adventuring.contracts.find(q=>q.id===m.sourceId):null;const encounterId=content?.encounterId||authored||'free_'+(contract?.targetType||c.enemy);ctx.startBattle(encounterId,{kind:'maze',mazeId:m.id,roomId:String(m.position),locationId:m.locationId,...(m.version===2?{contentVersion:'1',runSeed:m.seed,runGeneration:String(m.generation),actorId:mazeActorId(s),sourceId:m.sourceId,slotId:content?.slotId||'generic',encounterId,...(content?.bossId?{bossId:content.bossId}:{})}:{})});}
export function applyMazeAction(s,id,ctx){const m=s.maze,candidate=prepareMazeObservation(s,m);const result=performMazeAction(s,id,ctx);if(result)reconcileMazeDays(s,m,candidate);return result;}
function performMazeAction(s,id,ctx){
 const m=s.maze,a=mazeActions(s).find(a=>a.id===id&&!a.disabledReason);if(!m||!a)return false;const layout=mazeLayout(m),c=mazeRoomCell(m);
 if(a.fieldAssist){
  const {kind,helperId,targetId}=a.fieldAssist,options=mazeFieldAssistRuntime(s),quote=quoteMazeFieldAssist(s,kind,helperId,targetId,options);
  if(quote.disabledReason||!ensureMazeVisit(s,m))return false;
  const used=applyMazeFieldAssist(s,kind,helperId,targetId,options,ctx);if(used.disabledReason)return false;
  recordMazeFieldAssist(s,used.receipt,m);s.notice=describeMazeFieldAssist(used);
  (ctx.journalLiteral||ctx.journal)?.('Companion Field Help',s.notice,'exploration',{narrativeEdition:30});return true;
 }
 if(m.version===2&&(id.startsWith('maze_authored_')||id.startsWith('maze_signature_')||id.startsWith('maze_work_')))return m.content.family==='signature'?applySignatureMazeAction(s,id,ctx):applyAuthoredMazeAction(s,id,ctx);
 if(id.startsWith('maze_step_')){const to=Number(id.slice(10));if(!c.doors.includes(to))return false;const movement=mazeMovementForecast(s);if(movement.days&&ctx.spendDays(movement.days,{outdoors:false})!==movement.days)return true;if(s.phase==='retired')return true;ensureMazeVisit(s,m);m.previous=m.position;m.position=to;m.steps++;const focusBefore=s.hero.mp;s.hero.mp=Math.max(0,s.hero.mp-movement.focusCharge);recordMazeUse(s,'walkFocus',focusBefore-s.hero.mp,m);m.visited=unique([...m.visited,to]);if(['empty','camp'].includes(mazeRoomCell(m,to).kind))m.cleared=unique([...m.cleared,to]);if(m.content?.family==='signature')enterSignatureMazeRoom(s,m);s.notice=mazeRoomText(m,s).body;return true;}
 if(id==='maze_fight'){fight(s,ctx);return true;}
 if(id==='maze_sneak'){if(s.hero.skills.stealth+s.hero.attributes.agility>=8+m.tier*2){ensureMazeVisit(s,m);m.cleared=unique([...m.cleared,c.id]);s.notice='You pass quietly. No combat reward is claimed.';}else fight(s,ctx);return true;}
 if(id==='maze_parley'){if(ctx.spendDays(1)!==1||s.phase==='retired')return true;recordMazeFee(s,'passage',8,m);s.hero.gold-=8;m.cleared=unique([...m.cleared,c.id]);s.notice='The guardian accepts your terms. You can pass; no combat spoils are claimed.';return true;}
 if(id==='maze_search'){const before=beginMazeSettlement(s,m);m.collected.push(c.id);m.cleared=unique([...m.cleared,c.id]);awardLoot(s,m.seed+':cache:'+c.id,m.tier,ctx);endMazeSettlement(s,m,{kind:'cache',cellId:c.id,slotId:null,actionId:null,subjectId:null},before);return true;}
 if(id==='maze_disarm'||id==='maze_cross'){ensureMazeVisit(s,m);const damage=id==='maze_cross'?2+m.tier:s.hero.skills.survival+s.hero.attributes.agility>=8+m.tier*2?0:4+m.tier*2;s.hero.hp=Math.max(1,s.hero.hp-damage);m.cleared=unique([...m.cleared,c.id]);s.notice=damage?`You pass the hazard, losing ${damage} Health.`:'You disable the mechanism and pass safely.';return true;}
 if(id==='maze_read'){ensureMazeVisit(s,m);m.cleared=unique([...m.cleared,c.id]);const note=recordGenericMazeInscription(s,c,ctx);s.notice=note.text+' '+note.notebookCopyNotice;return true;}
 if(id==='maze_camp')return restAtCamp(s,ctx,{party:true});
 if(id==='maze_objective'){
  const before=beginMazeSettlement(s,m);
  m.objective=true;m.cleared=unique([...m.cleared,c.id]);
  if(m.kind==='authored'){if(m.sourceId==='root_caverns')s.flags.herbs=(s.flags.herbs||0)+3;if(m.questId){s.campaign.facts['dungeon_'+m.questId]=true;}}
  else if(m.kind==='contract'){const contract=s.adventuring.contracts.find(c=>c.id===m.sourceId&&c.status==='active');if(contract){contract.status='ready';contract.proof={battleId:m.proofBattleId||'maze-proof:'+m.id,day:s.day,captured:Boolean(m.proofCaptured)};}}
  else{awardLoot(s,m.seed+':objective',m.tier+1,ctx);if(m.kind==='regional')addRpgService(s,{kind:m.sourceId.startsWith('signature_')?'route':'workshop',rule:'shared',locationId:m.locationId,source:m.sourceId});}
  endMazeSettlement(s,m,{kind:'objective',cellId:c.id,slotId:null,actionId:null,subjectId:null},before);
  mazeJournal(s,m,ctx,'The Objective Reached',`${m.title}: you completed the task in the deep chamber. ${m.kind==='contract'?'Return to the client for payment.':'Your discovery remains in the Journal.'}`,'quest');s.notice='The task is complete. You find a return stair in this chamber.';return true;
 }
 if(id==='maze_exit'){closeMazeVisit(s,m,'stair',ctx);archive(s,m,m.objective?'complete':'unfinished');s.maze=null;ctx.touchCampaign?.();s.notice='You climb to the surface with what you earned. Unfinished rooms and claimed caches remain recorded.';return true;}
 return false;
}
export function afterMazeBattle(s,pending,outcome,ctx,completed){const m=s.maze;if(!m||pending.context?.mazeId!==m.id||m.pendingRoom!==m.position||m.version===2&&(!['victory','defeat','retreat'].includes(outcome)||!validMazeContext(s,pending.context,pending)))return false;const at=m.position;m.pendingRoom=null;if(outcome==='victory'){m.cleared=unique([...m.cleared,at]);if(m.version===2){if(m.content.family==='signature')afterSignatureMazeBattle(s,m,pending,ctx);else afterAuthoredMazeBattle(s,m,pending,ctx);}if(at===mazeLayout(m).guardian){m.proofBattleId=pending.instanceId;m.proofCaptured=Boolean(completed?.actors?.find(a=>a.id==='enemy-1')?.status.captured);}awardLoot(s,m.seed+':enemy:'+at,m.tier,ctx);}else if(outcome==='defeat'){closeMazeVisit(s,m,'defeat',ctx);archive(s,m,'unfinished');s.maze=null;}else{recordMazeRetreat(s,m);m.position=m.previous;s.notice='You retreat into the room you came from. The enemy still holds its chamber.';}return true;}
export function validMazeContext(s,c,battle=null){
 const m=s.maze;
 if(!m||!c||c.mazeId!==m.id||c.locationId!==s.locationId||c.roomId!==String(m.position)||m.pendingRoom!==m.position)return false;
 if(m.version!==2)return true;
 if(!Number.isSafeInteger(m.position)||m.position<0||m.position>=COUNT||!validateMazeContentManifest(m.content,m,s.seed,mazeLayout(m)))return false;
 const anchor=m.content.anchors.find(row=>row.cellId===m.position),room=m.content.definition.rooms.find(row=>row.id===anchor?.slotId);
 const spec=room?.encounterId?{encounterId:room.encounterId,slotId:room.id,bossId:room.bossId}:null;
 const encounterId=spec?.encounterId||'free_'+mazeRoomCell(m).enemy;
 const keys=['kind','mazeId','roomId','locationId','contentVersion','runSeed','runGeneration','actorId','sourceId','slotId','encounterId',...(spec?.bossId?['bossId']:[])];
 return Object.keys(c).length===keys.length&&Object.keys(c).every(key=>keys.includes(key))&&c.kind==='maze'&&c.contentVersion==='1'
  &&c.runSeed===m.seed&&c.runGeneration===String(m.generation)&&c.actorId===mazeActorId(s)&&c.sourceId===m.sourceId&&c.slotId===(spec?.slotId||'generic')&&c.encounterId===encounterId&&c.bossId===spec?.bossId
  &&(!battle||battle.encounterId===encounterId&&(!spec?.bossId||Array.isArray(battle.actors)&&battle.actors.find(actor=>actor.side==='enemy')?.bossId===spec.bossId));
}

export function validateMazes(s){
 if(!validateExpeditionReceipts(s,{validateFieldAssist:validateMazeFieldAssistReceipt}))return false;
 if(s.mazeBook===undefined)return s.maze===undefined||s.maze===null;const b=s.mazeBook,int=(v,a=0,z=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=a&&v<=z,loc=id=>s.world.locations.some(p=>p.id===id);
 if(!b||b.version!==1||!int(b.nextRun,1)||!Array.isArray(b.records)||b.records.length>80)return false;
 const mapRuntime=mazeMapRuntime(s);
 const completedReceipt=m=>{const outcome=m.contentOutcomes.find(row=>row.slotId===m.content.goalSlotId&&['finish','finish_public','finish_stewardship','care','trade','scheme'].includes(row.actionId));return outcome&&b.contentReceipts?.some(row=>sameMazeRun(row,m)&&row.runId===m.id&&row.day===outcome.day&&row.actorId===outcome.actorId&&row.method===m.contentFacts.objectiveMethod);};
 const valid=m=>{const {count:COUNT}=mazeDimensions(m);if(!m||!validMazeDimensions(m)||![1,2].includes(m.version)||!/^maze-\d+$/.test(m.id)||!int(+m.id.slice(5),1,b.nextRun-1)||typeof m.seed!=='string'||m.seed.length>400||!['authored','contract','regional','radiant'].includes(m.kind)||!loc(m.locationId)||typeof m.sourceId!=='string'||m.sourceId.length>100||typeof m.title!=='string'||m.title.length>160||!int(m.tier,1,6)||!int(m.position,0,COUNT-1)||!int(m.previous,0,COUNT-1)||!int(m.steps)||typeof m.objective!=='boolean'||!int(m.startedDay,0,s.day)||!(m.questId===null||typeof m.questId==='string'&&m.questId.length<=80)||!(m.pendingRoom===null||m.pendingRoom===m.position)||!(m.proofBattleId===null||typeof m.proofBattleId==='string'&&m.proofBattleId.length<=160))return false;for(const list of [m.visited,m.cleared,m.collected])if(!Array.isArray(list)||list.length>COUNT||new Set(list).size!==list.length||!list.every(i=>int(i,0,COUNT-1)))return false;if(!int(m.generation,1,5000)||m.seed!==`${s.seed}:maze:${m.generation}:${m.kind}:${m.sourceId}:${m.locationId}:${m.id.slice(5)}`)return false;if(m.kind==='authored'&&!DUNGEONS.some(d=>d.id===m.sourceId&&d.locationId===m.locationId)||m.kind==='regional'&&!RPG_DUNGEONS_V27.some(d=>d.id===m.sourceId)||m.kind==='radiant'&&m.sourceId!=='uncharted')return false;const l=mazeLayout(m);if(m.guardianRoom!==l.guardian||typeof m.proofCaptured!=='boolean')return false;if(m.version===2&&(!(m.content?.family==='signature'?validateSignatureMaze(s,m,l):validateAuthoredMaze(s,m,l))||m.objective&&!completedReceipt(m)))return false;return validateMazeFieldAssists(s,m,mazeFieldAssistRuntime(s))&&validateMazeMapMemory(m,mapRuntime.context,mapRuntime.rules)&&m.visited.includes(0)&&m.visited.includes(m.position)&&m.cleared.every(i=>m.visited.includes(i))&&m.collected.every(i=>m.cleared.includes(i)&&mazeRoomCell(m,i).kind==='cache')&&(!m.objective||m.cleared.includes(l.goal)&&m.cleared.includes(l.guardian));};
 if(b.contentReceipts!==undefined&&(!Array.isArray(b.contentReceipts)||b.contentReceipts.length>11||new Set(b.contentReceipts.map(row=>row?.family+':'+row?.sourceId)).size!==b.contentReceipts.length||!b.contentReceipts.every(row=>row&&['authored','signature'].includes(row.family)&&loc(row.locationId)&&/^maze-\d+$/.test(row.runId)&&int(+row.runId.slice(5),1,b.nextRun-1)&&int(row.day,0,s.day)&&row.mazeId===row.runId&&row.manifestVersion===1&&int(row.runGeneration,1,s.dynasty?.generation||5000)&&validMazeActor(s,row.actorId)&&row.runSeed===`${s.seed}:maze:${row.runGeneration}:${row.family==='authored'?'authored':'regional'}:${row.sourceId}:${row.locationId}:${row.runId.slice(5)}`&&(row.family==='authored'?DUNGEONS.some(d=>d.id===row.sourceId&&d.locationId===row.locationId)&&['copy','public','stewardship'].includes(row.method):RPG_DUNGEONS_V27.some(d=>d.id===row.sourceId&&d.signature)&&['care','trade','scheme'].includes(row.method)))))return false;
 if(!b.records.every(m=>valid(m)&&['unfinished','complete'].includes(m.status)&&int(m.endedDay,m.startedDay,s.day))||new Set(b.records.map(r=>r.id)).size!==b.records.length)return false;
 if(s.maze){if(!valid(s.maze)||s.maze.status!=='inside'||s.maze.locationId!==s.locationId||s.dungeon||s.rpg?.expedition||s.adventuring?.expedition||s.timeline?.journey||s.cartography?.offsite||s.cartography?.pending)return false;if(s.maze.pendingRoom!==null&&!(s.battle?.context?.kind==='maze'&&validMazeContext(s,s.battle.context,s.battle)))return false;if(s.maze.version===2&&!(s.maze.content.family==='signature'?validSignatureMazeWork(s,s.maze):validAuthoredMazeWork(s,s.maze)))return false;}
 if(s.rpg?.project?.kind==='maze'&&(!s.maze||s.maze.version!==2))return false;
 return true;
}


/** Restore only a uniquely proven v0.50 current-v2 contact row, not old prose. */
export function repairStoryMazeContactJournal(s){
 if(s.narrativeEdition!==30||!s.mazeBook||!s.journal?.some(r=>r.tag==='rpg'&&r.narrativeEdition===30&&r.title==='Work in the Region'))return;
 const runs=[s.maze,...s.mazeBook.records].filter(m=>m?.version===2&&m.content?.family==='signature');
 if(!runs.length||!validateMazes(s)||!validateRpg(s.rpg,s))return;
 const notes=new Map();
 for(const m of runs)for(const row of signatureContactNarratives(s,m))notes.set(row.key,row);
 const repairs=new Map();
 for(const note of notes.values()){
  const candidates=s.journal.filter(r=>r.tag==='rpg'&&r.narrativeEdition===30&&r.day===note.day&&r.generation===note.generation&&r.title==='Work in the Region'&&r.text===`Day ${r.day}, age ${r.age}. This marks an earlier regional event. The earlier choice remains part of this life.`);
  if(candidates.length!==1)continue;
  const row=candidates[0],found=repairs.get(row)||[];found.push(note);repairs.set(row,found);
 }
 for(const [row,found]of repairs)if(found.length===1){row.title=found[0].title;row.text=found[0].text;}
}
