import {MAX_SAVE_CHARS} from '../dist/js/save-limits.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {createSaveCoordinator,createSaveStore,LEGACY_SAVE_KEY} from '../dist/js/saves.js';
import {getContacts,getThread} from '../dist/js/conversations.js';
import {levyDisclosureFor} from '../dist/js/winter-levy-aftermath.js';
import {intrigueJournalRows} from '../dist/js/local-intrigue.js';
import {base,completed,household,action,clone,reload,valid} from './helpers/winter-levy-fixtures.mjs';

const KEY='hearth-and-oath-legacy:slots:v1';
function storage(){const values=new Map();let readOnly=false,attempts=0;return {values,getItem:k=>values.get(k)??null,setItem(k,v){if(readOnly){attempts++;throw Error('Read attempted a durable write.');}values.set(k,String(v));},removeItem(k){if(readOnly){attempts++;throw Error('Read attempted durable removal.');}values.delete(k);},forbid(){readOnly=true;},get attempts(){return attempts;}};}
const disk=s=>[...s.values.entries()].sort(([a],[b])=>a.localeCompare(b));
async function admitted(state){const memory=storage(),coordinate=createSaveCoordinator({request:async(_name,_options,fn)=>fn()}),store=createSaveStore(memory,E.migrateSave);assert.ok(await coordinate(()=>store.replace(1,base())));assert.ok(await coordinate(()=>store.replace(0,base())));assert.ok(await coordinate(()=>store.replace(0,state,{reviewed:true,token:store.reviewToken(0)})));return {memory,store,coordinate};}

for(const pending of [false,true])test('actual Standard store fresh/repeated reads preserve all bytes '+(pending?'with exact pending':'without optional ledger'),async()=>{
 let {s,id}=household(completed());if(pending)s=action(s,'talk_levy_household_'+id);s=reload(s);assert.equal(s.conversations.levyAftermath,undefined);
 const {memory,store}=await admitted(s),before=disk(memory),head=memory.getItem(KEY),mirror=memory.getItem(LEGACY_SAVE_KEY),expectedPending=clone(s.conversations.pending);memory.forbid();
 for(let n=0;n<3;n++){
  const fresh=createSaveStore(memory,E.migrateSave);assert.equal(fresh.active(),0);assert.deepEqual(fresh.read(0),s);assert.deepEqual(fresh.read(0).conversations.pending,expectedPending);assert.equal(fresh.read(0).conversations.levyAftermath,undefined);
  fresh.list();fresh.health(0);fresh.health(1);fresh.backup(0);fresh.reviewToken(0);fresh.checkForConflict(0);assert.ok(fresh.reload());
  const read=fresh.read(0);E.getActions(read);getContacts(read);getThread(read,id);intrigueJournalRows(read,{archive:true});assert.equal(levyDisclosureFor(read,id),null);assert.deepEqual(read,s);
 }
 assert.deepEqual(store.read(0),s);assert.equal(memory.getItem(KEY),head);assert.equal(memory.getItem(LEGACY_SAVE_KEY),mirror);assert.deepEqual(disk(memory),before);assert.equal(memory.attempts,0,'all current-path reads were write-free');
});

test('actual coordinated Standard reply write preserves exact unrelated rows and recovery backups',async()=>{
 let {s,id}=household(completed());s=action(s,'talk_levy_household_'+id);const {memory,store,coordinate}=await admitted(s),before=JSON.parse(memory.getItem(KEY)),neighbor=JSON.stringify(before.slots[1]),empty=JSON.stringify(before.slots[2]),backups=JSON.stringify(before.backups);
 const replied=valid(E.replyMessage(store.read(0),id,'limited'));assert.ok(await coordinate(()=>store.write(0,replied)));const after=JSON.parse(memory.getItem(KEY));assert.deepEqual(after.slots[0].state,replied);assert.deepEqual(JSON.parse(memory.getItem(LEGACY_SAVE_KEY)),replied);assert.equal(JSON.stringify(after.slots[1]),neighbor);assert.equal(JSON.stringify(after.slots[2]),empty);assert.equal(JSON.stringify(after.backups),backups);
 const fresh=createSaveStore(memory,E.migrateSave),r=fresh.read(0);assert.deepEqual(r,replied);assert.equal(r.conversations.levyAftermath.length,1);assert.equal(levyDisclosureFor(r,id).scope,'limited');assert.deepEqual(E.replyMessage(r,id,'limited'),r);
});

test('bounded aftermath cannot bypass the shared bounded save rejection',async()=>{
 let {s,id}=household(completed());s=action(s,'talk_levy_household_'+id);
 // Controlled legal bulk-Journal fixture solely for serialization capacity.
 // These rows are NOT claimed as earned play or a player-authored saved life.
 const target=MAX_SAVE_CHARS-500;let n=0;
 const row=text=>({id:'levy-capacity-fixture-'+(++n),title:'Controlled capacity fixture',text,day:s.day,age:s.age,tag:'fixture',generation:s.dynasty.generation});
 while(JSON.stringify(s).length<target-10200)s.journal.push(row('x'.repeat(10000)));
 s.journal.push(row('x'));const last=s.journal.at(-1);last.text+='x'.repeat(Math.min(9999,Math.max(0,target-JSON.stringify(s).length)));
 valid(s,'near-limit controlled legal Standard save');assert.ok(JSON.stringify(s).length>MAX_SAVE_CHARS-1000&&JSON.stringify(s).length<=MAX_SAVE_CHARS);
 const {memory,store,coordinate}=await admitted(s),nearLimitChars=JSON.stringify(s).length,replied=valid(E.replyMessage(store.read(0),id,'honest'));assert.equal(replied.conversations.levyAftermath.length,1);const repliedChars=JSON.stringify(replied).length;assert.ok(repliedChars<=MAX_SAVE_CHARS,'genuine reply releases its pending snapshot within the existing budget');assert.ok(await coordinate(()=>store.write(0,replied)));assert.deepEqual(JSON.parse(memory.getItem(KEY)).slots[0].state,replied);
 // Separate controlled oversized clone, NOT an earned-play or oversized-real-
 // reply claim. Every padding row retains the legal per-entry text bound.
 const before=disk(memory),oversized=clone(replied);while(JSON.stringify(oversized).length<=MAX_SAVE_CHARS)oversized.journal.push(row('x'.repeat(10000)));const oversizedChars=JSON.stringify(oversized).length;assert.equal(oversized.conversations.levyAftermath.length,1);assert.ok(oversizedChars>MAX_SAVE_CHARS);assert.equal(E.validateSave(oversized),false);assert.equal(await coordinate(()=>store.write(0,oversized)),false);assert.deepEqual(disk(memory),before,'controlled oversized save cannot overwrite any durable slot or backup');console.log(JSON.stringify({nearLimitChars,repliedChars,oversizedChars}));
});
