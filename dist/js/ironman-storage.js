// Strict, detached storage codecs. No storage, engine, DOM or lock side effects.
import { isIronman, validateIronman, ironmanCombatStopped } from './ironman.js';

export const IRONMAN_RECORD_PREFIX = 'hearth-and-oath:ironman-run:v1:';
export const IRONMAN_ENDED_PREFIX = 'hearth-and-oath:ironman-ended:v1:';
const own = (value, key) => Boolean(value && Object.hasOwn(value, key));
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const keys = (value, names) => object(value) && Object.keys(value).length === names.length && names.every(key => own(value, key));
const integer = (value, low = 0, high = 10000000) => Number.isSafeInteger(value) && value >= low && value <= high;
const text = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max;
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const validIronmanRunId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export const ironmanRecordKey = runId => validIronmanRunId(runId) ? IRONMAN_RECORD_PREFIX + runId : null;
export const ironmanEndedKey = runId => validIronmanRunId(runId) ? IRONMAN_ENDED_PREFIX + runId : null;
export const isIronmanStorageKey = key => key === null || typeof key === 'string' && (key.startsWith(IRONMAN_RECORD_PREFIX) || key.startsWith(IRONMAN_ENDED_PREFIX));

function floorShape(floor, startedDay) {
  return Array.isArray(floor) && floor.length <= 1200 && new Set(floor.map(row => row?.personId)).size === floor.length
    && floor.every(row => keys(row, ['personId', 'day', 'battleId', 'generation']) && text(row.personId, 160)
      && integer(row.day, startedDay) && text(row.battleId) && integer(row.generation, 1, 200)
      && new RegExp(`^.+-g${row.generation}-companion-(mira|orrin|kest|sable|tovin|vesper)$`).test(row.personId));
}

export function decodeIronmanRecord(source, runId, validate) {
  try {
    const record = typeof source === 'string' ? JSON.parse(source) : clone(source);
    if (!validIronmanRunId(runId) || !keys(record, ['version', 'runId', 'startedDay', 'revision', 'updatedAt', 'state', 'casualties', 'attachment'])
        || record.version !== 1 || record.runId !== runId || !validIronmanRunId(record.revision)
        || !integer(record.startedDay) || !text(record.updatedAt, 64) || !Number.isFinite(Date.parse(record.updatedAt))
        || !floorShape(record.casualties, record.startedDay)) return null;
    const binding = record.attachment;
    if (binding !== null && (!keys(binding, ['slotId', 'nonce', 'baseToken']) || !integer(binding.slotId, 0, 2)
        || !validIronmanRunId(binding.nonce) || !text(binding.baseToken, 16777216))) return null;
    if (record.state === null) return binding === null ? record : null;
    const state = typeof validate === 'function' ? validate(clone(record.state)) : null;
    if (!state || !isIronman(state) || !validateIronman(state) || ironmanCombatStopped(state.battle)
        || state.ironman.runId !== runId || state.ironman.startedDay !== record.startedDay
        || !same(state.ironman.casualties, record.casualties)) return null;
    // Never silently migrate a stored authority into a different position.
    if (!same(state, record.state)) return null;
    return record;
  } catch { return null; }
}

export function decodeIronmanEnded(source, runId) {
  try {
    const marker = typeof source === 'string' ? JSON.parse(source) : clone(source);
    return keys(marker, ['version', 'runId', 'personId', 'day', 'battleId']) && marker.version === 1
      && validIronmanRunId(runId) && marker.runId === runId && text(marker.personId, 160)
      && integer(marker.day) && text(marker.battleId) ? marker : null;
  } catch { return null; }
}

export function ironmanRecordToken(record) {
  return JSON.stringify({ kind: 'ironman-head', runId: record.runId, revision: record.revision,
    attachment: record.attachment });
}

/** Inspect raw Standard data, not its migrated display/cache. A malformed
 * nonempty position can never become an empty Ironman attachment target. */
export function rawIronmanBase(rawText, legacyText, slotId, validate) {
  if (!integer(slotId, 0, 2)) return { ok: false, reason: 'invalid-slot' };
  if (sharedIronmanClaim(rawText, legacyText)) return { ok: false, reason: 'unsupported-shared-mortality' };
  try {
    const raw = JSON.parse(rawText ?? 'null');
    let slot, backup = null;
    const empty = () => ({ id: slotId, state: null, updatedAt: null });
    if (raw === null && (rawText === null || rawText === 'null')) {
      const legacy = JSON.parse(legacyText ?? 'null');
      if (legacy !== null && (!object(legacy) || isIronman(legacy) || !validate?.(clone(legacy)))) return { ok: false, reason: 'unreadable-underlying' };
      slot = slotId === 0 && legacy !== null ? { id: 0, state: legacy, updatedAt: null } : empty();
    } else {
      if (!object(raw) || raw.version !== 1 || !Array.isArray(raw.slots) || raw.slots.length > 3
          || new Set(raw.slots.map(row => row?.id)).size !== raw.slots.length
          || !raw.slots.every(row => object(row) && integer(row.id, 0, 2) && own(row, 'state'))
          || raw.backups !== undefined && (!object(raw.backups) || Object.keys(raw.backups).some(id => !['0', '1', '2'].includes(id)))) return { ok: false, reason: 'unreadable-underlying' };
      slot = raw.slots.find(row => row.id === slotId) || empty();
      backup = raw.backups?.[slotId] ?? null;
      if (backup !== null && (!object(backup) || !own(backup, 'state'))) return { ok: false, reason: 'unreadable-underlying' };
    }
    return { ok: true, empty: slot.state === null, slot: clone(slot), backup: clone(backup),
      token: JSON.stringify({ slot, backup }) };
  } catch { return { ok: false, reason: 'unreadable-underlying' }; }
}

/** Old/unrecognized explicit mortality in shared data must not be destructively
 * rewritten by an ordinary Standard fallback. New code never writes it here. */
export function sharedIronmanClaim(rawText, legacyText) {
  try {
    const raw = JSON.parse(rawText ?? 'null');
    if (own(raw, 'ironmanRuns') || raw?.slots?.some?.(slot => isIronman(slot?.state))
        || Object.values(raw?.backups || {}).some(backup => isIronman(backup?.state))) return true;
  } catch {}
  try { return isIronman(JSON.parse(legacyText ?? 'null')); } catch { return false; }
}

/** Report unexpected full same-run copies without destructively repairing
 * shared data. Null means their absence could not be confirmed. */
export function sharedIronmanCopies(rawText, legacyText, runId) {
  try {
    const raw = JSON.parse(rawText ?? 'null'), legacy = JSON.parse(legacyText ?? 'null');
    const matches = state => isIronman(state) && state.ironman?.runId === runId;
    return Boolean(matches(legacy) || raw?.slots?.some?.(slot => matches(slot?.state))
      || Object.values(raw?.backups || {}).some(backup => matches(backup?.state)));
  } catch { return null; }
}

export function emptyIronmanToken(slotId, baseToken) {
  return JSON.stringify({ kind: 'ironman-empty-slot', slotId, baseToken });
}

export function reattachIronmanToken(record, slotId, baseToken) {
  return JSON.stringify({ kind: 'ironman-reattach', headToken: ironmanRecordToken(record), slotId, baseToken });
}
