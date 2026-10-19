import { seededRoll, isSettlement } from './world.js';
import { getProfession, professionSkill, civilianProfessionEntryReason, freshCareerRecord, unpaidCareerExperience, MODERN_CAREER_LEVELS } from './career-entry.js';

const YEAR = 365, MAX_DAYS = 120;
const INTERESTS = ['knowledge','craft','nature','combat','community','trade'];
const SKILLS = ['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'];
const RESPONSES = ['fund','listen','decline'];
const own = (v,k) => Object.hasOwn(v,k);
const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (n,low=0,high=10000000) => Number.isSafeInteger(n) && n>=low && n<=high;
const fields = (v,keys) => obj(v) && Object.keys(v).length===keys.length && keys.every(k=>own(v,k));
const clone = v => structuredClone(v);
const ageOf = (s,p) => Math.max(0,Math.floor((s.day-p.bornDay)/YEAR));
const routeId = route => route === 'public' ? 'community' : route;
const courses = ['community','shrine','academy'];
const studySkills = route => route === 'shrine' ? ['devotion','defense'] : ['scholarship','persuasion'];
const educationBasis = p => ({route:p.development.education.route,attendance:p.development.education.attendance,qualifications:p.development.education.qualifications.map(q=>q.route),skills:Object.fromEntries(SKILLS.map(k=>[k,p.development.skills[k]]))});
function chosenInterest(p,seed) {
  if (INTERESTS.includes(p.preferences?.pursuit)) return p.preferences.pursuit;
  // An unrecorded old taste is not the parent's taste or a remembered childhood.
  // Existing practice informs what this person says they want to try today.
  const scores = {knowledge:(p.development.skills.scholarship||0)+(p.development.skills.arcana||0),craft:p.development.skills.survival||0,nature:p.development.skills.survival||0,combat:(p.development.skills.weapons||0)+(p.development.skills.defense||0),community:p.development.skills.devotion||0,trade:p.development.skills.persuasion||0};
  const best = Math.max(...Object.values(scores)), choices = INTERESTS.filter(k=>scores[k]===best);
  return choices[seededRoll(seed,`adult-child-interest:${p.id}`,choices.length)];
}
function goalFrom(interest,basis) {
  const qualified = route => basis.qualifications.includes(route);
  let profession = ({craft:'Blacksmith',nature:'Farmer',combat:'Soldier',community:'Innkeeper',trade:'Merchant'})[interest] || null;
  if (interest==='knowledge' && qualified('academy')) profession='Scholar';
  if (interest==='craft' && qualified('academy') && basis.skills.arcana>basis.skills.survival) profession='Alchemist';
  if (interest==='nature' && qualified('shrine')) profession='Herbalist';
  if (interest==='community' && qualified('shrine')) profession='Healer';
  const route = !profession ? 'community' : interest==='community' && basis.route==='shrine' && basis.attendance>=2 && !qualified('shrine') ? 'shrine' : null;
  return {kind:route?'study':'work',interest,profession:route?null:profession,route,basis};
}
export function adultChildGoal(p,seed) {
  return goalFrom(chosenInterest(p,seed),educationBasis(p));
}
function remember(v,day,kind) {
  v.history.push({day,kind}); v.history.sort((a,b)=>a.day-b.day);v.history=v.history.slice(-12);
}
function relativeActual(s,p) {
  return p.source==='child' ? s.life?.children?.find(c=>c.id===p.localId) : s.life?.people?.find(c=>c.id===p.localId);
}
export function adultChildResidenceCandidate(s,p) {
  const actual=relativeActual(s,p);
  return [actual?.locationId,s.life?.home?.locationId,s.hero?.birthplaceId,s.hero?.origin==='city'?'city':'home'].find(id=>isSettlement(s.world,id)) || null;
}
/** Mutation is authorized only by a real calendar step or a conversation. Reads
 * and old-save migration must not call this function. No old years are inferred. */
export function introduceAdultChildLife(s,p,{source,observedDestinationId}={}) {
  if (p.adultLife) return p.adultLife;
  if (!['calendar','conversation'].includes(source) || !['child','life'].includes(p.source) || !p.development || p.alive===false || !int(p.bornDay,-10000000,s.day) || ageOf(s,p)<18) return null;
  const goal=adultChildGoal(p,s.seed), destinationId=observedDestinationId!==undefined && s.world.locations.some(l=>l.id===observedDestinationId) ? observedDestinationId : adultChildResidenceCandidate(s,p);
  const v={version:1,personId:p.id,introducedDay:s.day,lastDay:s.day,goal,destinationId,status:isSettlement(s.world,destinationId)?'active':'suspended',eligibleDays:0,periods:[],work:goal.kind==='work'?{introducedDay:null,trainingDays:0,experience:0,skillGained:0}:null,study:goal.kind==='study'?{route:goal.route,attendance:0,progress:0,performance:50,sessions:[]}:null,response:null,responseDay:null,supportedGold:0,residence:null,milestoneDay:null,heardDay:null,milestoneChoice:null,history:[]};
  remember(v,s.day,'plan');p.adultLife=v;return v;
}
function dayAt(v,number) {
  let remaining=number;
  for (const period of v.periods) {
    const days=period.toDay-period.fromDay;
    if (remaining<=days) return period.fromDay+remaining;
    remaining-=days;
  }
  return null;
}
function appendPeriod(v,fromDay,toDay) {
  const limit=v.study?MAX_DAYS:v.supportedGold?60:90;
  const left=Math.max(0,limit-v.eligibleDays), days=Math.min(left,toDay-fromDay);
  if (days<=0) return;
  const previous=v.periods.at(-1);
  if (previous?.toDay===fromDay) previous.toDay=fromDay+days;
  else v.periods.push({fromDay,toDay:fromDay+days});
  v.eligibleDays+=days;
}
function recordResidence(v,day) {
  if (v.residence || v.eligibleDays<(v.supportedGold?60:90)) return false;
  v.residence={kind:'independent_lodgings',locationId:v.destinationId,sinceDay:day};
  remember(v,day,'residence');return true;
}
function markMilestone(v,day) {
  const complete=v.work?v.work.trainingDays===14:v.study.attendance===4;
  if (!v.milestoneDay && complete && v.residence) {
    v.milestoneDay=day;v.status='milestoneReady';remember(v,day,'milestone');return true;
  }
  return false;
}
/** Only explicitly verified eligible calendar intervals may advance a case.
 * The caller supplies (fromDay,toDay] periods with real availability boundaries.
 * Merely seeing an open destination after a large time jump is not evidence.
 * Missing intervals are skipped permanently, not banked for later catch-up. */
export function advanceAdultChildLife(s,p,{oldDay,newDay,eligiblePeriods=[]}={}) {
  const v=p.adultLife, changes=[];
  if (!v || ['milestoneReady','settled'].includes(v.status) || p.source==='hero' || p.alive===false || !int(oldDay) || !int(newDay,oldDay,s.day) || newDay<=v.lastDay) return changes;
  const from=Math.max(oldDay,v.lastDay,v.introducedDay), open=isSettlement(s.world,v.destinationId);
  if (!['milestoneReady','settled'].includes(v.status)) {
    let cursor=from;
    // Validate the entire supplied proof before applying any of it.
    const verified=Array.isArray(eligiblePeriods) && eligiblePeriods.length<=120 && eligiblePeriods.every(period=>{
      if (!fields(period,['fromDay','toDay','locationId']) || !int(period.fromDay,cursor,newDay) || !int(period.toDay,period.fromDay+1,newDay) || period.locationId!==v.destinationId) return false;
      cursor=period.toDay;return true;
    });
    if (verified) for (const period of eligiblePeriods) appendPeriod(v,period.fromDay,period.toDay);
    v.status=open?'active':'suspended';
    if (v.work) {
      if (v.work.introducedDay===null && v.eligibleDays>=1 && !civilianProfessionEntryReason({profession:v.goal.profession,age:Math.floor((dayAt(v,1)-p.bornDay)/YEAR),operating:true})) {
        v.work.introducedDay=dayAt(v,1);remember(v,v.work.introducedDay,'introduction');changes.push('introduction');
      }
      if (v.work.introducedDay!==null) {
        const before=v.work.trainingDays, after=Math.min(14,Math.max(0,v.eligibleDays-1)), gained=Math.floor(after/14)-Math.floor(before/14);
        v.work.trainingDays=after;v.work.experience=unpaidCareerExperience(after);
        if (gained) {
          const key=professionSkill(v.goal.profession);p.development.skills[key]=Math.min(10000,p.development.skills[key]+gained);v.work.skillGained+=gained;
          remember(v,dayAt(v,15),'training');changes.push('training');
        }
      }
    } else {
      while (v.study.attendance<4 && v.eligibleDays>=(v.study.attendance+1)*30) {
        const number=v.study.attendance+1, day=dayAt(v,number*30);
        v.study.sessions.push({day,eligibleDay:number*30});v.study.attendance++;v.study.progress++;v.study.performance=Math.min(100,v.study.performance+4);
        for (const key of studySkills(v.study.route)) p.development.skills[key]=Math.min(10000,p.development.skills[key]+1);
        remember(v,day,'session');changes.push('session');
      }
    }
    const threshold=v.supportedGold?60:90;
    if (recordResidence(v,Math.max(dayAt(v,threshold)||0,v.supportedGold?v.responseDay:0))) changes.push('residence');
    if (markMilestone(v,Math.max(v.residence?.sinceDay||0,v.work?dayAt(v,15)||0:v.study.sessions.at(-1)?.day||0))) changes.push('milestone');
  }
  v.lastDay=v.milestoneDay??newDay;return changes;
}
/** Returns the explicit charge for an outer atomic action handler. This leaf
 * never touches the parent's money, skills, materials, property or career. */
export function respondAdultChildLife(s,p,response,{availableGold=s.hero?.gold||0}={}) {
  const v=p.adultLife;
  if (!v || s.day!==v.lastDay || p.alive===false || v.response!==null || v.milestoneDay!==null || !RESPONSES.includes(response) || response==='fund' && (availableGold<20 || v.residence!==null || !isSettlement(s.world,v.destinationId))) return null;
  v.response=response;v.responseDay=s.day;v.supportedGold=response==='fund'?20:0;
  remember(v,s.day,response);
  if (response==='fund' && isSettlement(s.world,v.destinationId) && recordResidence(v,s.day)) markMilestone(v,s.day);
  return {cost:v.supportedGold};
}
export function hearAdultChildMilestone(s,p,choice) {
  const v=p.adultLife;
  if (!v || p.alive===false || v.status!=='milestoneReady' || !['company','celebrate','space'].includes(choice)) return false;
  v.lastDay=s.day;v.heardDay=s.day;v.milestoneChoice=choice;v.status='settled';remember(v,s.day,'heard');return true;
}

export function validateAdultChildLife(v,p,s) {
  if (v===undefined) return true;
  if (!obj(p) || typeof p.id!=='string' || !p.id || p.id.length>160 || !int(p.bornDay,-10000000,s.day) || !obj(p.development?.skills) || SKILLS.some(k=>!int(p.development.skills[k],0,10000)) || !obj(p.development.education) || !Array.isArray(p.development.education.qualifications)) return false;
  const keys=['version','personId','introducedDay','lastDay','goal','destinationId','status','eligibleDays','periods','work','study','response','responseDay','supportedGold','residence','milestoneDay','heardDay','milestoneChoice','history'];
  if (!fields(v,keys) || v.version!==1 || v.personId!==p.id || !int(v.introducedDay,Math.max(0,p.bornDay+18*YEAR),s.day) || !int(v.lastDay,v.introducedDay,s.day) || !int(v.eligibleDays,0,MAX_DAYS) || !['active','suspended','milestoneReady','settled'].includes(v.status) || !(v.destinationId===null || s.world.locations.some(l=>l.id===v.destinationId))) return false;
  const g=v.goal,b=g?.basis;
  if (!fields(g,['kind','interest','profession','route','basis']) || !INTERESTS.includes(g.interest) || !fields(b,['route','attendance','qualifications','skills']) || ![null,'public','shrine','academy'].includes(b.route) || b.route!==p.development.education.route || !int(b.attendance,0,p.development.education.attendance) || !Array.isArray(b.qualifications) || b.qualifications.length>3 || new Set(b.qualifications).size!==b.qualifications.length || b.qualifications.some(q=>!['public','shrine','academy'].includes(q)||!p.development.education.qualifications.some(actual=>actual.route===q && int(actual.day,0,v.introducedDay))) || !fields(b.skills,SKILLS) || SKILLS.some(k=>!int(b.skills[k],0,p.development.skills[k]))) return false;
  const expected=goalFrom(g.interest,b);
  if (['kind','profession','route'].some(k=>g[k]!==expected[k]) || g.kind==='work' && !getProfession(g.profession)) return false;
  if (!Array.isArray(v.periods) || v.periods.length>MAX_DAYS) return false;
  let cursor=v.introducedDay,total=0;
  for (const period of v.periods) {
    if (!fields(period,['fromDay','toDay']) || !int(period.fromDay,cursor,v.lastDay) || !int(period.toDay,period.fromDay+1,v.lastDay)) return false;
    total+=period.toDay-period.fromDay;cursor=period.toDay;
  }
  if (total!==v.eligibleDays || v.destinationId===null && total) return false;
  const date=d=>d===null || int(d,v.introducedDay,v.lastDay);
  if (!(v.response===null || RESPONSES.includes(v.response)) || !date(v.responseDay) || (v.response===null)!==(v.responseDay===null) || v.supportedGold!==(v.response==='fund'?20:0)) return false;
  if (g.kind==='work') {
    const w=v.work,days=Math.min(14,Math.max(0,total-1));
    if (v.study!==null || !fields(w,['introducedDay','trainingDays','experience','skillGained']) || w.introducedDay!==(total?dayAt(v,1):null) || w.trainingDays!==days || w.experience!==unpaidCareerExperience(days) || w.skillGained!==Math.floor(days/14) || p.development.skills[professionSkill(g.profession)]<Math.min(10000,b.skills[professionSkill(g.profession)]+w.skillGained)) return false;
  } else {
    const e=v.study,n=Math.min(4,Math.floor(total/30));
    if (v.work!==null || !fields(e,['route','attendance','progress','performance','sessions']) || e.route!==g.route || !['community','shrine'].includes(e.route) || e.attendance!==n || e.progress!==n || e.performance!==50+n*4 || !Array.isArray(e.sessions) || e.sessions.length!==n || !e.sessions.every((r,i)=>fields(r,['day','eligibleDay']) && r.eligibleDay===(i+1)*30 && r.day===dayAt(v,r.eligibleDay)) || studySkills(e.route).some(k=>p.development.skills[k]<Math.min(10000,b.skills[k]+n))) return false;
  }
  if (v.residence!==null) {
    const r=v.residence,threshold=v.supportedGold?60:90;
    if (!fields(r,['kind','locationId','sinceDay']) || r.kind!=='independent_lodgings' || r.locationId!==v.destinationId || !date(r.sinceDay) || r.sinceDay===null || total<threshold || r.sinceDay!==Math.max(dayAt(v,threshold)||0,v.supportedGold?v.responseDay:0)) return false;
  }
  if ((v.residence!==null)!==(total>=(v.supportedGold?60:90))) return false;
  const complete=v.work?v.work.trainingDays===14:v.study.attendance===4, reached=complete&&v.residence!==null;
  const completedDay=v.work?dayAt(v,15):v.study.sessions.at(-1)?.day;
  if (reached && v.milestoneDay!==Math.max(v.residence.sinceDay,completedDay)) return false;
  if (!date(v.milestoneDay) || (v.milestoneDay!==null)!==reached || !date(v.heardDay) || (v.heardDay!==null)!==(v.status==='settled') || !(v.milestoneChoice===null || ['company','celebrate','space'].includes(v.milestoneChoice)) || (v.milestoneChoice===null)!==(v.heardDay===null) || v.milestoneDay!==null && (v.milestoneDay<v.residence.sinceDay || v.heardDay!==null && v.heardDay<v.milestoneDay) || reached && !['milestoneReady','settled'].includes(v.status) || !reached && ['milestoneReady','settled'].includes(v.status)) return false;
  const expectedHistory=[{day:v.introducedDay,kind:'plan'}];
  if(v.work?.introducedDay!==null && v.work)expectedHistory.push({day:v.work.introducedDay,kind:'introduction'});
  if(v.work?.trainingDays===14)expectedHistory.push({day:dayAt(v,15),kind:'training'});
  for(const session of v.study?.sessions||[])expectedHistory.push({day:session.day,kind:'session'});
  if(v.response!==null)expectedHistory.push({day:v.responseDay,kind:v.response});
  if(v.residence)expectedHistory.push({day:v.residence.sinceDay,kind:'residence'});
  if(v.milestoneDay!==null)expectedHistory.push({day:v.milestoneDay,kind:'milestone'});
  if(v.heardDay!==null)expectedHistory.push({day:v.heardDay,kind:'heard'});
  const stamp=h=>`${h.kind}:${h.day}`, expectedStamps=expectedHistory.map(stamp).sort();
  return Array.isArray(v.history) && v.history.length===expectedHistory.length && v.history.length<=12 && v.history.every(h=>fields(h,['day','kind']) && int(h.day,v.introducedDay,v.lastDay)) && v.history.map(stamp).sort().every((h,i)=>h===expectedStamps[i]);
}

/** A new hero receives their own evidence only. Applying this adapter after the
 * ordinary career reset cannot replay wages or add training skills a second time. */
export function adultChildInheritance(s,p) {
  const v=p.adultLife;
  if (!v || !validateAdultChildLife(v,p,s)) return null;
  const careerRecord=freshCareerRecord();
  if (v.work && v.work.introducedDay!==null) {
    careerRecord.workedDays=careerRecord.unpaidWorkedDays=v.work.trainingDays;
    careerRecord.experience=v.work.experience;
    careerRecord.mastery=MODERN_CAREER_LEVELS.reduce((n,t,i)=>careerRecord.experience>=t?i:n,0);
  }
  return {profession:v.work && v.work.introducedDay!==null?v.goal.profession:'Unemployed',careerRecord,study:adultChildStudyTransfer(s,p),residence:clone(v.residence),goal:clone(v.goal)};
}
export function adultChildStudyTransfer(s,p) {
  const v=p.adultLife,e=v?.study;
  if (!e?.attendance) return null;
  const age=ageOf(s,p),termDay=p.bornDay+age*YEAR,annual=e.sessions.filter(r=>r.day>=termDay).length;
  const previous=p.development.education,priorRoute=routeId(previous.route),same=priorRoute===e.route?previous.attendance:0;
  const paused=priorRoute && priorRoute!==e.route && courses.includes(priorRoute) && previous.attendance ? {[priorRoute]:{year:1,attendance:previous.attendance,progress:previous.attendance,performance:50,pausedDay:v.introducedDay}}:{};
  return {route:e.route,schoolId:`school-${e.route}`,enrolled:true,year:1,attendance:same+e.attendance,progress:same+e.progress,performance:e.performance,lessonsThisYear:annual,attendanceThisYear:annual,courseBook:{version:1,introducedDay:v.introducedDay,termAge:age,priorAttendance:0,priorCourse:e.route,attendance:annual?{[e.route]:annual}:{},paused}};
}
