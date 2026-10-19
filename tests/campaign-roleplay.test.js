import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { generateWorld, isSettlement } from '../dist/js/world.js';
import { campaignView, onCampaignAge, applyCampaignChoice } from '../dist/js/campaign.js';
import { loreView } from '../dist/js/lore.js';
import { Player } from '../scripts/playtest-story.mjs';

// This shared source is earned from age zero through public operations. Branches
// below are regression fixtures, and are not counted as additional audit lives.
import {campaignSpec as spec} from './helpers/campaign-roleplay-spec.mjs';
const earned=new Player(spec);
earned.grow(18);earned.move('city');earned.act('career_choose_blacksmith');earned.money(320);
earned.act('life_home_cottage');
while(earned.state.careers.records.Blacksmith.workedDays<15)earned.act('career_work');
earned.act('career_buy_ore');earned.act('career_buy_wood');earned.earn('guardian');earned.move('city');
for(const id of ['mira','orrin','kest'])earned.recruit(id);
earned.act('gear_buy_iron_sword');earned.step('equip','iron_sword',s=>E.equipGear(s,'iron_sword'));
let preparationBefore, beforeFinal;
const select=earned.choose.bind(earned);
earned.choose=id=>{const preparing=earned.state.event?.id==='quest_prepare';if(preparing)preparationBefore=structuredClone(earned.state.equipment.materials);if(earned.state.event?.id==='quest_final')beforeFinal=structuredClone(earned.state);select(id);if(preparing){assert.equal(earned.state.equipment.materials.ore,preparationBefore.ore-2);assert.equal(earned.state.equipment.materials.wood,preparationBefore.wood-1);}};
earned.campaign();
const source=structuredClone(earned.state);
function branch(){const p=new Player({...spec,id:'regression-branch'});p.state=structuredClone(source);p.check();return p;}

test('civilian service gating follows actual settlement services and lasting losses',()=>{
  const world=generateWorld('roleplay-service-rule',{expanded:true});
  for(const id of ['home','city','brook','camp','citadel','sanctuary','tower'])assert.equal(isSettlement(world,id),true,id);
  for(const id of ['forest','ruin','missing'])assert.equal(isSettlement(world,id),false,id);
  world.locations.find(p=>p.id==='citadel').status='destroyed';assert.equal(isSettlement(world,'citadel'),false);
  world.locations.find(p=>p.id==='home').servicesAvailable=false;assert.equal(isSettlement(world,'home'),false);
});

test('actual smithing experience and consumed materials protect homes through a shattering ending',()=>{
  assert.equal(source.campaign.ending.id,'shatter');
  assert.equal(source.campaign.facts.professionalPreparation,'Blacksmith');
  assert.equal(source.campaign.facts.wardsReady,true);
  assert.equal(source.campaign.facts.evacuationReady,false,'a craft preparation cannot also conjure an escort');
  assert.equal(source.world.locations.find(p=>p.id==='home').status,'scarred');
  assert.equal(source.world.locations.find(p=>p.id==='citadel').status,'destroyed');
  assert.equal(source.life.people.find(p=>p.id==='kin').locationId,'camp','the actual fortress birthplace is displaced');
  assert.equal(source.campaign.facts.householdDisplaced,true);
  assert.ok(!loreView(source).summary.includes('remains an unanswered sign'));
});

test('losing an actual birthplace preserves a later purchased home in a surviving city',()=>{
  assert.equal(source.hero.birthplaceId,'citadel');
  assert.equal(source.world.locations.find(p=>p.id==='citadel').status,'destroyed');
  assert.equal(source.world.locations.find(p=>p.id==='city').status,'scarred');
  assert.deepEqual(source.life.home,{tier:'cottage',source:'purchase',locationId:'city'});
  assert.equal(source.life.people.find(p=>p.id==='kin').locationId,'camp','the displaced birth family retains its actual new address');
  assert.equal(E.validateSave(source),true);
});

test('unaddressed older home records keep the explicit birthplace fallback when that place is lost',()=>{
  // This fixture isolates an older valid home layout, not another played life.
  const old=structuredClone(beforeFinal);delete old.life.home.locationId;
  assert.equal(E.validateSave(old),true);
  const next=E.chooseEventOption(old,'testimony');
  assert.deepEqual(old.life.home,{tier:'cottage',source:'purchase'});
  assert.deepEqual(next.life.home,{tier:'lodgings',source:'purchase',locationId:'camp'});
  assert.equal(E.validateSave(next),true);
});

test('paid civic work conserves currency and supplies, records exact workdays, and cannot reopen a lost town',()=>{
  const p=branch();p.move('city');p.money(60);p.act('career_buy_ore');p.act('career_buy_wood');
  const before=structuredClone(p.state),sourceWorked=before.careers.records.Blacksmith.workedDays;
  p.act('quest_civic_work');
  assert.equal(p.state.day,before.day+7);assert.equal(p.state.hero.gold,before.hero.gold-12);
  assert.equal(p.state.equipment.materials.ore,before.equipment.materials.ore-2);
  assert.equal(p.state.equipment.materials.wood,before.equipment.materials.wood-1);
  assert.equal(p.state.careers.records.Blacksmith.workedDays,sourceWorked+7);
  assert.deepEqual(p.state.world.locations.map(p=>p.status),before.world.locations.map(p=>p.status));
  assert.ok(p.state.world.changes.some(c=>c.id.startsWith('civic-')&&c.text.includes(p.state.hero.name)));
  p.settle();assert.ok(E.getActions(p.state).find(a=>a.id==='quest_civic_work').disabledReason);
  const rejected=E.chooseAction(p.state,'quest_civic_work');assert.equal(rejected.day,p.state.day);assert.equal(rejected.hero.gold,p.state.hero.gold);
  assert.equal(E.validateSave(p.state),true);
});

test('lost places permit a remembered visit while every ordinary service remains closed',()=>{
  const p=branch();p.move('citadel');const before=structuredClone(p.state);p.act('quest_memorial');p.settle();
  assert.equal(p.state.day,before.day+1);assert.equal(p.state.hero.skills.scholarship,before.hero.skills.scholarship+1);
  assert.deepEqual(p.state.world.locations.find(p=>p.id==='citadel').services,[]);
  assert.equal(p.state.world.locations.find(p=>p.id==='citadel').status,'destroyed');
  assert.ok(p.state.journal.at(-1).text.includes('whose fate remains unresolved'));
  assert.ok(E.getActions(p.state).find(a=>a.id==='quest_memorial').disabledReason);
});

test('successive remembered years rotate distinct ending-specific accounts and retain their source in the journal',()=>{
  const p=branch(),titles=[];p.move('city');
  const startAge=p.state.age;for(const target of [startAge+1,startAge+2,startAge+3]){p.grow(target);while(p.state.campaign.followups.length){p.act('quest_followup');titles.push(p.state.event.title);p.choose('record');p.settle();}}
  assert.equal(new Set(titles.slice(-3)).size,3);
  assert.ok(p.state.journal.some(j=>j.text.includes('permanent loss remain legible')||j.text.includes('original town reopened')||j.text.includes('uncertainty into a convenient ending')));
  assert.equal(E.validateSave(p.state),true);
});

test('an expired limited keeper term never silently renews, even if its old reminder was marked missed',()=>{
  // An explicit unit fixture isolates an old missed reminder; it is not a life.
  const state=structuredClone(source);state.campaign.ending={id:'keeper',title:'The Living Keeper',summary:'A recorded limited term.',day:state.day};state.campaign.facts.keeperActive=true;state.campaign.facts.keeperReleaseDay=state.day-1;
  state.obligations.push({id:'living_keeper_review',title:'Review the term',description:'A voluntary review',dueDay:state.day-1,resolved:true,missed:true});
  const entries=[];onCampaignAge(state,{finishObligation(){},journal:(title,text)=>entries.push({title,text})});
  assert.equal(state.campaign.facts.keeperActive,false);assert.ok(entries.some(e=>e.title==='Silence cannot renew a life'));
  assert.equal(campaignView(state).ending.id,'keeper','ending history remains recorded after personal service ends');
});

test('a physical preparation cannot invent a representative coalition, and an unprepared haven retains its shortage',()=>{
  // Focused module fixtures exercise two policy branches without counting them
  // as playthroughs. All six complete ending lives are documented separately.
  const unit=(stage,facts)=>({seed:'roleplay-policy-fixture',age:25,day:9000,hero:{name:'A fixture',origin:'village',profession:'Scholar'},world:generateWorld('roleplay-policy-fixture',{expanded:true}),life:{people:[],home:{tier:'lodgings'}},campaign:{fate:'echo',act:4,stage,facts,completed:[],decisions:[],ending:null,pending:{questId:stage,side:false}}});
  const ctx={journal(){},standing(){},breakOath(){},witnesses(){return[];},remember(){}};
  const prep=unit('prepare',{plannedEnding:'renew',councilChoice:'institutions'});
  assert.equal(applyCampaignChoice(prep,'quest_prepare','wards',ctx),true);
  assert.equal(prep.campaign.facts.wardsReady,true);assert.notEqual(prep.campaign.facts.councilCoalition,true);
  for(const prepared of [false,true]) {
    const final=unit('final',{plannedEnding:'haven',refugeReady:prepared});
    assert.equal(applyCampaignChoice(final,'quest_final','testimony',ctx),true);
    assert.equal(final.campaign.ending.id,'haven');assert.equal(final.campaign.facts.havenPrepared,prepared);
    assert.equal(final.world.locations.find(p=>p.id==='camp').status,prepared?'thriving':'scarred');
  }
});
