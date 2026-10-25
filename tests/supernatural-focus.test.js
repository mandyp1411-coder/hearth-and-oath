import {assertCapturedMigration} from './helpers/migration-mechanics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {writeFileSync} from 'node:fs';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { syncCartography } from '../dist/js/cartography.js';
import { seededRoll, isSettlement } from '../dist/js/world.js';
import { travelPlanPreview } from '../dist/js/travel.js';
import { queueRareNightEncounter, validateNightEncounters, BLOOD_LINEAGES, contractCurse, bloodMealRelief, curseView, curseCombatNote, curseActions } from '../dist/js/curses.js';
import { nightDiscoveryView, nightDiscoveryActions, applyNightDiscoveryAction } from '../dist/js/supernatural-discovery.js';
import { feedingChoices, validateFeedingTerms } from '../dist/js/feeding-stories-v26.js';
import { createBattle, previewBattleAction } from '../dist/js/combat.js';
import { supernaturalNotes } from '../dist/js/supernatural-ui.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled seed, position, road-duration and affordability fixtures. Public
// actions earn the encounters and attendance. These are not extra audit lives,
// a population incidence estimate, or rendered-browser/device measurements.
function roundtrip(s){assert.ok(E.validateSave(s),JSON.stringify({notice:s.notice,event:s.event?.id,night:validateNightEncounters(s.nightEncounters,s)}));assertCapturedMigration(s,E.migrateSave(JSON.parse(JSON.stringify(s))));return s;}
function settle(s){for(let n=0;n<200;n++){
 if(s.event){const pick=['defer','continue','later','quiet','pause','care','support','keep','leave'].map(id=>s.event.choices.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,pick.id);}
 else if(s.timeline.yearTarget!=null&&!E.getLifeCommitment(s))s=E.continueAgeUp(s);
 else return roundtrip(s);
}throw Error('Fixture did not settle');}
const base=settle(await createLifeAtAge({seed:'supernatural-focus-thirteen',originId:'hearthborn',startAge:22,difficulty:'gentle'}));
function fresh(){const s=structuredClone(base);s.hero.gold=10000;delete s.nightEncounters;s.health.physical=[];s.health.mental=[];s.health.pending=null;s.health.care.restUntil=s.day+100;s.life.stress=10;s.life.health=90;delete s.trail;return roundtrip(s);}
const gen=s=>s.dynasty?.generation||1;
const rareRoll=(s,seed,week,locationId=s.locationId)=>seededRoll(seed,`rare-night:${gen(s)}:${week}:${locationId}`,10000);
function findSeed(test,prefix='night-fixture'){for(let n=0;n<300000;n++){const seed=prefix+'-'+n;if(test(seed))return seed;}throw Error('No controlled seed');}
const typeRoll={vampire:0,lycanthrope:5,patron:10,ranger:11};
function oneWeek(kind){const s=fresh(),week=Math.floor((s.day+1)/7);seedFixture(s,findSeed(seed=>kind==='vampire'?rareRoll(s,seed,week)<5:kind==='lycanthrope'?rareRoll(s,seed,week)>=5&&rareRoll(s,seed,week)<10:rareRoll(s,seed,week)===typeRoll[kind],kind));const old=s.day;s.day++;queueRareNightEncounter(s,old,{outdoors:true,night:true});assert.equal(s.nightEncounters.pending,kind);assert.ok(validateNightEncounters(s.nightEncounters,s));return s;}
function leafRoad(s){const count=id=>s.world.roads.filter(r=>r.from===id||r.to===id).length;const road=s.world.roads.find(r=>count(r.to)===1)||s.world.roads.find(r=>count(r.from)===1);assert.ok(road);const to=count(road.to)===1?road.to:road.from,from=road.from===to?road.to:road.from;return {road,from,to};}
function seedFixture(s,seed){
 // This detached seed fixture has never met or learned from these mentors.
 // Their unearned successor identities belong to the previous seed's roster.
 for(const [id,m] of Object.entries(s.progression.mentors))if(m.id!==`calling-mentor-${id}`){assert.equal(m.met,false);assert.equal(m.lessons,0);m.id=`calling-mentor-${id}`;}
 s.seed=seed;delete s.npcContinuity;const normalized=E.migrateSave(s);if(!normalized)writeFileSync(new URL('../artifacts/supernatural-invalid-seed.json',import.meta.url),JSON.stringify(s));assert.ok(normalized,'controlled seed has canonical succession metadata');Object.assign(s,normalized);delete s.trail;return s;
}
function roadFixture(days=1){let s=fresh();const {road,from,to}=leafRoad(s);road.days=days;s.locationId=from;s.cartography.interior=null;syncCartography(s);s=E.migrateSave(s);delete s.trail;s=E.updateTravelPlan(s,{pace:'steady',supplies:true,escort:true,scout:false,night:true});const q=travelPlanPreview(s,to);assert.equal(q.days,days);return {s:roundtrip(s),to};}
function discovered(kind){let {s,to}=roadFixture();const q=travelPlanPreview(s,to),week=Math.floor((s.day+1)/7),journeys=s.travel.journeys+1,day=s.day;
 seedFixture(s,findSeed(seed=>rareRoll(s,seed,week)===typeRoll[kind]&&seededRoll(seed,`journey-${seed}-${journeys}-${day}:leg:0:meeting`,100)>=q.legs[0].encounterRisk,'public-'+kind));
 s=roundtrip(E.travelTo(s,to));assert.equal(s.event?.id,'curse_rare_meeting');assert.equal(s.nightEncounters.pending,kind);return s;
}
const patronMeeting=discovered('patron'),rangerMeeting=discovered('ranger');
function deferred(kind='patron'){const s=E.chooseEventOption(structuredClone(kind==='patron'?patronMeeting:rangerMeeting),'defer');assert.equal(s.hero.condition,null);assert.equal(s.nightEncounters.invitations[0].status,'deferred');return roundtrip(s);}
function returnToMemory(s){const r=s.nightEncounters.invitations[0];if(s.locationId!==r.locationId){s=E.travelTo(s,r.locationId);for(let n=0;n<40&&(s.event||s.timeline.journey);n++){if(s.event)s=settle(s);else s=E.continueJourney(s);}}assert.equal(s.locationId,r.locationId);assert.equal(s.cartography.position,r.hex);return roundtrip(s);}
function searchFixture(found){const s=returnToMemory(deferred()),r=s.nightEncounters.invitations[0],week=Math.floor((s.day+1)/7);seedFixture(s,findSeed(seed=>(seededRoll(seed,`night-return:${r.id}:${week}`,100)<25)===found&&rareRoll(s,seed,week)>=12,'return-'+found));return roundtrip(s);}
const plainUi={e:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),date:day=>'Day '+day,button:(label,op,id)=>`<button data-op="${op}" data-id="${id}">${label}</button>`,actionCards:a=>a.map(a=>`<button data-id="${a.id}">${a.description}</button>`).join('')};

test('long and short equivalent eligible spans retain the same first opportunity and weekly exposure',()=>{
 const a=fresh(),b=structuredClone(a),start=a.day,firstWeek=Math.floor((start+1)/7),lastWeek=Math.floor((start+28)/7);
 a.seed=b.seed=findSeed(seed=>rareRoll(a,seed,firstWeek)>=12&&rareRoll(a,seed,firstWeek+1)===10&&rareRoll(a,seed,lastWeek)>=12,'inside-long-span');
 a.day+=28;queueRareNightEncounter(a,start,{outdoors:true,night:true});for(let n=0;n<28;n++){const old=b.day;b.day++;queueRareNightEncounter(b,old,{outdoors:true,night:true});}
 for(const key of ['pending','lastWeek','eligibleDays','checkedWeeks'])assert.equal(a.nightEncounters[key],b.nightEncounters[key],key);
 assert.equal(a.nightEncounters.pending,'patron');assert.equal(a.nightEncounters.meeting.week,firstWeek+1);assert.equal(a.nightEncounters.meeting.checkDay,b.nightEncounters.meeting.checkDay);assert.equal(a.nightEncounters.meeting.personName,b.nightEncounters.meeting.personName);assert.equal(a.nightEncounters.eligibleDays,28);assert.ok(validateNightEncounters(a.nightEncounters,a));
});
test('two public night journeys with and without a real deadline pause cover the same eligible weeks',()=>{
 let {s,to}=roadFixture(28);const q=travelPlanPreview(s,to),start=s.day,firstWeek=Math.floor((start+1)/7),lastWeek=Math.floor((start+28)/7),journeys=s.travel.journeys+1;
 seedFixture(s,findSeed(seed=>Array.from({length:lastWeek-firstWeek+1},(_,i)=>rareRoll(s,seed,firstWeek+i)).every(n=>n>=12)&&seededRoll(seed,`journey-${seed}-${journeys}-${start}:leg:0:meeting`,100)>=q.legs[0].encounterRisk,'paired-public'));const split=structuredClone(s);split.obligations.push({id:'night-route-review',title:'A calendar check during this road',description:'A known date separates the same attended journey.',dueDay:start+14,resolved:false});
 const whole=roundtrip(E.travelTo(s,to));let partial=roundtrip(E.travelTo(split,to));assert.ok(partial.day<whole.day);assert.equal(partial.event.id,'annual_deadline_review');partial=roundtrip(E.chooseEventOption(partial,'acknowledge'));
 for(let n=0;partial.timeline.journey&&n<20;n++)partial=partial.event?settle(partial):roundtrip(E.continueJourney(partial));
 assert.equal(partial.day,whole.day);assert.equal(partial.locationId,whole.locationId);assert.equal(partial.nightEncounters.eligibleDays,whole.nightEncounters.eligibleDays);assert.equal(partial.nightEncounters.checkedWeeks,whole.nightEncounters.checkedWeeks);assert.equal(whole.nightEncounters.eligibleDays,28);assert.equal(whole.hero.condition,null);assert.equal(partial.hero.condition,null);
});
test('ordinary shelter, daytime travel, no elapsed days, minors and custody do not create discovery checks',()=>{
 for(const mode of ['shelter','daylight','zero','minor','prison']){const s=fresh(),old=s.day;s.day++;if(mode==='minor')s.age=17;if(mode==='prison')s.justice.prison={};queueRareNightEncounter(s,mode==='zero'?s.day:old,{outdoors:mode!=='shelter',night:mode!=='daylight'});assert.equal(s.nightEncounters,undefined,mode);}
});
test('only adult eligible days are counted when a larger span crosses adulthood',()=>{
 const s=fresh();s.age=18;s.day=(s.timeline.birthDay||0)+18*365+14;const old=s.day-35;queueRareNightEncounter(s,old,{outdoors:true,night:true});assert.equal(s.nightEncounters.eligibleDays,15);assert.equal(s.nightEncounters.recordedFromDay,(s.timeline.birthDay||0)+18*365);
});
test('repeated calls, views and moving sites in an already checked week cannot reroll or add days',()=>{
 const s=oneWeek('patron'),before=structuredClone(s);queueRareNightEncounter(s,s.day-1,{outdoors:true,night:true});nightDiscoveryView(s);assert.deepEqual(s,before);const oldWeek=s.nightEncounters.lastWeek;s.nightEncounters.pending=null;delete s.nightEncounters.meeting;s.locationId=s.world.locations.find(l=>l.id!==s.locationId).id;const old=s.day;s.day++;if(Math.floor(s.day/7)===oldWeek){queueRareNightEncounter(s,old,{outdoors:true,night:true});assert.equal(s.nightEncounters.checkedWeeks,1);assert.equal(s.nightEncounters.pending,null);}
});
test('sheltered gaps do not backfill weeks and older cursors retain their previously checked week',()=>{
 const s=fresh(),old=s.day;s.nightEncounters={lastWeek:Math.floor((old+1)/7),pending:null,day:old};s.day++;queueRareNightEncounter(s,old,{outdoors:true,night:true});assert.equal(s.nightEncounters.checkedWeeks,0);const next=s.day+35;s.day=next;queueRareNightEncounter(s,next-1,{outdoors:true,night:true});assert.equal(s.nightEncounters.checkedWeeks,1);assert.equal(s.nightEncounters.eligibleDays,2);assert.ok(validateNightEncounters(s.nightEncounters,s));
});
// The room engine's dungeon days left in v0.72.4; a rare encounter keeps to the night road.
for(const kind of ['patron','ranger'])test(`an actual rare ${kind} encounter can be deferred with its person and place, without conversion or quest acceptance`,()=>{
 const original=structuredClone(kind==='patron'?patronMeeting:rangerMeeting),counts=[original.life.people.length,original.society.people.length],quest=structuredClone(original.questLog),s=deferred(kind),r=s.nightEncounters.invitations[0];assert.ok(original.event.body.includes(r.personName));assert.equal(r.locationId,original.nightEncounters.meeting.locationId);assert.equal(r.hex,original.nightEncounters.meeting.hex);assert.equal(s.event,null);assert.deepEqual(s.questLog,quest);assert.deepEqual([s.life.people.length,s.society.people.length],counts);assert.equal(s.hero.condition,null);assert.equal(s.day,original.day);assert.equal(s.hero.gold,original.hero.gold);assert.match(s.notice,/Journal/);assert.ok(!E.getActions(s).some(a=>['vampire_invitation','lycan_invitation'].includes(a.id)));roundtrip(s);
});
test('hearing the actual offer and asking for time retains an unresolved invitation through reload',()=>{
 let s=roundtrip(E.chooseEventOption(structuredClone(patronMeeting),'speak'));assert.equal(s.event.id,'vampire_offer');const name=s.nightEncounters.invitations[0].personName;assert.ok(s.event.body.includes(name));s=roundtrip(E.chooseEventOption(s,'later'));assert.equal(s.nightEncounters.invitations[0].status,'deferred');assert.equal(s.hero.condition,null);assert.match(s.notice,/may be absent/);
});
test('a permanent refusal closes only that remembered invitation and leaves ordinary mortal life available',()=>{
 let s=roundtrip(E.chooseEventOption(structuredClone(rangerMeeting),'speak'));s=roundtrip(E.chooseEventOption(s,'decline'));assert.equal(s.nightEncounters.invitations[0].status,'declined');assert.equal(s.flags.lycanDeclined,true);assert.equal(s.hero.condition,null);assert.ok(!nightDiscoveryActions(s).length);assert.ok(E.getActions(s).some(a=>a.id==='camp_rest'));
});
test('a return search requires the recorded place rather than an unrelated city or forest',()=>{
 const s=deferred(),r=s.nightEncounters.invitations[0],a=E.getActions(s).find(a=>a.id==='curse_revisit_patron');assert.ok(a?.disabledReason);assert.match(a.disabledReason,/Return to the remembered/);const before=structuredClone(s),n=E.chooseAction(s,a.id);assert.equal(n.day,s.day);assert.equal(n.hero.gold,s.hero.gold);assert.deepEqual(n.nightEncounters,before.nightEncounters);assert.ok(r.hex);
});
test('a failed actual return search spends one night and preserves uncertainty and the weekly boundary',()=>{
 let s=searchFixture(false);const before=structuredClone(s),id='curse_revisit_patron';s=roundtrip(E.chooseAction(s,id));assert.equal(s.day,before.day+1);assert.equal(s.nightEncounters.invitations[0].lastSearchResult,'absent');assert.equal(s.event,null);assert.equal(s.hero.condition,null);const a=E.getActions(s).find(a=>a.id===id);assert.match(a.disabledReason,/Another search can begin/);const n=E.chooseAction(s,id);assert.equal(n.day,s.day);assert.equal(n.nightEncounters.invitations[0].lastSearchDay,s.day);assert.deepEqual(n.nightEncounters,s.nightEncounters);
});
test('a successful return search finds the same person but still requires conversation and explicit consent',()=>{
 let s=searchFixture(true);const before=structuredClone(s),r=s.nightEncounters.invitations[0];s=roundtrip(E.chooseAction(s,'curse_revisit_patron'));assert.equal(s.day,before.day+1);assert.equal(s.event.id,'curse_rare_meeting');assert.ok(s.event.body.includes(r.personName));assert.equal(s.hero.condition,null);s=roundtrip(E.chooseEventOption(s,'speak'));assert.equal(s.event.id,'vampire_offer');assert.equal(s.hero.condition,null);s=roundtrip(E.chooseEventOption(s,'accept'));assert.equal(s.hero.condition.type,'vampire');assert.equal(s.hero.condition.stage,'incubating');assert.equal(s.nightEncounters.invitations[0].status,'accepted');
});
test('a zero-day search pause does not consume a return check or change the invitation',()=>{
 const s=returnToMemory(deferred()),before=structuredClone(s);assert.ok(applyNightDiscoveryAction(s,'curse_revisit_patron',{spendDays:()=>0}));assert.equal(s.day,before.day);assert.deepEqual(s.nightEncounters,before.nightEncounters);assert.equal(s.hero.gold,before.hero.gold);
});
test('older known meetings remain explicitly unlocated and their original invitation route still works',()=>{
 let s=fresh();s.locationId='city';syncCartography(s);s.nightEncounters={lastWeek:Math.floor(s.day/7),pending:null,day:s.day,patronMet:true};roundtrip(s);const before=structuredClone(s),view=nightDiscoveryView(s);assert.match(view.legacyKnown,/person and precise return point were not saved/);assert.equal(view.invitations.length,0);assert.deepEqual(s,before);assert.ok(E.getActions(s).some(a=>a.id==='vampire_invitation'));s=roundtrip(E.chooseAction(s,'vampire_invitation'));assert.equal(s.event.id,'vampire_offer');
});
test('already open older two-choice rare scenes retain their exact words and legal withdrawal',()=>{
 let s=fresh();s.nightEncounters={lastWeek:Math.floor(s.day/7),pending:'patron',day:s.day};s=E.chooseAction(s,'camp_rest');assert.deepEqual(s.event.choices.map(c=>c.id),['speak','leave']);s.event.body='The exact earlier scene.';const before=structuredClone(s.event);roundtrip(s);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))).event,before);s=roundtrip(E.chooseEventOption(s,'leave'));assert.equal(s.hero.condition,null);assert.equal(s.nightEncounters.invitations,undefined);
});
for(const [name,change] of [
 ['negative exposure',s=>s.nightEncounters.eligibleDays=-1],['future cursor',s=>s.nightEncounters.throughDay=s.day+1],['unlived exposure',s=>s.nightEncounters.eligibleDays=999999],['bad weekly count',s=>s.nightEncounters.checkedWeeks=-1],['another generation',s=>s.nightEncounters.invitations[0].generation++],['unseen place',s=>s.nightEncounters.invitations[0].locationId='invented'],['invalid point',s=>s.nightEncounters.invitations[0].hex='javascript:bad'],['future sighting',s=>s.nightEncounters.invitations[0].lastSeenDay=s.day+1],['duplicate invitation',s=>s.nightEncounters.invitations.push(structuredClone(s.nightEncounters.invitations[0]))],['fake search result',s=>s.nightEncounters.invitations[0].lastSearchResult='met'],
])test(`malformed discovery rejects ${name}`,()=>{const s=deferred();change(s);assert.equal(E.validateSave(s),false);});
test('a pending encounter cannot be assigned a different kind or a future observation day',()=>{
 for(const field of ['kind','noticedDay','week']){const s=structuredClone(patronMeeting);s.nightEncounters.meeting[field]=field==='kind'?'ranger':999999;assert.equal(E.validateSave(s),false);}
});

function vampire(line='velvet_sepulchre'){const s=fresh();s.locationId=s.world.locations.find(p=>isSettlement(s.world,p.id)).id;s.cartography.offsite=false;syncCartography(s);assert.ok(contractCurse(s,'vampire','A controlled prior bite',{},line));s.hero.condition.stage='changed';s.hero.condition.hunger=90;s.hero.hp=s.hero.maxHp;s.hero.mp=s.hero.maxMp;return roundtrip(s);}
function quietNeed(s,id='life_hunger'){const options=feedingChoices(s,id,[{id:'animal',label:'Animal'},{id:'donor',label:'Donor'},{id:id==='life_hunger'?'pause':'abstain',label:'Wait',description:'Wait.'}]);s.event={id,title:'A controlled offered need',category:'Vampirism',body:'A current meal.',choices:options};return roundtrip(s);}
for(const lineage of BLOOD_LINEAGES)test(`${lineage.name}: equivalent full animal meals match across day action, hunger need and attended feeding menu`,()=>{
 const start=vampire(lineage.id),need=quietNeed(structuredClone(start)),menu=quietNeed(structuredClone(start),'vampire_feeding');const expected=bloodMealRelief(start.hero.condition,'animal',45);assert.equal(need.event.choices[0].meal.baseAmount,45);assert.equal(menu.event.choices[0].meal.baseAmount,45);assert.ok(need.event.choices[0].description.includes(expected+' hunger'));const a=E.chooseAction(start,'curse_animal'),b=E.chooseEventOption(need,'animal'),c=E.chooseEventOption(menu,'animal');roundtrip(a);roundtrip(b);roundtrip(c);assert.equal(a.hero.condition.hunger,b.hero.condition.hunger);assert.equal(c.hero.condition.hunger,90-expected,'menu day was already attended');assert.equal(start.hero.condition.hunger,90);assert.equal(a.hero.condition.humanity,b.hero.condition.humanity);
});
test('equivalent new consenting donor meals use the same 60-hunger terms as named agreements',()=>{
 const s=vampire(),a=quietNeed(structuredClone(s)),b=quietNeed(structuredClone(s),'vampire_feeding');for(const n of [a,b]){const c=n.event.choices.find(c=>c.id==='donor');assert.equal(c.meal.baseAmount,60);assert.match(c.description,/60 hunger/);}const old=s.hero.gold,x=roundtrip(E.chooseEventOption(a,'donor'));assert.equal(x.hero.condition.hunger,32);assert.equal(x.hero.gold,old-8-(x.householdBudget.paidGold-a.householdBudget.paidGold));
});
test('older open full feeding and annual donor choices keep their original amounts and exact saved prose',()=>{
 for(const [id,pick,amount]of [['vampire_feeding','animal',28],['vampire_feeding','donor',50],['life_hunger','donor',65]]){const s=vampire();s.event={id,title:'Earlier saved meal',category:'Vampirism',body:'The earlier saved words.',choices:[{id:pick,label:'Original choice',description:'The exact old terms.'}]};roundtrip(s);const after=roundtrip(E.chooseEventOption(s,pick));assert.equal(after.hero.condition.hunger,90+(id==='life_hunger'?2:0)-amount);assert.equal(s.event.body,'The earlier saved words.');}
});
test('a small emergency ration and a paid infirmary portion state their distinct amounts',()=>{
 const s=vampire('gloamwing');s.justice.prison={locationId:s.locationId};const c=feedingChoices(s,'life_hunger',[{id:'animal',label:'Animal'}])[0];assert.equal(c.id,'jailer');assert.equal(c.meal.baseAmount,30);assert.match(c.description,/limited emergency animal ration/);assert.match(c.description,/23 hunger/);const paid=curseActions(s).find(a=>a.id==='curse_prison_blood'),free=curseActions(s).find(a=>a.id==='curse_prison_rations');assert.match(paid.description,/larger infirmary provision: up to 41 hunger/);assert.match(free.description,/limited emergency ration: up to 23 hunger/);
});
for(const change of [m=>m.baseAmount=999,m=>m.source='donor',m=>m.version=999,m=>m.extra=true])test('malformed captured meal terms reject unquoted benefits',()=>{
 const s=quietNeed(vampire());change(s.event.choices[0].meal);assert.equal(validateFeedingTerms(s.event),false);assert.equal(E.validateSave(s),false);const n=E.chooseEventOption(s,'animal');assert.equal(n.day,s.day);assert.equal(n.hero.gold,s.hero.gold);assert.equal(n.hero.condition.hunger,s.hero.condition.hunger);
});
test('lineage lore and actual combat weakness remain separate without inventing fire or silver damage rules',()=>{
 const s=vampire('ashen_choir'),view=curseView(s);assert.equal(view.weakness,'Sacred fire');assert.match(view.mechanics,/no separate elemental or silver damage multiplier/);const a=curseCombatNote(s.hero.condition,{}),b=curseCombatNote(s.hero.condition,{weakness:'radiance'});assert.match(a,/Sacred fire.*Active damage weakness: none recorded/);assert.match(b,/Active damage weakness: radiance/);assert.match(curseView(vampire('gloamwing')).mechanics,/Hunger rises 3.*34 relief/);
});
test('a read-only discovery view and note renderer retain names, uncertainty and escaped saved text',()=>{
 const s=deferred(),before=structuredClone(s),v=nightDiscoveryView(s),html=supernaturalNotes(s,plainUi,E.getActions(s));assert.match(v.rateText,/0\.12%/);assert.match(html,/return is uncertain/);assert.ok(html.includes(v.invitations[0].personName));assert.deepEqual(s,before);s.nightEncounters.invitations[0].personName='<img src=x>';assert.ok(!supernaturalNotes(s,plainUi).includes('<img src=x>'));
});
test('production Journal opens the remembered point without moving or accepting anything',async t=>{
 const s=deferred(),r=s.nightEncounters.invitations[0],ui=await mountApp(t,{states:[s],width:390,height:844});await ui.click('title-continue');await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');assert.ok(ui.root.querySelector('[data-supernatural-notes]'));assert.ok(ui.root.innerHTML.includes(r.personName));const before=structuredClone(ui.current());await ui.click('night-location',r.id);assert.deepEqual(ui.current(),before);assert.match(ui.root.innerHTML,/World|Explore/);assert.equal(ui.current().hero.condition,null);
});
test('production return search is a real night and still offers refusal before transformation',async t=>{
 const s=searchFixture(true),ui=await mountApp(t,{states:[s]});await ui.click('title-continue');await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');const day=ui.current().day;assert.ok(!ui.root.querySelector('[data-op="activity"][data-id="curse_revisit_patron"]'));await ui.click('night-location',s.nightEncounters.invitations[0].id);await ui.click('place-open');assert.equal(ui.root.controls.filter(c=>c.dataset.id==='curse_revisit_patron').length,1);await ui.click('activity','curse_revisit_patron');assert.equal(ui.current().day,day+1);assert.equal(ui.current().hero.condition,null);assert.ok(ui.root.controls.some(c=>c.dataset.op==='choice'&&c.dataset.id==='defer'));await ui.click('choice','defer');assert.equal(ui.current().hero.condition,null);roundtrip(ui.current());
});

test('an actually agreed named donor session matches a new full consenting meal',()=>{
 let s=vampire();s.hero.condition.hunger=20;for(const p of s.life.people.filter(p=>p.alive!==false&&p.age>=18)){p.bond=90;p.locationId=s.locationId;}
 const offers=E.getActions(s).filter(a=>a.id.startsWith('sanctuary_donor_'));assert.ok(offers.length);let agreement;
 for(const offer of offers){let n=roundtrip(E.chooseAction(s,offer.id));if(n.event?.choices.some(c=>c.id==='agree')){s=roundtrip(E.chooseEventOption(n,'agree'));agreement=s.sanctuaries.agreements.at(-1);break;}s=roundtrip(E.chooseEventOption(n,'animal'));}
 assert.ok(agreement,'a real named contact agreed through the public discussion');s.hero.condition.hunger=90;const before=s.hero.gold,billed=s.householdBudget.paidGold,day=s.day;s=roundtrip(E.chooseAction(s,'sanctuary_feed_'+agreement.id));assert.equal(s.day,day+1);assert.equal(s.hero.condition.hunger,32);assert.equal(before-s.hero.gold,8+s.householdBudget.paidGold-billed);
});
test('actual fire previews use the recorded weakness rather than vampire lineage lore',()=>{
 const s=vampire();s.hero.skills.arcana=5;s.hero.mp=s.hero.maxMp=40;const b=createBattle(s,'feral_vampire');b.currentActorId='hero';const target=b.actors.find(a=>a.side==='enemy');target.hp=target.maxHp=300;target.status={};target.resistances=[];delete target.weakness;const damage=[];
 for(const line of BLOOD_LINEAGES){target.illustration.condition.bloodline=line.id;const before=structuredClone(b),v=previewBattleAction(b,'spell_fire',target.id);assert.equal(v.legal,true);damage.push(-v.effects.find(e=>e.id===target.id).hp);assert.deepEqual(b,before);}
 assert.equal(new Set(damage).size,1,'Sacred fire and silver lore cannot create an unimplemented multiplier');target.weakness='fire';const matched=previewBattleAction(b,'spell_fire',target.id);assert.equal(-matched.effects.find(e=>e.id===target.id).hp,damage[0]+7);delete target.weakness;target.illustration.condition.bloodline='ashen_choir';const read=previewBattleAction(b,'inspect',target.id);assert.match(read.summary,/Sacred fire.*Active damage weakness: none recorded/);
});

for(const kind of ['patron','vampire'])test(`an actual ${kind} weekly encounter during a return search is recorded without a second spawned meeting`,()=>{
 let s=returnToMemory(deferred());for(let n=0;n<4;n++){const old=s.day;s=settle(E.chooseAction(s,'camp_rest'));assert.equal(s.day,old+2);}const week=Math.floor((s.day+1)/7);seedFixture(s,findSeed(seed=>rareRoll(s,seed,week)===typeRoll[kind],'search-intervening-'+kind));const old=structuredClone(s.nightEncounters.invitations[0]);s=roundtrip(E.chooseAction(s,'curse_revisit_patron'));assert.equal(s.event.id,'curse_rare_meeting');assert.equal(s.nightEncounters.pending,kind);assert.equal(s.nightEncounters.invitations.length,1);assert.equal(s.nightEncounters.invitations[0].status,'deferred');assert.equal(s.nightEncounters.invitations[0].personName,old.personName);assert.equal(s.nightEncounters.invitations[0].lastSearchResult,kind==='patron'?'met':'interrupted');assert.equal(s.hero.condition,null);
});
test('a mixed old and new invitation keeps the older missing return point explicitly unknown',()=>{
 const s=deferred('ranger');s.nightEncounters.patronMet=true;const before=structuredClone(s),v=nightDiscoveryView(s);assert.equal(v.invitations.length,1);assert.match(v.legacyKnown,/precise return point were not saved/);assert.equal(v.invitations.some(r=>r.kind==='patron'),false);assert.deepEqual(s,before);roundtrip(s);
});
test('a current condition or existing attended commitment cannot be bypassed by a remembered invitation',()=>{
 const s=returnToMemory(deferred()),before=structuredClone(s.nightEncounters);s.health.recovery={title:'Existing care',locationId:s.locationId,kind:'free',totalDays:14,attendedDays:0,remainingDays:14,careDays:0,startedDay:s.day,fee:0,paid:false};assert.equal(nightDiscoveryActions(s).length,0);assert.match(nightDiscoveryView(s).invitations[0].returnReason,/existing commitment/);assert.equal(applyNightDiscoveryAction(s,'curse_revisit_patron',{}),false);assert.deepEqual(s.nightEncounters,before);s.health.recovery=null;contractCurse(s,'vampire','A separate actual bite');assert.equal(nightDiscoveryActions(s).length,0);assert.match(nightDiscoveryView(s).invitations[0].returnReason,/already active/);roundtrip(s);
});
