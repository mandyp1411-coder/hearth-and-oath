import test from 'node:test';
import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import {atService} from './helpers/service-visit.mjs';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { workshopActions, applyWorkshopAction, workshopView, projectSupplyGuide, validateWorkshop, craftReturnQuote, ARTISAN_PATTERNS } from '../dist/js/workshop.js';
import { careerActions, applyCareerAction, applyCareerChoice, recordCareerWork, addCareerExperience, flushCareerEvent, careerView, validateCareers, commissionQuote, commissionQuality, commissionThresholds, invoicePay, PROFESSION_CATALOG, resetCareerForSuccessor } from '../dist/js/careers.js';
import { careerReviewTerms } from '../dist/js/career-development.js';
import { GEAR_CATALOG, getGearItem, gearBonuses, validateGear } from '../dist/js/gear.js';
import { resolveFoundItem, EQUIPMENT_SLOTS, setBonuses } from '../dist/js/gear-loot.js';
import { materialValue, gearSaleValue, MATERIAL_PRICES } from '../dist/js/economy-values.js';
import { economyPlan, renderEconomyPlan } from '../dist/js/economy-planning.js';
import { householdCostPreview } from '../dist/js/budget.js';
import { lootBasketQuote, sellLootBasket, realmActions, applyRealmAction } from '../dist/js/realm.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled fixtures test real accounting and public commands; these are not
// additional audited lives, human surveys, browser layout or balance telemetry.
function clear(s){for(let n=0;s.event&&n<60;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','later','keep','continue','pause','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
const base=clear(await createLifeAtAge({seed:'economy-focus-nine',startAge:18,difficulty:'gentle'}));
function fresh(){const s=structuredClone(base);s.hero.profession='Blacksmith';s.hero.gold=20000;s.locationId='city';s.workshop.crafting=4;s.event=null;s.careers.pending=null;s.careers.queued=null;for(const k of Object.keys(s.equipment.materials))s.equipment.materials[k]=100;syncCartography(s);const n=E.migrateSave(s);assert.ok(n,'normalize the controlled city resident snapshot once');return n;}
function roundtrip(s){assert.ok(E.validateSave(s),'valid whole life');const loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assertCapturedMigration(s,loaded);assert.deepEqual(E.migrateSave(loaded),loaded);}
function ctx(s,max=Infinity){return {spendDays(n){const used=Math.min(n,max);s.day+=used;return used;},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},standing(id,n){s.factions[id]+=n;},journal(){},finishObligation(id){const o=s.obligations.find(o=>o.id===id);if(o)o.resolved=true;}};}
function work(s,id,max=Infinity){const a=workshopActions(s).find(a=>a.id===id);assert.ok(a,id);assert.equal(a.disabledReason,undefined,a.disabledReason);s.hero.gold-=a.cost;assert.ok(applyWorkshopAction(s,id,ctx(s,max)));assert.ok(validateWorkshop(s.workshop,s));assert.ok(validateGear(s.equipment));return a;}
function job(s,id){const a=careerActions(s).find(a=>a.id===id);assert.ok(a,id);assert.equal(a.disabledReason,undefined,a.disabledReason);s.hero.gold-=a.cost;s.day+=a.days;assert.ok(applyCareerAction(s,id,ctx(s)));assert.ok(validateCareers(s.careers,s));return a;}
function accept(s){const o=careerView(s).commissions.find(c=>!c.gearId);assert.ok(o);job(s,o.actionId);return s.careers.active;}
function review(s,{experience=0,days=30,rank=0,source='batch'}={}){addCareerExperience(s,experience);s.life.career.rank=rank;recordCareerWork(s,{days,source});assert.ok(s.careers.queued);assert.ok(flushCareerEvent(s,ctx(s)));assert.equal(s.event.id,'career_year');return s.careers.pending;}
const ui={e:String,button:(label,op,id='',style='',disabled=false)=>`<button data-op="${op}" data-id="${id}" ${disabled?'disabled':''}>${label}</button>`};

test('all ten canonical equipment slots are craftable and filters preserve pure recipe views',()=>{
 const s=fresh(),before=structuredClone(s),v=workshopView(s);assert.deepEqual(new Set(v.recipes.map(r=>r.slot)),new Set(EQUIPMENT_SLOTS));for(const r of v.recipes){assert.equal(r.finishes.length,4);assert.ok(r.finishes.every(f=>f.slot===r.slot));}assert.deepEqual(s,before);
});
test('an interrupted workshop craft reports its reserved inputs and zero shortfall away from its site',()=>{
 const s=fresh();s.equipment.materials={ore:2,wood:3,hide:1,stone:0,cloth:0,crystal:0};work(s,'workshop_craft_woodland_spear',1);s.locationId='home';syncCartography(s);s.hero.gold=0;const g=projectSupplyGuide(s);assert.equal(g.committed,true);assert.deepEqual(g.shortfall,{});assert.deepEqual(g.sources,[]);assert.equal(g.goldShortfall,0);assert.equal(g.remainingDays,2);assert.equal(g.siteId,'city');assert.match(workshopActions(s).find(a=>a.id==='workshop_continue').disabledReason,/Return/);roundtrip(s);
});
test('community guidance separates a paid commitment from the following uncommitted milestone',()=>{
 const s=fresh();s.community.project={locationId:'city',title:'A real project',step:0,stages:[{title:'Raise a roof',materials:{wood:8},cost:480,days:16},{title:'Fit rooms',materials:{stone:6},cost:720,days:14}],commitment:{paid:true,cost:480,materials:{wood:8},remainingDays:7}};s.equipment.materials.wood=0;s.hero.gold=0;let g=projectSupplyGuide(s);assert.equal(g.committed,true);assert.deepEqual(g.shortfall,{});assert.equal(g.goldShortfall,0);assert.equal(g.actionId,'community_continue');s.community.project.step=1;s.community.project.commitment=null;s.equipment.materials.stone=2;g=projectSupplyGuide(s);assert.equal(g.committed,false);assert.deepEqual(g.shortfall,{stone:4});assert.equal(g.goldShortfall,720);assert.equal(g.actionId,'community_stage');
});
test('a craft preview reconciles fee, replacement inputs, actual living accrual and local sale receipt',()=>{
 const s=fresh(),item=GEAR_CATALOG.find(i=>i.id==='steel_sword'),before=structuredClone(s),q=craftReturnQuote(s,item);assert.equal(q.materialValue,materialValue({ore:6,wood:2,hide:1}));assert.equal(q.receipt,gearSaleValue(item,s.realm.sites.city.merchant));assert.equal(q.living,householdCostPreview(s,item.craftDays).additionalCost);assert.equal(q.netValue,q.receipt-q.fee-q.materialValue-q.living);assert.equal(q.cashNet,q.netValue+q.materialValue);assert.deepEqual(s,before);
});
test('artisan patterns require earned crafting and a real workbench before gold or supplies can be spent',()=>{
 const s=fresh();s.workshop.crafting=2;assert.match(workshopActions(s).find(a=>a.id==='workshop_pattern_duelist').disabledReason,/crafting 3/);s.workshop.crafting=3;s.locationId='forest';assert.match(workshopActions(s).find(a=>a.id==='workshop_pattern_duelist').disabledReason,/tier 2/);assert.equal(workshopActions(s).some(a=>a.id==='workshop_fitted_leather_gloves_duelist'),false);
});
test('interrupted pattern study preserves one fee and only teaches after all real days finish',()=>{
 const s=fresh(),gold=s.hero.gold;work(s,'workshop_pattern_duelist',2);assert.equal(s.workshop.patterns,undefined);assert.equal(s.workshop.project.remainingDays,3);roundtrip(s);const saved=structuredClone(s);work(saved,'workshop_continue');assert.deepEqual(saved.workshop.patterns,['duelist']);assert.equal(saved.hero.gold,gold-120);assert.match(workshopActions(saved).find(a=>a.id==='workshop_pattern_duelist').disabledReason,/already learned/);roundtrip(saved);
});
test('a fitted piece commits inputs once, survives reload and never equips or awards unfinished gear',()=>{
 const s=fresh();work(s,'workshop_pattern_duelist');const equipped=structuredClone(s.equipment.equipped),count=s.equipment.instances.length,gold=s.hero.gold;const a=work(s,'workshop_fitted_leather_gloves_duelist',1);assert.equal(s.equipment.instances.length,count);assert.equal(s.workshop.project.pattern,'duelist');const guide=projectSupplyGuide(s);assert.deepEqual(guide.shortfall,{});assert.equal(guide.goldShortfall,0);roundtrip(s);const resumed=JSON.parse(JSON.stringify(s));work(resumed,'workshop_continue');const record=resumed.equipment.instances.at(-1),item=getGearItem(resumed,record.id);assert.equal(item.crafted,true);assert.equal(item.affix,'duelist');assert.equal(item.quality,'uncommon');assert.equal(item.bonuses.attack,3);assert.equal(resumed.hero.gold,gold-a.cost);assert.deepEqual(resumed.equipment.equipped,equipped);const before=structuredClone(resumed.equipment);assert.equal(applyWorkshopAction(resumed,'workshop_continue',ctx(resumed)),false);assert.deepEqual(resumed.equipment,before);roundtrip(resumed);
});
for(const p of ARTISAN_PATTERNS)test(`the ${p.name} artisan pattern has a bounded repeatable build outcome`,()=>{
 const s=fresh();work(s,'workshop_pattern_'+p.id);for(const id of ['leather_gloves','field_helm','iron_ring'])work(s,`workshop_fitted_${id}_${p.id}`);const made=s.equipment.instances.filter(i=>i.crafted).map(i=>getGearItem(s,i.id));assert.equal(made.length,3);assert.equal(new Set(made.map(i=>i.slot)).size,3);assert.equal(setBonuses(made)[0].id,p.id);const madeGloves=made.find(i=>i.baseId==='leather_gloves');const rare=resolveFoundItem({id:'found_deep_1',baseId:'leather_gloves',affix:p.id,quality:'rare',tier:6,source:'ruin',day:s.day},GEAR_CATALOG);assert.ok(Object.values(rare.bonuses).reduce((a,b)=>a+b,0)>Object.values(madeGloves.bonuses).reduce((a,b)=>a+b,0));roundtrip(s);
});
test('abandoning a fitted piece keeps committed costs spent and creates no gear or set progress',()=>{
 const s=fresh();work(s,'workshop_pattern_vanguard');const count=s.equipment.instances.length;work(s,'workshop_fitted_field_helm_vanguard',0);const gold=s.hero.gold;work(s,'workshop_cancel');assert.equal(s.hero.gold,gold);assert.equal(s.equipment.instances.length,count);assert.equal(s.workshop.project,null);roundtrip(s);
});
test('a full individual gear bag refuses new fitted work before charging anything',()=>{
 const s=fresh();s.workshop.patterns=['duelist'];s.equipment.instances=Array.from({length:120},(_,n)=>({id:`found_limit${n}_1`,baseId:'iron_ring',quality:'uncommon',affix:'duelist',tier:1,source:'city',day:s.day}));s.equipment.owned.push(...s.equipment.instances.map(i=>i.id));assert.match(workshopActions(s).find(a=>a.id==='workshop_fitted_iron_ring_duelist').disabledReason,/120/);const before=structuredClone(s.equipment);assert.equal(applyWorkshopAction(s,'workshop_fitted_iron_ring_duelist',ctx(s)),true);assert.deepEqual(s.equipment,before);
});
for(const field of ['pattern','cost','materials','kind'])test(`a forged fitted-project ${field} is rejected on import`,()=>{
 const s=fresh();work(s,'workshop_pattern_duelist');work(s,'workshop_fitted_iron_ring_duelist',1);if(field==='pattern')s.workshop.project.pattern='striker';if(field==='cost')s.workshop.project.cost=0;if(field==='materials')s.workshop.project.materials.crystal=0;if(field==='kind')s.workshop.project.kind='craft';assert.equal(E.validateSave(s),false);
});
test('crafted-origin metadata cannot claim relic quality or a stronger drop-only pattern',()=>{
 const s=fresh();work(s,'workshop_pattern_duelist');work(s,'workshop_fitted_iron_ring_duelist');const i=s.equipment.instances.at(-1);i.quality='legendary';assert.equal(validateGear(s.equipment),false);i.quality='uncommon';i.affix='striker';assert.equal(validateGear(s.equipment),false);
});
test('new commission methods show net resources, quality thresholds and actual time before beginning',()=>{
 const s=fresh(),a=accept(s),before=structuredClone(s);for(const id of ['standard','fine','rush']){const q=commissionQuote(s,a,id),d=careerActions(s).find(a=>a.id==='career_make_'+id);assert.equal(q.fee,d.cost);assert.equal(q.days,d.days);assert.equal(q.netValue,q.receipt-q.fee-q.materialValue-q.living);assert.equal(q.exceptional,a.targetQuality+18);assert.match(d.description,/net value/);assert.match(d.description,/Above .* no further payment/);}assert.deepEqual(s,before);
});
test('exceptional commission quality pays the disclosed premium once, with late and community reductions',()=>{
 const s=fresh();addCareerExperience(s,1800);s.hero.skills.survival=12;const a=accept(s);job(s,'career_make_fine');assert.ok(a.quality>=commissionThresholds(a).exceptional);a.late=true;const expected=Math.floor(a.pay*.75*.55*1.2),gold=s.hero.gold;job(s,'career_invoice');assert.match(s.event.body,/20% premium/);assert.ok(applyCareerChoice(s,'career_invoice','community',ctx(s)));s.event=null;assert.equal(s.hero.gold,gold+expected);assert.equal(s.careers.active,null);assert.equal(applyCareerChoice(s,'career_invoice','community',ctx(s)),false);roundtrip(s);
});
test('quality above the exceptional threshold has no undisclosed further premium',()=>{
 const a={termsVersion:2,pay:61,targetQuality:40,quality:57,late:false};assert.equal(invoicePay(a,'honest'),61);a.quality=58;assert.equal(invoicePay(a,'honest'),73);a.quality=100;assert.equal(invoicePay(a,'honest'),73);assert.equal(invoicePay(a,'conceal'),61);
});
test('an older accepted commission keeps its original quality and exact pay through reload',()=>{
 const s=fresh(),a=accept(s);delete a.termsVersion;delete a.specialty;a.status='ready';a.method='fine';a.quality=100;const before=structuredClone(a),gold=s.hero.gold;roundtrip(s);assert.equal(commissionThresholds(a).exceptional,null);job(s,'career_invoice');assert.equal(invoicePay(a,'honest'),a.pay);assert.deepEqual(s.careers.active,before);assert.ok(applyCareerChoice(s,'career_invoice','honest',ctx(s)));s.event=null;assert.equal(s.hero.gold,gold+before.pay);roundtrip(s);
});
test('professional specialties affect only future agreements and keep the character’s calling independent',()=>{
 const s=fresh();addCareerExperience(s,100);const old=accept(s),q=commissionQuality(s,old),before=structuredClone(old),path=s.hero.path;job(s,'career_specialty_precision');assert.deepEqual(s.careers.active,before);assert.equal(commissionQuality(s,old),q);job(s,'career_abandon');s.careers.queued=null;const next=accept(s);assert.equal(next.specialty,'precision');assert.equal(commissionQuality(s,next)-commissionQuality(s,{...next,specialty:null}),4);assert.equal(s.hero.path,path);roundtrip(s);
});
test('community specialists earn exactly the promised extra professional trust',()=>{
 const s=fresh();addCareerExperience(s,100);job(s,'career_specialty_service');const a=accept(s);job(s,'career_make_standard');job(s,'career_invoice');const rep=s.careers.records.Blacksmith.reputation;assert.ok(applyCareerChoice(s,'career_invoice','community',ctx(s)));s.event=null;assert.equal(s.careers.records.Blacksmith.reputation,rep+10);roundtrip(s);
});
test('professional reviews evolve from early work to mastery with disclosed, frozen tradeoffs',()=>{
 const early=fresh(),master=fresh();const a=review(early),b=review(master,{experience:1800,days:900,rank:3,source:'shop'});assert.equal(a.development.stage,0);assert.equal(b.development.stage,2);assert.notEqual(early.event.body,master.event.body);assert.match(master.event.body,/Master practice, guild rank 3, mastery 4/);assert.match(master.event.body,/direct the queue|workload|review of its limits|share decisions/);const terms=careerReviewTerms(b.development),gold=master.hero.gold;assert.ok(master.event.choices.find(c=>c.id==='profit').description.includes(String(terms.pay)));roundtrip(master);assert.ok(applyCareerChoice(master,'career_year','profit',ctx(master)));master.event=null;assert.equal(master.hero.gold,gold+terms.pay);assert.equal(master.careers.records.Blacksmith.lastReview.choice,'profit');roundtrip(master);
});
test('a current review remembers actual specialty, dependents, deadlines, failures and recent work',()=>{
 const s=fresh(),r=s.careers.records.Blacksmith;r.specialty='service';r.failures=2;r.reviewedFailures=1;s.life.children=[{alive:true,bornDay:s.day-7*365}];s.obligations.push({id:'real-promise',title:'Deliver the named tool',dueDay:s.day+12,resolved:false});review(s,{experience:400,source:'commission-make'});assert.match(s.event.body,/community practice/);assert.match(s.event.body,/1 dependent child/);assert.match(s.event.body,/Deliver the named tool/);assert.match(s.event.body,/1 failed or late promise/);assert.match(s.event.body,/commissioned work/);assert.ok(applyCareerChoice(s,'career_year','care',ctx(s)));s.event=null;assert.equal(r.reviewedFailures,2);const reviewDay=s.day;s.age++;s.day+=365;review(s,{source:'teaching'});assert.ok(s.event.body.includes(`previous review on day ${reviewDay}`));assert.match(s.event.body,/safer working hours/);assert.equal(s.event.body.includes('1 failed or late promise'),false);
});
test('every profession has a master review about its own work rather than a beginner’s unchanged scene',()=>{
 const bodies=new Set();for(const p of PROFESSION_CATALOG.filter(p=>p.name!=='Unemployed')){const s=fresh();s.hero.profession=p.name;review(s,{experience:1800,rank:3});bodies.add(s.event.body);assert.match(s.event.body,/Master practice/);assert.equal(validateCareers(s.careers,s),true);}assert.equal(bodies.size,12);
});
test('an older saved professional review keeps its original 25-gold choice and scene',()=>{
 const s=fresh();review(s,{experience:1800,rank:3});delete s.careers.pending.development;s.event.body='Previously saved professional scene';s.event.choices.find(c=>c.id==='profit').description='Earn 25 gold';const snapshot=structuredClone(s.event),gold=s.hero.gold;roundtrip(s);assert.deepEqual(s.event,snapshot);assert.ok(applyCareerChoice(s,'career_year','profit',ctx(s)));s.event=null;assert.equal(s.hero.gold,gold+25);assert.equal(s.careers.records.Blacksmith.lastReview,undefined);roundtrip(s);
});
for(const key of ['stage','day','source'])test(`invalid career review ${key} is rejected`,()=>{const s=fresh();review(s);const d=s.careers.pending.development;if(key==='stage')d.stage=2;if(key==='day')d.day=s.day+1;if(key==='source')d.source='imaginary adventure';assert.equal(E.validateSave(s),false);});
test('successors keep signed property while learning a new professional specialty and reviews of their own',()=>{const s=fresh(),r=s.careers.records.Blacksmith;r.specialty='precision';review(s,{experience:1800,rank:3});applyCareerChoice(s,'career_year','care',ctx(s));s.event=null;resetCareerForSuccessor(s);assert.equal(s.careers.records.Blacksmith.specialty,undefined);assert.equal(s.careers.records.Blacksmith.lastReview,undefined);assert.equal(s.careers.records.Blacksmith.experience,0);});
test('quality-aware trade quotes match individual and basket sales and cannot be paid twice',()=>{
 const s=fresh();for(const [n,quality]of ['common','uncommon','rare','epic','legendary'].entries()){const i={id:`found_sale${n}_1`,baseId:'steel_sword',quality,affix:'duelist',tier:6,source:'ruin',day:s.day};s.equipment.instances.push(i);s.equipment.owned.push(i.id);}const items=s.equipment.instances.filter(i=>i.id.includes('sale')).map(i=>getGearItem(s,i.id)),values=items.map(i=>gearSaleValue(i,s.realm.sites.city.merchant));assert.ok(values.every((v,i)=>i===0||v>values[i-1]));for(const i of items)assert.match(realmActions(s).find(a=>a.id==='realm_sellgear_'+i.id).description,new RegExp(`${gearSaleValue(i,s.realm.sites.city.merchant)} gold`));const q=lootBasketQuote(s);q.items=q.items.filter(i=>i.id.includes('sale'));const expected=q.items.reduce((n,i)=>n+i.quotedPrice,0),gold=s.hero.gold;assert.ok(sellLootBasket(s,q,ctx(s)));assert.equal(s.hero.gold,gold+expected);assert.equal(sellLootBasket(s,q,ctx(s)),false);roundtrip(s);
});
test('a crafted quote matches its real merchant sale and the skill investment never becomes a gold duplication loop',()=>{
 const s=fresh();work(s,'workshop_pattern_duelist');const base=GEAR_CATALOG.find(i=>i.id==='iron_ring'),q=craftReturnQuote(s,base,'duelist'),gold=s.hero.gold;work(s,'workshop_fitted_iron_ring_duelist');const id=s.equipment.instances.at(-1).id,item=getGearItem(s,id);assert.equal(gearSaleValue(item,s.realm.sites.city.merchant),q.receipt);assert.ok(applyRealmAction(s,'realm_sellgear_'+id,ctx(s)));assert.equal(s.hero.gold,gold-q.fee+q.receipt);assert.ok(q.receipt<q.fee+q.materialValue);roundtrip(s);
});
test('late-career household budgets remain viable and ordinary loot reduces a wanted endowment gap',()=>{
 const samples=[];for(const profession of ['Unemployed','Blacksmith','Merchant','Healer']){const s=fresh();s.hero.profession=profession;s.hero.gold=500;s.life.focus='livelihood';s.life.lifestyle='comfortable';s.life.home.tier='cottage';s.life.children=[];s.life.career.rank=profession==='Unemployed'?0:3;if(profession!=='Unemployed')addCareerExperience(s,1800);const before=structuredClone(s),without=economyPlan(s,'archive');assert.ok(without.net>0,profession+' viable');s.adventuring.loot.push({id:'budget-proof',name:'Recovered silverwork',value:200,stolen:false,source:'ruin',day:s.day});const withLoot=economyPlan(s,'archive');assert.equal(withLoot.afterSaleGap,Math.max(0,without.afterSaleGap-160));assert.equal(withLoot.annualMaintenance,720);assert.ok(withLoot.gap>withLoot.net);assert.equal(without.dedicated,Math.floor(careerView(before).wages.shift*365/3));samples.push({profession,ordinaryNet:without.net,dedicatedNet:without.dedicatedNet,goal:without.total,lootContribution:160});}assert.equal(samples.length,4);
});
test('savings goals and trade quotes are read-only and disclose upkeep, pack purchases and alternative schedules',()=>{
 const s=fresh(),before=structuredClone(s);for(const goal of ['artisan','garden','road','learning','archive']){const v=economyPlan(s,goal);assert.equal(v.total,v.fees+v.materialCash+v.living);assert.ok(Object.values(v.purchases).every(n=>n%3===0));const html=renderEconomyPlan(s,ui,{goal});assert.match(html,/alternative schedules/);assert.match(html,/Selecting a savings goal spends nothing|Gathering can replace/);}assert.deepEqual(s,before);
});
test('an interrupted artisan kit budget subtracts the fee and inputs already reserved in its project',()=>{
 const s=fresh();s.equipment.materials=Object.fromEntries(Object.keys(MATERIAL_PRICES).map(k=>[k,0]));const before=economyPlan(s,'artisan');work(s,'workshop_pattern_duelist',2);const pending=economyPlan(s,'artisan');assert.equal(before.fees-pending.fees,120);assert.equal(pending.committedGold,120);assert.equal(before.days-pending.days,2);
});
test('production workshop filters and finish controls spend nothing and keep the neighboring life untouched',async t=>{
 const s=fresh(),neighbor=structuredClone(base),surface=await mountApp(t,{states:[s,neighbor]});await surface.click('title-continue');await surface.click('place-open');await surface.click('place-area','market');await surface.click('service-open','smith-'+surface.current().locationId);await surface.click('craft-browse');const before=structuredClone(surface.current());for(const slot of EQUIPMENT_SLOTS){const filter=surface.root.querySelector('#craft-search [name="slot"]');filter.value=slot;await surface.fire('submit',surface.root.querySelector('#craft-search'));assert.ok(surface.root.querySelector('.craft-workspace'));assert.equal(surface.root.querySelector('#craft-search [name="slot"]').value,slot);}const finish=surface.root.querySelector('#craft-search [name="finish"]');finish.value='duelist';await surface.fire('submit',surface.root.querySelector('#craft-search'));const filter=surface.root.querySelector('#craft-search [name="slot"]');filter.value='all';await surface.fire('submit',surface.root.querySelector('#craft-search'));await surface.click('craft-item','workshop_fitted_iron_ring_duelist');assert.match(surface.root.innerHTML,/Study the Duelist pattern first/);assert.deepEqual(surface.current(),before);assert.deepEqual(surface.lives()[1],neighbor);
});
test('production savings-goal and trade navigation use the actual workspace without committing a purchase',async t=>{
 const s=fresh(),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('workspace-section','life:plans');const before=structuredClone(surface.current());await surface.click('economy-goal','archive');assert.match(surface.root.innerHTML,/Regional scholarship archive/);await surface.click('economy-merchant');assert.ok(surface.root.querySelector('.place-areas'));assert.equal(surface.root.querySelector('.inventory-workspace'),null);assert.deepEqual(surface.current(),before);
});
test('the production public workshop command learns and makes a chosen piece with valid serialized accounting',()=>{
 let s=atService(fresh(),'workshop_pattern_duelist');const gold=s.hero.gold;s=E.chooseAction(s,'workshop_pattern_duelist');for(let n=0;s.workshop.project&&n<10;n++){s=clear(s);s=E.chooseAction(s,'workshop_continue');}assert.ok(s.workshop.patterns.includes('duelist'));s=clear(s);const a=E.getActions(s).find(a=>a.id==='workshop_fitted_iron_ring_duelist');assert.ok(a&&!a.disabledReason);s=E.chooseAction(s,a.id);for(let n=0;s.workshop.project&&n<10;n++){s=clear(s);s=E.chooseAction(s,'workshop_continue');}assert.ok(s.equipment.instances.some(i=>i.crafted&&i.baseId==='iron_ring'));assert.ok(s.hero.gold<=gold-120-a.cost);roundtrip(s);
});

test('teenage wages and a closed life have distinct financial forecasts without invented income or upkeep',()=>{
 const s=fresh();s.age=16;s.day=16*365;assert.equal(economyPlan(s).ordinary,0);assert.ok(economyPlan(s).dedicated>0);s.phase='retired';const v=economyPlan(s);assert.equal(v.ordinary,0);assert.equal(v.dedicated,0);assert.equal(v.annualLiving,0);assert.equal(v.net,0);assert.equal(v.living,0);assert.match(renderEconomyPlan(s,ui),/This life is closed/);
});

test('remote workshops and closed settlements cannot advertise an executable local trade offer',()=>{
 const s=fresh();s.equipment.owned.push('steel_sword');s.locationId='forest';assert.equal(economyPlan(s).sales,0);assert.equal(craftReturnQuote(s,GEAR_CATALOG.find(i=>i.id==='steel_sword')).localQuote,false);s.locationId='city';s.world.locations.find(p=>p.id==='city').status='destroyed';assert.equal(economyPlan(s).sales,0);assert.equal(craftReturnQuote(s,GEAR_CATALOG.find(i=>i.id==='steel_sword')).localQuote,false);
});

test('a savings forecast follows the paid community project to its recorded site after the player travels away',()=>{
 let s=fresh();s=E.chooseAction(s,'community_begin_road');assert.equal(s.event.id,'community_charter');s=E.chooseEventOption(s,'open');s=E.chooseAction(s,'community_stage');assert.ok(s.community.project.paidGold>0);const atSite=economyPlan(s,'road'),paid=s.community.project.paidGold,site=s.locationId;s.locationId='home';syncCartography(s);const away=economyPlan(s,'road');assert.equal(away.siteId,site);assert.equal(away.fees,3900-paid);assert.equal(away.fees,atSite.fees);assert.deepEqual(away.materials,atSite.materials);assert.equal(away.days,atSite.days);assert.ok(away.purpose.includes(s.world.locations.find(p=>p.id===site).name));roundtrip(s);
});
test('an institution with a full protected reserve has no unavailable contribution counted as a savings gap',()=>{
 const s=fresh();s.community.works.push({id:'funded-road',kind:'road',name:'The funded wayhouse',locationId:s.locationId,status:'standing',operatingBalance:6000,annualCost:180});const v=economyPlan(s,'road');assert.equal(v.fees,0);assert.equal(v.days,0);assert.equal(v.actionId,null);assert.match(v.purpose,/no further contribution is currently offered/);assert.equal(v.annualMaintenance,180);
});
