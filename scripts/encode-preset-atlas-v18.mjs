// Asset encoding and read-only registration of complete illustrated portraits.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {portraitGrid} from './preset-grid-v18.mjs';
const require=createRequire(import.meta.url);
const sharp=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/sharp`);
const [input,output,record]=process.argv.slice(2);
const registerOnly=process.argv.includes('--register-only');
if(!input||!output||!record)throw new Error('Pass source PNG, output AVIF and registration JSON paths.');
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(path.dirname(record),{recursive:true});
const m=await sharp(input).metadata();
if(Math.abs(m.width/m.height-1)>.025)throw new Error('An 8 by 8 portrait sheet must be square.');
const encoded=registerOnly?await fs.readFile(input):await sharp(input).resize({width:1536,height:1536,fit:'inside',withoutEnlargement:true}).avif({quality:40,effort:6,chromaSubsampling:'4:2:0'}).toBuffer();
const {data,info}=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const {xRows,ys,diagnostics}=portraitGrid(data,info),cells=[];
for(let row=0;row<8;row++)for(let col=0;col<8;col++){
 const left=xRows[row][col]+1,top=ys[row]+1,width=xRows[row][col+1]-left-1,height=ys[row+1]-top-1;
 if(width<info.width/10||height<info.height/10)throw new Error('Portrait gutter registration is too narrow.');
 const crop=Buffer.alloc(width*height*4);
 for(let y=0;y<height;y++)data.copy(crop,y*width*4,((top+y)*info.width+left)*4,((top+y)*info.width+left+width)*4);
 let mass=0,pixels=0;for(let y=top;y<top+height;y++)for(let x=left;x<left+width;x++){const i=(y*info.width+x)*4;if(data[i+3]<250)throw new Error('Complete portraits must have opaque backgrounds.');mass+=(data[i]+data[i+1]+data[i+2])/3;pixels++;}
 if(mass/pixels<8)throw new Error(`Portrait ${row*8+col} is empty or too dark.`);
 cells.push({cell:row*8+col,source:[left/info.width*100,top/info.height*100,width/info.width*100,height/info.height*100],sha256:hash(crop),meanLight:Math.round(mass/pixels*100)/100});
}
if(new Set(cells.map(c=>c.sha256)).size!==64)throw new Error('An atlas contains identical portrait tiles.');
let sourceImage=path.basename(input);
if(registerOnly){try{sourceImage=JSON.parse(await fs.readFile(record,'utf8')).sourceImage||sourceImage;}catch{}}
const result={version:18,file:path.basename(output),width:info.width,height:info.height,bytes:encoded.length,sha256:hash(encoded),sourceImage,columns:8,rows:8,grid:diagnostics,cells};
if(!registerOnly)await fs.writeFile(output,encoded);
await fs.writeFile(record,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:output,portraits:cells.length,bytes:encoded.length,registration:record}));
