import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {settlementServices} from '../dist/js/world-services.js';
import {educationTeacher} from '../dist/js/household.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {mountApp} from './helpers/ui-surface.mjs';
function drain(s){for(let n=0;s.event&&n<100;n++){const c=s.event.choices.find(c=>['care','continue','keep','pause','leave','later','friends','private'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}assert.equal(s.event,null);return s;}
let child;
async function pupil(){if(!child){child=drain(await createLifeAtAge({seed:'school-shortcuts-v36',startAge:12,difficulty:'gentle',birthplace:'village',originId:'human_rivercradle',ancestry:'human'}));child.locationId=educationTeacher({...child,education:{...child.education,route:'community'}}).locationId;child.cartography.interior=null;child.cartography.offsite=false;syncCartography(child);for(const r of settlementWalkPath(child,'archive'))child=E.chooseAction(child,'atlas_room_'+r);child=drain(E.chooseAction(child,'school_enroll_community'));for(const r of settlementWalkPath(child,'gate'))child=E.chooseAction(child,'atlas_room_'+r);}assert.ok(E.validateSave(child));return structuredClone(child);}
for(const action of ['school_attend','grow_read'])test('young Work & School shortcut walks to the real teacher before '+action,async t=>{
 const s=await pupil();assert.ok(s.education.enrolled);const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','work');const teacher=settlementServices(ui.current()).find(r=>r.kind==='school'&&r.subjectId===ui.current().education.route),before=ui.current();assert.ok(ui.root.querySelector('[data-op="activity-visit"][data-id="'+teacher.id+'"]'));await ui.click('activity-school',teacher.id+'|'+action);const n=ui.current();assert.ok(E.validateSave(n),n.notice);assert.equal(n.cartography.interior.roomId,teacher.roomId);assert.equal(n.locationId,before.locationId);assert.ok(n.day>before.day);if(action==='school_attend')assert.equal(n.education.attendance,before.education.attendance+1);else assert.ok(n.hero.skills.scholarship>before.hero.skills.scholarship);assert.ok(n.conversations.meetings[teacher.personId]);
});
test('Talk to Teacher opens that teacher without spending class time or creating attendance',async t=>{
 const s=await pupil(),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','work');const before=ui.current(),teacher=settlementServices(before).find(r=>r.kind==='school'&&r.subjectId===before.education.route);await ui.click('activity-visit',teacher.id);assert.equal(ui.current().day,before.day);assert.equal(ui.current().education.attendance,before.education.attendance);assert.ok(ui.root.querySelector('[data-service-person="'+teacher.personId+'"]'));
});
