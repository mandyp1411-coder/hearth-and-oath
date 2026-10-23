import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthGame, migrateSave, chooseEventOption } from '../dist/js/engine.js';
import { createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { mountApp } from './helpers/ui-surface.mjs';
const key='hearth-and-oath-legacy:slots:v1';
function storage(){const values=new Map();return {values,failKey:null,getItem:k=>values.get(k)??null,setItem(k,v){if(this.failKey===k)throw Error('Unavailable');values.set(k,String(v));}};}
const life=name=>createBirthGame({name,seed:'delete-'+name});

test('deleting a reviewed life removes its backup and preserves neighboring complete snapshots',()=>{
  const disk=storage(),store=createSaveStore(disk,migrateSave),lives=[life('Ash'),life('Birch'),life('Cedar')];
  lives.forEach((s,i)=>assert.ok(store.write(i,s)));
  assert.ok(store.replace(1,life('New Birch'),{reviewed:true}));assert.ok(store.backup(1));
  const before=store.list(),token=store.deletionToken(1);
  assert.equal(store.remove(1,{reviewed:true,token}),true);
  assert.equal(store.read(1),null);assert.equal(store.backup(1),null);
  for(const id of [0,2])assert.deepEqual(store.list()[id],before[id]);
  const reloaded=createSaveStore(disk,migrateSave);assert.equal(reloaded.read(1),null);assert.equal(reloaded.backup(1),null);
  assert.ok(reloaded.read(reloaded.active()));
});
test('removing the final life cannot resurrect it from the legacy mirror on reload',()=>{
  const disk=storage(),store=createSaveStore(disk,migrateSave);store.write(2,life('Last Leaf'));
  assert.ok(store.remove(2,{reviewed:true,token:store.deletionToken(2)}));
  assert.equal(JSON.parse(disk.getItem(LEGACY_SAVE_KEY)),null);
  const loaded=createSaveStore(disk,migrateSave);assert.ok(loaded.list().every(s=>s.state===null));assert.equal(loaded.empty(),0);
});
test('unreviewed, stale, empty and invalid deletion commands leave every stored byte untouched',()=>{
  const disk=storage(),store=createSaveStore(disk,migrateSave);store.write(0,life('Kept'));
  const old=store.deletionToken(0);store.write(0,chooseEventOption(store.read(0),'care'));
  const before=[...disk.values];
  for(const [id,options]of [[0,{}],[0,{token:store.deletionToken(0)}],[0,{reviewed:true,token:old}],[1,{reviewed:true,token:old}],[-1,{reviewed:true,token:old}],['invalid',{reviewed:true,token:old}]])assert.equal(store.remove(id,options),false);
  assert.deepEqual([...disk.values],before);
});
test('a storage failure while removing a life keeps the live slot, backup and durable envelope',()=>{
  for(const failKey of [LEGACY_SAVE_KEY,key]){
    const disk=storage(),store=createSaveStore(disk,migrateSave);store.write(0,life('Original'));store.replace(0,life('Replacement'),{reviewed:true});
    const before=store.list(),backup=store.backup(0),envelope=disk.getItem(key),mirror=disk.getItem(LEGACY_SAVE_KEY);disk.failKey=failKey;
    assert.equal(store.remove(0,{reviewed:true,token:store.deletionToken(0)}),false);assert.deepEqual(store.list(),before);assert.deepEqual(store.backup(0),backup);assert.equal(disk.getItem(key),envelope);assert.equal(disk.getItem(LEGACY_SAVE_KEY),mirror);
  }
});
test('another browser tab changing any life invalidates the pending deletion without overwriting it',()=>{
  const disk=storage(),first=createSaveStore(disk,migrateSave);first.write(0,life('Keep First'));first.write(1,life('Keep Second'));
  const token=first.deletionToken(0),other=createSaveStore(disk,migrateSave);other.write(1,life('Changed Elsewhere'));const before=[...disk.values];
  assert.equal(first.remove(0,{reviewed:true,token}),false);assert.deepEqual([...disk.values],before);assert.equal(createSaveStore(disk,migrateSave).read(1).hero.name,'Changed Elsewhere');
});
test('the saved-life screen offers separate deletion controls and cancellation preserves the life',async t=>{
  const ui=await mountApp(t,{states:[life('Rowan'),life('Alder')]});await ui.click('title-load');
  assert.equal(ui.root.querySelectorAll('[data-op="slot-delete"]').length,2);
  const deleteControl=ui.root.querySelector('[data-op="slot-delete"][data-id="0"]');assert.equal(deleteControl.closest('[data-op="slot-load"]'),null);
  const before=ui.lives();await ui.click('slot-delete','0');assert.ok(ui.root.querySelector('.delete-life-dialog'));assert.match(ui.root.innerHTML,/Delete Rowan\?/);assert.match(ui.root.innerHTML,/Export This Life/);
  await ui.key('Escape');assert.equal(ui.root.querySelector('.delete-life-dialog'),null);assert.deepEqual(ui.lives(),before);
});
test('confirmed deletion frees only the selected slot and Continue uses a surviving life',async t=>{
  const ui=await mountApp(t,{states:[life('Willow'),life('Oak')]});await ui.click('title-load');const other=ui.lives()[1];await ui.click('slot-delete','0');await ui.click('confirm-delete-life');assert.equal(ui.lives()[0],null);assert.deepEqual(ui.lives()[1],other);assert.equal(ui.current().hero.name,'Oak');
  await ui.click('title-menu');await ui.click('title-continue');assert.equal(ui.current().hero.name,'Oak');
});
test('deleting the active final life clears Continue and permits a fresh character in that slot',async t=>{
  const ui=await mountApp(t,{states:[life('Final Life')]});await ui.click('title-continue');await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-delete','0');await ui.click('confirm-delete-life');assert.equal(ui.current(),null);assert.ok(ui.lives().every(s=>s===null));await ui.click('title-menu');const continued=ui.root.querySelector('[data-op="title-continue"]');assert.ok(!continued||continued.disabled,'an empty title offers no usable Continue');await ui.click('title-new');await ui.click('slot-new','0');assert.ok(ui.root.querySelector('#character-form'));
});
