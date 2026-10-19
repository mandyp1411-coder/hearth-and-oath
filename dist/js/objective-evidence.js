// A small evidence vocabulary shared by finite authored cases. The owning case
// stores its own state; these helpers do not create a second quest ledger.
export const EVIDENCE_KINDS = Object.freeze(['record', 'testimony', 'inspection', 'arrival', 'material', 'consent', 'receipt']);
export const EVIDENCE_DISPOSITIONS = Object.freeze(['observed', 'willing', 'refused', 'intact', 'returned', 'disputed']);

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 160) => typeof value === 'string' && value.length > 0 && value.length <= max;

export function evidenceFor(run, id) {
  return run?.evidence?.find(entry => entry.id === id) || null;
}

export function hasEvidence(run, ids, { verified = true } = {}) {
  return ids.every(id => {
    const entry = evidenceFor(run, id);
    return entry && (!verified || entry.verified);
  });
}

/** Writers supply actual facts after completed work, never inferred map visits. */
export function recordEvidenceOnce(run, entry) {
  if (!run || !Array.isArray(run.evidence) || run.evidence.length >= 32 || evidenceFor(run, entry.id)) return false;
  run.evidence.push(structuredClone(entry));
  return true;
}

export function validateObjectiveEvidence(entries, { day, site, actor, allowedIds, objectId } = {}) {
  if (!Array.isArray(entries) || entries.length > 32 || new Set(entries.map(entry => entry?.id)).size !== entries.length) return false;
  return entries.every(entry => object(entry)
    && Object.keys(entry).every(key => ['id', 'kind', 'day', 'locationId', 'actorIds', 'objectId', 'verified', 'disposition', 'sourceRevision'].includes(key))
    && text(entry.id) && (!allowedIds || allowedIds.includes(entry.id))
    && EVIDENCE_KINDS.includes(entry.kind)
    && Number.isSafeInteger(entry.day) && entry.day >= 0 && entry.day <= day
    && site(entry.locationId)
    && Array.isArray(entry.actorIds) && entry.actorIds.length <= 8
    && new Set(entry.actorIds).size === entry.actorIds.length
    && entry.actorIds.every(id => text(id) && (!actor || actor(id)))
    && (entry.objectId === null || text(entry.objectId) && (!objectId || objectId(entry.objectId)))
    && typeof entry.verified === 'boolean'
    && EVIDENCE_DISPOSITIONS.includes(entry.disposition)
    && (entry.sourceRevision === undefined || Number.isSafeInteger(entry.sourceRevision) && entry.sourceRevision >= 0 && entry.sourceRevision <= 1000000));
}

/** Completion is one atomic owner-controlled transition, not a reward callback. */
export function finishObjectiveOnce(run, { day, ending, requiredIds }) {
  if (!run || run.status !== 'active' || run.completedDay != null || !hasEvidence(run, requiredIds)) return false;
  run.status = 'completed';
  run.completedDay = day;
  run.ending = ending;
  return true;
}
