// Pure-only seed sweep. Run in an agreed verification lane; no engine lives,
// application edits, offline build or publication are performed.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { DUNGEONS } from '../dist/js/exploration.js';
import { RPG_DUNGEONS_V27 } from '../dist/js/rpg-depth-v27.js';
import { mazeLayout } from '../dist/js/maze-v31.js';
import { generateMazeContentManifest, validateMazeContentManifest, mazeManifestRoom } from '../dist/js/maze-content-v1.js';

const args = process.argv.slice(2);
let seeds = 100, output = null;
for (let at = 0; at < args.length; at++) {
  if (args[at] === '--seeds') seeds = Number(args[++at]);
  else if (args[at] === '--output') output = args[++at];
  else throw new Error('Usage: node scripts/check-maze-content-manifest.mjs [--seeds 100] [--output report.json]');
}
assert.ok(Number.isSafeInteger(seeds) && seeds >= 1 && seeds <= 10000, '--seeds must be 1–10000');
assert.ok(output === null || typeof output === 'string' && output.length > 0, '--output needs a path');

const started = performance.now(), sources = [...DUNGEONS, ...RPG_DUNGEONS_V27.filter(source => source.signature)];
const report = { schemaVersion: 1, baselineCommit: '19591036c8fbe32e08aaf08b9d5d05d60119b8a0', seeds, manifests: 0, sources: {}, passed: false };
function reach(layout, excluded) {
  const queue = [0], seen = new Set(queue);
  for (let at = 0; at < queue.length; at++) for (const to of layout.cells[queue[at]].doors) {
    if (!excluded.has(to) && !seen.has(to)) { seen.add(to); queue.push(to); }
  }
  return seen;
}
for (const source of sources) {
  const layouts = new Set(), objectives = new Set(), motives = new Set();
  for (let n = 0; n < seeds; n++) {
    const worldSeed = 'maze-identity-sweep-' + n, kind = source.signature ? 'regional' : 'authored';
    const locationId = source.locationId || 'canonical-' + source.regionId;
    const run = { version: 2, id: 'maze-' + (n + 1), kind, sourceId: source.id, locationId,
      ...(source.signature ? { regionId: source.regionId } : {}),
      seed: `${worldSeed}:maze:1:${kind}:${source.id}:${locationId}:${n + 1}` };
    const layout = mazeLayout(run), before = JSON.stringify(layout), manifest = generateMazeContentManifest(run, worldSeed, layout);
    const context = source.id + ' seed ' + n;
    assert.ok(manifest, context + ': generation');
    assert.equal(validateMazeContentManifest(manifest, run, worldSeed, layout), true, context + ': validation');
    assert.equal(JSON.stringify(layout), before, context + ': geometry mutation');
    assert.equal(manifest.anchors.length, source.signature ? 7 : 8, context + ': slot count');
    assert.equal(new Set(manifest.anchors.map(row => row.cellId)).size, manifest.anchors.length, context + ': duplicate anchor');
    for (const anchor of manifest.anchors) {
      const room = mazeManifestRoom(manifest, layout.cells[anchor.cellId]);
      assert.equal(typeof room.kind, 'string', context + ': unmapped source kind ' + anchor.slotId);
      assert.ok(room.kind.length > 0, context + ': empty effective kind ' + anchor.slotId);
    }
    const excluded = new Set(manifest.anchors.filter(row => manifest.blockingSlots.includes(row.slotId) || row.slotId === manifest.goalSlotId).map(row => row.cellId));
    for (const slotId of manifest.peacefulSlots) {
      const cellId = manifest.anchors.find(row => row.slotId === slotId).cellId, blockers = new Set(excluded); blockers.delete(cellId);
      assert.ok(reach(layout, blockers).has(cellId), context + ': inaccessible peaceful slot ' + slotId);
    }
    if (source.signature) {
      const first = manifest.anchors.find(row => row.slotId === 'guardian').cellId;
      assert.ok(layout.cells[layout.guardian].doors.includes(first), context + ': guardian pair separated');
    } else {
      layouts.add(manifest.definition.layout); objectives.add(manifest.definition.objective.id); motives.add(manifest.definition.motive.id);
    }
    report.manifests++;
  }
  report.sources[source.id] = { manifests: seeds,
    ...(!source.signature ? { layouts: [...layouts].sort(), objectives: [...objectives].sort(), motives: [...motives].sort() } : {}) };
}
report.passed = true; report.elapsedMs = Math.round(performance.now() - started);
report.peakRssKiB = process.resourceUsage().maxRSS;
if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
