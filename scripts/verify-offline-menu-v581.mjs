// Bounded exact-artifact handler smoke. Disposable semantic surface only.
// Run only after the build has finished and runtime source is frozen:
// node --max-old-space-size=2048 --expose-gc scripts/verify-offline-menu-v581.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
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
const opening=readFileSync(project+'/dist/index.html','utf8');
const openingShell=opening.match(/<div id="app">([\s\S]*?)<\/div>\s*<div id="view-status"/)[1];
const openingGuard=opening.match(/<script id="boot-guard">([\s\S]*?)<\/script>/)[1];
assert.ok(html.includes(openingShell),'the shipped standalone preserves the exact themed boot shell');
assert.equal(html.match(/<script id="boot-guard">([\s\S]*?)<\/script>/)[1],openingGuard,'the shipped guard is the exact source guard exercised by boot-recovery.test.js');
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);
let code=html.slice(start+tag.length,end);html=null;
assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=new Script(code,{filename:'exact-standalone-ironman-smoke.js'});code=null;globalThis.gc();
let sessions=0,handlerChecks=0,exports=0,lockEntries=0,networkAttempts=0;
const flush=async()=>{for(let n=0;n<8;n++)await turn();};
const standardBytes=ui=>[ui.storage.getItem(KEY),ui.storage.getItem(MIRROR)];
const phase=ui=>ui.root.querySelector('[data-ironman-status]')?.dataset.phase||(ui.root.querySelector('.game-frame')?'ready':null);
const heads=ui=>[...ui.values].filter(([key])=>key.startsWith(PREFIX));
const head=ui=>{const rows=heads(ui);assert.equal(rows.length,1);return JSON.parse(rows[0][1]);};

async function session(label,entries,run){
 let ui=fakeSurface(),context=null,timer=0,chain=Promise.resolve(),held=false,denied=false,releaseHeld;
 const timers=new Map(),blobs=[],windowListeners=new Map();
 for(const [key,value]of entries)ui.storage.setItem(key,value);
 const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in exact compiled smoke');};
 const blocked={fetch:forbidden,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 const locks={request(name,options,consume){
  assert.equal(name,'hearth-and-oath:save:v1');assert.equal(options.mode,'exclusive');
  if(denied)return Promise.reject(Error('Controlled compiled lock unavailable'));
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
  compiled.runInContext(context,{timeout:30000});sessions++;await flush();
  const api={get ui(){return ui;},blobs,head:()=>head(ui),bytes:()=>standardBytes(ui),phase:()=>phase(ui),
   async click(op,id){await ui.click(op,id);await flush();handlerChecks++;},
   async submit(){await ui.submit();await flush();handlerChecks++;},
   hold(){assert.equal(held,false);held=true;},
   async release(){held=false;releaseHeld?.();releaseHeld=null;await flush();},
   async unload(){const event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const fn of windowListeners.get('beforeunload')||[])await fn(event);return event;},
   async export(){if(!ui.root.querySelector('[data-op="export"]'))await this.click('menu');const count=blobs.length;await this.click('export');assert.equal(blobs.length,count+1);exports++;return JSON.parse(await blobs.at(-1).text());},
  };
  api.denyLock=value=>{denied=value;};
  console.log('Compiled menu/regression scenario: '+label);
  return await run(api);
 }finally{held=false;releaseHeld?.();await chain;timers.clear();windowListeners.clear();ui.root.innerHTML='';ui=null;context=null;globalThis.gc();}
}

let savedEntries,accepted;
await session('actual newborn creator, one held mutation, protected rehearsal and export',[],async h=>{
 const originalStandard=h.bytes();
 await h.click('title-new');await h.click('slot-new','0');
 assert.equal(h.ui.root.querySelector('[name="lifeMode"]').value,'standard');assert.equal(h.ui.root.querySelector('#life-mode-rules'),null);
 h.ui.set('name','Fictional Compiled Rowan');h.ui.set('startAge','0');h.ui.set('lifeMode','ironman');
 await h.click('creator-step','1');await h.click('creator-step','2');assert.match(h.ui.root.innerHTML,/Ironman — combat death ends this life/);
 await h.submit();assert.equal(h.phase(),'ready');
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

const noteLife=freshStory();noteLife.flags.herbs=4;
const noteSlots={version:1,activeSlot:0,backups:{},slots:[0,1,2].map(id=>({id,state:id===0?noteLife:null,updatedAt:id===0?'2026-10-18T00:00:00.000Z':null}))};
await session('personal drafts, durable retries, herbal review and route focus',[[KEY,JSON.stringify(noteSlots)],[MIRROR,JSON.stringify(noteLife)]],async h=>{
 const current=()=>JSON.parse(h.ui.storage.getItem(MIRROR));
 await h.click('title-continue');await h.click('tab','journal');await h.click('workspace-section','journal:notes');
 const text='Keep these exact words: élan Ω <literal>.';
 let field=h.ui.root.querySelector('#note-text');field.value=text;await h.ui.fire('input',field);handlerChecks++;
 const original=current();await h.click('tab','inventory');await h.click('tab','journal');assert.equal(h.ui.root.querySelector('#note-text').value,text);assert.deepEqual(current(),original);
 await h.click('personal-note-write');assert.equal(h.ui.document.activeElement.id,'note-text');
 h.hold();let form=h.ui.root.querySelector('#player-note');await h.ui.fire('submit',form);await flush();handlerChecks++;
 assert.equal(h.ui.root.querySelector('#note-text').value,text);assert.deepEqual(current(),original);await h.ui.fire('submit',form);handlerChecks++;
 await h.release();assert.equal(current().playerNotes.filter(n=>n.text===text).length,1);assert.equal(h.ui.root.querySelector('#note-text').value,'');
 field=h.ui.root.querySelector('#note-text');field.value='Retain me when browser saving fails.';await h.ui.fire('input',field);handlerChecks++;
 const write=h.ui.storage.setItem,beforeFailed=current();h.ui.storage.setItem=(key,value)=>{if([KEY,MIRROR].includes(key))throw Error('controlled compiled note quota');return write(key,value);};
 await h.ui.fire('submit',h.ui.root.querySelector('#player-note'));await flush();handlerChecks++;assert.deepEqual(current(),beforeFailed);assert.equal(h.ui.root.querySelector('#note-text').value,field.value);
 h.ui.storage.setItem=write;await h.ui.fire('submit',h.ui.root.querySelector('#player-note'));await flush();handlerChecks++;
 assert.equal(current().playerNotes.filter(n=>n.text===field.value).length,1);assert.equal(h.ui.root.querySelector('#note-text').value,'');
 await h.click('tab','inventory');await h.click('inventory-item','supply:herbs');const beforeCare=current();
 await h.click('use-consumable','herbs');assert.ok(h.ui.root.querySelector('.herbal-care-dialog'));assert.deepEqual(current(),beforeCare);
 await h.click('close-modal');assert.deepEqual(current(),beforeCare);await h.click('use-consumable','herbs');await h.click('herbal-care-confirm');assert.equal(current().flags.herbs,beforeCare.flags.herbs-1);assert.equal(current().day,beforeCare.day+2);assert.match(current().notice,/Actual session changes/);
 await h.click('title-menu');await h.click('title-settings');assert.equal(h.ui.document.activeElement.tagName,'H1');await h.click('title-menu');await h.click('title-load');assert.equal(h.ui.document.activeElement.id,'slot-heading');
});

await session('creator review, portrait preview cancellation and failed first-save retry',[],async h=>{
 await h.click('title-new');await h.click('slot-new','0');h.ui.set('name','Fictional Reviewed Life');h.ui.set('startAge','0');await h.click('creator-step','1');assert.equal(h.ui.current(),null);assert.equal(h.ui.root.querySelector('.begin-button'),null);
 await h.click('creator-portraits');const face=h.ui.root.querySelector('[data-op="gallery-preview"]');await h.click('gallery-preview',face.dataset.id);assert.ok(h.ui.root.querySelector('[data-op="gallery-select"]'));await h.click('close-modal');assert.equal(h.ui.document.activeElement.dataset.op,'creator-portraits');
 await h.click('creator-step','2');assert.match(h.ui.root.innerHTML,/Begin This Life/);assert.equal(h.ui.current(),null);
 const write=h.ui.storage.setItem;h.ui.storage.setItem=(key,value)=>{if(key===KEY)throw Error('controlled compiled first-save quota');write(key,value);};await h.submit();assert.equal(h.ui.current(),null);assert.match(h.ui.root.innerHTML,/draft and generated life are retained/);assert.equal(h.ui.root.querySelector('[name="name"]').value,'Fictional Reviewed Life');
 h.ui.storage.setItem=write;await h.submit();assert.equal(h.ui.current().hero.name,'Fictional Reviewed Life');assert.equal(h.ui.current().age,0);assert.equal(h.ui.root.querySelector('#character-form'),null);
});
const pairLife=migrateSave(JSON.parse(gunzipSync(readFileSync(project+'/tests/fixtures/v30-explore-travel.json.gz'))).states.base);pairLife.event=null;pairLife.battle=null;pairLife.socialLife.games=Math.max(1,pairLife.socialLife.games);pairLife.socialLife.game={id:1,faces:[0,0,1,1,2,2,3,3,4,4,5,5],matched:[0,1,2,3,4,5,6,7,8,9],revealed:[],moves:5};
const pairSlots={version:1,activeSlot:0,backups:{},slots:[0,1,2].map(id=>({id,state:id===0?pairLife:null,updatedAt:id===0?'2026-10-18T19:00:00.000Z':null}))};
await session('runestone local finish, exact focus and one explicit day',[[KEY,JSON.stringify(pairSlots)],[MIRROR,JSON.stringify(pairLife)]],async h=>{
 await h.click('title-continue');await h.click('tab','activities');await h.click('activities-pane','fun');const before=h.ui.current();await h.click('activity','fun_pair_10');assert.equal(h.ui.document.activeElement.dataset.id,'fun_pair_11');
 const held=await h.ui.key('Enter',{target:h.ui.document.activeElement,repeat:true});handlerChecks++;assert.equal(held.defaultPrevented,true);assert.equal(h.ui.current().socialLife.game.revealed.length,1);
 await h.click('activity','fun_pair_11');assert.equal(h.ui.current().day,before.day);assert.equal(h.ui.document.activeElement.id,'runestone-status');assert.equal(h.ui.root.querySelectorAll('[data-op="activity"][data-id="fun_pairs_finish"]').length,1);
 await h.click('tab','inventory');await h.click('tab','activities');await h.click('activities-pane','fun');await h.click('activity','fun_pairs_finish');assert.equal(h.ui.current().day,before.day+1);assert.equal(h.ui.current().socialLife.game,null);assert.match(h.ui.current().notice,/Actual session changes/);
});

await session('empty title, keyboard navigation, real help and rehearsal return',[],async h=>{
 const original=h.bytes(),control=op=>h.ui.root.querySelector(`[data-op="${op}"]`);
 assert.equal(control('title-continue'),null);assert.equal(control('title-new').classList.contains('title-begin'),true);assert.equal(control('title-load').disabled,true);assert.ok(control('import'));
 control('fullscreen').focus();await h.ui.key('ArrowUp');handlerChecks++;assert.equal(h.ui.document.activeElement.dataset.op,'import');
 await h.ui.key('Home');handlerChecks++;assert.equal(h.ui.document.activeElement.dataset.op,'title-new');
 await h.click('help');assert.ok(h.ui.root.querySelector('.help-topic'));await h.ui.key('Escape');handlerChecks++;assert.equal(h.ui.document.activeElement.dataset.op,'help');
 await h.click('title-settings');assert.equal(h.ui.document.activeElement.tagName,'H1');await h.ui.key('Escape');handlerChecks++;assert.equal(h.ui.document.activeElement.dataset.op,'title-settings');
 await h.click('practice-open','protect_ally');assert.ok(h.ui.root.querySelector('.practice-modal'));await h.click('practice-close');assert.equal(h.ui.document.activeElement.dataset.op,'practice-open');
 assert.deepEqual(h.bytes(),original);await h.click('title-new');assert.equal(h.ui.document.activeElement.id,'slot-heading');assert.deepEqual(h.bytes(),original);
});

const menuLives=[0,1,2].map(id=>{const s=freshStory();s.hero.name='Fictional Menu '+['Alder','Mira','Rowan'][id];s.lineage.people.find(p=>p.id===s.dynasty.activePersonId).name=s.hero.name;assert.ok(migrateSave(s));return s;});
const menuSlots={version:1,activeSlot:1,backups:{},slots:menuLives.map((state,id)=>({id,state,updatedAt:`2026-10-${12+id}T00:00:00.000Z`}))};
await session('Continue shows the active life and returns to that exact character',[[KEY,JSON.stringify(menuSlots)],[MIRROR,JSON.stringify(menuLives[1])]],async h=>{
 const before=h.bytes(),resume=h.ui.root.querySelector('[data-op="title-continue"]');assert.equal(resume.dataset.id,'1');assert.match(resume.textContent,/Fictional Menu Mira/);assert.equal(h.ui.root.querySelector('[data-save-health]').dataset.saveSlot,'1');assert.deepEqual(h.bytes(),before);
 await h.click('title-continue');assert.equal(h.ui.current().hero.name,menuLives[1].hero.name);await h.click('title-menu');assert.equal(h.ui.document.activeElement.dataset.op,'title-continue');
 await h.click('title-load');assert.equal(h.ui.document.activeElement.id,'slot-heading');assert.equal(h.ui.root.querySelectorAll('[data-return-life-card]').length,3);
});

const heldMenu=freshStory();heldMenu.event=null;heldMenu.battle=null;heldMenu.flags.herbs=4;heldMenu.hero.hp=heldMenu.hero.maxHp;heldMenu.life.health=100;heldMenu.life.stress=0;
const heldSlots={version:1,activeSlot:0,backups:{},slots:[0,1,2].map(id=>({id,state:id===0?heldMenu:null,updatedAt:id===0?'2026-10-18T20:00:00.000Z':null}))};
await session('unsaved live title remains navigable when a lock failure prevented the store write',[[KEY,JSON.stringify(heldSlots)],[MIRROR,JSON.stringify(heldMenu)]],async h=>{
 await h.click('title-continue');const before=h.ui.current(),durable=h.bytes();h.denyLock(true);
 await h.click('tab','inventory');await h.click('inventory-item','supply:herbs');await h.click('use-consumable','herbs');await h.click('herbal-care-confirm');
 await h.click('title-menu');assert.match(h.ui.root.querySelector('[data-slot-source]').textContent,/Latest session; not yet saved/);assert.match(h.ui.root.querySelector('[data-save-label]').textContent,/Not saved/);
 await h.click('title-continue');assert.ok(h.ui.root.querySelector('.game-frame'));const live=await h.export();assert.equal(live.flags.herbs,before.flags.herbs-1);assert.equal(live.day,before.day+2);assert.deepEqual(h.bytes(),durable);
 h.denyLock(false);await h.click('save');assert.deepEqual(h.ui.current(),live);
});

compiled=null;globalThis.gc();
await validateUnchangedOfflineIdentity(project,identity);
assert.equal(hash(readFileSync(new URL(import.meta.url))),ownHash);assert.equal(networkAttempts,0);
const report={version:identity.version,artifactSha256:identity.sha256,runtimeSha256:identity.source.sha256,buildGit:identity.buildGit,verifierSha256:ownHash,sessions,handlerChecks,exports,lockEntries,networkAttempts,
 checks:['exact themed boot shell and unchanged save-safe guard embedded in standalone','compiled empty title, correct keyboard wrapping and Home navigation','compiled How to play opens actual help topics and returns focus','compiled Settings and rehearsal preserve title focus and saved bytes','compiled Continue previews and enters the exact active life','compiled Standard unsaved session returns immediately after pre-write lock failure and retries exactly','compiled creator final review and exact generated first-save retry','compiled portrait previews cancel without committing','compiled Runestone last flip is free, held input is ignored, board focus is local and explicit Finish spends exactly one day','compiled personal-note navigation retention and focused Write Note entry','compiled held note save retains text until durability','compiled quota retry creates exactly one note','compiled herbal review and cancellation are non-mutating; commit discloses actual result','compiled Settings and Load route focus','one exact unchanged embedded graph','real creator Standard default and explicit Ironman retained between steps','guarded newborn first save with Standard bytes unchanged','held exclusive lock keeps one living candidate detached; stale control fenced; unload protected','protected rehearsal Defend/leave leaves live head unchanged','fresh locked exact export','fresh VM actual slot load and exact re-export','pending save keeps the game visible without a confirmation screen','newborn observation control and no infant letters','creator retains life-mode selector without rules block','letter body remains visible during its pending read save; authority fence retained','reopening a read letter performs no save transaction','artifact/runtime/parts/loader identity unchanged before and after'],
 limits:'Controlled fakeSurface DOM, Map storage and real-shaped serialized Web Lock callbacks only. No native browser storage, actual browser Web Locks, downloads, rendering, accessibility, physical device, two-tab or offline transport certification. No full life, earned route, mortality fixture, full regression or release certification.'};
console.log(JSON.stringify(report,null,2));
if(process.argv[2])writeFileSync(new URL(process.argv[2],new URL('../',import.meta.url)),JSON.stringify(report,null,2)+'\n');
