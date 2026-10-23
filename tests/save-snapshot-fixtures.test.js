import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { migrateSave, validateSave } from '../dist/js/engine.js';

const KEY='hearth-and-oath-legacy:slots:v1';
const read=name=>JSON.parse(readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8')).states;
const old=read('legacy-v5.json'),first=read('legacy-v1.json');
function disk(initial){const values=new Map(initial);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};}

test('warm commit cache and fresh durable migration preserve identical genuine old pending slots, backups and histories',()=>{
 const states=[old.pendingRoad,old.midbattle,old.pendingProject],before=JSON.stringify(states);
 const envelope={version:1,activeSlot:0,slots:states.map((state,id)=>({id,state,updatedAt:null})),backups:{0:{state:first.childhood,updatedAt:null},1:{state:old.pendingProject,updatedAt:null}}};
 const storage=disk([[KEY,JSON.stringify(envelope)],[LEGACY_SAVE_KEY,JSON.stringify(states[0])]]),warm=createSaveStore(storage,migrateSave);
 for(let id=0;id<3;id++){const expected=migrateSave(states[id]);assert.ok(validateSave(expected));assert.deepEqual(warm.read(id),expected);}
 assert.deepEqual(warm.backup(0),migrateSave(first.childhood));assert.deepEqual(warm.backup(1),migrateSave(old.pendingProject));
 const position=warm.read(0);assert.ok(warm.write(0,position));
 const freshStorage=disk([...storage.values]),fresh=createSaveStore(freshStorage,migrateSave);
 for(let iteration=0;iteration<3;iteration++){
  const prior=JSON.parse(storage.getItem(KEY));assert.ok(warm.write(0,position));assert.ok(fresh.write(0,position));
  assert.deepEqual([...storage.values],[...freshStorage.values],'warm and freshly migrated durable bytes stay exact');
  const durable=JSON.parse(storage.getItem(KEY));assert.deepEqual(durable.slots,prior.slots,'unchanged save keeps all revisions/timestamps and complete states');assert.deepEqual(durable.backups,prior.backups);
  assert.deepEqual(warm.list(),fresh.list());assert.equal(warm.conflict(),null);assert.equal(warm.hasUnsaved(),false);
 }
 assert.equal(JSON.stringify(states),before,'genuine old fixture inputs are never mutated');
});
