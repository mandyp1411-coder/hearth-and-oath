import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS, generateDungeonDefinition } from '../dist/js/exploration.js';

// The older room engine left in v0.72.4. The seeded definitions stay: a begun authored maze reads its own
// (maze-content-v1.js), and these checks hold the generator to its contract.
test('five seeded expedition definitions vary objective, motive and connected routes while retaining all critical encounters', () => {
  for (const base of DUNGEONS) {
    const variants = new Set(), objectives = new Set(), motives = new Set(), layouts = new Set();
    for (let n = 0; n < 100; n++) {
      const definition = generateDungeonDefinition(`routes-${n}`, base.id);
      assert.deepEqual(definition, generateDungeonDefinition(`routes-${n}`, base.id));
      assert.equal(definition.rooms.length, 8);
      for (const here of base.rooms) assert.equal(definition.rooms.find(r => r.id === here.id).encounterId, here.encounterId);
      const queue = ['entry'], reached = new Set();
      while (queue.length) { const id = queue.shift(); if (reached.has(id)) continue; reached.add(id); const here = definition.rooms.find(r => r.id === id); assert.ok(here); for (const next of here.exits) { assert.ok(definition.rooms.find(r => r.id === next).exits.includes(id), 'two-way exits'); queue.push(next); } }
      assert.equal(reached.size, definition.rooms.length);
      const boss = definition.rooms.find(r => r.kind === 'boss'), goal = definition.rooms.find(r => r.kind === 'objective');
      assert.deepEqual(goal.exits, [boss.id], 'no alternate route skips the mandatory last guardian');
      variants.add(`${definition.layout}:${definition.objective.id}:${definition.motive.id}`); objectives.add(definition.objective.id); motives.add(definition.motive.id); layouts.add(definition.layout);
    }
    assert.ok(variants.size >= 20); assert.equal(objectives.size, 3); assert.equal(motives.size, 3); assert.equal(layouts.size, 3);
  }
});
