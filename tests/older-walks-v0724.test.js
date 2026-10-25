import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as E from '../dist/js/engine.js';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { syncCartography } from '../dist/js/cartography.js';
import { DUNGEONS } from '../dist/js/exploration.js';
import { heldOlderWalk, assertOlderWalkClosed } from './helpers/one-rulebook.mjs';

// The older expedition engines left in v0.72.4: the room engine (`dungeon`), the descent's rooms
// (`adventuring.expedition`) and the v0.27 regional rooms (`rpg.expedition`). Only three genuine captures
// were saved in the middle of one, and all three live by the old rules; the main game never reads them into
// play (its store keeps them for the archive). The engine still reads any life: one read mid-walk leaves the
// walk where it stood.
const legacy = version => JSON.parse(readFileSync(new URL(`./fixtures/legacy-v${version}.json`, import.meta.url), 'utf8')).states;
const descent = () => JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/v27-road-and-descent.json.gz', import.meta.url)))).descent;
const same = (a, b, keys) => { for (const key of keys) assert.equal(JSON.stringify(b[key]), JSON.stringify(a[key]), key); };

test('a capture read in the middle of the older room engine leaves it where it stands; its fight ends unpaid', () => {
  const original = legacy(3).midbattle, held = structuredClone(original);
  assert.ok(heldOlderWalk(original)); assert.equal(original.battle.context.kind, 'dungeon');
  assert.equal(E.validateSave(original), false, 'a walk in the room engine is not a save this build holds as it stands');
  const read = E.migrateSave(original);
  assert.ok(read && E.validateSave(read));
  assert.equal(JSON.stringify(original), JSON.stringify(held), 'reading never changes the file');
  assertOlderWalkClosed(assert, original, read);
  assert.equal(read.hero.gold, original.hero.gold, 'nothing is paid for the fight that ended');
  assert.equal(read.day, original.day, 'no day passes');
  assert.deepEqual(read.flags.dungeonRecords[original.dungeon.id].cleared, original.dungeon.cleared);
});

test('a completed room-engine walk read with its last scene open keeps its record and closes the scene', () => {
  const original = legacy(4).completedDungeon;
  assert.ok(heldOlderWalk(original)); assert.match(original.event.id, /^dungeon_/);
  const read = E.migrateSave(original);
  assert.ok(read && E.validateSave(read));
  assertOlderWalkClosed(assert, original, read);
  assert.equal(read.flags.dungeonRecords[original.dungeon.id].complete, original.dungeon.complete);
  same(original, read, ['day', 'locationId']);
});

test('a descent read in the middle of its rooms is recorded as walked, with no reward and no ration back', () => {
  const original = descent(), run = original.adventuring.expedition;
  assert.ok(heldOlderWalk(original)); assert.equal(original.event.id, 'adventure_room');
  const read = E.migrateSave(original);
  assert.ok(read && E.validateSave(read));
  assertOlderWalkClosed(assert, original, read);
  const row = read.adventuring.history.at(-1);
  assert.deepEqual(row, { id: run.id, locationId: run.locationId, startDay: run.startDay, endDay: original.day, floor: run.floor, rooms: run.cleared.length });
  assert.equal(read.adventuring.rations, original.adventuring.rations);
  assert.equal(read.hero.gold, original.hero.gold);
  assert.equal(JSON.stringify(E.migrateSave(structuredClone(read))), JSON.stringify(read), 'reading again changes nothing');
});

test('no save a release wrote for the new rules holds an older walk, and none can be written into one', () => {
  let lives = 0;
  for (const file of readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(f => f.endsWith('.json.gz') && f !== 'v0600.json.gz')) {
    const value = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/saves/' + file, import.meta.url))));
    for (const life of Object.values(value.states)) if (life?.hero) { lives += 1; assert.equal(heldOlderWalk(life), false, file); }
  }
  assert.ok(lives >= 8, 'the release saves of v0.61, v0.62, v0.66 and v0.69 were read');
  const life = E.migrateSave(descent());
  for (const forge of [s => { s.dungeon = { id: 'cistern', roomId: 'entry', visited: ['entry'], cleared: [], facts: {}, pendingRoom: null, complete: false }; },
    s => { s.adventuring.expedition = { id: 'run-1-1', locationId: s.locationId, startDay: s.day, theme: 'roots', floor: 1, room: 0, cleared: [], pendingBattle: false, pendingKind: null }; },
    s => { s.rpg.expedition = { id: 'modular_1', version: 2, rooms: [] }; }]) {
    const forged = structuredClone(life); forge(forged);
    assert.equal(E.validateSave(forged), false);
  }
});

test('the doors open delves and mazes only: nothing begins in an older engine', async () => {
  let s = await createLifeAtAge({ seed: 'older-walks-doors', startAge: 18, difficulty: 'gentle' });
  for (let n = 0; s.event && n < 40; n++) s = E.chooseEventOption(s, (s.event.choices.find(c => ['continue', 'care', 'keep', 'later', 'leave', 'endure', 'plead'].includes(c.id) && !c.disabledReason) || s.event.choices.find(c => !c.disabledReason)).id);
  const cistern = DUNGEONS.find(d => d.id === 'cistern');
  s.locationId = cistern.locationId; s.cartography.pending = null; s.cartography.offsite = false; s.cartography.interior = null; syncCartography(s);
  s.hero.hp = s.hero.maxHp; s.hero.gold = 100; s.adventuring.rations = 5;
  const inside = E.chooseAction(s, 'explore_enter_cistern');
  assert.ok(inside.delve, 'the campaign dungeon is a delve'); assert.equal(inside.dungeon, null);
  const below = E.chooseAction(s, 'adventure_descend');
  assert.ok(below.delve, 'the board’s descent is a delve'); assert.ok(!below.adventuring.expedition);
  const without = structuredClone(s); delete without.delves;
  const refused = E.chooseAction(without, 'explore_enter_cistern');
  assert.equal(refused.dungeon, null); assert.ok(!refused.maze); assert.equal(refused.day, without.day, 'no older engine opens in the delve’s place');
});
