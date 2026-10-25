import { seededRoll, generatePersonName } from './world.js';

const kinds = ['vampire','lycanthrope','patron','ranger'];
const invitationKinds = ['patron','ranger'];
const generation = s => s.dynasty?.generation || 1;
const locationName = (s,id) => s.world.locations.find(p=>p.id===id)?.name || id;
const integer = (n,min=0,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n)&&n>=min&&n<=max;
const text = (v,max=120) => typeof v==='string'&&v.length>0&&v.length<=max;
const hex = value => value===null || typeof value==='string'&&/^-?\d{1,4},-?\d{1,4}$/.test(value);
const committed = s => [s.conversations?.project,s.workshop?.project,s.careers?.batch,s.life?.plan,s.health?.recovery,s.rpg?.project,s.stories?.project,s.society?.project,s.community?.project?.commitment,s.fellowship?.project,s.sanctuaries?.commitment,s.lineage?.adoption?.preparation,s.pastimes?.project].some(Boolean);
export const RARE_DISCOVERY_RATE = 'New meetings have a 0.12% chance per eligible calendar week of actual night travel or dungeon time. Longer commitments cover the same eligible weeks. One meeting can wait at a time; ordinary menus never promise a transformation.';

function startRecord(s,firstDay) {
  const p=s.nightEncounters ||= {lastWeek:-1,pending:null,day:s.day};
  if(p.policy!==13)Object.assign(p,{policy:13,recordedFromDay:firstDay,throughDay:firstDay-1,eligibleDays:0,checkedWeeks:0,invitations:[]});
  return p;
}
function encounter(s,kind,week,checkDay) {
  const known=s.nightEncounters.invitations.find(r=>r.kind===kind);
  return {version:13,kind,week,checkDay,noticedDay:s.day,locationId:s.locationId,hex:s.cartography?.position||null,context:'night-road',...(invitationKinds.includes(kind)?{personName:known?.personName||generatePersonName(s.seed,`night-person:${generation(s)}:${kind}:${week}`)}:{})};
}
export function queueNightDiscovery(s,oldDay,context={}) {
  if(s.age<18||s.hero.condition||s.phase==='retired'||!integer(oldDay)||s.day<=oldDay||s.justice?.prison||!(context.outdoors&&context.night))return;
  const adultDay=s.timeline?.mode==='birth'?(s.timeline.birthDay||0)+18*365:0;
  const first=Math.max(oldDay+1,adultDay,(s.nightEncounters?.policy===13?s.nightEncounters.throughDay:oldDay)+1);
  if(first>s.day)return;
  const p=startRecord(s,first);
  p.eligibleDays+=s.day-first+1;p.throughDay=s.day;
  for(let week=Math.floor(first/7);week<=Math.floor(s.day/7);week++){
    if(week<=p.lastWeek)continue;
    p.lastWeek=week;p.day=s.day;p.checkedWeeks++;
    const roll=seededRoll(s.seed,`rare-night:${generation(s)}:${week}:${s.locationId}`,10000);
    if(roll>=12||p.pending)continue;
    const kind=roll<5?'vampire':roll<10?'lycanthrope':roll===10?'patron':'ranger';
    const old=p.invitations.find(r=>r.kind===kind);
    if(kind==='patron'&&(s.flags.vampireDeclined||old&&old.status!=='deferred')||kind==='ranger'&&(s.flags.lycanDeclined||old&&old.status!=='deferred'))continue;
    p.pending=kind;p.meeting=encounter(s,kind,week,Math.max(first,week*7));
  }
}
export function rememberNightInvitation(s,status,ctx={}) {
  const p=s.nightEncounters,m=p?.meeting;
  if(!m||!invitationKinds.includes(m.kind))return null;
  let r=p.invitations.find(r=>r.kind===m.kind);
  if(!r){r={id:`night-${generation(s)}-${m.kind}`,generation:generation(s),kind:m.kind,personName:m.personName,locationId:m.locationId,hex:m.hex,context:m.context,firstSeenDay:s.day,lastSeenDay:s.day,status};p.invitations.push(r);}
  else {r.lastSeenDay=s.day;r.status=status;r.locationId=m.locationId;r.hex=m.hex;r.context=m.context;}
  if(status==='deferred'){
    const note=`${r.personName}, ${r.kind==='patron'?'the twilight traveler':'the moonwise ranger'}, was last seen ${r.hex?`at trail hex ${r.hex}, near `:'near '}${locationName(s,r.locationId)}. You kept the invitation undecided. Their presence on a later night is uncertain. Review this memory in your Journal; nothing was accepted.`;
    s.notice=note;(ctx.journalLiteral||ctx.journal)?.('An invitation kept without a promise',note,'discovery');
  }
  return r;
}
export function nightInvitation(s,type) {return s.nightEncounters?.invitations?.find(r=>r.kind===(type==='vampire'?'patron':'ranger'))||null;}
export function settleNightInvitation(s,type,status) {const r=nightInvitation(s,type);if(r)r.status=status;}
function searchReason(s,r) {
  if(r.generation!==generation(s)||r.status!=='deferred')return 'This invitation is no longer unresolved in this life.';
  if(s.hero.condition)return 'A major supernatural condition is already active. This undecided invitation remains a memory; no second condition can be accepted.';
  if(committed(s))return 'Continue or end the existing commitment before setting aside a night to search.';
  if(s.locationId!==r.locationId||r.hex&&s.cartography?.position!==r.hex)return `Return to the remembered ${r.hex?'trail hex '+r.hex+' near ':''}${locationName(s,r.locationId)} first.`;
  const place=s.world.locations.find(p=>p.id===r.locationId);
  if(place?.status==='destroyed'||place?.status==='evacuated')return 'This place is closed. The remembered invitation remains in your Journal.';
  if(r.lastSearchDay!=null&&s.day<r.lastSearchDay+7)return `Another search can begin on day ${r.lastSearchDay+7}. Waiting or reading this note does not bring the traveler back.`;
  return '';
}
export function nightDiscoveryActions(s) {
  if(s.age<18||s.hero.condition||s.phase==='retired'||s.event||s.battle||s.conversations?.pending||s.timeline?.journey||s.justice?.prison||committed(s))return [];
  return (s.nightEncounters?.invitations||[]).filter(r=>r.status==='deferred').map(r=>({id:`curse_revisit_${r.kind}`,label:`Look for ${r.personName} after dusk`,description:'Spend one actual night at the remembered place. A known invitation gives a 25% chance of finding this traveler; searches must be seven days apart. They may be absent. Finding them only reopens a conversation, with no accepted task or transformation.',days:0,durationDays:1,cost:0,group:'Remembered meetings',...(searchReason(s,r)?{disabledReason:searchReason(s,r)}:{})}));
}
export function applyNightDiscoveryAction(s,id,ctx={}) {
  const a=nightDiscoveryActions(s).find(a=>a.id===id&&!a.disabledReason);if(!a)return false;
  const r=s.nightEncounters.invitations.find(r=>id===`curse_revisit_${r.kind}`),old=s.day;
  ctx.spendDays?.(1,{outdoors:true,night:true});
  if(s.phase==='retired')return true;
  if(s.day<=old){s.notice='The search waits for the calendar decision. No night or return chance was used.';return true;}
  r.lastSearchDay=s.day;
  const p=s.nightEncounters;
  if(p.pending){const same=p.pending===r.kind&&p.meeting?.personName===r.personName;r.lastSearchResult=same?'met':'interrupted';s.notice=same?`You found ${r.personName} again. The invitation is still yours to consider.`:'Another actual night encounter interrupted the search. The earlier invitation remains undecided.';return true;}
  const found=seededRoll(s.seed,`night-return:${r.id}:${Math.floor(s.day/7)}`,100)<25;
  r.lastSearchResult=found?'met':'absent';
  if(found){p.pending=r.kind;p.day=s.day;p.meeting={version:13,kind:r.kind,week:Math.floor(s.day/7),checkDay:s.day,noticedDay:s.day,locationId:r.locationId,hex:r.hex,context:r.context,personName:r.personName};s.notice=`You found ${r.personName} again. The invitation is still yours to consider.`;}
  else {s.notice=`One night passed at ${locationName(s,r.locationId)}, but ${r.personName} was not there. The invitation remains undecided; no transformation, fee or task was accepted.`;(ctx.journalLiteral||ctx.journal)?.('An empty place after dusk',s.notice,'discovery');}
  return true;
}
export function nightDiscoveryView(s) {
  const p=s.nightEncounters;
  const unlocated=p?.patronMet&&!p?.invitations?.some(r=>r.kind==='patron')||p?.rangerMet&&!p?.invitations?.some(r=>r.kind==='ranger');
  return {rateText:RARE_DISCOVERY_RATE,exposure:p?.policy===13?{recordedFromDay:p.recordedFromDay,throughDay:p.throughDay,eligibleDays:p.eligibleDays,checkedWeeks:p.checkedWeeks}:null,invitations:(p?.invitations||[]).map(r=>({...r,locationName:locationName(s,r.locationId),returnReason:searchReason(s,r)})),legacyKnown:unlocated?'An earlier meeting was recorded, but its person and precise return point were not saved. The earlier invitation routes retain their original requirements.':null};
}
export function validateNightDiscovery(p,s) {
  if(p===undefined)return true;
  if(!p||!integer(p.lastWeek,-1,Math.floor(s.day/7))||![null,...kinds].includes(p.pending)||!integer(p.day,0,s.day)||!['patronMet','rangerMet'].every(k=>p[k]===undefined||typeof p[k]==='boolean'))return false;
  if(p.policy===undefined)return p.meeting===undefined&&p.invitations===undefined;
  if(p.policy!==13||!integer(p.recordedFromDay,0,s.day)||!integer(p.throughDay,p.recordedFromDay,s.day)||!integer(p.eligibleDays,1,p.throughDay-p.recordedFromDay+1)||!integer(p.checkedWeeks,0,Math.floor(s.day/7)+1)||!Array.isArray(p.invitations)||p.invitations.length>2||new Set(p.invitations.map(r=>r.kind)).size!==p.invitations.length)return false;
  const known=id=>s.world.locations.some(l=>l.id===id);
  if(!p.invitations.every(r=>r&&invitationKinds.includes(r.kind)&&r.id===`night-${generation(s)}-${r.kind}`&&r.generation===generation(s)&&text(r.personName)&&known(r.locationId)&&hex(r.hex)&&['depths','night-road'].includes(r.context)&&integer(r.firstSeenDay,0,s.day)&&integer(r.lastSeenDay,r.firstSeenDay,s.day)&&['deferred','accepted','declined'].includes(r.status)&&(r.lastSearchDay===undefined||integer(r.lastSearchDay,r.firstSeenDay,s.day))&&(r.lastSearchResult===undefined||r.lastSearchDay!==undefined&&['met','absent','interrupted'].includes(r.lastSearchResult))))return false;
  if(p.meeting!==undefined){const m=p.meeting;if(!m||m.version!==13||m.kind!==p.pending||!kinds.includes(m.kind)||!integer(m.week,0,Math.floor(s.day/7))||!integer(m.checkDay,0,m.noticedDay)||Math.floor(m.checkDay/7)!==m.week||!integer(m.noticedDay,0,s.day)||!known(m.locationId)||!hex(m.hex)||!['depths','night-road'].includes(m.context)||invitationKinds.includes(m.kind)&&!text(m.personName))return false;}
  return true;
}
