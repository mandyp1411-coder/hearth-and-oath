import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {LIFE_STORIES,applyStoryAction,applyStoryChoice,validateStories} from '../dist/js/life-stories.js';
import {applyRpgAction,applyRpgChoice,regionalAnchor} from '../dist/js/rpg-depth-v27.js';
import {REGIONAL_STORIES_V27} from '../dist/js/regional-stories-v27.js';
import {editionEvent,editionStoryRow} from '../dist/js/narrative-edition.js';
import {captureStoryRow} from '../dist/js/story-continuity.js';
import {flushPersonalAllegation,applyPersonalAllegationChoice} from '../dist/js/story-allegations.js';
import {syncCartography} from '../dist/js/cartography.js';
import {STORY_FLAVOR,flavoredCompletion} from '../dist/js/story-flavor.js';
import {mountApp} from './helpers/ui-surface.mjs';

// Controlled fixtures based on an existing genuine save, not additional played
// lives. Unit attendance isolates narrative from recurring living expenses.
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
const personalId='hearth_letter',regionalId='rainward_last_lantern',picks=['care','enterprise','coercion'];
function fresh(){const s=structuredClone(base);s.hero.gold=10000;s.hero.profession='Scholar';s.careers.records.Scholar.reputation=40;s.factions.villagers=0;for(const p of s.life.people)if(p.alive!==false){p.bond=45;if(Number.isFinite(p.relationship))p.relationship=45;}return s;}
function roundtrip(s){assert.ok(E.validateSave(s),'save validates, stories='+validateStories(s.stories,s));const copy=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(copy,s);return copy;}
function ctx(s,limit=Infinity){return {
 setEvent(id,title,category,body,choices){s.event=editionEvent(s,{id,title,category,body,choices});},
 spendDays(n){const days=Math.min(n,limit);s.day+=days;return days;},
 standing(key,n){s.factions[key]=Math.max(-100,Math.min(100,s.factions[key]+n));},
 journal(){},journalLiteral(){},breakOath(){s.flags.fixtureFlavorOathBreach=true;},
 addEvidence(n,description){let record=s.legal.incidents.find(i=>i.locationId===s.locationId);if(!record){record={locationId:s.locationId,evidence:0,description};s.legal.incidents.push(record);}record.evidence+=n;record.description=description;}
 };}
const personalArc=s=>s.stories.arcs.find(a=>a.id===personalId);
function openPersonal(s=fresh()){const a=personalArc(s);if(a)a.nextAge=s.age;assert.equal(applyStoryAction(s,'stories_open_'+personalId,ctx(s)),true);assert.equal(s.event.id,'stories_chapter');return s;}
function choosePersonal(s,pick,limit=Infinity){s.event=null;assert.equal(applyStoryChoice(s,'stories_chapter',pick,ctx(s,limit)),true);return s;}
function regionalFixture(){const s=fresh();s.locationId=regionalAnchor(s,'rainward').id;syncCartography(s);s.hero.skills.stealth=4;s.hero.skills.survival=4;return E.migrateSave(s);}
function openRegional(s=regionalFixture()){assert.equal(applyRpgAction(s,'rpg_regional_'+regionalId,ctx(s)),true);assert.equal(s.event.id,'rpg_regional');return s;}
function chooseRegional(s,pick,limit=Infinity){s.event=null;assert.equal(applyRpgChoice(s,'rpg_regional',pick,ctx(s,limit)),true);return s;}
function settleInterruptions(s){for(let n=0;n<100;n++){if(s.event){const pick=s.event.choices.find(c=>!c.disabledReason&&['care','continue','later','keep','wait','support'].includes(c.id))||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,pick.id);}else if(s.conversations?.pending)s=E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies[0].id);else if(s.timeline?.yearTarget!=null)s=E.continueAgeUp(s);else return s;}throw Error('Calendar did not settle');}
const personalSchedule=[[[2,3,0],[2,12,18],[1,0,12]],[[3,2,0],[4,0,26],[2,8,0]],[[2,4,0],[1,6,0],[3,0,16]]];
function expectedTerms(chapter,pick){const i=picks.indexOf(pick),[days,cost,reward]=personalSchedule[chapter][i];return {days,cost,reward,bond:[6,2,-14][i],standing:[2,0,-4][i],career:[3,2,-8][i],skill:[1,0,0][i],visit:false};}

for(const pick of picks)test(`Family Old Debt ${pick}: first three scenes retain every baseline term and exact mechanical effect`,()=>{
 let s=fresh();const sceneDetails=[/soot-stained|hearthstone/,/one door|second/,/folded up|grow old/];
 for(let chapter=0;chapter<3;chapter++){
  s=openPersonal(s);const arc=personalArc(s),row=structuredClone(s.stories.pending.rowSnapshot),terms=expectedTerms(chapter,pick),actor=s.life.people.find(p=>p.id===arc.personId);
  assert.match(s.event.body,sceneDetails[chapter]);assert.match(s.event.body,/[“"]/);assert.equal(s.event.title,'The Family’s Old Debt');
  for(const [i,id]of picks.entries()){assert.deepEqual(row[i+1].terms,expectedTerms(chapter,id));assert.equal(row[i+1].deed,`${personalId}:${chapter}:${id}`);assert.equal(row[i+1].narrativeFlavor,STORY_FLAVOR);}
  const before={day:s.day,gold:s.hero.gold,bond:actor.bond,standing:s.factions.villagers,reputation:s.careers.records.Scholar.reputation,skill:s.hero.skills.scholarship,resources:structuredClone(s.equipment.materials),rations:s.adventuring.rations};
  s=choosePersonal(roundtrip(s),pick);const saved=personalArc(s).choices[chapter],who=s.life.people.find(p=>p.id===arc.personId);
  assert.equal(s.day-before.day,terms.days);assert.equal(s.hero.gold-before.gold,terms.reward-terms.cost);assert.equal(who.bond-before.bond,terms.bond);assert.equal(s.factions.villagers-before.standing,terms.standing);assert.equal(s.careers.records.Scholar.reputation-before.reputation,terms.career);assert.equal(s.hero.skills.scholarship-before.skill,terms.skill);
  assert.deepEqual(s.equipment.materials,before.resources);assert.equal(s.adventuring.rations,before.rations);assert.deepEqual(saved.terms,terms);assert.deepEqual(saved.consequences,{bond:terms.bond,standing:terms.standing,career:terms.career,skill:terms.skill});assert.equal(saved.outcome,row[picks.indexOf(pick)+1].outcome.replaceAll('{name}',arc.personName));assert.ok(s.stories.history.at(-1).text.startsWith(saved.outcome));assert.equal(personalArc(s).chapter,chapter+1);roundtrip(s);
 }
 assert.equal(personalArc(s).status,'completed');assert.equal(s.world.changes.at(-1).text,personalArc(s).choices[2].outcome);
});

test('the corrected household claim gets a new room scene without reopening the answered allegation or rewriting the forgery',()=>{
 let s=choosePersonal(openPersonal(),'care');s=choosePersonal(openPersonal(s),'coercion');const original=structuredClone(personalArc(s).choices),report=s.stories.allegations[0];s.day=report.readyDay;
 assert.equal(flushPersonalAllegation(s,ctx(s)),true);const day=s.day,gold=s.hero.gold;s.event=null;assert.equal(applyPersonalAllegationChoice(s,'correct',ctx(s)),true);assert.equal(s.day,day);assert.equal(s.hero.gold,gold-12);assert.equal(s.legal.incidents.length,0);
 s=openPersonal(roundtrip(s));assert.match(s.event.body,/correction|corrected/);assert.match(s.event.body,/withdrawn/);assert.match(s.event.body,/room/);assert.doesNotMatch(s.event.body,/claim is still unresolved|needs another verdict/);assert.match(s.event.choices.find(c=>c.id==='care').label,/shared use/);
 for(const [i,pick]of picks.entries())assert.deepEqual(s.stories.pending.rowSnapshot[i+1].terms,expectedTerms(2,pick));
 s=choosePersonal(roundtrip(s),'care');assert.deepEqual(personalArc(s).choices.slice(0,2),original);assert.match(personalArc(s).choices[2].outcome,/correction|withdrawn/);assert.equal(s.stories.allegations[0].status,'answered');assert.equal(s.legal.incidents.length,0);roundtrip(s);
});

test('public engine choice completion preserves the authored outcome and actual-day accounting in notice and Journal',()=>{
 const s=openPersonal(),proposal=structuredClone(s.stories.pending.rowSnapshot);const next=E.chooseEventOption(roundtrip(s),'enterprise'),arc=personalArc(next),outcome=proposal[2].outcome;
 assert.equal(arc.chapter,1);assert.ok(next.notice.startsWith(outcome));assert.match(next.notice,/2 actual days and 12 gold/);assert.match(next.notice,/18 gold/);assert.equal(next.journal.findLast(r=>r.tag==='personal').text,next.stories.history.at(-1).text);assert.ok(flavoredCompletion(s,next));roundtrip(next);
});

test('personal zero attendance and cancellation never claim completion or an unearned chapter reward',()=>{
 let s=openPersonal(),before=structuredClone(s);s=choosePersonal(s,'enterprise',0);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.day,before.day);assert.equal(s.stories.project.paid,false);assert.equal(personalArc(s).chapter,0);assert.equal(flavoredCompletion(before,s),false);s=roundtrip(s);
 const snapshot=structuredClone(s.stories.project.rowSnapshot);assert.equal(applyStoryAction(s,'stories_continue',ctx(s,1)),true);assert.equal(s.hero.gold,before.hero.gold-12);assert.equal(s.stories.project.completedDays,1);assert.deepEqual(s.stories.project.rowSnapshot,snapshot);s=roundtrip(s);
 const interrupted=structuredClone(s),gold=s.hero.gold,day=s.day;s=E.chooseAction(s,'stories_cancel');assert.equal(s.hero.gold,gold);assert.equal(s.day,day);assert.equal(personalArc(s).chapter,0);assert.equal(s.stories.project,null);assert.equal(flavoredCompletion(interrupted,s),false);assert.equal(s.stories.history.at(-1).choice,null);assert.match(s.stories.history.at(-1).text,/withdrew before earning/);roundtrip(s);
});

test('personal birthday interruption reloads and resumes only remaining time, keeping the captured outcome',()=>{
 let s=fresh();s.day=s.timeline.birthDay+(s.age+1)*365-1;s=openPersonal(s);const before=structuredClone(s),snapshot=structuredClone(s.stories.pending.rowSnapshot);s=E.chooseEventOption(s,'enterprise');assert.equal(s.day,before.day+1);assert.equal(s.stories.project.completedDays,1);assert.equal(personalArc(s).chapter,0);assert.equal(flavoredCompletion(before,s),false);assert.ok(s.event);assert.doesNotMatch(s.notice,/settle the small verified sum|agreed proceeds were/);s=roundtrip(s);
 s=settleInterruptions(s);assert.deepEqual(s.stories.project.rowSnapshot,snapshot);const interrupted=structuredClone(s),day=s.day,gold=s.hero.gold,budget=s.householdBudget.paidGold;s=E.chooseAction(s,'stories_continue');assert.equal(s.day,day+1);assert.equal(s.hero.gold-gold,18-(s.householdBudget.paidGold-budget));assert.equal(personalArc(s).chapter,1);assert.ok(flavoredCompletion(interrupted,s));assert.ok(s.notice.startsWith(snapshot[2].outcome));assert.equal(s.journal.findLast(r=>r.tag==='personal').text,s.stories.history.at(-1).text);roundtrip(s);
});

test('dead household participants are not staged as alive and gain no new trust or memories',()=>{
 let s=choosePersonal(openPersonal(),'care');const arc=personalArc(s),p=s.life.people.find(p=>p.id===arc.personId);p.alive=false;const line=s.lineage.people.find(v=>v.source==='life'&&v.localId===p.id);line.alive=false;line.deathDay=s.day;for(const member of s.family.members)if(member.personId===p.id)member.availability='deceased';const saved={bond:p.bond,memories:structuredClone(p.memories),facts:structuredClone(p.knownFacts)};s=openPersonal(s);assert.match(s.event.body,/has died/);assert.doesNotMatch(s.event.body,/Shouting has not made|says, setting the letter/);assert.match(s.event.choices.find(c=>c.id==='coercion').description,/No living participant trust change/);
 s=choosePersonal(s,'coercion');const actual=s.life.people.find(p=>p.id===arc.personId);assert.equal(actual.bond,saved.bond);assert.deepEqual(actual.memories,saved.memories);assert.deepEqual(actual.knownFacts,saved.facts);assert.equal(personalArc(s).choices[1].consequences.bond,0);assert.ok(!s.stories.history.at(-1).text.includes(arc.personName+' retains'));roundtrip(s);
});

const regionalBaseline={aid:{days:3,cost:6,reward:0,skill:null,effect:'shelter'},trade:{days:3,cost:12,reward:30,skill:null,effect:'market'},scheme:{days:2,cost:0,reward:32,skill:{id:'stealth',min:2},effect:'smuggling'},investigate:{days:3,cost:0,reward:0,skill:{id:'survival',min:2},effect:'route'}};
for(const [pick,terms]of Object.entries(regionalBaseline))test(`Flooded Causeway ${pick}: opening, snapshot, effects and exact baseline economics survive reload`,()=>{
 let s=openRegional(),arc=s.rpg.arcs.find(a=>a.id===regionalId);assert.match(s.event.body,/cabbage/);assert.match(s.event.body,/Supper/);assert.match(s.event.body,/wet spear/);assert.ok(s.event.body.includes(arc.cast.speaker.name));assert.equal(s.rpg.pending.narrativeFlavor,STORY_FLAVOR);
 const choice=REGIONAL_STORIES_V27.find(d=>d.id===regionalId).chapters[0].choices.find(c=>c.id===pick);for(const [key,value]of Object.entries(terms))assert.deepEqual(choice[key],value);assert.equal(s.event.choices.find(c=>c.id===pick).label,choice.label);assert.ok(!s.event.choices.find(c=>c.id===pick).description.includes(choice.outcome),'proposal does not reveal a completed result');
 const before={day:s.day,gold:s.hero.gold,standing:s.factions.villagers,skills:structuredClone(s.hero.skills),materials:structuredClone(s.equipment.materials),rations:s.adventuring.rations};s=chooseRegional(roundtrip(s),pick,1);assert.equal(s.rpg.project.completedDays,1);assert.equal(s.rpg.project.details.choice.narrativeFlavor,STORY_FLAVOR);assert.equal(s.rpg.arcs.find(a=>a.id===regionalId).chapter,0);s=roundtrip(s);assert.equal(applyRpgAction(s,'rpg_continue',ctx(s)),true);arc=s.rpg.arcs.find(a=>a.id===regionalId);
 assert.equal(s.day-before.day,terms.days);assert.equal(s.hero.gold-before.gold,terms.reward-terms.cost);assert.equal(s.factions.villagers-before.standing,pick==='aid'?3:pick==='scheme'?-4:0);assert.deepEqual(s.hero.skills,before.skills);assert.deepEqual(s.equipment.materials,before.materials);assert.equal(s.adventuring.rations,before.rations);assert.equal(arc.chapter,1);assert.equal(arc.nextDay,s.day+28);assert.equal(arc.choices[0].outcome,choice.outcome);assert.equal(s.world.changes.at(-1).text,choice.outcome);assert.equal(s.rpg.services.filter(v=>v.source===regionalId+'-0').length,1);assert.equal(s.rpg.services.find(v=>v.source===regionalId+'-0').kind,terms.effect);assert.match(s.rpg.history.at(-1).text,new RegExp(terms.days+' actual days completed; '+terms.cost+' gold fee paid'));roundtrip(s);
});

test('public regional completion preserves its authored result instead of a generic reward summary',()=>{
 const s=openRegional(),before=structuredClone(s),next=E.chooseEventOption(s,'aid');assert.equal(next.rpg.arcs.find(a=>a.id===regionalId).chapter,1);assert.match(next.notice,/cabbage finds a pot/);assert.match(next.journal.findLast(r=>r.tag==='rpg').text,/cabbage finds a pot/);assert.match(next.notice,/3 actual days completed; 6 gold fee paid/);assert.equal(flavoredCompletion(before,next),true);roundtrip(next);
});

test('regional cancellation and leave do not acquire services or claim an authored ending',()=>{
 let s=openRegional(),before=structuredClone(s);s=chooseRegional(s,'trade',0);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.day,before.day);assert.equal(s.rpg.project.paid,false);assert.equal(flavoredCompletion(before,s),false);s=roundtrip(s);assert.equal(applyRpgAction(s,'rpg_continue',ctx(s,1)),true);const interrupted=structuredClone(s),day=s.day,gold=s.hero.gold;s=E.chooseAction(s,'rpg_cancel');assert.equal(s.day,day);assert.equal(s.hero.gold,gold);assert.equal(s.rpg.arcs.find(a=>a.id===regionalId).chapter,0);assert.equal(s.rpg.services.filter(v=>v.source===regionalId+'-0').length,0);assert.equal(flavoredCompletion(interrupted,s),false);roundtrip(s);
 s=openRegional();before=structuredClone(s);s=E.chooseEventOption(s,'leave');assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.equal(s.rpg.arcs.find(a=>a.id===regionalId).chapter,0);assert.equal(s.rpg.pending,null);assert.equal(flavoredCompletion(before,s),false);roundtrip(s);
});

test('older pending words and finished history do not receive retrospective flavor or extra decisions',()=>{
 let s=openPersonal();const a=personalArc(s),baseRow=captureStoryRow(a,LIFE_STORIES.find(d=>d.id===personalId).chapters[0]);s.stories.pending.rowSnapshot=editionStoryRow(s,a,baseRow);s.event.body='An older saved family proposal.';for(const c of s.event.choices)delete c.narrativeFlavor;
 const old=structuredClone(s);s=roundtrip(s);assert.deepEqual(s.stories.pending,old.stories.pending);assert.deepEqual(s.event,old.event);assert.ok(s.stories.pending.rowSnapshot.slice(1).every(c=>!c.narrativeFlavor));s=E.chooseEventOption(s,'care');const history=structuredClone({stories:s.stories.history,choices:personalArc(s).choices,journal:s.journal,changes:s.world.changes});s=roundtrip(s);assert.deepEqual({stories:s.stories.history,choices:personalArc(s).choices,journal:s.journal,changes:s.world.changes},history);
 let r=openRegional();delete r.rpg.pending.narrativeFlavor;r.event.body='An older saved causeway proposal.';const pending=structuredClone(r.rpg.pending),event=structuredClone(r.event);r=roundtrip(r);assert.deepEqual(r.rpg.pending,pending);assert.deepEqual(r.event,event);r=chooseRegional(r,'trade',1);assert.equal(r.rpg.project.details.choice.narrativeFlavor,undefined);roundtrip(r);
});

test('production story choice handler shows authored dialogue and retains the completed result after reloading',async t=>{
 const s=openPersonal(),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');assert.match(ui.root.innerHTML,/soot-stained/);assert.match(ui.root.innerHTML,/Show me where it says years/);await ui.click('choice','care');const actual=ui.current();assert.equal(personalArc(actual).chapter,1);assert.match(actual.notice,/copy the amount/);assert.equal(actual.journal.findLast(r=>r.tag==='personal').text,actual.stories.history.at(-1).text);roundtrip(actual);
});

test('a participant dying during first-chapter attendance cannot react to the completed disclosure',()=>{
 const s=openPersonal(),a=personalArc(s),p=s.life.people.find(p=>p.id===a.personId),snapshot=structuredClone(s.stories.pending.rowSnapshot),saved={bond:p.bond,memories:structuredClone(p.memories),facts:structuredClone(p.knownFacts)},context=ctx(s);
 context.spendDays=n=>{s.day+=n;p.alive=false;const line=s.lineage.people.find(v=>v.source==='life'&&v.localId===p.id);line.alive=false;line.deathDay=s.day;for(const member of s.family.members)if(member.personId===p.id)member.availability='deceased';return n;};s.event=null;
 assert.equal(applyStoryChoice(s,'stories_chapter','coercion',context),true);assert.equal(personalArc(s).chapter,1);assert.equal(p.bond,saved.bond);assert.deepEqual(p.memories,saved.memories);assert.deepEqual(p.knownFacts,saved.facts);assert.equal(personalArc(s).choices[0].consequences.bond,0);assert.doesNotMatch(personalArc(s).choices[0].outcome,/relative learns|refuses to trust|thanks you|says/);assert.equal(snapshot[3].narrativeFlavor,STORY_FLAVOR);roundtrip(s);
});

test('regional birthday interruption preserves the captured choice and resumes once without a second fee',()=>{
 let s=regionalFixture();s.day=s.timeline.birthDay+(s.age+1)*365-1;s=openRegional(s);const before=structuredClone(s);s=E.chooseEventOption(s,'trade');assert.equal(s.day,before.day+1);assert.equal(s.rpg.project.completedDays,1);assert.equal(s.rpg.arcs.find(a=>a.id===regionalId).chapter,0);assert.equal(flavoredCompletion(before,s),false);assert.ok(s.event);const saved=structuredClone(s.rpg.project.details.choice);s=roundtrip(s);s=settleInterruptions(s);assert.deepEqual(s.rpg.project.details.choice,saved);
 const interrupted=structuredClone(s),day=s.day,gold=s.hero.gold,budget=s.householdBudget.paidGold;s=E.chooseAction(s,'rpg_continue');assert.equal(s.day,day+2);assert.equal(s.hero.gold-gold,30-(s.householdBudget.paidGold-budget));assert.equal(s.rpg.project,null);assert.equal(s.rpg.arcs.find(a=>a.id===regionalId).chapter,1);assert.ok(flavoredCompletion(interrupted,s));assert.ok(s.notice.startsWith(saved.outcome));assert.ok(s.journal.findLast(r=>r.tag==='rpg').text.startsWith(saved.outcome));roundtrip(s);
 const complete=structuredClone(s);s=E.chooseAction(s,'rpg_continue');assert.equal(s.day,complete.day);assert.equal(s.hero.gold,complete.hero.gold);assert.deepEqual(s.rpg.arcs,complete.rpg.arcs);assert.deepEqual(s.rpg.services,complete.rpg.services);
});

test('personal defer and abandon preserve old records and never trigger flavored completion',()=>{
 for(const pick of ['defer','leave']){const before=openPersonal(),s=E.chooseEventOption(before,pick);assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.equal(personalArc(s).chapter,0);assert.equal(personalArc(s).status,pick==='leave'?'abandoned':'active');assert.equal(s.stories.pending,null);assert.equal(s.stories.project,null);assert.equal(flavoredCompletion(before,s),false);assert.deepEqual(personalArc(s).choices,[]);assert.doesNotMatch(s.notice,/actual days.*committed|copy the amount|agreed proceeds/);roundtrip(s);}
});
