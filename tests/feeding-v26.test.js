import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../dist/js/engine.js';
import {contractCurse} from '../dist/js/curses.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {feedingChoices,feedingScene} from '../dist/js/feeding-stories-v26.js';
import {applyLifeChoice} from '../dist/js/life.js';
import {isSettlement} from '../dist/js/world.js';
const saved=JSON.parse(readFileSync(new URL('./fixtures/hunger-birthday-v26.json',import.meta.url),'utf8'));

test('a real paused-hunger birthday save can request the need again and feed through the boundary without a free refill',()=>{
 let s=E.migrateSave(saved);assert.ok(s);const before=structuredClone(s),oldDay=s.day,oldGold=s.hero.gold,oldHunger=s.hero.condition.hunger;
 assert.equal(E.getActions(s).find(a=>a.id==='feed_vampire').disabledReason,'Your next birthday is due. Choose Age up before starting this activity.');
 s=E.ageUp(s);assert.equal(s.event.id,'life_hunger');assert.ok(s.event.choices.some(c=>c.id==='endure'));assert.equal(s.day,oldDay);
 const after=E.chooseEventOption(s,'animal');assert.equal(after.day,oldDay+1);assert.equal(after.hero.gold,oldGold);assert.equal(after.hero.condition.hunger,oldHunger+2-45);assert.match(after.event.id,/^birth_/);assert.equal(after.age,30);assert.ok(E.validateSave(after));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(after))),after);assert.deepEqual(E.migrateSave(saved),before);
});
test('a new prison hunger offer uses a recorded jailer ration rather than a secret hunt or an invented local donor',()=>{
 const s=E.migrateSave(saved);s.justice.prison={locationId:s.locationId};
 const options=feedingChoices(s,'life_hunger',[{id:'animal'},{id:'donor'},{id:'pause'}]);assert.ok(options.some(c=>c.id==='jailer'));assert.ok(!options.some(c=>['animal','donor'].includes(c.id)));
 const day=s.day,hunger=s.hero.condition.hunger;
 const ctx={spendDays:n=>{s.day+=n;return n;},journal(){},standing(){},addEvidence(){},setEvent(){}};
 applyLifeChoice(s,'life_hunger','jailer',ctx);assert.equal(s.day,day+1);assert.equal(s.hero.condition.hunger,hunger-30);const exposure=s.hero.condition.exposures.at(-1);assert.match(exposure.description,/infirmary jailer/);assert.equal(exposure.locationId,s.locationId);
});
test('refusing the birthday meal spends one real night, preserves hunger and opens the actual birthday rather than trapping or feeding the character',()=>{
 let s=E.ageUp(E.migrateSave(saved));const oldDay=s.day,oldHunger=s.hero.condition.hunger,oldGold=s.hero.gold;
 s=E.chooseEventOption(s,'endure');assert.equal(s.day,oldDay+1);assert.equal(s.hero.condition.hunger,oldHunger+2);assert.equal(s.hero.gold,oldGold);assert.match(s.event.id,/^birth_/);assert.equal(s.age,30);assert.ok(E.validateSave(s));
});
test('new feeding menus use actual settlement presence and bloodline relief; an older saved offer keeps its exact choices on load',async()=>{
 let s=await createLifeAtAge({seed:'feeding-presence-v26',startAge:18});while(s.event)s=E.chooseEventOption(s,s.event.choices[0].id);
 const settlement=s.world.locations.find(p=>isSettlement(s.world,p.id));s.locationId=settlement.id;contractCurse(s,'vampire','Unit bite',{},'gloamwing');s.hero.gold=30;
 const choices=[{id:'animal'},{id:'donor'},{id:'predation'},{id:'abstain'}];assert.ok(feedingChoices(s,'vampire_feeding',choices).some(c=>c.id==='donor'));assert.match(feedingChoices(s,'vampire_feeding',choices).find(c=>c.id==='animal').description,/34 hunger/);
 s.locationId='ruin';assert.deepEqual(feedingChoices(s,'vampire_feeding',choices).map(c=>c.id),['animal','abstain']);assert.ok(!feedingScene(s).includes('clinic'));
 s.cartography.offsite=true;s.locationId=settlement.id;assert.ok(!feedingChoices(s,'life_hunger',choices).some(c=>['donor','predation'].includes(c.id)));
 const old=E.migrateSave(saved);old.event={id:'vampire_feeding',title:'A saved meal',category:'Vampirism',body:'An earlier offered donor awaits.',choices:[{id:'donor',label:'Pay the willing donor',description:'The saved promise.'},{id:'abstain',label:'Wait',description:'Remain hungry.'}]};assert.ok(E.validateSave(old));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(old))),old);
});


test('earlier dungeon naming is authenticated without accepting edited loot, graphs or people',()=>{
 assert.ok(E.validateSave(saved));
 for(const change of [d=>d.custodian.name='Forged keeper',d=>d.rooms.find(r=>r.loot).loot.gold++,d=>d.rooms[0].exits.push('source')]){
  const forged=structuredClone(saved);change(forged.flags.dungeonRecords.cistern.definition);assert.equal(E.validateSave(forged),false);assert.equal(E.migrateSave(forged),null);
 }
});
