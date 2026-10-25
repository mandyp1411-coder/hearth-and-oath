import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { mazeLayout, mazeRoomCell, validateMazes } from '../dist/js/maze-v31.js';
import { validateExpeditionReceipts, expeditionVisitTotals } from '../dist/js/maze-receipts.js';
import { validateSignatureMaze } from '../dist/js/maze-signature.js';
import { mountApp } from './helpers/ui-surface.mjs';

// The captured parent/child genealogy, public succession, content actions,
// physical map and reminder authorship are genuine source-handler evidence.
// Companion recruitment/Health/potions and individual test positions below are
// controlled to isolate composition, not earned-party or routing evidence.
const originalCapture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/maze-identity/v050-successor.json.gz',import.meta.url))));
// v50.1 canonically restores only uniquely proven current-v2 contact prose; raw fixture bytes stay unchanged.
const capture={...originalCapture,states:Object.fromEntries(Object.entries(originalCapture.states).map(([name,s])=>[name,E.migrateSave(structuredClone(s))]))};
const copy=value=>structuredClone(value);
const sourceBytes=JSON.stringify(capture);
function valid(s){assert.ok(E.validateSave(s),s.notice);assert.ok(validateMazes(s));assert.ok(validateExpeditionReceipts(s));return s;}
function roundtrip(s){valid(s);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);return s;}
function active(){
 const s=copy(capture.states.renewedHeir);for(const p of s.companions){p.recruited=p.id==='mira';p.active=p.id==='mira';}
 const target=s.companions.find(p=>p.id==='mira');assert.ok(target.alive);target.hp=1;s.rpg.companionStages.mira.status='available';s.hero.potions=4;
 return roundtrip(s);
}
function unchangedExceptNotice(next,before){const result=copy(next);result.notice=before.notice;assert.deepEqual(result,before);}

test('five captured public-successor states retain original map author and independent personal permission',()=>{
 const parent=capture.states.unresolvedParent,author=parent.dynasty.activePersonId;
 for(const [name,raw]of Object.entries(capture.states)){
  const s=roundtrip(copy(raw)),m=s.maze||s.mazeBook.records.find(r=>r.version===2),memory=m.mapMemory;
  assert.ok(memory,name);assert.equal(memory.entries[0].authorId,author);assert.equal(memory.entries[0].authorName,parent.hero.name);assert.equal(memory.entries[0].authorGeneration,1);
  if(s.dynasty.generation===2){assert.notEqual(s.dynasty.activePersonId,author);assert.deepEqual(s.rpg.bosses[0].people[0].memories,[]);assert.equal(s.rpg.bosses[0].people[0].bond,35);}
 }
 assert.equal(capture.states.renewedHeir.maze.contentOutcomes.at(-1).actionId,'renew_contact');
 assert.equal(capture.states.renewedHeir.maze.contentOutcomes.at(-1).actorId,capture.states.renewedHeir.dynasty.activePersonId);
 assert.equal(JSON.stringify(capture),sourceBytes);
});

test('v2 quiet-room companion treatment records exactly its accepted consumption without reward or time',()=>{
 const s=active(),before=copy(s),quote=E.fieldPotionQuote(s,'mira');assert.equal(mazeRoomCell(s.maze).kind,'entrance');assert.equal(quote.disabledReason,null);
 const next=roundtrip(E.useConsumable(s,'potions','mira')),expected=copy(s);expected.companions.find(p=>p.id==='mira').hp+=quote.amount;expected.hero.potions--;expected.maze.expeditionVisit.used.potions++;
 expected.notice=next.notice;expected.journal=next.journal;assert.deepEqual(next,expected);assert.deepEqual(s,before);
 assert.equal(next.journal.length,s.journal.length+1);assert.equal(next.day,s.day);assert.equal(next.hero.gold,s.hero.gold);assert.equal(expeditionVisitTotals(next.maze.expeditionVisit).costs.potions,expeditionVisitTotals(s.maze.expeditionVisit).costs.potions+1);
});

test('an unobserved v2 visit snapshots pre-use reserves only after acceptance, never on rejection',()=>{
 const s=active();delete s.maze.expeditionVisit;roundtrip(s);const before=copy(s),next=roundtrip(E.useConsumable(s,'potions','mira'));
 assert.equal(next.maze.expeditionVisit.coverage,'observed');assert.equal(next.maze.expeditionVisit.start.potions,s.hero.potions);assert.equal(next.maze.expeditionVisit.used.potions,1);assert.deepEqual(next.maze.expeditionVisit.days,{entry:0,inside:0,recovery:0});assert.deepEqual(next.mazeBook.expeditionReceipts,s.mazeBook.expeditionReceipts);assert.deepEqual(s,before);
 for(const change of [v=>v.companions.find(p=>p.id==='mira').hp=58,v=>v.companions.find(p=>p.id==='mira').active=false,v=>v.hero.potions=0]){
  const rejected=copy(s);change(rejected);valid(rejected);const result=E.useConsumable(rejected,'potions','mira');unchangedExceptNotice(result,rejected);assert.equal(result.maze.expeditionVisit,undefined);assert.deepEqual(result.mazeBook,rejected.mazeBook);
 }
});

test('canonical v2 unresolved danger blocks companion care without starting optional accounting',()=>{
 const s=active();delete s.maze.expeditionVisit;
 for(const kind of ['enemy','guardian','trap']){
  const controlled=copy(s),cell=mazeLayout(controlled.maze).cells.map(c=>mazeRoomCell(controlled.maze,c.id)).find(c=>c.kind===kind&&!controlled.maze.cleared.includes(c.id)&&(kind!=='guardian'||c.contentSlot===controlled.maze.content.requiredGuardians[0].slotId));assert.ok(cell,kind);
  controlled.maze.position=cell.id;controlled.maze.visited=[...new Set([...controlled.maze.visited,cell.id])];roundtrip(controlled);
  assert.match(E.fieldPotionQuote(controlled,'mira').disabledReason,/danger/);const result=E.useConsumable(controlled,'potions','mira');unchangedExceptNotice(result,controlled);assert.equal(result.maze.expeditionVisit,undefined);
 }
});

test('actual v2 Party Enter/Space treatment matches whole source state once and full target cannot write again',async t=>{
 const s=active(),neighbor=copy(capture.states.unresolvedHeir),ui=await mountApp(t, {states:[s,neighbor]});await ui.click('title-continue');await ui.click('tab','party');
 let expected=copy(s);for(const key of ['Enter',' ']){const trigger=ui.root.querySelector('[data-op="field-potion"][data-id="mira"]');assert.ok(trigger&&!trigger.disabled);trigger.focus();expected=E.useConsumable(expected,'potions','mira');await ui.key(key);assert.deepEqual(ui.current(),expected);assert.deepEqual(ui.lives()[1],neighbor);const once=copy(ui.current());await ui.fire('click',trigger);assert.deepEqual(ui.current(),once);}
 const target=ui.root.querySelector('[data-op="field-potion"][data-id="mira"]');assert.ok(target.disabled);const disk=[ui.storage.getItem('hearth-and-oath:slots:v1'),ui.storage.getItem('hearth-and-oath:life:v1')],writes=[],write=ui.storage.setItem;ui.storage.setItem=(key,value)=>{writes.push(key);write(key,value);};
 target.focus();await ui.key('Enter');await ui.fire('click',target);assert.deepEqual(writes,[]);assert.deepEqual([ui.storage.getItem('hearth-and-oath:slots:v1'),ui.storage.getItem('hearth-and-oath:life:v1')],disk);assert.deepEqual(ui.current(),expected);assert.equal(JSON.stringify(capture),sourceBytes);
});


test('later public household discovery keeps the resumed run historical snapshot valid without rewriting it',()=>{
 const before=roundtrip(copy(capture.states.renewedHeir)),oldRecords=copy(before.mazeBook.records),action='maze_signature_lead_contact_1';
 assert.ok(E.getActions(before).find(row=>row.id===action&&!row.disabledReason));
 const after=roundtrip(E.chooseAction(before,action));
 assert.equal(after.day-before.day,2);assert.equal(after.maze.contentOutcomes.at(-1).actorId,after.dynasty.activePersonId);
 assert.deepEqual(after.mazeBook.records,oldRecords,'later attendance never rewrites the earlier physical/proof/map snapshot');
 const archived=after.mazeBook.records[0],later=after.rpg.bosses[1];
 assert.ok(later.mazeDiscovery.discoveredDay>archived.endedDay);
 assert.ok(validateSignatureMaze(after,archived,mazeLayout(archived)));
 const forged=copy(after);forged.rpg.bosses[1].mazeDiscovery.discoveredDay=archived.endedDay;
 assert.equal(validateSignatureMaze(forged,forged.mazeBook.records[0],mazeLayout(archived)),false,'a discovery already dated within the old snapshot cannot be omitted');
 const premature=copy(after);premature.rpg.bosses[0].mazeDiscovery.discoveredDay=archived.endedDay+1;
 assert.equal(validateSignatureMaze(premature,premature.mazeBook.records[0],mazeLayout(archived)),false,'an archived known household cannot precede its actual dated discovery');
 const missing=copy(after);missing.maze.contentFacts.knownBosses=missing.maze.contentFacts.knownBosses.filter(id=>id!==later.id);
 assert.equal(E.validateSave(missing),false,'active runs still require the complete current discovery ledger');
 const returned=roundtrip(E.chooseAction(after,'maze_exit'));assert.equal(returned.maze,null);
 const reopened=roundtrip(E.chooseAction(returned,'rpg_enter_'+after.maze.sourceId));
 assert.deepEqual(reopened.maze.contentOutcomes,after.maze.contentOutcomes);assert.deepEqual(reopened.maze.mapMemory,after.maze.mapMemory);
 assert.deepEqual(before,capture.states.renewedHeir);assert.equal(JSON.stringify(capture),sourceBytes);
});
