import {createLifeAtAge} from '../dist/js/new-life.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {tradeInventory,newTradeDraft,quoteTrade,applyTrade} from '../dist/js/trading.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
function fresh(){let s=E.migrateSave(fixture.states.base);s.locationId='home';s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const r of settlementWalkPath(s,'market'))s=E.chooseAction(s,'atlas_room_'+r);s.hero.gold=1000;s.realm.sites.home.merchant.potions=5;s.realm.sites.home.merchant.rations=6;assert.ok(E.validateSave(s));return s;}
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
const people=(s,vendor)=>settlementServices(s).find(r=>r.kind==='merchant'&&r.subjectId===vendor);
const draft=(s,vendor,id)=>({...newTradeDraft(s,vendor),buy:[{id,quantity:1}]});
async function open(t,s=fresh()){const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');await ui.click('place-open');return ui;}

test('the market presents three distinct local merchants only in People Here, without a dedicated counter',async t=>{
 const ui=await open(t),s=ui.current(),merchants=settlementServices(s).filter(r=>r.kind==='merchant');assert.equal(merchants.length,3);assert.equal(new Set(merchants.map(r=>r.personId)).size,3);assert.equal(new Set(merchants.map(r=>r.name)).size,3);assert.deepEqual(merchants.map(r=>r.role),['General Merchant','Apothecary','Travel Outfitter']);assert.equal(ui.root.querySelector('.shop-counter,.shop-approach,.shop-portrait'),null);for(const r of merchants){assert.equal(r.roomId,'market');assert.ok(r.here);const n=ui.root.querySelector(`.local-service-list [data-op="service-open"][data-id="${r.id}"]`);assert.ok(n);assert.ok(n.textContent.includes(r.name));assert.ok(n.querySelector('.fantasy-avatar'));}
});
for(const [vendor,ids,price]of [['market',['supply:potions','supply:rations'],10],['apothecary',['supply:potions'],9],['outfitter',['supply:rations','camp:tent'],7]])test(vendor+' opens its own person and stock selection and completes a correctly priced trade',async t=>{
 const ui=await open(t),s=ui.current(),r=people(s,vendor);await ui.click('service-open',r.id);assert.ok(ui.root.querySelector(`[data-service-person="${r.personId}"]`));assert.equal(ui.current().day,s.day);assert.equal(ui.current().hero.gold,s.hero.gold);assert.ok(ui.current().conversations.meetings[r.personId]);await ui.click('shop-browse');for(const id of ids)assert.ok(ui.root.querySelector(`[data-op="shop-item"][data-id="buy:${id}"]`));if(vendor==='apothecary')assert.deepEqual(ui.root.querySelectorAll('[data-op="shop-item"]').filter(n=>n.dataset.id.startsWith('buy:')).map(n=>n.dataset.id),['buy:supply:potions']);if(vendor==='outfitter')assert.equal(ui.root.querySelector('[data-id="buy:supply:potions"]'),null);const id=ids[0],before=ui.current();await ui.click('shop-item','buy:'+id);await ui.click('shop-add','buy:'+id);await ui.click('shop-confirm');const n=valid(ui.current());assert.equal(n.hero.gold,before.hero.gold-price);assert.equal(n.day,before.day);assert.ok(n.notice.startsWith(r.name+':'));assert.deepEqual(E.migrateSave(n),n);assert.equal(n.realm.sites.home.merchant.id,s.realm.sites.home.merchant.id);assert.equal(n.realm.sites.home.merchant.name,s.realm.sites.home.merchant.name);
});
test('specialist offers are pure and bind to their actual person rather than another shopkeeper',()=>{
 const s=fresh(),before=structuredClone(s),d=draft(s,'apothecary','supply:potions'),q=quoteTrade(s,d);assert.equal(q.merchantId,people(s,'apothecary').personId);assert.equal(q.buyTotal,9);assert.equal(q.disabledReason,null);assert.deepEqual(s,before);for(const edit of [q=>q.vendor='market',q=>q.vendor='outfitter',q=>q.merchantId=people(s,'outfitter').personId,q=>q.buy[0].price=0]){const edited=structuredClone(q);edit(edited);const copy=structuredClone(s);assert.equal(applyTrade(copy,edited),false);assert.deepEqual(copy,s);}
});
test('specialist purchases consume the real market supply, which cannot be recreated by changing vendors',()=>{
 const s=fresh(),n=valid(E.completeTrade(s,quoteTrade(s,draft(s,'apothecary','supply:potions'))));assert.equal(n.hero.potions,s.hero.potions+1);assert.equal(n.realm.sites.home.merchant.potions,4);assert.equal(tradeInventory(n,'market').buy.find(r=>r.id==='supply:potions').quantity,4);assert.equal(tradeInventory(n,'apothecary').buy.find(r=>r.id==='supply:potions').quantity,4);const r=valid(E.completeTrade(n,quoteTrade(n,draft(n,'outfitter','supply:rations'))));assert.equal(r.adventuring.rations,n.adventuring.rations+1);assert.equal(r.realm.sites.home.merchant.rations,5);assert.equal(tradeInventory(r,'market').buy.find(r=>r.id==='supply:rations').quantity,5);assert.ok(!Object.hasOwn(r,'marketStalls'));
});
test('changing sites, leaving the market or closing services invalidates specialist offers atomically',()=>{
 for(const edit of [s=>s.cartography.interior.roomId='tavern',s=>s.locationId='coast',s=>s.world.locations.find(p=>p.id==='home').servicesAvailable=false]){const s=fresh(),q=quoteTrade(s,draft(s,'apothecary','supply:potions'));edit(s);const before=structuredClone(s);assert.equal(applyTrade(s,q),false);assert.deepEqual(s,before);}
});
test('reading or leaving merchant dialogue is free, and closing a staged trade returns to People Here',async t=>{
 const ui=await open(t);await ui.click('service-open',people(ui.current(),'outfitter').id);const before=ui.current(),slots=ui.lives();await ui.click('shop-terms');await ui.click('shop-browse');await ui.click('shop-item','buy:camp:tent');await ui.click('shop-add','buy:camp:tent');await ui.click('shop-conversation');await ui.click('shop-leave');assert.equal(ui.root.querySelector('.trade-workspace'),null);assert.ok(ui.root.querySelector('.local-service-list'));assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
});
test('a young character can meet and leave the merchant while independent trading remains age gated',async t=>{
 let s=await createLifeAtAge({seed:'young-market-v37',startAge:12,difficulty:'gentle',originId:'human_bellward',appearance:{ancestry:'human'}});for(let n=0;s.event&&n<100;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','continue','keep','pause','leave','later'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);s.locationId=s.world.locations.find(p=>settlementServices(s,{siteId:p.id}).some(r=>r.kind==='merchant')).id;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const room of settlementWalkPath(s,'market'))s=E.chooseAction(s,'atlas_room_'+room);valid(s);const ui=await open(t,s);await ui.click('service-open',people(ui.current(),'market').id);assert.ok(ui.root.querySelector('[data-op="shop-browse"]').disabled);const before=ui.current();await ui.click('shop-leave');assert.ok(ui.root.querySelector('.local-service-list'));assert.equal(ui.root.querySelector('.merchant-meeting'),null);assert.deepEqual(ui.current(),before);
});
test('merchants remain reconstructed without changing any old save until the player meets one',()=>{
 const s=fresh(),before=structuredClone(s);for(const vendor of ['market','apothecary','outfitter']){const r=people(s,vendor);assert.ok(r);tradeInventory(s,vendor);quoteTrade(s,draft(s,vendor,vendor==='outfitter'?'supply:rations':'supply:potions'));}assert.deepEqual(s,before);assert.deepEqual(E.migrateSave(s),s);
});
