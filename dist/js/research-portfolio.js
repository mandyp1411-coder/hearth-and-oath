import { validateObjectiveEvidence, evidenceFor } from './objective-evidence.js';
import { RESEARCH_VERSION, researchDefinition, researchSource, researchInterpretation, researchObjectId } from './research-definitions.js';
import { researchRecallScene } from './research-recall-content.js';

const plain = value => !!value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const text = (value, max = 160) => typeof value === 'string' && value.length > 0 && value.length <= max;
const int = (value, min = 0, max = 10000000) => Number.isSafeInteger(value) && value >= min && value <= max;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const unique = rows => Array.isArray(rows) && new Set(rows).size === rows.length;
const clone = value => structuredClone(value);
const hasSite = (s, id) => s.world?.locations?.some(place => place.id === id);
export const researchOwnerId = s => s.dynasty?.activePersonId || `research-life-${s.dynasty?.generation || 1}`;
const generation = s => s.dynasty?.generation || 1;
export const researchRunId = (s, definitionId) => `research-g${generation(s)}-${definitionId}`;
export const researchSourceEvidenceId = sourceId => `source-${sourceId}`;
const consentId = (sourceId, scope) => `consent-${scope}-${sourceId}`;
const actorAtRevision = (run, revision) => revision === 0 ? run.cast.archivist : run.custody[revision - 1]?.to;
const sourceEvidence = (run, id) => evidenceFor(run, researchSourceEvidenceId(id));

/** Only a real choice should call this. Read models never initialize a ledger. */
export function makeResearchPortfolio(s) {
  return { version: RESEARCH_VERSION, introducedDay: s.day, ownerId: researchOwnerId(s), invitations: {}, runs: [], activeRunId: null, pending: null, project: null };
}

export function captureResearchActor(person, { serviceKind, roomId, day }) {
  return { id: person.id, name: person.name, role: person.role, locationId: person.locationId,
    serviceKind, serviceId: `${serviceKind}-${person.locationId}`, roomId, capturedDay: day };
}

/** Availability is checked at action time, not inferred from historical dates.
 * Reconciliation runs after a completed action. A proof legitimately written
 * before that reconciliation can therefore share the recorded retirement day.
 * The custody revision identifies the actual holder before/after a handoff. */
export function researchActorAvailable(s, ref, services) {
  const record = ref && s.npcContinuity?.people?.[ref.id];
  if (!record || record.retiredDay !== null || (s.life?.people || []).some(person => person.id === ref.id && person.alive === false)) return false;
  return services.some(service => service.personId === ref.id && service.kind === ref.serviceKind
    && service.locationId === ref.locationId && service.roomId === ref.roomId
    && service.person?.name === ref.name && service.person.role === ref.role
    && service.person.available !== false && service.person.alive !== false && !service.person.retired);
}

export function makeResearchRun(s, definitionId, { locationId, archivist }) {
  if (!researchDefinition(definitionId)) return null;
  return { version: RESEARCH_VERSION, id: researchRunId(s, definitionId), definitionId,
    ownerId: researchOwnerId(s), generation: generation(s), authorName: s.hero.name,
    acceptedDay: s.day, locationId, status: 'active', cast: { archivist: clone(archivist), craftsperson: null },
    custody: [], copies: [], permissions: [], evidence: [], steps: [], comparison: null,
    interpretationId: null, claims: [], openQuestions: [], finalization: null, recalls: [], endedDay: null };
}

export function researchInterpretationReason(run, interpretationId) {
  const definition = researchDefinition(run?.definitionId), reading = researchInterpretation(run?.definitionId, interpretationId);
  if (!definition || !reading || run.status !== 'active') return 'This reading does not belong to an active question.';
  if (!run.comparison) return 'Complete the home comparison first.';
  if (!definition.requiredSources.every(id => run.comparison.sourceIds.includes(id) && sourceEvidence(run, id)?.verified)) return 'The required sources have not actually been compared.';
  return reading.supported ? null : reading.explanation;
}

/** A wrong reading remains a revisable draft. It does not complete or punish. */
export function selectResearchInterpretation(run, interpretationId) {
  const reading = researchInterpretation(run?.definitionId, interpretationId);
  if (!reading || run.status !== 'active' || !run.comparison) return false;
  run.interpretationId = reading.id;
  run.claims = clone(reading.claims);
  run.openQuestions = clone(reading.openQuestions);
  return true;
}

function canQuote(run, sourceId, day = Infinity) {
  const source = researchSource(run.definitionId, sourceId);
  if (!source || !sourceEvidence(run, sourceId) || sourceEvidence(run, sourceId).day > day) return false;
  return source.scope === 'public' || run.permissions.some(permission => permission.sourceId === sourceId
    && permission.scope === 'quote' && permission.decision === 'willing' && permission.ownerId === run.ownerId
    && permission.personId === run.cast.craftsperson?.id && permission.day <= day);
}

/** The preview is a projection of acquired sources, never a blanket release. */
export function researchConclusionPreview(run, { audience = 'self', quoteSourceIds = [] } = {}) {
  const reading = researchInterpretation(run?.definitionId, run?.interpretationId);
  if (!reading?.supported || !run.comparison || !['self', 'private', 'public'].includes(audience)
    || !unique(quoteSourceIds) || !quoteSourceIds.every(id => audience === 'self' ? !!sourceEvidence(run, id) : canQuote(run, id))) return null;
  const definition = researchDefinition(run.definitionId);
  return { title: definition.title, authorName: run.authorName, conclusion: reading.conclusion,
    claims: clone(run.claims), openQuestions: [...run.openQuestions],
    credits: definition.sources.filter(source => !!sourceEvidence(run, source.id) && source.scope === 'public')
      .map(source => ({ sourceId: source.id, attribution: source.attribution })),
    quotations: quoteSourceIds.map(id => ({ sourceId: id, text: researchSource(run.definitionId, id).text })), audience };
}

/** Later conversation adapters must still establish actual presence and reply. */
export function researchRecallCandidate(s, personId) {
  const portfolio = s.researchPortfolio;
  if (!portfolio || portfolio.ownerId !== researchOwnerId(s)) return null;
  const run = portfolio.runs.findLast(row => row.ownerId === researchOwnerId(s) && row.status === 'completed'
    && row.finalization?.recipientId === personId && row.finalization.day < s.day
    && !row.recalls.some(receipt => receipt.personId === personId));
  const reading = run && researchInterpretation(run.definitionId, run.interpretationId);
  return reading ? { runId: run.id, personId, interpretationId: reading.id, conclusion: reading.conclusion, recall: reading.recall } : null;
}

export function validateResearchActor(ref, s, kind, npcRecord = id => s.npcContinuity?.people?.[id] || null) {
  if (!keys(ref, ['id', 'name', 'role', 'locationId', 'serviceKind', 'serviceId', 'roomId', 'capturedDay'])
    || !text(ref.id) || !text(ref.name, 100) || !hasSite(s, ref.locationId) || !int(ref.capturedDay, 0, s.day)
    || ref.serviceKind !== kind || ref.serviceId !== `${kind}-${ref.locationId}`
    || ref.role !== (kind === 'archivist' ? 'Archivist' : 'Craftsperson')
    || !(kind === 'archivist' ? ref.roomId === 'archive' : ['market', 'workyard'].includes(ref.roomId))) return false;
  // The integrated caller validates NPC16 before passing this owner. An old
  // exact-ID sidecar is authoritative; absence cannot become an office alias.
  const record = npcRecord(ref.id);
  return !!record && record.slotKey === `service:${ref.locationId}:${kind}:`
    && record.snapshot?.id === ref.id && record.snapshot.name === ref.name && record.snapshot.role === ref.role
    && record.snapshot.locationId === ref.locationId && int(record.observedDay, 0, ref.capturedDay)
    && (record.retiredDay === null || int(record.retiredDay, ref.capturedDay, s.day));
}
const validActor = validateResearchActor;

const stepKeys = ['id', 'sourceId', 'mode', 'actorId', 'locationId', 'roomId', 'startedDay', 'completedDay', 'days', 'sourceRevision'];
const stepModes = ['home-copy', 'archive-copy', 'consultation', 'comparison', 'archive-deposit', 'home-collection'];
function validStep(step, run, s) {
  if (!keys(step, stepKeys) || !text(step.id) || !stepModes.includes(step.mode)
    || !int(step.startedDay, run.acceptedDay, s.day) || !int(step.completedDay, step.startedDay, s.day)
    || !int(step.days, 0, 1) || step.completedDay - step.startedDay < step.days
    || step.locationId !== run.locationId || !int(step.sourceRevision, 0, run.custody.length)) return false;
  if (step.mode === 'comparison') return step.id === 'comparison' && step.sourceId === null && step.actorId === null && step.roomId === 'homes' && step.days === 1 && step.sourceRevision === 0;
  if (step.mode === 'consultation') return step.id === 'source-maker_margin' && step.sourceId === 'maker_margin'
    && step.actorId === run.cast.craftsperson?.id && step.roomId === run.cast.craftsperson.roomId && step.days === 1 && step.sourceRevision === 0;
  if (['home-copy', 'archive-copy'].includes(step.mode)) return researchSource(run.definitionId, step.sourceId)?.scope === 'public'
    && step.id === researchSourceEvidenceId(step.sourceId) && step.actorId === actorAtRevision(run, step.sourceRevision)?.id
    && step.roomId === (step.mode === 'home-copy' ? 'homes' : 'archive') && step.days === 1;
  return step.id === 'deposit' && step.sourceId === null && step.actorId === actorAtRevision(run, step.sourceRevision)?.id
    && step.roomId === (step.mode === 'home-collection' ? 'homes' : 'archive') && step.days === (step.mode === 'home-collection' ? 1 : 0);
}

function validEvidence(entry, run) {
  const source = researchSource(run.definitionId, entry.id.slice('source-'.length));
  if (entry.id.startsWith('source-')) {
    const step = run.steps.find(row => row.id === entry.id);
    if (!source || !step || entry.kind !== source.kind || entry.objectId !== researchObjectId(run.definitionId, source.id)
      || entry.day !== step.completedDay || entry.locationId !== step.locationId || entry.sourceRevision !== step.sourceRevision
      || !same(entry.actorIds, [step.actorId]) || entry.disposition !== 'intact') return false;
    if (source.scope === 'private') {
      const permission = run.permissions.find(row => row.sourceId === source.id && row.scope === 'hear');
      if (!permission || permission.decision !== 'willing' || permission.day > step.startedDay) return false;
    }
    return true;
  }
  if (entry.id.startsWith('consent-')) {
    const permission = run.permissions.find(row => consentId(row.sourceId, row.scope) === entry.id);
    return !!permission && entry.kind === 'consent' && entry.day === permission.day && entry.locationId === run.locationId
      && same(entry.actorIds, [permission.personId]) && entry.objectId === researchObjectId(run.definitionId, permission.sourceId)
      && entry.disposition === permission.decision && entry.sourceRevision === 0;
  }
  if (entry.id === 'comparison') return !!run.comparison && entry.kind === 'inspection' && entry.objectId === run.id
    && entry.day === run.comparison.completedDay && entry.locationId === run.locationId && same(entry.actorIds, [])
    && entry.disposition === 'observed' && entry.sourceRevision === 0;
  const step = run.steps.find(row => row.id === 'deposit'), final = run.finalization;
  return entry.id === 'deposit' && !!final && !!step && entry.kind === 'receipt' && entry.objectId === run.id
    && entry.day === final.day && entry.day === step.completedDay && entry.locationId === run.locationId
    && same(entry.actorIds, [final.recipientId]) && entry.disposition === 'returned' && entry.sourceRevision === step.sourceRevision;
}

export function validateResearchRun(run, s, { npcRecord = id => s.npcContinuity?.people?.[id] || null } = {}) {
  if (!keys(run, ['version', 'id', 'definitionId', 'ownerId', 'generation', 'authorName', 'acceptedDay', 'locationId', 'status', 'cast', 'custody', 'copies', 'permissions', 'evidence', 'steps', 'comparison', 'interpretationId', 'claims', 'openQuestions', 'finalization', 'recalls', 'endedDay'])) return false;
  const definition = researchDefinition(run.definitionId), reading = researchInterpretation(run.definitionId, run.interpretationId);
  if (!definition || run.version !== RESEARCH_VERSION || run.id !== researchRunId(s, definition.id)
    || run.ownerId !== researchOwnerId(s) || run.generation !== generation(s) || !text(run.authorName, 100)
    || !int(run.acceptedDay, 0, s.day) || !hasSite(s, run.locationId)
    || !['active', 'completed', 'withdrawn', 'interrupted'].includes(run.status) || !Array.isArray(run.evidence)
    || !run.evidence.every(entry => plain(entry) && text(entry.id))
    || !keys(run.cast, ['archivist', 'craftsperson']) || !validActor(run.cast.archivist, s, 'archivist', npcRecord)
    || run.cast.archivist.locationId !== run.locationId || run.cast.archivist.capturedDay !== run.acceptedDay
    || run.cast.craftsperson !== null && (!validActor(run.cast.craftsperson, s, 'smith', npcRecord) || run.definitionId !== 'third_mark'
      || run.cast.craftsperson.locationId !== run.locationId || run.cast.craftsperson.capturedDay < run.acceptedDay)) return false;
  if (!Array.isArray(run.custody) || run.custody.length > 12) return false;
  let priorActor = run.cast.archivist, priorDay = run.acceptedDay;
  for (const [index, handoff] of run.custody.entries()) {
    if (!keys(handoff, ['day', 'fromId', 'to', 'sourceRevision']) || !int(handoff.day, priorDay, s.day)
      || handoff.fromId !== priorActor.id || handoff.sourceRevision !== index + 1 || !validActor(handoff.to, s, 'archivist', npcRecord)
      || handoff.to.locationId !== run.locationId || handoff.to.capturedDay !== handoff.day
      || [run.cast.archivist.id, ...run.custody.slice(0, index).map(row => row.to.id)].includes(handoff.to.id)) return false;
    priorActor = handoff.to; priorDay = handoff.day;
  }
  if (!Array.isArray(run.steps) || run.steps.length > 5 || !unique(run.steps.map(step => step?.id)) || !run.steps.every(step => validStep(step, run, s))) return false;
  const attended = run.steps.filter(step => step.days > 0);
  if (attended.some((step, index) => index > 0 && step.startedDay < attended[index - 1].completedDay)) return false;
  if (!Array.isArray(run.permissions) || run.permissions.length > 2 || !unique(run.permissions.map(row => `${row?.sourceId}:${row?.scope}`))) return false;
  for (const permission of run.permissions) {
    if (!keys(permission, ['sourceId', 'personId', 'ownerId', 'day', 'scope', 'decision'])
      || permission.sourceId !== 'maker_margin' || definition.id !== 'third_mark' || !run.cast.craftsperson
      || permission.personId !== run.cast.craftsperson.id || permission.ownerId !== run.ownerId
      || !int(permission.day, run.cast.craftsperson.capturedDay, s.day) || !['hear', 'quote'].includes(permission.scope)
      || !['willing', 'refused'].includes(permission.decision)
      || (npcRecord(permission.personId)?.retiredDay !== null && npcRecord(permission.personId)?.retiredDay < permission.day)) return false;
    if (permission.scope === 'quote' && (!sourceEvidence(run, permission.sourceId) || permission.day < sourceEvidence(run, permission.sourceId).day)) return false;
  }
  if (!Array.isArray(run.copies) || run.copies.length > 3 || !unique(run.copies.map(row => row?.sourceId))) return false;
  for (const copy of run.copies) {
    if (!plain(copy)) return false;
    const source = researchSource(definition.id, copy.sourceId), step = run.steps.find(row => row.sourceId === copy.sourceId);
    if (!keys(copy, ['sourceId', 'objectId', 'originLocationId', 'institutionId', 'custodyLocationId', 'custodianId', 'requestedDay', 'preparedDay', 'receivedDay', 'sourceRevision'])
      || !source || source.scope !== 'public' || copy.objectId !== researchObjectId(definition.id, source.id)
      || copy.originLocationId !== source.originLocationId || copy.institutionId !== `${source.originLocationId}_${source.institutionKind}`
      || !s.world.locations.find(site => site.id === copy.originLocationId)?.institutions?.some(institution => institution.id === copy.institutionId && institution.kind === source.institutionKind)
      || copy.custodyLocationId !== run.locationId || !int(copy.sourceRevision, 0, run.custody.length)
      || copy.custodianId !== actorAtRevision(run, copy.sourceRevision)?.id || !step || !['home-copy', 'archive-copy'].includes(step.mode)
      || !int(copy.requestedDay, run.acceptedDay, s.day) || !int(copy.preparedDay, copy.requestedDay, s.day)
      || !int(copy.receivedDay, copy.preparedDay, s.day) || copy.receivedDay !== step.completedDay
      || copy.requestedDay !== step.startedDay || copy.sourceRevision !== step.sourceRevision) return false;
  }
  const actorIds = [run.cast.archivist.id, run.cast.craftsperson?.id, ...run.custody.map(row => row.to.id)].filter(Boolean);
  const allowedIds = [...definition.sources.map(source => researchSourceEvidenceId(source.id)), 'comparison', 'deposit', 'consent-hear-maker_margin', 'consent-quote-maker_margin'];
  if (!validateObjectiveEvidence(run.evidence, { day: s.day, site: id => hasSite(s, id), actor: id => actorIds.includes(id), allowedIds,
    objectId: id => id === run.id || definition.sources.some(source => researchObjectId(definition.id, source.id) === id) })
    || run.evidence.some(entry => !entry.verified || entry.day < run.acceptedDay || !validEvidence(entry, run))) return false;
  for (const copy of run.copies) if (!sourceEvidence(run, copy.sourceId)) return false;
  for (const source of definition.sources) {
    const entry = sourceEvidence(run, source.id), step = run.steps.find(row => row.id === researchSourceEvidenceId(source.id));
    if (!!entry !== !!step || source.scope === 'public' && !!entry !== run.copies.some(row => row.sourceId === source.id)) return false;
  }
  for (const permission of run.permissions) if (!evidenceFor(run, consentId(permission.sourceId, permission.scope))) return false;
  for (const step of run.steps) {
    const actor = step.mode === 'consultation' ? run.cast.craftsperson : actorAtRevision(run, step.sourceRevision);
    if (step.mode !== 'comparison' && (!actor || actor.capturedDay > step.startedDay
      || (npcRecord(actor.id)?.retiredDay !== null && npcRecord(actor.id)?.retiredDay < step.completedDay))) return false;
    if (step.mode !== 'consultation' && step.sourceRevision > 0 && run.custody[step.sourceRevision - 1].day > step.startedDay) return false;
    const nextHandoff = run.custody[step.sourceRevision];
    if (step.mode !== 'comparison' && step.mode !== 'consultation' && nextHandoff && nextHandoff.day < step.completedDay) return false;
  }
  const comparisonStep = run.steps.find(step => step.id === 'comparison');
  if (run.comparison === null) {
    if (comparisonStep || evidenceFor(run, 'comparison') || run.interpretationId !== null || !same(run.claims, []) || !same(run.openQuestions, [])) return false;
  } else {
    const comparison = run.comparison;
    if (!keys(comparison, ['startedDay', 'completedDay', 'days', 'practiceApplied', 'sourceIds']) || !comparisonStep
      || comparison.startedDay !== comparisonStep.startedDay || comparison.completedDay !== comparisonStep.completedDay
      || comparison.days !== 1 || comparison.practiceApplied !== true || !evidenceFor(run, 'comparison')
      || !unique(comparison.sourceIds) || comparison.sourceIds.length < definition.requiredSources.length || comparison.sourceIds.length > definition.sources.length
      || !definition.requiredSources.every(id => comparison.sourceIds.includes(id))
      || !comparison.sourceIds.every(id => sourceEvidence(run, id)?.day <= comparison.startedDay)) return false;
    if (run.interpretationId === null ? !same(run.claims, []) || !same(run.openQuestions, [])
      : !reading || !same(run.claims, reading.claims) || !same(run.openQuestions, reading.openQuestions)) return false;
  }
  const final = run.finalization, deposit = run.steps.find(step => step.id === 'deposit');
  if (run.status === 'completed') {
    if (!reading?.supported || !run.comparison || !keys(final, ['audience', 'day', 'recipientId', 'quoteSourceIds', 'mode'])
      || !int(final.day, run.comparison.completedDay, s.day) || run.endedDay !== final.day
      || !['public', 'private', 'self'].includes(final.audience) || !unique(final.quoteSourceIds)
      || !final.quoteSourceIds.every(id => final.audience === 'self' ? sourceEvidence(run, id)?.day <= final.day : canQuote(run, id, final.day))) return false;
    if (final.audience === 'self') {
      if (final.mode !== 'self' || final.recipientId !== null || deposit || evidenceFor(run, 'deposit')) return false;
    } else if (!deposit || !evidenceFor(run, 'deposit') || !['archive-deposit', 'home-collection'].includes(final.mode)
      || final.mode !== deposit.mode || final.recipientId !== deposit.actorId || final.day !== deposit.completedDay
      || deposit.startedDay < run.comparison.completedDay) return false;
  } else if (final !== null || deposit || evidenceFor(run, 'deposit') || (run.status === 'active' ? run.endedDay !== null : !int(run.endedDay, run.acceptedDay, s.day))) return false;
  if (run.status !== 'active' && (run.steps.some(step => step.completedDay > run.endedDay)
    || run.evidence.some(entry => entry.day > run.endedDay) || run.permissions.some(permission => permission.day > run.endedDay)
    || run.custody.some(handoff => handoff.day > run.endedDay))) return false;
  if (!Array.isArray(run.recalls) || run.recalls.length > 1 || !unique(run.recalls.map(receipt => receipt?.personId))) return false;
  return run.recalls.every(receipt => keys(receipt, ['personId', 'day', 'interpretationId', 'openingId', 'replyId', 'choiceId']) && run.status === 'completed'
    && receipt.personId === final.recipientId && receipt.interpretationId === run.interpretationId && int(receipt.day, final.day + 1, s.day)
    && npcRecord(receipt.personId)?.observedDay <= receipt.day
    && (npcRecord(receipt.personId)?.retiredDay === null || npcRecord(receipt.personId)?.retiredDay >= receipt.day)
    && validRecallMessages(receipt, run, s, npcRecord));
}

function validRecallMessages(receipt, run, s, npcRecord) {
  if (!/^letter-[1-9]\d*$/.test(receipt.openingId) || !/^letter-[1-9]\d*$/.test(receipt.replyId)
    || Number(receipt.openingId.slice(7)) >= Number(receipt.replyId.slice(7)) - 1
    || Number(receipt.replyId.slice(7)) > (s.conversations?.sequence || 0)) return false;
  const scene = researchRecallScene(run, npcRecord(receipt.personId).snapshot), choice = scene.choices.find(choice => choice.id === receipt.choiceId);
  if (!choice) return false;
  const thread = s.conversations?.threads?.[receipt.personId] || [], opening = thread.find(message => message.id === receipt.openingId),
    question = thread.find(message => message.id === `letter-${Number(receipt.replyId.slice(7)) - 1}`), reply = thread.find(message => message.id === receipt.replyId);
  return (!opening || opening.speaker === receipt.personId && opening.text === scene.body && opening.day <= receipt.day)
    && (!question || question.speaker === 'hero' && question.text === choice.text && question.day === receipt.day)
    && (!reply || reply.speaker === receipt.personId && reply.text === choice.response && reply.day === receipt.day);
}

export function validateResearchPortfolio(value, s, options = {}) {
  if (value === undefined) return true;
  if (!keys(value, ['version', 'introducedDay', 'ownerId', 'invitations', 'runs', 'activeRunId', 'pending', 'project'])
    || value.version !== RESEARCH_VERSION || value.ownerId !== researchOwnerId(s) || !int(value.introducedDay, 0, s.day)
    || !keys(value.invitations, ['third_mark', 'early_bell'])
    || !Object.entries(value.invitations).every(([id, decision]) => researchDefinition(id) && ['declined', 'later', 'accepted'].includes(decision))
    || !Array.isArray(value.runs) || value.runs.length > 2 || !unique(value.runs.map(run => run?.definitionId))
    || !value.runs.every(run => plain(run) && run.acceptedDay >= value.introducedDay && validateResearchRun(run, s, options))) return false;
  const active = value.runs.filter(run => run.status === 'active');
  if (active.length > 1 || value.activeRunId !== (active[0]?.id || null)
    || !value.runs.every(run => value.invitations[run.definitionId] === 'accepted')
    || Object.entries(value.invitations).some(([id, choice]) => choice === 'accepted' && !value.runs.some(run => run.definitionId === id))) return false;
  if (value.pending !== null) {
    const pending = value.pending;
    if (!keys(pending, ['runId', 'sceneId', 'sourceId', 'actorId']) || pending.runId !== active[0]?.id
      || !['source', 'compare', 'interpret', 'conclude', 'consent', 'quote'].includes(pending.sceneId)
      || pending.sourceId !== null && !researchSource(active[0].definitionId, pending.sourceId)
      || pending.actorId !== null && ![active[0].cast.archivist.id, active[0].cast.craftsperson?.id, ...active[0].custody.map(row => row.to.id)].includes(pending.actorId)) return false;
    const run = active[0], source = researchSource(run.definitionId, pending.sourceId);
    if (pending.sceneId === 'source' && (!source || sourceEvidence(run, source.id)
      || pending.actorId !== (source.scope === 'private' ? run.cast.craftsperson?.id : actorAtRevision(run, run.custody.length)?.id))) return false;
    if (['consent', 'quote'].includes(pending.sceneId) && (pending.sourceId !== 'maker_margin' || !run.cast.craftsperson || pending.actorId !== run.cast.craftsperson.id)) return false;
    if (pending.sceneId === 'quote' && !sourceEvidence(run, 'maker_margin')) return false;
    if (['compare', 'interpret', 'conclude'].includes(pending.sceneId) && (pending.sourceId !== null || pending.actorId !== null)) return false;
    if (pending.sceneId === 'compare' && (run.comparison || !researchDefinition(run.definitionId).requiredSources.every(id => sourceEvidence(run, id)))) return false;
    if (['interpret', 'conclude'].includes(pending.sceneId) && !run.comparison) return false;
  }
  if (value.project !== null) {
    const p = value.project, run = active[0];
    if (s.phase === 'retired' || s.life?.plan || s.timeline?.journey || s.dungeon || s.maze || s.adventuring?.expedition
      || s.rpg?.expedition || s.justice?.prison || s.conversations?.pending) return false;
    if (!run || value.pending !== null || !keys(p, [...stepKeys, 'runId', 'totalDays', 'completedDays', 'remainingDays', 'terms']) || p.runId !== run.id
      || !int(p.totalDays, 1, 1) || !int(p.completedDays, 0, p.totalDays) || p.remainingDays !== p.totalDays - p.completedDays
      || p.completedDay !== null || p.days !== p.totalDays || run.steps.some(step => step.id === p.id)
      || !validStep({ ...Object.fromEntries(stepKeys.map(key => [key, p[key]])), completedDay: s.day + p.remainingDays }, run, { ...s, day: s.day + p.remainingDays })
      || p.startedDay > s.day || p.startedDay + p.completedDays > s.day) return false;
    if (p.id === 'deposit') {
      if (!keys(p.terms, ['audience', 'quoteSourceIds', 'interpretationId']) || Object.keys(p.terms).length !== 3 || !['public', 'private'].includes(p.terms.audience)
        || p.terms.interpretationId !== run.interpretationId || !researchConclusionPreview(run, { audience: p.terms.audience, quoteSourceIds: p.terms.quoteSourceIds })) return false;
    } else if (p.terms !== null && p.terms !== undefined) return false;
  }
  return true;
}
