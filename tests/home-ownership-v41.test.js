import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {applyLifeAction} from '../dist/js/life.js';
import {HOME_DEFINITIONS,homePurchasePreview,homePurchaseReason} from '../dist/js/home-ownership.js';
import {syncCartography} from '../dist/js/cartography.js';
import {settlementWalkPath} from '../dist/js/exploration-ui.js';
import {buildingBenefits,applyWorkshopAction,workshopActions} from '../dist/js/workshop.js';
import {householdCostPreview} from '../dist/js/budget.js';
import {mountApp} from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
function walk(s,to){for(const room of settlementWalkPath(s,to))s=E.chooseAction(s,'atlas_room_'+room);return valid(s);}
function base(tier='lodgings',address='city'){let s=structuredClone(fixture.states.base);s.hero.gold=10000;s.locationId='city';s.cartography.interior=null;s.life.home={tier,source:'purchase',locationId:address};syncCartography(s);s=E.migrateSave(s);assert.ok(s,'normalize the controlled historical position once');return walk(s,'homes');}
const stable=s=>({...s,notice:''});
const building=(locationId,type='cottage',condition='sound')=>({id:locationId+'_'+type,type,locationId,level:1,completedDay:0,condition});
const quiet={journal(){}};

test('single-home tier matrix is global, including old saves without ownership metadata',()=>{
 const order=['lodgings','cottage','townhouse','estate'];
 for(const tier of order)for(const address of ['city','home',null]){
  const s=base(tier,address||'city');if(address===null)s.life.home={tier};valid(s);
  for(const target of Object.keys(HOME_DEFINITIONS)){
   const allowed=order.indexOf(target)>order.indexOf(tier),offer=E.getActions(s).find(a=>a.id==='life_home_'+target);
   assert.equal(!!offer&&!offer.disabledReason,allowed,`${tier} → ${target} at ${address}`);
   if(!allowed){assert.deepEqual(stable(E.chooseAction(s,'life_home_'+target)),stable(s));const copy=structuredClone(s);assert.equal(applyLifeAction(copy,'life_home_'+target,quiet),false);assert.deepEqual(copy,s);}
  }
 }
});
test('purchase and upward upgrades charge once, keep family and belongings, and survive reload',()=>{
 let s=base();
 for(const tier of ['cottage','townhouse','estate']){
  const before=structuredClone(s),q=homePurchasePreview(s,tier);s=valid(E.chooseAction(s,'life_home_'+tier));
  assert.equal(s.life.home.tier,tier);assert.equal(s.life.home.locationId,'city');assert.equal(s.day,before.day+q.days);
  assert.equal(s.hero.gold,before.hero.gold-q.cost);
  assert.ok(s.householdBudget.accruedUnits>=before.householdBudget.accruedUnits,'ordinary costs still accrue during the move');
  assert.deepEqual(s.equipment,before.equipment);assert.deepEqual(s.life.children,before.life.children);assert.equal(s.life.partnerId,before.life.partnerId);assert.deepEqual(s.family.members,before.family.members);assert.equal(s.family.housing,'secure');
  assert.deepEqual(E.migrateSave(s),s);assert.deepEqual(stable(E.chooseAction(s,'life_home_'+tier)),stable(s));
 }
});
test('cross-town upgrade states the actual move and leaves retained buildings intact',()=>{
 const s=base('cottage','home');s.life.home.source='construction';s.workshop.structures=[building('home'),building('brook')];valid(s);
 const q=homePurchasePreview(s,'townhouse');assert.equal(q.from,'Cottage');assert.equal(q.to,'Townhouse');assert.notEqual(q.fromPlace,q.toPlace);
 const n=valid(E.chooseAction(s,q.actionId));assert.deepEqual(n.workshop.structures,s.workshop.structures);assert.equal(n.life.home.locationId,'city');assert.equal(n.life.home.tier,'townhouse');assert.equal(buildingBenefits(n,'home').cottage,true);assert.deepEqual(E.migrateSave(n),n);
});
test('old multi-cottage saves are not rewritten or rejected and cannot acquire a new cottage',()=>{
 for(const tier of ['lodgings','cottage','townhouse']){
  const s=base(tier);s.workshop.structures=[building('home'),building('brook','cottage','damaged')];valid(s);assert.deepEqual(E.migrateSave(s),s);assert.ok(homePurchaseReason(s,'cottage'));
  const before=structuredClone(s);assert.deepEqual(stable(E.chooseAction(s,'life_home_cottage')),stable(before));
  const build=workshopActions(s).find(a=>a.id==='workshop_build_cottage');assert.match(build.disabledReason,/already own a home/);
 }
});
test('first construction remains possible, but existing ownership and pending cottage block a second home',()=>{
 const s=base();s.workshop.structures=[building('city','shelter')];Object.keys(s.equipment.materials).forEach(k=>s.equipment.materials[k]=100);
 assert.equal(workshopActions(s).find(a=>a.id==='workshop_build_cottage').disabledReason,undefined);
 s.hero.gold-=38;assert.equal(applyWorkshopAction(s,'workshop_build_cottage',{spendDays:()=>0}),true);assert.ok(s.workshop.project);assert.match(homePurchaseReason(s,'townhouse'),/current cottage project/);
 assert.deepEqual(stable(E.chooseAction(s,'life_home_townhouse')),stable(s));
 // Paid historic work remains finishable, even if an old save already owns more.
 s.life.home={tier:'estate',source:'purchase',locationId:'home'};const gold=s.hero.gold,project=structuredClone(s.workshop.project);
 assert.equal(applyWorkshopAction(s,'workshop_continue',{spendDays:n=>{s.day+=n;return n;},journal(){}}),true);
 assert.equal(s.hero.gold,gold);assert.equal(s.life.home.tier,'estate');assert.equal(s.workshop.project,null);assert.ok(s.workshop.structures.find(b=>b.type==='cottage'));assert.equal(s.day,project.startedDay+project.totalDays);
});
test('damaged historic cottages remain repairable without replacing a higher home',()=>{
 const s=base('estate','home');s.workshop.structures=[building('city','cottage','damaged')];Object.keys(s.equipment.materials).forEach(k=>s.equipment.materials[k]=100);
 assert.equal(workshopActions(s).find(a=>a.id==='workshop_repair_cottage').disabledReason,undefined);
 const home=structuredClone(s.life.home);s.hero.gold-=6;applyWorkshopAction(s,'workshop_repair_cottage',{spendDays:n=>{s.day+=n;return n;},journal(){}});assert.deepEqual(s.life.home,home);assert.equal(s.workshop.structures[0].condition,'sound');
});
async function homes(t,s){const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','map');await ui.click('place-open');return ui;}
test('Homes leads with current dwelling/rest; adoption is only in family management',async t=>{
 const ui=await homes(t,base('cottage'));const home=ui.root.querySelector('.home-overview');assert.ok(home);assert.ok(home.querySelector('[data-id="home_rest"]'));assert.equal(home.querySelector('[data-disclosure="home-household"]'),null);assert.match(home.textContent,/Your household:/);
 assert.ok(!ui.root.innerHTML.includes('data-id="lineage_adoption_'));assert.ok(!ui.root.innerHTML.includes('data-id="life_home_cottage"'));
 assert.ok(ui.root.querySelector('[data-id="life_home_townhouse"]'));assert.ok(ui.root.querySelector('[data-id="life_home_estate"]'));assert.equal(ui.root.querySelector('[data-disclosure="home-upgrades"]').open,undefined);
 await ui.click('home-family');assert.ok(ui.root.querySelector('.family-adoption'));assert.ok(ui.root.querySelector('[data-id="lineage_adoption_6"]'));
});
test('purchase review, cancel, confirm and repeated old confirm are safe; saved result resumes',async t=>{
 const ui=await homes(t,base('cottage')),before=structuredClone(ui.current());
 await ui.click('activity','life_home_townhouse');assert.deepEqual(ui.current(),before);assert.match(ui.root.querySelector('[role="dialog"]').textContent,/340 Gold · 14 Days/);assert.match(ui.root.querySelector('[role="dialog"]').textContent,/Cottage/);
 await ui.click('close-modal');assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('[data-op="home-purchase-confirm"]'),null);
 await ui.click('activity','life_home_townhouse');const old=ui.root.querySelector('[data-op="home-purchase-confirm"]');await old.click();const next=valid(ui.current());assert.equal(next.life.home.tier,'townhouse');await old.click();assert.deepEqual(ui.current(),next);
 await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current(),next);await ui.click('tab','map');await ui.click('place-open');assert.equal(ui.root.querySelector('[data-id="life_home_townhouse"]'),null);assert.ok(ui.root.querySelector('[data-id="life_home_estate"]'));
});

test('parents keep their own address and are not carried into a new household or later travels',async()=>{
 const {getContacts}=await import('../dist/js/conversations.js');const {nearbyContacts}=await import('../dist/js/dialogue-ui-v22.js');const {familyResidence}=await import('../dist/js/household-residence.js');
 const s=base(),parent=s.life.people.find(p=>p.id==='kin');parent.locationId='home';const saved=structuredClone(parent);
 const n=valid(E.chooseAction(s,'life_home_cottage'));assert.deepEqual(n.life.people.find(p=>p.id===parent.id),saved);assert.equal(getContacts(n).find(p=>p.id===parent.id).locationId,'home');assert.equal(getContacts(n).find(p=>p.id===parent.id).roomId,'homes');assert.ok(!nearbyContacts(n).some(p=>p.id===parent.id));
 for(const place of ['city','brook']){const away=structuredClone(n);away.locationId=place;away.cartography.interior=null;syncCartography(away);assert.equal(familyResidence(away,parent),'home');assert.ok(!nearbyContacts(away).some(p=>p.id===parent.id));for(const id of ['family_time_kin','family_support','family_dilemma','life_visit_kin','life_gift_kin','life_values_kin']){const a=E.getActions(away).find(a=>a.id===id);assert.ok(!a||a.disabledReason,id);assert.deepEqual(stable(E.chooseAction(away,id)),stable(away),id);}}
 const visit=structuredClone(n);visit.locationId='home';visit.cartography.interior=null;syncCartography(visit);const atFamily=walk(visit,'homes');assert.ok(nearbyContacts(atFamily).some(p=>p.id===parent.id));assert.equal(E.getActions(atFamily).find(a=>a.id==='family_time_kin').disabledReason,undefined);const spent=E.chooseAction(atFamily,'family_time_kin');assert.equal(spent.life.people.find(p=>p.id==='kin').bond,Math.min(100,atFamily.life.people.find(p=>p.id==='kin').bond+7));assert.equal(spent.life.home.locationId,'city');assert.deepEqual(E.migrateSave(n),n);
});
test('parents remain in their Homes area, while a partner and children use the owned home address',async()=>{
 const {getContacts}=await import('../dist/js/conversations.js');const {nearbyContacts}=await import('../dist/js/dialogue-ui-v22.js');const {familyResidence}=await import('../dist/js/household-residence.js');
 const s=base('cottage'),parent=s.life.people.find(p=>p.id==='kin');parent.locationId='city';let market=walk(s,'market');assert.ok(!nearbyContacts(market).some(p=>p.id===parent.id));assert.equal(getContacts(market).find(p=>p.id===parent.id).locationId,'city');
 const partner=s.life.people.find(p=>p.id==='river');s.life.partnerId=partner.id;partner.locationId='home';assert.equal(familyResidence(s,partner),'city');assert.equal(getContacts(s).find(p=>p.id===partner.id).locationId,'city');
 const child={id:'child-test',name:'Test Child',age:6};s.life.children.push(child);assert.equal(familyResidence(s,child),'city');assert.equal(getContacts(s).find(p=>p.id===child.id).locationId,'city');
 s.locationId='brook';assert.equal(familyResidence(s,partner),'city');assert.equal(familyResidence(s,child),'city');assert.equal(familyResidence(s,parent),'city');
});
test('home rest lowers Stress by eight, floors at zero, and never grants relief on a blocked rest',()=>{
 for(const stress of [0,3,8,70,100]){const s=base('cottage');s.life.stress=stress;s.hero.mp=1;const n=valid(E.chooseAction(s,'home_rest'));assert.equal(n.life.stress,Math.max(0,stress-8));assert.equal(n.hero.mp,n.hero.maxMp);assert.equal(n.day,s.day+1);assert.equal(n.hero.gold,s.hero.gold-householdCostPreview(s,1).totalDue);const away=walk(s,'market');assert.deepEqual(stable(E.chooseAction(away,'home_rest')),stable(away));}
});

test('local neighbors remain available after caregivers die, without changing their records',async()=>{
 const {applyHouseholdAction,householdActions}=await import('../dist/js/household.js');const s=base();for(const p of s.life.people.filter(p=>p.id==='kin'||p.role==='relative'||p.familyRole))p.alive=false;s.family.housing='unsheltered';s.family.interactionUses={};const people=structuredClone(s.life.people);
 for(const id of ['family_support','family_shelter']){assert.equal(householdActions(s).find(a=>a.id===id).disabledReason,undefined);assert.equal(applyHouseholdAction(s,id,{journal(){}}),true);assert.match(s.notice,/local neighbors/);}assert.deepEqual(s.life.people,people);assert.equal(s.family.housing,'shelter');
});
test('a spouse living at the new owned home can discuss values without rewriting their earlier address',()=>{
 const s=base('townhouse'),p=s.life.people.find(p=>p.id==='river');s.life.partnerId=p.id;p.locationId='home';p.age=30;const a=E.getActions(s).find(a=>a.id==='life_values_'+p.id);assert.ok(a);assert.equal(a.disabledReason,undefined);assert.equal(p.locationId,'home');
});
