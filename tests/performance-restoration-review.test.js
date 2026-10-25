import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {serviceWalkPath,serviceAccessReason,settlementServices} from '../dist/js/world-services.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
function fresh(){return structuredClone(base);}
function interest(s=fresh(),id='music'){s=E.chooseAction(s,'pastime_interest');return E.chooseEventOption(s,id);}
function inn(s){for(const room of serviceWalkPath(s,'tavern'))s=E.chooseAction(s,'atlas_room_'+room);return s;}
function unchanged(s){const n=E.chooseAction(s,'pastime_performance');assert.equal(n.day,s.day);assert.equal(n.hero.gold,s.hero.gold);assert.deepEqual(n.pastimes,s.pastimes);assert.deepEqual(n.event,s.event);}
test('performance eligibility requires adult age and an eligible chosen interest',()=>{
 unchanged(inn(fresh()));unchanged(inn(interest(fresh(),'gardening')));
 let s=inn(interest());s.age=17;unchanged(s);
 for(const id of ['music','storytelling','sketching']){s=inn(interest(fresh(),id));assert.ok(E.getActions(s).some(a=>a.id==='pastime_performance'&&!a.disabledReason));}
});
test('public engine blocks performance away from the actual inn and outside provider reach',()=>{
 const s=interest();assert.ok(serviceAccessReason(s,'pastime_performance'));unchanged(s);
 const offsite=inn(interest());offsite.cartography.offsite=true;unchanged(offsite);
 const destroyed=inn(interest());destroyed.world.locations.find(p=>p.id===destroyed.locationId).status='destroyed';unchanged(destroyed);
 assert.ok(serviceAccessReason(inn(interest()),'pastime_performance',[]));
});
test('all three performance choices retain two days and identical preexisting mechanical rewards',()=>{
 const original=inn(interest());for(const choice of ['invite','finish','stop']){
 const s=E.chooseAction(original,'pastime_performance'),n=E.chooseEventOption(s,choice);
 assert.equal(n.day,s.day+2);assert.equal(n.hero.gold,s.hero.gold);assert.equal(n.hero.skills.persuasion,s.hero.skills.persuasion+1);
 assert.equal(n.life.happiness,Math.min(100,s.life.happiness+5));assert.equal(n.life.stress,Math.max(0,s.life.stress-1));assert.ok(n.pastimes.facts.includes('performance:'+choice));assert.ok(E.validateSave(n));
 const replay=E.chooseEventOption(n,choice);assert.equal(replay.day,n.day);assert.equal(replay.hero.skills.persuasion,n.hero.skills.persuasion);assert.deepEqual(replay.pastimes,n.pastimes);
 }
});
test('two performances consume the existing annual allowance without replay farming',()=>{
 let s=inn(interest());for(let i=0;i<2;i++){s=E.chooseAction(s,'pastime_performance');assert.equal(s.event.id,'pastime_scene');s=E.chooseEventOption(s,'finish');}
 assert.equal(s.pastimes.uses[s.age+':performance'],2);assert.match(E.getActions(s).find(a=>a.id==='pastime_performance').disabledReason,/other afternoons/);unchanged(s);
});
test('old generic pending snapshots migrate exactly and still finish the same commitment',()=>{
 let s=E.chooseAction(inn(interest()),'pastime_performance');s.event.title='An Afternoon of Your Own';s.event.body='You have an audience. Decide how to continue the performance.';for(const c of s.event.choices)c.description='Choose this action.';
 assert.ok(E.validateSave(s));const n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(n.event,s.event);assert.deepEqual(n.pastimes,s.pastimes);
 const done=E.chooseEventOption(n,'finish');assert.equal(done.day,n.day+2);assert.ok(E.validateSave(done));
});
test('unavailable or dead personal contacts are never named as an actual performance witness',()=>{
 let s=inn(interest());const names=s.life.people.map(p=>p.name);for(const p of s.life.people){p.alive=false;p.locationId='not-here';}
 s=E.chooseAction(s,'pastime_performance');assert.equal(s.pastimes.pending.actorIds.length,0);for(const name of names)assert.ok(!s.event.body.includes(name));assert.match(s.event.body,/listener|traveler/);
});
test('innkeeper performance wording includes artwork and keeps personal Talk separate',async t=>{
 const s=interest(fresh(),'sketching'),ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','fun');
 const host=settlementServices(ui.current()).find(r=>r.kind==='inn');await ui.click('activity-visit',host.id);
 assert.match(ui.root.innerHTML,/music, story or artwork/);assert.ok(ui.root.querySelector('[data-op="activity"][data-id="pastime_performance"]'));assert.ok(ui.root.querySelector('[data-op="spatial-contact"][data-id="'+host.personId+'"]'));
});

test('performance is available with no gold and never charges a booking fee',()=>{
 let s=inn(interest());s.hero.gold=0;assert.ok(E.getActions(s).some(a=>a.id==='pastime_performance'&&!a.disabledReason));s=E.chooseAction(s,'pastime_performance');assert.equal(s.event.id,'pastime_scene');const n=E.chooseEventOption(s,'finish');assert.equal(n.hero.gold,0);assert.equal(n.day,s.day+2);
});
test('both authored performance variants retain the situation their choices refer to',()=>{
 const original=inn(interest()),seen=new Set();for(let i=0;i<12&&seen.size<2;i++){const fixture=structuredClone(original);fixture.seed='performance-variant-review-'+i;
 // Rebuild seed-derived service succession metadata for this controlled unit fixture.
 delete fixture.npcContinuity;const prepared=E.migrateSave(fixture);assert.ok(prepared,'variant fixture is valid before admission');const s=E.chooseAction(prepared,'pastime_performance');const id=s.pastimes.pending.sceneId;seen.add(id);if(id==='performance_0'){assert.equal(s.event.title,'A voice from the back row');assert.match(s.event.body,/calls out a correction/);assert.match(s.event.body,/old version by heart/);}else{assert.equal(id,'performance_1');assert.equal(s.event.title,'An audience of one');assert.match(s.event.body,/Rain has emptied/);assert.match(s.event.body,/One traveler/);}const n=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(n.event,s.event);}
 assert.equal(seen.size,2);
});
