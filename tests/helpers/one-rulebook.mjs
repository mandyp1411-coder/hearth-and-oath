import { migrateSave } from '../../dist/js/engine.js';
import { openLedger } from '../../dist/js/budget.js';
import { initializeFortune } from '../../dist/js/fortune.js';
import { initializeSchooling } from '../../dist/js/schooling.js';
import { initializeLivingWorld } from '../../dist/js/living-world.js';
import { initializeGuild } from '../../dist/js/guild.js';
import { initializeDelves } from '../../dist/js/delve.js';
import { initializeBattlecraft } from '../../dist/js/battlecraft.js';
import { initializeFaith } from '../../dist/js/faith.js';

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

/** The maze that still begins for every life is a contract's descent (and a regional
 * road's): from v0.72.3 the board's descent and the five campaign dungeons are delves.
 * Controlled setup, as maze-resource-rules does: an offered contract is accepted at
 * the current place. Returns the action id that descends into its maze. */
export function contractDescent(s) {
  const c = s.adventuring?.contracts?.find(c => c.status === 'offered') || s.adventuring?.contracts?.[0];
  if (!c) throw new Error('This life has no contract to pursue.');
  Object.assign(c, { status: 'active', acceptedDay: s.day, destinationId: s.locationId });
  return 'adventure_pursue_' + c.id;
}

/** The stated defaults the engine gives a life read into the one rulebook, applied to a copy a test
 * expects: the ledger and luck by season (v0.72.2), and the systems every life has (v0.72.3, step 72).
 * A test that checks migration changes nothing else applies these to its expected life. */
export function statedDefaults(s) {
  openLedger(s); initializeFortune(s);
  initializeSchooling(s); initializeLivingWorld(s); initializeGuild(s); initializeDelves(s); initializeBattlecraft(s); initializeFaith(s);
  return s;
}
