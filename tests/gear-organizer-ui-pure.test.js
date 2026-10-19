import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeGear, equipItem, discardGear } from '../dist/js/gear.js';
import { saveGearPreset, renameGearPreset, gearPreset, gearPresetFingerprint } from '../dist/js/gear-organizer.js';
import { renderGearOrganizer, renderGearPresetReview } from '../dist/js/gear-organizer-ui.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e,button:(label,op,id='',cls='',disabled=false,pressed=false)=>`<button type="button" class="${e(cls)}" data-op="${e(op)}" data-id="${e(id)}" ${disabled?'disabled':''} aria-pressed="${pressed}">${label}</button>`};
function fresh(){const s={characterDialogueVersion:28,day:12,hero:{name:'Hero',path:'warrior',attributes:{strength:6},skills:{weapons:2}},equipment:null};initializeGear(s);return s;}
function saved(){const s=fresh();s.equipment.owned.push('iron_sword');equipItem(s,'iron_sword');s.equipment=saveGearPreset(s,'loadout_1','<img src=x onerror="bad()">').equipment;return s;}
test('rendering empty fresh and older organizers does not add metadata',()=>{
  const s=fresh(),before=structuredClone(s),html=renderGearOrganizer(s,ui);assert.match(html,/Saved Loadouts · 0\/4/);assert.match(html,/Save Current Equipment/);assert.deepEqual(s,before);assert.equal(Object.hasOwn(s.equipment,'organizer'),false);
});
test('all editable and snapshot labels are escaped in text and attributes',()=>{
  const s=saved(),before=structuredClone(s),html=renderGearOrganizer(s,ui,{selectedId:'loadout_1'});assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);assert.match(html,/data-loadout-preview="loadout_1"/);assert.deepEqual(s,before);
});
test('missing piece explanations replace hypothetical totals and application is disabled',()=>{
  const s=saved();discardGear(s,'iron_sword');const html=renderGearOrganizer(s,ui,{selectedId:'loadout_1'});assert.match(html,/1 unavailable/);assert.match(html,/Iron longsword/);assert.match(html,/Not carried/);assert.doesNotMatch(html,/data-loadout-preview/);assert.match(html,/data-op="gear-preset-apply"[^>]*disabled/);
});
test('the authoritative barrier disables application without hiding read-only comparison',()=>{
  const s=saved();equipItem(s,'unequip_weapon');const html=renderGearOrganizer(s,ui,{selectedId:'loadout_1',reason:'Finish the current crossing.'});assert.match(html,/data-op="gear-preset-apply"[^>]*disabled/);assert.match(html,/data-loadout-preview/);assert.match(html,/Finish the current crossing\./);assert.doesNotMatch(html,/Clear.*route/);
});
test('delete and replace reviews name the exact bookmark and stale reviews have no confirm button',()=>{
  const s=saved(),review={kind:'replace',id:'loadout_1',expected:gearPresetFingerprint(gearPreset(s,'loadout_1'))};equipItem(s,'unequip_weapon');const replacement=renderGearPresetReview(s,review,ui),deletion=renderGearPresetReview(s,{...review,kind:'delete'},ui);assert.match(replacement,/Iron longsword → Empty/);assert.match(replacement,/Keep Saved Loadout/);assert.match(replacement,/gear-preset-confirm/);assert.match(deletion,/You keep every item/);assert.doesNotMatch(deletion,/<img src=x/);
  s.equipment=renameGearPreset(s,'loadout_1','Renamed').equipment;const stale=renderGearPresetReview(s,review,ui);assert.match(stale,/Loadout changed/);assert.doesNotMatch(stale,/gear-preset-confirm/);
});
