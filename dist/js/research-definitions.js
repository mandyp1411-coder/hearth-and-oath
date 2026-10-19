// Finite questions, not a procedural commission board. Text is source material;
// discovering a catalog entry does not put any of these sources in the folio.
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const RESEARCH_VERSION = 1;
export const RESEARCH_FLAVOR = 'research-portfolio-1';
export const RESEARCH_DEFINITIONS = freeze([
  {
    id: 'third_mark', title: 'The Third Mark on the Axle',
    question: 'Do three maker marks describe successive owners, original builders, or one shared repair?',
    opening: 'A teaching rubbing lies beneath a newer caption: THREE OWNERS OF THE OLD MILL. The oldest mark is partly hidden under a fitted collar. Someone has written, in a smaller hand, “Or three people who kept it turning?”',
    loreIds: ['millwright', 'craft'], requiredSources: ['axle_rubbing', 'repair_shares'],
    sources: [
      {
        id: 'axle_rubbing', title: 'The public axle rubbing', scope: 'public', kind: 'record',
        originLocationId: 'mill', institutionKind: 'workshop',
        attribution: 'The mill repair collection; the original marker of the older shaft is unestablished.',
        text: 'Two marks lie on the old shaft. A third lies on the fitted replacement collar. The teaching caption calls them three successive owners. The rubbing itself supplies neither an ownership transfer nor a date for the mill’s first construction.',
        limit: 'This is a dated local teaching copy of a rubbing, not an inspection of the distant axle.',
      },
      {
        id: 'repair_shares', title: 'A schedule of repair shares', scope: 'public', kind: 'record',
        originLocationId: 'mill', institutionKind: 'workshop',
        attribution: 'The carpenter, smith and ferry household named in the public repair account.',
        text: 'A carpenter fitted the hub, a smith made the collar, and a ferry household hauled and raised the axle. Each received an agreed share of flour until the repair was repaid. The schedule calls these repair shares; it contains no sale of the mill and no account of its first builder.',
        limit: 'A payment share is not an ownership deed. The three recorded contributors need not be the original builders.',
      },
      {
        id: 'maker_margin', title: 'The craftsperson’s private margin', scope: 'private', kind: 'testimony',
        originLocationId: null, institutionKind: null,
        attribution: 'The exact living local craftsperson, speaking about their own practice.',
        text: 'The craftsperson explains how a repair mark can lie on a replacement part. More quietly, they admit that a practice piece bearing their teacher’s mark was once cataloged under their own name. “Use the method. Leave that admission with me unless I say otherwise.”',
        publicMethod: 'A mark on a replacement collar can date a repair without identifying the original builder.',
        limit: 'This is present professional experience, not eyewitness testimony about the old mill. Permission to hear it is not permission to publish the personal admission.',
      },
    ],
    interpretations: [
      {
        id: 'shared_repair', label: 'Name the repair, not an invented founder', supported: true,
        claims: [
          { id: 'joint_repair', text: 'The three marks can be attributed to the recorded collaborative repair.', status: 'inferred', sourceIds: ['axle_rubbing', 'repair_shares'] },
          { id: 'repair_payment', text: 'The recorded flour shares reimburse repair work; the schedule does not transfer the mill.', status: 'documented', sourceIds: ['repair_shares'] },
        ],
        openQuestions: ['Who first built the mill?', 'Who made the older shaft mark?'],
        conclusion: 'The repair belongs to three recorded contributors. A share of flour is not ownership of the wheel; the original-builder line stays open.',
        recall: 'Your note distinguished a share of flour from ownership of the wheel. I have kept the original-builder line blank.',
      },
      {
        id: 'older_marks_open', label: 'Keep the older marks unresolved', supported: true,
        claims: [{ id: 'recorded_collaboration', text: 'The schedule documents a shared repair, but it does not settle the identity of every older mark.', status: 'documented', sourceIds: ['repair_shares'] }],
        openQuestions: ['Which older mark belongs to which repair?', 'Who first built the mill?'],
        conclusion: 'The repair collaboration is documented. The older marks and the first builder remain unresolved; no ownership chain has been established.',
        recall: 'You left the older marks unresolved while preserving the documented shared repair. That is a limit, not a missing owner we can invent.',
      },
      {
        id: 'ownership_chain', label: 'Try reading the marks as three former owners', supported: false,
        claims: [], openQuestions: ['Do any surviving deeds establish an ownership chain?'],
        explanation: 'The repair schedule describes payment, not a sale. The marks alone cannot turn that payment into three ownership transfers. Revise the reading or keep ownership as an open question.',
      },
    ],
  },
  {
    id: 'early_bell', title: 'The Bell That Rang Before the Storm',
    question: 'Did the warning precede permission, and what actually carried it?',
    opening: 'The ceremonial account says the captain’s order saved the lower road. In the watch copy, the warning comes before the order. A singer calls it the bell that spoke without a hand. The archivist asks you to keep those three sentences from becoming one.',
    loreIds: ['signals', 'watchers', 'stars'], requiredSources: ['warning_log', 'repair_account', 'observatory_log'],
    sources: [
      {
        id: 'warning_log', title: 'The watch’s warning log', scope: 'public', kind: 'record',
        originLocationId: 'citadel', institutionKind: 'order',
        attribution: 'The watch-keepers who recorded the early warning.',
        text: 'Before the captain’s authorization, a watch-keeper sent three shuttered lantern signals down the road. The upper bell rope was recorded as unfit. The log records a warning sent, not a bell rung by an unseen hand.',
        limit: 'The event sequence is not the date on which a later copy was made.',
      },
      {
        id: 'repair_account', title: 'The repair without an approval', scope: 'public', kind: 'record',
        originLocationId: 'citadel', institutionKind: 'order',
        attribution: 'The public makers’ and watch-keepers’ maintenance account.',
        text: 'The warning-bell repair was postponed while officials disputed its cost. A keeper’s approval space remains blank. The account establishes unfinished maintenance; it does not establish that no bell anywhere on the lower road could sound.',
        limit: 'A missing approval is not proof of sabotage, theft, or supernatural silence.',
      },
      {
        id: 'observatory_log', title: 'Three lights seen from the tower', scope: 'public', kind: 'record',
        originLocationId: 'tower', institutionKind: 'academy',
        attribution: 'The observatory keepers who dated the signal observations.',
        text: 'Three upland lights were seen before an alarm was heard from the lower road. The observer recorded the order of those observations, but did not identify the lower bell or see who rang it.',
        limit: 'An alarm heard is not an identified bell, and an unidentified bell is not proof of enchantment.',
      },
    ],
    interpretations: [
      {
        id: 'lantern_sequence', label: 'A warning crossed the dark before the order', supported: true,
        claims: [
          { id: 'early_warning', text: 'The recorded lantern warning preceded the captain’s authorization.', status: 'documented', sourceIds: ['warning_log'] },
          { id: 'observed_sequence', text: 'The observatory saw the signal lights before it heard the lower-road alarm.', status: 'documented', sourceIds: ['observatory_log'] },
          { id: 'repair_unfinished', text: 'The upper bell’s maintenance lacked recorded approval.', status: 'documented', sourceIds: ['repair_account'] },
        ],
        openQuestions: ['Which lower-road bell sounded?', 'What caused the later alarm?'],
        conclusion: 'The lights carried a warning before the order. The later sound remains unidentified; no self-ringing bell has been proved.',
        recall: 'You established the lights before the order, not a bell speaking by itself. The later sound still has its question beside it.',
      },
      {
        id: 'two_explanations', label: 'Keep two explanations beside the observations', supported: true,
        claims: [{ id: 'bounded_sequence', text: 'The sources establish an early warning and a later unidentified alarm, not a proven explanation of that sound.', status: 'inferred', sourceIds: ['warning_log', 'repair_account', 'observatory_log'] }],
        openQuestions: ['Was the later alarm an ordinary relay?', 'Could resonance explain the unidentified sound?', 'Which lower-road bell sounded?'],
        conclusion: 'An ordinary relay and a stranger resonance remain hypotheses beside the observed sequence. Neither is promoted into a verified world fact.',
        recall: 'You kept the relay and the stranger resonance as competing explanations. Neither became a fact simply because its story was appealing.',
      },
      {
        id: 'self_ringing', label: 'Try proving that the bell rang by itself', supported: false,
        claims: [], openQuestions: ['What evidence could identify the later bell and its cause?'],
        explanation: 'The observer heard an unidentified alarm. That does not identify a bell or establish an unseen cause. Keep the idea as a question or revise the conclusion; no failure is recorded.',
      },
    ],
  },
]);

export const researchDefinition = id => RESEARCH_DEFINITIONS.find(row => row.id === id) || null;
export const researchSource = (definitionId, sourceId) => researchDefinition(definitionId)?.sources.find(row => row.id === sourceId) || null;
export const researchInterpretation = (definitionId, interpretationId) => researchDefinition(definitionId)?.interpretations.find(row => row.id === interpretationId) || null;
export const researchObjectId = (definitionId, sourceId) => `research-${definitionId}-${sourceId}`;

// Pure: catalogs never initialize state, discover lore or accept a question.
export function researchCatalog(s) {
  return RESEARCH_DEFINITIONS.filter(definition => definition.sources.every(source => source.originLocationId === null || s.world?.locations?.some(place => place.id === source.originLocationId)))
    .map(definition => ({ id: definition.id, title: definition.title, question: definition.question, sourceCount: definition.sources.length, requiredCount: definition.requiredSources.length }));
}
