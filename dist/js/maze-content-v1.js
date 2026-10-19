import { DUNGEONS, generateDungeonDefinition } from './exploration.js';
import { RPG_DUNGEONS_V27 } from './rpg-depth-v27.js';
import { ENCOUNTER_DESIGN_V27 } from './encounter-design-v27.js';
import { seededRoll } from './world.js';

// Content version 1 is immutable. Later content or placement rules need a new
// generator version; an entered run must never acquire a different manifest.
// Geometry is supplied by the caller so maze-v31 can eventually import this
// module without a circular dependency. No existing run is upgraded here.
const clone = value => structuredClone(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max;
const integer = value => Number.isSafeInteger(value);
const blocking = room => ['fight', 'hazard', 'boss', 'guardian'].includes(room.kind);

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

function validGeometry(layout) {
  if (!object(layout) || layout.size !== 11 || !Array.isArray(layout.cells) || layout.cells.length !== 121
      || !integer(layout.goal) || !integer(layout.guardian) || layout.goal <= 0 || layout.goal >= 121
      || layout.guardian <= 0 || layout.guardian >= 121 || layout.goal === layout.guardian) return false;
  for (let id = 0; id < 121; id++) {
    const cell = layout.cells[id];
    if (!object(cell) || cell.id !== id || cell.x !== id % 11 || cell.y !== Math.floor(id / 11)
        || !Array.isArray(cell.doors) || new Set(cell.doors).size !== cell.doors.length) return false;
    for (const to of cell.doors) {
      const next = layout.cells[to];
      if (!integer(to) || !next || !Array.isArray(next.doors) || !next.doors.includes(id)
          || Math.abs(cell.x - next.x) + Math.abs(cell.y - next.y) !== 1) return false;
    }
  }
  return layout.cells[layout.goal].doors.length === 1
    && layout.cells[layout.goal].doors[0] === layout.guardian
    && reachable(layout, new Set()).size === 121;
}

function reachable(layout, excluded, start = 0) {
  if (excluded.has(start)) return new Set();
  const found = new Set([start]), queue = [start];
  for (let index = 0; index < queue.length; index++) {
    for (const to of layout.cells[queue[index]].doors) {
      if (!excluded.has(to) && !found.has(to)) { found.add(to); queue.push(to); }
    }
  }
  return found;
}

function distances(layout, start, excluded = new Set()) {
  const values = Array(121).fill(Infinity), queue = [start]; values[start] = 0;
  for (let index = 0; index < queue.length; index++) {
    for (const to of layout.cells[queue[index]].doors) {
      if (!excluded.has(to) && values[to] === Infinity) { values[to] = values[queue[index]] + 1; queue.push(to); }
    }
  }
  return values;
}

function rank(seed, slot, ids) {
  return ids.map(id => ({ id, roll: seededRoll(seed, 'maze-content-v1:' + slot + ':' + id, 1000000) }))
    .sort((a, b) => a.roll - b.roll || a.id - b.id).map(row => row.id);
}

function signatureDefinition(source) {
  const bosses = ENCOUNTER_DESIGN_V27.bosses.filter(boss => boss.regionId === source.regionId);
  if (bosses.length !== 2) return null;
  return {
    version: 27, id: source.id, title: source.title, regionId: source.regionId, signature: true,
    rooms: [
      { id: 'entry', kind: 'safe', title: 'The outside stair' },
      { id: 'crossing', kind: 'hazard', title: 'A broken crossing' },
      { id: 'ledger', kind: 'archive', title: 'The side ledger' },
      { id: 'stores', kind: 'treasure', title: 'The abandoned stores', loot: { ore: 2, cloth: 1, gold: 8 } },
      { id: 'guardian', kind: 'guardian', title: bosses[0].name, bossId: bosses[0].id, encounterId: 'rpg_guardian' },
      { id: 'last', kind: 'guardian', title: bosses[1].name, bossId: bosses[1].id, encounterId: 'rpg_guardian' },
      { id: 'goal', kind: 'objective', title: 'The last working room' },
    ],
    bosses: clone(bosses),
  };
}

function placeSlots(run, layout, definition, family) {
  const rooms = definition.rooms, final = rooms.find(room => room.id === (family === 'signature' ? 'last' : rooms.find(row => row.kind === 'boss')?.id));
  const goal = rooms.find(room => room.kind === 'objective');
  if (!final || !goal || rooms[0]?.id !== 'entry') return null;
  const placed = new Map([['entry', 0], [final.id, layout.guardian], [goal.id, layout.goal]]);
  const excluded = new Set([layout.guardian, layout.goal]);
  const guardDistance = distances(layout, layout.guardian, new Set([layout.goal]));
  const blockers = rooms.filter(room => blocking(room) && room.id !== final.id);
  // The first signature guardian is adjacent to the final guardian. Content
  // gating, not a new wall/door, accounts for a loop bypassing that first boss.
  if (family === 'signature') blockers.sort((a, b) => (a.id === 'guardian' ? -1 : b.id === 'guardian' ? 1 : 0));
  for (const room of blockers) {
    const before = reachable(layout, excluded), unplacedAfter = rooms.length - placed.size - 1;
    const distance = distances(layout, 0, excluded);
    let candidates = [...before].filter(id => id !== 0 && ![...placed.values()].includes(id));
    if (family === 'signature' && room.id === 'guardian') candidates = candidates.filter(id => layout.cells[layout.guardian].doors.includes(id));
    const tieOrder = new Map(rank(run.seed, room.id, candidates).map((id, index) => [id, index]));
    candidates.sort((a, b) => family === 'signature' && room.id === 'guardian'
      ? distance[a] - distance[b] || tieOrder.get(a) - tieOrder.get(b)
      : guardDistance[a] - guardDistance[b] || tieOrder.get(a) - tieOrder.get(b));
    const cell = candidates.find(id => reachable(layout, new Set([...excluded, id])).size - 1 >= unplacedAfter);
    if (cell === undefined) return null;
    placed.set(room.id, cell); excluded.add(cell);
  }
  // Non-blocking proof/aid rooms and regional ledgers/stores are reachable
  // before all anchored guards/hazards. A service-room hazard was itself
  // placed within that component and can be entered to perform its own aid.
  const available = [...reachable(layout, excluded)].filter(id => id !== 0);
  for (const room of rooms) {
    if (placed.has(room.id)) continue;
    const cell = rank(run.seed, room.id, available.filter(id => ![...placed.values()].includes(id)))[0];
    if (cell === undefined) return null;
    placed.set(room.id, cell);
  }
  return rooms.map(room => ({ slotId: room.id, cellId: placed.get(room.id) }));
}

/** Pure opt-in contract for future new runs. Version 1 runs always return null. */
export function generateMazeContentManifest(run, worldSeed, layout) {
  if (!object(run) || run.version !== 2 || !text(run.id, 160) || !text(run.seed, 400)
      || !text(worldSeed, 128) || !text(run.sourceId, 100) || !text(run.locationId, 100)) return null;
  let family, definition;
  if (run.kind === 'authored') {
    const source = DUNGEONS.find(row => row.id === run.sourceId && row.locationId === run.locationId);
    if (!source) return null;
    family = 'authored'; definition = generateDungeonDefinition(worldSeed, source.id);
  } else if (run.kind === 'regional') {
    const source = RPG_DUNGEONS_V27.find(row => row.id === run.sourceId && row.signature && row.regionId === run.regionId);
    if (!source) return null;
    family = 'signature'; definition = signatureDefinition(source);
  } else return null;
  if (!definition || !validGeometry(layout)) return null;
  const anchors = placeSlots(run, layout, definition, family);
  if (!anchors) return null;
  const guardians = definition.rooms.filter(room => family === 'signature' ? room.kind === 'guardian' : room.kind === 'boss');
  return {
    version: 1, runId: run.id, runSeed: run.seed, worldSeed, family,
    sourceId: run.sourceId, locationId: run.locationId,
    ...(family === 'signature' ? { regionId: run.regionId } : {}),
    definition: clone(definition), anchors,
    requiredGuardians: guardians.map(room => ({ slotId: room.id, encounterId: room.encounterId, ...(room.bossId ? { bossId: room.bossId } : {}) })),
    goalSlotId: definition.rooms.find(room => room.kind === 'objective').id,
    peacefulSlots: definition.rooms.filter(room => room.optional || family === 'signature' && ['entry', 'ledger', 'stores'].includes(room.id)).map(room => room.id),
    blockingSlots: definition.rooms.filter(blocking).map(room => room.id),
  };
}

/** Canonical equality rejects altered placement, source story, encounters or loot. */
export function validateMazeContentManifest(value, run, worldSeed, layout) {
  if (!object(value)) return false;
  const expected = generateMazeContentManifest(run, worldSeed, layout);
  if (!expected) return false;
  try { return stable(value) === stable(expected); } catch { return false; }
}

/** Internal descriptor only. Callers must apply discovery rules before UI use. */
export function mazeManifestRoom(manifest, cell) {
  const anchor = manifest?.anchors?.find(row => row.cellId === cell.id);
  if (!anchor) return clone(cell);
  const source = manifest.definition.rooms.find(room => room.id === anchor.slotId);
  const kinds = { safe: 'entrance', fight: 'enemy', boss: 'guardian', guardian: 'guardian', hazard: 'trap', treasure: 'cache', objective: 'objective', archive: 'inscription', witness: 'witness', dilemma: 'dilemma' };
  // Do not spread source.exits, coordinates, or old neighbors onto geometry.
  return {
    ...clone(cell), kind: kinds[source.kind], contentSlot: source.id,
    sourceKind: source.kind, title: source.title,
    ...(source.description ? { description: source.description } : {}),
    ...(source.encounterId ? { encounterId: source.encounterId } : {}),
    ...(source.bossId ? { bossId: source.bossId } : {}),
    ...(source.optional ? { optional: true } : {}),
    ...(source.loot ? { loot: clone(source.loot) } : {}),
  };
}
