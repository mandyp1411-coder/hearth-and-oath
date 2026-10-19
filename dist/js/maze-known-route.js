// Route advice only. No engine, content, action execution, RNG or save effects.
const COUNT=121;
const integer=(v,min=0,max=120)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const list=v=>Array.isArray(v)&&v.length<=COUNT&&new Set(v).size===v.length&&v.every(id=>integer(id));
const directions=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
const direction=(a,b)=>directions.find(([,dx,dy])=>a.x+dx===b.x&&a.y+dy===b.y)?.[0];
const dangerous=kind=>['enemy','guardian','trap'].includes(kind);

/** Project only visited nodes. kindAt must use effective v2 overlay kinds.
 * markedRooms comes from the owner's already-validated mapMemory, never fog.
 * firstStepIds comes from currently enabled canonical maze_step actions. */
export function projectVisitedMazeGraph(m,layout,{kindAt,firstStepIds,markedRooms=[],paused=false}={}) {
  const SIZE=layout?.size;
  if(!m||![5,7,11].includes(SIZE)||!list(m.visited)||!m.visited.includes(m.position)||!list(m.cleared)
    ||!Array.isArray(layout.cells)||layout.cells.length!==SIZE*SIZE
    ||typeof kindAt!=='function'||!list(firstStepIds)||!list(markedRooms)||typeof paused!=='boolean')return null;
  const visited=new Set(m.visited),cleared=new Set(m.cleared),nodes=[];
  for(const id of [...visited].sort((a,b)=>a-b)){
    const cell=layout.cells[id];
    if(!cell||cell.id!==id||cell.x!==id%SIZE||cell.y!==Math.floor(id/SIZE)||!list(cell.doors))return null;
    const doors=[];
    for(const to of cell.doors){
      if(!visited.has(to))continue;
      const other=layout.cells[to];
      if(!other||!Array.isArray(other.doors)||!other.doors.includes(id)||!direction(cell,other))continue;
      doors.push(to);
    }
    const kind=kindAt(m,id);
    if(typeof kind!=='string'||!['entrance','empty','cache','enemy','guardian','trap','camp','inscription','objective','witness','dilemma'].includes(kind))return null;
    nodes.push({id,x:cell.x,y:cell.y,doors,blocked:!cleared.has(id)&&dangerous(kind)});
  }
  return {size:SIZE,position:m.position,previous:m.previous,paused,nodes,
    firstStepIds:firstStepIds.filter(id=>visited.has(id)),markedRooms:markedRooms.filter(id=>visited.has(id))};
}

function validGraph(graph) {
  const SIZE=graph?.size;
  if(!graph||![5,7,11].includes(SIZE)||!integer(graph.position)||!integer(graph.previous)||typeof graph.paused!=='boolean'
    ||!Array.isArray(graph.nodes)||graph.nodes.length<1||graph.nodes.length>COUNT
    ||!list(graph.firstStepIds)||!list(graph.markedRooms))return false;
  const ids=new Set();
  for(const node of graph.nodes){
    if(!node||!integer(node.id,0,SIZE*SIZE-1)||ids.has(node.id)||node.x!==node.id%SIZE||node.y!==Math.floor(node.id/SIZE)
      ||!list(node.doors)||typeof node.blocked!=='boolean')return false;
    ids.add(node.id);
  }
  return ids.has(graph.position)&&graph.firstStepIds.every(id=>ids.has(id))&&graph.markedRooms.every(id=>ids.has(id));
}

/** Bounded BFS over a visited-only snapshot. There is intentionally no follow. */
export function shortestVisitedMazeRoute(graph,target) {
  const result=status=>({status,path:[],directions:[],walks:0});
  if(!validGraph(graph))return result('invalid-graph');
  const nodes=new Map(graph.nodes.map(node=>[node.id,node]));
  if(!integer(target)||!nodes.has(target)||!graph.markedRooms.includes(target))return result('invalid-target');
  if(target===graph.position)return {status:'already-here',path:[target],directions:[],walks:0};
  if(graph.paused)return result('paused');
  if(nodes.get(target).blocked)return result('blocked-danger');
  const queue=[graph.position],parents=new Map([[graph.position,null]]);
  for(let index=0;index<queue.length;index++){
    const at=queue[index],from=nodes.get(at);
    const candidates=from.doors.filter(to=>{
      const next=nodes.get(to);
      return next&&!next.blocked&&next.doors.includes(at)&&direction(from,next)
        &&(at!==graph.position||graph.firstStepIds.includes(to)&&(!from.blocked||to===graph.previous));
    }).sort((a,b)=>directions.findIndex(([name])=>name===direction(from,nodes.get(a)))
      -directions.findIndex(([name])=>name===direction(from,nodes.get(b))));
    for(const to of candidates){
      if(parents.has(to))continue;
      parents.set(to,at);
      if(to===target){
        const path=[to];while(parents.get(path[0])!==null)path.unshift(parents.get(path[0]));
        return {status:'found',path,directions:path.slice(1).map((id,i)=>direction(nodes.get(path[i]),nodes.get(id))),walks:path.length-1};
      }
      queue.push(to);
    }
  }
  return result('no-known-route');
}
