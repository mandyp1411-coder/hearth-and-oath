import { expandRegionalGeography, territoryAt } from './regional-geography-v33.js';
import { authoredLandV32, placeAtlasSitesV32, roadWaypointsV32 } from './atlas-geography-v32.js';
import { culturalName, culturalPlaceName, regionalNamingLore } from './names.js';
const LOCATION_TYPES = {
  city: 'city',
  home: 'village',
  brook: 'village',
  forest: 'forest',
  ruin: 'ruin',
  mountain: 'mountain', marsh: 'marsh', coast: 'coast', tower: 'tower',
  camp: 'camp', gate: 'gate', citadel: 'citadel', sanctuary: 'sanctuary',
  mill: 'village', quarry: 'mountain', island: 'coast', border: 'gate', abbey: 'sanctuary', orchard: 'village', crypt: 'ruin', foundry: 'city',
  haven:'coast',barrow:'ruin',grove:'forest',saltmine:'mountain',crossroads:'camp',fort:'citadel',spire:'tower',fenhold:'marsh',wells:'village',monastery:'sanctuary',port:'city',waste:'ruin',
};

const LAWS = ['permitted', 'regulated', 'forbidden'];

/** A birthplace is a circumstance; it does not assign a class or ancestry. */
export const BIRTHPLACES = [
  { id:'village', label:'Hearth village', origin:'village', locationId:'home', description:'Gardens, familiar faces, shared fires, and a small school.' },
  { id:'city', label:'Crowded city ward', origin:'city', locationId:'city', description:'Guild workshops, academy gates, costly rooms, and many strangers.' },
  { id:'brook', label:'Riverside hamlet', origin:'village', locationId:'brook', description:'Mill wheels, ferrymen, herbal gardens, and changing water.' },
  { id:'coast', label:'Salt-worn harbor', origin:'city', locationId:'coast', description:'Fishing families, foreign ships, rope-makers, and storms.' },
  { id:'camp', label:'Traveling caravan', origin:'village', locationId:'camp', description:'A chosen household on the road, communal lessons, and trade.' },
  { id:'citadel', label:'Fortress household', origin:'city', locationId:'citadel', description:'Watch bells, armored patrols, smithies, and inherited duties.' },
  { id:'sanctuary', label:'Refuge sanctuary', origin:'village', locationId:'sanctuary', description:'A sheltered community of teachers, healers, and displaced kin.' },
  { id:'mountain', label:'Upland mining hearth', origin:'village', locationId:'mountain', description:'Stone houses, dangerous shifts, practical crafts, and winter stores.' },
  { id:'tower', label:'Observatory settlement', origin:'city', locationId:'tower', description:'Star charts, bookbinders, visiting scholars, and unanswered questions.' },
  { id:'marsh', label:'Reed-bed stilt village', origin:'village', locationId:'marsh', description:'Boardwalk houses, remedy gatherers, hidden channels, and mist.' },
  { id:'gate', label:'Border gatehouse', origin:'city', locationId:'gate', description:'Travelers, toll records, watch-keepers, and conflicting allegiances.' },
  { id:'forest', label:'Woodland keeper’s home', origin:'village', locationId:'forest', description:'Common groves, animal trails, oral histories, and patient observation.' },
];
export function resolveBirthplace(id = 'village', seed = 'hearth') {
  const key = id === 'home' ? 'village' : id;
  const row = key === 'random' ? BIRTHPLACES[seededRoll(seed,'birthplace',BIRTHPLACES.length)] : BIRTHPLACES.find(p=>p.id===key) || BIRTHPLACES[0];
  return { ...row };
}

/** Shared service rule: an inhabited site with a hearth or market can sustain
 * civilian work. A reachable ruin is not an operating settlement. */
export function isSettlement(world, id) {
  const site=world?.locations?.find(location=>location.id===id);
  return Boolean(site && site.servicesAvailable!==false && !['destroyed','evacuated'].includes(site.status) &&
    (['city','village','camp'].includes(site.type) || site.services?.some(service=>['hearth','market'].includes(service))));
}

const NAME_ROOTS = ['Ash','Bell','Briar','Cinder','Crow','Dusk','Ember','Fallow','Fen','Flint','Gallows','Gloam','Hollow','Iron','Lantern','Morrow','Moss','Raven','Reed','Rook','Sable','Salt','Sorrow','Thorn','Vesper','Wren','Yarrow','Black','Pale','Oak','Grave','Storm'];
const NAME_ENDINGS = ['mere','wick','watch','hold','stead','ford','hollow','cross','reach','veil','bridge','haven','fell','mark','bury','combe','ward','rest','moor','well','wold','scar','gate','bend'];
function placeName(seed,id,type) {
  const regionId=({mountain:'highstone',coast:'saltreach',forest:'blackgrove',marsh:'rainward',gate:'ashplain',citadel:'ashplain'})[type]||pick(seed,'regional-profile',REGIONAL_PROFILES).id,regional=culturalPlaceName(seed,id,regionId),root=regional,ending='';
  const compound=regional;
  const forms={ forest:[`The ${root}wood`,`The ${root} Thicket`,`The ${root} Weald`],ruin:[`The ${root} Ossuary`,`${compound} Reliquary`,`The Fallen ${root} Cloister`],mountain:[`The ${root} Teeth`,`${root}spine Heights`,`The ${root} Scar`],marsh:[`The ${root} Mire`,`${compound} Fen`,`The ${root} Reedwaste`],coast:[`${compound} Harbor`,`The ${root} Strand`,`${root} Quay`],tower:[`${root}watch Observatory`,`The ${root} Stair`,`${compound} Spire`],camp:[`The ${root} Caravan`,`${compound} Encampment`,`The Wandering ${root}`],gate:[`${root}ward Gate`,`${compound} Crossing`,`The ${root} Arch`],citadel:[`${compound} Bastion`,`The ${root} Keep`,`${root}ward Citadel`],sanctuary:[`${compound} Sanctuary`,`The ${root} Refuge`,`${root} Rest`] };
  return forms[type]?pick(seed,`name-form-${id}`,forms[type]):compound;
}
/** Cultural identity is assigned when someone enters the world; saved names stay theirs. */
export function generatePersonName(seed='hearth',salt='person',options={}) { return culturalName(seed,salt,options).name; }

const REGIONAL_PROFILES = [
  {id:'rainward',name:'The Rainward March',climate:'rain-soaked lowlands',seasons:['Thaw','Greenrain','Harvest','Longnight'],weather:['fine rain','low fog','clear cold','a passing downpour','still grey skies'],resource:'bog iron',pressure:'Flooded lanes make carpenters, ferrymen, and remedy gatherers essential.'},
  {id:'saltreach',name:'The Salt and Cinder Coast',climate:'wind-cut coast and sheltered inland valleys',seasons:['Gullreturn','Warmtide','Stormwane','Darkwater'],weather:['salt wind','sea fog','bright cloud','driving rain','a quiet tide'],resource:'sea salt',pressure:'Harbor workers argue over storm repairs and the price of inland grain.'},
  {id:'highstone',name:'The Highstone Reach',climate:'cold uplands and steep river valleys',seasons:['Snowbreak','Shortsun','Copperleaf','Deepfrost'],weather:['thin snow','clear mountain light','sleet','a bitter wind','valley mist'],resource:'mountain ore',pressure:'Mountain households need safe mine supports and enough stores for the long winter.'},
  {id:'blackgrove',name:'The Blackgrove Vale',climate:'deep woodland and fertile clearings',seasons:['Rootwake','Leafhigh','Mushroomfall','Baresong'],weather:['drifting spores','soft rain','warm shade','silver mist','wind through bare branches'],resource:'old-growth timber',pressure:'Grove keepers dispute logging rights while villages ask for rebuilding timber.'},
  {id:'ashplain',name:'The Ashen Borderlands',climate:'dry plains around old volcanic stone',seasons:['Dustspring','Redheat','Ashfall','Frostwake'],weather:['dry wind','high grey cloud','light ash','a brief hard rain','clear starlight'],resource:'volcanic glass',pressure:'Wells and cisterns must be shared between farmers, caravans, and the fortified wards.'},
  {id:'bellwater',name:'The Bellwater Commons',climate:'river islands, reed beds, and rolling hills',seasons:['Reedrise','Goldwater','Lowriver','Stillbell'],weather:['river fog','sun on wet stone','steady rain','a mild breeze','frosted reeds'],resource:'river clay',pressure:'Toll keepers and ferry households disagree over who owns the repaired crossings.'},
];
export function worldNamingLore(world){return regionalNamingLore(world?.environment?.profileId);}

export function worldCalendarContext(world, day=0, seed='hearth',regionId=world?.environment?.profileId) {
  const profile=REGIONAL_PROFILES.find(p=>p.id===regionId) || REGIONAL_PROFILES[0];
  const yearDay=((Math.floor(day)%365)+365)%365,seasonIndex=Math.min(3,Math.floor(yearDay/92));
  return {season:profile.seasons[seasonIndex],climate:profile.climate,weather:pick(seed,`weather-${Math.floor(day/7)}-${profile.id}`,profile.weather),pressure:profile.pressure,resource:profile.resource};
}


/** A stable, independent roll. The upper bound is exclusive. */
export function seededRoll(seed, salt, range) {
  const limit = Math.floor(Number(range));
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  const input = `${String(seed ?? 'hearth')}\u001f${String(salt ?? '')}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return (hash >>> 0) % limit;
}

function pick(seed, salt, entries) {
  return entries[seededRoll(seed, salt, entries.length)];
}

function lawDescription(law) {
  if (law === 'permitted') return 'Willing ancestral rites and the study of the dead are permitted; coercion and grave theft remain crimes.';
  if (law === 'regulated') return 'Ancestral rites require a witness or academy license; raising bodies and binding unwilling souls are prohibited.';
  return 'Public necromantic practice is prohibited. Authorities require a witness or evidence before opening an investigation.';
}

/** Every seed provides a connected region and an attainable mentor for each advanced path. */
export function generateWorld(seed = 'hearth', { expanded = false, regional = true } = {}) {
  const names = {
    region: pick(seed, 'region', ['The Amber March', 'The Rowan Vale', 'The Lantern Coast', 'The Morrow Reach', 'The Willowlands', 'The Bellweather Downs']),
    city: pick(seed, 'city', ['Alderwatch', 'Candlewick', 'Vesperhold', 'Goldmere', 'Larkspire', 'Brindlehall']),
    home: pick(seed, 'home', ['Hearthmere', 'Rowanstead', 'Mossbell', 'Briarwell', 'Wrenfield', 'Oakmead']),
    brook: pick(seed, 'brook', ['Brookhollow', 'Reedcross', 'Fernbridge', 'Millbrook', 'Willowford', 'Cresswater']),
    forest: pick(seed, 'forest', ['The Hushwood', 'The Copperwood', 'The Lantern Thicket', 'The Greywood', 'The Elderwood', 'The Wrenwood']),
    ruin: pick(seed, 'ruin', ['Saint Orin’s Ruin', 'The Hollow Archive', 'The Fallen Bell Tower', 'The Ashen Cloister', 'The Silent Observatory', 'The Broken Sanctuary']),
  };
  if (expanded) {
    const profile=pick(seed,'regional-profile',REGIONAL_PROFILES);
    names.region=`${pick(seed,'region-epithet',['The Quiet','The Broken','The Outer','The Last','The Veiled','The Old','The Drowned','The Iron','The Bitter','The Candlelit'])} ${pick(seed,'region-landform',['March','Vale','Reach','Coast','Commons','Downs','Wardlands','Hollows','Province','Border'])}`;
    for(const id of ['city','home','brook','forest','ruin']) names[id]=placeName(seed,id,LOCATION_TYPES[id]);
  }
  const cityLaw = pick(seed, 'city-law', LAWS);
  const homeLaw = pick(seed, 'home-law', LAWS);
  const brookLaw = pick(seed, 'brook-law', LAWS);
  const locations = [
    {
      id: 'home', name: names.home, type: 'village', travelDays: 1, safety: 5,
      necromancyLaw: homeLaw,
      description: `A small settlement of hearth fires, kitchen gardens, and familiar faces. Ashfall fever has reached its households; the old shrine is still a place to seek help. ${lawDescription(homeLaw)}`,
    },
    {
      id: 'city', name: names.city, type: 'city', travelDays: 3, safety: 4,
      necromancyLaw: cityLaw,
      description: `The region’s busy city gathers an academy, a guild market, and a sworn order behind its stone walls. Fever wards are filling, and scholars disagree over the cause. ${lawDescription(cityLaw)}`,
    },
    {
      id: 'brook', name: names.brook, type: 'village', travelDays: 2, safety: 4,
      necromancyLaw: brookLaw,
      description: `A riverside village where millers, ferrymen, and herbalists trade news. Families are sheltering travelers fleeing Ashfall fever. ${lawDescription(brookLaw)}`,
    },
    {
      id: 'forest', name: names.forest, type: 'forest', travelDays: 2, safety: 2,
      necromancyLaw: 'regulated',
      description: `Old trails connect both villages beneath a canopy of moss and copper leaves. Healing herbs grow here, alongside hungry beasts and abandoned camps. The nearest settlement’s law governs witnessed acts.`,
    },
    {
      id: 'ruin', name: names.ruin, type: 'ruin', travelDays: 4, safety: 1,
      necromancyLaw: 'regulated',
      description: `An abandoned sanctuary beyond the forest holds sealed research and the memories of its former keepers. Licensed expeditions may study its ancestral records; disturbing remains without consent invites scrutiny.`,
    },
  ];

  const mentors = [
    {
      id: 'mentor-paladin', name: pick(seed, 'mentor-paladin-name', ['Ser Elian Vale', 'Dame Mara Alder', 'Ser Rowan Bell','Dame Ysra Flint','Ser Oren Crowthorne','Dame Nerys Hollow','Ser Avel Rook','Dame Maud Ironmere','Ser Cael Sable','Dame Senna Reed']),
      locationId: 'city', specialization: 'paladin', available: true,
      description: 'A sworn protector offers training and an initiation founded on a visible oath of mercy and protection.',
    },
    {
      id: 'mentor-necromancer', name: pick(seed, 'mentor-necromancer-name', ['Archivist Iona', 'Physician Sable', 'Scholar Tamsin','Mortician Neris','Anatomist Elowen','Keeper Vey','Doctor Halwen','Archivist Corin','Physician Maud','Scholar Isca']),
      locationId: 'city', specialization: 'necromancer', available: true,
      description: cityLaw === 'forbidden'
        ? 'A physician quietly teaches consensual ancestral rites and points promising students toward the ruined archive.'
        : 'A physician teaches consensual ancestral rites and sponsors students studying the ruined archive.',
    },
    {
      id: 'mentor-assassin', name: pick(seed, 'mentor-assassin-name', ['The Grey Finch', 'Merrin Shade', 'Vey the Quiet','The Reed Widow','Isca of the Keys','Sable Jack','The Unnamed Guest','Corin Stillstep','Nerys the Listener','The Pale Rook']),
      locationId: 'city', specialization: 'assassin', available: true,
      description: 'A discreet contact offers a test of stealth and judgment, with the terms disclosed before accepting.',
    },
  ];

  const world = {
    name: names.region,
    crisis: 'Ashfall fever',
    locations,
    laws: `Local councils set their own rules. In ${names.city}, necromancy is ${cityLaw}; in ${names.home}, it is ${homeLaw}; in ${names.brook}, it is ${brookLaw}. Authorities act on witnesses, reports, and discovered evidence. Willing ancestral contact, grave theft, and unwilling soul binding are treated as different acts.`,
    culture: pick(seed, 'culture', [
      'Lanterns are left on doorsteps for travelers, and a promise spoken at a hearth is expected to be kept.',
      'Families honor willing ancestors with named memorials; a person’s consent matters beyond death.',
      'The villages value practical crafts and collective harvest work more than inherited titles.',
      'Scholars debate in public courtyards, while the rural shrines keep older traditions alive.',
      'Wild groves are protected as common ground, and moon watchers teach respect for changing seasons.',
    ]),
    festival: {
      name: pick(seed, 'festival-name', ['The Returning Lanterns', 'The First Moon Fair', 'The Hearthlight Gathering', 'The River’s Remembrance']),
      day: 90 + seededRoll(seed, 'festival-day', 150),
      tradition: pick(seed, 'festival-tradition', ['Neighbors exchange handmade gifts and tell stories of the year.', 'Families share a public meal and leave a place for absent friends.', 'Apprentices display their work beside the oldest local craft masters.']),
    },
    rumors: [
      `The academy in ${names.city} is seeking careful field observers, not only wealthy students.`,
      `A moonwise ranger near ${names.forest} can teach a refuge ritual without demanding allegiance.`,
      `${cityLaw === 'forbidden' ? 'Discreet physicians preserve ancestral knowledge despite the ban.' : 'Licensed ancestral research is attracting healers from distant villages.'}`,
    ],
    roads: [
      { from: 'home', to: 'city' },
      { from: 'home', to: 'brook' },
      { from: 'home', to: 'forest' },
      { from: 'brook', to: 'forest' },
      { from: 'forest', to: 'ruin' },
    ],
    mentors,
    routes: {
      paladin: { mentorId: 'mentor-paladin', locationIds: ['city', 'ruin'] },
      necromancer: { mentorId: 'mentor-necromancer', locationIds: ['city', 'ruin'] },
      assassin: { mentorId: 'mentor-assassin', locationIds: ['city', 'ruin'] },
    },
  };

  world.changes = [];
  for (const location of world.locations) {
    location.status = 'thriving';
    location.services = baseServices(location.id);
  }
  if (expanded) {
    for(const mentor of world.mentors)mentor.name=generatePersonName(seed,mentor.id);
    addSites(world, seed);
    addOptionalSites(world,seed);
    const profile=pick(seed,'regional-profile',REGIONAL_PROFILES);
    world.environment={profileId:profile.id,climate:profile.climate,resource:profile.resource,pressure:profile.pressure};
    world.map=makeVariedMap(seed,world.locations);
    if(regional)expandRegionalGeography(world,seed,{roll:seededRoll,name:culturalPlaceName});
    world.roads=makeVariedRoads(seed,world);
    for(const site of world.locations) {
      site.localCustom=pick(seed,`site-custom-${site.id}`,['Guests leave a small candle at the public hearth.','Repair work is witnessed before coin changes hands.','An absent neighbor keeps a named place at the seasonal meal.','Children learn the safe paths before they learn the toll roads.','A promise is repeated in the listener’s own words.','Borrowed tools carry the borrower’s name on a scrap of cloth.','A door painted with a reed offers water to travelers.','A bell is rung only after the watch-keeper names the reason.']);
      site.description+=` ${siteHistory(seed,site,world)} ${site.localCustom}`;
    }
    world.rumors.push(`Makers are needed along the road to ${world.locations.find(l=>l.id==='citadel').name}; honest craft can become a life’s work.`,profile.pressure);
    if(world.map.atlas.rivers.length) world.rumors.push(`The ferrymen call the water ${world.map.atlas.rivers[0].name}; its old crossing bells can still be heard after dusk.`);
    addRoadDays(world,seed);
  } else world.map = makeMap(seed, world.locations, false);
  return world;
}

const EXTRA_SITES = [
  ['mountain', ['The Crownspine', 'The Silver Teeth', 'The Stormward Peaks', 'The Frostglass Range'], 5, 2, ['guide', 'mine'], 'Wind-carved passes and abandoned mines cross the northern mountains. Guides keep a refuge beneath the high stones.'],
  ['marsh', ['The Reedwaste', 'The Glasswater Fen', 'The Mourning Mire', 'The Sable Marsh'], 4, 2, ['herbalist', 'guide'], 'Lanterns mark a boardwalk through deep reed beds. Apothecaries gather rare remedies beside drowned foundations.'],
  ['coast', ['The Lantern Quay', 'Saltbell Harbor', 'The Dawnwater Shore', 'The Ivory Strand'], 4, 4, ['market', 'hearth', 'ferry'], 'A harbor of salt-white sails, fisher families, and traders from distant provinces. New arrivals bring both opportunity and rumor.'],
  ['tower', ['The Starwatch Tower', 'The Glass Observatory', 'The Moonward Spire', 'The Astral Stair'], 4, 3, ['academy', 'mentor', 'hearth'], 'A lonely observatory studies the stars and preserves knowledge beyond the city academy’s reach. Its keepers welcome careful learners.'],
  ['camp', ['The Wayfarer Camp', 'The Ember Encampment', 'The Wandering Hearth', 'The Copper Caravan'], 2, 4, ['market', 'guide', 'hearth', 'mentor'], 'Travelers, scouts, and craftspeople share a guarded camp. A meal and an honest story can earn a place by the communal fire.'],
  ['gate', ['The Kingsroad Gate', 'The Brassward Crossing', 'The Dawn Gate', 'The Covenant Arch'], 3, 3, ['order', 'guide'], 'An ancient gateway controls the road into the uplands. Watchers record travelers, while weathered carvings hint at older promises.'],
  ['citadel', ['The Ivory Citadel', 'The Thornward Keep', 'The High Lantern', 'The Bastion of Bells'], 5, 4, ['order', 'market', 'smith', 'hearth', 'mentor'], 'A fortified settlement overlooks the eastern roads. Orders and guilds offer an alternative to the city’s institutions.'],
  ['sanctuary', ['The Hearthward Sanctuary', 'The Quiet Lantern', 'The Ancestor’s Rest', 'The Grove of Mercy'], 3, 5, ['academy', 'order', 'hearth', 'shrine', 'mentor'], 'A protected sanctuary shelters displaced families and teachers. Its doors remain open when other institutions fall silent.'],
];
const POSITIONS = {
  home: [370, 455], city: [570, 320], brook: [725, 480], forest: [480, 580], ruin: [270, 615],
  mountain: [190, 130], marsh: [800, 620], coast: [900, 355], tower: [435, 145],
  camp: [250, 340], gate: [625, 165], citadel: [790, 205], sanctuary: [105, 465],
};
const EXTRA_ROADS = [
  ['home', 'camp'], ['camp', 'sanctuary'], ['camp', 'mountain'], ['mountain', 'tower'],
  ['tower', 'city'], ['tower', 'gate'], ['city', 'gate'], ['gate', 'citadel'],
  ['citadel', 'coast'], ['coast', 'brook'], ['brook', 'marsh'], ['marsh', 'forest'],
  ['sanctuary', 'ruin'], ['sanctuary', 'home'], ['city', 'citadel'],
];
function baseServices(id) {
  return ({ home: ['hearth', 'shrine', 'market'], city: ['academy', 'order', 'market', 'smith', 'hearth', 'mentor'], brook: ['hearth', 'herbalist', 'market'], forest: ['guide', 'herbs'], ruin: ['archive'] })[id] || [];
}
function addSites(world, seed) {
  for (const [id, names, travelDays, safety, services, description] of EXTRA_SITES) {
    if (world.locations.some(location => location.id === id)) continue;
    world.locations.push({ id, name: placeName(seed, id, id), type: id, travelDays, safety, services: [...services], necromancyLaw: id === 'sanctuary' ? 'permitted' : pick(seed, `map-law-${id}`, LAWS), status: 'thriving', description });
  }
  for (const [from, to] of EXTRA_ROADS) {
    if (!world.roads.some(road => road.from === from && road.to === to || road.from === to && road.to === from)) world.roads.push({ from, to });
  }
}
const OPTIONAL_SITES = [
  ['mill','village',3,4,['market','hearth','smith'],'A water-powered mill town repairs tools, grinds grain, and shelters households displaced by upstream floods.'],
  ['quarry','mountain',4,2,['mine','guide','smith'],'A quarry settlement hangs above exposed stone. Shifts end at a public bell, and workers keep a shared rescue fund.'],
  ['island','coast',5,3,['ferry','market','hearth'],'An island landing shelters fisher households, boat-builders, and a keeper who records the names of ships that never returned.'],
  ['border','gate',4,3,['order','guide','market'],'A second border crossing draws caravan guides and watch-keepers who disagree over whose seals the road should recognize.'],
  ['abbey','sanctuary',3,5,['shrine','academy','hearth'],'A quiet abbey preserves remedies and shelter registers. Lay workers maintain its gardens alongside the sworn keepers.'],
  ['orchard','village',2,4,['market','herbalist','hearth'],'An orchard hamlet dries fruit for the winter and teaches grafting, brewing, and the patient repair of pruning tools.'],
  ['crypt','ruin',5,1,['archive','guide'],'An abandoned burial house preserves sealed names and disputed consent records. Its keepers’ descendants ask visitors to leave the dead undisturbed.'],
  ['foundry','city',4,3,['smith','market','mentor','hearth'],'A foundry ward surrounds a communal furnace. Independent makers share heat, compete for commissions, and train apprentices from distant homes.'],
];
OPTIONAL_SITES.push(
  ['haven','coast',5,3,['market','hearth','guide'],'A harbor beneath a shattered giant’s rib trades salt, monster oil and foreign charms.'],
  ['barrow','ruin',4,1,['archive','guide'],'A field of crowned barrows opens its gates when rival kings go to war.'],
  ['grove','forest',4,3,['guide','herbs','shrine'],'Old roots shelter a nameless congregation; their antlered saints walk after rain.'],
  ['saltmine','mountain',5,2,['smith','guide'],'Salt passages descend beneath a mountain whose veins preserve impossible bones.'],
  ['crossroads','camp',3,4,['market','hearth','guide'],'A ring of wagons shelters bounty seekers, oath breakers and wandering households.'],
  ['fort','citadel',5,4,['order','smith','market','hearth'],'A black fortress guards a contested pass. Its banners change; its stones remember.'],
  ['spire','tower',5,2,['academy','archive','mentor'],'A ruined stair still holds an academy of eclipses, watched by faceless sentinels.'],
  ['fenhold','marsh',4,2,['hearth','herbalist','guide'],'Stilt houses stand above drowned walls. Fishing nets sometimes bring up speaking masks.'],
  ['wells','village',4,3,['market','hearth','shrine'],'Seven wells sustain a dryland settlement. Each well is sworn to a different ancestor.'],
  ['monastery','sanctuary',5,5,['academy','order','hearth','shrine'],'A refuge monastery offers shelter while its keepers dispute which gods still answer.'],
  ['port','city',5,3,['market','smith','hearth','mentor'],'A crowded port sells relics beside fish stalls. Pilgrims and soldiers take the same ships.'],
  ['waste','ruin',6,1,['guide','archive'],'Glass dunes cover a vanished capital. The dead sun shines beneath the sand.']
);
function addOptionalSites(world,seed) {
  const count=12+seededRoll(seed,'optional-site-count',8);
  const ordered=[...OPTIONAL_SITES].sort((a,b)=>seededRoll(seed,`optional-order-${a[0]}`,100000)-seededRoll(seed,`optional-order-${b[0]}`,100000)||a[0].localeCompare(b[0]));
  for(const [id,type,travelDays,safety,services,description] of ordered.slice(0,count)) world.locations.push({id,type,name:placeName(seed,id,type),travelDays,safety,services:[...services],description,necromancyLaw:pick(seed,`optional-law-${id}`,LAWS),status:'thriving'});
}
function makeVariedMap(seed,locations) {
  const topology=pick(seed,'atlas-topology',['river-basin','broken-coast','highland','island-chain','wooded-basin','estuary']);
  const flipX=seededRoll(seed,'atlas-east-west',2),flipY=seededRoll(seed,'atlas-north-south',2);
  const transform=([x,y])=>[Math.round(flipX?1000-x:x),Math.round(flipY?700-y:y)];
  const landmasses=authoredLandV32(seed,topology,{roll:seededRoll,name:atlasName});
  const lakes=[];
  if(['highland','wooded-basin'].includes(topology)) {
    const center=topology==='highland'?[420+seededRoll(seed,'lake-x',160),350+seededRoll(seed,'lake-y',100)]:[420+seededRoll(seed,'lake-x',160),240+seededRoll(seed,'lake-y',160)];
    lakes.push({id:'deep-lake',type:'water',label:atlasName(seed,'lake').toUpperCase(),points:oval(seed,'deep-lake',...center,70+seededRoll(seed,'lake-width',65),45+seededRoll(seed,'lake-depth',40),24)});
  }
  const inside=point=>landmasses.some(l=>pointInPolygon(point,l.points))&&!lakes.some(l=>pointInPolygon(point,l.points));
  const nodes=placeAtlasSitesV32(seed,locations,landmasses,lakes,{roll:seededRoll});
  const node=id=>nodes.find(n=>n.id===id);
  const terrain=[...lakes];
  const regions=[];
  for(const [type,id,anchor,rx,ry] of [['mountain','ridge-country','mountain',170,110],['forest','old-wood','forest',155,105],['marsh','reed-country','marsh',100,75]]) {
    const center=node(anchor),name=atlasName(seed,id),points=oval(seed,`terrain-${id}`,center.x,center.y,rx+seededRoll(seed,`terrain-width-${id}`,45),ry+seededRoll(seed,`terrain-height-${id}`,35),28);
    terrain.push({id,type,label:name.toUpperCase(),points});regions.push({id,name,x:center.x,y:Math.max(32,center.y-ry*.6),type});
  }
  // Extra woods and foothills create different silhouettes and useful visual bearings.
  for(let i=0;i<1+seededRoll(seed,'secondary-groves',3);i++) {
    const host=nodes[seededRoll(seed,`grove-host-${i}`,nodes.length)];
    terrain.push({id:`grove-${i}`,type:i===2?'mountain':'forest',label:'',points:oval(seed,`grove-${i}`,host.x,host.y,60+seededRoll(seed,`grove-width-${i}`,80),40+seededRoll(seed,`grove-depth-${i}`,55),20)});
  }
  const rivers=[];
  const ridge=node('mountain'),brook=node('brook'),coast=node('coast');
  if(topology!=='island-chain') {
    const mouth=nearestBoundary([coast.x,coast.y],landmasses[0].points);
    rivers.push({id:'great-river',name:atlasName(seed,'river'),points:flowPoints(seed,'great-river',[[ridge.x,ridge.y],[brook.x+12,brook.y+12],mouth]),width:topology==='estuary'?9:5});
    if(['river-basin','estuary'].includes(topology)) {
      const marsh=node('marsh'),join=rivers[0].points[Math.floor(rivers[0].points.length*.55)];
      rivers.push({id:'reed-river',name:atlasName(seed,'reed-river'),points:flowPoints(seed,'reed-river',[[marsh.x,marsh.y],join]),width:3});
    }
  } else {
    for(let i=0;i<2;i++){const mass=landmasses[i];rivers.push({id:`island-stream-${i}`,name:atlasName(seed,`stream-${i}`),points:flowPoints(seed,`stream-${i}`,[[mass.cx,mass.cy-80],[mass.cx+mass.rx*.8,mass.cy+60]]),width:3});}
  }
  const ridges=[{id:'high-spine',name:atlasName(seed,'ridge'),points:flowPoints(seed,'ridge',[[ridge.x-130,ridge.y+35],[ridge.x,ridge.y-15],[ridge.x+150,ridge.y+35]])}];
  const landmarks=[];
  for(const patch of terrain.filter(t=>t.type==='mountain'||t.type==='forest')) {
    for(let i=0;i<(patch.type==='mountain'?14:25);i++) {
      const minX=Math.min(...patch.points.map(p=>p[0])),maxX=Math.max(...patch.points.map(p=>p[0])),minY=Math.min(...patch.points.map(p=>p[1])),maxY=Math.max(...patch.points.map(p=>p[1]));
      const x=minX+seededRoll(seed,`landmark-${patch.id}-${i}-x`,Math.max(1,Math.floor(maxX-minX))),y=minY+seededRoll(seed,`landmark-${patch.id}-${i}-y`,Math.max(1,Math.floor(maxY-minY)));
      if(inside([x,y])&&pointInPolygon([x,y],patch.points)&&nodes.every(n=>Math.hypot(n.x-x,n.y-y)>32)) landmarks.push({id:`${patch.id}-${i}`,type:patch.type==='mountain'?'peak':'tree',x,y,scale:.6+seededRoll(seed,`landmark-scale-${patch.id}-${i}`,65)/100});
    }
  }
  const atlas={version:1,topology,name:atlasName(seed,'sea'),landmasses:landmasses.map(({id,name,points})=>({id,name,points:points.map(transform)})),rivers:rivers.map(r=>({...r,points:r.points.map(transform)})),ridges:ridges.map(r=>({...r,points:r.points.map(transform)})),regions:regions.map(r=>{const [x,y]=transform([r.x,r.y]);return {...r,x,y};})};
  return {generationVersion:6,width:1000,height:700,expanded:true,nodes:locations.map(l=>{const n=node(l.id),[x,y]=transform([n.x,n.y]);return {id:n.id,x,y};}),terrain:terrain.map(t=>({...t,points:t.points.map(transform)})),landmarks:landmarks.slice(0,100).map(l=>{const [x,y]=transform([l.x,l.y]);return {...l,x,y};}),atlas};
}

function placementPriority(site) {return ['coast','island'].includes(site.id)?0:['mountain','forest','marsh','brook'].includes(site.id)?1:2;}
function atlasName(seed,id) {
  const root=pick(seed,`atlas-name-root-${id}`,NAME_ROOTS);
  const forms=id==='sea'?[`The ${root} Sea`,`${root} Sound`,`The ${root} Firth`]:id.includes('river')||id.includes('stream')?[`${root}water`,`The ${root} Run`,`${root} Beck`]:id==='lake'?[`${root} Mere`,`The ${root} Lake`,`${root}water`]:id==='old-wood'?[`${root} Weald`,`The ${root} Woods`,`${root}grove`]:id==='reed-country'?[`${root} Fen`,`The ${root} Reeds`,`${root} Mire`]:id==='ridge'||id==='ridge-country'?[`${root}spine`,`The ${root} Teeth`,`${root} Heights`]:id==='small'||id==='outer'?[`${root} Isle`,`The ${root} Islands`,`${root} Holm`]:[`${root} Reach`,`The ${root} Downs`,`${root} Vale`];
  return pick(seed,`atlas-name-ending-${id}`,forms);
}
function oval(seed,salt,cx,cy,rx,ry,count) {return Array.from({length:count},(_,i)=>{const angle=i*Math.PI*2/count,bulge=.85+seededRoll(seed,`${salt}-outline-${i}`,25)/100;return [Math.round(Math.max(8,Math.min(992,cx+Math.cos(angle)*rx*bulge))),Math.round(Math.max(8,Math.min(692,cy+Math.sin(angle)*ry*bulge)))];});}
function pointInPolygon([x,y],points) {let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function boundaryDistance(point,points) {let closest=Infinity;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1)));closest=Math.min(closest,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy));}return closest;}
function nearestBoundary(point,points) {return points.reduce((a,b)=>Math.hypot(a[0]-point[0],a[1]-point[1])<Math.hypot(b[0]-point[0],b[1]-point[1])?a:b);}
function flowPoints(seed,id,waypoints) {const result=[];for(let i=0;i<waypoints.length-1;i++){const a=waypoints[i],b=waypoints[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(1,Math.hypot(dx,dy)),bend=seededRoll(seed,`flow-${id}-${i}`,71)-35;for(let j=0;j<9;j++){const t=j/8,offset=Math.sin(t*Math.PI)*bend;const point=[Math.round(Math.max(8,Math.min(992,a[0]+dx*t-dy/length*offset))),Math.round(Math.max(8,Math.min(692,a[1]+dy*t+dx/length*offset)))];if(i===0||j>0)result.push(point);}}return result;}

function siteHistory(seed,site,world) {
  const relative=world.locations.find(l=>l.id!==site.id&&l.type==='village')?.name||world.name;
  const histories={city:[`The oldest ward still hangs the keys of a gate that no longer stands.`,`On wash days, apprentices carry dyed cloth across the square; the ${relative} carts wait until it dries.`,`A narrow stair beneath the market ends at the door of the former mint. Nobody has removed its seals.`],village:[`A pear tree grows through the roof of the old toll house. The children use its branches as a lookout.`,`The well cover bears the names of three households, though only two remain on this road.`,`At dusk, the baker leaves the last loaf on the wall for whoever returns late.`],forest:[`White cloth is tied to the first trees on each safe trail. Some of the older knots have grown into the bark.`,`Charcoal pits lie under the fern beds. A rusted pan still hangs from a keeper’s shelter.`,`The trees lean away from a clearing where no birds settle before sunrise.`],ruin:[`Someone has swept the stairs recently. Small muddy footprints stop at the sealed inner door.`,`A row of empty hooks remains beside the entrance; the wall beneath each is lighter than the stone around it.`,`Visitors leave pebbles on the sill. The oldest pile has been arranged into a name.`],mountain:[`The miners set aside a cup at the shift bell for a worker lost before the last thaw.`,`A shelter door is painted blue so it can be found through falling snow.`,`Children sort the discarded stone into little cairns along the lower path.`],marsh:[`Old doorframes stand above the reeds at low water. Lamps are still left on one of them.`,`The boardwalk bends around a willow hung with missing ferry tokens.`,`On dry mornings, the gatherers can hear their neighbors working beyond the mist.`],coast:[`A boat’s name has been scraped from the harbor wall and written again by another hand.`,`The fishers mend green nets while the foreign crews mend red ones. They share the same fire.`,`Every incoming ship sounds its bell twice. The third ring is reserved for an empty berth.`],tower:[`The northern window is boarded over. Students copy the sky from the stair instead.`,`A cracked lens is kept on the supper table as a weight for unfinished letters.`,`The keeper records cloudy nights in the same careful script as clear ones.`],camp:[`A wheel without a wagon marks the meeting place. Someone has planted thyme inside its rim.`,`Children know the camp songs by which verse their household sings loudest.`,`The cook’s tent shelters a chest of things left by people who promised to return.`],gate:[`The watcher’s ledger has one page sewn shut with black thread.`,`Two different crests have been painted over the toll arch; rain is uncovering the older one.`,`A row of worn shoes hangs inside the gatehouse, each with a scrap of travel papers tucked into it.`],citadel:[`A bell rope runs through the smiths’ yard so the workers can hear the watch change.`,`The outer wall has a sheltered notch filled with flowers and children’s carved soldiers.`,`The oldest drill yard is now a vegetable garden, though the flagpole remains.`],sanctuary:[`The door jambs are marked with the heights of children who arrived here in different winters.`,`The supper room keeps mismatched cups; nobody is asked to explain where theirs came from.`,`A worn notice asks visitors to leave names rather than coins beside the shrine.`]};
  return pick(seed,`site-lived-history-${site.id}`,histories[site.type]||histories.village);
}
function makeVariedRoads(seed,world) {
  const nodes=new Map(world.map.nodes.map(n=>[n.id,n])),edges=[];
  for(let i=0;i<world.locations.length;i++)for(let j=i+1;j<world.locations.length;j++) {
    const from=world.locations[i].id,to=world.locations[j].id,a=nodes.get(from),b=nodes.get(to),distance=Math.hypot(a.x-b.x,a.y-b.y);
    edges.push({from,to,distance,score:distance*(.65+seededRoll(seed,`road-shape-${[from,to].sort().join('-')}`,100)/100)});
  }
  edges.sort((a,b)=>a.score-b.score||a.from.localeCompare(b.from)||a.to.localeCompare(b.to));
  const parent=new Map(world.locations.map(l=>[l.id,l.id]));
  const root=id=>{while(parent.get(id)!==id)id=parent.get(id);return id;};
  const chosen=[];
  for(const edge of edges)if(root(edge.from)!==root(edge.to)){parent.set(root(edge.from),root(edge.to));chosen.push(edge);}
  const extra=3+seededRoll(seed,'road-loop-count',6);
  for(const edge of edges.filter(e=>!chosen.includes(e)&&e.distance<490).sort((a,b)=>seededRoll(seed,`road-loop-${a.from}-${a.to}`,100000)-seededRoll(seed,`road-loop-${b.from}-${b.to}`,100000)).slice(0,extra))chosen.push(edge);
  return chosen.map(e=>{
    const a=nodes.get(e.from),b=nodes.get(e.to),points=(world.map.generationVersion>=6?roadWaypointsV32(a,b,world.map):null)||flowPoints(seed,`road-${[e.from,e.to].sort().join('-')}`,[[a.x,a.y],[b.x,b.y]]);
    const survey=world.map.generationVersion>=6?points.flatMap((p,i)=>{if(!i)return [p];const a=points[i-1],steps=Math.max(1,Math.ceil(Math.hypot(p[0]-a[0],p[1]-a[1])/6));return Array.from({length:steps},(_,j)=>[a[0]+(p[0]-a[0])*(j+1)/steps,a[1]+(p[1]-a[1])*(j+1)/steps]);}):points;
    const crossing=survey.some(p=>!world.map.atlas.landmasses.some(l=>pointInPolygon(p,l.points))||world.map.terrain.some(t=>t.type==='water'&&pointInPolygon(p,t.points)))?'water':'land';
    return {from:e.from,to:e.to,points,crossing,days:Math.max(1,Math.min(world.map.generationVersion>=7?16:6,Math.round(e.distance/(world.map.generationVersion>=7?55:150))+seededRoll(seed,`road-duration-${e.from}-${e.to}`,2))),danger:Math.max(1,Math.min(5,6-Math.min(world.locations.find(l=>l.id===e.from).safety,world.locations.find(l=>l.id===e.to).safety))),kind:crossing==='water'?'ferry crossing':pick(seed,`road-surface-${e.from}-${e.to}`,['old causeway','rutted trade road','marked footpath','watch road','river track','stone pilgrims’ road'])};
  });
}
function addRoadDays(world, seed) {
  for (const road of world.roads) {
    if (!Number.isInteger(road.days) || road.days < 1) road.days = 1 + seededRoll(seed, `map-road-days-${[road.from, road.to].sort().join('-')}`, 3);
    if (!Number.isInteger(road.danger)) road.danger = Math.max(1, 6 - Math.min(world.locations.find(l => l.id === road.from)?.safety || 3, world.locations.find(l => l.id === road.to)?.safety || 3));
  }
}
function makeMap(seed, locations, expanded) {
  const flip = seededRoll(seed, 'map-orientation', 2) === 1;
  const transform = (x, y, salt) => [Math.round(flip ? 1000 - x : x) + seededRoll(seed, `${salt}-x`, 35) - 17, Math.round(y) + seededRoll(seed, `${salt}-y`, 31) - 15];
  const polygon = (id, type, points, label) => ({ id, type, label, points: points.map(([x, y], i) => transform(x, y, `map-terrain-${id}-${i}`)) });
  const terrain = [
    polygon('uplands', 'mountain', [[30, 20], [640, 20], [690, 190], [400, 250], [165, 290], [30, 185]], 'THE HIGH COUNTRY'),
    polygon('woodlands', 'forest', [[220, 475], [490, 405], [705, 495], [655, 680], [230, 680], [160, 600]], 'THE OLD WOODS'),
    polygon('reedbeds', 'marsh', [[690, 480], [890, 470], [940, 700], [670, 700]], 'THE LOW FENS'),
    polygon('sea', 'water', [[945, 0], [1000, 0], [1000, 700], [945, 700], [922, 500], [954, 420], [922, 230]], 'THE DAWN SEA'),
  ];
  const landmarks = [];
  for (let i = 0; i < 25; i++) {
    const [x, y] = transform(210 + seededRoll(seed, `map-tree-x-${i}`, 430), 455 + seededRoll(seed, `map-tree-y-${i}`, 175), `map-tree-${i}`);
    landmarks.push({ id: `tree-${i}`, type: 'tree', x, y, scale: .65 + seededRoll(seed, `map-tree-scale-${i}`, 60) / 100 });
  }
  for (let i = 0; i < 13; i++) {
    const [x, y] = transform(85 + seededRoll(seed, `map-peak-x-${i}`, 490), 58 + seededRoll(seed, `map-peak-y-${i}`, 160), `map-peak-${i}`);
    landmarks.push({ id: `peak-${i}`, type: 'peak', x, y, scale: .7 + seededRoll(seed, `map-peak-scale-${i}`, 55) / 100 });
  }
  return { generationVersion: 3, width: 1000, height: 700, expanded, nodes: locations.map(location => { const [x, y] = transform(...(POSITIONS[location.id] || [500, 350]), `map-node-${location.id}`); return { id: location.id, x, y }; }), terrain, landmarks };
}

/** Add geography to a saved region without replacing its people, laws, or damaged places. */
export function expandWorld(value, seed = 'hearth') {
  const world = structuredClone(value);
  world.changes ||= [];
  for (const location of world.locations) {
    location.status ||= 'thriving';
    location.services ||= baseServices(location.id);
  }
  // Complete saved regions keep their exact geography, including older road topology.
  const complete = world.map?.expanded && ['mountain','marsh','coast','tower','camp','gate','citadel','sanctuary'].every(id=>world.locations.some(l=>l.id===id));
  if (!complete) addSites(world, seed);
  addRoadDays(world, seed);
  if (!world.map?.expanded || world.map.nodes?.length !== world.locations.length) world.map = makeMap(seed, world.locations, true);
  return world;
}

/** Deterministic shortest route; map coordinates never substitute for travel cost. */
export function findRoute(world, from, to) {
  if (!world?.locations?.some(l => l.id === from) || !world.locations.some(l => l.id === to)) return [];
  if (from === to) return [from];
  const distance = new Map([[from, 0]]), previous = new Map(), pending = new Set(world.locations.map(l => l.id));
  while (pending.size) {
    const current = [...pending].sort((a, b) => (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity) || a.localeCompare(b))[0];
    if (!Number.isFinite(distance.get(current))) break;
    pending.delete(current);
    if (current === to) break;
    for (const road of world.roads || []) {
      const next = road.from === current ? road.to : road.to === current ? road.from : null;
      if (!next || !pending.has(next) || road.closed === true) continue;
      const days = Number.isInteger(road.days) && road.days > 0 ? road.days : world.locations.find(l => l.id === next)?.travelDays || 1;
      const candidate = distance.get(current) + days;
      if (candidate < (distance.get(next) ?? Infinity)) { distance.set(next, candidate); previous.set(next, current); }
    }
  }
  if (!distance.has(to)) return [];
  const route = [to];
  while (route[0] !== from) { const id = previous.get(route[0]); if (!id) return []; route.unshift(id); }
  return route;
}

export function travelPreview(state, id) {
  const world = state?.world, destination = world?.locations?.find(l => l.id === id);
  if (!destination) return { route: [], days: 0, legs: [], description: 'This place is not in your region.', disabledReason: 'Unknown destination.', status: null, services: [] };
  const modern = state.timeline?.mode === 'birth';
  const route = modern ? findRoute(world, state.locationId, id) : state.locationId === id ? [id] : [state.locationId, id];
  const legs = route.slice(1).map((to, index) => { const from = route[index]; const road = world.roads?.find(r => r.from === from && r.to === to || r.from === to && r.to === from); return { from, to, days: modern ? road?.days || world.locations.find(l => l.id === to)?.travelDays || 1 : destination.travelDays, danger: road?.danger || 6 - destination.safety }; });
  const days = legs.reduce((sum, leg) => sum + leg.days, 0);
  const status = destination.status || 'thriving';
  const services = status === 'destroyed' || status === 'evacuated' ? [] : [...(destination.services || baseServices(id))];
  let disabledReason;
  if (state.locationId === id) disabledReason = 'You are already here.';
  else if (!route.length) disabledReason = 'No open road reaches this destination.';
  else if (modern && state.age < 14) disabledReason = 'Independent regional travel begins at age fourteen.';
  else if (!modern && state.phase !== 'adult') disabledReason = 'Travel becomes available in adulthood.';
  else if (state.event || state.battle || state.conversations?.pending || state.dungeon && !state.dungeon.complete) disabledReason = 'Resolve your current moment before setting out.';
  else if (state.timeline?.journey) disabledReason = 'Continue or resolve your existing road journey before setting out again.';
  else if (state.workshop?.project) disabledReason = 'Finish or cancel your committed project before traveling.';
  const description = `${days} ${days === 1 ? 'day' : 'days'} on the road${route.length > 2 ? `, through ${route.length - 2} waypoints` : ''}. ${status === 'destroyed' ? 'The settlement has been destroyed. Its ruins remain reachable; services have ceased.' : status === 'evacuated' ? 'The settlement has been evacuated. Services are unavailable.' : status === 'scarred' ? 'The settlement bears lasting damage.' : destination.safety <= 2 ? 'Prepare for an unsettled route.' : 'Follow the marked roads.'}`;
  return { route, days, legs, description, ...(disabledReason ? { disabledReason } : {}), status, services };
}

export function validateWorld(world) {
  if (!world || typeof world !== 'object') return false;
  if (![world.name, world.crisis, world.laws].every(value => typeof value === 'string' && value.trim())) return false;
  if (world.culture !== undefined && (typeof world.culture !== 'string' || world.culture.length > 2000)) return false;
  if (world.festival !== undefined && (!world.festival || typeof world.festival.name !== 'string' || typeof world.festival.tradition !== 'string' || !Number.isInteger(world.festival.day) || world.festival.day < 0 || world.festival.day > 364)) return false;
  if (world.environment !== undefined && (!world.environment || !REGIONAL_PROFILES.some(p=>p.id===world.environment.profileId) || !['climate','resource','pressure'].every(k=>typeof world.environment[k]==='string'&&world.environment[k].length>0&&world.environment[k].length<2000))) return false;
  if (world.rumors !== undefined && (!Array.isArray(world.rumors) || world.rumors.length > 10 || !world.rumors.every(rumor => typeof rumor === 'string' && rumor.length <= 2000))) return false;
  if (!Array.isArray(world.locations) || world.locations.length < 5 || world.locations.length > 84) return false;
  const ids = new Set();
  for (const location of world.locations) {
    if (!location || typeof location !== 'object' || ids.has(location.id)) return false;
    const generated=world.map?.generationVersion>=7&&/^(seat-(rainward|saltreach|highstone|blackgrove|ashplain|bellwater)|reach-(rainward|saltreach|highstone|blackgrove|ashplain|bellwater)-[1-7])$/.test(location.id);
    if (!(Object.hasOwn(LOCATION_TYPES, location.id)&&location.type===LOCATION_TYPES[location.id]||generated&&location.type===({0:'city',1:'village',2:'village',3:'camp',4:'sanctuary',5:'ruin',6:'forest',7:'mountain'})[location.id.startsWith('seat-')?0:location.id.at(-1)])) return false;
    if(location.regionId!==undefined&&!REGIONAL_PROFILES.some(r=>r.id===location.regionId))return false;
    if (![location.name, location.description].every(value => typeof value === 'string' && value.trim())) return false;
    if (!Number.isInteger(location.travelDays) || location.travelDays < 1) return false;
    if (!Number.isInteger(location.safety) || location.safety < 1 || location.safety > 5) return false;
    if (!LAWS.includes(location.necromancyLaw)) return false;
    if (location.status !== undefined && !['thriving', 'scarred', 'evacuated', 'destroyed'].includes(location.status)) return false;
    if (location.services !== undefined && (!Array.isArray(location.services) || location.services.length > 20 || !location.services.every(service => typeof service === 'string' && service.length < 80))) return false;
    if (location.institutions !== undefined && (!Array.isArray(location.institutions) || location.institutions.length > 8 || new Set(location.institutions.map(institution => institution?.id)).size !== location.institutions.length || !location.institutions.every(institution => institution && typeof institution === 'object' && typeof institution.id === 'string' && institution.id.length > 0 && institution.id.length < 100 && ['community', 'shrine', 'academy', 'order', 'workshop', 'herbalist', 'guide', 'archive', 'ferry'].includes(institution.kind) && typeof institution.name === 'string' && institution.name.length > 0 && institution.name.length < 240 && typeof institution.witness === 'string' && institution.witness.length > 0 && institution.witness.length < 160 && typeof institution.history === 'string' && institution.history.length > 0 && institution.history.length < 3000))) return false;
    ids.add(location.id);
  }
  if (!['home', 'city', 'brook', 'forest', 'ruin'].every(id => ids.has(id))) return false;
  if (!Array.isArray(world.roads) || !Array.isArray(world.mentors)) return false;
  const links = new Map([...ids].map(id => [id, new Set()]));
  for (const road of world.roads) {
    if (!road || !ids.has(road.from) || !ids.has(road.to) || road.from === road.to) return false;
    if (road.days !== undefined && (!Number.isInteger(road.days) || road.days < 1 || road.days > 30)) return false;
    if (road.danger !== undefined && (!Number.isInteger(road.danger) || road.danger < 1 || road.danger > 5)) return false;
    if (road.crossing !== undefined && !['land','water'].includes(road.crossing)) return false;
    if (road.points !== undefined) {
      if(!validAtlasPoints(road.points,2,80))return false;
      const from=world.map?.nodes?.find(n=>n.id===road.from),to=world.map?.nodes?.find(n=>n.id===road.to);
      if(!from||!to||Math.hypot(road.points[0][0]-from.x,road.points[0][1]-from.y)>2||Math.hypot(road.points.at(-1)[0]-to.x,road.points.at(-1)[1]-to.y)>2)return false;
    }
    links.get(road.from).add(road.to);
    links.get(road.to).add(road.from);
  }
  if (world.changes !== undefined && (!Array.isArray(world.changes) || world.changes.length > 500 || !world.changes.every(change => change && typeof change.id === 'string' && Number.isInteger(change.day) && change.day >= 0 && ids.has(change.locationId) && typeof change.title === 'string' && typeof change.text === 'string'))) return false;
  if (world.map !== undefined) {
    const map = world.map;
    if (!map || map.width !== 1000 || map.height !== 700 || ![3,4,5,6,7].includes(map.generationVersion) || typeof map.expanded !== 'boolean' || !Array.isArray(map.nodes) || map.nodes.length !== ids.size) return false;
    const mapped = new Set();
    for (const node of map.nodes) { if (!node || !ids.has(node.id) || mapped.has(node.id) || !Number.isFinite(node.x) || !Number.isFinite(node.y) || node.x < 0 || node.x > map.width || node.y < 0 || node.y > map.height) return false; mapped.add(node.id); }
    if (!Array.isArray(map.terrain) || !Array.isArray(map.landmarks)) return false;
    if (map.terrain.length > 30 || !map.terrain.every(t => t && typeof t.id === 'string' && ['mountain', 'forest', 'marsh', 'water'].includes(t.type) && typeof t.label === 'string' && Array.isArray(t.points) && t.points.length >= 3 && t.points.length < 100 && t.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= -40 && n <= 1040)))) return false;
    if (map.landmarks.length > 100 || !map.landmarks.every(l => l && typeof l.id === 'string' && ['tree', 'peak'].includes(l.type) && [l.x,l.y,l.scale].every(Number.isFinite) && l.scale > 0 && l.scale < 3)) return false;
    if(map.generationVersion>=5&&map.atlas===undefined)return false;
    if(map.atlas!==undefined&&!validateAtlas(map.atlas,map))return false;
    if(map.generationVersion>=7&&(!world.locations.every(p=>p.regionId===territoryAt(world,map.nodes.find(n=>n.id===p.id).x,map.nodes.find(n=>n.id===p.id).y))||!map.atlas.territories.every(r=>r.capitalId==='seat-'+r.id&&world.locations.some(p=>p.id===r.capitalId&&p.regionId===r.id))))return false;
  }
  const reached = new Set(['home']);
  const pending = ['home'];
  while (pending.length) {
    for (const next of links.get(pending.pop())) {
      if (!reached.has(next)) {
        reached.add(next);
        pending.push(next);
      }
    }
  }
  if (reached.size !== ids.size) return false;
  for (const specialization of ['paladin', 'necromancer', 'assassin']) {
    const route = world.routes?.[specialization];
    if (!route || !Array.isArray(route.locationIds) || !route.locationIds.includes('city') || !route.locationIds.includes('ruin')) return false;
    if (!route.locationIds.every(id => reached.has(id))) return false;
    const mentor = world.mentors.find(person => person?.id === route.mentorId);
    if (!mentor || mentor.specialization !== specialization || mentor.available !== true || !reached.has(mentor.locationId)) return false;
    if (typeof mentor.name !== 'string' || !mentor.name.trim()) return false;
  }
  return true;
}

function validAtlasPoints(points,min,max) {return Array.isArray(points)&&points.length>=min&&points.length<=max&&points.every(p=>Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&p[0]>=0&&p[0]<=1000&&p[1]>=0&&p[1]<=700);}
function validateAtlas(atlas,map) {
  const named=item=>item&&typeof item.id==='string'&&item.id.length>0&&item.id.length<100&&typeof item.name==='string'&&item.name.length>0&&item.name.length<180;
  const distinct=items=>new Set(items.map(i=>i?.id)).size===items.length;
  if(!atlas||atlas.version!==1||!['river-basin','broken-coast','highland','island-chain','wooded-basin','estuary'].includes(atlas.topology)||typeof atlas.name!=='string'||atlas.name.length===0||atlas.name.length>180)return false;
  if(!Array.isArray(atlas.landmasses)||atlas.landmasses.length<1||atlas.landmasses.length>8||!distinct(atlas.landmasses)||!atlas.landmasses.every(l=>named(l)&&validAtlasPoints(l.points,3,80)))return false;
  if(!Array.isArray(atlas.rivers)||atlas.rivers.length>12||!distinct(atlas.rivers)||!atlas.rivers.every(r=>named(r)&&validAtlasPoints(r.points,2,80)&&Number.isFinite(r.width)&&r.width>=1&&r.width<=20))return false;
  if(!Array.isArray(atlas.ridges)||atlas.ridges.length>12||!distinct(atlas.ridges)||!atlas.ridges.every(r=>named(r)&&validAtlasPoints(r.points,2,80)))return false;
  if(!Array.isArray(atlas.regions)||atlas.regions.length>20||!distinct(atlas.regions)||!atlas.regions.every(r=>named(r)&&['forest','mountain','marsh','water','plain'].includes(r.type)&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.x>=0&&r.x<=1000&&r.y>=0&&r.y<=700))return false;
  if(map.generationVersion>=7&&(!Array.isArray(atlas.territories)||atlas.territories.length!==6||!distinct(atlas.territories)||!atlas.territories.every(r=>named(r)&&REGIONAL_PROFILES.some(p=>p.id===r.id)&&Number.isFinite(r.x)&&Number.isFinite(r.y)&&r.x>=0&&r.x<=1000&&r.y>=0&&r.y<=700&&map.nodes.some(n=>n.id===r.capitalId))))return false;
  // A reachable place always occupies land; water-crossing roads remain explicit.
  if(!map.nodes.every(n=>atlas.landmasses.some(l=>pointInPolygon([n.x,n.y],l.points))&&!map.terrain.some(t=>t.type==='water'&&pointInPolygon([n.x,n.y],t.points))))return false;
  return true;
}
