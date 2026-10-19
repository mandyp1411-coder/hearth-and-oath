import test from 'node:test';
import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { travelPlanPreview, travelRouteOptions, beginTravelJourney, onTravelLeg, applyTravelChoice, flushTravelEvent } from '../dist/js/travel.js';
import { roadJourneyProgress, renderRoadPlanPanel, renderRoadJourney } from '../dist/js/travel-ui.js';
import { selectRoadRoute } from '../dist/js/road-routes.js';
import { worldCalendarContext } from '../dist/js/world.js';
import { markSiteKnowledge, hexAtlas, cityRooms, cartographyView, syncCartography, validateCartography, applyCartographyAction } from '../dist/js/cartography.js';
import { captureRoadAccount } from '../dist/js/road-memory.js';
import { civicPhase } from '../dist/js/settlement-spaces.js';
import { onRealmTime, validateRealm } from '../dist/js/realm.js';
import { communitySupport } from '../dist/js/community.js';
import { settlementLayout, areaScene } from '../dist/js/area-scenes.js';
import { renderSettlementList } from '../dist/js/exploration-ui.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Position, funds and route counters are controlled QA fixtures. The public
// departure/response/continuation cases still use the actual production APIs.
let base=await createLifeAtAge({seed:'explore-focus-eight',startAge:18,difficulty:'gentle'});
function clear(s){for(let n=0;s.event&&n<60&&!s.event.id.startsWith('travel_');n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','later','keep','continue','pause','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
base=clear(base);assert.ok(E.validateSave(base));
function fresh(){const s=structuredClone(base);delete s.trail; // The legacy planned-road quote/attendance contract is explicit here.
 s.hero.gold=40000;s.hero.hp=s.hero.maxHp=200;s.hero.mp=s.hero.maxMp=100;s.hero.skills.survival=0;for(const k of Object.keys(s.equipment.materials))s.equipment.materials[k]=200;return s;}
function roundtrip(s){assert.ok(E.validateSave(s),'valid life');const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assertCapturedMigration(s,next);assert.deepEqual(E.migrateSave(next),next);return next;}
const uiHelpers={e:String,paragraphs:t=>`<p>${t}</p>`,button:(text,op,id='',cls='',disabled=false)=>`<button data-op="${op}" data-id="${id}" ${disabled?'disabled':''}>${text}</button>`,actionCards:rows=>rows.map(a=>`<button data-op="activity" data-id="${a.id}" ${a.disabledReason?'disabled':''}>${a.label}</button>`).join('')};
function context(s,max=Infinity){return {spendDays:n=>{const v=Math.min(n,max);s.day+=v;return v;},journal(){},standing(){},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}};}
function oneLeg(s){return s.world.locations.find(p=>p.id!==s.locationId&&travelPlanPreview(s,p.id).legs.length===1).id;}
function pending(type='weather',input=null){
 const start=input?structuredClone(input):fresh();start.event=null;start.battle=null;start.timeline.journey=null;start.travel.pending=null;start.travel.plan={pace:'fast',supplies:true,scout:false,escort:false,night:true};const destination=oneLeg(start);
 for(let n=start.travel.journeys+1;n<start.travel.journeys+1200;n++){
  const s=structuredClone(start);s.travel.journeys=n-1;const q=travelPlanPreview(s,destination);s.hero.gold-=q.cost;assert.ok(beginTravelJourney(s,q,context(s)));const leg=s.timeline.journey.legs[0];s.day+=leg.totalDays;s.timeline.journey.legProgress=leg.totalDays;onTravelLeg(s,{actualDays:leg.totalDays,legIndex:0},context(s));
  if(s.travel.pending?.type===type){const real=structuredClone(start);real.travel.journeys=n-1;const result=E.travelTo(real,destination);assert.equal(result.event?.id,'travel_'+type);roundtrip(result);return result;}
 }throw Error('No controlled '+type+' meeting');
}
function finish(s,pick){s=E.chooseEventOption(s,pick);s=clear(s);for(let n=0;s.timeline.journey&&n<30;n++){if(s.event){const id=s.event.choices.find(c=>['continue','press','avoid','pause','care'].includes(c.id))?.id||s.event.choices[0].id;s=E.chooseEventOption(s,id);}else s=E.continueJourney(s);s=clear(s);}assert.equal(s.timeline.journey,null);return s;}
function buildWayhouse(){let s=fresh();s=E.chooseAction(s,'community_begin_road');assert.equal(s.event.id,'community_charter');s=E.chooseEventOption(s,'open');for(let n=0;n<3;n++){s=clear(s);s=E.chooseAction(s,'community_stage');while(s.community.project?.commitment){s=clear(s);s=E.chooseAction(s,'community_continue');}}assert.ok(s.community.works.some(w=>w.kind==='road'));roundtrip(s);return s;}

test('road policy search agrees with exhaustive real-fee alternatives, including supplies rounding',()=>{
 const world={locations:['a','b','c','d','e'].map(id=>({id})),roads:[['a','b',2,40],['b','d',2,40],['a','c',5,2],['c','e',1,0],['e','d',1,1],['a','d',8,8],['b','c',2,12]].map(([from,to,days,risk])=>({from,to,days,risk}))};
 function paths(from='a',seen=['a']){if(from==='d')return [seen];return world.roads.flatMap(r=>{const to=r.from===from?r.to:r.to===from?r.from:null;return to&&!seen.includes(to)?paths(to,[...seen,to]):[];});}
 const compare=(a,b)=>a.find((n,i)=>n!==b[i])===undefined?0:(()=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];})();
 for(const supplies of [false,true])for(const escort of [false,true])for(const preference of ['fastest','safest','cheapest']){
  const plan={supplies,escort},metrics=route=>{const legs=route.slice(1).map((to,i)=>world.roads.find(r=>r.from===route[i]&&r.to===to||r.to===route[i]&&r.from===to));const days=legs.reduce((n,l)=>n+l.days,0),risk=legs.reduce((n,l)=>n+l.risk,0),fee=(supplies?3+Math.ceil(days/2):0)+(escort?4+legs.length*2:0);return preference==='fastest'?[days,fee,risk]:preference==='safest'?[risk,days,fee]:[fee,days,risk];};
  const best=paths().map(route=>({route,score:metrics(route)})).sort((a,b)=>compare(a.score,b.score))[0],actual=selectRoadRoute(world,'a','d',plan,preference,(from,to,r)=>({...r,totalDays:r.days}));assert.deepEqual(metrics(actual),best.score);assert.equal(new Set(actual).size,actual.length);
 }
});
test('different open paths can be compared by actual time, fees and accumulated exposure',()=>{
 const s=fresh();s.world={...s.world,locations:['a','b','c','d'].map(id=>({id,name:id,safety:1,status:'thriving',services:['hearth']})),roads:[{from:'a',to:'d',days:5,danger:4},{from:'a',to:'b',days:2,danger:6},{from:'b',to:'d',days:2,danger:6},{from:'a',to:'c',days:4,danger:1},{from:'c',to:'d',days:4,danger:1}]};s.locationId='a';s.community.works=[];s.travel.plan={pace:'steady',supplies:true,scout:false,escort:true,night:false};const before=structuredClone(s),rows=travelRouteOptions(s,'d');assert.equal(new Set(rows.map(v=>v.preview.route.join(','))).size,3);const [fast,safe,cheap]=rows.map(v=>v.preview);assert.ok(fast.days<safe.days);assert.ok(cheap.cost<fast.cost);assert.ok(safe.exposure<fast.exposure);for(const q of [fast,safe,cheap]){assert.equal(q.risk,Math.max(...q.legs.map(l=>l.risk)));assert.equal(q.exposure,q.legs.reduce((n,l)=>n+l.risk,0));assert.equal(q.days,q.legs.reduce((n,l)=>n+l.totalDays,0));}assert.deepEqual(s,before);
});
test('closed roads are never selected and unreachable destinations remain honestly blocked',()=>{
 const s=fresh();s.world.roads=s.world.roads.map(r=>({...r,closed:true}));for(const row of travelRouteOptions(s,oneLeg(fresh()))){assert.deepEqual(row.preview.route,[]);assert.match(row.preview.disabledReason,/No open road/);}
});
test('route preferences and preparation changes cost no time, money, stock or rations',()=>{
 const s=fresh(),before=structuredClone(s),next=E.updateTravelPlan(s,{pace:'cautious',supplies:true,scout:true,escort:true,night:true,routePreference:'safest'});assert.equal(next.travel.routePreference,'safest');assert.equal(next.day,s.day);assert.equal(next.hero.gold,s.hero.gold);assert.deepEqual(next.equipment,before.equipment);assert.deepEqual(next.adventuring,before.adventuring);assert.deepEqual(next.realm,before.realm);roundtrip(next);
});
test('selected route quotes are pure and each departure leg stays on an actual open road',()=>{
 const s=fresh(),before=structuredClone(s);for(const dest of s.world.locations.filter(p=>p.id!==s.locationId).slice(0,8))for(const {preview:q}of travelRouteOptions(s,dest.id))for(const l of q.legs)assert.ok(s.world.roads.some(r=>!r.closed&&(r.from===l.from&&r.to===l.to||r.to===l.from&&r.from===l.to)));assert.deepEqual(s,before);
});
test('public departure preserves its quoted route, fee and checked progress through reload',()=>{
 const s=pending(),j=s.timeline.journey,q=travelPlanPreview({...s,timeline:{...s.timeline,journey:null},event:null},j.destinationId);assert.deepEqual(j.route,q.route);assert.equal(j.departureCost,q.cost);assert.equal(j.legs[0].checked,true);assert.equal(j.legProgress,j.legs[0].totalDays);const snap=structuredClone(j),blocked=E.updateTravelPlan(s,{pace:'cautious',routePreference:'cheapest'});assert.deepEqual(blocked.timeline.journey,snap);assert.deepEqual(blocked.travel.plan,s.travel.plan);roundtrip(s);
});
test('a free response and continuation complete the saved leg without a second day, fee or encounter',()=>{
 let s=pending(),destination=s.timeline.journey.destinationId;s=E.chooseEventOption(s,'press');assert.equal(s.travel.pending,null);assert.ok(s.timeline.journey);const day=s.day,gold=s.hero.gold,history=s.travel.history.length;s=E.continueJourney(s);assert.equal(s.locationId,destination);assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.travel.history.length,history);assert.equal(s.timeline.journey,null);roundtrip(s);
});
test('a chosen return records the actual road account after ending the trip at its real waypoint',()=>{
 let s=pending(),from=s.locationId,gold=s.hero.gold,day=s.day;s=E.chooseEventOption(s,'turn_back');assert.equal(s.timeline.journey,null);assert.equal(s.travel.pending,null);assert.equal(s.locationId,from);assert.equal(s.day,day+1);assert.ok(s.hero.gold<=gold);assert.equal(s.travel.history.at(-1).result,'returned');assert.equal(s.travel.history.at(-1).road.from,from);roundtrip(s);
});
test('journey context shows planned progress and remaining response attendance separately',()=>{
 const s=pending(),v=roadJourneyProgress(s);assert.equal(v.completed,v.total);assert.equal(v.remaining,0);assert.equal(v.departureCost,s.timeline.journey.departureCost);const before=structuredClone(s),html=renderRoadJourney(s,uiHelpers);assert.match(html,/gold already committed/);assert.match(html,/Finish the present road/);assert.match(html,/encounter checked/);assert.deepEqual(s,before);
 const a=structuredClone(s);a.event=null;applyTravelChoice(a,'travel_weather','shelter',context(a,0));assert.equal(a.travel.pending.remainingDays,1);assert.equal(roadJourneyProgress(a).responseDays,1);
});
test('legacy saved road legs still display their original days and do not gain a new quote',()=>{
 const s=pending();delete s.travel.pending.account;const event=structuredClone(s.event);for(const k of ['legs','plan','departureCost','id'])delete s.timeline.journey[k];s.travel.pending=null;s.event=null;const j=structuredClone(s.timeline.journey),view=roadJourneyProgress(s);assert.ok(view.total>=1);renderRoadJourney(s,uiHelpers);assert.deepEqual(s.timeline.journey,j);assert.ok(event.body);
});
test('explicitly re-heard rumors retain first provenance and add a separate dated uncertain account',()=>{
 let s=fresh();const target=s.world.roads.find(r=>r.from===s.locationId||r.to===s.locationId),id=target.from===s.locationId?target.to:target.from,old=structuredClone(s.cartography.sites[id]);s=E.chooseAction(s,'atlas_rumors');const row=s.cartography.sites[id];assert.equal(row.kind,old.kind);assert.equal(row.observedDay,old.observedDay);assert.equal(row.source,old.source);assert.equal(row.reports.at(-1).observedDay,s.day);assert.equal(row.reports.at(-1).kind,'Rumored');assert.match(row.reports.at(-1).source,/Travelers at/);assert.equal(row.condition,old.condition);roundtrip(s);
});
test('re-hearing never turns an unverified report into a visit or refreshes an observed condition',()=>{
 const s=fresh(),id=s.world.locations.find(p=>p.id!==s.locationId).id;markSiteKnowledge(s,id,'Visited','Earlier field visit');const before=structuredClone(s.cartography.sites[id]);markSiteKnowledge(s,id,'Rumored','A new carrier’s uncertain account',{heard:true});const row=s.cartography.sites[id];assert.equal(row.kind,'Visited');assert.equal(row.condition,before.condition);assert.equal(row.observedDay,before.observedDay);assert.equal(row.reports.at(-1).kind,'Rumored');assert.equal(row.reports.at(-1).source,'A new carrier’s uncertain account');roundtrip(s);
});
test('passive location sync and read views cannot invent repeated rumor hearings',()=>{
 const s=fresh();const before=structuredClone(s.cartography.sites);syncCartography(s);cartographyView(s);travelRouteOptions(s,oneLeg(s));for(const [id,row]of Object.entries(s.cartography.sites))assert.deepEqual(row.reports,before[id]?.reports);roundtrip(s);
});
test('source lists are bounded, deduplicate the same hearing and stay separate from the original record',()=>{
 const s=fresh(),id=s.world.locations.find(p=>p.id!==s.locationId).id;const before=structuredClone(s.cartography.sites[id]);for(let n=0;n<12;n++)markSiteKnowledge(s,id,'Rumored','Carrier account '+n,{heard:true});const row=s.cartography.sites[id];assert.equal(row.reports.length,6);markSiteKnowledge(s,id,'Rumored','Carrier account 11',{heard:true});assert.equal(row.reports.length,6);assert.equal(row.observedDay,before?.observedDay??s.day);assert.equal(validateCartography(s.cartography,s),true);roundtrip(s);
});
test('a zero-day interruption cannot create a newly dated rumor hearing',()=>{
 const s=fresh(),before=structuredClone(s.cartography);assert.equal(applyCartographyAction(s,'atlas_rumors',context(s,0)),true);assert.deepEqual(s.cartography,before);roundtrip(s);
});
for(const bad of ['date','kind','overflow'])test(`invalid rumor report ${bad} is rejected`,()=>{
 const s=fresh(),id=s.world.locations.find(p=>p.id!==s.locationId).id;markSiteKnowledge(s,id,'Rumored','Road witness',{heard:true});const row=s.cartography.sites[id];if(bad==='date')row.reports[0].observedDay=s.day+1;if(bad==='kind')row.reports[0].kind='Verified rumor';if(bad==='overflow')row.reports=Array(7).fill(row.reports[0]);assert.equal(E.validateSave(s),false);
});
test('settlement phases have actual connected space differences without granting resources',()=>{
 const s=fresh(),c=s.realm.sites[s.locationId],before=structuredClone(s),ids={};for(const phase of ['village','town','city']){c.phase=phase;const rooms=cityRooms(s);ids[phase]=rooms.map(r=>r.id);assert.ok(rooms.every(r=>r.exits.every(id=>rooms.find(n=>n.id===id)?.exits.includes(r.id))));const visited=new Set(),todo=['gate'];while(todo.length){const id=todo.shift();if(visited.has(id))continue;visited.add(id);todo.push(...rooms.find(r=>r.id===id).exits);}assert.equal(visited.size,rooms.length);}assert.ok(!ids.village.includes('workyard'));assert.ok(ids.town.includes('workyard'));assert.ok(!ids.town.includes('hall'));assert.ok(ids.city.includes('hall'));assert.deepEqual(s.hero,before.hero);assert.deepEqual(s.equipment,before.equipment);assert.deepEqual(s.realm.sites[s.locationId].merchant,before.realm.sites[s.locationId].merchant);roundtrip(s);
});
test('scarred lanes reroute a real connection and expose the repair yard',()=>{
 const s=fresh();s.realm.sites[s.locationId].phase='village';const p=s.world.locations.find(p=>p.id===s.locationId);p.status='scarred';const rooms=cityRooms(s);assert.match(rooms.find(r=>r.id==='workyard').description,/actual time/);assert.ok(!rooms.find(r=>r.id==='market').exits.includes('tavern'));assert.ok(!rooms.find(r=>r.id==='tavern').exits.includes('market'));assert.ok(rooms.find(r=>r.id==='market').exits.includes('gate'));assert.equal(E.getActions(s).some(a=>a.id==='atlas_room_workyard'),true);roundtrip(s);
});
test('a damaged lane cannot be crossed by a stale room command, and the public gate remains usable',()=>{
 let s=fresh();s.world.locations.find(p=>p.id===s.locationId).status='scarred';s=E.chooseAction(s,'atlas_room_tavern');assert.equal(s.cartography.interior.roomId,'tavern');assert.ok(!E.getActions(s).some(a=>a.id==='atlas_room_market'));const day=s.day,gold=s.hero.gold,blocked=E.chooseAction(s,'atlas_room_market');assert.deepEqual(blocked.cartography,s.cartography);s=E.chooseAction(s,'atlas_room_gate');s=E.chooseAction(s,'atlas_room_market');assert.equal(s.cartography.interior.roomId,'market');assert.equal(s.day,day);assert.equal(s.hero.gold,gold);roundtrip(s);
});
test('walking into the developed work yard spends no day or coin and uses actual service offers',()=>{
 let s=fresh();s.realm.sites[s.locationId].phase='town';const before=structuredClone(s);s=E.chooseAction(s,'atlas_room_workyard');assert.equal(s.cartography.interior.roomId,'workyard');assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);const html=renderSettlementList(s,{},uiHelpers);assert.match(html,/Work Yard|work yard|service-open/);assert.match(html,/scene-collection-c/);assert.ok(E.getActions(s).some(a=>/^career_|^realm_invest/.test(a.id)),'canonical service offers remain available through their actual provider');assert.deepEqual(s.equipment,before.equipment);roundtrip(s);
});
test('a funded wayhouse follows an actual completed institution and later shows its paused service',()=>{
 const s=buildWayhouse(),w=s.community.works.find(w=>w.kind==='road');let room=cityRooms(s).find(r=>r.id==='wayhouse');assert.ok(room?.operating);assert.match(room.description,new RegExp(String(w.fundedUntil)));assert.ok(communitySupport(s).roadRiskReduction>0);w.enabled=false;room=cityRooms(s).find(r=>r.id==='wayhouse');assert.equal(room.operating,false);assert.match(room.description,/paused/);assert.equal(communitySupport(s).roadRiskReduction,0);roundtrip(s);
});
test('destroyed or evacuated sites cannot offer civic rooms or ordinary services',()=>{
 for(const status of ['destroyed','evacuated']){const s=fresh();s.world.locations.find(p=>p.id===s.locationId).status=status;s.world.locations.find(p=>p.id===s.locationId).servicesAvailable=false;assert.deepEqual(cityRooms(s),[]);assert.ok(!E.getActions(s).some(a=>a.id.startsWith('atlas_room_')));}
});
test('an interior that loses its civic role returns safely to the existing gate context',()=>{
 const s=fresh();s.realm.sites[s.locationId].phase='city';s.cartography.interior={siteId:s.locationId,roomId:'hall'};roundtrip(s);s.realm.sites[s.locationId].phase='village';syncCartography(s);assert.equal(s.cartography.interior,null);const html=renderSettlementList(s,{},uiHelpers);assert.match(html,/Gate &amp; Streets|Gate & Streets/);roundtrip(s);
});
test('civic transitions use stable thresholds and publish a dated local change once',()=>{
 assert.equal(civicPhase(61,'village'),'village');assert.equal(civicPhase(62,'village'),'town');assert.equal(civicPhase(61,'town'),'town');assert.equal(civicPhase(55,'town'),'village');assert.equal(civicPhase(81,'town'),'town');assert.equal(civicPhase(82,'town'),'city');assert.equal(civicPhase(76,'city'),'city');assert.equal(civicPhase(75,'city'),'town');
 const s=fresh(),c=s.realm.sites[s.locationId];s.realm.wars=[];c.prosperity=100;c.phase='village';const initial=s.world.changes.filter(r=>r.locationId===s.locationId&&r.title==='The settlement’s public spaces change').length,old=s.day;s.day+=365;s.age++;onRealmTime(s,old,s.day,{journal(){}});assert.equal(c.phase,'city');assert.equal(c.lastDevelopment.from,'village');assert.equal(c.lastDevelopment.to,'city');const changes=s.world.changes.filter(r=>r.locationId===s.locationId&&r.title==='The settlement’s public spaces change');assert.equal(changes.length,initial+1);assert.ok(changes.at(-1).id.startsWith('civic-development-'));assert.equal(changes.at(-1).day,c.lastDevelopment.day);c.prosperity=100;const before=s.day;s.day+=365;s.age++;onRealmTime(s,before,s.day,{journal(){}});assert.equal(s.world.changes.filter(r=>r.locationId===s.locationId&&r.title==='The settlement’s public spaces change').length,initial+1);assert.equal(validateRealm(s.realm,s),true);
});
test('a forged civic transition date or unchanged phase cannot enter a saved life',()=>{
 const s=fresh(),c=s.realm.sites[s.locationId];c.lastDevelopment={from:'village',to:'city',day:s.day};roundtrip(s);c.lastDevelopment.day=s.day+1;assert.equal(E.validateSave(s),false);c.lastDevelopment.day=s.day;c.lastDevelopment.from='city';assert.equal(E.validateSave(s),false);
});
test('new street nodes have distinct, bounded positions in every seeded base layout',()=>{
 const s=fresh();for(let n=0;n<30;n++){s.locationId=s.world.locations[n%s.world.locations.length].id;const points=settlementLayout(s),values=Object.values(points);assert.equal(new Set(values.map(p=>p.join(','))).size,Object.keys(points).length);assert.equal(values.length,12);assert.ok(values.every(([x,y])=>x>=30&&x<=530&&y>=30&&y<=375));for(const id of ['workyard','hall','wayhouse'])assert.ok(Object.entries(points).filter(([key])=>key!==id).every(([,p])=>Math.hypot(p[0]-points[id][0],p[1]-points[id][1])>=60));}
});
test('three new original environment cells use the muted atlas and preserve existing images',()=>{
 const s=fresh();for(const [id,cell]of [['workyard',0],['hall',1],['wayhouse',2]])assert.deepEqual({...areaScene(s,{room:{id,operating:true}}),mood:null},{cell,collection:'c',mood:null});const bytes=readFileSync(new URL('../dist/art/settlement-atlas-v258.webp',import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'RIFF');const css=readFileSync(new URL('../dist/styles.css',import.meta.url),'utf8');assert.match(css,/\.area-illustration\.scene-collection-c/);assert.match(css,/settlement-atlas-v258\.webp/);assert.equal(areaScene(s,{room:{id:'archive'}}).collection,'a');
});
test('new road encounters snapshot current season/weather without rewriting older pending scenes',()=>{
 const s=pending(),a=s.travel.pending.account,w=worldCalendarContext(s.world,a.observedDay,s.seed);assert.equal(a.weather,w.weather);assert.equal(a.season,w.season);assert.ok(s.event.body.includes(w.weather));assert.ok(!s.event.body.includes('A cold squall'));const old=structuredClone(s);delete old.travel.pending.account;old.event.body='The exact older pending road account.';const saved=roundtrip(old);assert.equal(saved.event.body,'The exact older pending road account.');
});
test('road response history records actual attendance, named source and local choice',()=>{
 let s=pending('messenger');const person=s.travel.pending.person.name,from=s.timeline.journey.legs[0].from,to=s.timeline.journey.legs[0].to,before=s.day;s=E.chooseEventOption(s,'aid');assert.equal(s.day,before+1);const row=s.travel.history.at(-1);assert.equal(row.result,'aid');assert.equal(row.road.type,'messenger');assert.equal(row.road.from,from);assert.equal(row.road.to,to);assert.equal(row.road.personName,person);assert.match(row.road.label,/full day/);roundtrip(s);
});
test('a later encounter on the same road recalls its actual earlier resolution without awarding it again',()=>{
 let s=pending('weather');s=finish(s,'shelter');const prior=structuredClone(s.travel.history.at(-1));assert.equal(prior.result,'shelter');s=pending('bandits',s);s=finish(s,'avoid');s=pending('weather',s);assert.equal(s.travel.pending.account.previous?.day,prior.day);assert.equal(s.travel.pending.account.previous?.result,'shelter');assert.ok(s.event.body.includes(prior.road.label));assert.match(s.event.body,/Your road journal/);const history=s.travel.history.length,before=structuredClone(s);flushTravelEvent(s,context(s));assert.equal(s.travel.history.length,history);assert.deepEqual(s.hero,before.hero);roundtrip(s);
});
test('road memories cannot claim an unrecorded earlier outcome or a different road',()=>{
 const original=pending();for(const bad of ['future','road','unrecorded']){const s=structuredClone(original),a=s.travel.pending.account;if(bad==='future')a.observedDay=s.day+1;if(bad==='road')a.from=a.to;if(bad==='unrecorded')a.previous={day:s.day,result:'shelter',label:'A claimed earlier shelter',personName:null};assert.equal(E.validateSave(s),false);}roundtrip(original);
});
test('a different road or encounter type does not borrow another local memory',()=>{
 const s=pending(),p=s.travel.pending,leg=s.timeline.journey.legs[0],other=s.world.locations.find(row=>![leg.from,leg.to].includes(row.id)).id;
 s.travel.history.push({id:'other-road-account',day:s.day,locationId:s.locationId,title:'A different road',text:'An actual different road fixture.',result:'shelter',road:{version:1,type:'weather',from:leg.from,to:other,personName:null,label:'Waited on another road'}});assert.equal(captureRoadAccount(s,p).previous,null);s.travel.history.at(-1).road.to=leg.to;s.travel.history.at(-1).road.type='bandits';assert.equal(captureRoadAccount(s,p).previous,null);roundtrip(s);
});
test('legacy preparations retain all quoted options while current destination review is read-only',async t=>{
 const s=fresh(),destination=oneLeg(s),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','map');const before=ui.current();await ui.click('destination-select',destination);assert.ok(ui.root.querySelector('.destination-card-copy'));assert.deepEqual(ui.current(),before);
 const html=renderRoadPlanPanel(s,uiHelpers,{destinationId:destination});assert.match(html,/travel-plan-form/);for(const name of ['pace','supplies','scout','escort','night','routePreference'])assert.ok(html.includes('name="'+name+'"'));
 const after=E.updateTravelPlan(s,{pace:'cautious',supplies:true,scout:true,escort:true,night:true,routePreference:'safest'});assert.equal(after.travel.plan.pace,'cautious');assert.equal(after.travel.routePreference,'safest');for(const id of ['supplies','scout','escort','night'])assert.equal(after.travel.plan[id],true);assert.equal(after.hero.gold,s.hero.gold);assert.equal(after.day,s.day);assert.equal(after.timeline.journey,null);roundtrip(after);
});
test('production Explore retains road context through a response and continues from the map',async t=>{
 const s=pending(),destination=s.timeline.journey.destinationId,ui=await mountApp(t,{states:[s],storageEntries:[[`hearth-and-oath:workspace:${s.seed}:${s.dynasty.generation}`,JSON.stringify({tab:'map'})]]});await ui.click('title-continue');await ui.click('tab','map');assert.ok(ui.root.querySelector('[data-explore-journey]'));assert.ok(ui.root.querySelector('[aria-label="Journey Distance"]'));await ui.click('tab','life');await ui.click('choice','press');await ui.click('tab','map');assert.ok(ui.root.querySelector('[data-explore-journey]'));assert.ok(ui.root.querySelector('[data-op="journey-continue"]'));const before=ui.current();await ui.click('journey-continue');const after=ui.current();assert.equal(after.locationId,destination);assert.equal(after.day,before.day);assert.equal(after.hero.gold,before.hero.gold);assert.equal(after.timeline.journey,null);assert.equal(JSON.parse(ui.storage.getItem(`hearth-and-oath:workspace:${s.seed}:${s.dynasty.generation}`)).tab,'map');roundtrip(after);
});
test('production Explore resumes a zero-day interrupted response before continuing the paid journey',async t=>{
 const s=pending();s.event=null;assert.ok(applyTravelChoice(s,'travel_weather','shelter',context(s,0)));roundtrip(s);const ui=await mountApp(t,{states:[s],storageEntries:[[`hearth-and-oath:workspace:${s.seed}:${s.dynasty.generation}`,JSON.stringify({tab:'map'})]]});await ui.click('title-continue');await ui.click('tab','life');assert.match(ui.root.innerHTML,/Another 1 attended response day remains/);const day=s.day,paid=s.timeline.journey.departureCost;await ui.click('choice','continue');const after=ui.current();assert.equal(after.day,day+1);assert.equal(after.travel.pending,null);assert.equal(after.timeline.journey.departureCost,paid);assert.equal(after.travel.history.at(-1).result,'shelter');assert.ok(ui.root.querySelector('[data-op="activity"][data-id="grow_continue_journey"]'));roundtrip(after);
});
test('production area selection enters a real civic room, keeps free walking and shows its original illustration',async t=>{
 const s=fresh();s.realm.sites[s.locationId].phase='city';const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','map');await ui.click('place-open');const node=ui.root.querySelector('[data-op="place-area"][data-id="hall"]');assert.ok(node&&!node.disabled);await ui.fire('click',node);assert.equal(ui.current().cartography.interior.roomId,'hall');assert.equal(ui.current().day,s.day);assert.equal(ui.current().hero.gold,s.hero.gold);assert.match(ui.root.innerHTML,/scene-collection-c/);assert.match(ui.root.innerHTML,/Assembly Hall|assembly hall|Civic Hall/);roundtrip(ui.current());
});
