import { REGIONAL_CULTURES } from './regional-content-v33.js';

export function atlasGrid(world){return world?.map?.generationVersion>=7?{columns:37,rows:27}:{columns:15,rows:11};}
export function chartProject(world,[x,y]){const {columns,rows}=atlasGrid(world),sy=y*(rows-1)/700;return [45+x*(columns-1)/1000*Math.sqrt(3)*29+Math.sqrt(3)*29/4*(1-Math.cos(sy*Math.PI)),43+sy*43.5];}
export function territoryAt(world,x,y){const regions=world?.map?.atlas?.territories;if(!regions?.length)return null;return regions.reduce((a,b)=>Math.hypot(x-a.x,y-a.y)<Math.hypot(x-b.x,y-b.y)?a:b).id;}
const inside=([x,y],p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
/** New worlds only. Older saved maps are never expanded or repartitioned. */
export function expandRegionalGeography(world,seed,{roll,name}){
 const map=world.map,dry=p=>map.atlas.landmasses.some(l=>inside(p,l.points))&&!map.terrain.some(t=>t.type==='water'&&inside(p,t.points));
 const candidates=[];for(let y=38;y<665;y+=19)for(let x=38;x<965;x+=19)if(dry([x,y]))candidates.push([x,y]);
 const anchors=[];
 for(const id of ['highstone','saltreach','blackgrove','rainward','ashplain','bellwater']){const r=REGIONAL_CULTURES.find(r=>r.id===id),node=map.nodes.find(n=>n.id===({highstone:'mountain',saltreach:'coast',blackgrove:'forest',rainward:'marsh',ashplain:'citadel',bellwater:'brook'})[id]),goal=node?[node.x,node.y]:[r.anchors[0]*1000,r.anchors[1]*700],choices=candidates.filter(p=>anchors.every(a=>Math.hypot(a.x-p[0],a.y-p[1])>165)),p=(choices.length?choices:candidates).slice().sort((a,b)=>Math.hypot(a[0]-goal[0],a[1]-goal[1])-Math.hypot(b[0]-goal[0],b[1]-goal[1]))[0];anchors.push({id:r.id,name:r.culture,x:p[0],y:p[1],capitalId:'seat-'+r.id});}
 map.atlas.territories=anchors;map.generationVersion=7;
 for(const p of world.locations){const node=map.nodes.find(n=>n.id===p.id);p.regionId=territoryAt(world,node.x,node.y);}
 const kinds=['city','village','village','camp','sanctuary','ruin','forest','mountain'];
 for(const region of anchors)for(let i=0;i<8;i++){
  const id=i?'reach-'+region.id+'-'+i:region.capitalId,type=kinds[i],options=candidates.filter(p=>territoryAt(world,...p)===region.id),goal=i?[region.x+(roll(seed,id+'x',221)-110),region.y+(roll(seed,id+'y',181)-90)]:[region.x,region.y];
  const ranked=options.slice().sort((a,b)=>{const score=p=>Math.min(...map.nodes.map(n=>Math.hypot(n.x-p[0],n.y-p[1])))*4-Math.hypot(p[0]-goal[0],p[1]-goal[1]);return score(b)-score(a);}),p=ranked[0];
  const culture=REGIONAL_CULTURES.find(r=>r.id===region.id),services=i===5?['archive','guide']:i>5?['guide','herbs']:['hearth','market','guide',...(i===0?['smith','academy','order']:i===4?['shrine']:[])];
  const place={id,type,regionId:region.id,name:name(seed,id,region.id),travelDays:2+roll(seed,id+'days',4),safety:2+roll(seed,id+'safety',4),services,description:i===0?`The seat of the ${culture.government.toLowerCase()}. Its ${culture.court.toLowerCase()} hears petitions from across the region.`:i===5?'An abandoned stronghold stands beside a disused road. Its lower chambers remain unexplored.':i>5?'Paths leave the settled country for a wild and sparsely traveled reach.':`A community of ${culture.culture.toLowerCase()}. ${culture.custom}`,necromancyLaw:['permitted','regulated','forbidden'][roll(seed,id+'law',3)],status:'thriving'};
  world.locations.push(place);map.nodes.push({id,x:p[0],y:p[1]});
 }
 // Names are independent rolls, so two places in one world could share one
 // ("Frost Reach" twice). Re-roll later duplicates deterministically, trying a
 // few salted ids before accepting the collision. Only new worlds reach here.
 const taken=new Set();
 for(const place of world.locations){
  let candidate=place.name;
  for(let attempt=1;taken.has(candidate.toLowerCase())&&attempt<=6;attempt++)candidate=name(seed,`${place.id}:alt${attempt}`,place.regionId);
  place.name=candidate;taken.add(candidate.toLowerCase());
 }
 return world;
}
