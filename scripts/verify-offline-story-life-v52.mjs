import { exportFileName } from '../dist/js/edition.js';
import { compileOfflineModule } from './lib/offline-module-vm.mjs';
// IDs29/30/31. Run serially only after the final source and offline build:
// node --max-old-space-size=1536 --expose-gc scripts/verify-offline-story-life-v52.mjs
// This executes the unchanged standalone module through its actual app handlers.
// Disposable fake DOM/three-slot Map, not browser geometry or a natural lifetime.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createContext,Script} from 'node:vm';
import {setImmediate as turn} from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {researchSource,researchInterpretation} from '../dist/js/research-definitions.js';
import {personalNoteOwner,personalNoteRows,reviewPersonalNote} from '../dist/js/personal-notes.js';
import {copy,valid,roundtrip,freshStory,act,pick,walk,acceptResearch,draft,pieceId,researchFinished,deadline,adultFamily,introduceFamily,childRecord,calendarYear,archiveVisit} from '../tests/helpers/story-life-fixtures.mjs';
import {fakeSurface, installOfflineDocument} from '../tests/helpers/ui-surface.mjs';
import {validateOfflineIdentity,validateUnchangedOfflineIdentity} from './lib/release-identity.mjs';

const startedAt=Date.now();
const stage=label=>console.log(JSON.stringify({stage:label,elapsedMs:Date.now()-startedAt}));
stage('source imports loaded; start identity');
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root)),hash=b=>createHash('sha256').update(b).digest('hex');
const own='scripts/verify-offline-story-life-v52.mjs',ownHash=hash(read(own));
const helpers=['tests/helpers/story-life-fixtures.mjs','tests/helpers/ui-surface.mjs','scripts/lib/release-identity.mjs'];
const helperHashes=Object.fromEntries(helpers.map(p=>[p,hash(read(p))]));
const fixtures=['tests/fixtures/v30-explore-travel.json.gz','tests/fixtures/v21-vampire-grievance-paused.json'];
const fixtureHashes=Object.fromEntries(fixtures.map(p=>[p,hash(read(p))]));
// Fence prior verification inputs as well. This checker never rewrites them.
const priorInputs=['scripts/verify-offline-life-tools-v51.mjs','tests/helpers/companion-field-fixtures.mjs','tests/fixtures/v27-road-and-descent.json.gz'];
const priorInputHashes=Object.fromEntries(priorInputs.map(p=>[p,hash(read(p))]));
const identity=await validateOfflineIdentity(fileURLToPath(root));
stage('strict offline identity complete');
assert.ok(/^0\.\d+\.\d+$/.test(identity.version)&&Number(identity.version.split('.')[1])>=52,'IDs29–31 require v0.52 or later; the checked feature scope stays unchanged');
let bytes=read('artifacts/hearth-and-oath.html');assert.equal(hash(bytes),identity.sha256);
const manifest=JSON.parse(read('dist/offline/manifest.json'));let offset=0;
for(const part of manifest.parts){const b=read('dist/offline/'+part.file);assert.ok(b.equals(bytes.subarray(offset,offset+b.length)));offset+=b.length;}
assert.equal(offset,bytes.length);
let html=installOfflineDocument(bytes.toString('utf8'));bytes=null;
const tag='<script type="module">',start=html.indexOf(tag),end=html.indexOf('</script>',start+tag.length);
assert.ok(start>=0&&end>start);assert.equal(html.indexOf(tag,end),-1);assert.equal([...html.matchAll(/<script\b/g)].length,3);
let code=html.slice(start+tag.length,end);html=null;
assert.doesNotMatch(code,/^import\s/m);assert.doesNotMatch(code,/(?<![\w.])import\s*\(/);
let compiled=compileOfflineModule(code,{filename:'standalone-story-life-v52.js'});code=null;globalThis.gc?.();
stage('standalone compiled; start source parent capture');

// Slot1 is deliberately a captured public retirement proposal. Its adult family
// comes from the immutable played v21 save, with the helper's declared needs and
// cash controls. One source-driven calendar year, source research/rehearsal and
// actual signature entrance/return prepare the case; none is an earned lifetime
// or a claim that the compiled UI exposes a retirement-start control.
let parent=introduceFamily(adultFamily());parent=calendarYear(parent);
const adultOwn=copy(childRecord(parent).adultLife);assert.equal(adultOwn.work.trainingDays,14);assert.ok(adultOwn.residence);
const owner=personalNoteOwner(parent);
parent.playerNotes=Array.from({length:100},(_,i)=>({day:parent.day,text:`exact parent ${i} Ω\n\n<&>`,id:'note-'+(i+1),...owner,noteVersion:0,archived:i===0}));
parent=roundtrip(parent);parent=researchFinished(walk(parent,'homes'),'self');parent=draft(walk(parent,'tavern'));
parent=act(parent,`repertoire_rehearse_${pieceId(parent)}_solo`);parent=archiveVisit(parent);
const parentNotes=copy(parent.playerNotes),parentResearch=copy(parent.researchPortfolio),parentWorks=copy(parent.repertoire),parentJournal=copy(parent.journal);
const parentMazeRecords=copy(parent.mazeBook.records),parentReceipts=copy(parent.mazeBook.expeditionReceipts),parentOwner=parent.dynasty.activePersonId;
assert.ok(parentReceipts.length,'the controlled parent really returned with an expedition receipt');
parent=roundtrip(act(parent,'retire'));assert.equal(parent.event.id,'retirement');
stage('source parent retirement capture complete');

// Slot2 has two declared, valid promises, not pre-credited work: an immediate
// warning for research and a later warning one day inside a two-day recital.
// All project progress and child-clock credit below come from compiled handlers.
let interrupted=draft(acceptResearch(introduceFamily(adultFamily())));interrupted=deadline(interrupted);
interrupted.obligations.push({id:'offline-controlled-recital-deadline',title:'An existing dated promise',description:'Controlled one-day interruption inside a two-day recital.',dueDay:interrupted.day+6,resolved:false});
interrupted=roundtrip(interrupted);
const wanted=[freshStory({home:true}),parent,interrupted];
const ui=fakeSurface(),KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
const backupStamp='2026-10-16T00:00:00.000Z',stamp='2026-10-17T00:00:00.000Z';
const backups=Object.fromEntries(wanted.map((state,id)=>[id,{state:copy(state),updatedAt:backupStamp}]));
const initial={version:1,activeSlot:0,backups:copy(backups),slots:wanted.map((state,id)=>({id,state:copy(state),revision:'story-life-v52-'+id,updatedAt:stamp}))};
ui.storage.setItem(KEY,JSON.stringify(initial));ui.storage.setItem(MIRROR,JSON.stringify(wanted[0]));
let networkAttempts=0,writes=0,exports=0,downloadClicks=0,lastBlob,lastAnchor,timerId=0;
const timers=new Map(),urls=new Set(),set=ui.storage.setItem.bind(ui.storage);
ui.storage.setItem=(key,value)=>{writes++;return set(key,value);};ui.storage.removeItem=key=>{writes++;return ui.values.delete(key);};
const forbidden=()=>{networkAttempts++;throw Error('Network forbidden in exact story-life checker');};
class OfflineURL extends URL{
 static createObjectURL(blob){lastBlob=blob;const u='blob:story-life-'+(++exports);urls.add(u);return u;}
 static revokeObjectURL(u){assert.ok(urls.delete(u));}
}
ui.document.createElement=tag=>{assert.equal(tag,'a');return lastAnchor={clickCount:0,click(){this.clickCount++;downloadClicks++;}};};
const locks={async request(_name,_opts,operation){return operation();}};
const context=createContext({document:ui.document,localStorage:ui.storage,FormData:ui.FormData,
 window:{innerWidth:390,innerHeight:844,scrollTo(){},scrollBy(){},addEventListener(){},navigator:{locks,sendBeacon:forbidden},fetch:forbidden},
 navigator:{locks,sendBeacon:forbidden},location:{href:'file:///downloads/hearth-and-oath.html',protocol:'file:'},
 requestAnimationFrame:fn=>{fn();return 1;},getComputedStyle:()=>({paddingLeft:'0',paddingTop:'0'}),
 setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},
 Blob,URL:OfflineURL,TextEncoder,TextDecoder,queueMicrotask,console,fetch:forbidden,
 XMLHttpRequest:class{constructor(){forbidden();}},WebSocket:class{constructor(){forbidden();}},EventSource:class{constructor(){forbidden();}},Worker:class{constructor(){forbidden();}}});
// Only a platform clone shim is installed. No app state, lexical binding or
// reducer is exposed, rewritten or called from the outside of the bundle.
new Script('globalThis.structuredClone=value=>JSON.parse(JSON.stringify(value));').runInContext(context);
stage('start standalone boot');
await compiled.evaluate(context,{timeout:30000});compiled=null;globalThis.gc?.();
stage('standalone boot complete');

let slot=0,handlerChecks=0,parityChecks=0,sourceRejectionChecks=0,staleHandlerChecks=0,transitionChecks=0;
const metadata=initial.slots.map(({revision,updatedAt})=>({revision,updatedAt}));
const disk=()=>JSON.parse(ui.storage.getItem(KEY));
const storageBytes=()=>JSON.stringify([...ui.values]);
const control=id=>ui.root.querySelector(`[data-op="activity"][data-id="${id}"]`);
async function click(op,id){stage('handler start '+op+'/'+(id??''));await ui.click(op,id);await turn();handlerChecks++;stage('handler complete '+op+'/'+(id??''));}
function parity(label){
 parityChecks++;assert.deepEqual(ui.current(),wanted[slot],label+': complete compatibility mirror');
 const saved=disk();assert.equal(saved.version,1);assert.equal(saved.activeSlot,slot,label+': active slot');assert.equal(saved.slots.length,3);
 assert.deepEqual(saved.slots.map(row=>row.state),wanted,label+': every complete durable slot');assert.deepEqual(saved.backups,backups,label+': every complete recovery backup');
 for(const row of saved.slots){assert.equal(row.revision,metadata[row.id].revision,label+': revision');assert.equal(row.updatedAt,metadata[row.id].updatedAt,label+': timestamp');}
}
function settled(before,label){
 const after=disk();
 for(const row of before.slots)if(row.id!==slot)assert.deepEqual(after.slots[row.id],row,label+': untouched neighboring state/revision/time');
 assert.deepEqual(after.backups,before.backups,label+': backups do not drift');
 const changed=JSON.stringify(before.slots[slot].state)!==JSON.stringify(wanted[slot]);
 if(changed)assert.notEqual(after.slots[slot].revision,before.slots[slot].revision,label+': changed state gets a fresh revision');
 else assert.equal(after.slots[slot].revision,before.slots[slot].revision,label+': unchanged state retains revision');
 assert.ok(Number.isFinite(Date.parse(after.slots[slot].updatedAt)),label+': valid durable timestamp');
 metadata[slot]={revision:after.slots[slot].revision,updatedAt:after.slots[slot].updatedAt};parity(label);
}
async function exportLife(){
 const before=storageBytes(),writeStart=writes,exportStart=exports,clickStart=downloadClicks;lastBlob=null;lastAnchor=null;
 await click('menu');await click('export');assert.equal(exports,exportStart+1,'this call must create exactly one fresh export URL');assert.equal(downloadClicks,clickStart+1,'this call must click one fresh download anchor');assert.ok(lastBlob&&lastAnchor,'no prior export artifact can satisfy this call');assert.equal(lastAnchor.clickCount,1);assert.equal(lastBlob.type,'application/json');
 assert.deepEqual(JSON.parse(await lastBlob.text()),wanted[slot],'ordinary exact complete-session export');
 assert.equal(lastAnchor.download,exportFileName(wanted[slot]));
 for(const [id,t]of [...timers])if(t.delay===1000){timers.delete(id);t.fn();}
 assert.equal(urls.size,0,'ordinary export revokes its object URL');
 await ui.key('Escape');await turn();
 assert.equal(storageBytes(),before,'ordinary export never writes a slot, backup, mirror or workspace byte');assert.equal(writes,writeStart);parity('exact export');
}
async function commit(op,id,reducer,{exportAfter=true}={}){
 const before=disk();wanted[slot]=roundtrip(reducer(copy(wanted[slot])));await click(op,id);transitionChecks++;
 settled(before,op+'/'+id);if(exportAfter)await exportLife();
}
async function action(id,options){await commit('activity',id,s=>act(s,id),options);}
async function choice(id,options){await commit('choice',id,s=>pick(s,id),options);}
async function load(id){await click('title-menu');await click('title-load');slot=id;await click('slot-load',String(id));parity('ordinary slot load');}
async function area(target){
 await click('place-open');const route=settlementWalkPath(wanted[slot],target);assert.ok(route,'actual local route to '+target);
 if(route.length)await commit('place-area',target,s=>{for(const room of route)s=act(s,'atlas_room_'+room);return s;});
 else{await click('place-area',target);parity('ordinary current-area reopen');}
 assert.equal(wanted[slot].cartography.interior.roomId,target);
}
async function manuscriptBook(){await click('tab','activities');await click('activities-pane','fun');assert.ok(ui.root.querySelector('.repertoire-book'));parity('ordinary manuscript book');}
function noReward(before,after,{days=0,scholarship=0,joy=null}={}){
 assert.equal(after.day,before.day+days);assert.equal(after.hero.profession,before.hero.profession);assert.deepEqual(after.careers,before.careers,'no paid career/work/commission reward');
 const skills=copy(before.hero.skills);skills.scholarship+=scholarship;assert.deepEqual(after.hero.skills,skills,'only the explicitly stated once-only practice applies');
 assert.deepEqual(after.pastimes,before.pastimes,'existing pastime performance terms are separate');
 if(days===0)assert.equal(after.hero.gold,before.hero.gold,'zero-day story choice has no charge/reward');
 else assert.ok(after.hero.gold<=before.hero.gold,'unpaid attendance mints no Gold; ordinary living costs remain possible');
 if(joy!==null)assert.equal(after.life.happiness,joy);
}
function sourceRejected(id,label=id){
 const before=copy(wanted[slot]),after=roundtrip(E.chooseAction(before,id));sourceRejectionChecks++;
 assert.deepEqual({...after,notice:''},{...wanted[slot],notice:''},label+': source public command is inert except notice');assert.deepEqual(before,wanted[slot],label+': public input is immutable');
}
async function staleInert(node,label){
 assert.ok(node,label+': captured actual rendered control');assert.equal(node.isConnected,false,label+': old subtree is detached');
 const before=storageBytes(),writeStart=writes;await ui.fire('click',node);await turn();handlerChecks++;staleHandlerChecks++;
 assert.equal(storageBytes(),before,label+': stale handler changes no storage byte');assert.equal(writes,writeStart);parity(label);
}
function literal(title){const row=wanted[slot].journal.findLast(j=>j.title===title);assert.ok(row,title);assert.equal(row.narrativeEdition,30,title+': literal edition metadata');return copy(row);}

await click('title-continue');parity('initial canonical load');await exportLife();
// Complete actual Home proposal/later/accept/copies/comparison/interpretation/self.
await area('homes');const researchStart=copy(wanted[0]);
await action('research_offer_third_mark');assert.equal(wanted[0].researchPortfolio,undefined);noReward(researchStart,wanted[0]);
await choice('later');assert.equal(wanted[0].researchPortfolio.runs.length,0);assert.equal(wanted[0].researchPortfolio.activeRunId,null);noReward(researchStart,wanted[0]);
await area('homes');await action('research_offer_third_mark');await choice('accept');noReward(researchStart,wanted[0]);
assert.equal(wanted[0].researchPortfolio.runs[0].copies.length,0);assert.equal(wanted[0].researchPortfolio.runs[0].comparison,null);
await area('homes');
const copyProofs=[];
for(const id of ['axle_rubbing','repair_shares']){
 const before=copy(wanted[0]);await action('research_copy_'+id);noReward(before,wanted[0],{days:1});
 const run=wanted[0].researchPortfolio.runs[0],acquired=run.copies.find(c=>c.sourceId===id),source=researchSource('third_mark',id),proof=literal(source.title);
 assert.equal(acquired.requestedDay,before.day);assert.equal(acquired.preparedDay,before.day+1);assert.equal(acquired.receivedDay,before.day+1);
 assert.equal(acquired.originLocationId,'mill');assert.equal(acquired.custodyLocationId,researchStart.locationId);
 assert.ok(proof.text.startsWith(source.text+'\n\n'+source.limit));assert.match(proof.text,/No distant arrival or original-object inspection was claimed/);copyProofs.push(proof);
}
const compareStart=copy(wanted[0]);await action('research_compare');noReward(compareStart,wanted[0]);await choice('compare');
noReward(compareStart,wanted[0],{days:1,scholarship:1});
const comparison=copy(wanted[0].researchPortfolio.runs[0].comparison);assert.equal(comparison.days,1);assert.equal(comparison.completedDay-comparison.startedDay,1);assert.equal(comparison.practiceApplied,true);assert.deepEqual(comparison.sourceIds,['axle_rubbing','repair_shares']);
assert.equal(wanted[0].researchPortfolio.runs[0].steps.filter(s=>s.id==='comparison').length,1);
sourceRejected('research_continue','a completed comparison cannot be settled again');sourceRejected('research_compare','once-only comparison cannot be started again');
await area('homes');assert.equal(control('research_compare'),null,'completed comparison is not offered again');
const inferredBefore=copy(wanted[0]);await action('research_interpret');await choice('shared_repair');noReward(inferredBefore,wanted[0]);
assert.equal(wanted[0].researchPortfolio.runs[0].interpretationId,'shared_repair');
await area('homes');const conclusionBefore=copy(wanted[0]);await action('research_conclude');await choice('self');noReward(conclusionBefore,wanted[0]);
const run=wanted[0].researchPortfolio.runs[0],interpretation=researchInterpretation('third_mark','shared_repair');
assert.equal(run.status,'completed');assert.equal(run.finalization.audience,'self');assert.equal(run.finalization.recipientId,null);assert.deepEqual(run.finalization.quoteSourceIds,[]);assert.equal(run.cast.craftsperson,null);assert.deepEqual(run.permissions,[]);
assert.equal(wanted[0].researchPortfolio.activeRunId,null);assert.equal(wanted[0].day,researchStart.day+3);assert.equal(wanted[0].hero.skills.scholarship,researchStart.hero.skills.scholarship+1);
const folio=wanted[0].journal.filter(j=>j.tag==='research').at(-1);assert.equal(folio.narrativeEdition,30);assert.ok(folio.text.startsWith(interpretation.conclusion));assert.match(folio.text,/This folio stays with you\. No NPC is claimed to know/);assert.match(folio.text,/No private admission was quoted/);
const allResearchProofs=copy(wanted[0].journal.filter(j=>j.tag==='research'));
await load(0);assert.deepEqual(wanted[0].journal.filter(j=>j.tag==='research'),allResearchProofs,'original full Journal rows including metadata survive reload');
for(const proof of copyProofs)assert.deepEqual(wanted[0].journal.find(j=>j.id===proof.id),proof);
await click('tab','journal');await click('workspace-section','journal:archive');assert.ok(ui.root.querySelector('.research-archive'));assert.equal(ui.root.querySelector('.personal-note'),null,'earned folio is not an editable personal-note card');parity('compiled research archive');await exportLife();

// Private original draft, one-day rehearsal, fixed two-day public-once recital,
// private revision and explicit next-day recollection of the frozen heard work.
await area('homes');const draftBefore=copy(wanted[0]);await action('repertoire_create_open-chair');noReward(draftBefore,wanted[0]);
const piece=pieceId(wanted[0]);assert.equal(wanted[0].repertoire.pieces[0].privacy,'private');assert.equal(wanted[0].repertoire.performances.length,0);
assert.equal(wanted[0].repertoire.pieces[0].credits[0].personId,wanted[0].dynasty.activePersonId);
const rehearsalBefore=copy(wanted[0]);await action(`repertoire_rehearse_${piece}_solo`);noReward(rehearsalBefore,wanted[0],{days:1});assert.equal(wanted[0].repertoire.pieces[0].rehearsal.attendedDays,1);
await area('tavern');await manuscriptBook();const acceptanceBefore=copy(wanted[0]);await action('repertoire_accept');noReward(acceptanceBefore,wanted[0]);
assert.deepEqual(wanted[0].repertoire.circuit.targets.map(t=>t.locationId),['home','brook','city']);
const recitalBefore=copy(wanted[0]),repeatRecitalControl=control(`repertoire_perform_${piece}_solo_once`);await action(`repertoire_perform_${piece}_solo_once`);noReward(recitalBefore,wanted[0],{days:2});
const heard=copy(wanted[0].repertoire.performances[0]);assert.equal(heard.attendedDays,2);assert.equal(heard.permission,'once');assert.equal(heard.piece.verse,recitalBefore.repertoire.pieces[0].verse);assert.equal(heard.listener.locationId,wanted[0].locationId);assert.equal(heard.venue.roomId,'tavern');assert.equal(wanted[0].repertoire.pieces[0].privacy,'private');assert.equal(wanted[0].repertoire.circuit.stops.length,1);assert.equal(wanted[0].life.happiness,Math.min(100,recitalBefore.life.happiness+heard.joy),'recital Joy settles once, only after its two real days');sourceRejected(`repertoire_perform_${piece}_solo_once`,'the fixed inn stop cannot settle a second recital');
const recitalProof=literal('An original recital at a real inn');assert.ok(recitalProof.text.includes(heard.piece.verse));assert.ok(recitalProof.text.includes(heard.listener.name));assert.ok(recitalProof.text.includes(heard.piece.credits[0].name));assert.match(recitalProof.text,/Only this rendition was public; no manuscript copy was permitted/);
await staleInert(repeatRecitalControl,'a double recital cannot reuse its detached control');
const publicBefore=copy(wanted[0]);await action(`repertoire_privacy_${piece}_public`);noReward(publicBefore,wanted[0]);assert.equal(wanted[0].repertoire.pieces[0].privacy,'public');
const revisionBefore=copy(wanted[0]);await action(`repertoire_revise_${piece}_quiet`);noReward(revisionBefore,wanted[0]);
assert.equal(wanted[0].repertoire.pieces[0].privacy,'private');assert.equal(wanted[0].repertoire.pieces[0].revision,heard.piece.revision+1);assert.equal(wanted[0].repertoire.pieces[0].rehearsal,null);assert.deepEqual(wanted[0].repertoire.performances[0],heard);assert.deepEqual(wanted[0].journal.find(j=>j.id===recitalProof.id),recitalProof);
const nextDayBefore=copy(wanted[0]);await action(`repertoire_rehearse_${piece}_solo`);noReward(nextDayBefore,wanted[0],{days:1});
const recallId='repertoire_recall_'+heard.listener.id;assert.ok(control(recallId));const recallBefore=copy(wanted[0]);await action(recallId);noReward(recallBefore,wanted[0]);assert.equal(wanted[0].event.id,'repertoire_recall');assert.ok(wanted[0].event.body.includes(heard.piece.verse.split('\n').at(-1)));assert.equal(wanted[0].repertoire.pending.snapshot.piece.revision,heard.piece.revision);
await load(0);const beforeReply=copy(wanted[0]);await choice('ending');noReward(beforeReply,wanted[0],{joy:beforeReply.life.happiness});assert.deepEqual(wanted[0].conversations.relationships,beforeReply.conversations.relationships);assert.equal(wanted[0].repertoire.recall.choiceId,'ending');assert.deepEqual(wanted[0].repertoire.performances[0],heard);assert.deepEqual(wanted[0].journal.find(j=>j.id===recitalProof.id),recitalProof);
await area('tavern');await manuscriptBook();assert.equal(control(recallId),null,'acknowledged recall is not silently repeated');await exportLife();await load(0);

// Actual compiled settlement of the source-captured proposal, then the rendered
// child continuation control. No phase or succession result is forged.
await load(1);assert.equal(wanted[1].event.id,'retirement');await choice('settle');assert.equal(wanted[1].phase,'retired');
assert.deepEqual(wanted[1].researchPortfolio,parentResearch);assert.deepEqual(wanted[1].repertoire,parentWorks);assert.deepEqual(wanted[1].playerNotes,parentNotes);
const retiredParent=copy(wanted[1]);await click('tab','legacy');assert.ok(control('lineage_continue_child-1'));await action('lineage_continue_child-1');
assert.equal(wanted[1].dynasty.generation,retiredParent.dynasty.generation+1);assert.equal(wanted[1].hero.profession,'Blacksmith');assert.equal(wanted[1].careers.records.Blacksmith.workedDays,14);assert.equal(wanted[1].careers.records.Blacksmith.paidWorkedDays,0);assert.equal(wanted[1].careers.records.Blacksmith.earnedGold,0);assert.deepEqual(wanted[1].hero.skills,childRecord(retiredParent).development.skills);
assert.equal(wanted[1].locationId,adultOwn.residence.locationId);assert.deepEqual(wanted[1].dynasty.history.find(h=>h.personId===parentOwner).personalNotes,parentNotes);assert.deepEqual(wanted[1].playerNotes,[]);assert.equal(wanted[1].researchPortfolio,undefined);assert.equal(wanted[1].repertoire,undefined);assert.deepEqual(wanted[1].mazeBook.records,parentMazeRecords);assert.deepEqual(wanted[1].mazeBook.expeditionReceipts,parentReceipts);assert.deepEqual(wanted[1].journal.slice(0,parentJournal.length),parentJournal);
const inheritance=wanted[1].dynasty.history.find(h=>h.personId===parentOwner).inheritance;assert.equal(wanted[1].hero.gold+inheritance.shares.reduce((n,row)=>n+row.gold,0),retiredParent.hero.gold);
const oldNote=personalNoteRows(wanted[1]).find(n=>!n.own);assert.ok(oldNote);assert.equal(reviewPersonalNote(wanted[1],oldNote.key),null);
sourceRejected('research_copy_axle_rubbing','the heir has no inherited research authority');sourceRejected(`repertoire_rehearse_${pieceId(retiredParent)}_solo`,'the heir has no inherited manuscript authority');
await load(1);await click('tab','journal');await click('workspace-section','journal:archive');assert.equal(ui.root.querySelector('.research-archive'),null);assert.ok(ui.root.querySelector('.expedition-receipts'),'compiled Journal retains actual expedition receipts');parity('heir union archive');
await click('workspace-section','journal:notes');await click('personal-notes-scope','family');assert.ok(ui.root.querySelector('.personal-note'));assert.equal(ui.root.querySelector('[data-op="personal-note-edit"]'),null);assert.equal(ui.root.querySelector('[data-op="personal-note-archive"]'),null);parity('read-only closed parent notebook');
await click('personal-notes-scope','current');const form=ui.root.querySelector('#player-note');assert.ok(form&&!form.querySelector('textarea').disabled,'parent100-note capacity does not consume heir capacity');
const ownText='  a separate heir reminder Ω\n\n<&>  ',beforeNote=disk(),historyBeforeNote=copy(wanted[1].dynasty.history);form.querySelector('textarea').value=ownText;
wanted[1]=roundtrip(E.keepPlayerNote(copy(wanted[1]),ownText));await ui.fire('submit',form);await turn();handlerChecks++;transitionChecks++;settled(beforeNote,'actual heir reminder form');assert.equal(wanted[1].playerNotes[0].text,ownText.trim());assert.equal(wanted[1].playerNotes[0].ownerId,wanted[1].dynasty.activePersonId);assert.deepEqual(wanted[1].dynasty.history,historyBeforeNote);await exportLife();await load(1);

// One actual interrupted research day and a distinct interrupted two-day recital.
// Existing research acceptance alone is not an attendance lock.
await load(2);await area('homes');assert.ok(ui.root.querySelector('.research-shelf'));assert.ok(ui.root.querySelector('.repertoire-book'));
const partialPiece=pieceId(wanted[2]),practiceBefore=storageBytes(),practiceWrites=writes;
await click('menu');await click('practice-open','protect_ally');assert.ok(ui.root.querySelector('.practice-modal'));
const practiceId=ui.root.querySelector('.practice-modal').dataset.practiceSession;
for(const id of ['research_copy_axle_rubbing',`repertoire_rehearse_${partialPiece}_solo`,'research_withdraw','repertoire_delete_'+partialPiece]){const button=control(id);assert.ok(button?.isConnected,id+': actual inert-background control');await ui.fire('click',button);await turn();handlerChecks++;}
assert.equal(ui.root.querySelector('.practice-modal').dataset.practiceSession,practiceId);assert.equal(storageBytes(),practiceBefore,'practice changes no complete slot, backup, mirror or workspace byte');assert.equal(writes,practiceWrites);parity('detached practice story isolation');
await click('practice-close');await ui.key('Escape');await turn();assert.equal(storageBytes(),practiceBefore);assert.equal(writes,practiceWrites);await exportLife();
const researchBefore=copy(wanted[2]),staleRehearsal=control(`repertoire_rehearse_${partialPiece}_solo`),staleCopy=control('research_copy_repair_shares');
await action('research_copy_axle_rubbing');assert.equal(wanted[2].event.id,'annual_deadline_review');assert.equal(wanted[2].day,researchBefore.day);assert.equal(wanted[2].researchPortfolio.project.completedDays,0);assert.equal(wanted[2].researchPortfolio.project.remainingDays,1);assert.deepEqual(childRecord(wanted[2]).adultLife,childRecord(researchBefore).adultLife);
await choice('pause');assert.equal(E.getLifeCommitment(wanted[2]).kind,'research');assert.ok(E.getActions(wanted[2]).every(a=>a.id.startsWith('research_')));
for(const id of [`repertoire_rehearse_${partialPiece}_solo`,'repertoire_continue','home_rest'])sourceRejected(id,'research attendance owns the complete public action boundary: '+id);
await staleInert(staleRehearsal,'pending research rejects the detached rehearsal start');await load(2);await area('homes');assert.equal(control(`repertoire_rehearse_${partialPiece}_solo`),null,'compiled Home omits incompatible rehearsal');assert.equal(control('home_rest'),null,'compiled Home omits incompatible rest');const oldContinue=control('research_continue');await action('research_continue');
assert.equal(wanted[2].day,researchBefore.day+1);assert.equal(wanted[2].researchPortfolio.runs[0].copies.length,1);assert.equal(childRecord(wanted[2]).adultLife.eligibleDays,childRecord(researchBefore).adultLife.eligibleDays+1);sourceRejected('research_continue','completed research attendance cannot credit the child clock twice');await staleInert(oldContinue,'completed research cannot reuse its continue control');
const beforeRehearsal=copy(wanted[2]);await action(`repertoire_rehearse_${partialPiece}_solo`);noReward(beforeRehearsal,wanted[2],{days:1});assert.equal(childRecord(wanted[2]).adultLife.eligibleDays,childRecord(researchBefore).adultLife.eligibleDays+2);
await area('tavern');await manuscriptBook();await action('repertoire_accept');const partialBefore=copy(wanted[2]);await action(`repertoire_perform_${partialPiece}_solo_once`);
assert.equal(wanted[2].event.id,'annual_deadline_review');assert.equal(wanted[2].day,partialBefore.day+1);assert.equal(wanted[2].repertoire.project.completedDays,1);assert.equal(wanted[2].repertoire.project.remainingDays,1);assert.equal(wanted[2].repertoire.performances.length,0);assert.equal(wanted[2].life.happiness,partialBefore.life.happiness);assert.equal(childRecord(wanted[2]).adultLife.eligibleDays,childRecord(partialBefore).adultLife.eligibleDays+1);
const savedTerms=copy(wanted[2].repertoire.project);await choice('pause');assert.equal(E.getLifeCommitment(wanted[2]).kind,'repertoire');assert.ok(E.getActions(wanted[2]).every(a=>a.id.startsWith('repertoire_')));
for(const id of ['research_copy_repair_shares','research_continue'])sourceRejected(id,'repertoire attendance owns the public action boundary: '+id);
await staleInert(staleCopy,'pending recital rejects the detached research-copy control');await load(2);assert.deepEqual(wanted[2].repertoire.project,savedTerms,'all frozen partial terms survive reload');await manuscriptBook();const oldRecitalContinue=control('repertoire_continue');await action('repertoire_continue');
assert.equal(wanted[2].day,partialBefore.day+2);assert.equal(wanted[2].repertoire.performances.length,1);assert.equal(childRecord(wanted[2]).adultLife.eligibleDays,childRecord(partialBefore).adultLife.eligibleDays+2);assert.deepEqual(wanted[2].hero.skills,partialBefore.hero.skills);assert.deepEqual(wanted[2].careers,partialBefore.careers);assert.deepEqual(wanted[2].researchPortfolio,partialBefore.researchPortfolio);
const partialReceipt=copy(wanted[2].repertoire.performances[0]);assert.deepEqual(partialReceipt.piece,savedTerms.piece);assert.equal(partialReceipt.permission,savedTerms.permission);assert.deepEqual(partialReceipt.listener,savedTerms.listener);assert.equal(partialReceipt.attendedDays,2);assert.equal(wanted[2].life.happiness,Math.min(100,partialBefore.life.happiness+partialReceipt.joy),'partial recital awards its frozen Joy only on completion');assert.equal(partialReceipt.startedDay,savedTerms.startedDay);assert.equal(wanted[2].repertoire.circuit.stops.length,1);
sourceRejected('repertoire_continue','completed recital cannot settle or credit its child clock twice');await staleInert(oldRecitalContinue,'completed recital cannot reuse its continue control');await exportLife();await load(2);assert.deepEqual(wanted[2].repertoire.performances[0],partialReceipt);
for(let id=0;id<3;id++){await load(id);await exportLife();}

await validateUnchangedOfflineIdentity(fileURLToPath(root),identity);assert.equal(hash(read(own)),ownHash);
stage('all handlers complete; unchanged artifact identity complete');
const terminalHashes=Object.fromEntries([own,...helpers,...fixtures,...priorInputs].map(p=>[p,hash(read(p))]));
for(const [p,expected]of Object.entries({[own]:ownHash,...helperHashes,...fixtureHashes,...priorInputHashes}))assert.equal(terminalHashes[p],expected,p+': verification input changed during the run');
assert.equal(networkAttempts,0);
console.log(JSON.stringify({version:identity.version,sha256:identity.sha256,runtimeSha256:identity.source.sha256,buildGit:identity.buildGit,
 verifierSha256:ownHash,helperHashes,fixtureHashes,priorInputHashes,terminalHashes,handlerChecks,transitionChecks,parityChecks,exports,downloadClicks,sourceRejectionChecks,staleHandlerChecks,networkAttempts,
 checks:[
  'strict schema2 unchanged artifact/runtime/loader identity and every ordered part; immutable verifier/helpers/fixtures before and after',
  'actual Home free later/accept, two real public copies, one real comparison day and exactly one Scholarship, supported self-only literal conclusion; original full Journal metadata and reload',
  'actual private draft, one-day rehearsal, two-day public-once recital, explicit public-copy toggle then private revision; heard receipt and literal Journal cannot be rewritten',
  'actual explicit next-day frozen recall and no extra time, Gold, skill, career or relationship reward',
  'source-captured real retirement proposal, actual compiled settle and rendered child continuation; own unpaid Blacksmith livelihood/residence, parent100-note archive, exact Journal/maze/receipt union, no parent manuscript/research authority; new heir reminder',
  'actual interrupted research and interrupted recital attend only remaining days across reload; actual child-clock credit once, source cross-commitment command rejection, compiled control omission/detached-control isolation',
  'detached practice blocks actual connected background research/manuscript controls without any durable write',
  'complete source-state parity after every transition, all three slots and nonempty backups, unchanged neighbors/revisions/timestamps, compatibility mirror, ordinary exact exports and reload'
 ],limits:'Disposable Map/fake semantic DOM and controlled resources/promises/starting placements. Parent year, research, rehearsal, signature visit and retirement proposal are source captures, not a naturally earned lifetime or compiled retirement-start navigation proof. Source rejected-command checks and compiled detached-control checks are distinct. Zero attempted network APIs in this VM does not certify browser resource loading. Not physical-browser geometry, screen-reader behavior, travel/full-circuit balance, performance benchmarking, death-path certification or a full-suite pass.'},null,2));
