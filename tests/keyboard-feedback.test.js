import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setImmediate as settle } from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import { createSaveStore } from '../dist/js/saves.js';
import { tradeInventory } from '../dist/js/trading.js';
import { GEAR_CATALOG } from '../dist/js/gear.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// These exercise the production handlers with synthetic lives and a real prior
// save fixture. They do not emulate browser layout or a screen reader.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const base=E.migrateSave(fixture.states.base);
function fresh(kind=null){let s=structuredClone(base);s.hero.gold=1000;for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=30;if(kind){const provider=settlementServices(s).find(r=>r.kind===kind);assert.ok(provider,kind);for(const id of settlementWalkPath(s,provider.roomId))s=E.chooseAction(s,'atlas_room_'+id);}return s;}
async function open(t,s=fresh()){const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');return ui;}
async function atService(t,s,kind){const ui=await open(t,s);await ui.click('place-open');await ui.click('service-open',settlementServices(s).find(r=>r.kind===kind).id);return ui;}
function announcements(ui){let value=ui.viewStatus.textContent;const messages=[];Object.defineProperty(ui.viewStatus,'textContent',{configurable:true,get:()=>value,set(next){value=next;if(next)messages.push(next);}});return messages;}
function queuedFrames(){const callbacks=[];globalThis.requestAnimationFrame=callback=>{callbacks.push(callback);return callbacks.length;};return ()=>{for(let turns=0;callbacks.length&&turns<20;turns++){const batch=callbacks.splice(0);for(const callback of batch)callback();}assert.equal(callbacks.length,0);};}
function active(ui,op,id){assert.equal(ui.document.activeElement?.dataset?.op,op);if(id!==undefined)assert.equal(ui.document.activeElement.dataset.id,id);assert.equal(ui.document.activeElement.isConnected,true);}
function heldLocks(){let blocked=false;const gates=[];return {hold(){blocked=true;},release(){blocked=false;for(const resolve of gates.splice(0))resolve();},async request(name,options,operation){if(blocked)await new Promise(resolve=>gates.push(resolve));return operation();}};}

for(const op of ['creator-random','creator-name'])test(op+' retains its trigger over repeated Enter and Space rerenders',async t=>{
 const ui=await mountApp(t, {rulebooks:'both'});await ui.click('title-new');await ui.click('slot-new','0');const before=ui.storage.getItem('hearth-and-oath:slots:v1');
 for(const key of ['Enter',' ','Enter']){const trigger=ui.root.querySelector('[data-op="'+op+'"]');trigger.focus();await ui.key(key);active(ui,op,'');assert.notEqual(ui.document.activeElement,trigger,'focus moves to the replacement, never its detached predecessor');}
 assert.equal(ui.storage.getItem('hearth-and-oath:slots:v1'),before,'rerolling never creates or replaces a saved life');
});

test('a queued creator restoration cannot pull focus out of a newer modal, whose Tab/Escape behavior remains intact',async t=>{
 const ui=await mountApp(t, {rulebooks:'both'});await ui.click('title-new');await ui.click('slot-new','0');const flush=queuedFrames();
 ui.root.querySelector('[data-op="creator-name"]').focus();await ui.click('creator-name');await ui.click('creator-portraits');await Promise.resolve();flush();
 assert.ok(ui.document.activeElement.classList.contains('modal-close'));
 const controls=ui.root.querySelectorAll('.modal button:not(:disabled), .modal a[href], .modal input:not(:disabled), .modal select:not(:disabled), .modal textarea:not(:disabled), .modal [tabindex="0"]').filter(el=>el.getClientRects().length),first=controls[0],last=controls.at(-1);
 first.focus();assert.equal((await ui.key('Tab',{shiftKey:true})).defaultPrevented,true);assert.equal(ui.document.activeElement,last);
 last.focus();assert.equal((await ui.key('Tab')).defaultPrevented,true);assert.equal(ui.document.activeElement,first);
 await ui.key('Escape');flush();assert.equal(ui.root.querySelector('.modal'),null);active(ui,'creator-portraits','');
});

test('live map-popup selection keeps its existing nonvisual confirmation inside the dialog',async t=>{
 const ui=await open(t);await ui.click('tab','map');await ui.click('map-expand');const before=ui.current(),messages=announcements(ui),destination=ui.root.querySelector('.modal [data-op="destination-select"]');assert.ok(destination);destination.focus();await ui.key('Enter');assert.deepEqual(ui.current(),before);assert.equal(messages.length,1);assert.match(messages[0],/Selected.*Close the map/);assert.ok(ui.document.activeElement.closest('.modal'));active(ui,'destination-select',destination.dataset.id);
});

test('buy and sell quantity controls name direction, item and unit without altering the staged deal',async t=>{
 const s=fresh('materials');s.equipment.owned.push('scholar_hood');s.equipment.equipped.head=null;
 const ui=await atService(t,s,'materials');await ui.click('shop-browse');const before=ui.current();
 for(const [side,id] of [['buy','material:hide'],['sell','gear:scholar_hood']]){
  const row=tradeInventory(before,'materials')[side].find(r=>r.id===id);assert.ok(row);
  await ui.click('shop-item',side+':'+id);const inspector=ui.root.querySelector('.trade-inspector [data-op="shop-add"]');assert.equal(inspector.getAttribute('aria-label'),'Increase '+side+' quantity for '+row.name+' by one'+(side==='buy'?' bundle':''));
  await ui.click('shop-add',side+':'+id);
  for(const [op,direction] of [['shop-remove','Decrease'],['shop-add','Increase']]){const control=ui.root.querySelector('.trade-offer [data-op="'+op+'"][data-id="'+side+':'+id+'"]');assert.ok(control);assert.equal(control.getAttribute('aria-label'),direction+' '+side+' quantity for '+row.name+' by one'+(side==='buy'?' bundle':''));}
 }
 assert.deepEqual(ui.current(),before);await ui.click('shop-clear');assert.equal(ui.document.activeElement.id,'trade-heading');await ui.click('shop-conversation');assert.equal(ui.document.activeElement.id,'meeting-speaker');assert.deepEqual(ui.current(),before);
});

test('trade confirmation returns to its heading and announces its actual receipt once, not a stale activation',async t=>{
 const ui=await atService(t,fresh('materials'),'materials');await ui.click('shop-browse');await ui.click('shop-item','buy:material:hide');await ui.click('shop-add','buy:material:hide');const before=ui.current(),messages=announcements(ui),trigger=ui.root.querySelector('[data-op="shop-confirm"]');trigger.focus();await ui.key('Enter');
 const after=ui.current();assert.equal(after.day,before.day+1);assert.equal(after.hero.gold,before.hero.gold-15);assert.equal(after.equipment.materials.hide,before.equipment.materials.hide+3);assert.equal(ui.document.activeElement.id,'trade-heading');assert.deepEqual(messages,[after.notice]);assert.equal(ui.root.querySelector('.latest-result [role="status"]'),null);
 await ui.fire('click',trigger);assert.deepEqual(ui.current(),after);assert.deepEqual(messages,[after.notice]);
});

test('a long actual trade receipt is announced once in a bounded excerpt while Latest Result keeps every item',async t=>{
 const s=fresh('materials');s.equipment.owned=[...new Set([...s.equipment.owned,...GEAR_CATALOG.slice(0,15).map(item=>item.id)])];for(const slot of Object.keys(s.equipment.equipped))s.equipment.equipped[slot]=null;
 const ui=await atService(t,s,'materials');await ui.click('shop-browse');const rows=tradeInventory(ui.current(),'materials').sell.filter(row=>!row.disabledReason).slice(0,15);assert.equal(rows.length,15);
 for(const row of rows){await ui.click('shop-item','sell:'+row.id);await ui.click('shop-add','sell:'+row.id);}
 const messages=announcements(ui);await ui.click('shop-confirm');const notice=ui.current().notice;assert.ok(notice.length>280);assert.equal(messages.length,1);assert.ok(messages[0].length<=280);assert.ok(messages[0].endsWith('…'));assert.ok(notice.startsWith(messages[0].slice(0,-1)));assert.equal(ui.root.querySelector('.latest-result p').textContent,notice);
});

test('craft confirmation returns to the design and announces only the authoritative result once',async t=>{
 const ui=await atService(t,fresh('smith'),'smith');await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');const before=ui.current(),expected=E.chooseAction(before,'workshop_craft_padded_gambeson'),messages=announcements(ui),trigger=ui.root.querySelector('[data-op="craft-confirm"]');trigger.focus();await ui.key(' ');
 assert.deepEqual(ui.current(),expected);assert.equal(ui.document.activeElement.id,'craft-item-heading');assert.deepEqual(messages,[expected.notice]);await ui.fire('click',trigger);assert.deepEqual(ui.current(),expected);assert.equal(messages.length,1);
 await ui.click('craft-conversation');assert.equal(ui.document.activeElement.id,'meeting-speaker');
});

test('abandoning an interrupted craft returns to the workbench without inventing a refund',async t=>{
 let s=fresh('smith');s.day=s.timeline.birthDay+23*365-1;s.age=22;s.timeline.yearStartDay=s.day-364;s.timeline.yearTarget=null;syncCartography(s);s=E.chooseAction(s,'workshop_craft_padded_gambeson');
 for(let count=0;s.event&&count<12;count++){const choice=s.event.choices.find(c=>c.id==='continue'&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);assert.ok(choice);s=E.chooseEventOption(s,choice.id);}
 assert.equal(s.event,null);assert.ok(s.workshop.project);const ui=await atService(t,s,'smith');await ui.click('craft-browse');const before=ui.current(),expected=E.chooseAction(before,'workshop_cancel'),messages=announcements(ui);ui.root.querySelector('.craft-project details').open=true;ui.root.querySelector('[data-op="craft-continue"][data-id="workshop_cancel"]').focus();await ui.key('Enter');assert.deepEqual(ui.current(),before);assert.ok(ui.root.querySelector('[role="dialog"]'));await ui.click('project-abandon-confirm');assert.deepEqual(ui.current(),expected);assert.equal(ui.document.activeElement.id,'craft-heading');assert.equal(ui.current().hero.gold,before.hero.gold);assert.deepEqual(ui.current().equipment.materials,before.equipment.materials);assert.deepEqual(messages,[expected.notice]);
});

test('unaffordable crafting neither announces a completed action nor changes resources',async t=>{
 const s=fresh('smith');s.hero.gold=0;const ui=await atService(t,s,'smith');await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');const before=ui.current(),messages=announcements(ui),trigger=ui.root.querySelector('[data-op="craft-confirm"]');assert.equal(trigger.disabled,true);assert.match(ui.root.querySelector('.craft-detail').textContent,/Requires|Gold|gold/);await ui.fire('click',trigger);assert.deepEqual(ui.current(),before);assert.deepEqual(messages,[]);await ui.click('craft-conversation');assert.equal(ui.document.activeElement.id,'meeting-speaker');
});

test('ordinary Activities publish a single concise actual outcome, not the shell or saved hidden records',async t=>{
 const s=fresh();s.playerNotes=[{day:s.day,text:'PRIVATE_NOTE_NOT_AN_ACTION_RESULT'}];const ui=await open(t,s);await ui.click('tab','activities');await ui.click('activities-pane','fun');const messages=announcements(ui),before=ui.current(),trigger=ui.root.querySelector('[data-op="activity"][data-id="leisure_walk"]');trigger.focus();await ui.key('Enter');const after=ui.current();
 assert.equal(after.day,before.day+1);assert.equal(messages.length,1);assert.equal(messages[0],after.notice);assert.ok(messages[0].length<=280);assert.doesNotMatch(messages[0],/PRIVATE_NOTE|HEARTH|Your next birthday|Screen sections/);assert.equal(ui.root.querySelector('.latest-result [role="status"]'),null);
 await ui.fire('click',trigger);assert.deepEqual(ui.current(),after);assert.equal(messages.length,1);
});

test('repeated real potion outcomes with identical wording each announce once and keep the trigger',async t=>{
 const s=fresh();s.hero.hp=1;s.hero.maxHp=1000;s.hero.potions=3;const ui=await open(t,s);await ui.click('tab','inventory');await ui.click('inventory-item','supply:potions');const before=ui.current(),messages=announcements(ui);
 for(let count=0;count<2;count++){ui.root.querySelector('[data-op="use-consumable"][data-id="potions"]').focus();await ui.key('Enter');active(ui,'use-consumable','potions');}
 assert.equal(ui.current().hero.potions,before.hero.potions-2);assert.equal(ui.current().hero.hp,before.hero.hp+60);assert.deepEqual(messages,['You drink a healing potion and recover 30 Health.','You drink a healing potion and recover 30 Health.']);
});

test('live menu and popup targets still work after replacement while detached predecessors are ignored',async t=>{
 const ui=await open(t);const menu=ui.root.querySelector('[data-op="menu"][data-id="header"]');menu.focus();await ui.key('Enter');assert.ok(ui.root.querySelector('#menu-drawer'));const close=ui.root.querySelector('.modal [data-op="close-modal"]');assert.equal(close.isConnected,true);close.focus();await ui.key(' ');assert.equal(ui.root.querySelector('.modal'),null);active(ui,'menu','header');await ui.fire('click',menu);assert.equal(ui.root.querySelector('.modal'),null,'the obsolete menu control cannot reopen a popup');
 ui.root.querySelector('[data-op="menu"][data-id="header"]').focus();await ui.key('Enter');const settings=ui.root.querySelector('.modal [data-op="game-settings"]');assert.equal(settings.isConnected,true);settings.focus();await ui.key('Enter');assert.match(ui.root.querySelector('.modal').textContent,/Sound & display/);await ui.key('Escape');assert.equal(ui.root.querySelector('.modal'),null);
});

test('a newer render suppresses pending action focus and announcements rather than speaking an obsolete view',async t=>{
 const ui=await open(t);await ui.click('tab','activities');await ui.click('activities-pane','fun');const messages=announcements(ui),flush=queuedFrames();ui.root.querySelector('[data-op="activity"][data-id="leisure_walk"]').focus();await ui.click('activity','leisure_walk');await ui.click('tab','inventory');flush();assert.deepEqual(messages,[]);assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'),'Inventory');assert.notEqual(ui.document.activeElement?.dataset?.id,'leisure_walk');
});

test('a birthday-interrupted craft keeps the decision focus instead of a stale design target',async t=>{
 const s=fresh('smith');s.day=s.timeline.birthDay+23*365-1;s.age=22;s.timeline.yearStartDay=s.day-364;s.timeline.yearTarget=null;syncCartography(s);assert.ok(E.validateSave(s));const ui=await atService(t,s,'smith');await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');ui.root.querySelector('[data-op="craft-confirm"]').focus();await ui.key('Enter');assert.ok(ui.current().event);assert.ok(ui.document.activeElement.closest('.story-scene'),'the waiting decision, not the workbench, owns focus');
});

test('a synchronous trade-save conflict cannot be bypassed by the counter focus callback',async t=>{
 const ui=await atService(t,fresh('materials'),'materials');await ui.click('shop-browse');await ui.click('shop-item','buy:material:hide');await ui.click('shop-add','buy:material:hide');const before=ui.current(),remote=E.chooseAction(before,'career_buy_wood'),messages=announcements(ui);assert.ok(createSaveStore(ui.storage,E.migrateSave).write(0,remote));await ui.click('shop-confirm');await Promise.resolve();assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.ok(ui.document.activeElement.classList.contains('modal-close'));assert.deepEqual(ui.current(),remote);assert.deepEqual(messages,[]);
});

for(const timing of ['before frames','after frames','after newer navigation'])test('queued quota failure '+timing+' preserves current focus and never replays the outcome',async t=>{
 const s=fresh();s.hero.hp=1;s.hero.maxHp=1000;s.hero.potions=3;const locks=heldLocks(),mounting=mountApp(t, {rulebooks:'both', states:[s]});window.navigator={locks};const ui=await mounting;await ui.click('title-continue');await settle();await ui.click('tab','inventory');await ui.click('inventory-item','supply:potions');const before=ui.current(),expected=E.useConsumable(before,'potions'),messages=announcements(ui),flush=queuedFrames(),write=ui.storage.setItem;
 ui.storage.setItem=(key,value)=>{if(key.startsWith('hearth-and-oath:slots:')||key==='hearth-and-oath:life:v1')throw Error('Synthetic quota');write(key,value);};locks.hold();ui.root.querySelector('[data-op="use-consumable"][data-id="potions"]').focus();await ui.click('use-consumable','potions');
 if(timing==='after frames')flush();if(timing==='after newer navigation')await ui.click('tab','relationships');const restored=timing==='after frames'?ui.document.activeElement:null;
 const regionBeforeRelease=ui.root.querySelector('#storage-warning');assert.equal(regionBeforeRelease.hidden,false);assert.equal(regionBeforeRelease.getAttribute('aria-hidden'),null);locks.release();await settle();await settle();const warning=ui.root.querySelector('#storage-warning');assert.equal(warning,regionBeforeRelease,'availability-only feedback retains its mounted live region');assert.equal(warning.hidden,false);assert.equal(warning.getAttribute('aria-hidden'),null);assert.equal(warning.getAttribute('role'),'status');assert.equal(warning.getAttribute('aria-live'),'polite');assert.equal(warning.getAttribute('aria-atomic'),'true');assert.match(warning.textContent,/Browser storage is unavailable/);flush();assert.deepEqual(ui.current(),before,'a storage failure never pretends the new position became durable');assert.equal(ui.root.querySelector('.latest-result p').textContent,expected.notice);
 if(timing==='after newer navigation'){assert.deepEqual(messages,[]);assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'),'Relationships');assert.notEqual(ui.document.activeElement?.dataset?.op,'use-consumable');}
 else {active(ui,'use-consumable','potions');assert.deepEqual(messages,[expected.notice]);if(restored)assert.equal(ui.document.activeElement,restored,'late availability changes must not detach the restored control');}
});

test('a late queued-save conflict owns focus and blocks obsolete action announcements without overwriting either life',async t=>{
 const s=fresh(),locks=heldLocks(),mounting=mountApp(t, {rulebooks:'both', states:[s]});window.navigator={locks};const ui=await mounting;await ui.click('title-continue');await settle();await ui.click('tab','activities');await ui.click('activities-pane','fun');const messages=announcements(ui),flush=queuedFrames(),before=ui.current();locks.hold();await ui.click('activity','leisure_walk');const remote=E.chooseAction(before,'leisure_read');assert.ok(createSaveStore(ui.storage,E.migrateSave).write(0,remote));locks.release();await settle();await settle();flush();await Promise.resolve();assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.ok(ui.document.activeElement.classList.contains('modal-close'));assert.deepEqual(messages,[]);assert.deepEqual(ui.current(),remote);assert.match(ui.root.innerHTML,/has not overwritten/);
});
