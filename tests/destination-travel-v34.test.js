import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {hexAtlas,cartographyView,markSiteKnowledge} from '../dist/js/cartography.js';
import {renderExplorationWorkspace,exploreJourneyView} from '../dist/js/exploration-ui.js';
import {journeyMapModel,renderTravelMap} from '../dist/js/explore-map-v34.js';
import {getMapRouteGeometry} from '../dist/js/map.js';
import {chartProject} from '../dist/js/regional-geography-v33.js';
import {paperMapLabels,paperMapPosition,paperMapLayout} from '../dist/js/paper-map.js';
import {addCampingKit} from '../dist/js/travel-energy.js';
import {mountApp,fakeSurface} from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=key=>structuredClone(fixture.states[key||'base']);
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function drain(s){for(let n=0;s.event&&n<100;n++){const c=s.event.choices.find(c=>['avoid','continue','keep','care','pause','leave','later','friends','private'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=valid(E.chooseEventOption(s,c.id));}return s;}
const known=s=>Object.keys(s.cartography.sites).filter(id=>s.cartography.offsite||id!==s.locationId);
const nearest=s=>known(s).filter(id=>!E.exploreTravelPreview(s,id).disabledReason).sort((a,b)=>E.exploreTravelPreview(s,a).days-E.exploreTravelPreview(s,b).days)[0];
async function open(t,s=fresh(),width=1440){const ui=await mountApp(t,{states:[s],width});await ui.click('title-continue');await ui.click('tab','map');return ui;}
async function pick(ui,id){const select=ui.root.querySelector('#journey-destination');select.value=id;await ui.fire('change',select);}
function arrive(s,id){for(let n=0;n<240&&(s.timeline.journey||s.cartography.route||s.cartography.pending||s.locationId!==id);n++){s=drain(s);if(s.battle)throw Error('Unexpected battle in peaceful fixture');const before=s.day;if(s.hero.mp<s.hero.maxMp*.4&&E.getActions(s).some(a=>a.id==='trail_camp'&&!a.disabledReason))s=valid(E.chooseAction(s,'trail_camp'));else s=valid(E.continueExploreJourney(s));if(s.day===before&&!s.event&&!s.timeline.journey&&!s.cartography.route&&!s.cartography.pending)break;}return drain(s);}

test('Explore contains one destination picker and map with no grid, chart sheets or terrain actions',async t=>{
 const ui=await open(t);assert.ok(ui.root.querySelector('.destination-exploration'));assert.equal(ui.root.querySelectorAll('#journey-destination').length,1);assert.equal(ui.root.querySelectorAll('[data-map-viewport]').length,1);assert.ok(ui.root.querySelector('[data-op="place-open"]'));
 for(const selector of ['#chart-sheet','[data-op="map-grid"]','#map-find','.hex-inspection','.regional-map-context','.planned-trail','[data-travel-energy]','[data-op="hex-select"]','[data-chart-grid]','.paper-step-dot','[data-op="spatial-move"]'])assert.equal(ui.root.querySelector(selector),null,selector);
 assert.equal(ui.root.querySelectorAll('.journey-map-tools button').length,2);assert.equal(ui.root.querySelectorAll('.journey-destination').length,1);
});
test('destination selection is free, preserves all save slots and exposes only known names',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),id=nearest(before);await pick(ui,id);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);assert.equal(ui.document.activeElement.id,'journey-destination');assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.equal(ui.root.querySelector('[data-op="travel"]').disabled,false);
 for(const site of before.world.locations.filter(p=>!before.cartography.sites[p.id]))assert.equal(ui.root.querySelector(`option[value="${site.id}"]`),null);
});
test('map clicks and Enter inspect; double-click still requires journey confirmation',async t=>{
 const ui=await open(t),before=ui.current(),id=nearest(before);await ui.click('destination-select',id);assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.deepEqual(ui.current(),before);await ui.key('Enter',{target:ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`)});assert.deepEqual(ui.current(),before);await ui.fire('dblclick',ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`),{detail:2});assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('[data-op="travel"]').textContent,'Confirm Journey');await ui.click('travel',id);assert.deepEqual(ui.current(),E.startExploreJourney(before,id));
});
test('Confirm Journey applies the quoted named road journey and never teleports to a distant place',async t=>{
 const ui=await open(t),before=ui.current(),id=nearest(before),quote=E.exploreTravelPreview(before,id);assert.equal(quote.mode,'road');assert.ok(quote.route.length>=2);await pick(ui,id);await ui.click('travel',id);const next=valid(ui.current());assert.deepEqual(next,E.startExploreJourney(before,id));assert.ok(next.day>before.day);assert.equal(next.hero.gold<=before.hero.gold,true);assert.ok(next.timeline.journey||next.locationId===id);assert.ok(next.timeline.journey?.destinationId===id||next.locationId===id);
});
test('a genuine v0.30 offsite save can set out for its last named place and arrive through real terrain',()=>{
 let s=fresh('offsite');assert.ok(s.cartography.offsite);const id=s.locationId,quote=E.exploreTravelPreview(s,id),position=s.cartography.position,day=s.day;assert.equal(quote.mode,'trail');assert.equal(quote.disabledReason,null);assert.ok(quote.keys.length>1);s=valid(E.startExploreJourney(s,id));assert.ok(s.day>day);assert.ok(s.cartography.position!==position||s.cartography.pending);s=arrive(s,id);assert.equal(s.cartography.offsite,false);assert.equal(s.cartography.position,hexAtlas(s).sites[id]);assert.equal(s.cartography.pending,null);assert.equal(s.cartography.route,null);
});
test('the production Confirm Journey button works from open country, including a return to the same locationId',async t=>{
 const ui=await open(t,fresh('offsite')),before=ui.current(),id=before.locationId;await pick(ui,id);assert.equal(ui.root.querySelector('[data-op="travel"]').disabled,false);await ui.click('travel',id);assert.deepEqual(ui.current(),E.startExploreJourney(before,id));assert.ok(ui.current().day>before.day);
});
test('older planned routes retain their exact route and can continue through the new journey card',async t=>{
 const old=fresh('planned'),s=valid(E.migrateSave(old));assert.deepEqual(s.cartography,old.cartography);assert.deepEqual(s.world,old.world);assert.deepEqual(hexAtlas(s).sites,fixture.siteKeys);const ui=await open(t,s),before=ui.current();assert.ok(ui.root.querySelector('[data-explore-journey]'));assert.equal(ui.root.querySelector('#journey-destination').disabled,false);await ui.click('journey-continue');assert.deepEqual(ui.current(),E.continueExploreJourney(before));assert.ok(ui.current().day>before.day);assert.deepEqual(E.migrateSave(ui.current()),ui.current());
});
test('authentic older partial crossings keep their paid days and quoted slow step while camping',async t=>{
 const f=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v29-map-crossing.json.gz',import.meta.url))));let s=drain(valid(E.migrateSave(f.state)));assert.ok(s.cartography.pending);const p=structuredClone(s.cartography.pending);addCampingKit(s,'tent');s=valid(s);const ui=await open(t,s),before=ui.current();assert.ok(ui.root.querySelector('[data-op="journey-continue"]'));await ui.click('activity','trail_camp');const rested=valid(ui.current());assert.equal(rested.day,before.day+1);assert.equal(rested.cartography.pending.progress,p.progress);assert.deepEqual(rested.cartography.pending.energyStep,p.energyStep);assert.ok(rested.hero.mp>before.hero.mp);assert.equal(rested.trail.kits.at(-1).remaining,4);await ui.click('journey-continue');assert.deepEqual(ui.current(),E.continueExploreJourney(rested));assert.ok(ui.current().day>rested.day);
});
test('a partial crossing offers Finish This Stretch and Turn Back rather than an unusable departure',async t=>{
 const f=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v29-map-crossing.json.gz',import.meta.url))));const s=drain(E.migrateSave(f.state));const ui=await open(t,s);assert.match(ui.root.querySelector('[data-op="journey-continue"]').textContent,/Finish This Stretch/);assert.equal(ui.root.querySelector('[data-op="travel"]'),null);await ui.click('activity','atlas_cancel');assert.equal(ui.current().cartography.pending,null);assert.equal(ui.current().day,s.day);assert.ok(E.validateSave(ui.current()));
});
test('paid legacy road journeys retain their legs and departure payment during migration and render',async t=>{
 const f=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz',import.meta.url))));const s=valid(E.migrateSave(f.journey));assert.deepEqual(s.timeline.journey,f.journey.timeline.journey);const ui=await open(t,s),before=ui.current();assert.ok(ui.root.querySelector('[data-explore-journey]'));assert.match(ui.root.querySelector('.journey-destination').textContent,/Already Paid/);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.current().timeline.journey,f.journey.timeline.journey);
});
test('unknown destination requests are rejected without spending days, gold or revealing a name',async t=>{
 const s=fresh(),id=s.world.locations.find(p=>!s.cartography.sites[p.id]).id,ui=await open(t,s),before=ui.current();assert.ok(E.exploreTravelPreview(s,id).disabledReason);const no=E.startExploreJourney(s,id);assert.equal(no.day,s.day);assert.deepEqual(no.cartography,s.cartography);assert.equal(no.hero.gold,s.hero.gold);await ui.fire('change',Object.assign(ui.root.querySelector('#journey-destination'),{value:id}));assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector(`[data-op="destination-select"][data-id="${id}"]`),null);
});
test('closed roads produce a disabled route with a concrete explanation',async t=>{
 const s=fresh(),id=nearest(s);for(const r of s.world.roads)if(r.from===s.locationId||r.to===s.locationId)r.closed=true;valid(s);const p=E.exploreTravelPreview(s,id);assert.match(p.disabledReason,/No open road/);const ui=await open(t,s);await pick(ui,id);assert.equal(ui.root.querySelector('[data-op="travel"]').disabled,true);assert.match(ui.root.querySelector('.disabled-reason').textContent,/No open road/);const no=E.startExploreJourney(s,id);assert.equal(no.day,s.day);assert.equal(no.hero.gold,s.hero.gold);
});
test('children receive an explicit age gate and cannot depart',()=>{
 const s=valid(E.createBirthGame({seed:'young-map-reader-v34'})),id=known(s)[0],before=structuredClone(s);assert.match(E.exploreTravelPreview(s,id).disabledReason,/age 14/);const next=valid(E.startExploreJourney(s,id));assert.deepEqual(next.cartography,before.cartography);assert.equal(next.day,before.day);assert.equal(next.hero.gold,before.hero.gold);
});
test('all committed states explain their travel barrier and share the same command guard',()=>{
 const s=fresh(),id=nearest(s),cases=[['prison','custody'],['maze','dungeon'],['dungeon','dungeon'],['workshop','workshop'],['careers','work'],['health','commitment'],['year','year']];for(const [kind,copy] of cases){const b=structuredClone(s);if(kind==='prison')b.justice.prison={};if(kind==='maze')b.maze={};if(kind==='dungeon')b.dungeon={};if(kind==='workshop')b.workshop.project={};if(kind==='careers')b.careers.batch={};if(kind==='health')b.health.recovery={};if(kind==='year')b.life.plan={};const p=E.exploreTravelPreview(b,id);assert.ok(p.disabledReason.toLowerCase().includes(copy),kind+': '+p.disabledReason);const next=E.startExploreJourney(b,id);assert.equal(next.notice,p.disabledReason);assert.equal(next.day,b.day);assert.equal(next.hero.gold,b.hero.gold);}
});
test('Continue attends at most a short stretch and stops for low Focus or a real waypoint',()=>{
 let s=drain(fresh('road'));assert.ok(s.timeline.journey);const before=s.day,from=s.locationId;s=valid(E.continueExploreJourney(s));assert.ok(s.day>=before);assert.ok(s.day-before<=3||s.locationId!==from);if(!s.event&&s.timeline.journey){s.hero.mp=1;const day=s.day;s=valid(E.continueExploreJourney(s));assert.ok(s.day-day<=3);}
});
test('stopping midway through a road leg is refused without losing the journey',()=>{
 const s=fresh(),id=known(s).find(id=>E.exploreTravelPreview(s,id).legs?.[0]?.totalDays>1);assert.ok(id);let j=drain(valid(E.startExploreJourney(s,id)));assert.ok(j.timeline.journey);assert.ok(j.timeline.journey.legProgress>0||j.timeline.journey.energyStep);assert.ok(E.stopExploreJourneyReason(j));const before=structuredClone(j),no=valid(E.stopExploreJourney(j));assert.equal(no.day,before.day);assert.equal(no.hero.gold,before.hero.gold);assert.deepEqual(no.timeline.journey,before.timeline.journey);
});
test('a stopped country route keeps position, spent days, Focus and every discovery',()=>{
 const s=fresh('planned'),before=structuredClone(s),no=valid(E.stopExploreJourney(s));assert.equal(no.cartography.route,null);assert.equal(no.cartography.position,before.cartography.position);assert.equal(no.day,before.day);assert.equal(no.hero.mp,before.hero.mp);assert.deepEqual(no.cartography.cells,before.cartography.cells);assert.deepEqual(no.cartography.sites,before.cartography.sites);assert.equal(E.exploreTravelPreview(no,no.locationId).disabledReason,null);
});
test('the map-only popup preserves destination selection, owns focus and returns to the route card',async t=>{
 const ui=await open(t),before=ui.current(),slots=ui.lives(),id=nearest(before);await ui.click('map-expand');let popup=ui.root.querySelector('.map-popout');assert.ok(popup);assert.equal(popup.querySelector('form,select,header,.map-toolbar,.journey-map-tools,.journey-destination'),null);assert.ok(popup.querySelectorAll('[data-op]').every(n=>['close-modal','destination-select','journey-current'].includes(n.dataset.op)));await ui.key('Enter',{target:popup.querySelector(`[data-op="destination-select"][data-id="${id}"]`)});assert.ok(ui.root.querySelector('.map-popout'));await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'map-expand');assert.equal(ui.root.querySelector('[data-op="travel"]').dataset.id,id);assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);
});
test('the traveller is drawn between actual saved road waypoints rather than left at the previous town',()=>{
 const s=fresh(),id=known(s).find(id=>E.exploreTravelPreview(s,id).legs?.[0]?.totalDays>1);let next=drain(E.startExploreJourney(s,id));const j=next.timeline.journey;assert.ok(j);const geometry=getMapRouteGeometry(next,j.route).legs[j.legIndex],a=chartProject(next.world,geometry.points[0]),b=chartProject(next.world,geometry.points.at(-1)),model=journeyMapModel(next);assert.ok(model.path.length>1);assert.ok(Math.hypot(model.traveller.x-a[0],model.traveller.y-a[1])>0);assert.ok(model.traveller.x>=Math.min(a[0],b[0])-100&&model.traveller.x<=Math.max(a[0],b[0])+100);const html=renderTravelMap(next,{selectedId:id});assert.match(html,/data-journey-route/);assert.doesNotMatch(html,/data-selected-hex|data-op="hex-select"|paper-step-dot" cx/);
});
test('map drawing and route quotation are pure and SVG IDs remain isolated across views',()=>{
 const s=fresh('planned'),before=structuredClone(s),a=renderTravelMap(s),b=renderTravelMap(s,{popup:true});assert.deepEqual(s,before);const ids=[...(a+b).matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);assert.doesNotMatch(a,/NaN|undefined/);assert.deepEqual(E.migrateSave(s).cartography,s.cartography);
});
test('small-screen Explore keeps the same direct destination and journey commands',async t=>{
 const ui=await open(t,fresh('offsite'),390),before=ui.current();await pick(ui,before.locationId);assert.ok(!ui.root.querySelector('[data-op="travel"]').disabled);await ui.click('travel',before.locationId);assert.ok(ui.current().day>before.day);assert.ok(E.validateSave(ui.current()));assert.equal(ui.root.querySelector('#chart-sheet'),null);
});

test('a traveller can stop at a real reached waypoint and enter that place without paying again',()=>{
 let s=fresh(),id=known(s).find(id=>E.exploreTravelPreview(s,id).route?.length>2);assert.ok(id);s=drain(valid(E.startExploreJourney(s,id)));
 for(let n=0;n<60&&s.timeline.journey&&E.stopExploreJourneyReason(s);n++){if(s.hero.mp<s.hero.maxMp*.4&&E.getActions(s).some(a=>a.id==='trail_camp'))s=drain(valid(E.chooseAction(s,'trail_camp')));else s=drain(valid(E.continueExploreJourney(s)));}
 assert.ok(s.timeline.journey);assert.equal(s.timeline.journey.legProgress,0);assert.equal(s.locationId,s.timeline.journey.route[s.timeline.journey.legIndex]);const before=structuredClone(s);s=valid(E.stopExploreJourney(s));assert.equal(s.timeline.journey,null);assert.equal(s.locationId,before.locationId);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.cartography.offsite,false);assert.ok(E.getActions(s).some(a=>a.id.startsWith('atlas_room_'))||s.world.locations.find(p=>p.id===s.locationId).type!=='city');
});
test('a different destination can be inspected during a journey and its Back control restores travel',async t=>{
 const ui=await open(t,fresh('planned')),before=ui.current(),dest=before.cartography.route.destination,other=Object.keys(before.cartography.sites).find(id=>id!==dest);await pick(ui,other);assert.equal(ui.root.querySelector('[data-op="travel"]').disabled,true);assert.ok(ui.root.querySelector('[data-op="journey-show"]'));assert.deepEqual(ui.current(),before);await ui.click('journey-show');assert.ok(ui.root.querySelector('[data-explore-journey]'));assert.ok(ui.root.querySelector('[data-op="journey-continue"]'));assert.deepEqual(ui.current(),before);
});
test('enlarged destination labels reserve their actual drawing size in a fully known atlas',()=>{
 const s=fresh();for(const p of s.world.locations)markSiteKnowledge(s,p.id,'Rumored','A Complete Road Atlas');const v=cartographyView(s);v.cells=v.cells.map(c=>({...c,...paperMapPosition(s,c)}));const labels=paperMapLabels(s,v.cells,paperMapLayout(s,{view:v}),{scale:v.atlas.width/1000*1.4});assert.equal(labels.length,s.world.locations.length);for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a],y=labels[b];assert.ok(!(x.x<y.x+y.w&&x.x+x.w>y.x&&x.y<y.y+y.h&&x.y+x.h>y.y),x.name+' / '+y.name);}
 const surface=fakeSurface();surface.root.innerHTML=renderTravelMap(s);assert.doesNotMatch(surface.root.querySelector('svg').textContent,/Hexes/);assert.equal(surface.root.querySelectorAll('button.destination-pin').length,s.world.locations.length);
});

test('region borders follow the real saved territorial partition without movement-grid edges',async()=>{
 const {paperRegionBorders}=await import('../dist/js/paper-map.js'),s=fresh(),before=structuredClone(s),borders=paperRegionBorders(s);assert.ok(borders.length>=5);for(const b of borders){const a=s.world.map.atlas.territories.find(t=>t.id===b.a),c=s.world.map.atlas.territories.find(t=>t.id===b.b);for(const [x,y] of b.source){const da=Math.hypot(x-a.x,y-a.y),db=Math.hypot(x-c.x,y-c.y);assert.ok(Math.abs(da-db)<1e-6);assert.ok(s.world.map.atlas.territories.every(t=>Math.hypot(x-t.x,y-t.y)>=da-1e-6));assert.ok(x>=-1e-6&&x<=1000+1e-6&&y>=-1e-6&&y<=700+1e-6);}assert.deepEqual(b.points,b.source.map(p=>chartProject(s.world,p)));}const html=renderTravelMap(s);assert.match(html,/data-region-border=/);assert.deepEqual(s,before);
});

test('an exhausted offsite traveller can camp before departing and consumes one real sheltered night',async t=>{
 const s=fresh('offsite');s.hero.mp=0;addCampingKit(s,'tent');valid(s);const ui=await open(t,s),before=ui.current();assert.ok(ui.root.querySelector('[data-op="activity"][data-id="trail_camp"]'));assert.ok(ui.root.querySelector('[data-op="travel"]'));await ui.click('activity','trail_camp');const next=valid(ui.current());assert.equal(next.day,before.day+1);assert.ok(next.hero.mp>0);assert.equal(next.trail.kits.at(-1).remaining,4);assert.equal(next.cartography.position,before.cartography.position);assert.equal(next.cartography.route,before.cartography.route);assert.equal(next.cartography.offsite,true);
});
test('manual scouting is retired and free map inspection does not discover country',async t=>{
 const ui=await open(t,fresh('offsite')),before=ui.current();assert.equal(ui.root.querySelector('[data-id="atlas_scout"]'),null);assert.ok(!E.getActions(before).some(a=>a.id==='atlas_scout'));const next=valid(E.chooseAction(before,'atlas_scout'));assert.equal(next.day,before.day);assert.deepEqual(next.cartography,before.cartography);
});
