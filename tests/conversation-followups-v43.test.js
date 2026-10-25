import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {getContacts,getThread,validateConversations} from '../dist/js/conversations.js';
import {groundedDialogue} from '../dist/js/grounded-narrative-content.js';
import {conversationFollowUp,followUpAvailable} from '../dist/js/conversation-followups.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
const titles={repair:'A Stubborn Repair',soup:'A Cold Bowl of Soup',boots:'Wet Boots',page:'A Page That Finally Makes Sense'};
const nextTitles={repair:'The Repair You Asked About',soup:'More Than a Bowl of Soup',boots:'The Person Inside the Boots',page:'The Step the Writer Skipped'};
function walk(s,room){for(const id of settlementWalkPath(s,room))s=E.chooseAction(s,'atlas_room_'+id);return s;}
function fresh(key='repair'){
 let s=structuredClone(base);s.event=null;s.conversations.pending=null;
 let id;
 if(key==='page'){
  id='followup-test-scholar';s.conversations.servicePeople ||= {};s.conversations.servicePeople[id]={id,name:'Rowan Test',role:'Scholar',age:42,baseAge:20,locationId:s.locationId,roomId:'archive',bond:40};s=walk(s,'archive');
 }else{const service=settlementServices(s).find(p=>p.kind===({repair:'smith',soup:'doctor',boots:'watch'}[key]));id=service.personId;s=walk(s,service.roomId);s=E.visitService(s,service.id);}
 const p=getContacts(s).find(p=>p.id===id);assert.ok(p);
 for(let offset=0;offset<80;offset++){
  const n=structuredClone(s);n.day+=offset;
  if(groundedDialogue(n,p).title===titles[key]&&!n.conversations.seen.includes(`${id}:visit-${n.age}-${n.day}-${id}`)){assert.ok(E.validateSave(n));return {s:n,id};}
 }
 throw Error('No original topic found for '+key);
}
function open(key='repair'){const {s,id}=fresh(key),n=E.chooseAction(s,'talk_'+id);assert.equal(n.conversations.pending.snapshot.title,titles[key]);assert.ok(E.validateSave(n));return {s:n,id};}
function source(key='repair',reply='ask'){let {s,id}=open(key);s=E.replyMessage(s,id,reply);assert.ok(E.validateSave(s));return {s,id};}
function nextDay(s){const n=structuredClone(s);n.day++;return n;}
function followup(key='repair'){let {s,id}=source(key);s=E.chooseAction(nextDay(s),'talk_'+id);assert.equal(s.conversations.pending.snapshot.title,nextTitles[key]);assert.ok(E.validateSave(s));return {s,id};}
const stable=s=>({day:s.day,gold:s.hero.gold,hero:s.hero,equipment:s.equipment,careers:s.careers,workshop:s.workshop,life:{...s.life,people:undefined},companions:s.companions});

test('four actual completed ordinary questions lead to contextual next-meeting choices',()=>{
 for(const key of Object.keys(titles)){
  let {s,id}=source(key);assert.equal(s.conversations.followUps.length,1);const receipt=structuredClone(s.conversations.followUps[0]);assert.equal(receipt.key,key);assert.equal(receipt.sourceDay,s.day);assert.equal(receipt.choiceId,null);
  assert.ok(E.getActions(s).find(a=>a.id==='talk_'+id).disabledReason);
  const before=nextDay(s);s=E.chooseAction(before,'talk_'+id);assert.equal(s.conversations.pending.snapshot.title,nextTitles[key]);assert.match(s.conversations.pending.snapshot.body,/You asked/);assert.notEqual(s.conversations.pending.replies[0].label,'Ask about what they have just told you.');
  assert.deepEqual(s.conversations.followUps,[receipt]);assert.deepEqual(stable(s),stable(before));
  const others=structuredClone(s.conversations.relationships);delete others[id];const bond=getContacts(s).find(p=>p.id===id).bond;
  s=E.replyMessage(s,id,'share');assert.equal(getContacts(s).find(p=>p.id===id).bond,bond+3);assert.equal(s.conversations.followUps[0].completedDay,s.day);assert.equal(s.conversations.followUps[0].choiceId,'share');assert.deepEqual(stable(s),stable(before));
  const after=structuredClone(s.conversations.relationships);delete after[id];assert.deepEqual(after,others);assert.ok(E.validateSave(s));assert.deepEqual(E.replyMessage(s,id,'share'),s);
  assert.ok(E.getActions(s).find(a=>a.id==='talk_'+id).disabledReason);s=E.chooseAction(nextDay(s),'talk_'+id);assert.equal(s.conversations.pending.snapshot.followUp,undefined);
 }
});
test('opening, sharing, joking, leaving, memory text and seen markers cannot invent antecedents',()=>{
 for(const reply of ['share','tease','leave']){let {s,id}=source('repair',reply);assert.equal(s.conversations.followUps,undefined);const p=getContacts(s).find(p=>p.id===id);assert.equal(conversationFollowUp(nextDay(s),p,'next'),null);}
 let {s,id}=open();const p=getContacts(s).find(p=>p.id===id);assert.equal(s.conversations.followUps,undefined);assert.equal(conversationFollowUp(nextDay(s),p,'next'),null);
 s.conversations.pending=null;s.conversations.threads[id]=[];s.conversations.relationships[id] ||= {bond:40,memories:[],knownFacts:[]};s.conversations.relationships[id].memories=['We talked about a stubborn repair in the settlement.'];s.conversations.seen.push(id+':repair');assert.equal(conversationFollowUp(nextDay(s),p,'next'),null);
});
test('original and follow-up waiting snapshots survive reload, navigation and changed voice exactly',()=>{
 for(const build of [open,followup]){
  let {s,id}=build();const pending=structuredClone(s.conversations.pending);s=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(s);assert.deepEqual(s.conversations.pending,pending);
  s.conversations.servicePeople[id].disposition='bold';const p=getContacts(s).find(p=>p.id===id);assert.ok(p);assert.deepEqual(E.chooseAction(s,'talk_'+id).conversations.pending,pending);
  assert.deepEqual(getThread(s,id).replies.map(({traitPreview,...r})=>r),pending.replies);assert.ok(E.validateSave(s));s=E.replyMessage(s,id,'ask');assert.equal(s.conversations.pending,null);assert.ok(E.validateSave(s));
 }
});
test('delayed original answers unlock only after the answer day, not the opening day',()=>{
 let {s,id}=open();const opened=s.day;s.day+=2;s=E.replyMessage(s,id,'ask');assert.equal(s.conversations.followUps[0].sourceDay,opened+2);const p=getContacts(s).find(p=>p.id===id);assert.equal(conversationFollowUp(s,p,'later'),null);assert.ok(conversationFollowUp(nextDay(s),p,'later'));assert.ok(E.validateSave(s));
});
test('legacy exact played thread supports follow-up without a migration or speculative backfill',()=>{
 let {s,id}=source();delete s.conversations.followUps;const original=structuredClone(s);s=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s,original);s=nextDay(s);const before=structuredClone(s);E.getActions(s);getContacts(s);assert.deepEqual(s,before);
 s=E.chooseAction(s,'talk_'+id);assert.equal(s.conversations.pending.snapshot.followUp.key,'repair');assert.equal(s.conversations.followUps,undefined);assert.ok(E.validateSave(s));s=E.replyMessage(s,id,'leave');assert.equal(s.conversations.followUps[0].choiceId,'leave');assert.ok(E.validateSave(s));
 for(const mutate of [q=>q.conversations.threads[id].splice(-2,1),q=>q.conversations.threads[id].at(-1).text='A different answer.',q=>q.conversations.threads[id].find(m=>m.speaker==='hero').text='Something else.']){
  const q=structuredClone(original);mutate(q);assert.equal(conversationFollowUp(nextDay(q),getContacts(q).find(p=>p.id===id),'next'),null);
 }
});
test('leaving consumes only this follow-up and durable records survive normal history pruning',()=>{
 let {s,id}=followup();const before=stable(s),bond=getContacts(s).find(p=>p.id===id).bond;s=E.replyMessage(s,id,'leave');assert.deepEqual(stable(s),before);assert.equal(getContacts(s).find(p=>p.id===id).bond,bond);assert.equal(s.conversations.followUps[0].choiceId,'leave');
 s.conversations.seen=[];s.conversations.threads[id]=[];s.conversations.relationships[id].memories=[];s=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(s);const p=getContacts(s).find(p=>p.id===id);assert.equal(conversationFollowUp(nextDay(s),p,'next'),null);
});
test('durable receipts remain valid when only part of the original message prefix is pruned',()=>{
 const {s,id}=source();
 for(const count of [1,2,3]){const q=nextDay(s);q.conversations.threads[id]=q.conversations.threads[id].slice(count);assert.ok(E.validateSave(q),'pruned '+count);const n=E.chooseAction(q,'talk_'+id);assert.equal(n.conversations.pending.snapshot.followUp.key,'repair');assert.ok(E.validateSave(n));}
});
test('legacy questions heard before sixteen cannot create an invalid adult follow-up',()=>{
 let {s,id}=source();delete s.conversations.followUps;for(const m of s.conversations.threads[id])m.age=15;
 s.age=16;s.day++;const p=getContacts(s).find(p=>p.id===id);assert.equal(conversationFollowUp(s,p,'next'),null);
});
test('follow-ups stay with the person and respect presence, age, hostility and unresolved boundaries',()=>{
 let {s,id}=source();s=nextDay(s);const p=getContacts(s).find(p=>p.id===id);assert.ok(followUpAvailable(s,p));
 for(const edit of [q=>q.id='someone-else',q=>q.age=15,q=>q.bond=14,q=>q.role='enemy',q=>q.available=false,q=>q.alive=false,q=>q.locationId='elsewhere',q=>q.roomId='gate']){const q=structuredClone(p);edit(q);assert.equal(conversationFollowUp(s,q,'next'),null);}
 for(const edit of [q=>q.age=15,q=>q.cartography.offsite=true,q=>q.cartography.pending={id:'waiting'},q=>q.timeline.journey={},q=>q.justice.prison={},q=>q.world.locations.find(l=>l.id===q.locationId).status='destroyed']){const q=structuredClone(s);edit(q);assert.equal(conversationFollowUp(q,p,'next'),null);}
 const harmed=structuredClone(s);harmed.conversations.repairs=[{personId:id,reviewedDay:null,day:s.day}];assert.equal(conversationFollowUp(harmed,p,'next'),null);
});
test('a participant leaving or becoming hostile while a follow-up waits cancels without consumption',()=>{
 for(const change of [q=>q.conversations.servicePeople[idOf(q)].serviceEndDay=q.day,q=>q.conversations.servicePeople[idOf(q)].locationId='home',q=>q.conversations.relationships[idOf(q)].bond=10]){
  let {s,id}=followup('page');change(s);const before=structuredClone(s.conversations.followUps),seq=s.conversations.sequence;s=E.replyMessage(s,id,'ask');assert.equal(s.conversations.pending,null);assert.deepEqual(s.conversations.followUps,before);assert.equal(s.conversations.sequence,seq);assert.ok(E.validateSave(s));
 }
 function idOf(s){return s.conversations.pending.personId;}
});
test('personality changes delivery and joke consequences without changing facts or work',()=>{
 let {s,id}=source();s=nextDay(s);const p=getContacts(s).find(p=>p.id===id),a=conversationFollowUp(s,{...p,disposition:'reserved'},'next'),b=conversationFollowUp(s,{...p,disposition:'bold'},'next');assert.notEqual(a.body,b.body);assert.equal(a.choices[2].effect.bond,1);assert.equal(b.choices[2].effect.bond,3);assert.deepEqual(a.followUp,b.followUp);
 const wary=conversationFollowUp(s,{...p,bond:20},'next');assert.equal(wary.choices[2].effect.bond,-2);assert.match(wary.choices[2].response,/hardly know/);for(const row of [a,b,wary])for(const c of row.choices)assert.ok(Object.keys(c.effect).every(k=>['bond','memory'].includes(k)));
 for(const disposition of ['reserved','wary','secretive','bold',undefined]){const q={...p,disposition},prior=structuredClone(s);delete prior.conversations.followUps;prior.conversations.threads[id]=[];assert.equal(conversationFollowUp(s,q,'next').choices[2].effect.bond,groundedDialogue(prior,q).choices[2].effect.bond);}
});
test('malformed receipts and follow-up snapshots are rejected while old saves remain valid',()=>{
 const {s,id}=source();const edits=[q=>q.conversations.followUps.push(structuredClone(q.conversations.followUps[0])),q=>q.conversations.followUps[0].key='invented',q=>q.conversations.followUps[0].personId='someone-else',q=>q.conversations.followUps[0].sourceDay=q.day+1,q=>q.conversations.followUps[0].sourceAge=q.age+1,q=>q.conversations.followUps[0].opening='An invented deed.',q=>q.conversations.followUps[0].sourceId='letter-999999',q=>q.conversations.followUps[0].sourceId='letter-0',q=>q.conversations.followUps[0].sourceId=q.conversations.threads[id].at(-2).id,q=>q.conversations.followUps[0].completedDay=q.day,q=>q.conversations.followUps[0].choiceId='ask'];
 for(const edit of edits){const q=structuredClone(s);edit(q);assert.equal(E.validateSave(q),false);}
 const old=structuredClone(s);delete old.conversations.followUps;assert.ok(E.validateSave(old));assert.ok(validateConversations(old.conversations,old));
 const contradiction=structuredClone(s),otherId=getContacts(s).find(p=>p.id!==id).id;const unrelated=`letter-${++contradiction.conversations.sequence}`;contradiction.conversations.threads[otherId]=[{id:unrelated,speaker:otherId,text:s.conversations.followUps[0].answer,day:s.day,age:s.age}];contradiction.conversations.followUps[0].sourceId=unrelated;assert.equal(E.validateSave(contradiction),false);
 const waiting=followup().s;for(const edit of [q=>q.conversations.pending.snapshot.followUp.personId='elsewhere',q=>q.conversations.pending.snapshot.followUp.sourceId='letter-1',q=>q.conversations.pending.snapshot.choices[0].effect.agency='withdrawn']){const q=structuredClone(waiting);edit(q);assert.equal(E.validateSave(q),false);}
});
test('actual shell submits contextual responses once and keeps another occupied slot unchanged',async t=>{
 const {s,id}=followup(),other=source('soup').s;const ui=await mountApp(t, {rulebooks:'both', states:[s,other],width:390,height:844});await ui.click('title-continue');await ui.click('tab','map');await ui.click('place-open');const waiting=structuredClone(ui.current().conversations.pending);assert.match(ui.root.innerHTML,/The Repair You Asked About|You asked what was wrong/);await ui.click('tab','character');assert.deepEqual(ui.current().conversations.pending,waiting);await ui.click('tab','map');await ui.click('place-open');const stale=ui.root.querySelector('[data-op="reply"][data-id="share"]');assert.ok(stale);await ui.click('reply','share');assert.equal(ui.current().conversations.followUps[0].choiceId,'share');assert.deepEqual(ui.lives()[1],other);const after=ui.current();await ui.fire('click',stale);assert.deepEqual(ui.current(),after);assert.ok(E.validateSave(ui.current()));
});
