import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {generateWorld,validateWorld} from '../dist/js/world.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {hexAtlas,initializeCartography,cartographyView,renderHexMap,hexStepPreview} from '../dist/js/cartography.js';
import {paperMapLayout,paperMapSheets,paperMapLabels,paperMapPosition,renderPaperMap} from '../dist/js/paper-map.js';
import {paperMapGeography,chartDistance} from '../dist/js/chart-geometry-v32.js';
import {cartographicDefinitions,cartographicMark} from '../dist/js/cartographic-marks-v32.js';
import {fakeSurface,mountApp} from './helpers/ui-surface.mjs';
const plotted=seed=>{const s={seed,world:generateWorld(seed,{expanded:true,regional:false}),locationId:'home',day:8030,age:22,dynasty:{generation:1},hero:{},life:{people:[]}};initializeCartography(s);return s;};
const intersect=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v28-map-crossing.json.gz',import.meta.url))));
function drain(s){for(let n=0;s.event&&n<100;n++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['continue','keep','care','pause','leave','later','friends'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
const base=drain(await createLifeAtAge({seed:'paper-atlas-production-flow',startAge:22,difficulty:'gentle'}));
async function resume(t){const ui=await mountApp(t,{states:[base]});await ui.click('title-continue');await ui.click('tab','map');return ui;}

test('the primary art uses the saved vector coastline and rivers rather than 165 painted tiles',()=>{
 const s=plotted('paper-design-0'),v=cartographyView(s),before=JSON.stringify(s),g=paperMapGeography(s,v.atlas),svg=renderPaperMap(s,{view:v});assert.equal(g.land.length,s.world.map.atlas.landmasses.length);assert.ok(g.land[0].length>s.world.map.atlas.landmasses[0].points.length);assert.deepEqual(g.land[0][0],g.project(s.world.map.atlas.landmasses[0].points[0]));assert.ok(svg.includes('data-chart-coast=""'));assert.match(svg,/class="paper-terrain-marks"/);assert.match(svg,/cartographic-mark-tree/);assert.match(svg,/cartographic-mark-peak/);for(const r of s.world.map.atlas.rivers)assert.ok(svg.includes(`data-chart-river="${r.id}"`));assert.doesNotMatch(svg,/paper-hex|paper-fog|paper-revealed/);assert.equal(JSON.stringify(s),before);
});
test('all six designed landforms produce distinct reproducible paper charts',()=>{
 const seen=new Map();for(let i=0;i<80&&seen.size<6;i++){const s=plotted('paper-design-'+i);seen.set(s.world.map.atlas.topology,s);}assert.equal(seen.size,6);const prints=new Set();for(const s of seen.values()){assert.equal(s.world.map.generationVersion,6);assert.ok(validateWorld(s.world));const v=cartographyView(s),svg=renderPaperMap(s,{view:v});assert.equal(svg,renderPaperMap(s,{view:v}));prints.add(svg.match(/data-chart-coast="" d="([^"]+)/)[1]);}assert.equal(prints.size,6);
});
test('the continuous projection lands on every travel hex centre without moving the lattice',()=>{
 const s=plotted('paper-design-1'),a=hexAtlas(s),g=paperMapGeography(s,a);for(const c of a.cells){const p=g.project([(c.q+Math.floor(c.r/2))*1000/14,c.r*70]);assert.ok(Math.abs(p[0]-c.x)<1e-8);assert.ok(Math.abs(p[1]-c.y)<1e-8);}assert.equal(a.cells.length,165);
});
test('settlement illustrations retain original mapped positions while selecting the real assigned travel hex',()=>{
 const s=plotted('paper-design-0'),v=cartographyView(s),g=paperMapGeography(s,v.atlas);let offGrid=0;for(const n of s.world.map.nodes){const c=v.atlas.byKey[v.atlas.sites[n.id]],p=paperMapPosition(s,c);assert.deepEqual([p.x,p.y],g.project([n.x,n.y]));if(Math.hypot(p.x-c.x,p.y-c.y)>1)offGrid++;}assert.ok(offGrid>20);const html=renderHexMap(s);assert.ok(html.includes(`data-id="${s.cartography.position}"`));
});
test('new hex road corridors are continuous and occupy real adjacent cells',()=>{
 for(let i=0;i<24;i++){const s=plotted('road-grid-v32-'+i),a=hexAtlas(s);assert.equal(a.roadPaths.length,s.world.roads.length);for(const path of a.roadPaths){assert.equal(path.cells[0],a.sites[path.from]);assert.equal(path.cells.at(-1),a.sites[path.to]);assert.equal(new Set(path.cells).size,path.cells.length);for(let j=1;j<path.cells.length;j++)assert.equal(chartDistance(a.byKey[path.cells[j-1]],a.byKey[path.cells[j]]),1);for(const key of path.cells)assert.ok(a.byKey[key].roadLinks.some(([x,y])=>x===path.from&&y===path.to));}}
});
test('the carried atlas reveals broad geography without introducing unknown settlement names or deeds',()=>{
 const s=plotted('paper-design-0'),v=cartographyView(s),unknown=s.world.locations.find(p=>!s.cartography.sites[p.id]);assert.ok(unknown);unknown.name='THE UNDISCOVERED SEVEN KEYS';const before=JSON.stringify(s),svg=renderPaperMap(s,{view:cartographyView(s)});assert.ok(svg.includes('paper-woodland'));assert.ok(!svg.includes(unknown.name));assert.ok(!svg.includes(`data-chart-site="${unknown.id}"`));assert.equal(JSON.stringify(s),before);
});
test('the travel grid is opt-in and remains separate from the paper terrain',()=>{
 const s=plotted('paper-design-0'),v=cartographyView(s),before=JSON.stringify(s),plain=renderPaperMap(s,{view:v}),grid=renderPaperMap(s,{view:v,grid:true});assert.ok(!plain.includes('data-chart-grid=""'));assert.ok(grid.includes('data-chart-grid=""'));assert.ok((grid.match(/<polygon/g)||[]).length>100);assert.equal(plain.match(/data-chart-coast="" d="([^"]+)/)[1],grid.match(/data-chart-coast="" d="([^"]+)/)[1]);assert.equal(JSON.stringify(s),before);
});
test('country, local, regional and island sheets crop the same world and retain the current country fallback',()=>{
 const s=plotted('paper-design-0'),v=cartographyView(s),sheets=paperMapSheets(s,{view:v});assert.equal(sheets.length,7);assert.equal(new Set(sheets.map(p=>p.id)).size,7);for(const sheet of sheets){const l=paperMapLayout(s,{view:v,sheet:sheet.id});assert.ok(l.x>=0&&l.y>=0&&l.x+l.width<=v.atlas.width&&l.y+l.height<=v.atlas.height);assert.match(renderPaperMap(s,{view:v,sheet:sheet.id}),new RegExp('data-chart-sheet="'+sheet.id+'"'));}assert.equal(paperMapLayout(s,{view:v,sheet:'forged'}).id,'country');assert.equal(paperMapLayout(s,{view:v,compact:true}).id,'near');
});
test('chart labels choose non-overlapping spaces in dense fully known maps',()=>{
 for(const seed of ['paper-design-0','paper-design-3','paper-design-10','paper-design-18']){const s=plotted(seed),v=cartographyView(s);v.cells=v.atlas.cells.map(c=>({...c,...paperMapPosition(s,c),name:c.siteId?s.world.locations.find(p=>p.id===c.siteId).name:null,current:c.key===s.cartography.position}));const layout=paperMapLayout(s,{view:v}),labels=paperMapLabels(s,v.cells,layout);assert.ok(labels.length>20);for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++)assert.ok(!intersect(labels[a],labels[b]),seed+': '+labels[a].name+' / '+labels[b].name);}
});
test('SVG definitions are isolated, references resolve and player text stays escaped',()=>{
 const s=plotted('paper-design-0');s.world.name='<script>atlas</script>';s.world.map.atlas.regions[0].name='" onload="bad';const v=cartographyView(s),svg=renderPaperMap(s,{view:v,instanceId:'one'})+renderPaperMap(s,{view:v,sheet:'local',instanceId:'two'});assert.ok(svg.includes('&lt;script&gt;atlas&lt;/script&gt;'));assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes(' onload="bad'));const ids=[...svg.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const ref of svg.matchAll(/(?:href="#|url\(#)([^\)"]+)/g))assert.ok(ids.includes(ref[1]),ref[1]);assert.ok(!svg.includes('NaN'));
});
test('ink marks cover distinct settlement and terrain roles without blank modern tiles',()=>{
 const defs=cartographicDefinitions('paper-test');for(const kind of ['city','village','harbor','citadel','gate','tower','shrine','camp','ruin','mine','tree','pine','peak','hill','reed','compass','boat']){const mark=cartographicMark(kind,5,10,.8,'paper-test',1),id=mark.match(/href="#([^"]+)/)[1];assert.ok(defs.includes('id="'+id+'"'));assert.equal(mark,cartographicMark(kind,5,10,.8,'paper-test',1));}assert.doesNotMatch(defs,/#[0-9a-f]{3,8}\b|<image|<rect/);assert.match(defs,/cartographic-hatch/);
});
test('authentic v0.28.0 worlds keep every site key, terrain, road link and unfinished crossing',()=>{
 const old=structuredClone(fixture.state),s=E.migrateSave(old);assert.ok(s&&E.validateSave(s));assert.equal(s.world.map.generationVersion,5);assert.deepEqual(s.world,old.world);assert.deepEqual(s.cartography,old.cartography);assert.deepEqual(hexAtlas(s).sites,fixture.siteKeys);assert.deepEqual(hexAtlas(s).cells,fixture.hexes);assert.equal(s.hero.mp,old.hero.mp);const before=JSON.stringify(s);assert.match(renderHexMap(s),/illustrated-atlas/);assert.equal(JSON.stringify(s),before);let next=drain(s);for(let n=0;next.cartography.pending&&n<12;n++)next=drain(E.chooseAction(next,'atlas_continue'));assert.ok(!next.cartography.pending);assert.ok(E.validateSave(next));
});
test('an older world without continental vectors still draws a deterministic continuous fallback',()=>{
 const s=plotted('older-paper-map');delete s.world.map.atlas;s.world.map.generationVersion=4;const v=cartographyView(s),svg=renderPaperMap(s,{view:v});assert.ok(svg.includes('data-chart-coast=""'));assert.equal(svg,renderPaperMap(s,{view:v}));assert.ok(!svg.includes('undefined'));assert.ok(!svg.includes('NaN'));
});
test('destination and camera controls change presentation only and preserve keyboard focus',async t=>{
 const ui=await resume(t),before=ui.current(),slots=ui.lives(),select=ui.root.querySelector('#journey-destination');assert.ok(select);select.value=Object.keys(before.cartography.sites).find(id=>id!==before.locationId);await ui.fire('change',select);assert.equal(ui.document.activeElement.id,'journey-destination');assert.equal(ui.root.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);await ui.click('map-zoom','home');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('[data-op="map-grid"]'),null);
});
test('the popup contains only the continuous paper world and close control',async t=>{
 const ui=await resume(t);await ui.click('map-expand');const popup=ui.root.querySelector('.map-popout');assert.equal(popup.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');assert.equal(popup.querySelector('form,.map-toolbar,select,.map-controls,.journey-map-tools'),null);assert.ok(popup.querySelectorAll('[data-op]').every(n=>['close-modal','destination-select','journey-current'].includes(n.dataset.op)));await ui.key('Escape');assert.equal(ui.root.querySelector('.map-popout'),null);assert.equal(ui.document.activeElement.dataset.op,'map-expand');
});
test('known-place lookup selects a destination without changing discovery or spending time',async t=>{
 const ui=await resume(t),s=ui.current(),select=ui.root.querySelector('#journey-destination');select.value=Object.keys(s.cartography.sites).find(id=>id!==s.locationId);await ui.fire('change',select);assert.equal(ui.root.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');assert.deepEqual(ui.current(),s);assert.ok(ui.root.querySelector('[data-op="travel"]'));
});
test('Find Me preserves the continuous map and a separate traveller position',async t=>{
 const ui=await resume(t),before=ui.current();await ui.click('map-zoom','home');assert.equal(ui.root.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');assert.ok(ui.root.querySelector('.journey-map-position.current'));assert.deepEqual(ui.current(),before);
});
test('clicking an ink place label inspects the named destination for free',async t=>{
 const ui=await resume(t),before=ui.current(),label=ui.root.querySelector('.paper-place-label');assert.ok(label);await ui.fire('click',label,{detail:0});assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('button.destination-pin[data-id="'+label.dataset.id+'"]').getAttribute('aria-pressed'),'true');
});
test('a named paper-map destination confirms the real road and Focus travel offer',async t=>{
 const ui=await resume(t),before=ui.current(),id=Object.keys(before.cartography.sites).find(id=>id!==before.locationId&&!E.exploreTravelPreview(before,id).disabledReason);await ui.key('Enter',{target:ui.root.querySelector('button.destination-pin[data-id="'+id+'"]')});assert.deepEqual(ui.current(),before);await ui.click('travel',id);assert.deepEqual(ui.current(),E.startExploreJourney(before,id));assert.ok(E.validateSave(ui.current()));
});
test('forged destination values cannot inject markup or change the world',async t=>{
 const ui=await resume(t),before=ui.current(),select=ui.root.querySelector('#journey-destination');select.value='"><script>bad</script>';await ui.fire('change',select);assert.equal(ui.root.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('script'),null);
});
test('printed lakes and offshore terrain are real water in new travel maps',()=>{
 const inside=([x,y],p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};let lakes=0;
 for(let i=0;i<35;i++){const s=plotted('water-ground-truth-'+i),a=hexAtlas(s);for(const c of a.cells){const p=[(c.q+Math.floor(c.r/2))*1000/14,c.r*70],lake=s.world.map.terrain.some(t=>t.type==='water'&&inside(p,t.points)),offshore=!s.world.map.atlas.landmasses.some(l=>inside(p,l.points));if(lake){lakes++;assert.equal(c.terrain,'water');}if(offshore&&!c.siteId)assert.equal(c.terrain,'water');if(c.siteId)assert.notEqual(c.terrain,'water');}}assert.ok(lakes>20);
});
test('open water without a real operating crossing remains unavailable despite its printed coastline',()=>{
 let found=false;for(let i=0;i<15&&!found;i++){const s=plotted('water-ground-truth-'+i),a=hexAtlas(s);for(const c of a.cells){const target=a.cells.find(n=>chartDistance(c,n)===1&&n.terrain==='water'&&!n.roadLinks.length);if(!target)continue;s.cartography.position=c.key;s.cartography.offsite=!c.siteId;if(c.siteId)s.locationId=c.siteId;const before=JSON.stringify(s),preview=hexStepPreview(s,target.key);assert.match(preview.disabledReason,/ferry|bridge/);renderHexMap(s);assert.equal(JSON.stringify(s),before);found=true;break;}}assert.ok(found);
});
test('a first phone visit uses the same draggable world and known destination targets',async t=>{
 const ui=await mountApp(t,{states:[base],width:390,height:844});await ui.click('title-continue');await ui.click('tab','map');assert.equal(ui.root.querySelector('[data-chart-sheet]').dataset.chartSheet,'country');for(const id of Object.keys(ui.current().cartography.sites))assert.ok(ui.root.querySelector('button.destination-pin[data-id="'+id+'"]'));assert.ok(!ui.root.querySelector('[data-chart-grid]'));assert.equal(ui.root.querySelector('[data-op="hex-select"]'),null);
});
