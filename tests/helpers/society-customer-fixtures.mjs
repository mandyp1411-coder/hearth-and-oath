import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../../dist/js/engine.js';
import {careerView} from '../../dist/js/careers.js';
import {settlementServices} from '../../dist/js/world-services.js';
import {settlementWalkPath} from '../../dist/js/exploration-ui.js';
import {nearbyContacts} from '../../dist/js/dialogue-ui-v22.js';
import {newTradeDraft,quoteTrade} from '../../dist/js/trading.js';
import {societyCustomerChoiceReason} from '../../dist/js/society.js';

export const clone=value=>structuredClone(value);
export function valid(s,label='customer fixture'){assert.ok(E.validateSave(s),label+': '+s?.notice);return s;}
function observed(name){const s=JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/native-v0551-civilian-'+name+'.json.gz',import.meta.url))));valid(s,'fictional observed '+name+' QA export');const read=E.migrateSave(s);
 // One rulebook (v0.72.3): the archive takes a scholar only with a grammar school certificate, so this QA
 // life carries one as controlled data, like its equipment. Every customer, commission and day stays real.
 if(read&&!read.education.qualifications.some(q=>q.route==='academy'))read.education.qualifications.push({id:'academy-certificate',label:'Academy certificate',route:'academy',schoolId:'school-academy',grade:72,day:read.day,age:Math.min(17,read.age)});
 return valid(read,'explicit current admission');}
export const fresh=()=>observed('fresh');
export const deferred=()=>observed('deferred');
export function action(s,id){assert.ok(E.getActions(s).some(a=>a.id===id&&!a.disabledReason),'real offered action '+id);return valid(E.chooseAction(s,id),id);}
export function choose(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),'real offered choice '+id);return valid(E.chooseEventOption(s,id),id);}
export function settle(s){for(let n=0;n<40;n++){
 if(s.event){assert.notEqual(s.event.id,'society_customer','do not silently answer a customer');const c=s.event.choices.find(c=>['care','continue','later','keep','wait','support','private'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);const before=JSON.stringify(s);s=choose(s,c.id);assert.notEqual(JSON.stringify(s),before,'actual decision progresses');}
 else if(s.conversations?.pending)s=valid(E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies.at(-1).id));
 else return s;
 }throw Error('Civilian fixture did not settle within40 ordinary decisions.');}
export function walk(s,room){const path=settlementWalkPath(s,room);assert.ok(path,'actual room route '+room);for(const id of path)s=action(s,'atlas_room_'+id);return s;}
let earned,prepared;
export function request(){if(!earned){let s=fresh(),work=settlementServices(s).find(r=>r.kind==='work');assert.ok(work);s=walk(s,work.roomId);s=settle(action(s,'career_choose_scholar'));assert.equal(s.hero.profession,'Scholar');
 const offer=careerView(s).commissions.find(c=>c.goodId==='annotated-lessons');assert.ok(offer,'actual offered material-free lessons commission');assert.deepEqual(offer.materials,{});s=action(s,offer.actionId);s=settle(action(s,'career_make_standard'));assert.equal(s.careers.active.status,'ready');s=action(s,'career_invoice');s=choose(s,'honest');assert.equal(s.event?.id,'society_customer');assert.equal(s.society.pending.personId,offer.societyCustomerId);earned=valid(s,'actual commission-earned customer request');}return clone(earned);}
export function preparedRequest(){if(!prepared){let s=choose(request(),'prepare');s=settle(s);s=walk(s,'market');s=settle(action(s,'career_buy_wood'));assert.equal(s.equipment.materials.wood,3,'three wood actually bought, not granted');const p=s.society.people.find(p=>p.requestDeferred&&p.role==='customer');assert.ok(p);s=action(s,'society_revisit_'+p.id);prepared=valid(s,'actual purchased supplies and named revisit');}return clone(prepared);}
export function legacyGenericRequest(state=request()){const s=clone(state);
 // Controlled compatibility-format fixture, NOT an observed failure snapshot.
 // The genuine earned request/person is retained; only its captured prose is
 // set to the exact generic v0.55.1 format observed in native QA.
 s.event.title='At Work in the Settlement';s.event.body='Someone whose work connects with yours has stopped to speak. Decide what help or paid work you are willing to offer.';
 const labels={repair:'Help repair the work',teach:'Teach what you know',prepare:'Return after preparing',decline:'Say you cannot take this on'};
 for(const c of s.event.choices){c.label=labels[c.id];c.description=c.id==='decline'?'No cost or invented work.':'Choose this action.';}
 return valid(s,'controlled old generic prose over actual earned request');
}

// Shared, narrowly scoped semantic-handler exercise for the source shell and
// compiled shell. The starting state is the unchanged fictional native export
// AFTER deferral, not an invented missing-materials or failed-click snapshot.
// Every played transition below clicks an exact, current, rendered control.
export async function deferredCustomerUi(h,finish='continue'){
 assert.ok(['continue','cancel'].includes(finish));
 const current=()=>clone(h.ui.current()),root=h.ui.root,start=current();
 const customer=start.society.people.find(p=>p.role==='customer'&&p.requestDeferred),id=customer?.id;
 assert.ok(id);assert.equal(start.event,null);assert.equal(start.society.pending,null);assert.equal(start.society.project,null);assert.equal(start.equipment.materials.wood,0);
 const other=nearbyContacts(start).find(p=>p.id!==id);assert.ok(other,'an actual unrelated nearby person');
 await h.meet(other.id);assert.equal(root.querySelector('[data-deferred-person-plan]'),null,'another person does not inherit the plan');assert.deepEqual(current(),start,'meeting previews are read-only');
 await h.meet(id);let panel=root.querySelector(`.dialogue-scene[data-contact-id="${id}"]`),plan=panel?.querySelector('[data-deferred-person-plan]');
 assert.ok(plan);assert.equal(plan.closest('details'),null,'the plan is not hidden in collapsed extras');assert.equal(plan.querySelector('h3').textContent,'Your unfinished plan');
 const offered=E.getActions(start).find(a=>a.id==='society_revisit_'+id);assert.ok(offered&&!offered.disabledReason);assert.ok(plan.textContent.includes(offered.label));assert.ok(plan.textContent.includes(offered.description));assert.deepEqual(current(),start,'rendering the offer has no simulation effect');
 const staleReturn=await h.click(plan,'activity',offered.id),opened=current();
 assert.deepEqual(opened,E.chooseAction(start,offered.id),'visible return matches the existing source action');assert.equal(opened.society.pending.personId,id);assert.equal(opened.day,start.day);assert.equal(opened.hero.gold,start.hero.gold);assert.deepEqual(opened.equipment,start.equipment);assert.deepEqual(opened.hero.skills,start.hero.skills);
 const captured=clone(opened.event),journal=clone(opened.journal);await h.nav('inventory');await h.nav('life');assert.deepEqual(current().event,captured,'navigation preserves literal captured event');assert.deepEqual(current().journal,journal);
 let scene=root.querySelector('.story-scene'),teach=scene?.querySelector('[data-op="choice"][data-id="teach"]'),reason=societyCustomerChoiceReason(opened,opened.event.id,'teach');assert.ok(teach?.disabled);assert.match(reason,/1 wood/);assert.equal(teach.querySelector('.disabled-reason').textContent,reason);assert.ok(scene.querySelector('[data-society-customer-context]').textContent.includes(customer.name));assert.match(teach.textContent,/Reserve 12 gold and 1 wood; commit 4 actual days/);
 const stalePrepare=await h.click(scene,'choice','prepare'),prepared=current();assert.deepEqual(prepared,E.chooseEventOption(opened,'prepare'));assert.equal(prepared.society.pending,null);assert.equal(prepared.society.project,null);assert.equal(prepared.day,start.day);assert.equal(prepared.hero.gold,start.hero.gold);assert.deepEqual(prepared.equipment,start.equipment);
 await h.ui.fire('click',staleReturn);await h.ui.fire('click',stalePrepare);assert.deepEqual(current(),prepared,'detached return and prepare controls cannot repeat');h.persisted();

 // Use the actual Map -> Market -> Materials Merchant -> barter surface, not
 // career_buy_wood or a synthetic activity click. The quote and real one-day
 // collection are compared with the same production trade APIs.
 await h.nav('map');await h.click(root.querySelector('.journey-destination'),'place-open');const beforeWalk=current(),walked=walk(beforeWalk,'market');await h.click(root.querySelector('.place-areas'),'place-area','market');assert.deepEqual(current(),walked,'visible Market route follows the real walk path');
 const merchant=settlementServices(current()).find(r=>r.kind==='materials'&&r.here);assert.ok(merchant);const preVisit=current();await h.click(root.querySelector('.local-service-list'),'service-open',merchant.id);assert.deepEqual(current(),E.visitService(preVisit,merchant.id),'real visit may record a meeting and clear the notice');
 const beforeTrade=current();await h.click(root.querySelector('.merchant-meeting .interaction-options'),'shop-browse');await h.click(root.querySelector('.trade-item-grid[aria-label="Shopkeeper Stock"]'),'shop-item','buy:material:wood');assert.equal(root.querySelector('#trade-item-heading').textContent,'Timber Bundle');await h.click(root.querySelector('.trade-inspector'),'shop-add','buy:material:wood');
 const draft=newTradeDraft(beforeTrade,'materials');draft.buy=[{id:'material:wood',quantity:1}];const quote=quoteTrade(beforeTrade,draft);assert.equal(quote.disabledReason,null);assert.equal(quote.days,1);assert.ok(root.querySelector('.trade-totals').textContent.includes(String(quote.goldDue)+' Gold'));assert.deepEqual(current(),beforeTrade,'browsing, inspecting and offering goods are read-only');
 const staleTrade=await h.click(root.querySelector('.trade-confirm'),'shop-confirm',''),bought=current();assert.deepEqual(bought,E.completeTrade(beforeTrade,quote),'real barter matches source including collection and household costs');assert.equal(bought.day,beforeTrade.day+1);assert.equal(bought.equipment.materials.wood,3,'three wood really bought');assert.ok(bought.hero.gold<=beforeTrade.hero.gold-quote.goldDue,'the quoted price is paid, not granted');
 // Ordinary interruptions, if generated by the real elapsed day, are answered
 // through their visible current choices. Never silently consume a customer.
 for(let n=0;n<40&&(current().event||current().conversations?.pending);n++){
  const before=current();await h.nav('life');
  if(before.event){assert.notEqual(before.event.id,'society_customer','do not silently decide another customer');const c=before.event.choices.find(c=>['care','continue','later','keep','wait','support','private'].includes(c.id)&&!c.disabledReason)||before.event.choices.find(c=>!c.disabledReason);assert.ok(c);await h.click(root.querySelector('.story-scene'),'choice',c.id);assert.deepEqual(current(),E.chooseEventOption(before,c.id));}
  else {const p=before.conversations.pending,c=p.replies.at(-1);await h.click(root.querySelector(`.dialogue-scene[data-contact-id="${p.personId}"]`),'reply',c.id);assert.deepEqual(current(),E.replyMessage(before,p.personId,c.id));}
 }
 assert.equal(current().event,null);assert.equal(current().conversations?.pending,null);
 await h.meet(id);const beforeStaleTrade=current();await h.ui.fire('click',staleTrade);assert.deepEqual(current(),beforeStaleTrade,'a detached trade control cannot purchase again');
 panel=root.querySelector(`.dialogue-scene[data-contact-id="${id}"]`);plan=panel?.querySelector('[data-deferred-person-plan]');assert.ok(plan,'the same exact customer still offers the unfinished plan');const beforeRevisit=current();await h.click(plan,'activity','society_revisit_'+id);const funded=current();assert.deepEqual(funded,E.chooseAction(beforeRevisit,'society_revisit_'+id));assert.equal(funded.society.pending.personId,id);
 scene=root.querySelector('.story-scene');teach=scene?.querySelector('[data-op="choice"][data-id="teach"]');assert.ok(teach&&!teach.disabled);assert.match(teach.textContent,/Reserve 12 gold and 1 wood; commit 4 actual days/);assert.equal(teach.querySelector('.disabled-reason'),null);
 const staleTeach=await h.click(scene,'choice','teach'),reserved=current();assert.deepEqual(reserved,E.chooseEventOption(funded,'teach'));assert.equal(reserved.society.project.personId,id);assert.equal(reserved.society.project.totalDays,4);assert.equal(reserved.society.project.completedDays,0);assert.equal(reserved.society.project.remainingDays,4);assert.equal(reserved.day,funded.day);assert.equal(reserved.hero.gold,funded.hero.gold-12);assert.equal(reserved.equipment.materials.wood,funded.equipment.materials.wood-1);assert.deepEqual(reserved.hero.skills,funded.hero.skills);assert.deepEqual(reserved.society.people.find(p=>p.id===id).knownFacts,funded.society.people.find(p=>p.id===id).knownFacts);
 await h.nav('life');let ongoing=root.querySelector('.ongoing-activity');assert.ok(ongoing);assert.ok(ongoing.textContent.includes(customer.name));assert.match(ongoing.textContent,/4 days remain/);for(const op of ['society_continue','society_cancel']){const button=ongoing.querySelector(`[data-op="activity"][data-id="${op}"]`);assert.ok(button&&!button.disabled,'visible current '+op);}
 assert.match(ongoing.querySelector('[data-id="society_continue"]').textContent,/reserved once; no additional upfront payment/);assert.match(ongoing.querySelector('[data-id="society_cancel"]').textContent,/no wage, refund or finished enterprise/);await h.ui.fire('click',staleTeach);assert.deepEqual(current(),reserved,'a detached Teach cannot reserve twice');h.persisted();
 const beforeFinish=current(),finishId='society_'+finish,staleFinish=await h.click(ongoing,'activity',finishId),finished=current();assert.deepEqual(finished,E.chooseAction(beforeFinish,finishId));assert.equal(finished.society.project,null);assert.equal(finished.equipment.materials.wood,reserved.equipment.materials.wood,'reserved materials are not charged again or refunded');
 if(finish==='continue'){assert.equal(finished.day,reserved.day+4);assert.ok(finished.society.people.find(p=>p.id===id).knownFacts.includes('shared_methods'));assert.ok(finished.society.history.at(-1).text.includes('4 actual days, 12 gold, and 1 wood'));}
 else {assert.equal(finished.day,reserved.day);assert.equal(finished.hero.gold,reserved.hero.gold,'cancel grants no wage or refund');assert.deepEqual(finished.hero.skills,reserved.hero.skills);assert.ok(!finished.society.people.find(p=>p.id===id).knownFacts.includes('shared_methods'));assert.match(finished.society.history.at(-1).text,/reserved supplies stay consumed/);}
 await h.ui.fire('click',staleFinish);assert.deepEqual(current(),finished,'a detached completion/cancel control cannot repeat');h.persisted();return finished;
}
