import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
// Controlled calendar-boundary fixture, not a claim of a naturally played year.
// The existing genuine v30 save supplies the full world; only its clock is
// positioned one day before its next birthday to exercise interruption handling.
function boundary(){let s=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);s.day=s.timeline.birthDay+(s.age+1)*365-1;assert.ok(E.validateSave(s),'controlled pre-birthday save is valid');const guide=settlementServices(s).find(r=>r.kind==='guide');for(const room of settlementWalkPath(s,guide.roomId)||[])s=E.chooseAction(s,'atlas_room_'+room);return s;}
function reload(s){assert.ok(E.validateSave(s));const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next.rpg.project,s.rpg.project);assert.deepEqual(next.rpg.intrigue,s.rpg.intrigue);assert.deepEqual(next.event,s.event);return next;}
function start(){let s=boundary();s=E.chooseAction(s,'rpg_intrigue_read');assert.equal(s.event?.id,'rpg_intrigue');const day=s.day;s=E.chooseEventOption(s,'scholar');assert.equal(s.day,day+1);assert.equal(s.rpg.project?.completedDays,1);assert.equal(s.rpg.project?.remainingDays,2);assert.equal(s.rpg.intrigue.stage,0);assert.ok(s.event,'birthday interrupts project');return reload(s);}
function clearInterruptions(s){for(let i=0;i<40;i++){if(s.event){assert.notEqual(s.event.id,'rpg_intrigue');const c=s.event.choices.find(c=>['care','rest','support','later','pause','continue','keep'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}else if(s.timeline.yearTarget!==null)s=E.continueAgeUp(s);else return reload(s);assert.ok(E.validateSave(s));}throw Error('calendar interruption did not settle');}
test('levy birthday interruption reloads and resumes only its remaining attended days',()=>{let s=start();const completed=s.rpg.project.completedDays;s=clearInterruptions(s);assert.equal(s.rpg.project.completedDays,completed);const before=s.day;s=E.chooseAction(s,'rpg_continue');assert.equal(s.day,before+2);assert.equal(s.rpg.project,null);assert.equal(s.rpg.intrigue.stage,1);assert.match(s.notice,/three actual days|3 actual days/i);s=reload(s);const noRepeat=s.day;s=E.chooseAction(s,'rpg_continue');assert.equal(s.day,noRepeat);assert.equal(s.rpg.intrigue.stage,1);});
test('cancelling interrupted levy preserves spent time and grants no unfinished clue or reward',()=>{let s=clearInterruptions(start());const day=s.day,gold=s.hero.gold;s=E.chooseAction(s,'rpg_cancel');assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.rpg.project,null);assert.equal(s.rpg.intrigue.stage,0);assert.equal(s.rpg.intrigue.proof,null);s=reload(s);s=E.chooseAction(s,'rpg_intrigue_open');assert.equal(s.event?.id,'rpg_intrigue');assert.equal(s.rpg.intrigue.pending,'approach');s=E.chooseEventOption(s,'scholar');assert.equal(s.day,day+3);assert.equal(s.rpg.intrigue.stage,1);reload(s);});

import {mountApp} from './helpers/ui-surface.mjs';
test('production handlers resume the authored levy scene from a saved life without accepting on defer',async t=>{
 let s=boundary();s=E.chooseAction(s,'rpg_intrigue_read');
 const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');
 assert.match(ui.root.innerHTML,/seed jar behind the stove/);
 assert.match(ui.root.innerHTML,/Compare the papers at your own table/);
 const before=ui.current().day;await ui.click('choice','later');
 assert.equal(ui.current().day,before);assert.equal(ui.current().rpg.intrigue.stage,0);
 assert.ok(E.validateSave(ui.current()));
 await ui.click('tab','journal');
 assert.equal(ui.current().day,before);
});

import {activeJournalQuests} from '../dist/js/journal-ui-v30.js';
test('guide offers levy, deferral stays outside active Journal, accepted investigation resumes from Journal',async t=>{
 let s=boundary();s.day-=364;const guide=settlementServices(s).find(r=>r.kind==='guide');
 const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('place-open');await ui.click('service-open',guide.id);
 await ui.click('activity','rpg_intrigue_read');assert.match(ui.root.innerHTML,/seed jar behind the stove/);await ui.click('choice','later');
 assert.equal(ui.current().rpg.intrigue.status,'offered');assert.ok(!activeJournalQuests(ui.current()).some(q=>q.key==='winter_levy'));
 await ui.click('tab','journal');assert.ok(!ui.root.querySelector('[data-op="activity"][data-id="rpg_intrigue_open"]'));
 await ui.click('place-open');await ui.click('service-open',guide.id);await ui.click('activity','rpg_intrigue_open');await ui.click('choice','scholar');
 assert.equal(ui.current().rpg.intrigue.stage,1);await ui.click('tab','journal');assert.ok(ui.root.querySelector('[data-op="activity"][data-id="rpg_intrigue_open"]'));
 await ui.click('activity','rpg_intrigue_open');assert.equal(ui.current().event?.id,'rpg_intrigue');assert.match(ui.current().event.body,/Receipt 18/);assert.ok(E.validateSave(ui.current()));
});

test('owned home Scholar work is reachable through production Work & School handlers',async t=>{
 let s=boundary();s.day-=363;s.hero.profession='Scholar';s.life.home={...s.life.home,tier:'cottage',locationId:s.locationId};
 for(const room of settlementWalkPath(s,'homes')||[])s=E.chooseAction(s,'atlas_room_'+room);
 assert.ok(E.validateSave(s));const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','work');
 const work=ui.root.querySelector('[data-op="activity"][data-id="career_work"]');assert.ok(work&&!work.disabled,'home employment work button is enabled');
 const before=ui.current().day;await ui.click('activity','career_work');assert.equal(ui.current().day,before+3);assert.equal(ui.current().locationId,s.locationId);assert.equal(ui.current().cartography.interior.roomId,'homes');assert.ok(E.validateSave(ui.current()));
});
