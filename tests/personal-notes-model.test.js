import test from 'node:test';
import assert from 'node:assert/strict';
import { appendPersonalNote, personalNoteRows, reviewPersonalNote as rawReview, editPersonalNote, archivePersonalNote, closedLifePersonalNotes, validPersonalNotes } from '../dist/js/personal-notes.js';
import { journalPage } from '../dist/js/journal-pagination.js';
import { renderPersonalNotes, renderPersonalNoteReview } from '../dist/js/personal-notes-ui.js';
import { formatPlaceMarkup } from '../dist/js/presentation-names.js';
const fresh = () => ({ seed:'notes-test', day:42, hero:{name:'Keeper'}, dynasty:{activePersonId:'actual-person-not-derived-from-id',generation:1,history:[]}, lineage:{people:[]}, notice:'', journal:[{day:1,text:'earned event'}], lore:{records:[{text:'learned lore'}]} });
const reviewPersonalNote=(s,id)=>rawReview(s,personalNoteRows(s).find(n=>n.id===id&&n.own)?.key||id);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui={e,paragraphs:text=>'<p>'+e(text)+'</p>',date:n=>'Day '+n,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${e(op)}" data-id="${e(id)}" ${disabled?'disabled':''}>${label}</button>`};

test('new notes carry actual ownership and stable IDs even for identical date and text',()=>{
 const s=fresh(),before=structuredClone(s),one=appendPersonalNote(s,'Same'),two=appendPersonalNote(one,'Same');
 assert.deepEqual(s,before);assert.equal(validPersonalNotes(two),true);assert.notEqual(two.playerNotes[0].id,two.playerNotes[1].id);
 assert.equal(two.playerNotes[0].ownerId,s.dynasty.activePersonId);assert.equal(two.playerNotes[0].generation,1);assert.deepEqual(two.journal,s.journal);assert.deepEqual(two.lore,s.lore);
});
test('legacy views and review derive distinct IDs without changing any old text, date, order or property',()=>{
 const s=fresh();s.playerNotes=[{day:4,text:' same\n\nŻółw <&> '},{day:4,text:' same\n\nŻółw <&> '}];const before=structuredClone(s);
 const rows=personalNoteRows(s);assert.equal(rows[0].id,'legacy-note-1');assert.equal(rows[1].id,'legacy-note-2');assert.ok(rows.every(n=>n.own));assert.ok(reviewPersonalNote(s,rows[1].id));assert.deepEqual(s,before);
 const next=editPersonalNote(s,reviewPersonalNote(s,rows[1].id),' second\n\nÉlan ');assert.equal(next.playerNotes[1].text,' second\n\nÉlan ');assert.equal(next.playerNotes[1].day,4);assert.deepEqual(next.playerNotes[0],before.playerNotes[0]);assert.equal(validPersonalNotes(next),true);
});
test('edit stale fingerprint rejects changed text, date, ownership or revision and replay cannot overwrite',()=>{
 let s=appendPersonalNote(fresh(),'first');const r=reviewPersonalNote(s,'note-1'),old=structuredClone(s);s=editPersonalNote(s,r,'second');
 assert.equal(s.playerNotes[0].day,42);assert.deepEqual(old.playerNotes[0].text,'first');assert.equal(s.playerNotes[0].noteVersion,1);
 const replay=editPersonalNote(s,r,'third');assert.deepEqual(replay.playerNotes,s.playerNotes);assert.match(replay.notice,/Nothing was overwritten/);
 for(const key of ['text','day','ownerId','noteVersion']){const changed=structuredClone(old);changed.playerNotes[0][key]=key==='text'?'changed':key==='day'?41:key==='ownerId'?'not-the-owner':7;const result=editPersonalNote(changed,r,'overwrite');assert.deepEqual(result.playerNotes,changed.playerNotes);}
});
test('archiving and restoring retain the same ID, original date and exact text, never free a deletion slot',()=>{
 const s=appendPersonalNote(fresh(),'  kept\n\n<not markup>  '),r=reviewPersonalNote(s,'note-1'),a=archivePersonalNote(s,r,true);
 assert.equal(a.playerNotes.length,1);assert.equal(a.playerNotes[0].archived,true);assert.equal(a.playerNotes[0].text,s.playerNotes[0].text);assert.equal(a.playerNotes[0].day,s.playerNotes[0].day);
 assert.deepEqual(archivePersonalNote(a,r,false).playerNotes,a.playerNotes);assert.deepEqual(editPersonalNote(a,reviewPersonalNote(a,'note-1'),'not allowed').playerNotes,a.playerNotes);
 const restored=archivePersonalNote(a,reviewPersonalNote(a,'note-1'),false);assert.equal(restored.playerNotes[0].id,'note-1');assert.equal(restored.playerNotes[0].archived,false);assert.equal(restored.playerNotes[0].text,s.playerNotes[0].text);assert.equal(validPersonalNotes(restored),true);
});
test('closed lives retain attribution in bounded owner history without filling the heir notebook',()=>{
 let s=appendPersonalNote(fresh(),'by Keeper');s.playerNotes.push({day:1,text:'legacy first life'});const before=structuredClone(s),closed=closedLifePersonalNotes(s);assert.deepEqual(s,before);assert.equal(closed.personalNotes[1].ownerId,s.dynasty.activePersonId);
 let heir={...fresh(),playerNotes:[],dynasty:{activePersonId:'child-record-with-parent-generation-in-its-id',generation:2,history:[{personId:s.dynasty.activePersonId,generation:1,name:'Keeper',endedDay:42,personalNotes:closed.personalNotes}]}};
 assert.equal(validPersonalNotes(heir),true);assert.ok(personalNoteRows(heir).every(n=>!n.own&&n.ownerName==='Keeper'&&n.generation===1));assert.equal(reviewPersonalNote(heir,'note-1'),null);assert.deepEqual(editPersonalNote(heir,reviewPersonalNote(s,'note-1'),'heir rewrite').dynasty,heir.dynasty);
 heir=appendPersonalNote(heir,'by heir');assert.equal(heir.playerNotes[0].id,'note-1');assert.equal(heir.playerNotes[0].ownerId,heir.dynasty.activePersonId);assert.equal(heir.playerNotes[0].generation,2);assert.equal(validPersonalNotes(heir),true);
 const ancestor=personalNoteRows(heir).find(n=>!n.own&&n.id==='note-1'),own=personalNoteRows(heir).find(n=>n.own);assert.notEqual(ancestor.key,own.key);assert.equal(rawReview(heir,ancestor.key),null);assert.ok(rawReview(heir,own.key));
});
test('ambiguous legacy notes stay pure on read and move verbatim to one bounded legacy pool on deliberate write',()=>{
 const s=fresh();s.dynasty.generation=2;s.playerNotes=Array.from({length:100},(_,i)=>({day:42,text:'ambiguous '+i}));const before=structuredClone(s);
 assert.equal(personalNoteRows(s)[0].own,false);assert.equal(personalNoteRows(s)[0].generation,null);assert.equal(reviewPersonalNote(s,'unattributed-note-1'),null);assert.deepEqual(closedLifePersonalNotes(s).legacyPlayerNotes,s.playerNotes);assert.deepEqual(s,before);assert.equal(validPersonalNotes(s),true);
 const written=appendPersonalNote(s,'heir owns this');assert.equal(written.playerNotes.length,1);assert.deepEqual(written.legacyPlayerNotes,before.playerNotes);assert.equal(validPersonalNotes(written),true);assert.equal(personalNoteRows(written).filter(n=>!n.own).length,100);assert.equal(personalNoteRows(written).find(n=>n.id==='unattributed-note-1').text,before.playerNotes[0].text);assert.deepEqual(s,before);
 const closed=closedLifePersonalNotes(written);assert.equal(closed.personalNotes.length,1);assert.deepEqual(closed.legacyPlayerNotes,before.playerNotes);assert.equal(validPersonalNotes({...written,legacyPlayerNotes:[...written.legacyPlayerNotes,{day:1,text:'overflow'}]}),false);const forged=structuredClone(written);forged.legacyPlayerNotes[0]={...written.playerNotes[0]};assert.equal(validPersonalNotes(forged),false);
});
test('three full life notebooks retain every record and never consume the next life’s 100-note capacity',()=>{
 let s=fresh();const snapshots=[];
 for(let generation=1;generation<=3;generation++){
  for(let i=0;i<100;i++)s=appendPersonalNote(s,`generation ${generation} note ${i}`);assert.equal(s.playerNotes.length,100);assert.equal(validPersonalNotes(s),true);snapshots.push(structuredClone(s.playerNotes));
  const closed=closedLifePersonalNotes(s),history=[...s.dynasty.history,{personId:s.dynasty.activePersonId,generation,name:s.hero.name,endedDay:s.day,personalNotes:closed.personalNotes}];
  s={...s,playerNotes:[],dynasty:{activePersonId:'owner-'+(generation+1),generation:generation+1,history}};assert.equal(validPersonalNotes(s),true);s=appendPersonalNote(s,'capacity probe');assert.equal(s.playerNotes.length,1);s.playerNotes=[];
 }
 assert.deepEqual(s.dynasty.history.map(h=>h.personalNotes),snapshots);assert.equal(personalNoteRows(s).length,300);assert.ok(personalNoteRows(s).every(n=>!n.own));
 const html=renderPersonalNotes(s,ui,{scope:'family',query:'generation 1 note 0'});assert.match(html,/1–1 of 1 matching \/ 300 saved/);assert.ok(!html.includes('data-op="personal-note-edit"'));
 const invalid=structuredClone(s);invalid.dynasty.history[0].personalNotes[0].day=43;assert.equal(validPersonalNotes(invalid),false);invalid.dynasty.history[0].personalNotes[0].day=42;invalid.dynasty.history[0].personalNotes[0].ownerId='owner-2';assert.equal(validPersonalNotes(invalid),false);invalid.dynasty.history[0].personalNotes[0].ownerId=s.dynasty.history[0].personId;invalid.dynasty.history[0].personalNotes.push({...invalid.dynasty.history[0].personalNotes[0],id:'note-101'});assert.equal(validPersonalNotes(invalid),false);
});
test('validation accepts old rows, rejects partial, duplicate, oversized, nonboolean or forged ownership metadata',()=>{
 const s=appendPersonalNote(fresh(),'valid');assert.equal(validPersonalNotes(s),true);
 const modifications=[n=>delete n.ownerId,n=>n.archived='yes',n=>n.noteVersion=-1,n=>n.generation=2,n=>n.id='<script>',n=>n.ownerId='unrecorded',n=>n.text='a'.repeat(2001),n=>n.day=43];
 for(const mutate of modifications){const changed=structuredClone(s);mutate(changed.playerNotes[0]);assert.equal(validPersonalNotes(changed),false);}
 const duplicate=structuredClone(s);duplicate.playerNotes.push({...duplicate.playerNotes[0]});assert.equal(validPersonalNotes(duplicate),false);
 const collision=fresh();collision.playerNotes=[{day:1,text:'old'}, {...s.playerNotes[0],id:'legacy-note-1'}];assert.equal(validPersonalNotes(collision),false);
});
test('100-note and 2000-character bounds still include archives and invalid writes are no-ops',()=>{
 let s=fresh();for(let i=0;i<100;i++)s=appendPersonalNote(s,'note '+i);const hundred=structuredClone(s);assert.equal(validPersonalNotes(s),true);assert.equal(appendPersonalNote(s,'one too many').playerNotes.length,100);
 s=archivePersonalNote(s,reviewPersonalNote(s,'note-1'),true);assert.equal(appendPersonalNote(s,'still full').playerNotes.length,100);
 assert.deepEqual(appendPersonalNote(s,' '.repeat(5)),s);assert.deepEqual(appendPersonalNote(s,'a'.repeat(2001)),s);assert.deepEqual(editPersonalNote(s,reviewPersonalNote(s,'note-2'),''),s);assert.deepEqual(hundred.journal,s.journal);
});
test('paging reaches every retained entry beyond the former 120 cutoff and clamps transient invalid pages',()=>{
 const rows=Array.from({length:257},(_,i)=>({id:i})),all=[];for(let i=0;i<9;i++)all.push(...journalPage(rows,i).rows);assert.deepEqual(all,rows);assert.equal(journalPage(rows,999).page,8);assert.equal(journalPage(rows,-1).page,0);assert.equal(journalPage(rows,NaN).page,0);assert.equal(journalPage([],9).total,0);assert.equal(journalPage([],9).page,0);
 const matches=rows.filter(r=>r.id===0);assert.equal(journalPage(matches,8).rows[0].id,0);
});
test('personal-note rendering escapes markup and reports search, archive and ownership counts without mutations',()=>{
 let s=appendPersonalNote(fresh(),'</textarea><script>bad</script>\n\nÉlan');s=archivePersonalNote(s,reviewPersonalNote(s,'note-1'),true);const before=structuredClone(s);
 const html=renderPersonalNotes(s,ui,{query:'Élan',archived:true});assert.ok(html.includes('&lt;/textarea&gt;&lt;script&gt;bad&lt;/script&gt;'));assert.ok(!html.includes('<script>'));assert.match(html,/1–1 of 1 matching \/ 1 saved/);assert.match(html,/Archived personal notes \(1\)/);assert.match(html,/Restore note/);assert.ok(!html.includes('personal-note-edit'));
 const pending={note:personalNoteRows(s)[0],mode:'edit'},review=renderPersonalNoteReview(pending,ui);assert.ok(!review.includes('<script>'));assert.ok(review.includes('Cancel'));assert.deepEqual(s,before);
});
test('place formatting preserves textarea, input and personal-note text exactly, including Unicode, escapes and newlines',()=>{
 const state={world:{name:'old vale',locations:[{name:'lower brook'}]}},text='lower brook\n\nélan Ω &lt;tag&gt; &amp; «old vale»';
 const markup=`<h1>lower brook</h1><input value="lower brook"><textarea name="note">${text}</textarea><section data-verbatim><div><p>${text}</p></div><p>lower brook</p></section><h2>old vale</h2>`;
 const result=formatPlaceMarkup(markup,state);assert.ok(result.includes('<h1>Lower Brook</h1>'));assert.ok(result.includes('<h2>Old Vale</h2>'));assert.ok(result.includes('<input value="lower brook">'));assert.ok(result.includes(`<textarea name="note">${text}</textarea>`));assert.ok(result.includes(`<section data-verbatim><div><p>${text}</p></div><p>lower brook</p></section>`));assert.deepEqual(state.world.locations[0].name,'lower brook');
});
