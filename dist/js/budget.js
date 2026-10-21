// Household costs accrue from actual adult days. Imports begin at the saved
// date, and the ledger never invents expenses for years already played.
import { stationDues } from './station.js';
import { seededRoll } from './world.js';
import { hasNature } from './personality.js';
import { isLiterate, studyLevel, hasCredential, useStudy } from './schooling.js';
import { communityFoodSupportAt, communityFoodIntervals } from './community.js';
export const HOUSEHOLD_FOCI = [
  {id:'livelihood',label:'Build a livelihood',description:'Keep the ordinary mix of work, family and free time.'},
  {id:'education',label:'Make room for study',description:'Work fewer shifts; scheduled lessons cost 60 gold a year and develop scholarship.'},
  {id:'relationships',label:'Put people first',description:'Work fewer shifts and make regular time for willing friends and family.'},
  {id:'adventure',label:'Prepare for the road',description:'Work fewer shifts and practice your earned path, or survival while still a civilian.'},
  {id:'rest',label:'Protect recovery time',description:'Keep a lighter work schedule and a steady care routine.'},
];
export const HOUSEHOLD_LIFESTYLES = [
  {id:'frugal',label:'A humble hearth',annual:180,description:'Thin provisions, mended clothes, public festivities.'},
  {id:'comfortable',label:'Comfort and privacy',annual:360,description:'Better provisions, private space and modest hospitality.'},
  {id:'generous',label:'An open, splendid house',annual:720,description:'Fine provisions and frequent hospitality.'},
];
// Debt: a shortfall is borrowed, not forgiven. Interest is charged each
// settled year; the lender's patience runs out at a multiple of annual costs.
export const DEBT_INTEREST = 0.10;
export const DEBT_FRUGAL_MULTIPLE = 1.5;   // above this, comforts are cut
export const DEBT_RECKONING_MULTIPLE = 3;  // above this, the reckoning comes
const RATIOS={livelihood:1,education:.45,relationships:.6,adventure:.5,rest:.35};
const integer=(n,min=0)=>Number.isSafeInteger(n)&&n>=min;
const birthMode=s=>s.timeline?.mode==='birth';
const adulthood=s=>birthMode(s)?(s.timeline.birthDay||0)+18*365:0;
export const annualWorkRatio=s=>RATIOS[s.life?.focus]??1;

// The debt ledger marks a new-edition life. A save migrated from an older
// version gets a budget without it and keeps the rules it was played under.
export function initializeHouseholdBudget(s,{reset=false,edition=false}={}) {
  if(s.householdBudget&&!reset)return;
  s.householdBudget={startedDay:s.day,lastDay:s.day,accruedUnits:0,billedGold:0,paidGold:0,supportedGold:0,lastJournalYear:null,focusDays:Object.fromEntries(HOUSEHOLD_FOCI.map(f=>[f.id,0])),history:[],
    ...(edition?{debt:0,borrowedGold:0,debtInterestPaid:0,lastInterestYear:null,graceUsed:false}:{})};
}
export function householdAnnualCost(s,day=s.day) {
  if(!s.life)return 0;
  const lifestyle=HOUSEHOLD_LIFESTYLES.find(l=>l.id===s.life.lifestyle)||HOUSEHOLD_LIFESTYLES[0];
  // Rented lodgings cost rent; a shared shelter or no roof at all costs nothing
  // but comfort. Owned homes cost their upkeep.
  const tier=s.life.home?.tier,sheltered=s.family?.housing&&s.family.housing!=='secure';
  const home=tier&&tier!=='lodgings'?({cottage:30,townhouse:90,estate:240})[tier]??0:sheltered?0:60;
  const children=s.life.children.filter(c=>c.alive!==false&&Math.max(0,Math.floor((day-c.bornDay)/365))<18).length;
  const address=s.life.home?.locationId||s.hero.birthplaceId||s.locationId;
  const support=communityFoodSupportAt(s,address,day);
  return lifestyle.annual+home+children*45+(s.life.focus==='education'?60:0)+stationDues(s)-Math.min(120,support);
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
  const paid=Math.min(Math.max(0,s.hero.gold),due),short=due-paid;
  s.hero.gold-=paid;b.billedGold+=due;b.paidGold+=paid;
  // Legacy saves without a ledger keep their recorded support; new lives borrow.
  const legacy=b.debt===undefined;
  const year=Math.floor((s.day-(s.timeline?.birthDay||0))/365);
  let support=0,borrowed=0;
  if(short){
    const firstAdultYear=s.age<19;
    if(legacy||(firstAdultYear&&!b.graceUsed)){support=short;b.supportedGold+=short;if(!legacy)b.graceUsed=true;}
    else{borrowed=short;b.debt=(b.debt||0)+short;b.borrowedGold=(b.borrowedGold||0)+short;}
  }
  if(support||borrowed)s.life.lifestyle='frugal';
  const entry={day:s.day,due,paid,support,focus:s.life.focus,lifestyle:s.life.lifestyle,...(borrowed?{borrowed}:{})};
  b.history.push(entry);b.history=b.history.slice(-100);
  // Small settlements after short actions accumulate quietly; the year's
  // entry, a shortfall, or a notable bill gets written down.
  if(forceJournal||short||(b.lastJournalYear!==year&&(paid>=10||due>=10))) {
    const text=borrowed
      ?`The household cost ${due} gold this season and you had ${paid}. The rest, ${borrowed} gold, is owed. You owe ${b.debt} gold in all, and the lender counts the years.`
      :support
        ?`The household cost ${due} gold and you had ${paid}. Neighbours and the parish carried the ${support}-gold shortfall this once; it will not happen twice.`
        :`Provisions, rent and the needs of the household took ${paid} gold.`;
    ctx.journal?.(borrowed?'Money owed':support?'Carried through a hard season':'The cost of an ordinary life',text,'household');b.lastJournalYear=year;
  }
  return paid;
}
/** Charge a year's interest once per lived year and report the debt's weight. */
export function chargeDebtInterest(s,ctx={}) {
  const b=s.householdBudget;
  if(!b||b.debt===undefined||s.phase==='retired')return;
  const year=Math.floor((s.day-(s.timeline?.birthDay||0))/365);
  if(b.lastInterestYear===year)return;
  b.lastInterestYear=year;
  if(b.debt<=0)return;
  const interest=Math.max(1,Math.floor(b.debt*DEBT_INTEREST));
  b.debt+=interest;b.debtInterestPaid+=interest;
  ctx.journal?.('The lender\u2019s arithmetic',`A year\u2019s interest adds ${interest} gold to what you owe. The debt stands at ${b.debt}.`,'household');
}
/** Pay down debt from cash in hand; returns the amount paid. */
export function repayDebt(s,amount) {
  const b=s.householdBudget;
  if(!b||!(b.debt>0))return 0;
  const paid=Math.max(0,Math.min(Math.floor(amount),b.debt,s.hero.gold));
  s.hero.gold-=paid;b.debt-=paid;
  return paid;
}
/** The lender's patience runs out: an event the player must answer. */
export const DEBT_RECKONING_EVENT={id:'debt_reckoning',ids:()=>({debt_reckoning:['sell','bond','plead','flee','forge','defy']})};
export function debtReckoning(s,ctx={}) {
  const b=s.householdBudget;
  if(!b||!(b.debt>0)||s.event||s.phase==='retired'||s.age<18)return false;
  const annual=Math.max(1,householdAnnualCost(s));
  if(b.debt<annual*DEBT_RECKONING_MULTIPLE)return false;
  if(b.lastReckoningYear===Math.floor((s.day-(s.timeline?.birthDay||0))/365))return false;
  const home=s.life.home?.tier&&s.life.home.tier!=='lodgings';
  // Past six years of costs with nothing to sell, the lender has stopped asking.
  const desperate=!home&&b.debt>=annual*6;
  const choices=[
    ...(desperate?[]:home?[{id:'sell',label:'Sell the house',description:`Your ${s.life.home.tier} clears ${Math.min(b.debt,HOME_VALUE[s.life.home.tier]||0)} of the debt. You go back to rented lodgings.`}]:[{id:'sell',label:'Sell what you own',description:'Your tools, cloak and anything of value go to the broker for a fraction of their worth.'}]),
    {id:'bond',label:'Bind yourself to a year of labour',description:'A year of work for the creditor, unpaid. The debt is cleared. You will not choose your days.'},
    ...(desperate?[]:[{id:'plead',label:'Plead for time',description:'Another year, at a steeper rate. Sometimes it is granted.'}]),
    {id:'flee',label:'Leave in the night',description:'Walk away from the debt, the town and your name there. The debt does not forget.'},
    // Some answers exist only for some natures.
    ...(hasNature(s,'deceitful')&&!desperate?[{id:'forge',label:'Alter the ledger',description:'A few strokes of a pen and half of what you owe was never lent. If the lender can read, he will know whose hand it was.',nature:'deceitful'}]:[]),
    ...(hasNature(s,'brave')?[{id:'defy',label:'Stand in the door',description:'Let him look at your hands, and the axe beside them. He goes away. He does not forget either.',nature:'brave'}]:[]),
  ];
  ctx.setEvent?.(DEBT_RECKONING_EVENT.id,desperate?'The lender, with company':'The lender at the door','Money owed',desperate
    ?`${b.debt} gold is owed, there is nothing left to sell, and the lender has brought two men with him. He is not asking any more. Your labour, or the road.`
    :`${b.debt} gold is owed and the lender has stopped waiting. ${home?'He has looked at your house.':'He has looked at your hands.'} Interest alone is ${Math.max(1,Math.floor(b.debt*DEBT_INTEREST))} a year now. He wants an answer before the week is out.`,choices);
  b.lastReckoningYear=Math.floor((s.day-(s.timeline?.birthDay||0))/365);
  return true;
}
const HOME_VALUE={cottage:220,townhouse:600,estate:1500};
export function applyDebtReckoningChoice(s,eventId,choice,ctx={}) {
  if(eventId!==DEBT_RECKONING_EVENT.id)return false;
  const b=s.householdBudget;if(!b)return false;
  if(choice==='sell'){
    const tier=s.life.home?.tier;
    if(tier&&tier!=='lodgings'){const value=HOME_VALUE[tier]||0;const cleared=Math.min(b.debt,value);b.debt-=cleared;s.hero.gold+=value-cleared;s.life.home={...s.life.home,tier:'lodgings'};ctx.journal?.('The house sold',`The ${tier} went to clear ${cleared} gold of debt. ${value-cleared?`${value-cleared} gold came back to you. `:''}You sleep in rented lodgings now.`,'household');}
    else{const value=40+Math.floor(s.hero.gold*0);const cleared=Math.min(b.debt,value);b.debt-=cleared;s.life.stress=Math.min(100,(s.life.stress||0)+10);ctx.journal?.('Sold for a fraction',`What you owned fetched ${value} gold at the broker. ${cleared} went to the debt. ${b.debt?`${b.debt} remains.`:'You owe nothing, and own almost nothing.'}`,'household');}
    return true;
  }
  if(choice==='bond'){
    b.debt=0;b.bondedUntil=s.day+365;s.life.lifestyle='frugal';s.life.stress=Math.min(100,(s.life.stress||0)+20);
    ctx.journal?.('Bonded',`You put your mark to a year of unpaid labour. The debt is cleared. Until day ${b.bondedUntil} your days belong to the creditor.`,'household');
    return true;
  }
  if(choice==='plead'){
    // Someone who has studied the law reads the paper back to the lender, and the rate is the lawful one.
    const lawyer=hasCredential(s,'clerkship')||studyLevel(s,'law')>=3;
    const granted=lawyer||(s.hero.skills?.persuasion||0)>=4||(s.life?.career?.reputation||0)>=60;
    // The unlettered sign what they are handed. The paper says more than the lender did.
    const cheated=!isLiterate(s);
    if(lawyer)useStudy(s,'law');
    if(granted){b.debt+=Math.floor(b.debt*(cheated?0.22:lawyer?0.1:0.15));ctx.journal?.('A year\u2019s grace',lawyer?`You read the lender his own paper back, with the clause he hoped you would not find, and the rate on the year's grace is the lawful tenth. He will not forget it. The debt stands at ${b.debt}.`:`The lender agrees to wait a year, at a harder rate.${cheated?' You put your mark to a paper you could not read; the rate on it is not the one he named.':''} The debt stands at ${b.debt}.`,'household');}
    else{b.debt+=Math.floor(b.debt*0.15);s.life.stress=Math.min(100,(s.life.stress||0)+15);b.lastReckoningYear=null;ctx.journal?.('Refused',`The lender does not care for your reasons. The rate rises and he will be back.`,'household');}
    return true;
  }
  if(choice==='forge'){
    if(!hasNature(s,'deceitful'))return false;
    const caught=seededRoll(s.seed,`debt:forge:${s.day}`,100)<40;
    if(caught){b.debt+=Math.floor(b.debt*0.25);s.legal.evidence=(s.legal.evidence||0)+2;s.life.stress=Math.min(100,(s.life.stress||0)+15);ctx.standing?.('underworld',1);ctx.journal?.('The hand on the ledger',`The lender could read, and he read your hand. The debt is a quarter larger for the insult, and there is a magistrate who has your name now.`,'household');}
    else{const cleared=Math.floor(b.debt/2);b.debt-=cleared;ctx.standing?.('underworld',1);ctx.journal?.('A few strokes of a pen',`Half of what you owed was never lent, according to the book. ${cleared} gold gone from the page. The lender signs beneath it without looking twice.`,'household');}
    return true;
  }
  if(choice==='defy'){
    if(!hasNature(s,'brave'))return false;
    b.debt+=Math.floor(b.debt*0.2);s.life.stress=Math.max(0,(s.life.stress||0)-10);b.lastReckoningYear=null;
    ctx.journal?.('The door held',`He looked at your hands and the axe beside them, and he went away. The rate rises for the insult, and he will be back with company.`,'household');
    return true;
  }
  if(choice==='flee'){
    b.fledDebt=(b.fledDebt||0)+b.debt;b.fledFrom=s.locationId;b.debt=0;
    s.life.stress=Math.min(100,(s.life.stress||0)+25);
    for(const p of s.life.people||[])if(p.locationId===s.locationId&&p.alive!==false)p.bond=Math.max(0,(p.bond||0)-20);
    ctx.journal?.('Gone in the night',`You left the town and the debt behind. People there will remember what you did. ${b.fledDebt} gold is still owed, to someone who keeps accounts.`,'household');
    return true;
  }
  return false;
}
export const debtWeight=s=>{const b=s.householdBudget;if(!b||!(b.debt>0))return 0;return b.debt/Math.max(1,householdAnnualCost(s));};
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
  const b=s.householdBudget,owed=b.debt||0;
  // Owed money is paid from what you carry; nothing else pays it down.
  const repay=b.debt===undefined?[]:[{id:'budget_repay',label:owed?`Pay down what you owe (${Math.min(owed,s.hero.gold)} of ${owed} gold)`:'Pay down what you owe',description:'Hand the lender what you can from what you carry. Interest stops on what is paid.',days:0,cost:0,group:'Household',disabledReason:!owed?'You owe nothing.':s.hero.gold<=0?'You have nothing to pay with.':undefined}];
  return [...repay,...HOUSEHOLD_FOCI.map(f=>({id:`budget_focus_${f.id}`,label:f.label,description:`${f.description} Ordinary Age up income uses ${Math.round(RATIOS[f.id]*100)}% of the normal working schedule. Dedicated work commitments keep their agreed wages.`,disabledReason:s.life.focus===f.id?'This is your current priority.':undefined})),...HOUSEHOLD_LIFESTYLES.map(l=>({id:`budget_lifestyle_${l.id}`,label:l.label,description:`${l.description} Base provisions: ${l.annual} gold per actual adult year; property, dependent children and scheduled lessons add their visible costs.`,disabledReason:s.life.lifestyle===l.id?'This is your current living standard.':undefined}))].map(a=>({...a,days:0,cost:0,group:'Household priorities'}));
}
export function applyHouseholdBudgetAction(s,id,ctx={}) {
  if(!householdBudgetActions(s).some(a=>a.id===id&&!a.disabledReason))return false;
  if(id==='budget_repay'){
    const paid=repayDebt(s,s.hero.gold),left=s.householdBudget.debt;
    s.notice=left?`You paid ${paid} gold against the debt. ${left} remains.`:`You paid the last ${paid} gold of it. You owe nothing.`;
    ctx.journal?.(left?'Paid down':'Paid off',s.notice,'household');
    return true;
  }
  if(id.startsWith('budget_focus_'))s.life.focus=id.slice(13);
  else s.life.lifestyle=id.slice(17);
  s.notice='Your future days follow these household priorities. Changing the plan grants no money, skills or recovery.';
  ctx.journal?.('A priority you chose for your own life',`${HOUSEHOLD_FOCI.find(f=>f.id===s.life.focus).label}; ${HOUSEHOLD_LIFESTYLES.find(l=>l.id===s.life.lifestyle).label.toLowerCase()}. Past costs and paid work remain recorded. Future living costs are ${householdAnnualCost(s)} gold per adult year.`,'household');
  return true;
}
export function householdBudgetView(s) {
  if(!s.householdBudget)return null;
  const b=s.householdBudget,forecast=householdCostPreview(s,365);
  return {...forecast,focus:s.life.focus,lifestyle:s.life.lifestyle,paid:b.paidGold,supported:b.supportedGold,debt:b.debt||0,history:b.history.map(e=>({...e})),actions:householdBudgetActions(s),description:'Living costs follow actual adult days. What you cannot pay is owed, and owed money grows. They are settled during Age up, committed work, and the closing of a life. Work income is shown before these household costs; a full work commitment keeps its original wage agreement.'};
}
export function validateHouseholdBudget(b,s) {
  if(b&&b.debt!==undefined&&!(integer(b.debt)&&integer(b.borrowedGold)&&integer(b.debtInterestPaid)&&(b.lastInterestYear===null||integer(b.lastInterestYear))&&typeof b.graceUsed==='boolean'&&(b.lastReckoningYear==null||integer(b.lastReckoningYear))&&(b.bondedUntil===undefined||integer(b.bondedUntil))&&(b.fledDebt===undefined||integer(b.fledDebt))))return false;
  if(!b||!['startedDay','lastDay','accruedUnits','billedGold','paidGold','supportedGold'].every(k=>integer(b[k]))||!b.focusDays||!HOUSEHOLD_FOCI.every(f=>integer(b.focusDays[f.id]))||b.lastDay>s.day||b.startedDay>b.lastDay||b.billedGold>Math.floor(b.accruedUnits/365)||b.paidGold+b.supportedGold+(b.borrowedGold||0)!==b.billedGold||!(b.lastJournalYear===null||integer(b.lastJournalYear))||!Array.isArray(b.history)||b.history.length>100)return false;
  return b.history.every(e=>e&&integer(e.day)&&e.day<=s.day&&integer(e.due)&&integer(e.paid)&&integer(e.support)&&e.due===e.paid+e.support+(e.borrowed||0)&&(e.borrowed===undefined||integer(e.borrowed))&&HOUSEHOLD_FOCI.some(f=>f.id===e.focus)&&HOUSEHOLD_LIFESTYLES.some(l=>l.id===e.lifestyle));
}
