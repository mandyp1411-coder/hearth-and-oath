import {settlementServices} from '../dist/js/world-services.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {tradeInventory,newTradeDraft,quoteTrade,applyTrade,shopAccessReason} from '../dist/js/trading.js';
import {carriedArtwork} from '../dist/js/item-art.js';
import {inventoryEntries} from '../dist/js/inventory-ui.js';
import {isSettlement} from '../dist/js/world.js';
import {syncCartography} from '../dist/js/cartography.js';
import {mountApp} from './helpers/ui-surface.mjs';

function settle(s){for(let i=0;s.event&&i<100;i++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','later','keep','pause','leave','continue'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);assert.ok(!s.event);return s;}
const base=settle(await createLifeAtAge({seed:'market-and-map-followup',startAge:22,difficulty:'gentle'}));
function fresh(){const s=structuredClone(base);s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)&&s.realm.sites[p.id]?.merchant).id;s.cartography.offsite=false;s.cartography.pending=null;syncCartography(s);const m=s.realm.sites[s.locationId].merchant;s.hero.gold=4000;m.stock.iron_sword=2;m.prices.iron_sword=37;m.potions=5;m.rations=6;assert.ok(!s.equipment.owned.includes('iron_sword'));s.cartography.interior={siteId:s.locationId,roomId:'market'};assert.ok(E.validateSave(s));return s;}
function draft(s,buy=[],sell=[]){return {...newTradeDraft(s),buy:buy.map(([id,quantity=1])=>({id,quantity})),sell:sell.map(([id,quantity=1])=>({id,quantity}))};}
function unchangedTrade(s,q){const before=structuredClone(s),next=E.completeTrade(s,q);assert.ok(E.validateSave(next));delete next.notice;delete before.notice;assert.deepEqual(next,before);}
async function approach(ui){const r=settlementServices(ui.current()).find(r=>r.kind==='merchant'&&r.subjectId==='market');assert.ok(r);await ui.click('service-open',r.id);}
async function resume(t,s=fresh()){const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');return ui;}

test('stock and offer inspection are pure and use the same seasonal equipment price as the action engine',()=>{
 const s=fresh(),before=structuredClone(s),v=tradeInventory(s),q=quoteTrade(s,draft(s,[['gear:iron_sword'],['supply:potions',2]]));assert.equal(v.buy.find(i=>i.id==='gear:iron_sword').price,E.getActions(s).find(a=>a.id==='gear_buy_iron_sword').cost);assert.equal(q.buyTotal,57);assert.equal(q.goldAfter,3943);assert.equal(q.disabledReason,null);assert.deepEqual(s,before);
});
test('one confirmed purchase exchanges actual gold, gear, supplies and stock once, without days or loadout changes',()=>{
 const s=fresh(),q=quoteTrade(s,draft(s,[['gear:iron_sword'],['supply:potions',2],['supply:rations',3]])),next=E.completeTrade(s,q),m=next.realm.sites[next.locationId].merchant;assert.equal(next.hero.gold,s.hero.gold-81);assert.equal(m.stock.iron_sword,1);assert.equal(m.potions,3);assert.equal(m.rations,3);assert.equal(next.hero.potions,s.hero.potions+2);assert.equal(next.adventuring.rations,s.adventuring.rations+3);assert.equal(next.equipment.owned.filter(i=>i==='iron_sword').length,1);assert.deepEqual(next.equipment.equipped,s.equipment.equipped);assert.equal(next.day,s.day);assert.equal(next.hero.hp,s.hero.hp);assert.ok(E.validateSave(next));assert.ok(E.migrateSave(JSON.parse(JSON.stringify(next))));unchangedTrade(next,q);
});
test('barter can pay for goods with unequipped gear when the player has zero gold',()=>{
 const s=fresh(),m=s.realm.sites[s.locationId].merchant;s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;m.prices.scholar_hood=100;s.hero.gold=0;const q=quoteTrade(s,draft(s,[['gear:iron_sword'],['supply:rations']],[['gear:scholar_hood']]));assert.equal(q.sellTotal,45);assert.equal(q.goldDue,0);assert.equal(q.disabledReason,null);const next=E.completeTrade(s,q);assert.equal(next.hero.gold,0);assert.ok(next.equipment.owned.includes('iron_sword'));assert.ok(!next.equipment.owned.includes('scholar_hood'));assert.equal(next.adventuring.rations,s.adventuring.rations+1);assert.equal(next.realm.sites[s.locationId].merchant.stock.scholar_hood,(m.stock.scholar_hood||0)+1);assert.ok(E.validateSave(next));
});
test('sale-only offers pay exact quoted credit and do not consume days',()=>{
 const s=fresh();s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;const q=quoteTrade(s,draft(s,[],[['gear:scholar_hood']])),next=E.completeTrade(s,q);assert.ok(q.goldDue<0);assert.equal(next.hero.gold,s.hero.gold+q.sellTotal);assert.equal(next.day,s.day);assert.ok(E.validateSave(next));
});
for(const [label,edit] of [
 ['a negative quantity',d=>d.buy[0].quantity=-1],['a fractional quantity',d=>d.buy[0].quantity=.5],['an excessive quantity',d=>d.buy[0].quantity=100],['duplicate rows',d=>d.buy.push({...d.buy[0]})],['an invented item',d=>d.buy[0].id='gear:free-mythic-blade'],['a different merchant',d=>d.merchantId='elsewhere'],['an earlier season',d=>d.season--]
])test('rejects '+label+' before exchanging anything',()=>{const s=fresh(),d=draft(s,[['gear:iron_sword']]);edit(d);const q=quoteTrade(s,d);assert.ok(q.disabledReason);unchangedTrade(s,q);});
for(const [label,edit] of [
 ['changed gold balance',s=>s.hero.gold--],['changed price',s=>s.realm.sites[s.locationId].merchant.prices.iron_sword++],['sold-out stock',s=>s.realm.sites[s.locationId].merchant.stock.iron_sword=0],['a later day',s=>s.day++],['leaving the counter',s=>s.cartography.interior.roomId='gate']
])test('a stale offer cannot commit after '+label,()=>{const s=fresh(),q=quoteTrade(s,draft(s,[['gear:iron_sword']]));edit(s);const before=structuredClone(s);assert.equal(applyTrade(s,q),false);assert.deepEqual(s,before);});
test('edited quoted totals, prices or receipt gold are rejected atomically',()=>{
 for(const edit of [q=>q.goldDue=0,q=>q.goldAfter+=20,q=>q.buy[0].price=0,q=>q.buyTotal=0]){const s=fresh(),q=quoteTrade(s,draft(s,[['gear:iron_sword']]));edit(q);unchangedTrade(s,q);}
});
test('an equipped piece cannot be offered, including an offer equipped after quoting',()=>{
 let s=fresh();if(!s.equipment.owned.includes('starter_sword'))s.equipment.owned.push('starter_sword');s=E.equipGear(s,'starter_sword');const id=Object.values(s.equipment.equipped).find(Boolean);assert.ok(id);assert.ok(quoteTrade(s,draft(s,[],[['gear:'+id]])).disabledReason);s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;const q=quoteTrade(s,draft(s,[],[['gear:scholar_hood']]));s.equipment.equipped.head='scholar_hood';unchangedTrade(s,q);
});
test('an unaffordable offer cannot partially sell goods or buy supplies',()=>{
 const s=fresh();s.hero.gold=0;const q=quoteTrade(s,draft(s,[['gear:iron_sword'],['supply:potions']]));assert.match(q.disabledReason,/more Gold/);unchangedTrade(s,q);
});
test('a different location, childhood and a waiting event cannot trade through a stale interface',()=>{
 const s=fresh(),q=quoteTrade(s,draft(s,[['supply:rations']]));for(const edit of [x=>x.age=10,x=>x.cartography.offsite=true,x=>x.event={id:'pending'},x=>x.phase='retired']){const x=structuredClone(s);edit(x);assert.ok(shopAccessReason(x));const before=structuredClone(x);assert.equal(applyTrade(x,q),false);assert.deepEqual(x,before);}
});
test('the market uses People Here and dialogue; abandoning an offer after meeting spends nothing',async t=>{
 const ui=await resume(t),arrival=ui.current();assert.equal(ui.root.querySelector('.shop-counter'),null);assert.ok(ui.root.querySelector('.local-service-list'));assert.equal(ui.root.querySelector('.trade-workspace'),null);await approach(ui);assert.ok(ui.root.querySelector('.merchant-meeting .dialogue-window'));assert.equal(ui.document.activeElement.id,'shop-speaker');const before=ui.current(),slots=ui.lives();assert.equal(before.day,arrival.day);assert.equal(before.hero.gold,arrival.hero.gold);await ui.click('shop-terms');await ui.click('shop-browse');assert.ok(ui.root.querySelector('[aria-label="Shopkeeper Stock"]'));assert.ok(ui.root.querySelector('[aria-label="Your Carried Items"]'));await ui.click('shop-item','buy:gear:iron_sword');assert.equal(ui.document.activeElement.id,'trade-item-heading');await ui.click('shop-add','buy:gear:iron_sword');await ui.click('shop-conversation');await ui.click('shop-leave');assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);assert.ok(ui.root.querySelector('.local-service-list'));
});
test('the production counter commits the displayed offer once and the bought goods appear in Inventory',async t=>{
 const ui=await resume(t);await approach(ui);await ui.click('shop-browse');await ui.click('shop-item','buy:gear:iron_sword');await ui.click('shop-add','buy:gear:iron_sword');const before=ui.current(),q=quoteTrade(before,draft(before,[['gear:iron_sword']]));await ui.click('shop-confirm');assert.deepEqual(ui.current(),E.completeTrade(before,q));assert.ok(ui.root.querySelector('[data-op="shop-confirm"]').disabled);assert.equal(ui.document.activeElement.id,'trade-heading');await ui.click('tab','inventory');assert.ok(ui.root.querySelector('[data-op="inventory-item"][data-id="gear:iron_sword"]'));assert.equal(ui.root.querySelector('.trade-workspace'),null);
});
test('searching both trade inventories is read-only and does not clear a staged offer',async t=>{
 const ui=await resume(t);await approach(ui);await ui.click('shop-browse');await ui.click('shop-item','buy:supply:potions');await ui.click('shop-add','buy:supply:potions');const before=ui.current(),slots=ui.lives(),form=ui.root.querySelector('#shop-search');form.querySelector('#shop-query').value='No Such Item';await ui.fire('submit',form);assert.equal(ui.root.querySelectorAll('.trade-cell').length,0);assert.ok(ui.root.querySelector('.trade-offer-row'));assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);assert.equal(ui.document.activeElement.id,'shop-query');
});
test('new supply and material illustrations cover all carried categories without generic symbol cells',async t=>{
 const s=fresh();s.flags.herbs=3;for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=2;const ui=await resume(t,s);await ui.click('tab','inventory');const entries=inventoryEntries(ui.current());for(const row of entries.filter(r=>!r.item))assert.ok(Number.isInteger(carriedArtwork(row)));assert.equal(ui.root.querySelectorAll('.inventory-cell .supplies-art').length,entries.filter(r=>!r.item).length);assert.equal(ui.root.querySelector('.supply-art'),null);assert.deepEqual(['potions','rations','herbs','ore','cloth','wood','stone','hide','crystal'].map(id=>carriedArtwork({id:'supply:'+id})),[0,1,2,3,4,5,6,7,8]);
});

test('the production trade table barters a carried piece for goods with no coins and keeps the loadout',async t=>{
 const s=fresh();s.hero.gold=0;s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;s.realm.sites[s.locationId].merchant.prices.scholar_hood=100;const ui=await resume(t,s);await approach(ui);await ui.click('shop-browse');const before=ui.current();await ui.click('shop-item','buy:gear:iron_sword');await ui.click('shop-add','buy:gear:iron_sword');assert.ok(ui.root.querySelector('[data-op="shop-confirm"]').disabled);await ui.click('shop-item','sell:gear:scholar_hood');await ui.click('shop-add','sell:gear:scholar_hood');assert.equal(ui.root.querySelector('[data-op="shop-confirm"]').disabled,false);await ui.click('shop-confirm');assert.equal(ui.current().hero.gold,8);assert.deepEqual(ui.current().equipment.equipped,before.equipment.equipped);assert.ok(ui.current().equipment.owned.includes('iron_sword'));assert.ok(!ui.current().equipment.owned.includes('scholar_hood'));assert.equal(ui.current().day,before.day);assert.ok(E.validateSave(ui.current()));
});
test('ordinary treasure is quoted as loot while stolen property is refused by the shop',()=>{
 const s=fresh();s.adventuring.loot=[{id:'trade-cup',name:'Tarnished Cup',value:50,stolen:false},{id:'trade-stolen',name:'Stolen Silver',value:50,stolen:true}];const before=structuredClone(s),v=tradeInventory(s);assert.equal(v.sell.find(r=>r.id==='loot:trade-cup').price,40);assert.match(v.sell.find(r=>r.id==='loot:trade-stolen').disabledReason,/Stolen/);assert.ok(quoteTrade(s,draft(s,[],[['loot:trade-stolen']])).disabledReason);const q=quoteTrade(s,draft(s,[],[['loot:trade-cup']]));assert.equal(q.sellTotal,40);assert.deepEqual(s,before);assert.equal(applyTrade(s,q),true);assert.deepEqual(s.adventuring.loot,[before.adventuring.loot[1]]);assert.equal(s.hero.gold,before.hero.gold+40);
});
