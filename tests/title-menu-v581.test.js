// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.
// Actual delegated commands on a disposable semantic surface. CSS geometry,
// native keyboard behavior and browser storage are not modeled here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {createBirthGame, useConsumable, migrateSave} from '../dist/js/engine.js';
import {createSaveStore} from '../dist/js/saves.js';
import {properPlaceName} from '../dist/js/presentation-names.js';
import {freshStory} from './helpers/story-life-fixtures.mjs';
import {mountApp} from './helpers/ui-surface.mjs';

const KEY='hearth-and-oath:slots:v1',MIRROR='hearth-and-oath:life:v1';
const control=(ui,op)=>ui.root.querySelector(`[data-op="${op}"]`);
const bytes=ui=>[ui.storage.getItem(KEY),ui.storage.getItem(MIRROR)];
const flush=async()=>{for(let n=0;n<6;n++)await turn();};
function life(name){const state=freshStory();state.hero.name=name;state.lineage.people.find(person=>person.id===state.dynasty.activePersonId).name=name;assert.equal(Boolean(migrateSave(state)),true);return state;}
function capture(t,ui){
 const files=[],create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 URL.createObjectURL=blob=>{files.push(blob);return 'blob:title-menu-check';};URL.revokeObjectURL=()=>{};
 ui.document.createElement=()=>({click(){}});
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;});return files;
}

test('first visit leads with one enabled beginning and offers direct import without a false saved claim',async t=>{
 const ui=await mountApp(t, {rulebooks:'both'}),before=bytes(ui);
 assert.equal(control(ui,'title-continue'),null);
 assert.equal(control(ui,'title-new').classList.contains('title-begin'),true);
 assert.equal(control(ui,'title-load').disabled,true);
 assert.equal(control(ui,'import').disabled,false);
 assert.equal(ui.root.querySelector('[data-save-label]').textContent,'No life saved yet');
 assert.equal(ui.root.querySelectorAll('h1').length,1);
 assert.deepEqual(bytes(ui),before);
 await ui.key('Enter',{target:control(ui,'title-new')});
 assert.equal(ui.document.activeElement.id,'slot-heading');
 assert.equal(ui.root.querySelectorAll('[data-op="slot-new"]:not(:disabled)').length,3);
 assert.deepEqual(bytes(ui),before);
});

test('Continue previews and enters the active life even when a neighboring slot has a newer timestamp',async t=>{
 const states=[life('Fictional Alder'),life('Fictional Mira'),life('Fictional Ash & <Oath>')];
 const slots={version:1,activeSlot:1,backups:{},slots:states.map((state,id)=>({id,state,updatedAt:`2026-10-${12+id}T00:00:00.000Z`}))};
 const ui=await mountApp(t, {rulebooks:'both', states,activeSlot:1,storageEntries:[[KEY,JSON.stringify(slots)]]}),before=bytes(ui),resume=control(ui,'title-continue');
 assert.equal(resume.dataset.id,'1');assert.match(resume.textContent,/Fictional Mira/);
 const state=states[1],place=state.world.locations.find(place=>place.id===state.locationId)?.name||state.world.name;
 assert.equal(resume.querySelector('.title-life-place').textContent,properPlaceName(place));
 assert.equal(Number(resume.querySelector('[data-age]').dataset.age),state.age);
 assert.equal(ui.root.querySelector('[data-save-health]').dataset.saveSlot,'1');
 assert.equal(ui.root.querySelector('[data-save-health]').dataset.saveAt,slots.slots[1].updatedAt);
 assert.deepEqual(bytes(ui),before,'rendering the preview is read only');
 await ui.key(' ',{target:resume});assert.equal(ui.current().hero.name,'Fictional Mira');
 await ui.click('title-menu');assert.equal(ui.document.activeElement.dataset.op,'title-continue');
});

test('an empty active slot falls back to the most recently saved life and binds Continue to that displayed slot',async t=>{
 const states=[null,life('Fictional Earlier'),life('Fictional Latest')];
 const slots={version:1,activeSlot:0,backups:{},slots:states.map((state,id)=>({id,state,updatedAt:state?`2026-10-${12+id}T00:00:00.000Z`:null}))};
 const ui=await mountApp(t, {rulebooks:'both', states,storageEntries:[[KEY,JSON.stringify(slots)]]});
 assert.equal(control(ui,'title-continue').dataset.id,'2');assert.match(control(ui,'title-continue').textContent,/Fictional Latest/);
 assert.equal(ui.root.querySelector('[data-save-health]').dataset.saveSlot,'2');
 await ui.click('title-continue');assert.equal(ui.current().hero.name,'Fictional Latest');
});

test('removing the previewed life elsewhere opens the saved-life list instead of silently entering another character',async t=>{
 const ui=await mountApp(t, {rulebooks:'both', states:[life('Fictional Departed'),life('Fictional Neighbor')]}),other=createSaveStore(ui.storage,migrateSave);
 assert.equal(other.remove(0,{reviewed:true,token:other.deletionToken(0)}),true);
 const before=bytes(ui);await ui.click('title-continue');
 assert.equal(Boolean(ui.root.querySelector('.save-slots-screen')),true);
 assert.match(ui.root.querySelector('.notice').textContent,/no longer in its slot/);
 assert.equal(ui.document.activeElement.id,'slot-heading');assert.deepEqual(bytes(ui),before);
});

test('arrow navigation wraps correctly from outside the menu, skips disabled controls and supports Home and End',async t=>{
 const ui=await mountApp(t, {rulebooks:'both'}),items=ui.root.querySelectorAll('.title-menu-item:not(:disabled)');
 control(ui,'fullscreen').focus();await ui.key('ArrowUp');assert.equal(ui.document.activeElement.dataset.op,items.at(-1).dataset.op);
 await ui.key('ArrowDown');assert.equal(ui.document.activeElement.dataset.op,'title-new');
 await ui.key('End');assert.equal(ui.document.activeElement.dataset.op,items.at(-1).dataset.op);
 await ui.key('Home');assert.equal(ui.document.activeElement.dataset.op,'title-new');
 await ui.key('ArrowDown');assert.equal(ui.document.activeElement.dataset.op,'title-settings');
 const focused=ui.document.activeElement,event=await ui.key('End',{ctrlKey:true});
 assert.equal(ui.document.activeElement.dataset.op,focused.dataset.op);assert.equal(event.defaultPrevented,false);
});

test('secondary help, Settings, saved lives and rehearsal preserve return focus and saved bytes',async t=>{
 const ui=await mountApp(t, {rulebooks:'both', states:[life('Fictional Rowan')]}),before=bytes(ui);
 control(ui,'help').focus();await ui.click('help');await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'help');
 await ui.click('title-settings');assert.equal(ui.document.activeElement.tagName,'H1');await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'title-settings');
 await ui.click('title-load');assert.equal(ui.document.activeElement.id,'slot-heading');await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'title-load');
 await ui.click('practice-open','protect_ally');assert.equal(Boolean(ui.root.querySelector('.practice-modal')),true);
 await ui.click('practice-close');assert.equal(ui.document.activeElement.dataset.op,'practice-open');
 assert.deepEqual(bytes(ui),before);
});

test('a newborn preview describes observation and never offers an infant decision',async t=>{
 const state=createBirthGame({name:'Fictional Newborn',seed:'title-infant-observation'}),ui=await mountApp(t, {rulebooks:'both', states:[state]}),before=bytes(ui);
 assert.match(control(ui,'title-continue').textContent,/Age 0/);
 assert.equal(ui.root.querySelector('.title-life-context').textContent,'Watching your first years: '+state.event.title);
 assert.doesNotMatch(control(ui,'title-continue').textContent,/Decision waiting/);
 assert.deepEqual(bytes(ui),before);
});

test('returning to title after a failed save previews and exports the exact live session, and Continue preserves it',async t=>{
 const state=life('Fictional Unsaved Rowan');state.event=null;state.battle=null;state.flags.herbs=4;state.hero.hp=state.hero.maxHp;state.life.health=100;state.life.stress=0;
 const ui=await mountApp(t, {rulebooks:'both', states:[state]});await ui.click('title-continue');const before=ui.current(),expected=useConsumable(before,'herbs'),durable=bytes(ui),write=ui.storage.setItem;
 ui.storage.setItem=(key,value)=>{if([KEY,MIRROR].includes(key))throw Error('Controlled title quota');write(key,value);};
 await ui.click('tab','inventory');await ui.click('inventory-item','supply:herbs');await ui.click('use-consumable','herbs');await ui.click('herbal-care-confirm');await flush();
 await ui.click('title-menu');await flush();
 assert.equal(ui.root.querySelector('[data-return-life-card]').dataset.slotLive,'true');
 assert.match(ui.root.querySelector('[data-slot-source]').textContent,/Latest session; not yet saved/);
 assert.match(ui.root.querySelector('[data-save-label]').textContent,/Not saved/);
 assert.equal((await ui.windowEvent('beforeunload')).defaultPrevented,true);
 const files=capture(t,ui);await ui.click('export-session','0');assert.deepEqual(JSON.parse(await files[0].text()),expected);assert.deepEqual(bytes(ui),durable);
 await ui.click('title-continue');await ui.click('menu');await ui.click('export');
 assert.deepEqual(JSON.parse(await files[1].text()),expected);assert.deepEqual(bytes(ui),durable);
});

test('Continue returns to the exact unsaved Standard life even when lock failure prevented the store write itself',async t=>{
 let denied=false;
 const locks={async request(name,options,consume){if(denied)throw Error('Controlled lock unavailable');return consume({name,mode:'exclusive'});}};
 const state=life('Fictional Held Rowan');state.event=null;state.battle=null;state.flags.herbs=4;state.hero.hp=state.hero.maxHp;state.life.health=100;state.life.stress=0;
 const ui=await mountApp(t, {rulebooks:'both', states:[state],locks});await flush();await ui.click('title-continue');await flush();
 const before=ui.current(),expected=useConsumable(before,'herbs'),durable=bytes(ui);denied=true;
 await ui.click('tab','inventory');await ui.click('inventory-item','supply:herbs');await ui.click('use-consumable','herbs');await ui.click('herbal-care-confirm');await flush();
 await ui.click('title-menu');await flush();assert.equal(Boolean(ui.root.querySelector('.title-screen')),true);
 assert.match(ui.root.querySelector('[data-slot-source]').textContent,/Latest session; not yet saved/);
 const files=capture(t,ui);await ui.click('title-continue');await flush();assert.equal(Boolean(ui.root.querySelector('.game-frame')),true);
 await ui.click('menu');await ui.click('export');assert.deepEqual(JSON.parse(await files[0].text()),expected);assert.deepEqual(bytes(ui),durable);
 denied=false;await ui.click('save');await flush();assert.deepEqual(ui.current(),expected,'retry persists without repeating treatment');
});
