import { expeditionRunIdentity, expeditionEntrySnapshot } from '../dist/js/maze-receipts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DUNGEONS, generateDungeonDefinition } from '../dist/js/exploration.js';
import { RPG_DUNGEONS_V27 } from '../dist/js/rpg-depth-v27.js';
import { ENCOUNTER_DESIGN_V27 } from '../dist/js/encounter-design-v27.js';
import { mazeLayout, enterMaze, validateMazes } from '../dist/js/maze-v31.js';
import { generateMazeContentManifest, validateMazeContentManifest, mazeManifestRoom } from '../dist/js/maze-content-v1.js';

const frozen = JSON.parse(readFileSync(new URL('./fixtures/maze-identity/v047-compatibility.json', import.meta.url)));
const manifestGoldens = JSON.parse(readFileSync(new URL('./fixtures/maze-identity/v1-manifest-signatures.json', import.meta.url)));
const signatures = RPG_DUNGEONS_V27.filter(source => source.signature);
const clone = value => structuredClone(value);
const stable = value => Array.isArray(value) ? '[' + value.map(stable).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}' : JSON.stringify(value);
function runFor(source, n = 0) {
  const kind = source.signature ? 'regional' : 'authored', locationId = source.locationId || 'canonical-' + source.regionId;
  return { version: 2, id: 'maze-' + (n + 1), kind, sourceId: source.id, locationId,
    ...(source.signature ? { regionId: source.regionId } : {}),
    seed: 'maze-content-narrow:' + source.id + ':' + n };
}
function reach(layout, excluded) {
  const queue = [0], seen = new Set(queue);
  for (let at = 0; at < queue.length; at++) for (const to of layout.cells[queue[at]].doors) {
    if (!excluded.has(to) && !seen.has(to)) { seen.add(to); queue.push(to); }
  }
  return seen;
}
function prepared(source, n = 0, worldSeed = frozen.seed) {
  const run = runFor(source, n), layout = mazeLayout(run);
  return { run, layout, worldSeed, manifest: generateMazeContentManifest(run, worldSeed, layout) };
}

test('version 0.47 geometry and authored snapshot goldens remain exact', () => {
  for (const item of frozen.layouts) assert.deepEqual(mazeLayout({ seed: item.seed }), item.layout);
  assert.deepEqual(DUNGEONS, frozen.legacyDefinitions);
  assert.deepEqual(DUNGEONS.map(source => generateDungeonDefinition(frozen.seed, source.id)), frozen.authoredDefinitions);
});

test('the new content version 1 contract has fixed golden signatures for all eleven sources', () => {
  for (const { run, sha256 } of manifestGoldens.rows) {
    const manifest = generateMazeContentManifest(run, manifestGoldens.worldSeed, mazeLayout(run));
    assert.ok(manifest);
    assert.equal(createHash('sha256').update(stable(manifest)).digest('hex'), sha256, run.sourceId + ': bump content version instead of changing an entered manifest');
  }
});

test('an existing version 1 record resumes without acquiring a new manifest', () => {
  const state = clone(frozen.activeState), original = clone(state.maze);
  state.mazeBook.records.push({...clone(original),status:'unfinished',endedDay:state.day});state.maze=null;
  const beforeAdmission=clone(state),expected=clone(state);
  expected.day++;expected.maze=clone(original);expected.mazeBook.nextExpeditionVisit=2;expected.mazeBook.expeditionReceipts=[];
  expected.maze.expeditionVisit={version:1,id:'maze-visit-1',identity:expeditionRunIdentity(original),actorId:state.dynasty?.activePersonId||'hero',actorGeneration:state.dynasty?.generation||1,actorName:state.hero.name||null,coverage:'entry',start:expeditionEntrySnapshot(beforeAdmission,original),days:{entry:1,inside:0,recovery:0},used:{walkFocus:0,potions:0,rations:0,kitNights:0},fees:{passage:0,work:0,recovery:0},retreats:0,settlements:[],settlementsIncomplete:false};
  assert.equal(enterMaze(state, 'cistern', 'well', { spendDays(days) { state.day += days; return days; } }), true);
  assert.deepEqual(state,expected,'one deliberate admission adds exactly its finite visit ledger and one day; every legacy field, notice, reward and geometric cell is unchanged');
  assert.equal(state.day, frozen.activeState.day + 1);
  assert.equal(validateMazes(state), true);
  assert.equal(state.maze.content, undefined);
  assert.equal(generateMazeContentManifest(state.maze, state.seed, mazeLayout(state.maze)), null);
});

test('old active, unfinished, completed and pending maze states are not mutated by content lookup', () => {
  const variants = [clone(frozen.activeState)];
  const unfinished = clone(frozen.activeState);
  unfinished.mazeBook.records.push({ ...clone(unfinished.maze), status: 'unfinished', endedDay: unfinished.day });
  unfinished.maze = null; variants.push(unfinished);
  const complete = clone(unfinished), record = complete.mazeBook.records[0], layout = mazeLayout(record);
  const queue = [[0]], seen = new Set([0]); let path;
  for (let at = 0; at < queue.length; at++) {
    if (queue[at].at(-1) === layout.goal) { path = queue[at]; break; }
    for (const to of layout.cells[queue[at].at(-1)].doors) if (!seen.has(to)) { seen.add(to); queue.push([...queue[at], to]); }
  }
  record.position = layout.goal; record.previous = layout.guardian; record.visited = path; record.cleared = [...path]; record.objective = true; record.status = 'complete'; variants.push(complete);
  const pending = clone(frozen.activeState);
  pending.maze.position = layout.guardian; pending.maze.previous = path.at(-3); pending.maze.visited = path.slice(0, -1);
  pending.maze.pendingRoom = layout.guardian;
  pending.battle = { context: { kind: 'maze', mazeId: pending.maze.id, roomId: String(layout.guardian), locationId: pending.locationId } }; variants.push(pending);
  for (const state of variants) {
    const before = clone(state), run = state.maze || state.mazeBook.records[0];
    assert.equal(validateMazes(state), true);
    assert.equal(generateMazeContentManifest(run, state.seed, mazeLayout(run)), null);
    assert.deepEqual(state, before);
  }
});

test('all five authored and six signature sources produce deterministic isolated manifests', () => {
  for (const source of [...DUNGEONS, ...signatures]) {
    const { run, layout, worldSeed, manifest } = prepared(source), before = clone({ run, layout });
    assert.ok(manifest, source.id);
    assert.equal(manifest.version, 1); assert.equal(manifest.sourceId, source.id);
    assert.equal(manifest.family, source.signature ? 'signature' : 'authored');
    assert.deepEqual(manifest, generateMazeContentManifest(run, worldSeed, layout));
    assert.equal(validateMazeContentManifest(manifest, run, worldSeed, layout), true);
    assert.deepEqual({ run, layout }, before);
    assert.equal(manifest.anchors.length, source.signature ? 7 : 8);
    assert.equal(new Set(manifest.anchors.map(row => row.cellId)).size, manifest.anchors.length);
    assert.ok(manifest.anchors.every(row => row.cellId >= 0 && row.cellId < 121));
    assert.equal(manifest.anchors.find(row => row.slotId === 'entry').cellId, 0);
    assert.equal(manifest.anchors.find(row => row.slotId === manifest.goalSlotId).cellId, layout.goal);
    assert.equal(manifest.anchors.find(row => row.slotId === manifest.requiredGuardians.at(-1).slotId).cellId, layout.guardian);
  }
});

test('all optional proof and regional lead rooms are reachable before every anchored blocker', () => {
  for (const source of [...DUNGEONS, ...signatures]) {
    const { layout, manifest } = prepared(source);
    const excluded = new Set(manifest.anchors.filter(row => manifest.blockingSlots.includes(row.slotId) || row.slotId === manifest.goalSlotId).map(row => row.cellId));
    assert.ok(manifest.peacefulSlots.length >= 2);
    for (const slotId of manifest.peacefulSlots) {
      const cellId = manifest.anchors.find(row => row.slotId === slotId).cellId;
      // The optional service room is itself a hazard; entering it is how the
      // player performs that room's aid. No other blocker may be required.
      const priorBlockers = new Set(excluded); priorBlockers.delete(cellId);
      assert.ok(reach(layout, priorBlockers).has(cellId), source.id + ':' + slotId);
    }
    if (source.signature) {
      const first = manifest.anchors.find(row => row.slotId === 'guardian').cellId;
      assert.ok(layout.cells[layout.guardian].doors.includes(first), 'paired guardians stay adjacent');
    }
  }
});

test('authored manifests retain the complete canonical definition rather than generic substitutes', () => {
  const expected = { cistern: 'cistern_keeper', buried_archive: 'archive_warden', root_caverns: 'thornheart', watchtower: 'tower_captain', covenant_core: 'core_warden' };
  for (const source of DUNGEONS) {
    const { manifest } = prepared(source);
    assert.deepEqual(manifest.definition, generateDungeonDefinition(frozen.seed, source.id));
    assert.equal(manifest.requiredGuardians.length, 1);
    assert.equal(manifest.requiredGuardians[0].encounterId, expected[source.id]);
    for (const room of source.rooms) assert.equal(manifest.definition.rooms.find(row => row.id === room.id).encounterId, room.encounterId);
    assert.equal(manifest.definition.rooms.filter(room => room.optional).length, 2);
  }
});

test('six signatures preserve both exact regional guardians and all thirty-six approaches', () => {
  const ids = new Set(), approaches = new Set();
  for (const source of signatures) {
    const { manifest } = prepared(source), expected = ENCOUNTER_DESIGN_V27.bosses.filter(boss => boss.regionId === source.regionId);
    assert.deepEqual(manifest.definition.bosses, expected);
    assert.deepEqual(manifest.requiredGuardians.map(row => row.bossId), expected.map(boss => boss.id));
    for (const boss of manifest.definition.bosses) { ids.add(boss.id); for (const choice of boss.noncombatApproaches) approaches.add(choice.id); }
    assert.ok(manifest.requiredGuardians.every(row => row.encounterId === 'rpg_guardian'));
  }
  assert.equal(ids.size, 12); assert.equal(approaches.size, 36);
});

test('effective descriptors overlay content without changing a single door or source exit', () => {
  for (const source of [...DUNGEONS, ...signatures]) {
    const { layout, manifest } = prepared(source), before = clone({ layout, manifest });
    for (const cell of layout.cells) {
      const room = mazeManifestRoom(manifest, cell), anchor = manifest.anchors.find(row => row.cellId === cell.id);
      assert.deepEqual(room.doors, cell.doors); assert.equal(room.x, cell.x); assert.equal(room.y, cell.y); assert.equal(room.id, cell.id);
      assert.equal(room.exits, undefined); assert.equal(room.neighbors, undefined);
      if (anchor) { assert.equal(typeof room.kind, 'string'); assert.ok(room.kind.length > 0); assert.equal(room.contentSlot, anchor.slotId); assert.equal(room.title, manifest.definition.rooms.find(row => row.id === anchor.slotId).title); }
      else assert.deepEqual(room, cell);
      room.doors.push(-1);
    }
    assert.deepEqual({ layout, manifest }, before);
  }
});

test('manifest validation rejects altered story, loot, proof slots, guardians and source bindings', () => {
  for (const source of [DUNGEONS[0], signatures[0]]) {
    const { run, layout, worldSeed, manifest } = prepared(source);
    for (const change of [
      value => { value.runId = 'maze-other'; }, value => { value.runSeed += '-other'; },
      value => { value.worldSeed += '-other'; }, value => { value.sourceId = 'unknown'; },
      value => { value.locationId = 'other'; }, value => { value.anchors[1].cellId = value.anchors[2].cellId; },
      value => { value.requiredGuardians[0].encounterId = 'forest'; },
      value => { value.definition.rooms.find(room => room.loot).loot.gold++; },
      value => { value.definition.rooms[0].title = 'Changed'; },
      value => { value.peacefulSlots = []; }, value => { value.extra = true; },
    ]) { const bad = clone(manifest); change(bad); assert.equal(validateMazeContentManifest(bad, run, worldSeed, layout), false); }
  }
});

test('wrong regions, locations, unsupported runs and malformed geometry cannot obtain a manifest', () => {
  const { run, layout } = prepared(signatures[0]);
  for (const bad of [{ ...run, version: 1 }, { ...run, regionId: 'wrong' }, { ...run, kind: 'contract' }, { ...run, kind: 'radiant' }, { ...run, sourceId: 'modular_0' }]) assert.equal(generateMazeContentManifest(bad, frozen.seed, layout), null);
  const authored = runFor(DUNGEONS[0]); authored.locationId = 'tower';
  assert.equal(generateMazeContentManifest(authored, frozen.seed, layout), null);
  for (const change of [value => { value.cells[0].doors.push(120); }, value => { value.cells[0].x++; }, value => { value.cells[value.goal].doors.push(0); }, value => { value.guardian = value.goal; }]) {
    const bad = clone(layout); change(bad); assert.equal(generateMazeContentManifest(run, frozen.seed, bad), null);
  }
});

test('manifests and descriptors own their nested data and survive JSON roundtrip', () => {
  for (const source of [DUNGEONS[0], signatures[0]]) {
    const { run, layout, worldSeed, manifest } = prepared(source), before = clone(manifest);
    const cache = manifest.anchors.find(row => manifest.definition.rooms.find(room => room.id === row.slotId)?.loot);
    const descriptor = mazeManifestRoom(manifest, layout.cells[cache.cellId]); descriptor.loot.gold++;
    const roundtrip = JSON.parse(JSON.stringify(manifest));
    assert.equal(validateMazeContentManifest(roundtrip, run, worldSeed, layout), true);
    const other = generateMazeContentManifest(run, worldSeed, layout); other.definition.rooms[0].title = 'Elsewhere';
    assert.deepEqual(manifest, before);
  }
});
