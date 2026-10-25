#!/usr/bin/env node
// Begun authored mazes, written by the last release that still began them (v0.72.2).
// From v0.72.3 a campaign dungeon begins as a delve for every life; an authored maze runs only
// where a life had already begun one. Tests of that maze stand in these genuine captures.
//
// Usage: node scripts/fixtures/generate-begun-mazes.mjs <worktree at the release's merge commit> [out]
// The capture is the v0.27 road-and-descent life read by that release's own engine, with the same
// controlled setup the maze tests used before (the site, a cleared map, twenty of each material).
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] || '');
const out = process.argv[3] || new URL('../../tests/fixtures/maze-identity/v0722-begun-authored.json.gz', import.meta.url);
const E = await import(pathToFileURL(root + '/dist/js/engine.js'));
const { syncCartography } = await import(pathToFileURL(root + '/dist/js/cartography.js'));
const { GAME_VERSION } = await import(pathToFileURL(root + '/dist/js/edition.js'));
const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const source = JSON.parse(gunzipSync(readFileSync(new URL('../../tests/fixtures/v27-road-and-descent.json.gz', import.meta.url)))).descent;

function begun(dungeon, locationId) {
  let s = E.migrateSave(structuredClone(source));
  s = E.chooseEventOption(s, 'withdraw');
  s.locationId = locationId; s.cartography.pending = null; s.cartography.offsite = false; s.cartography.interior = null; syncCartography(s);
  for (const k of Object.keys(s.equipment.materials)) s.equipment.materials[k] = 20;
  s = E.chooseAction(s, 'explore_enter_' + dungeon);
  if (s.maze?.kind !== 'authored' || s.maze.sourceId !== dungeon || !E.validateSave(s)) throw new Error(`${dungeon}: no authored maze began (${s.notice})`);
  return s;
}

const fixture = {
  source: { version: GAME_VERSION, commit, from: 'tests/fixtures/v27-road-and-descent.json.gz (descent)', generator: 'scripts/fixtures/generate-begun-mazes.mjs' },
  states: { cistern: begun('cistern', 'marsh'), watchtower: begun('watchtower', 'tower') },
};
writeFileSync(out, gzipSync(JSON.stringify(fixture)));
console.log(`Begun mazes written by ${GAME_VERSION} at ${commit}: cistern, watchtower.`);
