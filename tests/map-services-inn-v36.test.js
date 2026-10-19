import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {newTradeDraft,quoteTrade,tradeInventory,applyTrade,shopAccessReason} from '../dist/js/trading.js';
import {innkeeper,innLedger,INN_GOODS} from '../dist/js/hospitality-v36.js';
import {inventoryEntries} from '../dist/js/inventory-ui.js';
import {mountApp} from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=()=>E.migrateSave(fixture.states.base);
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function at(s,id='home',room='gate'){s.locationId=id;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const r of settlementWalkPath(s,room)||[])s=valid(E.chooseAction(s,'atlas_room_'+r));return valid(s);}
function tavern(){let s=at(fresh(),'home','tavern');s.hero.gold=1000;return s;}
const draft=(s,buy=[],sell=[])=>({...newTradeDraft(s,'inn'),buy:buy.map(([id,quantity=1])=>({id,quantity})),sell:sell.map(([id,quantity=1])=>({id,quantity}))});
async function open(t,s=fresh()){const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');return ui;}
const stable=s=>({day:s.day,gold:s.hero.gold,hp:s.hero.hp,mp:s.hero.mp,locationId:s.locationId,cartography:s.cartography,hospitality:s.hospitality});

test('the inline chart keeps its definite panning viewport without native scrollbars',()=>{
 const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');assert.match(css,/hex-board:not\(\.compact\):not\(\.journey-world-map\) \{ height: auto/);assert.match(css,/journey-world-map \.hex-map-scroll \{ display:block; flex:none; height:clamp\(320px,54dvh,660px\); min-height:320px; overflow:hidden; scrollbar-width:none/);assert.match(css,/width:max\(100%,calc\(1120px \* var\(--map-scale,1\)\)\)/);assert.match(css,/scrollbar-color:var\(--scroll-thumb\) var\(--scroll-track\)/);
});
test('single click immediately reviews a route and double-click cannot bypass confirmation',async t=>{
 const ui=await open(t);await ui.click('tab','map');const before=ui.current(),id=Object.keys(before.cartography.sites).filter(id=>id!==before.locationId&&!E.exploreTravelPreview(before,id).disabledReason).sort((a,b)=>E.exploreTravelPreview(before,a).days-E.exploreTravelPreview(before,b).days)[0],pin=ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`);
 await ui.fire('click',pin,{detail:1});assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.deepEqual(ui.current(),before);const selected=ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`);await ui.fire('click',selected,{detail:2});await ui.fire('dblclick',ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`),{detail:2});ui.flushSpatialClicks();assert.deepEqual(ui.current(),before);await ui.click('travel',id);assert.deepEqual(ui.current(),E.startExploreJourney(before,id));valid(ui.current());
});
test('single pointer click and keyboard selection remain free inspections',async t=>{
 const ui=await open(t);await ui.click('tab','map');const before=ui.current(),id=Object.keys(before.cartography.sites).find(id=>id!==before.locationId),pin=ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`);await ui.fire('click',pin,{detail:1});ui.flushSpatialClicks();assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.deepEqual(ui.current(),before);await ui.key('Enter',{target:ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`)});assert.deepEqual(ui.current(),before);
});
test('popup destination selection waits for review and explicit journey confirmation',async t=>{
 const ui=await open(t);await ui.click('tab','map');await ui.click('map-expand');const before=ui.current(),id=Object.keys(before.cartography.sites).find(id=>id!==before.locationId&&!E.exploreTravelPreview(before,id).disabledReason);await ui.fire('click',ui.root.querySelector(`.map-popout [data-op="destination-select"][data-id="${id}"]`),{detail:1});await ui.fire('dblclick',ui.root.querySelector(`.map-popout [data-op="destination-select"][data-id="${id}"]`),{detail:2});assert.ok(ui.root.querySelector('.map-popout'));assert.deepEqual(ui.current(),before);await ui.key('Escape');assert.equal(ui.root.querySelector('[data-op="travel"]').textContent,'Confirm Journey');await ui.click('travel',id);assert.deepEqual(ui.current(),E.startExploreJourney(before,id));
});
for(const [pane,kind] of [['recovery','doctor'],['work','work']])test(pane+' shortcut walks to and opens the actual local '+kind,async t=>{
 const ui=await open(t),before=ui.current(),r=settlementServices(before).find(r=>r.kind===kind);await ui.click('tab','activities');await ui.click('activities-pane',pane);await ui.click('activity-visit',r.id);const next=valid(ui.current());assert.equal(next.locationId,before.locationId);assert.equal(next.cartography.interior.roomId,r.roomId);assert.equal(next.day,before.day);assert.equal(next.hero.gold,before.hero.gold);assert.ok(ui.root.querySelector(`[data-service-person="${r.personId}"]`));assert.ok(next.conversations.meetings[r.personId]);
});
test('an uninhabited gate offers a real reachable doctor route without teleporting or revealing unrelated places',async t=>{
 const s=at(fresh(),'gate'),ui=await open(t,s);assert.equal(settlementServices(s).some(r=>r.kind==='doctor'),false);await ui.click('tab','activities');await ui.click('activities-pane','recovery');const before=ui.current(),go=ui.root.querySelector('[data-op="activity-route"]');assert.ok(go);assert.ok(settlementServices(before,{siteId:go.dataset.id}).some(r=>r.kind==='doctor'));await ui.click('activity-route',go.dataset.id);assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,go.dataset.id);
});
test('inn stock inspection and offers are pure and use the keeper rather than the market merchant',()=>{
 const s=tavern(),before=structuredClone(s),v=tradeInventory(s,'inn'),q=quoteTrade(s,draft(s,[['supply:meals',2],['supply:ale']]));assert.equal(v.merchant.id,innkeeper(s).personId);assert.notEqual(v.merchant.id,s.realm.sites[s.locationId].merchant.id);assert.deepEqual(v.buy.map(r=>r.id),['supply:meals','supply:ale']);assert.equal(q.goldDue,15);assert.equal(q.disabledReason,null);assert.deepEqual(s,before);assert.ok(v.buy.every(r=>r.description));
});
test('one inn trade changes only actual gold, carried food/drink and this inn’s stock',()=>{
 const s=tavern(),q=quoteTrade(s,draft(s,[['supply:meals',2],['supply:ale']])),n=valid(E.completeTrade(s,q));assert.equal(n.hero.gold,s.hero.gold-15);assert.deepEqual(n.hospitality.bag,{meals:2,ale:1});assert.deepEqual(innLedger(n).stock,{meals:10,ale:7});assert.deepEqual(n.realm.sites,s.realm.sites);assert.equal(n.day,s.day);assert.deepEqual(E.migrateSave(n),n);assert.deepEqual(stable(E.completeTrade(n,q)),stable(n));assert.ok(inventoryEntries(n).some(r=>r.id==='supply:meals'&&r.quantity===2));
});
test('inn barter accepts honest unequipped gear and refuses equipped or stolen goods',()=>{
 const s=tavern();s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;s.hero.gold=0;const q=quoteTrade(s,draft(s,[['supply:meals']],[['gear:scholar_hood']]));assert.equal(q.disabledReason,null);const n=valid(E.completeTrade(s,q));assert.equal(n.hero.gold,q.goldAfter);assert.equal(n.hospitality.bag.meals,1);assert.ok(!n.equipment.owned.includes('scholar_hood'));s.adventuring.loot.push({id:'inn-stolen',name:'Stolen Cup',value:25,stolen:true});assert.ok(quoteTrade(s,draft(s,[],[['loot:inn-stolen']])).disabledReason);
});
for(const [name,edit]of [['leaving the tavern',s=>s.cartography.interior.roomId='gate'],['a pending encounter',s=>s.event={id:'waiting'}],['another inn',s=>s.locationId='coast'],['sold-out provisions',s=>{s.hospitality={version:1,bag:{meals:0,ale:0},used:{},sites:{[s.locationId]:{...innLedger(s),stock:{meals:0,ale:8}}}}}],['a later season',s=>s.day+=90]])test('stale inn quote is atomic after '+name,()=>{
 const s=tavern(),q=quoteTrade(s,draft(s,[['supply:meals']]));edit(s);const before=structuredClone(s);assert.equal(applyTrade(s,q),false);assert.deepEqual(s,before);
});
test('meals and ale have real Inventory uses, one serving per day, and cannot be used in battle',()=>{
 const s=tavern();s.hero.hp-=15;s.hero.mp=10;s.life.stress=30;let n=valid(E.completeTrade(s,quoteTrade(s,draft(s,[['supply:meals',2],['supply:ale',2]]))));const before=structuredClone(n);n=valid(E.useConsumable(n,'meals'));assert.equal(n.hero.hp,before.hero.hp+8);assert.equal(n.hero.mp,before.hero.mp+5);assert.equal(n.hospitality.bag.meals,1);assert.equal(n.day,before.day);assert.deepEqual(stable(E.useConsumable(n,'meals')),stable(n));n=valid(E.useConsumable(n,'ale'));assert.equal(n.hospitality.bag.ale,1);assert.equal(n.life.stress,26);assert.equal(n.hero.mp,before.hero.mp+3);const blocked=structuredClone(n);blocked.event={id:'waiting'};const no=E.useConsumable(blocked,'meals');assert.deepEqual(no.hospitality,blocked.hospitality);assert.deepEqual(E.migrateSave(n),n);
});
test('room rental spends one actual night and fee, restores Focus and does not erase illness',()=>{
 const s=tavern();s.hero.hp-=30;s.hero.mp=1;s.life.stress=30;const n=valid(E.chooseAction(s,'inn_room'));assert.equal(n.day,s.day+1);assert.equal(n.hero.gold,s.hero.gold-8);assert.equal(n.hero.hp,s.hero.hp+20);assert.equal(n.hero.mp,n.hero.maxMp);assert.equal(n.life.stress,22);assert.deepEqual(n.health.physical,s.health.physical);assert.deepEqual(E.migrateSave(n),n);
});
test('room, news and trading cannot be invoked remotely or without the actual funds',()=>{
 const s=tavern();s.cartography.interior.roomId='gate';for(const id of ['inn_room','inn_rumor'])assert.deepEqual(stable(E.chooseAction(s,id)),stable(s));s.cartography.interior.roomId='tavern';s.hero.gold=7;assert.deepEqual(stable(E.chooseAction(s,'inn_room')),stable(s));s.age=17;assert.ok(quoteTrade(s,draft(s,[['supply:ale']])).disabledReason);assert.equal(shopAccessReason(s,'inn'),null);
});
test('inn rumors reveal a genuine offered contract location without accepting it or paying rewards',()=>{
 const s=tavern(),contracts=structuredClone(s.adventuring.contracts),n=valid(E.chooseAction(s,'inn_rumor')),r=innLedger(n).rumor,c=contracts.find(c=>'giver-'+c.id===r.serviceId);assert.ok(c);assert.equal(r.destinationId,c.destinationId);assert.ok(n.cartography.sites[r.destinationId]);assert.deepEqual(n.adventuring.contracts,contracts);assert.equal(n.hero.gold,s.hero.gold);assert.equal(n.day,s.day);assert.deepEqual(n.hospitality,E.chooseAction(n,'inn_rumor').hospitality);assert.deepEqual(E.migrateSave(n),n);
});
test('production inn conversation opens the shared barter inventory and carries bought goods into Inventory',async t=>{
 const ui=await open(t,tavern());await ui.click('place-open');await ui.click('service-open',innkeeper(ui.current()).id);assert.ok(ui.root.querySelector('.inn-meeting'));await ui.click('inn-browse');assert.ok(ui.root.querySelector('.trade-workspace'));assert.ok(ui.root.querySelector('[data-op="shop-item"][data-id="buy:supply:ale"]'));await ui.click('shop-item','buy:supply:meals');await ui.click('shop-add','buy:supply:meals');const before=ui.current();await ui.click('shop-confirm');assert.equal(ui.current().hero.gold,before.hero.gold-6);assert.equal(ui.current().hospitality.bag.meals,1);await ui.click('shop-conversation');assert.ok(ui.root.querySelector('.inn-meeting'));assert.equal(ui.root.querySelector('.trade-workspace'),null);await ui.click('tab','inventory');assert.ok(ui.root.querySelector('[data-id="supply:meals"]'));await ui.click('inventory-item','supply:meals');assert.ok(ui.root.querySelector('[data-op="use-consumable"][data-id="meals"]'));
});
test('a spoken rumor links to its actual tavern client and is retained in Journal Notes',async t=>{
 const ui=await open(t,tavern());await ui.click('place-open');await ui.click('service-open',innkeeper(ui.current()).id);await ui.click('activity','inn_rumor');const before=ui.current(),r=innLedger(before).rumor;assert.ok(ui.root.querySelector('.inn-rumor'));await ui.click('service-open',r.serviceId);assert.ok(ui.root.querySelector('[data-op="activity"][data-id^="adventure_accept_"]'));assert.deepEqual(ui.current().adventuring.contracts,before.adventuring.contracts);await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');const search=ui.root.querySelector('#journal-search');search.querySelector('[name="query"]').value='Word at the Inn';await ui.fire('submit',search);assert.match(ui.root.querySelector('.journal-notes').textContent,/Word at the Inn/);assert.ok(ui.root.querySelector('.journal-notes').textContent.includes(r.text));
});
test('optional hospitality data preserves old saves and rejects corrupt stock, bags, dates and fake destinations',()=>{
 const old=fresh();assert.equal(old.hospitality,undefined);assert.ok(E.migrateSave(old));const s=E.completeTrade(tavern(),quoteTrade(tavern(),draft(tavern(),[['supply:meals']])));valid(s);
 for(const edit of [h=>h.bag.meals=-1,h=>h.bag.ale=.5,h=>h.used.meals=s.day+1,h=>h.sites.home.stock.meals=13,h=>h.sites.home.rumor={text:'fake',destinationId:'missing',serviceId:null}]){const bad=structuredClone(s);edit(bad.hospitality);assert.equal(E.validateSave(bad),false);}
});

test('the retired fate prompt is unavailable everywhere and a saved open prompt dismisses without a choice',async t=>{
 const s=fresh(),before=stable(s);assert.ok(!E.getActions(s).some(a=>a.id==='quest_decline'));assert.deepEqual(stable(E.chooseAction(s,'quest_decline')),before);
 s.event={id:'quest_decline',title:'A life is larger than an omen',category:'Fate and agency',body:'The investigation can wait.',choices:[{id:'civilian',label:'Return to ordinary life',description:'Pause'},{id:'follow',label:'Follow the lead',description:'Continue'}]};valid(s);const oldCampaign=structuredClone(s.campaign),m=valid(E.migrateSave(s));assert.equal(m.event,null);assert.deepEqual(m.campaign,oldCampaign);assert.equal(m.day,s.day);assert.equal(m.hero.gold,s.hero.gold);const ui=await open(t,s);for(const tab of ['life','activities','map','journal']){await ui.click('tab',tab);assert.equal(ui.root.querySelector('[data-id="quest_decline"]'),null);assert.doesNotMatch(ui.root.innerHTML,/Decide how much of this fate to carry|pause the investigation and live a civilian life/);}
});
