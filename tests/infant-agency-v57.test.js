import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import { getAgeActivities, applyBirthChoice } from '../dist/js/birth.js';
import { householdActions, applyHouseholdAction, applyHouseholdChoice } from '../dist/js/household.js';
import { dialogueActions, applyDialogueAction, replyToConversation, onConversationAge, getThread } from '../dist/js/conversations.js';
import { notificationsFor, receiveNotification, suppressEarlyCorrespondence } from '../dist/js/notifications-v40.js';
import { flushHealthEvent, applyHealthChoice } from '../dist/js/health.js';

const stable=s=>{const n=structuredClone(s);delete n.notice;return n;};
const fresh=(seed='observational-infant',familySetup='two_parents')=>E.createBirthGame({seed,familySetup,difficulty:'gentle'});
function advanceTo(s,age){
  let steps=0;
  while((s.age<age||s.event&&s.age<3)&&steps++<100){
    if(s.event)s=E.chooseEventOption(s,s.age<3?'continue':s.event.choices.find(c=>!c.disabledReason).id);
    else s=s.timeline.yearTarget!==null?E.continueAgeUp(s):E.ageUp(s);
    assert.ok(E.validateSave(JSON.parse(JSON.stringify(s))),s.age+': '+s.notice);
  }
  assert.ok(steps<100);assert.equal(s.age,age);return s;
}

test('the first three years offer one neutral observation and never player-selected caregiver outcomes',()=>{
  for(const setup of ['two_parents','single_parent','orphan','homeless']){
    let s=fresh('observe-'+setup,setup);
    while(s.age<3){
      if(s.event){
        assert.deepEqual(s.event.choices.map(c=>c.id),['continue']);
        assert.equal(s.event.choices[0].label,'Continue watching');
        assert.equal(s.event.choices[0].owner,'observer');
        const before=stable(s);
        for(const id of ['care','curiosity','courage','help','ask','boundary'])assert.deepEqual(stable(E.chooseEventOption(s,id)),before);
        const copy=structuredClone(s),next=E.chooseEventOption(s,'continue');
        assert.deepEqual(E.chooseEventOption(copy,'continue'),next,'caregiver outcomes are deterministic across reloads');
        assert.deepEqual(stable(s),before);s=next;
      }else{
        assert.deepEqual(E.getActions(s),[]);assert.deepEqual(getAgeActivities(s),[]);assert.deepEqual(householdActions(s),[]);assert.deepEqual(dialogueActions(s),[]);
        s=s.timeline.yearTarget!==null?E.continueAgeUp(s):E.ageUp(s);
      }
      assert.ok(E.validateSave(s));assert.equal(notificationsFor(s).filter(n=>n.kind==='letter').length,0);
    }
    assert.equal(s.timeline.storybook.records.filter(r=>r.age<3).length,3);
    assert.equal(s.event.choices.length,3,'small childhood choices begin at three');
  }
});

test('direct infant action and message routes cannot grant resources, decisions, replies or meetings',()=>{
  let s=E.chooseEventOption(fresh('direct-infant-dispatch'),'continue');
  const before=stable(s);
  for(const id of ['family_support','family_shelter','family_dilemma','grow_family','talk_kin','work','grow_continue_journey'])assert.deepEqual(stable(E.chooseAction(s,id)),before,id);
  assert.deepEqual(stable(E.replyMessage(s,'kin','comfort')),before);
  assert.deepEqual(stable(E.visitService(s,'shrine')),before);
  for(const id of ['family_support','family_shelter','family_dilemma'])assert.equal(applyHouseholdAction(s,id,{}),false);
  assert.equal(applyHouseholdChoice(s,'family_dilemma','help',{}),false);
  assert.equal(applyDialogueAction(s,'talk_kin',{}),false);
  assert.equal(replyToConversation(s,'kin','comfort',{}),false);
  assert.equal(applyBirthChoice(s,'birth_arrival','courage',{}),false);
  assert.deepEqual(stable(s),before);
});

test('a caregiver secures shelter automatically without assigning household management to the infant',()=>{
  const s=fresh('observed-shelter','homeless'),caregiver=s.life.people.find(p=>p.id==='kin');
  assert.equal(s.family.housing,'unsheltered');
  const next=E.chooseEventOption(s,'continue');
  assert.equal(next.family.housing,'shelter');assert.equal(next.life.people.find(p=>p.id==='kin').name,caregiver.name);
  assert.ok(!next.life.people.some(p=>p.familyRole==='parent'));
  assert.ok(next.family.history.some(r=>r.title==='Shelter around a small life'));
  assert.ok(E.validateSave(next));
});

test('early childhood offers small expressions while adult shelter and support decisions remain unavailable',()=>{
  let s=advanceTo(fresh('first-small-choices'),3);s=E.chooseEventOption(s,s.event.choices[0].id);
  const rows=householdActions(s);
  assert.ok(!rows.some(a=>['family_support','family_shelter'].includes(a.id)));
  assert.ok(rows.some(a=>a.id==='family_dilemma'&&a.label==='A small moment at home'));
  const local=structuredClone(s);local.event=null;
  local.cartography.interior={siteId:local.locationId,roomId:'homes'};
  const ctx={setEvent(id,title,category,body,choices){local.event={id,title,category,body,choices};}};
  assert.equal(applyHouseholdAction(local,'family_dilemma',ctx),true);
  assert.equal(local.family.pending.sceneId,'early_child');
  assert.deepEqual(local.event.choices.map(c=>c.label),['Point to your favorite story','Ask for a cuddle','Say you would like some quiet']);
  assert.doesNotMatch(local.event.body,/work longer|money|invitation|rent|repair what/);
  for(const id of ['family_support','family_shelter'])assert.equal(applyHouseholdAction(local,id,ctx),false);
});

test('infant health concerns are observed while caregivers arrange free real care',()=>{
  const s=E.chooseEventOption(fresh('infant-care'),'continue');
  s.health.physical=[{id:'infant-fever',type:'fever',severity:1,sinceDay:0,lastEffectDay:0,careUntil:0,acknowledged:false}];
  s.health.pending={eventId:'health_concern',conditionId:'infant-fever',kind:'physical',offeredDay:0};
  const ctx={setEvent(id,title,category,body,choices){s.event={id,title,category,body,choices};}};
  assert.equal(flushHealthEvent(s,ctx),true);assert.deepEqual(s.event.choices.map(c=>c.id),['continue']);
  assert.equal(applyHealthChoice(s,'health_concern','rest',{}),false);
  const beforeGold=s.hero.gold,next=E.chooseEventOption(s,'continue');
  assert.ok(next.day>s.day);assert.equal(next.hero.gold,beforeGold);assert.equal(next.health.pending,null);
  assert.match(next.notice,/adults caring for you/);assert.ok(E.validateSave(next));
});

test('birthday and receipt entry points do not deliver personal letters before school age',()=>{
  for(const age of [0,1,2,3,5]){
    const s=fresh('no-infant-mail-'+age);s.age=age;s.day=age*365;
    const before=structuredClone(s.conversations);onConversationAge(s);assert.deepEqual(s.conversations,before);
    assert.equal(receiveNotification(s,{kind:'letter',sourceId:'wrong-infant-letter',title:'Come visit',body:'Will you come and visit me?',personId:'kin'}),null);
    assert.equal(s.inbox,undefined);
  }
});

test('loading old infancy preserves outcomes but permanently retires infant mail and dialogue',()=>{
  const original=fresh('retire-infant-mail'),legacy=structuredClone(original),scene=legacy.timeline.storybook.pending.scene;
  legacy.event.choices=scene.choices.map(({id,label,description})=>({id,label,description,owner:'guardian'}));
  delete legacy.event.observationVersion;
  legacy.conversations.sequence=1;
  legacy.conversations.threads.kin=[{id:'letter-1',speaker:'kin',text:'Happy birthday. Will you come visit me?',day:0,age:0}];
  legacy.conversations.seen.push('read:letter-1');
  legacy.inbox={version:1,sequence:1,entries:[{id:'notice-1',kind:'letter',sourceId:'letter-1',title:'A Letter from Your Parent',body:'Happy birthday. Will you come visit me?',day:0,recipient:`${legacy.seed}:0:${legacy.dynasty.generation}`,read:false,personId:'kin'}]};
  assert.ok(E.validateSave(legacy));const before=structuredClone(legacy),loaded=E.migrateSave(JSON.parse(JSON.stringify(legacy)));
  assert.ok(loaded);assert.deepEqual(legacy,before);assert.deepEqual(loaded.event.choices.map(c=>c.id),['continue']);
  assert.equal(loaded.conversations.sequence,1);assert.ok(loaded.conversations.seen.includes('read:letter-1'));assert.equal(loaded.inbox.sequence,1);
  assert.deepEqual(loaded.conversations.threads.kin,[]);assert.deepEqual(notificationsFor(loaded),[]);
  const later=advanceTo(loaded,6);assert.ok(!getThread(later,'kin').messages.some(m=>m.id==='letter-1'));
  assert.ok(!notificationsFor(later).some(n=>n.sourceId==='letter-1'));
});

test('mail cleanup retains later correspondence and all sequence and seen metadata',()=>{
  const s=fresh('later-records-kept');s.age=12;s.day=12*365;
  s.conversations.sequence=2;s.conversations.threads.kin=[{id:'letter-1',speaker:'kin',text:'An infant visit request.',day:0,age:0},{id:'letter-2',speaker:'kin',text:'A genuine school-age memory.',day:7*365,age:7}];
  s.conversations.seen.push('read:letter-1','read:letter-2');
  s.inbox={version:1,sequence:2,entries:[0,7].map((age,i)=>({id:'notice-'+(i+1),kind:'letter',sourceId:'letter-'+(i+1),title:'A Letter',body:'Recorded words.',day:age*365,recipient:`${s.seed}:0:${s.dynasty.generation}`,read:false,personId:'kin'}))};
  s.inbox.entries.push({...s.inbox.entries[0],id:'notice-3',recipient:'a-prior-life:0:1'});s.inbox.sequence=3;
  const seen=structuredClone(s.conversations.seen);suppressEarlyCorrespondence(s);
  assert.deepEqual(s.conversations.threads.kin.map(m=>m.id),['letter-2']);assert.deepEqual(s.inbox.entries.map(n=>n.id),['notice-2','notice-3']);
  assert.equal(s.conversations.sequence,2);assert.equal(s.inbox.sequence,3);assert.deepEqual(s.conversations.seen,seen);
});
