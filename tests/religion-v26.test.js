import {atService} from './helpers/service-visit.mjs';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementServices,serviceWalkPath} from '../dist/js/world-services.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { FAITHS } from '../dist/js/realm-content-v18.js';
import { faithInquiryPlan,inquiryWitnessText,faithRitualText } from '../dist/js/faith-stories-v26.js';
import { applyCampaignAction,applyCampaignChoice,campaignView } from '../dist/js/campaign.js';
import { conditionConfidenceScene } from '../dist/js/story-presence-v26.js';
import { applyLifeChoice } from '../dist/js/life.js';
import { contractCurse,curseLawAt,curseView } from '../dist/js/curses.js';
import { realmActions,regionAt } from '../dist/js/realm.js';
import { realmPage } from '../dist/js/rpg-ui.js';
import { isSettlement } from '../dist/js/world.js';

function settle(s){for(let n=0;n<100&&s.event;n++)s=E.chooseEventOption(s,s.event.choices.find(c=>['continue','care','later'].includes(c.id))?.id||s.event.choices[0].id);return s;}
const baseline=settle(await createLifeAtAge({seed:'religion-v26-unit-base',startAge:18,difficulty:'gentle'}));
const fresh=()=>{let s=structuredClone(baseline);s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)).id;s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);s=E.migrateSave(s);const keeper=settlementServices(s).find(r=>r.kind==='keeper');assert.ok(keeper);for(const room of serviceWalkPath(s,keeper.roomId))s=E.chooseAction(s,'atlas_room_'+room);return E.visitService(s,keeper.id);};
function ctx(s){return {setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},journal:()=>{},standing:()=>{},remember:()=>{},witnesses:()=>s.companions.filter(p=>p.recruited&&p.active),finishObligation:()=>{},addObligation:()=>{},breakOath:()=>{},addEvidence:()=>{},spendDays:n=>{s.day+=n;return n;}};}

test('all eighteen new faith requests choose a matching physical setting across seeded maps without mutating knowledge',()=>{
  for(let n=0;n<30;n++){
    const s=E.createBirthGame({seed:'religion-settings-'+n}),before=JSON.stringify(s);
    for(const faith of FAITHS)for(let index=0;index<3;index++){
      const p=faithInquiryPlan(s,faith.id,index);assert.ok(p);assert.ok(!['destroyed','evacuated'].includes(p.destination.status));
      if(faith.id==='moon'&&index===0){assert.equal(p.setting,'coast');assert.equal(p.destination.type,'coast');}
      if(p.setting==='workshop')assert.ok(p.destination.services.includes('smith'));
      if(p.setting==='grove')assert.equal(p.destination.type,'forest');
      if(p.setting==='tower')assert.equal(p.destination.type,'tower');
      assert.ok(p.evidence.observation&&p.evidence.claim&&p.evidence.interpretation);
    }assert.equal(JSON.stringify(s),before);
  }
});
test('a legacy inland world gets a copied harbor account rather than invented seawater or new geography',()=>{
  const s=fresh();s.world.locations=s.world.locations.filter(p=>['home','city','forest','ruin','brook'].includes(p.id));
  for(const p of s.world.locations){p.status='thriving';p.servicesAvailable=true;}
  const before=JSON.stringify(s.world),p=faithInquiryPlan(s,'moon',0);
  assert.equal(p.archiveOnly,true);assert.equal(p.setting,'archive');assert.match(p.evidence.observation,/No personal visit/);assert.match(p.evidence.claim,/cannot establish a physical route/);assert.equal(JSON.stringify(s.world),before);
});
test('new inquiry snapshots preserve religion, premise and geometry through exact reload, with genuine older requests still accepted',()=>{
  let s=fresh();const joined=E.getActions(s).find(a=>a.id.startsWith('realm_join_')&&!a.disabledReason);s=E.chooseAction(s,joined.id);const membership=s.realm.faithId;
  s=E.chooseAction(s,'realm_petition');assert.equal(s.realm.petition.contentVersion,26);assert.equal(s.realm.faithId,membership);assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
  const old=structuredClone(s);old.realm.petition.contentVersion=25;for(const k of ['requestText','setting','archiveOnly','sceneContext'])delete old.realm.petition[k];assert.ok(E.validateSave(old));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(old))),old);
  const bad=structuredClone(s);bad.realm.petition.setting='invented_sea';assert.equal(E.validateSave(bad),false);
});
test('an absent or replaced inquiry witness leaves a signed source rather than a new living conversation',()=>{
  const s=fresh(),p={destinationId:s.locationId,witnessId:s.realm.sites[s.locationId].keeper.id,witnessName:s.realm.sites[s.locationId].keeper.name};assert.match(inquiryWitnessText(s,p),/confirms/);
  s.realm.sites[s.locationId].keeper.id+='-successor';assert.match(inquiryWitnessText(s,p),/not present for a new conversation/);
  s.world.locations.find(p=>p.id===s.locationId).status='destroyed';assert.match(inquiryWitnessText(s,p),/no fresh testimony/);
});
test('a personal rite abroad never turns a keeper of another religion into its priest or changes membership',()=>{
  let s=fresh();const local=regionAt(s).faithId,faith=FAITHS.find(f=>f.id!==(s.realm.sites[s.locationId].faithId||local));s.realm.faithId=faith.id; // Controlled membership fixture: no foreign keeper claims to enroll or officiate.
 const day=s.day;
  assert.notEqual(faithRitualText(s,faith),faith.ritualDescription);s=E.chooseAction(s,'realm_ritual');assert.equal(s.day,day+1);assert.equal(s.realm.faithId,faith.id);assert.ok(E.validateSave(s));
  assert.ok(realmActions(s).find(a=>a.id==='realm_ritual').disabledReason);const blocked=E.chooseAction(s,'realm_ritual');assert.equal(blocked.hero.gold,s.hero.gold);assert.equal(blocked.day,s.day);
});
test('late medical and religious quest openings cannot resurrect a parent or a deceased companion',()=>{
  const s=fresh();s.life.people.find(p=>p.id==='kin').alive=false;for(const p of s.companions)p.alive=false;
  s.locationId='home';s.campaign.pending=null;s.campaign.stage='patients';applyCampaignAction(s,'quest_begin_patients',ctx(s));assert.match(s.event.body,/family’s losses/);assert.ok(!s.event.body.includes(s.life.people.find(p=>p.id==='kin').name+' waits'));
  s.event=null;s.campaign.pending=null;s.campaign.stage='return';applyCampaignAction(s,'quest_begin_return',ctx(s));assert.match(s.event.choices.find(c=>c.id==='mira').label,/sealed private/);
  const mira=s.companions.find(p=>p.id==='mira'),before=structuredClone(mira);s.event=null;applyCampaignChoice(s,'quest_return','mira',ctx(s));assert.equal(s.campaign.facts.returnPrivateRecipient,'sealed_account');assert.deepEqual(mira,before);
  s.event=null;s.locationId='city';s.campaign.pending=null;s.campaign.stage='inquiry';applyCampaignAction(s,'quest_begin_inquiry',ctx(s));assert.equal(s.event.title,'The Order’s difficult inquiry');assert.ok(!s.event.body.includes('She asks'));
  const view=campaignView(s);assert.match(view.quests.find(q=>q.id==='inquiry').description,/surviving Lantern investigators/);
});
test('a deceased ferryman supplies dated evidence, never a promised living witness or new trust',()=>{
  const s=fresh();s.locationId='coast';s.campaign.stage='ferryman';s.campaign.pending=null;
  const kest=s.companions.find(p=>p.id==='kest');kest.alive=false;const before=structuredClone(kest);
  applyCampaignAction(s,'quest_begin_ferryman',ctx(s));assert.match(s.event.body,/no one here can say where the sibling lives now/);assert.match(s.event.choices.find(c=>c.id==='protect').label,/dated statement/);
  applyCampaignChoice(s,'quest_ferryman','protect',ctx(s));assert.equal(s.campaign.facts.transportWitnessType,'recorded_statement');assert.equal(s.campaign.facts.protectedWitness,false);assert.equal(s.campaign.facts.protectedTransportAccount,true);assert.deepEqual(kest,before);
  const view=campaignView(s);assert.match(view.quests.find(q=>q.id==='council').description,/statement lies under the seal/);assert.ok(!view.quests.find(q=>q.id==='council').description.includes('can testify'));
});
test('the named friend retains an earlier vampire confidence in a newly opened supper',()=>{
  const s=fresh(),f=s.life.people.find(p=>p.id==='fellow');contractCurse(s,'vampire','Unit wound');s.hero.condition.stage='changed';f.knownFacts.push('vampire');
  const event={id:'life_vampire_guest',body:()=> 'They have not guessed.',choices:[{id:'dusk'},{id:'truth'},{id:'decline'}]},scene=conditionConfidenceScene(s,event);
  assert.match(scene.body,/remembers your daylight limits/);assert.ok(!scene.body.includes('not guessed'));assert.match(scene.choices.find(c=>c.id==='truth').description,/already know/);
});
test('modern moon confidences promise no instant control while an older saved promise keeps its advertised gain',()=>{
  const s=fresh();contractCurse(s,'lycanthrope','Unit wound');const river=s.life.people.find(p=>p.id==='river');river.knownFacts.push('lycanthrope');
  const event={id:'life_wolf_confidant',body:()=> 'Why do you leave?',choices:[{id:'tell'},{id:'train'},{id:'boundary'}]},scene=conditionConfidenceScene(s,event);assert.match(scene.body,/remembers your moon curse/);assert.match(scene.choices.find(c=>c.id==='train').description,/grants no control/);
  s.life.pendingEvent={eventId:event.id,conditionStoryVersion:26,confidenceKnown:true};const control=s.hero.condition.control;applyLifeChoice(s,event.id,'train',ctx(s));assert.equal(s.hero.condition.control,control);
  s.life.pendingEvent={eventId:event.id};applyLifeChoice(s,event.id,'train',ctx(s));assert.equal(s.hero.condition.control,control+8);
});
test('curse policy is visible before exposure and public magic permission or a chosen congregation does not grant immunity',()=>{
  const s=fresh(),place=s.world.locations.find(p=>isSettlement(s.world,p.id)&&regionAt(s,p.id).id==='ashplain');assert.ok(place);s.locationId=place.id;
  assert.equal(regionAt(s).law.publicMagic,'permitted');assert.equal(curseLawAt(s).policy,'execution');assert.match(realmPage(s,E.getActions(s)),/capital hearing/);
  contractCurse(s,'vampire','Unit wound');s.realm.faithId='ash';assert.match(curseView(s).law,/cannot cancel a local warrant/);assert.equal(s.hero.condition.hunts.length,0);
});
