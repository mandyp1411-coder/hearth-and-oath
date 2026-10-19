import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LifeRun, engine, ordinaryChoice } from './playtest-utils.mjs';
import { compatibilityView } from '../dist/js/family-depth.js';
import { adoptionView, lineageView } from '../dist/js/lineage.js';

const policy = (e,s) => (e.id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):null) || ordinaryChoice(e) || (e.id === 'calling_offer' ? 'defer' : e.id === 'vampire_offer' || e.id === 'lycan_offer' ? 'decline' : e.choices.find(c=>c.id==='respect')?.id || e.choices.find(c=>c.id==='listen')?.id || e.choices.find(c=>c.id==='help')?.id || e.choices[0]?.id);
const results=[];
const profiles=[
  {id:'V8F01',seed:'v8-family-a-listened-hearth',route:'community',schoolAge:6,adoptAge:6,profession:'blacksmith',familySetup:'homeless'},
  {id:'V8F02',seed:'v8-family-another-name',route:'academy',schoolAge:12,adoptAge:12,profession:'scholar',familySetup:'orphan'},
  {id:'V8F04',seed:'v8-family-a-place-for-questions',route:'shrine',schoolAge:6,adoptAge:12,profession:'farmer',familySetup:'two_parents'},
  {id:'V8F03',seed:'v8-family-own-future',route:'apprenticeship',schoolAge:12,adoptAge:16,profession:'healer',familySetup:'single_parent'},
];
for(const p of profiles) {
  const run=new LifeRun(p.id,{name:p.id+' Hearth',seed:p.seed,familySetup:p.familySetup,household:'poor',birthplace:'village',preferences:{pursuit:p.route==='apprenticeship'?'craft':'knowledge',value:'freedom'}},policy);
  run.grow(p.schoolAge);
  if(p.route==='academy') {
    run.act('school_scholarship').choose('service');
    run.act('school_service').settle();
  }
  run.act(`school_enroll_${p.route}`).settle();
  if(p.schoolAge>=12)run.act('school_path').choose(p.route==='academy'?'inquiry':'practical');
  run.act('school_attend').settle();run.act('school_attend').settle();
  const projects=engine.getActions(run.state).filter(a=>a.id.startsWith('school_project_')&&!a.disabledReason);
  assert.equal(projects.length,2,'each route offers two distinct supervised projects');
  run.act(projects[0].id).choose('care');run.act(projects[1].id).choose('research');
  assert.equal(run.state.education.projects.length,2);
  assert.ok(run.state.education.progress>=6);
  run.grow(p.route==='community'?10:14);
  if(p.route==='academy')run.move('city');
  run.act('school_exam').choose('present');
  assert.ok(run.state.education.qualifications.some(q=>q.route===p.route));
  run.grow(18).act(`career_choose_${p.profession}`).settle();
  run.grow(30);
  if(!run.available('life_home_cottage'))throw new Error('real working-year savings must afford a cottage');
  run.act('life_home_cottage').settle();
  const peer=run.state.life.people.find(p=>p.role==='friend'&&p.alive!==false&&p.locationId===run.state.locationId);
  if(peer){run.act(`life_values_${peer.id}`).choose('share');assert.equal(compatibilityView(run.state,peer.id).known.length,4);}
  for(let care=0;run.state.life.health<60&&care<20;care++)run.act(run.available('health_clinic')?'health_clinic':'health_rest').settle();
  const beforeMeeting=run.state.hero.gold;
  run.act(`lineage_adoption_${p.adoptAge}`);
  assert.equal(run.state.event?.id,'lineage_adoption');
  assert.equal(run.state.life.children.length,0);
  run.choose('listen');
  const candidate=adoptionView(run.state).candidates.at(-1);
  assert.equal(candidate.age,p.adoptAge);
  if(candidate.consent) {
    const feeBefore=run.state.hero.gold;
    run.choose('offer').settle();
    const child=run.state.life.children.at(-1), record=run.state.lineage.people.find(r=>r.source==='child'&&r.localId===child.id);
    assert.equal(child.name,candidate.name);assert.equal(child.age,p.adoptAge);assert.deepEqual(record.appearance,candidate.appearance);
    assert.equal(feeBefore-run.state.hero.gold,30);
    const parentSkills=structuredClone(run.state.hero.skills);
    if(record.development.education.attendance<2)run.act(`lineage_lesson_${child.id}`).settle();
    run.act(`lineage_project_${child.id}`).choose('own');
    assert.deepEqual(run.state.hero.skills,parentSkills,'support develops the actual child, not the parent');
    const heir=structuredClone(lineageView(run.state).children.find(c=>c.id===child.id));
    run.act('retire').choose('settle');
    const closed=run.save('artifacts/playtest/v8-family');
    run.step('continue-as-actual-older-child',s=>engine.continueAsChild(s,child.id));
    assert.equal(run.state.day,closed.day);assert.equal(run.state.hero.name,candidate.name);assert.equal(run.state.timeline.birthDay,child.bornDay);
    assert.deepEqual(run.state.hero.skills,heir.development.skills);assert.deepEqual(run.state.hero.preferences,heir.preferences);
    assert.ok(engine.validateSave(run.state));
    results.push({...closed,familyOutcome:'consented-older-child',childAtArrival:p.adoptAge,successorAge:run.state.age,successorHash:run.summary().finalHash,projects:run.state.education.projects});
    run.save('artifacts/playtest/v8-family/successors');
  } else {
    assert.ok(!run.state.event.choices.some(c=>c.id==='offer'),'a refusal has no coercive offer');
    run.choose('support').settle();assert.equal(run.state.life.children.length,0);
    run.act('retire').choose('settle');
    results.push({...run.save('artifacts/playtest/v8-family'),familyOutcome:'refusal-respected-with-learning-support',metAge:p.adoptAge});
  }
  assert.ok(beforeMeeting>=30);
}
mkdirSync('docs/playtest/v8',{recursive:true});
writeFileSync('docs/playtest/v8/family.json',JSON.stringify({method:'Four distinct public-API lives, no grants or state edits. Each starts at age zero and ends in actual retirement, with actual older-child succession where the child consents.',lives:results},null,2)+'\n');
console.log(JSON.stringify({lives:results.length,operations:results.reduce((n,r)=>n+r.operations,0),outcomes:results.map(r=>({id:r.id,outcome:r.familyOutcome,successorAge:r.successorAge}))}));
