import {refreshAdventureBoard} from '../dist/js/adventuring.js';
import {settlementServices} from '../dist/js/world-services.js';
import { storyView } from '../dist/js/life-stories.js';
import test from 'node:test';
import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import {positionAtContact} from './helpers/contact-position.mjs';
import {atService} from './helpers/service-visit.mjs';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { campaignView } from '../dist/js/campaign.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { contactPage, voiceProfile } from '../dist/js/character-voice.js';
import { GEAR_CATALOG, dropEquipment, getGearItem, gearBonuses, gearScore, validateGear, ownedGear, projectedEquipment } from '../dist/js/gear.js';
import { EQUIPMENT_SLOTS } from '../dist/js/gear-loot.js';
import { syncCartography } from '../dist/js/cartography.js';
import { spatialMoveOffer, settlementLayout } from '../dist/js/area-scenes.js';
import { queueRareNightEncounter } from '../dist/js/curses.js';
import { mountApp } from './helpers/ui-surface.mjs';

function settle(s){for(let i=0;i<80&&s.event;i++)s=E.chooseEventOption(s,s.event.choices.find(c=>['care','keep','later','pause','continue'].includes(c.id))?.id||s.event.choices[0].id);assert.ok(E.validateSave(s));return s;}
const base=settle(await createLifeAtAge({seed:'v25-gameplay',startAge:18,difficulty:'gentle'}));
const fresh=()=>{const s=structuredClone(base);s.hero.gold=10000;s.locationId='home';syncCartography(s);refreshAdventureBoard(s);assert.ok(E.validateSave(s));return E.migrateSave(s);};
const roundtrip=s=>{assert.ok(E.validateSave(s));const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(next);assertCapturedMigration(s,next);assert.deepEqual(E.migrateSave(next),next);return next;};

test('quests are offers until accepted; pausing preserves the location, time and findings',()=>{
  let s=fresh();assert.equal(s.questLog.main,'offered');assert.equal(campaignView(s).quests.some(q=>q.status==='active'),false);
  const day=s.day,gold=s.hero.gold,site=s.locationId;
  s=E.chooseAction(s,'journal_main_accept');assert.equal(s.questLog.main,'active');assert.equal(campaignView(s).quests.filter(q=>q.status==='active'&&!q.id.startsWith('side_')).length,1);
  s=E.chooseAction(s,'journal_main_pause');assert.equal(s.questLog.main,'paused');assert.equal(s.campaign.facts.declined,true);
  assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.locationId,site);roundtrip(s);
});
test('a local side offer requires acceptance and stays explicitly set aside',()=>{
  let s=fresh();s.campaign.act=2;s.campaign.stage='ledger';s.locationId='coast';syncCartography(s);
  assert.ok(E.getActions(s).some(a=>a.id==='journal_accept_side_ferry'));
  s=E.chooseAction(s,'journal_accept_side_ferry');assert.equal(s.questLog.entries.side_ferry.status,'active');
  s=E.chooseAction(s,'journal_pause_side_ferry');assert.equal(s.questLog.entries.side_ferry.status,'paused');
  assert.equal(E.getActions(s).some(a=>a.id==='quest_side_ferry'),false);roundtrip(s);
});
test('every authored side quest can be accepted, tracked and paused from its actual location',()=>{
  const sites={ferry:'coast',carpenter:'camp',rival:'city',ward:'tower',grove:'forest',hearth:'home',receipt:'city',watchtower:'tower',teacher:'sanctuary',confidant:'home'};
  for(const [id,site] of Object.entries(sites)){
    let s=fresh();s.campaign.act=3;s.campaign.stage='refugees';s.locationId=site;syncCartography(s);
    assert.ok(E.getActions(s).some(a=>a.id==='journal_accept_side_'+id),id);
    s=E.chooseAction(s,'journal_accept_side_'+id);assert.equal(s.questLog.entries['side_'+id]?.status,'active',JSON.stringify({id,notice:s.notice,event:s.event?.id}));
    s=E.chooseAction(s,'journal_track_side_'+id);assert.equal(s.questLog.tracked,'side_'+id);
    s=E.chooseAction(s,'journal_pause_side_'+id);assert.equal(s.questLog.entries['side_'+id].status,'paused');roundtrip(s);
  }
});
test('completed side quests release journal capacity for a new request',()=>{
  let s=fresh();s.campaign.act=3;s.campaign.stage='refugees';s.locationId='tower';syncCartography(s);
  for(const [id,choice] of [['ferry','repair'],['carpenter','fair'],['rival','credit']]){s.questLog.entries['side_'+id]={status:'active',day:s.day};s.campaign.sidequests[id]={status:'completed',choice,day:s.day};}
  const offer=E.getActions(s).find(a=>a.id==='journal_accept_side_ward');assert.ok(offer&&!offer.disabledReason);
  s=E.chooseAction(s,offer.id);assert.equal(s.questLog.entries.side_ward.status,'active');roundtrip(s);
});
test('the loadout has ten slots; gear instances survive equip, reload and exact merchant sale',()=>{
  let s=fresh();assert.equal(Object.keys(s.equipment.equipped).length,10);
  const item=dropEquipment(s,'sale-proof',6);assert.ok(item&&item.score>0);
  s=E.equipGear(s,item.id);assert.equal(s.equipment.equipped[item.slot],item.id);assert.ok(gearScore(s)>0);roundtrip(s);
  assert.ok(E.getActions(s).find(a=>a.id==='realm_sellgear_'+item.id)?.disabledReason);
  s=E.equipGear(s,'unequip_'+item.slot);const before=s.hero.gold;
  s=atService(s,'realm_sellgear_'+item.id);s=E.chooseAction(s,'realm_sellgear_'+item.id);assert.ok(s.hero.gold>before);assert.equal(getGearItem(s,item.id),null);assert.equal(s.equipment.owned.includes(item.id),false);
  const after=s.hero.gold;s=E.chooseAction(s,'realm_sellgear_'+item.id);assert.equal(s.hero.gold,after);roundtrip(s);
});
test('drops create separate copies, respect capacity and derive rather than trust bonuses',()=>{
  const s=fresh(),a=dropEquipment(s,'unique-a',6),b=dropEquipment(s,'unique-b',6);assert.notEqual(a.id,b.id);
  assert.equal(dropEquipment(s,'unique-a',6),null);
  for(let i=0;i<150;i++)dropEquipment(s,'capacity-'+i,1);
  assert.equal(s.equipment.instances.length,120);assert.equal(validateGear(s.equipment),true);
  const record=s.equipment.instances[0];record.bonuses={attack:99999};assert.notEqual(getGearItem(s,record.id).bonuses.attack,99999);
  roundtrip(s);
});
test('three matching affixes grant one actual build bonus across different slots',()=>{
  let s=fresh();const ids=['field_shield','field_helm','leather_gloves'];
  for(const [i,baseId] of ids.entries()){const id='found_build'+i+'_1';s.equipment.instances.push({id,baseId,quality:'rare',affix:'vanguard',tier:3,source:'home',day:s.day});s.equipment.owned.push(id);s=E.equipGear(s,id);}
  const pieces=ownedGear(s).filter(i=>Object.values(s.equipment.equipped).includes(i.id));
  assert.equal(gearBonuses(s).armor,pieces.reduce((n,i)=>n+i.bonuses.armor,0)+2);roundtrip(s);
});
test('double-click commands only move along currently offered spatial connections',()=>{
  let s=fresh(),actions=E.getActions(s);const step=actions.find(a=>a.id.startsWith('atlas_step_')&&!a.disabledReason);assert.ok(step);
  const key=step.id.slice(11).replace('_',','),offer=spatialMoveOffer(s,'hex',key,actions);assert.equal(offer.id,step.id);
  const before=s.cartography.position;s=E.chooseAction(s,offer.id);assert.notEqual(s.cartography.position,before);assert.equal(spatialMoveOffer(s,'hex','999,999',E.getActions(s)),null);roundtrip(s);
  s=fresh();actions=E.getActions(s);const room=actions.find(a=>a.id.startsWith('atlas_room_')&&!a.disabledReason);const roomOffer=spatialMoveOffer(s,'room',room.id.slice(11),actions);const day=s.day;
  s=E.chooseAction(s,roomOffer.id);assert.equal(s.day,day);assert.equal(s.cartography.interior.roomId,room.id.slice(11));roundtrip(s);
});
test('new voices retain exact pending replies and cannot turn conversation into a quest',()=>{
  let s=positionAtContact(fresh(),'fellow'),before=structuredClone(s.campaign),a=E.getActions(s).find(a=>a.id==='talk_fellow');assert.ok(a&&!a.disabledReason);
  s=E.chooseAction(s,a.id);assert.equal(s.conversations.pending.nodeId,'person_v30');const body=getThread(s,'fellow').messages.at(-1).text;
  const saved=roundtrip(s);assert.equal(getThread(saved,'fellow').messages.at(-1).text,body);
  s=E.replyMessage(saved,'fellow','ask');assert.deepEqual(s.campaign,before);assert.equal(s.conversations.pending,null);roundtrip(s);
  assert.equal(voiceProfile(s,{id:'fellow'}).interest,voiceProfile(s,{id:'fellow'}).interest);
});
test('relationships show at most twelve people and search still finds distant acquaintances',()=>{
  const s=fresh(),contacts=getContacts(s),page=contactPage(s,contacts);
  assert.ok(page.contacts.length<=12);assert.ok(page.contacts.some(p=>p.familyRole));
  const target=contacts.at(-1),found=contactPage(s,contacts,{scope:'all',query:target.name});assert.ok(found.contacts.some(p=>p.id===target.id));
  const layouts=new Set(s.world.locations.map(site=>JSON.stringify(settlementLayout({...s,locationId:site.id}))));assert.ok(layouts.size>1);
});
test('supernatural shortcuts are absent; genuine night travel rolls once per week at low incidence',()=>{
  const s=fresh();assert.equal(E.getActions(s).some(a=>['curse_darkness','vampire_invitation','lycan_invitation'].includes(a.id)),false);
  let met=0;for(let i=0;i<4000;i++){const q={...s,seed:'rare-'+i,day:s.day+1,nightEncounters:undefined};queueRareNightEncounter(q,s.day,{outdoors:true,night:true});if(q.nightEncounters?.pending)met++;const copy=structuredClone(q.nightEncounters);queueRareNightEncounter(q,s.day,{outdoors:true,night:true});assert.deepEqual(q.nightEncounters,copy);}
  assert.ok(met>0&&met<20,`rare events: ${met}/4000`);
  const sheltered={...s,day:s.day+1};queueRareNightEncounter(sheltered,s.day,{outdoors:false,night:true});assert.equal(sheltered.nightEncounters?.pending,undefined);
});
test('new UI handlers publish neither movement nor gear changes from a single inspection',async t=>{
  let initial=fresh();const client=settlementServices(initial).find(r=>r.kind==='contracts');assert.ok(client);initial=atService(initial,'adventure_accept_'+client.subjectId);initial=E.visitService(initial,client.id);
  const ui=await mountApp(t,{states:[initial]});await ui.click('title-continue');await ui.click('tab','inventory');
  assert.equal(ui.root.controls.filter(c=>c.dataset.op==='gear-slot').length,EQUIPMENT_SLOTS.length);
  await ui.click('gear-slot','head');assert.equal(ui.root.querySelector('#inventory-slot').value,'head');
  await ui.click('menu');await ui.click('tab','journal');assert.ok(ui.root.querySelector('[data-op="activity"][data-id="journal_main_accept"]')); await ui.click('activity','journal_main_accept');assert.equal(ui.current().questLog.main,'active');
  await ui.click('journal-category','radiant');assert.equal(ui.root.querySelector('[data-op="journal-category"][data-id="radiant"]').getAttribute('aria-pressed'),'true');assert.match(ui.root.querySelector('#journal-active-results').textContent,/0 matching/);assert.match(ui.root.innerHTML,/No Active Quests/);
  const contract=E.getActions(ui.current()).find(a=>a.id.startsWith('adventure_accept_'));assert.ok(contract);
  await ui.click('tab','map');await ui.click('place-open');await ui.click('service-open',client.id);await ui.click('activity',contract.id);await ui.click('menu');await ui.click('tab','journal');await ui.click('journal-category','radiant');assert.ok(ui.root.controls.some(c=>c.dataset.id==='adventure_abandon_'+contract.id.slice('adventure_accept_'.length)));
  await ui.click('tab','map');const before=ui.current(),destination=Object.keys(before.cartography.sites).find(id=>id!==before.locationId&&!E.exploreTravelPreview(before,id).disabledReason);assert.ok(destination);
  await ui.click('destination-select',destination);assert.deepEqual(ui.current(),before,'destination inspection is free');await ui.click('travel',destination);assert.deepEqual(ui.current(),E.startExploreJourney(before,destination));assert.ok(E.validateSave(ui.current()));
});

test('new personal stories have three chapters while an earlier five-chapter arc keeps its length',()=>{
  let s=fresh();const offered=E.getActions(s).find(a=>a.id.startsWith('stories_open_'));assert.ok(offered);s=E.chooseAction(s,offered.id);assert.equal(storyView(s).arcs.at(-1).totalChapters,3);roundtrip(s);
  const old=structuredClone(s);old.stories.arcs.at(-1).contentVersion=3;assert.equal(storyView(old).arcs.at(-1).totalChapters,5);assert.ok(E.migrateSave(old));
});
test('rare patrons and rangers open real invitations; declining creatures never changes the hero',()=>{
  for(const kind of ['patron','ranger','vampire','lycanthrope']){let s=fresh();s.nightEncounters={lastWeek:Math.floor(s.day/7),pending:kind,day:s.day};s=E.chooseAction(s,'rest');assert.equal(s.event?.id,'curse_rare_meeting');roundtrip(s);
    s=E.chooseEventOption(s,['patron','ranger'].includes(kind)?'speak':'withdraw');assert.equal(s.event?.id,['patron','ranger'].includes(kind)?kind==='patron'?'vampire_offer':'lycan_offer':undefined);assert.equal(s.hero.condition,null);assert.ok(E.validateSave(s));
  }
});
test('a chosen childhood focus develops through a lived year and never grants an instant skill',async()=>{
  let s=settle(await createLifeAtAge({seed:'v25-child-focus',startAge:12,difficulty:'gentle'}));const defense=s.hero.skills.defense;s=E.chooseAction(s,'upbringing_practice');assert.equal(s.hero.skills.defense,defense);s=E.ageUp(s);assert.ok(s.upbringing.records.some(r=>r.age===12&&r.focus==='practice'&&r.developed));assert.ok(s.hero.skills.defense>defense);assert.ok(E.validateSave(s));
});

test('older shields and cloaks use proper loadout slots; adding body armor and an amulet preserves both',()=>{
  let s=fresh();s.equipment.owned=['iron_sword','travel_cloak','oak_shield','leather_armor','scholar_charm'];s.equipment.equipped={weapon:'iron_sword',armor:'travel_cloak',trinket:'oak_shield'};const old=structuredClone(s.equipment);assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(s).equipment,old);
  assert.equal(projectedEquipment(s).cloak,'travel_cloak');assert.equal(projectedEquipment(s).offhand,'oak_shield');s=E.equipGear(s,'leather_armor');s=E.equipGear(s,'scholar_charm');assert.equal(projectedEquipment(s).offhand,'oak_shield');assert.equal(projectedEquipment(s).cloak,'travel_cloak');assert.equal(projectedEquipment(s).armor,'leather_armor');assert.equal(gearBonuses(s).armor,4);assert.equal(gearBonuses(s).magic,2);roundtrip(s);
  s=E.equipGear(s,'unequip_offhand');assert.equal(projectedEquipment(s).offhand,null);assert.equal(gearBonuses(s).armor,3);roundtrip(s);
});
