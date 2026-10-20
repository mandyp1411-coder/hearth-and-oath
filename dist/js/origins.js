import { seededRoll, generatePersonName } from './world.js';
import { PREFERENCE_OPTIONS, normalizePreferences } from './preferences.js';
import { STATIONS, rollStation, rollBirthCircumstances, stationById } from './station.js';

import { agingPolicy } from './aging-policy-v25.js';
// The oldest a life can begin. A people that ages fast cannot enter at
// eighty: an eighty-year-old goblin is a human at a hundred and ten.
export const MAX_START_AGE = 120;
export function maxStartAge(ancestry = 'human') { return Math.min(MAX_START_AGE, agingPolicy({ appearance: { ancestry } }).frail - 10); }
export const ORIGIN_ANCESTRIES = Object.freeze(['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk']);
const freezeOrigin = origin => Object.freeze({...origin,
  ancestries:Object.freeze(origin.ancestries || []),
  birthDescription:origin.birthDescription || origin.description,
  places:Object.freeze(origin.places),families:Object.freeze(origin.families),
  means:Object.freeze(origin.means),pursuits:Object.freeze(origin.pursuits)});

/** An origin describes the household into which a child arrives, not a class,
 * a moral nature, or something the child has already accomplished. Earlier shared origins remain valid in saved lives. New beginnings belong
 * to a particular ancestry; their households leave different histories. */
export const STARTING_ORIGINS = Object.freeze([
  {id:'hearthborn',label:'Hearthborn',sigil:'I',communityName:'Village hearths',description:'Your cradle stands beside an old village fire. Neighbors remember the household before they know your name.',places:['village','brook','forest','marsh'],families:['two_parents','two_parents','single_parent'],means:['poor','poor','tradesfolk','tradesfolk','noble'],pursuits:['grow_play','grow_survival','grow_read']},
  {id:'roadborn',label:'Roadborn',sigil:'II',communityName:'Traveling households',description:'You are born among wagons and borrowed lodgings. The adults who care for you follow the trading roads.',places:['camp','coast','gate'],families:['two_parents','single_parent','homeless'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_play','grow_stealth','grow_survival']},
  {id:'shrine_foundling',label:'Shrine foundling',sigil:'III',communityName:'Shrine keepers',description:'An infant is left at a shrine door. Its keepers become your guardians; no one agrees who brought you.',places:['sanctuary','tower','citadel'],families:['orphan'],means:['poor','poor','tradesfolk'],pursuits:['grow_read','grow_devotion','grow_arcana']},
  {id:'exile',label:'Borderborn',sigil:'IV',communityName:'Displaced households',description:'Your first blanket belongs to a household driven from its home. Your guardians find shelter across an unfamiliar border.',places:['gate','sanctuary','coast','mountain'],families:['single_parent','orphan','homeless','two_parents'],means:['poor','poor','tradesfolk'],pursuits:['grow_survival','grow_defense','grow_family']},
  {id:'fallen_house',label:'Fallen house',sigil:'V',communityName:'A diminished house',description:'You are born under the name of a diminished house. Adults dispute its old debts while someone prepares your cradle.',places:['citadel','city','tower'],families:['single_parent','two_parents','orphan'],means:['poor','tradesfolk','noble'],pursuits:['grow_read','grow_weapons','grow_school']},

  {id:'human_bellward',label:'Bellward child',sigil:'VI',ancestries:['human'],communityName:'Bellward neighbors',description:'The ward bells ring through a bread riot on the night you are born. Your household runs the communal oven; neighbors take turns guarding the door and feeding the queue. You inherit their names in a flour-stained ledger, and a place in a ward that remembers who stayed.',places:['city','citadel','gate'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk','noble'],pursuits:['grow_read','grow_family','grow_play']},
  {id:'human_rivercradle',label:'River cradle',sigil:'VII',ancestries:['human'],communityName:'River households',description:'A flood cuts off the ferry house before your birth. Your carers and the miller share their last dry room until the river falls. The repaired ferry carries a notch for your first crossing; its two households remain part of your family’s story.',places:['brook','marsh','coast'],families:['two_parents','two_parents','single_parent'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_survival','grow_play','grow_family']},
  {id:'elf_rootsong',label:'Rootsong cradle',sigil:'VI',ancestries:['elf'],communityName:'Living-memory gardens',description:'Your birth coincides with the last flowering of an ancient grove. Your guardians save its seeds and plant one beside your cradle. The grove will not return within their lifetime, but the household keeps tending its young trees.',places:['forest','brook','sanctuary'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','noble'],pursuits:['grow_read','grow_survival','grow_family']},
  {id:'elf_inkbough',label:'Inkbough child',sigil:'VII',ancestries:['elf'],communityName:'Elven archive enclaves',description:'You arrive in an elven archive household after its library has burned. Your guardians rent rooms above a bindery and rebuild the collection from books carried out by their neighbors. An unfinished catalogue records your birth between two missing volumes.',places:['tower','city','citadel'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk','noble'],pursuits:['grow_read','grow_arcana','grow_school']},
  {id:'dwarf_deephearth',label:'Deephearth child',sigil:'VI',ancestries:['dwarf'],communityName:'Mountain makers',description:'A failed winter shaft drives your dwarven household out of its lower hall just before you are born. Three families share the upper forge while masons seal the breach. A key to the abandoned rooms hangs above your cradle, kept for a return nobody can promise.',places:['mountain','mountain','citadel','gate'],families:['two_parents','two_parents','single_parent'],means:['poor','tradesfolk','tradesfolk','noble'],pursuits:['grow_family','grow_read','grow_defense']},
  {id:'dwarf_makersward',label:'Maker’s ward',sigil:'VII',ancestries:['dwarf'],communityName:'Dwarven craft households',description:'Your carers belong to a workshop that repairs the hall’s great waterwheel. When its owner closes the workshop, the makers buy their tools together and raise you in the rooms above. Their first shared contract pays for your cradle.',places:['city','gate','tower'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_read','grow_school','grow_family']},
  {id:'halfling_gardenkin',label:'Gardenkin child',sigil:'VI',ancestries:['halfling'],communityName:'Garden households',description:'Blight has emptied the family garden when you are born. Neighbors bring small packets of their own saved seed instead of gifts. Your household replants a different bed for each donor; the garden becomes a living record of the people who helped.',places:['village','brook','forest'],families:['two_parents','two_parents','single_parent'],means:['poor','tradesfolk','noble'],pursuits:['grow_play','grow_family','grow_survival']},
  {id:'halfling_waytable',label:'Waytable child',sigil:'VII',ancestries:['halfling'],communityName:'Traveling supper tables',description:'You are born while your halfling household’s travelling kitchen waits at a closed crossing. Stranded families gather around its tables, trade recipes and build a temporary village. When the road opens, several of those households choose to keep travelling together.',places:['camp','gate','coast'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_family','grow_play','grow_read']},
  {id:'orc_witnesshearth',label:'Witnessed hearth',sigil:'VI',ancestries:['orc'],communityName:'Upland promise-keepers',description:'Your orc household leaves its old hall after a disputed council vote. Friends who disagree about the vote still accompany your carers to witness your naming. You grow up among people learning how to share a hearth without sharing every allegiance.',places:['mountain','gate','village'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','noble'],pursuits:['grow_family','grow_survival','grow_defense']},
  {id:'orc_carvedbowl',label:'Carved-bowl child',sigil:'VII',ancestries:['orc'],communityName:'Orc ward households',description:'Your cradle stands in an orc pottery household within a crowded riverside ward. A kiln collapse destroys the season’s bowls before your first naming meal. Neighboring makers fire the replacements, each adding their mark beside your family’s own.',places:['city','brook','citadel'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_read','grow_family','grow_school']},
  {id:'goblin_patchwork',label:'Patchwork cradle',sigil:'VI',ancestries:['goblin'],communityName:'Workshop neighbors',description:'A workshop fire leaves your goblin household with tools, neighbors and no roof. They build a new home from the undamaged rooms around the yard. Each family repairs a part of your cradle; their different maker’s marks remain visible as you grow.',places:['city','gate','tower'],families:['two_parents','single_parent','orphan'],means:['poor','poor','tradesfolk'],pursuits:['grow_read','grow_play','grow_school']},
  {id:'goblin_crossingnest',label:'Crossing nest',sigil:'VII',ancestries:['goblin'],communityName:'Crossing households',description:'Dredging closes the waterside quarter where your goblin carers planned to settle. You are born in a ferry storehouse while the households rebuild farther up the bank. Your first blanket carries a stitched map of the old lanes and the new ones.',places:['brook','camp','marsh'],families:['two_parents','single_parent','homeless'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_survival','grow_play','grow_stealth']},
  {id:'tiefling_letterhearth',label:'Letter-hearth child',sigil:'VI',ancestries:['tiefling'],communityName:'Letter-bound households',description:'Your tiefling household keeps an inn for relatives scattered across the coast. Word of your birth travels by ship; replies arrive for years, some from people your carers thought lost. A wooden box beside your bed fills with those faraway family stories.',places:['city','coast','tower'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','noble'],pursuits:['grow_read','grow_family','grow_school']},
  {id:'tiefling_lanternward',label:'Lanternward child',sigil:'VII',ancestries:['tiefling'],communityName:'Lantern-festival neighbors',description:'A storm extinguishes the ward’s lantern festival on the night you are born. Your tiefling guardians open their kitchen to stranded revelers, who hang the unlit lanterns indoors. The ward repeats that meal every year, remembering an ordinary act of shelter.',places:['sanctuary','gate','village'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_play','grow_devotion','grow_family']},
  {id:'beastfolk_mooncradle',label:'Moon-path cradle',sigil:'VI',ancestries:['beastfolk'],communityName:'Woodland households',description:'A new timber fence cuts across your beastfolk household’s seasonal path before your birth. Your carers spend the winter with a woodland keeper while negotiating another passage. Your naming walk follows that new route; the old path survives in the stories told at home.',places:['forest','marsh','mountain'],families:['two_parents','single_parent','orphan'],means:['poor','tradesfolk','noble'],pursuits:['grow_survival','grow_play','grow_family']},
  {id:'beastfolk_saltlanding',label:'Salt-landing child',sigil:'VII',ancestries:['beastfolk'],communityName:'Coastal beastfolk households',description:'Your beastfolk carers maintain the boats at a tidal landing. A winter surge takes the old boathouse just before you arrive, so neighboring crews lend their lofts and timber. The rebuilt roof bears a carved mark for each crew and one small mark for you.',places:['coast','brook','camp'],families:['two_parents','single_parent','homeless'],means:['poor','tradesfolk','tradesfolk'],pursuits:['grow_play','grow_survival','grow_read']},

  {"id": "human_tollhouse", "label": "The Empty Tollhouse", "sigil": "III", "ancestries": ["human"], "communityName": "Border road families", "description": "Your human carers move into a disused tollhouse after its garrison departs. Travelers leave news and repairs in exchange for a dry bench. You are born between two borders, in a household whose neighbours arrive by road.", "places": ["gate", "camp"], "families": ["two_parents", "single_parent"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_survival", "grow_family"]},
  {"id": "elf_tidewatch", "label": "Children of the Tidewatch", "sigil": "III", "ancestries": ["elf"], "communityName": "Coastal star keepers", "description": "Your elven household tends a coastal observatory threatened by the rising sea. Your birth is recorded on the last dry lower floor before the instruments move uphill. Tide charts, salvaged lenses and the work of rebuilding surround your earliest years.", "places": ["coast", "tower"], "families": ["two_parents", "orphan"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_read", "grow_arcana"]},
  {"id": "dwarf_bridgeward", "label": "Under the Unfinished Bridge", "sigil": "III", "ancestries": ["dwarf"], "communityName": "Bridgewright households", "description": "Your dwarven carers belong to a bridgewright crew stranded when its patron stops paying. The crew makes a home beneath the unfinished span and takes smaller repairs to survive. You are born there before the first crossing, among makers determined to finish what they began.", "places": ["gate", "brook"], "families": ["single_parent", "two_parents"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_defense", "grow_survival"]},
  {"id": "halfling_seedcellar", "label": "The Borrowed Seed Cellar", "sigil": "III", "ancestries": ["halfling"], "communityName": "Orchard tenants", "description": "A halfling orchard household shelters in a neighbour’s seed cellar after losing its tenancy. You arrive among shelves of carefully labelled fruit stones. Your carers earn a new planting strip together; the first sapling is as young as you.", "places": ["village", "forest"], "families": ["two_parents", "single_parent"], "means": ["poor"], "pursuits": ["grow_family", "grow_survival"]},
  {"id": "orc_stormherd", "label": "The Storm Herd", "sigil": "III", "ancestries": ["orc"], "communityName": "Upland drovers", "description": "An early storm traps your orc household and its herd above the winter road. A shepherd offers a crowded shelter where you are born. Your carers return each year to share the first wool and remember the household that took them in.", "places": ["mountain", "camp"], "families": ["two_parents", "single_parent"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_survival", "grow_weapons"]},
  {"id": "goblin_bellriggers", "label": "The Bellriggers’ Loft", "sigil": "III", "ancestries": ["goblin"], "communityName": "Ropeworkers and riggers", "description": "Your goblin carers repair public bells from a loft above the rope yard. A cracked bell leaves the ward without a warning signal during your first winter. Riggers from rival yards work together to replace it; its first clear peal becomes your household’s birth story.", "places": ["city", "tower"], "families": ["two_parents", "orphan"], "means": ["tradesfolk", "poor"], "pursuits": ["grow_read", "grow_stealth"]},
  {"id": "tiefling_hearthdeed", "label": "A House Without a Deed", "sigil": "III", "ancestries": ["tiefling"], "communityName": "Courtyard households", "description": "Your tiefling carers share an old courtyard house whose deed has gone missing. Instead of leaving, its families bring their rent receipts to court and secure the right to remain. Your birth appears among the witnesses’ household lists, a new name in a home they defended together.", "places": ["city", "citadel"], "families": ["single_parent", "two_parents", "orphan"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_read", "grow_family"]},
  {"id": "beastfolk_winterroof", "label": "The Winter Roof", "sigil": "III", "ancestries": ["beastfolk"], "communityName": "Highland wayfarers", "description": "A beastfolk travelling household takes winter shelter in an empty hillside farm. You are born while its scattered owners return to repair the roof. By spring, the two households have agreed to share its care, giving your family a place to return between journeys.", "places": ["mountain", "village"], "families": ["two_parents", "single_parent"], "means": ["poor", "tradesfolk"], "pursuits": ["grow_survival", "grow_family"]},
].map(freezeOrigin));

export function normalizeStartAge(value, fallback = 18, ancestry = 'human') {
  const n=typeof value==='string'&&value.trim()===''?NaN:Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(maxStartAge(ancestry),Math.round(n))):fallback;
}
export function originById(id) {return STARTING_ORIGINS.find(o=>o.id===id)||null;}
const ancestryOrHuman = value => ORIGIN_ANCESTRIES.includes(value)?value:'human';
export function availableOrigins(ancestry='human') {
  const race=ancestryOrHuman(ancestry);
  return STARTING_ORIGINS.filter(o=>o.ancestries.includes(race));
}
export function originAllowed(id,ancestry='human') {
  if(id==='random')return true;
  const origin=originById(id);
  return Boolean(origin&&(!origin.ancestries.length||origin.ancestries.includes(ancestryOrHuman(ancestry))));
}
/** The stations an origin's story can be laid over, read from the means its
 * households were written with. Every story fits a poor birth. */
export function originStations(origin) {
  const ids=['bound','common'];
  if(origin.means.includes('tradesfolk'))ids.push('trade');
  if(origin.means.includes('noble'))ids.push('gentry','noble','royal');
  return ids;
}
/** Origin is a story hook laid over a station that fate rolls by rarity.
 * Every unchosen circumstance comes from independent seeded rolls. */
export function rollLifeCircumstances(seed, requestedOrigin = 'random', ancestry = 'human', attempt = 0) {
  const worldSeed=typeof seed==='string'&&seed.trim()?seed.trim().slice(0,48):'silver-fern';
  const race=ancestryOrHuman(ancestry),available=availableOrigins(race);
  const requested=originAllowed(requestedOrigin,race)&&originById(requestedOrigin)||null;
  // A chosen story narrows the ladder; an unchosen one is picked to fit the birth.
  const stationId=rollStation(worldSeed,requested?originStations(requested):STATIONS.map(s=>s.id),attempt?`birth:station:${attempt}`:'birth:station');
  const fitting=available.filter(o=>originStations(o).includes(stationId));
  const origin=requested||(fitting.length?fitting:available)[seededRoll(worldSeed,`new-life:origin:${race}`,(fitting.length?fitting:available).length)];
  const pick=(key,values)=>values[seededRoll(worldSeed,`new-life:${origin.id}:${key}`,values.length)];
  const station=rollBirthCircumstances(worldSeed,stationId,race,attempt);
  let familySetup=pick('family',origin.families);
  if(familySetup==='homeless'&&!['bound','common'].includes(stationId))familySetup='single_parent';
  const household=stationById(stationId).means;
  const care={two_parents:'Two parents share your early care.',single_parent:'One present parent takes care of you.',orphan:'Guardians from the community take you in.',homeless:'A shelter guardian cares for you while a lasting home is sought.'}[familySetup];
  return {seed:worldSeed,originId:origin.id,originLabel:origin.label,originDescription:origin.description,station,
    ancestry:race,originAncestries:[...origin.ancestries],originCommunity:origin.communityName,originBirthDescription:`${origin.birthDescription} ${care}`,
    name:generatePersonName(worldSeed,'new-life:name').slice(0,32),
    pronouns:pick('identity',['he/him','she/her','they/them']),
    birthplace:pick('birthplace',origin.places),household,familySetup,
    temperament:pick('temperament',['curious','compassionate','ambitious','cautious','rebellious']),
    belief:pick('belief',['lantern','ancestors','wilds','secular']),difficulty:'balanced',ambition:'Discover who I become',
    preferences:normalizePreferences(Object.fromEntries(PREFERENCE_OPTIONS.map(f=>[f.key,pick(`taste:${f.key}`,f.options).value]))),
  };
}
export function startingAgeDescription(age) {
  const n=normalizeStartAge(age);
  if(n===0)return 'Your first breath. Your household will shape the earliest years.';
  if(n<3)return 'An infant’s face. Familiar voices and the care of your guardians.';
  if(n<10)return 'A child’s face. Play, friendship, and the first years of learning.';
  if(n<16)return 'An adolescent’s face. A growing voice and the beginnings of your own skills.';
  if(n<18)return 'An adolescent’s face. Your own choices, work and travel begin to open.';
  if(n<40)return 'An adult’s face. Your past is drawn by fate; your next choices belong to you.';
  if(n<65)return 'A face weathered by years. Work, old bonds, and remembered losses travel with you.';
  return 'An elder’s face. A lived history behind you, and a future still unwritten.';
}
