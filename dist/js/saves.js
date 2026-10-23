import { isIronman, validateIronman, validateCasualtyFloor, ironmanHeroDeath, ironmanCombatStopped, sameBattleMortalityPolicy } from './ironman.js';
import { IRONMAN_RECORD_PREFIX, IRONMAN_ENDED_PREFIX, validIronmanRunId, ironmanRecordKey, ironmanEndedKey, decodeIronmanRecord,
  decodeIronmanEnded, ironmanRecordToken, rawIronmanBase, sharedIronmanClaim, sharedIronmanCopies, emptyIronmanToken, reattachIronmanToken } from './ironman-storage.js';

const SLOT_KEY = 'hearth-and-oath-legacy:slots:v1';
export const LEGACY_SAVE_KEY = 'hearth-and-oath-legacy:life:v1';
export const SAVE_SLOT_COUNT = 3;
const SAVE_LOCK = 'hearth-and-oath-legacy:save:v1';
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const emptySlots = () => Array.from({ length: SAVE_SLOT_COUNT }, (_, id) => ({ id, state: null, updatedAt: null }));
let sequence = 0;
const revision = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2)}`;
const coordinators = new WeakMap();

/** Serialize browser mutations across tabs where Web Locks is supported. The
 * synchronous store also checks durable slot tokens on every operation, so
 * older browsers still reject already-observed competing writes. */
export function createSaveCoordinator(locks = globalThis.window?.navigator?.locks) {
  const queued = Boolean(locks?.request);
  let pending = Promise.resolve(), locking = queued;
  const coordinate = operation => {
    if (!queued) return operation();
    const result = pending.then(async () => {
      if (!locking) return operation();
      let entered = false;
      try { return await locks.request(SAVE_LOCK, { mode: 'exclusive' }, () => { entered = true; return operation(); }); }
      catch (error) {
        // Some offline/opaque origins expose Locks but forbid using it. The
        // callback did not run, so the guarded synchronous fallback is safe.
        if (!entered && ['SecurityError', 'NotSupportedError'].includes(error?.name)) { locking = false; return operation(); }
        throw error;
      }
    });
    pending = result.catch(() => {});
    return result;
  };
  const exclusive = operation => {
    const result = pending.then(async () => {
      if (!queued) throw new Error('Exclusive save coordination is unavailable.');
      let entered = false;
      const value = await locks.request(SAVE_LOCK, { mode: 'exclusive' }, lock => {
        if (!lock || lock.name !== SAVE_LOCK || lock.mode !== 'exclusive') throw new Error('The exclusive save lock was not entered.');
        entered = true;
        return operation();
      });
      if (!entered) throw new Error('The exclusive save lock was not entered.');
      return value;
    });
    pending = result.catch(() => {});
    return result;
  };
  coordinate.exclusive = exclusive;
  // Capture the real implementation privately. A caller-supplied boolean or
  // later replacement of .exclusive cannot authorize a store transaction.
  coordinators.set(coordinate, exclusive);
  coordinate.locking = () => locking;
  return coordinate;
}

/** Keep full simulation snapshots, including an unfinished turn, in separate lives. */
export function createSaveStore(storage, validate = value => value, options = {}) {
  const coordinate = options.coordinate === undefined ? createSaveCoordinator() : options.coordinate;
  const exclusive = coordinators.get(coordinate);
  const crypto = options.crypto === undefined ? globalThis.crypto : options.crypto;
  // Retain only one private validated envelope. Every lookup still reads both
  // durable strings; changed bytes always take the full migration path. The
  // private data is never returned or used as the mutable mutation draft.
  let validatedSnapshot = null;
  const snapshotData = value => copy({ slots: value.slots, activeSlot: value.activeSlot, backups: value.backups });
  function rememberSnapshot(value) {
    validatedSnapshot = value.accessible && value.readable ? { ...value, ...snapshotData(value) } : null;
  }
  function snapshot() {
    let slots = emptySlots(), activeSlot = 0, backups = {}, rawText = null, legacyText = null;
    let readable = true, compatible = false, accessible = false;
    try {
      if (!storage) throw new Error('Storage unavailable');
      rawText = storage.getItem(SLOT_KEY);
      legacyText = storage.getItem(LEGACY_SAVE_KEY);
      accessible = true;
      if (validatedSnapshot && rawText === validatedSnapshot.rawText && legacyText === validatedSnapshot.legacyText) {
        return { ...validatedSnapshot, ...snapshotData(validatedSnapshot) };
      }
      const raw = JSON.parse(rawText || 'null');
      if (raw?.version === 1 && Array.isArray(raw.slots)) {
        compatible = true;
        slots = slots.map(slot => {
          const candidate = raw.slots.find(value => value?.id === slot.id);
          const state = candidate?.state && !isIronman(candidate.state) ? validate(candidate.state) : null;
          return { ...slot, state, updatedAt: state && typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
            ...(typeof candidate?.revision === 'string' ? { revision: candidate.revision } : {}) };
        });
        activeSlot = Number.isInteger(raw.activeSlot) && raw.activeSlot >= 0 && raw.activeSlot < SAVE_SLOT_COUNT ? raw.activeSlot : 0;
        if (!slots.some(slot => slot.state) && raw.slots.some(slot => slot?.state != null)) compatible = false;
        for (const slot of slots) {
          const previous = raw.backups?.[slot.id], state = previous?.state && !isIronman(previous.state) ? validate(previous.state) : null;
          if (state) backups[slot.id] = { state, updatedAt: typeof previous.updatedAt === 'string' ? previous.updatedAt : null };
        }
      }
    } catch { readable = false; }
    // A recognized empty envelope is authoritative. In particular, a tombstone
    // must never be revived from an older compatibility mirror.
    if (!compatible) {
      try {
        if (legacyText == null) legacyText = storage?.getItem(LEGACY_SAVE_KEY) ?? null;
        const legacy = JSON.parse(legacyText || 'null'), state = legacy && !isIronman(legacy) ? validate(legacy) : null;
        if (state) { slots[0] = { id: 0, state, updatedAt: null }; activeSlot = 0; }
      } catch { readable = false; }
    }
    const value = { slots, activeSlot, backups, rawText, legacyText, readable, compatible, accessible };
    rememberSnapshot(value);
    return value;
  }
  let observed = snapshot();
  let { slots, activeSlot, backups } = copy(observed);
  let available = observed.readable, conflict = null;
  const unsaved = new Map();
  // Derived health only: durable baselines and the existing unsaved map remain
  // authoritative. Remember source identity so quiet renders/unload checks do
  // not repeatedly serialize a whole world. A queued live position can still
  // be checked before its coordinated write has run.
  const healthChecks = new Map(), acknowledgedInputs = new Map();
  function changed(id, state = slots[id]?.state, fresh = false) {
    if (!state) return false;
    if (isIronman(state)) return !same(state, displayHead(id)?.state || null);
    const baseline = observed.slots[id]?.state || null;
    const acknowledged = acknowledgedInputs.get(id);
    if (!fresh && acknowledged?.state === state && acknowledged.baseline === baseline) return false;
    const previous = healthChecks.get(id);
    if (!fresh && previous?.state === state && previous.baseline === baseline) return previous.changed;
    const result = !same(state, baseline);
    healthChecks.set(id, { state, baseline, changed: result });
    return result;
  }
  const slotToken = (value, id) => JSON.stringify({ slot: value.slots[id], backup: value.backups[id] || null });
  const local = () => ({ slots, activeSlot, backups });
  function adopt(value, resolved = null, discard = false) {
    if (discard) unsaved.clear(); else if (resolved != null) unsaved.delete(resolved);
    if (resolved != null) { healthChecks.delete(resolved); acknowledgedInputs.delete(resolved); }
    ({ slots, activeSlot, backups } = copy(value));
    observed = copy(value); available = value.readable;
    // A successful save in a different slot must not discard or authorize this
    // tab's earlier unsaved position. Its original baseline remains in force.
    for (const [id, pending] of unsaved) {
      slots[id] = copy(pending.slot); observed.slots[id] = copy(pending.baseline);
      if (pending.backup) { backups[id] = copy(pending.backup); observed.backups[id] = copy(pending.backup); }
      else { delete backups[id]; delete observed.backups[id]; }
    }
    if (!conflict || !unsaved.has(conflict.id)) conflict = null;
  }
  function latest() {
    const value = snapshot();
    // An unchanged malformed/legacy source may be deliberately recovered by a
    // valid save. Never overwrite a newly unreadable envelope from another tab.
    if (!value.accessible) { available = false; return null; }
    if (!value.readable && (value.rawText !== observed.rawText || value.legacyText !== observed.legacyText)) {
      available = false; return null;
    }
    if (!storage) { available = false; return null; }
    if (sharedIronmanClaim(value.rawText, value.legacyText)) { available = false; return null; }
    return value;
  }
  function checkTarget(value, id, token = slotToken(observed, id)) {
    if (token === slotToken(value, id) && conflict?.id !== id) return true;
    if (!unsaved.has(id)) unsaved.set(id, { slot: copy(slots[id]), baseline: copy(observed.slots[id]), backup: copy(observed.backups[id] || null) });
    conflict = { id, reason: !value.slots[id].state ? 'deleted' : 'changed', name: value.slots[id].state?.hero?.name || null };
    available = value.readable;
    return false;
  }
  function commit(value, id) {
    let previousMirror;
    try {
      if (!storage) throw new Error('Storage unavailable');
      previousMirror = storage.getItem(LEGACY_SAVE_KEY);
      // The envelope is authoritative and commits last. A mirror/quota failure
      // cannot partially replace a life or erase its recovery backup.
      storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(value.slots[value.activeSlot].state));
      const text = JSON.stringify({ version: 1, activeSlot: value.activeSlot, slots: value.slots, backups: value.backups });
      storage.setItem(SLOT_KEY, text);
      value = { ...value, rawText: text, legacyText: JSON.stringify(value.slots[value.activeSlot].state), readable: true, compatible: true };
      adopt(value, id);
      rememberSnapshot(value);
      return true;
    } catch {
      validatedSnapshot = null;
      available = false;
      if (previousMirror !== undefined) {
        try {
          if (previousMirror == null && storage.removeItem) storage.removeItem(LEGACY_SAVE_KEY);
          else storage.setItem(LEGACY_SAVE_KEY, previousMirror ?? 'null');
        } catch {}
      }
      return false;
    }
  }
  function idFor(id) { const value = Number(id); return Number.isInteger(value) && value >= 0 && value < SAVE_SLOT_COUNT ? value : null; }

  // Ironman authority is deliberately separate from slots/observed/unsaved and
  // validatedSnapshot above. A derived display must NEVER enter those Standard
  // mutation drafts or their envelope/mirror serializers.
  const failure = (reason, status = 'blocked') => ({ status, reason });
  function readBase(id) {
    try {
      const raw = storage.getItem(SLOT_KEY), legacy = storage.getItem(LEGACY_SAVE_KEY);
      if (sharedIronmanClaim(raw, legacy)) return { ok: false, reason: 'unsupported-shared-mortality' };
      return rawIronmanBase(raw, legacy, id, validate);
    }
    catch { return { ok: false, reason: 'unreadable-underlying' }; }
  }
  function markerFor(runId) {
    try {
      const raw = storage.getItem(ironmanEndedKey(runId));
      const marker = raw === null ? null : decodeIronmanEnded(raw, runId);
      if (marker) purgeLocal(runId);
      return raw !== null && !marker ? { ok: false } : { ok: true, marker };
    } catch { return { ok: false }; }
  }
  function enumerateKeys() {
    if (!storage || typeof storage.key !== 'function' || !Number.isSafeInteger(storage.length)
        || storage.length < 0 || storage.length > 100000) return null;
    const length = storage.length, keys = [], seen = new Set();
    for (let index = 0; index < length; index++) {
      const key = storage.key(index);
      if (typeof key !== 'string' || seen.has(key)) return null;
      keys.push(key); seen.add(key);
    }
    return storage.length === length ? keys.sort() : null;
  }
  function discover() {
    try {
      if (typeof storage?.getItem !== 'function' || typeof storage?.setItem !== 'function'
          || typeof storage?.removeItem !== 'function') return { ok: false, reason: 'durable-storage-unavailable' };
      const before = enumerateKeys();
      if (!before) return { ok: false, reason: 'incomplete-discovery' };
      const records = new Map(), ended = new Map();
      for (const key of before.filter(key => key.startsWith(IRONMAN_ENDED_PREFIX))) {
        const runId = key.slice(IRONMAN_ENDED_PREFIX.length);
        if (!validIronmanRunId(runId)) return { ok: false, reason: 'unreadable-ended-marker' };
        const marker = markerFor(runId);
        if (!marker.ok || !marker.marker) return { ok: false, reason: 'unreadable-ended-marker' };
        ended.set(runId, marker.marker);
      }
      for (const key of before.filter(key => key.startsWith(IRONMAN_RECORD_PREFIX))) {
        const runId = key.slice(IRONMAN_RECORD_PREFIX.length);
        if (!validIronmanRunId(runId)) return { ok: false, reason: 'unreadable-run-record' };
        const marker = markerFor(runId);
        if (!marker.ok) return { ok: false, reason: 'unreadable-ended-marker' };
        if (marker.marker) { ended.set(runId, marker.marker); continue; }
        const raw = storage.getItem(key), record = raw === null ? null : decodeIronmanRecord(raw, runId, validate);
        if (!record) return { ok: false, reason: 'unreadable-run-record' };
        records.set(runId, record);
      }
      const after = enumerateKeys();
      if (!after || !same(before, after)) return { ok: false, reason: 'incomplete-discovery' };
      return { ok: true, records, ended };
    } catch { return { ok: false, reason: 'incomplete-discovery' }; }
  }
  function ownership(record, found) {
    if (!record.state) return { status: 'deleted' };
    if (!record.attachment) return { status: 'archived' };
    const base = readBase(record.attachment.slotId);
    if (!base.ok) return { status: 'blocked', reason: base.reason };
    if (!base.empty || base.token !== record.attachment.baseToken) return { status: 'orphan', base };
    const matching = [...found.records.values()].filter(other => other.state && other.attachment
      && other.attachment.slotId === record.attachment.slotId && other.attachment.baseToken === base.token);
    return { status: matching.length === 1 ? 'active' : 'conflict', base };
  }
  function displayHead(id) {
    const found = discover();
    if (!found.ok) return null;
    const matching = [...found.records.values()].filter(record => record.attachment?.slotId === id && ownership(record, found).status === 'active');
    return matching.length === 1 ? matching[0] : null;
  }
  function protectedTarget(id) {
    const found = discover();
    if (!found.ok) return false; // Standard durability cannot erase independent mortality keys.
    return [...found.records.values()].some(record => record.attachment?.slotId === id
      && ['active', 'conflict'].includes(ownership(record, found).status));
  }
  function displaySlots() {
    const value = copy(slots), found = discover();
    if (!found.ok) return value;
    for (const record of found.records.values()) if (ownership(record, found).status === 'active') {
      const id = record.attachment.slotId;
      value[id] = { id, state: copy(record.state), updatedAt: record.updatedAt, revision: record.revision, ironman: true };
    }
    return value;
  }
  function secureId(excluded = []) {
    try {
      let id;
      if (typeof crypto?.randomUUID === 'function') id = crypto.randomUUID();
      else if (typeof crypto?.getRandomValues === 'function') {
        const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
        bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
        const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
        id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
      return validIronmanRunId(id) && !excluded.includes(id) ? id : null;
    } catch { return null; }
  }
  function draftRecord(prior, state, attachment, runId = prior?.runId) {
    const nextRevision = secureId([runId, prior?.revision, attachment?.nonce]);
    if (!nextRevision) return null;
    return { version: 1, runId, startedDay: prior?.startedDay ?? state.ironman.startedDay,
      revision: nextRevision, updatedAt: new Date().toISOString(), state: copy(state),
      casualties: copy(state?.ironman.casualties ?? prior.casualties), attachment: copy(attachment) };
  }
  function persistRecord(record) {
    if (!decodeIronmanRecord(record, record.runId, validate)) return failure('invalid-run-record');
    const key = ironmanRecordKey(record.runId), bytes = JSON.stringify(record);
    try {
      storage.setItem(key, bytes);
      if (storage.getItem(key) !== bytes) return failure('record-confirmation-failed', 'unconfirmed');
      return { status: 'confirmed' };
    } catch { return failure('record-write-unconfirmed', 'unconfirmed'); }
  }
  function revoke(record) {
    const next = draftRecord(record, record.state, null);
    if (!next) return failure('secure-randomness-unavailable');
    const result = persistRecord(next);
    return result.status === 'confirmed' ? { status: 'archived', record: next } : result;
  }
  function guarded(operation) {
    if (!exclusive) return Promise.resolve(failure('exclusive-coordination-unavailable'));
    let entered = false;
    return exclusive(() => { entered = true; return operation(); }).catch(() =>
      failure(entered ? 'operation-unconfirmed' : 'exclusive-coordination-unavailable', entered ? 'unconfirmed' : 'blocked'));
  }
  const inputRunId = input => typeof input === 'string' ? input : isIronman(input) ? input.ironman?.runId : null;
  function validatedPosition(input, terminal = false) {
    try {
      const state = validate(copy(input));
      return state && isIronman(state) && validateIronman(state) && same(state, input)
        && (terminal || !ironmanCombatStopped(state.battle)) ? state : null;
    } catch { return null; }
  }
  function emptyTarget(id, found) {
    const base = readBase(id);
    if (!base.ok) return failure(base.reason);
    if (!base.empty) return failure('underlying-slot-occupied');
    if (unsaved.has(id)) return failure('unsaved-target');
    if ([...found.records.values()].some(record => record.state && record.attachment?.slotId === id
        && record.attachment.baseToken === base.token)) return failure('ironman-slot-occupied');
    return { status: 'review', base };
  }
  function consumeHead(record, slot, consume, status = 'ready') {
    if (typeof consume !== 'function') return failure('synchronous-consumer-required');
    try {
      const token = ironmanRecordToken(record), value = consume(copy(record.state), { token, slot, runId: record.runId });
      if (value?.then) return failure('synchronous-consumer-required');
      return { status, runId: record.runId, slot, token, value };
    } catch { return failure('consumer-failed'); }
  }
  function inspect(input, { intent, slot, token, consume } = {}) {
    const id = idFor(slot), runId = inputRunId(input);
    if (!['create', 'import', 'reattach', 'resume', 'export'].includes(intent)
        || runId !== null && !validIronmanRunId(runId)) return failure('invalid-inspection');
    const found = discover(); if (!found.ok) return failure(found.reason);
    const marker = runId ? markerFor(runId) : { ok: true, marker: null };
    if (!marker.ok) return failure('unreadable-ended-marker');
    if (marker.marker) return { status: 'ended', runId };
    let record = runId ? found.records.get(runId) : null;
    if (record && !record.state) return failure('deleted-position');
    if (intent === 'create' || intent === 'import') {
      if (input !== null && (!validatedPosition(input) || !runId)) return failure('invalid-position');
      if (record) return intent === 'import' ? { status: 'known-head', runId, token: ironmanRecordToken(record) } : failure('known-run');
      if (id === null) return failure('invalid-slot');
      const target = emptyTarget(id, found); if (target.status !== 'review') return target;
      return { status: 'review', slot: id, ...(runId ? { runId } : {}), token: emptyIronmanToken(id, target.base.token) };
    }
    if (!record) return failure('missing-run-head');
    let owner = ownership(record, found);
    if (owner.status === 'blocked') return failure(owner.reason);
    if (owner.status === 'conflict') return failure('conflicting-claims');
    if (owner.status === 'orphan') {
      const result = revoke(record); if (result.status !== 'archived') return result;
      record = result.record; owner = { status: 'archived' };
    }
    if (intent === 'reattach') {
      if (owner.status === 'active') return failure('already-attached');
      if (id === null) return failure('invalid-slot');
      const target = emptyTarget(id, found); if (target.status !== 'review') return target;
      return { status: 'review', slot: id, runId, token: reattachIronmanToken(record, id, target.base.token) };
    }
    if (owner.status !== 'active' || id === null || record.attachment.slotId !== id) return failure('orphaned-position', 'stale');
    if (token !== undefined && token !== ironmanRecordToken(record) || typeof input !== 'string' && !same(input, record.state)) return failure('stale-position', 'stale');
    return consumeHead(record, id, consume);
  }
  function committedHead(record, slot, consume) {
    const found = discover();
    if (!found.ok) return failure(found.reason, 'unconfirmed');
    const current = found.records.get(record.runId);
    if (!current || current.revision !== record.revision) return failure('record-changed', 'unconfirmed');
    const owner = ownership(current, found);
    if (owner.status === 'blocked') return failure(owner.reason, 'unconfirmed');
    if (owner.status === 'conflict') return failure('conflicting-claims', 'unconfirmed');
    if (owner.status === 'orphan') {
      const result = revoke(current);
      return result.status === 'archived' ? { status: 'stored-orphan', runId: current.runId, token: ironmanRecordToken(result.record) } : result;
    }
    if (owner.status !== 'active') return failure('attachment-changed', 'unconfirmed');
    const result = { status: 'committed', runId: record.runId, slot, token: ironmanRecordToken(record), state: copy(record.state) };
    if (consume !== undefined) {
      const consumed = consumeHead(record, slot, consume, 'committed');
      if (consumed.status !== 'committed') return { ...result, consumerFailed: true };
      result.value = consumed.value;
    }
    return result;
  }
  function commitRun(slot, input, { intent, token, consume } = {}) {
    const id = idFor(slot), state = validatedPosition(input), runId = inputRunId(input);
    if (id === null || !state || !['create', 'import', 'continue'].includes(intent)) return failure('invalid-position');
    const found = discover(); if (!found.ok) return failure(found.reason);
    const marker = markerFor(runId); if (!marker.ok) return failure('unreadable-ended-marker');
    if (marker.marker) return { status: 'ended', runId };
    const prior = found.records.get(runId);
    if (intent === 'continue') {
      if (!prior?.state) return failure(prior ? 'deleted-position' : 'missing-run-head');
      if (token !== ironmanRecordToken(prior)) return failure('stale-run-revision', 'stale');
      const owner = ownership(prior, found);
      if (owner.status === 'blocked') return failure(owner.reason);
      if (owner.status === 'conflict') return failure('conflicting-claims');
      if (owner.status !== 'active' || prior.attachment.slotId !== id) {
        if (owner.status === 'orphan') { const result = revoke(prior); if (result.status !== 'archived') return result; }
        return failure('orphaned-position', 'stale');
      }
      if (!validateCasualtyFloor(state, { startedDay: prior.startedDay, casualties: prior.casualties })
          || state.day < prior.state.day || state.dynasty.id !== prior.state.dynasty.id
          || state.dynasty.generation < prior.state.dynasty.generation) return failure('casualty-floor-or-history-conflict');
      const next = draftRecord(prior, state, prior.attachment); if (!next) return failure('secure-randomness-unavailable');
      const saved = persistRecord(next); return saved.status === 'confirmed' ? committedHead(next, id, consume) : saved;
    }
    if (prior) return prior.state ? { status: 'known-head', runId, token: ironmanRecordToken(prior) } : failure('deleted-position');
    if (intent === 'create' && (state.ironman.startedDay !== state.day || state.ironman.casualties.length || state.battle || state.phase === 'retired')) return failure('invalid-new-opening');
    const target = emptyTarget(id, found); if (target.status !== 'review') return target;
    if (token !== emptyIronmanToken(id, target.base.token)) return failure('stale-empty-slot', 'stale');
    const nonce = secureId([runId]); if (!nonce) return failure('secure-randomness-unavailable');
    const next = draftRecord(null, state, { slotId: id, nonce, baseToken: target.base.token }, runId);
    if (!next) return failure('secure-randomness-unavailable');
    const saved = persistRecord(next); return saved.status === 'confirmed' ? committedHead(next, id, consume) : saved;
  }
  function reattach(runId, slot, { reviewed = false, token } = {}) {
    const id = idFor(slot);
    if (!reviewed || !validIronmanRunId(runId) || id === null) return failure('review-required');
    const found = discover(); if (!found.ok) return failure(found.reason);
    const marker = markerFor(runId); if (!marker.ok) return failure('unreadable-ended-marker');
    if (marker.marker) return { status: 'ended', runId };
    const prior = found.records.get(runId);
    if (!prior?.state) return failure(prior ? 'deleted-position' : 'missing-run-head');
    const owner = ownership(prior, found);
    if (owner.status === 'blocked') return failure(owner.reason);
    if (owner.status === 'conflict') return failure('conflicting-claims');
    if (owner.status === 'active') return failure('already-attached');
    const target = emptyTarget(id, found); if (target.status !== 'review') return target;
    if (token !== reattachIronmanToken(prior, id, target.base.token)) return failure('stale-recovery-review', 'stale');
    const nonce = secureId([runId, prior.attachment?.nonce]); if (!nonce) return failure('secure-randomness-unavailable');
    const next = draftRecord(prior, prior.state, { slotId: id, nonce, baseToken: target.base.token });
    if (!next) return failure('secure-randomness-unavailable');
    const saved = persistRecord(next); return saved.status === 'confirmed' ? committedHead(next, id) : saved;
  }
  function retainOrDelete(runId, { reviewed = false, token } = {}, remove = false) {
    if (!reviewed || !validIronmanRunId(runId)) return failure('review-required');
    const found = discover(); if (!found.ok) return failure(found.reason);
    const marker = markerFor(runId); if (!marker.ok) return failure('unreadable-ended-marker');
    if (marker.marker) return { status: 'ended', runId };
    const prior = found.records.get(runId); if (!prior) return failure('missing-run-head');
    if (!prior.state) return { status: 'deleted', runId };
    if (token !== ironmanRecordToken(prior)) return failure('stale-run-revision', 'stale');
    const next = draftRecord(prior, remove ? null : prior.state, null);
    if (!next) return failure('secure-randomness-unavailable');
    const saved = persistRecord(next);
    return saved.status === 'confirmed' ? { status: remove ? 'deleted' : 'archived', runId, token: ironmanRecordToken(next) } : saved;
  }
  function recoverableHeads() {
    const found = discover(); if (!found.ok) return failure(found.reason);
    // Do not resolve a duplicate claim by implicitly archiving whichever head
    // happened to be enumerated first. Only explicit reviewed archive/delete
    // may deliberately resolve it; leave every claimant unchanged here.
    for (const record of found.records.values()) {
      const owner = ownership(record, found);
      if (owner.status === 'blocked') return failure(owner.reason);
      if (owner.status === 'conflict') return failure('conflicting-claims');
    }
    const runs = [];
    for (let record of found.records.values()) if (record.state) {
      const owner = ownership(record, found);
      if (owner.status === 'blocked') return failure(owner.reason);
      if (owner.status === 'conflict') return failure('conflicting-claims');
      if (owner.status === 'active') continue;
      if (owner.status === 'orphan') { const result = revoke(record); if (result.status !== 'archived') return result; record = result.record; }
      runs.push({ runId: record.runId, token: ironmanRecordToken(record), name: record.state.hero.name,
        age: record.state.age, day: record.state.day, updatedAt: record.updatedAt, status: owner.status });
    }
    return { status: 'ready', runs };
  }
  function purgeLocal(runId) {
    const matches = state => isIronman(state) && state.ironman?.runId === runId;
    for (const [id, pending] of unsaved) if (matches(pending.slot?.state) || matches(pending.backup?.state)) unsaved.delete(id);
    for (const map of [healthChecks, acknowledgedInputs]) for (const [id, value] of map) if (matches(value.state)) map.delete(id);
    // These contain Standard only by construction; defensive matching cleanup
    // must still never discard an unrelated unsaved slot or previous-life backup.
    for (const value of [slots, observed.slots]) for (const slot of value) if (matches(slot.state)) slot.state = null;
    for (const value of [backups, observed.backups]) for (const [id, backup] of Object.entries(value)) if (matches(backup.state)) delete value[id];
    if (validatedSnapshot && (validatedSnapshot.slots.some(slot => matches(slot.state))
        || Object.values(validatedSnapshot.backups).some(backup => matches(backup.state))
        || sharedIronmanCopies(validatedSnapshot.rawText, validatedSnapshot.legacyText, runId) === true)) validatedSnapshot = null;
  }
  function cleanupEnded(runId, marker) {
    purgeLocal(runId);
    try {
      storage.removeItem(ironmanRecordKey(runId));
      if (storage.getItem(ironmanRecordKey(runId)) !== null) return { status: 'ended-cleanup-pending', runId, marker: copy(marker) };
      if (sharedIronmanCopies(storage.getItem(SLOT_KEY), storage.getItem(LEGACY_SAVE_KEY), runId) !== false)
        return { status: 'ended-cleanup-pending', runId, marker: copy(marker) };
      return { status: 'ended', runId, marker: copy(marker) };
    } catch { return { status: 'ended-cleanup-pending', runId, marker: copy(marker) }; }
  }
  function endRun(slot, input, { token } = {}) {
    const id = idFor(slot), runId = inputRunId(input);
    if (!validIronmanRunId(runId)) return failure('invalid-terminal');
    const existing = markerFor(runId); if (!existing.ok) return failure('unreadable-ended-marker');
    if (existing.marker) return cleanupEnded(runId, existing.marker);
    const state = validatedPosition(input, true), terminal = state && ironmanHeroDeath(state);
    if (id === null || !terminal) return failure('invalid-terminal');
    const found = discover(); if (!found.ok) return failure(found.reason);
    const prior = found.records.get(runId);
    if (!prior?.state || token !== ironmanRecordToken(prior)) return failure('stale-run-revision', 'stale');
    if (ownership(prior, found).status !== 'active' || prior.attachment.slotId !== id
        || terminal.personId !== prior.state.dynasty.activePersonId || state.dynasty.id !== prior.state.dynasty.id
        || state.dynasty.generation !== prior.state.dynasty.generation || state.day < prior.state.day
        || prior.state.battle && (state.battle.instanceId !== prior.state.battle.instanceId
          || !sameBattleMortalityPolicy(prior.state.battle, state.battle))
        || !validateCasualtyFloor(state, { startedDay: prior.startedDay, casualties: prior.casualties })) return failure('terminal-ownership-conflict', 'stale');
    const marker = { version: 1, ...terminal }, bytes = JSON.stringify(marker);
    try {
      storage.setItem(ironmanEndedKey(runId), bytes);
      if (storage.getItem(ironmanEndedKey(runId)) !== bytes) return failure('ended-marker-unconfirmed', 'unconfirmed');
    } catch { return failure('ended-marker-unconfirmed', 'unconfirmed'); }
    return cleanupEnded(runId, marker);
  }
  return {
    list: () => displaySlots(), active: () => activeSlot, available: () => available,
    conflict: () => copy(conflict),
    hasUnsaved: id => id == null ? unsaved.size > 0 : unsaved.has(Number(id)),
    invalidateHealth(id) { const index = idFor(id); healthChecks.delete(index); acknowledgedInputs.delete(index); },
    hasUnsavedChanges(id, state) {
      if (id == null) return [...unsaved.keys()].some(index => changed(index));
      // Called at unload, not render: recheck supplied live input even if an
      // unanticipated caller mutated the previously acknowledged object.
      const index = idFor(id); return index != null && changed(index, state, true);
    },
    health(id, state) {
      const index = idFor(id);
      if (index == null) return null;
      const head = displayHead(index), position = state === undefined ? head?.state || slots[index].state : state;
      const dirty = head ? !same(position, head.state) : state === undefined && !unsaved.has(index) ? false : changed(index, position), reason = conflict?.id === index ? conflict.reason : null;
      const timestamp = head?.updatedAt || observed.slots[index].updatedAt;
      return { id: index, hasState: Boolean(position), hasChanges: dirty, available,
        status: reason ? (dirty ? 'conflict' : 'stale') : dirty ? (unsaved.has(index) || !available ? 'unsaved' : 'pending') : position ? 'saved' : 'empty',
        lastSavedAt: typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)) ? timestamp : null,
        hasDurableState: Boolean(head || observed.accessible && observed.slots[index].state), conflict: reason };
    },
    checkForConflict(id) { const index = idFor(id), value = latest(); return index != null && value ? !checkTarget(value, index) : false; },
    read: id => copy(displayHead(Number(id))?.state || slots.find(slot => slot.id === Number(id))?.state || null),
    empty: () => displaySlots().find(slot => !slot.state)?.id ?? null,
    backup: id => copy(backups[Number(id)]?.state || null),
    reviewToken(id) { const index = idFor(id), head = index === null ? null : displayHead(index); return index == null ? null : head ? ironmanRecordToken(head) : slotToken(local(), index); },
    deletionToken(id) { return this.read(id) ? this.reviewToken(id) : null; },
    /** Explicit reload only: never discard an unsaved session on a storage event. */
    reload() {
      validatedSnapshot = null;
      const value = snapshot();
      if (!value.accessible || (!value.readable && (value.rawText !== observed.rawText || value.legacyText !== observed.legacyText))) { available = false; return false; }
      adopt(value, null, true); healthChecks.clear(); acknowledgedInputs.clear(); return true;
    },
    remove(id, { reviewed = false, token } = {}) {
      const index = idFor(id);
      if (index !== null && protectedTarget(index)) return false;
      if (!reviewed || index == null || !slots[index].state || token !== this.deletionToken(index)) return false;
      validatedSnapshot = null;
      const value = latest();
      if (!value) return false;
      // Deletion keeps its strict whole-list review contract. A changed neighbor
      // requires reviewing the saved-life list again, not an automatic retry.
      if (!same(value.slots, slots) || !same(value.backups, backups)) {
        checkTarget(value, index); return false;
      }
      value.slots[index] = { id: index, state: null, updatedAt: null, revision: revision() };
      delete value.backups[index];
      if (value.activeSlot === index) value.activeSlot = value.slots.filter(s => s.state).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0]?.id ?? 0;
      return commit(value, index);
    },
    replace(id, state, { reviewed = false, token } = {}) {
      if (isIronman(state)) return false;
      const valid = validate(state), index = idFor(id);
      if (index !== null && protectedTarget(index)) return false;
      if (!valid || index == null || (slots[index].state && !reviewed)) return false;
      validatedSnapshot = null;
      const value = latest();
      if (!value || !checkTarget(value, index, token)) return false;
      if (value.slots[index].state) value.backups[index] = { state: copy(value.slots[index].state), updatedAt: value.slots[index].updatedAt };
      value.activeSlot = index;
      value.slots[index] = { id: index, state: copy(valid), updatedAt: new Date().toISOString(), revision: revision() };
      return commit(value, index);
    },
    select(id) { const index = idFor(id); if (index == null) return false; activeSlot = index; return true; },
    write(id, state) {
      if (isIronman(state)) return false;
      const valid = validate(state), index = idFor(id);
      if (index !== null && protectedTarget(index)) return false;
      if (!valid || index == null) return false;
      this.invalidateHealth(index);
      const value = latest(), prior = observed.slots[index];
      // Keep the attempted position exportable on quota failure or conflict;
      // observed remains the last durable baseline, so a retry cannot bless a
      // stale write or resurrect a life deleted in another tab.
      activeSlot = index;
      slots[index] = { ...slots[index], id: index, state: copy(valid), updatedAt: new Date().toISOString() };
      unsaved.set(index, { slot: copy(slots[index]), baseline: copy(observed.slots[index]), backup: copy(observed.backups[index] || null) });
      if (!value || !checkTarget(value, index)) return false;
      value.activeSlot = index;
      if (!same(prior.state, valid)) value.slots[index] = { id: index, state: copy(valid), updatedAt: slots[index].updatedAt, revision: revision() };
      const success = commit(value, index);
      if (success) acknowledgedInputs.set(index, { state, baseline: observed.slots[index].state });
      return success;
    },
    inspectIronman: (input, request) => guarded(() => inspect(input, request)),
    commitIronman: (slot, state, request) => guarded(() => commitRun(slot, state, request)),
    reattachIronman: (runId, slot, request) => guarded(() => reattach(runId, slot, request)),
    archiveIronman: (runId, request) => guarded(() => retainOrDelete(runId, request)),
    deleteIronman: (runId, request) => guarded(() => retainOrDelete(runId, request, true)),
    listRecoverableIronman: () => guarded(recoverableHeads),
    endIronman: (slot, state, request) => guarded(() => endRun(slot, state, request)),
  };
}
