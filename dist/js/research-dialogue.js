import { researchRecallCandidate, validateResearchPortfolio } from './research-portfolio.js';
import { researchRecallScene } from './research-recall-content.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function researchConversationEligible(s, person) {
  const site = s.world?.locations.find(site => site.id === s.locationId), record = s.npcContinuity?.people?.[person?.id];
  const candidate = researchRecallCandidate(s, person?.id), run = candidate && s.researchPortfolio.runs.find(run => run.id === candidate.runId);
  const ref = run && [run.cast.archivist, ...run.custody.map(row => row.to)].find(ref => ref.id === person.id);
  return !!person && !!record && record.snapshot?.id === person.id && record.snapshot?.name === person.name
    && record.retiredDay === null && person.available !== false && person.alive !== false && person.source?.alive !== false && !person.retired
    && !(s.life?.people || []).some(known => known.id === person.id && known.alive === false)
    && s.age >= 16 && s.phase !== 'retired' && !s.event && !s.battle && !s.maze && !s.justice?.prison
    && !s.timeline?.journey && !s.cartography?.offsite && !s.cartography?.pending
    && !!ref && person.locationId === ref.locationId && s.locationId === ref.locationId
    && ref.roomId === (s.cartography?.interior?.roomId || 'gate') && (!person.roomId || person.roomId === ref.roomId)
    && !!site && !['destroyed', 'evacuated'].includes(site.status) && site.servicesAvailable !== false
    && !s.realm?.politics?.holds.some(hold => hold.siteId === site.id && hold.status === 'held');
}
export function authenticResearchConversation(s, person, snapshot) {
  if (!s.researchPortfolio || !validateResearchPortfolio(s.researchPortfolio, s)) return false;
  const candidate = researchRecallCandidate(s, person.id), run = candidate && s.researchPortfolio.runs.find(run => run.id === candidate.runId);
  return !!run && same(snapshot, researchRecallScene(run, person));
}
export function researchConversation(s, person) {
  // Most contacts never received a folio. Do not validate a whole portfolio for
  // every unrelated ordinary conversation while deriving the room's actions.
  const candidate = researchRecallCandidate(s, person?.id);
  if (!candidate || !researchConversationEligible(s, person) || !validateResearchPortfolio(s.researchPortfolio, s)) return null;
  const run = s.researchPortfolio.runs.find(run => run.id === candidate.runId);
  return run ? researchRecallScene(run, person) : null;
}
export function recordResearchConversation(s, person, scene, choice) {
  if (scene.nodeId !== 'research_recall' || !researchConversationEligible(s, person) || !authenticResearchConversation(s, person, scene)) return;
  const run = s.researchPortfolio.runs.find(run => run.id === scene.research.runId), thread = s.conversations.threads[person.id];
  const response = thread.at(-1), question = thread.at(-2), opening = thread.findLast(message => message.speaker === person.id && message.text === scene.body);
  if (!opening || question?.speaker !== 'hero' || question.text !== choice.text || response?.speaker !== person.id || response.text !== choice.response || response.day !== s.day) return;
  run.recalls.push({ personId: person.id, day: s.day, interpretationId: run.interpretationId, openingId: opening.id, replyId: response.id, choiceId: choice.id });
}
export function validateResearchPendingConversation(value, s) {
  const pending = value.pending;
  if (pending?.nodeId !== 'research_recall') return true;
  const context = { ...s, conversations: value }, person = s.npcContinuity?.people?.[pending.personId]?.snapshot;
  return !!person && authenticResearchConversation(context, person, pending.snapshot);
}
