import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { createIronmanMetadata, currentIronmanPerson, ironmanHeroDeath } from '../dist/js/ironman.js';
import { ironmanRecordKey, ironmanEndedKey, ironmanRecordToken } from '../dist/js/ironman-storage.js';
import { createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { getGearItem } from '../dist/js/gear.js';
import { fakeSurface, mountApp } from './helpers/ui-surface.mjs';
import { freshStory } from './helpers/story-life-fixtures.mjs';

// Source handler/store integration with bounded controlled fictional saves.
// No production observer, fabricated accepted outcome, browser/layout claim,
// earned recruitment claim, engine-command replay or hidden control injection.
const SLOT_KEY = 'hearth-and-oath-legacy:slots:v1';
const LOCK_NAME = 'hearth-and-oath-legacy:save:v1';
const RUN = '00112233-4455-4677-8899-aabbccddeeff';
const OTHER_RUN = '11223344-5566-4788-99aa-bbccddeeff00';
const copy = value => structuredClone(value);
const record = (ui, runId = RUN) => JSON.parse(ui.storage.getItem(ironmanRecordKey(runId)) || 'null');
const shared = ui => [ui.storage.getItem(SLOT_KEY), ui.storage.getItem(LEGACY_SAVE_KEY)];
const status = ui => ui.root.querySelector('[data-ironman-status]');
const phase = ui => status(ui)?.dataset.phase || (ui.root.querySelector('.game-frame') ? 'ready' : null);
const enabled = (ui, op, id) => ui.root.querySelectorAll(`[data-op="${op}"]`).find(node => !node.disabled && (id === undefined || String(node.dataset.id) === String(id)));
let cachedBirth, cachedAdult, cachedNeighbor, entropy = 0;
function valid(state, label) {
  assert.equal(E.validateSave(state), true, label);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(state))), state, label + ' migrates exactly');
  return state;
}
function birth() { return copy(cachedBirth ||= valid(E.createBirthGame({name:'Fictional Rowan',seed:'ironman-app-finite-rowan'}), 'birth fixture')); }
function adult() { return copy(cachedAdult ||= valid(freshStory(), 'published fictional adult fixture')); }
function ironman(source = birth(), runId = RUN) {
  source.ironman = createIronmanMetadata(source, { randomUUID: () => runId });
  return valid(source, 'explicit metadata-only opt in');
}
function locks() {
  let serial = Promise.resolve(), paused = false;
  const gates = [];
  return {
    requests: 0,
    hold() { paused = true; },
    release() { paused = false; gates.splice(0).forEach(resolve => resolve()); },
    request(name, options, callback) {
      assert.equal(name, LOCK_NAME); assert.equal(options.mode, 'exclusive');
      this.requests++;
      const result = serial.then(async () => {
        if (paused) await new Promise(resolve => gates.push(resolve));
        return callback({name,mode:'exclusive'});
      });
      serial = result.catch(() => {});
      return result;
    },
  };
}
function store(ui, manager) {
  return createSaveStore(ui.storage, E.migrateSave, {
    coordinate: createSaveCoordinator(manager),
    crypto: { randomUUID: () => '8899aabb-ccdd-4eef-8a11-' + (++entropy).toString(16).padStart(12,'0') },
  });
}
async function flush() { for (let i=0;i<8;i++) await nextTurn(); }
async function prepared(source = ironman(), { another = false } = {}) {
  const ui = fakeSurface(), manager = locks(), neighbor = copy(cachedNeighbor ||= valid(E.createBirthGame({name:'Fictional Standard Neighbor',seed:'ironman-app-finite-neighbor'}),'unrelated Standard fixture'));
  const envelope = {version:1,activeSlot:0,slots:[0,1,2].map(id => ({id,state:id===2?neighbor:null,updatedAt:id===2?'2026-10-18T00:00:00.000Z':null,revision:'fixture-slot-'+id})),backups:{0:{state:neighbor,updatedAt:'preserve-previous-life-backup'}}};
  ui.storage.setItem(SLOT_KEY,JSON.stringify(envelope));
  ui.storage.setItem(LEGACY_SAVE_KEY,JSON.stringify(neighbor));
  const authority = store(ui,manager);
  const admit = async (state,slot) => {
    const review = await authority.inspectIronman(state,{intent:'import',slot});
    assert.equal(review.status,'review','actual exclusive store reviews raw-empty target');
    const accepted = await authority.commitIronman(slot,state,{intent:'import',token:review.token});
    assert.equal(accepted.status,'committed','actual store accepts the controlled imported position');
  };
  await admit(source,0);
  if(another)await admit(ironman(adult(),OTHER_RUN),1);
  return {storageEntries:[...ui.values],manager,neighbor};
}
async function mountRun(t, source = ironman(), options = {}) {
  const seed = await prepared(source,options);
  const ui = await mountApp(t,{storageEntries:seed.storageEntries,locks:seed.manager});
  await flush();
  await ui.click('title-continue'); await flush();
  assert.ok(ui.root.querySelector('.game-frame'),'actual Continue opens a playable life');
  assert.equal(phase(ui),'ready','Ironman admission is freshly locked and ready');
  assert.deepEqual(record(ui).state,source);
  return {...seed,ui,source};
}
function captureExports(t,ui) {
  const blobs=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;
  URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:ironman-app-control';};
  URL.revokeObjectURL=()=>{};
  ui.document.createElement=()=>({click(){}});
  t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});
  return blobs;
}
async function exportLive(t,ui,blobs=captureExports(t,ui)) {
  if(!enabled(ui,'export'))await ui.click('menu');
  await ui.click('export');await flush();
  assert.equal(blobs.length,1,'an actual accepted export is the positive control');
  return JSON.parse(await blobs[0].text());
}
function capturedBattle(kind, original = ironman(adult())) {
  const s=copy(original);
  for(const person of s.companions){person.active=person.recruited=person.id==='mira';if(person.id==='mira'){person.hp=person.maxHp;s.rpg.companionStages.mira.status='available';}}
  s.event=null;s.battle=createBattle(s,'forest',null,{openingTurns:false});
  s.battle.instanceId='app-controlled-'+kind;
  s.battle.currentActorId='hero';
  const actor=id=>s.battle.actors.find(a=>a.id===id),hero=actor('hero'),mira=actor('mira'),enemy=actor('enemy-1');
  assert.ok(mira,'controlled real named living companion is captured');
  for(const foe of s.battle.actors.filter(a=>a.side==='enemy')){foe.hp=foe.maxHp=10000;foe.armor=100;}
  if(kind==='companion'){
    mira.hp=1;mira.status={poison:2,poisonTurns:1};
    s.battle.turnOrder=['hero','mira',...s.battle.actors.filter(a=>!['hero','mira'].includes(a.id)).map(a=>a.id)];
    s.life.happiness=70;s.life.stress=20;
  }else{
    hero.hp=1;hero.status={};
    for(const key of ['planId','planCycle','bossId','phasePlan'])delete enemy[key];
    Object.assign(enemy,{aiKey:'striker',aiStep:0,status:{},attackPower:9999});
    s.battle.turnOrder=['hero','enemy-1',...s.battle.actors.filter(a=>a.hp>0&&!['hero','enemy-1'].includes(a.id)).map(a=>a.id)];
  }
  return valid(s,'controlled captured '+kind+' boundary before actual engine command');
}

test('actual Continue, living choice and export use independent Ironman authority and preserve all Standard bytes',async t=>{
  const {ui,source}=await mountRun(t),before=shared(ui);
  const choice=source.event.choices.find(c=>!c.disabledReason),expected=E.chooseEventOption(source,choice.id);
  assert.notDeepEqual(expected,source,'the selected actual command changes the position');
  await ui.click('choice',choice.id);await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,expected);
  assert.deepEqual(shared(ui),before,'Standard slots, mirror and previous-life backup remain byte exact');
  assert.deepEqual(await exportLive(t,ui),expected,'export is a fresh accepted current head');
  assert.deepEqual(shared(ui),before);
});

test('a held real Web Lock reserves one living command and fences stale clicks, navigation, export and beforeunload',async t=>{
  const {ui,source,manager}=await mountRun(t),before=copy(record(ui));
  const choice=source.event.choices.find(c=>!c.disabledReason),button=enabled(ui,'choice',choice.id);
  const expected=E.chooseEventOption(source,choice.id);assert.notDeepEqual(expected,source);
  const blobs=captureExports(t,ui);manager.hold();
  await ui.click('choice',choice.id);await flush();
  assert.equal(phase(ui),'pending');assert.deepEqual(record(ui),before,'candidate is not installed before confirmation');
  assert.ok(ui.root.querySelector('.game-frame'),'the current life remains visible while the save waits');
  assert.equal(ui.root.querySelector('#ironman-status-heading'),null,'a pending save never opens a confirmation screen');
  assert.doesNotMatch(ui.root.innerHTML,/Confirming your position/);
  await ui.fire('click',button);await ui.key('j');
  const exporting=enabled(ui,'export');if(exporting)await ui.fire('click',exporting);
  assert.equal(blobs.length,0);assert.deepEqual(record(ui),before);
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true,'pending Ironman protects exit without Standard dirty flags');
  manager.release();await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,expected,'the one original command commits once');
  assert.deepEqual(await exportLive(t,ui,blobs),expected);
});

test('a quota-blocked live command stays frozen until explicit identical retry, without replaying the choice',async t=>{
  const {ui,source}=await mountRun(t),before=copy(record(ui));
  const choice=source.event.choices.find(c=>!c.disabledReason),expected=E.chooseEventOption(source,choice.id),set=ui.storage.setItem.bind(ui.storage);
  ui.storage.setItem=(key,value)=>{if(key===ironmanRecordKey(RUN))throw Object.assign(Error('controlled quota'),{name:'QuotaExceededError'});return set(key,value);};
  await ui.click('choice',choice.id);await flush();assert.equal(phase(ui),'blocked');assert.deepEqual(record(ui),before);
  ui.storage.setItem=set;
  await ui.click('ironman-refresh');await flush();
  assert.equal(phase(ui),'blocked','refresh cannot discard or silently replay a reserved candidate');assert.deepEqual(record(ui),before);
  assert.ok(enabled(ui,'ironman-retry'),'the actual retry control is offered');
  await ui.click('ironman-retry');await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,expected,'exact reserved choice, no second reward or engine replay');
});

test('a write with failed readback reconciles the exact saved candidate once, preserving uncertainty until a fresh check',async t=>{
  const {ui,source}=await mountRun(t),choice=source.event.choices.find(c=>!c.disabledReason),expected=E.chooseEventOption(source,choice.id);
  const set=ui.storage.setItem.bind(ui.storage),get=ui.storage.getItem.bind(ui.storage);let attempted=false,readFails=true,writes=0;
  ui.storage.setItem=(key,value)=>{const result=set(key,value);if(key===ironmanRecordKey(RUN)){attempted=true;writes++;}return result;};
  ui.storage.getItem=key=>{if(attempted&&readFails&&key===ironmanRecordKey(RUN))throw Error('controlled confirmation loss');return get(key);};
  await ui.click('choice',choice.id);await flush();assert.equal(phase(ui),'blocked');
  assert.equal(writes,1,'one durable candidate attempt');readFails=false;
  assert.deepEqual(record(ui).state,expected,'failed confirmation may still have saved the candidate');
  await ui.click('ironman-refresh');await flush();
  assert.equal(phase(ui),'ready');assert.equal(writes,1,'fresh locked reconciliation adopts without another write');
  assert.deepEqual(await exportLive(t,ui),expected);
});

test('actual battle action accepts a named companion casualty durably without ending the living hero',async t=>{
  const source=capturedBattle('companion'),expected=E.chooseBattleAction(source,'attack','enemy-1');
  assert.equal(expected.companions.find(p=>p.id==='mira').alive,false,'actual public engine command causes death');
  assert.equal(expected.ironman.casualties.length,1);assert.equal(ironmanHeroDeath(expected),null);
  const {ui}=await mountRun(t,source),bytes=shared(ui);
  await ui.click('battle-action','attack');await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,expected);
  assert.equal(record(ui).casualties[0].personId,currentIronmanPerson(expected,'mira').id);
  assert.equal(ui.storage.getItem(ironmanEndedKey(RUN)),null);assert.deepEqual(shared(ui),bytes);
});

test('actual fatal battle action confirms a marker before exact head cleanup and never exports a playable dead hero',async t=>{
  const source=capturedBattle('hero'),expected=E.chooseBattleAction(source,'attack','enemy-1');
  assert.ok(ironmanHeroDeath(expected),'actual public engine command causes fatality');
  const {ui}=await mountRun(t,source),bytes=shared(ui),operations=[];
  const set=ui.storage.setItem.bind(ui.storage),remove=ui.storage.removeItem.bind(ui.storage),blobs=captureExports(t,ui);
  ui.storage.setItem=(key,value)=>{operations.push(['set',key]);return set(key,value);};
  ui.storage.removeItem=key=>{operations.push(['remove',key]);return remove(key);};
  await ui.click('battle-action','attack');await flush();
  assert.equal(phase(ui),'ended');assert.equal(record(ui),null);
  assert.deepEqual(JSON.parse(ui.storage.getItem(ironmanEndedKey(RUN))),{version:1,...ironmanHeroDeath(expected)});
  assert.ok(operations.findIndex(([kind,key])=>kind==='set'&&key===ironmanEndedKey(RUN))<operations.findIndex(([kind,key])=>kind==='remove'&&key===ironmanRecordKey(RUN)),'marker is written before independent head cleanup');
  const exporting=enabled(ui,'export');if(exporting)await ui.fire('click',exporting);
  assert.equal(blobs.length,0);assert.deepEqual(shared(ui),bytes,'hero death preserves unrelated saves and backups');
});

test('protected live rehearsal uses actual finished authorization and preserves the exact Ironman head',async t=>{
  const {ui}=await mountRun(t),before=[...ui.values];
  await ui.click('menu');await ui.click('practice-open','protect_ally');await flush();
  assert.ok(ui.root.querySelector('.practice-modal'),'positive control: protected rehearsal really opens');
  await ui.click('practice-action','defend');assert.match(ui.root.querySelector('.practice-modal').textContent,/Lesson completed/);
  assert.deepEqual([...ui.values],before,'detached rehearsal writes no live or Standard storage bytes');
  await ui.click('practice-close');assert.equal(ui.root.querySelector('.practice-modal'),null);assert.equal(phase(ui),'ready');
});

test('an ended marker arriving while the matching run is dormant on title clears its referenced head and preserves another life',async t=>{
  const {ui,source,manager,neighbor}=await mountRun(t,capturedBattle('hero')),before=shared(ui);
  await ui.click('title-menu');assert.ok(ui.root.querySelector('.title-screen'));
  const authority=store(ui,manager),fatal=E.chooseBattleAction(source,'attack','enemy-1');
  assert.ok(ironmanHeroDeath(fatal));
  assert.equal((await authority.endIronman(0,fatal,{token:ironmanRecordToken(record(ui))})).status,'ended');
  await ui.windowEvent('storage',{key:ironmanEndedKey(source.ironman.runId)});await flush();
  assert.equal(record(ui),null);assert.deepEqual(shared(ui),before);
  assert.equal(phase(ui),'ended');await ui.click('ironman-standard-return');
  await ui.click('title-continue');await flush();
  assert.ok(ui.root.querySelector('.game-frame'));assert.deepEqual(ui.current(),neighbor,'Continue selects the unrelated living Standard position');
  assert.equal(ui.root.querySelector('.practice-modal'),null);
});

test('an ended different run is fanned out while the current Ironman life and protected rehearsal survive',async t=>{
  const {ui,source,manager}=await mountRun(t,ironman(),{another:true}),before=copy(record(ui)),other=record(ui,OTHER_RUN);
  await ui.click('menu');await ui.click('practice-open','protect_ally');await flush();
  assert.ok(ui.root.querySelector('.practice-modal'));
  // A real confirmed marker remains after a controlled cleanup failure. The
  // event payload is deliberately false; only storage can authorize cleanup.
  const authority=store(ui,manager),fatal=E.chooseBattleAction(capturedBattle('hero',other.state),'attack','enemy-1'),remove=ui.storage.removeItem.bind(ui.storage);
  assert.ok(ironmanHeroDeath(fatal));
  ui.storage.removeItem=key=>{if(key===ironmanRecordKey(OTHER_RUN))throw Error('controlled remote cleanup failure');return remove(key);};
  assert.equal((await authority.endIronman(1,fatal,{token:ironmanRecordToken(other)})).status,'ended-cleanup-pending');
  ui.storage.removeItem=remove;
  await ui.windowEvent('storage',{key:ironmanEndedKey(OTHER_RUN),newValue:'not authority'});await flush();
  assert.equal(record(ui,OTHER_RUN),null,'existing-marker-only cleanup reaches the dormant second run');
  assert.deepEqual(record(ui),before,'current authority is byte-equivalent');
  assert.ok(ui.root.querySelector('.practice-modal'),'another run cannot discard this protected practice');
  await ui.click('practice-close');assert.equal(source.ironman.runId,RUN);
});

test('unavailable exclusive locks block Ironman admission while an actual Standard life retains synchronous choices',async t=>{
  const seed=await prepared(),ui=await mountApp(t,{storageEntries:seed.storageEntries});await flush();
  const before=copy(record(ui));await ui.click('title-continue');await flush();
  assert.equal(phase(ui),'blocked');assert.deepEqual(record(ui),before);assert.equal(ui.root.querySelector('.game-frame'),null);
  const standardReturn=enabled(ui,'ironman-standard-return');assert.ok(standardReturn,'definitive admission refusal offers explicit Standard return');
  await ui.click('ironman-standard-return');await flush();await ui.click('title-load');await ui.click('slot-load','2');
  const original=ui.current(),choice=original.event.choices.find(c=>!c.disabledReason),expected=E.chooseEventOption(original,choice.id);
  await ui.click('choice',choice.id);
  assert.deepEqual(ui.current(),expected,'Standard actual handler adopts and saves before awaiting any lock');
  assert.deepEqual(record(ui),before);
});

test('a matching marker clears an actual protected rehearsal and its origin without touching the Standard neighbor',async t=>{
  const {ui,source,manager}=await mountRun(t,ironman(adult())),bytes=shared(ui);
  await ui.click('menu');await ui.click('practice-open','protect_ally');await flush();
  const practice=ui.root.querySelector('.practice-modal');assert.ok(practice,'positive control: matching live rehearsal is open');
  const oldPracticeAction=enabled(ui,'practice-action','defend');assert.ok(oldPracticeAction);
  const authority=store(ui,manager),fatal=E.chooseBattleAction(capturedBattle('hero',source),'attack','enemy-1');
  assert.ok(ironmanHeroDeath(fatal));
  assert.equal((await authority.endIronman(0,fatal,{token:ironmanRecordToken(record(ui))})).status,'ended');
  await ui.windowEvent('storage',{key:ironmanEndedKey(RUN)});await flush();
  assert.equal(ui.root.querySelector('.practice-modal'),null);assert.equal(record(ui),null);assert.equal(phase(ui),'ended');
  await ui.fire('click',oldPracticeAction);assert.equal(ui.root.querySelector('.practice-modal'),null);assert.deepEqual(shared(ui),bytes);
});

test('first-save quota retains one fixed new run with no playable fallback, then explicit retry commits that original life',async t=>{
  const manager=locks(),ui=await mountApp(t,{locks:manager});await flush();
  await ui.click('title-new');await ui.click('slot-new','0');
  ui.set('startAge','0');ui.set('name','Fictional First Reserve');ui.set('lifeMode','ironman');
  const set=ui.storage.setItem.bind(ui.storage),attempts=[];let fail=true;
  ui.storage.setItem=(key,value)=>{
    if(key.startsWith('hearth-and-oath-legacy:ironman-run:v1:')){attempts.push(JSON.parse(value));if(fail)throw Object.assign(Error('controlled first quota'),{name:'QuotaExceededError'});}
    return set(key,value);
  };
  const bytes=shared(ui),blobs=captureExports(t,ui);
  await ui.click('creator-step','2');await ui.submit();await flush();
  assert.equal(attempts.length,1,'positive control: actual creator attempted one independent first save');
  const fixed=attempts[0].runId,candidate=copy(attempts[0].state);
  assert.equal(candidate.hero.name,'Fictional First Reserve');assert.equal(candidate.age,0);
  assert.equal(phase(ui),'blocked');assert.equal(record(ui,fixed),null);assert.equal(ui.root.querySelector('.game-frame'),null);
  assert.equal(enabled(ui,'ironman-standard-return'),undefined,'uncertain first save cannot abandon into Standard');
  assert.equal(enabled(ui,'practice-open'),undefined);assert.equal(enabled(ui,'export'),undefined);assert.equal(blobs.length,0);
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
  await ui.key('Escape');assert.equal(phase(ui),'blocked');assert.deepEqual(shared(ui),bytes);
  fail=false;await ui.click('ironman-retry');await flush();
  assert.equal(phase(ui),'ready');assert.equal(attempts.length,2);assert.equal(attempts[1].runId,fixed);
  assert.deepEqual(record(ui,fixed).state,candidate,'retry preserves the fixed opening and run identity');assert.deepEqual(shared(ui),bytes);
});

test('malformed present Ironman metadata is rejected by actual file input without stripping it into a Standard import',async t=>{
  const original=birth(),ui=await mountApp(t,{states:[original]});await ui.click('title-load');
  const before=[...ui.values],bad=copy(original);bad.ironman={version:1,runId:'malformed',startedDay:0,casualties:[]};
  assert.equal(E.migrateSave(bad),null,'malformed metadata is truly rejected by the engine');
  await ui.import(JSON.stringify(bad));await flush();
  assert.equal(ui.root.querySelector('[data-op="confirm-import"]'),null);assert.match(ui.toast.textContent,/not a compatible/);
  assert.deepEqual([...ui.values],before,'invalid import changes no existing bytes');
});

test('an invalid raw nonempty target cannot become an Ironman attachment merely because its display migrates to empty',async t=>{
  const neighbor=birth(),envelope={version:1,activeSlot:2,slots:[{id:0,state:{unrecognized:'raw occupied object'},updatedAt:null},{id:1,state:null,updatedAt:null},{id:2,state:neighbor,updatedAt:'2026-10-18T00:00:00.000Z'}],backups:{}};
  const ui=await mountApp(t,{storageEntries:[[SLOT_KEY,JSON.stringify(envelope)],[LEGACY_SAVE_KEY,JSON.stringify(neighbor)]],locks:locks()});await flush();
  await ui.click('title-load');const before=shared(ui);await ui.import(JSON.stringify(ironman()));await flush();
  assert.ok(ui.root.querySelector('.modal'),'positive control: valid incoming Ironman reaches real import review');
  const option=ui.root.querySelector('[name="import-slot"][value="0"]');assert.ok(option,'actual target row is present');
  await ui.fire('change',option);await flush();
  const confirm=enabled(ui,'confirm-import');if(confirm)await ui.fire('click',confirm);await flush();
  assert.equal(record(ui),null,'raw occupied invalid state is never attached');assert.deepEqual(shared(ui),before);
  assert.match(ui.root.innerHTML,/Underlying Slot Occupied|underlying.slot.occupied|not.*empty|paused/i);
});

test('reservation cancels both a pending touch hold and a held gear drag before either can equip',async t=>{
  for(const kind of ['touch','drag'])await t.test(kind,async child=>{
    const source=ironman(adult());source.equipment.owned=[...new Set([...source.equipment.owned,'iron_sword','travel_cloak'])];valid(source,'controlled owned gear projection');
    const {ui,manager}=await mountRun(child,source);await ui.click('tab','inventory');
    const item=ui.root.querySelectorAll('[data-draggable-gear]').find(node=>getGearItem(source,node.dataset.draggableGear)?.slot==='weapon');
    const slot=ui.root.querySelector('[data-equipment-slot="weapon"]');assert.ok(item&&slot,'actual carried weapon and doll target are rendered');
    ui.document.elementFromPoint=()=>slot;
    if(kind==='touch'){
      await ui.fire('pointerdown',item,{pointerType:'touch',pointerId:1,clientX:1,clientY:1});ui.flushTouchHolds();
      assert.equal(item.classList.contains('gear-held'),true,'positive control: the real 220 ms hold activates');
      await ui.fire('pointercancel',item,{pointerId:1});assert.equal(item.classList.contains('gear-held'),false);
      await ui.fire('pointerdown',item,{pointerType:'touch',pointerId:2,clientX:1,clientY:1});
    }else{
      await ui.fire('dragstart',item,{dataTransfer:{setData(){}}});assert.equal(item.classList.contains('gear-held'),true,'positive control: real dragstart holds gear');
    }
    const form=ui.root.querySelector('#gear-preset-save');assert.ok(form,'actual loadout form can reserve a mutation');
    const id=form.querySelector('[name="preset"]').value,label='Fictional '+kind+' reserved kit';form.querySelector('[name="label"]').value=label;
    const expected=E.gearOrganizerCommand(source,{kind:'save',id,label});assert.equal(expected.ok,true);assert.equal(expected.changed,true);
    manager.hold();await ui.fire('submit',form);await flush();assert.equal(phase(ui),'pending');
    ui.flushTouchHolds();assert.equal(item.classList.contains('gear-held'),false,'reservation clears held classes and cancels the old timer');
    await ui.fire(kind==='touch'?'pointerup':'drop',kind==='touch'?item:slot,{pointerId:2,pointerType:'touch'});
    assert.deepEqual(record(ui).state,source,'held release cannot equip while authority is pending');
    manager.release();await flush();assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,expected.state,'only the original organizer command is accepted');
  });
});

test('reviewed archive retains the latest head and reattachment performs a fresh resume with a new attachment nonce',async t=>{
  const {ui,source}=await mountRun(t),before=copy(record(ui)),bytes=shared(ui);
  await ui.click('menu');await ui.click('ironman-review',RUN);await flush();
  assert.ok(enabled(ui,'ironman-archive'));assert.deepEqual(record(ui),before,'review alone changes nothing');
  await ui.click('ironman-archive');await flush();
  const archived=record(ui);assert.equal(archived.attachment,null);assert.deepEqual(archived.state,source);assert.deepEqual(archived.casualties,before.casualties);
  assert.equal(ui.storage.getItem(ironmanEndedKey(RUN)),null,'archive is not hero death');assert.deepEqual(shared(ui),bytes);
  assert.ok(ui.root.querySelector('.save-slots-screen'),'completed archive presents actual retained-position navigation');
  await ui.click('ironman-recoveries');await ui.click('ironman-review',RUN);await ui.click('ironman-review-recovery',RUN);await flush();
  assert.ok(enabled(ui,'ironman-reattach'),'a freshly reviewed empty target is explicitly confirmed');
  await ui.click('ironman-reattach');await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,source);assert.equal(record(ui).attachment.slotId,0);
  assert.notEqual(record(ui).attachment.nonce,before.attachment.nonce);assert.deepEqual(shared(ui),bytes);
});

test('reviewed delete keeps a nonplayable identity and casualty tombstone which an old downloaded file cannot restore',async t=>{
  const {ui,source}=await mountRun(t),bytes=shared(ui);
  await ui.click('menu');await ui.click('ironman-review',RUN);await ui.click('ironman-delete');await flush();
  const tombstone=copy(record(ui));assert.equal(tombstone.state,null);assert.equal(tombstone.attachment,null);assert.deepEqual(tombstone.casualties,source.ironman.casualties);
  assert.equal(tombstone.runId,RUN);assert.equal(ui.storage.getItem(ironmanEndedKey(RUN)),null);assert.deepEqual(shared(ui),bytes);
  assert.ok(ui.root.querySelector('.save-slots-screen'));await ui.import(JSON.stringify(source));await flush();
  assert.equal(enabled(ui,'confirm-import'),undefined,'deleted v1 positions cannot silently reimport');
  const known=enabled(ui,'ironman-known-resume',RUN);assert.ok(known);await ui.fire('click',known);await flush();
  assert.deepEqual(record(ui),tombstone);assert.deepEqual(shared(ui),bytes);assert.equal(ui.root.querySelector('.game-frame'),null);
});

test('a stale lifecycle review cannot archive a newer durable same-run head',async t=>{
  const {ui,source,manager}=await mountRun(t),bytes=shared(ui);
  await ui.click('menu');await ui.click('ironman-review',RUN);assert.ok(enabled(ui,'ironman-archive'));
  const next=E.chooseEventOption(source,source.event.choices.find(c=>!c.disabledReason).id),authority=store(ui,manager);
  assert.notDeepEqual(next,source);
  assert.equal((await authority.commitIronman(0,next,{intent:'continue',token:ironmanRecordToken(record(ui))})).status,'committed','positive control: another real authority advances after the review');
  const newer=copy(record(ui));await ui.click('ironman-archive');await flush();
  assert.equal(phase(ui),'blocked');assert.deepEqual(record(ui),newer,'stale token cannot detach or replace the accepted newer head');assert.deepEqual(shared(ui),bytes);
});

test('an old known-run import identifies and resumes the latest authoritative position without overwriting it',async t=>{
  const {ui,source}=await mountRun(t),choice=source.event.choices.find(c=>!c.disabledReason),next=E.chooseEventOption(source,choice.id);
  await ui.click('choice',choice.id);await flush();const durable=copy(record(ui)),bytes=shared(ui);
  await ui.click('menu');await ui.import(JSON.stringify(source));await flush();
  assert.match(ui.root.innerHTML,/existing Ironman run|existing run authority/i);assert.equal(enabled(ui,'confirm-import'),undefined);
  assert.deepEqual(record(ui),durable);assert.ok(enabled(ui,'ironman-known-resume',RUN));
  await ui.click('ironman-known-resume',RUN);await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(record(ui).state,next);assert.deepEqual(shared(ui),bytes);
  assert.deepEqual(await exportLive(t,ui),next,'actual export confirms the saved newer body was adopted, rather than the imported old body');
});

test('a late Standard claim after Ironman import review preserves the claimant and refuses the stale empty-target token',async t=>{
  const neighbor=birth(),manager=locks(),ui=await mountApp(t,{states:[null,null,neighbor],activeSlot:2,locks:manager});await flush();
  await ui.click('title-load');await ui.import(JSON.stringify(ironman()));await flush();
  const target=ui.root.querySelector('[name="import-slot"][value="1"]');assert.ok(target);await ui.fire('change',target);await flush();
  assert.ok(enabled(ui,'confirm-import'),'positive control: a real empty target was reviewed');
  const claimant=E.chooseEventOption(neighbor,neighbor.event.choices.find(c=>!c.disabledReason).id);
  assert.equal(store(ui,manager).write(1,claimant),true,'a real Standard writer claims the reviewed target');
  const bytes=shared(ui);await ui.click('confirm-import');await flush();
  assert.equal(phase(ui),'blocked');assert.equal(record(ui),null);assert.deepEqual(shared(ui),bytes);assert.deepEqual(ui.lives()[1],claimant);
});

// Append to tests/ironman-app.test.js before the next immutable source checkpoint.
// Uses that file's existing actual-handler helpers; authored only, NOT RUN.
test('a reattachment whose write succeeded but confirmation failed can be superseded only by a freshly reviewed same-run lifecycle choice',async t=>{
  const {ui,source}=await mountRun(t),bytes=shared(ui);
  await ui.click('menu');await ui.click('ironman-review',RUN);await ui.click('ironman-archive');await flush();
  const archived=copy(record(ui));assert.equal(archived.attachment,null);assert.deepEqual(archived.state,source);
  assert.ok(ui.root.querySelector('.save-slots-screen'),'actual archive completed before the controlled reattachment');
  await ui.click('ironman-recoveries');await ui.click('ironman-review',RUN);await ui.click('ironman-review-recovery',RUN);await flush();
  assert.ok(enabled(ui,'ironman-reattach'),'positive control: a real raw-empty target has an explicit reviewed confirmation');
  const set=ui.storage.setItem.bind(ui.storage),get=ui.storage.getItem.bind(ui.storage);let attempted=false,lost=true,writes=0;
  ui.storage.setItem=(key,value)=>{
    const result=set(key,value);
    if(key===ironmanRecordKey(RUN)&&JSON.parse(value).attachment){attempted=true;writes++;}
    return result;
  };
  ui.storage.getItem=key=>{if(attempted&&lost&&key===ironmanRecordKey(RUN))throw Error('controlled reattachment confirmation loss');return get(key);};
  await ui.click('ironman-reattach');await flush();
  assert.equal(attempted,true,'the actual guarded reattachment wrote its new attachment');assert.equal(writes,1);
  assert.equal(phase(ui),'blocked');assert.equal(ui.root.querySelector('.game-frame'),null);
  assert.equal(enabled(ui,'ironman-standard-return'),undefined,'uncertain lifecycle completion is not a generic Standard escape');
  assert.equal(enabled(ui,'ironman-reattach'),undefined,'a completed-or-uncertain reattachment cannot offer the stale recovery confirmation again');
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
  lost=false;
  const attached=copy(record(ui));assert.ok(attached.attachment);assert.equal(attached.attachment.slotId,0);
  assert.notEqual(attached.revision,archived.revision);assert.deepEqual(attached.state,source,'the write succeeded despite lost confirmation');
  assert.ok(enabled(ui,'ironman-review',RUN),'an unresolved lifecycle operation offers a fresh same-run lifecycle review');
  await ui.click('ironman-review',RUN);await flush();
  assert.deepEqual(record(ui),attached,'fresh review alone does not write or adopt the position');
  assert.ok(enabled(ui,'ironman-archive'),'the real review presents an explicit archive choice for the current saved head');
  await ui.click('ironman-archive');await flush();
  const final=record(ui);assert.equal(final.attachment,null);assert.deepEqual(final.state,source);assert.deepEqual(final.casualties,archived.casualties);
  assert.equal(ui.storage.getItem(ironmanEndedKey(RUN)),null,'reviewed archive remains distinct from hero death');
  assert.ok(ui.root.querySelector('.save-slots-screen'));assert.equal(ui.root.querySelector('[data-ironman-status]'),null);
  assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,false,'accepted fresh lifecycle choice resolves the old lifecycle obligation');
  assert.deepEqual(shared(ui),bytes,'all Standard slots, mirror and existing backup bytes survive both lifecycle operations');
});
