import { classView } from './classes.js';
import { canonicalMentorId } from './npc-continuity.js';

// Only NEW legacy-route offers get this hero-private, bounded attendance receipt.
// An old unmarked oath/ethics/trial/battle is never recast by migration.
const routes={paladin:{path:'warrior',actionId:'seek_order',label:'Seek the Lantern Order',description:'Earn paladin initiation with weapons 5 and devotion 3. A visible oath creates commitments.',skills:{weapons:5,devotion:3}},necromancer:{path:'mage',actionId:'seek_necromancy',label:'Seek an ancestral teacher',description:'Earn necromancer initiation with arcana 5 and scholarship 3. Willing testimony and soul binding have different consequences.',skills:{arcana:5,scholarship:3}},assassin:{path:'rogue',actionId:'seek_assassin',label:'Meet the Veiled Guild',description:'Earn assassin initiation with stealth 5 and survival 3. Choose how to handle your first commission.',skills:{stealth:5,survival:3}}};
const summary=m=>({id:m.id,name:m.name,locationId:m.locationId});
const mentor=(s,id)=>classView(s).callings.find(c=>c.id===id)?.mentor;
const record=s=>s.flags?.legacyMentorTrial;
export const activeLegacyMentorTrial=s=>!!record(s)&&!['recognized','withdrawn'].includes(record(s).stage);
const present=(s,m)=>{const site=s.world.locations.find(p=>p.id===m?.locationId);return !!m&&m.available!==false&&m.locationId===s.locationId&&!!site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false&&!s.realm?.politics?.holds?.some(h=>h.siteId===site.id&&h.status==='held');};
const available=(s,r)=>{const m=mentor(s,r.classId);return m?.id===r.supervisor.id&&present(s,m);};
const blocked=s=>s.event||s.battle||s.phase==='retired'||s.conversations?.pending||s.dungeon||s.maze||s.timeline?.journey||s.cartography?.pending||s.cartography?.offsite||s.justice?.prison||s.workshop?.project||s.careers?.batch||s.life?.plan;
const journal=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'calling');};
export function legacyCallingOffers(s){
 if(s.revision<5||s.timeline?.mode==='birth'||s.hero.specialization||s.age<18||blocked(s))return [];
 return Object.entries(routes).filter(([,d])=>s.hero.path===d.path).map(([id,d])=>{
  const m=mentor(s,id),missing=Object.entries(d.skills).filter(([skill,n])=>(s.hero.skills[skill]||0)<n),reason=activeLegacyMentorTrial(s)?'Finish or withdraw from the already accepted trial.':m.available===false?'This exact mentor cannot currently take part.':s.locationId!==m.locationId?`Meet ${m.name} in ${s.world.locations.find(p=>p.id===m.locationId)?.name||m.locationId}.`:!present(s,m)?'The mentor’s recorded place is not offering this public service.':missing.length?'Requires '+missing.map(([skill,n])=>skill+' '+n).join(' and ')+'.':null;
  return {id:d.actionId,label:d.label,description:d.description+` Mentor: ${m.name}. The oath, ethical decision or commission and the combat alternative remain available.`,days:2,cost:0,group:'Advanced path',...(reason?{disabledReason:reason}:{})};
 });
}
export function captureLegacyMentorTrial(s,classId){
 const offered=legacyCallingOffers(s).find(a=>a.id===routes[classId]?.actionId);if(!offered||offered.disabledReason)return false;
 const m=summary(mentor(s,classId));s.flags.legacyMentorTrial={version:1,classId,mentor:m,supervisor:structuredClone(m),startedDay:s.day,stage:'offer',workedDays:0,completion:null,recognition:null,handovers:[]};return true;
}
export function legacyMentorTrialChoice(s,eventId,id){
 const r=record(s);if(!activeLegacyMentorTrial(s)||!['paladin_oath','necromancer_ethics','assassin_commission','initiation_trial'].includes(eventId))return false;
 if(id==='decline'||id==='pause'){r.stage='withdrawn';delete s.flags.pendingSpecialization;return false;}
 if(!available(s,r)){
  if(r.stage==='offer')r.stage='withdrawn';
  s.notice='The exact named mentor cannot currently take part. No new oath, coercion, trial work or reward is claimed. The earlier scene remains in your record; an accepted trial can arrange explicit new supervision.';return true;
 }
 return false;
}
export function markLegacyTrialAccepted(s,classId){const r=record(s);if(r&&r.classId===classId&&r.stage==='offer')r.stage='trial';}
export function completeLegacyMentorTrial(s,method,ctx={}){
 const r=record(s);if(!r||r.stage==='recognized'||r.stage==='withdrawn'||r.completion)return false;
 r.completion={method,day:s.day,locationId:s.locationId,supervisorId:r.supervisor.id,supervisorName:r.supervisor.name};r.stage='completed';
 if(method==='service'&&r.classId==='assassin'&&s.flags.lethalCommission){s.flags.lethalCommission=false;ctx.remember?.('kest','You chose surveillance after considering a lethal commission.',5);}
 if(s.progression.learnedClassIds.includes(r.classId)){r.stage='withdrawn';delete s.flags.pendingSpecialization;journal(s,ctx,'An already earned calling is kept',`Your ${r.classId} calling was already earned through another path. This trial's dated work remains, with no repeated class, skill, experience or standing reward.`);return true;}
 if(available(s,r)&&ctx.awardLegacySpecialization?.(r.classId)===true){r.stage='recognized';r.recognition={day:s.day,reviewerId:r.supervisor.id,reviewerName:r.supervisor.name};return true;}
 journal(s,ctx,'A completed trial awaits recognition',`Your ${method==='combat'?'guarded combat result':'four actual field days'} for ${r.classId} is preserved as a dated completion record under ${r.supervisor.name}. Already-earned combat results remain. An available current mentor may explicitly review this public trial record, without repeating work, charging a fee, inheriting private consent or claiming the original mentor spoke after becoming unavailable.`);return true;
}
export function continueLegacyMentorField(s,ctx={}){
 const r=record(s);if(!r||!['trial','service'].includes(r.stage)||!available(s,r))return false;
 r.stage='service';
 // At most four supervised attendance days, checked on both sides of each
 // elapsed day. A day containing a death/absence is not invented as teaching.
 for(let i=0;i<4&&r.workedDays<4&&available(s,r)&&s.phase!=='retired';i++){
  const before=s.day;ctx.spendDays?.(1,{outdoors:false});
  if(s.day-before!==1||!available(s,r))break;
  r.workedDays++;
  if(s.event||s.battle||s.conversations?.pending||ctx.pendingNeed?.())break;
 }
 if(s.phase==='retired')return true;
 if(r.workedDays===4)completeLegacyMentorTrial(s,'service',ctx);
 else journal(s,ctx,'A trial keeps its actual attendance',`${r.workedDays}/4 field days are recorded for your ${r.classId} trial. Only the actual remaining days may be continued, under an available named supervisor. No initiation reward has been granted.`);
 return true;
}
export function legacyMentorTrialActions(s){
 const r=record(s);if(!activeLegacyMentorTrial(s)||blocked(s))return [];
 const m=mentor(s,r.classId),local=present(s,m),needs=r.supervisor.id!==m.id,base={days:0,cost:0,group:'Accepted initiation',...(!local?{disabledReason:m.available===false?'The current mentor cannot take part.':`Meet ${m.name} in ${s.world.locations.find(p=>p.id===m.locationId)?.name||m.locationId}.`}:{})};
 if(r.stage==='offer')return [];
 const rows=[];
 if(r.stage==='completed')rows.push({...base,id:'legacycalling_recognize_'+r.classId,label:`Ask ${m.name} to review the completed trial record`,description:`${r.mentor.name} remains the original mentor. Review the dated ${r.completion.method} proof exactly once; no repeat combat, field days, fee, personal testimony or consent is claimed.`});
 else if(needs)rows.push({...base,id:'legacycalling_handover_'+r.classId,label:`Agree to ${m.name} supervising the remaining trial`,description:`Record a named handover from ${r.supervisor.name}. Keep the original ${r.mentor.name} and all ${r.workedDays}/4 actual field days. No oath, decision, fee, skill or reward is changed by this handover.`});
 else rows.push({...base,id:'legacycalling_continue_'+r.classId,label:r.stage==='service'?'Continue the recorded field trial':'Return to the accepted trial',description:r.stage==='service'?`Complete only ${4-r.workedDays} actual remaining field days; an interruption preserves attendance.`:'Reopen the same accepted trial, including its guarded combat alternative. No time or reward passes merely by reading.',durationDays:r.stage==='service'?4-r.workedDays:0,...(!available(s,r)?{disabledReason:'The exact agreed supervisor is not currently available.'}:{})});
 rows.push({id:'legacycalling_withdraw_'+r.classId,label:'Withdraw from this unfinished initiation',description:'Keep actual work, prior choices, ordinary combat results and any earned calling. No new failure, fee, punishment or completion reward is added.',days:0,cost:0,group:'Accepted initiation'});return rows;
}
export function applyLegacyMentorTrialAction(s,id,ctx={}){
 if(typeof id!=='string'||!id.startsWith('legacycalling_'))return false;
 const a=legacyMentorTrialActions(s).find(a=>a.id===id);if(!a||a.disabledReason)return true;
 const r=record(s),m=mentor(s,r.classId);
 if(id==='legacycalling_withdraw_'+r.classId){r.stage='withdrawn';delete s.flags.pendingSpecialization;journal(s,ctx,'An initiation left honestly unfinished',`The ${r.classId} trial with ${r.mentor.name} remains unfinished, with ${r.workedDays}/4 field days recorded. No completed combat result, earned calling or prior choice is removed, and no new penalty, fee or reward is added.`);return true;}
 if(id==='legacycalling_handover_'+r.classId){const from=r.supervisor;r.handovers.push({day:s.day,fromId:from.id,toId:m.id,fromName:from.name,toName:m.name,locationId:m.locationId});r.supervisor=summary(m);s.progression.mentors[r.classId].met=true;journal(s,ctx,'A named trial supervision handover',`${r.mentor.name} remains the original mentor. You and ${m.name} agree that ${m.name} takes over the unfinished trial from ${from.name}. Its ${r.workedDays}/4 actual field days, original oath or ethical choice, and terms remain. No private relationship or consent transfers.`);return true;}
 if(id==='legacycalling_recognize_'+r.classId){
  if(!r.completion||r.stage!=='completed')return true;
  if(s.progression.learnedClassIds.includes(r.classId)){r.stage='withdrawn';delete s.flags.pendingSpecialization;journal(s,ctx,'No second calling reward is claimed',`Your ${r.classId} calling is already earned. The earlier trial proof remains, but no class, work, experience, skill or standing reward is repeated.`);return true;}
  if(ctx.awardLegacySpecialization?.(r.classId)!==true)return true;r.stage='recognized';r.recognition={day:s.day,reviewerId:m.id,reviewerName:m.name};s.progression.mentors[r.classId].met=true;
  journal(s,ctx,'A completed trial record explicitly recognized',`${m.name} reviews the dated ${r.completion.method} record under ${r.completion.supervisorName} and recognizes your earned ${r.classId} discipline. The earlier mentor remains ${r.mentor.name}; this is administrative recognition of preserved work, not a substitute person's testimony or consent. No trial days, combat reward or fee are repeated.`);return true;
 }
 if(r.stage==='service')return continueLegacyMentorField(s,ctx);
 ctx.resumeLegacyTrial?.(r.classId);return true;
}
export function validateLegacyMentorTrial(s){
 const r=record(s);if(r===undefined)return true;
 const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v)),text=v=>typeof v==='string'&&v.length>0&&v.length<=80,int=(v,a=0,b=s.day)=>Number.isSafeInteger(v)&&v>=a&&v<=b,site=id=>text(id)&&s.world.locations.some(p=>p.id===id),actor=a=>plain(a)&&Object.keys(a).every(k=>['id','name','locationId'].includes(k))&&canonicalMentorId(s,r.classId,a.id)&&text(a.name)&&site(a.locationId);
 if(!plain(r)||Object.keys(r).some(k=>!['version','classId','mentor','supervisor','startedDay','stage','workedDays','completion','recognition','handovers'].includes(k))||r.version!==1||!Object.hasOwn(routes,r.classId)||!actor(r.mentor)||!actor(r.supervisor)||!int(r.startedDay)||!['offer','trial','service','completed','recognized','withdrawn'].includes(r.stage)||!int(r.workedDays,0,4)||!Array.isArray(r.handovers)||r.handovers.length>3500)return false;
 if(!r.handovers.every((h,i)=>plain(h)&&Object.keys(h).every(k=>['day','fromId','toId','fromName','toName','locationId'].includes(k))&&int(h.day,r.startedDay)&&canonicalMentorId(s,r.classId,h.fromId)&&canonicalMentorId(s,r.classId,h.toId)&&h.fromId!==h.toId&&h.fromId===(i?r.handovers[i-1].toId:r.mentor.id)&&text(h.fromName)&&text(h.toName)&&site(h.locationId)&&(i===0||h.day>=r.handovers[i-1].day)))return false;
 if(r.supervisor.id!==(r.handovers.at(-1)?.toId||r.mentor.id))return false;
 if(r.completion!==null){const c=r.completion;if(!plain(c)||Object.keys(c).some(k=>!['method','day','locationId','supervisorId','supervisorName'].includes(k))||!['combat','service'].includes(c.method)||!int(c.day,r.startedDay)||!site(c.locationId)||c.supervisorId!==r.supervisor.id||!text(c.supervisorName)||c.method==='service'&&r.workedDays!==4||!['completed','recognized','withdrawn'].includes(r.stage))return false;}
 else if(['completed','recognized'].includes(r.stage))return false;
 if(r.recognition!==null){const a=r.recognition;if(!plain(a)||Object.keys(a).some(k=>!['day','reviewerId','reviewerName'].includes(k))||r.stage!=='recognized'||!r.completion||!int(a.day,r.completion.day)||!canonicalMentorId(s,r.classId,a.reviewerId)||!text(a.reviewerName))return false;}else if(r.stage==='recognized')return false;
 if(r.stage==='recognized'&&!s.progression.learnedClassIds.includes(r.classId)||r.stage==='offer'&&r.workedDays!==0||r.stage==='trial'&&r.workedDays!==0||r.stage==='service'&&r.workedDays>=4)return false;
 if(activeLegacyMentorTrial(s)&&r.stage!=='offer'&&s.flags.pendingSpecialization!==r.classId||r.stage==='offer'&&s.event?.id!==({paladin:'paladin_oath',necromancer:'necromancer_ethics',assassin:'assassin_commission'}[r.classId]))return false;
 return true;
}
