import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=()=>structuredClone(fixture.states.base);
const nearest=s=>Object.keys(s.cartography.sites).filter(id=>id!==s.locationId&&!E.exploreTravelPreview(s,id).disabledReason).sort((a,b)=>E.exploreTravelPreview(s,a).days-E.exploreTravelPreview(s,b).days)[0];
const pin=(ui,id)=>ui.root.querySelector(`button[data-op="destination-select"][data-id="${id}"]`);
async function open(t,s=fresh()){const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');await ui.click('tab','map');return ui;}

test('hover identifies only known places and leaves selection, route, all slots and life untouched',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),id=nearest(before),target=pin(ui,id),name=before.world.locations.find(p=>p.id===id).name;
 assert.equal(target.querySelector('.destination-pin-name').textContent,name);assert.equal(target.getAttribute('aria-label'),name);
 await ui.fire('pointerover',target,{pointerType:'mouse'});await ui.fire('pointermove',target,{pointerType:'mouse',clientX:100,clientY:100});
 assert.equal(pin(ui,id).getAttribute('aria-pressed'),'false');assert.equal(ui.root.querySelector('[data-op="travel"]'),null);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
 for(const p of before.world.locations.filter(p=>!before.cartography.sites[p.id]))assert.equal(pin(ui,p.id),null);
});
test('one mouse click immediately shows the named route and confirm command without spending anything',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),id=nearest(before),quote=E.exploreTravelPreview(before,id);
 await ui.fire('click',pin(ui,id),{detail:1});
 assert.equal(pin(ui,id).getAttribute('aria-pressed'),'true');assert.equal(ui.root.querySelector('#spatial-selection-title').textContent,before.world.locations.find(p=>p.id===id).name);assert.match(ui.root.querySelector('.destination-quote').textContent,new RegExp('~'+quote.days+' Days'));
 const confirm=ui.root.querySelector('[data-op="travel"]');assert.equal(confirm.textContent,'Confirm Journey');assert.equal(confirm.dataset.id,id);assert.equal(confirm.disabled,false);assert.match(ui.viewStatus.textContent,/Confirm Journey/);assert.doesNotMatch(ui.root.innerHTML,/Double.Click to Travel|Set Out/);
 assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
});
test('native double-click sequence is harmless until a separate confirmation starts the quoted journey once',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),id=nearest(before);
 await ui.fire('click',pin(ui,id),{detail:1});await ui.fire('click',pin(ui,id),{detail:2});await ui.fire('dblclick',pin(ui,id),{detail:2});ui.flushSpatialClicks();assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
 const confirm=ui.root.querySelector('[data-op="travel"]');await ui.fire('click',confirm,{detail:1});const next=ui.current();assert.deepEqual(next,E.startExploreJourney(before,id));assert.ok(E.validateSave(next));
 await ui.fire('click',confirm,{detail:2});await ui.fire('click',confirm,{detail:1});assert.deepEqual(ui.current(),next);
});
test('Enter and Space select freely, then keyboard activation of Confirm Journey commits travel',async t=>{
 const ui=await open(t),before=ui.current(),id=nearest(before);for(const key of ['Enter',' ']){await ui.key(key,{target:pin(ui,id)});assert.deepEqual(ui.current(),before);assert.equal(ui.document.activeElement.dataset.id,id);}
 await ui.key('Enter',{target:ui.root.querySelector('[data-op="travel"]')});assert.deepEqual(ui.current(),E.startExploreJourney(before,id));
});
test('a city name on the paper map selects the same route as its marker without starting travel',async t=>{
 const ui=await open(t),before=ui.current(),id=nearest(before),label=ui.root.querySelector(`text.paper-place-label[data-op="destination-select"][data-id="${id}"]`);assert.ok(label);await ui.fire('click',label,{detail:1});assert.equal(pin(ui,id).getAttribute('aria-pressed'),'true');assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.deepEqual(ui.current(),before);
});
test('choosing a different destination changes the review and confirmation uses that destination only',async t=>{
 const ui=await open(t),before=ui.current(),a=nearest(before),b=Object.keys(before.cartography.sites).find(id=>id!==a&&id!==before.locationId&&!E.exploreTravelPreview(before,id).disabledReason);
 await ui.fire('click',pin(ui,a),{detail:1});const stale=ui.root.querySelector('[data-op="travel"]');await ui.fire('click',pin(ui,b),{detail:1});assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,b);await ui.fire('click',stale,{detail:1});assert.deepEqual(ui.current(),before);
 await ui.click('travel',b);assert.deepEqual(ui.current(),E.startExploreJourney(before,b));
});
test('a closed route remains reviewable but cannot be confirmed by pointer or keyboard',async t=>{
 const s=fresh(),id=nearest(s);for(const road of s.world.roads)if(road.from===s.locationId||road.to===s.locationId)road.closed=true;
 const ui=await open(t,s),before=ui.current();await ui.fire('click',pin(ui,id),{detail:1});const confirm=ui.root.querySelector('[data-op="travel"]');assert.equal(confirm.disabled,true);assert.match(ui.root.querySelector('.disabled-reason').textContent,/No open road/);await ui.fire('click',confirm,{detail:1});await ui.key('Enter',{target:confirm});assert.deepEqual(ui.current(),before);
});
