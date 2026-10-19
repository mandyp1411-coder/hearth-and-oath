// Native image encoding and read-only registration. No repainting, overlays or resizing.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {portraitGrid} from './preset-grid-v18.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
const jobId=value('--job'),input=value('--source'),reviewPath=value('--review'),promptPath=value('--prompt-file');
const verifyOnly=args.includes('--verify-only');
if(!jobId||!input)throw Error('Usage: node scripts/encode-aged-portraits-v57.mjs --job JOB_ID --source GENERATED_IMAGE [--review VISUAL_REVIEW_JSON] [--prompt-file EXACT_PROMPT_TEXT] [--verify-only]');
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{sharp=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/sharp`);}
const docs=path.join(root,'docs/art-v57'),references=path.join(root,'reference-art/aged-v57');
const inventory=JSON.parse(await fs.readFile(path.join(docs,'adult-inventory.json'),'utf8'));
const queue=JSON.parse(await fs.readFile(path.join(docs,'generation-queue.json'),'utf8'));
const job=queue.jobs.find(j=>j.id===jobId),atlas=inventory.atlases.find(a=>a.id===job?.adultAtlasId);
if(!job||!atlas)throw Error('Unknown age job; rebuild scripts/queue-aged-portraits-v57.mjs first.');
const prompt=promptPath?(await fs.readFile(path.resolve(promptPath),'utf8')).trim():job.prompt;
if(!prompt)throw Error('The exact generation prompt must be nonempty.');
if(!/^[a-z][a-z0-9-]+$/.test(job.id)||job.target!==`art/presets/${job.id}.avif`)throw Error('Invalid target naming.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const referenceBytes=await fs.readFile(path.join(root,job.referencePath));
if(hash(referenceBytes)!==job.referenceSha256)throw Error('The adult reference changed after this prompt was created. Rebuild the queue.');
const source=await fs.readFile(path.resolve(input)),sourceSha256=hash(source),metadata=await sharp(source).metadata();
const sourceFormat=metadata.format==='heif'&&metadata.compression==='av1'?'avif':metadata.format;
if(!['png','jpeg','webp','avif'].includes(sourceFormat))throw Error('Expected a generated raster image.');
if(Math.abs(metadata.width/metadata.height-1)>.025)throw Error('Expected the complete square 8 × 8 atlas, not a preview or partial sheet.');
const review=reviewPath?JSON.parse(await fs.readFile(path.resolve(reviewPath),'utf8')):null;
const requiredReview=['grid8x8','identityPreserved','ageAppropriate','presentationPreserved','phenotypePreserved'];
if(review&&(!review.reviewer||!review.reviewedAt||requiredReview.some(k=>typeof review[k]!=='boolean')))throw Error('Visual review requires reviewer, reviewedAt, and boolean grid8x8, identityPreserved, ageAppropriate, presentationPreserved, phenotypePreserved.');
const accepted=Boolean(review&&requiredReview.every(k=>review[k]));
if(review&&!accepted)throw Error('Visual review rejected this image. No source, asset, receipt or catalog will be written.');
const encoded=await sharp(source).avif({quality:85,effort:6,chromaSubsampling:'4:4:4'}).toBuffer();
const decoded=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(decoded.info.width!==metadata.width||decoded.info.height!==metadata.height)throw Error('Encoding altered native dimensions.');
const {data,info}=decoded,{ys,xRows,diagnostics}=portraitGrid(data,info),cells=[],measurements=[],fingerprints=new Set();
for(let row=0;row<8;row++)for(let col=0;col<8;col++){
  const cell=row*8+col,x=xRows[row][col]+2,y=ys[row]+2,width=xRows[row][col+1]-x-2,height=ys[row+1]-y-2;
  if(Math.min(width,height)<64)throw Error('A portrait is too small: '+cell);
  const pixels=Buffer.alloc(width*height*4);let sum=0,sum2=0,count=0;
  for(let dy=0;dy<height;dy++){
    data.copy(pixels,dy*width*4,((y+dy)*info.width+x)*4,((y+dy)*info.width+x+width)*4);
    for(let dx=0;dx<width;dx++){
      const i=((y+dy)*info.width+x+dx)*4,luma=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
      if(data[i+3]!==255)throw Error('Complete portraits require opaque backgrounds: '+cell);
      sum+=luma;sum2+=luma*luma;count++;
    }
  }
  const mean=sum/count,stddev=Math.sqrt(Math.max(0,sum2/count-mean*mean)),sha256=hash(pixels);
  if(mean<8||stddev<10)throw Error('Blank or insufficiently illustrated portrait: '+cell);
  if(fingerprints.has(sha256))throw Error('Duplicated native portrait pixels: '+cell);
  fingerprints.add(sha256);cells.push([x*100/info.width,y*100/info.height,width*100/info.width,height*100/info.height]);
  measurements.push({cell,sha256,meanLuminance:Number(mean.toFixed(4)),luminanceStdDev:Number(stddev.toFixed(4))});
}
if(verifyOnly){
  console.log(JSON.stringify({id:job.id,mode:'verify-only; no files written',width:info.width,height:info.height,actualGrid:'8x8',nativeDimensions:true,uniqueCells:64,registeredAdultCells:atlas.entries.length,bytes:encoded.length,visualReviewAccepted:accepted},null,2));
  process.exit(0);
}
const extension={png:'png',jpeg:'jpg',webp:'webp',avif:'avif'}[sourceFormat];
const sourceRelative=`reference-art/aged-v57/source/${atlas.ancestry}/${job.id}.${extension}`,target=path.join(root,'dist',job.target),sourceTarget=path.join(root,sourceRelative);
// A retry can add a review for identical source pixels, but cannot silently replace artwork.
const receiptPath=path.join(docs,'registration',job.id+'.json');
const previous=await fs.readFile(receiptPath,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(previous&&previous.sourceSha256!==sourceSha256)throw Error('This job already has different artwork. Use a separate draft job or explicitly remove the rejected receipt before ingesting a replacement.');
const entries=atlas.entries.map(({sourceRect,...entry})=>({...entry,stage:job.stage,adultAtlasId:atlas.id,modern:true,...(job.stage!=='mature'&&atlas.ancestry!=='beastfolk'?{hairTone:'grey'}:{})}));
const receipt={id:job.id,adultAtlasId:atlas.id,ancestry:atlas.ancestry,stage:job.stage,illustratedAge:job.illustratedAge,target:job.target,src:'./'+job.target,width:info.width,height:info.height,rows:8,columns:8,cells,entries,status:accepted?'accepted':'pending-visual-review',source:sourceRelative,sourceSha256,encodedSha256:hash(encoded),bytes:encoded.length,encoding:{format:'avif',quality:85,effort:6,chromaSubsampling:'4:4:4',nativeDimensions:true,resized:false,repainted:false,recolored:false,overlaid:false},provenance:{generator:'built-in image_gen',originalImagegenPath:path.resolve(input),retainedSource:sourceRelative,prompt,reference:job.referencePath,referenceSha256:job.referenceSha256},visualReview:review,mechanicalVerification:{nativeDimensions:true,opaque:true,actualGrid:diagnostics,uniqueCells:true,nonblankCells:true,measurements}};
await fs.mkdir(path.dirname(sourceTarget),{recursive:true});await fs.mkdir(path.dirname(target),{recursive:true});await fs.mkdir(path.dirname(receiptPath),{recursive:true});
await fs.writeFile(sourceTarget,source);await fs.writeFile(target,encoded);await fs.writeFile(receiptPath+'.'+process.pid+'.tmp',JSON.stringify(receipt,null,2)+'\n');await fs.rename(receiptPath+'.'+process.pid+'.tmp',receiptPath);
await fs.mkdir(references,{recursive:true});
await fs.writeFile(path.join(references,job.id+'.generation.json'),JSON.stringify({id:job.id,source:sourceRelative,originalImagegenPath:path.resolve(input),sourceSha256,prompt,reference:job.referencePath,referenceSha256:job.referenceSha256,generator:'built-in image_gen',visualReview:review},null,2)+'\n');
// Aggregate manifests are refreshed once the independent per-atlas batch settles.
console.log(JSON.stringify({id:receipt.id,status:receipt.status,width:receipt.width,height:receipt.height,portraits:entries.length,bytes:receipt.bytes,source:sourceRelative,target:job.target,registration:path.relative(root,receiptPath)},null,2));
