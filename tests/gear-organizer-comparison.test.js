import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeGear, equipItem, gearBonuses, gearScore, discardGear } from '../dist/js/gear.js';
import { saveGearPreset, stageGearPreset } from '../dist/js/gear-organizer.js';
import { compareEquipment, compareGearPreset } from '../dist/js/gear-comparison.js';
import { renderEquipmentComparison, renderLoadoutComparison } from '../dist/js/equipment-comparison-ui.js';
import { combatProfile } from '../dist/js/combat.js';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fresh(){const s={characterDialogueVersion:28,day:12,hero:{name:'Hero',path:'warrior',attributes:{strength:6,intellect:6,agility:6,willpower:6},skills:{weapons:2,arcana:2,defense:2}},equipment:null};initializeGear(s);return s;}
function piece(s,baseId,affix,serial){const id=`found_${serial}_1`;s.equipment.instances.push({id,baseId,quality:'rare',affix,tier:3,source:'home',day:1});s.equipment.owned.push(id);return id;}
const slots=['field_shield','field_helm','leather_armor','leather_gloves','trail_boots'];
function set(s,affix){for(const [n,id]of slots.entries())equipItem(s,piece(s,id,affix,affix+n));}
function snapshot(s){const result=saveGearPreset(s,'loadout_1','<Caster & guard>');assert.equal(result.ok,true);s.equipment=result.equipment;}

test('a full preset preview computes simultaneous five/three-piece losses and gains once',()=>{
  const s=fresh();set(s,'channeler');snapshot(s);set(s,'bastion');const before=structuredClone(s),preview=compareGearPreset(s,'loadout_1');assert.deepEqual(s,before);assert.equal(preview.ok,true);assert.equal(preview.comparison.changes.length,5);
  const old=preview.comparison.setChanges.find(t=>t.id==='bastion'),next=preview.comparison.setChanges.find(t=>t.id==='channeler');assert.equal(old.beforeCount,5);assert.equal(old.afterCount,0);assert.equal(next.beforeCount,0);assert.equal(next.afterCount,5);assert.ok(old.thresholds.every(t=>t.beforeActive&&!t.afterActive));assert.ok(next.thresholds.every(t=>!t.beforeActive&&t.afterActive));
  const actual={...s,equipment:stageGearPreset(s,'loadout_1').equipment},c=preview.comparison;assert.deepEqual(c.after.bonuses,gearBonuses(actual));assert.equal(c.after.score,gearScore(actual));for(const key of ['attack','armor','magic','agility'])assert.equal(c.delta[key],gearBonuses(actual)[key]-gearBonuses(s)[key]);
  const profile=combatProfile(actual);assert.equal(c.after.combat.armor,profile.armor);assert.equal(c.after.combat.initiative,profile.actor.agility);assert.equal(c.after.combat.arcane,profile.arcane);
});
test('preview preserves captured battle data and remains read-only without deciding equipment policy',()=>{
  const s=fresh();s.equipment.owned.push('iron_sword');equipItem(s,'iron_sword');snapshot(s);equipItem(s,'unequip_weapon');s.battle={actors:[{id:'hero',equipment:{weapon:'captured'},gear:{attack:17}}]};s.cartography={pending:{progress:1},route:{destination:'home'}};
  const before=structuredClone(s),p=compareGearPreset(s,'loadout_1');assert.equal(p.ok,true);assert.deepEqual(s,before);assert.equal(p.comparison.after.bonuses.attack,4);
});
test('missing presets and pieces do not invent after totals or mutate the life',()=>{
  const s=fresh();s.equipment.owned.push('iron_sword');equipItem(s,'iron_sword');snapshot(s);discardGear(s,'iron_sword');const before=structuredClone(s),p=compareGearPreset(s,'loadout_1');assert.equal(p.ok,false);assert.equal(p.comparison,null);assert.equal(p.issues[0].name,'Iron longsword');assert.equal(compareGearPreset(s,'absent').comparison,null);assert.deepEqual(s,before);
});
test('preset renderer escapes labels and describes the full before/after including set changes',()=>{
  const s=fresh();set(s,'channeler');snapshot(s);set(s,'bastion');const p=compareGearPreset(s,'loadout_1'),html=renderLoadoutComparison(p.comparison,{e},{id:p.preset.id,label:p.preset.label,preset:true});assert.match(html,/data-loadout-preview="loadout_1"/);assert.match(html,/&lt;Caster &amp; guard&gt;/);assert.doesNotMatch(html,/<Caster/);assert.match(html,/Lose 5-piece bonus/);assert.match(html,/Gain 3-piece bonus/);assert.match(html,/Full loadout change:/);assert.match(html,/Training and base attributes stay unchanged/);
});
test('single-item and merchant comparison wrappers retain their current semantics',()=>{
  const s=fresh(),c=compareEquipment(s,'iron_sword'),purchase=renderEquipmentComparison(c,{e},{purchase:true});assert.match(purchase,/data-equipment-preview="iron_sword"/);assert.match(purchase,/If bought and equipped\. Buying leaves your loadout unchanged\./);assert.equal(c.owned,false);assert.equal(c.delta.attack,4);assert.equal(s.equipment.owned.length,0);
  s.equipment.owned.push('iron_sword');equipItem(s,'iron_sword');const removal=renderEquipmentComparison(compareEquipment(s,'unequip_weapon'),{e});assert.match(removal,/After unequipping:/);assert.match(removal,/Attack -4/);
});
