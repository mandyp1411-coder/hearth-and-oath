// Corrective v0.52.1 gate. Run serially only after the final source/build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-research-quotes-v521.mjs
// Exact unchanged standalone handlers in three disposable fake-surface sessions.
// The old pending scene packet is retained, never rewritten to match its quote.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createContext,Script} from 'node:vm';
import {setImmediate as turn} from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import {researchChoiceQuote,researchChoiceReason} from '../dist/js/research-runtime.js';
import {preserveResearchEvent} from '../dist/js/research-scenes.js';
import {settlementServices} from '../dist/js/world-services.js';
import {copy,roundtrip} from '../tests/helpers/story-life-fixtures.mjs';
import {researchQuotePending,researchQuoteVacancy} from '../tests/helpers/research-quote-fixtures.mjs';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity} from './lib/release-identity.mjs';

const startedAt=Date.now(),stage=(label,detail={})=>console.log(JSON.stringify({stage:label,elapsedMs:Date.now()-startedAt,...detail}));
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const own='scripts/verify-offline-research-quotes-v521.mjs',ownHash=hash(read(own));
const helpers=['tests/helpers/research-quote-fixtures.mjs','tests/helpers/story-life-fixtures.mjs','tests/helpers/ui-surface.mjs','scripts/lib/release-identity.mjs'];
const fixturePaths=['tests/fixtures/v30-explore-travel.json.gz'];
const priorPaths=['scripts/verify-offline-story-life-v52.mjs','scripts/verify-offline-life-tools-v51.mjs','tests/helpers/companion-field-fixtures.mjs','tests/fixtures/v21-vampire-grievance-paused.json','tests/fixtures/v27-road-and-descent.json.gz'];
const identities=paths=>Object.fromEntries(paths.map(p=>[p,hash(read(p))]));
const helperHashes=identities(helpers),fixtureHashes=identities(fixturePaths),priorInputHashes=identities(priorPaths);
stage('start strict offline identity');
const identity=await validateOfflineIdentity(fileURLToPath(root));
assert.match(identity.version,/^\d+\.\d+\.\d+$/);
const [major,minor,patch]=identity.version.split('.').map(Number);
assert.ok(major>0||minor>52||minor===52&&patch>=1,'render-only conclusion quotes require v0.52.1 or later');
stage('strict schema2 runtime/artifact/loader identity complete',{version:identity.version,sha256:identity.sha256});

// The helper earns copies, consultation, hearing and quotation consent through
// real source public commands. No permission field or historical event is forged.
const audiences=['public','private','public_quote'];
const batches=['homes','archive'].map(place=>({name:place,cases:audiences.map(audience=>({place,audience,state:researchQuotePending({place,quote:audience==='public_quote'})}))}));
const vacancy=researchQuoteVacancy(researchQuotePending({place:'archive',quote:true}));
assert.notEqual(vacancy.previous.id,vacancy.next.personId);
batches.push({name:'zero-day-and-unavailable',cases:[
 {place:'homes',audience:'self',state:researchQuotePending({place:'homes'})},
 {place:'homes',audience:'later',state:researchQuotePending({place:'homes',quote:true})},
 {place:'archive',audience:'unavailable',state:vacancy.state,previous:vacancy.previous,next:vacancy.next},
]});
for(const batch of batches)for(const test of batch.cases){
 roundtrip(test.state);assert.equal(test.state.event.id,'research_conclude');assert.ok(preserveResearchEvent(test.state,test.state.event));
 const run=test.state.researchPortfolio.runs[0];
 if(test.state.event.choices.some(c=>c.id==='public_quote')){
  const maker=run.cast.craftsperson;assert.ok(maker);
  for(const scope of ['hear','quote'])assert.ok(run.permissions.some(p=>p.sourceId==='maker_margin'&&p.personId===maker.id&&p.ownerId===run.ownerId&&p.scope===scope&&p.decision==='willing'),'exact captured speaker really granted '+scope);
 }
}
stage('all nine controlled canonical source captures complete');
let bytes=read('artifacts/hearth-and-oath.html');assert.equal(hash(bytes),identity.sha256);
const manifest=JSON.parse(read('dist/offline/manifest.json'));let offset=0;
for(const part of manifest.parts){const b=read('dist/offline/'+part.file);assert.ok(b.equals(bytes.subarray(offset,offset+b.length)),'exact ordered standalone part '+part.file);offset+=b.length;}
assert.equal(offset,bytes.length);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);assert.equal([...html.matchAll(/<script\b/g)].length,3);
let code=html.slice(start+tag.length,end);html=null;assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=new Script(code,{filename:'standalone-research-quotes-v521.js'});code=null;globalThis.gc?.();
stage('exact standalone compiled once; no app bindings exposed');
const totals={sessions:0,handlerChecks:0,parityChecks:0,transitionChecks:0,renderedQuoteChecks:0,pendingPacketChecks:0,exports:0,downloadClicks:0,disabledHandlerChecks:0,staleHandlerChecks:0,sourceRejectionChecks:0,selfOnlyChecks:0,draftChecks:0,networkAttempts:0};
const delivered=[];

async function runBatch(batch){
 const ui=fakeSurface(),KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
 const wanted=batch.cases.map(test=>copy(test.state)),rawPackets=wanted.map(s=>JSON.stringify(s.event));
 const backups=Object.fromEntries(wanted.map((state,id)=>[id,{state:copy(state),updatedAt:'2026-10-16T00:00:00.000Z'}]));
 const initial={version:1,activeSlot:0,backups:copy(backups),slots:wanted.map((state,id)=>({id,state:copy(state),revision:`research-quotes-v521-${batch.name}-${id}`,updatedAt:'2026-10-17T00:00:00.000Z'}))};
 ui.storage.setItem(KEY,JSON.stringify(initial));ui.storage.setItem(MIRROR,JSON.stringify(wanted[0]));
 let slot=0,writes=0,exportCount=0,downloadClicks=0,lastBlob=null,lastAnchor=null,timerId=0,networkAttempts=0;
 const timers=new Map(),urls=new Set(),set=ui.storage.setItem.bind(ui.storage);
 ui.storage.setItem=(key,value)=>{writes++;return set(key,value);};ui.storage.removeItem=key=>{writes++;return ui.values.delete(key);};
 const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in exact research quote checker');};
 const blockedApis={fetch:forbidden,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 class OfflineURL extends URL{
  static createObjectURL(blob){lastBlob=blob;const u='blob:research-quotes-'+batch.name+'-'+(++exportCount);urls.add(u);return u;}
  static revokeObjectURL(u){assert.ok(urls.delete(u),'each exact export URL is revoked once');}
 }
 ui.document.createElement=tag=>{assert.equal(tag,'a');return lastAnchor={clickCount:0,click(){assert.ok(urls.has(this.href));this.clickCount++;downloadClicks++;}};};
 const locks={async request(_name,_opts,operation){return operation();}};
 let context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,
  window:{innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},addEventListener(){},navigator:{locks,sendBeacon:forbidden},...blockedApis},
  navigator:{locks,sendBeacon:forbidden},location:{href:'file:///downloads/hearth-and-oath.html',protocol:'file:'},
  requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),
  setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
  Blob,URL:OfflineURL,TextEncoder,TextDecoder,queueMicrotask,console,...blockedApis});
 // Platform shim only. The exact compiled app is neither instrumented nor
 // rewritten; source reducers are used solely outside its context for parity.
 new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
 stage('start disposable standalone session',{batch:batch.name});compiled.runInContext(context,{timeout:30000});totals.sessions++;
 const metadata=initial.slots.map(({revision,updatedAt})=>({revision,updatedAt}));
 const disk=()=>JSON.parse(ui.storage.getItem(KEY)),storageBytes=()=>JSON.stringify([...ui.values]);
 const button=id=>ui.root.querySelector(`[data-op="choice"][data-id="${id}"]`);
 async function click(op,id){await ui.click(op,id);await turn();totals.handlerChecks++;}
 function parity(label){
  totals.parityChecks++;const saved=disk();
  assert.equal(saved.version,1);assert.equal(saved.activeSlot,slot,label+': active slot');assert.equal(saved.slots.length,3);
  assert.deepEqual(ui.current(),wanted[slot],label+': full compatibility mirror');
  assert.deepEqual(saved.slots.map(row=>row.state),wanted,label+': all three complete saved states');assert.deepEqual(saved.backups,backups,label+': all three complete nonempty backups');
  for(const row of saved.slots){assert.equal(row.revision,metadata[row.id].revision,label+': unchanged revision identity');assert.equal(row.updatedAt,metadata[row.id].updatedAt,label+': exact timestamp');}
 }
 async function load(id){await click('title-menu');await click('title-load');slot=id;await click('slot-load',String(id));parity('ordinary reload');}
 async function exportLife(){
  const before=storageBytes(),writeStart=writes,exportStart=exportCount,clickStart=downloadClicks;lastBlob=null;lastAnchor=null;
  await click('menu');await click('export');
  assert.equal(exportCount,exportStart+1,'this export creates one fresh Blob URL');assert.equal(downloadClicks,clickStart+1,'this export clicks one fresh download anchor');
  assert.ok(lastBlob&&lastAnchor,'no previous export can satisfy a current export check');assert.equal(lastAnchor.clickCount,1);assert.equal(lastBlob.type,'application/json');
  const exported=JSON.parse(await lastBlob.text());assert.deepEqual(exported,wanted[slot],'fresh ordinary exact complete-session export');
  if(wanted[slot].event?.id==='research_conclude')assert.equal(JSON.stringify(exported.event),rawPackets[slot],'export retains the historical pending scene bytes');
  assert.equal(lastAnchor.download,`hearth-and-oath-${wanted[slot].hero.name.replace(/[^a-zA-Z0-9_-]/g,'-')}.json`);
  for(const [id,t]of [...timers])if(t.delay===1000){timers.delete(id);t.fn();}
  assert.equal(urls.size,0);await ui.key('Escape');await turn();
  assert.equal(storageBytes(),before,'ordinary export changes no slot, backup, mirror or workspace byte');assert.equal(writes,writeStart);totals.exports++;totals.downloadClicks++;parity('fresh exact export');
 }
 function pendingPacket(label){
  totals.pendingPacketChecks++;assert.equal(JSON.stringify(wanted[slot].event),rawPackets[slot],label+': source packet is byte-identical');assert.equal(JSON.stringify(ui.current().event),rawPackets[slot],label+': compiled saved packet is byte-identical');
  assert.ok(preserveResearchEvent(wanted[slot],wanted[slot].event));
  for(const c of wanted[slot].event.choices)if(audiences.includes(c.id)){assert.equal(c.days,0);assert.match(c.description,/No time or Gold\.$/,'the legacy snapshot is deliberately retained, not canonicalized to the rendered description');}
 }
 function renderedQuotes(test){
  const before=copy(wanted[slot]),event=wanted[slot].event;
  assert.deepEqual(ui.root.querySelectorAll('.story-scene [data-op="choice"]').map(node=>node.dataset.id),event.choices.map(c=>c.id),'compiled rendering neither invents an unpermitted quotation choice nor drops a captured choice');
  for(const c of event.choices){
   const quote=researchChoiceQuote(wanted[slot],event,c.id);assert.ok(quote);const node=button(c.id);assert.ok(node?.isConnected,c.id+': actual compiled choice');
   assert.equal(node.querySelector('.choice-description').textContent,quote.description,c.id+': exact current rendered quote text');assert.equal(node.disabled,Boolean(quote.disabledReason),c.id+': exact enabled/disabled quote');assert.equal(quote.cost,0);
   if(['self','later'].includes(c.id)){assert.equal(quote.days,0);assert.match(quote.description,/No time or Gold\.$/);assert.equal(quote.disabledReason,null);}
   else if(test.audience==='unavailable'){
    assert.equal(quote.days,null);assert.equal(quote.disabledReason,researchChoiceReason(wanted[slot],event,c.id));assert.match(quote.disabledReason,/exact recorded archivist is unavailable/);assert.match(quote.description,/Delivery is unavailable; this rejected choice spends no time or Gold\./);assert.ok(node.querySelector('.disabled-reason'));
   }else{
    assert.equal(quote.disabledReason,null);assert.equal(quote.days,test.place==='homes'?1:0);
    if(test.place==='homes'){assert.match(quote.description,/Home collection takes 1 attended day, with no fee or wages\. Ordinary household costs accrue separately\./);assert.doesNotMatch(quote.description,/No time or Gold\./);}
    else{const ref=wanted[slot].researchPortfolio.runs[0].custody.at(-1)?.to||wanted[slot].researchPortfolio.runs[0].cast.archivist;assert.ok(quote.description.includes(`Direct deposit with ${ref.name} here at School & Archive takes no time or Gold.`));}
   }
   totals.renderedQuoteChecks++;
  }
  assert.deepEqual(wanted[slot],before,'render quoting is pure for every field, not just the pending event');pendingPacket('render quote');parity('render-only quote');
 }
 async function inert(node,label,{disabled=false}={}){
  assert.ok(node,label+': actual rendered target');assert.equal(node.isConnected,disabled,label+': expected target lifetime');if(disabled)assert.equal(node.disabled,true);
  const before=storageBytes(),writeStart=writes;await ui.fire('click',node);await turn();totals.handlerChecks++;
  assert.equal(storageBytes(),before,label+': zero changed storage bytes');assert.equal(writes,writeStart,label+': zero durable writes');parity(label);
  if(disabled)totals.disabledHandlerChecks++;else totals.staleHandlerChecks++;
 }
 async function choose(id){
  const before=disk(),input=copy(wanted[slot]),inputBefore=copy(input),quote=researchChoiceQuote(input,input.event,id),stale=button(id);assert.ok(stale&&!stale.disabled);assert.equal(quote.disabledReason,null);
  wanted[slot]=roundtrip(E.chooseEventOption(input,id));assert.deepEqual(input,inputBefore,'source command cannot mutate its captured input');
  await click('choice',id);totals.transitionChecks++;const after=disk();
  for(const row of before.slots)if(row.id!==slot)assert.deepEqual(after.slots[row.id],row,'neighbor state/revision/timestamp are unchanged');assert.deepEqual(after.backups,before.backups);
  assert.notEqual(after.slots[slot].revision,before.slots[slot].revision,'actual changed conclusion state gets a new revision');assert.ok(Number.isFinite(Date.parse(after.slots[slot].updatedAt)));
  metadata[slot]={revision:after.slots[slot].revision,updatedAt:after.slots[slot].updatedAt};parity('actual choice/'+id);
  assert.equal(wanted[slot].day,inputBefore.day+quote.days,'exact displayed day quote agrees with the source command and compiled result');
  await exportLife();await load(slot);await inert(stale,'reloaded conclusion cannot reuse its detached '+id+' control');return inputBefore;
 }
 function unchangedResources(before,after,{days}){
  assert.equal(after.day,before.day+days);assert.equal(after.event,null);assert.equal(after.researchPortfolio.project,null);assert.equal(after.researchPortfolio.pending,null);
  assert.deepEqual(after.hero.skills,before.hero.skills,'delivery grants no extra Scholarship or other skill');assert.deepEqual(after.careers,before.careers,'delivery grants no wages, career days, commission credit or rank');assert.deepEqual(after.playerNotes,before.playerNotes);assert.deepEqual(after.journal.slice(0,before.journal.length),before.journal,'every original Journal row and metadata remains literal');
  if(days===0){assert.equal(after.hero.gold,before.hero.gold);assert.deepEqual(after.householdBudget,before.householdBudget);}
  else assert.equal(before.hero.gold-after.hero.gold,after.householdBudget.paidGold-before.householdBudget.paidGold,'one real collection day pays ordinary household accrual, no invented delivery fee or wage');
 }
 let staleFromOtherSlot=null;
 await click('title-continue');parity('initial canonical load');
 for(let id=0;id<3;id++){
  if(id!==slot)await load(id);const test=batch.cases[id];stage('start quoted conclusion case',{batch:batch.name,slot:id,audience:test.audience});
  renderedQuotes(test);pendingPacket('before export');await exportLife();pendingPacket('after export');await load(id);pendingPacket('after ordinary reload');renderedQuotes(test);
  if(audiences.includes(test.audience)){
   const expectedDays=test.place==='homes'?1:0,before=await choose(test.audience),after=wanted[slot],run=after.researchPortfolio.runs[0],oldRun=before.researchPortfolio.runs[0],ref=oldRun.custody.at(-1)?.to||oldRun.cast.archivist;
   unchangedResources(before,after,{days:expectedDays});assert.equal(run.status,'completed');assert.equal(after.researchPortfolio.activeRunId,null);
   assert.equal(run.finalization.audience,test.audience==='private'?'private':'public');assert.equal(run.finalization.mode,expectedDays?'home-collection':'archive-deposit');assert.equal(run.finalization.recipientId,ref.id);assert.equal(run.finalization.day,after.day);assert.deepEqual(run.finalization.quoteSourceIds,test.audience==='public_quote'?['maker_margin']:[]);
   assert.deepEqual(run.permissions,oldRun.permissions,'delivery cannot create or broaden private quotation rights');assert.deepEqual(run.custody,oldRun.custody);assert.deepEqual(run.copies,oldRun.copies);assert.deepEqual(run.comparison,oldRun.comparison);
   const deposit=run.steps.at(-1);assert.equal(deposit.id,'deposit');assert.equal(deposit.mode,run.finalization.mode);assert.equal(deposit.actorId,ref.id);assert.equal(deposit.days,expectedDays);assert.equal(deposit.startedDay,before.day);assert.equal(deposit.completedDay,after.day);
   const proof=after.journal.filter(row=>row.tag==='research').at(-1);assert.equal(proof.narrativeEdition,30);assert.ok(proof.text.includes(ref.name));
   if(test.audience==='private')assert.match(proof.text,/received the analysis privately/);else assert.match(proof.text,/local public reading collection/);
   if(test.audience==='public_quote')assert.match(proof.text,/explicitly permitted personal quotation was included/);else assert.match(proof.text,/No private admission was quoted/);
   delivered.push({place:test.place,audience:test.audience,displayedDays:expectedDays,actualDays:after.day-before.day,recipientId:ref.id,mode:run.finalization.mode});stage('accepted delivery verified',delivered.at(-1));
  }else if(test.audience==='self'||test.audience==='later'){
   if(test.audience==='later')staleFromOtherSlot=button('public_quote');
   const before=await choose(test.audience),after=wanted[slot],run=after.researchPortfolio.runs[0],oldRun=before.researchPortfolio.runs[0];unchangedResources(before,after,{days:0});assert.deepEqual(run.steps,oldRun.steps);assert.deepEqual(run.permissions,oldRun.permissions);assert.deepEqual(run.comparison,oldRun.comparison);
   if(test.audience==='self'){assert.equal(run.status,'completed');assert.equal(run.finalization.audience,'self');assert.equal(run.finalization.mode,'self');assert.equal(run.finalization.recipientId,null);assert.deepEqual(run.finalization.quoteSourceIds,[]);totals.selfOnlyChecks++;}
   else{assert.equal(run.status,'active');assert.equal(run.finalization,null);assert.equal(after.researchPortfolio.activeRunId,oldRun.id);totals.draftChecks++;}
   stage('zero-day conclusion verified',{audience:test.audience});
  }else{
   assert.equal(test.audience,'unavailable');const before=copy(wanted[slot]),run=before.researchPortfolio.runs[0];assert.equal(run.cast.archivist.id,test.previous.id);assert.notEqual(test.previous.id,test.next.personId);assert.equal(before.npcContinuity.people[test.previous.id].retiredDay,before.day);
   const successor=settlementServices(before).find(row=>row.kind==='archivist'&&row.personId===test.next.personId);assert.ok(successor?.here,'a real current successor is actually present, not just a missing-office case');assert.deepEqual(run.custody,[],'no new custody has been authorized');
   for(const audience of audiences){
    const input=copy(wanted[slot]),sourceBefore=copy(input),rejected=roundtrip(E.chooseEventOption(input,audience));assert.deepEqual(input,sourceBefore);assert.deepEqual({...rejected,notice:''},{...wanted[slot],notice:''},'exact unavailable recipient rejects '+audience+' without time, work, permission or delivery');totals.sourceRejectionChecks++;
    await inert(button(audience),'unavailable exact-recipient '+audience,{disabled:true});pendingPacket('after rejected '+audience);
   }
   assert.ok(staleFromOtherSlot);await inert(staleFromOtherSlot,'an earlier enabled quoted choice cannot act on the successor slot');assert.deepEqual(wanted[slot],before);await exportLife();await load(slot);pendingPacket('unavailable recipient reload');renderedQuotes(test);
   const selfBefore=await choose('self'),after=wanted[slot],final=after.researchPortfolio.runs[0].finalization;unchangedResources(selfBefore,after,{days:0});assert.equal(final.audience,'self');assert.equal(final.recipientId,null);assert.deepEqual(final.quoteSourceIds,[]);assert.deepEqual(after.researchPortfolio.runs[0].permissions,run.permissions);assert.deepEqual(after.researchPortfolio.runs[0].custody,[]);totals.selfOnlyChecks++;
   stage('unavailable exact actor rejected; successor not substituted; self-only closure verified');
  }
 }
 for(let id=0;id<3;id++){await load(id);await exportLife();}
 assert.equal(networkAttempts,0,'no network API was attempted in this disposable standalone session');assert.equal(urls.size,0);totals.networkAttempts+=networkAttempts;
 stage('disposable session verified',{batch:batch.name,exports:exportCount,networkAttempts});
 // Drop the isolated context between batches; the same exact compiled Script is
 // reused, not a modified source body or a separate artifact build.
 context=null;
}
for(const batch of batches){await runBatch(batch);await turn();globalThis.gc?.();}
compiled=null;globalThis.gc?.();
assert.equal(delivered.length,6);assert.deepEqual(delivered.map(row=>row.place+'/'+row.audience).sort(),['homes','archive'].flatMap(place=>audiences.map(audience=>place+'/'+audience)).sort());
assert.equal(totals.sessions,3);assert.equal(totals.selfOnlyChecks,2);assert.equal(totals.draftChecks,1);assert.equal(totals.disabledHandlerChecks,3);assert.equal(totals.sourceRejectionChecks,3);assert.equal(totals.networkAttempts,0);
await validateUnchangedOfflineIdentity(fileURLToPath(root),identity);
const terminalHashes=identities([own,...helpers,...fixturePaths,...priorPaths]);
for(const [p,expected]of Object.entries({[own]:ownHash,...helperHashes,...fixtureHashes,...priorInputHashes}))assert.equal(terminalHashes[p],expected,p+': verification input changed during the run');
stage('terminal exact artifact/runtime/input identities unchanged');
console.log(JSON.stringify({version:identity.version,sha256:identity.sha256,runtimeSha256:identity.source.sha256,buildGit:identity.buildGit,verifierSha256:ownHash,helperHashes,fixtureHashes,priorInputHashes,terminalHashes,...totals,delivered,
 checks:[
  'strict schema2 runtime/loader/artifact and every ordered part, with terminal unchanged identity; checker/helpers/current and retained fixture hashes before and after',
  'six actual compiled public/private/public_quote deliveries: Home1 real attended day, exact archive recipient0; exact displayed description and source outcome agree',
  'historical pending event retains literal days0/No time text before action, ordinary reload and every fresh exact export; render quote never becomes saved history',
  'positive quotation uses actual source consultation/hearing/permission and the exact speaker; public/private delivery never creates or broadens quotation authority',
  'self-only and draft choices0 days/Gold; no invented recipient, reward, practice or work; original full Journal metadata remains',
  'real recorded-death vacancy with an actual present public successor: all three deliveries disabled, source-rejected, actual disabled and earlier-enabled stale handlers change zero bytes and make zero writes; no automatic custody transfer',
  'all three complete saved states, full nonempty backups, mirror and exact neighbor revision/timestamp metadata per session; fresh ordinary exact exports, no old Blob or anchor reuse; completed and pending reloads',
  'zero attempted network APIs in all three isolated standalone sessions'
 ],limits:'Controlled source captures from immutable played v30 data, plus one explicit recorded-death/reconciliation fixture, in disposable fake semantic DOM/Map storage. The current exact standalone module is unmodified. Not natural life/death, physical-browser resource loading or geometry, screen-reader behavior, travel/balance, performance benchmarking, full-suite certification or a claim about publication.'},null,2));
