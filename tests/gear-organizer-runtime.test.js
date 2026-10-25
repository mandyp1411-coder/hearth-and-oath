import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateSave, validateSave, equipmentActionReason, gearOrganizerCommand, equipGear, chooseAction, getActions } from '../dist/js/engine.js';
import { getGearItem, gearOrganizer, projectedEquipment } from '../dist/js/gear.js';
import { gearPreset, gearPresetFingerprint } from '../dist/js/gear-organizer.js';
import { lootBasketQuote } from '../dist/js/realm.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';

const fixtures=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url),'utf8')).states;
// Genuine saved-life inputs; controlled equipment fixtures are not earned-life
// audit outcomes and do not change the production acquisition system.
function fresh(){const s=migrateSave(fixtures.adult18);assert.ok(s);assert.equal(equipmentActionReason(s),null);s.equipment.owned.push('iron_sword','travel_cloak');return s;}
function run(s,command){const before=structuredClone(s),r=gearOrganizerCommand(s,command);assert.deepEqual(s,before);assert.equal(r.ok,true,r.reason);assert.ok(validateSave(r.state));return r.state;}
function saved(){let s=fresh();s=equipGear(s,'iron_sword');s=equipGear(s,'travel_cloak');return run(s,{kind:'save',id:'loadout_1',label:'Road kit'});}

test('actual migration keeps absent organizer absent and does not mutate legacy inputs',()=>{
  for(const name of ['adult18','midbattle','pendingRoad','pendingProject','newborn']){const old=fixtures[name],before=structuredClone(old),s=migrateSave(old);assert.ok(s,name);assert.ok(validateSave(s));assert.equal(Object.hasOwn(s.equipment,'organizer'),false);assert.deepEqual(old,before);const next=migrateSave(s);assert.deepEqual(next,s);assert.equal(Object.hasOwn(next.equipment,'organizer'),false);}
});
test('engine bookmark operations change only equipment metadata and do not advance afterAction',()=>{
  let s=fresh();for(const command of [{kind:'favorite',id:'iron_sword'},{kind:'save',id:'loadout_1',label:'Road kit'},{kind:'rename',id:'loadout_1',label:'New road kit'}]){const before=structuredClone(s);s=run(s,command);assert.deepEqual({...s,equipment:null},{...before,equipment:null});assert.deepEqual({...s.equipment,organizer:null},{...before.equipment,organizer:null});}
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))),s);assert.ok(validateSave(s));
});
test('every current preparation barrier blocks preset application with exact state identity',()=>{
  const original=saved();const barriers=[
    s=>s.battle={},s=>s.event={},s=>s.conversations.pending={},s=>s.maze={},s=>s.delve={},s=>s.justice.prison={},s=>s.cartography.pending={},s=>s.timeline.journey={},s=>s.workshop.project={},s=>s.careers.batch={},s=>s.life.plan={},s=>s.yardTournament={stage:'preparing'},s=>s.conversations.project={},s=>s.rpg.project={},s=>s.stories.project={},s=>s.familyOrigins.project={},s=>s.health.recovery={},s=>s.society.project={},s=>s.community.project={commitment:{}},s=>s.fellowship.project={},s=>s.sanctuaries.commitment={},s=>s.lineage={adoption:{preparation:{}}},s=>s.pastimes.project={},s=>s.phase='retired',s=>s.age=15,
  ];
  for(const block of barriers){const s=structuredClone(original);block(s);const before=structuredClone(s),reason=equipmentActionReason(s);assert.ok(reason);const r=gearOrganizerCommand(s,{kind:'apply',id:'loadout_1'});assert.equal(r.ok,false);assert.equal(r.reason,reason);assert.equal(r.state,s);assert.deepEqual(s,before);}
});
test('a planned destination and a safe paused hex keep the current single-equip policy',()=>{
  for(const offsite of [false,true]){let s=saved();s=equipGear(s,'unequip_weapon');s.cartography.route={destination:'home',keys:['planned','route'],index:0};s.cartography.offsite=offsite;assert.equal(equipmentActionReason(s),null);const before=structuredClone(s),r=gearOrganizerCommand(s,{kind:'apply',id:'loadout_1'});assert.equal(r.ok,true);assert.equal(projectedEquipment(r.state).weapon,'iron_sword');assert.deepEqual(s,before);}
});
test('rechecking current ownership rejects a previously previewable preset without notice writes',()=>{
  let s=saved();s=equipGear(s,'unequip_weapon');s.equipment.owned=s.equipment.owned.filter(id=>id!=='iron_sword');const before=structuredClone(s),r=gearOrganizerCommand(s,{kind:'apply',id:'loadout_1'});assert.equal(r.ok,false);assert.equal(r.state,s);assert.equal(r.issues[0].id,'iron_sword');assert.deepEqual(s,before);assert.ok(validateSave(s));
});
test('successful application changes only equipped slots, while already active is an exact no-op',()=>{
  let s=saved();s=equipGear(s,'unequip_weapon');const before=structuredClone(s);s=run(s,{kind:'apply',id:'loadout_1'});assert.deepEqual({...s,equipment:null},{...before,equipment:null});assert.deepEqual({...s.equipment,equipped:null},{...before.equipment,equipped:null});const r=gearOrganizerCommand(s,{kind:'apply',id:'loadout_1'});assert.equal(r.ok,true);assert.equal(r.changed,false);assert.equal(r.state,s);
});
test('favoriting is not a sale lock and deliberate sale leaves a named unavailable preset',()=>{
  let s=saved();s=run(s,{kind:'favorite',id:'iron_sword'});s=equipGear(s,'unequip_weapon');for(const room of settlementWalkPath(s,'market'))s=chooseAction(s,'atlas_room_'+room);const offer=getActions(s).find(a=>a.id==='realm_sellgear_iron_sword');assert.ok(offer);assert.equal(offer.disabledReason,undefined);assert.ok(lootBasketQuote(s).items.some(i=>i.id==='iron_sword'));const before=structuredClone(s),gold=s.hero.gold;s=chooseAction(s,'realm_sellgear_iron_sword');assert.ok(validateSave(s));assert.equal(getGearItem(s,'iron_sword').id,'iron_sword');assert.equal(s.equipment.owned.includes('iron_sword'),false);assert.ok(s.hero.gold>gold);assert.deepEqual(gearOrganizer(s).favorites,[]);assert.equal(gearPreset(s,'loadout_1').slots.weapon,'iron_sword');assert.equal(gearPreset(s,'loadout_1').names.weapon,'Iron longsword');assert.equal(gearOrganizerCommand(s,{kind:'apply',id:'loadout_1'}).ok,false);assert.equal(before.equipment.owned.includes('iron_sword'),true);
});
test('stale destructive commands fail and valid destructive commands preserve belongings',()=>{
  let s=saved();const expected=gearPresetFingerprint(gearPreset(s,'loadout_1'));s=run(s,{kind:'rename',id:'loadout_1',label:'Renamed'});for(const kind of ['delete','replace']){const r=gearOrganizerCommand(s,{kind,id:'loadout_1',expected});assert.equal(r.ok,false);assert.equal(r.state,s);}const gear=structuredClone(s.equipment);s=run(s,{kind:'delete',id:'loadout_1',expected:gearPresetFingerprint(gearPreset(s,'loadout_1'))});assert.deepEqual({...s.equipment,organizer:null},{...gear,organizer:null});
});
