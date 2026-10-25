import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { initializeFamilyOrigins, originActions, applyOriginAction, applyOriginChoice, originView, validateFamilyOrigins, FAMILY_ORIGIN_TITLE } from '../dist/js/family-origins.js';
import { editionEvent } from '../dist/js/narrative-edition.js';
import { syncCartography } from '../dist/js/cartography.js';
import { settlementServices, serviceWalkPath } from '../dist/js/world-services.js';
import { journalCommitments } from '../dist/js/journal-commitments.js';
import { questAccountReview, trackedQuest } from '../dist/js/quest-records.js';
import { renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { atService } from './helpers/service-visit.mjs';
import { mountApp } from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

// Controlled scenarios cloned from one genuine played save. They are not new
// played lives, journey coverage, or substitutes for release/browser QA.
const raw=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base;
const base=E.migrateSave(raw);
const relevant=['birthThread','birthVisitor','birthName','cradleSong','firstWord'];
function fresh(flags={birthThread:'registered'},items={}){
 const s=structuredClone(base);s.event=null;s.battle=null;s.flags.familyOriginInterest=true;
 for(const key of relevant)delete s.timeline.storybook.flags[key];Object.assign(s.timeline.storybook.flags,flags);Object.assign(s.timeline.storybook.items,items);
 const g=s.life.people.find(p=>p.id==='kin');s.locationId=g.locationId;s.cartography.interior={siteId:s.locationId,roomId:'homes'};
 s.realm.sites[s.locationId].hasShrine=true;s.hero.gold=10000;
 delete s.familyOrigins;initializeFamilyOrigins(s);return s;
}
function context(s,{limit=Infinity,onSpend=()=>{}}={}){return {
 spendDays(n){const days=Math.min(n,limit);s.day+=days;onSpend(days);return days;},
 setEvent(id,title,category,body,choices){s.event=editionEvent(s,{id,title,category,body,choices});},
 journalLiteral(title,text,tag,meta){s.journal.push({id:'entry-'+(s.journal.length+1),day:s.day,age:s.age,title,text,tag,...meta,generation:s.dynasty.generation});}
};}
const valid=s=>assert.ok(validateFamilyOrigins(s.familyOrigins,s),'family-origin state validates');
function roundtrip(s){valid(s);assert.ok(E.validateSave(s),'whole save validates');const next=E.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(next,s);return next;}
function act(s,id,ctx=context(s)){assert.equal(applyOriginAction(s,id,ctx),true,id);valid(s);return s;}
function pick(s,id,ctx=context(s)){const e=s.event;assert.ok(e?.choices.some(c=>c.id===id));s.event=null;assert.equal(applyOriginChoice(s,e.id,id,ctx),true,e.id+':'+id);valid(s);return s;}
function move(s,target){s.cartography.interior={siteId:s.locationId,roomId:target};return s;}
function guardianStep(s=fresh()){act(s,'origin_accept');act(s,'origin_guardian');pick(s,'object');return s;}
function registerStep(s=fresh()){guardianStep(s);move(s,'archive');act(s,'origin_register');pick(s,'inspect');return s;}
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ui={e,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${op}" data-id="${e(id)}" ${disabled?'disabled':''}>${label}</button>`,paragraphs:text=>`<p>${e(text)}</p>`,date:day=>'Day '+day,livingCosts:()=>''};

test('old true interest migrates only to a read-only invitation and pending historical scenes stay exact',()=>{
 const old=structuredClone(raw);old.flags.familyOriginInterest=true;const historical={family:structuredClone(old.family),event:structuredClone(old.event),storybook:structuredClone(old.timeline.storybook)};
 const s=E.migrateSave(old);assert.equal(s.familyOrigins.run,null);assert.equal(s.familyOrigins.pending,null);assert.equal(s.familyOrigins.project,null);assert.equal(originView(s).offered,true);
 assert.deepEqual(s.family,historical.family);assert.deepEqual(s.event,historical.event);assert.deepEqual(s.timeline.storybook,historical.storybook);assert.deepEqual(E.migrateSave(s),s);
 const before=structuredClone(s);originView(s);originActions(s);renderSimpleJournal(s,E.getActions(s),ui);assert.deepEqual(s,before);
});

test('decline, reload and reconsider never accept work or create failure, proof, time or learning',()=>{
 let s=fresh(),before=structuredClone(s);s=E.chooseAction(s,'origin_decline');assert.equal(s.familyOrigins.invitation,'declined');assert.equal(s.familyOrigins.run,null);assert.equal(journalCommitments(s).some(r=>r.key==='family-origin'),false);
 assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.hero.gold);assert.deepEqual(s.hero.skills,before.hero.skills);assert.equal(questAccountReview(s).counts.failed,questAccountReview(before).counts.failed);s=roundtrip(s);
 s=E.chooseAction(s,'origin_reconsider');assert.equal(s.familyOrigins.invitation,'offered');assert.equal(s.familyOrigins.run,null);roundtrip(s);
});

test('age twelve is explicit and unrelated complete families receive no invitation without interest',()=>{
 const s=fresh();s.age=11;assert.deepEqual(originActions(s),[]);s.age=12;assert.ok(originActions(s).some(a=>a.id==='origin_accept'));
 s.flags.familyOriginInterest=false;assert.equal(originView(s).offered,false);assert.deepEqual(originActions(s),[]);
});

for(const [name,flags,items,pattern]of [
 ['registered thread',{birthThread:'registered'},{},/silver thread|Silver thread/],
 ['hidden thread',{birthThread:'hidden'},{},/no claim that the archive/],
 ['burned thread',{birthThread:'burned'},{},/fell into the hearth/],
 ['preserved bird',{birthVisitor:'bird'},{boneBird:true},/bone bird/],
 ['unpossessed bird',{birthVisitor:'bird'},{boneBird:false},/does not establish.*possession/],
 ['closed door',{birthVisitor:'closed'},{},/does not establish.*possession/],
 ['uncertain visitor name',{birthVisitor:'name'},{},/never established as a parent/],
 ['margin name',{birthName:'margin'},{},/unused name remains/],
 ['blank name',{birthName:'blank'},{},/No rubbed-out answer/],
 ['changed lullaby',{cradleSong:'changed'},{},/missing words have not returned/],
 ['silenced lullaby',{cradleSong:'silenced'},{},/without being made to sing/],
 ['uncertain first word',{firstWord:'recorded'},{},/Nobody established what it meant/],
 ])test(`${name} remains its exact frozen childhood source, not a new retrospective choice`,()=>{
  const s=fresh(flags,items),before=structuredClone(s.timeline.storybook);act(s,'origin_accept');act(s,'origin_guardian');assert.match(s.event.body,pattern);assert.deepEqual(s.timeline.storybook,before);roundtrip(s);
 });

test('a no-clue legacy copy invents no heirloom or first-night choice',()=>{
 const s=fresh({});delete s.hero.lifeOrigin;act(s,'origin_accept');act(s,'origin_guardian');assert.match(s.event.body,/no first-night keepsake beside it/i);assert.deepEqual(s.familyOrigins.run.anchor.flags,{});roundtrip(s);
});

test('parent deaths, missing status and unrecorded identities are never rewritten or promoted to contacts',()=>{
 for(const status of ['deceased','missing','unknown']){
  const s=fresh();s.family.setup='single_parent';const second=s.family.members.find(m=>m.personId==='family_parent');second.personId=null;second.relationship='birth parent';second.availability=status;
  // This is an owner-only scenario; full household fixtures are covered in its
  // existing tests. No new life-person is generated to represent this entry.
  const before=structuredClone(s.family),people=structuredClone(s.life.people);registerStep(s);act(s,'origin_decide');pick(s,'keep');assert.deepEqual(s.family,before);assert.deepEqual(s.life.people.map(p=>({id:p.id,name:p.name,alive:p.alive})),people.map(p=>({id:p.id,name:p.name,alive:p.alive})));assert.match(s.familyOrigins.run.history[1].text,new RegExp(status));
 }
 const s=fresh();s.family.setup='orphan';s.family.parentage='unrecorded';s.family.members=s.family.members.filter(m=>m.personId!=='family_parent');s.life.people.find(p=>p.id==='kin').familyRole='guardian';s.family.members[0].biological=false;s.family.members[0].relationship='shelter guardian';s.family.members.push(...[1,2].map(n=>({personId:null,name:`Birth parent ${n} · identity unrecorded`,relationship:'birth parent',availability:'unknown',biological:true})));
 const before=structuredClone(s.family);registerStep(s);act(s,'origin_decide');pick(s,'keep');assert.deepEqual(s.family,before);assert.ok(s.family.members.filter(m=>m.relationship==='birth parent').every(m=>m.availability==='unknown'&&m.personId===null));
});

test('acceptance chooses the surviving actual caregiver and supports a legacy recorded caregiver',()=>{
 const s=fresh(),first=s.life.people.find(p=>p.id==='kin'),second=s.life.people.find(p=>p.id==='family_parent');first.alive=false;s.family.members.find(m=>m.personId==='kin').availability='deceased';act(s,'origin_accept');assert.equal(s.familyOrigins.run.cast.guardian.id,second.id);act(s,'origin_guardian');assert.ok(s.event.body.includes(second.name+' sets the papers'));
 const legacy=fresh();delete legacy.life.people.find(p=>p.id==='kin').familyRole;legacy.life.people.find(p=>p.id==='family_parent').alive=false;legacy.family.members.find(m=>m.personId==='family_parent').availability='deceased';act(legacy,'origin_accept');assert.equal(legacy.familyOrigins.run.cast.guardian.id,'kin');act(legacy,'origin_guardian');assert.match(legacy.event.body,/sets the papers/);
});

test('source unavailable or guardian dying during attendance supplies no new living testimony or trust',()=>{
 const s=fresh(),g=s.life.people.find(p=>p.id==='kin');act(s,'origin_accept');act(s,'origin_guardian');const before={bond:g.bond,memories:structuredClone(g.memories)};
 pick(s,'object',context(s,{onSpend(){g.alive=false;g.deathDay=s.day;s.family.members.find(m=>m.personId===g.id).availability='deceased';}}));
 assert.ok(s.familyOrigins.run.evidence.some(e=>e.id==='guardian_unavailable'));assert.ok(!s.familyOrigins.run.evidence.some(e=>e.id==='guardian_account'));assert.equal(g.bond,before.bond);assert.deepEqual(g.memories,before.memories);
 const next=fresh();const other=next.life.people.find(p=>p.id==='family_parent');act(next,'origin_accept');next.life.people.find(p=>p.id==='kin').alive=false;next.family.members.find(m=>m.personId==='kin').availability='deceased';act(next,'origin_guardian');assert.match(next.event.body,/cannot give a living interview/);assert.ok(!next.event.body.includes(other.name+' sets the papers'));
});

test('actual rooms and exact providers gate commands; arrival and proposals are not evidence',()=>{
 const s=fresh();act(s,'origin_accept');move(s,'gate');const before=structuredClone(s);assert.ok(originActions(s).find(a=>a.id==='origin_guardian').disabledReason);assert.equal(applyOriginAction(s,'origin_guardian',context(s)),false);assert.deepEqual(s,before);
 move(s,'homes');act(s,'origin_guardian');assert.equal(s.familyOrigins.run.evidence.length,0);pick(s,'object');move(s,'gate');assert.ok(originActions(s).find(a=>a.id==='origin_register').disabledReason);assert.equal(s.familyOrigins.run.evidence.length,1);
 move(s,'archive');act(s,'origin_register');assert.equal(s.familyOrigins.run.evidence.length,1);assert.equal(s.familyOrigins.run.findings.length,0);
});

test('loss of the captured home exposes the record-only path instead of a permanently disabled interview',()=>{
 const s=fresh();act(s,'origin_accept');s.world.locations.find(p=>p.id===s.familyOrigins.run.locationId).status='destroyed';const before=s.day;act(s,'origin_guardian');pick(s,'object');assert.equal(s.day,before);assert.equal(s.familyOrigins.run.step,'register');assert.ok(s.familyOrigins.run.evidence.some(e=>e.id==='guardian_unavailable'));
});

test('register inspection acquires proof and one Scholarship once; missing named provider is not replaced',()=>{
 const s=fresh(),skill=s.hero.skills.scholarship;registerStep(s);assert.equal(s.hero.skills.scholarship,skill+1);assert.ok(s.familyOrigins.run.cast.lead);roundtrip(s);
 const before=structuredClone(s);assert.equal(applyOriginAction(s,'origin_register',context(s)),false);assert.deepEqual(s,before);
 const next=guardianStep(fresh());const r=next.familyOrigins.run;next.world.locations.find(p=>p.id===r.locationId).servicesAvailable=false;act(next,'origin_register');pick(next,'inspect');assert.ok(r.evidence.some(e=>e.id==='register_unavailable'));assert.ok(!r.evidence.some(e=>e.id==='register_inspected'));assert.equal(r.cast.lead,null);assert.equal(next.hero.skills.scholarship,skill);
});

test('inspection respects the save-valid Scholarship cap',()=>{const s=fresh();s.hero.skills.scholarship=10000;registerStep(s);assert.equal(s.hero.skills.scholarship,10000);roundtrip(s);});

test('adolescent tracking exposes only this case and has a Journal control',()=>{const s=fresh();act(s,'origin_accept');s.age=13;const actions=E.getActions(s);assert.ok(actions.some(a=>a.id==='journal_track_family-origin'));assert.ok(!actions.some(a=>a.id==='journal_main_accept'));const html=renderSimpleJournal(s,actions,ui);assert.match(html,/journal_track_family-origin/);});

test('zero attendance, reload, cancellation and continuation preserve exact pending terms and no unearned evidence',()=>{
 let s=fresh();act(s,'origin_accept');act(s,'origin_guardian');const snapshot=structuredClone(s.familyOrigins.pending);pick(s,'object',context(s,{limit:0}));assert.equal(s.familyOrigins.project.remainingDays,1);assert.equal(s.familyOrigins.run.evidence.length,0);assert.deepEqual(s.familyOrigins.project.proposal,snapshot);s=roundtrip(s);
 const before={day:s.day,gold:s.hero.gold};act(s,'origin_cancel');assert.equal(s.day,before.day);assert.equal(s.hero.gold,before.gold);assert.equal(s.familyOrigins.run.evidence.length,0);
 act(s,'origin_guardian');pick(s,'names',context(s,{limit:0}));act(s,'origin_continue');assert.equal(s.day,before.day+1);assert.equal(s.familyOrigins.run.evidence.filter(e=>e.id==='guardian_account').length,1);roundtrip(s);
 move(s,'archive');for(let n=0;n<40;n++){act(s,'origin_register');pick(s,'inspect',context(s,{limit:0}));act(s,'origin_cancel');}
 assert.equal(s.familyOrigins.run.choices.filter(c=>c.sceneId==='register'&&c.id==='inspect').length,1);assert.ok(s.familyOrigins.run.choices.some(c=>c.sceneId==='guardian'&&c.id==='names'));assert.equal(validateFamilyOrigins(s.familyOrigins,s),true);
 act(s,'origin_register');pick(s,'inspect');assert.equal(s.familyOrigins.run.evidence.filter(e=>e.id==='register_inspected').length,1);roundtrip(s);
});

test('uncertainty and respectful stop are distinct complete accounts with immutable family state',()=>{
 for(const ending of ['keep','stop']){let s=registerStep(fresh({birthThread:'burned'}));const family=structuredClone(s.family),source=structuredClone(s.timeline.storybook);act(s,'origin_decide');pick(s,ending);assert.equal(s.familyOrigins.run.ending,ending==='keep'?'uncertain_account':'respectful_stop');assert.equal(s.familyOrigins.run.status,ending==='keep'?'completed':'stopped');assert.deepEqual(s.family,family);assert.deepEqual(s.timeline.storybook,source);assert.equal(questAccountReview(s).counts.failed,0);s=roundtrip(s);const html=renderSimpleJournal(s,E.getActions(s),{...ui,section:'archive'});assert.match(html,/data-family-origin-archive/);assert.ok(html.includes(e(s.familyOrigins.run.history.at(-1).text).split('\n')[0]));}
});

test('verified current custody is not consent; contact can yield a willing account or a respectful refusal',()=>{
 const outcomes=new Set();
 // Acceptance day selects the authored response, not a probability of survival.
 for(let n=0;n<12&&outcomes.size<2;n++){
  const s=fresh();s.day+=n;registerStep(s);const r=s.familyOrigins.run;assert.ok(r.cast.lead);assert.ok(!r.evidence.some(e=>e.id==='custodian_consent'));
  move(s,'shrine');act(s,'origin_contact');pick(s,'ask');outcomes.add(r.ending);assert.ok(['custodian_account','uncertain_account'].includes(r.ending));
  if(r.ending==='custodian_account'){assert.equal(r.evidence.find(e=>e.id==='custodian_consent').disposition,'willing');assert.equal(r.findings.at(-1).certainty,'attributed');assert.match(r.history.at(-1).text,/not to a bloodline/);}else{assert.equal(r.evidence.find(e=>e.id==='custodian_refusal').disposition,'refused');assert.ok(!r.evidence.some(e=>e.id==='custodian_account'));}
  roundtrip(s);
 }
 assert.deepEqual(outcomes,new Set(['custodian_account','uncertain_account']));
});

test('a custodian replaced during attendance cannot speak or consent through their successor',()=>{
 const s=registerStep(fresh()),r=s.familyOrigins.run;move(s,'shrine');act(s,'origin_contact');const id=r.cast.lead.id;
 pick(s,'ask',context(s,{onSpend(){const site=s.realm.sites[r.locationId];site.keeperArchive||=[];site.keeperArchive.push({...structuredClone(site.keeper),retiredDay:s.day});site.keeper.id+='-successor';}}));assert.equal(r.ending,'uncertain_account');assert.ok(!r.evidence.some(e=>['custodian_consent','custodian_account'].includes(e.id)));assert.equal(r.cast.lead.id,id);
});

test('old custodian provenance remains valid after its rolling institutional archive is trimmed',()=>{
 const s=registerStep(fresh()),r=s.familyOrigins.run;act(s,'origin_decide');pick(s,'keep');const place=s.realm.sites[r.locationId];place.keeper.id+='-later';place.keeperArchive=[];valid(s);assert.equal(r.cast.lead.identity.generation,0);
});

test('owner import rejects forged proof, unsupported childhood source, missing snapshots and mismatched event text',()=>{
 const pending=fresh();act(pending,'origin_accept');act(pending,'origin_guardian');
 for(const change of [s=>s.familyOrigins.pending.sceneSnapshot.body='Made-up source',s=>s.event.body='A generic daily event',s=>delete s.familyOrigins.pending.sceneSnapshot,s=>s.familyOrigins.run.anchor.flags.birthThread='burned',s=>s.familyOrigins.run.cast.guardian.id='fellow',s=>s.familyOrigins.run.cast.archivist.name='A different archivist',s=>s.familyOrigins.run.family.setup='legacy']){const s=structuredClone(pending);change(s);assert.equal(validateFamilyOrigins(s.familyOrigins,s),false);assert.equal(E.migrateSave(s),null);}
 const inspected=registerStep(fresh());
 for(const change of [s=>s.familyOrigins.run.evidence[0].verified=false,s=>s.familyOrigins.run.evidence[0].day=s.day+1,s=>s.familyOrigins.run.evidence[0].actorIds=['fellow'],s=>s.familyOrigins.run.evidence[0].objectId='another-register',s=>s.familyOrigins.run.evidence[0].id='faction-proof',s=>s.familyOrigins.run.evidence.push(structuredClone(s.familyOrigins.run.evidence[0])),s=>s.familyOrigins.run.findings[0].claim='Your parent is alive',s=>s.familyOrigins.run.choices=[],s=>s.familyOrigins.run.evidence.reverse(),s=>s.familyOrigins.run.evidence.push({id:'custodian_consent',kind:'consent',day:s.day,locationId:s.locationId,actorIds:[s.familyOrigins.run.cast.lead.id],objectId:'thread-packet',verified:true,disposition:'willing'}),s=>s.familyOrigins.run.cast.lead=null]){const s=structuredClone(inspected);change(s);assert.equal(validateFamilyOrigins(s.familyOrigins,s),false);assert.equal(E.migrateSave(s),null);}
});

test('complete parent snapshots and historical provider provenance cannot be reduced to convenient claims',()=>{
 const s=fresh();s.family.setup='single_parent';const parent=s.family.members.find(m=>m.personId==='family_parent');parent.personId=null;parent.relationship='birth parent';parent.availability='missing';act(s,'origin_accept');const copy=structuredClone(s);copy.familyOrigins.run.family.members=[];assert.equal(validateFamilyOrigins(copy.familyOrigins,copy),false);
 const inspected=registerStep(fresh()),r=inspected.familyOrigins.run,old=r.cast.lead.id;r.cast.lead.id=`keeper-${r.locationId}-1`;r.cast.lead.identity.generation=1;for(const token of r.evidence)token.actorIds=token.actorIds.map(id=>id===old?r.cast.lead.id:id);assert.equal(validateFamilyOrigins(inspected.familyOrigins,inspected),false);
});

test('the optional integrated NPC resolver accepts only an exact dated archivist record, never a current-office alias',()=>{
 const s=registerStep(fresh()),r=s.familyOrigins.run,old=r.cast.archivist.id,id=`resident-npc16-archivist-${r.locationId}-r1`;r.cast.archivist.id=id;r.cast.archivist.name='A New Individual';for(const proof of r.evidence)proof.actorIds=proof.actorIds.map(x=>x===old?id:x);
 const record={slotKey:`service:${r.locationId}:archivist:`,snapshot:{id,name:'A New Individual',role:'Archivist',locationId:r.locationId},observedDay:r.acceptedDay,retireDay:s.day+1000,retiredDay:null};
 assert.equal(validateFamilyOrigins(s.familyOrigins,s),false);assert.equal(validateFamilyOrigins(s.familyOrigins,s,{npcRecord:key=>key===id?record:null}),true);
 for(const change of [n=>n.slotKey='service:another-site:archivist:',n=>n.snapshot.name='The Replacement',n=>n.snapshot.role='Doctor',n=>n.observedDay=s.day+1,n=>n.retireDay=r.acceptedDay]){const bad=structuredClone(record);change(bad);assert.equal(validateFamilyOrigins(s.familyOrigins,s,{npcRecord:()=>bad}),false);}
 const legacy=registerStep(fresh()),ref=legacy.familyOrigins.run.cast.archivist,legacyRecord={...record,slotKey:`service:${ref.locationId}:archivist:`,snapshot:{id:ref.id,name:ref.name,role:'Archivist',locationId:ref.locationId},observedDay:ref.capturedDay,retireDay:legacy.day+1000};
 assert.equal(validateFamilyOrigins(legacy.familyOrigins,legacy,{npcRecord:()=>legacyRecord}),true);legacyRecord.retireDay=ref.capturedDay;
 assert.equal(validateFamilyOrigins(legacy.familyOrigins,legacy,{npcRecord:()=>legacyRecord}),false,'a recorded retirement outranks the old epoch projection');
});

test('public engine preserves exact authored event, outcome and Journal instead of daily filler',()=>{
 let s=fresh();s=E.chooseAction(s,'origin_accept');s=E.chooseAction(s,'origin_guardian');assert.equal(s.event.title,'What was kept');assert.match(s.event.body,/I kept what I could/);s=roundtrip(s);
 s=E.chooseEventOption(s,'object');assert.equal(s.day,base.day+1);assert.equal(s.familyOrigins.run.step,'register');assert.equal(s.notice,s.familyOrigins.run.history.at(-1).text);assert.equal(s.journal.at(-1).text,s.notice);assert.match(s.notice,/silver thread/);s=atService(s,'origin_register');s=E.chooseAction(s,'origin_register');assert.equal(s.event.title,'The mark beside the names');
 s=E.chooseEventOption(s,'inspect');assert.equal(s.familyOrigins.run.step,'decision');assert.equal(s.notice,s.journal.at(-1).text);assert.equal(s.notice,s.familyOrigins.run.history.at(-1).text);s=E.chooseAction(s,'origin_decide');s=E.chooseEventOption(s,'keep');assert.equal(s.familyOrigins.run.ending,'uncertain_account');assert.match(s.notice,/neither has to silence/);roundtrip(s);
});

test('a one-day birthday boundary preserves the completed step and the birthday decision separately',()=>{
 let s=fresh();s.day=(s.age+1)*365-1;s=E.chooseAction(s,'origin_accept');s=E.chooseAction(s,'origin_guardian');const before=s.day;s=E.chooseEventOption(s,'object');assert.equal(s.day,before+1);assert.equal(s.familyOrigins.run.step,'register');assert.equal(s.familyOrigins.project,null);assert.ok(s.event?.id.startsWith('birth_'));assert.equal(s.familyOrigins.run.evidence.length,1);roundtrip(s);
});

test('legacy initial attendance honors a due deadline and reloads the unworked proposal',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/legacy-v1.json',import.meta.url),'utf8')).states.adult;let s=E.migrateSave(old);s.flags.familyOriginInterest=true;s.event=null;s.hero.gold=10000;
 s=E.chooseAction(s,'origin_accept');const r=s.familyOrigins.run;s.locationId=r.locationId;syncCartography(s);for(const room of serviceWalkPath(s,'homes')||[])s=E.chooseAction(s,'atlas_room_'+room);s=E.chooseAction(s,'origin_guardian');assert.equal(s.event.id,'origin_guardian');const before=s.day;
 s.obligations.push({id:'family-test-deadline',title:'A previously accepted promise',description:'An explicit controlled deadline fixture.',dueDay:s.day,resolved:false});s=E.chooseEventOption(s,'object');assert.equal(s.day,before);assert.ok(s.familyOrigins.project,JSON.stringify({notice:s.notice,run:s.familyOrigins.run,event:s.event,guardian:s.life.people.find(p=>p.id==='kin')}));assert.equal(s.familyOrigins.project.remainingDays,1);assert.equal(s.familyOrigins.run.evidence.length,0);assert.equal(s.event.id,'annual_deadline_review');roundtrip(s);
});

test('accepted search tracking, pause and retirement distinguish it from a declined offer',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/legacy-v1.json',import.meta.url),'utf8')).states.adult;let s=E.migrateSave(old);s.day=60;s.flags.familyOriginInterest=true;s=E.chooseAction(s,'origin_accept');s=E.chooseAction(s,'journal_track_family-origin');assert.equal(trackedQuest(s).key,'family-origin');s=E.chooseAction(s,'origin_pause');assert.equal(trackedQuest(s),null);s=E.chooseAction(s,'origin_resume');assert.equal(s.familyOrigins.run.status,'active');
 s=E.chooseAction(s,'retire');assert.equal(s.event?.id,'retirement');s=E.chooseEventOption(s,'settle');assert.equal(s.phase,'retired');assert.equal(s.familyOrigins.run.status,'left_unfinished');assert.ok(s.questLog.closingReview.unfinished.some(r=>r.id==='family-origin'));roundtrip(s);
});

test('production Journal handler reads and declines this single invitation without starting a search',async t=>{
 const s=fresh(),surface=await mountApp(t, {rulebooks:'both', states:[s]});await surface.click('title-continue');await surface.click('menu','header');await surface.click('tab','journal');assert.ok(surface.root.querySelector('[data-family-origin-invitation]'));const before=structuredClone(surface.current());
 await surface.click('activity','origin_decline');assert.equal(surface.current().familyOrigins.run,null);assert.equal(surface.current().familyOrigins.invitation,'declined');assert.equal(surface.current().day,before.day);assert.equal(surface.current().hero.gold,before.hero.gold);roundtrip(surface.current());
});
