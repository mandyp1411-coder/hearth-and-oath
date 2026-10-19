// Controlled post-attendance boundary, NOT a naturally filled bag/earned route.
// Actual domain begin/attendance/block APIs construct a canonical pending phase;
// the merchant sale, competing work and final retry then use public engine APIs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E,copy,valid,roundtrip,act,pick,walk,captureClaimOpportunity,captureResearchProject } from './helpers/claims-tournament-fixtures.mjs';
import { beginCountingTablePhase,recordCountingTablePhaseAttendance,resolveCountingTablePhase } from '../dist/js/counting-table-case.js';
import { countingTableCommitment } from '../dist/js/local-project-ownership.js';
import { regionAt } from '../dist/js/realm.js';

function attendedFullBag(){
 const s=captureClaimOpportunity(),run=s.justice.countingTableJob,day=s.day;
 assert.ok(beginCountingTablePhase(s,run,'departure',{enforcement:regionAt(s).law.enforcement}));
 assert.ok(countingTableCommitment(s));
 // Explicit controlled clock/capacity precondition, using the phase attendance
 // reducer instead of forging success, proof, target, roll or acquired property.
 s.day=day+1;
 assert.ok(recordCountingTablePhaseAttendance(s,run,'departure',{startedDay:day}));
 s.adventuring.loot=Array.from({length:160},(_,i)=>({id:'controlled-owned-'+i,name:'Controlled owned valuable '+i,value:10,stolen:false,source:s.locationId,day:s.day}));
 assert.equal(resolveCountingTablePhase(s,run,'departure').status,'blocked');
 assert.equal(run.attempt.departure.succeeded,null);assert.equal(run.lootId,null);assert.equal(s.justice.takenProperties.includes(run.target.id),false);
 return roundtrip(valid(s,'controlled complete-attendance/full-bag source boundary'));
}
test('an already-attended blocked phase permits real merchant sale then zero-day frozen resolution once',()=>{
 let s=attendedFullBag(),run=copy(s.justice.countingTableJob),day=s.day;
 assert.equal(countingTableCommitment(s),null);assert.equal(E.getLifeCommitment(s),null);
 // It no longer owns a day. A new actual research project remains valid, but
 // the old claim cannot continue through that project's independent ownership.
 let study=captureResearchProject(s);assert.equal(study.day,day);assert.equal(study.researchPortfolio.project.completedDays,0);assert.deepEqual(study.justice.countingTableJob,run);roundtrip(study);
 const refused=E.chooseAction(study,'justice_job_continue');assert.deepEqual({...refused,notice:''},{...study,notice:''});s=act(study,'research_cancel');s=walk(s,'market');assert.equal(s.day,day);
 assert.ok(E.getActions(s).some(a=>a.id==='realm_sellloot_controlled-owned-0'&&!a.disabledReason),'existing actual merchant sale is available');
 const beforeSale=copy(s),gold=s.hero.gold;s=act(s,'realm_sellloot_controlled-owned-0');assert.deepEqual(beforeSale.justice.countingTableJob,run);assert.deepEqual(s.justice.countingTableJob,run);assert.equal(s.day,day);assert.equal(s.hero.gold,gold+8);assert.equal(s.adventuring.loot.length,159);assert.equal(s.adventuring.loot.some(l=>l.id==='controlled-owned-0'),false);roundtrip(s);
 const beforeFinish=copy(s);s=act(s,'justice_job_continue');assert.equal(s.day,day,'already attended day is never repeated');assert.equal(s.hero.gold,beforeFinish.hero.gold,'no second fee, payout or stale household bill');assert.equal(s.justice.countingTableJob.status,'completed');assert.deepEqual(s.justice.countingTableJob.attempt.departure.commitment,run.attempt.departure.commitment);assert.equal(s.justice.countingTableJob.attempt.departure.completedDay,run.attempt.departure.completedDay);assert.deepEqual(s.adventuring.loot.slice(0,159),beforeFinish.adventuring.loot);assert.equal(s.adventuring.loot.filter(l=>l.propertyId===run.target.id).length,1);assert.equal(s.justice.takenProperties.filter(id=>id===run.target.id).length,1);roundtrip(s);
 const complete=copy(s),again=E.chooseAction(s,'justice_job_continue');assert.deepEqual({...again,notice:''},{...complete,notice:''});assert.deepEqual(s,complete);
});
