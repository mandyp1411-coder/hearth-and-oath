import { localTournamentLocked } from './local-project-ownership.js';
import { settlementServices } from './world-services.js';
import { regionAt } from './realm.js';
import { householdSilver, householdSilverReason, validateHouseholdSilver } from './silver-property.js';
import { COUNTING_TABLE_METHODS, COUNTING_TABLE_TITLE, COUNTING_TABLE_STEPS, countingTableLife, makeCountingTableCase,
  nextCountingTablePreparation, recordCountingTablePreparation, countingTableRiskQuote, countingTableAttemptReason,
  beginCountingTablePhase, recordCountingTablePhaseAttendance, resolveCountingTablePhase, withdrawCountingTableCase,
  validateCountingTableCase } from './counting-table-case.js';

const copy = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const room = s => s.cartography?.interior?.siteId === s.locationId ? s.cartography.interior.roomId : 'gate';
const active = s => s.justice?.countingTableJob?.status === 'active' ? s.justice.countingTableJob : null;
const label = method => ({ stealth: 'Stealth · lantern wards', social: 'Social · valuation audience', inside: 'Inside information · Quiet Table counter-copy' })[method];
const waiting = s => s.event || s.battle || s.conversations?.pending;
const otherWork = s => localTournamentLocked(s)||s.researchPortfolio?.project||s.repertoire?.project||s.rpg?.project || s.conversations?.project || s.familyOrigins?.project || s.workshop?.project || s.careers?.batch || s.life?.plan
  || s.stories?.project || s.health?.recovery || s.society?.project || s.community?.project?.commitment || s.fellowship?.project
  || s.sanctuaries?.commitment || s.lineage?.adoption?.preparation || s.pastimes?.project;
const ready = s => s.justice && s.phase === 'adult' && s.age >= 18 && !waiting(s) && !s.justice.prison && !s.maze && !s.timeline?.journey && !s.cartography?.pending && !s.cartography?.offsite && !otherWork(s);
const action = (id, title, description, days = 0, reason = null) => ({ id, label: title, description, days, cost: 0, group: 'Planned criminal job', ...(reason ? { disabledReason: reason } : {}) });
const note = (s, ctx, title, text) => { s.notice = text; (ctx.journalLiteral || ctx.journal)?.(title, text, 'crime', { narrativeEdition: 30 }); };
const rowsAt = (s, locationId = s.locationId) => settlementServices(s, { siteId: locationId });
function providers(s) {
  const rows = rowsAt(s);
  return { merchantService: rows.find(row => row.kind === 'merchant' && row.subjectId === 'market'),
    quietTableService: rows.find(row => row.kind === 'faction' && row.subjectId === 'quiet_table') };
}
function currentProvider(s, ref) {
  if (!ref || s.life?.people?.some(person => person.id === ref.id && person.alive === false)) return null;
  return rowsAt(s, ref.locationId).find(row => row.personId === ref.id && row.kind === ref.serviceKind && (row.subjectId ?? null) === ref.subjectId
    && row.person.alive !== false && row.person.available !== false && !row.person.retired) || null;
}
function ownerReason(s, run) {
  if (!currentProvider(s, run.cast.merchant)) return `${run.cast.merchant.name}, the exact recorded merchant, is unavailable. A successor cannot replace this target.`;
  return null;
}
function quotes(s, run) {
  const quote = countingTableRiskQuote(s, run, { enforcement: regionAt(s, run.locationId)?.law.enforcement });
  if (!quote) return 'The actual regional law cannot currently be verified.';
  const entry = run.attempt?.approach.commitment.chance ?? quote.entryChance, departure = run.attempt?.departure?.commitment.chance ?? quote.escapeChance;
  const witness = run.attempt?.departure?.commitment.witnessChance ?? quote.witnessChance;
  return `Approach ${entry}%; departure ${departure}%. Combined before both phases: ${Math.round(entry * departure / 10) / 10}%. Identification after a successful departure: ${witness}%. Failed attempts leave no loot and a named three-evidence local report.`;
}
function preparation(s, run) {
  const id = nextCountingTablePreparation(run), key = id === 'counter_copy_shared' ? 'quietTable' : ['valuation_terms', 'valuation_entry_checked'].includes(id) ? 'merchant' : null;
  const ref = key && run.cast[key], provider = ref && currentProvider(s, ref), targetRoom = provider?.roomId || ref?.roomId || 'market';
  const descriptions = {
    silver_inspected: ['Inspect the named silver', `Compare the actual engraving on ${run.target.name}. Record this object, not a generic valuable.`],
    wards_read: ['Read the lantern wards', 'Attend one day observing the counting table’s fictional lantern wards. This is the stealth approach, not a payment or public record.'],
    ward_pattern_checked: ['Check the lantern pattern', 'Keep a second Market day checking the fictional ward pattern. This completes the stealth preparation.'],
    valuation_terms: [`Hear ${run.cast.merchant.name}’s willing terms`, 'Attend one day hearing this merchant’s valuation terms. Consent to conversation is not permission to take their property.'],
    valuation_entry_checked: ['Compare the public valuation entry', 'Spend one Market day comparing the public valuation entry with the same silver’s engraving.'],
    counter_copy_shared: [`Ask ${run.cast.quietTable?.name || 'the recorded representative'} for their willing copy`, 'Attend one day with the exact Quiet Table representative. Their limited counter-copy is shared willingly; it does not transfer ownership of the silver.'],
    counter_copy_checked: ['Verify the counter-copy at Market', 'Spend one actual Market day comparing that specific counter-copy with the engraved silver. The source’s testimony keeps its original author.'],
  };
  const description = descriptions[id];
  const reason = householdSilverReason(s, run.target) || ownerReason(s, run)
    || (ref && !provider ? `${ref.name}, the exact recorded source, is unavailable. No successor inherits their testimony.` : null)
    || (room(s) !== targetRoom ? `Visit ${ref?.name || 'the counting table'} at the ${targetRoom === 'hall' ? 'Civic Hall' : targetRoom === 'tavern' ? 'Tavern' : 'Market'}.` : null);
  return { id, key, provider, targetRoom, label: description?.[0], description: description?.[1], reason };
}
function phaseReason(s, run) { return countingTableAttemptReason(s, run) || ownerReason(s, run); }
function daysKept(run) { return run.work.length + (run.attempt?.approach.completedDay != null ? 1 : 0) + (run.attempt?.departure?.completedDay != null ? 1 : 0); }

export function countingTableActions(s) {
  if (!ready(s)) return [];
  const run = active(s);
  if (!run) {
    if (s.justice.countingTableJob && same(s.justice.countingTableJob.life, countingTableLife(s))) return [];
    const target = householdSilver(s);
    if (!target || target.regionId !== 'bellwater' || householdSilverReason(s, target)) return [];
    return [action('justice_job_open', 'Read the counting-table opportunity', 'One optional adult job for this life. Read about a named merchant’s actual silver and three distinct approaches. Reading accepts nothing, spends no days and awards no Gold.', 0, room(s) !== 'market' ? 'Visit the counting table at the Market.' : null)];
  }
  const withdraw = action('justice_job_withdraw', 'Withdraw empty-handed', 'Close this finite plan. Keep attended days and earlier evidence; take no silver or Gold. No new charge is invented.');
  if (run.stage === 'preparation') { const p = preparation(s, run); return [action('justice_job_prepare', p.label, p.description, 1, p.reason), withdraw]; }
  if (run.stage === 'prepared') return [action('justice_job_approach', 'Commit to the saved approach', quotes(s, run) + ' One actual approach day; the silver remains its owner’s until a successful final departure.', 1, phaseReason(s, run)), withdraw];
  if (run.stage === 'opportunity') return [action('justice_job_review', 'Review the silver and the way out', quotes(s, run) + ' Review takes no time. Depart or withdraw without taking anything.', 0, phaseReason(s, run)), withdraw];
  if (['approach', 'departure'].includes(run.stage)) {
    const phase = run.attempt[run.stage], days = phase.completedDay === null ? 1 : 0;
    return [action('justice_job_continue', 'Continue the same ' + run.stage, `The committed ${run.stage} keeps its disclosed ${phase.commitment.chance}% chance and original roll. ${days ? 'One actual day remains.' : 'The attended day is already recorded; resolving the blocker spends no second day.'} ` + quotes(s, run), days, phaseReason(s, run)), withdraw];
  }
  return [withdraw];
}

function offerValid(s, offer) {
  const keys = ['version', 'life', 'day', 'locationId', 'target', 'merchantPersonId', 'quietTablePersonId'];
  return !!offer && typeof offer === 'object' && !Array.isArray(offer) && Object.keys(offer).length === keys.length && Object.keys(offer).every(key => keys.includes(key))
    && offer.version === 1 && same(offer.life, countingTableLife(s)) && Number.isSafeInteger(offer.day) && offer.day >= 0 && offer.day <= s.day
    && validateHouseholdSilver(offer.target, s) && offer.target.worldYear === Math.floor(offer.day / 365) && offer.target.regionId === 'bellwater'
    && offer.locationId === offer.target.locationId && typeof offer.merchantPersonId === 'string' && offer.merchantPersonId.length > 0 && offer.merchantPersonId.length <= 160
    && offer.merchantPersonId !== offer.target.ownerId && (offer.quietTablePersonId === null || typeof offer.quietTablePersonId === 'string' && offer.quietTablePersonId.length > 0 && offer.quietTablePersonId.length <= 160);
}
function offerReason(s, method) {
  const offer = s.justice.countingTableOffer;
  if (!offerValid(s, offer) || offer.locationId !== s.locationId || room(s) !== 'market') return 'Return to the original Market opportunity. No replacement target was accepted.';
  const reason = householdSilverReason(s, offer.target);
  if (reason) return reason;
  const source = providers(s);
  if (source.merchantService?.personId !== offer.merchantPersonId) return 'The exact offered merchant is no longer available.';
  if (method === 'inside' && source.quietTableService?.personId !== offer.quietTablePersonId) return 'The offered Quiet Table source has changed. Their successor cannot supply this copy.';
  const run = makeCountingTableCase(s, { method, ...source });
  return run ? null : method === 'inside' ? 'Complete the Quiet Table’s first agreement and meet its exact current willing representative for this method. Another method needs no faction rank.' : 'This finite adult opportunity is no longer available.';
}
function openOffer(s, ctx) {
  const source = providers(s), target = householdSilver(s);
  if (!source.merchantService || !target) return false;
  s.justice.countingTableOffer = { version: 1, life: countingTableLife(s), day: s.day, locationId: s.locationId,
    target: copy(target), merchantPersonId: source.merchantService.personId, quietTablePersonId: source.quietTableService?.personId || null };
  const choices = COUNTING_TABLE_METHODS.map(method => {
    const run = makeCountingTableCase(s, { method, ...source }), reason = offerReason(s, method);
    return { id: 'accept_' + method, label: label(method), description: `${method === 'stealth' ? 'Inspect fictional lantern wards and verify their pattern.' : method === 'social' ? 'Hear the merchant’s willing valuation terms and compare the public entry.' : 'Hear the exact Quiet Table source and verify their willing counter-copy.'} Five actual days in total; no Gold fee. ${run ? quotes(s, run) : ''}`, ...(reason ? { disabledReason: reason } : {}) };
  });
  choices.push({ id: 'leave', label: 'Leave without accepting', description: 'No commitment, time, charge or reward.' });
  ctx.setEvent('justice_counting_offer', COUNTING_TABLE_TITLE, 'One finite adult opportunity',
    `${target.ownerName} has temporarily brought their engraved household silver to a valuation counter beneath the Market awning. The counting table is here in the Market, not a separate destination. Their household still owns the silver and has not agreed to you taking it.\n\nTarget: ${target.name}. Valuation: ${target.value} Gold, not an immediate payout. The saved valuation year ends on day ${(target.worldYear + 1) * 365}; a later year or merchant will not replace this target.\n\nChoose one approach for this life. Preparation, approach and departure total five actual days; all methods have zero upfront Gold fee, with household costs separate. Success puts this exact stolen valuable in your bag. A fence may later buy it under existing rules. Failure or withdrawal awards nothing. The actual ${regionAt(s)?.name || target.regionId} law governs named local reports.`, choices);
  return true;
}
function openOpportunity(s, run, ctx) {
  ctx.setEvent('justice_counting_departure', 'The silver is still on the table', COUNTING_TABLE_TITLE,
    `Your ${label(run.method)} approach reached ${run.target.name}. It remains ${run.target.ownerName}’s property. You do not yet carry it.\n\n${quotes(s, run)}\n\nCommit the final actual day to taking it and departing, or leave it untouched. No violent route is required.`, [
      { id: 'depart', label: 'Take the silver and get clear', description: 'One actual departure day. The disclosed odds and roll are saved before attendance. Only a successful final departure gives this exact stolen valuable. No Gold payout.', ...(phaseReason(s, run) ? { disabledReason: phaseReason(s, run) } : {}) },
      { id: 'withdraw', label: 'Leave the silver and withdraw', description: 'Close the job empty-handed. No new report is invented; attended days remain spent.' },
      { id: 'later', label: 'Put this decision aside', description: 'Keep the opportunity without taking the silver, spending time or rerolling anything.' },
    ]);
  return true;
}
function continuePhase(s, run, ctx) {
  const phase = run.stage, record = run.attempt[phase];
  if (record.completedDay === null) {
    const startedDay = s.day, actual = ctx.spendDays(1);
    if (s.phase === 'retired') return true;
    if (actual !== 1) { s.notice = `The ${phase} pauses at the calendar need. Its original disclosed chance and roll remain saved; nothing was taken.`; return true; }
    if (!recordCountingTablePhaseAttendance(s, run, phase, { startedDay })) return false;
  }
  const missingOwner = ownerReason(s, run);
  if (missingOwner) { s.notice = missingOwner + ' The attended day remains recorded; no silver was taken.'; return true; }
  const outcome = resolveCountingTablePhase(s, run, phase, ctx);
  if (outcome.status === 'blocked') { s.notice = outcome.reason; return true; }
  if (outcome.status === 'unavailable') return false;
  if (outcome.status === 'opportunity') {
    note(s, ctx, 'The counting table reached', `Your ${label(run.method)} approach reached the same silver. It remains on the table; no property or Gold has been awarded.`);
    if (!waiting(s)) openOpportunity(s, run, ctx);
  } else note(s, ctx, COUNTING_TABLE_TITLE, run.ending);
  return true;
}

export function applyCountingTableAction(s, id, ctx) {
  const offered = countingTableActions(s).find(row => row.id === id);
  if (!offered || offered.disabledReason) return false;
  if (id === 'justice_job_open') return openOffer(s, ctx);
  const run = active(s);
  if (!run) return false;
  if (id === 'justice_job_withdraw') { if (!withdrawCountingTableCase(s, run)) return false; note(s, ctx, COUNTING_TABLE_TITLE, run.ending); return true; }
  if (id === 'justice_job_review') return openOpportunity(s, run, ctx);
  if (id === 'justice_job_prepare') {
    const step = preparation(s, run), startedDay = s.day, actual = ctx.spendDays(1);
    if (s.phase === 'retired') return true;
    if (actual !== 1) { s.notice = 'The calendar paused this preparation. No proof or property was claimed.'; return true; }
    const current = preparation(s, run);
    if (current.reason || current.id !== step.id) { s.notice = (current.reason || 'The recorded preparation source changed.') + ' The attended day took no property and supplies no new proof.'; return true; }
    if (!recordCountingTablePreparation(s, run, step.id, { startedDay, provider: current.provider, willing: true })) return false;
    note(s, ctx, step.label, `${step.description} One actual day was recorded for ${run.target.name}. ${run.work.length}/3 preparation days complete. No silver or Gold was awarded.`);
    return true;
  }
  if (id === 'justice_job_approach') {
    if (!beginCountingTablePhase(s, run, 'approach', { enforcement: regionAt(s, run.locationId)?.law.enforcement })) return false;
    return continuePhase(s, run, ctx);
  }
  if (id === 'justice_job_continue') return continuePhase(s, run, ctx);
  return false;
}

export function applyCountingTableChoice(s, eventId, id, ctx) {
  if (eventId === 'justice_counting_offer') {
    if (id === 'leave') { if (!offerValid(s, s.justice.countingTableOffer)) return false; s.justice.countingTableOffer = null; s.notice = 'You left the counting-table proposal open. No job was accepted.'; return true; }
    const method = id.slice(7);
    if (!id.startsWith('accept_') || !COUNTING_TABLE_METHODS.includes(method) || offerReason(s, method)) return false;
    const run = makeCountingTableCase(s, { method, ...providers(s) });
    if (!run) return false;
    s.justice.countingTableOffer = null; s.justice.countingTableJob = run;
    note(s, ctx, COUNTING_TABLE_TITLE, `You chose ${label(method)} for ${run.target.name}, owned by ${run.target.ownerName}. The target and method are saved for this hero. Five actual days remain; no Gold fee or reward. Household costs are separate. ${quotes(s, run)}`);
    return true;
  }
  const run = active(s);
  if (eventId !== 'justice_counting_departure' || !run || run.stage !== 'opportunity') return false;
  if (id === 'later') { s.notice = 'The silver remains its owner’s. Return through the same accepted job; no time or roll changed.'; return true; }
  if (id === 'withdraw') { if (!withdrawCountingTableCase(s, run)) return false; note(s, ctx, COUNTING_TABLE_TITLE, run.ending); return true; }
  if (id !== 'depart' || phaseReason(s, run) || !beginCountingTablePhase(s, run, 'departure', { enforcement: regionAt(s, run.locationId)?.law.enforcement })) return false;
  return continuePhase(s, run, ctx);
}

export function countingTableEventIds() { return { justice_counting_offer: ['accept_stealth', 'accept_social', 'accept_inside', 'leave'], justice_counting_departure: ['depart', 'withdraw', 'later'] }; }
export function countingTableSceneProvenance(s, event) {
  const ids = countingTableEventIds()[event?.id];
  if (!ids || !Array.isArray(event.choices) || event.choices.length !== ids.length || new Set(event.choices.map(c => c.id)).size !== ids.length || !event.choices.every(c => ids.includes(c.id))) return false;
  return event.id === 'justice_counting_offer' ? offerValid(s, s.justice?.countingTableOffer) && s.justice.countingTableOffer.locationId === s.locationId && !s.justice.countingTableJob
    : !!active(s) && active(s).stage === 'opportunity' && validateCountingTableCase(active(s), s);
}
export function validateCountingTableState(s) {
  if (!validateCountingTableCase(s.justice?.countingTableJob, s)) return false;
  const offer = s.justice?.countingTableOffer;
  if (offer != null && (!offerValid(s, offer) || s.justice.countingTableJob || s.event?.id !== 'justice_counting_offer')) return false;
  return !countingTableEventIds()[s.event?.id] || countingTableSceneProvenance(s, s.event);
}
export function countingTableTransition(before, after) {
  if (countingTableSceneProvenance(before, before.event)) return true;
  const run = after.justice?.countingTableJob;
  return !!run && validateCountingTableCase(run, after) && !same(before.justice?.countingTableJob, run);
}
export function closeCountingTableLife(s) {
  if (active(s)) { const run = active(s); if (withdrawCountingTableCase(s, run)) run.ending = 'This life closed before the counting-table plan was completed. Earlier attended days remain recorded; no unfinished property or reward was claimed.'; }
  if (s.justice) s.justice.countingTableOffer = null;
}

export function countingTableJournalRows(s, { archive = false } = {}) {
  const run = s.justice?.countingTableJob;
  if (!run || archive === (run.status === 'active')) return [];
  if (archive) {
    const carried = run.lootId && s.adventuring.loot.some(loot => loot.id === run.lootId);
    return [{ title: COUNTING_TABLE_TITLE, result: run.ending + (run.status === 'completed' && !carried ? ' Claimed; no longer carried. Its later disposition is not recorded here.' : ''), status: run.status }];
  }
  const p = run.stage === 'preparation' ? preparation(s, run) : null;
  const actionId = p ? 'justice_job_prepare' : run.stage === 'prepared' ? 'justice_job_approach' : run.stage === 'opportunity' ? 'justice_job_review' : 'justice_job_continue';
  const ref = p?.key && run.cast[p.key];
  return [{ key: 'counting-table-job', kind: 'criminal-job', commitment: true, title: COUNTING_TABLE_TITLE,
    locationId: run.locationId, roomId: p?.targetRoom || 'market', status: 'active', personName: ref?.name || run.target.ownerName,
    ...(ref ? { personId: ref.id, exactPerson: true } : {}), objective: p?.reason || p?.description || phaseReason(s, run) || (run.stage === 'opportunity' ? 'The silver is still on its owner’s table. Review departure or withdraw empty-handed.' : 'Continue the saved finite approach, or withdraw.'),
    details: [`Target: ${run.target.name}. Owner: ${run.target.ownerName}. Method: ${label(run.method)}.`, `${daysKept(run)}/5 actual job days recorded. No Gold fee; household costs are separate.`, quotes(s, run)],
    actionId, cancelId: 'justice_job_withdraw' }];
}
