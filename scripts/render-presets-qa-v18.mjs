// Native image QA of exactly the whole-cell source crop used by renderAvatar.
// This renders existing illustrations for inspection; it does not create portrait variants.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PORTRAIT_RACES,portraitPreset} from '../dist/js/portrait-catalog.js';
const require=createRequire(import.meta.url);
const sharp=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/sharp`);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2]||'/workspace/scratch/f1931ac2a2c5/qa-presets-v18';
await mkdir(output,{recursive:true});
const ages=[0,7,14,27,75],frames=[0,24,48],tile=256;
const result=[];
for(const race of PORTRAIT_RACES){
  const items=[],checked=[];
  for(const [row,age] of ages.entries())for(const [column,frame] of frames.entries()){
    const p=portraitPreset('p'+String(frame).padStart(4,'0'),{ancestry:race,age}),rect=p.sourceRect;
    let data;try{data=await readFile(path.join(root,'dist',p.src.slice(2)));}catch{continue;}
    const x=Math.round(rect.x*p.width/100),y=Math.round(rect.y*p.height/100),width=Math.round(rect.width*p.width/100),height=Math.round(rect.height*p.height/100);
    const image=await sharp(data).extract({left:x,top:y,width,height}).resize(tile,tile,{fit:'contain',background:'#0a0a0a'}).png().toBuffer();
    items.push({input:image,left:column*tile,top:row*tile});checked.push({race,age,frame,src:p.src,sourceRect:rect});
  }
  if(!items.length)continue;
  const file=path.join(output,race+'.png');
  await sharp({create:{width:tile*3,height:tile*5,channels:4,background:'#11100f'}}).composite(items).png().toFile(file);
  result.push({race,file,checked});
}
await writeFile(path.join(output,'manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.map(r=>({race:r.race,file:r.file,samples:r.checked.length}))));
