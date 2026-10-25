import { observationalInfancy } from './development.js';

/** Read a single real unfinished moment. No transition, lookup cache or world
 * clone belongs in a saved-life preview. The canonical commitment reader is
 * injected by the shell and is consulted only after higher-priority moments. */
export function returnLifeContext(state, readCommitment = () => null) {
  if (!state || state.phase === 'retired') return '';
  if (state.battle) return 'Encounter unfinished';
  if (state.event) {
    const label=observationalInfancy(state)?'Watching your first years':'Decision waiting';
    return state.event.title ? `${label}: ${state.event.title}` : label;
  }
  if (state.conversations?.pending) return 'Reply waiting';
  if (state.maze) return 'Descent underway';
  if (state.justice?.prison) return 'Sentence unfinished';
  if (state.timeline?.journey || state.cartography?.pending || state.cartography?.route || state.cartography?.offsite) return 'On the road';
  if (state.workshop?.project) return state.workshop.project.title ? `Project paused: ${state.workshop.project.title}` : 'Workshop project paused';
  if (state.careers?.batch) return 'Work commitment paused';
  const commitment = readCommitment(state);
  if (commitment) return commitment.title ? `Commitment paused: ${commitment.title}` : 'Commitment paused';
  if (state.life?.plan || state.timeline?.yearTarget != null) return 'Year in progress';
  return '';
}

/** Presentation only. Save health remains the store's authoritative distinction
 * between a live session, this tab's slot copy and the durable browser save. */
export function returnLifeCardView(state, health, { live = false, readCommitment } = {}) {
  if (!state) return null;
  return {
    context: returnLifeContext(state, readCommitment),
    sourceNote: returnLifeSourceNote(health, live),
    exportLabel: `Export ${live ? 'latest session for' : 'this tab’s copy of'} ${state.hero.name} from slot ${health.id + 1}`,
  };
}

export function returnLifeSourceNote(health, live = false) {
  return health.hasChanges ? (live ? 'Latest session; not yet saved in this browser.' : 'This tab’s unsaved copy.') : health.status === 'stale' ? 'This tab’s older copy; review the save conflict before returning.' : '';
}
