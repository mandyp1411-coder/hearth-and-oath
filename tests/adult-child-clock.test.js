import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAdultChildClock, recordAdultChildSiteChange, adultChildEligiblePeriods, settleAdultChildClock } from '../dist/js/adult-child-clock.js';
import { introduceAdultChildLife, validateAdultChildLife } from '../dist/js/adult-child-livelihoods.js';
const YEAR=365;
function fixture({age=18,interest='craft'}={}) {
 const p={id:'line-42-g1-child-child-1',source:'child',localId:'child-1',name:'Aven',bornDay:0,alive:true,preferences:{pursuit:interest},development:{traits:{care:0,curiosity:0,courage:0},skills:Object.fromEntries(['weapons','defense','arcana','devotion','stealth','survival','scholarship','persuasion'].map(k=>[k,0])),education:{route:null,attendance:0,qualifications:[]},history:[]}};
 const s={seed:'child-clock',day:age*YEAR,hero:{origin:'village',birthplaceId:'home',gold:1000},dynasty:{activePersonId:'parent'},lineage:{people:[p]},life:{home:{tier:'cottage',locationId:'home'},children:[{id:p.localId,name:p.name,bornDay:0}],people:[]},world:{locations:[{id:'home',type:'village',status:'thriving',servicesAvailable:true}],changes:[]}};
 return {s,p};
}
function tick(s,days,mutate=()=>{}) {
 const clock=captureAdultChildClock(s,{newDay:s.day+days});s.day+=days;mutate(clock);settleAdultChildClock(s,clock);
 for(const p of s.lineage.people)assert.ok(validateAdultChildLife(p.adultLife,p,s));return clock;
}
test('a real 30-day or aggregate 365-day clock progresses without waiting for daily calls',()=>{
 for(const days of [30,365]){const {s,p}=fixture();const before=s.day;tick(s,days);assert.equal(p.adultLife.introducedDay,before);assert.equal(p.adultLife.work.trainingDays,14);assert.equal(p.adultLife.eligibleDays,Math.min(days,90));assert.equal(p.adultLife.milestoneDay,days===365?before+90:null);}
});
test('aggregate and split real calendar observations leave the same bounded records',()=>{
 const a=fixture(),b=fixture();tick(a.s,365);for(let i=0;i<365;i++)tick(b.s,1);assert.deepEqual(a.p,b.p);
});
test('capturing the clock is a pure small per-person and per-unique-site snapshot',()=>{
 const {s,p}=fixture();const other=structuredClone(p);other.id='line-42-g1-child-child-2';other.localId='child-2';other.name='Bren';s.lineage.people.push(other);s.life.children.push({id:other.localId,name:other.name,bornDay:0});
 const before=structuredClone(s),clock=captureAdultChildClock(s,{newDay:s.day+365});assert.deepEqual(s,before);assert.equal(clock.people.length,2);assert.equal(Object.keys(clock.sites).length,1);assert.equal(Object.hasOwn(clock,'world'),false);assert.equal(p.adultLife,undefined);
 assert.equal(captureAdultChildClock(s,{oldDay:s.day-1,newDay:s.day+1}),null);
});
test('a child crossing eighteen begins exactly at that birthday in this real interval',()=>{
 const {s,p}=fixture({age:17});s.day+=300;tick(s,365);assert.equal(p.adultLife.introducedDay,18*YEAR);assert.equal(p.adultLife.eligibleDays,90);assert.equal(p.adultLife.work.introducedDay,18*YEAR+1);
});
test('old imported adult gaps stay unknown while subsequent actual time counts',()=>{
 const {s,p}=fixture();introduceAdultChildLife(s,p,{source:'conversation'});const introduced=s.day;s.day+=10*YEAR;
 tick(s,30);assert.equal(p.adultLife.introducedDay,introduced);assert.equal(p.adultLife.eligibleDays,30);assert.equal(p.adultLife.work.introducedDay,introduced+10*YEAR+1);
});
test('a dated closure inside a large step excludes the closure day and everything after it',()=>{
 const {s,p}=fixture(),start=s.day;
 tick(s,365,clock=>{s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;recordAdultChildSiteChange(clock,{locationId:'home',day:start+20,operating:false});});
 assert.equal(p.adultLife.eligibleDays,19);assert.equal(p.adultLife.work.trainingDays,14);assert.equal(p.adultLife.residence,null);assert.equal(p.adultLife.status,'suspended');
});
test('stale realm catch-up events before oldDay correct availability rather than award false current work',()=>{
 const {s,p}=fixture(),start=s.day;
 tick(s,365,clock=>{s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;recordAdultChildSiteChange(clock,{locationId:'home',day:start-30,operating:false});});
 assert.equal(p.adultLife.eligibleDays,0);assert.equal(p.adultLife.work.introducedDay,null);
});
test('already closed intervals and unexplained endpoint reopen grant no invented earlier days',()=>{
 const {s,p}=fixture();introduceAdultChildLife(s,p,{source:'conversation'});s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;
 tick(s,30);assert.equal(p.adultLife.eligibleDays,0);
 tick(s,30,()=>{s.world.locations[0].status='thriving';s.world.locations[0].servicesAvailable=true;});assert.equal(p.adultLife.eligibleDays,0);
 tick(s,30);assert.equal(p.adultLife.eligibleDays,30);
});
test('an explicit reopen permits only days after its actual boundary',()=>{
 const {s,p}=fixture();introduceAdultChildLife(s,p,{source:'conversation'});s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;const start=s.day;
 tick(s,50,clock=>{s.world.locations[0].status='thriving';s.world.locations[0].servicesAvailable=true;recordAdultChildSiteChange(clock,{locationId:'home',day:start+30,operating:true});});
 assert.equal(p.adultLife.eligibleDays,20);assert.deepEqual(p.adultLife.periods,[{fromDay:start+30,toDay:start+50}]);
});
test('ephemeral closure observations survive trimmed world history and ignore unrelated sites',()=>{
 const {s,p}=fixture(),start=s.day;
 tick(s,365,clock=>{s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;assert.equal(recordAdultChildSiteChange(clock,{locationId:'elsewhere',day:start+2,operating:false}),false);recordAdultChildSiteChange(clock,{locationId:'home',day:start+10,operating:false});s.world.changes=Array.from({length:500},(_,i)=>({id:'unrelated-'+i,day:s.day}));});
 assert.equal(p.adultLife.eligibleDays,9);
});
test('death during a clock invocation or an unfinished early-return snapshot awards no orphan progress',()=>{
 const {s,p}=fixture(),clock=captureAdultChildClock(s,{newDay:s.day+30});assert.equal(p.adultLife,undefined);s.day+=30;p.alive=false;assert.deepEqual(settleAdultChildClock(s,clock),[]);assert.equal(p.adultLife,undefined);
 const f=fixture(),pending=captureAdultChildClock(f.s,{newDay:f.s.day+30});assert.deepEqual(settleAdultChildClock(f.s,pending),[]);assert.equal(f.p.adultLife,undefined);assert.equal(Object.hasOwn(f.s,'clock'),false);
});
test('known sibling service dates exclude deployment without conflating recycled local child IDs',()=>{
 const {s,p}=fixture();p.source='life';p.localId='family_sibling_1';s.life.people=[{id:p.localId,name:p.name,familyRole:'sibling',alive:true,locationId:'home'}];s.life.children=[];const start=s.day;
 s.realm={politics:{deployments:[{warId:'war-a',lineageId:p.id,personId:p.localId,enlistedDay:start+10,endedDay:null},{warId:'old-war',lineageId:'different-stable-person',personId:p.localId,enlistedDay:0,endedDay:null}]}};
 tick(s,40,()=>{s.realm.politics.deployments[0].endedDay=start+30;});assert.equal(p.adultLife.eligibleDays,19);assert.deepEqual(p.adultLife.periods,[{fromDay:start,toDay:start+9},{fromDay:start+30,toDay:start+40}]);
});
test('study under a real aggregate year retains four dates rather than simulating recurring years',()=>{
 const {s,p}=fixture({interest:'knowledge'}),start=s.day;tick(s,365);assert.equal(p.adultLife.study.attendance,4);assert.equal(p.adultLife.eligibleDays,120);assert.deepEqual(p.adultLife.study.sessions.map(r=>r.day),[start+30,start+60,start+90,start+120]);tick(s,365);assert.equal(p.adultLife.study.attendance,4);
});
test('future, mismatched and unexplained site events cannot establish eligibility',()=>{
 const {s,p}=fixture(),clock=captureAdultChildClock(s,{newDay:s.day+30});assert.equal(recordAdultChildSiteChange(clock,{locationId:'home',day:s.day+31,operating:false}),false);s.day+=30;s.world.locations[0].status='destroyed';s.world.locations[0].servicesAvailable=false;assert.deepEqual(adultChildEligiblePeriods(s,clock,p.id),[]);settleAdultChildClock(s,clock);assert.equal(p.adultLife.eligibleDays,0);
});
