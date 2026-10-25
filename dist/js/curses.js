import { receiveNotification } from './notifications-v40.js';
// Original curse lore. All progression is paid for in lived days; view functions
// derive presentation without changing the person's saved mortal identity.
import { seededRoll } from './world.js';
import { queueNightDiscovery, validateNightDiscovery, nightDiscoveryActions, applyNightDiscoveryAction, rememberNightInvitation } from './supernatural-discovery.js';

export const BLOOD_LINEAGES = Object.freeze([
  {id:'velvet_sepulchre',name:'The Velvet Sepulchre',gift:'Sepulchral allure',weakness:'The hunger behind a beautiful face',description:'The first mourner drank from a sealed royal tomb. Their descendants cultivate exquisite manners to hide the sound of another heart inside their ribs.',power:'Charm a foe into a weakened strike and restore a little magic.',animal:1,rate:2},
  {id:'ashen_choir',name:'The Ashen Choir',gift:'The funeral hush',weakness:'Sacred fire',description:'A choir sang through a plague night until every singer fell silent. This blood remembers the names of the dead and hears feeding as a stolen final breath.',power:'A pall of ash wards the party and cleanses bleeding.',animal:1,rate:2},
  {id:'gloamwing',name:'The Gloamwing',gift:'Predator of the vault',weakness:'Restless thirst',description:'Something winged slept beneath the oldest cistern. Its blood sharpens hearing and appetite; starvation peels the human disguise from the jaw, ears and hands.',power:'A piercing ambush marks the next party opening.',animal:.75,rate:3},
  {id:'blackroot',name:'The Blackroot Communion',gift:'The buried pulse',weakness:'Silver and desecrated shelter',description:'The roots of a murdered grove drank a night traveler dry. The communion carries black veins beneath the skin and preserves a memory of rain, rot and returning life.',power:'Draw vitality through a foe and weaken its next attack.',animal:1.1,rate:2},
]);
export const CURSE_ORDERS = Object.freeze({bellwater:{name:'The Lantern Inquest',policy:'trial'},saltreach:{name:'The Salt Watch',policy:'exile'},highstone:{name:'The Silver Compact',policy:'execution'},blackgrove:{name:'The Thorn Wardens',policy:'shelter'},rainward:{name:'The Ashen Vigil',policy:'trial'},ashplain:{name:'The Cinder Tribunal',policy:'execution'}});
export function curseLawAt(s,id=s.locationId){
  const regionId=s.realm?.sites[id]?.regionId,order=CURSE_ORDERS[regionId];if(!order)return null;
  const text={trial:'Witnessed discovery leads to a hearing and possible supervision.',exile:'Witnessed discovery can lead to expulsion.',execution:'Capture and a capital hearing can end in execution.',shelter:'Supervised shelter is possible; a proved assault still has consequences.'}[order.policy];
  return {...order,regionId,text:`${order.name}: ${text} Permission for public magic is a separate law. A congregation cannot cancel a local warrant.`};
}
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const alive=s=>s.phase!=='retired';
const site=s=>s.realm?.sites[s.locationId];
const atSettlement=s=>!s.cartography?.offsite&&!s.timeline?.journey&&['city','village','town','citadel','harbor','sanctuary','camp'].includes(s.world?.locations.find(p=>p.id===s.locationId)?.type);
export const bloodLineage=c=>BLOOD_LINEAGES.find(l=>l.id===c?.bloodline)||BLOOD_LINEAGES[0];
export const bloodHungerRate=c=>c?.curseVersion===1?bloodLineage(c).rate:2;
export function initializeCurse(s){
  const c=s.hero.condition;if(!c||c.curseVersion===1)return c;
  Object.assign(c,{curseVersion:1,infectedDay:s.day,source:'An earlier recorded change',stage:'changed',form:'human',formUntil:0,lastProgressDay:s.day,exposures:[],hunts:[],history:[],frenzies:0,lastTrainingDay:null,accepted:false,feedingPlan:null,reserveGranted:c.type==='vampire'?6:0});
  if(c.type==='vampire')Object.assign(c,{bloodline:'velvet_sepulchre',humanity:85,starvedDays:0,lastFedDay:s.day,apparentAge:s.age});
  else Object.assign(c,{rage:20,moonsLived:0,mastery:0});
  return c;
}
function record(s,ctx,title,text){const c=s.hero.condition;if(c?.curseVersion===1){c.history.push({day:s.day,title,text});c.history=c.history.slice(-80);}s.notice=text;ctx.journal?.(title,text,'condition');}
export function contractCurse(s,type,source,ctx={},lineageId){
  if(s.age<18||s.hero.condition||!['vampire','lycanthrope'].includes(type))return false;
  s.hero.condition=type==='vampire'?{type,hunger:20}:{type,control:12,preparedUntil:0,lastFullMoon:s.day<14?0:14+28*Math.floor((s.day-14)/28)};
  const c=initializeCurse(s);c.source=source;c.stage=type==='vampire'?'incubating':'changed';c.infectedDay=s.day;
  if(type==='vampire'){c.reserveGranted=0;c.bloodline=BLOOD_LINEAGES.some(l=>l.id===lineageId)?lineageId:BLOOD_LINEAGES[seededRoll(s.seed,'bite-lineage:'+source+':'+s.day,4)].id;}
  if(type==='lycanthrope')s.flags.pendingMoonDays=[];
  receiveNotification(s,{kind:'health',sourceId:'curse:'+type+':'+s.day,title:'A Wound That Will Not Close',body:type==='vampire'?'Your pulse is slowing after the bite. A healer can cleanse it within three days, before the change.':'Fever gathers beneath the wound. You have become moonbound; prepare a refuge before the full moon.'});
  record(s,ctx,'A wound that will not close',type==='vampire'?`${source}. Over the next three days your pulse will slow. A healer can cleanse the bite for 12 gold before it changes you; after that, only a costly rite can restore mortality.`:`${source}. Fever gathers beneath the wound. The next full moon will not ask your permission. A prepared refuge protects others; learning restraint takes many nights.`);
  return true;
}
export function bloodMealRelief(c,source,amount){return Math.max(0,Math.round(amount*(source==='animal'?bloodLineage(c).animal:1)));}
export function curseCombatNote(c,actor={}){
  if(!c)return '';
  const lore=c.type==='vampire'?bloodLineage(c).weakness:'Full moons, silver and fear';
  return `Curse lore: ${lore}. Active damage weakness: ${actor.weakness||'none recorded'}. The lore adds no extra elemental or silver damage multiplier; the combatant’s recorded weakness and resistances govern hits.`;
}
export function feedBlood(s,source,amount,ctx={}){
  const c=initializeCurse(s);if(c?.type!=='vampire')return 0;
  const old=c.hunger,relief=bloodMealRelief(c,source,amount);
  c.hunger=clamp(c.hunger-relief);c.lastFedDay=s.day;if(c.hunger<100)c.frenzyHandled=false;if(c.hunger<85&&c.humanity>=35)c.form='human';c.starvedDays=Math.max(0,c.starvedDays-8);
  if(['donor','agreement','animal'].includes(source))c.humanity=clamp(c.humanity+1);
  if(source==='predation')c.humanity=clamp(c.humanity-12);
  if(source==='combat')c.humanity=clamp(c.humanity-1);
  return old-c.hunger;
}
export function recordCurseExposure(s,ctx,description,severity=1){
  const c=initializeCurse(s);if(!c)return;
  const regionId=site(s)?.regionId||'bellwater',order=CURSE_ORDERS[regionId];
  c.exposures.push({day:s.day,locationId:s.locationId,regionId,description,severity});c.exposures=c.exposures.slice(-40);
  let h=c.hunts.find(h=>h.locationId===s.locationId);if(!h){h={locationId:s.locationId,regionId,order:order.name,policy:order.policy,heat:0,nextDay:s.day+7,status:'watch',captures:0};c.hunts.push(h);c.hunts=c.hunts.slice(-32);}
  h.heat=clamp(h.heat+severity*20);h.status='watch';h.nextDay=s.day+7;
  ctx.addEvidence?.(severity,description);
  record(s,ctx,'Someone saw what the darkness concealed',`${description} ${order.name} keeps a local account. Under this region’s curse law, discovery can lead to ${order.policy==='execution'?'capture, a hearing, and execution':order.policy==='shelter'?'a supervised refuge if no assault is proved':order.policy==='exile'?'expulsion from the settlement':'a witnessed hearing and supervised confinement'}. Unvisited regions receive no report.`);
}
export function onCurseTime(s,oldDay,newDay,{outdoors=false,night=false}={},ctx={}){
  const c=initializeCurse(s);if(!c||!alive(s))return;
  const days=Math.max(0,newDay-Math.max(oldDay,c.lastProgressDay));if(!days)return;
  c.lastProgressDay=newDay;
  const latentWithoutGift=c.stage==='incubating'&&!c.reserveGranted;
  if(c.stage==='incubating'&&newDay>=c.infectedDay+3){c.stage='changed';if(c.type==='vampire'&&!c.reserveGranted){s.hero.maxMp+=6;s.hero.mp=Math.min(s.hero.maxMp,s.hero.mp+6);c.reserveGranted=6;}record(s,ctx,'The fever takes a second shape',c.type==='vampire'?`${bloodLineage(c).name} wakes in your veins. Food tastes of dust. Every living pulse separates itself from the room. Your memories remain, but tenderness now takes conscious effort.`:'Your nails split against the bedstead. Beneath your voice another breath answers. The beast is a curse, not a trained combat stance.');}
  if(c.type==='lycanthrope'&&c.form!=='human'&&newDay>=c.formUntil)c.form='human';
  if(c.type==='vampire'){
    const rate=bloodHungerRate(c),start=c.hunger;c.hunger=clamp(start+days*rate);
    const starvation=Math.max(0,days-Math.max(0,Math.floor((85-start)/rate)));const oldStarved=c.starvedDays;c.starvedDays+=starvation;
    const loss=Math.floor(c.starvedDays/7)-Math.floor((c.starvedDays-starvation)/7);c.humanity=clamp(c.humanity-loss*2);
    if(s.life)s.life.stress=clamp(s.life.stress+Math.min(15,Math.ceil(starvation/2)));
    let damage=Math.floor(c.starvedDays/2)-Math.floor(oldStarved/2);if(outdoors&&!night)damage+=(latentWithoutGift?Math.max(0,newDay-Math.max(oldDay,c.infectedDay+2)):days)*2;
    if(damage){s.hero.hp=Math.max(0,s.hero.hp-damage);if(!s.hero.hp){ctx.endLife?.(outdoors&&!night?'Daylight consumed the blood-cursed body':'Blood starvation ended the cursed life');return;}}
    if(c.hunger===100&&c.starvedDays>=7)c.form='feral';
  }else {c.rage=clamp(c.rage+Math.min(12,Math.floor(days/7))+(s.life?.stress>=80?2:0));}
}
const action=(id,label,description,days=0,cost=0,disabledReason)=>({id,label,description,days,cost,group:'The curse',...(disabledReason?{disabledReason}:{})});
export function curseActions(s){
  const c=s.hero.condition;if(s.age<18||!alive(s)||s.event||s.battle||s.conversations?.pending)return [];
  if(!c)return nightDiscoveryActions(s);
  const result=[];
  if(c.stage==='incubating')result.push(action('curse_cleanse','Have the fresh bite cleansed','Spend one sheltered day and 12 gold before the third day. The wound heals; later transformation requires a full rite.',1,12,s.hero.gold<12?'Requires 12 gold.':s.day>=c.infectedDay+3?'The infection has already changed you.':undefined));
  if(c.type==='vampire'){
    result.push(action('curse_abstain','Refuse blood for three more nights','Three real sheltered days. Hunger, stress, bodily damage and loss of humanity continue; starvation can end this life.',3));
    if(!s.justice?.prison)result.push(action('curse_animal','Hunt animals after sunset',`One real night, no fee. A full animal meal relieves up to ${bloodMealRelief(c,'animal',45)} hunger (45 before your lineage’s animal-blood adjustment). Hunger still rises by ${bloodHungerRate(c)} during the night; no person is harmed.`,1));
    if(s.justice?.prison)result.push(action('curse_prison_blood','Request blood from the prison infirmary',`One day and 8 gold for a larger infirmary provision: up to ${bloodMealRelief(c,'animal',55)} hunger relief (55 before the animal-blood adjustment). The jailer learns your condition locally; an execution warrant still needs its hearing.`,1,8,s.hero.gold<8?'Requires 8 gold; request emergency rations instead.':undefined),action('curse_prison_rations','Ask the jailer for emergency sustenance',`One day for a limited emergency ration: up to ${bloodMealRelief(c,'animal',30)} hunger relief (30 before the animal-blood adjustment). This jailer learns your condition locally; no absolution of an assault.`,1));
    result.push(action('curse_remember','Keep a vigil for the person you were','Three sheltered days and 4 gold. Record an actual remembered person, regain at most 2 humanity and reduce stress; hunger continues.',3,4,s.hero.gold<4?'Requires 4 gold.':undefined));
    if(s.sanctuaries?.agreements?.some(a=>a.status==='active'&&a.locationId===s.locationId))result.push(action('curse_plan_blood','Keep a standing donor arrangement','Enable attended, paid sessions with the existing named willing donor when hunger reaches 65. Each costs its own day and fee; consent, absence, funds or interval failure interrupts.',0));
  }else{
    result.push(action('curse_accept','Accept responsibility for the beast','Name the curse as part of your life. This grants no free control. Repeated prepared nights and honest restraint gradually earn mastery.'));
    if(s.justice?.prison)result.push(action('curse_prison_refuge','Request a barred moon chamber','Spend one day on a locked chamber for the next full moon. The jailer learns your curse; a private safe night does not acquit another crime.',1));
  }
  if(c.feedingPlan)result.push(action('curse_cancel_plan','End the standing blood arrangement','End future automatic attendance; all past fees, confidences and consent remain recorded.'));
  return result;
}
export function applyCurseAction(s,id,ctx={}){
  if(id.startsWith('curse_revisit_'))return applyNightDiscoveryAction(s,id,ctx);
  const c=initializeCurse(s);if(!c||!curseActions(s).some(a=>a.id===id&&!a.disabledReason))return false;
  if(id==='curse_accept'){c.accepted=true;record(s,ctx,'Responsibility rather than surrender','You accept that the beast is yours to contain. Acceptance grants no control by itself; a prepared refuge, repeated practice and the people you protect make mastery possible.');return true;}
  if(id==='curse_plan_blood'){const a=s.sanctuaries.agreements.find(a=>a.status==='active'&&a.locationId===s.locationId);c.feedingPlan={agreementId:a.id};record(s,ctx,'A standing agreement with a living person',`${a.contactName}’s existing boundaries still govern every session. Your year pauses if consent, time, money or place changes.`);return true;}
  if(id==='curse_cancel_plan'){c.feedingPlan=null;return true;}
  const before=s.day,amount=id==='curse_cleanse'?1:id==='curse_remember'||id==='curse_abstain'?3:1;
  ctx.spendDays?.(amount,{outdoors:false,night:true});if(!alive(s))return true;
  if(s.day-before<amount){s.notice='The current calendar boundary interrupted this action. No fee or unearned result was granted.';return true;}
  if(id==='curse_cleanse'){s.hero.gold-=12;s.hero.maxMp-=c.reserveGranted||0;s.hero.mp=Math.min(s.hero.mp,s.hero.maxMp);s.hero.condition=null;record(s,ctx,'The bite was cleansed','The early infection ended before transformation. The encounter remains in your chronicle.');}
  if(id==='curse_animal'){feedBlood(s,'animal',45,ctx);record(s,ctx,'A hunger answered beyond the hearth',`You return at dawn with hunger ${c.hunger}/100. No person was harmed or informed.`);}
  if(id==='curse_prison_blood'||id==='curse_prison_rations'){if(id==='curse_prison_blood')s.hero.gold-=8;feedBlood(s,'animal',id==='curse_prison_blood'?55:30,ctx);recordCurseExposure(s,ctx,'The infirmary jailer heard your disclosed blood hunger.',1);}
  if(id==='curse_prison_refuge'){c.preparedUntil=14+28*Math.ceil((s.day-14)/28);if(s.sanctuaries)s.sanctuaries.independentPreparedUntil=c.preparedUntil;recordCurseExposure(s,ctx,'The jailer recorded your request for a moon chamber.',1);}
  if(id==='curse_remember'){s.hero.gold-=4;c.humanity=clamp(c.humanity+2);if(s.life)s.life.stress=clamp(s.life.stress-6);const p=s.life?.people.find(p=>p.memories?.length)||s.life?.people[0];record(s,ctx,'A memory kept against the hunger',`${p?.name||'An old familiar voice'} remains a person in your account, rather than a pulse to be used. Humanity is ${c.humanity}/100. The vigil did not feed the body.`);}
  if(id==='curse_abstain')record(s,ctx,'Three nights with an empty mouth',`Hunger ${c.hunger}/100; humanity ${c.humanity}/100. ${c.hunger>=85?'Your tongue finds the shape of a stranger’s throat before you can form a word.':'You endured these nights. The appetite has not agreed to leave.'}`);
  return true;
}
export function flushCurseEvent(s,ctx={}){
  if(s.nightEncounters?.pending&&!s.hero.condition&&alive(s)&&!s.event&&!s.battle&&!s.conversations?.pending){
    const kind=s.nightEncounters.pending,invitation=['patron','ranger'].includes(kind),wolf=kind==='lycanthrope'||kind==='ranger';
    const m=s.nightEncounters.meeting;
    const introduction=m?`${invitation?m.personName+', an unusual traveler, was encountered':'An unusual presence was encountered'} ${m.context==='depths'?'during your time in the depths':'on this stretch of night road'} near ${s.world.locations.find(p=>p.id===m.locationId)?.name||m.locationId}. `:'';
    const body=introduction+(invitation?(wolf?'A ranger tends a wounded animal beside the road. Under moonlight, their hands briefly take another shape. They notice that you saw.':'A pale traveler offers you a seat beside a shaded lantern. They speak of living beyond an ordinary span, then wait to see whether you want to hear more.'):(wolf?'Something larger than a wolf follows the trail. It stops when you stop; the last safe hearth is still within reach.':'A traveler stands beyond the lantern’s reach. When they turn, their mouth is dark with blood. There is still time to withdraw.'));
    const choices=invitation?[{id:'speak',label:'Hear what they have to say',description:'This rare meeting opens an invitation. You can refuse after hearing its consequences.'},{id:'leave',label:'Leave the stranger to their night',description:'Keep your ordinary life. No curse or quest is accepted.'}]:[{id:'fight',label:'Hold your ground',description:'Face a dangerous creature in party combat. A suffered bite can transmit a curse.'},{id:'withdraw',label:'Return to safety',description:'Leave the creature behind. No curse, quest or reward is granted.'}];
    if(invitation&&m)choices.splice(1,0,{id:'defer',label:'Remember the place and leave for now',description:'Keep an unresolved invitation in your Journal, with this person and the last known place. A later night search may find them; no quest or transformation is accepted.'});
    ctx.setEvent?.('curse_rare_meeting',invitation?'An unexpected meeting':wolf?'A hunter beneath the moon':'A figure on the dark road','Rare encounter',body,choices);return true;
  }
  const c=initializeCurse(s);if(!c||!alive(s)||s.event||s.battle||s.conversations?.pending)return false;
  if(c.type==='vampire'&&c.hunger>=100&&c.starvedDays>=7&&!c.frenzyHandled){
    ctx.setEvent?.('curse_frenzy','The sound behind every voice','Blood hunger',`Your humanity is ${c.humanity}/100. Your ears lengthen; every sound becomes an imagined pulse. The hunger no longer waits politely.`,[{id:'contain',label:'Shut yourself away and endure the body',description:'Lose 10 health and 3 humanity. A weak body can die; no outsider is harmed.'},{id:'feed',label:'Seek animal blood before another person',description:'One night of feeding; hunger eases without assault. The starvation scars on the mind remain.'},{id:'hunt',label:atSettlement(s)?'Let the predator choose a living target':'Follow the scent of small prey',description:atSettlement(s)?'An uncontrolled meal can relieve up to 80 hunger; an actual named local adult can die. This is larger and more harmful than a measured feeding. Humanity, relationships, witnesses and the local hunter order respond.':'One night hunting small animals. No settlement resident or city watch is present; the loss of restraint still costs humanity.'}]);return true;
  }
  if(!atSettlement(s)||s.justice?.prison)return false;
  const h=c.hunts.find(h=>h.locationId===s.locationId&&h.status==='watch'&&h.heat>=40&&s.day>=h.nextDay);
  if(h){h.status='summoned';ctx.setEvent?.('curse_hunters',h.order+' at your door','The local curse law',`${h.order} has followed an actual report in this settlement. ${h.policy==='execution'?'Their warrant permits execution after capture and a hearing.':'Their regional law requires '+(h.policy==='exile'?'expulsion':h.policy==='shelter'?'supervised shelter unless an assault is proved':'a witnessed hearing')+'.'} They know the recorded exposure; they do not know every private deed.`,[{id:'hide',label:'Disappear into a prepared hiding place',description:'Two real days. A stealth test can delay this local hunt; failure brings capture.'},{id:'fight',label:'Face the silver-bearing hunters',description:'A lethal party encounter. Defeat means capture, not ordinary recovery.'},{id:'answer',label:'Answer the warrant at the local court',description:'Attend the hearing. Present an informed agreement or refuge record; a capital warrant remains dangerous.'}]);return true;}
  return false;
}
function hearing(s,h,ctx){h.status='custody';h.captures++;ctx.setEvent?.('curse_trial','A shuttered court before dawn','Curse hearing',`${h.order} reads the local report. ${h.policy==='execution'?'The sentence under this region’s law is death unless credible shelter or donor records stay the warrant.':'A truthful account can result in supervision or expulsion.'} No distant accusation is added.`,[{id:'records',label:'Present the recorded boundaries and witnesses',description:'A current named donor agreement or prepared moon plan can earn supervision; an unsupported claim cannot.'},{id:'escape',label:'Risk escape before judgment',description:'A stealth test. Failure under a capital warrant ends this life.'},{id:'accept',label:'Accept the regional judgment',description:h.policy==='execution'?'Execution ends this life; a living heir may continue.':'Serve eight real days under supervision. Hunger and the moon continue.'}]);}
export function afterCurseBattle(s,pending,outcome,ctx={}){if(pending.context?.kind!=='curse')return false;const h=s.hero.condition?.hunts.find(h=>h.locationId===s.locationId);if(!h)return false;if(outcome==='defeat')hearing(s,h,ctx);else {h.heat=clamp(h.heat-(outcome==='victory'?30:5));h.status='watch';h.nextDay=s.day+(outcome==='victory'?28:3);record(s,ctx,'Silver behind the threshold',outcome==='victory'?'You survived the hunters. Their local order remembers; this victory grants no acquittal or immunity.':'You withdrew. The warrant still belongs to this settlement.');}return true;}
export function applyCurseChoice(s,eventId,id,ctx={}){
  if(eventId==='curse_rare_meeting'&&s.nightEncounters?.pending&&['fight','withdraw','speak','leave','defer'].includes(id)){
    const type=s.nightEncounters.pending,invitation=['patron','ranger'].includes(type);
    if(invitation!==['speak','leave','defer'].includes(id)||id==='defer'&&!s.nightEncounters.meeting)return false;
    if(invitation)rememberNightInvitation(s,id==='leave'?'declined':'deferred',ctx);
    s.nightEncounters.pending=null;delete s.nightEncounters.meeting;
    if(invitation){s.nightEncounters[type==='patron'?'patronMet':'rangerMet']=true;if(id==='speak')ctx.offerCurse?.(type==='patron'?'vampire':'lycanthrope');else if(id==='leave'){s.flags[type==='patron'?'vampireDeclined':'lycanDeclined']=true;record(s,ctx,'A meeting left behind','You left the unusual traveler on the road. No transformation or task was accepted.');}}
    else if(id==='fight')ctx.startBattle?.(type==='vampire'?'feral_vampire':'moon_mauler');else record(s,ctx,'The road left behind','You returned to the safety of a hearth. The creature remained on the dark road.');
    return true;
  }
  const c=initializeCurse(s);if(!c)return false;
  if(eventId==='curse_frenzy'){
    if(id==='contain'){s.hero.hp=Math.max(0,s.hero.hp-10);c.humanity=clamp(c.humanity-3);c.frenzyHandled=true;if(!s.hero.hp){ctx.endLife?.('The starving blood curse consumed the last strength of the body');return true;}}
    else if(id==='feed'){const before=s.day;ctx.spendDays?.(1,{night:true});if(!alive(s))return true;if(s.day>before)feedBlood(s,'animal',45,ctx);}
    else if(id==='hunt'){
      if(!atSettlement(s)){const before=s.day;ctx.spendDays?.(1,{night:true});if(!alive(s))return true;if(s.day>before){feedBlood(s,'animal',45,ctx);c.humanity=clamp(c.humanity-2);c.frenzies++;}}
      else {const victim=s.life?.people.find(p=>p.alive!==false&&p.age>=18&&p.locationId===s.locationId&&!p.familyRole)||s.society?.people.find(p=>p.alive!==false&&p.age>=18&&p.locationId===s.locationId);if(victim)ctx.killPerson?.(victim.id,'Killed by the blood curse during a feeding frenzy');feedBlood(s,'predation',80,ctx);c.humanity=clamp(c.humanity-10);c.frenzies++;recordCurseExposure(s,ctx,victim?`${victim.name} was found after your witnessed blood frenzy.`:'The watch identified your assault on a living night traveler.',3);ctx.breakOath?.('You surrendered a living person to blood hunger.');}
    }
    else return false;
    if(c.hunger<100)c.frenzyHandled=false;record(s,ctx,'The hunger kept its own account',`Hunger ${c.hunger}; humanity ${c.humanity}. Your choice and its victims remain in the chronicle.`);return true;
  }
  const h=c.hunts.find(h=>h.locationId===s.locationId&&['summoned','custody'].includes(h.status));if(!h)return false;
  if(eventId==='curse_hunters'){
    if(id==='fight'){ctx.startBattle?.(c.type==='vampire'?'vampire_hunters':'wolf_hunters',{kind:'curse',locationId:s.locationId});return true;}
    if(id==='hide'){ctx.spendDays?.(2,{night:true});if(!alive(s))return true;const chance=clamp(25+s.hero.skills.stealth*3,10,85);if(seededRoll(s.seed,`curse-hide:${s.day}:${h.captures}`,100)<chance){h.status='watch';h.heat=clamp(h.heat-20);h.nextDay=s.day+14;record(s,ctx,'The hunters found an empty room','The local pursuit is delayed for fourteen days. The original evidence remains.');return true;}}
    if(!['hide','answer'].includes(id))return false;hearing(s,h,ctx);return true;
  }
  if(eventId==='curse_trial'){
    const supported=c.type==='vampire'?s.sanctuaries?.agreements.some(a=>a.status==='active'&&a.locationId===s.locationId):s.sanctuaries?.plans.some(p=>p.status==='active'&&p.locationId===s.locationId&&p.preparedMoon>=c.lastFullMoon);
    const safe=id==='records'&&supported&&h.heat<80&&!c.exposures.some(e=>e.locationId===s.locationId&&e.severity>=3)||id==='escape'&&seededRoll(s.seed,`curse-escape:${s.day}:${h.captures}`,100)<clamp(20+s.hero.skills.stealth*4,5,70);
    if(!['records','escape','accept'].includes(id))return false;
    if(!safe&&h.policy==='execution'){h.status='ended';ctx.endLife?.(`Executed under ${h.order}’s local curse warrant`);return true;}
    h.status='watch';h.heat=safe?20:30;h.nextDay=s.day+28;
    if(!safe){ctx.spendDays?.(8,{night:true});if(!alive(s))return true;if(h.policy==='exile'){const road=s.world.roads.find(r=>r.from===s.locationId||r.to===s.locationId);if(road){ctx.spendDays?.(road.days,{outdoors:true,night:true});if(!alive(s))return true;s.locationId=road.from===s.locationId?road.to:road.from;}}}
    record(s,ctx,'A court’s limited judgment',safe?'The actual record or escape stayed this warrant. The local order retains its observations.':'The region ordered supervision rather than execution. Eight real days passed; hunger and the moon continued.');return true;
  }
  return false;
}
export function curseView(s){const c=s.hero.condition;if(!c)return null;const h=c.hunts?.find(h=>h.locationId===s.locationId),line=c.type==='vampire'?bloodLineage(c):null;return {title:line?.name||'The moon inside the body',lore:line?.description||'A fever older than the roads turns the body into a ferocious animal. Shelter protects others; it cannot promise an easy life.',gift:line?.gift||'The uncontrollable beast',weakness:line?.weakness||'Full moons, silver and fear',stage:c.stage||'changed',form:c.form||'human',humanity:c.humanity??null,hunger:c.hunger??null,control:c.control??null,rage:c.rage??null,mastery:c.mastery??0,source:c.source||'An earlier change',law:(curseLawAt(s)?.text||'No regional curse policy is recorded.')+(h?` Local pursuit ${h.heat}/100.`:' No local hunter report.'),mechanics:c.stage==='incubating'?'Bloodline attributes and battle powers wait until the infection changes you. Your actual magic reserve is kept as recorded.':`${Object.entries(curseModifiers(c)).map(([k,v])=>k+' '+(v>=0?'+':'')+v).join(' · ')} before combat training conversion. ${c.type==='vampire'?'Hunger rises '+bloodHungerRate(c)+' per lived day; a full animal meal supplies '+bloodMealRelief(c,'animal',45)+' relief. Outdoor daylight costs 2 combat HP per day; prolonged starvation harms the body and humanity. ':''}Lineage lore adds no separate elemental or silver damage multiplier.`,history:(c.history||[]).slice(-8),actions:curseActions(s)};}
export function curseModifiers(c){if(!c||c.stage==='incubating')return {};if(c.type==='vampire'){const feral=(c.humanity??85)<35||c.hunger>=85;return {strength:feral?3:1,presence:feral?-3:c.hunger<50?3:0,agility:2,willpower:c.hunger>=85?-2:1};}return c.form!=='human'?{strength:5,agility:3,intellect:-2,presence:-3}:{strength:1};}
export function validateCurse(c,day){
  if(!c||c.curseVersion===undefined)return true;
  const int=(n,a=0,b=10000000)=>Number.isSafeInteger(n)&&n>=a&&n<=b,text=(t,n=2000)=>typeof t==='string'&&t.length<=n;
  if(c.curseVersion!==1||!int(c.infectedDay,0,day)||!text(c.source)||!['incubating','changed'].includes(c.stage)||!['human','beast','feral','restrained'].includes(c.form)||!int(c.reserveGranted,0,6)||!int(c.formUntil)||!int(c.lastProgressDay,0,day)||!int(c.frenzies)||typeof c.accepted!=='boolean'||!(c.lastTrainingDay===null||int(c.lastTrainingDay,0,day)))return false;
  if(!Array.isArray(c.history)||c.history.length>80||!c.history.every(h=>int(h.day,0,day)&&text(h.title,160)&&text(h.text)))return false;
  if(!Array.isArray(c.exposures)||c.exposures.length>40||!c.exposures.every(h=>int(h.day,0,day)&&text(h.locationId,80)&&CURSE_ORDERS[h.regionId]&&text(h.description)&&int(h.severity,1,10)))return false;
  if(!Array.isArray(c.hunts)||c.hunts.length>32||new Set(c.hunts.map(h=>h.locationId)).size!==c.hunts.length||!c.hunts.every(h=>CURSE_ORDERS[h.regionId]&&text(h.locationId,80)&&h.policy===CURSE_ORDERS[h.regionId].policy&&h.order===CURSE_ORDERS[h.regionId].name&&int(h.heat,0,100)&&int(h.nextDay)&&['watch','summoned','custody','ended'].includes(h.status)&&int(h.captures)))return false;
  if(c.type==='vampire')return BLOOD_LINEAGES.some(l=>l.id===c.bloodline)&&int(c.humanity,0,100)&&int(c.starvedDays)&&int(c.lastFedDay,0,day)&&int(c.apparentAge,18,5000)&&(c.feedingPlan===null||text(c.feedingPlan?.agreementId,80))&&(c.frenzyHandled===undefined||typeof c.frenzyHandled==='boolean');
  return int(c.rage,0,100)&&int(c.moonsLived)&&int(c.mastery,0,100)&&c.feedingPlan===null;
}
export function curseEventIds(){return {curse_rare_meeting:['fight','withdraw','speak','leave','defer'],curse_frenzy:['contain','feed','hunt'],curse_hunters:['hide','fight','answer'],curse_trial:['records','escape','accept']};}
export function curseTimeBudget(s,requested,{outdoors=false,night=false}={}){
  const c=s.hero.condition;if(c?.type!=='vampire'||s.hero.hp<=0)return requested;
  const rate=bloodHungerRate(c),starved=c.starvedDays||0,latent=c.stage==='incubating'&&!c.reserveGranted;
  for(let days=1;days<=requested;days++){
    const starving=Math.max(0,days-Math.max(0,Math.floor((85-c.hunger)/rate)));
    const bodily=Math.floor((starved+starving)/2)-Math.floor(starved/2),daylight=outdoors&&!night?(latent?Math.max(0,s.day+days-Math.max(s.day,c.infectedDay+2)):days)*2:0;
    if(bodily+daylight>=s.hero.hp)return days;
  }
  return requested;
}

// Retain the public entry points used by earlier saves and engine callers.
export function queueRareNightEncounter(s,oldDay,context={}) { return queueNightDiscovery(s,oldDay,context); }
export function validateNightEncounters(v,s) { return validateNightDiscovery(v,s); }
