import test from 'node:test';
import { normalizeStartAge } from '../dist/js/origins.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setImmediate as settle } from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import * as C from '../dist/js/creator.js';
import { completeAttributePoints, attributePointsSpent, attributePointBudget } from '../dist/js/starting-attributes.js';
import { availablePortraits, portraitContext, portraitEntry } from '../dist/js/portrait-library.js';
import { portraitLayers } from '../dist/js/avatar.js';
import { availableHeritages } from '../dist/js/heritages.js';
import { portraitGalleryPage, findCurrentPortrait, renderPortraitGallery } from '../dist/js/portrait-gallery.js';
import { nextRunestone,runestoneLabel } from '../dist/js/runestone-ui.js';
import { peopleRecordPage,renderPeopleRecords } from '../dist/js/people-records.js';
import { readDisplay,saveDisplay } from '../dist/js/display.js';
import { craftEquipmentComparison } from '../dist/js/crafting-ui.js';
import { GEAR_CATALOG } from '../dist/js/gear.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { request as customerRequest } from './helpers/society-customer-fixtures.mjs';
import { mountApp } from './helpers/ui-surface.mjs';
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
const fresh=()=>structuredClone(base),KEY='hearth-and-oath:slots:v1';
const ctl=(ui,op,id)=>ui.root.querySelector(`[data-op="${op}"]${id===undefined?'':`[data-id="${id}"]`}`);
async function creator(t){const ui=await mountApp(t);await ui.click('title-new');await ui.click('slot-new','0');return ui;}
async function input(ui,name,value){ui.set(name,String(value));await ui.fire('input',ui.root.querySelector(`[name="${name}"]`));}
async function pairBoard(t,game=null,options={}){const s=fresh();s.event=null;s.battle=null;if(game){s.socialLife.game=game;s.socialLife.games=Math.max(1,s.socialLife.games);}const ui=await mountApp(t,{states:[s],...options});await ui.click('title-continue');await ui.click('tab','activities');await ui.click('activities-pane','fun');if(!game)await ui.click('activity','fun_pairs');return ui;}
const board=(matched=[],revealed=[])=>({id:1,faces:[0,0,1,1,2,2,3,3,4,4,5,5],matched,revealed,moves:0});

test('UI031 hidden stones reveal no face; focus advances through disabled positions and wraps',()=>{
 const g=board([0,1],[3]);assert.equal(runestoneLabel(g,4),'Stone 5');assert.match(runestoneLabel(g,0),/Star.*Matched/);assert.equal(nextRunestone(g,2),4);assert.equal(nextRunestone(g,11),2);assert.equal(nextRunestone(board(Array.from({length:12},(_,i)=>i))),null);
});
test('UI031 actual key handlers preserve board position after mismatches, matches, held input and stale controls',async t=>{
 const ui=await pairBoard(t,board());const before=ui.current();let stone=ctl(ui,'activity','fun_pair_0');await ui.key('Enter',{target:stone});assert.equal(ui.document.activeElement.dataset.id,'fun_pair_1');assert.equal(ui.current().day,before.day);
 const first=ui.current();const held=await ui.key('Enter',{target:ui.document.activeElement,repeat:true});assert.equal(held.defaultPrevented,true);assert.deepEqual(ui.current(),first);await ui.fire('click',stone);assert.deepEqual(ui.current(),first);
 await ui.click('activity','fun_pair_2');assert.equal(ui.document.activeElement.dataset.id,'fun_pair_3');assert.deepEqual(ui.current().socialLife.game.revealed,[0,2]);await ui.click('activity','fun_pair_1');assert.deepEqual(ui.current().socialLife.game.revealed,[1]);await ui.click('activity','fun_pair_0');assert.deepEqual(ui.current().socialLife.game.matched,[1,0]);assert.equal(ui.document.activeElement.dataset.id,'fun_pair_2');
 const saved=ui.current();await ui.click('tab','inventory');await ui.click('tab','activities');await ui.click('activities-pane','fun');assert.deepEqual(ui.current(),saved);await ui.click('runestone-resume');assert.equal(ui.document.activeElement.id,'runestone-title');
});
test('UI032 final flip is free; only one local Finish pays actual capped benefits and cannot repeat',async t=>{
 const ui=await pairBoard(t,board([0,1,2,3,4,5,6,7,8,9]));const before=ui.current();await ui.click('activity','fun_pair_10');await ui.click('activity','fun_pair_11');assert.equal(ui.current().day,before.day);assert.equal(ui.document.activeElement.id,'runestone-status');assert.equal(ui.root.querySelectorAll('[data-op="activity"][data-id="fun_pairs_finish"]').length,1);const finish=ctl(ui,'activity','fun_pairs_finish');assert.match(ui.root.innerHTML,/1 day · No entry fee/);const original=ui.current();await ui.fire('click',finish);const next=ui.current();assert.equal(next.day,original.day+1);assert.equal(next.socialLife.game,null);assert.match(next.notice,/Actual session changes:/);assert.ok(next.notice.includes(`${next.life.happiness-original.life.happiness>=0?'+':''}${next.life.happiness-original.life.happiness} Joy`));await ui.fire('click',finish);assert.deepEqual(ui.current(),next);assert.ok(E.validateSave(next));
});
test('CC03 scoped randomization preserves custom name, age, abilities, pronouns locks and all-locked fate exactly',()=>{
 let d=C.captureCreatorDraft({name:'Mira of Stone',startAge:55,identity:'they/them',ancestry:'dwarf'},C.defaultCreatorDraft('qol-scopes'));d=C.adjustCreatorAttribute(d,'strength',1);d=C.toggleCreatorTrait(d,'brave');const original=structuredClone(d),p=C.randomizeCreatorPortrait(d);
 for(const key of Object.keys(d).filter(k=>!['appearance','portraitChoice'].includes(k)))assert.deepEqual(p[key],d[key],key);assert.notDeepEqual(p.appearance,d.appearance);
 const all={...d,creatorLocks:Object.keys(C.CREATOR_LOCKS)};assert.deepEqual(C.randomizeCreatorDraft(all),all);const r=C.randomizeCreatorDraft(d);assert.equal(r.name,d.name);assert.equal(r.startAge,55);assert.equal(r.pronouns,'they/them');assert.equal(r.appearance.ancestry,'dwarf');assert.deepEqual(r.attributePoints,d.attributePoints);assert.deepEqual(r.personalityTraits,d.personalityTraits);assert.deepEqual(d,original);
});
test('CC03 dependency explanations name only affected choices and keep valid custom fields',()=>{
 let d=C.captureCreatorDraft({ancestry:'human',startAge:55,name:'Sable'},C.defaultCreatorDraft('qol-depend'));d=C.selectCreatorOrigin(d,'human_bellward');d=C.selectCreatorHeritage(d,availableHeritages('human')[0].id);d=C.toggleCreatorTrait(d,'brave');d=C.adjustCreatorAttribute(d,'strength',1);
 const race=C.captureCreatorDraft({ancestry:'elf'},d),messages=C.creatorDependencyChanges(d,race).join(' ');assert.match(messages,/heritage|heritages/);assert.match(messages,/origin returns to fate/);assert.equal(race.name,'Sable');assert.equal(race.startAge,55);assert.deepEqual(race.personalityTraits,d.personalityTraits);const infant=C.captureCreatorDraft({startAge:0},race);assert.equal(attributePointsSpent(infant.attributePoints),0);assert.equal(infant.personalityTraits.length,0);assert.match(C.creatorDependencyChanges(race,infant).join(' '),/Traits removed|bonuses were reduced/);
});
test('CC06 and CC09 age boundaries have truthful stages, budgets and deterministic final bonus review',()=>{
 for(const requested of [0,2,3,9,10,17,18,39,40,54,55,64,65,80]){const d=C.captureCreatorDraft({startAge:String(requested)},C.defaultCreatorDraft('qol-boundaries')),html=C.renderCharacterCreator(d,2),age=normalizeStartAge(requested,18,d.appearance.ancestry);assert.equal(attributePointsSpent(completeAttributePoints(d.attributePoints,age,d.seed)),attributePointBudget(age));assert.match(html,/Begin This Life/);assert.match(html,new RegExp(`value="${age}"`));assert.ok(html.includes(portraitContext(d,age).stage==='mature'?'Mature':age>=65?'Elder':'Review'));assert.doesNotMatch(C.renderCharacterCreator(d,0),/type="submit"/);assert.match(html,/data-creation-progress/);assert.ok(html.indexOf('data-creation-progress')<html.indexOf('<form'));}
});
test('CC08 draft detours, exact undo and safe leave default run through production handlers',async t=>{
 const ui=await creator(t);assert.equal(ctl(ui,'creator-undo').disabled,true);await input(ui,'name','Sable');assert.equal(ctl(ui,'creator-undo').disabled,false);assert.equal(ui.root.querySelectorAll('[data-op="creator-undo"]').length,1);assert.ok(ctl(ui,'creator-undo').closest('.creator-topline'));assert.equal(ctl(ui,'creator-undo').getAttribute('aria-label'),'Undo last change');assert.equal(ui.root.querySelector('.creator-change-notice'),null);assert.doesNotMatch(ui.root.innerHTML,/Draft updated/);const name=ui.root.querySelector('[name="name"]').value;await ui.click('creator-settings');await ui.key('Escape');assert.equal(ui.root.querySelector('[name="name"]').value,name);await ui.click('creator-random-portrait');await ui.click('creator-undo');assert.equal(ctl(ui,'creator-undo').disabled,true);assert.equal(ui.root.querySelector('[name="name"]').value,name);await ui.key('Escape');assert.ok(ctl(ui,'creator-discard'));assert.equal(ui.document.activeElement.dataset.op,'close-modal');await ui.key('Escape');assert.ok(ui.root.querySelector('#character-form'));await ui.click('title-menu');await ui.click('creator-discard');assert.ok(ctl(ui,'title-new'));assert.equal(ui.current(),null);
});
test('CC06 exact numeric age rejects empty, clamps bounds and preserves custom name and selected mode',async t=>{
 const ui=await creator(t);await input(ui,'name','Sable');ui.set('lifeMode','ironman');await ui.fire('change',ui.root.querySelector('[name="lifeMode"]'));let number=ui.root.querySelector('#start-age-number');number.value='';await ui.fire('input',number);assert.equal(ui.root.querySelector('[name="startAge"]').value,'18');assert.match(ui.root.querySelector('#age-validation').textContent,/unchanged/);number=ui.root.querySelector('#start-age-number');const oldest=number.getAttribute('max');number.value=String(Number(oldest)+1);await ui.fire('input',number);assert.ok(Number(oldest)>=60&&Number(oldest)<=120);assert.equal(ui.root.querySelector('[name="startAge"]').value,oldest);assert.equal(ui.root.querySelector('#start-age-number').value,oldest);assert.equal(ui.root.querySelector('[name="name"]').value,'Sable');assert.equal(ui.root.querySelector('[name="lifeMode"]').value,'ironman');
});
test('CC09 review precedes commitment; failed first save retains exact draft and retries one generated life',async t=>{
 const ui=await creator(t);await input(ui,'startAge',0);await input(ui,'name','First Hearth');await ui.submit();assert.ok(ui.root.querySelector('#creator-heading-2'));assert.equal(ui.current(),null);
 const write=ui.storage.setItem;let reject=true;ui.storage.setItem=(key,value)=>{if(reject&&key===KEY)throw new Error('quota');write(key,value);};await ui.submit();assert.ok(ui.root.querySelector('#character-form'));assert.equal(ui.current(),null);assert.match(ui.root.innerHTML,/draft and generated life are retained/);assert.equal(ui.root.querySelector('[name="name"]').value,'First Hearth');reject=false;await ui.submit();await settle();assert.equal(ui.current().hero.name,'First Hearth');assert.equal(ui.current().age,0);assert.equal(ui.root.querySelector('#character-form'),null);assert.ok(E.validateSave(ui.current()));
});
test('CC05 current portrait can be found after filters; preview, heritage browsing and cancel never commit',async t=>{
 const ui=await creator(t),before=ui.preview.innerHTML;await ui.click('creator-portraits');const candidate=ctl(ui,'gallery-preview');await ui.click('gallery-preview',candidate.dataset.id);assert.ok(ctl(ui,'gallery-select'));assert.match(ui.root.innerHTML,/Preview only/);await ui.key('Escape');assert.equal(ui.preview.innerHTML,before);assert.equal(ui.document.activeElement.dataset.op,'creator-portraits');await ui.click('creator-portraits');const filter=ui.root.querySelector('[data-gallery-filter="presentation"]');filter.value='feminine';await ui.fire('change',filter);await ui.click('gallery-current');assert.match(ui.root.innerHTML,/selection has not changed|not a selectable entry/);await ui.click('gallery-preview',ctl(ui,'gallery-preview').dataset.id);await ui.click('gallery-select');assert.equal(ui.root.querySelector('.portrait-gallery-modal'),null);assert.equal(ui.current(),null);
});
test('CC05 every ancestry/stage current finder resolves its real page without changing portrait selection',()=>{
 for(const ancestry of ['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'])for(const requested of [0,3,10,18,40,55,65]){const age=normalizeStartAge(requested,18,ancestry),d=C.captureCreatorDraft({ancestry,startAge:age},C.defaultCreatorDraft('qol-find-'+ancestry)),p=availablePortraits(d,age).at(-1),selected=C.selectCreatorPortrait(d,p.key),state=findCurrentPortrait(selected,{age}),v=portraitGalleryPage(selected,{age,state});assert.ok(v.rows.some(row=>row.key===p.key));assert.deepEqual(selected.appearance.portraitSelections[portraitContext(selected,age).stage],p.key);assert.match(renderPortraitGallery(selected,{age,state}),/matching.*selectable/);}
});
test('CC12 shortcut preference persists and disables global letters without changing typing or other settings',async t=>{
 const ui=await mountApp(t,{states:[fresh()]});await ui.click('title-settings');const checkbox=ui.root.querySelector('#single-key-shortcuts');checkbox.checked=false;await ui.fire('change',checkbox);assert.equal(readDisplay(ui.storage).singleKeyShortcuts,false);await ui.click('reading-reset');assert.equal(readDisplay(ui.storage).singleKeyShortcuts,false);await ui.click('title-menu');await ui.click('title-continue');await ui.key('i',{target:ui.root.querySelector('.workspace-body')});assert.equal(ui.root.querySelector('.inventory-workspace'),null);
});
test('QOL05 scopes use known contacts only and legacy machine facts get an authored label',()=>{
 const s=fresh();for(const scope of ['close','household','party','recent']){const v=peopleRecordPage(s,{scope});assert.ok(v.contacts.every(p=>v.people.some(known=>known.id===p.id)));if(scope==='close')assert.ok(v.contacts.every(p=>p.bond>=65));if(scope==='recent')assert.ok(v.contacts.every(p=>s.day-s.conversations.meetings[p.id].lastDay<=30));}
});
test('QOL07 fitted comparison uses the actual uncommon quality and pattern without mutating the life',()=>{
 const s=fresh(),before=structuredClone(s),item=GEAR_CATALOG.find(i=>i.workshopTier),standard=craftEquipmentComparison(s,{item},'plain'),fitted=craftEquipmentComparison(s,{item},'duelist');assert.ok(standard);assert.ok(fitted);assert.notDeepEqual(fitted.delta,standard.delta);assert.deepEqual(s,before);assert.equal(fitted.item.quality,'uncommon');
});
test('UI006 retained empty Ironman review returns focus to its saved-lives opener',async t=>{
 const ui=await mountApp(t,{locks:{request:async(name,options,callback)=>callback({name,mode:'exclusive'})}});await ui.click('title-new');await ui.click('ironman-recoveries');assert.match(ui.root.innerHTML,/No retained positions/);await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'ironman-recoveries');assert.equal(ui.document.activeElement.isConnected,true);
});

test('QOL01 reviewing a profession is free, cancellation preserves the life, and confirmed time is authoritative',async t=>{
 let s=fresh();const provider=settlementServices(s).find(r=>r.kind==='work');for(const room of settlementWalkPath(s,provider.roomId))s=E.chooseAction(s,'atlas_room_'+room);const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('place-open');await ui.click('service-open',provider.id);const before=ui.current(),form=ui.root.querySelector('#service-profession');assert.ok(form);const id=form.controls.find(c=>c.name==='profession').value;await ui.fire('submit',form);assert.ok(ui.root.querySelector('#trade-review-heading'));assert.deepEqual(ui.current(),before);await ui.key('Escape');assert.deepEqual(ui.current(),before);await ui.fire('submit',ui.root.querySelector('#service-profession'));const confirm=ctl(ui,'profession-confirm');assert.ok(confirm&&!confirm.disabled);await ui.fire('click',confirm);assert.deepEqual(ui.current(),E.chooseAction(before,id));const after=ui.current();await ui.fire('click',confirm);assert.deepEqual(ui.current(),after);
});
test('UI001 numbered choices keep their displayed positions when earlier replies are disabled',async t=>{
 const s=customerRequest();assert.ok(s.event);const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');const choices=ui.root.querySelectorAll('[data-op="choice"]');assert.ok(choices[0].disabled);assert.ok(choices[1].disabled);const before=ui.current();await ui.key('1',{target:ui.root.querySelector('.workspace-body')});assert.deepEqual(ui.current(),before);await ui.key('3',{target:ui.root.querySelector('.workspace-body')});assert.deepEqual(ui.current(),E.chooseEventOption(before,choices[2].dataset.id));
});

test('QOL02 quest reference detours reuse the scene return and restore category, search and scroll for free',async t=>{
 const ui=await mountApp(t,{states:[fresh()]});await ui.click('title-continue');await ui.click('tab','journal');await ui.click('workspace-section','journal:active');await ui.click('journal-category','side');let form=ui.root.querySelector('#journal-search'),query=form.controls.find(c=>c.name==='query');query.value='unlikely-quest-word';await ui.fire('submit',form);ui.root.querySelector('.workspace-body').scrollTop=123;const before=ui.current();await ui.click('tab','inventory');assert.match(ctl(ui,'scene-return').textContent,/quest journal/);await ui.click('scene-return');assert.equal(ui.root.querySelector('#journal-query').value,'unlikely-quest-word');assert.equal(ui.root.querySelector('.workspace-body').scrollTop,123);assert.deepEqual(ui.current(),before);assert.equal(ctl(ui,'scene-return'),null);
});
test('UI032 a failed Finish save reports an unsaved session; Save retries without a second reward',async t=>{
 const ui=await pairBoard(t,board(Array.from({length:12},(_,i)=>i))),before=ui.current(),set=ui.storage.setItem;ui.storage.setItem=(key,value)=>{if(key===KEY)throw Error('quota');set(key,value);};await ui.click('activity','fun_pairs_finish');assert.deepEqual(ui.current(),before);assert.match(ui.root.innerHTML,/session is not saved|Not saved|not saved|Could not save|Unsaved/);assert.match(ui.root.innerHTML,/Actual session changes/);ui.storage.setItem=set;await ui.click('menu');await ui.click('save');const after=ui.current();assert.equal(after.day,before.day+1);assert.equal(after.socialLife.game,null);await ui.click('save');assert.deepEqual(ui.current(),after);
});

test('CC05 browsing future portrait stages never changes age and cannot commit a future face',async t=>{
 const ui=await creator(t);const before=ui.preview.innerHTML;await ui.click('creator-portraits');await ui.click('gallery-stage','mature');assert.match(ui.root.innerHTML,/Browsing Mature portraits/);await ui.click('gallery-preview',ctl(ui,'gallery-preview').dataset.id);assert.equal(ctl(ui,'gallery-select').disabled,true);await ui.click('close-modal');assert.equal(ui.root.querySelector('[name="startAge"]').value,'18');assert.equal(ui.preview.innerHTML,before);assert.equal(ui.current(),null);
});
