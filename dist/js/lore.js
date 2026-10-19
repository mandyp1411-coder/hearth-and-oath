import { regionalCulture } from './regional-content-v33.js';
import { markSiteKnowledge } from './cartography.js';
import { generatePersonName } from './world.js';
import { seededRoll, worldCalendarContext } from './world.js';
import { effectiveHeritage } from './portrait-library.js';

/** Ancestry supplies cultural possibilities, never requirements or a worth score. */
export const ANCESTRY_LORE = [
  { id: 'human', name: 'Human', summary: 'Human households have settled along the region’s roads for generations. Their short family accounts sit beside borrowed customs and friendships that cross ancestry.', customs: 'Some households keep a hearth ledger of promises; others mark coming of age with a journey, a first commission, or a meal shared with their neighbors. You choose which traditions matter to you.', origin: 'River villages, city wards, and the caravans that connect them all hold human communities.' },
  { id: 'elf', name: 'Elf', summary: 'Elven families preserve living histories through songs, gardens, and carefully witnessed recollections. Their communities disagree about how much an old promise should bind a new life.', customs: 'A name may be planted with a tree, and a guest may offer a new verse rather than a gift. Gardeners, scholars, and traveling singers carry their families’ memories in different ways.', origin: 'Old woodland settlements and scholarly city enclaves both sustain elven traditions.' },
  { id: 'dwarf', name: 'Dwarf', summary: 'Dwarven communities remember the people who made a thing, not only its owner. A repaired tool can carry the story of several households and a debt that has already been repaid.', customs: 'Some families stamp a maker’s witness beside a finished work and keep damaged objects for repair. Others honor kin through shared songs, painted records, or a feast at the first winter snow.', origin: 'Mountain halls, quarry communities, and the city’s craft wards are familiar dwarven homes.' },
  { id: 'halfling', name: 'Halfling', summary: 'Halfling families have long made homes beside busy crossings. Their histories preserve small acts of hospitality that official chronicles often forget.', customs: 'A spare place at supper, a seed saved for a neighbor, or a story told while mending can mark belonging. Traveling households carry these practices with them; settled families may keep very different ones.', origin: 'Riverside gardens, village lanes, and traveling households form overlapping halfling communities.' },
  { id: 'orc', name: 'Orc', summary: 'Orc communities include upland wardens, farmers, scholars, and city artisans. Their public histories often ask who was protected by a promise, and who was excluded from it.', customs: 'Some households renew promises aloud before witnesses and welcome disagreement at the same table. Others keep private family marks, passing their stories through a carved bowl or an evening song.', origin: 'Upland settlements, border roads, and established city neighborhoods all hold orc households.' },
  { id: 'goblin', name: 'Goblin', summary: 'Goblin families have built communities wherever overlooked spaces can become useful homes. Their records preserve ingenious repairs and the names of neighbors who made room for them.', customs: 'A first successful repair may be celebrated as warmly as an examination. Some families exchange small handmade tokens when moving house; others prefer songs, food, or a plain spoken welcome.', origin: 'Market wards, hillside workshops, river crossings, and caravans support diverse goblin communities.' },
  { id: 'tiefling', name: 'Tiefling', summary: 'Tiefling families trace their histories through many lands and beliefs. In the city, horned physicians, porters, poets, and watch-keepers each carry a different household story.', customs: 'Some families celebrate a chosen name or preserve letters from distant kin. Others join their neighbors’ lantern festivals, adding a family dish or a verse carried from another home.', origin: 'Scattered households and longstanding city communities connect through letters, visits, and shared festivals.' },
  { id: 'beastfolk', name: 'Beastfolk', summary: 'Beastfolk communities include woodland stewards, city residents, and coastal travelers. Their histories follow the paths of particular households: a potter’s city stall, a fisher’s landing, a garden beneath the trees.', customs: 'Some households read the season through a shared walk and tell stories at the first changing moon. Others mark important days with bells, crafts, or a family meal.', origin: 'Woodland paths, coastal communities, and mixed settlements sustain many beastfolk traditions.' },
];

const CULTURES = [
  {id:'saltwitness',name:'The Salt Witnesses',description:'Harbor households preserve wreck accounts beside trade contracts. A captain’s reputation depends on naming the crew who paid for a prosperous voyage.',customs:'A ship’s bell is sounded once for the living and once for those who did not return. A guest may decline the remembrance without explaining their loss.'},
  {id:'stonekin',name:'The Stonekin Assembly',description:'Quarry workers and upland households keep a communal rescue fund. Masters argue over who bears the cost when an apprentice refuses an unsafe shift.',customs:'Tools are checked in public before the winter shifts. A repaired handle bears the mark of both its first maker and the person who saved it.'},
  {id:'reedwritten',name:'The Reedwritten Councils',description:'Boardwalk settlements keep public records on oilcloth because floodwater has carried away too many private ledgers. A witnessed copy belongs to the whole settlement.',customs:'A gathering begins by checking the safe walkways. The youngest reader names a repair the elders overlooked.'},
  {id:'cinderkeepers',name:'The Cinderkeepers',description:'Households near the old ash plain measure wealth by stores that survive a bad season. Shared wells are protected by agreements that noble titles cannot purchase.',customs:'At the first rain, neighbors clean the public cistern together. An empty cup placed on a doorstep asks for help without requiring a public account of the hardship.'},
  {id:'bellmakers',name:'The Bellmakers’ Accord',description:'Watch towns rely on makers who can read metal, weather, and public promises. A silent warning bell is treated as a failure of its patrons as well as its smith.',customs:'A commission’s first test is open to every worker who helped make it. Failed work is recorded beside the repair rather than hidden under a polished dedication.'},
  {id:'inkbound',name:'The Inkbound Houses',description:'Bookbinders, traveling tutors, and letter carriers keep knowledge moving between isolated hearths. Their disputes concern which accounts deserve a name and whose privacy the page must protect.',customs:'A child’s first written question is kept beside an elder’s last unanswered one. An inherited book can be freely lent, but its owner’s private notes remain their own.'},

  { id: 'hearthward', name: 'The Hearthward Tradition', description: 'The region measures a settlement by the welcome it can offer in a hard season. Hearth-keepers disagree with councils over who should pay for that welcome.', customs: 'A lantern at a doorway offers shelter for one night. An open hearth is a promise of hospitality, not permission to enter without asking.' },
  { id: 'riverbound', name: 'The Riverbound Communities', description: 'Ferry families and upstream growers depend on one another. Their oldest disputes concern shared water, and whose testimony is heard when a repair fails.', customs: 'At river gatherings, the upstream household speaks first and the downstream household gives the closing account. A painted stone remembers a crossing that someone kept safe.' },
  { id: 'craftsworn', name: 'The Maker’s Compact', description: 'Independent makers helped keep the region alive when wealthy guilds closed their doors. Their descendants still debate the price of knowledge and the duties of a master.', customs: 'A repaired tool bears both makers’ marks. Apprentices present a useful work in public, and may explain what they would do differently.' },
  { id: 'grovekeeping', name: 'The Common Grove', description: 'Villages preserve a shared woodland alongside private fields. Council disputes turn on who may gather, who restores what is taken, and how a custom becomes a written right.', customs: 'Gatherers leave a handful of seed for the next season. A grove meeting begins with the names of people who maintained its paths.' },
  { id: 'starwise', name: 'The Lantern Scholars', description: 'Traveling teachers carried lessons between rural hearths and the city. Their work survives in public schools, observatories, and a persistent argument over who can afford an education.', customs: 'An unanswered question is written beside a festival lantern. Teachers keep an empty seat for a returning student, without pretending that every journey went well.' },
  { id: 'wayfarer', name: 'The Roadside Fellowship', description: 'Caravan households joined settled neighbors to keep the roads open. Their shared records include many people whom a family tree or noble register would leave out.', customs: 'A traveler contributes a story or a useful task before joining the evening meal. A route token records the household that offered shelter, not ownership of the road.' },
];
const TRADITIONS = [
  {id:'storm_names',name:'The Names Before the Storm',text:'Harbor families read the names of missing ships, then decide what rescue stores to share before the next storm. Naming the missing creates no claim over their descendants.'},
  {id:'second_maker',name:'The Second Maker’s Day',text:'Neighbors bring a broken object to a public repair table. A successful repair earns a second maker’s mark, and an apprentice may explain why a cherished object cannot safely be mended.'},
  {id:'seed_ledger',name:'The Ledger of Seeds',text:'Each household lends a small seed packet and records what flourished. A failed garden is discussed as a shared problem, never a measure of the household’s worth.'},
  {id:'winter_letters',name:'The Winter Letters',text:'Before the roads close, teachers help neighbors write to distant kin. Chosen family and estranged relatives are given space beside the names on formal household registers.'},
  {id:'quiet_bell',name:'The Night of the Quiet Bell',text:'The watch keeps one evening silent so people can hear the river, the wind, and one another. A warning can still break the silence; a tradition must not hide a danger.'},
  {id:'unclaimed_place',name:'The Unclaimed Place',text:'A public meal keeps seats for newcomers without asking whom they served before arriving. Hosts state the welcome and its limits before any promise is made.'},

  { id: 'returning_lights', name: 'The Returning Lights', text: 'Families place a lantern for someone absent, then tell an account of a welcome they received. Some lights await a traveler; others remember an estranged friend or a person who has died.' },
  { id: 'named_places', name: 'The Names at the Table', text: 'The gathering keeps a place for a person whose work sustained the community. A willing relative can speak their name; silence is also respected.' },
  { id: 'first_tools', name: 'The First Useful Work', text: 'Apprentices and independent learners display something that helped another person. Visitors ask about the work rather than the household’s wealth.' },
  { id: 'moon_watch', name: 'The Watch of Changing Moons', text: 'Neighbors read the coming lunar calendar together and prepare safe lodgings. A known risk is discussed openly without demanding that anyone reveal a private condition.' },
  { id: 'open_door', name: 'The Day of Open Doors', text: 'Hosts offer one meal and a clearly stated welcome. The council’s hearth book records which doors have a bed to spare.' },
  { id: 'witness_meal', name: 'The Witnessed Meal', text: 'Two neighbors repeat a promise in their own words before it is written down. Either can refuse the terms; a meal does not create an obligation by itself.' },
];
const HISTORIES = [
  {id:'furnace',title:'The Furnace That Stayed Alight',cause:'a guild embargo left village smiths without imported coal',aftermath:'independent makers pooled fuel and kept a communal furnace working through the hungry season',pressure:'Independent smiths need reliable ore and apprentices. Guild patrons want exclusive commissions in exchange for steady supplies.'},
  {id:'harbor',title:'The Wrecks Beyond the Warning',cause:'a harbor patron refused to replace a broken signal lamp',aftermath:'fisher households built their own watch and preserved the crews’ names beside the patron’s unpaid accounts',pressure:'Harbor families want spare lamps and rescue stores. Traders argue over whether a fee should fall on ships or shoreline homes.'},
  {id:'mine',title:'The Shift That Refused',cause:'miners found a cracked support beneath a profitable seam',aftermath:'workers refused the shift until quarry masters accepted witnessed safety inspections',pressure:'A rich seam is newly exposed. The rescue fund asks for inspections before merchants promise ore the mines cannot safely supply.'},
  {id:'ink',title:'The Letters Nobody Burned',cause:'an official ordered letters from displaced families removed from the archive',aftermath:'bookbinders preserved witnessed copies while protecting the private names their owners had not agreed to share',pressure:'The archive wants help restoring damaged correspondence. Descendants disagree over which names may now be made public.'},
  {id:'well',title:'The Common Well',cause:'a summer drought left the fortified wards buying water while lower households went without',aftermath:'well keepers negotiated public access and recorded every household’s labor on the cistern walls',pressure:'The cistern needs cleaning before another dry season. Water buyers want priority while keepers insist that thirst is not a title.'},
  {id:'refuge',title:'The House Without a Banner',cause:'families fleeing a border levy arrived with no recognized household seal',aftermath:'a sanctuary registered chosen caregivers and offered shelter without demanding military service',pressure:'The refuge’s gardens and roofs need skilled hands. Ward officers want names from a register the keepers promised to protect.'},

  { id: 'flood', title: 'The Year the River Changed', cause: 'a spring flood swept away the old crossing', aftermath: 'ferry households built a shared landing while the city tried to collect a private toll', pressure: 'The river landing needs another repair. Ferry families are arguing with city collectors over the toll that was supposed to fund it.' },
  { id: 'winter', title: 'The Winter of Shared Hearths', cause: 'an early winter stranded caravans outside the city', aftermath: 'village hosts opened their houses and asked the councils to recognize a lasting right to shelter', pressure: 'Several lodgings are full. Hosts want the council to pay for more shelter instead of recording beds that do not exist.' },
  { id: 'roads', title: 'The Divided Road', cause: 'an upland gatehouse claimed sole authority over the road', aftermath: 'travelers and village councils negotiated a witnessed passage agreement rather than accepting permanent exclusion', pressure: 'Gate officials are reading the old passage agreement differently from caravan guides. The roads remain open while the terms are disputed.' },
  { id: 'lessons', title: 'The Courtyard Lessons', cause: 'the city’s guild school refused pupils who could not pay', aftermath: 'traveling teachers began free lessons beside the village shrine, and the academy eventually recognized their examinations', pressure: 'Public teachers need writing supplies. Academy sponsors disagree over whether scholarship students should owe service after graduation.' },
  { id: 'commons', title: 'The Grove That Was Kept', cause: 'a council proposed selling the shared woodland to clear a debt', aftermath: 'gatherers documented generations of common use and obtained a witnessed stewardship agreement', pressure: 'Repairs need timber, while grove stewards ask how much can be cut without losing the paths and herbs the villages share.' },
  { id: 'bells', title: 'The Unanswered Bell', cause: 'a warning bell failed during an upland storm', aftermath: 'makers and watch-keepers established a public maintenance record so responsibility could no longer vanish into private accounts', pressure: 'The warning network needs inspections. Makers want public repair accounts before the councils commission another ceremonial bell.' },
];
const ENTRY_SITES = {
  founding: 'home', academy: 'city', river: 'brook', passage: 'gate', watchers: 'citadel', sanctuary: 'sanctuary',
  grove: 'forest', archive: 'ruin', mine: 'mountain', cistern: 'marsh', receipt: 'coast', stars: 'tower', travelers: 'camp',
  craft:'city',family:'home',storm:'coast',commons:'forest',remedies:'sanctuary',signals:'citadel',
  millwright:'mill',stonework:'quarry',islanders:'island',border_seals:'border',abbey_letters:'abbey',orchard_seeds:'orchard',crypt_names:'crypt',furnace:'foundry',
};
const HISTORY_ENTRIES = ['founding', 'academy', 'river', 'passage', 'watchers', 'sanctuary','craft','family','storm','commons','remedies','signals','millwright','stonework','islanders','border_seals','abbey_letters','orchard_seeds','crypt_names','furnace'];
const RUMOR_ENTRIES = ['grove', 'archive', 'mine', 'cistern', 'receipt', 'stars', 'travelers'];
const ALL_ENTRIES = [...HISTORY_ENTRIES, ...RUMOR_ENTRIES];
const PICKS = ['record', 'share', 'follow'];
const FATE_CONTEXT = {
  ember: {name:'Cinderbound',omen:'cold ash warmed your blanket beside a dark hearth',entry:'cistern',memory:'At four, you saw unfamiliar hands tend a cold fireplace.'},
  echo: {name:'Bellborn',omen:'an unpulled bell answered your first cry',entry:'archive',memory:'At four, you heard the word “willing” in the shrine hymn, though it was absent from the keeper’s written verse.'},
  thorn: {name:'Rootremembered',omen:'a winter seed sprouted beside your cradle',entry:'grove',memory:'At four, you saw roots curl around a forgotten grave without disturbing it.'},
};
const STRUCTURE_KINDS = {
  home: ['community', 'shrine'], city: ['academy', 'order', 'workshop'], brook: ['herbalist', 'community'],
  forest: ['guide'], ruin: ['archive'], mountain: ['guide'], marsh: ['herbalist'], coast: ['ferry'],
  tower: ['academy'], camp: ['community'], gate: ['order'], citadel: ['order', 'workshop'], sanctuary: ['shrine', 'academy'],
  mill:['workshop','community'],quarry:['workshop','guide'],island:['ferry','community'],border:['order'],abbey:['shrine','academy'],orchard:['herbalist','community'],crypt:['archive'],foundry:['workshop','community'],
};
const GIVEN = ['Tamsin','Elowen','Bram','Iona','Avel','Neris','Rowan','Sable','Corin','Mira','Isca','Ysra','Halwen','Senna','Maud','Oren','Cael','Vey','Esme','Runa','Nim','Tova','Wren','Edda','Brial','Hesta','Niall','Cerys','Orla','Ysol','Fen','Lio','Garran','Deryn','Nessa','Merran','Alwen','Sorra','Emrys','Rhos'];
const SURNAMES = ['Reed','Vale','Bell','Alder','Moss','Thorne','Ash','Wren','Flint','Ironmere','Salt','Rook','Yarrow','Hollow','Briar','Cinder','Fenwick','Crow','Ember','Vesper','Sable','Gallows','Stillwater','Morrow','Storm','Oak','Fallow','Lantern','Grave','Fell','Pale','Stone','Marrow','Grey','Rill','Blackwater','Copper','Hearth','Snow','Bracken'];
const pick = (seed, salt, entries) => entries[seededRoll(seed, salt, entries.length)];
const place = (s, id) => s.world?.locations?.find(l => l.id === id);
const name = (s, id) => place(s, id)?.name || place(s, 'home')?.name || s.world?.name || 'the region';
const age = s => s.timeline?.mode === 'birth' ? Math.floor((s.day-(s.timeline?.birthDay || 0)) / 365) : s.age;
const canRead = s => age(s) >= 6 && s.phase !== 'retired';
const clamp = (n, min = 0, max = 10000) => Math.max(min, Math.min(max, n));
const ancestry = s => ANCESTRY_LORE.find(a => a.id === s.hero?.appearance?.ancestry) || ANCESTRY_LORE[0];

function selected(s) {
  return {
    culture: CULTURES.find(c => c.id === s.lore?.cultureId) || pick(s.seed, 'lore-culture', CULTURES),
    tradition: TRADITIONS.find(t => t.id === s.lore?.traditionId) || pick(s.seed, 'lore-tradition', TRADITIONS),
    history: HISTORIES.find(h => h.id === s.lore?.historyId) || pick(s.seed, 'lore-history', HISTORIES),
  };
}
function institutionName(s, id, kind) {
  const descriptor = pick(s.seed, `lore-institution-${id}-${kind}`, ['Rowan','Glass','Wren','Lantern','Alder','Hearth','Sable','Cinder','Reed','Iron','Briar','Rook','Yarrow','Salt','Morrow','Thorn']);
  const suffix = {community:'Common Hall',shrine:'Shrine',academy:'Academy',order:'Lantern Chapter',workshop:'Makers’ Hall',herbalist:'Remedy House',guide:'Waykeepers',archive:'Keeper Archive',ferry:'Ferry House'}[kind] || 'Hall';
  return kind === 'order' ? `${name(s,id)} ${suffix}` : `${name(s,id)} ${descriptor} ${suffix}`;
}
function fillInstitutions(s) {
  for (const site of s.world?.locations || []) {
    if (site.institutions !== undefined) continue;
    site.institutions = (STRUCTURE_KINDS[site.id] || []).map(kind => ({
      id: `${site.id}_${kind}`, kind, name: institutionName(s,site.id,kind),
      witness: generatePersonName(s.seed,`lore-keeper-${site.id}-${kind}`),
      history: kind === 'order' ? 'The local chapter keeps witnessed promises and public accounts of service. It remains part of the Lantern Order.' : kind === 'academy' ? 'Its teaching register preserves both formal pupils and learners sponsored by traveling teachers.' : kind === 'archive' ? 'Surviving keeper records preserve disputed accounts; a catalog entry alone does not establish the truth of a legend.' : 'Its public record names the households that maintained this place, including neighbors outside the wealthy guilds.',
    }));
  }
}

/** Static context can be quoted by school, craft, and exploration scenes without granting knowledge. */
export function regionalLoreContext(s) {
  const {culture,tradition,history} = selected(s);
  const fate=s.timeline?.mode==='birth' && !(s.timeline.contentVersion>=6 && s.campaign?.facts?.inheritedResolution===true) ? FATE_CONTEXT[s.campaign?.fate] : null;
  const region=regionalCulture(s.realm?.sites[s.locationId]?.regionId);
  return { cultureName: region?.culture||culture.name, cultureSummary: region?.history||culture.description, traditionName: region?.festival||tradition.name, tradition: region?.tradition||tradition.text, historyTitle: region?region.government:history.title, pressure: region?.tension||history.pressure, environment:worldCalendarContext(s.world,s.day,s.seed,region?.id), ancestry: ancestry(s), institutions: place(s,s.locationId)?.institutions || [], fateName:fate?.name || null, knownOmen:fate?.omen || null };
}

/** Initialization is additive: there is no claim that a migrated character witnessed anything. */
export function initializeLore(s, {migration = false} = {}) {
  fillInstitutions(s);
  if (s.lore) return;
  const {culture,tradition,history} = selected(s);
  const available = RUMOR_ENTRIES.filter(id => place(s,ENTRY_SITES[id]));
  const start = seededRoll(s.seed,'lore-rumor-start',Math.max(1,available.length));
  s.lore = { cultureId:culture.id, traditionId:tradition.id, historyId:history.id, discovered:[], rumors:Array.from({length:Math.min(3,available.length)},(_,i)=>available[(start+i)%available.length]), records:[], pending:null };
  // Migration and new-life initialization intentionally share resource-neutral behavior.
  void migration;
}

function sourceAt(s,id) {
  const locationId = ENTRY_SITES[id], site = place(s,locationId);
  if (!site) return null;
  const institution = site.institutions?.[0];
  const companion = s.life?.people?.find(p => p.id === 'kin' && p.locationId === locationId && p.role === 'relative' && p.alive !== false);
  const currentKeeper=s.realm?.sites[locationId]?.keeper;
  const witness = currentKeeper?.name || (id === 'founding' && companion ? companion.name : institution?.witness || 'the local record keeper');
  return { locationId,site,institution,witness,witnessId:currentKeeper?.id };
}
function entry(s,id) {
  const source = sourceAt(s,id);
  if (!source) return null;
  const {history} = selected(s);
  const {locationId,site,institution,witness,witnessId} = source;
  const hall = institution?.name || `${site.name} records`;
  const foundingYear = 120 + seededRoll(s.seed,'lore-founding-years',130)+Math.floor(s.day/365);
  const siteLaw = site.necromancyLaw;
  const lawText = siteLaw === 'permitted' ? 'Willing ancestral rites are permitted here; coercion and grave theft remain crimes.' : siteLaw === 'regulated' ? 'Ancestral rites here require a witness or license, and the keepers record whose consent was given.' : 'Public necromantic practice is prohibited here, though the keepers still preserve the old accounts.';
  const table = {
    founding: { title:history.title, teaser:`The household accounts in ${hall} connect an old dispute to the region’s present needs.`, text:`About ${foundingYear} years ago, ${history.cause}. The households of ${name(s,'home')} remember how ${history.aftermath}. ${witness} lays a village account beside a council copy from ${name(s,'city')}; the worn margins preserve their disagreement.`, leadLocationId:'city', lead:`Ask the teaching and maker halls in ${name(s,'city')} for the council’s account. Independent journeys begin at fourteen; until then, a local teacher can help you compare the copies.` },
    academy: { title:'Who was allowed to learn', teaser:`A teaching register in ${hall} names pupils who entered without family wealth.`, text:`The register at ${hall} names paying pupils, scholarship students, and learners sponsored by village teachers. Beside names from ${name(s,'home')} and ${name(s,'brook')}, ${witness} traces the signatures of teachers who vouched for them. Later entries record lessons, examinations, and questions the students left unanswered. ${lawText}`, leadLocationId:'tower', lead:`Ask your teacher about academy places and sponsorship from age twelve. The keepers at ${name(s,'tower')} hold a second teaching collection; you can take the road there independently from fourteen.` },
    river: { title:'The crossing and its witnesses', teaser:`The riverside records name the people who repaired the crossing, and the households still owed a hearing.`, text:`A water-stained ledger at ${hall} records a flood that carried the old crossing away. Ferrymen supplied boats, village households supplied labor, and city collectors promised to fund the next repair. ${witness} finds the toll entries, but a later page disputes whether the repair money ever arrived.`, leadLocationId:'coast', lead:`Compare the ledger with transport receipts at ${name(s,'coast')}. From sixteen, the covenant inquiry may bring you back to ask the ferryman for a witness’s account.` },
    passage: { title:'A promise at the gate', teaser:`The gatehouse keeps an agreement about who may use the road. Its carvings omit an important clause.`, text:`At ${hall}, a weathered carving praises the upland watchers who guarded the road. ${witness} unfolds a paper agreement bearing the lower villages’ seals; it also records a traveler’s right to refuse service. The two versions have divided gate-keepers and caravan households for generations. ${lawText}`, leadLocationId:'camp', lead:`Caravan guides at ${name(s,'camp')} keep their own copies of the agreement. Ask them about open roads, and provision for the journey marked on your map.` },
    watchers: { title:'The makers behind the warning bells', teaser:`Watch accounts at ${hall} preserve the names left off a ceremonial dedication.`, text:`A bell dedication names its wealthy patron in gold leaf. Beneath it, ${witness} opens an account naming the smiths, haulers, and watch-keepers who made the warning possible. One repair was postponed while officials disputed its cost, leaving a blank space where a keeper’s approval should have been. ${lawText}`, leadLocationId:'tower', lead:`The keepers at ${name(s,'tower')} can direct you toward the damaged signal watch. Expeditions begin at sixteen and require at least 16 health; prepare for a guarded garrison.` },
    sanctuary: { title:'The sanctuary’s open register', teaser:`A refuge register records people by consent and chosen household, rather than ancestry or title.`, text:`The winter register at ${hall} records what each sheltered household agreed to share. ${witness} reads the public entries and leaves a cloth over the names their owners wished to protect. Chosen households sit beside travelers, apprentices, and families separated by the snow. ${lawText}`, leadLocationId:'camp', lead:`Seek the communal hearth at ${name(s,'camp')}. Its keepers can tell you which neighbors have room to offer shelter and what help they need in return.` },
    grove: { title:'Names kept in the old woods', teaser:`A guide says that an old grove preserves traces of people whom the city’s records forgot.`, text:`Along a path in ${site.name}, ${witness} points to names scratched beside tended roots and fresh offerings. The guide has heard a familiar voice there after rain, but has never seen who answered. Beneath the oldest tree, roots disappear into a dark cleft in the stone.`, leadLocationId:'forest', lead:'Follow the cleft toward the Moonroot Caverns. Expeditions begin at sixteen and require at least 16 health; living thorns and hungry creatures guard the way.' },
    archive: { title:'A catalog with missing pages', teaser:`The surviving archive catalog describes a covenant register whose public copy is incomplete.`, text:`At ${hall}, ${witness} holds the catalog up to the light: cut threads mark a break in its numbered pages. The keeper can show where they were removed, but cannot name the hand that took them. A copying note directs readers toward a collection sealed beneath the sanctuary. ${lawText}`, leadLocationId:'ruin', lead:'Seek the covenant ledger in the Buried Archive. Its sealed vaults open to expeditions from sixteen with at least 16 health; take care around the old wardens.' },
    mine: { title:'The mine that listens back', teaser:`An upland guide knows where miners heard a strange answer beneath the stone.`, text:`${witness} keeps two miners’ accounts from ${site.name}. Both heard tapping after the shift ended; one called it settling stone, the other a creature answering their picks. Their working map marks an exposed ore seam beside an abandoned gallery.`, leadLocationId:'mountain', lead:'From sixteen, you can gather ore and exposed crystals at the upland sites. Ask the guides which ledges are worked, bring sound tools, and allow the deposits time to recover.' },
    cistern: { title:'Warm stones beneath cold water', teaser:`A marsh keeper has observed warmth beneath the old boardwalk. The observation is not yet an explanation.`, text:`${witness} logged warm stones beneath the cold water in ${site.name} before the present fever began. An old maintenance sketch traces a channel toward ${name(s,'city')}. The keeper can follow the line on the page, but the rooms beneath the reeds remain unexplored.`, leadLocationId:'marsh', lead:'Begin the Ashfall inquiry at the Drowned Cistern from sixteen, with at least 16 health. Its flooded passages are dangerous; follow the water carefully and hear the keeper’s account.' },
    receipt: { title:'The cargo nobody wanted to name', teaser:`A ferry house holds receipts with a destination written in a different hand.`, text:`At ${hall}, ${witness} lays out receipts for cargo bound toward ${name(s,'city')}. One destination was changed in another hand, and the margin carries no signature. The clerk remembers the alteration, but says the ferryman may know who requested it.`, leadLocationId:'coast', lead:`When ${s.companions.find(p=>p.id==='kest')?.name||'your scout'} is ready to follow the missing-sibling inquiry, bring this discrepancy to the ferryman. The covenant investigation opens from sixteen; a protected conversation may earn the witness’s trust.` },
    stars: { title:'The watch above the lamps', teaser:`An observatory log links changing moons, weather, and warnings sent down the road.`, text:`${hall} keeps dated observations of the moons and warning lights along the uplands. ${witness} shows how the measured cycle predicts the next full moon. In the margin, another keeper wrote of a beast following the lanterns; the next watch found only tracks.`, leadLocationId:'tower', lead:'Consult the lunar calendar and prepare a secure refuge before the full moon. To investigate the damaged watch, return from sixteen with at least 16 health and supplies for the garrison.' },
    travelers: { title:'A road token without a family name', teaser:`A caravan keeper carries a token from a household absent from the noble registers.`, text:`At ${hall}, ${witness} turns over a small brass route token, worn smooth by many hands. Its marks name places that offered bread and a safe bed. The keeper remembers ${ancestry(s).name.toLowerCase()} travelers among its bearers, each carrying a different household story.`, leadLocationId:'sanctuary', lead:`Ask the keepers at ${name(s,'sanctuary')} how displaced neighbors made new households. Their refuge register preserves the welcomes people agreed to share.` },
  };
  const localSubject={
    craft:['The makers who refused a war commission','workshop','An old guild account records a request for blades whose buyer would not name the intended militia. Several smiths refused the commission and accepted repair work instead. Their signatures preserve a career measured in bridges, ploughs, and useful tools as well as weapons.','foundry','A professional life can remain civilian. Seek paid work, build a forge, and let skill, reputation, and chosen commissions shape your career.'],
    family:['The households between the branches','community','A household register names birth parents beside adoptive caregivers, spouses, and children who chose another home. The keeper lays its witness marks beside inheritance records; kinship and ownership do not always follow the same branches.','sanctuary','Return to the people whose lives you share. A relationship remembered in a register still needs present care.'],
    storm:['The lamp that weathered the wreck','ferry','A rescue lamp survives with a cracked lens and three makers’ marks. The oldest mark belongs to a boat-builder omitted from the harbor dedication. A crew list records the people who returned and leaves the missing names unresolved.','island','If the island landing appears on your regional map, compare its ferry keeper’s account. Otherwise ask the harbor rescue houses what preparations they need.'],
    commons:['A grove boundary drawn twice','guide','A survey shows the same grove boundary twice: one line was drawn for a noble sale, the other from the paths that gatherers had maintained for generations. The public agreement recognizes common use while requiring restoration of what is taken.','home','Gathering and craft are connected to the places that sustain them. Compare the village’s public work accounts before deciding how to use the common paths.'],
    remedies:['A remedy with every maker named','shrine','A remedy book names the gardener, gatherer, grinder, and healer beside each useful treatment. Failed preparations are kept in a separate witnessed section so another learner can avoid repeating the mistake. It claims no cure for the present fever.','marsh','Consult actual healers about illness. Marsh gatherers can show where the written ingredients grow without promising that a recipe will cure Ashfall.'],
    signals:['The warning sent against orders','order','A watch-keeper’s log records a warning sent before a captain authorized the bell. A later hearing found the danger real, but argued over whether obedience could excuse remaining silent. Both accounts survive; neither erases the people who waited below.','gate','Compare the gatehouse’s public account. An order’s oath and its officers’ instructions may make different demands.'],
    millwright:['The wheel repaired by three households','workshop','A broken mill axle carries three maker marks. The repair ledger names a carpenter, a smith, and a ferry household who worked together while grain spoiled upstream. Their negotiated shares survive beside the completed repair.','brook','Compare river work accounts with the mill’s repair book. A successful commission can belong to several crafts without granting any one maker all the credit.'],
    stonework:['The quarry’s refusal book','guide','A quarry log preserves shifts that workers refused after hearing loose stone above the galleries. Inspectors signed several warnings only after apprentices had already left the face. The rescue fund was built from regular small contributions.','mountain','Ask the upland guides about sound supports and safe deposits before gathering ore. A rich seam is not a promise that a gallery can safely be entered.'],
    islanders:['The landing built without a lord','ferry','Island households raised their own landing from shared timber after the harbor’s toll account denied them a repair. A tide-marked agreement gives visiting crews a safe berth without transferring ownership of the shoreline.','coast','Compare harbor receipts with the island’s witnessed agreement. Prepare for the actual road and ferry costs shown by the map.'],
    border_seals:['Two seals on one passage','order','Two ward seals survive on the same travel permit. One claims permanent service from the traveler; the other records only a single agreed escort. Caravan witnesses kept a copy after the official original was amended.','camp','Compare the camp’s copy and read the terms before accepting a commission. A paid journey must not quietly become a lifelong allegiance.'],
    abbey_letters:['The letters under the roof tiles','academy','During a threatened confiscation, abbey bookbinders stored household letters beneath their roof tiles. They preserved public claims in one volume and protected private names in another. The keeper opens only the pages whose authors permitted sharing.','sanctuary','Compare sanctuary shelter records without demanding the protected names. A surviving letter can offer a question rather than a claim over a descendant.'],
    orchard_seeds:['The graft that outlived its maker','herbalist','The oldest orchard tree carries a graft taught by a grower whose household later left the region. Their name survives because neighbors copied the instruction beside every new cutting. The record includes failed grafts and the weather that harmed them.','brook','Bring the method to river growers and ask which seasons suit their ground. A useful inherited skill may need a different practice in a new place.'],
    crypt_names:['Consent beneath the broken stone','archive','Burial tablets preserve the names people chose for remembrance beside instructions about their remains. Several later annotations contradict the original consent. The keeper marks the disagreement instead of treating every old inscription as permission.','ruin','Compare the ruined archive’s consent records. Learning necromancy does not turn an unverified name into permission to bind a soul.'],
    furnace:['The heat shared by independent makers','workshop','A furnace ledger records fuel shares, apprentices’ lessons, and repair commissions taken when military buyers demanded exclusive contracts. Makers kept the furnace open by selling useful tools and sharing expensive heat. No single guild owns the recorded method.','citadel','Ask citadel makers about commissions and standards. Establish a forge and a durable livelihood without promising your life to an adventuring path.'],
  }[id];
  if(localSubject) {
    const [title,kind,account,preferredLead,lead]=localSubject;
    const leadLocationId=place(s,preferredLead)?preferredLead:locationId;
    const detail=pick(s.seed,`lore-account-detail-${id}`,['The margin preserves a correction in another hand.','A maker’s thumbprint survives beneath the witness seal.','The oldest page is missing, and the keeper says plainly what cannot be established.','A later copy disagrees over the date, though both name the same households.','The keeper places an unsigned rumor beside the witnessed account and keeps the distinction visible.','A child’s copied question appears beside an elder’s answer.']);
    table[id]={title,teaser:`${hall} preserves a local account whose consequences remain visible.`,text:`At ${hall}, ${witness} unfolds the account. ${account} ${detail} ${site.localCustom || ''}`,leadLocationId,lead};
  }
  const value = table[id];
  if (!value) return null;
  const fate=s.timeline?.mode==='birth' && !(s.timeline.contentVersion>=6 && s.campaign?.facts?.inheritedResolution===true) ? FATE_CONTEXT[s.campaign?.fate] : null;
  const memory=fate?.entry===id && s.campaign?.ageClues?.includes(4)?` ${fate.memory} That remembered moment gives you a personal reason to ask, not proof of this account’s explanation.`:'';
  return { id,...value,text:value.text+memory+(institution?.witness&&institution.witness!==witness?` Archived attribution: ${institution.witness}. The present copy is kept by ${witness}.`:''),locationId,witness,witnessId,hall,discovered:!!s.lore?.discovered.includes(id),kind:HISTORY_ENTRIES.includes(id)?'history':'rumor' };
}

export function loreActions(s) {
  if (!s.lore || s.lore.pending || !canRead(s) || s.event || s.battle || s.conversations?.pending || s.dungeon && !s.dungeon.complete) return [];
  const site = place(s,s.locationId);
  if (!site) return [];
  const closed = ['destroyed','evacuated'].includes(site.status);
  return ALL_ENTRIES.map(id=>entry(s,id)).filter(e=>e && e.locationId===s.locationId && !e.discovered).map(e=>({
    id:`lore_read_${e.id}`,label:e.kind==='history'?`Read: ${e.title}`:`Ask about: ${e.title}`,
    description:`${e.teaser} Hear ${e.witness}’s account, choose how to preserve it, and gain a practical lead.`,days:1,cost:0,group:'Lore & local knowledge',
    ...(closed?{disabledReason:`The record house at ${site.name} stands empty. Its keepers have left; seek a surviving institution.`}:{}),
  }));
}

export function applyLoreAction(s,id,ctx) {
  if (!id.startsWith('lore_')) return false;
  const action = loreActions(s).find(a=>a.id===id);
  if (!action || action.disabledReason) return false;
  const e = entry(s,id.slice('lore_read_'.length));
  if (!e || typeof ctx?.setEvent !== 'function') return false;
  const eventId = `lore_${e.id}`;
  s.lore.pending = {eventId,entryId:e.id,locationId:e.locationId};
  ctx.setEvent(eventId,e.title,e.kind==='history'?'A place and its memory':'A rumor, a witness, a lead',`${e.text}\n\n${e.witness} asks what you will do with the account. ${e.lead}`,[
    {id:'record',label:'Copy the account in the source’s own words',description:'Learn 2 scholarship. Preserve the witness, place, and limits of this account.'},
    {id:'share',label:'Share the public account with the people it concerns',description:'Learn 1 scholarship and gain 2 local trust. Private names and hidden conditions remain protected.'},
    {id:'follow',label:'Map the lead and plan a careful journey',description:'Learn 1 scholarship and 1 survival. Note the road and prepare for what lies ahead.'},
  ]);
  return true;
}

export function applyLoreChoice(s,eventId,pickId,ctx) {
  const pending=s.lore?.pending;
  if (!pending || pending.eventId!==eventId || !PICKS.includes(pickId)) return false;
  const e=entry(s,pending.entryId);
  if (!e || e.locationId!==pending.locationId || s.lore.discovered.includes(e.id)) return false;
  s.lore.pending=null;
  s.lore.discovered.push(e.id);
  if (e.kind==='rumor' && !s.lore.rumors.includes(e.id)) s.lore.rumors.push(e.id);
  s.hero.skills.scholarship=clamp(s.hero.skills.scholarship+(pickId==='record'?2:1));
  if(pickId==='follow')s.hero.skills.survival=clamp(s.hero.skills.survival+1);
  if(pickId==='share' && typeof ctx?.standing==='function')ctx.standing(['city','tower'].includes(e.locationId)?'academy':['gate','citadel'].includes(e.locationId)?'order':'villagers',2);
  if(pickId==='follow'){s.flags ||= {};s.flags[`loreLead_${e.leadLocationId}`]=true;markSiteKnowledge(s,e.leadLocationId,'Rumored',`${e.witness}: ${e.title}`);}
  const method={record:'You copied the account carefully and kept its limits beside the source.',share:'You shared the public account without exposing protected names or unrelated private knowledge.',follow:'You mapped the practical lead and kept the distinction between evidence and rumor.'}[pickId];
  const text=`${e.text}\n\n${method}\n\nCopied in world year ${Math.floor(s.day/365)}.\n\nLead: ${e.lead}`;
  const record={id:e.id,title:e.title,text,day:s.day,locationId:e.locationId,witness:e.witness,...(e.witnessId?{witnessId:e.witnessId}:{})};
  s.lore.records.push(record);
  s.lore.records=s.lore.records.slice(-50);
  s.notice=`You preserved “${e.title}” with ${e.witness} in ${name(s,e.locationId)}. ${e.lead}`;
  if (pickId==='share' && typeof ctx?.witnesses==='function' && typeof ctx?.remember==='function') {
    for (const companion of ctx.witnesses()) ctx.remember(companion.id,`We heard the public account of “${e.title}” together in ${name(s,e.locationId)}.`,1);
  }
  ctx?.journal?.(e.title,text,'lore');
  return true;
}

export function loreEventIds() {
  return Object.fromEntries(ALL_ENTRIES.map(id=>[`lore_${id}`,[...PICKS]]));
}

export function loreView(s) {
  const {culture,tradition,history}=selected(s), own=ancestry(s);
  const fate=s.timeline?.mode==='birth' && !(s.timeline.contentVersion>=6 && s.campaign?.facts?.inheritedResolution===true) ? FATE_CONTEXT[s.campaign?.fate] : null;
  const fateAccount=fate && s.campaign?.ending?`Your ${fate.name} birth omen led into the recorded account of ${s.campaign.ending.title}. Its resolution has become part of this region’s history.`:fate?`Your ${fate.name} birth omen — ${fate.omen} — remains an unanswered sign.`:`The region’s old promises live on in its books, disagreements, and the accounts its people choose to share.`;
  const entries=ALL_ENTRIES.map(id=>entry(s,id)).filter(e=>e&&(!s.cartography||s.cartography.sites[e.locationId]||e.discovered));
  return {
    title:`The remembered world of ${s.world?.name || 'the region'}`,
    summary:`${culture.description} ${history.pressure} ${worldCalendarContext(s.world,s.day,s.seed).climate[0].toUpperCase()+worldCalendarContext(s.world,s.day,s.seed).climate.slice(1)} shape the region’s working year. ${fateAccount}`,
    culture:{name:culture.name,description:`${culture.description} ${name(s,'home')}, ${name(s,'brook')}, and ${name(s,'city')} carry different versions of its story. Each council sets its own rules for ancestral rites.`,customs:`${culture.customs}\n\n${tradition.name}: ${tradition.text}`},
    ancestry:{name:own.name,summary:own.summary,customs:own.customs,origin:own.origin},
    heritage:{...effectiveHeritage(s.hero),declared:s.hero.appearance.heritageVersion===1},
    histories:entries.filter(e=>e.kind==='history').map(e=>({id:e.id,title:e.title,text:e.discovered?`${e.text}\n\n${e.lead}`:e.teaser,discovered:e.discovered,locationId:e.locationId,witness:e.witness,witnessId:e.witnessId})),
    rumors:entries.filter(e=>e.kind==='rumor' && (s.lore?.rumors.includes(e.id)||e.discovered||e.locationId===s.locationId)).map(e=>({id:e.id,title:e.title,text:e.discovered?`${e.text}\n\n${e.lead}`:e.teaser,locationId:e.locationId,discovered:e.discovered})),
    records:(s.lore?.records || []).map(r=>({...r})),
  };
}

const plain = v=>!!v && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
const text = (v,max=10000)=>typeof v==='string' && v.length>0 && v.length<=max;
const integer = (v,min=0,max=10000000)=>Number.isInteger(v) && v>=min && v<=max;
export function validateLore(v,state) {
  if(!plain(v)||!CULTURES.some(c=>c.id===v.cultureId)||!TRADITIONS.some(t=>t.id===v.traditionId)||!HISTORIES.some(h=>h.id===v.historyId))return false;
  if(!Array.isArray(v.discovered)||v.discovered.length>ALL_ENTRIES.length||new Set(v.discovered).size!==v.discovered.length||!v.discovered.every(id=>ALL_ENTRIES.includes(id)))return false;
  if(!Array.isArray(v.rumors)||v.rumors.length>RUMOR_ENTRIES.length||new Set(v.rumors).size!==v.rumors.length||!v.rumors.every(id=>RUMOR_ENTRIES.includes(id)))return false;
  if(!Array.isArray(v.records)||v.records.length>50||new Set(v.records.map(r=>r?.id)).size!==v.records.length)return false;
  if(!v.records.every(r=>plain(r)&&ALL_ENTRIES.includes(r.id)&&v.discovered.includes(r.id)&&text(r.title,1000)&&text(r.text)&&integer(r.day)&&ENTRY_SITES[r.id]===r.locationId&&(!state||r.day<=state.day&&!!place(state,r.locationId))&&(r.witness===undefined||text(r.witness,160))))return false;
  if(v.discovered.length!==v.records.length||!v.discovered.every(id=>v.records.some(r=>r.id===id)))return false;
  if(v.pending!==null){const p=v.pending;if(!plain(p)||!ALL_ENTRIES.includes(p.entryId)||p.eventId!==`lore_${p.entryId}`||p.locationId!==ENTRY_SITES[p.entryId]||v.discovered.includes(p.entryId))return false;if(state&&(state.event?.id!==p.eventId||state.locationId!==p.locationId||!place(state,p.locationId)))return false;}
  if(state && state.event?.id.startsWith('lore_') && v.pending?.eventId!==state.event.id)return false;
  return true;
}
