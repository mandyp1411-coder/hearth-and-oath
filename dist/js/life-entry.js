import { createPositionAdmission } from './position-admission.js';

export const LIFE_ENTRY_REFUSED = 'position-not-admitted';
export const LIFE_ENTRY_CANCELLED = 'cancelled';

/** Save-entry coordination only. It never migrates or simulates a life.
 * Keep decoding and read/export/recovery inspection on the retained store. */
export function createLifeEntry({store, coordinate, acceptPosition} = {}) {
  const accepts = createPositionAdmission(acceptPosition);
  const canEnter = state => Boolean(state) && accepts(state);
  return {
    canEnter,
    /** Both the requesting view and its captured position must survive the
     * queue. Admission is checked again inside the caller's save lock. */
    replaceReviewed({state, slot, token, isCurrent} = {}) {
      if (typeof isCurrent !== 'function' || !isCurrent()) return LIFE_ENTRY_CANCELLED;
      if (!canEnter(state)) return LIFE_ENTRY_REFUSED;
      const captured = JSON.stringify(state), candidate = JSON.parse(captured);
      return coordinate(() => {
        if (!isCurrent() || JSON.stringify(state) !== captured) return LIFE_ENTRY_CANCELLED;
        if (!canEnter(candidate)) return LIFE_ENTRY_REFUSED;
        return store.replace(slot, candidate, {reviewed: true, token});
      });
    },
  };
}
