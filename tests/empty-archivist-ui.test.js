import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {settlementServices} from '../dist/js/world-services.js';
import {renderServiceMeeting} from '../dist/js/world-services-ui.js';
import {syncCartography} from '../dist/js/cartography.js';
import {mountApp} from './helpers/ui-surface.mjs';

const captured=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
const escape=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const helpers={e:escape,button:(label,op,id='')=>`<button data-op="${escape(op)}" data-id="${escape(id)}">${escape(label)}</button>`};
function fixture(localTeacher=false){
 const s=E.migrateSave(structuredClone(captured));
 const site=s.world.locations.find(p=>{
  const rows=settlementServices(s,{siteId:p.id});
  return rows.some(r=>r.kind==='archivist')&&rows.some(r=>r.kind==='school')===localTeacher&&(!localTeacher?p.id.startsWith('reach-'):true);
 });
 assert.ok(site,'captured world provides the required real service arrangement');
 s.locationId=site.id;s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);s.cartography.interior={siteId:site.id,roomId:'archive'};
 assert.ok(E.validateSave(s));return s;
}
const archivist=s=>settlementServices(s).find(r=>r.kind==='archivist'&&r.here);

for(const localTeacher of [false,true])test(`empty archivist describes actual teacher presence (${localTeacher}) without changing the life`,()=>{
 const s=fixture(localTeacher),before=structuredClone(s),html=renderServiceMeeting(s,archivist(s).id,[],helpers);
 assert.match(html,/no records available for you to investigate right now/);
 assert.match(html,localTeacher?/A teacher is here in the School &amp; Archive|A teacher is here in the School & Archive/:/No teacher is currently offering lessons here/);
 assert.match(html,/data-op="tab" data-id="activities"/);assert.match(html,/Choose Work &amp; School/);
 assert.match(html,/Talk About Something Else/);assert.match(html,/>Leave</);
 assert.doesNotMatch(html,/data-op="activity"|household:learning/);assert.deepEqual(s,before);
});

test('available and disabled real archivist offers keep their existing action and reason',()=>{
 const s=fixture(),r=archivist(s);
 for(const disabledReason of [undefined,'The record house is closed.']){
  const before=structuredClone(s),html=renderServiceMeeting(s,r.id,[{id:'lore_read_founding',label:'Read a recorded account',description:'An existing offer.',days:1,cost:0,...(disabledReason?{disabledReason}:{})}],helpers);
  assert.match(html,/data-op="activity" data-id="lore_read_founding"/);assert.doesNotMatch(html,/archive-empty-meeting/);
  if(disabledReason)assert.ok(html.includes(disabledReason));assert.deepEqual(s,before);
 }
});

for(const [age,enrolled,schoolShortcut] of [[18,false,false],[18,true,true],[17,false,true]])test(`archive guidance matches actual Work & School shortcuts at age ${age}, enrolled ${enrolled}`,()=>{
 const s=fixture();s.age=age;s.education.enrolled=enrolled;
 const before=structuredClone(s),html=renderServiceMeeting(s,archivist(s).id,[],helpers);
 if(schoolShortcut){
  assert.match(html,/Work & School helps you find teachers at their actual locations/);
  assert.match(html,/Choose Work &amp; School for learning contacts/);
 }else{
  assert.match(html,/To enroll, visit a teacher at their school/);
  assert.match(html,/Choose Work &amp; School to find a work steward/);
  assert.doesNotMatch(html,/helps you find teachers|for learning contacts|find teachers and work stewards/);
 }
 assert.deepEqual(s,before);
});

test('empty archive navigation and repeated return spend no time or resources and never enroll',async t=>{
 const ui=await mountApp(t,{states:[fixture()]});await ui.click('title-continue');
 for(let i=0;i<2;i++){
  await ui.click('place-open');const r=archivist(ui.current());await ui.click('service-open',r.id);
  assert.ok(ui.root.querySelector('.archive-empty-meeting'));const before=ui.current();
  await ui.click('tab','activities');assert.deepEqual(ui.current(),before);
  assert.equal(ui.root.querySelector('.archive-empty-meeting'),null);
  await ui.click('activities-pane','work');assert.deepEqual(ui.current(),before);
  assert.ok(ui.root.querySelector('[data-op="activities-pane"][data-id="work"]'));
 }
 await ui.click('place-open');await ui.click('service-open',archivist(ui.current()).id);const before=ui.current();
 await ui.click('service-close');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('.archive-empty-meeting'),null);
});
