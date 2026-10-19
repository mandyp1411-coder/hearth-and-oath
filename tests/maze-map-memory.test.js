import test from 'node:test';
import assert from 'node:assert/strict';
import { MAZE_MAP_LIMITS, MAZE_MAP_MARKS, mazeMapIdentity, sameMazeMapIdentity,
  validateMazeMapMemory, editMazeMapMemory } from '../dist/js/maze-map-memory.js';
import { projectVisitedMazeGraph, shortestVisitedMazeRoute } from '../dist/js/maze-known-route.js';

const copy=value=>structuredClone(value);
function fixture(version=1){
  const m={version,id:'maze-1',seed:'world:maze:1:authored:cistern:home:1',generation:1,
    kind:'authored',sourceId:'cistern',locationId:'home',position:0,previous:0,
    visited:[0,1,2,11,12,13],cleared:[0,1,2,11,12,13],objective:false,startedDay:10};
  const context={day:12,generation:1,editingAllowed:true,actor:{id:'person-a',name:'Aster',generation:1}};
  const kinds={0:'entrance'};
  const rules={kindAt:(_m,id)=>kinds[id]||'empty',validActor:id=>['person-a','person-b'].includes(id),
    contentIdentity:run=>({mazeId:run.id,runSeed:run.seed,runGeneration:run.generation,
      manifestVersion:1,family:'authored',sourceId:run.sourceId,locationId:run.locationId})};
  return {m,context,kinds,rules};
}
function request(m,rules,extra={}){return {identity:mazeMapIdentity(m,rules),roomId:1,mark:'revisit',note:'Try the dry way',...extra};}
function save(f,extra={}){
  const result=editMazeMapMemory(f.m,request(f.m,f.rules,extra),f.context,f.rules);assert.equal(result.ok,true);
  if(result.mapMemory)f.m.mapMemory=result.mapMemory;else delete f.m.mapMemory;return result;
}
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function layout(edges){
  const cells=Array.from({length:121},(_,id)=>({id,x:id%11,y:Math.floor(id/11),doors:[]}));
  for(const [a,b] of edges){cells[a].doors.push(b);cells[b].doors.push(a);}return {size:11,cells};
}
function graph(f,edges,options={}){
  return projectVisitedMazeGraph(f.m,layout(edges),{kindAt:f.rules.kindAt,firstStepIds:[1,11],markedRooms:[2],...options});
}

test('legacy absence stays absent and read/edit functions are pure',()=>{
  for(const version of [1,2]){
    const f=fixture(version),before=copy(f.m);freeze(f.m);freeze(f.context);
    assert.equal(validateMazeMapMemory(f.m,f.context,f.rules),true);
    assert.equal(sameMazeMapIdentity(mazeMapIdentity(f.m,f.rules),f.m,f.rules),true);
    const result=editMazeMapMemory(f.m,request(f.m,f.rules),f.context,f.rules);
    assert.equal(result.ok,true);assert.deepEqual(f.m,before);assert.equal(f.m.mapMemory,undefined);
    assert.equal(validateMazeMapMemory({...f.m,mapMemory:result.mapMemory},f.context,f.rules),true);
  }
});

test('v2 requires full injected provenance without importing content runtime',()=>{
  const f=fixture(2);assert.equal(mazeMapIdentity(f.m),null);
  assert.equal(mazeMapIdentity(f.m,{contentIdentity:()=>({manifestVersion:1,family:'authored'})}),null);
  const identity=mazeMapIdentity(f.m,f.rules);assert.equal(identity.manifestVersion,1);assert.equal(identity.family,'authored');
  assert.equal(identity.floor,1);assert.equal(identity.mazeVersion,2);assert.equal(Object.hasOwn(f.m,'content'),false);
  for(const [key,value] of Object.entries({mazeId:'maze-2',runSeed:'another',runGeneration:2,sourceId:'other',locationId:'away',
    kind:'regional',mazeVersion:1,floor:2,manifestVersion:2,family:'signature'})){
    assert.equal(sameMazeMapIdentity({...identity,[key]:value},f.m,f.rules),false,key);
  }
  assert.equal(sameMazeMapIdentity({...identity,extra:true},f.m,f.rules),false);
});

test('edits normalize plain text, sort cells and preserve untouched provenance',()=>{
  const f=fixture();save(f,{roomId:12,note:'  north\n\twall  '});
  assert.equal(f.m.mapMemory.entries[0].note,'north wall');
  const previous=copy(f.m.mapMemory.entries[0]);f.context.day=14;f.context.actor={id:'person-b',name:'Birch',generation:1};
  save(f,{roomId:1,note:'<img src=x onerror="run()"> & \'quoted\''});
  assert.deepEqual(f.m.mapMemory.entries.map(row=>row.roomId),[1,12]);
  assert.deepEqual(f.m.mapMemory.entries[1],previous);assert.equal(f.m.mapMemory.entries[0].authorId,'person-b');
  assert.equal(f.m.mapMemory.entries[0].day,14);assert.match(f.m.mapMemory.entries[0].note,/<img/,'text remains inert data, escaped by UI owner');
  assert.equal(validateMazeMapMemory(f.m,f.context,f.rules),true);
});

test('all marker kinds exist and return stair eligibility uses injected effective kind',()=>{
  assert.deepEqual(MAZE_MAP_MARKS,['danger','cache','revisit','return-stair']);
  const f=fixture();assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{mark:'return-stair'}),f.context,f.rules).reason,'not-a-stair');
  save(f,{roomId:0,mark:'return-stair',note:''});
  f.kinds[1]='objective';assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{mark:'return-stair'}),f.context,f.rules).ok,false);
  f.m.objective=true;save(f,{mark:'return-stair'});assert.equal(validateMazeMapMemory(f.m,f.context,f.rules),true);
});

test('notes and entries are bounded, existing entries remain editable at capacity',()=>{
  const f=fixture();f.m.visited=Array.from({length:40},(_,id)=>id);
  for(let roomId=0;roomId<MAZE_MAP_LIMITS.entries;roomId++)save(f,{roomId,note:'x'.repeat(160)});
  const before=copy(f.m);assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{roomId:32}),f.context,f.rules).reason,'full');
  assert.deepEqual(f.m,before);save(f,{roomId:4,note:'updated'});
  assert.equal(f.m.mapMemory.entries.find(row=>row.roomId===4).note,'updated');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{note:'x'.repeat(161)}),f.context,f.rules).reason,'invalid-note');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{note:'😀'.repeat(81)}),f.context,f.rules).reason,'invalid-note');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{note:'\u0000'}),f.context,f.rules).reason,'invalid-note');
});

test('empty edit removes only selected row and final deletion removes optional field',()=>{
  const f=fixture();save(f);save(f,{roomId:12,mark:null,note:'note only'});
  save(f,{roomId:1,mark:null,note:'   '});assert.deepEqual(f.m.mapMemory.entries.map(row=>row.roomId),[12]);
  save(f,{roomId:12,mark:null,note:''});assert.equal(Object.hasOwn(f.m,'mapMemory'),false);
});

test('stale, unseen, paused and malformed edit requests fail without mutation',()=>{
  const f=fixture(),before=copy(f.m);
  for(const roomId of [3,-1,121,'1',1.5])assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{roomId}),f.context,f.rules).reason,'unvisited-room');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{identity:{...mazeMapIdentity(f.m,f.rules),runSeed:'old'}}),f.context,f.rules).reason,'stale-run');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules),{...f.context,editingAllowed:false},f.rules).reason,'paused');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules),{...f.context,generation:undefined},f.rules).reason,'invalid-context');
  assert.equal(editMazeMapMemory(f.m,request(f.m,f.rules,{mark:'treasure'}),f.context,f.rules).reason,'invalid-entry');
  assert.deepEqual(f.m,before);
});

test('validator rejects corrupt schemas, identities, bounds and provenance',()=>{
  const f=fixture();save(f);const good=copy(f.m);
  const bad=[m=>m.mapMemory.extra=true,m=>m.mapMemory.version=2,m=>m.mapMemory.identity.runSeed='wrong',
    m=>m.mapMemory.entries=[],m=>m.mapMemory.entries.push(copy(m.mapMemory.entries[0])),
    m=>m.mapMemory.entries[0].extra=true,m=>m.mapMemory.entries[0].roomId=3,
    m=>m.mapMemory.entries[0].note='x'.repeat(161),m=>m.mapMemory.entries[0].note='line\u2028break',
    m=>m.mapMemory.entries[0].note=' two  spaces ',m=>m.mapMemory.entries[0].mark='unknown',
    m=>{m.mapMemory.entries[0].note='';m.mapMemory.entries[0].mark=null;},
    m=>m.mapMemory.entries[0].authorId='unknown',m=>m.mapMemory.entries[0].authorName='',
    m=>m.mapMemory.entries[0].authorGeneration=2,m=>m.mapMemory.entries[0].day=9,
    m=>m.mapMemory.entries[0].day=13,m=>m.mapMemory.entries[0].mark='return-stair'];
  for(const corrupt of bad){const m=copy(good);corrupt(m);assert.equal(validateMazeMapMemory(m,f.context,f.rules),false,corrupt.toString());}
  assert.equal(validateMazeMapMemory(good,f.context,f.rules),true);
});

test('run clone/reentry/reload and inherited v2 notes retain historical authors',()=>{
  const f=fixture(2);save(f);const archived=JSON.parse(JSON.stringify({...f.m,status:'unfinished',endedDay:15}));
  const reentered={...copy(archived),position:0,previous:0,status:'inside'};delete reentered.endedDay;
  const context={...f.context,day:100,generation:2,actor:{id:'person-b',name:'Birch',generation:2}};
  assert.equal(validateMazeMapMemory(reentered,context,f.rules),true);
  assert.equal(reentered.mapMemory.entries[0].authorId,'person-a');assert.equal(reentered.mapMemory.entries[0].day,12);
  const result=editMazeMapMemory(reentered,request(reentered,f.rules,{roomId:12}),context,f.rules);
  assert.equal(result.ok,true);assert.equal(result.mapMemory.entries[0].authorId,'person-a');
  assert.equal(result.mapMemory.entries[1].authorGeneration,2);assert.equal(result.mapMemory.entries[1].authorId,'person-b');
  assert.equal(validateMazeMapMemory({...reentered,mapMemory:result.mapMemory},context,f.rules),true);
});

test('BFS gives shortest known route with stable compass ties and no state effects',()=>{
  const f=fixture(),snapshot=graph(f,[[0,11],[11,12],[12,13],[13,2],[0,1],[1,2]]),before=copy(snapshot);
  freeze(snapshot);assert.deepEqual(shortestVisitedMazeRoute(snapshot,2),{status:'found',path:[0,1,2],directions:['east','east'],walks:2});
  assert.deepEqual(snapshot,before);
  const tie=graph(f,[[0,11],[11,12],[12,13],[13,2],[0,1],[1,12]],{markedRooms:[12]});
  assert.deepEqual(shortestVisitedMazeRoute(tie,12).path,[0,1,12]);
});

test('unseen shortcut and one-way/noncardinal/wrapped edges are never used',()=>{
  const f=fixture();f.m.visited=[0,1,2,12,13];f.m.cleared=[0,1,2,12,13];
  const unknownShortcut=graph(f,[[0,11],[11,12],[0,1],[1,2],[2,13],[13,12]],{markedRooms:[12]});
  assert.deepEqual(shortestVisitedMazeRoute(unknownShortcut,12).path,[0,1,2,13,12]);
  const broken=graph(f,[[0,2]],{markedRooms:[2]});assert.equal(shortestVisitedMazeRoute(broken,2).status,'no-known-route');
  const oneWay=layout([[0,1],[1,2]]);oneWay.cells[1].doors=oneWay.cells[1].doors.filter(id=>id!==0);
  const g=projectVisitedMazeGraph(f.m,oneWay,{kindAt:f.rules.kindAt,firstStepIds:[1],markedRooms:[2]});
  assert.equal(shortestVisitedMazeRoute(g,2).status,'no-known-route');
  f.m.visited=[10,11];f.m.cleared=[10,11];f.m.position=10;f.m.previous=10;
  const wrapped=graph(f,[[10,11]],{firstStepIds:[11],markedRooms:[11]});assert.equal(shortestVisitedMazeRoute(wrapped,11).status,'no-known-route');
});

test('projection never reads fog cells or asks effective kind for unvisited rooms',()=>{
  const f=fixture(),l=layout([[0,1],[1,2],[0,11],[2,3]]),seen=[];
  for(let id=0;id<121;id++)if(!f.m.visited.includes(id))Object.defineProperty(l.cells,id,{get(){throw new Error('fog read '+id);}});
  const g=projectVisitedMazeGraph(f.m,l,{kindAt:(m,id)=>{assert.ok(m.visited.includes(id));seen.push(id);return f.rules.kindAt(m,id);},
    firstStepIds:[1,11],markedRooms:[2,3]});
  assert.deepEqual(seen,f.m.visited.slice().sort((a,b)=>a-b));assert.deepEqual(g.markedRooms,[2]);
  assert.equal(shortestVisitedMazeRoute(g,3).status,'invalid-target');
  assert.ok(g.nodes.every(node=>node.doors.every(id=>f.m.visited.includes(id))));
});

test('unresolved effective danger blocks target and traversal without auto-resolution',()=>{
  for(const kind of ['enemy','guardian','trap']){
    const f=fixture(2);f.kinds[1]=kind;f.m.cleared=f.m.cleared.filter(id=>id!==1);
    const g=graph(f,[[0,1],[1,2]],{markedRooms:[1,2]});
    assert.equal(shortestVisitedMazeRoute(g,1).status,'blocked-danger');assert.equal(shortestVisitedMazeRoute(g,2).status,'no-known-route');
    f.m.cleared.push(1);assert.equal(shortestVisitedMazeRoute(graph(f,[[0,1],[1,2]]),2).status,'found');
    assert.equal(f.kinds[1],kind,'advice never resolves danger');
  }
});

test('non-dangerous v2 witness and dilemma overlay kinds remain navigable',()=>{
  for(const kind of ['witness','dilemma']){
    const f=fixture(2);f.kinds[1]=kind;f.m.cleared=f.m.cleared.filter(id=>id!==1);
    assert.equal(shortestVisitedMazeRoute(graph(f,[[0,1],[1,2]]),2).status,'found');
  }
});

test('blocked current room permits only enabled previous-door first step',()=>{
  const f=fixture();f.kinds[0]='trap';f.m.cleared=f.m.cleared.filter(id=>id!==0);f.m.previous=11;
  const edges=[[0,1],[1,2],[0,11],[11,12],[12,13],[13,2]];
  assert.deepEqual(shortestVisitedMazeRoute(graph(f,edges),2).path,[0,11,12,13,2]);
  assert.equal(shortestVisitedMazeRoute(graph(f,edges,{firstStepIds:[1]}),2).status,'no-known-route');
  f.kinds[12]='enemy';f.m.cleared=f.m.cleared.filter(id=>id!==12);
  assert.equal(shortestVisitedMazeRoute(graph(f,edges),2).status,'no-known-route','previous exception does not apply to intermediate danger');
});

test('paused, missing enabled first step, unmarked, already-here and disconnected statuses',()=>{
  const f=fixture(),edges=[[0,1],[1,2]];
  assert.equal(shortestVisitedMazeRoute(graph(f,edges,{paused:true}),2).status,'paused');
  assert.equal(shortestVisitedMazeRoute(graph(f,edges,{firstStepIds:[]}),2).status,'no-known-route');
  assert.equal(shortestVisitedMazeRoute(graph(f,edges,{markedRooms:[]}),2).status,'invalid-target');
  assert.equal(shortestVisitedMazeRoute(graph(f,[],{markedRooms:[2]}),2).status,'no-known-route');
  assert.deepEqual(shortestVisitedMazeRoute(graph(f,edges,{markedRooms:[0],paused:true}),0),
    {status:'already-here',path:[0],directions:[],walks:0});
});

test('malformed and oversized snapshots fail closed within the 121-room bound',()=>{
  const f=fixture();const good=graph(f,[[0,1],[1,2]]);
  for(const g of [null,{...good,nodes:Array(122).fill(good.nodes[0])},{...good,nodes:[...good.nodes,good.nodes[0]]},
    {...good,position:121},{...good,markedRooms:[120]},{...good,firstStepIds:[120]},
    {...good,nodes:good.nodes.map((n,i)=>i? n:{...n,x:11})}])assert.equal(shortestVisitedMazeRoute(g,2).status,'invalid-graph');
  assert.equal(projectVisitedMazeGraph(f.m,layout([]),{kindAt:f.rules.kindAt,markedRooms:[2]}),null,'canonical first steps required');
  assert.equal(projectVisitedMazeGraph(f.m,layout([]),{kindAt:()=>undefined,firstStepIds:[],markedRooms:[2]}),null);
  const whole=fixture();whole.m.visited=Array.from({length:121},(_,id)=>id);whole.m.cleared=[...whole.m.visited];
  const snake=Array.from({length:11},(_,y)=>Array.from({length:11},(_,x)=>y*11+(y%2?10-x:x))).flat();
  const g=graph(whole,snake.slice(1).map((id,i)=>[snake[i],id]),{markedRooms:[snake.at(-1)],firstStepIds:[1]});
  const route=shortestVisitedMazeRoute(g,snake.at(-1));assert.equal(route.status,'found');assert.equal(route.walks,120);
  assert.equal(new Set(route.path).size,121);
});
