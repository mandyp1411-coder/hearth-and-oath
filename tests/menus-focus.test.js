import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as E from '../dist/js/engine.js';
import {createLifeAtAge} from '../dist/js/new-life.js';
import {hexAtlas,syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {DUNGEONS} from '../dist/js/exploration.js';
import {getContacts,rememberedContacts} from '../dist/js/conversations.js';
import {peopleRecordPage as contactPage} from '../dist/js/people-records.js';
import {EQUIPMENT_SLOTS} from '../dist/js/gear-loot.js';
import {mountApp} from './helpers/ui-surface.mjs';

// Controlled resources, skills and one old dungeon's starting position isolate
// navigation. Meetings and routes below are offered by the production engine;
// these are regression fixtures, not additional audited lives or browser QA.
let base=await createLifeAtAge({seed:'menus-focus-fourteen',startAge:22,difficulty:'gentle'});
function settle(s){for(let i=0;s.event&&i<80;i++)s=E.chooseEventOption(s,(s.event.choices.find(c=>['care','later','keep','continue','pause','leave'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason)).id);return s;}
base=settle(base);assert.ok(E.validateSave(base));
const json=s=>JSON.parse(JSON.stringify(s));
function fresh(){const s=structuredClone(base);s.hero.gold=4000;s.hero.hp=s.hero.maxHp=300;s.adventuring.rations=20;for(const k of Object.keys(s.hero.skills))s.hero.skills[k]=12;s.locationId='home';s.cartography.interior=null;s.cartography.offsite=false;syncCartography(s);return E.migrateSave(s);}
function rememberedRoster(){const s=fresh();s.conversations.meetings={};for(const p of getContacts(s).slice(0,25))s.conversations.meetings[p.id]={locationId:p.locationId||s.locationId,firstDay:0,lastDay:s.day};assert.ok(E.validateSave(s));return s;}
async function resume(t,s=fresh(),tab=null){const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');if(tab){if(tab==='quests')tab='journal';if(!command(ui,'tab',tab))await ui.click('menu');await ui.click('tab',tab);}return ui;}
const command=(ui,op,id)=>ui.root.querySelector(`[data-op="${op}"][data-id="${id}"]`);
function unchanged(ui,before,slots){assert.deepEqual(ui.current(),before);assert.deepEqual(ui.lives(),slots);}
function focused(ui,op,id){const target=command(ui,op,id);assert.ok(target);assert.ok(ui.document.activeElement===target,`focus retained by ${op}/${id}`);assert.equal(target.isConnected,true);}
function onlyPressed(ui,selector,id){const rows=ui.root.querySelectorAll(selector),active=rows.filter(r=>r.getAttribute('aria-pressed')==='true');assert.equal(active.length,1);assert.equal(active[0].dataset.id,id);assert.ok(rows.every(r=>['true','false'].includes(r.getAttribute('aria-pressed'))));}
async function activate(ui,op,id,key='Enter'){const target=command(ui,op,id);assert.ok(target&&!target.disabled);target.focus();await ui.key(key,{target});}

test('one Inventory destination and consistent destinations appear in both navigation surfaces',async t=>{
 const ui=await resume(t),before=ui.current(),slots=ui.lives(),primary=ui.root.querySelector('[aria-label="Main views"]');
 const links=primary.querySelectorAll('[data-op="tab"]');assert.equal(links.filter(n=>n.dataset.id==='inventory').length,1);assert.equal(new Set(links.map(n=>n.dataset.id)).size,links.length);assert.match(links.find(n=>n.dataset.id==='inventory').textContent,/Inventory/);assert.match(ui.root.querySelector('.bottom-nav [data-op="menu"]').textContent,/Menu/);
 await ui.click('menu');const all=ui.root.querySelector('[aria-label="All game views"]').querySelectorAll('[data-op="tab"]');assert.equal(new Set(all.map(n=>n.dataset.id)).size,all.length);for(const n of links)assert.equal(all.find(a=>a.dataset.id===n.dataset.id).textContent.trim(),n.textContent.trim());unchanged(ui,before,slots);
});
test('help names current menus, rare discovery and the separate inspect/commit keyboard route',async t=>{
 const ui=await resume(t),before=ui.current(),slots=ui.lives();await ui.click('menu');await ui.click('help');const text=ui.root.querySelector('.modal').textContent;
 for(const label of ['Menu','Explore','Relationships','Inventory','Journal','Activities','Confirm Journey'])assert.ok(text.includes(label),label);
 assert.match(text,/Enter and Space/);assert.match(text,/conditions|supernatural|Character creation/i);assert.doesNotMatch(text,/Adventure & bounties|Regions, laws & faiths|In World|Open More|listen to a strange sound/i);unchanged(ui,before,slots);
});
test('the inventory keyboard shortcut reaches the same pack without changing a life',async t=>{const ui=await resume(t),before=ui.current(),slots=ui.lives();await ui.key('i');assert.ok(ui.root.querySelector('.inventory-workspace'));assert.equal(ui.root.querySelector('#main-content').getAttribute('aria-label'),'Inventory');unchanged(ui,before,slots);});

test('every quest category keeps connected focus, exposes selection and announces its name',async t=>{
 const ui=await resume(t,fresh(),'quests'),before=ui.current(),slots=ui.lives();
 for(const id of ['side','misc','radiant','commitments','all','main']){const old=command(ui,'journal-category',id);await activate(ui,'journal-category',id);assert.equal(old.isConnected,false);focused(ui,'journal-category',id);onlyPressed(ui,'.journal-categories button',id);assert.match(ui.viewStatus.textContent,/category\./);unchanged(ui,before,slots);}
});
test('Journal shelves retain selected state and useful focus without accepting an offer',async t=>{
 const ui=await resume(t,fresh(),'quests'),before=ui.current(),slots=ui.lives();
 for(const id of ['journal:archive','journal:notes','journal:active']){await activate(ui,'workspace-section',id);focused(ui,'workspace-section',id);assert.equal(command(ui,'workspace-section',id).getAttribute('aria-pressed'),'true');unchanged(ui,before,slots);}
});
test('all inventory categories support Space activation with restored focus and selected state',async t=>{
 const ui=await resume(t,fresh(),'inventory'),before=ui.current(),slots=ui.lives();
 for(const id of ['equipment','supplies','materials','loot','all']){await activate(ui,'inventory-category',id,' ');focused(ui,'inventory-category',id);onlyPressed(ui,'.inventory-categories button',id);assert.match(ui.viewStatus.textContent,/selected\./);unchanged(ui,before,slots);}
});
test('an equipment slot transfers focus to the actual selected slot control',async t=>{
 const ui=await resume(t,fresh(),'inventory'),before=ui.current(),slots=ui.lives(),old=command(ui,'gear-slot','weapon');await activate(ui,'gear-slot','weapon');assert.equal(old.isConnected,false);const selected=ui.root.querySelector('#inventory-slot');assert.equal(ui.document.activeElement,selected);assert.equal(selected.value,'weapon');unchanged(ui,before,slots);
});
test('every inventory slot filter retains focus without equipping or charging anything',async t=>{
 const ui=await resume(t,fresh(),'inventory'),before=ui.current(),slots=ui.lives();
 for(const id of [...EQUIPMENT_SLOTS,'all']){const select=ui.root.querySelector('#inventory-slot');select.value=id;await ui.fire('change',select);assert.equal(ui.document.activeElement,ui.root.querySelector('#inventory-slot'));assert.equal(ui.document.activeElement.value,id);assert.ok(ui.document.activeElement.isConnected);unchanged(ui,before,slots);}
});
test('relationship scopes retain useful focus and announce actual filtered totals',async t=>{
 const ui=await resume(t,rememberedRoster(),'relationships'),before=ui.current(),slots=ui.lives();
 for(const scope of ['family','friends','acquaintances','rivals','all']){await activate(ui,'people-scope',scope);focused(ui,'people-scope',scope);onlyPressed(ui,'.people-scope button',scope);const v=contactPage(before,{scope});assert.ok(ui.viewStatus.textContent.includes(`of ${v.total} matching people`));assert.match(ui.viewStatus.textContent,/selected\./);unchanged(ui,before,slots);}
});
test('selecting a remembered person keeps connected focus and never starts dialogue',async t=>{
 const ui=await resume(t,rememberedRoster(),'relationships');await ui.click('people-scope','all');const before=ui.current(),slots=ui.lives();for(const id of rememberedContacts(before).slice(0,4).map(p=>p.id)){await activate(ui,'contact',id);focused(ui,'contact',id);onlyPressed(ui,'.person-record-row',id);assert.equal(ui.root.querySelector('[data-op="reply"]'),null);unchanged(ui,before,slots);}
});
test('pagination focuses new results including the last page where Next becomes disabled',async t=>{
 const ui=await resume(t,rememberedRoster(),'relationships');await ui.click('people-scope','all');const before=ui.current(),slots=ui.lives(),v=contactPage(before,{scope:'all'});assert.ok(v.pages>1);
 for(let page=1;page<v.pages;page++){await activate(ui,'people-page',String(page));assert.ok(ui.document.activeElement===ui.root.querySelector('#people-results-heading'),'focus on current results heading');assert.ok(ui.viewStatus.textContent.includes(`Page ${page+1} of ${v.pages}`));unchanged(ui,before,slots);}
 const next=ui.root.querySelector('.contact-pagination').querySelectorAll('button').at(-1);assert.equal(next.disabled,true);await activate(ui,'people-page',String(v.pages-2));assert.ok(ui.document.activeElement===ui.root.querySelector('#people-results-heading'),'focus on current results heading');unchanged(ui,before,slots);
});
test('People search keeps the input, announces empty and matching results, and never reads a thread',async t=>{
 const ui=await resume(t,rememberedRoster(),'relationships');await ui.click('people-scope','all');const before=ui.current(),slots=ui.lives();
 for(const query of ['Nobody Matches This Name',getContacts(before)[0].name]){const form=ui.root.querySelector('#people-search');form.querySelector('#people-query').value=query;await ui.fire('submit',form);assert.ok(ui.document.activeElement===ui.root.querySelector('#people-query'),'focus on current search input');assert.equal(ui.document.activeElement.value,query);const v=contactPage(before,{scope:'all',query});assert.ok(ui.viewStatus.textContent.includes(`of ${v.total} matching people`));unchanged(ui,before,slots);}
});

function destination(s){const id=Object.keys(s.cartography.sites).find(id=>id!==s.locationId&&!E.exploreTravelPreview(s,id).disabledReason);assert.ok(id);return id;}
for(const key of ['Enter',' '])test(`country ${key===' '?'Space':key} selects for free; Confirm Journey executes the exact public offer`,async t=>{
 const ui=await resume(t,fresh(),'map'),before=ui.current(),slots=ui.lives(),id=destination(before),node=command(ui,'destination-select',id);assert.ok(node);
 const event=await ui.key(key,{target:node});assert.equal(event.defaultPrevented,true);unchanged(ui,before,slots);assert.ok(ui.document.activeElement.isConnected);const confirm=command(ui,'travel',id);assert.ok(confirm&&!confirm.disabled);assert.ok(ui.root.querySelector('#spatial-selection-title').textContent.includes(before.world.locations.find(p=>p.id===id).name));
 await activate(ui,'travel',id);assert.deepEqual(ui.current(),json(E.startExploreJourney(before,id)));assert.ok(E.validateSave(ui.current()));
});
for(const key of ['Enter',' '])test(`settlement ${key===' '?'Space':key} enters an actual illustrated area through free public paths`,async t=>{
 const ui=await resume(t,fresh(),'map');await ui.click('place-open');const before=ui.current(),door=command(ui,'place-area','market');assert.ok(door);let expected=before;for(const id of settlementWalkPath(before,'market'))expected=E.chooseAction(expected,'atlas_room_'+id);await ui.key(key,{target:door});assert.deepEqual(ui.current(),json(expected));assert.equal(ui.current().cartography.interior.roomId,'market');assert.equal(ui.current().day,before.day);assert.ok(ui.root.querySelector('[data-op="service-open"]'));assert.equal(ui.root.querySelector('.trade-workspace'),null);
});

test('old dungeon doorways inspect without spending their route day, then Confirm takes the actual route',async t=>{
 let s=fresh();delete s.mazeBook;delete s.maze;delete s.delves;s.locationId=DUNGEONS[0].locationId;syncCartography(s);s=E.chooseAction(s,'explore_enter_'+DUNGEONS[0].id);assert.ok(s.dungeon);assert.ok(E.validateSave(s));
 const ui=await resume(t,s,'life'),before=ui.current(),slots=ui.lives(),c=before.event.choices.find(c=>c.id.startsWith('route_')&&!c.disabledReason);assert.ok(c);const id=c.id.slice(6),node=command(ui,'dungeon-select',id);assert.equal(node.tagName,'BUTTON');await ui.key('Enter',{target:node});unchanged(ui,before,slots);assert.equal(ui.document.activeElement.id,'spatial-selection-title');assert.equal(command(ui,'dungeon-select',id).getAttribute('aria-pressed'),'true');assert.ok(!ui.root.querySelector('#spatial-selection-title').textContent.includes('undefined'));
 await activate(ui,'spatial-move','dungeon:'+id);assert.deepEqual(ui.current(),json(E.chooseEventOption(before,c.id)));assert.equal(ui.current().day,before.day+1);
});
test('regional dungeon doorway inspection keeps unknown contents hidden and confirms an offered route',async t=>{
 let s=fresh();delete s.mazeBook;delete s.maze;delete s.delves;let entry=E.getActions(s).find(a=>a.id.startsWith('rpg_enter_')&&!a.disabledReason);assert.ok(entry);s=E.chooseAction(s,entry.id);assert.ok(s.rpg.expedition);assert.ok(E.validateSave(s));
 const ui=await resume(t,s,'life'),before=ui.current(),slots=ui.lives(),a=E.getActions(before).find(a=>a.id.startsWith('rpg_move_')&&!a.disabledReason);assert.ok(a);const id=a.id.slice(9),room=before.rpg.expedition.rooms.find(r=>r.id===id);assert.ok(!room.visited);await ui.key(' ',{target:command(ui,'dungeon-select',id)});unchanged(ui,before,slots);assert.equal(ui.document.activeElement.id,'spatial-selection-title');assert.notEqual(ui.root.querySelector('#spatial-selection-title').textContent,room.title);assert.equal(command(ui,'dungeon-select',id).getAttribute('aria-pressed'),'true');await activate(ui,'spatial-move','rpg:'+id);assert.deepEqual(ui.current(),json(E.chooseAction(before,a.id)));
});
test('radiant doorway inspection retains the pending scene and ration until the separate route choice',async t=>{
 const old=fresh();delete old.mazeBook;delete old.maze;delete old.delves;const s=E.chooseAction(old,'adventure_descend');assert.ok(s.adventuring.expedition);const ui=await resume(t,s),before=ui.current(),slots=ui.lives(),c=before.event.choices.find(c=>c.id.startsWith('route_')),id='radiant_'+c.id.slice(6);await ui.key('Enter',{target:command(ui,'dungeon-select',id)});unchanged(ui,before,slots);assert.equal(ui.document.activeElement.id,'spatial-selection-title');assert.equal(command(ui,'dungeon-select',id).getAttribute('aria-pressed'),'true');await activate(ui,'spatial-move','dungeon:'+id);assert.deepEqual(ui.current(),json(E.chooseEventOption(before,c.id)));assert.equal(ui.current().adventuring.rations,before.adventuring.rations);
});
test('a blocked journey can be inspected without bypassing its waiting decision',async t=>{
 const s=fresh();const id=destination(s);s.event={id:'life_birthday',title:'An actual waiting decision',category:'Life',body:'The next choice is waiting.',choices:[{id:'self',label:'Keep a quiet day',description:'Consider your next year.'}]};assert.ok(E.validateSave(s));const ui=await resume(t,s,'map'),before=ui.current(),slots=ui.lives();await ui.key('Enter',{target:command(ui,'destination-select',id)});unchanged(ui,before,slots);assert.ok(command(ui,'travel',id).disabled);assert.ok(ui.root.querySelector('.destination-card-copy').textContent.includes(E.exploreTravelPreview(before,id).disabledReason));
});
test('pointer double-click keeps selection free until the separate journey confirmation',async t=>{
 const ui=await resume(t,fresh(),'map'),before=ui.current(),slots=ui.lives(),id=destination(before),node=command(ui,'destination-select',id);await ui.fire('click',node);await ui.fire('dblclick',node);ui.flushSpatialClicks();unchanged(ui,before,slots);await activate(ui,'travel',id);assert.deepEqual(ui.current(),json(E.startExploreJourney(before,id)));
});
test('persistent polite selection announcements are present in the hosted entry and do not live inside the replaced app',()=>{
 const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.match(html,/<div id="app">[\s\S]*?<\/div>\s*<div id="view-status"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});

test('a stale confirmed journey cannot spend the same departure twice',async t=>{
 const ui=await resume(t,fresh(),'map'),s=ui.current(),id=destination(s);await ui.key('Enter',{target:command(ui,'destination-select',id)});const old=command(ui,'travel',id);await activate(ui,'travel',id);const before=ui.current(),slots=ui.lives();await ui.fire('click',old);unchanged(ui,before,slots);
});
test('held destination keys neither re-render the selection nor start travel',async t=>{
 const ui=await resume(t,fresh(),'map'),before=ui.current(),slots=ui.lives(),id=destination(before),markup=ui.root.innerHTML;const event=await ui.key('Enter',{target:command(ui,'destination-select',id),repeat:true});assert.equal(event.defaultPrevented,true);assert.equal(ui.root.innerHTML,markup);unchanged(ui,before,slots);
});
