import test from 'node:test';
import assert from 'node:assert/strict';
import { AGE_UP_HELP, validFirstDayGuide, firstDayGuideVisible, dismissFirstDayGuide, firstDayGuideView, firstDayGuideCommand, firstDayGuideFocusSelectors } from '../dist/js/first-day-guide.js';
import { renderFirstDayGuide } from '../dist/js/first-day-guide-ui.js';

// Deliberately pure fixtures: no engine, generated lives, DOM or browser work.
const state = (age = 0) => ({ seed: 'same-seed', phase: age < 18 ? 'childhood' : 'adult', age, day: age * 365, locationId: 'home', hero: { name: 'Rowan', profession: 'Unemployed', gold: 0, firstDayGuide: { version: 1, dismissed: false } }, education: { route: null }, cartography: { interior: { siteId: 'home', roomId: 'gate' } }, timeline: { yearTarget: null }, event: null });
const offer = (id, extra = {}) => ({ id, label: id, description: 'Existing action description.', days: 1, cost: 0, ...extra });
const provider = (kind = 'school', extra = {}) => ({ id: kind + '-home', kind, subjectId: 'community', name: 'A real resident', locationId: 'home', roomId: kind === 'school' ? 'archive' : 'workyard', here: false, ...extra });
function readers({ current = [], projected = [], people = [], path = ['archive'], commitment = null, need = false } = {}) {
  const calls = { actions: 0, services: 0, paths: 0, projections: [] };
  return {
    calls,
    actions(s) { calls.actions++; if (s.cartography.interior.roomId !== 'gate') { calls.projections.push(s); return projected; } return current; },
    unlocks(s) { return [['school', 6], ['work', 16], ['adult', 18]].map(([id, age]) => ({ id, unlocked: s.age >= age })); },
    services() { calls.services++; return people; },
    walkPath() { calls.paths++; return path; },
    offers(_p, actions) { return actions; },
    commitment() { return commitment; },
    ageControl() { return { needsBlood: need }; },
  };
}
const actionStep = view => view.steps.find(step => step.key.startsWith('action:'));
const serviceStep = view => view.steps.find(step => step.key.startsWith('service:'));
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const nested of Object.values(value)) freeze(nested); } return value; }

test('the optional marker is strict and missing legacy metadata does not auto-open', () => {
  for (const valid of [undefined, { version: 1, dismissed: true }, { version: 1, dismissed: false }]) assert.equal(validFirstDayGuide(valid), true);
  for (const invalid of [null, false, [], {}, { version: 2, dismissed: false }, { version: 1, dismissed: 0 }, { version: 1 }, { version: 1, dismissed: false, extra: true }, Object.assign(Object.create({ version: 1, dismissed: false }), { a: 1, b: 2 })]) assert.equal(validFirstDayGuide(invalid), false);
  const s = state(); assert.equal(firstDayGuideVisible(s), true); delete s.hero.firstDayGuide;
  assert.equal(firstDayGuideVisible(s), false); assert.equal(firstDayGuideVisible(s, true), true);
  s.phase = 'retired'; assert.equal(firstDayGuideVisible(s, true), false);
});

test('dismissal changes only its saved marker and isolates same-seed lives and successors', () => {
  const s = freeze(state()), before = JSON.stringify(s), other = state(), next = dismissFirstDayGuide(s);
  assert.equal(JSON.stringify(s), before); assert.equal(firstDayGuideVisible(next), false); assert.equal(firstDayGuideVisible(JSON.parse(JSON.stringify(next))), false);
  const expected = structuredClone(s); expected.hero.firstDayGuide.dismissed = true; assert.deepEqual(next, expected);
  assert.equal(firstDayGuideVisible(other), true); assert.equal(firstDayGuideVisible(state(18)), true);
  assert.equal(firstDayGuideVisible(next, true), true); assert.equal(next.hero.firstDayGuide.dismissed, true, 'manual reopening need not clear the saved marker');
});

for (const [name, fields] of [
  ['event', { event: { id: 'birth_year_6', title: 'A real waiting question' } }],
  ['reply', { conversations: { pending: { personId: 'teacher-actual' } } }],
  ['battle', { battle: { title: 'Encounter' } }],
  ['descent', { maze: { id: 'already-started' } }],
  ['journey', { cartography: { pending: { progress: 2 } } }],
  ['offsite', { cartography: { offsite: true } }],
  ['saved year', { life: { plan: { targetDay: 500 } } }],
]) test(name + ' takes priority without any action/provider lookup', () => {
  const s = freeze({ ...state(18), ...fields }), before = JSON.stringify(s), r = readers({ current: [offer('leisure_walk')], people: [provider('work')] });
  const v = firstDayGuideView(s, r); assert.equal(v.steps.length, 2); assert.equal(v.steps.at(-1).key, 'saving'); assert.equal(actionStep(v), undefined); assert.equal(serviceStep(v), undefined);
  assert.equal(r.calls.actions, 0); assert.equal(r.calls.services, 0); assert.equal(JSON.stringify(s), before);
});

test('existing commitments and the year control need also suppress ordinary suggestions', () => {
  for (const r of [readers({ commitment: { title: 'An existing promise' } }), readers({ need: true })]) {
    const v = firstDayGuideView(freeze(state(65)), r); assert.equal(v.steps.length, 2); assert.ok(v.steps[0].focus); assert.equal(r.calls.actions, 0);
  }
});

test('infant and preschool guidance uses only actually enabled care, story or play offers', () => {
  const s = freeze(state()), care = offer('grow_family', { label: 'Make room for care with Alex' }), r = readers({ current: [care] });
  const v = firstDayGuideView(s, r); assert.equal(v.steps.length, 2); assert.equal(actionStep(v).label, care.label); assert.equal(r.calls.services, 0);
  const preschool = firstDayGuideView(freeze(state(3)), readers({ current: [offer('grow_family', { disabledReason: 'Already attended.' }), offer('grow_nursery', { label: 'Count with a willing adult' })] }));
  assert.equal(actionStep(preschool).id, 'grow_nursery');
});

test('school guidance checks one real local provider room, never strips a Visit reason', () => {
  const s = freeze(state(10)), before = JSON.stringify(s), teacher = freeze(provider()), r = readers({ current: [offer('atlas_room_archive', { days: 0 }), offer('school_attend', { disabledReason: 'Visit a teacher.' }), offer('grow_play')], projected: [offer('school_attend', { disabledReason: 'Eight lessons already attended.' })], people: [teacher, provider('school', { id: 'distant', locationId: 'elsewhere' })] });
  assert.equal(serviceStep(firstDayGuideView(s, r)), undefined); assert.equal(r.calls.actions, 2); assert.equal(r.calls.services, 1); assert.equal(r.calls.paths, 1); assert.equal(r.calls.projections.length, 1);
  assert.equal(JSON.stringify(s), before); assert.equal(r.calls.projections[0].cartography.interior.roomId, 'archive');
  r.actions = () => [offer('school_attend')]; r.walkPath = () => [];
  assert.equal(serviceStep(firstDayGuideView(s, r)).id, teacher.id);
});

test('projection retains original restrictions, identity and pending fields without transitions', () => {
  const s = freeze(state(10)), r = readers({ current: [offer('atlas_room_archive', { days: 0 })], projected: [offer('school_enroll_community')], people: [provider()] });
  const v = firstDayGuideView(s, r), projection = r.calls.projections[0]; assert.ok(serviceStep(v));
  assert.equal(projection.hero, s.hero); assert.equal(projection.timeline, s.timeline); assert.equal(projection.event, s.event); assert.equal(projection.cartography.offsite, s.cartography.offsite); assert.equal(s.cartography.interior.roomId, 'gate');
});

test('projected cartography does not share mutable nested map records with the actual life', () => {
  const s = state(10); s.cartography.sites = { home: { visited: 3 } }; s.cartography.route = { keys: ['a', 'b'] };
  const before = JSON.stringify(s), r = readers({ current: [offer('atlas_room_archive', { days: 0 })], people: [provider()] }), read = r.actions;
  r.actions = candidate => { const rows = read(candidate); if (candidate !== s) { candidate.cartography.sites.home.visited++; candidate.cartography.route.keys.push('preview-only'); } return rows; };
  firstDayGuideView(s, r); assert.equal(JSON.stringify(s), before);
});

test('focus destinations name existing moment surfaces rather than a fictional shared ID', () => {
  for (const [fields, focus, selector] of [
    [{ event: { id: 'arrival', title: 'First breath' } }, 'event', '.story-scene h2'],
    [{ battle: {}, event: { id: 'under-battle', title: 'A room' } }, 'battle', '.battle-command-panel'],
    [{ maze: {} }, 'descent', '.maze-current h2'],
    [{ justice: { prison: {} } }, 'prison', '.chapter-heading h1'],
    [{ workshop: { project: {} } }, 'commitment', '.project-panel h2'],
  ]) {
    const v = firstDayGuideView({ ...state(), ...fields }, readers()); assert.equal(v.steps[0].focus, focus); assert.equal(firstDayGuideFocusSelectors(focus)[0], selector);
  }
});

test('no provider is invented, searched remotely, swept, or visited across a blocked first room', () => {
  for (const r of [
    readers({ people: [] }), readers({ people: [provider('school', { locationId: 'elsewhere' })] }),
    readers({ people: [provider()], path: null }), readers({ people: [provider()], current: [offer('atlas_room_archive', { disabledReason: 'Resolve this moment.' })] }),
  ]) { const v = firstDayGuideView(freeze(state(6)), r); assert.equal(serviceStep(v), undefined); assert.equal(r.calls.actions, 1); assert.ok(v.steps.some(step => step.key === 'help')); }
});

test('adult and older starts offer legal livelihood plus ordinary life, never only adventure', () => {
  for (const age of [18, 65]) {
    const s = freeze(state(age)), r = readers({ current: [offer('atlas_room_workyard', { days: 0 }), offer('leisure_walk')], projected: [offer('career_work')], people: [provider('work')], path: ['workyard'] });
    const v = firstDayGuideView(s, r); assert.equal(v.steps.length, 3); assert.ok(serviceStep(v)); assert.equal(actionStep(v).id, 'leisure_walk'); assert.equal(v.steps.at(-1).key, 'saving');
    const empty = firstDayGuideView(s, readers({ current: [offer('atlas_room_workyard', { days: 0 }), offer('leisure_read')], projected: [offer('career_choose_unemployed')], people: [provider('work')], path: ['workyard'] }));
    assert.equal(serviceStep(empty), undefined); assert.equal(actionStep(empty).id, 'leisure_read');
  }
});

test('an already-local provider reuses the current action list without another projection', () => {
  const s = freeze(state(10)), r = readers({ current: [offer('school_attend')], people: [provider('school', { here: true })], path: [] });
  assert.ok(serviceStep(firstDayGuideView(s, r))); assert.equal(r.calls.actions, 1); assert.equal(r.calls.projections.length, 0);
});

test('a stale suggested command disappears when a newer pending moment or local restriction applies', () => {
  const s = freeze(state(18)), r = readers({ current: [offer('leisure_walk')] });
  assert.equal(firstDayGuideCommand(s, 'action:leisure_walk', r).op, 'activity');
  const waiting = freeze({ ...s, event: { id: 'later-event', title: 'A new decision' } });
  assert.equal(firstDayGuideCommand(waiting, 'action:leisure_walk', r), null);
  r.actions = () => [offer('leisure_walk', { disabledReason: 'Unavailable now.' })];
  assert.equal(firstDayGuideCommand(s, 'action:leisure_walk', r), null);
});

test('rendered guide escapes dynamic text, shares Age up copy and adds no live health region', () => {
  const e = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const button = (label, op, id) => `<button type="button" data-op="${e(op)}" data-id="${e(id)}">${label}</button>`;
  const s = state(18), r = readers({ current: [offer('leisure_walk', { label: '<img onerror="bad">', description: '<script>bad</script>' })] }), v = firstDayGuideView(s, r);
  const html = renderFirstDayGuide(s, v, { e, button, actionCostSummary: () => '1 Day · No Fee', actionCostDetails: () => 'Existing household estimate.' });
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img'));
  assert.ok(html.includes(e(AGE_UP_HELP))); assert.ok(html.includes('Existing household estimate.'));
  assert.equal((html.match(/<details/g) || []).length, 1); assert.equal((html.match(/<li>/g) || []).length, 2);
  assert.doesNotMatch(html, /aria-live|role="status"|data-save-health|aria-pressed|role="button"|data-op="age-up"/);
});
