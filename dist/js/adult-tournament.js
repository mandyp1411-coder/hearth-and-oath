import { countingTableCommitment } from './local-project-ownership.js';
import {regionAt} from './realm.js';
import {isSettlement} from './world.js';
import {settlementServices} from './world-services.js';
import {residentContacts,rememberResident} from './world-people-v31.js';
import {deploymentFor,heldSettlement} from './regional-world-v33.js';
import {projectNpcPerson} from './npc-continuity.js';
import {DUEL_RULES_TEXT,TOURNAMENT_PURSE,humanDuelProfile} from './tournament-duel-rules.js';
import {makeTournamentOffer,tournamentOwner,tournamentLocked,tournamentScore,tournamentContext,validTournamentBattle,finishTournament} from './adult-tournament-state.js';
export {tournamentLocked};
const room=s=>s.cartography?.interior?.siteId===s.locationId?s.cartography.interior.roomId:'gate';
const site=(s,id=s.locationId)=>s.world.locations.find(p=>p.id===id);
const occupied=s=>s.familyOrigins?.project||countingTableCommitment(s)||s.researchPortfolio?.project||s.repertoire?.project||s.timeline?.journey||s.timeline?.yearTarget!=null||s.careers?.batch||s.workshop?.project||s.health?.recovery||s.stories?.project||s.life?.plan||s.society?.project||s.community?.project?.commitment||s.fellowship?.project||s.sanctuaries?.commitment||s.lineage?.adoption?.preparation||s.pastimes?.project||s.conversations?.project||s.rpg?.project||s.rpg?.expedition||s.adventuring?.expedition||['preparing','bout'].includes(s.yardTournament?.stage);
const row=(id,label,description,days=0,disabledReason=null)=>({id:'tournament_'+id,label,description,days,cost:0,group:'Training',...(disabledReason?{disabledReason}:{})});
const named=(s,p)=>projectNpcPerson(s,p);
function personReason(s,p){
 const life=s.life?.people?.find(x=>x.id===p.id),family=s.family?.members?.find(x=>x.personId===p.id),r=s.npcContinuity?.people?.[p.id],current=named(s,p);
 if(life?.alive===false||current.alive===false)return p.name+' has a recorded death. No replacement can take their result.';
 if(family&&family.availability!=='present'||deploymentFor(s,p.id))return p.name+' is away from this public event.';
 if(current.retired||r?.retiredDay!=null||r&&r.retireDay<=s.day)return p.name+' has left that public role; their later availability is unrecorded.';
 if(current.available===false||current.age<18||life?.hp===0)return p.name+' cannot currently take part.';
 return null;
}
function currentJurisdiction(s){const r=regionAt(s);return r?{regionId:r.id,regionName:r.name}:null;}
export function tournamentEntryReason(s,{ignoreCommitment=false}={}){
 if(s.revision<5||s.age<18||s.phase!=='adult'||s.hero.hp<=0)return 'The local challenge is for living adults of eighteen or older.';
 if(s.event||s.battle||s.conversations?.pending)return 'Finish the waiting moment first.';
 if(s.justice?.prison||s.justice?.arrest)return 'The challenge cannot be entered or resumed in custody.';
 if(s.cartography?.pending||s.cartography?.offsite||s.timeline?.journey||s.dungeon||s.maze||!isSettlement(s.world,s.locationId))return 'Return to the actual settlement before entering.';
 if(occupied(s)&&!ignoreCommitment)return 'Finish the current commitment before entering or resuming the challenge.';
 const p=site(s);if(!p||['destroyed','evacuated'].includes(p.status)||p.servicesAvailable===false||heldSettlement(s,s.locationId))return 'The settlement is not offering this public event.';
 if((s.legal?.incidents||[]).some(x=>x.locationId===s.locationId&&x.evidence>=3))return 'Settle the outstanding local warrant before attending this Watchhouse event.';
 if(room(s)!=='watch')return 'Meet the named Watch Captain at the Watchhouse.';
 const captain=settlementServices(s).find(r=>r.kind==='watch'&&r.here);if(!captain)return 'The public Watch Captain is not here to administer this challenge.';
 if(personReason(s,captain.person))return personReason(s,captain.person);
 if(!currentJurisdiction(s))return 'This watch has no recorded regional jurisdiction.';
 return null;
}
export function tournamentAvailabilityReason(s){
 const t=s.adultTournament;if(!t)return tournamentEntryReason(s);
 if(t.ownerId!==tournamentOwner(s))return 'This card belongs to another life.';
 if(s.locationId!==t.locationId)return 'Return to the Watchhouse at '+(site(s,t.locationId)?.name||t.locationId)+'.';
 const reason=tournamentEntryReason(s);if(reason)return reason;
 const captain=settlementServices(s).find(r=>r.kind==='watch'&&r.here);
 if(captain?.personId!==t.host.id)return 'The original administrator, '+t.host.name+', no longer holds this watch. Their successor cannot silently take this card.';
 if(currentJurisdiction(s)?.regionId!==t.jurisdiction.regionId)return 'The original sponsoring jurisdiction has changed. No new authority has taken over this card.';
 for(const p of [t.host,...t.opponents.slice(t.results.length)]){const reason=personReason(s,p);if(reason)return reason;}
 return null;
}
function candidates(s){
 const family=new Set([...(s.family?.members||[]).map(p=>p.personId),s.life?.partnerId,...(s.life?.children||[]).map(p=>p.id)]);
 return residentContacts(s).filter(p=>p.population&&p.locationId===s.locationId&&p.age>=18&&p.available!==false&&!family.has(p.id)&&!personReason(s,p)&&s.npcContinuity?.people?.[p.id]);
}
function canRemember(s){
 const t=s.adultTournament,people=t?[t.host,...t.opponents]:null;
 if(!people)return ['servicePeople','relationships','meetings'].every(k=>Object.keys(s.conversations?.[k]||{}).length<=508)&&Object.keys(s.socialLife?.met||{}).length<=509;
 const ids=people.map(p=>p.id),residents=ids.filter(id=>id.startsWith('townsfolk-'));
 const fits=(saved,needed)=>Object.keys(saved||{}).length+needed.filter(id=>!Object.hasOwn(saved||{},id)).length<=512;
 return fits(s.conversations?.servicePeople,ids.filter(id=>!residents.includes(id)))&&fits(s.conversations?.relationships,ids)&&fits(s.conversations?.meetings,ids)&&fits(s.socialLife?.met,residents);
}
const capacityReason=s=>canRemember(s)?null:'Your relationship book cannot retain every named participant in this card. No preparation day or fee was taken.';
export function tournamentChoiceReason(s,eventId,id){return eventId==='tournament_invitation'&&id==='enter'&&s.adultTournament?.pending==='invitation'?capacityReason(s):null;}
export function tournamentActions(s){
 if(!s||s.phase==='retired'||s.event||s.battle||s.conversations?.pending)return [];
 const t=s.adultTournament;if(t?.stage==='finished')return [];
 if(!t||t.stage==='offered'){
  const reason=t?tournamentAvailabilityReason(s):tournamentEntryReason(s),capacity=capacityReason(s);
  if(s.age<18||s.phase!=='adult')return [];
  return [row('invite','Ask About the Watchhouse Challenge','Read a local three-bout solo card. One actual preparation day, no fee; real Health, Focus and carried potions. All callings and livelihoods are welcome.',0,reason||capacity||(!t&&candidates(s).length<3?'Three available adult residents have not entered this local event.':null))];
 }
 const reason=tournamentAvailabilityReason(s),a=[];
 if(t.stage==='paused')a.push(row('resume','Resume the Same Challenge Card','Return to the original administrator and next entrant. Keep every result and the preparation day already attended.',0,reason));
 if(t.stage==='preparing')a.push(row('prepare','Attend the Preparation Day',`Attend ${1-t.paidDays} remaining actual day. No fee or free healing. Household costs and existing birthdays, needs and ordinary aging still apply.`,1-t.paidDays,reason));
 if(t.stage==='ready')a.push(row('bout_'+t.results.length,'Face '+t.opponents[t.results.length].name,`Bout ${t.results.length+1} of 3. Preparation is paid; this bout adds no days. Your current Health, Focus, equipment and potion supply enter the real resolver.`,0,reason));
 if(tournamentLocked(s))a.push(row('suspend','Suspend for Normal Care','Keep this card and its exact results. Use normal recovery, supplies, gear and travel at their own real costs; resumption requires the same available people.'));
 if(reason&&s.locationId===t.locationId&&room(s)==='watch')a.push(row('close','Close the Unavailable Card','Preserve completed bouts without inventing a replacement, walkover win or prize. No further time, payment or penalty.'));
 a.push(row('withdraw','Withdraw From the Challenge','End this card where it stands. No added days, fine, loss of calling or forced retirement. Earlier time and real resource use remain spent.'));
 return a;
}
function meet(s,p){
 const current=named(s,p),people=s.conversations.servicePeople ||= {},meetings=s.conversations.meetings ||= {};
 if(p.id.startsWith('townsfolk-'))rememberResident(s,current);
 else if(!people[p.id]&&Object.keys(people).length<512)people[p.id]={id:p.id,name:current.name,role:current.role,age:current.age,baseAge:current.age-Math.floor(s.day/365),locationId:p.locationId,roomId:p.roomId,...(current.serviceEndDay!==undefined?{serviceEndDay:current.serviceEndDay}:{}),...(current.appearance?{appearance:structuredClone(current.appearance)}:{}),...(current.pronouns?{pronouns:current.pronouns}:{})};
 const old=meetings[p.id];if(old||Object.keys(meetings).length<512)meetings[p.id]={locationId:p.locationId,firstDay:old?.firstDay??s.day,lastDay:s.day};
 // Reserve all four actual participants before normal suspended care can add
 // other contacts. Existing personal histories and bonds remain untouched.
 s.conversations.relationships[p.id] ||= {bond:p.id===s.adultTournament.host.id?40:25,memories:[],knownFacts:[]};
}
function memory(s,p,text){
 const life=s.life?.people?.find(x=>x.id===p.id),r=life||(s.conversations.relationships[p.id]||={bond:p.id===s.adultTournament.host.id?40:25,memories:[],knownFacts:[]});
 r.memories ||= [];if(!r.memories.includes(text)&&r.memories.length<60)r.memories.push(text);
}
const record=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'life',{narrativeEdition:30});};
function finalRecord(s,ctx){const t=s.adultTournament,q=tournamentScore(t),text=`The Watchhouse Challenge at ${site(s,t.locationId)?.name||t.locationId}: ${q.wins} wins, ${q.losses} losses, ${q.played} played bouts. ${t.endReason==='completed'?'The three-bout card is complete.':t.endReason==='withdrawn'?'You chose to end the card.':t.endReason==='life_closed'?'This life closed before the remaining bouts.':'An original participant or sponsoring watch was unavailable; no remaining result was invented.'} ${t.prize?`${t.prize.amount} Gold was awarded once for three wins.`:'No purse, experience or equipment was awarded.'} ${t.host.name} administered the local record in ${t.jurisdiction.regionName}; it grants no title, profession or calling.`;memory(s,t.host,text);record(s,ctx,'A local challenge, honestly recorded',text);}
function invitation(s,ctx){
 const t=s.adultTournament;t.pending='invitation';
 const roster=t.opponents.map((p,i)=>{const q=humanDuelProfile(p.profileId,t.difficulty);return `${i+1}. ${p.name}, ${p.role.toLowerCase()}: ${q.name}. ${q.hp} Health, ${q.attackPower} power, ${q.agility} agility, ${q.armor} armor. ${q.description}`;}).join('\n\n');
 ctx.setEvent('tournament_invitation','The Watchhouse Challenge','A local adult challenge',`${t.host.name} rubs three spaces into a chalkboard beside the Watchhouse. “Three bouts, and you can stop between them. We are keeping a local card, not choosing anyone’s profession.”\n\n${roster}\n\n${DUEL_RULES_TEXT}\n\nEntry costs no Gold. Warm-up and this finite card take one actual preparation day; household costs accrue separately. Birthdays, needs and ordinary aging still apply to that real day. Later care has its normal costs. You may suspend between bouts.\n\nThree real wins earn one ${TOURNAMENT_PURSE} Gold purse, zero experience and no equipment. A loss remains recorded and removes purse eligibility, but you can continue or stop. No knighthood, noble title or profession is granted. Your present Health is ${s.hero.hp}/${s.hero.maxHp}, Focus ${s.hero.mp}/${s.hero.maxMp}, carried potions ${s.hero.potions}.`,[{id:'enter',label:'Enter This Local Card',description:'Commit one actual preparation day, no entry fee. Keep the named entrants, real costs and saved results.'},{id:'later',label:'Prepare Another Day',description:'No commitment, time or payment. Use normal recovery, supplies or equipment before returning.'}]);
}
export function applyTournamentAction(s,id,ctx){
 if(!tournamentActions(s).some(a=>a.id===id&&!a.disabledReason))return false;
 let t=s.adultTournament;
 if(id==='tournament_invite'){
  if(!t){const host=settlementServices(s).find(r=>r.kind==='watch'&&r.here);t=s.adultTournament=makeTournamentOffer(s,{...host.person,roomId:'watch'},candidates(s),currentJurisdiction(s));if(!t)return false;}
  invitation(s,ctx);return true;
 }
 if(id==='tournament_withdraw'||id==='tournament_close'){finishTournament(t,s.day,id==='tournament_withdraw'?'withdrawn':'unavailable');finalRecord(s,ctx);return true;}
 if(id==='tournament_suspend'){t.stage='paused';s.notice='The card is suspended with every result and the attended preparation day intact. Normal care, equipment, supplies and travel keep their own costs.';return true;}
 if(id==='tournament_resume'){t.stage=t.paidDays?'ready':'preparing';s.notice='The original card resumes. No bout, preparation day or prize has been repeated.';return true;}
 if(id==='tournament_prepare'){
  const before=s.day;if(!t.paidDays)ctx.spendDays(1);t.paidDays=Math.min(1,t.paidDays+s.day-before);
  if(s.phase==='retired'||t.stage==='finished')return true;
  if(t.paidDays)t.stage='ready';s.notice=t.paidDays?'Your one preparation day is attended. Review your real remaining resources before choosing the first bout.':'Preparation is waiting for the current birthday or need. No unspent day was charged.';return true;
 }
 if(id==='tournament_bout_'+t.results.length){
  if(ctx.pendingNeed?.()||ctx.nextInterruptionDay?.()!==null&&ctx.nextInterruptionDay?.()<=s.day){s.notice='Attend the waiting birthday or need before starting a bout.';return true;}
  t.opponents[t.results.length].age=named(s,t.opponents[t.results.length]).age;t.opponents[t.results.length].ageDay=s.day;
  t.stage='bout';t.battleId=`battle-${s.seed}-${(s.flags.battlesStarted||0)+1}`;ctx.startBattle('watchhouse_duel',tournamentContext(s));return !!s.battle&&s.battle.instanceId===t.battleId;
 }
 return false;
}
export function applyTournamentChoice(s,eventId,id,ctx){
 const t=s.adultTournament;if(!t||t.pending!=='invitation'||eventId!=='tournament_invitation'||t.stage!=='offered'||!['enter','later'].includes(id))return false;
 if(id==='later'){t.pending=null;return true;}
 if(tournamentAvailabilityReason(s)||!canRemember(s))return false;
 t.pending=null;
 t.acceptedDay=s.day;for(const p of [t.host,...t.opponents]){p.age=named(s,p).age;p.ageDay=s.day;meet(s,p);}
 t.stage='preparing';return applyTournamentAction(s,'tournament_prepare',ctx);
}
export const tournamentEventIds=()=>({tournament_invitation:['enter','later']});
export function resolveTournamentBattle(s,completed,ctx){
 const t=s.adultTournament,b=s.battle;
 if(!b||b.outcome===null||JSON.stringify(completed)!==JSON.stringify(b)||!validTournamentBattle(s,b))return false;
 const hero=b.actors.find(a=>a.id==='hero'),enemy=b.actors.find(a=>a.id==='enemy-1');
 if(!['victory','defeat','retreat'].includes(b.outcome)||b.outcome==='victory'&&(hero.hp<=0||enemy.hp!==0)||b.outcome==='defeat'&&hero.hp!==0||b.outcome==='retreat'&&(hero.hp<=0||enemy.hp<=0))return false;
 const i=t.results.length,p=t.opponents[i],outcome={victory:'win',defeat:'loss',retreat:'withdrawn'}[b.outcome];
 t.results.push({boutIndex:i,opponentId:p.id,profileId:p.profileId,battleId:b.instanceId,day:s.day,outcome,rounds:b.round,heroMaxHp:hero.maxHp,heroMaxMp:hero.maxMp,heroStartHp:b.startingHeroHp,heroEndHp:hero.hp,heroStartMp:s.hero.mp,heroEndMp:hero.mp,opponentEndHp:enemy.hp,potionsStart:s.hero.potions,potionsEnd:b.potions});
 s.hero.hp=Math.max(1,hero.hp);s.hero.mp=hero.mp;s.hero.potions=b.potions;
 if(s.hero.condition?.type==='lycanthrope'&&hero.condition?.type==='lycanthrope')s.hero.condition.control=hero.condition.control;
 s.flags.lastResolvedBattle=b.instanceId;s.battle=null;t.battleId=null;t.stage='ready';
 const text=`At ${site(s,t.locationId)?.name||t.locationId}, bout ${i+1} against ${p.name} was ${outcome==='win'?'your win':outcome==='loss'?'your loss':'withdrawn'}, after ${b.round} rounds. Both entrants left the bout alive. Your remaining resources return: ${s.hero.hp}/${s.hero.maxHp} Health, ${s.hero.mp}/${s.hero.maxMp} Focus, ${s.hero.potions} potions. No extra recovery day, fine, experience or equipment was added.`;
 memory(s,p,text);record(s,ctx,'A supervised bout with '+p.name,text);
 if(outcome==='withdrawn'||t.results.length===3){const purse=finishTournament(t,s.day,outcome==='withdrawn'?'withdrawn':'completed');s.hero.gold+=purse;finalRecord(s,ctx);}return true;
}
export function closeTournamentForLife(s){const t=s.adultTournament;if(t&&t.stage!=='finished')finishTournament(t,s.day,'life_closed');}
export function reconcileTournament(s){const t=s.adultTournament;if(!t||t.stage==='finished'||t.stage==='offered'||t.stage==='paused'||s.battle?.context?.kind==='tournament')return;if(s.phase==='retired')closeTournamentForLife(s);else if(s.justice?.prison||s.justice?.arrest||s.locationId!==t.locationId||occupied(s))t.stage='paused';}
export function tournamentRecognitionEligible(s,p){
 const t=s.adultTournament,m=t?.recognition;
 return !!(t?.stage==='finished'&&t.endReason!=='life_closed'&&m&&m.personId===p.id&&m.consumedDay===null&&t.ownerId===tournamentOwner(s)&&s.day>t.finishedDay&&s.age>=18&&s.phase!=='retired'&&p.available!==false&&p.alive!==false&&p.source?.alive!==false&&!personReason(s,p)&&p.locationId===s.locationId&&(p.roomId||'gate')===room(s)&&!s.cartography?.pending&&!s.cartography?.offsite&&!s.timeline?.journey&&!s.dungeon&&!s.maze&&!s.justice?.prison&&!s.justice?.arrest&&!s.rpg?.expedition&&!s.adventuring?.expedition&&!heldSettlement(s,s.locationId)&&site(s)?.servicesAvailable!==false&&!['destroyed','evacuated'].includes(site(s)?.status));
}
export function tournamentRecognition(s,p,{historical=false}={}){
 if(!s.adultTournament?.recognition||s.adultTournament.recognition.personId!==p.id||!historical&&!tournamentRecognitionEligible(s,p))return null;
 const t=s.adultTournament,r=t.results[t.recognition.boutIndex],q=tournamentScore(t),place=site(s,t.locationId)?.name||t.locationId;
 const words={win:'You took our bout. I would rather learn from that than explain it away.',loss:'I won our bout. That is one result, not a judgment on the rest of your life.',withdrawn:'You lowered your weapon. I will not pretend we finished a bout we stopped.'};
 const reply=(id,label,text,response)=>({id,label,description:'Conversation only: no day, prize, skill, relationship change or new obligation.',text,response,effect:{}});
 return {nodeId:'tournament_rival',topic:t.id+'-rival',title:'After the Chalk Has Dried',body:`Away from the chalkboard, ${p.name} remembers the Watchhouse card at ${place}: ${q.wins} wins, ${q.losses} losses from ${q.played} played bouts. Your own bout together was number ${r.boutIndex+1}, ${r.rounds} rounds, on day ${r.day}.\n\n“${words[r.outcome]} If you ever want to talk through that practice, I would welcome it. An invitation is not another contest or a claim on your time.”`,choices:[reply('review','Review the Actual Bout','Let us start with what was recorded.',`Our bout was ${r.outcome==='win'?'your win':r.outcome==='loss'?'my win':'withdrawn'}, not an invented rematch. The record kept both our names.`),reply('perspective','Keep the Practice in Perspective','I want to learn without having a result choose my life.','Then keep that freedom. Local practice does not choose your livelihood or calling.'),reply('quiet','Welcome the Invitation, Without a Promise','I would welcome a conversation another time, without fixing a date.','That is enough. No day or further contest is promised.'),reply('leave','Leave the Card There','Thank you. I would like to leave that card behind.','Then we will leave it there. We have other things to talk about.')]};
}
