import { createTacticsPractice, takeTacticsPracticeAction } from './tactics-practice.js';

const sameContext = (left, right) => Object.keys(left).every(key => left[key] === right[key]) && Object.keys(left).length === Object.keys(right).length;

/** Memory-only UI controller. Its injected protection check is read-only; this
 * controller has no life, storage, navigation or persistence mutation API. */
export function createTacticsPracticeController({ readContext, coordinate, checkProtection }) {
  let state = null, pending = null, sequence = 0;
  const matches = token => Boolean(state && state.id === token);
  return {
    current: () => state,
    pending: () => Boolean(pending),
    cancelPending() { if (pending) { pending = null; sequence += 1; } },
    async open(lessonId, { stillCurrent = () => true, returnData = null } = {}) {
      if (state) return { status: 'cancelled' };
      const request = { id: ++sequence, context: readContext(), returnData };
      pending = request;
      const current = () => pending === request && stillCurrent() && sameContext(request.context, readContext());
      try {
        return await coordinate(() => {
          if (!current()) return { status: 'cancelled' };
          const protection = checkProtection(request.context);
          if (!current()) return { status: 'cancelled' };
          pending = null;
          if (!protection.ready) return { status: 'blocked', reason: protection.reason };
          state = { id: 'practice-' + request.id, practice: createTacticsPractice(lessonId), selectedEnemy: null, selectedAlly: null, origin: request.context, returnData };
          return { status: 'opened', id: state.id };
        });
      } catch {
        if (pending === request) pending = null;
        return { status: 'blocked', reason: 'Practice could not open safely. Your life has not been changed.' };
      } finally { if (pending === request) pending = null; }
    },
    act(token, actionId, targetId) {
      if (!matches(token) || state.practice.status !== 'active') return false;
      state = { ...state, practice: takeTacticsPracticeAction(state.practice, actionId, targetId) };
      return true;
    },
    select(token, side, id) {
      if (!matches(token) || state.practice.status !== 'active' || !['party', 'enemy'].includes(side)) return false;
      if (!state.practice.battle.actors.some(a => a.id === id && a.side === side && a.hp > 0)) return false;
      state = { ...state, [side === 'party' ? 'selectedAlly' : 'selectedEnemy']: id };
      return true;
    },
    lesson(token, lessonId) {
      if (!matches(token)) return false;
      const practice = createTacticsPractice(lessonId);
      state = { ...state, id: 'practice-' + ++sequence, practice, selectedEnemy: null, selectedAlly: null };
      return true;
    },
    close(token) {
      if (!matches(token)) return null;
      const previous = state; state = null; pending = null; sequence += 1; return previous;
    },
    discard() { const previous = state; state = null; pending = null; sequence += 1; return previous; },
  };
}
