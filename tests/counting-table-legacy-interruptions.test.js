// Controlled original legacy-v2 adult plus real current public commands. This is
// a supported non-birth calendar regression, not naturally earned-life evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, valid, reload, act, answer, settle, walk, accept, prepare } from './helpers/counting-table-engine.mjs';
import { syncCartography } from '../dist/js/cartography.js';
import { settlementServices } from '../dist/js/world-services.js';
import { makeCountingTableCase, countingTableRolls, countingTableRiskQuote } from '../dist/js/counting-table-case.js';
import { regionAt } from '../dist/js/realm.js';
const copy=s=>structuredClone(s);
function legacyFixture(){
 const raw=JSON.parse(readFileSync(new URL('./fixtures/legacy-v2.json',import.meta.url))).states.adult,base=E.migrateSave(raw);
 assert.ok(base);assert.notEqual(base.timeline?.mode,'birth');valid(base);
 for(const place of base.world.locations.filter(p=>base.realm.sites[p.id]?.regionId==='bellwater'&&base.realm.sites[p.id].merchant&&!['destroyed','evacuated'].includes(p.status))){
  let s=copy(base);s.locationId=place.id;syncCartography(s);s=walk(s,'market');
  if(!E.getActions(s).some(a=>a.id==='justice_job_open'&&!a.disabledReason))continue;
  const merchantService=settlementServices(s).find(r=>r.kind==='merchant'&&r.subjectId==='market'),run=makeCountingTableCase(s,{method:'social',merchantService});assert.ok(run);
  const q=countingTableRiskQuote(s,run,{enforcement:regionAt(s).law.enforcement}),rolls=countingTableRolls(s,run);
  if(rolls.entry<q.entryChance)return {state:reload(s),method:'social',departureSuccess:rolls.escape<q.escapeChance};
 }
 throw Error('No bounded original legacy-site success fixture');
}
test('legacy departure respects a due promise before its day, then resumes its exact frozen plan once',()=>{
 const capture=legacyFixture();let s=prepare(accept(capture.state,capture.method));assert.notEqual(s.timeline?.mode,'birth');s=settle(act(s,'justice_job_approach'));if(!s.event)s=act(s,'justice_job_review');assert.equal(s.event?.id,'justice_counting_departure');
 // Existing due promise is an explicit controlled calendar antecedent. The
 // departure and mandatory review themselves run the actual public reducer.
 s.obligations.push({id:'legacy-counting-deadline',title:'An existing promise',description:'Controlled same-day legacy commitment interruption.',dueDay:s.day,resolved:false});valid(s);
 const before=copy(s),target=s.justice.countingTableJob.target;s=answer(s,'depart');assert.equal(s.day,before.day,'no departure day before review');assert.equal(s.hero.gold,before.hero.gold);assert.deepEqual(s.householdBudget,before.householdBudget);assert.deepEqual(s.adventuring.loot,before.adventuring.loot);assert.deepEqual(s.justice.takenProperties,before.justice.takenProperties);
 assert.equal(s.event?.id,'annual_deadline_review');assert.equal(s.justice.countingTableJob.stage,'departure');assert.equal(s.justice.countingTableJob.attempt.departure.completedDay,null);const frozen=copy(s.justice.countingTableJob.attempt.departure.commitment);s=reload(s);assert.deepEqual(s.justice.countingTableJob.attempt.departure.commitment,frozen);
 s=answer(s,'pause');assert.equal(s.day,before.day);assert.equal(s.event,null);s=act(reload(s),'justice_job_continue');assert.equal(s.day,before.day+1);assert.deepEqual(s.justice.countingTableJob.attempt.departure.commitment,frozen);assert.equal(s.justice.countingTableJob.status,capture.departureSuccess?'completed':'failed');assert.equal(s.justice.takenProperties.filter(id=>id===target.id).length,capture.departureSuccess?1:0);assert.equal(s.adventuring.loot.filter(l=>l.propertyId===target.id).length,capture.departureSuccess?1:0);reload(s);
 const completed=copy(s),again=E.chooseAction(s,'justice_job_continue');assert.equal(again.day,completed.day);assert.equal(again.hero.gold,completed.hero.gold);assert.deepEqual(again.justice,completed.justice);assert.deepEqual(again.adventuring.loot,completed.adventuring.loot);
});
