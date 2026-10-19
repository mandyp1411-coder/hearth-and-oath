import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {roleTitle} from '../dist/js/interaction-ui-v40.js';
import {cityRooms,syncCartography} from '../dist/js/cartography.js';
import {settlementServices} from '../dist/js/world-services.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {mountApp} from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
function fresh(room='gate'){
 let s=E.migrateSave(fixture.states.base);s.locationId='home';s.cartography.offsite=false;s.cartography.interior=null;syncCartography(s);for(const id of settlementWalkPath(s,room))s=E.chooseAction(s,'atlas_room_'+id);assert.ok(E.validateSave(s));return E.migrateSave(s);
}
async function open(t,s){const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');return ui;}

test('public markets have the same neutral title regardless of the individual shopkeeper',()=>{
 const s=fresh('market'),before=structuredClone(s);assert.equal(cityRooms(s).find(r=>r.id==='market').name,'Market');s.realm.sites.home.merchant.name='A Different Merchant';assert.equal(cityRooms(s).find(r=>r.id==='market').name,'Market');assert.equal(before.realm.sites.home.merchant.name,fixture.states.base.realm.sites.home.merchant.name);
});
test('role titles are formatted for display without changing canonical identity strings',()=>{
 for(const [input,output]of [['ember keeper','Ember Keeper'],['master of the watch','Master of the Watch'],['retired teacher','Retired Teacher'],['shrine_keeper','Shrine Keeper'],['half-sister','Half-Sister'],['General Merchant','General Merchant']])assert.equal(roleTitle(input),output);
});
for(const kind of ['doctor','work','inn','merchant'])test(kind+' uses the shared situated conversation and choice layout',async t=>{
 let s=fresh(),r=settlementServices(s).find(r=>r.kind===kind);assert.ok(r);for(const room of settlementWalkPath(s,r.roomId))s=E.chooseAction(s,'atlas_room_'+room);
 const ui=await open(t,s);await ui.click('place-open');const before=ui.current();await ui.click('service-open',r.id);const meeting=ui.root.querySelector('.consistent-meeting');assert.ok(meeting);assert.ok(meeting.querySelector('.dialogue-speaker'));assert.ok(meeting.querySelector('.dialogue-window'));const choices=meeting.querySelectorAll('.interaction-choice');assert.ok(choices.length>=2);assert.ok(choices.every(c=>c.querySelector('.interaction-copy strong')));assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);assert.doesNotMatch(meeting.textContent,/Spend Time or Talk/);
 if(kind==='doctor'){const care=choices.find(c=>c.dataset.id==='health_clinic');assert.ok(care);assert.match(care.textContent,/Gold|Doctor/);}if(kind==='merchant'){await ui.click('shop-browse');assert.ok(ui.root.querySelector('.trade-workspace'));}
});
test('Everyday activities use the same choice rows and still spend their actual quoted day',async t=>{
 const ui=await open(t,fresh());await ui.click('tab','activities');const rows=ui.root.querySelectorAll('[data-activity-category="daily"] .interaction-choice');assert.ok(rows.length);assert.ok(rows.every(r=>r.dataset.op==='activity'));assert.equal(ui.root.querySelector('.compact-activity > .button'),null);const before=ui.current(),walk=rows.find(r=>r.dataset.id==='leisure_walk');assert.ok(walk);assert.match(walk.textContent,/1 Day/);await ui.click('activity','leisure_walk');assert.equal(ui.current().day,before.day+1);assert.ok(E.validateSave(ui.current()));
});
test('quiet Life shows the real date and place without the generic adulthood dialogue',async t=>{
 const s=fresh(),ui=await open(t,s);assert.equal(ui.root.querySelector('.moment-calm'),null);assert.ok(ui.root.querySelector('.daily-record'));assert.ok(ui.root.querySelector('.daily-record').textContent.toLowerCase().includes(s.world.locations.find(p=>p.id===s.locationId).name.toLowerCase()));assert.doesNotMatch(ui.root.innerHTML,/A moment of your own\.|There is time for the people, work and roads you choose/);assert.deepEqual(ui.current(),s);
});
test('the shared portrait treatment covers saved-life, creation and game avatars without a sepia color pass',()=>{
 const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');assert.match(css,/body \.fantasy-avatar \{ filter:grayscale\(1\); \}/);assert.match(css,/--illustration-tone: grayscale\(1\) contrast\(\.98\)/);assert.match(css,/activity-tabs \.button \{[^}]*max-width:100%[^}]*white-space:normal[^}]*overflow-wrap:anywhere/);assert.match(css,/\.notification-toast-stack \{[^}]*position:fixed; right:24px; bottom:80px/);
});
