import { actionCostSummary, actionCostDetails } from './action-costs.js';

export function renderHerbalCareReview(s, quote, ui) {
  if (!quote) return '';
  const { e, button } = ui;
  return `<div class="modal-overlay"><section class="modal herbal-care-dialog" role="dialog" aria-modal="true" aria-labelledby="herbal-care-heading"><button type="button" class="modal-close button ghost" data-op="close-modal" aria-label="Cancel herbal care">×</button><span class="eyebrow">REVIEW YOUR CARE</span><h2 id="herbal-care-heading" tabindex="-1">Prepare Medicinal Herbs</h2><p>Recipient: <strong>${e(quote.targetName)}</strong></p><p class="herbal-care-cost"><strong>${e(actionCostSummary(s, quote))} · ${quote.materials.herbs} Medicinal Herb${quote.materials.herbs === 1 ? '' : 's'}</strong></p><p class="small-copy">${e(actionCostDetails(s, quote))}</p><p>${e(quote.description)}</p><p>${e(quote.effectExplanation)}</p><p class="small-copy">The receipt records actual time, supplies and changes. Calendar interruptions and ongoing symptoms can affect the session.</p>${quote.disabledReason ? `<p class="disabled-reason" role="status">${e(quote.disabledReason)}</p>` : ''}<div class="modal-buttons">${button('Prepare Care for ' + e(quote.targetName), 'herbal-care-confirm', '', 'primary', Boolean(quote.disabledReason))}${button('Keep My Supplies', 'close-modal', '', 'ghost')}</div></section></div>`;
}
