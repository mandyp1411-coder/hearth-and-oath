import {syncCartography} from '../dist/js/cartography.js';
import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import { needsReferenceArt } from './helpers/reference-art.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as engine from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { takeBattleAction, getBattleActions, createBattle } from '../dist/js/combat.js';
import { regionAt, realmActions, validateRealm } from '../dist/js/realm.js';
import { isSettlement } from '../dist/js/world.js';
import { refreshAdventureBoard } from '../dist/js/adventuring.js';
import { FOE_ATLASES } from '../dist/js/foe-catalog.js';
import { ENEMY_SPECIES, validEnemyIllustration, renderEnemyPortrait } from '../dist/js/enemies.js';
import { adventurePage, realmPage, merchantPanel } from '../dist/js/rpg-ui.js';
import { CONTRACT_FLAVOR } from '../dist/js/realm-content-v18.js';

function clear(s){for(let i=0;i<80&&s.event;i++)s=engine.chooseEventOption(s,s.event.choices.find(c=>['later','leave','continue','keep'].includes(c.id))?.id||s.event.choices[0].id);return s;}
async function adult(seed='rpg-v18'){const s=clear(await createLifeAtAge({seed,startAge:18}));if(!isSettlement(s.world,s.locationId))s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)).id;s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);refreshAdventureBoard(s);const prepared=engine.migrateSave(s);delete prepared.mazeBook;delete prepared.maze;delete prepared.delves;return prepared;}
function fixture(s){s.hero.gold=4000;s.hero.hp=s.hero.maxHp=500;s.hero.mp=s.hero.maxMp=300;s.hero.attributes.strength=12;s.hero.skills.weapons=12;s.hero.skills.arcana=8;s.hero.skills.devotion=8;return s;}
// Controlled legacy encounter snapshot: retired one-click roam commands remain absent.
function freeEncounter(s,type){
 assert.ok(!engine.getActions(s).some(a=>a.id==='adventure_roam_'+type));s=structuredClone(s);
 const count=s.flags.battlesStarted||0,context={kind:'adventure',mode:'roam',token:'roam-'+count,locationId:s.locationId};
 s.battle=createBattle(s,'free_'+type,context);s.flags.battlesStarted=count+1;
 s.battle.instanceId=`battle-${s.seed}-${s.flags.battlesStarted}`;s.battle.context=context;
 assert.ok(engine.validateSave(s));return s;
}
function finish(s,capture=false){let b=s.battle;for(let n=0;n<200&&!b.outcome;n++){const actor=b.actors.find(a=>a.id===b.currentActorId),enemy=b.actors.find(a=>a.side==='enemy'&&a.hp>0),target=capture?b.actors.find(a=>a.id==='enemy-1'&&a.hp>0):null;const available=getBattleActions(b).filter(a=>!a.disabledReason);let a=available.find(a=>a.id==='attack'),chosen=enemy;if(capture&&target){if(target.hp<=Math.ceil(target.maxHp*.35)&&available.some(a=>a.id==='capture')){a=available.find(a=>a.id==='capture');chosen=target;}else {a=available.find(a=>a.id==='inspect');chosen=target;}}
    if(capture&&target&&a.id==='inspect'&&n>4){a=available.find(a=>a.id==='attack');}
    b=takeBattleAction(b,a.id,chosen?.id||actor.id);
  }assert.ok(b.outcome);return {state:engine.resolveBattle(s,b),battle:b};}
function command(s,id){
  s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);s=atService(s,id);const a=engine.getActions(s).find(a=>a.id===id);assert.ok(a,id+' offered');assert.ok(!a.disabledReason,a.disabledReason);const next=engine.chooseAction(s,id);assert.ok(engine.validateSave(next),id+' valid');return next;}

test('all 384 enemy cells are real registered illustrations with truthful species bindings',{skip:needsReferenceArt},()=>{
  const hashes=new Set();assert.equal(Object.keys(FOE_ATLASES).length,6);
  for(const [group,atlas] of Object.entries(FOE_ATLASES)){const bytes=readFileSync(new URL('../dist/'+atlas.src.slice(2),import.meta.url)),reg=JSON.parse(readFileSync(new URL(`../reference-art/foes-v18/registration/${group}-00.json`,import.meta.url)));assert.equal(createHash('sha256').update(bytes).digest('hex'),reg.sha256);assert.equal(reg.cells.length,64);for(const cell of reg.cells){assert.ok(!hashes.has(cell.sha256));hashes.add(cell.sha256);assert.deepEqual(atlas.cells[cell.cell],cell.source);}}
  assert.equal(hashes.size,384);assert.equal(validEnemyIllustration({kind:'foe',species:'wisp',group:'spirits',cell:14}),false);assert.equal(validEnemyIllustration({kind:'foe',species:'fungus',group:'aberrations',cell:13}),false);
  for(const [species,,group,row] of ENEMY_SPECIES){const cell=row*8;assert.ok(validEnemyIllustration({kind:'foe',species,group,cell}));const html=renderEnemyPortrait({name:species,illustration:{kind:'foe',species,group,cell}});assert.match(html,/<img/);assert.doesNotMatch(html,/<svg|portrait-hair|transform:/);}
});
test('all six free encounters vary across seeds, save their portraits and pay combat loot once',async()=>{
  const shapes=new Set();let s=fixture(await adult());for(const type of ['beast','undead','spirit','construct','bandit','aberration']){
    s=clear(s);s=freeEncounter(s,type);assert.ok(s.battle.actors.filter(a=>a.side==='enemy').every(a=>validEnemyIllustration(a.illustration)));const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(engine.migrateSave(saved).battle,s.battle);const old=s.adventuring.loot.length,{state,battle}=finish(s);s=state;assert.ok(s.adventuring.loot.length>old,`${type}: ${battle.outcome}; ${state.notice}`);assert.ok(engine.validateSave(s));assert.deepEqual(engine.resolveBattle(s,battle).adventuring,s.adventuring);
  }
  for(let i=0;i<30;i++){const v={...s,seed:'enemy-'+i,flags:{...s.flags,battlesStarted:i}};shapes.add(JSON.stringify(createBattle(v,'free_beast',{kind:'adventure',mode:'roam',token:'roam-'+i,locationId:s.locationId}).actors.filter(a=>a.side==='enemy').map(a=>[a.name,a.aiKey,a.illustration])));}assert.ok(shapes.size>25);
});
test('merchant stock, prices, purchased equipment and resale conserve actual resources',async()=>{
  let s=fixture(await adult('shop-v18')),m=s.realm.sites[s.locationId].merchant;assert.ok(m.name&&m.character.archetype==='craft');const purchase=engine.getActions(s).find(a=>a.id.startsWith('gear_buy_'));assert.ok(purchase);const key=purchase.id.slice(9),stock=m.stock[key],gold=s.hero.gold;
  s=command(s,purchase.id);assert.equal(s.hero.gold,gold-purchase.cost);assert.equal(s.realm.sites[s.locationId].merchant.stock[key],stock-1);assert.ok(s.equipment.owned.includes(key));s=engine.equipGear(s,key);assert.ok(engine.getActions(s).find(a=>a.id==='realm_sellgear_'+key).disabledReason);s=engine.equipGear(s,'unequip_'+Object.keys(s.equipment.equipped).find(slot=>s.equipment.equipped[slot]===key));const before=s.hero.gold;s=command(s,'realm_sellgear_'+key);assert.ok(s.hero.gold>before&&s.hero.gold<gold);assert.ok(!s.equipment.owned.includes(key));assert.ok(engine.validateSave(s));
});
test('accepted contracts need matching destination and earned proof before exactly one payment',async()=>{
  let s=fixture(await adult('contract-v18')),c=s.adventuring.contracts.find(c=>c.status==='offered');s=command(s,'adventure_accept_'+c.id);assert.ok(!engine.getActions(s).some(a=>a.id==='adventure_claim_'+c.id));s.locationId=c.destinationId;refreshAdventureBoard(s);s=command(s,'adventure_pursue_'+c.id);const started=structuredClone(s);const forged={...s.battle,context:{...s.battle.context,token:'wrong'},outcome:'victory'};assert.equal(engine.resolveBattle(s,forged).adventuring.contracts.find(x=>x.id===c.id)?.status,'active');assert.deepEqual(engine.resolveBattle(s,forged).battle,started.battle);
  s=finish(s).state;c=s.adventuring.contracts.find(x=>x.id===c.id);assert.equal(c.status,'ready');assert.ok(c.proof.battleId);assert.ok(engine.getActions(s).find(a=>a.id==='adventure_claim_'+c.id).disabledReason);s.locationId=c.boardId;refreshAdventureBoard(s);s=clear(s);const gold=s.hero.gold;s=command(s,'adventure_claim_'+c.id);assert.equal(s.hero.gold,gold+c.reward);const replay=engine.chooseAction(s,'adventure_claim_'+c.id);assert.equal(replay.hero.gold,s.hero.gold);assert.ok(engine.validateSave(s));
});
test('six-floor descent keeps its real chamber, once-only gains and withdrawals across reloads',async()=>{
  let s=fixture(await adult('descent-v18'));s=command(s,'realm_ration');assert.equal(s.adventuring.rations,1);s=command(s,'adventure_descend');assert.equal(s.adventuring.rations,0);let rooms=0;const doorways=new Set();
  for(let n=0;n<90&&s.adventuring.expedition;n++){assert.ok(engine.validateSave(s));assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))).adventuring,s.adventuring);if(s.battle){s=finish(s).state;rooms++;continue;}if(s.event?.id==='adventure_room'){const x=s.adventuring.expedition,offered=s.event.choices.filter(c=>!c.disabledReason),prefix=`${x.floor}:${x.room}:`,work=offered.find(c=>['fight','open','disarm','rush','leave','talk','study','descend'].includes(c.id)),door=offered.find(c=>c.id.startsWith('route_')&&!doorways.has(prefix+c.id)),want=rooms>=8?'withdraw':work?.id||door?.id||'withdraw';if(want.startsWith('route_'))doorways.add(prefix+want);s=engine.chooseEventOption(s,want);if(want!=='withdraw')rooms++;}else if(s.event)s=clear(s);else s=command(s,'adventure_continue');}
  assert.ok(!s.adventuring.expedition);assert.ok(s.adventuring.history.length===1);assert.ok(rooms>3);assert.ok(engine.validateSave(s));
});
test('regional sentences last through actual calendar days and block travel, year skipping and equipment',async()=>{
  let s=fixture(await adult('prison-v18'));const originalLocation=s.locationId,region=regionAt(s);s.legal.incidents.push({locationId:s.locationId,evidence:3,description:'A named witness identifies a market theft.'});s=command(s,'justice_surrender');assert.equal(s.justice.prison.totalDays,3*region.law.prisonDaysPerEvidence);const before=s.day;s=engine.travelTo(s,'city');assert.equal(s.locationId,originalLocation);s=engine.ageUp(s);assert.equal(s.day,before);assert.ok(engine.equipmentActionReason(s));let served=0;while(s.justice.prison&&served++<160){s=clear(s);s=command(s,'justice_serve');assert.ok(engine.validateSave(s));}
  assert.ok(!s.justice.prison);assert.equal(s.day-before,3*region.law.prisonDaysPerEvidence);assert.equal(s.legal.incidents.filter(i=>i.locationId===originalLocation).length,0);assert.equal(s.justice.history.at(-1).outcome,'served');
});
test('faith choice is ancestry independent; rites charge real days and fees and respect their cooldown',async()=>{
  let s=fixture(await adult('faith-v18'));s.locationId=s.world.locations.find(p=>s.realm.sites[p.id]?.hasShrine&&s.realm.sites[p.id].faithId==='ash'&&isSettlement(s.world,p.id)).id;const gold=s.hero.gold,day=s.day;s=command(s,'realm_join_ash');assert.equal(s.realm.faithId,'ash');s=command(s,'realm_ritual');assert.equal(s.day,day+1);assert.equal(s.hero.gold,gold-6);assert.ok(engine.getActions(s).find(a=>a.id==='realm_ritual').disabledReason);s=command(s,'realm_leavefaith');assert.equal(s.realm.faithId,null);assert.ok(engine.validateSave(s));
});
test('elapsed years change war, rulers and settlements while read-only views stay pure',async()=>{
  let s=await adult('world-v18');const before=JSON.stringify(s);realmActions(s);regionAt(s);realmPage(s,engine.getActions(s));adventurePage(s,engine.getActions(s));merchantPanel(s,engine.getActions(s));assert.equal(JSON.stringify(s),before);assert.ok(s.realm.wars.length>=1,'the courts have marched at least once in eighteen years'); // v0.65: wars come from the courts' claims, a few a generation, not from the calendarassert.ok(s.world.locations.filter(p=>!/^seat-|^reach-/.test(p.id)).length>=25&&s.world.locations.filter(p=>!/^seat-|^reach-/.test(p.id)).length<=32);assert.ok(s.realm.history.length>8);assert.ok(validateRealm(s.realm,s));
});
test('a destroyed settlement can be rebuilt through four paid stages without erasing its destruction',async()=>{
  let s=fixture(await adult('rebuild-v18'));delete s.worldServicesVersion; // Captured legacy reconstruction terms; current ruined sites require living providers.
  const place=s.world.locations.find(p=>s.realm.sites[p.id].merchant&&p.id!==s.locationId);place.status='destroyed';place.servicesAvailable=false;s.locationId=place.id;s.realm.sites[place.id].phase='ruin';s.realm.sites[place.id].rebuild=0;s.world.changes.push({id:'fixture-siege',day:s.day,locationId:place.id,title:'The siege',text:'The settlement was destroyed.'});const gold=s.hero.gold,paid=s.householdBudget.paidGold,day=s.day;for(let n=0;n<4;n++)s=command(clear(s),'realm_rebuild');assert.equal(s.world.locations.find(p=>p.id===place.id).status,'thriving');assert.equal(s.day,day+20);assert.equal(s.hero.gold,gold-120-(s.householdBudget.paidGold-paid));assert.ok(s.world.changes.some(c=>c.id==='fixture-siege'));assert.ok(s.world.changes.some(c=>c.title==='A hearth returns'));assert.ok(engine.validateSave(s));
});
test('recognized stewardship and coercive levies have lasting, paid settlement effects',async()=>{
  let s=fixture(await adult('holding-v18'));s.factions.villagers=30;s.realm.sites[s.locationId].prosperity=65;const gold=s.hero.gold,paid=s.householdBudget.paidGold;s=command(s,'realm_charter');assert.equal(s.hero.gold,gold-250-(s.householdBudget.paidGold-paid));assert.equal(s.realm.sites[s.locationId].rule,'charter');const site=structuredClone(s.realm.sites[s.locationId]),before=s.hero.gold,paidBefore=s.householdBudget.paidGold;s=command(s,'realm_govern_tithe');assert.equal(s.hero.gold,before+50-(s.householdBudget.paidGold-paidBefore));assert.equal(s.realm.sites[s.locationId].prosperity,Math.max(0,site.prosperity-8));assert.ok(engine.getActions(s).find(a=>a.id==='realm_govern_tithe').disabledReason);assert.ok(engine.validateSave(s));
});

test('a living bounty requires weakening the real named target before a nonlethal capture',async()=>{
  let s=fixture(await adult('capture-v18'));s.hero.attributes.strength=1;s.hero.skills.weapons=0;
  const c=s.adventuring.contracts[0],f=CONTRACT_FLAVOR.find(f=>f.type==='bounty'&&f.targetType==='bandit');Object.assign(c,{flavorId:f.id,type:f.type,targetType:f.targetType,status:'active',acceptedDay:s.day});s.locationId=c.destinationId;refreshAdventureBoard(s);s=command(s,'adventure_pursue_'+c.id);let b=s.battle;
  assert.equal(b.captureAllowed,true);assert.ok(getBattleActions(b).find(a=>a.id==='capture').disabledReason);const mp=b.actors.find(a=>a.id==='hero').mp;b=takeBattleAction(b,'capture','enemy-1');assert.equal(b.actors.find(a=>a.id==='hero').mp,mp);
  for(let n=0;n<30&&!b.outcome;n++){const target=b.actors.find(a=>a.id==='enemy-1');if(target.hp<=Math.ceil(target.maxHp*.35)){b=takeBattleAction(b,'capture',target.id);break;}b=takeBattleAction(b,'attack',target.id);}
  assert.equal(b.actors.find(a=>a.id==='enemy-1').status.captured,true);for(let n=0;n<100&&!b.outcome;n++)b=takeBattleAction(b,'attack',b.actors.find(a=>a.side==='enemy'&&a.hp>0)?.id);assert.equal(b.outcome,'victory');s=engine.resolveBattle(s,b);assert.equal(s.adventuring.contracts.find(x=>x.id===c.id).proof.captured,true);s.locationId=c.boardId;refreshAdventureBoard(s);s=clear(s);const before=s.hero.gold;s=command(s,'adventure_claim_'+c.id);assert.equal(s.hero.gold,before+c.reward+15);
});

test('a forged enemy portrait or combatant strength cannot settle a battle',async()=>{
  let s=fixture(await adult('immutable-foe-v18'));s=freeEncounter(s,'undead');const b=structuredClone(s.battle);for(const actor of b.actors.filter(a=>a.side==='enemy'))actor.hp=0;b.outcome='victory';b.currentActorId=null;b.actors.find(a=>a.side==='enemy').maxHp++;
  assert.deepEqual(engine.resolveBattle(s,b).battle,s.battle);assert.equal(engine.resolveBattle(s,b).adventuring.loot.length,0);
});
