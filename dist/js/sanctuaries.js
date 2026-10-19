import { retiredNpcAvailabilityUnknown } from './npc-continuity.js';
import { feedBlood } from './curses.js';
import { seededRoll, isSettlement } from './world.js';
import { getContacts } from './conversations.js';
import { communitySupport } from './community.js';
import { recordIndependentRefuge } from './lunar-refuge.js';
import { regionAt } from './realm.js';

const clamp = n => Math.max(0, Math.min(100, n));
const copy = value => structuredClone(value);
const choice = (id, label, description) => ({ id, label, description });
const waiting = s => Boolean(s.event || s.battle || s.conversations?.pending || s.dungeon || s.phase === 'retired');
const busy = s => Boolean(s.timeline?.journey || s.workshop?.project || s.careers?.batch || s.life?.plan);
const place = (s, id = s.locationId) => s.world?.locations?.find(p => p.id === id);
const incident = (s, id) => s.legal?.incidents?.find(i => i.locationId === id);
const evidence = (s, id) => incident(s, id)?.evidence || 0;
const tariff=(s,id)=>s.realm?.lawVersion===1?regionAt(s,id)?.law.theftFinePerEvidence||12:12;
const caseById = (s, id) => s.sanctuaries?.cases.find(c => c.id === id);
const agreementById = (s, id) => s.sanctuaries?.agreements.find(a => a.id === id);
const planById = (s, id) => s.sanctuaries?.plans.find(p => p.id === id);
const contact = (s, id) => getContacts(s).find(p => p.id === id);
const present = (s, id, minimumBond = 50) => {
  const p = contact(s, id);
  return p && p.age >= 18 && p.bond >= minimumBond && p.locationId === s.locationId ? p : null;
};
function recordForContact(s, id) {
  const actual = s.life?.people?.find(p => p.id === id) || s.companions?.find(p => p.id === id) || s.society?.people?.find(p => p.id === id) || s.conversations?.relationships?.[id];
  if (actual) return actual;
  const p = contact(s, id);
  if (!p || !s.conversations) return null;
  s.conversations.relationships[id] = { bond: p.bond, memories: [], knownFacts: [] };
  return s.conversations.relationships[id];
}
function learn(s, id, fact) {
  const record = recordForContact(s, id);
  if (!record) return;
  record.knownFacts ||= [];
  if (!record.knownFacts.includes(fact)) record.knownFacts.push(fact);
  record.knownFacts = record.knownFacts.slice(-60);
}
function remember(s, id, text) {
  const record = recordForContact(s, id);
  if (!record) return;
  record.memories ||= [];
  if (!record.memories.includes(text)) record.memories.push(text);
  record.memories = record.memories.slice(-30);
}
function note(s, ctx, title, text, result, refId = null) {
  s.notice = text;
  s.sanctuaries.history.push({ id: `sanctuary-history-${++s.sanctuaries.sequence}`, day: s.day, locationId: s.locationId, title, text, result, refId });
  s.sanctuaries.history = s.sanctuaries.history.slice(-160);
  ctx.journal?.(title, text, result.startsWith('legal') ? 'crime' : 'condition');
}
function enqueue(s, eventId, refId) {
  const data = s.sanctuaries;
  if (data.pending?.eventId === eventId && data.pending.refId === refId || data.queue.some(p => p.eventId === eventId && p.refId === refId)) return;
  if (data.queue.length < 64) data.queue.push({ eventId, refId });
}
function syncLocalLaw(s) {
  if (!s.legal) return;
  const local = incident(s, s.locationId);
  s.legal.evidence = local?.evidence || 0;
  s.legal.wanted = s.legal.evidence >= 3;
  s.legal.description = local ? `${place(s)?.name || s.locationId}: ${local.description}${s.legal.wanted ? ' A local warrant is outstanding.' : ' Officials have an unresolved report.'}` : 'No local charges or known evidence.';
}
function reduceEvidence(s, c, amount) {
  const local = incident(s, c.locationId);
  if (local) {
    local.evidence = Math.max(0, local.evidence - amount);
    if (!local.evidence) s.legal.incidents = s.legal.incidents.filter(i => i !== local);
  }
  c.evidence = evidence(s, c.locationId);
  syncLocalLaw(s);
}
function nextMoon(s) {
  const last = s.hero.condition?.lastFullMoon || 0;
  return Math.max(14 + 28 * Math.ceil((s.day - 14) / 28), last > 0 ? last + 28 : 14);
}
function personalRefuge(s, locationId = s.locationId) {
  return Boolean(communitySupport(s, locationId).refuge || s.workshop?.structures?.some(b => b.locationId === locationId && ['refuge', 'shelter', 'cottage'].includes(b.type) && b.condition === 'sound') || s.life?.home?.locationId === locationId && s.life.home.tier !== 'lodgings');
}
const donorWilling = (s, p) => p.bond >= 60 && seededRoll(s.seed, `donor-boundary-${p.id}`, 100) < 75;
function availableDonor(s) {
  return s.sanctuaries?.agreements.find(a => a.status === 'active' && a.locationId === s.locationId && s.day >= a.nextSessionDay && present(s, a.contactId, 50));
}

export function initializeSanctuaries(s, { reset = false } = {}) {
  if (s.sanctuaries && !reset) return;
  s.sanctuaries = { version: 1, startedDay: s.day, lastDay: s.day, sequence: 0, independentPreparedUntil: s.hero.condition?.type === 'lycanthrope' ? s.hero.condition.preparedUntil || 0 : 0, lastControlMoon: 0, cases: [], agreements: [], plans: [], pending: null, queue: [], commitment: null, history: [] };
}

/** Call only after actual witnessed evidence is already written to legal.incidents. */
export function onEvidence(s, amount, description, ctx = {}) {
  if (!s.sanctuaries || !(amount > 0) || typeof description !== 'string' || !evidence(s, s.locationId) || s.phase === 'retired') return false;
  let c = s.sanctuaries.cases.find(c => c.locationId === s.locationId && c.status !== 'resolved');
  if (!c) {
    if (s.sanctuaries.cases.length >= 48) {
      const old = s.sanctuaries.cases.findIndex(c => c.status === 'resolved');
      if (old < 0) return false;
      s.sanctuaries.cases.splice(old, 1);
    }
    c = { id: `local-case-${++s.sanctuaries.sequence}`, locationId: s.locationId, openedDay: s.day, lastReportDay: s.day, description, evidence: evidence(s, s.locationId), status: 'reported', advocated: false, deferrals: 0, returnDay: null, resolvedDay: null, resolution: null, sources: [{ day: s.day, description }] };
    s.sanctuaries.cases.push(c);
    note(s, ctx, 'A report with an actual source', `${place(s)?.name || s.locationId} officials received this account: ${description} Only this settlement has the report. A hearing, paid restitution and actual community service are alternatives to flight.`, 'legal_report', c.id);
  } else {
    if(['fugitive','deferred'].includes(c.status)&&c.returnDay!==null&&s.day<c.returnDay&&c.protectedEvidence===undefined)c.protectedEvidence=c.evidence;
    c.evidence = evidence(s, c.locationId); c.lastReportDay = s.day; c.description = description;
    c.sources.push({ day: s.day, description }); c.sources = c.sources.slice(-24);
  }
  if (c.status !== 'fugitive') enqueue(s, 'sanctuary_case_accusation', c.id);
  return true;
}

const action = (id, label, description, reason, durationDays = 0, quotedCost = 0) => ({ id, label, description, days: 0, cost: 0, group: 'Law & sanctuary', ...(durationDays ? { durationDays, quotedCost, timeDescription: `${durationDays} actual attendance day${durationDays === 1 ? '' : 's'}; ${quotedCost} gold${quotedCost ? ' charged once when attendance begins' : ', no attendance fee'}. Calendar needs can pause the remaining days.` } : {}), ...(reason ? { disabledReason: reason } : {}) });
export function sanctuaryActions(s) {
  if (!s.sanctuaries || waiting(s) || s.age < 18) return [];
  const commitment = s.sanctuaries.commitment;
  if (commitment) return [
    action('sanctuary_continue', `Continue ${commitment.title.toLowerCase()}`, `${commitment.remainingDays} actual days remain; ${commitment.costPaid} gold has been paid of the ${commitment.cost}-gold agreement. Completion grants its stated result once.`, s.locationId !== commitment.locationId ? 'Return to the agreed place first.' : !isSettlement(s.world, commitment.locationId) ? 'This settlement is unavailable. Abandon the commitment and keep its history.' : undefined, commitment.remainingDays, Math.max(0, commitment.cost - commitment.costPaid)),
    action('sanctuary_cancel', 'End this unfinished arrangement', 'Keep the time already spent. An attended fee is not refunded. Unfinished feeding, legal service and lunar preparation grant no result.'),
  ];
  if (busy(s)) return [];
  const actions = [];
  if (isSettlement(s.world, s.locationId) && evidence(s, s.locationId)) actions.push(action(`sanctuary_review_${s.locationId}`, 'Request a local hearing', 'Review the actual report here. Paid restitution, a willing advocate, supervised service or flight have visible costs. Opening this account grants nothing.'));
  if (s.hero.condition?.type === 'vampire') {
    const donors = s.sanctuaries.agreements.filter(a => a.status === 'active');
    for (const a of donors) {
      const p = present(s, a.contactId, 50);
      actions.push(action(`sanctuary_feed_${a.id}`, `Meet ${a.contactName} by the agreed boundary`, `Spend 1 actual day and ${a.fee} gold; reduce hunger by 60 after attendance. Only ${a.contactName} knows this arrangement. They offer no more than one session every ${a.intervalDays} days and can withdraw consent.`, a.locationId !== s.locationId ? `Meet at ${place(s, a.locationId)?.name || a.locationId}.` : !p ? retiredNpcAvailabilityUnknown(s,a.contactId)?'Paused: their public retirement is recorded, but current presence and consent for a session cannot be established. The original agreement remains; animal feeding is available.':'The named donor is absent or no longer willing at this trust level.' : s.day < a.nextSessionDay ? `Their next possible session is day ${a.nextSessionDay}. Animal feeding remains available.` : s.hero.gold < a.fee ? `Requires ${a.fee} gold; animal feeding remains free.` : undefined, 1, a.fee));
      actions.push(action(`sanctuary_end_${a.id}`, `End the agreement with ${a.contactName}`, 'Close this agreement without a penalty. Neither person owes future access to their body. Their memory of the confidence remains.'));
    }
    for (const p of getContacts(s).filter(p => present(s, p.id, 55) && !donors.some(a => a.contactId === p.id)).slice(0, 8)) actions.push(action(`sanctuary_donor_${p.id}`, `Discuss sustenance with ${p.name}`, 'Ask about a private arrangement. Consent is specific; they may prefer to help you find animal blood. No hunger is relieved by opening a conversation.'));
  }
  if (s.hero.condition?.type === 'lycanthrope') {
    const plans = s.sanctuaries.plans.filter(p => p.status === 'active');
    if (personalRefuge(s) && !plans.some(p => p.kind === 'household' && p.locationId === s.locationId)) actions.push(action('sanctuary_household', 'Write a household moon-watch plan', 'Spend 1 actual day, no fee. Use the actual home or refuge here; agree on private space, child safety and the visible next full moon. Preparation must finish before that moon.', undefined, 1, 0));
    for (const p of getContacts(s).filter(p => present(s, p.id, 55) && !plans.some(a => a.kind === 'pack' && a.contactId === p.id)).slice(0, 8)) actions.push(action(`sanctuary_pack_${p.id}`, `Ask ${p.name} about a moon-watch pack`, 'Discuss a voluntary night-watch circle. Only this person learns the condition if you choose it; accepting costs 2 actual days and 6 gold for provisions. Preparation must finish before the visible moon.'));
    for (const plan of plans) {
      const absent = plan.contactId && !present(s, plan.contactId);
      actions.push(action(`sanctuary_prepare_${plan.id}`, `Prepare ${plan.kind === 'pack' ? `${plan.contactName}'s moon-watch circle` : 'the household safety plan'}`, `Spend 1 actual day and ${plan.kind === 'pack' ? 2 : 0} gold to prepare this exact place for full moon on day ${nextMoon(s)}. Preserve personal privacy; gain 3 control only after actual work, once per moon.`, plan.locationId !== s.locationId ? `Return to ${place(s, plan.locationId)?.name || plan.locationId}.` : absent ? retiredNpcAvailabilityUnknown(s,plan.contactId)?'Paused: the retired watcher’s present availability is unrecorded. Keep the agreement, but use an independent refuge until actual help is available.':'The willing watcher is not present or trust is too low.' : !personalRefuge(s) && plan.kind === 'household' ? 'A sound home or refuge here is required.' : nextMoon(s) <= s.day ? 'The full moon is already waiting. Resolve its existing safe choices first.' : plan.preparedMoon >= nextMoon(s) ? 'This plan is already prepared for the coming moon.' : plan.kind === 'pack' && s.hero.gold < 2 ? 'Shared provisions require 2 gold. A private field refuge remains free.' : undefined, 1, plan.kind === 'pack' ? 2 : 0));
      actions.push(action(`sanctuary_close_${plan.id}`, 'Close this safety arrangement', 'End the agreement without erasing learned restraint or confidences. Future moon preparations use the ordinary refuge choices.'));
    }
  }
  return actions;
}

export function sanctuaryCommitmentReason(s) { return s.sanctuaries?.commitment ? `Finish or end ${s.sanctuaries.commitment.title.toLowerCase()} before committing another activity.` : null; }
export function sanctuaryNeedsBypass(s, id, eventId, pick) {
  return s.hero.condition?.type === 'vampire' && (id?.startsWith('sanctuary_feed_') || id === 'sanctuary_continue' && s.sanctuaries?.commitment?.kind === 'donor_session' || eventId === 'life_hunger' && pick === 'agreement') ? 'vampire' : null;
}
export function onSanctuaryNeed(s, type) {
  if (type !== 'vampire' || s.hero.condition?.type !== 'vampire' || s.sanctuaries?.commitment) return [];
  const a = availableDonor(s);
  return a && s.hero.gold >= a.fee ? [choice('agreement', `Keep the agreed session with ${a.contactName}`, `Spend 1 actual day and ${a.fee} gold under your saved boundaries. Reduce hunger by 60 after attendance; their next consent can be requested in ${a.intervalDays} days.`)] : [];
}
export function applySanctuaryNeed(s, type, pick, ctx = {}) {
  if (type !== 'vampire' || pick !== 'agreement' || !onSanctuaryNeed(s, type).length) return false;
  const a = availableDonor(s);
  s.event = null;
  begin(s, ctx, 'donor_session', a.id, `Agreed session with ${a.contactName}`, 1, a.fee);
  return true;
}

function begin(s, ctx, kind, refId, title, days, cost, extra = {}) {
  if (s.sanctuaries.commitment || s.hero.gold < cost || !isSettlement(s.world, s.locationId)) return false;
  s.sanctuaries.pending = null;
  s.sanctuaries.commitment = { kind, refId, title, locationId: s.locationId, startedDay: s.day, totalDays: days, remainingDays: days, cost, costPaid: 0, ...extra };
  progress(s, ctx);
  return true;
}
function complete(s, task, ctx) {
  const c = caseById(s, task.refId), a = agreementById(s, task.refId), plan = planById(s, task.refId);
  if (task.kind.startsWith('legal_')) {
    if (!c) return;
    if (task.kind === 'legal_escape') {
      const succeeds = seededRoll(s.seed, `case-flight-${c.id}-${task.startedDay}`, 100) < task.chance;
      if (succeeds) {
        c.status = 'fugitive'; c.returnDay = s.day + 7;
        ctx.addEvidence?.(1, 'A named local watch patrol saw you evade this hearing. The report remains local.');
        c.evidence = evidence(s, c.locationId);
        c.protectedEvidence=c.evidence;
        note(s, ctx, 'Flight becomes another part of the account', `You evaded the watch after 2 actual days. ${place(s, c.locationId)?.name || c.locationId} retains its report; other settlements do not learn it automatically. A voluntary hearing remains available, and a return after day ${c.returnDay} risks a local detention.`, 'legal_fled', c.id);
      } else {
        c.status = 'captured'; enqueue(s, 'sanctuary_case_capture', c.id);
        note(s, ctx, 'Capture leaves another decision', 'The watch intercepted your attempted flight. You remain alive with your belongings and skills. A hearing, an advocate or supervised restitution can continue this life.', 'legal_captured', c.id);
      }
      return;
    }
    if (task.kind === 'legal_advocate') {
      c.advocated = true; reduceEvidence(s, c, 1);
      remember(s, task.contactId, 'I attended your local hearing and helped separate the witnessed account from unsupported assumptions.');
    } else if (task.kind === 'legal_service') { reduceEvidence(s, c, task.reduction); ctx.standing?.('villagers', 3); }
    else if (task.kind === 'legal_payment') { reduceEvidence(s, c, task.reduction); ctx.standing?.('villagers', 2); }
    if (!evidence(s, c.locationId)) {
      c.status = 'resolved'; c.resolvedDay = s.day; c.resolution = task.kind;
      enqueue(s, 'sanctuary_case_aftercare', c.id);
      note(s, ctx, 'A particular local case was answered', `${task.title} completed after ${task.totalDays} actual days and ${task.costPaid} gold. The evidence in ${place(s, c.locationId)?.name || c.locationId} is cleared. Witnesses remember what happened; no unrelated faction, private study or condition was erased.`, 'legal_resolved', c.id);
    } else {
      c.status = 'hearing'; enqueue(s, 'sanctuary_case_hearing', c.id);
      note(s, ctx, 'An account can be narrowed without being erased', `${task.title} completed; ${evidence(s, c.locationId)} local evidence remains. Choose the next stated response rather than receiving a hidden acquittal.`, 'legal_partial', c.id);
    }
  } else if (task.kind === 'donor_agreement') {
    const p = present(s, task.refId, 60);
    if (!p || s.hero.condition?.type !== 'vampire') { note(s, ctx, 'The proposed boundary did not become an obligation', 'The intended participant or condition changed during the discussion. No feeding or future access was granted.', 'agreement_unavailable'); return; }
    if (!makeArchiveSpace(s.sanctuaries.agreements)) { note(s, ctx, 'A new arrangement needs space in the living circle', 'Forty-eight active donor arrangements are already recorded. End an existing agreement before establishing another; no feeding or confidence was granted.', 'agreement_unavailable'); return; }
    const agreement = { id: `donor-${++s.sanctuaries.sequence}`, contactId: p.id, contactName: p.name, locationId: s.locationId, agreedDay: s.day, status: 'active', endedDay: null, endReason: null, fee: 8, intervalDays: 14, nextSessionDay: s.day, sessions: 0, lastSessionDay: null };
    s.sanctuaries.agreements.push(agreement); learn(s, p.id, 'vampire'); remember(s, p.id, 'We agreed privately that consent can be withdrawn, a session takes a day and I need fourteen days between offers.');
    note(s, ctx, 'A confidence with another person’s boundaries', `${p.name} alone learned your vampirism through this chosen discussion. At ${place(s)?.name || s.locationId}, each future attended session costs 8 gold and 1 actual day; there must be 14 days between sessions. This meeting did not feed you.`, 'donor_agreed', agreement.id);
  } else if (task.kind === 'donor_session') {
    if (!a || a.status !== 'active' || !present(s, a.contactId, 50) || s.hero.condition?.type !== 'vampire') { note(s, ctx, 'A session stopped at its boundary', 'The donor is no longer present or willing, or the need has changed. No blood or hunger relief was taken.', 'donor_unavailable', task.refId); return; }
    feedBlood(s,'agreement',60,ctx);
    a.sessions++; a.lastSessionDay = s.day; a.nextSessionDay = s.day + a.intervalDays;
    remember(s, a.contactId, 'You attended the agreed private session and respected my time between offers.');
    note(s, ctx, 'Sustenance within a remembered agreement', `You and ${a.contactName} attended the one-day, ${a.fee}-gold session. Hunger is ${s.hero.condition.hunger}/100. Their next possible consent is day ${a.nextSessionDay}; secrecy does not create official evidence.`, 'donor_attended', a.id);
  } else if (task.kind === 'household_plan' || task.kind === 'pack_plan') {
    if (s.hero.condition?.type !== 'lycanthrope' || task.kind === 'household_plan' && !personalRefuge(s) || task.kind === 'pack_plan' && !present(s, task.refId, 55)) return;
    const p = task.kind === 'pack_plan' ? present(s, task.refId, 55) : null;
    if (!makeArchiveSpace(s.sanctuaries.plans)) { note(s, ctx, 'A safety circle needs an agreed place', 'Forty-eight active safety agreements are recorded. Close an existing plan before establishing another; no new preparation was granted.', 'agreement_unavailable'); return; }
    const newPlan = { id: `moon-plan-${++s.sanctuaries.sequence}`, kind: p ? 'pack' : 'household', contactId: p?.id || null, contactName: p?.name || null, locationId: s.locationId, agreedDay: s.day, status: 'active', endedDay: null, endReason: null, preparedMoon: 0, lastPreparedDay: null, watches: 0 };
    s.sanctuaries.plans.push(newPlan);
    if (p) { learn(s, p.id, 'lycanthrope'); remember(s, p.id, 'We formed a voluntary moon-watch circle: I can withdraw, no child attends a transformation, and we prepare one named place at a time.'); }
    preparePlan(s, newPlan, task, ctx);
  } else if (task.kind === 'moon_prepare' && plan) preparePlan(s, plan, task, ctx);
}
function makeArchiveSpace(records) {
  if (records.length < 48) return true;
  const index = records.findIndex(record => record.status === 'ended');
  if (index < 0) return false;
  records.splice(index, 1); return true;
}
function preparePlan(s, plan, task, ctx) {
  if (s.hero.condition?.type !== 'lycanthrope' || task.targetMoon <= s.day || plan.preparedMoon >= task.targetMoon) {
    note(s, ctx, 'A plan cannot travel backward through a full moon', 'The household agreement remains, but preparation did not finish before its target moon. The existing refuge, isolation and restraint choices still resolve that night.', 'moon_late', plan.id); return;
  }
  const controlGain = s.sanctuaries.lastControlMoon >= task.targetMoon ? 0 : 3;
  if (controlGain) s.sanctuaries.lastControlMoon = task.targetMoon;
  plan.preparedMoon = task.targetMoon; plan.lastPreparedDay = s.day; plan.watches++;
  s.hero.condition.preparedUntil = Math.max(s.hero.condition.preparedUntil, task.targetMoon);
  s.hero.condition.control = clamp(s.hero.condition.control + controlGain);
  if (s.life) s.life.stress = clamp(s.life.stress - 4);
  note(s, ctx, 'A safety plan situated in a real household', `${plan.kind === 'pack' ? `${plan.contactName}'s voluntary moon-watch circle` : 'Your private household refuge'} prepared ${place(s, plan.locationId)?.name || plan.locationId} for full moon on day ${task.targetMoon}. Children stay outside the transformation room; no outsider learned a secret. ${controlGain ? 'Three control was earned through completed preparation.' : 'The control lesson was already earned for this moon; another plan does not duplicate it.'} This place must be prepared anew next cycle.`, 'moon_prepared', plan.id);
}
function progress(s, ctx) {
  const task = s.sanctuaries.commitment;
  if (!task || s.phase === 'retired' || s.locationId !== task.locationId || !isSettlement(s.world, task.locationId)) return false;
  if (task.costPaid === 0 && s.hero.gold < task.cost) { s.notice = `The arranged attendance requires ${task.cost} gold. No fee or result has been taken.`; return true; }
  if (task.kind === 'donor_session') {
    const a = agreementById(s, task.refId);
    if (!a || a.status !== 'active' || !present(s, a.contactId, 50) || s.hero.condition?.type !== 'vampire') { s.sanctuaries.commitment = null; note(s, ctx, 'Consent is still a present-tense boundary', 'The arrangement stopped because the participant or need changed. No hunger relief was granted.', 'donor_unavailable', task.refId); return true; }
  }
  const oldDay = s.day;
  const reported = ctx.spendDays?.(task.remainingDays, { outdoors: false });
  const actual = Math.min(task.remainingDays, Math.max(0, s.day - oldDay), Number.isFinite(reported) ? Math.max(0, reported) : Infinity);
  if (s.phase === 'retired') { s.sanctuaries.commitment = null; return true; }
  if (actual > 0 && task.costPaid === 0) { s.hero.gold -= task.cost; task.costPaid = task.cost; }
  task.remainingDays -= actual;
  if (task.remainingDays) { s.notice = `${task.title} has ${task.remainingDays} days left. ${actual ? 'Actual attendance and the agreed fee are recorded.' : 'No time, fee or completion reward was taken.'} Resolve the calendar need, then Continue or end the arrangement.`; return true; }
  s.sanctuaries.commitment = null;
  complete(s, task, ctx);
  return true;
}

export function applySanctuaryAction(s, id, ctx = {}) {
  const descriptor = sanctuaryActions(s).find(a => a.id === id);
  if (!descriptor || descriptor.disabledReason) return false;
  if (id === 'sanctuary_continue') return progress(s, ctx);
  if (id === 'sanctuary_cancel') {
    const task = s.sanctuaries.commitment; s.sanctuaries.commitment = null;
    note(s, ctx, 'An unfinished arrangement ended', `${task.title} ended with ${task.remainingDays} days unfinished. ${task.costPaid} paid gold and ${task.totalDays - task.remainingDays} attended days remain spent; no completion was granted.`, 'arrangement_cancelled', task.refId);
    if (task.kind.startsWith('legal_')) enqueue(s, 'sanctuary_case_hearing', task.refId);
    return true;
  }
  if (id.startsWith('sanctuary_review_')) {
    let c = s.sanctuaries.cases.find(c => c.locationId === s.locationId && c.status !== 'resolved');
    if (!c) onEvidence(s, 1, incident(s, s.locationId).description, ctx);
    c = s.sanctuaries.cases.find(c => c.locationId === s.locationId && c.status !== 'resolved');
    s.sanctuaries.queue = s.sanctuaries.queue.filter(q => q.refId !== c.id);
    s.sanctuaries.pending = { eventId: 'sanctuary_case_hearing', refId: c.id };
  } else if (id.startsWith('sanctuary_donor_')) s.sanctuaries.pending = { eventId: 'sanctuary_donor_terms', refId: id.slice(16) };
  else if (id.startsWith('sanctuary_feed_')) { const a = agreementById(s, id.slice(15)); return begin(s, ctx, 'donor_session', a.id, `Agreed session with ${a.contactName}`, 1, a.fee); }
  else if (id.startsWith('sanctuary_end_')) {
    const a = agreementById(s, id.slice(14)); a.status = 'ended'; a.endedDay = s.day; a.endReason = 'mutual boundary';
    note(s, ctx, 'A boundary honored by ending it', `The agreement with ${a.contactName} closed without a fee or relationship penalty. Their past confidence remains private.`, 'donor_ended', a.id); return true;
  } else if (id === 'sanctuary_household') return begin(s, ctx, 'household_plan', null, 'Household moon-watch planning', 1, 0, { targetMoon: nextMoon(s) });
  else if (id.startsWith('sanctuary_pack_')) s.sanctuaries.pending = { eventId: 'sanctuary_pack_terms', refId: id.slice(15) };
  else if (id.startsWith('sanctuary_prepare_')) { const plan = planById(s, id.slice(18)); return begin(s, ctx, 'moon_prepare', plan.id, 'Preparation for the next moon', 1, plan.kind === 'pack' ? 2 : 0, { targetMoon: nextMoon(s) }); }
  else if (id.startsWith('sanctuary_close_')) {
    const p = planById(s, id.slice(16)); p.status = 'ended'; p.endedDay = s.day; p.endReason = 'mutual boundary';
    note(s, ctx, 'An agreed watch ended', 'The safety arrangement ended without erasing restraint or a privately shared confidence. Ordinary refuge choices remain.', 'moon_ended', p.id); return true;
  }
  flushSanctuaryEvent(s, ctx);
  return true;
}

function legalScene(s, pending) {
  const c = caseById(s, pending.refId);
  if (!c) return null;
  if (pending.eventId === 'sanctuary_case_aftercare') return { title: 'What remains after restitution', body: `The ${place(s, c.locationId)?.name || c.locationId} case is closed through ${c.resolution.replace('legal_', '')}. The report's actual source remains in your history: ${c.description} You can decide how to return to work and neighbors without erasing what happened.`, choices: [choice('account', 'Keep a clear account for my household', 'Record the resolved case; no private condition is disclosed and no free reputation is granted.'), choice('quiet', 'Resume my work quietly', 'Keep the record without a public announcement or invented confession.')] };
  const level = evidence(s, c.locationId), fee = level * tariff(s,c.locationId);
  const advocate = !c.advocated && getContacts(s).find(p => present(s, p.id, 60));
  const captured = pending.eventId === 'sanctuary_case_capture';
  const choices = pending.eventId === 'sanctuary_case_accusation' ? [choice('cooperate', 'Request a hearing before answering the report', 'Read the actual allegation and choose payment, a willing advocate or supervised community service. Opening the hearing spends no time.')] : [choice('pay', 'Attend and pay the stated restitution', `Spend 2 actual days and ${fee} gold; clear this settlement's ${level} evidence after completed attendance.`), ...(advocate ? [choice('advocate', `Ask ${advocate.name} to attend as an advocate`, `Spend 3 actual days and 12 gold for the hearing. One unsupported part of the account can be narrowed; remaining evidence still needs an answer. Only this actual, willing contact participates.`)] : []), choice('service', captured ? 'Accept supervised restitution instead of prison debt' : 'Offer useful community restitution', `Spend ${captured ? 8 : 6} actual days, no fee. Restore tools, deliveries or records with your ${s.hero.profession || 'practical'} work; answer up to 3 evidence after completion. Work pauses at birthdays and bodily needs.`)];
  if(s.justice&&pending.eventId!=='sanctuary_case_accusation')choices.push(choice('prison','Serve a custodial sentence',`Enter actual custody under ${regionAt(s,c.locationId)?.law.name||'local law'}. Prison days, work, escape and release are playable.`));
  if (!captured) choices.push(choice('escape', 'Try to evade this local watch', `Spend 2 actual days. Your current stealth and agility give ${escapeChance(s)}% success. Success retains the local warrant; failure brings a playable detention, no death or confiscation.`));
  if (!captured && c.deferrals === 0) choices.push(choice('later', 'Ask for seven days to arrange a response', 'Set an explicit local return date. No money, skill or evidence changes. This extension is available once.'));
  return { title: captured ? 'A watch-room is another chapter' : pending.eventId === 'sanctuary_case_accusation' ? 'The report reaches a particular watch' : 'A hearing with a known account', body: `${place(s, c.locationId)?.name || c.locationId} holds ${level} evidence from an actual account: ${c.description} ${captured ? 'The guards intercepted you here. You remain alive, keep your possessions and can answer through work or a hearing.' : 'Officials know this account, not your entire life. Private studies, illness, hunger and unrelated friendships are not automatic evidence.'} Payment is ${fee} gold; a free supervised-service route remains.`, choices };
}
function escapeChance(s) { return Math.max(10, Math.min(90, 25 + (s.hero.skills?.stealth || 0) * 5 + (s.hero.attributes?.agility || 0) * 3)); }
function scene(s, pending) {
  if (pending.eventId.startsWith('sanctuary_case_')) return legalScene(s, pending);
  const p = present(s, pending.refId, 55);
  if (!p) return null;
  if (pending.eventId === 'sanctuary_donor_terms') {
    const willing = donorWilling(s, p);
    return { title: 'Another person sets their own boundary', body: `${p.name} hears your request in private. ${willing ? 'They are willing to discuss donating, with a day to establish informed boundaries, payment for their time and fourteen days between sessions.' : 'They choose not to donate their own blood. They can still respect your privacy and your choice to use animal sustenance.'} No one else learns your condition from opening this discussion.`, choices: [...(willing ? [choice('agree', 'Explain the condition and accept these limits', 'Spend 1 actual day on an informed agreement. This participant learns vampirism; future attended sessions cost 8 gold and 1 day. No hunger relief now.')] : []), choice('animal', 'Respect the boundary and use the animal route', 'End this conversation with no hunger relief, cost or disclosure. Free animal sustenance remains available.'), choice('private', 'Keep the condition private for now', 'Decline without a penalty, disclosure or obligation.')] };
  }
  if (pending.eventId === 'sanctuary_pack_terms') return { title: 'A pack made through consent', body: `${p.name} can join a voluntary moon-watch circle at ${place(s)?.name || s.locationId}. The watcher does not promise blood or become a werewolf. They ask that children stay outside the transformation room, that each moon receive preparation and that they remain free to withdraw.`, choices: [choice('agree', 'Disclose lycanthropy and prepare this night-watch circle', `Spend 2 actual days and 6 gold on provisions. Only ${p.name} learns the condition. Finish before full moon on day ${nextMoon(s)} to prepare it and earn 3 control; the plan persists, but future nights need a one-day, 2-gold preparation.`), choice('private', 'Keep an independent refuge and my confidence', 'Decline without a bond penalty or hidden disclosure. The ordinary safe refuge remains available.')] };
  return null;
}
export function flushSanctuaryEvent(s, ctx = {}) {
  const data = s.sanctuaries;
  if (!data || waiting(s) || data.commitment || busy(s) || ctx.pendingNeed?.()) return false;
  for(const c of data.cases)advanceLocalReturn(s,c,ctx);
  for (const c of data.cases) if (c.status !== 'resolved' && !evidence(s, c.locationId)) {
    c.status = 'resolved'; c.evidence = 0; c.resolvedDay = s.day; c.resolution = 'legal_external';
    note(s, ctx, 'An existing local restitution was retained', `${place(s, c.locationId)?.name || c.locationId}'s report was already answered through the existing local-law route. This case retains its source without charging another fine or imposing a new hearing.`, 'legal_resolved', c.id);
  }
  if (!data.pending) {
    const index = data.queue.findIndex(q => {
      const c = caseById(s, q.refId);
      return !q.eventId.startsWith('sanctuary_case_') || c && c.locationId === s.locationId && isSettlement(s.world, c.locationId);
    });
    if (index < 0) return false;
    data.pending = data.queue.splice(index, 1)[0];
  }
  const current = scene(s, data.pending);
  if (!current || data.pending.eventId !== 'sanctuary_case_aftercare' && data.pending.eventId.startsWith('sanctuary_case_') && !evidence(s, caseById(s, data.pending.refId)?.locationId)) { data.pending = null; return false; }
  ctx.setEvent?.(data.pending.eventId, current.title, data.pending.eventId.startsWith('sanctuary_case_') ? 'Local law · actual witnesses' : 'Private agreements', current.body, current.choices);
  return Boolean(s.event);
}
export function applySanctuaryChoice(s, eventId, pick, ctx = {}) {
  const pending = s.sanctuaries?.pending;
  if (!pending || pending.eventId !== eventId) return false;
  const data = scene(s, pending);
  if (!data?.choices.some(c => c.id === pick)) return false;
  if (s.event?.id === eventId) s.event = null;
  if (waiting(s)) return false;
  const c = caseById(s, pending.refId);
  if (eventId === 'sanctuary_case_aftercare') {
    s.sanctuaries.pending = null;
    note(s, ctx, 'A resolved report belongs to a specific life', pick === 'account' ? `You kept the actual local account and its ${c.resolution.replace('legal_', '')} response in your household history. This did not confess unrelated private facts.` : 'You returned to ordinary work with the local resolution remembered. There was no invented public confession.', 'legal_followup', c.id);
  } else if (eventId.startsWith('sanctuary_case_')) {
    if (pick === 'cooperate') { c.status = 'hearing'; pending.eventId = 'sanctuary_case_hearing'; flushSanctuaryEvent(s, ctx); }
    else if (pick === 'later') {
      c.deferrals++; c.returnDay = s.day + 7; c.protectedEvidence=evidence(s,c.locationId);c.status = 'deferred'; s.sanctuaries.pending = null;
      note(s, ctx, 'A stated date to answer a local account', `The watch agreed to wait until day ${c.returnDay}. You can request the hearing earlier. Remaining in or returning to this settlement after that date brings the local account back.`, 'legal_deferred', c.id);
    } else if (pick === 'pay') {
      const fee = evidence(s, c.locationId) * tariff(s,c.locationId);
      if (s.hero.gold < fee) { s.notice = `Restitution is ${fee} gold; supervised service remains free.`; flushSanctuaryEvent(s, ctx); return true; }
      begin(s, ctx, 'legal_payment', c.id, 'Attended local restitution', 2, fee, { reduction: evidence(s, c.locationId) });
    } else if(pick==='prison'&&s.justice&&ctx.imprison){s.sanctuaries.pending=null;return ctx.imprison();
    } else if (pick === 'advocate') {
      const p = getContacts(s).find(p => present(s, p.id, 60));
      if (!p || s.hero.gold < 12) { s.notice = 'A willing adult advocate and 12 gold are required; supervised service is free.'; flushSanctuaryEvent(s, ctx); return true; }
      begin(s, ctx, 'legal_advocate', c.id, `Hearing with ${p.name}`, 3, 12, { contactId: p.id });
    } else if (pick === 'service') begin(s, ctx, 'legal_service', c.id, `${s.hero.profession || 'Practical'} community restitution`, eventId === 'sanctuary_case_capture' ? 8 : 6, 0, { reduction: Math.min(3, evidence(s, c.locationId)) });
    else if (pick === 'escape') begin(s, ctx, 'legal_escape', c.id, 'An attempt to evade the local watch', 2, 0, { chance: escapeChance(s) });
  } else if (eventId === 'sanctuary_donor_terms') {
    if (pick === 'agree') begin(s, ctx, 'donor_agreement', pending.refId, 'Informed donor agreement', 1, 0);
    else { s.sanctuaries.pending = null; s.notice = 'You respected the boundary and kept your confidence. No feeding, disclosure or fee occurred.'; }
  } else if (eventId === 'sanctuary_pack_terms') {
    if (pick === 'agree') {
      if (s.hero.gold < 6) { s.notice = 'Shared provisions cost 6 gold; an independent refuge remains free.'; flushSanctuaryEvent(s, ctx); return true; }
      begin(s, ctx, 'pack_plan', pending.refId, 'Voluntary moon-watch planning', 2, 6, { targetMoon: nextMoon(s) });
    } else { s.sanctuaries.pending = null; s.notice = 'You kept an independent refuge and your private condition. No penalty or disclosure occurred.'; }
  }
  return true;
}

function advanceLocalReturn(s,c,ctx,day=s.day){
  if(!['fugitive','deferred'].includes(c.status)||c.returnDay===null||day<c.returnDay||c.locationId!==s.locationId||!isSettlement(s.world,c.locationId)||s.sanctuaries.commitment)return;
  const capture=c.status==='fugitive';c.status=capture?'captured':'hearing';c.returnDay=null;
  enqueue(s,capture?'sanctuary_case_capture':'sanctuary_case_hearing',c.id);
  if(capture)note(s,ctx,'A local warrant meets an actual return',`A watch patrol recognized you in ${place(s,c.locationId)?.name||c.locationId} after the recorded return date. Its source remains ${c.description} You are alive, retain your belongings and can choose a hearing or actual supervised restitution. No distant settlement received this private account.`,'legal_captured',c.id);
}

export function onSanctuaryTime(s, { oldDay, newDay = s.day } = {}, ctx = {}) {
  const data = s.sanctuaries;
  if (!data || !Number.isFinite(oldDay) || newDay <= oldDay || newDay <= data.lastDay || s.phase === 'retired') return;
  data.lastDay = newDay;
  for (const c of data.cases) {
    if (!evidence(s, c.locationId) && c.status !== 'resolved') { c.status = 'resolved'; c.evidence = 0; c.resolvedDay = s.day; c.resolution = 'legal_external'; continue; }
    advanceLocalReturn(s,c,ctx,newDay);
  }
  for (const a of data.agreements.filter(a => a.status === 'active')) {
    const p = contact(s, a.contactId);
    if(!p&&retiredNpcAvailabilityUnknown(s,a.contactId)&&s.hero.condition?.type==='vampire'&&(s.conversations?.relationships?.[a.contactId]?.bond??50)>=50)continue;
    if (s.hero.condition?.type !== 'vampire' || !p || p.bond < 50) {
      a.status = 'ended'; a.endedDay = s.day; a.endReason = !p ? 'participant no longer living or available' : s.hero.condition?.type !== 'vampire' ? 'sustenance need ended' : 'consent withdrawn at low trust';
      note(s, ctx, 'An agreement follows the people actually living it', `${a.contactName}'s donor agreement ended: ${a.endReason}. Their remembered confidence remains; animal sustenance is available if still needed.`, 'donor_ended', a.id);
    }
  }
  for (const p of data.plans.filter(p => p.status === 'active')) {
    const watcher = p.contactId ? contact(s, p.contactId) : null;
    if(p.contactId&&!watcher&&retiredNpcAvailabilityUnknown(s,p.contactId)&&s.hero.condition?.type==='lycanthrope'&&isSettlement(s.world,p.locationId)&&(s.conversations?.relationships?.[p.contactId]?.bond??50)>=50)continue;
    if (s.hero.condition?.type !== 'lycanthrope' || p.contactId && (!watcher || watcher.bond < 50) || !isSettlement(s.world, p.locationId)) {
      p.status = 'ended'; p.endedDay = s.day; p.endReason = s.hero.condition?.type !== 'lycanthrope' ? 'lunar need ended' : !isSettlement(s.world, p.locationId) ? 'place unavailable' : 'watcher withdrew or died';
      note(s, ctx, 'A safety agreement can change without erasing a life', `The ${p.kind} moon-watch plan ended: ${p.endReason}. Learned control and private confidences remain.`, 'moon_ended', p.id);
    }
  }
}
export function sanctuaryHouseholdPlan(s) {
  return s.sanctuaries?.plans.find(p => p.status === 'active' && p.locationId === s.locationId && p.preparedMoon >= nextMoon(s) && (!p.contactId || present(s, p.contactId))) || null;
}
/** Ordinary field/permanent-refuge preparation keeps its original travel semantics. */
export function onSanctuaryRefugePrepared(s) {
  recordIndependentRefuge(s);
}
export function sanctuaryMoonPrepared(s, moonDay) {
  if (s.hero.condition?.type !== 'lycanthrope' || s.hero.condition.preparedUntil < moonDay) return false;
  const data = s.sanctuaries;
  if (!data || data.independentPreparedUntil >= moonDay || !data.plans.some(p => p.preparedMoon === moonDay)) return true;
  return data.plans.some(p => p.status === 'active' && p.locationId === s.locationId && p.preparedMoon === moonDay && (!p.contactId || present(s, p.contactId)) && (p.kind !== 'household' || personalRefuge(s)));
}
export function sanctuaryEventIds() { return { sanctuary_case_accusation: ['cooperate', 'escape', 'later'], sanctuary_case_hearing: ['pay', 'advocate', 'service', 'escape', 'later','prison'], sanctuary_case_capture: ['pay', 'advocate', 'service','prison'], sanctuary_case_aftercare: ['account', 'quiet'], sanctuary_donor_terms: ['agree', 'animal', 'private'], sanctuary_pack_terms: ['agree', 'private'] }; }
export function sanctuaryView(s) {
  const data = s.sanctuaries;
  return { summary: 'Local law follows actual reports. Donors and moon-watch circles follow specific consenting people, places and calendar boundaries. No menu selection automatically feeds, cures or discloses a private condition.', cases: copy(data?.cases || []), agreements: (data?.agreements||[]).map(a=>({...copy(a),...(a.status==='active'&&retiredNpcAvailabilityUnknown(s,a.contactId)?{availability:'paused',availabilityReason:'Their public retirement is recorded; a new session requires verified current presence and willingness. The earlier consent record is not a standing claim on their body.'}:{})})), plans: (data?.plans||[]).map(p=>({...copy(p),...(p.status==='active'&&p.contactId&&retiredNpcAvailabilityUnknown(s,p.contactId)?{availability:'paused',availabilityReason:'The earlier safety agreement remains recorded, but the retired watcher is not established as currently present. No watch benefit is granted.'}:{})})), commitment: copy(data?.commitment || null), history: copy(data?.history || []) };
}

const int = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const str = (v, max = 2000) => typeof v === 'string' && v.length > 0 && v.length <= max;
const obj = v => v && typeof v === 'object' && !Array.isArray(v);
export function validateSanctuaries(v, s) {
  if (!obj(v) || v.version !== 1 || !int(v.startedDay) || !int(v.lastDay, v.startedDay) || !int(v.sequence) || !int(v.independentPreparedUntil) || !int(v.lastControlMoon) || !Array.isArray(v.cases) || v.cases.length > 48 || !Array.isArray(v.agreements) || v.agreements.length > 48 || !Array.isArray(v.plans) || v.plans.length > 48 || !Array.isArray(v.queue) || v.queue.length > 64 || !Array.isArray(v.history) || v.history.length > 160 || s && v.lastDay > s.day) return false;
  const knownLocations = new Set(s?.world?.locations?.map(p => p.id) || []), locationOk = id => str(id, 80) && (!s || knownLocations.has(id));
  const ids = new Set();
  for (const c of v.cases) {
    if (!obj(c) || !str(c.id, 100) || ids.has(c.id) || !locationOk(c.locationId) || !int(c.openedDay, v.startedDay) || !int(c.lastReportDay, c.openedDay) || !str(c.description) || !int(c.evidence) || c.protectedEvidence!==undefined&&!int(c.protectedEvidence) || !['reported', 'hearing', 'captured', 'deferred', 'fugitive', 'resolved'].includes(c.status) || typeof c.advocated !== 'boolean' || !int(c.deferrals, 0, 1) || !(c.returnDay === null || int(c.returnDay)) || !(c.resolvedDay === null || int(c.resolvedDay, c.openedDay)) || !(c.resolution === null || ['legal_payment', 'legal_service', 'legal_advocate', 'legal_external'].includes(c.resolution)) || !Array.isArray(c.sources) || c.sources.length > 24 || !c.sources.every(source => obj(source) && int(source.day, c.openedDay) && str(source.description)) || s && c.lastReportDay > s.day) return false;
    ids.add(c.id);
  }
  for (const a of v.agreements) {
    if (!obj(a) || !str(a.id, 100) || ids.has(a.id) || !str(a.contactId, 80) || !str(a.contactName, 100) || !locationOk(a.locationId) || !int(a.agreedDay, v.startedDay) || !['active', 'ended'].includes(a.status) || !(a.endedDay === null || int(a.endedDay, a.agreedDay)) || !(a.endReason === null || str(a.endReason)) || a.fee !== 8 || a.intervalDays !== 14 || !int(a.nextSessionDay, a.agreedDay) || !int(a.sessions) || !(a.lastSessionDay === null || int(a.lastSessionDay, a.agreedDay)) || s && (a.agreedDay > s.day || a.endedDay > s.day || a.lastSessionDay > s.day)) return false;
    ids.add(a.id);
  }
  for (const p of v.plans) {
    if (!obj(p) || !str(p.id, 100) || ids.has(p.id) || !['household', 'pack'].includes(p.kind) || !(p.contactId === null && p.contactName === null && p.kind === 'household' || str(p.contactId, 80) && str(p.contactName, 100) && p.kind === 'pack') || !locationOk(p.locationId) || !int(p.agreedDay, v.startedDay) || !['active', 'ended'].includes(p.status) || !(p.endedDay === null || int(p.endedDay, p.agreedDay)) || !(p.endReason === null || str(p.endReason)) || !int(p.preparedMoon) || !(p.lastPreparedDay === null || int(p.lastPreparedDay, p.agreedDay)) || !int(p.watches) || s && (p.agreedDay > s.day || p.endedDay > s.day || p.lastPreparedDay > s.day)) return false;
    ids.add(p.id);
  }
  const pendingOk = p => obj(p) && Object.hasOwn(sanctuaryEventIds(), p.eventId) && str(p.refId, 100) && (p.eventId.startsWith('sanctuary_case_') ? v.cases.some(c => c.id === p.refId) : !s || Boolean(contact(s, p.refId)));
  if (!(v.pending === null || pendingOk(v.pending)) || !v.queue.every(pendingOk)) return false;
  const task = v.commitment;
  if (task !== null) {
    if (!obj(task) || !['legal_payment', 'legal_advocate', 'legal_service', 'legal_escape', 'donor_agreement', 'donor_session', 'household_plan', 'pack_plan', 'moon_prepare'].includes(task.kind) || !locationOk(task.locationId) || !str(task.title, 300) || !int(task.startedDay, v.startedDay) || !int(task.totalDays, 1, 8) || !int(task.remainingDays, 1, task.totalDays) || !int(task.cost) || !int(task.costPaid, 0, task.cost) || ![0, task.cost].includes(task.costPaid) || s && task.startedDay > s.day) return false;
    if (task.kind.startsWith('legal_') && !v.cases.some(c => c.id === task.refId)) return false;
    if (['legal_payment', 'legal_service'].includes(task.kind) && !int(task.reduction, 1)) return false;
    if (task.kind === 'legal_escape' && !int(task.chance, 10, 90)) return false;
    if (task.kind === 'legal_advocate' && !str(task.contactId, 80)) return false;
    if (task.kind === 'donor_session' && !v.agreements.some(a => a.id === task.refId)) return false;
    if (['donor_agreement', 'pack_plan'].includes(task.kind) && !str(task.refId, 80)) return false;
    if (task.kind === 'moon_prepare' && !v.plans.some(p => p.id === task.refId)) return false;
    if (['household_plan', 'pack_plan', 'moon_prepare'].includes(task.kind) && !int(task.targetMoon)) return false;
  }
  return v.history.every(h => obj(h) && str(h.id, 100) && int(h.day, v.startedDay) && (!s || h.day <= s.day) && locationOk(h.locationId) && str(h.title, 300) && str(h.text, 4000) && str(h.result, 100) && (h.refId === null || str(h.refId, 100)));
}
