import { independentHousehold } from './household-residence.js';
import { queueWildernessEncounter } from './wilderness-v35.js';
import { atlasGrid, territoryAt } from './regional-geography-v33.js';
import { progressTravelStep, travelEnergyForecast, travelEnergyView } from './travel-energy.js';
import { publicMagicAt } from './law-text-v25.js';
import { recordHexHook } from './field-notes-v25.js';
import { CONTRACT_FLAVOR, FAITHS } from './realm-content-v18.js';
import { seededRoll, isSettlement } from './world.js';
import { renderPaperMap, paperMapLayout, paperMapSheets, paperMapPosition, PAPER_MAP_TEXTURE } from './paper-map.js';
import { settlementSpaces, SETTLEMENT_ROOM_IDS } from './settlement-spaces.js';

const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const ranks={Rumored:1,Charted:2,Visited:3};
const cache=new Map();
const copy=v=>structuredClone(v);
export const hexKey=(q,r)=>`${q},${r}`;
const point=(q,r)=>({x:45+Math.sqrt(3)*29*(q+r/2),y:43+43.5*r});
function polygon(x,y,points=[]){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function distance(a,b){return (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;}
function rounded(q,r){let x=Math.round(q),z=Math.round(r),y=Math.round(-q-r);const dx=Math.abs(x-q),dz=Math.abs(z-r),dy=Math.abs(y+q+r);if(dx>dy&&dx>dz)x=-y-z;else if(dz>dy)z=-x-y;return {q:x,r:z};}

// New charts route the hex road through the same countryside as its saved road.
// Earlier atlases retain their exact original hex corridor and travel costs.
function countryRoadPath(a,b,cells,byKey,road,columns=15,rows=11){
  const cost=new Map([[a.key,0]]),parent=new Map(),open=new Set([a.key]),roadPoints=road.points||[];
  const nearness=c=>{if(!roadPoints.length)return 0;const p=[(c.q+Math.floor(c.r/2))*1000/(columns-1),c.r*700/(rows-1)];let gap=Infinity;for(let i=1;i<roadPoints.length;i++){const a=roadPoints[i-1],b=roadPoints[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));gap=Math.min(gap,Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t));}return gap/150;};
  while(open.size){const at=[...open].sort((x,y)=>cost.get(x)+distance(byKey[x],b)-cost.get(y)-distance(byKey[y],b)||x.localeCompare(y))[0];if(at===b.key){const path=[at];while(path[0]!==a.key)path.unshift(parent.get(path[0]));return path.map(key=>byKey[key]);}open.delete(at);const c=byKey[at];for(const [dq,dr]of directions){const n=byKey[hexKey(c.q+dq,c.r+dr)];if(!n)continue;const step=n.terrain==='water'?(road.crossing==='water'?2.7:14):n.terrain==='mountain'?2.4:n.terrain==='marsh'?1.5:n.terrain==='forest'?1.15:1,next=cost.get(at)+step+nearness(n);if(next<(cost.get(n.key)??Infinity)){cost.set(n.key,next);parent.set(n.key,at);open.add(n.key);}}}
  return [a,b];
}

/** Geometry is immutable and derived; discoveries, dates and progress are saved. */
export function hexAtlas(state){
  const nodes=state.world.map?.nodes||state.world.locations.map((s,i)=>({id:s.id,x:90+(i%7)*130,y:70+Math.floor(i/7)*130}));
  const id=state.seed+JSON.stringify([nodes,state.world.map?.generationVersion,state.world.map?.terrain,state.world.map?.atlas,state.world.roads]);
  if(cache.has(id))return cache.get(id);
  const cells=[],{columns,rows}=atlasGrid(state.world);
  for(let r=0;r<rows;r++)for(let col=0;col<columns;col++){
    const q=col-Math.floor(r/2),x=col*1000/(columns-1),y=r*700/(rows-1);
    const land=state.world.map?.atlas?.landmasses;
    const modern=(state.world.map?.generationVersion||0)>=6,water=land?.length&&!land.some(l=>polygon(x,y,l.points))||modern&&(state.world.map?.terrain||[]).some(t=>t.type==='water'&&polygon(x,y,t.points));
    let terrain=water?'water':'grassland';
    for(const t of state.world.map?.terrain||[])if(t.type!=='water'&&(!modern||!water)&&polygon(x,y,t.points))terrain=t.type;
    if(!land?.length&&(state.world.map?.terrain||[]).some(t=>t.type==='water'&&polygon(x,y,t.points)))terrain='water';
    cells.push({q,r,key:hexKey(q,r),...point(q,r),terrain,...(state.world.map?.generationVersion>=7?{regionId:territoryAt(state.world,x,y)}:{}),siteId:null,road:false,ferry:false,roadLinks:[]});
  }
  const sites={};
  for(const n of nodes){const col=Math.max(1,Math.min(columns-2,Math.round(n.x*(columns-1)/1000))),r=Math.max(1,Math.min(rows-2,Math.round(n.y*(rows-1)/700))),target={q:col-Math.floor(r/2),r};
    const cell=cells.filter(c=>!c.siteId&&((state.world.map?.generationVersion||0)<6||c.terrain!=='water')).sort((a,b)=>distance(a,target)-distance(b,target)||a.r-b.r||a.q-b.q)[0];
    cell.siteId=n.id;if(state.world.map?.generationVersion>=7)cell.regionId=state.world.locations.find(p=>p.id===n.id).regionId;if((state.world.map?.generationVersion||0)<6)cell.terrain='grassland';sites[n.id]=cell.key;
  }
  const byKey=Object.fromEntries(cells.map(c=>[c.key,c]));
  const roadPaths=[];
  for(const road of state.world.roads){const a=byKey[sites[road.from]],b=byKey[sites[road.to]],length=distance(a,b),path=state.world.map?.generationVersion>=6?countryRoadPath(a,b,cells,byKey,road,columns,rows):Array.from({length:length+1},(_,i)=>{const t=length?i/length:0,p=rounded(a.q+(b.q-a.q)*t,a.r+(b.r-a.r)*t);return byKey[hexKey(p.q,p.r)];}).filter(Boolean);
    for(const c of path){c.road=true;c.roadLinks.push([road.from,road.to]);if(state.world.map?.generationVersion>=6?c.terrain==='water':road.crossing==='water')c.ferry=true;}
    roadPaths.push({from:road.from,to:road.to,cells:path.map(c=>c.key)});
  }
  const result={cells,byKey,sites,roadPaths,columns,rows,width:columns===15?810:Math.ceil(90+(columns-.5)*Math.sqrt(3)*29),height:rows===11?550:Math.ceil(90+(rows-1)*43.5)};
  if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(id,result);return result;
}

function record(state,kind,source,extra={}){return {kind,source,observedDay:state.day,generation:state.dynasty?.generation||1,...extra};}
export function markSiteKnowledge(state,id,kind='Rumored',source='A traveler’s account',{heard=false}={}){
  if(!state.cartography||!state.world.locations.some(p=>p.id===id))return false;
  const old=state.cartography.sites[id];
  if(!old||ranks[kind]>ranks[old.kind]||kind==='Visited'){
    const place=state.world.locations.find(p=>p.id===id);
    state.cartography.sites[id]=record(state,kind,source,{...(old?.reports?{reports:copy(old.reports)}:{}),...(kind==='Visited'?{condition:place.status||'thriving',servicesAvailable:place.servicesAvailable!==false}:{})});
  }
  if(heard){const current=state.cartography.sites[id],snapshot=value=>({kind:value.kind,source:value.source,observedDay:value.observedDay,generation:value.generation}),report=record(state,'Rumored',source),reports=current.reports||[snapshot(old||current)];if(!reports.some(row=>row.observedDay===report.observedDay&&row.source===report.source&&row.kind===report.kind))reports.push(report);current.reports=reports.slice(-6);}
  const key=hexAtlas(state).sites[id];
  const previous=state.cartography.cells[key];
  if(!previous||ranks[kind]>ranks[previous.kind])state.cartography.cells[key]=record(state,kind,source);
  return true;
}
export function learnRoadDirections(state){
  if(!state.cartography)return;
  const here=state.world.locations.find(p=>p.id===state.locationId);
  for(const road of state.world.roads.filter(r=>!r.closed&&[r.from,r.to].includes(state.locationId))){
    const id=road.from===state.locationId?road.to:road.from;
    if(!state.cartography.sites[id])markSiteKnowledge(state,id,'Rumored','Road signs at '+here.name);
  }
}
function reveal(state,key,radius=1,visited=true){const atlas=hexAtlas(state),center=atlas.byKey[key];if(!center)return;
  for(const cell of atlas.cells)if(distance(center,cell)<=radius){
    const kind=visited&&cell.key===key?'Visited':'Charted',old=state.cartography.cells[cell.key];
    if(!old||ranks[kind]>ranks[old.kind])state.cartography.cells[cell.key]=record(state,kind,'Your field observations');
    if(cell.siteId)markSiteKnowledge(state,cell.siteId,kind,'Your field observations');
  }
}
/** Observe the country actually passed on a road, without inventing site visits. */
export function observeRoadCountry(state,from,to,ratio){
 const road=state.world.roads.find(r=>r.from===from&&r.to===to||r.from===to&&r.to===from);
 if(!state.cartography||!road?.points?.length||ratio<=0)return false;
 const points=road.from===from?road.points:[...road.points].reverse(),lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 let remaining=lengths.reduce((a,b)=>a+b,0)*Math.min(1,ratio),point=points.at(-1);
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=remaining/(lengths[i]||1);point=[points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];break;}remaining-=lengths[i];}
 const atlas=hexAtlas(state),gap=c=>Math.hypot((c.q+Math.floor(c.r/2))*1000/(atlas.columns-1)-point[0],c.r*700/(atlas.rows-1)-point[1]),cell=atlas.cells.reduce((best,c)=>gap(c)<gap(best)?c:best);
 reveal(state,cell.key,2,false);return true;
}
export function initializeCartography(state,{migration=false}={}){
  if(state.cartography)return;
  const atlas=hexAtlas(state),position=atlas.sites[state.locationId];
  state.cartography={version:1,position,offsite:false,cells:{},sites:{},pending:null,interior:null};
  if(migration)for(const site of state.world.locations)markSiteKnowledge(state,site.id,'Charted','Atlas retained from your earlier save');
  markSiteKnowledge(state,state.locationId,'Visited',state.age===0?'At your first hearth':'Your present location');
  reveal(state,position);
  for(const road of state.world.roads.filter(r=>[r.from,r.to].includes(state.locationId)))markSiteKnowledge(state,road.from===state.locationId?road.to:road.from,'Rumored','Routes described at your hearth');
}
export function syncCartography(state){
  const c=state.cartography;if(!c)return;
  if(!c.offsite&&!c.pending){const key=hexAtlas(state).sites[state.locationId];if(key!==c.position){c.position=key;c.interior=null;reveal(state,key,2);}markSiteKnowledge(state,state.locationId,'Visited','Your present location');}
  if(c.interior&&(!isSettlement(state.world,state.locationId)||!cityRooms(state).some(room=>room.id===c.interior.roomId)))c.interior=null;
  if(c.route&&c.route.keys[c.route.index]!==c.position)c.route=null;
  if(state.phase==='retired'){c.pending=null;c.interior=null;c.route=null;}
  for(const contract of state.adventuring?.contracts||[])if(['active','ready'].includes(contract.status))markSiteKnowledge(state,contract.destinationId,'Rumored',`Contract: ${CONTRACT_FLAVOR.find(f=>f.id===contract.flavorId)?.title||'a dated petition'}`);
}
export function inheritCartography(previous,next){
  delete next.cartography;initializeCartography(next);const original=previous.cartography;if(!original)return;
  for(const [id,value] of Object.entries(original.sites))if(!next.cartography.sites[id]||ranks[next.cartography.sites[id].kind]<2)next.cartography.sites[id]={...copy(value),kind:value.kind==='Visited'?'Charted':value.kind,source:`Inherited chart: ${previous.hero.name}`};
  for(const [key,value] of Object.entries(original.cells))if(!next.cartography.cells[key])next.cartography.cells[key]={...copy(value),kind:value.kind==='Visited'?'Charted':value.kind,source:`Inherited chart: ${previous.hero.name}`};
  syncCartography(next);
}
export function hexStepPreview(state,key){
  const atlas=hexAtlas(state),from=atlas.byKey[state.cartography?.position],to=atlas.byKey[key];
  let disabledReason='';
  if(!from||!to||distance(from,to)!==1)disabledReason='Choose one of the six neighboring hexes.';
  else if(to.terrain==='water'&&!to.roadLinks.some(([from,to])=>state.world.roads.some(r=>r.from===from&&r.to===to&&!r.closed)))disabledReason='Open water needs an operating ferry or bridge crossing.';
  else if(state.age<14)disabledReason='Independent regional travel opens at age 14.';
  const days=to?(to.ferry?2:to.road?1:({mountain:3,marsh:2,forest:2,water:2}[to.terrain]||1)):0;
  return {key,days:state.trail?travelEnergyForecast(state,days).days:days,baseDays:days,cost:0,terrain:state.cartography?.cells[key]?to?.terrain:'Unexplored country',disabledReason};
}
export function cityRooms(state){
  if(state.cartography?.offsite||!isSettlement(state.world,state.locationId))return [];
  const own=independentHousehold(state)&&state.life.home.locationId===state.locationId;
  const home=own||state.locationId===(state.hero.birthplaceId||'home')||state.life?.home?.source&&state.life.home.locationId===state.locationId||state.life?.people.some(p=>p.alive!==false&&p.familyRole&&p.locationId===state.locationId);
  return settlementSpaces(state,[
    {id:'gate',name:'Gate & Streets',description:'Travelers pass through the gate. The streets open toward the market and the doors of the settlement.',exits:['market','tavern','shrine','watch','archive','homes']},
    {id:'market',name:'Market',description:'Canvas awnings shelter the counters. The smell of herbs mingles with leather, iron and fresh bread.',exits:['gate','tavern']},
    {id:'tavern',name:'Tavern',description:'Warm food and voices fill the room. People offering work have found a place near the tables.',exits:['market','gate','homes']},
    {id:'shrine',name:'Shrine & Healing Room',description:'The keeper tends the candles. Beside the shrine, a doctor has prepared a quiet room for patients.',exits:['gate','archive']},
    {id:'watch',name:'Watchhouse & Court',description:'The watch keeps its equipment by the door. A captain listens to visitors beneath the posted notices.',exits:['gate']},
    {id:'archive',name:'School & Archive',description:'Books and slates fill the shelves. Teachers hold their lessons nearby, and an archivist can help you find a book.',exits:['gate','shrine']},
    {id:'homes',name:own?'Your Home':home?'Your Family’s Home':'Residential Lane',description:own?'This is your household’s own address. Parents and other relatives have their own homes; you can visit them without sharing a roof.':home?'Your relatives keep their own home here. Familiar footsteps sound beyond their door, and you can visit when you have time.':'Private doors stay private. Being able to walk a street grants no permission to enter a stranger’s home.',exits:['gate','tavern'],private:!home},
  ].map(room=>{const shrine=state.realm?.sites[state.locationId];if(room.id==='shrine'){room={...room,name:shrine?.hasShrine===false?'Doctor’s House':(shrine?.faithId?(FAITHS.find(f=>f.id===shrine.faithId)?.name||'Local')+' Shrine':room.name),description:shrine?.hasShrine===false?'A doctor keeps a quiet house for patients. There is no public shrine in this settlement.':'The shrine follows this settlement’s '+(shrine?.faithId||'local')+' tradition. A doctor tends a separate healing room beside it.'};}const details={gate:['Narrow lanes bend around a shared square.','A broad avenue leads between old public buildings.','Public doors gather around a stepped courtyard.','Covered walks follow the edge of the settlement.'],market:['Canvas awnings shelter the stalls.','Stone counters surround an open courtyard.','Timber stalls stand close beneath a shared roof.','Small shop fronts face the same busy lane.']};const extra=details[room.id]?.[seededRoll(state.seed,'room-place:'+state.locationId+':'+room.id,4)];return {...room,name:room.id==='market'?'Market':room.name,description:room.description+(extra?' '+extra:'')};}));
}
export function cartographyActions(state){
  const c=state.cartography;if(!c)return [];
  const action=(id,label,description,days=0,disabledReason='')=>({id,label,description,days,cost:0,group:'Exploration',...(disabledReason?{disabledReason}:{})});
  const nextPreview=c.route?hexStepPreview(state,c.route.keys[c.route.index+1]):null;
  const routeActions=c.route?[action('atlas_route_continue','Follow Your Planned Route',`Walk the next hex in ${nextPreview.days} calendar days at your present Focus, then pause to review, camp, or change course.`,nextPreview.days,nextPreview.disabledReason),action('atlas_route_cancel','Clear Route','Keep your position and every completed day; remove the remaining route.')]:[];
  if(c.pending)return [...routeActions.filter(a=>a.id==='atlas_route_cancel'),action('atlas_continue','Continue the same hex crossing',`${c.pending.totalDays-c.pending.progress} normal stretches remain. Walk the next stretch, then pause or camp. Your destination stays undiscovered until arrival.`,c.pending.energyVersion===1?(c.pending.energyStep?c.pending.energyStep.totalDays-c.pending.energyStep.progress:travelEnergyView(state).speed):c.pending.totalDays-c.pending.progress,state.hero.condition?.type==='vampire'&&state.hero.condition.hunger>=75?'Meet blood hunger before continuing this crossing.':''),action('atlas_cancel','Turn back along your own tracks','Return to the starting hex. Time already spent stays spent.')];
  const atlas=hexAtlas(state),cell=atlas.byKey[c.position];
  const moves=state.age>=14?directions.map(([q,r])=>atlas.byKey[hexKey(cell.q+q,cell.r+r)]).filter(Boolean).map(to=>{const p=hexStepPreview(state,to.key),known=c.sites[to.siteId];return action(`atlas_step_${to.q}_${to.r}`,known?`Step toward ${state.world.locations.find(s=>s.id===to.siteId).name}`:'Explore the neighboring hex',`${p.days} day${p.days===1?'':'s'} across ${p.terrain.toLowerCase()}. Your life and its needs continue.`,p.days,p.disabledReason);}):[];
  if(state.age>=14){moves.push(...routeActions);for(const id of Object.keys(c.sites).filter(id=>atlas.sites[id]!==c.position))moves.push(action('atlas_plan_'+id,'Plan Route to '+state.world.locations.find(p=>p.id===id).name,'Mark a route without moving or discovering its destinations.'));}
  if(c.offsite){moves.push(action('atlas_rest','Rest beside your trail',`Spend a day recovering ${c.hooks?.[c.position]?.usable?10:6} health and 4 magic.${c.hooks?.[c.position]?.usable?' The access or shelter you repaired supports recovery.':''} No shop, employer or household service is present.`,1));return moves;}
  if(state.age>=6&&isSettlement(state.world,state.locationId))moves.push(action('atlas_rumors','Hear the roads described','Spend a day asking about nearby destinations. Keep the date and source beside every rumor.',1));
  const rooms=cityRooms(state),current=c.interior?.siteId===state.locationId?c.interior.roomId:'gate';
  for(const room of rooms.filter(r=>r.id!==current&&(current==='gate'||rooms.find(r=>r.id===current)?.exits.includes(r.id))))moves.push(action(`atlas_room_${room.id}`,`Enter ${room.name.toLowerCase()}`,'Walk within the settlement. Viewing and walking through public rooms take no calendar days. Existing services keep their own time and price.'));
  return moves;
}
export function applyCartographyAction(state,id,ctx){
  const c=state.cartography,atlas=hexAtlas(state);if(!c)return false;
  if(id==='atlas_route_cancel'){c.route=null;state.notice='Your route is cleared. Your position and traveled days remain.';return true;}
  if(id.startsWith('atlas_plan_')){const destination=id.slice(11);if(!c.sites[destination]||c.pending||state.age<14)return false;const keys=planHexRoute(state,atlas.sites[destination]);if(!keys?.length)return false;c.route={version:1,keys,index:0,destination,startedDay:state.day};state.notice='Your destination is marked. Follow the trail and stop to camp when you need.';return true;}
  if(id==='atlas_route_continue'){if(!c.route||c.pending||state.age<14)return false;const next=atlas.byKey[c.route.keys[c.route.index+1]];return next?applyCartographyAction(state,`atlas_step_${next.q}_${next.r}`,ctx):false;}
  if(id.startsWith('atlas_room_')){const room=cityRooms(state).find(r=>r.id===id.slice(11));if(!room)return false;c.interior={siteId:state.locationId,roomId:room.id};state.notice=room.description;return true;}
  if(id==='atlas_cancel'){c.pending=null;c.route=null;state.notice='You returned along your tracks. The time already spent remains part of your life.';return true;}
  if(id==='atlas_rumors'||id==='atlas_scout'||id==='atlas_rest'){
    if(ctx.spendDays(1,{outdoors:c.offsite})!==1){state.notice='The activity waits for the current calendar need.';return true;}
    if(id==='atlas_rumors')for(const road of state.world.roads.filter(r=>[r.from,r.to].includes(state.locationId)))markSiteKnowledge(state,road.from===state.locationId?road.to:road.from,'Rumored',`Travelers at ${state.world.locations.find(p=>p.id===state.locationId).name}`,{heard:true});
    if(id==='atlas_scout'){reveal(state,c.position,2);state.hero.skills.survival=Math.min(10000,state.hero.skills.survival+1);}
    if(id==='atlas_rest'){state.hero.hp=Math.min(state.hero.maxHp,state.hero.hp+(c.hooks?.[c.position]?.usable?10:6));state.hero.mp=Math.min(state.hero.maxMp,state.hero.mp+4);}
    state.notice=id==='atlas_rest'?(c.hooks?.[c.position]?.usable?'You rested beside the trail with the support of the place you repaired.':'You rested beside the trail.'):id==='atlas_scout'?'Nearby country is charted. You have not visited every place on the page.':'You recorded the travelers’ accounts without mistaking them for your own visits.';return true;
  }
  if(id.startsWith('atlas_step_')){const match=/^atlas_step_(-?\d+)_(-?\d+)$/.exec(id);if(!match)return false;const key=hexKey(+match[1],+match[2]),preview=hexStepPreview(state,key);if(preview.disabledReason||c.pending)return false;c.pending={from:c.position,to:key,totalDays:state.trail?preview.baseDays:preview.days,progress:0,startedDay:state.day,...(state.trail?{energyVersion:1}:{})};c.interior=null;}
  if(id==='atlas_continue'||c.pending){
    const p=c.pending;if(!p)return false;const step=p.energyVersion===1&&p.progress<p.totalDays?progressTravelStep(state,p,ctx):null;const days=step?step.distance:p.progress>=p.totalDays?0:ctx.spendDays(p.totalDays-p.progress,{outdoors:true});p.progress+=days;
    if(state.phase==='retired'){c.pending=null;return true;}
    if(p.progress===p.totalDays&&!state.event&&!state.battle&&!state.conversations?.pending){const cell=atlas.byKey[p.to];c.position=p.to;c.offsite=!cell.siteId;if(cell.siteId){state.locationId=cell.siteId;learnRoadDirections(state);}c.pending=null;if(c.route){if(c.route.keys[c.route.index+1]===c.position)c.route.index++;else c.route=null;if(c.route&&c.route.index===c.route.keys.length-1)c.route=null;}reveal(state,c.position,2);const text=cell.siteId?`You arrived at ${state.world.locations.find(s=>s.id===cell.siteId).name}.`:`You follow the trail through the ${cell.terrain}.`;ctx.journal?.('Along the Country Trail',text,'travel');state.notice=text;recordHexHook(state,cell,ctx);if(c.offsite||!isSettlement(state.world,state.locationId))queueWildernessEncounter(state,cell,ctx);}else state.notice=p.energyVersion===1?'You pause along the crossing. Continue, or make camp before walking further.':'Your crossing pauses for a real need. Continue the same step after resolving it.';
    return true;
  }
  return false;
}
export function cartographyView(state){
  const c=state.cartography;if(!c)return null;
  const atlas=hexAtlas(state),here=atlas.byKey[c.position];
  return {...c,atlas,cells:atlas.cells.map(cell=>{const known=c.cells[cell.key],site=c.sites[cell.siteId],visible=Boolean(known),near=distance(here,cell)===1;return {key:cell.key,q:cell.q,r:cell.r,regionId:cell.regionId||state.realm?.sites[cell.siteId]?.regionId||null,x:cell.x,y:cell.y,known:known?.kind||'Unknown',terrain:visible?cell.terrain:'Unknown',current:cell.key===c.position,near,siteId:site?cell.siteId:null,name:site?state.world.locations.find(s=>s.id===cell.siteId).name:null,source:site?.source||known?.source||null,observedDay:site?.observedDay??known?.observedDay??null};}),places:Object.entries(c.sites).map(([id,value])=>({id,name:state.world.locations.find(s=>s.id===id).name,...value,stale:state.day-(value.kind==='Rumored'&&value.reports?.length?value.reports.at(-1).observedDay:value.observedDay)>=365})),rooms:cityRooms(state)};
}
export function currentPlaceSummary(state,id=state.locationId){const site=state.world.locations.find(s=>s.id===id);if(!site)return '';const hold=state.realm?.politics?.holds.find(h=>h.siteId===id&&h.status==='held');if(hold)return `${hold.controllerName}’s vampires control the streets. Public trade and official work are closed. A doctor and resistance contact shelter near the old public buildings; approach the Watchhouse for an account. The original regional claim and faith remain.`;const conditions={thriving:'Its doors are open and daily work continues.',scarred:'Repairs are still visible. Surviving services operate where their doors remain open.',evacuated:'Its residents have withdrawn. Shops and public services are closed.',destroyed:'The settlement lies ruined. Its former services are unavailable.'};return `${conditions[site.status||'thriving']} ${state.realm?.sites?.[id]?.phase?`The present civic condition is ${state.realm.sites[id].phase}.`:''} Public magic is ${publicMagicAt(state,id)} under the current regional code.`;}

const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderHexMap(state,{compact=false,selectedKey=null,expanded=false,scale=1,popup=false,sheet='country',grid=false}={}){
  const raw=cartographyView(state);if(!raw)return '';const v={...raw,cells:raw.cells.map(c=>({...c,...paperMapPosition(state,c)}))};
  const layout=paperMapLayout(state,{compact,view:v,sheet}),selected=v.cells.find(c=>c.key===selectedKey)||v.cells.find(c=>c.current);
  const inView=c=>c.x>=layout.x+22&&c.x<=layout.x+layout.width-22&&c.y>=layout.y+22&&c.y<=layout.y+layout.height-71;
  // Pins scale with the chart, so fitting it cannot leave overlapping fixed
  // rectangles. Full-size named places and direction commands live beside it.
  const pins=v.cells.filter(c=>inView(c)&&(c.current||c.near||c.siteId||c.key===selected?.key)).map(c=>`<button type="button" class="hex-cell ${c.current?'current':''} ${selected?.key===c.key?'selected':''} ${c.known==='Unknown'?'fogged':''} ${c.name?'known-place':''}" style="left:${(c.x-layout.x)/layout.width*100}%;top:${(c.y-(c.siteId?7:0)-layout.y)/layout.height*100}%;--hex-hit-width:${44/layout.width*100}%;--hex-hit-height:${(c.siteId?52:40)/layout.height*100}%" data-op="hex-select" data-id="${escape(c.key)}" aria-describedby="country-map-help" ${c.siteId?`data-site-id="${escape(c.siteId)}"`:''} aria-label="${escape(c.current?'Your position'+(c.name?' — '+c.name:''):c.name||c.terrain+' hex')}${c.near?', neighboring hex':''}" ${c.current?'aria-current="location"':''} aria-pressed="${selected?.key===c.key}"><span aria-hidden="true"></span></button>`).join('');
  const controls=compact?`<button type="button" class="button ghost small" data-op="spatial-mode" data-id="country">Full country →</button>`:`<div class="map-sheet-tools"><label class="chart-sheet-picker">Chart<select id="chart-sheet" aria-label="Chart Sheet">${paperMapSheets(state,{view:v}).map(s=>`<option value="${escape(s.id)}" ${layout.id===s.id?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label><button type="button" class="button ghost small chart-grid-toggle" data-op="map-grid" aria-pressed="${grid}">Travel Grid</button></div><div class="map-controls" role="group" aria-label="Map camera"><button type="button" class="button ghost" data-op="map-zoom" data-id="out" aria-label="Zoom out">−</button><button type="button" class="button ghost" data-op="map-zoom" data-id="in" aria-label="Zoom in">+</button><output class="map-zoom-level" data-map-zoom-label aria-label="Map zoom">${Math.round(scale*100)}%</output><button type="button" class="button ghost map-fit" data-op="map-zoom" data-id="reset" aria-label="Fit chart and center your position">Fit</button><button type="button" class="button ghost map-fit" data-op="map-zoom" data-id="home" aria-label="Center map on your position">Find Me</button></div>`;
  const caption=selected?.name|| (selected?.current?'Your position':selected?.known==='Unknown'?'Unexplored country':selected?.terrain+' country');
  const canvas=`<div class="hex-map-scroll" data-map-viewport tabindex="0" aria-label="Country map; hold and drag to pan, arrow keys to pan, plus and minus to zoom, Home to find your position"><div class="hex-map-canvas" data-map-canvas style="aspect-ratio:${layout.width}/${layout.height}">${pins}${renderPaperMap(state,{compact,selectedKey:selected?.key,view:v,labels:true,sheet,grid,parchmentPath:PAPER_MAP_TEXTURE})}</div></div>`;
  if(popup)return `<section class="hex-board paper-chart map-only" style="--atlas-ratio:${layout.width/layout.height}" aria-label="Your Known Country">${canvas}<p id="country-map-help" class="sr-only">Hold and drag to pan. Wheel or plus and minus zoom. Arrow keys pan; Home finds your position. Click, Enter or Space selects a hex. Close the map to review travel, or double click an available neighboring hex to travel.</p></section>`;
  return `<section class="hex-board paper-chart ${compact?'compact':''}" style="--atlas-ratio:${layout.width/layout.height}" aria-label="Your known country"><div class="map-toolbar"><div><span class="eyebrow">${compact?'AROUND YOUR HEARTH':'FIELD CHART'}</span><strong>${escape(state.world.name)}</strong></div>${controls}</div>${canvas}<p id="country-map-help" class="${compact?'sr-only':'small-copy'}">Hold &amp; Drag to Pan · ${expanded?'Wheel':'Alt + Wheel'} to Zoom · Select a Place or Nearby Country. Enter or Space also inspects; Confirm or double click an available neighboring hex to travel.</p><div class="map-selection-caption"><strong>${escape(caption)}</strong><span>${escape(selected?.known||'Unknown')}${selected?.current?' · You are here':''}</span></div>${compact?'':`<details class="map-key" data-disclosure="map-key"><summary>Chart key <span>${v.places.filter(p=>p.kind==='Visited').length} places visited</span></summary><div class="map-legend"><span>† Your position</span><span>⌂ Known place</span><span>Ink labels mark places you know</span><span>Optional travel grid · terrain and Focus affect time</span></div></details>`}</section>`;
}

export function validateCartography(v,state){
  if(v===undefined)return true;
  if(!v||v.version!==1||typeof v.offsite!=='boolean'||!v.cells||!v.sites||Array.isArray(v.cells)||Array.isArray(v.sites))return false;
  const atlas=hexAtlas(state),cell=atlas.byKey[v.position];if(!cell||v.offsite===Boolean(cell.siteId)||!v.offsite&&cell.siteId!==state.locationId)return false;
  const valid=x=>x&&ranks[x.kind]&&typeof x.source==='string'&&x.source.length>0&&x.source.length<=240&&Number.isInteger(x.observedDay)&&x.observedDay>=0&&x.observedDay<=state.day&&Number.isInteger(x.generation)&&x.generation>=1&&x.generation<10000;
  if(Object.keys(v.cells).length>atlas.cells.length||Object.entries(v.cells).some(([key,x])=>!atlas.byKey[key]||!valid(x)))return false;
  if(Object.keys(v.sites).length>state.world.locations.length||Object.entries(v.sites).some(([id,x])=>!atlas.sites[id]||!valid(x)||x.condition!==undefined&&!['thriving','scarred','evacuated','destroyed'].includes(x.condition)||x.servicesAvailable!==undefined&&typeof x.servicesAvailable!=='boolean'||x.reports!==undefined&&(!Array.isArray(x.reports)||x.reports.length<1||x.reports.length>6||!x.reports.every((row,i)=>valid(row)&&(i===0||row.observedDay>=x.reports[i-1].observedDay))||new Set(x.reports.map(row=>JSON.stringify([row.observedDay,row.source,row.kind]))).size!==x.reports.length)))return false;
  if(v.pending!==null){const p=v.pending;if(!p||p.from!==v.position||!atlas.byKey[p.to]||distance(cell,atlas.byKey[p.to])!==1||!Number.isInteger(p.totalDays)||p.totalDays<1||p.totalDays>3||!Number.isInteger(p.progress)||p.progress<0||p.progress>p.totalDays||!Number.isInteger(p.startedDay)||p.startedDay<0||p.startedDay>state.day)return false;}
  if(v.route!==undefined&&v.route!==null){const r=v.route;if(r.version!==1||!Array.isArray(r.keys)||r.keys.length<2||r.keys.length>atlas.cells.length||new Set(r.keys).size!==r.keys.length||!Number.isInteger(r.index)||r.index<0||r.index>=r.keys.length-1||r.keys[r.index]!==v.position||atlas.sites[r.destination]!==r.keys.at(-1)||!v.sites[r.destination]||!Number.isInteger(r.startedDay)||r.startedDay<0||r.startedDay>state.day||!r.keys.every((key,i)=>atlas.byKey[key]&&(atlas.byKey[key].terrain!=='water'||atlas.byKey[key].roadLinks.length>0)&&(!i||distance(atlas.byKey[r.keys[i-1]],atlas.byKey[key])===1)))return false;}
  if(v.interior!==null&&(v.offsite||v.pending||!v.interior||v.interior.siteId!==state.locationId||!SETTLEMENT_ROOM_IDS.includes(v.interior.roomId)))return false;
  return true;
}

export function planHexRoute(s,destination){
 const a=hexAtlas(s),start=s.cartography?.position;if(!a.byKey[destination]||start===destination)return null;
 const cost=new Map([[start,0]]),parent=new Map(),open=new Set([start]);
 while(open.size){const at=[...open].sort((x,y)=>cost.get(x)+distance(a.byKey[x],a.byKey[destination])-cost.get(y)-distance(a.byKey[y],a.byKey[destination])||x.localeCompare(y))[0];if(at===destination){const path=[at];while(path[0]!==start)path.unshift(parent.get(path[0]));return path;}open.delete(at);const c=a.byKey[at];for(const [dq,dr]of directions){const n=a.byKey[hexKey(c.q+dq,c.r+dr)];if(!n||n.terrain==='water'&&!n.roadLinks.some(([x,y])=>s.world.roads.some(r=>r.from===x&&r.to===y&&!r.closed)))continue;const next=cost.get(at)+(n.ferry?2:n.road?1:({mountain:3,marsh:2,forest:2}[n.terrain]||1));if(next<(cost.get(n.key)??Infinity)){cost.set(n.key,next);parent.set(n.key,at);open.add(n.key);}}}return null;
}
export function routeSummary(s){const r=s.cartography?.route;if(!r)return null;const a=hexAtlas(s),steps=r.keys.slice(r.index+1),normalDays=steps.reduce((n,key)=>{const c=a.byKey[key];return n+(c.ferry?2:c.road?1:({mountain:3,marsh:2,forest:2}[c.terrain]||1));},0);return {destination:s.world.locations.find(p=>p.id===r.destination)?.name,remaining:steps.length,normalDays};}
