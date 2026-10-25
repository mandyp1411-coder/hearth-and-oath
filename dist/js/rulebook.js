// Which rulebook the main game lets into play.
//
// The new rules only, from v0.72. A life is new rules when it carries a
// rolled station or a debt ledger (edition.js `rulesOf`, the markers the
// rules themselves check; never a claimed stamp alone), which includes the
// v0.61 lives that have a ledger and no station. A life written under the old
// rules is kept in its slot, exported whole and sent to the Old Rules archive
// (archive-link.js); it never opens here. The archive is the v0.69 game at its
// own address with its own storage, and it admits only old-rules lives.
import { rulesOf, NEW } from './edition.js';

export const BOTH = 'both';
export const NEW_ONLY = 'new';
export const MAIN_ADMITS = NEW_ONLY;

/** The test harness's route to the pre-v0.72 policy, for UI tests whose
 * scenarios still play on old-rules saves while the code they cover remains
 * in main (v0.72.1 onward rebases them or moves them to the archive). Only the
 * module itself imported as `…/app.js?rulebooks=both` qualifies
 * (tests/helpers/ui-surface.mjs). A page cannot reach it: the game's script
 * tag imports app.js without a query, and the offline file's inlined module
 * carries the page's own URL, which is not app.js. */
export function harnessRulebooks(moduleUrl) {
  try {
    const url = new URL(moduleUrl);
    return /\/js\/app\.js$/.test(url.pathname) && url.searchParams.get('rulebooks') === BOTH ? BOTH : MAIN_ADMITS;
  } catch { return MAIN_ADMITS; }
}

/** How the save store reads a stored life. Under the new rules only, an old
 * life is told by its own stored markers and never decoded: the store keeps it
 * exactly as it was written (saves.js `kept`), so nothing of the old rules'
 * code runs on it here and it leaves for the archive byte for byte. `BOTH`
 * decodes every life, as before v0.72. */
export function storedLifeDecoder(admits = MAIN_ADMITS, decode = value => value) {
  return admits === NEW_ONLY ? value => rulesOf(value) === NEW ? decode(value) : null : decode;
}

/** The entry policy for life-entry.js, the save store and the Ironman session:
 * under the new rules only, a life must carry a station or a debt ledger;
 * `BOTH` (the policy before v0.72) admits every decoded life. */
export function admissionPolicy(admits = MAIN_ADMITS) {
  return admits === NEW_ONLY ? state => rulesOf(state) === NEW : undefined;
}
