import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { getAgeActivities, applyBirthAction, birthEvent } from '../dist/js/birth.js';
import { upbringingActions, applyUpbringingAction, onUpbringingTime, learningFocusProgress, validateUpbringing } from '../dist/js/upbringing.js';
import { householdActions, applyHouseholdAction, onHouseholdAge, householdView, educationTeacher, educationTransferPreview, validateEducation } from '../dist/js/household.js';
import { courseRecords, courseYearSummary } from '../dist/js/education-progress.js';
import { childhoodScene, snapshotChildhoodScene, applyChildhoodScene } from '../dist/js/childhood-stories.js';
import { childhoodMilestone } from '../dist/js/childhood-milestones.js';
import { birthdayEducationRecap, renderBirthdayRecap } from '../dist/js/education-ui.js';
import { storyInvitations, storyActions, LIFE_STORIES } from '../dist/js/life-stories.js';
import { lineageView, registerChild } from '../dist/js/lineage.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled fixtures exercise actual public commands and accounting. They are
// not extra audited lives, a human survey, browser geometry or balance telemetry.
function clear(s){for(let i=0;s.event&&i<80;i++){const c=s.event.choices.find(c=>['care','later','keep','continue','pause','leave','rest','support','defer'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}assert.equal(s.event,null);return s;}
const bases=new Map();for(const age of [3,6,12,18])bases.set(age,clear(await createLifeAtAge({seed:'growth-focus-ten',originId:'hearthborn',startAge:age,difficulty:'gentle'})));
function fresh(age=6){const s=structuredClone(bases.get(age));s.hero.gold=1000;return s;}
function roundtrip(s){assert.ok(E.validateSave(s),'whole life remains valid');assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);}
function act(s,id){
  s=atService(s,id);const a=E.getActions(s).find(a=>a.id===id);assert.ok(a,id);assert.equal(a.disabledReason,undefined,a.disabledReason);const n=E.chooseAction(s,id);roundtrip(n);return clear(n);}
function local(s,route='community'){const copy=structuredClone(s);copy.education.route=route;const id=educationTeacher(copy).locationId;s.locationId=id;syncCartography(s);return s;}
function school(s,route='community'){s=local(s,route);return s.education.enrolled&&s.education.route===route?s:act(s,'school_enroll_'+route);}
function birthday(s){const age=s.age;s=E.ageUp(s);for(let i=0;i<200;i++){if(s.event){const isBirthday=/^birth_/.test(s.event.id);const c=s.event.choices.find(c=>c.id==='care'&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);if(isBirthday){assert.equal(s.age,age+1);return clear(s);}}else if(s.timeline.yearTarget!==null)s=E.continueAgeUp(s);else break;}throw Error('Birthday did not finish');}
function moduleContext(s){return {journal(){},remember(){},standing(){},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}};}
const ui={e:String,button:(text,op,id='')=>`<button data-op="${op}" data-id="${id}">${text}</button>`};
function stage(age,flags={}){const s=fresh(3);s.age=age;s.day=age*365;s.timeline.storybook={version:1,records:[],flags:{...flags},items:{},pending:null};return s;}
const participants=s=>({kin:s.life.people.find(p=>p.id==='kin'),friend:s.life.people.find(p=>p.id==='fellow')});

test('the preschool learning requirement is visible before choosing a focus, with no free reward on selection',()=>{
 const s=fresh(3),a=upbringingActions(s).find(a=>a.id==='upbringing_learning'),before=structuredClone(s.hero);assert.match(a.description,/two stories and counting sessions/);assert.match(a.description,/180 actual days/);const n=E.chooseAction(s,a.id);assert.deepEqual(n.hero,before);assert.equal(n.upbringing.days,0);assert.equal(n.education.attendance,0);roundtrip(n);
});
for(const age of [3,4,5])test(`age ${age} can earn the disclosed learning focus through actual shared sessions`,()=>{
 let s=fresh(3);while(s.age<age)s=birthday(s);s=act(s,'upbringing_learning');const skill=s.hero.skills.scholarship,attendance=s.education.attendance,day=s.day;s=act(s,'grow_nursery');s=act(s,'grow_nursery');assert.equal(s.day,day+4);assert.equal(s.hero.skills.scholarship,skill+2);assert.equal(s.education.attendance,attendance);assert.equal(s.education.qualifications.length,0);assert.ok(getAgeActivities(s).find(a=>a.id==='grow_nursery').disabledReason);s=birthday(s);const r=s.upbringing.records.find(r=>r.age===age);assert.equal(r.developed,true);assert.equal(r.evidence.practice,'early');assert.equal(r.evidence.sessions,2);roundtrip(s);
});
test('preschool sessions require a living adult nearby and disappear at school age',()=>{
 const s=fresh(3);for(const p of s.life.people)if(p.age>=18)p.locationId='city';s.locationId='forest';assert.match(getAgeActivities(s).find(a=>a.id==='grow_nursery').disabledReason,/adult must be nearby/);s.age=6;assert.equal(getAgeActivities(s).some(a=>a.id==='grow_nursery'),false);
});
test('a year without the two promised preschool sessions does not invent a learning bonus',()=>{
 let s=fresh(3);s=act(s,'upbringing_learning');s=birthday(s);const r=s.upbringing.records.find(r=>r.age===3);assert.equal(r.developed,false);assert.equal(r.evidence.sessions,0);assert.match(r.text,/two shared stories and counting sessions; 0 were recorded/);roundtrip(s);
});
test('school-age focus guidance discloses enrollment and real attendance before selection',()=>{
 const s=fresh(6),a=upbringingActions(s).find(a=>a.id==='upbringing_learning');assert.match(a.description,/enroll in a named course and attend two real lessons/);assert.match(a.description,/Independent reading/);assert.equal(learningFocusProgress(s).early,false);
});
test('formal learning bonuses survive a course transfer and use the pupil’s actual total annual attendance',()=>{
 let s=school(fresh(6));s=act(s,'upbringing_learning');s=act(s,'school_attend');s=school(s,'shrine');s=act(s,'school_attend');assert.equal(s.education.attendanceThisYear,2);s=birthday(s);const r=s.upbringing.records.find(r=>r.age===6);assert.equal(r.developed,true);assert.equal(r.evidence.practice,'school');assert.equal(r.evidence.sessions,2);roundtrip(s);
});
test('changing focus late in the year counts only days actually lived with that focus',()=>{
 const s=fresh(3);s.event=null;s.upbringing.year=3;s.upbringing.days=250;s.day=3*365+250;assert.ok(applyUpbringingAction(s,'upbringing_learning',moduleContext(s)));assert.equal(s.upbringing.days,0);s.timeline.activityUses['3:grow_nursery']=2;const old=s.day;s.day=4*365;s.age=4;const skill=s.hero.skills.scholarship;onUpbringingTime(s,old,moduleContext(s));const r=s.upbringing.records.at(-1);assert.equal(r.days,115);assert.equal(r.developed,false);assert.equal(s.hero.skills.scholarship,skill);assert.equal(validateUpbringing(s.upbringing,s),true);
});
test('one elapsed focus year awards once across split time, serialization and repeated continuation',()=>{
 const s=fresh(3);s.upbringing={version:1,focus:'learning',chosenAge:3,days:0,year:3,records:[]};s.day=3*365;s.timeline.activityUses['3:grow_nursery']=2;const skill=s.hero.skills.scholarship;for(const n of [100,80,185]){const old=s.day;s.day+=n;s.age=Math.floor(s.day/365);onUpbringingTime(s,old,moduleContext(s));}assert.equal(s.hero.skills.scholarship,skill+1);assert.equal(s.upbringing.records.length,1);const restored=JSON.parse(JSON.stringify(s));onUpbringingTime(restored,s.day,moduleContext(restored));assert.equal(restored.hero.skills.scholarship,skill+1);assert.equal(restored.upbringing.records.length,1);
});
test('new learning evidence rejects an invented developed outcome while older stored records remain readable',()=>{
 const s=fresh(6);s.upbringing.records=[{age:3,focus:'learning',day:4*365,days:115,developed:true,personName:null,text:'Old recorded account'}];assert.equal(validateUpbringing(s.upbringing,s),true);s.upbringing.records[0].evidence={version:1,practice:'early',sessions:2};assert.equal(validateUpbringing(s.upbringing,s),false);
});
for(const [age,id]of [[3,'growth-first-voice'],[6,'growth-school-door'],[12,'growth-wider-lessons'],[16,'growth-first-independence']])test(`the age ${age} milestone has its own concise choices and no automatic enrollment, wages or calling`,()=>{
 const s=stage(age),chapter=childhoodMilestone(s,participants(s));assert.equal(chapter.id,id);assert.ok(chapter.body.split(/\s+/).length<110);assert.equal(new Set(chapter.choices.map(c=>c.label)).size,3);const before={enrolled:s.education.enrolled,profession:s.hero.profession,path:s.hero.path,gold:s.hero.gold};snapshotChildhoodScene(s,chapter);assert.ok(applyChildhoodScene(s,'curiosity'));assert.deepEqual({enrolled:s.education.enrolled,profession:s.hero.profession,path:s.hero.path,gold:s.hero.gold},before);
});
test('growth milestones reflect the actual household and a previously developed focus, not a newly selected label',()=>{
 const s=stage(12);s.family.housing='unsheltered';s.upbringing.focus='learning';s.upbringing.records=[{age:11,focus:'friendship',developed:true}];const a=childhoodMilestone(s,participants(s));assert.match(a.body,/looking for a lasting roof/);assert.match(a.body,/making room for other people/);assert.equal(a.body.includes('remembered years of questions'),false);s.family.housing='secure';s.upbringing.records[0].focus='learning';const b=childhoodMilestone(s,participants(s));assert.match(b.body,/remembered years of questions/);assert.notEqual(a.body,b.body);
});
test('a remembered school-door choice changes a later childhood scene and closes its own callback',()=>{
 const s=stage(6),a=childhoodMilestone(s,participants(s));snapshotChildhoodScene(s,a);applyChildhoodScene(s,'curiosity');s.age=10;s.day=10*365;const b=childhoodScene(s);assert.equal(b.id,'growth-old-slate');assert.match(b.body,/bring a question of your own/);snapshotChildhoodScene(s,b);applyChildhoodScene(s,'care');assert.equal(s.timeline.storybook.flags.growingSchoolRecall,true);assert.notEqual(childhoodScene(s).id,'growth-old-slate');
});
test('adulthood recalls the real age of an earlier independence plan, including a plan made at seventeen',()=>{
 const s=stage(17),a=childhoodMilestone(s,participants(s));snapshotChildhoodScene(s,a);applyChildhoodScene(s,'curiosity');s.age=18;s.day=18*365;const b=childhoodScene(s);assert.equal(b.id,'growth-kept-plan');assert.match(b.body,/At 17,/);assert.ok(b.body.includes(s.timeline.storybook.records.at(-1).outcome));assert.equal(b.body.includes('At sixteen'),false);snapshotChildhoodScene(s,b);applyChildhoodScene(s,'care');assert.notEqual(childhoodScene(s)?.id,'growth-kept-plan','the remembered plan resolves once');
});
test('already-open childhood scenes keep their saved wording and effects through the milestone update',()=>{
 const s=stage(6),a={id:'kept-old-scene',title:'A saved lesson',body:'The exact earlier household account.',choices:['care','curiosity','courage'].map(id=>({id,label:id,description:'An earlier option.',outcome:'The recorded earlier outcome.',effect:{skills:['scholarship']}}))};snapshotChildhoodScene(s,a);const before=structuredClone(s.timeline.storybook.pending);assert.deepEqual(childhoodScene(s),a);assert.deepEqual(s.timeline.storybook.pending,before);assert.ok(applyChildhoodScene(s,'care'));assert.equal(s.timeline.storybook.records.at(-1).outcome,'The recorded earlier outcome.');
});
test('new scenes add to the ordinary seeded childhood pool rather than replacing it for every life',()=>{
 const ids=new Set();const source=stage(3);for(let i=0;i<90;i++){const s=structuredClone(source);s.seed='growth-variation-'+i;ids.add(childhoodScene(s).id);}assert.ok(ids.has('growth-first-voice'));assert.ok(ids.size>=6,'ordinary childhood scenes remain reachable');
});
test('a school-year birthday keeps the chosen personal outcome beside the annual school account through reload',()=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=act(s,'school_attend');s=birthday(s);const v=birthdayEducationRecap(s),personal=s.timeline.yearHistory.at(-1);assert.equal(v.personal,personal.summary);assert.match(v.school,/2 attended sessions/);assert.ok(s.notice.includes(personal.summary));assert.ok(s.education.history.some(r=>r.text===v.school));const html=renderBirthdayRecap(s,ui);assert.ok(html.includes(personal.summary));assert.match(html,/data-birthday-outcome/);assert.match(html,/data-school-outcome/);roundtrip(s);
});
test('the birthday school report preserves separate attendance at both courses',()=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=school(s,'shrine');s=act(s,'school_attend');s=birthday(s);const v=birthdayEducationRecap(s);assert.match(v.school,/2 attended sessions/);assert.ok(v.school.includes('1 at '+householdView({...s,education:{...s.education,route:'community'}}).education.schoolName));assert.ok(v.school.includes('1 at '+householdView(s).education.schoolName));roundtrip(s);
});
test('an unrelated school action on another date cannot replace or masquerade as the earlier birthday account',()=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=birthday(s);const before=birthdayEducationRecap(s);s=act(s,'school_attend');assert.deepEqual(birthdayEducationRecap(s),before);roundtrip(s);
});
test('a sixteen-year-old child remains eligible for lessons while the adult-child story is unavailable',()=>{
 const s=fresh(18);s.age=40;s.day=40*365;s.life.children=[{id:'child-1',name:'Actual child',age:16,bornDay:s.day-16*365,alive:true}];const d=LIFE_STORIES.find(d=>d.id==='child_other_road');assert.equal(d.eligible(s),false);assert.equal(storyInvitations(s).some(i=>i.id===d.id),false);s.life.children[0].age=18;assert.equal(d.eligible(s),false,'stale display age cannot open the adult story');s.life.children[0].bornDay=s.day-18*365;s.life.children[0].age=16;assert.equal(d.eligible(s),true,'absolute birth date supplies the actual age');assert.equal(d.actor(s),'child-1');assert.ok(storyInvitations(s).some(i=>i.id===d.id));assert.equal(s.stories.arcs.some(a=>a.id===d.id),false,'a visible invitation is still optional');
});
test('child-story eligibility selects a living adult child and ignores deceased or younger siblings',()=>{
 const s=fresh(18);s.age=44;s.day=44*365;s.life.children=[{id:'child-1',name:'Younger',age:16,bornDay:s.day-16*365,alive:true},{id:'child-2',name:'Remembered',age:19,bornDay:s.day-19*365,alive:false},{id:'child-3',name:'Adult',age:18,bornDay:s.day-18*365,alive:true}];const d=LIFE_STORIES.find(d=>d.id==='child_other_road');assert.equal(d.actor(s),'child-3');assert.equal(storyInvitations(s).find(i=>i.id===d.id).personId,'child-3');
});
for(const startingAge of [0,6,18])test(`a shrine foundling starting at ${startingAge} has unrecorded birth parents and actual guardians, without invented parent deaths`,async()=>{
 const s=await createLifeAtAge({seed:'foundling-focus-ten',originId:'shrine_foundling',startAge:startingAge,difficulty:'gentle'});assert.equal(s.family.parentage,'unrecorded');const parents=s.family.members.filter(m=>m.relationship==='birth parent');assert.equal(parents.length,2);assert.ok(parents.every(m=>m.availability==='unknown'&&m.personId===null));assert.ok(s.life.people.find(p=>p.id==='kin').familyRole==='guardian');assert.equal(s.lineage.people.filter(p=>p.source==='ancestor'&&p.localId.startsWith('recorded-parent-')).length,0);assert.equal(s.lineage.people.find(p=>p.id===s.dynasty.activePersonId).parentIds.length,0);assert.equal(lineageView(s).unrecordedParents.length,2);assert.ok(householdView(s).family.setupLabel.includes('guardian'));roundtrip(s);
});
test('a declared orphan household keeps its recorded parent deaths and does not acquire an unknown-parentage flag',()=>{
 const s=E.createBirthGame({seed:'confirmed-orphan',familySetup:'orphan'});assert.equal(s.family.parentage,undefined);assert.equal(s.family.members.filter(m=>m.relationship==='birth parent'&&m.availability==='deceased').length,2);assert.equal(s.lineage.people.filter(p=>p.source==='ancestor'&&!p.alive).length,2);roundtrip(s);
});
test('the origins conversation names only confirmed parent deaths and keeps foundling parentage uncertain',async()=>{
 const foundling=clear(await createLifeAtAge({seed:'foundling-dialogue',originId:'shrine_foundling',startAge:6,difficulty:'gentle'}));roundtrip(foundling);
 for(const unknown of [true,false]){
  let body=null;
  for(let i=0;i<60;i++){
   // Module fixtures vary the scene selector only; whole-save validation is
   // covered above for the actual generated foundling and declared orphan.
   let s=unknown?structuredClone(foundling):E.createBirthGame({seed:'known-parents',familySetup:'orphan'});s.age=6;s.day=6*365;s.event=null;s.seed='origins-dialogue-'+i;s.family.interactionUses={};const caregiver=s.life.people.find(p=>p.id==='kin');s.locationId=caregiver.locationId||s.locationId;syncCartography(s);for(const room of settlementWalkPath(s,'homes'))s=E.chooseAction(s,'atlas_room_'+room);
   assert.ok(applyHouseholdAction(s,'family_dilemma',moduleContext(s)));
   if(s.family.pending.sceneId==='origins'){body=s.event.body;if(!unknown)for(const p of s.family.members.filter(m=>m.relationship==='birth parent'))assert.ok(body.includes(p.name));break;}
  }
  assert.ok(body,'an origins scene was sampled');
  if(unknown){assert.match(body,/missing names and uncertain whereabouts/);assert.equal(/deceased|dead parents/i.test(body),false);}else assert.match(body,/as deceased/);
 }
});
test('older foundling saves retain existing named death records rather than silently rewriting their history',()=>{
 const s=E.createBirthGame({seed:'old-recorded-foundling',familySetup:'orphan'});s.hero.lifeOrigin={version:1,id:'shrine_foundling',startingAge:0};const before=structuredClone(s.family),people=structuredClone(s.lineage.people);const loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.family,before);assert.deepEqual(loaded.lineage.people,people);roundtrip(loaded);
});
test('a transfer resumes the exact earlier attendance, preparation and performance without another reward',()=>{
 let s=school(fresh(12));s=act(s,'school_attend');s=act(s,'school_attend');s.education.performance=43;const before={attendance:s.education.attendance,progress:s.education.progress,performance:s.education.performance,year:s.education.year},skills=structuredClone(s.hero.skills),gold=s.hero.gold;s=school(s,'shrine');assert.equal(s.education.attendance,0);assert.equal(s.education.progress,0);assert.ok(courseRecords(s).some(r=>r.route==='community'&&!r.active&&r.progress===before.progress));roundtrip(s);s=school(s,'community');for(const key of Object.keys(before))assert.equal(s.education[key],before[key]);assert.deepEqual(s.hero.skills,skills);assert.equal(s.hero.gold,gold);assert.equal(s.education.lessonsThisYear,2);roundtrip(s);
});
test('transfer previews disclose destination preparation, time, fees and shared annual limits without mutation',()=>{
 let s=school(fresh(12));s=act(s,'school_attend');const before=structuredClone(s),q=educationTransferPreview(s,'academy');assert.equal(q.cost,20);assert.equal(q.days,1);assert.equal(q.prepared.progress,0);assert.match(q.explanation,/stay with that route/);assert.match(q.explanation,/limits do not reset/);assert.deepEqual(s,before);
});
test('transferring back after reload does not reset lesson, revision, exam or qualification limits',()=>{
 let s=school(fresh(12));for(let n=0;n<8;n++)s=act(s,'school_attend');s.education.preparationsThisYear=2;s.education.examinedYear=s.age;const quals=structuredClone(s.education.qualifications);s=school(s,'shrine');s=E.migrateSave(JSON.parse(JSON.stringify(s)));s=school(s,'community');assert.equal(s.education.lessonsThisYear,8);assert.equal(s.education.preparationsThisYear,2);assert.equal(s.education.examinedYear,s.age);assert.deepEqual(s.education.qualifications,quals);assert.ok(householdActions(s).find(a=>a.id==='school_attend').disabledReason);roundtrip(s);
});
test('paused preparation survives birthdays without invented attendance, study years or a performance reset',()=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=school(s,'shrine');const kept=structuredClone(s.education.courseBook.paused.community);s=birthday(s);assert.deepEqual(s.education.courseBook.paused.community,kept);assert.equal(s.education.attendanceThisYear,0);assert.equal(s.education.courseBook.termAge,s.age);s=school(s,'community');assert.equal(s.education.attendance,kept.attendance);assert.equal(s.education.progress,kept.progress);assert.equal(s.education.performance,kept.performance);roundtrip(s);
});
test('an old current course becomes a known baseline without inventing erased earlier courses',()=>{
 let s=school(fresh(12));s=act(s,'school_attend');s=act(s,'school_attend');delete s.education.courseBook;const before=structuredClone(s.education);roundtrip(s);assert.deepEqual(s.education,before);s=school(s,'shrine');assert.deepEqual(Object.keys(s.education.courseBook.paused),['community']);assert.equal(s.education.courseBook.priorAttendance,2);assert.match(courseYearSummary(s),/route attribution unrecorded/);s=school(s,'community');assert.equal(s.education.progress,before.progress);roundtrip(s);
});
test('legacy attendance cannot give a newly chosen course an unearned annual performance boost',()=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=act(s,'school_attend');delete s.education.courseBook;s=school(s,'shrine');assert.equal(s.education.courseBook.priorCourse,'community');assert.equal(s.education.courseBook.priorAttendance,2);s=birthday(s);assert.equal(s.education.performance,46);assert.equal(s.education.courseBook.priorAttendance,0);roundtrip(s);
});
for(const field of ['future','active','negative','counts','route'])test(`invalid saved course-book ${field} is rejected`,()=>{
 let s=school(fresh(12));s=act(s,'school_attend');s=school(s,'shrine');const b=s.education.courseBook;if(field==='future')b.paused.community.pausedDay=s.day+1;if(field==='active')b.paused.shrine=structuredClone(b.paused.community);if(field==='negative')b.paused.community.progress=-1;if(field==='counts')b.attendance.community++;if(field==='route')b.paused.imaginary=structuredClone(b.paused.community);assert.equal(E.validateSave(s),false);
});
test('course previews and read views do not start an old pending exam or replace its stored scene',()=>{
 let s=school(fresh(12));for(let n=0;n<4;n++)s=act(s,'school_attend');s=E.chooseAction(s,'school_exam');assert.equal(s.event.id,'school_exam');const before=structuredClone(s);householdView(s);educationTransferPreview(s,'shrine');assert.deepEqual(s,before);roundtrip(s);
});
test('production transfer review and cancel leave time, gold, course preparation and neighboring slots untouched',async t=>{
 let s=school(fresh(12));s=act(s,'school_attend');s=atService(s,'school_enroll_shrine');const neighbor=fresh(3),surface=await mountApp(t,{states:[s,neighbor]});await surface.click('title-continue');await surface.click('place-open');await surface.click('service-open','school-shrine-'+surface.current().locationId);const before=structuredClone(surface.current());await surface.click('activity','school_enroll_shrine');assert.ok(surface.root.querySelector('[role="dialog"]'));assert.match(surface.root.innerHTML,/A COURSE TRANSFER/);assert.match(surface.root.innerHTML,/limits do not reset/);assert.deepEqual(surface.current(),before);await surface.click('close-modal');assert.deepEqual(surface.current(),before);assert.deepEqual(surface.lives()[1],neighbor);
});
test('production confirmation performs the reviewed transfer once, preserving the old course in its record',async t=>{
 let s=school(fresh(12));s=act(s,'school_attend');s=atService(s,'school_enroll_shrine');const surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('place-open');await surface.click('service-open','school-shrine-'+surface.current().locationId);const before=structuredClone(surface.current());await surface.click('activity','school_enroll_shrine');const control=surface.root.querySelector('[data-op="school-transfer-confirm"]');await surface.click('school-transfer-confirm','shrine');const after=surface.current();assert.equal(after.education.route,'shrine');assert.equal(after.day,before.day+1);assert.equal(after.hero.gold,before.hero.gold);assert.equal(after.education.courseBook.paused.community.progress,before.education.progress);assert.equal(after.education.courseBook.paused.community.progress,before.education.progress);await surface.fire('click',control);assert.deepEqual(surface.current(),after);roundtrip(after);
});
test('production family and school surfaces expose preschool learning without a formal enrollment claim',async t=>{
 const s=fresh(3),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('tab','activities');assert.match(surface.root.innerHTML,/Stories|counting|story|familiar/i);assert.ok(surface.root.querySelector('[data-op="activity"][data-id="grow_nursery"]'));assert.equal(surface.root.controls.some(c=>c.dataset.op==='activity'&&c.dataset.id?.startsWith('school_enroll_')),false);const before=surface.current();await surface.click('activity','grow_nursery');const after=surface.current();assert.equal(after.day,before.day+2);assert.equal(after.education.attendance,0);roundtrip(after);
});
test('birthday accounts remain in the Journal without a duplicated recap on Today',async t=>{
 let s=school(fresh(6));s=act(s,'school_attend');s=birthday(s);const v=birthdayEducationRecap(s),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');const before=surface.current();assert.equal(surface.root.querySelector('[data-birthday-recap]'),null);assert.ok(before.timeline.yearHistory.some(y=>y.summary===v.personal));assert.ok(before.education.history.length);await surface.click('workspace-section','life:years');assert.ok(surface.root.querySelector('.life-feed').textContent.includes(v.personal));assert.deepEqual(surface.current(),before);
});
