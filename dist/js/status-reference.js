import { healthView, recoveryView } from './health.js';
import { travelEnergyView } from './travel-energy.js';
import { actionCostDetails, actionCostSummary } from './action-costs.js';

// Read-only explanations, not a second action/provider selector. Callers keep
// their existing eligible destinations and authoritative action handlers.
export function statusReferenceView(s, { context = 'recovery' } = {}) {
 const health = healthView(s), actor = s.battle?.actors.find(a => a.id === 'hero') || s.hero;
 const measures = [
  { id:'health', label:'Health', value:health.combatHp, max:health.maxCombatHp, purpose:health.hpPurpose },
  { id:'bodily', label:'Bodily wellbeing', value:health.bodilyHealth, max:100, purpose:health.bodilyPurpose },
  { id:'focus', label:'Focus', value:actor.mp, max:actor.maxMp, purpose:'The same reserve powers abilities and travel. Low Focus slows travel; rest restores it. Available recovery choices show their actual effects.' },
  { id:'joy', label:'Joy', value:health.happiness, max:100, purpose:'Emotional wellbeing, not Health. Joy affects emotional symptom checks and the requirements for symptom improvement.' },
  { id:'stress', label:'Stress', value:health.stress, max:100, purpose:'Pressure carried through daily life. Sustained high Stress can contribute to emotional symptoms. Rest, support and everyday activities can ease it.' },
 ];
 const ids = context === 'fun' ? ['joy','stress'] : context === 'doctor' ? ['health','bodily'] : measures.map(m => m.id);
 const effect = c => ['distress','anxiety','depression'].includes(c.type)
  ? 'Supported reviews can improve Joy and Stress. Symptom severity has the separate care, lived-time and wellbeing requirements below.'
  : c.type === 'chronic'
   ? 'Supported care manages severity toward 1; this recurring condition remains recorded. Unsupported reviews can reduce Health and bodily wellbeing.'
   : 'Unsupported fortnightly reviews can reduce immediate Health and bodily wellbeing. Supported reviews can reduce severity; restoring Health alone does not clear symptoms.';
 const conditions = [...health.physical,...health.mental].filter(c => context !== 'fun' || ['distress','anxiety','depression'].includes(c.type)).map(c => ({ ...c, effect:effect(c) }));
 return { measures:measures.filter(m => ids.includes(m.id)), concern:health.concern, conditions, plan:recoveryView(s).plan };
}

export function renderStatusReference(s, ui, { context = 'recovery', key = 'status-reference:'+context } = {}) {
 const {e,button} = ui, v = statusReferenceView(s,{context}), p = v.plan;
 const label = context === 'fun' ? 'Joy & Stress explained' : context === 'doctor' ? 'Health & ongoing symptoms' : 'Health, Focus & care explained';
 const conditions = v.conditions.map(c => `<p class="small-copy"><strong>${e(c.name)} · Severity ${c.severity}/3.</strong> ${e(c.effect)} ${e(c.care)} ${e(c.progress)}</p>`).join('');
 const destination = context === 'doctor' || context === 'fun'
  ? `${button ? button('Review Recovery Options','notice-recovery','','ghost small') : ''}`
  : `<p class="small-copy">Use the available recovery choices below, or inspect remedies in Inventory. Visiting a provider reviews their offers; it does not automatically treat you. A pleasant activity can ease Stress without ending recorded symptoms.</p>${button ? button('Inspect Carried Remedies','inventory-remedies','','ghost small') : ''}`;
 return `<details class="action-cost-help status-reference" data-status-reference="${e(context)}" data-disclosure="${e(key)}"><summary>${e(label)}</summary>${v.measures.map(m => `<p class="small-copy"><strong>${e(m.label)} ${e(m.value)}/${e(m.max)}.</strong> ${e(m.purpose)}</p>`).join('')}${context !== 'fun' ? `<p class="small-copy">${e(v.concern)}</p>` : ''}${conditions || '<p class="small-copy">No '+(context === 'fun' ? 'emotional ' : '')+'symptoms are currently recorded. Care and rest do not require a diagnosis.</p>'}${p && context !== 'fun' ? `<p class="small-copy">Recovery plan: ${p.attendedDays}/${p.totalDays} actual days attended; ${p.remainingDays} remain. ${p.careDays == null ? 'Earlier symptom-care days were not separately recorded.' : p.careDays+' symptom-care days separately recorded.'} Consultation: ${p.paid ? p.fee+' Gold paid once.' : p.fee+' Gold due on first attendance.'} A separate care session adds no plan attendance; plan completion does not guarantee symptom recovery.</p>` : ''}${destination}</details>`;
}

export function travelReferenceView(s, { legacy = !s.trail, days = null, fee = null, paid = false, camp = null } = {}) {
 const energy = legacy ? null : travelEnergyView(s);
 return {
  legacy, energy,
  rules:legacy ? paid ? 'This saved journey keeps its original pace, preparation payment and remaining terms. Modern Focus travel rules do not replace those saved terms.' : 'This route uses its quoted pace and preparation fee. Modern Focus travel rules do not apply to this earlier life.' : 'Travel and abilities use the same Focus. Below one quarter, each normal travel day takes two days; at zero, three. Continuing exhausted after unrested travel can be fatal.',
  time:(legacy ? 'Quoted road days and response days keep their own attendance. Rest and later choices can add time.' : 'Journey time is an estimate without further rest. Camping adds attended time and can change the remaining estimate. Calendar needs and encounters can pause travel.')+' Household living costs accrue only for actual adult days.',
  fee:Number.isFinite(fee) && fee >= 0 ? `${fee} Gold ${paid ? 'already committed' : 'departure fee'}.` : '',
  household:actionCostDetails(s,{days}),
  camp:camp ? { label:camp.label, description:camp.description, quote:actionCostSummary(s,camp), details:actionCostDetails(s,camp), disabledReason:camp.disabledReason || '' } : null,
 };
}

export function renderTravelReference(s, ui, options = {}) {
 const {e} = ui, v = travelReferenceView(s,options), camp = v.camp;
 return `<details class="action-cost-help status-reference" data-travel-reference="${v.legacy ? 'legacy' : 'focus'}" data-disclosure="${e(options.key || 'travel-reference')}"><summary>Focus, rest &amp; travel time</summary><p class="small-copy">${e(v.rules)}</p>${v.energy ? `<p class="small-copy"><strong>Focus ${v.energy.focus}/${v.energy.max}.</strong> ${e(v.energy.summary)}</p>` : ''}<p class="small-copy">${e(v.time)} ${e(v.fee)}</p>${v.household ? `<p class="small-copy">${e(v.household)} Estimates are not an upfront provider fee; only actual adult days accrue living costs.</p>` : ''}${camp ? `<p class="small-copy"><strong>${e(camp.label)} · ${e(camp.quote)}.</strong> ${e(camp.description)} ${e(camp.details)}${camp.disabledReason ? ' '+e(camp.disabledReason) : ''}</p>` : '<p class="small-copy">No camp action is currently offered here. Resolve the waiting moment or use an available safe resting place.</p>'}</details>`;
}
