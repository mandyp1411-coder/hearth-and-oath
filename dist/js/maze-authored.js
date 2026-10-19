import { mazeJournal, bufferMazeJournal } from './maze-narrative.js';
import { beginMazeSettlement, endMazeSettlement } from './maze-receipt-runtime.js';
import { authoredRoomChoices, authoredActionDays, authoredGuardianAccount, formationSupport, applyAuthoredContentChoice } from './exploration.js';
import { generateMazeContentManifest, validateMazeContentManifest } from './maze-content-v1.js';
import { startMazeWork, continueMazeWork } from './rpg-depth-v27.js';
import { mazeActorId, mazeRunIdentity, sameMazeRun, validMazeActor } from './maze-provenance.js';

const actions = ['listen','search','parley','hear_witness','record_witness','protect_witness','repair_route','aid_only','preserve','restore','salvage','take','finish','finish_public','finish_stewardship'];
const clone = value => structuredClone(value);
const unique = list => [...new Set(list)];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
  : object(value) ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value);
const offer = (id,label,description,days=0,cost=0,reason) => ({id,label,description,days,cost,group:'Dungeon',...(reason?{disabledReason:reason}:{})});

export function initializeAuthoredMaze(s,m,layout) {
  const content = generateMazeContentManifest({...m,version:2},s.seed,layout);
  if (!content || content.family !== 'authored') return false;
  m.version=2;m.content=content;m.contentFacts=m.questId?{questId:m.questId}:{};m.contentOutcomes=[];
  return true;
}

function projection(m,s=null) {
  const anchors=m.content.anchors, definition=m.content.definition;
  const here=definition.rooms.find(room=>room.id===anchors.find(row=>row.cellId===m.position)?.slotId);
  const facts={...m.contentFacts};
  if(s){
    const own=m.contentOutcomes.filter(row=>row.actorId===mazeActorId(s));
    // Physical aid and recorded evidence remain public history. Hearing an
    // account, permission to name its speaker, and personal trust do not pass
    // from an ancestor to the heir merely because a map was inherited.
    for(const room of definition.rooms)if(['fight','boss'].includes(room.kind)){
      delete facts['listened_'+room.id];if(own.some(row=>row.slotId===room.id&&row.actionId==='listen'))facts['listened_'+room.id]=true;
    }
    delete facts.witnessHeard;delete facts.witnessRecorded;
    if(own.some(row=>row.actionId==='hear_witness'))facts.witnessHeard=true;
    if(own.some(row=>['record_witness','protect_witness'].includes(row.actionId)))facts.witnessRecorded=true;
    if(facts.proofSource==='witness'&&!facts.witnessRecorded)delete facts.variantProof;
  }
  return {definition,here,active:{id:m.sourceId,roomId:here?.id,
    visited:anchors.filter(row=>m.visited.includes(row.cellId)).map(row=>row.slotId),
    cleared:anchors.filter(row=>m.cleared.includes(row.cellId)).map(row=>row.slotId),
    facts,complete:m.objective}};
}

export function authoredMazeRoomText(m,state=null) {
  const {definition,here,active}=projection(m,state);if(!here)return null;
  let body=here.description;
  if(here.id==='entry')body+=`\n\nExpedition concern: ${definition.objective.title}. Optional accounts and practical aid can answer an inhabitant's concern. The passages still hold their ordinary dangers.`;
  if(state&&m.generation<(state.dynasty?.generation||1)&&here.id==='entry')body+='\n\nThe marked rooms are an inherited record of routes already explored, not memories or personal permissions belonging to this life.';
  if(here.id==='witness'&&active.facts.witnessHeard)body+=`\n\n“I will let you record what happened here,” ${definition.witness.name} says. “Keep my words beside the limits I gave you.”`;
  if(active.facts['listened_'+here.id])body+='\n\n'+(state?authoredGuardianAccount(state,definition,here):authoredGuardianAccountForText(m,definition,here));
  if(m.cleared.includes(m.position))body+=' You have already resolved this room.';
  return {title:here.title,body};
}
// Text produced while acting includes actual present companion/formation
// support. The persisted room account must not invent later support changes.
function authoredGuardianAccountForText(m,definition,here) {
  return `${definition.custodian.name}, ${definition.custodian.role}, guards this place over ${definition.motive.title.toLowerCase()}. ${definition.motive.need}`;
}

function sourceOffers(s,m) {
  const {definition,here,active}=projection(m,s);if(!here)return [];
  const rows=authoredRoomChoices(s,definition,here,active,{modern:true,navigation:false});
  const ready=m.content.requiredGuardians.every(guard=>active.cleared.includes(guard.slotId));
  return rows.map(row=>row.id.startsWith('finish')&&!ready?{...row,disabledReason:'The guardian’s passage must be resolved first.'}:row);
}

export function authoredMazeActions(s) {
  const m=s.maze;if(m?.content?.family!=='authored')return [];
  if(s.rpg?.project?.kind==='maze')return [
    offer('maze_work_continue','Keep the time you agreed',`${s.rpg.project.remainingDays} actual days remain. Paid fees are not charged again.`),
    offer('maze_work_cancel','Withdraw from this work','Keep attended time and fees. Receive no unfinished result.'),
  ];
  return sourceOffers(s,m).map(row=>offer(row.id==='fight'?'maze_fight':'maze_authored_'+row.id,row.label,row.description,authoredActionDays(row.id),0,row.disabledReason));
}

function receipt(s,m,slotId,actionId,work,extra={}) {
  m.contentOutcomes.push({slotId,actionId,actorId:mazeActorId(s),startedDay:work?.startedDay??s.day,day:s.day,days:work?.totalDays??0,cost:work?.cost??0,...extra});
}

export function rememberMazeCompletion(s,m,method) {
  s.mazeBook.contentReceipts||=[];
  if(!s.mazeBook.contentReceipts.some(row=>row.family===m.content.family&&row.sourceId===m.sourceId))s.mazeBook.contentReceipts.push({...mazeRunIdentity(m),runId:m.id,actorId:mazeActorId(s),day:s.day,method});
}

function finishChoice(s,m,work,ctx) {
  if(s.maze!==m||!sameMazeRun(work.details,m)||work.details.actorId!==mazeActorId(s)||m.position!==work.details.cellId)return false;
  const pick=sourceOffers(s,m).find(row=>row.id===work.choice&&!row.disabledReason);if(!pick){s.notice='The recorded work cannot finish under the present conditions. Attendance remains spent; no result was granted.';return false;}
  const {definition,here,active}=projection(m,s),before=beginMazeSettlement(s,m);
  const journal=bufferMazeJournal(s,m,ctx);
  const result=applyAuthoredContentChoice(s,definition,here,active,work.choice,{...journal.context,touchCampaign(){ }},{modern:true,onClear(id){
    const cell=m.content.anchors.find(row=>row.slotId===id).cellId;m.cleared=unique([...m.cleared,cell]);m.objective=active.complete;
  }});
  if(!result)return false;
  m.contentFacts={...m.contentFacts,...active.facts};
  m.objective=active.complete;
  if(work.choice==='take')m.collected=unique([...m.collected,m.position]);
  receipt(s,m,here.id,work.choice,work,{
    ...(active.facts['companion_'+here.id]?{companionId:active.facts['companion_'+here.id]}:{}),
    ...(active.facts['formation_'+here.id]?{formationId:active.facts['formation_'+here.id]}:{}),
    ...(active.facts['formation_'+here.id]?{formationCompletedDay:s.fellowship.formations[active.facts['formation_'+here.id]].completedDay}:{}),
    ...(work.choice==='parley'?{judgment:s.hero.skills[definition.motive.skill]||0}:{}),
  });
  if(m.objective)rememberMazeCompletion(s,m,m.contentFacts.objectiveMethod);
  endMazeSettlement(s,m,{kind:'authored',cellId:m.position,slotId:here.id,actionId:work.choice,subjectId:null},before);
  journal.flush();
  return true;
}

export function applyAuthoredMazeAction(s,id,ctx) {
  const m=s.maze;if(m?.content?.family!=='authored')return false;
  if(id==='maze_work_continue')return continueMazeWork(s,ctx,work=>finishChoice(s,m,work,ctx));
  if(id==='maze_work_cancel'){
    const work=s.rpg?.project;if(work?.kind!=='maze'||work.details.mazeId!==m.id)return false;
    s.notice=`${work.completedDays} days and ${work.paid?work.cost:0} gold remain spent. No unfinished result was received.`;
    const current=validAuthoredMazeWork(s,m);s.rpg.project=null;mazeJournal(s,m,ctx,'A commitment withdrawn',s.notice,'exploration',{},current);return true;
  }
  const actionId=id.slice('maze_authored_'.length), pick=sourceOffers(s,m).find(row=>row.id===actionId&&!row.disabledReason);
  if(!id.startsWith('maze_authored_')||!pick||s.rpg?.project)return false;
  const {here}=projection(m),details={...mazeRunIdentity(m),actorId:mazeActorId(s),slotId:here.id,cellId:m.position,actionId};
  return startMazeWork(s,details,actionId,authoredActionDays(actionId),0,ctx,work=>finishChoice(s,m,work,ctx));
}

export function afterAuthoredMazeBattle(s,m,pending,ctx) {
  if(m.content?.family!=='authored')return;
  const {here}=projection(m);if(!here?.encounterId)return;
  receipt(s,m,here.id,'combat',null,{battleId:pending.instanceId});
  if(here.rescue&&!m.contentFacts.prisonersFreed){m.contentFacts.prisonersFreed=true;if(s.campaign)s.campaign.facts.watchtowerPrisoners=true;ctx.standing?.('villagers',2);mazeJournal(s,m,ctx,'The cell doors opened','Your victory freed the detained travelers. Their families can return to the road.','quest');}
}

export function authoredMazeBattleSpec(m) {
  if(m.content?.family!=='authored')return null;
  const {here}=projection(m);return here?.encounterId?{encounterId:here.encounterId,slotId:here.id}:null;
}

function expectedProgress(s,m) {
  const definition=m.content.definition,facts=m.questId?{questId:m.questId}:{},cleared=new Set(['entry']),personal=new Set();let complete=false,lastDay=m.startedDay;
  // At most 200 lives may separately hear the two guards and hear/record the
  // witness. Physical aid, loot and passage outcomes remain strictly once-only.
  if(!Array.isArray(m.contentOutcomes)||m.contentOutcomes.length>840)return null;
  for(const row of m.contentOutcomes){
    if(!object(row))return null;
    const room=definition.rooms.find(room=>room.id===row.slotId),id=row.actionId;
    const keys=['slotId','actionId','actorId','startedDay','day','days','cost',...(id==='parley'?['companionId','formationId','formationCompletedDay','judgment']:[]),...(id==='combat'?['battleId']:[])];
    if(Object.keys(row).some(key=>!keys.includes(key)))return null;
    if(!validMazeActor(s,row.actorId))return null;
    if(!room||!Number.isSafeInteger(row.day)||row.day<lastDay||row.day>s.day||!Number.isSafeInteger(row.startedDay)||row.startedDay<lastDay||row.startedDay>row.day||row.cost!==0)return null;
    if(id!=='combat'&&!actions.includes(id)||row.days!==(id==='combat'?0:authoredActionDays(id))||row.day-row.startedDay<row.days)return null;
    if(!m.visited.includes(m.content.anchors.find(anchor=>anchor.slotId===room.id).cellId))return null;
    lastDay=row.day;const done=cleared.has(room.id),own=key=>personal.has(row.actorId+':'+key),remember=key=>personal.add(row.actorId+':'+key),proof=()=>{facts.variantProof=true;facts.proofSource=room.id;},aid=()=>{facts.variantAid=true;facts.aidSource=room.id;};
    if(id==='listen'){if(done||!['fight','boss'].includes(room.kind)||own('listen:'+room.id))return null;remember('listen:'+room.id);facts['listened_'+room.id]=true;}
    else if(id==='hear_witness'){if(room.kind!=='witness'||own('hear_witness'))return null;remember('hear_witness');facts.witnessHeard=true;}
    else if(id==='record_witness'||id==='protect_witness'){
      if(room.kind!=='witness'||!own('hear_witness')||id==='record_witness'&&own('record_witness')||id==='protect_witness'&&facts.witnessProtected)return null;
      remember('record_witness');
      facts.witnessRecorded=true;proof();if(id==='protect_witness'){facts.witnessProtected=true;aid();}cleared.add(room.id);
    }else if(id==='aid_only'){
      if(!room.optional||facts['aid_only_'+room.id]||(room.kind==='witness'?!own('hear_witness')||facts.witnessProtected:done))return null;
      facts['aid_only_'+room.id]=true;aid();if(room.kind==='witness')facts.witnessProtected=true;cleared.add(room.id);
    }else if(id==='search'||id==='repair_route'){
      if(room.kind!=='hazard'||done||id==='repair_route'&&room.id!=='service')return null;
      if(id==='search')facts['searched_'+room.id]=true;else{proof();aid();}cleared.add(room.id);
    }else if(['preserve','restore','salvage'].includes(id)){
      if(room.kind!=='dilemma'||done)return null;
      if(id==='salvage')facts.salvagedPersonalTool=true;else{proof();if(id==='restore')aid();}cleared.add(room.id);
    }else if(id==='take'){
      if(room.kind!=='treasure'||done||facts['claimed_'+room.id])return null;facts['claimed_'+room.id]=true;cleared.add(room.id);
    }else if(id==='parley'){
      if(done||!['fight','boss'].includes(room.kind)||!own('listen:'+room.id)||!room.parley&&room.kind!=='boss')return null;
      if(!Number.isSafeInteger(row.judgment)||row.judgment<0||row.judgment>10000)return null;
      if(row.companionId){if(!s.companions.some(person=>person.id===row.companionId&&person.role===definition.motive.role))return null;facts['companion_'+room.id]=row.companionId;}
      if(row.formationId){
        if(!Number.isSafeInteger(row.formationCompletedDay)||row.formationCompletedDay<0||row.formationCompletedDay>row.day)return null;
        const historical={...s,day:row.day,hero:{...s.hero,specialization:row.formationId},fellowship:{formations:{[row.formationId]:{stage:'completed',completedDay:row.formationCompletedDay}}}};
        if(!formationSupport(historical,definition))return null;
        if(row.actorId===mazeActorId(s)&&s.fellowship?.formations?.[row.formationId]?.completedDay!==row.formationCompletedDay)return null;
        facts['formation_'+room.id]=row.formationId;
      }else if(row.formationCompletedDay!==undefined)return null;
      const permittedProof=facts.variantProof&&(facts.proofSource!=='witness'||own('record_witness'));
      if(room.kind==='boss'&&(!(permittedProof||row.formationId)||!facts.variantAid||!(row.judgment>=4||row.companionId)))return null;
      if(room.kind==='fight'&&!(row.judgment>=3||permittedProof||facts.variantAid||row.companionId))return null;
      facts['peaceful_'+room.id]=true;if(room.rescue)facts.prisonersFreed=true;cleared.add(room.id);
    }else if(id==='combat'){
      if(done||!room.encounterId||typeof row.battleId!=='string'||!row.battleId.length||row.battleId.length>160)return null;
      if(room.rescue)facts.prisonersFreed=true;cleared.add(room.id);
    }else if(id.startsWith('finish')){
      if(room.kind!=='objective'||complete||!m.content.requiredGuardians.every(guard=>cleared.has(guard.slotId)))return null;
      complete=true;cleared.add(room.id);facts.discovery=true;if(room.herbs)facts.objectiveHerbs=true;
      facts.objectiveId=definition.objective.id;facts.objectiveMethod=id==='finish_public'?'public':id==='finish_stewardship'?'stewardship':'copy';facts.custodianName=definition.custodian.name;facts.motive=definition.motive.id;
      if(own('hear_witness'))facts.witnessName=definition.witness.name;
      if(id==='finish_public'){facts.publicAccount=true;facts.publicWitnessNamed=own('record_witness');}
      if(id==='finish_stewardship')facts.stewardship=true;
    }else return null;
  }
  return {facts,cleared,complete};
}

export function validateAuthoredMaze(s,m,layout) {
  if(m.version!==2||m.content?.family!=='authored'||!validateMazeContentManifest(m.content,m,s.seed,layout)||!object(m.contentFacts))return false;
  const expected=expectedProgress(s,m);if(!expected||stable(m.contentFacts)!==stable(expected.facts)||m.objective!==expected.complete)return false;
  for(const anchor of m.content.anchors){
    if(m.cleared.includes(anchor.cellId)!==expected.cleared.has(anchor.slotId))return false;
    if(m.collected.includes(anchor.cellId)!==Boolean(expected.facts['claimed_'+anchor.slotId]))return false;
  }
  return true;
}

export function validAuthoredMazeWork(s,m) {
  const work=s.rpg?.project;if(work?.kind!=='maze')return true;
  const details=work.details,{here}=projection(m);
  const expected={...mazeRunIdentity(m),actorId:mazeActorId(s),slotId:here?.id,cellId:m.position,actionId:work.choice};
  return !!here&&sourceOffers(s,m).some(row=>row.id===work.choice)&&stable(details)===stable(expected)&&work.id===m.id&&work.locationId===m.locationId&&details?.mazeId===m.id&&details.manifestVersion===1&&details.family==='authored'
    &&details.sourceId===m.sourceId&&details.cellId===m.position&&details.slotId===here?.id&&details.actionId===work.choice
    &&actions.includes(work.choice)&&authoredActionDays(work.choice)===work.totalDays&&work.totalDays===1&&work.cost===0;
}
