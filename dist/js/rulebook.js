// Which lives the main game lets into play, and how it reads a stored one.
//
// One rulebook (v0.72). A stored life is told by its own stored markers, a
// rolled station or a debt ledger (edition.js `rulesOf`, the markers the
// rules were written against; never a claimed stamp alone). A life written
// under the old rules is never read here: the store keeps it exactly as it was
// written (saves.js `kept`), and it leaves whole for the Old Rules archive
// (archive-link.js), the v0.69 game at its own address with its own storage.
//
// Keep the store's decoder this one. The engine's `migrateSave` reads any
// life it can into the one rulebook (a life from before the ledger is read
// with the stated defaults); it is this door, not the engine, that sends an
// old life to the archive.
import { rulesOf, NEW } from './edition.js';

/** The store's decoder: a stored life is decoded only when it lives by the new rules. */
export function storedLifeDecoder(decode) {
  return value => rulesOf(value) === NEW ? decode(value) : null;
}

/** The entry policy for life-entry.js, the save store and the Ironman session:
 * a life enters play only when it carries a station or a debt ledger. */
export function admissionPolicy() {
  return state => rulesOf(state) === NEW;
}
