import test from 'node:test';
import assert from 'node:assert/strict';
import { appendPersonalNote, copyPersonalNote, personalNoteRows, reviewPersonalNote, editPersonalNote, archivePersonalNote, validPersonalNotes } from '../dist/js/personal-notes.js';
import { genericMazeInscriptionNote, recordGenericMazeInscription } from '../dist/js/maze-inscription-note.js';
const fresh=()=>({day:42,notice:'An earlier result',hero:{name:'Reader',hp:30,mp:8,skills:{scholarship:7}},companions:[{id:'orrin',mp:17}],flags:{herbs:2},dynasty:{activePersonId:'actual-reader',generation:1,history:[]},journal:[],maze:{cleared:[0,1],fieldAssists:{version:1,entries:[{kind:'scholar',focusCost:3}]}}});
const room={id:2,kind:'inscription',variant:2};
const key=(s,id)=>personalNoteRows(s).find(n=>n.id===id&&n.own)?.key;
const journal=s=>({journalLiteral:(title,text,tag,meta)=>s.journal.push({title,text,tag,day:s.day,...meta}),journal:()=>assert.fail('literal earned proof must be preferred')});

test('a failed full-book copy preserves every existing note, property, order, raw metadata and outstanding review',()=>{
 const s=fresh();s.playerNotes=Array.from({length:100},(_,i)=>({day:1,text:'same-day '+i}));const before=structuredClone(s),reviews=personalNoteRows(s).map(n=>reviewPersonalNote(s,n.key));
 const copied=copyPersonalNote(s,'a new discovery');assert.deepEqual(copied,{copied:false,reason:'full'});assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'legacyPlayerNotes'),false);assert.deepEqual(personalNoteRows(s).map(n=>reviewPersonalNote(s,n.key)),reviews);
});
test('an available personal copy uses the ordinary stable-ID/owner path without touching existing reminders or their reviews',()=>{
 const s=fresh();s.playerNotes=[{day:1,text:'exact old\n\nélan <&>'},{day:1,text:'exact old\n\nélan <&>'}];const before=structuredClone(s),review=reviewPersonalNote(s,key(s,'legacy-note-2'));
 const result=copyPersonalNote(s,'current discovery');assert.equal(result.copied,true);assert.equal(result.id,'note-1');assert.equal(s.playerNotes[2].ownerId,'actual-reader');assert.equal(s.playerNotes[2].generation,1);assert.deepEqual(s.playerNotes.slice(0,2),before.playerNotes);assert.deepEqual(reviewPersonalNote(s,review.key),review);assert.deepEqual(s.journal,before.journal);assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.companions,before.companions);assert.deepEqual(s.maze,before.maze);assert.equal(s.notice,before.notice);assert.equal(validPersonalNotes(s),true);
});
test('all six immutable earned inscription proofs survive a full owned book without lost notes or altered costs/receipts',()=>{
 for(let variant=0;variant<6;variant++){
  let s=fresh();for(let n=0;n<100;n++)s=appendPersonalNote(s,'original owned '+n);const before=structuredClone(s),source=genericMazeInscriptionNote({...room,variant}),result=recordGenericMazeInscription(s,{...room,variant},journal(s));
  assert.equal(result.notebookCopy.copied,false);assert.equal(result.notebookCopy.reason,'full');assert.match(result.notebookCopyNotice,/full.*No note was replaced.*Journal Archive/);assert.deepEqual(s.playerNotes,before.playerNotes);assert.equal(s.journal.length,1);assert.deepEqual(s.journal[0],{title:'A Note from Below',text:source.text,tag:'exploration',day:42,narrativeEdition:30});
  for(const field of Object.keys(before).filter(k=>k!=='journal'))assert.deepEqual(s[field],before[field],field+' stays exact');
 }
});
test('editing, archiving or restoring the optional notebook copy cannot change its earned Journal proof',()=>{
 let s=fresh();const result=recordGenericMazeInscription(s,room,journal(s)),earned=structuredClone(s.journal);assert.equal(result.notebookCopy.copied,true);assert.match(result.notebookCopyNotice,/editable copy.*Journal Archive/);
 s=editPersonalNote(s,reviewPersonalNote(s,result.notebookCopy.key),'my own annotation');assert.deepEqual(s.journal,earned);s=archivePersonalNote(s,reviewPersonalNote(s,result.notebookCopy.key),true);assert.deepEqual(s.journal,earned);s=archivePersonalNote(s,reviewPersonalNote(s,result.notebookCopy.key),false);assert.deepEqual(s.journal,earned);assert.equal(s.playerNotes[0].day,42);
});
test('missing ownership or invalid text never initializes note storage, while discovery proof remains independent',()=>{
 const s=fresh();delete s.dynasty;const before=structuredClone(s);assert.deepEqual(copyPersonalNote(s,'copy'),{copied:false,reason:'owner_unavailable'});assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'playerNotes'),false);
 const result=recordGenericMazeInscription(s,room,journal(s));assert.equal(result.notebookCopy.reason,'owner_unavailable');assert.equal(Object.hasOwn(s,'playerNotes'),false);assert.equal(s.journal.length,1);assert.match(result.notebookCopyNotice,/Existing notes are unchanged.*Journal Archive/);
 const valid=fresh(),snapshot=structuredClone(valid);for(const value of ['',null,' '.repeat(5),'x'.repeat(2001)]){assert.equal(copyPersonalNote(valid,value).copied,false);assert.deepEqual(valid,snapshot);}
});
test('old raw inscription-looking copies are never retroactively classified or claimed by an heir',()=>{
 const s=fresh();s.dynasty.generation=2;const note=genericMazeInscriptionNote(room);s.playerNotes=[{day:1,text:note.title+': '+note.text}];const old=structuredClone(s.playerNotes),oldKey=personalNoteRows(s)[0].key;
 assert.equal(personalNoteRows(s)[0].own,false);const result=recordGenericMazeInscription(s,room,journal(s));assert.equal(result.notebookCopy.copied,true);assert.deepEqual(s.legacyPlayerNotes,old);assert.equal(Object.hasOwn(s.legacyPlayerNotes[0],'ownerId'),false);assert.equal(personalNoteRows(s).find(n=>n.key===oldKey).own,false);assert.equal(s.playerNotes.length,1);assert.equal(s.playerNotes[0].ownerId,'actual-reader');assert.equal(s.playerNotes[0].generation,2);assert.equal(validPersonalNotes(s),true);
});
test('authored slots and invalid generic variants record and copy nothing',()=>{
 for(const invalid of [{...room,contentSlot:'authored-evidence'},{...room,kind:'objective'},{...room,variant:-1},{...room,variant:6},null]){const s=fresh(),before=structuredClone(s);assert.equal(recordGenericMazeInscription(s,invalid,journal(s)),false);assert.deepEqual(s,before);}
});
