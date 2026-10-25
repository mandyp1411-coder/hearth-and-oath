import { migrateSave } from '../../dist/js/engine.js';

/** An old capture read into the one rulebook, the way the main game's engine
 * reads any life (v0.72.2): nothing owed, luck by season from today, no
 * station invented and no date given after the fact. Feature tests play these
 * captures; tests of the archive's door keep an old life as it was stored,
 * because the main game never reads one into play. */
export function readIntoRulebook(raw) {
  const s = migrateSave(structuredClone(raw));
  if (!s) throw new Error('This capture does not load.');
  return s;
}
