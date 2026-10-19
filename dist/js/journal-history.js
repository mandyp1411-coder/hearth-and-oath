import { undertakingStatusLabel } from './undertaking-contract.js';

/** Captured history is displayed, never replayed or regenerated from today's state. */
export function renderStoryDecisions(arc,ui){
  const {e,date}=ui;
  if(!arc.choices?.length)return '';
  return `<details class="story-decisions" data-story-record="${e(arc.id)}"><summary>Decisions &amp; consequences · ${arc.choices.length}</summary><ol class="decision-trail">${arc.choices.map((c,i)=>`<li data-story-decision="${i+1}"><h4>Chapter ${i+1}: ${e(c.label||'Earlier decision')}</h4><p>${e(c.outcome||'The detailed outcome was not recorded.')}</p><small>${Number.isSafeInteger(c.day)?e(date(c.day)):'Date unrecorded'}${Number.isSafeInteger(c.days)?' · '+c.days+' attended days':''}${Number.isSafeInteger(c.cost)?' · '+c.cost+' Gold fee':''}${Number.isSafeInteger(c.reward)?' · '+c.reward+' Gold proceeds':''}</small></li>`).join('')}</ol></details>`;
}
export function renderClosingAccounts(s,ui){
  const r=s.questLog?.closingReview;if(!r)return '';
  const {e,date}=ui;
  return `<section class="panel" data-closing-quest-record><h2>${e(r.heroName)}’s closing account</h2><p>${e(date(r.day))} · ${r.decision==='leave_at_retirement'?'Chosen at retirement':'This life ended'}</p><p>${r.counts.completed} completed · ${r.counts.abandoned} abandoned · ${r.counts.failed||0} failed · ${r.counts.paused} paused · ${r.counts.neverAccepted} offers not accepted.</p>${r.unfinished.length?`<h3>Left unfinished</h3>${r.unfinished.map(q=>`<article class="remembered-entry"><h4>${e(q.title)}</h4><span class="badge">${undertakingStatusLabel(q.status)}</span><p>${e(q.detail)}</p></article>`).join('')}`:'<p>No accepted undertaking was left unfinished.</p>'}</section>`;
}

/** Saved contract terms and proof survive board refresh; rendering grants nothing. */
export function renderContractReceipt(record,ui){
  const {e}=ui;
  return `<details class="panel" data-contract-record="${e(record.id)}"><summary>${e(record.title)} · ${e(undertakingStatusLabel(record.result))} · ${e(record.client)}</summary><p>${e(record.objective)}</p><p>${e(record.boardName)} → ${e(record.destinationName)}</p><p class="small-copy">${record.closedDay===null?'Closing date was not recorded in this older save':'Closed on world day '+record.closedDay} · ${record.reward} Gold paid</p>${record.proof?`<p>Earned ${record.proof.method?'field-work':'combat'} proof on world day ${record.proof.day}${record.proof.captured?' · living captive presented':''}.</p>`:'<p>No completion proof or reward was claimed.</p>'}${record.attempts.map(a=>`<p class="small-copy">World day ${a.day}: ${a.outcome==='defeat'?'Failed combat attempt':a.outcome==='retreat'?'Withdrew from the encounter':'Encounter won'}.</p>`).join('')}</details>`;
}
