// The voice check: player-facing text is in the game's voice, not an audit
// log, and never a placeholder. This is the one function the validator calls
// on every text field. The rules themselves live in scripts/lib/voice-rules.mjs,
// shared with scripts/voice-lint.mjs, so the content tree and the source are
// read by the same list; `kind` maps the lint's severities onto the
// validator's two classes: 'placeholder' (an error: text that was never
// written or a value that leaked) and 'voice' (a warning: the ledger's words).
import { lintText } from '../lib/voice-rules.mjs';

/**
 * Every phrase in `text` the house does not say. Returns `[{ phrase, kind, index }]`,
 * one row per rule (the first place it matches), or an empty array for clean text.
 * Non-strings are not text and return no hits.
 */
export function voiceCheck(text) {
  if (typeof text !== 'string' || !text) return [];
  return lintText(text)
    .map(h => ({ phrase: h.match, rule: h.id, kind: h.severity === 'placeholder' ? 'placeholder' : 'voice', index: h.index }))
    .sort((a, b) => a.index - b.index);
}
