import { EQUIPMENT_SLOTS, EXTRA_GEAR, resolveFoundItem, makeGearDrop, validateGearInstances, setBonuses, itemScore } from './gear-loot.js';
// Equipment is a snapshot bonus, never a change to the character's base stats.
const bonuses = (attack = 0, armor = 0, magic = 0, agility = 0) => ({ attack, armor, magic, agility });
const recipe = (ore, cloth, gold) => ({ ore, cloth, gold });
export const MATERIAL_IDS = ['ore', 'cloth', 'wood', 'stone', 'hide', 'crystal'];
const crafted = (id, name, slot, description, price, stats, materials, gold, days, skill, tier) => ({
  id, name, slot, description, price, bonuses: bonuses(...stats), recipe: { ...materials, gold },
  craftDays: days, craftSkill: skill, workshopTier: tier,
});

export const GEAR_CATALOG = [
  { id: 'starter_sword', name: 'Practice sword', slot: 'weapon', description: 'A reliable blade from your first teacher. Adds 1 attack.', price: 8, bonuses: bonuses(1), recipe: null },
  { id: 'starter_staff', name: 'Apprentice staff', slot: 'weapon', description: 'A simple focus worn smooth by study. Adds 1 spell power.', price: 8, bonuses: bonuses(0, 0, 1), recipe: null },
  { id: 'starter_dagger', name: 'Balanced knife', slot: 'weapon', description: 'Light enough for a quick opening. Adds 1 initiative.', price: 8, bonuses: bonuses(0, 0, 0, 1), recipe: null },
  { id: 'iron_sword', name: 'Iron longsword', slot: 'weapon', description: 'A forged blade for a practiced hand. Adds 4 attack.', price: 55, bonuses: bonuses(4), recipe: recipe(3, 0, 8) },
  { id: 'ash_staff', name: 'Runed ash staff', slot: 'weapon', description: 'Ink and carved runes guide stronger spells. Adds 4 spell power.', price: 58, bonuses: bonuses(0, 0, 4), recipe: recipe(1, 2, 10) },
  { id: 'hunter_dagger', name: 'Hunter’s dagger', slot: 'weapon', description: 'A narrow blade with a sure balance. Adds 2 attack and 2 initiative.', price: 52, bonuses: bonuses(2, 0, 0, 2), recipe: recipe(2, 1, 8) },
  { id: 'travel_cloak', name: 'Traveling cloak', slot: 'armor', description: 'Layered wool blunts a glancing strike. Adds 1 armor.', price: 8, bonuses: bonuses(0, 1), recipe: recipe(0, 2, 2) },
  { id: 'leather_armor', name: 'Waxed leather armor', slot: 'armor', description: 'Supple protection for long journeys. Adds 2 armor.', price: 35, bonuses: bonuses(0, 2), recipe: recipe(0, 4, 8) },
  { id: 'chain_mail', name: 'Riveted chain mail', slot: 'armor', description: 'Strong protection at the cost of speed. Adds 3 armor; reduces initiative by 1.', price: 85, bonuses: bonuses(0, 3, 0, -1), recipe: recipe(6, 1, 15) },
  { id: 'oak_shield', name: 'Oak buckler', slot: 'trinket', description: 'A small shield leaves your weapon hand free. Adds 1 armor.', price: 28, bonuses: bonuses(0, 1), recipe: recipe(1, 2, 5) },
  { id: 'scholar_charm', name: 'Scholar’s charm', slot: 'trinket', description: 'A small seal that steadies your focus. Adds 2 spell power.', price: 45, bonuses: bonuses(0, 0, 2), recipe: recipe(1, 2, 12) },
  { id: 'moonstone_pendant', name: 'Moonstone pendant', slot: 'trinket', description: 'An old warding stone carried against danger. Adds 1 armor and 1 spell power.', price: 70, bonuses: bonuses(0, 1, 1), recipe: recipe(4, 1, 18) },
  crafted('padded_gambeson', 'Quilted gambeson', 'armor', 'Quilted layers protect without weighing down a quick fighter. Adds 2 armor and 1 initiative.', 46, [0, 2, 0, 1], { cloth: 4, hide: 1 }, 6, 2, 0, 1),
  crafted('iron_helm', 'Iron cap', 'trinket', 'A sturdy fitted cap protects the head. Adds 2 armor; reduces initiative by 1.', 48, [0, 2, 0, -1], { ore: 3, hide: 1 }, 7, 2, 0, 1),
  crafted('hunting_bow', 'Yew hunting bow', 'weapon', 'A carefully seasoned stave rewards a patient hunter. Adds 4 attack and 1 initiative.', 68, [4, 0, 0, 1], { wood: 4, hide: 2, cloth: 1 }, 9, 3, 0, 1),
  crafted('woodland_spear', 'Woodland spear', 'weapon', 'A balanced ash shaft and forged point keep danger at a distance. Adds 5 attack.', 72, [5, 0, 0, 0], { wood: 3, ore: 2, hide: 1 }, 10, 3, 0, 1),
  crafted('oak_wand', 'Grove-carved wand', 'weapon', 'A light oak focus is quick to draw. Adds 3 spell power and 1 initiative.', 62, [0, 0, 3, 1], { wood: 3, crystal: 1 }, 8, 2, 0, 1),
  crafted('bone_talisman', 'Hunter’s ward', 'trinket', 'A carved charm honors an animal whose hide sheltered you. Adds 1 armor and 2 spell power.', 70, [0, 1, 2, 0], { hide: 2, wood: 1, crystal: 1 }, 10, 2, 1, 1),
  crafted('steel_sword', 'Tempered steel sword', 'weapon', 'Patient tempering produces a dependable edge. Adds 6 attack.', 110, [6, 0, 0, 0], { ore: 6, wood: 2, hide: 1 }, 18, 4, 2, 2),
  crafted('steel_plate', 'Fitted steel cuirass', 'armor', 'Fitted plates favor protection over speed. Adds 5 armor; reduces initiative by 2.', 145, [0, 5, 0, -2], { ore: 9, hide: 3, cloth: 2 }, 24, 5, 2, 2),
  crafted('ranger_leathers', 'Ranger’s leathers', 'armor', 'Waxed hide is cut to leave your movement free. Adds 3 armor and 1 initiative.', 104, [0, 3, 0, 1], { hide: 5, cloth: 2, wood: 1 }, 16, 4, 2, 2),
  crafted('silk_robes', 'Rune-stitched robes', 'armor', 'Woven runes steady a caster’s breathing. Adds 1 armor and 3 spell power.', 112, [0, 1, 3, 0], { cloth: 6, crystal: 2 }, 18, 4, 2, 2),
  crafted('crystal_staff', 'Faceted crystal staff', 'weapon', 'A fitted crystal conducts power through a seasoned shaft. Adds 6 spell power.', 126, [0, 0, 6, 0], { wood: 4, crystal: 4, ore: 2 }, 22, 4, 2, 2),
  crafted('silver_dagger', 'Silver-inlaid dagger', 'weapon', 'A fine blade with a deliberately light hilt. Adds 4 attack and 2 initiative.', 118, [4, 0, 0, 2], { ore: 5, crystal: 2, hide: 2 }, 18, 4, 2, 2),
  crafted('warded_mail', 'Ward-forged mail', 'armor', 'Small runic rivets share a defensive enchantment. Adds 4 armor and 1 spell power; reduces initiative by 1.', 164, [0, 4, 1, -1], { ore: 8, cloth: 3, crystal: 3 }, 28, 5, 4, 3),
  crafted('sunsteel_blade', 'Dawn-tempered blade', 'weapon', 'A luminous inlay strengthens a mortal blade without imposing an oath. Adds 7 attack and 1 spell power.', 185, [7, 0, 1, 0], { ore: 9, wood: 2, crystal: 4 }, 32, 6, 4, 3),
  crafted('moonweave_cloak', 'Moonweave mantle', 'armor', 'Subtle crystal threads turn a cloak into a light ward. Adds 2 armor, 2 spell power, and 1 initiative.', 168, [0, 2, 2, 1], { cloth: 7, hide: 2, crystal: 4 }, 28, 5, 4, 3),
  crafted('focus_ring', 'Prismatic focus ring', 'trinket', 'A small, carefully cut gem brings clarity to practiced hands. Adds 3 spell power and 1 initiative.', 150, [0, 0, 3, 1], { ore: 3, crystal: 5 }, 25, 4, 4, 3),
];

GEAR_CATALOG.push(...EXTRA_GEAR);
const slots = EQUIPMENT_SLOTS;
const legacySlots={oak_shield:'offhand',iron_helm:'head',focus_ring:'ring',travel_cloak:'cloak',moonweave_cloak:'cloak'};
const canonicalItem=item=>item&&legacySlots[item.baseId||item.id]?{...item,legacySlot:item.slot,slot:legacySlots[item.baseId||item.id]}:item;
const itemById=(id,state)=>{const raw=GEAR_CATALOG.find(item=>item.id===id)||(state?.equipment?.instances?.find(i=>i.id===id)?resolveFoundItem(state.equipment.instances.find(i=>i.id===id),GEAR_CATALOG):null);return state?.characterDialogueVersion===28?canonicalItem(raw):raw;};
export const slotFits=(item,slot)=>item&&(item.slot===slot||item.legacySlot===slot);
export const getGearItem=(state,id)=>itemById(id,state);
export const ownedGear=state=>(state.equipment?.owned||[]).map(id=>itemById(id,state)).filter(Boolean);
export function projectedEquipment(state){const result=Object.fromEntries(slots.map(s=>[s,null]));for(const id of Object.values(state.equipment?.equipped||{})){const item=itemById(id,state);if(item&&state.equipment.owned.includes(id))result[item.slot]=id;}return result;}

export const GEAR_PRESET_IDS = ['loadout_1','loadout_2','loadout_3','loadout_4'];
const plainRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const exactKeys=(value,keys)=>plainRecord(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const organizerText=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max&&value===value.trim()&&!/[\u0000-\u001f\u007f]/.test(value);
const gearReference=id=>typeof id==='string'&&id.length<=160&&(GEAR_CATALOG.some(item=>item.id===id)||/^found_[a-z0-9]+_\d+$/.test(id)||/^stolen_(?:[1-9]\d*_[1-9]\d*|legacy_[a-z0-9]+_[1-9]\d*)$/.test(id));
export const validGearPresetLabel=value=>organizerText(value,40);
// Missing pieces remain valid bookmarks. Their exact IDs are checked against
// current ownership and slot rules again before an arrangement can be applied.
export function validateGearOrganizer(value,equipment) {
  if(value===undefined)return true;
  if(!exactKeys(value,['version','favorites','presets'])||value.version!==1||!Array.isArray(value.favorites)||value.favorites.length>GEAR_CATALOG.length+120||new Set(value.favorites).size!==value.favorites.length||value.favorites.some(id=>!gearReference(id)||!equipment.owned.includes(id))||!Array.isArray(value.presets)||value.presets.length>GEAR_PRESET_IDS.length||new Set(value.presets.map(p=>p?.id)).size!==value.presets.length)return false;
  return value.presets.every(p=>{
    if(!exactKeys(p,['id','label','slots','names'])||!GEAR_PRESET_IDS.includes(p.id)||!validGearPresetLabel(p.label)||!exactKeys(p.slots,slots))return false;
    const occupied=slots.filter(slot=>p.slots[slot]!==null),ids=occupied.map(slot=>p.slots[slot]);
    return ids.every(gearReference)&&new Set(ids).size===ids.length&&exactKeys(p.names,occupied)&&occupied.every(slot=>organizerText(p.names[slot],160));
  });
}
// Reads and migrations do not add metadata to existing or newly created lives.
export const gearOrganizer=state=>state?.equipment?.organizer??{version:1,favorites:[],presets:[]};

export const dropEquipment = (state,salt,tier,ctx) => makeGearDrop(state,salt,tier,GEAR_CATALOG,ctx);
export const equippedSets = state => setBonuses(ownedGear(state).filter(i=>Object.values(state.equipment?.equipped||{}).includes(i.id)));
export const gearScore = state => ownedGear(state).filter(i=>Object.values(state.equipment?.equipped||{}).includes(i.id)).reduce((n,i)=>n+itemScore(i),0);
export function discardGear(state,id) { for(const [slot,key] of Object.entries(state.equipment.equipped))if(key===id)state.equipment.equipped[slot]=null;state.equipment.owned=state.equipment.owned.filter(i=>i!==id);if(state.equipment.instances)state.equipment.instances=state.equipment.instances.filter(i=>i.id!==id);if(state.equipment.organizer)state.equipment.organizer.favorites=state.equipment.organizer.favorites.filter(key=>key!==id); }
const settlement = (state) => {
  const place = state.world?.locations?.find((entry) => entry.id === state.locationId);
  if (['destroyed', 'evacuated'].includes(place?.status) || place?.servicesAvailable === false) return false;
  return place?.services?.includes('market') || place?.services?.includes('smith') || ['city', 'village'].includes(place?.type) || ['city', 'home', 'brook', 'camp', 'citadel', 'coast'].includes(state.locationId);
};
const oreSite = (state) => {
  const place = state.world?.locations?.find(entry => entry.id === state.locationId);
  return ['forest', 'ruin', 'mountain', 'marsh'].includes(state.locationId) && !['destroyed', 'evacuated'].includes(place?.status) && place?.servicesAvailable !== false;
};
const empty = () => ({ owned: [], equipped: Object.fromEntries(slots.map(s=>[s,null])), instances: [], materials: Object.fromEntries(MATERIAL_IDS.map(id => [id, 0])) });

// Migration calls the default initializer. Only a newly created life opts into
// starter belongings; loading a life cannot conjure resources or bonuses.
export function initializeGear(state, { starter = false } = {}) {
  if (state.equipment) {
    // Additive migration preserves old slots and belongings.
    for (const key of MATERIAL_IDS) if (!(key in state.equipment.materials)) state.equipment.materials[key] = 0;
    return;
  }
  state.equipment = empty();
  if (starter) {
    const weapon = state.hero.path === 'mage' ? 'starter_staff' : state.hero.path === 'rogue' ? 'starter_dagger' : 'starter_sword';
    state.equipment.owned = [weapon, 'travel_cloak'];
    state.equipment.equipped.weapon = weapon;
    state.equipment.equipped.armor = 'travel_cloak';
  }
}

export function gearBonuses(state) {
  const total = bonuses();
  const equipment = state?.equipment;
  if (!equipment) return total;
  const seen=new Set();
  for (const slot of slots) {
    const item = itemById(equipment.equipped?.[slot],state);
    if (!slotFits(item,slot) || !equipment.owned?.includes(item.id)||seen.has(item.id)) continue;
    seen.add(item.id);
    for (const key of Object.keys(total)) total[key] += item.bonuses[key];
  }
  for(const set of equippedSets(state))for(const [key,n] of Object.entries(set.bonuses))total[key]+=n;
  return total;
}

const action = (id, label, description, days, cost, group, disabledReason) => ({
  id, label, description, days, cost, group, ...(disabledReason ? { disabledReason } : {}),
});

export function gearActions(state) {
  if (state.phase === 'retired' || (state.timeline?.mode === 'birth' ? state.age < 16 : state.phase !== 'adult') || state.event || state.battle || state.dungeon || !state.equipment) return [];
  const actions = [];
  if (settlement(state)) {
    if ((state.revision || 0) < 5) actions.push(action('gear_gather_cloth', 'Help the cloth cooperative', 'Spend a day sorting fibers and mending garments. Keep 2 cloth scraps for your own craft work.', 1, 0, 'Crafting'));
    for (const item of GEAR_CATALOG) {
      if (state.equipment.owned.includes(item.id)) continue;
      const merchant=state.realm?.sites[state.locationId]?.merchant,price=merchant?.prices[item.id]||item.price;
      if(!state.realm||merchant?.stock[item.id]>0)actions.push(action(`gear_buy_${item.id}`, `Buy ${item.name}`, `${item.description}${merchant?' Offered by '+merchant.name+'.':' You own each piece once; equip it in your inventory.'}`, 0, price, 'Equipment', state.hero.gold < price ? `Requires ${price} gold.` : null));
      if (item.recipe && !item.workshopTier) {
        const needed = Object.entries(item.recipe).filter(([key,amount]) => key !== 'gold'&&Number.isFinite(amount)&&amount>0).map(([key, amount]) => `${amount} ${key}`).join(', ');
        const missing = ['ore', 'cloth'].filter((key) => state.equipment.materials[key] < item.recipe[key]);
        const reason = missing.length ? `Requires ${needed}.` : state.hero.gold < item.recipe.gold ? `Requires ${item.recipe.gold} gold for workshop supplies.` : null;
        actions.push(action(`gear_craft_${item.id}`, `Craft ${item.name}`, `Use ${needed} and a village or guild workshop. ${item.description}`, 2, item.recipe.gold, 'Crafting', reason));
      }
    }
  }
  if ((state.revision || 0) < 5 && oreSite(state)) {
    const amount = ['ruin', 'mountain'].includes(state.locationId) ? 3 : 2;
    actions.push(action('gear_gather_ore', 'Gather workable ore', `Search accessible stone banks without entering a battle. Bring home ${amount} ore; then craft at a settlement workshop.`, 2, 0, 'Crafting'));
  }
  return actions;
}

function record(state, ctx, title, text) {
  state.notice = text;
  ctx?.journal?.(title, text, 'equipment');
}

// The engine has already checked and charged the descriptor's gold and days.
// Material costs belong here, and are consumed only after every check passes.
export function applyGearAction(state, id, ctx = {}) {
  if (typeof id !== 'string') return false;
  if (id !== 'gear_gather_ore' && id !== 'gear_gather_cloth' && !id.startsWith('gear_buy_') && !id.startsWith('gear_craft_')) return false;
  if (!state.equipment) initializeGear(state);
  if(id.startsWith('gear_buy_')&&state.realm){const key=id.slice(9),m=state.realm.sites[state.locationId]?.merchant;if(!m||!(m.stock[key]>0))return false;m.stock[key]--;}
  if ((state.revision || 0) >= 5 && ['gear_gather_ore', 'gear_gather_cloth'].includes(id)) {
    state.notice = 'Use Workshop gathering to reserve the actual local stock and finish the work through its real days.';
    return true;
  }
  if (id === 'gear_gather_ore') {
    if (!oreSite(state)) { state.notice = 'Workable ore can be gathered at the forest, marsh, mountain, or ruin.'; return true; }
    const amount = ['ruin', 'mountain'].includes(state.locationId) ? 3 : 2;
    state.equipment.materials.ore += amount;
    record(state, ctx, 'Stone becomes possibility', `You gathered ${amount} ore for a future piece of equipment.`);
    ctx.earnExperience?.(2);
    return true;
  }
  if (id === 'gear_gather_cloth') {
    if (!settlement(state)) { state.notice = 'The cloth cooperative works in the settlements.'; return true; }
    state.equipment.materials.cloth += 2;
    record(state, ctx, 'A useful day at the looms', 'You helped the cloth cooperative and kept 2 cloth scraps for crafting.');
    ctx.earnExperience?.(2);
    return true;
  }
  const crafting = id.startsWith('gear_craft_');
  const item = itemById(id.slice(crafting ? 'gear_craft_'.length : 'gear_buy_'.length));
  if (!item) return false;
  if (!settlement(state)) { state.notice = 'Visit a settlement market or workshop for that equipment.'; return true; }
  if (state.equipment.owned.includes(item.id)) { state.notice = `You already own ${item.name}.`; return true; }
  if (crafting) {
    if (item.workshopTier) { state.notice = 'Use the Workshop recipe to make that piece through a committed project.'; return true; }
    if (!item.recipe) { state.notice = 'That piece has no available recipe.'; return true; }
    if (['ore', 'cloth'].some((key) => state.equipment.materials[key] < item.recipe[key])) {
      state.notice = 'You need the recipe’s ore and cloth before using the workshop.';
      return true;
    }
    for (const key of ['ore', 'cloth']) state.equipment.materials[key] -= item.recipe[key];
    ctx.earnExperience?.(4);
    if (state.workshop) state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
  }
  state.equipment.owned.push(item.id);
  record(state, ctx, crafting ? 'Made with your own hands' : 'A purchase for the road', `${crafting ? 'You crafted' : 'You purchased'} ${item.name}. Equip it in your inventory when no event or battle is pending.`);
  return true;
}

export function equipItem(state, id) {
  if (!state.equipment || typeof id !== 'string') return false;
  if (id.startsWith('unequip_')) {
    const slot = id.slice('unequip_'.length);
    if (!slots.includes(slot)) return false;
    for(const [key,value] of Object.entries(state.equipment.equipped))if(key===slot||state.characterDialogueVersion===28&&itemById(value,state)?.slot===slot)state.equipment.equipped[key]=null;
    state.notice = `You put away your ${slot}.`;
    return true;
  }
  const item = itemById(id,state);
  if (!item || !state.equipment.owned.includes(id)) return false;
  if(state.characterDialogueVersion===28){
    for(const [slot,value] of Object.entries(state.equipment.equipped))if(itemById(value,state)?.slot===item.slot)state.equipment.equipped[slot]=null;
    const occupying=itemById(state.equipment.equipped[item.slot],state);
    if(occupying&&occupying.slot!==item.slot){state.equipment.equipped[occupying.slot]=occupying.id;state.equipment.equipped[item.slot]=null;}
  }
  state.equipment.equipped[item.slot] = id;
  state.notice = `You equipped ${item.name}. Its bonuses apply when the next encounter begins.`;
  return true;
}

export function validateGear(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.owned) || value.owned.length > GEAR_CATALOG.length+120 || new Set(value.owned).size !== value.owned.length) return false;
  if(!validateGearOrganizer(value.organizer,value))return false;
  if (!validateGearInstances(value.instances,GEAR_CATALOG))return false;
  if((value.instances||[]).some(i=>i.stolen&&!value.owned.includes(i.id)))return false;
  const state={equipment:value,characterDialogueVersion:28};
  const occupied=new Set();
  if (value.owned.some((id) => !itemById(id,state)) || !value.equipped || !value.materials) return false;
  for (const slot of slots) {
    if(['weapon','armor','trinket'].includes(slot)&&!Object.hasOwn(value.equipped,slot))return false;
    const id = value.equipped[slot];
    if (id !== undefined && id !== null && (!value.owned.includes(id) || !slotFits(itemById(id,state),slot))) return false;
    if(id){const key=itemById(id,state).slot;if(occupied.has(key))return false;occupied.add(key);}
  }
  return MATERIAL_IDS.every((key) => (!['ore', 'cloth'].includes(key) && !(key in value.materials)) || Number.isSafeInteger(value.materials[key]) && value.materials[key] >= 0);
}
