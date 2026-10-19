import { properPlaceName } from './presentation-names.js';
import { renderHexMap } from './cartography.js';
import { findRoute, travelPreview, seededRoll } from './world.js';
import { renderAvatar } from './avatar.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const icons = {
  city: '<path d="M4 27V11l6-7 5 7v16m3 0V8h9v19M20 8V4m5 4V3M2 27h28M5 14h8m-8 5h8m-8 4h8m7-11h2m-2 5h2m-2 5h2"/>',
  village: '<path d="m2 14 13-11 15 12M6 12v15h20V13m-13 14v-8h6v8M8 15l3-3m-3 8 3-3m11-2 2-2m-2 7 2-2M3 28h27"/>',
  forest: '<path d="m16 2-8 10h4L6 20h6L4 26h24l-8-6h6l-7-8h5L16 2Zm0 9v19M8 23l5-3m-3-5 4-3m7 13-4-3m3-6-4-4"/>',
  ruin: '<path d="M5 28V10h7l-2 8 5-3 1 13m4 0V13l6-4v19M2 28h28M5 10l4-6m11 9-3-8m9 4 2-5M7 22h4m10-3h4m-4 5h4m-9 4-3-5"/>',
  mountain: '<path d="m2 28 12-24 8 15 4-8 5 17H2Zm7-14 5 4 4-3m-4-5-1 14m6-5 4 8m3-10-1 8M6 22l4 4"/>',
  marsh: '<path d="M2 23h7l3-2 7 2h11M3 28h8l4-2 7 2h7M10 20V4m0 5L5 5m5 9 5-6m7 12V5m0 8 5-7M6 19l-2-4m23 5 2-4"/>',
  coast: '<path d="M2 28h8l4-2 7 2h9M6 21h21l-6 5H11l-5-5Zm11 0V3l11 14H17m-4 4V8L4 18h9m8-10 2 7m-13 0-2 2"/>',
  tower: '<path d="M8 28V10l8-8 8 8v18M6 10h20M5 28h22M14 14h4v5h-4m0 9v-5h4v5M9 12l3 2m-3 5 3 2m8-8 3 2m-3 5 3 2"/>',
  camp: '<path d="m2 28 14-24 14 24H2Zm9 0 5-12 5 12M8 6l16 22m0-22L8 28M6 22l5-4m11 4-5-4M2 30h28"/>',
  gate: '<path d="M5 28V5h7v7h8V5h7v23M12 28V18l4-4 4 4v10M3 5h11m4 0h11M7 10h3m-3 5h3m-3 5h3m12-10h3m-3 5h3m-3 5h3"/>',
  citadel: '<path d="M3 28V8h7v6h4V3h4v11h4V8h7v20H3Zm10 0V20h6v8M2 8h9m10 0h9M5 12h3m-3 6h3m16-6h3m-3 6h3M15 8h2"/>',
  sanctuary: '<path d="M6 28V11l10-9 10 9v17M4 11h24M13 28V18l3-4 3 4v10M16 6v6m-3-3h6M8 15l3-2m-3 7 3-2m10-3 3-2m-3 7 3-2"/>',
};
function icon(type, status) { return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${status === 'destroyed' ? icons.ruin : icons[type] || icons.village}</svg>`; }
function model(state) {
  const map = state.world?.map;
  if (map?.nodes?.length) return map;
  const positions = {home:[370,455],city:[570,320],brook:[725,480],forest:[480,580],ruin:[270,615]};
  return {width:1000,height:700,nodes:(state.world?.locations || []).map(l=>({id:l.id,x:(positions[l.id]||[500,350])[0],y:(positions[l.id]||[500,350])[1]})),terrain:[],landmarks:[]};
}
const rounded = value => Math.round(num(value)*100)/100;
const linePath = points => points.map((point,index)=>`${index?'L':'M'}${rounded(point[0])} ${rounded(point[1])}`).join(' ');
function smoothPath(points,closed=false) {
  if(points.length<3)return linePath(points)+(closed?' Z':'');
  const p=points.map(point=>[num(point[0]),num(point[1])]);
  let result=`M${rounded(p[0][0])} ${rounded(p[0][1])}`;
  const last=closed?p.length:p.length-1;
  for(let index=0;index<last;index++) {
    const a=p[(index-1+p.length)%p.length],b=p[index],c=p[(index+1)%p.length],d=p[(index+2)%p.length];
    const before=!closed&&index===0?b:a,after=!closed&&index===p.length-2?c:d;
    result+=` C${rounded(b[0]+(c[0]-before[0])/6)} ${rounded(b[1]+(c[1]-before[1])/6)} ${rounded(c[0]-(after[0]-b[0])/6)} ${rounded(c[1]-(after[1]-b[1])/6)} ${rounded(c[0])} ${rounded(c[1])}`;
  }
  return result+(closed?' Z':'');
}
function roadPoints(state,road,map=model(state)) {
  const a=map.nodes.find(node=>node.id===road.from),b=map.nodes.find(node=>node.id===road.to);
  if(!a||!b)return [];
  if(Array.isArray(road.points)&&road.points.length>1)return road.points.map(point=>[num(point[0]),num(point[1])]);
  // Older saves retain their endpoints and graph. The engraving follows a stable,
  // winding path between those endpoints without creating a new travel connection.
  const forward=String(road.from).localeCompare(String(road.to))<=0,start=forward?a:b,end=forward?b:a;
  const dx=end.x-start.x,dy=end.y-start.y,distance=Math.hypot(dx,dy)||1;
  const bend=(seededRoll(state.seed,`map-road-bend-${[road.from,road.to].sort().join('-')}`,41)-20)*Math.min(1,distance/120);
  const points=Array.from({length:13},(_,index)=>{
    const t=index/12,offset=Math.sin(t*Math.PI)*bend+Math.sin(t*2*Math.PI)*bend*.32;
    return [rounded(start.x+dx*t-dy/distance*offset),rounded(start.y+dy*t+dx/distance*offset)];
  });
  return forward?points:points.reverse();
}
/** Roads, route preview, and the moving pawn use these same saved waypoints. */
export function getMapRouteGeometry(state,route) {
  const map=model(state),points=[],legs=[];
  for(let index=1;index<route.length;index++) {
    const from=route[index-1],to=route[index];
    const road=state.world?.roads?.find(row=>row.from===from&&row.to===to||row.from===to&&row.to===from);
    if(!road)return {points:[],path:'',legs:[]};
    let geometry=roadPoints(state,road,map);
    if(road.from!==from)geometry=[...geometry].reverse();
    if(geometry.length<2)return {points:[],path:'',legs:[]};
    legs.push({from,to,points:geometry});points.push(...(index===1?geometry:geometry.slice(1)));
  }
  return {points,path:linePath(points),legs};
}
const buildingNames = { shelter:'shelter', cottage:'cottage', forge:'forge', garden:'garden', study:'study', refuge:'refuge' };
function soundBuildings(state) {
  const sites=new Map();
  for(const structure of state.workshop?.structures || []) {
    const site=state.world?.locations?.find(location=>location.id===structure.locationId);
    if(structure.condition!=='sound' || !buildingNames[structure.type] || !site || ['destroyed','evacuated'].includes(site.status))continue;
    const group=sites.get(site.id)||[];
    group.push(structure);sites.set(site.id,group);
  }
  return sites;
}
function buildingMarker(buildings) {
  if(!buildings?.length)return '';
  const names=buildings.map(building=>`${buildingNames[building.type]}${building.level>1?` level ${building.level}`:''}`).join(', ');
  return `<span class="map-building-marker" data-map-building-count="${buildings.length}" title="Your ${escape(names)}" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m2 9 8-6 8 6M5 8v9h10V8m-7 9v-5h4v5"/></svg>${buildings.length>1?`<span>${buildings.length}</span>`:''}</span>`;
}

const terrainInk = { mountain: ['#252a1b', '#6d7051'], forest: ['#1f2b1c', '#5c6c49'], marsh: ['#1d2922', '#536657'], water: ['#101a18', '#4a6059'] };
function engravingDefinitions(prefix, seed) {
  const dots = Array.from({length:34}, (_,i)=>`<circle cx="${seededRoll(seed,`map-grain-x-${i}`,73)}" cy="${seededRoll(seed,`map-grain-y-${i}`,67)}" r="${.25+seededRoll(seed,`map-grain-r-${i}`,5)/10}"/>`).join('');
  return `<pattern id="${prefix}-grain" width="73" height="67" patternUnits="userSpaceOnUse"><g fill="#c7bea0" opacity=".12">${dots}</g><path d="M6 14h4m39 38h3M24 61h2" stroke="#8c7956" stroke-width=".6" opacity=".12"/></pattern>
  <pattern id="${prefix}-hatch-forest" width="19" height="19" patternUnits="userSpaceOnUse"><path d="m-4 19 23-23m-6 25 8-8M0 6l6-6" fill="none" stroke="#728062" stroke-width=".65" opacity=".36"/></pattern>
  <pattern id="${prefix}-hatch-mountain" width="53" height="47" patternUnits="userSpaceOnUse"><path d="m4 35 7-19m-1 20 7-22m-1 24 8-28m7 31 4-14m1 10 4-16m-24 22 6 4m9-22 3 5M44 6l4 9m-5-7 1 8m-2 26 4-6" fill="none" stroke="#8c8664" stroke-width=".7" opacity=".32"/></pattern>
  <pattern id="${prefix}-hatch-marsh" width="37" height="31" patternUnits="userSpaceOnUse"><path d="M3 24h11m8-11h12M10 22V9m0 7-4-6m4 3 4-6m13 3V1m0 5 4-4M21 29h9" fill="none" stroke="#718372" stroke-width=".65" opacity=".35"/><circle cx="21" cy="21" r=".7" fill="#89977c" opacity=".4"/></pattern>
  <pattern id="${prefix}-hatch-water" width="42" height="28" patternUnits="userSpaceOnUse"><path d="M-7 8h12l5-2 12 2h16m-16 13h12l5-2 12 2h10" fill="none" stroke="#788f82" stroke-width=".7" opacity=".26"/></pattern>
  <g id="${prefix}-tree"><path d="M0-25-11-10h5L-15 3h8l-12 12h38L7 3h8L6-10h5L0-25Z" fill="#172016" stroke="#71805a" stroke-width="1.1"/><path d="M0-17v35m-7-12 6-3m-9 9 9-4m-8 12 8-5m4-2 6 3m-6 4 10 5M-4 18h8" stroke="#899371" stroke-width=".8" opacity=".6"/></g>
  <g id="${prefix}-peak"><path d="m-23 16 24-40 26 40H-23Z" fill="#151a13" stroke="#9b9774" stroke-width="1.2"/><path d="M1-24-5-6l7-5 6 6-2-9M1-13-9 16m11-26 10 26m-4-9 7 9M-16 5l8 11M17 8l5 8" fill="none" stroke="#b0a583" stroke-width="1" opacity=".7"/><path d="m-10 9 7 7m-3-12 5 7m4-7 6 10m-1-1 3 3" stroke="#7c7756" stroke-width=".7"/></g>
  <g id="${prefix}-reeds"><path d="M-13 7h10m9 4h12M0 4v-20m0 9-6-6m6 11 5-11m5 15v-15m0 6 5-5m-22 8v-9m0 4-4-4" fill="none" stroke="#879376" stroke-width="1"/><path d="M0-17v-6m10 5v-4m-17 9v-4" stroke="#a29c72" stroke-width="2.5"/></g>
  <g id="${prefix}-house"><path d="m-12 0 11-11 13 10M-9-2v13H9V-2m-11 13V5h5v6m-11-12h4v4h-4m3-10 5 5M-14 12h29" fill="#20261a" stroke="#a7a17b" stroke-width="1"/><path d="m-7 8 3 3m8-14 4 4m-8-14 3 3" stroke="#6b6d4e" stroke-width=".8"/></g>
  <g id="${prefix}-mill"><path d="M-9 14V-6h18v20M-12-6 0-15 12-6M0-5v13m-6-7 12 8M-6 9 6 1M-12 14h25" fill="#20261a" stroke="#a7a17b" stroke-width="1"/><circle cx="0" cy="5" r="8" fill="none" stroke="#a7a17b"/></g>
  <g id="${prefix}-boat"><path d="m-14 5 4 6H9l5-6H-14ZM0 5V-14L11 2H0m-3-10-7 9h7" fill="#17231f" stroke="#859c88" stroke-width="1"/></g>
  <g id="${prefix}-ruin"><path d="M-15 12V-8l7-4 3 5v19m9 0V-2l10-8v22M-18 13h36M-12 0h5m14 5h5m-7-17 2-6" fill="#222218" stroke="#a6a17b" stroke-width="1"/></g>`;
}
function cornerEngravings(map) {
  return [[26,26,1,1],[map.width-26,26,-1,1],[26,map.height-26,1,-1],[map.width-26,map.height-26,-1,-1]].map(([x,y,sx,sy])=>`<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="#8c7956" stroke-width=".8" opacity=".65"><path d="M0 44V0h44M6 31V6h25M0 14l14-14M0 25l25-25"/><path d="m12 12 4-4 4 4-4 4-4-4Z"/><circle cx="4" cy="4" r="1.3" fill="#a36443" stroke="none"/></g>`).join('');
}

function centroid(points) {
  return points.reduce((sum,point)=>[sum[0]+num(point[0])/Math.max(1,points.length),sum[1]+num(point[1])/Math.max(1,points.length)],[0,0]);
}
function inside(point,polygon) {
  let result=false;
  for(let index=0,last=polygon.length-1;index<polygon.length;last=index++) {
    const a=polygon[index],b=polygon[last];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
function atlasDefinitions(map,prefix) {
  const land=map.atlas?.landmasses||[];
  return land.length?`<clipPath id="${prefix}-land">${land.map(row=>`<path d="${smoothPath(row.points||[],true)}"/>`).join('')}</clipPath>`:'';
}
function atlasBackdrop(map,prefix) {
  if(!map.atlas?.landmasses?.length)return '';
  const atlas=map.atlas;
  const land=atlas.landmasses.map(row=>{
    const d=smoothPath(row.points||[],true);
    return `<path class="map-shore-shadow" d="${d}"/><path class="map-shore-surf" d="${d}"/><path class="map-landmass" d="${d}"/><path class="map-shoreline" d="${d}"/>`;
  }).join('');
  return `<rect class="map-open-water" width="${map.width}" height="${map.height}"/><rect width="${map.width}" height="${map.height}" fill="url(#${prefix}-hatch-water)"/>${land}`;
}
function hydrology(map) {
  const atlas=map.atlas;
  if(!atlas)return '';
  const rivers=(atlas.rivers||[]).map(river=>{
    const d=smoothPath(river.points||[]),width=Math.max(2,num(river.width));
    return `<g class="map-river" data-map-river="${escape(river.id)}"><path class="map-river-bank" d="${d}" style="stroke-width:${width+7}"/><path class="map-river-water" d="${d}" style="stroke-width:${width}"/><path class="map-river-current" d="${d}"/></g>`;
  }).join('');
  const ridges=(atlas.ridges||[]).map(ridge=>{
    const points=ridge.points||[],d=smoothPath(points);
    const hatches=points.slice(1).map((point,index)=>{
      const before=points[index],dx=point[0]-before[0],dy=point[1]-before[1],length=Math.hypot(dx,dy)||1;
      return Array.from({length:Math.max(2,Math.floor(length/13))},(_,tick)=>{
        const t=(tick+1)/(Math.max(2,Math.floor(length/13))+1),x=before[0]+dx*t,y=before[1]+dy*t;
        return `<path d="M${rounded(x-dy/length*5)} ${rounded(y+dx/length*5)}l${rounded(-dy/length*10)} ${rounded(dx/length*10)}M${rounded(x+dy/length*5)} ${rounded(y-dx/length*5)}l${rounded(dy/length*6)} ${rounded(-dx/length*6)}"/>`;
      }).join('');
    }).join('');
    return `<g class="map-ridge"><path class="map-ridge-back" d="${d}"/><path class="map-ridge-crest" d="${d}"/><g class="map-ridge-hachures">${hatches}</g></g>`;
  }).join('');
  return rivers+ridges;
}
function terrainDrawing(map,prefix) {
  return (map.terrain||[]).map(row=>{
    const points=row.points||[],d=smoothPath(points,true),ink=terrainInk[row.type]||['#1d2419','#6d7051'];
    const [cx,cy]=centroid(points);
    const contours=row.type==='mountain'? [0.88,0.68,0.46].map(scale=>`<path class="map-elevation-contour" d="${smoothPath(points.map(point=>[cx+(point[0]-cx)*scale,cy+(point[1]-cy)*scale]),true)}"/>`).join(''):'';
    return `<path class="map-biome ${escape(row.type)}" d="${d}" style="fill:${ink[0]};stroke:${ink[1]}"/><path class="map-print-hatch" d="${d}" fill="url(#${prefix}-hatch-${Object.hasOwn(terrainInk,row.type)?row.type:'forest'})" stroke="none"/>${contours}`;
  }).join('');
}
function engravedCountryside(state,map,prefix) {
  const seed=state.seed,details=[];
  const clear=point=>map.nodes.every(node=>Math.hypot(node.x-point[0],node.y-point[1])>58);
  const onLand=point=>!map.atlas?.landmasses?.length||map.atlas.landmasses.some(row=>inside(point,row.points));
  for(const row of map.terrain||[]) {
    if(!['forest','marsh'].includes(row.type))continue;
    const points=row.points||[],xs=points.map(point=>point[0]),ys=points.map(point=>point[1]);
    const lowX=Math.min(...xs),lowY=Math.min(...ys),width=Math.max(...xs)-lowX,height=Math.max(...ys)-lowY;
    const count=row.type==='forest'?44:24;
    for(let index=0;index<count;index++) {
      const x=lowX+seededRoll(seed,`cartography-${row.id}-x-${index}`,10000)/10000*width,y=lowY+seededRoll(seed,`cartography-${row.id}-y-${index}`,10000)/10000*height;
      if(!inside([x,y],points)||!clear([x,y])||!onLand([x,y]))continue;
      const scale=.35+seededRoll(seed,`cartography-${row.id}-size-${index}`,35)/100;
      details.push(`<use href="#${prefix}-${row.type==='forest'?'tree':'reeds'}" transform="translate(${rounded(x)} ${rounded(y)}) scale(${scale})"/>`);
    }
  }
  for(const node of map.nodes) {
    const location=state.world.locations.find(row=>row.id===node.id);
    if(!location)continue;
    const ruined=location.status==='destroyed',type=location.type;
    const houses=['city','village','citadel','camp'].includes(type)?(type==='city'?9:5):2;
    for(let index=0;index<houses;index++) {
      const angle=(index/houses)*Math.PI*2+seededRoll(seed,`hamlet-${node.id}-turn`,100)/100;
      const radius=34+seededRoll(seed,`hamlet-${node.id}-radius-${index}`,22),x=node.x+Math.cos(angle)*radius,y=node.y+Math.sin(angle)*radius;
      if(!onLand([x,y])||map.nodes.some(other=>other.id!==node.id&&Math.hypot(other.x-x,other.y-y)<55))continue;
      const symbol=ruined?'ruin':type==='coast'?'boat':node.id==='mill'?'mill':['city','village','camp','citadel','gate','sanctuary'].includes(type)?'house':type==='mountain'?'peak':type==='marsh'?'reeds':type==='forest'?'tree':'ruin';
      details.push(`<use class="map-settlement-engraving" href="#${prefix}-${symbol}" transform="translate(${rounded(x)} ${rounded(y)}) scale(${.45+seededRoll(seed,`hamlet-${node.id}-scale-${index}`,25)/100})"/>`);
    }
    if(['city','village'].includes(type)&&!ruined) {
      for(let index=0;index<3;index++) {
        const angle=seededRoll(seed,`field-${node.id}-${index}-angle`,360)*Math.PI/180,radius=60+index*14,x=node.x+Math.cos(angle)*radius,y=node.y+Math.sin(angle)*radius;
        if(!onLand([x,y])||!clear([x,y]))continue;
        const w=18+seededRoll(seed,`field-${node.id}-${index}-width`,17),h=12+seededRoll(seed,`field-${node.id}-${index}-height`,14);
        const furrows=Array.from({length:Math.floor(w/4)},(_,n)=>`M${n*4} 0v${h}`).join(' ');
        details.push(`<g class="map-field" transform="translate(${rounded(x)} ${rounded(y)}) rotate(${seededRoll(seed,`field-${node.id}-${index}-rotation`,70)-35})"><path class="map-field-boundary" d="M0 0h${w}v${h}H0Z"/><path class="map-field-furrows" d="${furrows}"/></g>`);
      }
    }
  }
  return `<g class="map-countryside" ${map.atlas?.landmasses?.length?`clip-path="url(#${prefix}-land)"`:''}>${details.join('')}</g>`;
}
function geographicLabels(map) {
  const regions=map.atlas?.regions?.length?map.atlas.regions:(map.terrain||[]).map(row=>{const [x,y]=centroid(row.points||[]);return {name:row.label,x,y,type:row.type};});
  const labels=regions.filter(row=>row.name).map(row=>`<text class="map-region-label map-label-${escape(row.type||'land')}" x="${rounded(row.x)}" y="${rounded(row.y)}">${escape(row.name)}</text>`).join('');
  const rivers=(map.atlas?.rivers||[]).filter(row=>row.name&&row.points?.length>2).map(row=>{
    const point=row.points[Math.floor(row.points.length/2)];
    return `<text class="map-water-label" x="${rounded(point[0]+10)}" y="${rounded(point[1]-10)}">${escape(row.name)}</text>`;
  }).join('');
  return `<g class="map-geographic-labels">${labels}${rivers}</g>`;
}
function captionPositions(state,map,selectedId) {
  // Plan for the narrow board as well as desktop. Captions occupy separate
  // spaces around the pins instead of all sitting on the same southern edge.
  const scales=[.72,.9,1.1],placed=[],result=new Map();
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const nodes=[...map.nodes].sort((a,b)=>Number(b.id===state.locationId||b.id===selectedId)-Number(a.id===state.locationId||a.id===selectedId));
  for(const node of nodes) {
    const place=state.world.locations.find(row=>row.id===node.id),width=Math.min(142,Math.max(56,String(place?.name||'').length*7.1+16)),height=30;
    const candidates=[[0,37],[0,-39],[width/2+27,0],[-width/2-27,0],[width/2+20,34],[-width/2-20,34],[width/2+20,-36],[-width/2-20,-36],[0,64],[0,-66],[width/2+20,58],[-width/2-20,58],[width/2+20,-60],[-width/2-20,-60]];
    const choices=candidates.map(([x,y],index)=>{
      let score=index*.2+(node.id===state.locationId&&y<0?10:0);
      for(const scale of scales) {
        const box={x:node.x*scale+x-width/2,y:node.y*scale+y-height/2,w:width,h:height};
        const pins=map.nodes.filter(other=>other.id!==node.id).map(other=>({x:other.x*scale-22,y:other.y*scale-22,w:44,h:44}));
        const captions=placed.map(other=>({x:other.node.x*scale+other.x-other.width/2,y:other.node.y*scale+other.y-height/2,w:other.width,h:height}));
        score+=captions.filter(other=>intersects(box,other)).length*20+pins.filter(other=>intersects(box,other)).length*8+(box.x<12||box.x+box.w>map.width*scale-12||box.y<12||box.y+box.h>map.height*scale-12?12:0);
      }
      return {x,y,score,node,width};
    }).sort((a,b)=>a.score-b.score);
    placed.push(choices[0]);result.set(node.id,choices[0]);
  }
  return result;
}

/** The drawing is generated from the same locations and roads that drive travel. */
export function renderWorldMap(state, {compact=false,selectedId=null,movement=null,quests=[],instanceId=''}={}) {
  if(state.cartography)return renderHexMap(state,{compact,selectedKey:state.cartography.position});
  const map=model(state), current=map.nodes.find(n=>n.id===state.locationId);
  const selected=selectedId ? travelPreview(state,selectedId) : null;
  const route=selected?.route || [];
  const questSites=new Set(quests.filter(q=>q.status==='active').map(q=>q.locationId));
  const builtSites=soundBuildings(state);
  const prefix=`map-${compact?'near':'world'}-${seededRoll(state.seed,`map-art-${instanceId}`,100000)}`;
  const terrain=terrainDrawing(map,prefix);
  const landmarks=(map.landmarks||[]).map(l=>`<use href="#${prefix}-${l.type==='peak'?'peak':'tree'}" transform="translate(${num(l.x)} ${num(l.y)}) scale(${num(l.scale)})"/>`).join('');
  const roadGeometry=(state.world.roads||[]).map(road=>({...road,points:roadPoints(state,road,map)}));
  const roads=roadGeometry.map(road=>{
    if(road.points.length<2)return '';
    const middle=road.points[Math.floor(road.points.length/2)],x=middle[0],y=middle[1],ferry=road.crossing==='water'||/ferry/i.test(road.kind||'');
    return `<g class="map-road-link" data-map-road-from="${escape(road.from)}" data-map-road-to="${escape(road.to)}"><path class="map-road-shadow" d="${linePath(road.points)}"/><path class="map-road ${road.closed?'closed':''} ${ferry?'ferry':''}" d="${linePath(road.points)}"><title>${escape(road.kind||'Road')}</title></path>${ferry?`<use class="map-ferry-engraving" href="#${prefix}-boat" transform="translate(${rounded(x)} ${rounded(y-8)}) scale(.6)"/>`:''}${road.closed||road.danger>=4?`<path class="map-road-warning" d="m${rounded(x-4)} ${rounded(y-6)} 8 12m-8 0 8-12"/>`:''}</g>`;
  }).join('');
  const labels=geographicLabels(map),routeGeometry=getMapRouteGeometry(state,route);
  const captions=captionPositions(state,map,selectedId);
  const nodes=map.nodes.map(n=>{
    const location=state.world.locations.find(l=>l.id===n.id);if(!location)return '';
    const status=location.status||'thriving', isCurrent=n.id===state.locationId, isSelected=n.id===selectedId, quest=questSites.has(n.id), buildings=builtSites.get(n.id);
    const buildingLabel=buildings?.length?`, your ${buildings.map(building=>buildingNames[building.type]).join(', ')}`:'';
    const caption=captions.get(n.id)||{x:0,y:37};
    return `<button type="button" class="map-node ${isCurrent?'current':''} ${isSelected?'selected':''} ${quest?'has-quest':''} ${buildings?.length?'has-buildings':''} ${escape(status)}" style="left:${num(n.x)/map.width*100}%;top:${num(n.y)/map.height*100}%;--map-caption-x:${caption.x}px;--map-caption-y:${caption.y}px" data-op="map-select" data-id="${escape(n.id)}" aria-label="${escape(properPlaceName(location.name))}${isCurrent?', your current location':''}${status!=='thriving'?`, ${status}`:''}${quest?', active quest':''}${escape(buildingLabel)}" aria-pressed="${isSelected}" ${isCurrent?'aria-current="location"':''} title="${escape(location.name)}${status!=='thriving'?` · ${escape(status)}`:''}${escape(buildingLabel)}"><svg class="map-caption-leader" viewBox="0 0 46 46" aria-hidden="true"><path d="M23 23L${rounded(23+caption.x)} ${rounded(23+caption.y)}"/></svg><span class="map-node-pin">${icon(location.type,status)}${quest?'<span class="map-quest-marker" aria-hidden="true">!</span>':''}${status==='destroyed'?'<span class="map-damage-mark" aria-hidden="true">×</span>':''}${buildingMarker(buildings)}</span><span class="map-node-label">${escape(location.name)}</span></button>`;
  }).join('');
  const piece=current?`<div class="map-piece" data-map-piece data-location-id="${escape(state.locationId)}" style="left:${current.x/map.width*100}%;top:${current.y/map.height*100}%" aria-label="${escape(state.hero?.name||'Your character')} is here"><span class="map-piece-portrait" aria-hidden="true">${renderAvatar(state.hero||{name:'You'},{size:'small',age:state.age,context:prefix})}</span><svg class="map-pawn" viewBox="0 0 44 42" fill="none" aria-hidden="true"><ellipse cx="22" cy="37" rx="20" ry="5" fill="#030604" opacity=".6"/><path d="M15 9h14l-2 13 8 9v5H9v-5l8-9-2-13Z" fill="#8b8763" stroke="#c7bea0" stroke-width="1.7"/><path d="M13 10h18M16 22h12M12 31h20" stroke="#c6c49a" stroke-width="1.3"/><path d="M7 36h30" stroke="#595a3c" stroke-width="3" stroke-linecap="round"/></svg></div>`:'';
  const geometryData=escape(JSON.stringify(roadGeometry.map(road=>({from:road.from,to:road.to,points:road.points.map(point=>[point[0]/map.width*100,point[1]/map.height*100])}))));
  return `<section class="world-board v9-cartography ${compact?'compact':''}" aria-label="Map of ${escape(state.world.name)}"><div class="map-toolbar"><div><span class="eyebrow">${compact?'THE WORLD AROUND YOU':'CHART OF THE KNOWN COUNTRY'}</span><strong>${escape(state.world.name)}</strong>${!compact&&map.atlas?.name?`<span class="map-atlas-subtitle">${escape(map.atlas.name)}</span>`:''}</div><div class="map-controls" role="group" aria-label="Map controls"><button type="button" class="button ghost" data-op="map-zoom" data-id="out" aria-label="Zoom out">−</button><button type="button" class="button ghost" data-op="map-zoom" data-id="in" aria-label="Zoom in">+</button><button type="button" class="button ghost" data-op="map-zoom" data-id="reset" aria-label="Show the whole map">⌖</button></div></div><div class="map-viewport" tabindex="0" aria-label="Scrollable regional map"><div class="map-canvas" data-map-canvas data-map-roads="${geometryData}"><svg class="map-terrain" viewBox="0 0 ${map.width} ${map.height}" preserveAspectRatio="none" aria-hidden="true"><defs>${engravingDefinitions(prefix,state.seed)}${atlasDefinitions(map,prefix)}</defs><rect width="${map.width}" height="${map.height}" fill="#1e2519"/>${atlasBackdrop(map,prefix)}<g ${map.atlas?.landmasses?.length?`clip-path="url(#${prefix}-land)"`:''}>${terrain}${hydrology(map)}${landmarks}</g>${engravedCountryside(state,map,prefix)}<rect width="${map.width}" height="${map.height}" fill="url(#${prefix}-grain)"/><g class="map-routes">${roads}</g>${routeGeometry.path?`<path class="map-selected-route" d="${routeGeometry.path}"/>`:''}${labels}<g class="map-compass" transform="translate(${map.width-80} 77)"><circle r="28"/><circle r="23" fill="none" stroke-dasharray="1 5"/><path d="m0-23 7 23-7 23-7-23 7-23Zm-23 23 23-7 23 7-23 7-23-7Z"/><path d="m0-17 3 17-3 17-3-17 3-17Z" fill="#a2ae71" opacity=".5"/><text x="0" y="-37">N</text></g><rect x="10" y="10" width="${map.width-20}" height="${map.height-20}" rx="1" class="map-frame"/><rect x="16" y="16" width="${map.width-32}" height="${map.height-32}" fill="none" stroke="#8c7956" stroke-width=".5" opacity=".3"/>${cornerEngravings(map)}<g class="map-scale-rule" transform="translate(38 ${map.height-35})"><path d="M0-5v10m0-5h80m0-5v10m-40-10v7"/><text x="0" y="-12">REGIONAL CHART · ROADS BY JOURNEY</text></g></svg>${nodes}${piece}</div></div><div class="map-legend"><span><i class="legend-current"></i>Your place</span><span><i class="legend-quest"></i>Active quest</span><span><i class="legend-damage"></i>Lasting damage</span>${builtSites.size?'<span><i class="legend-building"></i>Your buildings</span>':''}${roadGeometry.some(road=>road.crossing==='water'||/ferry/i.test(road.kind||''))?'<span><i class="legend-ferry"></i>Ferry passage</span>':''}<span class="map-hint">Select a place to plan a journey</span></div></section>`;
}

/** Only completed travel creates a movement; a year passing never moves the pawn. */
export function getMapMovement(previous,next) {
  if (!previous || !next || previous.locationId===next.locationId) return null;
  const candidates=[next.timeline?.journey?.traversedIds,next.timeline?.lastJourney?.route,previous.timeline?.journey?.route];
  let route;
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const start=candidate.indexOf(previous.locationId),end=candidate.indexOf(next.locationId);
    if(start>=0&&end>start){route=candidate.slice(start,end+1);break;}
  }
  route ||= findRoute(next.world,previous.locationId,next.locationId);
  if(route.length<2) return null;
  return {route,from:previous.locationId,to:next.locationId};
}

/** Keep a selected destination or the player visible on narrow, scrollable boards. */
export function centerWorldMap(root,id=null) {
  if(!root)return;
  for(const board of root.querySelectorAll('.world-board, .hex-board')) {
    const viewport=board.querySelector('.hex-map-scroll')||board.querySelector('.map-viewport'),canvas=board.querySelector('[data-map-canvas]');
    if(!viewport||!canvas)continue;
    const nodes=[...canvas.querySelectorAll('.map-node, .hex-cell, .destination-pin, .journey-map-position')];
    const node=nodes.find(node=>id&&(node.dataset.id===id||node.dataset.siteId===id))||nodes.find(node=>node.classList.contains('current'));
    if(!node)continue;
    viewport.scrollLeft=Math.max(0,Math.min(Math.max(0,canvas.clientWidth-viewport.clientWidth),parseFloat(node.style.left)/100*canvas.clientWidth-viewport.clientWidth/2));
    viewport.scrollTop=Math.max(0,Math.min(Math.max(0,canvas.clientHeight-viewport.clientHeight),parseFloat(node.style.top)/100*canvas.clientHeight-viewport.clientHeight/2));
  }
}

/** Animate the new board from the actual old position; saved state is already final. */
export async function animateMapMovement(root,movement) {
  if(!root || !movement?.route?.length || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const pieces=[...root.querySelectorAll('[data-map-piece]')].filter(piece=>piece.dataset.locationId===movement.to);
  await Promise.all(pieces.map(async piece=>{
    const canvas=piece.closest('[data-map-canvas]');if(!canvas||typeof piece.animate!=='function')return;
    const board=canvas.closest('.world-board');
    let roads=[];
    try { roads=JSON.parse(canvas.dataset?.mapRoads||'[]'); } catch {}
    const geometry=[];
    for(let index=1;index<movement.route.length;index++) {
      const from=movement.route[index-1],to=movement.route[index],road=roads.find(row=>row.from===from&&row.to===to||row.from===to&&row.to===from);
      if(!road||!Array.isArray(road.points)) {geometry.length=0;break;}
      const oriented=road.from===from?road.points:[...road.points].reverse();
      geometry.push(...(index===1?oriented:oriented.slice(1)));
    }
    const points=geometry.length?geometry.map(point=>({x:num(point[0])/100*canvas.clientWidth,y:num(point[1])/100*canvas.clientHeight})):movement.route.map(id=>canvas.querySelector(`.map-node[data-id="${String(id).replace(/["\\]/g,'\\$&')}"]`)).filter(Boolean).map(node=>({x:parseFloat(node.style.left)/100*canvas.clientWidth,y:parseFloat(node.style.top)/100*canvas.clientHeight}));
    if(points.length<2)return;
    const lengths=points.map((point,index)=>index?Math.hypot(point.x-points[index-1].x,point.y-points[index-1].y):0);
    const total=lengths.reduce((sum,length)=>sum+length,0);
    if(!total)return;
    let traversed=0;
    const last=points.at(-1),keyframes=points.map((point,index)=>{
      traversed+=lengths[index];
      return {transform:`translate(calc(-50% + ${point.x-last.x}px), calc(-78% + ${point.y-last.y}px))`,offset:traversed/total};
    });
    board?.classList.add('is-moving');
    const animation=piece.animate(keyframes,{duration:Math.min(1900,650+movement.route.length*210),easing:'linear'});
    try{await animation.finished;}catch{}finally{board?.classList.remove('is-moving');}
  }));
}
