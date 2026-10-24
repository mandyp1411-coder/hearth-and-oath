// Art and audio use one frozen table from the exact inert element; native per-realm asset allocation is separate evidence.
// Legacy semantic probes use the exact graph prefix in classic scope and the unchanged async module tail; complete module scope is separately verified by v71.
import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// Run after npm run build. Uses the actual standalone bundle with network disabled.
// Semantic DOM coverage is not a browser-layout or device test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createContext, Script } from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import { syncCartography } from '../dist/js/cartography.js';
import { careerView } from '../dist/js/careers.js';
import { settlementServices } from '../dist/js/world-services.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const html=installOfflineDocument(read('artifacts/hearth-and-oath.html').toString('utf8'));
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
assert.doesNotMatch(code,/^import\s/m);
const compiled=compileOfflineModule(code,{filename:'standalone-work-trade.js', legacyProbes: true, shareInertMedia: true});
const fixture=JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz')));
function base(){const s=structuredClone(fixture.states.base);s.locationId='home';s.cartography.offsite=false;s.cartography.pending=null;s.cartography.interior=null;s.hero.gold=1000;syncCartography(s);assert.ok(E.validateSave(s));return s;}
async function boot(s){
 const ui=fakeSurface();ui.storage.setItem('hearth-and-oath:slots:v1',JSON.stringify({version:1,activeSlot:0,backups:{},slots:[{id:0,state:s,updatedAt:'2026-10-16T00:00:00Z'},{id:1,state:null},{id:2,state:null}]}));ui.storage.setItem('hearth-and-oath:life:v1',JSON.stringify(s));
 const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window:{innerWidth:1440,innerHeight:900,scrollTo(){},scrollBy(){}},requestAnimationFrame:cb=>{cb();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout:()=>1,clearTimeout(){},Blob,URL,TextEncoder,TextDecoder,console,queueMicrotask,fetch:()=>{throw Error('Network forbidden during standalone verification');}});
 new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);await compiled.evaluate(context);return ui;
}
async function steward(ui){await ui.click('tab','activities');await ui.click('activities-pane','work');await ui.click('activity-visit',settlementServices(ui.current()).find(r=>r.kind==='work').id);}
let ui=await boot(base());await ui.click('title-continue');await steward(ui);
assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_buy_')).length,0);
assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_accept_')).length,0);
let before=ui.current();const offered=careerView(before).commissions;
await ui.click('service-topic','commissions');assert.deepEqual(ui.current(),before);assert.deepEqual(ui.root.querySelectorAll('[data-op="activity"]').map(n=>n.dataset.id),offered.map(c=>c.actionId));
await ui.click('service-topic','work');await ui.click('service-topic','commissions');assert.deepEqual(ui.current(),before);
const selected=offered.find(c=>!c.gearId);await ui.click('activity',selected.actionId);assert.equal(ui.current().careers.active.id,selected.id);assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.ok(E.validateSave(ui.current()));
assert.ok(ui.root.querySelector('[data-id="career_make_standard"]'));assert.ok(ui.root.querySelector('.service-current-commission'));
await ui.click('service-topic','work');const merchant=settlementServices(ui.current()).find(r=>r.kind==='materials');before=ui.current();await ui.click('activity-visit',merchant.id);assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.deepEqual(ui.current().careers,before.careers);assert.ok(ui.root.querySelector(`[data-service-person="${merchant.personId}"]`));assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_buy_')).length,0);await ui.click('shop-browse');assert.equal(ui.root.querySelectorAll('[data-op="shop-item"]').filter(n=>n.dataset.id.startsWith('buy:material:')).length,6);
before=ui.current();await ui.click('shop-item','buy:material:hide');await ui.click('shop-add','buy:material:hide');await ui.click('shop-confirm');assert.equal(ui.current().hero.gold,before.hero.gold-15);assert.equal(ui.current().day,before.day+1);assert.equal(ui.current().equipment.materials.hide,before.equipment.materials.hide+3);assert.deepEqual(ui.current().careers.active,before.careers.active);assert.ok(E.validateSave(ui.current()));
const agreed=structuredClone(ui.current().careers.active);await ui.click('title-menu');await ui.click('title-continue');await steward(ui);assert.ok(ui.root.querySelector('.work-meeting'));assert.ok(ui.root.querySelector('[data-id="career_make_standard"]'));await ui.click('service-topic','commissions');assert.match(ui.root.querySelector('.dialogue-window').textContent,/already have a commission/);assert.deepEqual(ui.current().careers.active,agreed);
let empty=base();empty.careers.claimedIds=careerView(empty).commissions.map(c=>c.id);assert.ok(E.validateSave(empty));ui=await boot(empty);await ui.click('title-continue');await steward(ui);before=ui.current();await ui.click('service-topic','commissions');assert.match(ui.root.querySelector('.dialogue-window').textContent,/no commissions available/);assert.equal(ui.root.querySelector('[data-op="activity"]'),null);assert.deepEqual(ui.current(),before);
// Dedicated craft catalog is the same embedded module and real delegated handlers.
let maker=base();for(const id of Object.keys(maker.equipment.materials))maker.equipment.materials[id]=30;
ui=await boot(maker);await ui.click('title-continue');await ui.click('place-open');const smith=settlementServices(ui.current()).find(r=>r.kind==='smith');await ui.click('place-area',smith.roomId);await ui.click('service-open',smith.id);before=ui.current();const slots=ui.lives();await ui.click('craft-browse');assert.ok(ui.root.querySelector('.craft-workspace'));await ui.click('craft-item','workshop_craft_padded_gambeson');assert.match(ui.root.querySelector('.craft-detail').textContent,/Required.*Owned/);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);const craftBefore=ui.current(),staleCraft=ui.root.querySelector('[data-op="craft-confirm"]');await ui.click('craft-confirm','workshop_craft_padded_gambeson');assert.deepEqual(ui.current(),E.chooseAction(craftBefore,'workshop_craft_padded_gambeson'));assert.ok(E.validateSave(ui.current()));const crafted=ui.current();await ui.fire('click',staleCraft);assert.deepEqual(ui.current(),crafted);await ui.click('craft-category','buildings');assert.ok(ui.root.querySelector('[data-id="workshop_build_shelter"]'));await ui.click('craft-conversation');assert.ok(ui.root.querySelector('.craftsperson-meeting'));
console.log('Standalone work/trade/craft verification passed: real embedded provider routing, free commission inquiry and repeat/back, exact saved acceptance, active continuation after reload, shared materials barter at 3 hide / 15 Gold / 1 day, explicit empty offers, dedicated craft catalog/result/requirements, exact engine crafting, stale confirmation rejection and back navigation; no network requests. Semantic DOM only, not browser layout.');
