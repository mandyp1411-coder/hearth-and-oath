import { mazeLayout, mazeRoomCell, mazeMapRuntime } from './maze-v31.js';
import { mazeMapIdentity, sameMazeMapIdentity, validateMazeMapMemory, MAZE_MAP_LIMITS } from './maze-map-memory.js';
import { projectVisitedMazeGraph, shortestVisitedMazeRoute } from './maze-known-route.js';

export const MAZE_MARK_LABELS=Object.freeze({danger:'Danger',cache:'Cache',revisit:'Revisit','return-stair':'Return stair'});
export const MAZE_MARK_SYMBOLS=Object.freeze({danger:'! ',cache:'◇',revisit:'↺','return-stair':'↟'});
const position=(id,size)=>`column ${id%size+1}, row ${Math.floor(id/size)+1}`;
const entryName=(m,id)=>{const c=mazeRoomCell(m,id);return `${c.title||c.kind+' room'} · ${position(id,mazeLayout(m).size)}`;};

/** Ephemeral controls deliberately reset to Walk on reload or actor/run change. */
export function currentMazeMapSession(s,previous){
 const m=s?.maze;if(!m)return null;const {context,rules}=mazeMapRuntime(s),identity=mazeMapIdentity(m,rules);
 if(!identity)return null;
 if(!previous||previous.generation!==context.generation||!sameMazeMapIdentity(previous.identity,m,rules))
  return {identity,generation:context.generation,mode:'walk',selected:m.position,routeTarget:null};
 const selected=m.visited.includes(previous.selected)?previous.selected:m.position;
 return {...previous,mode:previous.mode==='inspect'?'inspect':'walk',selected,
  routeTarget:m.visited.includes(previous.routeTarget)?previous.routeTarget:null};
}

/** Safe read model; no unknown titles/kinds or future exits are exposed. */
export function mazeMapView(s,actions,previous){
 const m=s.maze,session=currentMazeMapSession(s,previous);if(!m||!session)return null;
 const runtime=mazeMapRuntime(s),valid=validateMazeMapMemory(m,runtime.context,runtime.rules);
 const entries=valid?(m.mapMemory?.entries||[]).map(row=>({...row})):[],selected=entries.find(row=>row.roomId===session.selected)||null;
 const marked=entries.filter(row=>row.mark),markedRooms=marked.map(row=>row.roomId);
 const graph=projectVisitedMazeGraph(m,mazeLayout(m),{kindAt:runtime.rules.kindAt,
  firstStepIds:actions.filter(a=>a.id.startsWith('maze_step_')&&!a.disabledReason).map(a=>Number(a.id.slice(10))),
  markedRooms,paused:!runtime.context.editingAllowed});
 const route=session.routeTarget===null?null:shortestVisitedMazeRoute(graph,session.routeTarget);
 const selectedCell=mazeRoomCell(m,session.selected);
 return {session,entries,selected,marked:marked.map(row=>({...row,label:entryName(m,row.roomId)})),route,
  selectedLabel:entryName(m,session.selected),editingAllowed:valid&&runtime.context.editingAllowed,
  stair:selectedCell.kind==='entrance'||selectedCell.kind==='objective'&&m.objective===true};
}

export function mazeRouteSummary(route){
 if(!route)return '';
 return {found:`${route.walks} walk${route.walks===1?'':'s'} through recorded rooms.`,
  'already-here':'This marked room is your current location.',
  'invalid-target':'Choose a marked, recorded room to show a route.',
  'blocked-danger':'The marked room still has unresolved danger. No route into it is shown.',
  paused:'Resolve the current moment before planning a route.',
  'no-known-route':'No route through recorded rooms without unresolved danger is available.',
  'invalid-graph':'This recorded route cannot be shown.'}[route.status]||'';
}

export function renderMazeMapTools(s,v,ui){
 if(!v)return '';const {e,button}=ui,m=s.maze,session=v.session;
 const modes=`<nav class="maze-map-modes" aria-label="Maze map mode">${['walk','inspect'].map(mode=>`<button type="button" class="button ${session.mode===mode?'secondary':'ghost'} small" data-op="maze-map-mode" data-id="${mode}" aria-pressed="${session.mode===mode}">${mode==='walk'?'Walk':'Inspect & mark'}</button>`).join('')}</nav>`;
 const route=v.route?`<section class="maze-recorded-route" aria-labelledby="maze-route-heading"><h3 id="maze-route-heading" tabindex="-1">Recorded route</h3><p data-maze-route-status>${e(mazeRouteSummary(v.route))}</p>${v.route.status==='found'?`<p class="small-copy">Shortest recorded-room route. Not a safety or cost guarantee. Choose each actual walk yourself.</p><ol>${v.route.directions.map(dir=>`<li>Walk ${e(dir)}.</li>`).join('')}</ol>`:''}${button('Clear route','maze-map-route-clear','','ghost small')}</section>`:'';
 if(session.mode!=='inspect')return `${modes}<p class="small-copy">${v.entries.length}/${MAZE_MAP_LIMITS.entries} map reminders. Inspect recorded rooms to mark them without walking.</p>${route}`;
 const row=v.selected,identity=e(JSON.stringify(session.identity)),paused=v.editingAllowed?'':' disabled';
 const marked=v.marked.length?`<form id="maze-map-find"><label for="maze-marked-room">Marked rooms</label><select id="maze-marked-room" name="roomId">${v.marked.map(entry=>`<option value="${entry.roomId}"${entry.roomId===session.selected?' selected':''}>${e(MAZE_MARK_LABELS[entry.mark]+' · '+entry.label)}</option>`).join('')}</select><button class="button secondary small" type="submit">Inspect marked room</button></form>`:'<p class="small-copy">No rooms marked yet.</p>';
 return `${modes}<section class="maze-map-memory" aria-labelledby="maze-map-memory-heading"><h3 id="maze-map-memory-heading" tabindex="-1">Recorded route knowledge</h3><p class="small-copy">Inspect never walks. Select a recorded square, use arrows to inspect adjacent recorded squares, or choose a marked room below. Marks are reminders, not rewards or promises.</p>${marked}<h4 id="maze-map-selected" tabindex="-1">${e(v.selectedLabel)}</h4>${row?`<p class="small-copy">Marked by ${e(row.authorName)}, generation ${row.authorGeneration}, day ${row.day}.</p>`:''}<form id="maze-map-reminder"><input type="hidden" name="identity" value="${identity}"><input type="hidden" name="roomId" value="${session.selected}"><fieldset${paused}><label for="maze-map-mark">Map mark</label><select id="maze-map-mark" name="mark"><option value=""${!row?.mark?' selected':''}>No mark</option>${Object.entries(MAZE_MARK_LABELS).map(([id,label])=>`<option value="${id}"${row?.mark===id?' selected':''}${id==='return-stair'&&!v.stair?' disabled':''}>${e(label)}</option>`).join('')}</select><label for="maze-map-note">Short note</label><input id="maze-map-note" name="note" type="text" maxlength="160" value="${e(row?.note||'')}" aria-describedby="maze-map-note-help"><p id="maze-map-note-help" class="small-copy">Up to 160 characters of plain text. ${v.entries.length}/32 reminders used. Return-stair marks require an actual discovered stair.</p><div class="maze-map-edit-actions"><button class="button secondary small" type="submit">Save reminder</button>${button('Remove reminder','maze-map-remove',String(session.selected),'ghost small',!row)}</div></fieldset></form>${!v.editingAllowed?'<p class="small-copy">Resolve the current moment before editing reminders.</p>':''}<div class="maze-map-edit-actions">${button('Cancel edits','maze-map-cancel','','ghost small')}${button('Show route','maze-map-route',String(session.selected),'secondary small',!row?.mark)}</div></section>${route}`;
}
