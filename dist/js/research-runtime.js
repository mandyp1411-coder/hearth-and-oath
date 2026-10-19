import { localWorkLocked } from './local-project-ownership.js';
import { settlementServices } from './world-services.js';
import { cityRooms } from './cartography.js';
import { initializeNpcContinuity, observeNpcContinuity } from './npc-continuity.js';
import { recordEvidenceOnce, evidenceFor } from './objective-evidence.js';
import { RESEARCH_VERSION, researchCatalog, researchDefinition, researchSource, researchInterpretation, researchObjectId } from './research-definitions.js';
import { makeResearchPortfolio, makeResearchRun, captureResearchActor, researchActorAvailable, researchOwnerId,
  researchSourceEvidenceId, researchInterpretationReason, selectResearchInterpretation, researchConclusionPreview, validateResearchPortfolio } from './research-portfolio.js';
import { researchOfferScene, researchRunScene, preserveResearchEvent } from './research-scenes.js';

const copy = value => structuredClone(value);
const room = s => s.cartography?.interior?.siteId === s.locationId ? s.cartography.interior.roomId : 'gate';
const activeRun = s => s.researchPortfolio?.runs.find(run => run.id === s.researchPortfolio.activeRunId) || null;
const archivedActor = run => run.custody.at(-1)?.to || run.cast.archivist;
const acquired = (run, id) => !!evidenceFor(run, researchSourceEvidenceId(id));
const closed = (s, id) => { const site = s.world.locations.find(place => place.id === id); return !site || ['destroyed', 'evacuated'].includes(site.status) || site.servicesAvailable === false || s.realm?.politics?.holds.some(hold => hold.siteId === id && hold.status === 'held'); };
const genuineHome = s => !!cityRooms(s).find(row => row.id === 'homes' && row.private === false);
const atHome = (s, run = null) => (!run || s.locationId === run.locationId) && room(s) === 'homes' && genuineHome(s);
const otherWork = s => localWorkLocked(s) || s.repertoire?.project || s.adventuring?.expedition || s.rpg?.expedition || s.rpg?.project || s.stories?.project || s.familyOrigins?.project || s.health?.recovery || s.society?.project || s.community?.project?.commitment || s.fellowship?.project || s.sanctuaries?.commitment || s.lineage?.adoption?.preparation || s.pastimes?.project || s.conversations?.project || s.workshop?.project || s.careers?.batch || s.life?.plan;
const ready = s => s.age >= 16 && s.phase !== 'retired' && !s.event && !s.battle && !s.conversations?.pending && !s.dungeon && !s.maze
  && !s.timeline?.journey && !s.cartography?.pending && !s.cartography?.offsite && !s.justice?.prison && !otherWork(s);
const services = (s, locationId = s.locationId) => settlementServices(s, { siteId: locationId });
const live = (s, ref) => !!ref && !closed(s, ref.locationId) && researchActorAvailable(s, ref, services(s, ref.locationId));
const here = (s, ref) => live(s, ref) && s.locationId === ref.locationId && room(s) === ref.roomId;
// Shared by the actual conclusion reducer and its non-persisted choice quote.
const conclusionDelivery = (s, run) => {
  const ref = archivedActor(run);
  const direct = here(s, ref);
  return { ref, mode: direct ? 'archive-deposit' : 'home-collection', days: direct ? 0 : 1 };
};
const offer = (id, label, description, reason = null, days = 0, ref = null) => ({ id, label, description, days, cost: 0, group: 'Research portfolio', researchObjective: true,
  ...(ref ? { objectiveServiceId: ref.serviceId, objectivePersonId: ref.id, objectiveRoomId: ref.roomId } : {}), ...(reason ? { disabledReason: reason } : {}) });
function capture(s, provider) {
  initializeNpcContinuity(s); observeNpcContinuity(s, [provider.person]);
  return captureResearchActor(provider.person, { serviceKind: provider.kind, roomId: provider.roomId, day: s.day });
}
function publicReason(s, run, ref = archivedActor(run)) {
  if (!live(s, ref)) return 'The exact recorded archivist is unavailable. Keep your acquired copies, explicitly arrange new public custody, or close the question; no successor inherits a private account.';
  return s.locationId !== run.locationId ? 'Return to the recorded home settlement.' : atHome(s, run) || here(s, ref) ? null : `Visit your actual home table or ${ref.name} at School & Archive.`;
}
function privateReason(s, ref) {
  return !live(s, ref) ? 'This exact craftsperson is unavailable; their successor cannot supply testimony or consent.' : here(s, ref) ? null : `Visit ${ref.name} at their real ${ref.roomId === 'workyard' ? 'Work Yard' : 'Market'} workbench.`;
}
function note(s, ctx, title, message) {
  s.notice = message;
  (ctx.journalLiteral || ctx.journal)?.(title, message, 'research', validateResearchPortfolio(s.researchPortfolio, s) ? { narrativeEdition: 30 } : {});
}
function token(s, run, id, kind, actorIds, objectId, disposition, sourceRevision = 0) {
  return recordEvidenceOnce(run, { id, kind, day: s.day, locationId: run.locationId, actorIds, objectId, disposition, verified: true, sourceRevision });
}
function openRunScene(s, ctx, sceneId) {
  const run = activeRun(s), privateScene = ['consent', 'quote'].includes(sceneId);
  const snapshot = researchRunScene(run, sceneId); if (!snapshot) return false;
  s.researchPortfolio.pending = { runId: run.id, sceneId, sourceId: privateScene ? 'maker_margin' : null, actorId: privateScene ? run.cast.craftsperson.id : null };
  ctx.setResearchEvent(snapshot); return true;
}
function startedStep(s, run, { id, sourceId = null, mode, actor = null, terms = null }) {
  return { runId: run.id, id, sourceId, mode, actorId: actor?.id || null, locationId: run.locationId,
    roomId: mode === 'comparison' || mode === 'home-copy' || mode === 'home-collection' ? 'homes' : actor.roomId,
    startedDay: s.day, completedDay: null, days: 1, sourceRevision: mode === 'consultation' || mode === 'comparison' ? 0 : run.custody.length,
    totalDays: 1, completedDays: 0, remainingDays: 1, terms: copy(terms) };
}
function completeFolio(s, ctx, run, { audience, quoteSourceIds = [], mode, recipientId = null }) {
  const preview = researchConclusionPreview(run, { audience, quoteSourceIds });
  if (!preview || run.status !== 'active') return false;
  run.status = 'completed'; run.endedDay = s.day;
  run.finalization = { audience, day: s.day, recipientId, quoteSourceIds: [...quoteSourceIds], mode };
  s.researchPortfolio.activeRunId = null; s.researchPortfolio.pending = null; s.researchPortfolio.project = null;
  note(s, ctx, preview.title, `${preview.conclusion}\n\nSources and credits: ${preview.credits.map(row => row.attribution).join(' ')}\n\nOpen questions: ${preview.openQuestions.join(' ')}\n\n${audience === 'self' ? 'This folio stays with you. No NPC is claimed to know the conclusion.' : audience === 'private' ? `Only ${archivedActor(run).name} received the analysis privately.` : `The supported finding was deposited with ${archivedActor(run).name} for the local public reading collection.`}${quoteSourceIds.includes('maker_margin') ? ' The explicitly permitted personal quotation was included.' : ' No private admission was quoted.'} No additional practice or Gold was awarded.`);
  return true;
}
function completeProject(s, ctx, project) {
  const run = activeRun(s), step = Object.fromEntries(['id', 'sourceId', 'mode', 'actorId', 'locationId', 'roomId', 'startedDay', 'completedDay', 'days', 'sourceRevision'].map(key => [key, project[key]]));
  step.completedDay = s.day;
  if (run.steps.some(row => row.id === step.id)) return false;
  run.steps.push(step); s.researchPortfolio.project = null;
  if (['home-copy', 'archive-copy'].includes(step.mode)) {
    const source = researchSource(run.definitionId, step.sourceId);
    run.copies.push({ sourceId: source.id, objectId: researchObjectId(run.definitionId, source.id), originLocationId: source.originLocationId,
      institutionId: `${source.originLocationId}_${source.institutionKind}`, custodyLocationId: run.locationId, custodianId: step.actorId,
      requestedDay: step.startedDay, preparedDay: s.day, receivedDay: s.day, sourceRevision: step.sourceRevision });
    token(s, run, step.id, source.kind, [step.actorId], researchObjectId(run.definitionId, source.id), 'intact', step.sourceRevision);
    note(s, ctx, source.title, `${source.text}\n\n${source.limit}\nA new local teaching copy was requested on day ${step.startedDay}, prepared and received on day ${s.day}. Original source: ${source.originLocationId} ${source.institutionKind}; actual reading and custody: ${s.world.locations.find(place => place.id === run.locationId).name}. No distant arrival or original-object inspection was claimed.`);
  } else if (step.mode === 'consultation') {
    const source = researchSource(run.definitionId, 'maker_margin'); token(s, run, step.id, 'testimony', [step.actorId], researchObjectId(run.definitionId, source.id), 'intact');
    note(s, ctx, source.title, `${run.cast.craftsperson.name}: ${source.text}\n\n${source.limit} No quotation permission has been inferred.`);
  } else if (step.mode === 'comparison') {
    run.comparison = { startedDay: step.startedDay, completedDay: s.day, days: 1, practiceApplied: true,
      sourceIds: researchDefinition(run.definitionId).sources.filter(source => acquired(run, source.id) && evidenceFor(run, researchSourceEvidenceId(source.id)).day <= step.startedDay).map(source => source.id) };
    token(s, run, 'comparison', 'inspection', [], run.id, 'observed');
    s.hero.skills.scholarship = Math.min(10000, s.hero.skills.scholarship + 1);
    note(s, ctx, 'A margin left for the inference', 'You kept one actual day comparing the acquired sources at home. Scholarship +1 was practiced once for this question. No Gold, wages, commission or faction rank was granted. Choose an interpretation when the current moment is finished; an interruption cannot erase the completed comparison.');
  } else {
    token(s, run, 'deposit', 'receipt', [step.actorId], run.id, 'returned', step.sourceRevision);
    return completeFolio(s, ctx, run, { ...project.terms, mode: step.mode, recipientId: step.actorId });
  }
  return true;
}
function projectReason(s, run, p) {
  if (p.mode === 'comparison') return atHome(s, run) && !closed(s, run.locationId) ? null : 'Return to the actual recorded home table before comparing these copies.';
  const ref = p.mode === 'consultation' ? run.cast.craftsperson : p.sourceRevision === 0 ? run.cast.archivist : run.custody[p.sourceRevision - 1]?.to;
  return p.mode === 'consultation' ? privateReason(s, ref) : publicReason(s, run, ref);
}
function attend(s, ctx) {
  const run = activeRun(s), p = s.researchPortfolio?.project;
  if (!run || !p || p.runId !== run.id) return false;
  const reason = projectReason(s, run, p); if (reason) { s.notice = reason; return true; }
  if (p.remainingDays) {
    const oldDay = s.day; ctx.spendDays(p.remainingDays); const actual = Math.max(0, Math.min(p.remainingDays, s.day - oldDay));
    p.completedDays += actual; p.remainingDays -= actual;
  }
  if (s.phase === 'retired') return true;
  if (p.remainingDays) { s.notice = 'The agreed research day is still pending. No unperformed source or comparison was claimed.'; return true; }
  const after = projectReason(s, run, p); if (after) { s.notice = `${after} The spent day remains spent; no new source or delivery was fabricated. You can cancel the remaining proposal.`; return true; }
  return completeProject(s, ctx, p);
}

export function researchActions(s) {
  if (!ready(s)) return [];
  const portfolio = s.researchPortfolio, run = activeRun(s);
  if (portfolio?.ownerId && portfolio.ownerId !== researchOwnerId(s)) return [];
  if (portfolio?.project) return [offer('research_continue', 'Continue the saved research day', 'Attend only the remaining agreed work. No source or practice reward is repeated.', projectReason(s, run, portfolio.project), portfolio.project.remainingDays), offer('research_cancel', 'Put the unfinished research step aside', 'Retain existing evidence and spent days; claim no unfinished source, comparison or delivery.')];
  if (!run) {
    if (!genuineHome(s) || !['homes', 'archive'].includes(room(s)) || closed(s, s.locationId)) return [];
    const provider = services(s).find(row => row.kind === 'archivist'); if (!provider) return [];
    const ref = captureResearchActor(provider.person, { serviceKind: 'archivist', roomId: 'archive', day: s.day });
    return researchCatalog(s).filter(row => !portfolio?.runs.some(run => run.definitionId === row.id)).map(row => portfolio?.invitations[row.id] === 'declined'
      ? offer(`research_reconsider_${row.id}`, `Reconsider ${row.title}`, 'Return this question to the shelf without accepting it.')
      : offer(`research_offer_${row.id}`, row.title, `${row.question} Read the proposal before accepting. ${row.requiredCount} required public fragments; no journey, combat or profession gate.`, null, 0, ref));
  }
  const definition = researchDefinition(run.definitionId), ref = archivedActor(run), result = [];
  for (const source of definition.sources.filter(source => source.scope === 'public' && !acquired(run, source.id))) result.push(offer(`research_copy_${source.id}`, `Request ${source.title.toLowerCase()}`, `Receive and read a newly dated local public teaching copy: 1 attended day, no fee or wages. Original collection: ${source.originLocationId} ${source.institutionKind}. This is not a journey to or inspection of the original.`, publicReason(s, run), 1, ref));
  if (!live(s, ref)) {
    const next = services(s, run.locationId).find(row => row.kind === 'archivist' && row.personId !== ref.id);
    if (next && run.custody.length < 12) result.push(offer('research_custody', `Agree public-copy custody with ${next.name}`, `${ref.name} no longer holds this office. Explicitly transfer only the remaining public-copy service; private testimony, consent, old credits and personal memories stay with their original people.`, s.locationId === run.locationId && (atHome(s, run) || next.here) ? null : 'Return to the home table or the actual new archivist.', 0, { id: next.personId, serviceId: next.id, roomId: next.roomId }));
  }
  const complete = definition.requiredSources.every(id => acquired(run, id));
  if (complete && !run.comparison) result.push(offer('research_compare', 'Lay the acquired pages side by side', 'Read the actual fragments and choose whether to keep one home comparison day. The comparison practices Scholarship once; opening this proposal grants nothing.', atHome(s, run) ? null : 'Visit your actual recorded home table.'));
  if (run.comparison) {
    result.push(offer('research_interpret', 'Test a reading against the sources', 'Choose or revise a supported inference. An unsupported reading remains a recoverable draft, with the missing link explained.', atHome(s, run) ? null : 'Visit your actual recorded home table.'));
    if (run.interpretationId && !researchInterpretationReason(run, run.interpretationId)) result.push(offer('research_conclude', 'Review the finding and its readers', 'Preview supported claims, source credit and open questions. Choose a public deposit, one named private recipient, or a self-only folio.', atHome(s, run) || here(s, ref) ? null : 'Visit your home table or the recorded archive.'));
  }
  if (definition.id === 'third_mark' && complete) {
    const provider = services(s, run.locationId).find(row => row.kind === 'smith'), maker = run.cast.craftsperson || (provider && captureResearchActor(provider.person, { serviceKind: 'smith', roomId: provider.roomId, day: s.day }));
    if (maker && !acquired(run, 'maker_margin') && !run.permissions.some(row => row.sourceId === 'maker_margin' && row.scope === 'hear' && row.decision === 'refused')) result.push(offer('research_consult', `Ask ${maker.name} about repair marks`, 'Optional: meet this exact craftsperson at their real workbench. The two public sources already suffice; no private account is delivered through the lending route.', privateReason(s, maker), 0, maker));
    if (maker && acquired(run, 'maker_margin') && !run.permissions.some(row => row.scope === 'quote')) result.push(offer('research_quote', 'Ask about one personal quotation', 'Hearing the admission did not publish it. Ask the original speaker about this particular quotation; refusal leaves the research completable.', privateReason(s, maker), 0, maker));
  }
  result.push(offer('research_withdraw', 'Close this question without a verdict', 'Keep acquired sources, work and open questions. No failure, unfinished finding or extra reward is invented.'));
  return result;
}

export function applyResearchAction(s, id, ctx) {
  const action = researchActions(s).find(row => row.id === id && !row.disabledReason); if (!action) return false;
  if (id.startsWith('research_offer_')) {
    const definitionId = id.slice('research_offer_'.length), provider = services(s).find(row => row.kind === 'archivist');
    const context = { version: RESEARCH_VERSION, definitionId, locationId: s.locationId, archivist: capture(s, provider), offeredDay: s.day };
    ctx.setResearchEvent(researchOfferScene(context)); return true;
  }
  if (id.startsWith('research_reconsider_')) { s.researchPortfolio.invitations[id.slice('research_reconsider_'.length)] = 'later'; s.notice = 'The question is available again. No research has been accepted.'; return true; }
  const run = activeRun(s), portfolio = s.researchPortfolio;
  if (id === 'research_continue') return attend(s, ctx);
  if (id === 'research_cancel') { portfolio.project = null; s.notice = 'The unfinished proposal is put aside. Already spent days and acquired evidence remain; no extra reward or source is claimed.'; return true; }
  if (id === 'research_withdraw') { run.status = 'withdrawn'; run.endedDay = s.day; portfolio.activeRunId = null; portfolio.pending = null; portfolio.project = null; note(s, ctx, researchDefinition(run.definitionId).title, 'You closed this finite question without an unsupported verdict. Acquired copies, practiced comparison and open questions remain recorded. No failure or further reward was invented.'); return true; }
  if (id === 'research_custody') {
    const old = archivedActor(run), provider = services(s, run.locationId).find(row => row.kind === 'archivist' && row.personId !== old.id);
    if (!provider || live(s, old)) return false;
    run.custody.push({ day: s.day, fromId: old.id, to: capture(s, provider), sourceRevision: run.custody.length + 1 });
    note(s, ctx, 'A new custodian, not the old scholar', `${provider.name} accepted the remaining public-copy service. ${old.name} remains credited for earlier work; no personal admission, permission or private memory moved to a successor.`); return true;
  }
  if (id.startsWith('research_copy_')) { portfolio.project = startedStep(s, run, { id: researchSourceEvidenceId(id.slice('research_copy_'.length)), sourceId: id.slice('research_copy_'.length), mode: atHome(s, run) ? 'home-copy' : 'archive-copy', actor: archivedActor(run) }); return attend(s, ctx); }
  if (id === 'research_consult') {
    if (!run.cast.craftsperson) run.cast.craftsperson = capture(s, services(s, run.locationId).find(row => row.kind === 'smith'));
    if (run.permissions.some(permission => permission.scope === 'hear' && permission.decision === 'willing')) {
      s.researchPortfolio.project = startedStep(s, run, { id: 'source-maker_margin', sourceId: 'maker_margin', mode: 'consultation', actor: run.cast.craftsperson }); return attend(s, ctx);
    }
    return openRunScene(s, ctx, 'consent');
  }
  return openRunScene(s, ctx, id.slice('research_'.length));
}

export function researchChoiceReason(s, event, id) {
  if (!event?.id?.startsWith('research_')) return null;
  if (!preserveResearchEvent(s, event)) return 'The exact saved research proposal is not valid; no work or disclosure can be claimed.';
  if (id === 'later' || id === 'decline' || id === 'private' && event.id !== 'research_conclude') return null;
  if (event.researchOffer) return id === 'accept' && (!genuineHome(s) || !live(s, event.researchOffer.archivist)) ? 'The recorded home or exact local archivist is no longer available. Leave the proposal; no research has been accepted.' : null;
  const run = activeRun(s), scene = s.researchPortfolio.pending.sceneId;
  if (['consent', 'quote'].includes(scene)) return privateReason(s, run.cast.craftsperson);
  if (scene === 'compare' || scene === 'interpret') return atHome(s, run) ? null : 'Return to the actual recorded home table.';
  if (scene === 'conclude' && id !== 'self') {
    const reason = publicReason(s, run); if (reason) return reason;
    if (id === 'public_quote' && !researchConclusionPreview(run, { audience: 'public', quoteSourceIds: ['maker_margin'] })) return 'The exact speaker has not granted this quotation for this folio.';
  }
  return null;
}

// Preserve exact historical event snapshots. Only the rendered choice view is
// refreshed, using the same current place/provider checks as its actual reducer.
export function researchChoiceQuote(s, event, id) {
  if (event?.id !== 'research_conclude' || !preserveResearchEvent(s, event)) return null;
  const choice = event.choices.find(row => row.id === id);
  if (!choice) return null;
  if (id === 'self' || id === 'later') return { description: choice.description, days: 0, cost: 0, disabledReason: null };
  if (!['public', 'public_quote', 'private'].includes(id)) return null;
  const disabledReason = researchChoiceReason(s, event, id);
  const description = choice.description.replace(/ No time or Gold\.$/, '');
  if (disabledReason) return { description: `${description} Delivery is unavailable; this rejected choice spends no time or Gold.`, days: null, cost: 0, disabledReason };
  const delivery = conclusionDelivery(s, activeRun(s));
  return { description: `${description} ${delivery.days ? 'Home collection takes 1 attended day, with no fee or wages. Ordinary household costs accrue separately.' : `Direct deposit with ${delivery.ref.name} here at School & Archive takes no time or Gold.`}`,
    days: delivery.days, cost: 0, disabledReason: null };
}

export function applyResearchChoice(s, event, id, ctx) {
  if (!event?.choices.some(choice => choice.id === id) || researchChoiceReason({ ...s, event }, event, id)) return false;
  if (event.researchOffer) {
    const context = event.researchOffer;
    s.researchPortfolio ||= makeResearchPortfolio(s);
    s.researchPortfolio.invitations[context.definitionId] = id === 'accept' ? 'accepted' : id === 'decline' ? 'declined' : 'later';
    if (id !== 'accept') { s.notice = 'The question is set aside. No research task, evidence or failure was created.'; return true; }
    if (activeRun(s) || s.researchPortfolio.runs.some(run => run.definitionId === context.definitionId)) return false;
    // The initial capture is the explicit acceptance, not the earlier catalog.
    const provider = services(s).find(row => row.personId === context.archivist.id);
    const run = makeResearchRun(s, context.definitionId, { locationId: context.locationId, archivist: capture(s, provider) });
    s.researchPortfolio.runs.push(run); s.researchPortfolio.activeRunId = run.id;
    note(s, ctx, researchDefinition(run.definitionId).title, 'You explicitly accepted this finite research question. No source, discovery, comparison, practice or Gold was granted by acceptance. Request each actual local public copy when ready.'); return true;
  }
  const run = activeRun(s), scene = s.researchPortfolio.pending.sceneId; s.researchPortfolio.pending = null;
  if (id === 'later' || scene === 'consent' && id === 'decline' || scene === 'quote' && id === 'private') { s.notice = 'The question can wait. The private account and all ungranted quotation rights remain private.'; return true; }
  if (scene === 'compare') { s.researchPortfolio.project = startedStep(s, run, { id: 'comparison', mode: 'comparison' }); return attend(s, ctx); }
  if (scene === 'interpret') { if (!selectResearchInterpretation(run, id)) return false; note(s, ctx, 'The inference beside the source', researchInterpretationReason(run, id) || researchInterpretation(run.definitionId, id).conclusion); return true; }
  if (scene === 'consent') {
    run.permissions.push({ sourceId: 'maker_margin', personId: run.cast.craftsperson.id, ownerId: run.ownerId, day: s.day, scope: 'hear', decision: 'willing' });
    token(s, run, 'consent-hear-maker_margin', 'consent', [run.cast.craftsperson.id], researchObjectId(run.definitionId, 'maker_margin'), 'willing');
    s.researchPortfolio.project = startedStep(s, run, { id: 'source-maker_margin', sourceId: 'maker_margin', mode: 'consultation', actor: run.cast.craftsperson }); return attend(s, ctx);
  }
  if (scene === 'quote') {
    const provider = services(s, run.locationId).find(row => row.personId === run.cast.craftsperson.id), decision = provider.person.disposition === 'reserved' ? 'refused' : 'willing';
    run.permissions.push({ sourceId: 'maker_margin', personId: run.cast.craftsperson.id, ownerId: run.ownerId, day: s.day, scope: 'quote', decision });
    token(s, run, 'consent-quote-maker_margin', 'consent', [run.cast.craftsperson.id], researchObjectId(run.definitionId, 'maker_margin'), decision);
    note(s, ctx, 'Permission belongs to the speaker', decision === 'willing' ? `${run.cast.craftsperson.name} agreed to quotation of this admission in this folio only. Other people, later lives and unrelated disclosures acquire no permission.` : `${run.cast.craftsperson.name} refused quotation of the personal admission. The public repair finding remains completable; a refusal is not failure.`); return true;
  }
  const audience = id === 'public_quote' ? 'public' : id, quoteSourceIds = id === 'public_quote' ? ['maker_margin'] : [];
  if (audience === 'self') return completeFolio(s, ctx, run, { audience, quoteSourceIds, mode: 'self' });
  const { ref, mode } = conclusionDelivery(s, run);
  if (mode === 'archive-deposit') {
    run.steps.push({ id: 'deposit', sourceId: null, mode: 'archive-deposit', actorId: ref.id, locationId: run.locationId, roomId: 'archive', startedDay: s.day, completedDay: s.day, days: 0, sourceRevision: run.custody.length });
    token(s, run, 'deposit', 'receipt', [ref.id], run.id, 'returned', run.custody.length);
    return completeFolio(s, ctx, run, { audience, quoteSourceIds, mode: 'archive-deposit', recipientId: ref.id });
  }
  s.researchPortfolio.project = startedStep(s, run, { id: 'deposit', mode: 'home-collection', actor: ref, terms: { audience, quoteSourceIds, interpretationId: run.interpretationId } }); return attend(s, ctx);
}

export function researchTransition(before, after) {
  if (before.event?.id?.startsWith('research_') && preserveResearchEvent(before, before.event)) return true;
  if (after.event?.id?.startsWith('research_') && preserveResearchEvent(after, after.event)) return true;
  return !!(before.researchPortfolio || after.researchPortfolio) && JSON.stringify(before.researchPortfolio) !== JSON.stringify(after.researchPortfolio)
    && validateResearchPortfolio(after.researchPortfolio, after);
}
export function closeResearchLife(s) {
  const portfolio = s.researchPortfolio; if (!portfolio) return;
  const run = activeRun(s); if (run) { run.status = 'interrupted'; run.endedDay = s.day; }
  portfolio.activeRunId = null; portfolio.pending = null; portfolio.project = null;
}
export function researchJournalRows(s) {
  const run = activeRun(s); if (!run || s.phase === 'retired') return [];
  const action = researchActions(s).find(row => !row.disabledReason && !['research_withdraw', 'research_cancel'].includes(row.id)) || researchActions(s).find(row => row.id !== 'research_withdraw');
  return [{ key: run.id, kind: 'research', commitment: true, title: researchDefinition(run.definitionId).title, locationId: run.locationId, roomId: atHome(s, run) && action?.id.startsWith('research_copy_') ? 'homes' : action?.objectiveRoomId || 'homes', status: 'active', objective: action?.label || 'Return to the recorded household table or close the question.',
    details: [`${run.copies.length} actual public copies acquired; ${run.comparison ? 'home comparison completed and practice already applied' : 'home comparison not yet performed'}.`, ...run.claims.map(claim => claim.text), ...run.openQuestions.map(question => `Open: ${question}`), 'No deadline, Gold reward or compulsory distant journey.'],
    actionId: action?.id, actionLabel: action?.label, cancelId: s.researchPortfolio.project ? 'research_cancel' : 'research_withdraw' }];
}
