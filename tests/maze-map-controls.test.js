import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { mazeLayout, mazeRoomCell, mazeMapRuntime, validateMazes, inheritStoryMazes } from '../dist/js/maze-v31.js';
import { mazeMapIdentity } from '../dist/js/maze-map-memory.js';
import { currentMazeMapSession, mazeMapView } from '../dist/js/maze-map-ui.js';
import { syncCartography } from '../dist/js/cartography.js';
import { mountApp } from './helpers/ui-surface.mjs';
import {readIntoRulebook,contractDescent} from './helpers/one-rulebook.mjs';
import {mazeDimensions} from '../dist/js/maze-dimensions.js';

// Controlled visited positions test interface/validation contracts. They are not
// earned route or difficulty evidence. Actual edits and walks use public APIs.
const old=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent;
let base;
function drain(s){for(let n=0;s.event&&n<30;n++)s=E.chooseEventOption(s,(s.event.choices.find(row=>['later','care','leave','keep','continue','pause','ask'].includes(row.id)&&!row.disabledReason)||s.event.choices.find(row=>!row.disabledReason)).id);assert.equal(s.event,null);return s;}
// One rulebook (v0.72.3): the campaign dungeons and the board's descent are delves for every life, so a
// new maze is a contract's descent, and an authored maze is one already begun (a genuine capture's).
const begun=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v0590-long-life-before-battle.json.gz',import.meta.url))));
function fresh(authored=false){
 // Controlled visited position, like the rest of this file: the walker stands at the begun maze's entrance.
 if(authored){const s=drain(readIntoRulebook(begun.state||begun));assert.equal(s.maze?.kind,'authored');s.maze.position=0;s.maze.previous=s.maze.visited[1];assert.ok(E.validateSave(s));return s;}
 if(!base){base=E.migrateSave(structuredClone(old));assert.ok(base);base=E.chooseEventOption(base,'withdraw');assert.ok(E.validateSave(base));}
 let s=structuredClone(base);s.adventuring.rations=20;
 s=drain(E.chooseAction(s,contractDescent(s)));assert.ok(s.maze);assert.ok(E.validateSave(s));return s;
}
function payload(s,roomId=0,extra={}){const {rules}=mazeMapRuntime(s);return {identity:mazeMapIdentity(s.maze,rules),roomId,mark:'revisit',note:'Return later',...extra};}
function clean(s){const v=structuredClone(s);v.notice='';if(v.maze)delete v.maze.mapMemory;for(const m of v.mazeBook?.records||[])delete m.mapMemory;return v;}
function roundtrip(s){assert.ok(E.validateSave(s),s.notice);const restored=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);return restored;}
function recordedPath(s){
 const l=mazeLayout(s.maze),queue=[[0]],seen=new Set([0]);let path;
 for(const at of queue){if(at.length===3){path=at;break;}for(const to of l.cells[at.at(-1)].doors)if(!seen.has(to)){seen.add(to);queue.push([...at,to]);}}
 assert.ok(path);s.maze.visited=[...path];s.maze.cleared=[...path];assert.ok(E.validateSave(s));return path;
}
// A contract's maze is 5, 7 or 11 rooms wide (maze-dimensions.js).
function arrow(from,to,size=11){return {1:'ArrowRight','-1':'ArrowLeft',[size]:'ArrowDown',[-size]:'ArrowUp'}[to-from];}
async function submitReminder(ui,{mark='revisit',note='Return later'}={}){
 const form=ui.root.querySelector('#maze-map-reminder');assert.ok(form);ui.root.querySelector('#maze-map-mark').value=mark;
 ui.root.querySelector('#maze-map-note').value=note;await ui.fire('submit',form);
}

test('engine reminder edits are save-stable and alter no gameplay fields',()=>{
 for(const authored of [false,true]){
  const s=fresh(authored),before=structuredClone(s);const next=roundtrip(E.updateMazeMapMemory(s,payload(s)));
  assert.deepEqual(s,before);assert.deepEqual(clean(next),clean(before));
  assert.equal(next.maze.mapMemory.entries[0].authorName,s.hero.name);assert.equal(next.maze.mapMemory.entries[0].day,s.day);
  const removed=roundtrip(E.updateMazeMapMemory(next,payload(next,0,{mark:null,note:''})));
  assert.equal(removed.maze.mapMemory,undefined);assert.deepEqual(clean(removed),clean(before));
 }
});

test('engine rejects forged identity, unvisited room, fake stair and pending battle edits',()=>{
 let s=fresh();const before=clean(s),unknown=mazeLayout(s.maze).cells.find(row=>!s.maze.visited.includes(row.id)).id;
 for(const request of [payload(s,unknown),payload(s,0,{identity:{...payload(s).identity,runSeed:'another'}}),payload(s,0,{note:'x'.repeat(161)})]){
  const next=E.updateMazeMapMemory(s,request);assert.equal(next.maze.mapMemory,undefined);assert.deepEqual(clean(next),before);
 }
 const path=recordedPath(s);const next=E.updateMazeMapMemory(s,payload(s,path[1],{mark:'return-stair'}));
 if(mazeRoomCell(s.maze,path[1]).kind!=='entrance'){assert.equal(next.maze.mapMemory,undefined);assert.match(next.notice,/actual discovered return stair/);}
 const enemy=mazeLayout(s.maze).cells.map(row=>mazeRoomCell(s.maze,row.id)).find(row=>row.kind==='enemy'&&!s.maze.cleared.includes(row.id));assert.ok(enemy);
 s.maze.position=enemy.id;s.maze.previous=enemy.doors[0];s.maze.visited=[...new Set([...s.maze.visited,enemy.id,enemy.doors[0]])];
 s=E.chooseAction(s,'maze_fight');assert.ok(s.battle);roundtrip(s);
 const pending=E.updateMazeMapMemory(s,payload(s,0));assert.deepEqual(clean(pending),clean(s));assert.equal(pending.maze.mapMemory,undefined);assert.match(pending.notice,/current moment/);
});

test('active and archived validators reject copied, unseen and malformed annotations',()=>{
 const original=fresh(),s=E.updateMazeMapMemory(original,payload(original));assert.ok(E.validateSave(s));
 const unseen=mazeLayout(s.maze).cells.find(row=>!s.maze.visited.includes(row.id)).id;
 for(const mutate of [v=>v.maze.mapMemory.entries[0].roomId=unseen,v=>v.maze.mapMemory.identity.runGeneration++,
  v=>v.maze.mapMemory.entries[0].authorId='not-a-person',v=>v.maze.mapMemory.entries[0].day++,
  v=>v.maze.mapMemory.entries[0].extra=true]){
  const bad=structuredClone(s);mutate(bad);assert.equal(E.validateSave(bad),false);
 }
 const archived=roundtrip(E.chooseAction(s,'maze_exit'));assert.equal(archived.maze,null);assert.deepEqual(archived.mazeBook.records.at(-1).mapMemory,s.maze.mapMemory);
 const corrupt=structuredClone(archived);corrupt.mazeBook.records.at(-1).mapMemory.identity.runSeed='wrong';assert.equal(E.validateSave(corrupt),false);
});

test('an authored archive and v2 inheritance preserve full note provenance',()=>{
 let s=fresh(true);s=roundtrip(E.updateMazeMapMemory(s,payload(s)));const memory=structuredClone(s.maze.mapMemory);
 // Re-entering the place is a delve now (v0.72.3); the archived maze keeps its notes.
 s=roundtrip(E.chooseAction(s,'maze_exit'));assert.equal(s.maze,null,s.notice);assert.deepEqual(s.mazeBook.records.at(-1).mapMemory,memory);
 const successor=structuredClone(s),priorActor=memory.entries[0].authorId;
 successor.maze=null;successor.dynasty={...successor.dynasty,generation:2,activePersonId:'map-test-successor',
  history:[...(successor.dynasty.history||[]),{personId:priorActor}]};
 inheritStoryMazes(successor,s);assert.equal(validateMazes(successor),true);
 assert.deepEqual(successor.mazeBook.records.find(row=>row.id===memory.identity.mazeId).mapMemory,memory);
 const legacy=fresh(),legacySuccessor=structuredClone(legacy),oldBook=structuredClone(legacySuccessor.mazeBook);
 inheritStoryMazes(legacySuccessor,legacy);assert.deepEqual(legacySuccessor.mazeBook,oldBook,'all-v1 inheritance remains unchanged');
});

// The older expedition engines and their pages left in v0.72.4 (tests/older-walks-v0724.test.js); their tests went with them.

test('pure view/session keep inherited recorded knowledge and reset controls on actor/run change',()=>{
 const original=fresh(true),s=E.updateMazeMapMemory(original,payload(original)),before=structuredClone(s);
 const session={...currentMazeMapSession(s),mode:'inspect',selected:0,routeTarget:0};
 const view=mazeMapView(s,E.getActions(s),session);assert.equal(view.route.status,'already-here');assert.deepEqual(s,before);
 const newer=structuredClone(s);newer.dynasty.generation++;assert.equal(currentMazeMapSession(newer,session).mode,'walk');
 const other=structuredClone(s);other.maze.seed+='different';assert.equal(currentMazeMapSession(other,session).mode,'walk');
});

test('actual default map hides every unknown wall/content while retaining known current door',async t=>{
 const s=fresh(),l=mazeLayout(s.maze),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');
 assert.equal(ui.root.querySelector('.maze-grid').dataset.mazeMode,'walk');const cells=ui.root.querySelectorAll('.maze-cell');assert.equal(cells.length,l.cells.length);
 for(const c of l.cells){const tile=cells[c.id];if(c.id===0)continue;
  assert.doesNotMatch(tile.class,/wall-|route-room|inspected|cache|enemy|guardian|trap|objective/);
  assert.equal(tile.getAttribute('aria-label'),l.cells[0].doors.includes(c.id)?'Unknown adjoining room':'Unexplored');
  for(const key of Object.keys(tile.dataset))assert.ok(['op','id'].includes(key));
  if(l.cells[0].doors.includes(c.id)){assert.equal(tile.dataset.op,'activity');assert.equal(tile.dataset.id,'maze_step_'+c.id);assert.equal(tile.disabled,false);}
  else{assert.equal(tile.dataset.op,undefined);assert.equal(tile.disabled,true);}
 }
 const current=cells[0];for(const to of l.cells[0].doors){assert.equal(current.classList.contains('wall-'+({1:'east',11:'south'}[to])),false);}
 assert.deepEqual(ui.current(),s);
});

test('actual Inspect selection, arrows, double-click and Cancel never move or spend',async t=>{
 const s=fresh(),path=recordedPath(s),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('maze-map-mode','inspect');
 assert.deepEqual(ui.current(),s);assert.equal(ui.document.activeElement.dataset.id,'inspect');
 assert.equal(ui.root.querySelectorAll('.maze-cell[data-op="activity"]').length,0);
 const selected=ui.root.querySelector('[data-op="maze-map-select"][data-id="0"]');selected.focus();await ui.key(arrow(0,path[1],mazeDimensions(ui.current().maze).size));
 assert.equal(ui.document.activeElement.dataset.id,String(path[1]));assert.equal(ui.document.activeElement.dataset.op,'maze-map-select');assert.deepEqual(ui.current(),s);
 const same=ui.document.activeElement;await ui.fire('dblclick',same);await ui.key('Enter');assert.deepEqual(ui.current(),s);
 ui.root.querySelector('#maze-map-note').value='discard this';await ui.click('maze-map-cancel');
 assert.equal(ui.root.querySelector('#maze-map-note').value,'');assert.deepEqual(ui.current(),s);
 assert.ok(ui.root.querySelectorAll('.maze-cell[tabindex="0"]').length<=1);
});

test('actual save/escape/focus, marked picker, route/clear and explicit Walk remain separate',async t=>{
 const s=fresh(),path=recordedPath(s),ui=await mountApp(t, {states:[s],width:390,height:844});
 await ui.click('title-continue');await ui.click('maze-map-mode','inspect');await ui.click('maze-map-select',String(path[2]));
 const note='<img src=x onerror="run()"> & \'quoted\'';await submitReminder(ui,{mark:'cache',note});
 const saved=ui.current();roundtrip(saved);assert.deepEqual(clean(saved),clean(s));assert.equal(saved.maze.mapMemory.entries[0].note,note);
 assert.equal(ui.document.activeElement.id,'maze-map-note');assert.doesNotMatch(ui.root.innerHTML,/<img src=x onerror=/);
 assert.match(ui.root.innerHTML,/&lt;img src=x onerror=&quot;run\(\)&quot;&gt;/);assert.match(ui.root.innerHTML,/Marked by/);
 const form=ui.root.querySelector('#maze-map-find');ui.root.querySelector('#maze-marked-room').value=String(path[2]);await ui.fire('submit',form);assert.deepEqual(ui.current(),saved);
 await ui.click('maze-map-route',String(path[2]));assert.deepEqual(ui.current(),saved);assert.equal(ui.document.activeElement.id,'maze-route-heading');
 assert.equal(ui.root.querySelectorAll('.maze-cell.route-room').length,3);assert.match(ui.root.innerHTML,/2 walks through recorded rooms/);
 await ui.click('maze-map-route-clear');assert.equal(ui.root.querySelectorAll('.maze-cell.route-room').length,0);assert.deepEqual(ui.current(),saved);
 await ui.click('maze-map-mode','walk');const before=ui.current(),expected=E.chooseAction(before,'maze_step_'+path[1]);
 ui.root.querySelector('.maze-grid').focus();await ui.key(arrow(0,path[1],mazeDimensions(ui.current().maze).size));assert.deepEqual(ui.current(),expected);
 assert.deepEqual(ui.current().maze.mapMemory,saved.maze.mapMemory);assert.equal(ui.current().maze.steps,before.maze.steps+1);
});

test('actual stale detached form and repeated read-only controls cannot write or walk',async t=>{
 const s=fresh(),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('maze-map-mode','inspect');
 const stale=ui.root.querySelector('#maze-map-reminder');stale.controls.find(row=>row.name==='note').value='stale';
 await ui.click('maze-map-cancel');assert.equal(stale.isConnected,false);await ui.fire('submit',stale);assert.deepEqual(ui.current(),s);
 await ui.click('maze-map-mode','walk');await ui.click('maze-map-mode','inspect');await ui.click('maze-map-select','0');await ui.click('maze-map-select','0');
 assert.deepEqual(ui.current(),s);assert.equal(ui.root.querySelector('#maze-map-note').value,'');
});
