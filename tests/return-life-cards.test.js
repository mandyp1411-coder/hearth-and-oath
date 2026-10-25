import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { returnLifeContext, returnLifeCardView, returnLifeSourceNote } from '../dist/js/return-life-cards.js';
import { saveHealthView, renderSaveHealth } from '../dist/js/save-health-ui.js';

const health = (id = 0, extra = {}) => ({ id, hasState: true, hasDurableState: true, hasChanges: false, available: true, status: 'saved', lastSavedAt: '2026-10-12T00:00:00.000Z', ...extra });
const life = extra => ({ hero: { name: 'Rowan' }, phase: 'adult', ...extra });
function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); for (const entry of Object.values(value)) freeze(entry); } return value; }

test('each saved card reads exactly one actual unfinished moment, never an imagined next activity', () => {
  const cases = [
    [{ battle: {}, event: { title: 'An interruption' } }, 'Encounter unfinished'],
    [{ event: { title: 'A winter letter' }, conversations: { pending: {} } }, 'Decision waiting: A winter letter'],
    [{ age:0, event:{title:'Your first winter'} }, 'Watching your first years: Your first winter'],
    [{ age:2, event:{} }, 'Watching your first years'],
    [{ age:3, event:{title:'A place at the table'} }, 'Decision waiting: A place at the table'],
    [{ conversations: { pending: {} }, timeline: { journey: {} } }, 'Reply waiting'],
    [{ maze: {}, workshop: { project: { title: 'A cottage' } } }, 'Descent underway'],
    [{ justice: { prison: {} } }, 'Sentence unfinished'],
    [{ timeline: { journey: {} } }, 'On the road'],
    [{ cartography: { pending: {} } }, 'On the road'],
    [{ cartography: { route: {} } }, 'On the road'],
    [{ cartography: { offsite: true } }, 'On the road'],
    [{ workshop: { project: { title: 'A cottage' } } }, 'Project paused: A cottage'],
    [{ careers: { batch: {} } }, 'Work commitment paused'],
    [{ life: { plan: {} } }, 'Year in progress'],
    [{ timeline: { yearTarget: 365 } }, 'Year in progress'],
  ];
  for (const [extra, expected] of cases) assert.equal(returnLifeContext(freeze(life(extra))), expected);
  assert.equal(returnLifeContext(life({})), '');
  assert.equal(returnLifeContext(null), '');
  assert.equal(returnLifeContext(life({ phase: 'retired', event: { title: 'Old history' } })), '');
});

test('the canonical commitment reader receives the same read-only world only when needed', () => {
  const state = freeze(life({ community: { project: { commitment: {} } } }));
  let calls = 0;
  assert.equal(returnLifeContext(state, value => { calls++; assert.equal(value, state); return { title: 'The riverside school' }; }), 'Commitment paused: The riverside school');
  assert.equal(calls, 1);
  assert.equal(returnLifeContext(freeze(life({ conversations: { pending: {} } })), () => { throw Error('No lower-priority read'); }), 'Reply waiting');
});

test('independent cards identify exact session/copy export targets without borrowing another slot context', () => {
  const cards = [
    returnLifeCardView(freeze(life({ event: { title: 'A letter' } })), health(0), { live: true }),
    returnLifeCardView(freeze(life({ hero: { name: 'Alder' }, timeline: { journey: {} } })), health(1)),
    returnLifeCardView(freeze(life({ hero: { name: 'Mira' }, workshop: { project: { title: 'A hearth' } } })), health(2)),
  ];
  assert.deepEqual(cards.map(card => card.context), ['Decision waiting: A letter', 'On the road', 'Project paused: A hearth']);
  assert.equal(cards[0].exportLabel, 'Export latest session for Rowan from slot 1');
  assert.equal(cards[1].exportLabel, 'Export this tab’s copy of Alder from slot 2');
  assert.equal(cards[2].exportLabel, 'Export this tab’s copy of Mira from slot 3');
  assert.equal(returnLifeCardView(null, health()), null);
});

test('dirty live choices, held slot copies and stale conflict copies remain distinct from durable saves', () => {
  assert.match(returnLifeSourceNote(health(0, { hasChanges: true, status: 'pending' }), true), /Latest session; not yet saved/);
  assert.equal(returnLifeSourceNote(health(1, { hasChanges: true, status: 'unsaved' })), 'This tab’s unsaved copy.');
  assert.match(returnLifeSourceNote(health(0, { status: 'stale' }), true), /older copy/);
  assert.equal(returnLifeSourceNote(health(), true), '', 'a committed queued session clears its source warning');
});

test('cards keep canonical durable dates and honest unknown-time text without adding a last-played fiction', () => {
  const options = { unknownTimeLabel: 'Save time unavailable' };
  assert.match(saveHealthView(health(), true, options).lastSaved, /^Last saved:/);
  assert.equal(saveHealthView(health(1, { lastSavedAt: null }), true, options).lastSaved, 'Save time unavailable');
  assert.equal(saveHealthView(health(2, { lastSavedAt: null, hasDurableState: false, status: 'unsaved' }), false, options).lastSaved, 'No successful browser save yet.');
  assert.match(saveHealthView(health(0, { lastSavedAt: null })).lastSaved, /time not recorded/, 'other ID20 surfaces preserve their existing copy');
});

test('slot health can omit its duplicate export while preserving warning/live-region and normal escape defaults', () => {
  const e = value => String(value).replaceAll('"', '&quot;'), failed = health(2, { status: 'unsaved', hasChanges: true, lastSavedAt: null });
  const card = renderSaveHealth(failed, { e, exportButton: false, unknownTimeLabel: 'Save time unavailable', live: true });
  assert.doesNotMatch(card, /<button/);
  assert.match(card, /Save time unavailable/);
  assert.match(card, /data-save-problem role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(card, /Not saved — export needed/);
  assert.match(renderSaveHealth(failed, { e }), /Export latest session from slot 3/);
});

test('shell keeps direct existing JSON export and native sibling controls without extra cloning or load side effects', () => {
  const app = readFileSync(new URL('../dist/js/app.js', import.meta.url), 'utf8');
  const row = app.slice(app.indexOf('function saveSlotRow('), app.indexOf('function saveSlotsScreen('));
  const slots = app.slice(app.indexOf('function saveSlotsScreen('), app.indexOf('function settingsScreen('));
  const adapter = readFileSync(new URL('../dist/js/return-life-cards.js', import.meta.url), 'utf8');
  assert.equal((slots.match(/saveStore\.list\(/g) || []).length, 1, 'reuse the pre-existing single private slot-list copy');
  assert.match(row, /<\/button>\$\{isIronman\(state\)\?/);
  assert.match(row, /:state\?`<div class="slot-row-actions"><button class="button secondary small slot-export" type="button" data-op="export-session"/);
  // v0.72.1: an old life is kept undecoded (keptSlotRow), so a decoded slot is always one this page plays.
  assert.match(row, /!creating&&!state\|\|creating&&isIronman\(state\)/);
  assert.match(row, /if\(!slot\.state&&slot\.kept\)return keptSlotRow\(slot,creating\);/);
  assert.match(row, /exportButton:false,unknownTimeLabel:'Save time unavailable'/);
  // v0.72.1: a kept Ironman run exports through export-kept, so the slot's live export takes only the life.
  assert.match(app, /if\(op==='export-session'\)\{exportState\(Number\(id\)===activeSlot&&game\?game:saveStore\.read\(Number\(id\)\)\);return;\}/);
  assert.doesNotMatch(row + adapter, /structuredClone|JSON\.(?:parse|stringify)|Date\.now|saveStore\.(?:write|replace|remove|reload|select)\(/);
  assert.doesNotMatch(row + adapter, /lastPlayedAt|cloud sync|cloud-sync/i);
});
