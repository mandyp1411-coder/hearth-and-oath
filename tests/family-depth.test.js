import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame } from '../dist/js/engine.js';
import { initializeFamilyDepth, householdActions, applyHouseholdAction, applyHouseholdChoice, onHouseholdAge, educationTeacher, educationRetiredTeachers, validateEducation } from '../dist/js/household.js';
import { lineageActions, applyLineageAction, applyLineageChoice, validateLineage, adoptionView } from '../dist/js/lineage.js';
import { compatibilityView, compatibilityConversation } from '../dist/js/family-depth.js';

function fixture(seed='family-depth',age=30) {
  const s=createBirthGame({seed,name:'Sable Test',familySetup:'two_parents',household:'tradesfolk'});
  s.event=null;s.day=age*365;s.age=age;s.phase=age>=18?'adult':'childhood';s.hero.gold=1000;s.life.home={tier:'cottage',locationId:s.locationId,source:'purchase'};
  s.family.lastAge=age;s.education.lastAge=age;
  return s;
}
function context(s,limit=Infinity) {
  return {journal(title,text,category){s.journal.push({id:`test-${s.journal.length}`,day:s.day,age:s.age,title,text,category});},setEvent(id,title,eyebrow,body,choices){s.event={id,title,eyebrow,body,choices};},spendDays(days){const actual=Math.min(days,limit);s.day+=actual;s.age=Math.floor(s.day/365);return actual;},addObligation(){},finishObligation(){}};
}
function act(s,id,ctx) {const action=lineageActions(s).find(a=>a.id===id);assert.ok(action&&!action.disabledReason,action?.disabledReason||id);assert.equal(applyLineageAction(s,id,ctx),true);}
function pick(s,id,ctx){const event=s.event;assert.ok(event?.choices.some(c=>c.id===id));s.event=null;assert.equal(applyLineageChoice(s,event.id,id,ctx),true);}
function meet(s,age,ctx){act(s,`lineage_adoption_${age}`,ctx);assert.equal(s.event.id,'lineage_adoption');pick(s,'listen',ctx);return s.lineage.adoption.candidates.at(-1);}

test('individual known wishes explain respectful difference and dismissal without a romance score',()=>{
  const s=fixture(),p=s.life.people.find(p=>p.id==='fellow');
  const unknown=compatibilityView(s,p);assert.equal(unknown.known.length,0);assert.ok(!Object.hasOwn(unknown,'score'));
  const before=p.bond;const reply=compatibilityConversation(s,p,'values','listen');assert.equal(p.bond,before+2);assert.match(reply.text,/listened/);
  const known=compatibilityView(s,p);assert.equal(known.known.length,4);assert.equal(known.shared.length+known.differences.length,4);
  const after=p.bond;compatibilityConversation(s,p,'values','dismiss');assert.equal(p.bond,after-7);assert.match(p.memories.at(-1),/boundaries/);
  const appearance=structuredClone(p.appearance);compatibilityConversation(s,p,'values',p.compatibility.preferences.value);assert.deepEqual(p.appearance,appearance);
});

test('route projects demand real preparation, preserve participant outcomes, and cannot repeat within a school year',()=>{
  const s=fixture('projects',12),ctx=context(s);s.education.route='apprenticeship';s.education.schoolId='school-apprenticeship';s.education.enrolled=true;
  assert.match(householdActions(s).find(a=>a.id==='school_project_tool_repair').disabledReason,/two supervised/);
  for(let i=0;i<2;i++){ctx.spendDays(4);assert.equal(applyHouseholdAction(s,'school_attend',ctx),true);}
  ctx.spendDays(1);assert.equal(applyHouseholdAction(s,'school_path',ctx),true);s.event=null;assert.equal(applyHouseholdChoice(s,'school_path','practical',ctx),true);
  const before=structuredClone(s.hero.skills),progress=s.education.progress;
  ctx.spendDays(5);assert.equal(applyHouseholdAction(s,'school_project_tool_repair',ctx),true);assert.equal(validateEducation(s.education,s),true);
  s.event=null;assert.equal(applyHouseholdChoice(s,'school_project','care',ctx),true);assert.equal(s.education.progress,progress+2);assert.equal(s.hero.skills.persuasion,before.persuasion+2);assert.equal(s.hero.skills.survival,before.survival+1);
  assert.match(s.education.projects[0].outcome,/maintain/);assert.match(householdActions(s).find(a=>a.id==='school_project_tool_repair').disabledReason,/already completed/);
  const recorded=structuredClone(s);assert.equal(applyHouseholdAction(s,'school_project_tool_repair',ctx),false);assert.deepEqual(s,recorded);
});

test('teachers hand on an actual school, retain earlier identity, and wait for active correspondence',()=>{
  const s=fixture('teacher-handoff',60),ctx=context(s);s.education.route='community';s.education.schoolId='school-community';s.education.enrolled=true;
  const original=educationTeacher(s);s.education.teachers.community.bornDay=s.day-71*365;
  s.conversations.pending={personId:original.id,nodeId:'ordinary'};onHouseholdAge(s,ctx);assert.equal(educationTeacher(s).id,original.id);
  s.conversations.pending=null;onHouseholdAge(s,ctx);const successor=educationTeacher(s);assert.notEqual(successor.name,original.name);assert.notEqual(successor.id,original.id);assert.ok(successor.age<70);
  const remembered=educationRetiredTeachers(s).find(t=>t.id===original.id);assert.equal(remembered.name,original.name);assert.equal(remembered.available,false);assert.equal(validateEducation(s.education,s),true);
});

test('an imported pending examination keeps its original teacher and exact effects before future depth begins',()=>{
  const s=fixture('old-examination',14),ctx=context(s);delete s.education.depthVersion;delete s.education.depthStartedDay;delete s.education.academicPath;delete s.education.projects;delete s.education.teacherHistory;delete s.education.teachers;
  s.education.route='community';s.education.schoolId='school-community';s.education.enrolled=true;s.education.progress=6;s.education.pending={sceneId:'exam',route:'community'};s.event={id:'school_exam',choices:[{id:'present'}]};
  const expected=structuredClone(s),oldTeacher=educationTeacher(s);initializeFamilyDepth(s);assert.equal(s.education.depthVersion,undefined);assert.equal(s.education.nextDepthVersion,1);assert.deepEqual(educationTeacher(s),oldTeacher);
  expected.event=null;s.event=null;applyHouseholdChoice(expected,'school_exam','present',context(expected));applyHouseholdChoice(s,'school_exam','present',ctx);
  assert.deepEqual(s.hero.skills,expected.hero.skills);assert.deepEqual(s.education.qualifications,expected.education.qualifications);assert.deepEqual(s.conversations.relationships,expected.conversations.relationships);
  onHouseholdAge(s,ctx);assert.equal(s.education.depthVersion,1);assert.equal(validateEducation(s.education,s),true);
});

test('six, twelve and sixteen year old adoptees preserve identities, prior learning and actual birth dates',()=>{
  for(const age of [6,12,16]){
    let s,c,ctx;
    for(let attempt=0;attempt<20;attempt++){s=fixture(`adoption-age-${age}-${attempt}`);ctx=context(s);c=meet(s,age,ctx);if(c.consent)break;}
    assert.equal(c.consent,true);assert.ok(c.development.skills.scholarship>0);assert.equal(s.life.children.length,0);
    const before=s.hero.gold,day=s.day,identity=structuredClone(c);pick(s,'offer',ctx);
    assert.equal(s.day,day+3);assert.equal(s.hero.gold,before-30);assert.equal(s.life.children.length,1);
    const child=s.life.children[0],record=s.lineage.people.find(r=>r.source==='child'&&r.localId===child.id);
    assert.equal(child.age,age);assert.equal(child.bornDay,identity.bornDay);assert.equal(child.name,identity.name);assert.deepEqual(record.appearance,identity.appearance);assert.deepEqual(record.preferences,identity.preferences);assert.deepEqual(record.development.skills,identity.development.skills);assert.equal(record.adopted,true);assert.equal(validateLineage(s.lineage,s),true);
  }
});

test('a child refusing a home can receive actual support without being adopted or assigned parents',()=>{
  let s,c,ctx;for(let i=0;i<30;i++){s=fixture(`adoption-refusal-${i}`);ctx=context(s);c=meet(s,16,ctx);if(!c.consent)break;}
  assert.equal(c.consent,false);assert.ok(!s.event.choices.some(c=>c.id==='offer'));
  const original=structuredClone(s),before=s.hero.gold,skills=c.development.skills.scholarship;
  s.event=null;assert.equal(applyLineageChoice(s,'lineage_adoption','offer',ctx),false);assert.equal(s.life.children.length,0);s=original;ctx=context(s);c=s.lineage.adoption.candidates.at(-1);
  pick(s,'support',ctx);assert.equal(s.hero.gold,before-10);assert.equal(c.development.skills.scholarship,skills+1);assert.equal(s.life.children.length,0);assert.equal(s.lineage.people.filter(p=>p.source==='child').length,0);
});

test('partial home preparation spends only actual time, charges once on completion, and can be cancelled',()=>{
  let s,c,ctx;for(let i=0;i<20;i++){s=fixture(`partial-adoption-${i}`);ctx=context(s);c=meet(s,12,ctx);if(c.consent)break;}
  const gold=s.hero.gold,day=s.day;pick(s,'offer',context(s,1));assert.equal(s.day,day+1);assert.equal(s.hero.gold,gold);assert.equal(s.life.children.length,0);assert.equal(s.lineage.adoption.preparation.progress,1);assert.equal(validateLineage(s.lineage,s),true);
  const cancelled=structuredClone(s);act(cancelled,'lineage_adoption_cancel',context(cancelled));assert.equal(cancelled.hero.gold,gold);assert.equal(cancelled.life.children.length,0);assert.equal(cancelled.lineage.adoption.preparation,null);
  act(s,'lineage_adoption_continue',ctx);assert.equal(s.day,day+3);assert.equal(s.hero.gold,gold-30);assert.equal(s.life.children.length,1);assert.equal(s.lineage.adoption.preparation,null);
});

test('an older child’s personal school project grows their own interests without awarding parent skills or certificates',()=>{
  let s,c,ctx;for(let i=0;i<20;i++){s=fixture(`project-adoption-${i}`);ctx=context(s);c=meet(s,12,ctx);if(c.consent)break;}pick(s,'offer',ctx);
  const child=s.life.children[0],p=s.lineage.people.find(p=>p.source==='child'),before=structuredClone(s.hero.skills),quals=structuredClone(p.development.education.qualifications);
  ctx.spendDays(4);act(s,`lineage_project_${child.id}`,ctx);assert.match(s.event.body,/before joining/);pick(s,'own',ctx);
  assert.deepEqual(s.hero.skills,before);assert.deepEqual(p.development.education.qualifications,quals);assert.match(p.development.history.at(-1).text,/own interest/);assert.equal(validateLineage(s.lineage,s),true);
});

test('an older child’s adoption does not invent an existing partner’s agreement to become a second parent',()=>{
  let s,c,ctx;for(let i=0;i<20;i++){s=fixture(`coparent-adoption-${i}`);ctx=context(s);const partner=s.life.people.find(p=>p.id==='river');partner.age=32;partner.bond=90;s.life.partnerId=partner.id;c=meet(s,12,ctx);if(c.consent)break;}
  pick(s,'offer',ctx);const child=s.lineage.people.find(p=>p.source==='child');assert.deepEqual(child.parentIds,[s.dynasty.activePersonId]);assert.equal(s.life.partnerId,'river');assert.equal(validateLineage(s.lineage,s),true);
});

test('support respects a young person’s learning schedule rather than allowing repeated immediate tuition',()=>{
  let s,c,ctx;for(let i=0;i<30;i++){s=fixture(`support-schedule-${i}`);ctx=context(s);c=meet(s,16,ctx);if(!c.consent)break;}
  pick(s,'support',ctx);const gold=s.hero.gold,learning=c.development.skills.scholarship;
  act(s,'lineage_adoption_16',ctx);assert.ok(!s.event.choices.some(c=>c.id==='support'));const event=s.event;s.event=null;assert.equal(applyLineageChoice(s,'lineage_adoption','support',ctx),false);assert.equal(s.hero.gold,gold);assert.equal(c.development.skills.scholarship,learning);s.event=event;
});
