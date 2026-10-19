// Technical registration only. No portrait content is painted or modified here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {portraitGrid} from './preset-grid-v18.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),base=process.env.HEARTH_ART_SOURCE;
const sharp=createRequire(import.meta.url)(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/sharp`);
const hash=b=>createHash('sha256').update(b).digest('hex'),races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
if(!base)throw Error('Set HEARTH_ART_SOURCE to the generated source-art directory.');
const group=process.argv[2]||'life',only=process.argv[3],folder={life:'lifecycle_v27',adult:'curse_identity_v27',elder:'elder_curse_identity_v27'}[group];
if(!folder)throw Error('Use life, adult or elder');
const json=async p=>{try{return JSON.parse(await fs.readFile(p,'utf8'));}catch{return null;}};
const geom=await json(path.join(base,'lifecycle_v27/age-art-b-geometry-refinements.json'));
const rect=c=>c.destinationRectangle||c.destinationContentRectangle||(c.destination_xy&&[c.destination_xy[0],c.destination_xy[1],c.destination_xy[0]+c.contain_size[0],c.destination_xy[1]+c.contain_size[1]]);
for(const race of races)for(const half of ['00','01']){
 const key=group==='life'?`${race}-linked-ages-${half}`:group==='adult'?`${race}-linked-curses-${half}`:`${race}-linked-elder-curses-${half}`;
 if(only&&!key.includes(only))continue;
 
 
 const png=path.join(base,folder,key+'.png'),source=await fs.readFile(png),inputHash=hash(source);
 const outFolder=group==='life'?'presets':'curses',record=path.join(root,'reference-art/linked-v27',key+'.registration.json'),output=path.join(root,'dist/art',outFolder,key+'.avif');
 if((await json(record))?.sourceSha256===inputHash){console.log('Already registered '+key);continue;}
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(path.dirname(record),{recursive:true});
 const encoded=await sharp(source).avif({quality:40,effort:6,chromaSubsampling:'4:2:0'}).toBuffer();
 const {data,info}=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let meta=await json(path.join(base,folder,key+'.packing.json'))||await json(path.join(base,folder,key+'.json'));
 let packed=group==='life'?geom?.sheets.find(s=>s.race===race&&s.half===half)?.packing:null;
 packed=packed||meta?.technicalPacking||meta?.packing||meta;
 let boxes=packed?.cells?.map(rect);if(boxes?.some(b=>!b))boxes=null;
 if(boxes?.length!==64)boxes=null;
 if(boxes){
   for(const replacement of packed.family_replacements||[])for(const c of replacement.registered_cells||[]){const frame=c.destination_cell_xyxy,idx=Math.floor(frame[1]/256)*8+Math.floor(frame[0]/256);boxes[idx]=rect(c);}
   for(const c of packed.hungry_only_replacement_cells||[]){const frame=c.destination_cell_xyxy;boxes[Math.floor(frame[1]/256)*8+Math.floor(frame[0]/256)]=rect(c);}
   for(const replacement of packed.family_replacements||[])if(replacement.cells)for(const c of replacement.cells){if(c.cell!==undefined)boxes[c.cell]=rect(c);}
 }
 if(!boxes){
   const grid=await json(path.join(base,folder,'finish-qc',key+'-original-grid.json'));
   if(grid?.cellRects)boxes=grid.cellRects.flat();
   else{const {xRows,ys}=portraitGrid(data,info);boxes=Array.from({length:64},(_,i)=>[xRows[Math.floor(i/8)][i%8],ys[Math.floor(i/8)],xRows[Math.floor(i/8)][i%8+1],ys[Math.floor(i/8)+1]]);}
 }
 const cells=[];
 for(let i=0;i<64;i++){
  const b=boxes[i],left=Math.round(b[0])+1,top=Math.round(b[1])+1,width=Math.round(b[2])-left-1,height=Math.round(b[3])-top-1;
  if(width<60||height<60||left<0||top<0||left+width>info.width||top+height>info.height)throw Error('Invalid content rectangle '+key+':'+i);
  const pixels=Buffer.alloc(width*height*4);let light=0;
  for(let y=0;y<height;y++){const offset=((top+y)*info.width+left)*4;data.copy(pixels,y*width*4,offset,offset+width*4);}
  for(let p=0;p<pixels.length;p+=4){if(pixels[p+3]!==255)throw Error('Transparency in whole portrait');light+=(pixels[p]+pixels[p+1]+pixels[p+2])/3;}
  if(light/(width*height)<8)throw Error('Empty portrait '+key+':'+i);
  cells.push({cell:i,source:[left/info.width*100,top/info.height*100,width/info.width*100,height/info.height*100],sha256:hash(pixels),meanLight:light/(width*height)});
 }
 if(new Set(cells.map(c=>c.sha256)).size!==64)throw Error('Duplicate cells');
 await fs.copyFile(png,path.join(root,'reference-art/linked-v27',key+'.png'));
 for(const suffix of ['.packing.json','.json','-result.json','-final-pack-map.json']){const p=path.join(base,folder,key+suffix);if(await json(p))await fs.copyFile(p,path.join(root,'reference-art/linked-v27',key+suffix));}
 await fs.writeFile(output,encoded);await fs.writeFile(record,JSON.stringify({version:27,file:key+'.avif',width:info.width,height:info.height,sourceSha256:inputHash,sha256:hash(encoded),bytes:encoded.length,cells,registration:'Actual content rectangles; aspect ratio retained; no layers or semantic modifications.'},null,2)+'\n');
 console.log(JSON.stringify({key,cells:64,bytes:encoded.length}));
}
