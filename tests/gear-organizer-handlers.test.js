import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrateSave, validateSave, equipGear, gearOrganizerCommand } from '../dist/js/engine.js';
import { gearOrganizer, projectedEquipment } from '../dist/js/gear.js';
import { gearPreset } from '../dist/js/gear-organizer.js';
import { mountApp } from './helpers/ui-surface.mjs';
const old=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url),'utf8')).states.adult18;
function fresh(){let s=migrateSave(old);assert.ok(s);s.equipment.owned.push('iron_sword','travel_cloak');s=equipGear(s,'iron_sword');s=equipGear(s,'travel_cloak');assert.ok(validateSave(s));return s;}
async function inventory(t,state=fresh(),options={}){const ui=await mountApp(t,{states:[state],...options});await ui.click('title-continue');await ui.click('tab','inventory');return ui;}
async function form(ui,id,label){const node=ui.root.querySelector('#'+id);assert.ok(node);node.querySelector('[name="label"]').value=label;await ui.fire('submit',node);}

test('opening Inventory and its empty Loadouts disclosure never initializes metadata',async t=>{
  const ui=await inventory(t),before=ui.current();assert.equal(Object.hasOwn(before.equipment,'organizer'),false);assert.match(ui.root.innerHTML,/Saved Loadouts · 0\/4/);assert.equal(Boolean(ui.root.querySelector('[data-disclosure="gear-loadouts"]').open),false);await ui.click('inventory-favorites');assert.deepEqual(ui.current(),before);assert.match(ui.root.innerHTML,/No carried items match/);
});
test('real handlers save escaped labels, apply full maps and filter favorite exact items',async t=>{
  const ui=await inventory(t),before=ui.current();await form(ui,'gear-preset-save','<img src=x onerror="bad()">');assert.equal(gearOrganizer(ui.current()).presets.length,1);assert.doesNotMatch(ui.root.innerHTML,/<img src=x/);assert.ok(ui.root.querySelector('[data-loadout-preview="loadout_1"]'));assert.deepEqual({...ui.current(),equipment:null},{...before,equipment:null});
  await ui.click('inventory-item','gear:iron_sword');await ui.click('gear-favorite','iron_sword');assert.deepEqual(gearOrganizer(ui.current()).favorites,['iron_sword']);await ui.click('inventory-favorites');assert.equal(ui.root.querySelectorAll('[data-item-id]').length,1);assert.equal(ui.root.querySelector('[data-op="gear-favorite"]').getAttribute('aria-pressed'),'true');
  await ui.click('equip','unequip_weapon');await ui.click('gear-preset-apply','loadout_1');assert.equal(projectedEquipment(ui.current()).weapon,'iron_sword');assert.ok(validateSave(ui.current()));
});
test('rename, replacement and deletion support Cancel/Escape and repeated stale confirms',async t=>{
  const ui=await inventory(t);await form(ui,'gear-preset-save','Road kit');await form(ui,'gear-preset-rename','Travel kit');assert.equal(gearPreset(ui.current(),'loadout_1').label,'Travel kit');await ui.click('inventory-item','gear:iron_sword');await ui.click('equip','unequip_weapon');
  const before=ui.current();await ui.click('gear-preset-replace','loadout_1');assert.match(ui.root.innerHTML,/Replace Travel kit/);await ui.key('Escape');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('[data-op="gear-preset-confirm"]'),null);
  await ui.click('gear-preset-replace','loadout_1');await ui.click('gear-preset-confirm','loadout_1');assert.equal(gearPreset(ui.current(),'loadout_1').slots.weapon,null);const replaced=ui.current();await ui.click('gear-preset-delete','loadout_1');await ui.click('close-modal');assert.deepEqual(ui.current(),replaced);await ui.click('gear-preset-delete','loadout_1');const stale=ui.root.querySelector('[data-op="gear-preset-confirm"]');await ui.fire('click',stale);assert.equal(gearOrganizer(ui.current()).presets.length,0);const deleted=ui.current();await ui.fire('click',stale);assert.deepEqual(ui.current(),deleted);assert.deepEqual({...deleted.equipment,organizer:null},{...replaced.equipment,organizer:null});
});
test('slot switches clear selected loadout/review and restore only workspace filter preferences',async t=>{
  let first=fresh();first=gearOrganizerCommand(first,{kind:'save',id:'loadout_1',label:'First life'}).state;const second=fresh();const ui=await inventory(t,first,{states:[first,second]});await ui.click('gear-preset-preview','loadout_1');await ui.click('inventory-favorites');await ui.click('menu');await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load','1');await ui.click('tab','inventory');assert.match(ui.root.innerHTML,/Saved Loadouts · 0\/4/);assert.equal(ui.root.querySelector('[data-loadout-preview]'),null);assert.equal(ui.root.querySelector('[data-op="inventory-favorites"]').getAttribute('aria-pressed'),'false');assert.equal(Object.hasOwn(ui.current().equipment,'organizer'),false);
});

for(const kind of ['favorite','save','apply'])test(`accepted organizer ${kind} announces only its actual UI result, never a prior reward`,async t=>{
 let s=fresh();if(kind==='apply'){s=gearOrganizerCommand(s,{kind:'save',id:'loadout_1',label:'Original exact kit'}).state;s=equipGear(s,'unequip_weapon');}
 const oldReward='A prior guild agreement awarded20 Gold and one rank once.';s.notice=oldReward;assert.ok(validateSave(s));const ui=await inventory(t,s),before=ui.current(),journal=structuredClone(before.journal);
 if(kind==='favorite'){await ui.click('inventory-item','gear:iron_sword');await ui.click('gear-favorite','iron_sword');assert.equal(ui.toast.textContent,'Favorite bookmark updated.');}
 if(kind==='save'){await form(ui,'gear-preset-save','Ordinary exact kit');assert.equal(ui.toast.textContent,'Current equipment saved.');}
 if(kind==='apply'){const control=ui.root.querySelector('[data-op="gear-preset-apply"][data-id="loadout_1"]');assert.ok(control&&!control.disabled);await ui.click('gear-preset-apply','loadout_1');assert.equal(ui.toast.textContent,'Saved equipment applied for the next encounter.');}
 await new Promise(resolve=>setImmediate(resolve));assert.doesNotMatch(ui.viewStatus.textContent,/awarded20 Gold|one rank/,'the generic result announcer must not replay old earned prose');assert.equal(ui.current().notice,oldReward,'UI feedback does not rewrite durable narrative');assert.deepEqual(ui.current().journal,journal);assert.deepEqual({...ui.current(),equipment:null},{...before,equipment:null},'only legitimate organizer/equipment state changes');assert.match(ui.root.innerHTML,/id="toast" class="toast" role="status"/);assert.ok(validateSave(ui.current()));
});
