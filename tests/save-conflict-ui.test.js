import {decisionLife} from './helpers/decision-life.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore } from '../dist/js/saves.js';
import { createBirthGame, chooseEventOption, migrateSave } from '../dist/js/engine.js';
import { setImmediate as settle } from 'node:timers/promises';
import { mountApp } from './helpers/ui-surface.mjs';
const key='hearth-and-oath:slots:v1';
let original;
function fixture(){original ||= decisionLife();return structuredClone(original);}
const named=new Map();
function renamed(name){if(!named.has(name))named.set(name,createBirthGame({name,seed:'handler-'+name}));return structuredClone(named.get(name));}
function captureExports(t, surface) {
  const blobs=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:save-conflict-test';};URL.revokeObjectURL=()=>{};
  surface.document.createElement=()=>({click(){}});t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});return blobs;
}

test('a conflicting autosave offers export and explicit reload while Escape preserves the unsaved session', async t=>{
  const before=fixture(),neighbor=renamed('Alder'),ui=await mountApp(t, {states:[before,neighbor]});await ui.click('title-continue');
  assert.ok(before.event.choices.length>1);
  const remote=chooseEventOption(before,before.event.choices[0].id),local=chooseEventOption(before,before.event.choices[1].id);
  assert.ok(createSaveStore(ui.storage,migrateSave).write(0,remote));const durable=ui.storage.getItem(key),exports=captureExports(t,ui);
  await ui.click('choice',before.event.choices[1].id);
  assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.match(ui.root.innerHTML,/has not overwritten/);
  assert.doesNotMatch(ui.root.innerHTML,/Browser storage is unavailable/);
  assert.equal(ui.storage.getItem(key),durable);assert.deepEqual(ui.current(),remote);
  await ui.click('export');assert.deepEqual(JSON.parse(await exports[0].text()),local);
  await ui.key('Escape');assert.equal(ui.root.querySelector('[data-save-conflict-dialog]'),null);assert.match(ui.root.innerHTML,/Your session is not saved/);
  await ui.click('review-save-conflict');await ui.click('reload-conflicted-life');
  assert.equal(ui.root.querySelector('[data-save-conflict-dialog]'),null);assert.doesNotMatch(ui.root.innerHTML,/Saving is paused/);
  assert.deepEqual(ui.current(),remote);assert.deepEqual(ui.lives()[1],neighbor);
});

test('a life deleted elsewhere stays deleted after a stale turn, cancellation, and explicit saved-list reload',async t=>{
  const before=fixture(),neighbor=renamed('Survivor'),ui=await mountApp(t, {states:[before,neighbor]});await ui.click('title-continue');
  const other=createSaveStore(ui.storage,migrateSave);assert.ok(other.remove(0,{reviewed:true,token:other.deletionToken(0)}));const durable=ui.storage.getItem(key);
  await ui.click('choice',before.event.choices[0].id);assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.match(ui.root.innerHTML,/slot was deleted/);
  await ui.key('Escape');assert.equal(ui.lives()[0],null);assert.equal(ui.storage.getItem(key),durable);
  await ui.click('review-save-conflict');await ui.click('reload-conflicted-life');
  assert.ok(ui.root.querySelector('.save-slots-screen'));assert.equal(ui.lives()[0],null);assert.deepEqual(ui.lives()[1],neighbor);
  await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current(),neighbor);
});

test('a reviewed import cannot replace a life created in the reviewed empty slot by another tab',async t=>{
  const before=fixture(),incoming=renamed('Imported'),remote=renamed('Created Elsewhere'),ui=await mountApp(t, {states:[before]});
  await ui.click('title-load');await ui.import(JSON.stringify(incoming));assert.ok(ui.root.querySelector('[data-op="confirm-import"]'));
  assert.ok(createSaveStore(ui.storage,migrateSave).write(1,remote));const durable=ui.storage.getItem(key);
  await ui.click('confirm-import');assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.match(ui.root.innerHTML,/import was not applied/);
  assert.equal(ui.storage.getItem(key),durable);assert.deepEqual(ui.lives()[1],remote);
  await ui.click('reload-conflicted-life');assert.ok(ui.root.querySelector('.save-slots-screen'));assert.deepEqual(ui.lives()[0],before);assert.deepEqual(ui.lives()[1],remote);
});

test('creating a life in a slot claimed elsewhere protects both the durable life and the exportable new session',async t=>{
  const before=fixture(),remote=renamed('Claimed Elsewhere'),ui=await mountApp(t, {states:[before]});
  await ui.click('title-new');await ui.click('slot-new','1');ui.set('startAge','0');ui.set('name','Unsaved Newborn');await ui.fire('input',ui.root.querySelector('[name="name"]'));
  assert.ok(createSaveStore(ui.storage,migrateSave).write(1,remote));const durable=ui.storage.getItem(key),exports=captureExports(t,ui);
  await ui.click('creator-step','2');assert.ok(ui.root.querySelector('[data-creator-review]'));await ui.submit();assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.equal(ui.storage.getItem(key),durable);
  await ui.click('export');const exported=JSON.parse(await exports[0].text());assert.equal(exported.hero.name,'Unsaved Newborn');assert.equal(exported.age,0);
  assert.deepEqual(ui.lives()[0],before);assert.deepEqual(ui.lives()[1],remote);
});

test('quota-held session survives title navigation without an implicit reload and unsupported locking has clear guidance',async t=>{
  const before=fixture(),ui=await mountApp(t, {states:[before]});await ui.click('title-continue');const write=ui.storage.setItem;
  ui.storage.setItem=(key,value)=>{if(key.startsWith('hearth-and-oath:slots:')||key==='hearth-and-oath:life:v1')throw Error('Quota');write(key,value);};
  const expected=chooseEventOption(before,before.event.choices[0].id),exports=captureExports(t,ui);
  await ui.click('choice',before.event.choices[0].id);assert.match(ui.root.innerHTML,/Browser storage is unavailable/);
  await ui.click('title-menu');await ui.click('title-continue');await ui.click('menu','header');await ui.click('export');
  assert.deepEqual(JSON.parse(await exports[0].text()),expected);assert.match(ui.root.innerHTML,/Keep only one game tab open/);
});

function heldLocks(){
  let blocked=false,pending=Promise.resolve();const gates=[];
  return {hold(){blocked=true;},release(){blocked=false;for(const resolve of gates.splice(0))resolve();},request(name,options,operation){const result=pending.then(async()=>{if(blocked)await new Promise(resolve=>gates.push(resolve));return operation();});pending=result.catch(()=>{});return result;}};
}
async function mountLocked(t,options){const locks=heldLocks(),mounting=mountApp(t, options);window.navigator={locks};return {ui:await mounting,locks};}

test('a queued normal Continue never clears a conflict discovered by an earlier pending autosave',async t=>{
  const before=fixture(),{ui,locks}=await mountLocked(t,{states:[before]});await ui.click('title-continue');await settle();
  const local=chooseEventOption(before,before.event.choices[1].id),remote=chooseEventOption(before,before.event.choices[0].id);
  const exports=captureExports(t,ui);locks.hold();await ui.click('choice',before.event.choices[1].id);await ui.click('title-menu');
  const continuing=ui.click('title-continue');await settle();
  assert.ok(createSaveStore(ui.storage,migrateSave).write(0,remote));const durable=ui.storage.getItem(key);
  locks.release();await continuing;await settle();
  assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.equal(ui.storage.getItem(key),durable);
  await ui.click('export');assert.deepEqual(JSON.parse(await exports[0].text()),local);assert.deepEqual(ui.current(),remote);
});

test('dismissing a confirmed import while it waits for the browser lock cancels the queued mutation',async t=>{
  const {ui,locks}=await mountLocked(t,{states:[fixture()]});await ui.click('title-load');await ui.import(JSON.stringify(renamed('Delayed Import')));
  const durable=ui.storage.getItem(key);locks.hold();const importing=ui.click('confirm-import');await settle();await ui.click('close-modal');
  locks.release();await importing;await settle();assert.equal(ui.storage.getItem(key),durable);assert.equal(ui.root.querySelector('.modal'),null);
  assert.ok(ui.root.querySelector('.save-slots-screen'));
});

test('dismissing a confirmed deletion while it waits for the browser lock cancels the queued mutation',async t=>{
  const {ui,locks}=await mountLocked(t,{states:[fixture()]});await ui.click('title-load');await ui.click('slot-delete','0');
  const durable=ui.storage.getItem(key);locks.hold();const deleting=ui.click('confirm-delete-life');await settle();await ui.key('Escape');
  locks.release();await deleting;await settle();assert.equal(ui.storage.getItem(key),durable);assert.equal(ui.root.querySelector('.delete-life-dialog'),null);
  assert.deepEqual(ui.lives()[0],fixture());
});

test('Keep this session open cancels an explicit conflict reload that is still waiting for the browser lock',async t=>{
  const before=fixture(),{ui,locks}=await mountLocked(t,{states:[before]});await ui.click('title-continue');await settle();
  const remote=chooseEventOption(before,before.event.choices[0].id),local=chooseEventOption(before,before.event.choices[1].id);
  assert.ok(createSaveStore(ui.storage,migrateSave).write(0,remote));await ui.click('choice',before.event.choices[1].id);await settle();
  assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));const exports=captureExports(t,ui),durable=ui.storage.getItem(key);
  locks.hold();const reloading=ui.click('reload-conflicted-life');await settle();await ui.click('close-modal');locks.release();await reloading;await settle();
  assert.match(ui.root.innerHTML,/Your session is not saved/);assert.equal(ui.storage.getItem(key),durable);
  await ui.click('menu','header');await ui.click('export');assert.deepEqual(JSON.parse(await exports[0].text()),local);
});

test('title-screen import commits only the reviewed slot and a later reviewed replacement retains its backup',async t=>{
  const before=fixture(),incoming=renamed('Title Import'),replacement=renamed('Title Replacement'),ui=await mountApp(t, {states:[before]});
  await ui.click('title-load');await ui.import(JSON.stringify(incoming));await ui.click('confirm-import');
  assert.ok(ui.root.querySelector('.game-frame'));assert.deepEqual(ui.current(),incoming);assert.deepEqual(ui.lives()[0],before);
  await ui.import(JSON.stringify(replacement));await ui.fire('change',ui.root.querySelector('[name="import-slot"][value="1"]'));await ui.click('confirm-import');
  assert.deepEqual(ui.current(),replacement);assert.deepEqual(ui.lives()[0],before);assert.deepEqual(createSaveStore(ui.storage,migrateSave).backup(1),incoming);
  await ui.click('menu','header');await ui.click('restore-backup','1');assert.match(ui.root.innerHTML,/REVIEW AN IMPORTED LIFE/);await ui.click('close-modal');assert.deepEqual(ui.current(),replacement);
});

test('malformed-envelope legacy recovery remains playable and retains the exact pending decision',async t=>{
  const before=fixture(),ui=await mountApp(t, {storageEntries:[[key,'{bad json'],['hearth-and-oath:life:v1',JSON.stringify(before)]]});
  assert.equal(ui.storage.getItem(key),'{bad json','opening the game does not rewrite recovery data');
  await ui.click('title-continue');assert.ok(ui.root.querySelector('.game-frame'));assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives()[0].event,before.event);
});
