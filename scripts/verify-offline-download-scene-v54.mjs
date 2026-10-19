// IDs36/37 composed with27/28/35 and29–33. Run SERIAL after the final build:
// timeout 600s node --max-old-space-size=1536 --expose-gc scripts/verify-offline-download-scene-v54.mjs
// Source-prepared semantic handler gate, not browser resource loading, native
// saving, geometry, screen-reader, balance, earned-life or full-suite evidence.
// The compiled graph is exact and unchanged. No instrumentation/debug exports.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createContext,Script} from 'node:vm';
import {setImmediate as turn} from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {E,copy,valid,roundtrip,act,pick,walk,PRIVATE_REMINDER,sceneProvider,sceneState,outdoorMentorState,mandatoryEventState,unavailableProviderCapture,composedDownloadStates,claimOpportunityState} from '../tests/helpers/download-scene-compiled-fixtures.mjs';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {nearbyContacts} from '../dist/js/dialogue-ui-v22.js';
import {tradeInventory} from '../dist/js/trading.js';
import {personalNoteRows} from '../dist/js/personal-notes.js';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity,verificationIdentity} from './lib/release-identity.mjs';
const startedAt=Date.now(),stage=(label,detail={})=>console.log(JSON.stringify({stage:label,elapsedMs:Date.now()-startedAt,...detail}));
const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root),read=p=>readFileSync(new URL(p,root));
const hash=b=>createHash('sha256').update(b).digest('hex');
const own='scripts/verify-offline-download-scene-v54.mjs';
const helpers=['tests/helpers/download-scene-compiled-fixtures.mjs','tests/helpers/ui-surface.mjs','tests/helpers/story-life-fixtures.mjs','tests/helpers/claims-tournament-fixtures.mjs','scripts/lib/release-identity.mjs'];
const fixturePaths=['tests/fixtures/v30-explore-travel.json.gz','tests/fixtures/v21-vampire-grievance-paused.json','tests/fixtures/v27-road-and-descent.json.gz','tests/fixtures/tournament-ordinary-golden.json'];
const retainedPaths=['scripts/verify-offline-claims-tournament-v53.mjs','scripts/verify-offline-research-quotes-v521.mjs','scripts/verify-offline-story-life-v52.mjs','scripts/verify-offline-life-tools-v51.mjs','tests/scene-return-ui.test.js','tests/offline-download-app.test.js'];
const identities=paths=>Object.fromEntries(paths.map(p=>[p,hash(read(p))]));
const inputHashes=identities([own,...helpers,...fixturePaths,...retainedPaths]);
stage('start strict whole release and verification-tree identity');
const identity=await validateOfflineIdentity(rootPath),verification=await verificationIdentity(rootPath);
assert.match(identity.version,/^\d+\.\d+\.\d+$/);const [major,minor]=identity.version.split('.').map(Number);
assert.ok(major>0||minor>=54,'IDs36/37 compiled acceptance requires v0.54.0 or later');
const manifestBytes=read('dist/offline/manifest.json'),manifest=JSON.parse(manifestBytes);assert.equal(manifest.schemaVersion,2);
let bytes=read('artifacts/hearth-and-oath.html');assert.equal(bytes.length,identity.bytes);assert.equal(hash(bytes),identity.sha256);
let offset=0;for(const [index,part]of manifest.parts.entries()){
 assert.equal(part.file,`game-${String(index+1).padStart(2,'0')}.part`);const b=read('dist/offline/'+part.file);
 assert.equal(b.length,part.bytes);assert.equal(hash(b),part.sha256);assert.ok(b.equals(bytes.subarray(offset,offset+b.length)),'every ordered part equals the exact artifact');offset+=b.length;
}assert.equal(offset,bytes.length);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;
const moduleTag='<script type="module">',moduleStart=html.indexOf(moduleTag),moduleEnd=html.indexOf('</script>',moduleStart+moduleTag.length);
assert.ok(moduleStart>=0&&moduleEnd>moduleStart);assert.equal(html.indexOf(moduleTag,moduleEnd),-1);
const bodyStart=html.indexOf('<body>'),bodyEnd=html.lastIndexOf('</body>');assert.ok(bodyStart>0&&bodyEnd>bodyStart);
// These DOM script records come ONLY from the actual captured static HTML.
// They are never synthesized from app lexical bindings or live root contents.
const scripts=[...html.slice(bodyStart+6,bodyEnd).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(m=>({
 outerHTML:m[0],src:m[1].match(/\bsrc="([^"]*)"/)?.[1]||'',type:m[1].match(/\btype="([^"]*)"/)?.[1]||'',id:m[1].match(/\bid="([^"]*)"/)?.[1]||'',
 getAttribute(name){return this[name]||null;},hasAttribute(name){return Boolean(this[name]);},
}));
assert.equal(scripts.length,3);const moduleScript=scripts.find(s=>s.type==='module'),bootScript=scripts.find(s=>s.id==='boot-guard');assert.ok(scripts.some(s=>s.id==='offline-media'&&s.type==='application/json'));assert.equal(moduleScript.src,'');
const bootMarkup=html.match(/<div id="app">([\s\S]*?)<\/div>\s*<div id="view-status"/)?.[1];assert.ok(bootMarkup);
const headStart=html.indexOf('<head>'),headEnd=html.indexOf('</head>');assert.ok(headStart>=0&&headEnd>headStart);
const headMarkup=html.slice(headStart+6,headEnd);
assert.match(bootMarkup,/id="boot-state"/);assert.match(bootMarkup,/JavaScript is needed[\s\S]*then reload[\s\S]*does not erase your saved lives/);
assert.match(headMarkup,/<style>[\s\S]+<\/style>/);assert.match(headMarkup,/<noscript><style>#boot-message \{ display: none; \}[^<]*<\/style><\/noscript>/);
assert.match(bootScript.outerHTML,/DOMContentLoaded/);assert.match(bootScript.outerHTML,/location\.reload\(\)/);
assert.match(html,/data:image\//,'standalone retains embedded art');assert.match(html,/data:audio\/ogg;base64,/,'standalone retains embedded music');
assert.doesNotMatch(headMarkup,/<link[^>]+rel="stylesheet"[^>]+href="\.\//);
let code=html.slice(moduleStart+moduleTag.length,moduleEnd);assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=new Script(code,{filename:'standalone-download-scene-v54.js'});code=null;html=null;globalThis.gc?.();
const staticPrefix='<!doctype html><html lang="en"><head>'+headMarkup+'</head><body><div id="app">'+bootMarkup+'</div><div id="view-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>';
const staticParts=[staticPrefix,scripts.map(s=>s.outerHTML).join('\n'),'</body></html>'];
const staticHash=createHash('sha256');let staticBytes=0;for(const part of staticParts){staticHash.update(part);staticBytes+=Buffer.byteLength(part);}const staticSha256=staticHash.digest('hex');
const totals={sessions:0,handlerChecks:0,parityChecks:0,transitions:0,exports:0,offlineCopies:0,downloadClicks:0,staleChecks:0,practiceChecks:0,sceneReturns:0,controlledRequests:0,networkAttempts:0};
const outcomes=[];
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function pumpUntil(predicate,label){for(let i=0;i<50;i++){if(predicate())return;await turn();}assert.fail('bounded async handler did not reach '+label);}
async function blobHash(blob){const digest=createHash('sha256');for await(const chunk of blob.stream())digest.update(chunk);return digest.digest('hex');}

async function session(name,states,run,{hosted=false}={}){
 assert.equal(states.length,3);for(const s of states)roundtrip(s);
 const ui=fakeSurface(),KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
 const wanted=states.map(copy),backups=Object.fromEntries(wanted.map((state,id)=>[id,{state:copy(state),updatedAt:'2026-10-16T00:00:00.000Z'}]));
 const initial={version:1,activeSlot:0,backups:copy(backups),slots:wanted.map((state,id)=>({id,state:copy(state),revision:`download-scene-v54-${name}-${id}`,updatedAt:'2026-10-17T00:00:00.000Z'}))};
 ui.storage.setItem(KEY,JSON.stringify(initial));ui.storage.setItem(MIRROR,JSON.stringify(wanted[0]));
 let slot=0,writes=0,networkAttempts=0,renderCount=0,urlCount=0,clicks=0,timerId=0,lastBlob=null,lastAnchor=null,fetcher=null;
 const toastAssignments=[];let toastText=ui.toast.textContent;Object.defineProperty(ui.toast,'textContent',{configurable:true,enumerable:true,get:()=>toastText,set(value){toastText=value;toastAssignments.push(value);}});
 const urls=new Set(),timers=new Map(),anchors=[],events=new Map(),set=ui.storage.setItem.bind(ui.storage);
 ui.storage.setItem=(key,value)=>{writes++;return set(key,value);};ui.storage.removeItem=key=>{writes++;return ui.values.delete(key);};
 const originalHTML=Object.getOwnPropertyDescriptor(ui.root,'innerHTML');Object.defineProperty(ui.root,'innerHTML',{get(){return originalHTML.get.call(ui.root);},set(value){renderCount++;originalHTML.set.call(ui.root,value);}});
 ui.root.innerHTML=bootMarkup;ui.document.head={innerHTML:headMarkup};ui.document.baseURI=hosted?'https://controlled.invalid/hearth-and-oath/':'file:///downloads/hearth-and-oath.html';
 ui.document.querySelector=selector=>selector==='script[type="module"]'?moduleScript:ui.root.querySelector(selector);
 ui.document.querySelectorAll=selector=>{assert.equal(selector,'body > script','local copy reads exact original body script DOM');return scripts;};
 const forbidden=()=>{networkAttempts++;throw Error('Uncontrolled network forbidden in exact download/scene checker');};
 // Count a rejected unexpected request even if the production loader catches
 // its synchronous validation exception. Deliberate transport Promise.reject
 // responses remain allowed controlled requests, never hidden violations.
 const fetch=(url,options)=>{if(!hosted||!fetcher)return forbidden();try{return fetcher(url,options);}catch(error){networkAttempts++;throw error;}};
 const blocked={fetch,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 class OfflineURL extends URL{static createObjectURL(blob){lastBlob=blob;const url=`blob:download-scene-${name}-${++urlCount}`;urls.add(url);return url;}static revokeObjectURL(url){assert.ok(urls.delete(url),'each exact URL is revoked once');}}
 ui.document.createElement=tag=>{assert.equal(tag,'a');lastAnchor={clickCount:0,click(){assert.ok(urls.has(this.href),'anchor clicks this call’s still-live URL');this.clickCount++;clicks++;}};anchors.push(lastAnchor);return lastAnchor;};
 const locks={async request(_name,_options,operation){return operation();}},window={innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},navigator:{locks,sendBeacon:forbidden},...blocked,addEventListener(type,handler){const list=events.get(type)||[];list.push(handler);events.set(type,list);}};
 let context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window,navigator:window.navigator,location:{href:ui.document.baseURI,protocol:hosted?'https:':'file:'},
 requestAnimationFrame:callback=>{callback();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
 Blob,URL:OfflineURL,AbortController,AbortSignal,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,queueMicrotask,console,...blocked});
 // Standard platform compatibility only, never an app variable/debug export.
 new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
 stage('start disposable exact standalone session',{name});compiled.runInContext(context,{timeout:30000});totals.sessions++;
 const metadata=initial.slots.map(({revision,updatedAt})=>({revision,updatedAt}));
 const disk=()=>JSON.parse(ui.storage.getItem(KEY)),snapshot=()=>JSON.stringify([...ui.values]);
 const durable=()=>JSON.stringify([ui.storage.getItem(KEY),ui.storage.getItem(MIRROR)]);
 const control=(op,id)=>ui.root.querySelector(`[data-op="${op}"]${id===undefined?'':`[data-id="${id}"]`}`),trail=()=>control('scene-return');
 async function click(op,id){await ui.click(op,id);await turn();totals.handlerChecks++;}
 function parity(label){totals.parityChecks++;const saved=disk();assert.equal(saved.version,1);assert.equal(saved.activeSlot,slot,label+': active slot');assert.equal(saved.slots.length,3);assert.deepEqual(saved.slots.map(r=>r.state),wanted,label+': every complete state');assert.deepEqual(ui.current(),wanted[slot],label+': complete compatibility mirror');assert.deepEqual(saved.backups,backups,label+': all complete nonempty backups');for(const row of saved.slots){assert.equal(row.revision,metadata[row.id].revision,label+': revision');assert.equal(row.updatedAt,metadata[row.id].updatedAt,label+': timestamp');}}
 function settled(before,label){const after=disk();for(const row of before.slots)if(row.id!==slot)assert.deepEqual(after.slots[row.id],row,label+': neighboring full state/revision/timestamp unchanged');assert.deepEqual(after.backups,before.backups);const changed=JSON.stringify(before.slots[slot].state)!==JSON.stringify(wanted[slot]);if(changed)assert.notEqual(after.slots[slot].revision,before.slots[slot].revision,label+': changed state receives fresh revision');else assert.equal(after.slots[slot].revision,before.slots[slot].revision,label+': unchanged state keeps revision');assert.ok(Number.isFinite(Date.parse(after.slots[slot].updatedAt)));metadata[slot]={revision:after.slots[slot].revision,updatedAt:after.slots[slot].updatedAt};parity(label);}
 async function commit(op,id,reducer,invoke){const before=disk(),input=copy(wanted[slot]),unchanged=copy(input);wanted[slot]=roundtrip(reducer(input));assert.deepEqual(input,unchanged,'independent public source command is immutable');if(invoke){await invoke();await turn();totals.handlerChecks++;}else await click(op,id);totals.transitions++;settled(before,op+'/'+(id??''));}
 async function menu(){if(!ui.root.querySelector('.menu-drawer'))await click('menu','header');}
 async function load(id){if(ui.root.querySelector('.modal')&&!ui.root.querySelector('.menu-drawer')){await ui.key('Escape');await turn();}await menu();await click('title-menu');await click('title-load');const node=control('slot-load',String(id));assert.ok(node&&!node.disabled);slot=id;await click('slot-load',String(id));assert.equal(trail(),null,'slot/title boundary never restores an ephemeral trail');parity('ordinary saved-slot load');}
 function resetDownload(){lastBlob=null;lastAnchor=null;return {before:snapshot(),writes,urlCount,clicks};}
 function unchanged(mark,label){assert.equal(snapshot(),mark.before,label+': every storage byte unchanged');assert.equal(writes,mark.writes,label+': zero attempted writes');parity(label);}
 function freshDownload(mark,label){assert.equal(urlCount,mark.urlCount+1,label+': one NEW URL');assert.equal(clicks,mark.clicks+1,label+': one NEW click');assert.ok(lastBlob instanceof Blob&&lastAnchor,label+': this call supplies both fresh records');assert.equal(lastAnchor.clickCount,1);assert.ok(urls.has(lastAnchor.href));assert.equal(anchors.at(-1),lastAnchor);totals.downloadClicks++;}
 function revoke(delay){for(const [id,timer]of [...timers])if(timer.delay===delay){timers.delete(id);timer.fn();}}
 async function exportLife(){await menu();const mark=resetDownload();await click('export');freshDownload(mark,'exact ordinary life export');assert.equal(lastBlob.type,'application/json');assert.deepEqual(JSON.parse(await lastBlob.text()),wanted[slot],'fresh complete source-equal JSON');assert.equal(lastAnchor.download,`hearth-and-oath-${wanted[slot].hero.name.replace(/[^a-zA-Z0-9_-]/g,'-')}.json`);revoke(1000);assert.equal(urls.size,0);unchanged(mark,'fresh exact life export');totals.exports++;await ui.key('Escape');await turn();}
 async function inert(node,label){assert.ok(node,label+': actual captured handler target');const mark={before:snapshot(),writes},count=urlCount;await ui.fire('click',node);await turn();totals.handlerChecks++;assert.equal(urlCount,count,label+': no file');unchanged(mark,label);totals.staleChecks++;}
 async function area(room){await click('place-open');const path=settlementWalkPath(wanted[slot],room);assert.ok(path);if(path.length)await commit('place-area',room,s=>{for(const id of path)s=act(s,'atlas_room_'+id);return s;});else await click('place-area',room);parity('source-equal exact room');}
 async function service(kind){const r=sceneProvider(wanted[slot],kind);if(wanted[slot].cartography.interior)await area(r.roomId);else await click('place-open');await commit('service-open',r.id,s=>E.visitService(s,r.id));assert.equal(ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);return r;}
 async function readonly(run,label){const before=durable();await run();assert.equal(durable(),before,label+': no state, meeting, time, save or backup mutation');parity(label);for(const [key,value]of ui.values)if(key.startsWith('hearth-and-oath:workspace:'))assert.equal(JSON.parse(value).sceneReturn,undefined,'ephemeral trail is never serialized');}
 async function returnScene({focus='#meeting-speaker',roundtripTabs=true}={}){const target=ui.root.querySelector(focus);assert.ok(target,'actual in-scene focus target '+focus);target.focus();const person=ui.root.querySelector('[data-service-person]')?.dataset.servicePerson||ui.root.querySelector('[data-contact-id]')?.dataset.contactId;
 await readonly(async()=>{await click('tab','inventory');assert.ok(trail());if(roundtripTabs){await click('tab','journal');await click('workspace-section','journal:notes');await click('tab','inventory');}await click('scene-return');assert.equal(trail(),null);assert.equal((ui.root.querySelector('[data-service-person]')?.dataset.servicePerson||ui.root.querySelector('[data-contact-id]')?.dataset.contactId),person);},'same exact local scene return');totals.sceneReturns++;}
 const h={ui,wanted,get state(){return wanted[slot];},get slot(){return slot;},get writes(){return writes;},get renders(){return renderCount;},get urlCount(){return urlCount;},get lastBlob(){return lastBlob;},get lastAnchor(){return lastAnchor;},get toastCount(){return toastAssignments.length;},get toastMessages(){return [...toastAssignments];},disk,snapshot,durable,control,trail,click,commit,menu,load,parity,resetDownload,unchanged,freshDownload,revoke,exportLife,inert,area,service,readonly,returnScene,setFetcher(fn){fetcher=fn;}};
 await click('title-continue');parity('initial canonical load');await exportLife();await run(h);
 for(let id=0;id<3;id++){await load(id);roundtrip(wanted[id]);await exportLife();}
 assert.equal(networkAttempts,0,'terminal zero uncontrolled network attempts, including all non-loader sessions');assert.equal(urls.size,0);totals.networkAttempts+=networkAttempts;
 stage('exact session terminal verified',{name,writes,controlledRequests:totals.controlledRequests,exports:totals.exports});
 for(const node of ui.root.nodes)node.isConnected=false;lastBlob=null;context=null;globalThis.gc?.();
}

stage('prepare bounded canonical composite project captures');
await session('hosted-controller-and-projects',composedDownloadStates(),async h=>{
 const calls=[],plans=[];let activePlan=null;
 const manifestResponse=()=>({ok:true,json:async()=>JSON.parse(manifestBytes)});
 h.setFetcher((url,{signal}={})=>{
  const p=activePlan;assert.ok(p,'only an explicit controlled attempt may request files');
  const expected=p.requestIndex===0?'./offline/manifest.json':'./offline/'+manifest.parts[p.requestIndex-1]?.file;
  assert.equal(url,expected,'controlled loader requests exactly manifest then existing parts in declared order');p.requestIndex++;
  assert.ok(signal instanceof AbortSignal);if(p.signal)assert.equal(signal,p.signal,'one attempt shares its actual controller signal');else p.signal=signal;
  calls.push({attempt:p.id,url,signal});totals.controlledRequests++;
  if(url==='./offline/manifest.json'){if(p.kind==='error')return Promise.reject(new Error('Controlled manifest transport failure, no altered response bytes.'));return p.kind==='manifest'?p.gate.promise:Promise.resolve(manifestResponse());}
  const index=p.requestIndex-2,part=manifest.parts[index];assert.ok(part);const bytes=read('dist/offline/'+part.file);
  assert.equal(bytes.length,part.bytes);assert.equal(hash(bytes),part.sha256,'served source fixture is the exact existing file');
  if(index===0&&p.kind==='part')return p.gate.promise;
  if(index===0&&['reader','success'].includes(p.kind)){
   p.bytes=bytes;p.reads=0;p.cancels=0;p.releases=0;
   return Promise.resolve({ok:true,body:{getReader(){return {read(){p.reads++;return p.reads===1?Promise.resolve({value:bytes.subarray(0,3),done:false}):p.reads===2?p.gate.promise:Promise.resolve({done:true});},cancel(){p.cancels++;},releaseLock(){p.releases++;}};}}});
  }
  return Promise.resolve({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
 });
 await h.menu();
 function plan(kind){const p={id:plans.length+1,kind,requestIndex:0,gate:deferred()};plans.push(p);activePlan=p;return p;}
 async function start(kind){const p=plan(kind);p.mark=h.resetDownload();const node=h.control('download-game');assert.ok(node&&!node.disabled);node.focus();const renders=h.renders;await h.click('download-game');await pumpUntil(()=>p.signal,'controlled '+kind+' request');assert.equal(h.control('download-game'),node,'manifest/progress retain the actual original button');assert.equal(h.renders,renders,'start/progress update only the downloader panel');assert.equal(h.ui.document.activeElement,h.control('cancel-game-download'),'busy state intentionally transfers focus only from its own Start');assert.equal(h.lastBlob,null,'no earlier Blob satisfies this attempt');assert.equal(h.lastAnchor,null);h.unchanged(p.mark,'pending '+kind+' attempt');return p;}
 async function cancel(p,label){const mark={before:h.snapshot(),writes:h.writes},urlStart=h.urlCount,renders=h.renders,toasts=h.toastCount;await h.click('cancel-game-download');assert.equal(h.toastCount,toasts,label+': mounted dedicated announcement has no duplicate global status');assert.match(h.ui.root.querySelector('[data-offline-announcement]').textContent,/cancelled/i);assert.equal(h.renders,renders,label+': panel-only cancellation');assert.equal(h.lastBlob,null,label+': no partial Blob');assert.equal(h.lastAnchor,null,label+': no partial anchor');assert.ok(p.signal.aborted,label+': actual signal aborted');assert.equal(h.urlCount,urlStart);assert.match(h.control('download-game').textContent,/Retry/);assert.equal(h.ui.document.activeElement,h.control('download-game'));h.unchanged(mark,label);}
 const p1=await start('manifest');assert.match(h.ui.root.querySelector('[data-offline-message]').textContent,/Checking/);assert.equal(h.ui.root.querySelector('[data-offline-received]').textContent,'');
 await cancel(p1,'abort pending exact manifest');
 const p2=await start('part');await pumpUntil(()=>p2.requestIndex===2,'pending first exact part');assert.notEqual(p2.signal,p1.signal,'retry owns a distinct token/controller');p1.gate.resolve(manifestResponse());await turn();assert.equal(p1.requestIndex,1,'old manifest completing during retry cannot request a part');assert.equal(p2.signal.aborted,false);assert.equal(h.urlCount,p1.mark.urlCount,'old completed manifest creates no URL during retry');await cancel(p2,'abort pending exact part response');
 const p3=await start('reader');await pumpUntil(()=>p3.reads===2,'pending exact reader');p2.gate.reject(new Error('late old part failure'));await turn();assert.equal(p2.requestIndex,2);assert.equal(p3.signal.aborted,false);assert.match(h.ui.root.querySelector('[data-offline-message]').textContent,/Receiving/);const start3=h.control('download-game'),panel3=h.ui.root.querySelector('[data-offline-download]');
 assert.match(panel3.querySelector('[data-offline-source]').textContent,/Reassembled bytes are not network-transfer progress[\s\S]*cached files/);assert.equal(Number(panel3.querySelector('[data-offline-progress]').value),3);assert.equal(Number(panel3.querySelector('[data-offline-progress]').max),manifest.bytes);assert.match(panel3.querySelector('[data-offline-size]').textContent,new RegExp(manifest.bytes.toLocaleString('en-US')+' bytes'));
 const unchangedRender=h.renders;await h.ui.fire('click',start3);await turn();assert.equal(p3.requestIndex,2,'busy start cannot create a second chain');assert.equal(h.renders,unchangedRender,'progress does not rerender the whole app');assert.equal(h.control('download-game'),start3,'progress retains exact start node');
 await cancel(p3,'abort pending exact part reader');assert.equal(p3.cancels,1);assert.equal(p3.releases,1);
 const errorPlan=plan('error'),errorMark=h.resetDownload(),errorToasts=h.toastCount;await h.click('download-game');await pumpUntil(()=>/could not be prepared/.test(h.ui.root.querySelector('[data-offline-announcement]').textContent),'mounted current transport error');assert.equal(errorPlan.requestIndex,1);assert.equal(errorPlan.signal.aborted,false);assert.equal(h.lastBlob,null);assert.equal(h.lastAnchor,null);assert.equal(h.urlCount,errorMark.urlCount);assert.equal(h.toastCount,errorToasts,'mounted error has one dedicated status, not a duplicate global toast');assert.match(h.control('download-game').textContent,/Retry/);h.unchanged(errorMark,'current exact-manifest transport failure');
 const p4=await start('success');await pumpUntil(()=>p4.reads===2,'retry receives exact initial bytes');for(const p of [p1,p2,p3,errorPlan])assert.notEqual(p4.signal,p.signal);p3.gate.resolve({value:p3.bytes.subarray(3),done:false});await turn();assert.equal(p3.requestIndex,2,'old reader completion during newer retry cannot advance its old chain');assert.equal(p3.cancels,1);assert.equal(p3.releases,1);assert.equal(p4.signal.aborted,false);assert.equal(h.lastBlob,null);assert.equal(h.urlCount,p4.mark.urlCount);assert.equal(Number(h.ui.root.querySelector('[data-offline-progress]').value),3,'old completion cannot replace newer exact progress');
 const staleStart=h.control('download-game'),staleCancel=h.control('cancel-game-download'),drawerBytes=h.snapshot(),drawerWrites=h.writes;
 await h.click('close-modal');assert.equal(h.ui.root.querySelector('[data-offline-download]'),null);await h.menu();assert.equal(Number(h.ui.root.querySelector('[data-offline-progress]').value),3);assert.equal(h.control('download-game').disabled,true);
 assert.equal(h.snapshot(),drawerBytes,'close/reopen retains every byte');assert.equal(h.writes,drawerWrites);
 await h.load(1);await h.menu();assert.equal(Number(h.ui.root.querySelector('[data-offline-progress]').value),3,'app-local download survives actual slot boundary');
 const practiceBefore=h.snapshot(),practiceWrites=h.writes;await h.click('practice-open','protect_ally');const modal=h.ui.root.querySelector('.practice-modal');assert.ok(modal);const practiceId=modal.dataset.practiceSession,focus=h.ui.document.activeElement;
 await h.inert(staleStart,'stale background start during practice');await h.inert(staleCancel,'stale background cancel during practice');assert.equal(p4.signal.aborted,false);totals.practiceChecks+=2;
 const mark=h.resetDownload(),renderBefore=h.renders,completionToasts=h.toastCount;p4.gate.resolve({value:p4.bytes.subarray(3),done:false});
 await pumpUntil(()=>h.lastBlob,'complete exact hosted file while detached practice owns focus');h.freshDownload(mark,'actual exact hosted offline download');
 assert.equal(h.lastBlob.type,'text/html;charset=utf-8');assert.equal(h.lastBlob.size,identity.bytes);assert.equal(await blobHash(h.lastBlob),identity.sha256);assert.equal(h.lastAnchor.download,'hearth-and-oath.html');assert.equal(h.toastCount,completionToasts+1,'absent panel completion has one fallback toast');assert.equal(h.toastMessages.at(-1),'Offline game download started. Check your browser downloads.');
 assert.equal(p4.requestIndex,manifest.parts.length+1);assert.equal(p4.cancels,0);assert.equal(p4.releases,1);assert.equal(h.renders,renderBefore,'background completion never replaces the app');assert.equal(h.ui.document.activeElement,focus,'completion cannot steal practice focus');assert.equal(h.ui.root.querySelector('.practice-modal').dataset.practiceSession,practiceId);
 h.unchanged(mark,'background exact completion during practice');assert.equal(h.snapshot(),practiceBefore);assert.equal(h.writes,practiceWrites);h.revoke(60000);totals.offlineCopies++;
 await h.click('practice-close');await h.ui.key('Escape');await turn();await h.menu();assert.match(h.ui.root.querySelector('[data-offline-message]').textContent,/Download started/);assert.equal(h.control('cancel-game-download').hidden,true);await h.ui.key('Escape');await turn();
 const researchBefore=copy(h.state);await h.click('tab','life');await h.commit('activity','research_continue',s=>act(s,'research_continue'));assert.equal(h.state.day,researchBefore.day+1);assert.equal(h.state.researchPortfolio.project,null);assert.deepEqual(h.state.justice.countingTableJob,researchBefore.justice.countingTableJob);assert.deepEqual(h.state.adultTournament,researchBefore.adultTournament);await h.exportLife();
 await h.load(2);const repertoireBefore=copy(h.state);await h.click('tab','activities');await h.click('activities-pane','fun');await h.commit('activity','repertoire_continue',s=>act(s,'repertoire_continue'));assert.equal(h.state.day,repertoireBefore.day+1);assert.equal(h.state.repertoire.project,null);assert.deepEqual(h.state.researchPortfolio,repertoireBefore.researchPortfolio);assert.deepEqual(h.state.justice.countingTableJob,repertoireBefore.justice.countingTableJob);assert.deepEqual(h.state.adultTournament,repertoireBefore.adultTournament);await h.exportLife();
 for(const p of plans){const chain=calls.filter(c=>c.attempt===p.id);assert.ok(chain.length);assert.equal(new Set(chain.map(c=>c.signal)).size,1);}assert.equal(calls.length,1+2+2+1+manifest.parts.length+1);
 outcomes.push('actual hosted controller: pending manifest/part/reader abort, distinct retry, late bytes/errors rejected, current transport error and dedicated/fallback announcement ownership, exact manifest+ordered files, app-local slot/practice completion and full project parity');
},{hosted:true});

stage('prepare exact local copy and civilian scene captures');
await session('local-copy-and-counters',[sceneState('work',{family:true}),sceneState('smith'),sceneState('inn',{composed:true})],async h=>{
 const work=await h.service('work');await h.click('service-topic','commissions');
 h.ui.root.querySelector('.workspace-body').scrollTop=137;h.ui.root.querySelector('.game-content').scrollTop=29;
 await h.returnScene();assert.ok(h.ui.root.querySelector('.work-commission-meeting'));assert.equal(h.ui.document.activeElement.id,'meeting-speaker');assert.equal(h.ui.root.querySelector('.workspace-body').scrollTop,137);assert.equal(h.ui.root.querySelector('.game-content').scrollTop,29);
 // The unique source-captured private reminder is genuinely live before the
 // download. The actual scene markup is also captured, not a made-up sentinel.
 const liveScene=h.ui.root.querySelector('.work-commission-meeting');assert.ok(liveScene);const liveSceneMarkup=h.ui.root.innerHTML.match(/<section class="[^"]*work-commission-meeting[^"]*"[\s\S]*?<\/section>/)?.[0];assert.ok(liveSceneMarkup,'capture actual current meeting markup, not an invented sentinel');
 await h.click('tab','journal');await h.click('workspace-section','journal:notes');assert.ok(h.ui.root.innerHTML.includes(PRIVATE_REMINDER));assert.ok(h.trail());
 await h.menu();const mark=h.resetDownload(),renderBefore=h.renders,localToasts=h.toastCount;await h.click('download-game');await pumpUntil(()=>h.lastBlob,'actual local static copy');h.freshDownload(mark,'actual local re-download');assert.equal(h.lastBlob.type,'text/html;charset=utf-8');assert.equal(h.lastAnchor.download,'hearth-and-oath.html');assert.equal(h.lastBlob.size,staticBytes);assert.equal(await blobHash(h.lastBlob),staticSha256);assert.equal(await h.lastBlob.slice(0,Buffer.byteLength(staticPrefix)).text(),staticPrefix,'copy uses actual unchanged static head/opening, not the live scene or reminder');
 assert.equal(h.toastCount,localToasts,'mounted completion uses dedicated polite status without global duplicate');assert.match(h.ui.root.querySelector('[data-offline-announcement]').textContent,/Offline game download started/);assert.notEqual(liveSceneMarkup,bootMarkup);assert.equal(staticParts.some(p=>p.includes(liveSceneMarkup)),false,'actual live meeting markup is absent from every static output segment');assert.equal(staticParts.some(p=>p.includes(PRIVATE_REMINDER)),false,'private live reminder never belongs to static output');assert.equal(staticPrefix.includes('work-commission-meeting'),false,'live scene is not the static boot shell');assert.equal(h.renders,renderBefore,'local copy updates only the downloader panel');h.unchanged(mark,'actual local save-free re-download');h.revoke(60000);totals.offlineCopies++;await h.ui.key('Escape');await turn();assert.ok(h.trail(),'download itself does not invalidate an unchanged optional origin');
 // Read-only preview and explicit Cancel retain Return; actual owned note and
 // favorite mutations invalidate it even with no day/location change.
 const row=personalNoteRows(h.state).find(n=>n.own&&!n.archived);assert.ok(row);const noteKey=row.key;
 await h.readonly(async()=>{await h.click('personal-note-edit',noteKey);assert.ok(h.ui.root.querySelector('#personal-note-edit-form'));await h.click('close-modal');assert.ok(h.trail());},'owned note preview/Cancel retains the exact trail');
 const staleNoteReturn=h.trail(),noteText='V054 actual owned Journal mutation Ω';const form=h.ui.root.querySelector('#player-note');assert.ok(form);form.querySelector('[name="note"]').value=noteText;
 await h.commit('submit-note',undefined,s=>E.keepPlayerNote(s,noteText),()=>h.ui.fire('submit',form));assert.equal(h.trail(),null);await h.inert(staleNoteReturn,'detached Return cannot reopen after actual owned note');await h.exportLife();
 await h.service('work');await h.click('service-topic','commissions');await h.click('tab','inventory');const staleFavorite=h.trail();assert.ok(staleFavorite);await h.click('inventory-item','gear:scholar_hood');assert.ok(h.trail());const day=h.state.day;
 await h.commit('gear-favorite','scholar_hood',s=>{const result=E.gearOrganizerCommand(s,{kind:'favorite',id:'scholar_hood'});assert.ok(result.ok&&result.changed);return result.state;});assert.equal(h.state.day,day);assert.equal(h.trail(),null);await h.inert(staleFavorite,'detached Return after actual organizer mutation');await h.exportLife();
 // A real public day is compared in full against the family source clock.
 await h.click('tab','activities');await h.click('activities-pane','fun');await h.commit('activity','leisure_walk',s=>act(s,'leisure_walk'));await h.exportLife();
 await h.load(1);const smith=await h.service('smith');assert.ok(nearbyContacts(h.state).some(p=>p.id===smith.personId));await h.click('spatial-contact',smith.personId);await h.returnScene({focus:'.dialogue-speaker h2'});assert.equal(h.ui.document.activeElement.textContent,smith.name,'same actual nearby-person heading regains focus');assert.equal(h.state.conversations.pending,null,'viewing a person never starts a new dialogue');
 await h.click('spatial-back');await h.service('smith');await h.click('craft-browse');await h.click('craft-item','workshop_craft_padded_gambeson');const oldCraft=h.control('craft-confirm');assert.ok(oldCraft&&!oldCraft.disabled);oldCraft.focus();h.ui.root.querySelector('.trade-item-grid').scrollTop=63;
 await h.returnScene({focus:'[data-op="craft-confirm"]'});assert.equal(h.ui.document.activeElement.id,'craft-heading');assert.equal(h.ui.root.querySelector('.trade-item-grid').scrollTop,63);assert.equal(h.control('craft-confirm'),null);assert.equal(h.ui.root.querySelector('#craft-item-heading'),null);await h.inert(oldCraft,'old craft quote/confirmation cannot apply after fresh browsing return');await h.click('craft-conversation');await h.click('service-close');
 for(const kind of ['materials','merchant']){
  const r=await h.service(kind);await h.click('shop-browse');const vendor=kind==='merchant'?'market':kind,row=tradeInventory(h.state,vendor).buy.find(r=>!r.disabledReason&&r.quantity>0);assert.ok(row);await h.click('shop-item','buy:'+row.id);await h.click('shop-add','buy:'+row.id);const old=h.control('shop-confirm');assert.ok(old&&!old.disabled);await h.returnScene({focus:'[data-op="shop-confirm"]'});assert.ok(h.ui.root.querySelector('#trade-heading').textContent.includes(r.name));assert.equal(h.ui.document.activeElement.id,'trade-heading');assert.equal(h.control('shop-confirm').disabled,true);assert.equal(h.ui.root.querySelectorAll('.trade-offer-row').length,0);assert.equal(h.ui.root.querySelector('#trade-item-heading'),null);await h.inert(old,'old '+kind+' basket cannot trade after Return');await h.click('shop-conversation');await h.click('service-close');
 }
 await h.load(2);const inn=await h.service('inn');await h.click('service-topic','repertoire');assert.ok(h.ui.root.querySelector('.inn-repertoire-meeting'));const book=copy(h.state.repertoire);await h.returnScene();assert.ok(h.ui.root.querySelector('.inn-repertoire-meeting'),'exact inn repertoire inquiry, never a replayed performance draft');assert.equal(h.ui.root.querySelector('[data-service-person]').dataset.servicePerson,inn.personId);assert.deepEqual(h.state.repertoire,book);assert.equal(h.ui.document.activeElement.id,'meeting-speaker');
 await h.click('service-topic','inn');await h.click('inn-browse');const innRow=tradeInventory(h.state,'inn').buy.find(r=>!r.disabledReason&&r.quantity>0);assert.ok(innRow);await h.click('shop-item','buy:'+innRow.id);await h.click('shop-add','buy:'+innRow.id);const oldInn=h.control('shop-confirm');assert.ok(oldInn&&!oldInn.disabled);await h.returnScene({focus:'[data-op="shop-confirm"]'});assert.equal(h.control('shop-confirm').disabled,true);assert.equal(h.ui.root.querySelectorAll('.trade-offer-row').length,0);await h.inert(oldInn,'old inn offer cannot trade after Return');
 outcomes.push('actual local static copy privacy; full family-day parity; exact work/person/inn repertoire focus/scroll; read-only note preview versus note/favorite invalidation; fresh merchant/materials/inn/craft browsing discards all actionable drafts');
});

stage('prepare actual outdoor mentor and same-owner duplicate slots');
const mentor=outdoorMentorState();
await session('mentor-duplicate-slots-and-priority',[mentor,copy(mentor),mandatoryEventState()],async h=>{
 assert.deepEqual(h.wanted[0],h.wanted[1]);assert.equal(h.wanted[0].seed,h.wanted[1].seed);assert.equal(h.wanted[0].dynasty.activePersonId,h.wanted[1].dynasty.activePersonId);
 const r=await h.service('mentor');assert.equal(r.id,'mentor-druid');assert.equal(h.state.cartography.interior,null);await h.returnScene();assert.equal(h.ui.document.activeElement.id,'meeting-speaker');assert.equal(h.state.cartography.interior,null,'outdoor source never acquires an invented Gate');
 await h.click('tab','inventory');const oldReturn=h.trail();assert.ok(oldReturn);await h.load(1);await h.inert(oldReturn,'same-seed same-owner different-slot old Return');await h.click('tab','journal');assert.equal(h.trail(),null);
 await h.service('mentor');await h.click('tab','inventory');assert.ok(h.trail());const beforePractice=h.snapshot(),beforeWrites=h.writes;await h.menu();await h.click('practice-open','protect_ally');const practice=h.ui.root.querySelector('.practice-modal');assert.ok(practice);const token=practice.dataset.practiceSession,background=h.trail();assert.ok(background?.isConnected,'the real utility trail remains a connected but modal-inert background control');await h.inert(background,'connected background Return is blocked during detached practice');assert.equal(h.ui.root.querySelector('.practice-modal').dataset.practiceSession,token);totals.practiceChecks++;
 await h.click('practice-action','defend');assert.match(h.ui.root.querySelector('.practice-modal').textContent,/Lesson completed/);assert.equal(h.snapshot(),beforePractice);assert.equal(h.writes,beforeWrites,'actual fictional resolver never writes real life or workspace');await h.click('practice-close');await h.ui.key('Escape');await turn();
 await h.readonly(async()=>{assert.ok(h.trail());await h.click('scene-return');assert.equal(h.ui.root.querySelector('[data-service-person]').dataset.servicePerson,r.personId);},'unmodified scene survives only its current practice context');totals.sceneReturns++;
 await h.click('tab','inventory');const potionReturn=h.trail(),before=copy(h.state);assert.ok(potionReturn);await h.click('inventory-item','supply:potions');assert.ok(h.trail());await h.commit('use-consumable','potions',s=>E.useConsumable(s,'potions'));assert.equal(h.state.day,before.day);assert.equal(h.state.locationId,before.locationId);assert.equal(h.state.hero.potions,before.hero.potions-1);assert.equal(h.trail(),null);await h.inert(potionReturn,'actual same-day remedy invalidates the outdoor trail');await h.exportLife();
 await h.load(0);await h.service('mentor');await h.click('tab','inventory');const explicitCloseReturn=h.trail();assert.ok(explicitCloseReturn);await h.click('scene-return');await h.click('service-close');await h.inert(explicitCloseReturn,'explicit scene close cannot be undone by an old Return');await h.click('tab','journal');assert.equal(h.trail(),null);
 for(const route of ['life','activities','relationships','map']){await h.service('mentor');await h.click('tab','inventory');assert.ok(h.trail());await h.click('tab',route);await h.click('tab','journal');assert.equal(h.trail(),null,'unrelated '+route+' navigation discards the one-entry origin');}
 await h.load(2);const event=copy(h.state.event);await h.readonly(async()=>{await h.click('tab','inventory');assert.equal(h.trail(),null);assert.ok(h.control('workspace-open','life:present'),'actual mandatory event return remains available');await h.click('tab','journal');assert.equal(h.trail(),null);assert.deepEqual(h.state.event,event);},'mandatory captured event remains above optional browsing');
 outcomes.push('actual outdoor mentor return and same-day remedy invalidation; duplicate-seed/owner slots and stale controls; connected background Return blocked during real detached lesson; unrelated/explicit close boundaries; mandatory event priority');
});

stage('prepare authoritative provider vacancy and exact claim opportunity');
const vacancy=unavailableProviderCapture();
await session('provider-vacancy-and-shared-claims',[vacancy.before,vacancy.state,claimOpportunityState()],async h=>{
 const original=await h.service('work');assert.equal(original.personId,vacancy.previous.personId);await h.click('service-topic','commissions');await h.click('tab','inventory');const stale=h.trail();assert.ok(stale);await h.load(1);
 assert.equal(settlementServices(h.state).some(r=>r.personId===original.personId&&r.here),false,'the exact recorded deceased provider cannot be substituted');await h.inert(stale,'earlier exact-person Return cannot bind to a successor in another slot');assert.equal(h.trail(),null);
 const successor=await h.service('work');assert.equal(successor.personId,vacancy.next.personId);assert.notEqual(successor.personId,original.personId);await h.click('service-topic','commissions');await h.returnScene();assert.equal(h.ui.root.querySelector('[data-service-person]').dataset.servicePerson,successor.personId);await h.exportLife();
 await h.load(2);const before=copy(h.state),run=copy(before.justice.countingTableJob);assert.equal(run.stage,'opportunity');assert.equal(run.attempt.approach.succeeded,true);await h.click('tab','activities');await h.click('activities-pane','crime');await h.commit('activity','justice_job_review',s=>act(s,'justice_job_review'));assert.equal(h.state.event.id,'justice_counting_departure');const oldDepart=h.control('choice','depart');assert.ok(oldDepart&&!oldDepart.disabled);
 await h.commit('choice','depart',s=>pick(s,'depart'));assert.equal(h.state.day,before.day+1);assert.equal(h.state.justice.countingTableJob.status,'completed');assert.deepEqual(h.state.justice.countingTableJob.target,run.target);assert.deepEqual(h.state.justice.countingTableJob.work,run.work);assert.deepEqual(h.state.justice.countingTableJob.attempt.approach,run.attempt.approach);assert.equal(h.state.adventuring.loot.filter(l=>l.propertyId===run.target.id).length,1);assert.equal(h.state.justice.takenProperties.filter(id=>id===run.target.id).length,1);assert.deepEqual(h.state.researchPortfolio,before.researchPortfolio);assert.deepEqual(h.state.repertoire,before.repertoire);assert.deepEqual(h.state.adultTournament,before.adultTournament);await h.inert(oldDepart,'old departure choice cannot replay the actual shared property claim');await h.exportLife();
 await h.area('watch');await h.click('tab','activities');await h.click('activities-pane','training');const card=copy(h.state.adultTournament);await h.commit('activity','tournament_resume',s=>act(s,'tournament_resume'));assert.equal(h.state.adultTournament.stage,'ready');assert.equal(h.state.adultTournament.paidDays,card.paidDays);assert.deepEqual(h.state.adultTournament.results,card.results);assert.deepEqual(h.state.adultTournament.opponents,card.opponents);
 await h.commit('activity','tournament_suspend',s=>act(s,'tournament_suspend'));assert.equal(h.state.adultTournament.stage,'paused');assert.deepEqual(h.state.adultTournament.results,card.results);await h.exportLife();
 outcomes.push('exact old provider rejected across same-owner slot boundary, only actual reconciled successor can open a new scene; actual claim departure exactly once with research/repertoire/tournament retained; real suspended card resume/suspend has no duplicate day or bout');
});

compiled=null;globalThis.gc?.();stage('revalidate complete unchanged source/artifact/verification graph');
await validateUnchangedOfflineIdentity(rootPath,identity);assert.deepEqual(await verificationIdentity(rootPath),verification,'every verification-tree file is unchanged through terminal, including checker/helper/current fixtures');assert.deepEqual(identities([own,...helpers,...fixturePaths,...retainedPaths]),inputHashes,'explicit checker/helper/current and retained fixture hashes unchanged');
assert.equal(totals.sessions,4);assert.equal(totals.offlineCopies,2);assert.equal(totals.networkAttempts,0);assert.ok(totals.exports>=16);assert.ok(totals.sceneReturns>=10);assert.ok(totals.staleChecks>=12);assert.ok(totals.practiceChecks>=3);
console.log(JSON.stringify({version:identity.version,sha256:identity.sha256,bytes:identity.bytes,parts:identity.parts,runtimeSha256:identity.source.sha256,manifestSha256:identity.manifestSha256,loaderSha256:identity.loaderSha256,buildGit:identity.buildGit,verification,inputHashes,staticRedownload:{bytes:staticBytes,sha256:staticSha256},...totals,elapsedMs:Date.now()-startedAt,checks:[
 'strict schema2 runtime/build sources, loader, whole artifact and every ordered exact part; unchanged whole verification tree, checker/helper and all current fixtures before/after',
 ...outcomes,
 'every ordinary export resets records and needs one NEW URL+click, live href, whole exact JSON/name/revoke, zero writes; all three complete states, backups, mirror, neighboring revisions and timestamps after every commit',
 'zero attempted uncontrolled network APIs at terminal; controlled hosted-loader session serves ONLY actual manifest and exact existing ordered part files with request/controller chain accounting; all other sessions attempt no fetch'
],limits:'Four bounded disposable semantic fake-DOM VM sessions of one unchanged compiled graph. Standard typed-array constructors share the served-file realm. Browser resource loading/native downloads/layout/assistive technology, earned resources/party/routes/lifetimes, balance/full circuit/bout, full pure/mounted combinations and full-suite certification are separate evidence. No live user saves, browser data, app-variable injection, source rewriting, debug exports or publication.'},null,2));
