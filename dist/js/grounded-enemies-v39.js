import { GROUNDED_FOE_REGISTRATION_V39 } from './grounded-foe-registration-v39.js';
// Every row is one species; columns are eight visual variants of that species.
// These groups extend the original catalog without reinterpreting saved cells.
const families = {
  beasts: [
    ['marsh_toad', 'Mire Toad', 'beast', 'barbed', 'serpent', ['marsh', 'water'], 'A heavy, mud-mottled warty toad.'],
    ['crag_lynx', 'Crag Lynx', 'beast', 'striker', 'bat', ['mountain', 'forest'], 'A lean mountain cat with tufted ears.'],
    ['carrion_hyena', 'Carrion Hyena', 'beast', 'striker', 'wolf', ['grassland', 'ruin'], 'A scarred scavenger with a sloping back.'],
    ['bristle_badger', 'Bristle Badger', 'beast', 'striker', 'bear', ['forest', 'grassland', 'mountain'], 'A broad, low striped burrower.'],
    ['marsh_crab', 'Marsh Crab', 'beast', 'warder', 'skeleton', ['water', 'marsh'], 'A large freshwater crab encrusted with mud.'],
    ['wild_aurochs', 'Wild Aurochs', 'beast', 'striker', 'boar', ['grassland', 'forest'], 'A shaggy horned wild ox.'],
    ['carrion_vulture', 'Carrion Vulture', 'beast', 'sniper', 'bat', ['grassland', 'mountain', 'ruin'], 'A ragged scavenging bird with a hooked beak.'],
    ['mud_crocodile', 'Mud Crocodile', 'beast', 'striker', 'bear', ['water', 'marsh'], 'A low armored reptile with a broad snout.'],
  ],
  undead: [
    ['barrow_bowman', 'Barrow Bowman', 'undead', 'sniper', 'watcher', ['ruin', 'forest', 'mountain'], 'A withered burial archer with a rotten bow.'],
    ['plague_pilgrim', 'Plague Pilgrim', 'undead', 'leech', 'ghoul', ['grassland', 'ruin'], 'A decayed hooded traveler with a staff and bell.'],
    ['dead_ferryman', 'Dead Ferryman', 'undead', 'barbed', 'drowned', ['water', 'marsh'], 'A waterlogged corpse carrying a boat hook.'],
    ['ash_widow', 'Ash Widow', 'undead', 'hexer', 'shade', ['ruin', 'grassland'], 'A charred, veiled corpse in a mourning dress.'],
    ['peat_corpse', 'Peat Corpse', 'undead', 'leech', 'ghoul', ['marsh'], 'A leathery bog-preserved body in rough cloth.'],
    ['gibbet_dead', 'Gibbet Dead', 'undead', 'barbed', 'rotted_jailer', ['grassland', 'ruin'], 'A hanged corpse trailing rope and cage fragments.'],
    ['ossuary_crawler', 'Ossuary Crawler', 'undead', 'striker', 'bone_hound', ['ruin', 'mountain'], 'A low mass of crawling, many-boned remains.'],
    ['headless_rider', 'Headless Rider', 'undead', 'striker', 'grave_knight', ['grassland', 'mountain', 'ruin'], 'A headless armored corpse on a skeletal horse.'],
  ],
  spirits: [
    ['hearth_haunt', 'Hearth Haunt', 'spirit', 'hexer', 'wraith', ['grassland', 'ruin'], 'A faded domestic figure covered in cold ash.'],
    ['veil_mourner', 'Veil Mourner', 'spirit', 'hexer', 'shade', ['ruin', 'grassland', 'forest'], 'An indistinct grieving figure under a long veil.'],
    ['drowned_bellringer', 'Drowned Bellringer', 'spirit', 'warder', 'seal', ['water', 'marsh', 'ruin'], 'A faded drowned servant holding a cracked handbell.'],
    ['mill_lament', 'Mill Lament', 'spirit', 'hexer', 'archivist', ['water', 'grassland', 'ruin'], 'A flour-covered mill worker carrying an old sack.'],
    ['crossroads_penitent', 'Crossroads Penitent', 'spirit', 'warder', 'archivist', ['grassland', 'mountain'], 'A shrouded traveler with a weathered staff.'],
    ['cairn_whisperer', 'Cairn Whisperer', 'spirit', 'hexer', 'shade', ['mountain', 'ruin', 'forest'], 'A burial-shrouded elder among weathered stones.'],
    ['orchard_widow', 'Orchard Widow', 'spirit', 'striker', 'shadow', ['forest', 'grassland'], 'A gaunt faded field worker carrying a pruning hook.'],
    ['road_lantern', 'Road Lantern', 'spirit', 'sniper', 'watcher', ['grassland', 'forest', 'mountain'], 'A hooded road spirit carrying an unlit iron lantern.'],
  ],
  constructs: [
    ['wicker_ward', 'Wicker Ward', 'construct', 'barbed', 'root', ['forest', 'grassland'], 'A coarse woven human effigy bound with thorns.'],
    ['clay_servitor', 'Clay Servitor', 'construct', 'warder', 'sentinel', ['water', 'marsh', 'grassland'], 'A cracked worker formed from unglazed clay.'],
    ['quarry_colossus', 'Quarry Colossus', 'construct', 'warder', 'sentinel', ['mountain', 'ruin'], 'A massive squat figure of rough-hewn limestone.'],
    ['bellward_shell', 'Bellward Shell', 'construct', 'warder', 'husk', ['ruin', 'grassland'], 'An empty riveted bronze bell on iron legs.'],
    ['timber_watchman', 'Timber Watchman', 'construct', 'striker', 'sentinel', ['forest', 'grassland'], 'A pegged oak figure with rusty tool arms.'],
    ['cairn_ward', 'Cairn Ward', 'construct', 'warder', 'golem', ['mountain', 'forest', 'ruin'], 'A stacked fieldstone sentinel bound with wire.'],
    ['millwheel_crawler', 'Millwheel Crawler', 'construct', 'striker', 'husk', ['water', 'grassland', 'ruin'], 'A broken wooden millwheel on short metal legs.'],
    ['chainbound_effigy', 'Chainbound Effigy', 'construct', 'warder', 'guardian', ['ruin', 'grassland', 'mountain'], 'A burlap and wood dummy bound in heavy chain.'],
  ],
  aberrations: [
    ['blind_burrower', 'Blind Burrower', 'aberration', 'striker', 'crawler', ['mountain', 'grassland'], 'An eyeless hairless burrower with shovel claws.'],
    ['sallow_broodmother', 'Sallow Broodmother', 'aberration', 'leech', 'fungus', ['marsh', 'forest', 'ruin'], 'A swollen tick-like creature carrying pale larvae.'],
    ['reed_stalker', 'Reed Stalker', 'aberration', 'striker', 'crawler', ['marsh', 'water'], 'A gaunt amphibious biped with reed-colored hide.'],
    ['antler_leech', 'Antler Leech', 'aberration', 'leech', 'leech', ['water', 'marsh'], 'A dark elongated parasite with branching bony feelers.'],
    ['tallow_man', 'Tallow Man', 'aberration', 'hexer', 'moth', ['ruin', 'grassland'], 'A sagging waxy figure with a heavy featureless face.'],
    ['suture_hound', 'Suture Hound', 'aberration', 'striker', 'chimera', ['ruin', 'grassland', 'forest'], 'A mismatched flesh hound stitched at its joints.'],
    ['briar_maw', 'Briar Maw', 'aberration', 'barbed', 'root', ['forest', 'grassland'], 'A low, thorn-covered jawed root-and-flesh creature.'],
    ['shellback_horror', 'Shellback Horror', 'aberration', 'warder', 'eldritch_knight', ['water', 'marsh', 'mountain'], 'A heavy malformed beast with a rough scabbed shell.'],
  ],
};

export const GROUNDED_ENEMY_SPECIES_V39 = Object.entries(families).flatMap(([family, rows]) =>
  rows.map(([id, name, role, aiKey, planId, terrains, description], row) => ({
    id, name, family, group: `grounded-${family}-39`, row, role, aiKey, planId, terrains, description,
  })));

export const GROUNDED_ENEMY_PLAN_ALIASES_V39 = Object.fromEntries(
  GROUNDED_ENEMY_SPECIES_V39.map(row => [row.id, row.planId]));

// Boss art extends these existing identities; it never creates ordinary foes.
export const GROUNDED_BOSS_ROWS_V39 = [
  'captain', 'last_archivist', 'anchor_warden', 'thorn_sovereign',
  'hollow_king', 'death_cleric', 'dragon', 'witch',
];

export const GROUNDED_FOE_ATLASES_V39 = GROUNDED_FOE_REGISTRATION_V39;

// Authored sites and generated countryside use different words for the same
// habitat. Explicit aliases keep wetland creatures away from dry upland pools.
const terrainAliases = {
  grassland: ['grassland'], plains: ['grassland'], road: ['grassland'],
  village: ['grassland'], city: ['grassland'], camp: ['grassland'],
  gate: ['grassland'], border: ['grassland'], citadel: ['grassland'], fort: ['grassland'],
  forest: ['forest'], woodland: ['forest'], grove: ['forest'], orchard: ['forest', 'grassland'],
  mountain: ['mountain'], quarry: ['mountain'], saltmine: ['mountain'],
  cave: ['mountain'], cavern: ['mountain'], mine: ['mountain'],
  marsh: ['marsh'], fenhold: ['marsh'], fen: ['marsh'], swamp: ['marsh'], bog: ['marsh'],
  water: ['water'], coast: ['water'], port: ['water', 'grassland'],
  haven: ['water'], island: ['water'], river: ['water'], brook: ['water', 'grassland'],
  ruin: ['ruin', 'grassland'], crypt: ['ruin'], barrow: ['ruin'], graveyard: ['ruin'],
  waste: ['ruin', 'grassland'], tower: ['ruin', 'grassland'], spire: ['ruin', 'grassland'],
  archive: ['ruin', 'grassland'], foundry: ['ruin', 'grassland'],
  mill: ['water', 'grassland'], sanctuary: ['ruin', 'grassland'],
  abbey: ['ruin', 'grassland'], monastery: ['ruin', 'grassland'],
};
export function enemyTerrainAliasesV39(value) {
  return [...new Set((Array.isArray(value) ? value : [value]).flatMap(
    key => terrainAliases[String(key || '').toLowerCase()] || []))];
}
