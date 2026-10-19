import { RESEARCH_FLAVOR, RESEARCH_VERSION, researchDefinition, researchSource, researchInterpretation } from './research-definitions.js';
import { researchConclusionPreview, validateResearchActor, validateResearchPortfolio } from './research-portfolio.js';

const copy = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const c = (id, label, description, days = 0) => ({ id, label, description: `${description} ${days ? `${days} attended day; ordinary household costs accrue separately.` : 'No time or Gold.'}`, days, cost: 0, narrativeFlavor: RESEARCH_FLAVOR });

export function researchOfferScene(context) {
  const definition = researchDefinition(context.definitionId);
  if (!definition) return null;
  return { id: `research_offer_${definition.id}`, title: definition.title, category: 'Research portfolio',
    body: `${definition.opening}\n\n${definition.question}\n\n${context.archivist.name} holds finite public teaching copies in the local archive. You can request newly dated local copies at your household table or collect them at School & Archive. They are not visits to their distant originals. No private testimony is delivered through this lending route.\n\nSource reading and the home comparison take actual days. One comparison practices Scholarship once; research pays no Gold and does not replace paid Scholar work. There is no deadline, combat, calling, profession or house-purchase requirement.`,
    choices: [c('accept', 'Begin this question', 'Accept only this finite question. No source, attended day, reward or interpretation is granted yet.'), c('later', 'Leave the question on the shelf', 'No accepted task or failure.'), c('decline', 'Set this question aside', 'No accepted task or failure; you can reconsider explicitly.')], researchOffer: copy(context) };
}

export function researchRunScene(run, sceneId) {
  const definition = researchDefinition(run.definitionId);
  if (!definition) return null;
  if (sceneId === 'compare') {
    return { id: 'research_compare', title: 'Two pages that must not cover one another', category: definition.title,
      body: definition.requiredSources.map(id => { const source = researchSource(run.definitionId, id); return `${source.title}\n${source.text}\nLimit: ${source.limit}`; }).join('\n\n')
        + '\n\nLay the actual acquired copies beside one another at home. Match a proposition to the source that supports it; a vivid explanation is not another observation.',
      choices: [c('compare', 'Keep a day for the home comparison', 'Compare the sources actually in your folio. Practice Scholarship +1 once for this question; no Gold or commission credit.', 1), c('later', 'Leave the pages together for later', 'Keep every source; no comparison or practice is claimed.')] };
  }
  if (sceneId === 'interpret') return { id: 'research_interpret', title: 'What follows from the pages?', category: definition.title,
    body: `${definition.question}\n\n${definition.requiredSources.map(id => `${researchSource(run.definitionId, id).title}: ${researchSource(run.definitionId, id).limit}`).join('\n\n')}\n\nChoose a working reading. An unsupported reading stays a recoverable draft and explains the missing inference; it cannot become a documented verdict.`,
    choices: [...definition.interpretations.map(reading => c(reading.id, reading.label, reading.supported ? reading.conclusion : 'Try this as a provisional interpretation; the sources may not support it.')), c('later', 'Leave the interpretation open', 'No deadline or penalty.')] };
  if (sceneId === 'conclude') {
    const reading = researchInterpretation(run.definitionId, run.interpretationId);
    if (!reading?.supported) return null;
    const recipient = run.custody.at(-1)?.to || run.cast.archivist;
    const quote = researchConclusionPreview(run, { audience: 'public', quoteSourceIds: ['maker_margin'] });
    return { id: 'research_conclude', title: 'Who will read this folio?', category: definition.title,
      body: `${reading.conclusion}\n\n${reading.claims.map(claim => `${claim.text}\nSources: ${claim.sourceIds.map(id => researchSource(run.definitionId, id).title).join('; ')}.`).join('\n\n')}\n\nQuestions left open: ${reading.openQuestions.join(' ')}\n\nPublic historical contributors retain their source credit. The craftsperson’s private admission is excluded unless you explicitly choose a permitted quotation. ${recipient.name}, the recorded local archivist, receives a public deposit for the local reading collection or a private folio for their own reading only. A self-only folio informs nobody. Home collection takes one real day; a direct archive deposit takes no additional day.`,
      choices: [c('public', 'Deposit the public finding, without private admissions', 'Send the supported claims, public credits and open questions to the local reading collection.'),
        ...(quote ? [c('public_quote', 'Include the craftsperson’s permitted personal quotation', 'Explicitly include only the acquired admission for which this exact person granted quotation permission.')] : []),
        c('private', `Send this finding privately to ${recipient.name}`, 'Share the analysis with that exact person only. Do not include the private anecdote.'),
        c('self', 'Keep the finding only in my own folio', 'Complete the question without inventing an informed NPC.'), c('later', 'Keep the conclusion as a draft', 'No publication or completion yet.')] };
  }
  if (sceneId === 'consent') return { id: 'research_consent', title: 'A method, and a margin of their own', category: definition.title,
    body: `${run.cast.craftsperson.name} is willing to explain a comparable repair method. “I can speak about work I have done. That will not make me a witness to the mill’s first builder. There is a personal part I will keep private unless we agree otherwise.”\n\nHearing that bounded account is not permission to quote its personal admission. This visit happens at their real work room, not through the public-copy post.`,
    choices: [c('hear', 'Hear their bounded professional account', 'Keep one actual consultation day with this exact willing craftsperson. No quotation permission is implied.', 1), c('later', 'Let the consultation wait', 'No testimony or consent is claimed.'), c('decline', 'Continue with the two public sources', 'The whole research question remains completable without this personal account.')] };
  if (sceneId === 'quote') return { id: 'research_quote', title: 'Their admission is not a public source', category: definition.title,
    body: `${researchSource(run.definitionId, 'maker_margin').text}\n\nAsk ${run.cast.craftsperson.name} whether this particular admission may be quoted in this folio. They may refuse; their professional method and the public repair finding remain available either way.`,
    choices: [c('ask', 'Ask permission for this particular quotation', 'Record this exact person’s actual answer. A refusal is not a failed research task.'), c('private', 'Keep the admission private', 'No quotation permission is requested or implied.'), c('later', 'Leave the request for another day', 'No permission or obligation.')] };
  return null;
}

const withoutEdition = event => { const copy = { ...event }; delete copy.narrativeEdition; return copy; };
export function preserveResearchEvent(s, event) {
  if (!event?.id?.startsWith('research_')) return false;
  if (event.id.startsWith('research_offer_')) {
    const context = event.researchOffer;
    if (!context || Object.keys(context).length !== 5 || !['version', 'definitionId', 'locationId', 'archivist', 'offeredDay'].every(key => Object.hasOwn(context, key))
      || context.version !== RESEARCH_VERSION || !researchDefinition(context.definitionId) || context.locationId !== s.locationId
      || context.archivist?.locationId !== context.locationId || context.archivist?.capturedDay !== context.offeredDay
      || !Number.isSafeInteger(context.offeredDay) || context.offeredDay < 0 || context.offeredDay > s.day
      || !validateResearchActor(context.archivist, s, 'archivist')) return false;
    return same(withoutEdition(event), researchOfferScene(context));
  }
  const p = s.researchPortfolio?.pending, run = s.researchPortfolio?.runs.find(row => row.id === p?.runId);
  if (!p || !run || !validateResearchPortfolio(s.researchPortfolio, s)) return false;
  const expected = researchRunScene(run, p.sceneId);
  return !!expected && same(withoutEdition(event), expected);
}

export function validateResearchScene(s) {
  const pending = s.researchPortfolio?.pending;
  return s.event?.id?.startsWith('research_') ? preserveResearchEvent(s, s.event) : !pending;
}

export function researchEventIds() {
  return { research_offer_third_mark: ['accept', 'later', 'decline'], research_offer_early_bell: ['accept', 'later', 'decline'],
    research_compare: ['compare', 'later'], research_interpret: ['shared_repair', 'older_marks_open', 'ownership_chain', 'lantern_sequence', 'two_explanations', 'self_ringing', 'later'],
    research_conclude: ['public', 'public_quote', 'private', 'self', 'later'], research_consent: ['hear', 'later', 'decline'], research_quote: ['ask', 'private', 'later'] };
}
