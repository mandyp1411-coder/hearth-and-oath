import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { firstDayGuideView } from '../dist/js/first-day-guide.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { serviceMeetingOffers } from '../dist/js/world-services-ui.js';
import { imprison } from '../dist/js/justice.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { uiSoundProbe } from './helpers/ui-sound-probe.mjs';
import { getAudioSettings, setMusicEnabled } from '../dist/js/audio.js';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Semantic/engine integration only. Run in the serialized verification lane.
// Existing captured lives avoid generating decades of synthetic past actions.
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v4.json', import.meta.url))).states;
const recorded = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states;
function valid(s) { assert.ok(E.validateSave(s)); return s; }
function fixture(raw = recorded.base, guide = true) {
  const s = E.migrateSave(structuredClone(raw)); assert.ok(s);
  if (guide) s.hero.firstDayGuide = { version: 1, dismissed: false }; else delete s.hero.firstDayGuide;
  return valid(s);
}
async function open(t, s) { const ui = await mountApp(t, {rulebooks:'both',  states: [s] }); await ui.click('title-continue'); return ui; }
const guide = ui => ui.root.querySelector('.first-day-guide');
const readers = { actions: E.getActions, unlocks: E.getAgeUnlocks, services: settlementServices, walkPath: settlementWalkPath, offers: serviceMeetingOffers, commitment: E.getLifeCommitment, ageControl: () => ({}) };
const view = s => firstDayGuideView(s, readers);

test('fresh creation initializes the optional marker and validation rejects malformed metadata', () => {
  const s = E.createBirthGame({ seed: 'first-day-guide-creation' }); assert.deepEqual(s.hero.firstDayGuide, { version: 1, dismissed: false }); valid(s);
  for (const marker of [null, { version: 2, dismissed: false }, { version: 1, dismissed: 'false' }, { version: 1, dismissed: false, unrelated: true }]) { const broken = structuredClone(s); broken.hero.firstDayGuide = marker; assert.equal(E.validateSave(broken), false); }
  const old = structuredClone(s); delete old.hero.firstDayGuide; valid(old); const migrated = E.migrateSave(old); assert.ok(migrated); assert.equal(migrated.hero.firstDayGuide, undefined);
});

test('new metadata shows one optional guide; legacy loads remain unchanged and quiet', async t => {
  const s = fixture(), ui = await open(t, s); assert.ok(guide(ui)); assert.equal(ui.root.querySelectorAll('.first-day-guide').length, 1); assert.deepEqual(ui.current(), s);
  assert.equal(ui.root.querySelectorAll('[data-save-health]').length, 1); assert.equal(guide(ui).querySelector('[aria-live]'), null);
  await ui.click('workspace-section', 'life:years'); assert.equal(guide(ui), null); await ui.click('workspace-section', 'life:present'); assert.ok(guide(ui));
});

test('legacy help can reopen the guide without changing the life or its pending choice', async t => {
  const s = fixture(legacy.birth0, false), ui = await open(t, s); assert.equal(guide(ui), null);
  await ui.click('menu'); await ui.click('help'); await ui.click('footing-open');
  assert.ok(guide(ui)); assert.equal(ui.document.activeElement.id, 'first-day-guide-heading'); assert.equal(ui.document.activeElement.isConnected, true); assert.deepEqual(ui.current(), s);
});

test('dismissal survives the actual store reload and changes only this life marker', async t => {
  const s = fixture(), ui = await open(t, s); await ui.click('footing-dismiss');
  const expected = structuredClone(s); expected.hero.firstDayGuide.dismissed = true;
  assert.deepEqual(ui.current(), expected); assert.equal(guide(ui), null); assert.equal(ui.document.activeElement.isConnected, true);
  await ui.click('menu'); await ui.click('title-menu'); await ui.click('title-continue'); assert.equal(guide(ui), null); assert.deepEqual(ui.current(), expected);
  await ui.click('menu'); await ui.click('help'); await ui.click('footing-open'); assert.ok(guide(ui)); assert.deepEqual(ui.current(), expected);
});

test('actual provider previews preserve every source record through repeated room projection', () => {
  for (const raw of [recorded.base, legacy.schoolPending]) {
    let s = fixture(raw);
    for (let n = 0; s.event && n < 8; n++) s = E.chooseEventOption(s, s.event.choices.find(c => !c.disabledReason).id);
    valid(s); assert.equal(s.event, null); const before = JSON.stringify(s);
    for (let n = 0; n < 5; n++) view(s);
    assert.equal(JSON.stringify(s), before, 'no NPC, roster, map, quest, RNG or pending record changes');
  }
});

test('guide action uses native Enter activation and exactly the existing engine transition once', async t => {
  const s = fixture(), next = view(s).steps.find(step => step.op === 'activity'); assert.ok(next);
  const ui = await open(t, s), trigger = ui.root.querySelector('[data-op="footing-step"][data-id="' + next.key + '"]'); assert.ok(trigger); trigger.focus();
  const before = ui.current(), expected = E.chooseAction(before, next.id); await ui.key('Enter'); assert.deepEqual(ui.current(), expected);
  await ui.fire('click', trigger); assert.deepEqual(ui.current(), expected, 'disconnected previous suggestion cannot replay');
});

test('guide provider visit walks actual rooms and opens the actual meeting without working or enrolling', async t => {
  const s = fixture(), next = view(s).steps.find(step => step.op === 'activity-visit'); assert.ok(next);
  const service = settlementServices(s).find(r => r.id === next.id); assert.ok(service);
  let expected = structuredClone(s); for (const room of settlementWalkPath(expected, service.roomId)) expected = E.chooseAction(expected, 'atlas_room_' + room);
  expected = E.visitService(expected, service.id);
  const ui = await open(t, s); await ui.click('footing-step', next.key); assert.deepEqual(ui.current(), expected);
  assert.ok(ui.root.querySelector('[data-service-person="' + service.personId + '"]')); assert.equal(ui.current().day, s.day); assert.equal(ui.current().hero.gold, s.hero.gold); assert.equal(ui.current().hero.profession, s.hero.profession);
});

for (const [name, raw, focus] of [
  ['infant waiting choice', legacy.birth0, '.story-scene h2'],
  ['battle commands', legacy.midbattle, '.battle-command-panel'],
  ['pending conversation', legacy.pendingConversation, '.dialogue-speaker h2'],
]) test(name + ' guide control focuses a real connected current surface without a simulation change', async t => {
  const s = fixture(raw), first = view(s).steps[0], ui = await open(t, s), before = ui.current();
  await ui.click('footing-step', first.key); assert.equal(ui.document.activeElement, ui.root.querySelector(focus)); assert.equal(ui.document.activeElement.isConnected, true); assert.deepEqual(ui.current(), before);
});

test('custody guidance focuses the existing prison heading and never serves time automatically', async t => {
  const s = fixture(); s.legal.incidents.push({ locationId: s.locationId, evidence: 3, description: 'Synthetic local witness used to exercise custody focus.' });
  assert.equal(imprison(s, { journal() {} }), true); valid(s); const first = view(s).steps[0], ui = await open(t, s), before = ui.current();
  await ui.click('footing-step', first.key); assert.equal(ui.document.activeElement, ui.root.querySelector('.chapter-heading h1')); assert.equal(ui.document.activeElement.isConnected, true); assert.deepEqual(ui.current(), before);
});

test('a real maze entrance focuses the actual room heading without taking a step or leaving', async t => {
  let s = fixture();
  for (const room of settlementWalkPath(s, 'market')) s = E.chooseAction(s, 'atlas_room_' + room);
  assert.ok(E.getActions(s).some(a => a.id === 'realm_ration' && !a.disabledReason)); s = E.chooseAction(s, 'realm_ration');
  for (let n = 0; s.event && n < 8; n++) s = E.chooseEventOption(s, s.event.choices.find(c => !c.disabledReason).id);
  s = E.chooseAction(s, 'adventure_descend'); assert.ok(s.maze); assert.equal(s.event, null); valid(s);
  const first = view(s).steps[0], ui = await open(t, s), before = ui.current();
  await ui.click('footing-step', first.key); assert.equal(ui.document.activeElement, ui.root.querySelector('.maze-current h2')); assert.equal(ui.document.activeElement.isConnected, true); assert.deepEqual(ui.current(), before);
});

test('an interrupted actual workshop keeps its project and focuses its existing continuation heading', async t => {
  let s = fixture(legacy.pendingProject);
  for (let n = 0; s.event && n < 8; n++) s = E.chooseEventOption(s, s.event.choices.find(c => !c.disabledReason).id);
  assert.ok(s.workshop.project); valid(s); const first = view(s).steps[0], ui = await open(t, s), before = ui.current();
  await ui.click('footing-step', first.key); assert.equal(ui.document.activeElement, ui.root.querySelector('.project-panel h2')); assert.equal(ui.document.activeElement.isConnected, true); assert.deepEqual(ui.current(), before);
});

test('the saving step opens the existing menu and leaves canonical health status authoritative', async t => {
  const s = fixture(), ui = await open(t, s), before = ui.current(); await ui.click('footing-step', 'saving');
  assert.ok(ui.root.querySelector('.menu-drawer [data-op="export"]')); assert.equal(ui.root.querySelector('.menu-drawer [data-op="export"]').textContent, 'Export life');
  assert.equal(guide(ui).querySelector('[data-save-health]'), null); assert.deepEqual(ui.current(), before);
});


test('same-seed independent slots do not share saved dismissal or manual reopening',async t=>{
  const first=fixture(),second=structuredClone(first),ui=await mountApp(t, {rulebooks:'both', states:[first,second]});await ui.click('title-continue');
  await ui.click('footing-dismiss');const dismissed=structuredClone(first);dismissed.hero.firstDayGuide.dismissed=true;assert.deepEqual(ui.lives(),[dismissed,second,null]);
  await ui.click('menu');await ui.click('help');await ui.click('footing-open');assert.ok(guide(ui));
  await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load','1');assert.ok(guide(ui));assert.deepEqual(ui.current(),second);
  await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load','0');assert.equal(guide(ui),null);assert.deepEqual(ui.current(),dismissed);
});

test('a quota-held guide dismissal changes only its marker and keeps the canonical latest-session escape',async t=>{
  const s=fixture(),ui=await open(t,s),before=ui.storage.getItem('hearth-and-oath:slots:v1'),write=ui.storage.setItem;
  ui.storage.setItem=(key,value)=>{if(['hearth-and-oath:slots:v1','hearth-and-oath:life:v1'].includes(key))throw Error('Quota');write(key,value);};
  await ui.click('footing-dismiss');assert.equal(guide(ui),null);assert.equal(ui.storage.getItem('hearth-and-oath:slots:v1'),before);
  const expected=structuredClone(s);expected.hero.firstDayGuide.dismissed=true;
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;let exported;URL.createObjectURL=blob=>{exported=blob;return 'blob:guide-dismissal';};URL.revokeObjectURL=()=>{};ui.document.createElement=()=>({click(){}});t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});
  const health=ui.root.querySelector('[data-save-health]');assert.equal(health.querySelector('[data-save-label]').textContent,'Not saved — export needed');assert.equal(health.querySelector('[data-op="export-session"]').hidden,false);
  await ui.click('export-session','0');assert.deepEqual(JSON.parse(await exported.text()),expected);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);assert.equal(ui.storage.getItem('hearth-and-oath:slots:v1'),before);
});


function feedbackMessages(node){let value=node.textContent;const messages=[];Object.defineProperty(node,'textContent',{configurable:true,get:()=>value,set(next){value=next;if(next)messages.push(next);}});return messages;}
for(const quota of [false,true])for(const queued of [false,true])test(`guide dismissal reports only its UI outcome, never the prior reward (${quota?'quota-held':'durable'}, ${queued?'queued':'immediate'} frames)`,async t=>{
  // A controlled prior-result string, not a newly awarded reward or invented
  // engine action. The whole validated state below must remain marker-only.
  const s=fixture();s.notice='A prior cargo agreement awarded 20 Gold and one rank once.';valid(s);const ui=await open(t,s),messages=feedbackMessages(ui.viewStatus),toasts=feedbackMessages(ui.toast),disk=ui.storage.getItem('hearth-and-oath:slots:v1');
  const frames=[];if(queued)globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
  if(quota){const write=ui.storage.setItem;ui.storage.setItem=(key,value)=>{if(['hearth-and-oath:slots:v1','hearth-and-oath:life:v1'].includes(key))throw Error('Quota');write(key,value);};}
  const trigger=ui.root.querySelector('[data-op="footing-dismiss"]');trigger.focus();await ui.key('Enter');
  for(let n=0;frames.length&&n<20;n++)for(const callback of frames.splice(0))callback();assert.equal(frames.length,0);
  assert.deepEqual(messages,[],'the previous reward is never newly published to the outcome announcer');assert.deepEqual(toasts,['Guide hidden.'],'one actual nonpersisted UI outcome');assert.equal(guide(ui),null);assert.equal(ui.document.activeElement.isConnected,true);
  await ui.fire('click',trigger);assert.deepEqual(messages,[]);assert.deepEqual(toasts,['Guide hidden.'],'detached old control cannot repeat feedback');
  const expected=structuredClone(s);expected.hero.firstDayGuide.dismissed=true;
  if(quota){assert.equal(ui.storage.getItem('hearth-and-oath:slots:v1'),disk);assert.deepEqual(ui.current(),s);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);assert.match(ui.root.querySelector('[data-save-label]').textContent,/Not saved/);}
  else{assert.deepEqual(ui.current(),expected);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);}
  const create=URL.createObjectURL,revoke=URL.revokeObjectURL;let exported;URL.createObjectURL=blob=>{exported=blob;return 'blob:guide-feedback';};URL.revokeObjectURL=()=>{};ui.document.createElement=()=>({click(){}});t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});
  if(quota)await ui.click('export-session','0');else{await ui.click('menu');await ui.click('export');}
  assert.deepEqual(JSON.parse(await exported.text()),expected,'latest exported position changes only the guide marker, not notice, Journal, rewards or resources');
});

for(const queued of [false,true])test(`reopened already-dismissed guide closes without saving or an error sound (${queued?'queued':'immediate'} frames)`,async t=>{
  const s=fixture();s.hero.firstDayGuide.dismissed=true;s.notice='A prior cargo agreement awarded 20 Gold and one rank once.';valid(s);
  const ui=await open(t,s),settings=getAudioSettings(),probe=uiSoundProbe(),originals=new Map();setMusicEnabled(false);
  for(const [key,value] of Object.entries({AudioContext:probe.AudioContext,navigator:{userActivation:{isActive:true}}})){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
  t.after(()=>{probe.close();setMusicEnabled(settings.musicEnabled);for(const [key,descriptor]of originals)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  for(let repeat=0;repeat<2;repeat++){
    await ui.click('menu');await ui.click('help');await ui.click('footing-open');assert.ok(guide(ui));
    const messages=feedbackMessages(ui.viewStatus),toasts=feedbackMessages(ui.toast),bytes=[ui.storage.getItem('hearth-and-oath:slots:v1'),ui.storage.getItem('hearth-and-oath:life:v1')],writes=[],write=ui.storage.setItem;
    ui.storage.setItem=(key,value)=>{writes.push(key);write(key,value);};const tones=probe.tones.length;probe.advance();
    const frames=[];if(queued)globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
    const trigger=ui.root.querySelector('[data-op="footing-dismiss"]');trigger.focus();await ui.key('Enter');for(let n=0;frames.length&&n<20;n++)for(const callback of frames.splice(0))callback();
    assert.equal(frames.length,0);assert.equal(guide(ui),null);assert.deepEqual(messages,[]);assert.deepEqual(toasts,['Guide hidden.']);assert.deepEqual(writes,[],'UI-only close makes no additional browser write');assert.deepEqual(probe.tones.slice(tones),[220,660],'real audio.js schedules only the ordinary UI click, not error or gameplay-action tones');
    assert.deepEqual([ui.storage.getItem('hearth-and-oath:slots:v1'),ui.storage.getItem('hearth-and-oath:life:v1')],bytes);assert.deepEqual(ui.current(),s);assert.equal(ui.document.activeElement.isConnected,true);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false);
    await ui.fire('click',trigger);assert.deepEqual(toasts,['Guide hidden.']);assert.deepEqual(writes,[]);ui.storage.setItem=write;
    if(queued)globalThis.requestAnimationFrame=callback=>{callback();return 1;};
  }
});
