import {decisionLife} from './helpers/decision-life.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as settle } from 'node:timers/promises';
import { createSaveStore } from '../dist/js/saves.js';
import { createBirthGame, chooseEventOption, migrateSave } from '../dist/js/engine.js';
import { mountApp } from './helpers/ui-surface.mjs';
const KEY='hearth-and-oath:slots:v1',STAMP='2026-10-12T00:00:00.000Z';
let original;const fixture=()=>structuredClone(original||=decisionLife());
const status=(ui,slot=0)=>ui.root.querySelector(`[data-save-health][data-save-slot="${slot}"]`);
const label=(ui,slot=0)=>status(ui,slot)?.querySelector('[data-save-label]').textContent;
function capture(t,ui,{fail=false}={}){
  const blobs=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{if(fail)throw Error('Download unavailable');blobs.push(blob);return 'blob:save-health-test';};URL.revokeObjectURL=()=>{};
  ui.document.createElement=()=>({click(){}});t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});return blobs;
}
function blockWrites(ui){const write=ui.storage.setItem;ui.storage.setItem=(key,value)=>{if([KEY,'hearth-and-oath:life:v1'].includes(key))throw Error('Quota');write(key,value);};return ()=>{ui.storage.setItem=write;};}

test('empty title makes no saved claim or exit prompt; title and slots show real known save time',async t=>{
  const ui=await mountApp(t);assert.equal(label(ui),'No life saved yet');assert.equal(status(ui).querySelector('[data-op="export-session"]').hidden,true);
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
});

test('title with an empty active slot shows the actual recent life, then each saved slot has its own health',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[null,before],activeSlot:0});assert.equal(label(ui,1),'Saved in this browser');assert.equal(status(ui,1).dataset.saveAt,STAMP);
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
  await ui.click('title-load');assert.equal(label(ui,1),'Saved in this browser');assert.equal(status(ui,0),null,'an empty row never claims a successful save');
  assert.match(status(ui,1).getAttribute('aria-label'),/slot 2/);
});

test('quota-held exact latest session exports directly from game, title and slot list without claiming durable success',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[before]});await ui.click('title-continue');assert.equal(label(ui),'Saved in this browser');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
  const restore=blockWrites(ui),expected=chooseEventOption(before,before.event.choices[0].id),blobs=capture(t,ui),durable=ui.storage.getItem(KEY);
  await ui.click('choice',before.event.choices[0].id);assert.equal(label(ui),'Not saved — export needed');assert.equal(status(ui).dataset.saveAt,STAMP);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
  const escape=status(ui).querySelector('[data-op="export-session"]');assert.equal(escape.hidden,false);assert.equal(escape.getAttribute('aria-label'),'Export latest session from slot 1');
  await ui.click('export-session','0');assert.deepEqual(JSON.parse(await blobs[0].text()),expected);assert.ok(ui.toast.textContent.includes('Download started: hearth-and-oath-'+expected.hero.name.replace(/[^a-z0-9_-]/gi,'-')+'.json'));assert.match(ui.toast.textContent,/Browser save status is unchanged/);
  assert.equal(label(ui),'Not saved — export needed');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);assert.equal(ui.storage.getItem(KEY),durable);
  await ui.click('title-menu');assert.ok(ui.root.querySelector('.title-screen'));assert.equal(label(ui),'Not saved — export needed');await ui.click('export-session','0');assert.deepEqual(JSON.parse(await blobs[1].text()),expected);
  await ui.click('title-load');assert.ok(ui.root.querySelector('.save-slots-screen'));assert.equal(label(ui),'Not saved — export needed');await ui.click('export-session','0');assert.deepEqual(JSON.parse(await blobs[2].text()),expected);
  restore();await ui.click('slot-load','0');assert.equal(label(ui),'Saved in this browser');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);assert.deepEqual(ui.current(),expected);
});

test('same-slot conflict keeps direct export after dismissal and only explicit reload clears unsaved choices',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[before]});await ui.click('title-continue');const remote=chooseEventOption(before,before.event.choices[0].id),expected=chooseEventOption(before,before.event.choices[1].id),blobs=capture(t,ui);
  assert.ok(createSaveStore(ui.storage,migrateSave).write(0,remote));const durable=ui.storage.getItem(KEY);await ui.click('choice',before.event.choices[1].id);await ui.key('Escape');
  assert.equal(label(ui),'Not saved — export needed');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);await ui.click('export-session','0');assert.deepEqual(JSON.parse(await blobs[0].text()),expected);assert.equal(ui.storage.getItem(KEY),durable);
  await ui.click('review-save-conflict');await ui.click('reload-conflicted-life');assert.equal(label(ui),'Saved in this browser');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);assert.deepEqual(ui.current(),remote);
});

test('a storage-event stale copy is distinct from new choices and does not nag on exit',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[before]});await ui.click('title-continue');assert.ok(createSaveStore(ui.storage,migrateSave).write(0,chooseEventOption(before,before.event.choices[0].id)));
  await ui.windowEvent('storage',{key:KEY});await ui.key('Escape');assert.equal(label(ui),'Saved copy changed in another tab');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
});

test('download failure leaves the exact session held and its save warning intact',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[before]});await ui.click('title-continue');blockWrites(ui);await ui.click('choice',before.event.choices[0].id);capture(t,ui,{fail:true});
  await ui.click('export-session','0');assert.match(ui.toast.textContent,/could not be downloaded/);assert.equal(label(ui),'Not saved — export needed');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
});

function locks(){let held=false;const gates=[];return {hold(){held=true;},release(){held=false;for(const resolve of gates.splice(0))resolve();},async request(name,options,operation){if(held)await new Promise(resolve=>gates.push(resolve));return operation();}};}
test('a held coordinated live write prompts before unload, then quietly updates status in place after it commits',async t=>{
  const before=fixture(),lock=locks(),mounting=mountApp(t,{states:[before]});window.navigator={locks:lock};const ui=await mounting;await ui.click('title-continue');await settle();assert.equal(label(ui),'Saved in this browser');
  lock.hold();await ui.click('choice',before.event.choices[0].id);const host=status(ui),choice=ui.root.querySelector('[data-op="age-up"]');assert.equal(label(ui),'Saving in this browser…');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
  lock.release();await settle();assert.equal(status(ui),host,'async save status changes do not replace the rendered subtree');assert.equal(label(ui),'Saved in this browser');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);if(choice)assert.equal(choice.isConnected,true);
});

test('a failed lock request before store.write still leaves the queued live choices exportable and unload-protected',async t=>{
  const before=fixture();let denied=false;const lock={async request(name,options,operation){if(denied)throw Error('Lock request failed');return operation();}};
  const mounting=mountApp(t,{states:[before]});window.navigator={locks:lock};const ui=await mounting;await ui.click('title-continue');await settle();const durable=ui.storage.getItem(KEY),expected=chooseEventOption(before,before.event.choices[0].id),blobs=capture(t,ui);
  denied=true;await ui.click('choice',before.event.choices[0].id);await settle();assert.equal(label(ui),'Not saved — export needed');assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);assert.equal(ui.storage.getItem(KEY),durable);
  await ui.click('export-session','0');assert.deepEqual(JSON.parse(await blobs[0].text()),expected);
});

test('an unavailable initial storage surface does not pretend unreadable saved lives are absent or offer an empty export',async t=>{
  const mounting=mountApp(t);Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage access denied');}});const ui=await mounting;
  assert.equal(label(ui),'Browser saves unavailable');assert.match(status(ui).querySelector('[data-save-problem]').textContent,/storage is unavailable/);assert.equal(status(ui).querySelector('[data-op="export-session"]').hidden,true);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
});

test('unchanged Main menu autosave after storage denial keeps its last known time and offers export without a false saved claim',async t=>{
  const before=fixture(),ui=await mountApp(t,{states:[before]});await ui.click('title-continue');const stamp=status(ui).dataset.saveAt;
  const read=ui.storage.getItem;ui.storage.getItem=key=>{if([KEY,'hearth-and-oath:life:v1'].includes(key))throw Error('Storage access denied');return read(key);};
  await ui.click('title-menu');assert.ok(ui.root.querySelector('.title-screen'));
  assert.equal(label(ui),'Browser saves unavailable');assert.equal(status(ui).dataset.saveAt,stamp);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
  assert.match(status(ui).querySelector('[data-save-problem]').textContent,/storage is unavailable/);assert.equal(status(ui).querySelector('[data-op="export-session"]').hidden,false);
});
