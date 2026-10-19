import { properPlaceName } from './presentation-names.js';
import {cartographyView} from './cartography.js';
import {renderPaperMap,paperMapLayout,paperMapPosition,PAPER_MAP_TEXTURE} from './paper-map.js';
import {getMapRouteGeometry} from './map.js';
import {chartProject} from './regional-geography-v33.js';

const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function along(points,ratio){
 if(!points.length)return null;
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,ratio));
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=remaining/(lengths[i]||1);return {x:points[i][0]+(points[i+1][0]-points[i][0])*t,y:points[i][1]+(points[i+1][1]-points[i][1])*t};}remaining-=lengths[i];}
 return {x:points.at(-1)[0],y:points.at(-1)[1]};
}
/** Drawing only. A marker between waypoints never grants arrival or discovery. */
export function journeyMapModel(s,preview=null){
 const v=cartographyView(s),byKey=Object.fromEntries(v.cells.map(c=>[c.key,c])),point=key=>{const c=byKey[key];return c?paperMapPosition(s,c):null;},j=s.timeline?.journey;
 let traveller=point(s.cartography.position),path=[];
 if(j){
  const geometry=getMapRouteGeometry(s,j.route),leg=geometry.legs[j.legIndex],days=j.legs?.[j.legIndex]?.totalDays||s.world.roads.find(r=>r.from===leg?.from&&r.to===leg?.to||r.to===leg?.from&&r.from===leg?.to)?.days||1;
  const part=j.energyStep?j.energyStep.progress/j.energyStep.totalDays:0;
  const p=leg&&along(leg.points,(j.legProgress+part)/days);
  if(p){const [x,y]=chartProject(s.world,[p.x,p.y]);traveller={x,y};}
  path=getMapRouteGeometry(s,j.route.slice(j.legIndex)).points.map(p=>chartProject(s.world,p));
 }else {
  const p=s.cartography.pending,r=s.cartography.route;
  if(p){const a=point(p.from),b=point(p.to),part=p.energyStep?p.energyStep.progress/p.energyStep.totalDays:0,t=(p.progress+part)/p.totalDays;if(a&&b)traveller={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
  const keys=r?r.keys.slice(r.index):p?[p.from,p.to]:preview?.mode==='trail'?preview.keys:[];
  path=keys.map(point).filter(Boolean).map(p=>[p.x,p.y]);
  if(!path.length&&preview?.mode==='road')path=getMapRouteGeometry(s,preview.route).points.map(p=>chartProject(s.world,p));
 }
 return {traveller,path};
}
export function renderTravelMap(s,{selectedId=null,preview=null,popup=false,scale=1}={}){
 const raw=cartographyView(s);if(!raw)return '';
 const help=popup?'country-map-help-popup':'country-map-help';
 const v={...raw,cells:raw.cells.map(c=>({...c,...paperMapPosition(s,c)}))},layout=paperMapLayout(s,{view:v}),selected=v.cells.find(c=>c.siteId===selectedId),model=journeyMapModel(s,preview);
 const pins=v.cells.filter(c=>c.siteId&&c.name).map(c=>`<button type="button" class="destination-pin ${selectedId===c.siteId?'selected':''}" style="left:${c.x/layout.width*100}%;top:${(c.y-5)/layout.height*100}%" data-op="destination-select" data-id="${escape(c.siteId)}" data-site-id="${escape(c.siteId)}" aria-describedby="${help}" aria-label="${escape(properPlaceName(c.name))}${c.current&&!s.cartography.offsite&&!s.timeline?.journey?' · You Are Here':''}" aria-pressed="${selectedId===c.siteId}" ><span class="destination-pin-name" aria-hidden="true">${escape(c.name)}</span></button>`).join('');
 const position=model.traveller?`<span class="journey-map-position current" style="left:${model.traveller.x/layout.width*100}%;top:${(model.traveller.y+10)/layout.height*100}%" aria-hidden="true"></span>`:'';
 const art=renderPaperMap(s,{view:v,selectedKey:selected?.key,sheet:'country',destinationMode:true,travelPath:model.path,traveller:model.traveller,instanceId:popup?'journey-popup':'journey-main',parchmentPath:PAPER_MAP_TEXTURE});
 const canvas=`<div class="hex-map-scroll" data-map-viewport tabindex="0" aria-label="World map. Hold and drag to pan. Scroll to zoom at the pointer. Arrow keys pan, plus and minus zoom, Home finds you."><div class="hex-map-canvas" data-map-canvas style="aspect-ratio:${layout.width}/${layout.height}">${pins}${position}${art}</div></div>`;
 const controls=popup?'':`<div class="journey-map-tools" role="group" aria-label="Map camera"><button type="button" class="button ghost" data-op="map-zoom" data-id="home" aria-label="Find My Position" title="Find My Position">⌖</button><button type="button" class="button ghost" data-op="map-expand" aria-label="Expand Map" title="Expand Map">↗</button></div>`;
 return `<section class="hex-board paper-chart journey-world-map ${popup?'map-only':''}" style="--atlas-ratio:${layout.width/layout.height};--map-scale:${scale}" aria-label="World Travel Map">${canvas}${controls}<p id="${help}" class="sr-only">Hold and drag to pan. Scroll to zoom at the pointer. Arrow keys pan; plus and minus zoom; Home finds you. Hover over a named place to see its name. Click once to select it, review the route, then choose Confirm Journey to travel.${popup?' Escape closes the map.':''}</p>${popup?'':'<p class="journey-map-hint">Drag to Explore · Scroll to Zoom · Click a Place, Then Confirm Journey</p>'}</section>`;
}
