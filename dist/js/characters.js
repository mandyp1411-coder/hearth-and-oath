import { normalizeAppearance, PORTRAIT_FIELDS } from './avatar.js';
import { seededRoll } from './world.js';
import { culturalName, defaultNamingIdentity } from './names.js';
import { choosePortraitPreset } from './portrait-catalog.js';
import { assignHeritage, coherentNpcAppearance, effectiveHeritage, portraitPhenotype } from './portrait-library.js';

// Appearance belongs to a person, not a contact slot or an equipment loadout.
// Independent salts keep their likeness stable as the rest of the world advances.
const ARCHETYPES = Object.freeze({
  craft: { label:'craftsperson', hair:['brush','short','tied','braided','shag','tightcurls'], head:['none','none','leathercap','bandana'], detail:['keeps a charcoal tally of every job','collects broken things worth repairing','hums an old work song under their breath','values a promise kept more than a fine title'] },
  field: { label:'field worker', hair:['shag','short','warbraids','tied','ropebraids','curls'], head:['none','none','wool','bandana'], detail:['knows the names of the local winds','keeps seed from every good harvest','reads weather in the movement of birds','has never stopped wanting to see the sea'] },
  scholar: { label:'scholar', hair:['pageboy','forelock','halfknot','shoulder','tonsure','bangs'], head:['none','none','cowl','shortbrim'], detail:['writes questions in the margins of borrowed books','remembers songs better than dates','collects accounts that disagree with the official histories','carries a notebook of unfinished translations'] },
  healer: { label:'healer', hair:['tied','fishtail','braided','pixie','halfknot','short'], head:['none','none','wool','frayedhood'], detail:['keeps pressed leaves between the pages of a ledger','notices who has gone quiet at the table','has a dry wit beneath their careful manner','learned their craft from a traveling household'] },
  watch: { label:'watcher', hair:['brush','undercut','brokenbangs','mohawk','warbraids','short'], head:['none','nasal','sallet','kettle','coif'], detail:['counts exits before choosing a seat','remembers the names of people rescued on bad roads','mends their own straps instead of replacing them','dreams of a peaceful trade after the watch'] },
  wanderer: { label:'wayfarer', hair:['matted','shag','overeye','locs','waves','widow'], head:['none','none','cowl','frayedhood','bandana'], detail:['knows a different name for every crossroads','keeps an old route map folded close','takes the long road for the stories along it','sends home letters whenever a courier can be found'] },
  performer: { label:'storyteller', hair:['browfringe','curls','ropebraids','overeye','heavybangs','fishtail'], head:['none','none','bandana','shortbrim'], detail:['borrows rhythms from unfamiliar accents','saves the last verse for a trusted listener','collects tales that never reach the court','can make a crowded room go quiet'] },
  court: { label:'courtier', hair:['halfknot','crown','widow','forelock','browfringe','fishtail'], head:['none','none','veil'], detail:['remembers every slight and every kindness','keeps one unfashionable family custom','knows how to listen through a formal speech','would trade ceremony for a day beyond the walls'] },
});
function calling(role) {
  if (/guard|soldier|warrior|protector|paladin/i.test(role)) return 'watch';
  if (/heal|herbal|shrine|shelter/i.test(role)) return 'healer';
  if (/teach|tutor|scholar|mage|alchemist|necroman|cartograph/i.test(role)) return 'scholar';
  if (/bard|singer|storytell/i.test(role)) return 'performer';
  if (/noble|court/i.test(role)) return 'court';
  if (/farmer|garden|ferry/i.test(role)) return 'field';
  if (/smith|carpenter|weaver|cook|merchant|innkeep|miner|artisan/i.test(role)) return 'craft';
  return 'wanderer';
}

/** Coherent, seeded adult likeness. Age affects adornments, never moral alignment. */
export function generateCharacter(seed, id, { role='', age=27, pronouns, disposition, ancestry:chosenAncestry, heritage:chosenHeritage, familyAppearance, preferLinkedPortraits=true } = {}) {
  const pick=(key,values)=>values[seededRoll(String(seed),`person:${id}:${key}`,values.length)];
  const ancestry=chosenAncestry || familyAppearance?.ancestry || pick('ancestry',['human','human','human','human','human','elf','elf','dwarf','dwarf','halfling','halfling','orc','orc','goblin','tiefling','beastfolk']);
  const identity=pronouns || pick('pronouns',['he/him','she/her','they/them','he/him','she/her']);
  const archetype=role?calling(role):pick('archetype',Object.keys(ARCHETYPES)), profile=ARCHETYPES[archetype], adult=age>=18;
  const skins={orc:['moss','slate','bronze','brown'],goblin:['moss','slate','russet'],tiefling:['russet','lavender','slate','deep'],beastfolk:['fair','bronze','brown','slate']};
  const inherited=familyAppearance ? normalizeAppearance(familyAppearance) : null;
  const heritage=chosenHeritage || (inherited?effectiveHeritage(inherited).id:null) || defaultNamingIdentity(seed,id).heritage;
  const portraitPresentation=({ 'he/him':'masculine', 'she/her':'feminine', 'they/them':'androgynous' })[identity] || 'androgynous';
  const skin=inherited?.skin || pick('skin',skins[ancestry] || ['porcelain','fair','warm','bronze','brown','deep']);
  const hair=age>=60 ? pick('hair',['silver','white','silver','chestnut']) : inherited && seededRoll(seed,`person:${id}:inherited-hair`,3) ? inherited.hair : pick('hair',['black','chestnut','chocolate','gold','honey','copper','red',...(ancestry==='elf'?['silver','white']:ancestry==='tiefling'?['plum']:[])]);
  const eyes=inherited && seededRoll(seed,`person:${id}:inherited-eyes`,3) ? inherited.eyes : pick('eyes',ancestry==='tiefling'?['amber','violet','grey','ruby']:['hazel','brown','green','blue','grey','amber']);
  const headgear=adult && !inherited ? pick('headgear',profile.head) : 'none';
  let appearance=normalizeAppearance({ancestry,heritage,portraitPresentation,skin,hair,eyes,
    preset:choosePortraitPreset(`${seed}:person:${id}`,{presentation:portraitPresentation,archetype}),
    portraitFace:identity==='she/her'?pick('face',['fine','fine','soft','gaunt']):identity==='he/him'?pick('face',['rugged','rugged','gaunt','soft']):pick('face',['soft','fine','rugged','gaunt']),
    faceVariant:pick('likeness',['first','second','third']),face:age>=55?'lined':pick('features',['soft','angular','round','freckled']),
    hairStyle:pick('hairstyle',profile.hair),facialHair:adult && identity!=='she/her' ? pick('beard',['none','none','stubble','short','mustache',...(ancestry==='dwarf'?['long','forked','braided']:[])]) : 'none',
    headgear,facewear:adult&&!inherited&&['wanderer','scholar'].includes(archetype)?pick('mask',['none','none','none','none','none',archetype==='scholar'?'runewrap':'scarf']):'none',coverColor:pick('cloth',['weathered','weathered','ash','ochre','moss','wine']),
    accessory:adult?pick('accessory',archetype==='scholar'?['none','glasses','glasses','earcuff']:archetype==='court'?['none','circlet','earring']:['none','none','none','earring','earcuff']):'none',
    scar:adult && !inherited?pick('scar',['none','none','none','none',...(archetype==='watch'?['brow','cheek','nose']:['brow'])]):'none',
    tattoo:adult && !inherited?pick('mark',['none','none','none','none','none',archetype==='scholar'?'sigil':'leaf']):'none'});
  appearance=normalizeAppearance(coherentNpcAppearance(appearance,`${seed}:person:${id}`,{archetype,heritage,preferHair:inherited?portraitPhenotype(inherited).hairTone:null,preferLinked:preferLinkedPortraits}));
  const naming=culturalName(seed,id,{appearance,pronouns:identity});
  return {name:naming.name,naming,pronouns:identity,disposition:disposition || pick('manner',['kind','driven','reserved','bold']),appearance,
    character:{version:1,archetype,detail:pick('detail',profile.detail)}};
}

/** Used by the creator's two rolls. Inventory-era appearance fields are retained. */
export function randomizePortrait(value, { seed, id='portrait', pronouns, locked=[] } = {}) {
  const before=normalizeAppearance(value), locks=new Set(locked), chosen=generateCharacter(seed,id,{pronouns,age:27,ancestry:locks.has('ancestry')?before.ancestry:undefined,heritage:locks.has('heritage')?before.heritage:undefined}).appearance;
  return normalizeAppearance({...before,...Object.fromEntries(PORTRAIT_FIELDS.map(key=>[key,locks.has(key)?before[key]:chosen[key]]))});
}

export function characterDetail(person) {
  return typeof person?.character?.detail==='string' ? person.character.detail.slice(0,160) : '';
}
