import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync,gzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { DUNGEONS } from '../dist/js/exploration.js';
import { RPG_DUNGEONS_V27 } from '../dist/js/rpg-depth-v27.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mazeMapIdentity } from '../dist/js/maze-map-memory.js';
import { applyMazeAction, mazeLayout, mazeMapRuntime } from '../dist/js/maze-v31.js';
import { enterSignatureMazeRoom } from '../dist/js/maze-signature.js';
import { createSuccessor,validateLineage } from '../dist/js/lineage.js';
import { inheritRpg,validateRpg } from '../dist/js/rpg-depth-v27.js';
import { inheritStoryMazes,validateMazes } from '../dist/js/maze-v31.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Existing real v0.27 save avoids generating a new life for every test. Source
// room positions/resources are controlled fixtures, not earned maze routes or
// unchanged-difficulty claims. All committed content choices use engine/UI APIs.
const old=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent;
let base;
function fresh(){
  if(!base){base=E.migrateSave(structuredClone(old));assert.ok(base);base=E.chooseEventOption(base,'withdraw');assert.equal(base.adventuring.expedition,null);assert.equal(base.maze,null);assert.ok(E.validateSave(base));}
  const s=structuredClone(base);s.hero.gold=1000;for(const key of Object.keys(s.hero.skills))s.hero.skills[key]=12;
  for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=20;s.flags.herbs=20;s.adventuring.rations=20;return s;
}
function site(s,id){s.locationId=id;s.cartography.pending=null;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);return s;}
function room(s,slotId){const cell=s.maze.content.anchors.find(row=>row.slotId===slotId).cellId;s.maze.position=cell;s.maze.previous=mazeLayout(s.maze).cells[cell].doors[0];s.maze.visited=[...new Set([...s.maze.visited,cell])];if(s.maze.content.family==='signature')enterSignatureMazeRoom(s,s.maze);return s;}
function drain(s){for(let n=0;s.event&&n<30;n++){const pick=s.event.choices.find(row=>['later','care','leave','keep','continue','pause','ask'].includes(row.id)&&!row.disabledReason)||s.event.choices.find(row=>!row.disabledReason);assert.ok(pick);s=E.chooseEventOption(s,pick.id);}assert.equal(s.event,null);return s;}
const mazeTitles=new Set(['Below the Surface','A place with its own account','A route learned','Another way through','A person beside the objective','Care without taking an account','An account kept with permission','A promise repaired in practice','What you chose to carry','A cache recovered once','A discovery with a human consequence','An expedition remembered','A guardian’s particular lead','A new listener, a fresh agreement','A decision becomes part of the world','The cell doors opened',...ENCOUNTER_DESIGN_V27.bosses.map(b=>b.name)]);
function act(s,id){assert.ok(E.getActions(s).some(row=>row.id===id&&!row.disabledReason),id);const prior=new Set(s.journal.map(r=>r.id));s=drain(E.chooseAction(s,id));assert.ok(E.validateSave(s),s.notice);if(/^maze_(authored_|signature_)/.test(id)&&!s.battle)assert.ok(s.journal.some(r=>!prior.has(r.id)&&mazeTitles.has(r.title)),id+': actual owned narrative survives afterAction');for(const row of s.journal.filter(r=>!prior.has(r.id)&&mazeTitles.has(r.title))){assert.equal(row.narrativeEdition,30,id+': source-owned Journal marker');assert.deepEqual(E.migrateSave(structuredClone(s)).journal.find(r=>r.id===row.id),row,id+': literal title/body after reload');}return s;}
function roundtrip(s){const restored=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.deepEqual(restored,s);return restored;}
function authoredAid(s){
  const optional=s.maze.content.definition.rooms.filter(row=>row.optional);
  if(optional.some(row=>row.id==='service'))return act(room(s,'service'),'maze_authored_repair_route');
  s=act(room(s,'witness'),'maze_authored_hear_witness');return act(s,'maze_authored_protect_witness');
}

test('five new authored identities complete through actual engine proof/aid and source choices',()=>{
  for(const source of DUNGEONS){let s=site(fresh(),source.locationId);s=act(s,'explore_enter_'+source.id);assert.equal(s.maze.version,2);assert.equal(s.dungeon,null);
    s=authoredAid(s);const guardian=s.maze.content.requiredGuardians[0].slotId;s=act(room(s,guardian),'maze_authored_listen');s=act(s,'maze_authored_parley');
    s=act(room(s,s.maze.content.goalSlotId),'maze_authored_finish_stewardship');assert.equal(s.maze.contentFacts.objectiveMethod,'stewardship');roundtrip(s);s=act(s,'maze_exit');assert.equal(s.maze,null);assert.equal(s.mazeBook.contentReceipts.filter(row=>row.sourceId===source.id).length,1);
  }
});

test('new authored battle saves bind the actual named source encounter',()=>{
  let s=site(fresh(),'marsh');s=act(s,'explore_enter_cistern');const encounter=s.maze.content.definition.rooms.find(row=>row.kind==='fight');s=act(room(s,encounter.id),'maze_fight');
  assert.equal(s.battle.encounterId,encounter.encounterId);assert.equal(s.battle.context.kind,'maze');assert.equal(s.battle.context.slotId,encounter.id);roundtrip(s);
  const bad=structuredClone(s);bad.battle.context.slotId='keeper';assert.equal(E.validateSave(bad),false);
});

test('six signature identities use actual leads, both guardians and selected final service rules',()=>{
  const sources=RPG_DUNGEONS_V27.filter(row=>row.signature);
  for(const [index,source]of sources.entries()){
    let s=fresh();const location=s.world.locations.find(row=>s.realm.sites[row.id]?.regionId===source.regionId&&['town','city','village','castle','fort','citadel','sanctuary','camp'].includes(row.type))||s.world.locations.find(row=>s.realm.sites[row.id]?.regionId===source.regionId);
    s=site(s,location.id);const offer=E.getActions(s).find(row=>row.id==='rpg_enter_'+source.id);assert.ok(offer,source.id);s=act(s,offer.id);assert.equal(s.maze.content.family,'signature');
    s=act(room(s,'ledger'),'maze_signature_copy');s=act(room(s,'stores'),'maze_signature_leave_stores');
    const bosses=s.maze.content.definition.bosses;
    for(const [bossIndex,boss]of bosses.entries()){
      // Numeric offer suffixes deliberately keep undiscovered guardian IDs out
      // of the delegated UI action data. Actual receipts still bind the boss.
      s=act(room(s,'ledger'),'maze_signature_lead_archive_'+bossIndex);s=act(room(s,'stores'),'maze_signature_lead_survey_'+bossIndex);s=act(room(s,'entry'),'maze_signature_lead_contact_'+bossIndex);
      const slot=s.maze.content.definition.rooms.find(row=>row.bossId===boss.id).id;s=room(s,slot);
      const pick=E.getActions(s).find(row=>row.id.startsWith('maze_signature_approach_')&&!row.disabledReason);assert.ok(pick,boss.id);s=act(s,pick.id);assert.equal(s.rpg.bosses.find(row=>row.id===boss.id).resolutions.length,1);
    }
    const method=['care','trade','scheme'][index%3];s=act(room(s,'goal'),'maze_signature_'+method);assert.equal(s.maze.objective,true);roundtrip(s);
    const service=s.rpg.services.find(row=>row.source===source.id);assert.equal(service.rule,{care:'shared',trade:'priced',scheme:'controlled'}[method]);s=act(s,'maze_exit');assert.equal(s.maze,null);
  }
});

test('delegated maze controls keep fog and resume a saved content attendance target',async t=>{
  let s=site(fresh(),'marsh');s=act(s,'explore_enter_cistern');const optional=s.maze.content.definition.rooms.find(row=>row.optional&&row.id==='service');
  assert.ok(optional,'fixture seed includes service');s=room(s,'service');
  assert.equal(applyMazeAction(s,'maze_authored_repair_route',{spendDays:()=>0}),true);assert.ok(E.validateSave(s));roundtrip(s);
  const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');assert.equal(ui.root.querySelectorAll('.maze-cell').length,121);
  assert.ok(ui.root.querySelectorAll('.maze-cell.fog').every(node=>!node.textContent.trim()));assert.ok(ui.root.querySelector('[data-id="maze_work_continue"]'));
  await ui.click('activity','maze_work_continue');assert.equal(ui.current().rpg.project,null);assert.equal(ui.current().maze.contentFacts.variantAid,true);assert.ok(E.validateSave(ui.current()));
});

test('actual child succession preserves story sites and once-only outcomes without inheriting private contact permission',()=>{
  const captured={};
  // Genuine existing adult child avoids synthesizing years of family history.
  // This fixture's resources (including vampire hunger), not its actual
  // genealogy, age, consent or clock, are controlled for content isolation.
  const parentSave=JSON.parse(readFileSync(new URL('./fixtures/v21-vampire-grievance-paused.json',import.meta.url)));
  let s=E.migrateSave(parentSave);assert.ok(s);assert.ok(E.validateSave(s),'canonical existing adult-child fixture validates');s=drain(s);assert.ok(E.validateSave(s));assert.ok(s.life.children[0].age>=18);s.hero.gold=1000;s.hero.condition.hunger=0;for(const key of Object.keys(s.hero.skills))s.hero.skills[key]=12;
  for(const key of Object.keys(s.equipment.materials))s.equipment.materials[key]=20;s.flags.herbs=20;s.adventuring.rations=20;
  assert.equal(s.phase,'adult');assert.ok(s.age>=30);assert.equal(s.event,null);assert.equal(s.battle,null);assert.equal(s.rpg.project,null);assert.equal(s.timeline.journey,null);
  const child=s.life.children.find(row=>row.id==='child-1'),childRecord=s.lineage.people.find(row=>row.source==='child'&&row.localId===child.id);assert.ok(child&&childRecord?.alive&&childRecord.development);assert.ok(Math.floor((s.day-child.bornDay)/365)>=18);assert.ok(E.getActions(s).some(row=>row.id==='retire'&&!row.disabledReason),'public retirement is available before entering');
  // This older life changed some settlements. Use an actual enabled public
  // offer, rather than assuming its first Rainward town is still open.
  let source,entry;
  for(const location of s.world.locations){site(s,location.id);entry=E.getActions(s).find(row=>row.id.startsWith('rpg_enter_signature_')&&!row.disabledReason);if(entry){source=RPG_DUNGEONS_V27.find(row=>'rpg_enter_'+row.id===entry.id);break;}}
  assert.ok(source&&source.signature,'changed world retains a real public signature offer');
  s=act(s,entry.id);s=act(room(s,'ledger'),'maze_signature_copy');s=act(room(s,'stores'),'maze_signature_cache');
  assert.equal(s.maze.sourceId,source.id);assert.deepEqual(s.rpg.bosses.map(row=>row.id),s.maze.content.definition.bosses.map(row=>row.id));
  s=act(room(s,'ledger'),'maze_signature_lead_archive_0');s=act(room(s,'stores'),'maze_signature_lead_survey_0');s=act(room(s,'entry'),'maze_signature_lead_contact_0');
  const mapRuntime=mazeMapRuntime(s),parentActor=s.dynasty.activePersonId,parentGeneration=s.dynasty.generation;
  s=E.updateMazeMapMemory(s,{identity:mazeMapIdentity(s.maze,mapRuntime.rules),roomId:s.maze.position,mark:'return-stair',note:'Original parent recorded this entrance; personal witness permission is separate.'});
  s=roundtrip(s);const originalMemory=structuredClone(s.maze.mapMemory);assert.ok(originalMemory);
  assert.equal(originalMemory.entries[0].authorId,parentActor);assert.equal(originalMemory.entries[0].authorGeneration,parentGeneration);assert.equal(originalMemory.entries[0].authorName,s.hero.name);
  const originalLeads=structuredClone(s.rpg.bosses[0].leads),physical=structuredClone(s.maze),herbs=s.flags.herbs;
  s.rpg.bosses[0].people[0].bond=81;s.rpg.bosses[0].people[0].memories=['Private trust belongs to the recorded parent.'];
  function childOf(parent){
    const completed=parent.maze.objective;parent=act(parent,'maze_exit');assert.ok(E.getActions(parent).some(row=>row.id==='retire'&&!row.disabledReason));parent=E.chooseAction(parent,'retire');assert.equal(parent.event.id,'retirement');parent=E.chooseEventOption(parent,'settle');assert.equal(parent.phase,'retired');assert.ok(E.validateSave(parent),'publicly retired parent validates before succession');const before=structuredClone(parent),next=E.continueAsChild(parent,'child-1');assert.deepEqual(parent,before);
    if(next.dynasty.generation!==parent.dynasty.generation+1){const raw=createSuccessor(parent,'child-1',E.createBirthGame),rawValid=raw&&E.validateSave(raw);if(raw){inheritRpg(raw,parent);inheritStoryMazes(raw,parent);}assert.fail(JSON.stringify({rawSuccessor:!!raw,rawValid,composedValid:raw&&E.validateSave(raw),maze:raw&&validateMazes(raw),rpg:raw&&validateRpg(raw.rpg,raw),lineage:raw&&validateLineage(raw.lineage,raw),notice:next.notice}));}
    assert.ok(E.validateSave(next));const restored=roundtrip(next),prefix=completed?'completed':'unresolved';captured[prefix+'Parent']=before;captured[prefix+'Heir']=structuredClone(restored);return restored;
  }
  let heir=childOf(structuredClone(s));assert.ok(heir.age>=18);assert.equal(heir.maze,null);assert.equal(heir.rpg.project,null);assert.equal(heir.mazeBook.nextRun,s.mazeBook.nextRun);assert.deepEqual(heir.rpg.bosses[0].leads,originalLeads);assert.deepEqual(heir.mazeBook.records[0].visited,physical.visited);assert.deepEqual(heir.mazeBook.records[0].collected,physical.collected);assert.deepEqual(heir.mazeBook.records[0].mapMemory,originalMemory);assert.notEqual(heir.dynasty.activePersonId,parentActor);assert.equal(heir.mazeBook.records[0].mapMemory.entries[0].authorId,parentActor);assert.deepEqual(heir.rpg.bosses[0].people[0].memories,[]);assert.equal(heir.rpg.bosses[0].people[0].bond,35);assert.equal(heir.flags.herbs,herbs);
  heir=site(heir,physical.locationId);heir=act(heir,'rpg_enter_'+source.id);assert.equal(heir.maze.id,physical.id);assert.equal(heir.maze.generation,1);const renewDay=heir.day;heir=act(heir,'maze_signature_lead_contact_0');assert.equal(heir.day-renewDay,2);assert.equal(heir.flags.herbs,herbs);assert.deepEqual(heir.rpg.bosses[0].leads,originalLeads);assert.equal(heir.maze.contentOutcomes.at(-1).actionId,'renew_contact');assert.equal(heir.maze.contentOutcomes.at(-1).actorId,heir.dynasty.activePersonId);roundtrip(heir);
  captured.renewedHeir=structuredClone(heir);
  // Resolve the parent's original run, then inherit its global service/receipt.
  for(const [i,boss]of s.maze.content.definition.bosses.entries()){
    if(i){s=act(room(s,'ledger'),'maze_signature_lead_archive_'+i);s=act(room(s,'stores'),'maze_signature_lead_survey_'+i);s=act(room(s,'entry'),'maze_signature_lead_contact_'+i);}
    s=room(s,s.maze.content.definition.rooms.find(row=>row.bossId===boss.id).id);const approach=E.getActions(s).find(row=>row.id.startsWith('maze_signature_approach_')&&!row.disabledReason);assert.ok(approach);s=act(s,approach.id);
  }
  s=act(room(s,'goal'),'maze_signature_trade');const services=structuredClone(s.rpg.services),resolutions=structuredClone(s.rpg.bosses.map(row=>row.resolutions)),receipts=structuredClone(s.mazeBook.contentReceipts);
  const resolvedHeir=childOf(structuredClone(s));assert.deepEqual(resolvedHeir.rpg.services,services);assert.deepEqual(resolvedHeir.rpg.bosses.map(row=>row.resolutions),resolutions);assert.deepEqual(resolvedHeir.mazeBook.contentReceipts,receipts);assert.equal(resolvedHeir.mazeBook.records[0].objective,true);assert.deepEqual(resolvedHeir.mazeBook.records[0].mapMemory,originalMemory);
  if(process.env.MAZE_SUCCESSOR_CAPTURE==='1'){const target=process.env.MAZE_SUCCESSOR_CAPTURE_PATH||'./fixtures/maze-identity/v2-successor.json.gz';assert.match(target,/^\.\/fixtures\/maze-identity\/[a-z0-9-]+\.json\.gz$/);writeFileSync(new URL(target,import.meta.url),gzipSync(JSON.stringify({version:1,source:'genuine v21 parent and adult child with controlled resources/rooms; public content/map-reminder/successor actions and current receipt accounting',earnedRoute:false,states:captured})),{flag:'wx'});}
});
