import { REGIONAL_CULTURES, regionalCulture, regionalGovernment } from './regional-content-v33.js';
import { REGION_TEMPLATES, FAITHS } from './realm-content-v18.js';
import { seededRoll, isSettlement, generatePersonName } from './world.js';
import { generateCharacter } from './characters.js';
import { isCanonicalAppearance } from './avatar.js';

const clamp=n=>Math.max(0,Math.min(100,n));
const regionName=id=>REGION_TEMPLATES.find(r=>r.id===id)?.name||id;
const questKey=(s,kind,id)=>(kind==='war'?'mediation-':'liberation-')+id+'-g'+(s.dynasty?.generation||1);
const owner=s=>s.dynasty?.activePersonId||'hero';
const room=s=>s.cartography?.interior?.roomId||'gate';
const place=(s,id)=>s.world.locations.find(p=>p.id===id);
const politics=s=>s.realm?.politics;
const quarter=d=>Math.floor(d/91);
const alive=p=>p&&p.alive!==false;
const log=(s,ctx,title,text)=>(ctx.journalLiteral||ctx.journal)?.(title,text,'world');
export function heldSettlement(s,id=s.locationId){return politics(s)?.holds.find(h=>h.siteId===id&&h.status==='held')||null;}
function dispatch(s,day,title,text,extra={}){
 const p=politics(s),id=`dispatch-${day}-${extra.warId||extra.holdId||extra.personId||title}`;
 if(p.dispatches.some(d=>d.id===id))return;
 if(extra.locationId){s.world.changes.push({id,day,title,text,locationId:extra.locationId,source:'politics'});s.world.changes=s.world.changes.slice(-500);}
 p.dispatches.push({id,day,title,text,...extra});p.dispatches=p.dispatches.slice(-120);
 s.realm.history.push({day,generation:s.dynasty?.generation||1,text});s.realm.history=s.realm.history.slice(-180);
}
function courtPerson(s,r,day=s.day){
 const c={...regionalCulture(r.id),...regionalGovernment(r.id,r.regime)},id=`court-${r.id}-${r.succession}`,age=r.ruler.baseAge+Math.floor((day-r.ruler.createdDay)/365);
 return {...structuredClone(r.ruler),id,role:c.title,locationId:politics(s).regions[r.id].capitalId,age,baseAge:r.ruler.baseAge-Math.floor(r.ruler.createdDay/365),sourceRulerId:r.ruler.id,available:true,bond:35,description:`${c.title} of ${regionName(r.id)}. ${c.succession}`};
}
function refreshCourt(s,day=s.day){
 const p=politics(s);for(const r of s.realm.regions){const record=p.regions[r.id];if(!record.capitalId)continue;
  const current=record.court[0],actual=current&&s.life?.people.find(a=>a.id===current.id&&a.alive===false&&(a.deathDay??s.day)<=day);
  if(actual&&current.sourceRulerId===r.ruler.id){const c={...regionalCulture(r.id),...regionalGovernment(r.id,r.regime)},date=actual.deathDay??day;r.succession++;const id=`ruler:${r.id}:${r.succession}`,age=30+seededRoll(s.seed,id+':vacancy',25);r.ruler={...generateCharacter(s.seed,id,{role:c.title,age}),id,name:generatePersonName(s.seed,id,{regionId:r.id}),baseAge:age,createdDay:date};record.lastElectionDay=date;dispatch(s,date,'The Court Confirms a Successor',`${actual.name} has died. ${c.court} confirms ${r.ruler.name} as ${c.title}; the government’s existing claims and agreements remain.`,{regionId:r.id,locationId:record.capitalId});}

  const officer=record.court[1];if(officer&&officer.baseAge+Math.floor(day/365)>=80){officer.available=false;officer.serviceEndDay=day;record.retired.push(officer);record.retired=record.retired.slice(-12);const age=32+seededRoll(s.seed,'clerk-age:'+r.id+day,20),id=`chancellor-${r.id}-${day}`;record.court[1]={...generateCharacter(s.seed,id,{role:'Chancellor',age}),id,age,baseAge:age-Math.floor(day/365),locationId:record.capitalId,role:'Court Clerk',createdDay:day,available:true,bond:35};}
  const id=`court-${r.id}-${r.succession}`;if(record.court[0]?.id!==id){const previous=record.court[0];if(previous){previous.available=false;previous.serviceEndDay=day;record.retired.push(previous);record.retired=record.retired.slice(-12);}record.court=[courtPerson(s,r,day),record.court[1]].filter(Boolean);}
 }
}
export function initializeRegionalWorld(s){
 if(!s.realm)return;
 if(politics(s)){politics(s).festivals||=[];refreshCourt(s);return;}
 const p={version:1,startedDay:s.day,lastQuarter:quarter(s.day),regions:{},borders:[],dispatches:[],deployments:[],holds:[],quests:[],knownRegions:[],festivals:[],pending:null};s.realm.politics=p;
 for(const c of REGIONAL_CULTURES){const sites=Object.values(s.realm.sites).filter(t=>t.regionId===c.id&&isSettlement(s.world,t.id));
  sites.sort((a,b)=>(b.id==='seat-'+c.id)-(a.id==='seat-'+c.id)||(['city','citadel'].includes(place(s,b.id).type)?1:0)-(['city','citadel'].includes(place(s,a.id).type)?1:0)||b.prosperity-a.prosperity||a.id.localeCompare(b.id));
  const capitalId=sites[0]?.id||null,r=s.realm.regions.find(r=>r.id===c.id);if(s.world.map?.generationVersion>=7){r.regime=c.regime;r.ruler.name=generatePersonName(s.seed,r.ruler.id,{...r.ruler,regionId:c.id});}
  p.regions[c.id]={capitalId,government:regionalGovernment(c.id,r.regime).government,term:0,lastElectionDay:s.day,court:[],retired:[]};
  if(capitalId){const id=`chancellor-${c.id}`,age=35+seededRoll(s.seed,id,20),person={...generateCharacter(s.seed,id,{role:'Chancellor',age}),id,baseAge:age-Math.floor(s.day/365),age,createdDay:s.day,locationId:capitalId,role:c.regime==='council'?'Assembly Clerk':'Chancellor',available:true,bond:40};p.regions[c.id].court=[courtPerson(s,r),person];}
 }
 for(const road of s.world.roads){const a=s.realm.sites[road.from]?.regionId,b=s.realm.sites[road.to]?.regionId;if(a&&b&&a!==b){const pair=[a,b].sort();if(!p.borders.some(x=>x[0]===pair[0]&&x[1]===pair[1]))p.borders.push(pair);}}
 p.borders.sort((a,b)=>a.join().localeCompare(b.join()));learnRegion(s);
}
export function learnRegion(s){const p=politics(s),id=s.realm?.sites[s.locationId]?.regionId;if(p&&id&&!s.cartography?.offsite&&!p.knownRegions.includes(id))p.knownRegions.push(id);}
export function regionalCourtServices(s,siteId){
 const p=politics(s);if(!p||heldSettlement(s,siteId))return [];
 const r=Object.values(p.regions).find(r=>r.capitalId===siteId);if(!r)return [];
 return r.court.map(person=>({id:person.id,kind:'court',person:{...person,age:person.baseAge+Math.floor(s.day/365)},roomId:'court'}));
}
export function regionalCourtContacts(s){const p=politics(s);if(!p)return [];return Object.values(p.regions).flatMap(r=>[...r.court,...r.retired]).filter(person=>s.cartography?.sites[person.locationId]?.kind==='Visited'||s.conversations?.threads?.[person.id]).map(person=>({...person,age:person.baseAge+Math.floor(Math.min(s.day,person.serviceEndDay??s.day)/365),available:person.available!==false&&!heldSettlement(s,person.locationId)&&isSettlement(s.world,person.locationId),kind:'extra',minAge:0,source:s.conversations?.relationships?.[person.id],bond:s.conversations?.relationships?.[person.id]?.bond??35}));}
function frontSite(s,a,b){const roads=s.world.roads.filter(r=>{const x=s.realm.sites[r.from].regionId,y=s.realm.sites[r.to].regionId;return x===a&&y===b||x===b&&y===a;});const ids=[...new Set(roads.flatMap(r=>[r.from,r.to]))].filter(id=>isSettlement(s.world,id));return ids.find(id=>s.realm.sites[id].regionId===a)||politics(s).regions[a].capitalId;}
export function startRegionalWar(s,a,b,day=s.day,causeKey='border'){
 const p=politics(s);if(!p||!Number.isSafeInteger(day)||day<0||day>s.day||a===b||!p.borders.some(x=>x.includes(a)&&x.includes(b))||!p.regions[a]?.capitalId||!p.regions[b]?.capitalId||s.realm.wars.some(w=>w.status==='active'&&[w.a,w.b].includes(a)&&[w.a,w.b].includes(b)))return null;
 const id=`dispute-${a}-${b}-${day}`,frontSiteId=frontSite(s,a,b),site=place(s,frontSiteId),ar=s.realm.regions.find(r=>r.id===a),br=s.realm.regions.find(r=>r.id===b),resource=REGION_TEMPLATES.find(r=>r.id===a).resource;
 const causes={border:`Both governments claim the crossing near ${site.name}; rival patrols have begun collecting tolls.`,resource:`A shortage of ${resource} has led to seized caravans near ${site.name}. The neighboring government refuses compensation.`,succession:`${ar.ruler.name} has rejected ${br.ruler.name}’s border charter after a disputed succession. Both courts have mobilized their watch companies.`,faith:`Pilgrims following ${FAITHS.find(f=>f.id===ar.faithId).name} have been turned away from the road near ${site.name}. ${ar.ruler.name} demands protected passage; the neighboring court refuses to surrender its watch authority.`,occupation:`The courts dispute an earlier occupation and the return of displaced households near ${site.name}.`};
 if(!Object.hasOwn(causes,causeKey))return null;
 const entrenched=seededRoll(s.seed,id+':generations',5)===0,w={id,a,b,startDay:day,endsDay:day+365*200,status:'active',victor:null,balance:0,politicalVersion:33,causeKey,frontSiteId,grievance:causes[causeKey],terms:`${regionalCulture(a).diplomacy}; ${regionalCulture(b).diplomacy.toLowerCase()}. Civilian homes must remain accessible.`,exhaustion:0,lastQuarter:quarter(day),entrenched,phase:'mobilizing'};
 s.realm.wars.push(w);trimWars(s);dispatch(s,day,'War on the Border',`${regionName(a)} and ${regionName(b)} enter a war. ${w.grievance}`,{warId:id});return w;
}
function trimWars(s){if(s.realm.wars.length<=40)return;const referenced=new Set(politics(s).quests.filter(q=>q.status==='active').map(q=>q.warId));while(s.realm.wars.length>40){const i=s.realm.wars.findIndex(w=>w.status!=='active'&&!referenced.has(w.id));if(i<0)break;s.realm.wars.splice(i,1);}}
function settleWar(s,w,day,victor=null){if(w.status!=='active')return;w.status=victor?'ended':'truce';w.victor=victor;w.endsDay=day;w.phase=victor?'settlement':'ceasefire';
 if(victor){const winner=s.realm.regions.find(r=>r.id===victor),loser=s.realm.regions.find(r=>r.id===(victor===w.a?w.b:w.a));winner.power=clamp(winner.power+8);loser.power=clamp(loser.power-8);loser.occupation={day,author:winner.ruler.name,policy:winner.regime==='council'?'restitution':'watch'};}
 dispatch(s,day,victor?'A Border Settlement':'A Ceasefire Signed',`${regionName(w.a)} and ${regionName(w.b)} end ${Math.max(1,Math.floor((day-w.startDay)/365))} years of conflict. ${victor?regionName(victor)+' wins a border concession; cultural identity and civilian households remain.':'The courts accept reciprocal access and civilian relief.'}`,{warId:w.id});
 for(const q of politics(s).quests.filter(q=>q.warId===w.id&&q.status==='active')){q.status='completed';q.endedDay=day;q.result='The war ended. '+(q.steps.includes('treaty')?'You carried the witnessed agreement between both courts.':'The courts settled while your mediation was still underway.');}
 for(const d of politics(s).deployments.filter(d=>d.warId===w.id&&d.status==='deployed')){d.status='returned';d.endedDay=day;const person=deployedActor(s,d);if(alive(person)){person.memories||=[];person.memories.push(`I returned from the war between ${regionName(w.a)} and ${regionName(w.b)}.`);person.memories=person.memories.slice(-30);}dispatch(s,day,'A Relative Returns',`${d.name} returns from service. The war and the time apart remain part of your family’s history.`,{personId:d.personId,warId:w.id});}
}
export function startVampireHold(s,siteId,day=s.day){
 const p=politics(s),site=s.realm?.sites[siteId];if(!p||!Number.isSafeInteger(day)||day<0||day>s.day||!site||!isSettlement(s.world,siteId)||p.holds.some(h=>h.siteId===siteId&&['held','cleared'].includes(h.status)))return null;
 const id=`hold-${siteId}-${day}`,regionId=site.regionId,name=generatePersonName(s.seed,id,{regionId}),h={id,siteId,regionId,startDay:day,status:'held',controllerName:name,clearedDay:null,resolvedDay:null};p.holds.push(h);site.security=Math.min(site.security,25);site.prosperity=Math.max(0,site.prosperity-12);
 dispatch(s,day,'A Vampire Hold',`${name}’s vampires seize ${place(s,siteId).name}. Its government falls under their control; the original regional claim, residents and faith remain. Public trading and official work close. A resistance contact shelters by the watchhouse.`,{holdId:id,locationId:siteId});return h;
}
function familyService(s,w,q,day,ctx){
 const p=politics(s),regionId=s.realm.sites[s.hero.birthplaceId||'home']?.regionId;if(![w.a,w.b].includes(regionId))return;
 for(const person of s.life?.people||[]){if(!alive(person)||person.familyRole!=='sibling'||p.deployments.some(d=>d.personId===person.id&&d.status==='deployed'))continue;
  const born=person.bornDay??-person.baseAge*365,age=Math.floor((day-born)/365);if(age<18||age>50||seededRoll(s.seed,`enlist:${w.id}:${person.id}:${q}`,100)>=12)continue;
  const d={personId:person.id,lineageId:s.lineage?.people.find(p=>p.source==='life'&&p.localId===person.id)?.id||null,name:person.name,warId:w.id,enlistedDay:day,endedDay:null,status:'deployed'};p.deployments.push(d);person.memories||=[];person.memories.push(`I enlisted in the border war in world year ${Math.floor(day/365)+1}.`);person.memories=person.memories.slice(-30);
  dispatch(s,day,'A Relative Enlists',`${person.name}, age ${age}, joins the supply company of ${regionName(regionId)}. ${s.age<18?'You are too young to enlist; their service is their own decision.':'Their service is their own decision.'}`,{personId:person.id,warId:w.id});log(s,ctx,'A Relative Enlists',`${person.name} leaves for the war. Their assignment and letters remain in your family record.`);
 }
 for(const d of p.deployments.filter(d=>d.warId===w.id&&d.status==='deployed'&&d.enlistedDay<day)){
  const person=deployedActor(s,d);const line=d.lineageId&&s.lineage?.people.find(r=>r.id===d.lineageId);if(line?.alive===false||person&&person.alive===false){d.status='killed';d.endedDay=line?.deathDay??person.deathDay;continue;}if(!person&&!line)continue;
  if(seededRoll(s.seed,`casualty:${w.id}:${d.personId}:${q}`,100)<3){if(ctx.killPerson?.(d.lineageId||d.personId,`Killed while serving near ${place(s,w.frontSiteId).name}`,day)){d.status='killed';d.endedDay=day;dispatch(s,day,'A Death in the War',`${d.name} dies while serving near ${place(s,w.frontSiteId).name}. Your actual relative’s name and death remain in the family record.`,{personId:person.id,warId:w.id});}}
 }
 p.deployments=p.deployments.slice(-80);
}
export function onRegionalTime(s,oldDay,newDay,ctx={}){
 const p=politics(s);if(!p||s.phase==='retired')return;
 for(let q=p.lastQuarter+1;q<=quarter(newDay);q++){
  const day=q*91;electThrough(s,day);
  // The courts of the living world decide when to march (living-world.js `startRegionalWar`).
  for(const w of s.realm.wars.filter(w=>w.politicalVersion===33&&w.status==='active'&&w.lastQuarter<q)){
   if(!isSettlement(s.world,w.frontSiteId)){const previous=w.frontSiteId,next=frontSite(s,w.a,w.b);if(next&&next!==previous){w.frontSiteId=next;w.refugeFromId=previous;dispatch(s,day,'Border Households Relocate',`Survivors from ${place(s,previous).name} now give their accounts at ${place(s,next).name}. The disputed claim remains; accepted mediation can continue there.`,{warId:w.id,locationId:next});}}
   const age=q-quarter(w.startDay);w.balance=Math.max(-100,Math.min(100,w.balance+seededRoll(s.seed,w.id+':front:'+q,7)-3));w.exhaustion=Math.min(w.entrenched?75:100,w.exhaustion+seededRoll(s.seed,w.id+':wear:'+q,3));w.lastQuarter=q;w.phase=age<3?'mobilizing':Math.abs(w.balance)<10&&age>12?'stalemate':'campaigning';
   familyService(s,w,q,day,ctx);
   if(age>=8&&((Math.abs(w.balance)>=24&&w.exhaustion>18)||!w.entrenched&&w.exhaustion>=55&&seededRoll(s.seed,w.id+':peace:'+q,100)<20||w.entrenched&&age>=80&&seededRoll(s.seed,w.id+':peace:'+q,500)<1))settleWar(s,w,day,Math.abs(w.balance)>=24?(w.balance>0?w.a:w.b):null);
   else if(age>0&&age%16===0)dispatch(s,day,w.phase==='stalemate'?'The War Remains Unsettled':'News from the Front',`${regionName(w.a)} and ${regionName(w.b)} remain at war after ${Math.floor((day-w.startDay)/365)} years. ${w.phase==='stalemate'?'Neither side can secure the disputed crossing. A new generation may inherit the claim.':'Patrols still contest '+place(s,w.frontSiteId).name+'.'}`,{warId:w.id});
  }
  // Outbreaks are infrequent world events, independent of the hero’s travel.
  if(p.holds.filter(h=>h.status==='held').length<2&&seededRoll(s.seed,'vampire-outbreak:'+q,100)<4){const candidates=s.world.locations.filter(t=>isSettlement(s.world,t.id)&&t.id!==s.locationId&&t.id!==s.life?.home?.locationId&&!['home','city','brook','tower','citadel','sanctuary'].includes(t.id)&&!Object.values(p.regions).some(r=>r.capitalId===t.id)&&s.realm.sites[t.id].security<62&&!p.holds.some(h=>h.siteId===t.id));if(candidates.length)startVampireHold(s,candidates[seededRoll(s.seed,'outbreak-town:'+q,candidates.length)].id,day);}
  p.lastQuarter=q;
 }
 electThrough(s,newDay);
 refreshCourt(s);trimWars(s);
}
function quest(s,id){return politics(s).quests.find(q=>q.id===id&&q.ownerId===owner(s));}
const action=(id,label,description,days=0,reason='')=>({id,label,description,days,cost:0,group:'Local Affairs',...(reason?{disabledReason:reason}:{})});
export function regionalActions(s){
 const p=politics(s);if(!p||s.phase==='retired'||s.event||s.battle||s.maze||s.justice?.prison||s.cartography?.offsite||s.cartography?.pending||s.timeline?.journey)return [];
 const rid=s.realm.sites[s.locationId]?.regionId,result=[],culture=regionalCulture(rid),year=Math.floor(s.day/365);
 if(culture&&Math.abs(s.day%365-culture.festivalDay)<=7&&!heldSettlement(s)&&!(p.festivals||[]).some(f=>f.regionId===rid&&f.year===year&&f.ownerId===owner(s)))result.push(action('polity_festival','Join '+culture.festival,culture.tradition+' Spend a day with the community.',1));
 if(isSettlement(s.world,s.locationId))result.push(action('polity_custom','Ask About Local Life',`Hear about local customs, the primary faith and who governs ${regionName(rid)}.`));
 if(s.age<18)return result;
 for(const w of s.realm.wars.filter(w=>w.politicalVersion===33&&w.status==='active'&&[w.a,w.b].includes(rid))){const id=questKey(s,'war',w.id),q=quest(s,id),capital=p.regions[rid].capitalId;
  if(!q)result.push(action('polity_war_accept_'+w.id,'Offer to Mediate the War',`${w.grievance} Hear witnesses at ${place(s,w.frontSiteId).name}, carry proposals between both courts, and deliver civilian supplies.`));
  else if(q.status==='active'){
   if(s.locationId===w.frontSiteId&&!q.steps.includes('witness'))result.push(action('polity_war_witness_'+w.id,'Hear the Border Households','Spend one day recording which crossing and homes both sides claim.',1));
   if(s.locationId===capital&&!q.steps.includes('terms-'+rid))result.push(action('polity_war_terms_'+w.id,'Ask This Court for Written Terms',regionalCulture(rid).diplomacy+'. Spend one day hearing and recording the proposal.',1));
   if(s.locationId===w.frontSiteId&&!q.steps.includes('relief'))result.push(action('polity_war_relief_'+w.id,'Deliver Supplies to Displaced Families','Bring 3 Rations. Spend a day distributing them with local witnesses.',1,s.adventuring.rations<3?'Bring 3 Rations from a working merchant.':''));
   if(s.locationId===p.regions[w.a].capitalId&&['witness','terms-'+w.a,'terms-'+w.b,'relief'].every(k=>q.steps.includes(k)))result.push(action('polity_war_settle_'+w.id,'Convene the Witnessed Settlement',`Both courts have given terms. Spend two days agreeing reciprocal access and a civilian return. This ends the current war without annexing either culture.`,2));
  }
 }
 for(const h of p.holds.filter(h=>h.siteId===s.locationId&&['held','cleared'].includes(h.status))){const id=questKey(s,'hold',h.id),q=quest(s,id);
  if(!q)result.push(action('polity_hold_accept_'+h.id,'Listen to the Resistance',`${h.controllerName} controls this town. Learn who is sheltering here before deciding to intervene.`));
  else if(q.status==='active'){
   if(!q.steps.includes('witness'))result.push(action('polity_hold_witness_'+h.id,'Find the Surviving Records','Visit the Archive and spend a day recording the vampire guard’s routes and the surviving households.',1));
   if(q.steps.includes('witness')&&!q.steps.includes('supplies'))result.push(action('polity_hold_supplies_'+h.id,'Stock the Resistance Shelter','Bring 2 Rations to the Watchhouse. The resistance will shelter civilians while you enter the hold.',1,s.adventuring.rations<2?'Bring 2 Rations.':''));
   if(q.steps.includes('supplies')&&h.status==='held')result.push(action('polity_hold_fight_'+h.id,q.steps.includes('guard')?'Confront the Vampire Ruler':'Break the Vampire Guard',`Enter the Occupied Keep. Fight ${q.steps.includes('guard')?h.controllerName:'the vampire patrol'} with your current party. Retreat keeps the unfinished quest.`,1,s.hero.hp<20?'Recover at least 20 Health before confronting the hold.':''));
   if(h.status==='cleared')result.push(action('polity_hold_restore_'+h.id,'Restore Regional Rule',`Return the hold to ${s.realm.regions.find(r=>r.id===h.regionId).ruler.name}. The regional claim and local faith are preserved.`),action('polity_hold_claim_'+h.id,'Claim the Hold for Your Household','Take contested stewardship. Your dynasty receives its returns, while the original government records a disputed claim. Your household receives its yearly returns; the original government keeps its claim.'));
  }
 }
 return result;
}
export function politicalActionRoom(s,id){if(id==='polity_festival'||id==='polity_custom'||id.startsWith('polity_war_accept_')||id.startsWith('polity_war_witness_')||id.startsWith('polity_war_relief_'))return ['watch','court'];if(/^polity_war_(terms|settle)_/.test(id))return ['court'];if(id.startsWith('polity_hold_witness_'))return ['archive'];if(id.startsWith('polity_hold_fight_'))return ['stronghold'];return ['watch'];}
export function applyRegionalAction(s,id,ctx){
 const offer=regionalActions(s).find(a=>a.id===id);if(!offer||offer.disabledReason||!politicalActionRoom(s,id).includes(room(s)))return false;
 const p=politics(s),rid=s.realm.sites[s.locationId].regionId;
 if(id==='polity_festival'){if(ctx.spendDays(1,{outdoors:false})!==1)return true;const c=regionalCulture(rid);p.festivals||=[];p.festivals.push({regionId:rid,ownerId:owner(s),year:Math.floor((s.day-1)/365),day:s.day});p.festivals=p.festivals.slice(-60);if(s.life)s.life.stress=Math.max(0,s.life.stress-6);s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+3);s.notice=c.tradition+' You spent the day together and recovered 3 Focus.';log(s,ctx,c.festival,s.notice);return true;}
 if(id==='polity_custom'){learnRegion(s);const c=regionalCulture(rid),f=FAITHS.find(f=>f.id===s.realm.regions.find(r=>r.id===rid).faithId);s.notice=`${c.custom} ${c.tradition} ${regionName(rid)} is governed by the ${p.regions[rid].government.toLowerCase()}. Most shrines follow ${f.name}; individual households may follow another faith.`;log(s,ctx,'Local Life in '+regionName(rid),s.notice);return true;}
 const m=/^polity_(war|hold)_(accept|witness|terms|relief|settle|supplies|fight|restore|claim)_(.+)$/.exec(id);if(!m||s.age<18)return false;const [,kind,verb,token]=m,item=kind==='war'?s.realm.wars.find(w=>w.id===token):p.holds.find(h=>h.id===token),qid=questKey(s,kind,token);
 if(!item)return false;
 if(verb==='accept'){if(p.quests.length>=64||kind==='war'&&p.quests.filter(q=>q.kind==='war').length>=24){s.notice='Your dynasty’s regional quest record is full.';return true;}p.quests.push({id:qid,ownerId:owner(s),kind,warId:kind==='war'?token:null,holdId:kind==='hold'?token:null,status:'active',startedDay:s.day,endedDay:null,steps:[],result:''});log(s,ctx,kind==='war'?'A War to Settle':'A Hold to Free',kind==='war'?item.grievance:`You agree to help the surviving households of ${place(s,item.siteId).name}.`);s.notice='The accepted work is recorded in your Journal.';return true;}
 const q=quest(s,qid);if(!q||q.status!=='active')return false;
 if(offer.days&&ctx.spendDays(offer.days,{outdoors:false})!==offer.days){s.notice='The work waits for your current need. No supplies were handed over.';return true;}
 if(q.status!=='active'||kind==='war'&&item.status!=='active'){s.notice='The conflict was settled while you were away.';return true;}
 if(verb==='witness')q.steps.push('witness');
 else if(verb==='terms'){q.steps.push('terms-'+rid);rememberCourt(s,rid,'We heard the border proposal together and recorded its terms.',3);}
 else if(verb==='relief'||verb==='supplies'){const n=verb==='relief'?3:2;if(s.adventuring.rations<n)return false;s.adventuring.rations-=n;q.steps.push(verb);s.realm.sites[kind==='war'?item.frontSiteId:item.siteId].security=clamp(s.realm.sites[kind==='war'?item.frontSiteId:item.siteId].security+5);}
 else if(verb==='settle'){q.steps.push('treaty');for(const id of [item.a,item.b])rememberCourt(s,id,'You carried the agreement that ended our border war.',8);settleWar(s,item,s.day);log(s,ctx,'The War Ends by Agreement',`Both courts accept the witnessed terms. ${item.terms}`);}
 else if(verb==='fight'){const stage=q.steps.includes('guard')?'ruler':'guard';p.pending={questId:q.id,holdId:item.id,stage,siteId:s.locationId};ctx.startBattle('feral_vampire',{kind:'politics',questId:q.id,holdId:item.id,stage,locationId:s.locationId});if(s.battle&&stage==='ruler')s.battle.actors.find(a=>a.side==='enemy').name=item.controllerName;return true;}
 else if(verb==='restore'||verb==='claim'){item.status=verb==='restore'?'restored':'claimed';item.resolvedDay=s.day;const site=s.realm.sites[item.siteId];site.security=Math.max(45,site.security);site.prosperity=clamp(site.prosperity+8);if(verb==='claim'){site.owner=owner(s);site.rule='force';site.contestedClaim=true;s.factions.villagers=Math.max(-100,s.factions.villagers-5);}else{delete site.owner;delete site.rule;delete site.contestedClaim;s.factions.villagers=Math.min(100,s.factions.villagers+10);}q.status='completed';q.endedDay=s.day;q.result=verb==='restore'?'The vampire hold was freed and regional rule restored.':'The vampire hold was freed; your dynasty holds a contested charter.';dispatch(s,s.day,'A Vampire Hold Freed',`${place(s,item.siteId).name}: ${q.result}`,{holdId:item.id,locationId:item.siteId});log(s,ctx,'The Hold’s Future',q.result);}
 else return false;
 s.notice=verb==='settle'||verb==='restore'||verb==='claim'?q.result:'Your progress is recorded. Read the next step in your Journal.';return true;
}
export function validPoliticalBattle(s,c){const p=politics(s),pending=p?.pending,h=p?.holds.find(h=>h.id===c.holdId),q=p?.quests.find(q=>q.id===c.questId);return Boolean(s.age>=18&&pending&&q?.ownerId===owner(s)&&q.status==='active'&&pending.siteId===s.locationId&&q.steps.includes('witness')&&q.steps.includes('supplies')&&(c.stage==='ruler'?q.steps.includes('guard')&&!q.steps.includes('ruler'):!q.steps.includes('guard'))&&pending.questId===c.questId&&pending.holdId===c.holdId&&pending.stage===c.stage&&['guard','ruler'].includes(c.stage)&&h?.status==='held'&&h.siteId===s.locationId&&c.locationId===s.locationId);}
export function afterPoliticalBattle(s,pending,outcome,ctx){const c=pending.context;if(!validPoliticalBattle(s,c))return;const p=politics(s),q=quest(s,c.questId),h=p.holds.find(h=>h.id===c.holdId);p.pending=null;if(outcome!=='victory')return;if(c.stage==='guard'){if(!q.steps.includes('guard'))q.steps.push('guard');log(s,ctx,'The Vampire Patrol Falls','The resistance can reach the outer streets. The ruler still holds the keep.');}else{if(!q.steps.includes('ruler'))q.steps.push('ruler');h.status='cleared';h.clearedDay=s.day;log(s,ctx,'The Vampire Ruler Defeated',`${h.controllerName} no longer controls ${place(s,h.siteId).name}. Return to the resistance at the Watchhouse and decide the hold’s future.`);}}
export function regionalQuestRows(s,{archive=false}={}){const p=politics(s);if(!p)return [];return p.quests.filter(q=>q.ownerId===owner(s)&&(archive?q.status!=='active':q.status==='active')).map(q=>{const w=s.realm.wars.find(w=>w.id===q.warId),h=p.holds.find(h=>h.id===q.holdId);if(q.kind==='war'){const todo=!q.steps.includes('witness')?{locationId:w.frontSiteId,objective:'Hear the border households at the Watchhouse.'}:![w.a,w.b].every(id=>q.steps.includes('terms-'+id))?{locationId:p.regions[[w.a,w.b].find(id=>!q.steps.includes('terms-'+id))].capitalId,objective:'Visit this regional court and ask for written terms.'}:!q.steps.includes('relief')?{locationId:w.frontSiteId,objective:'Deliver 3 Rations to displaced families through the Watchhouse.'}:{locationId:p.regions[w.a].capitalId,objective:'Return to this court and convene the witnessed settlement.'};return {...q,key:q.id,title:'The Disputed Crossing',...todo,description:w.grievance,result:q.result};}const todo=!q.steps.includes('witness')?'Find the surviving records at the Archive.':!q.steps.includes('supplies')?'Bring 2 Rations to the resistance at the Watchhouse.':h.status==='held'?'Enter the Occupied Keep and defeat '+(q.steps.includes('guard')?h.controllerName:'the vampire patrol')+'.':'Return to the Watchhouse. Restore regional rule or claim contested stewardship.';return {...q,key:q.id,title:'The Vampire Hold of '+place(s,h.siteId).name,locationId:h.siteId,objective:todo,description:'Help the surviving households. Their culture, memories and local faith remain.',result:q.result};});}
export function regionalNotes(s){const p=politics(s);if(!p)return [];const notes=p.knownRegions.map(id=>{const c=regionalCulture(id),r=p.regions[id],leader=s.realm.regions.find(r=>r.id===id),faith=FAITHS.find(f=>f.id===leader.faithId);return {title:regionName(id),text:`${c.culture}. ${c.history}\n\n${c.custom} ${c.tradition}\n\nGovernment: ${r.government}. ${regionalGovernment(id,leader.regime).title}: ${leader.ruler.name}. ${regionalGovernment(id,leader.regime).succession} ${r.capitalId?'The court sits at '+place(s,r.capitalId).name+'.':''}\n\nPrimary faith: ${faith.name}. ${c.economy}. ${c.tension}`};});for(const d of p.dispatches.slice(-30))notes.push({title:d.title+' · Year '+(Math.floor(d.day/365)+1),text:d.text});return notes;}
export function regionalView(s,id=s.locationId){const rid=regionalCulture(id)?id:s.realm?.sites[id]?.regionId,c=regionalCulture(rid),p=politics(s);if(!c||!p)return null;const r=p.regions[rid],record=s.realm.regions.find(r=>r.id===rid);return {...c,...regionalGovernment(rid,record.regime),government:r.government,regionName:regionName(rid),capital:r.capitalId?place(s,r.capitalId):null,ruler:record.ruler.name,faith:FAITHS.find(f=>f.id===record.faithId).name,wars:s.realm.wars.filter(w=>w.status==='active'&&[w.a,w.b].includes(rid)),hold:heldSettlement(s,id),news:p.dispatches.filter(d=>d.regionId===rid||d.locationId===id||d.warId&&s.realm.wars.some(w=>w.id===d.warId&&[w.a,w.b].includes(rid))).slice(-3)};}
export function validateRegionalWorld(s){
 const p=politics(s);if(p===undefined)return true;const int=(v,a=0,b=s.day)=>Number.isSafeInteger(v)&&v>=a&&v<=b,str=(v,n=2000)=>typeof v==='string'&&v.length<=n,site=id=>s.world.locations.some(t=>t.id===id),rid=id=>REGIONAL_CULTURES.some(r=>r.id===id),distinct=rows=>new Set(rows.map(r=>r.id)).size===rows.length;
 if(!p||p.version!==1||!int(p.startedDay)||!int(p.lastQuarter,0,quarter(s.day))||!p.regions||Object.keys(p.regions).length!==6||!Array.isArray(p.borders)||p.borders.length>15||!p.borders.every(b=>Array.isArray(b)&&b.length===2&&b[0]!==b[1]&&b.every(rid))||new Set(p.borders.map(b=>b.join('|'))).size!==p.borders.length)return false;
 for(const c of REGIONAL_CULTURES){const r=p.regions[c.id];if(!r||s.world.map?.generationVersion>=7&&r.capitalId!=='seat-'+c.id||r.capitalId!==null&&(!site(r.capitalId)||s.realm.sites[r.capitalId].regionId!==c.id)||!str(r.government,120)||!int(r.term,0,100000)||!int(r.lastElectionDay)||!Array.isArray(r.court)||r.court.length>2||r.capitalId&&r.court[0]?.sourceRulerId!==s.realm.regions.find(r=>r.id===c.id).ruler.id||!Array.isArray(r.retired)||r.retired.length>12||!distinct([...r.court,...r.retired])||![...r.court,...r.retired].every(a=>/^[a-z][a-z0-9_-]{0,79}$/.test(a.id)&&str(a.name,120)&&str(a.role,80)&&isCanonicalAppearance(a.appearance)&&site(a.locationId)&&Number.isInteger(a.baseAge)&&a.baseAge>=-100000&&a.baseAge<=100&&typeof a.available==='boolean'))return false;}
 if(p.festivals!==undefined&&(!Array.isArray(p.festivals)||p.festivals.length>60||!p.festivals.every(f=>rid(f.regionId)&&str(f.ownerId,160)&&int(f.year,0,Math.floor(s.day/365))&&int(f.day))))return false;
 if(!Array.isArray(p.knownRegions)||new Set(p.knownRegions).size!==p.knownRegions.length||!p.knownRegions.every(rid)||!Array.isArray(p.dispatches)||p.dispatches.length>120||!distinct(p.dispatches)||!p.dispatches.every(d=>str(d.id,240)&&int(d.day)&&str(d.title,160)&&str(d.text)&&(!d.locationId||site(d.locationId))))return false;
 if(!Array.isArray(p.holds)||p.holds.length>84||!distinct(p.holds)||!p.holds.every(h=>str(h.id,160)&&site(h.siteId)&&rid(h.regionId)&&h.regionId===s.realm.sites[h.siteId].regionId&&int(h.startDay)&&['held','cleared','restored','claimed'].includes(h.status)&&str(h.controllerName,120)&&(h.clearedDay===null||int(h.clearedDay,h.startDay))&&(h.resolvedDay===null||int(h.resolvedDay,h.clearedDay??h.startDay))&&(h.status==='held'?h.clearedDay===null&&h.resolvedDay===null:h.status==='cleared'?h.clearedDay!==null&&h.resolvedDay===null:h.clearedDay!==null&&h.resolvedDay!==null)))return false;
 const activeHolds=p.holds.filter(h=>['held','cleared'].includes(h.status));if(new Set(activeHolds.map(h=>h.siteId)).size!==activeHolds.length)return false;
 if(!Array.isArray(p.deployments)||p.deployments.length>80||!p.deployments.every(d=>str(d.personId,160)&&(d.lineageId===undefined||d.lineageId===null||s.lineage?.people.some(r=>r.id===d.lineageId))&&str(d.name,120)&&str(d.warId,160)&&(d.status!=='deployed'||s.realm.wars.some(w=>w.id===d.warId))&&int(d.enlistedDay)&&['deployed','returned','killed'].includes(d.status)&&(d.endedDay===null||int(d.endedDay,d.enlistedDay))&&(d.status==='deployed')===(d.endedDay===null)))return false;
 if(!Array.isArray(p.quests)||p.quests.length>64||!distinct(p.quests)||!p.quests.every(q=>str(q.id,200)&&str(q.ownerId,160)&&['war','hold'].includes(q.kind)&&['active','completed','abandoned'].includes(q.status)&&int(q.startedDay)&&(q.status==='active')===(q.endedDay===null)&&(q.endedDay===null||int(q.endedDay,q.startedDay))&&str(q.result)&&Array.isArray(q.steps)&&new Set(q.steps).size===q.steps.length&&q.steps.every(k=>['witness','relief','supplies','guard','ruler','treaty',...REGIONAL_CULTURES.map(r=>'terms-'+r.id)].includes(k))&&(q.kind==='war'?s.realm.wars.some(w=>w.id===q.warId&&w.politicalVersion===33):p.holds.some(h=>h.id===q.holdId))))return false;
 for(const w of s.realm.wars.filter(w=>w.politicalVersion!==undefined)){if(w.politicalVersion!==33||!int(w.startDay)||w.endsDay<w.startDay||w.status!=='active'&&!int(w.endsDay)||!['border','resource','succession','occupation','faith'].includes(w.causeKey)||!site(w.frontSiteId)||w.refugeFromId!==undefined&&!site(w.refugeFromId)||!int(w.exhaustion,0,100)||!int(w.lastQuarter,quarter(w.startDay),quarter(s.day))||typeof w.entrenched!=='boolean'||!['mobilizing','campaigning','stalemate','settlement','ceasefire'].includes(w.phase))return false;}
 if(p.pending!==null&&(!p.pending||!s.battle||s.battle.context?.kind!=='politics'||!validPoliticalBattle(s,s.battle.context)))return false;
 return true;
}

export function closeRegionalLife(s){const p=politics(s);if(!p)return;p.pending=null;for(const q of p.quests.filter(q=>q.ownerId===owner(s)&&q.status==='active')){q.status='abandoned';q.endedDay=s.day;q.result='This life ended before the work was finished. The world and its conflict continue.';}}

function electThrough(s,throughDay){const p=politics(s);
 // Elected offices change independently of hereditary succession.
 for(const culture of REGIONAL_CULTURES.filter(c=>s.realm.regions.find(r=>r.id===c.id).regime!=='crown')){const regime=s.realm.regions.find(r=>r.id===culture.id).regime,c={...culture,...regionalGovernment(culture.id,regime)},r=p.regions[c.id],years=regime===culture.regime?{rainward:6,saltreach:6,highstone:8,blackgrove:7,ashplain:5,bellwater:4}[c.id]:regime==='council'?6:5;while(throughDay-r.lastElectionDay>=years*365){const day=r.lastElectionDay+years*365,record=s.realm.regions.find(r=>r.id===c.id);record.succession++;const id=`ruler:${c.id}:${record.succession}`,age=30+seededRoll(s.seed,id,26);record.ruler={...generateCharacter(s.seed,id,{role:c.title,age}),id,baseAge:age,createdDay:day};record.ruler.name=generatePersonName(s.seed,id,{regionId:c.id});r.lastElectionDay=day;r.term++;refreshCourt(s,day);dispatch(s,day,'A New Regional Leader',`${record.ruler.name} is chosen as ${c.title} by ${c.court}. ${c.succession}`,{regionId:c.id});}}
}

function deployedActor(s,d){const record=d.lineageId&&s.lineage?.people.find(r=>r.id===d.lineageId);return record?(record.source==='life'?s.life.people.find(p=>p.id===record.localId):record.source==='child'?s.life.children.find(p=>p.id===record.localId):null):s.life.people.find(p=>p.id===d.personId);}
export function deploymentFor(s,id){const record=s.lineage?.people.find(p=>p.source==='life'&&p.localId===id);return politics(s)?.deployments.find(d=>d.status==='deployed'&&(d.lineageId?d.lineageId===record?.id:d.personId===id))||null;}

function rememberCourt(s,id,text,gain){const person=politics(s).regions[id].court[0];if(!person||!s.conversations)return;const book=s.conversations.relationships;if(!book[person.id]&&Object.keys(book).length>=512)return;const record=book[person.id]||={bond:35,memories:[],knownFacts:[]};if(!record.memories.includes(text))record.memories.push(text);record.memories=record.memories.slice(-30);record.bond=clamp(record.bond+gain);}
