import { researchDefinition, researchSource, researchInterpretation } from './research-definitions.js';
import { researchOwnerId } from './research-portfolio.js';

function sourceCards(s, run, ui) {
  const { e } = ui;
  return researchDefinition(run.definitionId).sources.filter(source => run.evidence.some(entry => entry.id === `source-${source.id}`)).map(source => {
    const copy = run.copies.find(copy => copy.sourceId === source.id), proof = run.evidence.find(entry => entry.id === `source-${source.id}`);
    const custodian = copy && (copy.sourceRevision === 0 ? run.cast.archivist : run.custody[copy.sourceRevision - 1].to);
    const provenance = copy ? `Requested day ${copy.requestedDay}; new local copy prepared day ${copy.preparedDay}, received day ${copy.receivedDay}. Original collection: ${s.world.locations.find(place => place.id === copy.originLocationId)?.name || copy.originLocationId}. Actual reading and custody: ${s.world.locations.find(place => place.id === copy.custodyLocationId)?.name || copy.custodyLocationId}. Local copy assistance: ${custodian.name}.`
      : `Private account heard from ${run.cast.craftsperson.name} on day ${proof.day}. Quotation is ${run.permissions.some(permission => permission.scope === 'quote' && permission.decision === 'willing') ? 'permitted for this folio only' : 'not permitted'}.`;
    return `<details class="remembered-entry" data-research-source="${e(source.id)}"><summary>${e(source.title)} · ${source.scope === 'public' ? 'Public source' : 'Private personal account'}</summary><p>${e(source.text)}</p><p class="small-copy">${e(source.limit)}</p><p class="small-copy">${e(provenance)}</p><p class="small-copy">Credit: ${e(copy ? source.attribution : run.cast.craftsperson.name)}</p></details>`;
  }).join('');
}
function runCard(s, run, ui) {
  const { e } = ui, definition = researchDefinition(run.definitionId), reading = researchInterpretation(run.definitionId, run.interpretationId);
  return `<article class="research-folio" data-research-run="${e(run.id)}"><h3>${e(definition.title)}</h3><p>${e(definition.question)}</p><p class="small-copy">${run.status === 'completed' ? `Completed day ${run.endedDay} · ${run.finalization.audience === 'self' ? 'Self-only' : run.finalization.audience === 'private' ? 'One named private reader' : 'Local public deposit'}` : run.status === 'withdrawn' ? 'Closed without a verdict' : run.status === 'interrupted' ? 'Earlier life ended with the question unfinished' : 'Accepted question'} · ${run.comparison ? 'Comparison and once-only practice recorded' : 'Comparison not yet performed'} · 0 Gold earned.</p>${reading?.supported ? `<p>${e(reading.conclusion)}</p>` : reading ? `<p>${e(reading.explanation)}</p>` : ''}${run.claims.length ? `<ul>${run.claims.map(claim => `<li>${e(claim.text)} <small>(${e(claim.status)}; ${e(claim.sourceIds.map(id => researchSource(run.definitionId, id).title).join('; '))})</small></li>`).join('')}</ul>` : ''}${run.openQuestions.length ? `<p class="small-copy">Open questions: ${e(run.openQuestions.join(' '))}</p>` : ''}${sourceCards(s, run, ui)}</article>`;
}

export function renderResearchShelf(s, actions, ui) {
  const portfolio = s.researchPortfolio;
  if (portfolio && portfolio.ownerId !== researchOwnerId(s)) return '';
  const offered = actions.filter(action => action.id.startsWith('research_'));
  const active = portfolio?.runs.find(run => run.status === 'active');
  if (!offered.length && !active) return '';
  return `<details class="home-disclosure research-shelf" data-disclosure="home-research" ${active ? 'open' : ''}><summary>${active ? 'Your research table' : 'Research shelf · two finite questions'}</summary><p class="small-copy">Public teaching copies can reach this actual household table. Reading and comparison take real days; no combat, calling or property purchase is required. Paid Scholar work remains separate.</p>${active ? runCard(s, active, ui) : ''}${ui.actionCards(offered)}</details>`;
}

export function renderResearchArchive(s, ui, { query = '' } = {}) {
  if (s.researchPortfolio?.ownerId !== researchOwnerId(s)) return '';
  const runs = s.researchPortfolio.runs.filter(run => run.status !== 'active' && (!query || [researchDefinition(run.definitionId).title, ...run.claims.map(claim => claim.text), ...run.openQuestions].join(' ').toLowerCase().includes(query.toLowerCase())));
  return runs.length ? `<section class="panel research-archive" data-research-archive><h2>Research folios</h2>${runs.map(run => runCard(s, run, ui)).join('')}</section>` : '';
}
