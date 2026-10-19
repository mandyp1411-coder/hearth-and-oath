import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {MAX_SAVE_CHARS} from '../dist/js/save-limits.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { freshStory, act, pick, walk, roundtrip, adultFamily, introduceFamily } from './helpers/story-life-fixtures.mjs';
import { routineOffers, routineReview, executeRoutine } from '../dist/js/routine-planner.js';
import { lifeCalendarRows, lifeChapterView, independentLifeRows, renderLifeContext } from '../dist/js/life-context.js';
import { childhoodScene } from '../dist/js/childhood-stories.js';
import { groundedEvent, groundedNote } from '../dist/js/grounded-narrative-content.js';
import { receiveNotification, notificationsFor, unreadNotifications, markNotificationsRead } from '../dist/js/notifications-v40.js';
import { renderInbox } from '../dist/js/notifications-ui-v40.js';
import { activeJournalQuests, offeredJournalQuests, renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { getContacts } from '../dist/js/conversations.js';
import { syncCartography } from '../dist/js/cartography.js';
import { closeQuestAccounts } from '../dist/js/quest-records.js';
import { RPG_FACTIONS_V27 } from '../dist/js/rpg-depth-v27.js';
import { FIRST_MISSION_METHODS } from '../dist/js/faction-mission-state.js';
import { settlementServices } from '../dist/js/world-services.js';
import { mazeLayout } from '../dist/js/maze-v31.js';
import { newMazeDimensions } from '../dist/js/maze-dimensions.js';
import { renderStoryDecisions } from '../dist/js/journal-history.js';
import { displayPreset, normalizeDisplay } from '../dist/js/display.js';
import { mountApp } from './helpers/ui-surface.mjs';
import { compatibilityConversation, compatibilityView } from '../dist/js/family-depth.js';
import { PORTRAIT_CATALOG, portraitPreset } from '../dist/js/portrait-catalog.js';

const readers={getActions:E.getActions,chooseAction:E.chooseAction,getLifeCommitment:E.getLifeCommitment};
const ui={e:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),date:d=>'Day '+d,paragraphs:v=>'<p>'+v+'</p>',button:(label,op,id,cls,disabled)=>`<button data-op="${op}" data-id="${id}"${disabled?' disabled':''}>${label}</button>`};
function atPerson(s,id){const p=getContacts(s).find(p=>p.id===id);s.locationId=p.locationId;syncCartography(s);s.cartography.interior={siteId:s.locationId,roomId:p.roomId||'gate'};return E.migrateSave(s);}

test('infancy continuation keeps the same specific caregiver outcome in storybook and Journal',()=>{
 const s=E.createBirthGame({seed:'v59-observed-care',familySetup:'two_parents',household:'tradesfolk'}),before=structuredClone(s),n=E.chooseEventOption(s,'continue');
 assert.deepEqual(s,before);assert.deepEqual(E.getActions(s),[]);assert.equal(s.event.choices.length,1);
 const record=n.timeline.storybook.records.at(-1);assert.ok(record?.outcome);assert.ok(n.journal.some(r=>r.text===record.outcome));assert.doesNotMatch(record.outcome,/This marks an earlier/);roundtrip(n);
});
test('school-specific premises require actual enrollment and attendance for new scenes',()=>{
 const s=E.createBirthGame({seed:'v59-school-context'});s.age=8;s.day=8*365;s.timeline.storybook.pending=null;s.timeline.storybook.records=[];s.education.enrolled=false;s.education.attendance=0;s.education.attendanceThisYear=0;
 for(let i=0;i<80;i++){s.seed='v59-school-'+i;assert.ok(!['chalk-answer','ink-blot','wrong-prayer','window-seat'].includes(childhoodScene(s).id));}
});
test('unknown future event and note IDs preserve authored facts and numerical choice terms',()=>{
 const s=freshStory(),event={id:'future_scene_901',title:'The Broken Hinge',body:'Nela brought back the hinge on day 12.',choices:[{id:'inspect',label:'Inspect Nela’s hinge',description:'Spend 2 days and 8 gold.',days:2,cost:8}]};
 const view=groundedEvent(s,event);assert.equal(view.title,event.title);assert.equal(view.body,event.body);assert.equal(view.choices[0].cost,8);
 assert.deepEqual(groundedNote(s,{id:'future_note_901',title:'Nela’s Test',text:'The hinge failed under its own weight.'}),{title:'Nela’s Test',text:'The hinge failed under its own weight.'});
});
test('new speech stores channel and dates; absent legacy channel stays unknown on import',()=>{
 let s=atPerson(freshStory(),'fellow');s=act(s,'talk_fellow');const m=s.conversations.threads.fellow.at(-1);assert.equal(m.channel,'spoken');assert.equal(m.authoredDay,s.day);assert.equal(m.receivedDay,s.day);roundtrip(s);
 const bad=structuredClone(s);bad.conversations.threads.fellow.at(-1).channel='telepathy';assert.equal(E.validateSave(bad),false);
 delete m.channel;delete m.authoredDay;delete m.receivedDay;roundtrip(s);assert.equal(s.conversations.threads.fellow.at(-1).channel,undefined);
});
test('the 81st unread receipt retains all earlier words and archived read state survives reload',()=>{
 const s=freshStory();delete s.inbox;for(let i=0;i<81;i++)receiveNotification(s,{kind:'gift',sourceId:'v59:'+i,title:'Gift '+i,body:'Exact recorded words '+i});
 assert.equal(notificationsFor(s).length,81);assert.equal(unreadNotifications(s),81);assert.equal(s.inbox.archive.length,1);
 const first=s.inbox.archive[0],n=markNotificationsRead(s,first.id);assert.equal(unreadNotifications(n),80);assert.equal(n.inbox.archive[0].body,first.body);roundtrip(n);
 const html=renderInbox(n,ui,{page:4});assert.match(html,/Exact recorded words|Gift 0/);assert.equal((html.match(/class="inbox-entry /g)||[]).length,1);
});
test('retention is bounded, preserves unread before read and explicitly records older notices',()=>{
 const s=freshStory();delete s.inbox;for(let i=0;i<405;i++)receiveNotification(s,{kind:'gift',sourceId:'retention:'+i,title:'Gift '+i,body:'Receipt '+i});
 assert.equal(notificationsFor(s).length,400);assert.equal(s.inbox.retention.olderUnread,5);assert.match(renderInbox(s,ui),/5 unread/);roundtrip(s);
});
test('unheard personal offers appear in current Journal without accepting work; deferral remains a saved proposal',()=>{
 let s=freshStory();const offered=offeredJournalQuests(s,E.getActions(s)).find(q=>q.accept==='stories_open_two_names');assert.ok(offered?.review);const before=structuredClone(s);renderSimpleJournal(s,E.getActions(s),ui);assert.deepEqual(s,before);
 s=act(s,offered.accept);s=pick(s,'defer');const q=activeJournalQuests(s).find(q=>q.key==='story:two_names');assert.equal(q.status,'considering');assert.equal(s.stories.project,null);assert.equal(s.stories.arcs[0].choices.length,0);roundtrip(s);
});
test('all captured decisions and costs remain visible in a five-chapter archive',()=>{
 const arc={id:'legacy-five',choices:Array.from({length:5},(_,i)=>({label:'Choice '+i,outcome:'Exact outcome '+i,day:i,days:2,cost:4,reward:22}))};const before=structuredClone(arc),html=renderStoryDecisions(arc,ui);
 for(let i=0;i<5;i++){assert.ok(html.includes('Choice '+i));assert.ok(html.includes('Exact outcome '+i));}assert.equal((html.match(/data-story-decision=/g)||[]).length,5);assert.deepEqual(arc,before);
});
for(const [id,methods]of Object.entries(FIRST_MISSION_METHODS))for(const method of methods)test(`closing ${id}/${method} preserves a valid faction account exactly once`,()=>{
 let s=freshStory();const d=RPG_FACTIONS_V27.find(f=>f.id===id),place=s.world.locations.find(p=>s.realm.sites[p.id]?.regionId===d.regionId&&settlementServices(s,{siteId:p.id}).some(r=>r.kind==='faction'&&r.subjectId===id));
 s.locationId=place.id;syncCartography(s);for(const k of ['scholarship','persuasion','weapons','stealth','survival'])s.hero.skills[k]=4;Object.assign(s.equipment.materials,{wood:4,cloth:4});s=E.migrateSave(s);
 const provider=settlementServices(s).find(r=>r.kind==='faction'&&r.subjectId===id);s=walk(s,provider.roomId);s=act(s,'rpg_join_'+id);s=act(s,'rpg_faction_'+id);s=pick(s,'accept_'+method);
 closeQuestAccounts(s,'retirement');assert.ok(s.questLog.closingReview.unfinished.some(q=>q.kind==='faction'));const saved=structuredClone(s.questLog.closingReview);closeQuestAccounts(s,'death');assert.deepEqual(s.questLog.closingReview,saved);roundtrip(s);
});
test('routine preview is pure; execution matches canonical sessions and stops for a birthday',()=>{
 let s=freshStory();s.hero.hp=Math.max(1,s.hero.maxHp-20);const before=structuredClone(s),review=routineReview(s,'health_rest',2,readers);assert.ok(review);assert.deepEqual(s,before);
 const result=executeRoutine(s,review,readers);assert.equal(result.state.day-s.day,6);assert.equal(result.completed,2);assert.deepEqual(s,before);roundtrip(result.state);
 const near=freshStory();near.day=(near.timeline.birthDay||0)+(near.age+1)*365-2;const r=routineReview(near,'health_rest',2,readers);assert.equal(r,null,'a full three-day care session must not bypass the due birthday gate');
 const forged={...review,directFee:0,cycles:99};assert.equal(executeRoutine(s,forged,readers).state,s);
});
test('calendar and causal views are pure projections; a child’s plans stay their own',()=>{
 const s=introduceFamily(adultFamily()),before=structuredClone(s),rows=independentLifeRows(s);assert.ok(rows.some(p=>p.summary.includes('wants to')||p.summary.includes('chose to')));assert.ok(lifeCalendarRows(s).some(r=>r.kind==='Birthday'));assert.ok(lifeChapterView(s).title);renderLifeContext(s,E.getActions(s),ui);assert.deepEqual(s,before);roundtrip(s);
});
test('new short/medium/deep layouts are deterministic; legacy maps retain 121 rooms',()=>{
 const sizes=new Set();for(let i=0;i<30;i++){const old={version:1,kind:'radiant',seed:'size-contract-'+i},legacy=mazeLayout(old),m={...old,...newMazeDimensions(old)};sizes.add(m.layoutSize);assert.equal(legacy.cells.length,121);assert.equal(mazeLayout(m).cells.length,m.layoutSize*m.layoutSize);assert.deepEqual(mazeLayout(m),mazeLayout(structuredClone(m)));}
 assert.deepEqual([...sizes].sort((a,b)=>a-b),[5,7,11]);
});
test('all three native descent sizes retain exact archived geometry beside a later new descent',()=>{
 const sizes=new Set();
 for(let run=1;run<=30&&sizes.size<3;run++){
  const s=freshStory();s.mazeBook.nextRun=run;s.adventuring.rations=10;s.hero.hp=s.hero.maxHp;s.hero.mp=s.hero.maxMp;
  const original=structuredClone(s),entered=act(s,'adventure_descend'),m=entered.maze;assert.ok(m);assert.equal(m.layoutVersion,1);assert.equal(mazeLayout(m).cells.length,m.layoutSize*m.layoutSize);assert.deepEqual(s,original);roundtrip(entered);sizes.add(m.layoutSize);
  const malformed=structuredClone(entered);malformed.maze.layoutSize=[5,7,11].find(n=>n!==m.layoutSize);assert.equal(E.validateSave(malformed),false);
  const left=act(entered,'maze_exit');roundtrip(left);assert.equal(left.maze,null);assert.equal(left.mazeBook.records.at(-1).layoutSize,m.layoutSize);
  const returned=act(left,'adventure_descend');assert.notEqual(returned.maze.seed,m.seed);assert.equal(mazeLayout(returned.maze).cells.length,returned.maze.layoutSize**2);assert.deepEqual(returned.mazeBook.records,left.mazeBook.records);assert.deepEqual(mazeLayout(returned.mazeBook.records.at(-1)),mazeLayout(m));roundtrip(returned);
 }
 assert.deepEqual([...sizes].sort((a,b)=>a-b),[5,7,11]);
});
test('production Plans, review cancellation and reading presets change no game state',async t=>{
 const s=freshStory(),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('workspace-section','life:plans');assert.ok(surface.root.querySelector('[data-life-calendar]'));assert.ok(surface.root.querySelector('[data-consequence-ledger]'));const offer=surface.root.querySelector('[data-op="routine-review"]');assert.ok(offer);await surface.click('routine-review',offer.dataset.id);assert.equal(surface.document.activeElement?.dataset.op,'close-modal');await surface.click('close-modal');assert.deepEqual(surface.current(),s);
 await surface.click('game-settings');await surface.click('reading-preset','clear');assert.deepEqual(normalizeDisplay(displayPreset('clear')),{scale:1.3,font:'plain',singleKeyShortcuts:false,reducedMotion:true});assert.deepEqual(surface.current(),s);
});
test('new values discussions reveal one preference while older recorded knowledge remains intact',()=>{
 const s=freshStory(),p=s.life.people.find(p=>p.compatibility);p.compatibility.known=[];
 for(let count=1;count<=4;count++){const before=s.day;compatibilityConversation(s,p,'values','listen',{revealOne:true});assert.equal(compatibilityView(s,p).known.length,count);assert.equal(s.day,before);}
 compatibilityConversation(s,p,'values','listen',{revealOne:true});assert.equal(p.compatibility.known.length,4);
});
test('portrait identity is independent of hosted paths and embedded media URLs',()=>{
 const atlas=PORTRAIT_CATALOG['human-adult-00'],src=atlas.src,before=portraitPreset('p0001',{ancestry:'human',age:27});
 try{atlas.src='data:image/avif;base64,QUJD';const embedded=portraitPreset('p0001',{ancestry:'human',age:27});assert.equal(embedded.atlasId,before.atlasId);assert.equal(embedded.cell,before.cell);assert.equal(embedded.atlasId,'human-adult-00');}finally{atlas.src=src;}
});
test('project abandonment reviews committed losses, cancellation is free, and confirmation happens once',async t=>{
 let s=freshStory();s.hero.gold=1000;Object.assign(s.equipment.materials,{wood:20,stone:20,cloth:20});
 const provider=settlementServices(s).find(r=>r.kind==='smith');s=walk(s,provider.roomId);s.day=(s.timeline.birthDay||0)+(s.age+1)*365-1;s=act(s,'workshop_build_shelter');assert.ok(s.workshop.project);
 for(let i=0;s.event&&i<20;i++)s=pick(s,s.event.choices.find(c=>c.id==='care'&&!c.disabledReason)?.id||s.event.choices.find(c=>!c.disabledReason).id);
 roundtrip(s);const surface=await mountApp(t,{states:[s]});await surface.click('title-continue');const before=surface.current();
 await surface.click('activity','workshop_cancel');assert.match(surface.root.innerHTML,/Already committed/);assert.match(surface.root.innerHTML,/will not be refunded/);assert.equal(surface.document.activeElement?.dataset.op,'close-modal');assert.ok(isDeepStrictEqual(surface.current(),before));
 await surface.click('close-modal');assert.ok(isDeepStrictEqual(surface.current(),before));await surface.click('activity','workshop_cancel');const old=surface.root.querySelector('[data-op="project-abandon-confirm"]');await surface.click('project-abandon-confirm');const after=surface.current();assert.ok(isDeepStrictEqual(after,E.chooseAction(before,'workshop_cancel')));assert.equal(after.workshop.project,null);await surface.fire('click',old);assert.ok(isDeepStrictEqual(surface.current(),after));roundtrip(after);
});
test('unsubmitted notes warn on page exit without becoming a saved game note',async t=>{
 const s=freshStory(),surface=await mountApp(t,{states:[s]});await surface.click('title-continue');await surface.click('tab','journal');await surface.click('workspace-section','journal:notes');const field=surface.root.querySelector('#note-text');field.value='Unsubmitted thought';await surface.fire('input',field);const leaving=await surface.windowEvent('beforeunload');assert.equal(leaving.defaultPrevented,true);assert.ok(isDeepStrictEqual(surface.current(),s));
});

test('a genuinely played long life can begin a battle beyond the former 2M save limit and reload exactly',()=>{
 const before=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v0590-long-life-before-battle.json.gz',import.meta.url)))));assert.ok(before);const held=structuredClone(before),next=E.chooseAction(before,'maze_fight');
 assert.ok(next.battle,'the real offered encounter begins');assert.ok(JSON.stringify(next).length>2_000_000,'this reproduces the former limit');assert.ok(E.validateSave(next));assert.ok(isDeepStrictEqual(E.migrateSave(JSON.parse(JSON.stringify(next))),next),'all history, cast and battle data survive exact reload');assert.ok(isDeepStrictEqual(before,held),'the prior position is untouched');
 const oversized=structuredClone(next);oversized.extra='x'.repeat(MAX_SAVE_CHARS);assert.equal(E.validateSave(oversized),false,'serialized admission stays bounded');
});
