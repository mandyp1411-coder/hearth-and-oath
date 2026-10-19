// Semantic handler verification of the actual standalone bundle. No network.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createContext,Script} from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import * as E from '../dist/js/engine.js';
import {groundedDialogue} from '../dist/js/grounded-narrative-content.js';
import {getContacts} from '../dist/js/conversations.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root));
const html=installOfflineDocument(read('artifacts/hearth-and-oath.html').toString('utf8')),code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
assert.doesNotMatch(code,/^import\s/m);const compiled=new Script(code,{filename:'standalone-followups-v43.js'});console.log('Standalone bundle parsed.');globalThis.gc?.();
// Adopt the old controlled life before writing an envelope. Validation alone
// allows an absent optional sidecar; current migration legitimately adds it.
// All later neighbor assertions compare canonical complete state and metadata.
let s=E.migrateSave(JSON.parse(gunzipSync(read('tests/fixtures/v30-explore-travel.json.gz'))).states.base);assert.ok(s);assert.deepEqual(E.migrateSave(s),s);
const smith=settlementServices(s).find(r=>r.kind==='smith');for(const room of settlementWalkPath(s,smith.roomId))s=E.chooseAction(s,'atlas_room_'+room);s=E.visitService(s,smith.id);
const p=getContacts(s).find(p=>p.id===smith.personId);for(let i=0;i<80&&groundedDialogue(s,p).title!=='A Stubborn Repair';i++)s.day++;
s=E.chooseAction(s,'talk_'+p.id);assert.equal(s.conversations.pending.snapshot.title,'A Stubborn Repair');s=E.replyMessage(s,p.id,'ask');s.day++;
// Exercise exact legacy recognition in the embedded code, not a pre-opened scene.
delete s.conversations.followUps;assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(s),s);const other=structuredClone(s);assert.ok(E.validateSave(other));
function boot(state){
 const ui=fakeSurface();ui.storage.setItem('hearth-and-oath:slots:v1',JSON.stringify({version:1,activeSlot:0,backups:{},slots:[{id:0,state,updatedAt:'2026-10-17T00:00:00Z',revision:'followup-active-v48'},{id:1,state:other,updatedAt:'2026-10-17T00:00:00Z',revision:'followup-neighbor-v48'},{id:2,state:null}]}));ui.storage.setItem('hearth-and-oath:life:v1',JSON.stringify(state));
 const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window:{innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){}},requestAnimationFrame:cb=>{cb();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout:()=>1,clearTimeout(){},Blob,URL,TextEncoder,TextDecoder,console,queueMicrotask,fetch:()=>{throw Error('Network forbidden during standalone verification');}});
 new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);compiled.runInContext(context);return ui;
}
let ui=boot(s);console.log('Standalone shell booted.');globalThis.gc?.();await ui.click('title-continue');globalThis.gc?.();console.log('Continued original life.');await ui.click('tab','map');globalThis.gc?.();await ui.click('place-open');globalThis.gc?.();console.log('Opened place.');
await ui.click('service-open',smith.id);globalThis.gc?.();
await ui.click('spatial-contact',p.id);globalThis.gc?.();const before=ui.current();await ui.click('activity','talk_'+p.id);globalThis.gc?.();console.log('Opened remembered follow-up.');assert.match(ui.root.innerHTML,/You asked what was wrong with that repair/);assert.equal(ui.current().conversations.pending.snapshot.followUp.key,'repair');assert.equal(ui.current().conversations.followUps,undefined);assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.deepEqual(ui.current().equipment,before.equipment);assert.deepEqual(ui.current().hero.skills,before.hero.skills);assert.ok(E.validateSave(ui.current()));
globalThis.gc?.();console.log('Verified captured source and unchanged resources.');const stale=ui.root.querySelector('[data-op="reply"][data-id="share"]');assert.ok(stale);await ui.click('reply','share');globalThis.gc?.();console.log('Submitted contextual reply.');assert.equal(ui.current().conversations.followUps[0].choiceId,'share');assert.match(ui.root.innerHTML,/A keepsake and a useful tool/);assert.ok(isDeepStrictEqual(ui.lives()[1],JSON.parse(JSON.stringify(other))),'Other occupied slot unchanged');assert.deepEqual(JSON.parse(ui.storage.getItem('hearth-and-oath:slots:v1')).slots[1],{id:1,state:JSON.parse(JSON.stringify(other)),updatedAt:'2026-10-17T00:00:00Z',revision:'followup-neighbor-v48'},'Neighbor durable state, revision and timestamp unchanged');const after=ui.current();await ui.fire('click',stale);assert.deepEqual(ui.current(),after);assert.ok(E.validateSave(after));
console.log('Standalone follow-up verification passed: embedded exact played antecedent recognition, contextual choice, no speculative migration/backfill, unchanged time/Gold/materials/skills, captured pending snapshot, one completed durable receipt, stale click rejection and untouched other slot. Network forbidden. Semantic DOM only, not browser geometry or physical-device testing.');
