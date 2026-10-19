import { generateCharacter } from './characters.js';
import { isCanonicalAppearance } from './avatar.js';
import { agingPolicy } from './aging-policy-v25.js';
import { seededRoll } from './world.js';

const YEAR=365, MAX_SLOTS=84*24+12, MAX_PEOPLE=MAX_SLOTS+4096, legacyCache=new Map();
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const safe=id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
const int=(v,a=0,b=10000000)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const text=(v,max)=>typeof v==='string'&&v.length>0&&v.length<=max;
const roles=['Potter','Baker','Fisher','Wanderer','Weaver','Gardener','Musician','Cart Driver','Cooper','Scribe','Dockworker','Hunter'];
const rooms=['market','homes','gate','tavern','market','homes','tavern','gate','market','archive','gate','tavern'];
export const GENERIC_NPC_ROLES=Object.freeze({doctor:'Doctor',work:'Work Steward',inn:'Innkeeper',smith:'Craftsperson',watch:'Watch Captain',guide:'Local Guide',animals:'Animal Keeper',archivist:'Archivist',materials:'Materials Merchant',apothecary:'Apothecary',outfitter:'Travel Outfitter',faction:'Faction Representative',envoy:'Regional Envoy'});
// Campaign damage can remove every current service, even from a citadel or
// sanctuary. The validated world's existing site is the historical anchor.
const historicalSettlement=(s,id)=>s.world.locations.some(p=>p.id===id);
export const MENTOR_CALLINGS=Object.freeze(['guardian','berserker','knight','paladin','healer','elementalist','druid','necromancer','thief','ranger','assassin','bard']);
const mentorRole=id=>id[0].toUpperCase()+id.slice(1)+' Mentor';
const slotKey=d=>d.kind==='mentor'?`mentor:${d.classId}`:d.kind==='town'?`town:${d.siteId}:${d.index}`:`service:${d.siteId}:${d.service}:${d.subjectId||''}`;
const ageAt=(r,day)=>Math.max(0,r.ageBasis.kind==='born'?Math.floor((day-r.ageBasis.bornDay)/YEAR):r.ageBasis.baseAge+Math.floor(day/YEAR));

function snapshot(p){
 const result={id:p.id,name:p.name,role:p.role,locationId:p.locationId};
 for(const key of ['appearance','pronouns','disposition','character','description','roomId','population'])if(p[key]!==undefined)result[key]=structuredClone(p[key]);
 return result;
}
function preferredIdentity(s,p){
 const saved=s.socialLife?.met?.[p.id]||s.conversations?.servicePeople?.[p.id],life=s.life?.people?.find(x=>x.id===p.id);
 const identity=life||saved;
 if(!identity)return p;
 return {...p,...Object.fromEntries(['name','appearance','pronouns','disposition','character'].filter(k=>identity[k]!==undefined).map(k=>[k,identity[k]]))};
}
function retirementDay(s,p,basis,day){
 const age=ageAt({ageBasis:basis},day),target=agingPolicy(p).elder+5+seededRoll(s.seed,`npc16:${p.id}:retirement-years`,11);
 // This is an individual future handover, not a retroactive birth or death.
 return day+Math.max(8,target-age)*YEAR+seededRoll(s.seed,`npc16:${p.id}:retirement-day`,YEAR);
}
function publicPerson(s,r){
 const retired=r.retiredDay!==null,day=retired?r.retiredDay:s.day;
 return {...r.snapshot,npcActive:!retired,age:ageAt(r,day),...(r.ageBasis.kind==='born'?{bornDay:r.ageBasis.bornDay,baseAge:ageAt(r,day)-Math.floor(day/YEAR)}:{baseAge:r.ageBasis.baseAge}),serviceEndDay:r.retireDay,...(retired?{retired:true,retiredDay:r.retiredDay,ageAtRetirement:ageAt(r,r.retiredDay),successorId:r.successorId,successorName:r.successorName,...(r.vacancyReason==='recorded-death'?{alive:false,recordedDeath:true,deathDay:r.recordedDeathDay}:{}),availabilityReason:r.vacancyReason==='recorded-death'?'The existing private life record reports their death; public succession does not create that death.':'Retired from this public role; later whereabouts are unrecorded.'}:{})};
}
export const NPC_FAVOR_RETURN_DAYS=90;
export function npcContinuationAvailable(s,p){
 const r=s.npcContinuity?.people?.[p.id];if(!r||r.retiredDay===null)return false;
 const accepted=(s.socialLife?.favors||[]).some(f=>f.personId===p.id&&f.status==='active'&&f.returnWindow?.retiredDay===r.retiredDay&&s.day<=f.returnWindow.untilDay);
 if(!accepted)return false;
 const life=s.life?.people?.find(x=>x.id===p.id),family=s.family?.members?.find(m=>m.personId===p.id),site=s.world.locations.find(x=>x.id===p.locationId);
 return life?.alive!==false&&p.alive!==false&&(!family||family.availability==='present')&&!!site&&!['destroyed','evacuated'].includes(site.status)&&site.servicesAvailable!==false&&!s.realm?.politics?.holds.some(h=>h.siteId===p.locationId&&h.status==='held');
}
// A consent record is not evidence of current presence. This only identifies
// why an existing agreement must pause, never makes its participant available.
export function retiredNpcAvailabilityUnknown(s,id){
 const r=s.npcContinuity?.people?.[id];if(!r||r.retiredDay===null)return false;
 return ![...(s.life?.people||[]),...(s.companions||[]),...(s.society?.people||[]),...(s.society?.archive||[]),...(s.rpg?.contacts||[])].some(p=>p.id===id)&&!(s.family?.members||[]).some(m=>m.personId===id&&m.availability!=='present');
}
export function currentMentorNpc(s,classId){const d=s.npcContinuity?.slots?.['mentor:'+classId],r=d&&s.npcContinuity.people[d.personId];return r?publicPerson(s,r):null;}
export function canonicalMentorId(s,classId,id){
 if(!MENTOR_CALLINGS.includes(classId))return false;
 if(id===`calling-mentor-${classId}`)return true;
 const r=s?.npcContinuity?.people?.[id];return !!r&&r.slotKey==='mentor:'+classId&&r.snapshot.id===id&&id===`calling-mentor-${classId}-npc16-r${r.generation}`&&r.generation>0;
}
// Private study records follow the hero, never a public office or an heir.
export function synchronizeMentorContinuity(s){
 if(!s.progression?.mentors)return;
 for(const d of Object.values(s.npcContinuity?.slots||{}).filter(d=>d.kind==='mentor')){
  const p=publicPerson(s,s.npcContinuity.people[d.personId]),old=s.progression.mentors[d.classId];
  if(old?.id===p.id){old.name=p.name;old.locationId=p.locationId;continue;}
  const historical=old&&s.npcContinuity.people[old.id];
  if((old?.met||old?.lessons)&&historical?.retiredDay!==null&&historical?.retiredDay!==undefined){s.progression.mentorHistory ||= {};s.progression.mentorHistory[old.id]={...structuredClone(old),classId:d.classId,retiredDay:historical.retiredDay};}
  s.progression.mentors[d.classId]={id:p.id,name:p.name,locationId:p.locationId,met:false,lessons:0};
 }
}
export function projectNpcPerson(s,p){const r=s.npcContinuity?.people?.[p.id];return r?{...p,...publicPerson(s,r)}:p;}

export function townNpc(s,siteId,index){
 const descriptor={kind:'town',siteId,index},slot=s.npcContinuity?.slots?.[slotKey(descriptor)],record=slot&&s.npcContinuity.people[slot.personId];
 if(record)return {...publicPerson(s,record),npcSlot:descriptor};
 const epoch=Math.floor(s.day/(55*YEAR)),id=`townsfolk-${siteId}-${epoch}-${index}`,role=roles[seededRoll(s.seed,id+':role',roles.length)],age=20+seededRoll(s.seed,id+':age',28);
 const cacheKey=s.seed+':'+id;if(legacyCache.has(cacheKey))return {...legacyCache.get(cacheKey),age:age+Math.floor(s.day/YEAR)-epoch*55,npcSlot:descriptor};
 const p=generateCharacter(s.seed,id,{role,age}),detail=['restores old musical instruments','knows every fishing spot beside the old road','is saving for a journey to the coast','writes small poems on scraps of paper','looks after a neighbour’s abandoned garden','has recently moved here to start again','collects painted cups from other settlements','spends spare afternoons mending toys'][seededRoll(s.seed,id+':life',8)];
 const result={...p,id,age:age+Math.floor(s.day/YEAR)-epoch*55,baseAge:age-epoch*55,serviceEndDay:(epoch+1)*55*YEAR,role,locationId:siteId,roomId:rooms[roles.indexOf(role)],description:`${p.name} works as a ${role.toLowerCase()} and ${detail}.`,bond:25,population:true};
 if(legacyCache.size>2000)legacyCache.clear();legacyCache.set(cacheKey,result);return {...result,npcSlot:descriptor};
}
export function serviceNpc(s,service,siteId,subjectId=''){
 const descriptor={kind:'service',service,siteId,subjectId},slot=s.npcContinuity?.slots?.[slotKey(descriptor)],record=slot&&s.npcContinuity.people[slot.personId];
 if(record)return {...publicPerson(s,record),bond:40,npcSlot:descriptor};
 const epoch=Math.floor(s.day/(55*YEAR)),salt=`resident-${service}-${siteId}-${epoch}`,id=service==='faction'?`resident-faction-${subjectId}-${siteId}-${epoch}`:salt,age=28+seededRoll(s.seed,salt+':age',27),role=GENERIC_NPC_ROLES[service];
 // Legacy faction representatives intentionally retain their original salt.
 const cacheKey=s.seed+':'+id;let p=legacyCache.get(cacheKey);if(!p){p=generateCharacter(s.seed,salt,{role,age});if(legacyCache.size>2000)legacyCache.clear();legacyCache.set(cacheKey,p);}
 return {...p,id,age:age+Math.floor(s.day/YEAR)-epoch*55,baseAge:age-epoch*55,serviceEndDay:(epoch+1)*55*YEAR,locationId:siteId,role,available:true,bond:40,npcSlot:descriptor};
}

export function initializeNpcContinuity(s){
 if(s.npcContinuity===undefined)s.npcContinuity={version:1,adoptedDay:s.day,slots:{},people:{}};
}
export function observeNpcContinuity(s,people){
 const n=s.npcContinuity;if(!n)return;
 for(const p of people){
  const d=p.npcSlot;if(!d)continue;const key=slotKey(d);if(Object.hasOwn(n.slots,key)||Object.keys(n.slots).length>=MAX_SLOTS)continue;
  const identity={...preferredIdentity(s,p),...(d.kind==='service'?{role:GENERIC_NPC_ROLES[d.service]}:d.kind==='mentor'?{role:mentorRole(d.classId)}:{})},basis={kind:'legacy',baseAge:p.baseAge};
  n.slots[key]={...structuredClone(d),personId:p.id,generation:0};
  n.people[p.id]={slotKey:key,generation:0,snapshot:snapshot(identity),ageBasis:basis,observedDay:s.day,termStartDay:null,retireDay:retirementDay(s,identity,basis,s.day),retiredDay:null,successorId:null,successorName:null};
 }
}
function factionMissionReferences(s,id,{pendingOnly=false}={}){
 return (s.rpg?.factions||[]).some(f=>{
  const m=f.firstMission;if(!m)return false;
  if(pendingOnly){if(s.rpg?.pending?.kind!=='faction'||s.rpg.pending.id!==f.id||!s.rpg.pending.objectiveDecision)return false;return Object.entries(m.cast||{}).some(([key,p])=>(m.custody||[]).filter(h=>h.key===key).at(-1)?.to?.id===id||!(m.custody||[]).some(h=>h.key===key)&&p.id===id);}
  return Object.values(m.cast||{}).some(p=>p.id===id)||(m.custody||[]).some(h=>h.fromId===id||h.to?.id===id)||(m.evidence||[]).some(e=>e.actorIds?.includes(id));
 });
}
const familyOriginReference=(s,id)=>Object.values(s.familyOrigins?.run?.cast||{}).some(p=>p?.id===id);
const researchReference=(s,id)=>s.event?.researchOffer?.archivist?.id===id||(s.researchPortfolio?.runs||[]).some(run=>Object.values(run.cast||{}).some(person=>person?.id===id)||(run.custody||[]).some(row=>row.fromId===id||row.to?.id===id));
const countingTableReference=(s,id)=>Object.values(s.justice?.countingTableJob?.cast||{}).some(p=>p?.id===id)||[s.justice?.countingTableOffer?.merchantPersonId,s.justice?.countingTableOffer?.quietTablePersonId].includes(id);
function referenced(s,id){
 return !!([s.adultTournament?.host,...(s.adultTournament?.opponents||[])].some(p=>p?.id===id)||countingTableReference(s,id)||researchReference(s,id)||(s.repertoire?.performances||[]).some(p=>p.listener?.id===id)||s.repertoire?.project?.listener?.id===id||s.repertoire?.pending?.personId===id||familyOriginReference(s,id)||factionMissionReferences(s,id)||s.socialLife?.met?.[id]||s.conversations?.servicePeople?.[id]||s.conversations?.threads?.[id]||s.conversations?.relationships?.[id]||s.conversations?.meetings?.[id]||s.life?.people?.some(p=>p.id===id)||(s.socialLife?.favors||[]).some(f=>f.personId===id)||(s.stories?.arcs||[]).some(a=>a.personId===id)||[...(s.sanctuaries?.agreements||[]),...(s.sanctuaries?.plans||[])].some(a=>a.contactId===id)||s.sanctuaries?.pending?.refId===id||s.flags?.legacyMentorTrial?.mentor?.id===id||s.flags?.legacyMentorTrial?.supervisor?.id===id||s.flags?.legacyMentorTrial?.handovers?.some(h=>h.fromId===id||h.toId===id)||s.fellowship?.pending?.mentor?.id===id||s.progression?.pendingMentor?.id===id||s.progression?.mentorHistory?.[id]||Object.values(s.progression?.mentors||{}).some(m=>m.id===id&&(m.met||m.lessons))||(s.progression?.initiations||[]).some(r=>r.mentorId===id||r.supervisor?.id===id)||Object.values(s.fellowship?.formations||{}).some(r=>r.mentorId===id||r.supervisor?.id===id||r.handovers?.some(h=>h.fromId===id||h.toId===id)));
}
function pinned(s,id){
 if(s.life?.people?.some(p=>p.id===id&&p.alive===false))return false;
 if((s.event?.id==='tournament_invitation'||s.battle?.context?.kind==='tournament')&&[s.adultTournament?.host,...(s.adultTournament?.opponents||[])].some(p=>p?.id===id))return true;
 const origin=s.familyOrigins?.pending,cast=s.familyOrigins?.run?.cast;if(origin&&(origin.sceneId==='register'&&origin.mode==='available'&&cast?.archivist?.id===id||origin.sceneId==='contact'&&origin.mode==='available'&&cast?.lead?.id===id||origin.sceneId==='guardian'&&origin.mode==='living'&&cast?.guardian?.id===id))return true;
 if(s.event?.researchOffer?.archivist?.id===id||s.researchPortfolio?.pending?.actorId===id)return true;
 if(factionMissionReferences(s,id,{pendingOnly:true}))return true;
 if(s.event?.id==='repertoire_recall'&&s.repertoire?.pending?.personId===id)return true;
 if(s.flags?.legacyMentorTrial?.supervisor?.id===id&&(['paladin_oath','necromancer_ethics','assassin_commission','initiation_trial'].includes(s.event?.id)||s.battle?.encounterId==='initiation'))return true;
 if(s.progression?.pendingCalling&&(s.progression.pendingMentor?.id||s.progression.mentors?.[s.progression.pendingCalling]?.id)===id)return true;
 if(s.fellowship?.pending?.kind==='formation'){const r=s.fellowship.formations[s.fellowship.pending.subjectId];if((s.fellowship.pending.mentor?.id||r?.supervisor?.id||r?.mentorId)===id)return true;}
 if(s.conversations?.pending?.personId===id||s.sanctuaries?.pending?.refId===id)return true;
 if(s.stories?.pending&&(s.stories.arcs||[]).some(a=>a.personId===id&&s.stories.pending.arcId===a.id))return true;
 for(const system of [s.pastimes,s.social])if([system?.pending].some(p=>p&&(p.personId===id||p.actorIds?.includes(id))))return true;
 return false;
}
const successorId=(slot,generation)=>slot.kind==='mentor'?`calling-mentor-${slot.classId}-npc16-r${generation}`:slot.kind==='town'?`townsfolk-${slot.siteId}-npc16-${slot.index}-r${generation}`:`resident-npc16-${slot.service}-${slot.subjectId?slot.subjectId+'-':''}${slot.siteId}-r${generation}`;
const legacyId=(slot,day)=>{if(slot.kind==='mentor')return `calling-mentor-${slot.classId}`;const epoch=Math.floor(day/(55*YEAR));return slot.kind==='town'?`townsfolk-${slot.siteId}-${epoch}-${slot.index}`:slot.service==='faction'?`resident-faction-${slot.subjectId}-${slot.siteId}-${epoch}`:`resident-${slot.service}-${slot.siteId}-${epoch}`;};
function replacement(s,slot,generation,day){
 const id=successorId(slot,generation);
 const role=slot.kind==='town'?roles[seededRoll(s.seed,id+':role',roles.length)]:slot.kind==='mentor'?mentorRole(slot.classId):GENERIC_NPC_ROLES[slot.service],age=(slot.kind==='town'?20:slot.kind==='mentor'?30:28)+seededRoll(s.seed,id+':age',slot.kind==='town'?28:slot.kind==='mentor'?18:27),p={...generateCharacter(s.seed,id,{role,age}),id,role,locationId:slot.siteId};
 if(slot.kind==='town'){p.population=true;p.roomId=rooms[roles.indexOf(role)];p.description=`${p.name} works as a ${role.toLowerCase()} and has a life beyond the public work of this settlement.`;}
 const basis={kind:'born',bornDay:day-age*YEAR};
 return {slotKey:slotKey(slot),generation,snapshot:snapshot(p),ageBasis:basis,observedDay:day,termStartDay:day,retireDay:retirementDay(s,p,basis,day),retiredDay:null,successorId:null,successorName:null};
}
/** Called only after an action handler finishes. Views never advance a roster. */
export function reconcileNpcContinuity(s,ctx={}){
 const n=s.npcContinuity;if(!n)return;
 // Previous heroes' unreferenced public snapshots contain no private memories.
 // Their dated journal remains; do not let unused records freeze new roles.
 for(const [id,r]of Object.entries(n.people))if(r.retiredDay!==null&&!referenced(s,id))delete n.people[id];
 for(const slot of Object.values(n.slots)){
  let old=n.people[slot.personId],death=s.life?.people?.find(p=>p.id===slot.personId&&p.alive===false);if(!old||!death&&old.retireDay>s.day||pinned(s,slot.personId))continue;
  // A bounded minimum eight-year term limits catch-up to fewer than 3,500
  // entries even at the save calendar's absolute limit, not a population sim.
  for(let count=0;(death||old.retireDay<=s.day)&&count<3500;count++){
   const oldId=slot.personId,known=referenced(s,oldId),day=death?Math.max(old.observedDay,Number.isSafeInteger(death.deathDay)?death.deathDay:s.day):old.retireDay,next=replacement(s,slot,slot.generation+1,day),nextId=next.snapshot.id;
   if(!safe(nextId)||Object.hasOwn(n.people,nextId)||slot.generation>=3500||Object.keys(n.people).length>=MAX_PEOPLE)break;
   old.retiredDay=day;if(death){old.vacancyReason='recorded-death';old.recordedDeathDay=Number.isSafeInteger(death.deathDay)?death.deathDay:null;slot.deathHandovers=(slot.deathHandovers||0)+1;}old.successorId=nextId;old.successorName=next.snapshot.name;
   const favor=s.socialLife?.favors?.find(f=>f.personId===oldId&&f.status==='active');if(favor&&!death)favor.returnWindow={retiredDay:day,untilDay:day+NPC_FAVOR_RETURN_DAYS};
   slot.personId=nextId;slot.generation++;n.people[nextId]=next;
   if(slot.kind==='mentor')synchronizeMentorContinuity(s);
   if(known)ctx.journalLiteral?.('A public role passes to another person',`${old.snapshot.name} ${death?'left a vacant public role after the existing life record reported their death':'retired from the public role'} of ${old.snapshot.role.toLowerCase()} at ${s.world.locations.find(p=>p.id===slot.siteId)?.name||slot.siteId} on world day ${day}. ${next.snapshot.name} took over that role. Earlier relationships and private memories belong to their original people, not the office. ${death?'This handover cites the already-recorded death; it does not invent another life event.':'Retirement is not a report of death.'}${favor&&!death?` The earlier favour for this person has a one-time return window through world day ${favor.returnWindow.untilDay}, subject to their actual availability. After that, you can withdraw without losing supplies, Gold or trust; no failure is recorded.`:''}`,'relationships');
   else delete n.people[oldId];
   old=next;death=null;
  }
 }
}
export function retiredNpcContacts(s){
 return Object.values(s.npcContinuity?.people||{}).filter(r=>r.retiredDay!==null&&referenced(s,r.snapshot.id)).map(r=>({...publicPerson(s,r),bond:r.snapshot.population?25:40,minAge:r.slotKey.startsWith('mentor:')?14:r.snapshot.population?6:0,kind:'extra',available:npcContinuationAvailable(s,r.snapshot),commitmentOnly:npcContinuationAvailable(s,r.snapshot),source:s.conversations?.relationships?.[r.snapshot.id]}));
}

export function validateNpcContinuity(s){
 const n=s.npcContinuity;if(n===undefined)return true;
 if(!plain(n)||Object.keys(n).some(k=>!['version','adoptedDay','slots','people'].includes(k))||n.version!==1||!int(n.adoptedDay,0,s.day)||!plain(n.slots)||!plain(n.people)||Object.keys(n.slots).length>MAX_SLOTS||Object.keys(n.people).length>MAX_PEOPLE)return false;
 const ids=new Set();
 for(const [key,d]of Object.entries(n.slots)){
  const fields=d.kind==='town'?['kind','siteId','index','personId','generation','deathHandovers']:d.kind==='mentor'?['kind','siteId','classId','personId','generation','deathHandovers']:['kind','siteId','service','subjectId','personId','generation','deathHandovers'];
  if(!plain(d)||Object.keys(d).some(k=>!fields.includes(k))||!['town','service','mentor'].includes(d.kind)||!historicalSettlement(s,d.siteId)||d.kind==='town'&&!int(d.index,0,9)||d.kind==='mentor'&&!MENTOR_CALLINGS.includes(d.classId)||d.kind==='service'&&(!Object.hasOwn(GENERIC_NPC_ROLES,d.service)||typeof d.subjectId!=='string'||d.subjectId.length>80||(d.service==='faction'?!safe(d.subjectId):d.subjectId!==''))||key!==slotKey(d)||!safe(d.personId)||!int(d.deathHandovers??0,0,3500)||!int(d.generation,0,Math.min(3500,Math.floor((s.day-n.adoptedDay)/(8*YEAR))+(d.deathHandovers||0)))||d.deathHandovers>d.generation||ids.has(d.personId))return false;
  const r=n.people[d.personId];if(!r||r.slotKey!==key||r.retiredDay!==null||r.generation!==d.generation)return false;ids.add(d.personId);
 }
 for(const [id,r]of Object.entries(n.people)){
  if(!safe(id)||!plain(r)||Object.keys(r).some(k=>!['slotKey','generation','snapshot','ageBasis','observedDay','termStartDay','retireDay','retiredDay','successorId','successorName','vacancyReason','recordedDeathDay'].includes(k))||!Object.hasOwn(n.slots,r.slotKey)||!int(r.generation,0,3500)||!plain(r.snapshot)||r.snapshot.id!==id||!text(r.snapshot.name,100)||!text(r.snapshot.role,160)||r.snapshot.locationId!==n.slots[r.slotKey].siteId||r.snapshot.appearance!==undefined&&!isCanonicalAppearance(r.snapshot.appearance)||r.snapshot.pronouns!==undefined&&!['he/him','she/her','they/them'].includes(r.snapshot.pronouns)||!plain(r.ageBasis)||Object.keys(r.ageBasis).some(k=>!(r.ageBasis.kind==='legacy'?['kind','baseAge']:['kind','bornDay']).includes(k))||!['legacy','born'].includes(r.ageBasis.kind)||r.ageBasis.kind==='legacy'&&!int(r.ageBasis.baseAge,-5000,5000)||r.ageBasis.kind==='born'&&!int(r.ageBasis.bornDay,-10000000,s.day)||!int(r.observedDay,0,s.day)||!(r.termStartDay===null||int(r.termStartDay,0,r.observedDay))||!int(r.retireDay,r.observedDay+8*YEAR,11000000))return false;
  const slot=n.slots[r.slotKey],p=r.snapshot;
  if(Object.keys(p).some(k=>!['id','name','role','locationId','appearance','pronouns','disposition','character','description','roomId','population'].includes(k))||!isCanonicalAppearance(p.appearance)||p.description!==undefined&&!text(p.description,1200)||p.roomId!==undefined&&!safe(p.roomId)||p.population!==undefined&&p.population!==true||p.character!==undefined&&(!plain(p.character)||Object.keys(p.character).some(k=>!['version','archetype','detail'].includes(k))||p.character.version!==1||!text(p.character.archetype,80)||!text(p.character.detail,160))||p.disposition!==undefined&&!['kind','driven','reserved','bold'].includes(p.disposition)||slot.kind==='town'&&(!roles.includes(p.role)||p.population!==true)||slot.kind==='service'&&(p.role!==GENERIC_NPC_ROLES[slot.service]||p.population!==undefined)||slot.kind==='mentor'&&(p.role!==mentorRole(slot.classId)||p.population!==undefined))return false;
  const epoch=Math.floor(r.observedDay/(55*YEAR)),entryAge=r.generation===0?r.ageBasis.baseAge+(slot.kind==='mentor'?0:epoch*55):(r.observedDay-r.ageBasis.bornDay)/YEAR;
  const expectedAge=(slot.kind==='town'?20:slot.kind==='mentor'?30:28)+seededRoll(s.seed,(r.generation===0&&slot.kind==='service'?`resident-${slot.service}-${slot.siteId}-${epoch}`:id)+':age',slot.kind==='town'?28:slot.kind==='mentor'?18:27);
  if(r.generation===0&&!int(entryAge,slot.kind==='town'?20:slot.kind==='mentor'?0:28,slot.kind==='town'?47:slot.kind==='mentor'?200:54)||r.generation>0&&entryAge!==expectedAge)return false;
  if(r.observedDay<n.adoptedDay||r.generation>Math.floor((r.observedDay-n.adoptedDay)/(8*YEAR))+(slot.deathHandovers||0)||id!==(r.generation===0?legacyId(slot,r.observedDay):successorId(slot,r.generation))||r.generation===0&&(r.ageBasis.kind!=='legacy'||r.termStartDay!==null)||r.generation>0&&(r.ageBasis.kind!=='born'||r.termStartDay!==r.observedDay)||r.retireDay!==retirementDay(s,p,r.ageBasis,r.observedDay))return false;
  if(r.vacancyReason!==undefined&&(r.vacancyReason!=='recorded-death'||!(r.recordedDeathDay===null||int(r.recordedDeathDay,0,r.retiredDay))||r.retiredDay<r.observedDay)||r.recordedDeathDay!==undefined&&r.vacancyReason!=='recorded-death')return false;
  if(r.vacancyReason==='recorded-death'){const life=s.life?.people?.find(p=>p.id===id);if(life&&(life.alive!==false||Number.isSafeInteger(life.deathDay)&&life.deathDay!==r.recordedDeathDay)||!slot.deathHandovers)return false;}
  if(r.retiredDay===null){if(!ids.has(id)||r.successorId!==null||r.successorName!==null||r.vacancyReason!==undefined)return false;}
  else if(r.vacancyReason!=='recorded-death'&&r.retiredDay!==r.retireDay||!int(r.retiredDay,0,s.day)||r.successorId!==successorId(slot,r.generation+1)||!text(r.successorName,100)||ids.has(id)||r.generation>=slot.generation)return false;
 }
 return true;
}
