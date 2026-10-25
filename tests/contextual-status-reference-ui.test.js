import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { healthView } from '../dist/js/health.js';
import { settlementServices } from '../dist/js/world-services.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Prepared for the serialized engine lane. Handler/semantic coverage only:
// native disclosure keyboard behavior, reading-scale geometry and screen-reader
// behavior still require browser QA. No synthetic lifetime generation.
const recorded=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const earlier=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url))));
function fresh(raw=recorded.states.base){const s=E.migrateSave(structuredClone(raw));assert.ok(s&&E.validateSave(s));return s;}
async function open(t,s=fresh()){const ui=await mountApp(t, {states:[s],width:390,height:844});await ui.click('title-continue');return ui;}
async function recovery(ui){await ui.click('tab','activities');await ui.click('activities-pane','recovery');return ui.root.querySelector('[data-status-reference="recovery"]');}
async function inspect(ui,node){assert.ok(node);const before=ui.current(),slots=ui.lives(),status=ui.viewStatus.textContent,summary=node.querySelector('summary');assert.ok(summary);assert.equal(node.open===true,false);await ui.fire('click',summary,{pointerType:'touch'});for(const key of ['Enter',' ']){const event=await ui.key(key,{target:summary});assert.equal(event.defaultPrevented,false,'native summary activation is not intercepted');}assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);assert.equal(ui.viewStatus.textContent,status,'reading produces no outcome announcement');}

test('actual Recovery route exposes the shared measures without adding header controls or changing this life',async t=>{
 const s=fresh();s.hero.hp=s.hero.maxHp;s.life.health=12;const ui=await open(t,s),header=ui.root.querySelector('.status-bars').textContent,detail=await recovery(ui);await inspect(ui,detail);assert.match(detail.textContent,/Health, Focus & care explained/);assert.match(detail.textContent,/Bodily wellbeing 12\/100/);assert.match(detail.textContent,/Below 35/);assert.equal(ui.root.querySelector('.status-bars').textContent,header);
 // The semantic surface does not emulate native toggling. Setting this DOM
 // property models an open disclosure for the shell's existing view retention.
 detail.open=true;await ui.click('activities-pane','fun');await ui.click('activities-pane','recovery');assert.equal(ui.root.querySelector('[data-status-reference="recovery"]').open,true);assert.deepEqual(ui.current(),s);
});
test('Social & Fun links to Recovery by existing read-only navigation, not treatment',async t=>{
 const ui=await open(t);await ui.click('tab','activities');await ui.click('activities-pane','fun');const detail=ui.root.querySelector('[data-status-reference="fun"]');await inspect(ui,detail);assert.match(detail.textContent,/Joy.*Stress/);assert.equal(detail.querySelector('[data-op="activity"]'),null);const before=ui.current();await ui.fire('click',detail.querySelector('[data-op="notice-recovery"]'));assert.ok(ui.root.querySelector('[data-status-reference="recovery"]'));assert.deepEqual(ui.current(),before);assert.equal(ui.document.activeElement.isConnected,true);
});
test('doctor reference uses exact current condition care and preserves the visit and pending state',async t=>{
 const s=fresh();s.health.mental.push({id:'reference-depression',type:'depression',severity:2,sinceDay:s.day-7,lastEffectDay:s.day-7,careUntil:s.day+2,acknowledged:true});assert.ok(E.validateSave(s));const ui=await open(t,s);await recovery(ui);const provider=settlementServices(ui.current()).find(r=>r.kind==='doctor');assert.ok(provider);await ui.click('activity-visit',provider.id);const before=ui.current(),detail=ui.root.querySelector('[data-status-reference="doctor"]'),condition=healthView(before).mental[0];await inspect(ui,detail);assert.ok(detail.textContent.includes(condition.care));assert.ok(detail.textContent.includes(condition.progress));assert.equal(detail.querySelector('[data-op="activity"]'),null);await ui.fire('click',detail.querySelector('[data-op="notice-recovery"]'));assert.ok(ui.root.querySelector('[data-status-reference="recovery"]'));assert.deepEqual(ui.current(),before);
});
test('carried-remedy destination opens Inventory without using a supply or spending a day',async t=>{
 const s=fresh();s.hero.potions=2;assert.ok(E.validateSave(s));const ui=await open(t,s);await ui.click('tab','inventory');await ui.click('inventory-favorites');await ui.click('inventory-category','equipment');
 ui.root.querySelector('#inventory-query').value='hidden-by-old-query';ui.root.querySelector('#inventory-slot').value='feet';await ui.fire('submit',ui.root.querySelector('#inventory-search'));
 await ui.click('tab','life');await ui.click('tab','inventory');assert.equal(ui.root.querySelector('#inventory-query').value,'hidden-by-old-query');assert.equal(ui.root.querySelector('#inventory-slot').value,'feet');assert.equal(ui.root.querySelector('[data-op="inventory-favorites"]').getAttribute('aria-pressed'),'true','ordinary Inventory retains view preferences');
 const detail=await recovery(ui),before=ui.current();await ui.fire('click',detail.querySelector('[data-op="inventory-remedies"]'));assert.ok(ui.root.querySelector('.inventory-workspace'));assert.equal(ui.root.querySelector('#inventory-query').value,'');assert.equal(ui.root.querySelector('#inventory-slot').value,'all');assert.equal(ui.root.querySelector('[data-op="inventory-favorites"]').getAttribute('aria-pressed'),'false');assert.equal(ui.root.querySelector('.inventory-detail').dataset.inventorySelected,'supply:potions');assert.ok(ui.root.querySelector('[data-field-treatment="hero"]'),'explicit remedies reveal actual named-target potion treatment');assert.deepEqual(ui.current(),before);assert.equal(ui.document.activeElement.isConnected,true);
});
test('Explore inspection and Today road references leave the confirmed journey and its costs unchanged',async t=>{
 const ui=await open(t);await ui.click('tab','map');const before=ui.current(),destination=Object.keys(before.cartography.sites).filter(id=>id!==before.locationId).map(id=>({id,q:E.exploreTravelPreview(before,id)})).filter(r=>r.q.mode==='road'&&!r.q.disabledReason).sort((a,b)=>a.q.days-b.q.days)[0];assert.ok(destination,'recorded known road destination');await ui.fire('click',ui.root.querySelector(`button[data-op="destination-select"][data-id="${destination.id}"]`),{detail:1});const detail=ui.root.querySelector('[data-travel-reference="focus"]');await inspect(ui,detail);assert.match(detail.textContent,/estimate without further rest/);assert.deepEqual(ui.current(),before);await ui.click('travel',destination.id);const journey=ui.current();assert.deepEqual(journey,E.startExploreJourney(before,destination.id));assert.ok(journey.timeline.journey);await inspect(ui,ui.root.querySelector('[data-travel-reference="focus"]'));await ui.click('tab','life');const today=ui.root.querySelector('[data-road-journey] [data-travel-reference="focus"]');await inspect(ui,today);assert.deepEqual(ui.current(),journey);
});
test('a genuine legacy journey retains its quoted payment and no modern travel penalty is substituted',async t=>{
 const s=fresh(earlier.journey),ui=await open(t,s);assert.ok(s.timeline.journey);assert.notEqual(s.timeline.journey.energyVersion,1);await ui.click('tab','map');let detail=ui.root.querySelector('[data-travel-reference="legacy"]');await inspect(ui,detail);assert.match(detail.textContent,/saved journey keeps its original pace/);assert.doesNotMatch(detail.textContent,/each normal travel day|Continuing exhausted/);await ui.click('tab','life');detail=ui.root.querySelector('[data-road-journey] [data-travel-reference="legacy"]');await inspect(ui,detail);assert.deepEqual(ui.current(),s);
});
test('a waiting birthday remains untouched while its Recovery reference is inspected',async t=>{
 const raw=JSON.parse(readFileSync(new URL('./fixtures/legacy-v4.json',import.meta.url))).states.birth0,s=fresh(raw),ui=await open(t,s),detail=await recovery(ui);assert.ok(s.event);await inspect(ui,detail);assert.deepEqual(ui.current().event,s.event);assert.deepEqual(ui.current(),s);assert.equal(detail.querySelector('[data-op="activity"]'),null);
});
