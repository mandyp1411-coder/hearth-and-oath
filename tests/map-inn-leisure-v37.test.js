import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {innkeeper,innLedger} from '../dist/js/hospitality-v36.js';
import {applyDaylifeAction} from '../dist/js/daylife-v35.js';
import {mountApp} from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=()=>E.migrateSave(fixture.states.base);
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function at(s,id='home',room='gate'){s.locationId=id;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const r of settlementWalkPath(s,room)||[])s=valid(E.chooseAction(s,'atlas_room_'+r));return valid(s);}
function tavern(){const s=at(fresh(),'home','tavern');s.hero.gold=100;s.life.stress=60;s.life.happiness=40;s.hero.mp=5;s.hero.hp-=15;return s;}
async function open(t,s=fresh(),width=1440){const ui=await mountApp(t,{states:[s],width});await ui.click('title-continue');return ui;}
const stable=s=>({day:s.day,hp:s.hero.hp,mp:s.hero.mp,gold:s.hero.gold,stress:s.life.stress,joy:s.life.happiness,leisure:s.socialLife.leisure});

test('the map has only Find Me and Expand, hides scrollbars and gives political region titles their own fading class',async t=>{
 const ui=await open(t);await ui.click('tab','map');assert.deepEqual(ui.root.querySelectorAll('.journey-map-tools button').map(b=>[b.dataset.op,b.dataset.id]),[['map-zoom','home'],['map-expand',undefined]]);assert.ok(ui.root.querySelector('text.paper-region-title'));assert.ok(ui.root.querySelector('.paper-place-label'));const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');assert.match(css,/journey-world-map \.hex-map-scroll \{[^}]*overflow:hidden; scrollbar-width:none;/);assert.match(css,/hex-map-scroll::-webkit-scrollbar \{ display:none/);assert.match(css,/:is\(\.paper-region-title,\.paper-geographic-label,\.map-region-label\) \{ opacity:clamp\(0,calc\(2 - var\(--map-scale,1\) \* 1.1\),.8\)/);assert.doesNotMatch(css,/\.paper-place-label[^{}]*\{[^}]*var\(--map-scale/);
});
test('ordinary inline wheel zoom anchors the country under the pointer, saves the view and never spends simulation time',async t=>{
 const ui=await open(t);await ui.click('tab','map');const before=ui.current(),slots=ui.lives(),view=ui.root.querySelector('[data-map-viewport]'),canvas=view.querySelector('[data-map-canvas]'),board=ui.root.querySelector('.journey-world-map'),scales=[];
 Object.assign(view,{clientWidth:400,clientHeight:300,scrollWidth:6400,scrollHeight:4800,scrollLeft:400,scrollTop:300});Object.assign(canvas,{clientWidth:1600,clientHeight:1200});view.getBoundingClientRect=()=>({left:0,top:0});canvas.getBoundingClientRect=()=>({left:-view.scrollLeft,top:-view.scrollTop});board.style.setProperty=(key,value)=>{if(key==='--map-scale'){scales.push(value);canvas.clientWidth=1600*value;canvas.clientHeight=1200*value;}};
 const e=await ui.fire('wheel',view,{deltaY:-60,clientX:100,clientY:100});assert.ok(e.defaultPrevented);assert.equal(scales.at(-1),1.25);assert.equal(view.scrollLeft,525);assert.equal(view.scrollTop,400);await ui.fire('wheel',view,{deltaY:60,clientX:100,clientY:100});assert.equal(scales.at(-1),1);assert.equal(view.scrollLeft,400);assert.equal(view.scrollTop,300);for(let n=0;n<4;n++)await ui.fire('wheel',view,{deltaY:-30,clientX:100,clientY:100});assert.equal(scales.at(-1),2);await ui.click('map-expand');assert.match(ui.root.innerHTML,/--map-scale:2/);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);await ui.key('Escape');assert.match(ui.root.innerHTML,/--map-scale:2/);
});
test('the innkeeper remains a single People Here entry and opens all requested services without a dedicated counter',async t=>{
 const ui=await open(t,tavern());await ui.click('place-open');const keeper=innkeeper(ui.current());assert.equal(ui.root.querySelector('.tavern-scene,.shop-counter,.inn-counter'),null);const people=ui.root.querySelector('.local-service-list');assert.ok(people);const all=people.querySelectorAll(`[data-op="service-open"][data-id="${keeper.id}"]`);assert.equal(all.length,1);assert.ok(all[0].textContent.includes(keeper.name));await ui.click('service-open',keeper.id);assert.ok(ui.root.querySelector('[aria-label="Innkeeper Services"]'));for(const selector of ['[data-op="inn-browse"]','[data-id="inn_room"]','[data-id="inn_rumor"]'])assert.ok(!ui.root.querySelector(selector).disabled);assert.equal(ui.root.querySelector('.inn-meeting .service-offers'),null);
});
test('the innkeeper in People Here leads to illustrated food/drink barter and actual stock exchange',async t=>{
 const ui=await open(t,tavern());await ui.click('place-open');await ui.click('service-open',innkeeper(ui.current()).id);await ui.click('inn-browse');for(const id of ['supply:meals','supply:ale']){const cell=ui.root.querySelector(`[data-op="shop-item"][data-id="buy:${id}"]`);assert.ok(cell.querySelector('.supplies-art'));await ui.click('shop-item','buy:'+id);await ui.click('shop-add','buy:'+id);}const before=ui.current();await ui.click('shop-confirm');const n=valid(ui.current());assert.equal(n.hero.gold,before.hero.gold-9);assert.deepEqual(n.hospitality.bag,{meals:1,ale:1});assert.deepEqual(innLedger(n).stock,{meals:11,ale:7});assert.equal(n.day,before.day);await ui.click('shop-conversation');assert.ok(ui.root.querySelector('[data-id="inn_room"]'));assert.ok(ui.root.querySelector('[data-id="inn_rumor"]'));
});
test('room rental and a real quest rumor are reachable through the innkeeper in People Here',async t=>{
 const ui=await open(t,tavern());await ui.click('place-open');await ui.click('service-open',innkeeper(ui.current()).id);const before=ui.current();await ui.click('activity','inn_room');assert.equal(ui.current().day,before.day+1);assert.equal(ui.current().hero.gold,before.hero.gold-8);await ui.click('activity','inn_rumor');const n=valid(ui.current()),rumor=innLedger(n).rumor;assert.ok(rumor.serviceId);assert.ok(n.cartography.sites[rumor.destinationId]);await ui.click('service-open',rumor.serviceId);assert.ok(ui.root.querySelector('[data-op="activity"][data-id^="adventure_accept_"]'));assert.equal(ui.current().adventuring.contracts.find(c=>'giver-'+c.id===rumor.serviceId).status,'offered');
});
const outings=[['outdoors',0,8,5,3,0],['sketch',0,8,6,0,0],['picnic',4,10,8,3,0],['music',3,12,8,0,0],['meal',6,8,6,3,6],['boardgames',2,10,7,0,0]];
for(const [id,cost,relief,joy,focus,health]of outings)test(id+' spends one real day, charges its quoted price and grants the stated stress relief without changing bonds',()=>{
 const s=tavern(),before=structuredClone(s),a=E.getActions(s).find(a=>a.id==='leisure_'+id);assert.ok(a&&!a.disabledReason);assert.equal(a.cost,cost);const n=valid(E.chooseAction(s,a.id));assert.equal(n.day,s.day+1);assert.equal(n.hero.gold,s.hero.gold-cost);assert.equal(n.life.stress,s.life.stress-relief);assert.equal(n.life.happiness,s.life.happiness+joy);assert.equal(n.hero.mp,s.hero.mp+focus);assert.equal(n.hero.hp,s.hero.hp+health);assert.deepEqual(n.life.people.map(p=>[p.id,p.bond]),s.life.people.map(p=>[p.id,p.bond]));assert.deepEqual(E.migrateSave(n),n);assert.deepEqual(s,before);assert.deepEqual(stable(E.chooseAction(n,a.id)),stable(n));
});
test('Social & Fun groups all six new outings with current Stress, clear effects and the existing playable games',async t=>{
 const ui=await open(t,tavern(),390);await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.match(ui.root.querySelector('.activity-intro').textContent,/Stress 60\/100/);assert.ok(ui.root.querySelector('.leisure-groups'));for(const [id]of outings)assert.ok(ui.root.querySelector('[data-op="activity"][data-id="leisure_'+id+'"]'));assert.ok(ui.root.querySelector('[data-id="fun_pairs"]'));assert.equal(ui.root.querySelector('[data-op="spatial-contact"]'),null);const before=ui.current();await ui.click('activity','leisure_music');assert.equal(ui.current().life.stress,before.life.stress-12);assert.equal(ui.current().hero.gold,before.hero.gold-3);assert.ok(ui.root.querySelector('[data-activity-category="fun"]'));
});
test('free outdoor choices also work at named wilderness sites; paid tavern entertainment cannot run remotely',()=>{
 const s=at(fresh(),'gate');s.life.stress=40;for(const id of ['music','meal','boardgames'])assert.deepEqual(stable(E.chooseAction(s,'leisure_'+id)),stable(s));for(const id of ['outdoors','sketch']){const n=valid(E.chooseAction(s,'leisure_'+id));assert.equal(n.life.stress,32);assert.equal(n.hero.gold,s.hero.gold);assert.equal(n.day,s.day+1);}
});
test('unaffordable, pending and interrupted leisure grants no free relief or partial charge',()=>{
 const s=tavern();s.hero.gold=0;for(const id of ['picnic','music','meal','boardgames'])assert.deepEqual(stable(E.chooseAction(s,'leisure_'+id)),stable(s));const before=stable(s);assert.equal(applyDaylifeAction(s,'leisure_outdoors',{spendDays:()=>0}),true);assert.deepEqual(stable(s),before);const pending=tavern();pending.event={id:'waiting'};for(const id of ['outdoors','music'])assert.deepEqual(stable(E.chooseAction(pending,'leisure_'+id)),stable(pending));
});
test('recreation caps health, Focus, Joy and Stress; future or unknown leisure ledger entries remain invalid',()=>{
 const s=tavern();s.hero.hp=s.hero.maxHp-1;s.hero.mp=s.hero.maxMp-1;s.life.happiness=99;s.life.stress=2;const n=valid(E.chooseAction(s,'leisure_meal'));assert.equal(n.life.stress,0);assert.equal(n.life.happiness,100);assert.equal(n.hero.hp,n.hero.maxHp);assert.equal(n.hero.mp,n.hero.maxMp);for(const edit of [v=>v.last.music=n.day+1,v=>v.last.invented=n.day]){const bad=structuredClone(n);edit(bad.socialLife.leisure);assert.equal(E.validateSave(bad),false);}
});
