import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { getContacts,getThread,applyDialogueAction,replyToConversation,dialogueActions } from '../dist/js/conversations.js';
import { hexAtlas,cartographyView,renderHexMap,inheritCartography,hexStepPreview,syncCartography } from '../dist/js/cartography.js';
import { createBattle,takeBattleAction,getBattleActions,combatTraining } from '../dist/js/combat.js';
import { createSaveStore } from '../dist/js/saves.js';
import { readDisplay,saveDisplay } from '../dist/js/display.js';
import { loreView } from '../dist/js/lore.js';
import { dungeonView,enterDungeon } from '../dist/js/exploration.js';
import { audioSceneFor } from '../dist/js/audio.js';
import { regionAt } from '../dist/js/realm.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';

// These are regression fixtures, not lives counted in the 100-life backtest.
function settle(s){for(let n=0;n<150;n++){
  if(s.event){const c=s.event.choices.find(c=>['care','later','continue','support','pause','wait','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);continue;}
  if(s.battle){s=E.resolveBattle(s,takeBattleAction(s.battle,'retreat'));continue;}
  if(s.timeline?.journey){s=E.continueJourney(s);continue;}
  if(s.cartography?.pending){s=E.chooseAction(s,'atlas_continue');continue;}
  return s;
}throw Error('Fixture did not settle');}
const source=settle(await createLifeAtAge({seed:'audit-v21-regression',startAge:18}));
const fresh=()=>structuredClone(source);
// Controlled position fixtures test dialogue/locality, not road travel.
function beside(s,id){const p=getContacts(s).find(p=>p.id===id);assert.ok(p);s.locationId=p.locationId;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const room of settlementWalkPath(s,p.roomId||'gate'))s=E.chooseAction(s,'atlas_room_'+room);return s;}
function command(s,id){
  s=atService(s,id);const a=E.getActions(s).find(a=>a.id===id);assert.ok(a&&!a.disabledReason,`${id}: ${a?.disabledReason}`);const next=E.chooseAction(s,id);assert.ok(E.validateSave(next),`${id}: invalid`);return next;}

test('fog hides unlearned site names and map reads remain pure',()=>{
  const s=E.createBirthGame({seed:'audit-v21-fog'}),before=JSON.stringify(s),view=cartographyView(s),html=renderHexMap(s);
  assert.ok(view.cells.some(c=>c.known==='Unknown'));
  for(const site of s.world.locations.filter(p=>!s.cartography.sites[p.id]))assert.ok(!html.includes(site.name));
  assert.equal(JSON.stringify(s),before);assert.ok(E.validateSave(s));
});
test('invalid non-neighbor commands spend nothing; a real step and return survive reload',()=>{
  let s=fresh();const before=structuredClone(s),invalid=E.chooseAction(s,'atlas_step_999_999');
  assert.deepEqual({...invalid,notice:''},{...before,notice:''});
  const move=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason);assert.ok(move);
  const origin=s.cartography.position;s=settle(command(s,move.id));assert.notEqual(s.cartography.position,origin);assert.ok(s.day>before.day);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
  const [q,r]=origin.split(',');s=settle(command(s,`atlas_step_${q}_${r}`));assert.equal(s.cartography.position,origin);
});
test('wilderness cannot supply city services or correspondents',()=>{
  let s=fresh();const a=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason&&!hexAtlas(s).byKey[a.id.slice(11).replace('_',',')]?.siteId);
  assert.ok(a);s=settle(command(s,a.id));assert.equal(s.cartography.offsite,true);
  const offered=E.getActions(s);assert.ok(offered.some(a=>a.id==='trail_camp'),'current wilderness rest remains available');
  assert.ok(offered.filter(a=>!a.disabledReason).every(a=>!/^talk_|^career_|^school_|^health_clinic$|^gear_buy_|^realm_(ritual|potion|ration)$/.test(a.id)),'no enabled city provider or correspondent from the field');
  const day=s.day,gold=s.hero.gold;assert.equal(E.travelTo(s,'city').day,day);assert.equal(E.chooseAction(s,'gear_buy_iron_sword').hero.gold,gold);assert.equal(E.replyMessage(s,'fellow','pressure').day,day);assert.equal(E.ageUp(s).day,day);
});
test('public room navigation costs no time and never resets merchant stock',()=>{
  let s=fresh();const before=structuredClone(s.realm.sites[s.locationId].merchant),day=s.day,gold=s.hero.gold;
  s=command(s,'atlas_room_market');assert.equal(s.cartography.interior.roomId,'market');s=command(s,'atlas_room_gate');s=command(s,'atlas_room_market');
  assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.deepEqual(s.realm.sites[s.locationId].merchant,before);assert.deepEqual(E.migrateSave(s).cartography,s.cartography);
});
test('room navigation cannot collect deferred upkeep from an earlier medical visit',()=>{
  // The cohort reproduced a one-gold uncollected living cost on world day 10592.
  let s=fresh();s.householdBudget.accruedUnits+=365;assert.ok(E.validateSave(s));
  const gold=s.hero.gold,billed=s.householdBudget.billedGold,day=s.day;
  s=command(s,'atlas_room_market');assert.equal(s.hero.gold,gold);assert.equal(s.day,day);assert.equal(s.householdBudget.billedGold,billed);
  s=settle(command(s,'atlas_rumors'));assert.ok(s.householdBudget.billedGold>billed,'a later timed activity still settles real upkeep');
});
test('inherited personal visits become charts with their original dates',()=>{
  const parent=fresh(),child=fresh();child.dynasty.generation++;
  const other=parent.world.locations.find(p=>p.id!==parent.locationId).id;
  parent.cartography.sites[other]={kind:'Visited',source:'Your survey',observedDay:parent.day-10,generation:1};
  inheritCartography(parent,child);assert.equal(child.cartography.sites[other].kind,'Charted');assert.equal(child.cartography.sites[other].observedDay,parent.day-10);assert.match(child.cartography.sites[other].source,/Inherited/);
});
test('a birthday pauses a crossing without revealing its destination or losing paid days',()=>{
  let s=fresh();s.day=19*365-1;
  const a=E.getActions(s).find(a=>a.id.startsWith('atlas_step_')&&a.days>1&&!a.disabledReason);assert.ok(a);
  const origin=s.cartography.position;s=command(s,a.id);
  assert.equal(s.day,19*365);assert.equal(s.cartography.position,origin);assert.equal(s.cartography.pending.progress,1);assert.ok(s.event);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
  const entered=settle(s);assert.notEqual(entered.cartography.position,origin);assert.equal(entered.cartography.pending,null);assert.ok(E.validateSave(entered));
});
test('the reproduced hungry vampire crossing can be fed and resumed without cancellation',()=>{
  let s=E.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/v21-vampire-crossing-paused.json',import.meta.url))));
  assert.ok(s);const target=s.cartography.pending.to;
  assert.match(E.getActions(s).find(a=>a.id==='atlas_continue').disabledReason,/hunger/);
  assert.ok(E.getActions(s).some(a=>a.id==='feed_vampire'&&!a.disabledReason));
  s=command(s,'feed_vampire');assert.equal(s.event.id,'vampire_feeding');s=E.chooseEventOption(s,'animal');
  s=settle(s);assert.equal(s.cartography.pending,null);assert.equal(s.cartography.position,target);assert.ok(s.hero.condition.hunger<75);assert.ok(E.validateSave(s));
});
test('the reproduced hungry grievance can be left, fed and answered without free rewards',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/v21-vampire-grievance-paused.json',import.meta.url)));
  let s=E.migrateSave(original);assert.ok(s);assert.ok(!original.event.choices.some(c=>c.id==='pause'));assert.ok(s.event.choices.some(c=>c.id==='pause'));
  const before={day:s.day,gold:s.hero.gold,stress:s.life.stress,skills:structuredClone(s.hero.skills),bond:s.life.people.find(p=>p.id===s.hero.personality.reflection.personId).bond};
  const personId=s.hero.personality.reflection.personId;
  s=E.chooseEventOption(s,'pause');assert.equal(s.event,null);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.gold);assert.equal(s.life.stress,before.stress);assert.deepEqual(s.hero.skills,before.skills);assert.equal(s.life.people.find(p=>p.id===personId).bond,before.bond);
  assert.equal(s.hero.personality.reflection,null);s=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(s);
  s=command(s,'feed_vampire');s=E.chooseEventOption(s,'animal');s=settle(s);assert.ok(s.hero.condition.hunger<75);
  s=command(s,'nature_reckoning');assert.equal(s.hero.personality.reflection.personId,personId);const day=s.day;s=E.chooseEventOption(s,'forgive');assert.equal(s.day,day+1);assert.equal(s.hero.personality.reflection,null);assert.ok(E.validateSave(s));
  assert.equal(s.life.people.find(p=>p.id===personId).bond,Math.min(100,before.bond+4));
});
test('urgent hunger cannot open a timed grievance or spend its yearly opportunity',()=>{
  let s=E.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/v21-vampire-grievance-paused.json',import.meta.url))));
  s=E.chooseEventOption(s,'pause');const before=structuredClone(s),offer=E.getActions(s).find(a=>a.id==='nature_reckoning');assert.match(offer.disabledReason,/feeding/);
  const blocked=E.chooseAction(s,'nature_reckoning');assert.deepEqual({...blocked,notice:''},{...before,notice:''});assert.equal(blocked.hero.personality.reflection,null);assert.ok(E.validateSave(blocked));
});
test('dungeon views and passage labels keep unvisited room names hidden',()=>{
  const s=fresh();s.locationId='marsh';const ctx={setEvent:(id,title,category,body,choices)=>{s.event={id,title,category,body,choices};}};s.event=null;
  assert.equal(enterDungeon(s,'cistern',null,ctx),true);const view=dungeonView(s);
  assert.ok(view.rooms.some(r=>!r.visited));
  for(const room of view.rooms.filter(r=>!r.visited)){
    const original=s.dungeon.definition.rooms.find(r=>r.id===room.id);
    assert.ok(room.title.startsWith('Unexplored passage'));assert.equal(room.exits.length,0);assert.ok(!room.title.includes(original.title));
  }
  const exits=s.event.choices.filter(c=>c.id.startsWith('route_'));
  for(const exit of exits){const original=s.dungeon.definition.rooms.find(r=>r.id===exit.id.slice(6));assert.ok(exit.label.startsWith('Enter the unexplored passage'));assert.ok(!exit.label.includes(original.title));}
  assert.equal(new Set(exits.map(c=>c.label)).size,exits.length,'Perceptible clues distinguish adjacent unknown exits');
});
test('legacy authored coercive replies retain trait stress, while forged replies do nothing',()=>{
  let s=fresh();delete s.characterDialogueVersion;delete s.narrativeEdition; // Explicit retained pre-grounded authored dialogue contract, not a new edition-30 reply.
  s=E.choosePersonalityTrait(s,'compassionate');s=E.choosePersonalityTrait(s,'content');s=command(s,'talk_fellow');
  const thread=getThread(s,'fellow');assert.ok(thread.replies.some(r=>r.id==='pressure'&&r.traitPreview.includes('stress')));
  const stress=s.life.stress,sequence=s.conversations.sequence;s=E.replyMessage(s,'fellow','pressure');assert.ok(s.life.stress>stress);assert.equal(s.conversations.sequence,sequence+2);
  const after=s.life.stress;assert.equal(E.replyMessage(s,'fellow','forged').life.stress,after);assert.ok(E.validateSave(s));
});
test('current young contacts get age-appropriate local company once per day without adult responsibilities',()=>{
  let s=fresh();s.life.children.push({id:'child-v21',name:'A little household life',age:2,bornDay:s.day-2*365,alive:true});s=beside(s,'child-v21');
  const day=s.day,gold=s.hero.gold,campaign=structuredClone(s.campaign),obligations=structuredClone(s.obligations);
  assert.ok(applyDialogueAction(s,'talk_child-v21'));assert.equal(s.conversations.pending.nodeId,'person_v30');assert.match(s.conversations.pending.snapshot.body,/blanket|caregiver/);assert.deepEqual(s.conversations.pending.replies.map(r=>r.id),['ask','share','tease','leave']);assert.ok(replyToConversation(s,'child-v21','share'));
  assert.ok(dialogueActions(s).find(a=>a.id==='talk_child-v21').disabledReason);assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.deepEqual(s.campaign,campaign);assert.deepEqual(s.obligations,obligations);
});
test('retained pre-grounded young-contact scenes keep their age-appropriate yearly cooldown',()=>{
  let s=fresh();delete s.narrativeEdition;s.life.children.push({id:'child-v21-legacy',name:'An earlier small household life',age:2,bornDay:s.day-2*365,alive:true});s=beside(s,'child-v21-legacy');
  assert.ok(applyDialogueAction(s,'talk_child-v21-legacy'));assert.equal(s.conversations.pending.nodeId,'young_contact');assert.ok(replyToConversation(s,'child-v21-legacy','share'));assert.ok(dialogueActions(s).find(a=>a.id==='talk_child-v21-legacy').disabledReason);
});
test('bloodless procedural species remain bloodless across many formations',()=>{
  for(const type of ['undead','spirit','construct'])for(let i=0;i<40;i++){
    const s=fresh();s.seed=`physiology-${type}-${i}`;const b=createBattle(s,'free_'+type,{kind:'adventure',mode:'roam',token:'probe',locationId:s.locationId});
    assert.ok(b.actors.filter(a=>a.side==='enemy').every(a=>a.bloodless===true));
  }
});
test('combat training preserves early practice and diminishes lifetime conversion',()=>{
  assert.equal(combatTraining(8),8);assert.ok(combatTraining(500)<40);assert.ok(combatTraining(500)>combatTraining(20));
  const veteran=fresh();veteran.hero.skills.weapons=500;const b=createBattle(veteran);assert.ok(b.actors.find(a=>a.id==='hero').skills.weapons<40);assert.equal(veteran.hero.skills.weapons,500);
});
function controlledBattle(s=fresh()){
  const b=createBattle(s,'free_bandit',{kind:'adventure',mode:'roam',token:'probe',locationId:s.locationId});b.currentActorId='hero';b.turnOrder=['hero',...b.turnOrder.filter(id=>id!=='hero')];b.captureAllowed=true;
  for(const enemy of b.actors.filter(a=>a.side==='enemy')){enemy.hp=enemy.maxHp=100;enemy.attackPower=1;enemy.armor=0;enemy.status={};}
  return b;
}
test('a controlled strike cannot kill a named bounty target or hit a different target',()=>{
  let b=controlledBattle();b.actors[0].skills.weapons=1000;b.actors[0].attributes.strength=1000;
  const wrong=takeBattleAction(b,'hold_back','enemy-2');assert.equal(wrong.actors.find(a=>a.id==='enemy-2')?.hp,100);assert.equal(wrong.currentActorId,b.currentActorId);assert.match(wrong.log.at(-1),/named bounty/);
  for(let n=0;n<6&&!b.outcome;n++)b=takeBattleAction(b,'hold_back','enemy-1');
  const target=b.actors.find(a=>a.id==='enemy-1');assert.equal(target.hp,1);assert.ok(!b.log.some(l=>l===`${target.name} is out of the fight.`));
  assert.ok(!getBattleActions(b).find(a=>a.id==='capture').disabledReason);
});
test('broken protector oaths also suppress the sacred spell, leaving other disciplines available',()=>{
  const s=fresh();s.hero.specialization='paladin';s.hero.skills.devotion=8;s.hero.skills.arcana=8;s.flags.oathBroken=true;
  const actions=getBattleActions(controlledBattle(s));assert.match(actions.find(a=>a.id==='spell_radiance').disabledReason,/oath/);assert.equal(actions.find(a=>a.id==='spell_fire').disabledReason,undefined);
});
test('sacred attacks use devotion rather than arcana; full-health healer ward is a real turn',()=>{
  function damage(devotion,arcana){const s=fresh();s.hero.skills.devotion=devotion;s.hero.skills.arcana=arcana;const b=controlledBattle(s);b.actors.find(a=>a.id==='enemy-1').weakness='fire';return 100-takeBattleAction(b,'spell_radiance','enemy-1').actors.find(a=>a.id==='enemy-1').hp;}
  assert.ok(damage(50,3)>damage(3,3));assert.equal(damage(3,50),damage(3,3));
  const s=fresh();s.hero.specialization='healer';s.hero.mp=30;s.hero.hp=s.hero.maxHp;const b=controlledBattle(s),next=takeBattleAction(b,'skill','hero');
  assert.equal(next.actors[0].mp,b.actors[0].mp-5);assert.ok(next.actors[0].status.ward>0);assert.ok(next.round>b.round||next.currentActorId!==b.currentActorId);
});
test('copied founding history ages against the world clock without rewriting old copies',()=>{
  const s=fresh();delete s.cartography;s.lore.discovered.push('founding');const old=loreView(s).histories.find(e=>e.id==='founding'),later=structuredClone(s);later.day+=47*365;
  const now=loreView(later).histories.find(e=>e.id==='founding');assert.equal(Number(/About (\d+)/.exec(now.text)[1])-Number(/About (\d+)/.exec(old.text)[1]),47);
  assert.ok(old.witnessId.startsWith('keeper-'));assert.equal(getThread(s,old.witnessId).messages.length,0);
});
test('a faith inquiry returns to its named source and cannot pay twice',()=>{
  let s=fresh();s=command(s,'realm_petition');const p=structuredClone(s.realm.petition);assert.equal(s.cartography.sites[p.destinationId].kind==='Rumored'||s.cartography.sites[p.destinationId].kind==='Visited'||s.cartography.sites[p.destinationId].kind==='Charted',true);
  s=settle(E.travelTo(s,p.destinationId));assert.equal(s.locationId,p.destinationId);s=settle(command(s,'realm_inquiry'));assert.equal(s.realm.petition.stage,'return');
  s=settle(E.travelTo(s,p.boardId));s=command(s,'realm_report_sell');assert.equal(s.realm.petition,null);assert.equal(s.realm.faithRecords.at(-1).keeperId,p.keeperId);
  const gold=s.hero.gold;assert.equal(E.chooseAction(s,'realm_report_sell').hero.gold,gold);assert.ok(E.validateSave(s));
});
test('occupied imports require review and preserve a recoverable previous life',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=createSaveStore(storage,E.migrateSave),a=fresh(),b=E.createBirthGame({seed:'import-v21',name:'A different life'});
  assert.ok(store.write(0,a));const before=JSON.stringify(store.read(0));assert.equal(store.replace(0,b),false);assert.equal(JSON.stringify(store.read(0)),before);
  assert.ok(store.replace(0,b,{reviewed:true}));assert.deepEqual(store.backup(0),a);assert.deepEqual(createSaveStore(storage,E.migrateSave).backup(0),a);
  assert.equal(store.replace(0,{bad:true},{reviewed:true}),false);assert.equal(store.read(0).hero.name,b.hero.name);
});
test('reading preferences are bounded and independent; audio follows committed place',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.deepEqual(saveDisplay({scale:9,font:'plain'},storage),{scale:1.5,font:'plain',singleKeyShortcuts:true});assert.deepEqual(readDisplay(storage),{scale:1.5,font:'plain',singleKeyShortcuts:true});
  const s=fresh();assert.ok(['town','shrine','coast'].includes(audioSceneFor(s))||/^(region_|faith_)/.test(audioSceneFor(s)));s.cartography.interior={siteId:s.locationId,roomId:'shrine'};assert.match(audioSceneFor(s),/^(shrine|faith_)/);s.battle={};assert.equal(audioSceneFor(s),'battle');assert.equal(audioSceneFor(s,'creation'),'creation');
});
