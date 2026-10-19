import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBirthGame, chooseAction, chooseEventOption, getActions } from '../dist/js/engine.js';
import { initializeSocial } from '../dist/js/social.js';
import { socialPanel, pastimePanel } from '../dist/js/life-ui.js';

const escape=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function helpers(captured=[]) {
  return {
    e:escape,title:value=>String(value || '').replace(/_/g,' '),date:day=>`Day ${day}`,
    button:(label,op,id,cls)=>`<button class="${escape(cls)}" data-op="${escape(op)}" data-id="${escape(id)}">${label}</button>`,
    actionCards:rows=>{captured.push(...rows);return rows.map(a=>`<button data-op="activity" data-id="${escape(a.id)}">${escape(a.label)}</button>`).join('');},
  };
}
function fixture(age=14) {
  const s=createBirthGame({seed:'life-ui-public-view',name:'Mallow',familySetup:'two_parents'});
  s.event=null;s.day=age*365+30;s.age=age;s.phase=age>=18?'adult':'childhood';s.hero.gold=1000;
  for(const p of [...s.life.people,...s.companions])p.age=(p.baseAge || 0)+age;
  delete s.social;initializeSocial(s);
  return s;
}

test('social UI reads witnessed ties and reports while leaving private developments and saves alone',()=>{
  const s=fixture(),known=s.social.edges[0],hidden=s.social.edges[1];
  assert.ok(known&&hidden);
  known.known=true;known.knownDay=s.day;
  s.social.history.push(
    {id:'heard-at-the-hearth',day:s.day,title:'A quarrel you heard',text:'The two stopped speaking beside your table.',actorIds:[known.aId,known.bId],visible:true},
    {id:'private-development',day:s.day,title:'Unheard private news',text:'PRIVATE LETTER NEVER DELIVERED',actorIds:[hidden.aId,hidden.bId],visible:false},
  );
  const before=structuredClone(s),html=socialPanel(s,helpers());
  assert.match(html,/A quarrel you heard/);
  assert.ok(html.includes(`data-social-tie="${escape(known.id)}"`));
  assert.ok(!html.includes(`data-social-tie="${escape(hidden.id)}"`));
  assert.ok(!html.includes('PRIVATE LETTER NEVER DELIVERED'));
  assert.ok(!html.includes('Unheard private news'));
  assert.deepEqual(s,before,'opening the relationships tab cannot reveal or advance a private scene');
});

test('real contact names and witnessed notices are escaped in the new relationship panels',()=>{
  const s=fixture(),known=s.social.edges[0],actor=s.social.nodes.find(n=>n.id===known.aId);
  const hostile='<img src=x onerror="stolen()">';
  actor.name=hostile;
  const source=s.life.people.find(p=>p.id===actor.sourceId)||s.companions.find(p=>p.id===actor.sourceId);
  source.name=hostile;known.known=true;known.knownDay=s.day;
  s.social.history.push({id:'escaped-notice',day:s.day,title:hostile,text:'<script>stolen()</script>',actorIds:[known.aId],visible:true});
  const html=socialPanel(s,helpers());
  assert.ok(html.includes('&lt;img src=x onerror=&quot;stolen()&quot;&gt;'));
  assert.ok(html.includes('&lt;script&gt;stolen()&lt;/script&gt;'));
  assert.ok(!html.includes(hostile));
  assert.ok(!html.includes('<script>'));
});

test('compact Life pastimes show the chosen interest, at most two actions and a route to the full page',()=>{
  let s=fixture();
  s=chooseAction(s,'pastime_interest');
  assert.equal(s.event.id,'pastime_interest');
  s=chooseEventOption(s,'music');
  assert.equal(s.pastimes.activeInterestId,'music');
  const before=structuredClone(s),captured=[];
  const html=pastimePanel(s,helpers(captured),true);
  assert.match(html,/Making music/);
  assert.ok(captured.length<=2,'the Life screen should not become a second activity catalogue');
  assert.ok(captured.every(a=>!a.disabledReason));
  assert.ok(captured.some(a=>a.id==='pastime_practice'));
  assert.ok(!captured.some(a=>a.id==='pastime_interest'));
  assert.match(html,/data-op="tab" data-id="activities"/);
  assert.deepEqual(s,before);
  const all=[],full=pastimePanel(s,helpers(all));
  assert.ok(all.some(a=>a.id==='pastime_interest'));
  assert.ok(all.length>captured.length);
  assert.match(full,/data-disclosure="pastime-interests"/);
  for(const row of all)assert.deepEqual(row,getActions(s).find(a=>a.id===row.id),'rendering must retain the engine’s actual cost and time quotation');
});

test('pastimes do not fabricate hobbies, pet memories or interactions for an infant or a legacy save',()=>{
  const infant=createBirthGame({seed:'ui-cradle'}),untouched=structuredClone(infant);
  assert.equal(pastimePanel(infant,helpers(),true),'');
  const full=pastimePanel(infant,helpers());
  assert.ok(!full.includes('data-interest-id='));
  assert.ok(!full.includes('data-pet-id='));
  assert.deepEqual(infant,untouched);
  const legacy=JSON.parse(readFileSync(new URL('./fixtures/legacy-v5.json',import.meta.url),'utf8'));
  delete legacy.social;delete legacy.pastimes;
  const before=structuredClone(legacy);
  assert.equal(socialPanel(legacy,helpers()),'');
  assert.equal(pastimePanel(legacy,helpers()),'');
  assert.deepEqual(legacy,before);
});
