import { chartProject } from './regional-geography-v33.js';
// Draw saved vector geography in the same axial projection as travel. Older
// saves without a continental atlas receive continuous contours from their hexes.
const cache=new WeakMap();
export const chartNumber=n=>Number(n).toFixed(2);
export const chartDistance=(a,b)=>(Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
export function chartPath(points,closed=false,tension=.14){
 if(!points.length)return '';const n=chartNumber;let d=`M${n(points[0][0])} ${n(points[0][1])}`;
 for(let i=0;i<(closed?points.length:points.length-1);i++){const b=points[i],c=points[(i+1)%points.length],a=i?points[i-1]:closed?points.at(-1):b,f=i+2<points.length?points[i+2]:closed?points[(i+2)%points.length]:c;d+=`C${n(b[0]+(c[0]-a[0])*tension)} ${n(b[1]+(c[1]-a[1])*tension)} ${n(c[0]-(f[0]-b[0])*tension)} ${n(c[1]-(f[1]-b[1])*tension)} ${n(c[0])} ${n(c[1])}`;}return d+(closed?'Z':'');
}
export function chartPolygon(c,radius=28){return Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return `${chartNumber(c.x+radius*Math.cos(a))},${chartNumber(c.y+radius*Math.sin(a))}`;}).join(' ');}
function simplify(p,tolerance=.8){if(p.length<4)return p;const a=p[0],b=p.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy||1;let max=0,at=0;for(let i=1;i<p.length-1;i++){const q=p[i],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/den)),d=Math.hypot(q[0]-a[0]-dx*t,q[1]-a[1]-dy*t);if(d>max){max=d;at=i;}}return max>tolerance?[...simplify(p.slice(0,at+1),tolerance).slice(0,-1),...simplify(p.slice(at),tolerance)]:[a,b];}
function contours(samples,columns,rows,channel,threshold,step){
 const segments=[],xy=index=>[index%columns*step,Math.floor(index/columns)*step];
 for(let y=0;y<rows-1;y++)for(let x=0;x<columns-1;x++){const a=y*columns+x,b=a+1,c=a+columns+1,d=a+columns;for(const tri of [[a,b,c],[a,c,d]]){const edges=[];for(let i=0;i<3;i++){const ai=tri[i],bi=tri[(i+1)%3],av=samples[ai][channel]-threshold,bv=samples[bi][channel]-threshold;if((av>0)===(bv>0))continue;const a=xy(ai),b=xy(bi),t=av/(av-bv);edges.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}if(edges.length===2)segments.push(edges);}}
 const key=p=>p.map(n=>n.toFixed(3)).join(','),links=new Map(),used=new Set();for(let i=0;i<segments.length;i++)for(const p of segments[i]){const k=key(p);if(!links.has(k))links.set(k,[]);links.get(k).push(i);}
 const loops=[];for(let i=0;i<segments.length;i++){if(used.has(i))continue;const line=[segments[i][0],segments[i][1]];used.add(i);let current=key(line.at(-1));for(let n=0;n<segments.length&&current!==key(line[0]);n++){const next=links.get(current)?.find(j=>!used.has(j));if(next===undefined)break;used.add(next);const pair=segments[next],p=key(pair[0])===current?pair[1]:pair[0];line.push(p);current=key(p);}if(line.length>5&&current===key(line[0])){const points=simplify(line,.65);if(points.length>3){points.pop();loops.push(points);}}}return loops;
}
export function paperMapGeography(state,atlas){
 if(cache.has(atlas))return cache.get(atlas);
 let land=[],forest=[],mountain=[],marsh=[];
 if(!state.world.map?.atlas?.landmasses?.length){
 const step=7,columns=Math.ceil(atlas.width/step)+1,rows=Math.ceil(atlas.height/step)+1,samples=[];
 // A sea collar closes continental contours inside the printed margin.
 const anchors=[...atlas.cells];for(let r=-1;r<=11;r++)for(let col=-1;col<=15;col++)if(r===-1||r===11||col===-1||col===15)anchors.push({x:45+Math.sqrt(3)*29*(col+(r%2? .5:0)),y:43+43.5*r,terrain:'water'});
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const px=x*step,py=y*step,total=[0,0,0,0,0];for(const c of anchors){const d2=(c.x-px)**2+(c.y-py)**2;if(d2>15000)continue;const w=1/(d2+65)**2;total[0]+=w;if(c.terrain!=='water')total[1]+=w;if(c.terrain==='forest')total[2]+=w;if(c.terrain==='mountain')total[3]+=w;if(c.terrain==='marsh')total[4]+=w;}const sum=total[0]||1,wave=.025*Math.sin(px*.073+Math.sin(py*.057))+.018*Math.sin(py*.13+px*.047);samples.push([total[1]/sum+wave,total[2]/sum+wave,total[3]/sum+wave,total[4]/sum+wave]);}
 land=contours(samples,columns,rows,0,.48,step);forest=contours(samples,columns,rows,1,.37,step);mountain=contours(samples,columns,rows,2,.37,step);marsh=contours(samples,columns,rows,3,.37,step);
 }
 const project=p=>chartProject(state.world,p);
 const projectedOutline=points=>{const dense=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/18));for(let j=0;j<count;j++){const t=j/count;dense.push(project([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]));}}return dense;};
 const sourceLand=state.world.map?.atlas?.landmasses,sourceTerrain=state.world.map?.terrain||[],naturalLand=sourceLand?.length?sourceLand.map(l=>projectedOutline(l.points)):land;
 const sourceLayer=(type,fallback)=>sourceLand?.length?sourceTerrain.filter(t=>t.type===type).map(t=>projectedOutline(t.points)):fallback;
 const naturalForest=sourceLayer('forest',forest),naturalMountain=sourceLayer('mountain',mountain),naturalMarsh=sourceLayer('marsh',marsh),lakes=sourceLayer('water',[]);
 const result={land:naturalLand,forest:naturalForest,mountain:naturalMountain,marsh:naturalMarsh,lakes,landPath:naturalLand.map(p=>chartPath(p,true,.1)).join(''),lakePath:lakes.map(p=>chartPath(p,true,.1)).join(''),forestPath:naturalForest.map(p=>chartPath(p,true,.1)).join(''),mountainPath:naturalMountain.map(p=>chartPath(p,true,.1)).join(''),marshPath:naturalMarsh.map(p=>chartPath(p,true,.1)).join(''),rivers:(state.world.map?.atlas?.rivers||[]).map(r=>({...r,points:r.points.map(project)})),project};cache.set(atlas,result);return result;
}
