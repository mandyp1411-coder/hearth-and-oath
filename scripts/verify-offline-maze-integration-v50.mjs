import { exportFileName } from '../dist/js/edition.js';
import { stampEdition } from '../dist/js/edition.js';
import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// Run serially, only after the exact current v0.50-or-later build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-maze-integration-v50.mjs
// IDs19/23/24/25 only. One unchanged compiled graph, one semantic surface, captured
// fixture copies and disposable storage. No generated years or live saves.
// This is not browser/layout, screen-reader, physical-keyboard, performance,
// balance, lifetime, full-suite or aggregate-release certification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createContext, Script } from 'node:vm';
import { setImmediate as nextTurn } from 'node:timers/promises';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import { statedDefaults } from '../tests/helpers/one-rulebook.mjs';
import { validateOfflineIdentity, validateUnchangedOfflineIdentity } from './lib/release-identity.mjs';
import * as E from '../dist/js/engine.js';

const root = new URL('../', import.meta.url), rootPath = fileURLToPath(root);
const read = path => readFileSync(new URL(path, root));
const copy = value => structuredClone(value);
const hash = value => createHash('sha256').update(value).digest('hex');
const verifierPath = 'scripts/verify-offline-maze-integration-v50.mjs', verifierSha256 = hash(read(verifierPath));
const version = JSON.parse(read('package.json')).version;
assert.ok(/^0\.\d+\.\d+$/.test(version) && (Number(version.split('.')[1])>50||Number(version.split('.')[1])===50&&Number(version.split('.')[2])>=1),
  'this IDs19/23/24/25 acceptance gate requires the exact current v0.50.1-or-later source');
// Strict shared schema-2 gate covers current runtime/build sources, every
// ordered part, extra/missing parts, complete artifact, and hosted loader.
const identity = await validateOfflineIdentity(rootPath);
const manifest = JSON.parse(read('dist/offline/manifest.json'));
assert.equal(manifest.schemaVersion, 2); assert.equal(identity.version, version);
let bytes = read('artifacts/hearth-and-oath.html');
assert.equal(bytes.length, identity.bytes); assert.equal(hash(bytes), identity.sha256);
let offset = 0;
for (const [index, part] of manifest.parts.entries()) {
  assert.equal(part.file, `game-${String(index + 1).padStart(2, '0')}.part`);
  const chunk = read('dist/offline/' + part.file);
  assert.equal(chunk.length, part.bytes); assert.equal(hash(chunk), part.sha256);
  assert.ok(chunk.equals(bytes.subarray(offset, offset + chunk.length)), part.file + ': exact ordered bytes');
  offset += chunk.length;
}
assert.equal(offset, bytes.length);
let html = installOfflineDocument(bytes.toString('utf8')); bytes = null;
assert.ok(html.includes('v' + version));
const tag = '<script type="module">', start = html.indexOf(tag), end = html.indexOf('</script>', start + tag.length);
assert.ok(start >= 0 && end > start); assert.equal(html.indexOf(tag, end), -1);
assert.equal([...html.matchAll(/<script\b/g)].length, 3, 'embedded graph, inert media and production boot guard');
assert.ok(html.includes('<script id="boot-guard">'));
let code = html.slice(start + tag.length, end); html = null;
assert.doesNotMatch(code, /^import\s/m); assert.doesNotMatch(code, /(?<![\w.])import\s*\(/);
let compiled = compileOfflineModule(code,{filename: 'standalone-maze-integration-v50.js' }); code = null;
globalThis.gc?.();

import { mazeLayout, mazeRoomCell, mazeMapRuntime } from '../dist/js/maze-v31.js';
import { mazeMapIdentity } from '../dist/js/maze-map-memory.js';
import { expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { syncCartography } from '../dist/js/cartography.js';

const valid=s=>{assert.ok(E.validateSave(s),s?.notice);return s;};
function settled(s){for(let n=0;s.event&&n<30;n++){const choice=s.event.choices.find(c=>['withdraw','continue','care','keep','later','pause','ask','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);assert.ok(choice);s=E.chooseEventOption(s,choice.id);}assert.equal(s.event,null);return valid(s);}
const fixturePaths=['tests/fixtures/maze-identity/v050-successor.json.gz','tests/fixtures/maze-identity/v2-successor.json.gz','tests/fixtures/v27-road-and-descent.json.gz','tests/fixtures/maze-identity/v0722-begun-authored.json.gz'];
const fixtureHashes=Object.fromEntries(fixturePaths.map(path=>[path,hash(read(path))]));
const rawCapture=JSON.parse(gunzipSync(read(fixturePaths[0]))),old=JSON.parse(gunzipSync(read(fixturePaths[2]))).descent;
const capture={...rawCapture,states:{}};
for(const [name,s]of Object.entries(rawCapture.states)){valid(s);const current=valid(E.migrateSave(copy(s))),other=copy(current),prior=stampEdition(statedDefaults(copy(s)));other.journal=copy(s.journal);for(const [id,messages] of Object.entries(prior.conversations.threads))prior.conversations.threads[id]=messages.filter(m=>!Number.isInteger(m.age)||m.age>=3);assert.deepEqual(other,prior,'current-v2 recovery preserves every non-Journal field except the current edition stamp and invalid pre-speech correspondence');for(const row of current.journal){const original=s.journal.find(r=>r.id===row.id);assert.ok(original);const unchanged={...row,title:original.title,text:original.text};assert.deepEqual(unchanged,original,'recovery changes only proven title/body, never ID/day/age/generation/metadata');}assert.deepEqual(E.migrateSave(copy(current)),current);capture.states[name]=current;}
const ancestor=capture.states.unresolvedParent.dynasty.activePersonId,parentName=capture.states.unresolvedParent.hero.name;
// Controlled companion eligibility and an unobserved optional-ledger shape
// isolate treatment/accounting. The genealogy/content/map authorship are the
// genuine public-succession capture, not invented actor or witness identities.
const heir=copy(capture.states.renewedHeir);for(const p of heir.companions){p.recruited=['mira','orrin'].includes(p.id);p.active=p.recruited;}
heir.companions.find(p=>p.id==='mira').hp=1;heir.rpg.companionStages.mira.status='available';heir.rpg.companionStages.orrin.status='available';heir.hero.potions=4;delete heir.maze.expeditionVisit;valid(heir);
assert.equal(heir.maze.mapMemory.entries[0].authorId,ancestor);assert.notEqual(heir.dynasty.activePersonId,ancestor);
assert.equal(heir.maze.mapMemory.entries[0].authorName,parentName);assert.equal(heir.maze.mapMemory.entries[0].authorGeneration,1);
assert.deepEqual(heir.rpg.bosses[0].people[0].memories,[]);assert.equal(heir.rpg.bosses[0].people[0].bond,35);
// The v0.27 descent is read with its walk closed (v0.72.4); its maze is a contract's, accepted here as controlled setup.
let legacy=settled(valid(E.migrateSave(copy(old))));
legacy.hero.hp=legacy.hero.maxHp;legacy.hero.mp=legacy.hero.maxMp;legacy.hero.gold=500;legacy.hero.potions=4;legacy.adventuring.rations=8;valid(legacy);

const contract=legacy.adventuring.contracts.find(c=>c.status==='offered')||legacy.adventuring.contracts[0];Object.assign(contract,{status:'active',acceptedDay:legacy.day,destinationId:legacy.locationId});legacy=settled(E.chooseAction(valid(legacy),'adventure_pursue_'+contract.id));assert.equal(legacy.maze.version,1);
// A controlled known, cleared path to a real finite cache permits bounded
// handler coverage without pretending this is earned routing/balance play.
function pathTo(m,to){const l=mazeLayout(m),queue=[[0]],seen=new Set([0]);for(const path of queue){if(path.at(-1)===to)return path;for(const id of l.cells[path.at(-1)].doors)if(!seen.has(id)){seen.add(id);queue.push([...path,id]);}}return null;}
let route,cacheSource;
for(const cell of mazeLayout(legacy.maze).cells.filter(c=>c.kind==='cache')){
 const s=copy(legacy),path=pathTo(s.maze,cell.id);s.maze.position=cell.id;s.maze.previous=path.at(-2);s.maze.visited=[...new Set(path)];s.maze.cleared=[...new Set(path.slice(0,-1))];valid(s);
 const after=settled(E.chooseAction(s,'maze_search'));
 if(expeditionVisitTotals(after.maze.expeditionVisit).gains.gear.length){route=path;cacheSource=s;break;}
}
assert.ok(cacheSource&&route.length>=2,'captured world has a real finite cache gear settlement');
// From v0.72.3 a campaign dungeon begins as a delve; an authored maze runs only where one was begun. This is a
// genuine begun one, written by v0.72.2's own engine (scripts/fixtures/generate-begun-mazes.mjs), given this
// checker's controlled resources and party.
let authoredSource=valid(E.migrateSave(copy(JSON.parse(gunzipSync(read(fixturePaths[3]))).states.cistern)));
Object.assign(authoredSource.hero,{hp:authoredSource.hero.maxHp,mp:authoredSource.hero.maxMp,gold:500,potions:4});authoredSource.adventuring.rations=8;
for(const k of Object.keys(authoredSource.equipment.materials))authoredSource.equipment.materials[k]=20;
for(const p of authoredSource.companions){p.recruited=p.id==='mira';p.active=p.recruited;}authoredSource.companions.find(p=>p.id==='mira').hp=1;authoredSource.rpg.companionStages.mira.status='available';
authoredSource=settled(authoredSource);assert.equal(authoredSource.maze.version,2);assert.equal(authoredSource.maze.content.family,'authored');
const witness=authoredSource.maze.content.anchors.find(a=>a.slotId==='witness');assert.ok(witness);authoredSource.maze.position=witness.cellId;authoredSource.maze.previous=mazeLayout(authoredSource.maze).cells[witness.cellId].doors[0];authoredSource.maze.visited=[...new Set([...authoredSource.maze.visited,witness.cellId])];valid(authoredSource);
const expected=[heir,cacheSource,authoredSource].map(valid);
for(const s of expected)assert.deepEqual(E.migrateSave(copy(s)),s,'complete fixtures are canonical before mounting');
const KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1',ui=fakeSurface();
const stamps=['2026-10-17T06:00:00.000Z','2026-10-16T00:00:00.000Z','2026-10-15T00:00:00.000Z'];
// Seed the genuinely captured broken renewal row, not a pre-repaired mock: the
// actual compiled load must perform the same uniquely proven migration.
const seeded=expected.map(copy);seeded[0].journal=copy(rawCapture.states.renewedHeir.journal);valid(seeded[0]);assert.notDeepEqual(seeded[0].journal,expected[0].journal);
ui.storage.setItem(KEY,JSON.stringify({version:1,activeSlot:0,backups:{},slots:seeded.map((s,id)=>({id,state:copy(s),updatedAt:stamps[id],revision:'maze-v50-fixture-'+id}))}));ui.storage.setItem(MIRROR,JSON.stringify(seeded[0]));
let writes=0;const write=ui.storage.setItem.bind(ui.storage);ui.storage.setItem=(key,value)=>{if([KEY,MIRROR].includes(key))writes++;write(key,value);};
const listeners=new Map(),timers=new Map(),urls=new Set();let timerId=0,networkAttempts=0,exports=0,lastBlob,lastAnchor;
function noNetwork(){networkAttempts++;throw Error('Network forbidden in the exact maze release checker');}
class OfflineURL extends URL{static createObjectURL(blob){assert.ok(blob instanceof Blob);lastBlob=blob;const url='blob:maze-v50-'+(++exports);urls.add(url);return url;}static revokeObjectURL(url){assert.ok(urls.delete(url));}}
ui.document.createElement=tag=>{assert.equal(tag,'a');return lastAnchor={click(){}};};
const locks={async request(_name,_options,operation){return operation();}};
const window={innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},navigator:{locks,sendBeacon:noNetwork},fetch:noNetwork,addEventListener(type,handler){const rows=listeners.get(type)||[];rows.push(handler);listeners.set(type,rows);}};
const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,window,navigator:{locks},location:{href:'file:///downloads/hearth-and-oath.html',protocol:'file:'},requestAnimationFrame(callback){callback();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout(callback,delay){const id=++timerId;timers.set(id,{callback,delay});return id;},clearTimeout(id){timers.delete(id);},Blob,URL:OfflineURL,TextEncoder,TextDecoder,console,queueMicrotask,fetch:noNetwork,XMLHttpRequest:class{constructor(){noNetwork();}},WebSocket:class{constructor(){noNetwork();}},EventSource:class{constructor(){noNetwork();}},Worker:class{constructor(){noNetwork();}}});
new Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));').runInContext(context);
await compiled.evaluate(context,{timeout:30000});compiled=null;globalThis.gc?.();
const disk=()=>JSON.parse(ui.storage.getItem(KEY)),diskBytes=()=>[ui.storage.getItem(KEY),ui.storage.getItem(MIRROR)];
async function drain(){await nextTurn();await Promise.resolve();}
function available(node){if(!node?.isConnected||node.disabled)return false;for(let p=node;p;p=p.parentElement){const inert=p.getAttribute?.('inert');if(p.hidden||p.inert===true||inert===true||typeof inert==='string'||p.getAttribute?.('aria-hidden')==='true'||p.tagName==='DETAILS'&&!p.open)return false;}return true;}
let handlerChecks=0,parityChecks=0,readOnlyChecks=0;
function control(op,id,within=ui.root){const node=within.querySelectorAll(`[data-op="${op}"]${id===undefined?'':`[data-id="${id}"]`}`).find(available);assert.ok(node,'actual enabled control '+op+'/'+(id??''));return node;}
async function click(op,id,within){const node=control(op,id,within);await ui.fire('click',node);await drain();handlerChecks++;return node;}
async function key(node,key){node.focus();await ui.key(key,{target:node});await drain();handlerChecks++;}
function neighbors(before,slot,label){const after=disk();for(const row of before.slots)if(row.id!==slot)assert.deepEqual(after.slots[row.id],row,label+': independent neighboring bytes/revision/time');assert.deepEqual(after.backups,before.backups,label+': recovery history unchanged');}
function parity(slot,label){assert.deepEqual(ui.current(),expected[slot],label+': entire source/compiled state');assert.deepEqual(ui.lives(),expected,label+': every independent complete slot');parityChecks++;}
async function readOnly(action,label){const before=diskBytes(),count=writes;await action();await drain();assert.deepEqual(diskBytes(),before,label+': no save-state/revision/timestamp mutation');assert.equal(writes,count,label+': zero durable writes');readOnlyChecks++;}
async function load(slot){await click('title-menu');await click('title-load');await click('slot-load',String(slot));parity(slot,'explicit reload');}
async function act(slot,id){assert.ok(E.getActions(expected[slot]).some(a=>a.id===id&&!a.disabledReason),id);const before=disk();expected[slot]=valid(E.chooseAction(expected[slot],id));await click('activity',id);parity(slot,id);neighbors(before,slot,id);await scenes(slot);}
async function scenes(slot){for(let n=0;expected[slot].event&&n<30;n++){const choice=expected[slot].event.choices.find(c=>['withdraw','continue','care','keep','later','pause','ask','leave'].includes(c.id)&&!c.disabledReason)||expected[slot].event.choices.find(c=>!c.disabledReason);const before=disk();expected[slot]=valid(E.chooseEventOption(expected[slot],choice.id));await click('choice',choice.id);parity(slot,'actual calendar choice');neighbors(before,slot,'calendar choice');}assert.equal(expected[slot].event,null);}
async function exportExact(slot){await click('menu','header');const before=diskBytes(),prior=exports;await key(control('export',undefined,ui.root.querySelector('.menu-drawer')),'Enter');assert.equal(exports,prior+1);assert.equal(lastBlob.type,'application/json');assert.deepEqual(JSON.parse(await lastBlob.text()),expected[slot]);assert.equal(lastAnchor.download,exportFileName(expected[slot]));assert.deepEqual(diskBytes(),before);lastBlob=null;for(const[id,timer]of [...timers])if(timer.delay===1000){timers.delete(id);timer.callback();}assert.equal(urls.size,0);await ui.key('Escape');await drain();handlerChecks++;}
function fog(slot){const m=expected[slot].maze,l=mazeLayout(m),cells=ui.root.querySelectorAll('.maze-cell');assert.equal(cells.length,l.cells.length);if(slot!==1)assert.equal(cells.length,121,'captured heir and authored signature layouts retain their exact original geometry');assert.equal(ui.root.querySelector('.maze-grid').dataset.mazeMode,'walk');for(const c of l.cells)if(!m.visited.includes(c.id)){const node=cells[c.id];assert.doesNotMatch(node.class,/wall-|route-room|inspected|cache|enemy|guardian|trap|objective/);assert.ok(['Unknown adjoining room','Unexplored'].includes(node.getAttribute('aria-label')));assert.equal(node.textContent.trim(),node.getAttribute('aria-label')==='Unknown adjoining room'?'?':'');}assert.deepEqual(E.migrateSave(copy(expected[slot])),expected[slot]);}

await click('title-continue');parity(0,'genuine v2 heir restores its contact narrative and removes pre-speech correspondence');assert.equal(disk().slots[0].updatedAt,stamps[0]);assert.equal(disk().slots[0].revision,'maze-v50-fixture-0');const recovered=expected[0].rpg.history.at(-1);assert.equal(ui.current().journal.findLast(r=>r.title===recovered.title).text,recovered.text);fog(0);
const inheritedMemory=copy(expected[0].maze.mapMemory),oldOutcome=copy(expected[0].maze.contentOutcomes),oldClock=expected[0].day;
await readOnly(()=>click('maze-map-mode','inspect'),'Inspect mode');
const selected=expected[0].maze.visited.find(id=>id!==0);assert.ok(Number.isInteger(selected));
await readOnly(()=>click('maze-map-select',String(selected)),'recorded room selection');
const form=ui.root.querySelector('#maze-map-reminder');assert.ok(form);ui.root.querySelector('#maze-map-note').value='An unsaved draft';await readOnly(()=>click('maze-map-cancel'),'Cancel draft');assert.equal(form.isConnected,false);
await readOnly(()=>ui.fire('submit',form),'disconnected old reminder cannot commit');
const note='<b>Return here</b> & recorded by this heir',request={identity:mazeMapIdentity(expected[0].maze,mazeMapRuntime(expected[0]).rules),roomId:selected,mark:'revisit',note};
ui.root.querySelector('#maze-map-note').value=note;ui.root.querySelector('#maze-map-mark').value='revisit';const beforeNote=disk();expected[0]=valid(E.updateMazeMapMemory(expected[0],request));await ui.fire('submit',ui.root.querySelector('#maze-map-reminder'));await drain();handlerChecks++;parity(0,'actual v2 reminder commit');neighbors(beforeNote,0,'reminder');
assert.equal(ui.document.activeElement.id,'maze-map-note');assert.doesNotMatch(ui.root.innerHTML,/<b>Return here<\/b>/);assert.match(ui.root.innerHTML,/&lt;b&gt;Return here&lt;\/b&gt;/);
assert.deepEqual(expected[0].maze.mapMemory.entries.find(r=>r.roomId===0),inheritedMemory.entries[0]);assert.equal(expected[0].maze.mapMemory.entries.find(r=>r.roomId===selected).authorId,expected[0].dynasty.activePersonId);assert.deepEqual(expected[0].maze.contentOutcomes,oldOutcome);assert.equal(expected[0].day,oldClock);
await readOnly(()=>click('maze-map-select','0'),'inspect parent entrance reminder');await readOnly(()=>click('maze-map-route','0'),'parent return-stair advice');assert.match(ui.root.innerHTML,/current location/);await readOnly(()=>click('maze-map-route-clear'),'clear route');
await readOnly(()=>click('maze-map-mode','walk'),'return to default walk mode');await exportExact(0);

await load(1);fog(1);const beforeCache=copy(expected[1]),beforeRewards=expeditionVisitTotals(beforeCache.maze.expeditionVisit).gains.gold;await act(1,'maze_search');
const gains=expeditionVisitTotals(expected[1].maze.expeditionVisit).gains,gearId=gains.gear[0]?.id;assert.ok(gearId);assert.ok(gains.gold>=beforeRewards);assert.equal(expected[1].maze.collected.filter(id=>id===expected[1].maze.position).length,1);
await click('maze-map-mode','inspect');const returnRoom=route.at(-2);await click('maze-map-select',String(returnRoom));
const returnNote={identity:mazeMapIdentity(expected[1].maze,mazeMapRuntime(expected[1]).rules),roomId:returnRoom,mark:'revisit',note:'Known return step'};ui.root.querySelector('#maze-map-note').value=returnNote.note;ui.root.querySelector('#maze-map-mark').value=returnNote.mark;
const beforeReturnNote=disk();expected[1]=valid(E.updateMazeMapMemory(expected[1],returnNote));await ui.fire('submit',ui.root.querySelector('#maze-map-reminder'));await drain();handlerChecks++;parity(1,'v1 return note');neighbors(beforeReturnNote,1,'v1 return note');
await readOnly(()=>click('maze-map-route',String(returnRoom)),'known one-step route advice');assert.match(ui.root.innerHTML,/1 walk through recorded rooms/);assert.equal(ui.root.querySelectorAll('.maze-cell.route-room').length,2);
await readOnly(()=>click('maze-map-mode','walk'),'explicit walk switch');
for(const id of [...route].reverse().slice(1))await act(1,'maze_step_'+id);
assert.equal(expected[1].maze.position,0);await act(1,'maze_exit');assert.equal(expected[1].maze,null);const returned=expected[1].mazeBook.expeditionReceipts.at(-1);assert.equal(returned.reason,'stair');assert.ok(expeditionVisitTotals(returned).gains.gear.some(r=>r.id===gearId));
for(const details of ui.root.querySelectorAll('details[data-disclosure]'))if(String(details.dataset.disclosure).includes(returned.id))details.open=true;
await readOnly(()=>key(control('receipt-gear',gearId),'Enter'),'actual found-gear comparison');assert.equal(ui.root.querySelector('.inventory-detail').dataset.inventorySelected,'gear:'+gearId);assert.equal(ui.root.querySelector('.inventory-comparison').open,true);assert.equal(ui.document.activeElement.id,'inventory-item-heading');
await readOnly(()=>click('tab','journal'),'Journal navigation');await readOnly(()=>click('workspace-section','journal:archive'),'receipt archive navigation');assert.ok(ui.root.querySelector('.expedition-receipts'));await exportExact(1);

await load(2);fog(2);assert.equal(mazeRoomCell(expected[2].maze).kind,'witness');
await act(2,'maze_authored_hear_witness');let witnessNote=ui.current().journal.findLast(r=>r.title==='A person beside the objective');assert.ok(witnessNote);assert.equal(witnessNote.narrativeEdition,30);assert.ok(witnessNote.text.includes(expected[2].maze.content.definition.witness.name));await act(2,'maze_authored_record_witness');witnessNote=ui.current().journal.findLast(r=>r.title==='An account kept with permission');assert.ok(witnessNote);assert.equal(witnessNote.narrativeEdition,30);assert.equal(witnessNote.day,expected[2].day);assert.equal(expected[2].maze.contentFacts.variantProof,true);assert.equal(expected[2].maze.contentFacts.proofSource,'witness');
assert.equal(E.fieldPotionQuote(expected[2],'mira').disabledReason,null,'canonical effective v2 witness room is quiet, not an unsupported geometric kind');await click('tab','party');
const witnessPotionBefore=disk();expected[2]=valid(E.useConsumable(expected[2],'potions','mira'));await key(control('field-potion','mira'),'Enter');parity(2,'actual quiet witness-room care');neighbors(witnessPotionBefore,2,'witness-room care');assert.equal(expected[2].maze.expeditionVisit.used.potions,1);await exportExact(2);

await load(0);fog(0);assert.deepEqual(ui.current().maze.mapMemory,expected[0].maze.mapMemory);await click('tab','party');
const full=ui.root.querySelector('[data-op="field-potion"][data-id="orrin"]');assert.ok(full.disabled);await readOnly(async()=>{full.focus();await ui.key('Enter',{target:full});await ui.fire('click',full);handlerChecks+=2;},'full companion cannot initialize optional accounting');assert.equal(ui.current().maze.expeditionVisit,undefined);
for(const activation of ['Enter',' ']){
 const trigger=control('field-potion','mira'),before=disk(),quote=E.fieldPotionQuote(expected[0],'mira'),clock=expected[0].day;assert.equal(quote.disabledReason,null);assert.ok(trigger.textContent.includes(quote.targetName));expected[0]=valid(E.useConsumable(expected[0],'potions','mira'));await key(trigger,activation);parity(0,'named companion '+activation);neighbors(before,0,'named treatment');assert.equal(expected[0].day,clock);
 await readOnly(()=>ui.fire('click',trigger),'disconnected prior treatment cannot repeat');
}
assert.equal(expected[0].companions.find(p=>p.id==='mira').hp,58);assert.equal(expected[0].hero.potions,2);assert.equal(expected[0].maze.expeditionVisit.coverage,'observed');assert.equal(expected[0].maze.expeditionVisit.start.potions,4);assert.equal(expected[0].maze.expeditionVisit.used.potions,2);
const fullNow=ui.root.querySelector('[data-op="field-potion"][data-id="mira"]');assert.ok(fullNow.disabled);await readOnly(()=>ui.fire('click',fullNow),'full treated target cannot spend or save again');await exportExact(0);
await click('tab','life');const signatureLead=E.getActions(expected[0]).find(a=>a.id==='maze_signature_lead_contact_1'&&!a.disabledReason);assert.ok(signatureLead,'captured heir retains a real unanswered second household account');
const leadDay=expected[0].day;await act(0,signatureLead.id);const actualLead=ui.current().rpg.history.at(-1),leadJournal=ui.current().journal.findLast(r=>r.title===actualLead.title);assert.ok(leadJournal);assert.equal(leadJournal.text,actualLead.text);assert.equal(leadJournal.narrativeEdition,30);assert.equal(leadJournal.day,expected[0].day);assert.equal(expected[0].day-leadDay,2);assert.equal(expected[0].maze.contentOutcomes.at(-1).actorId,expected[0].dynasty.activePersonId);assert.deepEqual(expected[0].maze.mapMemory.entries.find(r=>r.roomId===0),inheritedMemory.entries[0]);
await act(0,'maze_exit');await readOnly(()=>click('tab','life'),'actual Life view after return');await readOnly(()=>click('workspace-section','life:years'),'actual complete current-generation Journal years');assert.ok(ui.root.querySelectorAll('.remembered-entry,.life-entry').some(row=>row.textContent.includes(actualLead.title)&&row.textContent.includes(actualLead.text)),'actual Life Journal entry retains exact household title/body');await click('tab','journal');await click('workspace-section','journal:archive');assert.ok(ui.root.querySelector('.expedition-receipts'));assert.ok(ui.root.querySelector('.expedition-receipts').textContent.includes(parentName));await exportExact(0);
const unload={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const fn of listeners.get('beforeunload')||[])fn(unload);assert.equal(unload.defaultPrevented,false);

await validateUnchangedOfflineIdentity(rootPath,identity);assert.equal(hash(read(verifierPath)),verifierSha256);assert.deepEqual(Object.fromEntries(fixturePaths.map(path=>[path,hash(read(path))])),fixtureHashes);assert.equal(networkAttempts,0,'terminal zero-network assertion');assert.equal(urls.size,0);
console.log(JSON.stringify({version,scope:'IDs19/23/24/25 only',schemaVersion:2,bytes:identity.bytes,parts:identity.parts,sha256:identity.sha256,runtimeSha256:identity.source.sha256,manifestSha256:identity.manifestSha256,loaderSha256:identity.loaderSha256,buildGit:identity.buildGit,verifierSha256,fixtureHashes,handlerChecks,parityChecks,readOnlyChecks,exports,networkAttempts,checks:['one unchanged actual compiled graph and strict release-checker provenance; not runtime loader hash enforcement','genuine public successor physical map/note attribution without inherited private witness permission; actual uniquely proven old contact repair preserves progress metadata','v1/v2 fog, default Walk, Inspect/Cancel/stale form, escaped notes, known route advice and explicit real steps','actual authored witness permission/evidence and signature household attendance preserve exact source identity, literal Journal title/body after commit/reload, and real costs',
'actual finite cache reward/return receipt/owned-gear comparison and historical archive are display-only with no repeated reward','named Party native-key model consumes one potion once, records accepted cost once, and disabled/no-op controls cannot save or initialize accounting','complete current state and every neighbor slot agree with current source transitions; exact JSON exports and terminal zero network'],storage:'disposable in-memory Map; no browser or user data',limits:'bounded compiled handlers and semantic DOM only; controlled resources/companions/known path, no earned route/party, generated years, browser/layout, physical keyboard/mobile, screen-reader, performance, balance or full-suite certification'},null,2));

