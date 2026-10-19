import { seededRoll } from './world.js';
import { captureMissionActor } from './faction-mission-state.js';
import { recordEvidenceOnce, validateObjectiveEvidence, finishObjectiveOnce } from './objective-evidence.js';
import { householdSilver, householdSilverReason, validateHouseholdSilver, claimHouseholdSilver } from './silver-property.js';

export const COUNTING_TABLE_METHODS = Object.freeze(['stealth', 'social', 'inside']);
export const COUNTING_TABLE_TITLE = 'The Counting-Table Silver';
export const COUNTING_TABLE_STEPS = Object.freeze({
  stealth: Object.freeze(['silver_inspected', 'wards_read', 'ward_pattern_checked']),
  social: Object.freeze(['silver_inspected', 'valuation_terms', 'valuation_entry_checked']),
  inside: Object.freeze(['silver_inspected', 'counter_copy_shared', 'counter_copy_checked']),
});
const proofKinds = Object.freeze({ silver_inspected: 'inspection', wards_read: 'inspection', ward_pattern_checked: 'inspection',
  valuation_terms: 'testimony', valuation_entry_checked: 'record', counter_copy_shared: 'record', counter_copy_checked: 'inspection' });
const actorKey = id => ['valuation_terms', 'valuation_entry_checked'].includes(id) ? 'merchant' : id === 'counter_copy_shared' ? 'quietTable' : null;
const dispositionFor = id => ['valuation_terms', 'counter_copy_shared'].includes(id) ? 'willing' : 'observed';
const methodName = method => ({ stealth: 'lantern-ward', social: 'valuation-audience', inside: 'counter-copy' })[method];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const text = (value, max = 160) => typeof value === 'string' && value.length > 0 && value.length <= max;
const integer = (value, min = 0, max = 10000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const room = s => s.cartography?.interior?.siteId === s.locationId ? s.cartography.interior.roomId : 'gate';

export function countingTableLife(s) {
  return { personId: s.dynasty?.activePersonId ?? null, generation: s.dynasty?.generation || 1, birthDay: s.timeline?.birthDay ?? 0 };
}

function serviceActor(row, sourceId = row?.personId) {
  if (!row || row.personId !== row.person?.id || !text(row.personId) || !text(row.person.name, 120)
    || row.person.alive === false || row.person.available === false || row.person.retired) return null;
  return captureMissionActor({ ...row.person, role: row.person.role || row.role, locationId: row.locationId },
    { source: 'service', serviceKind: row.kind, subjectId: row.subjectId ?? null, roomId: row.roomId, sourceId });
}

/** Callers supply actual settlementServices rows; no person ID is constructed. */
export function makeCountingTableCase(s, { method, merchantService, quietTableService = null } = {}) {
  const target = householdSilver(s), merchant = serviceActor(merchantService, target?.ownerId), quietTable = serviceActor(quietTableService);
  if (s.age < 18 || s.phase !== 'adult' || !COUNTING_TABLE_METHODS.includes(method) || !target || target.regionId !== 'bellwater'
    || householdSilverReason(s, target) || merchantService?.kind !== 'merchant' || merchantService.subjectId !== 'market'
    || !merchant || merchant.locationId !== target.locationId || merchant.roomId !== 'market' || merchant.id === target.ownerId
    || s.justice?.countingTableJob && same(s.justice.countingTableJob.life, countingTableLife(s))) return null;
  if (method === 'inside' && (!quietTable || quietTableService.kind !== 'faction' || quietTableService.subjectId !== 'quiet_table'
    || quietTable.locationId !== target.locationId || !['tavern', 'hall'].includes(quietTable.roomId)
    || !(s.rpg?.factions || []).some(faction => faction.id === 'quiet_table' && faction.rank >= 1))) return null;
  return { version: 1, definitionId: 'market_silver', life: countingTableLife(s), acceptedDay: s.day,
    locationId: target.locationId, regionId: target.regionId, target,
    cast: { merchant, quietTable: method === 'inside' ? quietTable : null }, method, status: 'active', stage: 'preparation',
    work: [], evidence: [], attempt: null, ending: null, completedDay: null, lootId: null };
}

export function nextCountingTablePreparation(run) {
  return COUNTING_TABLE_STEPS[run?.method]?.[run.work.length] || null;
}

/** One attended day per proof; a map visit, payment or successor is not proof. */
export function recordCountingTablePreparation(s, run, id, { startedDay, provider = null, willing = false } = {}) {
  if (!run || run.status !== 'active' || run.stage !== 'preparation' || !same(run.life, countingTableLife(s))
    || nextCountingTablePreparation(run) !== id || !integer(startedDay, run.acceptedDay, s.day - 1)
    || s.day !== startedDay + 1 || householdSilverReason(s, run.target)) return false;
  const key = actorKey(id), ref = key && run.cast[key];
  if (dispositionFor(id) === 'willing' && willing !== true) return false;
  if (key && (!ref || provider?.personId !== ref.id || provider.person?.id !== ref.id || provider.kind !== ref.serviceKind
    || (provider.subjectId ?? null) !== ref.subjectId || provider.locationId !== run.locationId
    || provider.person.alive === false || provider.person.available === false || provider.person.retired
    || provider.roomId !== room(s))) return false;
  if (!key && room(s) !== 'market' || key === 'merchant' && room(s) !== 'market') return false;
  if (run.work.length && startedDay < run.work.at(-1).completedDay) return false;
  const recorded = recordEvidenceOnce(run, { id, kind: proofKinds[id], day: s.day, locationId: run.locationId,
    actorIds: key ? [ref.id] : [], objectId: run.target.id, verified: true, disposition: dispositionFor(id) });
  if (!recorded) return false;
  run.work.push({ id, startedDay, completedDay: s.day });
  if (run.work.length === 3) run.stage = 'prepared';
  return true;
}

/** Quote only. Actual law enforcement comes from regionAt at the point of use. */
export function countingTableRiskQuote(s, run, { enforcement } = {}) {
  if (!COUNTING_TABLE_METHODS.includes(run?.method) || !integer(enforcement, 0, 100)) return null;
  const skill = { stealth: 'stealth', social: 'persuasion', inside: 'scholarship' }[run.method];
  const attribute = { stealth: 'agility', social: 'presence', inside: 'intellect' }[run.method];
  const practice = s.hero.skills[skill], aptitude = Math.floor(s.hero.attributes[attribute] / 2);
  if (!integer(practice) || !integer(aptitude)) return null;
  const [entryBase, entryCap, escapeBase, escapeCap, exposure] = {
    stealth: [55, 85, 75, 90, 0], social: [65, 90, 60, 85, 15], inside: [70, 90, 70, 85, 5],
  }[run.method];
  const entryChance = Math.min(entryCap, entryBase + practice * 3 + aptitude), escapeChance = Math.min(escapeCap, escapeBase + practice * 2 + aptitude);
  return { method: run.method, totalDays: 5, preparationDays: 3, approachDays: 1, departureDays: 1, cost: 0,
    entryChance, escapeChance, combinedChance: Math.round(entryChance * escapeChance / 10) / 10,
    witnessChance: Math.min(90, Math.floor(enforcement / 3) + exposure), failureEvidence: 3,
    skill, attribute, requiredEvidence: [...COUNTING_TABLE_STEPS[run.method]], householdCostsSeparate: true };
}

/** These fixed rolls cannot be changed by another theft counter or reopening. */
export function countingTableRolls(s, run) {
  if (!run || !COUNTING_TABLE_METHODS.includes(run.method)) return null;
  const binding = JSON.stringify([run.life, run.acceptedDay, run.target.id, run.method]);
  return Object.fromEntries(['entry', 'escape', 'witness'].map(key => [key, seededRoll(s.seed, 'counting-table:' + binding + ':' + key, 100)]));
}

/** Save this exact disclosed phase quote BEFORE calling spendDays. */
export function countingTablePhaseCommitment(s, run, phase, { enforcement } = {}) {
  const quote = countingTableRiskQuote(s, run, { enforcement }), rolls = countingTableRolls(s, run);
  if (!quote || !rolls || !['approach', 'departure'].includes(phase)) return null;
  return { phase, committedDay: s.day, method: run.method, skill: quote.skill, skillValue: s.hero.skills[quote.skill],
    attribute: quote.attribute, attributeValue: s.hero.attributes[quote.attribute], enforcement,
    chance: phase === 'approach' ? quote.entryChance : quote.escapeChance,
    roll: phase === 'approach' ? rolls.entry : rolls.escape, witnessChance: quote.witnessChance, witnessRoll: rolls.witness };
}

export function validateCountingTablePhaseCommitment(commitment, run, s) {
  const keys = ['phase', 'committedDay', 'method', 'skill', 'skillValue', 'attribute', 'attributeValue', 'enforcement', 'chance', 'roll', 'witnessChance', 'witnessRoll'];
  if (!object(commitment) || Object.keys(commitment).length !== keys.length || !Object.keys(commitment).every(key => keys.includes(key))
    || !['approach', 'departure'].includes(commitment.phase) || commitment.method !== run.method
    || !integer(commitment.committedDay, run.acceptedDay, s.day) || !integer(commitment.skillValue) || !integer(commitment.attributeValue)
    || !integer(commitment.enforcement, 0, 100)) return false;
  const frozen = { ...s, day: commitment.committedDay,
    hero: { skills: { [commitment.skill]: commitment.skillValue }, attributes: { [commitment.attribute]: commitment.attributeValue } } };
  const expected = countingTablePhaseCommitment(frozen, run, commitment.phase, { enforcement: commitment.enforcement });
  return !!expected && Object.keys(expected).every(key => expected[key] === commitment[key]);
}

export function countingTableAttemptReason(s, run) {
  if (!run || run.status !== 'active' || !same(run.life, countingTableLife(s)) || s.phase !== 'adult' || s.age < 18) return 'This is not an active adult opportunity for this hero.';
  const reason = householdSilverReason(s, run.target);
  if (reason) return reason;
  if (room(s) !== 'market') return 'Return to the counting table at the Market.';
  if (!Array.isArray(s.adventuring?.loot) || s.adventuring.loot.length >= 160) return 'Make room in your 160-valuable bag before continuing. No silver has been awarded.';
  return null;
}

/** Commit the actual quote and fixed roll before attendance, never on resume. */
export function beginCountingTablePhase(s, run, phase, { enforcement } = {}) {
  if (!validateCountingTableCase(run, s) || countingTableAttemptReason(s, run)) return false;
  if (phase === 'approach' ? run.stage !== 'prepared' || run.attempt !== null : phase !== 'departure' || run.stage !== 'opportunity') return false;
  const commitment = countingTablePhaseCommitment(s, run, phase, { enforcement });
  if (!commitment) return false;
  const record = { commitment, startedDay: null, completedDay: null, succeeded: null };
  if (phase === 'approach') run.attempt = { approach: record, departure: null, theftNumber: null, reported: false };
  else run.attempt.departure = record;
  run.stage = phase;
  return true;
}

/** Record only a real completed one-day attendance. A zero-day pause does not. */
export function recordCountingTablePhaseAttendance(s, run, phase, { startedDay } = {}) {
  if (!validateCountingTableCase(run, s) || run.status !== 'active' || run.stage !== phase) return false;
  const record = run.attempt?.[phase];
  if (!record || record.completedDay !== null || !integer(startedDay, record.commitment.committedDay, s.day - 1)
    || s.day !== startedDay + 1) return false;
  record.startedDay = startedDay; record.completedDay = s.day;
  return true;
}

function successProof(s, run, id) {
  return recordEvidenceOnce(run, { id, kind: 'inspection', day: s.day, locationId: run.locationId,
    actorIds: [], objectId: run.target.id, verified: true, disposition: 'observed' });
}
function namedReport(s, run, ctx, reason) {
  ctx.addEvidence(3, `${run.target.ownerName} identified you in ${reason} involving their engraved household silver at the Market. The report belongs to this settlement.`);
  ctx.standing?.('villagers', -5); run.attempt.reported = true;
}

/** Synchronous owner transition. Law stays in ctx.addEvidence, not another ledger. */
export function resolveCountingTablePhase(s, run, phase, ctx = {}) {
  if (!validateCountingTableCase(run, s) || run.status !== 'active' || run.stage !== phase) return { status: 'unavailable' };
  const record = run.attempt?.[phase];
  if (!record || record.completedDay === null || record.succeeded !== null) return { status: 'unavailable' };
  const reason = countingTableAttemptReason(s, run);
  if (reason) return { status: 'blocked', reason };
  const succeeded = record.commitment.roll < record.commitment.chance;
  const witnessed = phase === 'departure' && succeeded && record.commitment.witnessRoll < record.commitment.witnessChance;
  if ((!succeeded || witnessed) && typeof ctx.addEvidence !== 'function') return { status: 'blocked', reason: 'The existing local report service is unavailable. Nothing has been awarded.' };
  if (phase === 'approach') {
    s.justice.thefts++; run.attempt.theftNumber = s.justice.thefts; record.succeeded = succeeded;
    if (succeeded) { successProof(s, run, 'approach_opened'); run.stage = 'opportunity'; return { status: 'opportunity' }; }
    run.status = 'failed'; run.stage = 'closed'; run.completedDay = s.day;
    run.ending = `${run.target.ownerName} identified your ${methodName(run.method)} approach. You left the silver behind; a named local report remains.`;
    namedReport(s, run, ctx, 'a failed ' + methodName(run.method) + ' approach');
    return { status: 'failed', ending: run.ending };
  }
  if (!succeeded) {
    record.succeeded = false; run.status = 'failed'; run.stage = 'closed'; run.completedDay = s.day;
    run.ending = `You could not get clear with ${run.target.name} and left it behind. ${run.target.ownerName} identified the attempted taking in a local report.`;
    namedReport(s, run, ctx, 'a failed departure after a ' + methodName(run.method) + ' approach');
    return { status: 'failed', ending: run.ending };
  }
  const finished = structuredClone(run), lootId = `theft-${run.life.generation}-${run.attempt.theftNumber}`;
  finished.attempt.departure.succeeded = true;
  if (!successProof(s, finished, 'silver_departed')) return { status: 'unavailable' };
  const ending = `You got clear with ${run.target.name} through the ${methodName(run.method)} approach. The same stolen valuable is in your bag; no Gold was awarded.${witnessed ? ' The merchant identified you, leaving a named local report.' : ' No new witness identified you during this job.'}`;
  if (!finishObjectiveOnce(finished, { day: s.day, ending, requiredIds: [...COUNTING_TABLE_STEPS[run.method], 'approach_opened', 'silver_departed'] })) return { status: 'unavailable' };
  finished.stage = 'closed'; finished.lootId = lootId;
  const loot = claimHouseholdSilver(s, run.target, { lootId });
  if (!loot) return { status: 'blocked', reason: 'The exact target or bag changed. No silver was awarded; withdraw or resolve the recorded blocker.' };
  Object.assign(run, finished);
  const skill = { stealth: 'stealth', social: 'persuasion', inside: 'scholarship' }[run.method];
  s.hero.skills[skill]++; ctx.standing?.('underworld', 2); ctx.breakOath?.('You took another household’s property.');
  if (witnessed) namedReport(s, run, ctx, 'a witnessed ' + methodName(run.method) + ' theft');
  return { status: 'completed', ending: run.ending, loot };
}

export function withdrawCountingTableCase(s, run) {
  if (!validateCountingTableCase(run, s) || run.status !== 'active') return false;
  run.status = 'withdrawn'; run.stage = 'closed'; run.completedDay = s.day;
  run.ending = `You withdrew from the ${methodName(run.method)} plan for ${run.target.name}. Your attended days remain recorded; you took no silver and earned no Gold.`;
  return true;
}

export function validateCountingTableCase(run, s) {
  if (run === undefined) return true;
  const allowedKeys = ['version', 'definitionId', 'life', 'acceptedDay', 'locationId', 'regionId', 'target', 'cast', 'method', 'status', 'stage', 'work', 'evidence', 'attempt', 'ending', 'completedDay', 'lootId'];
  const actorKeys = ['id', 'sourceId', 'source', 'name', 'role', 'locationId', 'roomId', 'serviceKind', 'subjectId'];
  if (!object(run) || Object.keys(run).length !== allowedKeys.length || !Object.keys(run).every(key => allowedKeys.includes(key))
    || run.version !== 1 || run.definitionId !== 'market_silver' || !object(run.life) || Object.keys(run.life).length !== 3
    || !Object.keys(run.life).every(key => ['personId', 'generation', 'birthDay'].includes(key))
    || !(run.life.personId === null || text(run.life.personId)) || !integer(run.life.generation, 1)
    || !integer(run.life.birthDay, 0, s.day) || !same(run.life, countingTableLife(s)) || !integer(run.acceptedDay, 0, s.day)
    || !validateHouseholdSilver(run.target, s) || run.target.worldYear !== Math.floor(run.acceptedDay / 365)
    || run.locationId !== run.target.locationId || run.regionId !== run.target.regionId || run.regionId !== 'bellwater'
    || !COUNTING_TABLE_METHODS.includes(run.method) || !['active', 'completed', 'failed', 'withdrawn'].includes(run.status)
    || !['preparation', 'prepared', 'approach', 'opportunity', 'departure', 'closed'].includes(run.stage)
    || !object(run.cast) || Object.keys(run.cast).length !== 2 || !Object.keys(run.cast).every(key => ['merchant', 'quietTable'].includes(key))) return false;
  const validActor = p => object(p) && Object.keys(p).length === actorKeys.length && Object.keys(p).every(key => actorKeys.includes(key))
    && text(p.id) && text(p.sourceId) && text(p.name, 120) && text(p.role, 120) && p.source === 'service'
    && p.locationId === run.locationId && text(p.roomId, 40) && text(p.serviceKind, 40) && (p.subjectId === null || text(p.subjectId));
  if (!validActor(run.cast.merchant) || run.cast.merchant.sourceId !== run.target.ownerId || run.cast.merchant.id === run.target.ownerId
    || run.cast.merchant.serviceKind !== 'merchant' || run.cast.merchant.subjectId !== 'market' || run.cast.merchant.roomId !== 'market'
    || (run.method === 'inside' ? !validActor(run.cast.quietTable) || run.cast.quietTable.serviceKind !== 'faction'
      || run.cast.quietTable.subjectId !== 'quiet_table' || !['tavern', 'hall'].includes(run.cast.quietTable.roomId)
      || run.cast.quietTable.sourceId !== run.cast.quietTable.id : run.cast.quietTable !== null)) return false;
  const steps = COUNTING_TABLE_STEPS[run.method];
  if (!Array.isArray(run.work) || run.work.length > steps.length
    || !run.work.every((work, index) => object(work) && Object.keys(work).length === 3 && Object.keys(work).every(key => ['id', 'startedDay', 'completedDay'].includes(key))
      && work.id === steps[index] && integer(work.startedDay, index ? run.work[index - 1].completedDay : run.acceptedDay, s.day)
      && work.completedDay === work.startedDay + 1 && work.completedDay <= s.day)
    || !validateObjectiveEvidence(run.evidence, { day: s.day, site: id => id === run.locationId,
      actor: id => Object.values(run.cast).some(p => p?.id === id), allowedIds: [...steps, 'approach_opened', 'silver_departed'], objectId: id => id === run.target.id })
    || run.evidence.length < run.work.length) return false;
  if (!run.work.every((work, index) => {
    const proof = run.evidence[index], key = actorKey(work.id);
    return proof.id === work.id && proof.day === work.completedDay && proof.day > run.acceptedDay
      && proof.kind === proofKinds[work.id] && proof.verified === true && proof.disposition === dispositionFor(work.id)
      && proof.objectId === run.target.id && proof.sourceRevision === undefined
      && same(proof.actorIds, key ? [run.cast[key].id] : []);
  })) return false;
  const terminal = run.status !== 'active';
  if (terminal ? run.stage !== 'closed' || !integer(run.completedDay, run.acceptedDay, s.day) || !text(run.ending, 2000)
    : run.completedDay !== null || run.ending !== null) return false;
  if (run.status !== 'completed' && run.lootId !== null) return false;
  if (run.attempt === null) return run.evidence.length === run.work.length && run.lootId === null
    && (run.status === 'withdrawn' || run.status === 'active' && run.stage === (run.work.length === 3 ? 'prepared' : 'preparation'))
    && (!terminal || run.completedDay >= (run.work.at(-1)?.completedDay ?? run.acceptedDay));
  const attempt = run.attempt;
  if (!object(attempt) || Object.keys(attempt).length !== 4 || !Object.keys(attempt).every(key => ['approach', 'departure', 'theftNumber', 'reported'].includes(key))
    || run.work.length !== 3 || typeof attempt.reported !== 'boolean') return false;
  const validPhase = (record, phase, earliest) => {
    if (!object(record) || Object.keys(record).length !== 4 || !Object.keys(record).every(key => ['commitment', 'startedDay', 'completedDay', 'succeeded'].includes(key))
      || !validateCountingTablePhaseCommitment(record.commitment, run, s) || record.commitment.phase !== phase || record.commitment.committedDay < earliest) return false;
    if (record.completedDay === null) return record.startedDay === null && record.succeeded === null;
    return integer(record.startedDay, record.commitment.committedDay, s.day - 1) && record.completedDay === record.startedDay + 1 && record.completedDay <= s.day
      && (record.succeeded === null || typeof record.succeeded === 'boolean' && record.succeeded === (record.commitment.roll < record.commitment.chance));
  };
  if (!validPhase(attempt.approach, 'approach', run.work.at(-1).completedDay)) return false;
  const approach = attempt.approach, departure = attempt.departure;
  const proofFor = id => run.evidence.find(proof => proof.id === id);
  const approachProof = proofFor('approach_opened'), departureProof = proofFor('silver_departed');
  const phaseProof = (proof, record) => !!proof && proof.day >= record.completedDay && proof.kind === 'inspection' && proof.verified === true
    && proof.disposition === 'observed' && proof.actorIds.length === 0 && proof.objectId === run.target.id && proof.sourceRevision === undefined;
  if (approach.succeeded === null ? attempt.theftNumber !== null || approachProof || departure !== null
    : !integer(attempt.theftNumber, 1, s.justice.thefts)) return false;
  if (approach.succeeded === true ? !phaseProof(approachProof, approach) : !!approachProof || departure !== null) return false;
  if (departure !== null && (!validPhase(departure, 'departure', approachProof.day) || approach.succeeded !== true)) return false;
  if (departure?.succeeded === true ? !phaseProof(departureProof, departure) : !!departureProof) return false;
  const expectedIds = [...steps, ...(approach.succeeded === true ? ['approach_opened'] : []), ...(departure?.succeeded === true ? ['silver_departed'] : [])];
  if (run.evidence.length !== expectedIds.length || !run.evidence.every((proof, index) => proof.id === expectedIds[index])
    || terminal && run.completedDay < (departure?.completedDay ?? approach.completedDay ?? approach.commitment.committedDay)) return false;
  if (run.status === 'active') return !attempt.reported && (approach.succeeded === null ? run.stage === 'approach'
    : approach.succeeded === true && (departure === null ? run.stage === 'opportunity' : departure.succeeded === null && run.stage === 'departure'));
  if (run.status === 'withdrawn') return !attempt.reported && approach.succeeded !== false && departure?.succeeded == null;
  if (run.status === 'failed') return attempt.reported && (approach.succeeded === false || approach.succeeded === true && departure?.succeeded === false);
  if (approach.succeeded !== true || departure?.succeeded !== true || departureProof.day !== run.completedDay
    || run.lootId !== `theft-${run.life.generation}-${attempt.theftNumber}` || !s.justice.takenProperties.includes(run.target.id)
    || attempt.reported !== (departure.commitment.witnessRoll < departure.commitment.witnessChance)) return false;
  const held = s.adventuring.loot.filter(loot => loot.id === run.lootId);
  return held.length <= 1 && held.every(loot => loot.stolen === true && loot.propertyId === run.target.id && loot.ownerId === run.target.ownerId
    && loot.ownerName === run.target.ownerName && loot.name === run.target.name && loot.value === run.target.value && loot.source === run.locationId
    && loot.day === run.completedDay && loot.itemId === undefined && loot.gearId === undefined)
    && ![...(s.equipment?.instances || []), ...(s.justice.propertyTransfers || [])].some(item => item.provenance?.lootId === run.lootId);
}
