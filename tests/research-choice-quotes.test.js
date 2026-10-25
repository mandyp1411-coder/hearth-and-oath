import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/js/engine.js';
import {researchChoiceQuote,researchChoiceReason} from '../dist/js/research-runtime.js';
import {preserveResearchEvent} from '../dist/js/research-scenes.js';
import {copy,roundtrip} from './helpers/story-life-fixtures.mjs';
import {researchQuotePending,researchQuoteVacancy} from './helpers/research-quote-fixtures.mjs';
import {mountApp} from './helpers/ui-surface.mjs';
// v0.72: this file's scenarios play on old-rules saves, so it mounts the app with the
// pre-v0.72 entry policy (rulebooks: 'both'). v0.72.1+ rebases it onto new-rules lives
// or moves it to the archive as the old rules' code leaves main.

for(const place of ['homes','archive'])for(const audience of ['public','private','public_quote'])test(`${place}/${audience}: the rendered delivery quote agrees with actual public command attendance`,()=>{
  const s=researchQuotePending({place,quote:audience==='public_quote'}),before=copy(s),raw=copy(s.event);
  const q=researchChoiceQuote(s,s.event,audience),days=place==='homes'?1:0;assert.equal(q.days,days);assert.equal(q.cost,0);assert.equal(q.disabledReason,null);
  assert.match(q.description,days?/Home collection takes 1 attended day/:/Direct deposit.*School & Archive takes no time or Gold/);
  if(days)assert.doesNotMatch(q.description,/No time or Gold\./);
  assert.deepEqual(s,before,'quoting mutates no state or historical scene');assert.ok(preserveResearchEvent(s,s.event));assert.deepEqual(roundtrip(s).event,raw);
  const n=roundtrip(E.chooseEventOption(s,audience));assert.equal(n.day,s.day+days);assert.deepEqual(s,before);assert.equal(n.event,null);assert.equal(n.researchPortfolio.project,null);
  const run=n.researchPortfolio.runs[0];assert.equal(run.status,'completed');assert.equal(run.finalization.audience,audience==='private'?'private':'public');assert.equal(run.finalization.mode,days?'home-collection':'archive-deposit');
  assert.deepEqual(run.finalization.quoteSourceIds,audience==='public_quote'?['maker_margin']:[]);assert.equal(run.steps.at(-1).days,days);assert.equal(run.steps.at(-1).completedDay,n.day);
  assert.deepEqual(n.hero.skills,s.hero.skills);assert.deepEqual(n.careers,s.careers);assert.deepEqual(n.playerNotes,s.playerNotes);assert.deepEqual(n.journal.slice(0,s.journal.length),s.journal);
  if(!days){assert.equal(n.hero.gold,s.hero.gold);assert.deepEqual(n.householdBudget,s.householdBudget);}else assert.equal(s.hero.gold-n.hero.gold,n.householdBudget.paidGold-s.householdBudget.paidGold,'no delivery fee/wages beyond actual ordinary household charges');
});

test('self-only and draft choices remain zero-day without inventing an informed recipient',()=>{
  const s=researchQuotePending(),before=copy(s);
  for(const id of ['self','later']){const q=researchChoiceQuote(s,s.event,id);assert.equal(q.days,0);assert.match(q.description,/No time or Gold\./);const n=roundtrip(E.chooseEventOption(s,id));assert.equal(n.day,s.day);assert.equal(n.hero.gold,s.hero.gold);assert.deepEqual(n.hero.skills,s.hero.skills);if(id==='self')assert.equal(n.researchPortfolio.runs[0].finalization.recipientId,null);}
  assert.deepEqual(s,before);
});

test('exact retired archivist is unavailable even with a current successor; self-only remains possible',async t=>{
  const {state:s,previous,next}=researchQuoteVacancy(researchQuotePending()),before=copy(s);assert.notEqual(previous.id,next.personId);assert.ok(preserveResearchEvent(s,s.event));
  for(const id of ['public','private']){const q=researchChoiceQuote(s,s.event,id);assert.equal(q.days,null);assert.match(q.disabledReason,/exact recorded archivist is unavailable/);assert.match(q.description,/Delivery is unavailable/);assert.equal(q.disabledReason,researchChoiceReason(s,s.event,id));const n=E.chooseEventOption(s,id);assert.deepEqual({...n,notice:''},{...s,notice:''});}
  assert.equal(researchChoiceQuote(s,s.event,'self').days,0);assert.deepEqual(s,before);
  const ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');const node=ui.root.querySelector('[data-op="choice"][data-id="public"]');assert.ok(node.disabled);assert.match(node.textContent,/Delivery is unavailable/);
  let writes=0;const set=ui.storage.setItem.bind(ui.storage);ui.storage.setItem=(k,v)=>{writes++;set(k,v);};const bytes=JSON.stringify([...ui.values]);await ui.fire('click',node);assert.equal(writes,0);assert.equal(JSON.stringify([...ui.values]),bytes);assert.deepEqual(ui.current(),s);
});

test('render quoting rejects forged owner/text and leaves unrelated choices and all raw snapshots untouched',()=>{
  const s=researchQuotePending(),before=copy(s);assert.equal(researchChoiceQuote(s,{...s.event,id:'another_event'},'public'),null);assert.equal(researchChoiceQuote(s,s.event,'invented'),null);
  for(const alter of [v=>v.researchPortfolio.ownerId='another-life',v=>v.event.choices[0].description+=' forged text']){const bad=copy(s);alter(bad);assert.equal(researchChoiceQuote(bad,bad.event,'public'),null);assert.equal(E.validateSave(bad),false);}
  assert.deepEqual(s,before);
});

for(const place of ['homes','archive'])test(`${place}: actual handlers render current quotes, preserve old raw event and settle once after reload`,async t=>{
  const s=researchQuotePending({place}),raw=copy(s.event),ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');
  for(const id of ['public','private']){const c=ui.root.querySelector(`[data-op="choice"][data-id="${id}"]`);assert.ok(c&&!c.disabled);assert.match(c.textContent,place==='homes'?/Home collection takes 1 attended day/:/Direct deposit.*School & Archive takes no time or Gold/);}
  assert.deepEqual(ui.current(),s);assert.deepEqual(ui.current().event,raw);await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current().event,raw,'ordinary reload preserves the historical raw pending packet');
  const stale=ui.root.querySelector('[data-op="choice"][data-id="private"]'),expected=roundtrip(E.chooseEventOption(s,'private'));await ui.click('choice','private');assert.deepEqual(ui.current(),expected);const bytes=JSON.stringify([...ui.values]);await ui.fire('click',stale);assert.equal(JSON.stringify([...ui.values]),bytes);await ui.click('title-menu');await ui.click('title-continue');assert.deepEqual(ui.current(),expected,'completion cannot replay work, costs, permission or rewards');
});

test('a connected quoted delivery choice behind actual rehearsal cannot write or progress the pending life',async t=>{
  const s=researchQuotePending(),ui=await mountApp(t, {rulebooks:'both', states:[s]});await ui.click('title-continue');await ui.click('menu');await ui.click('practice-open','protect_ally');assert.ok(ui.root.querySelector('.practice-modal'));
  const node=ui.root.querySelector('[data-op="choice"][data-id="public"]');assert.ok(node?.isConnected&&!node.disabled,'capture the current connected background choice, not only a detached stale control');
  const bytes=JSON.stringify([...ui.values]);let writes=0;const set=ui.storage.setItem.bind(ui.storage);ui.storage.setItem=(k,v)=>{writes++;set(k,v);};await ui.fire('click',node);assert.equal(writes,0);assert.equal(JSON.stringify([...ui.values]),bytes);assert.deepEqual(ui.current(),s);assert.ok(ui.root.querySelector('.practice-modal'));
  await ui.key('Escape');assert.deepEqual(ui.current(),s);assert.equal(writes,0);
});
