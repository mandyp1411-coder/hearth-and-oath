// Which rulebook the main game lets into play.
//
// Both, for now. Volume II's v0.72 takes the old rules out of `main` only
// after the Old Rules archive has held for a release and the farmer's
// playtest has passed (docs/one-rulebook-v072.md). Until then every life
// plays here, and an old-rules slot only points the way to the archive.
//
// The cutover can be rehearsed before it is taken: a page that sets
// `globalThis.__hearthRehearseCutover = true` before the game loads refuses
// old-rules lives exactly as the cutover will, so the door an old life meets
// can be seen and tested now. The switch can only refuse; nothing can make
// this module admit more than MAIN_ADMITS.
import { rulesOf, NEW } from './edition.js';

export const BOTH = 'both';
export const NEW_ONLY = 'new';
export const MAIN_ADMITS = BOTH;

/** The rulebooks this page admits: MAIN_ADMITS, or the new rules only while a cutover is rehearsed. */
export function admittedRulebooks(scope = globalThis) {
  let rehearsing = false;
  try { rehearsing = scope?.__hearthRehearseCutover === true; } catch { rehearsing = false; }
  return rehearsing ? NEW_ONLY : MAIN_ADMITS;
}

/** The entry policy for life-entry.js, the save store and the Ironman session:
 * undefined admits every decoded life; under the new rules only, a life must
 * carry a station or a debt ledger (the markers the rules check, never a
 * claimed stamp alone). */
export function admissionPolicy(admits = admittedRulebooks()) {
  return admits === NEW_ONLY ? state => rulesOf(state) === NEW : undefined;
}
