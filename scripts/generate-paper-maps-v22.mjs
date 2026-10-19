import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createBirthGame, validateSave } from '../dist/js/engine.js';
import { cartographyView, hexAtlas } from '../dist/js/cartography.js';
import { renderPaperMap, paperMapLayout } from '../dist/js/paper-map.js';

// These reference sheets contain no baked names. The live renderer overlays only
// the player's actual, sourced knowledge, over the same authoritative hex grid.
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const release=JSON.parse(await readFile(path.join(project,'package.json'),'utf8')).version;
const output=path.resolve(process.argv[2]||path.join(project,'artifacts/ui-v22-maps'));
await mkdir(path.join(output,'charts'),{recursive:true});
await copyFile(path.join(project,'dist/art/parchment-v22.png'),path.join(output,'parchment-v22.png'));
const digest=value=>createHash('sha256').update(value).digest('hex');
const escaped=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const records=[],artHashes=new Set(),geometryHashes=new Set();
const began=Date.now();
for(let index=0;index<512;index++){
  const id=String(index+1).padStart(3,'0'),seed=`hearth-paper-v22-${id}`;
  const state=createBirthGame({seed}),before=JSON.stringify(state);
  if(!validateSave(state))throw new Error(`Invalid generated world ${seed}`);
  const view=cartographyView(state),atlas=hexAtlas(state);
  if(atlas.cells.length!==165)throw new Error(`Unexpected grid size ${seed}`);
  if(Object.keys(atlas.sites).length!==state.world.locations.length)throw new Error(`Unmapped site ${seed}`);
  const art=renderPaperMap(state,{view,revealAll:true,labels:false,parchmentPath:'../parchment-v22.png'});
  if(!art.startsWith('<svg')||/<text\b/.test(art))throw new Error(`Printed map text ${seed}`);
  if(state.world.locations.some(place=>art.includes(escaped(place.name))))throw new Error(`Baked place name ${seed}`);
  if(renderPaperMap(state,{view,revealAll:true,labels:false,parchmentPath:'../parchment-v22.png'})!==art)throw new Error(`Non-deterministic chart ${seed}`);
  const publicArt=renderPaperMap(state,{view,labels:false});
  for(const cell of view.cells.filter(cell=>cell.known==='Unknown')){
    if(publicArt.includes(`class="paper-terrain" data-hex="${escaped(cell.key)}"`))throw new Error(`Fog terrain leak ${seed}`);
  }
  if(view.cells.some(cell=>cell.known==='Unknown'&&cell.name))throw new Error(`Fogged place name ${seed}`);
  const camera=paperMapLayout(state,{view,compact:true}),current=view.cells.find(cell=>cell.current);
  if(!current||current.x<camera.x||current.x>camera.x+camera.width||current.y<camera.y||current.y>camera.y+camera.height)throw new Error(`Camera lost player ${seed}`);
  if(JSON.stringify(state)!==before)throw new Error(`Rendering changed game ${seed}`);
  const terrain=Object.fromEntries(['grassland','forest','mountain','marsh','water'].map(kind=>[kind,atlas.cells.filter(cell=>cell.terrain===kind).length]));
  const geometry=digest(JSON.stringify({cells:atlas.cells.map(({q,r,terrain,siteId,road,ferry,roadLinks})=>({q,r,terrain,siteId,road,ferry,roadLinks})),roads:state.world.roads,atlas:state.world.map?.atlas}));
  const sha256=digest(art),file=`charts/chart-${id}.svg`;
  artHashes.add(sha256);geometryHashes.add(geometry);
  await writeFile(path.join(output,file),art+'\n');
  records.push({id,seed,file,sha256,geometrySha256:geometry,environment:state.world.environment?.profileId||null,cells:atlas.cells.length,sites:state.world.locations.length,terrain,roadCells:atlas.cells.filter(cell=>cell.road).length,knownCells:view.cells.filter(cell=>cell.known!=='Unknown').length,compactCameraContainsPlayer:true});
  if((index+1)%64===0)console.log(`${index+1}/512 charts generated and validated`);
}
const summary={release,method:'512 deterministic procedural charts from actual game worlds; original ink symbols and name-free SVG art over one shared AI-generated parchment texture. Not 512 independently AI-generated images.',texture:{file:'parchment-v22.png',sha256:digest(await readFile(path.join(output,'parchment-v22.png')))},requested:512,completed:records.length,uniqueArt:artHashes.size,uniqueGeometry:geometryHashes.size,printedPlaceNames:0,printedTextElements:0,immutableRenders:records.length,compactPlayerChecks:records.length,fogChecks:records.length,elapsedMs:Date.now()-began,records};
if(summary.uniqueArt!==512||summary.uniqueGeometry!==512)throw new Error('The reference collection must contain 512 distinct art and geometry hashes.');
await writeFile(path.join(output,'manifest.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,records:undefined,output}));
