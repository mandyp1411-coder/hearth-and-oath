import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../dist/js/world.js';
import { GEAR_CATALOG, gearBonuses, equipItem, validateGear, applyGearAction } from '../dist/js/gear.js';
import { initializeWorkshop, workshopActions, applyWorkshopAction, refreshWorkshop, workshopView, validateWorkshop, buildingBenefits, workshopTier } from '../dist/js/workshop.js';

function life(seed = 'a makers life') {
  const state = { revision: 4, phase: 'adult', age: 18, day: 12, seed, locationId: 'home', world: generateWorld(seed, { expanded: true }), event: null, battle: null, dungeon: null, timeline: { mode: 'legacy', journey: null }, hero: { path: 'warrior', gold: 100, hp: 30, maxHp: 60, mp: 10, maxMp: 30, attributes: { strength: 6 }, skills: { scholarship: 2 } }, flags: { herbs: 0 }, family: { housing: 'unsheltered', support: 15 }, life: { home: { tier: 'lodgings' }, stress: 30 }, journal: [] };
  initializeWorkshop(state);
  return state;
}
function context(state, stopAfter = Infinity) {
  return { spendDays(days) { const actual = Math.min(days, stopAfter); state.day += actual; return actual; }, journal(title, text, tag) { state.journal.push({ title, text, tag }); }, earnExperience(amount) { state.xp = (state.xp || 0) + amount; } };
}
function perform(state, id, stopAfter = Infinity) {
  const descriptor = workshopActions(state).find(entry => entry.id === id);
  assert.ok(descriptor, `${id} must be offered`);
  assert.equal(descriptor.disabledReason, undefined, descriptor.disabledReason);
  const oldGold = state.hero.gold, oldDay = state.day;
  state.hero.gold -= descriptor.cost; // Exactly the engine's fee order.
  const ctx = context(state, stopAfter);
  assert.equal(applyWorkshopAction(state, id, ctx), true);
  assert.equal(state.hero.gold, oldGold - descriptor.cost, 'module must not recharge gold');
  assert.equal(state.day, oldDay + Math.min(descriptor.days, stopAfter), 'module spends actual time once');
  assert.equal(validateWorkshop(state.workshop, state), true);
  assert.equal(validateGear(state.equipment), true);
  return ctx;
}
function supplies(state, materials) { for (const [id, amount] of Object.entries(materials)) state.equipment.materials[id] += amount; }

test('a pending conversation disables gathering controls and direct work without spending time or supplies', () => {
  const state = life();
  state.conversations = { pending: { personId: 'kin', nodeId: 'household' } };
  const before = structuredClone(state);
  assert.deepEqual(workshopActions(state), []);
  const view = workshopView(state);
  assert.ok(view.gathering.length > 0);
  assert.ok(view.gathering.every(action => action.disabledReason));
  assert.equal(applyWorkshopAction(state, 'workshop_gather_wood', context(state)), false);
  assert.deepEqual(state, before);
  state.conversations.pending = null;
  assert.equal(workshopActions(state).find(action => action.id === 'workshop_gather_wood').disabledReason, undefined);
});

test('additive workshop initialization grants no gear, materials, skills, structures or invented history', () => {
  const state = life();
  assert.deepEqual(state.equipment.materials, { ore: 0, cloth: 0, wood: 0, stone: 0, hide: 0, crystal: 0 });
  state.equipment.materials.ore = 7;
  state.equipment.owned = ['iron_sword']; state.equipment.equipped.weapon = 'iron_sword';
  delete state.equipment.materials.crystal;
  const hero = structuredClone(state.hero), workshop = structuredClone(state.workshop);
  initializeWorkshop(state, { migration: true });
  assert.deepEqual(state.hero, hero);
  assert.deepEqual(state.workshop, workshop);
  assert.equal(state.equipment.materials.ore, 7);
  assert.equal(state.equipment.materials.crystal, 0);
  assert.deepEqual(state.equipment.owned, ['iron_sword']);
  assert.equal(state.equipment.equipped.weapon, 'iron_sword');
});

test('real gathering, building and crafting consume displayed resources and equipment changes only derived bonuses', () => {
  const state = life();
  perform(state, 'workshop_gather_wood'); perform(state, 'workshop_gather_wood');
  perform(state, 'workshop_gather_stone'); perform(state, 'workshop_gather_cloth');
  const build = workshopActions(state).find(entry => entry.id === 'workshop_build_shelter');
  assert.deepEqual(build.materials, { wood: 4, stone: 2, cloth: 2 });
  const before = state.day;
  perform(state, build.id);
  assert.equal(state.day, before + 3);
  assert.equal(state.hero.gold, 94);
  assert.equal(state.family.housing, 'shelter');
  assert.deepEqual(state.equipment.materials, { ore: 0, cloth: 0, wood: 0, stone: 0, hide: 0, crystal: 0 });
  assert.equal(state.workshop.structures[0].locationId, 'home');
  assert.equal(state.world.changes.at(-1).locationId, 'home');
  state.locationId = 'forest';
  perform(state, 'workshop_gather_wood'); perform(state, 'workshop_gather_ore'); perform(state, 'workshop_gather_hide');
  state.locationId = 'home';
  const hero = structuredClone(state.hero);
  const finished = perform(state, 'workshop_craft_woodland_spear');
  assert.equal(finished.completedActionId, 'workshop_craft_woodland_spear');
  assert.deepEqual(state.equipment.materials, { ore: 0, cloth: 0, wood: 1, stone: 0, hide: 1, crystal: 0 });
  assert.equal(state.hero.gold, 82);
  assert.equal(state.equipment.equipped.weapon, null);
  equipItem(state, 'woodland_spear'); equipItem(state, 'woodland_spear');
  assert.deepEqual(gearBonuses(state), { attack: 5, armor: 0, magic: 0, agility: 0 });
  assert.deepEqual(state.hero.attributes, hero.attributes);
  assert.deepEqual(state.hero.skills, hero.skills);
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_craft_woodland_spear').disabledReason, /already own/);
});

test('interrupted craft commits fees and supplies once and save roundtrip resumes only remaining work', () => {
  const state = life(); supplies(state, { wood: 3, ore: 2, hide: 1 });
  const ctx = perform(state, 'workshop_craft_woodland_spear', 1);
  assert.equal(ctx.completedActionId, undefined);
  assert.equal(state.equipment.owned.includes('woodland_spear'), false);
  assert.equal(state.workshop.project.remainingDays, 2);
  assert.equal(state.workshop.project.cost, 10);
  assert.deepEqual(state.workshop.project.materials, { wood: 3, ore: 2, hide: 1 });
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restored.workshop.project, state.workshop.project);
  const completed = perform(restored, 'workshop_continue');
  assert.equal(completed.completedActionId, 'workshop_craft_woodland_spear');
  assert.equal(restored.hero.gold, 90);
  assert.equal(restored.day, state.day + 2);
  assert.deepEqual(restored.equipment.owned, ['woodland_spear']);
  assert.equal(restored.workshop.crafting, 1);
  assert.equal(restored.workshop.project, null);
  assert.equal(applyWorkshopAction(restored, 'workshop_continue', context(restored)), false);
});

test('an interrupted build cannot produce housing, markers or building benefits early', () => {
  const state = life(); supplies(state, { wood: 4, stone: 2, cloth: 2 });
  perform(state, 'workshop_build_shelter', 0);
  assert.equal(state.day, 12);
  assert.equal(state.workshop.project.remainingDays, 3);
  assert.deepEqual(state.workshop.structures, []);
  assert.equal(state.family.housing, 'unsheltered');
  assert.equal(buildingBenefits(state).shelter, false);
  assert.equal(state.world.changes.length, 0);
  perform(state, 'workshop_continue', 1);
  assert.deepEqual(state.workshop.structures, []);
  perform(state, 'workshop_continue');
  assert.equal(buildingBenefits(state).shelter, true);
  assert.equal(state.family.housing, 'shelter');
  assert.equal(state.world.changes.length, 1);
  assert.equal(state.hero.gold, 94);
});

test('abandoning a project honestly consumes committed costs without output or XP', () => {
  const state = life(); supplies(state, { wood: 3, ore: 2, hide: 1 });
  perform(state, 'workshop_craft_woodland_spear', 1);
  const cancel = workshopActions(state).find(entry => entry.id === 'workshop_cancel');
  assert.match(cancel.description, /Lose the 10 gold/);
  const before = state.day;
  perform(state, 'workshop_cancel');
  assert.equal(state.day, before);
  assert.equal(state.hero.gold, 90);
  assert.equal(state.workshop.project, null);
  assert.deepEqual(state.equipment.owned, []);
  assert.equal(state.equipment.materials.wood, 0);
  assert.equal(state.xp, undefined);
});

test('interrupted gathering reserves stock but awards materials only after completion', () => {
  const state = life(); state.locationId = 'forest';
  perform(state, 'workshop_gather_wood', 1);
  assert.equal(state.equipment.materials.wood, 0);
  assert.equal(state.workshop.project.output.wood, 4);
  const reserved = state.workshop.sites.forest.wood.stock;
  perform(state, 'workshop_continue');
  assert.equal(state.equipment.materials.wood, 4);
  assert.equal(state.workshop.sites.forest.wood.stock, reserved);
  assert.equal(state.workshop.project, null);
});

test('seeded deposits deplete, advertise recovery time, and regenerate across actual days and years', () => {
  const state = life(); state.locationId = 'forest';
  let completed = 0;
  while (!workshopActions(state).find(entry => entry.id === 'workshop_gather_wood').disabledReason) {
    perform(state, 'workshop_gather_wood'); completed++;
    assert.ok(completed < 6, 'finite initial deposit must run out');
  }
  const exhausted = workshopActions(state).find(entry => entry.id === 'workshop_gather_wood');
  assert.match(exhausted.disabledReason, /returns in \d+ days/);
  const original = structuredClone(state);
  assert.equal(applyWorkshopAction(state, exhausted.id, context(state)), true);
  assert.deepEqual(state.equipment, original.equipment);
  assert.deepEqual(state.workshop.sites, original.workshop.sites);
  assert.equal(state.day, original.day);
  state.day += 365;
  refreshWorkshop(state, context(state));
  assert.equal(workshopActions(state).find(entry => entry.id === exhausted.id).disabledReason, undefined);
  perform(state, exhausted.id);
  assert.equal(state.equipment.materials.wood, (completed + 1) * 4);
  const other = life(); other.locationId = 'forest';
  const a = workshopActions(other).find(entry => entry.id === exhausted.id).description;
  const same = life(); same.locationId = 'forest';
  assert.equal(workshopActions(same).find(entry => entry.id === exhausted.id).description, a);
  assert.ok(new Set(Array.from({ length: 8 }, (_, n) => { const sample = life(`vein-${n}`); sample.locationId = 'forest'; return workshopActions(sample).find(entry => entry.id === exhausted.id).description; })).size > 1);
});

test('recipe requirements explain materials, gold, skill, workbench and time before any fee', () => {
  const state = life();
  const recipe = workshopActions(state).find(entry => entry.id === 'workshop_craft_steel_sword');
  assert.equal(recipe.days, 4); assert.equal(recipe.cost, 18);
  assert.deepEqual(recipe.materials, { ore: 6, wood: 2, hide: 1 });
  assert.match(recipe.description, /crafting 2, tier 2/);
  assert.match(recipe.disabledReason, /crafting 2/);
  state.workshop.crafting = 2;
  assert.match(workshopActions(state).find(entry => entry.id === recipe.id).disabledReason, /tier 2/);
  state.locationId = 'city';
  assert.match(workshopActions(state).find(entry => entry.id === recipe.id).disabledReason, /6 ore/);
  supplies(state, { ore: 6, wood: 2, hide: 1 }); state.hero.gold = 17;
  assert.match(workshopActions(state).find(entry => entry.id === recipe.id).disabledReason, /18 gold/);
  const equipment = structuredClone(state.equipment);
  assert.equal(applyWorkshopAction(state, recipe.id, context(state, 0)), true); // Engine owns the fee; supply checks still pass.
  assert.deepEqual(state.equipment.materials, { ...equipment.materials, ore: 0, wood: 0, hide: 0 });
});

test('invalid or unavailable work never consumes materials or creates a project', () => {
  const state = life(); const equipment = structuredClone(state.equipment);
  assert.equal(applyWorkshopAction(state, 'workshop_craft_steel_sword', context(state)), true);
  assert.match(state.notice, /crafting 2/);
  assert.equal(applyWorkshopAction(state, 'workshop_craft_missing', context(state)), false);
  assert.equal(applyWorkshopAction(state, 'workshop_build_missing', context(state)), false);
  assert.equal(applyWorkshopAction(state, null, context(state)), false);
  assert.equal(applyWorkshopAction(state, 'gear_craft_iron_sword', context(state)), false);
  assert.equal(state.workshop.project, null);
  assert.deepEqual(state.equipment, equipment);
  state.event = { id: 'pending' };
  assert.deepEqual(workshopActions(state), []);
  assert.equal(applyWorkshopAction(state, 'workshop_gather_wood', context(state)), false);
});

test('crafted gear has real distinct role bonuses and advanced pieces need a master forge', () => {
  const added = GEAR_CATALOG.filter(item => item.workshopTier);
  assert.ok(added.length >= 12);
  assert.ok(added.some(item => item.bonuses.attack > 0));
  assert.ok(added.some(item => item.bonuses.magic > 0));
  assert.ok(added.some(item => item.bonuses.armor > 0));
  assert.ok(added.some(item => item.bonuses.agility > 0));
  const state = life(); state.workshop.crafting = 4;
  supplies(state, { ore: 40, wood: 10, stone: 20, crystal: 10 });
  perform(state, 'workshop_build_forge');
  assert.equal(workshopTier(state), 2);
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_craft_sunsteel_blade').disabledReason, /tier 3/);
  state.hero.gold = 100;
  perform(state, 'workshop_upgrade_forge');
  assert.equal(workshopTier(state), 3);
  perform(state, 'workshop_craft_sunsteel_blade');
  equipItem(state, 'sunsteel_blade');
  assert.deepEqual(gearBonuses(state), { attack: 7, armor: 0, magic: 1, agility: 0 });
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_upgrade_forge').disabledReason, /already/);
});

test('public smiths support intermediate crafting and your forge works at a chosen wilderness site', () => {
  const state = life(); state.locationId = 'city';
  assert.equal(workshopTier(state), 2);
  state.locationId = 'forest';
  assert.equal(workshopTier(state), 0);
  state.workshop.crafting = 1; supplies(state, { ore: 6, stone: 6, wood: 4 });
  perform(state, 'workshop_build_forge');
  assert.equal(state.workshop.structures[0].locationId, 'forest');
  assert.equal(workshopTier(state), 2);
  state.locationId = 'home';
  assert.equal(workshopTier(state), 1);
});

test('cottage and shelter create actual household housing and bounded recovery without stat grants', () => {
  const state = life(); supplies(state, { wood: 14, stone: 10, cloth: 6 });
  const hero = structuredClone(state.hero);
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_build_cottage').disabledReason, /shelter/);
  perform(state, 'workshop_build_shelter'); perform(state, 'workshop_build_cottage');
  assert.equal(state.life.home.tier, 'cottage');
  assert.equal(state.life.home.source, 'construction'); assert.equal(state.life.home.locationId, 'home');
  assert.equal(state.family.housing, 'secure'); assert.equal(state.family.support, 25);
  perform(state, 'workshop_rest');
  assert.equal(state.hero.hp, 54); assert.equal(state.hero.mp, 22); assert.equal(state.life.stress, 25);
  perform(state, 'workshop_rest');
  assert.equal(state.hero.hp, 60); assert.equal(state.hero.mp, 30);
  assert.deepEqual(state.hero.attributes, hero.attributes);
  assert.deepEqual(state.hero.skills, hero.skills);
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_build_cottage').disabledReason, /already/);
});

test('garden harvest and study lessons require growth time and cooldowns survive history pruning', () => {
  const state = life(); state.workshop.crafting = 1;
  supplies(state, { wood: 14, stone: 4, cloth: 5, crystal: 1 });
  perform(state, 'workshop_build_shelter'); perform(state, 'workshop_build_garden'); perform(state, 'workshop_build_study');
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_harvest').disabledReason, /ready in/);
  const skill = state.hero.skills.scholarship;
  perform(state, 'workshop_read');
  assert.equal(state.hero.skills.scholarship, skill + 1);
  assert.match(workshopActions(state).find(entry => entry.id === 'workshop_read').disabledReason, /lesson is available/);
  state.workshop.history = [];
  assert.ok(workshopActions(state).find(entry => entry.id === 'workshop_read').disabledReason);
  state.day += 30;
  perform(state, 'workshop_harvest');
  assert.equal(state.flags.herbs, 3);
  state.workshop.history = [];
  assert.ok(workshopActions(state).find(entry => entry.id === 'workshop_harvest').disabledReason);
  assert.equal(validateWorkshop(state.workshop, state), true);
});

test('moon refuge creates reliable preparation and bounded control only after the work finishes', () => {
  const state = life(); state.workshop.crafting = 1; supplies(state, { wood: 8, stone: 6, ore: 2, hide: 2 });
  state.hero.condition = { type: 'lycanthrope', control: 35, preparedUntil: 0, lastFullMoon: 0 };
  perform(state, 'workshop_build_refuge');
  perform(state, 'workshop_prepare_refuge', 1);
  assert.equal(state.hero.condition.control, 35); assert.equal(state.hero.condition.preparedUntil, 0);
  perform(state, 'workshop_continue');
  assert.equal(state.hero.condition.control, 40);
  assert.ok(state.hero.condition.preparedUntil >= state.day);
  assert.ok(workshopActions(state).find(entry => entry.id === 'workshop_prepare_refuge').disabledReason);
});

test('a permanent modern refuge earns stronger practice while an old committed lesson keeps its promised result', () => {
  const state = life(); state.revision = 5; state.workshop.crafting = 1;
  supplies(state,{wood:8,stone:6,ore:2,hide:2});
  state.hero.condition = {type:'lycanthrope',control:35,preparedUntil:0,lastFullMoon:0};
  perform(state,'workshop_build_refuge');
  assert.match(workshopActions(state).find(action=>action.id==='workshop_prepare_refuge').description,/gain 12 control/);
  perform(state,'workshop_prepare_refuge',1);
  assert.equal(state.workshop.project.controlGain,12); assert.equal(state.hero.condition.control,35);
  const oldCommitted = structuredClone(state);
  delete oldCommitted.workshop.project.controlGain;
  perform(state,'workshop_continue'); assert.equal(state.hero.condition.control,47);
  perform(oldCommitted,'workshop_continue'); assert.equal(oldCommitted.hero.condition.control,40,'loading an already promised five-control lesson cannot alter its result');
  assert.equal(oldCommitted.hero.condition.preparedUntil,state.hero.condition.preparedUntil);
  assert.ok(workshopActions(state).find(action=>action.id==='workshop_prepare_refuge').disabledReason,'the stronger lesson still requires a lived lunar cooldown');
});

test('world destruction removes benefits and pending outputs, while evacuation permits later repair', () => {
  const state = life(); supplies(state, { wood: 8, stone: 4, cloth: 4 });
  perform(state, 'workshop_build_shelter');
  const place = state.world.locations.find(entry => entry.id === 'home');
  place.status = 'evacuated'; refreshWorkshop(state, context(state));
  assert.equal(state.workshop.structures[0].condition, 'damaged');
  assert.equal(buildingBenefits(state).recoveryHp, 0);
  assert.deepEqual(workshopActions(state), []);
  place.status = 'thriving'; perform(state, 'workshop_repair_shelter');
  assert.equal(buildingBenefits(state).shelter, true);
  supplies(state, { wood: 3, ore: 2, hide: 1 });
  perform(state, 'workshop_craft_woodland_spear', 1);
  place.status = 'destroyed'; refreshWorkshop(state, context(state));
  assert.equal(state.workshop.structures[0].condition, 'lost');
  assert.ok(workshopActions(state).find(entry => entry.id === 'workshop_continue').disabledReason);
  assert.ok(workshopActions(state).find(entry => entry.id === 'workshop_cancel'));
  perform(state, 'workshop_cancel');
  assert.deepEqual(state.equipment.owned, []);
  assert.equal(state.workshop.project, null);
});

test('losing an owned constructed cottage changes actual housing but preserves purchased and stronger homes', () => {
  for (const existing of ['lodgings', 'townhouse']) {
    const state = life();
    supplies(state, { wood: 14, stone: 10, cloth: 6 });
    perform(state, 'workshop_build_shelter'); perform(state, 'workshop_build_cottage');
    // A retained built cottage can predate the household's later townhouse.
    if (existing === 'townhouse') state.life.home = { tier: 'townhouse' };
    state.world.locations.find(entry => entry.id === 'home').status = 'destroyed';
    refreshWorkshop(state, context(state));
    assert.equal(state.life.home.tier, existing === 'lodgings' ? 'lodgings' : 'townhouse');
    assert.equal(state.family.housing, existing === 'lodgings' ? 'unsheltered' : 'secure');
    assert.equal(buildingBenefits(state).cottage, false);
  }
  const relocated = life();
  supplies(relocated, { wood: 14, stone: 10, cloth: 6 });
  perform(relocated, 'workshop_build_shelter'); perform(relocated, 'workshop_build_cottage');
  relocated.family.members = [{ personId: 'kin', availability: 'present' }];
  relocated.life.people = [{ id: 'kin', familyRole: 'guardian', alive: true, locationId: 'camp' }];
  relocated.world.locations.find(entry => entry.id === 'home').status = 'destroyed';
  refreshWorkshop(relocated, context(relocated));
  assert.equal(relocated.life.home.tier, 'lodgings');
  assert.equal(relocated.family.housing, 'shelter');
  const purchased = life();
  supplies(purchased, { wood: 14, stone: 10, cloth: 6 });
  perform(purchased, 'workshop_build_shelter'); perform(purchased, 'workshop_build_cottage');
  Object.assign(purchased.life.home, { tier: 'cottage', source: 'purchase', locationId: 'city' });
  purchased.world.locations.find(entry => entry.id === 'home').status = 'destroyed';
  refreshWorkshop(purchased, context(purchased));
  assert.equal(purchased.life.home.tier, 'cottage');
  assert.equal(purchased.life.home.source, 'purchase');
});

test('workshop action and view queries are pure and expose actual eligible descriptors', () => {
  const state = life(), before = structuredClone(state);
  const actions = workshopActions(state), view = workshopView(state);
  assert.deepEqual(state, before);
  assert.equal(view.materials.length, 6);
  assert.equal(view.recipes.length, 32);
  assert.equal(view.buildings.length, 6);
  for (const recipe of view.recipes) {
    const offered = actions.find(entry => entry.id === recipe.actionId);
    const item = GEAR_CATALOG.find(entry => entry.id === recipe.itemId);
    assert.equal(recipe.description, item.description);
    assert.equal(recipe.requiredCrafting, item.craftSkill);
    assert.equal(recipe.tier, item.workshopTier);
    assert.equal(recipe.days, offered.days); assert.equal(recipe.cost, offered.cost);
    assert.equal(recipe.disabledReason, offered.disabledReason);
    assert.deepEqual(recipe.materials, offered.materials);
  }
  assert.equal(view.buildings.find(entry => entry.id === 'forge').requiredCrafting, 1);
  assert.ok(view.buildings.every(entry => !entry.description.includes('Output:')));
  view.materials[0].amount = 90; view.recipes[0].materials.cloth = 90;
  assert.deepEqual(state, before);
  state.age = 15; state.timeline.mode = 'birth'; state.phase = 'childhood';
  assert.deepEqual(workshopActions(state), []);
  assert.ok(workshopView(state).recipes.every(entry => entry.disabledReason === 'Gathering, crafting, and construction open at age 16.'));
  assert.ok(workshopView(state).buildings.every(entry => entry.disabledReason === 'Gathering, crafting, and construction open at age 16.'));
});

test('old recipes and old stock accounting remain available without a workshop tier project', () => {
  const state = life(); supplies(state, { ore: 3 });
  const before = state.day, gold = state.hero.gold;
  assert.equal(applyGearAction(state, 'gear_craft_iron_sword', context(state)), true);
  assert.equal(state.day, before); assert.equal(state.hero.gold, gold);
  assert.deepEqual(state.equipment.owned, ['iron_sword']); assert.equal(state.equipment.materials.ore, 0);
  assert.equal(state.workshop.project, null);
  assert.equal(applyGearAction(state, 'gear_craft_woodland_spear', context(state)), true);
  assert.equal(state.equipment.owned.includes('woodland_spear'), false);
});

test('save validators reject invalid material, building, deposit, cooldown and project data', () => {
  const state = life(); supplies(state, { wood: 4, stone: 2, cloth: 2 });
  perform(state, 'workshop_build_shelter', 1);
  const valid = structuredClone(state.workshop);
  assert.equal(validateWorkshop(valid, state), true);
  for (const mutate of [
    value => { value.crafting = -1; }, value => { value.crafting = Infinity; },
    value => { value.project.remainingDays = 0; }, value => { value.project.remainingDays = 4; },
    value => { value.project.totalDays = 1.5; }, value => { value.project.materials.wood = -1; },
    value => { value.project.materials.souls = 2; }, value => { value.project.output.wood = Infinity; },
    value => { value.project.locationId = 'unknown'; }, value => { value.project.targetId = 'unknown'; },
    value => { value.project.startedDay = state.day + 1; }, value => { value.project.kind = 'summon'; },
    value => { value.project.cost = 0; }, value => { value.project.materials.wood = 0; },
    value => { value.project.id = 'workshop_craft_sunsteel_blade'; },
    value => { value.sites.home = { wood: { stock: 999, updatedDay: 0 } }; },
    value => { value.sites.home = { crystal: { stock: 2, updatedDay: 0 } }; },
    value => { value.sites.home = { activities: { garden: state.day + 1 } }; },
    value => { value.structures.push({ id: 'x', type: 'palace', locationId: 'home', level: 1, completedDay: 0, condition: 'sound' }); },
  ]) { const copy = structuredClone(valid); mutate(copy); assert.equal(validateWorkshop(copy, state), false); }
  assert.equal(validateWorkshop(null, state), false);
  const gear = structuredClone(state.equipment);
  for (const material of ['wood', 'stone', 'hide', 'crystal']) { const copy = structuredClone(gear); copy.materials[material] = -1; assert.equal(validateGear(copy), false); }
});
