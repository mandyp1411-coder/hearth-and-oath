import { AGE_UP_HELP } from './first-day-guide.js';

export function renderFirstDayGuide(state, view, { e, button, actionCostSummary, actionCostDetails }) {
  if (!view) return '';
  return `<details class="first-day-guide" data-disclosure="first-day-guide"${state.age<3||state.day===0?' open':''}><summary id="first-day-guide-heading">Find your footing</summary><p class="small-copy">Choose what matters to you. This guide is optional.</p><ol>${view.steps.map(step => `<li><strong>${e(step.title)}</strong><p>${e(step.description)}</p>${step.action ? `<p class="small-copy">${e(actionCostSummary(state, step.action))}${actionCostDetails(state, step.action) ? ' · ' + e(actionCostDetails(state, step.action)) : ''}</p>` : ''}${button(e(step.label), 'footing-step', step.key, 'ghost small')}</li>`).join('')}</ol><p class="small-copy">${e(AGE_UP_HELP)}</p>${button('Hide this guide for this life', 'footing-dismiss', '', 'ghost small')}</details>`;
}
