import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR_CATALOG, initializeGear, gearBonuses, gearActions, applyGearAction, equipItem, validateGear } from '../dist/js/gear.js';
import { createBattle, takeBattleAction } from '../dist/js/combat.js';

function state(path = 'warrior') {
  return { revision: 2, phase: 'adult', day: 12, locationId: 'home', event: null, battle: null, hero: { path, gold: 100, attributes: { strength: 6 }, skills: { weapons: 2 } }, flags: { herbs: 3 } };
}

test('new-life starter belongings fit each path while migration grants no belongings', () => {
  for (const path of ['warrior', 'mage', 'rogue']) {
    const newLife = state(path);
    initializeGear(newLife, { starter: true });
    assert.equal(newLife.equipment.owned.length, 2);
    assert.equal(newLife.equipment.equipped.weapon, { warrior: 'starter_sword', mage: 'starter_staff', rogue: 'starter_dagger' }[path]);
    assert.equal(newLife.equipment.equipped.armor, 'travel_cloak');
    assert.equal(validateGear(newLife.equipment), true);
    const snapshot = structuredClone(newLife.equipment);
    initializeGear(newLife, { starter: true });
    assert.deepEqual(newLife.equipment, snapshot);
  }
  const migrated = state();
  initializeGear(migrated);
  assert.deepEqual(migrated.equipment.owned, []);
  assert.deepEqual(gearBonuses(migrated), { attack: 0, armor: 0, magic: 0, agility: 0 });
  assert.equal(migrated.flags.herbs, 3);
});

test('equipping, swapping and removing gear never changes or stacks base attributes', () => {
  const life = state();
  initializeGear(life);
  life.equipment.owned = ['iron_sword', 'hunter_dagger', 'chain_mail', 'scholar_charm'];
  const originalHero = structuredClone(life.hero);
  for (let i = 0; i < 5; i++) {
    assert.equal(equipItem(life, 'iron_sword'), true);
    assert.equal(equipItem(life, 'chain_mail'), true);
    assert.equal(equipItem(life, 'scholar_charm'), true);
  }
  assert.deepEqual(gearBonuses(life), { attack: 4, armor: 3, magic: 2, agility: -1 });
  equipItem(life, 'hunter_dagger');
  assert.deepEqual(gearBonuses(life), { attack: 2, armor: 3, magic: 2, agility: 1 });
  assert.equal(equipItem(life, 'unequip_armor'), true);
  assert.deepEqual(gearBonuses(life), { attack: 2, armor: 0, magic: 2, agility: 2 });
  assert.deepEqual(life.hero, originalHero);
  assert.equal(equipItem(life, 'missing'), false);
  assert.equal(equipItem(life, 'moonstone_pendant'), false);
  assert.equal(equipItem(life, 'unequip_potion'), false);
  assert.equal(equipItem(life, null), false);
});

test('recipe actions show real material and gold requirements and do not alter their source', () => {
  const life = state();
  initializeGear(life);
  life.hero.gold = 5;
  const before = structuredClone(life);
  const actions = gearActions(life);
  assert.deepEqual(life, before);
  const craft = actions.find((action) => action.id === 'gear_craft_iron_sword');
  assert.equal(craft.days, 2);
  assert.equal(craft.cost, 8);
  assert.match(craft.disabledReason, /3 ore/);
  life.equipment.materials.ore = 3;
  assert.match(gearActions(life).find((action) => action.id === craft.id).disabledReason, /8 gold/);
  life.hero.gold = 8;
  assert.equal(gearActions(life).find((action) => action.id === craft.id).disabledReason, undefined);
  assert.ok(actions.every((action) => Number.isInteger(action.days) && Number.isInteger(action.cost)));
});

test('crafting consumes materials once; the engine owns time and gold charges', () => {
  const life = state();
  initializeGear(life);
  life.equipment.materials = { ore: 4, cloth: 2 };
  const entries = [];
  const ctx = { journal: (...entry) => entries.push(entry), earnExperience: (amount) => entries.push(amount) };
  assert.equal(applyGearAction(life, 'gear_craft_iron_sword', ctx), true);
  assert.deepEqual(life.equipment.materials, { ore: 1, cloth: 2 });
  assert.deepEqual(life.equipment.owned, ['iron_sword']);
  assert.equal(life.day, 12);
  assert.equal(life.hero.gold, 100);
  assert.ok(entries.some((entry) => entry === 4));
  assert.equal(applyGearAction(life, 'gear_craft_iron_sword', ctx), true);
  assert.deepEqual(life.equipment.materials, { ore: 1, cloth: 2 });
  assert.deepEqual(life.equipment.owned, ['iron_sword']);
  assert.ok(!gearActions(life).some((action) => action.id.endsWith('_iron_sword')));
});

test('invalid recipes, unknown purchases and wrong locations do not consume materials', () => {
  const life = state();
  initializeGear(life);
  life.equipment.materials = { ore: 1, cloth: 0 };
  assert.equal(applyGearAction(life, 'gear_craft_iron_sword'), true);
  assert.deepEqual(life.equipment.materials, { ore: 1, cloth: 0 });
  assert.deepEqual(life.equipment.owned, []);
  assert.equal(applyGearAction(life, 'gear_craft_starter_staff'), true);
  assert.equal(applyGearAction(life, 'gear_buy_unknown'), false);
  assert.equal(applyGearAction(life, null), false);
  life.locationId = 'ruin';
  assert.equal(applyGearAction(life, 'gear_buy_ash_staff'), true);
  assert.deepEqual(life.equipment.owned, []);
});

test('material routes are reachable, cost honest time, and retain existing herb resources', () => {
  const life = state();
  initializeGear(life);
  assert.ok(gearActions(life).some((action) => action.id === 'gear_gather_cloth' && action.days === 1 && action.cost === 0));
  applyGearAction(life, 'gear_gather_cloth');
  assert.equal(life.equipment.materials.cloth, 2);
  life.locationId = 'forest';
  assert.ok(gearActions(life).some((action) => action.id === 'gear_gather_ore' && action.days === 2));
  assert.ok(!gearActions(life).some((action) => action.id.startsWith('gear_buy_')));
  applyGearAction(life, 'gear_gather_ore');
  assert.equal(life.equipment.materials.ore, 2);
  life.locationId = 'ruin';
  applyGearAction(life, 'gear_gather_ore');
  assert.equal(life.equipment.materials.ore, 5);
  assert.equal(life.flags.herbs, 3);
  life.battle = { outcome: null };
  assert.deepEqual(gearActions(life), []);
});

test('modern stock-aware lives cannot bypass finite gathering through legacy equipment controls', () => {
  const modern = state(); modern.revision = 5; modern.age = 18; initializeGear(modern);
  assert.ok(!gearActions(modern).some(action => action.id === 'gear_gather_cloth'));
  modern.locationId = 'forest';
  assert.ok(!gearActions(modern).some(action => action.id === 'gear_gather_ore'));
  const materials = structuredClone(modern.equipment.materials);
  applyGearAction(modern, 'gear_gather_ore'); applyGearAction(modern, 'gear_gather_cloth');
  assert.deepEqual(modern.equipment.materials, materials, 'direct legacy handlers cannot conjure unreserved modern stock');
  const legacy = state(); initializeGear(legacy); legacy.locationId = 'forest';
  assert.ok(gearActions(legacy).some(action => action.id === 'gear_gather_ore'));
  applyGearAction(legacy, 'gear_gather_ore'); assert.equal(legacy.equipment.materials.ore, 2, 'old revisions retain their established accounting');
});

test('buying grants ownership only; the player must equip the piece', () => {
  const life = state('mage');
  initializeGear(life, { starter: true });
  applyGearAction(life, 'gear_buy_ash_staff');
  assert.ok(life.equipment.owned.includes('ash_staff'));
  assert.equal(life.equipment.equipped.weapon, 'starter_staff');
  assert.equal(life.hero.gold, 100);
  equipItem(life, 'ash_staff');
  assert.equal(gearBonuses(life).magic, 4);
});

test('equipment validation rejects unknown, duplicate, unowned, wrong-slot and invalid material saves', () => {
  const life = state();
  initializeGear(life, { starter: true });
  assert.equal(validateGear(life.equipment), true);
  const changes = [
    (gear) => { gear.owned.push('mystery'); },
    (gear) => { gear.owned.push('starter_sword'); },
    (gear) => { gear.equipped.weapon = 'iron_sword'; },
    (gear) => { gear.equipped.weapon = 'travel_cloak'; },
    (gear) => { gear.materials.ore = -1; },
    (gear) => { gear.materials.cloth = 1.5; },
    (gear) => { gear.materials.ore = Infinity; },
    (gear) => { delete gear.equipped.trinket; },
  ];
  for (const change of changes) { const copy = structuredClone(life.equipment); change(copy); assert.equal(validateGear(copy), false); }
  assert.equal(validateGear(null), false);
});

test('expanded markets and mountain ore work while destroyed settlement services stop', () => {
  const life = state(); initializeGear(life);
  life.world = { locations: [{ id: 'citadel', type: 'citadel', status: 'thriving', services: ['market', 'smith'] }, { id: 'camp', type: 'camp', status: 'thriving', services: ['market'] }, { id: 'mountain', type: 'mountain', status: 'thriving', services: [] }] };
  life.locationId = 'citadel';
  assert.ok(gearActions(life).some((action) => action.id === 'gear_buy_iron_sword'));
  life.world.locations[0].status = 'destroyed';
  assert.deepEqual(gearActions(life), []);
  life.locationId = 'camp';
  assert.ok(gearActions(life).some((action) => action.id === 'gear_craft_iron_sword'));
  life.locationId = 'mountain';
  applyGearAction(life, 'gear_gather_ore');
  assert.equal(life.equipment.materials.ore, 3);
});

test('new gear affects actual attacks and protection while pending battle snapshots stay unchanged', () => {
  const life = state(); initializeGear(life);
  Object.assign(life.hero, { name: 'A maker', hp: 60, maxHp: 60, mp: 30, maxMp: 30, potions: 0, level: 1 });
  life.hero.attributes.agility = 12;
  life.hero.skills.defense = 0;
  const plain = createBattle(life, 'forest');
  life.equipment.owned = ['sunsteel_blade', 'steel_plate', 'focus_ring'];
  equipItem(life, 'sunsteel_blade'); equipItem(life, 'steel_plate'); equipItem(life, 'focus_ring');
  const armed = createBattle(life, 'forest');
  assert.deepEqual(armed.actors.find(actor => actor.id === 'hero').gear, { attack: 7, armor: 5, magic: 4, agility: -1 });
  const attackedPlain = takeBattleAction(plain, 'attack', 'enemy-1');
  const attackedArmed = takeBattleAction(armed, 'attack', 'enemy-1');
  assert.ok(attackedArmed.actors.find(actor => actor.id === 'enemy-1').hp < attackedPlain.actors.find(actor => actor.id === 'enemy-1').hp);
  assert.ok(attackedArmed.actors.find(actor => actor.id === 'hero').hp > attackedPlain.actors.find(actor => actor.id === 'hero').hp);
  const pending = structuredClone(armed);
  equipItem(life, 'unequip_weapon'); equipItem(life, 'unequip_armor'); equipItem(life, 'unequip_trinket');
  assert.deepEqual(armed, pending);
  assert.deepEqual(createBattle(life, 'forest').actors.find(actor => actor.id === 'hero').gear, { attack: 0, armor: 0, magic: 0, agility: 0 });
});

test('new catalog pieces keep old recipes intact and require project crafting rather than legacy shortcuts', () => {
  const life = state(); initializeGear(life);
  assert.deepEqual(GEAR_CATALOG.find(item => item.id === 'iron_sword').recipe, { ore: 3, cloth: 0, gold: 8 });
  assert.deepEqual(GEAR_CATALOG.find(item => item.id === 'chain_mail').bonuses, { attack: 0, armor: 3, magic: 0, agility: -1 });
  assert.equal(GEAR_CATALOG.filter(item => item.workshopTier).length, 32);
  assert.ok(gearActions(life).some(action => action.id === 'gear_buy_crystal_staff'));
  assert.ok(!gearActions(life).some(action => action.id === 'gear_craft_crystal_staff'));
  assert.equal(applyGearAction(life, 'gear_craft_crystal_staff'), true);
  assert.deepEqual(life.equipment.owned, []);
  assert.match(life.notice, /Workshop recipe/);
  const legacy = { owned: [], equipped: { weapon: null, armor: null, trinket: null }, materials: { ore: 4, cloth: 3 } };
  assert.equal(validateGear(legacy), true);
});
