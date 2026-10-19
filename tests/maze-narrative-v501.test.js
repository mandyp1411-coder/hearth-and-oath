import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {mazeLayout,applyMazeAction,repairStoryMazeContactJournal} from '../dist/js/maze-v31.js';
import {mazeJournal,bufferMazeJournal} from '../dist/js/maze-narrative.js';
import {syncCartography} from '../dist/js/cartography.js';
import {getBattleActions} from '../dist/js/combat.js';
import {bossContactJournal} from '../dist/js/boss-stories-v27.js';
import {ENCOUNTER_DESIGN_V27} from '../dist/js/encounter-design-v27.js';
const copy=v=>structuredClone(v),raw=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/maze-identity/v050-successor.json.gz',import.meta.url)))),input=JSON.stringify(raw);
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
const reload=s=>{valid(s);const next=E.migrateSave(copy(s));assert.deepEqual(next,s);return next;};
function original(){return copy(raw.states.renewedHeir);}
function repaired(){return valid(E.migrateSave(original()));}
function room(s,id){const cell=s.maze.content.anchors.find(a=>a.slotId===id).cellId;s.maze.position=cell;s.maze.previous=mazeLayout(s.maze).cells[cell].doors[0];s.maze.visited=[...new Set([...s.maze.visited,cell])];return valid(s);}
function authored(source='cistern',locationId='marsh'){let s=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url)))).descent);s=E.chooseEventOption(s,'withdraw');s.locationId=locationId;s.cartography.pending=null;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const k of Object.keys(s.equipment.materials))s.equipment.materials[k]=20;return valid(E.chooseAction(s,'explore_enter_'+source));}
function withoutJournalChange(before,after){const value=copy(after);value.journal=copy(before.journal);assert.deepEqual(value,before);}
function generic(s){return s.journal.findLast(r=>r.tag==='rpg'&&r.title==='Work in the Region');}

test('new v2 signature contact retains its exact generated title/body through afterAction and reload',()=>{
 const before=repaired(),after=reload(E.chooseAction(before,'maze_signature_lead_contact_1')),boss=after.rpg.bosses[1],definition=ENCOUNTER_DESIGN_V27.bosses.find(b=>b.id===boss.id),note=bossContactJournal(boss,definition),row=after.journal.findLast(r=>r.title===note.title);
 assert.equal(after.day-before.day,2);assert.equal(row.text,note.text);assert.equal(row.day,after.day);assert.equal(row.generation,after.dynasty.generation);assert.equal(row.narrativeEdition,30);assert.equal(after.rpg.history.at(-1).text,row.text);
});

test('new authored admission and delegated witness rows persist literal current-source names and limits',()=>{
 let s=authored();const entry=s.journal.at(-1);assert.equal(entry.title,'Below the Surface');assert.ok(entry.text.includes(s.maze.title));assert.equal(entry.narrativeEdition,30);reload(s);
 s=room(s,'witness');const witness=s.maze.content.definition.witness;
 for(const [id,title]of [['hear_witness','A person beside the objective'],['record_witness','An account kept with permission']]){const next=reload(E.chooseAction(s,'maze_authored_'+id)),row=next.journal.findLast(r=>r.title===title);assert.ok(row,title);assert.ok(row.text.includes(witness.name));assert.equal(row.narrativeEdition,30);assert.equal(row.day,next.day);s=next;}
});

test('a controlled no-day attendance pause adds no completion prose; actual resume and cancellation retain their own days',()=>{
 const start=room(authored(),'witness');assert.equal(applyMazeAction(start,'maze_authored_record_witness',{spendDays:()=>0}),false,'unheard witness remains unavailable');
 const heard=reload(E.chooseAction(start,'maze_authored_hear_witness')),paused=copy(heard),journal=copy(paused.journal);
 assert.equal(applyMazeAction(paused,'maze_authored_record_witness',{spendDays:()=>0}),true);assert.ok(paused.rpg.project);assert.deepEqual(paused.journal,journal);reload(paused);
 const canceled=reload(E.chooseAction(paused,'maze_work_cancel')),row=canceled.journal.at(-1);assert.equal(row.title,'A commitment withdrawn');assert.equal(row.text,'0 days and 0 gold remain spent. No unfinished result was received.');assert.equal(row.day,paused.day);assert.equal(row.narrativeEdition,30);assert.equal(canceled.maze.contentFacts.witnessRecorded,undefined);
 const resumed=reload(E.chooseAction(paused,'maze_work_continue'));assert.equal(resumed.rpg.project,null);assert.equal(resumed.day,paused.day+1);const completed=resumed.journal.slice(paused.journal.length);assert.deepEqual(completed.map(r=>r.title),['An account kept with permission','Progress without a fight']);for(const note of completed){assert.equal(note.narrativeEdition,30);assert.equal(note.day,resumed.day);}
});

test('staged A, unrelated calendar, B keep exact IDs/order/timestamps and only validated owned drafts gain a marker',()=>{
 const m={version:2},s={maze:m,day:10,age:18,revision:5,dynasty:{generation:2},journal:[]};
 const emit=(title,text,tag,meta={})=>{const row={id:'row-'+(s.journal.length+1),title,text,tag,day:s.day,age:s.age,generation:2,...meta};s.journal.push(row);return row;};
 const ctx={validateMazeNarrative:run=>run===m,journal:emit,journalLiteral:emit},buffer=bufferMazeJournal(s,m,ctx);
 buffer.context.journal('A','first','exploration');s.day=11;ctx.journal('Calendar','unrelated time-passing event','birthday');buffer.context.journalLiteral('B','second','rpg');
 const before=copy(s.journal);assert.deepEqual(before.map(r=>r.title),['A','Calendar','B']);buffer.flush();buffer.flush();
 assert.deepEqual(s.journal.map(r=>r.id),before.map(r=>r.id));assert.deepEqual(s.journal.map(r=>r.title),['A','Calendar','B']);assert.deepEqual(s.journal.map(r=>r.day),[10,11,11]);assert.deepEqual(s.journal[1],before[1]);
 for(const i of [0,2]){assert.equal(s.journal[i].narrativeEdition,30);const row={...s.journal[i]};delete row.narrativeEdition;assert.deepEqual(row,before[i]);}
 const legacy={version:1};s.maze=legacy;mazeJournal(s,legacy,ctx,'Old','old','rpg');assert.equal(s.journal.at(-1).narrativeEdition,undefined);
 s.maze=m;ctx.validateMazeNarrative=()=>false;const rejected=bufferMazeJournal(s,m,ctx);rejected.context.journal('Unverified','not current','rpg');rejected.flush();assert.equal(s.journal.at(-1).narrativeEdition,undefined);
});

test('one exact typed renewal/history repairs only the unique generic row and is input-pure and idempotent',()=>{
 const before=original(),prior=copy(before),after=E.migrateSave(before),old=generic(prior),row=after.journal.find(r=>r.id===old.id),history=prior.rpg.history.at(-1);
 assert.equal(row.title,history.title);assert.equal(row.text,history.text);assert.equal(row.day,old.day);assert.equal(row.age,old.age);assert.equal(row.generation,old.generation);assert.equal(row.id,old.id);withoutJournalChange(prior,after);assert.deepEqual(before,prior);
 const expected=copy(prior);const matched=expected.journal.find(r=>r.id===old.id);matched.title=history.title;matched.text=history.text;assert.deepEqual(after,expected);assert.deepEqual(E.migrateSave(copy(after)),after);assert.equal(JSON.stringify(raw),input);
});

for(const [name,change]of [
 ['missing typed proof',s=>{s.maze.contentOutcomes=s.maze.contentOutcomes.filter(r=>r.actionId!=='renew_contact');}],
 ['mismatched retained history',s=>{s.rpg.history.at(-1).text+=' Not the canonical account.';}],
 ['duplicate history',s=>{s.rpg.history.push(copy(s.rpg.history.at(-1)));}],
 ['duplicate generic candidate',s=>{s.journal.push({...copy(generic(s)),id:'ambiguous-contact'});}],
 ['wrong actor generation',s=>{s.maze.contentOutcomes.at(-1).actorGeneration=1;}],
 ['wrong actor identity',s=>{s.maze.contentOutcomes.at(-1).actorId=s.dynasty.history[0].personId;}],
 ['wrong source identity',s=>{s.maze.contentOutcomes.at(-1).bossId='orchard_wife';}],
 ['wrong original participant set',s=>{s.maze.contentOutcomes.at(-1).participantIds.reverse();}],
 ['wrong attended day',s=>{s.maze.contentOutcomes.at(-1).day--;}],
 ['different Journal generation',s=>{generic(s).generation=1;}],
 ['different Journal prose',s=>{generic(s).text+=' A separate memory.';}],
 ['legacy v1 owner',s=>{s.maze.version=1;}],
 ])test('repair leaves '+name+' byte-identical',()=>{const s=original();change(s);const before=JSON.stringify(s);repairStoryMazeContactJournal(s);assert.equal(JSON.stringify(s),before);});


// Controlled high stats bound these real-command replays. They are not earned
// routes, naturally developed characters or balance evidence. No result packet,
// enemy HP, actor identity or outcome is forged after capture.
function fighter(s){s.hero.attributes.strength=40;s.hero.skills.weapons=20;s.hero.maxHp=s.hero.hp=1000;return valid(s);}
function playedVictory(s){let turns=0;while(!s.battle.outcome&&turns++<40){const target=s.battle.actors.find(a=>a.side==='enemy'&&a.hp>0);assert.ok(getBattleActions(s.battle).some(a=>a.id==='attack'&&!a.disabledReason));const prior=JSON.stringify(s.battle);s=valid(E.chooseBattleAction(s,'attack',target.id));assert.notEqual(JSON.stringify(s.battle),prior,'actual legal Attack advances combat');}assert.equal(s.battle.outcome,'victory','bounded real-command victory');assert.ok(turns>0);const result=E.resolveBattle(s,copy(s.battle));assert.equal(result.battle,null,'real result resolver accepts the actual completed battle: '+result.notice);return reload(result);}
test('actual v2 authored rescue result keeps its source-owned title/body after final combat settlement and reload',()=>{
 let s=room(authored('watchtower','tower'),'cells');s=valid(E.chooseAction(fighter(s),'maze_fight'));assert.ok(s.battle);s=playedVictory(s);
 const row=s.journal.findLast(r=>r.title==='The cell doors opened');assert.ok(row);assert.equal(row.text,'Your victory freed the detained travelers. Their families can return to the road.');assert.equal(row.narrativeEdition,30);assert.equal(s.maze.contentFacts.prisonersFreed,true);assert.equal(row.day,s.day);
});
test('actual v2 signature combat result keeps its exact physical conclusion without inventing a peaceful outcome',()=>{
 let s=repaired();const first=s.maze.content.requiredGuardians[0].slotId;s=room(s,first);s=valid(E.chooseAction(fighter(s),'maze_fight'));assert.ok(s.battle);const title=s.maze.content.definition.rooms.find(r=>r.id===first).title;s=playedVictory(s);
 const row=s.journal.findLast(r=>r.title==='A decision becomes part of the world');assert.ok(row);assert.equal(row.text,'Victory clears '+title+'. The side accounts and final room remain separate work.');assert.equal(row.narrativeEdition,30);assert.equal(s.maze.contentOutcomes.at(-1).actionId,'combat');assert.deepEqual(s.maze.contentOutcomes.at(-1).participantIds,[]);
});
