import { GEAR_CATALOG } from './gear.js';
import { carryStolenGear, migrateStolenGear, stolenGearCapacityReason } from './stolen-gear.js';
import { validateStolenGearRecord } from './gear-loot.js';
import { localLawWindow } from './local-law-window.js';
import { regionAt } from './realm.js';
import { seededRoll, generatePersonName } from './world.js';
import { generateCharacter } from './characters.js';
import { isCanonicalAppearance } from './avatar.js';
import { householdSilver, householdSilverReason, propertyAlreadyTaken, takenPropertiesWith, claimHouseholdSilver } from './silver-property.js';
import { countingTableActions, applyCountingTableAction, applyCountingTableChoice, countingTableEventIds, validateCountingTableState } from './counting-table-job.js';
const action=(id,label,description,days=0,cost=0,reason)=>({id,label,description,days,cost,group:'Law & prison',...(reason?{disabledReason:reason}:{})});
const log=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'crime');};
const incident=s=>s.legal.incidents.find(i=>i.locationId===s.locationId);
const closeReports=(s,id)=>{
  s.legal.incidents=s.legal.incidents.filter(i=>i.locationId!==id);
  for(const c of s.sanctuaries?.cases||[])if(c.locationId===id&&c.status!=='resolved'){c.status='resolved';c.resolution='legal_external';c.resolvedDay=s.day;}
  if(s.sanctuaries?.queue)s.sanctuaries.queue=s.sanctuaries.queue.filter(q=>!s.sanctuaries.cases.some(c=>c.id===q.refId&&c.locationId===id));
  if(s.sanctuaries?.pending&&s.sanctuaries.cases.some(c=>c.id===s.sanctuaries.pending.refId&&c.locationId===id))s.sanctuaries.pending=null;
};
export function initializeJustice(s){if(!s.justice)s.justice={version:1,prison:null,arrest:null,lastCheckDay:-1,history:[],thefts:0,takenProperties:[]};if(!s.justice.takenProperties)s.justice.takenProperties=[];migrateStolenGear(s);}
export function imprison(s,ctx){
  const i=incident(s),region=regionAt(s);if(!i||!region||i.evidence<1)return false;
  const totalDays=Math.min(120,Math.max(3,i.evidence*region.law.prisonDaysPerEvidence));
  const wkey=`warden:${s.locationId}`,ikey=`inmate:${s.locationId}:${s.justice.history.length}`,wage=34+seededRoll(s.seed,wkey,20),iage=22+seededRoll(s.seed,ikey,27);
  const warden={...generateCharacter(s.seed,wkey,{role:'Soldier',age:wage}),name:generatePersonName(s.seed,wkey),age:wage},inmate={...generateCharacter(s.seed,ikey,{role:'Wanderer',age:iage}),name:generatePersonName(s.seed,ikey),age:iage};
  s.justice.prison={locationId:s.locationId,regionId:region.id,startDay:s.day,totalDays,servedDays:0,evidence:i.evidence,reason:i.description,attempts:0,warden,inmate};s.justice.arrest=null;
  if(s.timeline){s.timeline.yearTarget=null;s.timeline.journey=null;}if(s.life)s.life.plan=null;
  log(s,ctx,'The cell door closes',`${warden.name} records a ${totalDays}-day sentence under ${region.law.name}. ${inmate.name} shares the damp corridor. Your possessions are held for release.`);
  return true;
}
export function flushJustice(s,ctx){
  if(s.cartography?.offsite||s.cartography?.pending)return;
  if(!s.justice||s.justice.prison||s.justice.arrest||s.age<18||s.event||s.battle||s.phase==='retired'||s.timeline?.journey)return;
  const i=incident(s),region=regionAt(s);if(!i||i.evidence<3||!region||s.justice.lastCheckDay===s.day)return;
  const window=localLawWindow(s);if(window.hold)return;
  s.justice.lastCheckDay=s.day;
  if(seededRoll(s.seed,`arrest:${s.locationId}:${s.day}:${i.evidence}`,100)>=region.law.enforcement)return;
  s.justice.arrest={locationId:s.locationId,evidence:i.evidence};
  const fine=i.evidence*region.law.theftFinePerEvidence;
  ctx.setEvent('justice_arrest','The watch knows your name','Regional law',`${region.name}: ${window.independent?`The earlier local case keeps its return date of day ${window.returnDay}. This patrol instead cites a new report: ${window.source}`:i.description} The watch demands restitution or custody under ${region.law.name}.`,[
    {id:'surrender',label:'Surrender and serve the sentence',description:`${Math.min(120,i.evidence*region.law.prisonDaysPerEvidence)} days of actual custody; prison work, release and escape remain playable.`},
    ...(s.hero.gold>=fine?[{id:'pay',label:`Pay ${fine} gold in restitution`,description:'Clear this locality’s report and pay the regional tariff.'}]:[]),
    {id:'flee',label:'Try to evade the patrol',description:'A stealth attempt. Success leaves the warrant outstanding; failure leads to custody.'},
    ...(s.hero.gold>=20?[{id:'bribe',label:'Offer the captain 20 gold',description:'Corruption can buy passage, but a refusal becomes fresh evidence.'}]:[])
  ]);
}
function theftProperty(s,burglary=false){const m=s.realm?.sites[s.locationId]?.merchant;if(!m)return null;if(burglary){const p=householdSilver(s);return p?{...p,owner:m}:null;}const item=GEAR_CATALOG.find(g=>(m.stock[g.id]||0)>0);return item?{id:`stock-${m.id}-${m.season}-${item.id}`,name:`${m.name}’s ${item.name.toLowerCase()}`,owner:m,itemId:item.id,value:Math.max(5,m.prices[item.id]||item.price)}:null;}
export function justiceActions(s){
  if(!s.justice||s.event||s.battle||s.phase==='retired')return [];
  const p=s.justice.prison;
  if(p)return [action('justice_serve','Serve one day',`${p.servedDays}/${p.totalDays} days served. Food and a cot restore a little health; the calendar continues.`,1),action('justice_work','Work in the prison yard','Spend two days repairing stone. Actual attendance counts toward your remaining sentence and practices survival.',2),action('justice_escape','Attempt an escape','Spend one day seeking a way past the watch. Failure extends the sentence; success leaves your warrant outstanding.',1),action('justice_bribe','Bribe the gaoler',`${p.warden.name} may take 30 gold. A refusal costs the offer and extends custody.`,0,30,s.hero.gold<30?'Requires 30 gold.':null),action('justice_inmate',`Speak with ${p.inmate.name}`,'Spend one day hearing a fellow prisoner’s account. Practices persuasion; their story differs with each sentence.',1)];
  const i=incident(s),region=regionAt(s),m=s.realm?.sites[s.locationId]?.merchant,result=[];
  if(i&&region){const fine=i.evidence*region.law.theftFinePerEvidence;result.push(action('justice_restitution',`Pay regional restitution: ${fine} gold`,'Clear the local reports. Reports in other settlements remain separate.',0,fine,s.hero.gold<fine?'You cannot afford the restitution.':null),action('justice_surrender','Submit to a regional sentence','Serve custody instead of paying. Your sentence uses this region’s law.'));}
  if(s.age>=18&&m&&region&&s.realm.sites[s.locationId].phase!=='ruin'){const full=s.adventuring.loot.length>=160?'Sell relics to make room in your pack.':null;result.push(action('justice_steal',`Steal from ${m.name}’s stall`,'Take '+(theftProperty(s)?.name||'nothing: the stall is empty')+'. The property belongs to this merchant and its stock stays depleted.',1,0,stolenGearCapacityReason(s)||(!theftProperty(s)?'No unguarded stock remains.':null)),action('justice_burglary',`Burgle ${m.name}’s household`,'An attempt on this merchant’s guarded household silver.'+(s.justice.countingTableJob?.status==='active'&&s.justice.countingTableJob.target.id===theftProperty(s,true).id?' It is temporarily held at the counting table in the Market.':'')+' The owner and the property remain named in the report.',2,0,full||(propertyAlreadyTaken(s,theftProperty(s,true).id)?'That household’s silver is already missing.':null)));}
  for(const account of s.justice.accounts||[])if(!account.resolution&&account.locationId===s.locationId)result.push(action('justice_followup_'+account.id,`Find news of ${account.person.name}`,`${account.concern}. Two days and 6 gold fund an actual introduction; no prison sentence is erased.`,2,6,s.hero.gold<6?'Requires 6 gold.':null));
  return [...result,...countingTableActions(s)];
}
function release(s,ctx,escaped=false){
  const p=s.justice.prison;if(!escaped)closeReports(s,p.locationId);
  s.justice.history.push({locationId:p.locationId,startDay:p.startDay,endDay:s.day,servedDays:p.servedDays,totalDays:p.totalDays,outcome:escaped?'escaped':'served'});if(s.justice.history.length>80)s.justice.history.shift();
  s.justice.accounts||=[];if(!s.justice.accounts.some(a=>a.id===p.inmate.id)){s.justice.accounts.push({id:p.inmate.id||('inmate-'+p.startDay),person:structuredClone(p.inmate),locationId:p.locationId,startDay:p.startDay,releaseDay:s.day,concern:'Find an honest sponsor for the household waiting outside',resolution:null});s.justice.accounts=s.justice.accounts.slice(-24);}
  s.justice.prison=null;log(s,ctx,escaped?'Beyond the prison wall':'The door opens',escaped?'You leave custody with your possessions, but the local warrant remains.':`The sentence is served. ${p.warden.name} returns your possessions and closes this locality’s case.`);
}
export function onJusticeTime(s,days,ctx){const p=s.justice?.prison;if(!p)return;p.servedDays=Math.min(p.totalDays,p.servedDays+days);if(p.servedDays>=p.totalDays)release(s,ctx);}
export function applyJusticeAction(s,id,ctx){
  if(id.startsWith('justice_job_'))return applyCountingTableAction(s,id,ctx);
  const a=justiceActions(s).find(a=>a.id===id);if(!a||a.disabledReason)return false;
  const p=s.justice.prison;
  if(p){
    const actual=ctx.spendDays(Math.min(a.days,p.totalDays-p.servedDays));
    if(s.phase==='retired')return true;
    if(!s.justice.prison)return true;
    if(a.days&&actual===0){s.notice='A waiting calendar need interrupts custody. Resolve it, then continue serving.';return true;}
    if(id==='justice_serve'||id==='justice_work'){s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+3*actual);s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+2*actual);if(id==='justice_work'&&actual===a.days)s.hero.skills.survival++;s.notice=`${p.servedDays}/${p.totalDays} days of custody served.`;}
    else if(id==='justice_inmate'){if(actual===a.days){s.hero.skills.persuasion++;const tale=['a shrine that swallowed its own bell','a lord selling winter grain to an enemy','a grave opened by its dead occupant','a caravan carrying a dragon’s unborn heart'][seededRoll(s.seed,p.inmate.name,4)];log(s,ctx,'A voice through the bars',`${p.inmate.name} speaks of ${tale}. “The watch called it a crime. I called it surviving.”`);}}
    else if(id==='justice_escape'&&actual===a.days){p.attempts++;const score=s.hero.skills.stealth+Math.floor(s.hero.attributes.agility/2);if(score>=6+seededRoll(s.seed,`escape:${p.startDay}:${p.attempts}`,15)){release(s,ctx,true);}else{p.totalDays=Math.min(240,p.totalDays+3);log(s,ctx,'A bolt drawn tighter','The attempt fails. Three days are added to the sentence.');}}
    else if(id==='justice_bribe'){s.hero.gold-=30;p.attempts++;if(seededRoll(s.seed,`gaoler:${p.startDay}:${p.attempts}`,100)<35){release(s,ctx,true);}else{p.totalDays=Math.min(240,p.totalDays+2);log(s,ctx,'A corrupt bargain refused','The offer is confiscated. Two days are added to custody.');}}
    return true;
  }
  if(id.startsWith('justice_followup_')){const a=s.justice.accounts?.find(a=>a.id===id.slice(17));if(!a||a.resolution)return false;const taken=ctx.spendDays(2);if(taken!==2||s.phase==='retired')return true;s.hero.gold-=6;a.resolution='introduced';ctx.standing('villagers',2);s.hero.skills.persuasion++;log(s,ctx,'A person beyond the sentence',`${a.person.name}’s named household received an introduction after two days and six gold. Their old custody remains in history.`);return true;}
  if(id==='justice_surrender')return imprison(s,ctx);
  if(id==='justice_restitution'){s.hero.gold-=a.cost;closeReports(s,s.locationId);log(s,ctx,'Regional restitution paid','You answer the local report. Other settlements keep their own evidence.');return true;}
  const burglary=id==='justice_burglary',silver=burglary?householdSilver(s):null;
  const taken=ctx.spendDays(a.days);if(taken!==a.days||s.phase==='retired'){s.notice='The attempt was interrupted before you took anything.';return true;}
  if(silver){const reason=householdSilverReason(s,silver)||(s.adventuring.loot.length>=160?'Your valuable bag filled before the attempt finished.':null);if(reason){s.notice=reason+' The attended attempt took nothing.';return true;}}
  const region=regionAt(s),m=s.realm.sites[s.locationId].merchant,property=burglary?{...silver,owner:m}:theftProperty(s);if(!property)return false;s.justice.thefts++;
  const chance=35+Math.min(45,s.hero.skills.stealth*3+s.hero.attributes.agility)-(burglary?20:0),success=seededRoll(s.seed,`theft:${s.justice.thefts}:${s.locationId}`,100)<chance;
  if(success){const loot={id:`theft-${s.dynasty?.generation||1}-${s.justice.thefts}`,name:property.name,value:property.value,stolen:true,source:s.locationId,day:s.day,ownerId:property.owner.id,ownerName:property.owner.name,propertyId:property.id};const claims=burglary?null:takenPropertiesWith(s,property.id);if(burglary){if(!claimHouseholdSilver(s,silver,{lootId:loot.id}))return false;}else{if(!claims)return false;if(property.itemId){if(!carryStolenGear(s,loot,property.itemId,{id:`stolen_${s.dynasty?.generation||1}_${s.justice.thefts}`,stockSeason:m.season}))return false;}else s.adventuring.loot.push(loot);s.justice.takenProperties=claims;}if(property.itemId)m.stock[property.itemId]--;s.hero.skills.stealth++;ctx.standing('underworld',2);log(s,ctx,'Taken beneath the lantern',property.itemId?'You carry the stolen '+GEAR_CATALOG.find(g=>g.id===property.itemId).name.toLowerCase()+' away. It can be equipped from Inventory, and its original owner remains recorded. A fence may buy it; an honest sale can expose its origin.':'You carry stolen goods away. A fence may buy them; an honest sale can expose their origin.');ctx.breakOath('You took another household’s property.');}
  if(!success||seededRoll(s.seed,'witness:'+s.justice.thefts,100)<region.law.enforcement/3){ctx.addEvidence(burglary?3:2,`${m.name} and the local watch identify you in ${burglary?'a household burglary':'a theft from the market'}.`);ctx.standing('villagers',-5);log(s,ctx,'Someone saw your face','A named witness supplies local evidence. This region’s law now governs the report.');}
  return true;
}
export function applyJusticeChoice(s,eventId,id,ctx){
  if(eventId.startsWith('justice_counting_'))return applyCountingTableChoice(s,eventId,id,ctx);
  if(eventId!=='justice_arrest'||!s.justice.arrest)return false;
  const region=regionAt(s),i=incident(s);if(!region||!i)return false;
  if(id==='surrender')return imprison(s,ctx);
  if(id==='pay'){const fine=i.evidence*region.law.theftFinePerEvidence;if(s.hero.gold<fine)return false;s.hero.gold-=fine;closeReports(s,s.locationId);s.justice.arrest=null;log(s,ctx,'The watch accepts restitution','The local case closes under the region’s actual tariff.');}
  else if(id==='flee'){s.justice.arrest=null;const success=s.hero.skills.stealth+Math.floor(s.hero.attributes.agility/2)>=6+seededRoll(s.seed,`patrol:${s.day}:${i.evidence}`,12);if(success){ctx.spendDays(1);log(s,ctx,'Lost among the streets','You evade the patrol. The local warrant remains.');}else imprison(s,ctx);}
  else if(id==='bribe'){if(s.hero.gold<20)return false;s.hero.gold-=20;s.justice.arrest=null;if(seededRoll(s.seed,`captain-bribe:${s.day}`,100)<30)log(s,ctx,'A captain looks away','The captain takes your coin. The warrant remains in the ledger.');else{ctx.addEvidence(1,'An attempted bribe was refused by the regional watch.');imprison(s,ctx);}}
  else return false;return true;
}
export function justiceEventIds(){return {justice_arrest:['surrender','pay','flee','bribe'],...countingTableEventIds()};}
export function validateJustice(j,s){
  const int=(n,min=0,max=10000000)=>Number.isInteger(n)&&n>=min&&n<=max,site=id=>s.world.locations.some(p=>p.id===id);
  if(!j||j.version!==1||!int(j.lastCheckDay,-1)||!int(j.thefts)||!Array.isArray(j.history)||j.history.length>80)return false;
  if(!validateCountingTableState(s))return false;
  const carried=(s.equipment?.instances||[]).filter(i=>i.stolen),transferred=j.propertyTransfers||[];
  if(carried.some(i=>!validateStolenGearRecord(i,GEAR_CATALOG)))return false;
  if(!Array.isArray(transferred)||transferred.length>200||new Set(transferred.map(i=>i?.id)).size!==transferred.length||transferred.some(i=>!validateStolenGearRecord(i,GEAR_CATALOG)||!site(i.source)||i.day>s.day||!int(i.transferredDay,i.day,s.day)||!['sold','returned'].includes(i.outcome)||typeof i.recipientId!=='string'||!i.recipientId.length||i.recipientId.length>160||typeof i.recipientName!=='string'||!i.recipientName.length||i.recipientName.length>120||!int(i.price,0,10000)||i.outcome==='returned'&&(i.price!==0||i.recipientId!==i.provenance.ownerId)))return false;
  const assets=[...carried,...transferred],ids=assets.map(i=>i.id),lootIds=assets.map(i=>i.provenance.lootId);
  if(new Set(ids).size!==ids.length||new Set(lootIds).size!==lootIds.length||assets.some(i=>!site(i.source)||i.day>s.day||(s.adventuring?.loot||[]).some(l=>l.id===i.provenance.lootId)))return false;
  if(j.takenProperties!==undefined&&(!Array.isArray(j.takenProperties)||j.takenProperties.length>200||j.takenProperties.some(p=>typeof p!=='string'||p.length>240)))return false;
  if(!j.history.every(h=>site(h.locationId)&&int(h.startDay)&&int(h.endDay)&&h.endDay>=h.startDay&&int(h.servedDays)&&int(h.totalDays,1,240)&&['served','escaped'].includes(h.outcome)))return false;
  if(j.arrest&&(!site(j.arrest.locationId)||j.arrest.locationId!==s.locationId||!int(j.arrest.evidence,1,10000)||s.event?.id!=='justice_arrest'))return false;
  const p=j.prison;if(!p)return true;
  return site(p.locationId)&&p.locationId===s.locationId&&s.realm.regions.some(r=>r.id===p.regionId)&&int(p.startDay)&&p.startDay<=s.day&&int(p.totalDays,1,240)&&int(p.servedDays,0,p.totalDays-1)&&int(p.evidence,1,10000)&&int(p.attempts)&&typeof p.reason==='string'&&p.reason.length<=3000&&[p.warden,p.inmate].every(p=>p&&typeof p.name==='string'&&p.name.length<=120&&isCanonicalAppearance(p.appearance));
}
