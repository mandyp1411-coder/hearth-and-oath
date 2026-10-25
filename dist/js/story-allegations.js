import { isSettlement } from './world.js';

const owner=s=>s.dynasty?.activePersonId||'hero';
const participant=(s,id)=>[...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[]),...(s.life?.children||[])].find(p=>p.id===id);
const incident=(s,id)=>s.legal?.incidents?.find(i=>i.locationId===id);
const reportById=(s,id)=>s.stories?.allegations?.find(r=>r.id===id);

/** Deliberately narrow: this authored act explicitly forges a household claim,
 * and its named participant keeps the earlier agreement. Pressure, unpopular
 * choices and private knowledge are not automatically crimes. */
export function personalAllegationPlan(s,a,who){
  if(a.contentVersion!==4||a.id!=='hearth_letter'||a.chapter!==1||!who||who.alive===false||who.locationId!==a.locationId||!isSettlement(s.world,a.locationId))return null;
  return {version:1,arcId:a.id,chapter:1,ownerId:owner(s),locationId:a.locationId,witnessId:who.id,witnessName:who.name,preparedDay:s.day};
}
export function recordPersonalAllegation(s,a,plan){
  const choice=a.choices[plan.chapter];if(!choice||choice.id!=='coercion'||choice.legalNoticeVersion!==1)return;
  const id=`forgery-${s.dynasty?.generation||1}-${a.startedDay}`;
  s.stories.allegations||=[];if(s.stories.allegations.some(r=>r.id===id))return;
  s.stories.allegations.push({...plan,id,completedDay:choice.day,readyDay:choice.day+7,status:'waiting',reportedDay:null,answeredDay:null,response:null,priorDescription:null,priorEvidence:null,evidenceDescription:null});
}
function writeNote(s,r,ctx,title,text){
  const a=s.stories.arcs.find(a=>a.id===r.arcId);
  s.stories.history.push({id:`story-law-${r.id}-${r.response||'report'}`,day:s.day,title,text,arcId:r.arcId,personId:r.witnessId,personName:r.witnessName,locationId:r.locationId,chapter:Math.min(a.chapter,2),choice:null});
  s.stories.history=s.stories.history.slice(-100);s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'crime');
}
export function flushPersonalAllegation(s,ctx){
  if(typeof ctx?.addEvidence!=='function'||typeof ctx?.setEvent!=='function')return false;
  if(!s.stories?.allegations?.length||s.event||s.battle||s.conversations?.pending||s.justice?.prison||s.timeline?.journey||s.workshop?.project||s.careers?.batch||s.life?.plan||s.stories.project||s.stories.pending||s.sanctuaries?.commitment||s.phase!=='adult'||s.age<18||!isSettlement(s.world,s.locationId))return false;
  const r=s.stories.allegations.find(r=>r.status==='waiting'&&r.ownerId===owner(s)&&r.locationId===s.locationId&&s.day>=r.readyDay&&(()=>{const p=participant(s,r.witnessId);return p&&p.name===r.witnessName&&p.alive!==false&&p.locationId===r.locationId;})());
  if(!r)return false;
  const old=incident(s,r.locationId);r.priorDescription=old?.description||null;r.priorEvidence=old?.evidence||0;
  r.status='reported';r.reportedDay=s.day;
  r.evidenceDescription=`${r.witnessName} filed the earlier household agreement beside your altered sole-key claim from day ${r.completedDay}. This is a documented local forgery allegation, not a conviction.`;
  ctx.addEvidence?.(1,r.evidenceDescription);s.stories.allegationPending=r.id;
  writeNote(s,r,ctx,'A retained agreement reaches the local clerk',r.evidenceDescription);
  ctx.setEvent('stories_allegation','Two copies before the local clerk','An allegation, not a conviction',`${r.witnessName} has brought the retained agreement and the altered household claim to ${s.world.locations.find(p=>p.id===r.locationId).name}. The clerk records a disputed forgery allegation. Only this locality has received these documents; your private life and other choices are not part of the report.`,[
    {id:'correct',label:'Withdraw the altered claim and file a correction',description:'Pay a 12-gold filing fee; withdraw this claim and answer only this report’s 1 evidence. Other charges remain. No calendar days or reputation reward.',...(s.hero.gold<12?{disabledReason:'Requires the 12-gold filing fee; a defense and the free ordinary hearing route remain available.'}:{})},
    {id:'defend',label:'Enter my defense and request the ordinary hearing',description:'No fee or calendar days. Keep your statement beside the document; retain 1 local evidence, not a conviction. Advocacy, free supervised service and lawful restitution remain available.'},
    {id:'pressure',label:'Threaten the witness into withdrawing',description:'A new witnessed threat adds 2 local evidence and breaches an oath. It does not destroy the retained documents. Arrest becomes possible under the regional law.'},
  ]);return true;
}

function answerOwnEvidence(s,r){
  const i=incident(s,r.locationId);if(!i)return;
  i.evidence=Math.max(0,i.evidence-1);
  if(i.evidence&&i.description===r.evidenceDescription)i.description=r.priorDescription||'Another separately recorded local report remains.';
  if(!i.evidence)s.legal.incidents=s.legal.incidents.filter(v=>v!==i);
  for(const c of s.sanctuaries?.cases||[])if(c.locationId===r.locationId&&c.status!=='resolved'){
    c.evidence=i.evidence;c.description=i.evidence?i.description:r.evidenceDescription;
    if(!i.evidence){c.status='resolved';c.resolvedDay=s.day;c.resolution='legal_external';s.sanctuaries.queue=s.sanctuaries.queue.filter(q=>q.refId!==c.id);if(s.sanctuaries.pending?.refId===c.id)s.sanctuaries.pending=null;}
  }
}
export function applyPersonalAllegationChoice(s,id,ctx){
  const r=reportById(s,s.stories?.allegationPending);
  if(!r||r.status!=='reported'||r.ownerId!==owner(s)||r.locationId!==s.locationId||!['correct','defend','pressure'].includes(id)||id==='correct'&&s.hero.gold<12)return false;
  const a=s.stories.arcs.find(a=>a.id===r.arcId);
  if(id==='correct'){s.hero.gold-=12;answerOwnEvidence(s,r);a.legalReply={reportId:r.id,day:s.day,choice:'correct'};}
  if(id==='pressure')ctx.addEvidence?.(2,`${r.witnessName} witnessed your threat at the local clerk’s table. The earlier household agreement and disputed altered claim remain on file.`);
  r.response=id;r.status='answered';r.answeredDay=s.day;s.stories.allegationPending=null;
  if(id==='pressure')ctx.breakOath?.('You threatened a named witness before a local clerk.');
  const text=id==='correct'?`You paid the 12-gold filing fee and withdrew the altered claim. ${r.witnessName}’s earlier agreement and your correction stay together; only this report’s 1 evidence was answered. Other local reports and the earlier choice remain recorded.`:id==='defend'?`Your defense was filed beside ${r.witnessName}’s documents without a fee, forced confession or conviction. The disputed report remains local; the ordinary hearing offers advocacy, free supervised service and restitution.`:`${r.witnessName}’s witnessed account of your threat adds 2 local evidence. The documents remain, and the region can now act on the combined local report. No other settlement learned it automatically.`;
  writeNote(s,r,ctx,'An answer before the local clerk',text);return true;
}

export function allegationAwareRow(a,base){
  if(a.id!=='hearth_letter'||a.chapter!==2||a.legalReply?.choice!=='correct')return base;
  return ['Your correction is already filed beside the earlier household agreement. {name} brings a new question about how the room will be used this season. The altered sole-key claim is withdrawn; the household now needs a plan rather than another verdict on the answered report.',
    {label:'Agree shared use and keep both accounts',outcome:'The household records a shared room plan beside the earlier correction. The withdrawn claim is not treated as an unanswered debt.',deed:'shared_room'},
    {label:'Write a bounded lease for the room alone',outcome:'A new lease states the room, hours and payment without claiming anyone’s work or confidence. The earlier correction remains on file.',deed:'bounded_lease'},
    {label:'Pressure the household into exclusive access again',outcome:'You impose new exclusive terms. The household keeps its earlier agreement and your correction beside this fresh account of pressure.',deed:'new_exclusive_pressure'},
  ];
}
export function validateStoryAllegations(v,s){
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),str=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n,int=(x,min=0,max=s.day)=>Number.isSafeInteger(x)&&x>=min&&x<=max,site=id=>s.world.locations.some(p=>p.id===id);
  const plan=p=>obj(p)&&p.version===1&&p.arcId==='hearth_letter'&&p.chapter===1&&str(p.ownerId,160)&&site(p.locationId)&&str(p.witnessId,80)&&str(p.witnessName,100)&&int(p.preparedDay);
  for(const p of [v.pending,v.project].filter(Boolean))if(p.legalPlan!==undefined){const a=v.arcs.find(a=>a.id===p.arcId),l=p.legalPlan;if(!plan(l)||!a||a.id!==l.arcId||a.personId!==l.witnessId||a.personName!==l.witnessName||a.locationId!==l.locationId||a.chapter!==1||l.preparedDay<a.startedDay||l.ownerId!==owner(s)||v.project===p&&p.choice!=='coercion')return false;}
  if(v.allegations!==undefined&&(!Array.isArray(v.allegations)||v.allegations.length>24||new Set(v.allegations.map(r=>r.id)).size!==v.allegations.length||new Set(v.allegations.map(r=>`${r.ownerId}:${r.arcId}:${r.chapter}`)).size!==v.allegations.length||!v.allegations.every(r=>{
    const a=v.arcs.find(a=>a.id===r.arcId),c=a?.choices[r.chapter];
    return plan(r)&&str(r.id,100)&&a&&r.witnessId===a.personId&&r.witnessName===a.personName&&r.locationId===a.locationId&&c?.id==='coercion'&&c.legalNoticeVersion===1&&r.completedDay===c.day&&int(r.completedDay,r.preparedDay)&&r.readyDay===r.completedDay+7&&['waiting','reported','answered'].includes(r.status)&&(r.reportedDay===null||int(r.reportedDay,r.readyDay))&&(r.answeredDay===null||r.reportedDay!==null&&int(r.answeredDay,r.reportedDay))&&[null,'correct','defend','pressure'].includes(r.response)&&(r.priorDescription===null||str(r.priorDescription,3000))&&(r.priorEvidence===null||int(r.priorEvidence,0,10000))&&(r.evidenceDescription===null||str(r.evidenceDescription,2000))&&(r.status==='waiting'?r.reportedDay===null&&r.answeredDay===null&&r.response===null:r.reportedDay!==null&&r.priorEvidence!==null&&r.evidenceDescription!==null&&(r.status==='reported'?r.answeredDay===null&&r.response===null:r.answeredDay!==null&&r.response!==null));
  })))return false;
  const open=(v.allegations||[]).filter(r=>r.status==='reported');if(open.length>1||open.length===1&&(v.allegationPending!==open[0].id||!(incident(s,open[0].locationId)?.evidence>=1)))return false;
  if(v.allegationPending!==undefined&&v.allegationPending!==null){const r=v.allegations?.find(r=>r.id===v.allegationPending);if(!r||r.status!=='reported'||s.event?.id!=='stories_allegation'||r.locationId!==s.locationId||r.ownerId!==owner(s))return false;}
  if(s.event?.id==='stories_allegation'&&!v.allegationPending)return false;
  for(const a of v.arcs){if(a.choices.some((c,i)=>c.legalNoticeVersion!==undefined&&(c.legalNoticeVersion!==1||a.id!=='hearth_letter'||i!==1||c.id!=='coercion'||!v.allegations?.some(r=>r.arcId===a.id&&r.chapter===i&&r.completedDay===c.day))))return false;if(a.legalReply!==undefined){const r=v.allegations?.find(r=>r.id===a.legalReply.reportId);if(!obj(a.legalReply)||!r||r.arcId!==a.id||r.response!=='correct'||a.legalReply.choice!=='correct'||a.legalReply.day!==r.answeredDay)return false;}}
  return true;
}
