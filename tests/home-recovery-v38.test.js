import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {addCampingKit} from '../dist/js/travel-energy.js';
import {householdCostPreview} from '../dist/js/budget.js';
import {ownedHomeHere,homeRestReason,applyHomeRest} from '../dist/js/home-recovery-v38.js';
import {mountApp} from './helpers/ui-surface.mjs';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function walk(s,to){const path=settlementWalkPath(s,to);assert.ok(path);for(const room of path)s=valid(E.chooseAction(s,'atlas_room_'+room));return s;}
// The old capture, read into the one rulebook as the main game's engine reads any life (v0.72.2).
let bought=E.migrateSave(structuredClone(fixture.states.base));bought.hero.gold=1000;bought.locationId='city';bought.cartography.interior=null;syncCartography(bought);bought=walk(bought,'homes');bought=valid(E.chooseAction(bought,'life_home_cottage'));assert.equal(bought.life.home.source,'purchase');assert.equal(bought.life.home.locationId,'city');
const fresh=()=>{const s=structuredClone(bought);s.hero.mp=1;s.life.stress=20;s.trail.daysWithoutRest=6;s.trail.daysTravelled=Math.max(6,s.trail.daysTravelled);addCampingKit(s,'tent');return valid(s);};
const stable=s=>({...s,notice:''});
async function recovery(t,s=fresh()){const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','recovery');return ui;}

test('Recovery walks from another city area to the purchased home and rests for one real day',async t=>{
 const s=walk(fresh(),'tavern'),ui=await recovery(t,s),before=ui.current(),go=ui.root.querySelector('[data-op="activity-home"]');assert.ok(go&&!go.disabled);assert.equal(go.querySelector('.interaction-copy strong').textContent,'Go Home and Rest');assert.match(go.textContent,/1 Day · No Fee/);
 await ui.click('activity-home');const n=valid(ui.current());assert.equal(n.day,before.day+1);assert.equal(n.locationId,'city');assert.equal(n.cartography.interior.siteId,'city');assert.equal(n.cartography.interior.roomId,'homes');assert.equal(n.hero.mp,n.hero.maxMp);assert.equal(n.hero.gold,before.hero.gold-householdCostPreview(before,1).totalDue);assert.equal(n.hero.hp,before.hero.hp);assert.deepEqual(n.health,before.health);assert.equal(n.life.stress,Math.max(0,before.life.stress-8));assert.deepEqual(n.trail.kits,before.trail.kits);assert.equal(n.trail.daysWithoutRest,0);assert.equal(n.trail.lastRestDay,n.day);assert.deepEqual(n.life.home,before.life.home);assert.match(n.notice,/resting at home/);assert.equal(ui.root.querySelector('.service-meeting'),null);assert.ok(ui.root.querySelector('#place-area-heading'));assert.deepEqual(E.migrateSave(n),n);
});
test('rest is also available at the actual Homes area and repeated rests spend another day',async t=>{
 const ui=await recovery(t);await ui.click('tab','map');await ui.click('place-open');assert.ok(ui.root.querySelector('[data-op="activity"][data-id="home_rest"]'));const before=ui.current();await ui.click('activity','home_rest');const one=valid(ui.current());assert.equal(one.day,before.day+1);assert.equal(one.hero.mp,one.hero.maxMp);await ui.click('activity','home_rest');const two=valid(ui.current());assert.equal(two.day,one.day+1);assert.equal(two.hero.mp,two.hero.maxMp);assert.deepEqual(two.trail.kits,one.trail.kits);
});
test('lodgings, a home in a different city and open country offer no home shortcut or free remote rest',async t=>{
 for(const kind of ['lodgings','remote','offsite']){const s=kind==='offsite'?E.migrateSave(structuredClone(fixture.states.offsite)):fresh();if(kind==='offsite')s.life.home={tier:'cottage',source:'purchase',locationId:s.locationId};if(kind==='lodgings')s.life.home.tier='lodgings';if(kind==='remote')s.life.home.locationId='home';assert.equal(ownedHomeHere(s),false,kind);valid(s);assert.deepEqual(stable(E.chooseAction(s,'home_rest')),stable(s));const ui=await recovery(t,s);assert.equal(ui.root.querySelector('[data-op="activity-home"]'),null);assert.equal(ui.root.querySelector('[data-op="activity"][data-id="home_rest"]'),null);}
});
test('ownership supports cottage, townhouse and estate, but destroyed or evacuated homes cannot supply rest',()=>{
 for(const tier of ['cottage','townhouse','estate']){const s=fresh();s.life.home.tier=tier;assert.equal(ownedHomeHere(s),true);assert.equal(homeRestReason(s),null);}
 for(const status of ['destroyed','evacuated']){const s=fresh();s.world.locations.find(p=>p.id===s.locationId).status=status;assert.equal(ownedHomeHere(s),false);assert.equal(applyHomeRest(s,'home_rest',{spendDays:()=>{throw Error('Unavailable home must not spend days');}}),false);}
});
test('remote room execution and current commitments cannot bypass home-rest guards',()=>{
 const s=walk(fresh(),'tavern');assert.match(homeRestReason(s),/Homes area/);assert.deepEqual(stable(E.chooseAction(s,'home_rest')),stable(s));
 for(const kind of ['event','battle','prison','project','journey']){const p=fresh();if(kind==='event')p.event={id:'waiting'};if(kind==='battle')p.battle={};if(kind==='prison')p.justice.prison={};if(kind==='project')p.workshop.project={};if(kind==='journey')p.timeline.journey={};const before=structuredClone(p);assert.ok(homeRestReason(p,{visiting:true}));assert.equal(applyHomeRest(p,'home_rest',{spendDays:()=>{throw Error('Blocked rest must not spend days');}}),false);assert.deepEqual(p,before);}
});
test('an interrupted rest or a lost address grants no Focus, journal reward or rested-travel reset',()=>{
 for(const kind of ['no-time','decision','lost-home']){const s=fresh(),mp=s.hero.mp,trail=structuredClone(s.trail);let records=0;const ctx={spendDays:()=>{if(kind==='no-time')return 0;s.day++;if(kind==='decision')s.event={id:'waiting'};if(kind==='lost-home')s.life.home.tier='lodgings';return 1;},journalLiteral:()=>records++};assert.equal(applyHomeRest(s,'home_rest',ctx),true);assert.equal(s.hero.mp,mp);assert.deepEqual(s.trail,trail);assert.equal(records,0);assert.match(s.notice,/interrupted/);}
});
