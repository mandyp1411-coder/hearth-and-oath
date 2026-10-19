import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,findRoute} from '../dist/js/world.js';
import {renderWorldMap,getMapMovement,animateMapMovement} from '../dist/js/map.js';
const state=()=>({seed:'map-test',world:generateWorld('map-test',{expanded:true}),locationId:'home',age:18,timeline:{mode:'birth'},hero:{name:'Rowan',appearance:{}},phase:'adult'});
test('map contains real selectable sites, current portrait pawn, route preview, and damage/quest marks',()=>{
  const s=state();s.world.locations.find(l=>l.id==='city').status='destroyed';
  const html=renderWorldMap(s,{selectedId:'city',quests:[{status:'active',locationId:'citadel'}]});
  assert.equal((html.match(/data-op="map-select"/g)||[]).length,s.world.locations.length);
  assert.match(html,/data-map-piece/);assert.match(html,/data-location-id="home"/);assert.match(html,/map-selected-route/);assert.match(html,/destroyed/);assert.match(html,/active quest/);assert.match(html,/map-pawn/);assert.match(html,/map-biome forest/);
});
test('rendered labels are escaped and unavailable old map data has an honest five-site fallback',()=>{
  const s=state();s.world.name='<script>alert(1)</script>';s.world.locations[0].name='" onclick="evil()';
  const html=renderWorldMap(s);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);assert.match(html,/&quot; onclick=&quot;evil/);
  s.world=generateWorld('legacy');delete s.world.map;assert.equal((renderWorldMap(s).match(/data-op="map-select"/g)||[]).length,5);
});
test('movement records actual completed waypoints, not birthdays or uncompleted partial legs',()=>{
  const before=state(),after=structuredClone(before);after.age=19;assert.equal(getMapMovement(before,after),null);
  const route=findRoute(before.world,'home','mountain');after.locationId=route.at(-1);after.timeline.lastJourney={route};assert.deepEqual(getMapMovement(before,after),{route,from:'home',to:after.locationId});
  const partial=structuredClone(before);partial.timeline.journey={route,legProgress:1,traversedIds:['home']};assert.equal(getMapMovement(before,partial),null);
  if(route.length>2){partial.locationId=route[1];partial.timeline.journey.traversedIds=route.slice(0,2);assert.deepEqual(getMapMovement(before,partial).route,route.slice(0,2));}
});
test('animation is safe with no board or no travel',async()=>{
  await animateMapMovement(null,null);await animateMapMovement({querySelectorAll:()=>[]},{route:['home','city'],from:'home',to:'city'});
});
test('building markers come only from sound completed structures at actual operating sites',()=>{
  const s=state();
  s.workshop={project:{kind:'build',type:'garden',locationId:'brook'},structures:[
    {id:'home_shelter',type:'shelter',locationId:'home',level:1,completedDay:1,condition:'sound'},
    {id:'home_forge',type:'forge',locationId:'home',level:2,completedDay:2,condition:'sound'},
    {id:'city_study',type:'study',locationId:'city',level:1,completedDay:3,condition:'damaged'},
    {id:'brook_cottage',type:'cottage',locationId:'brook',level:1,completedDay:4,condition:'lost'},
    {id:'ghost_refuge',type:'refuge',locationId:'ghost',level:1,completedDay:5,condition:'sound'},
  ]};
  let html=renderWorldMap(s);
  assert.equal((html.match(/data-map-building-count/g)||[]).length,1);
  assert.match(html,/data-map-building-count="2"/);
  assert.match(html,/your shelter, forge/);
  assert.match(html,/forge level 2/);
  assert.match(html,/Your buildings/);
  s.world.locations.find(l=>l.id==='home').status='destroyed';
  html=renderWorldMap(s);
  assert.equal((html.match(/data-map-building-count/g)||[]).length,0);
});
