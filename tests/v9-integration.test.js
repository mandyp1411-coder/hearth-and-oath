import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LifeRun,ordinaryChoice,engine} from '../scripts/playtest-utils.mjs';

const policy=(event,s)=>(event.id==='health_concern'?(s.health.pending?.kind==='physical'?'rest':'support'):null)||ordinaryChoice(event)||event.choices.find(c=>!c.disabledReason)?.id;
const birth=id=>new LifeRun(id,{seed:id,name:'Ari Lowfire',household:'tradesfolk',familySetup:'two_parents'},policy);

test('a public life pauses supper at its birthday, saves the same decision and completes only the remaining day',()=>{
  const run=birth('v9-integrated-pastime-birthday').grow(18).settle();
  const target=run.state.timeline.birthDay+19*365-1;
  for(let i=0;run.state.day<target&&i<150;i++){
    const remaining=target-run.state.day;
    const row=['career_work','health_rest','leisure_read','grow_family'].map(id=>engine.getActions(run.state).find(a=>a.id===id&&!a.disabledReason&&a.days>0&&a.days<=remaining)).find(Boolean);
    assert.ok(row,'lawful activities reach the day before the birthday');run.act(row.id).settle();
  }
  assert.equal(run.state.day,target);assert.equal(run.state.age,18);
  run.act('pastime_dinner');const promised=structuredClone(run.state.event),before=structuredClone(run.state);
  assert.equal(promised.id,'pastime_scene');run.choose('listen');
  const paused=run.state,personId=paused.pastimes.project.actorIds[0];
  assert.equal(paused.day,before.day+1);assert.equal(paused.age,19);assert.equal(paused.event.id,'birth_adult_year');
  assert.equal(paused.pastimes.project.completedDays,1);assert.equal(paused.pastimes.project.remainingDays,1);assert.equal(paused.pastimes.project.paidCost,5);
  assert.equal(before.hero.gold-paused.hero.gold,5+paused.householdBudget.paidGold-before.householdBudget.paidGold,'only the reserved supper and actual household costs are paid');
  assert.equal(paused.life.people.find(p=>p.id===personId).bond,before.life.people.find(p=>p.id===personId).bond,'the unfinished meal has not awarded its bond');
  assert.ok(!paused.pastimes.callbacks.some(c=>c.kind==='supper'));
  assert.deepEqual(engine.getLifeCommitment(paused),{kind:'pastime',title:paused.pastimes.project.title,locationId:paused.locationId,totalDays:2,completedDays:1,remainingDays:1});
  const imported=engine.migrateSave(JSON.parse(JSON.stringify(paused)));assert.deepEqual(imported,paused,'an interrupted current-version save imports exactly');
  run.step('import-paused-afternoon',()=>imported).settle();
  const answered=structuredClone(run.state);assert.deepEqual(answered.pastimes.project,paused.pastimes.project);
  const ageAttempt=engine.ageUp(answered),travelAttempt=engine.travelTo(answered,'city');
  for(const blocked of [ageAttempt,travelAttempt]){assert.equal(blocked.day,answered.day);assert.deepEqual(blocked.pastimes,answered.pastimes);assert.ok(engine.validateSave(blocked));}
  assert.deepEqual(engine.getActions(answered).map(a=>a.id).sort(),['pastime_abandon','pastime_continue']);
  run.act('pastime_continue');const finished=run.state;
  assert.equal(finished.day,before.day+2);assert.equal(finished.pastimes.project,null);assert.equal(engine.getLifeCommitment(finished),null);
  assert.equal(finished.life.people.find(p=>p.id===personId).bond,answered.life.people.find(p=>p.id===personId).bond+6);
  assert.equal(answered.hero.gold-finished.hero.gold,finished.householdBudget.paidGold-answered.householdBudget.paidGold,'continuation does not charge the supper twice');
  assert.equal(finished.pastimes.callbacks.filter(c=>c.kind==='supper').length,1);assert.equal(finished.pastimes.uses['18:dinner'],1);
});

test('genuine older pending scenes and conversations import with prospective additions and exact existing promises',()=>{
  const fixture=JSON.parse(readFileSync(new URL('./fixtures/legacy-v4.json',import.meta.url),'utf8'));
  for(const key of ['birth0','schoolPending','pendingConversation','pendingRoad','pendingProject']){
    const old=fixture.states[key],before=structuredClone(old),imported=engine.migrateSave(old);
    assert.ok(imported&&engine.validateSave(imported),key);assert.deepEqual(old,before,'migration preserves its input');
    for(const field of ['day','age','battle','world','equipment','factions','legal','obligations'])assertCapturedMigration(old[field],imported[field],`${key}: ${field}`);assertCapturedMigration(old.event,imported.event,'state.event');
    assert.deepEqual(imported.conversations?.pending,old.conversations?.pending,`${key}: pending conversation`);
    assert.deepEqual(imported.conversations?.messages,old.conversations?.messages,`${key}: saved messages`);
    assert.equal(imported.hero.gold,old.hero.gold);assert.equal(imported.social.startedDay,old.day);assert.equal(imported.pastimes.startedDay,old.day);
    assert.deepEqual(imported.social.history,[]);assert.deepEqual(imported.pastimes.history,[]);assert.equal(imported.pastimes.pet,null);
    assert.ok(imported.social.edges.every(e=>!e.known&&e.memories.length===0));
    if(old.age>=3&&old.event?.id.startsWith('birth_'))assert.equal(imported.timeline.nextContentVersion,7,'an older birthday finishes its actual old choice before new writing begins');
    assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(imported))),imported);
  }
});

test('public new scenes require their own optional state while genuine older saves remain loadable',()=>{
  const run=birth('v9-pending-owner-guards').grow(18).settle();
  run.act('pastime_interest');const missingPastime=structuredClone(run.state);delete missingPastime.pastimes;assert.equal(engine.validateSave(missingPastime),false);
  run.choose('music');const row=engine.getActions(run.state).find(a=>a.id.startsWith('social_')&&!a.disabledReason);assert.ok(row);run.act(row.id);
  const missingSocial=structuredClone(run.state);delete missingSocial.social;assert.equal(engine.validateSave(missingSocial),false);
  assert.ok(engine.validateSave(run.state));
});

test('an actual adopted child inherits the living pet and world, then develops a new childhood without renewing the animal',()=>{
  const run=birth('v9-actual-pet-heir').grow(30).settle();run.act('life_home_cottage').settle();
  for(let i=0;run.state.life.health<60&&i<20;i++)run.act(run.available('health_clinic')?'health_clinic':'health_rest').settle();
  run.act('pastime_interest').choose('music');run.act('pastime_practice').choose('solo').settle();run.act('pastime_practice').choose('solo').settle();
  assert.equal(run.state.pastimes.interests.music.level,1);
  run.act('pastime_pet').choose('hound').settle();const originalPet=structuredClone(run.state.pastimes.pet);
  run.act('lineage_adoption_6').choose('listen');assert.ok(run.state.event.choices.some(c=>c.id==='offer'),'the actual named child consents to this household');run.choose('offer').settle();
  const gathering=engine.getActions(run.state).find(a=>a.id.startsWith('social_')&&!a.disabledReason);assert.ok(gathering);run.act(gathering.id).settle();
  const child=structuredClone(run.state.life.children.at(-1));run.act('retire').choose('settle');const parent=structuredClone(run.state);
  const formerPeer=parent.life.people.find(p=>p.id==='fellow'),formerNode=parent.social.nodes.find(n=>n.source==='life'&&n.sourceId==='fellow'),formerTies=parent.social.edges.filter(e=>e.aId===formerNode.id||e.bId===formerNode.id).map(e=>e.id);
  assert.ok(formerPeer&&formerNode&&formerTies.length,'the real parent has a remembered friend connected to other people');
  run.step('continue-as-actual-child',s=>engine.continueAsChild(s,child.id));
  const successor=run.state;assert.equal(successor.day,parent.day);assert.equal(successor.age,6);assert.equal(successor.hero.name,child.name);assert.equal(successor.timeline.birthDay,child.bornDay);
  assert.equal(successor.timeline.storybook,undefined,'a generated newborn prologue is not carried into an already-six-year-old child');assert.equal(successor.hero.path,'unformed');
  assert.deepEqual(successor.world,parent.world);assert.deepEqual(successor.pastimes.interests,{});assert.deepEqual(successor.pastimes.history,[]);
  for(const field of ['id','name','bornDay','deathDay','introducedDay'])assert.equal(successor.pastimes.pet[field],originalPet[field],field);
  assert.equal(successor.pastimes.pet.caregiverId,'kin');assert.equal(successor.social.ownerId,`birth-${child.bornDay}`);assert.ok(successor.social.edges.every(e=>!e.known));
  assert.deepEqual(successor.social.history,[]);assert.deepEqual(successor.social.callbacks,[]);
  run.grow(7);assert.ok(run.state.timeline.storybook,'the next actual birthday begins the child’s own seeded history');
  run.grow(18);
  assert.equal(run.state.pastimes.pet,null,'the original finite lifespan is respected');assert.equal(run.state.pastimes.petHistory.filter(p=>p.id===originalPet.id).length,1);assert.equal(run.state.pastimes.petHistory.find(p=>p.id===originalPet.id).endedDay,originalPet.deathDay);
  const identities=run.state.social.nodes.map(p=>`${p.name}:${p.bornDay}`);assert.equal(new Set(identities).size,identities.length,'a former family friend changing contact source retains one actual social identity');
  const returned=run.state.social.nodes.find(n=>n.id===formerNode.id);assert.ok(returned?.alive);assert.equal(returned.name,formerPeer.name);assert.equal(returned.bornDay,formerNode.bornDay);assert.equal(returned.source,'society','the same person has become the heir’s household neighbor');
  assert.ok(formerTies.every(id=>run.state.social.edges.some(e=>e.id===id)),'their existing NPC-to-NPC ties retain their graph identities');
});
