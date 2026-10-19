import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {Player} from '../scripts/playtest-story.mjs';
import {campaignSpec as spec} from './helpers/campaign-roleplay-spec.mjs';

// The existing second complete public playthrough runs independently so each
// file fits the unchanged release timeout. Every original assertion is retained.
test('a purchased home lost away from the birthplace gets a real temporary address',()=>{
  const p=new Player({...spec,id:'regression-city-born-citadel-home',birthplace:'city'});
  p.grow(18);p.act('career_choose_blacksmith');p.money(320);p.move('citadel');p.act('life_home_cottage');
  assert.deepEqual(p.state.life.home,{tier:'cottage',source:'purchase',locationId:'citadel'});
  p.earn('guardian');p.move('city');
  for(const id of ['mira','orrin','kest'])p.recruit(id);
  p.money(150);p.act('gear_buy_iron_sword');p.step('equip','iron_sword',s=>E.equipGear(s,'iron_sword'));
  p.spec.policy.prepare='wards';p.campaign();
  assert.equal(p.state.hero.birthplaceId,'city');
  assert.equal(p.state.world.locations.find(p=>p.id==='citadel').status,'destroyed');
  assert.equal(p.state.world.locations.find(p=>p.id==='city').status,'scarred');
  assert.deepEqual(p.state.life.home,{tier:'lodgings',source:'purchase',locationId:'camp'});
  assert.equal(p.state.campaign.facts.householdDisplaced,true);
  assert.ok(p.state.journal.some(j=>j.title==='The address of a lost home'));
  assert.equal(E.validateSave(p.state),true);
});

