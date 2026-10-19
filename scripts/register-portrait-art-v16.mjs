// Read-only bitmap analysis. This never changes a portrait image.
// Run: node scripts/register-portrait-art-v16.mjs [--allow-missing]
// Sharp comes from the primary runtime; the game itself needs no image dependency.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { PORTRAIT_PLATES, PORTRAIT_ANCESTRIES } from '../dist/js/portrait-art.js';

const project=dirname(dirname(fileURLToPath(import.meta.url)));
const allowMissing=process.argv.includes('--allow-missing');
let sharp;
try { sharp=(await import('sharp')).default; }
catch(error) {
  const runtime=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if(!runtime)throw new Error('Bitmap registration requires Sharp from the primary runtime.',{cause:error});
  const require=createRequire(import.meta.url);
  sharp=(await import(pathToFileURL(require.resolve('sharp',{paths:[runtime]})).href)).default;
}
const round=value=>Math.round(value*1000)/1000;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const percentile=(values,fraction)=>values[Math.floor((values.length-1)*fraction)];
const mean=values=>values.reduce((total,value)=>total+value,0)/values.length;
const median=values=>percentile([...values].sort((a,b)=>a-b),.5);
const records=[],missingSheets=[],sheets={};
const data=Object.fromEntries(PORTRAIT_ANCESTRIES.map(ancestry=>[ancestry,{adult:[],ages:[]} ]));

async function measureSheet(ancestry,kind,relativePath) {
  const path=join(project,'dist',relativePath),buffer=readFileSync(path);
  const {data:pixels,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width%6||info.height%6)throw new Error(`${relativePath} must have a uniform 6 × 6 grid.`);
  const cellWidth=info.width/6,cellHeight=info.height/6;
  const hash=createHash('sha256').update(buffer).digest('hex');
  sheets[`${ancestry}:${kind}`]={path:relativePath,width:info.width,height:info.height,sha256:hash};
  const measures=[];
  for(let frame=0;frame<36;frame++) {
    const originX=(frame%6)*cellWidth,originY=Math.floor(frame/6)*cellHeight;
    const luma=(x,y)=>{
      const offset=((originY+y)*info.width+originX+x)*info.channels;
      return pixels[offset+3]>200?.2126*pixels[offset]+.7152*pixels[offset+1]+.0722*pixels[offset+2]:0;
    };
    // A generated atlas can have a few clothing pixels extending across a
    // row boundary. Keep only upper-head foreground connected to the head's
    // scan rows, so that a neighboring cell cannot become this cell's crown.
    const visited=new Uint8Array(cellWidth*cellHeight),queue=[];
    const minX=Math.ceil(cellWidth*.10),maxX=Math.floor(cellWidth*.90),maxY=Math.floor(cellHeight*.30);
    const add=(x,y)=>{
      if(x<minX||x>maxX||y<0||y>maxY)return;
      const index=y*cellWidth+x;if(visited[index]||luma(x,y)<=35)return;
      visited[index]=1;queue.push(index);
    };
    for(const row of [.18,.20,.22])for(let x=Math.ceil(cellWidth*.40);x<=Math.floor(cellWidth*.75);x++)add(x,Math.floor(cellHeight*row));
    for(let cursor=0;cursor<queue.length;cursor++){
      const index=queue[cursor],x=index%cellWidth,y=Math.floor(index/cellWidth);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)add(x+dx,y+dy);
    }
    // The crown is the first scanline containing a real stretch of the scalp,
    // not a single bright scratch or a thin line at the atlas boundary.
    let crown=null;
    const crownMinX=Math.ceil(cellWidth*.40),crownMaxX=Math.floor(cellWidth*.75);
    const requiredRun=Math.max(6,Math.round(cellWidth*.025));
    for(let y=0;y<=Math.floor(cellHeight*.25)&&crown===null;y++){
      let run=0;
      for(let x=crownMinX;x<=crownMaxX;x++){
        run=visited[y*cellWidth+x]?run+1:0;
        if(run>=requiredRun){crown=y/cellHeight*100;break;}
      }
    }
    // Percentiles discard thin isolated hatching at the skull edge. Sampling
    // three nearby rows makes the estimate less sensitive to engraving lines.
    const spans=[];
    for(const row of [.18,.20,.22]){
      const y=Math.floor(cellHeight*row),bright=[];
      for(let x=Math.ceil(cellWidth*.10);x<=Math.floor(cellWidth*.90);x++)if(luma(x,y)>35)bright.push(x/cellWidth*100);
      if(bright.length>=requiredRun){
        const left=percentile(bright,.05),right=percentile(bright,.95);
        spans.push({left,right,width:right-left,center:(left+right)/2});
      }
    }
    // Lip/iris positions are not inferred from an engraving's dark hatchwork.
    // The recorded mouth is an explicit reference used for part placement.
    const measured={ancestry,sheet:kind,frame,headCenterX:spans.length?mean(spans.map(value=>value.center)):null,
      headWidth:spans.length?mean(spans.map(value=>value.width)):null,crownY:crown,
      mouthY:ancestry==='beastfolk'?57:60,mouthSource:'placement-reference',scanRows:spans.length,
      sourceSha256:hash};
    measures.push(measured);
  }
  return measures;
}

for(const ancestry of PORTRAIT_ANCESTRIES)for(const [kind,key] of [['adult','face'],['ages','ages']]){
  const path=PORTRAIT_PLATES[ancestry][key];
  if(!existsSync(join(project,'dist',path))){missingSheets.push({ancestry,sheet:kind,path});continue;}
  data[ancestry][kind]=await measureSheet(ancestry,kind,path);
}
if(missingSheets.length&&!allowMissing)throw new Error(`Portrait registration is incomplete: ${missingSheets.map(sheet=>sheet.path).join(', ')}. No registry was written.`);

for(const ancestry of PORTRAIT_ANCESTRIES) {
  const adult=data[ancestry].adult;
  const usable=adult.filter(record=>record.headWidth>15&&record.headWidth<85&&record.crownY!==null);
  const reference=adult[0]&&usable.includes(adult[0])?adult[0]:usable.length?{
    headCenterX:median(usable.map(record=>record.headCenterX)),headWidth:median(usable.map(record=>record.headWidth)),crownY:median(usable.map(record=>record.crownY)),
  }:{headCenterX:57,headWidth:60,crownY:5};
  for(const kind of ['adult','ages'])for(const measured of data[ancestry][kind]){
    const fallback=measured.headWidth===null||measured.headWidth<15||measured.headWidth>85||measured.crownY===null;
    const headCenterX=fallback?reference.headCenterX:measured.headCenterX;
    const headWidth=fallback?reference.headWidth:measured.headWidth;
    const crownY=fallback?reference.crownY:measured.crownY;
    const rawWidth=headWidth/reference.headWidth,rawDx=headCenterX-reference.headCenterX,rawDy=crownY-reference.crownY;
    Object.assign(measured,{headCenterX:round(headCenterX),headWidth:round(headWidth),crownY:round(crownY),
      measurementFallback:fallback,referenceFrame:adult[0]&&usable.includes(adult[0])?0:null,
      width:round(clamp(rawWidth,.90,1.10)),dx:round(clamp(rawDx,-8,8)),dy:round(clamp(rawDy,-8,8)),
      crown:round(crownY),mouth:measured.mouthY,fitClamped:rawWidth<.90||rawWidth>1.10||Math.abs(rawDx)>8||Math.abs(rawDy)>8});
    records.push(measured);
  }
}

const registry=Object.fromEntries(PORTRAIT_ANCESTRIES.map(ancestry=>[ancestry,Object.fromEntries(['adult','ages'].map(kind=>[kind,data[ancestry][kind].map(({width,dx,dy,crown,mouth})=>({width,dx,dy,crown,mouth}))]))]));
const source=`// Generated by scripts/register-portrait-art-v16.mjs from read-only bitmap measurements.\n// width is a multiplier; dx/dy/crown/mouth are percentages of one portrait cell.\n// Each face has its own registration; this moves adornments without stretching faces.\nconst freezeRecords=rows=>Object.freeze(rows.map(row=>Object.freeze(row)));\nexport const PORTRAIT_REGISTRATION=Object.freeze(Object.fromEntries(Object.entries(${JSON.stringify(registry)}).map(([ancestry,sheets])=>[ancestry,Object.freeze({adult:freezeRecords(sheets.adult),ages:freezeRecords(sheets.ages)})])));\nconst FALLBACK=Object.freeze({width:1,dx:0,dy:0,crown:5,mouth:60});\nconst BEAST_FALLBACK=Object.freeze({...FALLBACK,mouth:57});\nexport function portraitRegistration(ancestry,frame,ageSheet=false){\n  const rows=PORTRAIT_REGISTRATION[ancestry]?.[ageSheet?'ages':'adult'];\n  return Number.isInteger(frame)&&frame>=0&&rows?.[frame]|| (ancestry==='beastfolk'?BEAST_FALLBACK:FALLBACK);\n}\n`;
writeFileSync(join(project,'dist/js/portrait-registration.js'),source);
const report={version:'0.16.0',method:'Read-only luminance-based skull registration; no artwork changes, face stretching, or inferred iris coordinates.',
  completed:new Date().toISOString(),complete:missingSheets.length===0,cellsPerSheet:36,
  normalizedUnits:'Percentage of each atlas cell; fit width is a multiplier against adult frame 0 of the same ancestry.',
  measurements:{crown:'First contiguous bright scalp span in x40–75%, y0–25%, luminance >35; at least six pixels, connected to the upper-head scan rows to reject neighboring-cell fragments.',
    headWidth:'Mean of 5th–95th bright-pixel spans at y18%, 20%, 22%, x10–90%.',
    mouth:'Explicit placement reference, 60% (beastfolk 57%); dark hatchwork is not treated as measured lips.',
    limits:'Width multiplier clamps to 0.90–1.10; center/crown offsets clamp to ±8%; failed scans use the ancestry reference.'},
  sheets,missingSheets,total:records.length,measurementFallbacks:records.filter(record=>record.measurementFallback).length,
  clampedFits:records.filter(record=>record.fitClamped).length,records};
writeFileSync(join(project,'docs/portrait-registration-v16.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({complete:report.complete,sheets:Object.keys(sheets).length,records:report.total,
  missing:missingSheets.length,fallbacks:report.measurementFallbacks,clamped:report.clampedFits}));
