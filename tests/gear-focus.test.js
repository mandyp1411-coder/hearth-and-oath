import test from 'node:test';
import {atService} from './helpers/service-visit.mjs';
import assert from 'node:assert/strict';
import { GEAR_CATALOG, initializeGear, equipItem, getGearItem, ownedGear, gearBonuses, gearScore, projectedEquipment, dropEquipment, validateGear } from '../dist/js/gear.js';
import { AFFIXES, setBonuses, setProgress, itemScore, EQUIPMENT_SLOTS } from '../dist/js/gear-loot.js';
import { compareEquipment, equipmentComparator, buildFit } from '../dist/js/gear-comparison.js';
import { renderEquipmentComparison } from '../dist/js/equipment-comparison-ui.js';
import { renderPackWorkspace } from '../dist/js/pack-ui-v28.js';
import { createBattle, takeBattleAction, previewBattleAction } from '../dist/js/combat.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import * as E from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Affordability, position and recovered pieces are controlled QA fixtures, not
// new audit lives. Every asserted bonus still comes from canonical item data.
let base=await createLifeAtAge({seed:'gear-focus-six',startAge:18,difficulty:'gentle'});
for(let i=0;base.event&&i<50;i++)base=E.chooseEventOption(base,(base.event.choices.find(c=>['care','later','keep','continue'].includes(c.id)&&!c.disabledReason)||base.event.choices.find(c=>!c.disabledReason)).id);
assert.ok(E.validateSave(base));
function fresh(){const s=structuredClone(base);s.hero.gold=10000;s.equipment.owned=[];s.equipment.instances=[];s.equipment.equipped=Object.fromEntries(EQUIPMENT_SLOTS.map(k=>[k,null]));return s;}
let serial=0;
function found(s,baseId,affix='vanguard',quality='rare'){
 const id=`found_gearfocus${++serial}_1`;s.equipment.instances.push({id,baseId,affix,quality,tier:3,source:s.locationId,day:s.day});s.equipment.owned.push(id);return id;
}
function build(affix,count=3){const s=fresh();for(const id of ['field_shield','field_helm','leather_armor','leather_gloves','trail_boots'].slice(0,count))equipItem(s,found(s,id,affix));return s;}
function roundtrip(s){assert.ok(E.validateSave(s));const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}
const pieces=s=>ownedGear(s).filter(i=>Object.values(s.equipment.equipped).includes(i.id));
const empty=()=>({attack:0,armor:0,magic:0,agility:0});

test('replacement preview includes the lost three-piece bonus, every raw stat and actual slot',()=>{
 const s=build('vanguard');s.equipment.owned.push('scholar_hood');const before=structuredClone(s),p=compareEquipment(s,'scholar_hood');assert.deepEqual(s,before);
 assert.equal(p.changes.length,1);assert.equal(p.changes[0].slot,'head');assert.equal(p.setChanges[0].beforeCount,3);assert.equal(p.setChanges[0].afterCount,2);assert.equal(p.setChanges[0].thresholds[0].afterActive,false);
 const actual=structuredClone(s);equipItem(actual,'scholar_hood');assert.deepEqual(p.after.bonuses,gearBonuses(actual));assert.deepEqual(p.delta,Object.fromEntries(Object.keys(empty()).map(k=>[k,gearBonuses(actual)[k]-gearBonuses(s)[k]])));assert.ok(p.delta.armor<=-5);assert.equal(p.delta.magic,1);
});
test('an unowned shop piece previews the full result without purchase, gold, stock or loadout changes',()=>{
 const s=build('vanguard'),before=structuredClone(s),p=compareEquipment(s,'scholar_hood');assert.equal(p.owned,false);assert.deepEqual(s,before);assert.equal(s.equipment.owned.includes('scholar_hood'),false);
 const next=structuredClone(s);next.equipment.owned.push('scholar_hood');equipItem(next,'scholar_hood');assert.deepEqual(p.after.bonuses,gearBonuses(next));
});
test('unequipping previews its lost threshold and agrees with the actual operation',()=>{
 const s=build('bastion',5),p=compareEquipment(s,'unequip_feet');assert.equal(p.removing,true);assert.equal(p.setChanges[0].thresholds.find(t=>t.count===3).afterActive,true);assert.equal(p.setChanges[0].thresholds.find(t=>t.count===5).afterActive,false);
 const next=structuredClone(s);equipItem(next,'unequip_feet');assert.deepEqual(p.after.bonuses,gearBonuses(next));assert.equal(p.after.score,gearScore(next));
});
test('replacing one matching piece preserves its threshold without stacking a second bonus',()=>{
 const s=build('channeler'),id=found(s,'scholar_hood','channeler');const p=compareEquipment(s,id);assert.deepEqual(p.setChanges,[]);const after=structuredClone(s);equipItem(after,id);assert.equal(pieces(after).length,3);assert.deepEqual(p.after.bonuses,gearBonuses(after));
});
test('legacy cloak and shield positions are preserved while prospective body armor relocates them correctly',()=>{
 const s=fresh();s.equipment.owned=['travel_cloak','oak_shield','leather_armor','scholar_charm'];s.equipment.equipped={weapon:null,armor:'travel_cloak',trinket:'oak_shield'};const before=structuredClone(s);
 const p=compareEquipment(s,'leather_armor');assert.deepEqual(s,before);assert.equal(p.changes.length,1);assert.equal(p.changes[0].slot,'armor');assert.equal(p.delta.armor,2);
 const next=structuredClone(s);equipItem(next,'leather_armor');equipItem(next,'scholar_charm');assert.equal(projectedEquipment(next).cloak,'travel_cloak');assert.equal(projectedEquipment(next).offhand,'oak_shield');assert.deepEqual(p.after.bonuses,gearBonuses({...next,equipment:{...next.equipment,equipped:{...next.equipment.equipped,trinket:null}}}));
 assert.equal(compareEquipment(s,'unequip_cloak').delta.armor,-1);roundtrip(s);
});
test('original three-slot lives retain their original slot semantics in a pure comparison',()=>{
 const s={revision:2,hero:{path:'warrior',name:'Old life',attributes:{strength:6},skills:{weapons:2}},equipment:null};initializeGear(s,{starter:true});s.equipment.owned.push('leather_armor');const p=compareEquipment(s,'leather_armor'),after=structuredClone(s);equipItem(after,'leather_armor');assert.equal(p.changes[0].slot,'armor');assert.equal(p.delta.armor,1);assert.deepEqual(p.after.bonuses,gearBonuses(after));
});
test('empty, unknown and malformed comparison requests do not manufacture equipment',()=>{
 const s=fresh(),before=structuredClone(s);for(const id of [null,'unknown','unequip_head','unequip_notaslot'])assert.equal(compareEquipment(s,id),null);assert.deepEqual(s,before);
});
for(const affix of ['striker','channeler','bastion'])test(`${affix} keeps distinct three- and five-piece tradeoffs through 0–6 pieces`,()=>{
 const s=fresh(),ids=['field_shield','field_helm','leather_armor','leather_gloves','trail_boots','field_belt'];
 for(let count=0;count<=6;count++){
  if(count)equipItem(s,found(s,ids[count-1],affix));
  const sets=setProgress(pieces(s)),bonuses=setBonuses(pieces(s));assert.equal(bonuses.length,count>=3?1:0);
  if(count){assert.equal(sets[0].count,count);assert.equal(sets[0].thresholds[0].active,count>=3);assert.equal(sets[0].thresholds[1].active,count>=5);}
  const raw=pieces(s).reduce((a,i)=>{for(const k of Object.keys(a))a[k]+=i.bonuses[k];return a;},empty());for(const t of AFFIXES[affix].thresholds.filter(t=>count>=t.count))for(const [k,n]of Object.entries(t.bonuses))raw[k]+=n;
  assert.deepEqual(gearBonuses(s),raw);
 }
 roundtrip(s);
});
test('three complete build goals prefer different loadouts at exactly equal overall score',()=>{
 const sets=Object.fromEntries(['striker','channeler','bastion'].map(id=>[id,build(id)]));assert.equal(new Set(Object.values(sets).map(gearScore)).size,1);
 const stats=Object.fromEntries(Object.entries(sets).map(([id,s])=>[id,gearBonuses(s)]));assert.ok(stats.striker.attack>stats.channeler.attack&&stats.striker.attack>stats.bastion.attack);assert.ok(stats.channeler.magic>stats.striker.magic&&stats.channeler.magic>stats.bastion.magic);assert.ok(stats.bastion.armor>stats.striker.armor&&stats.bastion.armor>stats.channeler.armor);
 const goalFor={weapon:'striker',caster:'channeler',defender:'bastion'};
 for(const [goal,wanted]of Object.entries(goalFor)){const ranked=Object.entries(stats).map(([id,delta])=>({id,fit:buildFit({delta},goal)})).sort((a,b)=>b.fit-a.fit);assert.equal(ranked[0].id,wanted);}
});
test('matched score changes actual weapon damage, spell damage and physical protection',()=>{
 function battle(affix){const s=build(affix);for(const k of ['strength','intellect','willpower','agility'])s.hero.attributes[k]=8;s.hero.skills.arcana=4;s.hero.skills.weapons=4;s.hero.skills.defense=3;s.hero.path='warrior';const b=createBattle(s,'forest',null,{openingTurns:false});b.currentActorId='hero';for(const e of b.actors.filter(a=>a.side==='enemy')){e.hp=e.maxHp=300;e.attackPower=20;e.resistances=[];e.weakness='ice';}return b;}
 const a=battle('striker'),m=battle('channeler'),d=battle('bastion');
 const hit=(b,id)=>previewBattleAction(b,id,'enemy-1').effects.find(e=>e.id==='enemy-1').hp;
 assert.ok(hit(a,'attack')<hit(d,'attack'));assert.ok(hit(m,'spell_fire')<hit(a,'spell_fire'));
 const nextA=takeBattleAction(a,'defend'),nextD=takeBattleAction(d,'defend');const loss=b=>b.actors.find(a=>a.id==='hero').hp;assert.ok(loss(nextD)>loss(nextA));assert.ok(d.actors.find(a=>a.id==='hero').armor>a.actors.find(a=>a.id==='hero').armor);
});
test('the original affixes and saved old instances retain their exact bonuses and three-piece reward',()=>{
 const expected={vanguard:{armor:1},duelist:{attack:1},arcanist:{magic:1},wayfarer:{agility:1}};
 for(const [affix,bonus]of Object.entries(expected)){assert.deepEqual(AFFIXES[affix].bonuses,bonus);const s=build(affix,5),active=setBonuses(pieces(s));assert.equal(active.length,1);assert.deepEqual(active[0].bonuses,Object.fromEntries(Object.keys(bonus).map(k=>[k,2])));assert.equal(active[0].thresholds.length,1);roundtrip(s);}
});
test('common pieces never activate an affix or set and edited record stats are not trusted',()=>{
 const s=fresh();for(const baseId of ['field_shield','field_helm','leather_armor'])equipItem(s,found(s,baseId,'bastion','common'));assert.deepEqual(setBonuses(pieces(s)),[]);assert.deepEqual(setProgress(pieces(s)),[]);
 const record=s.equipment.instances[0],before=getGearItem(s,record.id).bonuses;record.bonuses={attack:99999};record.thresholds=[{count:1,bonuses:{armor:99999}}];assert.deepEqual(getGearItem(s,record.id).bonuses,before);
});
test('new affixes actually appear in deterministic recovered loot and never reroll the same source',()=>{
 const s=fresh(),seen=new Set();for(let i=0;i<100;i++){const item=dropEquipment(s,'gear-variety-'+i,6);if(item.quality!=='common')seen.add(item.affix);}
 for(const id of ['striker','channeler','bastion'])assert.ok(seen.has(id),id);const before=structuredClone(s);assert.equal(dropEquipment(s,'gear-variety-0',6),null);assert.deepEqual(s,before);roundtrip(s);
});
test('gear tradeoffs cannot produce negative effective armor or an invalid battle',()=>{
 const s=fresh();const id=found(s,'bone_focus','channeler');equipItem(s,id);s.hero.skills.defense=0;assert.equal(gearBonuses(s).armor,-1);const p=compareEquipment(s,'unequip_offhand');assert.equal(p.before.combat.armor,0);
 s.battle={...createBattle(s,'forest'),instanceId:'gear-negative-armor'};assert.equal(s.battle.actors.find(a=>a.id==='hero').armor,0);roundtrip(s);
});
test('legitimate maximum-stat loadouts fit the battle resource bounds and preserve captured actors',()=>{
 for(const stat of ['attack','armor','magic','agility']){
  const s=fresh();
  for(const slot of EQUIPMENT_SLOTS){let best=null;for(const item of GEAR_CATALOG){const id=found(s,item.id,'channeler','legendary');s.equipment.instances.at(-1).tier=6;const resolved=getGearItem(s,id);if(resolved.slot===slot&&(!best||resolved.bonuses[stat]>best.bonuses[stat]))best=resolved;s.equipment.owned.pop();s.equipment.instances.pop();}
   if(best){s.equipment.instances.push({id:best.id,baseId:best.baseId,affix:'channeler',quality:'legendary',tier:6,source:s.locationId,day:s.day});s.equipment.owned.push(best.id);equipItem(s,best.id);}}
  s.battle={...createBattle(s,'forest'),instanceId:'gear-max-'+stat};roundtrip(s);const captured=structuredClone(s.battle);compareEquipment(s,'starter_sword');assert.deepEqual(s.battle,captured);
 }
});
test('comparators cache only detached results and effective previews match new battle actors',()=>{
 const s=build('striker'),compare=equipmentComparator(s),p=compare('scholar_hood');assert.equal(compare('scholar_hood'),p);const next=structuredClone(s);next.equipment.owned.push('scholar_hood');equipItem(next,'scholar_hood');const b=createBattle(next,'forest',null,{openingTurns:false}),a=b.actors.find(a=>a.id==='hero');assert.equal(p.after.combat.armor,a.armor);assert.equal(p.after.combat.initiative,a.agility);assert.deepEqual(p.after.bonuses,a.gear);
});
test('shop comparison discloses a lost set before purchase and buying does not equip or alter that set',()=>{
 let s=build('vanguard');const m=s.realm.sites[s.locationId].merchant;m.stock.scholar_hood=1;m.prices.scholar_hood=39;const before=gearBonuses(s),id=projectedEquipment(s).head,p=compareEquipment(s,'scholar_hood');
 const html=renderEquipmentComparison(p,{e:String},{purchase:true});assert.match(html,/If bought and equipped/);assert.match(html,/Lose 3-piece bonus/);assert.match(html,/Armor \+2/);
 s=atService(s,'gear_buy_scholar_hood');const gold=s.hero.gold;s=E.chooseAction(s,'gear_buy_scholar_hood');assert.equal(s.hero.gold,gold-39);assert.equal(projectedEquipment(s).head,id);assert.deepEqual(gearBonuses(s),before);assert.equal(s.realm.sites[s.locationId].merchant.stock.scholar_hood,0);
 s=E.equipGear(s,'scholar_hood');assert.deepEqual(gearBonuses(s),p.after.bonuses);roundtrip(s);
});
test('a pending encounter permits read-only comparison but blocks changing its captured equipment',()=>{
 const s=build('striker');s.equipment.owned.push('scholar_hood');s.battle={...createBattle(s,'forest'),instanceId:'gear-fixed-capture'};const before=structuredClone(s),p=compareEquipment(s,'scholar_hood');assert.ok(p);assert.deepEqual(s,before);const blocked=E.equipGear(s,'scholar_hood');assert.deepEqual(blocked.equipment,s.equipment);assert.deepEqual(blocked.battle,s.battle);roundtrip(s);
});
test('production Inventory shows actual set loss without a build preference or a change to the life',async t=>{
 const s=build('vanguard');s.equipment.owned.push('scholar_hood');const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','inventory');await ui.click('inventory-item','gear:scholar_hood');const before=ui.current();assert.match(ui.root.innerHTML,/Lose 3-piece bonus/);assert.ok(ui.root.querySelector('[data-equipment-preview="scholar_hood"]'));
 assert.equal(ui.root.querySelector('[data-op="build-goal"]'),null);assert.deepEqual(ui.current(),before);
 const workspace=JSON.parse(ui.storage.getItem(`hearth-and-oath-legacy:workspace:${s.seed}:${s.dynasty.generation}`));assert.equal(workspace.inventoryItem,'gear:scholar_hood');
 await ui.click('equip','scholar_hood');assert.deepEqual(gearBonuses(ui.current()),compareEquipment(s,'scholar_hood').after.bonuses);roundtrip(ui.current());
});
test('production merchant shows comparison outside purchase controls and preserves stock and loadout accounting',async t=>{
 const s=build('vanguard'),m=s.realm.sites[s.locationId].merchant;m.stock.scholar_hood=1;m.prices.scholar_hood=41;const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');await ui.click('place-area','market');const merchant=ui.root.querySelectorAll('[data-op="service-open"]').find(c=>c.dataset.id==='merchant-'+ui.current().locationId);assert.ok(merchant,'the actual equipment merchant is present');await ui.click('service-open',merchant.dataset.id);await ui.click('shop-browse');await ui.click('shop-item','buy:gear:scholar_hood');const preview=ui.root.querySelector('[data-equipment-preview="scholar_hood"]');assert.ok(preview);assert.equal(preview.closest('button'),null);assert.match(ui.root.innerHTML,/Buying leaves your loadout unchanged/);
 await ui.click('shop-add','buy:gear:scholar_hood');await ui.click('shop-confirm');const next=ui.current();assert.equal(next.hero.gold,s.hero.gold-41);assert.deepEqual(next.equipment.equipped,s.equipment.equipped);assert.equal(next.realm.sites[next.locationId].merchant.stock.scholar_hood,0);roundtrip(next);
});
test('a restored older gear bookmark keeps its slot filter without restoring the removed build box',async t=>{
 const s=build('channeler');const key=`hearth-and-oath-legacy:workspace:${s.seed}:${s.dynasty.generation}`,ui=await mountApp(t,{states:[s],storageEntries:[[key,JSON.stringify({tab:'inventory',packPane:'bag',packGoal:'defender',gearFilter:'head'})]]});await ui.click('title-continue');assert.equal(ui.root.querySelector('[data-op="build-goal"]'),null);assert.equal(ui.root.querySelector('#inventory-slot').value,'head');assert.equal(ui.root.querySelectorAll('[data-item-id]').length,1);
});
test('the settlement market exposes the same comparison beside its production purchase command',async t=>{
 let s=build('vanguard');s.realm.sites[s.locationId].merchant.stock.scholar_hood=1;s.realm.sites[s.locationId].merchant.prices.scholar_hood=43;
 const room=E.getActions(s).find(a=>a.id==='atlas_room_market');assert.ok(room&&!room.disabledReason);s=E.chooseAction(s,room.id);roundtrip(s);
 const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');const merchant=ui.root.querySelectorAll('[data-op="service-open"]').find(c=>c.dataset.id==='merchant-'+ui.current().locationId);assert.ok(merchant,'the actual equipment merchant is present');await ui.click('service-open',merchant.dataset.id);await ui.click('shop-browse');await ui.click('shop-item','buy:gear:scholar_hood');
 const preview=ui.root.querySelector('[data-equipment-preview="scholar_hood"]');assert.ok(preview);assert.equal(preview.closest('button'),null);assert.match(ui.root.innerHTML,/Lose 3-piece bonus/);assert.deepEqual(ui.current().equipment,s.equipment);assert.deepEqual(ui.current().realm.sites[s.locationId].merchant,s.realm.sites[s.locationId].merchant);assert.equal(ui.current().day,s.day);assert.equal(ui.current().hero.gold,s.hero.gold);
 await ui.click('shop-add','buy:gear:scholar_hood');await ui.click('shop-confirm');assert.equal(ui.current().hero.gold,s.hero.gold-43);assert.deepEqual(ui.current().equipment.equipped,s.equipment.equipped);roundtrip(ui.current());
});
test('ranking a full recovered-gear bag preserves every item, resource, record and base stat',()=>{
 const s=fresh();for(let i=0;i<120;i++)dropEquipment(s,'full-bag-preview-'+i,6);assert.equal(s.equipment.instances.length,120);const before=structuredClone(s);
 const ui={e:String,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${op}" data-id="${id}" ${disabled?'disabled':''}>${label}</button>`,actionCards:()=>''};
 const html=renderPackWorkspace(s,ui,{pane:'bag',goal:'caster'});assert.equal((html.match(/data-item-id=/g)||[]).length,120);assert.deepEqual(s,before);roundtrip(s);
});
