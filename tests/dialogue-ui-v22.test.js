import { freshStory } from './helpers/story-life-fixtures.mjs';
import { fakeSurface } from './helpers/ui-surface.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, createBirthGame, chooseEventOption, migrateSave, chooseAction, choosePersonalityTrait, replyMessage, getActions } from '../dist/js/engine.js';
import { getContacts, getThread } from '../dist/js/conversations.js';
import { hexAtlas } from '../dist/js/cartography.js';
import { settlementServices } from '../dist/js/world-services.js';
import { renderConversationPanel, nearbyContacts } from '../dist/js/dialogue-ui-v22.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function ui() {
  const offered = [];
  return {
    offered,
    e: escape,
    title: value => String(value ?? '').replaceAll('_', ' '),
    date: day => `Day ${day}`,
    paragraphs: value => String(value ?? '').split(/\n+/).map(text => `<p>${escape(text)}</p>`).join(''),
    button: (label, op, id, cls = '', disabled = false) => `<button type="button" class="${escape(cls)}" data-op="${escape(op)}" data-id="${escape(id)}" ${disabled ? 'disabled' : ''}>${label}</button>`,
    actionCards: actions => {
      offered.push(...actions);
      return actions.map(action => `<button class="activity-row" data-op="activity" data-id="${escape(action.id)}" ${action.disabledReason ? 'disabled' : ''}><strong>${escape(action.label)}</strong><span>${escape(action.description)}</span><small>${escape(action.disabledReason || '')}</small><span>${action.durationDays ?? action.days ?? 0}d · ${action.quotedCost ?? action.cost ?? 0}g</span></button>`).join('');
    },
  };
}

function adult(seed = 'dialogue-ui-v22') {
  let state = createGame({ seed });
  for (const id of ['investigate', 'apprentice', 'confess']) state = chooseEventOption(state, id);
  state = migrateSave(state);
  delete state.characterDialogueVersion;delete state.narrativeEdition; // Explicit historical v22 dialogue policy, not current person_v30.
  assert.equal(state.age, 18);
  assert.equal(state.event, null);
  return state;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const entry of Object.values(value)) freeze(entry);
  return value;
}

test('nearby people are actual contacts in the current settlement, not distant correspondents', () => {
  const state = adult();
  const source = state.life.people.find(person => person.id === 'fellow');
  source.locationId = 'city';
  const services=new Map(settlementServices(state).map(r=>[r.personId,r]));
  const expected = getContacts(state).filter(person => person.locationId === state.locationId&&person.available!==false&&!person.retired&&(!person.roomId||person.roomId===(state.cartography?.interior?.roomId||'gate'))&&(!services.has(person.id)||services.get(person.id).here)).map(person => person.id);
  const before = structuredClone(state);
  const actual = nearbyContacts(state);
  assert.deepEqual(actual.map(person => person.id), expected);
  assert.ok(actual.length > 0);
  assert.ok(!actual.some(person => person.id === 'fellow'));
  assert.ok(actual.every(person => person.locationId === state.locationId));
  assert.deepEqual(state, before);
});

test('a trail, paused crossing, road journey or expedition never teleports town contacts', () => {
  const state = adult();
  const blocked = [
    value => { value.cartography.offsite = true; },
    value => { value.cartography.pending = { from: value.cartography.position, to: 'next', progress: 1 }; },
    value => { value.timeline.journey = { id: 'actual-road', progress: 1 }; },
    value => { value.maze = { kind: 'contract', position: 0 }; }, // the older walks left in v0.72.4; a maze still holds you
    value => { value.cartography.position = hexAtlas(value).cells.find(cell => cell.siteId && cell.siteId !== value.locationId).key; },
  ];
  for (const change of blocked) {
    const current = structuredClone(state);
    change(current);
    const before = structuredClone(current);
    assert.deepEqual(nearbyContacts(current), []);
    assert.deepEqual(current, before);
  }
});

test('local contact list respects age, death, absence, ended lives and live settlement services', () => {
  const infant = createBirthGame({ seed: 'dialogue-ui-newborn' });
  const permitted = new Set(getContacts(infant).map(person => person.id));
  assert.ok(nearbyContacts(infant).every(person => permitted.has(person.id)));
  assert.ok(!nearbyContacts(infant).some(person => ['mira', 'orrin', 'school-tutor', 'fellow', 'rival'].includes(person.id)));
  const member = infant.family.members.find(person => person.personId && permitted.has(person.personId));
  assert.ok(member);
  member.availability = 'absent';
  assert.ok(!nearbyContacts(infant).some(person => person.id === member.personId));

  const state = adult();
  state.life.people.find(person => person.id === 'kin').alive = false;
  assert.ok(!nearbyContacts(state).some(person => person.id === 'kin'));
  const keeper = state.realm.sites[state.locationId]?.keeper;
  if (keeper) {
    keeper.retiredDay = state.day || 1;
    assert.ok(!nearbyContacts(state).some(person => person.id === keeper.id));
  }
  for (const change of [
    value => { value.phase = 'retired'; },
    value => { value.hero.alive = false; },
    value => { value.world.locations.find(place => place.id === value.locationId).status = 'destroyed'; },
    value => { value.world.locations.find(place => place.id === value.locationId).status = 'evacuated'; },
    value => { value.world.locations.find(place => place.id === value.locationId).servicesAvailable = false; },
    value => { value.realm.sites[value.locationId].phase = 'ruin'; },
    value => { value.locationId = value.world.locations.find(place => place.type === 'ruin').id; },
  ]) {
    const current = structuredClone(state);
    change(current);
    assert.deepEqual(nearbyContacts(current), []);
  }
  assert.deepEqual(nearbyContacts(null), []);
});

test('a captured retired-teacher reply retains identity without claiming the teacher is a current local', () => {
  const state = adult();
  const id = 'school-tutor-old';
  state.education.teacherHistory = [{ id, name: 'Tutor Rona', bornDay: -70 * 365, route: 'community', retiredDay: state.day }];
  state.conversations.pending = { personId: id, nodeId: 'school', topic: 'school', replies: [{ id: 'study', label: 'Keep the captured lesson', description: 'An earlier teacher and a saved reply.' }] };
  const person = getContacts(state).find(contact => contact.id === id);
  assert.ok(person);
  assert.equal(person.role, 'retired teacher');
  assert.ok(!nearbyContacts(state).some(contact => contact.id === id));
  const before = structuredClone(state);
  const html = renderConversationPanel(state, id, ui());
  assert.ok(html.includes('<h2 tabindex="-1">Tutor Rona</h2>'));
  assert.ok(html.includes(`data-op="reply" data-id="study" data-person="${id}"`));
  assert.ok(!html.includes('In person'));
  assert.match(html, /An unfinished earlier correspondence/);
  assert.deepEqual(state, before);
});

test('rendering a frozen life displays actual identity and changes no game state', () => {
  const local = adult();
  local.cartography.interior={siteId:local.locationId,roomId:'homes'};
  const state = freeze(local);
  const person = getContacts(state).find(contact => contact.id === 'kin');
  const before = structuredClone(state);
  const helpers = ui();
  const html = renderConversationPanel(state, person.id, helpers);
  assert.match(html, /class="dialogue-scene/);
  assert.ok(html.includes(`data-contact-id="${escape(person.id)}"`));
  assert.ok(html.includes(`<h2 tabindex="-1">${escape(person.name)}</h2>`));
  assert.ok(html.includes(`Age ${person.age}`));
  assert.match(html,/dialogue-stage/);
  assert.match(html, /In person · In this settlement/);
  assert.match(html, /dialogue-window/);
  assert.deepEqual(state, before);
  assert.deepEqual(helpers.offered.find(action => action.id === `talk_${person.id}`), getActions(state).find(action => action.id === `talk_${person.id}`));
});

test('a captured reply keeps its real person, choice ids and exact trait previews without being spoken', () => {
  let state = choosePersonalityTrait(adult(), 'compassionate');
  state = chooseAction(state, 'talk_fellow');
  assert.equal(state.conversations.pending.personId, 'fellow');
  const thread = getThread(state, 'fellow');
  assert.ok(thread.replies.length > 0);
  assert.ok(thread.replies.some(reply => reply.traitPreview));
  const before = structuredClone(state);
  const helpers = ui();
  const html = renderConversationPanel(freeze(state), 'fellow', helpers, { compact: true });
  for (const reply of thread.replies) {
    assert.ok(html.includes(`data-op="reply" data-id="${escape(reply.id)}" data-person="fellow"`));
    assert.ok(html.includes(escape(reply.label)));
    assert.ok(html.includes(escape(reply.description)));
    if (reply.traitPreview) assert.ok(html.includes(`<small class="trait-preview">${escape(reply.traitPreview)}</small>`));
  }
  assert.deepEqual(helpers.offered, []);
  assert.deepEqual(state, before);
});

test('selecting another person has a named route back to the waiting speaker in each workspace', () => {
  const state = chooseAction(adult(), 'talk_fellow');
  const waiting = getContacts(state).find(person => person.id === 'fellow');
  const before = structuredClone(state);
  const full = renderConversationPanel(state, 'kin', ui());
  const compact = renderConversationPanel(state, 'kin', ui(), { compact: true });
  assert.ok(full.includes(`${escape(waiting.name)} is waiting for your reply.`));
  assert.match(full, /data-op="show-contact" data-id="fellow"/);
  assert.match(compact, /data-op="show-contact" data-id="fellow"/);
  assert.ok(!full.includes('data-op="reply"'));
  assert.deepEqual(state, before);
});

test('new distant dialogue has no talk offer while local dialogue retains real costs and annual locks',()=>{
 let state=adult();state.life.people.find(p=>p.id==='fellow').locationId='city';let helpers=ui(),html=renderConversationPanel(state,'fellow',helpers);assert.match(html,/recorded place is elsewhere/);assert.deepEqual(helpers.offered,[]);assert.match(html,/data-op="person-place"/);assert.ok(!html.includes('In person'));
 state.life.people.find(p=>p.id==='fellow').locationId=state.locationId;
 for(let n=0;n<2;n++){state=chooseAction(state,'talk_fellow');assert.equal(state.conversations.pending.personId,'fellow');state=replyMessage(state,'fellow',state.conversations.pending.replies[0].id);}
 const locked=getActions(state).find(a=>a.id==='talk_fellow');assert.ok(locked.disabledReason);helpers=ui();html=renderConversationPanel(state,'fellow',helpers);assert.deepEqual(helpers.offered.find(a=>a.id==='talk_fellow'),locked);assert.ok(html.includes(escape(locked.disabledReason)));assert.match(html,/data-id="talk_fellow" disabled/);
});
test('quest topics and relevant additional actions stay inside the selected person command panel', () => {
  const state = adult();state.cartography.interior={siteId:state.locationId,roomId:'homes'};
  const actions = getActions(state);
  const helpers = ui();
  const html = renderConversationPanel(state, 'kin', helpers);
  const topic = actions.find(action => action.id === 'talk_quest_kin');
  assert.ok(topic);
  assert.match(html, /data-disclosure="conversation-topics"/);
  assert.deepEqual(helpers.offered.find(action => action.id === topic.id), topic);
  const extras = actions.filter(action => /^life_(visit|gift|court|commit|separate|endcourt|values)_/.test(action.id) && action.id.endsWith('_kin'));
  assert.deepEqual(helpers.offered.filter(action => action.id.startsWith('life_')), extras);
  if (extras.length) assert.match(html, /data-disclosure="conversation-person-actions"/);
  assert.ok(!helpers.offered.some(action => action.id.endsWith('_fellow')));
  assert.ok(!html.includes('class="social-actions"'));
  assert.equal((html.match(/class="dialogue-topics/g) || []).length, 1);
});

test('invalid contacts and untrusted message, label and attribute text cannot manufacture controls', () => {
  const state = adult();
  const before = structuredClone(state);
  const missing = renderConversationPanel(state, 'unknown-person', ui());
  assert.match(missing, /This person is unavailable/);
  assert.ok(!missing.includes('data-op="activity"'));
  assert.ok(!missing.includes('data-op="reply"'));
  assert.deepEqual(state, before);
  assert.match(renderConversationPanel(null, null, ui()), /Choose a person/);

  const person = state.life.people.find(contact => contact.id === 'kin');
  person.name = '<img src=x onerror="bad()">';
  state.conversations.threads.kin = [{ id: 'message-one', speaker: 'kin', age: state.age, day: state.day, text: '<script>bad()</script> & a memory' }];
  state.conversations.pending = { personId: 'kin', nodeId: 'family', topic: 'kept-topic', replies: [{ id: 'r" onclick="bad()', label: '<b>Fake command</b>', description: '<script>bad()</script>' }] };
  const escaped = renderConversationPanel(state, 'kin', ui());
  assert.ok(escaped.includes('&lt;img src=x onerror=&quot;bad()&quot;&gt;'));
  assert.ok(escaped.includes('&lt;script&gt;bad()&lt;/script&gt; &amp; a memory'));
  assert.ok(escaped.includes('data-id="r&quot; onclick=&quot;bad()"'));
  assert.ok(escaped.includes('&lt;b&gt;Fake command&lt;/b&gt;'));
  assert.ok(!escaped.includes('<script>'));
  assert.ok(!escaped.includes('<img src=x'));
  assert.ok(!escaped.includes('data-id="r" onclick="bad()"'));
});

test('pending replies blocked by a spatial or story state stay visible but cannot be clicked', () => {
  const state = chooseAction(adult(), 'talk_fellow');
  for (const change of [
    value => { value.cartography.offsite = true; },
    value => { value.cartography.pending = { from: value.cartography.position, to: 'next' }; },
    value => { value.event = { id: 'existing-scene' }; },
    value => { value.battle = { instanceId: 'existing-battle' }; },
    value => { value.maze = { kind: 'contract', position: 0 }; },
    value => { value.phase = 'retired'; },
  ]) {
    const current = structuredClone(state);
    change(current);
    const before = structuredClone(current);
    const html = renderConversationPanel(current, 'fellow', ui());
    const replies = [...html.matchAll(/<button[^>]*data-op="reply"[^>]*>/g)].map(match => match[0]);
    assert.equal(replies.length, current.conversations.pending.replies.length);
    assert.ok(replies.every(markup => / disabled/.test(markup)));
    assert.match(html, /disabled-reason/);
    assert.deepEqual(current, before);
  }
});


test('old birthday greetings remain behind a dated archive and never become present speech',()=>{
 for(const channel of [undefined,'letter']){
  const s=freshStory({home:true}),p=getContacts(s).find(p=>p.id==='kin');s.cartography.interior={siteId:s.locationId,roomId:'homes'};
  const message={id:'letter-'+(++s.conversations.sequence),speaker:p.id,text:'Happy birthday from an earlier year.',day:s.day-365,age:s.age-1,...(channel?{channel}:{})};
  s.conversations.threads[p.id]=[message];const before=structuredClone(s),surface=fakeSurface();surface.root.innerHTML=renderConversationPanel(s,p.id,ui());
  assert.doesNotMatch(surface.root.querySelector('.dialogue-window').textContent,/Happy birthday/);
  const kept=surface.root.querySelector('.earlier-correspondence');assert.equal(kept.tagName,'DETAILS');assert.equal(kept.getAttribute('open'),null);assert.match(kept.textContent,/1 year ago/);assert.ok(kept.textContent.includes('Age '+(s.age-1)));assert.ok(kept.textContent.includes(message.text));assert.deepEqual(s,before);
 }
});
