import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices,serviceWalkPath} from '../dist/js/world-services.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
function fresh(){const s=structuredClone(base);assert.equal(s.pastimes.activeInterestId,null);assert.equal(s.event,null);return s;}
function roundtrip(s){assert.ok(E.validateSave(s),'valid save');const n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(n.event,s.event);assert.deepEqual(n.pastimes,s.pastimes);return n;}
function atInn(s){for(const room of serviceWalkPath(s,'tavern'))s=E.chooseAction(s,'atlas_room_'+room);return s;}
function music(s=fresh()){s=E.chooseAction(s,'pastime_interest');assert.equal(s.event.id,'pastime_interest');return E.chooseEventOption(s,'music');}
function settle(s){for(let i=0;i<100;i++){if(s.event){const c=s.event.choices.find(c=>!c.disabledReason&&['care','continue','later','keep','wait','support'].includes(c.id))||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}else if(s.conversations?.pending)s=E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies[0].id);else if(s.timeline?.yearTarget!=null)s=E.continueAgeUp(s);else return s;}throw Error('unsettled');}
test('actual UI handlers: choose first music interest, visit named innkeeper, save pending performance and finish',async t=>{
 const ui=await mountApp(t, {rulebooks:'both', states:[fresh()]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','fun');
 await ui.click('activity','pastime_interest');await ui.click('choice','music');assert.equal(ui.current().pastimes.activeInterestId,'music');
 await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.ok(ui.root.querySelector('[data-op="activity"][data-id="pastime_practice"]'));
 const inn=settlementServices(ui.current()).find(r=>r.kind==='inn');await ui.click('activity-visit',inn.id);assert.ok(ui.root.querySelector('[data-service-person="'+inn.personId+'"]'));
 assert.ok(ui.root.querySelector('[data-op="spatial-contact"][data-id="'+inn.personId+'"]'));await ui.click('activity','pastime_performance');
 const pending=roundtrip(ui.current());assert.match(pending.event.body,/old version|traveler/);assert.equal(pending.pastimes.pending.actionId,'performance');
 await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current().event,pending.event);
 const day=ui.current().day,skill=ui.current().hero.skills.persuasion;await ui.click('choice','finish');assert.equal(ui.current().day,day+2);assert.equal(ui.current().hero.skills.persuasion,skill+1);assert.equal(ui.current().pastimes.project,null);roundtrip(ui.current());
});
test('birthday pauses a two-day performance; Social & Fun exposes saved remaining-day continuation',async t=>{
 let s=atInn(music());s.day=s.timeline.birthDay+(s.age+1)*365-1;s=E.chooseAction(s,'pastime_performance');const day=s.day,skill=s.hero.skills.persuasion;
 s=E.chooseEventOption(s,'finish');assert.equal(s.day,day+1);assert.equal(s.pastimes.project.remainingDays,1);assert.equal(s.hero.skills.persuasion,skill);assert.ok(s.event);
 s=roundtrip(settle(roundtrip(s)));const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','fun');
 const before=ui.current();await ui.click('activity','pastime_continue');assert.equal(ui.current().day,before.day+1);assert.equal(ui.current().hero.skills.persuasion,before.hero.skills.persuasion+1);assert.equal(ui.current().pastimes.project,null);roundtrip(ui.current());
});
