// Art and audio use one frozen table from the exact inert element; native per-realm asset allocation is separate evidence.
// Legacy semantic probes use the exact graph prefix in classic scope and the unchanged async module tail; complete module scope is separately verified by v71.
import { exportFileName } from '../dist/js/edition.js';
import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// IDs32/33 composed with IDs28/29/30/31/35. Run serially after final build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-claims-tournament-v53.mjs
// Source-prepared, explicitly controlled captures in a semantic fake DOM/Map.
// The exact compiled module is unchanged: no debug exports, source rewriting,
// installed app bindings, completed-battle fabrication, browser or lifetime claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createContext,Script} from 'node:vm';
import {setImmediate as turn} from 'node:timers/promises';
import {E,copy,valid,roundtrip,act,pick,walk,pieceId,captureClaimsTournamentBase,captureResearchProject,captureRepertoireProject,captureClaimOpportunity,captureClaimProject,captureLockedTournament,captureCombinedSuccessorParent} from '../tests/helpers/claims-tournament-fixtures.mjs';
import {freshStory,adultFamily,childRecord} from '../tests/helpers/story-life-fixtures.mjs';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {settlementServices} from '../dist/js/world-services.js';
import {getContacts} from '../dist/js/conversations.js';
import {projectLifePerson} from '../dist/js/world-people-v31.js';
import {registerWorldLifeRecord} from '../dist/js/lineage.js';
import {initializeFamilyDepth} from '../dist/js/household.js';
import {reconcileNpcContinuity} from '../dist/js/npc-continuity.js';
import {regionAt} from '../dist/js/realm.js';
import {seededRoll} from '../dist/js/world.js';
import {householdSilver,propertyAlreadyTaken} from '../dist/js/silver-property.js';
import {countingTableCommitment} from '../dist/js/local-project-ownership.js';
import {countingTableJournalRows} from '../dist/js/counting-table-job.js';
import {getBattleActions,previewBattleAction,takeBattleAction} from '../dist/js/combat.js';
import {validateAdultTournament,tournamentScore} from '../dist/js/adult-tournament-state.js';
import {tournamentAvailabilityReason} from '../dist/js/adult-tournament.js';
import {prohibitedDuelState,TOURNAMENT_PURSE} from '../dist/js/tournament-duel-rules.js';
import {personalNoteRows,reviewPersonalNote} from '../dist/js/personal-notes.js';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity,verificationIdentity} from './lib/release-identity.mjs';

const startedAt=Date.now(),stage=(label,detail={})=>console.log(JSON.stringify({stage:label,elapsedMs:Date.now()-startedAt,...detail}));
const root=new URL('../',import.meta.url),rootPath=fileURLToPath(root),read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const own='scripts/verify-offline-claims-tournament-v53.mjs';
const helpers=['tests/helpers/claims-tournament-fixtures.mjs','tests/helpers/story-life-fixtures.mjs','tests/helpers/ui-surface.mjs','scripts/lib/release-identity.mjs'];
const fixturePaths=['tests/fixtures/v30-explore-travel.json.gz','tests/fixtures/v21-vampire-grievance-paused.json'];
const priorPaths=['scripts/verify-offline-story-life-v52.mjs','scripts/verify-offline-research-quotes-v521.mjs','scripts/verify-offline-life-tools-v51.mjs','tests/helpers/research-quote-fixtures.mjs','tests/helpers/companion-field-fixtures.mjs','tests/fixtures/v27-road-and-descent.json.gz','tests/fixtures/tournament-ordinary-golden.json'];
const identities=paths=>Object.fromEntries(paths.map(p=>[p,hash(read(p))]));
const inputHashes=identities([own,...helpers,...fixturePaths,...priorPaths]);
stage('start strict source/artifact identity');
const identity=await validateOfflineIdentity(rootPath),verification=await verificationIdentity(rootPath);
assert.match(identity.version,/^\d+\.\d+\.\d+$/);
const [major,minor]=identity.version.split('.').map(Number);assert.ok(major>0||minor>=53,'this composed gate requires v0.53.0 or later');
let bytes=read('artifacts/hearth-and-oath.html');assert.equal(hash(bytes),identity.sha256);
const manifest=JSON.parse(read('dist/offline/manifest.json'));let offset=0;
for(const part of manifest.parts){const b=read('dist/offline/'+part.file);assert.ok(b.equals(bytes.subarray(offset,offset+b.length)),'ordered exact standalone part '+part.file);offset+=b.length;}
assert.equal(offset,bytes.length);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);assert.equal([...html.matchAll(/<script\b/g)].length,3);
let code=html.slice(start+tag.length,end);html=null;assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=compileOfflineModule(code,{filename:'standalone-claims-tournament-v53.js', legacyProbes: true, shareInertMedia: true});code=null;globalThis.gc?.();
stage('unchanged standalone bytes prepared for awaited module sessions');
const totals={sessions:0,handlerChecks:0,parityChecks:0,transitionChecks:0,exports:0,downloadClicks:0,staleHandlerChecks:0,disabledHandlerChecks:0,practiceBackgroundChecks:0,sourceRejectionChecks:0,sourceBattlePolicyChecks:0,battleCommands:0,bouts:0,compiledHostVacancyChecks:0,sourceEntrantVacancyChecks:0,lateCustodyChecks:0,renderedCustodyChecks:0,networkAttempts:0};
const outcomes=[];

// Only public source commands advance these captures. Existing fixture/site,
// resource and date controls below are declared, valid regression preconditions,
// not naturally earned lifetimes or balance evidence.
function settleSource(s){
 for(let n=0;n<100;n++){
  if(s.event){const c=['conclude_correct','care','animal','cooperate','pay','account','continue','wait','leave','later','avoid','pause','keep'].map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason);assert.ok(c);s=pick(s,c.id);}
  else if(s.conversations?.pending){const p=s.conversations.pending;s=valid(E.replyMessage(s,p.personId,p.replies[0].id));}
  else if(s.stories?.project)s=act(s,'stories_continue');
  else if(s.rpg?.project)s=act(s,'rpg_continue');
  else if(s.timeline.yearTarget!==null)s=valid(E.continueAgeUp(s));
  else return roundtrip(s);
 }
 throw Error('No bounded public source resolution for the captured waiting moment');
}
function tournamentFresh({family=false,potions=2}={}){
 let s=settleSource(family?adultFamily():freshStory());s=walk(s,'market');
 for(let n=0;n<potions;n++)s=settleSource(act(s,'realm_potion'));
 return roundtrip(walk(s,'watch'));
}
function tournamentReady(s){s=act(s,'tournament_invite');s=pick(s,'enter');s=settleSource(s);if(s.adultTournament.stage==='paused')s=act(walk(s,'watch'),'tournament_resume');assert.equal(s.adultTournament.stage,'ready');return roundtrip(s);}
function ordinaryAcceptedStart(){
 const base=settleSource(freshStory());
 for(const place of base.world.locations.filter(p=>base.realm.sites[p.id]?.regionId==='bellwater'&&base.realm.sites[p.id].merchant&&['village','city','camp'].includes(p.type)&&!['destroyed','evacuated'].includes(p.status))){
  let s=copy(base);s.locationId=place.id;s.cartography.interior={siteId:place.id,roomId:'gate'};syncCartography(s);valid(s);s=roundtrip(act(s,'atlas_room_market'));s=walk(s,'market');
  const a=E.getActions(s).find(a=>a.id==='justice_job_open'&&!a.disabledReason);if(!a)continue;
  s=pick(act(s,a.id),'accept_stealth');const target=householdSilver(s);
  // Select through real prior public attempts and explicitly offered regional
  // restitution, never a forged counter, raised skill, changed seed or generic
  // first-option drain. A claimed target or another mandatory owner stops this
  // site's selection rather than being discarded. These prior source days and
  // fines are setup evidence, not extra compiled-handler/earned-life coverage.
  for(let attempt=0;attempt<4;attempt++){
   const before=copy(s),probe=valid(E.chooseAction(copy(s),'justice_burglary'));
   const claimed=probe.adventuring.loot.some(l=>l.propertyId===target.id);
   if(claimed&&!probe.event&&!probe.justice.arrest&&!(probe.legal.incidents||[]).some(i=>i.locationId===s.locationId&&i.evidence>=3)){
    stage('ordinary source capture selected after actual prior attempts',{locationId:s.locationId,priorThefts:s.justice.thefts,day:s.day});return roundtrip(before);
   }
   if(claimed)break;
   if(probe.event?.id!=='justice_arrest'||!probe.event.choices.some(c=>c.id==='pay'&&!c.disabledReason))break;
   s=pick(probe,'pay');if(s.event||s.justice.arrest)break;roundtrip(s);
  }
 }
 throw Error('No existing Bellwater site supplied a valid no-warrant ordinary-burglary public capture');
}
function vacancyCapture(base,who='host'){
 let s=act(tournamentReady(copy(base)),'tournament_suspend');
 const id=who==='host'?s.adultTournament.host.id:s.adultTournament.opponents[0].id;
 const p=getContacts(s).find(p=>p.id===id);assert.ok(p,'the vacancy concerns an actual named public participant');
 const record=projectLifePerson(s,{...p,bond:60});assert.ok(record);record.alive=false;record.deathDay=s.day;
 // Explicit recorded-death diagnostic precondition. Existing source lifecycle
 // reconciliation installs any successor; no historical card is rewritten.
 registerWorldLifeRecord(s,record);initializeFamilyDepth(s);reconcileNpcContinuity(s);s=roundtrip(s);
 assert.ok(tournamentAvailabilityReason(s));assert.equal(s.life.people.find(p=>p.id===id).alive,false);
 if(who==='host')assert.notEqual(settlementServices(s).find(p=>p.kind==='watch'&&p.here)?.personId,id,'the current watch never substitutes for the exact old administrator');
 return s;
}
function lateAllegationInvitation(){
 let s=settleSource(freshStory());s=act(s,'stories_open_hearth_letter');s=settleSource(pick(s,'care'));
 s.stories.arcs.find(a=>a.id==='hearth_letter').nextAge=s.age;
 s=act(roundtrip(s),'stories_open_hearth_letter');s=settleSource(pick(s,'coercion'));
 const report=s.stories.allegations.find(r=>r.status==='waiting');assert.ok(report,'actual retained-agreement allegation');assert.ok(s.day<report.readyDay);
 s=walk(s,'watch');s.legal.incidents=[{locationId:s.locationId,evidence:2,description:'Two earlier reports in this explicit late-arrest regression precondition.'}];
 s.legal.evidence=2;s.legal.wanted=false;s.legal.description=s.legal.incidents[0].description;s.justice.lastCheckDay=-1;s=roundtrip(s);
 s=act(s,'tournament_invite');const enforcement=regionAt(s).law.enforcement;
 const target=Array.from({length:31},(_,i)=>report.readyDay+i).find(day=>day%365!==0&&seededRoll(s.seed,`arrest:${s.locationId}:${day}:3`,100)<enforcement);
 assert.ok(target);assert.equal(Math.floor((target-1)/365),Math.floor(s.day/365));s.day=target-1;
 return roundtrip(s);
}

async function runBatch(name,states,run){
 assert.equal(states.length,3);for(const state of states)roundtrip(state);
 const ui=fakeSurface(),KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
 const wanted=states.map(copy),backups=Object.fromEntries(wanted.map((state,id)=>[id,{state:copy(state),updatedAt:'2026-10-16T00:00:00.000Z'}]));
 const initial={version:1,activeSlot:0,backups:copy(backups),slots:wanted.map((state,id)=>({id,state:copy(state),revision:`claims-tournament-v53-${name}-${id}`,updatedAt:'2026-10-17T00:00:00.000Z'}))};
 ui.storage.setItem(KEY,JSON.stringify(initial));ui.storage.setItem(MIRROR,JSON.stringify(wanted[0]));
 let slot=0,writes=0,exportCount=0,downloadClicks=0,lastBlob=null,lastAnchor=null,timerId=0,networkAttempts=0;
 const timers=new Map(),urls=new Set(),set=ui.storage.setItem.bind(ui.storage);
 ui.storage.setItem=(key,value)=>{writes++;return set(key,value);};ui.storage.removeItem=key=>{writes++;return ui.values.delete(key);};
 const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in exact claims/tournament checker');};
 const blockedApis={fetch:forbidden,XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}},SharedWorker:class{constructor(){forbidden();}}};
 class OfflineURL extends URL{
  static createObjectURL(blob){lastBlob=blob;const u=`blob:claims-tournament-${name}-${++exportCount}`;urls.add(u);return u;}
  static revokeObjectURL(u){assert.ok(urls.delete(u),'each exact export URL is revoked once');}
 }
 ui.document.createElement=tag=>{assert.equal(tag,'a');return lastAnchor={clickCount:0,click(){assert.ok(urls.has(this.href),'fresh export clicks its still-live object URL');this.clickCount++;downloadClicks++;}};};
 const locks={async request(_name,_opts,operation){return operation();}};
 let context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,
  window:{innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},addEventListener(){},navigator:{locks,sendBeacon:forbidden},...blockedApis},
  navigator:{locks,sendBeacon:forbidden},location:{href:'file:///downloads/hearth-and-oath.html',protocol:'file:'},
  requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),
  setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
  Blob,URL:OfflineURL,TextEncoder,TextDecoder,queueMicrotask,console,...blockedApis});
 // Platform compatibility only. Never expose or replace an app lexical binding.
 new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
 stage('start disposable exact standalone session',{batch:name});await compiled.evaluate(context,{timeout:30000});totals.sessions++;
 const metadata=initial.slots.map(({revision,updatedAt})=>({revision,updatedAt}));
 const disk=()=>JSON.parse(ui.storage.getItem(KEY)),storageBytes=()=>JSON.stringify([...ui.values]);
 const control=(id,op='activity')=>ui.root.querySelector(`[data-op="${op}"][data-id="${id}"]`);
 async function click(op,id){await ui.click(op,id);await turn();totals.handlerChecks++;}
 function parity(label){
  totals.parityChecks++;const saved=disk();assert.equal(saved.version,1);assert.equal(saved.activeSlot,slot,label+': exact active slot');assert.equal(saved.slots.length,3);
  assert.deepEqual(ui.current(),wanted[slot],label+': complete compatibility mirror');
  assert.deepEqual(saved.slots.map(r=>r.state),wanted,label+': all three complete saved states');assert.deepEqual(saved.backups,backups,label+': all three complete nonempty backups');
  for(const row of saved.slots){assert.equal(row.revision,metadata[row.id].revision,label+': revision');assert.equal(row.updatedAt,metadata[row.id].updatedAt,label+': timestamp');}
 }
 function settled(before,label){
  const after=disk();for(const row of before.slots)if(row.id!==slot)assert.deepEqual(after.slots[row.id],row,label+': untouched neighboring full state/revision/time');assert.deepEqual(after.backups,before.backups);
  const changed=JSON.stringify(before.slots[slot].state)!==JSON.stringify(wanted[slot]);
  if(changed)assert.notEqual(after.slots[slot].revision,before.slots[slot].revision,label+': changed state gets fresh revision');
  else assert.equal(after.slots[slot].revision,before.slots[slot].revision,label+': unchanged state keeps revision');
  assert.ok(Number.isFinite(Date.parse(after.slots[slot].updatedAt)));metadata[slot]={revision:after.slots[slot].revision,updatedAt:after.slots[slot].updatedAt};parity(label);
 }
 async function exportLife(){
  const before=storageBytes(),writeStart=writes,urlStart=exportCount,clickStart=downloadClicks;lastBlob=null;lastAnchor=null;
  await click('menu');await click('export');assert.equal(exportCount,urlStart+1,'this export creates exactly one fresh URL');assert.equal(downloadClicks,clickStart+1,'this export clicks exactly one fresh anchor');
  assert.ok(lastBlob&&lastAnchor,'an earlier export cannot satisfy this call');assert.equal(lastAnchor.clickCount,1);assert.equal(lastBlob.type,'application/json');assert.ok(urls.has(lastAnchor.href),'the exact anchor keeps this call\'s live URL until revocation');
  assert.deepEqual(JSON.parse(await lastBlob.text()),wanted[slot],'ordinary fresh exact full-session export');assert.equal(lastAnchor.download,exportFileName(wanted[slot]));
  for(const [id,t]of [...timers])if(t.delay===1000){timers.delete(id);t.fn();}
  assert.equal(urls.size,0,'ordinary export revokes its URL');await ui.key('Escape');await turn();
  assert.equal(storageBytes(),before,'export changes no state, backup, mirror or workspace byte');assert.equal(writes,writeStart,'export performs zero durable writes');totals.exports++;totals.downloadClicks++;parity('fresh exact export');
 }
 async function load(id){await click('title-menu');await click('title-load');slot=id;await click('slot-load',String(id));parity('ordinary full reload');}
 async function commit(op,id,reducer,{exportAfter=false,reloadAfter=false}={}){
  const before=disk(),input=copy(wanted[slot]),savedInput=copy(input);wanted[slot]=valid(reducer(input));assert.deepEqual(input,savedInput,'source public reducer input remains immutable');
  await click(op,id);totals.transitionChecks++;settled(before,op+'/'+(id??''));if(exportAfter)await exportLife();if(reloadAfter)await load(slot);
 }
 async function action(id,options){await commit('activity',id,s=>act(s,id),options);}
 async function choice(id,options){await commit('choice',id,s=>pick(s,id),options);}
 async function pane(id){await click('tab','activities');await click('activities-pane',id);parity('ordinary '+id+' pane');}
 async function area(target){
  await click('place-open');const route=settlementWalkPath(wanted[slot],target);assert.ok(route,'actual local path to '+target);
  if(route.length)await commit('place-area',target,s=>{for(const room of route)s=act(s,'atlas_room_'+room);return s;});
  else{await click('place-area',target);parity('current-area reopen');}
  assert.equal(wanted[slot].cartography.interior.roomId,target);
 }
 function sourceRejected(id,label=id){
  const before=copy(wanted[slot]),input=copy(before),after=valid(E.chooseAction(input,id));assert.deepEqual(input,before,'source rejection input immutable');
  assert.deepEqual({...after,notice:''},{...before,notice:''},label+': source public command inert except notice');totals.sourceRejectionChecks++;
 }
 async function inert(node,label,{disabled=false,connected=false,practice=false}={}){
  assert.ok(node,label+': actual rendered control');assert.equal(node.isConnected,connected,label+': exact control lifetime');if(disabled)assert.equal(node.disabled,true);
  const before=storageBytes(),writeStart=writes;await ui.fire('click',node);await turn();totals.handlerChecks++;
  assert.equal(storageBytes(),before,label+': zero changed storage bytes');assert.equal(writes,writeStart,label+': zero durable writes');parity(label);
  if(practice)totals.practiceBackgroundChecks++;else if(disabled)totals.disabledHandlerChecks++;else totals.staleHandlerChecks++;
 }
 async function practiceIsolation(ids){
  const before=storageBytes(),writeStart=writes;await click('menu');await click('practice-open','protect_ally');const modal=ui.root.querySelector('.practice-modal');assert.ok(modal);const token=modal.dataset.practiceSession;
  for(const id of ids)await inert(control(id),'actual connected background '+id+' stays inert during detached practice',{connected:true,practice:true});
  assert.equal(ui.root.querySelector('.practice-modal').dataset.practiceSession,token);await click('practice-close');await ui.key('Escape');await turn();
  assert.equal(storageBytes(),before);assert.equal(writes,writeStart);parity('practice opens/blocks/closes without any durable write');
 }
 async function resolveWaiting(){
  for(let n=0;n<100;n++){
   const s=wanted[slot];if(s.event){const c=['conclude_correct','care','animal','cooperate','pay','account','continue','wait','leave','later','avoid','pause','keep'].map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason);assert.ok(c);await choice(c.id);}
   else if(s.conversations?.pending){const p=s.conversations.pending;await commit('reply',p.replies[0].id,s=>E.replyMessage(s,p.personId,p.replies[0].id));}
   else if(s.stories?.project){await pane('daily');await action('stories_continue');}
   else if(s.timeline.yearTarget!==null)await commit('continue-age',undefined,s=>E.continueAgeUp(s));
   else return;
  }
  throw Error('Actual compiled waiting-moment controls did not reach a bounded pause');
 }
 async function visitDoctor(){
  await pane('recovery');const doctor=settlementServices(wanted[slot]).find(r=>r.kind==='doctor');assert.ok(doctor,'actual local doctor');assert.ok(control(doctor.id,'activity-visit'),'rendered Recovery doctor shortcut');
  const route=settlementWalkPath(wanted[slot],doctor.roomId);assert.ok(route);await commit('activity-visit',doctor.id,s=>{for(const room of route)s=act(s,'atlas_room_'+room);return E.visitService(s,doctor.id);});
  assert.ok(ui.root.querySelector('.service-meeting'));assert.ok(control('health_clinic'),'actual rendered Doctor treatment');
 }
 const h={ui,wanted,get state(){return wanted[slot];},get slot(){return slot;},disk,storageBytes,control,click,parity,exportLife,load,commit,action,choice,pane,area,sourceRejected,inert,practiceIsolation,resolveWaiting,visitDoctor,settled};
 await click('title-continue');parity('initial canonical full load');await exportLife();await run(h);
 for(let id=0;id<3;id++){await load(id);roundtrip(wanted[id]);await exportLife();}
 assert.equal(networkAttempts,0,'no network API was attempted in this exact standalone session');assert.equal(urls.size,0);totals.networkAttempts+=networkAttempts;
 stage('disposable exact session verified',{batch:name,exports:exportCount,networkAttempts});context=null;
}

const identityOf=s=>({profession:s.hero.profession,path:s.hero.path,specialization:s.hero.specialization,skills:copy(s.hero.skills),learned:copy(s.progression.learnedClassIds),equipment:copy(s.equipment)});
function noNewSilver(before,after){assert.deepEqual(after.adventuring.loot,before.adventuring.loot);assert.deepEqual(after.justice.takenProperties,before.justice.takenProperties);}
function exactSilver(s,target){const held=s.adventuring.loot.filter(l=>l.propertyId===target.id);assert.equal(held.length,1);const loot=held[0];assert.equal(loot.name,target.name);assert.equal(loot.ownerId,target.ownerId);assert.equal(loot.ownerName,target.ownerName);assert.equal(loot.value,target.value);assert.equal(loot.stolen,true);assert.ok(s.justice.takenProperties.includes(target.id));assert.equal(s.justice.takenProperties.filter(id=>id===target.id).length,1);return copy(loot);}
async function sellAndReject(h,target){
 await h.click('tab','inventory');const loot=exactSilver(h.state,target);await h.click('inventory-item','loot:'+loot.id);
 assert.match(h.ui.root.innerHTML,/Original owner:/);assert.ok(h.ui.root.innerHTML.includes(loot.ownerName));assert.match(h.ui.root.innerHTML,/the fence/);
 const sale='realm_sellloot_'+loot.id,stale=h.control(sale),gold=h.state.hero.gold,day=h.state.day;assert.ok(stale&&!stale.disabled);
 await h.action(sale,{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,day);assert.equal(h.state.hero.gold,gold+Math.floor(loot.value*.55));assert.equal(h.state.adventuring.loot.some(l=>l.id===loot.id),false);assert.ok(propertyAlreadyTaken(h.state,target.id));
 if(h.state.justice.countingTableJob?.status==='completed')assert.match(countingTableJournalRows(h.state,{archive:true})[0].result,/Claimed; no longer carried/,'sale updates the read-only disposition, never erases earned proof');
 h.sourceRejected(sale,'already sold silver cannot pay twice');await h.inert(stale,'detached sold-valuable fence command cannot pay twice');
 await h.pane('crime');const burglary=h.control('justice_burglary');assert.ok(burglary?.disabled,'sale leaves the exact shared world claim intact');
 h.sourceRejected('justice_burglary','sold silver cannot be burgled again');await h.inert(burglary,'actual disabled duplicate burglary after sale',{disabled:true,connected:true});
}

stage('capture combined source cases');
const combined=captureClaimsTournamentBase(),opportunity=captureClaimOpportunity(copy(combined)),parent=captureCombinedSuccessorParent();
assert.equal(combined.justice.countingTableJob.stage,'preparation');assert.equal(combined.researchPortfolio.project,null);assert.equal(combined.repertoire.project,null);assert.equal(combined.adultTournament.stage,'paused');
assert.equal(opportunity.justice.countingTableJob.stage,'opportunity');assert.equal(opportunity.event,null);
await runBatch('shared-silver-and-successor',[ordinaryAcceptedStart(),opportunity,parent],async h=>{
 await h.pane('crime');const planBefore=copy(h.state.justice.countingTableJob),target=copy(planBefore.target),before=copy(h.state),stalePrepare=h.control('justice_job_prepare');
 assert.equal(countingTableCommitment(h.state),null,'accepted preparation plan is not attended phase ownership');assert.ok(h.control('justice_burglary')&&!h.control('justice_burglary').disabled);
 await h.practiceIsolation(['justice_burglary','justice_job_prepare']);await h.action('justice_burglary',{exportAfter:true,reloadAfter:true});
 assert.equal(h.state.day,before.day+2);assert.deepEqual(h.state.justice.countingTableJob,planBefore,'ordinary burglary cannot erase or silently finish an accepted plan');exactSilver(h.state,target);
 assert.equal(before.hero.gold-h.state.hero.gold,h.state.householdBudget.paidGold-before.householdBudget.paidGold,'ordinary burglary pays no instant Gold, apart from real living costs');
 await h.inert(stalePrepare,'earlier accepted-plan preparation handler is detached after ordinary burglary');
 await h.pane('crime');const duplicate=h.control('justice_burglary'),blockedPrepare=h.control('justice_job_prepare');assert.ok(duplicate?.disabled&&blockedPrepare?.disabled);
 for(const [id,node]of [['justice_burglary',duplicate],['justice_job_prepare',blockedPrepare]]){h.sourceRejected(id,'ordinary shared claim blocks '+id);await h.inert(node,'actual disabled shared-claim '+id,{disabled:true,connected:true});}
 await sellAndReject(h,target);await h.action('justice_job_withdraw');assert.equal(h.state.justice.countingTableJob.status,'withdrawn');

 await h.load(1);await h.pane('crime');const prepared=copy(h.state),savedRun=copy(h.state.justice.countingTableJob);assert.equal(savedRun.work.length,3);assert.equal(savedRun.attempt.approach.succeeded,true);noNewSilver(combined,h.state);
 await h.action('justice_job_review');assert.equal(h.state.event.id,'justice_counting_departure');assert.match(h.ui.root.innerHTML,/One actual departure day/);await h.exportLife();
 const staleDepart=h.control('depart','choice');await h.choice('depart',{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,prepared.day+1);assert.equal(h.state.justice.countingTableJob.status,'completed');
 assert.deepEqual(h.state.justice.countingTableJob.target,savedRun.target);assert.deepEqual(h.state.justice.countingTableJob.work,savedRun.work);assert.deepEqual(h.state.justice.countingTableJob.attempt.approach,savedRun.attempt.approach);
 exactSilver(h.state,savedRun.target);assert.equal(h.state.hero.gold,prepared.hero.gold-(h.state.householdBudget.paidGold-prepared.householdBudget.paidGold));
 assert.deepEqual(h.state.researchPortfolio,prepared.researchPortfolio);assert.deepEqual(h.state.repertoire,prepared.repertoire);assert.deepEqual(h.state.adultTournament,prepared.adultTournament);
 await h.inert(staleDepart,'completed departure cannot replay its earlier actual choice');assert.equal(countingTableJournalRows(h.state,{archive:true})[0].result,h.state.justice.countingTableJob.ending,'carried result retains the exact earned ending, not a no-longer-carried claim');assert.match(h.state.justice.countingTableJob.ending,/same stolen valuable is in your bag; no Gold was awarded/);await sellAndReject(h,savedRun.target);

 await h.load(2);const retired=copy(h.state),oldOwner=retired.dynasty.activePersonId,own=copy(childRecord(retired).adultLife),oldPiece=pieceId(retired),notes=copy(retired.playerNotes),historyJournal=copy(retired.journal),maze=copy(retired.mazeBook);
 assert.equal(retired.phase,'retired');assert.equal(notes.length,100);assert.ok(own.residence&&own.work.trainingDays>0);assert.ok(maze.records.length&&maze.expeditionReceipts.length);assert.ok(retired.justice.takenProperties.length);assert.ok(retired.adultTournament.results.length);
 await h.click('tab','legacy');assert.ok(h.control('lineage_continue_child-1'));await h.action('lineage_continue_child-1',{exportAfter:true,reloadAfter:true});
 assert.equal(h.state.dynasty.generation,retired.dynasty.generation+1);assert.equal(h.state.locationId,own.residence.locationId);assert.equal(h.state.hero.profession,own.goal.profession);
 assert.equal(h.state.careers.records[h.state.hero.profession].workedDays,own.work.trainingDays);assert.equal(h.state.careers.records[h.state.hero.profession].paidWorkedDays,0);assert.equal(h.state.careers.records[h.state.hero.profession].earnedGold,0);assert.deepEqual(h.state.hero.skills,childRecord(retired).development.skills);
 assert.deepEqual(h.state.dynasty.history.find(row=>row.personId===oldOwner).personalNotes,notes);assert.deepEqual(h.state.playerNotes,[]);assert.equal(h.state.researchPortfolio,undefined);assert.equal(h.state.repertoire,undefined);assert.equal(h.state.adultTournament,undefined);
 assert.deepEqual(h.state.mazeBook.records,maze.records);assert.deepEqual(h.state.mazeBook.expeditionReceipts,maze.expeditionReceipts);assert.deepEqual(h.state.journal.slice(0,historyJournal.length),historyJournal);assert.deepEqual(h.state.justice.takenProperties,retired.justice.takenProperties);
 assert.deepEqual(h.state.legal.incidents,[]);assert.equal(h.state.legal.evidence,0);assert.equal(h.state.justice.arrest,null);assert.equal(h.state.justice.prison,null);assert.equal(h.state.justice.countingTableJob,undefined);
 for(const id of ['research_copy_axle_rubbing',`repertoire_rehearse_${oldPiece}_solo`,'tournament_resume','tournament_bout_0','justice_job_continue'])h.sourceRejected(id,'the heir has no inherited private/project/tournament authority: '+id);
 const familyNote=personalNoteRows(h.state).find(n=>!n.own);assert.ok(familyNote);assert.equal(reviewPersonalNote(h.state,familyNote.key),null);
 await h.click('tab','journal');await h.click('workspace-section','journal:archive');assert.ok(h.ui.root.querySelector('.expedition-receipts'));assert.equal(h.ui.root.querySelector('.research-archive'),null);
 await h.click('workspace-section','journal:notes');await h.click('personal-notes-scope','family');assert.ok(h.ui.root.querySelector('.personal-note'));assert.equal(h.ui.root.querySelector('[data-op="personal-note-edit"]'),null);assert.equal(h.ui.root.querySelector('[data-op="personal-note-archive"]'),null);
 await h.click('personal-notes-scope','current');const form=h.ui.root.querySelector('#player-note');assert.ok(form&&!form.querySelector('textarea').disabled);const text='  a separate v53 heir reminder Ω\n\n<&>  ',history=copy(h.state.dynasty.history),diskBefore=h.disk();form.querySelector('textarea').value=text;
 h.wanted[h.slot]=roundtrip(E.keepPlayerNote(copy(h.state),text));await h.ui.fire('submit',form);await turn();totals.handlerChecks++;totals.transitionChecks++;h.settled(diskBefore,'actual heir reminder form');assert.equal(h.state.playerNotes[0].text,text.trim());assert.equal(h.state.playerNotes[0].ownerId,h.state.dynasty.activePersonId);assert.deepEqual(h.state.dynasty.history,history);await h.exportLife();
 outcomes.push({case:'world-silver-and-successor',ordinaryDays:2,plannedDepartureDays:1,parentNotes:notes.length,heirOwnReminder:true});
});
await turn();globalThis.gc?.();

function sourceDuelPolicy(s){
 const b=copy(s.battle),hero=b.actors.find(a=>a.id==='hero');assert.equal(b.actors.length,2);assert.equal(prohibitedDuelState(b),false);assert.ok(validateAdultTournament(s));
 const offers=getBattleActions(b),forbidden=['blood','bloodline','feral','spell_fire','capture','hold_back','surrender','party_cover','tech_venom_edge','tech_grave_attendant','tech_execution_window'];
 for(const id of forbidden){
  const offered=offers.find(a=>a.id===id);assert.ok(!offered||offered.disabledReason,'prohibited command is absent or honestly disabled: '+id);
  const before=copy(b);assert.equal(previewBattleAction(b,id,'enemy-1').legal,false,id+': no legal preview');assert.deepEqual(b,before,'preview never alters the actual battle');
  const rejected=takeBattleAction(b,id,'enemy-1');assert.deepEqual({...rejected,log:[]},{...b,log:[]},id+': direct resolver rejection spends no turn, Health, Focus, potion or effect');assert.deepEqual(b,before);
  const publicInput=copy(s),publicBefore=copy(publicInput),publicAfter=E.chooseBattleAction(publicInput,id,'enemy-1');assert.deepEqual(publicInput,publicBefore);
  assert.deepEqual({...publicAfter,battle:{...publicAfter.battle,log:[]}},{...s,battle:{...b,log:[]}},id+': public source rejection is separate from compiled-handler proof');totals.sourceBattlePolicyChecks++;
 }
 assert.equal(hero.id,'hero');
}
async function enterActual(h,{defer=false}={}){
 stage('begin actual solo invitation/preparation',{slot:h.slot,defer});
 await h.pane('training');const before=copy(h.state);await h.action('tournament_invite');assert.equal(h.state.event.id,'tournament_invitation');assert.equal(h.state.day,before.day);assert.equal(h.state.hero.gold,before.hero.gold);assert.match(h.ui.root.innerHTML,/One actual preparation day|one actual preparation day/);
 const offered=copy(h.state.adultTournament);assert.equal(offered.host.id,settlementServices(h.state).find(p=>p.kind==='watch'&&p.here).personId);assert.ok(offered.opponents.every(p=>getContacts(h.state).some(current=>current.id===p.id)));
 assert.deepEqual(identityOf(h.state),identityOf(before));
 if(defer){await h.choice('later',{exportAfter:true,reloadAfter:true});assert.deepEqual(h.state.adultTournament,{...offered,pending:null});assert.equal(h.state.day,before.day);await h.pane('training');await h.action('tournament_invite');assert.deepEqual(h.state.adultTournament,offered,'deferral retains the exact roster and finite card');}
 const start=copy(h.state);await h.choice('enter',{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,start.day+1);assert.equal(h.state.adultTournament.paidDays,1);assert.deepEqual(identityOf(h.state),identityOf(start));
 assert.equal(start.hero.gold-h.state.hero.gold,h.state.householdBudget.paidGold-start.householdBudget.paidGold,'only real household accrual, never a tournament fee');
 await h.resolveWaiting();if(h.state.adultTournament.stage==='paused'){await h.area('watch');await h.pane('training');await h.action('tournament_resume');}
 assert.equal(h.state.adultTournament.stage,'ready');await h.pane('training');assert.match(h.ui.root.innerHTML,/Preparation: 1\/1 actual day attended/);
 stage('actual solo preparation ready',{slot:h.slot});
 return before;
}
async function beginActual(h){
 stage('begin actual solo bout',{slot:h.slot,results:h.state.adultTournament.results.length});
 await h.pane('training');const i=h.state.adultTournament.results.length,day=h.state.day,roster=copy(h.state.adultTournament.opponents);await h.action('tournament_bout_'+i,{exportAfter:true,reloadAfter:true});
 assert.equal(h.state.day,day);assert.equal(h.state.battle.context.kind,'tournament');assert.equal(h.state.battle.actors.length,2);assert.equal(h.state.battle.actors[1].sourcePersonId,roster[i].id);assert.equal(prohibitedDuelState(h.state.battle),false);sourceDuelPolicy(h.state);
 await h.click('tab','life');assert.ok(h.ui.root.querySelector('[data-op="battle-action"]'),'same actual shared battle UI renders the real solo resolver');assert.equal(h.ui.root.querySelector('[data-battle-outlook]'),null,'the local contest does not make a generic encounter-outlook claim');
 stage('actual solo bout/policy ready',{slot:h.slot,results:h.state.adultTournament.results.length,sourceBattlePolicyChecks:totals.sourceBattlePolicyChecks});
 return copy(h.state);
}
async function move(h,id){
 const offered=getBattleActions(h.state.battle).find(a=>a.id===id);assert.ok(offered&&!offered.disabledReason,id+': source actual permitted move');const target=offered.targetSide==='party'?'hero':offered.needsTarget?'enemy-1':undefined,day=h.state.day;
 await h.commit('battle-action',id,s=>E.chooseBattleAction(s,id,target));totals.battleCommands++;assert.equal(h.state.day,day);assert.equal(h.state.battle.actors.length,2);assert.equal(prohibitedDuelState(h.state.battle),false);assert.ok(validateAdultTournament(h.state));
 if(totals.battleCommands%10===0)stage('actual solo command progress',{battleCommands:totals.battleCommands,bouts:totals.bouts,slot:h.slot});
}
async function finishActual(h,start,{outcome,purse=0}={}){
 const completed=copy(h.state.battle),hero=completed.actors.find(a=>a.id==='hero'),day=h.state.day,gold=h.state.hero.gold,exp=h.state.hero.exp,prior=copy(h.state),staleFinish=h.control('','battle-finish')||h.ui.root.querySelector('[data-op="battle-finish"]');
 assert.equal(completed.outcome,outcome);assert.ok(staleFinish);await h.exportLife();await h.load(h.slot);assert.deepEqual(h.state.battle,completed,'ordinary reload keeps the exact actual completed packet');await h.click('tab','life');
 await h.commit('battle-finish',undefined,s=>E.resolveBattle(s,copy(s.battle)),{exportAfter:true,reloadAfter:true});totals.bouts++;
 assert.equal(h.state.day,day);assert.equal(h.state.hero.gold,gold+purse);assert.equal(h.state.hero.exp,exp);assert.equal(h.state.hero.hp,Math.max(1,hero.hp));assert.equal(h.state.hero.mp,hero.mp);assert.equal(h.state.hero.potions,completed.potions);assert.deepEqual(identityOf(h.state),identityOf(start));assert.equal(h.state.phase,'adult');
 assert.equal(h.state.health.deathCause,prior.health.deathCause);assert.deepEqual(h.state.life.people.map(p=>[p.id,p.alive]),prior.life.people.map(p=>[p.id,p.alive]));
 const result=h.state.adultTournament.results.at(-1);assert.equal(result.battleId,completed.instanceId);assert.equal(result.day,day);assert.equal(result.heroStartHp,completed.startingHeroHp);assert.equal(result.heroStartMp,prior.hero.mp);assert.equal(result.heroEndHp,hero.hp);assert.equal(result.heroEndMp,hero.mp);assert.equal(result.potionsStart,prior.hero.potions);assert.equal(result.potionsEnd,completed.potions);assert.equal(result.opponentEndHp,completed.actors.find(a=>a.id==='enemy-1').hp);
 const after=copy(h.state),repeat=valid(E.resolveBattle(copy(h.state),completed));assert.deepEqual({...repeat,notice:''},{...after,notice:''},'source exact completion cannot settle again');totals.sourceRejectionChecks++;await h.inert(staleFinish,'detached actual completed-bout control cannot settle twice');
 stage('actual solo result settled',{outcome,bouts:totals.bouts,battleCommands:totals.battleCommands});
 return completed;
}

const tournamentBase=tournamentFresh(),tournamentVampire=tournamentFresh({family:true,potions:1});
await runBatch('actual-solo-results',[tournamentVampire,tournamentBase,copy(tournamentBase)],async h=>{
 await enterActual(h,{defer:true});const retreatStart=await beginActual(h),prohibited=getBattleActions(h.state.battle).filter(a=>a.disabledReason&&/Outside the challenge rules/.test(a.disabledReason));
 assert.ok(prohibited.some(a=>a.id==='blood'),'the real source-captured vampire supplies an actually offered prohibited command');
 for(const a of prohibited){const node=h.control(a.id,'battle-action');assert.ok(node?.disabled);await h.inert(node,'actual disabled prohibited '+a.id,{disabled:true,connected:true});}
 const oldAttack=h.control('attack','battle-action');await move(h,'inspect');await h.exportLife();await h.load(0);await h.inert(oldAttack,'old actual battle command cannot act after reload');await h.click('tab','life');await move(h,'retreat');await finishActual(h,retreatStart,{outcome:'retreat'});
 assert.equal(h.state.adultTournament.endReason,'withdrawn');assert.equal(h.state.adultTournament.results[0].outcome,'withdrawn');assert.equal(h.state.adultTournament.prize,null);assert.ok(settlementServices(h.state).some(p=>p.kind==='watch'&&p.here));

 await h.load(1);await enterActual(h);const lossStart=await beginActual(h);let used=false;
 for(let n=0;n<240&&!h.state.battle.outcome;n++){const hero=h.state.battle.actors.find(a=>a.id==='hero'),potion=!used&&h.state.battle.potions>0&&hero.hp<=hero.maxHp-25;await move(h,potion?'potion':'defend');if(potion)used=true;}
 assert.equal(used,true);const lost=await finishActual(h,lossStart,{outcome:'defeat'});assert.equal(lost.potionsUsed,1);assert.equal(h.state.hero.hp,1);assert.deepEqual(tournamentScore(h.state.adultTournament),{wins:0,losses:1,played:1});assert.equal(h.state.adultTournament.stage,'ready');assert.equal(h.state.adultTournament.prize,null);
 await h.pane('training');const card=copy(h.state.adultTournament),beforePotion=copy(h.state);await h.commit('use-consumable','potions',s=>E.useConsumable(s,'potions'));assert.equal(h.state.day,beforePotion.day);assert.equal(h.state.hero.hp,31);assert.equal(h.state.hero.potions,beforePotion.hero.potions-1);assert.deepEqual(h.state.adultTournament,card);
 await h.pane('training');await h.action('tournament_withdraw',{exportAfter:true});assert.equal(h.state.adultTournament.prize,null);

 await h.load(2);await enterActual(h);const identityBefore=identityOf(h.state),originalExp=h.state.hero.exp;let lastPacket;
 for(let i=0;i<3;i++){
  if(i){
   await h.pane('training');const cardBefore=copy(h.state.adultTournament);await h.action('tournament_suspend');assert.ok(h.ui.root.querySelector('[data-op="tournament-care"]'));await h.click('tournament-care');assert.ok(h.ui.root.querySelector('[data-activity-category="recovery"]'));
   for(let n=0;n<8&&h.state.hero.hp<h.state.hero.maxHp;n++){
    const day=h.state.day;await h.visitDoctor();const care=E.getActions(h.state).find(a=>a.id==='health_clinic'&&!a.disabledReason);assert.ok(care,'actual local Doctor treatment, never hidden Health-tab or free tournament healing');
    await h.action(care.id);await h.resolveWaiting();assert.ok(h.state.day>=day+care.days,'real care pays its attended days');
   }
   await h.area('watch');await h.pane('training');await h.action('tournament_resume');assert.equal(h.state.adultTournament.paidDays,1);assert.deepEqual(h.state.adultTournament.results,cardBefore.results);assert.deepEqual(h.state.adultTournament.opponents,cardBefore.opponents);
  }
  const start=await beginActual(h);
  for(let n=0;n<240&&!h.state.battle.outcome;n++){const hero=h.state.battle.actors.find(a=>a.id==='hero'),enemy=h.state.battle.actors.find(a=>a.id==='enemy-1'),id=hero.hp<=15&&h.state.battle.potions>0?'potion':enemy.status.charged?'inspect':'attack';await move(h,id);}
  lastPacket=await finishActual(h,start,{outcome:'victory',purse:i===2?TOURNAMENT_PURSE:0});assert.equal(h.state.hero.exp,originalExp);
 }
 assert.deepEqual(identityOf(h.state),identityBefore);assert.deepEqual(tournamentScore(h.state.adultTournament),{wins:3,losses:0,played:3});assert.equal(h.state.adultTournament.endReason,'completed');assert.equal(h.state.adultTournament.prize.amount,24);assert.equal(h.state.adultTournament.prize.key,h.state.adultTournament.id+':purse');
 const completed=copy(h.state);for(const id of ['tournament_bout_0','tournament_bout_2','tournament_prepare','tournament_resume'])h.sourceRejected(id,'finished card never repeats preparation, result or purse: '+id);
 const repeatFinal=valid(E.resolveBattle(copy(h.state),lastPacket));assert.deepEqual({...repeatFinal,notice:''},{...completed,notice:''},'final exact packet cannot award the purse twice');totals.sourceRejectionChecks++;await h.pane('training');assert.equal(h.control('tournament_bout_0'),null);assert.match(h.ui.root.innerHTML,/24 Gold awarded once/);await h.exportLife();
 outcomes.push({case:'actual-solo-results',retreat:1,loss:1,wins:3,purse:TOURNAMENT_PURSE,actualResolverOnly:true});
});
await turn();globalThis.gc?.();

await runBatch('attended-project-ownership',[captureClaimProject(copy(combined)),captureResearchProject(copy(combined)),captureRepertoireProject(copy(combined))],async h=>{
 const claimBefore=copy(h.state),phase=copy(h.state.justice.countingTableJob.attempt.approach.commitment),piece=pieceId(h.state);
 assert.equal(E.getLifeCommitment(h.state).kind,'justice_job');assert.equal(h.state.day,phase.committedDay);assert.equal(h.state.justice.countingTableJob.attempt.approach.completedDay,null);assert.equal(h.state.justice.countingTableJob.work.length,3);noNewSilver(combined,h.state);
 for(const id of ['research_copy_axle_rubbing','research_continue',`repertoire_rehearse_${piece}_solo`,'repertoire_continue','tournament_resume','home_rest'])h.sourceRejected(id,'actual approach owns its public boundary: '+id);
 await h.pane('fun');assert.equal(h.control(`repertoire_rehearse_${piece}_solo`),null);await h.pane('training');assert.equal(h.control('tournament_resume'),null,'actual approach ownership omits the incompatible suspended-card resume');
 await h.pane('crime');const staleContinue=h.control('justice_job_continue');await h.exportLife();await h.load(0);assert.deepEqual(h.state.justice.countingTableJob.attempt.approach.commitment,phase);await h.pane('crime');await h.action('justice_job_continue',{exportAfter:true});
 assert.equal(h.state.day,claimBefore.day+1);assert.deepEqual(h.state.justice.countingTableJob.attempt.approach.commitment,phase);assert.equal(h.state.justice.countingTableJob.attempt.approach.succeeded,true);assert.equal(h.state.justice.countingTableJob.stage,'opportunity');noNewSilver(claimBefore,h.state);await h.inert(staleContinue,'completed approach cannot reuse an old actual continue');
 await h.choice('later');assert.equal(E.getLifeCommitment(h.state),null);await h.pane('crime');await h.action('justice_job_review');
 // Commit the departure at a real same-day deadline via the already source-
 // captured branch, in the source-only companion tests. This compiled positive
 // path takes its ordinary final day without replacing that historical phase.
 await h.choice('depart',{exportAfter:true,reloadAfter:true});assert.equal(h.state.justice.countingTableJob.status,'completed');assert.equal(h.state.day,claimBefore.day+2);exactSilver(h.state,claimBefore.justice.countingTableJob.target);

 await h.load(1);const researchBefore=copy(h.state),researchPiece=pieceId(h.state);assert.equal(E.getLifeCommitment(h.state).kind,'research');assert.equal(h.state.researchPortfolio.project.completedDays,0);assert.equal(h.state.researchPortfolio.project.remainingDays,1);
 for(const id of ['justice_job_prepare','justice_job_continue','tournament_resume',`repertoire_rehearse_${researchPiece}_solo`,'repertoire_continue'])h.sourceRejected(id,'research attendance owns its public boundary: '+id);
 await h.pane('crime');assert.equal(h.control('justice_job_prepare'),null);await h.pane('fun');assert.equal(h.control(`repertoire_rehearse_${researchPiece}_solo`),null);await h.click('tab','life');const oldResearch=h.control('research_continue');assert.ok(oldResearch);
 await h.exportLife();await h.load(1);await h.click('tab','life');await h.action('research_continue',{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,researchBefore.day+1);assert.equal(h.state.researchPortfolio.project,null);assert.equal(h.state.researchPortfolio.runs[0].copies.length,researchBefore.researchPortfolio.runs[0].copies.length+1);assert.deepEqual(h.state.justice.countingTableJob,researchBefore.justice.countingTableJob);assert.deepEqual(h.state.repertoire,researchBefore.repertoire);assert.deepEqual(h.state.adultTournament,researchBefore.adultTournament);
 h.sourceRejected('research_continue','completed research attendance cannot repeat');await h.inert(oldResearch,'old actual research continue cannot repeat');

 await h.load(2);const workBefore=copy(h.state),workPiece=pieceId(h.state);assert.equal(E.getLifeCommitment(h.state).kind,'repertoire');assert.equal(h.state.repertoire.project.completedDays,0);assert.equal(h.state.repertoire.project.remainingDays,1);
 for(const id of ['justice_job_prepare','justice_job_continue','research_copy_axle_rubbing','research_continue','tournament_resume'])h.sourceRejected(id,'manuscript attendance owns its public boundary: '+id);
 await h.pane('crime');assert.equal(h.control('justice_job_prepare'),null);await h.pane('fun');const oldWork=h.control('repertoire_continue');assert.ok(oldWork);assert.equal(h.control(`repertoire_rehearse_${workPiece}_solo`),null);
 await h.exportLife();await h.load(2);await h.pane('fun');await h.action('repertoire_continue',{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,workBefore.day+1);assert.equal(h.state.repertoire.project,null);assert.equal(h.state.repertoire.pieces[0].rehearsal.attendedDays,1);assert.deepEqual(h.state.justice.countingTableJob,workBefore.justice.countingTableJob);assert.deepEqual(h.state.researchPortfolio,workBefore.researchPortfolio);assert.deepEqual(h.state.adultTournament,workBefore.adultTournament);assert.deepEqual(h.state.hero.skills,workBefore.hero.skills);assert.deepEqual(h.state.careers,workBefore.careers);
 h.sourceRejected('repertoire_continue','completed rehearsal attendance cannot repeat');await h.inert(oldWork,'old actual manuscript continue cannot repeat');
 outcomes.push({case:'attended-project-ownership',approachDays:1,departureDays:1,researchDays:1,rehearsalDays:1,noReroll:true});
});
await turn();globalThis.gc?.();

const vacancy=vacancyCapture(tournamentBase),lateInvitation=lateAllegationInvitation();
// The second exact-person branch is checked with source public controls, not
// mislabeled as an additional compiled vacancy or a naturally occurring death.
const unavailableEntrant=vacancyCapture(tournamentBase,'opponent'),entrantBefore=copy(unavailableEntrant),entrantClosed=act(copy(unavailableEntrant),'tournament_close');
assert.deepEqual(unavailableEntrant,entrantBefore);assert.equal(entrantClosed.adultTournament.endReason,'unavailable');assert.deepEqual(entrantClosed.adultTournament.opponents,entrantBefore.adultTournament.opponents);assert.equal(entrantClosed.adultTournament.results.length,0);assert.equal(entrantClosed.adultTournament.prize,null);assert.equal(entrantClosed.day,entrantBefore.day);assert.equal(entrantClosed.hero.gold,entrantBefore.hero.gold);roundtrip(entrantClosed);totals.sourceEntrantVacancyChecks++;
await runBatch('locked-card-vacancy-and-custody',[captureLockedTournament(copy(combined)),vacancy,lateInvitation],async h=>{
 const locked=copy(h.state),p=pieceId(h.state);assert.equal(E.getLifeCommitment(h.state).kind,'tournament');
 for(const id of ['justice_job_prepare','justice_job_continue','research_copy_axle_rubbing','research_continue',`repertoire_rehearse_${p}_solo`,'repertoire_continue'])h.sourceRejected(id,'ready tournament owns the public attendance boundary: '+id);
 await h.pane('crime');assert.equal(h.control('justice_job_prepare'),null);await h.pane('fun');assert.equal(h.control(`repertoire_rehearse_${p}_solo`),null);await h.pane('training');const oldBout=h.control('tournament_bout_0');assert.ok(oldBout);
 await h.practiceIsolation(['tournament_bout_0','tournament_suspend']);await h.action('tournament_suspend',{exportAfter:true,reloadAfter:true});assert.equal(E.getLifeCommitment(h.state),null);assert.deepEqual(h.state.justice.countingTableJob,locked.justice.countingTableJob);assert.deepEqual(h.state.researchPortfolio,locked.researchPortfolio);assert.deepEqual(h.state.repertoire,locked.repertoire);
 await h.inert(oldBout,'detached ready-card bout cannot start while the card is suspended');await h.area('homes');assert.ok(h.control('research_copy_axle_rubbing')&&!h.control('research_copy_axle_rubbing').disabled);assert.ok(h.control(`repertoire_rehearse_${p}_solo`)&&!h.control(`repertoire_rehearse_${p}_solo`).disabled);
 await h.practiceIsolation(['research_copy_axle_rubbing',`repertoire_rehearse_${p}_solo`]);

 await h.load(1);const missing=copy(h.state),host=missing.adultTournament.host;assert.equal(missing.life.people.find(p=>p.id===host.id).alive,false);assert.ok(tournamentAvailabilityReason(h.state));await h.pane('training');const unavailable=h.control('tournament_resume');assert.ok(unavailable?.disabled);h.sourceRejected('tournament_resume','exact unavailable captain is never replaced');await h.inert(unavailable,'actual disabled exact-captain resume',{disabled:true,connected:true});await h.inert(oldBout,'earlier enabled bout cannot act on an unavailable-person slot');
 await h.action('tournament_close',{exportAfter:true,reloadAfter:true});assert.equal(h.state.adultTournament.endReason,'unavailable');assert.deepEqual(h.state.adultTournament.opponents,missing.adultTournament.opponents);assert.deepEqual(h.state.adultTournament.results,missing.adultTournament.results);assert.equal(h.state.day,missing.day);assert.equal(h.state.hero.gold,missing.hero.gold);assert.equal(h.state.adultTournament.prize,null);assert.equal(h.state.life.people.find(p=>p.id===host.id).alive,false);totals.compiledHostVacancyChecks++;

 await h.load(2);assert.equal(h.state.event.id,'tournament_invitation');const day=h.state.day,roster=copy(h.state.adultTournament.opponents),offeredHost=copy(h.state.adultTournament.host);await h.choice('enter',{exportAfter:true,reloadAfter:true});assert.equal(h.state.day,day+1);assert.equal(h.state.adultTournament.paidDays,1);assert.equal(h.state.event.id,'stories_allegation');assert.equal(h.state.justice.arrest,null);assert.equal(h.state.legal.incidents.find(i=>i.locationId===h.state.locationId).evidence,3);
 // This declared controlled date remains within the same calendar year.
 // Acceptance stamps its current day, not the earlier offer day, while every
 // exact person/age/profile/appearance field must remain unchanged.
 assert.equal(Math.floor(day/365),Math.floor(h.state.adultTournament.offeredDay/365));assert.equal(h.state.adultTournament.acceptedDay,day);assert.deepEqual(h.state.adultTournament.opponents,roster.map(p=>({...p,ageDay:day})));assert.deepEqual(h.state.adultTournament.host,{...offeredHost,ageDay:day});
 const allegation=copy(h.state),gold=h.state.hero.gold;await h.choice('defend',{exportAfter:true,reloadAfter:true});assert.equal(h.state.event.id,'justice_arrest');assert.equal(h.state.justice.arrest.evidence,3);assert.equal(h.state.adultTournament.stage,'paused');assert.equal(h.state.day,allegation.day);assert.equal(h.state.hero.gold,gold);assert.equal(h.state.adultTournament.paidDays,1);assert.deepEqual(h.state.adultTournament.opponents,allegation.adultTournament.opponents);assert.deepEqual(h.state.adultTournament.host,allegation.adultTournament.host);assert.deepEqual(h.state.adultTournament.results,[]);assert.equal(h.state.adultTournament.prize,null);
 for(const id of ['tournament_prepare','tournament_resume','tournament_bout_0'])h.sourceRejected(id,'late mandatory arrest blocks '+id);
 await h.inert(oldBout,'old enabled tournament control cannot bypass mandatory arrest');await h.choice('surrender',{exportAfter:true,reloadAfter:true});assert.equal(h.state.justice.arrest,null);assert.ok(h.state.justice.prison);assert.equal(h.state.justice.prison.servedDays,0);assert.equal(h.state.adultTournament.stage,'paused');assert.equal(h.state.adultTournament.paidDays,1);assert.equal(h.state.day,allegation.day);assert.equal(h.state.hero.gold,gold);assert.equal(h.state.adultTournament.prize,null);
 assert.deepEqual(h.state.adultTournament.opponents,allegation.adultTournament.opponents);assert.deepEqual(h.state.adultTournament.host,allegation.adultTournament.host);assert.deepEqual(h.state.adultTournament.results,allegation.adultTournament.results);
 for(const id of ['tournament_prepare','tournament_resume','tournament_bout_0'])h.sourceRejected(id,'custody blocks '+id);assert.ok(E.getActions(h.state).some(a=>a.id==='justice_serve'&&!a.disabledReason),'canonical custody action remains playable');
 await h.click('place-open');h.parity('actual canonical custody view opens without attendance');const serve=h.control('justice_serve');assert.ok(serve?.isConnected&&!serve.disabled,'the actual rendered canonical custody view offers enabled Serve one day');assert.equal(h.state.justice.prison.servedDays,0,'render inspection is not a sentence day');totals.renderedCustodyChecks++;totals.lateCustodyChecks++;
 outcomes.push({case:'card-ownership-vacancy-custody',compiledHostVacancy:true,sourceEntrantVacancy:true,preparationDaysBeforeArrest:1,custodyServedDays:0,compiledRenderedServeControl:true});
});
await turn();globalThis.gc?.();compiled=null;
assert.equal(totals.sessions,4);assert.equal(totals.bouts,5);assert.equal(totals.renderedCustodyChecks,1);assert.equal(totals.compiledHostVacancyChecks,1);assert.equal(totals.sourceEntrantVacancyChecks,1);assert.equal(totals.lateCustodyChecks,1);assert.equal(totals.networkAttempts,0);assert.ok(totals.disabledHandlerChecks>0&&totals.staleHandlerChecks>0&&totals.practiceBackgroundChecks>0);
await validateUnchangedOfflineIdentity(rootPath,identity);assert.deepEqual(await verificationIdentity(rootPath),verification,'the entire tests/scripts/release-contract tree stays identical through the run');
const terminalHashes=identities(Object.keys(inputHashes));assert.deepEqual(terminalHashes,inputHashes,'checker, helper, current and retained fixture inputs stay byte-identical');
stage('terminal exact artifact/runtime/verifier/fixture identities unchanged');
console.log(JSON.stringify({version:identity.version,sha256:identity.sha256,runtimeSha256:identity.source.sha256,buildGit:identity.buildGit,verification,inputHashes,terminalHashes,...totals,outcomes,
 checks:[
  'strict schema2 runtime, exact standalone, loader, every ordered part and terminal unchanged identities, including the full verification tree and current/retained fixture hashes',
  'ordinary two-day burglary and finite planned departure share one exact named household-silver claim; accepted plan is not an attendance lock; carried Inventory provenance, one local fence sale and no duplicate asset or payout after sale',
  'actual approach continuation retains the originally committed chance/roll, attends only its one remaining day and takes no interim silver; actual final departure takes its own day and preserves private research/manuscript/paused-card state',
  'genuine source-captured retired parent with adult child own work/address, 100 notes, private research/work, nonempty maze/receipts, world property claim and actually resolved local card; actual compiled heir continuation, notebook/archive union and new heir reminder without inherited guilt or private/project/tournament authority',
  'actual rendered invitation/deferral and one real preparation day; solo shared battle UI and actual public commands produce retreat, potion-spending nonlethal loss and three wins; exact packet reload, zero bout days and exact carried resources; 24 Gold purse once and no XP, equipment or calling change',
  'prohibited command offer/preview/direct public-source rejection is separate from actual compiled disabled vampire-command proof; stale actual battle and finished-result controls make zero writes',
  'actual interrupted research and rehearsal continue only their remaining day; actual 32 approach and locked 33 boundaries reject conflicting 30/31 starts/continues; accepted plans and suspended cards do not acquire attendance authority',
  'explicit source lifecycle vacancy preserves exact people; compiled unavailable-captain disabled/resume/close and separate source unavailable-entrant close invent no replacement, result or prize',
  'actual compiled preparation/allegation/defense/late-arrest/surrender chain retains one paid day and immediately valid paused card through mandatory arrest/custody and a rendered enabled Serve one day control (not an attended sentence), with no repeated payment, result or prize',
  'detached practice blocks real connected background crime, research, manuscript and tournament controls with zero changed bytes and zero writes; all three full states/backups/mirror/neighbor revisions/timestamps; every export requires its own fresh live URL, Blob and clicked anchor, exact full JSON/name, revocation and zero writes; zero attempted network APIs'
 ],limits:'Art and audio use one frozen table from the exact inert element; native per-realm asset allocation is separate evidence. Legacy semantic probes use the exact graph prefix in classic scope and the unchanged async module tail; complete module scope is separately verified by v71. Controlled source captures and explicitly declared existing-site/home/resource/deadline/date/recorded-death/report preconditions in four disposable semantic fake-DOM/Map sessions. Source-only invalid-command, unavailable-entrant and interrupted-departure variants are not compiled-handler or natural-lifetime evidence. The current exact compiled script is never rewritten or instrumented and completed battle packets arise only from real public resolver commands. No physical-browser resource loading, geometry, accessibility, natural aging/death, road travel, balance, performance benchmarking, full-suite certification or publication claim. Long variants remain in source tests; the serial 600-second/1536-MiB command is an intended execution budget, not measured evidence from this file.'},null,2));
