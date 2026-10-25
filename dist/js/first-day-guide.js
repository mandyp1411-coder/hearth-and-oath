/** Presentation state belongs to this saved life, not its seed or browser slot. */
export const AGE_UP_HELP = 'Age up advances toward your next birthday, potentially many days, and may pause for a decision. You can choose everyday activities before turning the year.';
export function validFirstDayGuide(value) {
  return value === undefined || Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 2 && Object.hasOwn(value, 'version') && Object.hasOwn(value, 'dismissed') && value.version === 1 && typeof value.dismissed === 'boolean');
}
export function firstDayGuideVisible(state, reopened = false) {
  return Boolean(state && state.phase !== 'retired' && (reopened || state.hero?.firstDayGuide?.version === 1 && state.hero.firstDayGuide.dismissed === false));
}
export function dismissFirstDayGuide(state) {
  const next = structuredClone(state);
  next.hero.firstDayGuide = { version: 1, dismissed: true };
  return next;
}

const enabled = row => row && !row.disabledReason;
const moment = (key, title, description, focus = 'moment') => ({ key, title, description, focus, label: 'Go to this moment' });
const saveStep = () => ({ key: 'saving', title: 'Keep this life', description: 'Check the browser-save status above. Export life in Menu keeps a separate file.', label: 'Open Menu', op: 'menu', id: '' });
export function firstDayGuideFocusSelectors(focus) {
  const targets = {
    event: ['.story-scene h2'], reply: ['.dialogue-speaker h2'],
    battle: ['.battle-command-panel', '.battle-workspace h1'],
    descent: ['.maze-current h2', '.dungeon-heading h1', '.maze-heading h1'],
    prison: ['.chapter-heading h1'],
    commitment: ['.project-panel h2', '.ongoing-activity h2', '.saved-year h2'],
    age: ['.age-up-button'],
  };
  return [...(targets[focus] || []), '.life-current', '.workspace-body'];
}

/** Bounded read-only adapter. Never call simulation transitions from a preview.
 * Readers are injected so the guide shares the actual action/provider models.
 * At most one local provider and one projected room are inspected per source.
 */
export function firstDayGuideView(state, readers) {
  if (!state || state.phase === 'retired') return null;
  let current;
  if (state.battle) current = moment('battle', 'Attend to the encounter', 'The encounter is still unfolding. Its existing commands remain in control.', 'battle');
  else if (state.event) current = moment('event:' + state.event.id, 'Begin with this moment', state.age<3?`“${state.event.title}” is a moment in your early life. Continue watching to see what your caregivers do.`:`“${state.event.title}” is waiting for your decision. Choose from its existing replies.`, 'event');
  else if (state.conversations?.pending) current = moment('reply:' + state.conversations.pending.personId, 'A reply is waiting', 'Return to the current conversation and choose what you want to say.', 'reply');
  else if (state.maze) current = moment('descent', 'Your current undertaking', 'Review the descent already underway before choosing another activity.', 'descent');
  else if (state.cartography?.pending || state.cartography?.offsite || state.timeline?.journey) current = { ...moment('journey', 'Your journey continues', 'Review your actual route and its existing continuation, rest or return choices.'), op: 'tab', id: 'map' };
  else {
    const commitment = readers.commitment(state);
    if (commitment || state.justice?.prison || state.workshop?.project || state.careers?.batch || state.life?.plan) current = moment('commitment', 'Review your current commitment', commitment?.title || 'Your existing work, sentence or saved year is waiting. Continue or review it in the current moment.', state.justice?.prison ? 'prison' : 'commitment');
    else if (readers.ageControl?.()?.needsBlood) current = moment('need', 'Attend to your current need', 'Your year control shows a need to attend to before continuing.', 'age');
  }
  if (current) return { steps: [current, saveStep()] };

  const actions = readers.actions(state), unlocks = readers.unlocks(state), unlocked = id => unlocks.some(row => row.id === id && row.unlocked);
  const kind = unlocked('school') && !unlocked('adult') ? 'school' : unlocked('work') ? 'work' : null;
  const steps = [];
  if (kind) {
    const provider = readers.services(state).find(row => row.locationId === state.locationId && row.kind === kind && (kind !== 'school' || row.subjectId === (state.education?.route || 'community')));
    const path = provider && readers.walkPath(state, provider.roomId);
    if (provider && Array.isArray(path) && (!path.length || enabled(actions.find(row => row.id === 'atlas_room_' + path[0])))) {
      const projected = provider.here ? state : { ...state, cartography: { ...structuredClone(state.cartography), interior: { siteId: state.locationId, roomId: provider.roomId } } };
      const offers = readers.offers(provider, projected === state ? actions : readers.actions(projected));
      const useful = offers.some(row => enabled(row) && (kind === 'school' || /^career_(choose_(?!unemployed$)|work$|practice$|invoice$|accept_)/.test(row.id)));
      if (useful) steps.push({ key: 'service:' + provider.id, title: kind === 'school' ? 'Meet a local teacher' : 'Meet the local work steward', description: kind === 'school' ? 'Review the available learning choices. Visiting does not enroll you or attend a lesson.' : 'Review local work before choosing a trade, shift or commission.', label: 'Visit ' + provider.name, op: 'activity-visit', id: provider.id });
    }
  }
  const ordinaryIds = !unlocked('school') ? ['grow_family', 'grow_nursery', 'grow_play'] : !unlocked('adult') ? ['grow_play', 'leisure_walk', 'grow_family', 'leisure_outdoors', 'leisure_sketch'] : ['leisure_walk', 'leisure_read', 'leisure_outdoors', 'leisure_sketch', 'pastime_petcare', 'grow_family'];
  const ordinary = ordinaryIds.map(id => actions.find(row => row.id === id)).find(enabled);
  if (ordinary) steps.push({ key: 'action:' + ordinary.id, title: 'Make something of today', description: ordinary.description, label: ordinary.label, op: 'activity', id: ordinary.id, action: ordinary });
  if (!steps.length) steps.push({ key: 'help', title: 'Take your time', description: 'How to play explains the current views and controls. Your existing choices remain yours.', label: 'Read How to play', op: 'help', id: '' });
  return { steps: [...steps, saveStep()] };
}

/** A stale guide command is never permission to perform its old suggestion. */
export function firstDayGuideCommand(state, key, readers) {
  return firstDayGuideView(state, readers)?.steps.find(step => step.key === key) || null;
}
