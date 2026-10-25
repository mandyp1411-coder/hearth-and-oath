import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { createIronmanMetadata, ironmanHeroDeath } from '../dist/js/ironman.js';
import { createBattle } from '../dist/js/combat.js';
import { ironmanRecordKey, ironmanRecordToken } from '../dist/js/ironman-storage.js';
import { createSaveStore, createSaveCoordinator, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { receiveNotification, notificationsFor, markNotificationsRead } from '../dist/js/notifications-v40.js';
import { reviewPersonalNote } from '../dist/js/personal-notes.js';
import { newTradeDraft, quoteTrade } from '../dist/js/trading.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mazeMapRuntime, mazeLayout } from '../dist/js/maze-v31.js';
import { mazeMapIdentity } from '../dist/js/maze-map-memory.js';
import { fakeSurface, mountApp } from './helpers/ui-surface.mjs';
import { freshStory } from './helpers/story-life-fixtures.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Additional bounded SOURCE handler checks. Fixtures are controlled fictional
// projections, not earned routes, browser timing or release certification.
// This file is authored separately so the first immutable suite stays intact.
const SLOT_KEY='hearth-and-oath:slots:v1',RUN='22334455-6677-4899-aabb-ccddeeff0011';
const clone=value=>structuredClone(value);
const head=(ui,runId=RUN)=>JSON.parse(ui.storage.getItem(ironmanRecordKey(runId))||'null');
const shared=ui=>[ui.storage.getItem(SLOT_KEY),ui.storage.getItem(LEGACY_SAVE_KEY)];
const phase=ui=>ui.root.querySelector('[data-ironman-status]')?.dataset.phase||(ui.root.querySelector('.game-frame')?'ready':null);
const enabled=(ui,op,id)=>ui.root.querySelectorAll(`[data-op="${op}"]`).find(n=>!n.disabled&&(id===undefined||String(n.dataset.id)===String(id)));
let born,ordinary,neighbor,mazeBase,replyBase,entropy=0;
function valid(s,label='controlled extended fixture'){
  assert.equal(E.validateSave(s),true,label);
  assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s,label+' migrates exactly');return s;
}
function birth(){return clone(born ||= valid(E.createBirthGame({name:'Fictional Extended Rowan',seed:'ironman-extended-birth'})));}
function adult(){return clone(ordinary ||= valid(freshStory()));}
function ironman(s=birth()){s.ironman=createIronmanMetadata(s,{randomUUID:()=>RUN});return valid(s);}
function lockManager(){
  let chain=Promise.resolve(),paused=false;const gates=[];
  return {requests:0,hold(){paused=true;},release(){paused=false;gates.splice(0).forEach(resolve=>resolve());},request(name,options,callback){
    assert.equal(name,'hearth-and-oath:save:v1');assert.equal(options.mode,'exclusive');
    this.requests++;
    const result=chain.then(async()=>{if(paused)await new Promise(resolve=>gates.push(resolve));return callback({name,mode:'exclusive'});});chain=result.catch(()=>{});return result;
  }};
}
function store(ui,locks){return createSaveStore(ui.storage,E.migrateSave,{coordinate:createSaveCoordinator(locks),crypto:{randomUUID:()=>`99aabbcc-ddee-4f00-8a11-${(++entropy).toString(16).padStart(12,'0')}`}});}
async function flush(){for(let n=0;n<8;n++)await nextTurn();}
async function seed(source){
  const ui=fakeSurface(),locks=lockManager(),other=clone(neighbor ||= valid(E.createBirthGame({name:'Fictional Kept Standard',seed:'ironman-extended-neighbor'})));
  ui.storage.setItem(SLOT_KEY,JSON.stringify({version:1,activeSlot:0,slots:[0,1,2].map(id=>({id,state:id===2?other:null,updatedAt:id===2?'2026-10-18T00:00:00.000Z':null,revision:'extended-base-'+id})),backups:{0:{state:other,updatedAt:'keep-original-backup'}}}));
  ui.storage.setItem(LEGACY_SAVE_KEY,JSON.stringify(other));
  const authority=store(ui,locks),review=await authority.inspectIronman(source,{intent:'import',slot:0});assert.equal(review.status,'review');
  assert.equal((await authority.commitIronman(0,source,{intent:'import',token:review.token})).status,'committed');
  return {storageEntries:[...ui.values],locks,other};
}
async function mounted(t,source=ironman()){
  const prepared=await seed(source),ui=await mountApp(t, {rulebooks:'both', storageEntries:prepared.storageEntries,locks:prepared.locks});await flush();await ui.click('title-continue');await flush();
  assert.equal(phase(ui),'ready');assert.deepEqual(head(ui).state,source);return {...prepared,ui,source};
}
function captureExports(t,ui){const blobs=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:ironman-extended';};URL.revokeObjectURL=()=>{};ui.document.createElement=()=>({click(){}});t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});return blobs;}
async function exportCurrent(t,ui){const blobs=captureExports(t,ui);if(!enabled(ui,'export'))await ui.click('menu');await ui.click('export');await flush();assert.equal(blobs.length,1);return JSON.parse(await blobs[0].text());}
async function heldCommand(ui,locks,source,operation){locks.hold();await operation();await flush();assert.equal(phase(ui),'pending');assert.deepEqual(head(ui).state,source,'reserved candidate remains detached while exclusive lock is held');}
async function finishHeld(ui,locks,expected){locks.release();await flush();assert.equal(phase(ui),'ready');assert.deepEqual(head(ui).state,expected);}

test('actual adult Ironman submit completes Standard prehistory before committing its first new-run head',async t=>{
  const locks=lockManager(),ui=await mountApp(t, {rulebooks:'both', locks});await ui.click('title-new');await ui.click('slot-new','0');
  ui.set('name','Fictional Adult Opt In');ui.set('startAge','18');ui.set('lifeMode','ironman');
  const bytes=shared(ui);await ui.click('creator-step','2');await ui.submit();await flush();assert.equal(phase(ui),'ready');
  const keys=[...ui.values.keys()].filter(key=>key.startsWith('hearth-and-oath:ironman-run:v1:'));assert.equal(keys.length,1);
  const saved=JSON.parse(ui.storage.getItem(keys[0]));valid(saved.state);
  assert.equal(saved.state.hero.name,'Fictional Adult Opt In');assert.equal(saved.state.age,18);assert.equal(saved.state.day,18*365);
  assert.equal(saved.state.ironman.startedDay,saved.state.day);assert.equal(saved.state.ironman.casualties.length,0);
  assert.equal(saved.state.timeline.yearHistory.length,18);assert.equal(saved.attachment.slotId,0);assert.deepEqual(shared(ui),bytes);
  assert.deepEqual(await exportCurrent(t,ui),saved.state,'only the accepted adult opening is playable/exportable');
});

test('a first-save write followed by lost readback freezes game-null entry and adopts that exact candidate after fresh reconciliation',async t=>{
  const locks=lockManager(),ui=await mountApp(t, {rulebooks:'both', locks});await ui.click('title-new');await ui.click('slot-new','0');
  ui.set('name','Fictional Unconfirmed Opening');ui.set('startAge','0');ui.set('lifeMode','ironman');
  const set=ui.storage.setItem.bind(ui.storage),get=ui.storage.getItem.bind(ui.storage);let saved=null,lost=true,writes=0;
  ui.storage.setItem=(key,value)=>{const result=set(key,value);if(key.startsWith('hearth-and-oath:ironman-run:v1:')){saved=JSON.parse(value);writes++;}return result;};
  ui.storage.getItem=key=>{if(saved&&lost&&key===ironmanRecordKey(saved.runId))throw Error('controlled first confirmation loss');return get(key);};
  const bytes=shared(ui);await ui.click('creator-step','2');await ui.submit();await flush();assert.ok(saved,'actual first commit reached durable storage');assert.equal(writes,1);
  assert.equal(phase(ui),'blocked');assert.equal(ui.root.querySelector('.game-frame'),null);assert.equal(enabled(ui,'ironman-standard-return'),undefined);
  assert.equal(enabled(ui,'practice-open'),undefined);assert.equal(enabled(ui,'export'),undefined);assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
  lost=false;const exact=clone(saved);await ui.click('ironman-refresh');await flush();
  assert.equal(phase(ui),'ready');assert.equal(writes,1,'confirmation does not allocate another run or write/replay the opening');assert.deepEqual(head(ui,exact.runId),exact);assert.deepEqual(shared(ui),bytes);
  assert.deepEqual(await exportCurrent(t,ui),exact.state);
});

test('Ironman letters open immediately while only their read receipts await authority, without a full-screen loading flash',async t=>{
  const source=adult();for(const id of ['one','two'])receiveNotification(source,{kind:'gift',sourceId:'controlled-'+id,title:'A retained fictional receipt '+id,body:'No gift is awarded by reading this controlled receipt.'});
  const {ui,locks}=await mounted(t,ironman(source)),bytes=shared(ui);await ui.click('notifications');
  const current=head(ui).state,id=notificationsFor(current)[0].id,expected=markNotificationsRead(current,id),button=enabled(ui,'notice-open',id);assert.ok(button);
  await heldCommand(ui,locks,current,()=>ui.click('notice-open',id));assert.equal(head(ui).state.inbox.entries.find(n=>n.id===id).read,false);
  assert.ok(ui.root.querySelector('.game-frame'),'the retained life remains visible while a read receipt saves');
  assert.match(ui.root.querySelector('.inbox-letter').textContent,/No gift is awarded/,'the actual retained words are visible before the save lock releases');
  assert.equal(ui.root.querySelector('#ironman-status-heading'),null,'reading does not replace the inbox with the save screen');
  const pending=clone(head(ui)),gameplay=enabled(ui,'tab','character');await ui.fire('click',gameplay);await flush();assert.deepEqual(head(ui),pending,'gameplay remains fenced while the receipt is unconfirmed');
  await ui.fire('click',button);await finishHeld(ui,locks,expected);
  assert.ok(ui.root.querySelector('.inbox-entry.open'));assert.equal(ui.document.activeElement.dataset.op,'notice-open');
  const all=markNotificationsRead(expected);await heldCommand(ui,locks,expected,()=>ui.click('notice-read-all'));assert.ok(ui.root.querySelector('.inbox-letter'));assert.equal(ui.root.querySelector('#ironman-status-heading'),null);await finishHeld(ui,locks,all);
  assert.equal(ui.document.activeElement.id,'inbox-title');assert.match(ui.root.querySelector('.inbox-heading').textContent,/All Caught Up/);assert.deepEqual(shared(ui),bytes);
  const requests=locks.requests;await ui.click('notice-open',id);await flush();await ui.click('notice-open',id);await flush();assert.equal(locks.requests,requests,'opening and closing a read letter do not create new save transactions');assert.deepEqual(head(ui).state,all);
});

test('a failed Ironman letter read confirmation still enters recovery and never claims the receipt was saved',async t=>{
  const source=adult();receiveNotification(source,{kind:'letter',sourceId:'controlled-failed-read',title:'A retained letter',body:'These retained words can be read before their read receipt is confirmed.'});
  const {ui,source:confirmed}=await mounted(t,ironman(source)),set=ui.storage.setItem.bind(ui.storage),id=notificationsFor(confirmed)[0].id;
  ui.storage.setItem=(key,value)=>{if(key===ironmanRecordKey(RUN))throw Error('controlled receipt save failure');return set(key,value);};
  await ui.click('notifications');await ui.click('notice-open',id);await flush();
  assert.equal(phase(ui),'blocked');assert.ok(ui.root.querySelector('#ironman-status-heading'));assert.equal(ui.root.querySelector('.game-frame'),null);assert.deepEqual(head(ui).state,confirmed);assert.equal(notificationsFor(head(ui).state)[0].read,false);
});

test('explicit newer-authority review resolves a stale living obligation without replaying the refused local choice',async t=>{
  const branch=adult();assert.equal(branch.event,null);branch.event={id:'life_birthday',title:'A current birthday decision',category:'Life',body:'Choose how to spend this birthday.',choices:[{id:'calling',label:'Work',description:'Take stock of your work.'},{id:'people',label:'People',description:'Spend the day with people.'},{id:'self',label:'Self',description:'Keep a quiet day.'}]};const {ui,locks,source}=await mounted(t,ironman(branch)),choices=source.event.choices.filter(c=>!c.disabledReason);assert.ok(choices.length>1);
  const local=E.chooseEventOption(source,choices[1].id),remote=E.chooseEventOption(source,choices[0].id);assert.notDeepEqual(local,remote);
  const original=clone(head(ui)),set=ui.storage.setItem.bind(ui.storage);let blocked=true;
  ui.storage.setItem=(key,value)=>{if(blocked&&key===ironmanRecordKey(RUN))throw Error('controlled local quota');return set(key,value);};
  await ui.click('choice',choices[1].id);await flush();assert.equal(phase(ui),'blocked');blocked=false;
  assert.equal((await store(ui,locks).commitIronman(0,remote,{intent:'continue',token:ironmanRecordToken(original)})).status,'committed');
  const durable=clone(head(ui));await ui.click('ironman-refresh');await flush();assert.equal(phase(ui),'blocked');assert.deepEqual(head(ui),durable);
  await ui.click('ironman-review-authority');await flush();assert.ok(enabled(ui,'ironman-use-authority'),'a current full-body review offers an explicit authority choice');
  let writes=0;ui.storage.setItem=(key,value)=>{if(key===ironmanRecordKey(RUN))writes++;return set(key,value);};
  await ui.click('ironman-use-authority');await flush();assert.equal(phase(ui),'ready');assert.equal(writes,0);assert.deepEqual(head(ui),durable);
  assert.deepEqual(await exportCurrent(t,ui),remote,'the reviewed saved body is adopted without replaying the local command');
});

async function orphaned(t){
  const h=await mounted(t),{ui,source}=h,choice=source.event.choices.find(c=>!c.disabledReason),candidate=E.chooseEventOption(source,choice.id),set=ui.storage.setItem.bind(ui.storage);
  let claimed=false;
  ui.storage.setItem=(key,value)=>{const result=set(key,value);if(!claimed&&key===ironmanRecordKey(RUN)&&JSON.parse(value).state?.event?.id===candidate.event?.id){
    claimed=true;const raw=JSON.parse(ui.storage.getItem(SLOT_KEY));raw.slots[0]={...raw.slots[0],state:clone(h.other),revision:'controlled-late-claim'};set(SLOT_KEY,JSON.stringify(raw));
  }return result;};
  // Claim after the candidate is actually stored, never before its first write.
  await ui.click('choice',choice.id);await flush();ui.storage.setItem=set;
  assert.equal(claimed,true);assert.equal(phase(ui),'blocked');assert.deepEqual(head(ui).state,candidate);assert.equal(head(ui).attachment,null,'actual store revokes the orphan attachment');
  return {...h,candidate,bytes:shared(ui)};
}

test('reviewed orphan recovery reattaches and adopts only the already-saved exact reserved candidate',async t=>{
  const {ui,candidate,bytes}=await orphaned(t);await ui.click('ironman-review-recovery');await flush();assert.ok(enabled(ui,'ironman-reattach'));
  await ui.click('ironman-reattach');await flush();assert.equal(phase(ui),'ready');assert.deepEqual(head(ui).state,candidate);assert.equal(head(ui).attachment.slotId,1);assert.deepEqual(shared(ui),bytes);
  assert.deepEqual(await exportCurrent(t,ui),candidate,'recovery performs fresh exact-candidate acceptance, not another choice');
});

test('an orphan recovery cannot adopt a retained head changed by another real authority',async t=>{
  const {ui,locks,candidate,bytes}=await orphaned(t),authority=store(ui,locks);
  const review=await authority.inspectIronman(RUN,{intent:'reattach',slot:1});assert.equal(review.status,'review');
  const attached=await authority.reattachIronman(RUN,1,{reviewed:true,token:review.token});assert.equal(attached.status,'committed');
  const changed=E.keepPlayerNote(candidate,'A different saved authority wrote this note.');assert.notDeepEqual(changed,candidate);
  assert.equal((await authority.commitIronman(1,changed,{intent:'continue',token:attached.token})).status,'committed');
  assert.equal((await authority.archiveIronman(RUN,{reviewed:true,token:ironmanRecordToken(head(ui))})).status,'archived');
  await ui.click('ironman-review-recovery');await flush();assert.ok(enabled(ui,'ironman-reattach'));await ui.click('ironman-reattach');await flush();
  assert.equal(phase(ui),'blocked','new attachment is not permission to adopt a different body');assert.deepEqual(head(ui).state,changed);assert.deepEqual(shared(ui),bytes);
  assert.equal(enabled(ui,'ironman-standard-return'),undefined,'the original live obligation remains unresolved');
});

test('a delayed Standard file-read completion cannot open an obsolete import over a newly resumed Ironman life',async t=>{
  const prepared=await seed(ironman()),ui=await mountApp(t, {rulebooks:'both', storageEntries:prepared.storageEntries,locks:prepared.locks});await flush();
  await ui.click('title-load');await ui.click('slot-load','2');assert.ok(ui.root.querySelector('.game-frame'));
  let resolve;const text=new Promise(done=>{resolve=done;}),input=ui.root.querySelector('#save-file');input.files=[{size:100,text:()=>text}];
  const reading=ui.fire('change',input);await nextTurn();
  await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load','0');await flush();assert.equal(phase(ui),'ready');const exact=clone(head(ui));
  resolve(JSON.stringify(E.chooseEventOption(prepared.other,prepared.other.event.choices.find(c=>!c.disabledReason).id)));await reading;await flush();
  assert.equal(ui.root.querySelector('.modal'),null);assert.deepEqual(head(ui),exact);assert.equal(phase(ui),'ready');assert.deepEqual(await exportCurrent(t,ui),exact.state);
});

test('a reviewed Standard import leaves the old Ironman binding and a later old-run marker cannot fence the imported life',async t=>{
  const {ui,locks,source,other}=await mounted(t,ironman(adult()));await ui.click('menu');await ui.import(JSON.stringify(other));
  const choice=ui.root.querySelector('[name="import-slot"][value="1"]');assert.ok(choice);await ui.fire('change',choice);await ui.click('confirm-import');await flush();
  assert.ok(ui.root.querySelector('.game-frame'));assert.deepEqual(ui.current(),other,'actual Standard import adopts its separate reviewed slot');
  const original=clone(head(ui)),bytes=shared(ui),fatal=clone(source);fatal.event=null;fatal.battle=createBattle(fatal,'forest',null,{openingTurns:false});fatal.battle.instanceId='extended-old-run-terminal';
  const hero=fatal.battle.actors.find(a=>a.id==='hero'),enemy=fatal.battle.actors.find(a=>a.id==='enemy-1');hero.hp=1;hero.status={};
  for(const foe of fatal.battle.actors.filter(a=>a.side==='enemy')){foe.hp=foe.maxHp=10000;foe.armor=100;}
  for(const key of ['planId','planCycle','bossId','phasePlan'])delete enemy[key];Object.assign(enemy,{aiKey:'striker',aiStep:0,status:{},attackPower:9999});
  fatal.battle.currentActorId='hero';fatal.battle.turnOrder=['hero','enemy-1',...fatal.battle.actors.filter(a=>a.hp>0&&!['hero','enemy-1'].includes(a.id)).map(a=>a.id)];valid(fatal,'controlled old-run fatal boundary');
  const terminal=E.chooseBattleAction(fatal,'attack','enemy-1');assert.ok(ironmanHeroDeath(terminal),'real engine action terminates the retained old run');
  assert.equal((await store(ui,locks).endIronman(0,terminal,{token:ironmanRecordToken(original)})).status,'ended');
  await ui.windowEvent('storage',{key:'hearth-and-oath:ironman-ended:v1:'+RUN});await flush();
  assert.equal(head(ui),null);assert.equal(ui.root.querySelector('[data-ironman-status]'),null);assert.ok(ui.root.querySelector('.game-frame'));assert.deepEqual(ui.current(),other);assert.deepEqual(shared(ui),bytes);
});

test('personal-note editing closes and restores current-note focus only after the real pending candidate is accepted',async t=>{
  const source=ironman(E.keepPlayerNote(adult(),'Original fictional note.')),{ui,locks}=await mounted(t,source);
  await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');const control=enabled(ui,'personal-note-edit');assert.ok(control);
  const key=control.dataset.id;await ui.click('personal-note-edit',key);const form=ui.root.querySelector('#personal-note-edit-form');assert.ok(form);
  const text='A revised note after accepted storage.',expected=E.editPlayerNote(source,reviewPersonalNote(source,key),text);form.querySelector('textarea').value=text;
  await heldCommand(ui,locks,source,()=>ui.fire('submit',form));await ui.fire('submit',form);await finishHeld(ui,locks,expected);
  assert.equal(ui.root.querySelector('.personal-note-dialog'),null);assert.equal(ui.document.activeElement.dataset.op,'personal-note-edit');assert.equal(ui.document.activeElement.dataset.id,key);
  await ui.fire('submit',form);assert.deepEqual(head(ui).state,expected);
});

function serviceFixture(kind){
  let s=adult();s.locationId='home';s.cartography.offsite=false;s.cartography.interior=null;s.hero.gold=1000;for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=30;syncCartography(s);
  const provider=settlementServices(s).find(r=>r.kind===kind);assert.ok(provider);const path=settlementWalkPath(s,provider.roomId);assert.ok(path);for(const room of path)s=E.chooseAction(s,'atlas_room_'+room);
  return ironman(valid(s));
}
async function openProvider(h,kind){await h.ui.click('place-open');const provider=settlementServices(head(h.ui).state).find(r=>r.kind===kind&&r.here);assert.ok(provider);await h.ui.click('service-open',provider.id);await flush();assert.equal(phase(h.ui),'ready');}

test('staged material trade accepts its one quoted payment before resetting its draft and focusing the trade workspace',async t=>{
  const h=await mounted(t,serviceFixture('materials')),{ui,locks}=h;await openProvider(h,'materials');await ui.click('shop-browse');await ui.click('shop-item','buy:material:hide');await ui.click('shop-add','buy:material:hide');
  const source=clone(head(ui).state),draft={...newTradeDraft(source,'materials'),buy:[{id:'material:hide',quantity:1}]},quote=quoteTrade(source,draft),expected=E.completeTrade(source,quote);assert.equal(quote.disabledReason,null);assert.notDeepEqual(expected,source);
  const old=enabled(ui,'shop-confirm');assert.ok(old);await heldCommand(ui,locks,source,()=>ui.click('shop-confirm'));await ui.fire('click',old);await finishHeld(ui,locks,expected);
  assert.equal(ui.document.activeElement.id,'trade-heading');assert.ok(ui.root.querySelector('.trade-workspace'));assert.equal(enabled(ui,'shop-confirm'),undefined,'accepted callback clears the staged transaction');
  await ui.fire('click',old);assert.deepEqual(head(ui).state,expected);assert.equal(expected.equipment.materials.hide,source.equipment.materials.hide+3);
});

test('craft confirmation retains one real design command until acceptance and then focuses its current artisan result',async t=>{
  const h=await mounted(t,serviceFixture('smith')),{ui,locks}=h;await openProvider(h,'smith');await ui.click('craft-browse');await ui.click('craft-item','workshop_craft_padded_gambeson');
  const source=clone(head(ui).state),expected=E.chooseAction(source,'workshop_craft_padded_gambeson'),old=enabled(ui,'craft-confirm','workshop_craft_padded_gambeson');assert.ok(old);assert.notDeepEqual(expected,source);
  await heldCommand(ui,locks,source,()=>ui.click('craft-confirm','workshop_craft_padded_gambeson'));await ui.fire('click',old);await finishHeld(ui,locks,expected);
  assert.ok(['craft-item-heading','craft-heading'].includes(ui.document.activeElement.id));assert.deepEqual(expected.equipment.equipped,source.equipment.equipped);await ui.fire('click',old);assert.deepEqual(head(ui).state,expected);
});

function maze(){
  if(!mazeBase){const raw=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent;let s=E.migrateSave(raw);s=E.chooseEventOption(s,'withdraw');s.adventuring.rations=20;s=E.chooseAction(s,'adventure_descend');
    for(let n=0;s.event&&n<30;n++){const c=s.event.choices.find(c=>['later','care','leave','keep','continue','pause','ask'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}assert.equal(s.event,null);assert.ok(s.maze);mazeBase=valid(s);}
  return ironman(clone(mazeBase));
}
test('maze reminder and keyboard movement defer their actual focus effects until each one accepted transition',async t=>{
  const {ui,locks,source}=await mounted(t,maze());await ui.click('maze-map-mode','inspect');const form=ui.root.querySelector('#maze-map-reminder');assert.ok(form);
  ui.root.querySelector('#maze-map-mark').value='revisit';ui.root.querySelector('#maze-map-note').value='Return after accepted storage.';
  const payload={identity:mazeMapIdentity(source.maze,mazeMapRuntime(source).rules),roomId:0,mark:'revisit',note:'Return after accepted storage.'},saved=E.updateMazeMapMemory(source,payload);assert.notDeepEqual(saved,source);
  await heldCommand(ui,locks,source,()=>ui.fire('submit',form));await finishHeld(ui,locks,saved);assert.equal(ui.document.activeElement.id,'maze-map-note');
  await ui.click('maze-map-mode','walk');const to=mazeLayout(saved.maze).cells[saved.maze.position].doors.find(id=>enabled(ui,'activity','maze_step_'+id));assert.ok(to!==undefined);
  const direction={1:'ArrowRight','-1':'ArrowLeft',11:'ArrowDown','-11':'ArrowUp'}[to-saved.maze.position],expected=E.chooseAction(saved,'maze_step_'+to),grid=ui.root.querySelector('.maze-grid');assert.ok(direction&&grid);grid.focus();
  await heldCommand(ui,locks,saved,()=>ui.key(direction));await finishHeld(ui,locks,expected);assert.equal(ui.document.activeElement.classList.contains('maze-grid'),true);assert.equal(expected.maze.steps,saved.maze.steps+1);
});

function replyFixture(){replyBase ||= valid(E.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/native-v055-factor-pending.json',import.meta.url)))));return ironman(clone(replyBase));}
test('a real Winter Levy answer is adopted once and its deferred speech focus cannot cross a later view',async t=>{
  for(const superseded of [false,true])await t.test(superseded?'superseded focus':'accepted answer focus',async child=>{
    const source=replyFixture(),{ui,locks}=await mounted(child,source),pending=source.conversations.pending,id=pending.personId,expected=E.replyMessage(source,id,'opinion'),old=enabled(ui,'reply','opinion');assert.ok(old);assert.notDeepEqual(expected,source);
    const frames=[],immediate=globalThis.requestAnimationFrame;if(superseded)globalThis.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
    try{
      await heldCommand(ui,locks,source,()=>ui.click('reply','opinion'));await finishHeld(ui,locks,expected);
      if(superseded){await ui.click('tab','inventory');for(let n=0;frames.length;n++){assert.ok(n<100,'bounded queued presentation frames');frames.shift()();}assert.equal(ui.root.querySelector('.dialogue-scene'),null);assert.equal(Boolean(ui.document.activeElement?.classList?.contains('dialogue-window')),false);}
      else assert.equal(ui.document.activeElement,ui.root.querySelector(`.dialogue-scene[data-contact-id="${id}"] .dialogue-window`),'accepted exact answer receives current speech focus');
      const focus=ui.document.activeElement;await ui.fire('click',old);assert.deepEqual(head(ui).state,expected);assert.equal(ui.document.activeElement,focus);
    }finally{globalThis.requestAnimationFrame=immediate;}
  });
});

test('Ironman personal-note drafts remain visible until the reserved save commits exactly once',async t=>{
 const {ui,locks}=await mounted(t,ironman(adult()));await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');
 const field=ui.root.querySelector('#note-text');field.value='A draft kept only after authority confirms.';await ui.fire('input',field);const before=clone(head(ui)),form=ui.root.querySelector('#player-note');
 locks.hold();await ui.fire('submit',form);await flush();assert.equal(phase(ui),'pending');assert.deepEqual(head(ui),before);assert.equal(ui.root.querySelector('#note-text').value,field.value);assert.equal(ui.root.querySelector('#ironman-status-heading'),null);
 await ui.fire('submit',form);await ui.fire('submit',ui.root.querySelector('#player-note'));locks.release();await flush();assert.equal(phase(ui),'ready');assert.equal(head(ui).state.playerNotes.filter(n=>n.text===field.value).length,1);assert.equal(ui.root.querySelector('#note-text').value,'');
});

test('a failed Ironman note save retains its draft through recovery and retry without adding a second note',async t=>{
 const {ui}=await mounted(t,ironman(adult()));await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');
 const field=ui.root.querySelector('#note-text');field.value='Retry this exact note.';await ui.fire('input',field);const before=clone(head(ui)),write=ui.storage.setItem.bind(ui.storage);let denied=true;
 ui.storage.setItem=(key,value)=>{if(denied&&key===ironmanRecordKey(RUN))throw Error('Controlled note write failure');return write(key,value);};
 await ui.fire('submit',ui.root.querySelector('#player-note'));await flush();assert.equal(phase(ui),'blocked');assert.deepEqual(head(ui),before);
 denied=false;await ui.click('ironman-retry');await flush();assert.equal(phase(ui),'ready');assert.equal(head(ui).state.playerNotes.filter(n=>n.text===field.value).length,1);assert.equal(ui.root.querySelector('#note-text').value,'');
});
