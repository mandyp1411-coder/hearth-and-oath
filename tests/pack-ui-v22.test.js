import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeAtAge } from '../dist/js/new-life.js';
import * as E from '../dist/js/engine.js';
import { createBattle } from '../dist/js/combat.js';
import { renderPackWorkspace } from '../dist/js/pack-ui-v22.js';
import { merchantPanel } from '../dist/js/rpg-ui.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { syncCartography } from '../dist/js/cartography.js';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = {
  e,
  title: value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  button: (label, op, id = '', cls = 'secondary', disabled = false) => `<button type="button" class="button ${e(cls)}" data-op="${e(op)}" data-id="${e(id)}" ${disabled ? 'disabled' : ''}>${label}</button>`,
  actionCards: rows => rows.map(a => `<button type="button" data-op="activity" data-id="${e(a.id)}" ${a.disabledReason ? 'disabled' : ''}>${e(a.label)}<span>${e(a.description)}</span><small>${e(a.disabledReason || '')}</small><span>${e(a.days)}d ${e(a.cost)}g</span></button>`).join(''),
};
function settle(state) {
  for (let i = 0; i < 120; i++) {
    if (!state.event) return state;
    const choice = state.event.choices.find(c => ['later', 'continue', 'leave', 'keep', 'support', 'pause'].includes(c.id) && !c.disabledReason) || state.event.choices.find(c => !c.disabledReason);
    assert.ok(choice, 'A fixture decision can be answered');
    state = E.chooseEventOption(state, choice.id);
  }
  throw Error('Fixture decisions did not settle');
}
const base = settle(await createLifeAtAge({ seed: 'pack-ui-v22-fixture', originId: 'roadborn', startAge: 18 }));
const fresh = () => {
  const state = structuredClone(base);
  state.hero.gold = 10000;
  // This is an isolated unit fixture, not a counted life or a free travel path.
  // Use an actual surviving market and keep its real seeded stock and prices.
  const market = state.world.locations.find(place => !['destroyed', 'evacuated'].includes(place.status) && place.servicesAvailable !== false && (['city', 'village'].includes(place.type) || place.services?.includes('market') || place.services?.includes('smith')) && state.realm.sites[place.id]?.merchant && Object.values(state.realm.sites[place.id].merchant.stock).some(amount => amount > 0));
  assert.ok(market, 'The fixture world contains an actual stocked market');
  state.locationId = market.id;
  state.cartography.interior=null;state.cartography.offsite=false;syncCartography(state);
  let positioned=E.migrateSave(state);assert.ok(positioned);
  for(const room of settlementWalkPath(positioned,'market'))positioned=E.chooseAction(positioned,'atlas_room_'+room);
  return positioned;
};
const render = (state, pane) => renderPackWorkspace(state, ui, pane ? { pane } : undefined);
function offeredIds(html) {
  return [...html.matchAll(/data-op="activity" data-id="([^"]+)"/g)].map(match => match[1]);
}
function buy(state) {
  const offer = E.getActions(state).find(a => a.id.startsWith('gear_buy_') && !a.disabledReason);
  assert.ok(offer, 'A real merchant offers an affordable piece');
  const itemId = offer.id.slice('gear_buy_'.length);
  const next = E.chooseAction(state, offer.id);
  assert.ok(next.equipment.owned.includes(itemId));
  assert.ok(E.validateSave(next));
  return { state: next, itemId, offer };
}

test('Equipment opens before merchant stock and pane selection is a pure read', () => {
  const state = fresh(), before = structuredClone(state);
  const html = render(state);
  assert.match(html, /data-pack-pane="equipment"/);
  assert.match(html, /Your equipment/);
  assert.doesNotMatch(html, /THE LOCAL SHOP|data-op="activity" data-id="gear_buy_/);
  for (const pane of ['equipment', 'merchant', 'craft', '<script>bad pane</script>']) render(state, pane);
  assert.deepEqual(state, before, 'Opening every panel leaves calendar, stock, NPCs and resources untouched');
  assert.match(render(state, 'unknown'), /data-pack-pane="equipment"/);
});

test('A real purchase moves stock into the owned list while an equipped item retains its real command', () => {
  const original = fresh(), { state: bought, itemId, offer } = buy(original);
  const originalStock = original.realm.sites[original.locationId].merchant.stock[itemId];
  assert.equal(bought.hero.gold, original.hero.gold - offer.cost);
  assert.equal(bought.realm.sites[bought.locationId].merchant.stock[itemId], originalStock - 1);
  assert.match(render(bought), new RegExp(`data-item-id="${itemId}"`));
  assert.ok(!offeredIds(render(bought, 'merchant')).includes(offer.id), 'An owned unique piece is no longer offered for purchase');
  const ready = E.equipGear(bought, itemId), slot = Object.keys(ready.equipment.equipped).find(key => ready.equipment.equipped[key] === itemId);
  assert.ok(slot);
  assert.match(render(ready), new RegExp(`data-op="equip" data-id="unequip_${slot}"`));
  assert.match(render(ready), /gear-equipped">Equipped/);
  assert.deepEqual(ready.hero.attributes, bought.hero.attributes, 'Equipping does not rewrite base attributes');
});

test('Merchant and Craft expose the same real offered trade IDs and actual prices', () => {
  const state = buy(fresh()).state;
  const actions = E.getActions(state);
  const expected = actions.filter(a => /^(gear_buy_|gear_craft_|realm_sell|realm_potion|realm_ration)/.test(a.id)).map(a => a.id).sort();
  const actual = [...offeredIds(render(state, 'merchant')), ...offeredIds(render(state, 'craft'))].sort();
  assert.deepEqual(actual, expected, 'No offered trade command is silently lost when the pack is split into panes');
  assert.ok(render(state, 'merchant').includes(merchantPanel(state, actions.filter(a=>!a.id.startsWith('realm_sell')), ui)), 'Merchant rendering is shared rather than reimplementing stock or price logic');
  const sold = actions.find(a => a.id.startsWith('realm_sellgear_') && !a.disabledReason);
  assert.ok(sold, 'The unequipped owned piece has a genuine sale offer');
  assert.ok(render(state, 'craft').includes(e(sold.description)), 'The engine sale quote remains visible');
});

test('Preparation barriers prevent equipment changes during a real frozen battle', () => {
  const { state, itemId } = buy(fresh());
  state.battle = createBattle(state, 'free_bandit', { kind: 'adventure', mode: 'roam', token: 'pack-fixture', locationId: state.locationId });
  const before = structuredClone(state), html = render(state);
  assert.ok(E.equipmentActionReason(state));
  assert.ok(html.includes(e(E.equipmentActionReason(state))));
  assert.match(html, new RegExp(`data-op="equip" data-id="${itemId}" disabled`));
  assert.deepEqual(state, before, 'Inspecting equipment leaves the frozen battle and source state intact');
  const blocked = E.equipGear(state, itemId);
  assert.deepEqual(blocked.equipment, state.equipment);
  assert.deepEqual(blocked.battle, state.battle);
});

test('Equipped pieces cannot be sold and the pane shows the engine eligibility explanation', () => {
  const purchase = buy(fresh()), state = E.equipGear(purchase.state, purchase.itemId);
  const offer = E.getActions(state).find(a => a.id === `realm_sellgear_${purchase.itemId}`);
  assert.ok(offer?.disabledReason);
  const html = render(state, 'craft');
  assert.match(html, new RegExp(`data-op="activity" data-id="${offer.id}" disabled`));
  assert.ok(html.includes(e(offer.disabledReason)));
  const attempted = E.chooseAction(state, offer.id);
  assert.equal(attempted.hero.gold, state.hero.gold);
  assert.deepEqual(attempted.equipment, state.equipment);
});

test('The compact resource strip reports actual supplies and escapes names from source data', () => {
  const state = fresh();
  state.hero.potions = 7; state.adventuring.rations = 5; state.flags.herbs = 3; state.equipment.materials.wood = 11;
  state.equipment.materials['<img src=x onerror=bad>'] = 2;
  state.realm.sites[state.locationId].merchant.name = '<script>shop</script>';
  const before = structuredClone(state), equipment = render(state), merchant = render(state, 'merchant');
  assert.match(equipment, /Draughts <strong>7<\/strong>/);
  assert.match(equipment, /Rations <strong>5<\/strong>/);
  assert.match(equipment, /Herbs <strong>3<\/strong>/);
  assert.match(equipment, /Timber <strong>11<\/strong>/);
  assert.doesNotMatch(equipment, /<img src=x/);
  assert.doesNotMatch(merchant, /<script>shop/);
  assert.ok(merchant.includes('&lt;script&gt;shop&lt;/script&gt;'));
  assert.deepEqual(state, before);
});

test('Young characters retain an empty owned pack and age eligibility without receiving tools', () => {
  const child = E.createBirthGame({ seed: 'pack-ui-v22-newborn' }), before = structuredClone(child);
  const html = render(child);
  assert.match(html, /Your pack is empty/);
  assert.match(html, /available at age 16/);
  assert.doesNotMatch(html, /data-item-id=/);
  for (const pane of ['merchant', 'craft']) render(child, pane);
  assert.deepEqual(child, before, 'Viewing inventory at birth grants no equipment, supplies or aging');
});
