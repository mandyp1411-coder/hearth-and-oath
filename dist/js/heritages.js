// Homeland and family traditions describe a history, never a calling or morality.
const lands = ['ashlands', 'sunlands', 'sable_coast'];
const peoples = {
  human: [
    ['Ashland hearths', 'Families from the cold ash country keep hearth names and winter burial songs. Their light-complexioned portraits carry the faces of that homeland.', 'A coal is kept from the first fire lit in a new home.'],
    ['Sunland caravans', 'The sun country is a web of wells, market towns and caravan kin. Its medium-complexioned portraits belong to families who carry stories between those places.', 'A traveler leaves a verse beside the name of the well that sheltered them.'],
    ['Sable Coast', 'Deep-complexioned coastal families preserve sea routes, wreck accounts and the names of kin living inland.', 'A bell answers each name spoken for someone who never returned from the sea.'],
  ],
  elf: [
    ['Ashwood kindreds', 'Light-complexioned Ashwood families tend the pale forests and remember their dead through living root gardens.', 'The first song of a child is added to the household tree’s record.'],
    ['Sunbough kindreds', 'Medium-complexioned Sunbough families descend from the dry southern groves. Their histories travel in songs and embroidered cloth.', 'A new name is witnessed under the oldest surviving branch.'],
    ['Nighttide kindreds', 'Deep-complexioned Nighttide families trace their kin through coastal gardens, moon observatories and long sea journeys.', 'A garden lamp is lit for every relative traveling beyond the coast.'],
  ],
  dwarf: [
    ['Cinder halls', 'Cinder-hall households descend from the northern furnace towns. They preserve the makers’ names on repaired tools.', 'The oldest repaired tool is placed at the winter table.'],
    ['Sunforge clans', 'Sunforge clans grew around the southern copper roads. Their families include traders, stone readers and wandering craftspeople.', 'A first finished work receives the witnesses’ marks beside its maker’s.'],
    ['Sable delves', 'Sable-delve families remember the sea caves and drowned quarries of the coast. Their records name the workers who kept each passage safe.', 'A lamp is left at the mouth of a reopened tunnel.'],
  ],
  halfling: [
    ['Ashmeadow households', 'Ashmeadow families keep cold-country gardens and long accounts of hospitality through lean winters.', 'An empty chair at supper belongs to the next traveler.'],
    ['Sunfield households', 'Sunfield households descend from orchard towns and the wagons that carry their seed between settlements.', 'A handful of seeds travels with anyone leaving home.'],
    ['Sablebank households', 'Sablebank kin live along tidal gardens and ferry landings, remembering the people who shared a crossing in hard weather.', 'The first meal after a journey includes a place for the ferryman.'],
  ],
  orc: [
    ['Ashridge kin', 'Ashridge kin trace their households through upland refuges and the public promises that kept their neighbors alive.', 'A promise is renewed before witnesses at the first winter gathering.'],
    ['Sunmesa kin', 'Sunmesa families descend from dry-country farming towns, wardens and travelers. Their accounts disagree openly over old victories.', 'A guest may question the oldest story told at the table.'],
    ['Sablemarsh kin', 'Sablemarsh households remember tidal wetlands and the families who built safe walkways between them.', 'The youngest walker names a repair before the elders begin their meal.'],
  ],
  goblin: [
    ['Cinderburrow families', 'Cinderburrow families made homes in old furnace wards, preserving repairs and the neighbors who made room for them.', 'A repaired household object marks a new beginning.'],
    ['Sunmarket families', 'Sunmarket kin descend from caravan workshops and crowded southern bazaars. Their stories follow borrowed tools and returned favors.', 'A small handmade token travels with a departing relative.'],
    ['Sabledock families', 'Sabledock families remember wharf workshops, salvaged homes and the keepers of safe harbor steps.', 'A salvage ledger records who helped recover each useful thing.'],
  ],
  tiefling: [
    ['Ashveil lineages', 'Ashveil families carry letters from the cold pilgrimage roads. Their household histories hold many beliefs and chosen names.', 'A new name is written beside the names its bearer wishes to remember.'],
    ['Sunveil lineages', 'Sunveil kin descend from southern astronomers, porters and traveling healers. Their family accounts cross many borders.', 'A traveler brings home a new star name or a remedy learned on the road.'],
    ['Sableveil lineages', 'Sableveil families preserve letters between coast and inland hearths. Their stories follow journeys rather than a single ancestral seat.', 'A distant relative’s letter is read aloud only with their permission.'],
  ],
};
const beast = [
  ['wolfkin', 'Wolfkin', 'canine', 'Wolfkin households remember woodland paths and the kin who kept strangers safe along them.', 'A shared walk marks the first changing moon.'],
  ['catkin', 'Catkin', 'feline', 'Catkin families preserve the histories of garden towns, climbing paths and crowded city hearths.', 'A story is told from the highest safe place in a new home.'],
  ['bearkin', 'Bearkin', 'bear', 'Bearkin households trace their roots through forest refuges and the winter stores shared between neighbors.', 'The last jar of winter honey is opened for a guest.'],
  ['hornkin', 'Hornkin', 'horned', 'Hornkin families remember the upland grazing roads and the bells used to find kin in heavy mist.', 'A new household adds its own note to the gathering bell.'],
  ['harekin', 'Harekin', 'long_eared', 'Harekin households keep the histories of meadow lanes, buried gardens and the people who carried warnings between them.', 'The first spring planting begins with a messenger’s story.'],
  ['wildkin', 'Wildkin', 'other', 'Wildkin is the shared name of other Beastfolk lineages whose family histories follow many forms and homelands.', 'Each household chooses the creature, path or season remembered in its first tale.'],
];
export const HERITAGES = Object.freeze([
  ...Object.entries(peoples).flatMap(([ancestry, rows]) => rows.map(([name, description, custom], i) => Object.freeze({id:lands[i], ancestry, name, description, custom, ...(['human','elf'].includes(ancestry)?{complexion:['light','medium','deep'][i]}:{})}))),
  ...beast.map(([id,name,morphology,description,custom]) => Object.freeze({id, ancestry:'beastfolk', name, morphology, description, custom})),
]);
export const HERITAGE_IDS = Object.freeze([...new Set(HERITAGES.map(h => h.id))]);
// Both lookups sit on the portrait-selection hot path (thousands of calls per
// generated NPC), so they are memoized over the frozen catalog.
const heritagesByAncestry = new Map(), heritageIndex = new Map();
export function availableHeritages(ancestry='human') {
  let rows = heritagesByAncestry.get(ancestry);
  if (!rows) { rows = Object.freeze(HERITAGES.filter(h => h.ancestry===ancestry)); heritagesByAncestry.set(ancestry, rows); }
  return rows;
}
export function heritageById(id, ancestry='human') {
  const key = ancestry+'\u001f'+id;
  if (!heritageIndex.has(key)) heritageIndex.set(key, availableHeritages(ancestry).find(h => h.id===id)||null);
  return heritageIndex.get(key);
}
export function heritageAllowsPortrait(heritage, portrait) {
  return Boolean(heritage && portrait?.ancestry===heritage.ancestry
    && (!heritage.complexion || !portrait.complexion || portrait.complexion==='unknown' || portrait.complexion===heritage.complexion)
    && (!heritage.morphology || portrait.morphology==='unknown' || portrait.morphology===heritage.morphology));
}
