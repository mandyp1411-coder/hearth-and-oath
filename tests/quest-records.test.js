import {atService} from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { isSettlement } from '../dist/js/world.js';
import { syncCartography } from '../dist/js/cartography.js';
import { storyInvitations, storyView } from '../dist/js/life-stories.js';
import { refreshAdventureBoard, contractArchive, afterAdventureBattle } from '../dist/js/adventuring.js';
import { renderQuestJournal } from '../dist/js/quest-journal.js';
import { trackedQuest, questReturnForecast, questAccountReview } from '../dist/js/quest-records.js';
import { mountApp } from './helpers/ui-surface.mjs';

function settle(state){
  for(let n=0;n<100;n++){
    if(state.event)state=E.chooseEventOption(state,state.event.choices.find(c=>!c.disabledReason&&['care','continue','later','keep'].includes(c.id))?.id||state.event.choices.find(c=>!c.disabledReason).id);
    else if(state.conversations?.pending)state=E.replyMessage(state,state.conversations.pending.personId,state.conversations.pending.replies[0].id);
    else if(state.stories?.project)state=E.chooseAction(state,'stories_continue');
    else if(state.timeline?.yearTarget!==null)state=E.continueAgeUp(state);
    else {assert.ok(E.validateSave(state));return state;}
    assert.ok(E.validateSave(state));
  }
  throw Error('Fixture did not settle through its public decisions');
}
const base=settle(await createLifeAtAge({seed:'quest-focus-regressions',startAge:30,difficulty:'gentle'}));
function fresh(){
  const state=structuredClone(base);state.hero.gold=10000;
  // Controlled location/affordability fixtures, not counted lives or travel QA.
  state.locationId=state.world.locations.find(p=>isSettlement(state.world,p.id)).id;
  state.cartography.interior=null;state.cartography.offsite=false;syncCartography(state);refreshAdventureBoard(state);assert.ok(E.validateSave(state));return E.migrateSave(state);
}
function contractAction(state,id){return E.chooseAction(atService(state,id),id);}
const roundtrip=state=>{assert.ok(E.validateSave(state));const restored=E.migrateSave(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored,state);return restored;};
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${e(op)}" data-id="${e(id)}" ${disabled?'disabled':''}>${label}</button>`,actionCards:()=>'',livingCosts:days=>days?`<small>Living costs for ${days} days</small>`:''};
const journal=(s,options)=>renderQuestJournal(s,E.getActions(s),ui,options);
function beginStory(state,id=storyInvitations(state).find(a=>a.status==='offered').id){
  state=E.chooseAction(state,'stories_open_'+id);assert.equal(state.event.id,'stories_chapter');
  state=settle(E.chooseEventOption(state,'enterprise'));return state;
}

test('all personal invitations have a named participant, location and stakes; browsing remains read-only',()=>{
  const state=fresh(),before=structuredClone(state),offers=storyInvitations(state);assert.ok(offers.length>=3);
  for(const offer of offers){assert.ok(offer.personName&&offer.locationName&&offer.premise);}
  const preview=journal(state,{category:'side'}),all=journal(state,{category:'side',invitations:'all'});
  assert.ok(!preview.includes(`data-invitation="${offers[2].id}"`));
  assert.ok(all.includes(`data-invitation="${offers[2].id}"`));assert.ok(all.includes(e(offers[2].personName)));
  assert.deepEqual(state,before);
});

test('declining or reconsidering the third invitation never accepts the first two or spends time, gold or learning',()=>{
  let state=fresh();const offers=storyInvitations(state),before=structuredClone(state);
  state=E.chooseAction(state,'stories_decline_'+offers[2].id);
  assert.equal(state.stories.arcs.length,0);assert.equal(state.stories.invitations[offers[2].id].status,'declined');
  assert.equal(state.day,before.day);assert.equal(state.hero.gold,before.hero.gold);assert.deepEqual(state.hero.skills,before.hero.skills);
  assert.deepEqual(state.campaign,before.campaign);roundtrip(state);
  state=E.chooseAction(state,'stories_reconsider_'+offers[2].id);assert.equal(state.stories.invitations[offers[2].id].status,'offered');
  assert.equal(state.stories.arcs.length,0);roundtrip(state);
});

test('production journal handlers browse all offers and decline the third without starting an arc',async t=>{
  const state=fresh(),offers=storyInvitations(state),surface=await mountApp(t,{states:[state]});
  await surface.click('title-continue');const before=surface.current();
  await surface.click('menu','header');await surface.click('tab','journal');await surface.click('journal-category','side');
  assert.ok(surface.root.querySelector(`[data-invitation="${offers[2].id}"]`),'current paginated offers include this proposal');
  assert.deepEqual(surface.current(),before,'changing the browse view is not acceptance');
  await surface.click('activity','stories_decline_'+offers[2].id);
  assert.equal(surface.current().stories.arcs.length,0);assert.equal(surface.current().stories.invitations[offers[2].id].status,'declined');
  assert.equal(surface.current().day,before.day);assert.equal(surface.current().hero.gold,before.hero.gold);
});

test('completed short stories open every saved choice, fee, workday and outcome without recomputing them',()=>{
  let state=fresh();const id=storyInvitations(state)[0].id;
  for(let chapter=0;chapter<3;chapter++){
    if(chapter)for(let guard=0;state.age<state.stories.arcs.find(a=>a.id===id).nextAge;guard++){assert.ok(guard<80&&state.phase!=='retired',`alive to the next chapter (age ${state.age}, ${state.health?.deathCause||'alive'})`);state=settle(E.ageUp(state));}
    state=beginStory(state,id);roundtrip(state);
  }
  const arc=state.stories.arcs.find(a=>a.id===id);assert.equal(arc.status,'completed');assert.equal(arc.choices.length,3);
  const before=structuredClone(state),html=journal(state,{category:'archive'});
  assert.equal((html.match(/data-story-decision=/g)||[]).length,3);
  for(const choice of arc.choices){assert.ok(html.includes(e(choice.label)));assert.ok(html.includes(e(choice.outcome)));assert.ok(html.includes(`${choice.cost} gold fee`));}
  assert.deepEqual(state,before);
});

test('legacy five-chapter records keep all five decisions across import and the readable archive',()=>{
  let state=beginStory(fresh()),arc=state.stories.arcs[0];
  // An explicit old-format save fixture, not a newly lengthened story.
  arc.contentVersion=3;arc.chapter=5;arc.status='completed';arc.outcome='enterprise';
  arc.choices=Array.from({length:5},(_,i)=>({...arc.choices[0],days:4,cost:0,reward:24+i*18,label:`Saved legacy decision ${i+1}`,outcome:`Saved legacy consequence ${i+1}`}));
  for(const choice of arc.choices)delete choice.terms;
  state=roundtrip(state);const html=journal(state,{category:'archive'});
  assert.equal(storyView(state).arcs[0].totalChapters,5);assert.equal((html.match(/data-story-decision=/g)||[]).length,5);
  assert.ok(html.includes('Saved legacy consequence 5'));
});

test('one optional tracker supports main, side, personal and radiant quests without accepting unrelated work',()=>{
  let state=fresh(),day=state.day,gold=state.hero.gold;
  assert.equal(state.questLog.tracked,null);
  state=E.chooseAction(state,'journal_main_accept');state=E.chooseAction(state,'journal_track_main');assert.equal(trackedQuest(state).key,'main');
  state=E.chooseAction(state,'journal_main_pause');assert.equal(state.questLog.tracked,null);
  state=E.chooseAction(state,'journal_main_accept');state=E.chooseAction(state,'journal_clear_track');assert.equal(trackedQuest(state),null);
  assert.equal(state.day,day);assert.equal(state.hero.gold,gold);
  state.campaign.act=3;state.campaign.stage='refugees';state.locationId='coast';syncCartography(state);
  state=E.chooseAction(state,'journal_accept_side_ferry');state=E.chooseAction(state,'journal_track_side_ferry');assert.equal(state.questLog.tracked,'side_ferry');
  state=E.chooseAction(state,'journal_pause_side_ferry');assert.equal(state.questLog.tracked,null);roundtrip(state);
  state=fresh();state=beginStory(state);const arc=state.stories.arcs[0],choices=structuredClone(arc.choices),nextAge=arc.nextAge;
  state=E.chooseAction(state,'journal_track_story:'+arc.id);assert.equal(trackedQuest(state).key,'story:'+arc.id);
  state=E.chooseAction(state,'journal_pause_story:'+arc.id);assert.equal(state.questLog.tracked,null);assert.equal(state.stories.arcs[0].paused,true);
  state=E.chooseAction(state,'journal_resume_story:'+arc.id);assert.equal(state.stories.arcs[0].paused,undefined);
  assert.deepEqual(state.stories.arcs[0].choices,choices);assert.equal(state.stories.arcs[0].nextAge,nextAge);roundtrip(state);
  state=fresh();const offer=E.getActions(state).find(a=>a.id.startsWith('adventure_accept_'));assert.ok(offer);
  state=contractAction(state,offer.id);const id=offer.id.slice('adventure_accept_'.length);
  state=E.chooseAction(state,'journal_track_radiant:'+id);assert.equal(trackedQuest(state).key,'radiant:'+id);
  const snapshot=structuredClone(state.adventuring.contracts.find(c=>c.id===id));
  state=E.chooseAction(state,'journal_pause_radiant:'+id);assert.equal(state.questLog.tracked,null);
  state=E.chooseAction(state,'journal_resume_radiant:'+id);assert.deepEqual(state.adventuring.contracts.find(c=>c.id===id),snapshot);
  assert.equal(state.stories.arcs.length,0);roundtrip(state);
});

test('a paused personal chapter cannot advance or discard its retained return date and decision',()=>{
  let state=beginStory(fresh()),arc=state.stories.arcs[0];
  for(let guard=0;state.age<arc.nextAge;guard++){assert.ok(guard<80&&state.phase!=='retired',`alive to the next chapter (age ${state.age}, ${state.health?.deathCause||'alive'})`);state=settle(E.ageUp(state));arc=state.stories.arcs[0];}
  state=E.chooseAction(state,'journal_pause_story:'+arc.id);const before=structuredClone(state);
  assert.ok(!E.getActions(state).some(a=>a.id==='stories_open_'+arc.id));
  state=E.chooseAction(state,'stories_open_'+arc.id);assert.equal(state.event,null);assert.deepEqual(state.stories,before.stories);roundtrip(state);
});

test('an unfinished paid chapter cannot be paused as a shortcut around its attendance or fee',()=>{
  let state=fresh();const id=storyInvitations(state)[0].id;
  state=E.chooseAction(state,'stories_open_'+id);
  assert.equal(questReturnForecast(state).length,0,'the opening is not a returning chapter');
  // Controlled birthday boundary: the real fee and two attended days are
  // followed by a saved birthday; four of the six agreed days still remain.
  state.day=(state.timeline.birthDay||0)+(state.age+1)*365-2;
  assert.ok(E.validateSave(state));state=E.chooseEventOption(state,'care');
  assert.ok(state.stories.project?.paid);assert.equal(state.stories.project.remainingDays,4);
  state=E.chooseEventOption(state,'care');assert.equal(state.event,null);
  const before=structuredClone(state);
  state=E.chooseAction(state,'journal_pause_story:'+id);assert.deepEqual(state.stories,before.stories);
  assert.equal(state.day,before.day);assert.equal(state.hero.gold,before.hero.gold);
  roundtrip(state);
});

test('return chapters appear at the next real birthday with the last choice and no automatic interruption',async t=>{
  let state=beginStory(fresh()),arc=state.stories.arcs[0],before=structuredClone(state),rows=questReturnForecast(state);
  assert.equal(rows[0].dueDay,(state.timeline.birthDay||0)+arc.nextAge*365);assert.equal(rows[0].lastChoice,arc.choices[0].label);
  assert.deepEqual(state,before);
  const surface=await mountApp(t,{states:[state]});await surface.click('title-continue');
  assert.match(surface.root.innerHTML,/chosen story returns by this birthday/);
  await surface.click('workspace-section','life:plans');assert.ok(surface.root.querySelector('[data-quest-return-forecast]'));assert.deepEqual(surface.current(),state,'reviewing the calendar accepts or interrupts nothing');
  assert.ok(surface.root.innerHTML.includes(e(arc.choices[0].label)));assert.equal(surface.current().event,null);
  const shifted=structuredClone(state);shifted.timeline.birthDay=200;shifted.day+=200;
  assert.equal(questReturnForecast(shifted)[0].dueDay,200+arc.nextAge*365,'forecast respects an heir birth offset');
});

test('a patient objective quotes its existing two days and living costs before Continue',()=>{
  const state=fresh();state.campaign.act=1;state.campaign.stage='patients';state.campaign.completed=['well'];state.questLog.main='active';state.campaign.facts.declined=false;state.locationId='home';syncCartography(state);
  const before=structuredClone(state),html=journal(state,{category:'main'});
  assert.ok(html.includes('data-quest-cost="quest_begin_patients"'));assert.ok(html.includes('2 committed days'));
  assert.ok(html.includes('Living costs for 2 days'));assert.ok(html.includes('Road travel and later choices are quoted separately'));
  assert.deepEqual(state,before);
});

test('earned radiant proof, one payment and the dated receipt survive seasonal refresh and export/reload',()=>{
  let state=fresh(),candidate;
  for(const place of state.world.locations.filter(p=>isSettlement(state.world,p.id))){
    state.locationId=place.id;syncCartography(state);refreshAdventureBoard(state);
    candidate=state.adventuring.contracts.find(c=>c.status==='offered'&&(c.type==='escort'||c.type==='relic'||c.targetType==='bandit'));if(candidate)break;
  }
  assert.ok(candidate);const id=candidate.id,board=candidate.boardId;
  for(const key of Object.keys(state.hero.skills))state.hero.skills[key]=30;
  state=contractAction(state,'adventure_accept_'+id);state.locationId=candidate.destinationId;syncCartography(state);
  for(let n=0;n<8&&state.adventuring.contracts.find(c=>c.id===id).status!=='ready';n++)state=settle(E.chooseAction(state,'adventure_resolve_'+id));
  assert.equal(state.adventuring.contracts.find(c=>c.id===id).status,'ready');
  state.locationId=board;syncCartography(state);const gold=state.hero.gold;
  state=contractAction(state,'adventure_claim_'+id);const record=contractArchive(state).find(c=>c.id===id);assert.ok(record);
  assert.equal(record.result,'completed');assert.ok(record.client&&record.objective&&record.proof);assert.equal(record.closedDay,state.day);
  assert.equal(state.hero.gold,gold+record.reward);const paid=state.hero.gold;
  state=contractAction(state,'adventure_claim_'+id);assert.equal(state.hero.gold,paid);
  refreshAdventureBoard(state);assert.ok(!state.adventuring.contracts.some(c=>c.id===id));assert.deepEqual(contractArchive(state).find(c=>c.id===id),record);
  state.day+=93;state.age=Math.floor((state.day-(state.timeline.birthDay||0))/365);refreshAdventureBoard(state);
  state=roundtrip(state);assert.deepEqual(contractArchive(state).find(c=>c.id===id),record);
  const html=journal(state,{category:'archive',archiveQuery:record.client});assert.ok(html.includes(`data-contract-record="${id}"`));
  state=contractAction(state,'adventure_accept_'+id);assert.ok(!state.adventuring.contracts.some(c=>c.id===id),'an archived ID cannot reappear as a fresh payable offer');
});

test('abandonment retains failed/withdrawn attempts without inventing completion proof or paying a reward',()=>{
  let state=fresh();const offer=E.getActions(state).find(a=>a.id.startsWith('adventure_accept_'));
  state=contractAction(state,offer.id);const id=offer.id.slice('adventure_accept_'.length),gold=state.hero.gold;
  // Isolated outcome-recording fixture; no invented successful playthrough.
  afterAdventureBattle(state,{instanceId:'failed-record-fixture',context:{kind:'adventure',mode:'contract',token:id}},{outcome:'defeat'},{journal(){}});
  state=E.chooseAction(state,'adventure_abandon_'+id);refreshAdventureBoard(state);const record=contractArchive(state).find(c=>c.id===id);
  assert.equal(record.result,'abandoned');assert.equal(record.proof,null);assert.equal(record.reward,0);assert.equal(record.attempts[0].outcome,'defeat');
  assert.equal(state.hero.gold,gold);roundtrip(state);assert.ok(journal(state,{category:'archive'}).includes('Failed combat attempt'));
});

test('malformed archive receipts and fabricated tracker IDs are rejected during import',()=>{
  let state=fresh();const offer=E.getActions(state).find(a=>a.id.startsWith('adventure_accept_'));
  state=contractAction(state,offer.id);state=E.chooseAction(state,'adventure_abandon_'+offer.id.slice('adventure_accept_'.length));roundtrip(state);
  const corrupt=structuredClone(state);corrupt.adventuring.archive[0].reward=NaN;assert.equal(E.migrateSave(corrupt),null);
  const duplicate=structuredClone(state);duplicate.adventuring.archive.push(structuredClone(duplicate.adventuring.archive[0]));assert.equal(E.migrateSave(duplicate),null);
  const track=structuredClone(state);track.questLog.tracked='story:never-accepted-or-known';assert.equal(E.migrateSave(track),null);
});

test('production archive search finds retained clients after refresh without changing any life slot',async t=>{
  let state=fresh();const offer=E.getActions(state).find(a=>a.id.startsWith('adventure_accept_'));
  state=contractAction(state,offer.id);state=E.chooseAction(state,'adventure_abandon_'+offer.id.slice('adventure_accept_'.length));refreshAdventureBoard(state);
  const record=contractArchive(state)[0],surface=await mountApp(t,{states:[state]});await surface.click('title-continue');
  await surface.click('menu','header');await surface.click('tab','journal');await surface.click('workspace-section','journal:archive');
  const before=surface.current(),slots=surface.lives();
  const form=query=>({id:'journal-search',controls:[{name:'query',value:query,disabled:false}]});
  await surface.fire('submit',form('no such archived client'));
  assert.equal(surface.root.querySelector(`[data-contract-record="${record.id}"]`),null);
  await surface.fire('submit',form(record.client));assert.ok(surface.root.querySelector(`[data-contract-record="${record.id}"]`));
  assert.deepEqual(surface.current(),before);assert.deepEqual(surface.lives(),slots);
  assert.equal(surface.document.activeElement.id,'journal-query');
});

test('older saved retirement and homecoming choices show the review without rewriting their pending words',async t=>{
  const state=E.chooseAction(fresh(),'retire'),oldBody='An older saved retirement invitation.';state.event.body=oldBody;
  const surface=await mountApp(t,{states:[state]});await surface.click('title-continue');
  assert.ok(surface.root.querySelector('[data-retirement-review]'));assert.match(surface.root.innerHTML,/Offers were not commitments/);
  assert.equal(surface.current().event.body,oldBody,'existing pending scenes keep their wording');
  const homecoming=structuredClone(state);homecoming.event={...homecoming.event,id:'homecoming_aftermath',body:'An older saved homecoming choice.',choices:[{id:'continue',label:'Continue',description:'Keep living.'},{id:'chronicle',label:'Close the chapter',description:'Retire.'}]};
  assert.ok(E.validateSave(homecoming));const other=await mountApp(t,{states:[homecoming]});await other.click('title-continue');
  assert.ok(other.root.querySelector('[data-retirement-review]'));assert.equal(other.current().event.body,homecoming.event.body);
});

test('retirement reviews accepted unfinished accounts and distinguishes paused, abandoned and never-accepted offers',()=>{
  let state=fresh();state=E.chooseAction(state,'journal_main_accept');state=beginStory(state);
  const arcId=state.stories.arcs[0].id;state=E.chooseAction(state,'journal_pause_story:'+arcId);
  const other=storyInvitations(state)[0];state=E.chooseAction(state,'stories_open_'+other.id);state=E.chooseEventOption(state,'leave');
  const invite=storyInvitations(state)[0];state=E.chooseAction(state,'stories_decline_'+invite.id);
  const contract=E.getActions(state).find(a=>a.id.startsWith('adventure_accept_'));state=contractAction(state,contract.id);
  const before=structuredClone(state),review=questAccountReview(state);assert.ok(review.counts.paused&&review.counts.abandoned&&review.counts.neverAccepted);
  state=E.chooseAction(state,'retire');assert.equal(state.event.id,'retirement');assert.match(state.event.body,/Accepted accounts still unfinished/);
  state=E.chooseEventOption(state,'continue');assert.equal(state.phase,'adult');assert.equal(state.questLog.closingReview,undefined);assert.deepEqual(state.stories,before.stories);
  state=E.chooseAction(state,'retire');state=E.chooseEventOption(state,'settle');assert.equal(state.phase,'retired');
  assert.equal(state.questLog.closingReview.decision,'leave_at_retirement');assert.equal(state.questLog.tracked,null);
  assert.equal(state.questLog.closingReview.counts.paused,review.counts.paused);assert.ok(state.questLog.closingReview.unfinished.some(r=>r.kind==='radiant'));
  assert.ok(state.chronicle.includes('You chose to leave'));roundtrip(state);
  assert.ok(journal(state,{category:'archive'}).includes('data-closing-quest-record'));
});
