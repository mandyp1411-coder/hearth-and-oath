import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { settlementServices,serviceAccessReason } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { validateIntrigue,intrigueActions } from '../dist/js/local-intrigue.js';
import { activeJournalQuests } from '../dist/js/journal-ui-v30.js';
import { ownedHomeHere } from '../dist/js/home-recovery-v38.js';
import { groundedOutcome } from '../dist/js/grounded-narrative-content.js';
function settle(s){for(let i=0;i<250;i++){
 if(s.event){const c=s.event.choices.find(c=>['care','continue','later','keep','wait','support'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}
 else if(s.conversations?.pending)s=E.replyMessage(s,s.conversations.pending.personId,s.conversations.pending.replies[0].id);
 else if(s.rpg?.project)s=E.chooseAction(s,'rpg_continue');
 else if(s.stories?.project)s=E.chooseAction(s,'stories_continue');
 else if(s.timeline?.yearTarget!=null)s=E.continueAgeUp(s);
 else {assert.ok(E.validateSave(s));return s;}
 assert.ok(E.validateSave(s),'valid after settling');
 }throw Error('settle failed');}
const base=settle(await createLifeAtAge({seed:'baxter-levy-integration',startAge:24,difficulty:'gentle'}));
function walk(s,room){const path=settlementWalkPath(s,room);assert.ok(path);for(const id of path)s=E.chooseAction(s,'atlas_room_'+id);return s;}
function fresh(){let s=structuredClone(base);s.hero.gold=500;const guide=settlementServices(s).find(r=>r.kind==='guide');return walk(s,guide.roomId);}
function roundtrip(s){assert.ok(E.validateSave(s));const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next.rpg.intrigue,s.rpg.intrigue);assert.deepEqual(next.event,s.event);return next;}
function open(s){const id=s.rpg.intrigue?'rpg_intrigue_open':'rpg_intrigue_read',action=E.getActions(s).find(a=>a.id===id);assert.ok(action,'action exists '+id);assert.ok(!action.disabledReason,action.disabledReason);s=E.chooseAction(s,id);assert.equal(s.event?.id,'rpg_intrigue');assert.match(s.event.body,/levy|grain|seed|Flour/);return roundtrip(s);}
function choose(s,id){s=E.chooseEventOption(s,id);assert.ok(E.validateSave(s));return s;}
function investigate(route,correct=true){let s=open(fresh());const day=s.day;s=settle(choose(s,route));assert.ok(s.day>=day+({scholar:3,bard:2,criminal:1}[route]));assert.equal(s.rpg.intrigue.stage,1);s=open(s);s=choose(s,correct?'correct':'wrong');return roundtrip(s);}
function returned(s){for(let i=0;s.day<s.rpg.intrigue.nextDay&&i<20;i++)s=settle(E.chooseAction(s,'rest'));assert.ok(s.day>=s.rpg.intrigue.nextDay);return open(s);}
test('three methods play through real engine events, captured days and save reload',()=>{for(const [route,proof]of [['scholar','signed'],['bard','witness'],['criminal','stolen']]){const s=investigate(route);assert.equal(s.rpg.intrigue.proof,proof);assert.equal(s.rpg.intrigue.history.length,1);assert.equal(activeJournalQuests(s).filter(q=>q.key==='winter_levy').length,1);assert.ok(s.journal.some(j=>j.title==='The Winter Levy'&&!/You choose to/.test(j.text)));}});
test('actual different endings have once-only rewards and persistent local services',()=>{for(const ending of ['expose','negotiate','sell','blackmail']){let s=returned(investigate(ending==='blackmail'?'criminal':'scholar'));const gold=s.hero.gold;s=settle(choose(s,ending));assert.equal(s.rpg.intrigue.ending,ending);assert.equal(s.rpg.intrigue.status,'completed');assert.equal(s.rpg.services.filter(v=>v.source==='winter-levy-'+ending).length,1);assert.equal(activeJournalQuests(s).filter(q=>q.key==='winter_levy').length,0);assert.ok(s.hero.gold<=gold+(ending==='blackmail'?75:ending==='sell'?40:0));const old=s.hero.gold;s=E.chooseAction(roundtrip(s),'rpg_intrigue_open');assert.equal(s.hero.gold,old);}});
test('clue mistakes do not allow accusations; criminal proof can be corroborated at home',()=>{let s=returned(investigate('criminal'));const before=structuredClone(s);s=choose(s,'expose');assert.equal(s.event.id,'rpg_intrigue');assert.deepEqual(s.rpg,before.rpg);s=settle(choose(s,'corroborate'));assert.equal(s.rpg.intrigue.proof,'signed');s=open(s);assert.ok(!s.event.choices.find(c=>c.id==='expose').disabledReason);});
test('new intrigue retains authored character voices rather than generic edition summaries',()=>{const s=open(fresh());assert.match(s.event.body,/seed jar behind the stove/);assert.match(s.event.body,/hungry guard/);assert.equal(s.event.choices.find(c=>c.id==='scholar').label,'Compare the papers at your own table');});
test('old saves remain untouched and invalid intrigue stages/projects are rejected',()=>{const s=fresh();assert.equal(s.rpg.intrigue,undefined);assert.ok(validateIntrigue(s));const p=open(s);p.rpg.intrigue.pending='settlement';assert.equal(validateIntrigue(p),false);const t=investigate('scholar');t.rpg.intrigue.status='completed';assert.equal(validateIntrigue(t),false);for(const field of ['journey','yearTarget']){const b=fresh();b.timeline[field]=field==='journey'?{}:b.day+1;assert.deepEqual(intrigueActions(b,{settled:true}),[]);}});
test('home scholar work uses owned home only and does not unlock bard or supervised training',()=>{let s=fresh();s.hero.profession='Scholar';s.life.home={...s.life.home,tier:'cottage',locationId:s.locationId};s=walk(s,'homes');assert.ok(ownedHomeHere(s));assert.equal(serviceAccessReason(s,'career_work'),null);assert.ok(serviceAccessReason(s,'career_practice'));const before=s.day,worked=s.careers.records.Scholar.workedDays;s=settle(E.chooseAction(s,'career_work'));assert.ok(s.day>=before+3);assert.ok(s.careers.records.Scholar.workedDays>=worked+3);s.hero.profession='Bard';assert.ok(serviceAccessReason(s,'career_work'));s.hero.profession='Scholar';s.life.home.locationId='elsewhere';assert.ok(serviceAccessReason(s,'career_work'));});
test('defer and abandon tell the player the actual different story states',()=>{assert.match(groundedOutcome(base,{eventId:'stories_chapter',choice:'defer'}),/remains active/);assert.match(groundedOutcome(base,{eventId:'stories_chapter',choice:'leave'}),/leave this story behind/);});

test('reading and deferring a proposal do not silently accept an active quest',()=>{let s=open(fresh());assert.equal(s.rpg.intrigue.status,'offered');assert.equal(activeJournalQuests(s).filter(q=>q.key==='winter_levy').length,0);s=choose(s,'later');assert.equal(s.rpg.intrigue.status,'offered');assert.equal(activeJournalQuests(s).filter(q=>q.key==='winter_levy').length,0);s=open(s);s=settle(choose(s,'scholar'));assert.equal(s.rpg.intrigue.status,'active');assert.equal(activeJournalQuests(s).filter(q=>q.key==='winter_levy').length,1);});
