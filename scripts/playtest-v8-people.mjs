import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { LifeRun, engine, ordinaryChoice } from './playtest-utils.mjs';
import { careerView } from '../dist/js/careers.js';
import { getContacts } from '../dist/js/conversations.js';

function policy(event,s) {
 const ids=event.choices.map(c=>c.id),has=id=>ids.includes(id),m=s.equipment?.materials || {};
 if(event.id==='society_customer')return s.hero.gold>=12 && m.ore>=1 && m.wood>=1 ? (s.society.pending.stage?'teach':'repair'):'prepare';
 if(event.id==='society_staff')return has('credit')?(m.cloth>=1 && s.hero.gold>=8?'credit':'prepare'):(m.wood>=6 && m.cloth>=4 && m.ore>=2 && s.hero.gold>=600?'launch':'prepare');
 if(event.id==='health_concern')return s.health?.pending?.kind==='physical'?(s.hero.gold>=6?'care':'rest'):'support';
 const exact={society_launch:'independent',society_neighbor:'welcome',career_staff:'apprentice',career_invoice:'honest',career_year:'care',school_exam:'present',plague_letter:'later',health_concern:'support',lineage_bereavement:'share',life_birthday:'people',retirement:'settle',annual_deadline_review:'pause'}[event.id];
 if(exact && has(exact))return exact;
 const ordinary=ordinaryChoice(event);if(ordinary)return ordinary;
 return ['choice','help','share','listen','care','support','people','question','public','present','later','defer','decline','wait','private','honest'].find(has) || ids[0];
}
class PeopleRun extends LifeRun {
 settle(p=policy,limit=300) {
  for(let i=0;i<limit;i++){super.settle(p);if(!this.state.society?.project)return this;this.act('society_continue');}
  throw new Error('A named commitment did not finish');
 }
 supplies(requirements) {
  this.settle();for(const [id,n] of Object.entries(requirements))while(this.state.equipment.materials[id]<n)this.act(`career_buy_${id}`).settle();return this;
 }
 shiftMonths(n=1) {for(let i=0;i<n;i++)this.act('career_batch_month').finishBatch().settle();return this;}
 commission(index=0) {
  this.settle();let candidates=careerView(this.state).commissions.filter(c=>!c.gearId || this.state.workshop.crafting>=2);
  if(!candidates.length){this.shiftMonths(3);candidates=careerView(this.state).commissions.filter(c=>!c.gearId || this.state.workshop.crafting>=2);}
  const offer=candidates.find(c=>c.index===index) || candidates[0];assert.ok(offer);
  this.act(offer.actionId).settle();this.supplies({...this.state.careers.active.materials,ore:4,wood:6,cloth:6});
  this.act('career_make_standard').settle().act('career_invoice').settle();return offer;
 }
 revisitAll() {
  for(let i=0;i<10;i++){const a=engine.getActions(this.state).find(a=>a.id.startsWith('society_revisit_') && !a.disabledReason);if(!a)return this;this.act(a.id).settle();}throw new Error('Deferred promises did not finish');
 }
}

const maker=new PeopleRun('v8-people-maker',{name:'Avel Openhand',seed:'v8-society-maker-2407',birthplace:'village',household:'poor',familySetup:'single_parent'},policy);
maker.grow(6).act('school_enroll_community').settle().grow(16).act('career_choose_blacksmith').settle().grow(18);
for(let i=0;i<12;i++)maker.act('career_work').settle();
maker.act('career_open_shop').settle().act('career_hire').settle();maker.supplies({wood:12,cloth:12,ore:6});
const first=maker.commission(0);const customer=maker.state.society.people.find(p=>p.id===first.societyCustomerId);assert.ok(customer?.memories.some(m=>m.includes('return')));
maker.shiftMonths(3);const second=maker.commission(first.index);assert.equal(second.customerName,first.customerName);assert.equal(second.societyCustomerId,first.societyCustomerId);
maker.shiftMonths(3).commission(first.index);assert.ok(customer.id);
for(let i=0;i<3;i++)maker.shiftMonths(3).commission(first.index);
const experiencedHousehold=maker.state.society.people.find(p=>p.id===first.societyCustomerId);
assert.ok(experiencedHousehold.deliveries>=6);assert.equal(experiencedHousehold.stage,3,'the third authored household concern is actually played');
for(let i=0;i<16 && maker.state.careers.shop.staff[0].status==='working';i++){
 maker.supplies({wood:10,cloth:8,ore:4});maker.act('career_mentor').settle();maker.shiftMonths(1).revisitAll();
}
assert.equal(maker.state.careers.shop.staff[0].retirementKind,'independent');
const independent=maker.state.society.people.find(p=>p.staffId);assert.equal(independent.status,'independent');
maker.act(`talk_${independent.id}`).settle();assert.ok(getContacts(maker.state).some(c=>c.id===independent.id));
maker.grow(48).settle();assert.ok(maker.state.society.people.some(p=>p.role==='neighbor'));maker.retire();
const makerSummary={...maker.save('artifacts/playtest/v8-people'),customer:{id:first.societyCustomerId,name:first.customerName},independent:{id:independent.id,name:independent.name,goal:independent.goal},newNeighbors:maker.state.society.people.filter(p=>p.role==='neighbor').map(p=>({id:p.id,name:p.name,age:p.age})),societyHistory:maker.state.society.history};

const long=new PeopleRun('v8-people-longlife',{name:'Neris Coalbound',seed:'v8-society-long-3119',birthplace:'village',household:'tradesfolk',familySetup:'two_parents',appearance:{ancestry:'elf'}},policy);
long.grow(16).act('career_choose_blacksmith').settle().grow(18);long.shiftMonths(2).supplies({wood:8,cloth:8,ore:8});
const old=long.commission(0),oldPerson=long.state.society.people.find(p=>p.id===old.societyCustomerId);
long.act(`talk_${oldPerson.id}`).settle();
const targetAge=Math.max(100,18+oldPerson.deathAge-oldPerson.age+1);
long.grow(targetAge).settle();assert.equal(long.state.phase,'adult','The long-lived ancestry genuinely survives the customer');
assert.ok(long.state.society.archive.some(p=>p.id===oldPerson.id && !p.alive));assert.ok(!getContacts(long.state).some(p=>p.id===oldPerson.id));
const replacement=long.commission(old.index);assert.notEqual(replacement.societyCustomerId,old.societyCustomerId);assert.notEqual(replacement.customerName,old.customerName);
long.retire();const longSummary={...long.save('artifacts/playtest/v8-people'),originalCustomer:{id:old.societyCustomerId,name:old.customerName},replacement:{id:replacement.societyCustomerId,name:replacement.customerName},rememberedPeople:long.state.society.archive.map(p=>({id:p.id,name:p.name,deathDay:p.deathDay,age:p.age})),societyHistory:long.state.society.history};
mkdirSync('docs/playtest',{recursive:true});writeFileSync('docs/playtest/v8-people.json',JSON.stringify({edition:'v0.8',method:'Two actual birth-to-retirement public-API lives; no resource, skill, state or calendar grants.',lives:[makerSummary,longSummary]},null,2)+'\n');
console.log(JSON.stringify({lives:2,operations:maker.log.length+long.log.length,makerAge:maker.state.age,longAge:long.state.age,independent:independent.name,replacedCustomer:old.customerName,replacement:replacement.customerName},null,2));
