import { FACTION_DEFINITIONS_V27 } from './faction-catalog-v27.js';
import { usesLegacyFirstAgreement, FIRST_MISSION_METHODS } from './faction-mission-state.js';
import { openFirstMissionOffer, firstMissionOfferReason, acceptFirstMission, firstMissionActions, beginFirstMissionStep, factionObjectiveProjectReason, consumeFactionObjectiveMaterials, finishFactionObjectiveProject, applyFirstMissionConclusion, firstMissionConclusionReason, validateFactionFirstMission, validateFactionObjectiveProject, firstMissionChoiceIds, firstMissionContactRoom } from './faction-first-missions.js';
import { recordMazeFee } from './maze-receipt-runtime.js';
import { STORY_FLAVOR } from './story-flavor.js';
import { intrigueActions, openIntrigue, intrigueChoiceIds, intrigueChoiceReason, applyIntrigueChoice, finishIntrigueProject, validateIntrigue } from './local-intrigue.js';
import { REGIONAL_STORIES_V27 } from './regional-stories-v27.js';
import { COMPANION_DIALOGUE_V27 } from './companion-dialogue-v27.js';
import { TECHNIQUES_V27, advancedTechnique } from './techniques-v27.js';
import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
import { seededRoll, isSettlement } from './world.js';
import { generateCharacter } from './characters.js';
import { regionAt } from './realm.js';
import { FAITHS } from './realm-content-v18.js';
import { agingPolicy } from './aging-policy-v25.js';
import { isCanonicalAppearance } from './avatar.js';
import { resolveBossApproach, propertyActions, applyPropertyAction, afterPropertyBattle, validateBossStories } from './boss-stories-v27.js';

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const openSite=(s,id)=>{const p=s.world.locations.find(p=>p.id===id);return p&&!['destroyed','evacuated'].includes(p.status)&&p.servicesAvailable!==false;};
const settled=s=>isSettlement(s.world,s.locationId);
const note=(s,ctx,title,text,meta={})=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'rpg',meta);s.rpg.history.push({day:s.day,title,text,locationId:s.locationId});s.rpg.history=s.rpg.history.slice(-180);};
const offer=(id,label,description,days=0,cost=0,reason)=>({id,label,description,days,cost,group:'Stories & discoveries',...(reason?{disabledReason:reason}:{})});
const basicChoices=kind=>[
 {id:'care',label:'Make room for their own life',description:kind==='faction'?'Keep 3 actual days and contribute 8 gold. Build public trust.':'Keep 3 actual days and contribute 8 gold. Build trust and respect.',intentTags:['care']},
 {id:'trade',label:'Agree honest paid work',description:kind==='faction'?'Keep 2 actual days. Earn 20 gold under a limited agreement.':'Keep 2 actual days. Earn 15 gold under a limited agreement.',intentTags:['work']},
 {id:'scheme',label:'Use their need for your own advantage',description:kind==='faction'?'Keep 2 actual days. Gain 32 gold; living witnesses remember pressure.':'Keep 2 actual days. Gain 25 gold; trust falls and fear rises.',intentTags:['deceit','domination']},
 {id:'leave',label:'Leave the decision for later',description:'No time or reward. The same account remains.',intentTags:['delay']},
];
export const RPG_FACTIONS_V27=FACTION_DEFINITIONS_V27;
const extraCompanions=[
 {id:'sable',ancestry:'halfling',role:'healer',classId:'healer',goal:'Keep a clinic without making exhaustion a proof of kindness.',regionId:'saltreach'},
 {id:'tovin',ancestry:'orc',role:'warrior',classId:'knight',goal:'Resolve the company’s real wage claim and build a civilian watch.',regionId:'ashplain'},
 {id:'vesper',ancestry:'tiefling',role:'rogue',classId:'bard',goal:'Keep competing verses without selling the people they name.',regionId:'bellwater'},
];
const companionClasses={mira:'guardian',orrin:'elementalist',kest:'ranger',sable:'healer',tovin:'knight',vesper:'bard'};
const anchorPriority={rainward:['fenhold','marsh','foundry','monastery'],saltreach:['port','haven','coast','island'],highstone:['quarry','saltmine','mountain','home'],blackgrove:['mill','forest','grove'],ashplain:['gate','fort','citadel','border'],bellwater:['brook','orchard','camp']};
export function regionalAnchor(s,regionId){
 const candidates=s.world.locations.filter(p=>s.realm?.sites[p.id]?.regionId===regionId&&openSite(s,p.id));
 return anchorPriority[regionId]?.map(id=>candidates.find(p=>p.id===id)).find(Boolean)||candidates.find(p=>isSettlement(s.world,p.id))||candidates[0]||null;
}
export function openStoryBoard(s){return openSite(s,s.locationId)&&(settled(s)||s.realm?.regions.some(r=>regionalAnchor(s,r.id)?.id===s.locationId));}
const ready=s=>s.rpg&&s.age>=18&&s.phase==='adult'&&!s.event&&!s.battle&&!s.conversations?.pending&&!s.timeline?.journey&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.justice?.prison;
function addCircle(s,ctx={}){
 for(const d of extraCompanions)if(!s.companions.some(p=>p.id===d.id)){
  const n=generateCharacter(s.seed,'circle:'+d.id,{ancestry:d.ancestry,age:19,role:d.classId});
  const baseAge=4+seededRoll(s.seed,'circle-base:'+d.id,8),bornDay=(s.timeline?.birthDay||0)-baseAge*365;
  s.companions.push({...n,id:d.id,role:d.role,goal:d.goal,values:['Independent work','Promises with an end','A chosen place in the world'],relationship:0,memories:[],knownFacts:[],recruited:false,active:false,baseAge,bornDay,age:Math.max(0,Math.floor((s.day-bornDay)/365)),alive:true,hp:d.role==='warrior'?44:34,maxHp:d.role==='warrior'?44:34,mp:d.role==='warrior'?16:24,maxMp:d.role==='warrior'?16:24,agility:d.role==='rogue'?7:4});
  ctx.registerCompanion?.(d.id);
 }
 s.rpg.rosterVersion=1;
}
function contact(s,id,regionId,role,locationId){
 const person=generateCharacter(s.seed,id,{role,age:25+seededRoll(s.seed,id+':age',25)}),age=25+seededRoll(s.seed,id+':age',25);
 const p={...person,id,role,locationId,regionId,baseAge:age,bornDay:s.day-age*365,age,alive:true,bond:35,memories:[],knownFacts:[],deathAge:75+seededRoll(s.seed,id+':death',18)+agingPolicy(person).elder-65};
 s.rpg.contacts.push(p);return p;
}
function makeRegionalCast(s,regionId,place){
 const roles={watcher:'Soldier',merchant:'Merchant',friend:'Farmer',rival:'Courtier',speaker:'Scholar'},cast={};
 for(const [key,role]of Object.entries(roles)){let p=s.rpg.contacts.find(p=>p.id===`regional-${regionId}-${key}`&&p.alive!==false);if(!p)p=contact(s,`regional-${regionId}-${key}${s.rpg.contactArchive.filter(p=>p.id.startsWith('regional-'+regionId+'-'+key)).length?'-'+s.day:''}`,regionId,role,place.id);cast[key]={id:p.id,name:p.name};}
 const keeper=s.realm.sites[place.id].keeper;cast.keeper={id:keeper.id,name:keeper.name};return cast;
}
export function initializeRpg(s,{fresh=false,migration=false}={},ctx={}){
 if(s.revision<5||!s.realm)return;
 if(!s.rpg)s.rpg={version:1,rosterVersion:0,contacts:[],contactArchive:[],arcs:[],companionStages:{},factions:[],services:[],trainedTechniques:[],project:null,pending:null,expedition:null,expeditions:[],history:[],curseSurvivors:[],warAccounts:[],inheritedAccounts:[],bosses:[],properties:[],propertyBattle:null};
 for(const key of ['contacts','contactArchive','arcs','factions','services','trainedTechniques','expeditions','history','curseSurvivors','warAccounts','inheritedAccounts','bosses','properties'])s.rpg[key]||=[];
 if(fresh)addCircle(s,ctx);
 for(const p of s.companions)if(!s.rpg.companionStages[p.id])s.rpg.companionStages[p.id]={id:p.id,trust:clamp(50+p.relationship/2),respect:40,fear:0,stage:0,choices:[],locationId:extraCompanions.find(c=>c.id===p.id)?regionalAnchor(s,extraCompanions.find(c=>c.id===p.id).regionId)?.id||(s.life?.home?.locationId||s.locationId):(s.life?.home?.locationId||s.locationId),status:p.alive===false?'dead':'available',awayUntil:null,nextStoryDay:s.day,history:[]};
}
export function addRpgService(s,{kind,rule='shared',locationId=s.locationId,ownerId='hero',source,expiresDay}){
 if(!s.rpg||!['shelter','workshop','clinic','market','school','ward','smuggling','blackmail','ritual','war_relief','claim','route'].includes(kind)||!s.realm?.sites[locationId])return null;
 const id=`service-${source}-${kind}`,old=s.rpg.services.find(v=>v.id===id);if(old)return old;
 const v={id,kind,rule,locationId,ownerId,source,day:s.day,lastUsedDay:null,...(expiresDay?{expiresDay}:{})};s.rpg.services.push(v);s.rpg.services=s.rpg.services.slice(-512);return v;
}
const serviceLive=(s,v)=>openSite(s,v.locationId)&&(!v.expiresDay||s.day<v.expiresDay);
const serviceSkill={workshop:'scholarship',school:'scholarship',ritual:'devotion',ward:'defense',war_relief:'survival',market:'persuasion',smuggling:'stealth',blackmail:'persuasion',claim:'weapons',route:'survival'};
function serviceActions(s){return s.rpg.services.filter(v=>v.locationId===s.locationId&&serviceLive(s,v)).map(v=>offer('rpg_service_'+v.id,`Use the ${v.rule} ${v.kind.replaceAll('_',' ')}`,`1 actual day${v.rule==='priced'?' and 5 gold':''}. ${['shelter','clinic'].includes(v.kind)?'Recover up to 15 health.':v.kind==='route'?'Receive two real ration bundles.':'Practice '+(serviceSkill[v.kind]||'survival')+'.'} Available once per 28 days.`,1,v.rule==='priced'?5:0,v.lastUsedDay!==null&&s.day-v.lastUsedDay<28?'Return after 28 days.':v.rule==='priced'&&s.hero.gold<5?'Requires 5 gold.':null));}
function fill(s,text,cast={},placeId=s.locationId,faithId=regionAt(s)?.faithId){
 const values={place:s.world.locations.find(p=>p.id===placeId)?.name||'the surviving hearth',faith:FAITHS.find(f=>f.id===faithId)?.name||'the local practice',you:s.hero.name};
 for(const [k,p]of Object.entries(cast))values[k]=p.name;
 return String(text).replace(/\{(\w+)\}/g,(_,k)=>values[k]||'the recorded participant');
}
function openRegional(s,d,ctx){
 let a=s.rpg.arcs.find(a=>a.id===d.id),p=regionalAnchor(s,d.regionId);
 if(!p)return false;
 if(!a){a={id:d.id,locationId:p.id,faithId:regionAt(s,p.id).faithId,cast:makeRegionalCast(s,d.regionId,p),chapter:0,status:'active',choices:[],startedDay:s.day,nextDay:s.day};s.rpg.arcs.push(a);}
 let castReturn='';
 for(const [key,who]of Object.entries(a.cast)){if(key==='keeper'){const actual=s.realm.sites[a.locationId].keeper;if(actual.id!==who.id){castReturn+=' '+who.name+' has left the office; '+actual.name+' now keeps its public record.';a.cast[key]={id:actual.id,name:actual.name};}continue;}const live=s.rpg.contacts.find(p=>p.id===who.id);if(!live||live.alive===false){if(live){s.rpg.contactArchive.push({...structuredClone(live),retiredDay:s.day});s.rpg.contacts=s.rpg.contacts.filter(p=>p.id!==live.id);}const next=contact(s,'regional-'+d.regionId+'-'+key+'-successor-'+s.day,d.regionId,{watcher:'Soldier',merchant:'Merchant',friend:'Farmer',rival:'Courtier',speaker:'Scholar'}[key],a.locationId);castReturn+=' '+who.name+'’s earlier account remains. '+next.name+' carries the current work forward.';a.cast[key]={id:next.id,name:next.name};}}
 s.rpg.contactArchive=s.rpg.contactArchive.slice(-512);
 const currentFaith=regionAt(s,a.locationId)?.faithId;if(currentFaith&&currentFaith!==a.faithId){castReturn+=' The original rite remains in the earlier record; the current keepers follow their region’s present practice.';a.faithId=currentFaith;}
 const chapter=d.chapters[a.chapter],prior=a.choices.at(-1),body=chapter.body+castReturn+(prior?`\n\n${chapter.branchBodies?.[prior.id]||''}\n\nYour previous account: ${prior.outcome}`:'');
 const flavored=s.narrativeEdition===30&&d.id==='rainward_last_lantern'&&a.chapter===0;
 s.rpg.pending={kind:'regional',id:d.id,chapter:a.chapter,locationId:a.locationId,...(flavored?{narrativeFlavor:STORY_FLAVOR}:{})};
 ctx.setEvent('rpg_regional',chapter.title,d.title,fill(s,body,a.cast,a.locationId,a.faithId),chapter.choices.map(c=>({id:c.id,label:c.label,description:`${c.days} actual days${c.cost?' · '+c.cost+' gold':''}${c.reward?' · '+c.reward+' gold proceeds':''}. ${c.skill?'Requires '+c.skill.id+' '+c.skill.min+'. ':''}${flavored?'':c.outcome}`,intentTags:c.id==='scheme'?['deceit','domination']:c.id==='aid'?['care']:c.id==='trade'?['work']:c.id==='leave'?['delay']:c.id==='ritual'?['ritual']:['learn'],...(rpgChoiceReason(s,c.id)?{disabledReason:rpgChoiceReason(s,c.id)}:{})})));return true;
}
function openCompanion(s,p,ctx){
 const a=s.rpg.companionStages[p.id],row=COMPANION_DIALOGUE_V27[p.id][a.stage];
 s.rpg.pending={kind:'companion',id:p.id,chapter:a.stage,locationId:s.locationId};
 const last=a.choices.at(-1);ctx.setEvent('rpg_companion',row[0],`${p.name} · chapter ${a.stage+1}/5`,fill(s,row[1],{companion:p})+(last?'\n\nThe last decision remains: '+last.outcome:''),basicChoices('companion'));return true;
}
function openFaction(s,d,ctx){
 const a=s.rpg.factions.find(a=>a.id===d.id);if(a.rank===0&&!a.firstMission&&!usesLegacyFirstAgreement(s,a))return openFirstMissionOffer(s,d,ctx);if(a.rank===0&&a.firstMission)return false;s.rpg.pending={kind:'faction',id:d.id,chapter:a.rank,locationId:s.locationId};
 ctx.setEvent('rpg_faction',d.missions[a.rank],d.name,`${d.description}\n\n${d.missions[a.rank]}${a.choices.length?'\n\nYour previous agreement: '+a.choices.at(-1).outcome:''}`,basicChoices('faction'));return true;
}
export function rpgChoiceReason(s,id){
 if(s.event?.id==='rpg_intrigue')return intrigueChoiceReason(s,id);
 const pending=s.rpg?.pending;if(!pending||id==='leave')return null;
 if(pending.firstOffer)return firstMissionOfferReason(s,id);
 if(pending.objectiveDecision)return firstMissionConclusionReason(s,id);
 if(pending.kind==='faction'&&!['care','trade','scheme'].includes(id))return 'That approach is not offered in this agreement.';
 if(pending.kind==='regional'){
  const c=REGIONAL_STORIES_V27.find(d=>d.id===pending.id)?.chapters[pending.chapter]?.choices.find(c=>c.id===id);if(!c)return 'This approach is not offered.';
  if(c.cost>s.hero.gold)return `Requires ${c.cost} gold.`;
  if(c.skill&&s.hero.skills[c.skill.id]<c.skill.min)return `Requires ${c.skill.id} ${c.skill.min}.`;
 }else if(['companion','faction'].includes(pending.kind)&&id==='care'&&s.hero.gold<8)return 'Requires 8 gold.';
 return null;
}
function startProject(s,kind,id,choice,days,cost,details,ctx,finishMaze=null){
 if(s.hero.gold<cost)return false;
 s.rpg.project={kind,id,choice,totalDays:days,completedDays:0,remainingDays:days,cost,paid:false,startedDay:s.day,locationId:s.locationId,details:structuredClone(details)};
 if(days===0){finishProject(s,ctx,finishMaze);return true;}return attend(s,ctx,finishMaze);
}
/** Reuse the existing attendance/fee engine with an explicitly bound maze target. */
export function startMazeWork(s,details,choice,days,cost,ctx,finish){
 if(s.rpg.project||!s.maze||s.maze.id!==details.mazeId||typeof finish!=='function')return false;
 return startProject(s,'maze',details.mazeId,choice,days,cost,details,ctx,finish);
}
export function continueMazeWork(s,ctx,finish){
 if(s.rpg?.project?.kind!=='maze'||typeof finish!=='function')return false;
 return attend(s,ctx,finish);
}
function attend(s,ctx,finishMaze=null){
 const p=s.rpg.project;if(!p)return false;
 if(p.kind==='faction-objective'){const reason=factionObjectiveProjectReason(s,p);if(reason){s.notice=reason;return true;}}
 if(p.kind==='maze'&&typeof finishMaze!=='function')return false;
 if(p.kind==='intrigue'&&p.details.needsPresence&&s.locationId!==p.details.locationId){s.notice='Return to the levy settlement before continuing this work.';return true;}
 if(s.hero.gold<(p.paid?0:p.cost)){s.notice='The recorded fee remains due. No time was spent.';return true;}
 const old=s.day,taken=ctx.spendDays(Math.min(7,p.remainingDays),{outdoors:p.kind==='faction-objective'?p.details.outdoors:false}),actual=Math.min(p.remainingDays,Math.max(0,s.day-old),taken||0);
 if(s.phase==='retired'){s.rpg.project=null;return true;}
 if(!actual){s.notice='Attend to the waiting calendar decision before continuing this work.';return true;}
 if(!p.paid){if(p.kind==='maze')recordMazeFee(s,'work',p.cost);s.hero.gold-=p.cost;p.paid=true;if(p.kind==='faction-objective')consumeFactionObjectiveMaterials(s,p);}
 p.completedDays+=actual;p.remainingDays-=actual;
 if(p.remainingDays===0)finishProject(s,ctx,finishMaze);else s.notice=`${p.completedDays}/${p.totalDays} actual days kept. The same work waits after the interruption.`;
 return true;
}
function finishProject(s,ctx,finishMaze=null){
 const p=s.rpg.project;s.rpg.project=null;if(!p||s.phase==='retired')return;
 if(p.kind==='faction-objective'){finishFactionObjectiveProject(s,p,ctx,{note});return;}
 if(p.kind==='maze'){finishMaze?.(p);return;}
 if(p.kind==='intrigue'){finishIntrigueProject(s,p,ctx,{addService:v=>addRpgService(s,v)});return;}
 let outcome='',reward=0;const standingBefore=s.factions.villagers;
 if(p.kind==='practice'){const t=advancedTechnique(p.id);s.hero.skills[t.skill]=Math.min(10000,s.hero.skills[t.skill]+1);outcome='Three attended mentor days developed '+t.skill+' to '+s.hero.skills[t.skill]+'.';
 }else if(p.kind==='training'){
  if(p.choice==='practice'){s.hero.skills[p.id]=Math.min(10000,s.hero.skills[p.id]+1);outcome='Three attended practice days improve '+p.id+' by one. The three-gold training fee was paid once.';}else{
  if(!s.rpg.trainedTechniques.includes(p.id))s.rpg.trainedTechniques.push(p.id);outcome=`You learned ${advancedTechnique(p.id).name} through three actual training days and a 12-gold fee.`;}
 }else if(p.kind==='regional'){
  const a=s.rpg.arcs.find(a=>a.id===p.id),c=p.details.choice;outcome=fill(s,c.outcome,a.cast,a.locationId,a.faithId);reward=c.reward||0;
  a.choices.push({id:c.id,label:c.label,outcome,day:s.day,days:p.totalDays,cost:p.cost,reward});a.chapter++;a.nextDay=s.day+28;if(a.chapter===5)a.status='completed';
  if(c.effect&&c.effect!=='none')addRpgService(s,{kind:c.effect,rule:c.id==='scheme'?'controlled':c.id==='trade'?'priced':'shared',locationId:a.locationId,ownerId:a.cast.speaker.id,source:a.id+'-'+(a.chapter-1)});
  if(c.id==='scheme'){ctx.breakOath?.('You coerced households during '+REGIONAL_STORIES_V27.find(d=>d.id===a.id).title+'.');ctx.standing?.('villagers',-4);}
  else if(c.id==='aid')ctx.standing?.('villagers',3);
  s.world.changes.push({id:'rpg-'+a.id+'-'+a.chapter,day:s.day,locationId:a.locationId,title:REGIONAL_STORIES_V27.find(d=>d.id===a.id).title,text:outcome});s.world.changes=s.world.changes.slice(-500);
 }else if(p.kind==='companion'){
  const c=s.companions.find(c=>c.id===p.id),a=s.rpg.companionStages[p.id];if(!c||c.alive===false){note(s,ctx,'An unfinished shared decision','The named companion died before completion. Their earlier account remains; no new reward or service was created.');return;}
  const row=COMPANION_DIALOGUE_V27[p.id][a.stage],index={care:2,trade:3,scheme:4}[p.choice];outcome=fill(s,row[index],{companion:c});reward=p.choice==='trade'?15:p.choice==='scheme'?25:0;
  a.trust=clamp(a.trust+(p.choice==='care'?12:p.choice==='trade'?3:-18));a.respect=clamp(a.respect+(p.choice==='care'?4:p.choice==='trade'?8:-5));a.fear=clamp(a.fear+(p.choice==='scheme'?16:-3));c.relationship=clamp(c.relationship+(p.choice==='care'?10:p.choice==='trade'?3:-12),-100,100);
  c.memories.push(outcome);c.memories=c.memories.slice(-30);a.choices.push({id:p.choice,day:s.day,outcome});a.stage++;a.nextStoryDay=s.day+90;
  if(p.choice==='scheme')ctx.breakOath?.('You used '+c.name+'’s private need as leverage.');
  if([3,5].includes(a.stage)&&p.choice!=='scheme'){const kind={mira:'shelter',orrin:'school',kest:'route',sable:'clinic',tovin:'workshop',vesper:'school'}[p.id];addRpgService(s,{kind,rule:p.choice==='trade'?'priced':'shared',ownerId:c.id,source:'companion-'+c.id+'-'+a.stage});const t=TECHNIQUES_V27.filter(t=>t.classId===companionClasses[c.id])[a.stage===3?0:1];a.trainedTechniques||=[];if(t&&!a.trainedTechniques.includes(t.id))a.trainedTechniques.push(t.id);}
  if(a.stage===5&&p.choice==='scheme'||a.trust<10&&a.fear>=48){a.status='departed';c.active=false;c.recruited=false;outcome+=' Their departure is actual; they are no longer available for your party.';}
 }else if(p.kind==='faction'){
  const a=s.rpg.factions.find(a=>a.id===p.id),d=RPG_FACTIONS_V27.find(d=>d.id===p.id);reward=p.choice==='trade'?20:p.choice==='scheme'?32:0;outcome=d.missions[a.rank]+' '+(p.choice==='care'?'You spent time and supplies supporting the affected households.':p.choice==='trade'?'You completed a limited paid agreement and recorded its terms.':'You used the private account to take control; the witnesses keep their own copy.');a.rank++;a.nextDay=s.day+28;a.choices.push({id:p.choice,day:s.day,outcome});s.hero.skills[d.skill]=Math.min(10000,s.hero.skills[d.skill]+1);
  if(p.choice==='scheme'){ctx.breakOath?.('You coerced a faction’s living petitioners.');if(d.id==='quiet_table'&&!regionAt(s)?.law.contrabandAllowed)ctx.addEvidence?.(1,'A local courier witnessed the prohibited contraband exchange.');}
  if(a.rank===3)addRpgService(s,{kind:d.id==='quiet_table'?'smuggling':d.id==='ash_company'?'war_relief':d.id==='unbound_archive'?'school':d.id==='salt_ledger'?'market':d.id==='rootward_circle'?'route':'shelter',rule:p.choice==='scheme'?'controlled':p.choice==='trade'?'priced':'shared',ownerId:'faction-'+d.id,source:'faction-'+d.id});
 }else if(p.kind==='property'){resolveBossApproach(s,p,ctx);return;
 }
 s.hero.gold+=reward;if(p.details?.choice?.narrativeFlavor===STORY_FLAVOR){const service=s.rpg.services.find(v=>v.source===p.id+'-0');outcome+=` ${p.totalDays} actual days completed; ${p.cost} gold fee paid. Local standing ${s.factions.villagers-standingBefore>=0?'+':''}${s.factions.villagers-standingBefore}.`+(service?` A ${service.rule} ${service.kind} service is recorded at the crossing.`:'');}note(s,ctx,p.details?.choice?.narrativeFlavor===STORY_FLAVOR?'The Flooded Causeway · A Light Too Low':'A decision becomes part of the world',outcome+(reward?` ${reward} gold actually changed hands.`:''),p.details?.choice?.narrativeFlavor===STORY_FLAVOR?{narrativeEdition:30}:{});
}
const signatureNames={rainward:'The Sluice of Shut Gates',saltreach:'The Unmoored Banquet',highstone:'The Furnace of Unfinished Kin',blackgrove:'The Orchard of Empty Nests',ashplain:'The Crown beneath the Barracks',bellwater:'The House below the Bell'};
export const RPG_DUNGEONS_V27=[...Object.entries(signatureNames).map(([regionId,title])=>({id:'signature_'+regionId,title,regionId,signature:true})),...Array.from({length:12},(_,i)=>({id:'modular_'+i,title:['Abandoned salt stores','The unclaimed watchroom','The root-choked cellar','A flooded counting house','The broken kiln','The quiet crypt'][i%6]+(i>=6?' · deeper passage':''),regionId:RPG_FACTIONS_V27[i%6].regionId,signature:false}))];
export function rpgActions(s){
 if(!ready(s))return [];
 if(s.rpg.project)return [offer('rpg_continue','Keep the time you agreed',`${s.rpg.project.remainingDays} actual days remain. Paid fees are not charged again.`,0,0,s.rpg.project.kind==='faction-objective'?factionObjectiveProjectReason(s,s.rpg.project):null),offer('rpg_cancel','Withdraw from this work','Keep time and fees already spent. Receive no unfinished reward.',0,0)];
 const result=[...intrigueActions(s,{settled:settled(s)})];
 if(s.rpg.rosterVersion!==1)result.push(offer('rpg_expand_circle','Meet new paths around the hearth','Introduce three actual companions with separate lives, portraits and five-part stories.',0,0));
 for(const d of REGIONAL_STORIES_V27){const a=s.rpg.arcs.find(a=>a.id===d.id),p=regionalAnchor(s,d.regionId);if(!p||a?.status==='completed'||a?.status==='abandoned')continue;
  if(a&&!openSite(s,a.locationId)&&p.id===s.locationId)result.push(offer('rpg_relocate_'+d.id,'Follow the displaced story to '+p.name,'The same accounts and decisions move to a surviving refuge. No old reward repeats.',0,0));
  if((a?.locationId||p.id)===s.locationId)result.push(offer('rpg_regional_'+d.id,(a?'Continue ':'')+d.title,d.summary,0,0,a&&s.day<a.nextDay?'The next chapter returns on day '+a.nextDay+'.':null));
 }
 for(const p of s.companions){const a=s.rpg.companionStages[p.id];if(!a||p.alive===false||a.status==='departed')continue;
  if(!p.recruited&&a.status==='available'&&a.locationId===s.locationId)result.push(offer('rpg_meet_'+p.id,'Invite '+p.name+' to your circle',p.goal+' Joins reserves; no active slot is taken. '+s.companions.filter(c=>c.active&&c.alive!==false).length+'/3 companion slots are active. Open Party to choose who travels.',0,0));
  if(p.recruited&&a.stage<5&&(p.active||a.locationId===s.locationId))result.push(offer('rpg_companion_'+p.id,`${p.name}: ${COMPANION_DIALOGUE_V27[p.id][a.stage][0]}`,'A distinct personal chapter. Trust, respect, fear, earned abilities and actual departure remain.',0,0,a.status==='away'?'They are away until day '+a.awayUntil+'.':s.day<a.nextStoryDay?'The next account returns on day '+a.nextStoryDay+'.':null));
 }
 if(openStoryBoard(s))for(const d of RPG_FACTIONS_V27.filter(d=>d.regionId===regionAt(s)?.id)){
  const a=s.rpg.factions.find(a=>a.id===d.id);if(!a)result.push(offer('rpg_join_'+d.id,'Hear '+d.name,d.description,0,0));else if(a.rank<3&&(a.rank>0||!a.firstMission))result.push(offer('rpg_faction_'+d.id,d.name+' · agreement '+(a.rank+1),d.missions[a.rank],0,0,s.day<a.nextDay?'Return on day '+a.nextDay+'.':null));
 }
 for(const t of TECHNIQUES_V27.filter(t=>(s.progression?.learnedClassIds||[]).includes(t.classId)&&s.hero.skills[t.skill]<t.min&&s.progression.mentors[t.classId]?.met&&s.progression.mentors[t.classId].locationId===s.locationId))result.push(offer('rpg_practice_'+t.id,'Practice '+t.skill+' with '+s.progression.mentors[t.classId].name,'Three actual days and 6 gold develop the skill needed for '+t.name+'.',3,6,s.hero.gold<6?'Requires 6 gold.':null));
 if(openStoryBoard(s)){const needs=[...new Set(TECHNIQUES_V27.filter(t=>(s.progression?.learnedClassIds||[]).includes(t.classId)&&!s.rpg.trainedTechniques.includes(t.id)&&s.hero.skills[t.skill]<t.min).map(t=>t.skill))];for(const skill of needs)result.push(offer('rpg_practice_'+skill,'Practice '+skill+' for advanced techniques','Three attended days and three gold improve this actual skill by one. An earned calling must already require this practice.',3,3,s.hero.gold<3?'Requires 3 gold.':null));}
 if(openStoryBoard(s)||Object.values(s.progression?.mentors||{}).some(m=>m.met&&m.locationId===s.locationId))for(const t of TECHNIQUES_V27.filter(t=>(s.progression?.learnedClassIds||[]).includes(t.classId)&&!s.rpg.trainedTechniques.includes(t.id)))result.push(offer('rpg_train_'+t.id,'Learn '+t.name,t.description+' Three attended days and 12 gold; requires '+t.skill+' '+t.min+'.',3,12,s.hero.skills[t.skill]<t.min?'Requires '+t.skill+' '+t.min+'.':s.hero.gold<12?'Requires 12 gold.':null));
 if(openStoryBoard(s))for(const d of RPG_DUNGEONS_V27.filter(d=>d.regionId===regionAt(s)?.id))result.push(offer('rpg_enter_'+d.id,'Explore '+d.title,'Spend one day entering a large saved maze. Each block is a room; find the objective and a real return stair.',1,0,s.hero.hp<12?'Recover to at least 12 health.':null));
 result.push(...firstMissionActions(s),...serviceActions(s),...propertyActions(s));return result;
}
export function applyRpgAction(s,id,ctx={}){
 const a=rpgActions(s).find(a=>a.id===id);if(!a||a.disabledReason)return false;
 if(id.startsWith('rpg_objective_'))return beginFirstMissionStep(s,id,ctx,{startProject:(...args)=>startProject(s,...args),note});
 if(id.startsWith('rpg_intrigue_'))return openIntrigue(s,ctx,{settled:settled(s),makeContact:(key,role)=>contact(s,key+'-'+(s.dynasty?.generation||1),regionAt(s).id,role,s.locationId)});
 if(id==='rpg_continue')return attend(s,ctx);
 if(id==='rpg_cancel'){const p=s.rpg.project;note(s,ctx,'A commitment withdrawn',`${p.completedDays} days and ${p.paid?p.cost:0} gold remain spent.${p.kind==='faction-objective'&&p.details.materialsSpent?' Consumed materials remain spent; restarting this step needs fresh supplies.':''} No unfinished ${p.kind} reward was received.`);s.rpg.project=null;return true;}
 if(id==='rpg_expand_circle'){addCircle(s,ctx);initializeRpg(s);return true;}
 if(id.startsWith('rpg_relocate_')){const a=s.rpg.arcs.find(a=>a.id===id.slice(13)),d=REGIONAL_STORIES_V27.find(d=>d.id===a.id);a.locationId=regionalAnchor(s,d.regionId).id;for(const p of Object.values(a.cast)){const live=s.rpg.contacts.find(c=>c.id===p.id);if(live&&live.alive!==false)live.locationId=a.locationId;}note(s,ctx,'An account carried to a surviving hearth','Earlier choices, injuries and claims remain. The displaced participants use the real refuge at '+s.world.locations.find(p=>p.id===a.locationId).name+'.');return true;}
 if(id.startsWith('rpg_regional_'))return openRegional(s,REGIONAL_STORIES_V27.find(d=>d.id===id.slice(13)),ctx);
 if(id.startsWith('rpg_meet_')){const p=s.companions.find(p=>p.id===id.slice(9));p.recruited=true;p.active=false;note(s,ctx,'A companion by agreement',p.name+' joins your circle in reserve ('+s.companions.filter(c=>c.active&&c.alive!==false).length+'/3 active companion slots). Open Party to choose who travels. Their own life remains theirs.');return true;}
 if(id.startsWith('rpg_companion_'))return openCompanion(s,s.companions.find(p=>p.id===id.slice(14)),ctx);
 if(id.startsWith('rpg_join_')){const d=RPG_FACTIONS_V27.find(d=>d.id===id.slice(9));s.rpg.factions.push({id:d.id,rank:0,joinedDay:s.day,nextDay:s.day,choices:[]});note(s,ctx,'A faction heard',d.description+' Hearing its first account does not bind your moral path.');return true;}
 if(id.startsWith('rpg_faction_'))return openFaction(s,RPG_FACTIONS_V27.find(d=>d.id===id.slice(12)),ctx);
 if(id.startsWith('rpg_practice_')){const key=id.slice(13),skill=advancedTechnique(key)?.skill||key;return startProject(s,'training',skill,'practice',3,a.cost,{},ctx);}
 if(id.startsWith('rpg_train_'))return startProject(s,'training',id.slice(10),'learn',3,12,{},ctx);
 if(id.startsWith('rpg_service_')){const v=s.rpg.services.find(v=>v.id===id.slice(12)),old=s.day,taken=ctx.spendDays(1);if(taken!==1||s.day-old!==1||s.phase==='retired')return true;s.hero.gold-=a.cost;v.lastUsedDay=s.day;if(['shelter','clinic'].includes(v.kind))s.hero.hp=Math.min(s.hero.maxHp,s.hero.hp+15);else if(v.kind==='route')s.adventuring.rations=Math.min(10000,s.adventuring.rations+2);else{s.hero.skills[serviceSkill[v.kind]||'survival']=Math.min(10000,s.hero.skills[serviceSkill[v.kind]||'survival']+1);}note(s,ctx,'A story’s service remains usable',`One real day${a.cost?' and '+a.cost+' gold':''} at the ${v.rule} ${v.kind}.`);return true;}
 if(id.startsWith('rpg_property_'))return applyPropertyAction(s,id,ctx,{startProject});
 return false;
}
export function applyRpgChoice(s,eventId,id,ctx={}){
 if(eventId==='rpg_intrigue')return applyIntrigueChoice(s,id,ctx,{startProject:(...args)=>startProject(s,...args)});
 const p=s.rpg?.pending;if(!p||!rpgEventIds()[eventId]?.includes(id)||rpgChoiceReason(s,id))return false;
 if(p.objectiveDecision)return applyFirstMissionConclusion(s,id,ctx,{note});
 if(id==='leave'){s.rpg.pending=null;return true;}
 if(p.firstOffer){s.rpg.pending=null;return acceptFirstMission(s,RPG_FACTIONS_V27.find(d=>d.id===p.id),id.slice(7),ctx,{makeContact:(...args)=>contact(s,...args),note});}
 s.rpg.pending=null;
 if(p.kind==='regional'){const c=REGIONAL_STORIES_V27.find(d=>d.id===p.id).chapters[p.chapter].choices.find(c=>c.id===id);return startProject(s,'regional',p.id,id,c.days,c.cost,{choice:{...c,...(p.narrativeFlavor===STORY_FLAVOR?{narrativeFlavor:STORY_FLAVOR}:{})}},ctx);}
 return startProject(s,p.kind,p.id,id,id==='care'?3:2,id==='care'?8:0,{},ctx);
}
export function rpgEventIds(){return {rpg_intrigue:intrigueChoiceIds,rpg_regional:['aid','trade','scheme','investigate','fight','ritual','leave'],rpg_companion:['care','trade','scheme','leave'],rpg_faction:['care','trade','scheme','leave',...firstMissionChoiceIds]};}
export function afterRpgBattle(s,b,ctx={}){
 if(b.context?.kind!=='rpg')return false;
 if(b.context.pursuitId)return afterPropertyBattle(s,b,ctx);
 return false;
}
export function validRpgBattleContext(s,c){
 if(c.pursuitId)return !!s.rpg?.propertyBattle&&s.rpg.propertyBattle.propertyId===c.pursuitId&&c.locationId===s.locationId;
 return false;
}
export function rpgContacts(s){return [...(s.rpg?.contacts||[]),...(s.rpg?.bosses||[]).flatMap(b=>!b.mazeDiscovery||b.mazeDiscovery.discoveredDay!==null?b.people||[]:[])].filter(p=>p.alive!==false).map(p=>({...p,roomId:firstMissionContactRoom(s,p),minAge:16,kind:'extra',available:p.alive!==false&&p.available!==false&&!p.retired,bond:p.bond||35,description:p.character?.detail||'A living participant in a saved regional account.',source:p}));}
export function onRpgTime(s,{oldDay,newDay},ctx={}){
 if(!s.rpg)return;
 for(const p of [...s.rpg.contacts,...s.rpg.bosses.flatMap(b=>b.people||[])]){p.age=Math.max(0,Math.floor(((p.alive===false&&Number.isInteger(p.deathDay)?p.deathDay:newDay)-p.bornDay)/365));if(p.alive!==false&&p.age>=p.deathAge){p.alive=false;p.deathDay=newDay;}if(p.alive!==false&&!openSite(s,p.locationId)){const refuge=regionalAnchor(s,p.regionId);if(refuge){p.locationId=refuge.id;p.memories.push('The old location closed; I moved to the surviving '+refuge.name+'.');p.memories=p.memories.slice(-30);}}}
 for(const p of s.companions){const a=s.rpg.companionStages[p.id];if(!a)continue;if(p.alive===false){a.status='dead';p.active=false;}else if(a.status==='away'&&newDay>=a.awayUntil){a.status='available';a.awayUntil=null;}else if(p.recruited&&!p.active&&a.status==='available'&&newDay-oldDay>=14&&Math.floor(newDay/92)!==Math.floor(oldDay/92)){a.status='away';a.awayUntil=newDay+28;a.history.push({day:newDay,text:'Away attending independent work for 28 days.'});a.history=a.history.slice(-20);}}
 for(const w of s.realm.wars)if(!s.rpg.warAccounts.some(a=>a.warId===w.id))s.rpg.warAccounts.push({warId:w.id,startedDay:w.startDay,cause:w.grievance||'The rulers disputed the road and its recorded claims.',terms:w.terms||'The existing public war terms apply.'});
 s.rpg.warAccounts=s.rpg.warAccounts.slice(-40);
}
export function recordCurseSurvivor(s,id,text){if(!s.rpg||!id)return;const p=[...(s.life?.people||[]),...(s.society?.people||[]),...s.companions].find(p=>p.id===id&&p.alive!==false);if(p&&!s.rpg.curseSurvivors.some(p=>p.personId===id))s.rpg.curseSurvivors.push({personId:id,name:p.name,day:s.day,locationId:p.locationId||s.locationId,text});s.rpg.curseSurvivors=s.rpg.curseSurvivors.slice(-60);}
export function inheritRpg(s,parent){
 if(!parent.rpg||!s.rpg)return;
 s.rpg.services=structuredClone(parent.rpg.services);s.rpg.warAccounts=structuredClone(parent.rpg.warAccounts);s.rpg.contacts=structuredClone(parent.rpg.contacts);s.rpg.contactArchive=structuredClone(parent.rpg.contactArchive);s.rpg.bosses=structuredClone(parent.rpg.bosses);s.rpg.properties=structuredClone(parent.rpg.properties.filter(p=>!p.soldDay&&!p.returnedDay));
 // New maze people retain their own history, not an inherited personal bond or
 // testimony permission. Legacy regional ledgers follow their frozen old path.
 for(const b of s.rpg.bosses)if(b.mazeDiscovery)for(const p of b.people){
  const prior=parent.dynasty?.activePersonId||'hero',current=s.dynasty?.activePersonId||'hero';
  p.memoriesByPerson={...p.memoriesByPerson,[prior]:structuredClone(p.memories||[])};
  p.knownFactsByPerson={...p.knownFactsByPerson,[prior]:structuredClone(p.knownFacts||[])};
  p.knownBondsByPerson={...p.knownBondsByPerson,[prior]:p.bond??35};
  p.memories=structuredClone(p.memoriesByPerson[current]||[]);p.knownFacts=structuredClone(p.knownFactsByPerson[current]||[]);p.bond=p.knownBondsByPerson[current]??35;
 }
 for(const a of parent.rpg.arcs)if(a.status==='active')s.rpg.inheritedAccounts.push({id:a.id,author:parent.hero.name,day:parent.day,text:a.choices.at(-1)?.outcome||'An unfinished public regional account.',locationId:a.locationId});
 s.rpg.inheritedAccounts=s.rpg.inheritedAccounts.slice(-40);s.rpg.expeditions=[];
 for(const p of s.rpg.properties)p.ownerId=s.dynasty?.activePersonId||'hero';
}
export function rpgView(s){return s.rpg?{...s.rpg,actions:rpgActions(s),dungeons:RPG_DUNGEONS_V27,techniques:TECHNIQUES_V27,companions:s.companions.map(p=>({...p,...s.rpg.companionStages[p.id]})),factionCatalog:RPG_FACTIONS_V27,arcs:s.rpg.arcs.map(a=>({...a,title:REGIONAL_STORIES_V27.find(d=>d.id===a.id)?.title}))}:null;}
export function validateRpg(v,s){
 if(v===undefined)return true;
 const int=(n,min=0,max=10000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max,str=(v,max=2000)=>typeof v==='string'&&v.length<=max,obj=v=>v&&typeof v==='object'&&!Array.isArray(v),site=id=>s.world.locations.some(p=>p.id===id);
 if(!obj(v)||v.version!==1||![0,1].includes(v.rosterVersion)||!obj(v.companionStages))return false;
 if(!Array.isArray(v.contacts)||v.contacts.length>128||!Array.isArray(v.contactArchive)||v.contactArchive.length>512||!v.contacts.every(p=>str(p.id,160)&&str(p.name,120)&&int(p.bornDay,-10000000,s.day)&&int(p.age,0,5000)&&typeof p.alive==='boolean'&&site(p.locationId)&&isCanonicalAppearance(p.appearance)))return false;
 if(!Array.isArray(v.arcs)||v.arcs.length>6||new Set(v.arcs.map(a=>a.id)).size!==v.arcs.length||!v.arcs.every(a=>REGIONAL_STORIES_V27.some(d=>d.id===a.id)&&site(a.locationId)&&FAITHS.some(f=>f.id===a.faithId)&&obj(a.cast)&&int(a.chapter,0,5)&&['active','completed','abandoned'].includes(a.status)&&int(a.nextDay,0)&&Array.isArray(a.choices)&&a.choices.length===a.chapter&&a.choices.every(c=>str(c.id,40)&&str(c.outcome)&&int(c.day,0,s.day))&&(!(a.status==='completed')||a.chapter===5)))return false;
 if(!s.companions.every(p=>{const a=v.companionStages[p.id];return obj(a)&&a.id===p.id&&[a.trust,a.respect,a.fear].every(n=>Number.isFinite(n)&&n>=0&&n<=100)&&int(a.stage,0,5)&&site(a.locationId)&&['available','away','departed','dead'].includes(a.status)&&Array.isArray(a.choices)&&a.choices.length===a.stage&&(a.awayUntil===null||int(a.awayUntil,0))&&int(a.nextStoryDay)&&(!a.trainedTechniques||a.trainedTechniques.every(id=>advancedTechnique(id)));}))return false;
 if(!Array.isArray(v.factions)||v.factions.length>6||new Set(v.factions.map(a=>a.id)).size!==v.factions.length||!v.factions.every(a=>RPG_FACTIONS_V27.some(d=>d.id===a.id)&&int(a.rank,0,3)&&int(a.joinedDay,0,s.day)&&int(a.nextDay)&&Array.isArray(a.choices)&&a.choices.length===a.rank&&validateFactionFirstMission(a.firstMission,a,s)))return false;
 if(!Array.isArray(v.services)||v.services.length>512||!v.services.every(v=>str(v.id,180)&&site(v.locationId)&&['shelter','workshop','clinic','market','school','ward','smuggling','blackmail','ritual','war_relief','claim','route'].includes(v.kind)&&['shared','priced','controlled'].includes(v.rule)&&int(v.day,0,s.day)&&(v.lastUsedDay===null||int(v.lastUsedDay,0,s.day))))return false;
 if(!Array.isArray(v.trainedTechniques)||v.trainedTechniques.length>24||new Set(v.trainedTechniques).size!==v.trainedTechniques.length||!v.trainedTechniques.every(id=>advancedTechnique(id)))return false;
 if(v.project!==null){const p=v.project;if(!obj(p)||!['practice','training','regional','companion','faction','property','intrigue','faction-objective','maze'].includes(p.kind)||!str(p.id,160)||!str(p.choice,160)||!int(p.totalDays,1,30)||!int(p.remainingDays,1,p.totalDays)||!int(p.completedDays,0,p.totalDays)||p.remainingDays+p.completedDays!==p.totalDays||!int(p.cost,0,500)||typeof p.paid!=='boolean'||!site(p.locationId)||!obj(p.details)||!int(p.startedDay,0,s.day)||p.kind==='faction-objective'&&!validateFactionObjectiveProject(s,p))return false;}
 if(v.pending!==null){const p=v.pending;if(!obj(p)||!['regional','companion','faction'].includes(p.kind)||!str(p.id,160)||!int(p.chapter,0,4)||!site(p.locationId)||s.event?.id!=='rpg_'+p.kind||v.project)return false;if(p.firstOffer!==undefined&&(p.firstOffer!==true||p.kind!=='faction'||p.chapter!==0||!v.factions.some(f=>f.id===p.id&&f.rank===0&&!f.firstMission)||!s.event.choices.every(c=>c.id==='leave'||FIRST_MISSION_METHODS[p.id]?.some(method=>c.id==='accept_'+method))))return false;if(p.objectiveDecision!==undefined&&(p.kind!=='faction'||p.chapter!==0||!v.factions.some(f=>f.id===p.id&&f.firstMission?.status==='active'&&f.firstMission.decisionStep===p.objectiveDecision)||!s.event.choices.every(c=>['conclude_correct','conclude_wrong','leave'].includes(c.id))))return false;}
 const dungeon=x=>obj(x)&&x.version===2&&RPG_DUNGEONS_V27.some(d=>d.id===x.id)&&site(x.locationId)&&Array.isArray(x.rooms)&&x.rooms.length>=6&&x.rooms.length<=7&&new Set(x.rooms.map(r=>r.id)).size===x.rooms.length&&x.rooms.some(r=>r.id===x.roomId)&&x.rooms.every(r=>str(r.id,40)&&typeof r.resolved==='boolean'&&typeof r.visited==='boolean'&&Array.isArray(r.neighbors)&&r.neighbors.every(id=>x.rooms.some(n=>n.id===id&&n.neighbors.includes(r.id))))&&obj(x.facts)&&(x.pendingRoom===null||x.rooms.some(r=>r.id===x.pendingRoom));
 if(!Array.isArray(v.expeditions)||v.expeditions.length>18||!v.expeditions.every(dungeon)||v.expedition!==null)return false; // no older regional walk is held now (v0.72.4); its records stay
 if(!Array.isArray(v.history)||v.history.length>180||!v.history.every(h=>int(h.day,0,s.day)&&str(h.title)&&str(h.text)&&site(h.locationId)))return false;
 if(!Array.isArray(v.curseSurvivors)||v.curseSurvivors.length>60||!Array.isArray(v.warAccounts)||v.warAccounts.length>40||!Array.isArray(v.inheritedAccounts)||v.inheritedAccounts.length>40)return false;
 return validateBossStories(s)&&validateIntrigue(s);
}
