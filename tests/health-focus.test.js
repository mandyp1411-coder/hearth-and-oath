import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const release=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version;
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { healthView, healthActions, recoveryActions, recoveryView, applyRecoveryAction, flushHealthEvent, onHealthTime, validateHealth } from '../dist/js/health.js';
import { recoveryPanel } from '../dist/js/life-ui.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled acceptance fixtures, public commands and the production semantic
// UI surface. These are not extra audited lives or browser layout measurements.
function roundtrip(s) { assert.ok(E.validateSave(s),s.notice); assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s); return s; }
function settle(s) { for(let n=0;n<200;n++) {
  if(s.event) { const c=['continue','later','quiet','care','support','keep','leave'].map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason); s=E.chooseEventOption(s,c.id); }
  else if(s.timeline.yearTarget!=null&&!E.getLifeCommitment(s)) s=E.continueAgeUp(s);
  else return roundtrip(s);
} throw Error('Fixture did not settle'); }
const base=settle(await createLifeAtAge({seed:'health-focus-twelve',originId:'hearthborn',startAge:22,difficulty:'gentle'}));
function fresh() { const s=structuredClone(base);s.hero.gold=1000;s.hero.hp=s.hero.maxHp;s.health.physical=[];s.health.mental=[];s.health.pending=null;s.health.recovery=null;s.life.happiness=60;s.life.stress=20;s.life.health=80;return roundtrip(s); }
function condition(s,type,severity=1,{ageDays=0,cared=0,acknowledged=true,circumstance}={}) { const c={id:`${type}-${s.day}`,type,severity,sinceDay:s.day-ageDays,lastEffectDay:s.day,careUntil:cared?s.day+cared:0,acknowledged,...(circumstance?{circumstance}:{})};s.health[['injury','fever','infection','chronic'].includes(type)?'physical':'mental'].push(c);return c; }
function act(s,id) {
  s=atService(s,id); const a=E.getActions(s).find(a=>a.id===id);assert.ok(a,id);assert.ok(!a.disabledReason,a.disabledReason);return roundtrip(E.chooseAction(s,id)); }
function openConcern(s,type,severity=1,options={}) { const c=condition(s,type,severity,{...options,acknowledged:false});flushHealthEvent(s,{setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}});assert.equal(s.event.id,'health_concern');return c; }
function nearBirthday() { const s=fresh(); const day=(s.timeline.birthDay||0)+(s.age+1)*365-5;s.day=day;s.health.lastPhysicalCheckDay=day;s.health.lastMentalCheckDay=day;s.health.lastAgeCheckYear=Math.floor(day/365);if(s.fortune)s.fortune.lastSeason=Math.floor((day+5)/92);/* these cases measure recovery fees, not the season's luck */return roundtrip(s); }
const plainUi={e:String,button:(label,op,id)=>`<button data-op="${op}" data-id="${id}">${label}</button>`,actionCards:rows=>rows.map(a=>`<p>${a.label}: ${a.description}</p>`).join('')};

test('full combat HP and very low bodily wellbeing have distinct effects and a usable care route',()=>{
 const s=fresh();s.life.health=12;const before=structuredClone(s),v=healthView(s);assert.equal(v.combatHp,v.maxCombatHp);assert.equal(v.bodilyHealth,12);assert.match(v.concern,/Below 35.*risk even when health is full/);assert.match(v.hpPurpose,/zero.*battle/);assert.match(v.bodilyPurpose,/frailty in advanced age/);assert.equal(v.suggestionIds[0],'health_rest');assert.ok(E.getActions(s).some(a=>a.id==='health_rest'&&!a.disabledReason));assert.deepEqual(s,before);
});
test('low HP with sound bodily wellbeing directs immediate recovery without inventing a condition',()=>{
 const s=fresh();s.hero.hp=3;const v=healthView(s);assert.match(v.concern,/immediate endurance/);assert.equal(v.bodilyHealth,80);assert.equal(v.physical.length,0);assert.equal(v.mental.length,0);assert.equal(v.suggestionIds[0],'health_rest');
});
test('a full-HP character still receives a relevant route for recorded bodily and emotional concerns',()=>{
 const s=fresh();condition(s,'chronic',2);assert.equal(healthView(s).suggestionIds[0],'health_routine');assert.match(healthView(s).concern,/severity 2\/3 despite full health/);s.health.physical=[];condition(s,'anxiety',2);assert.equal(healthView(s).suggestionIds[0],'health_support');
});
test('current bodily care and daily routine apply their separate HP and wellbeing gains',()=>{
 let s=fresh();s.hero.hp=s.hero.maxHp-30;s.life.health=10;const old=structuredClone(s);s=act(s,'health_rest');assert.ok(s.hero.hp>old.hero.hp);assert.equal(s.life.health,16);assert.ok(s.life.health<35,'restored HP can coexist with low bodily wellbeing');const hp=s.hero.hp;s=act(s,'health_routine');assert.ok(s.hero.hp>=hp);assert.equal(s.life.health,20);assert.equal(s.day,old.day+6);
});
test('condition progress shows the actual care window and emotional wellbeing requirements',()=>{
 const s=fresh();const c=condition(s,'depression',2,{cared:30});const v=healthView(s).mental[0];assert.match(v.care,new RegExp('already supported through day '+c.careUntil));assert.match(v.progress,/35 days since onset, joy 40\+ and stress 65 or less/);assert.ok(v.progress.includes('day '+(c.lastEffectDay+14)));assert.equal(s.health.mental[0].severity,2);
});
for(const [type,first] of [['fever','rest'],['infection','rest'],['injury','rest'],['chronic','routine'],['distress','support'],['anxiety','support'],['depression','support']])test(`${type} leads with its relevant health choice`,()=>{
 const s=fresh();openConcern(s,type);assert.equal(s.event.choices[0].id,first);assert.ok(s.event.choices.some(c=>c.id==='continue'));assert.ok(s.event.choices.some(c=>c.id==='routine'));roundtrip(s);
});
test('early-childhood care describes adult help and free sponsorship without inventing parents',()=>{
 const s=settle(E.createBirthGame({seed:'health-young',name:'Ilex',familySetup:'orphan'}));const family=structuredClone(s.family);openConcern(s,'fever');assert.match(s.event.body,/Familiar adults notice your discomfort/);assert.doesNotMatch(s.event.body,/your work/);assert.deepEqual(s.event.choices.map(c=>c.id),['continue']);const n=E.chooseEventOption(s,'continue');assert.equal(n.day,s.day+3);assert.equal(n.hero.gold,s.hero.gold);assert.deepEqual(n.family,family);roundtrip(n);
});
test('an older chronic concern acknowledges its existing routine and keeps its recorded history',()=>{
 const s=fresh();s.age=70;const c=openConcern(s,'chronic',2,{cared:30,circumstance:'later_life'});assert.match(s.event.body,/At age 70, in later life/);assert.match(s.event.body,/already supported/);assert.match(s.event.body,/without promising to remove it/);assert.match(s.event.choices[0].label,/Continue a gentle/);assert.equal(c.severity,2);
});
test('recorded exposure and unknown older causes are distinguished without making up an injury cause',()=>{
 const s=fresh();openConcern(s,'injury',1,{circumstance:'outdoors'});assert.match(s.event.body,/outdoor exposure.*not a confirmed cause/);s.event=null;s.health.pending=null;s.health.physical=[];openConcern(s,'injury');assert.match(s.event.body,/original cause was not recorded/);assert.doesNotMatch(s.event.body,/outdoor exposure/);
});
test('new concerns prioritize demanding unsupported symptoms without replacing an already open scene',()=>{
 const s=fresh();condition(s,'fever',1,{acknowledged:false,cared:30});const c=condition(s,'anxiety',3,{acknowledged:false});flushHealthEvent(s,{setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}});assert.equal(s.health.pending.conditionId,c.id);const saved=structuredClone(s);flushHealthEvent(s,{});assert.deepEqual(s,saved);roundtrip(s);
});
test('the new routine choice pays its actual three days and provides both kinds of care',()=>{
 let s=fresh();openConcern(s,'chronic',2);const day=s.day,gold=s.hero.gold,billed=s.householdBudget.paidGold;s=roundtrip(E.chooseEventOption(s,'routine'));assert.equal(s.day,day+3);assert.equal(s.hero.gold,gold-(s.householdBudget.paidGold-billed));assert.ok(s.health.care.restUntil>=s.day+14);assert.ok(s.health.care.supportUntil>=s.day+14);assert.equal(s.health.physical.length,1);
});
test('older saved health concern words and choices remain exact on import',()=>{
 const s=fresh();openConcern(s,'fever');s.event.title='The old saved title';s.event.body='The original saved concern.';s.event.choices=s.event.choices.filter(c=>c.id!=='routine');const saved=JSON.stringify(s.event),n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(JSON.stringify(n.event),saved);assert.ok(E.validateSave(n));assert.equal(E.chooseEventOption(n,'continue').health.pending,null);
});
test('both plan previews disclose care versus attendance, full duration and the once-only fee',()=>{
 const s=fresh(),actions=recoveryActions(s),before=structuredClone(s),html=recoveryPanel(s,plainUi);for(const days of [14,28,56])for(const kind of ['free','guided']){const a=actions.find(a=>a.id===`recovery_begin_${kind}_${days}`);assert.equal(a.durationDays,days);assert.equal(a.days,0);assert.match(a.description,/physical and emotional care.*separate recovery checks/);}assert.match(html,/completing the plan does not guarantee/);assert.match(html,/21 days since onset \(35 for depressive symptoms\)/);assert.match(html,/separate rest, support or healer session.*no plan attendance/);assert.deepEqual(s,before);
});
test('quiet recovery supplies actual symptom care and can resolve a supported physical concern',()=>{
 let s=fresh();condition(s,'fever');const day=s.day;s=act(s,'recovery_begin_free_14');assert.equal(s.day,day+14);assert.equal(s.health.recovery,null);assert.equal(s.health.physical.some(c=>c.type==='fever'),false);const receipt=s.health.history.findLast(h=>h.result==='plan_completed');assert.equal(receipt.careDays,14);assert.equal(receipt.attendedDays,14);assert.match(receipt.text,/14\/14 actual plan days attended/);roundtrip(s);
});
test('plan completion and remaining depressive symptoms are explicitly separate',()=>{
 let s=fresh();condition(s,'depression',2);s=act(s,'recovery_begin_free_14');assert.equal(s.health.recovery,null);assert.equal(s.health.mental[0].severity,2);assert.ok(s.health.mental[0].careUntil>=s.day+14);const receipt=s.health.history.findLast(h=>h.result==='plan_completed');assert.match(receipt.text,/Symptoms still recorded: Depressive symptoms 2\/3/);assert.match(receipt.text,/plan completion is separate from symptom recovery/);
});
test('supported emotional care responds only after the lived onset and wellbeing requirements',()=>{
 let s=fresh();condition(s,'anxiety');s=act(s,'recovery_begin_free_28');assert.equal(s.health.mental.some(c=>c.type==='anxiety'),false);let d=fresh();condition(d,'depression');d=act(d,'recovery_begin_free_28');assert.ok(d.health.mental.some(c=>c.type==='depression'),'28 days cannot meet a 35-day onset requirement');
});
test('birthday interruption preserves separate attendance, care credit, quoted fee and remaining days',()=>{
 let s=nearBirthday();condition(s,'chronic',2);const original=structuredClone(s),gold=s.hero.gold,billed=s.householdBudget.paidGold;s=act(s,'recovery_begin_guided_28');assert.equal(s.day,original.day+5);assert.equal(s.health.recovery.attendedDays,5);assert.equal(s.health.recovery.careDays,5);assert.equal(s.health.recovery.remainingDays,23);assert.equal(gold-s.hero.gold,18+s.householdBudget.paidGold-billed);assert.deepEqual(original.health.recovery,null);s=settle(s);const after=s.hero.gold,bill=s.householdBudget.paidGold;s=act(s,'recovery_continue');assert.equal(s.health.recovery,null);assert.equal(after-s.hero.gold,s.householdBudget.paidGold-bill);assert.match(s.health.history.findLast(h=>h.result==='plan_completed').text,/28\/28.*28 symptom-care days/);
});
test('a separate symptom-care session helps symptoms without reducing a reserved plan',()=>{
 let s=nearBirthday();s=act(s,'recovery_begin_free_28');s=settle(s);const p=structuredClone(s.health.recovery);openConcern(s,'chronic',2);const html=recoveryPanel(s,plainUi);assert.match(html,/5\/28 days/);assert.match(html,/remaining days are saved/);assert.match(s.event.body,/separate care session will not count as plan attendance/);s=roundtrip(E.chooseEventOption(s,'routine'));assert.deepEqual(s.health.recovery,p);assert.match(s.notice,/separate session adds no plan attendance/);assert.equal(s.health.physical.length,1);
});
test('canceling a paid plan retains actual days and care without charging or completing remaining days',()=>{
 let s=settle(act(nearBirthday(),'recovery_begin_guided_56'));const p=structuredClone(s.health.recovery),day=s.day,gold=s.hero.gold;s=act(s,'recovery_cancel');assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.health.recovery,null);const h=s.health.history.at(-1);assert.equal(h.careDays,p.careDays);assert.equal(h.attendedDays,p.attendedDays);assert.match(h.text,/Unused days grant no recovery/);const n=E.chooseAction(s,'recovery_continue');assert.equal(n.day,s.day);assert.deepEqual(n.health,s.health);
});
test('an older interrupted plan preserves attendance without inventing earlier symptom-care totals',()=>{
 let s=settle(act(nearBirthday(),'recovery_begin_free_28'));delete s.health.recovery.careDays;roundtrip(s);const v=recoveryView(s);assert.equal(v.plan.careDays,null);assert.equal(v.plan.unrecordedCareDays,5);assert.match(recoveryPanel(s,plainUi),/earlier attended days have no separate symptom-care count/);s=act(s,'recovery_continue');assert.match(s.health.history.findLast(h=>h.result==='plan_completed').text,/28\/28 actual plan days attended; 23 symptom-care days separately recorded/);
});
test('an unexpected zero-day pause refunds the consultation and restores every prior care window',()=>{
 const s=fresh();condition(s,'chronic',2);const before=structuredClone(s);assert.ok(applyRecoveryAction(s,'recovery_begin_guided_28',{nextInterruptionDay:()=>s.day+10,spendDays:()=>0}));assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.day,before.day);assert.deepEqual(s.health.care,before.health.care);assert.deepEqual(s.health.physical,before.health.physical);assert.equal(s.health.recovery.paid,false);assert.equal(s.health.recovery.attendedDays,0);assert.equal(s.health.recovery.careDays,0);roundtrip(s);
});
test('a shorter actual segment grants only attended care and cumulative weekly gains',()=>{
 const s=fresh();s.hero.hp=1;s.life.health=10;condition(s,'chronic',2);const day=s.day,hp=s.hero.hp;assert.ok(applyRecoveryAction(s,'recovery_begin_free_28',{nextInterruptionDay:()=>s.day+28,spendDays(){s.day+=3;return 3;}}));assert.equal(s.health.recovery.careDays,3);assert.equal(s.health.recovery.attendedDays,3);assert.equal(s.health.recovery.remainingDays,25);assert.equal(s.hero.hp,hp);assert.equal(s.health.care.restUntil,day+17,'only the actual three days plus disclosed continuing care');assert.equal(s.health.physical[0].careUntil,day+17);assert.ok(validateHealth(s.health,s));
});
test('free recovery remains available with no savings while guided plans explain their price',()=>{
 const s=fresh();s.hero.gold=0;const a=recoveryActions(s);assert.ok(a.filter(a=>a.id.includes('_free_')).every(a=>a.cost===0&&!a.disabledReason));assert.ok(a.filter(a=>a.id.includes('_guided_')).every(a=>/Requires/.test(a.disabledReason)));let n=act(s,'recovery_begin_free_14');assert.equal(n.health.history.findLast(h=>h.result==='plan_completed').fee,0);assert.equal(n.hero.gold,0);
});
for(const [name,change] of [
 ['negative credit',s=>s.health.recovery.careDays=-1],['unattended credit',s=>s.health.recovery.careDays=s.health.recovery.attendedDays+1],['nonfinite credit',s=>s.health.recovery.careDays=Infinity],['fractional credit',s=>s.health.recovery.careDays=1.5],['unknown circumstance',s=>condition(s,'injury',1,{circumstance:'invented'} )],['bad receipt',s=>s.health.history.at(-1).careDays=999],
])test(`malformed health record rejects ${name}`,()=>{
 const s=settle(act(nearBirthday(),'recovery_begin_free_28'));change(s);assert.equal(E.validateSave(s),false);
});
test('production health navigation exposes both measures, relevant care and a working free action',async t=>{
 const s=fresh();s.life.health=12;const surface=await mountApp(t,{states:[s],width:390,height:844});assert.ok(surface.root.innerHTML.includes('v'+release));await surface.click('title-continue');await surface.click('tab','activities');await surface.click('activities-pane','recovery');assert.match(surface.root.innerHTML,/Health, Focus &amp; care explained/);assert.match(surface.root.innerHTML,/Health/);assert.match(surface.root.innerHTML,/Bodily wellbeing/);assert.match(surface.root.innerHTML,/Below 35.*full/);assert.ok(surface.root.querySelector('[data-op="activity"][data-id="health_rest"]'));assert.deepEqual(surface.current(),s);await surface.click('activity','health_rest');assert.equal(surface.current().life.health,18);assert.equal(surface.current().day,s.day+3);assert.ok(E.validateSave(surface.current()));
});
test('production recovery preview uses total days and preserves the saved plan after an interrupting scene',async t=>{
 const s=nearBirthday(),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('tab','activities');await surface.click('activities-pane','recovery');const row=surface.root.controls.find(c=>c.dataset.id==='recovery_begin_guided_28');assert.ok(row);assert.match(surface.root.innerHTML,/28(?:d| Days| days)/);await surface.click('activity','recovery_begin_guided_28');const p=surface.current().health.recovery;assert.equal(p.attendedDays,5);assert.equal(p.careDays,5);assert.equal(p.paid,true);await surface.click('tab','activities');await surface.click('activities-pane','recovery');assert.match(surface.root.innerHTML,/Plan attendance/);assert.match(surface.root.innerHTML,/remaining days are saved/);assert.ok(E.validateSave(surface.current()));
});

test('care due beside a birthday explains the actual action restriction without spending time',async t=>{
 const s=nearBirthday();s.day+=4;s.life.health=12;roundtrip(s);const a=E.getActions(s).find(a=>a.id==='health_rest');assert.match(a.disabledReason,/next birthday/);const surface=await mountApp(t,{states:[s],width:390,height:844});await surface.click('title-continue');await surface.click('tab','activities');await surface.click('activities-pane','recovery');assert.match(surface.root.innerHTML,/Your next birthday is due. Choose Age up/);assert.deepEqual(surface.current(),s);
});
