import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as E from '../dist/js/engine.js';
import {groundedEvent} from '../dist/js/grounded-narrative-content.js';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Independent public-engine reproduction from an existing valid life. Calendar
// gates are controlled; actual actions and production UI handlers resolve choices.
function settle(s){for(let i=0;i<100;i++){if(s.event){const c=s.event.choices.find(c=>!c.disabledReason&&['care','continue','later','keep','support'].includes(c.id))||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}else if(s.stories.project)s=E.chooseAction(s,'stories_continue');else return s;}throw Error('Unsettled fixture');}
function proposal(){let s=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);s.hero.gold=10000;s=E.chooseAction(s,'stories_open_hearth_letter');s=settle(E.chooseEventOption(s,'care'));s.stories.arcs.find(a=>a.id==='hearth_letter').nextAge=s.age;return E.chooseAction(s,'stories_open_hearth_letter');}
function filed(){let s=settle(E.chooseEventOption(proposal(),'coercion'));s.day=s.stories.allegations[0].readyDay;s=E.chooseAction(s,'life_rest');assert.equal(s.event.id,'stories_allegation');return roundtrip(s);}
function roundtrip(s){assert.ok(E.validateSave(s));const loaded=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded,s);return loaded;}
function warnings(s){const e=s.event,r=s.stories.allegations[0];assert.equal(e.title,'Two copies before the local clerk');assert.ok(e.body.includes(r.witnessName));assert.match(e.body,/retained agreement.*altered household claim/);assert.match(e.body,/disputed forgery allegation/);assert.match(e.body,/Only this locality/);const d=id=>e.choices.find(c=>c.id===id).description;assert.match(d('correct'),/12-gold.*only this report’s 1 evidence.*Other charges remain.*No calendar days or reputation reward/);assert.match(d('defend'),/No fee or calendar days.*retain 1 local evidence, not a conviction.*Advocacy, free supervised service and lawful restitution/);assert.match(d('pressure'),/adds 2 local evidence and breaches an oath.*does not destroy.*Arrest becomes possible/);}

test('new allegation preserves authored witness, documents and every before-choice warning through reload',()=>{const s=filed();warnings(s);warnings(roundtrip(s));assert.equal(s.stories.allegations[0].response,null);assert.equal(s.legal.incidents[0].evidence,1);});
for(const id of ['correct','defend','pressure'])test(`production ${id} handler displays warnings before acting and saves actual effects`,async t=>{
 const s=filed(),ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');warnings(ui.current());assert.match(ui.root.innerHTML,/Two copies before the local clerk/);for(const c of s.event.choices)assert.ok(ui.root.innerHTML.includes(c.description));const old=structuredClone(ui.current()),history=structuredClone(old.stories.arcs[0].choices);
 await ui.click('choice',id);const after=roundtrip(ui.current());assert.equal(after.day,old.day);assert.equal(after.hero.gold,old.hero.gold-(id==='correct'?12:0));assert.equal(after.stories.allegations[0].status,'answered');assert.equal(after.stories.allegations[0].response,id);assert.equal(after.stories.allegationPending,null);assert.deepEqual(after.stories.arcs[0].choices,history);assert.equal(after.legal.incidents.find(i=>i.locationId===s.locationId)?.evidence||0,id==='correct'?0:id==='pressure'?3:1);
 if(id==='correct'){assert.equal(after.stories.arcs[0].legalReply.choice,'correct');const again=E.chooseEventOption(after,'correct');assert.equal(again.hero.gold,after.hero.gold);}
 if(id==='pressure')assert.match(after.legal.incidents[0].description,/witnessed your threat/);
 if(id==='defend'){assert.equal(after.justice.prison,null);assert.equal(after.legal.wanted,false);}
});
test('deferring the household proposal has no fee, evidence or completed choice and keeps exact saved terms',async t=>{
 const s=proposal(),ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');const before=ui.current(),row=structuredClone(before.stories.pending.rowSnapshot);await ui.click('choice','defer');let after=roundtrip(ui.current());assert.equal(after.hero.gold,before.hero.gold);assert.equal(after.day,before.day);assert.deepEqual(after.legal,before.legal);assert.deepEqual(after.stories.arcs,before.stories.arcs);assert.equal(after.stories.pending,null);after=E.chooseAction(after,'stories_open_hearth_letter');assert.deepEqual(after.stories.pending.rowSnapshot,row);roundtrip(after);
});
test('existing open saved allegation prose and prior histories are not rewritten on migration',()=>{const s=filed();s.event.title='A Moment in Your Day';s.event.body='Previously captured proposal';s.event.choices[2].description='Choose this action.';roundtrip(s);});
test('unrecognized authored events preserve their captured copy',()=>{const s=filed(),e=groundedEvent(s,{id:'unrecognized_fixture',title:'Unprocessed',body:'Raw',choices:[{id:'accept',label:'Accept',description:'Raw'}]});assert.equal(e.title,'Unprocessed');assert.equal(e.body,'Raw');assert.equal(e.choices[0].description,'Raw');});
test('pressure breaches an existing paladin oath, without inventing an oath for other characters',()=>{const s=filed();s.hero.specialization='paladin';s.hero.path='warrior';s.progression.learnedClassIds.push('paladin');s.flags.oathType='truth';s.flags.oathBroken=false;roundtrip(s);const after=E.chooseEventOption(s,'pressure');assert.equal(after.flags.oathBroken,true);assert.equal(after.legal.incidents[0].evidence,3);roundtrip(after);});
