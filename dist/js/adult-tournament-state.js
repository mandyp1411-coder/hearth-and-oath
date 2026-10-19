import { localTournamentLocked } from './local-project-ownership.js';
import {heldSettlement,deploymentFor} from './regional-world-v33.js';
import {REGION_TEMPLATES} from './realm-content-v18.js';
import {seededRoll} from './world.js';
import {isCanonicalAppearance} from './avatar.js';
import {HUMAN_DUEL_PROFILE_IDS,humanDuelProfile,validHumanDuelPlan,prohibitedDuelState,TOURNAMENT_PURSE} from './tournament-duel-rules.js';
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const safe=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,79}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
const str=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n;
const int=(x,a=0,b=10000000)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
const keys=(x,allowed)=>plain(x)&&Object.keys(x).every(k=>allowed.includes(k));
export const tournamentOwner=s=>s.dynasty?.activePersonId;
export const tournamentLocked=localTournamentLocked;
const salt=(owner,site)=>`watchhouse-v1:${owner}:${site}`;
export function tournamentProfileOrder(seed,owner,site){return [...HUMAN_DUEL_PROFILE_IDS].sort((a,b)=>seededRoll(seed,salt(owner,site)+':style:'+a,1000000000)-seededRoll(seed,salt(owner,site)+':style:'+b,1000000000)||a.localeCompare(b));}
export function selectTournamentEntrants(s,candidates){const owner=tournamentOwner(s);return [...candidates].sort((a,b)=>seededRoll(s.seed,salt(owner,s.locationId)+':entrant:'+a.id,1000000000)-seededRoll(s.seed,salt(owner,s.locationId)+':entrant:'+b.id,1000000000)||a.id.localeCompare(b.id)).slice(0,3);}
function snapshot(p,roomId=p.roomId){return {id:p.id,name:p.name,role:p.role,age:p.age,locationId:p.locationId,roomId,...(p.appearance?{appearance:structuredClone(p.appearance)}:{}),...(p.pronouns?{pronouns:p.pronouns}:{})};}
export function makeTournamentOffer(s,host,candidates,jurisdiction){
 if(!str(tournamentOwner(s),160)||candidates.length<3)return null;
 const people=selectTournamentEntrants(s,candidates),styles=tournamentProfileOrder(s.seed,tournamentOwner(s),s.locationId);
 return {version:1,rulesVersion:1,id:'watchhouse-'+seededRoll(s.seed,salt(tournamentOwner(s),s.locationId),1000000000),ownerId:tournamentOwner(s),locationId:s.locationId,jurisdiction:structuredClone(jurisdiction),difficulty:s.difficulty||'balanced',host:{...snapshot(host,'watch'),ageDay:s.day},opponents:people.map((p,i)=>({...snapshot(p),ageDay:s.day,profileId:styles[i]})),offeredDay:s.day,acceptedDay:null,paidDays:0,stage:'offered',pending:null,battleId:null,results:[],finishedDay:null,endReason:null,prize:null,recognition:null};
}
export function tournamentScore(t){return {wins:t.results.filter(r=>r.outcome==='win').length,losses:t.results.filter(r=>r.outcome==='loss').length,played:t.results.length};}
export function selectedRival(t){const index=t.results.findIndex(r=>r.outcome==='loss');return t.results.length?{boutIndex:index<0?t.results.length-1:index,personId:t.results[index<0?t.results.length-1:index].opponentId}:null;}
export function finishTournament(t,day,reason){
 if(t.stage==='finished')return 0;
 t.stage='finished';t.pending=null;t.battleId=null;t.finishedDay=day;t.endReason=reason;t.recognition=selectedRival(t);if(t.recognition)t.recognition={...t.recognition,consumedDay:null,replyId:null};
 if(reason==='completed'&&t.results.length===3&&t.results.every(r=>r.outcome==='win')&&!t.prize){t.prize={key:t.id+':purse',amount:TOURNAMENT_PURSE,day};return TOURNAMENT_PURSE;}return 0;
}
export function tournamentContext(s){const t=s.adultTournament;return {kind:'tournament',cardId:t.id,ownerId:t.ownerId,locationId:t.locationId,hostId:t.host.id,opponentId:t.opponents[t.results.length].id,boutId:'bout-'+(t.results.length+1)};}
function publicEntrantPresent(s,p){const r=s.npcContinuity?.people?.[p.id],life=s.life?.people?.find(x=>x.id===p.id),family=s.family?.members?.find(x=>x.personId===p.id);return !!r&&r.retiredDay===null&&r.retireDay>s.day&&life?.alive!==false&&life?.hp!==0&&(!family||family.availability==='present')&&!deploymentFor(s,p.id);}
export function validTournamentContext(s,c){
 const t=s.adultTournament;
 return !!t&&Array.isArray(t.opponents)&&t.opponents.length===3&&Array.isArray(t.results)&&t.results.length<3&&!!t.host&&t.stage==='bout'&&t.paidDays===1&&t.ownerId===tournamentOwner(s)&&s.phase!=='retired'&&s.age>=18&&s.locationId===t.locationId&&s.cartography?.interior?.siteId===t.locationId&&s.cartography.interior.roomId==='watch'&&!s.justice?.prison&&!s.justice?.arrest&&!s.event&&!s.conversations?.pending&&!s.cartography?.offsite&&!s.cartography?.pending&&!s.timeline?.journey&&keys(c,['kind','cardId','ownerId','locationId','hostId','opponentId','boutId'])&&JSON.stringify(c)===JSON.stringify(tournamentContext(s))&&publicEntrantPresent(s,t.host)&&publicEntrantPresent(s,t.opponents[t.results.length])&&s.npcContinuity.slots[s.npcContinuity.people[t.host.id].slotKey]?.personId===t.host.id&&s.realm?.sites?.[t.locationId]?.regionId===t.jurisdiction.regionId&&!heldSettlement(s,t.locationId)&&!['destroyed','evacuated'].includes(s.world.locations.find(p=>p.id===t.locationId)?.status)&&s.world.locations.find(p=>p.id===t.locationId)?.servicesAvailable!==false&&!(s.legal?.incidents||[]).some(x=>x.locationId===t.locationId&&x.evidence>=3);
}
export function validTournamentBattle(s,b){
 const t=s.adultTournament;if(!validTournamentContext(s,b?.context)||b.tournamentRulesVersion!==1||b.encounterId!=='watchhouse_duel'||b.instanceId!==t.battleId||!Array.isArray(b.actors)||b.actors.length!==2||prohibitedDuelState(b)||b.rewards?.gold!==0||b.rewards?.exp!==0||b.potions+b.potionsUsed!==s.hero.potions)return false;
 if(b.startingHeroHp!==s.hero.hp||b.rulesVersion!==18||b.effectsVersion!==27||b.balanceVersion!==21||b.tacticsVersion!==25)return false;
 const hero=b.actors.find(a=>a.id==='hero'&&a.side==='party'),enemy=b.actors.find(a=>a.id==='enemy-1'&&a.side==='enemy'),p=t.opponents[t.results.length];
 return !!hero&&!!enemy&&hero.hp>=0&&hero.mp>=0&&validHumanDuelPlan(enemy)&&enemy.duelPlanId===p.profileId&&enemy.duelDifficulty===t.difficulty&&enemy.sourcePersonId===p.id&&enemy.name===p.name&&enemy.namedTarget===true&&enemy.illustration?.kind==='person'&&enemy.illustration.age===p.age&&JSON.stringify(enemy.illustration.appearance)===JSON.stringify(p.appearance)&&hero.trainedTechniques?.every(id=>typeof id==='string')!==false;
}
const snapshotKeys=['id','name','role','age','ageDay','locationId','roomId','appearance','pronouns'];
function validSnapshot(p,s,{host=false}={}){return keys(p,[...snapshotKeys,...(host?[]:['profileId'])])&&safe(p.id)&&str(p.name,100)&&str(p.role,160)&&int(p.age,18,5000)&&int(p.ageDay,s.adultTournament.offeredDay,s.day)&&p.locationId===s.adultTournament.locationId&&safe(p.roomId)&&(!host||p.roomId==='watch'&&p.role==='Watch Captain')&&isCanonicalAppearance(p.appearance)&&(p.pronouns===undefined||['he/him','she/her','they/them'].includes(p.pronouns));}
function validateTournamentState(s){
 const t=s.adultTournament;if(t===undefined)return !s.event?.id.startsWith('tournament_')&&s.battle?.context?.kind!=='tournament'&&s.battle?.tournamentRulesVersion===undefined;
 if(!keys(t,['version','rulesVersion','id','ownerId','locationId','jurisdiction','difficulty','host','opponents','offeredDay','acceptedDay','paidDays','stage','pending','battleId','results','finishedDay','endReason','prize','recognition'])||t.version!==1||t.rulesVersion!==1||!safe(t.id)||t.id!=='watchhouse-'+seededRoll(s.seed,salt(t.ownerId,t.locationId),1000000000)||t.ownerId!==tournamentOwner(s)||!s.world.locations.some(p=>p.id===t.locationId)||!keys(t.jurisdiction,['regionId','regionName'])||!safe(t.jurisdiction.regionId)||!str(t.jurisdiction.regionName,100)||!REGION_TEMPLATES.some(r=>r.id===t.jurisdiction.regionId&&r.name===t.jurisdiction.regionName)||!['gentle','balanced','perilous'].includes(t.difficulty)||!validSnapshot(t.host,s,{host:true})||!Array.isArray(t.opponents)||t.opponents.length!==3||!t.opponents.every(p=>validSnapshot(p,s))||new Set([t.host.id,...t.opponents.map(p=>p.id)]).size!==4||!int(t.offeredDay,0,s.day)||!(t.acceptedDay===null||int(t.acceptedDay,t.offeredDay,s.day))||![0,1].includes(t.paidDays)||!['offered','preparing','ready','paused','bout','finished'].includes(t.stage)||![null,'invitation'].includes(t.pending)||!Array.isArray(t.results)||t.results.length>3)return false;
 if(t.stage!=='finished'&&(s.phase==='retired'||s.age<18)||['preparing','ready','bout'].includes(t.stage)&&(s.justice?.prison||s.justice?.arrest||s.locationId!==t.locationId))return false;
 const order=tournamentProfileOrder(s.seed,t.ownerId,t.locationId);if(t.opponents.some((p,i)=>p.profileId!==order[i]))return false;
 // Entrants are real public identities, never a generated encounter-only roster.
 for(const [p,kind]of [[t.host,'service'],...t.opponents.map(p=>[p,'town'])]){const r=s.npcContinuity?.people?.[p.id],slot=r&&s.npcContinuity.slots[r.slotKey];if(!r||!slot||slot.kind!==kind||slot.siteId!==t.locationId||kind==='service'&&slot.service!=='watch'||r.snapshot.name!==p.name||r.snapshot.role!==p.role||JSON.stringify(r.snapshot.appearance)!==JSON.stringify(p.appearance))return false;const basis=r.ageBasis,age=basis?.kind==='born'?Math.max(0,Math.floor((p.ageDay-basis.bornDay)/365)):basis?.kind==='legacy'?Math.max(0,basis.baseAge+Math.floor(p.ageDay/365)):null;if(p.age!==age)return false;}
 if(t.host.ageDay!==(t.acceptedDay??t.offeredDay))return false;
 for(const [i,p]of t.opponents.entries()){const day=t.results[i]?.day??(t.stage==='bout'&&i===t.results.length?s.day:t.acceptedDay??t.offeredDay);if(p.ageDay!==day)return false;}
 const battleIds=new Set();
 for(const [i,r]of t.results.entries()){
  const p=t.opponents[i],profile=humanDuelProfile(p.profileId,t.difficulty);
  if(!keys(r,['boutIndex','opponentId','profileId','battleId','day','outcome','rounds','heroMaxHp','heroMaxMp','heroStartHp','heroEndHp','heroStartMp','heroEndMp','opponentEndHp','potionsStart','potionsEnd'])||r.boutIndex!==i||r.opponentId!==p.id||r.profileId!==p.profileId||!str(r.battleId,256)||battleIds.has(r.battleId)||!int(r.day,t.acceptedDay??t.offeredDay,s.day)||i&&r.day<t.results[i-1].day||!['win','loss','withdrawn'].includes(r.outcome)||!int(r.rounds,1,1000000)||!int(r.heroMaxHp,1,100000)||!int(r.heroMaxMp,0,100000)||!Number.isFinite(r.heroStartHp)||r.heroStartHp<=0||r.heroStartHp>r.heroMaxHp||!Number.isFinite(r.heroEndHp)||r.heroEndHp<0||r.heroEndHp>r.heroMaxHp||!Number.isFinite(r.heroStartMp)||r.heroStartMp<0||r.heroStartMp>r.heroMaxMp||!Number.isFinite(r.heroEndMp)||r.heroEndMp<0||r.heroEndMp>r.heroMaxMp||!Number.isFinite(r.opponentEndHp)||r.opponentEndHp<0||r.opponentEndHp>profile.hp||!int(r.potionsStart,0,10000)||!int(r.potionsEnd,0,r.potionsStart)||r.outcome==='win'&&(r.opponentEndHp!==0||r.heroEndHp<=0)||r.outcome==='loss'&&r.heroEndHp!==0||r.outcome==='withdrawn'&&(r.heroEndHp<=0||r.opponentEndHp<=0||i!==t.results.length-1))return false;
  battleIds.add(r.battleId);
 }
 if(t.stage==='offered'){if(t.acceptedDay!==null||t.paidDays||t.results.length)return false;}else if(t.acceptedDay===null&&(t.stage!=='finished'||t.paidDays||t.results.length))return false;
 if(['ready','bout'].includes(t.stage)&&t.paidDays!==1||['offered','preparing','ready','paused','bout'].includes(t.stage)&&t.results.length>=3||t.stage==='preparing'&&t.results.length||t.results.some(r=>r.outcome==='withdrawn')&&t.endReason!=='withdrawn')return false;
 if(t.stage==='bout'){if(!str(t.battleId,256)||battleIds.has(t.battleId)||!validTournamentBattle(s,s.battle))return false;}else if(t.battleId!==null||s.battle?.context?.kind==='tournament'||s.battle?.tournamentRulesVersion!==undefined)return false;
 if(t.pending==='invitation'&&(t.stage!=='offered'||s.event?.id!=='tournament_invitation')||s.event?.id.startsWith('tournament_')&&t.pending!=='invitation')return false;
 if(t.stage==='finished'){
  if(!int(t.finishedDay,t.acceptedDay??t.offeredDay,s.day)||!['completed','withdrawn','unavailable','life_closed'].includes(t.endReason)||t.endReason==='completed'&&(t.results.length!==3||t.results.some(r=>r.outcome==='withdrawn'))||t.pending!==null||t.results.some(r=>r.day>t.finishedDay))return false;
  const rival=selectedRival(t),m=t.recognition;if(rival){if(!keys(m,['boutIndex','personId','consumedDay','replyId'])||m.boutIndex!==rival.boutIndex||m.personId!==rival.personId||!(m.consumedDay===null&&m.replyId===null||int(m.consumedDay,t.finishedDay+1,s.day)&&['review','perspective','quiet','leave'].includes(m.replyId)))return false;}else if(m!==null)return false;
 }else if(t.finishedDay!==null||t.endReason!==null||t.prize!==null||t.recognition!==null)return false;
 const earned=t.stage==='finished'&&t.endReason==='completed'&&t.paidDays===1&&t.results.length===3&&t.results.every(r=>r.outcome==='win');
 if(earned){if(!keys(t.prize,['key','amount','day'])||t.prize.key!==t.id+':purse'||t.prize.amount!==TOURNAMENT_PURSE||t.prize.day!==t.finishedDay)return false;}else if(t.prize!==null)return false;
 return true;
}

export function validateAdultTournament(s){try{return validateTournamentState(s);}catch{return false;}}
