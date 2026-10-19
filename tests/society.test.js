import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { initializeWorkshop } from '../dist/js/workshop.js';
import { initializeCareers, careerView, applyCareerAction, applyCareerChoice, validateCareers, onCareerTime } from '../dist/js/careers.js';
import { initializeSociety, recurringCustomer, meetSocietyCustomer, recordSocietyCommission, syncSocietyStaff, societyActions, applySocietyAction, applySocietyChoice, onSocietyTime, flushSocietyEvent, societyView, validateSociety, inheritSociety } from '../dist/js/society.js';
import { initializeConversations, getContacts, getThread, applyDialogueAction, replyToConversation, validateConversations } from '../dist/js/conversations.js';

function life(age=18,seed='the ordinary doors') {
 const s={seed,revision:5,day:age*365,age,phase:'adult',locationId:'home',world:generateWorld(seed,{expanded:true}),timeline:{mode:'birth',birthDay:0,yearTarget:null,journey:null},hero:{name:'Ari Reed',profession:'Blacksmith',path:'unformed',specialization:null,gold:1200,alive:true,hp:60,maxHp:60,mp:20,maxMp:20,attributes:{strength:3,agility:3,vitality:3,intellect:3,willpower:3,presence:3},skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0]))},life:{career:{experience:0,rank:0},people:[{id:'river',name:'Actual Friend',role:'friend',age,bond:55,alive:true,locationId:'home',occupation:'pupil',memories:[],knownFacts:[]}],plan:null,health:80,stress:10,happiness:50,children:[]},flags:{},factions:{villagers:0},event:null,battle:null,dungeon:null,obligations:[],journal:[],companions:[]};
 initializeWorkshop(s);initializeCareers(s);initializeConversations(s);initializeSociety(s);return s;
}
function context(s,limit=Infinity) {return {spendDays(days){const oldDay=s.day,actual=Math.min(days,Math.max(0,limit-s.day));s.day+=actual;s.age=Math.floor(s.day/365);for(const p of s.life.people)p.age=Math.floor(s.day/365);onCareerTime(s,actual,this);onSocietyTime(s,{oldDay,newDay:s.day},this);return actual;},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},journal(title,text,tag){s.journal.push({title,text,tag});},finishObligation(){}};}
function offer(s,index=0) {return {...careerView(s).commissions[index],quality:80};}
function meet(s,index=0) {const a=offer(s,index);meetSocietyCustomer(s,a);return a;}
function choose(s,id) {const eventId=s.event.id;assert.equal(applySocietyChoice(s,eventId,id,context(s)),true);s.event=null;assert.equal(validateSociety(s.society,s),true);}

test('optional people migration creates no earlier work, meetings, deaths, money or changed pending promise',()=>{
 const s=life(52);delete s.society;s.event={id:'old_event',body:'An exact old promise'};s.careers.active={customerName:'Original Customer',pay:87};s.conversations.pending={personId:'river',nodeId:'ordinary',topic:'ordinary-52',replies:[{id:'listen'}]};
 const before=structuredClone(s);initializeSociety(s,{migration:true});
 for(const key of Object.keys(before))assert.deepEqual(s[key],before[key],key);
 assert.equal(s.society.startedDay,s.day);assert.deepEqual(s.society.history,[]);assert.equal(s.society.project,null);assert.ok(s.society.people.every(p=>p.introducedDay===s.day));
 const established=structuredClone(s.society);initializeSociety(s);assert.deepEqual(s.society,established);
});

test('commission households recur across quarters while queries stay pure and old accepted names remain valid',()=>{
 const s=life(),before=structuredClone(s);const first=careerView(s).commissions;
 assert.deepEqual(s,before,'looking at customers never meets them');
 const a=first[0];assert.equal(applyCareerAction(s,a.actionId,context(s)),true);assert.equal(validateCareers(s.careers,s),true);
 const promised=structuredClone(s.careers.active);s.day+=90;s.age=Math.floor(s.day/365);
 assert.equal(s.careers.active.customerName,promised.customerName);assert.equal(s.careers.active.pay,promised.pay);
 s.careers.active=null;const later=careerView(s).commissions.find(c=>c.index===a.index);
 assert.equal(later.customerName,a.customerName);assert.equal(later.societyCustomerId,a.societyCustomerId);assert.notEqual(later.id,a.id);
});

test('a customer followup reserves real materials once, pauses at the birthday and rewards only completed work',()=>{
 const s=life(),a=meet(s);recordSocietyCommission(s,a,'honest');assert.equal(flushSocietyEvent(s,context(s)),true);
 const customer=s.society.people.find(p=>p.id===a.societyCustomerId),beforeGold=s.hero.gold,bond=customer.bond;
 s.equipment.materials.ore=3;s.equipment.materials.wood=3;choose(s,'repair');
 assert.equal(s.hero.gold,beforeGold-6);assert.equal(s.equipment.materials.ore,2);assert.equal(customer.bond,bond);
 const beginning=s.day;assert.equal(applySocietyAction(s,'society_continue',context(s,beginning+1)),true);
 assert.equal(s.society.project.completedDays,1);assert.equal(s.society.project.remainingDays,2);assert.equal(customer.bond,bond);assert.equal(validateSociety(s.society,s),true);
 const partial=structuredClone(s);assert.equal(applySocietyAction(s,'society_continue',context(s,s.day)),true);assert.deepEqual(s,partial,'zero actual days cannot advance, pay or repair');
 assert.equal(applySocietyAction(s,'society_continue',context(s)),true);assert.equal(s.day,beginning+3);assert.equal(s.society.project,null);assert.equal(customer.bond,bond+8);assert.equal(s.hero.gold,beforeGold-6);
 assert.ok(customer.memories.some(m=>m.includes('return')));assert.equal(validateSociety(s.society,s),true);
});

test('unaffordable or remote customer promises stay undecided; cancellation records partial work without a refund',()=>{
 const s=life(),a=meet(s);recordSocietyCommission(s,a,'community');flushSocietyEvent(s,context(s));s.hero.gold=0;
 const before=structuredClone(s);assert.equal(applySocietyChoice(s,'society_customer','teach',context(s)),false);assert.equal(s.day,before.day);assert.equal(s.hero.gold,0);assert.equal(s.society.project,null);assert.ok(s.society.pending);
 s.hero.gold=30;s.equipment.materials.ore=1;s.equipment.materials.wood=1;choose(s,'teach');const originalGold=s.hero.gold;
 applySocietyAction(s,'society_continue',context(s,s.day+1));const canceledDays=s.day;
 assert.equal(applySocietyAction(s,'society_cancel',context(s)),true);assert.equal(s.day,canceledDays);assert.equal(s.hero.gold,originalGold);assert.equal(s.society.project,null);assert.ok(s.society.history.at(-1).text.includes('no finished work'));
});

test('actual qualified staff negotiate credited work and a funded independent door, without free income or retained wages',()=>{
 const s=life(40);s.careers.shop={name:'Actual Forge',profession:'Blacksmith',locationId:'home',staff:[{id:'career-worker-1',name:'Named Learner',role:'journeyworker',age:23,bornDay:s.day-23*365,skill:32,wage:6,status:'working'}]};syncSocietyStaff(s);
 const p=s.society.people.find(p=>p.staffId),staff=s.careers.shop.staff[0];p.introducedDay=s.day-31;s.society.startedDay=p.introducedDay;syncSocietyStaff(s);flushSocietyEvent(s,context(s));
 s.equipment.materials.cloth=10;choose(s,'credit');assert.equal(staff.wage,6);applySocietyAction(s,'society_continue',context(s));assert.equal(staff.wage,7);assert.equal(p.stage,1);
 const oldDay=s.day;context(s).spendDays(91);flushSocietyEvent(s,context(s));assert.equal(s.event.id,'society_staff');
 s.equipment.materials.wood=10;s.equipment.materials.ore=3;const gold=s.hero.gold;choose(s,'launch');assert.equal(s.hero.gold,gold-600);assert.equal(staff.status,'working');
 applySocietyAction(s,'society_continue',context(s,s.day+4));assert.equal(staff.status,'working');assert.equal(s.society.project.completedDays,4);applySocietyAction(s,'society_continue',context(s));flushSocietyEvent(s,context(s));assert.equal(s.event.id,'society_launch');
 choose(s,'independent');assert.equal(staff.status,'retired');assert.equal(staff.retirementKind,'independent');assert.equal(p.status,'independent');assert.equal(s.hero.gold,gold-600);assert.equal(s.society.project,null);assert.ok(s.day>=oldDay+105);assert.equal(validateSociety(s.society,s),true);
});

test('peers choose careers, may move and retire prospectively; later years meet a new actual cohort',()=>{
 const s=life(17),p=s.life.people[0],oldDay=s.day;context(s).spendDays(365);
 assert.notEqual(p.occupation,'pupil');assert.ok(s.world.locations.some(a=>a.id===p.locationId));assert.equal(s.society.people[0].stage,1);
 const importState=life(64);context(importState).spendDays(365);assert.match(importState.life.people[0].occupation,/^retired /);assert.equal(importState.life.people[0].alive,true);
 const later=life(35);context(later).spendDays(365);const newcomers=societyView(later).people;assert.equal(newcomers.length,1);assert.equal(newcomers[0].introducedDay,later.day);assert.ok(newcomers[0].age>=28 && newcomers[0].age<56);
 const snap=structuredClone(later);societyView(later);societyActions(later);assert.deepEqual(later,snap,'views do not alter NPC lives');
 context(later).spendDays(1);assert.equal(societyView(later).people.length,1,'calendar cohort never rerolls on another day');
 assert.ok(s.day>oldDay);assert.equal(validateSociety(later.society,later),true);
});

test('real customers have named readable correspondence and per-year boundaries without generated money or training',()=>{
 const s=life(),a=meet(s);const id=a.societyCustomerId,before=structuredClone(s.hero);
 assert.ok(getContacts(s).some(c=>c.id===id && c.role==='recurring customer'));
 assert.equal(applyDialogueAction(s,`talk_${id}`,context(s)),true);assert.equal(validateConversations(s.conversations,s),true);assert.equal(replyToConversation(s,id,'choice',context(s)),true);
 assert.deepEqual(s.hero,before);assert.equal(getThread(s,id).messages.length,3);assert.equal(s.society.people.find(p=>p.id===id).memories.length,2);assert.equal(validateConversations(s.conversations,s),true);
 const thread=structuredClone(getThread(s,id));applyDialogueAction(s,`talk_${id}`,context(s));assert.deepEqual(getThread(s,id),thread);
});

test('a prospective customer death preserves their correspondence and a new commission belongs to a new household',()=>{
 const s=life(),a=meet(s),original=s.society.people.find(p=>p.id===a.societyCustomerId);
 applyDialogueAction(s,`talk_${original.id}`,context(s));replyToConversation(s,original.id,'hear',context(s));const messages=structuredClone(getThread(s,original.id).messages);
 context(s).spendDays((original.deathAge-original.age+1)*365);
 const dead=s.society.archive.find(p=>p.id===original.id);assert.ok(dead);assert.equal(dead.alive,false);assert.equal(dead.age,dead.deathAge);assert.equal(dead.deathDay,dead.bornDay+dead.deathAge*365);
 assert.ok(!getContacts(s).some(p=>p.id===dead.id));assert.deepEqual(getThread(s,dead.id).messages,messages);
 const next=recurringCustomer(s,'Blacksmith','home',a.index);assert.notEqual(next.id,dead.id);assert.notEqual(next.name,dead.name);assert.equal(validateSociety(s.society,s),true);assert.equal(validateConversations(s.conversations,s),true);
 context(s).spendDays(365);assert.equal(dead.age,dead.deathAge,'remembered age does not creep across later generations');
});

test('a deferred named request can be prepared through later activities without a free lesson or forced refusal',()=>{
 const s=life(),a=meet(s);recordSocietyCommission(s,a,'honest');flushSocietyEvent(s,context(s));const p=s.society.people.find(p=>p.id===a.societyCustomerId),hero=structuredClone(s.hero);
 choose(s,'prepare');assert.deepEqual(s.hero,hero);assert.equal(p.requestDeferred,true);
 const action=societyActions(s).find(a=>a.id===`society_revisit_${p.id}`);assert.ok(action);
 s.equipment.materials.ore=1;s.equipment.materials.wood=1;
 assert.equal(applySocietyAction(s,action.id,context(s)),true);assert.equal(s.event.id,'society_customer');choose(s,'repair');assert.equal(s.society.project.remainingDays,3);assert.equal(p.requestDeferred,false);
 const started=s.day;s.timeline.yearTarget=s.day+1;assert.ok(societyActions(s).some(a=>a.id==='society_continue'),'paused yearly progression permits honoring the promise');
 applySocietyAction(s,'society_continue',context(s,started+1));assert.equal(s.society.project.remainingDays,2);assert.equal(validateSociety(s.society,s),true);
});

test('an older imported colleague is never killed on a retroactive date',()=>{
 const s=life(160);s.careers.shop={name:'Recorded Old Shop',profession:'Blacksmith',locationId:'home',staff:[{id:'career-worker-1',name:'Actual Elder',bornDay:s.day-150*365,age:150,status:'retired',role:'worker',skill:30,wage:6}]};
 syncSocietyStaff(s);const elder=s.society.people.find(p=>p.staffId);assert.equal(elder.age,150);assert.ok(elder.deathAge>=158);assert.equal(elder.alive,true);
 context(s).spendDays(1);assert.equal(elder.alive,true);assert.equal(elder.deathDay,null);assert.equal(validateSociety(s.society,s),true);
});

test('succession keeps actual NPC lives while separating the child’s private knowledge and unfinished promises',()=>{
 const parent=life(52),a=meet(parent),p=parent.society.people.find(p=>p.id===a.societyCustomerId);p.knownFacts.push('vampire');p.status='retired';recordSocietyCommission(parent,a,'community');
 const child={...structuredClone(parent),hero:{...parent.hero,name:'Their Actual Child'},timeline:{...parent.timeline,birthDay:parent.day-12*365},age:12};delete child.society;
 inheritSociety(parent,child);const retained=child.society.people.find(q=>q.id===p.id);
 assert.equal(retained.name,p.name);assert.equal(retained.bornDay,p.bornDay);assert.equal(retained.status,'retired');assert.deepEqual(retained.knownFacts,[]);assert.equal(retained.bond,20);assert.equal(child.society.queued,null);assert.equal(child.society.project,null);assert.equal(parent.society.people.find(q=>q.id===p.id).knownFacts[0],'vampire');
 assert.ok(retained.memories.at(-1).includes('must become'));assert.equal(validateSociety(child.society,child),true);
 const forged=structuredClone(child.society);forged.people.push(structuredClone(forged.people[0]));assert.equal(validateSociety(forged,child),false);
});

test('a successor’s new peer cannot replace the parent’s independently remembered friend',()=>{
 const previous=life(50),older=previous.society.people.find(p=>p.sourcePersonId==='river');
 const next=life(12);next.day=previous.day;next.timeline.birthDay=previous.day-12*365;next.life.people[0].name='An Actual New Classmate';next.life.people[0].bornDay=next.timeline.birthDay;next.life.people[0].age=12;
 inheritSociety(previous,next);
 const old=next.society.people.find(p=>p.id===older.id),young=next.society.people.find(p=>p.sourcePersonId==='river');
 assert.equal(old.name,'Actual Friend');assert.equal(old.sourcePersonId,null);assert.notEqual(old.id,young.id);assert.equal(young.name,'An Actual New Classmate');assert.equal(young.age,12);
 context(next).spendDays(365);assert.equal(old.name,'Actual Friend');assert.equal(young.name,'An Actual New Classmate');assert.equal(validateSociety(next.society,next),true);
});

test('a former peer who is an actual successor parent retains one contact identity and family autonomy',()=>{
 const previous=life(50),older=previous.society.people.find(p=>p.sourcePersonId==='river');
 const next=life(12);next.day=previous.day;next.timeline.birthDay=previous.day-12*365;next.life.people[0].name='Actual New Peer';next.life.people[0].bornDay=next.timeline.birthDay;
 next.life.people.push({id:'family_parent',name:older.name,bornDay:older.bornDay,age:50,bond:65,alive:true,role:'relative',familyRole:'parent',occupation:'their actual family work',locationId:'home',memories:[],knownFacts:[]});
 inheritSociety(previous,next);const retained=next.society.people.find(p=>p.id===older.id);
 assert.equal(retained.sourcePersonId,'family_parent');assert.equal(getContacts(next).filter(p=>p.name===older.name).length,1);
 context(next).spendDays(365);assert.equal(next.life.people.find(p=>p.id==='family_parent').occupation,'their actual family work','society does not take over a family member’s profession');
});
