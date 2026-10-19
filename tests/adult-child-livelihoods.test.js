// Pure bounded-calendar tests. These do not create an engine world or run a life.
import test from 'node:test';
import assert from 'node:assert/strict';
import { adultChildGoal, introduceAdultChildLife, advanceAdultChildLife, respondAdultChildLife, hearAdultChildMilestone, validateAdultChildLife, adultChildInheritance } from '../dist/js/adult-child-livelihoods.js';
import { civilianEntryReason, civilianProfessionEntryReason, PROFESSION_CATALOG } from '../dist/js/career-entry.js';
import { initializeCareers, recordCareerWork, getProfession } from '../dist/js/careers.js';
import { validateCourseBook } from '../dist/js/education-progress.js';

const YEAR=365, skills=()=>Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0]));
function fixture(interest='craft',age=18) {
  const p={id:'line-42-g1-child-child-1',source:'child',localId:'child-1',name:'Aven',bornDay:0,alive:true,preferences:{pursuit:interest},development:{traits:{care:0,curiosity:0,courage:0},skills:skills(),education:{route:null,attendance:0,qualifications:[]},history:[]}};
  const s={seed:'adult-child-leaf',locationId:'home',day:age*YEAR,age:50,phase:'adult',hero:{name:'Parent',origin:'village',birthplaceId:'home',gold:1000,profession:'Blacksmith',skills:skills()},life:{home:{tier:'cottage',locationId:'home'},children:[{id:'child-1',name:p.name,bornDay:0,age}],people:[],career:{rank:0}},world:{locations:[{id:'home',type:'village',status:'thriving',servicesAvailable:true},{id:'city',type:'city',status:'thriving',servicesAvailable:true}]} };
  return {s,p};
}
function start(s,p) {const v=introduceAdultChildLife(s,p,{source:'calendar'});assert.ok(v);assert.ok(validateAdultChildLife(v,p,s));return v;}
function step(s,p,days,{known=true,periods}={}) {
  const oldDay=s.day;s.day+=days;
  const changes=advanceAdultChildLife(s,p,{oldDay,newDay:s.day,eligiblePeriods:periods|| (known?[{fromDay:oldDay,toDay:s.day,locationId:p.adultLife.destinationId}]:[])});
  assert.ok(validateAdultChildLife(p.adultLife,p,s));return changes;
}

test('canonical accessible entry does not acquire invented certificate or skill gates',()=>{
  const {s}=fixture();
  for(const job of PROFESSION_CATALOG){assert.equal(civilianEntryReason(s,{profession:job.name,age:16}),null);assert.equal(getProfession(job.id).name,job.name);}
  assert.match(civilianEntryReason(s,{profession:'Scholar',age:15}),/sixteen/);
  assert.ok(civilianProfessionEntryReason({profession:'Imaginary',age:20,operating:true}));
  s.world.locations[0].status='destroyed';assert.ok(civilianEntryReason(s,{profession:'Healer',age:18,locationId:'home'}));
});
test('six individual interests yield distinct plans and real education informs variants',()=>{
  const goals=['knowledge','craft','nature','combat','community','trade'].map(interest=>{const {s,p}=fixture(interest);return adultChildGoal(p,s.seed);});
  assert.equal(new Set(goals.map(g=>g.profession||g.route)).size,6);
  const {s,p}=fixture('knowledge');p.development.education={route:'academy',attendance:6,qualifications:[{route:'academy'}]};
  assert.equal(adultChildGoal(p,s.seed).profession,'Scholar');
  p.preferences.pursuit='community';p.development.education={route:'shrine',attendance:2,qualifications:[]};assert.equal(adultChildGoal(p,s.seed).route,'shrine');
  p.development.education.qualifications.push({route:'shrine'});assert.equal(adultChildGoal(p,s.seed).profession,'Healer');
});
test('old-save metadata is lazy, current-day only, deterministic and idempotent',()=>{
  const {s,p}=fixture('trade',40),before=structuredClone({s,p});
  adultChildGoal(p,s.seed);assert.equal(introduceAdultChildLife(s,p),null);assert.deepEqual({s,p},before);
  const v=start(s,p);assert.equal(v.introducedDay,40*YEAR);assert.equal(v.eligibleDays,0);assert.equal(v.work.experience,0);assert.equal(v.residence,null);
  const copy=structuredClone(p);assert.strictEqual(introduceAdultChildLife(s,p,{source:'calendar'}),v);assert.deepEqual(p,copy);
  delete p.preferences;const goal=adultChildGoal(p,s.seed);assert.deepEqual(adultChildGoal(p,s.seed),goal);assert.equal(p.preferences,undefined);
});
test('a child cannot start before eighteen or after a recorded death',()=>{
  for(const change of [({s})=>s.day=17*YEAR,({p})=>p.alive=false]){const f=fixture();change(f);assert.equal(introduceAdultChildLife(f.s,f.p,{source:'conversation'}),null);}
});
test('actual supervised training mirrors canonical unpaid XP and skill once without parent rewards',()=>{
  const {s,p}=fixture(),before=structuredClone(s);start(s,p);step(s,p,15);
  const canonical=structuredClone(before);initializeCareers(canonical);recordCareerWork(canonical,{days:14,paid:false});
  assert.equal(p.adultLife.work.trainingDays,14);assert.equal(p.adultLife.work.experience,canonical.careers.records.Blacksmith.experience);assert.equal(p.development.skills.survival,canonical.hero.skills.survival);
  for(const key of ['hero','life','world'])assert.deepEqual(s[key],before[key]);
  const childBefore=structuredClone(p.development);step(s,p,30);assert.deepEqual(p.development,childBefore);
  const inherited=adultChildInheritance(s,p);assert.equal(inherited.profession,'Blacksmith');assert.equal(inherited.careerRecord.experience,10);assert.equal(inherited.careerRecord.workedDays,14);assert.equal(inherited.careerRecord.paidWorkedDays,0);assert.equal(inherited.careerRecord.earnedGold,0);assert.equal(inherited.careerRecord.mastery,0);
  const current=structuredClone(p);assert.deepEqual(adultChildInheritance(s,p),inherited);assert.deepEqual(p,current);
});
test('split and single verified periods produce the same actual progress',()=>{
  const a=fixture(),b=fixture();start(a.s,a.p);start(b.s,b.p);
  step(a.s,a.p,15);for(let i=0;i<15;i++)step(b.s,b.p,1);
  assert.deepEqual(a.p,b.p);
});
test('unknown large intervals never catch up training or invent old income',()=>{
  const {s,p}=fixture();start(s,p);step(s,p,5);const before=p.adultLife.work.trainingDays;
  step(s,p,20*YEAR,{known:false});assert.equal(p.adultLife.work.trainingDays,before);assert.equal(p.adultLife.eligibleDays,5);assert.equal(p.adultLife.residence,null);
  step(s,p,10);assert.equal(p.adultLife.work.trainingDays,14);assert.equal(p.adultLife.periods.length,2);assert.equal(p.adultLife.history.find(h=>h.kind==='training').day,s.day);
});
test('known eligible dates before closure count, missing closed dates never do',()=>{
  const {s,p}=fixture();start(s,p);const oldDay=s.day;s.world.locations[0].status='destroyed';
  step(s,p,100,{periods:[{fromDay:oldDay,toDay:oldDay+5,locationId:'home'}]});
  assert.equal(p.adultLife.eligibleDays,5);assert.equal(p.adultLife.work.trainingDays,4);assert.equal(p.adultLife.status,'suspended');
  step(s,p,100,{known:false});assert.equal(p.adultLife.eligibleDays,5);
  s.world.locations[0].status='thriving';step(s,p,10);assert.equal(p.adultLife.work.trainingDays,14);
});
test('an invalid period batch awards nothing and cannot be replayed',()=>{
  const {s,p}=fixture();start(s,p);const day=s.day;
  step(s,p,20,{periods:[{fromDay:day,toDay:day+10,locationId:'home'},{fromDay:day+5,toDay:day+15,locationId:'home'}]});assert.equal(p.adultLife.eligibleDays,0);
  const before=structuredClone(p);advanceAdultChildLife(s,p,{oldDay:day,newDay:s.day,eligiblePeriods:[{fromDay:day,toDay:s.day,locationId:'home'}]});assert.deepEqual(p,before);
});
test('fund/listen/decline retain one plan; funding is explicit, once and not a parent-money mutation',()=>{
  for(const response of ['fund','listen','decline']) {
    const {s,p}=fixture();start(s,p);const goal=structuredClone(p.adultLife.goal),gold=s.hero.gold;
    const result=respondAdultChildLife(s,p,response);assert.deepEqual(result,{cost:response==='fund'?20:0});assert.equal(s.hero.gold,gold);assert.deepEqual(p.adultLife.goal,goal);
    assert.equal(respondAdultChildLife(s,p,response),null);assert.ok(validateAdultChildLife(p.adultLife,p,s));
    step(s,p,60);assert.equal(!!p.adultLife.residence,response==='fund');
    if(response!=='fund')step(s,p,30);
    assert.equal(p.adultLife.residence.kind,'independent_lodgings');assert.equal(p.adultLife.residence.locationId,'home');assert.equal(s.world.locations.length,2);assert.equal(s.life.home.tier,'cottage');
  }
  const {s,p}=fixture();start(s,p);assert.equal(respondAdultChildLife(s,p,'fund',{availableGold:19}),null);assert.equal(p.adultLife.response,null);
});
test('later funding records today’s residence, not a backdated deposit',()=>{
  const {s,p}=fixture();start(s,p);step(s,p,70);assert.deepEqual(respondAdultChildLife(s,p,'fund'),{cost:20});
  assert.equal(p.adultLife.residence.sinceDay,s.day);assert.equal(p.adultLife.milestoneDay,s.day);assert.ok(validateAdultChildLife(p.adultLife,p,s));
});
test('milestone is heard only once and never becomes an annual funding or training loop',()=>{
  const {s,p}=fixture();start(s,p);step(s,p,90);assert.equal(p.adultLife.status,'milestoneReady');assert.equal(respondAdultChildLife(s,p,'fund'),null);
  assert.equal(hearAdultChildMilestone(s,p,'space'),true);assert.equal(hearAdultChildMilestone(s,p,'company'),false);const before=structuredClone(p);
  step(s,p,10*YEAR);assert.deepEqual(p.development,before.development);assert.deepEqual(p.adultLife.history,before.adultLife.history);assert.equal(p.adultLife.eligibleDays,90);
});
test('study records four real sessions, distinct prior route progress and no certificate',()=>{
  const {s,p}=fixture('knowledge');p.development.education={route:'academy',attendance:3,qualifications:[]};start(s,p);const prior=structuredClone(p.development.education);step(s,p,120);
  assert.equal(p.adultLife.study.attendance,4);assert.equal(p.development.skills.scholarship,4);assert.deepEqual(p.development.education,prior);
  const inherited=adultChildInheritance(s,p);assert.equal(inherited.profession,'Unemployed');assert.equal(inherited.study.route,'community');assert.equal(inherited.study.attendance,4);assert.equal(inherited.study.courseBook.paused.academy.attendance,3);assert.equal(inherited.study.courseBook.paused.academy.progress,3);assert.equal(p.development.education.qualifications.length,0);
  assert.ok(validateCourseBook({...inherited.study,lastAge:18},{day:s.day}));
});
test('same-route preparation combines honestly and annual lesson limits follow dated sessions',()=>{
  const {s,p}=fixture('knowledge');s.day+=300;p.development.education={route:'public',attendance:3,qualifications:[]};start(s,p);step(s,p,120);
  const transfer=adultChildInheritance(s,p).study;assert.equal(transfer.attendance,7);assert.equal(transfer.progress,7);assert.equal(transfer.attendanceThisYear,2);assert.equal(transfer.lessonsThisYear,2);assert.deepEqual(transfer.courseBook.paused,{});assert.ok(validateCourseBook({...transfer,lastAge:19},{day:s.day}));
});
test('partial work and study survive adapters without parent mastery or extra skill application',()=>{
  for(const interest of ['craft','knowledge']) {
    const {s,p}=fixture(interest);start(s,p);step(s,p,interest==='craft'?8:30);const before=structuredClone(p.development.skills),gift=adultChildInheritance(s,p);
    assert.equal(gift.careerRecord.mastery,0);assert.equal(gift.careerRecord.earnedGold,0);assert.deepEqual(p.development.skills,before);
    if(interest==='craft'){assert.equal(gift.careerRecord.workedDays,7);assert.equal(gift.careerRecord.experience,5);}else assert.equal(gift.study.progress,1);
  }
});
test('active heroes and dead children do not receive autonomous extra learning',()=>{
  for(const change of [p=>p.source='hero',p=>p.alive=false]){const {s,p}=fixture();start(s,p);change(p);const before=structuredClone(p);s.day+=120;advanceAdultChildLife(s,p,{oldDay:s.day-120,newDay:s.day,eligiblePeriods:[{fromDay:s.day-120,toDay:s.day,locationId:'home'}]});assert.deepEqual(p,before);}
});
test('validators reject forged identity, unsupported careers, time, sessions, skills and ownership',()=>{
  for(const mutate of [v=>v.personId='different-child',v=>v.goal.profession='Dragon King',v=>v.introducedDay--,v=>v.eligibleDays++,v=>v.work.experience++,v=>v.work.skillGained++,v=>v.work.trainingDays++,v=>v.residence.kind='owned_cottage',v=>v.residence.locationId='invented-town',v=>v.residence.sinceDay--,v=>v.milestoneDay--,v=>v.history=[],v=>v.extra='unknown']) {
    const {s,p}=fixture();start(s,p);step(s,p,90);mutate(p.adultLife);assert.equal(validateAdultChildLife(p.adultLife,p,s),false);assert.equal(adultChildInheritance(s,p),null);
  }
  const {s,p}=fixture('knowledge');start(s,p);step(s,p,120);p.adultLife.study.sessions[0].day++;assert.equal(validateAdultChildLife(p.adultLife,p,s),false);
  const q=fixture();start(q.s,q.p);step(q.s,q.p,15);q.p.development.skills.survival=0;assert.equal(validateAdultChildLife(q.p.adultLife,q.p,q.s),false);
});
