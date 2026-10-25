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

/** Whether a capture was saved in the middle of a walk in one of the older expedition engines that left
 * in v0.72.4 (the room engine, the descent's rooms, the v0.27 regional rooms), or in one of their scenes
 * or fights. Only old-rules captures can be. */
export function heldOlderWalk(s) {
  const c = s?.battle?.context;
  return Boolean(s?.dungeon || s?.adventuring?.expedition || s?.rpg?.expedition
    || s?.event?.id === 'adventure_room' || String(s?.event?.id || '').startsWith('dungeon_')
    || c && (c.kind === 'dungeon' || c.kind === 'adventure' && ['descent', 'contract'].includes(c.mode) || c.kind === 'rpg' && !c.pursuitId));
}

/** What reading such a capture leaves (engine.js `closeOlderWalks`): the walk ends where it stands, its
 * rooms stay recorded, and its scene and fight end with it. */
export function assertOlderWalkClosed(assert, original, read) {
  assert.equal(read.dungeon, null);
  assert.ok(!read.adventuring?.expedition);
  assert.ok(!read.rpg?.expedition);
  if (original.dungeon) assert.deepEqual(read.flags.dungeonRecords[original.dungeon.id].visited, original.dungeon.visited, 'the rooms walked stay recorded');
  if (original.adventuring?.expedition) assert.ok(read.adventuring.history.some(row => row.id === original.adventuring.expedition.id), 'the descent stays recorded');
  if (original.rpg?.expedition) assert.ok(read.rpg.expeditions.some(row => row.id === original.rpg.expedition.id), 'the regional descent stays recorded');
  if (heldOlderWalk({ event: original.event })) assert.equal(read.event, null);
  if (heldOlderWalk({ battle: original.battle })) assert.equal(read.battle, null);
}
