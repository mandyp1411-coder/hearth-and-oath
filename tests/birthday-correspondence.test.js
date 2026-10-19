import test from 'node:test';
import assert from 'node:assert/strict';
import {birthdayLetterText} from '../dist/js/birthday-correspondence.js';
import {onConversationAge,getContacts} from '../dist/js/conversations.js';
import {notificationsFor} from '../dist/js/notifications-v40.js';
import {freshStory} from './helpers/story-life-fixtures.mjs';

const state=(age=21)=>({seed:'birthday-variety',age,day:age*365,hero:{name:'Rowan'},timeline:{birthDay:0},dynasty:{generation:1},life:{health:90,stress:12,partnerId:null},family:{housing:'secure'},locationId:'home',education:{enrolled:false}});
const parent={id:'kin',name:'Aren',familyRole:'parent',occupation:'carpenter',bond:80,locationId:'home',disposition:'kind'};

test('birthday words are stable per sender and birthday and never mutate a life',()=>{
  const s=state(),before=structuredClone(s),a=birthdayLetterText(s,parent);
  assert.equal(birthdayLetterText(s,parent),a);assert.deepEqual(s,before);
  assert.equal(birthdayLetterText({...s,day:s.day+1,conversations:{sequence:900}},parent),a,'render timing and unrelated thread sequence do not reroll a delivered letter');
  assert.match(a,/21st birthday/);assert.match(a,/— Aren$/);
});

test('two parents have their own words and actual occupations instead of one shared greeting',()=>{
  const a=birthdayLetterText(state(),parent),b=birthdayLetterText(state(),{...parent,id:'family_parent',name:'Lena',occupation:'weaver'});
  assert.match(a,/work as a carpenter/);assert.match(b,/work as a weaver/);assert.notEqual(a.replaceAll('Aren',''),b.replaceAll('Lena',''));
});

test('letters follow childhood, adolescent, adult and later-life chapters',()=>{
  const letters=[6,12,16,21,40,65].map(age=>birthdayLetterText(state(age),parent));
  assert.equal(new Set(letters.map(body=>body.split('\n\n')[1])).size,6);
  assert.match(letters[0],/learned|question|story|stories/);assert.doesNotMatch(letters[0],/younger person you used to be/);
  assert.match(letters[5],/worr|curious|younger people|old pleasure/);
});

test('guardians, siblings, partners and friends use their actual relationship',()=>{
  const s=state(),guardian=birthdayLetterText(s,{...parent,familyRole:'guardian'}),sibling=birthdayLetterText(s,{...parent,familyRole:'sibling'}),partner=birthdayLetterText({...s,life:{...s.life,partnerId:parent.id}},{...parent,familyRole:null}),friend=birthdayLetterText(s,{...parent,familyRole:null});
  assert.doesNotMatch(guardian,/be your parent/);assert.notEqual(guardian,sibling);assert.notEqual(sibling,partner);assert.notEqual(partner,friend);
});

test('letter circumstances use real schooling, housing, health, distance and a strained bond',()=>{
  const s=state(12);
  assert.match(birthdayLetterText({...s,education:{enrolled:true}},parent),/your lessons/);
  assert.match(birthdayLetterText({...s,family:{housing:'unsheltered'}},parent),/safe roof/);
  assert.match(birthdayLetterText({...s,life:{health:20}},parent),/unwell/);
  assert.match(birthdayLetterText({...s,locationId:'far-city'},parent),/Distance/);
  assert.match(birthdayLetterText(s,{...parent,bond:25}),/not always found it easy to speak/);
});

test('an archival infant note does not ask a baby to travel, reply, study or make plans',()=>{
  const text=birthdayLetterText(state(0),parent);assert.match(text,/note kept for Rowan/);assert.match(text,/care|safe|grown people/);assert.doesNotMatch(text,/come by|write when|your lessons|your plans|21st birthday/);
});

test('actual modern birthday delivery saves varied words once and keeps inbox and threads identical',()=>{
  const s=freshStory();s.age=30;s.day=30*365;s.event=null;s.timeline.contentVersion=7;s.conversations.seen=s.conversations.seen.filter(k=>!k.includes('birthday-letter-30'));
  const parents=getContacts(s).filter(p=>p.familyRole==='parent');assert.ok(parents.length>=2);
  onConversationAge(s);
  const delivered=notificationsFor(s).filter(n=>n.kind==='letter'&&parents.some(p=>p.id===n.personId));assert.ok(delivered.length>=2);assert.equal(new Set(delivered.map(n=>n.body)).size,delivered.length);
  for(const n of delivered){const m=s.conversations.threads[n.personId].find(m=>m.id===n.sourceId);assert.equal(m.text,n.body);assert.doesNotMatch(n.body,/Will you come by when you have a little time/);}
  const before=structuredClone(s);onConversationAge(s);assert.deepEqual(s,before,'another render or birthday hook does not replace or redeliver the kept words');
});


test('a late birthday hook cannot deliver a greeting for an earlier year or month',()=>{
 for(const late of [30,365,730]){
  const s=freshStory();s.age=30;s.day=30*365+late;s.event=null;s.timeline.contentVersion=7;s.conversations.seen=s.conversations.seen.filter(k=>!k.includes('birthday-letter-30'));
  const before=structuredClone(s);onConversationAge(s);assert.deepEqual(s,before);
 }
});
