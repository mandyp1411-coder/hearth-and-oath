import { relicPanel } from './depth-ui-v27.js';
import { GEAR_CATALOG, gearBonuses } from './gear.js';
import { getActions, equipmentActionReason } from './engine.js';
import { merchantPanel } from './rpg-ui.js';

const panes = [['equipment', 'Equipment'], ['merchant', 'Merchant'], ['craft', 'Craft & sell'],['relics','Relics & claims']];

// Panel selection is a view preference. All preparation and trade commands still
// pass through the existing engine eligibility, prices, stock and rewards.
export function renderPackWorkspace(state, ui, { pane = 'equipment' } = {}) {
  const { e, title, button, actionCards } = ui;
  const active = panes.some(([id]) => id === pane) ? pane : 'equipment';
  const equipment = state.equipment || { owned: [], equipped: {}, materials: {} };
  const owned = GEAR_CATALOG.filter(item => equipment.owned.includes(item.id));
  const actions = getActions(state);
  const reason = equipmentActionReason(state);
  const bonusList = values => Object.entries(values).filter(([, value]) => value).map(([key, value]) => `<span>${e(title(key))} <strong>${value > 0 ? '+' : ''}${e(value)}</strong></span>`).join('');
  const resources = `<div class="pack-resources" aria-label="Your carried resources"><span>Gold <strong>${e(state.hero.gold)}</strong></span><span>Draughts <strong>${e(state.hero.potions || 0)}</strong></span><span>Rations <strong>${e(state.adventuring?.rations || 0)}</strong></span><span>Herbs <strong>${e(state.flags?.herbs || 0)}</strong></span><span>Spoils <strong>${e(state.adventuring?.loot?.length || 0)}</strong></span>${Object.entries(equipment.materials).map(([id, amount]) => `<span>${e(id === 'wood' ? 'Timber' : title(id))} <strong>${e(amount)}</strong></span>`).join('')}</div>`;
  const tabs = `<nav class="pack-tabs" aria-label="Pack sections">${panes.map(([id, label]) => `<button type="button" class="button ${active === id ? 'secondary active' : 'ghost'}" data-op="pack-pane" data-id="${id}" ${active === id ? 'aria-current="page"' : ''}>${e(label)}</button>`).join('')}</nav>`;
  const barrier = reason ? `<p class="disabled-reason" role="status">${e(reason)}</p>` : '';
  let content;
  if(active==='relics'){content=relicPanel(state,ui);}
  else if (active === 'merchant') {
    content = merchantPanel(state, actions.filter(a=>!a.id.startsWith('realm_sell')), ui);
  } else if (active === 'craft') {
    const craft = actions.filter(action => action.id.startsWith('gear_craft_'));
    const sell = actions.filter(action => action.id.startsWith('realm_sell'));
    content = `<section class="panel"><div class="section-heading"><h2>Craft &amp; sell</h2>${button('Workshop', 'tab', 'workshop', 'ghost small')}</div><p class="muted">Recipes use your own materials. Sales follow the local merchant and regional law.</p>${craft.length ? `<h3>Available recipes</h3>${actionCards(craft)}` : '<p class="muted">No recipe is offered here. Your workshop records the places and skills required.</p>'}${sell.length ? `<h3>Goods to sell</h3>${actionCards(sell)}` : '<p class="muted">No sale is offered in your present situation.</p>'}</section>`;
  } else {
    const bonuses = bonusList(gearBonuses(state));
    content = `<section class="panel"><div class="section-heading"><h2>Your equipment</h2><span class="badge">${e(owned.length)} pieces</span></div><div class="gear-bonuses" aria-label="Equipped bonuses">${bonuses || '<span>No equipment bonuses</span>'}</div><div class="gear-grid">${owned.map(item => {
      const equipped = equipment.equipped[item.slot] === item.id;
      return `<article class="gear-card ${equipped ? 'equipped' : ''}" data-item-id="${e(item.id)}"><div class="gear-slot">${e(title(item.slot))}${equipped ? '<span class="gear-equipped">Equipped</span>' : ''}</div><h3>${e(item.name)}</h3><div class="gear-bonuses">${bonusList(item.bonuses)}</div>${button(equipped ? 'Unequip' : 'Equip', 'equip', equipped ? `unequip_${item.slot}` : item.id, 'secondary', Boolean(reason))}<details class="gear-flavor"><summary>About this item</summary><p>${e(item.description)}</p></details></article>`;
    }).join('') || '<p class="muted">Your pack is empty. A settlement merchant or your workshop can provide tools for the life you choose.</p>'}</div>${button('Workshop', 'tab', 'workshop', 'ghost small')}</section>`;
  }
  return `<div class="pack-workspace" data-pack-pane="${active}">${tabs}${resources}${barrier}<div class="pack-body">${content}</div></div>`;
}
