import { isSettlement } from './world.js';
import { personalAccounts, repairTerms } from './people-context.js';
const people=s=>[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[])].filter((p,i,a)=>a.findIndex(q=>q.id===p.id)===i);
const person=(s,id)=>people(s).find(p=>p.id===id&&p.alive!==false),site=(s,id)=>s.world.locations.find(p=>p.id===id);
const destination=(s,a)=>isSettlement(s.world,a.locationId)&&!['destroyed','evacuated'].includes(site(s,a.locationId)?.status)?a.locationId:isSettlement(s.world,s.locationId)?s.locationId:s.world.locations.find(p=>isSettlement(s.world,p.id)&&!['destroyed','evacuated'].includes(p.status))?.id;
const offer=(id,label,description,reason,preview={})=>({id,label,description,days:0,cost:0,group:'Relationships',...preview,...(reason?{disabledReason:reason}:{})});
const note=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'relationships');};
export function relationshipActions(s){
 if(!s.conversations||s.age<18||s.phase!=='adult'||s.event||s.battle||s.conversations.pending||s.timeline?.journey||s.cartography?.offsite||s.cartography?.pending||s.justice?.prison)return [];
 const p=s.conversations.project;if(p)return [offer('conversations_continue',`Continue ${p.title.toLowerCase()}`,`${p.remainingDays} attended days remain. The ${p.cost} gold fee is paid only once.`,null,{durationDays:p.remainingDays,quotedCost:p.paid?0:p.cost}),offer('conversations_cancel','Withdraw from the remedy','Keep the attended days and paid fee spent. The account remains unresolved.')];
 return people(s).filter(p=>p.alive!==false&&!['dead','departed'].includes(s.rpg?.companionStages?.[p.id]?.status)).flatMap(p=>{
  const a=personalAccounts(s,p.id)[0];if(!a)return [];const t=repairTerms(a),where=destination(s,a),place=site(s,where)?.name||'the recorded place';
  return [offer(`conversations_repair_${p.id}`,`${p.name}: ${t.title.toLowerCase()}`,`${a.title}: ${a.account} Remedy: ${t.work}. ${t.days} actual days and ${t.cost} gold at ${place}. Then allow two real days and ask about their boundary. Affection, forgiveness and active travel are separate decisions.`,s.locationId!==where?`Travel to ${place} to attend this remedy.`:!isSettlement(s.world,s.locationId)?'Meet the record keeper at a surviving settlement.':s.hero.gold<t.cost?`Requires ${t.cost} gold.`:null,{durationDays:t.days,quotedCost:t.cost})];
 });
}
function attend(s,ctx){
 const p=s.conversations.project;if(!p)return false;
 if(p.locationId!==s.locationId){s.notice='Return to the place recorded for this remedy.';return true;}
 if(!p.paid&&s.hero.gold<p.cost){s.notice=`The ${p.cost} gold fee remains due. No time was spent.`;return true;}
 const reserved=!p.paid;if(reserved)s.hero.gold-=p.cost;
 const day=s.day,taken=ctx.spendDays(p.remainingDays,{outdoors:false}),actual=Math.min(p.remainingDays,Math.max(0,s.day-day),taken||0);
 if(!actual&&reserved)s.hero.gold+=p.cost;
 if(s.phase==='retired'){s.conversations.project=null;return true;}
 if(!actual){s.notice='The remedy is waiting behind the current calendar decision. No fee was taken.';return true;}
 if(reserved)p.paid=true;p.completedDays+=actual;p.remainingDays-=actual;
 if(p.remainingDays){s.notice=`${p.completedDays}/${p.totalDays} days attended. The unfinished remedy grants no readiness.`;return true;}
 const who=person(s,p.personId),account=personalAccounts(s,p.personId).find(a=>a.key===p.key);
 if(who&&account){const t=repairTerms(account);s.conversations.repairs||=[];s.conversations.repairs.push({key:p.key,personId:p.personId,kind:account.kind,day:s.day,days:p.totalDays,cost:p.cost,locationId:p.locationId,reviewedDay:null});note(s,ctx,`A remedy recorded with ${who.name}`,`You attended ${p.totalDays} days and paid ${p.cost} gold to ${t.work}. The earlier account remains. ${who.name} has not promised forgiveness, a household pledge or active travel. Allow two real days, then ask about their boundary.`);}else note(s,ctx,'An unfinished reconciliation','The named participant or unsettled account is no longer available. Actual work and fees remain spent; no agreement is invented.');
 s.conversations.project=null;return true;
}
export function applyRelationshipAction(s,id,ctx={}){
 const offered=relationshipActions(s).find(a=>a.id===id);if(!offered||offered.disabledReason)return false;
 if(id==='conversations_continue')return attend(s,ctx);
 if(id==='conversations_cancel'){const p=s.conversations.project;note(s,ctx,'A remedy withdrawn',`${p.completedDays} days and ${p.paid?p.cost:0} gold remain spent. The earlier account is still unresolved.`);s.conversations.project=null;return true;}
 const personId=id.slice('conversations_repair_'.length),a=personalAccounts(s,personId)[0],t=repairTerms(a);s.conversations.project={personId,key:a.key,title:t.title,totalDays:t.days,completedDays:0,remainingDays:t.days,cost:t.cost,paid:false,startedDay:s.day,locationId:s.locationId};return attend(s,ctx);
}
export function validateRelationshipRepairs(v,s){
 const int=(n,min=0,max=s.day)=>Number.isSafeInteger(n)&&n>=min&&n<=max,known=id=>people(s).some(p=>p.id===id),account=(id,key)=>personalAccounts(s,id,{all:true}).find(a=>a.key===key);
 if(v.repairs!==undefined){if(!Array.isArray(v.repairs)||v.repairs.length>256||new Set(v.repairs.map(r=>r?.key)).size!==v.repairs.length)return false;for(const r of v.repairs){const a=r&&known(r.personId)&&account(r.personId,r.key);if(!a)return false;const t=repairTerms(a);if(r.kind!==a.kind||!int(r.day,a.day)||r.days!==t.days||r.cost!==t.cost||!site(s,r.locationId)||!(r.reviewedDay===null||int(r.reviewedDay,r.day+2)))return false;}}
 if(v.project!==undefined&&v.project!==null){const p=v.project,a=known(p.personId)&&account(p.personId,p.key);if(!a||personalAccounts(s,p.personId).every(a=>a.key!==p.key))return false;const t=repairTerms(a);if(p.title!==t.title||p.totalDays!==t.days||p.cost!==t.cost||!int(p.completedDays,0,t.days-1)||p.remainingDays!==t.days-p.completedDays||typeof p.paid!=='boolean'||p.paid!==(p.completedDays>0)||!int(p.startedDay,a.day)||!site(s,p.locationId)||v.pending)return false;}return true;
}
