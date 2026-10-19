/** Small explicit bridges at existing maze mutations. No rewards or calendar. */
import { validateMazeFieldAssistReceipt } from './companion-field-assists.js';
import { EXPEDITION_RECEIPT_LIMIT, sameExpeditionRun, createExpeditionVisit, expeditionEntrySnapshot, addExpeditionDays, addExpeditionUse, addExpeditionFee, noteExpeditionRetreat,
 expeditionSettlementSnapshot, expeditionSettlementDelta, recordExpeditionSettlement, recordExpeditionVictory, recordExpeditionFieldAssist, finishExpeditionVisit } from './maze-receipts.js';

function install(s,m,value){
 if(!value||s.maze!==m)return null;
 s.mazeBook.nextExpeditionVisit=Number(value.id.slice(11))+1;
 s.mazeBook.expeditionReceipts||=[];m.expeditionVisit=value;return value;
}
export function prepareMazeObservation(s,m=s.maze){
 if(!m||m.expeditionVisit)return null;
 return createExpeditionVisit(s,m,s.mazeBook?.nextExpeditionVisit||1,{coverage:'observed'});
}
export function ensureMazeVisit(s,m=s.maze){
 if(!m||s.maze!==m)return null;
 return m.expeditionVisit||install(s,m,prepareMazeObservation(s,m));
}
export function openMazeEntryVisit(s,m,entry,rationsUsed=0){
 const value=createExpeditionVisit(s,m,s.mazeBook.nextExpeditionVisit||1,{entry,entryDays:1});
 if(install(s,m,value)&&rationsUsed)m.expeditionVisit=addExpeditionUse(m.expeditionVisit,'rations',rationsUsed);
 return m.expeditionVisit||null;
}
export function recordMazeDays(s,days,kind='inside',m=s.maze){
 if(m?.expeditionVisit&&days>0)m.expeditionVisit=addExpeditionDays(m.expeditionVisit,kind,days);
}
/** Source-module contexts can attend real days without engineContext. Fill
 * only unrecorded actual elapsed days; central accounting is never doubled. */
export function reconcileMazeDays(s,m,candidate=null){
 if(s.maze!==m||!m)return;
 if(!m.expeditionVisit&&candidate&&s.day>candidate.start.day)install(s,m,candidate);
 let v=m.expeditionVisit;if(!v)return;
 if(candidate&&v.id===candidate.id&&v.coverage==='observed'&&v.start.day>candidate.start.day){v={...v,start:{...candidate.start}};m.expeditionVisit=v;}
 const missing=s.day-v.start.day-Object.values(v.days).reduce((a,b)=>a+b,0);
 if(missing>0)recordMazeDays(s,missing,'inside',m);
}
export function recordMazeUse(s,kind,amount,m=s.maze){
 if(ensureMazeVisit(s,m))m.expeditionVisit=addExpeditionUse(m.expeditionVisit,kind,amount);
}
export function recordMazeFee(s,kind,amount,m=s.maze){
 if(ensureMazeVisit(s,m))m.expeditionVisit=addExpeditionFee(m.expeditionVisit,kind,amount);
}
export function recordMazeRetreat(s,m=s.maze){
 if(ensureMazeVisit(s,m))m.expeditionVisit=noteExpeditionRetreat(m.expeditionVisit);
}
export function recordMazeFieldAssist(s,row,m=s.maze){
 if(m?.expeditionVisit&&s.maze===m)m.expeditionVisit=recordExpeditionFieldAssist(m.expeditionVisit,s,m,row,{validateFieldAssist:validateMazeFieldAssistReceipt});
}
export function beginMazeSettlement(s,m=s.maze){
 ensureMazeVisit(s,m);reconcileMazeDays(s,m);return expeditionSettlementSnapshot(s);
}
export function endMazeSettlement(s,m,source,before){
 if(!m?.expeditionVisit||s.maze!==m)return;
 const effect=expeditionSettlementDelta(before,expeditionSettlementSnapshot(s));
 if(effect)m.expeditionVisit=recordExpeditionSettlement(m.expeditionVisit,m,source,s.day,effect);
}
export function endMazeVictory(s,m,cellId,before,experience){
 if(!m?.expeditionVisit||s.maze!==m)return;
 m.expeditionVisit=recordExpeditionVictory(m.expeditionVisit,m,cellId,s.day,before,expeditionSettlementSnapshot(s),experience);
}
export function closeMazeVisit(s,m,reason,ctx={}){
 if(!m||s.maze!==m)return null;
 const prior=s.mazeBook.expeditionReceipts?.at(-1);
 if(!m.expeditionVisit&&prior&&sameExpeditionRun(prior.identity,m)&&prior.end.day===s.day&&prior.end.steps===m.steps&&prior.end.explored===m.visited.length&&prior.end.cleared===m.cleared.length)return prior;
 if(!ensureMazeVisit(s,m))return null;
 reconcileMazeDays(s,m);
 const receipt=finishExpeditionVisit(m.expeditionVisit,s,m,reason,{validateFieldAssist:validateMazeFieldAssistReceipt});if(!receipt)return null;
 if(!s.mazeBook.expeditionReceipts.some(r=>r.id===receipt.id)){
  s.mazeBook.expeditionReceipts.push(receipt);s.mazeBook.expeditionReceipts=s.mazeBook.expeditionReceipts.slice(-EXPEDITION_RECEIPT_LIMIT);
  const ending=reason==='life_end'?'Life ended below':reason==='defeat'?'Defeat and recovery':receipt.objective.complete?'Returned with the objective complete':'Returned with unfinished rooms';
  (ctx.journalLiteral||ctx.journal)?.('An Expedition Account',`${m.title}: ${ending.toLowerCase()}. ${receipt.end.explored} rooms explored; ${receipt.end.cleared} cleared. ${receipt.end.day-receipt.start.day} attended days recorded.${receipt.coverage==='observed'?' Earlier entry costs and gains were not recorded.':''}`,'exploration',{narrativeEdition:30});
 }
 delete m.expeditionVisit;return receipt;
}
/** Closed display accounts only. Do not copy private physical maps or mint an
 * account for an active parent; that belongs to the actual lifecycle hook. */
export function inheritedExpeditionReceiptFields(parent){
 const b=parent.mazeBook;if(b?.nextExpeditionVisit===undefined||!Array.isArray(b.expeditionReceipts))return {};
 return {nextExpeditionVisit:b.nextExpeditionVisit,expeditionReceipts:structuredClone(b.expeditionReceipts)};
}
export const mazeReceiptEntrySnapshot = expeditionEntrySnapshot;

export function physicalMazeForInheritance(m){const physical=structuredClone(m);delete physical.expeditionVisit;return physical;}
