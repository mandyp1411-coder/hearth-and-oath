import { atService } from './helpers/service-visit.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { personalServicesAt, personalServiceActions } from '../dist/js/personal-services.js';
import { rememberAnnualScene } from '../dist/js/annual-world-memory.js';
import { birthEvent, applyBirthChoice, validateTimeline } from '../dist/js/birth.js';
import { onRealmTime, validateRealm } from '../dist/js/realm.js';
import { onRpgTime } from '../dist/js/rpg-depth-v27.js';
import { storyActions, validateStories } from '../dist/js/life-stories.js';
import { localLawWindow } from '../dist/js/local-law-window.js';
import { onEvidence, onSanctuaryTime, flushSanctuaryEvent, validateSanctuaries } from '../dist/js/sanctuaries.js';
import { flushJustice } from '../dist/js/justice.js';
import { communityOperation, communityView, communitySupport, onCommunityTime, flushCommunityEvent, applyCommunityChoice, validateCommunity } from '../dist/js/community.js';
import { initializeCampaign, applyCampaignChoice, validateCampaign } from '../dist/js/campaign.js';
import { endingLossLedger, renderEndingLosses } from '../dist/js/ending-losses.js';
import { flushPersonalAllegation, validateStoryAllegations } from '../dist/js/story-allegations.js';
import { validateReleaseFields } from '../dist/js/release-v25-validation.js';
import { syncCartography } from '../dist/js/cartography.js';
import { seededRoll } from '../dist/js/world.js';
import { mountApp } from './helpers/ui-surface.mjs';

// Controlled regression fixtures, not extra audit lives, recruited reviewers,
// long-term balance telemetry, or browser/device layout measurements.
function roundtrip(s){assert.ok(E.validateSave(s),JSON.stringify({event:s.event?.id,stories:validateStories(s.stories,s),timeline:validateTimeline(s.timeline,s),sanctuaries:validateSanctuaries(s.sanctuaries,s),campaign:validateCampaign(s.campaign,s),realm:validateRealm(s.realm,s),release:validateReleaseFields(s)}));assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(s))),s);return s;}
function choose(s,id){assert.ok(s.event?.choices.some(c=>c.id===id&&!c.disabledReason),`${s.event?.id} offers ${id}`);return roundtrip(E.chooseEventOption(s,id));}
function act(s,id){
  s=atService(s,id);const a=E.getActions(s).find(a=>a.id===id);assert.ok(a,id);assert.ok(!a.disabledReason,a.disabledReason);return roundtrip(E.chooseAction(s,id));}
function settle(s){for(let n=0;n<200;n++){
 if(s.event){const a=s.event.choices.find(c=>['care','keep','later','quiet','defend','record','listen','continue','support'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,a.id);}
 else if(s.stories?.project)s=E.chooseAction(s,'stories_continue');
 else if(s.community?.project?.commitment)s=E.chooseAction(s,'community_continue');
 else if(s.timeline?.yearTarget!=null)s=E.continueAgeUp(s);
 else return roundtrip(s);
 }throw Error('Fixture did not settle');}
const base=settle(await createLifeAtAge({seed:'world-focus-eleven',originId:'hearthborn',startAge:22,difficulty:'gentle'}));
function fresh(){const s=structuredClone(base);s.hero.gold=50000;return s;}
function ageTo(s,age){while(s.age<age)s=settle(E.ageUp(s));return s;}
function pendingBirthday(s){s=E.ageUp(s);for(let n=0;n<200;n++){if(s.event?.id==='birth_adult_year')return roundtrip(s);if(s.event)s=choose(s,s.event.choices.find(c=>['care','keep','listen','continue'].includes(c.id)&&!c.disabledReason)?.id||s.event.choices.find(c=>!c.disabledReason).id);else if(s.timeline.yearTarget!==null)s=E.continueAgeUp(s);else break;}throw Error('The actual birthday did not open');}
function open(s,id){const n=act(s,'stories_open_'+id);assert.equal(n.event.id,'stories_chapter');return n;}
function chapter(s,id,pick='care'){return settle(choose(open(s,id),pick));}
function context(s){return {journal(){},journalLiteral(){},standing(key,n){s.factions[key]=Math.max(-100,Math.min(100,s.factions[key]+n));},remember(){},witnesses(){return [];},addObligation(){},breakOath(){s.flags.fixtureOathBreach=true;},setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};},spendDays(days){const oldDay=s.day;s.day+=days;s.age=Math.floor((s.day-(s.timeline.birthDay||0))/365);onSanctuaryTime(s,{oldDay,newDay:s.day},this);return days;},addEvidence(n,description){let i=s.legal.incidents.find(i=>i.locationId===s.locationId);if(!i){i={locationId:s.locationId,evidence:0,description};s.legal.incidents.push(i);}i.evidence+=n;i.description=description;onEvidence(s,n,description,this);}};}
function report(s,n=3){const ctx=context(s);ctx.addEvidence(n,'A named market clerk retained the signed delivery receipt.');return s.sanctuaries.cases.at(-1);}
function escapeFixture(){let s=fresh();s.hero.skills.stealth=20;s.hero.attributes.agility=20;
 for(let i=0;seededRoll(s.seed,`case-flight-local-case-${s.sanctuaries.sequence+1}-${s.day}`,100)>=90&&i<20;i++)s=settle(act(s,'life_rest'));
 const c=report(s);s=act(s,'sanctuary_review_'+s.locationId);s=choose(s,'escape');assert.equal(s.sanctuaries.cases.find(v=>v.id===c.id).status,'fugitive');return s;
}
function serviceFixture(){let s=ageTo(fresh(),30);s=settle(act(s,'career_choose_blacksmith'));for(let n=0;n<50;n++)s=settle(act(s,'career_work'));assert.ok(s.careers.records.Blacksmith.workedDays>=150);const start=s.age,ids=['night_door','own_key','winter_commons'];for(const id of ids)s=chapter(s,id);s=ageTo(s,start+1);for(const id of ids)s=chapter(s,id);s=ageTo(s,start+3);for(const [i,id]of ids.entries())s=chapter(s,id,['care','enterprise','coercion'][i]);return roundtrip(s);}
const serviceBase=serviceFixture();
function forgeryFixture(){let s=chapter(fresh(),'hearth_letter');s=ageTo(s,23);s=open(s,'hearth_letter');assert.match(s.event.choices.find(c=>c.id==='coercion').description,/forgery allegation/);return settle(choose(s,'coercion'));}
const forgeryBase=forgeryFixture();
function filedFixture(){const s=act(structuredClone(forgeryBase),'life_rest');assert.equal(s.event?.id,'stories_allegation');return s;}
const ui={e:String};

test('three independently earned story services remain accessible together after reload',()=>{
 const s=structuredClone(serviceBase),before=structuredClone(s),rows=personalServicesAt(s);assert.deepEqual(rows.map(v=>v.storyId),['night_door','own_key','winter_commons']);assert.equal(new Set(personalServiceActions(s).map(a=>a.id)).size,3);assert.match(personalServiceActions(s).find(a=>a.id==='stories_service_winter_commons').label,/commons/);storyActions(s);assert.deepEqual(s,before);roundtrip(s);
});
test('using one service preserves each other service and its separate cooldown',()=>{
 let s=structuredClone(serviceBase);s.hero.hp=s.hero.maxHp-30;const day=s.day,hp=s.hero.hp,skill=s.hero.skills.scholarship,gold=s.hero.gold,billed=s.householdBudget.paidGold;s=act(s,'stories_service_night_door');assert.equal(s.day,day+1);assert.equal(s.hero.hp,hp+15);assert.equal(s.hero.skills.scholarship,skill);assert.equal(s.hero.gold,gold-(s.householdBudget.paidGold-billed));assert.ok(personalServiceActions(s).find(a=>a.id==='stories_service_night_door').disabledReason);assert.ok(!personalServiceActions(s).find(a=>a.id==='stories_service_own_key').disabledReason);s=act(s,'stories_service_own_key');assert.equal(s.hero.gold,gold-5-(s.householdBudget.paidGold-billed));assert.equal(s.hero.skills.scholarship,skill+1);assert.ok(!personalServiceActions(s).find(a=>a.id==='stories_service_winter_commons').disabledReason);roundtrip(s);
});
test('a legacy single service keeps its real last use while other proved completed services can be recovered',()=>{
 let s=structuredClone(serviceBase);delete s.realm.sites[s.locationId].personalServices;s.realm.sites[s.locationId].personalService={...personalServicesAt(serviceBase).find(v=>v.storyId==='night_door'),lastUsedDay:s.day};const before=structuredClone(s);assert.equal(personalServicesAt(s).length,3);assert.ok(personalServiceActions(s).find(a=>a.id==='stories_service_night_door').disabledReason);assert.equal(personalServicesAt(s).find(v=>v.storyId==='own_key').lastUsedDay,undefined);assert.deepEqual(s,before);s=act(s,'stories_service_own_key');assert.equal(s.realm.sites[s.locationId].personalServices.night_door.lastUsedDay,before.day);roundtrip(s);
});
test('an uncompleted or unmaterialized old arc cannot invent a service',()=>{
 const s=fresh(),a=structuredClone(serviceBase.stories.arcs.find(a=>a.id==='own_key'));a.status='active';a.chapter=2;a.choices=a.choices.slice(0,2);a.outcome=null;s.stories.arcs=[a];assert.equal(personalServicesAt(s).length,0);a.status='completed';a.chapter=3;a.choices=structuredClone(serviceBase.stories.arcs.find(a=>a.id==='own_key').choices);a.outcome='care';a.contentVersion=1;assert.equal(personalServicesAt(s).length,0);
});
test('a closed settlement retains service history but cannot provide its rewards',()=>{
 const s=structuredClone(serviceBase);s.world.locations.find(p=>p.id===s.locationId).status='destroyed';s.world.locations.find(p=>p.id===s.locationId).servicesAvailable=false;assert.equal(personalServicesAt(s).length,3);assert.ok(personalServiceActions(s).every(a=>/closed/.test(a.disabledReason)));const before=structuredClone(s);assert.deepEqual(E.chooseAction(s,'stories_service_night_door').hero,before.hero);
});
for(const field of ['unknown','wrong_identity','future_use','bad_rule'])test(`malformed independent service ${field} is rejected`,()=>{
 const s=structuredClone(serviceBase),m=s.realm.sites[s.locationId].personalServices;if(field==='unknown')m.imagined={...m.own_key};if(field==='wrong_identity')m.own_key.storyId='winter_commons';if(field==='future_use')m.own_key.lastUsedDay=s.day+1;if(field==='bad_rule')m.own_key.rule='free_money';assert.equal(E.validateSave(s),false);
});

test('successful public hearing escape preserves its promised seven-day window without an immediate generic arrest',()=>{
 const s=escapeFixture(),c=s.sanctuaries.cases.at(-1);assert.equal(c.returnDay,s.day+7);assert.equal(c.protectedEvidence,4);assert.notEqual(s.event?.id,'justice_arrest');assert.equal(s.justice.arrest,null);assert.equal(localLawWindow(s).hold,true);roundtrip(s);
});
test('the saved escape window is read-only and still protects an older case with no captured evidence count',()=>{
 const s=escapeFixture();delete s.sanctuaries.cases.at(-1).protectedEvidence;const before=structuredClone(s);assert.equal(localLawWindow(s).hold,true);flushJustice(s,context(s));assert.equal(s.event,null);assert.deepEqual(s,before);roundtrip(s);
});
test('the exact return date produces the local capture scene once, rather than a competing generic arrest',()=>{
 const s=escapeFixture(),c=s.sanctuaries.cases.at(-1),old=s.day;s.day=c.returnDay;onSanctuaryTime(s,{oldDay:old,newDay:s.day},context(s));flushJustice(s,context(s));assert.equal(s.event,null);assert.ok(flushSanctuaryEvent(s,context(s)));assert.equal(s.event.id,'sanctuary_case_capture');assert.equal(c.status,'captured');assert.equal(s.justice.arrest,null);const before=structuredClone(s);onSanctuaryTime(s,{oldDay:old,newDay:s.day},context(s));assert.deepEqual(s,before);assert.ok(validateSanctuaries(s.sanctuaries,s));
});
test('remaining away from the reporting settlement cannot spread a saved fugitive case',()=>{
 const s=escapeFixture(),c=s.sanctuaries.cases.at(-1),old=s.day;s.locationId='city';syncCartography(s);s.day=c.returnDay+2;onSanctuaryTime(s,{oldDay:old,newDay:s.day},context(s));flushJustice(s,context(s));assert.equal(s.event,null);assert.equal(c.status,'fugitive');assert.equal(s.legal.incidents.some(i=>i.locationId==='city'),false);s.locationId=c.locationId;syncCartography(s);assert.ok(flushSanctuaryEvent(s,context(s)));assert.equal(s.event.id,'sanctuary_case_capture');
});
test('a genuine new witnessed charge during the escape window names its source instead of ignoring the earlier promise',()=>{
 const original=escapeFixture(),c=original.sanctuaries.cases.at(-1);let found=false;
 for(let n=0;n<7;n++){const s=structuredClone(original);s.day+=n;context(s).addEvidence(2,'The stall keeper witnessed a separate new burglary after the hearing escape.');s.justice.lastCheckDay=-1;flushJustice(s,context(s));if(s.event?.id==='justice_arrest'){assert.match(s.event.body,/earlier local case keeps its return date/);assert.match(s.event.body,/separate new burglary/);assert.ok(s.event.body.includes(String(c.returnDay)));found=true;break;}}
 assert.equal(found,true,'at least one ordinary patrol check reached the recorded enforcement threshold');
});
test('a newly witnessed charge on a legacy escape records its old baseline before adding new evidence',()=>{
 const s=escapeFixture(),c=s.sanctuaries.cases.at(-1);delete c.protectedEvidence;context(s).addEvidence(1,'A different named witness reported a new local theft.');assert.equal(c.protectedEvidence,4);assert.equal(c.evidence,5);assert.equal(localLawWindow(s).independent,true);
});
test('a voluntary hearing and its attended payment are not interrupted by a duplicate patrol for the same report',()=>{
 let s=escapeFixture();s=act(s,'sanctuary_review_'+s.locationId);assert.equal(s.event.id,'sanctuary_case_hearing');const day=s.day;s=choose(s,'pay');assert.equal(s.day,day+2);assert.equal(s.legal.incidents.length,0);assert.equal(s.justice.arrest,null);assert.notEqual(s.event?.id,'justice_arrest');roundtrip(s);
});

for(const choice of ['care','curiosity','courage'])for(const title of ['A warning before the long road','The festival work nobody planned','A commission with an unnamed buyer','A household asks for quiet company'])test(`annual ${title} recalls its earlier ${choice} decision without changing numerical terms`,()=>{
 const s=fresh(),source={scenarioId:'adult-fixture',title,body:'The initial edition.',choices:['care','curiosity','courage'].map(id=>({id,label:id,description:'Existing offer.',outcome:'Earlier ending.',effect:{gold:2}}))};s.timeline.yearHistory.push({id:'earlier-fixture',age:20,day:20*365,title,summary:'The original choice was completed.',choice,locationId:s.locationId});const before=structuredClone(s),next=rememberAnnualScene(s,source);assert.match(next.body,/At age 20/);assert.notEqual(next.body,source.body);assert.deepEqual(next.choices.map(c=>c.effect),source.choices.map(c=>c.effect));assert.ok(next.body.split(/\s+/).length<115);assert.deepEqual(s,before);
});
test('new annual birthday wording and its recorded outcome remain identical across reload',()=>{
 let s=ageTo(fresh(),24);s=E.ageUp(s);for(let n=0;n<100&&s.event?.id!=='birth_adult_year';n++){if(s.event)s=choose(s,s.event.choices.find(c=>!c.disabledReason).id);else s=E.continueAgeUp(s);}assert.equal(s.event.id,'birth_adult_year');const snap=structuredClone(s.timeline.annualScene);roundtrip(s);s=choose(s,'care');assert.equal(s.timeline.yearHistory.at(-1).summary,snap.outcomes[0]);assert.equal(s.timeline.yearHistory.at(-1).locationId,snap.locationId);assert.equal(s.timeline.annualScene,undefined);roundtrip(s);
});
test('a newly open annual callback does not change an older already-open birthday without its new snapshot',()=>{
 const s=pendingBirthday(fresh());delete s.timeline.annualScene;const old=structuredClone(s.event);const prior=structuredClone(s.timeline.yearHistory),loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(loaded);assert.deepEqual(loaded.event,old);assert.deepEqual(loaded.timeline.yearHistory,prior);assert.equal(loaded.timeline.annualScene,undefined);roundtrip(loaded);
});
test('annual memory from a known different settlement does not impersonate this locality',()=>{
 const s=fresh(),source={title:'The festival work nobody planned',body:'New local work.',choices:[]};s.timeline.yearHistory.push({id:'remote-memory',age:20,day:20*365,title:source.title,summary:'A completed remote repair.',choice:'care',locationId:s.locationId==='city'?'home':'city'});assert.deepEqual(rememberAnnualScene(s,source),source);
});

test('one saved war grievance appears in its announcement, later account and realm view without a second cause roll',()=>{
 const s=fresh(),old=s.day;delete s.realm.politics;s.realm.wars=s.realm.wars.filter(w=>w.politicalVersion!==33);/* Controlled pre-politics cadence; modern political wars are outside this module fixture. */s.day=24*365;s.age=24;onRealmTime(s,old,s.day,context(s));const war=s.realm.wars.find(w=>w.id==='war-24');assert.ok(war);const announcement=s.realm.history.find(h=>h.text.includes('enter open conflict')&&h.text.includes(war.grievance));assert.ok(announcement);onRpgTime(s,{oldDay:old,newDay:s.day},context(s));assert.equal(s.rpg.warAccounts.find(a=>a.warId===war.id).cause,war.grievance);assert.ok(validateRealm(s.realm,s));
});
test('old war causes and their already-written announcements are not retroactively rewritten',()=>{
 const s=fresh(),before=structuredClone(s.realm),loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.realm,before);
});

function communityFixture(){let s=fresh();for(const id of Object.keys(s.equipment.materials))s.equipment.materials[id]=200;s=act(s,'community_begin_learning');s=choose(s,'open');for(let n=0;n<3;n++)s=settle(act(s,'community_stage'));return s;}
const communityBase=communityFixture();
for(const [state,label]of [['operating','Funded and serving'],['unfunded','Unfunded'],['suspended','Suspended'],['closed','Site closed']])test(`institution ${state} is distinct from its settlement’s civic status`,()=>{
 const s=structuredClone(communityBase),w=s.community.works.at(-1);if(state==='unfunded'){const old=s.day;s.day=w.completedDay+10*365+1;s.age=Math.floor(s.day/365);onCommunityTime(s,{oldDay:old,newDay:s.day},context(s));}if(state==='suspended')w.enabled=false;if(state==='closed'){s.world.locations.find(p=>p.id===w.locationId).status='destroyed';s.world.locations.find(p=>p.id===w.locationId).servicesAvailable=false;}const before=structuredClone(s),v=communityOperation(s,w);assert.equal(v.status,state);assert.ok(v.label.includes(label));assert.equal(v.siteOpen,state!=='closed');assert.equal(communityView(s).works.at(-1).operating,state==='operating');assert.deepEqual(s,before);assert.ok(validateCommunity(s.community,s));if(state!=='operating')assert.equal(communitySupport(s,w.locationId).schoolFeeDiscount,0);
});
test('an unfunded review explains the open town, paused service, real reserve and beneficiaries together',()=>{
 const s=structuredClone(communityBase),w=s.community.works.at(-1),old=s.day;s.day=w.completedDay+10*365+1;s.age=Math.floor(s.day/365);onCommunityTime(s,{oldDay:old,newDay:s.day},context(s));s.community.queue=[];s.community.pending={eventId:'community_review',workId:w.id,offeredDay:s.day};const gold=s.hero.gold;assert.ok(flushCommunityEvent(s,context(s)));assert.match(s.event.body,/remains an open settlement/);assert.match(s.event.body,/not providing its funded services/);assert.ok(s.event.body.includes(String(w.operatingBalance)));assert.ok(s.event.body.includes(w.beneficiaries[0].name));s.event=null;assert.ok(applyCommunityChoice(s,'community_review','reopen',context(s)));assert.equal(s.hero.gold,gold);assert.equal(communityOperation(s,w).status,'unfunded','a no-cost review cannot invent endowment');
});

function endingFixture(route='renew'){
 const s=fresh();s.campaign.ending=null;s.campaign.stage='final';s.campaign.act=4;s.campaign.completed=[];s.campaign.pending={questId:'final',side:false};s.campaign.facts.plannedEnding=route;
 const target=s.world.locations.find(p=>p.id!=='home'&&p.id!=='city'&&p.id!=='citadel'&&p.id!=='camp'&&p.services?.length&&p.type!=='gate');target.status='destroyed';target.servicesAvailable=false;s.world.changes.push({id:'earlier-war-loss',day:s.day-10,locationId:target.id,title:'A settlement lost',text:`War leaves ${target.name} in ruins.`,source:'war',warId:'recorded-fixture-war'});return {s,target};
}
for(const route of ['renew','shatter','haven'])test(`the ${route} ending separates earlier war losses from actual final-choice losses`,()=>{
 const {s,target}=endingFixture(route);assert.ok(applyCampaignChoice(s,'quest_final','testimony',context(s)));const ledger=s.campaign.ending.losses;assert.ok(ledger.earlier.some(r=>r.locationId===target.id&&r.source==='war'));assert.equal(ledger.choice.some(r=>r.locationId===target.id),false);assert.match(s.campaign.ending.summary,/Earlier war losses remain/);if(route==='renew')assert.equal(ledger.choice.length,0);if(route==='shatter')assert.ok(ledger.choice.some(r=>r.locationId==='citadel'&&r.status==='destroyed'));if(route==='haven')assert.ok(ledger.choice.some(r=>r.locationId==='home'&&r.status==='evacuated'));assert.ok(validateCampaign(s.campaign,s));assert.match(renderEndingLosses(s,ui),/Losses already present/);
});
test('an already destroyed place cannot acquire a second final-choice destruction record',()=>{
 const {s}=endingFixture('shatter'),p=s.world.locations.find(p=>p.id==='citadel');p.status='destroyed';p.servicesAvailable=false;s.world.changes.push({id:'old-citadel-war',locationId:p.id,day:s.day-1,title:'A settlement lost',text:`War leaves ${p.name} in ruins.`,source:'war'});assert.ok(applyCampaignChoice(s,'quest_final','testimony',context(s)));assert.equal(s.campaign.ending.losses.choice.some(r=>r.locationId===p.id),false);assert.equal(s.world.changes.some(c=>c.id.startsWith('covenant-citadel-destroyed')),false);
});
test('older ending text remains exact while dated earlier war and covenant accounts can be distinguished',()=>{
 const {s,target}=endingFixture('shatter');applyCampaignChoice(s,'quest_final','testimony',context(s));delete s.campaign.ending.losses;const ending=structuredClone(s.campaign.ending),world=structuredClone(s.world),v=endingLossLedger(s);assert.equal(v.reconstructed,true);assert.ok(v.earlier.some(r=>r.locationId===target.id));assert.ok(v.choice.some(r=>r.locationId==='citadel'));assert.deepEqual(s.campaign.ending,ending);assert.deepEqual(s.world,world);s.world.changes.push({id:'later-war',day:s.day+5,locationId:'city',title:'A settlement lost',text:'War leaves the later city in ruins.',source:'war'});assert.equal(endingLossLedger(s).choice.some(r=>r.locationId==='city'),false);
});

test('forgery discloses the bounded report risk before commitment and does not immediately create official evidence',()=>{
 const s=structuredClone(forgeryBase),r=s.stories.allegations[0];assert.equal(r.readyDay,r.completedDay+7);assert.equal(r.status,'waiting');assert.equal(s.legal.incidents.length,0);assert.equal(s.stories.arcs.find(a=>a.id==='hearth_letter').choices[1].legalNoticeVersion,1);roundtrip(s);
});
test('only a living named witness actually present in the reporting locality can file the retained document',()=>{
 for(const unavailable of ['remote','dead']){const s=structuredClone(forgeryBase),r=s.stories.allegations[0],p=s.life.people.find(p=>p.id===r.witnessId);s.day=r.readyDay;if(unavailable==='remote')p.locationId='city';else p.alive=false;assert.equal(flushPersonalAllegation(s,context(s)),false);assert.equal(s.legal.incidents.length,0);assert.equal(r.status,'waiting');}
});
test('a new forgery allegation names its original witness and documents, stays local and is not a conviction',()=>{
 const s=filedFixture(),r=s.stories.allegations[0];assert.equal(r.status,'reported');assert.ok(s.event.body.includes(r.witnessName));assert.match(s.event.body,/disputed forgery allegation/);assert.equal(s.legal.incidents.length,1);assert.equal(s.legal.incidents[0].locationId,r.locationId);assert.equal(s.legal.incidents[0].evidence,1);assert.equal(s.legal.wanted,false);roundtrip(s);
});
test('a poor character can enter a defense without a fee, confession or automatic conviction',()=>{
 let s=filedFixture();s.hero.gold=0;s=choose(s,'defend');const r=s.stories.allegations[0];assert.equal(r.response,'defend');assert.equal(s.hero.gold,0);assert.equal(s.legal.incidents[0].evidence,1);assert.equal(s.justice.prison,null);assert.ok(['sanctuary_case_accusation','sanctuary_case_hearing'].includes(s.event?.id));roundtrip(s);
});
test('correcting the claim pays once, preserves the historical forgery and does not clear unrelated evidence',()=>{
 let s=filedFixture();const r=s.stories.allegations[0];context(s).addEvidence(2,'A separate named merchant retained evidence of a different theft.');const gold=s.hero.gold,day=s.day,oldChoice=structuredClone(s.stories.arcs.find(a=>a.id==='hearth_letter').choices[1]);s=choose(s,'correct');assert.equal(s.hero.gold,gold-12);assert.equal(s.day,day);assert.equal(s.legal.incidents[0].evidence,2);assert.match(s.legal.incidents[0].description,/different theft/);assert.deepEqual(s.stories.arcs.find(a=>a.id==='hearth_letter').choices[1],oldChoice);assert.equal(s.stories.allegations[0].response,'correct');const again=E.chooseEventOption(s,'correct');assert.equal(again.hero.gold,s.hero.gold);roundtrip(s);
});
test('a voluntary correction answers only its allegation and the next chapter acknowledges the already-filed correction',()=>{
 let s=choose(filedFixture(),'correct');assert.equal(s.legal.incidents.length,0);s=ageTo(settle(s),25);s=open(s,'hearth_letter');assert.match(s.event.body,/correction is already filed/);assert.match(s.event.body,/altered sole-key claim is withdrawn/);assert.doesNotMatch(s.event.body,/whose name should control the room/);roundtrip(s);
});
test('threatening the actual document witness creates a distinct sourced legal consequence',()=>{
 let s=filedFixture();const name=s.stories.allegations[0].witnessName;s=choose(s,'pressure');assert.equal(s.legal.incidents[0].evidence,3);assert.ok(s.legal.incidents[0].description.includes(name));assert.match(s.legal.incidents[0].description,/witnessed your threat/);assert.equal(s.stories.allegations[0].response,'pressure');roundtrip(s);
});
test('older already-committed story work is not retroactively assigned a new law consequence',()=>{
 let s=chapter(fresh(),'hearth_letter');s=open(ageTo(s,23),'hearth_letter');delete s.stories.pending.legalPlan;const option=s.event.choices.find(c=>c.id==='coercion');option.description=option.description.split(' A retained agreement')[0];roundtrip(s);s=settle(choose(s,'coercion'));assert.equal(s.stories.allegations,undefined);assert.equal(s.stories.arcs.find(a=>a.id==='hearth_letter').choices[1].legalNoticeVersion,undefined);s=settle(act(s,'life_rest'));assert.notEqual(s.event?.id,'stories_allegation');roundtrip(s);
});
for(const field of ['source_choice','witness','timing','foreign_owner'])test(`malformed allegation ${field} cannot become a valid save`,()=>{
 const s=filedFixture(),r=s.stories.allegations[0];if(field==='source_choice')s.stories.arcs.find(a=>a.id==='hearth_letter').choices[1].id='care';if(field==='witness')r.witnessName='Someone never recorded in the story';if(field==='timing')r.readyDay=r.completedDay;if(field==='foreign_owner')r.ownerId='another-generation';assert.equal(E.validateSave(s),false);
});

test('production service buttons name and execute their own service without touching a neighboring saved life',async t=>{
 const s=structuredClone(serviceBase),neighbor=fresh(),surface=await mountApp(t,{states:[s,neighbor]});await surface.click('title-continue');await surface.click('tab','activities');const before=structuredClone(surface.current());assert.ok(surface.root.querySelector('[data-op="activity"][data-id="stories_service_own_key"]'));await surface.click('activity','stories_service_own_key');assert.equal(surface.current().day,before.day+1);assert.equal(surface.current().hero.gold,before.hero.gold-5-(surface.current().householdBudget.paidGold-before.householdBudget.paidGold));assert.equal(surface.current().realm.sites[s.locationId].personalServices.own_key.lastUsedDay,surface.current().day);assert.deepEqual(surface.lives()[1],neighbor);
});
test('production allegation presents a named disputed report and allows the free defense response',async t=>{
 const s=filedFixture(),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');assert.ok(surface.root.innerHTML.includes(s.stories.allegations[0].witnessName));assert.match(surface.root.innerHTML,/not a conviction/);const gold=surface.current().hero.gold;await surface.click('choice','defend');assert.equal(surface.current().hero.gold,gold);assert.equal(surface.current().stories.allegations[0].response,'defend');roundtrip(surface.current());
});
test('a public seven-day hearing deferral protects its old report and returns to a hearing on its actual date',()=>{
 let s=fresh();report(s);s=act(s,'sanctuary_review_'+s.locationId);s=choose(s,'later');const c=s.sanctuaries.cases.at(-1);assert.equal(c.status,'deferred');assert.equal(c.returnDay,s.day+7);assert.equal(c.protectedEvidence,3);assert.equal(s.event,null);roundtrip(s);const old=s.day;s.day=c.returnDay;onSanctuaryTime(s,{oldDay:old,newDay:s.day},context(s));flushJustice(s,context(s));assert.equal(s.event,null);assert.ok(flushSanctuaryEvent(s,context(s)));assert.equal(s.event.id,'sanctuary_case_hearing');assert.equal(c.status,'hearing');
});
test('a legacy reconstruction completed before an old ending is not presented as a still-unresolved war loss',()=>{
 const {s,target}=endingFixture('renew');applyCampaignChoice(s,'quest_final','testimony',context(s));delete s.campaign.ending.losses;s.world.changes.push({id:'dated-reconstruction',day:s.campaign.ending.day-1,locationId:target.id,title:'A hearth returns',text:'Four real reconstruction stages established a new settlement.'});target.status='thriving';assert.equal(endingLossLedger(s).earlier.some(r=>r.locationId===target.id),false);
});
test('duplicate or detached newly recorded allegations are rejected rather than filed repeatedly',()=>{
 const first=filedFixture();first.stories.allegations.push({...first.stories.allegations[0],id:'duplicate-source'});assert.equal(E.validateSave(first),false);const second=filedFixture();second.stories.allegationPending=null;assert.equal(E.validateSave(second),false);const third=structuredClone(forgeryBase);delete third.stories.allegations;assert.equal(E.validateSave(third),false);
});
test('production settlement inspection exposes all independently earned local service buttons',async t=>{
 const surface=await mountApp(t,{states:[structuredClone(serviceBase)]});await surface.click('title-continue');await surface.click('tab','map');await surface.click('place-open');assert.ok(surface.root.querySelector('[data-personal-services]'));for(const id of ['night_door','own_key','winter_commons'])assert.ok(surface.root.querySelector(`[data-op="activity"][data-id="stories_service_${id}"]`));
});
test('production community cards show an unfunded institution separately from its open town',async t=>{
 const s=ageTo(structuredClone(communityBase),33);assert.equal(communityOperation(s,s.community.works.at(-1)).status,'unfunded');roundtrip(s);const surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('tab','life');await surface.click('workspace-section','life:plans');assert.deepEqual(surface.current(),s,'reviewing the institution changes no world account');assert.ok(surface.root.querySelector('[data-institution-operation]'));assert.match(surface.root.innerHTML,/Unfunded/);assert.match(surface.root.innerHTML,/remains an open settlement/);
});
test('production ending display renders attributed losses without rewriting a saved older ending',async t=>{
 const s=E.migrateSave(JSON.parse(fs.readFileSync(new URL('./fixtures/campaign-shatter.json',import.meta.url),'utf8')));assert.ok(s?.campaign.ending);const before=structuredClone(s.campaign.ending),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');assert.ok(surface.root.querySelector('[data-ending-losses]'));assert.deepEqual(surface.current().campaign.ending,before);
});
