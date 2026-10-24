// Art and audio use one frozen table from the exact inert element; native per-realm asset allocation is separate evidence.
// Legacy semantic probes use the exact graph prefix in classic scope and the unchanged async module tail; complete module scope is separately verified by v71.
import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// Bounded exact-artifact handler smoke. Disposable semantic surface only.
// Run only after the build has finished and runtime source is frozen:
// node --max-old-space-size=2048 --expose-gc scripts/verify-offline-infancy-mail-v57.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {createContext,Script} from 'node:vm';
import {setImmediate as turn} from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity} from './lib/release-identity.mjs';
import {freshStory} from '../tests/helpers/story-life-fixtures.mjs';
import {createIronmanMetadata} from '../dist/js/ironman.js';
import {createSaveStore,createSaveCoordinator} from '../dist/js/saves.js';
import {migrateSave} from '../dist/js/engine.js';
import {receiveNotification} from '../dist/js/notifications-v40.js';

const project=new URL('../',import.meta.url).pathname;
const KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1',PREFIX='hearth-and-oath:ironman-run:v1:';
const hash=value=>createHash('sha256').update(value).digest('hex');
const ownBytes=readFileSync(new URL(import.meta.url)),ownHash=hash(ownBytes);
assert.equal(typeof globalThis.gc,'function','use --expose-gc for serial VM teardown');
const identity=await validateOfflineIdentity(project);
let artifact=readFileSync(project+'/artifacts/hearth-and-oath.html');
assert.equal(hash(artifact),identity.sha256);
let html=installOfflineDocument(artifact.toString('utf8'));artifact=null;
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);
let code=html.slice(start+tag.length,end);html=null;
assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=compileOfflineModule(code,{filename:'exact-standalone-ironman-smoke.js', legacyProbes: true, shareInertMedia: true});code=null;globalThis.gc();
let sessions=0,handlerChecks=0,exports=0,lockEntries=0,networkAttempts=0;
const flush=async()=>{for(let n=0;n<8;n++)await turn();};
const standardBytes=ui=>[ui.storage.getItem(KEY),ui.storage.getItem(MIRROR)];
const phase=ui=>ui.root.querySelector('[data-ironman-status]')?.dataset.phase||(ui.root.querySelector('.game-frame')?'ready':null);
const heads=ui=>[...ui.values].filter(([key])=>key.startsWith(PREFIX));
const head=ui=>{const rows=heads(ui);assert.equal(rows.length,1);return JSON.parse(rows[0][1]);};

async function session(label,entries,run){
 let ui=fakeSurface(),context=null,timer=0,chain=Promise.resolve(),held=false,releaseHeld;
 const timers=new Map(),blobs=[],windowListeners=new Map();
 for(const [key,value]of entries)ui.storage.setItem(key,value);
 const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in exact compiled smoke');};
 const blocked={fetch:forbidden,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 const locks={request(name,options,consume){
  assert.equal(name,'hearth-and-oath:save:v1');assert.equal(options.mode,'exclusive');
  const next=chain.then(async()=>{if(held)await new Promise(resolve=>releaseHeld=resolve);lockEntries++;return consume({name,mode:'exclusive'});});
  chain=next.catch(()=>{});return next;
 }};
 class OfflineURL extends URL{static createObjectURL(blob){blobs.push(blob);return 'blob:ironman-smoke-'+blobs.length;}static revokeObjectURL(){}}
 ui.document.createElement=tag=>{assert.equal(tag,'a');return {click(){assert.match(this.href,/^blob:ironman-smoke-/);}};};
 const window={innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},navigator:{locks,sendBeacon:forbidden},...blocked,addEventListener(type,handler){const rows=windowListeners.get(type)||[];rows.push(handler);windowListeners.set(type,rows);}};
 context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window,navigator:window.navigator,location:{href:'file:///fictional-qa/hearth-and-oath.html',protocol:'file:'},crypto:webcrypto,
  requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout(fn,delay){const id=++timer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
  Blob,URL:OfflineURL,AbortController,AbortSignal,Uint8Array,Uint32Array,ArrayBuffer,TextEncoder,TextDecoder,queueMicrotask,console,...blocked});
 try{
  new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
  await compiled.evaluate(context,{timeout:30000});sessions++;await flush();
  const api={get ui(){return ui;},blobs,head:()=>head(ui),bytes:()=>standardBytes(ui),phase:()=>phase(ui),
   async click(op,id){await ui.click(op,id);await flush();handlerChecks++;},
   async submit(){await ui.submit();await flush();handlerChecks++;},
   hold(){assert.equal(held,false);held=true;},
   async release(){held=false;releaseHeld?.();releaseHeld=null;await flush();},
   async unload(){const event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const fn of windowListeners.get('beforeunload')||[])await fn(event);return event;},
   async export(){if(!ui.root.querySelector('[data-op="export"]'))await this.click('menu');const count=blobs.length;await this.click('export');assert.equal(blobs.length,count+1);exports++;return JSON.parse(await blobs.at(-1).text());},
  };
  console.log('Compiled Ironman scenario: '+label);
  return await run(api);
 }finally{held=false;releaseHeld?.();await chain;timers.clear();windowListeners.clear();ui.root.innerHTML='';ui=null;context=null;globalThis.gc();}
}

let savedEntries,accepted;
await session('actual newborn creator, one held mutation, protected rehearsal and export',[],async h=>{
 const originalStandard=h.bytes();
 await h.click('title-new');await h.click('slot-new','0');
 assert.equal(h.ui.root.querySelector('[name="lifeMode"]').value,'standard');assert.equal(h.ui.root.querySelector('#life-mode-rules'),null);
 h.ui.set('name','Fictional Compiled Rowan');h.ui.set('startAge','0');h.ui.set('lifeMode','ironman');
 await h.click('creator-step','1');assert.equal(h.ui.root.querySelector('[name="lifeMode"]').value,'ironman');
 await h.click('creator-step','2');assert.ok(h.ui.root.querySelector('[data-creator-review]'));await h.submit();assert.equal(h.phase(),'ready');
 const opening=h.head();assert.equal(opening.state.hero.name,'Fictional Compiled Rowan');assert.equal(opening.state.age,0);
 assert.equal(opening.state.ironman.runId,opening.runId);assert.equal(opening.state.ironman.startedDay,opening.state.day);assert.deepEqual(opening.casualties,[]);assert.equal(opening.attachment.slotId,0);
 assert.deepEqual(h.bytes(),originalStandard,'Ironman creator leaves complete Standard raw bytes unchanged');
 const choice=h.ui.root.querySelectorAll('[data-op="choice"]').find(n=>!n.disabled);assert.ok(choice,'actual newborn watching control exists');assert.equal(choice.dataset.id,'continue');assert.match(choice.textContent,/Continue watching/i);assert.ok((opening.state.inbox?.entries||[]).every(n=>n.kind!=='letter'));
 h.hold();await h.ui.fire('click',choice);await flush();handlerChecks++;
 assert.equal(h.phase(),'pending');assert.deepEqual(h.head(),opening,'pending candidate is not playable or durable');assert.ok(h.ui.root.querySelector('.game-frame'),'pending save retains the current game');assert.equal(h.ui.root.querySelector('#ironman-status-heading'),null,'pending save never replaces the game with a confirmation screen');
 assert.equal((await h.unload()).defaultPrevented,true);await h.ui.fire('click',choice);await flush();handlerChecks++;
 assert.equal(h.blobs.length,0);await h.release();assert.equal(h.phase(),'ready');
 accepted=h.head();assert.notEqual(accepted.revision,opening.revision);assert.notDeepEqual(accepted.state,opening.state);assert.deepEqual(h.bytes(),originalStandard);
 await h.click('menu');await h.click('practice-open','protect_ally');assert.ok(h.ui.root.querySelector('.practice-modal'));
 await h.click('practice-action','defend');assert.deepEqual(h.head(),accepted,'protected practice spends no live life resources');
 await h.click('practice-close');assert.equal(h.ui.root.querySelector('.practice-modal'),null);
 assert.deepEqual(await h.export(),accepted.state,'fresh guarded export exactly equals accepted full head');
 assert.deepEqual(h.bytes(),originalStandard);savedEntries=[...h.ui.values];
});
await session('fresh compiled boot, real slot-load and exact protected re-export',savedEntries,async h=>{
 await h.click('title-load');await h.click('slot-load','0');assert.equal(h.phase(),'ready');
 assert.deepEqual(h.head(),accepted);assert.deepEqual(await h.export(),accepted.state);
});

const letterLife=freshStory();
letterLife.ironman=createIronmanMetadata(letterLife,{randomUUID:()=> '41335577-99bb-4ddf-a123-456789abcdef'});
const letter=receiveNotification(letterLife,{kind:'letter',sourceId:'compiled-v57-mail',title:'A page from home',body:'The winter rain has finally stopped. These retained words open before their read receipt is saved.'});
const fixtureSurface=fakeSurface(),fixtureLocks={request:async(name,options,consume)=>consume({name,mode:options.mode})};
const fixtureStore=createSaveStore(fixtureSurface.storage,migrateSave,{coordinate:createSaveCoordinator(fixtureLocks),crypto:webcrypto});
const admission=await fixtureStore.inspectIronman(letterLife,{intent:'import',slot:0});assert.equal(admission.status,'review');
assert.equal((await fixtureStore.commitIronman(0,letterLife,{intent:'import',token:admission.token})).status,'committed');
await session('letter text opens while the read receipt awaits its existing authority lock',[...fixtureSurface.values],async h=>{
 await h.click('title-continue');await h.click('notifications');const before=h.head();
 h.hold();await h.click('notice-open',letter.id);
 assert.match(h.ui.root.querySelector('.inbox-letter').textContent,/winter rain has finally stopped/);
 assert.equal(h.ui.root.querySelector('#ironman-status-heading'),null);
 assert.deepEqual(h.head(),before,'unconfirmed read metadata never overwrites the saved position');
 assert.equal((await h.unload()).defaultPrevented,true,'the existing pending-save fence still protects exit');
 await h.release();assert.equal(h.head().state.inbox.entries.find(n=>n.id===letter.id).read,true);
 const confirmed=h.head(),entries=lockEntries;
 await h.click('notice-open',letter.id);await h.click('notice-open',letter.id);
 assert.equal(lockEntries,entries,'reopening an already read letter needs no new save check');assert.deepEqual(h.head(),confirmed);
});

compiled=null;globalThis.gc();
await validateUnchangedOfflineIdentity(project,identity);
assert.equal(hash(readFileSync(new URL(import.meta.url))),ownHash);assert.equal(networkAttempts,0);
const report={version:identity.version,artifactSha256:identity.sha256,runtimeSha256:identity.source.sha256,buildGit:identity.buildGit,verifierSha256:ownHash,sessions,handlerChecks,exports,lockEntries,networkAttempts,
 checks:['one exact unchanged embedded graph','real creator Standard default and explicit Ironman retained between steps','guarded newborn first save with Standard bytes unchanged','held exclusive lock keeps one living candidate detached; stale control fenced; unload protected','protected rehearsal Defend/leave leaves live head unchanged','fresh locked exact export','fresh VM actual slot load and exact re-export','pending save keeps the game visible without a confirmation screen','newborn observation control and no infant letters','creator retains life-mode selector without rules block','letter body remains visible during its pending read save; authority fence retained','reopening a read letter performs no save transaction','artifact/runtime/parts/loader identity unchanged before and after'],
 limits:'Art and audio use one frozen table from the exact inert element; native per-realm asset allocation is separate evidence. Legacy semantic probes use the exact graph prefix in classic scope and the unchanged async module tail; complete module scope is separately verified by v71. Controlled fakeSurface DOM, Map storage and real-shaped serialized Web Lock callbacks only. No native browser storage, actual browser Web Locks, downloads, rendering, accessibility, physical device, two-tab or offline transport certification. No full life, earned route, mortality fixture, full regression or release certification.'};
console.log(JSON.stringify(report,null,2));
if(process.argv[2])writeFileSync(new URL(process.argv[2],new URL('../',import.meta.url)),JSON.stringify(report,null,2)+'\n');
