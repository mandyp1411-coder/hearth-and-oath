import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { statusReferenceView, renderStatusReference, travelReferenceView, renderTravelReference } from '../dist/js/status-reference.js';
import { healthView } from '../dist/js/health.js';
import { travelEnergyView } from '../dist/js/travel-energy.js';
import { actionCostView, actionCostDetails, actionCostSummary, renderActionCostHelp } from '../dist/js/action-costs.js';
import { householdCostPreview } from '../dist/js/budget.js';

// Pure views over a recorded fixture; no engine, simulation, generated lives or
// app import. Native disclosure activation/layout are separate browser checks.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=()=>structuredClone(fixture.states.base);
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e,button:(label,op,id='')=>`<button type="button" data-op="${op}" data-id="${id}">${label}</button>`};
function condition(s,type,care=0){const c={id:type+'-reference',type,severity:2,sinceDay:s.day-7,lastEffectDay:s.day-7,careUntil:s.day+care,acknowledged:true};s.health[['injury','fever','infection','chronic'].includes(type)?'physical':'mental'].push(c);return c;}

test('Health and bodily wellbeing remain distinct at full HP and when HP is low',()=>{
 const s=fresh();s.hero.hp=s.hero.maxHp;s.life.health=12;const before=structuredClone(s),v=statusReferenceView(s),h=healthView(s);
 assert.equal(v.measures.find(m=>m.id==='health').purpose,h.hpPurpose);assert.equal(v.measures.find(m=>m.id==='bodily').purpose,h.bodilyPurpose);assert.equal(v.concern,h.concern);assert.match(v.concern,/Below 35.*full/);assert.deepEqual(v.conditions,[]);assert.deepEqual(s,before);
 s.hero.hp=3;s.life.health=80;assert.match(statusReferenceView(s).concern,/immediate endurance/);
});
test('contexts select the existing measures and battle actor reserves without another state model',()=>{
 const s=fresh();s.battle={actors:[{id:'hero',hp:4,maxHp:60,mp:2,maxMp:20}]};const v=statusReferenceView(s);
 assert.equal(v.measures.find(m=>m.id==='health').value,4);assert.equal(v.measures.find(m=>m.id==='focus').value,2);
 assert.deepEqual(statusReferenceView(s,{context:'fun'}).measures.map(m=>m.id),['joy','stress']);assert.deepEqual(statusReferenceView(s,{context:'doctor'}).measures.map(m=>m.id),['health','bodily']);
});
test('conditions retain exact care and lived-time requirements, including a window ending before review',()=>{
 const s=fresh();condition(s,'fever',1);condition(s,'chronic',30);condition(s,'depression',30);const before=structuredClone(s),v=statusReferenceView(s),source=healthView(s);
 for(const c of v.conditions){const original=[...source.physical,...source.mental].find(r=>r.id===c.id);assert.equal(c.care,original.care);assert.equal(c.progress,original.progress);}
 assert.match(v.conditions.find(c=>c.type==='fever').effect,/Unsupported fortnightly reviews.*Health.*bodily wellbeing/);
 assert.match(v.conditions.find(c=>c.type==='chronic').effect,/toward 1.*remains recorded/);
 assert.match(v.conditions.find(c=>c.type==='depression').progress,/35 days since onset, joy 40\+ and stress 65 or less/);
 assert.equal(statusReferenceView(s,{context:'fun'}).conditions.length,1);assert.deepEqual(s,before);
});
test('references are collapsed native disclosures with no action-spending controls or outcome live region',()=>{
 const s=fresh(),before=structuredClone(s);for(const context of ['recovery','doctor','fun']){const html=renderStatusReference(s,ui,{context});assert.match(html,/<details class="action-cost-help status-reference"/);assert.match(html,/<summary>[^<]+<\/summary>/);assert.doesNotMatch(html,/<details[^>]*\sopen(?:[\s>])|title=|aria-live|data-op="(?:activity|activity-home|activity-visit|choice)"/);assert.match(html,/data-disclosure=/);}
 assert.deepEqual(s,before);assert.match(renderStatusReference(s,ui,{context:'doctor'}),/data-op="notice-recovery"/);
});
test('interrupted recovery preserves attendance, care credit and once-only fee wording',()=>{
 const s=fresh();s.health.recovery={kind:'guided',title:'Reserved care',totalDays:28,attendedDays:5,remainingDays:23,careDays:5,fee:18,paid:true};const before=structuredClone(s),html=renderStatusReference(s,ui);
 assert.match(html,/5\/28 actual days attended; 23 remain/);assert.match(html,/5 symptom-care days separately recorded/);assert.match(html,/18 Gold paid once/);assert.match(html,/separate care session adds no plan attendance/);assert.match(html,/does not guarantee symptom recovery/);assert.deepEqual(s,before);
});
test('current Focus effects follow the authoritative travel view at quarter and empty boundaries',()=>{
 const s=fresh();s.hero.maxMp=100;for(const [mp,speed] of [[25,1],[24,2],[0,3]]){s.hero.mp=mp;const before=structuredClone(s),v=travelReferenceView(s,{legacy:false,days:8,fee:0});assert.equal(v.energy.speed,speed);assert.deepEqual(v.energy,travelEnergyView(s));assert.match(v.rules,/Below one quarter/);assert.match(v.time,/estimate without further rest/);assert.match(v.fee,/0 Gold departure fee/);assert.equal(v.household,actionCostDetails(s,{days:8}));assert.deepEqual(s,before);}
});
test('legacy routes preserve quoted payments without modern Focus penalties or invented fees',()=>{
 const s=fresh();s.hero.mp=0;const v=travelReferenceView(s,{legacy:true,days:4,fee:7,paid:true}),html=renderTravelReference(s,ui,{legacy:true,days:4,fee:7,paid:true});assert.equal(v.energy,null);assert.match(v.rules,/saved journey keeps its original pace/);assert.match(v.fee,/7 Gold already committed/);assert.doesNotMatch(html,/each normal travel day|Continuing exhausted|Focus 0\//);assert.equal(travelReferenceView(s,{legacy:true}).fee,'');assert.match(travelReferenceView(s,{legacy:true}).rules,/route uses its quoted pace/);
});
test('camp descriptions and consumption come from the actual offer without another eligibility selector',()=>{
 const s=fresh(),camp={id:'trail_camp',label:'Make Camp',description:'Recover 20 Focus. Uses one night from a pack (2 left).',days:1,cost:0,disabledReason:'Resolve the current moment.'},before=structuredClone(camp),v=travelReferenceView(s,{camp}),html=renderTravelReference(s,ui,{camp});assert.equal(v.camp.description,camp.description);assert.equal(v.camp.quote,actionCostSummary(s,camp));assert.equal(v.camp.details,actionCostDetails(s,camp));assert.match(html,/Resolve the current moment/);assert.doesNotMatch(html,/data-op="activity"/);assert.match(renderTravelReference(s,ui),/No camp action is currently offered/);assert.deepEqual(camp,before);
});
test('fee, materials, accrual and outstanding costs stay separate without implying missing materials are absent',()=>{
 const s=fresh();s.householdBudget.accruedUnits=3650;s.householdBudget.billedGold=2;const before=structuredClone(s),a={days:1,durationDays:365,cost:1,quotedCost:7,materials:{ore:3}},q=actionCostView(s,a),html=renderActionCostHelp(s,ui);
 assert.equal(q.fee,7);assert.equal(q.days,365);assert.deepEqual(q.household,householdCostPreview(s,365));assert.match(actionCostDetails(s,a),/Materials: 3 ore/);assert.match(html,/8 Gold has already accrued/);assert.match(html,/not combined into an all-inclusive price/);assert.match(html,/“No Fee” does not mean no supplies or household costs/);assert.doesNotMatch(actionCostDetails(s,{days:0,cost:0}),/No materials/);assert.deepEqual(s,before);
});
test('cost help and estimates retain adulthood boundary and missing-budget fallbacks',()=>{
 const s=fresh();s.day=s.timeline.birthDay+18*365-1;s.age=17;s.householdBudget.accruedUnits=0;s.householdBudget.billedGold=0;assert.equal(actionCostView(s,{days:2,cost:0}).household.days,1);assert.match(renderActionCostHelp(s,ui),/only as adult days actually pass/);delete s.householdBudget;assert.equal(actionCostView(s,{days:2}).household,null);assert.equal(travelReferenceView(s,{days:2}).household,'');
});
test('reference prose and summaries inherit the existing single reading-scale factor',()=>{
 const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');for(const selector of ['.action-cost-help > summary','.action-cost-help .small-copy']){const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),rule=css.match(new RegExp(escaped+' \\{([^}]+)\\}'));assert.ok(rule,selector);assert.match(rule[1],/font-size: calc\(12px \* var\(--reading-scale, 1\)\)/);assert.equal(rule[1].match(/--reading-scale/g).length,1);}
 const html=renderStatusReference(fresh(),ui);assert.doesNotMatch(html,/font-size|font:\s|style=/);assert.ok([...html.matchAll(/<p\b([^>]*)>/g)].every(m=>m[1].includes('class="small-copy"')));
});
