import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {yardActions,validateYard} from '../dist/js/yard-tournament.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {isSettlement} from '../dist/js/world.js';
import {mountApp} from './helpers/ui-surface.mjs';
import {renderActivities} from '../dist/js/activities-v31.js';
function settle(s){for(let i=0;i<250;i++){
 if(s.event){const c=s.event.choices.find(c=>['care','continue','later','keep','wait','support'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}
 else if(s.conversations?.pending)s=E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies[0].id);
 else if(s.timeline?.yearTarget!=null)s=E.continueAgeUp(s);else return s;
 }throw Error('settle failed');}
const base=settle(await createLifeAtAge({seed:'gateyard-test',startAge:12,difficulty:'gentle'}));
function fresh(){let s=structuredClone(base);s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)&&!['destroyed','evacuated'].includes(p.status)).id;s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);for(const room of settlementWalkPath(s,'gate'))s=E.chooseAction(s,'atlas_room_'+room);return s;}
function roundtrip(s){assert.ok(E.validateSave(s),'save valid '+s.yardTournament?.stage+' '+s.event?.id);const n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(n.yardTournament,s.yardTournament);assert.deepEqual(n.event,s.event);return n;}
function start(){let s=E.chooseAction(fresh(),'yard_invite');assert.equal(s.event?.id,'yard_invitation');s=E.chooseEventOption(roundtrip(s),'enter');if(!s.event)s=E.chooseAction(s,'yard_resume');assert.equal(s.event?.id,'yard_exchange');return roundtrip(s);}
const counter={attack:'guard',guard:'feint',feint:'attack'},loser={attack:'feint',guard:'attack',feint:'guard'};
function finish(mode){let s=start();for(let i=0;i<3;i++){const intent=s.yardTournament.intents[i],move=mode==='win'?counter[intent]:mode==='loss'?loser[intent]:intent;s=roundtrip(E.chooseEventOption(s,move+'_'+i));}return s;}
import {getContacts,getThread} from '../dist/js/conversations.js';
import {yardConversation} from '../dist/js/yard-conversation.js';
import {groundedDialogue} from '../dist/js/grounded-narrative-content.js';
const talk=(s,id)=>E.chooseAction(s,'talk_'+id);
const resume=s=>E.migrateSave(JSON.parse(JSON.stringify(s)));
const resources=s=>({day:s.day,gold:s.hero.gold,hp:s.hero.hp,skills:s.hero.skills,personality:s.hero.personality,profession:s.hero.profession,bond:s.conversations.relationships['yard-instructor']?.bond});
test('actual ordinary talk remembers each outcome, saves exact text, consumes only after a reply and changes no resources',()=>{
 for(const mode of ['win','loss','draw','withdrawn']){
  let s=mode==='withdrawn'?E.chooseEventOption(start(),'withdraw'):finish(mode);
  const id=s.yardTournament.mentor.id,original=resources(s);s=talk(s,id);
  assert.equal(s.conversations.pending.nodeId,'yard_conversation');
  assert.match(getThread(s,id).messages.at(-1).text,new RegExp(mode==='withdrawn'?'withdrawal':mode));
  assert.match(s.conversations.pending.snapshot.body,mode==='win'?/3–0/:mode==='loss'?/0–3/:/0–0/);
  assert.equal(s.yardTournament.discussedIds,undefined);
  const pending=structuredClone(s.conversations.pending);s=resume(s);assert.deepEqual(s.conversations.pending,pending);
  s=talk(s,id);assert.deepEqual(s.conversations.pending,pending);
  s=E.replyMessage(s,id,'review');assert.deepEqual(resources(s),original);assert.deepEqual(s.yardTournament.discussedIds,[id]);
  assert.match(getThread(s,id).messages.at(-1).text,mode==='withdrawn'?/before the first exchange/:/last exchange/);
  const count=s.conversations.sequence;s=E.replyMessage(s,id,'review');assert.equal(s.conversations.sequence,count);
  s=talk(resume(s),id);assert.notEqual(s.conversations.pending?.nodeId,'yard_conversation');
 }
});
test('opponent gets a separate perspective; consumed marker survives seen history pruning',()=>{
 let s=finish('win'),id=s.yardTournament.opponent.id;
 s=talk(s,id);assert.match(s.conversations.pending.snapshot.body,/You won\. I want to understand/);
 s=E.replyMessage(s,id,'leave');assert.deepEqual(s.yardTournament.discussedIds,[id]);
 s.conversations.seen=[];s=talk(resume(s),id);assert.notEqual(s.conversations.pending?.nodeId,'yard_conversation');
 s=E.replyMessage(s,id,s.conversations.pending.replies[0].id);s=talk(s,s.yardTournament.mentor.id);assert.equal(s.conversations.pending?.nodeId,'yard_conversation');
});
test('only resolved participants who are present may recall, never remote or unrelated actors',()=>{
 const done=finish('win'),id=done.yardTournament.mentor.id,p=getContacts(done).find(p=>p.id===id);
 assert.ok(yardConversation(done,p));assert.equal(yardConversation(fresh(),p),null);assert.equal(yardConversation(start(),p),null);
 for(const change of [s=>s.yardTournament.paidDays=0,s=>s.cartography.offsite=true,s=>s.cartography.interior={roomId:'market'},s=>s.locationId='elsewhere']){const s=structuredClone(done);change(s);assert.equal(yardConversation(s,p),null);}
 for(const change of [p=>p.id='somebody-else',p=>p.available=false,p=>p.alive=false,p=>p.source={alive:false},p=>p.locationId='elsewhere']){const q=structuredClone(p);change(q);assert.equal(yardConversation(done,q),null);}
});
test('old resolved saves gain no marker until answering, and invalid markers are rejected',()=>{
 let s=resume(finish('draw'));assert.equal(s.yardTournament.discussedIds,undefined);
 for(const ids of [['unknown'],['yard-instructor','yard-instructor']]){const bad=structuredClone(s);bad.yardTournament.discussedIds=ids;assert.equal(E.validateSave(bad),false);}
 s=talk(s,s.yardTournament.mentor.id);assert.ok(E.validateSave(s));s=E.replyMessage(s,s.yardTournament.mentor.id,'quiet');assert.ok(E.validateSave(s));
});
test('voice profiles and known motives vary the conversation without fabricating past events',()=>{
 const s=finish('draw'),id=s.yardTournament.opponent.id,p=getContacts(s).find(p=>p.id===id);
 const a=yardConversation(s,{...p,disposition:'reserved'}),b=yardConversation(s,{...p,disposition:'bold'});
 assert.notEqual(a.body,b.body);assert.match(a.body,/quiet/);assert.match(b.body,/plain/);
 assert.match(yardConversation(s,{...p,motiveProfile:'rival'}).choices[1].response,/Both names/);
 const instructor=getContacts(s).find(p=>p.id===s.yardTournament.mentor.id);
 assert.deepEqual(groundedDialogue(s,instructor),groundedDialogue(s,{...instructor,role:'teacher'}));
});
test('pending invalidation consumes nothing and never speaks for an absent participant',()=>{
 let s=talk(finish('win'),'yard-instructor');const seq=s.conversations.sequence;
 s.conversations.servicePeople['yard-instructor'].locationId=s.world.locations.find(l=>l.id!==s.locationId).id;
 s=E.replyMessage(s,'yard-instructor','review');assert.equal(s.conversations.pending,null);assert.equal(s.conversations.sequence,seq);assert.equal(s.yardTournament.discussedIds,undefined);
});
test('a scored draw and partial withdrawal never claim a different exchange history',()=>{
 let s=start();s=E.chooseEventOption(s,counter[s.yardTournament.intents[0]]+'_0');s=E.chooseEventOption(s,loser[s.yardTournament.intents[1]]+'_1');s=E.chooseEventOption(s,s.yardTournament.intents[2]+'_2');
 assert.equal(s.yardTournament.outcome,'draw');s=talk(s,'yard-instructor');assert.match(s.conversations.pending.snapshot.body,/1–1/);assert.doesNotMatch(s.conversations.pending.snapshot.body,/Neither.*scor/);
 s=E.replyMessage(s,'yard-instructor','review');assert.match(s.journal.at(-1).text,/last exchange/);assert.match(s.journal.at(-1).text,/Neither scored/);
 let w=start();w=E.chooseEventOption(w,counter[w.yardTournament.intents[0]]+'_0');w=E.chooseEventOption(w,'withdraw');const p=getContacts(w).find(p=>p.id==='yard-instructor');const scene=yardConversation(w,{...p,disposition:'wry'});assert.match(scene.body,/1–0.*1 exchange/);assert.doesNotMatch(scene.body,/Three exchanges/);
});
test('yard snapshots reject mechanical effects; unavailable participant clears without consumption',()=>{
 let s=talk(finish('win'),'yard-instructor');
 for(const effect of [{bond:20},{memory:'unearned'},{agency:'withdrawn',pause:true}]){const bad=structuredClone(s);bad.conversations.pending.snapshot.choices[0].effect=effect;assert.equal(E.validateSave(bad),false);}
 s.conversations.servicePeople['yard-instructor'].serviceEndDay=s.day;const seq=s.conversations.sequence;s=E.replyMessage(s,'yard-instructor','review');assert.equal(s.conversations.pending,null);assert.equal(s.conversations.sequence,seq);assert.equal(s.yardTournament.discussedIds,undefined);
});

test('hostile contacts retain their boundaries instead of receiving friendly bout dialogue',()=>{let s=finish('win');s.conversations.relationships['yard-instructor'].bond=10;s=talk(s,'yard-instructor');assert.equal(s.conversations.pending.nodeId,'person_v30');assert.match(s.conversations.pending.snapshot.body,/not ready to pretend/);assert.equal(s.yardTournament.discussedIds,undefined);});
test('actual UI opens participant talk, retains unanswered snapshot across navigation and submits once',async t=>{
 const ui=await mountApp(t,{states:[finish('win')]});await ui.click('title-continue');await ui.click('tab','map');await ui.click('place-open');await openInstructor(ui);await ui.click('activity','talk_yard-instructor');
 assert.match(ui.root.innerHTML,/3–0/);assert.match(ui.root.innerHTML,/Talk through the recorded exchanges/);
 const pending=structuredClone(ui.current().conversations.pending);await ui.click('tab','character');await ui.click('tab','map');await ui.click('place-open');assert.deepEqual(ui.current().conversations.pending,pending);
 await ui.click('reply','review');assert.deepEqual(ui.current().yardTournament.discussedIds,['yard-instructor']);assert.equal(ui.current().conversations.pending,null);assert.match(ui.root.innerHTML,/last exchange/);assert.ok(E.validateSave(ui.current()));
});

async function openInstructor(ui){for(let i=0;i<30&&!ui.root.querySelector('[data-op=\"spatial-contact\"][data-id=\"yard-instructor\"]');i++){const next=ui.root.querySelectorAll('[data-op=\"nearby-page\"]').find(x=>x.textContent.includes('Next')&&!x.disabled);assert.ok(next,'instructor reachable in local residents');await ui.click('nearby-page',next.dataset.id);}await ui.click('spatial-contact','yard-instructor');}
