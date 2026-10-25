import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { actionCostView, actionCostSummary, actionCostDetails, renderActionCostHelp } from '../dist/js/action-costs.js';
import { householdCostPreview } from '../dist/js/budget.js';
import { activityQuote } from '../dist/js/interaction-ui-v40.js';
import { compactActivityRows } from '../dist/js/activities-v31.js';
import { applyCareerAction, careerActions } from '../dist/js/careers.js';
import { travelActions } from '../dist/js/travel.js';
import { imprison } from '../dist/js/justice.js';
import { nearbyContacts } from '../dist/js/dialogue-ui-v22.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Synthetic lives and genuine prior-version fixture copies only. The handler
// surface does not measure browser layout, CSS visibility or screen readers.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const base=E.migrateSave(fixture.states.base);
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uiHelpers={e};
function fresh(kind=null){let s=structuredClone(base);s.hero.gold=1000;for(const k of Object.keys(s.equipment.materials))s.equipment.materials[k]=30;if(kind){const r=settlementServices(s).find(r=>r.kind===kind);assert.ok(r,kind);for(const id of settlementWalkPath(s,r.roomId))s=E.chooseAction(s,'atlas_room_'+id);}return s;}
function validate(s){assert.ok(E.validateSave(s),s.notice);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);return s;}
async function open(t,s){const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');return ui;}
async function openCraft(t,s=fresh('smith')){const ui=await open(t,s);await ui.click('place-open');await ui.click('service-open',settlementServices(s).find(r=>r.kind==='smith').id);await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');return ui;}
function settle(s){for(let i=0;s.event&&i<12;i++){const c=s.event.choices.find(c=>c.id==='continue'&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);assert.ok(c);s=E.chooseEventOption(s,c.id);}assert.equal(s.event,null);return s;}

test('quotes prefer full/remaining commitment fields, keep fee/materials/accrual separate and never mutate',()=>{
 const s=fresh(),a={days:1,durationDays:365,cost:4,quotedCost:11,materials:{ore:3,cloth:0},timeDescription:'Attendance can pause for a birthday.'},before=structuredClone(s),offer=structuredClone(a),q=actionCostView(s,a);
 assert.equal(q.days,365);assert.equal(q.fee,11);assert.deepEqual(q.materials,[{id:'ore',amount:3,name:'ore'}]);assert.deepEqual(q.household,householdCostPreview(s,365));assert.equal(activityQuote(a,s),'365 Days · 11 Gold Fee');
 const html=compactActivityRows([{...a,id:'quoted',label:'A quoted action',description:'Review the work.'}],uiHelpers,s);
 for(const text of ['365 Days','11 Gold Fee','Materials: 3 ore','Household estimate: +'+q.household.additionalCost,'settled separately from the fee','Attendance can pause'])assert.ok(html.includes(text),text);
 assert.deepEqual(s,before);assert.deepEqual(a,offer);
});

test('explicit zero-day/zero-fee offers remain zero and old-save fallback invents no cost',()=>{
 const s=fresh(),a={days:4,durationDays:0,cost:8,quotedCost:0};
 assert.equal(actionCostSummary(s,a),'No Time · No Fee');assert.equal(actionCostDetails(s,a),'');
 assert.equal(activityQuote({days:2,cost:5}),'2 Days · 5 Gold Fee');assert.equal(actionCostDetails(null,{days:2,cost:5}),'');
 const old=structuredClone(s);delete old.householdBudget;assert.equal(actionCostView(old,{days:2,cost:5}).household,null);assert.equal(activityQuote({},old),'');
});

test('estimates use authoritative adulthood boundaries and exclude earlier accrual from a new fee',()=>{
 const s=fresh();s.day=s.timeline.birthDay+18*365-1;s.age=17;s.householdBudget.accruedUnits=0;s.householdBudget.billedGold=0;
 const before=structuredClone(s);assert.deepEqual(actionCostView(s,{days:2,cost:7}).household,householdCostPreview(s,2));assert.equal(actionCostView(s,{days:2}).household.days,1);assert.deepEqual(s,before);
 const adult=fresh();adult.householdBudget.accruedUnits=3650;adult.householdBudget.billedGold=2;const q=actionCostView(adult,{days:365,cost:7});assert.equal(q.household.outstanding,8);assert.equal(q.fee,7);assert.ok(actionCostDetails(adult,{days:365,cost:7}).includes('+'+q.household.additionalCost+' Gold'));assert.ok(renderActionCostHelp(adult,uiHelpers).includes('8 Gold has already accrued'));assert.match(renderActionCostHelp(adult,uiHelpers),/only as adult days actually pass/);assert.match(renderActionCostHelp(adult,uiHelpers),/may be settled when an action finishes/);assert.match(renderActionCostHelp(adult,uiHelpers),/separately from the provider fee and materials/);
});

test('a captured year of work and old paused road response quote remaining days without spending them',()=>{
 const s=fresh();assert.equal(applyCareerAction(s,'career_batch_year',{spendDays(){return 0;},journal(){}}),true);assert.ok(s.careers.batch);const before=structuredClone(s),a=careerActions(s).find(a=>a.id==='career_batch_continue');assert.equal(a.durationDays,s.careers.batch.remainingDays);assert.equal(actionCostView(s,a).days,365);assert.match(activityQuote(a,s),/365 Days · No Fee/);assert.deepEqual(s,before);
 const road={travel:{pending:{stage:'delay',remainingDays:4}},event:null,battle:null,conversations:{pending:null}};const prior=structuredClone(road),r=travelActions(road)[0];assert.equal(r.days,0);assert.equal(r.durationDays,4);assert.equal(activityQuote(r),'4 Days · No Fee');assert.deepEqual(road,prior);
});

test('ordinary compact Activities and situated service choices disclose expected accrual without charging it',async t=>{
 const s=fresh('inn'),ui=await open(t,s),before=ui.current();await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.ok(ui.root.querySelector('.action-cost-help'));const walk=ui.root.querySelector('[data-id="leisure_walk"]');assert.ok(walk);assert.match(walk.textContent,/1 Day.*No Fee/);assert.match(walk.textContent,/Household estimate: \+\d+ Gold/);assert.deepEqual(ui.current(),before);
 await ui.click('place-open');await ui.click('service-open',settlementServices(s).find(r=>r.kind==='inn').id);const meeting=ui.current();assert.ok(ui.root.querySelector('.action-cost-help'));const room=ui.root.querySelector('[data-id="inn_room"]');assert.ok(room);assert.match(room.textContent,/Gold Fee/);assert.match(room.textContent,/settled separately from the fee/);assert.deepEqual(ui.current(),meeting);assert.equal(meeting.day,before.day);assert.equal(meeting.hero.gold,before.hero.gold);
});

test('craft review quotes direct fee, ingredients, exact time and separate household estimate without changing affordability',async t=>{
 const s=fresh('smith'),a=E.getActions(s).find(a=>a.id==='workshop_craft_padded_gambeson');assert.ok(a&&!a.disabledReason);s.hero.gold=a.cost;s.householdBudget.accruedUnits+=100*365;
 const ui=await openCraft(t,validate(s)),before=ui.current(),q=householdCostPreview(before,a.days),detail=ui.root.querySelector('.craft-detail').textContent;
 assert.match(detail,/Direct Fee/);assert.ok(detail.includes(a.cost+' Gold'));assert.ok(detail.includes('+'+q.additionalCost+' Gold over this time'));assert.match(detail,/Expected Living-Cost Accrual|Settled separately/);assert.match(detail,/Materials Needed/);assert.equal(ui.root.querySelector('[data-op="craft-confirm"]').disabled,false,'accrual is not an added upfront provider fee');assert.deepEqual(ui.current(),before);
});

test('an unaffordable direct craft fee stays blocked and browsing or forged activation spends nothing',async t=>{
 const s=fresh('smith');s.hero.gold=0;const ui=await openCraft(t,s),before=ui.current(),confirm=ui.root.querySelector('[data-op="craft-confirm"]');assert.equal(confirm.disabled,true);assert.match(ui.root.querySelector('.craft-detail').textContent,/Requires|gold|Gold/);await ui.fire('click',confirm);assert.deepEqual(ui.current(),before);
});

test('birthday interruption preserves prepaid crafting, and returning from Your Years never spends or repays it',async t=>{
 let s=fresh('smith');s.day=s.timeline.birthDay+23*365-1;s.age=22;s.timeline.yearStartDay=s.day-364;s.timeline.yearTarget=null;syncCartography(s);s=E.chooseAction(validate(s),'workshop_craft_padded_gambeson');s=validate(settle(s));assert.ok(s.workshop.project);const ui=await open(t,s),before=ui.current();await ui.click('workspace-section','life:years');const control=ui.root.querySelector('.view-attention [data-op="workspace-open"]');assert.ok(control);assert.equal(control.dataset.id,'life:present');await ui.click('workspace-open','life:present');assert.ok(ui.root.querySelector('[data-id="workshop_continue"]'));assert.deepEqual(ui.current(),before);
 const expected=E.chooseAction(before,'workshop_continue'),stale=ui.root.querySelector('[data-id="workshop_continue"]');await ui.click('activity','workshop_continue');assert.deepEqual(ui.current(),expected);assert.equal(ui.current().hero.gold,before.hero.gold-(ui.current().householdBudget.paidGold-before.householdBudget.paidGold),'only separately settled living costs, never a second prepaid fee');assert.deepEqual(ui.current().equipment.materials,before.equipment.materials);await ui.fire('click',stale);assert.deepEqual({...ui.current(),notice:''},{...expected,notice:''});
});

test('custody Return names current Life and reaches the actual sentence controls for free',async t=>{
 const s=fresh();s.legal.incidents.push({locationId:s.locationId,evidence:3,description:'A synthetic named witness reports a theft.'});assert.equal(imprison(s,{journal(){}}),true);const ui=await open(t,validate(s));assert.match(ui.root.querySelector('#command-age-reason').textContent,/Life/);assert.doesNotMatch(ui.root.querySelector('#command-age-reason').textContent,/Regions|faiths/);const before=ui.current();await ui.click('tab','inventory');await ui.click('workspace-open','life:present');assert.ok(ui.root.querySelector('[data-id="justice_serve"]'));assert.deepEqual(ui.current(),before);
});

test('waiting conversation Return resolves the actual person, with no retired People route or spending',async t=>{
 let s=fresh('smith');const r=settlementServices(s).find(r=>r.kind==='smith');s=E.visitService(s,r.id);s=E.chooseAction(s,'talk_'+r.personId);assert.ok(s.conversations.pending);const ui=await open(t,validate(s)),before=ui.current();await ui.click('tab','inventory');assert.doesNotMatch(ui.root.querySelector('#command-age-reason').textContent,/\bPeople\b/);const control=ui.root.querySelector('.view-attention [data-op="show-contact"]');assert.ok(control);assert.equal(control.dataset.id,r.personId);await ui.click('show-contact',r.personId);assert.ok(ui.root.querySelector('.dialogue-scene [data-op="reply"]'));assert.deepEqual(ui.current(),before);
});

test('a preserved non-nearby legacy reply returns from Your Years to Today instead of staying in the archive',async t=>{
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/legacy-v3.json',import.meta.url))).states.conversation,s=E.migrateSave(legacy),id=s.conversations.pending.personId;
 const person=s.life.people.find(p=>p.id===id);assert.ok(person);person.locationId=s.world.locations.find(p=>p.id!==s.locationId).id;assert.ok(!nearbyContacts(s).some(p=>p.id===id));
 const ui=await open(t,validate(s)),before=ui.current();await ui.click('workspace-section','life:years');await ui.click('show-contact',id);assert.equal(ui.root.querySelector('.workspace-page').dataset.workspaceSection,'present');assert.ok(ui.root.querySelector('.dialogue-scene [data-op="reply"]'));assert.deepEqual(ui.current(),before);
});

// A descent walked in the older engine ends where it stands when read (v0.72.4, tests/older-walks-v0724.test.js).


test('genuine earlier planned year has a reachable Continue control in Today after migration',async t=>{
 const legacy=JSON.parse(readFileSync(new URL('./fixtures/legacy-v2.json',import.meta.url))).states.annualPlan;let s=E.migrateSave(legacy);s=settle(s);assert.ok(s.life.plan);const ui=await open(t,validate(s)),before=ui.current();assert.ok(ui.root.querySelector('.saved-year [data-op="continue-year"]'));await ui.click('tab','inventory');await ui.click('workspace-open','life:present');assert.ok(ui.root.querySelector('.saved-year [data-op="continue-year"]'));assert.deepEqual(ui.current(),before);
});

test('current blocker copy and Return destinations contain no retired service routes',()=>{
 const app=readFileSync(new URL('../dist/js/app.js',import.meta.url),'utf8'),age=app.slice(app.indexOf('function ageControlState()'),app.indexOf('function ageForecast()')),banner=app.slice(app.indexOf('function currentMomentBanner()'),app.indexOf('const retainedScrollSelectors'));
 assert.doesNotMatch(age,/\bin People\b|Regions, laws|Adventure & bounties/);assert.doesNotMatch(banner,/view:'(?:realm|workshop|career|adventure)'/);assert.match(banner,/'workspace-open'/);assert.match(banner,/'life:present'/);
});
