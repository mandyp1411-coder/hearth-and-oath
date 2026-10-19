import { transformationPortrait } from './curse-portraits.js';
import { presetIndex, portraitStage } from './portrait-catalog.js';
import { selectedPortraitArt, validPortraitSelections, portraitEntry, portraitIdentity } from './portrait-library.js';
import { HERITAGE_IDS, heritageById, heritageAllowsPortrait } from './heritages.js';
// A portrait is expression, never a statistic. This module is deliberately DOM free.
const options = (entries) => entries.map(([value, label]) => Object.freeze({ value, label }));
export const AVATAR_OPTIONS = Object.freeze([
  { key: 'ancestry', label: 'Ancestry', options: options([['human', 'Human'], ['elf', 'Elf'], ['dwarf', 'Dwarf'], ['halfling', 'Halfling'], ['orc', 'Orc'], ['goblin', 'Goblin'], ['tiefling', 'Tiefling'], ['beastfolk', 'Beastfolk']]) },
  { key: 'preset', label: 'Complete portrait', options: options([['legacy', 'Saved identity'], ...Array.from({length:1024},(_,index)=>['p'+String(index).padStart(4,'0'), 'Portrait '+(index+1)])]) },
  { key: 'heritage', label: 'Heritage', options: options(HERITAGE_IDS.map(id=>[id,id.replaceAll('_',' ')])) },
  { key: 'portraitPresentation', label: 'Portrait presentation', options: options([['masculine', 'Masculine'], ['feminine', 'Feminine'], ['androgynous', 'Androgynous']]) },
  { key: 'skin', label: 'Skin tone', options: options([['porcelain', 'Porcelain'], ['fair', 'Fair'], ['warm', 'Warm'], ['bronze', 'Bronze'], ['brown', 'Brown'], ['deep', 'Deep'], ['moss', 'Moss green'], ['slate', 'Slate'], ['russet', 'Russet'], ['lavender', 'Lavender']]) },
  { key: 'hair', label: 'Hair color', options: options([['chestnut', 'Chestnut'], ['black', 'Black'], ['gold', 'Golden'], ['silver', 'Silver'], ['red', 'Auburn'], ['white', 'White'], ['teal', 'Sea green'], ['chocolate', 'Dark chocolate'], ['honey', 'Honey'], ['copper', 'Copper'], ['plum', 'Plum'], ['blue', 'Blue-black'], ['rose', 'Dusty rose'], ['moss', 'Moss']]) },
  { key: 'hairStyle', label: 'Hairstyle', options: options([['short', 'Rugged short cut'], ['shoulder', 'Tangled shoulder cut'], ['tied', 'Tied back'], ['curls', 'Unruly curls'], ['braided', 'Twin braids'], ['shaved', 'Close cropped'], ['long', 'Long & flowing'], ['pixie', 'Chopped crop'], ['undercut', 'Side undercut'], ['topknot', 'High bun'], ['locs', 'Locs'], ['afro', 'Rounded coils'], ['crown', 'Braided crown'], ['waves', 'Rough side part'], ['bangs', 'Jagged bangs'], ['blunt', 'Uneven blunt fringe'], ['heavybangs', 'Long with heavy bangs'], ['brush', 'Uneven brush crop'], ['browfringe', 'Heavy brow fringe'], ['brokenbangs', 'Broken bangs & shaved side'], ['forelock', 'Wavy forelock'], ['widow', 'Long widow’s peak'], ['matted', 'Wild matted locks'], ['ropebraids', 'Double rope braids'], ['fishtail', 'Fishtail braid'], ['shag', 'Windswept shag'], ['tonsure', 'Monastic tonsure'], ['tightcurls', 'Short tight curls'], ['halfknot', 'Half knot & fringe'], ['mohawk', 'Rugged mohawk'], ['overeye', 'Locks across one eye'], ['pageboy', 'Ragged pageboy'], ['warbraids', 'Long war braids']]) },
  { key: 'eyes', label: 'Eye color', options: options([['hazel', 'Hazel'], ['brown', 'Brown'], ['green', 'Green'], ['blue', 'Blue'], ['grey', 'Grey'], ['violet', 'Violet'], ['amber', 'Amber'], ['ice', 'Ice blue'], ['ruby', 'Ruby']]) },
  { key: 'face', label: 'Facial features', options: options([['soft', 'Soft'], ['angular', 'Angular'], ['round', 'Round'], ['lined', 'Weathered'], ['bearded', 'Bearded'], ['freckled', 'Freckled']]) },
  { key: 'build', label: 'Build', options: options([['average', 'Average'], ['slender', 'Slender'], ['broad', 'Broad'], ['sturdy', 'Sturdy']]) },
  { key: 'outfit', label: 'Clothing', options: options([['travel', 'Wayfarer’s tunic'], ['scholar', 'Scholar’s robes'], ['plate', 'Knight’s armor'], ['hooded', 'Hood & cloak'], ['work', 'Artisan’s apron'], ['noble', 'Court finery'], ['leather', 'Scout’s leathers'], ['ritual', 'Grovekeeper’s mantle']]) },
  { key: 'outfitColor', label: 'Clothing color', options: options([['forest', 'Forest'], ['wine', 'Wine'], ['midnight', 'Midnight'], ['amber', 'Ochre'], ['plum', 'Plum'], ['ivory', 'Ivory'], ['cobalt', 'Cobalt'], ['rust', 'Rust'], ['charcoal', 'Charcoal'], ['heather', 'Heather']]) },
  { key: 'accessory', label: 'Accessory', options: options([['none', 'None'], ['circlet', 'Bronze circlet'], ['glasses', 'Round spectacles'], ['earring', 'Silver earring'], ['amulet', 'Lantern amulet'], ['flower', 'Wildflower'], ['feather', 'Raven feather'], ['eyepatch', 'Leather eyepatch'], ['ribbon', 'Silk ribbon'], ['earcuff', 'Bronze ear cuff']]) },
  { key: 'scar', label: 'Scars & weathering', options: options([['none', 'Unmarked'], ['brow', 'Across the brow'], ['cheek', 'On the cheek'], ['nose', 'Across the nose'], ['lip', 'At the lip'], ['burn', 'Ash-scarred'], ['ritual', 'Ritual incisions']]) },
  { key: 'tattoo', label: 'Ink & markings', options: options([['none', 'Unmarked'], ['stars', 'Three stars'], ['leaf', 'Fern leaf'], ['sigil', 'Arcane sigil'], ['waves', 'River waves'], ['sun', 'Little sun'], ['ash', 'Ash-black eyes'], ['thorns', 'Thorn scripture']]) },
  { key: 'headgear', label: 'Headwear', options: options([['none', 'Bare face'], ['iron', 'Closed iron helm'], ['bone', 'Bone votive mask'], ['veil', 'Mourning veil'], ['blindfold', 'Linen blindfold'], ['cowl', 'Deep pilgrim cowl'], ['kettle', 'Battered kettle helm'], ['coif', 'Worn mail coif'], ['plague', 'Leather beak mask'], ['scarf', 'Lower-face wrap'], ['wool', 'Wool hood'], ['antlers', 'Bramble headdress'], ['witch', 'Crooked broad-brim hat'], ['wood', 'Carved wooden mask'], ['bonehood', 'Bone-trimmed hood'], ['sallet', 'Battered open sallet'], ['nasal', 'Open nasal helm'], ['bascinet', 'Pointed bascinet'], ['visor', 'Closed knight visor'], ['leathercap', 'Stitched leather cap'], ['shortbrim', 'Low wizard hat'], ['chainveil', 'Chainmail face veil'], ['frayedhood', 'Frayed pilgrim hood'], ['bandana', 'Ragged bandana'], ['hornedhelm', 'Horned iron helm'], ['wicker', 'Wicker cage hood']]) },
  { key: 'portraitFace', label: 'Face shape', options: options([['auto', 'Natural likeness'], ['rugged', 'Broad & rugged'], ['fine', 'Fine-boned'], ['soft', 'Soft & reserved'], ['gaunt', 'Hollow & gaunt']]) },
  { key: 'faceVariant', label: 'Likeness', options: options([['first', 'Likeness I'], ['second', 'Likeness II'], ['third', 'Likeness III']]) },
  { key: 'facewear', label: 'Mask or face wrap', options: options([['none', 'No mask'], ['bone', 'Bone votive mask'], ['wood', 'Carved wooden mask'], ['plague', 'Leather beak mask'], ['scarf', 'Lower-face wrap'], ['blindfold', 'Linen blindfold'], ['veil', 'Mourning veil'], ['coppermask', 'Copper death mask'], ['runewrap', 'Rune blindfold'], ['ravenmask', 'Raven skull mask'], ['mothveil', 'Moth-eaten funeral veil'], ['halfmask', 'Iron half mask']]) },
  { key: 'coverColor', label: 'Headwear patina', options: options([['weathered', 'Weathered iron & linen'], ['ash', 'Ash black'], ['bone', 'Pale bone'], ['ochre', 'Old ochre'], ['wine', 'Faded wine'], ['moss', 'Moss green'], ['indigo', 'Dull indigo']]) },
  { key: 'facialHair', label: 'Facial hair', options: options([['none', 'Clean shaven'], ['short', 'Rough beard'], ['long', 'Tangled long beard'], ['forked', 'Forked beard'], ['braided', 'Braided beard'], ['stubble', 'Coarse stubble'], ['goatee', 'Pointed goatee'], ['mustache', 'Heavy moustache'], ['drooping', 'Drooping moustache']]) },
  { key: 'stature', label: 'Bearing', options: options([['balanced', 'Quiet resolve'], ['towering', 'Tall & austere'], ['stooped', 'Bent by the road'], ['compact', 'Low & grounded']]) },
  { key: 'relic', label: 'Portrait token', options: options([['none', 'Empty hands'], ['lantern', 'Iron lantern'], ['sword', 'Notched sword'], ['staff', 'Crooked staff'], ['book', 'Chained folio'], ['bell', 'Burial bell'], ['rosary', 'Bone prayer beads']]) },
  { key: 'mantle', label: 'Mantle', options: options([['none', 'No mantle'], ['ragged', 'Ragged traveler’s cloak'], ['fur', 'Moth-eaten fur'], ['shroud', 'Funeral shroud'], ['feathers', 'Raven-feather mantle']]) },
].map((field) => Object.freeze({ ...field, options: Object.freeze(field.options) })));

export const DEFAULT_APPEARANCE = Object.freeze({
  ancestry: 'human', preset: 'legacy', heritage: 'sunlands', portraitPresentation: 'androgynous', skin: 'warm', hair: 'chestnut', hairStyle: 'tied', eyes: 'hazel',
  face: 'soft', build: 'average', outfit: 'travel', outfitColor: 'forest', accessory: 'none', scar: 'none', tattoo: 'none',
  headgear: 'none', portraitFace: 'auto', faceVariant: 'first', facewear: 'none', coverColor: 'weathered', facialHair: 'none', stature: 'balanced', relic: 'none', mantle: 'none',
});
const ALIASES = {
  ancestry: { halfing: 'halfling', elven: 'elf', dwarven: 'dwarf' },
  skin: { 'warm brown': 'warm', pale: 'porcelain', light: 'fair', dark: 'deep', '#edc6a2': 'fair', '#c68f62': 'warm', '#946343': 'brown', '#573e32': 'deep' },
  hair: { 'dark, loosely tied': 'black', dark: 'black', 'dark brown': 'chestnut', brown: 'chestnut', golden: 'gold', blond: 'gold', blonde: 'gold', auburn: 'red', gray: 'silver', grey: 'silver', '#624231': 'chestnut', '#252b28': 'black', '#bf914f': 'gold', '#c5c3b9': 'silver', '#994b32': 'red' },
  hairStyle: { long: 'shoulder', 'shoulder length': 'shoulder', ponytail: 'tied', 'tied back': 'tied', curly: 'curls', braids: 'braided', bald: 'shaved' },
  eyes: { gray: 'grey' }, face: { oval: 'soft', weathered: 'lined', beard: 'bearded' },
  build: { medium: 'average', slim: 'slender', muscular: 'broad' },
  outfit: { tunic: 'travel', robes: 'scholar', robe: 'scholar', armor: 'plate', armour: 'plate', hood: 'hooded', workclothes: 'work', 'work clothes': 'work', apron: 'work', court: 'noble' },
  outfitColor: { green: 'forest', red: 'wine', blue: 'midnight', gold: 'amber', purple: 'plum', white: 'ivory' },
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cleanString = (value) => typeof value === 'string' ? value.trim().slice(0, 100).toLowerCase() : '';
const validChoice=(field,value)=>field.key==='preset'?value==='legacy'||presetIndex(value)!==null:field.options.some(option=>option.value===value);

/** Return a fresh, allowlisted appearance from old free text or current settings. */
export function normalizeAppearance(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const field of AVATAR_OPTIONS) {
    const supplied = cleanString(source[field.key]);
    const canonical = validChoice(field,supplied) ? supplied : ALIASES[field.key]?.[supplied] || supplied;
    result[field.key] = validChoice(field,canonical) ? canonical : DEFAULT_APPEARANCE[field.key];
  }
  if (!source.hairStyle && /tied/i.test(typeof source.hair === 'string' ? source.hair : '')) result.hairStyle = 'tied';
  if(!source.heritage)result.heritage=['brown','deep'].includes(result.skin)?'sable_coast':['warm','bronze','russet'].includes(result.skin)?'sunlands':'ashlands';
  if(!source.portraitPresentation)result.portraitPresentation=result.portraitFace==='fine'?'feminine':result.portraitFace==='rugged'?'masculine':'androgynous';
  if(source.heritageVersion===1 && heritageById(result.heritage,result.ancestry))result.heritageVersion=1;
  for(const key of ['portraitSelections','wolfPortraitSelections']){
    if(validPortraitSelections(source[key],result.ancestry,{wolf:key==='wolfPortraitSelections'})){
      const h=heritageById(result.heritage,result.ancestry);
      result[key]=Object.fromEntries(Object.entries(source[key]).filter(([,id])=>key==='wolfPortraitSelections'||result.heritageVersion!==1||heritageAllowsPortrait(h,portraitEntry(id))));
    }
  }
  return result;
}

/** Old saves keep their canonical original choices; new expression fields are additive. */
export function isCanonicalAppearance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const optional = new Set(['headgear', 'stature', 'relic', 'mantle', 'portraitFace', 'facialHair', 'faceVariant', 'facewear', 'coverColor','heritage','portraitPresentation','preset']);
  const extras=['heritageVersion','portraitSelections','wolfPortraitSelections'];
  if (Object.keys(value).some(key => !extras.includes(key) && !AVATAR_OPTIONS.some(field => field.key === key))) return false;
  if(!AVATAR_OPTIONS.every(field => optional.has(field.key) && !Object.hasOwn(value, field.key)
    || typeof value[field.key] === 'string' && validChoice(field,value[field.key])))return false;
  const h=heritageById(value.heritage,value.ancestry);
  if(Object.hasOwn(value,'heritageVersion') && (value.heritageVersion!==1||!h))return false;
  for(const key of ['portraitSelections','wolfPortraitSelections'])if(Object.hasOwn(value,key)){
    if(!validPortraitSelections(value[key],value.ancestry,{wolf:key==='wolfPortraitSelections'}))return false;
    if(!Object.values(value[key]).every(id=>key==='wolfPortraitSelections'||value.heritageVersion===1&&heritageAllowsPortrait(h,portraitEntry(id))))return false;
  }
  return true;
}

// Legacy appearance values remain in the save allowlist, but are never composited.
// Every current portrait is one complete illustration, including all hair and dress.
export const PORTRAIT_FIELDS=Object.freeze(['ancestry','portraitPresentation','preset']);
const presentationFor=pronouns=>pronouns==='he/him'?'masculine':pronouns==='she/her'?'feminine':'androgynous';
function portraitAppearance(person){
  const source=person?.appearance??person;
  const a=normalizeAppearance(source);
  if(!source?.portraitPresentation&&person?.pronouns)a.portraitPresentation=presentationFor(person.pronouns);
  return a;
}
function identityPreset(person,a){
  return portraitIdentity(person??{},a);
}
export function portraitOptions(key,value,age=27){return AVATAR_OPTIONS.find(field=>field.key===key)?.options??[];}
export function portraitLockReason(){return '';}
export function appearanceAtAge(value){return normalizeAppearance(value);}
// Retained as inert compatibility exports for old integrations; the game has no part editor.
export function portraitControl(){return '';}
export function appearanceFields(){return '';}
export function appearanceFromForm(formData,{prefix='',previous=null}={}){
  const read=key=>(typeof formData?.get==='function'?formData.get(prefix+key):formData?.[prefix+key])??previous?.[key];
  return normalizeAppearance(Object.fromEntries(AVATAR_OPTIONS.map(field=>[field.key,read(field.key)])));
}
export function describeAppearance(person={}){
  const a=portraitAppearance(person),years=Number.isFinite(person?.age)?person.age:27;
  const stage=portraitStage(years),wolf=['lycanthrope','werewolf'].includes(person?.condition?.type);
  const likeness=portraitEntry(a[wolf?'wolfPortraitSelections':'portraitSelections']?.[stage])?.presentation||a.portraitPresentation;
  let description=a.ancestry+', '+stage+', '+likeness+' portrait';
  if(person?.condition?.type==='vampire')description+='; vampire';
  if(['lycanthrope','werewolf'].includes(person?.condition?.type))description+='; wolf-touched';
  return description;
}
export function portraitLayers(person={}, {age}={}){
  const a=portraitAppearance(person);
  const years=Number.isFinite(age)?Math.max(0,age):Number.isFinite(person?.age)?Math.max(0,person.age):27;
  const condition=person?.condition?.type==='vampire'?'vampire':['lycanthrope','werewolf'].includes(person?.condition?.type)?'lycanthrope':'mortal';
  const artAncestry=condition==='lycanthrope'?'beastfolk':a.ancestry;
  const transformed=transformationPortrait(person,a,years);
  const normalCondition=person?.condition?.curseVersion===1&&person.condition.type==='lycanthrope'&&person.condition.form==='human'?null:person?.condition;
  const preset=transformed||selectedPortraitArt(a,identityPreset(person,a),{age:years,condition:normalCondition});
  return {appearance:a,years,condition,artAncestry,preset,frame:preset.cell,base:preset.index,baseAtlas:preset.stage,plates:{face:preset.src},hair:null,beard:null,cover:null,mask:null,accessory:null,skinFilter:'none',hairFilter:'none',closed:false};
}
/** Public source geometry used by both the renderer and native artwork QA. */
export function portraitComponents(person={},options={}){
  const p=portraitLayers(person,options);
  return [{kind:'preset',cell:p.preset.cell,src:p.preset.src,columns:p.preset.columns||8,rows:p.preset.rows||8,sourceRect:p.preset.sourceRect,fit:[1,1,0,0],clips:[]}];
}
export function renderAvatar(person={}, {size='small',age}={}){
  const p=portraitLayers(person,{age}),r=p.preset.sourceRect;
  const cropWidth=p.preset.width*r.width/100,cropHeight=p.preset.height*r.height/100,extent=Math.max(cropWidth,cropHeight);
  const windowStyle=`left:${(extent-cropWidth)*50/extent}%;top:${(extent-cropHeight)*50/extent}%;width:${cropWidth*100/extent}%;height:${cropHeight*100/extent}%;`;
  const sizeClass=['small','large','hero'].includes(size)?size:'small';
  const description=(typeof person?.name==='string'&&person.name?person.name.slice(0,80)+': ':'')+describeAppearance({...person,appearance:p.appearance,age:p.years});
  const image=`<img class="preset-portrait-img" src="${p.preset.src}" alt="" width="${p.preset.width}" height="${p.preset.height}" decoding="async" draggable="false" style="width:${10000/r.width}%;height:${10000/r.height}%;left:${-r.x*100/r.width}%;top:${-r.y*100/r.height}%;">`;
  return `<div class="fantasy-avatar size-${sizeClass}"><div class="raster-portrait preset-portrait ancestry-${p.appearance.ancestry} art-ancestry-${p.artAncestry} condition-${p.condition} stage-${p.preset.stage}" role="img" aria-label="${escapeHTML(description)}" data-age="${Math.floor(p.years)}" data-ancestry="${p.appearance.ancestry}" data-presentation="${p.preset.presentation}" data-preset="${p.preset.id}"><div class="preset-window" style="${windowStyle}" aria-hidden="true">${image}</div></div></div>`;
}
export function renderEffigy(person={},options={}){return renderAvatar(person,{...options,size:options.size||'hero'});}
