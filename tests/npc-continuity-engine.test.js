// Engine fixtures are separate so the pure mentor file never loads the engine.
// Run serially only when the shared engine-validation lane is assigned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { CLASS_CATALOG, classView } from '../dist/js/classes.js';
import { getContacts, rememberedContacts } from '../dist/js/conversations.js';
import { projectLifePerson } from '../dist/js/world-people-v31.js';
import { reconcileNpcContinuity, validateNpcContinuity } from '../dist/js/npc-continuity.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { initializeFamilyDepth } from '../dist/js/household.js';
import { registerWorldLifeRecord } from '../dist/js/lineage.js';
import { renderConversationPanel } from '../dist/js/dialogue-ui-v22.js';

const clone=v=>structuredClone(v);
const v30=()=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
function walk(s,room){for(const id of settlementWalkPath(s,room))s=E.chooseAction(s,'atlas_room_'+id);return s;}
function answer(s){const picks=s.event.choices;const choice=['continue','curiosity','care','wait','leave','later'].map(id=>picks.find(c=>c.id===id&&!c.disabledReason)).find(Boolean)||picks.find(c=>!c.disabledReason);assert.ok(choice);const n=E.chooseEventOption(s,choice.id);assert.ok(E.validateSave(n),s.event.id+' '+n.notice);return n;}

test('engine: fresh birth and natural age18 transitions retain valid adopted rosters after every action',()=>{
 let s=E.createBirthGame({seed:'npc16-fresh-birth-age18',household:'poor'});assert.ok(E.validateSave(s));assert.equal(Object.values(s.npcContinuity.slots).filter(d=>d.kind==='mentor').length,12);
 let guard=0;while((s.age<18||s.event||s.timeline.yearTarget!==null)&&guard++<160){if(s.event)s=answer(s);else{s=s.timeline.yearTarget!==null?E.continueAgeUp(s):E.ageUp(s);assert.ok(E.validateSave(s),'age '+s.age+' '+s.notice);}}
 assert.ok(guard<160);assert.equal(s.age,18);assert.equal(s.phase,'adult');assert.deepEqual(s.progression.learnedClassIds,[]);assert.ok(validateNpcContinuity(s));
 for(const c of classView(s).callings){const contact=getContacts(s).find(p=>p.id===c.mentor.id);assert.ok(contact);assert.equal(contact.age,c.mentor.age);const service=settlementServices(s,{siteId:c.mentor.locationId}).find(r=>r.personId===c.mentor.id);assert.ok(service);assert.equal(service.person.age,c.mentor.age);assert.deepEqual(service.person.appearance,c.mentor.appearance);}
});
test('engine: current v30 saves adopt mentor public slots idempotently with existing private mentor study intact',()=>{
 for(const [id,raw]of Object.entries(v30().states)){const s=E.migrateSave(raw);assert.ok(s,id);assert.ok(E.validateSave(s),id);assert.deepEqual(E.migrateSave(clone(s)),s,id+' idempotent');for(const c of CLASS_CATALOG){assert.equal(s.progression.mentors[c.id].id,raw.progression.mentors[c.id].id);assert.equal(s.progression.mentors[c.id].met,raw.progression.mentors[c.id].met);assert.equal(s.progression.mentors[c.id].lessons,raw.progression.mentors[c.id].lessons);}}
});
test('engine: met-only retired mentor remains inspectable with private lesson count but no successor confidence',()=>{
 const s=E.migrateSave(v30().states.base),id=s.progression.mentors.guardian.id;s.progression.mentors.guardian.met=true;s.progression.mentors.guardian.lessons=4;s.day=s.npcContinuity.people[id].retireDay;reconcileNpcContinuity(s);const old=rememberedContacts(s).find(p=>p.id===id),next=s.progression.mentors.guardian;assert.ok(old);assert.equal(old.retired,true);assert.deepEqual(old.mentorStudy,{classId:'guardian',met:true,lessons:4});assert.equal(old.available,false);assert.equal(getContacts(s).some(p=>p.id===id),false);assert.equal(next.met,false);assert.equal(next.lessons,0);assert.ok(!s.conversations.relationships[next.id]);
});
test('engine: an exact dead pending dialogue validates and closes without an answer, relationship effect or successor voice',()=>{
 let s=E.migrateSave(v30().states.base);const p=getContacts(s).find(p=>p.population&&p.locationId===s.locationId);s=walk(s,p.roomId);s=E.chooseAction(s,'talk_'+p.id);assert.ok(s.conversations.pending);const pending=clone(s.conversations.pending);const person=projectLifePerson(s,{...p,bond:60});assert.ok(person);person.alive=false;person.deathDay=s.day;registerWorldLifeRecord(s,person);initializeFamilyDepth(s);reconcileNpcContinuity(s);assert.deepEqual(s.conversations.pending,pending);assert.ok(E.validateSave(s));
 const ui={e:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),button:(text,op,id)=>`<button data-op="${op}" data-id="${id}">${text}</button>`,paragraphs:x=>`<p>${x}</p>`,actionCards:()=>''};const html=renderConversationPanel(s,p.id,ui);assert.match(html,/Close this unfinished exchange without replying/);assert.doesNotMatch(html,/Your response/);
 const before=clone({day:s.day,person:s.life.people.find(p=>p.id===person.id),sequence:s.conversations.sequence,threads:s.conversations.threads});const n=E.replyMessage(s,p.id,pending.replies[0].id);assert.equal(n.conversations.pending,null);assert.deepEqual({day:n.day,person:n.life.people.find(p=>p.id===person.id),sequence:n.conversations.sequence,threads:n.conversations.threads},before);assert.ok(E.validateSave(n));assert.deepEqual(E.migrateSave(clone(n)),n);
});

test('engine: genuine v1-v5 published captures, including pending authored scenes, remain valid and idempotent',()=>{
 for(let version=1;version<=5;version++){const fixture=JSON.parse(readFileSync(new URL(`./fixtures/legacy-v${version}.json`,import.meta.url)));for(const [id,raw]of Object.entries(fixture.states)){const s=E.migrateSave(raw);assert.ok(s,`v${version} ${id}`);assert.ok(E.validateSave(s),`v${version} ${id}`);assert.deepEqual(E.migrateSave(clone(s)),s,`v${version} ${id} idempotent`);}}
});
test('engine: direct and public dynasty succession bind current public mentors without old private study or earned gifts',async()=>{
 const {createSuccessor,completeLineageHistory}=await import('../dist/js/lineage.js'),raw=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url))).states.parent;const s=E.migrateSave(raw),oldId=s.progression.mentors.guardian.id;s.progression.mentors.guardian.met=true;s.progression.mentors.guardian.lessons=6;
 // Explicit diagnostic death of one existing public mentor, not a lifetime claim.
 const publicPerson=classView(s).callings.find(c=>c.id==='guardian').mentor,person=projectLifePerson(s,{...publicPerson,bond:60});person.alive=false;person.deathDay=s.day;registerWorldLifeRecord(s,person);initializeFamilyDepth(s);reconcileNpcContinuity(s);const nextId=s.progression.mentors.guardian.id;assert.notEqual(nextId,oldId);
 s.phase='retired';s.event=null;s.chronicle='The parent’s actual chapter.';completeLineageHistory(s,'retirement');for(const n of [createSuccessor(s,'child-1',E.createBirthGame),E.continueAsChild(s,'child-1')]){assert.ok(n);assert.equal(n.dynasty.generation,2);assert.ok(E.validateSave(n));assert.equal(n.progression.mentors.guardian.id,nextId);assert.equal(n.progression.mentors.guardian.met,false);assert.equal(n.progression.mentors.guardian.lessons,0);assert.equal(n.progression.mentorHistory,undefined);assert.deepEqual(n.progression.learnedClassIds,[]);assert.equal(n.hero.specialization,null);assert.deepEqual(n.world,s.world);}
});
