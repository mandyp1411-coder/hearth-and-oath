import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { syncCartography } from '../dist/js/cartography.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { characterConversation } from '../dist/js/character-voice.js';
import { personalAccounts, personalConcern, personalReadiness } from '../dist/js/people-context.js';
import { applyRelationshipAction } from '../dist/js/relationship-repairs.js';
import { mountApp } from './helpers/ui-surface.mjs';

function settle(s){
 for(let i=0;i<240;i++){
  // A sick body is put to bed: a fixture that only ever 'continues' through fevers is worn to nothing by thirty.
  if(s.event){const c=s.event.choices.filter(c=>!c.disabledReason);s=E.chooseEventOption(s,((s.event.id==='health_concern'&&c.find(c=>c.id==='rest'))||c.find(c=>['care','continue','later','keep','wait','support'].includes(c.id))||c[0]).id);}
  else if(s.conversations?.pending)s=E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies[0].id);
  else if(s.conversations?.project)s=E.chooseAction(s,'conversations_continue');
  else if(s.rpg?.project)s=E.chooseAction(s,'rpg_continue');
  else if(s.stories?.project)s=E.chooseAction(s,'stories_continue');
  else if(s.timeline?.yearTarget!==null)s=E.continueAgeUp(s);
  else {assert.ok(E.validateSave(s));return s;}
  assert.ok(E.validateSave(s),'Public decisions must remain importable');
 }throw Error('Fixture did not settle');
}
// Pin this historical scenario to its original origin; new fate pools can choose another household.
const baseline=settle(await createLifeAtAge({seed:'people-focus-four',originId:'human_rivercradle',startAge:30,difficulty:'gentle'}));
function fresh(){const s=structuredClone(baseline);s.hero.gold=10000;return s;}
function roundtrip(s){assert.ok(E.validateSave(s));const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}
// Controlled position, prior courtship and affordability fixtures isolate the
// public actions; these are not additional audit lives or tests of road travel.
function at(s,id){s=structuredClone(s);s.locationId=id;syncCartography(s);assert.ok(E.validateSave(s));return E.migrateSave(s);}
function meet(s,id){s=at(s,s.rpg.companionStages[id].locationId);s=E.chooseAction(s,'rpg_meet_'+id);assert.ok(s.companions.find(p=>p.id===id).recruited);return s;}
function chapter(s,id,choice){s=E.chooseAction(s,'rpg_companion_'+id);assert.equal(s.event?.id,'rpg_companion');return settle(E.chooseEventOption(s,choice));}
function harmRival(){let s=E.chooseAction(fresh(),'stories_open_two_names');assert.equal(s.event?.id,'stories_chapter');return settle(E.chooseEventOption(s,'coercion'));}
function atPerson(s,id){const p=getContacts(s).find(p=>p.id===id);assert.ok(p,id);s=at(s,p.locationId);s.cartography.interior={siteId:s.locationId,roomId:p.roomId||'gate'};return E.migrateSave(s);}
function company(s,id,choice='share'){s=atPerson(s,id);s=E.chooseAction(s,'talk_'+id);assert.equal(s.conversations.pending?.personId,id);return E.replyMessage(s,id,s.conversations.pending.replies.some(r=>r.id===choice)?choice:s.conversations.pending.replies[0].id);}
function review(s,id){for(let i=0;i<8&&personalReadiness(s,id);i++){s=atPerson(s,id);s=E.chooseAction(s,'talk_'+id);assert.equal(s.conversations.pending?.personId,id);s=E.replyMessage(s,id,s.conversations.pending.nodeId==='person_v30'?'ask':s.conversations.pending.nodeId==='person_v29'?'boundary':s.conversations.pending.replies[0].id);}assert.equal(personalReadiness(s,id),null);return s;}

test('six important companions have distinct ordinary concerns, answers and accurate vocations without generating quests',()=>{
 const bodies=new Set(),answers=new Set();
 for(const id of ['mira','orrin','kest','sable','tovin','vesper']){
  let s=atPerson(fresh(),id);const before=structuredClone({day:s.day,gold:s.hero.gold,campaign:s.campaign,obligations:s.obligations,stories:s.stories,rpg:s.rpg});
  s=atPerson(s,id);s=E.chooseAction(s,'talk_'+id);assert.equal(s.conversations.pending?.nodeId,'person_v30',id);bodies.add(getThread(s,id).messages.at(-1).text);answers.add(s.conversations.pending.snapshot.choices.find(c=>c.id==='ask').response);s=E.replyMessage(s,id,'ask');
  assert.deepEqual({day:s.day,gold:s.hero.gold,campaign:s.campaign,obligations:s.obligations,stories:s.stories,rpg:s.rpg},before);roundtrip(s);
 }assert.equal(bodies.size,6);assert.equal(answers.size,6);
 const c=getContacts(fresh());assert.match(c.find(p=>p.id==='sable').role,/healer/);assert.match(c.find(p=>p.id==='tovin').role,/veteran/);assert.match(c.find(p=>p.id==='vesper').role,/bard/);
});
test('a completed personal event changes each extended companion’s ordinary concern in the same year',()=>{
 for(const id of ['sable','tovin','vesper']){
  let s=company(meet(fresh(),id),id,'ask');const before=personalConcern(s,getContacts(s).find(p=>p.id===id));s=chapter(s,id,'care');const now=personalConcern(s,getContacts(s).find(p=>p.id===id));
  assert.equal(s.age,30);assert.notEqual(now.key,before.key);assert.notEqual(now.summary,before.summary);s=atPerson(s,id);s=E.chooseAction(s,'talk_'+id);assert.equal(s.conversations.pending?.nodeId,'person_v30');assert.ok(getThread(s,id).messages.at(-1).text.includes(s.rpg.companionStages[id].choices[0].outcome));roundtrip(s);
 }
});
test('a person’s disposition changes their manner while a captured reply keeps its original voice',()=>{
 let a=fresh(),b=fresh();a.life.people.find(p=>p.id==='fellow').disposition='reserved';b.life.people.find(p=>p.id==='fellow').disposition='bold';a=E.chooseAction(a,'talk_fellow');b=E.chooseAction(b,'talk_fellow');assert.notEqual(getThread(a,'fellow').messages.at(-1).text,getThread(b,'fellow').messages.at(-1).text);
 const captured=structuredClone(a.conversations.pending);a.life.people.find(p=>p.id==='fellow').disposition='bold';a=roundtrip(a);assert.deepEqual(a.conversations.pending,captured);a=E.replyMessage(a,'fellow','ask');assert.equal(getThread(a,'fellow').messages.at(-1).text,captured.snapshot.choices.find(c=>c.id==='ask').response);
});
test('contacts and concern queries expose no bystander confidence and do not open or advance any life',()=>{
 const s=fresh(),before=structuredClone(s);getContacts(s);for(const p of getContacts(s))personalConcern(s,p);personalAccounts(s,'rival');E.getActions(s);assert.deepEqual(s,before);
 const changed=fresh();changed.life.people.find(p=>p.id==='river').knownFacts.push('vampire');assert.deepEqual(personalConcern(changed,getContacts(changed).find(p=>p.id==='fellow')),personalConcern(s,getContacts(s).find(p=>p.id==='fellow')));
});
test('generic visits and gifts can restore familiarity without erasing authorship theft or permitting a pledge',()=>{
 let s=harmRival();const account=structuredClone(personalAccounts(s,'rival'));s=atPerson(s,'rival');
 for(let i=0;i<5;i++)s=settle(E.chooseAction(s,'life_visit_rival'));for(let i=0;i<5;i++)s=settle(E.chooseAction(s,'life_gift_rival'));
 assert.equal(s.life.people.find(p=>p.id==='rival').bond,100);assert.deepEqual(personalAccounts(s,'rival'),account);assert.match(E.getActions(s).find(a=>a.id==='life_court_rival').disabledReason,/unresolved account/);
 const day=s.day;s=E.chooseAction(s,'life_court_rival');assert.equal(s.day,day);assert.equal(s.life.courtshipId,null);s=company(s,'rival');assert.ok(personalReadiness(s,'rival'));roundtrip(s);
});
test('an attended remedy preserves the original harm, costs real work and money, and buys neither affection nor readiness',()=>{
 let s=harmRival();const a=s.stories.arcs.find(a=>a.id==='two_names'),original=structuredClone(a.choices),bond=s.life.people.find(p=>p.id==='rival').bond;s=at(s,a.locationId);const day=s.day,gold=s.hero.gold;s=settle(E.chooseAction(s,'conversations_repair_rival'));
 assert.equal(s.day,day+2);assert.ok(s.hero.gold<=gold-6);assert.equal(s.life.people.find(p=>p.id==='rival').bond,bond);assert.deepEqual(s.stories.arcs.find(a=>a.id==='two_names').choices,original);assert.equal(personalAccounts(s,'rival').length,0);assert.match(personalReadiness(s,'rival'),/two real days|until day/);assert.equal(s.conversations.repairs[0].reviewedDay,null);roundtrip(s);
 s=company(s,'rival');assert.ok(personalReadiness(s,'rival'));s=settle(E.chooseAction(s,'life_rest'));s=review(s,'rival');assert.ok(s.conversations.repairs[0].reviewedDay>=day+4);roundtrip(s);
});
test('a completed remedy changes a new story return while the original choice remains in its archive',()=>{
 let s=harmRival();const original=structuredClone(s.stories.arcs[0].choices[0]);s=at(s,s.stories.arcs[0].locationId);s=settle(E.chooseAction(s,'conversations_repair_rival'));for(let guard=0;s.age<s.stories.arcs[0].nextAge;guard++){assert.ok(guard<80&&s.phase!=='retired',`alive to the next chapter (age ${s.age})`);s=settle(E.ageUp(s));}s=E.chooseAction(s,'stories_open_two_names');assert.doesNotMatch(s.event.body,/earlier claim to sole authorship/);assert.deepEqual(s.stories.arcs[0].choices[0],original);roundtrip(s);
});
test('an ordinary pending household pledge cannot bypass an unresolved personal account',()=>{
 let s=atPerson(harmRival(),'rival');const rival=s.life.people.find(p=>p.id==='rival');rival.bond=100;s.life.courtshipId='rival';rival.relation='courtship';s.life.pendingEvent={personId:'rival'};s.event={id:'life_commitment',title:'An earlier saved proposal',category:'Courtship',body:'The exact older words remain here.',choices:[{id:'pledge',label:'Make a mutual household pledge',description:'An older saved reply.'},{id:'wait',label:'Keep courting',description:'Wait.'}]};assert.ok(E.validateSave(s));const before=structuredClone(s);s=E.chooseEventOption(s,'pledge');assert.equal(s.life.partnerId,null);assert.deepEqual(s.event,before.event);assert.equal(s.day,before.day);assert.match(s.notice,/unresolved account/);roundtrip(s);
});
test('repair attendance pauses at a birthday, survives reload and reserves its fee only once',()=>{
 let s=harmRival();s=at(s,s.stories.arcs[0].locationId);s.day=(s.timeline.birthDay||0)+(s.age+1)*365-1;assert.ok(E.validateSave(s));const gold=s.hero.gold;s=E.chooseAction(s,'conversations_repair_rival');assert.ok(s.event?.id.startsWith('birth_'));assert.equal(s.conversations.project.completedDays,1);assert.equal(s.conversations.project.paid,true);assert.equal(s.conversations.repairs,undefined);assert.ok(s.hero.gold<=gold-6);
 s=roundtrip(s);
 // A birthday can reveal another care decision. Resolve those real decisions
 // before measuring the remaining repair day and its own once-only fee.
 for(let i=0;s.event&&i<20;i++)s=E.chooseEventOption(s,s.event.choices.find(c=>c.id==='care'&&!c.disabledReason)?.id||s.event.choices.find(c=>!c.disabledReason).id);
 assert.equal(s.event,null);assert.equal(s.conversations.project.remainingDays,1);
 const before=s.hero.gold,living=s.householdBudget.paidGold;s=E.chooseAction(s,'conversations_continue');assert.equal(s.conversations.project,null);assert.equal(s.conversations.repairs[0].cost,6);assert.equal(s.hero.gold,before-(s.householdBudget.paidGold-living),'remaining attendance pays living costs without repeating the fee');roundtrip(s);s=settle(s);roundtrip(s);
});
test('zero attendance refunds the reserved fee; cancelling partial work leaves the harm unresolved',()=>{
 let s=harmRival();s=at(s,s.stories.arcs[0].locationId);const gold=s.hero.gold;assert.equal(applyRelationshipAction(s,'conversations_repair_rival',{spendDays:()=>0}),true);assert.equal(s.hero.gold,gold);assert.equal(s.conversations.project.paid,false);roundtrip(s);
 assert.equal(applyRelationshipAction(s,'conversations_continue',{spendDays:()=>{s.day++;return 1;}}),true);assert.equal(s.hero.gold,gold-6);assert.equal(s.conversations.project.completedDays,1);roundtrip(s);s=E.chooseAction(s,'conversations_cancel');assert.equal(s.conversations.project,null);assert.equal(s.conversations.repairs,undefined);assert.ok(personalAccounts(s,'rival').length);assert.equal(s.hero.gold,gold-6);roundtrip(s);
});
test('an unfinished remedy holds age-up, travel, equipment and other work without accepting another commitment',()=>{
 let s=harmRival();s=at(s,s.stories.arcs[0].locationId);applyRelationshipAction(s,'conversations_repair_rival',{spendDays:()=>0});assert.deepEqual(E.getActions(s).map(a=>a.id),['conversations_continue','conversations_cancel']);assert.ok(E.equipmentActionReason(s));assert.ok(E.companionActionReason(s,'mira'));const before=structuredClone(s);s=E.ageUp(s);assert.equal(s.day,before.day);assert.deepEqual(s.conversations.project,before.conversations.project);s=E.chooseAction(s,'life_rest');assert.equal(s.day,before.day);roundtrip(s);
});
test('a companion’s observed personal betrayal blocks active travel even after generic relationship gain',()=>{
 let s=meet(fresh(),'sable');s=E.toggleCompanion(s,'sable');assert.equal(s.companions.find(p=>p.id==='sable').active,true);s=chapter(s,'sable','scheme');const p=s.companions.find(p=>p.id==='sable');assert.equal(p.active,false);assert.equal(p.recruited,true);p.relationship=100;assert.match(E.companionActionReason(s,'sable','toggle'),/unresolved account/);s=E.toggleCompanion(s,'sable');assert.equal(s.companions.find(p=>p.id==='sable').active,false);s=atPerson(s,'sable');s=E.chooseAction(s,'talk_sable');assert.equal(s.conversations.pending.nodeId,'person_v30');assert.match(getThread(s,'sable').messages.at(-1).text,/private|account|notes/);s=E.replyMessage(s,'sable','share');assert.ok(personalReadiness(s,'sable'));roundtrip(s);
});
test('a companion can acknowledge actual repair and choose active travel again without resetting trust, fear or loyalty rules',()=>{
 let s=chapter(meet(fresh(),'sable'),'sable','scheme');const stats=structuredClone(s.rpg.companionStages.sable),bond=s.companions.find(p=>p.id==='sable').relationship;s=at(s,stats.locationId);s=settle(E.chooseAction(s,'conversations_repair_sable'));assert.equal(s.companions.find(p=>p.id==='sable').active,false);assert.equal(s.companions.find(p=>p.id==='sable').relationship,bond);s=settle(E.chooseAction(s,'life_rest'));s=review(s,'sable');assert.equal(s.rpg.companionStages.sable.trust,stats.trust);assert.equal(s.rpg.companionStages.sable.fear,stats.fear);s=E.toggleCompanion(s,'sable');assert.equal(s.companions.find(p=>p.id==='sable').active,true);s.flags.miraWithdrawn=true;assert.match(E.companionActionReason(s,'mira'),/unwilling/);roundtrip(s);
});
test('departed companions and the dead are never reinstated by a personal remedy',()=>{
 let s=chapter(meet(fresh(),'vesper'),'vesper','scheme');s.rpg.companionStages.vesper.status='departed';s.companions.find(p=>p.id==='vesper').recruited=false;assert.ok(!E.getActions(s).some(a=>a.id==='conversations_repair_vesper'));assert.match(E.companionActionReason(s,'vesper'),/no longer available/);s=E.recruitCompanion(s,'vesper');assert.equal(s.companions.find(p=>p.id==='vesper').recruited,false);assert.ok(!getContacts(s).some(p=>p.id==='vesper'));roundtrip(s);
});
test('fourth and fifth recruits explicitly join reserves while the active companion limit remains three',()=>{
 let s=at(fresh(),'city');for(const id of ['mira','orrin','kest'])s=E.recruitCompanion(s,id);assert.equal(s.companions.filter(p=>p.active).length,3);for(const id of ['sable','vesper']){s=E.recruitCompanion(s,id);assert.equal(s.companions.find(p=>p.id===id).active,false);assert.match(s.notice,/in reserve \(3\/3/);assert.match(s.notice,/Open Party/);}s=E.toggleCompanion(s,'mira');s=E.toggleCompanion(s,'sable');assert.equal(s.companions.filter(p=>p.active).length,3);roundtrip(s);
});
test('regional introductions disclose reserve status and occupancy before and after recruitment',()=>{
 let s=fresh();s=at(s,s.rpg.companionStages.tovin.locationId);const a=E.getActions(s).find(a=>a.id==='rpg_meet_tovin');assert.match(a.description,/Joins reserves/);assert.match(a.description,/0\/3/);s=E.chooseAction(s,a.id);assert.match(s.notice,/in reserve/);assert.equal(s.companions.find(p=>p.id==='tovin').active,false);roundtrip(s);
});
test('forged remedies, premature acknowledgements and malformed unfinished repair records fail import',()=>{
 let s=harmRival();s=at(s,s.stories.arcs[0].locationId);s=settle(E.chooseAction(s,'conversations_repair_rival'));roundtrip(s);
 for(const mutate of [v=>v.conversations.repairs[0].key='story:invented:0',v=>v.conversations.repairs[0].cost=0,v=>v.conversations.repairs[0].personId='fellow',v=>v.conversations.repairs[0].reviewedDay=v.conversations.repairs[0].day,v=>v.conversations.repairs[0].day=v.day+1,v=>v.conversations.repairs.push({...v.conversations.repairs[0]})]){const invalid=structuredClone(s);mutate(invalid);assert.equal(E.migrateSave(invalid),null);}
 s=harmRival();s=at(s,s.stories.arcs[0].locationId);applyRelationshipAction(s,'conversations_repair_rival',{spendDays:()=>0});for(const mutate of [v=>v.conversations.project.totalDays=0,v=>v.conversations.project.paid=true,v=>v.conversations.project.key='story:two_names:99',v=>v.conversations.project.cost=NaN]){const invalid=structuredClone(s);mutate(invalid);assert.equal(E.migrateSave(invalid),null);}
});
test('a saved older voice retains its exact words and replies when the new concern framework is available',()=>{
 let s=fresh();const p=getContacts(s).find(p=>p.id==='fellow'),old=characterConversation(s,p);s.conversations.pending={personId:p.id,nodeId:old.nodeId,topic:old.topic,replies:old.choices.map(({id,label,description})=>({id,label,description})),snapshot:structuredClone(old)};const captured=structuredClone(s.conversations.pending);s=roundtrip(s);assert.deepEqual(s.conversations.pending,captured);s=E.replyMessage(s,p.id,'listen');assert.equal(getThread(s,p.id).messages.at(-1).text,captured.snapshot.choices.find(c=>c.id==='listen').response);assert.equal(s.conversations.pending,null);roundtrip(s);
});
test('production relationship records preserve a boundary and route restoration through the recorded plan',async t=>{
 let s=harmRival();s=at(s,s.stories.arcs[0].locationId);const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','relationships');await ui.click('people-scope','all');await ui.click('contact','rival');assert.ok(ui.root.querySelector('[data-person-boundary]'));assert.equal(ui.root.querySelector('[data-op="activity"][data-id="conversations_repair_rival"]'),null);assert.deepEqual(personalAccounts(ui.current(),'rival'),personalAccounts(s,'rival'));await ui.click('tab','life');await ui.click('workspace-section','life:plans');assert.match(ui.root.innerHTML,/restore the maker/i);const quote=E.getActions(ui.current()).find(a=>a.id==='conversations_repair_rival');assert.equal(quote.durationDays,2);assert.equal(quote.quotedCost,6);assert.match(ui.root.innerHTML,/2(?:d| Days| days)/);assert.match(ui.root.innerHTML,/6 (?:Gold|gold)/);const day=ui.current().day;await ui.click('activity','conversations_repair_rival');assert.equal(ui.current().day,day+2);assert.equal(ui.current().conversations.repairs.length,1);await ui.click('tab','relationships');await ui.click('people-scope','all');await ui.click('contact','rival');assert.match(ui.root.innerHTML,/Awaiting their answer/);
});
test('production party controls state reserve recruitment and link a named companion’s conversation to party management',async t=>{
 let s=at(fresh(),'city');for(const id of ['mira','orrin','kest'])s=E.recruitCompanion(s,id);s=atPerson(s,'sable');const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');const who=getContacts(ui.current()).find(p=>p.id==='sable');if(who.roomId)await ui.click('place-area',who.roomId);ui.root.querySelector('#nearby-query').value=who.name;await ui.fire('submit',ui.root.querySelector('#nearby-search'));await ui.click('spatial-contact','sable');assert.match(ui.root.innerHTML,/Joins reserves/);await ui.click('activity','rpg_meet_sable');await ui.click('menu','header');await ui.click('tab','party');assert.match(ui.root.innerHTML,/3 \/ 3 active/);assert.equal(ui.current().companions.find(p=>p.id==='sable').active,false);assert.match(ui.root.innerHTML,/In reserve/);await ui.click('show-contact','sable');assert.match(ui.root.innerHTML,/healer and clinic keeper/i);await ui.click('menu');await ui.click('tab','party');assert.match(ui.root.innerHTML,/3 \/ 3 active/);roundtrip(ui.current());
});
