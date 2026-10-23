import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { saveHealthView, renderSaveHealth } from '../dist/js/save-health-ui.js';
const KEY='hearth-and-oath-legacy:slots:v1',STAMP='2026-10-15T00:00:00.000Z';
const life=(step=0)=>({hero:{name:'Rowan'},step,pending:{choices:['keep','leave']}});
const validate=value=>value?.hero?.name&&Number.isInteger(value.step)?JSON.parse(JSON.stringify(value)):null;
function setup(){
  const state=life(),values=new Map([[KEY,JSON.stringify({version:1,activeSlot:0,slots:[{id:0,state,updatedAt:STAMP,revision:'original'}],backups:{}})],[LEGACY_SAVE_KEY,JSON.stringify(state)]]);
  const storage={values,fail:false,unreadable:false,getItem(key){if(this.unreadable)throw Error('Read blocked');return values.get(key)??null;},setItem(key,value){if(this.fail)throw Error('Quota');values.set(key,String(value));},removeItem(key){values.delete(key);}};
  return {storage,store:createSaveStore(storage,validate)};
}

test('health uses the durable timestamp, never the attempted time, and unchanged writes preserve it',()=>{
  const {storage,store}=setup();assert.equal(store.health(0).status,'saved');assert.equal(store.health(0).lastSavedAt,STAMP);
  assert.ok(store.write(0,life()));assert.equal(store.health(0).lastSavedAt,STAMP,'an unchanged durable write is not a new progress timestamp');
  storage.fail=true;assert.equal(store.write(0,life(1)),false);assert.notEqual(store.list()[0].updatedAt,STAMP);
  assert.equal(store.health(0).status,'unsaved');assert.equal(store.health(0).lastSavedAt,STAMP);assert.ok(store.hasUnsavedChanges());
  storage.fail=false;assert.ok(store.write(0,life(1)));assert.equal(store.health(0).status,'saved');assert.notEqual(store.health(0).lastSavedAt,STAMP);assert.equal(store.hasUnsavedChanges(),false);
});

test('a queued live position is distinguished from stored data before write runs',()=>{
  const {store}=setup(),next=life(1);assert.equal(store.health(0,next).status,'pending');assert.ok(store.hasUnsavedChanges(0,next));
  assert.equal(store.health(0).status,'saved','a separate stale local read is not the queued live position');
  assert.ok(store.write(0,next));assert.equal(store.health(0,next).status,'saved');assert.equal(store.hasUnsavedChanges(0,next),false);
});

test('quota failure of the same reused object invalidates its earlier acknowledgement',()=>{
  const {storage,store}=setup(),state=life(1);assert.ok(store.write(0,state));assert.equal(store.health(0,state).status,'saved');
  state.step=2;storage.fail=true;assert.equal(store.write(0,state),false);assert.equal(store.health(0,state).status,'unsaved');assert.ok(store.hasUnsavedChanges(0,state));
});

test('unload comparison catches an unexpected in-place change without serializing quiet renders',()=>{
  const {store}=setup(),state=life(1);let serializations=0;
  Object.defineProperty(state,'toJSON',{value(){serializations++;return {hero:this.hero,step:this.step,pending:this.pending};}});
  assert.ok(store.write(0,state));serializations=0;
  for(let i=0;i<20;i++)assert.equal(store.health(0,state).status,'saved');
  assert.equal(serializations,0,'acknowledged stable renders do not serialize the source');
  state.step=2;assert.ok(store.hasUnsavedChanges(0,state),'unload rechecks content, not identity alone');assert.equal(serializations,1);
  store.invalidateHealth(0);assert.equal(store.health(0,state).status,'pending');const checked=serializations;
  for(let i=0;i<20;i++)assert.equal(store.health(0,state).status,'pending');assert.equal(serializations,checked,'a pending render comparison is memoized');
});

test('changed and deleted conflicts preserve the last locally known durable timestamp and exact session',()=>{
  for(const deleted of [false,true]){
    const {storage,store}=setup(),remote=createSaveStore(storage,validate),next=life(1);
    if(deleted)assert.ok(remote.remove(0,{reviewed:true,token:remote.deletionToken(0)}));else assert.ok(remote.write(0,life(2)));
    const bytes=[...storage.values];assert.equal(store.write(0,next),false);assert.equal(store.health(0,next).status,'conflict');assert.equal(store.health(0,next).lastSavedAt,STAMP);
    assert.deepEqual(store.read(0),next);assert.deepEqual([...storage.values],bytes);assert.ok(store.hasUnsavedChanges());
    assert.ok(store.reload());assert.equal(store.hasUnsavedChanges(),false);assert.equal(store.health(0).status,deleted?'empty':'saved');
  }
});

test('a storage-event conflict without new local choices does not create an unload prompt',()=>{
  const {storage,store}=setup();assert.ok(createSaveStore(storage,validate).write(0,life(2)));assert.ok(store.checkForConflict(0));
  assert.ok(store.hasUnsaved(0),'conflict protection bookkeeping remains intact');assert.equal(store.hasUnsavedChanges(),false);assert.equal(store.health(0).status,'stale');
  assert.match(saveHealthView(store.health(0)).label,/changed in another tab/);
});

test('an unrelated successful slot never clears a failed life or its durable baseline',()=>{
  const {storage,store}=setup();storage.fail=true;assert.equal(store.write(0,life(1)),false);storage.fail=false;assert.ok(store.write(1,life(4)));
  assert.equal(store.health(0).status,'unsaved');assert.equal(store.health(0).lastSavedAt,STAMP);assert.ok(store.hasUnsavedChanges(0));assert.equal(store.health(1).status,'saved');
});

test('unavailable storage has honest empty and unsaved states, including read failures',()=>{
  const store=createSaveStore(null,validate);assert.equal(store.health(0).status,'empty');assert.equal(store.hasUnsavedChanges(),false);assert.match(saveHealthView(store.health(0)).label,/unavailable/);
  assert.equal(store.write(0,life()),false);assert.equal(store.health(0).status,'unsaved');assert.equal(store.health(0).lastSavedAt,null);assert.ok(store.hasUnsavedChanges());
  const {storage,store:existing}=setup();storage.unreadable=true;assert.equal(existing.write(0,life(1)),false);assert.equal(existing.health(0).lastSavedAt,STAMP);assert.equal(existing.health(0).status,'unsaved');
});

test('unchanged failed re-save warns about storage without inventing unsaved choices',()=>{
  const {storage,store}=setup();storage.fail=true;assert.equal(store.write(0,life()),false);assert.equal(store.hasUnsavedChanges(),false);
  const view=saveHealthView(store.health(0));assert.equal(view.label,'Browser saves unavailable');assert.match(view.problem,/storage is unavailable/);assert.ok(view.exportable);assert.equal(store.health(0).lastSavedAt,STAMP);assert.equal(store.health(0).status,'saved');
});

test('legacy or invalid timestamps are never invented, and status markup names each export',()=>{
  for(const stamp of [null,'not-a-date']){
    const {storage}=setup(),raw=JSON.parse(storage.getItem(KEY));raw.slots[0].updatedAt=stamp;storage.setItem(KEY,JSON.stringify(raw));const store=createSaveStore(storage,validate);
    assert.equal(store.health(0).lastSavedAt,null);assert.match(saveHealthView(store.health(0)).lastSaved,/time not recorded/);
  }
  const store=createSaveStore(null,validate);store.write(2,life());const markup=renderSaveHealth(store.health(2),{e:value=>String(value)});
  assert.match(markup,/Not saved — export needed/);assert.match(markup,/aria-label="Export latest session from slot 3"/);assert.match(markup,/data-save-problem role="status" aria-live="polite"/);assert.equal(store.health(-1),null);
});

// Storage availability is separate from whether this tab made new choices.
test('read access denied after a successful save reports unavailable without erasing its known durable time',()=>{
  const {storage,store}=setup(),state=life(1);assert.ok(store.write(0,state));const stamp=store.health(0).lastSavedAt;
  storage.unreadable=true;assert.equal(store.write(0,state),false);const health=store.health(0,state),view=saveHealthView(health);
  assert.equal(health.available,false);assert.equal(health.status,'saved');assert.equal(health.hasChanges,false);assert.equal(health.lastSavedAt,stamp);
  assert.equal(store.hasUnsavedChanges(0,state),false);assert.equal(view.label,'Browser saves unavailable');assert.match(view.lastSaved,/Last saved:/);assert.ok(view.exportable);
});
