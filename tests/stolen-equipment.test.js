import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { GEAR_CATALOG, ownedGear, getGearItem, gearBonuses, discardGear, validateGear } from '../dist/js/gear.js';
import { carryStolenGear, migrateStolenGear } from '../dist/js/stolen-gear.js';
import { justiceActions, imprison, onJusticeTime, applyJusticeAction } from '../dist/js/justice.js';
import { lootBasketQuote, sellLootBasket, realmActions, regionAt } from '../dist/js/realm.js';
import { tradeInventory, newTradeDraft, quoteTrade } from '../dist/js/trading.js';
import { economyPlan } from '../dist/js/economy-planning.js';
import { inventoryEntries, renderPlayerInventory } from '../dist/js/inventory-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { seededRoll } from '../dist/js/world.js';
import { renderActivities } from '../dist/js/activities-v31.js';
import { gearSaleValue } from '../dist/js/economy-values.js';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

const saved=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
const base=E.migrateSave(saved);
function valid(s){assert.ok(E.validateSave(s),'valid complete life');return s;}
function roundtrip(s){valid(s);const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}
function walk(s,room='market'){for(const r of settlementWalkPath(s,room)||[])s=valid(E.chooseAction(s,'atlas_room_'+r));return s;}
function act(s,id){const a=E.getActions(s).find(a=>a.id===id);assert.ok(a,id+' offered');assert.ok(!a.disabledReason,a.disabledReason);return valid(E.chooseAction(s,id));}
function answer(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),id+' offered');return valid(E.chooseEventOption(s,id));}
function earnTheft(){
  let s=walk(structuredClone(base));const stock=s.realm.sites[s.locationId].merchant.stock.iron_sword;
  s=act(s,'justice_steal');assert.equal(ownedGear(s).length,0);
  for(const id of ['cooperate','pay','account'])s=answer(s,id);
  s=act(s,'justice_steal');assert.equal(s.day,8034);assert.equal(s.realm.sites[s.locationId].merchant.stock.iron_sword,stock-1);
  assert.equal(ownedGear(s).length,1);return s;
}
// This main regression earns the audited theft through immutable public-engine
// actions. The additional capacity, malformed-save and legacy cases below are
// explicitly controlled QA fixtures, not invented resources in that playthrough.
const stolen=earnTheft();
const fresh=()=>structuredClone(stolen);
const piece=s=>ownedGear(s).find(i=>i.stolen);
const zero={attack:0,armor:0,magic:0,agility:0};
const ui={e:String,chapter:()=>'',button:(label,op,id='',style='',disabled=false)=>`<button data-op="${op}" data-id="${id}" ${disabled?'disabled':''}>${label}</button>`};
function ctx(s){return {spendDays(n){s.day+=n;return n;},standing(){},journal(){},breakOath(){},addEvidence(n,description){s.legal.incidents.push({locationId:s.locationId,evidence:n,description});}};}
function legacy(s,id='old-stolen',extra={}){const m=s.realm.sites[s.locationId].merchant;return {id,name:m.name+'’s iron longsword',value:55,stolen:true,source:s.locationId,day:s.day,ownerId:m.id,ownerName:m.name,propertyId:'stock-retired-merchant-iron_sword',...extra};}

test('actual stall theft gives exactly one ordinary equipable longsword and its recorded provenance',()=>{
  const s=fresh(),i=piece(s),m=s.realm.sites[s.locationId].merchant,b=GEAR_CATALOG.find(g=>g.id==='iron_sword');
  assert.equal(i.baseId,b.id);assert.deepEqual(i.bonuses,b.bonuses);assert.equal(i.price,b.price);assert.equal(i.name,b.name);
  assert.equal(i.provenance.ownerId,m.id);assert.equal(i.provenance.ownerName,m.name);assert.equal(i.provenance.propertyId,`stock-${m.id}-${m.season}-iron_sword`);assert.equal(i.provenance.stockSeason,m.season);
  assert.equal(i.provenance.value,m.prices.iron_sword);assert.equal(s.adventuring.loot.length,base.adventuring.loot.length);assert.equal(inventoryEntries(s).filter(r=>r.item?.id===i.id).length,1);roundtrip(s);
});
test('equip, reload, unequip and fence consume the same piece and pay exactly once',()=>{
  let s=fresh();const i=piece(s),m=s.realm.sites[s.locationId].merchant,stock=structuredClone(m.stock),provenance=structuredClone(i.provenance);
  s=valid(E.equipGear(s,i.id));assert.deepEqual(gearBonuses(s),i.bonuses);s=roundtrip(s);assert.deepEqual(piece(s).provenance,provenance);
  const blocked=E.chooseAction(s,'realm_sellgear_'+i.id);assert.equal(blocked.hero.gold,s.hero.gold);assert.ok(piece(blocked));
  s=valid(E.equipGear(s,'unequip_weapon'));assert.deepEqual(gearBonuses(s),zero);const gold=s.hero.gold,evidence=s.legal.incidents.find(r=>r.locationId===s.locationId)?.evidence||0,witnessed=seededRoll(s.seed,'fence:'+i.provenance.lootId,100)<regionAt(s).law.enforcement/2;
  assert.match(realmActions(s).find(a=>a.id==='realm_sellgear_'+i.id).description,/the fence/);
  s=act(s,'realm_sellgear_'+i.id);assert.equal(s.hero.gold,gold+Math.floor(i.provenance.value*.55));assert.equal(piece(s),undefined);assert.equal(s.legal.incidents.find(r=>r.locationId===s.locationId)?.evidence||0,evidence+(witnessed?1:0));assert.deepEqual(s.realm.sites[s.locationId].merchant.stock,stock);
  assert.equal(s.equipment.instances.some(r=>r.id===i.id),false);assert.equal(inventoryEntries(s).some(r=>r.item?.id===i.id),false);assert.deepEqual(s.justice.propertyTransfers[0].provenance,provenance);assert.equal(s.justice.propertyTransfers[0].recipientId,'fence:'+s.locationId);
  const again=E.chooseAction(s,'realm_sellgear_'+i.id);assert.equal(again.hero.gold,s.hero.gold);assert.deepEqual(again.equipment,s.equipment);roundtrip(s);
});
test('a no-payment return restores only the same current stock and cannot return or sell twice',()=>{
  let s=fresh();const i=piece(s),gold=s.hero.gold,evidence=structuredClone(s.legal),m=s.realm.sites[s.locationId].merchant,stock=m.stock[i.baseId];
  s=act(s,'realm_returngear_'+i.id);assert.equal(s.hero.gold,gold);assert.deepEqual(s.legal,evidence);assert.equal(s.realm.sites[s.locationId].merchant.stock[i.baseId],stock+1);assert.equal(piece(s),undefined);assert.equal(s.justice.propertyTransfers[0].outcome,'returned');assert.equal(s.justice.propertyTransfers[0].price,0);
  const again=E.chooseAction(s,'realm_returngear_'+i.id);assert.equal(again.realm.sites[s.locationId].merchant.stock[i.baseId],stock+1);assert.equal(E.chooseAction(s,'realm_sellgear_'+i.id).hero.gold,gold);roundtrip(s);
});
test('return is not offered for a replacement merchant and never invents stock in a new season',()=>{
  let s=fresh();const i=piece(s);s.realm.sites[s.locationId].merchant.id+=':replacement';assert.equal(realmActions(s).some(a=>a.id==='realm_returngear_'+i.id),false);
  s=fresh();const m=s.realm.sites[s.locationId].merchant;m.season++;const before=structuredClone(m.stock);s=act(s,'realm_returngear_'+i.id);assert.deepEqual(s.realm.sites[s.locationId].merchant.stock,before);roundtrip(s);
});
test('same-base stolen pieces and a lawful copy keep distinct identities and owners',()=>{
  const s=fresh(),first=piece(s);s.equipment.owned.push('iron_sword');const second=carryStolenGear(s,legacy(s,'another-real-asset',{ownerId:'merchant:city:0',ownerName:'Another keeper'}),'iron_sword');
  assert.ok(second);assert.notEqual(first.id,second.id);assert.equal(ownedGear(s).filter(i=>(i.baseId||i.id)==='iron_sword').length,3);assert.notEqual(first.provenance.ownerId,second.provenance.ownerId);roundtrip(s);
});
test('ordinary bulk sales, barter and savings previews cannot launder stolen equipment',()=>{
  const s=fresh(),i=piece(s),before=structuredClone(s);assert.equal(lootBasketQuote(s).items.some(r=>r.id===i.id),false);
  const row=tradeInventory(s).sell.find(r=>r.id==='gear:'+i.id);assert.match(row.disabledReason,/Stolen property/);const draft=newTradeDraft(s);draft.sell=[{id:row.id,quantity:1}];assert.match(quoteTrade(s,draft).disabledReason,/Stolen property/);
  const withStolen=economyPlan(s).sales;discardGear(s,i.id);assert.equal(economyPlan(s).sales,withStolen);const quote=lootBasketQuote(before);quote.items=[{kind:'gear',id:i.id,quotedPrice:1}];assert.equal(sellLootBasket(before,quote),false);
});
test('existing contraband law chooses the original .8 merchant price away from the victim',()=>{
  let s=fresh();const i=piece(s),site=Object.values(s.realm.sites).find(p=>p.merchant&&p.id!==s.locationId&&regionAt(s,p.id).law.contrabandAllowed);assert.ok(site);
  s.locationId=site.id;syncCartography(s);s.cartography.interior={siteId:site.id,roomId:'market'};const gold=s.hero.gold,stock=structuredClone(site.merchant.stock);s=act(s,'realm_sellgear_'+i.id);assert.equal(s.hero.gold,gold+Math.floor(i.provenance.value*.8));assert.equal(s.justice.propertyTransfers[0].recipientId,site.merchant.id);assert.deepEqual(s.realm.sites[site.id].merchant.stock,stock);roundtrip(s);
});
test('a full individual bag refuses stall theft before spending time or removing stock',()=>{
  const s=structuredClone(base);s.equipment.instances=Array.from({length:120},(_,n)=>({id:`found_capacity${n}_1`,baseId:'iron_ring',quality:'common',affix:'plain',tier:1,source:s.locationId,day:s.day}));s.equipment.owned=s.equipment.instances.map(i=>i.id);valid(s);
  assert.match(justiceActions(s).find(a=>a.id==='justice_steal').disabledReason,/120/);const before=structuredClone(s),next=E.chooseAction(s,'justice_steal');assert.equal(next.day,before.day);assert.equal(next.justice.thefts,before.justice.thefts);assert.deepEqual(next.realm,before.realm);assert.deepEqual(next.equipment,before.equipment);
});
test('burglary silver remains a valuable, not equipment or a gear-price substitute',()=>{
  const s=structuredClone(base),chance=35+Math.min(45,s.hero.skills.stealth*3+s.hero.attributes.agility)-20;
  for(let n=1;n<100;n++)if(seededRoll(s.seed,`theft:${n}:${s.locationId}`,100)<chance){s.justice.thefts=n-1;break;}
  const count=s.equipment.owned.length;assert.ok(applyJusticeAction(s,'justice_burglary',ctx(s)));assert.equal(s.equipment.owned.length,count);assert.equal(s.adventuring.loot.length,base.adventuring.loot.length+1);assert.match(s.adventuring.loot.at(-1).name,/household silver/);assert.equal(s.adventuring.loot.at(-1).stolen,true);assert.equal(s.adventuring.loot.at(-1).itemId,undefined);valid(s);
});
test('legacy migration requires explicit known item identity, not display names or property IDs',()=>{
  const s=structuredClone(base),unknown=legacy(s),known=legacy(s,'explicit-known',{itemId:'iron_sword'}),conflict=legacy(s,'conflict',{itemId:'iron_sword',gearId:'ash_staff'}),retired=legacy(s,'unknown-id',{itemId:'retired_sword'});s.adventuring.loot.push(unknown,known,conflict,retired);const stock=structuredClone(s.realm.sites[s.locationId].merchant.stock),history=structuredClone(s.justice.history);
  const migrated=E.migrateSave(s);assert.ok(migrated);assert.deepEqual(migrated.adventuring.loot,[unknown,conflict,retired]);assert.equal(piece(migrated).baseId,'iron_sword');assert.equal(piece(migrated).provenance.propertyId,known.propertyId);assert.equal(piece(migrated).provenance.stockSeason,undefined);assert.deepEqual(migrated.realm.sites[s.locationId].merchant.stock,stock);assert.deepEqual(migrated.justice.history,history);roundtrip(migrated);
});
test('explicit legacy gearId migrates once with unknown owner honestly preserved',()=>{
  const s=structuredClone(base),loot=legacy(s,'explicit-gear',{gearId:'ash_staff'});delete loot.ownerId;delete loot.ownerName;delete loot.propertyId;s.adventuring.loot.push(loot);migrateStolenGear(s);const i=piece(s);assert.equal(i.baseId,'ash_staff');assert.equal(i.provenance.ownerId,null);assert.equal(i.provenance.ownerName,null);assert.equal(i.provenance.propertyId,null);assert.equal(s.adventuring.loot.length,0);migrateStolenGear(s);assert.equal(ownedGear(s).length,1);roundtrip(s);
});
test('legacy loot with no instance capacity remains intact for later, without phantom resources',()=>{
  const s=structuredClone(base);s.equipment.instances=Array.from({length:120},(_,n)=>({id:`found_legacy${n}_1`,baseId:'iron_ring',quality:'common',affix:'plain',tier:1,source:s.locationId,day:s.day}));s.equipment.owned=s.equipment.instances.map(i=>i.id);s.adventuring.loot.push(legacy(s,'explicit-full',{itemId:'iron_sword'}));const before=structuredClone(s);migrateStolenGear(s);assert.deepEqual(s,before);roundtrip(s);
});
test('legacy conversion preserves the exact pending scene and all saved history',()=>{
  let s=walk(structuredClone(base));s=act(s,'justice_steal');assert.ok(s.event);s.adventuring.loot.push(legacy(s,'explicit-pending',{itemId:'iron_sword'}));const event=structuredClone(s.event),sanctuaries=structuredClone(s.sanctuaries),history=structuredClone(s.journal);s=E.migrateSave(s);assert.ok(s);assert.deepEqual(s.event,event);assert.deepEqual(s.sanctuaries,sanctuaries);assert.deepEqual(s.journal,history);assert.ok(piece(s));roundtrip(s);
});
test('custody still holds and returns the actual piece without new confiscation or duplicated possessions',()=>{
  const s=fresh(),i=piece(s),equipment=structuredClone(s.equipment);s.legal.incidents=[{locationId:s.locationId,evidence:3,description:'A named local theft witness.'}];assert.ok(imprison(s,ctx(s)));assert.deepEqual(s.equipment,equipment);assert.equal(s.justice.propertyTransfers,undefined);assert.equal(piece(s).id,i.id);roundtrip(s);const days=s.justice.prison.totalDays;s.day+=days;onJusticeTime(s,days,ctx(s));assert.equal(s.justice.prison,null);assert.deepEqual(s.equipment,equipment);assert.equal(s.justice.propertyTransfers,undefined);roundtrip(s);
});
test('removing a stolen instance clears every equipped reference and the same bonus',()=>{
  let s=fresh();const i=piece(s);s=valid(E.equipGear(s,i.id));discardGear(s,i.id);assert.equal(s.equipment.equipped.weapon,null);assert.deepEqual(gearBonuses(s),zero);assert.equal(getGearItem(s,i.id),null);roundtrip(s);
});
test('stolen identity cannot claim found quality, a second loot token, or future acquisition',()=>{
  for(const change of [s=>s.equipment.instances[0].quality='legendary',s=>s.equipment.instances[0].day=s.day+1,s=>s.adventuring.loot.push(legacy(s,piece(s).provenance.lootId)),s=>s.equipment.owned.push(piece(s).id)]){const s=fresh();change(s);assert.equal(E.validateSave(s),false);}
  const s=fresh(),i=piece(s),bonuses=structuredClone(i.bonuses);s.equipment.instances[0].bonuses={attack:99999};assert.deepEqual(getGearItem(s,i.id).bonuses,bonuses);assert.ok(validateGear(s.equipment));
});
test('lawful catalog gear keeps its original sale price and restocking rules',()=>{
  let s=fresh();s.equipment.owned.push('steel_sword');const m=s.realm.sites[s.locationId].merchant,stock=m.stock.steel_sword||0,price=gearSaleValue(getGearItem(s,'steel_sword'),m),gold=s.hero.gold,id=piece(s).id;s=act(s,'realm_sellgear_steel_sword');assert.equal(s.hero.gold,gold+price);assert.equal(s.realm.sites[s.locationId].merchant.stock.steel_sword,stock+1);assert.equal(piece(s).id,id);assert.equal(s.justice.propertyTransfers,undefined);roundtrip(s);
});
test('Inventory shows one usable piece with original ownership and explicit sell/return controls',()=>{
  const s=fresh(),i=piece(s),html=renderPlayerInventory(s,ui,{selectedId:'gear:'+i.id});assert.match(html,/Original owner:/);assert.ok(html.includes(i.provenance.ownerName));assert.ok(html.includes('data-id="'+i.id+'"'));assert.ok(html.includes('data-id="realm_sellgear_'+i.id+'"'));assert.ok(html.includes('data-id="realm_returngear_'+i.id+'"'));assert.equal(inventoryEntries(s).filter(r=>r.kind==='equipment').length,1);assert.equal(inventoryEntries(s).filter(r=>r.kind==='loot').length,0);
});

test('modern Activities exposes the existing actual-property thefts separately from purse theft',()=>{
  const s=walk(structuredClone(base)),before=structuredClone(s),html=renderActivities(s,ui,{pane:'crime'});assert.ok(html.includes('data-id="justice_steal"'));assert.ok(html.includes('data-id="justice_burglary"'));assert.match(html,/not the pickpocket d20/);assert.match(html,/Pickpocket/);assert.match(html,/data-disclosure="crime:property"/);assert.match(html,/Household estimate: \+\d+ Gold/);assert.deepEqual(s,before);
});

test('questionable but old-schema-valid legacy metadata stays loot instead of invalidating the save',()=>{
  const s=structuredClone(base);s.adventuring.loot.push(legacy(s,'future-legacy',{itemId:'iron_sword',day:s.day+1}),legacy(s,'overlong-owner',{itemId:'iron_sword',ownerName:'x'.repeat(121)}));assert.ok(E.validateSave(s));const before=structuredClone(s.adventuring.loot),next=E.migrateSave(s);assert.ok(next);assert.deepEqual(next.adventuring.loot,before);assert.equal(ownedGear(next).length,0);roundtrip(next);
});

test('production handlers take an actual stall weapon through Crime, Inventory equip and a single fence sale',async t=>{
  const s=walk(structuredClone(base)),surface=await mountApp(t, {rulebooks:'both', states:[s]});await surface.click('title-continue');await surface.click('tab','activities');await surface.click('activities-pane','crime');assert.ok(surface.root.querySelector('[data-disclosure="crime:property"]'));
  await surface.click('activity','justice_steal');for(const id of ['cooperate','pay','account'])await surface.click('choice',id);await surface.click('tab','activities');await surface.click('activities-pane','crime');await surface.click('activity','justice_steal');const i=piece(valid(surface.current()));assert.ok(i);assert.equal(surface.current().day,8034);
  await surface.click('tab','inventory');await surface.click('inventory-item','gear:'+i.id);await surface.click('equip',i.id);assert.equal(surface.current().equipment.equipped.weapon,i.id);assert.deepEqual(gearBonuses(surface.current()),i.bonuses);await surface.click('equip','unequip_weapon');const gold=surface.current().hero.gold;await surface.click('activity','realm_sellgear_'+i.id);const after=valid(surface.current());assert.equal(after.hero.gold,gold+Math.floor(i.provenance.value*.55));assert.equal(piece(after),undefined);assert.equal(inventoryEntries(after).some(r=>r.item?.id===i.id),false);roundtrip(after);
});
