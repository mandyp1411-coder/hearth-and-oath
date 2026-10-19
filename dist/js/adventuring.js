import { isMazeEntry } from './maze-rules.js';
import { isRadiant, initializeRadiant, showRadiantRoom, applyRadiantChoice, resolveRadiantBattle, radiantReceipt, validateRadiant, validateRadiantHistory } from './radiant-descent.js';
import { DESCENT_PREMISES } from './field-notes-v25.js';
import { CONTRACT_FLAVOR } from './realm-content-v18.js';
import { seededRoll, isSettlement, generatePersonName } from './world.js';
import { generateCharacter } from './characters.js';
import { regionAt } from './realm.js';
import { dropEquipment, GEAR_CATALOG } from './gear.js';
import { isCanonicalAppearance } from './avatar.js';

const TYPES=['beast','undead','spirit','construct','bandit','aberration'];
const action=(id,label,description,days=0,cost=0,group='Adventuring',reason)=>({id,label,description,days,cost,group,...(reason?{disabledReason:reason}:{})});
const log=(s,ctx,title,text)=>{s.notice=text;(ctx.journalLiteral||ctx.journal)?.(title,text,'adventure');};
const active=s=>s.adventuring.contracts.filter(c=>['active','ready'].includes(c.status));
const safe=s=>s.age>=16&&s.phase!=='retired'&&!s.event&&!s.battle&&!s.dungeon&&!s.justice?.prison;
const replace=(text,c,s)=>text.replaceAll('{place}',s.world.locations.find(p=>p.id===c.destinationId)?.name||'the road').replaceAll('{giver}',c.giver.name).replaceAll('{target}',c.targetName);
const closed=c=>['done','abandoned'].includes(c.status);
function contractRecord(s,c){const flavor=CONTRACT_FLAVOR.find(f=>f.id===c.flavorId);return {id:c.id,title:flavor.title,objective:replace(flavor.brief,c,s),client:c.giver.name,boardId:c.boardId,boardName:s.world.locations.find(p=>p.id===c.boardId).name,destinationId:c.destinationId,destinationName:s.world.locations.find(p=>p.id===c.destinationId).name,result:c.status==='done'?'completed':'abandoned',acceptedDay:c.acceptedDay,closedDay:c.closedDay??null,recordedDay:s.day,reward:c.status==='done'?(c.paidGold??c.reward+(c.proof?.captured?15:0)):0,proof:c.proof?structuredClone(c.proof):null,attempts:structuredClone(c.attempts||[])};}
function archiveContract(s,c){if(!closed(c))return;s.adventuring.archive||=[];if(!s.adventuring.archive.some(row=>row.id===c.id))s.adventuring.archive.push(contractRecord(s,c));}
export function contractArchive(s){const rows=s.adventuring?.archive||[],seen=new Set(rows.map(row=>row.id));return [...rows,...(s.adventuring?.contracts||[]).filter(c=>closed(c)&&!seen.has(c.id)).map(c=>contractRecord(s,c))].map(row=>structuredClone(row));}
export function initializeAdventuring(s){
  if(s.adventuring)return;
  s.adventuring={version:1,season:Math.floor(s.day/92),contracts:[],loot:[],rations:0,runs:0,expedition:null,raid:null,claim:null,history:[]};
  populateContracts(s);
}
function populateContracts(s){
  const data=s.adventuring,season=Math.floor(s.day/92),old=data.contracts;
  for(const c of old)archiveContract(s,c);
  data.contracts=old.filter(c=>['active','ready'].includes(c.status)||c.season===season&&c.status==='offered');
  const archived=new Set((data.archive||[]).map(row=>row.id));
  for(const place of s.world.locations.filter(p=>isSettlement(s.world,p.id))){
    for(let slot=0;slot<3;slot++){
      const id=`contract-${place.id}-${season}-${slot}`;if(archived.has(id)||data.contracts.some(c=>c.id===id))continue;
      const f=CONTRACT_FLAVOR[seededRoll(s.seed,id+':flavor',CONTRACT_FLAVOR.length)],destinations=s.world.locations.filter(p=>p.id!==place.id),dest=destinations[seededRoll(s.seed,id+':destination',destinations.length)]||place;
      const years=24+seededRoll(s.seed,id+':age',35),giver={...generateCharacter(s.seed,id+':giver',{role:f.giverRole,age:years}),name:generatePersonName(s.seed,id+':giver'),age:years},tier=1+seededRoll(s.seed,id+':tier',3);
      const target=f.targetType==='bandit'?{...generateCharacter(s.seed,id+':target',{role:'Soldier',age:20+seededRoll(s.seed,id+':target-age',35)}),age:20+seededRoll(s.seed,id+':target-age',35)}:null;
      data.contracts.push({...(target?{target}:{}),id,flavorId:f.id,boardId:place.id,season,status:'offered',type:f.type,targetType:f.targetType,destinationId:dest.id,targetName:target?target.name:f.type==='bounty'?generatePersonName(s.seed,id+':target'):'the marked '+f.targetType,giver,tier,reward:30+tier*15+seededRoll(s.seed,id+':reward',31),acceptedDay:null,proof:null});
    }
  }
  // Only the current location needs its offered board persisted. Contracts at
  // other sites are reconstructed deterministically when reached.
  data.contracts=data.contracts.filter(c=>c.status!=='offered'||c.boardId===s.locationId);
  data.season=season;
}
export function onAdventuringTime(s){if(s.adventuring&&s.adventuring.season!==Math.floor(s.day/92))populateContracts(s);}
export function refreshAdventureBoard(s){if(s.adventuring)populateContracts(s);}
function contract(s,id){return s.adventuring.contracts.find(c=>c.id===id);}
function roomSpec(s,run){
  const salt=`descent:${run.id}:${run.floor}:${run.room}`,roll=seededRoll(s.seed,salt,100),kind=run.room===5?'stairs':run.room===4?'battle':roll<43?'battle':roll<62?'treasure':roll<77?'trap':roll<90?'shrine':'stranger';
  const types=run.theme==='ossuary'?['undead','spirit']:run.theme==='roots'?['beast','construct','aberration']:run.theme==='tower'?['bandit','construct','spirit']:['aberration','undead','construct'];
  return {kind,salt,type:types[seededRoll(s.seed,salt+':type',types.length)],title:{battle:'Something breathes beyond the door',treasure:'The room that kept its wealth',trap:'An old machine wakes',shrine:'An altar below the earth',stranger:'A traveler without a lantern',stairs:'Steps into deeper darkness'}[kind]};
}
function showRoom(s,ctx){
  const run=s.adventuring.expedition;if(!run)return;if(isRadiant(run)){showRadiantRoom(s,ctx);return;}const room=roomSpec(s,run);run.pendingKind=room.kind;
  if(ctx.pendingNeed?.())return;
  const prefix=`Floor ${run.floor}, chamber ${run.room+1}. `;
  const body={battle:'A distinct enemy formation waits in the dark. You can face it, attempt to slip past, or withdraw with what you have earned.',treasure:'A shut coffer rests beside a skeleton with its fingers pressed over the lock. Open it, or leave it undisturbed.',trap:'Dust stops at a row of iron teeth. A careful hand may disable the mechanism; haste risks injury.',shrine:'An undimmed coal glows upon black stone. A small offering can restore your party’s magic.',stranger:'A scarred delver offers supplies beside a guttering lamp. Their price reflects the depth, and they will not wait forever.',stairs:'This floor is explored. Descend for stronger enemies and richer finds, or carry your gains back into daylight.'}[room.kind];
  const choices=room.kind==='battle'?[{id:'fight',label:'Face the creatures',description:'Turn-based party combat; victory clears this room.'},{id:'sneak',label:'Try to slip past',description:`Stealth ${s.hero.skills.stealth} + half agility ${Math.floor(s.hero.attributes.agility/2)} = ${s.hero.skills.stealth+Math.floor(s.hero.attributes.agility/2)}; needs ${7+run.floor*2+seededRoll(s.seed,room.salt+':sneak',8)}. Below that total, this attempt starts combat.`}]:room.kind==='treasure'?[{id:'open',label:'Open the coffer',description:'Claim a distinct relic or useful materials, once.'},{id:'leave',label:'Leave it closed',description:'Walk on without taking its contents.'}]:room.kind==='trap'?[{id:'disarm',label:'Work on the mechanism',description:`Survival ${s.hero.skills.survival} + agility ${s.hero.attributes.agility} = ${s.hero.skills.survival+s.hero.attributes.agility}; needs ${8+run.floor*2+seededRoll(s.seed,room.salt+':trap',10)}. Below that total, the mechanism causes ${5+run.floor*2} injury.`},{id:'rush',label:'Cross quickly',description:'Take an injury and move on.'}]:room.kind==='shrine'?[...(s.hero.gold>=8?[{id:'offering',label:'Offer 8 gold',description:'Restore 10 magic to every living party member.'}]:[]),{id:'leave',label:'Pass the altar',description:'Keep your coin and continue.'}]:room.kind==='stranger'?[...(s.hero.gold>=12?[{id:'trade',label:'Buy one draught for 12 gold',description:'A real potion is added to party supplies.'}]:[]),{id:'talk',label:'Share a word in the dark',description:'A seeded account of another delver’s fate.'}]:[...(run.floor<6?[{id:'descend',label:'Descend another floor',description:'Stronger enemies; no character or loot reset.'}]:[]),{id:'return',label:'Return to the surface',description:'End the expedition and keep earned loot.'}];
  choices.push({id:'withdraw',label:'Withdraw to the surface',description:'Leave now with existing gains. This room gives no further reward.'});
  ctx.setEvent('adventure_room',room.title,'The descent',prefix+body,choices);
}
function advance(s,ctx){const run=s.adventuring.expedition;run.cleared.push(`${run.floor}:${run.room}`);run.room++;run.pendingKind=null;run.pendingBattle=false;if(run.room>5){run.floor++;run.room=0;}showRoom(s,ctx);}
function peacefulRoute(s,c){
 const needed=c.type==='escort'?{survival:6+c.tier*2,persuasion:3+c.tier}:c.type==='relic'?{scholarship:8+c.tier*2,arcana:4+c.tier*2}:c.targetType==='bandit'?{persuasion:10+c.tier*3,stealth:3+c.tier}:null;
 if(!needed)return null;return {days:c.type==='relic'?4:3,method:c.type==='escort'?'safe-route':c.type==='relic'?'deciphered':'surrender',label:c.type==='escort'?'Chart and complete a safer escort':c.type==='relic'?'Decipher access to the sealed relic':'Negotiate the named outlaw’s surrender',needed,reason:Object.entries(needed).filter(([skill,n])=>s.hero.skills[skill]<n).map(([skill,n])=>`${skill} ${n}`).join(' · ')};
}
export function adventureActions(s){
  if(!s.adventuring||!safe(s))return [];
  const d=s.adventuring;if(d.expedition)return [action('adventure_continue','Continue the descent','Return to the same saved chamber; rooms and rewards never reroll.'),action('adventure_withdraw','Leave the descent','Keep earned relics and materials and return to the surface.')];
  const result=[];
  for(const c of d.contracts.filter(c=>c.status==='offered'&&c.boardId===s.locationId)) {const f=CONTRACT_FLAVOR.find(f=>f.id===c.flavorId);result.push(action('adventure_accept_'+c.id,`Accept: ${f.title}`,`${replace(f.brief,c,s)} ${c.reward} gold on verified completion.`,0,0,'Contracts',active(s).length>=4?'Finish or abandon a contract before taking another.':null));}
  for(const c of active(s)){
    const f=CONTRACT_FLAVOR.find(f=>f.id===c.flavorId);
    if(c.paused){result.push(action('adventure_abandon_'+c.id,`Abandon: ${f.title}`,'Close this paused undertaking without claiming a reward.',0,0,'Contracts'));continue;}
    if(c.status==='ready')result.push(action('adventure_claim_'+c.id,`Claim: ${f.title}`,`Present your earned proof to ${c.giver.name}; receive ${c.reward+(c.proof?.captured?15:0)} gold.`,0,0,'Contracts',s.locationId!==c.boardId?'Return to the contract’s original board.':null));
    else if(s.locationId===c.destinationId)result.push(action('adventure_pursue_'+c.id,`${c.type==='escort'?'Protect the traveler':c.type==='relic'?'Search the sealed chamber':'Pursue'}: ${f.title}`,isMazeEntry(s,'adventure_pursue_'+c.id)?`One day to enter a tier ${c.tier} saved maze, not a single encounter. Walking uses Focus and sometimes calendar days; unseen rooms and enemies stay unknown. Earn proof at the deep objective, leave by an actual stair, then return to the giver for payment.`:`A tier ${c.tier} ${c.targetType} encounter. The contract pays only after earned proof and a return to the giver.`,1,0,'Contracts',s.hero.hp<12?'Recover to at least 12 health.':null));
    if(c.status==='active'&&s.locationId===c.destinationId){const route=peacefulRoute(s,c);if(route)result.push(action('adventure_resolve_'+c.id,`${route.label}: ${f.title}`,`${route.days-(c.fieldDays||0)} days of attended field work. ${Object.entries(route.needed).map(([k,n])=>k+' '+n).join(' · ')} required. Earn proof and return for payment without a fight.`,0,0,'Contracts',route.reason?'Requires '+route.reason:null));}
    result.push(action('adventure_abandon_'+c.id,`Abandon: ${f.title}`,'Close this undertaking without claiming its reward.',0,0,'Contracts'));
  }
  result.push(action('adventure_descend','Enter an uncharted descent',isMazeEntry(s,'adventure_descend')?'Spend one day and 1 ration to enter a saved short, medium or deep maze. Walking uses Focus and sometimes calendar days. Supplies and party reserves persist; find safe rooms to camp and use an actual stair to return.':'Six saved floors of chambers. Spend one day and 1 ration to enter; continue or withdraw with your earned belongings.',1,0,'Wizardry',d.rations<1?'Buy expedition rations at a settlement shop.':s.hero.hp<16?'Recover to at least 16 health.':null));
  return result;
}
export function applyAdventureAction(s,id,ctx){
  const a=adventureActions(s).find(a=>a.id===id);if(!a||a.disabledReason)return false;
  if(id==='adventure_continue'){showRoom(s,ctx);return true;}
  if(id==='adventure_withdraw'){endRun(s,ctx);return true;}
  const key=id.replace(/^adventure_(accept|claim|abandon|pursue|resolve)_/,''),c=contract(s,key);
  if(id.startsWith('adventure_accept_')){c.status='active';c.acceptedDay=s.day;log(s,ctx,'An undertaking accepted',`${c.giver.name} entrusts you with ${CONTRACT_FLAVOR.find(f=>f.id===c.flavorId).title}. ${replace(CONTRACT_FLAVOR.find(f=>f.id===c.flavorId).brief,c,s)}`);return true;}
  if(id.startsWith('adventure_claim_')){if(c.status!=='ready'||!c.proof||s.locationId!==c.boardId)return false;c.status='done';c.closedDay=s.day;const reward=c.reward+(c.proof.captured?15:0);c.paidGold=reward;s.hero.gold+=reward;ctx.earnExperience(12+c.tier*8);archiveContract(s,c);log(s,ctx,'A contract fulfilled',`${c.giver.name} accepts your ${c.proof.captured?'living captive':'earned proof'} and pays ${reward} gold. ${CONTRACT_FLAVOR.find(f=>f.id===c.flavorId).moralAngle}`);return true;}
  if(id.startsWith('adventure_abandon_')){c.status='abandoned';c.closedDay=s.day;archiveContract(s,c);log(s,ctx,'An undertaking left behind','You close the contract without receiving its promised payment.');return true;}
  if(id.startsWith('adventure_resolve_')){
    const route=peacefulRoute(s,c),actual=ctx.spendDays(route.days-(c.fieldDays||0),{outdoors:true});c.fieldDays=(c.fieldDays||0)+actual;
    if(s.phase==='retired')return true;
    if(c.fieldDays===route.days){c.status='ready';c.proof={battleId:`field-proof:${c.id}`,method:route.method,day:s.day,captured:route.method==='surrender'};s.hero.skills[c.type==='relic'?'scholarship':c.type==='escort'?'survival':'persuasion']++;log(s,ctx,'Proof earned without a battle',`${route.label.toLowerCase()} is completed through ${route.days} real days. ${c.giver.name} can verify the dated account at the original board. No combat spoils were claimed.`);}else s.notice='The field work pauses for a calendar need. Your attended days remain recorded.';return true;
  }
  const taken=ctx.spendDays(a.days,{outdoors:true});if(taken!==a.days||s.phase==='retired'){s.notice='The calendar interrupts the departure. No supplies were consumed and no encounter began.';return true;}
  if(id==='adventure_descend'){s.adventuring.rations--;s.adventuring.runs++;const themes=['ossuary','roots','tower','abyss'],theme=themes[seededRoll(s.seed,'descent-theme:'+s.adventuring.runs,4)];s.adventuring.expedition={id:`run-${s.dynasty?.generation||1}-${s.adventuring.runs}`,locationId:s.locationId,startDay:s.day,theme,floor:1,room:0,cleared:[],pendingKind:null,pendingBattle:false,localStory:{version:25,...structuredClone(DESCENT_PREMISES[seededRoll(s.seed,'descent-premise:'+s.adventuring.runs,3)]),sourceName:s.realm?.sites[s.locationId]?.keeper?.name||'The old board',clueFound:false,relicClaimed:false}};initializeRadiant(s,s.adventuring.expedition);log(s,ctx,'A rumor before the stairs',s.adventuring.expedition.localStory.sourceName+': '+s.adventuring.expedition.localStory.rumor);showRoom(s,ctx);if(s.event&&s.adventuring.expedition.localStory)s.event.body+=' '+s.adventuring.expedition.localStory.rumor;}
  else if(c){ctx.startBattle('free_'+c.targetType,{kind:'adventure',mode:'contract',token:c.id,locationId:s.locationId});}
  else if(id.startsWith('adventure_roam_')){const type=id.slice(15);ctx.startBattle('free_'+type,{kind:'adventure',mode:'roam',token:`roam-${s.flags.battlesStarted||0}`,locationId:s.locationId});}
  else return false;return true;
}
function endRun(s,ctx){const run=s.adventuring.expedition;if(!run)return;const receipt=isRadiant(run)?radiantReceipt(s,run,ctx):null;s.adventuring.history.push({id:run.id,locationId:run.locationId,startDay:run.startDay,endDay:s.day,floor:run.floor,rooms:run.cleared.length,...(receipt||{})});if(s.adventuring.history.length>80)s.adventuring.history.shift();s.adventuring.expedition=null;log(s,ctx,'Daylight after the descent',`You return from floor ${run.floor} with your earned belongings.${receipt?receipt.objectiveCompleted?` ${receipt.objectiveTitle}: ${receipt.objectiveGold} gold and ${receipt.objectiveExp} field experience earned once.`:' The local objective was left unfinished; no objective payment was granted.':''} The next descent has its own chambers and dangers.`);}
export function applyAdventureChoice(s,eventId,id,ctx){
  if(eventId!=='adventure_room'||!s.adventuring?.expedition)return false;
  const run=s.adventuring.expedition;if(isRadiant(run))return applyRadiantChoice(s,id,ctx,{awardLoot,endRun});const room=roomSpec(s,run);if(run.pendingKind!==room.kind)return false;
  if(['withdraw','return'].includes(id)){endRun(s,ctx);return true;}
  const taken=ctx.spendDays(1);if(taken!==1||s.phase==='retired'){s.notice='The calendar interrupts the chamber. Continue after the waiting need.';return true;}
  if(room.kind==='battle'){
    if(id==='sneak'&&s.hero.skills.stealth+Math.floor(s.hero.attributes.agility/2)>=7+run.floor*2+seededRoll(s.seed,room.salt+':sneak',8)){log(s,ctx,'A door passed in silence','You slip beyond the creatures. No combat reward is granted.');advance(s,ctx);return true;}
    if(!['fight','sneak'].includes(id))return false;
    run.pendingBattle=true;ctx.startBattle('free_'+room.type,{kind:'adventure',mode:'descent',token:run.id,room:`${run.floor}:${run.room}`,locationId:s.locationId});return true;
  }
  const premise=run.localStory;if(premise&&!premise.clueFound&&run.floor>=2){premise.clueFound=true;log(s,ctx,'The rumor has a physical trace',`${premise.sourceName}’s lead: ${premise.clue} This supports a narrower account, not every old claim.`);}
  if(room.kind==='treasure'){if(id==='open'){awardLoot(s,room.salt,run.floor,ctx);if(premise?.clueFound&&!premise.relicClaimed&&s.adventuring.loot.length<160){s.adventuring.loot.push({id:'story-'+run.id,name:premise.relic,value:45,stolen:false,source:s.locationId,day:s.day});premise.relicClaimed=true;log(s,ctx,'The lead returned as a thing you can carry',`${premise.relic}: ${premise.clue} The recovered item belongs to this descent’s original lead.`);}}else if(id!=='leave')return false;}
  else if(room.kind==='trap'){if(!['disarm','rush'].includes(id))return false;const passed=id==='disarm'&&s.hero.skills.survival+s.hero.attributes.agility>=8+run.floor*2+seededRoll(s.seed,room.salt+':trap',10);if(passed){s.hero.skills.survival++;log(s,ctx,'The teeth fall still','You disable the trap and pass without injury.');}else{s.hero.hp=Math.max(1,s.hero.hp-5-run.floor*2);log(s,ctx,'An ancient trap strikes',`The mechanism costs ${5+run.floor*2} health. Your remaining resources carry onward.`);}}
  else if(room.kind==='shrine'){if(id==='offering'){if(s.hero.gold<8)return false;s.hero.gold-=8;for(const p of [s.hero,...s.companions.filter(p=>p.recruited&&p.active)])p.mp=Math.min(p.maxMp,p.mp+10);log(s,ctx,'A coal rekindled','The offering restores 10 magic to each active party member.');}else if(id!=='leave')return false;}
  else if(room.kind==='stranger'){if(id==='trade'){if(s.hero.gold<12)return false;s.hero.gold-=12;s.hero.potions++;}else if(id==='talk'){const tales=['a stair that descended into somebody else’s childhood','a knight whose mask wept river water','a shrine keeper hunting their own shadow','an empty village that filled with voices at dawn'];log(s,ctx,'Another delver’s road','The stranger speaks of '+tales[seededRoll(s.seed,room.salt+':tale',4)]+'.');}else return false;}
  else if(room.kind==='stairs'){if(id!=='descend'||run.floor>=6)return false;run.floor++;run.room=0;showRoom(s,ctx);return true;}
  advance(s,ctx);return true;
}
export function awardLoot(s,salt,tier,ctx){
  const first=['Ashen','Buried','Moon-worn','Gilded','Cracked','Saint’s','Serpent’s','Salt-black'],last=['reliquary','seal','idol','chalice','coin hoard','bone comb','iron mask','star lens'];
  const name=first[seededRoll(s.seed,salt+':name',8)]+' '+last[seededRoll(s.seed,salt+':kind',8)],value=12+tier*12+seededRoll(s.seed,salt+':value',41);
  const id=`loot-${s.dynasty?.generation||1}-${s.flags.battlesStarted||0}-${s.day}-${seededRoll(s.seed,salt,1000000)}`;
  if(s.adventuring.loot.some(l=>l.id===id))return;
  if(s.adventuring.loot.length>=160){log(s,ctx,'A pack already full',`You leave ${name} where it lies. Sell some relics at a surviving shop to make room; your existing belongings remain.`);return;}
  s.adventuring.loot.push({id,name,value,stolen:false,source:s.locationId,day:s.day});
  const materials=['ore','cloth','wood','stone','hide','crystal'],mat=materials[seededRoll(s.seed,salt+':material',6)],amount=1+seededRoll(s.seed,salt+':amount',3);s.equipment.materials[mat]+=amount;
  if(seededRoll(s.seed,salt+':gear',100)<55){const gear=dropEquipment(s,salt,tier,ctx);if(gear){log(s,ctx,'Useful tools among the spoils',`You recover ${gear.name}, ${name}, and ${amount} ${mat}. Compare its slot bonuses in Gear & pack, or sell it.`);return;}}
  log(s,ctx,'Spoils carried home',`You recover ${name} and ${amount} ${mat}. A settlement merchant can buy the relic.`);
}
export function afterAdventureBattle(s,pending,completed,ctx){
  const c=pending.context;if(c?.kind!=='adventure'||!s.adventuring)return;
  if(c.mode==='country'&&s.cartography?.wilderness)delete s.cartography.wilderness.battle;
  if(c.mode==='contract'){const item=contract(s,c.token);if(item){item.attempts||=[];if(!item.attempts.some(a=>a.battleId===pending.instanceId))item.attempts.push({battleId:pending.instanceId,day:s.day,outcome:completed.outcome});}}
  if(completed.outcome==='victory'){
    const tier=adventureEncounter(s,c).tier;awardLoot(s,pending.instanceId,tier,ctx);
    if(c.mode==='contract'){const item=contract(s,c.token);if(item&&item.status==='active'){item.status='ready';item.proof={battleId:pending.instanceId,day:s.day,captured:Boolean(completed.actors.find(a=>a.id==='enemy-1')?.status.captured)};log(s,ctx,'Proof earned',`The ${item.type} is complete. Return to ${item.giver.name} at ${s.world.locations.find(p=>p.id===item.boardId).name} for payment.`);}}
    else if(c.mode==='descent'){if(isRadiant(s.adventuring.expedition))resolveRadiantBattle(s,ctx);else advance(s,ctx);}
    else if(c.mode==='raid'){const raid=s.adventuring.raid,war=s.realm.wars.find(w=>w.id===raid?.warId);if(war){war.balance+=raid.regionId===war.a?1:-1;s.realm.sites[c.locationId].security=Math.min(100,s.realm.sites[c.locationId].security+5);ctx.standing('villagers',-4);}s.adventuring.raid=null;}
    else if(c.mode==='conquest'){const site=s.realm.sites[c.locationId];site.owner=s.dynasty?.activePersonId||'hero';site.rule='force';site.prosperity=Math.max(0,site.prosperity-10);site.security=Math.max(0,site.security-15);ctx.addEvidence(4,'The surviving watch identifies your violent seizure of this settlement.');ctx.standing('villagers',-15);ctx.standing('underworld',8);ctx.breakOath('You seized a settlement through violence.');s.adventuring.claim=null;log(s,ctx,'A holding taken by force','The regional watch falls back. You control the holding, but criminal reports and the cost to its households remain.');}
  }else if(c.mode==='descent'){const consequence=s.notice;endRun(s,ctx);s.notice=consequence+' '+s.notice;}
  else if(c.mode==='raid')s.adventuring.raid=null;
  else if(c.mode==='conquest')s.adventuring.claim=null;
}
export function adventureEncounter(s,c){
 if(c?.kind==='maze'&&s.maze){const target=s.maze.kind==='contract'&&c.roomId===String(s.maze.guardianRoom)?contract(s,s.maze.sourceId):null;return {tier:s.maze.tier,salt:s.maze.seed+':enemy:'+c.roomId,targetName:target?.type==='bounty'?target.targetName:null,targetPerson:target?.target||null,captureAllowed:target?.type==='bounty'&&target.targetType==='bandit',title:s.maze.title};}
  const item=c?.mode==='contract'?contract(s,c.token):null,run=c?.mode==='descent'?s.adventuring.expedition:null;
  return {tier:item?.tier||run?.floor||(c?.mode==='conquest'?3:Math.min(4,1+Math.floor(s.hero.level/4))),salt:c?`${c.mode}:${c.token}:${c.room||''}`:`free:${s.flags.battlesStarted||0}`,targetName:item?.type==='bounty'?item.targetName:null,targetPerson:item?.target||null,captureAllowed:item?.type==='bounty'&&item.targetType==='bandit',title:item?CONTRACT_FLAVOR.find(f=>f.id===item.flavorId).title:run?`The ${run.theme} — floor ${run.floor}`:c?.mode==='raid'?'War on the road':c?.mode==='conquest'?'The regional watch stands against you':'An unpromised encounter'};
}
export function validAdventureContext(s,c){
  if(!s.adventuring||c.kind!=='adventure'||c.locationId!==s.locationId)return false;
  if(c.mode==='country'){const p=s.cartography?.wilderness?.battle;return !!p&&p.key===s.cartography.position&&p.token===c.token;}
  if(c.mode==='contract'){const item=contract(s,c.token);return Boolean(item&&item.status==='active'&&item.destinationId===s.locationId);}
  if(c.mode==='descent'){const run=s.adventuring.expedition;return Boolean(run&&run.id===c.token&&run.pendingBattle&&c.room===`${run.floor}:${run.room}`);}
  if(c.mode==='raid')return s.adventuring.raid?.warId===c.token;
  if(c.mode==='conquest')return s.adventuring.claim?.locationId===c.locationId&&c.token==='claim-'+c.locationId;
  return c.mode==='roam'&&/^roam-\d+$/.test(c.token);
}
export function adventureEventIds(){return {adventure_room:['fight','sneak','open','leave','disarm','rush','offering','trade','talk','descend','return','withdraw','study','parley','repair','record','camp','ascend',...Array.from({length:6},(_,i)=>'route_'+i)]};}
export function adventureView(s){if(!s.adventuring)return null;return {contracts:s.adventuring.contracts.filter(c=>c.boardId===s.locationId||['active','ready'].includes(c.status)).map(c=>({...c,title:CONTRACT_FLAVOR.find(f=>f.id===c.flavorId).title,brief:replace(CONTRACT_FLAVOR.find(f=>f.id===c.flavorId).brief,c,s),destination:s.world.locations.find(p=>p.id===c.destinationId).name,board:s.world.locations.find(p=>p.id===c.boardId).name})),expedition:s.adventuring.expedition,loot:s.adventuring.loot,rations:s.adventuring.rations,history:s.adventuring.history};}
export function validateAdventuring(d,s){
  const int=(n,min=0,max=10000000)=>Number.isInteger(n)&&n>=min&&n<=max,site=id=>s.world.locations.some(p=>p.id===id),str=(t,n=160)=>typeof t==='string'&&t.length<=n;
  if(!d||d.version!==1||!int(d.season)||!int(d.rations,0,10000)||!int(d.runs)||!Array.isArray(d.contracts)||d.contracts.length>60||new Set(d.contracts.map(c=>c.id)).size!==d.contracts.length||!Array.isArray(d.loot)||d.loot.length>160||new Set(d.loot.map(l=>l.id)).size!==d.loot.length)return false;
  if(!d.contracts.every(c=>str(c.id)&&CONTRACT_FLAVOR.some(f=>f.id===c.flavorId&&f.type===c.type&&f.targetType===c.targetType)&&site(c.boardId)&&site(c.destinationId)&&int(c.season)&&['offered','active','ready','done','abandoned'].includes(c.status)&&str(c.targetName)&&(c.target===undefined||c.target&&str(c.target.name,120)&&c.target.name===c.targetName&&isCanonicalAppearance(c.target.appearance)&&int(c.target.age,18,100))&&c.giver&&str(c.giver.name,120)&&isCanonicalAppearance(c.giver.appearance)&&int(c.tier,1,3)&&int(c.reward,1,1000)&&(c.acceptedDay===null||int(c.acceptedDay))&&(c.proof===null||str(c.proof.battleId,256)&&int(c.proof.day)&&typeof c.proof.captured==='boolean')&&(!['ready','done'].includes(c.status)||c.proof)))return false;
  for(const c of d.contracts){if(c.fieldDays!==undefined&&!int(c.fieldDays,0,4))return false;if(c.proof?.method!==undefined){const route=peacefulRoute(s,c);if(!route||c.proof.method!==route.method||c.fieldDays!==route.days||c.proof.battleId!==`field-proof:${c.id}`||c.proof.captured!==(route.method==='surrender'))return false;}}
  const attempts=rows=>Array.isArray(rows)&&new Set(rows.map(a=>a.battleId)).size===rows.length&&rows.every(a=>str(a.battleId,256)&&int(a.day,0,s.day)&&['victory','defeat','retreat'].includes(a.outcome));
  for(const c of d.contracts)if(c.paused!==undefined&&typeof c.paused!=='boolean'||c.closedDay!==undefined&&!int(c.closedDay,0,s.day)||c.paidGold!==undefined&&!int(c.paidGold)||c.attempts!==undefined&&!attempts(c.attempts))return false;
  if(d.archive!==undefined&&(!Array.isArray(d.archive)||new Set(d.archive.map(c=>c.id)).size!==d.archive.length||!d.archive.every(c=>str(c.id)&&str(c.title,1000)&&str(c.objective,6000)&&str(c.client,120)&&site(c.boardId)&&site(c.destinationId)&&str(c.boardName,1000)&&str(c.destinationName,1000)&&['completed','abandoned'].includes(c.result)&&(c.acceptedDay===null||int(c.acceptedDay,0,s.day))&&(c.closedDay===null||int(c.closedDay,0,s.day))&&int(c.recordedDay,0,s.day)&&int(c.reward)&&(c.proof===null||str(c.proof.battleId,256)&&int(c.proof.day,0,s.day)&&typeof c.proof.captured==='boolean')&&(c.result!=='completed'||c.proof)&&attempts(c.attempts))))return false;
  if(active(s).length>4||!d.loot.every(l=>str(l.id)&&str(l.name)&&int(l.value,1,10000)&&typeof l.stolen==='boolean'&&site(l.source)&&int(l.day)))return false;
  const run=d.expedition;if(run&&(!str(run.id)||!site(run.locationId)||run.locationId!==s.locationId||!int(run.startDay)||!['ossuary','roots','tower','abyss'].includes(run.theme)||!int(run.floor,1,6)||!int(run.room,0,5)||!Array.isArray(run.cleared)||run.cleared.length>36||new Set(run.cleared).size!==run.cleared.length||!run.cleared.every(k=>/^([1-6]):([0-5])$/.test(k))||typeof run.pendingBattle!=='boolean'||!(run.pendingKind===null||(isRadiant(run)?['battle','treasure','trap','safe','landmark','stairs']:['battle','treasure','trap','shrine','stranger','stairs']).includes(run.pendingKind))))return false;
  if(run&&!validateRadiant(s,run))return false;
  if(d.raid&&(!s.realm?.wars.some(w=>w.id===d.raid.warId&&w.status==='active')||!s.realm.regions.some(r=>r.id===d.raid.regionId)||!site(d.raid.locationId)))return false;
  if(d.claim&&(!site(d.claim.locationId)||d.claim.locationId!==s.locationId||!s.realm.regions.some(r=>r.id===d.claim.regionId)))return false;
  return Array.isArray(d.history)&&d.history.length<=80&&d.history.every(h=>str(h.id)&&site(h.locationId)&&int(h.startDay)&&int(h.endDay)&&int(h.floor,1,6)&&int(h.rooms,0,36)&&validateRadiantHistory(h));
}
