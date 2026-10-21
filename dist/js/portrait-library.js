import { LINKED_AGE_ATLASES_V27, LINKED_PORTRAIT_FAMILIES_V27 } from './linked-portraits-v27.js';
import { GROUNDED_AGE_ATLASES_V39, GROUNDED_PORTRAIT_FAMILIES_V39 } from './grounded-portraits-v39.js';
import { MATURE_PORTRAIT_ATLASES_V40 } from './mature-portraits-v40.js';
import { LIFECYCLE_PORTRAIT_ATLASES_V40, LIFECYCLE_PORTRAIT_FAMILIES_V40 } from './lifecycle-portraits-v40.js';
import { AGED_PORTRAIT_ATLASES_V57, AGED_PORTRAIT_COUNTERPARTS_V57 } from './aged-portraits-v57.js';
import { PORTRAIT_IDENTITY_V20, LIFECYCLE_SUPPLEMENTS_V20 } from './portrait-identity-v20.js';
import { PORTRAIT_CATALOG, AGE_SUPPLEMENT_CATALOG, PORTRAIT_ARCHETYPES, portraitPreset, portraitStage, presetPresentation, presetIndex, choosePortraitPreset } from './portrait-catalog.js';
import { availableHeritages, heritageById, heritageAllowsPortrait } from './heritages.js';

export const PORTRAIT_STAGES=Object.freeze([
  {id:'infant',label:'Infant',min:0,max:2}, {id:'child',label:'Child',min:3,max:9},
  {id:'adolescent',label:'Adolescent',min:10,max:17}, {id:'adult',label:'Adult',min:18,max:39},
  {id:'mature',label:'Mature',min:40,max:54}, {id:'older',label:'Older',min:55,max:64}, {id:'elder',label:'Elder',min:65,max:null},
].map(Object.freeze));
const youngStages=['infant','child','adolescent'];
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
function nativeEntry(atlas,cell,stage,presentation,complexion,details={}) {
  const [x,y,width,height]=atlas.cells[cell],match=atlas.id.match(/adult-(\d+)$/),sheet=Number(match?.[1]||0),observed=PORTRAIT_IDENTITY_V20[atlas.id]?.[cell]||{};
  return Object.freeze({key:`${atlas.id}:${String(cell).padStart(2,'0')}`,id:`${atlas.id}:${String(cell).padStart(2,'0')}`,index:details.modern||atlas.modern?-1:stage==='adult'&&!match?-1:sheet*64+cell,cell,stage,ancestry:atlas.ancestry,
    presentation:presentation||presetPresentation(cell),complexion:complexion||atlas.complexions?.[cell],morphology:details.morphology||atlas.morphologies?.[cell],...observed,hairTone:details.hairTone||observed.hairTone,furTone:details.furTone||observed.furTone,speciesFamily:details.speciesFamily||observed.speciesFamily,familyId:details.familyId,adultKey:details.adultKey,
    archetype:details.archetype||(stage==='adult'?(match?PORTRAIT_ARCHETYPES[Math.floor(sheet/2)]:'wanderer'):stage==='elder'?'elder':'young'),
    modern:Boolean(details.modern||atlas.modern),columns:atlas.columns||8,rows:atlas.rows||8,
    src:atlas.src,width:atlas.width,height:atlas.height,sourceRect:Object.freeze({x,y,width,height})});
}
export const PORTRAIT_LIBRARY=Object.freeze([
  ...Object.entries(PORTRAIT_CATALOG).flatMap(([id,data])=>{
    const [,race,stage]=id.match(/^([a-z]+)-(infant|child|adolescent|adult|elder)-\d+$/);
    const atlas={...data,id,ancestry:race};return atlas.cells.map((_,cell)=>nativeEntry(atlas,cell,stage));
  }),
  ...[...AGE_SUPPLEMENT_CATALOG,...LIFECYCLE_SUPPLEMENTS_V20,...LINKED_AGE_ATLASES_V27].flatMap(atlas=>atlas.entries.map(e=>nativeEntry(atlas,e.cell,e.stage,e.presentation,e.complexion,e))),
  ...GROUNDED_AGE_ATLASES_V39.flatMap(atlas=>atlas.entries.map(e=>nativeEntry(atlas,e.cell,e.stage,e.presentation,e.complexion,{...e,modern:true}))),
  ...MATURE_PORTRAIT_ATLASES_V40.flatMap(atlas=>atlas.entries.map(e=>nativeEntry(atlas,e.cell,e.stage,e.presentation,e.complexion,{...e,modern:true}))),
  ...LIFECYCLE_PORTRAIT_ATLASES_V40.flatMap(atlas=>atlas.entries.map(e=>nativeEntry(atlas,e.cell,e.stage,e.presentation,e.complexion,{...e,modern:true}))),
  ...AGED_PORTRAIT_ATLASES_V57.flatMap(atlas=>atlas.entries.map(e=>nativeEntry(atlas,e.cell,e.stage,e.presentation,e.complexion,{...e,modern:true}))),
]);
const MODERN_PORTRAIT_FAMILIES=Object.freeze([...GROUNDED_PORTRAIT_FAMILIES_V39,...LIFECYCLE_PORTRAIT_FAMILIES_V40]);
export const PORTRAIT_FAMILIES=Object.freeze([...LINKED_PORTRAIT_FAMILIES_V27,...MODERN_PORTRAIT_FAMILIES]);
const familiesBySelection=new Map(PORTRAIT_FAMILIES.flatMap(f=>Object.values(f.selections).map(key=>[key,f])));
export function linkedPortraitFamily(appearance={}, {stage}={}){
  const selections=appearance.portraitSelections||{};
  for(const id of [...new Set([stage,'adult','mature','older','elder',...youngStages].filter(Boolean))]){
    const family=familiesBySelection.get(selections[id]);if(family?.ancestry===appearance.ancestry)return family;
  }
  return LINKED_PORTRAIT_FAMILIES_V27.find(f=>f.adultPreset===appearance.preset&&f.ancestry===appearance.ancestry)||null;
}
const entries=new Map(PORTRAIT_LIBRARY.map(p=>[p.key,p]));
export function portraitEntry(key) { return typeof key==='string'?entries.get(key)||null:null; }
export function portraitIdentity(person={},a=person.appearance??person) {
  const index=presetIndex(a.preset);if(index!==null&&presetPresentation(index)===a.portraitPresentation)return a.preset;
  const role=person.character?.archetype||(/guard|soldier|warrior|paladin/i.test(person.role||'')?'watch':/heal|shrine|herbal/i.test(person.role||'')?'healer':/mage|scholar|teacher|alchemist/i.test(person.role||'')?'scholar':/bard|singer|storytell/i.test(person.role||'')?'performer':/noble|court/i.test(person.role||'')?'court':/farmer|garden|ferry/i.test(person.role||'')?'field':/smith|artisan|merchant|weaver|miner|cook/i.test(person.role||'')?'craft':person.role?'wanderer':undefined);
  return choosePortraitPreset((person.id||person.name||'unwritten')+':'+(a.ancestry||'human'),{presentation:a.portraitPresentation||'androgynous',archetype:role});
}
export function effectiveHeritage(person={}) {
  const a=person.appearance??person,race=a.ancestry||'human',profiles=availableHeritages(race);
  if(a.heritageVersion===1 && heritageById(a.heritage,race))return heritageById(a.heritage,race);
  const p=portraitPreset(portraitIdentity(person,a),{ancestry:race,age:27});
  return profiles.find(h=>h.morphology&&h.morphology===p.morphology)
    || profiles.find(h=>h.complexion&&h.complexion===p.complexion)
    || heritageById(a.heritage,race)||profiles[0];
}
export function portraitContext(person={},age=27) {
  const a=person.appearance??person,wolf=['lycanthrope','werewolf'].includes(person.condition?.type)&&!(person.condition.curseVersion===1&&person.condition.form==='human');
  return {ancestry:wolf?'beastfolk':a.ancestry||'human',stage:portraitStage(age),heritage:wolf?heritageById('wolfkin','beastfolk'):effectiveHeritage(person),wolf};
}
export function availablePortraits(person={},age=27,{presentation='all',archetype='all'}={}) {
  const c=portraitContext(person,age);
  return PORTRAIT_LIBRARY.filter(p=>p.ancestry===c.ancestry && p.stage===c.stage && heritageAllowsPortrait(c.heritage,p)
    && (!c.wolf||p.morphology==='canine')
    && (presentation==='all'||p.presentation===presentation) && (archetype==='all'||p.archetype===archetype));
}
export function chooseHeritagePreset(seed,appearance,heritage,presentation=appearance.portraitPresentation) {
  const pool=PORTRAIT_LIBRARY.filter(p=>p.index>=0 && p.ancestry===appearance.ancestry && p.stage==='adult' && p.presentation===presentation && heritageAllowsPortrait(heritage,p));
  if(!pool.length)return appearance.preset;
  const current=portraitPreset(appearance.preset,{ancestry:appearance.ancestry,age:27});
  const sameCalling=pool.filter(p=>p.archetype===current.archetype),options=sameCalling.length?sameCalling:pool;
  return 'p'+String(options[hash(seed)%options.length].index).padStart(4,'0');
}
export function assignHeritage(appearance,id,seed='heritage',{preferModern=false,archetype}={}) {
  const h=heritageById(id,appearance.ancestry);if(!h)return {...appearance};
  const selected=portraitEntry(appearance.portraitSelections?.adult);
  if(selected&&(!preferModern||selected.modern)&&heritageAllowsPortrait(h,selected)&&Object.values(appearance.portraitSelections).every(key=>heritageAllowsPortrait(h,portraitEntry(key))))return {...appearance,heritage:h.id,heritageVersion:1};
  const modern=linkedNpcAppearance(appearance,seed,h,{modernOnly:true,archetype});if(modern)return modern;
  const old=portraitPreset(appearance.preset,{ancestry:appearance.ancestry,age:27});
  const preset=presetIndex(appearance.preset)!==null && old.presentation===appearance.portraitPresentation && heritageAllowsPortrait(h,old)?appearance.preset:chooseHeritagePreset(seed,appearance,h);
  return {...appearance,heritage:h.id,heritageVersion:1,preset,portraitSelections:{},wolfPortraitSelections:{}};
}
export function selectPortrait(appearance,key,{age=27,condition=null,identity='portrait'}={}) {
  const p=portraitEntry(key),person={id:identity,appearance,condition},c=portraitContext(person,age);
  if(!p||p.stage!==c.stage||!heritageAllowsPortrait(c.heritage,p)||c.wolf&&p.morphology!=='canine')return null;
  const next={...appearance},field=c.wolf?'wolfPortraitSelections':'portraitSelections';
  next[field]={...(next[field]||{}),[c.stage]:p.key};
  next.portraitPresentation=p.presentation;
  const linked=!c.wolf&&familiesBySelection.get(p.key);
  if(linked){
    const currentStage=PORTRAIT_STAGES.find(s=>s.id===c.stage),past={};
    // Saved earlier faces belong to the person's history; the selected family supplies this age and later ages.
    for(const stage of PORTRAIT_STAGES)if(stage.min<currentStage.min&&appearance.portraitSelections?.[stage.id])past[stage.id]=appearance.portraitSelections[stage.id];
    next.portraitSelections={...familySelections(linked,next,c.heritage),...past,[c.stage]:p.key};
    if(c.stage==='adult')for(const stage of ['mature','older','elder'])if(appearance.portraitSelections?.[stage])next.portraitSelections[stage]=appearance.portraitSelections[stage];
    if(linked.adultPreset)next.preset=linked.adultPreset;
    next.heritage=c.heritage.id;next.heritageVersion=1;
    if(['dark','light'].includes(linked.hairTone))next.hair=linked.hairTone==='light'?'gold':'black';
    return next;
  }
  if(!c.wolf&&p.adultKey){
    // Choosing an actual later-age painting carries its own identity forward;
    // recorded earlier faces remain the history of this life.
    const anchor=portraitEntry(p.adultKey),currentStage=PORTRAIT_STAGES.find(s=>s.id===c.stage);
    for(const stage of PORTRAIT_STAGES)if(stage.min>=currentStage.min){
      const actual=exactAgeForAdult(anchor,stage.id,c.heritage);
      if(actual)next.portraitSelections[stage.id]=actual.key;
    }
    next.portraitSelections[c.stage]=p.key;
    next.heritage=c.heritage.id;next.heritageVersion=1;
    return next;
  }
  // Each stage keeps its own chosen face. Presentation never changes pronouns.
  if(!c.wolf){
    next.heritage=c.heritage.id;next.heritageVersion=1;
    if(c.stage==='adult'&&p.index>=0)next.preset='p'+String(p.index).padStart(4,'0');
    else next.preset=chooseHeritagePreset(identity+':'+p.key,next,c.heritage,p.presentation);
    if(c.stage==='adult')for(const stage of ['mature','older','elder'])if(!appearance.portraitSelections?.[stage]){
      const actual=exactAgeForAdult(p,stage,c.heritage);if(actual)next.portraitSelections[stage]=actual.key;
    }
  }
  return next;
}
export function validPortraitSelections(value,ancestry,{wolf=false}={}) {
  return Boolean(value && typeof value==='object' && !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype
    && Object.entries(value).every(([stage,key])=>PORTRAIT_STAGES.some(s=>s.id===stage) && portraitEntry(key)?.stage===stage
      && portraitEntry(key).ancestry===(wolf?'beastfolk':ancestry) && (!wolf||portraitEntry(key).morphology==='canine')));
}
function originalEntry(a,identity) {
  const index=presetIndex(identity),resolved=index!==null&&presetPresentation(index)===a.portraitPresentation?identity:portraitIdentity(a);
  const art=portraitPreset(resolved,{ancestry:a.ancestry||'human',age:27}),atlas=art.atlasId;
  return portraitEntry(`${atlas}:${String(art.cell).padStart(2,'0')}`)||art;
}
const lightHair=new Set(['gold','honey','silver','white']);
export function portraitPhenotype(appearance,identity=appearance.preset){
  const a=appearance,family=linkedPortraitFamily(a),anchor=portraitEntry(a.portraitSelections?.adult)||portraitEntry(family?.selections.adult)||originalEntry(a,identity),h=heritageById(a.heritage,a.ancestry);
  const hairTone=['dark','light'].includes(anchor.hairTone)?anchor.hairTone:lightHair.has(a.hair)?'light':'dark';
  return {...anchor,observedHairTone:anchor.hairTone,hairTone,complexion:anchor.complexion&&anchor.complexion!=='unknown'?anchor.complexion:h?.complexion,morphology:anchor.morphology&&anchor.morphology!=='unknown'?anchor.morphology:h?.morphology};
}
function exactAgeForAdult(anchor,stage,heritage){
  if(!anchor||!['mature','older','elder'].includes(stage))return null;
  const counterpartKey=AGED_PORTRAIT_COUNTERPARTS_V57[anchor.key]?.[stage];if(!counterpartKey)return null;
  // A previously painted direct age link is already the same person.
  const family=familiesBySelection.get(anchor.key),existing=portraitEntry(family?.selections[stage]);
  if(existing&&heritageAllowsPortrait(heritage,existing))return existing;
  const actual=portraitEntry(counterpartKey);
  return actual?.adultKey===anchor.key&&actual.stage===stage&&heritageAllowsPortrait(heritage,actual)?actual:null;
}
/** Exact source-adult links only; this lookup never writes or invents an age face. */
export function exactAdultAgePortrait(appearance,identity=appearance.preset,{stage}={}){
  if(!['mature','older','elder'].includes(stage))return null;
  return exactAgeForAdult(portraitPhenotype(appearance,identity),stage,effectiveHeritage(appearance));
}
const lifecycleCache=new Map(),npcAdultCache=new Map();
function lifecyclePool(anchor,stage){
  const key=[anchor.ancestry,anchor.presentation,anchor.complexion,anchor.morphology,anchor.furTone,anchor.speciesFamily,anchor.hairTone,stage].join(':');
  if(lifecycleCache.has(key))return lifecycleCache.get(key);
  // Exact age paintings belong only to their own adult. They must not change
  // an unrelated legacy identity's established phenotype fallback pool.
  const pool=PORTRAIT_LIBRARY.filter(p=>!p.adultKey&&p.ancestry===anchor.ancestry&&p.stage===stage&&p.presentation===anchor.presentation
    && (!['human','elf'].includes(p.ancestry)||p.complexion===anchor.complexion)
    && (p.ancestry!=='beastfolk'||p.morphology===anchor.morphology&&p.furTone===anchor.furTone&&(p.morphology!=='other'||p.speciesFamily===anchor.speciesFamily&& !['uncertain',undefined].includes(p.speciesFamily)))
    && (p.hairTone===anchor.hairTone||['bald','covered','uncertain'].includes(p.hairTone)||stage==='elder'&&p.hairTone==='grey'));
  lifecycleCache.set(key,pool);return pool;
}
function compatibleFamily(anchor,family,heritage){
  return family.ancestry===anchor.ancestry&&family.presentation===anchor.presentation&&heritageAllowsPortrait(heritage,family)
    && (!['human','elf'].includes(anchor.ancestry)||!anchor.complexion||family.complexion===anchor.complexion)
    && (anchor.ancestry!=='beastfolk'||(!anchor.morphology||family.morphology===anchor.morphology)
      && (!['dark','light','mixed'].includes(anchor.furTone)||family.furTone===anchor.furTone)
      && (anchor.morphology!=='other'||!anchor.speciesFamily||anchor.speciesFamily==='uncertain'||family.speciesFamily===anchor.speciesFamily));
}
const modernFamilyCache=new Map(),familySelectionCache=new Map(),familySelectionPreCache=new Map();
const expandedMatureKeys=new Set(MATURE_PORTRAIT_ATLASES_V40.flatMap(a=>a.entries.map(e=>`${a.id}:${String(e.cell).padStart(2,'0')}`)));
const expandedLifecycleKeys=new Set(LIFECYCLE_PORTRAIT_ATLASES_V40.flatMap(a=>a.entries.map(e=>`${a.id}:${String(e.cell).padStart(2,'0')}`)));
function expandedMaturePortrait(anchor,heritage,seed){
  const candidates=[...lifecyclePool(anchor,'mature'),...lifecyclePool({...anchor,hairTone:'grey'},'mature')],seen=new Set();
  const pool=candidates.filter(p=>{if(!expandedMatureKeys.has(p.key)||!heritageAllowsPortrait(heritage,p)||seen.has(p.key))return false;seen.add(p.key);return true;});
  return pool.length?pool[hash(seed+':mature-portrait-v40')%pool.length]:null;
}
function modernFamilyForAnchor(anchor,heritage){
  const key=[anchor.key,anchor.ancestry,anchor.presentation,anchor.complexion,anchor.morphology,anchor.furTone,anchor.speciesFamily,anchor.observedHairTone,anchor.hairTone,heritage.id].join(':');
  if(modernFamilyCache.has(key))return modernFamilyCache.get(key);
  // Existing unlinked saves keep their established read-only age bridge.
  let pool=GROUNDED_PORTRAIT_FAMILIES_V39.filter(f=>compatibleFamily(anchor,f,heritage));
  const sameHair=pool.filter(f=>f.hairTone===anchor.hairTone);if(sameHair.length)pool=sameHair;
  const family=pool.length?pool[hash((anchor.key||key)+':grounded-age-family')%pool.length]:null;
  modernFamilyCache.set(key,family);return family;
}
/** Read-only age bridge: the same saved adult anchor always receives the same later-age family. */
export function modernPortraitFamily(appearance,identity=appearance.preset){
  const adultFamily=familiesBySelection.get(appearance.portraitSelections?.adult);
  if(adultFamily?.modern)return adultFamily;
  return modernFamilyForAnchor(portraitPhenotype(appearance,identity),effectiveHeritage(appearance));
}
/** Mortal families and curse sheets have different indexing contracts. */
export function legacyCursePortraitFamily(appearance,{age}={}){
  const heritage=effectiveHeritage(appearance),adultFamily=linkedPortraitFamily(appearance),adultAnchor=portraitPhenotype(appearance);
  const currentFamily=Number.isFinite(age)?linkedPortraitFamily(appearance,{stage:portraitStage(age)}):adultFamily;
  const linked=adultFamily&&!adultFamily.modern&&(!currentFamily||compatibleFamily(adultAnchor,currentFamily,heritage))?adultFamily:currentFamily;
  if(linked&&!linked.modern&&Number.isInteger(linked.half)&&Number.isInteger(linked.localFamilyIndex))return linked;
  const anchor=linked?.modern?portraitPhenotype({...appearance,portraitSelections:{adult:linked.selections.adult}}):adultAnchor;
  let pool=LINKED_PORTRAIT_FAMILIES_V27.filter(f=>compatibleFamily(anchor,f,heritage));
  const sameHair=pool.filter(f=>f.hairTone===anchor.hairTone);if(sameHair.length)pool=sameHair;
  return pool.length?pool[hash((anchor.key||appearance.preset)+':curse-identity')%pool.length]:null;
}
function familySelections(family,appearance,heritage){
  // The anchor depends only on the family's adult face plus the hair tone
  // fallback, so a cheap pre-key avoids recomputing the phenotype for every
  // candidate family on every generated NPC.
  const preKey=[family.id,appearance.hair,heritage.id].join(':');
  const pre=familySelectionPreCache.get(preKey);if(pre)return pre;
  const anchor=portraitPhenotype({...appearance,ancestry:family.ancestry,portraitSelections:{adult:family.selections.adult}}),key=[family.id,anchor.hairTone,heritage.id].join(':');
  if(familySelectionCache.has(key)){const hit=familySelectionCache.get(key);familySelectionPreCache.set(preKey,hit);return hit;}
  const selections={...family.selections};
  for(const stage of youngStages)if(!selections[stage]){
    const pool=lifecyclePool(anchor,stage);if(pool.length)selections[stage]=pool[hash(family.id+':'+stage)%pool.length].key;
  }
  if(!family.modern){const modern=modernFamilyForAnchor(anchor,heritage);if(modern)for(const stage of ['mature','older'])selections[stage]=modern.selections[stage];}
  for(const stage of ['mature','older','elder']){const actual=exactAgeForAdult(anchor,stage,heritage);if(actual)selections[stage]=actual.key;}
  const result=Object.freeze(selections);familySelectionCache.set(key,result);familySelectionPreCache.set(preKey,result);return result;
}
const npcPoolCache=new Map();
function linkedNpcAppearance(appearance,seed,heritage,{archetype,preferHair,modernOnly=false}={}){
  // The eligible family pool depends only on ancestry, presentation, heritage,
  // hair (through familySelections) and the catalog chosen, never on the NPC.
  const poolKey=[modernOnly?'m':'a',appearance.ancestry,appearance.portraitPresentation,heritage.id,appearance.hair].join(':');
  let pool=npcPoolCache.get(poolKey);
  if(!pool){pool=Object.freeze((modernOnly?MODERN_PORTRAIT_FAMILIES:PORTRAIT_FAMILIES).filter(f=>f.ancestry===appearance.ancestry&&f.presentation===appearance.portraitPresentation&&f.compatibleHeritages.includes(heritage.id)
    && PORTRAIT_STAGES.every(stage=>familySelections(f,appearance,heritage)[stage.id])));npcPoolCache.set(poolKey,pool);}
  if(preferHair){const same=pool.filter(f=>f.hairTone===preferHair);if(same.length)pool=same;}
  pool=pool.flatMap(f=>f.modern?[f,f]:[f]).flatMap(f=>f.archetype===archetype?[f,f,f]:[f]);if(!pool.length)return null;
  const family=pool[hash(seed+':linked-family')%pool.length];
  const selections={...familySelections(family,appearance,heritage)};
  // New legacy identities can use the broader mature pool. Persist the result once;
  // a fully painted modern lifecycle and every existing saved choice stay intact.
  if(!family.modern&&!exactAgeForAdult(portraitEntry(family.selections.adult),'mature',heritage)){const mature=expandedMaturePortrait(portraitEntry(family.selections.adult),heritage,seed);if(mature)selections.mature=mature.key;}
  return {...appearance,heritage:heritage.id,heritageVersion:1,hair:family.hairTone==='light'?'gold':family.hairTone==='dark'?'black':appearance.hair,
    ...(family.adultPreset?{preset:family.adultPreset}:{}),portraitSelections:selections};
}
/** A new NPC receives a whole supported lifecycle, saved once with their identity. */
export function coherentNpcAppearance(appearance,seed,{archetype,heritage,preferHair,preferLinked=true}={}){
  const a={...appearance},h=heritageById(heritage||a.heritage,a.ancestry)||effectiveHeritage(a),stages=['infant','child','adolescent','elder'];
  if(preferLinked){const linked=linkedNpcAppearance(a,seed,h,{archetype,preferHair});if(linked)return linked;}
  const adultKey=[a.ancestry,a.portraitPresentation,h.id,lightHair.has(a.hair)?'light':'dark'].join(':');
  let adults=npcAdultCache.get(adultKey);
  if(!adults){adults=PORTRAIT_LIBRARY.filter(p=>p.ancestry===a.ancestry&&p.stage==='adult'&&p.presentation===a.portraitPresentation&&p.hairTone!=='grey'&&heritageAllowsPortrait(h,p)
    && (!['human','elf'].includes(p.ancestry)||p.complexion===h.complexion)
    && (p.ancestry!=='beastfolk'||!['unknown',undefined].includes(p.morphology)&&['dark','light','mixed'].includes(p.furTone))
    && stages.every(stage=>lifecyclePool({...p,hairTone:['dark','light'].includes(p.hairTone)?p.hairTone:lightHair.has(a.hair)?'light':'dark'},stage).length));npcAdultCache.set(adultKey,adults);}
  if(preferHair){const inherited=adults.filter(p=>p.hairTone===preferHair);if(inherited.length)adults=inherited;}
  const calling=adults.filter(p=>p.archetype===archetype);if(calling.length)adults=calling;
  if(!adults.length)return assignHeritage(a,h.id,seed);
  const adult=adults[hash(seed+':adult')%adults.length],anchor={...adult,hairTone:['dark','light'].includes(adult.hairTone)?adult.hairTone:lightHair.has(a.hair)?'light':'dark'};
  a.heritage=h.id;a.heritageVersion=1;a.hair=anchor.hairTone==='light'?'gold':'black';
  if(adult.index>=0)a.preset='p'+String(adult.index).padStart(4,'0');
  a.portraitSelections={adult:adult.key};
  for(const stage of stages){const pool=lifecyclePool(anchor,stage);a.portraitSelections[stage]=pool[hash(seed+':'+stage)%pool.length].key;}
  const modern=modernPortraitFamily(a);if(modern)for(const stage of ['mature','older'])a.portraitSelections[stage]=modern.selections[stage];
  for(const stage of ['mature','older','elder']){const actual=exactAgeForAdult(anchor,stage,h);if(actual)a.portraitSelections[stage]=actual.key;}
  return a;
}
export function selectedPortraitArt(appearance,legacyPreset,{age=27,condition=null}={}) {
  const person={appearance,condition},c=portraitContext(person,age),p=portraitEntry(appearance[c.wolf?'wolfPortraitSelections':'portraitSelections']?.[c.stage]);
  if(p && heritageAllowsPortrait(c.heritage,p))return p;
  if(c.wolf){const original=portraitPreset(legacyPreset,{ancestry:'beastfolk',age,morphology:'canine'});return original;}
  const exact=exactAdultAgePortrait(appearance,legacyPreset,{stage:c.stage});if(exact)return exact;
  const linked=linkedPortraitFamily(appearance,{stage:c.stage});if(linked){const actual=portraitEntry(linked.selections[c.stage]);if(actual&&heritageAllowsPortrait(c.heritage,actual))return actual;}
  if(['mature','older'].includes(c.stage)){
    const family=modernPortraitFamily(appearance,legacyPreset),actual=portraitEntry(family?.selections[c.stage]);if(actual&&heritageAllowsPortrait(c.heritage,actual))return actual;
    return portraitEntry(appearance.portraitSelections?.adult)||originalEntry(appearance,legacyPreset);
  }
  if(c.stage==='adult')return originalEntry(appearance,legacyPreset);
  const anchor=portraitPhenotype(appearance,legacyPreset),pool=lifecyclePool(anchor,c.stage).filter(p=>!expandedLifecycleKeys.has(p.key));
  if(pool.length)return pool[hash(legacyPreset+':'+c.stage)%pool.length];
  // An uncovered legacy cohort retains its actual face rather than changing its ancestry or coat.
  // Newly generated NPCs only use cohorts with a complete lifecycle.
  return portraitEntry(appearance.portraitSelections?.adult)||originalEntry(appearance,legacyPreset);
}
