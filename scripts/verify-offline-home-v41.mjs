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
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { householdCostPreview } from '../dist/js/budget.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const html=installOfflineDocument(read('artifacts/hearth-and-oath.html').toString('utf8'));
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
assert.doesNotMatch(code,/^import\s/m);
const compiled=compileOfflineModule(code,{filename:'standalone-home-v41.js'});
const fixture=JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz')));
function base(){const s=structuredClone(fixture.states.base);s.locationId='home';s.cartography.offsite=false;s.cartography.pending=null;s.cartography.interior=null;s.hero.gold=1000;syncCartography(s);assert.ok(E.validateSave(s));return s;}
async function boot(s){
 const ui=fakeSurface();ui.storage.setItem('hearth-and-oath:slots:v1',JSON.stringify({version:1,activeSlot:0,backups:{},slots:[{id:0,state:s,updatedAt:'2026-10-16T00:00:00Z'},{id:1,state:null},{id:2,state:null}]}));ui.storage.setItem('hearth-and-oath:life:v1',JSON.stringify(s));
 const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window:{innerWidth:1440,innerHeight:900,scrollTo(){},scrollBy(){}},requestAnimationFrame:cb=>{cb();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout:()=>1,clearTimeout(){},Blob,URL,TextEncoder,TextDecoder,console,queueMicrotask,fetch:()=>{throw Error('Network forbidden during standalone verification');}});
 new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);await compiled.evaluate(context);return ui;
}

let state=base();state.hero.gold=2000;state.life.stress=35;state.life.home={tier:'cottage',source:'purchase',locationId:'home'};
for(const room of settlementWalkPath(state,'homes'))state=E.chooseAction(state,'atlas_room_'+room);
assert.ok(E.validateSave(state));const parent=state.life.people.find(p=>p.id==='kin'),parentBefore=structuredClone(parent);
let ui=await boot(state);await ui.click('title-continue');await ui.click('tab','map');await ui.click('place-open');
assert.ok(ui.root.querySelector('.home-overview'));assert.equal(ui.root.querySelector('[data-id="life_home_cottage"]'),null);assert.equal(ui.root.querySelector('[data-id="lineage_adoption_6"]'),null);assert.ok(ui.root.querySelector('[data-id="home_rest"]'));
let before=ui.current();await ui.click('activity','home_rest');assert.equal(ui.current().life.stress,27);assert.equal(ui.current().day,before.day+1);assert.equal(ui.current().hero.mp,ui.current().hero.maxMp);assert.equal(ui.current().hero.gold,before.hero.gold-householdCostPreview(before,1).totalDue);
await ui.click('activity','life_home_townhouse');before=ui.current();assert.match(ui.root.querySelector('[role="dialog"]').textContent,/340 Gold · 14 Days/);await ui.click('close-modal');assert.deepEqual(ui.current(),before);
await ui.click('activity','life_home_townhouse');const stale=ui.root.querySelector('[data-op="home-purchase-confirm"]');await stale.click();const upgraded=ui.current();assert.equal(upgraded.hero.gold,before.hero.gold-340);assert.equal(upgraded.day,before.day+14);assert.equal(upgraded.life.home.tier,'townhouse');assert.deepEqual(upgraded.life.people.find(p=>p.id==='kin'),parentBefore);await stale.click();assert.deepEqual(ui.current(),upgraded);assert.ok(E.validateSave(upgraded));
await ui.click('home-family');assert.ok(ui.root.querySelector('.family-adoption'));await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current(),upgraded);await ui.click('tab','map');await ui.click('place-open');assert.equal(ui.root.querySelector('[data-id="life_home_townhouse"]'),null);assert.ok(ui.root.querySelector('[data-id="life_home_estate"]'));
console.log('Standalone home verification passed: current dwelling and rest first; adoption only in Family; reviewed, cancelled, confirmed upgrade with exact 340 Gold / 14 days; repeated stale confirmation harmless; parent record preserved; save/resume exact; home rest restores all Focus, relieves 8 Stress, charges no rest fee, retains ordinary living costs. No network requests. Semantic DOM only, not browser layout.');
