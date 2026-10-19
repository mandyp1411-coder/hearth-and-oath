import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { LifeRun, engine, ordinaryChoice } from './playtest-utils.mjs';
import { getThread, getContacts } from '../dist/js/conversations.js';
import { classView } from '../dist/js/classes.js';
import { householdView } from '../dist/js/household.js';

const mode=process.argv.includes('--after')?'after':'baseline';
const plans=[
 {id:'childhood-01-healer',name:'Linden',seed:'v7-orphan-healer-41',birthplace:'brook',familySetup:'orphan',household:'poor',ancestry:'halfling',temperament:'compassionate',belief:'lantern',pursuit:'community',value:'mercy',school:'community',upper:'academy',calling:'healer',job:'healer',end:48,pick:'care'},
 {id:'childhood-02-druid',name:'Thistle',seed:'v7-unsheltered-grove-93',birthplace:'forest',familySetup:'homeless',household:'poor',ancestry:'orc',temperament:'cautious',belief:'wilds',pursuit:'nature',value:'freedom',school:'shrine',upper:'apprenticeship',calling:'druid',job:'herbalist',end:50,pick:'courage'},
 {id:'childhood-03-bard',name:'Coral',seed:'v7-coast-bard-76',birthplace:'coast',familySetup:'single_parent',household:'tradesfolk',ancestry:'goblin',temperament:'rebellious',belief:'secular',pursuit:'community',value:'freedom',school:'community',upper:'apprenticeship',calling:'bard',job:'bard',end:44,pick:'curiosity'},
 {id:'childhood-04-paladin',name:'Vesper',seed:'v7-noble-mercy-18',birthplace:'citadel',familySetup:'two_parents',household:'noble',ancestry:'tiefling',temperament:'ambitious',belief:'lantern',pursuit:'combat',value:'duty',school:'shrine',upper:'academy',calling:'paladin',job:'soldier',end:55,pick:'care'},
 {id:'childhood-05-independent-maker',name:'Bracken',seed:'v7-poor-maker-62',birthplace:'marsh',familySetup:'single_parent',household:'poor',ancestry:'dwarf',temperament:'curious',belief:'ancestors',pursuit:'craft',value:'ambition',school:null,upper:'apprenticeship',calling:null,job:'blacksmith',end:70,pick:'courage'},
 {id:'childhood-06-elder-scholar',name:'Aster',seed:'v7-elder-scholar-104',birthplace:'tower',familySetup:'two_parents',household:'noble',ancestry:'elf',temperament:'curious',belief:'secular',pursuit:'knowledge',value:'freedom',school:'community',upper:'academy',calling:null,job:'scholar',end:110,pick:'curiosity'},
];
function policyFor(p) { return (event,state)=>{
 if(event.id==='birth_arrival'||event.id.startsWith('birth_year_')||event.id==='birth_adult_year') return p.pick;
 const fixed={annual_deadline_review:'continue',travel_bandits:'avoid',travel_beasts:'avoid',travel_weather:'shelter',travel_caravan:'share',travel_witness:'listen',travel_sick_traveler:'aid',travel_lore:'record',travel_delay:'continue',family_dilemma:p.pick==='care'?'help':p.pick==='curiosity'?'ask':'boundary',school_dilemma:p.pick==='care'?'help':p.pick==='curiosity'?'ask':'boundary',school_scholarship:p.id.includes('healer')?'service':'study',school_exam:'present',calling_initiation:'accept',lineage_bereavement:p.pick==='curiosity'?'private':'memorial',life_birthday:p.pick==='care'?'people':p.pick==='curiosity'?'reflect':'rest',career_year:p.pick,health_concern:'support',plague_letter:'later',deadline_review:'pause',retirement:'settle'};
 if(fixed[event.id] && event.choices.some(c=>c.id===fixed[event.id])) return fixed[event.id];
 return ordinaryChoice(event);
 };}
function talk(run,id,want) {
 if(!run.available(`talk_${id}`))return false;
 run.act(`talk_${id}`);
 const thread=getThread(run.state,id);
 const replies=thread.replies;
 const priority=[...(want||[]),'ordinary','private','careful','belong','space','kind','quiet','boundary','ethics','release','listen','support','share','curious','study','sweet'];
 const pick=priority.find(id=>replies.some(r=>r.id===id));
 assert.ok(pick,`Unknown conversation ${run.state.conversations.pending?.nodeId}: ${replies.map(r=>r.id)}`);
 run.step(`reply:${id}:${pick}`,s=>engine.replyMessage(s,id,pick));run.settle();return true;
}
function attend(run,n) {for(let i=0;i<n;i++)run.act('school_attend').settle();}
function enroll(run,route) {
 const view=householdView(run.state),row=view.education.routes.find(r=>r.id===route);
 const descriptor=engine.getActions(run.state).find(a=>a.id===row.actionId);
 if(descriptor.disabledReason?.startsWith('Enrollment takes place at')){
   // The view advertises a named actual school. The route's location is exposed by its teacher.
   const target=route==='academy'&&run.state.age>=14?'city':run.state.life.people.find(p=>p.id==='kin'&&p.alive!==false)?.locationId||run.state.hero.birthplaceId;
   run.move(target);
 }
 run.act(row.actionId).settle();
}
function qualify(run,route,age,{revision=false}={}) {
 run.grow(age);
 if(route==='academy'&&age>=14)run.move('city');
 if(revision) {
  run.act('school_exam').choose('present').settle();
  assert.equal(run.state.education.qualifications.some(q=>q.route===route),false);
  run.grow(age+1);
  for(let i=0;i<2;i++)run.act('school_exam').choose('revise').settle();
 }
 run.act('school_exam').choose('present').settle();
 assert.ok(run.state.education.qualifications.some(q=>q.route===route));
}
function calling(run,id) {
 const item=classView(run.state).callings.find(c=>c.id===id);
 run.move(item.locationId);run.act(`calling_meet_${id}`).settle();
 for(let i=0;i<30 && run.available(`calling_train_${id}`);i++)run.act(`calling_train_${id}`).settle();
 run.act(`calling_seek_${id}`).choose('defer').settle();
 assert.equal(run.state.hero.specialization,null);
 const approach=mode==='after' ? id==='druid'?'independent':'service' : 'accept';
 run.act(`calling_seek_${id}`).choose(approach).settle();
 if(approach==='service'){
   if(id==='bard')run.grow(19);
   run.act(`calling_service_${id}`).settle();
 }
 assert.equal(run.state.hero.specialization,id);
 if(id==='paladin' && run.available('fulfill_oath'))run.act('fulfill_oath').settle();
 talk(run,run.state.progression.mentors[id].id,['notes','ethics','boundary']);
 talk(run,run.state.progression.mentors[id].id,['release','share']);
}
const rows=[];
for(const p of plans) {
 const run=new LifeRun(p.id,{name:p.name,seed:p.seed,birthplace:p.birthplace,familySetup:p.familySetup,household:p.household,temperament:p.temperament,belief:p.belief,ambition:p.calling?`Make a living as a ${p.job} while earning ${p.calling} training`:`Live a whole ordinary life as a ${p.job}`,appearance:{ancestry:p.ancestry,hairStyle:'braided',hair:'silver',outfit:'work'},preferences:{pursuit:p.pursuit,socialStyle:p.pick==='care'?'warm':'quiet',value:p.value,food:'sweet'}},policyFor(p));
 console.log(`${mode}: ${p.id} born in ${run.state.locationId}`);
 run.settle();talk(run,'kin',['comfort','wonder','quiet']);
 if(run.available('family_shelter'))run.act('family_shelter').settle();
 run.act('family_support').settle();run.act('family_dilemma').settle();
 run.grow(3);talk(run,'mira',['share','explore','brave']);talk(run,'fellow',['share','explore','brave']);
 run.grow(6);
 if(p.school){enroll(run,p.school);attend(run,p.id.includes('bard')?4:6);run.act('school_dilemma').settle();talk(run,householdView(run.state).education.teacher.id,['study','magic','help']);}
 else run.act('grow_read').settle();
 run.grow(7);run.act('family_dilemma').settle();
 for(const person of getContacts(run.state).filter(p=>p.familyRole==='sibling'))talk(run,person.id,['space','share','curious']);
 if(p.school)qualify(run,p.school,10,{revision:p.id.includes('bard')});
 run.grow(12);
 if(p.upper==='academy'){
   if(p.id.includes('healer')||p.id.includes('elder')){run.act('school_scholarship').settle();if(run.available('school_service'))run.act('school_service').settle();}
   else {run.act('school_scholarship').choose('wait').settle();}
 }
 enroll(run,p.upper);attend(run,6);run.act('school_dilemma').settle();
 qualify(run,p.upper,14);talk(run,householdView(run.state).education.teacher.id,['notes','ethics','boundary']);talk(run,householdView(run.state).education.teacher.id,['share','release']);
 run.grow(16);run.move('home');run.act(`career_choose_${p.job}`).settle();run.act('work').settle();
 run.grow(18);
 if(p.calling)calling(run,p.calling);
 run.move(run.state.hero.birthplaceId);talk(run,'fellow');talk(run,'rival');talk(run,'kin');
 if(!run.available('career_batch_month'))run.move('home');
 run.act('career_batch_month').finishBatch();
 if(run.available('family_dilemma'))run.act('family_dilemma').settle();
 for(let age=20;age<=p.end;age+=5){
   run.grow(Math.min(age,p.end));
   if(run.state.phase==='retired')break;
   const carer=run.state.life.people.find(p=>p.id==='kin');
   if(carer?.alive===false){
     const grow=engine.getActions(run.state).find(a=>a.id==='grow_family');
     if(grow?.label.includes(carer.name))run.findings.push({severity:'bug',age:run.state.age,issue:'Generic care activity still names deceased kin',action:grow});
     const bodyEvents=run.log.filter(row=>row.age>=run.state.age-5 && row.event==='birth_adult_year'&&row.body?.includes(carer.name));
     if(bodyEvents.length)run.findings.push({severity:'roleplay',age:run.state.age,issue:'Birthday scene mentions deceased household member',events:bodyEvents.map(row=>row.title)});
   }
   if(run.available('grow_family'))run.act('grow_family').settle();
   talk(run,'fellow');talk(run,'kin');
   if(run.available('family_dilemma'))run.act('family_dilemma').settle();
   if(!run.available('work'))run.move('home');
   run.act('work').settle();
 }
 if(run.state.phase!=='retired')run.grow(p.end).retire();
 assert.ok(run.summary().completed);
 if(mode==='baseline' && p.calling)run.findings.push({severity:'design',issue:'All earned-class initiations use one automatic two-day acceptance with no actual trial decision beyond accept/defer',calling:p.calling});
 if(mode==='after' && p.calling)run.findings.push({severity:'verified-improvement',issue:'Earned calling offers an actual community service commitment or an independent practice with a remembered mentor tradeoff',calling:p.calling,initiation:run.state.progression.initiations.find(row=>row.classId===p.calling)});
 if(p.job==='blacksmith' && mode==='baseline')run.findings.push({severity:'synergy',issue:'Craft preference does not recognize blacksmith work shifts; most v0.6 career actions lack preference context',pleasures:run.state.preferenceHistory.memories});
 const result=run.save(`artifacts/playtest/${mode}/childhood`);
 rows.push(result);console.log(`${p.id}: closed at age ${result.age}, ${result.operations} public operations, ${result.choices} decisions`);
}
mkdirSync('docs/playtest',{recursive:true});
writeFileSync(`docs/playtest/childhood-${mode}.json`,JSON.stringify({mode,method:'Six actual age-zero lives. Every step uses immutable public game APIs, checks save validity, and records advertised choices. No resources, skills, day or age were directly changed.',lives:rows},null,2)+'\n');
console.log(JSON.stringify({mode,lives:rows.length,completed:rows.filter(r=>r.completed).length,operations:rows.reduce((n,r)=>n+r.operations,0),findings:rows.flatMap(r=>r.findings)},null,2));
