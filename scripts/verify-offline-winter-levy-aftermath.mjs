// Focused compiled-shell acceptance for the reconstructed story increment.
// Disposable semantic DOM only: no browser geometry/native-storage claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createContext,Script} from 'node:vm';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity} from './lib/release-identity.mjs';
import * as E from '../dist/js/engine.js';
import {getContacts} from '../dist/js/conversations.js';
import {base,completed,household,returnVisit,action,clone,valid,stable} from '../tests/helpers/winter-levy-fixtures.mjs';
import {fresh as civilianFresh,deferred as civilianDeferred,preparedRequest,legacyGenericRequest,deferredCustomerUi} from '../tests/helpers/society-customer-fixtures.mjs';
import {settlementServices} from '../dist/js/world-services.js';

assert.equal(typeof globalThis.gc,'function','run with --expose-gc for explicit VM teardown');
const root=fileURLToPath(new URL('../',import.meta.url)),plain=v=>JSON.parse(JSON.stringify(v)),KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
const identity=await validateOfflineIdentity(root);
let html=installOfflineDocument(readFileSync(new URL('../artifacts/hearth-and-oath.html',import.meta.url),'utf8'));
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);
let code=html.slice(start+tag.length,end);html=null;assert.doesNotMatch(code,/^import\s/m);let compiled=new Script(code,{filename:'standalone-winter-levy-aftermath.js'});code=null;globalThis.gc();

// Actual source producer earns the original outcome, household trust and seven
// elapsed days. No quest/money/health/relationship shortcuts are used here.
const home=household(completed('sell')),returned=returnVisit(completed('sell')),neighbor=plain(base());
const neighborRow={id:1,state:neighbor,updatedAt:'2026-10-18T00:00:00.000Z',revision:'levy-neighbor-unchanged'},emptyRow={id:2,state:null,updatedAt:null,revision:'levy-empty-unchanged'};
function seed(s){return [[KEY,JSON.stringify({version:1,activeSlot:0,slots:[{id:0,state:plain(s),updatedAt:'2026-10-18T00:00:00.000Z',revision:'levy-before'},neighborRow,emptyRow],backups:{1:{state:neighbor,updatedAt:'2026-10-17T00:00:00.000Z'}}})],[MIRROR,JSON.stringify(s)]];}
const turn=()=>new Promise(resolve=>setImmediate(resolve));let liveVms=0,sessions=0;
async function session(label,entries,run){
 assert.equal(liveVms,0);liveVms++;let ui=fakeSurface(),context,embedded;const timers=new Map();let timerId=0,networkAttempts=0;
 for(const [k,v]of entries)ui.storage.setItem(k,v);
 const before=JSON.parse(ui.storage.getItem(KEY)),neighborBytes=JSON.stringify(before.slots[1]),emptyBytes=JSON.stringify(before.slots[2]),backupBytes=JSON.stringify(before.backups);
 const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in levy checker');};
 const blocked={fetch:forbidden,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 try{
  context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,Blob,URL,TextEncoder,TextDecoder,queueMicrotask,console,
   window:{innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},addEventListener(){},navigator:{sendBeacon:forbidden},...blocked},navigator:{sendBeacon:forbidden},location:{href:'file:///downloads/hearth-and-oath.html',protocol:'file:'},
   requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),...blocked});
  new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);compiled.runInContext(context,{timeout:30000});sessions++;
  embedded=new Script('({engine:__engine,levy:__winter_levy_aftermath,society:__society})').runInContext(context);
  function persisted(){const d=JSON.parse(ui.storage.getItem(KEY));assert.equal(d.version,1);assert.equal(d.activeSlot,0);assert.deepEqual(d.slots.map(s=>s.id),[0,1,2]);assert.deepEqual(d.slots[0].state,JSON.parse(ui.storage.getItem(MIRROR)),label+': authoritative slot equals mirror');assert.deepEqual(d.slots[0].state,ui.current(),label+': authoritative slot equals current');assert.equal(JSON.stringify(d.slots[1]),neighborBytes);assert.equal(JSON.stringify(d.slots[2]),emptyBytes);assert.equal(JSON.stringify(d.backups),backupBytes);}
  function transfer(s){context.qaJson=JSON.stringify(s);const result=new Script('JSON.parse(globalThis.qaJson)').runInContext(context);delete context.qaJson;return result;}
  async function click(scope,op,id){assert.ok(scope?.isConnected!==false,'current owner exists');const nodes=scope.querySelectorAll(`[data-op="${op}"]${id===undefined?'':`[data-id="${id}"]`}`).filter(n=>n.tagName==='BUTTON'&&n.isConnected&&!n.disabled&&!n.hidden);assert.equal(nodes.length,1,label+': one current owned '+op+'/'+id);const target=nodes[0];for(let p=target.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')assert.ok(p.open||p.getAttribute('open')!==null);await ui.fire('click',target);await turn();persisted();return target;}
  async function nav(id){await click(ui.root.querySelector('.bottom-nav'),'tab',id);}
  async function meet(id){await nav('map');await click(ui.root.querySelector('.journey-destination'),'place-open');for(let page=0;page<=10;page++){const d=ui.root.querySelector('.place-residents');assert.ok(d);d.open=true;await ui.fire('toggle',d);const people=ui.root.querySelector('.nearby-people');assert.ok(people);if(people.querySelector(`[data-op="spatial-contact"][data-id="${id}"]`))break;assert.ok(page<10);await click(people,'nearby-page',String(page+1));}await click(ui.root.querySelector('.nearby-people'),'spatial-contact',id);}
  function dialogue(id){const panel=ui.root.querySelector(`.dialogue-scene[data-contact-id="${id}"]`);assert.ok(panel,'exact current dialogue owner');return panel;}
  function previews(id,pending){const before=plain(ui.current()),panel=dialogue(id),notes=panel.querySelectorAll('.dialogue-choice-note');assert.equal(notes.length,1);assert.equal(notes[0].textContent,pending.snapshot.choices[0].description);assert.equal(panel.querySelectorAll('.dialogue-reply-preview').length,pending.replies.length);for(const c of pending.snapshot.choices){const button=panel.querySelector(`[data-op="reply"][data-id="${c.id}"]`);assert.equal(button.dataset.person,id);assert.equal(button.querySelector('strong').textContent,c.label);assert.equal(button.querySelector('.dialogue-reply-preview').textContent,c.text);assert.equal(button.querySelectorAll('small').length,0);assert.ok(!button.textContent.includes(c.response),'no NPC-answer spoiler');}assert.deepEqual(ui.current(),before,'reading exact previews is read-only');persisted();}
  const api={get ui(){return ui;},click,nav,meet,dialogue,previews,persisted,storage:()=>[...ui.values.entries()],actions:s=>plain(embedded.engine.getActions(transfer(s))),disclosure:(s,id)=>plain(embedded.levy.levyDisclosureFor(transfer(s),id)),customerReason:(s,id)=>embedded.society.societyCustomerChoiceReason(transfer(s),s.event?.id,id),eventChoice:(s,id)=>plain(embedded.engine.chooseEventOption(transfer(s),id)),async journal(text){const before=plain(ui.current());await nav('journal');await click(ui.root,'workspace-section','journal:archive');assert.ok(ui.root.querySelector('.journal-workspace').textContent.includes(text),'actual Archive retains literal exchange');assert.deepEqual(ui.current(),before,'Journal navigation is read-only');persisted();}};
  await click(ui.root,'title-continue');console.log('Started compiled scenario:',label);const result=await run(api);persisted();assert.equal(networkAttempts,0);return result;
 }finally{timers.clear();embedded=null;if(ui)ui.root.innerHTML='';ui=null;context=null;liveVms--;globalThis.gc();assert.equal(liveVms,0);}
}

// 1. Existing ledger-absent read/navigation and an explicit household opening.
let captured;
const waiting=await session('ledger absent and household opening',seed(home.s),async h=>{
 const before=plain(h.ui.current());assert.equal(before.conversations.levyAftermath,undefined);await h.nav('journal');await h.nav('inventory');assert.deepEqual(h.ui.current(),before);assert.equal(h.ui.current().conversations.levyAftermath,undefined);
 await h.meet(home.id);await h.click(h.dialogue(home.id),'activity','talk_levy_household_'+home.id);const s=h.ui.current();assert.equal(s.conversations.pending.personId,home.id);assert.equal(s.conversations.pending.nodeId,'levy_household');assert.equal(s.conversations.levyAftermath,undefined);assert.deepEqual(stable(s),stable(before));captured=plain(s.conversations.pending);h.previews(home.id,captured);await h.nav('inventory');assert.deepEqual(h.ui.current().conversations.pending,captured);return h.storage();
});

// 2. A fresh boot keeps the exact pending text. The existing moment correctly
// disables a new place visit; the exact-person return banner is the real path.
await session('reloaded household limited reply',waiting,async h=>{
 assert.deepEqual(h.ui.current().conversations.pending,captured);assert.equal(h.ui.current().conversations.levyAftermath,undefined);await h.nav('map');const mapBefore=plain(h.ui.current()),card=h.ui.root.querySelector('.journey-destination');assert.ok(card.querySelector('[data-op="place-open"]').disabled);await h.click(h.ui.root.querySelector('.view-attention'),'show-contact',home.id);assert.deepEqual(h.ui.current(),mapBefore);
 h.previews(home.id,captured);const before=plain(h.ui.current()),selected=captured.snapshot.choices.find(c=>c.id==='limited'),expected=E.replyMessage(before,home.id,'limited'),stale=await h.click(h.dialogue(home.id),'reply','limited'),s=h.ui.current();assert.deepEqual(s,expected,'exact compiled/source reply parity');assert.deepEqual(stable(s),stable(before));assert.equal(s.conversations.levyAftermath.length,1);assert.deepEqual(h.disclosure(s,home.id),{scope:'limited',text:selected.text});assert.doesNotMatch(selected.text,/gold|duplicate|patron|racket|repayment/i);assert.equal(h.ui.document.activeElement,h.dialogue(home.id).querySelector('.dialogue-window'),'real reply focuses its current answer');
 for(const p of getContacts(s).filter(p=>p.id!==home.id))assert.equal(h.disclosure(s,p.id),null);await h.nav('inventory');const focus=h.ui.document.activeElement;await h.ui.fire('click',stale);await turn();assert.deepEqual(h.ui.current(),s);assert.equal(h.ui.document.activeElement,focus,'stale control cannot steal focus after navigation');h.persisted();assert.ok(s.journal.at(-1).text.includes(selected.response));await h.journal(s.journal.at(-1).text);assert.ok(h.ui.root.querySelector('.quest-archive').textContent.includes('The original clerk and factor may speak'));
});

// 3. The service and seven elapsed days came from their genuine producers.
await session('seven-day original service-owner return',seed(returned.s),async h=>{
 await h.meet(returned.id);const before=plain(h.ui.current());await h.click(h.dialogue(returned.id),'activity','talk_levy_return_'+returned.id);let s=h.ui.current();assert.equal(s.conversations.pending.personId,returned.id);assert.equal(s.conversations.pending.nodeId,'levy_return');assert.deepEqual(stable(s),stable(before));h.previews(returned.id,s.conversations.pending);const waiting=plain(s),selected=s.conversations.pending.snapshot.choices.find(c=>c.id==='ask'),stale=await h.click(h.dialogue(returned.id),'reply','ask');s=h.ui.current();assert.deepEqual(s,E.replyMessage(waiting,returned.id,'ask'));assert.deepEqual(stable(s),stable(before));assert.equal(s.conversations.levyAftermath[0].choiceId,'ask');assert.equal(h.ui.document.activeElement,h.dialogue(returned.id).querySelector('.dialogue-window'));assert.ok(!h.actions(s).some(a=>a.id==='talk_levy_return_'+returned.id));await h.ui.fire('click',stale);await turn();assert.deepEqual(h.ui.current(),s);h.persisted();assert.ok(s.journal.at(-1).text.includes(selected.response));await h.journal(s.journal.at(-1).text);
});

// 4. Explicit controlled legal boundary fixtures, not claimed natural death or
// played relocation. Late replies may only close without speech or a receipt.
let wrong=action(clone(home.s),'talk_levy_household_'+home.id);wrong.cartography.interior.roomId='gate';valid(wrong,'controlled wrong-room pending');
await session('wrong-room household cannot receive disclosure',seed(wrong),async h=>{
 await h.nav('life');const before=plain(h.ui.current());assert.ok(!h.actions(before).some(a=>a.id==='talk_levy_household_'+home.id));await h.click(h.ui.root.querySelector('.dialogue-scene'),'reply','private');const s=h.ui.current();assert.equal(s.conversations.pending,null);assert.equal(s.conversations.levyAftermath,undefined);assert.equal(s.conversations.sequence,before.conversations.sequence);assert.deepEqual(s.journal,before.journal);assert.deepEqual(stable(s),stable(before));assert.notEqual(h.ui.document.activeElement,h.ui.root.querySelector('.dialogue-window'),'cancellation is not a spoken answer');
});
let dead=action(clone(returned.s),'talk_levy_return_'+returned.id);const original=dead.rpg.contacts.find(p=>p.id===returned.id);original.alive=false;original.deathDay=dead.day;valid(dead,'controlled dead exact original');
await session('dead original has no replacement reply',seed(dead),async h=>{
 await h.nav('life');const before=plain(h.ui.current());assert.ok(!h.actions(before).some(a=>a.id==='talk_levy_return_'+returned.id));const panel=h.ui.root.querySelector('.dialogue-scene');assert.match(panel.textContent,/cannot currently take part|unavailable/);await h.click(panel,'reply','ask');const s=h.ui.current();assert.equal(s.conversations.pending,null);assert.equal(s.conversations.levyAftermath,undefined);assert.equal(s.conversations.sequence,before.conversations.sequence);assert.deepEqual(s.journal,before.journal);assert.deepEqual(stable(s),stable(before));
});

// 5. Exact v0.55 public export from a prepared engine branch, not a real user's
// save or a native-played full life. The captured pending must not be rewritten.
const observedBytes=readFileSync(new URL('../tests/fixtures/native-v055-factor-pending.json',import.meta.url));
assert.equal(createHash('sha256').update(observedBytes).digest('hex'),'63fcae01323875974b2faeaa54b972939a0a57bf84e91439f8c4de82ae29656e');
const observed=JSON.parse(observedBytes);valid(observed,'observed public v0.55 pending fixture');const originalPending=plain(observed.conversations.pending);
await session('old public pending previews and literal opinion',seed(observed),async h=>{
 const id=originalPending.personId;assert.deepEqual(h.ui.current().conversations.pending,originalPending);h.previews(id,originalPending);const before=plain(h.ui.current()),selected=originalPending.snapshot.choices.find(c=>c.id==='opinion');assert.equal(selected.text,'I can accept that bargain and still dislike it.');await h.click(h.dialogue(id),'reply','opinion');const s=h.ui.current();assert.deepEqual(s,E.replyMessage(before,id,'opinion'));assert.deepEqual(stable(s),stable(before));assert.equal(s.conversations.levyAftermath[0].choiceId,'opinion');assert.equal(h.ui.document.activeElement,h.dialogue(id).querySelector('.dialogue-window'));assert.ok(s.journal.at(-1).text.includes(selected.text)&&s.journal.at(-1).text.includes(selected.response));await h.journal(s.journal.at(-1).text);
});

// 6. A genuinely fresh fictional QA export is already at this real Archive.
// No relocation, enrollment, record discovery or resources are injected.
const archiveFresh=civilianFresh();assert.equal(archiveFresh.locationId,'reach-highstone-3');assert.equal(archiveFresh.cartography.interior.roomId,'archive');
const archivist=settlementServices(archiveFresh).find(r=>r.kind==='archivist'&&r.here);assert.ok(archivist);assert.ok(!settlementServices(archiveFresh).some(r=>r.kind==='school'));
await session('actual fresh empty Archive has a usable read-only exit',seed(archiveFresh),async h=>{
 const before=plain(h.ui.current()),resources=s=>({day:s.day,age:s.age,hero:s.hero,equipment:s.equipment,education:s.education,householdBudget:s.householdBudget});
 async function visitArchive(){
  const preVisit=plain(h.ui.current());await h.nav('map');await h.click(h.ui.root.querySelector('.journey-destination'),'place-open');assert.deepEqual(h.ui.current(),preVisit,'opening the current place is read-only');await h.click(h.ui.root.querySelector('.local-service-list'),'service-open',archivist.id);
  const visited=plain(h.ui.current());assert.deepEqual(visited,E.visitService(preVisit,archivist.id),'real service visit matches source, including meeting and cleared notice');assert.deepEqual(resources(visited),resources(before),'visiting does not spend time/resources or enroll');return visited;
 }
 for(let n=0;n<2;n++){
  const visited=await visitArchive();
  const panel=h.ui.root.querySelector('.archive-empty-meeting');assert.ok(panel);assert.match(panel.textContent,/no records available for you to investigate right now/);assert.match(panel.textContent,/No teacher is currently offering lessons here/);assert.match(panel.textContent,/To enroll, visit a teacher at their school/);assert.equal(panel.querySelectorAll('[data-op="activity"]').length,0);
  await h.click(panel,'tab','activities');assert.equal(h.ui.root.querySelector('.archive-empty-meeting'),null);await h.click(h.ui.root.querySelector('.activity-tabs'),'activities-pane','work');assert.deepEqual(h.ui.current(),visited,'navigation preserves the exact post-visit state');assert.deepEqual(resources(h.ui.current()),resources(before));
 }
 const visited=await visitArchive(),options=h.ui.root.querySelector('.archive-empty-meeting .interaction-options');assert.ok(options);assert.equal(options.querySelector('[data-op="service-close"]').querySelector('strong').textContent,'Leave');await h.click(options,'service-close','');assert.deepEqual(h.ui.current(),visited,'leaving is read-only after the real visit');assert.deepEqual(resources(h.ui.current()),resources(before));h.persisted();
});

// 7. The funded request uses real commission, purchase and revisit producers.
// Only its prose is a controlled old-format compatibility fixture. The separate
// missing-wood clone below is a labeled admission negative, not earned play.
const customer=legacyGenericRequest(preparedRequest());
await session('old generic customer shows exact terms and reserves them once',seed(customer),async h=>{
 const before=plain(h.ui.current()),panel=h.ui.root.querySelector('.story-scene'),id=before.society.pending.personId,p=before.society.people.find(p=>p.id===id);assert.deepEqual(before.event,customer.event,'stored old pending stays literal');assert.deepEqual(before.journal,customer.journal,'historical Journal is not rewritten');assert.ok(panel.querySelector('[data-society-customer-context]').textContent.includes(p.name));const teach=panel.querySelector('[data-op="choice"][data-id="teach"]');assert.equal(teach.disabled,false);assert.match(teach.textContent,/Reserve 12 gold and 1 wood; commit 4 actual days/);assert.equal(h.customerReason(before,'teach'),null);
 const missing=plain(before);missing.equipment.materials.wood=0;valid(missing,'controlled compiled missing-wood negative');const reason=h.customerReason(missing,'teach');assert.match(reason,/1 wood/);const rejected=h.eventChoice(missing,'teach');assert.equal(rejected.notice,reason);assert.deepEqual({...rejected,notice:missing.notice},missing,'compiled admission rejects without effects');assert.deepEqual(h.ui.current(),before,'negative clone never changes the played UI or storage');
 const stale=await h.click(panel,'choice','teach'),s=h.ui.current();assert.deepEqual(s,E.chooseEventOption(before,'teach'));assert.equal(s.society.project.personId,id);assert.equal(s.society.project.totalDays,4);assert.equal(s.society.project.remainingDays,4);assert.equal(s.society.project.completedDays,0);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold-12);assert.equal(s.equipment.materials.wood,before.equipment.materials.wood-1);assert.deepEqual(s.hero.skills,before.hero.skills);await h.nav('inventory');await h.ui.fire('click',stale);await turn();assert.deepEqual(h.ui.current(),s);h.persisted();
});

// 8. The actual fictional native post-deferral export starts with no materials.
// Both branches discover the exact person's visible plan, defer for supplies,
// buy through the real Market/barter controls, return and reserve the quoted
// work. Existing current-commitment controls must then permit Continue/Cancel.
await session('visible deferred customer through Market and completed teaching',seed(civilianDeferred()),h=>deferredCustomerUi(h,'continue'));
await session('visible deferred customer through Market and honest cancellation',seed(civilianDeferred()),h=>deferredCustomerUi(h,'cancel'));

assert.equal(liveVms,0);compiled=null;captured=null;globalThis.gc();await validateUnchangedOfflineIdentity(root,identity);
console.log(JSON.stringify({result:'PASS',sessions,artifactSha256:identity.sha256,sourceRuntimeSha256:identity.source.sha256,networkAttempts:0,scope:'compiled semantic handlers; disposable Standard storage; not native browser or global quality certification'},null,2));
