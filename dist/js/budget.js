// Household costs accrue from actual adult days. Imports begin at the saved
// date, and the ledger never invents expenses for years already played.
import { communityFoodSupportAt, communityFoodIntervals } from './community.js';
export const HOUSEHOLD_FOCI = [
  {id:'livelihood',label:'Build a livelihood',description:'Keep the ordinary mix of work, family and free time.'},
  {id:'education',label:'Make room for study',description:'Work fewer shifts; scheduled lessons cost 60 gold a year and develop scholarship.'},
  {id:'relationships',label:'Put people first',description:'Work fewer shifts and make regular time for willing friends and family.'},
  {id:'adventure',label:'Prepare for the road',description:'Work fewer shifts and practice your earned path, or survival while still a civilian.'},
  {id:'rest',label:'Protect recovery time',description:'Keep a lighter work schedule and a steady care routine.'},
];
export const HOUSEHOLD_LIFESTYLES = [
  {id:'frugal',label:'A humble hearth',annual:120,description:'Simple provisions and public festivities.'},
  {id:'comfortable',label:'Comfort and privacy',annual:300,description:'Better provisions, private space and modest hospitality.'},
  {id:'generous',label:'An open, splendid house',annual:600,description:'Fine provisions and frequent hospitality.'},
];
const RATIOS={livelihood:1,education:.45,relationships:.6,adventure:.5,rest:.35};
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const birthMode=s=>s.timeline?.mode==='birth';
const adulthood=s=>birthMode(s)?(s.timeline.birthDay||0)+18*365:0;
export const annualWorkRatio=s=>RATIOS[s.life?.focus]??1;

export function initializeHouseholdBudget(s,{reset=false}={}) {
  if(s.householdBudget&&!reset)return;
  s.householdBudget={startedDay:s.day,lastDay:s.day,accruedUnits:0,billedGold:0,paidGold:0,supportedGold:0,lastJournalYear:null,focusDays:Object.fromEntries(HOUSEHOLD_FOCI.map(f=>[f.id,0])),history:[]};
}
export function householdAnnualCost(s,day=s.day) {
  if(!s.life)return 0;
  const lifestyle=HOUSEHOLD_LIFESTYLES.find(l=>l.id===s.life.lifestyle)||HOUSEHOLD_LIFESTYLES[0];
  const home={lodgings:0,cottage:30,townhouse:90,estate:240}[s.life.home?.tier]||0;
  const children=s.life.children.filter(c=>c.alive!==false&&Math.max(0,Math.floor((day-c.bornDay)/365))<18).length;
  const address=s.life.home?.locationId||s.hero.birthplaceId||s.locationId;
  const support=communityFoodSupportAt(s,address,day);
  return lifestyle.annual+home+children*45+(s.life.focus==='education'?60:0)-Math.min(120,support);
}
function livingCostUnits(s,start,end) {
  if(end<=start)return 0;
  const cuts=[start,end];
  for(const child of s.life?.children||[]){const day=child.bornDay+18*365;if(day>start&&day<end)cuts.push(day);}
  const address=s.life.home?.locationId||s.hero.birthplaceId||s.locationId;
  for(const interval of communityFoodIntervals(s,address,start,end))cuts.push(interval.fromDay,interval.toDay);
  const points=[...new Set(cuts)].sort((a,b)=>a-b);
  let total=0;for(let i=0;i<points.length-1;i++)total+=householdAnnualCost(s,points[i])*(points[i+1]-points[i]);
  return total;
}
export function householdCostPreview(s,days=0) {
  const eligible=Math.max(0,s.day+Math.max(0,Math.floor(days))-Math.max(s.day,adulthood(s)));
  const annual=householdAnnualCost(s),units=s.householdBudget?.accruedUnits||0;
  const outstanding=Math.max(0,Math.floor(units/365)-(s.householdBudget?.billedGold||0));
  const added=livingCostUnits(s,Math.max(s.day,adulthood(s)),s.day+Math.max(0,Math.floor(days)));
  const additionalCost=Math.floor((units+added)/365)-Math.floor(units/365);
  return {days:eligible,annual,outstanding,additionalCost,totalDue:outstanding+additionalCost};
}
export function accrueHouseholdBudget(s,oldDay,newDay) {
  const b=s.householdBudget;
  if(!b||newDay<=oldDay)return;
  const start=Math.max(oldDay,b.lastDay,adulthood(s));
  if(newDay>start)b.accruedUnits+=livingCostUnits(s,start,newDay);
  b.lastDay=newDay;
}
export function settleHouseholdBudget(s,ctx={},forceJournal=false) {
  const b=s.householdBudget;
  if(!b)return 0;
  const due=Math.max(0,Math.floor(b.accruedUnits/365)-b.billedGold);
  if(!due)return 0;
  const paid=Math.min(s.hero.gold,due),support=due-paid;
  s.hero.gold-=paid;b.billedGold+=due;b.paidGold+=paid;b.supportedGold+=support;
  if(support)s.life.lifestyle='frugal';
  const entry={day:s.day,due,paid,support,focus:s.life.focus,lifestyle:s.life.lifestyle};
  b.history.push(entry);b.history=b.history.slice(-100);
  const year=Math.floor((s.day-(s.timeline?.birthDay||0))/365);
  if(forceJournal||support||b.lastJournalYear!==year) {
    const text=`Provisions, household upkeep and support for dependent children used ${paid} gold from your savings.${support?` The planned budget had a ${support}-gold shortfall. You used communal support for basic needs and put optional comforts aside; no debt or cash grant was created. Your home and family remain yours.`:''} Your recorded living costs now total ${b.billedGold} gold; future rates follow the living standard you choose.`;
    ctx.journal?.(support?'A household supported through a difficult season':'The cost of an ordinary life',text,'household');b.lastJournalYear=year;
  }
  return paid;
}
export function applyAnnualFocus(s,days,ctx={}) {
  const b=s.householdBudget;
  if(!b||days<=0||s.phase==='retired')return;
  const focus=s.life.focus,before=b.focusDays[focus];b.focusDays[focus]+=days;
  const periods=Math.floor(b.focusDays[focus]/30)-Math.floor(before/30);
  if(!periods)return;
  if(focus==='education')s.hero.skills.scholarship=Math.min(10000,s.hero.skills.scholarship+Math.floor(b.focusDays[focus]/60)-Math.floor(before/60));
  if(focus==='adventure') {
    const skill={warrior:'weapons',mage:'arcana',rogue:'stealth'}[s.hero.path]||'survival';
    s.hero.skills[skill]=Math.min(10000,s.hero.skills[skill]+Math.floor(b.focusDays[focus]/60)-Math.floor(before/60));
  }
  if(focus==='relationships') {
    s.life.happiness=Math.min(100,s.life.happiness+periods);
    s.life.stress=Math.max(0,s.life.stress-periods);
    for(const p of s.life.people.filter(p=>p.alive!==false&&p.bond>=35))p.bond=Math.min(100,p.bond+periods);
  }
  if(focus==='rest') {
    s.life.health=Math.min(100,s.life.health+periods*2);
    s.life.stress=Math.max(0,s.life.stress-periods*2);
    s.health.care.restUntil=Math.max(s.health.care.restUntil,s.day+30);
    s.health.care.supportUntil=Math.max(s.health.care.supportUntil,s.day+30);
    for(const c of [...s.health.physical,...s.health.mental])c.careUntil=Math.max(c.careUntil,s.day+30);
  }
  void ctx;
}
const ready=s=>!!s.householdBudget&&s.age>=18&&s.phase!=='retired'&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.dungeon&&!s.timeline?.journey&&!s.careers?.batch&&!s.workshop?.project&&!s.life?.plan;
export function householdBudgetActions(s) {
  if(!ready(s))return [];
  return [...HOUSEHOLD_FOCI.map(f=>({id:`budget_focus_${f.id}`,label:f.label,description:`${f.description} Ordinary Age up income uses ${Math.round(RATIOS[f.id]*100)}% of the normal working schedule. Dedicated work commitments keep their agreed wages.`,disabledReason:s.life.focus===f.id?'This is your current priority.':undefined})),...HOUSEHOLD_LIFESTYLES.map(l=>({id:`budget_lifestyle_${l.id}`,label:l.label,description:`${l.description} Base provisions: ${l.annual} gold per actual adult year; property, dependent children and scheduled lessons add their visible costs.`,disabledReason:s.life.lifestyle===l.id?'This is your current living standard.':undefined}))].map(a=>({...a,days:0,cost:0,group:'Household priorities'}));
}
export function applyHouseholdBudgetAction(s,id,ctx={}) {
  if(!householdBudgetActions(s).some(a=>a.id===id&&!a.disabledReason))return false;
  if(id.startsWith('budget_focus_'))s.life.focus=id.slice(13);
  else s.life.lifestyle=id.slice(17);
  s.notice='Your future days follow these household priorities. Changing the plan grants no money, skills or recovery.';
  ctx.journal?.('A priority you chose for your own life',`${HOUSEHOLD_FOCI.find(f=>f.id===s.life.focus).label}; ${HOUSEHOLD_LIFESTYLES.find(l=>l.id===s.life.lifestyle).label.toLowerCase()}. Past costs and paid work remain recorded. Future living costs are ${householdAnnualCost(s)} gold per adult year.`,'household');
  return true;
}
export function householdBudgetView(s) {
  if(!s.householdBudget)return null;
  const b=s.householdBudget,forecast=householdCostPreview(s,365);
  return {...forecast,focus:s.life.focus,lifestyle:s.life.lifestyle,paid:b.paidGold,supported:b.supportedGold,history:b.history.map(e=>({...e})),actions:householdBudgetActions(s),description:'Living costs follow actual adult days, with communal support for basic needs when savings run short. They are settled during Age up, committed work, and the closing of a life. Work income is shown before these household costs; a full work commitment keeps its original wage agreement.'};
}
export function validateHouseholdBudget(b,s) {
  if(!b||!['startedDay','lastDay','accruedUnits','billedGold','paidGold','supportedGold'].every(k=>integer(b[k]))||!b.focusDays||!HOUSEHOLD_FOCI.every(f=>integer(b.focusDays[f.id]))||b.lastDay>s.day||b.startedDay>b.lastDay||b.billedGold>Math.floor(b.accruedUnits/365)||b.paidGold+b.supportedGold!==b.billedGold||!(b.lastJournalYear===null||integer(b.lastJournalYear))||!Array.isArray(b.history)||b.history.length>100)return false;
  return b.history.every(e=>e&&integer(e.day)&&e.day<=s.day&&integer(e.due)&&integer(e.paid)&&integer(e.support)&&e.due===e.paid+e.support&&HOUSEHOLD_FOCI.some(f=>f.id===e.focus)&&HOUSEHOLD_LIFESTYLES.some(l=>l.id===e.lifestyle));
}
