import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const races=['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'];
const stages=['infant','child','adolescent','elder'];
const draft=process.argv.includes('--draft'), sheets=[];
for(const race of races)for(const [stage,count] of [['adult',16],...stages.map(stage=>[stage,1])]){
  for(let index=0;index<count;index++){
    const id=`${race}-${stage}-${String(index).padStart(2,'0')}`;
    let record;
    try{record=JSON.parse(await readFile(path.join(root,'reference-art/preset-v18/registration',id+'.json'),'utf8'));}
    catch(error){if(!draft)throw error;record={width:1280,height:1280,cells:Array.from({length:64},(_,cell)=>({cell,source:[(cell%8)*12.5,Math.floor(cell/8)*12.5,12.5,12.5]}))};}
    if(record.cells.length!==64||record.cells.some((cell,index)=>cell.cell!==index))throw new Error(`Incomplete atlas ${id}`);
    let morphologies='';
    let complexions='';
    if(['human','elf'].includes(race)){
      try{
        const tones=JSON.parse(await readFile(path.join(root,'reference-art/preset-v18/complexions',id+'.json'),'utf8'));
        if(tones.sourceSha256!==record.sha256||tones.entries.length!==64||tones.entries.some((entry,index)=>entry.cell!==index||!['light','medium','deep','unknown'].includes(entry.complexion)))throw new Error('Outdated complexion metadata '+id);
        complexions=', complexions: '+JSON.stringify(tones.entries.map(entry=>entry.complexion));
      }catch(error){if(!draft)throw error;}
    }
    if(race==='beastfolk'){
      try{
        const species=JSON.parse(await readFile(path.join(root,'reference-art/preset-v18/species',id+'.json'),'utf8'));
        if(species.sourceSha256!==record.sha256||species.entries.length!==64||species.entries.some((entry,index)=>entry.cell!==index))throw new Error(`Outdated species metadata ${id}`);
        morphologies=', morphologies: '+JSON.stringify(species.entries.map(entry=>entry.morphology));
      }catch(error){if(!draft)throw error;}
    }
    sheets.push(`  '${id}': { src: './art/presets/${id}.avif', width: ${record.width}, height: ${record.height}, cells: ${JSON.stringify(record.cells.map(cell=>cell.source.map(value=>Number(value.toFixed(6)))))}${morphologies}${complexions} }`);
  }
}
const supplements=[];
try{
  const id='elf-lifecycle-00',reg=JSON.parse(await readFile(path.join(root,'reference-art/preset-v18/registration',id+'.json'),'utf8')),traits=JSON.parse(await readFile(path.join(root,'reference-art/preset-v18/supplements',id+'.json'),'utf8'));
  if(traits.sourceSha256!==reg.sha256||reg.cells.length!==64||traits.entries.length!==64||traits.entries.some((e,i)=>e.cell!==i||!['infant','child','adolescent','elder'].includes(e.stage)||!['masculine','feminine','androgynous'].includes(e.presentation)||!['medium','deep'].includes(e.complexion)))throw new Error('Invalid age supplement '+id);
  for(const stage of stages)for(const presentation of ['masculine','feminine','androgynous'])for(const complexion of ['medium','deep'])if(!traits.entries.some(e=>e.stage===stage&&e.presentation===presentation&&e.complexion===complexion))throw new Error('Missing supplement age/presentation/complexion pool.');
  supplements.push({id,ancestry:'elf',src:'./art/presets/'+id+'.avif',width:reg.width,height:reg.height,cells:reg.cells.map(c=>c.source.map(n=>Number(n.toFixed(6)))),entries:traits.entries});
}catch(error){if(!draft)throw error;}
const source=`// Generated from the registered COMPLETE illustrations. Do not hand-edit source rectangles.
// Each adult atlas is 64 different painted people. Life stages use their own 64 paintings per ancestry.
export const PORTRAIT_RACES=Object.freeze(${JSON.stringify(races)});
export const PORTRAIT_ARCHETYPES=Object.freeze(['watch','wanderer','scholar','healer','craft','performer','court','field']);
export const DRAFT_CATALOG=${draft};
export const AGE_SUPPLEMENT_CATALOG=${JSON.stringify(supplements)};
export const PRESET_COUNT=1024;
export const STAGE_PRESET_COUNT=64;
export const PORTRAIT_CATALOG=Object.freeze({
${sheets.join(',\n')}
});

export function portraitStage(age){
  const years=Number.isFinite(age)?Math.max(0,age):27;
  return years<3?'infant':years<10?'child':years<18?'adolescent':years<40?'adult':years<55?'mature':years<65?'older':'elder';
}
export function presetIndex(value){
  return typeof value==='string'&&/^p\\d{4}$/.test(value)&&Number(value.slice(1))<PRESET_COUNT?Number(value.slice(1)):null;
}
export function presetPresentation(index){
  const cell=index%64;return cell<24?'masculine':cell<48?'feminine':'androgynous';
}
function hash(value){let result=2166136261;for(const character of String(value))result=Math.imul(result^character.charCodeAt(0),16777619)>>>0;return result;}
export function choosePortraitPreset(seed,{presentation='androgynous',archetype}={}){
  const first=presentation==='masculine'?0:presentation==='feminine'?24:48;
  const count=presentation==='androgynous'?16:24;
  const group=PORTRAIT_ARCHETYPES.indexOf(archetype);
  const sheet=group<0?hash(seed+':atlas')%16:group*2+hash(seed+':atlas')%2;
  const index=sheet*64+first+hash(seed+':individual')%count;
  return 'p'+String(index).padStart(4,'0');
}
export function portraitPreset(value,{ancestry='human',age=27,morphology:requiredMorphology}={}){
  const race=PORTRAIT_RACES.includes(ancestry)?ancestry:'human';
  const index=presetIndex(value)??48,stage=portraitStage(age),atlasStage=['mature','older'].includes(stage)?'adult':stage,sheet=atlasStage==='adult'?Math.floor(index/64):0;
  let cell=index%64;
  let atlas=PORTRAIT_CATALOG[race+'-'+atlasStage+'-'+String(sheet).padStart(2,'0')];
  const adultAtlas=PORTRAIT_CATALOG[race+'-adult-'+String(Math.floor(index/64)).padStart(2,'0')];
  let morphology=adultAtlas.morphologies?.[index%64];
  let complexion=adultAtlas.complexions?.[index%64];
  if(['human','elf'].includes(race)&&atlasStage!=='adult'&&atlas.complexions){
    const target=complexion&&complexion!=='unknown'?complexion:'light',presentation=presetPresentation(index);
    const pool=atlas.complexions.map((kind,frame)=>({kind,frame,atlas})).filter(e=>e.kind===target&&presetPresentation(e.frame)===presentation);
    for(const supplement of AGE_SUPPLEMENT_CATALOG)if(supplement.ancestry===race)for(const entry of supplement.entries)if(entry.stage===stage&&entry.presentation===presentation&&entry.complexion===target)pool.push({kind:entry.complexion,frame:entry.cell,atlas:supplement});
    if(pool.length){const selected=pool[hash('age-complexion:'+index)%pool.length];cell=selected.frame;atlas=selected.atlas;complexion=selected.kind;}
    else if(!DRAFT_CATALOG)throw new Error('Missing '+race+' '+stage+' '+presentation+' '+target+' portrait.');
  }
  if(race==='beastfolk'&&requiredMorphology){
    morphology=requiredMorphology;
    if(atlasStage==='adult'){
      let pool=atlas.morphologies?.map((kind,frame)=>({kind,frame,atlas})).filter(e=>e.kind===morphology&&presetPresentation(e.frame)===presetPresentation(index))||[];
      if(!pool.length)for(let sheetIndex=0;sheetIndex<16;sheetIndex++){const candidate=PORTRAIT_CATALOG['beastfolk-adult-'+String(sheetIndex).padStart(2,'0')];for(let frame=0;frame<64;frame++)if(candidate.morphologies?.[frame]===morphology&&presetPresentation(frame)===presetPresentation(index))pool.push({frame,atlas:candidate});}
      if(pool.length){const selected=pool[hash('condition-family:'+index)%pool.length];cell=selected.frame;atlas=selected.atlas;}
      else if(!DRAFT_CATALOG)throw new Error('No adult '+morphology+' '+presetPresentation(index)+' portrait.');
    }
  }
  if(race==='beastfolk'&&atlasStage!=='adult'&&atlas.morphologies){
    // Hidden adult masks do not reveal a species; give them a fixed family rather than rerolling each age.
    if(!morphology||morphology==='unknown')morphology=['canine','feline','bear','horned','long_eared','other'][hash('morphology:'+index)%6];
    const pool=atlas.morphologies.map((kind,frame)=>({kind,frame})).filter(entry=>entry.kind===morphology&&presetPresentation(entry.frame)===presetPresentation(index));
    if(!pool.length)throw new Error('Missing '+morphology+' '+presetPresentation(index)+' '+stage+' portraits.');
    cell=pool[hash('age-family:'+index)%pool.length].frame;
  }
  const [x,y,width,height]=atlas.cells[cell];
  return {id:'p'+String(index).padStart(4,'0'),index,cell,stage,ancestry:race,morphology,complexion,archetype:PORTRAIT_ARCHETYPES[Math.floor(index/128)],presentation:presetPresentation(index),src:atlas.src,width:atlas.width,height:atlas.height,sourceRect:{x,y,width,height}};
}
`;
await writeFile(path.join(root,'dist/js/portrait-catalog.js'),source);
console.log(`Registered ${sheets.length} portrait atlases${draft?' (development placeholders allowed)':''}.`);
