import test from 'node:test';
import assert from 'node:assert/strict';
import { repertoireActions,applyRepertoireAction,applyRepertoireChoice,repertoireJournalRows } from '../dist/js/repertoire-gameplay.js';
import { validateRepertoire } from '../dist/js/repertoire.js';
import { settlementServices } from '../dist/js/world-services.js';
import { initializeNpcContinuity,observeNpcContinuity } from '../dist/js/npc-continuity.js';

// Dependency-light adapter units with a fake clock, not actual engine/calendar,
// browser, whole-save, travel or app-handler evidence.
function fixture() {
  const s={revision:5,seed:'repertoire-adapter-unit',age:24,day:9000,phase:'adult',locationId:'home',hero:{name:'Aren',gold:100,skills:{persuasion:8}},life:{people:[],children:[],happiness:50,home:{tier:'lodgings'}},conversations:{pending:null,relationships:{}},timeline:{birthDay:240},cartography:{interior:{siteId:'home',roomId:'tavern'}},world:{locations:[{id:'home',name:'Hearthmere',type:'village'},{id:'brook',name:'Reedcross',type:'village'},{id:'city',name:'Alderwatch',type:'city'}],roads:[{from:'home',to:'brook'},{from:'brook',to:'city'}]}};
  s.realm={sites:{home:{},brook:{},city:{}},regions:[]};
  initializeNpcContinuity(s);observeNpcContinuity(s,['home','brook','city'].flatMap(siteId=>settlementServices(s,{siteId}).filter(r=>r.kind==='inn').map(r=>r.person)));return s;
}
function context(s) {return {spendDays(n){s.day+=n;return n;},journalLiteral(title,text,tag,meta){(s.records||=[]).push({title,text,tag,...meta});},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},contacts(){return settlementServices(s).filter(r=>r.kind==='inn').map(r=>({...r.person,roomId:r.roomId}));}};}
function apply(s,id) {const a=repertoireActions(s).find(a=>a.id===id);assert.ok(a,id);assert.equal(a.disabledReason,undefined,a.disabledReason);assert.equal(applyRepertoireAction(s,id,context(s)),true);assert.equal(validateRepertoire(s.repertoire,s),true);}
test('adapter action IDs actually route create, permission, revision, rehearsal, recital and deletion without new wages or skills',()=>{
  const s=fixture(),initial=structuredClone(s);assert.equal(Object.hasOwn(s,'repertoire'),false);repertoireActions(s);assert.deepEqual(s,initial);
  apply(s,'repertoire_create_open-chair');const id=s.repertoire.pieces[0].id;assert.equal(s.day,initial.day);assert.equal(s.records.at(-1).narrativeEdition,30);assert.deepEqual(repertoireJournalRows(s),[]);
  apply(s,`repertoire_privacy_${id}_public`);apply(s,`repertoire_revise_${id}_quiet`);assert.equal(s.repertoire.pieces[0].privacy,'private');apply(s,'repertoire_accept');apply(s,`repertoire_rehearse_${id}_solo`);assert.equal(s.day,initial.day+1);
  apply(s,`repertoire_perform_${id}_solo_once`);assert.equal(s.day,initial.day+3);assert.equal(s.repertoire.performances.length,1);assert.equal(s.repertoire.pieces[0].privacy,'private');assert.deepEqual(s.hero,initial.hero);assert.equal(s.records.at(-1).narrativeEdition,30);assert.ok(s.records.at(-1).text.includes(s.repertoire.performances[0].piece.verse));assert.equal(repertoireJournalRows(s).length,1);
  apply(s,`repertoire_delete_${id}`);assert.equal(s.repertoire.pieces.length,0);assert.equal(s.repertoire.performances.length,1);
});
test('adapter explicit recall captures, validates and consumes only a real heard host receipt with no added resources',()=>{
  const s=fixture();apply(s,'repertoire_create_open-chair');const id=s.repertoire.pieces[0].id;apply(s,'repertoire_accept');apply(s,`repertoire_perform_${id}_solo_once`);apply(s,`repertoire_rehearse_${id}_solo`);
  const heard=structuredClone(s.repertoire.performances[0]),recall=repertoireActions(s).find(a=>a.id.startsWith('repertoire_recall_'));assert.ok(recall);apply(s,recall.id);const pending=structuredClone(s.repertoire.pending);assert.equal(s.event.id,'repertoire_recall');assert.equal(s.repertoire.recall.acknowledgedDay,null);assert.equal(pending.snapshot.piece.verse,heard.piece.verse);
  const resources=structuredClone({day:s.day,hero:s.hero,joy:s.life.happiness});s.event=null;assert.equal(applyRepertoireChoice(s,'repertoire_recall','ending',context(s)),true);assert.deepEqual({day:s.day,hero:s.hero,joy:s.life.happiness},resources);assert.equal(s.repertoire.pending,null);assert.equal(s.repertoire.recall.choiceId,'ending');assert.deepEqual(s.repertoire.performances[0],heard);assert.equal(validateRepertoire(s.repertoire,s),true);assert.ok(!repertoireActions(s).some(a=>a.id===recall.id));
});
test('adapter acceptance refuses missing or closed fixed venues before creating any save metadata',()=>{
  const s=fixture();s.world.locations.find(p=>p.id==='brook').status='destroyed';const before=structuredClone(s),offer=repertoireActions(s).find(a=>a.id==='repertoire_accept');assert.match(offer.disabledReason,/not operating/);assert.equal(applyRepertoireAction(s,'repertoire_accept',context(s)),false);assert.deepEqual(s,before);
});
