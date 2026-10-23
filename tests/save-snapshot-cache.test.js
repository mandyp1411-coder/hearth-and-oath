import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';

const KEY='hearth-and-oath-legacy:slots:v1';
const copy=value=>JSON.parse(JSON.stringify(value));
const life=(name,step=0)=>({hero:{name},step,schema:2,pending:{choices:['keep','leave']}});
function setup({legacy=false}={}){
 const states=[life('Oak'),life('Ash'),life('Birch')];
 const envelope={version:1,activeSlot:0,slots:states.map((state,id)=>({id,state,updatedAt:'2026-10-15T00:00:00.000Z',revision:'original-'+id})),backups:Object.fromEntries(states.map((s,id)=>[id,{state:life('Prior '+s.hero.name),updatedAt:null}]))};
 const values=new Map([[LEGACY_SAVE_KEY,JSON.stringify(legacy?{...states[0],schema:1}:states[0])]]);
 if(!legacy)values.set(KEY,JSON.stringify(envelope));
 const storage={values,reads:0,unreadable:false,failKey:null,getItem(key){this.reads++;if(this.unreadable)throw Error('Read unavailable');return values.get(key)??null;},setItem(key,value){if(this.failKey===key)throw Error('Quota');values.set(key,String(value));},removeItem(key){values.delete(key);}};
 const calls=[];
 const validate=value=>{calls.push(copy(value));return value?.hero?.name&&Number.isInteger(value.step)?{...copy(value),schema:2}:null;};
 const store=createSaveStore(storage,validate);
 return {storage,store,calls,states,envelope};
}

test('unchanged durable bytes reuse only private validated data while every input and storage source is checked',()=>{
 const {storage,store,calls}=setup();assert.equal(calls.length,6);calls.length=0;storage.reads=0;
 assert.ok(store.write(0,life('Oak',1)));assert.equal(calls.length,1,'incoming state still migrates');assert.equal(storage.reads,3,'actual slot and legacy strings plus mirror rollback baseline are read');
 calls.length=0;storage.reads=0;assert.ok(store.write(0,life('Oak',2)));assert.equal(calls.length,1,'own committed bytes can be reused');assert.equal(storage.reads,3);
 const listed=store.list();listed[1].state.hero.name='Leaked list';listed[0].state.pending.choices[0]='changed';
 const read=store.read(1);read.pending.choices.push('changed');const backup=store.backup(1);backup.hero.name='Leaked backup';
 assert.equal(store.checkForConflict(1),false);assert.equal(calls.length,1,'read-only public copies cannot poison the cache');
 assert.equal(store.read(1).hero.name,'Ash');assert.deepEqual(store.read(0).pending.choices,['keep','leave']);assert.equal(store.backup(1).hero.name,'Prior Ash');
 calls.length=0;assert.equal(store.write(0,{hero:{name:'Invalid'},step:'not-an-integer'}),false);assert.equal(calls.length,1,'invalid incoming writes never use cached validity');assert.equal(store.read(0).step,2);
});

test('external slot, backup and legacy byte changes take full validation and preserve latest neighbors',()=>{
 for(const kind of ['slot','backup','legacy']){
  const {storage,store,calls}=setup();const raw=JSON.parse(storage.getItem(KEY));
  if(kind==='slot'){raw.slots[1]={...raw.slots[1],state:life('Remote Ash',3),revision:'remote-ash'};storage.setItem(KEY,JSON.stringify(raw));}
  if(kind==='backup'){raw.backups[1].state=life('Remote recovery',4);storage.setItem(KEY,JSON.stringify(raw));}
  if(kind==='legacy')storage.setItem(LEGACY_SAVE_KEY,JSON.stringify(life('Changed mirror',5)));
  calls.length=0;assert.ok(store.write(0,life('Oak',1)));assert.equal(calls.length,7,kind+' byte change validates input and all six durable states');
  const saved=JSON.parse(storage.getItem(KEY));assert.deepEqual(saved.slots[1],raw.slots[1]);assert.deepEqual(saved.backups,raw.backups);
 }
});

test('quota and unavailable reads invalidate cached validity before retrying the durable envelope',()=>{
 for(const failure of ['quota-envelope','quota-mirror','read']){
  const {storage,store,calls}=setup(),before=[...storage.values];
  if(failure.startsWith('quota'))storage.failKey=failure==='quota-envelope'?KEY:LEGACY_SAVE_KEY;else storage.unreadable=true;
  calls.length=0;assert.equal(store.write(0,life('Oak',1)),false);assert.deepEqual([...storage.values],before);assert.equal(store.available(),false);assert.deepEqual(store.read(0),life('Oak',1));
  storage.failKey=null;storage.unreadable=false;calls.length=0;assert.ok(store.write(0,life('Oak',1)));assert.equal(calls.length,7,failure+' retry fully revalidates durable data');assert.equal(store.hasUnsaved(),false);
 }
});

test('explicit reload, reviewed replacement and deletion invalidate the prior cached parse',()=>{
 const {storage,store,calls}=setup();calls.length=0;assert.ok(store.reload());assert.equal(calls.length,6);
 calls.length=0;assert.ok(store.replace(1,life('Elm'),{reviewed:true,token:store.reviewToken(1)}));assert.equal(calls.length,7);assert.deepEqual(store.backup(1),life('Ash'));
 calls.length=0;assert.ok(store.remove(1,{reviewed:true,token:store.deletionToken(1)}));assert.equal(calls.length,6);assert.equal(store.read(1),null);assert.equal(store.backup(1),null);
 const raw=JSON.parse(storage.getItem(KEY));assert.ok(raw.slots[1].revision);assert.equal(raw.slots[1].state,null);
});

test('legacy raw bytes cache the migrated result without changing the old source or reviving a tombstone',()=>{
 const {storage,store,calls}=setup({legacy:true});assert.equal(calls.length,1);assert.equal(JSON.parse(storage.getItem(LEGACY_SAVE_KEY)).schema,1);assert.equal(store.read(0).schema,2);
 calls.length=0;assert.equal(store.checkForConflict(0),false);assert.equal(calls.length,0);assert.ok(store.write(0,life('Oak',1)));assert.equal(calls.length,1);
 const raw=JSON.parse(storage.getItem(KEY));raw.slots[0]={id:0,state:null,updatedAt:null,revision:'deleted-externally'};storage.setItem(KEY,JSON.stringify(raw));
 calls.length=0;const durable=storage.getItem(KEY);assert.equal(store.write(0,life('Oak',2)),false);assert.equal(storage.getItem(KEY),durable);assert.equal(store.conflict().reason,'deleted');assert.deepEqual(store.read(0),life('Oak',2));assert.ok(store.hasUnsaved(0));
});

test('new malformed or invalid external contents cannot be blessed by a prior cache hit',()=>{
 for(const kind of ['malformed','invalid']){
  const {storage,store}=setup();const prior=JSON.parse(storage.getItem(KEY));
  if(kind==='malformed')storage.setItem(KEY,'{broken');else{prior.slots[0].state.step='invalid';storage.setItem(KEY,JSON.stringify(prior));}
  const durable=storage.getItem(KEY);assert.equal(store.write(0,life('Oak',1)),false);assert.equal(storage.getItem(KEY),durable);assert.deepEqual(store.read(0),life('Oak',1));
  if(kind==='malformed')assert.equal(store.available(),false);else assert.equal(store.conflict().reason,'deleted');
 }
});
