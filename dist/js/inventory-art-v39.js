// Illustration catalog only: these cells never create items or alter their stats.
// Order is row-major, left to right, then top to bottom. Indexes are zero-based.
export const INVENTORY_ART_GRID = Object.freeze({ columns: 8, rows: 8 });
// Generated sheets have eight rows/columns, but their divider positions drift
// slightly. Sample the inspected native cell interiors so lower rows are never
// clipped by assuming equal cell heights, and omit the drawn divider strokes.
const nativeAtlas = (columns, rows) => Object.freeze({
  width: 1254, height: 1254, inset: 2,
  columns: Object.freeze(columns), rows: Object.freeze(rows),
});
export const INVENTORY_ART_ATLASES = Object.freeze({
  gear: Object.freeze({ id: 'gear', asset: './art/gear-atlas-v39.webp', ...INVENTORY_ART_GRID,
    native: nativeAtlas([0, 157, 314, 470, 627, 784, 941, 1097, 1254], [0, 155, 312, 468, 626, 782, 931, 1080, 1254]) }),
  supplies: Object.freeze({ id: 'supplies', asset: './art/supplies-atlas-v39.webp', ...INVENTORY_ART_GRID,
    native: nativeAtlas([0, 157, 314, 470, 627, 783, 940, 1097, 1254], [0, 156, 312, 470, 627, 783, 940, 1093, 1254]) }),
});

function nativeCell(atlasId, index) {
  const { native } = INVENTORY_ART_ATLASES[atlasId], column = index % 8, row = Math.floor(index / 8);
  const x = native.columns[column] + native.inset, y = native.rows[row] + native.inset;
  const width = native.columns[column + 1] - native.inset - x, height = native.rows[row + 1] - native.inset - y;
  return Object.freeze({
    sourcePixels: Object.freeze({ x, y, width, height }),
    sourceRect: Object.freeze({ x: x / native.width, y: y / native.height, width: width / native.width, height: height / native.height }),
    backgroundSize: `${native.width / width * 100}% ${native.height / height * 100}%`,
    backgroundPosition: `${x / (native.width - width) * 100}% ${y / (native.height - height) * 100}%`,
  });
}

const manifest = (atlas, entries) => Object.freeze(entries.map(([key, label], index) => Object.freeze({
  key, label, index, atlas,
  column: index % INVENTORY_ART_GRID.columns,
  row: Math.floor(index / INVENTORY_ART_GRID.columns),
  gridRect: Object.freeze({ x: (index % 8) / 8, y: Math.floor(index / 8) / 8, width: 1 / 8, height: 1 / 8 }),
  // Normalized native rectangle; multiply by atlas dimensions for a pixel crop.
  ...nativeCell(atlas, index),
})));

// Cells 0–43 map one-to-one to the real gear catalog, including every ring,
// cloak, staff and armor variant. The final cells are distinct category art.
export const GEAR_ART_MANIFEST = manifest('gear', [
  ['starter_sword', 'Practice sword'],
  ['starter_staff', 'Apprentice staff'],
  ['starter_dagger', 'Balanced knife'],
  ['iron_sword', 'Iron longsword'],
  ['ash_staff', 'Runed ash staff'],
  ['hunter_dagger', 'Hunter’s dagger'],
  ['travel_cloak', 'Traveling cloak'],
  ['leather_armor', 'Waxed leather armor'],
  ['chain_mail', 'Riveted chain mail'],
  ['oak_shield', 'Oak buckler'],
  ['scholar_charm', 'Scholar’s charm'],
  ['moonstone_pendant', 'Moonstone pendant'],
  ['padded_gambeson', 'Quilted gambeson'],
  ['iron_helm', 'Iron cap'],
  ['hunting_bow', 'Yew hunting bow'],
  ['woodland_spear', 'Woodland spear'],
  ['oak_wand', 'Grove-carved wand'],
  ['bone_talisman', 'Hunter’s ward'],
  ['steel_sword', 'Tempered steel sword'],
  ['steel_plate', 'Fitted steel cuirass'],
  ['ranger_leathers', 'Ranger’s leathers'],
  ['silk_robes', 'Rune-stitched robes'],
  ['crystal_staff', 'Faceted crystal staff'],
  ['silver_dagger', 'Silver-inlaid dagger'],
  ['warded_mail', 'Ward-forged mail'],
  ['sunsteel_blade', 'Dawn-tempered blade'],
  ['moonweave_cloak', 'Moonweave mantle'],
  ['focus_ring', 'Prismatic focus ring'],
  ['field_shield', 'Iron roundshield'],
  ['bone_focus', 'Carved bone focus'],
  ['field_helm', 'Watchman’s helm'],
  ['scholar_hood', 'Scholar’s hood'],
  ['leather_gloves', 'Delver’s gloves'],
  ['rune_gloves', 'Scribe’s handwraps'],
  ['trail_boots', 'Soft trail boots'],
  ['iron_boots', 'Iron-capped boots'],
  ['field_cloak', 'Wool traveler’s mantle'],
  ['spell_cloak', 'Embroidered spellmantle'],
  ['field_belt', 'Delver’s toolbelt'],
  ['quick_belt', 'Runner’s sash'],
  ['silver_amulet', 'Silver hearth amulet'],
  ['iron_ring', 'Engraved iron ring'],
  ['glass_ring', 'Blue-glass focus ring'],
  ['nimble_ring', 'Traveler’s signet'],
  ['category_sword', 'Sword'],
  ['category_dagger', 'Dagger'],
  ['category_staff', 'Staff'],
  ['category_wand', 'Wand'],
  ['category_bow', 'Bow'],
  ['category_spear', 'Spear'],
  ['category_axe', 'Battle axe'],
  ['category_mace', 'Mace'],
  ['category_hammer', 'War hammer'],
  ['category_crossbow', 'Crossbow'],
  ['category_shield', 'Shield'],
  ['category_helm', 'Helmet'],
  ['category_hood', 'Hood'],
  ['category_armor', 'Body armor'],
  ['category_robes', 'Robes'],
  ['category_gloves', 'Gauntlets'],
  ['category_boots', 'Boots'],
  ['category_cloak', 'Cloak'],
  ['category_belt', 'Belt'],
  ['category_ring', 'Ring'],
]);

// Cells 0–29 cover actual resources, supplies, camp kits and recoverable loot.
// Remaining cells are visual categories for carried goods, never new supplies.
export const SUPPLIES_ART_MANIFEST = manifest('supplies', [
  ['potions', 'Healing potion'],
  ['rations', 'Expedition rations'],
  ['herbs', 'Medicinal herbs'],
  ['ore', 'Iron ore'],
  ['cloth', 'Cloth scraps'],
  ['wood', 'Cut timber'],
  ['stone', 'Fieldstone'],
  ['hide', 'Tanned hide'],
  ['crystal', 'Raw crystal'],
  ['meals', 'Wrapped meal'],
  ['ale', 'Bottle of ale'],
  ['bedroll', 'Traveller’s bedroll'],
  ['tent', 'Trail tent'],
  ['expedition', 'Expedition camp'],
  ['reliquary', 'Relic casket'],
  ['seal', 'Carved seal stamp'],
  ['idol', 'Ancient idol'],
  ['chalice', 'Footed chalice'],
  ['coin_hoard', 'Coin hoard'],
  ['bone_comb', 'Carved bone comb'],
  ['iron_mask', 'Weathered iron mask'],
  ['star_lens', 'Astronomical star lens'],
  ['burial_register', 'Scraped burial register'],
  ['hearth_bell', 'Household hearth bell'],
  ['road_tally', 'Notched road tally'],
  ['furnace_egg', 'Furnace Widow’s last egg'],
  ['glass_tide_lens', 'Complete Glass-Tide lens'],
  ['ash_crown', 'Borrowed ash crown'],
  ['cup_receipt', 'Dangerous cup receipt'],
  ['household_silver', 'Engraved household silver'],
  ['coin_purse', 'Coin purse'],
  ['scroll', 'Rolled scroll'],
  ['letter', 'Sealed letter'],
  ['map', 'Folded map'],
  ['deed', 'Property deed'],
  ['book', 'Bound book'],
  ['ledger', 'Account ledger'],
  ['spice_sack', 'Sack of spices'],
  ['silk_bolt', 'Bolt of silk'],
  ['cargo_crate', 'Cargo crate'],
  ['smith_tools', 'Smith’s hammer and tongs'],
  ['rope', 'Coiled rope'],
  ['torch', 'Unlit torch'],
  ['lantern', 'Iron lantern'],
  ['waterskin', 'Leather waterskin'],
  ['medicine_satchel', 'Medicine satchel'],
  ['salve', 'Jar of salve'],
  ['bandages', 'Linen bandages'],
  ['remedy_tonic', 'Remedy tonic'],
  ['grain_sack', 'Sack of grain'],
  ['bread', 'Bread loaf'],
  ['cheese', 'Cheese wedge'],
  ['cooked_roots', 'Cooked roots'],
  ['dried_meat', 'Dried meat'],
  ['dried_fish', 'Dried fish'],
  ['fruit', 'Gathered fruit'],
  ['mushrooms', 'Gathered mushrooms'],
  ['firewood', 'Tied firewood'],
  ['flint', 'Flint and fire striker'],
  ['cooking_pot', 'Iron cooking pot'],
  ['keys', 'Iron keys'],
  ['locket', 'Keepsake locket'],
  ['relic_fragment', 'Carved relic fragment'],
  ['carried_bundle', 'Tied carried bundle'],
]);

const gearByKey = new Map(GEAR_ART_MANIFEST.map(entry => [entry.key, entry]));
const suppliesByKey = new Map(SUPPLIES_ART_MANIFEST.map(entry => [entry.key, entry]));
const normalized = value => String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
const idKey = value => String(value || '').split(':').at(-1);
const displayName = value => String(value?.name || value?.label || '').trim();
const hasName = (name, words) => (` ${name} `).includes(` ${words} `);
const realGearNames = GEAR_ART_MANIFEST.slice(0, 44).map(entry => [normalized(entry.label), entry.key]).sort((a, b) => b[0].length - a[0].length);
const namedGear = name => realGearNames.find(([words]) => hasName(name, words))?.[1];

function artwork(entry, item) {
  const atlas = INVENTORY_ART_ATLASES[entry.atlas];
  return {
    ...entry, asset: atlas.asset, columns: atlas.columns, rows: atlas.rows,
    label: displayName(item) || entry.label, artLabel: entry.label,
  };
}

// Matching uses the actual base item before appearance hints: found/crafted
// instances inherit the same illustration even when their quality name changes.
export function resolveGearArtwork(item = {}) {
  const known = [item.baseId, item.itemId, item.id].map(idKey).find(id => gearByKey.has(id));
  if (known) return artwork(gearByKey.get(known), item);
  const name = normalized(`${item.id || ''} ${displayName(item)}`);
  const exactName = namedGear(name);
  if (exactName) return artwork(gearByKey.get(exactName), item);
  const types = [
    [/\bcrossbow\b/, 'category_crossbow'], [/\bbow\b/, 'category_bow'],
    [/\bdagger\b|\bknife\b/, 'category_dagger'], [/\bwand\b/, 'category_wand'],
    [/\bstaff\b|\bstave\b/, 'category_staff'], [/\bspear\b|\bpike\b/, 'category_spear'],
    [/\baxe\b|\bhatchet\b/, 'category_axe'], [/\bmace\b|\bflail\b/, 'category_mace'],
    [/\bhammer\b|\bmaul\b/, 'category_hammer'], [/\bsword\b|\bblade\b|\bsabre\b/, 'category_sword'],
    [/\bshield\b|\bbuckler\b/, 'category_shield'], [/\bhelm\b|\bhelmet\b|\bcap\b/, 'category_helm'],
    [/\bhood\b|\bcowl\b/, 'category_hood'], [/\bring\b|\bsignet\b/, 'category_ring'],
    [/\bamulet\b|\bpendant\b/, 'silver_amulet'], [/\btalisman\b|\bcharm\b|\bward\b/, 'bone_talisman'],
    [/\bfocus\b/, 'bone_focus'], [/\bgloves\b|\bgauntlets\b|\bhandwraps\b/, 'category_gloves'],
    [/\bboots\b|\bshoes\b/, 'category_boots'], [/\bcloak\b|\bmantle\b/, 'category_cloak'],
    [/\bbelt\b|\bsash\b/, 'category_belt'], [/\brobe\b|\brobes\b/, 'category_robes'],
    [/\barmor\b|\bmail\b|\bplate\b|\bgambeson\b|\bleathers\b|\bcuirass\b/, 'category_armor'],
  ];
  let key = types.find(([pattern]) => pattern.test(name))?.[1];
  // Old art integers described a 4×4 category atlas. Translate the category;
  // never interpret those integers as positions in the expanded 8×8 atlas.
  const legacyKeys = ['category_sword', 'category_staff', 'category_dagger', 'category_bow', 'category_shield', 'category_helm', 'category_armor', 'category_robes', 'category_gloves', 'category_boots', 'silver_amulet', 'category_ring', 'category_cloak', 'category_belt', 'bone_talisman', 'bone_focus'];
  const slots = { weapon: 'category_sword', offhand: 'category_shield', head: 'category_helm', armor: 'category_armor', hands: 'category_gloves', feet: 'category_boots', cloak: 'category_cloak', belt: 'category_belt', trinket: 'silver_amulet', ring: 'category_ring' };
  if (!key) key = slots[item.slot] || (Number.isInteger(item.art) ? legacyKeys[item.art] : null);
  return artwork(gearByKey.get(key || 'category_sword'), item);
}

const supplyPatterns = [
  [/\bburial register\b/, 'burial_register'], [/\bhearth bell\b/, 'hearth_bell'], [/\broad tally\b/, 'road_tally'],
  [/\bglass tide\b.*\blens\b/, 'glass_tide_lens'], [/\bcup receipt\b/, 'cup_receipt'],
  [/\blast egg\b|\bfurnace widow\b.*\begg\b/, 'furnace_egg'], [/\bash crown\b/, 'ash_crown'],
  [/\bhousehold silver\b|\bsilverware\b|\bsilver platter\b/, 'household_silver'],
  [/\breliquary\b|\brelic casket\b/, 'reliquary'], [/\bcoin hoard\b/, 'coin_hoard'],
  [/\bbone comb\b/, 'bone_comb'], [/\biron mask\b/, 'iron_mask'], [/\bstar lens\b/, 'star_lens'],
  [/\bseal\b|\bstamp\b/, 'seal'], [/\bidol\b|\bfigurine\b/, 'idol'], [/\bchalice\b|\bgoblet\b/, 'chalice'],
  [/\bexpedition camp\b|\blarge camp\b/, 'expedition'], [/\bbedroll\b|\bgroundsheet\b/, 'bedroll'], [/\btent\b/, 'tent'],
  [/\bration\b|\brations\b|\bhardtack\b/, 'rations'], [/\bwrapped meal\b|\bmeal\b/, 'meals'], [/\bale\b/, 'ale'],
  [/\bhealing potion\b|\bhealing potions\b/, 'potions'], [/\bherbs\b|\bmedicinal leaves\b/, 'herbs'],
  [/\bmedicine\b|\bremedies\b/, 'medicine_satchel'], [/\bsalve\b|\bointment\b/, 'salve'],
  [/\bbandage\b|\bbandages\b|\blinen dressing\b/, 'bandages'], [/\btonic\b|\bdraught\b|\bremedy\b/, 'remedy_tonic'],
  [/\bspice\b|\bspices\b/, 'spice_sack'], [/\bsilk\b/, 'silk_bolt'], [/\bcargo\b|\bcrate\b/, 'cargo_crate'],
  [/\btools\b|\btool\b|\bhammer\b|\btongs\b/, 'smith_tools'],
  [/\bdeed\b|\bcharter\b/, 'deed'], [/\bscroll\b/, 'scroll'], [/\bletter\b|\breceipt\b/, 'letter'],
  [/\bmap\b|\bchart\b/, 'map'], [/\bledger\b|\bregister\b/, 'ledger'], [/\bbook\b|\btome\b|\bfolio\b/, 'book'],
  [/\brope\b|\bcord\b/, 'rope'], [/\btorch\b/, 'torch'], [/\blantern\b/, 'lantern'], [/\bwaterskin\b|\bflask\b/, 'waterskin'],
  [/\bgrain\b|\bwheat\b|\bflour\b/, 'grain_sack'], [/\bbread\b|\bloaf\b/, 'bread'], [/\bcheese\b/, 'cheese'],
  [/\broots\b/, 'cooked_roots'], [/\bmeat\b|\bjerky\b/, 'dried_meat'], [/\bfish\b/, 'dried_fish'],
  [/\bfruit\b|\bapple\b|\bpear\b|\bberries\b/, 'fruit'], [/\bmushroom\b|\bmushrooms\b/, 'mushrooms'],
  [/\bfirewood\b|\bfuel\b/, 'firewood'], [/\bflint\b|\bstriker\b/, 'flint'], [/\bcooking pot\b|\bkettle\b/, 'cooking_pot'],
  [/\bkeys\b|\bkey\b/, 'keys'], [/\blocket\b|\bkeepsake\b/, 'locket'],
  [/\bore\b/, 'ore'], [/\bcloth\b|\bfabric\b/, 'cloth'], [/\bwood\b|\btimber\b/, 'wood'], [/\bstone\b/, 'stone'],
  [/\bhide\b|\bleather\b/, 'hide'], [/\bcrystal\b|\bgem\b/, 'crystal'],
  [/\blens\b/, 'star_lens'], [/\begg\b/, 'furnace_egg'], [/\bcrown\b/, 'ash_crown'],
  [/\bcup\b|\bvessel\b/, 'chalice'], [/\brelic\b|\bfragment\b/, 'relic_fragment'],
  [/\bcoin\b|\bcoins\b|\bpurse\b|\bgold\b|\bsilver\b/, 'coin_purse'],
];

export function resolveCarriedArtwork(row = {}) {
  if (row.item) return resolveGearArtwork(row.item);
  const id = idKey(row.baseId || row.itemId || row.id);
  if (String(row.id || '').startsWith('gear:') || gearByKey.has(id)) return resolveGearArtwork(row);
  if (suppliesByKey.has(id)) return artwork(suppliesByKey.get(id), row);
  const name = normalized(displayName(row));
  // A stolen merchant item carries its real item's name but no item object.
  const realGear = namedGear(name);
  if (realGear) return artwork(gearByKey.get(realGear), row);
  if (row.slot || /\bring\b|\bsignet\b|\bamulet\b|\bpendant\b|\btalisman\b|\bsword\b|\bdagger\b|\bstaff\b|\bwand\b|\bbow\b|\bcrossbow\b|\bspear\b|\bshield\b|\bbuckler\b|\bhelmet\b|\bhelm\b|\barmor\b|\brobes\b|\bgauntlets\b|\bgloves\b|\bboots\b|\bcloak\b|\bmantle\b|\btoolbelt\b|\bsash\b/.test(name)) return resolveGearArtwork(row);
  const campKind = row.campKind || row.kitKind || row.camp?.kind;
  if (['bedroll', 'tent', 'expedition'].includes(campKind)) return artwork(suppliesByKey.get(campKind), row);
  const propertyKinds = { egg: 'furnace_egg', lens: 'glass_tide_lens', crown: 'ash_crown', cup_lead: 'cup_receipt' };
  const propertyKind = row.propertyKind || (String(row.id || '').startsWith('property:') ? Object.keys(propertyKinds).find(kind => id.endsWith('-' + kind)) : null);
  const key = propertyKinds[propertyKind] || supplyPatterns.find(([pattern]) => pattern.test(name))?.[1] || 'carried_bundle';
  return artwork(suppliesByKey.get(key), row);
}

export function resolveInventoryArtwork(item = {}) {
  return item.item || item.slot || String(item.id || '').startsWith('gear:') || gearByKey.has(idKey(item.baseId || item.id))
    ? resolveGearArtwork(item.item || item)
    : resolveCarriedArtwork(item);
}
