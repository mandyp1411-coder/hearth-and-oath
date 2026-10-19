// Shared engine-validation lane only. These are bounded diagnostic fixtures,
// not assertions that the published parent's original infant lived eighteen years.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../dist/js/engine.js';
import { normalizePreferences } from '../dist/js/preferences.js';
import { completeLineageHistory, lineageView } from '../dist/js/lineage.js';
import { familyResidence } from '../dist/js/household-residence.js';
import { getContacts } from '../dist/js/conversations.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { legacyPage } from '../dist/js/dynasty-ui.js';

const published=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states.parent;
const row=(s,id='child-1')=>s.lineage.people.find(p=>p.source==='child'&&p.localId===id);
function fixture(interest='craft',{bothAdults=false}={}) {
 const raw=structuredClone(published);raw.hero.gold=1000;
 for(const [i,c]of raw.life.children.entries())if(i===0||bothAdults){c.bornDay=raw.day-18*365;c.age=18;}
 const s=E.migrateSave(raw);assert.ok(s);s.event=null;
 row(s).preferences=normalizePreferences({pursuit:interest});if(bothAdults)row(s,'child-2').preferences=normalizePreferences({pursuit:'trade'});
 assert.ok(E.validateSave(s));return s;
}
function action(s,id) {
 const available=E.getActions(s).find(a=>a.id===id);assert.ok(available&&!available.disabledReason,`${id}: ${available?.disabledReason}`);
 const before=structuredClone(s),n=E.chooseAction(s,id);assert.deepEqual(s,before);assert.ok(E.validateSave(n),`${id}: ${n.notice}`);return n;
}
function choice(s,id) {assert.ok(s.event?.choices.some(c=>c.id===id));const n=E.chooseEventOption(s,id);assert.ok(E.validateSave(n),`${s.event.id}/${id}: ${n.notice}`);return n;}
function home(s) {for(const id of settlementWalkPath(s,'homes'))s=action(s,'atlas_room_'+id);return s;}
function autoChoice(s) {
 const safe=['care','support','share','continue','wait','later','leave','curiosity','people'];
 const c=safe.map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason);
 assert.ok(c);return choice(s,c.id);
}
function year(s) {
 s=E.ageUp(s);assert.ok(E.validateSave(s));
 for(let count=0;count<100&&(s.event||s.timeline.yearTarget!==null);count++)s=s.event?autoChoice(s):E.continueAgeUp(s);
 assert.equal(s.event,null);assert.equal(s.timeline.yearTarget,null);assert.ok(E.validateSave(s));return s;
}
function closedChapterFixture(s) {
 // The published parent is only nineteen after this bounded diagnostic year.
 // Set up a closed chapter, without bypassing the real age-thirty action gate
 // or claiming twelve additional years were simulated. Succession stays public.
 s=structuredClone(s);s.phase='retired';s.event=null;s.chronicle=`${s.hero.name}'s diagnostic closed family chapter.`;
 completeLineageHistory(s);assert.ok(E.validateSave(s));return s;
}

test('engine: old adult views/migration are lazy; one explicit funded answer preserves typed scene and charges once',()=>{
 let s=fixture();const before=structuredClone(s);lineageView(s);E.getActions(s);assert.equal(row(s).adultLife,undefined);assert.deepEqual(s,before);assert.deepEqual(E.migrateSave(structuredClone(s)),s);
 s=home(s);s=action(s,'lineage_future_child-1');assert.equal(s.event.id,'lineage_future');assert.match(s.event.body,/blacksmith work/);assert.match(s.event.body,/not which identity/);assert.deepEqual(E.migrateSave(structuredClone(s)),s);
 const gold=s.hero.gold;s=choice(s,'fund');assert.equal(s.hero.gold,gold-20);assert.equal(row(s).adultLife.response,'fund');assert.equal(row(s).adultLife.goal.profession,'Blacksmith');assert.match(s.notice,/one-off 20-gold start/);assert.ok(!E.getActions(s).some(a=>a.id==='lineage_future_child-1'));
 const duplicate=E.chooseEventOption(s,'fund');assert.equal(duplicate.hero.gold,s.hero.gold);assert.ok(E.validateSave(duplicate));
});
test('engine: a stale unaffordable support choice leaves the exact pending question and savings unchanged',()=>{
 let s=home(fixture());s=action(s,'lineage_future_child-1');s.hero.gold=19;assert.ok(E.validateSave(s));const n=E.chooseEventOption(s,'fund');assert.equal(n.hero.gold,19);assert.equal(n.event.id,'lineage_future');assert.equal(row(n).adultLife.response,null);assert.ok(E.validateSave(n));s=choice(n,'decline');assert.equal(s.hero.gold,19);assert.equal(row(s).adultLife.goal.profession,'Blacksmith');
});
test('engine: ordinary AgeUp records the bounded placement and one optional milestone, not annual prompts or child income',()=>{
 let s=home(fixture());s=action(s,'lineage_future_child-1');s=choice(s,'listen');const skills=structuredClone(s.hero.skills);s=year(s);const v=row(s).adultLife;assert.equal(v.work.trainingDays,14);assert.equal(v.work.experience,10);assert.equal(v.status,'milestoneReady');assert.equal(v.residence.kind,'independent_lodgings');assert.equal(v.eligibleDays,90);assert.ok(!s.lineage.queue.some(q=>q.eventId!=='lineage_bereavement'));
 s=home(s);s=action(s,'lineage_independence_child-1');assert.match(s.event.body,/No financial support|without making a financial promise/);s=choice(s,'space');assert.equal(row(s).adultLife.status,'settled');assert.match(s.notice,/permanent invitation/);assert.ok(!E.getActions(s).some(a=>a.id==='lineage_independence_child-1'));assert.ok(s.hero.skills.weapons>=skills.weapons);
 const estate=structuredClone(s.life.home);s.life.home={...s.life.home,tier:'townhouse',locationId:'city'};assert.equal(familyResidence(s,s.life.children[0]),v.residence.locationId);assert.equal(getContacts(s).find(p=>p.id==='child-1').locationId,v.residence.locationId);assert.notEqual(s.life.home.locationId,v.residence.locationId);assert.equal(estate.locationId,v.residence.locationId);assert.ok(E.validateSave(s));
});
test('engine: public successor carries only their own job/training, keeps siblings at their recorded address and conserves estate cash',()=>{
 let s=home(fixture('craft',{bothAdults:true}));s=action(s,'lineage_future_child-1');s=choice(s,'decline');s=year(s);const own=structuredClone(row(s).adultLife),sibling=structuredClone(row(s,'child-2').adultLife);assert.ok(sibling.residence);
 s.hero.skills.weapons=99;s.careers.records.Scholar.experience=1800;s.careers.records.Scholar.mastery=4;s.careers.records.Scholar.workedDays=1800;s.careers.records.Scholar.paidWorkedDays=1800;s.careers.records.Scholar.earnedGold=9999;s.life.home={...s.life.home,tier:'townhouse',locationId:'city'};s.hero.gold=101;s=closedChapterFixture(s);
 const estate=s.hero.gold,expectedSkills=structuredClone(row(s).development.skills),before=structuredClone(s),n=E.continueAsChild(s,'child-1');assert.deepEqual(s,before);assert.equal(n.dynasty.generation,2);assert.ok(E.validateSave(n));assert.equal(n.hero.profession,'Blacksmith');assert.equal(n.careers.records.Blacksmith.experience,10);assert.equal(n.careers.records.Blacksmith.workedDays,14);assert.equal(n.careers.records.Blacksmith.earnedGold,0);assert.equal(n.careers.records.Scholar.experience,0);assert.equal(n.life.career.rank,0);assert.equal(n.life.career.experience,0);assert.deepEqual(n.hero.skills,expectedSkills);assert.equal(n.hero.specialization,null);assert.equal(n.locationId,own.residence.locationId);assert.equal(n.life.home.locationId,'city');
 const kin=n.life.people.find(p=>p.familyRole==='sibling');assert.equal(kin.locationId,sibling.residence.locationId);assert.equal(kin.occupation,'Merchant');const inheritance=n.dynasty.history.at(-1).inheritance;assert.equal(n.hero.gold+inheritance.shares.reduce((a,p)=>a+p.gold,0),estate);assert.equal(n.hero.gold,inheritance.gold);assert.ok(n.journal.some(r=>r.eventId==='child_livelihood_inherited'&&/14 recorded unpaid training days/.test(r.text)));assert.deepEqual(E.migrateSave(structuredClone(n)),n);
});
test('engine: actual adult study resumes separately from earlier academy preparation without inventing certification',()=>{
 let s=fixture('knowledge');const p=row(s);p.development.education={route:'academy',attendance:3,qualifications:[]};p.development.skills.scholarship=3;p.development.skills.arcana=3;assert.ok(E.validateSave(s));s=home(s);s=action(s,'lineage_future_child-1');s=choice(s,'listen');s=year(s);assert.equal(row(s).adultLife.study.attendance,4);assert.equal(row(s).development.education.qualifications.length,0);s=closedChapterFixture(s);const n=E.continueAsChild(s,'child-1');assert.equal(n.dynasty.generation,2);assert.ok(E.validateSave(n));assert.equal(n.hero.profession,'Unemployed');assert.equal(n.education.route,'community');assert.equal(n.education.attendance,4);assert.equal(n.education.progress,4);assert.equal(n.education.courseBook.paused.academy.attendance,3);assert.equal(n.education.courseBook.paused.academy.progress,3);assert.equal(Object.hasOwn(n.flags,'certified'),false,'no certificate flag is created by four adult study sessions');assert.equal(n.education.qualifications.length,0);
});
test('engine: new family card exposes the real adult goal and optional actions without mutating the save',()=>{
 const s=home(fixture()),before=structuredClone(s);const ui={e:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),title:x=>String(x),button:(text,op,id)=>`<button data-op="${op}" data-id="${id}">${text}</button>`,chapter:(title,body)=>`<h1>${title}</h1><p>${body}</p>`,meter:()=>'',paragraphs:x=>`<p>${x}</p>`,date:x=>String(x),historyList:()=>'',livingCosts:()=>'',actionCards:rows=>rows.map(a=>`<button data-id="${a.id}">${a.label}</button>`).join('')};
 const html=legacyPage(s,ui);assert.match(html,/lineage_future_child-1/);assert.deepEqual(s,before);
});
