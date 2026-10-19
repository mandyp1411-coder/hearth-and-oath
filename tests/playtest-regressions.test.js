import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as engine from '../dist/js/engine.js';
import {isSettlement} from '../dist/js/world.js';

test('the genuine healer parent can attend care one day before a birthday without breaking their save',()=>{
  const original=JSON.parse(readFileSync(new URL('./fixtures/family-care-boundary.json',import.meta.url),'utf8'));
  const state=original.state||original;
  assert.equal(state.day,12774);assert.equal(state.timeline.yearTarget,12775);assert.equal(state.event.id,'health_concern');assert.ok(engine.validateSave(state));
  const before=structuredClone(state),next=engine.chooseEventOption(state,'care');
  assert.deepEqual(state,before);assert.equal(next.day,12775,'the actual attended care day reaches the birthday without overrunning it');
  assert.ok(engine.validateSave(next));assert.equal(next.event.id,'birth_adult_year');
  assert.equal(next.hero.gold,state.hero.gold-6,'one care attendance pays its fee once');
  const resolved=engine.chooseEventOption(next,'care');assert.ok(engine.validateSave(resolved));assert.equal(resolved.timeline.yearTarget,null);
  const imported=engine.migrateSave(JSON.parse(JSON.stringify(next)));assert.ok(imported);
  assert.equal(imported.event.body,next.event.body,'the waiting birthday remains exact on import');
  assert.ok(engine.validateSave(engine.chooseEventOption(imported,'care')));
});

test('party and equipment reasons match the actual operation for genuine committed and retired lives',()=>{
  const fixtures=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url),'utf8')).states;
  for(const original of Object.values(fixtures)) {
    const s=engine.migrateSave(original);
    if(!s.timeline?.journey&&!s.workshop?.project&&!s.battle&&!s.event&&!s.conversations?.pending)continue;
    assert.ok(engine.equipmentActionReason(s));
    const before=JSON.stringify(s.hero),equipment=JSON.stringify(s.equipment);
    const next=engine.equipGear(s,'iron_sword');assert.equal(JSON.stringify(next.hero),before);assert.equal(JSON.stringify(next.equipment),equipment);
    for(const p of s.companions) {
      const reason=engine.companionActionReason(s,p.id,p.recruited?'toggle':'recruit');assert.ok(reason);
      const result=p.recruited?engine.toggleCompanion(s,p.id):engine.recruitCompanion(s,p.id);
      assert.deepEqual(result.companions,s.companions);assert.equal(result.notice,reason);
    }
  }
});

test('hearth and market service eligibility accepts inhabited harbors and excludes closed ruins',()=>{
  const s=engine.createBirthGame({seed:'services-for-an-ordinary-life',birthplace:'coast'});
  for(const id of ['coast','tower','camp','citadel','sanctuary'])assert.equal(isSettlement(s.world,id),true);
  for(const id of ['forest','ruin','marsh'])assert.equal(isSettlement(s.world,id),false);
  const world=structuredClone(s.world);world.locations.find(p=>p.id==='coast').status='evacuated';assert.equal(isSettlement(world,'coast'),false);
});
