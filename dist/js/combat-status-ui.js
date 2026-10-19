import { combatStatusRows } from './combat-statuses.js';
import { resolveEnemyTargets } from './enemy-targets.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderCombatStatuses(actor) {
  const rows = combatStatusRows(actor);
  if (!rows.length) return '';
  return `<div class="badge-row" aria-label="Current combat effects">${rows.map(row => `<span class="badge" data-combat-status="${escape(row.key)}" title="${escape(row.detail)}">${escape(row.label)}</span>`).join('')}</div><details class="small-copy" data-combat-status-details><summary>Effects explained</summary>${rows.map(row => `<p><strong>${escape(row.label)}:</strong> ${escape(row.detail)}</p>`).join('')}</details>`;
}

export function enemyRecipientPrediction(battle, actor, displayName = a => a.name) {
  if (actor?.side !== 'enemy' || actor.hp <= 0 || battle.outcome || !actor.intent) return null;
  const selection = resolveEnemyTargets(battle, actor), names = selection.recipients.map(a => displayName(a));
  let text;
  if (selection.scope === 'none') text = `Current prediction: ${selection.reason}`;
  else if (selection.scope === 'all_party') text = `Current recipient: Party-wide · ${names.join(', ')}.`;
  else if (selection.scope === 'all_enemies') text = `Current support: All living enemies · ${names.join(', ')}.`;
  else if (selection.aim) text = `Current aim: ${displayName(selection.aim)} · preparation only, no hit this action.`;
  else if (selection.scope === 'self') text = `Current ${selection.preparation ? 'preparation' : 'support'}: Self (${names.join(', ')}).`;
  else text = `Current ${selection.scope === 'enemy' ? 'support' : 'recipient'}: ${names.join(', ')}.`;
  if (Object.hasOwn(selection, 'donor')) text += selection.donor ? ` Ward source: ${displayName(selection.donor)}.` : ' No living ward donor.';
  if (selection.recoveryRecipient) text += ` Recovery: ${selection.recoveryRecipient.id === actor.id ? 'Self' : displayName(selection.recoveryRecipient)} from actual damage, if any.`;
  const extra = selection.secondaryRecipients.filter(a => !selection.recipients.some(r => r.id === a.id));
  if (extra.length) text += ` Current trait target: ${extra.map(a => displayName(a)).join(', ')}.`;
  return { text, recipientIds: selection.recipients.map(a => a.id), targetId: selection.target?.id || null, scope: selection.scope };
}

export function renderEnemyPrediction(battle, actor, displayName = a => a.name) {
  const prediction = enemyRecipientPrediction(battle, actor, displayName);
  return prediction ? `<p class="small-copy" data-enemy-prediction="${escape(actor.id)}">${escape(prediction.text)}</p>` : '';
}
