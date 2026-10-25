import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { setImmediate as settle } from 'node:timers/promises';
import * as E from '../dist/js/engine.js';
import { renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { createPersonalNoteDrafts } from '../dist/js/personal-note-drafts.js';
import { PRONOUN_LABELS, pronounDisplayLabel } from '../dist/js/identity-labels.js';
import { defaultCreatorDraft, renderCharacterCreator } from '../dist/js/creator.js';
import { getContacts } from '../dist/js/conversations.js';
import { receiveNotification, notificationsFor } from '../dist/js/notifications-v40.js';
import { createSaveStore } from '../dist/js/saves.js';
import { mountApp } from './helpers/ui-surface.mjs';
const base=E.migrateSave(JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url)))).states.base);
const fresh=()=>structuredClone(base);
const KEY='hearth-and-oath:slots:v1',LIFE='hearth-and-oath:life:v1';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={e,paragraphs:text=>'<p>'+e(text)+'</p>',date:n=>'Day '+n,button:(label,op,id='',cls='',disabled=false)=>`<button data-op="${e(op)}" data-id="${e(id)}" ${disabled?'disabled':''}>${label}</button>`};
const control=(ui,op)=>ui.root.querySelector(`[data-op="${op}"]`);
async function notes(t,s=fresh(),options={}){const ui=await mountApp(t, {states:[s],...options});await ui.click('title-continue');await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');return ui;}
async function type(ui,text){const field=ui.root.querySelector('#note-text');assert.ok(field);field.value=text;await ui.fire('input',field);return field;}
function careState(){const s=fresh();s.event=null;s.battle=null;s.flags.herbs=4;s.hero.hp=s.hero.maxHp;s.life.health=100;s.life.stress=0;return s;}

test('UI 028 authoritative care preview is pure and matches time/materials for healthy, ill, injured and empty-supply lives',()=>{
 for(const kind of ['healthy','fever','injury','empty']){
  const s=careState();if(kind==='empty')s.flags.herbs=0;
  if(['fever','injury'].includes(kind)){s.health.physical=[{id:kind+'-'+s.day,type:kind,severity:1,sinceDay:s.day,lastEffectDay:s.day,careUntil:0,acknowledged:true}];s.hero.hp-=12;s.life.health=60;s.life.stress=20;}
  assert.equal(E.validateSave(s),true,kind);const before=structuredClone(s),quote=E.herbalCareQuote(s);assert.deepEqual(s,before);
  const next=E.useConsumable(s,'herbs');assert.equal(E.validateSave(next),true,kind);
  if(kind==='empty'){assert.ok(quote.disabledReason);assert.equal(next.day,s.day);assert.equal(next.flags.herbs,0);continue;}
  assert.equal(quote.disabledReason,null,kind);assert.equal(next.day-s.day,quote.days);assert.equal(s.flags.herbs-next.flags.herbs,quote.materials.herbs);
  assert.match(next.notice,new RegExp('Herbal care for '+s.hero.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(next.notice,/1 Medicinal Herb used; 2 days passed/);assert.match(next.notice,/Actual session changes:/);assert.match(next.notice,/Physical care is supported through day/);
  assert.ok(next.health.care.medicineUntil>=next.day+quote.effects.supportDays);
  if(kind==='healthy'){assert.equal(next.hero.hp,s.hero.hp);assert.match(next.notice,/preventive support/);assert.match(quote.effectExplanation,/full Health/);}
  else assert.match(next.notice,/not an instant cure/);
 }
});

test('UI 028 opening and cancelling preparation spends nothing; confirming once shows actual care receipt',async t=>{
 const s=careState(),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','inventory');await ui.click('inventory-item','supply:herbs');const before=ui.current();
 await ui.click('use-consumable','herbs');assert.deepEqual(ui.current(),before);assert.ok(ui.root.querySelector('.herbal-care-dialog'));assert.match(ui.root.innerHTML,/2 Days · No Fee · 1 Medicinal Herb/);assert.match(ui.root.innerHTML,/Recipient:/);assert.match(ui.root.innerHTML,/preventive supportive care/);
 await ui.key('Escape');assert.deepEqual(ui.current(),before);assert.equal(ui.document.activeElement.dataset.op,'use-consumable');
 await ui.click('use-consumable','herbs');const commit=control(ui,'herbal-care-confirm');const held=await ui.key('Enter',{target:commit,repeat:true});assert.equal(held.defaultPrevented,true);assert.deepEqual(ui.current(),before);
 await ui.fire('click',commit);const after=ui.current();assert.equal(after.flags.herbs,before.flags.herbs-1);assert.equal(after.day,before.day+2);assert.match(after.notice,/Actual session changes/);await ui.fire('click',commit);assert.deepEqual(ui.current(),after);
});

test('UI 029 drafts survive reference detours, Journal subtabs, inbox and ordinary rerenders without committing',async t=>{
 const ui=await notes(t),before=ui.current(),text='  lower brook\n\nÉlan Ω </textarea><b>literal</b>  ';await type(ui,text);
 for(const route of ['inventory','character']){await ui.click('tab',route);await ui.click('tab','journal');assert.equal(ui.root.querySelector('#note-text').value,text);}
 await ui.click('workspace-section','journal:archive');await ui.click('workspace-section','journal:notes');assert.equal(ui.root.querySelector('#note-text').value,text);
 await ui.click('notifications');await ui.key('Escape');assert.equal(ui.root.querySelector('#note-text').value,text);assert.deepEqual(ui.current(),before);
 await ui.click('personal-note-write');assert.equal(ui.document.activeElement.id,'note-text');assert.equal(ui.root.querySelector('#note-text').value,text);await ui.click('personal-note-back');assert.equal(ui.document.activeElement.dataset.op,'personal-note-write');assert.deepEqual(ui.current(),before);
});

test('UI 029 Keep Note commits exactly once, then clears only its own successful draft',async t=>{
 const ui=await notes(t);await type(ui,'remember the notice board');const form=ui.root.querySelector('#player-note');await ui.fire('submit',form);await settle();
 const after=ui.current();assert.equal(after.playerNotes.at(-1).text,'remember the notice board');assert.equal(after.playerNotes.length,(base.playerNotes||[]).length+1);assert.equal(ui.root.querySelector('#note-text').value,'');assert.equal(ui.document.activeElement.id,'note-text');
 await ui.fire('submit',form);assert.deepEqual(ui.current(),after);await ui.click('tab','inventory');await ui.click('tab','journal');assert.equal(ui.root.querySelector('#note-text').value,'');
});

test('UI 029 failed persistence retains the exact draft; retry saves the already adopted note without duplication',async t=>{
 const ui=await notes(t),before=ui.current(),write=ui.storage.setItem;await type(ui,'Retry without a duplicate.');
 ui.storage.setItem=(key,value)=>{if([KEY,LIFE].includes(key))throw Error('Quota');write(key,value);};
 await ui.fire('submit',ui.root.querySelector('#player-note'));await settle();assert.deepEqual(ui.current(),before);assert.equal(ui.root.querySelector('#note-text').value,'Retry without a duplicate.');assert.match(ui.root.querySelector('#note-draft-status').textContent,/Retry saving/);assert.match(ui.root.innerHTML,/Retry Saving Note/);
 await ui.click('tab','inventory');await ui.click('tab','journal');assert.equal(ui.root.querySelector('#note-text').value,'Retry without a duplicate.');ui.storage.setItem=write;
 await ui.fire('submit',ui.root.querySelector('#player-note'));await settle();const after=ui.current();assert.equal(after.playerNotes.filter(n=>n.text==='Retry without a duplicate.').length,1);assert.equal(ui.root.querySelector('#note-text').value,'');
});

test('UI 029 a pending save retains text and rejects repeated submissions until durability succeeds',async t=>{
 let held=false;const gates=[],locks={async request(name,options,operation){if(held)await new Promise(resolve=>gates.push(resolve));return operation();}};
 const ui=await notes(t,fresh(),{locks});await settle();await type(ui,'Only once under the held browser lock.');held=true;
 const form=ui.root.querySelector('#player-note');await ui.fire('submit',form);assert.equal(ui.root.querySelector('#note-text').value,'Only once under the held browser lock.');assert.equal(ui.root.querySelector('#player-note').getAttribute('aria-busy'),'true');assert.equal(ui.root.querySelector('#player-note button[type="submit"]').disabled,true);
 await ui.fire('submit',form);await ui.fire('submit',ui.root.querySelector('#player-note'));held=false;gates.splice(0).forEach(resolve=>resolve());await settle();await settle();
 assert.equal(ui.current().playerNotes.filter(n=>n.text==='Only once under the held browser lock.').length,1);assert.equal(ui.root.querySelector('#note-text').value,'');
});

test('UI 029 drafts are isolated even for two slots with identical seeds and person IDs; discard affects one life',async t=>{
 const a=fresh(),b=fresh(),ui=await notes(t,a,{states:[a,b]});await type(ui,'First life draft.');
 async function load(id){await ui.click('title-menu');await ui.click('title-load');await ui.click('slot-load',String(id));await ui.click('tab','journal');await ui.click('workspace-section','journal:notes');}
 await load(1);assert.equal(ui.root.querySelector('#note-text').value,'');await type(ui,'Second life draft.');await load(0);assert.equal(ui.root.querySelector('#note-text').value,'First life draft.');await ui.click('personal-note-discard');assert.equal(ui.root.querySelector('#note-text').value,'');await load(1);assert.equal(ui.root.querySelector('#note-text').value,'Second life draft.');
 assert.deepEqual(ui.current(),b);
 const first=createPersonalNoteDrafts();first.write('same owner','page-only');assert.equal(createPersonalNoteDrafts().get('same owner').text,'','reload starts another page session');
});

test('UI 030 Write Note precedes every discovery at zero, one, 33 and 125 records; search distinguishes unmatched from empty',()=>{
 for(const count of [0,1,33,125]){
  const s=fresh();s.realm.politics.knownRegions=[];s.realm.politics.dispatches=[];s.lore.discovered=[];s.lore.records=Array.from({length:count},(_,i)=>({id:'layout-stress-'+i,title:'Stored Discovery '+i,text:'An actual test record '+i}));const before=structuredClone(s);
  const html=renderSimpleJournal(s,[],{...helpers,section:'notes'});assert.ok(html.includes('data-op="personal-note-write"'));assert.ok(html.indexOf('data-op="personal-note-write"')<html.indexOf('id="player-note"'));if(count)assert.ok(html.indexOf('data-op="personal-note-write"')<html.indexOf('class="remembered-entry"'));assert.match(html,new RegExp('Discoveries: '+count+' recorded'));
  const search=renderSimpleJournal(s,[],{...helpers,section:'notes'},{query:'zzzauditnomatch'});assert.match(search,/No discoveries match this search/);assert.ok(!search.includes('Your notebook is still empty'));assert.match(search,new RegExp('Discoveries: 0 matching / '+count+' recorded'));assert.match(search,/data-op="journal-clear"/);assert.deepEqual(s,before);
 }
});

test('UI 027 pronoun labels agree in creation, Character and attributes without changing values or custom text',async t=>{
 for(const [value,label] of Object.entries(PRONOUN_LABELS)){
  assert.equal(pronounDisplayLabel(value),label);const draft={...defaultCreatorDraft('labels'),identityChoice:value,pronouns:value};const before=structuredClone(draft),html=renderCharacterCreator(draft);assert.match(html,new RegExp('value="'+value+'" selected>'+label));assert.deepEqual(draft,before);
 }
 assert.equal(pronounDisplayLabel('Xe/xEm'),'Xe/xEm');assert.equal(pronounDisplayLabel('future_internal_enum'),'Pronouns Unrecorded');
 const s=fresh();s.hero.pronouns='they/them';const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','character');assert.match(ui.root.innerHTML,/They\/Them/);assert.equal(ui.current().hero.pronouns,'they/them');await ui.click('customize');assert.match(ui.root.innerHTML,/They\/Them/);
});

test('UI 006 title Settings and Load place connected heading focus; Escape returns to the Settings opener',async t=>{
 const ui=await mountApp(t, {states:[fresh()]});await ui.click('title-settings');assert.equal(ui.document.activeElement.tagName,'H1');assert.match(ui.document.activeElement.textContent,/Sound.*display/);assert.equal(ui.document.activeElement.isConnected,true);await ui.key('Escape');assert.equal(ui.document.activeElement.dataset.op,'title-settings');await ui.click('title-load');assert.equal(ui.document.activeElement.id,'slot-heading');assert.equal(ui.document.activeElement.isConnected,true);
});


test('UI 029 editing a retained failed draft retries the same note with the corrected words',async t=>{
 const ui=await notes(t),write=ui.storage.setItem;await type(ui,'Original unsaved wording.');ui.storage.setItem=(key,value)=>{if([KEY,LIFE].includes(key))throw Error('Quota');write(key,value);};
 await ui.fire('submit',ui.root.querySelector('#player-note'));await settle();await type(ui,'Corrected wording after the failed save.');ui.storage.setItem=write;
 await ui.fire('submit',ui.root.querySelector('#player-note'));await settle();assert.equal(ui.current().playerNotes.length,(base.playerNotes||[]).length+1);assert.equal(ui.current().playerNotes.at(-1).text,'Corrected wording after the failed save.');assert.equal(ui.root.querySelector('#note-text').value,'');
});

test('UI 028 a conflicting saved position invalidates an open review and its detached confirm button',async t=>{
 const s=careState(),ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('tab','inventory');await ui.click('inventory-item','supply:herbs');await ui.click('use-consumable','herbs');const stale=control(ui,'herbal-care-confirm');
 const remote=E.keepPlayerNote(s,'Written in another tab.');assert.equal(createSaveStore(ui.storage,E.migrateSave).write(0,remote),true);await ui.windowEvent('storage',{key:KEY});await settle();assert.equal(ui.root.querySelector('.herbal-care-dialog'),null);await ui.fire('click',stale);assert.equal(ui.lives()[0].flags.herbs,s.flags.herbs);assert.equal(ui.lives()[0].day,s.day);assert.match(ui.root.innerHTML,/changed in another tab|conflict|saved-life conflict/i);
});

test('UI 006 an adult letter hands focus to Explore without spending travel time',async t=>{
 const s=fresh(),person=getContacts(s).find(p=>p.locationId&&s.cartography.sites[p.locationId])||getContacts(s)[0];assert.ok(person);
 receiveNotification(s,{kind:'letter',sourceId:'ui-audit-route',title:'A recorded place',body:'A letter already delivered to this adult.',personId:person.id});const ui=await mountApp(t, {states:[s]});await ui.click('title-continue');await ui.click('notifications');const id=notificationsFor(s).find(n=>n.sourceId==='ui-audit-route')?.id||notificationsFor(s)[0].id;await ui.click('notice-open',id);const before=ui.current();await ui.click('notice-person',person.id);assert.equal(ui.root.querySelector('.inbox-letter'),null);assert.ok(ui.document.activeElement.isConnected);assert.ok(ui.document.activeElement.closest('#main-content'));assert.notEqual(ui.document.activeElement,ui.document.body);assert.equal(ui.current().day,before.day);assert.equal(ui.current().hero.gold,before.hero.gold);
});

test('UI 010 active search reports matched and unfiltered counts and Clear Search restores recorded discoveries',async t=>{
 const s=fresh(),ui=await notes(t,s),before=ui.current(),form=ui.root.querySelector('#journal-search');form.querySelector('input').value='zzzauditnomatch';await ui.fire('submit',form);assert.match(ui.root.innerHTML,/No discoveries match this search/);assert.match(ui.viewStatus.textContent,/Discoveries: 0 matching/);assert.match(ui.viewStatus.textContent,/personal notes/i);await ui.click('journal-clear');assert.equal(ui.root.querySelector('#journal-query').value,'');assert.ok(ui.root.querySelectorAll('.remembered-entry').length>0);assert.deepEqual(ui.current(),before);
 const stress=fresh();stress.socialLife.favors=[{id:'audit-favor',personId:'audit-person',name:'A Recorded Neighbor',status:'active',locationId:stress.locationId,item:'ore'}];const html=renderSimpleJournal(stress,[],{...helpers,section:'active'},{query:'zzzauditnomatch'});assert.match(html,/No Active Quests Match This Search/);assert.match(html,/Active quests and commitments: 0 matching \/ [1-9]\d* recorded/);
});
