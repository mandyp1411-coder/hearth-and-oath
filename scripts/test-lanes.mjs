// Split the test files into a fast lane (unit/engine, minutes) and a slow lane
// (life cohorts, full playthroughs, tens of minutes). Usage:
//   node scripts/test-lanes.mjs fast|slow|list
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Files known to take more than ~60 s each (measured on Node 22).
export const SLOW = new Set([
  'birth.test.js', 'birth-v9.test.js', 'campaign-roleplay.test.js',
  'campaign-home-loss-playthrough.test.js', 'careers.test.js',
  'claims-tournament-integration.test.js', 'audit-v21.test.js',
  'full-rpg-v14.test.js', 'lineage.test.js', 'dynasty.test.js',
  'rpg-v18.test.js', 'v9-integration.test.js', 'world-focus.test.js',
  'story-life-integration-v52.test.js', 'playtest-regressions.test.js',
  'health-focus.test.js', 'people-focus.test.js', 'expansion.test.js',
  'supernatural-focus.test.js', 'growth-focus.test.js', 'economy-focus.test.js',
  'family-depth.test.js', 'religion-v26.test.js', 'regional-world-v33.test.js',
  'world-expansion-v31.test.js', 'maze-integration-v50.test.js',
]);

const all = readdirSync('tests').filter(f => f.endsWith('.test.js')).sort();
const stress = ['tests/stress/childhood-lifetimes.test.js'];
const lane = process.argv[2] || 'list';
const fast = all.filter(f => !SLOW.has(f)).map(f => 'tests/' + f);
const slow = [...all.filter(f => SLOW.has(f)).map(f => 'tests/' + f), ...stress];
if (lane === 'list') { console.log(`fast: ${fast.length} files\nslow: ${slow.length} files`); process.exit(0); }
const files = lane === 'fast' ? fast : slow;
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
