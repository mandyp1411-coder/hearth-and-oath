// Native named buttons are both the selection and the action: no hover-only
// affordance, hidden default target, or unsaved target-selection state.
export function renderFieldPotionTreatment(quote, { e = String, button }, { hero = false } = {}) {
  const health = quote.hp === null || quote.maxHp === null ? 'Health not recorded' : `Health ${quote.hp}/${quote.maxHp}`;
  const effect = quote.disabledReason ? 'No potion used' : `+${quote.amount} Health → ${quote.hpAfter}/${quote.maxHp} · 1 potion · No time`;
  const label = hero ? 'Drink Potion' : `Treat ${quote.targetName} · +${quote.amount} Health · 1 potion`;
  return `<div class="field-treatment" data-field-treatment="${e(quote.targetId)}"><p class="small-copy">${e(quote.targetName)} · ${e(health)} · ${e(effect)}</p>${button(e(label), hero ? 'use-consumable' : 'field-potion', hero ? 'potions' : quote.targetId, 'primary small', Boolean(quote.disabledReason))}${quote.disabledReason ? `<p class="disabled-reason">${e(quote.disabledReason)}</p>` : ''}</div>`;
}
