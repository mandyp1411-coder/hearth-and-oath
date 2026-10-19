import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { syncCartography } from '../dist/js/cartography.js';
import { settlementServices,serviceWalkPath } from '../dist/js/world-services.js';
import { startRepertoireRehearsal } from '../dist/js/repertoire.js';
import { repertoireJournalRows } from '../dist/js/repertoire-gameplay.js';
import { mountApp } from './helpers/ui-surface.mjs';

// This suite is prepared for the engine/semantic lane, not part of the fast leaf
// check. Initial branch placement is a controlled fixture projection, not a
// claim of earned travel. The full circuit below then uses real road commands.
let base;
function fresh() {
  base ||= E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
  const s=structuredClone(base);s.locationId='home';s.cartography.interior={siteId:'home',roomId:'gate'};syncCartography(s);
  const result=E.migrateSave(s);assert.ok(result);assert.ok(E.validateSave(result));return result;
}
function valid(s) {assert.ok(E.validateSave(s),'whole-save validation: '+s.notice);return s;}
function action(s,id) {
  const a=E.getActions(s).find(a=>a.id===id);assert.ok(a,'offered '+id);assert.equal(a.disabledReason,undefined,a.disabledReason);
  const before=structuredClone(s),next=E.chooseAction(s,id);assert.deepEqual(s,before,'public command preserves its input');return valid(next);
}
function roundtrip(s) {
  valid(s);const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(next);assert.deepEqual(next.repertoire,s.repertoire);assert.deepEqual(next.event,s.event);return valid(next);
}
function inn(s) {
  for(const room of serviceWalkPath(s,'tavern')||[])s=action(s,'atlas_room_'+room);
  const host=settlementServices(s).find(r=>r.kind==='inn'&&r.here);assert.ok(host);return valid(E.visitService(s,host.id));
}
const pieceId=s=>s.repertoire.pieces[0].id;
const resources=s=>({day:s.day,gold:s.hero.gold,skills:s.hero.skills,profession:s.hero.profession,careers:s.careers,pastimes:s.pastimes,joy:s.life.happiness});
function prepared() {let s=inn(fresh());s=action(s,'repertoire_create_open-chair');s=action(s,'repertoire_accept');return action(s,`repertoire_rehearse_${pieceId(s)}_solo`);}
function performed() {let s=prepared();return action(s,`repertoire_perform_${pieceId(s)}_solo_once`);}
function nextDay(s) {return action(s,`repertoire_rehearse_${pieceId(s)}_solo`);}
function settle(s) {
  for(let i=0;i<100;i++) {
    if(s.event){const preferred=['avoid','pay','detour','continue','later','keep','wait','care','support','listen','leave','animal'];const c=preferred.map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason&&!/fight|attack|predation/.test(c.id));assert.ok(c,'safe existing event choice');s=valid(E.chooseEventOption(s,c.id));}
    else if(s.conversations?.pending)s=valid(E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies.at(-1).id));
    else if(s.timeline?.yearTarget!=null)s=valid(E.continueAgeUp(s));
    else return s;
  }throw Error('A saved calendar decision did not settle.');
}
function road(s,id) {
  s=valid(E.travelTo(s,id));
  for(let i=0;i<400;i++) {
    s=settle(s);assert.equal(s.battle,null,'the civilian circuit does not require a forced battle');
    if(!s.timeline?.journey){assert.equal(s.locationId,id,s.notice);return inn(s);}
    const rest=E.getActions(s).find(a=>a.id==='trail_camp'&&!a.disabledReason);
    if(s.hero.mp<s.hero.maxMp/2&&rest)s=action(s,'trail_camp');else s=valid(E.continueJourney(s));
  }throw Error('The actual road journey did not reach its destination.');
}

test('actual engine commands lazily create private manuscripts without changing existing Bard/civilian terms or resources',()=>{
  let s=inn(fresh());assert.equal(s.repertoire,undefined);const before=structuredClone(resources(s)),old=structuredClone(s);E.getActions(s);assert.deepEqual(s,old);
  s=action(s,'repertoire_create_open-chair');assert.deepEqual(resources(s),before);assert.equal(s.repertoire.pieces[0].privacy,'private');assert.deepEqual(repertoireJournalRows(s),[]);roundtrip(s);
});
test('actual two-day recital preserves exact source, credits, listener, permission and literal edition-30 Journal evidence',()=>{
  const s=prepared(),before=structuredClone(resources(s)),next=action(s,`repertoire_perform_${pieceId(s)}_solo_once`),receipt=next.repertoire.performances[0];
  assert.equal(next.day,s.day+2);assert.deepEqual(next.hero.skills,before.skills);assert.deepEqual(next.careers,before.careers);assert.deepEqual(next.pastimes,before.pastimes);assert.equal(next.repertoire.pieces[0].privacy,'private');
  const note=next.journal.at(-1);assert.equal(note.narrativeEdition,30);assert.ok(note.text.includes(receipt.listener.name));assert.ok(note.text.includes(receipt.piece.verse));assert.ok(note.text.includes(receipt.piece.credits[0].name));assert.ok(repertoireJournalRows(next)[0].text.includes(receipt.piece.verse));roundtrip(next);
});
test('an imported unfinished rehearsal is exclusive, resumable once, and uses no career or skill reward',()=>{
  let s=inn(fresh());s=action(s,'repertoire_create_two-banks');assert.equal(startRepertoireRehearsal(s,pieceId(s),'refrain').ok,true);roundtrip(s);
  const offers=E.getActions(s);assert.ok(offers.some(a=>a.id==='repertoire_continue'));assert.ok(offers.every(a=>a.id.startsWith('repertoire_')));assert.equal(E.getLifeCommitment(s).kind,'repertoire');assert.equal(E.getLifeCommitment(s).remainingDays,1);
  const before=structuredClone(resources(s)),next=action(s,'repertoire_continue');assert.equal(next.day,s.day+1);assert.deepEqual(next.hero.skills,before.skills);assert.deepEqual(next.careers,before.careers);assert.equal(next.repertoire.pieces[0].rehearsal.attendedDays,1);
  const repeated=E.chooseAction(next,'repertoire_continue');assert.deepEqual(repeated.repertoire,next.repertoire);assert.equal(repeated.day,next.day);roundtrip(next);
});
test('a birthday pauses a genuine recital, preserving its frozen terms without a duplicate settlement on reload',()=>{
  let s=prepared();s.day=(s.timeline.birthDay||0)+(s.age+1)*365-1;
  const before=structuredClone(s.repertoire.pieces[0]);s=action(s,`repertoire_perform_${pieceId(s)}_solo_once`);assert.equal(s.repertoire.project.completedDays,1);assert.equal(s.repertoire.project.remainingDays,1);assert.equal(s.repertoire.performances.length,0);assert.ok(s.event);assert.equal(s.repertoire.project.piece.verse,before.verse);s=roundtrip(s);
  s=settle(s);const day=s.day;s=action(s,'repertoire_continue');assert.equal(s.day,day+1);assert.equal(s.repertoire.performances.length,1);roundtrip(s);
});
test('the three fixed stops finish through actual ordinary road commands, with no class requirement or extra completion reward',()=>{
  let s=performed();const id=pieceId(s),first=s.repertoire.performances[0];s=road(s,'brook');s=action(s,`repertoire_rehearse_${id}_refrain`);s=action(s,`repertoire_perform_${id}_refrain_once`);s=road(s,'city');s=action(s,`repertoire_perform_${id}_refrain_once`);
  assert.deepEqual(s.repertoire.circuit.targets.map(p=>p.locationId),['home','brook','city']);assert.equal(s.repertoire.performances.length,3);assert.equal(s.repertoire.circuit.completedDay,s.day);assert.deepEqual(s.repertoire.performances[0],first);assert.ok(s.repertoire.performances[1].priorPerformanceId);assert.ok(!E.getActions(s).some(a=>a.id.startsWith('repertoire_perform_')));roundtrip(s);
});
test('ordinary Talk remains ordinary; only explicit Talk about the piece opens its frozen no-reward recollection',()=>{
  let s=nextDay(performed()),id=pieceId(s),heard=structuredClone(s.repertoire.performances[0]),host=heard.listener.id;
  assert.ok(E.getActions(s).some(a=>a.id==='talk_'+host));s=action(s,'talk_'+host);assert.notEqual(s.conversations.pending?.nodeId,'repertoire_recall');assert.equal(s.repertoire.recall.acknowledgedDay,null);s=valid(E.replyMessage(s,host,s.conversations.pending.replies.at(-1).id));
  s=action(s,`repertoire_revise_${id}_quiet`);s=action(s,`repertoire_delete_${id}`);s=action(s,'repertoire_recall_'+host);assert.equal(s.event.id,'repertoire_recall');assert.ok(s.event.body.includes(heard.piece.verse.split('\n').at(-1)));assert.ok(s.event.body.includes(heard.piece.title));s=roundtrip(s);
  const before=structuredClone(resources(s)),next=valid(E.chooseEventOption(s,'ending'));assert.deepEqual(resources(next),before);assert.equal(next.repertoire.pending,null);assert.equal(next.repertoire.recall.choiceId,'ending');assert.deepEqual(next.repertoire.performances[0],heard);assert.ok(!E.getActions(next).some(a=>a.id==='repertoire_recall_'+host));roundtrip(next);
});
test('existing authored pastime performance still captures and resolves its original two-day choices unchanged',()=>{
  let s=inn(fresh());s=action(s,'pastime_interest');s=valid(E.chooseEventOption(s,'music'));s=action(s,'pastime_performance');const captured=structuredClone({event:s.event,pending:s.pastimes.pending});s=roundtrip(s);assert.deepEqual({event:s.event,pending:s.pastimes.pending},captured);assert.deepEqual(s.event.choices.map(c=>c.id),['invite','finish','stop']);assert.ok(!E.getActions(s).some(a=>a.id.startsWith('repertoire_')));
  const before=s.day,skill=s.hero.skills.persuasion;s=valid(E.chooseEventOption(s,'finish'));assert.equal(s.day,before+2);assert.equal(s.hero.skills.persuasion,skill+1);assert.equal(s.repertoire,undefined);roundtrip(s);
});
test('actual app handlers expose the separate inn book, original performance and explicit remembered-piece choice',async t=>{
  const ui=await mountApp(t,{states:[inn(fresh())]});await ui.click('title-continue');await ui.click('place-open');let host=settlementServices(ui.current()).find(r=>r.kind==='inn'&&r.here);await ui.click('service-open',host.id);
  assert.ok(ui.root.querySelector('[data-op="service-topic"][data-id="repertoire"]'));assert.ok(ui.root.querySelector('[data-op="spatial-contact"][data-id="'+host.personId+'"]'));
  await ui.click('service-topic','repertoire');assert.ok(ui.root.querySelector('.repertoire-book'));await ui.click('activity','repertoire_create_open-chair');const id=pieceId(ui.current());await ui.click('activity','repertoire_accept');await ui.click('activity',`repertoire_rehearse_${id}_solo`);await ui.click('activity',`repertoire_perform_${id}_solo_once`);roundtrip(ui.current());
  await ui.click('activity',`repertoire_rehearse_${id}_solo`);assert.ok(ui.root.querySelector('[data-op="activity"][data-id="repertoire_recall_'+host.personId+'"]'));await ui.click('activity','repertoire_recall_'+host.personId);const pending=structuredClone(ui.current().event);await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current().event,pending);await ui.click('choice','leave');assert.equal(ui.current().repertoire.recall.choiceId,'leave');roundtrip(ui.current());
  await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.ok(ui.root.querySelector('.repertoire-book'));
  await ui.click('place-open');await ui.click('place-area','homes');assert.ok(ui.root.querySelector('.repertoire-book'),'Home contains the same private manuscript book');
});
