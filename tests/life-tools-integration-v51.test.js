import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as settle} from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import {mazeRoomCell} from '../dist/js/maze-v31.js';
import {genericMazeInscriptionNote} from '../dist/js/maze-inscription-note.js';
import {personalNoteOwner,personalNoteRows,reviewPersonalNote} from '../dist/js/personal-notes.js';
import {copy,valid,roundtrip,action,atGeneric,select,roomFixture,realParent} from './helpers/companion-field-fixtures.mjs';
import {mountApp} from './helpers/ui-surface.mjs';

// Controlled carried notes, party and current rooms; actual public action,
// retirement/succession and delegated UI handlers. Not earned-life or browser QA.
function fill(s,count){const owner=personalNoteOwner(s);assert.ok(owner);s.playerNotes=Array.from({length:count},(_,i)=>({day:s.day,text:' exact retained note '+i+' Ω\n\n<&> ',id:'note-'+(i+1),...owner,noteVersion:0,archived:i===0}));return roundtrip(s);}
for(const count of [99,100])for(const mode of ['ordinary','scholar'])test(`${mode} inscription with ${count} owned notes separates immutable proof from bounded copying`,()=>{
 const s=fill(roomFixture('scholar'),count),before=copy(s),canonical=genericMazeInscriptionNote(mazeRoomCell(s.maze)),q=E.fieldAssistQuote(s,'scholar','orrin'),id=mode==='scholar'?select(s,'scholar','orrin').id:'maze_read';
 const next=roundtrip(action(s,id));assert.deepEqual(s,before);assert.deepEqual(next.playerNotes.slice(0,count),before.playerNotes,'no eviction/rekey/backfill of any original row');assert.equal(next.playerNotes.length,Math.min(count+1,100));
 const proof=next.journal.filter(j=>j.title==='A Note from Below'&&j.text===canonical.text);assert.equal(proof.length,before.journal.filter(j=>j.title==='A Note from Below'&&j.text===canonical.text).length+1);assert.equal(proof.at(-1).narrativeEdition,30);assert.equal(proof.at(-1).day,before.day);assert.equal(next.day,before.day);assert.equal(next.hero.gold,before.hero.gold);assert.equal(next.hero.potions,before.hero.potions);assert.deepEqual(next.hero.skills,before.hero.skills);assert.deepEqual(next.equipment,before.equipment);
 if(count===100){assert.deepEqual(next.playerNotes,before.playerNotes);assert.match(next.notice,/full|100/);assert.match(next.notice,/Archive/);}else{const note=next.playerNotes.at(-1);assert.equal(note.ownerId,before.dynasty.activePersonId);assert.equal(note.generation,before.dynasty.generation);assert.equal(note.text,canonical.title+': '+canonical.text);}
 const helper=next.companions.find(p=>p.id==='orrin');if(mode==='scholar'){assert.equal(helper.mp,q.helperFocusAfter);assert.equal(next.hero.mp,q.targetFocusAfter);assert.equal(next.maze.fieldAssists.entries.length,1);assert.equal(next.maze.expeditionVisit.assists.length,1);}else{assert.deepEqual(next.companions,before.companions);assert.equal(next.hero.mp,before.hero.mp);assert.equal(next.maze.fieldAssists,undefined);}
 const repeated=E.chooseAction(next,id),normalized=copy(repeated);normalized.notice=next.notice;assert.deepEqual(normalized,next,'replay cannot copy, restore Focus, charge or record proof twice');
});

test('full scholar notebook closes under the actual parent after public retirement and leaves heir capacity',()=>{
 let s=realParent();for(const p of s.companions){p.active=p.recruited=p.id==='orrin';if(p.id==='orrin'){p.mp=p.maxMp;p.hp=p.maxHp;s.rpg.companionStages.orrin.status='available';}}s.hero.mp=Math.min(8,s.hero.maxMp);s=fill(atGeneric(valid(s),'inscription'),100);
 s=action(s,select(s,'scholar','orrin').id);const oldNotes=copy(s.playerNotes),oldOwner=s.dynasty.activePersonId,oldGeneration=s.dynasty.generation,oldHelp=copy(s.maze.fieldAssists.entries[0]);s.maze.position=s.maze.previous=0;s=action(s,'maze_exit');s=E.chooseAction(s,'retire');assert.equal(s.event.id,'retirement');s=valid(E.chooseEventOption(s,'settle'));assert.equal(s.phase,'retired');const parent=copy(s),heir=roundtrip(E.continueAsChild(s,'child-1'));assert.deepEqual(s,parent);
 const history=heir.dynasty.history.find(h=>h.personId===oldOwner);assert.deepEqual(history.personalNotes,oldNotes);assert.equal(heir.playerNotes.length,0);assert.ok(personalNoteRows(heir).every(n=>!n.own));assert.equal(reviewPersonalNote(heir,personalNoteRows(heir)[0].key),null);assert.deepEqual(heir.mazeBook.records.find(m=>m.seed===oldHelp.runSeed).fieldAssists.entries,[oldHelp]);
 const written=roundtrip(E.keepPlayerNote(heir,'the heir writes separately'));assert.equal(written.playerNotes[0].ownerId,written.dynasty.activePersonId);assert.equal(written.playerNotes[0].generation,oldGeneration+1);assert.deepEqual(written.dynasty.history,heir.dynasty.history);
});

const snapshot=ui=>JSON.stringify([...ui.values]);
function track(ui){const writes=[],set=ui.storage.setItem.bind(ui.storage);ui.storage.setItem=(key,value)=>{writes.push(key);return set(key,value);};return writes;}
async function practice(ui){await ui.click('menu');await ui.click('practice-open','protect_ally');assert.ok(ui.root.querySelector('.practice-modal'));}
async function notes(ui){await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');}

test('practice blocks connected note operations and old edit/add/search forms without any storage writes',async t=>{
 const s=E.keepPlayerNote(roomFixture('scholar'),'unchanged original Ω');const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await notes(ui);const key=personalNoteRows(ui.current()).find(n=>n.own).key;
 const staleAdd=ui.root.querySelector('#player-note');staleAdd.querySelector('textarea').value='stale add';await ui.click('personal-note-edit',key);const staleEdit=ui.root.querySelector('#personal-note-edit-form');staleEdit.querySelector('textarea').value='stale edit';await ui.key('Escape');await practice(ui);await settle();
 const before=snapshot(ui),original=ui.current(),writes=track(ui),session=ui.root.querySelector('.practice-modal').dataset.practiceSession,connected=ui.root.querySelector('#player-note');assert.ok(connected?.isConnected);connected.querySelector('textarea').value='connected background add';
 await ui.fire('submit',connected);await ui.fire('submit',staleAdd);await ui.fire('submit',staleEdit);
 for(const op of ['personal-note-edit','personal-note-archive','personal-note-confirm','personal-notes-scope','journal-page'])for(const node of ui.root.querySelectorAll(`[data-op="${op}"]`))await ui.fire('click',node);
 const search=ui.root.querySelector('#journal-search');if(search){search.querySelector('input').value='background';await ui.fire('submit',search);}
 assert.equal(ui.root.querySelector('.practice-modal').dataset.practiceSession,session);assert.equal(snapshot(ui),before);assert.deepEqual(ui.current(),original);assert.deepEqual(writes,[]);
 await ui.click('practice-close');await ui.fire('submit',staleEdit);await ui.fire('submit',staleAdd);assert.deepEqual(ui.current(),original);assert.equal(snapshot(ui),before);assert.deepEqual(writes,[]);
});

test('a file read begun before practice cannot replace its session with a late import review',async t=>{
 const s=roomFixture('scholar'),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await settle();const input=ui.root.querySelector('#save-file');let resolve;input.files=[{size:1024,text:()=>new Promise(done=>{resolve=done;})}];const reading=ui.fire('change',input);await settle();assert.equal(typeof resolve,'function');await practice(ui);const before=snapshot(ui),original=ui.current(),writes=track(ui),session=ui.root.querySelector('.practice-modal').dataset.practiceSession;
 resolve(JSON.stringify(s));await reading;await settle();assert.equal(ui.root.querySelector('.practice-modal').dataset.practiceSession,session);assert.equal(ui.root.querySelector('[data-op="confirm-import"]'),null);assert.deepEqual(ui.current(),original);assert.equal(snapshot(ui),before);assert.deepEqual(writes,[]);
});

test('a pending save-lock practice entry rejects a prior file read without opening review or writing',async t=>{
 const held=[];let hold=false;const locks={request:async(_name,_opts,operation)=>hold?new Promise(resolve=>held.push(()=>resolve(operation()))):operation()};
 const s=roomFixture('scholar'),ui=await mountApp(t, {states:[s],locks});await ui.click('title-continue');await settle();await ui.click('menu');const input=ui.root.querySelector('#save-file');let resolve;input.files=[{size:1024,text:()=>new Promise(done=>{resolve=done;})}];const reading=ui.fire('change',input);await settle();hold=true;const before=snapshot(ui),writes=track(ui),opening=ui.click('practice-open','protect_ally');await settle();assert.equal(held.length,1);
 resolve(JSON.stringify(s));await reading;assert.equal(ui.root.querySelector('[data-op="confirm-import"]'),null);assert.equal(snapshot(ui),before);assert.deepEqual(writes,[]);hold=false;held.shift()();await opening;await settle();assert.ok(ui.root.querySelector('.practice-modal'));assert.equal(snapshot(ui),before);assert.deepEqual(writes,[]);
});

test('an ordinary current import read opens review without writing and superseded reads cannot replace it',async t=>{
 const s=roomFixture('scholar'),other=copy(s);other.notice='newer reviewed input';const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await settle();const input=ui.root.querySelector('#save-file');let resolve;const older={size:1024,text:()=>new Promise(done=>{resolve=done;})};input.files=[older];const reading=ui.fire('change',input);await settle();const before=snapshot(ui),writes=track(ui);input.files=[{size:1024,text:async()=>JSON.stringify(other)}];await ui.fire('change',input);assert.ok(ui.root.querySelector('[data-op="confirm-import"]'));const review=ui.root.querySelector('[data-op="confirm-import"]');resolve('not valid JSON');await reading;assert.equal(ui.root.querySelector('[data-op="confirm-import"]'),review,'old read cannot rerender or replace current review');assert.deepEqual(ui.current(),s);assert.equal(snapshot(ui),before);assert.deepEqual(writes,[]);await ui.key('Escape');assert.deepEqual(ui.current(),s);
});

test('practice blocks connected loadout and favorite controls and a detached preset form after exit',async t=>{
 const s=roomFixture('scholar'),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','inventory');const stale=ui.root.querySelector('#gear-preset-save');assert.ok(stale);stale.querySelector('[name="label"]').value='stale road kit';await practice(ui);const before=snapshot(ui),original=ui.current(),writes=track(ui),connected=ui.root.querySelector('#gear-preset-save');assert.ok(connected?.isConnected);connected.querySelector('[name="label"]').value='background road kit';await ui.fire('submit',connected);await ui.fire('submit',stale);for(const op of ['gear-favorite','gear-preset-apply','gear-preset-delete','gear-slot','inventory-favorites'])for(const node of ui.root.querySelectorAll(`[data-op="${op}"]`))await ui.fire('click',node);assert.equal(snapshot(ui),before);assert.deepEqual(ui.current(),original);assert.deepEqual(writes,[]);await ui.click('practice-close');await ui.fire('submit',stale);assert.equal(snapshot(ui),before);assert.deepEqual(ui.current(),original);assert.deepEqual(writes,[]);
});
