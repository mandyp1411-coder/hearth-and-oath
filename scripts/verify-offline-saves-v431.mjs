// Inspect the exact standalone bytes and execute their embedded module graph.
// This is semantic QA, not a real browser or physical-device test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const manifest=JSON.parse(read('dist/offline/manifest.json')),version=JSON.parse(read('package.json')).version;
let bytes=read('artifacts/hearth-and-oath.html');assert.equal(manifest.version,version);assert.equal(manifest.bytes,bytes.length);
const expectedHash=createHash('sha256').update(bytes).digest('hex'),partsHash=createHash('sha256');let total=0;
for(const part of manifest.parts){const chunk=read('dist/offline/'+part.file);assert.equal(chunk.length,part.bytes);total+=chunk.length;partsHash.update(chunk);}
assert.equal(total,bytes.length);assert.equal(partsHash.digest('hex'),expectedHash);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;
assert.ok(html.includes('v'+version),'standalone displays the exact current release version');const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];html=null;globalThis.gc?.();
assert.doesNotMatch(code,/^import\s/m);const compiled=new Script(code,{filename:'standalone-save-protection-v431.js'});
const ui=fakeSurface(),original=E.createBirthGame({name:'Offline Original',seed:'standalone-save-original'}),neighbor=E.createBirthGame({name:'Offline Neighbor',seed:'standalone-save-neighbor'});
ui.storage.setItem('hearth-and-oath:slots:v1',JSON.stringify({version:1,activeSlot:0,backups:{},slots:[{id:0,state:original,updatedAt:null},{id:1,state:null,updatedAt:null},{id:2,state:null,updatedAt:null}]}));
ui.storage.setItem('hearth-and-oath:life:v1',JSON.stringify(original));
const exports=[];ui.document.createElement=()=>({click(){}});
const URLSurface={createObjectURL(blob){exports.push(blob);return 'blob:offline-qa-export';},revokeObjectURL(){}};
const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window:{innerWidth:431,innerHeight:900,scrollTo(){},scrollBy(){}},requestAnimationFrame:callback=>{callback();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout:()=>1,clearTimeout(){},Blob,URL:URLSurface,TextEncoder,TextDecoder,console,queueMicrotask,fetch(){throw Error('Network forbidden during standalone verification');}});
new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);compiled.runInContext(context);globalThis.gc?.();
const embedded=new Script('({saves:__saves,engine:__engine,combat:__combat})').runInContext(context);
await ui.click('title-continue');const other=embedded.saves.createSaveStore(ui.storage,embedded.engine.migrateSave);
// Validation intentionally rejects foreign-realm objects. Transfer the fixture
// through JSON exactly as a real imported save would cross this boundary.
context.qaNeighbor=JSON.stringify(neighbor);const embeddedNeighbor=new Script('JSON.parse(globalThis.qaNeighbor)').runInContext(context);
assert.ok(other.write(1,embeddedNeighbor));await ui.click('choice',original.event.choices[0].id);
assert.deepEqual(ui.lives()[1],neighbor);const local=ui.current();assert.ok(E.validateSave(local));
const remote=embedded.engine.createBirthGame({name:'Newer Offline Life',seed:'standalone-save-newer'}),remoteStore=embedded.saves.createSaveStore(ui.storage,embedded.engine.migrateSave);
assert.ok(remoteStore.replace(0,remote,{reviewed:true}));const durable=ui.storage.getItem('hearth-and-oath:slots:v1');
const expectedLocal=E.ageUp(local);assert.ok(E.validateSave(expectedLocal));await ui.click('age-up');
assert.ok(ui.root.querySelector('[data-save-conflict-dialog]'));assert.equal(ui.storage.getItem('hearth-and-oath:slots:v1'),durable);
await ui.click('export');assert.deepEqual(JSON.parse(await exports[0].text()),expectedLocal);
await ui.key('Escape');assert.match(ui.root.innerHTML,/Your session is not saved/);await ui.click('review-save-conflict');await ui.click('reload-conflicted-life');
assert.deepEqual(ui.current(),JSON.parse(JSON.stringify(remote)));assert.deepEqual(ui.lives()[1],neighbor);
assert.deepEqual(JSON.parse(JSON.stringify(embedded.saves.createSaveStore(ui.storage,embedded.engine.migrateSave).backup(0))),local);
// Exercise the actual embedded cache with real migrated game lives, not a
// reimplemented cache or source-only function extraction. Validation and durable
// read counts are correctness evidence here, never elapsed-time measurements.
const plain=value=>JSON.parse(JSON.stringify(value));
const cacheEnvelope={version:1,activeSlot:0,slots:[original,neighbor,plain(remote)].map((state,id)=>({id,state,updatedAt:null,revision:'cache-original-'+id})),backups:Object.fromEntries([original,neighbor,plain(remote)].map((state,id)=>[id,{state,updatedAt:null}]))};
const cacheValues=new Map([['hearth-and-oath:slots:v1',JSON.stringify(cacheEnvelope)],['hearth-and-oath:life:v1',JSON.stringify(original)]]);
const cacheDisk={reads:0,failKey:null,getItem(key){this.reads++;return cacheValues.get(key)??null;},setItem(key,value){if(this.failKey===key)throw Error('Quota');cacheValues.set(key,String(value));},removeItem:key=>cacheValues.delete(key)};
let migrations=0;
const cached=embedded.saves.createSaveStore(cacheDisk,value=>{migrations++;return embedded.engine.migrateSave(value);});
assert.equal(migrations,6,'embedded cold store validates all three lives and three backups');
const stable=plain(cached.list()),stableBackups=[0,1,2].map(id=>plain(cached.backup(id)));
for(let iteration=0;iteration<2;iteration++){
 migrations=0;cacheDisk.reads=0;assert.ok(cached.write(0,cached.read(0)));
 assert.equal(migrations,1,'embedded warm write validates the incoming life');assert.equal(cacheDisk.reads,3,'warm write still reads both durable keys and rollback mirror');
 assert.deepEqual(plain(cached.list()),stable,'unchanged warm writes preserve complete states, revisions and timestamps');
 assert.deepEqual([0,1,2].map(id=>plain(cached.backup(id))),stableBackups,'all complete recovery histories remain exact');
}
const leaked=cached.list();leaked[1].state.hero.name='POISONED PUBLIC COPY';const leakedRead=cached.read(0);leakedRead.hero.name='POISONED READ';const leakedBackup=cached.backup(2);leakedBackup.hero.name='POISONED BACKUP';
migrations=0;assert.equal(cached.checkForConflict(0),false);assert.equal(migrations,0,'embedded cached validity remains private');assert.deepEqual(plain(cached.list()),stable);assert.deepEqual([0,1,2].map(id=>plain(cached.backup(id))),stableBackups);
for(const changed of ['neighbor-revision','mirror']){
 const latest=JSON.parse(cacheDisk.getItem('hearth-and-oath:slots:v1'));
 if(changed==='neighbor-revision'){latest.slots[1].revision='actual-external-cache-neighbor';cacheDisk.setItem('hearth-and-oath:slots:v1',JSON.stringify(latest));}
 else cacheDisk.setItem('hearth-and-oath:life:v1',JSON.stringify(neighbor));
 migrations=0;assert.ok(cached.write(0,cached.read(0)));assert.equal(migrations,7,changed+': embedded input plus all six durable states fully revalidate');
 const durable=JSON.parse(cacheDisk.getItem('hearth-and-oath:slots:v1'));assert.deepEqual(durable.slots[1],latest.slots[1]);assert.deepEqual(durable.backups,latest.backups);
}
const beforeQuota=[...cacheValues];cacheDisk.failKey='hearth-and-oath:slots:v1';assert.equal(cached.write(0,cached.read(0)),false);assert.deepEqual([...cacheValues],beforeQuota,'embedded quota failure rolls back the mirror without partial envelope changes');assert.equal(cached.available(),false);
cacheDisk.failKey=null;migrations=0;assert.ok(cached.write(0,cached.read(0)));assert.equal(migrations,7,'embedded quota retry invalidates cached durable validity');assert.equal(cached.hasUnsaved(),false);
migrations=0;assert.ok(cached.reload());assert.equal(migrations,6,'explicit embedded reload forces complete durable validation');
globalThis.gc?.();
// Exercise the actually embedded technique, not the imported online module.
const battle=embedded.combat.createBattle({revision:5,seed:'offline-second-wind',difficulty:'balanced',flags:{},rpg:{trainedTechniques:['second_wind'],companionStages:{}},hero:{name:'Bard',path:'rogue',specialization:'bard',hp:35,maxHp:56,mp:5,maxMp:25,potions:0,level:1,attributes:{strength:3,agility:8,vitality:4,intellect:3,willpower:3,presence:3},skills:{weapons:0,defense:0,arcana:0,devotion:0,stealth:1,survival:0,scholarship:2,persuasion:8}},companions:[{id:'mira',name:'Mira',role:'warrior',recruited:true,active:true,hp:25,maxHp:58,mp:4,maxMp:22,agility:5}]},'road_bandits',null,{openingTurns:false});
battle.currentActorId='hero';battle.turnOrder=['hero','mira',...battle.actors.filter(a=>a.side==='enemy').map(a=>a.id)];battle.actors.find(a=>a.id==='hero').status={fear:2,ward:2};
const next=embedded.combat.takeBattleAction(battle,'tech_second_wind','hero'),actor=next.actors.find(a=>a.id==='hero');
assert.equal(actor.mp,0);assert.equal(actor.hp,43);assert.equal(actor.status.ward,6);assert.equal(actor.status.fear,undefined);assert.equal(next.currentActorId,'mira');
console.log(JSON.stringify({version,bytes:manifest.bytes,parts:manifest.parts.length,sha256:expectedHash,checks:['exact offline part parity','embedded neighboring-slot preservation','embedded same-slot conflict','exact unsaved-session export','explicit reload and recovery backup','embedded Second Wind full self cost and unchanged recovery','embedded private warm cache with mandatory incoming validation and both durable reads','embedded complete unchanged lives/backups/revision metadata','embedded public-copy isolation','embedded external neighbor and mirror full revalidation','embedded quota rollback, invalidation and explicit reload'],network:'forbidden',surface:'semantic DOM; actual browser and physical touch not verified'},null,2));
