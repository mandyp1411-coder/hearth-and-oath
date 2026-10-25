// Which rulebook a life lives by, and the words the slot, the export and
// the import use for it.
//
// The codebase carries two games. A life made by `createBirthGame` since
// v0.61 carries `householdBudget.debt`, since v0.62 `hero.station`, and
// every rule of the new edition checks one of those two markers; a life
// from before, or migrated from before, has neither and keeps the rules it
// was written under. From v0.70 every save also says so in plain words
// (`state.edition`), so a slot, an exported file and an import review can
// tell the player which game the life belongs to — and so the old rules
// can one day leave `main` for the archive without a save being lost.
//
// `edition.began` is the version a life was begun in. Lives begun before
// v0.70 were not stamped at birth and cannot be dated after the fact
// (subsystems are added to an older edition life as it plays on), so they
// carry `began: null` and read "begun before v0.70". Never guess a date.

export const GAME_VERSION = '0.72.3';
/** The migration step this build brings a new-rules life to. Each later
 * release that changes what a new-rules save holds adds a step here. */
export const EDITION_STEP = 72;
export const OLD = 'old', NEW = 'new';

const plain = v => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The rules a life lives by, read from the markers the code itself checks. */
export function rulesOf(s) { return s?.hero?.station || s?.householdBudget?.debt !== undefined ? NEW : OLD; }
export const oldRules = s => rulesOf(s) === OLD;

/** "Old rules" · "New rules, begun in v0.70" · "New rules, begun before v0.70". */
export function rulesLabel(s) {
  if (rulesOf(s) === OLD) return 'Old rules';
  const began = s?.edition?.began;
  return began ? `New rules, begun in v${began.replace(/\.0$/, '')}` : 'New rules, begun before v0.70';
}

/** The sentence a slot or an import review adds under the label. */
export function rulesNote(s) {
  if (rulesOf(s) !== OLD) return null;
  return 'This life was written under the old rules, and the archive keeps them now. Export it and open it there. Its place here is kept until you do.';
}
/** What the door says to an old life arriving by file while this page refuses it. */
export const OLD_RULES_DOOR = 'This life lives by the old rules. It belongs in the archive; open it there. Nothing here was changed.';
/** The same door for a previous life kept as a slot's backup: the player has no file of it yet. */
export const OLD_RULES_BACKUP_DOOR = 'This life lives by the old rules. It cannot be brought back here; export it and open it in the archive. Nothing here was changed.';

/** Steps a new-rules save is brought through, in order. Each states the
 * default it gives a life that predates the system it concerns; none
 * invents history. */
const STEPS = [
  // 70: the stamp itself. Lives begun earlier keep `began: null`.
  { step: 70, apply() {} },
  // 71: farmer lives begin prospectively. Earlier saves receive no field,
  // people, ambition, or past harvests; their existing rules stay intact.
  { step: 71, apply() {} },
  // 72: every life has the whole world. A life that predates schooling, the
  // living world, the guild, the delve, battlecraft or the cloth begins each
  // when read (engine.js enableRoleplayUpdates): past six it reads, as every
  // life did before letters were earned, and the shrine keeper's place was
  // never offered; no guild family is decided after its birth; the world's
  // actors begin their goals this season; no past descent, fight or vow is
  // written. A maze or a battle already begun is finished as it was begun.
  { step: 72, apply() {} },
];

/** Stamp a save with its rules. Idempotent; never overwrites `began`. */
export function stampEdition(s, { born = false } = {}) {
  if (!plain(s)) return s;
  const rules = rulesOf(s);
  const prior = plain(s.edition) ? s.edition : null;
  const began = prior?.began ?? (born ? GAME_VERSION : null);
  s.edition = { rules, began, step: prior?.step ?? (rules === NEW && !born ? 69 : EDITION_STEP) };
  if (rules === NEW) for (const { step, apply } of STEPS) if (s.edition.step < step) { apply(s); s.edition.step = step; }
  return s;
}

export function validateEdition(v) {
  if (v === undefined) return true;
  if (!plain(v) || ![OLD, NEW].includes(v.rules)) return false;
  if (!(v.began === null || typeof v.began === 'string' && /^0\.\d{2}(\.\d+)?$/.test(v.began))) return false;
  return Number.isInteger(v.step) && v.step >= 69 && v.step <= EDITION_STEP;
}

/** The exported file's name says which rules the life lives by. */
export function exportFileName(s, { archive = false } = {}) {
  const who = String(s?.hero?.name || 'life').replace(/[^a-zA-Z0-9_-]/g, '-');
  return `hearth-and-oath-${who}-${rulesOf(s) === OLD ? 'old-rules' : 'new-rules'}${archive ? '-archive' : ''}.json`;
}

/** The archive takes only lives that live by the old rules. */
export function archiveAccepts(s) { return rulesOf(s) === OLD; }
export const ARCHIVE_REFUSAL = 'This life lives by the new rules. It belongs in the main game; open it there.';
