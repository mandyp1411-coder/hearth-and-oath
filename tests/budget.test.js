import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/js/engine.js';
import {initializeHouseholdBudget,householdAnnualCost,householdCostPreview,accrueHouseholdBudget,settleHouseholdBudget,applyAnnualFocus,householdBudgetActions,applyHouseholdBudgetAction,validateHouseholdBudget} from '../dist/js/budget.js';

function household(day=18*365,gold=500) {
  const s={day,age:18,phase:'adult',timeline:{mode:'birth',birthDay:0,yearTarget:null},hero:{gold,path:'unformed',skills:{scholarship:0,survival:0}},life:{focus:'livelihood',lifestyle:'frugal',home:{tier:'lodgings'},children:[],people:[],happiness:60,stress:20,health:80,plan:null},health:{care:{restUntil:0,supportUntil:0},physical:[],mental:[]},event:null,battle:null,careers:{batch:null},workshop:{project:null}};
  initializeHouseholdBudget(s);return s;
}
const time=(s,days)=>{const before=s.day;s.day+=days;accrueHouseholdBudget(s,before,s.day);};

test('living costs conserve the same actual calendar across many partial periods and one commitment',()=>{
  const a=household(),b=household();
  for(const days of [30,30,30,30,30,30,30,30,30,30,30,35]){time(a,days);settleHouseholdBudget(a);}
  time(b,365);settleHouseholdBudget(b);
  assert.equal(a.hero.gold,380);assert.equal(a.hero.gold,b.hero.gold);
  assert.equal(a.householdBudget.accruedUnits,b.householdBudget.accruedUnits);
  assert.equal(a.householdBudget.paidGold,120);assert.ok(validateHouseholdBudget(a.householdBudget,a));
  const paid=a.hero.gold;settleHouseholdBudget(a);assert.equal(a.hero.gold,paid,'the same elapsed days are billed once');
});

test('childhood and imported past years accrue no invented costs',()=>{
  const s=household(10*365);time(s,7*365);settleHouseholdBudget(s);assert.equal(s.hero.gold,500);
  time(s,2*365);settleHouseholdBudget(s);assert.equal(s.householdBudget.paidGold,120,'only the actual adult year is charged');
  const late=household(80*365);time(late,30);settleHouseholdBudget(late);assert.equal(late.householdBudget.paidGold,9);assert.equal(late.householdBudget.startedDay,80*365);
});

test('household rates follow dependent children, chosen comfort and actual property',()=>{
  const s=household();s.life.home.tier='cottage';s.life.children=[{bornDay:s.day-7*365,alive:true},{bornDay:s.day-19*365,alive:true},{bornDay:s.day,alive:false}];
  assert.equal(householdAnnualCost(s),195);
  assert.equal(householdCostPreview(s,365).additionalCost,195);
  const before=structuredClone(s);assert.ok(applyHouseholdBudgetAction(s,'budget_lifestyle_generous'));
  assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.day,before.day);assert.equal(householdAnnualCost(s),675);
  assert.ok(applyHouseholdBudgetAction(s,'budget_focus_education'));assert.equal(householdAnnualCost(s),735);
  assert.equal(householdBudgetActions(s).find(a=>a.id==='budget_focus_education').disabledReason,'This is your current priority.');
});

test('a child reaching adulthood midway through work changes only the remaining dependent costs',()=>{
  const a=household(),b=household();
  for(const s of [a,b])s.life.children=[{bornDay:s.day-18*365+100,alive:true}];
  assert.equal(householdCostPreview(a,365).additionalCost,Math.floor((165*100+120*265)/365));
  time(a,365);for(const days of [50,50,65,100,100])time(b,days);
  assert.equal(a.householdBudget.accruedUnits,165*100+120*265);
  assert.equal(a.householdBudget.accruedUnits,b.householdBudget.accruedUnits);
});

test('community food support bills exact funded days, skips pauses and does not stack reserves',()=>{
  const a=household(),b=household();
  const start=a.day;
  for(const s of [a,b]){
    s.locationId='home';s.life.home.locationId='home';
    s.world={locations:[{id:'home',type:'village',status:'thriving',servicesAvailable:true}]};
    const work={kind:'garden',scope:'practice',status:'standing',locationId:'home',completedDay:start+20,enabled:true,annualCost:180,operatingBalance:0,fundedUntil:start+200,fundingPeriods:[{fromDay:start+20,toDay:start+200}],servicePauses:[{fromDay:start+70,toDay:start+100}]};
    s.community={works:[work,structuredClone(work)]};
  }
  const initial=structuredClone(a);
  assert.equal(householdCostPreview(a,365).additionalCost,Math.floor((120*365-30*150)/365));
  assert.deepEqual(a,initial,'a forecast consumes neither reserve nor elapsed days');
  time(a,365);for(const days of [10,10,50,30,100,100,65])time(b,days);
  assert.equal(a.householdBudget.accruedUnits,120*365-30*150);
  assert.equal(a.householdBudget.accruedUnits,b.householdBudget.accruedUnits);
});

test('basic need support preserves an insolvent household without debt, forced loss or free luxury',()=>{
  const s=household(18*365,3);s.life.lifestyle='generous';s.life.home.tier='cottage';time(s,365);settleHouseholdBudget(s);
  assert.equal(s.hero.gold,0);assert.equal(s.life.lifestyle,'frugal');assert.equal(s.life.home.tier,'cottage');
  assert.equal(s.householdBudget.paidGold,3);assert.equal(s.householdBudget.supportedGold,627);
  assert.ok(validateHouseholdBudget(s.householdBudget,s));
});

test('annual study is earned only by its own lived focus days and never by settings changes',()=>{
  const s=household();applyAnnualFocus(s,59);applyHouseholdBudgetAction(s,'budget_focus_education');applyAnnualFocus(s,1);assert.equal(s.hero.skills.scholarship,0);
  applyAnnualFocus(s,59);assert.equal(s.hero.skills.scholarship,1);
  applyHouseholdBudgetAction(s,'budget_focus_adventure');applyAnnualFocus(s,60);assert.equal(s.hero.skills.survival,1,'a classless person may prepare without being assigned a combat path');
  const before=structuredClone(s.hero.skills);for(let n=0;n<5;n++){applyHouseholdBudgetAction(s,'budget_focus_rest');applyHouseholdBudgetAction(s,'budget_focus_education');}assert.deepEqual(s.hero.skills,before);
});

test('real earlier saves gain a future ledger while keeping unfinished agreements and choices exact',()=>{
  const old=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url),'utf8'));
  for(const original of Object.values(old.states)) {
    const next=engine.migrateSave(original);assert.ok(next);assert.ok(engine.validateSave(next));
    assert.equal(next.householdBudget.startedDay,original.day);assert.equal(next.householdBudget.paidGold,0);
    const migratedLife=structuredClone(next.life);
    delete migratedLife.relationshipVersion;
    for(const person of migratedLife.people){
      if(person.compatibility){assert.deepEqual(person.compatibility.known,[]);assert.deepEqual(person.compatibility.history,[]);delete person.compatibility;}
    }
    assertCapturedMigration(original.event,next.event,'state.event');assert.deepEqual(next.battle,original.battle);assert.deepEqual(migratedLife,original.life);assert.deepEqual(next.careers?.batch,null);
    assert.deepEqual(engine.migrateSave(next),next,'importing repeatedly cannot add costs or gifts');
  }
});
