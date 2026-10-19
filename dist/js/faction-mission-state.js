import { validateObjectiveEvidence } from './objective-evidence.js';

export const FIRST_MISSION_VERSION = 1;
export const FIRST_MISSION_IDS = Object.freeze(['lantern_compact', 'salt_ledger', 'unbound_archive', 'rootward_circle', 'ash_company', 'quiet_table']);
export const FIRST_MISSION_METHODS = Object.freeze({
  lantern_compact: ['allocation', 'mending'], salt_ledger: ['marks', 'testimony'],
  unbound_archive: ['comparison', 'reconstruction'], rootward_circle: ['access', 'planters'],
  ash_company: ['payroll', 'muster'], quiet_table: ['direct', 'relay'],
});

/** Old displayed scenes and agreed work keep their exact original terms. */
export function usesLegacyFirstAgreement(s, faction) {
  return faction.rank === 0 && !faction.firstMission && (
    s.rpg?.pending?.kind === 'faction' && s.rpg.pending.id === faction.id && !s.rpg.pending.firstOffer && !s.rpg.pending.objectiveDecision
    || s.rpg?.project?.kind === 'faction' && s.rpg.project.id === faction.id
  );
}

export function mayOfferFirstMission(s, faction) {
  return FIRST_MISSION_IDS.includes(faction?.id) && faction.rank === 0
    && !faction.firstMission && !usesLegacyFirstAgreement(s, faction);
}

export function captureMissionActor(person, { source = 'rpg', serviceKind = null, subjectId = null, roomId = null, sourceId = person.id } = {}) {
  return {
    id: person.id, sourceId, source, name: person.name, role: person.role,
    locationId: person.locationId, roomId, serviceKind, subjectId,
  };
}

export function makeFirstMission({ factionId, day, locationId, cast, targetId, fieldLocationId = null, values = {} }) {
  return {
    version: FIRST_MISSION_VERSION, definitionId: factionId, acceptedDay: day,
    locationId, cast: structuredClone(cast), targetId, fieldLocationId,
    values: structuredClone(values), method: null, status: 'active', evidence: [],
    completedSteps: [], custody: [], decisionStep: null, ending: null, completedDay: null, rewardApplied: false,
  };
}

export function validateFirstMission(m, faction, s, { evidenceIds = [], stepIds = [] } = {}) {
  if (m === undefined) return true;
  const obj = value => value && typeof value === 'object' && !Array.isArray(value);
  const str = (value, max = 160) => typeof value === 'string' && value.length > 0 && value.length <= max;
  const int = value => Number.isSafeInteger(value) && value >= 0 && value <= s.day;
  const site = id => s.world.locations.some(place => place.id === id);
  const actorKeys = ['id', 'sourceId', 'source', 'name', 'role', 'locationId', 'roomId', 'serviceKind', 'subjectId'];
  if (!obj(m) || !Object.keys(m).every(key => ['version', 'definitionId', 'acceptedDay', 'locationId', 'cast', 'targetId', 'fieldLocationId', 'values', 'method', 'status', 'evidence', 'completedSteps', 'custody', 'decisionStep', 'ending', 'completedDay', 'rewardApplied'].includes(key))
    || m.version !== FIRST_MISSION_VERSION || m.definitionId !== faction.id || !FIRST_MISSION_IDS.includes(faction.id)
    || !int(m.acceptedDay) || !site(m.locationId) || !str(m.targetId)
    || m.fieldLocationId !== null && !site(m.fieldLocationId)
    || !FIRST_MISSION_METHODS[faction.id].includes(m.method)
    || !['active', 'completed', 'withdrawn', 'interrupted'].includes(m.status)
    || !obj(m.cast) || Object.keys(m.cast).length < 2 || Object.keys(m.cast).length > 10
    || !obj(m.values) || Object.keys(m.values).length > 12
    || !Object.values(m.values).every(value => typeof value === 'boolean' || Number.isSafeInteger(value) && Math.abs(value) <= 100000 || str(value, 240))) return false;
  const actors = Object.values(m.cast);
  if (!actors.every(p => obj(p) && Object.keys(p).every(key => actorKeys.includes(key)) && str(p.id) && str(p.sourceId) && str(p.name, 120) && str(p.role, 120)
    && ['rpg', 'service'].includes(p.source) && site(p.locationId)
    && (p.roomId === null || str(p.roomId, 40))
    && (p.serviceKind === null || str(p.serviceKind, 40)) && (p.subjectId === null || str(p.subjectId, 160)))) return false;
  const actor = id => actors.some(p => p.id === id) || m.custody?.some(row => row.fromId === id || row.to.id === id);
  if (!Array.isArray(m.custody) || m.custody.length > 12 || !m.custody.every(row => obj(row) && Object.keys(row).every(key => ['day', 'key', 'fromId', 'to'].includes(key)) && int(row.day)
    && str(row.key, 40) && str(row.fromId) && obj(row.to) && row.to.source === 'service'
    && Object.keys(row.to).every(key => actorKeys.includes(key))
    && str(row.to.id) && str(row.to.sourceId) && str(row.to.name, 120) && str(row.to.role, 120) && site(row.to.locationId)
    && str(row.to.roomId, 40) && str(row.to.serviceKind, 40) && (row.to.subjectId === null || str(row.to.subjectId)))) return false;
  if (!validateObjectiveEvidence(m.evidence, { day: s.day, site, actor, allowedIds: evidenceIds, objectId: id => id === m.targetId })
    || m.evidence.some(entry => entry.day < m.acceptedDay)
    || !Array.isArray(m.completedSteps) || m.completedSteps.length > 16 || new Set(m.completedSteps).size !== m.completedSteps.length
    || !m.completedSteps.every(id => stepIds.includes(id)) || typeof m.rewardApplied !== 'boolean'
    || m.decisionStep !== null && !stepIds.includes(m.decisionStep)) return false;
  if (m.status === 'completed') return m.method !== null && int(m.completedDay) && m.completedDay >= m.acceptedDay && str(m.ending, 2000) && m.rewardApplied && faction.rank >= 1;
  return m.completedDay === null && (m.ending === null || str(m.ending, 2000)) && !m.rewardApplied && faction.rank === 0;
}
