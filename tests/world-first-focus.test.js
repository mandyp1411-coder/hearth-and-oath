import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { getContacts, rememberedContacts } from '../dist/js/conversations.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { equipmentDropReason } from '../dist/js/inventory-drag.js';
import { ownedGear, projectedEquipment } from '../dist/js/gear.js';
import { bondCategory } from '../dist/js/people-records.js';
import { activeJournalQuests } from '../dist/js/journal-ui-v30.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { reconcileNpcContinuity, validateNpcContinuity } from '../dist/js/npc-continuity.js';
let base=await createLifeAtAge({seed:'world-first-release-thirty',startAge:22,difficulty:'gentle'});
for(let i=0;base.event&&i<100;i++)base=E.chooseEventOption(base,(base.event.choices.find(c=>['care','continue','leave','keep','pause','later'].includes(c.id)&&!c.disabledReason)||base.event.choices.find(c=>!c.disabledReason)).id);
assert.ok(E.validateSave(base));
const fresh=()=>structuredClone(base);
function walk(s,room){const path=settlementWalkPath(s,room);assert.ok(path,'real room path');for(const id of path)s=E.chooseAction(s,'atlas_room_'+id);return s;}
const stable=s=>({day:s.day,gold:s.hero.gold,hp:s.hero.hp,equipment:s.equipment,health:s.health,careers:s.careers});
async function resume(t,s=fresh()){const ui=await mountApp(t,{states:[s]});await ui.click('title-continue');return ui;}

test('service commands cannot spend time, money or treatment from the gate',()=>{
 const s=walk(fresh(),'gate');s.hero.hp-=20;const actions=E.getActions(s);for(const id of ['health_clinic','career_work']){const a=actions.find(a=>a.id===id);if(a)assert.ok(a.disabledReason);const next=E.chooseAction(s,id);assert.deepEqual(stable(next),stable(s));assert.ok(E.validateSave(next));}
});
test('doctor treatment is offered only in a real healing room and charges its real quote',()=>{
 let s=fresh();s.hero.gold=100;s.hero.hp-=25;const doctor=settlementServices(s).find(r=>r.kind==='doctor');s=walk(s,doctor.roomId);assert.ok(E.validateSave(s));const quote=E.getActions(s).find(a=>a.id==='health_clinic');assert.ok(quote&&!quote.disabledReason);const before=s;s=E.chooseAction(s,quote.id);assert.equal(s.day,before.day+quote.days);assert.ok(s.hero.hp>before.hero.hp);assert.ok(s.hero.gold<=before.hero.gold-quote.cost);assert.ok(E.validateSave(s));
});
test('approaching a named service introduces exactly that person and survives a reload',()=>{
 let s=fresh();const doctor=settlementServices(s).find(r=>r.kind==='doctor');assert.ok(!rememberedContacts(s).some(p=>p.id===doctor.personId));const wrong=E.visitService(s,doctor.id);assert.ok(!wrong.conversations.meetings?.[doctor.personId]);s=walk(s,doctor.roomId);const before={day:s.day,gold:s.hero.gold};s=E.visitService(s,doctor.id);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.gold);assert.ok(rememberedContacts(s).some(p=>p.id===doctor.personId));assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);
});
test('villages route paid work to an existing area and wild mentors remain discoverable',()=>{
 const s=fresh();const work=settlementServices(s).find(r=>r.kind==='work');assert.ok(work);assert.ok(settlementWalkPath(s,work.roomId));const wild=s.world.locations.find(l=>l.id==='forest');if(wild){const v={...s,locationId:wild.id,cartography:{...s.cartography,offsite:false,pending:null,interior:null}};assert.ok(settlementServices(v).some(r=>r.kind==='mentor'&&r.roomId==='trail'&&r.here));}
});
test('a potion restores real Health once without treating illness or spending time',()=>{
 const s=fresh();s.hero.hp-=40;s.hero.potions=1;const conditions=structuredClone(s.health);const next=E.useConsumable(s,'potions');assert.equal(next.hero.hp,s.hero.hp+30);assert.equal(next.hero.potions,0);assert.equal(next.day,s.day);assert.deepEqual(next.health,conditions);assert.deepEqual(stable(E.useConsumable(next,'potions')),stable(next));const full=fresh();full.hero.hp=full.hero.maxHp;assert.equal(E.useConsumable(full,'potions').hero.potions,full.hero.potions);assert.ok(E.validateSave(next));
});
test('Relationships splits actual lovers and enemies from friendship and ordinary rivalry',()=>{
 const s=fresh();s.age=22;s.life.partnerId='lover';assert.equal(bondCategory(s,{id:'lover',age:22,bond:80,role:'partner'}),'lovers');assert.equal(bondCategory(s,{id:'friend',age:22,bond:90,role:'friend'}),'friends');assert.equal(bondCategory(s,{id:'enemy',age:22,bond:30,role:'enemy'}),'enemies');assert.equal(bondCategory(s,{id:'rival',age:22,bond:30,role:'rival'}),'rivals');assert.equal(bondCategory(s,{id:'stranger',age:22,bond:20,role:'neighbor'}),'acquaintances');
});
test('new dialogue is snapshotted, reloadable, local and cannot farm the same daily exchange',()=>{
 let s=fresh();const p=getContacts(s).find(p=>p.locationId===s.locationId&&E.getActions(s).some(a=>a.id==='talk_'+p.id&&!a.disabledReason));assert.ok(p);s=E.chooseAction(s,'talk_'+p.id);assert.equal(s.conversations.pending.nodeId,'person_v30');assert.deepEqual(s.conversations.pending.replies.map(c=>c.id),['ask','share','tease','leave']);assert.ok(!/recorded account|bounded agreement|cast by fate/i.test(s.conversations.pending.snapshot.body));assert.ok(E.validateSave(s));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);s=E.replyMessage(s,p.id,'ask');assert.ok(E.validateSave(s));const again=E.getActions(s).find(a=>a.id==='talk_'+p.id);assert.ok(again?.disabledReason);assert.ok(s.journal.at(-1).text.includes(p.name));
});
test('older captured prose and its birthday snapshot remain exact through migration',()=>{
 const old=E.createBirthGame({seed:'old-prose-conversion'});delete old.narrativeEdition;delete old.worldServicesVersion;old.event.title='An obscure old ledger';old.event.body='The page owes a name to the door.';old.timeline.storybook.pending.scene.title=old.event.title;old.timeline.storybook.pending.scene.body=old.event.body;const before=stable(old);assert.ok(E.validateSave(old));const next=E.migrateSave(JSON.parse(JSON.stringify(old)));assert.ok(next);assert.equal(next.narrativeEdition,30);assert.equal(next.event.body,old.event.body);assert.deepEqual(next.timeline.storybook.pending.scene,old.timeline.storybook.pending.scene);assert.deepEqual(stable(next),before);assert.ok(E.validateSave(next));
});
test('active Journal excludes unaccepted offers and reading notes grants no discovery',async t=>{
 const s=fresh(),active=activeJournalQuests(s);assert.ok(active.every(q=>q.status!=='offered'));const ui=await resume(t,s);await ui.click('tab','journal');assert.deepEqual(ui.root.querySelectorAll('.workspace-sections [data-op="workspace-section"]').map(n=>n.dataset.id),['journal:active','journal:archive','journal:notes']);const before=JSON.stringify(ui.current());await ui.click('workspace-section','journal:notes');assert.equal(JSON.stringify(ui.current()),before);assert.ok(!ui.root.querySelector('[data-op="tab"][data-id="lore"]'));assert.ok(!ui.root.querySelector('[data-op="quest-category"]'));
});
test('primary navigation is the six world-first destinations and no remote profession or care launcher remains',async t=>{
 const ui=await resume(t);assert.deepEqual(ui.root.querySelectorAll('.game-rail nav [data-op="tab"]').map(n=>n.dataset.id),['life','activities','map','relationships','inventory','journal']);await ui.click('tab','activities');assert.equal(ui.root.querySelectorAll('.activity-tabs [data-op="activities-pane"]').length,6);assert.ok(!ui.root.querySelectorAll('[data-op="activity"]').some(n=>/^(health_clinic|career_|recovery_begin_|school_)/.test(n.dataset.id)));await ui.click('tab','relationships');assert.ok(ui.root.querySelector('[data-op="people-scope"][data-id="lovers"]'));assert.ok(ui.root.querySelector('[data-op="people-scope"][data-id="enemies"]'));
});
test('same workspace redraw keeps its scroll position after filtering',async t=>{
 const ui=await resume(t);await ui.click('tab','inventory');const pane=ui.root.querySelector('.workspace-body');pane.scrollTop=317;ui.root.querySelector('.game-content').scrollTop=421;await ui.click('inventory-category','equipment');assert.equal(ui.root.querySelector('.workspace-body').scrollTop,317);assert.equal(ui.root.querySelector('.game-content').scrollTop,421);await ui.click('tab','relationships');ui.root.querySelector('.workspace-body').scrollTop=159;await ui.click('people-scope','all');assert.equal(ui.root.querySelector('.workspace-body').scrollTop,159);await ui.click('tab','inventory');assert.equal(ui.root.querySelector('.workspace-body').scrollTop,317);
});
test('production service approach walks a real area and keeps other services out of its conversation',async t=>{
 const ui=await resume(t);await ui.click('tab','map');await ui.click('place-open');await ui.click('place-area','shrine');const doctor=settlementServices(ui.current()).find(r=>r.kind==='doctor');await ui.click('service-open',doctor.id);assert.ok(ui.root.querySelector('[data-service-person="'+doctor.personId+'"]'));assert.ok(ui.root.querySelector('[data-op="activity"][data-id="health_clinic"]'));assert.ok(!ui.root.querySelector('[data-op="activity"][data-id="career_work"]'));assert.ok(E.validateSave(ui.current()));
});
test('actual inventory drag equips only an owned matching item, including a recheck at release',async t=>{
 let s=fresh();s.hero.gold=500;s=walk(s,'market');const buy=E.getActions(s).find(a=>a.id.startsWith('gear_buy_')&&!a.disabledReason);assert.ok(buy);s=E.chooseAction(s,buy.id);const gear=ownedGear(s)[0];assert.ok(gear);assert.equal(equipmentDropReason(s,gear.id,gear.slot),null);assert.ok(equipmentDropReason(s,gear.id,gear.slot==='head'?'feet':'head'));const ui=await resume(t,s);await ui.click('tab','inventory');const item=ui.root.querySelector('[data-draggable-gear="'+gear.id+'"]'),slot=ui.root.querySelector('[data-equipment-slot="'+gear.slot+'"]');assert.ok(item&&slot);const data={setData(){},getData(){return gear.id;}};await ui.fire('dragstart',item,{dataTransfer:data});await ui.fire('dragover',slot,{dataTransfer:data});await ui.fire('drop',slot,{dataTransfer:data});assert.equal(projectedEquipment(ui.current())[gear.slot],gear.id);assert.ok(E.validateSave(ui.current()));const bad=ui.root.querySelector('[data-equipment-slot="'+(gear.slot==='head'?'feet':'head')+'"]'),before=JSON.stringify(ui.current());await ui.fire('dragstart',ui.root.querySelector('[data-draggable-gear="'+gear.id+'"]'),{dataTransfer:data});await ui.fire('drop',bad,{dataTransfer:data});assert.equal(JSON.stringify(ui.current()),before);
});

test('academy enrollment is offered by its own teacher before changing the active course',()=>{
 let s=fresh();const academy=settlementServices(s,{siteId:'city'}).find(r=>r.kind==='school'&&r.subjectId==='academy');assert.ok(academy);assert.equal(academy.person.locationId,'city');assert.equal(academy.person.name,s.education.teachers.academy.name);
});
test('service lists and contact previews remain read-only across repeated seasonal inspections',()=>{
 const s=fresh(),before=JSON.stringify(s);for(let n=0;n<10;n++){E.getActions(s);getContacts(s);settlementServices(s);}assert.equal(JSON.stringify(s),before);assert.ok(Object.keys(s.conversations.relationships).length<80);
});
test('a genuine old recovery commitment can resume and free recovery starts preserve their attendance terms',()=>{
 let s=fresh();s.health.recovery={title:'Earlier Recovery',locationId:s.locationId,kind:'free',totalDays:14,remainingDays:14,attendedDays:0,careDays:0,startedDay:s.day,fee:0,paid:false};assert.ok(E.validateSave(s));const before=s.day;assert.ok(E.getActions(s).some(a=>a.id==='recovery_continue'&&!a.disabledReason));s=E.chooseAction(s,'recovery_continue');assert.ok(s.day>before);assert.ok(E.validateSave(s));const clean=fresh(),offer=E.getActions(clean).find(a=>a.id==='recovery_begin_free_14');assert.ok(offer&&!offer.disabledReason);const begun=E.chooseAction(clean,offer.id);const attended=begun.day-clean.day;assert.ok(attended>0&&attended<=14);assert.equal(clean.hero.gold-begun.hero.gold,begun.householdBudget.paidGold-clean.householdBudget.paidGold);assert.ok(begun.health.history.some(h=>h.result==='plan_started'&&h.totalDays===14&&h.fee===0));if(begun.health.recovery){assert.equal(begun.health.recovery.remainingDays,14-attended);assert.equal(begun.health.recovery.attendedDays,attended);}else assert.equal(attended,14);assert.ok(E.validateSave(begun));
});

test('creation keeps the actual scrolling controls in place while adding a trait',async t=>{
 const ui=await mountApp(t);await ui.click('title-new');await ui.click('slot-new','0');await ui.click('creator-step','1');const pane=ui.root.querySelector('.creator-controls');assert.ok(pane);pane.scrollTop=289;await ui.click('trait-picker','0');await ui.click('creator-trait','brave');assert.equal(ui.root.querySelector('.creator-controls').scrollTop,289);
});

test('service replacements keep the earlier person in the relationship book across generations',()=>{
 let s=fresh();const old=settlementServices(s).find(r=>r.kind==='doctor');s=walk(s,old.roomId);s=E.visitService(s,old.id);assert.ok(E.validateSave(s));
 // Controlled detached roster-date diagnostic, not a played lifetime or a full
 // calendar-consistent save. Views remain read-only; individual dated public
 // reconciliation, not an old global epoch, owns the handover.
 const original=JSON.stringify(s),future=structuredClone(s),record=future.npcContinuity.people[old.personId],snapshot=structuredClone(record.snapshot);
 future.day=record.retireDay;reconcileNpcContinuity(future);assert.ok(validateNpcContinuity(future));
 const next=settlementServices(future).find(r=>r.kind==='doctor');assert.notEqual(next.personId,old.personId);assert.notEqual(next.name,old.name);
 const remembered=rememberedContacts(future).find(p=>p.id===old.personId);assert.ok(remembered);assert.equal(remembered.available,false);assert.ok(remembered.age<120);
 assert.equal(remembered.age,remembered.ageAtRetirement);assert.deepEqual(future.npcContinuity.people[old.personId].snapshot,snapshot);assert.equal(future.npcContinuity.people[old.personId].retiredDay,record.retireDay);
 assert.equal(JSON.stringify(s),original,'the detached diagnostic never mutates the original life or its shared sidecar');
});

test('a potion can be used between dungeon encounters without resolving or rerolling the room',()=>{
 let s=fresh();s.hero.gold=1000;s=walk(s,'market');s=E.chooseAction(s,'realm_ration');delete s.mazeBook;delete s.maze;s=E.chooseAction(s,'adventure_descend');assert.ok(s.adventuring.expedition);assert.equal(s.event.id,'adventure_room');s.hero.hp-=15;s.hero.potions=1;const event=structuredClone(s.event),run=structuredClone(s.adventuring.expedition),day=s.day;const next=E.useConsumable(s,'potions');assert.equal(next.hero.hp,s.hero.hp+15);assert.equal(next.hero.potions,0);assert.equal(next.day,day);assert.deepEqual(next.event,event);assert.deepEqual(next.adventuring.expedition,run);assert.ok(E.validateSave(next));
});
test('using a potion in Inventory keeps the inventory and its scroll while a dungeon room waits',async t=>{
 let s=fresh();s.hero.gold=1000;s=walk(s,'market');s=E.chooseAction(s,'realm_ration');delete s.mazeBook;delete s.maze;s=E.chooseAction(s,'adventure_descend');assert.equal(s.event.id,'adventure_room');s.hero.hp-=15;s.hero.potions=2;const ui=await resume(t,s);await ui.click('tab','inventory');await ui.click('inventory-item','supply:potions');ui.root.querySelector('.game-content').scrollTop=333;const event=structuredClone(ui.current().event);await ui.click('use-consumable','potions');assert.ok(ui.root.querySelector('.inventory-workspace'));assert.equal(ui.root.querySelector('.game-content').scrollTop,333);assert.deepEqual(ui.current().event,event);assert.equal(ui.current().hero.potions,1);assert.ok(E.validateSave(ui.current()));
});
test('writing a personal Note keeps the Notes screen and actual scroll pane in place',async t=>{
 const ui=await resume(t);await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');ui.root.querySelector('.game-content').scrollTop=247;const form=ui.root.querySelector('#player-note');form.querySelector('textarea').value='Look for the doctor at the Shrine. <script>no</script>';await ui.fire('submit',form);assert.ok(ui.current().playerNotes.at(-1).text.includes('<script>'));assert.equal(ui.root.querySelector('.workspace-page').dataset.workspaceSection,'notes');assert.equal(ui.root.querySelector('.game-content').scrollTop,247);assert.ok(ui.root.innerHTML.includes('&lt;script&gt;no&lt;/script&gt;'));assert.ok(E.validateSave(ui.current()));
});
