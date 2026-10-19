import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {generateCharacter} from '../dist/js/characters.js';
import {makeTournamentOffer,validateAdultTournament,tournamentProfileOrder,tournamentScore,finishTournament,selectedRival} from '../dist/js/adult-tournament-state.js';
import {HUMAN_DUEL_PROFILE_IDS,DUEL_ADVANCED_COMMANDS,humanDuelProfile,duelCommandAllowed,tournamentActionPolicy,validHumanDuelPlan,prohibitedDuelState} from '../dist/js/tournament-duel-rules.js';
import {applyTournamentAction,applyTournamentChoice,tournamentChoiceReason,reconcileTournament} from '../dist/js/adult-tournament.js';
import {initializeNpcContinuity,observeNpcContinuity} from '../dist/js/npc-continuity.js';
import {residentContacts} from '../dist/js/world-people-v31.js';
import {settlementServices} from '../dist/js/world-services.js';
import {validateConversations} from '../dist/js/conversations.js';
function fixture(){
 const s={seed:'watchhouse-domain',day:100,age:23,phase:'adult',difficulty:'balanced',locationId:'home',dynasty:{activePersonId:'hero-one'},hero:{hp:53,maxHp:53,mp:25,maxMp:25,potions:2},world:{locations:[{id:'home'}]},npcContinuity:{slots:{},people:{}},battle:null,event:null};
 function person(id,role,kind,index){const p={...generateCharacter(s.seed,id,{role,age:30}),id,name:'Person '+index,role,age:30,locationId:'home',roomId:kind==='service'?'watch':'market'};const key=kind+':home:'+index;s.npcContinuity.slots[key]={kind,siteId:'home',...(kind==='service'?{service:'watch'}:{index}),personId:id};s.npcContinuity.people[id]={slotKey:key,snapshot:{...p},ageBasis:{kind:'born',bornDay:s.day-30*365},retiredDay:null,retireDay:s.day+36500};return p;}
 const host=person('captain','Watch Captain','service',0),candidates=Array.from({length:6},(_,i)=>person('resident-'+i,'Cooper','town',i));
 s.adultTournament=makeTournamentOffer(s,host,candidates,{regionId:'rainward',regionName:'The Rainward March'});return s;
}
function receipt(s,i,outcome='win'){const t=s.adultTournament,p=t.opponents[i],profile=humanDuelProfile(p.profileId,t.difficulty);return {boutIndex:i,opponentId:p.id,profileId:p.profileId,battleId:'test-battle-'+i,day:s.day,outcome,rounds:3,heroMaxHp:53,heroMaxMp:25,heroStartHp:53,heroEndHp:outcome==='loss'?0:30,heroStartMp:25,heroEndMp:12,opponentEndHp:outcome==='win'?0:profile.hp-10,potionsStart:2,potionsEnd:1};}
function accept(s){Object.assign(s.adultTournament,{acceptedDay:s.day,paidDays:1,stage:'ready'});return s;}
function publicOffer(absent=[]){
 const s=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
 s.cartography.interior={siteId:s.locationId,roomId:'watch'};s.conversations.servicePeople={};s.conversations.meetings={};for(const key of absent)delete s.conversations[key];
 initializeNpcContinuity(s);observeNpcContinuity(s,[...settlementServices(s).map(p=>p.person),...residentContacts(s)]);
 const ctx={setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};},spendDays:days=>{s.day+=days;}};
 assert.equal(applyTournamentAction(s,'tournament_invite',ctx),true);return {s,ctx};
}
test('one deterministic real roster and three public non-boss styles, with no input mutation',()=>{const s=fixture(),a=structuredClone(s.adultTournament),p=tournamentProfileOrder(s.seed,'hero-one','home');assert.equal(new Set(a.opponents.map(p=>p.id)).size,3);assert.deepEqual(a.opponents.map(p=>p.profileId),p);assert.equal(validateAdultTournament(s),true);assert.deepEqual(fixture().adultTournament,a);assert.equal(HUMAN_DUEL_PROFILE_IDS.length,3);for(const id of p){const q=humanDuelProfile(id);assert.ok(q.cycle.every(p=>['ward','strike','charge','charged_strike','guard_breaking_strike','weakening_strike'].includes(p.action)));assert.equal(q.bossId,undefined);assert.equal(humanDuelProfile(id,'perilous').attackPower,q.attackPower+1);}});
test('closed command policy inspects actual variants, does not invent tools, and leaves ordinary arrays identical',()=>{const warrior={role:'warrior',specialization:null};for(const id of ['attack','defend','inspect','potion','retreat','weapon_counter'])assert.equal(duelCommandAllowed(warrior,id),true,id);for(const id of ['capture','surrender','hold_back','blood','bloodline','feral','spell_fire','tech_venom_edge','tech_grave_attendant','tech_execution_window','unknown'])assert.equal(duelCommandAllowed(warrior,id),false,id);assert.equal(duelCommandAllowed({role:'mage',specialization:'elementalist'},'skill'),false);assert.equal(duelCommandAllowed({role:'mage',specialization:'necromancer'},'skill'),false);for(const specialization of ['ranger','assassin','necromancer'])assert.equal(duelCommandAllowed({role:'rogue',specialization},'tactic'),false);assert.equal(duelCommandAllowed({role:'rogue',specialization:null},'tactic'),false);for(const id of DUEL_ADVANCED_COMMANDS)assert.equal(duelCommandAllowed(warrior,'tech_'+id),true);const rows=[{id:'attack'},{id:'blood'}];assert.equal(tournamentActionPolicy({},rows),rows);const filtered=tournamentActionPolicy({tournamentRulesVersion:1,context:{kind:'tournament'},currentActorId:'hero',actors:[{id:'hero',...warrior}]},rows);assert.equal(filtered[0],rows[0]);assert.ok(filtered[1].disabledReason);assert.equal(rows[1].disabledReason,undefined);});
test('three wins grant the once-only 24 Gold receipt and no second award after round-trip',()=>{const s=accept(fixture()),t=s.adultTournament;t.results=[0,1,2].map(i=>receipt(s,i));assert.equal(finishTournament(t,s.day,'completed'),24);assert.equal(validateAdultTournament(s),true);assert.deepEqual(tournamentScore(t),{wins:3,losses:0,played:3});assert.equal(finishTournament(t,s.day,'completed'),0);const loaded=JSON.parse(JSON.stringify(s));assert.equal(validateAdultTournament(loaded),true);assert.equal(finishTournament(loaded.adultTournament,s.day,'completed'),0);assert.deepEqual(selectedRival(t),{boutIndex:2,personId:t.opponents[2].id});});
test('loss, withdrawal and unavailable closure retain actual results with no purse',()=>{for(const reason of ['completed','withdrawn','unavailable','life_closed']){const s=accept(fixture()),t=s.adultTournament;t.results=reason==='completed'?[receipt(s,0),receipt(s,1,'loss'),receipt(s,2)]:[receipt(s,0,'loss')];assert.equal(finishTournament(t,s.day,reason),0);assert.equal(t.prize,null);assert.equal(validateAdultTournament(s),true);assert.equal(t.recognition.personId,t.opponents[reason==='completed'?1:0].id);}});
test('rejects source identity, plan order, score, prize, unknown keys and cross-owner corruption without throwing',()=>{const mutations=[s=>s.adultTournament.opponents[0].id='invented',s=>s.adultTournament.host.name='Replacement',s=>s.adultTournament.opponents[0].profileId='boss',s=>s.adultTournament.score=3,s=>s.adultTournament.prize={amount:24},s=>s.adultTournament.ownerId='someone-else',s=>s.adultTournament.opponents=null,s=>s.adultTournament.stage='bout'];for(const mutate of mutations){const s=fixture();mutate(s);assert.equal(validateAdultTournament(s),false);}const s=accept(fixture());s.adultTournament.results=[receipt(s,0)];s.adultTournament.results[0].heroEndHp=0;assert.equal(validateAdultTournament(s),false);});
test('old saves and ordinary battles have no required tournament state',()=>{const s=fixture();delete s.adultTournament;assert.equal(validateAdultTournament(s),true);s.battle={context:{kind:'rpg'}};assert.equal(validateAdultTournament(s),true);s.battle.context.kind='tournament';assert.equal(validateAdultTournament(s),false);});
test('acceptance lazily creates optional conversation dictionaries for the exact existing public participants',()=>{
 // Domain-only acceptance against an archived public life and its actual NPC
 // catalog. No engine import, invented participant, combat or calendar runner.
 for(const absent of [['servicePeople'],['meetings'],['servicePeople','meetings']]){
  const {s,ctx}=publicOffer(absent);
  const publicIds=new Set([...settlementServices(s).map(p=>p.personId),...residentContacts(s).map(p=>p.id)]),day=s.day,gold=s.hero.gold;
  assert.equal(validateConversations(s.conversations,s),true);
  assert.equal(s.day,day);for(const key of absent)assert.equal(s.conversations[key],undefined);
  const people=[s.adultTournament.host,...s.adultTournament.opponents];assert.ok(people.every(p=>publicIds.has(p.id)));const source=structuredClone(s.npcContinuity.people);
  s.event=null;assert.equal(applyTournamentChoice(s,'tournament_invitation','enter',ctx),true);
  assert.equal(s.adultTournament.stage,'ready');assert.equal(s.adultTournament.paidDays,1);assert.equal(s.day,day+1);assert.equal(s.hero.gold,gold);
  assert.deepEqual(Object.keys(s.conversations.servicePeople),[s.adultTournament.host.id]);assert.deepEqual(Object.keys(s.conversations.meetings).sort(),people.map(p=>p.id).sort());
  assert.ok(people.every(p=>Object.hasOwn(s.conversations.relationships,p.id)));
  assert.deepEqual(Object.keys(s.socialLife.met).sort(),s.adultTournament.opponents.map(p=>p.id).sort());assert.deepEqual(s.npcContinuity.people,source);
  assert.equal(validateConversations(s.conversations,s),true);assert.equal(validateAdultTournament(s),true);
  for(const p of people)assert.deepEqual(s.conversations.meetings[p.id],{locationId:s.locationId,firstDay:day,lastDay:day});
 }
});
test('whole-cast capacity rejects before mutation and full books preserve existing participant records',()=>{
 const {s:offered}=publicOffer();offered.event=null;
 const fill=(saved,n)=>{for(let i=0;Object.keys(saved).length<n;i++)saved['known-'+i]={retained:'Earlier contact '+i};};
 for(const key of ['servicePeople','relationships','meetings','met']){
  const s=structuredClone(offered),saved=key==='met'?s.socialLife.met:s.conversations[key];fill(saved,512);
  assert.match(tournamentChoiceReason(s,'tournament_invitation','enter'),/cannot retain every named participant/);const before=structuredClone(s);
  assert.equal(applyTournamentChoice(s,'tournament_invitation','enter',{spendDays:()=>{throw Error('Full contact books cannot spend attendance.');}}),false);assert.deepEqual(s,before);
 }
 const s=structuredClone(offered),cast=[s.adultTournament.host,...s.adultTournament.opponents],captain=cast[0];
 const service={...captain,baseAge:captain.age-Math.floor(s.day/365),oldAccount:'Retain this person’s earlier service account.'};s.conversations.servicePeople[captain.id]=structuredClone(service);
 for(const p of cast){s.conversations.relationships[p.id]={bond:61,memories:['An earlier actual memory.'],knownFacts:[]};s.conversations.meetings[p.id]={locationId:s.locationId,firstDay:s.day-5,lastDay:s.day-2};}
 for(const p of cast.slice(1)){const current=residentContacts(s).find(x=>x.id===p.id),{source,kind,minAge,available,...record}=current;s.socialLife.met[p.id]=structuredClone(record);}
 for(const saved of [s.conversations.servicePeople,s.conversations.relationships,s.conversations.meetings,s.socialLife.met])fill(saved,512);
 const earlier=structuredClone(s),day=s.day;assert.equal(tournamentChoiceReason(s,'tournament_invitation','enter'),null);
 assert.equal(applyTournamentChoice(s,'tournament_invitation','enter',{spendDays:days=>{s.day+=days;}}),true);
 assert.equal(s.day,day+1);assert.deepEqual(s.conversations.servicePeople,earlier.conversations.servicePeople);assert.deepEqual(s.conversations.relationships,earlier.conversations.relationships);assert.deepEqual(s.socialLife.met,earlier.socialLife.met);
 for(const p of cast){assert.equal(s.conversations.meetings[p.id].firstDay,day-5);assert.equal(s.conversations.meetings[p.id].lastDay,day);}
 assert.ok(['servicePeople','relationships','meetings'].every(key=>Object.keys(s.conversations[key]).length===512));assert.equal(Object.keys(s.socialLife.met).length,512);
});
test('late custody and calendar interruptions pause once without answering events or changing attendance, resources or receipts',()=>{
 for(const stage of ['preparing','ready'])for(const kind of ['arrest','prison','birthday','recovery']){
  const s=accept(fixture());s.adultTournament.stage=stage;if(stage==='preparing')s.adultTournament.paidDays=0;s.hero.gold=100;
  s.justice={arrest:null,prison:null};s.timeline={yearTarget:null};
  reconcileTournament(s);assert.equal(s.adultTournament.stage,stage);
  s.event={id:kind==='arrest'?'justice_arrest':kind==='birthday'?'birth_23':'mandatory_fixture',choices:[{id:'continue'}]};
  if(kind==='arrest')s.justice.arrest={locationId:s.locationId,evidence:3};
  if(kind==='prison')s.justice.prison={locationId:s.locationId,startDay:s.day,totalDays:9,servedDays:0};
  if(kind==='birthday')s.timeline.yearTarget=s.day;
  if(kind==='recovery')s.health={recovery:{totalDays:14,attendedDays:0}};
  const expected=structuredClone(s);expected.adultTournament.stage='paused';
  reconcileTournament(s);assert.deepEqual(s,expected);assert.equal(validateAdultTournament(s),true);
  reconcileTournament(s);assert.deepEqual(s,expected);
 }
});
test('canonical human plans reject hidden phases, monster IDs, altered numbers and delayed lethal effects',()=>{for(const id of HUMAN_DUEL_PROFILE_IDS){const p=humanDuelProfile(id),a={duelPlanId:id,duelDifficulty:'balanced',maxHp:p.hp,attackPower:p.attackPower,agility:p.agility,armor:p.armor,maxMp:0,mp:0,role:'humanoid',aiKey:'striker',planCycle:p.cycle,status:{}};assert.equal(validHumanDuelPlan(a),true);for(const edit of [a=>a.bossId='secret',a=>a.planId='monster',a=>a.attackPower++,a=>a.phasePlan={}]){const changed=structuredClone(a);edit(changed);assert.equal(validHumanDuelPlan(changed),false);}assert.equal(prohibitedDuelState({actors:[a]}),false);for(const k of ['bleed','burn','poison','captured','surrenderable']){const changed=structuredClone(a);changed.status[k]=1;assert.equal(prohibitedDuelState({actors:[changed]}),true);}}});

test('dedicated real-resolver duels carry resources through terminal loss and retreat without invoking time, rewards or NPC death',async()=>{
 const {createBattle,takeBattleAction}=await import('../dist/js/combat.js'),{tournamentContext,validTournamentBattle}=await import('../dist/js/adult-tournament-state.js'),{resolveTournamentBattle}=await import('../dist/js/adult-tournament.js');
 for(const mode of ['defeat','retreat']){
  const s=accept(fixture());Object.assign(s,{cartography:{interior:{siteId:'home',roomId:'watch'}},realm:{sites:{home:{regionId:'rainward'}}},companions:[],life:{people:[]},conversations:{relationships:{},servicePeople:{},meetings:{}},rpg:{trainedTechniques:[]},flags:{battlesStarted:0}});
  Object.assign(s.hero,{name:'Actual entrant',gold:100,path:'unformed',specialization:null,attributes:Object.fromEntries(['strength','agility','vitality','intellect','willpower','presence'].map(k=>[k,3])),skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0])),condition:null,level:1});
  const t=s.adultTournament;t.stage='bout';t.battleId='actual-duel';s.battle=createBattle(s,'watchhouse_duel',tournamentContext(s));s.battle.instanceId=t.battleId;
  assert.equal(validateAdultTournament(s),true);assert.equal(validTournamentBattle(s,s.battle),true);
  const people=structuredClone(s.npcContinuity.people),day=s.day,gold=s.hero.gold;
  if(mode==='retreat')s.battle=takeBattleAction(s.battle,'retreat');else for(let i=0;i<240&&!s.battle.outcome;i++)s.battle=takeBattleAction(s.battle,'defend');
  assert.equal(s.battle.outcome,mode);const hero=structuredClone(s.battle.actors[0]),potions=s.battle.potions;
  const no=()=>{throw Error('A supervised result must not spend days, grant XP or kill someone.');};
  assert.equal(resolveTournamentBattle(s,s.battle,{spendDays:no,earnExperience:no,killPerson:no,journalLiteral:()=>{}}),true);
  assert.equal(s.hero.hp,Math.max(1,hero.hp));assert.equal(s.hero.mp,hero.mp);assert.equal(s.hero.potions,potions);assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.phase,'adult');assert.equal(s.locationId,'home');assert.deepEqual(s.npcContinuity.people,people);assert.equal(validateAdultTournament(s),true);
 }
});
