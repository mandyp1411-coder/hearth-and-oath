const FOCUSES={
  discovery:{label:'Explore & play',skill:'survival',text:'A year of games, small discoveries and learning the paths near home.'},
  learning:{label:'Lessons & curiosity',skill:'scholarship',text:'Questions, books and attended lessons shape the year.'},
  friendship:{label:'Family & friendships',skill:'persuasion',text:'Make room for the people you are growing up beside.'},
  practice:{label:'Practice & responsibility',skill:'defense',text:'Train patiently and take a greater share of ordinary responsibilities.'},
};
export function initializeUpbringing(s) {
  if(s.timeline?.mode!=='birth')return;
  if(!s.upbringing)s.upbringing={version:1,focus:'discovery',chosenAge:null,days:0,year:s.age,records:[]};
}
export function learningFocusProgress(s,age=s.age) {
  const early=age<6,done=early?(s.timeline?.activityUses?.[`${age}:grow_nursery`] || 0):(s.education?.attendanceThisYear || 0);
  return {early,done,required:2,days:s.upbringing?.year===age?s.upbringing.days:0,minimumDays:180,description:early?'Before age six, share two stories and counting sessions with an adult nearby. Formal school attendance is not required or awarded.':'From age six, enroll in a named course and attend two real lessons this year. Independent reading stays available, but does not count as attendance.'};
}
export function upbringingActions(s) {
  if(s.timeline?.mode!=='birth'||s.age<3||s.age>=18||s.event||s.battle||s.conversations?.pending)return [];
  return Object.entries(FOCUSES).filter(([id])=>s.age>=12||id!=='practice').map(([id,f])=>({id:'upbringing_'+id,label:f.label,description:f.text+` A skill develops after 180 actual days with this focus.${id==='learning'?' '+learningFocusProgress(s).description:''} Choosing grants nothing immediately; changing focus starts its day count again.`,days:0,cost:0,group:'Growing up',...(s.upbringing?.chosenAge===s.age?{disabledReason:'Your focus for this year is chosen. Choose again next birthday.'}:{})}));
}
export function applyUpbringingAction(s,id,ctx) {
  const offered=upbringingActions(s).find(a=>a.id===id&&!a.disabledReason);if(!offered)return false;
  initializeUpbringing(s);const focus=id.slice(11);if(s.upbringing.focus!==focus||s.upbringing.year!==s.age)s.upbringing.days=0;s.upbringing.year=s.age;s.upbringing.focus=focus;s.upbringing.chosenAge=s.age;
  s.notice=`This year, you will make more room for ${FOCUSES[s.upbringing.focus].label.toLowerCase()}.`;
  ctx.journal?.('The year you choose',s.notice,'childhood');return true;
}
export function onUpbringingTime(s,oldDay,ctx) {
  if(s.timeline?.mode!=='birth')return;
  initializeUpbringing(s);
  const u=s.upbringing,birth=s.timeline.birthDay||0;
  for(let day=oldDay;day<s.day;){
    const age=Math.floor((day-birth)/365),end=Math.min(s.day,birth+(age+1)*365);
    if(age>=3&&age<18){
      if(u.year!==age){u.year=age;u.days=0;u.chosenAge=null;}
      u.days+=end-day;
      if(end===birth+(age+1)*365&&!u.records.some(r=>r.age===age)){
        const f=FOCUSES[u.focus],proof=learningFocusProgress(s,age),qualified=u.days>=180&&(u.focus!=='learning'||proof.done>=2);
        if(qualified)s.hero.skills[f.skill]=Math.min(10000,s.hero.skills[f.skill]+1);
        const person=s.life?.people.find(p=>p.alive!==false&&(u.focus==='friendship'?p.id==='fellow':p.familyRole));
        if(qualified&&u.focus==='friendship'&&person)person.bond=Math.min(100,person.bond+3);
        const text=`At ${age}, ${f.text.toLowerCase()}${qualified?` Your ${f.skill} developed through ${u.days} actual focus days${u.focus==='learning'?` and ${proof.done} ${proof.early?'shared stories and counting sessions':'attended lessons'}`:''}.`:` ${u.days} actual focus days were recorded; 180 are needed.${u.focus==='learning'&&proof.done<2?` You also need two ${proof.early?'shared stories and counting sessions':'attended lessons'}; ${proof.done} were recorded.`:''}`}${person?` ${person.name} remains part of those memories.`:''}`;
        u.records.push({age,focus:u.focus,day:end,days:u.days,developed:qualified,personName:person?.name||null,text,evidence:{version:1,practice:u.focus==='learning'?(proof.early?'early':'school'):'life',sessions:u.focus==='learning'?proof.done:0}});u.records=u.records.slice(-20);
        ctx.journal?.('Growing into your own life',text,'childhood');
      }
    }
    day=end;
  }
}
function validEvidence(r){const e=r.evidence;if(e===undefined)return true;const practice=r.focus==='learning'?(r.age<6?'early':'school'):'life';return e&&e.version===1&&e.practice===practice&&Number.isSafeInteger(e.sessions)&&e.sessions>=0&&e.sessions<=(practice==='early'?2:practice==='school'?8:0)&&r.developed===(r.days>=180&&(r.focus!=='learning'||e.sessions>=2));}
export function validateUpbringing(v,s) {
  if(v===undefined)return true;
  return v&&v.version===1&&Object.hasOwn(FOCUSES,v.focus)&&(v.chosenAge===null||Number.isInteger(v.chosenAge)&&v.chosenAge>=3&&v.chosenAge<s.age+1)&&Number.isInteger(v.days)&&v.days>=0&&v.days<=365&&Number.isInteger(v.year)&&v.year>=0&&v.year<=s.age&&Array.isArray(v.records)&&v.records.length<=20&&new Set(v.records.map(r=>r.age)).size===v.records.length&&v.records.every(r=>r&&Number.isInteger(r.age)&&r.age>=3&&r.age<18&&Object.hasOwn(FOCUSES,r.focus)&&Number.isInteger(r.day)&&r.day<=s.day&&r.day>=0&&Number.isInteger(r.days)&&r.days>=0&&r.days<=365&&typeof r.developed==='boolean'&&(r.personName===null||typeof r.personName==='string'&&r.personName.length<=100)&&typeof r.text==='string'&&r.text.length<=800&&validEvidence(r));
}
export function upbringingPanel(s,actions,ui) {
  const {e,button,actionCards}=ui,u=s.upbringing;
  const stages=[[0,'First years'],[3,'Childhood'],[6,'School years'],[12,'Adolescence'],[16,'First independence'],[18,'Adulthood']];
  if(s.age>=18)return u?.records.length?`<details class="panel upbringing-memories"><summary>How you grew up · ${u.records.length} remembered years</summary>${u.records.slice(-5).map(r=>`<p>${e(r.text)}</p>`).join('')}</details>`:'';
  return `<section class="panel upbringing-panel"><span class="eyebrow">GROWING UP</span><h2>${s.age<3?'The people who raise you':'Your next year is taking shape'}</h2><div class="life-stage-track">${stages.map(([age,label])=>`<span class="${s.age>=age?'reached':''}"><small>${age}+</small>${label}</span>`).join('')}</div><p>${e(s.age<3?'Your caregivers make the first decisions. Familiar people, home and small milestones form these years.':`Your focus: ${FOCUSES[u?.focus||'discovery'].label}. As you grow, your decisions and responsibilities widen.`)}</p>${s.age>=3&&u?.focus==='learning'?`<p class="small-copy" data-learning-requirement>${e(learningFocusProgress(s).description)} ${learningFocusProgress(s).done}/2 sessions · ${learningFocusProgress(s).days}/180 actual focus days.</p>`:''}${s.age>=3?`<details ${u?.chosenAge===s.age?'':'open'}><summary>Choose this year’s focus</summary>${actionCards(actions.filter(a=>a.id.startsWith('upbringing_')))}</details>`:''}${u?.records.at(-1)?`<p class="small-copy">${e(u.records.at(-1).text)}</p>`:''}${button('Home & education','tab','household','ghost small')}</section>`;
}
