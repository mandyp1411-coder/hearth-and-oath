// Native Canvas composition QA of application geometry; this is not browser layout QA.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { portraitLayers, portraitComponents, AVATAR_OPTIONS } from '../dist/js/avatar.js';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,Path2D}=require(`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'}/@napi-rs/canvas`);
const repo=fileURLToPath(new URL('../dist/',import.meta.url));
const race=process.argv[2]||'human',out=process.argv[3]||`portrait-${race}-qa.png`;
const cache=new Map();
async function tile(ctx,part,x,y,size) {
 const {src,cell,columns:cols,rows,fit,clip}=part;
 if(cell==null)return;
 if(!cache.has(src))cache.set(src,await loadImage(path.join(repo,src)));
 const img=cache.get(src),cw=img.width/cols,ch=img.height/rows;
 ctx.save();ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();
 ctx.translate(x+fit[2]*size/100,y+fit[3]*size/100);ctx.scale(fit[0],fit[1]);
 for(const clip of [part.clip,...(part.clips||[])].filter(Boolean)){const cp=new Path2D();
  if(clip.startsWith('polygon(')){const points=clip.slice(8,-1).replace(/^evenodd,/, '').split(',').map(v=>v.trim().split(/\s+/).map(Number.parseFloat));points.forEach(([px,py],i)=>i===0?cp.moveTo(px*size/100,py*size/100):cp.lineTo(px*size/100,py*size/100));cp.closePath();}
  else if(clip.startsWith('inset(')){const q=clip.slice(6,-1).split(/\s+/).map(Number.parseFloat);cp.rect(q[3]*size/100,q[0]*size/100,(100-q[1]-q[3])*size/100,(100-q[0]-q[2])*size/100);}
  ctx.clip(cp,'evenodd');
 }
 const r=part.sourceRect||{x:cell%cols*100/cols,y:Math.floor(cell/cols)*100/rows,width:100/cols,height:100/rows};
 ctx.drawImage(img,r.x*img.width/100,r.y*img.height/100,r.width*img.width/100,r.height*img.height/100,0,0,size,size);ctx.restore();
}
const configs=[];
for(const presentation of ['masculine','feminine','androgynous'])for(const [i,style] of ['short','shoulder','undercut','heavybangs','mohawk','tonsure'].entries())configs.push({age:27,appearance:{ancestry:race,heritage:['ashlands','sunlands','sable_coast'][i%3],portraitPresentation:presentation,faceVariant:['first','second','third'][i%3],hairStyle:style}});
for(const beard of ['short','long','forked','braided','stubble','goatee','mustache','drooping','none'])configs.push({age:27,appearance:{ancestry:race,heritage:'sunlands',portraitPresentation:'masculine',hairStyle:'short',facialHair:beard}});
for(const headgear of ['cowl','wool','kettle','nasal','sallet','witch','frayedhood','iron','bandana','leathercap','shortbrim','wicker'])configs.push({age:27,appearance:{ancestry:race,portraitPresentation:'feminine',hairStyle:'long',headgear}});
for(const facewear of ['scarf','bone','blindfold','halfmask','mothveil','plague'])configs.push({age:27,appearance:{ancestry:race,portraitPresentation:'androgynous',hairStyle:'curls',facewear}});
for(const accessory of ['circlet','glasses','earring','amulet','flower','feather','eyepatch','earcuff'])configs.push({age:27,appearance:{ancestry:race,portraitPresentation:'masculine',hairStyle:'tied',accessory}});
if(process.argv.includes('--identities')){
 configs.length=0;
 for(const age of [27,0,7,14,75])for(const heritage of ['ashlands','sunlands','sable_coast'])for(const presentation of ['masculine','feminine','androgynous'])for(const faceVariant of age===27?['first','second','third']:['first'])configs.push({age,appearance:{ancestry:race,heritage,portraitPresentation:presentation,faceVariant,hairStyle:'shaved'}});
}
if(process.argv.includes('--all-hair')){
 configs.length=0;
 for(const presentation of ['masculine','feminine','androgynous'])for(const [i,{value:hairStyle}] of AVATAR_OPTIONS.find(f=>f.key==='hairStyle').options.entries())configs.push({age:27,appearance:{ancestry:race,heritage:['ashlands','sunlands','sable_coast'][i%3],portraitPresentation:presentation,faceVariant:['first','second','third'][i%3],hairStyle}});
}
const cols=6,size=200,label=25,rows=Math.ceil(configs.length/cols),canvas=createCanvas(cols*size,rows*(size+label)),ctx=canvas.getContext('2d');
ctx.fillStyle='#11100f';ctx.fillRect(0,0,canvas.width,canvas.height);
for(const [index,config] of configs.entries()){
 const p=portraitLayers(config),x=index%cols*size,y=Math.floor(index/cols)*(size+label),s=size-6;
 for(const part of portraitComponents(config))await tile(ctx,part,x,y,s);
 ctx.fillStyle='#d9d1c1';ctx.font='11px serif';const a=config.appearance;ctx.fillText([config.age,a.heritage,a.portraitPresentation,a.hairStyle,a.facialHair,a.headgear,a.facewear,a.accessory].filter(Boolean).join(' · '),x,y+size+12,size-8);
}
await fs.writeFile(out,canvas.toBuffer('image/png'));console.log(out);
