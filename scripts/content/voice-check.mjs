// The voice check: player-facing text is in the game's voice, not an audit
// log, and never a placeholder. This is the one function the validator calls
// on every text field. A fuller `scripts/lib/voice-rules.mjs` with
// `lintText(text)` is being written on another branch; the integrator swaps
// the import in validate.mjs and the report shape stays the same.
//
// Two classes of hit: `placeholder` (text that was never written: TODO, lorem,
// an unresolved `${`, a stringified object) and `voice` (the audit-log phrases
// the house does not say to the player). The validator treats the first as an
// error and the second as a warning.

const word = (phrase, kind) => ({ phrase, kind, pattern: new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') });
const literal = (phrase, kind) => ({ phrase, kind, pattern: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });

export const PHRASES = Object.freeze([
  // What was never written.
  word('TODO', 'placeholder'), word('TBD', 'placeholder'), word('FIXME', 'placeholder'), word('lorem', 'placeholder'),
  word('placeholder', 'placeholder'), word('undefined', 'placeholder'), word('NaN', 'placeholder'),
  literal('[object Object]', 'placeholder'), literal('${', 'placeholder'),
  // The audit log.
  word('recorded', 'voice'), word('category', 'voice'), literal('settled separately', 'voice'), word('accrues', 'voice'),
  literal('not a promise of', 'voice'), literal('Choose this action', 'voice'),
]);

/**
 * Every phrase in `text` the house does not say. Returns `[{ phrase, kind, index }]`,
 * one row per phrase (the first place it appears), or an empty array for clean text.
 * Non-strings are not text and return no hits.
 */
export function voiceCheck(text) {
  if (typeof text !== 'string' || !text) return [];
  const hits = [];
  for (const { phrase, kind, pattern } of PHRASES) {
    const m = pattern.exec(text);
    if (m) hits.push({ phrase, kind, index: m.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}
