import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { journalCommitments } from '../dist/js/journal-commitments.js';
import { activeJournalQuests, renderSimpleJournal } from '../dist/js/journal-ui-v30.js';
import { questReturnForecast } from '../dist/js/quest-records.js';
import { settlementServices } from '../dist/js/world-services.js';
import { settlementWalkPath } from '../dist/js/exploration-ui.js';
import { regionalAnchor } from '../dist/js/rpg-depth-v27.js';
import { syncCartography } from '../dist/js/cartography.js';
import { getContacts } from '../dist/js/conversations.js';
import { educationTeacher } from '../dist/js/household.js';
import { mountApp } from './helpers/ui-surface.mjs';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v30-explore-travel.json.gz', import.meta.url)))).states.base;
const base = E.migrateSave(fixture);
const fresh = () => structuredClone(base);
const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { e, button: (label, op, id = '', cls = '', disabled = false) => `<button data-op="${e(op)}" data-id="${e(id)}" ${disabled ? 'disabled' : ''}>${label}</button>`, paragraphs: text => `<p>${e(text)}</p>`, date: day => 'Day ' + day };
const journal = (s, section = 'active', query = '') => renderSimpleJournal(s, E.getActions(s), { ...ui, section }, { query });
const rows = s => journalCommitments(s);
function walk(s, room) { for (const id of settlementWalkPath(s, room) || []) s = E.chooseAction(s, 'atlas_room_' + id); return s; }
function at(s, id) { s = structuredClone(s); s.locationId = id; syncCartography(s); return s; }
function reload(s) { assert.ok(E.validateSave(s)); const next = E.migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(next, s); return next; }
function accepted() { let s = fresh(); s = walk(s, settlementServices(s).find(r => r.kind === 'work').roomId); return E.chooseAction(s, E.getActions(s).find(a => a.id.startsWith('career_accept_')).id); }
function readyCommission() {
  let s = accepted();
  // Materials are acquired through the existing real merchant actions, not seeded rewards.
  for (const [id, n] of Object.entries(s.careers.active.materials)) {
    s = walk(s, 'market');
    for (let attempt = 0; attempt < 5 && s.equipment.materials[id] < n; attempt++) {
      const a = E.getActions(s).find(a => a.id === 'career_buy_' + id); assert.ok(a && !a.disabledReason, a?.disabledReason || s.event?.id);
      s = E.chooseAction(s, a.id);
    }
    assert.ok(s.equipment.materials[id] >= n);
  }
  s = walk(s, settlementServices(s).find(r => r.kind === 'work').roomId);
  const action = E.getActions(s).find(a => a.id === 'career_make_standard'); assert.equal(action.disabledReason, undefined);
  s = E.chooseAction(s, action.id);
  for (let n = 0; n < 8 && s.event; n++) s = E.chooseEventOption(s, s.event.choices.find(c => c.id === 'care' && !c.disabledReason)?.id || s.event.choices.find(c => !c.disabledReason).id);
  assert.equal(s.event, null); return reload(s);
}
function story() { let s = E.chooseAction(fresh(), 'stories_open_cracked_mark'); s = E.chooseEventOption(s, 'enterprise'); assert.equal(s.stories.arcs[0].chapter, 1); return reload(s); }
function readyStory() {
  const s = story();
  // Controlled due-age fixture, not a claim that a year was played.
  s.stories.arcs[0].nextAge = s.age;
  return reload(s);
}

test('genuine old save with only offers gets no commitment flood, and all Journal reads are pure', () => {
  const s = fresh(), before = structuredClone(s);
  assert.equal(rows(s).length, 0); assert.equal(journal(s).includes('data-journal-commitments'), false);
  journal(s, 'notes'); journal(s, 'archive'); assert.deepEqual(s, before);
  const old = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1.json', import.meta.url))).states.adult;
  const migrated = E.migrateSave(old); assert.ok(migrated); assert.equal(rows(migrated).length, old.obligations.filter(o => !o.resolved).length); assert.ok(rows(migrated).every(q => q.kind === 'promise'));
});

test('accepted commission appears once with saved client, materials, deadline, place and next step', () => {
  const s = accepted(), c = s.careers.active, before = structuredClone(s), list = rows(s);
  assert.equal(list.length, 1); assert.equal(list[0].key, 'commission:' + c.id);
  assert.equal(list[0].dueDay, c.dueDay); assert.equal(list[0].locationId, c.locationId);
  assert.equal(activeJournalQuests(s).filter(q => q.key === list[0].key).length, 1);
  assert.equal(list.some(q => q.key === 'obligation:' + c.id), false);
  const html = journal(s); assert.ok(html.includes(e(c.customerName))); assert.ok(html.includes('2 ore, 1 wood')); assert.ok(html.includes('Due day ' + c.dueDay));
  assert.ok(html.includes('data-id="work-' + c.locationId + '"')); assert.deepEqual(s, before);
  assert.deepEqual(rows(reload(s)), list);
});

test('completed work changes to delivery after reload, then pays and archives exactly once', () => {
  let s = readyCommission(); const id = s.careers.active.id, before = s.hero.gold;
  assert.equal(rows(s)[0].status, 'ready'); assert.equal(rows(s)[0].actionId, 'career_invoice');
  assert.match(journal(s), /Ready to deliver/); assert.match(journal(s), /Materials have already been consumed/);
  s = E.chooseAction(s, 'career_invoice'); assert.equal(s.hero.gold, before); assert.equal(s.event.id, 'career_invoice');
  s = E.chooseEventOption(s, 'honest'); assert.equal(s.careers.active, null); assert.equal(rows(s).length, 0); assert.ok(s.hero.gold > before);
  const paid = s.hero.gold, closed = s.journal.at(-1), archive = journal(s, 'archive'); assert.equal(archive.split(e(closed.text)).length - 1, 1);
  s = E.chooseAction(reload(s), 'career_invoice'); assert.equal(s.hero.gold, paid); assert.equal(s.journal.filter(j => j.id === closed.id).length, 1); assert.equal(s.careers.history.filter(j => j.title === 'The goods reached their customer').length, 1);
  assert.ok(s.obligations.find(o => o.id === id).resolved);
});

test('release removes a commission and its duplicate promise without inventing a refund or repeated archive', () => {
  let s = accepted(), gold = s.hero.gold; s = E.chooseAction(s, 'career_abandon');
  assert.equal(s.hero.gold, gold); assert.equal(rows(s).length, 0); assert.equal(s.careers.active, null);
  const before = structuredClone(s.careers); s = E.chooseAction(reload(s), 'career_abandon'); assert.deepEqual(s.careers, before);
  assert.equal(s.careers.history.filter(j => j.title === 'A commission released honestly').length, 1); assert.equal(journal(s, 'archive').split(e(s.journal.at(-1).text)).length - 1, 1);
});

test('earned waiting, ready and paused stories retain exact return day and last choice without auto-resume', () => {
  let s = story(), a = s.stories.arcs[0], r = rows(s)[0];
  const due = s.timeline.birthDay + a.nextAge * 365;
  assert.equal(r.dueDay, due); assert.match(journal(s), new RegExp('day ' + due)); assert.match(journal(s), /Pause story/);
  assert.equal(journal(s).includes('data-id="stories_open_' + a.id + '"'), false);
  s = E.chooseAction(s, 'journal_pause_story:' + a.id); const day = s.day, gold = s.hero.gold;
  assert.equal(rows(s)[0].status, 'paused'); assert.match(journal(s), /Resume story/); assert.equal(rows(s)[0].dueDay, due);
  assert.deepEqual(rows(reload(s)), rows(s)); assert.equal(s.day, day); assert.equal(s.hero.gold, gold);
  s = E.chooseAction(s, 'journal_resume_story:' + a.id); assert.equal(s.day, day); assert.equal(s.hero.gold, gold);
  s = readyStory(); a = s.stories.arcs[0]; assert.equal(questReturnForecast(s)[0].ready, true);
  assert.equal(questReturnForecast(s)[0].dueDay, s.timeline.birthDay + a.nextAge * 365, 'ready dates never drift to the current day');
  assert.match(journal(s), /ready to revisit/); assert.ok(journal(s).includes('data-id="stories_open_' + a.id + '"'));
});

test('personal continuation respects wrong-location barriers and preserves saved proposals on read later', () => {
  let s = readyStory(), a = s.stories.arcs[0];
  s = at(s, s.world.locations.find(p => p.id !== a.locationId && p.id !== 'home').id);
  const action = E.getActions(s).find(q => q.id === 'stories_open_' + a.id); assert.ok(action.disabledReason);
  assert.ok(journal(s).includes('disabled')); const before = structuredClone(s.stories);
  s = E.chooseAction(s, action.id); assert.deepEqual(s.stories, before); assert.equal(s.event, null);
  s = at(s, a.locationId); s = E.chooseAction(s, action.id); assert.equal(s.event.id, 'stories_chapter');
  s = reload(s); const day = s.day, gold = s.hero.gold; s = E.chooseEventOption(s, 'defer');
  assert.equal(s.day, day); assert.equal(s.hero.gold, gold); assert.equal(s.stories.arcs[0].chapter, 1); assert.equal(rows(s).filter(q => q.key === 'story:' + a.id).length, 1);
});

test('hearing a faction or leaving an uncommitted regional opening never counts as accepted', () => {
  let s = fresh(); s = at(s, regionalAnchor(s, 'saltreach').id); s = walk(s, settlementServices(s).find(r => r.kind === 'guide').roomId);
  const regional = E.getActions(s).find(a => a.id.startsWith('rpg_regional_') && !a.disabledReason); assert.ok(regional);
  s = E.chooseAction(s, regional.id); s = E.chooseEventOption(s, 'leave'); assert.equal(s.rpg.arcs[0].chapter, 0);
  assert.equal(rows(s).some(q => q.kind === 'regional-story'), false);
  const faction = settlementServices(s).find(r => r.kind === 'faction'); s = walk(s, faction.roomId);
  s = E.chooseAction(s, 'rpg_join_' + faction.subjectId); assert.equal(s.rpg.factions[0].rank, 0);
  s = E.chooseAction(s, 'rpg_faction_' + faction.subjectId); s = E.chooseEventOption(s, 'leave');
  assert.equal(rows(s).some(q => q.kind === 'faction-return'), false); reload(s);
});

test('real regional and faction choices create one waiting return with saved next date and correct provider', () => {
  let s = fresh(); s = at(s, regionalAnchor(s, 'saltreach').id); s = walk(s, settlementServices(s).find(r => r.kind === 'guide').roomId);
  const regional = E.getActions(s).find(a => a.id.startsWith('rpg_regional_') && !a.disabledReason);
  s = E.chooseAction(s, regional.id); s = E.chooseEventOption(s, 'trade'); const a = s.rpg.arcs[0]; assert.equal(a.chapter, 1);
  assert.equal(rows(s).find(q => q.kind === 'regional-story').dueDay, a.nextDay);
  const faction = settlementServices(s).find(r => r.kind === 'faction'); s = walk(s, faction.roomId);
  s = E.chooseAction(s, 'rpg_join_' + faction.subjectId); s = E.chooseAction(s, 'rpg_faction_' + faction.subjectId); s = E.chooseEventOption(s, 'accept_marks');
  assert.equal(rows(s).filter(q => q.kind === 'faction-objective').length, 1);
  for (let n = 0; n < 6 && s.rpg.factions[0].rank === 0; n++) {
    const step = rows(s).find(q => q.kind === 'faction-objective'); s = walk(s, step.roomId); s = E.chooseAction(s, step.actionId);
    for (let interrupted = 0; interrupted < 12 && (s.event || s.rpg.project); interrupted++) {
      if (s.event) s = E.chooseEventOption(s, s.event.choices.find(c => c.id === 'conclude_correct' && !c.disabledReason)?.id || s.event.choices.find(c => !c.disabledReason).id);
      else s = E.chooseAction(s, 'rpg_continue');
    }
  }
  assert.equal(s.rpg.factions[0].rank, 1); assert.equal(rows(s).filter(q => q.kind === 'faction-return').length, 1);
  assert.equal(rows(s).find(q => q.kind === 'faction-return').subjectId, faction.subjectId);
  assert.deepEqual(rows(reload(s)), rows(s)); assert.match(journal(s), /Returns on day/);
});

test('unresolved real obligations remain visible and resolved obligations vanish without fabricated actions', () => {
  const s = fresh(); s.obligations.push({ id: 'unknown-legacy-promise', title: 'A real older promise', description: 'Keep its original saved terms.', dueDay: s.day + 5, resolved: false });
  assert.equal(rows(s).length, 1); assert.equal(rows(s)[0].actionId, undefined); assert.match(journal(s), /A real older promise/);
  assert.deepEqual(rows(reload(s)), rows(s)); s.obligations[0].resolved = true; assert.equal(rows(s).length, 0);
});

test('production Journal Find and provider continuation navigate without time, Gold or rewards', async t => {
  const s = accepted(), c = s.careers.active, surface = await mountApp(t, { states: [s], width: 390, height: 844 });
  await surface.click('title-continue'); await surface.click('tab', 'journal');
  assert.ok(surface.root.querySelector('[data-journal-commitments]')); assert.ok(surface.root.querySelector('[data-commitment="commission:' + c.id + '"]'));
  const before = surface.current(); await surface.click('quest-location', c.locationId); assert.equal(surface.current().day, before.day); assert.equal(surface.current().hero.gold, before.hero.gold);
  await surface.click('tab', 'journal'); await surface.click('activity-visit', 'work-' + c.locationId);
  assert.ok(surface.root.querySelector('.service-meeting')); assert.equal(surface.current().day, before.day); assert.equal(surface.current().hero.gold, before.hero.gold);
  await surface.click('service-topic', 'commissions'); assert.ok(surface.root.querySelector('[data-op="activity"][data-id="career_make_standard"]'));
  assert.deepEqual(surface.current().careers.active, before.careers.active);
});

test('production Journal pause/resume targets only the chosen story and Continue opens its real proposal', async t => {
  const s = readyStory(), id = s.stories.arcs[0].id, surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue'); await surface.click('tab', 'journal'); const before = surface.current();
  await surface.click('activity', 'journal_pause_story:' + id); assert.equal(surface.current().stories.arcs[0].paused, true);
  assert.equal(surface.root.querySelector('[data-op="activity"][data-id="stories_open_' + id + '"]'), null);
  await surface.click('activity', 'journal_resume_story:' + id); assert.equal(surface.current().stories.arcs[0].paused, undefined);
  assert.equal(surface.current().day, before.day); assert.equal(surface.current().hero.gold, before.hero.gold); assert.deepEqual(surface.current().stories.arcs[0].choices, before.stories.arcs[0].choices);
  await surface.click('activity', 'stories_open_' + id); assert.equal(surface.current().event.id, 'stories_chapter'); assert.equal(surface.current().day, before.day); assert.equal(surface.current().hero.gold, before.hero.gold);
});


test('legacy returned-story dates use the fixed adult calendar origin, not the date of viewing', () => {
  let s = E.migrateSave(JSON.parse(readFileSync(new URL('./fixtures/legacy-v1.json', import.meta.url))).states.adult);
  const id = E.getActions(s).find(a => a.id.startsWith('stories_open_'))?.id; assert.ok(id);
  s = E.chooseAction(s, id);
  s = E.chooseEventOption(s, 'enterprise');
  for (let n = 0; n < 12 && s.stories.project; n++) {
    if (s.event) s = E.chooseEventOption(s, s.event.choices.find(c => !c.disabledReason).id);
    else s = E.chooseAction(s, 'stories_continue');
  }
  assert.equal(s.stories.arcs[0].chapter, 1);
  const row = questReturnForecast(s)[0], later = structuredClone(s); later.day++;
  assert.equal(row.dueDay, (row.nextAge - 18) * 365); assert.equal(questReturnForecast(later)[0].dueDay, row.dueDay);
});

test('Journal search opens matching commitments even after a closed ordinary disclosure', async t => {
  const s = accepted(), surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue'); await surface.click('tab', 'journal');
  surface.root.querySelector('[data-journal-commitments]').open = false;
  const form = surface.root.querySelector('#journal-search'); form.controls.find(c => c.name === 'query').value = s.careers.active.customerName;
  const before = surface.current(); await surface.fire('submit', form);
  assert.equal(surface.root.querySelector('[data-journal-commitments]').open, true); assert.deepEqual(surface.current(), before);
});

function clearMoments(s) {
  for (let n = 0; n < 40 && s.event; n++) {
    const c = s.event.choices.find(c => ['care', 'later', 'rest', 'keep', 'continue', 'pause'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason);
    s = E.chooseEventOption(s, c.id);
  }
  assert.equal(s.event, null); return reload(s);
}
function interruptedRegional() {
  let s = fresh(); s = at(s, regionalAnchor(s, 'saltreach').id);
  // Controlled calendar boundary, with actual public attendance and interruption.
  s.day = s.timeline.birthDay + (s.age + 1) * 365 - 1; assert.ok(E.validateSave(s));
  s = walk(s, settlementServices(s).find(r => r.kind === 'guide').roomId);
  const action = E.getActions(s).find(a => a.id.startsWith('rpg_regional_') && !a.disabledReason); assert.ok(action);
  s = E.chooseAction(s, action.id); s = E.chooseEventOption(s, 'trade');
  assert.ok(s.rpg.project); assert.ok(s.event); return clearMoments(s);
}

test('interrupted accepted regional work is visible before its first completed chapter and quotes remaining attendance honestly', () => {
  let s = interruptedRegional(), p = s.rpg.project;
  assert.equal(s.rpg.arcs[0].chapter, 0); assert.ok(p.paid); assert.ok(p.remainingDays > 0);
  const r = rows(s).find(q => q.kind === 'regional-story'); assert.ok(r); assert.equal(r.actionDays, p.remainingDays); assert.equal(r.actionCost, 0);
  const html = journal(s); assert.ok(html.includes(`${p.remainingDays} committed days`)); const continuation = html.slice(html.indexOf('data-id="rpg_continue"')).split('</div>')[0]; assert.equal(continuation.includes('No time · 0 Gold fee'), false);
  const completed = p.completedDays, day = s.day; s = E.chooseAction(reload(s), 'rpg_continue');
  assert.equal(s.rpg.project, null); assert.equal(s.rpg.arcs[0].chapter, 1); assert.ok(s.day > day); assert.ok(completed > 0);
  assert.equal(rows(s).filter(q => q.kind === 'regional-story').length, 1);
});

test('canceling first interrupted regional work removes the unearned shell and never repeats a reward', () => {
  let s = interruptedRegional(); const gold = s.hero.gold, day = s.day;
  s = E.chooseAction(s, 'rpg_cancel'); assert.equal(s.rpg.project, null); assert.equal(rows(s).some(q => q.kind === 'regional-story'), false);
  assert.equal(s.hero.gold, gold); assert.equal(s.day, day); const history = structuredClone(s.rpg.history);
  s = E.chooseAction(reload(s), 'rpg_cancel'); assert.deepEqual(s.rpg.history, history); assert.equal(s.hero.gold, gold);
});

test('known school, keeper and calling obligations point only at their existing fulfillment actions', () => {
  const s = fresh();
  s.obligations.push(...['school_service', 'living_keeper_review', 'calling_service_guardian'].map(id => ({ id, title: id, description: 'The actual saved promise.', dueDay: s.day + 10, resolved: false })));
  const list = rows(s); assert.equal(list.find(q => q.key === 'obligation:school_service').actionId, 'school_service');
  assert.equal(list.find(q => q.key === 'obligation:living_keeper_review').actionId, 'quest_keeper_review');
  assert.equal(list.find(q => q.key === 'obligation:calling_service_guardian').actionId, 'calling_service_guardian');
  const html = journal(s); assert.equal(html.includes('data-id="quest_keeper_review"'), false, 'a synthetic promise cannot invent an unavailable fulfillment action');
});

test('finishing or abandoning a personal story removes the accepted row once and preserves original decisions', () => {
  let s = readyStory(), id = s.stories.arcs[0].id;
  s = E.chooseAction(s, 'stories_open_' + id); s = E.chooseEventOption(s, 'leave'); const choices = structuredClone(s.stories.arcs[0].choices);
  assert.equal(rows(s).some(q => q.key === 'story:' + id), false); assert.equal(s.stories.arcs[0].status, 'abandoned');
  s = E.chooseAction(reload(s), 'stories_open_' + id); assert.deepEqual(s.stories.arcs[0].choices, choices); assert.equal(s.event, null);
  assert.ok(journal(s, 'archive').includes(e(rows(readyStory())[0].title)));
  s = readyStory();
  for (let chapter = 1; chapter < 3; chapter++) {
    // Controlled ready-age fixtures only; rewards still require actual attended work.
    s.stories.arcs[0].nextAge = s.age; s = E.chooseAction(s, 'stories_open_' + id); s = E.chooseEventOption(s, 'enterprise'); s = clearMoments(s);
    for (let n = 0; n < 10 && s.stories.project; n++) s = clearMoments(E.chooseAction(s, 'stories_continue'));
  }
  assert.equal(s.stories.arcs[0].status, 'completed'); assert.equal(rows(s).some(q => q.key === 'story:' + id), false);
  const saved = structuredClone(s.stories); s = E.chooseAction(reload(s), 'stories_open_' + id); assert.deepEqual(s.stories, saved);
});


test('conversation-note promises use the canonical teacher and companion locations rather than raw person arrays', () => {
  const s = fresh(), teacher = educationTeacher(s), companion = getContacts(s).find(p => p.kind === 'companion');
  assert.ok(teacher && companion);
  s.obligations.push(...[teacher, companion].map(p => ({ id: 'dialogue-notes-' + p.id, title: 'Bring honest notes', description: 'The saved observations promise.', dueDay: s.day + 10, resolved: false })));
  const people = getContacts(s), list = rows(s);
  for (const p of [teacher, companion]) {
    const row = list.find(q => q.key === 'obligation:dialogue-notes-' + p.id), actual = people.find(q => q.id === p.id);
    assert.equal(row.personName, actual.name); assert.equal(row.locationId, actual.locationId); assert.equal(row.actionId, 'talk_' + p.id);
    assert.ok(journal(s).includes('data-id="' + e(actual.locationId) + '"'));
  }
  reload(s);
});


test('fellowship directions match its own undertaking rather than a companion RPG-story residence', () => {
  const s = fresh(), id = 'mira', p = s.companions.find(p => p.id === id); p.recruited = false; p.active = false;
  s.rpg.companionStages[id].locationId = s.world.locations.find(l => l.id !== s.hero.birthplaceId).id;
  s.obligations.push({ id: 'fellowship_companion_' + id, title: 'Keep the real companion promise', description: 'Eight attended days.', dueDay: s.day + 10, resolved: false });
  const expected = [s.hero.birthplaceId, s.life?.home?.locationId, s.hero.birthplaceId, 'home', 'brook', 'camp', 'sanctuary', 'city'].map(id => s.world.locations.find(l => l.id === id)).find(l => l && !['destroyed', 'evacuated'].includes(l.status)).id;
  assert.equal(rows(s).find(q => q.key === 'obligation:fellowship_companion_mira').locationId, expected);
  p.recruited = true; p.active = true; assert.equal(rows(s).find(q => q.key === 'obligation:fellowship_companion_mira').locationId, s.locationId);
});

test('production Journal delivery uses the actual steward invoice and removes the commission only after payment', async t => {
  const s = readyCommission(), c = s.careers.active, surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue'); await surface.click('tab', 'journal');
  assert.match(surface.root.innerHTML, /Ready to deliver/);
  const before = surface.current(); await surface.click('activity-visit', 'work-' + c.locationId); await surface.click('service-topic', 'commissions');
  await surface.click('activity', 'career_invoice'); assert.equal(surface.current().event.id, 'career_invoice'); assert.equal(surface.current().hero.gold, before.hero.gold);
  await surface.click('choice', 'honest'); await surface.click('tab', 'journal');
  assert.equal(surface.current().careers.active, null); assert.equal(surface.root.querySelector('[data-commitment="commission:' + c.id + '"]'), null);
  assert.ok(surface.current().hero.gold > before.hero.gold); reload(surface.current());
});

test('production Journal release is the existing steward action and closes the card without payment or duplicate history', async t => {
  const s = accepted(), c = s.careers.active, surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue'); await surface.click('tab', 'journal'); const before = surface.current();
  await surface.click('activity-visit', 'work-' + c.locationId); await surface.click('service-topic', 'commissions'); await surface.click('activity', 'career_abandon');
  await surface.click('tab', 'journal'); assert.equal(surface.current().careers.active, null);
  assert.equal(surface.current().day, before.day); assert.equal(surface.current().hero.gold, before.hero.gold);
  assert.equal(surface.root.querySelector('[data-commitment="commission:' + c.id + '"]'), null);
  assert.equal(surface.current().careers.history.filter(j => j.title === 'A commission released honestly').length, 1); reload(surface.current());
});

test('production Journal waiting return stays optional through navigation and exposes only its pause control', async t => {
  const s = story(), a = s.stories.arcs[0], surface = await mountApp(t, { states: [s] });
  await surface.click('title-continue'); await surface.click('tab', 'journal'); const before = surface.current();
  assert.ok(surface.root.querySelector('[data-commitment="story:' + a.id + '"]'));
  assert.ok(surface.root.querySelector('[data-op="activity"][data-id="journal_pause_story:' + a.id + '"]'));
  assert.equal(surface.root.querySelector('[data-op="activity"][data-id="stories_open_' + a.id + '"]'), null);
  await surface.click('workspace-section', 'journal:notes'); await surface.click('workspace-section', 'journal:active');
  assert.deepEqual(surface.current(), before); assert.match(surface.root.innerHTML, new RegExp('Returns at age ' + a.nextAge));
});
