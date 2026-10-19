// Page-session UI state, deliberately separate from game saves and localStorage.
// The caller's key includes slot, seed, birth day and the actual person/generation.
export function createPersonalNoteDrafts() {
  const drafts = new Map();
  const get = key => drafts.get(key) || { text: '', saving: false, error: '', receipt: null };
  return {
    get,
    hasUnsubmitted() { return [...drafts.values()].some(d=>Boolean(d.text.trim())); },
    write(key, text, selection = null) {
      const draft = get(key);
      if (draft.saving || typeof text !== 'string') return draft;
      const next = { ...draft, text: text.slice(0, 2000) };
      if (selection && Number.isSafeInteger(selection.start) && Number.isSafeInteger(selection.end)) {
        next.selection = { start: Math.max(0, Math.min(text.length, selection.start)), end: Math.max(0, Math.min(text.length, selection.end)), direction: ['forward','backward','none'].includes(selection.direction) ? selection.direction : 'none' };
      }
      drafts.set(key, next); return next;
    },
    begin(key) {
      const draft = get(key);
      if (draft.saving || !draft.text.trim()) return null;
      const token = {};
      drafts.set(key, { ...draft, saving: true, error: '', token, submitted: draft.text });
      return token;
    },
    adopted(key, token, receipt) {
      const draft = get(key);
      if (draft.token === token) drafts.set(key, { ...draft, receipt });
    },
    finish(key, token, success) {
      const draft = get(key);
      if (draft.token !== token) return false;
      if (success) {
        if (draft.text === draft.submitted) drafts.delete(key);
        else drafts.set(key, { text: draft.text, saving: false, error: '', receipt: null });
      }
      else drafts.set(key, { ...draft, saving: false,
        error: 'Your draft is still here. Saving did not finish. Retry saving before closing this page.' });
      return true;
    },
    discard(key) {
      if (get(key).saving) return false;
      drafts.delete(key); return true;
    },
  };
}
