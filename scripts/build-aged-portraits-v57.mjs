import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const stages=new Set(['mature','older','elder']);
const presentations=new Set(['masculine','feminine','androgynous']);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const keyFor=(id,cell)=>`${id}:${String(cell).padStart(2,'0')}`;

// AVIF image spatial extents are explicit native dimensions, not a requested
// generation size. Multiple ispe properties can describe auxiliary images.
export function nativeAvifDimensions(bytes){
  if(bytes.length<24||bytes.toString('ascii',4,8)!=='ftyp'||!['avif','avis'].some(brand=>bytes.subarray(8,32).includes(Buffer.from(brand))))throw Error('The accepted age painting is not a native AVIF image.');
  const dimensions=[];
  for(let offset=0;(offset=bytes.indexOf('ispe',offset,'ascii'))!==-1;offset+=4){
    if(offset<4||offset+16>bytes.length||bytes.readUInt32BE(offset-4)<20)continue;
    const width=bytes.readUInt32BE(offset+8),height=bytes.readUInt32BE(offset+12);
    if(width&&height)dimensions.push({width,height});
  }
  if(!dimensions.length)throw Error('The accepted age painting has no native image dimensions.');
  return dimensions;
}

/** Only accepted inspected paintings enter the catalogue; unfinished jobs stay absent. */
export async function compileAgedPortraitCatalog(receipts,{adultEntries,readAsset}){
  if(!Array.isArray(receipts))throw Error('Age painting receipts must be an array.');
  const anchors=new Map(adultEntries.filter(p=>p.stage==='adult').map(p=>[p.key,p]));
  const atlases=[],counterparts={},atlasIds=new Set(),assetPaths=new Set(),acceptedKeys=new Set();
  for(const receipt of receipts){
    if(receipt?.status!=='accepted')continue;
    const {id,adultAtlasId,ancestry,stage,width,height,rows,columns,cells,entries}=receipt;
    const target=receipt.target||receipt.src?.replace(/^\.\//,'');
    if(typeof id!=='string'||!id||atlasIds.has(id)||typeof adultAtlasId!=='string'||!stages.has(stage))throw Error('Invalid or repeated accepted age atlas '+id);
    if(!/^art\/presets\/[a-z0-9-]+\.avif$/.test(target||'')||assetPaths.has(target)||receipt.src&&receipt.src!=='./'+target)throw Error('Invalid or repeated accepted age asset '+id);
    if(![width,height,rows,columns].every(n=>Number.isInteger(n)&&n>0)||!Array.isArray(cells)||cells.length!==rows*columns||!Array.isArray(entries)||!entries.length)throw Error('Invalid native age geometry '+id);
    if(!receipt.visualReview||typeof receipt.visualReview!=='object'||Array.isArray(receipt.visualReview)||!receipt.provenance||typeof receipt.provenance!=='object')throw Error('Missing accepted visual review or generation provenance '+id);
    const bytes=await readAsset(target);
    if(!/^[a-f0-9]{64}$/.test(receipt.encodedSha256||'')||digest(bytes)!==receipt.encodedSha256)throw Error('Accepted age asset hash mismatch '+id);
    if(!nativeAvifDimensions(bytes).some(native=>native.width===width&&native.height===height))throw Error('Accepted age native dimensions mismatch '+id);
    for(const rect of cells){
      if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))throw Error('Invalid accepted age crop '+id);
      const [x,y,w,h]=rect;
      if(x<0||y<0||w<=0||h<=0||x+w>100.00001||y+h>100.00001||w*width/100<32||h*height/100<32)throw Error('Out-of-bounds or undersized accepted age crop '+id);
    }
    const paintedCells=new Set(),registered=[];
    for(const entry of entries){
      const anchor=anchors.get(entry.adultKey),cell=entry.cell,key=keyFor(id,cell);
      if(!Number.isInteger(cell)||cell<0||cell>=cells.length||paintedCells.has(cell)||acceptedKeys.has(key))throw Error('Invalid or repeated accepted age cell '+id+':'+cell);
      if(!anchor||anchor.ancestry!==ancestry||anchor.key.split(':')[0]!==adultAtlasId||!presentations.has(entry.presentation)||entry.presentation!==anchor.presentation)throw Error('Age painting has no matching adult identity '+key);
      if(entry.stage&&entry.stage!==stage)throw Error('Age painting stage mismatch '+key);
      if(['human','elf'].includes(ancestry)&&['light','medium','deep'].includes(anchor.complexion)&&entry.complexion!==anchor.complexion)throw Error('Age painting changes its adult complexion '+key);
      if(ancestry==='beastfolk')for(const field of ['morphology','furTone','speciesFamily']){
        if(anchor[field]&&!['unknown','uncertain'].includes(anchor[field])&&entry[field]!==anchor[field])throw Error('Age painting changes its adult '+field+' '+key);
      }
      if(counterparts[anchor.key]?.[stage])throw Error('Repeated adult age counterpart '+anchor.key+' '+stage);
      paintedCells.add(cell);acceptedKeys.add(key);
      registered.push({cell,adultKey:anchor.key,stage,presentation:entry.presentation,complexion:entry.complexion,morphology:entry.morphology,furTone:entry.furTone,speciesFamily:entry.speciesFamily,hairTone:entry.hairTone,archetype:anchor.archetype,modern:true});
      (counterparts[anchor.key]??={})[stage]=key;
    }
    atlasIds.add(id);assetPaths.add(target);
    atlases.push({id,adultAtlasId,ancestry,stage,src:'./'+target,width,height,rows,columns,modern:true,cells,entries:registered});
  }
  return {atlases,counterparts,ignoredReceipts:receipts.length-atlases.length};
}

export function agedPortraitCatalogSource({atlases,counterparts}){
  const fields=['complexion','morphology','furTone','speciesFamily','hairTone','archetype'];
  const packed=atlases.map(atlas=>({...atlas,entries:atlas.entries.map(entry=>[entry.cell,entry.adultKey.split(':')[1],entry.presentation,fields.reduce((mask,field,index)=>entry[field]===undefined?mask:mask|(1<<index),0),...fields.filter(field=>entry[field]!==undefined).map(field=>entry[field])])}));
  return '// Generated only from accepted, inspected native age counterpart paintings.\n'+
    '// An absent adult/stage mapping deliberately retains the established fallback.\n'+
    '// Store each adult identity once; reconstruct the public catalogue without duplicated labels.\n'+
    'const packed = '+JSON.stringify(packed)+';\n'+
    'const fields = '+JSON.stringify(fields)+';\n'+
    'export const AGED_PORTRAIT_ATLASES_V57 = packed.map(atlas=>({...atlas,entries:atlas.entries.map(values=>{const entry={cell:values[0],adultKey:atlas.adultAtlasId+":"+values[1],stage:atlas.stage,presentation:values[2],modern:true};let cursor=4;fields.forEach((field,index)=>{if(values[3]&(1<<index))entry[field]=values[cursor++];});return entry;})}));\n'+
    'export const AGED_PORTRAIT_COUNTERPARTS_V57 = {};\n'+
    'for(const atlas of AGED_PORTRAIT_ATLASES_V57)for(const entry of atlas.entries)(AGED_PORTRAIT_COUNTERPARTS_V57[entry.adultKey]??={})[entry.stage]=atlas.id+":"+String(entry.cell).padStart(2,"0");\n';
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const {PORTRAIT_LIBRARY}=await import(pathToFileURL(path.join(root,'dist/js/portrait-library.js')).href);
  let receipts=[];
  try{receipts=JSON.parse(await readFile(path.join(root,'docs/art-v57/aged-registration.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const compiled=await compileAgedPortraitCatalog(receipts,{adultEntries:PORTRAIT_LIBRARY,readAsset:target=>readFile(path.join(root,'dist',target))});
  await writeFile(path.join(root,'dist/js/aged-portraits-v57.js'),agedPortraitCatalogSource(compiled));
  console.log(JSON.stringify({acceptedAtlases:compiled.atlases.length,acceptedPaintings:compiled.atlases.reduce((n,a)=>n+a.entries.length,0),adultAnchors:Object.keys(compiled.counterparts).length,ignoredReceipts:compiled.ignoredReceipts}));
}
