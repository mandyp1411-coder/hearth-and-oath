import { receiveNotification } from './notifications-v40.js';
import { stationHealthRisk, stationSeverity, householdPhysician } from './station.js';
import { observationalInfancy, observationalCareEvent } from './development.js';
import { agingPolicy } from './aging-policy-v25.js';
import { seededRoll } from './world.js';
import { communitySupport } from './community.js';

const physicalTypes = ['infection', 'fever', 'injury', 'chronic'];
const mentalTypes = ['distress', 'depression', 'anxiety'];
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const PHYSICAL = {
  infection: { name: 'A wound infection', symptoms: 'Tenderness, fatigue, and a wound that needs cleaning.', description: 'Clean care and rest help recovery; untreated symptoms may become more demanding.' },
  fever: { name: 'A feverish illness', symptoms: 'Heat, chills, thirst, and tiredness.', description: 'Fluids, rest, and a healer’s review support recovery. This is separate from any campaign diagnosis.' },
  injury: { name: 'A lingering injury', symptoms: 'Pain, stiffness, and slower recovery after exertion.', description: 'Rest and gentle rehabilitation give the body time to mend.' },
  chronic: { name: 'A chronic bodily condition', symptoms: 'Recurring aches and fatigue that vary with the day.', description: 'A regular care routine manages symptoms; a good life does not require the condition to disappear.' },
};
const MENTAL = {
  distress: { name: 'A period of distress', symptoms: 'Overwhelm, disrupted rest, and difficulty finding room to breathe.', description: 'Practical support, rest, and fewer pressures can help. Distress does not change your values or allegiance.' },
  depression: { name: 'Depressive symptoms', symptoms: 'Persistent low mood, diminished interest, and tiredness.', description: 'Trusted support and continuing care can ease symptoms over lived weeks. One pleasant conversation does not promise a cure.' },
  anxiety: { name: 'Anxious symptoms', symptoms: 'Persistent worry, tension, and difficulty settling.', description: 'A predictable routine, breathing space, and willing support can ease symptoms. These feelings do not imply danger to anyone.' },
};
const ready = state => !!state.health && state.phase !== 'retired' && !state.event && !state.battle && !state.conversations?.pending && !state.dungeon;
const conditionById = (state, id) => [...state.health.physical, ...state.health.mental].find(condition => condition.id === id);
// Who pays the healer for a child depends on the house: nobody for the bound
// and the common (no healer comes), the household for trade and above.
const childPhysician = state => state.hero.station && state.age < 18 ? householdPhysician(state) : null;
const careFee = state => childPhysician(state) ? 0 : state.age < 16 ? 0 : Math.max(0, 6 - communitySupport(state).careFeeDiscount);
const clinicCareDays = state => 30 + communitySupport(state).careDays;
const careSponsor = state => childPhysician(state) === 'household' ? ' The house keeps a physician.' : childPhysician(state) === 'paid' ? ' The household pays the healer, and feels it.' : state.age < 16 ? ' Community-sponsored care is free before age 16.' : communitySupport(state).careFeeDiscount ? ' The funded local clinic covers the consultation fee.' : '';
const option = (id, label, description) => ({ id, label, description });
function note(state, ctx, title, text, details = {}) {
  state.notice = text;
  state.health.history.push({ id: `health-${state.day}-${state.health.history.length}`, day: state.day, title, text, ...details });
  state.health.history = state.health.history.slice(-120);
  (ctx.journalLiteral||ctx.journal)?.(title, text, 'health');
  if(['onset','recovered'].includes(details.result)){
    const condition=PHYSICAL[details.conditionType]||MENTAL[details.conditionType];
    receiveNotification(state,{kind:'health',sourceId:`health:${details.result}:${details.conditionType}:${state.day}`,title:details.result==='onset'?condition.name:'Recovery · '+condition.name,body:details.result==='onset'?condition.name+': '+condition.symptoms+' Visit a doctor for care.':condition.name+' has eased after time and care. Your health history keeps the record.'});
  }
}
function wellbeing(state, happiness = 0, stress = 0, bodily = 0) {
  if (!state.life) return;
  state.life.happiness = clamp(state.life.happiness + happiness);
  state.life.stress = clamp(state.life.stress + stress);
  state.life.health = clamp(state.life.health + bodily);
}
function recoverHp(state, amount) { state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + amount); }
function onset(state, type, severity, ctx, circumstance) {
  const kind = physicalTypes.includes(type) ? 'physical' : 'mental';
  if (state.health[kind].some(condition => condition.type === type)) return;
  const recent = state.health.history.filter(entry => entry.conditionType === type && entry.result === 'recovered').at(-1);
  if (recent && state.day - recent.day < 90) return;
  const condition = { id: `${type}-${state.day}`, type, severity, sinceDay: state.day, lastEffectDay: state.day, careUntil: 0, acknowledged: false, ...(circumstance ? { circumstance } : {}) };
  state.health[kind].push(condition);
  note(state, ctx, 'A need your life can make room for', `${(PHYSICAL[type] || MENTAL[type]).name}: ${(PHYSICAL[type] || MENTAL[type]).symptoms} Free care and supportive choices remain available.`, { conditionType: type, result: 'onset' });
  queueConcern(state);
}
const hardWinterChild = (state, day = state.day) => !!state.hero.station && state.age < 12 && state.hero.station.diet <= 1 && (state.fortune?.hardWinterUntil || 0) >= day;
function queueConcern(state) {
  if (state.health.pending || state.phase === 'retired') return;
  const condition = prioritizedConditions(state).find(entry => !entry.acknowledged);
  if (condition) state.health.pending = { eventId: 'health_concern', conditionId: condition.id, kind: physicalTypes.includes(condition.type) ? 'physical' : 'mental', offeredDay: state.day };
}

export function initializeHealth(state, { migration = false, reset = false } = {}) {
  if (state.health && !reset) return;
  state.health = { ...(migration?{}:{agePolicy:25}),physical: [], mental: [], care: { restUntil: 0, medicineUntil: 0, supportUntil: 0 }, lastPhysicalCheckDay: state.day, lastMentalCheckDay: state.day, lastAgeCheckYear: Math.floor(state.day / 365), pending: null, history: [], deathCause: null };
  void migration;
}

const recoveryReady = s => !!s.health && s.age >= 16 && s.phase !== 'retired' && !s.event && !s.battle && !s.conversations?.pending && !s.dungeon && !s.timeline?.journey && !s.workshop?.project && !s.careers?.batch && !s.life?.plan;
const symptomTerms = 'Attended plan days support both physical and emotional symptom care. Physical symptoms are reviewed every 14 lived days. Emotional recovery also needs 21 days since onset (35 for depressive symptoms), joy at least 40 and stress at most 65. Chronic conditions are managed, not erased; completing the plan does not guarantee that symptoms have ended.';
const recoveryBenefits = kind => `Each seven attended days earn ${kind === 'guided' ? 16 : 12} health, ${kind === 'guided' ? 22 : 18} bodily wellbeing, 10 joy and 16 less stress, within their limits. ${kind === 'guided' ? 'Each attended week also eases physical severity by one, down to severity 1. ' : ''}These gains are separate from symptom reviews.`;
export function recoveryActions(s) {
  if (!recoveryReady(s)) return [];
  const p = s.health.recovery;
  if (p) return [
    { id:'recovery_continue', label:'Continue your recovery plan', description:`${p.attendedDays}/${p.totalDays} plan days attended; ${p.remainingDays} remain. ${p.careDays == null ? 'Earlier symptom-care days were not separately recorded.' : `${p.careDays} symptom-care days recorded during this plan.`} Symptom improvement has separate care and wellbeing checks. Living costs continue; no automatic work wages.`, days:0, durationDays:p.remainingDays, cost:p.paid ? 0 : p.fee, group:'Health & support' },
    { id:'recovery_cancel', label:'End the recovery plan here', description:'Retain actual attended days, symptom care and any consultation already paid. No remaining days or completion benefits are granted.', days:0, cost:0, group:'Health & support' },
  ];
  return [14,28,56].flatMap(days => ['free','guided'].map(kind => {
    const fee = kind === 'free' ? 0 : Math.max(0, 6 + Math.ceil(days / 7) * 3 - communitySupport(s).careFeeDiscount);
    return { id:`recovery_begin_${kind}_${days}`, label:`${days}-day ${kind === 'free' ? 'quiet recovery' : 'healer-guided recovery'}`, description:`${kind === 'free' ? 'Free rest, meals, gentle movement and willing support.' : `Consultation and supplies cost ${fee} gold once, on first attendance.`} These ${days} actual days support physical and emotional care; symptom improvement has separate recovery checks. ${recoveryBenefits(kind)} Birthdays and urgent needs pause attendance. Living costs continue; no automatic work wages.`, days:0, durationDays:days, cost:fee, group:'Health & support', ...(s.hero.gold < fee ? { disabledReason:`Requires ${fee} gold; free plans remain available.` } : {}) };
  }));
}
export function recoveryView(s) {
  const p = s.health?.recovery;
  return { terms:symptomTerms, plan:p ? { ...p, careDays:p.careDays ?? null, unrecordedCareDays:p.attendedDays - (p.careDays ?? 0) } : null };
}
export function applyRecoveryAction(s, id, ctx = {}) {
  if (!recoveryActions(s).some(a => a.id === id && !a.disabledReason)) return false;
  if (id === 'recovery_cancel') {
    const p = s.health.recovery;
    note(s, ctx, 'A recovery plan ended by choice', `${p.attendedDays} actual days of the ${p.totalDays}-day plan were attended. ${p.careDays ?? 0} symptom-care days separately recorded; earlier unrecorded credit is not inferred. ${p.paid ? p.fee : 0} gold was paid. Unused days grant no recovery; completed care remains.`, { result:'plan_canceled', attendedDays:p.attendedDays, ...(p.careDays != null ? { careDays:p.careDays } : {}), fee:p.paid ? p.fee : 0 });
    s.health.recovery = null;
    return true;
  }
  if (id.startsWith('recovery_begin_')) {
    const a = recoveryActions(s).find(a => a.id === id), parts = id.split('_'), totalDays = Number(parts[3]);
    s.health.recovery = { title:'A season with room to recover', locationId:s.locationId, kind:parts[2], totalDays, remainingDays:totalDays, attendedDays:0, careDays:0, startedDay:s.day, fee:a.cost, paid:false };
    note(s, ctx, 'A recovery plan chosen', `You set aside ${totalDays} actual days for ${parts[2] === 'free' ? 'free rest and support' : 'healer-guided rest and support'}. ${symptomTerms} Living costs continue. The ${a.cost}-gold consultation is due only when attendance begins.`, { result:'plan_started', totalDays, fee:a.cost });
  }
  const p = s.health.recovery, old = s.day;
  if (s.hero.gold < (p.paid ? 0 : p.fee)) { s.notice = 'The quoted consultation cannot yet be paid. No days were spent; free care or cancellation remains available.'; return true; }
  const stop = ctx.nextInterruptionDay?.(), segment = Math.min(p.remainingDays, stop == null ? p.remainingDays : Math.max(0, stop - old));
  if (!segment) { s.notice = 'Recovery pauses for the calendar decision. No consultation or recovery benefit was awarded.'; return true; }
  // Reserve the quoted fee before calendar costs. Support is provisional until
  // spendDays reports actual attendance; an unexpectedly shorter segment cannot
  // leave care or a consultation paid for days that were never lived.
  const charged = !p.paid ? p.fee : 0;
  s.hero.gold -= charged;
  const careBefore = { ...s.health.care }, conditionsBefore = new Map([...s.health.physical, ...s.health.mental].map(c => [c.id, c.careUntil]));
  s.health.care.restUntil = Math.max(s.health.care.restUntil, old + segment);
  s.health.care.supportUntil = Math.max(s.health.care.supportUntil, old + segment);
  for (const c of [...s.health.physical, ...s.health.mental]) c.careUntil = Math.max(c.careUntil, old + segment);
  const reported = ctx.spendDays(p.remainingDays, { outdoors:false });
  const days = Math.min(p.remainingDays, Math.max(0, s.day - old), Number.isFinite(reported) ? Math.max(0, reported) : 0);
  for (const key of ['restUntil','supportUntil']) s.health.care[key] = days ? Math.max(careBefore[key], old + days) : careBefore[key];
  for (const c of [...s.health.physical, ...s.health.mental]) if (conditionsBefore.has(c.id)) c.careUntil = days ? Math.max(conditionsBefore.get(c.id), old + days) : conditionsBefore.get(c.id);
  if (!days) { s.hero.gold += charged; s.notice = 'Recovery pauses for the calendar decision. No consultation or recovery benefit was awarded.'; return true; }
  p.paid = true;
  if (s.phase === 'retired') { s.health.recovery = null; return true; }
  const before = p.attendedDays;
  p.attendedDays += days; p.remainingDays -= days; p.careDays = (p.careDays ?? 0) + days;
  const portions = Math.floor(p.attendedDays / 7) - Math.floor(before / 7);
  recoverHp(s, portions * (p.kind === 'guided' ? 16 : 12));
  wellbeing(s, portions * 10, -portions * 16, portions * (p.kind === 'guided' ? 22 : 18));
  if (p.kind === 'guided' && portions) for (const c of s.health.physical) c.severity = Math.max(1, c.severity - portions);
  if (s.phase !== 'retired') {
    s.health.care.restUntil = Math.max(s.health.care.restUntil, s.day + 14);
    s.health.care.supportUntil = Math.max(s.health.care.supportUntil, s.day + 14);
    for (const c of [...s.health.physical, ...s.health.mental]) c.careUntil = Math.max(c.careUntil, s.day + 14);
  }
  const left = [...s.health.physical, ...s.health.mental].map(c => `${(PHYSICAL[c.type] || MENTAL[c.type]).name} ${c.severity}/3`);
  note(s, ctx, p.remainingDays ? 'Time kept for recovery' : 'A recovery season completed', `${p.attendedDays}/${p.totalDays} actual plan days attended; ${p.careDays} symptom-care days separately recorded; ${p.paid ? p.fee : 0} gold paid once. ${p.remainingDays ? `${p.remainingDays} reserved days remain; other care sessions do not reduce them.` : 'The attendance commitment is complete.'} ${left.length ? `Symptoms still recorded: ${left.join('; ')}. Continue care as needed; plan completion is separate from symptom recovery.` : 'No active symptoms remain recorded.'}`, { result:p.remainingDays ? 'plan_attended' : 'plan_completed', attendedDays:days, careDays:days, totalDays:p.totalDays, fee:charged });
  if (!p.remainingDays || s.phase === 'retired') s.health.recovery = null;
  return true;
}

const descriptor = (state, id, label, description, days, cost = 0) => ({ id, label, description, days, cost, group: 'Health & support', ...(state.hero.gold < cost ? { disabledReason: `Requires ${cost} gold; free rest and support remain available.` } : {}) });
const HERBAL_CARE = Object.freeze({ days: 2, herbs: 1, hp: 6, bodily: 6, stress: -3, supportDays: 24 });
export function herbalCareOffer(state) {
  const c = HERBAL_CARE;
  return { ...descriptor(state, 'health_herbs', 'Prepare supportive herbal care',
    `Spend ${c.days} days and ${c.herbs} actual healing herb from gathering, gardening, or herbalism. Restore up to ${c.hp} Health and ${c.bodily} bodily wellbeing; reduce Stress by up to ${-c.stress}. Support physical recovery for ${c.supportDays} days. Herbs complement rest and treatment; symptoms still need lived recovery time.`, c.days),
    materials: { herbs: c.herbs }, effects: { ...c }, targetId: 'hero', targetName: state.hero.name };
}
export function herbalCareReceipt(before, after) {
  const herbs = (before.flags?.herbs || 0) - (after.flags?.herbs || 0), days = after.day - before.day;
  if (herbs <= 0) return days > 0 ? `Herbal preparation for ${before.hero.name} was interrupted. ${days} day${days === 1 ? '' : 's'} passed; no herbs were used and no herbal care was applied.` : null;
  const delta = (label, value) => `${label} ${value > 0 ? '+' : ''}${value}`;
  const changes = [delta('Health', after.hero.hp - before.hero.hp), delta('Bodily wellbeing', after.life.health - before.life.health), delta('Stress', after.life.stress - before.life.stress)];
  const until = after.health.care.medicineUntil;
  return `Herbal care for ${before.hero.name}. ${herbs} Medicinal Herb${herbs === 1 ? '' : 's'} used; ${days} day${days === 1 ? '' : 's'} passed. No direct Gold fee; household costs are settled separately. Actual session changes: ${changes.join(' · ')}. Physical care is supported through day ${until}${until <= before.health.care.medicineUntil ? ' (the existing longer care window is unchanged)' : ''}. ${after.health.physical.length ? 'Recorded symptoms still need lived recovery; this is not an instant cure.' : 'No active physical symptoms are recorded; the care window provides preventive support.'} Values already at their limits do not increase.`;
}
export function healthActions(state) {
  if (observationalInfancy(state)||!ready(state)) return [];
  const actions = [
    descriptor(state, 'health_rest', 'Make room for bodily recovery', 'Spend 3 days resting, keeping wounds clean, and taking fluids. Restore 10 health and 6 bodily wellbeing; reduce stress by 5. Free care supports physical recovery for 21 days.', 3),
    descriptor(state, 'health_support', 'Seek willing, trusted support', 'Spend 2 days with a willing listener or community caregiver. Restore 6 happiness and reduce stress by 12. Emotional support lasts 28 days; symptom recovery takes lived weeks.', 2),
    descriptor(state, 'health_routine', 'Keep a gentle care routine', 'Spend 3 days tending meals, sleep, and gentle movement. Restore 6 health and 4 bodily wellbeing; restore 3 happiness and reduce stress by 7. Supports ongoing physical and emotional care.', 3),
    descriptor(state, 'health_clinic', 'Consult a traveling or local healer', `Spend 2 days and ${careFee(state)} gold on an explicit care plan.${careSponsor(state)} Restore 12 health and 10 bodily wellbeing; ease physical severity and support recovery for ${clinicCareDays(state)} days. Chronic conditions remain manageable.`, 2, careFee(state)),
  ];
  if ((state.flags?.herbs || 0) >= HERBAL_CARE.herbs) actions.push(herbalCareOffer(state));
  if (state.health.physical.length || state.health.mental.length) actions.push(descriptor(state, 'health_review', 'Discuss an active health concern', 'Review an actual symptom and choose care, support, or a measured continuation. Opening the discussion spends no time or gold.', 0));
  return actions;
}
function provideCare(state, id) {
  if (id === 'health_rest') {
    recoverHp(state, 10); wellbeing(state, 0, -5, 6);
    state.health.care.restUntil = Math.max(state.health.care.restUntil, state.day + 21);
    for (const condition of state.health.physical) condition.careUntil = Math.max(condition.careUntil, state.day + 21);
  } else if (id === 'health_clinic') {
    recoverHp(state, 12); wellbeing(state, 0, -4, 10);
    const duration = clinicCareDays(state);
    state.health.care.medicineUntil = Math.max(state.health.care.medicineUntil, state.day + duration);
    for (const condition of state.health.physical) { condition.careUntil = Math.max(condition.careUntil, state.day + duration); condition.severity = Math.max(1, condition.severity - 1); }
  } else if (id === 'health_support') {
    wellbeing(state, 6, -12);
    state.health.care.supportUntil = Math.max(state.health.care.supportUntil, state.day + 28);
    for (const condition of state.health.mental) condition.careUntil = Math.max(condition.careUntil, state.day + 28);
  } else if (id === 'health_routine') {
    recoverHp(state, 6); wellbeing(state, 3, -7, 4);
    state.health.care.restUntil = Math.max(state.health.care.restUntil, state.day + 14);
    state.health.care.supportUntil = Math.max(state.health.care.supportUntil, state.day + 14);
    for (const condition of [...state.health.physical, ...state.health.mental]) condition.careUntil = Math.max(condition.careUntil, state.day + 14);
  } else if (id === 'health_herbs') {
    const c = HERBAL_CARE;
    state.flags.herbs -= c.herbs;
    recoverHp(state, c.hp); wellbeing(state, 0, c.stress, c.bodily);
    state.health.care.medicineUntil = Math.max(state.health.care.medicineUntil, state.day + c.supportDays);
    for (const condition of state.health.physical) condition.careUntil = Math.max(condition.careUntil, state.day + c.supportDays);
  }
}
export function applyHealthAction(state, id, ctx = {}) {
  if (!ready(state) || !healthActions(state).some(action => action.id === id)) return false;
  if (id === 'health_review') {
    const condition = prioritizedConditions(state)[0];
    state.health.pending = { eventId: 'health_concern', conditionId: condition.id, kind: physicalTypes.includes(condition.type) ? 'physical' : 'mental', offeredDay: state.day };
    flushHealthEvent(state, ctx); return true;
  }
  // Root has already paid the normal action's advertised time and money once.
  provideCare(state, id);
  note(state, ctx, id === 'health_support' ? 'Care offered without judgment' : 'A body and a life worth caring for', healthActions(state).find(action => action.id === id)?.description || 'You completed the care you chose.');
  return true;
}

function prioritizedConditions(state) {
  return [...(state.health?.physical || []), ...(state.health?.mental || [])].sort((a,b) => b.severity - a.severity || Number(b.careUntil <= state.day) - Number(a.careUntil <= state.day) || a.sinceDay - b.sinceDay);
}
function ageContext(state, condition) {
  if (state.age < 3) return `At age ${state.age}, a caregiver or community helper arranges meals, fluids, rest and any healer visit. These are care decisions around a young child, not adult responsibilities.`;
  if (state.age < 16) return `At age ${state.age}, a caregiver or community helper can arrange care alongside your ordinary childhood. A healer's consultation is community-sponsored and free.`;
  const elder = state.health?.agePolicy === 25 ? agingPolicy(state.hero).elder : 65;
  if (condition.type === 'chronic') return `At age ${state.age}${state.age >= elder ? ', in later life,' : ','} a regular routine can ease this recurring condition without promising to remove it. Rest can protect the life you want to keep living.`;
  return `At age ${state.age}, care can make room for your work, relationships and existing commitments.`;
}
function careContext(state, condition) {
  return condition.careUntil > state.day ? `Care is already supported through day ${condition.careUntil}; another session renews support rather than treating this as an untreated new concern.` : 'This concern has no current supported-care window. Free care remains available.';
}
const circumstanceText = { winter:'It came in a hard winter, in a house with little to fight it with.', outdoors:'It was first noted during a period with outdoor exposure; that is a circumstance, not a confirmed cause.', ordinary:'It was first noted during ordinary daily life.', stress:'It was first noted during sustained high stress.', low_mood:'It was first noted while low joy and continuing stress were recorded.', later_life:'This recurring concern was first noted during a regular bodily-health review.' };
function symptomProgress(state, condition) {
  const mental = mentalTypes.includes(condition.type), nextDay = condition.lastEffectDay + 14;
  return `${mental ? `Emotional improvement needs continuing care, at least ${condition.type === 'depression' ? 35 : 21} days since onset, joy 40+ and stress 65 or less. Current joy ${state.life?.happiness ?? 0}; stress ${state.life?.stress ?? 0}.` : condition.type === 'chronic' ? 'Supported care can lower severity to 1; this recurring condition remains recorded.' : 'Supported physical reviews can lower severity; HP restoration alone does not clear symptoms.'} Next fortnightly review: day ${nextDay}.`;
}
const BREAKS = [
  { id: 'drink', label: 'Drink', mark: 'drinker', text: 'The bottle takes the edge off, and then it takes the mornings.' },
  { id: 'rage', label: 'Let it out on someone', mark: 'hard', text: 'You find someone smaller than the problem and the problem feels smaller for an hour.' },
  { id: 'pray', label: 'Pray', mark: 'devout', text: 'You kneel until the shaking stops. Something answers, or the silence does.' },
  { id: 'withdraw', label: 'Shut the door', mark: 'withdrawn', text: 'You stop answering. The world goes on without you for a while, and you let it.' },
  { id: 'work', label: 'Work until you cannot think', mark: 'driven', text: 'Hands busy, head empty. It holds, for now.' },
];
export function breakEventIds() { return { health_break: BREAKS.map(b => b.id) }; }
function flushBreak(state, ctx) {
  const b = state.health.breakPending;
  if (!b || state.event || state.battle || state.conversations?.pending || state.dungeon || ctx.pendingNeed?.()) return false;
  const cause = state.householdBudget?.debt > 0 ? 'The debt, the lender, the thin winters.' : (state.health.physical.length ? 'The pain that does not stop.' : 'Everything, all at once, for too long.');
  ctx.setEvent?.('health_break', 'Something gives', 'A breaking point', `${cause} You have carried it as far as it goes. Tonight it stops, one way or another. What do you reach for?`, BREAKS.map(b => ({ id: b.id, label: b.label, description: b.text })));
  return !!state.event;
}
export function applyBreakChoice(state, eventId, pick, ctx = {}) {
  if (eventId !== 'health_break') return false;
  const choice = BREAKS.find(b => b.id === pick);
  if (!choice || !state.health?.breakPending) return false;
  if (state.event?.id === eventId) state.event = null;
  state.health.breakPending = null; state.health.lastBreakDay = state.day;
  state.hero.marks ||= [];
  if (!state.hero.marks.some(m => m.id === choice.mark)) state.hero.marks.push({ id: choice.mark, day: state.day, source: 'break' });
  wellbeing(state, 0, -35, pick === 'drink' ? -6 : 0);
  if (pick === 'rage') for (const p of (state.life?.people || []).filter(p => p.alive !== false && p.locationId === state.locationId).slice(0, 2)) p.bond = clamp((p.bond || 0) - 10);
  if (pick === 'withdraw') for (const p of (state.life?.people || []).filter(p => p.alive !== false)) p.bond = clamp((p.bond || 0) - 3);
  if (pick === 'work' && state.life?.career) state.life.career.experience += 4;
  note(state, ctx, 'Something gave', `${choice.text} You are marked by it now: ${choice.mark}.`);
  return true;
}
export function flushHealthEvent(state, ctx = {}) {
  if (!state.health || state.phase === 'retired') return false;
  if (flushBreak(state, ctx)) return true;
  queueConcern(state);
  const pending = state.health.pending;
  if (!pending || state.event || state.battle || state.conversations?.pending || state.dungeon || ctx.pendingNeed?.()) return false;
  const condition = conditionById(state, pending.conditionId);
  if (!condition) { state.health.pending = null; return false; }
  const data = PHYSICAL[condition.type] || MENTAL[condition.type], supported = condition.careUntil > state.day;
  const body = `${data.name}, severity ${condition.severity}/3. ${data.symptoms} ${ageContext(state, condition)} ${circumstanceText[condition.circumstance] || 'The original cause was not recorded.'} ${careContext(state, condition)} ${symptomProgress(state, condition)}${state.health.recovery ? ` Your recovery plan has ${state.health.recovery.attendedDays}/${state.health.recovery.totalDays} attended days. This separate care session will not count as plan attendance.` : ''}`;
  const choices = [
    option('rest', `${state.age < 3 ? 'Have help arranging' : supported ? 'Continue' : 'Arrange'} free rest and practical care`, 'Spend up to 3 actual days. Restore 10 health and 6 bodily wellbeing; reduce stress by 5. Physical care lasts 21 days. No fee.'),
    option('care', supported ? 'Review bodily care with a healer' : 'Ask a healer for bodily care', `Spend up to 2 actual days and ${careFee(state)} gold.${careSponsor(state)} Restore 12 health and 10 bodily wellbeing; ease physical severity. Physical care lasts ${clinicCareDays(state)} days. This does not directly treat emotional symptoms.`),
    option('support', supported && pending.kind === 'mental' ? 'Continue willing support and listening' : 'Find a willing listener and support', 'Spend up to 2 actual days. Restore 6 joy, reduce stress by 12, and support emotional recovery for 28 days. No fee.'),
    option('routine', supported ? 'Continue a gentle daily care routine' : 'Arrange a gentle daily care routine', 'Spend up to 3 actual days on meals, sleep and gentle movement. Restore 6 health, 4 bodily wellbeing and 3 joy; reduce stress by 7. Physical and emotional care lasts 14 days. No fee.'),
    option('continue', 'Name the need and continue for now', 'Acknowledge these symptoms. They remain visible and care remains available; there is no moral or faction penalty.'),
  ];
  // A house that keeps a physician does not walk to the shrine for one.
  if(state.worldServicesVersion===1&&childPhysician(state)!=='household'){for(let i=choices.length-1;i>=0;i--)if(choices[i].id==='care'&&(state.cartography?.interior?.roomId!=='shrine'||state.cartography?.offsite))choices.splice(i,1);}
  // No healer comes to a door that cannot pay. A child of the bound or the
  // common is nursed at home, and that is all.
  if (childPhysician(state) === 'none') for (let i = choices.length - 1; i >= 0; i--) if (choices[i].id === 'care') choices.splice(i, 1);
  const first = pending.kind === 'mental' ? 'support' : condition.type === 'chronic' ? 'routine' : 'rest';
  choices.sort((a,b) => Number(b.id === first) - Number(a.id === first));
  ctx.setEvent?.('health_concern', state.age < 3 ? 'Care in your earliest years' : condition.type === 'chronic' ? 'Making room for recurring symptoms' : pending.kind === 'mental' ? 'Support for the days you are living' : 'Room for the body to recover', pending.kind === 'physical' ? 'Physical health' : 'Emotional health', observationalInfancy(state)?`${data.symptoms} Familiar adults notice your discomfort and arrange rest and quiet care. You are held, soothed and looked after while these days pass.`:body, observationalCareEvent(state,{id:'health_concern',choices}).choices);
  return !!state.event;
}
export function healthChoiceReason(state, eventId, pick) {
  if (eventId !== 'health_concern' || !['rest', 'care', 'support', 'routine'].includes(pick)) return '';
  if (state.hero.condition?.type === 'vampire' && state.hero.condition.hunger >= 75) return 'Blood hunger pauses care. Acknowledge the symptoms, then arrange feeding before returning for treatment.';
  if (state.hero.condition?.type === 'lycanthrope' && state.flags.pendingMoonDays?.length) return 'The full moon pauses care. Acknowledge the symptoms and resolve the transformation first.';
  if (pick === 'care' && state.hero.gold < careFee(state)) return `Requires ${careFee(state)} gold. Free rest or support remains available.`;
  return '';
}
export function applyHealthChoice(state, eventId, pick, ctx = {}) {
  if (eventId === 'health_break') return applyBreakChoice(state, eventId, pick, ctx);
  const pending = state.health?.pending;
  if (!pending || eventId !== 'health_concern' || !['rest', 'care', 'support', 'routine', 'continue'].includes(pick)) return false;
  const observing=observationalInfancy(state);
  if(observing){if(pick!=='continue')return false;pick=pending.kind==='mental'?'support':'rest';}
  const reason = healthChoiceReason(state, eventId, pick);
  if (reason) { state.notice = reason; return true; }
  const condition = conditionById(state, pending.conditionId);
  if (!condition) return false;
  if (state.event?.id === eventId) state.event = null;
  if (state.event || state.battle || state.conversations?.pending) return false;
  const fee = careFee(state);
  if (pick === 'care' && state.hero.gold < fee) { state.notice = `The healer’s paid plan costs ${fee} gold. Free rest and emotional support remain available.`; flushHealthEvent(state, ctx); return true; }
  if (pick === 'continue') {
    condition.acknowledged = true; state.health.pending = null;
    // A child does not nurse itself. Until adulthood, whatever the family
    // calls it, a sick child is put to bed: rest care follows, and only a
    // body too worn for rest to help is in danger.
    if (pending.kind === 'physical' && state.age < 18) provideCare(state, 'health_rest');
    note(state, ctx, 'A concern acknowledged', `You named ${((PHYSICAL[condition.type] || MENTAL[condition.type]).name).toLowerCase()} and kept your current commitments. Its symptoms remain visible; you can return for care without a judgment on your character.`);
    return true;
  }
  const actionId = pick === 'rest' ? 'health_rest' : pick === 'care' ? 'health_clinic' : pick === 'routine' ? 'health_routine' : 'health_support';
  const days = ['rest','routine'].includes(pick) ? 3 : 2, oldDay = state.day;
  // Story care is a short, interruptible session. Pay only on actual attendance.
  const reported = ctx.spendDays?.(days, { outdoors: false });
  const actual = Math.min(days, Math.max(0, state.day - oldDay), Number.isFinite(reported) ? Math.max(0, reported) : Infinity);
  if (state.phase === 'retired') return true;
  if (actual === 0) { state.notice = 'The care session waits for the current calendar need. No treatment fee was spent.'; return true; }
  if (pick === 'care') state.hero.gold -= fee;
  if (pick === 'care' && childPhysician(state) === 'paid' && state.family) state.family.support = Math.max(0, state.family.support - 4);
  provideCare(state, actionId);
  // Until adulthood a sick child is put to bed whatever the family calls it:
  // comfort for a wound or a fever still brings the rest that treats it.
  if (pick === 'support' && pending.kind === 'physical' && state.age < 18) provideCare(state, 'health_rest');
  condition.acknowledged = true; state.health.pending = null;
  note(state, ctx, observing?'Care around your earliest days':'Support became part of your days', observing?`The adults caring for you made room for ${actual} day${actual===1?'':'s'} of rest and comfort. Familiar hands and voices stayed close while you recovered. No payment came from your belongings.`:`You spent ${actual} actual day${actual === 1 ? '' : 's'} attending to ${((PHYSICAL[condition.type] || MENTAL[condition.type]).name).toLowerCase()}.${pick === 'care' && fee ? ` The healer’s ${fee}-gold fee was paid once.` : ' Care was free.'} The symptoms and continuing care remain visible.${state.health.recovery ? ` This separate session adds no plan attendance; ${state.health.recovery.remainingDays} reserved days remain.` : ''}`);
  return true;
}

function progressConditions(state, ctx) {
  let fatalRolled = false;
  for (const kind of ['physical', 'mental']) for (const condition of [...state.health[kind]]) {
    const periods = Math.floor((state.day - condition.lastEffectDay) / 14);
    if (!periods) continue;
    let damage = 0, bodily = 0, supported = 0, unsupported = 0;
    // Care is lived during its own weeks. A long journey or annual action must
    // not erase a successful first fortnight merely because care later expires.
    for (let period = 0; period < periods && condition.severity > 0; period++) {
      condition.lastEffectDay += 14;
      const cared = condition.careUntil >= condition.lastEffectDay;
      const ageOfCondition = condition.lastEffectDay - condition.sinceDay;
      if (kind === 'physical') {
        // Even nursed, a winter fever at its worst can take a small child from a
        // thin house. One roll per step, rare, and written with weight.
        if (cared && condition.severity === 3 && condition.circumstance === 'winter' && !fatalRolled && state.hero.station?.diet === 0 && state.age < 12 && !state.health.deathCause) {
          fatalRolled = true;
          if (seededRoll(state.seed, `health:winter:${condition.id}:${condition.lastEffectDay}${cradle(state)}`, 100) < 8) {
            state.health.deathCause = 'A winter fever';
            note(state, ctx, 'The end of a lived life', `The fever came in the dark of the year and the house had nothing to fight it with. ${state.hero.name} did not see the thaw.`);
            ctx.endLife?.(state.health.deathCause);
            return;
          }
        }
        if (cared && condition.type !== 'chronic' && ageOfCondition >= (condition.type === 'injury' ? 7 : 14)) condition.severity -= 1;
        else if (!cared) {
          damage = Math.min(12, damage + condition.severity);
          bodily = Math.min(8, bodily + (condition.type === 'chronic' ? 1 : condition.severity));
          if (ageOfCondition >= 28 && condition.type !== 'chronic') {
            const previousSeverity = condition.severity;
            condition.severity = Math.min(3, condition.severity + 1);
            if (condition.severity > previousSeverity) condition.acknowledged = false;
            // At its worst and still untreated, a fever or an infection can
            // kill, and does more easily in a body already worn down. One
            // roll per step at most, so a long commitment or a moved clock
            // cannot deliver a year of danger in one go.
            else if (condition.severity === 3 && !fatalRolled && state.householdBudget?.debt !== undefined && !state.health.deathCause && state.hero.condition?.type !== 'vampire') {
              fatalRolled = true;
              const bodilyNow = state.life?.health ?? 80;
              // Per uncared fortnight at severity 3: a healthy adult who ignores
              // an infection for a year is more likely dead than not; a worn body,
              // the very old and the very young go faster.
              const odds = (condition.type === 'injury' ? 2 : 5) + (bodilyNow < 40 ? 6 : 0) + (state.age >= 60 ? 5 : state.age < 6 ? 5 : 0);
              if (seededRoll(state.seed, `health:fatal:${condition.id}:${condition.lastEffectDay}${cradle(state)}`, 100) < odds) {
                const data = PHYSICAL[condition.type];
                state.health.deathCause = `${data.name}, left untreated`;
                note(state, ctx, 'The end of a lived life', `${data.name} ran its course with no one able to stop it. Care, friendship, and every choice made before this day remain part of your chronicle.`);
                ctx.endLife?.(state.health.deathCause);
                return;
              }
            }
          }
        }
        if (condition.type === 'chronic' && cared) condition.severity = Math.max(1, condition.severity - 1);
      } else if (cared) {
        supported += 1;
        const canRecover = ageOfCondition >= (condition.type === 'depression' ? 35 : 21) && (state.life?.happiness ?? 0) >= 40 && (state.life?.stress ?? 100) <= 65;
        if (canRecover) condition.severity -= 1;
      } else unsupported += 1;
    }
    // The first sustained-recovery milestone may fall between fortnightly
    // checks (day 21 for anxiety/distress, day 35 for depressive symptoms).
    const firstRecoveryDay = condition.sinceDay + (condition.type === 'depression' ? 35 : 21);
    if (kind === 'mental' && condition.severity > 0 && supported > 0 && condition.lastEffectDay < firstRecoveryDay && state.day >= firstRecoveryDay && condition.careUntil >= firstRecoveryDay && (state.life?.happiness ?? 0) >= 40 && (state.life?.stress ?? 100) <= 65) condition.severity -= 1;
    if (kind === 'physical') { state.hero.hp = Math.max(1, state.hero.hp - damage); wellbeing(state, 0, 0, -bodily); }
    else wellbeing(state, Math.min(4, supported) - Math.min(4, unsupported), -Math.min(6, supported * 2) + Math.min(5, unsupported));
    if (condition.severity <= 0) {
      state.health[kind] = state.health[kind].filter(entry => entry.id !== condition.id);
      if (state.health.pending?.conditionId === condition.id) state.health.pending = null;
      note(state, ctx, 'A period of recovery', `${(PHYSICAL[condition.type] || MENTAL[condition.type]).name} eased after lived time and care. This experience remains in your history; recurring symptoms can still ask for support later.`, { conditionType: condition.type, result: 'recovered' });
    }
  }
}

// Mood is not a trophy. Each lived month, Joy settles toward a resting level
// set by circumstances and Stress toward one set by burdens, so a good season
// fades and a hard one wears. Only new-edition lives (with a debt ledger)
// drift; older saves keep the mood their events left them.
const JOY_FLOOR = 25;
function restingJoy(state) {
  const b = state.householdBudget;
  let level = 55;
  if (state.life?.lifestyle === 'comfortable') level += 5; else if (state.life?.lifestyle === 'generous') level += 10;
  if (state.life?.partnerId) level += 6;
  if ((state.life?.children || []).some(c => c.alive !== false)) level += 4;
  if (b?.debt > 0) level -= 8;
  if ((b?.bondedUntil || 0) > state.day) level -= 10;
  if ((state.life?.health ?? 80) < 40) level -= 8;
  if ((state.health?.physical?.length || 0) + (state.health?.mental?.length || 0)) level -= 6;
  return Math.max(JOY_FLOOR, Math.min(85, level));
}
function restingStress(state) {
  const b = state.householdBudget;
  let level = 15;
  if (b?.debt > 0) level += 15;
  if ((b?.bondedUntil || 0) > state.day) level += 15;
  if ((state.hero?.gold ?? 0) < 20) level += 8;
  if ((state.life?.health ?? 80) < 40) level += 10;
  if ((state.health?.physical?.length || 0)) level += 6;
  if ((state.life?.children || []).filter(c => c.alive !== false).length >= 2) level += 4;
  return Math.max(5, Math.min(80, level));
}
function driftMood(state, day) {
  if (!state.life || state.householdBudget?.debt === undefined || state.age < 14) return;
  const joyTarget = restingJoy(state), stressTarget = restingStress(state);
  const joy = state.life.happiness, stress = state.life.stress;
  // A fifth of the gap each month: a surge fades over a year, a burden settles in over a season.
  state.life.happiness = clamp(joy + Math.sign(joyTarget - joy) * Math.max(joy === joyTarget ? 0 : 1, Math.round(Math.abs(joyTarget - joy) / 5)));
  state.life.stress = clamp(stress + Math.sign(stressTarget - stress) * Math.max(stress === stressTarget ? 0 : 1, Math.round(Math.abs(stressTarget - stress) / 5)));
  void day;
}
// The yearly chance of death from the elder age, per cent. It starts small
// and climbs; a worn body, an untreated condition and a hard life each steepen
// it. A comfortable human reaches the 80s often and the 90s rarely; a poor,
// sick one is lucky to see 70. Tuned against the balance harness.
export function mortalityChance(state, age, a, bodily) {
  if (age < a.elder - 5) return 0;
  const past = age - a.elder;                        // years past the elder age (may be slightly negative)
  let chance = past < 0 ? 0.5 : 1.5 + past * past * 0.09;  // 1.5% at elder, ~5% ten years on, ~16% twenty on
  if (bodily < 55) chance *= 1.6;
  if (bodily < 30) chance *= 1.5;
  const conditions = (state.health?.physical?.length || 0);
  if (conditions) chance *= 1 + 0.35 * conditions;
  if ((state.life?.stress ?? 0) >= 70) chance *= 1.2;
  if (state.householdBudget?.debt > 0) chance *= 1.1;
  if (state.life?.lifestyle === 'generous') chance *= 0.85;
  if (state.health?.care?.medicineUntil >= state.day) chance *= 0.85;
  return Math.min(60, chance);
}
// A cradle drawn again after a childhood death is another life: its rolls differ.
const cradle = state => state.fortune?.attempt ? `:${state.fortune.attempt}` : '';
export function onHealthTime(state, { oldDay, newDay = state.day, outdoors = false } = {}, ctx = {}) {
  if (!state.health || !Number.isFinite(oldDay) || newDay <= oldDay || state.phase === 'retired' || state.health.deathCause) return;
  progressConditions(state, ctx);
  const health = state.health;
  for (let day = health.lastPhysicalCheckDay + 30; day <= newDay; day += 30) {
    const risk = 3 + stationHealthRisk(state) + (outdoors ? 7 : 0) + ((state.life?.health ?? 80) < 35 ? 7 : 0) + ((state.life?.stress ?? 0) >= 75 ? 5 : 0) - (health.care.restUntil >= day || health.care.medicineUntil >= day ? 3 : 0);
    if (seededRoll(state.seed, `health:physical:${day}${cradle(state)}`, 100) < risk) {
      const options = outdoors ? ['injury', 'infection', 'fever'] : ['fever', 'infection'];
      // A fever that comes in a hard winter, to a child in a house that eats
      // thin, arrives at its worst and is the one that kills.
      const winter = hardWinterChild(state, day);
      const severity = winter ? (state.hero.station.diet === 0 ? 3 : 2) : Math.min(2, ((state.life?.health ?? 80) < 35 ? 2 : 1) + stationSeverity(state));
      onset(state, options[seededRoll(state.seed, `health:type:${day}`, options.length)], severity, ctx, winter ? 'winter' : outdoors ? 'outdoors' : 'ordinary');
    }
    if (state.age >= 45 && seededRoll(state.seed, `health:chronic:${day}`, 1000) < (state.age >= 70 ? 8 : 3)) onset(state, 'chronic', 1, ctx, 'later_life');
    health.lastPhysicalCheckDay = day;
  }
  for (let day = health.lastMentalCheckDay + 30; day <= newDay; day += 30) {
    // The month is judged on the strain it began with; then the mood drifts.
    const stress = state.life?.stress ?? 20, happiness = state.life?.happiness ?? 60;
    driftMood(state, day);
    const protectedCare = health.care.supportUntil >= day;
    if (!protectedCare && stress >= 78 && seededRoll(state.seed, `health:distress:${day}`, 100) < 22) onset(state, 'distress', 1, ctx, 'stress');
    if (!protectedCare && stress >= 65 && seededRoll(state.seed, `health:anxiety:${day}`, 100) < 10) onset(state, 'anxiety', 1, ctx, 'stress');
    if (!protectedCare && happiness <= 32 && stress >= 45 && seededRoll(state.seed, `health:depression:${day}`, 100) < 10) onset(state, 'depression', 1, ctx, 'low_mood');
    // At the top of the scale something gives. The break is answered by the
    // player, and how they cope stays with them.
    if (stress >= 100 && state.householdBudget?.debt !== undefined && !health.pending && !health.breakPending && (health.lastBreakDay == null || day - health.lastBreakDay >= 365)) health.breakPending = { offeredDay: day };
    health.lastMentalCheckDay = day;
  }
  const year = Math.floor(newDay / 365);
  for (let nextYear = health.lastAgeCheckYear + 1; nextYear <= year; nextYear++) {
    const age = Math.max(0, state.age - (year - nextYear));
    if (state.hero.condition?.type !== 'vampire') {
      const a=state.health.agePolicy===25?agingPolicy(state.hero):{elder:65,frail:90,late:105,extreme:120};
      if (age >= a.elder) wellbeing(state, 0, 0, -(age >= a.frail ? 2 : 1));
      const bodily = state.life?.health ?? 80;
      const chance = state.householdBudget?.debt !== undefined ? mortalityChance(state, age, a, bodily)
        : age >= a.extreme ? Math.min(45, 8 + (age - a.extreme) * 3) : age >= a.late && bodily < 55 ? 6 + Math.min(14, age - a.late) : age >= a.frail && bodily < 15 ? 5 : 0;
      if (chance && seededRoll(state.seed, `health:mortality:${nextYear}${cradle(state)}`, 100) < chance) {
        const cause = age >= a.late ? 'Natural death in advanced age' : age >= a.frail ? 'Complications of physical frailty in advanced age' : bodily < 40 ? 'A body worn out before its years' : 'Death in old age';
        health.deathCause = cause;
        note(state, ctx, 'The end of a lived life', `${cause}. Care, friendship, and every choice made before this day remain part of your chronicle.`);
        ctx.endLife?.(cause);
        break;
      }
    }
    health.lastAgeCheckYear = nextYear;
  }
  queueConcern(state);
}
export function healthEventIds() { return { health_concern: ['rest', 'care', 'support', 'routine', 'continue'], ...breakEventIds() }; }
export function healthView(state) {
  const health = state.health, bodilyHealth = state.life?.health ?? 0, h = state.battle?.actors.find(a => a.id === 'hero') || state.hero;
  const describe = (condition, catalog) => ({ ...condition, name:catalog[condition.type].name, symptoms:catalog[condition.type].symptoms, description:catalog[condition.type].description, care:careContext(state, condition), progress:symptomProgress(state, condition) });
  const concerns = prioritizedConditions(state), current = concerns[0];
  const suggestionIds = current && mentalTypes.includes(current.type) ? ['health_support','health_routine'] : current?.type === 'chronic' ? ['health_routine','health_clinic','health_rest'] : current && physicalTypes.includes(current.type) ? ['health_rest','health_clinic','health_routine'] : bodilyHealth < 35 || h.hp < h.maxHp ? ['health_rest','health_clinic','health_routine'] : ['health_routine','health_support'];
  const concern = bodilyHealth < 35 ? `Bodily wellbeing is low at ${bodilyHealth}/100. Below 35, physical illness checks carry additional risk even when health is full.` : h.hp < h.maxHp ? `Health is below its maximum. Rest or treatment restores immediate endurance; ongoing symptoms need their own care.` : current ? `${(PHYSICAL[current.type] || MENTAL[current.type]).name} remains recorded at severity ${current.severity}/3 despite full health.` : 'No active symptoms are recorded. Your health and bodily wellbeing still measure different needs.';
  const elder = health?.agePolicy === 25 ? agingPolicy(state.hero).elder : 65;
  return { summary:health?.deathCause || 'Make room for care within the life you are living.', combatHp:h.hp, maxCombatHp:h.maxHp, hpPurpose:'Health measures immediate endurance. Reaching zero downs you in a battle. Rest, healing and draughts can restore health without resolving a lasting condition.', bodilyPurpose:'Bodily wellbeing reflects long-term physical resilience. Below 35 adds illness risk; low wellbeing also matters to frailty in advanced age. Rest, regular care and treatment improve this measure separately from immediate health.', concern, suggestionIds, physical:(health?.physical || []).map(c => describe(c, PHYSICAL)), mental:(health?.mental || []).map(c => describe(c, MENTAL)), happiness:state.life?.happiness ?? 0, stress:state.life?.stress ?? 0, bodilyHealth, care:{ ...(health?.care || {}) }, risk:state.hero.condition?.type === 'vampire' ? 'Your changed body is exempt from ordinary age-related frailty; other physical symptoms and care remain relevant.' : state.age >= elder ? 'In this stage of your ancestry’s life, bodily frailty becomes more significant. Mortality is checked only under the existing advanced-age and frailty rules.' : 'Ordinary symptoms are survivable. Care supports recovery over lived time.', history:(health?.history || []).map(entry => ({ ...entry })) };
}
const integer = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
export function validateHealth(value, state) {
  if (!value || !Array.isArray(value.physical) || value.physical.length > 4 || !Array.isArray(value.mental) || value.mental.length > 3 || !value.care || !['restUntil', 'medicineUntil', 'supportUntil'].every(key => integer(value.care[key])) || !integer(value.lastPhysicalCheckDay) || !integer(value.lastMentalCheckDay) || !integer(value.lastAgeCheckYear) || !Array.isArray(value.history) || value.history.length > 120 || !(value.deathCause === null || typeof value.deathCause === 'string')) return false;
  if (value.breakPending !== undefined && value.breakPending !== null && !(value.breakPending && integer(value.breakPending.offeredDay))) return false;
  if (value.lastBreakDay != null && !integer(value.lastBreakDay)) return false;
  const ids = new Set();
  for (const [kind, validTypes] of [['physical', physicalTypes], ['mental', mentalTypes]]) {
    const seen = new Set();
    for (const condition of value[kind]) {
      if (!condition || typeof condition.id !== 'string' || ids.has(condition.id) || !validTypes.includes(condition.type) || seen.has(condition.type) || !integer(condition.severity, 1, 3) || !integer(condition.sinceDay) || !integer(condition.lastEffectDay, condition.sinceDay) || !integer(condition.careUntil) || (condition.circumstance !== undefined && !Object.hasOwn(circumstanceText, condition.circumstance)) || typeof condition.acknowledged !== 'boolean' || state && (condition.sinceDay > state.day || condition.lastEffectDay > state.day)) return false;
      ids.add(condition.id); seen.add(condition.type);
    }
  }
  if (state && (value.lastPhysicalCheckDay > state.day || value.lastMentalCheckDay > state.day || value.lastAgeCheckYear > Math.floor(state.day / 365))) return false;
  if (!value.history.every(entry => entry && typeof entry.id === 'string' && integer(entry.day) && (!state || entry.day <= state.day) && typeof entry.title === 'string' && typeof entry.text === 'string' && (entry.conditionType === undefined || [...physicalTypes, ...mentalTypes].includes(entry.conditionType)) && (entry.careDays === undefined || integer(entry.careDays, 0, entry.attendedDays)) && (entry.result === undefined || ['onset', 'recovered','plan_started','plan_attended','plan_completed','plan_canceled'].includes(entry.result)))) return false;
  if(value.recovery!=null){const p=value.recovery;if(!p||!['free','guided'].includes(p.kind)||![14,28,56].includes(p.totalDays)||!integer(p.remainingDays,1,p.totalDays)||!integer(p.attendedDays,0,p.totalDays)||(p.careDays!==undefined&&!integer(p.careDays,0,p.attendedDays))||p.attendedDays+p.remainingDays!==p.totalDays||!integer(p.startedDay)||state&&p.startedDay>state.day||!integer(p.fee,0,100)||typeof p.paid!=='boolean'||typeof p.title!=='string'||state&&!state.world.locations.some(l=>l.id===p.locationId))return false;}
  if (value.pending === null) return true;
  const pending = value.pending;
  return !!pending && pending.eventId === 'health_concern' && ids.has(pending.conditionId) && ['physical', 'mental'].includes(pending.kind) && value[pending.kind].some(condition => condition.id === pending.conditionId) && integer(pending.offeredDay) && (!state || pending.offeredDay <= state.day);
}
