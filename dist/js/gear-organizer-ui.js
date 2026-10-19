import { gearOrganizer, getGearItem, projectedEquipment } from './gear.js';
import { EQUIPMENT_SLOTS, SLOT_NAMES } from './gear-loot.js';
import { gearPreset, gearPresetFingerprint, nextGearPresetId, stageGearPreset } from './gear-organizer.js';
import { compareGearPreset } from './gear-comparison.js';
import { renderLoadoutComparison } from './equipment-comparison-ui.js';

export function renderGearOrganizer(state,ui,{selectedId=null,reason=null}={}) {
  const {e,button}=ui,organizer=gearOrganizer(state),selected=gearPreset(state,selectedId),free=nextGearPresetId(state);
  const rows=organizer.presets.map(p=>{
    const staged=stageGearPreset(state,p.id),blocked=reason||(!staged.ok?staged.reason:null);
    return `<article class="gear-loadout-row" data-loadout-id="${e(p.id)}"><div><h3>${e(p.label)}</h3><p class="small-copy">${Object.values(p.slots).filter(Boolean).length} saved pieces${staged.issues?.length?' · '+staged.issues.length+' unavailable':''}${staged.ok&&!staged.changed?' · Equipped':''}</p></div><div class="gear-loadout-actions">${button('Preview','gear-preset-preview',p.id,'ghost small',false,selectedId===p.id)}${button('Apply','gear-preset-apply',p.id,'secondary small',Boolean(blocked)||!staged.changed)}${button('Replace','gear-preset-replace',p.id,'ghost small')}${button('Delete','gear-preset-delete',p.id,'ghost small')}</div></article>`;
  }).join('');
  let preview='';
  if(selected) {
    const result=compareGearPreset(state,selected.id),comparison=result.comparison;
    preview=`<section class="gear-loadout-detail" aria-label="Selected loadout"><h3 id="gear-loadout-heading" tabindex="-1">${e(selected.label)}</h3><form id="gear-preset-rename"><input type="hidden" name="preset" value="${e(selected.id)}"><label for="gear-preset-rename-label">Loadout name</label><input id="gear-preset-rename-label" name="label" value="${e(selected.label)}" maxlength="40" required><button type="submit" class="button secondary small">Rename</button></form>${comparison?renderLoadoutComparison(comparison,ui,{id:selected.id,label:selected.label,preset:true}):`<p class="disabled-reason">${e(result.reason)}</p><ul class="gear-loadout-issues">${result.issues.map(issue=>`<li><strong>${e(SLOT_NAMES[issue.slot])}: ${e(issue.name)}</strong> · ${e(issue.reason)}</li>`).join('')}</ul>`}${reason?`<p class="disabled-reason">${e(reason)} You can still review this arrangement.</p>`:''}</section>`;
  }
  return `<details class="gear-loadouts" data-disclosure="gear-loadouts" ${selected?'open':''}><summary>Saved Loadouts · ${organizer.presets.length}/4</summary><div class="gear-loadout-body"><p class="small-copy">Each loadout remembers every slot, including empty ones. Apply uses only the exact pieces you carry, never buys or substitutes items, and changes nothing if any piece is unavailable.</p>${rows||'<p class="small-copy">No loadouts saved yet.</p>'}${free?`<form id="gear-preset-save"><input type="hidden" name="preset" value="${e(free)}"><label for="gear-preset-new-label">Name your current equipment</label><input id="gear-preset-new-label" name="label" maxlength="40" placeholder="For example, Road kit" required><button type="submit" class="button secondary small">Save Current Equipment</button></form>`:'<p class="small-copy">All four slots are used. Replace or delete a saved arrangement to make room.</p>'}${preview}</div></details>`;
}

export function renderGearPresetReview(state,review,{e,button}) {
  const preset=gearPreset(state,review?.id),current=preset&&review.expected===gearPresetFingerprint(preset),replacing=review?.kind==='replace';
  if(!current)return `<h2>Loadout changed</h2><p>This saved arrangement changed after you opened it. Nothing has been changed by this review.</p>${button('Back to Inventory','close-modal','','primary')}`;
  const now=projectedEquipment(state),changes=EQUIPMENT_SLOTS.filter(slot=>preset.slots[slot]!==now[slot]).map(slot=>`${SLOT_NAMES[slot]}: ${preset.names[slot]||'Empty'} → ${getGearItem(state,now[slot])?.name||'Empty'}`);
  return `<span class="eyebrow">SAVED EQUIPMENT ONLY</span><h2>${replacing?'Replace':'Delete'} ${e(preset.label)}?</h2><p>${replacing?'Replace this saved arrangement with what you are wearing now, including empty slots. Your currently equipped items stay unchanged.':'Delete this saved arrangement only. You keep every item and your currently equipped items stay unchanged.'}</p>${replacing?`<ul class="gear-loadout-issues">${changes.map(change=>`<li>${e(change)}</li>`).join('')||'<li>The saved slots already match your equipment.</li>'}</ul>`:''}<div class="modal-buttons">${button('Keep Saved Loadout','close-modal','','primary')}${button(replacing?'Replace Saved Loadout':'Delete Saved Loadout','gear-preset-confirm',preset.id,replacing?'secondary':'danger')}</div>`;
}
