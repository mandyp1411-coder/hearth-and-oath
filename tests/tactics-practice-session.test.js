import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, LEGACY_SAVE_KEY } from '../dist/js/saves.js';
import { createTacticsPracticeController } from '../dist/js/tactics-practice-session.js';

const KEY = 'hearth-and-oath:slots:v1';
function harness() {
  const life = { hero: { name: 'Original life', hp: 42 }, day: 18, pending: { kind: 'unresolved' } };
  const values = new Map([[KEY, JSON.stringify({ version: 1, activeSlot: 0, slots: [{ id: 0, state: life, updatedAt: '2026-10-17T01:00:00.000Z', revision: 'original' }], backups: {} })], [LEGACY_SAVE_KEY, JSON.stringify(life)], ['workspace-original', '{"tab":"life"}']]);
  const writes = [], queue = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { writes.push(key); values.set(key, String(value)); } };
  const store = createSaveStore(storage), position = { life, slot: 0, screen: 'game', tab: 'life', modal: 'menu', view: 'life:present' };
  let connected = true, checks = 0;
  const controller = createTacticsPracticeController({
    readContext: () => ({ ...position, position: position.life ? JSON.stringify(position.life) : '' }),
    coordinate: operation => new Promise(resolve => queue.push(() => resolve(operation()))),
    checkProtection: context => {
      checks += 1;
      if (!context.life) return { ready: true };
      store.checkForConflict(context.slot);
      const dirty = store.hasUnsavedChanges(context.slot, context.life);
      const h = store.health(context.slot, context.life);
      return { ready: !dirty && h.available && h.hasDurableState && !h.hasChanges && h.status === 'saved', reason: 'Saving needs attention.' };
    },
  });
  return { controller, values, writes, position, storage, store, queue, checks: () => checks, disconnect: () => { connected = false; }, open: id => controller.open(id, { stillCurrent: () => connected, returnData: { modal: 'menu', op: 'practice-open' } }), release: () => queue.shift()(), snapshot: () => JSON.stringify([...values]) };
}

test('entry waits for the queue barrier and preserves every original storage byte', async () => {
  const h = harness(), before = h.snapshot(), opening = h.open('protect_ally');
  assert.equal(h.controller.current(), null); assert.equal(h.checks(), 0); assert.equal(h.controller.pending(), true);
  h.release(); assert.equal((await opening).status, 'opened'); assert.equal(h.checks(), 1);
  const token = h.controller.current().id;
  assert.equal(h.controller.act(token, 'defend'), true); assert.equal(h.controller.current().practice.status, 'completed');
  assert.equal(h.controller.act(token, 'attack', 'enemy-1'), false);
  assert.equal(h.controller.lesson(token, 'disrupt_charge'), true);
  assert.equal(h.controller.act(token, 'weapon_counter', 'enemy-2'), false, 'old session tokens do not authorize a newer lesson');
  const current = h.controller.current().id;
  assert.equal(h.controller.act(current, 'weapon_counter', 'enemy-2'), true);
  assert.ok(h.controller.close(current)); assert.equal(h.controller.current(), null);
  assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
});

test('cancel, disconnected trigger and exact life/slot/view changes cannot open a late practice dialog', async () => {
  const changes = [
    h => h.controller.cancelPending(), h => h.disconnect(), h => { h.position.life = structuredClone(h.position.life); },
    h => { h.position.life.hero.hp -= 1; }, h => { h.position.slot = 1; }, h => { h.position.screen = 'title'; },
    h => { h.position.tab = 'map'; }, h => { h.position.modal = null; }, h => { h.position.view = 'life:years'; },
  ];
  for (const change of changes) {
    const h = harness(), before = h.snapshot(), opening = h.open('protect_ally'); change(h); h.release();
    assert.equal((await opening).status, 'cancelled'); assert.equal(h.controller.current(), null); assert.equal(h.checks(), 0);
    assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
  }
});

test('a newer pending request replaces an older request without either writing storage', async () => {
  const h = harness(), before = h.snapshot(), first = h.open('protect_ally'), second = h.open('cleanse_wound');
  h.release(); assert.equal((await first).status, 'cancelled'); assert.equal(h.controller.current(), null);
  h.release(); assert.equal((await second).status, 'opened'); assert.equal(h.controller.current().practice.lessonId, 'cleanse_wound');
  assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
});

test('unsaved, inaccessible, stale and deleted original lives block entry rather than re-save or restore', async () => {
  for (const mode of ['pending', 'in-place-acknowledged', 'unavailable', 'changed', 'deleted']) {
    const h = harness();
    if (mode === 'pending') h.position.life = { ...h.position.life, day: 19 };
    if (mode === 'in-place-acknowledged') { h.store.write(0, h.position.life); h.position.life.hero.hp -= 1; h.writes.length = 0; }
    if (mode === 'unavailable') h.storage.getItem = () => { throw Error('Storage blocked'); };
    if (mode === 'changed' || mode === 'deleted') {
      const envelope = JSON.parse(h.values.get(KEY)); envelope.slots[0] = mode === 'deleted' ? { id: 0, state: null, revision: 'deleted' } : { ...envelope.slots[0], state: { ...h.position.life, day: 20 }, revision: 'newer' };
      h.values.set(KEY, JSON.stringify(envelope));
    }
    const before = h.snapshot(), opening = h.open('disrupt_charge'); h.release();
    assert.equal((await opening).status, 'blocked', mode); assert.equal(h.controller.current(), null);
    assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
  }
});

test('an earlier actual autosave can finish before the barrier without any practice writes afterward', async () => {
  const h = harness(); h.position.life = { ...h.position.life, day: 19 };
  const opening = h.open('disrupt_charge');
  assert.equal(h.store.write(0, h.position.life), true); h.writes.length = 0;
  const before = h.snapshot(); h.release(); assert.equal((await opening).status, 'opened');
  const token = h.controller.current().id; h.controller.act(token, 'weapon_counter', 'enemy-2'); h.controller.discard();
  assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
});

test('memory-only selection, retry, conflict discard and reload do not persist practice or alter the original life', async () => {
  const h = harness(), before = h.snapshot(), opening = h.open('cleanse_wound'); h.release(); await opening;
  let state = h.controller.current();
  assert.equal(h.controller.select('stale', 'party', 'practice-ally'), false);
  assert.equal(h.controller.select(state.id, 'enemy', 'practice-ally'), false);
  assert.equal(h.controller.select(state.id, 'party', 'practice-ally'), true);
  assert.equal(h.controller.act(state.id, 'tactic', 'practice-ally'), true);
  assert.equal(h.controller.current().practice.status, 'completed');
  assert.equal(h.controller.lesson(state.id, 'cleanse_wound'), true); state = h.controller.current();
  assert.equal(state.practice.acceptedActions, 0); assert.equal(state.selectedAlly, null);
  h.controller.discard();
  const reloaded = createSaveStore(h.storage);
  assert.deepEqual(reloaded.read(0), h.position.life); assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
});

test('title-only practice needs no life save but remains ephemeral', async () => {
  const h = harness(); h.position.life = null; h.position.screen = 'title'; h.position.modal = null;
  const before = h.snapshot(), opening = h.open('exploit_weakness'); h.release(); assert.equal((await opening).status, 'opened');
  h.controller.discard(); assert.equal(h.snapshot(), before); assert.deepEqual(h.writes, []);
});
