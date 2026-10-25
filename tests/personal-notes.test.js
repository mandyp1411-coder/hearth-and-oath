import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { completeLineageHistory } from '../dist/js/lineage.js';
import { personalNoteRows, reviewPersonalNote as rawReview } from '../dist/js/personal-notes.js';
import { renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
const base=E.migrateSave(fixture), fresh=()=>structuredClone(base);
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={e,paragraphs:text=>'<p>'+e(text)+'</p>',date:n=>'Day '+n,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${e(op)}" data-id="${e(id)}" ${disabled?'disabled':''}>${label}</button>`};
const noteKey=(s,id)=>personalNoteRows(s).find(n=>n.id===id&&n.own)?.key||id;
const reviewPersonalNote=(s,id)=>rawReview(s,noteKey(s,id));
const control=(ui,op,id)=>ui.root.querySelector(`[data-op="${op}"]${id===undefined?'':`[data-id="${id}"]`}`);
async function open(t,s=fresh(),other){const ui=await mountApp(t, {rulebooks:'both', states:other?[s,other]:[s]});await ui.click('title-continue');await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');return ui;}
function reload(s){assert.equal(E.validateSave(s),true);const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}

test('engine edits only the selected personal note, survives round-trip and cannot target earned events or lore',()=>{
 let s=E.keepPlayerNote(fresh(),'first');s=E.keepPlayerNote(s,'same-day second');const before=structuredClone(s),r=reviewPersonalNote(s,s.playerNotes[1].id);
 s=reload(E.editPlayerNote(s,r,'  élan Ω\n\n<&>  '));assert.equal(s.playerNotes[1].day,before.playerNotes[1].day);assert.equal(s.playerNotes[1].text,'  élan Ω\n\n<&>  ');assert.deepEqual(s.playerNotes[0],before.playerNotes[0]);
 for(const key of Object.keys(before).filter(key=>!['playerNotes','notice'].includes(key)))assert.deepEqual(s[key],before[key],key+' remains exact');
 assert.deepEqual(E.editPlayerNote(s,r,'stale overwrite').playerNotes,s.playerNotes);assert.deepEqual(E.editPlayerNote(s,{...r,id:s.journal[0].id},'rewrite earned event').journal,s.journal);
 s=reload(E.archivePlayerNote(s,reviewPersonalNote(s,s.playerNotes[1].id),true));assert.equal(s.playerNotes[1].archived,true);s=reload(E.archivePlayerNote(s,reviewPersonalNote(s,s.playerNotes[1].id),false));assert.equal(s.playerNotes[1].archived,false);
});
test('genuine old notes stay exact on every read and only their deliberately changed row gains metadata',()=>{
 const s=fresh();s.playerNotes=[{day:1,text:' original lower case\n\nŻółw & <tag> '},{day:1,text:' original lower case\n\nŻółw & <tag> '}];const before=structuredClone(s);
 assert.equal(E.validateSave(s),true);for(const section of ['active','notes','archive'])renderSimpleJournal(s,E.getActions(s),{...helpers,section});reviewPersonalNote(s,'legacy-note-2');assert.deepEqual(s,before);assert.deepEqual(reload(s),before);
 const next=reload(E.editPlayerNote(s,reviewPersonalNote(s,'legacy-note-2'),'changed second'));assert.deepEqual(next.playerNotes[0],before.playerNotes[0]);assert.equal(next.playerNotes[1].id,'legacy-note-2');assert.equal(next.playerNotes[1].day,1);assert.deepEqual(s,before);
});
test('genuine public recorded-child succession archives 100 parent notes and leaves capacity for a new heir note',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))),parent=E.migrateSave(fixture.states.parent);
 parent.playerNotes=[{day:1,text:' exact legacy parent note\n\n<&> '}];let s=E.keepPlayerNote(parent,'attributed parent note');for(let i=0;i<98;i++)s=E.keepPlayerNote(s,'parent capacity '+i);assert.equal(s.playerNotes.length,100);s=E.archivePlayerNote(s,reviewPersonalNote(s,'note-1'),true);s.phase='retired';s.event=null;s.chronicle='A test retirement of a genuine parent fixture.';completeLineageHistory(s,'retirement');assert.equal(E.validateSave(s),true);
 const before=structuredClone(s),child=s.life.children.find(c=>c.alive!==false),next=reload(E.continueAsChild(s,child.id));assert.equal(next.dynasty.generation,s.dynasty.generation+1);assert.notEqual(next.dynasty.activePersonId,s.dynasty.activePersonId);assert.deepEqual(s,before);
 assert.equal(next.playerNotes.length,0);const closed=next.dynasty.history.find(h=>h.personId===s.dynasty.activePersonId);assert.equal(closed.personalNotes.length,100);assert.deepEqual(closed.personalNotes.map(n=>({day:n.day,text:n.text})),s.playerNotes.map(n=>({day:n.day,text:n.text})));assert.ok(personalNoteRows(next).every(n=>!n.own&&n.ownerId===s.dynasty.activePersonId&&n.generation===s.dynasty.generation));assert.equal(closed.personalNotes[1].archived,true);assert.equal(reviewPersonalNote(next,'note-1'),null);
 const written=reload(E.keepPlayerNote(next,'the heir’s own note'));assert.equal(written.playerNotes.at(-1).ownerId,next.dynasty.activePersonId);assert.equal(written.playerNotes.at(-1).generation,next.dynasty.generation);assert.ok(reviewPersonalNote(written,written.playerNotes.at(-1).id));assert.equal(written.playerNotes.length,1);assert.equal(written.playerNotes[0].id,'note-1');const ancestor=personalNoteRows(written).find(n=>!n.own&&n.id==='note-1');assert.equal(rawReview(written,ancestor.key),null);assert.deepEqual(written.dynasty.history, next.dynasty.history);
});
test('archive renders every retained life record and its search count beyond the old 120-entry cutoff without save mutation',()=>{
 const s=fresh();s.journal=Array.from({length:257},(_,i)=>({id:'paging-'+i,day:Math.min(i,s.day),age:s.age,title:'Retained life '+i,text:i===0?'Unique oldest match':'Record '+i,tag:'life',generation:s.dynasty.generation}));const before=structuredClone(s);assert.equal(E.validateSave(s),true);
 const collected=[];for(let page=0;page<9;page++){const html=renderSimpleJournal(s,E.getActions(s),{...helpers,section:'archive'},{pages:{life:page}});collected.push(...[...html.matchAll(/<h3>Retained life (\d+)<\/h3>/g)].map(m=>Number(m[1])));assert.ok(html.includes('of 257'));}
 assert.deepEqual(collected,Array.from({length:257},(_,i)=>256-i));const html=renderSimpleJournal(s,E.getActions(s),{...helpers,section:'archive'},{query:'Unique oldest match',pages:{life:8}});assert.match(html,/1–1 of 1 matching \/ 257 saved/);assert.ok(html.includes('Retained life 0'));assert.deepEqual(s,before);
});
test('UI Edit, Cancel and Escape preserve focus, scroll and exact note text; save changes one note once',async t=>{
 const s=fresh(),place=s.world.locations.find(p=>p.name.length>2).name,text=place+'\n\nélan Ω </textarea><script>not markup</script>';s.playerNotes=[{day:1,text}];const ui=await open(t,s),before=ui.current();ui.root.querySelector('.game-content').scrollTop=247;
 await ui.click('personal-note-edit',noteKey(ui.current(),'legacy-note-1'));assert.equal(ui.root.querySelector('#personal-note-text').value,text);assert.equal(ui.root.querySelector('.personal-note-dialog').getAttribute('role'),'dialog');ui.root.querySelector('#personal-note-text').value='cancelled';await ui.click('close-modal');assert.deepEqual(ui.current(),before);assert.equal(ui.document.activeElement.dataset.op,'personal-note-edit');assert.equal(ui.root.querySelector('.game-content').scrollTop,247);
 await ui.click('personal-note-edit',noteKey(ui.current(),'legacy-note-1'));ui.root.querySelector('#personal-note-text').value='escaped';await ui.key('Escape');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('.personal-note-dialog'),null);assert.equal(ui.document.activeElement.dataset.id,noteKey(ui.current(),'legacy-note-1'));
 await ui.click('personal-note-edit',noteKey(ui.current(),'legacy-note-1'));const form=ui.root.querySelector('#personal-note-edit-form'),replacement='  '+place+'\n\nÉlan Ω <b>literal</b>  ';form.querySelector('textarea').value=replacement;await ui.fire('submit',form);const after=ui.current();assert.equal(after.playerNotes[0].text,replacement);assert.equal(after.playerNotes[0].day,1);assert.equal(after.playerNotes[0].noteVersion,1);assert.ok(ui.root.innerHTML.includes('&lt;b&gt;literal&lt;/b&gt;'));assert.equal(ui.root.querySelector('.game-content').scrollTop,247);assert.equal(ui.document.activeElement.dataset.op,'personal-note-edit');await ui.fire('submit',form);assert.deepEqual(ui.current(),after);assert.equal(E.validateSave(after),true);
});
test('UI archive and restore are recoverable, repeat-safe and do not archive any earned entry',async t=>{
 const s=E.keepPlayerNote(fresh(),'Keep the original date.');const ui=await open(t,s),before=ui.current();await ui.click('personal-note-archive',noteKey(ui.current(),'note-1'));await ui.key('Escape');assert.deepEqual(ui.current(),before);
 await ui.click('personal-note-archive',noteKey(ui.current(),'note-1'));const confirm=control(ui,'personal-note-confirm');await ui.fire('click',confirm);const archived=ui.current();assert.equal(archived.playerNotes[0].archived,true);assert.equal(ui.document.activeElement.id,'personal-notes-heading');assert.equal(control(ui,'personal-note-edit',noteKey(ui.current(),'note-1')),null);await ui.fire('click',confirm);assert.deepEqual(ui.current(),archived);
 await ui.click('personal-notes-scope','archived');assert.ok(control(ui,'personal-note-archive',noteKey(ui.current(),'note-1')));assert.equal(control(ui,'personal-note-edit',noteKey(ui.current(),'note-1')),null);await ui.click('personal-note-archive',noteKey(ui.current(),'note-1'));await ui.click('personal-note-confirm');const restored=ui.current();assert.equal(restored.playerNotes[0].archived,false);assert.equal(restored.playerNotes[0].text,before.playerNotes[0].text);assert.equal(restored.playerNotes[0].day,before.playerNotes[0].day);assert.deepEqual(restored.journal,before.journal);assert.deepEqual(restored.lore,before.lore);assert.equal(E.validateSave(restored),true);
});
test('UI paging and search stay out of saves, reset to a matching page and retain connected focus',async t=>{
 const s=fresh();s.journal=Array.from({length:257},(_,i)=>({id:'page-ui-'+i,day:Math.min(i,s.day),age:s.age,title:'Retained life '+i,text:i===0?'needle oldest':'Entry '+i,tag:'life',generation:s.dynasty.generation}));const ui=await open(t,s),before=ui.current(),slots=ui.lives();await ui.click('workspace-section','journal:archive');await ui.click('journal-page','life:8');assert.ok(ui.root.innerHTML.includes('<h3>Retained life 0</h3>'));assert.equal(ui.document.activeElement.id,'journal-life-results');assert.ok(ui.document.activeElement.isConnected);const form=ui.root.querySelector('#journal-search');form.querySelector('input').value='needle oldest';await ui.fire('submit',form);assert.match(ui.root.querySelector('#journal-life-results').textContent,/1–1 of 1 matching \/ 257 saved/);assert.ok(ui.root.innerHTML.includes('<h3>Retained life 0</h3>'));assert.equal(ui.document.activeElement.id,'journal-query');assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
});
test('UI a stale edit form cannot affect another slot, even when its seed and active person are identical',async t=>{
 const s=E.keepPlayerNote(fresh(),'first slot note'),second=structuredClone(s);second.playerNotes[0].text='second slot note';const ui=await open(t,s,second);await ui.click('personal-note-edit',noteKey(ui.current(),'note-1'));const stale=ui.root.querySelector('#personal-note-edit-form');stale.querySelector('textarea').value='stale overwrite';await ui.key('Escape');await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load','1');await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');const before=ui.current(),slots=ui.lives();await ui.fire('submit',stale);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);assert.equal(ui.current().playerNotes[0].text,'second slot note');
});
