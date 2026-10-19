import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,expandWorld,findRoute,travelPreview,validateWorld,BIRTHPLACES,resolveBirthplace,generatePersonName,worldCalendarContext} from '../dist/js/world.js';

test('legacy regions retain five sites; expanded seeds create thirteen required places, optional settlements and real geometry',()=>{
  const legacy=generateWorld('old');assert.equal(legacy.locations.length,5);assert.equal(validateWorld(legacy),true);
  for(let i=0;i<100;i++){
    const world=generateWorld(`journey-${i}`,{expanded:true});
    assert.ok(world.locations.length>=73&&world.locations.length<=80);assert.equal(validateWorld(world),true);
    for(const location of world.locations) assert.ok(findRoute(world,'home',location.id).length>0);
  }
  const a=generateWorld('first',{expanded:true}),b=generateWorld('second',{expanded:true});
  assert.deepEqual(a,generateWorld('first',{expanded:true}));
  assert.notDeepEqual(a.map.nodes,b.map.nodes);assert.notDeepEqual(a.map.terrain,b.map.terrain);assert.notDeepEqual(a.roads,b.roads);
});
test('migration is additive and independent, preserving local names, laws, damage and original roads',()=>{
  const old=generateWorld('ancestral');old.locations[0].name='My old home';old.locations[0].status='destroyed';old.locations[0].description='A remembered loss.';
  old.changes=[{id:'loss',day:30,locationId:'home',title:'A loss',text:'The homes burned.'}];
  const original=structuredClone(old),next=expandWorld(old,'ancestral');
  assert.deepEqual(old,original);assert.equal(next.locations.length,13);assert.equal(next.locations[0].name,'My old home');assert.equal(next.locations[0].status,'destroyed');assert.equal(next.locations[0].description,'A remembered loss.');assert.equal(next.laws,old.laws);
  for(const road of old.roads) assert.ok(next.roads.some(r=>r.from===road.from&&r.to===road.to));
  assert.deepEqual(next.changes,old.changes);assert.equal(validateWorld(next),true);assert.deepEqual(expandWorld(next,'ancestral'),next);
});
test('routing uses shortest actual road cost rather than visual distance or hop count',()=>{
  const world=generateWorld('routes');world.roads=[{from:'home',to:'city',days:8},{from:'home',to:'brook',days:1},{from:'brook',to:'forest',days:1},{from:'forest',to:'city',days:1},{from:'forest',to:'ruin',days:2}];
  assert.deepEqual(findRoute(world,'home','city'),['home','brook','forest','city']);
  assert.deepEqual(findRoute(world,'city','home'),['city','forest','brook','home']);
  assert.deepEqual(findRoute(world,'home','home'),['home']);assert.deepEqual(findRoute(world,'home','missing'),[]);
  world.roads.find(r=>r.to==='ruin').closed=true;assert.deepEqual(findRoute(world,'home','ruin'),[]);
});
test('birth travel shows exact leg cost and real gates; damaged places remain reachable without services',()=>{
  const world=generateWorld('new-life',{expanded:true});const state={world,locationId:'home',timeline:{mode:'birth'},age:14,phase:'childhood'};
  let preview=travelPreview(state,'citadel');assert.equal(preview.disabledReason,undefined);assert.equal(preview.days,preview.legs.reduce((sum,leg)=>sum+leg.days,0));assert.equal(preview.route[0],'home');assert.equal(preview.route.at(-1),'citadel');
  assert.match(travelPreview({...state,age:13},'city').disabledReason,/fourteen/);
  assert.match(travelPreview({...state,event:{id:'decision'}},'city').disabledReason,/Resolve/);
  world.locations.find(l=>l.id==='citadel').status='destroyed';preview=travelPreview(state,'citadel');assert.ok(preview.route.length>1);assert.deepEqual(preview.services,[]);assert.match(preview.description,/destroyed/);
  const legacy=travelPreview({...state,age:18,phase:'adult',timeline:{mode:'legacy'}},'ruin');assert.equal(legacy.days,world.locations.find(l=>l.id==='ruin').travelDays);
});
test('world validation rejects broken geometry, invalid status and disconnected routes',()=>{
  const base=generateWorld('validation',{expanded:true});
  const badNode=structuredClone(base);badNode.map.nodes[0].x=2000;assert.equal(validateWorld(badNode),false);
  const badStatus=structuredClone(base);badStatus.locations[0].status='vanished';assert.equal(validateWorld(badStatus),false);
  const badRoad=structuredClone(base);badRoad.roads=[];assert.equal(validateWorld(badRoad),false);
  const repeated=structuredClone(base);repeated.map.nodes[1].id=repeated.map.nodes[0].id;assert.equal(validateWorld(repeated),false);
});
test('travel controls wait for actual replies, journeys, and projects without changing the advertised route or cost',()=>{
  const state={world:generateWorld('travel-gates',{expanded:true}),locationId:'home',timeline:{mode:'birth',journey:null},age:18,phase:'adult'};
  const open=travelPreview(state,'citadel');
  assert.equal(open.disabledReason,undefined);
  for(const waiting of [
    {...state,conversations:{pending:{personId:'kin'}}},
    {...state,timeline:{...state.timeline,journey:{destinationId:'city'}}},
    {...state,workshop:{project:{locationId:'home',remainingDays:2}}},
  ]){
    const before=structuredClone(waiting),preview=travelPreview(waiting,'citadel');
    assert.ok(preview.disabledReason);
    assert.deepEqual(preview.route,open.route);
    assert.deepEqual(preview.legs,open.legs);
    assert.equal(preview.days,open.days);
    assert.deepEqual(waiting,before);
  }
  assert.equal(travelPreview({...state,conversations:{pending:null},workshop:{project:null}},'citadel').disabledReason,undefined);
});


test('all twelve birthplaces are present in every fresh region, and random origins are repeatable',()=>{
  assert.equal(BIRTHPLACES.length,12);
  const seen=new Set();
  for(let i=0;i<120;i++) {
    const seed=`birthplace-${i}`,w=generateWorld(seed,{expanded:true});
    for(const row of BIRTHPLACES){assert.ok(w.locations.some(l=>l.id===row.locationId));assert.ok(['village','city'].includes(row.origin));assert.deepEqual(resolveBirthplace(row.id,seed),row);}
    const origin=resolveBirthplace('random',seed);seen.add(origin.id);assert.deepEqual(origin,resolveBirthplace('random',seed));
  }
  assert.equal(seen.size,12);
  assert.equal(resolveBirthplace('home').id,'village');
});

test('fresh seeds change actual topology, optional places, geography and regional seasons',()=>{
  const graphs=new Set(),sites=new Set(),profiles=new Set(),coordinates=new Set();
  for(let i=0;i<120;i++){
    const seed=`varied-topology-${i}`,w=generateWorld(seed,{expanded:true});
    graphs.add(w.roads.map(r=>[r.from,r.to].sort().join('-')).sort().join(','));
    sites.add(w.locations.slice(13).map(l=>l.id).sort().join(','));
    coordinates.add(JSON.stringify(w.map.nodes));profiles.add(w.environment.profileId);
    assert.deepEqual(w,generateWorld(seed,{expanded:true}));
    for(const site of w.locations){assert.ok(findRoute(w,'city',site.id).length);assert.ok(site.localCustom);}
    const spring=worldCalendarContext(w,0,seed),winter=worldCalendarContext(w,300,seed);
    assert.notEqual(spring.season,winter.season);assert.equal(spring.climate,w.environment.climate);
    assert.deepEqual(worldCalendarContext(w,7,seed),worldCalendarContext(w,7,seed));
  }
  assert.equal(graphs.size,120);assert.ok(sites.size>60);assert.equal(coordinates.size,120);assert.equal(profiles.size,6);
});

test('complete saved worlds keep every site, road, terrain point and local fact on expansion',()=>{
  for(const world of [expandWorld(generateWorld('remembered-old'),'remembered-old'),generateWorld('remembered-new',{expanded:true})]) {
    world.locations[0].status='scarred';world.map.nodes[0].x+=1;world.roads[0].days=9;
    const before=structuredClone(world),next=expandWorld(world,'a-different-seed');
    assert.deepEqual(next,before);assert.deepEqual(world,before);assert.equal(validateWorld(next),true);
  }
});

test('fresh people draw from combined names without changing seeded identity on reload',()=>{
  const names=new Set();
  for(let i=0;i<1000;i++){const seed=`names-${i}`,n=generatePersonName(seed,'neighbor');names.add(n);assert.equal(n,generatePersonName(seed,'neighbor'));assert.ok(n.includes(' '));}
  assert.ok(names.size>970);
});
