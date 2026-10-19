// New annual reviews capture facts when queued. Saved older reviews retain their terms.
const stages=['Early practice','Established practice','Master practice'];
export const CAREER_SPECIALTIES = {
  service:{name:'Community practice',description:'Honest community deliveries earn 2 additional professional reputation.'},
  precision:{name:'Precision practice',description:'New commissions start with 4 additional quality points.'},
};
export function captureCareerDevelopment(s,profession,record,source) {
  const rank=s.life?.career?.rank || 0,stage=record.mastery>=3 || record.workedDays>=900 || rank>=3?2:record.mastery>=1 || record.workedDays>=180 || rank>=1?1:0;
  const children=s.life?.children || [];
  const dependents=children.filter(c=>c.alive!==false&&(Number.isSafeInteger(c.bornDay)?s.day-c.bornDay<18*365:(c.age || 0)<18)).length;
  const promise=s.obligations?.find(o=>!o.resolved&&o.dueDay>=s.day&&o.dueDay<=s.day+45);
  return {version:1,stage,mastery:record.mastery,rank:s.life?.career?.rank || 0,specialty:record.specialty || null,dependents,failures:record.failures,unreviewedFailures:Math.max(0,record.failures-(record.reviewedFailures || 0)),source,workedDays:record.workedDays,day:s.day,promise:promise?{title:promise.title.slice(0,220),dueDay:promise.dueDay}:null,previous:record.lastReview?{...record.lastReview}:null};
}
export function careerReviewTerms(development) {
  const stage=development?.stage || 0;
  return {safety:8+stage*2,reputation:stage?4:3,stress:10+stage*2,health:stage===2?5:4,communityReputation:7+stage,standing:stage===2?4:3,skill:stage===2?2:1,experience:stage*3,pay:25+stage*20,profitReputation:4+stage,profitSafety:6+stage,profitStress:6+stage*2};
}
const domains={Blacksmith:'Safe tools, fitted equipment and the makers who sign them',Farmer:'Seed stores, shared water and the growers who keep them',Alchemist:'Tested formulae, honest labels and the people who rely on them',Innkeeper:'Safe rooms, fair accounts and the workers who keep the door open',Miner:'Supported galleries, recorded warnings and the crews who enter them',Bard:'Living witnesses, teaching and credited performances',Cartographer:'Checked crossings, accessible maps and the surveyors behind them',Healer:'Consent, reliable follow-up and the people who provide care',Scholar:'Source records, accessible lessons and the readers behind discoveries',Herbalist:'Living roots, dependable preparations and the gatherers who tend them',Merchant:'Fair weights, dependable supplies and the carriers behind a sale',Soldier:'Safe drills, civilian crossings and the watch members who protect them'};
export function careerDevelopmentText(q) {
  const d=q.development;if(!d)return '';
  const specialty=d.specialty?CAREER_SPECIALTIES[d.specialty].name.toLowerCase():'no chosen specialty yet';
  const recent={work:'a local shift',shift:'a local shift',batch:'a saved work commitment',year:'ordinary work through the year',shop:'an operating week',practice:'supervised practice','commission-make':'commissioned work',teaching:'teaching actual colleagues','civic':'a recorded civic undertaking','public-work':'a signed public project',masterwork:'your lifetime work'}[d.source] || 'recorded professional work';
  const previous=d.previous?` Your previous review on day ${d.previous.day} chose ${d.previous.choice==='care'?'safer working hours':d.previous.choice==='community'?'community access':'a demanding premium contract'}.`:'';
  const obligations=d.dependents?` ${d.dependents} dependent ${d.dependents===1?'child shares':'children share'} the household budget.`:'';
  const promise=d.promise?` Your recorded promise, “${d.promise.title}”, is due on day ${d.promise.dueDay}.`:'';
  const failure=d.unreviewedFailures?` ${d.unreviewedFailures} failed or late ${d.unreviewedFailures===1?'promise needs':'promises need'} an honest review; this conversation cannot undo the missed delivery.`:'';
  const themes=[
    'You are being asked to set a safe limit on the workload that others now entrust to you.',
    'A larger contract would let you direct the queue. Neighbors ask how much access survives when your name can command a premium.',
    'The workplace needs a reliable review of its limits before the next busy season; experience does not remove the need to check.',
    'A younger practitioner asks to share decisions and authorship rather than repeat lessons meant for a beginner.',
  ];
  return `${stages[d.stage]}, guild rank ${d.rank}, mastery ${d.mastery}: ${specialty}. Your ${d.workedDays} recorded work days most recently included ${recent}.${obligations}${promise}${failure}${previous}${d.stage?` ${domains[q.profession]} now depend on decisions you can lead. ${themes[q.scene]}`:''} `;
}
export function validCareerDevelopment(d,{day,record,int,text}) {
  if(!d||d.version!==1||!int(d.stage,2)||!int(d.mastery,4)||!int(d.rank,3)||!(d.specialty===null||Object.hasOwn(CAREER_SPECIALTIES,d.specialty))||!int(d.dependents,200)||!int(d.failures)||!int(d.unreviewedFailures,d.failures)||!int(d.workedDays)||d.workedDays>record.workedDays||!int(d.day)||d.day>day||!['work','civic','shift','batch','year','shop','practice','commission-make','teaching','public-work','masterwork'].includes(d.source))return false;
  if(d.stage!==(d.mastery>=3||d.workedDays>=900||d.rank>=3?2:d.mastery>=1||d.workedDays>=180||d.rank>=1?1:0)||d.mastery>record.mastery||d.failures>record.failures)return false;
  if(d.promise!==null&&(!d.promise||!text(d.promise.title,220)||!int(d.promise.dueDay)||d.promise.dueDay<d.day||d.promise.dueDay>d.day+45))return false;
  if(d.previous!==null&&(!d.previous||!int(d.previous.day)||d.previous.day>d.day||!['care','community','profit'].includes(d.previous.choice)||!int(d.previous.stage,2)))return false;
  return true;
}
