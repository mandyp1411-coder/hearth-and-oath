import { newCottageReason } from './home-ownership.js';
import { AFFIXES } from './gear-loot.js';
import { gearSaleValue, returnQuote } from './economy-values.js';
import { householdCostPreview } from './budget.js';
import { GEAR_CATALOG, MATERIAL_IDS, initializeGear, getGearItem } from './gear.js';
import { seededRoll, isSettlement } from './world.js';
import { communitySupport, communityResourceIntervals } from './community.js';
import { recordIndependentRefuge } from './lunar-refuge.js';

export const ARTISAN_PATTERNS = ['duelist','arcanist','vanguard','wayfarer'].map(id=>({id,name:AFFIXES[id].name.slice(7),bonuses:{...AFFIXES[id].bonuses},days:5,cost:120,skill:3,tier:2}));
const patternById=id=>ARTISAN_PATTERNS.find(p=>p.id===id);
const fittedRecipe=item=>({materials:{...materialsOf(item.recipe),crystal:(item.recipe.crystal || 0)+2,cloth:(item.recipe.cloth || 0)+1},cost:item.recipe.gold+120,days:item.craftDays+2});
const names = { ore: 'Ore', cloth: 'Cloth', wood: 'Timber', stone: 'Stone', hide: 'Hide', crystal: 'Crystal' };
const bounded = n => Math.max(0, Math.min(100, n));
const materialsOf = recipe => Object.fromEntries(Object.entries(recipe || {}).filter(([key, amount]) => MATERIAL_IDS.includes(key) && amount > 0));
const materialText = materials => Object.entries(materials).filter(([,n])=>Number.isFinite(n)&&n>0).map(([id, n]) => `${n} ${id}`).join(', ') || 'no materials';
const location = (state, id = state.locationId) => state.world?.locations?.find(place => place.id === id);
const usable = place => !!place && !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false;
const ready = state => !!state.workshop && !!state.equipment && state.phase !== 'retired' && (state.timeline?.mode === 'birth' ? state.age >= 16 : state.phase === 'adult') && !state.event && !state.battle && !state.conversations?.pending && !state.dungeon && !state.timeline?.journey && !state.careers?.batch && !state.life?.plan && !state.community?.project?.commitment;
const itemById = id => GEAR_CATALOG.find(item => item.id === id);
const structureAt = (state, type, id = state.locationId) => state.workshop?.structures.find(structure => structure.type === type && structure.locationId === id);
const sound = (state, type, id = state.locationId) => {
  const structure = structureAt(state, type, id);
  return structure?.condition === 'sound' && usable(location(state, id)) ? structure : null;
};

export const BUILDING_CATALOG = [
  { id: 'shelter', name: 'Weatherproof shelter', description: 'Raise a safe roof at this site from gathered timber and cloth.', benefit: 'Creates stable shelter; a quiet night here restores 14 HP and 8 MP.', materials: { wood: 4, stone: 2, cloth: 2 }, days: 3, cost: 6, skill: 0 },
  { id: 'cottage', name: 'Family cottage', description: 'Build a lasting cottage around your shelter. Requires a sound shelter at this site.', benefit: 'Creates secure household housing, supports family plans, and improves a quiet night to 24 HP and 12 MP.', materials: { wood: 10, stone: 8, cloth: 4 }, days: 7, cost: 38, skill: 0 },
  { id: 'forge', name: 'Small smithy', description: 'Fit a charcoal hearth, anvil, and weatherproof workbench.', benefit: 'Unlocks tier 2 recipes at your chosen site. Upgrade it for tier 3 work.', materials: { ore: 6, stone: 6, wood: 4 }, days: 5, cost: 24, skill: 1 },
  { id: 'garden', name: 'Herb garden', description: 'Fence a sunny patch and plant local healing herbs.', benefit: 'Harvest 3 herbs after each 30 days of growth; harvests require one day of work.', materials: { wood: 4, stone: 2 }, days: 3, cost: 8, skill: 0 },
  { id: 'study', name: 'Quiet study', description: 'Fit a dry desk and shelves in a shelter or cottage at this site.', benefit: 'Three days of reading raise scholarship by 1; a lesson is available once per 14 days.', materials: { wood: 6, cloth: 3, crystal: 1 }, days: 4, cost: 16, skill: 1 },
  { id: 'refuge', name: 'Moon-watch refuge', description: 'Build a secure room with a reinforced door and a place to practice restraint.', benefit: 'Prepare safely for the next full moon; a dedicated control lesson is available per lunar cycle.', materials: { wood: 8, stone: 6, ore: 2, hide: 2 }, days: 5, cost: 18, skill: 1 },
];
const buildingById = id => BUILDING_CATALOG.find(building => building.id === id);

const gathering = {
  ore: { days: 2, cost: 0, replenish: 7, sites: { forest: 2, ruin: 3, mountain: 3, marsh: 2 }, text: 'Work accessible mineral banks, without entering combat.' },
  cloth: { days: 1, cost: 0, replenish: 5, sites: { home: 2, brook: 2, city: 2, camp: 2, citadel: 2, coast: 2 }, text: 'Help the cooperative sort fibers and keep usable scraps.' },
  wood: { days: 2, cost: 0, replenish: 7, sites: { home: 2, brook: 2, forest: 4, marsh: 2, camp: 2, sanctuary: 2 }, text: 'Collect fallen timber and season straight pieces for construction.' },
  stone: { days: 2, cost: 0, replenish: 5, sites: { home: 2, brook: 2, city: 2, forest: 2, ruin: 3, mountain: 4, marsh: 2, coast: 3, tower: 3, camp: 2, gate: 3, citadel: 2, sanctuary: 2 }, text: 'Cut loose fieldstone and carry it back to your work site.' },
  hide: { days: 3, cost: 2, replenish: 10, sites: { forest: 2, marsh: 1, camp: 2 }, text: 'Assist local hunters and tan a share of ethically taken hides.' },
  crystal: { days: 3, cost: 0, replenish: 14, sites: { ruin: 1, mountain: 2, sanctuary: 1 }, text: 'Carefully prise out exposed crystals; the deposit takes time to recover.' },
};
const capacity = (state, material, site) => (material === 'crystal' ? 4 : material === 'hide' ? 6 : 8) + seededRoll(state.seed || '', `workshop:${site}:${material}`, material === 'crystal' ? 3 : 5);
function stockAt(state, material, site = state.locationId) {
  const max = capacity(state, material, site), node = state.workshop?.sites?.[site]?.[material];
  if (!node) return { stock: max, updatedDay: state.day, capacity: max };
  const intervals = communityResourceIntervals(state, site, node.updatedDay, state.day);
  if (intervals.length || node.recoveryProgress !== undefined) {
    const normalRate = gathering[material].replenish, supportedRate = Math.max(2, normalRate - 2);
    const supportedDays = intervals.reduce((total, interval) => total + interval.toDay - interval.fromDay, 0);
    const elapsed = Math.max(0, state.day - node.updatedDay);
    const progress = (node.recoveryProgress || 0) + (elapsed - supportedDays) / normalRate + supportedDays / supportedRate;
    const gained = Math.floor(progress + 1e-9), stock = Math.min(max, node.stock + gained);
    return { stock, updatedDay: state.day, capacity: max, recoveryProgress: stock === max ? 0 : Math.max(0, Math.min(.999999999, progress - gained)) };
  }
  const elapsed = Math.max(0, state.day - node.updatedDay), gained = Math.floor(elapsed / gathering[material].replenish);
  return { stock: Math.min(max, node.stock + gained), updatedDay: node.updatedDay + gained * gathering[material].replenish, capacity: max };
}

export function initializeWorkshop(state, { migration = false } = {}) {
  initializeGear(state);
  if (!state.workshop) state.workshop = { crafting: 0, structures: [], sites: {}, project: null, history: [] };
  // Deliberately grant no resources, past projects, or invented buildings on migration.
  void migration;
}

export function buildingBenefits(state, locationId = state.locationId) {
  const shelter = !!sound(state, 'shelter', locationId), cottage = !!sound(state, 'cottage', locationId);
  const forge = sound(state, 'forge', locationId);
  return { shelter, cottage, forgeTier: forge ? forge.level + 1 : 0, garden: !!sound(state, 'garden', locationId), study: !!sound(state, 'study', locationId), refuge: !!sound(state, 'refuge', locationId), recoveryHp: cottage ? 24 : shelter ? 14 : 0, recoveryMp: cottage ? 12 : shelter ? 8 : 0, householdSupport: cottage ? 10 : shelter ? 4 : 0 };
}

export function workshopTier(state) {
  const place = location(state);
  if (!usable(place)) return 0;
  let publicTier = 0;
  if (place.services?.includes('smith') || ['city', 'citadel'].includes(place.id)) publicTier = 2;
  else if (place.services?.includes('market') || ['city', 'village'].includes(place.type) || ['home', 'brook', 'camp', 'coast'].includes(place.id)) publicTier = 1;
  return Math.max(publicTier, buildingBenefits(state).forgeTier);
}

const missingMaterials = (state, required) => Object.entries(required).filter(([id, n]) => (state.equipment.materials[id] || 0) < n);
const reasonFor = (state, required, cost, skill = 0, tier = 0) => {
  if (state.workshop.crafting < skill) return `Requires crafting ${skill}; you have ${state.workshop.crafting}.`;
  if (workshopTier(state) < tier) return `Requires a tier ${tier} workbench; this site provides tier ${workshopTier(state)}.`;
  if (missingMaterials(state, required).length) return `Requires ${materialText(required)}.`;
  if (state.hero.gold < cost) return `Requires ${cost} gold; you have ${state.hero.gold}.`;
  return null;
};
const action = (id, label, description, days = 0, cost = 0, reason, materials = {}, requirements = {}) => ({ id, label, description, days, cost, group: 'Workshop', materials, requirements, ...(reason ? { disabledReason: reason } : {}) });
function recipeAction(state, item) {
  const materials = materialsOf(item.recipe), days = item.craftDays, cost = item.recipe.gold;
  const reason = state.equipment.owned.includes(item.id) ? `You already own ${item.name}.` : reasonFor(state, materials, cost, item.craftSkill, item.workshopTier);
  return action(`workshop_craft_${item.id}`, `Craft ${item.name}`, `${item.description} Output: 1 ${item.name} and +1 crafting. Requires ${materialText(materials)}, ${cost} gold, ${days} days, crafting ${item.craftSkill}, tier ${item.workshopTier} workbench.`, days, cost, reason, materials, { crafting: item.craftSkill, workshopTier: item.workshopTier });
}
export function craftReturnQuote(state,item,pattern=null) {
  const recipe=pattern?fittedRecipe(item):{materials:materialsOf(item.recipe),cost:item.recipe.gold,days:item.craftDays};
  const merchant=isSettlement(state.world,state.locationId)?state.realm?.sites?.[state.locationId]?.merchant:null;
  const output=pattern?{...item,price:Math.round(item.price*1.55+5),quality:'uncommon',crafted:true}:item;
  return {...returnQuote({materials:recipe.materials,fee:recipe.cost,days:recipe.days,receipt:gearSaleValue(output,merchant),living:state.householdBudget?householdCostPreview(state,recipe.days).additionalCost:0}),quality:pattern?'Sound, uncommon; chosen pattern':'Standard design',localQuote:!!merchant};
}
function fittedAction(state,item,pattern) {
  const recipe=fittedRecipe(item),learned=state.workshop.patterns?.includes(pattern.id),q=craftReturnQuote(state,item,pattern.id);
  const reason=!learned?`Study the ${pattern.name} pattern first.`:(state.equipment.instances?.length || 0)>=120?'Your gear bag has reached its 120 individually made or found pieces.':reasonFor(state,recipe.materials,recipe.cost,Math.max(3,item.craftSkill),Math.max(2,item.workshopTier));
  return action(`workshop_fitted_${item.id}_${pattern.id}`,`Make ${item.name} ${AFFIXES[pattern.id].name}`,`One sound (uncommon) piece: +1 to its principal stat and ${Object.entries(pattern.bonuses).map(([k,n])=>`+${n} ${k}`).join(', ')}. Three matching patterns add their existing set bonus. No random quality, rare drop, or auto-equip. Requires ${materialText(recipe.materials)}, ${recipe.cost} gold and ${recipe.days} real days. Merchant receipt ${q.receipt} gold; net value ${q.netValue} after fees, ingredients at replacement prices and about ${q.living} living costs.`,recipe.days,recipe.cost,reason,recipe.materials,{crafting:Math.max(3,item.craftSkill),workshopTier:Math.max(2,item.workshopTier),pattern:pattern.id});
}
function buildingAction(state, building) {
  const existing = structureAt(state, building.id);
  let reason = (building.id==='cottage'&&newCottageReason(state)) || (existing && existing.condition !== 'lost' ? `This site already has a ${building.name.toLowerCase()}.` : reasonFor(state, building.materials, building.cost, building.skill));
  if (!reason && ['cottage', 'study'].includes(building.id) && !sound(state, 'shelter') && !sound(state, 'cottage')) reason = 'Build a sound shelter at this site first.';
  return action(`workshop_build_${building.id}`, `Build ${building.name}`, `${building.description} Output: 1 building here and +1 crafting. ${building.benefit} Requires ${materialText(building.materials)}, ${building.cost} gold, ${building.days} days, crafting ${building.skill}.`, building.days, building.cost, reason, building.materials, { crafting: building.skill });
}
function gatherAction(state, material) {
  const route = gathering[material], amount = route.sites[state.locationId];
  if (!amount) return null;
  const rate = Math.max(2, route.replenish - communitySupport(state).resourceRecoveryBonus);
  const stock = stockAt(state, material), wait = Math.max(1, stock.recoveryProgress === undefined ? (amount - stock.stock) * rate - (state.day - stock.updatedDay) : Math.ceil((amount - stock.stock - stock.recoveryProgress) * rate));
  const reason = stock.stock < amount ? `The site has ${stock.stock}/${stock.capacity} ${material}; enough returns in ${wait} days.` : state.hero.gold < route.cost ? `Requires ${route.cost} gold.` : null;
  return action(`workshop_gather_${material}`, `Gather ${names[material].toLowerCase()}`, `${route.text} Output: ${amount} ${material}; ${route.days} days, ${route.cost} gold. Stock: ${stock.stock}/${stock.capacity}; regrows by 1 every ${rate} days, including across years.${rate < route.replenish ? ' The actual funded commons supports recovery only during its recorded operating periods.' : ''} No skill or workbench required.`, route.days, route.cost, reason, {}, { output: { [material]: amount } });
}

export function workshopActions(state) {
  if (!ready(state)) return [];
  const project = state.workshop.project;
  if (project) return [
    action('workshop_continue', `Continue ${project.title.toLowerCase()}`, `${project.remainingDays} days remain. Previously committed gold and materials are not charged again.`, project.remainingDays, 0, state.locationId !== project.locationId ? 'Return to the project site first.' : !usable(location(state)) ? 'The project site is unavailable; cancel the project to free your plans.' : null),
    action('workshop_cancel', 'Abandon this project', `Lose the ${project.cost} gold and ${materialText(project.materials)} already committed. Reserved gathering stock is also spent; no unfinished output is awarded.`, 0, 0),
  ];
  if (!usable(location(state))) return [];
  const actions = MATERIAL_IDS.map(material => gatherAction(state, material)).filter(Boolean);
  actions.push(...GEAR_CATALOG.filter(item => item.workshopTier).flatMap(item => [recipeAction(state,item),...ARTISAN_PATTERNS.filter(p=>state.workshop.patterns?.includes(p.id)).map(pattern=>fittedAction(state,item,pattern))]));
  actions.push(...ARTISAN_PATTERNS.map(pattern=>action(`workshop_pattern_${pattern.id}`,`Study the ${pattern.name} pattern`,`Learn a repeatable equipment finish for ${pattern.cost} gold and ${pattern.days} real days. ${Object.entries(pattern.bonuses).map(([k,n])=>`+${n} ${k}`).join(', ')} alongside sound quality. Each finished piece consumes its own recipe; found rare gear can be stronger.`,pattern.days,pattern.cost,state.workshop.patterns?.includes(pattern.id)?'This pattern is already learned.':reasonFor(state,{},pattern.cost,pattern.skill,pattern.tier),{}, {crafting:pattern.skill,workshopTier:pattern.tier})));
  actions.push(...BUILDING_CATALOG.map(building => buildingAction(state, building)));
  actions.push(action('workshop_practice', 'Practice toolwork', 'Output: +1 crafting skill. Repair communal tools for 3 days and 4 gold. Requires a tier 1 workbench; no materials.', 3, 4, reasonFor(state, {}, 4, 0, 1) || (state.workshop.crafting >= 100 ? 'Your toolwork is already fully practiced.' : null), {}, { workshopTier: 1 }));
  const forge = sound(state, 'forge');
  if (forge) actions.push(action('workshop_upgrade_forge', 'Upgrade to a master forge', 'Output: tier 3 workbench here and +1 crafting. Requires 8 ore, 8 stone, 4 crystal, 35 gold, 6 days, crafting 3.', 6, 35, forge.level >= 2 ? 'This forge already supports masterwork.' : reasonFor(state, { ore: 8, stone: 8, crystal: 4 }, 35, 3), { ore: 8, stone: 8, crystal: 4 }, { crafting: 3 }));
  for (const structure of state.workshop.structures.filter(entry => entry.locationId === state.locationId && entry.condition === 'damaged')) actions.push(action(`workshop_repair_${structure.type}`, `Repair ${buildingById(structure.type).name}`, 'Output: restore this damaged building to sound condition and +1 crafting. Requires 2 wood, 2 stone, 6 gold and 2 days.', 2, 6, reasonFor(state, { wood: 2, stone: 2 }, 6), { wood: 2, stone: 2 }));
  const benefits = buildingBenefits(state);
  if (benefits.shelter || benefits.cottage) actions.push(action('workshop_rest', 'Keep a quiet night at home', `Output: restore ${benefits.recoveryHp} HP and ${benefits.recoveryMp} MP, reduce stress by 5. Requires 1 day, 0 gold and no materials.`, 1, 0));
  const garden = sound(state, 'garden');
  if (garden) {
    const last = activityDay(state, `garden:${garden.id}`, garden.completedDay);
    actions.push(action('workshop_harvest', 'Tend and harvest your garden', 'Output: 3 healing herbs. Requires 1 day and 0 gold. The beds need 30 days between harvests.', 1, 0, state.day < last + 30 ? `The garden will be ready in ${last + 30 - state.day} days.` : null));
  }
  const study = sound(state, 'study');
  if (study) {
    const last = activityDay(state, `study:${study.id}`, study.completedDay - 14);
    actions.push(action('workshop_read', 'Read in your study', 'Output: +1 scholarship and recover 6 MP. Requires 3 days, 0 gold and no materials. One focused lesson per 14 days.', 3, 0, state.day < last + 14 ? `A new lesson is available in ${last + 14 - state.day} days.` : null));
  }
  const refuge = sound(state, 'refuge');
  if (refuge && state.hero.condition?.type === 'lycanthrope') {
    const last = activityDay(state, `refuge:${refuge.id}`, refuge.completedDay - 28);
    const controlGain = state.revision >= 5 ? 12 : 5;
    actions.push(action('workshop_prepare_refuge', 'Prepare your moon-watch refuge', `Output: prepare safely through the next full moon and gain ${controlGain} control.${controlGain > 5 ? ' Your permanent room supports steadier practice than a temporary field refuge.' : ''} Requires 2 days, 0 gold and no materials. One lesson per 28 days.`, 2, 0, state.day < last + 28 ? `Practice restraint again in ${last + 28 - state.day} days.` : null));
  }
  return actions;
}

function activityDay(state, id, fallback) {
  const type = id.split(':')[0], site = id.slice(id.indexOf(':') + 1).replace(new RegExp(`_${type}$`), '');
  return state.workshop.sites[site]?.activities?.[type] ?? state.workshop.history.filter(entry => entry.activityId === id).at(-1)?.day ?? fallback;
}
function record(state, ctx, title, text, activityId = null) {
  state.notice = text;
  state.workshop.history.push({ id: `workshop-${state.day}-${state.workshop.history.length}-${title}`, day: state.day, locationId: state.locationId, title, text, ...(activityId ? { activityId } : {}) });
  state.workshop.history = state.workshop.history.slice(-120);
  (ctx.journalLiteral||ctx.journal)?.(title, text, 'workshop');
}
function makeProject(state, descriptor, kind, targetId, output = {}) {
  const materials = { ...descriptor.materials };
  for (const [key, amount] of Object.entries(materials)) state.equipment.materials[key] -= amount;
  state.workshop.project = { id: descriptor.id, kind, locationId: state.locationId, targetId, title: descriptor.label, description: descriptor.description, totalDays: descriptor.days, remainingDays: descriptor.days, cost: descriptor.cost, materials, startedDay: state.day, output };
  if (descriptor.requirements?.pattern) state.workshop.project.pattern = descriptor.requirements.pattern;
  if (kind === 'refuge') state.workshop.project.controlGain = state.revision >= 5 ? 12 : 5;
}
function completeProject(state, ctx, project) {
  const place = location(state, project.locationId);
  if (!usable(place)) { record(state, ctx, 'Work stranded at an unsafe site', 'The place became unavailable before your project finished. Committed supplies were lost; no output was awarded.'); return; }
  if (project.kind === 'gather') {
    for (const [key, amount] of Object.entries(project.output)) state.equipment.materials[key] += amount;
  } else if (project.kind === 'pattern') {
    state.workshop.patterns ||= [];
    if(!state.workshop.patterns.includes(project.targetId))state.workshop.patterns.push(project.targetId);
  } else if (project.kind === 'fitted') {
    const id=`found_${seededRoll(state.seed,`crafted:${project.id}:${project.startedDay}:${project.locationId}`,2147483647).toString(36)}_${state.dynasty?.generation || 1}`;
    state.equipment.instances ||= [];
    if(state.equipment.instances.length>=120 || state.equipment.instances.some(i=>i.id===id)){record(state,ctx,'No room for the finished piece','The bag has no space for another individually recorded piece; the committed work was not refunded.');return;}
    state.equipment.instances.push({id,baseId:project.targetId,quality:'uncommon',affix:project.pattern,tier:1,source:project.locationId,day:state.day,crafted:true});
    state.equipment.owned.push(id);state.workshop.crafting=Math.min(100,state.workshop.crafting+1);
  } else if (project.kind === 'craft') {
    if (!state.equipment.owned.includes(project.targetId)) state.equipment.owned.push(project.targetId);
    state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
  } else if (project.kind === 'build') {
    state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
    const old = structureAt(state, project.targetId, project.locationId);
    const structure = { id: `${project.locationId}_${project.targetId}`, type: project.targetId, locationId: project.locationId, level: 1, completedDay: state.day, condition: 'sound' };
    if (old) Object.assign(old, structure); else state.workshop.structures.push(structure);
    if (project.targetId === 'shelter' && state.family?.housing === 'unsheltered') state.family.housing = 'shelter';
    if (project.targetId === 'cottage') {
      if (state.life?.home?.tier === 'lodgings') Object.assign(state.life.home, { tier: 'cottage', source: 'construction', locationId: project.locationId });
      if (state.family) { state.family.housing = 'secure'; state.family.support = bounded(state.family.support + 10); }
    }
    markWorld(state, structure, `${buildingById(project.targetId).name} completed`, `You completed a ${buildingById(project.targetId).name.toLowerCase()} in ${place.name}.`);
  } else if (project.kind === 'upgrade') {
    state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
    const forge = structureAt(state, 'forge', project.locationId);
    if (forge) { forge.level = 2; forge.completedDay = state.day; markWorld(state, forge, 'A master forge is ready', 'Your smithy now supports tier 3 recipes.'); }
  } else if (project.kind === 'repair') {
    state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
    const structure = structureAt(state, project.targetId, project.locationId);
    if (structure) {
      structure.condition = 'sound';
      if (structure.type === 'cottage' && state.life?.home?.tier === 'lodgings') {
        Object.assign(state.life.home, { tier: 'cottage', source: 'construction', locationId: structure.locationId });
        if (state.family) state.family.housing = 'secure';
      }
      markWorld(state, structure, 'A building restored', `You repaired your ${buildingById(structure.type).name.toLowerCase()}.`);
    }
  } else if (project.kind === 'practice') state.workshop.crafting = Math.min(100, state.workshop.crafting + 1);
  else if (project.kind === 'rest') {
    const benefit = buildingBenefits(state, project.locationId);
    state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + benefit.recoveryHp);
    state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + benefit.recoveryMp);
    if (state.life) state.life.stress = bounded(state.life.stress - 5);
  } else if (project.kind === 'garden') {
    if (sound(state, 'garden', project.locationId)) state.flags.herbs = (state.flags.herbs || 0) + 3;
  } else if (project.kind === 'study') {
    if (sound(state, 'study', project.locationId)) { state.hero.skills.scholarship = (state.hero.skills.scholarship || 0) + 1; state.hero.mp = Math.min(state.hero.maxMp, state.hero.mp + 6); }
  } else if (project.kind === 'refuge' && sound(state, 'refuge', project.locationId) && state.hero.condition?.type === 'lycanthrope') {
    const condition = state.hero.condition;
    condition.control = bounded(condition.control + (project.controlGain ?? 5));
    condition.preparedUntil = Math.max(condition.preparedUntil, 14 + 28 * Math.ceil((state.day - 14) / 28));
    recordIndependentRefuge(state);
  }
  const activityId = project.kind === 'garden' ? `garden:${project.locationId}_garden` : project.kind === 'study' ? `study:${project.locationId}_study` : project.kind === 'refuge' ? `refuge:${project.locationId}_refuge` : null;
  if (activityId) {
    state.workshop.sites[project.locationId] ||= {};
    state.workshop.sites[project.locationId].activities ||= {};
    state.workshop.sites[project.locationId].activities[project.kind] = state.day;
  }
  const output = project.kind === 'gather' ? materialText(project.output) : project.kind === 'fitted' ? `${itemById(project.targetId).name} ${AFFIXES[project.pattern].name}` : project.kind === 'pattern' ? `${patternById(project.targetId).name} pattern learned` : project.kind === 'craft' ? itemById(project.targetId).name : project.kind === 'build' ? buildingById(project.targetId).name : project.title;
  record(state, ctx, 'Work brought to completion', `${project.title} is complete: ${output}. ${project.totalDays} days of work and the committed supplies have been accounted for.`, activityId);
  ctx.completedActionId = project.id;
  if (['gather', 'craft', 'fitted', 'pattern', 'build', 'upgrade', 'repair', 'practice'].includes(project.kind)) ctx.earnExperience?.(project.kind === 'gather' ? 2 : 4);
}
function markWorld(state, structure, title, text) {
  if (!state.world) return;
  state.world.changes ||= [];
  state.world.changes.push({ id: `${structure.id}-${state.day}-${state.world.changes.length}`, day: state.day, locationId: structure.locationId, title, text });
  state.world.changes = state.world.changes.slice(-500);
}
function progressProject(state, ctx) {
  const project = state.workshop.project;
  if (!project) return;
  const oldDay = state.day;
  const reported = ctx.spendDays?.(project.remainingDays, { outdoors: project.kind === 'gather' });
  const elapsed = Math.max(0, state.day - oldDay);
  const actual = Math.min(project.remainingDays, elapsed, Number.isFinite(reported) ? Math.max(0, reported) : elapsed);
  project.remainingDays -= actual;
  if (project.remainingDays === 0) { state.workshop.project = null; completeProject(state, ctx, project); }
  else {
    state.notice = `${project.title} pauses with ${project.remainingDays} days remaining. Your committed supplies remain in this project; resolve the interruption, then continue without another fee.`;
    ctx.pendingNeed?.();
  }
}

// Engine charges the advertised gold once, then calls this before its generic
// time charge. Every output is withheld until ctx.spendDays really completes it.
export function applyWorkshopAction(state, id, ctx = {}) {
  if (typeof id !== 'string' || !id.startsWith('workshop_')) return false;
  if (!ready(state)) return false;
  const descriptor = workshopActions(state).find(entry => entry.id === id);
  if (!descriptor) return false;
  delete ctx.completedActionId;
  // Gold was already paid by the engine; recheck every other precondition.
  const afterFeeReason = descriptor.disabledReason;
  if (afterFeeReason && !/^Requires \d+ gold/.test(afterFeeReason)) { state.notice = afterFeeReason; return true; }
  if (id === 'workshop_cancel') {
    const project = state.workshop.project;
    state.workshop.project = null;
    record(state, ctx, 'A project abandoned', `You abandoned ${project.title.toLowerCase()}. Its ${project.cost} gold, ${materialText(project.materials)}, and reserved gathering stock were committed and are not refunded.`);
    return true;
  }
  if (id === 'workshop_continue') { progressProject(state, ctx); return true; }
  let kind, targetId, output = {};
  if (id.startsWith('workshop_gather_')) {
    kind = 'gather'; targetId = id.slice('workshop_gather_'.length);
    const stock = stockAt(state, targetId), amount = gathering[targetId].sites[state.locationId];
    if (stock.stock < amount) { state.notice = 'That gathering site needs time to recover.'; return true; }
    state.workshop.sites[state.locationId] ||= {};
    state.workshop.sites[state.locationId][targetId] = { stock: stock.stock - amount, updatedDay: stock.updatedDay, ...(stock.recoveryProgress === undefined ? {} : { recoveryProgress: stock.recoveryProgress }) };
    output = { [targetId]: amount };
  } else if (id.startsWith('workshop_pattern_')) {kind='pattern';targetId=id.slice('workshop_pattern_'.length);}
  else if (id.startsWith('workshop_fitted_')) {kind='fitted';targetId=GEAR_CATALOG.find(item=>id===`workshop_fitted_${item.id}_${descriptor.requirements.pattern}`)?.id;}
  else if (id.startsWith('workshop_craft_')) { kind = 'craft'; targetId = id.slice('workshop_craft_'.length); }
  else if (id.startsWith('workshop_build_')) { kind = 'build'; targetId = id.slice('workshop_build_'.length); }
  else if (id.startsWith('workshop_repair_')) { kind = 'repair'; targetId = id.slice('workshop_repair_'.length); }
  else { kind = { workshop_upgrade_forge: 'upgrade', workshop_practice: 'practice', workshop_rest: 'rest', workshop_harvest: 'garden', workshop_read: 'study', workshop_prepare_refuge: 'refuge' }[id]; targetId = kind === 'upgrade' ? 'forge' : kind; }
  if (!kind || missingMaterials(state, descriptor.materials).length) { state.notice = 'The project’s materials are not available.'; return true; }
  makeProject(state, descriptor, kind, targetId, output);
  progressProject(state, ctx);
  return true;
}

export function refreshWorkshop(state, ctx = {}) {
  if (!state.workshop) return;
  for (const structure of state.workshop.structures) {
    const place = location(state, structure.locationId);
    const next = place?.status === 'destroyed' ? 'lost' : place?.status === 'evacuated' ? 'damaged' : structure.condition;
    if (next !== structure.condition && structure.condition !== 'lost') {
      structure.condition = next;
      if (structure.type === 'cottage' && state.life?.home?.source === 'construction' && state.life.home.locationId === structure.locationId) {
        state.life.home.tier = 'lodgings';
        delete state.life.home.source;
        delete state.life.home.locationId;
        if (state.family) {
          const caregiver = state.family.members?.filter(member => member.availability === 'present' && member.personId).map(member => state.life.people?.find(person => person.id === member.personId)).find(person => person?.alive !== false && ['parent', 'guardian'].includes(person?.familyRole) && usable(location(state, person.locationId)));
          const safeRoof = state.workshop.structures.some(entry => ['shelter', 'cottage'].includes(entry.type) && entry.condition === 'sound' && usable(location(state, entry.locationId)));
          state.family.housing = caregiver || safeRoof ? 'shelter' : 'unsheltered';
        }
      }
      record(state, ctx, 'A homestead changed with the world', `Your ${buildingById(structure.type).name.toLowerCase()} in ${place.name} is ${next}; its benefits are unavailable.`);
    }
  }
  for (const [site, nodes] of Object.entries(state.workshop.sites)) for (const material of Object.keys(nodes).filter(id => MATERIAL_IDS.includes(id))) {
    const stock = stockAt(state, material, site);
    nodes[material] = { stock: stock.stock, updatedDay: stock.updatedDay };
  }
}

export function workshopView(state) {
  if (!state.workshop) return { summary: 'Making a home becomes available in a settled life.', crafting: 0, materials: [], structures: [], project: null, gathering: [], recipes: [], buildings: [], history: [] };
  const actions = workshopActions(state), get = id => actions.find(entry => entry.id === id);
  const unavailable = state.timeline?.mode === 'birth' && state.age < 16 ? 'Gathering, crafting, and construction open at age 16.' : state.workshop.project ? 'Finish or cancel the current project first.' : !ready(state) ? 'Resolve the current scene, journey, or age requirement first.' : !usable(location(state)) ? 'This site is currently unavailable.' : null;
  return {
    summary: `Crafting ${state.workshop.crafting}. ${state.workshop.structures.filter(entry => entry.condition === 'sound' && usable(location(state, entry.locationId))).length} sound buildings across your region. This site has a tier ${workshopTier(state)} workbench. Gather timber in the forest, stone in the mountains, hide with hunters, and crystals at ruins or a sanctuary.`,
    crafting: state.workshop.crafting,
    patterns: ARTISAN_PATTERNS.map(pattern=>({...pattern,learned:!!state.workshop.patterns?.includes(pattern.id)})),
    materials: MATERIAL_IDS.map(id => ({ id, label: names[id], amount: state.equipment?.materials[id] || 0 })),
    structures: state.workshop.structures.map(structure => { const building = buildingById(structure.type); return { ...structure, name: building.name, description: building.description, benefit: structure.condition === 'sound' && usable(location(state, structure.locationId)) ? building.benefit : 'Benefits are unavailable until this site and structure are safe again.' }; }),
    project: state.workshop.project ? { title: state.workshop.project.title, description: state.workshop.project.description, remainingDays: state.workshop.project.remainingDays, totalDays: state.workshop.project.totalDays } : null,
    gathering: MATERIAL_IDS.map(id => gatherAction(state, id)).filter(Boolean).map(entry => ({ ...entry, disabledReason: unavailable || entry.disabledReason })),
    recipes: GEAR_CATALOG.filter(item => item.workshopTier).map(item => { const descriptor = get(`workshop_craft_${item.id}`) || recipeAction(state, item); return { id: item.id, itemId: item.id, name: item.name, description: item.description, slot: getGearItem(state,item.id)?.slot||item.slot, quote:craftReturnQuote(state,item),finishes:ARTISAN_PATTERNS.map(pattern=>{const a=fittedAction(state,item,pattern);return {id:pattern.id,itemId:item.id,name:item.name,description:a.description,slot:getGearItem(state,item.id)?.slot||item.slot,tier:Math.max(2,item.workshopTier),requiredCrafting:Math.max(3,item.craftSkill),materials:{...a.materials},days:a.days,cost:a.cost,quote:craftReturnQuote(state,item,pattern.id),actionId:a.id,disabledReason:unavailable||a.disabledReason};}), tier: item.workshopTier, requiredCrafting: item.craftSkill, materials: { ...descriptor.materials }, days: descriptor.days, cost: descriptor.cost, actionId: descriptor.id, disabledReason: unavailable || descriptor.disabledReason }; }),
    buildings: BUILDING_CATALOG.map(building => { const descriptor = get(`workshop_build_${building.id}`) || buildingAction(state, building); return { id: building.id, name: building.name, description: building.description, benefit: building.benefit, requiredCrafting: building.skill, materials: { ...building.materials }, days: descriptor.days, cost: descriptor.cost, actionId: descriptor.id, disabledReason: unavailable || descriptor.disabledReason }; }),
    history: state.workshop.history.map(entry => ({ ...entry })),
  };
}

const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const validMaterials = object => object && typeof object === 'object' && !Array.isArray(object) && Object.entries(object).every(([id, amount]) => MATERIAL_IDS.includes(id) && integer(amount));
export function validateWorkshop(value, state) {
  if (!value || !integer(value.crafting, 0, 100) || !Array.isArray(value.structures) || value.structures.length > 192 || !value.sites || typeof value.sites !== 'object' || Array.isArray(value.sites) || !Array.isArray(value.history) || value.history.length > 120) return false;
  if(value.patterns!==undefined&&(!Array.isArray(value.patterns)||value.patterns.length>4||new Set(value.patterns).size!==value.patterns.length||!value.patterns.every(id=>!!patternById(id))))return false;
  const validSite = id => typeof id === 'string' && (!state || !!location(state, id));
  const ids = new Set(), pairs = new Set();
  for (const structure of value.structures) {
    if (!structure || structure.id !== `${structure.locationId}_${structure.type}` || ids.has(structure.id) || !buildingById(structure.type) || !validSite(structure.locationId) || pairs.has(`${structure.locationId}:${structure.type}`) || !integer(structure.level, 1, structure.type === 'forge' ? 2 : 1) || !integer(structure.completedDay) || state && structure.completedDay > state.day || !['sound', 'damaged', 'lost'].includes(structure.condition)) return false;
    ids.add(structure.id); pairs.add(`${structure.locationId}:${structure.type}`);
  }
  if (Object.keys(value.sites).length > (state?.world?.locations.length||84)) return false;
  for (const [site, nodes] of Object.entries(value.sites)) {
    if (!validSite(site) || !nodes || typeof nodes !== 'object' || Array.isArray(nodes)) return false;
    for (const [material, node] of Object.entries(nodes)) {
      if (material === 'activities') {
        if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.entries(node).every(([kind, day]) => ['garden', 'study', 'refuge'].includes(kind) && integer(day) && (!state || day <= state.day))) return false;
      } else if (!gathering[material]?.sites[site] || !node || !integer(node.stock) || !integer(node.updatedDay) || node.recoveryProgress !== undefined && (!Number.isFinite(node.recoveryProgress) || node.recoveryProgress < 0 || node.recoveryProgress >= 1) || state && (node.stock > capacity(state, material, site) || node.updatedDay > state.day)) return false;
    }
  }
  if (!value.history.every(entry => entry && typeof entry.id === 'string' && integer(entry.day) && (!state || entry.day <= state.day) && validSite(entry.locationId) && typeof entry.title === 'string' && typeof entry.text === 'string' && (entry.activityId === undefined || typeof entry.activityId === 'string'))) return false;
  if (value.project === null) return true;
  const project = value.project;
  if (!project || typeof project.id !== 'string' || !project.id.startsWith('workshop_') || !['gather', 'craft', 'fitted', 'pattern', 'build', 'upgrade', 'repair', 'practice', 'rest', 'garden', 'study', 'refuge'].includes(project.kind) || !validSite(project.locationId) || typeof project.targetId !== 'string' || typeof project.title !== 'string' || typeof project.description !== 'string' || !integer(project.totalDays, 1, 365) || !integer(project.remainingDays, 1, project.totalDays) || !integer(project.cost) || !validMaterials(project.materials) || !validMaterials(project.output) || !integer(project.startedDay) || state && project.startedDay > state.day) return false;
  if(project.kind==='pattern'&&!patternById(project.targetId) || project.kind==='fitted'&&(!itemById(project.targetId)?.workshopTier||!patternById(project.pattern)||!value.patterns?.includes(project.pattern)) || project.pattern!==undefined&&project.kind!=='fitted')return false;
  if (project.controlGain !== undefined && (project.kind !== 'refuge' || ![5, 12].includes(project.controlGain) || state && state.revision < 5 && project.controlGain !== 5)) return false;
  if (project.kind === 'craft' && !itemById(project.targetId)?.workshopTier || ['build', 'repair'].includes(project.kind) && !buildingById(project.targetId) || project.kind === 'upgrade' && project.targetId !== 'forge') return false;
  if (project.kind === 'gather' && (!gathering[project.targetId]?.sites[project.locationId] || project.output[project.targetId] !== gathering[project.targetId].sites[project.locationId] || Object.keys(project.output).length !== 1)) return false;
  let expected;
  if (project.kind === 'gather') { const route = gathering[project.targetId]; expected = { id: `workshop_gather_${project.targetId}`, days: route.days, cost: route.cost, materials: {} }; }
  else if(project.kind==='pattern'){const p=patternById(project.targetId);expected={id:`workshop_pattern_${p.id}`,days:p.days,cost:p.cost,materials:{}};}
  else if(project.kind==='fitted'){const r=fittedRecipe(itemById(project.targetId));expected={id:`workshop_fitted_${project.targetId}_${project.pattern}`,days:r.days,cost:r.cost,materials:r.materials};}
  else if (project.kind === 'craft') { const item = itemById(project.targetId); expected = { id: `workshop_craft_${item.id}`, days: item.craftDays, cost: item.recipe.gold, materials: materialsOf(item.recipe) }; }
  else if (project.kind === 'build') { const building = buildingById(project.targetId); expected = { id: `workshop_build_${building.id}`, days: building.days, cost: building.cost, materials: building.materials }; }
  else if (project.kind === 'repair') expected = { id: `workshop_repair_${project.targetId}`, days: 2, cost: 6, materials: { wood: 2, stone: 2 } };
  else if (project.kind === 'upgrade') expected = { id: 'workshop_upgrade_forge', days: 6, cost: 35, materials: { ore: 8, stone: 8, crystal: 4 } };
  else expected = {
    practice: { id: 'workshop_practice', days: 3, cost: 4, materials: {} },
    rest: { id: 'workshop_rest', days: 1, cost: 0, materials: {} },
    garden: { id: 'workshop_harvest', days: 1, cost: 0, materials: {} },
    study: { id: 'workshop_read', days: 3, cost: 0, materials: {} },
    refuge: { id: 'workshop_prepare_refuge', days: 2, cost: 0, materials: {} },
  }[project.kind];
  if (project.id !== expected.id || project.totalDays !== expected.days || project.cost !== expected.cost || Object.keys(project.materials).length !== Object.keys(expected.materials).length || Object.entries(expected.materials).some(([id, amount]) => project.materials[id] !== amount) || project.kind !== 'gather' && Object.keys(project.output).length) return false;
  if (state && state.day - project.startedDay < project.totalDays - project.remainingDays) return false;
  return true;
}

export function projectSupplyGuide(state) {
  const community=state.community?.project,p=community || state.workshop?.project;if(!p)return null;
  const stage=community?p.stages?.[p.step]:null,committed=community?!!p.commitment?.paid:true;
  const materials=committed?(community?p.commitment.materials:p.materials):stage?.materials || {};
  const cost=committed?(community?p.commitment.cost:p.cost):stage?.cost || 0;
  const shortfall=committed?{}:Object.fromEntries(Object.entries(materials).map(([id,n])=>[id,Math.max(0,n-(state.equipment.materials[id] || 0))]).filter(([,n])=>n>0));
  return {siteId:p.locationId,siteName:state.world.locations.find(l=>l.id===p.locationId)?.name || 'The recorded site',milestone:stage?.title || p.title,committed,materials:{...materials},cost,remainingDays:community?p.commitment?.remainingDays || stage?.days:p.remainingDays,shortfall,sources:Object.keys(shortfall).flatMap(id=>Object.entries(gathering[id]?.sites || {}).filter(([site])=>state.cartography?.sites?.[site]).map(([site,amount])=>({material:id,amount,siteId:site,siteName:state.world.locations.find(l=>l.id===site)?.name || site,known:state.cartography.sites[site].kind}))).slice(0,6),goldShortfall:committed?0:Math.max(0,cost-state.hero.gold),actionId:community?(committed?'community_continue':'community_stage'):'workshop_continue'};
}
