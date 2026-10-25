import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { careerView } from '../dist/js/careers.js';
import { MATERIAL_PRICES } from '../dist/js/economy-values.js';
import { settlementServices, serviceAccepts } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function walk(s,room){for(const id of settlementWalkPath(s,room))s=valid(E.chooseAction(s,'atlas_room_'+id));return s;}
function fresh(room='market'){
 let s=E.migrateSave(structuredClone(fixture.states.base));s.locationId='home';s.cartography.offsite=false;s.cartography.interior=null;s.hero.gold=1000;syncCartography(s);s=E.migrateSave(s);return walk(valid(s),room);
}
const provider=(s,kind)=>settlementServices(s).find(r=>r.kind===kind);
const stable=s=>({day:s.day,gold:s.hero.gold,equipment:s.equipment,careers:s.careers,obligations:s.obligations,locationId:s.locationId});
async function open(t,s=fresh(),kind='work'){
 s=walk(s,provider(s,kind).roomId);const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('place-open');await ui.click('service-open',provider(ui.current(),kind).id);return ui;
}
const offer=s=>careerView(s).commissions.find(c=>!c.gearId);
function accepted(){let s=fresh();s=walk(s,provider(s,'work').roomId);s=valid(E.chooseAction(s,offer(s).actionId));assert.ok(s.careers.active);return s;}

test('a named Materials Merchant is stable at Market without replacing any existing resident or merchant',()=>{
 const s=fresh(),before=structuredClone(s),first=provider(s,'materials');assert.equal(first.role,'Materials Merchant');assert.equal(first.roomId,'market');assert.equal(first.id,'materials-home');assert.equal(first.personId,`resident-materials-home-${Math.floor(s.day/(55*365))}`);assert.notEqual(first.personId,provider(s,'work').personId);assert.notEqual(first.name,provider(s,'work').name);
 for(const kind of ['work','doctor','inn','smith','watch','guide','animals','archivist'])assert.equal(provider(s,kind).personId,`resident-${kind}-home-${Math.floor(s.day/(55*365))}`);
 const merchant=s.realm.sites.home.merchant;assert.equal(settlementServices(s).find(r=>r.subjectId==='market').personId,'resident-'+merchant.id.replace(/[^a-zA-Z0-9_-]/g,'-'));
 for(let i=0;i<4;i++){assert.deepEqual(provider(s,'materials'),first);E.getActions(s);careerView(s);}assert.deepEqual(s,before);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
 const n=valid(E.visitService(s,first.id));assert.equal(n.conversations.servicePeople[first.personId].name,first.name);assert.equal(n.conversations.servicePeople[first.personId].role,'Materials Merchant');assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(n))),n);
});

test('only the Materials Merchant owns the six exact material purchase commands',()=>{
 const s=fresh(),rows=settlementServices(s),materials=provider(s,'materials');
 for(const material of Object.keys(MATERIAL_PRICES)){const id='career_buy_'+material;assert.deepEqual(rows.filter(r=>serviceAccepts(r,id)).map(r=>r.id),[materials.id]);}
 for(const id of ['career_buy_fake','career_buy_hide_extra','career_work','career_accept_fake','career_make_standard','career_invoice','career_abandon','gear_buy_iron_sword'])assert.equal(serviceAccepts(materials,id),false,id);
 assert.ok(serviceAccepts(provider(s,'work'),'career_work'));assert.ok(serviceAccepts(provider(s,'work'),'career_accept_fake'));
});

for(const [material,price] of Object.entries(MATERIAL_PRICES))test(`${material} retains its 3-unit bundle, ${price*3}-Gold price and one real day`,()=>{
 const s=fresh(),a=E.getActions(s).find(a=>a.id==='career_buy_'+material);assert.equal(a.cost,price*3);assert.equal(a.days,1);assert.equal(a.disabledReason,undefined);const n=valid(E.chooseAction(s,a.id));assert.equal(n.equipment.materials[material],s.equipment.materials[material]+3);assert.equal(n.hero.gold,s.hero.gold-price*3);assert.equal(n.day,s.day+1);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(n))),n);
});

test('material purchases cannot run remotely, at an absent merchant, with insufficient Gold or below the existing career age gate',()=>{
 for(const room of ['gate','shrine','tavern','homes','workyard']){const s=fresh(room);for(const material of Object.keys(MATERIAL_PRICES)){const id='career_buy_'+material,a=E.getActions(s).find(a=>a.id===id);assert.match(a.disabledReason,/Visit .* at the Market/);assert.deepEqual(stable(E.chooseAction(s,id)),stable(s));}}
 const closed=fresh();closed.world.locations.find(p=>p.id==='home').servicesAvailable=false;assert.equal(provider(closed,'materials'),undefined);assert.deepEqual(stable(E.chooseAction(closed,'career_buy_hide')),stable(closed));
 const poor=fresh();poor.hero.gold=14;assert.match(E.getActions(poor).find(a=>a.id==='career_buy_hide').disabledReason,/Requires 15 gold/);assert.deepEqual(stable(E.chooseAction(poor,'career_buy_hide')),stable(poor));
 const young=fresh();young.age=15;assert.ok(!E.getActions(young).some(a=>a.id.startsWith('career_buy_')));
});

test('the dedicated merchant shows materials and no steward work or commission commands',async t=>{
 const ui=await open(t,fresh(),'materials'),r=provider(ui.current(),'materials');assert.ok(ui.root.querySelector(`[data-service-person="${r.personId}"]`));assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_buy_')).length,0);await ui.click('shop-browse');assert.equal(ui.root.querySelectorAll('[data-op="shop-item"]').filter(n=>n.dataset.id.startsWith('buy:material:')).length,6);assert.equal(ui.root.querySelector('[data-id="career_work"]'),null);assert.equal(ui.root.querySelector('[data-op="service-topic"]'),null);
 const before=ui.current();await ui.click('shop-item','buy:material:hide');await ui.click('shop-add','buy:material:hide');await ui.click('shop-confirm');assert.equal(ui.current().equipment.materials.hide,before.equipment.materials.hide+3);assert.equal(ui.current().hero.gold,before.hero.gold-15);assert.equal(ui.current().day,before.day+1);valid(ui.current());
});

test('asking for commissions is free, repeatable and separate from accepting the saved offer terms',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),offered=careerView(before).commissions;assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_accept_')).length,0);assert.ok(ui.root.querySelector('[data-id="career_work"]'));assert.ok(!ui.root.querySelectorAll('[data-op="activity"]').some(n=>n.dataset.id.startsWith('career_buy_')));
 for(let i=0;i<3;i++){await ui.click('service-topic','commissions');assert.ok(ui.root.querySelector('.work-commission-meeting'));assert.deepEqual(ui.root.querySelectorAll('[data-op="activity"]').map(n=>n.dataset.id),offered.map(c=>c.actionId));for(const c of offered){const row=ui.root.querySelector(`[data-id="${c.actionId}"]`);assert.ok(row.textContent.includes(c.customerName));assert.ok(row.textContent.includes(c.goodName));assert.ok(row.textContent.includes(c.pay+' gold'));assert.ok(row.textContent.includes('Due on day '+c.dueDay));}assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);await ui.click('service-topic','work');assert.ok(ui.root.querySelector('.work-meeting'));}
 await ui.click('service-topic','commissions');const chosen=offer(ui.current()),stale=ui.root.querySelector(`[data-id="${chosen.actionId}"]`);await ui.click('activity',chosen.actionId);const n=valid(ui.current()),a=n.careers.active;for(const key of ['id','customerName','goodName','materials','days','pay','targetQuality','dueDay','locationId'])assert.deepEqual(a[key],chosen[key],key);assert.equal(a.status,'accepted');assert.equal(n.day,before.day);assert.equal(n.hero.gold,before.hero.gold);assert.ok(ui.root.querySelector('.service-current-commission'));assert.ok(ui.root.querySelector('[data-id="career_make_standard"]'));const after=stable(n);await ui.fire('click',stale);assert.deepEqual(stable(ui.current()),after);assert.equal(ui.current().careers.claimedIds.filter(id=>id===a.id).length,1);
});

test('an empty commission response is explicit and never invents or accepts work',async t=>{
 const s=fresh();s.careers.claimedIds=careerView(s).commissions.map(c=>c.id);valid(s);const ui=await open(t,s),before=ui.current();await ui.click('service-topic','commissions');assert.match(ui.root.querySelector('.dialogue-window').textContent,/no commissions available.*later season/i);assert.equal(ui.root.querySelector('[data-op="activity"]'),null);assert.deepEqual(ui.current(),before);
});

test('an accepted commission survives reload and remains visible on both steward branches',async t=>{
 const s=accepted(),agreed=structuredClone(s.careers.active),ui=await open(t,valid(E.migrateSave(JSON.parse(JSON.stringify(s)))));assert.ok(ui.root.querySelector('.service-current-commission'));assert.ok(ui.root.querySelector('[data-id="career_make_standard"]'));const before=ui.current();await ui.click('service-topic','commissions');assert.match(ui.root.querySelector('.dialogue-window').textContent,/already have a commission/);assert.equal(ui.root.querySelectorAll('[data-op="activity"]').filter(n=>n.dataset.id.startsWith('career_accept_')).length,0);assert.ok(ui.root.querySelector('[data-id="career_abandon"]'));assert.deepEqual(ui.current(),before);assert.deepEqual(ui.current().careers.active,agreed);
 await ui.click('service-close');assert.equal(ui.root.querySelector('.service-meeting'),null);await ui.click('service-open',provider(ui.current(),'work').id);assert.ok(ui.root.querySelector('.work-meeting'));assert.equal(ui.root.querySelector('.work-commission-meeting'),null);
});

test('finished commissions still expose the original invoice continuation after reload',async t=>{
 let s=accepted();for(const id of Object.keys(s.equipment.materials))s.equipment.materials[id]=30;s=valid(E.chooseAction(s,'career_make_standard'));assert.equal(s.careers.active.status,'ready');if(s.event){const agreed=structuredClone(s.careers.active);assert.equal(s.event.id,'career_year');s=valid(E.chooseEventOption(s,'care'));assert.deepEqual(s.careers.active,agreed);}const ui=await open(t,valid(E.migrateSave(JSON.parse(JSON.stringify(s)))));assert.ok(ui.root.querySelector('[data-id="career_invoice"]'));assert.match(ui.root.querySelector('.service-current-commission').textContent,/Ready to Hand Over/);await ui.click('service-topic','commissions');assert.ok(ui.root.querySelector('[data-id="career_invoice"]'));const before=ui.current();await ui.click('activity','career_invoice');assert.deepEqual(ui.current(),E.chooseAction(before,'career_invoice'));assert.equal(ui.current().event.id,'career_invoice');valid(ui.current());
});

test('walking from the steward to the Materials Merchant is free and does not accept a commission',async t=>{
 const ui=await open(t),before=ui.current(),merchant=provider(before,'materials');await ui.click('service-topic','commissions');await ui.click('service-topic','work');await ui.click('activity-visit',merchant.id);assert.ok(ui.root.querySelector(`[data-service-person="${merchant.personId}"]`));assert.equal(ui.current().cartography.interior.roomId,'market');assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.deepEqual(ui.current().careers,before.careers);assert.equal(ui.root.querySelector('.work-commission-meeting'),null);await ui.click('service-close');await ui.click('place-area',provider(ui.current(),'work').roomId);await ui.click('service-open',provider(ui.current(),'work').id);assert.ok(ui.root.querySelector('.work-meeting'));
});
