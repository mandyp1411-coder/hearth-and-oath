const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));

/** A synchronous policy for an already decoded position. Reading retained
 * data is separate: refusal never makes an occupied save an empty slot. */
export function createPositionAdmission(acceptPosition) {
  if (acceptPosition !== undefined && typeof acceptPosition !== 'function') throw new TypeError('acceptPosition must be a function.');
  return state => {
    if (acceptPosition === undefined) return true;
    // A predicate receives a disposable snapshot. Neither its mutations nor
    // an exception may alter the caller's position or any retained state.
    // Admission is synchronous: native Promises are refused, with rejection
    // consumed without awaiting them or assimilating arbitrary thenables.
    try {
      const accepted = acceptPosition(copy(state));
      if (accepted && typeof accepted === 'object') {
        try { Promise.prototype.then.call(accepted, () => {}, () => {}); }
        catch {} // Not a native Promise; it still cannot grant admission.
      }
      return accepted === true;
    }
    catch { return false; }
  };
}
