import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { onConversationAge } from '../dist/js/conversations.js';
import { onHealthTime } from '../dist/js/health.js';
import { contractCurse } from '../dist/js/curses.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { notificationsFor, unreadNotifications, receiveNotification, markNotificationsRead, NOTIFICATION_LIMIT } from '../dist/js/notifications-v40.js';
import { renderInbox, renderNotificationToasts } from '../dist/js/notifications-ui-v40.js';
import { mountApp } from './helpers/ui-surface.mjs';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz',import.meta.url))));
const fresh=()=>E.migrateSave(structuredClone(fixture.states.base)); // Explicit current-policy projection of the retained historical export.
const valid=s=>{assert.ok(E.validateSave(s),s.notice);return s;};
const stripped=s=>{const n=structuredClone(s);delete n.inbox;return n;};
let birthday;
const giftOpening=()=>birthday||=(async()=>createLifeAtAge({seed:'inbox-birthday-40',startAge:6,difficulty:'gentle',appearance:{ancestry:'human'}}))();

test('old saves remain untouched until an actual receipt exists, including exports and migration',()=>{
  const s=fresh(),before=structuredClone(s);assert.equal(s.inbox,undefined);assert.deepEqual(notificationsFor(s),[]);assert.equal(unreadNotifications(s),0);assert.equal(markNotificationsRead(s),s);assert.deepEqual(E.migrateSave(s),s);assert.deepEqual(s,before);
});
test('notification receipts are deduplicated, bounded and never award their described gift',()=>{
  const s=fresh(),before=structuredClone(s),row={kind:'gift',sourceId:'actual-gift-1',title:'A Gift',body:'A recorded gift.'};
  receiveNotification(s,row);receiveNotification(s,row);assert.equal(s.inbox.entries.length,1);assert.deepEqual(stripped(s),before);
  for(let i=0;i<100;i++)receiveNotification(s,{...row,sourceId:'actual-gift-'+i});assert.equal(s.inbox.entries.length,NOTIFICATION_LIMIT);assert.equal(new Set(s.inbox.entries.map(n=>n.id)).size,NOTIFICATION_LIMIT);valid(s);
});
test('reading messages changes only read state and saves exactly across reload',()=>{
  const s=fresh();receiveNotification(s,{kind:'letter',sourceId:'kept-letter',title:'A Kept Letter',body:'The actual words.',personId:'kin'});const before=structuredClone(s),id=notificationsFor(s)[0].id,n=markNotificationsRead(s,id);assert.equal(unreadNotifications(n),0);assert.equal(unreadNotifications(s),1);assert.deepEqual(stripped(n),stripped(s));assert.deepEqual(s,before);assert.equal(markNotificationsRead(n,'missing-id'),n);assert.deepEqual(E.migrateSave(JSON.parse(JSON.stringify(valid(n)))),n);
});
test('notices belong to the actual life and do not become an heir’s unread correspondence',()=>{
  const s=fresh();receiveNotification(s,{kind:'letter',sourceId:'letter-1',title:'For This Person',body:'A personal letter.'});const next=structuredClone(s);next.dynasty.generation++;assert.deepEqual(notificationsFor(next),[]);receiveNotification(next,{kind:'letter',sourceId:'letter-1',title:'For the Heir',body:'A different personal letter.'});assert.equal(notificationsFor(next).length,1);assert.equal(notificationsFor(s).length,1);assert.equal(next.inbox.entries.length,2);
});
test('real illness onset enters the inbox once and an existing symptom is not announced again',()=>{
  const s=fresh();s.day+=90;s.life.health=10;onHealthTime(s,{oldDay:s.day-90,newDay:s.day,outdoors:true});valid(s);const rows=notificationsFor(s).filter(n=>n.kind==='health');assert.ok(rows.length);assert.match(rows[0].body,/infection|fever|injury/i);const before=structuredClone(s.inbox);onHealthTime(s,{oldDay:s.day,newDay:s.day,outdoors:true});assert.deepEqual(s.inbox,before);
});
test('a real supernatural infection records a health message without granting another condition',()=>{
  const s=fresh();assert.ok(contractCurse(s,'vampire','An actual bite'));const rows=notificationsFor(s);assert.equal(rows.length,1);assert.equal(rows[0].kind,'health');assert.match(rows[0].body,/three days/);assert.equal(contractCurse(s,'vampire','Repeated bite'),false);assert.equal(notificationsFor(s).length,1);valid(s);
});
test('a real birthday payment produces one gift receipt with the amount actually credited',async()=>{
  const s=structuredClone(await giftOpening());assert.match(s.event.id,/^birth_/);const before=structuredClone(s),n=valid(E.chooseEventOption(s,'care')),gifts=notificationsFor(n).filter(r=>r.kind==='gift'&&!before.inbox?.entries.some(o=>o.id===r.id));assert.equal(gifts.length,1);const amount=Number(gifts[0].body.match(/received (\d+) Gold/)[1]);assert.ok(n.hero.gold>=s.hero.gold+amount);assert.deepEqual(s,before);assert.ok(notificationsFor(s).every(n=>n.read),'Generated past notices are already read.');assert.deepEqual(E.migrateSave(n),n);
});
test('actual birthday letters reach the inbox with their real sender and exact kept words',()=>{
  let s=fresh(),delivered=[];
  for(let year=0;year<9&&!delivered.length;year++){
    const before=new Set(notificationsFor(s).map(n=>n.id));s=E.ageUp(s);
    for(let step=0;step<100&&(s.event||s.timeline.yearTarget!==null);step++){
      delivered=notificationsFor(s).filter(n=>n.kind==='letter'&&!before.has(n.id));if(delivered.length)break;
      if(s.event){const c=s.event.choices.find(c=>['care','continue','leave','later','pause','rest'].includes(c.id)&&!c.disabledReason)||s.event.choices.find(c=>!c.disabledReason);s=E.chooseEventOption(s,c.id);}else s=E.continueAgeUp(s);
    }
    delivered=notificationsFor(s).filter(n=>n.kind==='letter'&&!before.has(n.id));
  }
  valid(s);assert.ok(delivered.length);for(const n of delivered){const letter=s.conversations.threads[n.personId].find(m=>m.id===n.sourceId);assert.ok(letter);assert.equal(letter.text,n.body);assert.equal(letter.speaker,n.personId);}
  const before=structuredClone(s.inbox);onConversationAge(s);assert.deepEqual(s.inbox,before);
});
test('a reserved companion cannot appear in the inbox before an actual meeting',()=>{
  const s=fresh(),mira=s.companions.find(p=>p.id==='mira');assert.ok(mira);mira.alive=true;mira.recruited=false;s.timeline.contentVersion=6;delete s.rpg.companionStages.mira;delete s.conversations.threads.mira;if(s.conversations.meetings)delete s.conversations.meetings.mira;s.conversations.seen=s.conversations.seen.filter(k=>!k.includes('mira'));onConversationAge(s);assert.ok(s.conversations.threads.mira?.length,'The historical correspondence hook still ran.');assert.ok(!notificationsFor(s).some(n=>n.personId==='mira'));
});
test('inbox and popup text is escaped, and corrupt receipts cannot enter a save',()=>{
  const s=fresh();receiveNotification(s,{kind:'gift',sourceId:'escaped',title:'<img src=x>',body:'<script>bad()</script>'});
  const e=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),ui={e,date:d=>'Day '+d,button:()=>'',paragraphs:x=>'<p>'+e(x)+'</p>'};
  assert.doesNotMatch(renderInbox(s,ui,{selectedId:notificationsFor(s)[0].id}),/<script>|<img src=x>/);assert.doesNotMatch(renderNotificationToasts(notificationsFor(s),ui),/<script>|<img src=x>/);
  for(const edit of [n=>n.entries[0].day=s.day+1,n=>n.entries[0].kind='unknown',n=>n.entries[0].read=1,n=>n.sequence=0,n=>n.entries.push(structuredClone(n.entries[0]))]){const bad=structuredClone(s);edit(bad.inbox);assert.equal(E.validateSave(bad),false);}
});
test('a delivered gift shows a corner popup, opens the header inbox and persists its read state',async t=>{
  const ui=await mountApp(t,{states:[structuredClone(await giftOpening())]});await ui.click('title-continue');assert.equal(ui.root.querySelector('.notification-toast'),null);const before=ui.current();await ui.click('choice','care');const delivered=valid(ui.current()),gift=notificationsFor(delivered).find(n=>n.kind==='gift'&&!before.inbox?.entries.some(o=>o.id===n.id));assert.ok(gift);assert.ok(ui.root.querySelector('.notification-toast'));assert.match(ui.root.querySelector('[data-op="notifications"]').getAttribute('aria-label'),/Unread/);
  await ui.click('notification-toast-open',gift.id);assert.ok(ui.root.querySelector('#notification-inbox'));assert.match(ui.root.querySelector('.inbox-letter').textContent,/received \d+ Gold/);assert.equal(notificationsFor(ui.current()).find(n=>n.id===gift.id).read,true);assert.deepEqual(stripped(ui.current()),stripped(delivered));await ui.key('Escape');assert.equal(ui.root.querySelector('#notification-inbox'),null);await ui.click('title-menu');await ui.click('title-continue');await ui.click('notifications');assert.equal(notificationsFor(ui.current()).find(n=>n.id===gift.id).read,true);
});
test('opening a saved inbox is quiet and Recovery opens its real activity shortcut without spending time',async t=>{
  const s=fresh();contractCurse(s,'vampire','A saved bite');const ui=await mountApp(t,{states:[valid(s)]});await ui.click('title-continue');assert.equal(ui.root.querySelector('.notification-toast'),null);await ui.click('notifications');const id=notificationsFor(ui.current())[0].id;await ui.click('notice-open',id);const before=ui.current();await ui.click('notice-recovery');assert.equal(ui.root.querySelector('#notification-inbox'),null);assert.ok(ui.root.querySelector('[data-activity-category="recovery"]'));assert.deepEqual(ui.current(),before);
});
test('inbox sound controls change only the shared audio preference',async t=>{
  const ui=await mountApp(t,{states:[fresh()]});await ui.click('title-continue');await ui.click('notifications');const before=ui.current(),toggle=ui.root.querySelector('[data-op="notification-sound"]'),enabled=toggle.getAttribute('aria-pressed');assert.ok(['true','false'].includes(enabled));await ui.click('notification-sound');assert.equal(ui.document.activeElement,ui.root.querySelector('[data-op="notification-sound"]'));assert.equal(ui.root.querySelector('[data-op="notification-sound"]').getAttribute('aria-pressed'),enabled==='true'?'false':'true');assert.deepEqual(ui.current(),before);await ui.click('notification-sound');assert.equal(ui.root.querySelector('[data-op="notification-sound"]').getAttribute('aria-pressed'),enabled);assert.deepEqual(ui.current(),before);
});
