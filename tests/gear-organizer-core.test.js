import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GEAR_CATALOG, GEAR_PRESET_IDS, initializeGear, validateGear, validateGearOrganizer, gearOrganizer, projectedEquipment, equipItem, discardGear, getGearItem, gearBonuses } from '../dist/js/gear.js';
import { EQUIPMENT_SLOTS } from '../dist/js/gear-loot.js';
import { saveGearPreset, renameGearPreset, replaceGearPreset, deleteGearPreset, toggleGearFavorite, stageGearPreset, gearPreset, gearPresetFingerprint, nextGearPresetId } from '../dist/js/gear-organizer.js';

function fresh(){const s={characterDialogueVersion:28,day:12,hero:{path:'warrior',attributes:{strength:6},skills:{weapons:2}},equipment:null};initializeGear(s);return s;}
const accept=(s,result)=>{assert.equal(result.ok,true,result.reason);return {...s,equipment:result.equipment};};
function own(s,id){s.equipment.owned.push(id);return id;}
function found(s,baseId,serial='piece',extra={}){const id=`found_${serial}_1`;s.equipment.instances.push({id,baseId,quality:'rare',affix:'vanguard',tier:3,source:'home',day:1,...extra});own(s,id);return id;}
function saved(){const s=fresh();own(s,'iron_sword');own(s,'travel_cloak');equipItem(s,'iron_sword');equipItem(s,'travel_cloak');return accept(s,saveGearPreset(s,'loadout_1','Road kit'));}
const assertPure=(s,operation)=>{const before=structuredClone(s),result=operation();assert.deepEqual(s,before);return result;};

test('absent metadata remains absent in new gear, old gear initialization, reads and JSON round trips',()=>{
  const s=fresh(),before=structuredClone(s);assert.equal(Object.hasOwn(s.equipment,'organizer'),false);
  initializeGear(s);gearOrganizer(s);nextGearPresetId(s);gearPreset(s,'loadout_1');
  assert.deepEqual(s,before);assert.ok(validateGear(s.equipment));assert.deepEqual(JSON.parse(JSON.stringify(s)),before);
  assert.equal(validateGearOrganizer(undefined,s.equipment),true);
});
test('initialization and migration sources have no eager organizer insertion or preset application',()=>{
  const gear=readFileSync(new URL('../dist/js/gear.js',import.meta.url),'utf8'),engine=readFileSync(new URL('../dist/js/engine.js',import.meta.url),'utf8');
  assert.doesNotMatch(gear.slice(gear.indexOf('export function initializeGear'),gear.indexOf('export function gearBonuses')),/organizer|stageGearPreset/);
  assert.doesNotMatch(engine.slice(engine.indexOf('function enableRoleplayUpdates'),engine.indexOf('function resumeRoad')),/organizer|stageGearPreset|saveGearPreset/);
});
test('the first real metadata mutation creates only a bounded organizer without touching the original',()=>{
  const s=fresh();own(s,'iron_sword');const r=assertPure(s,()=>toggleGearFavorite(s,'iron_sword'));
  assert.equal(r.changed,true);assert.deepEqual(r.equipment.organizer,{version:1,favorites:['iron_sword'],presets:[]});
  assert.deepEqual({...r.equipment,organizer:undefined},{...s.equipment,organizer:undefined});assert.ok(validateGear(r.equipment));
  for(const id of ['missing','gear:iron_sword']){const bad=assertPure(s,()=>toggleGearFavorite(s,id));assert.equal(bad.ok,false);assert.equal(Object.hasOwn(s.equipment,'organizer'),false);}
});
test('capture records every canonical slot, including empty slots and relocated legacy gear',()=>{
  const s=fresh();s.equipment.owned=['iron_sword','travel_cloak','oak_shield','iron_helm','focus_ring'];s.equipment.equipped={weapon:'iron_sword',armor:'travel_cloak',trinket:'oak_shield'};
  equipItem(s,'iron_helm');equipItem(s,'focus_ring');const next=accept(s,assertPure(s,()=>saveGearPreset(s,'loadout_1','  Road kit  '))),p=gearPreset(next,'loadout_1');
  assert.equal(p.label,'Road kit');assert.deepEqual(p.slots,projectedEquipment(s));assert.equal(p.slots.cloak,'travel_cloak');assert.equal(p.slots.offhand,'oak_shield');assert.equal(p.slots.head,'iron_helm');assert.equal(p.slots.ring,'focus_ring');assert.equal(p.slots.armor,null);assert.equal(Object.keys(p.slots).length,10);assert.ok(validateGear(next.equipment));
});
test('all four fixed preset IDs are usable but cannot overwrite or expand implicitly',()=>{
  let s=fresh();for(const id of GEAR_PRESET_IDS){assert.equal(nextGearPresetId(s),id);s=accept(s,saveGearPreset(s,id,id));}
  assert.equal(nextGearPresetId(s),null);for(const id of ['loadout_5','loadout_1'])assert.equal(assertPure(s,()=>saveGearPreset(s,id,'Another')).ok,false);
});
test('labels reject blank, excessive and control text while markup remains inert saved text',()=>{
  const s=fresh();for(const label of ['', '   ','a'.repeat(41),'Road\nkit','Road\u0000kit',null])assert.equal(assertPure(s,()=>saveGearPreset(s,'loadout_1',label)).ok,false);
  const next=accept(s,saveGearPreset(s,'loadout_1','<img src=x onerror="evil()">'));assert.equal(gearPreset(next,'loadout_1').label,'<img src=x onerror="evil()">');
});
test('replacement/deletion require current fingerprints; rename and identical replacement are no-ops',()=>{
  let s=saved();const p=gearPreset(s,'loadout_1'),fingerprint=gearPresetFingerprint(p);
  assert.equal(renameGearPreset(s,p.id,p.label).changed,false);assert.equal(replaceGearPreset(s,p.id,fingerprint).changed,false);
  s=accept(s,renameGearPreset(s,p.id,'New kit'));assert.equal(replaceGearPreset(s,p.id,fingerprint).ok,false);assert.equal(deleteGearPreset(s,p.id,fingerprint).ok,false);
  equipItem(s,'unequip_weapon');const newFingerprint=gearPresetFingerprint(gearPreset(s,p.id));s=accept(s,replaceGearPreset(s,p.id,newFingerprint));assert.equal(gearPreset(s,p.id).slots.weapon,null);
  s=accept(s,deleteGearPreset(s,p.id,gearPresetFingerprint(gearPreset(s,p.id))));assert.equal(gearPreset(s,p.id),null);assert.equal(deleteGearPreset(s,p.id,newFingerprint).ok,false);
});
test('full staging uses existing equips and preserves all ownership, resources, metadata and base stats',()=>{
  let s=saved();const desired=projectedEquipment(s);own(s,'scholar_charm');equipItem(s,'unequip_cloak');equipItem(s,'scholar_charm');
  const r=assertPure(s,()=>stageGearPreset(s,'loadout_1'));assert.equal(r.ok,true);assert.equal(r.changed,true);assert.deepEqual(projectedEquipment({...s,equipment:r.equipment}),desired);assert.deepEqual({...r.equipment,equipped:null},{...s.equipment,equipped:null});
  const actual=structuredClone(s);for(const slot of EQUIPMENT_SLOTS)equipItem(actual,'unequip_'+slot);for(const id of Object.values(desired))if(id)equipItem(actual,id);assert.deepEqual(r.equipment.equipped,actual.equipment.equipped);assert.deepEqual(gearBonuses({...s,equipment:r.equipment}),gearBonuses(actual));
});
test('an already active loadout returns the original equipment reference without a write',()=>{
  const s=saved(),r=assertPure(s,()=>stageGearPreset(s,'loadout_1'));assert.equal(r.ok,true);assert.equal(r.changed,false);assert.equal(r.equipment,s.equipment);
});
test('one sold piece prevents every available change and keeps its missing name',()=>{
  const s=saved();discardGear(s,'iron_sword');equipItem(s,'unequip_cloak');const r=assertPure(s,()=>stageGearPreset(s,'loadout_1'));
  assert.equal(r.ok,false);assert.equal(r.changed,false);assert.equal(r.equipment,undefined);assert.equal(r.issues.length,1);assert.equal(r.issues[0].id,'iron_sword');assert.equal(r.issues[0].name,'Iron longsword');assert.equal(s.equipment.equipped.cloak,null);assert.ok(validateGear(s.equipment));
});
test('different instances or a catalog base never substitute for a missing instance',()=>{
  let s=fresh();const first=found(s,'iron_sword','first'),second=found(s,'iron_sword','second',{affix:'arcanist',quality:'epic'});own(s,'iron_sword');equipItem(s,first);s=accept(s,saveGearPreset(s,'loadout_1','Exact sword'));discardGear(s,first);equipItem(s,second);
  const r=assertPure(s,()=>stageGearPreset(s,'loadout_1'));assert.equal(r.ok,false);assert.equal(r.issues[0].id,first);assert.equal(projectedEquipment(s).weapon,second);assert.ok(s.equipment.owned.includes('iron_sword'));assert.equal(getGearItem(s,first),null);assert.ok(validateGear(s.equipment));
});
test('stolen pieces retain provenance in staging and removal prunes only the favorite',()=>{
  let s=fresh();const id='stolen_1_1',record={id,baseId:'iron_sword',stolen:true,quality:'common',affix:'plain',tier:1,source:'home',day:1,provenance:{lootId:'stall-piece',label:'Iron longsword',ownerId:'merchant-home',ownerName:'Shopkeeper',propertyId:null,value:55}};
  s.equipment.instances.push(record);own(s,id);equipItem(s,id);s=accept(s,saveGearPreset(s,'loadout_1','Borrowed trouble'));s=accept(s,toggleGearFavorite(s,id));equipItem(s,'unequip_weapon');
  const staged=assertPure(s,()=>stageGearPreset(s,'loadout_1'));assert.equal(staged.ok,true);assert.deepEqual(staged.equipment.instances[0],record);discardGear(s,id);assert.deepEqual(gearOrganizer(s).favorites,[]);assert.equal(gearPreset(s,'loadout_1').slots.weapon,id);assert.equal(stageGearPreset(s,'loadout_1').ok,false);assert.ok(validateGear(s.equipment));
});
test('validation rejects oversized, duplicate, unknown-key, malformed and stat-bearing metadata',()=>{
  const good=saved();const variants=[
    o=>o.version=2,o=>o.extra=true,o=>o.favorites=['iron_sword','iron_sword'],o=>o.favorites=['found_missing_1'],o=>o.presets.push(structuredClone(o.presets[0])),o=>o.presets[0].slots.extra=null,o=>delete o.presets[0].slots.feet,o=>o.presets[0].slots.offhand='iron_sword',o=>o.presets[0].slots.weapon='gear:iron_sword',o=>o.presets[0].names.weapon='x'.repeat(161),o=>o.presets[0].names.feet='Boots',o=>o.presets[0].bonuses={attack:999},o=>o.presets[0].names.weapon={attack:999},o=>o.presets[0].label='\n',
  ];
  for(const mutate of variants){const s=structuredClone(good);mutate(s.equipment.organizer);assert.equal(validateGear(s.equipment),false);assert.equal(assertPure(s,()=>stageGearPreset(s,'loadout_1')).ok,false);}
  for(const organizer of [null,[],true,'bad']){const s=structuredClone(good);s.equipment.organizer=organizer;assert.equal(validateGear(s.equipment),false);}
});
test('a currently owned wrong-slot reference is rejected at application rather than moved',()=>{
  const s=saved(),p=gearPreset(s,'loadout_1');p.slots.feet=p.slots.weapon;p.names.feet=p.names.weapon;p.slots.weapon=null;delete p.names.weapon;assert.ok(validateGear(s.equipment));const r=assertPure(s,()=>stageGearPreset(s,'loadout_1'));assert.equal(r.ok,false);assert.equal(r.issues[0].slot,'feet');assert.equal(s.equipment.equipped.weapon,'iron_sword');
});
test('a full bag can favorite every owned exact item without changing the 120-instance bound',()=>{
  let s=fresh();for(const item of GEAR_CATALOG)own(s,item.id);for(let i=0;i<120;i++)found(s,'iron_sword','bag'+i);
  const original=structuredClone(s);for(const id of s.equipment.owned)s=accept(s,toggleGearFavorite(s,id));assert.equal(gearOrganizer(s).favorites.length,GEAR_CATALOG.length+120);assert.equal(s.equipment.instances.length,120);assert.deepEqual({...s.equipment,organizer:undefined},{...original.equipment,organizer:undefined});assert.ok(validateGear(s.equipment));
});
