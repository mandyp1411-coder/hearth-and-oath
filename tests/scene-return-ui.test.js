import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { settlementServices } from '../dist/js/world-services.js';
import { nearbyContacts } from '../dist/js/dialogue-ui-v22.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { tradeInventory } from '../dist/js/trading.js';
import { createSaveStore } from '../dist/js/saves.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Mounted production-handler checks. Synthetic affordability and a migrated
// historical fixture are controlled QA inputs, not earned-play balance proof.
// This surface models handlers/focus/scroll bookkeeping, NOT browser layout.
// Run only in the serial heavy lane alongside the existing handler regressions.
const fixtures=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const base=E.migrateSave(fixtures.states.base);
function fresh(kind='work'){
 let s=structuredClone(base);s.hero.gold=1000;s.hero.hp=1;s.hero.maxHp=Math.max(100,s.hero.maxHp);s.hero.potions=3;
 for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=30;
 const provider=settlementServices(s).find(r=>r.kind===kind&&(kind!=='merchant'||r.subjectId==='market'));assert.ok(provider,kind);
 for(const room of settlementWalkPath(s,provider.roomId))s=E.chooseAction(s,'atlas_room_'+room);
 assert.equal(s.event,null);assert.equal(s.battle,null);assert.ok(E.validateSave(s));return s;
}
async function open(t,s=fresh(),states=[s]){const ui=await mountApp(t,{states});await ui.click('title-continue');return ui;}
async function service(t,kind='work',state=fresh(kind)){
 const ui=await open(t,state),r=settlementServices(ui.current()).find(r=>r.kind===kind&&(kind!=='merchant'||r.subjectId==='market'));
 await ui.click('place-open');await ui.click('service-open',r.id);return {ui,r};
}
const control=ui=>ui.root.querySelector('[data-op="scene-return"]');
const savedBytes=ui=>ui.storage.getItem('hearth-and-oath:slots:v1');
function queuedFrames(){const callbacks=[];globalThis.requestAnimationFrame=callback=>{callbacks.push(callback);return callbacks.length;};return ()=>{for(let i=0;callbacks.length&&i<20;i++){for(const callback of callbacks.splice(0))callback();}assert.equal(callbacks.length,0);};}

test('work inquiry survives read-only Inventory ↔ Journal with exact person, focus, scroll and unchanged save',async t=>{
 const {ui,r}=await service(t);await ui.click('service-topic','commissions');
 const before=ui.current(),durable=savedBytes(ui);ui.root.querySelector('.workspace-body').scrollTop=137;ui.root.querySelector('.game-content').scrollTop=29;ui.root.querySelector('#meeting-speaker').focus();
 await ui.click('tab','inventory');assert.match(control(ui).textContent,new RegExp(r.name));
 await ui.click('inventory-category','materials');await ui.click('tab','journal');await ui.click('workspace-section','journal:archive');await ui.click('workspace-section','journal:notes');await ui.click('tab','inventory');
 assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);await ui.click('scene-return');
 assert.ok(ui.root.querySelector('.work-commission-meeting'));assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);assert.equal(ui.document.activeElement.id,'meeting-speaker');
 assert.equal(ui.root.querySelector('.workspace-body').scrollTop,137);assert.equal(ui.root.querySelector('.game-content').scrollTop,29);assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);assert.equal(control(ui),null);
 const workspace=JSON.parse(ui.storage.getItem('hearth-and-oath:workspace:'+before.seed+':'+before.dynasty.generation));assert.equal(workspace.sceneReturn,undefined);assert.equal(workspace.workspaceReturn,null);
});

test('the last in-scene focus is remembered when the clicked utility tab owns focus',async t=>{
 const {ui}=await service(t);const topic=ui.root.querySelector('[data-op="service-topic"][data-id="commissions"]');await ui.fire('focusin',topic);
 const tab=ui.root.querySelector('[data-op="tab"][data-id="inventory"]');tab.focus();await ui.click('tab','inventory');await ui.click('scene-return');
 assert.equal(ui.document.activeElement.dataset.op,'service-topic');assert.equal(ui.document.activeElement.dataset.id,'commissions');
});

test('an actual nearby person returns without opening a conversation or repeating a meeting',async t=>{
 const {ui,r}=await service(t,'smith');assert.ok(nearbyContacts(ui.current()).some(p=>p.id===r.personId));await ui.click('spatial-contact',r.personId);
 const before=ui.current(),durable=savedBytes(ui);ui.root.querySelector('.dialogue-speaker h2').focus();await ui.click('tab','journal');assert.ok(control(ui));await ui.click('scene-return');
 assert.equal(ui.root.querySelector('[data-contact-id]').dataset.contactId,r.personId);assert.equal(ui.document.activeElement.textContent,r.name);assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);assert.equal(ui.current().conversations.pending,null);
});

test('an actual outdoor mentor returns to the same trail scene without a second meeting or save mutation',async t=>{
 // Canonical migration places this controlled historical fixture at the named
 // forest site. No invented room or renamed participant makes it returnable.
 const input=structuredClone(base);input.locationId='forest';input.hero.hp=1;input.hero.potions=3;delete input.cartography;
 const s=E.migrateSave(input);assert.ok(s);assert.ok(E.validateSave(s));assert.equal(s.cartography.interior,null);
 const ui=await open(t,s);await ui.click('place-open');
 const r=settlementServices(ui.current()).find(r=>r.id==='mentor-druid'&&r.here);assert.ok(r);assert.equal(r.roomId,'trail');assert.equal(r.person.locationId,'forest');assert.equal(r.person.npcSlot.classId,'druid');
 await ui.click('service-open',r.id);assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);
 const before=ui.current(),durable=savedBytes(ui);ui.root.querySelector('#meeting-speaker').focus();
 await ui.click('tab','inventory');assert.match(control(ui).textContent,new RegExp(r.name));await ui.click('tab','journal');await ui.click('scene-return');
 assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);assert.equal(ui.document.activeElement.id,'meeting-speaker');assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);assert.equal(ui.current().cartography.interior,null);
 // Apply a real same-day action while the trail is still active, rather than
 // consuming Return first and merely asserting that it remains absent.
 await ui.click('tab','inventory');const stale=control(ui);assert.ok(stale);
 await ui.click('inventory-item','supply:potions');assert.ok(control(ui));await ui.click('use-consumable','potions');
 const after=ui.current();assert.equal(after.day,before.day);assert.equal(after.hero.potions,before.hero.potions-1);assert.equal(control(ui),null);await ui.fire('click',stale);assert.deepEqual(ui.current(),after);assert.equal(ui.root.querySelector('[data-service-person]'),null);
});

for(const route of ['life','activities','relationships','map'])test(route+' is unrelated navigation and does not carry a stale origin back into Inventory',async t=>{
 const {ui}=await service(t);await ui.click('tab','inventory');assert.ok(control(ui));await ui.click('tab',route);await ui.click('tab','journal');assert.equal(control(ui),null);
});

test('an ordinary room and relationship records cannot invent a returnable service',async t=>{
 const ui=await open(t);await ui.click('place-open');await ui.click('tab','inventory');assert.equal(control(ui),null);await ui.click('tab','relationships');await ui.click('tab','journal');assert.equal(control(ui),null);
});

test('explicit close clears the scene and a detached Return control cannot reopen it',async t=>{
 const {ui}=await service(t);await ui.click('tab','inventory');const stale=control(ui),before=ui.current();await ui.click('scene-return');await ui.click('service-close');await ui.fire('click',stale);assert.equal(ui.root.querySelector('[data-service-person]'),null);
 await ui.click('tab','inventory');assert.equal(control(ui),null);assert.deepEqual(ui.current(),before);
});

test('using a potion invalidates the trail even though the day and location do not change',async t=>{
 const {ui}=await service(t);await ui.click('tab','inventory');const stale=control(ui),before=ui.current();await ui.click('inventory-item','supply:potions');assert.ok(control(ui));await ui.click('use-consumable','potions');
 const after=ui.current();assert.equal(after.day,before.day);assert.equal(after.locationId,before.locationId);assert.equal(after.hero.potions,before.hero.potions-1);assert.equal(control(ui),null);await ui.fire('click',stale);assert.deepEqual(ui.current(),after);assert.equal(ui.root.querySelector('[data-service-person]'),null);
});

test('equipping gear invalidates the trail without changing the day',async t=>{
 const s=fresh();s.equipment.owned=[...new Set([...s.equipment.owned,'scholar_hood'])];s.equipment.equipped.head=null;
 const {ui}=await service(t,'work',s);await ui.click('tab','inventory');const before=ui.current();await ui.click('inventory-item','gear:scholar_hood');await ui.click('equip','scholar_hood');
 assert.equal(ui.current().day,before.day);assert.equal(ui.current().equipment.equipped.head,'scholar_hood');assert.equal(control(ui),null);
});

test('saving a personal Journal note invalidates a read-only trail',async t=>{
 const {ui}=await service(t);await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');assert.ok(control(ui));
 const form=ui.root.querySelector('#player-note');assert.ok(form);form.querySelector('[name="note"]').value='Remember the actual work steward.';await ui.fire('submit',form);
 assert.equal(control(ui),null);assert.ok(ui.current().playerNotes.some(row=>row.text==='Remember the actual work steward.'));
});

for(const kind of ['materials','merchant','inn'])test(kind+' returns to a fresh empty counter; old confirmation and Back never trade',async t=>{
 const {ui,r}=await service(t,kind);await ui.click(kind==='inn'?'inn-browse':'shop-browse');const vendor=kind==='merchant'?'market':kind;
 const row=tradeInventory(ui.current(),vendor).buy.find(row=>!row.disabledReason&&row.quantity>0);assert.ok(row);await ui.click('shop-item','buy:'+row.id);await ui.click('shop-add','buy:'+row.id);
 const oldConfirm=ui.root.querySelector('[data-op="shop-confirm"]');assert.equal(oldConfirm.disabled,false);oldConfirm.focus();const before=ui.current(),durable=savedBytes(ui);
 await ui.click('tab','inventory');await ui.click('tab','journal');assert.match(ui.root.querySelector('.scene-return').textContent,/cleared/);await ui.click('scene-return');
 assert.match(ui.root.querySelector('#trade-heading').textContent,new RegExp(r.name));assert.equal(ui.document.activeElement.id,'trade-heading');assert.equal(ui.root.querySelector('[data-op="shop-confirm"]').disabled,true);assert.equal(ui.root.querySelectorAll('.trade-offer-row').length,0);assert.equal(ui.root.querySelector('#trade-item-heading'),null);
 await ui.fire('click',oldConfirm);await ui.click('shop-conversation');assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);assert.ok(ui.root.querySelector('[data-service-person]'));await ui.click('service-close');assert.deepEqual(ui.current(),before);
});

test('a workbench returns without its selected recipe, quote, purchase or craft',async t=>{
 const {ui,r}=await service(t,'smith');await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');const oldConfirm=ui.root.querySelector('[data-op="craft-confirm"]');assert.equal(oldConfirm.disabled,false);oldConfirm.focus();
 const before=ui.current(),durable=savedBytes(ui);ui.root.querySelector('.trade-item-grid').scrollTop=63;await ui.click('tab','inventory');assert.match(control(ui).textContent,/workbench/);await ui.click('scene-return');
 assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);assert.equal(ui.document.activeElement.id,'craft-heading');assert.equal(ui.root.querySelector('.trade-item-grid').scrollTop,63);assert.equal(ui.root.querySelector('[data-op="craft-confirm"]'),null);assert.equal(ui.root.querySelector('#craft-item-heading'),null);
 await ui.fire('click',oldConfirm);await ui.click('craft-conversation');await ui.click('service-close');assert.deepEqual(ui.current(),before);assert.equal(savedBytes(ui),durable);
});

test('a pending mandatory reply wins over the optional source trail',async t=>{
 let s=fresh('smith');const person=nearbyContacts(s).find(p=>E.getActions(s).some(a=>a.id==='talk_'+p.id&&!a.disabledReason));assert.ok(person);s=E.chooseAction(s,'talk_'+person.id);assert.ok(s.conversations.pending);
 const ui=await open(t,s),before=ui.current();await ui.click('tab','inventory');assert.equal(control(ui),null);assert.ok(ui.root.querySelector('[data-op="show-contact"]'));await ui.click('tab','journal');assert.equal(control(ui),null);assert.deepEqual(ui.current(),before);
});

test('a mandatory event stays in charge of utility browsing',async t=>{
 const s=E.migrateSave(fixtures.states.road);assert.ok(s.event);const ui=await open(t,s);await ui.click('tab','inventory');assert.equal(control(ui),null);assert.ok(ui.root.querySelector('[data-op="workspace-open"][data-id="life:present"]'));await ui.click('tab','journal');assert.equal(control(ui),null);assert.deepEqual(ui.current(),s);
});

test('slot/title/reload does not persist the transient trail, including duplicate-seed lives',async t=>{
 const s=fresh(),other=structuredClone(s);
 // Deliberately keep the same seed AND hero identity. Renaming only hero.name
 // breaks the active lineage identity and makes the neighboring slot invalid.
 assert.equal(other.seed,s.seed);assert.equal(other.hero.name,s.hero.name);assert.ok(E.validateSave(s));assert.ok(E.validateSave(other));assert.notEqual(other,s);assert.notEqual(other.hero,s.hero);assert.deepEqual(other,s);
 const ui=await open(t,s,[s,other]);assert.deepEqual(ui.lives(),[s,other,null]);await ui.click('place-open');await ui.click('service-open',settlementServices(s).find(r=>r.kind==='work').id);
 const first=ui.current();await ui.click('tab','inventory');assert.ok(control(ui));
 async function loadVisibleSlot(id){
  // Use the actual cross-size route: header Menu, its Main menu command,
  // title Load life, then the enabled card on the real saved-lives screen.
  await ui.click('menu','header');const mainMenu=ui.root.querySelector('.menu-drawer [data-op="title-menu"]');assert.ok(mainMenu);await ui.fire('click',mainMenu);assert.ok(ui.root.querySelector('.title-screen'));
  await ui.click('title-load');assert.ok(ui.root.querySelector('.save-slots-screen'));
  const slot=ui.root.querySelector('.save-slot[data-op="slot-load"][data-id="'+id+'"]');assert.ok(slot,'the requested saved-life card is present');assert.equal(slot.disabled,false,'the requested life is valid and returnable');await ui.fire('click',slot);
  assert.equal(JSON.parse(savedBytes(ui)).activeSlot,id);assert.equal(control(ui),null);
 }
 await loadVisibleSlot(1);assert.deepEqual(ui.current(),other);assert.deepEqual(ui.lives(),[first,other,null]);await ui.click('tab','journal');assert.equal(control(ui),null);
 await loadVisibleSlot(0);assert.deepEqual(ui.current(),first);assert.deepEqual(ui.lives(),[first,other,null]);const freshQuestSource=!!ui.root.querySelector('.journal-categories');await ui.click('tab','inventory');assert.equal(Boolean(control(ui)),freshQuestSource);if(freshQuestSource)assert.match(control(ui).textContent,/your quest journal/);
});

test('a cross-tab changed-slot conflict removes the trail and cannot be bypassed by old Return',async t=>{
 const {ui}=await service(t);await ui.click('tab','inventory');const stale=control(ui),before=ui.current(),remote=E.chooseAction(before,'leisure_walk');assert.ok(createSaveStore(ui.storage,E.migrateSave).write(0,remote));
 await ui.windowEvent('storage',{key:'hearth-and-oath:slots:v1'});await Promise.resolve();assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.equal(control(ui),null);await ui.fire('click',stale);assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));await ui.key('Escape');assert.equal(control(ui),null);assert.deepEqual(ui.current(),remote);
});

test('a newer modal suppresses queued scene-focus restoration',async t=>{
 const {ui}=await service(t);await ui.click('tab','inventory');const flush=queuedFrames();await ui.click('scene-return');await ui.click('menu','header');await Promise.resolve();flush();assert.ok(ui.document.activeElement.closest('.modal'));
});

test('newer utility navigation suppresses queued scene-focus restoration',async t=>{
 const {ui}=await service(t,'smith');await ui.click('craft-browse');await ui.click('tab','inventory');const flush=queuedFrames();await ui.click('scene-return');await ui.click('tab','journal');flush();assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'),'Journal');assert.notEqual(ui.document.activeElement.id,'craft-heading');
});
