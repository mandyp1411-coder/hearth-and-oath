import { mazeDimensions } from './maze-dimensions.js';
// Bounded, player-authored map reminders. This leaf never mutates a run or
// reads layout/content: its owner supplies effective kind and actor predicates.
export const MAZE_MAP_LIMITS = Object.freeze({entries:32,note:160,name:100,actor:160,rooms:121});
export const MAZE_MAP_MARKS = Object.freeze(['danger','cache','revisit','return-stair']);
const object = v => !!v && typeof v==='object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null);
const integer = (v,min,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys = (v,names) => object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const text = (v,max,empty=false) => typeof v==='string'&&v.length<=max&&(empty||v.length>0)&&!/[\u0000-\u001f\u007f-\u009f]/u.test(v);
const normalizeNote = value => value.replace(/\s+/gu,' ').trim();
const equalIdentity = (a,b) => object(a)&&object(b)&&keys(a,Object.keys(b))&&Object.keys(b).every(k=>a[k]===b[k]);
const rowKeys = ['roomId','mark','note','authorId','authorName','authorGeneration','day'];

/** V1 needs no content API. V2 must explicitly supply roadmap19 provenance. */
export function mazeMapIdentity(m,{contentIdentity}={}) {
  if(!m||![1,2].includes(m.version))return null;
  const identity={mazeId:m.id,runSeed:m.seed,runGeneration:m.generation,mazeVersion:m.version,
    floor:1,kind:m.kind,sourceId:m.sourceId,locationId:m.locationId};
  if(!text(identity.mazeId,100)||!text(identity.runSeed,400)||!integer(identity.runGeneration,1,5000)
    ||!['authored','contract','regional','radiant'].includes(identity.kind)
    ||!text(identity.sourceId,100)||!text(identity.locationId,200))return null;
  if(m.layoutVersion===1){identity.layoutVersion=1;identity.layoutSize=mazeDimensions(m).size;}
  if(m.version===2){
    if(typeof contentIdentity!=='function')return null;
    const content=contentIdentity(m);
    if(!object(content)||content.manifestVersion!==1||!['authored','signature'].includes(content.family)
      ||!['mazeId','runSeed','runGeneration','sourceId','locationId'].every(k=>content[k]===identity[k]))return null;
    identity.manifestVersion=content.manifestVersion;identity.family=content.family;
  }
  return identity;
}

export function sameMazeMapIdentity(value,m,rules) {
  const expected=mazeMapIdentity(m,rules);return !!expected&&equalIdentity(value,expected);
}

function validStair(m,roomId,kindAt) {
  if(typeof kindAt!=='function')return false;
  const kind=kindAt(m,roomId);return kind==='entrance'||kind==='objective'&&m.objective===true;
}

/** Missing data is deliberately valid: reads and reloads never initialize it. */
export function validateMazeMapMemory(m,context={},rules={}) {
  if(m?.mapMemory===undefined)return true;
  const memory=m?.mapMemory;
  if(!keys(memory,['version','identity','entries'])||memory.version!==1||!sameMazeMapIdentity(memory.identity,m,rules)
    ||!Array.isArray(memory.entries)||memory.entries.length<1||memory.entries.length>MAZE_MAP_LIMITS.entries
    ||!Array.isArray(m.visited)||!integer(context.day,0)||!integer(context.generation,1,5000)
    ||typeof rules.validActor!=='function')return false;
  const seen=new Set();let previous=-1;
  return memory.entries.every(row=>{
    if(!keys(row,rowKeys)||!integer(row.roomId,0,mazeDimensions(m).count-1)||seen.has(row.roomId)||row.roomId<=previous
      ||!m.visited.includes(row.roomId)||!(row.mark===null||MAZE_MAP_MARKS.includes(row.mark))
      ||!text(row.note,MAZE_MAP_LIMITS.note,true)||row.note!==normalizeNote(row.note)
      ||!(row.mark||row.note)||!text(row.authorId,MAZE_MAP_LIMITS.actor)||!rules.validActor(row.authorId)
      ||!text(row.authorName,MAZE_MAP_LIMITS.name)||!integer(row.authorGeneration,m.generation,context.generation)
      ||!integer(row.day,m.startedDay,context.day)||row.mark==='return-stair'&&!validStair(m,row.roomId,rules.kindAt))return false;
    seen.add(row.roomId);previous=row.roomId;return true;
  });
}

/** Pure edit result. Only the owner may apply mapMemory to its cloned state. */
export function editMazeMapMemory(m,request,context={},rules={}) {
  const fail=reason=>({ok:false,reason});
  if(context.editingAllowed!==true)return fail('paused');
  if(!integer(context.day,m?.startedDay)||!integer(context.generation,m?.generation,5000))return fail('invalid-context');
  if(!sameMazeMapIdentity(request?.identity,m,rules))return fail('stale-run');
  if(!integer(request.roomId,0,mazeDimensions(m).count-1)||!Array.isArray(m.visited)||!m.visited.includes(request.roomId))return fail('unvisited-room');
  if(!validateMazeMapMemory(m,context,rules))return fail('invalid-memory');
  if(!(request.mark===null||MAZE_MAP_MARKS.includes(request.mark))||typeof request.note!=='string')return fail('invalid-entry');
  const note=normalizeNote(request.note);
  if(!text(note,MAZE_MAP_LIMITS.note,true))return fail('invalid-note');
  if(request.mark==='return-stair'&&!validStair(m,request.roomId,rules.kindAt))return fail('not-a-stair');
  const entries=(m.mapMemory?.entries||[]).filter(row=>row.roomId!==request.roomId).map(row=>({...row}));
  if(request.mark||note){
    if(entries.length>=MAZE_MAP_LIMITS.entries)return fail('full');
    const actor=context.actor;
    if(!object(actor)||!text(actor.id,MAZE_MAP_LIMITS.actor)||!text(actor.name,MAZE_MAP_LIMITS.name)
      ||!integer(actor.generation,m.generation,context.generation)||typeof rules.validActor!=='function'
      ||!rules.validActor(actor.id)||!integer(context.day,m.startedDay))return fail('invalid-author');
    entries.push({roomId:request.roomId,mark:request.mark,note,authorId:actor.id,authorName:actor.name,
      authorGeneration:actor.generation,day:context.day});
  }
  entries.sort((a,b)=>a.roomId-b.roomId);
  const mapMemory=entries.length?{version:1,identity:mazeMapIdentity(m,rules),entries}:null;
  return {ok:true,mapMemory};
}
