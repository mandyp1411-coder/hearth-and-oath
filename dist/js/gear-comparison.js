import { getGearItem, ownedGear, gearBonuses, gearScore, projectedEquipment, equipItem } from './gear.js';
import { EQUIPMENT_SLOTS, setProgress } from './gear-loot.js';
import { combatProfile } from './combat.js';
import { sacredPower } from './combat-rules.js';
import { stageGearPreset } from './gear-organizer.js';

export const GEAR_STATS = ['attack','armor','magic','agility'];
export const GEAR_STAT_NAMES = {attack:'Attack',armor:'Armor',magic:'Spell power',agility:'Initiative'};
export const BUILD_GOALS = [
  {id:'weapon',name:'Weapon damage',description:'Attack strengthens weapon strikes. Armor and initiative determine how safely and how soon you act.',weights:{attack:3,armor:1,magic:0,agility:1}},
  {id:'caster',name:'Spell power',description:'Magic strengthens arcane and sacred attacks, healing and some wards. Giving up armor makes incoming hits more costly.',weights:{attack:0,armor:1,magic:3,agility:1}},
  {id:'defender',name:'Protection',description:'Armor reduces physical hits. A protected defender can draw attacks while giving up weapon damage.',weights:{attack:1,armor:4,magic:0,agility:1}},
];
export function equippedPieces(state) {
  const ids=new Set(Object.values(state.equipment?.equipped||{}));
  return ownedGear(state).filter(item=>ids.has(item.id));
}
function combatValues(state) {
  const p=combatProfile(state);
  return {weapon:Math.max(1,Math.round(p.attack)),arcane:p.arcane,sacred:sacredPower(p.actor),armor:p.armor,initiative:p.actor.agility};
}
function loadout(state) {
  return {bonuses:gearBonuses(state),score:gearScore(state),sets:setProgress(equippedPieces(state)),combat:combatValues(state)};
}
// One before/after calculation for both single pieces and complete presets.
// Summing single-item deltas would double-count interacting set thresholds.
function compareLoadouts(state,projected,baseline=null) {
  const beforeSlots=baseline?.slots||projectedEquipment(state),afterSlots=projectedEquipment(projected),before=baseline?.loadout||loadout(state),after=loadout(projected);
  const changes=EQUIPMENT_SLOTS.filter(key=>beforeSlots[key]!==afterSlots[key]).map(key=>({slot:key,before:getGearItem(state,beforeSlots[key]),after:getGearItem(projected,afterSlots[key])}));
  const delta=Object.fromEntries(GEAR_STATS.map(key=>[key,after.bonuses[key]-before.bonuses[key]]));
  const setChanges=[...new Set([...before.sets,...after.sets].map(s=>s.id))].flatMap(key=>{
    const b=before.sets.find(s=>s.id===key),a=after.sets.find(s=>s.id===key);
    if((b?.count||0)===(a?.count||0))return [];
    const basis=a||b;
    return [{id:key,name:basis.name,beforeCount:b?.count||0,afterCount:a?.count||0,thresholds:basis.thresholds.map(t=>({count:t.count,bonuses:{...t.bonuses},beforeActive:(b?.count||0)>=t.count,afterActive:(a?.count||0)>=t.count}))}];
  });
  return {changes,before,after,delta,scoreDelta:after.score-before.score,setChanges};
}
function compare(state,id,baseline=null) {
  if(!state?.equipment||typeof id!=='string')return null;
  const removing=id.startsWith('unequip_'),beforeSlots=baseline?.slots||projectedEquipment(state);
  const slot=removing?id.slice(8):getGearItem(state,id)?.slot;
  if(!EQUIPMENT_SLOTS.includes(slot))return null;
  const item=getGearItem(state,removing?beforeSlots[slot]:id);
  if(!item)return null;
  // equipItem only writes equipment and notice. The rest of the life is shared
  // read-only, avoiding a world-sized clone for each card in a large gear bag.
  const projected={...state,equipment:structuredClone(state.equipment)};
  const owned=state.equipment.owned.includes(item.id);
  if(!removing&&!owned)projected.equipment.owned.push(item.id);
  if(!equipItem(projected,id))return null;
  return {id,item,slot,removing,owned,...compareLoadouts(state,projected,baseline)};
}
export function compareEquipment(state,id) { return compare(state,id); }
export function compareGearPreset(state,id) {
  const staged=stageGearPreset(state,id);
  return {...staged,comparison:staged.ok?{id,...compareLoadouts(state,{...state,equipment:staged.equipment})}:null};
}
export function equipmentComparator(state) {
  const baseline={slots:projectedEquipment(state),loadout:loadout(state)},cache=new Map();
  return id=>{if(!cache.has(id))cache.set(id,compare(state,id,baseline));return cache.get(id);};
}
export function buildFit(comparison,goalId) {
  const goal=BUILD_GOALS.find(g=>g.id===goalId);
  if(!goal||!comparison)return null;
  // A disclosed preference guide, never another hidden stat or combat modifier.
  return GEAR_STATS.reduce((n,key)=>n+comparison.delta[key]*goal.weights[key],0);
}
