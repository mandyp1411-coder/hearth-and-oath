import { fortuneIncomeFactor } from './fortune.js';
import { generateCharacter } from './characters.js';
import { seededRoll, generatePersonName, worldCalendarContext, isSettlement, withArticle } from './world.js';
import { GEAR_CATALOG, MATERIAL_IDS } from './gear.js';
import { MATERIAL_PRICES, returnQuote } from './economy-values.js';
import { CAREER_SPECIALTIES, captureCareerDevelopment, careerReviewTerms, careerDevelopmentText, validCareerDevelopment } from './career-development.js';
import { workshopTier } from './workshop.js';
import { householdCostPreview } from './budget.js';
import { recurringCustomer, meetSocietyCustomer, recordSocietyCommission, syncSocietyStaff } from './society.js';

import { PROFESSION_CATALOG as ENTRY_PROFESSION_CATALOG, getProfession as entryGetProfession, professionSkill as entryProfessionSkill, MODERN_CAREER_LEVELS, unpaidCareerExperience, freshCareerRecord, civilianEntryReason } from './career-entry.js';
// Keep the established public references without re-export syntax: the standalone
// module translator supports named imports and local declaration exports.
export const PROFESSION_CATALOG = ENTRY_PROFESSION_CATALOG;
export const getProfession = entryGetProfession;
export const professionSkill = entryProfessionSkill;

const LEVELS=[0,30,100,250,500], TITLES=['Apprentice','Practitioner','Journeyworker','Master','Master artisan'];
const modern=s=>s.careers?.contentVersion===2;
const levels=s=>modern(s)?MODERN_CAREER_LEVELS:LEVELS;
const LEGACY_MATERIALS={ore:4,wood:4,cloth:3};
const MASTERWORK_MATERIALS={
  Blacksmith:LEGACY_MATERIALS,Farmer:{wood:4,cloth:3,stone:2},Alchemist:{crystal:4,cloth:3,wood:2},
  Innkeeper:{wood:6,cloth:5,stone:2},Miner:{ore:4,wood:4,stone:3},Bard:{wood:2,cloth:4},
  Cartographer:{cloth:4,wood:2,crystal:1},Healer:{cloth:5,wood:2,crystal:1},
  Scholar:{cloth:4,wood:3},Herbalist:{wood:4,cloth:3,stone:2},Merchant:{cloth:4,wood:4},Soldier:{wood:4,ore:3,cloth:3},
};
const PUBLIC_WORK_NAMES={Blacksmith:'a community tool-repair bench',Farmer:'a shared seed and irrigation record',Alchemist:'a public well-testing station',Innkeeper:'a travelers’ shelter room',Miner:'a public gallery-safety course',Bard:'a household memory and music gathering',Cartographer:'an accessible crossing survey',Healer:'a free follow-up care clinic',Scholar:'a public reading and copying table',Herbalist:'a shared remedy-drying garden',Merchant:'a fair-weight cooperative counter',Soldier:'a civilian bridge-safety course'};
const serviceMaterials=s=>Object.fromEntries(Object.entries(MASTERWORK_MATERIALS[s.hero.profession] || LEGACY_MATERIALS).map(([id,n])=>[id,Math.max(1,Math.ceil(n/2))]));
export const masterworkMaterials=(s,profession=s.hero?.profession)=>({...((modern(s)&&MASTERWORK_MATERIALS[profession]) || LEGACY_MATERIALS)});
const PRICES=MATERIAL_PRICES;
const plain=v=>!!v && typeof v==='object' && !Array.isArray(v) && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null);
const clamp=(n,max=100)=>Math.max(0,Math.min(max,n));
const place=(s,id=s.locationId)=>s.world?.locations?.find(p=>p.id===id);
const open=p=>p && !['destroyed','evacuated'].includes(p.status) && p.servicesAvailable!==false;
const settlement=s=>isSettlement(s.world,s.locationId);
const current=s=>getProfession(s.hero?.profession) || PROFESSION_CATALOG[0];
const ledger=(s,name=s.hero.profession)=>s.careers?.records?.[getProfession(name)?.name];
const adult=s=>(s.age || 0)>=16 && s.phase!=='retired' && s.hero?.alive!==false;
const waiting=s=>s.event || s.battle || s.conversations?.pending || s.dungeon || s.timeline?.journey || s.timeline?.yearTarget || s.workshop?.project || s.life?.plan || s.society?.project;
const ready=s=>s.careers && adult(s) && !waiting(s);
const materialText=m=>Object.entries(m).filter(([,n])=>n>0).map(([id,n])=>`${n} ${id}`).join(', ') || 'no personal materials';
const missing=(s,m)=>Object.entries(m).some(([id,n])=>(s.equipment?.materials?.[id] || 0)<n);
const emptyRecord=freshCareerRecord;
const ownerId=s=>`birth-${Number.isSafeInteger(s.timeline?.birthDay)?s.timeline.birthDay:s.timeline?.mode==='birth'?0:-6570}`;
const actorName=(s,salt)=>generatePersonName(s.seed,`career-${salt}-generation-${s.dynasty?.generation ?? 1}`);
const record=(s,ctx,title,text,kind='career')=>{
  s.careers.sequence++;
  s.careers.history.push({id:`career-history-${s.careers.sequence}`,day:s.day,age:s.age,profession:s.hero.profession,locationId:s.locationId,title,text,kind});
  s.careers.history=s.careers.history.slice(-120);s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'career');
};
const adjust=(s,amount)=>{const r=ledger(s);if(r)r.reputation=clamp(r.reputation+amount);};
const skill=(s,id,n=1)=>{if(id && Number.isFinite(s.hero.skills?.[id]))s.hero.skills[id]=Math.min(10000,s.hero.skills[id]+n);};
const choice=(id,label,description)=>({id,label,description});
const setPending=(s,ctx,p,title,body,choices)=>{s.careers.pending=p;ctx.setEvent?.(p.eventId,title,'Civilian life & livelihood',body,choices);};
const action=(s,id,label,description,days=0,cost=0,reason=null,extra={})=>({id,label,description,days,cost,group:'Career & craft',...extra,...(reason || s.hero.gold<cost?{disabledReason:reason || `Requires ${cost} gold; you have ${s.hero.gold}.`}:{})});

export function professionWage(s,days=3) {
  const p=current(s), r=ledger(s), certification=['Healer','Scholar'].includes(p.name)&&s.flags?.certified?8:0;
  const earned=s.careers?.preserveLegacyPlan?0:(r?.mastery || 0)*2+(r?.reputation>=65?2:0);
  return Math.floor((p.wage+(s.life?.career?.rank || 0)*4+certification+earned)*Math.max(0,days)/3);
}
export function professionAnnualWage(s) {
  const p=current(s),r=ledger(s),earned=s.careers?.preserveLegacyPlan?0:(r?.mastery || 0)*60+(r?.reputation>=65?30:0);
  return p.annualWage+(s.life?.career?.rank || 0)*120+(s.flags?.certified?50:0)+earned;
}

export function initializeCareers(s,{migration=false}={}) {
  if(s.careers)return;
  s.careers={...(!migration?{contentVersion:2,publicWorks:[]}:{}),ownerId:ownerId(s),records:Object.fromEntries(PROFESSION_CATALOG.map(p=>[p.name,emptyRecord()])),active:null,shop:null,batch:null,pending:null,queued:null,claimedIds:[],history:[],masterworks:[],sequence:0,preserveLegacyPlan:!!(migration && s.life?.plan)};
  // Existing rank and wages remain in life.career. No old labor or shop is invented.
}

// Authored birthday decisions can award professional learning without claiming
// work days, income, material production, or a second annual wage payment.
export function addCareerExperience(s,amount,professionName=s.hero?.profession) {
  const r=ledger(s,professionName);
  if(!r || !Number.isSafeInteger(amount) || amount<=0)return false;
  r.experience=Math.min(1000000,r.experience+amount);
  r.mastery=levels(s).reduce((n,threshold,i)=>r.experience>=threshold?i:n,0);
  return true;
}

export function recordCareerWork(s,{days=3,source='work',paid=true,gold=0}={},ctx={}) {
  if(!s.careers || !Number.isInteger(days) || days<0 || !adult(s))return false;
  const p=current(s),r=ledger(s),before=r.workedDays;
  if(days===0) {
    if(!modern(s)||!paid||!Number.isSafeInteger(gold)||gold<=0)return false;
    r.earnedGold=Math.min(100000000,r.earnedGold+gold);return true;
  }
  const actual=Math.min(days,1000000-r.workedDays),unpaidBefore=r.unpaidWorkedDays;
  if(!actual)return false;
  r.workedDays+=actual;
  if(paid)r.paidWorkedDays+=actual;else r.unpaidWorkedDays+=actual;
  addCareerExperience(s,paid?actual:unpaidCareerExperience(r.unpaidWorkedDays)-unpaidCareerExperience(unpaidBefore));
  r.earnedGold=Math.min(100000000,r.earnedGold+Math.max(0,Math.floor(gold)));
  const periods=Math.floor(r.workedDays/14)-Math.floor(before/14);
  if(periods>0) {
    // Actual practice trains the same skill whether time is spent in individual
    // shifts, a saved commitment, commissioned work, or a family business.
    if(modern(s))skill(s,p.skill,periods);
    if(p.name==='Blacksmith' && s.workshop)s.workshop.crafting=clamp(s.workshop.crafting+periods);
    if(p.name==='Miner' && s.equipment)s.equipment.materials.ore=Math.min(100000,(s.equipment.materials.ore || 0)+periods);
    if(['Farmer','Herbalist'].includes(p.name) && s.flags)s.flags.herbs=Math.min(100000,(s.flags.herbs || 0)+periods);
  }
  if(!s.careers.queued && !s.careers.pending && r.workedDays>=30 && r.lastStoryAge!==s.age && p.name!=='Unemployed') {
    r.lastStoryAge=s.age;
    const scene=modern(s)?(s.age+seededRoll(s.seed,`career-story-cycle:${p.id}`,4))%4:seededRoll(s.seed,`career-story:${p.id}:${s.age}:${Math.floor(r.workedDays/30)}`,4);
    s.careers.queued={eventId:'career_year',profession:p.name,age:s.age,scene,customerName:actorName(s,`story:${p.id}:${s.age}`),...(modern(s)?{development:captureCareerDevelopment(s,p.name,r,source)}:{})};
  }
  void source;return true;
}

function board(s) {
  const p=current(s),r=ledger(s),period=Math.floor(s.day/90);
  return [0,1,2].map(i=>{
    const item=boardGood(s,p,s.locationId,period,i);
    const customer=recurringCustomer(s,p.name,s.locationId,i);
    return {termsVersion:2,specialty:r?.specialty || null,id:`commission-${p.id}-${s.locationId}-${period}-${i}`,profession:p.name,period,index:i,offeredMastery:r?.mastery || 0,customerName:customer?.name || actorName(s,`${s.locationId}:${period}:${i}`),...(customer?{societyCustomerId:customer.id}:{}),locationId:s.locationId,goodId:item.id,goodName:item.name,materials:{...item.materials},days:item.days,pay:item.pay+(r?.mastery || 0)*6,targetQuality:28+(r?.mastery || 0)*7+i*2,offeredDay:period*90,expiresDay:(period+1)*90,dueDay:s.day+45+seededRoll(s.seed,`career-due:${p.id}:${period}:${i}`,21),tier:item.tier || 1,gearId:item.gearId || null};
  }).filter(o=>!s.careers.claimedIds.includes(o.id));
}
function boardGood(s,p,locationId,period,index) {
  const at=modern(s)?(seededRoll(s.seed,`career-board:${p.id}:${locationId}:${period}`,p.goods.length)+index)%p.goods.length:seededRoll(s.seed,`career-good:${p.id}:${locationId}:${period}:${index}`,p.goods.length);
  return p.goods[at];
}
function method(s,id,c=s.careers.active) {
  if(!c)return null;
  const materials={...c.materials};
  if(id==='fine') {const key=Object.keys(materials)[0] || 'cloth';materials[key]=(materials[key] || 0)+1;}
  return {id,materials,days:Math.max(1,c.days+(id==='fine'?2:id==='rush'?-1:0)),cost:id==='fine'?6:id==='rush'?1:3,bonus:id==='fine'?14:id==='rush'?-14:0};
}
export function commissionQuality(s,c,style='standard') {
  const p=getProfession(c.profession),r=ledger(s,c.profession),m=method(s,style,c);
  return Math.round(clamp(25+Math.min(35,r.experience*.07)+Math.min(20,(s.hero.skills[p.skill] || 0)*2)+Math.min(20,(s.workshop?.crafting || 0)*3)+(s.careers.shop?.profession===c.profession?s.careers.shop.tier*2:0)+seededRoll(s.seed,`career-quality:${c.id}`,7)+(m?.bonus || 0)+(c.specialty==='precision'?4:0)));
}
export function commissionThresholds(c) {
  return {target:c.targetQuality,exceptional:c.termsVersion===2?c.targetQuality+18:null};
}
export function invoicePay(a,decision) {
  const exceptional=a.termsVersion===2&&a.quality>=commissionThresholds(a).exceptional&&decision!=='conceal';
  return Math.floor(a.pay*(a.late?.75:1)*(decision==='community'?.55:decision==='honest'&&a.quality<a.targetQuality?.65:1)*(exceptional?1.2:1));
}
export function commissionQuote(s,c,style='standard') {
  const m=method(s,style,c),estimated=c.status==='ready'?c.quality:commissionQuality(s,c,style),late=c.late||c.status!=='ready'&&s.day+m.days>c.dueDay;
  const result={...c,quality:estimated,late},receipt=invoicePay(result,'honest');
  return {...returnQuote({materials:m.materials,fee:m.cost,days:m.days,receipt,living:s.householdBudget?householdCostPreview(s,m.days).additionalCost:0}),quality:estimated,late,...commissionThresholds(c),communityReceipt:invoicePay(result,'community'),fullReceipt:invoicePay(result,'conceal')};
}
const quoteText=q=>`Honest delivery: ${q.receipt} gold${q.late?' after the late-payment reduction':''}; fee ${q.fee}, ingredients worth ${q.materialValue} at cooperative replacement prices, living costs about ${q.living}; net value ${q.netValue>=0?'+':''}${q.netValue} gold over ${q.days} work days. Materials already in your bag still have this replacement value. ${q.exceptional===null?'This older agreement has no exceptional-quality premium.':`Target ${q.target}; exceptional ${q.exceptional} earns a 20% premium on honest or community delivery. Above ${q.exceptional} gives no further payment.`}`;

function benchReason(s,c) {
  const gear=c.gearId?GEAR_CATALOG.find(g=>g.id===c.gearId):null;
  if(gear && (s.workshop?.crafting || 0)<(gear.craftSkill || 0))return `Requires crafting ${gear.craftSkill}.`;
  if(c.profession==='Blacksmith' && workshopTier(s)<c.tier)return `Requires a tier ${c.tier} workbench; local tool work and wages remain available.`;
  return null;
}

export function careerActions(s) {
  if(!ready(s))return [];
  const c=s.careers,r=ledger(s),p=current(s);
  if(c.batch)return [action(s,'career_batch_continue',`Continue ${c.batch.title.toLowerCase()}`,`${c.batch.remainingDays} real work days remain. Only completed days earn wages; the same job, wage agreement, and progress resume.`,0,0,!open(place(s,c.batch.locationId))?'This workplace is unavailable; cancel the commitment.':s.locationId!==c.batch.locationId?'Return to the workplace before continuing.':null,{durationDays:c.batch.remainingDays}),action(s,'career_batch_cancel','Release the remaining work commitment','Keep wages already earned; no future days or income are granted. Reserved masterwork materials remain consumed.',0)];
  if(!settlement(s))return [];
  const actions=PROFESSION_CATALOG.filter(job=>job.name!==p.name).map(job=>action(s,`career_choose_${job.id}`,job.name==='Unemployed'?'Return to flexible local labor':`Learn the work of ${withArticle(job.name.toLowerCase())}`,`${job.description} A named local mentor offers an accessible introduction. Your combat identity stays independent; previous career records are retained.`,1));
  actions.push(action(s,'career_work',`Work as ${p.name==='Unemployed'?'a local laborer':withArticle(p.name.toLowerCase())}`,`Three days of safe local work earn ${professionWage(s)} gold and 3 professional experience. At fourteen actual work days, ${modern(s)&&p.skill?`${p.skill} improves by 1; `:''}smiths gain crafting practice, miners gain ore, and growers gather one remedy bundle. The same actual-day learning applies to saved commitments and shop work. No battle or class is required.`,3));
  actions.push(action(s,'career_practice','Practice a difficult part of your profession','Gain 6 professional experience and one relevant skill through supervised practice. Smiths also gain 1 crafting. Once every 14 days.',3,4,p.name==='Unemployed'?'Choose a profession first.':r.lastPracticeDay!==null && s.day-r.lastPracticeDay<14?`Another lesson opens in ${14-(s.day-r.lastPracticeDay)} days.`:null));
  for(const duration of [30,365]) {
    const budget=s.householdBudget?` At your present living standard, these days accrue about ${householdCostPreview(s,duration).additionalCost} gold in household costs; changes in your household can change that rate.`:'';
    actions.push(action(s,`career_batch_${duration===30?'month':'year'}`,`Commit to ${duration===30?'a month':'a year'} of civilian work`,`${duration} real work days, at an agreed ${professionWage(s)} gold per three days.${budget} Work pauses for birthdays, health, known needs, promises, and career decisions; save or cancel remaining work without imaginary wages.`,0,0,null,{durationDays:duration}));
  }
  for(const [id,price] of Object.entries(PRICES))actions.push(action(s,`career_buy_${id}`,`Buy 3 ${id} from the materials merchant`,`Receive 3 actual ${id}, shared with Workshop recipes and commissions. Supplies cost ${price*3} gold; no journey or fighting is required.`,1,price*3));
  for(const [id,specialty]of Object.entries(CAREER_SPECIALTIES))actions.push(action(s,`career_specialty_${id}`,`Develop ${specialty.name.toLowerCase()}`,`${specialty.description} Applies to future accepted commissions; accepted terms stay as promised. Six days and 24 gold. Choosing again replaces your professional focus.`,6,24,p.name==='Unemployed'?'Choose a profession first.':r.mastery<1?'Earn practitioner mastery first.':r.specialty===id?'This is your current specialty.':null));
  if(!c.active)for(const offer of board(s))actions.push(action(s,`career_accept_${offer.id}`,`Take ${offer.customerName}’s commission`,`${offer.goodName}: ${materialText(offer.materials)}, ${offer.days} standard work days, ${offer.pay} gold on delivery, requested quality ${offer.targetQuality}. Due on day ${offer.dueDay}. One accepted commission at a time; no payment before real delivery. ${quoteText(commissionQuote(s,offer))}`,0));
  else {
    const a=c.active;
    if(a.status==='accepted')for(const id of ['standard','fine','rush']) {
      const m=method(s,id),estimated=commissionQuality(s,a,id),reason=a.profession!==p.name?'Return to this profession to complete its commissioned work.':benchReason(s,a) || (missing(s,m.materials)?`Requires ${materialText(m.materials)}.`:null);
      actions.push(action(s,`career_make_${id}`,`${id==='fine'?'Invest in careful finishing':id==='rush'?'Rush the deadline':'Make the agreed work'}`,`${a.goodName} for ${a.customerName}. Consume ${materialText(m.materials)} and ${m.cost} gold, spend ${m.days} days; estimated quality ${estimated}/${a.targetQuality}. ${id==='rush'?'Rushing sacrifices quality and adds strain.':'Materials and practiced skills determine the result.'} ${quoteText(commissionQuote(s,a,id))}`,m.days,m.cost,reason));
    }
    if(a.status==='ready')actions.push(action(s,'career_invoice',`Show ${a.customerName} the completed work`,`Actual quality ${a.quality}/${a.targetQuality}; ${a.late?'the deadline was missed, reducing the agreement to 75% payment.':'the base payment is '+a.pay+' gold.'} Honest invoice ${invoicePay(a,'honest')} gold; community invoice ${invoicePay(a,'community')} gold. ${a.termsVersion===2?`Exceptional quality starts at ${commissionThresholds(a).exceptional}; the 20% premium applies only to honest or community terms.`:''} Discuss quality honestly, choose a fair price, or knowingly conceal defects.`,0));
    actions.push(action(s,'career_abandon','Release the uncompleted commission','Tell the named customer; lose 5 professional reputation and record a failed promise. Already spent materials are not refunded. No penalty is sent to unrelated factions.',0));
  }
  if(!c.shop)actions.push(action(s,'career_open_shop',`Lease your own ${p.name==='Blacksmith'?'smithy':'workplace'}`,`Open a permanent named ${p.name.toLowerCase()} business here for 90 gold and seven days. Its site, upkeep, staff, and earnings become part of your life. A lease does not conjure Workshop buildings or free goods.`,7,90,p.name==='Unemployed'?'Choose a profession first.':r.experience<30?'Requires 30 professional experience.':null));
  else {
    const shop=c.shop,at=shop.locationId===s.locationId && open(place(s,shop.locationId)),crew=shop.staff.filter(a=>a.status==='working'),cost=10+crew.reduce((n,a)=>n+a.wage,0);
    actions.push(action(s,'career_shop_operate',`Open ${shop.name} for a working week`,`Seven days of actual ${shop.profession.toLowerCase()} work. Pay ${cost} gold in supplies and agreed staff wages; receive about ${shopRevenue(s,s.day+7)} gold before this expense. Expected net after the ${cost}-gold operating expense and about ${s.householdBudget?householdCostPreview(s,7).additionalCost:0} gold of household costs: ${shopRevenue(s,s.day+7)-cost-(s.householdBudget?householdCostPreview(s,7).additionalCost:0)} gold. Staff skill, reputation, and shop fittings affect trade.`,7,cost,!at?'Return to the operating business.':p.name!==shop.profession?'Return to your business’s profession first.':null));
    actions.push(action(s,'career_shop_upgrade',`Improve ${shop.name}’s fittings`,`Raise the business to tier ${shop.tier+1}. Consume ${materialText(shopUpgradeMaterials(shop.tier))}, ${shop.tier===1?180:350} gold, and seven days. Better fittings improve trade and commissioned quality; these are shop fittings, not a free Workshop forge.`,7,shop.tier===1?180:350,shop.tier>=3?'The shop already has its best fittings.':!at?'Return to the shop.':missing(s,shopUpgradeMaterials(shop.tier))?'Gather or buy the listed actual building materials.':null));
    actions.push(action(s,'career_hire',`Offer a place at ${shop.name}`,'Meet a named adult worker or sixteen-year-old apprentice. A fair contract costs 24 gold in setup; stated weekly wages are paid when operating. At most two active staff. No worker is owned.',1,0,!at?'Return to the shop.':crew.length>=2?'Two people already work alongside you.':shop.staff.length>=8?'This workshop’s bounded staff register is full.':null));
    if(crew.length)actions.push(action(s,'career_mentor','Make time to teach your staff','Three days and 4 gold raise each active worker’s skill by 4. An apprentice at skill 30 becomes a journeyworker with a 2-gold wage increase; teaching also practices scholarship. Once every 14 days.',3,4,!at?'Return to the shop.':shop.lastMentorDay!==null && s.day-shop.lastMentorDay<14?'Let the staff practice for 14 days between supervised lessons.':null));
  }
  const mastered=r.mastery>=4 && r.commissions>=5;
  const legacyMaterials=masterworkMaterials(s);
  actions.push(action(s,'career_masterwork','Begin the work you want to leave behind',`Commit fourteen real days, 35 gold, and ${materialText(legacyMaterials)} to ${masterworkName(p.name)}. Requires age 30, mastery 4, and five delivered commissions. Supplies are consumed once; needs and birthdays preserve unfinished progress. Decide who receives the finished work only after it is complete.`,0,35,p.name==='Unemployed'?'Choose a profession first.':s.age<30?'A lifetime masterwork opens at age 30.':!mastered?`Requires mastery 4 (${levels(s)[4]} experience) and five completed commissions.`:c.masterworks.some(w=>w.profession===p.name && w.ownerId===c.ownerId)?'Your lifetime work for this profession is already recorded.':missing(s,legacyMaterials)?`Requires ${materialText(legacyMaterials)}.`:null,{durationDays:14,materials:{...legacyMaterials}}));
  if(p.name!=='Unemployed') {
    const materials=serviceMaterials(s),last=r.lastPublicWorkDay;
    actions.push(action(s,'career_public_work',`Fund and lead ${PUBLIC_WORK_NAMES[p.name]}`,`Spend seven real days, 180 gold, and ${materialText(materials)} on useful ${p.name.toLowerCase()} work for ${place(s).name}. Keep a signed local record; gain 6 village trust, 4 professional reputation, and 2 ${p.skill}. Active colleagues share credit and gain 2 skill. No town is restored and no customer is forced to join you. One project per profession every ninety days.`,7,180,s.age<18?'Public projects open at age 18.':r.mastery<1?'First earn practitioner mastery through actual work.':last!==undefined&&s.day-last<90?`Another public project opens in ${90-(s.day-last)} days.`:missing(s,materials)?`Requires ${materialText(materials)}.`:(c.publicWorks?.length || 0)>=200?'The public project register is complete.':null,{materials:{...materials}}));
  }
  return actions;
}
const shopUpgradeMaterials=tier=>tier===1?{wood:8,stone:4,ore:3}:{wood:12,stone:8,ore:6};
function shopRevenue(s,day=s.day) {
  const shop=s.careers.shop,r=ledger(s,shop.profession),crew=shop.staff.filter(a=>a.status==='working');
  const demand=seededRoll(s.seed,`career-market:${shop.locationId}:${Math.floor(day/30)}`,13)-6;
  return Math.max(20,Math.floor(getProfession(shop.profession).wage*7/3)+shop.tier*9+Math.floor(r.reputation/10)+crew.reduce((n,a)=>n+6+Math.floor(a.skill/8),0)+demand);
}

function beginBatch(s,kind,totalDays,ctx) {
  const p=current(s);
  s.careers.batch={kind,title:kind==='masterwork'?`A lasting ${p.name.toLowerCase()} work`:`${p.name} work commitment`,profession:p.name,locationId:s.locationId,totalDays,remainingDays:totalDays,completedDays:0,startedDay:s.day,wage:professionWage(s),paidGold:0};
  return progressBatch(s,ctx);
}
function progressBatch(s,ctx) {
  const b=s.careers.batch;
  if(!b || !adult(s) || waiting(s) || !open(place(s,b.locationId)) || s.locationId!==b.locationId || typeof ctx.spendDays!=='function')return false;
  for(let step=0;step<64 && b.remainingDays>0;step++) {
    if(waiting(s) || ctx.pendingNeed?.())break;
    const before=s.day,requested=Math.min(7,b.remainingDays);
    ctx.spendDays(requested,{});
    const actual=Math.max(0,s.day-before);
    if(!actual || s.careers.batch!==b || !adult(s))break;
    b.remainingDays=Math.max(0,b.remainingDays-actual);b.completedDays+=actual;
    if(b.kind==='work') {
      const paid=Math.floor(b.completedDays*b.wage/3)-b.paidGold;b.paidGold+=paid;s.hero.gold+=paid;
      recordCareerWork(s,{days:actual,source:'batch',gold:paid},ctx);
      if(s.life){s.life.career.experience=Math.min(1000000,s.life.career.experience+Math.floor(b.completedDays*2/3)-Math.floor((b.completedDays-actual)*2/3));s.life.stress=clamp(s.life.stress+Math.floor(b.completedDays/14)-Math.floor((b.completedDays-actual)/14));}
    } else recordCareerWork(s,{days:actual,source:'masterwork',paid:false},ctx);
    if(b.remainingDays===0) {
      s.careers.batch=null;
      ctx.completedActionId=b.kind==='masterwork'?'career_masterwork_completed':'career_work_completed';
      if(b.kind==='masterwork')setPending(s,ctx,{eventId:'career_legacy',profession:b.profession,quality:Math.min(100,70+ledger(s,b.profession).mastery*5),name:masterworkName(b.profession),startedDay:b.startedDay,completedDays:b.completedDays},'The work that will remain',`Your ${masterworkName(b.profession)} is actually finished after fourteen days. Its materials and labor cannot be claimed twice. Who should keep it, and whose name should its story preserve?`,[choice('community','Give the work to the community','Record a public legacy, gain 10 professional reputation and 8 village standing.'),choice('household','Keep it with your household’s true account','Record a household legacy and restore 8 happiness without inventing descendants.'),choice('teach','Publish its methods with your apprentice or workshop','Record a shared teaching legacy, gain scholarship and honor the actual apprentice’s name when present.')]);
      else record(s,ctx,'A civilian commitment completed',`${b.completedDays} actual ${b.profession.toLowerCase()} work days earned ${b.paidGold} gold. The calendar, needs, and intervening choices remain real.`);
    }
    ctx.afterAction?.();
    if(waiting(s) || s.careers.pending || s.careers.queued || !s.careers.batch)break;
  }
  if(s.careers.batch)s.notice=`${s.careers.batch.completedDays}/${s.careers.batch.totalDays} real days completed; ${s.careers.batch.remainingDays} remain. Already earned wages are kept.`;
  return true;
}
const masterworkName=name=>({Blacksmith:'the hinge that never seized',Farmer:'the community seed ledger',Alchemist:'the tested remedy formulary',Innkeeper:'the book of open doors',Miner:'the supported gallery plan',Bard:'the song with all its witnesses',Cartographer:'the atlas of accessible paths',Healer:'the consent and care book',Scholar:'the public reading folio',Herbalist:'the living grove manual',Merchant:'the fair exchange charter',Soldier:'the civilian protection manual'})[name] || 'a record of useful work';

export function applyCareerAction(s,id,ctx={}) {
  if(typeof id!=='string' || !id.startsWith('career_') || !s.careers)return false;
  if(id==='career_batch_continue')return progressBatch(s,ctx);
  if(id==='career_batch_cancel') {if(!s.careers.batch || !adult(s) || waiting(s))return false;const b=s.careers.batch;s.careers.batch=null;record(s,ctx,'An honest limit to work',`You released ${b.remainingDays} unworked days. ${b.paidGold} earned gold was retained; no unfinished work or future wages appeared.`);return true;}
  if(!ready(s) || s.careers.batch || !settlement(s))return false;
  const c=s.careers,p=current(s),r=ledger(s);
  if(id.startsWith('career_choose_')) {
    const next=getProfession(id.slice('career_choose_'.length));if(!next||civilianEntryReason(s,{profession:next.name}))return false;
    s.hero.profession=next.name;record(s,ctx,'An accessible civilian apprenticeship',`${actorName(s,`mentor:${next.id}:${s.locationId}`)} showed you the safe beginnings of ${next.name==='Unemployed'?'local labor':next.name.toLowerCase()+' work'} in ${place(s).name}. Earlier professions, family, combat training, and business property remain your own history.`);return true;
  }
  if(id.startsWith('career_specialty_')) {
    const idSuffix=id.slice('career_specialty_'.length);if(!Object.hasOwn(CAREER_SPECIALTIES,idSuffix)||r.mastery<1||r.specialty===idSuffix||p.name==='Unemployed')return false;
    r.specialty=idSuffix;record(s,ctx,'A professional focus chosen',`${CAREER_SPECIALTIES[idSuffix].name} now guides new ${p.name.toLowerCase()} commissions. Six days and 24 gold were committed; existing customer terms remain unchanged.`);return true;
  }
  if(id==='career_work') {
    // Worn down, you work worse: above 70 Stress a shift pays less, and the
    // customers notice. Only new-edition lives carry this.
    const worn=s.householdBudget?.debt!==undefined&&(s.life?.stress||0)>70;
    const bonded=(s.householdBudget?.bondedUntil||0)>s.day,wage=bonded?0:Math.floor(professionWage(s)*fortuneIncomeFactor(s)*(worn?0.7:1));s.hero.gold+=wage;recordCareerWork(s,{days:3,source:'shift',gold:wage},ctx);if(!modern(s))skill(s,p.skill);
    if(s.life){s.life.career.experience+=2;s.life.stress=clamp(s.life.stress+(bonded?4:2));}
    record(s,ctx,bonded?'Work for the creditor':'Ordinary useful work',bonded?`Three days of ${p.name.toLowerCase()} work, and every coin of it to the creditor. ${Math.max(0,s.householdBudget.bondedUntil-s.day)} days of the bond remain.`:`Three days of ${p.name.toLowerCase()} work earned ${wage} gold in ${place(s).name}.${worn?' Your hands shook and it showed in the pay.':''}`);return true;
  }
  if(id==='career_practice') {
    if(p.name==='Unemployed' || r.lastPracticeDay!==null && s.day-r.lastPracticeDay<14)return false;
    r.lastPracticeDay=s.day;recordCareerWork(s,{days:3,source:'practice',paid:false},ctx);addCareerExperience(s,4);skill(s,p.skill);
    if(p.name==='Blacksmith' && s.workshop)s.workshop.crafting=clamp(s.workshop.crafting+1);
    record(s,ctx,'The difficult part practiced',`A supervised ${p.name.toLowerCase()} lesson strengthened real technique. It did not choose an adventuring class.`);return true;
  }
  if(['career_batch_month','career_batch_year'].includes(id))return beginBatch(s,'work',id==='career_batch_month'?30:365,ctx);
  if(id.startsWith('career_buy_')) {
    const material=id.slice('career_buy_'.length);if(!Object.hasOwn(PRICES,material) || !s.equipment)return false;
    s.equipment.materials[material]=Math.min(100000,(s.equipment.materials[material] || 0)+3);record(s,ctx,'Supplies bought from living neighbors',`The local cooperative delivered 3 ${material}. The actual supplies can now become Workshop goods or commissioned work.`);return true;
  }
  if(id.startsWith('career_accept_')) {
    if(c.active)return false;const offer=board(s).find(o=>o.id===id.slice('career_accept_'.length));if(!offer)return false;
    c.claimedIds.push(offer.id);c.claimedIds=c.claimedIds.slice(-240);c.active={...offer,status:'accepted',quality:null,method:null,acceptedDay:s.day,late:false};
    meetSocietyCustomer(s,offer,ctx);
    ctx.addObligation?.(offer.id,`Deliver ${offer.goodName} to ${offer.customerName}`,offer.dueDay-s.day,`A ${offer.pay}-gold commission requesting quality ${offer.targetQuality}. Work consumes the listed real materials. Missing the promise reduces payment to 75% and costs 5 professional reputation; no universal moral or faction penalty.`);
    record(s,ctx,'A named customer, a real promise',`${offer.customerName} entrusted you with ${offer.goodName}, due on day ${offer.dueDay}. Payment follows delivery, not accepting a menu option.`);return true;
  }
  if(id.startsWith('career_make_')) {
    const style=id.slice('career_make_'.length),a=c.active;if(!a || a.status!=='accepted' || a.profession!==p.name || !['standard','fine','rush'].includes(style))return false;
    const m=method(s,style);if(missing(s,m.materials) || benchReason(s,a))return false;
    for(const [key,n] of Object.entries(m.materials))s.equipment.materials[key]-=n;
    a.quality=commissionQuality(s,a,style);a.status='ready';a.method=style;
    recordCareerWork(s,{days:m.days,source:'commission-make',paid:false},ctx);if(style==='rush' && s.life)s.life.stress=clamp(s.life.stress+5);
    record(s,ctx,'Work that can be inspected',`${a.goodName} for ${a.customerName} is made at quality ${a.quality}/${a.targetQuality}; ${materialText(m.materials)} were actually consumed. The customer still needs to receive it.`);return true;
  }
  if(id==='career_invoice') {
    const a=c.active;if(!a || a.status!=='ready')return false;
    const flawed=a.quality<a.targetQuality;
    setPending(s,ctx,{eventId:'career_invoice',commissionId:a.id},'A customer can judge the work',`${a.customerName} inspects ${a.goodName}. Quality is ${a.quality}/${a.targetQuality}; ${flawed?'the promised standard was not met. An honest discount preserves the customer’s choice.':'the work meets the promised standard.'} ${a.termsVersion===2?`Exceptional threshold ${commissionThresholds(a).exceptional}${a.quality>=commissionThresholds(a).exceptional?' was met: honest or community delivery earns the 20% premium.':' was not met; extra quality earns no premium until that threshold.'}`:''} ${a.late?'The missed deadline already limits payment to 75%.':'The deadline promise is still intact.'}`,[choice('honest','Explain the actual quality and charge accordingly',`Receive ${invoicePay(a,'honest')} gold. ${flawed?'An honest discount preserves trust; no defective item is passed off as tested.':'Earn 6 reputation for good, honestly described work.'}`),choice('community','Offer an affordable community price',`Receive ${invoicePay(a,'community')} gold; gain ${8+(a.specialty==='service'?2:0)} professional reputation and 4 village trust, with the quality stated honestly.`),choice('conceal','Demand full price and hide any shortfall',`Receive ${invoicePay(a,'conceal')} gold. ${flawed?'The named buyer learns of the defect and your reputation loses 12; safety loses 10. No unrelated authority receives a magical report.':'Good work earns payment, but no extra trust from this approach.'}`)]);return true;
  }
  if(id==='career_abandon') {
    if(!c.active)return false;const a=c.active;ctx.finishObligation?.(a.id);ledger(s,a.profession).failures++;ledger(s,a.profession).reputation=clamp(ledger(s,a.profession).reputation-5);c.active=null;record(s,ctx,'A commission released honestly',`You told ${a.customerName} that ${a.goodName} would not be delivered. Spent supplies remain spent; the promise and its local professional consequence are recorded.`);return true;
  }
  if(id==='career_open_shop') {
    if(c.shop || p.name==='Unemployed' || r.experience<30)return false;
    c.shop={name:`${s.hero.name}’s ${p.name==='Blacksmith'?'Hearthforge':p.name==='Innkeeper'?'Open Hearth':p.name+' House'}`,profession:p.name,locationId:s.locationId,tier:1,openedDay:s.day,lastMentorDay:null,staff:[],turnover:0,weeks:0};
    record(s,ctx,'A door bearing your name',`You opened ${c.shop.name} in ${place(s).name}. Supplies, wages, quality, and the time you make for other people now belong to this civilian story.`);return true;
  }
  if(id==='career_shop_operate') {
    const shop=c.shop;if(!shop || shop.locationId!==s.locationId || shop.profession!==p.name)return false;
    const revenue=shopRevenue(s);s.hero.gold+=revenue;shop.turnover=Math.min(100000000,shop.turnover+revenue);shop.weeks++;recordCareerWork(s,{days:7,source:'shop',gold:revenue},ctx);if(s.life)s.life.career.experience=Math.min(1000000,s.life.career.experience+4);
    for(const worker of shop.staff.filter(a=>a.status==='working'))worker.skill=clamp(worker.skill+1);
    syncSocietyStaff(s,ctx);
    record(s,ctx,'A working week behind the counter',`${shop.name} served actual customers for seven days and received ${revenue} gold. The supplies and agreed wages were paid once before this week began.`);return true;
  }
  if(id==='career_shop_upgrade') {
    const shop=c.shop;if(!shop || shop.tier>=3 || shop.locationId!==s.locationId || missing(s,shopUpgradeMaterials(shop.tier)))return false;
    for(const [key,n] of Object.entries(shopUpgradeMaterials(shop.tier)))s.equipment.materials[key]-=n;shop.tier++;
    record(s,ctx,'A workplace improved',`Actual timber, stone, and metal improved ${shop.name} to tier ${shop.tier}. Its fittings strengthen commissions and trade; no unrelated building or weapon appeared.`);return true;
  }
  if(id==='career_hire') {
    const shop=c.shop;if(!shop || shop.locationId!==s.locationId || shop.staff.filter(a=>a.status==='working').length>=2 || shop.staff.length>=8)return false;
    const name=generateCharacter(s.seed,`society-colleague-career-worker-${shop.staff.length+1}`,{role:shop.profession}).name;
    setPending(s,ctx,{eventId:'career_staff',name},'A person beside the workbench',`${name} asks for a freely chosen place at ${shop.name}. A worker wants safe hours and a clear wage; an apprentice wants teaching, credit, and the right to leave. Both arrangements cost 24 gold to fit a safe place, and are paid only if you accept.`,[choice('worker','Offer safe hours and 6 gold per operating week','Hire an adult worker at skill 12. Pay 24 gold setup now; weekly wages are included in actual shop operating costs.'),choice('apprentice','Offer teaching and 4 gold per operating week','Welcome an apprentice aged 16–19 at skill 3. Pay 24 gold setup; teaching can earn them a named journeyworker place.'),choice('decline','Explain that you cannot promise a place yet','No appointment, setup cost, or invented worker; their own future remains open.')]);return true;
  }
  if(id==='career_mentor') {
    const shop=c.shop;if(!shop || shop.locationId!==s.locationId || !shop.staff.some(a=>a.status==='working') || shop.lastMentorDay!==null && s.day-shop.lastMentorDay<14)return false;shop.lastMentorDay=s.day;
    for(const a of shop.staff.filter(a=>a.status==='working')) {a.skill=clamp(a.skill+4);if(a.role==='apprentice' && a.skill>=30){a.role='journeyworker';a.wage+=2;}}
    syncSocietyStaff(s,ctx);
    skill(s,'scholarship');recordCareerWork(s,{days:3,source:'teaching',paid:false},ctx);record(s,ctx,'Knowledge with another name',`You made time to teach the actual people at ${shop.name}. Qualified apprentices earned a journeyworker’s title and higher agreed wages.`);return true;
  }
  if(id==='career_masterwork') {
    const materials=masterworkMaterials(s);
    if(s.age<30 || r.mastery<4 || r.commissions<5 || c.masterworks.some(w=>w.profession===p.name && w.ownerId===c.ownerId) || missing(s,materials))return false;
    for(const [key,n] of Object.entries(materials))s.equipment.materials[key]-=n;return beginBatch(s,'masterwork',14,ctx);
  }
  if(id==='career_public_work') {
    const materials=serviceMaterials(s);
    if(s.age<18||p.name==='Unemployed'||r.mastery<1||r.lastPublicWorkDay!==undefined&&s.day-r.lastPublicWorkDay<90||missing(s,materials)||(c.publicWorks?.length || 0)>=200)return false;
    for(const [key,n] of Object.entries(materials))s.equipment.materials[key]-=n;
    r.lastPublicWorkDay=s.day;recordCareerWork(s,{days:7,source:'public-work',paid:false},ctx);
    r.reputation=clamp(r.reputation+4);skill(s,p.skill,2);ctx.standing?.('villagers',6);
    const staff=c.shop?.profession===p.name&&c.shop.locationId===s.locationId?c.shop.staff.filter(a=>a.status==='working'):[];
    for(const a of staff)a.skill=clamp(a.skill+2);
    const work={id:`public-work-${c.sequence+1}`,ownerId:c.ownerId,profession:p.name,locationId:s.locationId,name:PUBLIC_WORK_NAMES[p.name],day:s.day,authorName:s.hero.name,colleagueNames:staff.map(a=>a.name),gold:180,materials:{...materials},days:7};
    (c.publicWorks ||= []).push(work);
    record(s,ctx,'Useful work beyond your own door',`${s.hero.name}${staff.length?` with ${staff.map(a=>a.name).join(' and ')}`:''} funded and completed ${work.name} for ${place(s).name}. Seven real days, 180 gold, and ${materialText(materials)} were spent; the names and local service remain in the community record. The work does not erase the region’s losses or take another person’s consent for granted.`);
    return true;
  }
  return false;
}

export function careerEventIds() {return {career_invoice:['honest','community','conceal'],career_staff:['worker','apprentice','decline'],career_year:['care','community','profit'],career_legacy:['community','household','teach']};}

export function applyCareerChoice(s,eventId,id,ctx={}) {
  const pending=s.careers?.pending;if(!pending || pending.eventId!==eventId || !careerEventIds()[eventId]?.includes(id))return false;
  if(eventId==='career_invoice') {
    const a=s.careers.active;if(!a || a.id!==pending.commissionId || a.status!=='ready')return false;
    const r=ledger(s,a.profession),paid=invoicePay(a,id),flawed=a.quality<a.targetQuality;
    s.hero.gold+=paid;r.earnedGold=Math.min(100000000,r.earnedGold+paid);r.commissions++;addCareerExperience(s,12,a.profession);
    r.reputation=clamp(r.reputation+(id==='community'?8+(a.specialty==='service'?2:0):id==='conceal'&&flawed?-12:id==='honest'&&!flawed?6:1));
    if(id==='conceal'&&flawed)r.safety=clamp(r.safety-10);if(id==='community')ctx.standing?.('villagers',4);
    recordSocietyCommission(s,a,id,ctx);
    ctx.finishObligation?.(a.id);s.careers.active=null;record(s,ctx,'The goods reached their customer',`${a.customerName} received ${a.goodName} at actual quality ${a.quality}, paying ${paid} gold. ${flawed&&id==='conceal'?'This buyer learned you hid the shortfall; your professional safety and reputation changed.':'The agreement and your treatment of the customer became part of your local reputation.'}`);
  } else if(eventId==='career_staff') {
    const shop=s.careers.shop;if(!shop || shop.staff.filter(a=>a.status==='working').length>=2)return false;
    if(id!=='decline') {
      if(s.hero.gold<24)return false;s.hero.gold-=24;const age=id==='apprentice'?16+seededRoll(s.seed,`career-apprentice:${pending.name}`,4):24+seededRoll(s.seed,`career-worker:${pending.name}`,18);
      shop.staff.push({id:`career-worker-${shop.staff.length+1}`,name:pending.name,role:id==='apprentice'?'apprentice':'worker',skill:id==='apprentice'?3:12,wage:id==='apprentice'?4:6,bornDay:s.day-age*365,age,status:'working'});
      syncSocietyStaff(s,ctx);
      record(s,ctx,'A freely accepted place',`${pending.name} chose to join ${shop.name} with a stated wage, safe hours, and room to become their own craftsperson.`);
    } else record(s,ctx,'A promise left open',`You told ${pending.name} honestly that you could not promise a workplace yet.`);
  } else if(eventId==='career_year') {
    const r=ledger(s,pending.profession);if(!r)return false;
    const t=careerReviewTerms(pending.development);
    if(id==='care'){r.safety=clamp(r.safety+t.safety);r.reputation=clamp(r.reputation+t.reputation);if(s.life){s.life.stress=clamp(s.life.stress-t.stress);s.life.health=clamp(s.life.health+t.health);}}
    if(id==='community'){r.reputation=clamp(r.reputation+t.communityReputation);ctx.standing?.('villagers',t.standing);if(s.life)s.life.happiness=clamp(s.life.happiness+4);if(pending.development)addCareerExperience(s,t.experience,pending.profession);}
    if(modern(s) && id==='care' && s.careers.shop?.profession===pending.profession)for(const a of s.careers.shop.staff.filter(a=>a.status==='working'))a.skill=clamp(a.skill+1);
    if(modern(s) && id==='community')skill(s,getProfession(pending.profession)?.skill,t.skill);
    if(id==='profit'){s.hero.gold+=t.pay;r.earnedGold=Math.min(100000000,r.earnedGold+t.pay);r.reputation=clamp(r.reputation-t.profitReputation);r.safety=clamp(r.safety-t.profitSafety);if(s.life)s.life.stress=clamp(s.life.stress+t.profitStress);}
    if(pending.development){r.reviewedFailures=pending.development.failures;r.lastReview={day:s.day,choice:id,stage:pending.development.stage};}
    record(s,ctx,'A professional year remembered',`${pending.customerName} remembers your choice to ${id==='care'?'protect safe hours and careful work':id==='community'?'make room for the households who rely on your work':'take the premium contract at the cost of time and trust'}. ${pending.development?`At practice stage ${pending.development.stage+1}, mastery ${pending.development.mastery} and guild rank ${pending.development.rank}, the disclosed review terms were applied once.`:''} This ${pending.profession.toLowerCase()} year belongs to your lived history.`);
  } else if(eventId==='career_legacy') {
    if(s.careers.masterworks.some(w=>w.profession===pending.profession && w.ownerId===s.careers.ownerId))return false;
    const apprentice=s.careers.shop?.staff.find(a=>['apprentice','journeyworker'].includes(a.role));
    s.careers.masterworks.push({id:`masterwork-${getProfession(pending.profession).id}-${s.careers.sequence+1}`,ownerId:s.careers.ownerId,name:pending.name,profession:pending.profession,quality:pending.quality,day:s.day,locationId:s.locationId,authorName:s.hero.name,recipient:id,apprenticeName:id==='teach'?apprentice?.name || null:null});
    if(id==='community'){ledger(s,pending.profession).reputation=clamp(ledger(s,pending.profession).reputation+10);ctx.standing?.('villagers',8);}
    if(id==='household'&&s.life)s.life.happiness=clamp(s.life.happiness+8);if(id==='teach')skill(s,'scholarship',2);
    record(s,ctx,'A useful life leaves a witness',`${pending.name} bears ${s.hero.name}’s name${id==='teach'&&apprentice?` beside ${apprentice.name}’s`:''}. It was earned through actual ${pending.profession.toLowerCase()} work, real materials, and five fulfilled commissions. Its recipient is ${id==='community'?'the community':id==='household'?'your actual household':'the learners who can carry its methods forward'}.`);
  }
  s.careers.pending=null;return true;
}

export function onCareerTime(s,days,ctx={}) {
  if(!s.careers || !Number.isInteger(days) || days<=0)return;
  if(s.careers.preserveLegacyPlan && !s.life?.plan)s.careers.preserveLegacyPlan=false;
  const a=s.careers.active;
  if(a && !a.late && s.day>a.dueDay) {
    a.late=true;const r=ledger(s,a.profession);r.failures++;r.reputation=clamp(r.reputation-5);ctx.finishObligation?.(a.id);
    record(s,ctx,'A customer’s deadline passed',`${a.customerName} did not receive ${a.goodName} by day ${a.dueDay}. Their payment is now 75%; five professional reputation were lost once. Work and materials remain real; no unrelated faction learned a secret.`);
  }
  for(const worker of s.careers.shop?.staff || []) {
    worker.age=Math.max(0,Math.floor((s.day-worker.bornDay)/365));
    if(worker.status==='working' && worker.age>=70){worker.status='retired';record(s,ctx,'A colleague’s own later years',`${worker.name} retired from the workshop at ${worker.age}. Their teaching and name remain in your history; future working-week wage costs stop.`);}
  }
}
const PROFESSIONAL_SCENES={
  Blacksmith:[
    'A ploughshare returns with a crack beside your maker’s mark. A bright polish would hide it, but the farmer needs a tool that will survive the stony field.',
    'The watch requests ornate sword fittings while households wait for hinges and winter nails. Both pay; only one queue can take your next safe working hours.',
    'An apprentice wants to sign a repair they completed. An older patron asks for your mark alone, arguing that a familiar name sells better.',
    'Smoke has blackened the forge accounts. A neighbor offers help with the ledger so aching hands do not have to carry every part of the smithy.',
  ],
  Farmer:[
    'Rain has exposed an old irrigation channel beside the communal beds. Repairing its stone lining would serve the small growers; a wealthy household offers more for a private trench.',
    'Two households want the last dry storage space before the next harvest. One can pay a premium; the other offers labor and asks for seed to be kept apart from grain for sale.',
    'A younger grower asks why your ledger records who saved each seed. A buyer would rather sell the varieties under a single impressive estate name.',
    'Old ash lies in a field boundary. The soil needs a patient test before planting, although a patron promises quick money for a confident answer today.',
  ],
  Innkeeper:[
    'A traveler asks for a quiet room after nights of road fear. A rich guest wants the same room and proposes a premium if you turn the traveler away.',
    'The washhouse worker shows you worn bedding and asks for time to mend it. Filling every bed would pay more this week, but clean sleep is the promise above your door.',
    'Guests repeat a frightening rumor about an absent villager. The room listens when you ask whose account anyone has actually heard.',
    'A young worker wants to learn the accounts rather than carry dishes forever. Teaching takes time from a profitable private supper.',
  ],
  Merchant:[
    'A sealed crate arrives with a torn packing list. Buyers ask whether the remedy inside was checked; the carrier only guarantees that the wax stamp is genuine.',
    'A supplier offers a profitable exclusive agreement. Neighboring stalls would lose access to the same ordinary supplies if you accept.',
    'A customer brings an old ledger entry with your name beside an unfair weight. You can explain the actual account before deciding what repair is owed.',
    'A younger clerk notices that the people who carried a shipment disappear from the trade record. A wealthy patron asks you to keep only the buyer’s crest.',
  ],
  Bard:[
    'A household asks for a song about someone they buried. A patron offers more for a version that turns the loss into a heroic legend the family does not recognize.',
    'A younger singer remembers a verse differently. The audience would rather hear one certain story, but the two witnesses never stood in the same place.',
    'A host requests a performance that mocks a frightened traveler. The promised fee would cover your own needs; the traveler has not agreed to become the joke.',
    'An old instrument repair bears another maker’s name. A buyer asks you to scrape it away before the festival so your own reputation can carry the sale.',
  ],
  Cartographer:[
    'A family asks whether a marked path can be walked with a child and a cart. A short line on a map does not prove that its bridges and slopes are accessible.',
    'Two survey accounts disagree about a crossing. A patron pays for certainty today; reliable work records which bank each witness actually reached.',
    'A gate keeper wants the public map to omit a free approach. That omission would make the toll road seem like the only route.',
    'A younger surveyor asks to be credited for the notes they gathered. The buyer wants a single famous signature on the finished atlas.',
  ],
  Alchemist:[
    'A reagent changes color after storage. The seal is intact, but a confident label cannot replace another test before a household uses it.',
    'A patron asks you to call an ordinary cleaning mixture a sacred cure. The premium pays well; the people reading the bottle cannot inspect your private doubts.',
    'A student wants your failed trials kept beside the successful formula. A buyer argues that a record of limits will make useful work look uncertain.',
    'A well sample carries mineral residue. Neighbors ask for a patient explanation while a seller offers quick money for blaming a convenient outsider.',
  ],
  Healer:[
    'A patient wants their own words included in the recovery plan. A household elder offers a larger fee if the treatment follows their wishes alone.',
    'A neighbor asks for help sleeping after a bereavement. There is room to listen without promising that grief can be removed like a splinter.',
    'A patron requests an impressive remedy before you have checked its limits. Clean dressings and honest follow-up sound less grand but can still be useful.',
    'A younger caregiver asks for credit in the clinic notes. The work was shared; a wealthy sponsor would prefer the account to name only the person they paid.',
  ],
  Scholar:[
    'An archive case contains two contradictory accounts of a shrine. A patron pays for one confident history; students need to know which witness wrote each page.',
    'A child cannot afford copied lessons. An influential household offers a premium for private tuition during the same teaching hours.',
    'A younger reader discovers a correction in an old folio. The owner asks you to erase the reader’s name before returning it to the shelf.',
    'Damp has reached the reading boards. Repairs and slower lessons will protect the actual books, although a sponsor wants the room kept full every day.',
  ],
  Herbalist:[
    'A familiar remedy bundle contains a different leaf. An honest label and a patient check matter more than the confidence of the seller’s story.',
    'A buyer wants every useful plant taken from a grove. The households who return there next season ask you to leave living roots behind.',
    'A younger gatherer knows a safer drying method. A wealthy customer asks you to present it as your own discovery.',
    'The drying rack needs a quiet repair before damp reaches its cloth. A premium order would consume the same careful working hours.',
  ],
  Miner:[
    'A support timber shifts before the next gallery opens. The ore buyer pays for speed; the people entering the dark need a checked roof.',
    'Two crews dispute which names belong beside a sorted delivery. The metal is useful because several people brought it out safely.',
    'A younger worker asks to learn the survey marks before entering another shaft. Teaching delays a profitable delivery but gives them a way to judge danger.',
    'A buyer requests a clean account with no mention of a narrow escape. The crew wants the warning preserved for whoever takes the next shift.',
  ],
  Soldier:[
    'A recruit asks why the drill protects the person at the back of the line. A patron wants a bright display instead of practice that keeps ordinary people safe.',
    'The bridge watch needs checked lantern fittings. A private guard contract offers more gold during the same hours.',
    'A frightened household asks whether a rumor makes them suspects. You can listen to a real account before turning fear into an accusation.',
    'A younger watch member wants their name on the civilian protection notes. An officer would prefer the work to look like one person’s command.',
  ],
};
function professionalContext(s,q) {
  const calendar=worldCalendarContext(s.world,s.day,s.seed);
  const shop=s.careers.shop?.profession===q.profession?s.careers.shop:null;
  const colleagues=shop?.staff.filter(a=>a.status==='working') || [];
  const workplace=shop?`The conversation takes place at ${shop.name}. `:'';
  const people=colleagues.length?`${colleagues.map(p=>p.name).join(' and ')} can help carry careful work and remember how you teach. `:'';
  const facts=q.profession==='Cartographer'&&s.travel?.history?.length?`Your own road journal contains ${s.travel.history.length} recorded journeys and meetings; the map need not pretend you witnessed every road. `:q.profession==='Healer'&&(s.health?.physical?.length || s.health?.mental?.length)?'Your own care history reminds you that a useful plan does not erase someone’s whole life. ':'';
  return `${workplace}It is ${calendar.season}; ${calendar.weather} reaches ${place(s)?.name || 'the community'}. ${people}${facts}`;
}
export function flushCareerEvent(s,ctx={}) {
  if(!s.careers?.queued || s.careers.pending || s.event || s.battle || s.conversations?.pending || s.phase==='retired')return false;
  const q=s.careers.queued;s.careers.queued=null;
  const profession=q.profession.toLowerCase();
  const themes=q.profession==='Blacksmith'?['A farmer brings a cracked tool whose old repair bears your mark. They need something safe, not a bright edge that will fail after one day.','The cooperative asks whether your smithy will repair ordinary tools before accepting a wealthy patron’s ornamental order.','Your hands ache after the busiest season. A neighbor offers to help with the accounts so you can protect a safe work rhythm.','A younger maker asks why the customer’s name matters beside the maker’s mark. A commissioned object has more than one life.']:[`A household brings an ordinary problem to your ${profession} workplace. They want reliable work and an honest account of its limits.`,`A patron offers a premium commission while neighbors wait for affordable ${profession} work.`, `A colleague notices that the season has left you tired. Safe hours and a wage are both real parts of the work.`,`A new learner asks whose name belongs in the record of your ${profession} work.`];
  const theme=modern(s)?PROFESSIONAL_SCENES[q.profession]?.[q.scene] || themes[q.scene]:themes[q.scene];
  const context=modern(s)?professionalContext(s,q):'';
  const development=careerDevelopmentText(q),t=careerReviewTerms(q.development);
  const reviewTheme=q.development?.stage?development:development+theme;
  setPending(s,ctx,q,`A ${profession} year, with people in it`,`${q.customerName} speaks with you in ${place(s)?.name || 'the community'}. ${context}${reviewTheme} The decision changes this professional life, without assigning an adventuring class.`,[choice('care','Protect safe hours and dependable work',`Gain ${t.safety} safety and ${t.reputation} professional reputation; reduce ${t.stress} stress and recover ${t.health} health.${modern(s)&&s.careers.shop?.staff.some(a=>a.status==='working')?' Active colleagues gain 1 skill through safer shared practice.':''}`),choice('community','Make room for the people who rely on your work',`Gain ${t.communityReputation} professional reputation, ${t.standing} village standing, and 4 happiness; decline the premium payment.${t.experience?` Gain ${t.experience} professional experience.`:''}${modern(s)&&getProfession(q.profession)?.skill?` Practice ${t.skill} ${getProfession(q.profession).skill} through the shared work.`:''}`),choice('profit','Take the premium contract and keep the difficult schedule',`Earn ${t.pay} gold; lose ${t.profitReputation} professional reputation and ${t.profitSafety} safety, adding ${t.profitStress} stress. The tradeoff is recorded.`)]);return true;
}

export function resetCareerForSuccessor(s,ctx={},recordedChild=null) {
  if(!s.careers)return;
  s.careers.ownerId=ownerId(s);s.careers.records=Object.fromEntries(PROFESSION_CATALOG.map(p=>[p.name,emptyRecord()]));s.careers.active=null;s.careers.batch=null;s.careers.pending=null;s.careers.queued=null;s.careers.preserveLegacyPlan=false;
  s.careers.contentVersion=2;
  const own=getProfession(recordedChild?.profession),training=recordedChild?.careerRecord;
  if(own&&s.age>=16&&training&&Number.isSafeInteger(training.unpaidWorkedDays)&&training.unpaidWorkedDays>=0&&training.unpaidWorkedDays<=14&&training.workedDays===training.unpaidWorkedDays&&training.experience===unpaidCareerExperience(training.unpaidWorkedDays)&&training.paidWorkedDays===0&&training.earnedGold===0&&training.mastery===0&&training.commissions===0&&training.failures===0) {
    s.hero.profession=own.name;
    s.careers.records[own.name]={...emptyRecord(),workedDays:training.workedDays,unpaidWorkedDays:training.unpaidWorkedDays,experience:training.experience};
  }
  // Inherited shop property, named colleagues, old histories, and signed works
  // survive. A child does not inherit professional experience or unpaid wages.
  if(s.careers.shop)record(s,ctx,'Property and knowledge are different inheritances',`${s.careers.shop.name} remains a physical business. ${s.hero.name} must learn their own profession; the former maker’s signed works remain in the family’s record.`);
  const works=s.careers.masterworks.filter(w=>w.recipient==='household');
  if(works.length){const text=works.map(w=>`${w.name}, made by ${w.authorName} on day ${w.day}`).join('; ');(ctx.journalLiteral||ctx.journal)?.('Works entrusted to the household',`${s.hero.name} continues the household custody of ${text}. The original authorship and quality remain recorded; no professional mastery or completion reward is inherited.`,'legacy');}
}

export function careerView(s) {
  const p=current(s),r=ledger(s) || emptyRecord(),available=careerActions(s);
  const descriptor=id=>available.find(a=>a.id===id);
  return {profession:{id:p.id,name:p.name,description:p.description,skill:p.skill},summary:`${TITLES[r.mastery]} ${p.name.toLowerCase()} · ${r.workedDays} actual work days · ${r.commissions} delivered commissions. Civilian work, home, and relationships can remain the center of this life.`,progress:{...r,masteryLabel:TITLES[r.mastery],nextMastery:levels(s)[r.mastery+1] || null},wages:{shift:professionWage(s),annual:professionAnnualWage(s)},professions:PROFESSION_CATALOG.map(job=>({...job,actionId:`career_choose_${job.id}`,disabledReason:job.name===p.name?'Your current profession.':descriptor(`career_choose_${job.id}`)?.disabledReason})),commissions:!s.careers?.active && ready(s) && settlement(s)?board(s).map(o=>({...o,quote:commissionQuote(s,o),actionId:`career_accept_${o.id}`,description:`${o.goodName} for ${o.customerName}: ${materialText(o.materials)}, quality ${o.targetQuality}, ${o.pay} gold, due day ${o.dueDay}.`})):[],activeCommission:s.careers?.active?{...s.careers.active,materials:{...s.careers.active.materials},thresholds:commissionThresholds(s.careers.active),quotes:['standard','fine','rush'].map(id=>({id,...commissionQuote(s,s.careers.active,id)})),methods:['standard','fine','rush'].map(id=>descriptor(`career_make_${id}`)).filter(Boolean)}:null,shop:s.careers?.shop?{...s.careers.shop,staff:s.careers.shop.staff.map(a=>({...a})),locationName:place(s,s.careers.shop.locationId)?.name || s.careers.shop.locationId}:null,batch:s.careers?.batch?{...s.careers.batch}:null,masterworks:(s.careers?.masterworks || []).map(w=>({...w})),publicWorks:(s.careers?.publicWorks || []).map(w=>({...w,materials:{...w.materials},colleagueNames:[...w.colleagueNames]})),history:(s.careers?.history || []).map(h=>({...h})),actions:available};
}

export function validateCareers(v,s) {
  const int=(n,max=1000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  const text=(t,max=1000)=>typeof t==='string'&&t.length>0&&t.length<=max;
  const when=n=>int(n)&&(!s || n<=s.day);
  const validPlace=id=>text(id,80)&&(!s || s.world.locations.some(p=>p.id===id));
  const materials=m=>plain(m)&&Object.entries(m).every(([key,n])=>MATERIAL_IDS.includes(key)&&int(n,100)&&n>0);
  const name=p=>PROFESSION_CATALOG.some(job=>job.name===p);
  if(!plain(v) || !(v.contentVersion===undefined || v.contentVersion===2) || !text(v.ownerId,100) || !/^birth--?\d+$/.test(v.ownerId) || s && v.ownerId!==ownerId(s) || !plain(v.records) || Object.keys(v.records).length!==PROFESSION_CATALOG.length || !int(v.sequence,1000000) || typeof v.preserveLegacyPlan!=='boolean' || !Array.isArray(v.claimedIds) || v.claimedIds.length>240 || !v.claimedIds.every(id=>text(id,160)&&/^commission-[a-z0-9-]+$/.test(id)) || new Set(v.claimedIds).size!==v.claimedIds.length || !Array.isArray(v.history) || v.history.length>120 || !Array.isArray(v.masterworks) || v.masterworks.length>200)return false;
  for(const p of PROFESSION_CATALOG) {
    const r=v.records[p.name];if(!plain(r) || !['experience','workedDays','paidWorkedDays','unpaidWorkedDays','commissions','failures'].every(k=>int(r[k])) || r.workedDays!==r.paidWorkedDays+r.unpaidWorkedDays || !int(r.earnedGold,100000000) || !['mastery','reputation','safety'].every(k=>int(r[k],k==='mastery'?4:100)) || r.mastery!==levels({careers:v}).reduce((n,t,i)=>r.experience>=t?i:n,0) || !(r.lastPracticeDay===null || when(r.lastPracticeDay)) || !(r.lastStoryAge===null || int(r.lastStoryAge,200)))return false;
    if(r.specialty!==undefined&&!Object.hasOwn(CAREER_SPECIALTIES,r.specialty))return false;
    if(r.reviewedFailures!==undefined&&!int(r.reviewedFailures,r.failures))return false;
    if(r.lastReview!==undefined&&(!plain(r.lastReview)||!when(r.lastReview.day)||!['care','community','profit'].includes(r.lastReview.choice)||!int(r.lastReview.stage,2)))return false;
    if(r.lastPublicWorkDay!==undefined&&!when(r.lastPublicWorkDay))return false;
  }
  for(const h of v.history)if(!plain(h) || !text(h.id,100) || !when(h.day) || !int(h.age,200) || !name(h.profession) || !validPlace(h.locationId) || !text(h.title,180) || !text(h.text,2200) || !text(h.kind,40))return false;
  for(const w of v.masterworks)if(!plain(w) || !text(w.id,100) || !text(w.ownerId,100) || !/^birth--?\d+$/.test(w.ownerId) || !text(w.name,180) || !name(w.profession) || !int(w.quality,100) || !when(w.day) || !validPlace(w.locationId) || !text(w.authorName,100) || !['community','household','teach'].includes(w.recipient) || !(w.apprenticeName===null || text(w.apprenticeName,100)))return false;
  if(new Set(v.masterworks.map(w=>`${w.ownerId}:${w.profession}`)).size!==v.masterworks.length)return false;
  if(v.publicWorks!==undefined) {
    if(!Array.isArray(v.publicWorks)||v.publicWorks.length>200||new Set(v.publicWorks.map(w=>w?.id)).size!==v.publicWorks.length)return false;
    for(const w of v.publicWorks)if(!plain(w)||!text(w.id,100)||!text(w.ownerId,100)||!/^birth--?\d+$/.test(w.ownerId)||!name(w.profession)||w.profession==='Unemployed'||!validPlace(w.locationId)||w.name!==PUBLIC_WORK_NAMES[w.profession]||!when(w.day)||!text(w.authorName,100)||!Array.isArray(w.colleagueNames)||w.colleagueNames.length>2||!w.colleagueNames.every(n=>text(n,100))||w.gold!==180||w.days!==7||!materials(w.materials)||JSON.stringify(w.materials)!==JSON.stringify(serviceMaterials({hero:{profession:w.profession},careers:{contentVersion:2}})))return false;
    for(const profession of PROFESSION_CATALOG) {
      const r=v.records[profession.name],actual=v.publicWorks.filter(w=>w.ownerId===v.ownerId&&w.profession===profession.name).at(-1);
      if((r.lastPublicWorkDay!==undefined)!==!!actual || actual&&actual.day!==r.lastPublicWorkDay)return false;
    }
  }
  if(v.active!==null) {
    const a=v.active,p=getProfession(a?.profession),g=p?.goods.find(g=>g.id===a.goodId);
    if(!plain(a) || !g || !v.claimedIds.includes(a.id) || !text(a.id,160) || !text(a.customerName,100) || !validPlace(a.locationId) || a.goodName!==g.name || JSON.stringify(a.materials)!==JSON.stringify(g.materials) || !materials(a.materials) || a.days!==g.days || !int(a.period) || !int(a.index,2) || !int(a.offeredMastery,4) || a.pay!==g.pay+a.offeredMastery*6 || a.targetQuality!==28+a.offeredMastery*7+a.index*2 || !when(a.offeredDay) || a.offeredDay!==a.period*90 || a.expiresDay!==(a.period+1)*90 || !when(a.acceptedDay) || a.acceptedDay<a.offeredDay || a.acceptedDay>=a.expiresDay || !int(a.dueDay) || a.dueDay<=a.acceptedDay || a.id!==`commission-${p.id}-${a.locationId}-${a.period}-${a.index}` || !['accepted','ready'].includes(a.status) || typeof a.late!=='boolean' || a.tier!==(g.tier || 1) || a.gearId!==(g.gearId || null) || (a.status==='accepted'?(a.quality!==null || a.method!==null):(!int(a.quality,100)||!['standard','fine','rush'].includes(a.method))))return false;
    if(a.termsVersion!==undefined&&a.termsVersion!==2 || a.specialty!==undefined&&!(a.specialty===null||a.termsVersion===2&&Object.hasOwn(CAREER_SPECIALTIES,a.specialty)))return false;
    const promisedCustomer=a.societyCustomerId?[...(s?.society?.people || []),...(s?.society?.archive || [])].find(person=>person.id===a.societyCustomerId)?.name:s&&actorName(s,`${a.locationId}:${a.period}:${a.index}`);
    if(a.societyCustomerId!==undefined && (!text(a.societyCustomerId,80) || !/^society-customer-[a-z0-9-]+$/.test(a.societyCustomerId) || s&&!promisedCustomer))return false;
    if(s && (a.customerName!==promisedCustomer || a.goodId!==boardGood({...s,careers:v},p,a.locationId,a.period,a.index).id || a.dueDay!==a.acceptedDay+45+seededRoll(s.seed,`career-due:${p.id}:${a.period}:${a.index}`,21) || a.offeredMastery>v.records[p.name].mastery))return false;
  }
  if(v.shop!==null) {
    const shop=v.shop;if(!plain(shop) || !name(shop.profession) || shop.profession==='Unemployed' || !text(shop.name,180) || !validPlace(shop.locationId) || !int(shop.tier,3) || shop.tier<1 || !when(shop.openedDay) || !(shop.lastMentorDay===null || when(shop.lastMentorDay)) || !int(shop.turnover,100000000) || !int(shop.weeks) || !Array.isArray(shop.staff) || shop.staff.length>8 || shop.staff.filter(a=>a.status==='working').length>2 || new Set(shop.staff.map(a=>a.id)).size!==shop.staff.length)return false;
    for(const a of shop.staff)if(!plain(a)||!text(a.id,80)||!text(a.name,100)||!['worker','apprentice','journeyworker'].includes(a.role)||!int(a.skill,100)||!int(a.wage,30)||!Number.isSafeInteger(a.bornDay)||a.bornDay< -100000||!int(a.age,300)||!['working','retired'].includes(a.status)||s&&a.age!==Math.max(0,Math.floor((s.day-a.bornDay)/365)))return false;
  }
  if(v.batch!==null) {
    const b=v.batch;if(!plain(b)||!['work','masterwork'].includes(b.kind)||!text(b.title,180)||!name(b.profession)||!validPlace(b.locationId)||!int(b.totalDays,365)||b.totalDays<1||!int(b.remainingDays,b.totalDays)||b.remainingDays<1||!int(b.completedDays,b.totalDays)||b.remainingDays+b.completedDays!==b.totalDays||!when(b.startedDay)||!int(b.wage,1000)||!int(b.paidGold,100000)||b.kind==='work'&&b.paidGold!==Math.floor(b.completedDays*b.wage/3)||b.kind==='masterwork'&&(b.totalDays!==14||b.paidGold!==0))return false;
  }
  const pending=p=>plain(p)&&Object.hasOwn(careerEventIds(),p.eventId)&&((p.eventId==='career_invoice'&&text(p.commissionId,160)&&v.active?.id===p.commissionId&&v.active.status==='ready')||(p.eventId==='career_staff'&&v.shop&&text(p.name,100))||(p.eventId==='career_year'&&name(p.profession)&&int(p.age,200)&&int(p.scene,3)&&text(p.customerName,100)&&v.records[p.profession].workedDays>=30&&v.records[p.profession].lastStoryAge===p.age&&(p.development===undefined||validCareerDevelopment(p.development,{day:s?.day??1000000,record:v.records[p.profession],int,text})))||(p.eventId==='career_legacy'&&name(p.profession)&&p.quality===90&&p.name===masterworkName(p.profession)&&when(p.startedDay)&&p.completedDays===14&&v.records[p.profession].mastery===4&&v.records[p.profession].commissions>=5&&v.records[p.profession].unpaidWorkedDays>=14&&(!s||s.day>=p.startedDay+14)));
  if(v.pending!==null && !pending(v.pending) || v.queued!==null && !(pending(v.queued)&&v.queued.eventId==='career_year'))return false;
  if(s && (v.pending!==null)!==Object.hasOwn(careerEventIds(),s.event?.id))return false;
  if(s && v.pending && v.pending.eventId!==s.event.id)return false;
  return true;
}
