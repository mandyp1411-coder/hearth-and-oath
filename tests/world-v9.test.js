import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateWorld,expandWorld,findRoute,validateWorld} from '../dist/js/world.js';

function inside([x,y],points){let result=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;}return result;}
function isLand(world,point){return world.map.atlas.landmasses.some(l=>inside(point,l.points))&&!world.map.terrain.some(t=>t.type==='water'&&inside(point,t.points));}

test('one hundred fresh atlases vary landform, shore, positions and connected playable routes',()=>{
  const topologies=new Set(),shores=new Set(),positions=new Set(),homeAreas=new Set(),graphs=new Set();
  for(let i=0;i<100;i++){
    const seed=`atlas-validation-${i}`,world=generateWorld(seed,{expanded:true}),map=world.map;
    assert.equal(map.generationVersion,7);assert.equal(validateWorld(world),true,seed);
    assert.deepEqual(world,generateWorld(seed,{expanded:true}));
    topologies.add(map.atlas.topology);shores.add(JSON.stringify(map.atlas.landmasses));positions.add(JSON.stringify(map.nodes));
    const home=map.nodes.find(n=>n.id==='home');homeAreas.add(`${Math.floor(home.x/150)}:${Math.floor(home.y/150)}`);
    graphs.add(world.roads.map(r=>[r.from,r.to].sort().join(':')).sort().join(','));
    for(const site of world.locations){assert.ok(findRoute(world,'home',site.id).length,`${seed}:${site.id}`);const n=map.nodes.find(n=>n.id===site.id);assert.ok(isLand(world,[n.x,n.y]),`${seed}:${site.id} occupies land`);}
    for(let j=0;j<map.nodes.length;j++)for(let k=j+1;k<map.nodes.length;k++){const a=map.nodes[j],b=map.nodes[k];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=24,`${seed}: legible site separation`);}
  }
  assert.equal(topologies.size,6);assert.equal(shores.size,100);assert.equal(positions.size,100);assert.equal(graphs.size,100);assert.ok(homeAreas.size>=8,'homes vary within the designed heartlands rather than scattering across arbitrary terrain');
});

test('saved road polylines end at the real places and water crossings describe actual water',()=>{
  let ferryCount=0,islandWorlds=0;
  for(let i=0;i<100;i++){
    const world=generateWorld(`road-atlas-${i}`,{expanded:true});
    if(world.map.atlas.topology==='island-chain')islandWorlds++;
    for(const road of world.roads){
      const a=world.map.nodes.find(n=>n.id===road.from),b=world.map.nodes.find(n=>n.id===road.to);
      assert.deepEqual(road.points[0],[a.x,a.y]);assert.deepEqual(road.points.at(-1),[b.x,b.y]);assert.ok(road.points.length>=2&&road.points.length<=80,'terrain-aware road has bounded actual waypoints');
      const surveyed=road.points.flatMap((p,i)=>{if(!i)return [p];const a=road.points[i-1],steps=Math.max(1,Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/6));return Array.from({length:steps},(_,j)=>[a[0]+(p[0]-a[0])*(j+1)/steps,a[1]+(p[1]-a[1])*(j+1)/steps]);});
      const water=surveyed.some(p=>!isLand(world,p));assert.equal(road.crossing,water?'water':'land');
      if(water){ferryCount++;assert.equal(road.kind,'ferry crossing');}
      assert.ok(Number.isInteger(road.days)&&road.days>0);assert.ok(findRoute(world,road.from,road.to).length>=2);
    }
    if(world.map.atlas.topology==='island-chain')assert.ok(world.roads.some(r=>r.crossing==='water'),'islands have real water connections');
  }
  assert.ok(ferryCount>20);assert.ok(islandWorlds>5);
});

test('river basins have joining tributaries; archipelagos have separate landmasses; lake worlds keep settlements dry',()=>{
  const found=new Map();
  for(let i=0;found.size<6&&i<100;i++){const w=generateWorld(`landform-${i}`,{expanded:true});found.set(w.map.atlas.topology,w);}
  assert.equal(found.size,6);
  const basin=found.get('river-basin').map.atlas;assert.equal(basin.rivers.length,2);assert.ok(basin.rivers[0].points.some(p=>JSON.stringify(p)===JSON.stringify(basin.rivers[1].points.at(-1))));
  assert.equal(found.get('island-chain').map.atlas.landmasses.length,3);
  for(const type of ['highland','wooded-basin']){const world=found.get(type),lake=world.map.terrain.find(t=>t.id==='deep-lake');assert.ok(lake);assert.ok(world.map.nodes.every(n=>!inside([n.x,n.y],lake.points)));}
});

test('new atlas validation rejects malformed coastlines, rivers, labels and road endpoints',()=>{
  const base=generateWorld('atlas-validation-72',{expanded:true});
  for(const mutate of [
    w=>{delete w.map.atlas;},
    w=>{w.map.atlas.topology='unmapped';},
    w=>{w.map.atlas.landmasses[0].points=[[0,0],[1,1]];},
    w=>{w.map.atlas.rivers[0].points[0][1]=701;},
    w=>{w.map.atlas.rivers[0].width=200;},
    w=>{w.map.atlas.regions[0].x=Infinity;},
    w=>{w.roads[0].points[0]=[0,0];},
    w=>{w.roads[0].crossing='teleport';},
  ]){const bad=structuredClone(base);mutate(bad);assert.equal(validateWorld(bad),false);}
});

test('genuine previous-version geography and fresh atlases retain exact saved geometry on migration',()=>{
  const old=JSON.parse(readFileSync(new URL('./fixtures/v8-community-before-birthday.json',import.meta.url),'utf8')).world;
  assert.equal(old.map.generationVersion,4);assert.equal(validateWorld(old),true);
  const before=structuredClone(old);assert.deepEqual(expandWorld(old,'different-future-seed'),before);assert.deepEqual(old,before);
  const current=generateWorld('map-continuity-v9',{expanded:true});current.locations[0].status='destroyed';current.roads[0].closed=true;
  const snapshot=structuredClone(current);assert.deepEqual(expandWorld(current,'another-future'),snapshot);assert.deepEqual(current,snapshot);
});

test('local histories use observed details rather than repeating the region summary in every settlement',()=>{
  const a=generateWorld('place-stories-a',{expanded:true}),b=generateWorld('place-stories-b',{expanded:true});
  for(const site of a.locations)assert.ok(!site.description.includes(a.environment.pressure));
  assert.notEqual(a.locations.find(l=>l.id==='city').description,b.locations.find(l=>l.id==='city').description);
  assert.ok(a.map.atlas.rivers.every(r=>r.name.length>0));assert.ok(a.map.atlas.landmasses.every(r=>r.name.length>0));
});
