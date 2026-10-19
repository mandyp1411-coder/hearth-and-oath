// Read-only registration of the primary alpha component in each authored part.
// This writes JavaScript crop metadata; it never rewrites bitmap artwork.
// Run: node scripts/register-portrait-parts-v16.mjs [--allow-missing] [--threshold=64]
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const require=createRequire(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/portrait-registration.cjs`);
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const kinds={hair:{columns:6,rows:6,used:33},covers:{columns:6,rows:7,used:36},details:{columns:4,rows:4,used:16}};
// Authored details use four columns but uneven vertical spacing. These source
// ranges follow the alpha gaps in each column. A few neighboring pieces overlap
// in Y; overlapping source ranges plus the selected-component hull keep both.
// Ranges use the 1254-pixel reference height and scale with the actual asset.
const detailRows={
  human:[[[0,408],[408,660],[660,900],[900,1254]],[[0,400],[395,724],[724,914],[914,1254]],[[0,450],[450,640],[640,940],[940,1254]],[[0,450],[450,634],[634,964],[964,1254]]],
  elf:[[[0,390],[390,660],[660,880],[880,1254]],[[0,418],[396,724],[724,910],[910,1254]],[[0,450],[450,635],[635,940],[940,1254]],[[0,465],[465,636],[632,963],[963,1254]]],
  dwarf:[[[0,450],[450,705],[705,940],[940,1254]],[[0,502],[475,813],[808,950],[950,1254]],[[0,470],[470,740],[740,1015],[1015,1254]],[[0,506],[475,717],[717,1045],[1045,1254]]],
  halfling:[[[0,400],[400,650],[650,900],[900,1254]],[[0,410],[410,700],[700,900],[900,1254]],[[0,440],[440,665],[665,950],[950,1254]],[[0,430],[430,650],[650,980],[980,1254]]],
  orc:[[[0,370],[370,630],[630,860],[860,1254]],[[0,424],[396,690],[690,870],[870,1254]],[[0,407],[389,670],[670,920],[920,1254]],[[0,409],[398,665],[630,940],[940,1254]]],
  goblin:[[[0,450],[450,740],[740,978],[978,1254]],[[0,450],[450,753],[753,950],[950,1254]],[[0,450],[450,700],[700,978],[978,1254]],[[0,450],[450,700],[700,1000],[1000,1254]]],
  tiefling:[[[0,400],[400,680],[680,920],[920,1254]],[[0,420],[420,705],[705,900],[900,1254]],[[0,430],[430,630],[630,940],[940,1254]],[[0,450],[450,657],[625,950],[950,1254]]],
  beastfolk:[[[0,390],[390,650],[650,890],[890,1254]],[[0,397],[397,710],[710,890],[890,1254]],[[0,404],[404,630],[630,930],[930,1254]],[[0,410],[410,620],[620,940],[940,1254]]],
};
// Cover atlases contain six authored rows and a mostly empty seventh row.
// Some races drift by almost a full nominal row at the bottom of the sheet.
// Per-column ranges recover each complete piece and exclude neighboring helmets
// from open hoods/wraps. Values are pixels in the 1355-high reference atlas.
const coverRows={
  human:[[[0,194],[195,387],[391,583],[587,781],[779,975],[979,1170]],[[4,194],[195,387],[387,583],[581,778],[798,964],[982,1157]],[[1,194],[195,387],[384,583],[586,783],[791,967],[1017,1165]],[[3,194],[193,387],[385,583],[585,779],[799,968],[990,1167]],[[0,194],[194,387],[384,583],[602,797],[836,964],[977,1169]],[[0,195],[196,388],[386,583],[583,779],[819,972],[999,1133]]],
  elf:[[[13,204],[204,389],[390,585],[592,780],[777,972],[972,1174]],[[19,204],[206,389],[389,585],[589,779],[783,961],[973,1161]],[[17,206],[208,389],[390,586],[587,781],[785,967],[1000,1169]],[[16,208],[208,390],[389,585],[591,781],[792,968],[974,1162]],[[13,204],[204,389],[389,585],[598,797],[814,971],[967,1174]],[[9,204],[204,389],[389,585],[586,783],[791,971],[987,1136]]],
  dwarf:[[[0,195],[194,390],[391,574],[579,770],[766,967],[967,1167]],[[0,201],[201,383],[388,579],[579,765],[774,957],[966,1158]],[[2,197],[207,385],[383,577],[579,775],[773,958],[989,1157]],[[5,194],[192,388],[383,581],[577,774],[780,965],[973,1156]],[[0,202],[199,388],[385,585],[588,781],[812,961],[966,1173]],[[1,188],[188,380],[385,580],[575,772],[797,967],[970,1153]]],
  halfling:[[[14,219],[226,435],[434,623],[634,808],[810,1020],[1019,1259]],[[29,225],[229,408],[408,641],[632,809],[831,1001],[1011,1201]],[[26,260],[310,425],[425,617],[623,828],[834,1012],[1040,1219]],[[41,230],[230,437],[437,609],[622,840],[843,986],[1012,1226]],[[28,241],[239,454],[451,633],[648,860],[892,1018],[1015,1228]],[[40,211],[211,420],[420,620],[620,835],[852,1015],[1018,1168]]],
  orc:[[[1,197],[197,388],[385,581],[577,776],[775,966],[966,1163]],[[1,197],[201,389],[385,583],[583,778],[775,967],[964,1163]],[[0,199],[202,389],[386,581],[581,777],[775,968],[976,1163]],[[0,195],[195,389],[387,584],[584,778],[778,967],[967,1165]],[[0,195],[195,388],[388,586],[596,777],[784,968],[968,1164]],[[0,196],[194,388],[387,583],[583,773],[790,965],[981,1152]]],
  goblin:[[[2,210],[208,417],[413,614],[616,821],[820,1023],[1023,1226]],[[5,213],[218,405],[401,617],[615,822],[822,1019],[1017,1216]],[[4,239],[243,426],[425,617],[615,834],[831,1026],[1043,1230]],[[24,225],[223,408],[407,617],[614,842],[839,1017],[1015,1218]],[[4,210],[208,430],[427,625],[643,852],[849,1025],[1023,1231]],[[3,215],[212,437],[435,617],[617,822],[834,1040],[1040,1210]]],
  tiefling:[[[0,200],[208,407],[403,592],[600,778],[780,985],[985,1179]],[[8,212],[217,390],[399,604],[602,765],[800,978],[984,1169]],[[10,212],[258,403],[401,585],[597,791],[798,963],[1013,1178]],[[44,209],[209,404],[404,582],[586,794],[800,990],[990,1176]],[[1,202],[202,402],[399,594],[603,796],[828,984],[984,1185]],[[13,193],[197,395],[396,596],[596,791],[824,977],[982,1122]]],
  beastfolk:[[[35,213],[223,415],[431,590],[626,800],[816,997],[1002,1185]],[[39,213],[233,400],[426,602],[602,763],[818,989],[1005,1185]],[[36,221],[232,416],[423,603],[628,815],[819,998],[1007,1180]],[[45,215],[239,408],[426,610],[628,812],[816,1012],[1012,1191]],[[31,218],[218,424],[423,612],[630,827],[827,1002],[1002,1200]],[[37,209],[210,425],[431,607],[614,818],[825,994],[1007,1174]]],
};
const thresholdArg=process.argv.find(a=>a.startsWith('--threshold='));
const threshold=thresholdArg?Number(thresholdArg.slice('--threshold='.length)):64;
if(!Number.isSafeInteger(threshold)||threshold<0||threshold>254)throw new Error('Alpha threshold must be an integer from 0 to 254.');
const allowMissing=process.argv.includes('--allow-missing');
const outputArg=process.argv.find(a=>a.startsWith('--output='));
const output=outputArg?resolve(root,outputArg.slice('--output='.length)):resolve(root,'dist/js/portrait-part-bounds.js');
const full=[0,0,100,100];
const round=value=>Math.round(Math.max(0,Math.min(100,value))*1000)/1000;
const missing=races.flatMap(race=>Object.keys(kinds).map(kind=>`${kind}-${race}-v16.webp`)).filter(file=>!existsSync(resolve(root,'dist/art/portraits',file)));
if(missing.length&&!allowMissing)throw new Error(`Portrait parts are still pending: ${missing.join(', ')}. Re-run after all art files are ready, or use --allow-missing for temporary full-frame fallbacks.`);

function sourceFor(race,kind,cell){
  const {columns,rows}=kinds[kind],column=cell%columns,row=Math.floor(cell/columns);
  if(kind==='covers'){
    const [top,bottom]=coverRows[race][column][row];
    return [column*100/columns,top/1355*100,100/columns,(bottom-top)/1355*100];
  }
  if(kind!=='details')return [column*100/columns,row*100/rows,100/columns,100/rows];
  const [top,bottom]=detailRows[race][column][row];
  // Accessory arms and stems sometimes cross their nominal column. Their
  // complete piece is recovered from a slightly wider source, then isolated.
  const accessoryColumns=[[0,350],[290,710],[620,990],[930,1254]];
  const [left,right]=row>=2?accessoryColumns[column]:[column*1254/4,(column+1)*1254/4];
  return [left/1254*100,top/1254*100,(right-left)/1254*100,(bottom-top)/1254*100];
}
function convexHull(points){
  const ordered=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).filter((p,i,all)=>!i||p[0]!==all[i-1][0]||p[1]!==all[i-1][1]);
  if(ordered.length<3)return ordered;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const lower=[],upper=[];
  for(const p of ordered){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(let i=ordered.length-1;i>=0;i--){const p=ordered[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  lower.pop();upper.pop();return [...lower,...upper];
}
function componentClip(indices,width,height,pixelLeft,pixelTop,frameLeft,frameTop,frameWidth,frameHeight){
  const first=new Int32Array(height).fill(width),last=new Int32Array(height).fill(-1);
  for(const index of indices){const x=index%width,y=Math.floor(index/width);first[y]=Math.min(first[y],x);last[y]=Math.max(last[y],x);}
  const outline=[];
  for(let y=0;y<height;y++)if(last[y]>=0){outline.push([first[y],y],[first[y],y+1],[last[y]+1,y],[last[y]+1,y+1]);}
  // Minkowski expansion by one pixel preserves the antialiased component edge.
  const hull=convexHull(outline),expanded=convexHull(hull.flatMap(([x,y])=>[[x-1,y-1],[x-1,y+1],[x+1,y-1],[x+1,y+1]]));
  const points=expanded.map(([x,y])=>[round((pixelLeft+x-frameLeft)/frameWidth*100),round((pixelTop+y-frameTop)/frameHeight*100)]);
  return points.length>=3?`polygon(${points.map(([x,y])=>`${x}% ${y}%`).join(',')})`:'';
}
function primaryBounds(data,imageWidth,imageHeight,source,withClip=false){
  const [sx,sy,sw,sh]=source;
  const frameLeft=sx/100*imageWidth,frameTop=sy/100*imageHeight;
  const frameWidth=sw/100*imageWidth,frameHeight=sh/100*imageHeight;
  const pixelLeft=Math.floor(frameLeft),pixelTop=Math.floor(frameTop);
  const width=Math.min(imageWidth,Math.ceil(frameLeft+frameWidth))-pixelLeft;
  const height=Math.min(imageHeight,Math.ceil(frameTop+frameHeight))-pixelTop;
  const alpha=new Uint8Array(width*height),visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
  let totalPixels=0,totalMass=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const a=data[((pixelTop+y)*imageWidth+pixelLeft+x)*4+3];
    if(a>threshold){alpha[y*width+x]=a;totalPixels++;totalMass+=a;}
  }
  let primary=null,components=0;
  for(let start=0;start<alpha.length;start++){
    if(!alpha[start]||visited[start])continue;
    components++;let first=0,last=1,mass=0,pixels=0,minX=width,minY=height,maxX=-1,maxY=-1;
    queue[0]=start;visited[start]=1;
    while(first<last){
      const index=queue[first++],x=index%width,y=Math.floor(index/width);
      pixels++;mass+=alpha[index];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const next=ny*width+nx;if(alpha[next]&&!visited[next]){visited[next]=1;queue[last++]=next;}
      }
    }
    if(!primary||mass>primary.mass)primary={mass,pixels,minX,minY,maxX,maxY,indices:withClip?queue.slice(0,last):null};
  }
  if(!primary)return {bounds:[...full],components,totalPixels,totalMass,primaryMassFraction:0,empty:true};
  // Convert back to the renderer's exact fractional source-cell coordinates.
  // One pixel of padding preserves antialiased edges adjacent to the component.
  const bounds=[
    round((pixelLeft+primary.minX-1-frameLeft)/frameWidth*100),
    round((pixelTop+primary.minY-1-frameTop)/frameHeight*100),
    round((pixelLeft+primary.maxX+2-frameLeft)/frameWidth*100),
    round((pixelTop+primary.maxY+2-frameTop)/frameHeight*100),
  ];
  const clip=withClip?componentClip(primary.indices,width,height,pixelLeft,pixelTop,frameLeft,frameTop,frameWidth,frameHeight):'';
  return {bounds,clip,components,totalPixels,totalMass,primaryPixels:primary.pixels,primaryMass:primary.mass,primaryMassFraction:primary.mass/totalMass,empty:false};
}

const metadata={},sourceMetadata={},clipMetadata={},warnings=[],assetHashes={};let analyzed=0;
for(const race of races){
  metadata[race]={};sourceMetadata[race]={};clipMetadata[race]={};
  for(const [kind,grid] of Object.entries(kinds)){
    const filename=`${kind}-${race}-v16.webp`,path=resolve(root,'dist/art/portraits',filename);
    sourceMetadata[race][kind]=Array.from({length:grid.used},(_,cell)=>sourceFor(race,kind,cell));
    if(!existsSync(path)){
      metadata[race][kind]=Array.from({length:grid.used},()=>[...full]);clipMetadata[race][kind]=Array.from({length:grid.used},()=>'');
      sourceMetadata[race][kind]=Array.from({length:grid.used},(_,cell)=>[cell%grid.columns*100/grid.columns,Math.floor(cell/grid.columns)*100/grid.rows,100/grid.columns,100/grid.rows]);
      continue;
    }
    const encoded=readFileSync(path);assetHashes[filename]=createHash('sha256').update(encoded).digest('hex');
    const {data,info}=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(info.channels!==4)throw new Error(`${filename} did not decode to RGBA.`);
    metadata[race][kind]=[];clipMetadata[race][kind]=[];
    for(let cell=0;cell<grid.used;cell++){
      const analysis=primaryBounds(data,info.width,info.height,sourceMetadata[race][kind][cell],kind==='details'||kind==='covers');analyzed++;
      metadata[race][kind].push(analysis.bounds);
      clipMetadata[race][kind].push(analysis.clip||'');
      if(analysis.empty||analysis.primaryMassFraction<.4)warnings.push({race,kind,cell,filename,...analysis});
    }
  }
}

const source=`// Generated by scripts/register-portrait-parts-v16.mjs. Bitmap assets are unchanged.
// Primary 8-neighbor alpha component (> ${threshold}), padded by one source pixel.
// Bounds/clip coordinates are source-rectangle local percentage coordinates.
const SOURCE_BOUNDS = ${JSON.stringify(metadata,null,2)};
const SOURCE_RECTS = ${JSON.stringify(sourceMetadata,null,2)};
const SOURCE_CLIPS = ${JSON.stringify(clipMetadata,null,2)};
const FULL_FRAME = Object.freeze({left:0,top:0,right:100,bottom:100});
const REGISTERED = Object.freeze(Object.fromEntries(Object.entries(SOURCE_BOUNDS).map(([race,kinds])=>[
  race,Object.freeze(Object.fromEntries(Object.entries(kinds).map(([kind,cells])=>[
    kind,Object.freeze(cells.map(([left,top,right,bottom])=>Object.freeze({left,top,right,bottom})))
  ])))
])));

/** Bounds of the primary authored piece; unknown or pending pieces use the full frame. */
export function portraitPartBounds(race,kind,cell) {
  return Number.isSafeInteger(cell) && cell>=0 ? REGISTERED[race]?.[kind]?.[cell] || FULL_FRAME : FULL_FRAME;
}

/** Source rectangle in whole-atlas percentages; authored covers/details have individual ranges. */
export function portraitPartSource(race,kind,cell) {
  const source=Number.isSafeInteger(cell)&&cell>=0?SOURCE_RECTS[race]?.[kind]?.[cell]:null;
  if(source){const [x,y,width,height]=source;return {x,y,width,height};}
  const grid={hair:[6,6,33],covers:[6,7,36],details:[4,4,16]}[kind];
  if(grid&&Number.isSafeInteger(cell)&&cell>=0&&cell<grid[2])return {x:cell%grid[0]*100/grid[0],y:Math.floor(cell/grid[0])*100/grid[1],width:100/grid[0],height:100/grid[1]};
  return {x:0,y:0,width:100,height:100};
}

/** Convex envelope of the intended cover/detail component, in source-local CSS percentages. */
export function portraitPartClip(race,kind,cell) {
  return Number.isSafeInteger(cell)&&cell>=0?SOURCE_CLIPS[race]?.[kind]?.[cell]||'':'';
}
`;
writeFileSync(output,source);
console.log(JSON.stringify({version:'0.16.0',method:'Read-only RGBA alpha analysis; 8-neighbor components above threshold, primary-component bounds and padded convex envelopes. Bitmap assets are unchanged.',strict:!allowMissing,generatedAt:new Date().toISOString(),output,metadataSha256:createHash('sha256').update(source).digest('hex'),threshold,analyzed,expected:races.length*Object.values(kinds).reduce((n,k)=>n+k.used,0),missing,assetHashes,clips:Object.fromEntries(Object.keys(kinds).map(kind=>[kind,races.reduce((n,race)=>n+clipMetadata[race][kind].filter(Boolean).length,0)])),sourceRegistration:{detailsReferenceHeight:1254,coversReferenceHeight:1355,coverRows,detailRows},warnings},null,2));
