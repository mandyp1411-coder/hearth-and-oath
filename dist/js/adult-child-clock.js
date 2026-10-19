import { isSettlement } from './world.js';
import { adultChildResidenceCandidate, introduceAdultChildLife, advanceAdultChildLife } from './adult-child-livelihoods.js';

const YEAR=365;
const int=n=>Number.isSafeInteger(n)&&n>=0;
const actual=(s,p)=>p.source==='child'?s.life?.children?.find(c=>c.id===p.localId):s.life?.people?.find(c=>c.id===p.localId&&c.familyRole==='sibling');
const deployments=(s,p)=>(s.realm?.politics?.deployments||[]).filter(d=>d.lineageId?d.lineageId===p.id:d.personId===p.localId).map(d=>({warId:d.warId,personId:d.personId,enlistedDay:d.enlistedDay,endedDay:d.endedDay}));
/** Evidence for one actual spendDays invocation, not a saved history. Only the
 * queried people and their distinct existing destinations are snapshotted. */
export function captureAdultChildClock(s,{oldDay=s.day,newDay}={}) {
  if (s.phase==='retired'||s.hero?.alive===false||!int(oldDay)||oldDay!==s.day||!int(newDay)||newDay<=oldDay) return null;
  const clock={oldDay,newDay,people:[],sites:{},events:[]};
  for(const p of s.lineage?.people||[]) {
    if(!['child','life'].includes(p.source)||p.id===s.dynasty?.activePersonId||!p.development||p.alive===false||!Number.isSafeInteger(p.bornDay)||p.bornDay+18*YEAR>newDay||['milestoneReady','settled'].includes(p.adultLife?.status))continue;
    const person=actual(s,p);if(!person||person.alive===false)continue;
    const member=s.family?.members?.find(m=>m.personId===p.localId);
    const destinationId=p.adultLife?.destinationId||adultChildResidenceCandidate(s,p);
    const introducedDay=p.adultLife?.introducedDay??Math.max(oldDay,p.bornDay+18*YEAR);
    clock.people.push({personId:p.id,destinationId,introducedDay,available:!member||member.availability==='present',deployments:deployments(s,p)});
    if(destinationId&&!Object.hasOwn(clock.sites,destinationId))clock.sites[destinationId]={operating:isSettlement(s.world,destinationId)};
  }
  return clock;
}
/** A world mutator reports its authoritative effective day while the current
 * clock tick is in flight. This remains correct if world.changes is trimmed. */
export function recordAdultChildSiteChange(clock,event) {
  if(!clock||!event||!Object.hasOwn(clock.sites,event.locationId)||!int(event.day)||event.day>clock.newDay||typeof event.operating!=='boolean')return false;
  clock.events.push({locationId:event.locationId,day:event.day,operating:event.operating});return true;
}
function subtractDeployment(periods,deployment,newDay) {
  if(!int(deployment.enlistedDay)||!(deployment.endedDay===null||int(deployment.endedDay)&&deployment.endedDay>=deployment.enlistedDay))return [];
  const start=deployment.enlistedDay,end=deployment.endedDay??newDay;
  return periods.flatMap(p=>{
    if(start>p.toDay||end<=p.fromDay)return [p];
    const rows=[],before=Math.min(p.toDay,start-1),after=Math.max(p.fromDay,end);
    if(before>p.fromDay)rows.push({...p,toDay:before});
    if(after<p.toDay)rows.push({...p,fromDay:after});
    return rows;
  });
}
export function adultChildEligiblePeriods(s,clock,personId) {
  const entry=clock?.people.find(p=>p.personId===personId),before=entry&&clock.sites[entry.destinationId];
  if(!entry||!before||!entry.available||s.day!==clock.newDay)return [];
  const p=s.lineage?.people.find(p=>p.id===personId);if(!p||p.alive===false||p.source==='hero')return [];
  const from=Math.max(clock.oldDay,entry.introducedDay,p.adultLife?.lastDay??0);
  if(from>=clock.newDay)return [];
  const events=clock.events.filter(e=>e.locationId===entry.destinationId).sort((a,b)=>a.day-b.day);
  let operating=before.operating;
  for(const event of events)if(event.day<=from)operating=event.operating;
  let expected=operating;
  for(const event of events)if(event.day>from)expected=event.operating;
  // An unexplained transition cannot establish when the destination operated.
  if(expected!==isSettlement(s.world,entry.destinationId))return [];
  let cursor=from,periods=[];
  for(const event of events.filter(e=>e.day>from)) {
    if(event.operating===operating)continue;
    if(operating&&event.day-1>cursor)periods.push({fromDay:cursor,toDay:event.day-1,locationId:entry.destinationId});
    cursor=event.day;operating=event.operating;
  }
  if(operating&&clock.newDay>cursor)periods.push({fromDay:cursor,toDay:clock.newDay,locationId:entry.destinationId});
  const merged=new Map();
  for(const d of [...entry.deployments,...deployments(s,p)]){
    const key=`${d.warId}:${d.personId}:${d.enlistedDay}`,prior=merged.get(key);
    // A dated return in the live tick supersedes an earlier open deployment.
    if(!prior||d.endedDay!==null)merged.set(key,d);
  }
  for(const d of merged.values())periods=subtractDeployment(periods,d,clock.newDay);
  return periods;
}
/** Run after world time updates. Older imported gaps are not observed by this
 * snapshot; the new actual clock interval can still advance a prospective case. */
export function settleAdultChildClock(s,clock) {
  if(!clock||s.day!==clock.newDay||s.phase==='retired'||s.hero?.alive===false)return [];
  const results=[];
  for(const entry of clock.people) {
    const p=s.lineage?.people.find(p=>p.id===entry.personId);
    if(!p||p.alive===false||p.source==='hero'||!actual(s,p))continue;
    if(!p.adultLife)introduceAdultChildLife({...s,day:entry.introducedDay},p,{source:'calendar',observedDestinationId:entry.destinationId});
    if(!p.adultLife)continue;
    if(p.adultLife.destinationId===null&&entry.destinationId)p.adultLife.destinationId=entry.destinationId;
    const changes=advanceAdultChildLife(s,p,{oldDay:Math.max(clock.oldDay,entry.introducedDay),newDay:clock.newDay,eligiblePeriods:adultChildEligiblePeriods(s,clock,p.id)});
    if(p.source==='life') {
      const sibling=actual(s,p),v=p.adultLife;
      if(sibling&&v.residence)sibling.locationId=v.residence.locationId;
      if(sibling&&v.work&&v.work.introducedDay!==null)sibling.occupation=v.goal.profession;
      else if(sibling&&v.study?.attendance)sibling.occupation=`${v.study.route} student`;
    }
    if(changes.length)results.push({personId:p.id,changes});
  }
  return results;
}
