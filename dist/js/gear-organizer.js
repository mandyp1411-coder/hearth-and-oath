import { EQUIPMENT_SLOTS, SLOT_NAMES } from './gear-loot.js';
import { GEAR_PRESET_IDS, gearOrganizer, validGearPresetLabel, validateGear, getGearItem, projectedEquipment, equipItem } from './gear.js';

const reject=(reason,issues=[])=>({ok:false,changed:false,reason,issues});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validState=s=>!!s?.equipment&&validateGear(s.equipment);
const labelText=value=>typeof value==='string'?value.trim():'';
export const gearPresetFingerprint=preset=>preset?JSON.stringify(preset):null;
export const gearPreset= (state,id)=>gearOrganizer(state).presets.find(p=>p.id===id)||null;
export const nextGearPresetId=state=>GEAR_PRESET_IDS.find(id=>!gearPreset(state,id))||null;

function changedOrganizer(state,change) {
  const equipment=structuredClone(state.equipment);
  equipment.organizer=structuredClone(gearOrganizer(state));
  change(equipment.organizer);
  if(!validateGear(equipment))return reject('That equipment bookmark is not valid.');
  const changed=!same(state.equipment,equipment);
  return {ok:true,changed,equipment:changed?equipment:state.equipment};
}
function currentCapture(state,id,label) {
  const slots=projectedEquipment(state),names={};
  for(const slot of EQUIPMENT_SLOTS)if(slots[slot])names[slot]=getGearItem(state,slots[slot]).name;
  return {id,label,slots,names};
}
export function saveGearPreset(state,id,label) {
  if(!validState(state))return reject('Begin a valid life before saving equipment.');
  label=labelText(label);
  if(!validGearPresetLabel(label))return reject('Use a loadout name of 1–40 characters without line breaks.');
  if(!GEAR_PRESET_IDS.includes(id)||gearPreset(state,id))return reject('Choose an empty loadout slot.');
  const preset=currentCapture(state,id,label);
  return changedOrganizer(state,value=>value.presets.push(preset));
}
export function renameGearPreset(state,id,label) {
  if(!validState(state)||!gearPreset(state,id))return reject('That loadout is no longer saved.');
  label=labelText(label);
  if(!validGearPresetLabel(label))return reject('Use a loadout name of 1–40 characters without line breaks.');
  if(gearPreset(state,id).label===label)return {ok:true,changed:false,equipment:state.equipment};
  return changedOrganizer(state,value=>{value.presets.find(p=>p.id===id).label=label;});
}
function confirmedPreset(state,id,expected) {
  if(!validState(state))return null;
  const preset=gearPreset(state,id);
  return preset&&typeof expected==='string'&&expected===gearPresetFingerprint(preset)?preset:null;
}
export function replaceGearPreset(state,id,expected) {
  const preset=confirmedPreset(state,id,expected);
  if(!preset)return reject('That loadout changed. Review it again before replacing it.');
  const replacement=currentCapture(state,id,preset.label);
  if(same(preset,replacement))return {ok:true,changed:false,equipment:state.equipment};
  return changedOrganizer(state,value=>{value.presets[value.presets.findIndex(p=>p.id===id)]=replacement;});
}
export function deleteGearPreset(state,id,expected) {
  if(!confirmedPreset(state,id,expected))return reject('That loadout changed. Review it again before deleting it.');
  return changedOrganizer(state,value=>{value.presets=value.presets.filter(p=>p.id!==id);});
}
export function toggleGearFavorite(state,id) {
  if(!validState(state)||!state.equipment.owned.includes(id)||!getGearItem(state,id))return reject('Only equipment you currently carry can be favorited.');
  return changedOrganizer(state,value=>{value.favorites=value.favorites.includes(id)?value.favorites.filter(key=>key!==id):[...value.favorites,id];});
}

/** A detached equipment plan, not an equipment policy or a second slot engine.
 * The engine must check its authoritative equipmentActionReason before commit.
 * Read-only comparisons may stage a plan while actual equipment is locked. */
export function stageGearPreset(state,id) {
  if(!validState(state))return reject('Your saved equipment is not valid.');
  const preset=gearPreset(state,id);
  if(!preset)return reject('That loadout is no longer saved.');
  const issues=[];
  for(const slot of EQUIPMENT_SLOTS) {
    const key=preset.slots[slot];if(key===null)continue;
    const item=getGearItem(state,key),name=preset.names[slot];
    if(!state.equipment.owned.includes(key)||!item)issues.push({slot,id:key,name,reason:'Not carried; it may have been sold, returned, or removed.'});
    else if(item.slot!==slot)issues.push({slot,id:key,name,reason:`This piece belongs in ${SLOT_NAMES[item.slot]||'another slot'}.`});
  }
  if(issues.length)return reject('This loadout cannot be applied. No equipment has changed.',issues);
  const before=projectedEquipment(state);
  if(EQUIPMENT_SLOTS.every(slot=>before[slot]===preset.slots[slot]))return {ok:true,changed:false,equipment:state.equipment,preset};
  const projected={...state,equipment:structuredClone(state.equipment)};
  for(const slot of EQUIPMENT_SLOTS)if(!equipItem(projected,'unequip_'+slot))return reject('That loadout could not be prepared.');
  for(const slot of EQUIPMENT_SLOTS)if(preset.slots[slot]&&!equipItem(projected,preset.slots[slot]))return reject('That loadout could not be prepared.');
  const after=projectedEquipment(projected);
  if(!validateGear(projected.equipment)||!EQUIPMENT_SLOTS.every(slot=>after[slot]===preset.slots[slot]))return reject('That loadout does not fit your current equipment slots.');
  return {ok:true,changed:true,equipment:projected.equipment,preset};
}
