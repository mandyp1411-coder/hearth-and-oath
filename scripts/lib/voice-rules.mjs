// The voice rules: phrases the game must not say to the player. The Design
// Bible keeps one voice — a terse, grim chronicle — and the October interface
// evaluation found the ledger's language on the most-used screens:
// "Household estimate: +0 Gold accrues over this time; settled separately from
// the fee", "Offers: 1–4 of 4 saved", "Active quests and commitments: 0
// recorded. All category.", every scene choice captioned "Choose this action."
// Each rule is one phrase, precise rather than broad, so a hit is worth
// reading. The engine's own reason lines ("Requires 12 gold", "Two days · a
// favour owed") are not hits and must stay that way.
//
// Two severities: 'audit' is the ledger speaking where the chronicle should;
// 'placeholder' is text that was never finished or a value that leaked.
//
// `lintText(text)` runs every rule over one piece of player text and returns
// the hits. scripts/voice-lint.mjs runs it over every string literal in
// dist/js; the content validator and the engine's epitaph check may import it.
// Text that comes from a template literal carries PLACEHOLDER where an
// expression was, so a rule that wants a number accepts either.

export const PLACEHOLDER = '{…}';
const NUM = '(?:\\d+|\\{…\\})';

const rule = (id, severity, pattern, reason) => Object.freeze({ id, severity, pattern, reason });

export const VOICE_RULES = Object.freeze([
  // The ledger's words.
  rule('recorded', 'audit', /\b(?:un)?recorded\b/i, 'The game says what happened; a ledger says it was recorded.'),
  rule('record-not-kept', 'audit', /\b(?:records?|dates?|accounts?|entry|entries)\s+(?:was|were)\s+not\s+kept\b/i, 'A missing record is the save file apologising; the chronicle simply does not mention what it does not know.'),
  rule('category', 'audit', /\bcategor(?:y|ies)\b/i, 'Categories belong to a filing cabinet, not to a life.'),
  rule('settled-separately', 'audit', /\bsettled separately\b/i, 'The Bible’s own example of the audit log: money is paid, not settled separately.'),
  rule('accrues', 'audit', /\baccru(?:es?|ed|ing|al)\b/i, 'Interest accrues on a balance sheet; in the game the lender is owed more.'),
  rule('not-a-promise-of', 'audit', /\bnot a promise of\b/i, 'A disclaimer about what a number means; the game shows the number or does not.'),
  rule('choose-this-action', 'audit', /\bChoose this action\b/, 'The default caption on every scene choice; a choice needs its own words or none.'),
  rule('estimate', 'audit', /\bestimate:/i, 'A labelled estimate is a form field; the game says what it will cost.'),
  rule('prediction', 'audit', /\b(?:current )?predictions?\b/i, 'Enemy intentions are read from their stance, not reported as predictions.'),
  rule('offers-count', 'audit', new RegExp(`\\bOffers:\\s*${NUM}`), 'A pager’s header; the market has stalls, not a count of offers.'),
  rule('range-of-total', 'audit', new RegExp(`${NUM}\\s*[–-]\\s*${NUM}\\s+of\\s+${NUM}(?!\\w)`), 'Pager text ("1–4 of 4"); the game does not paginate its world.'),
  rule('saved-trailer', 'audit', /\bsaved\.$/, 'A toast that confirms a write; the game says what is now true.'),
  rule('browser-save-status', 'audit', /\bBrowser save status\b/i, 'The browser is not part of the world.'),
  rule('is-unchanged', 'audit', /\bis unchanged\./i, 'A diff report; if nothing happened, say nothing or say what stayed.'),
  rule('retained-archives', 'audit', /\bRetained archives\b/i, 'Save-system vocabulary shown to the player.'),
  rule('reattached', 'audit', /\breattach(?:ed|ment|ing|es)?\b/i, 'Save-system vocabulary shown to the player.'),
  rule('dependent-choices', 'audit', /\bdependent choices?\b/i, 'A form’s wiring, not a person’s.'),
  rule('compatible', 'audit', /\b(?:in)?compatible\b/i, 'Software compatibility; the game has no software.'),
  rule('unlocked', 'audit', /\bUnlocked:/, 'An achievements screen; the game’s doors open, they are not unlocked with a colon.'),
  rule('assigned-point', 'audit', /\bassigned points?\b/i, 'Character sheets have points to assign; a life has years.'),
  rule('metadata', 'audit', /\bmetadata\b/i, 'Data about data has no place in a chronicle.'),
  rule('schema', 'audit', /\bschemas?\b/i, 'The save format’s word.'),
  // Text that was never finished, or a value that leaked.
  rule('placeholder', 'placeholder', /\bplaceholder\b/i, 'The word itself, left where a line should be.'),
  rule('todo', 'placeholder', /\bTODO\b/, 'A note to the author, shown to the reader.'),
  rule('lorem', 'placeholder', /\blorem\b/i, 'Filler text.'),
  rule('undefined', 'placeholder', /\bundefined\b/, 'A missing value printed as a word.'),
  rule('null', 'placeholder', /\bnull\b/, 'A missing value printed as a word.'),
  rule('nan', 'placeholder', /\bNaN\b/, 'A number that failed to be one.'),
  rule('object-object', 'placeholder', /\[object Object\]/, 'An object printed instead of its text.'),
  rule('template-leak', 'placeholder', /\$\{/, 'A template placeholder inside a plain string: the expression was never evaluated.'),
]);

export const RULE_IDS = Object.freeze(VOICE_RULES.map(r => r.id));

/** Every rule that matches `text`, once each: { id, severity, reason, match, index }. */
export function lintText(text) {
  if (typeof text !== 'string' || !text) return [];
  const hits = [];
  for (const r of VOICE_RULES) {
    const m = r.pattern.exec(text);
    if (m) hits.push({ id: r.id, severity: r.severity, reason: r.reason, match: m[0], index: m.index });
  }
  return hits;
}

/** True when the text says nothing the rules forbid. */
export const inVoice = text => lintText(text).length === 0;
