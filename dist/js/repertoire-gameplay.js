import {
  REPERTOIRE_WORKS,REPERTOIRE_ARRANGEMENTS,REPERTOIRE_VENUES,createRepertoirePiece,reviseRepertoirePiece,setRepertoirePrivacy,deleteRepertoirePiece,
  repertoireReason,repertoireCircuitReason,acceptRepertoireCircuit,withdrawRepertoireCircuit,startRepertoireRehearsal,startRepertoireRecital,
  repertoireProjectReason,attendRepertoireProject,cancelRepertoireProject,repertoireReception,repertoireRecall,openRepertoireRecall,acknowledgeRepertoireRecall,
} from './repertoire.js';
import { settlementServices } from './world-services.js';
import { personalReadiness } from './people-context.js';

const room = s => s.cartography?.interior?.siteId === s.locationId ? s.cartography.interior.roomId : 'gate';
const choices = rows => rows.map(({id,label,description})=>({id,label,description}));
const row = (id,label,description,reason=null,days=0) => ({id:`repertoire_${id}`,label,description,days:0,cost:0,durationDays:days,group:'Songs & Stories',...(reason?{disabledReason:reason}:{})});
const innRows = s => REPERTOIRE_VENUES.flatMap(p=>settlementServices(s,{siteId:p.locationId}).filter(r=>r.kind==='inn'));
const currentInn = s => settlementServices(s).find(r=>r.kind==='inn'&&r.here);
const readiness = (s,p) => ({hostile:/enem/i.test(p.relation||p.role||'') || (p.bond??40)<15,readinessReason:personalReadiness(s,p.id)});
function actualListener(s,contacts=[]) {
  const id=s.repertoire?.recall?.personId,r=currentInn(s);
  if(!r||r.personId!==id)return null;
  const p=contacts.find(p=>p.id===id)||r.person;
  return {...p,roomId:r.roomId,locationId:r.locationId,bond:s.conversations?.relationships?.[id]?.bond??p.bond??40};
}
export function repertoireRecallOffer(s,contacts=[]) {
  const p=actualListener(s,contacts),scene=p&&repertoireRecall(s,p,readiness(s,p));
  return scene?row(`recall_${p.id}`,scene.title,'Return to this exact listener’s recollection of a version they actually heard. Other conversation topics remain separate.'):null;
}
export function repertoireActions(s,contacts=[]) {
  if(s.revision<5||s.age<18||s.phase!=='adult'||s.event||s.battle||s.conversations?.pending)return [];
  const r=s.repertoire,p=r?.project;
  if(p){const reason=repertoireReason(s,{allowProject:true});if(reason)return [];
    return [row('continue',`Continue ${p.kind==='recital'?'the recital':'rehearsing'}: ${p.piece.title}`,`${p.remainingDays} attended days remain. The saved revision, arrangement, listener and permission do not change. No wages or skill gain.`,repertoireProjectReason(s,innRows(s)),p.remainingDays),row('cancel','Withdraw from this booking','Keep actual days spent. No unfinished recital, rehearsal readiness or Joy is awarded.'),...(r.circuit&&r.circuit.completedDay===null&&r.circuit.withdrawnDay===null?[row('withdraw','Withdraw from the circuit','Keep the existing performances and attended time; receive no unperformed stops or completion reward.')]:[])];
  }
  if(repertoireReason(s))return [];
  const actions=[];
  if((r?.pieces.length||0)<3)for(const w of REPERTOIRE_WORKS)actions.push(row(`create_${w.id}`,`Begin an original draft: ${w.title}`,'Make a private manuscript from four original fictional lines. Source and your composer credit are recorded. No time, money, skill or finished performance is granted.'));
  for(const piece of r?.pieces||[]){
    actions.push(row(`privacy_${piece.id}_${piece.privacy==='private'?'public':'private'}`,piece.privacy==='private'?'Allow public manuscript copies':'Keep this draft private',piece.privacy==='private'?`Explicitly allow copies of revision ${piece.revision}. A one-time public rendition is a separate choice.`:'This changes the current draft’s copy permission. It does not erase earlier performances or copies already permitted.'));
    for(const endingId of Object.keys(REPERTOIRE_WORKS.find(w=>w.id===piece.workId).endings).filter(id=>id!==piece.endingId))actions.push(row(`revise_${piece.id}_${endingId}`,'Try the other original ending','Create a new private revision. Earlier heard versions stay unchanged; rehearse this new version separately.'));
    for(const a of REPERTOIRE_ARRANGEMENTS)actions.push(row(`rehearse_${piece.id}_${a.id}`,`Rehearse ${a.name.toLowerCase()}: ${piece.title}`,'One attended day prepares this exact revision and arrangement. No wages, career days or skill gain. Ordinary living costs still accrue.',null,1));
    actions.push(row(`delete_${piece.id}`,'Set this active manuscript aside','Remove it from your three-piece repertoire. Frozen bookings and the versions already heard remain in your records.'));
  }
  const atCircuitInn=room(s)==='tavern'&&REPERTOIRE_VENUES.some(p=>p.locationId===s.locationId);
  if(!r?.circuit)actions.push(row('accept','Plan the three-inn circuit','One unpaid recital at each actual Tavern: your home village, the riverside village and the city. Ordinary travel remains real. Check all three operating venues and open road routes before accepting.',atCircuitInn?repertoireCircuitReason(s,innRows(s)):'Arrange this with an innkeeper at one of the circuit’s three actual Taverns.'));
  else if(r.circuit.completedDay===null&&r.circuit.withdrawnDay===null){
    actions.push(row('withdraw','Withdraw from the circuit','Keep existing performances and time spent. Fixed venues are not silently replaced; no unperformed stop or completion reward is granted.'));
    const target=r.circuit.targets.find(p=>p.locationId===s.locationId),host=atCircuitInn&&currentInn(s);
    if(target&&!r.circuit.stops.some(p=>p.locationId===s.locationId))for(const piece of r.pieces)for(const a of REPERTOIRE_ARRANGEMENTS){
      const rehearsed=piece.rehearsal?.revision===piece.revision&&piece.rehearsal.arrangement===a.id,prior=r.performances.some(p=>p.piece.pieceId===piece.id&&p.piece.revision===piece.revision),response=repertoireReception(piece,a.id,s.locationId,{rehearsed,priorPerformance:prior});
      for(const permission of ['once','manuscript'])actions.push(row(`perform_${piece.id}_${a.id}_${permission}`,`Recite ${piece.title}: ${a.name.toLowerCase()}${permission==='once'?' · public once':' · allow a manuscript copy'}`,`Revision ${piece.revision}. ${response.context} Expected ${response.reception} reception: ${response.joy} Joy after two attended days. ${rehearsed?'This arrangement was rehearsed.':'This arrangement is unprepared.'} ${prior?'You have performed this revision before; that is your confidence, not this audience’s knowledge.':''} ${permission==='once'?'Only this rendition is public; private manuscript permission stays private.':'This exact version may be copied.'} No payment, career credit or skill gain.`,!host?'Meet the actual innkeeper inside this fixed Tavern.':permission==='manuscript'&&piece.privacy!=='public'?'First explicitly allow public copies of this revision in your manuscript book.':null,2));
    }
  }
  const recall=repertoireRecallOffer(s,contacts);if(recall)actions.push(recall);
  return actions;
}
function note(s,ctx,title,text) {s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'life',{narrativeEdition:30});}
function progress(s,ctx) {
  const p=s.repertoire?.project;if(!p)return false;
  const reason=repertoireProjectReason(s,innRows(s));if(reason){s.notice=reason;return true;}
  const projectId=p.id,before=s.day,taken=ctx.spendDays(p.remainingDays,{outdoors:false}),days=Math.min(p.remainingDays,Math.max(0,s.day-before),Math.max(0,taken||0));
  if(s.phase==='retired'){s.repertoire.project=null;return true;}
  const result=attendRepertoireProject(s,{projectId,fromDay:before,days,services:innRows(s)});
  if(!result.ok){s.notice=`${days?`${days} real days passed, but `:''}${result.reason} No recital or artistic reward was invented.`;return true;}
  if(!result.completed){s.notice=days?`${p.completedDays}/${p.totalDays} days attended. The same unfinished artistic commitment remains.`:'The saved artistic commitment waits behind the current calendar decision.';return true;}
  if(result.kind==='rehearsal'){note(s,ctx,'An original piece rehearsed',`You attended one day rehearsing “${result.piece.title}”, revision ${result.piece.revision}, as a ${p.arrangement==='solo'?'quiet solo':'shared refrain'}. ${s.repertoire.pieces.some(w=>w.id===result.piece.pieceId&&w.revision===result.piece.revision)?'That exact draft is prepared.':'The active draft changed or was removed; no different revision acquired readiness.'} No wages, career days or skill were granted.`);return true;}
  const receipt=result.receipt;
  note(s,ctx,'An original recital at a real inn',`At ${receipt.venue.name}, ${receipt.listener.name} heard “${receipt.piece.title}”, revision ${receipt.piece.revision}, as a ${receipt.arrangement==='solo'?'quiet solo':'shared refrain'}. ${receipt.context} Reception: ${receipt.reception}; ${receipt.joy} Joy awarded once after two attended days. ${receipt.permission==='once'?'Only this rendition was public; no manuscript copy was permitted.':'A public copy of this performed version was permitted.'}\n\n${receipt.piece.verse}\n\nWords: ${receipt.piece.credits.map(p=>p.name).join(', ')}. Source: original fiction, composed at ${s.world.locations.find(p=>p.id===receipt.piece.source.locationId)?.name||receipt.piece.source.locationId}. ${s.repertoire.circuit.completedDay!==null?'All three fixed stops are now recorded. No extra completion payment or skill is awarded.':''}`);
  return true;
}
export function applyRepertoireAction(s,id,ctx,contacts=[]) {
  const offered=repertoireActions(s,contacts).find(a=>a.id===id&&!a.disabledReason);if(!offered)return false;
  if(id==='repertoire_continue')return progress(s,ctx);
  let result,title='Your manuscript book',body='';
  if(id==='repertoire_accept'){result=acceptRepertoireCircuit(s,innRows(s));title='A finite three-inn circuit';body='You accepted one unpaid recital at each fixed, operating Tavern: '+s.repertoire?.circuit?.targets.map(p=>p.name).join(', ')+'. Ordinary travel and living costs remain real; there is no deadline or new quest chain.';}
  else if(id==='repertoire_withdraw'){result=withdrawRepertoireCircuit(s);title='An artistic circuit withdrawn';body='The unperformed stops were released. Your actual performances remain; no replacement venue, lost wages or completed circuit was invented.';}
  else if(id==='repertoire_cancel'){result=cancelRepertoireProject(s);title='An unfinished artistic commitment';body=`You withdrew after ${result.completedDays||0} attended days. No unfinished artistic reward was granted.`;}
  else if(id.startsWith('repertoire_create_')){result=createRepertoirePiece(s,{workId:id.slice(18)});body=result.ok?`You kept “${result.piece.title}” as a private original-fiction draft, with your own composer credit. It has not been performed, quoted to an NPC or copied publicly.`:'';}
  else if(id.startsWith('repertoire_rehearse_')){const[pieceId,a]=id.slice(20).split('_');result=startRepertoireRehearsal(s,pieceId,a);if(result.ok)return progress(s,ctx);}
  else if(id.startsWith('repertoire_perform_')){const[pieceId,a,permission]=id.slice(19).split('_');result=startRepertoireRecital(s,pieceId,a,permission,innRows(s));if(result.ok)return progress(s,ctx);}
  else if(id.startsWith('repertoire_privacy_')){const[pieceId,privacy]=id.slice(19).split('_');result=setRepertoirePrivacy(s,pieceId,privacy);body=privacy==='public'?'You explicitly allowed public manuscript copies of this current revision. It has not thereby acquired a performance or a new listener.':'The current draft is private. Previously heard renditions and authorized copies remain historical facts.';}
  else if(id.startsWith('repertoire_revise_')){const[pieceId,endingId]=id.slice(18).split('_');result=reviseRepertoirePiece(s,pieceId,{endingId});body='You chose the other original ending. This is a new private revision, not a revision of what earlier listeners heard. Its rehearsal remains to be attended.';}
  else if(id.startsWith('repertoire_delete_')){result=deleteRepertoirePiece(s,id.slice(18));body='You removed this active manuscript. Saved bookings and genuinely heard versions were not rewritten or deleted.';}
  else if(id.startsWith('repertoire_recall_')){
    const p=actualListener(s,contacts);result=p&&p.id===id.slice(18)?openRepertoireRecall(s,p,readiness(s,p)):null;
    if(result?.ok){const scene=result.scene;ctx.setEvent('repertoire_recall',scene.title,'An actually heard performance',scene.body,choices(scene.choices));return true;}
  }
  if(!result?.ok){s.notice=result?.reason||'This artistic choice is no longer available.';return true;}
  note(s,ctx,title,body);return true;
}
export function applyRepertoireChoice(s,eventId,choiceId,ctx) {
  const pending=s.repertoire?.pending;if(eventId!=='repertoire_recall'||!pending||!pending.snapshot.choices.some(c=>c.id===choiceId))return false;
  const p=actualListener(s,ctx.contacts?.()||[]),result=p&&acknowledgeRepertoireRecall(s,p,pending.performanceId,choiceId,readiness(s,p));
  s.repertoire.pending=null;
  if(!result?.ok){s.notice='That exact listener is not available for this recollection now. The earlier performance remains; no reply, acknowledgement or new memory was invented.';return true;}
  const heard=s.repertoire.performances.find(p=>p.id===pending.performanceId),response=pending.snapshot.choices.find(c=>c.id===choiceId).response;
  note(s,ctx,`A listener remembers ${heard.piece.title}`,`${heard.listener.name}: ${response} This conversation granted no additional days, Gold, skill or relationship reward.`);return true;
}
export const repertoireEventIds = () => ({repertoire_recall:['listen','ending','arrangement','leave']});
export function repertoireJournalRows(s) {
  return (s.repertoire?.performances||[]).map(p=>({title:`${p.piece.title} · ${p.venue.name}`,text:`World day ${p.performedDay}: ${p.listener.name} heard revision ${p.piece.revision} as a ${p.arrangement==='solo'?'quiet solo':'shared refrain'}. Reception: ${p.reception}. ${p.permission==='once'?'A public rendition only; no manuscript copy was permitted.':'This performed version allowed a manuscript copy.'}\n\n${p.piece.verse}\n\nWords: ${p.piece.credits.map(c=>c.name).join(', ')}. Source: original fiction.`}));
}
