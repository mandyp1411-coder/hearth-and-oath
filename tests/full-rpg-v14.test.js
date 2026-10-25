import test from 'node:test';
import {positionAtContact} from './helpers/contact-position.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../dist/js/engine.js';
import { LIFE_STORIES } from '../dist/js/life-stories.js';
import { portraitLayers, renderAvatar } from '../dist/js/avatar.js';
import { communitySupport } from '../dist/js/community.js';

function checkpoint(){
  // An existing genuinely played life five days before its 25th birthday.
  let s=engine.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/v8-community-before-birthday.json',import.meta.url),'utf8')));
  s=settle(engine.chooseAction(s,'community_abandon'));
  for(let n=0;n<10&&(s.timeline.birthDay+(s.age+1)*365-s.day)>5;n++)s=settle(engine.chooseAction(s,'health_rest'));
  return s;
}
function settle(s){
  for(let n=0;n<200;n++){
    assert.ok(engine.validateSave(s),s.notice);
    // One rulebook (v0.72.2): an untreated severe fever can kill, so the policy takes the best open care first.
    if(s.event){const open=s.event.choices.filter(c=>!c.disabledReason);s=engine.chooseEventOption(s,['care','rest','support','continue'].map(id=>open.find(c=>c.id===id)).find(Boolean)?.id||open[0]?.id||s.event.choices[0].id);continue;}
    if(s.conversations.pending){const p=s.conversations.pending;s=engine.replyMessage(s,p.personId,p.replies[0].id);continue;}
    if(s.timeline.yearTarget!==null&&!engine.getLifeCommitment(s)){s=engine.continueAgeUp(s);continue;}
    return s;
  }throw Error('test did not settle');
}
test('a real multi-year personal story preserves the same witness, earlier branch and once-only reward through a birthday',()=>{
  let s=checkpoint(),before=structuredClone(s);s=engine.chooseAction(s,'stories_open_two_names');assert.ok(s.event.body.includes(s.life.people.find(p=>p.id==='rival').name));
  const started=s.day,gold=s.hero.gold,until=s.timeline.birthDay+(s.age+1)*365-s.day;s=engine.chooseEventOption(s,'care');assert.equal(s.day-started,until);assert.ok(s.stories.project);assert.equal(s.stories.arcs[0].chapter,0);
  assert.deepEqual(before.stories.arcs,[],'public operations retain the older save');
  const paid=gold-s.hero.gold;assert.ok(paid>=8);s=settle(s);const afterPause=s.hero.gold,billed=s.householdBudget.paidGold;s=engine.chooseAction(s,'stories_continue');assert.equal(s.day-started,6);assert.equal(s.stories.arcs[0].chapter,1);
  assert.equal(afterPause-s.hero.gold,s.householdBudget.paidGold-billed,'continuation does not take another story fee');
  const original=structuredClone(s.stories);s=engine.chooseAction(s,'stories_continue');assert.deepEqual(s.stories,original);
  for(let guard=0;s.age<27;guard++){assert.ok(guard<40&&s.phase!=='retired',`alive to 27 (age ${s.age}, ${s.health?.deathCause||'alive'})`);s=settle(engine.ageUp(s));}
  s=engine.chooseAction(s,'stories_open_two_names');assert.ok(s.event.body.includes('Put both names on the account'));assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))),s);
});
test('coercion changes the named witness and actual professional record, and can be answered without erasing it',()=>{
  let s=checkpoint();s=engine.chooseAction(s,'stories_open_cracked_mark');const who=s.stories.arcs[0].personId,other=s.life.people.find(p=>p.id!==who),unrelated=structuredClone(other),old=s.careers.records.Blacksmith.reputation;
  s=engine.chooseEventOption(s,'coercion');s=settle(s);assert.ok(s.careers.records.Blacksmith.reputation<old);assert.deepEqual(s.life.people.find(p=>p.id===other.id),unrelated);
  const evidence=structuredClone(s.stories.history);s=positionAtContact(s,who);s=engine.chooseAction(s,'talk_'+who);assert.equal(s.conversations.pending.nodeId,'personal_v14_return');assert.ok(s.conversations.pending.replies.some(r=>r.id==='boundary'));
  s=engine.replyMessage(s,who,'listen');assert.deepEqual(s.stories.history,evidence,'acknowledgment cannot rewrite earlier harm');assert.ok(engine.validateSave(s));
});
test('a canceled birthday-interrupted personal chapter earns no money or completed chapter',()=>{
  let s=checkpoint();s=engine.chooseAction(s,'stories_open_two_names');s=engine.chooseEventOption(s,'care');s=settle(s);const paid=s.hero.gold,billed=s.householdBudget.paidGold;s=engine.chooseAction(s,'stories_cancel');assert.equal(paid-s.hero.gold,s.householdBudget.paidGold-billed);assert.equal(s.stories.arcs[0].chapter,0);assert.equal(s.stories.project,null);assert.ok(engine.getActions(s).some(a=>a.id==='stories_open_two_names'));assert.ok(engine.validateSave(s));
});
test('guided recovery pays once on real attendance and resumes only its remaining days after a birthday',()=>{
  let s=checkpoint(),day=s.day;const original=structuredClone(s),until=s.timeline.birthDay+(s.age+1)*365-s.day;s=engine.chooseAction(s,'recovery_begin_guided_28');assert.equal(s.day-day,until);assert.equal(s.health.recovery.remainingDays,28-until);assert.equal(s.health.recovery.attendedDays,until);assert.equal(s.health.recovery.fee,18);assert.equal(s.health.recovery.paid,true);assert.deepEqual(original.health,checkpoint().health);
  s=settle(s);const gold=s.hero.gold,billed=s.householdBudget.paidGold;s=engine.chooseAction(s,'recovery_continue');assert.equal(s.day-day,28);assert.equal(s.health.recovery,null);assert.equal(gold-s.hero.gold,s.householdBudget.paidGold-billed,'continuation pays only actual household costs');
  const repeat=engine.chooseAction(s,'recovery_continue');assert.equal(repeat.day,s.day);assert.equal(repeat.hero.gold,s.hero.gold);assert.deepEqual(repeat.health,s.health);assert.ok(engine.validateSave(repeat));
});
test('a recovery commitment blocks work, travel, equipment and further aging; cancellation retains actual days',()=>{
  let s=checkpoint();s=engine.chooseAction(s,'recovery_begin_free_56');s=settle(s);assert.equal(engine.getLifeCommitment(s).kind,'recovery');const day=s.day;
  assert.equal(engine.ageUp(s).day,day);assert.equal(engine.travelTo(s,'home').day,day);assert.ok(engine.equipmentActionReason(s));assert.ok(engine.getActions(s).every(a=>a.id.startsWith('recovery_')));
  const spent=s.health.recovery.attendedDays;s=engine.chooseAction(s,'recovery_cancel');assert.equal(s.day,day);assert.equal(s.health.recovery,null);assert.ok(s.health.history.at(-1).text.includes(spent+' actual days'));assert.ok(engine.validateSave(s));
});
test('unresolved fate and an established vocation no longer displace ordinary adult conversation',()=>{
  let s=positionAtContact(checkpoint(),'fellow');s=engine.chooseAction(s,'talk_fellow');assert.ok(s.conversations.pending.nodeId.startsWith('personal_v14_')||['personal_v25_motive','voice_v28','person_v29','person_v30'].includes(s.conversations.pending.nodeId));const pending=structuredClone(s);assert.deepEqual(engine.migrateSave(JSON.parse(JSON.stringify(s))),s);s=engine.replyMessage(s,'fellow',s.conversations.pending.replies.find(r=>['ask','listen'].includes(r.id))?.id||s.conversations.pending.replies[0].id);assert.equal(s.campaign.stage,pending.campaign.stage);
  assert.equal(engine.getActions(s).filter(a=>a.id==='talk_quest_fellow').length,0,'current ordinary conversation does not resurrect retired quest correspondence');
  // The explicit quest topic remains supported in a captured older narrative profile.
  s=structuredClone(s);delete s.narrativeEdition;
  const topics=engine.getActions(s).filter(a=>a.id==='talk_quest_fellow');assert.equal(topics.length,1);s=engine.chooseAction(s,topics[0].id);assert.ok(['person_v30','fate','vocation','ordinary_v12_wages','ordinary_v12_road','ordinary_v12_inheritance','ordinary_v12_burial','ordinary_v12_blade','ordinary_v12_debt','ordinary_v12_feast','ordinary_v12_page'].includes(s.conversations.pending.nodeId));assert.ok(engine.validateSave(s));
});
test('every ancestry and presentation has its own older and child face while adult likeness choices stay saved',()=>{
  const elders=new Set(),children=new Set();
  for(const ancestry of ['human','elf','dwarf','halfling','orc','goblin','tiefling','beastfolk'])for(const portraitPresentation of ['masculine','feminine','androgynous']){
    const p={appearance:{ancestry,portraitPresentation,heritage:'sable_coast',faceVariant:'second',hairStyle:'brokenbangs',headgear:'frayedhood'}},before=structuredClone(p);
    const child=portraitLayers(p,{age:7});assert.equal(child.baseAtlas,'child');assert.match(renderAvatar(p,{age:7}),/stage-child/);children.add(child.preset.src+':'+child.frame);
    const elder=portraitLayers(p,{age:75});assert.equal(elder.baseAtlas,'elder');assert.match(renderAvatar(p,{age:75}),/stage-elder/);elders.add(elder.preset.src+':'+elder.frame);
    assert.equal(elder.appearance.ancestry,ancestry);assert.equal(elder.appearance.faceVariant,'second');
    assert.equal(portraitLayers(p,{age:17}).beard,null);
    assert.equal(child.frame,portraitLayers({appearance:{...p.appearance,faceVariant:'first'}},{age:7}).frame,'child faces use their illustrated age instead of a stretched adult likeness');
    assert.deepEqual(p,before,'rendering preserves the stored adult likeness');
  }
  assert.equal(elders.size,24);assert.equal(children.size,24);
});
test('new late-life endowments have real material, time and funding commitments rather than passive money grants',()=>{
  const s=checkpoint(),actions=engine.getActions(s);for(const id of ['archive','watershed']){const a=actions.find(a=>a.id==='community_begin_'+id);assert.ok(a);assert.match(a.description,/actual days/);assert.match(a.description,/gold and materials/);const next=engine.chooseAction(s,a.id);assert.equal(s.hero.gold-next.hero.gold,next.householdBudget.paidGold-s.householdBudget.paidGold,'only already-accrued living costs are settled');assert.equal(next.day,s.day);assert.equal(next.community.project.kind,id);assert.deepEqual(communitySupport(next),communitySupport(s),'a proposal gives no completed institution service');assert.ok(engine.validateSave(next));}
});
test('invalid personal chapters and overlapping commitments are rejected on import',()=>{
  const s=checkpoint();for(const mutate of [v=>v.stories.arcs.push({id:'forged'}),v=>v.stories.reputation.coercion=-1,v=>{v=Object.assign(v,engine.chooseAction(v,'stories_open_two_names'));v.stories.pending.chapter=2;}]){const bad=structuredClone(s);mutate(bad);assert.equal(engine.validateSave(bad),false);}assert.equal(LIFE_STORIES.length,24);
});
test('a broke vampire can resolve hunger inside an unpaid story and resume only its remaining work',()=>{
  // Captured from a birth-to-adulthood audit; no injected currency, time or condition.
  let s=engine.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/v14-vampire-story-hunger.json',import.meta.url),'utf8')));
  assert.equal(s.hero.gold,0);assert.equal(s.event.id,'life_hunger');
  const original=structuredClone(s),day=s.day;
  const unavailable=engine.chooseEventOption(s,'donor');assert.equal(unavailable.day,day);assert.match(unavailable.notice,/requires 8 gold/);assert.deepEqual(unavailable.hero,s.hero);
  s=engine.chooseEventOption(s,'animal');assert.equal(s.day,day+1);assert.equal(s.hero.condition.hunger,33);assert.equal(s.hero.gold,0);assert.deepEqual(s.stories.project,original.stories.project);
  s=engine.chooseAction(s,'stories_continue');assert.equal(s.stories.project,null);assert.equal(s.stories.arcs.find(a=>a.id==='two_names').chapter,original.stories.arcs.find(a=>a.id==='two_names').chapter+1);assert.ok(engine.validateSave(s));
});
