import { isDeepStrictEqual } from 'node:util';
// Exact shipped graph; disposable semantic UI, never browser/layout evidence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { setImmediate as turn } from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import { freshStory, roundtrip } from '../tests/helpers/story-life-fixtures.mjs';
import { routineReview, executeRoutine } from '../dist/js/routine-planner.js';
import { getActions, chooseAction, getLifeCommitment } from '../dist/js/engine.js';
import { receiveNotification, notificationsFor, markNotificationsRead } from '../dist/js/notifications-v40.js';
import { validateOfflineIdentity, validateUnchangedOfflineIdentity } from './lib/release-identity.mjs';

const root=new URL('../',import.meta.url).pathname,hash=v=>createHash('sha256').update(v).digest('hex');
console.log('Checking complete offline identity.');
const own=readFileSync(new URL(import.meta.url)),identity=await validateOfflineIdentity(root);
console.log('Reading the exact compiled graph.');
let bytes=readFileSync(root+'/artifacts/hearth-and-oath.html');assert.equal(hash(bytes),identity.sha256);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);let code=html.slice(start+tag.length,end);html=null;assert.doesNotMatch(code,/^import\s/m);
let compiled=new Script(code,{filename:'exact-life-context-v59.js'});code=null;globalThis.gc?.();console.log('Compiled graph parsed.');
const KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
let networkAttempts=0,handlerChecks=0;
async function run(state,check){
 console.log('Starting disposable compiled session.');
 let ui=fakeSurface(),context=null,timer=0;const timers=new Map();
 const neighbors=[freshStory(),freshStory()];neighbors[1].hero.gold+=17;roundtrip(neighbors[1]);
 const slots=[state,...neighbors].map((state,id)=>({id,state,revision:'v59-'+id,updatedAt:'2026-10-18T00:00:00.000Z'}));
 ui.storage.setItem(KEY,JSON.stringify({version:1,activeSlot:0,backups:{},slots}));ui.storage.setItem(MIRROR,JSON.stringify(state));
 const blocked=()=>{networkAttempts++;throw Error('Network forbidden in exact offline verification');};
 const locks={request:async(_name,_options,consume)=>consume()};
 const window={innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},addEventListener(){},navigator:{locks,sendBeacon:blocked}};
 context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window,navigator:window.navigator,location:{href:'file:///qa/hearth-and-oath.html',protocol:'file:'},requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout(fn,delay){const id=++timer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),Blob,URL,TextEncoder,TextDecoder,queueMicrotask,console,fetch:blocked,XMLHttpRequest:class{constructor(){blocked();}},WebSocket:class{constructor(){blocked();}}});
 try{
  new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
  compiled.runInContext(context,{timeout:30000});const click=async(op,id)=>{await ui.click(op,id);for(let i=0;i<4;i++)await turn();handlerChecks++;};
  await click('title-continue');assert.deepEqual(ui.current(),state);await check(ui,click);
  const saved=JSON.parse(ui.storage.getItem(KEY));for(let i=1;i<3;i++)assert.ok(isDeepStrictEqual(saved.slots[i],slots[i]),'Complete independent neighboring slot '+i+' remains unchanged.');
 }finally{timers.clear();context=null;ui=null;globalThis.gc?.();}
}
let routine=freshStory();routine.hero.hp=Math.max(1,routine.hero.maxHp-20);roundtrip(routine);
await run(routine,async(ui,click)=>{
 const before=JSON.stringify([...ui.values]);await click('workspace-section','life:plans');assert.ok(ui.root.querySelector('[data-life-calendar]'));assert.ok(ui.root.querySelector('[data-consequence-ledger]'));
 const control=ui.root.querySelector('[data-op="routine-review"][data-id="health_rest:2"]');assert.ok(control);
 await click('routine-review',control.dataset.id);assert.equal(ui.document.activeElement.dataset.op,'close-modal');await click('close-modal');assert.deepEqual(ui.current(),routine);
 const review=routineReview(routine,'health_rest',2,{getActions,getLifeCommitment}),expected=roundtrip(executeRoutine(routine,review,{getActions,getLifeCommitment,chooseAction}).state);
 await click('routine-review',control.dataset.id);await click('routine-confirm');if(!isDeepStrictEqual(ui.current(),expected)){const diffs=[];const walk=(a,b,path='')=>{if(diffs.length>=8||isDeepStrictEqual(a,b))return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){diffs.push(path+': '+String(a).slice(0,100)+' / '+String(b).slice(0,100));return;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],path+'.'+key);};walk(ui.current(),expected);throw Error('Complete routine state mismatch: '+diffs.join('; '));}assert.notEqual(JSON.stringify([...ui.values]),before);
});
const inbox=freshStory();delete inbox.inbox;for(let i=0;i<81;i++)receiveNotification(inbox,{kind:'gift',sourceId:'offline59:'+i,title:'Receipt '+i,body:'Preserved words '+i});roundtrip(inbox);
await run(inbox,async(ui,click)=>{
 await click('notifications');for(let p=1;p<=4;p++)await click('inbox-page',String(p));const oldest=notificationsFor(inbox).at(-1);await click('notice-open',oldest.id);
 assert.match(ui.root.querySelector('.inbox-letter').textContent,/Preserved words 0/);assert.deepEqual(ui.current(),roundtrip(markNotificationsRead(inbox,oldest.id)));assert.equal(ui.current().inbox.archive[0].read,true);
});
compiled=null;globalThis.gc?.();assert.equal(networkAttempts,0);assert.equal(hash(readFileSync(new URL(import.meta.url))),hash(own));await validateUnchangedOfflineIdentity(root,identity);
console.log(JSON.stringify({version:identity.version,artifactSha256:identity.sha256,handlerChecks,networkAttempts,checks:['exact unmodified compiled graph','Plans/calendar and causal views','free routine review and safe cancellation','canonical routine full-state parity','81 unread notices with exact archived words and read receipt','independent neighboring saves preserved'],limits:'Disposable semantic DOM and controlled existing-save fixtures. No native geometry, physical phone, screen reader, natural-lifetime balance or browser-latency certification.'},null,2));
