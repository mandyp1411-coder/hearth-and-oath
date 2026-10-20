// Split the test files into a fast lane (unit/engine, minutes) and a slow lane
// (life cohorts, full playthroughs, tens of minutes). Usage:
//   node scripts/test-lanes.mjs fast|slow|list
// The fast lane runs files concurrently; the slow lane runs them one at a time.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Files known to take more than ~60 s each (measured on Node 22).
export const SLOW = new Set([
  // Measured before the v0.60 speedups, so these are upper bounds.
  'campaign-roleplay.test.js', 'birth.test.js', 'campaign-home-loss-playthrough.test.js',
  'pastimes.test.js', 'birth-v9.test.js', 'careers.test.js', 'ironman-session.test.js',
  'new-life-v15.test.js', 'ironman-store.test.js', 'dynasty.test.js', 'rebuild-v4.test.js',
  'claims-tournament-integration.test.js', 'ironman-save-coordination.test.js',
  'household.test.js', 'audit-v21.test.js', 'ironman-app-extended.test.js',
  'ironman-app.test.js', 'lore.test.js',
  // Not yet timed but known long: full-life cohorts and integrations.
  'full-rpg-v14.test.js', 'lineage.test.js', 'rpg-v18.test.js', 'v9-integration.test.js',
  'world-focus.test.js', 'story-life-integration-v52.test.js', 'playtest-regressions.test.js',
  'health-focus.test.js', 'supernatural-focus.test.js', 'economy-focus.test.js',
  'family-depth.test.js', 'religion-v26.test.js', 'regional-world-v33.test.js',
  'world-expansion-v31.test.js', 'maze-integration-v50.test.js', 'expansion.test.js',
]);

// Known debt carried from v0.59.0: these fail there too. interface-overhaul
// test 14 exercises pre-edition-30 save compatibility the new edition does
// not promise; v9-integration test 1 uses a fixture life that cannot afford
// its own supper. Kept in the slow lane so they stay visible, not silenced.
export const KNOWN_DEBT = new Set(['interface-overhaul.test.js', 'v9-integration.test.js']);
for (const f of KNOWN_DEBT) SLOW.add(f);

const all = readdirSync('tests').filter(f => f.endsWith('.test.js')).sort();
const stress = ['tests/stress/childhood-lifetimes.test.js'];
const lane = process.argv[2] || 'list';
const fast = all.filter(f => !SLOW.has(f)).map(f => 'tests/' + f);
const slow = [...all.filter(f => SLOW.has(f)).map(f => 'tests/' + f), ...stress];
if (lane === 'list') { console.log(`fast: ${fast.length} files\nslow: ${slow.length} files`); process.exit(0); }
const files = lane === 'fast' ? fast : slow;
// Files are independent processes; run a few at once on the fast lane when
// there are cores to spare. On a two-core machine the long integration files
// starve each other, so stay serial there.
const cores = (await import('node:os')).cpus().length;
const concurrency = lane === 'fast' && cores >= 4 ? String(Math.min(4, cores - 1)) : '1';
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=' + concurrency, ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
