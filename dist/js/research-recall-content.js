import { researchDefinition, researchInterpretation } from './research-definitions.js';

// Shared literal content lets both the completed-message receipt validator and
// conversation adapter reconstruct the same bounded scene without a cycle.
export function researchRecallScene(run, person) {
  const definition = researchDefinition(run?.definitionId), reading = researchInterpretation(run?.definitionId, run?.interpretationId);
  if (!definition || !reading?.supported) return null;
  return { nodeId: 'research_recall', topic: `research-${run.id}`, title: 'The conclusion you actually sent',
    body: `${person.name} returns to your completed folio, ${definition.title}. “${reading.recall}”`,
    research: { runId: run.id, interpretationId: reading.id, recipientId: person.id },
    choices: [
      { id: 'source', label: 'Return to the supporting source', description: 'Discuss the cited evidence. No time, Gold or practice reward.', text: 'Which source carries that conclusion?', response: reading.claims.map(claim => claim.text).join(' '), effect: { memory: `We returned to your specific finding: ${reading.conclusion}` } },
      { id: 'limit', label: 'Keep the unresolved part visible', description: 'Remember the actual open questions, not a fabricated answer.', text: 'Let us keep the unanswered part beside it.', response: `The folio still asks: ${reading.openQuestions.join(' ')} An open question is not proof of the answer we would prefer.`, effect: { memory: `We kept the limits beside your specific finding: ${reading.conclusion}` } },
      { id: 'thanks', label: 'Thank them for preserving the credit', description: 'A real conversation about the received folio, without a new task.', text: 'Thank you for keeping the sources and their names together.', response: 'The finding, its sources and the people behind them will stay together. Receiving your folio did not make its private parts public.', effect: { memory: `We acknowledged your completed finding: ${reading.conclusion}` } },
      { id: 'leave', label: 'Let the folio rest for today', description: 'Close this actual exchange. No repeated task or reward.', text: 'That is enough for today. Let the folio rest.', response: 'Then we will leave the completed finding as it stands, with its questions still open.', effect: {} },
    ] };
}
