# Hearth & Oath — working notes for development

A single-player dark-fantasy life simulation in the browser. No framework, no
npm dependencies, no backend. The maintained source is `dist/js/` (ES modules);
`dist/` is also the playable site.

## Run and test

- `npm start` serves `dist/` on http://localhost:3000 (modules need HTTP).
- `npm run test:fast` runs the unit and engine files, a few minutes.
- `npm run test:slow` runs the long life-cohort and playthrough files.
- `npm test` runs everything serially (hours). `npm run release:check` is the
  formal gate (`docs/current-release-gate.md`).
- `node scripts/bench/engine-bench.mjs` times life generation, Age up and an
  action. Keep the numbers in the commit message when touching the engine.
- Tests that read `reference-art/` skip themselves when it is absent
  (`tests/helpers/reference-art.mjs`). That folder holds the original
  paintings and is not part of the source checkout.

## Architecture in one paragraph

`app.js` is the UI controller: module-level state, one delegated click handler,
and `render()` rebuilding the page from HTML strings. `engine.js` exposes pure
commands (`chooseAction`, `chooseEventOption`, `ageUp`, …) that copy the state,
mutate the copy, run `reconcile()` and return it. Subsystems get an
`engineContext` of callbacks instead of importing the engine, which keeps the
import graph acyclic (`scripts/build-offline.mjs` enforces this). Randomness is
`seededRoll(seed, salt, range)` from `world.js`: stateless, so determinism
depends on unique stable salts. Saves are a JSON envelope of three slots kept
in IndexedDB through the synchronous facade in `save-storage.js`
(localStorage is the fallback and the one-time migration source).

## Rules that still hold

- One simulation authority: UI read models never advance time, pay gold,
  create acquaintances or accept commitments.
- Record the actual deed, people, terms and dates at the moment of
  commitment. Never invent history for an existing save.
- Generated outcomes must stay deterministic for a seed. When optimizing,
  hash a few generated lives before and after (see the commit for
  `scripts/bench/engine-bench.mjs`).
- Player-facing text is in the game's voice, not an audit log. No
  "settled separately from the fee", no placeholder records.

## The new edition (v0.60+)

A life made by `createBirthGame` is a new-edition life: `householdBudget.debt`
is defined (v0.61) and `hero.station` is set (v0.62). Migrated saves have
neither and keep their old rules; heirs inherit the edition. Rules that
belong to the edition check one of those two markers rather than a version
number. `station.js` is what a birth decides; `fortune.js` is luck by season
(money shocks from 18, hard winters before); `personality.js` carries the
chosen nature and `hero.marks`, what life wrote on it. Choices that exist
only for some natures carry `nature: traitId` on the choice.

## Direction

The v0.59.0 analysis and the owner's design direction live in the Claude
project "Hearth and Oath". In short: birth decides a lot and most births are
hard; education is rare and earned; nature shapes choices and how people treat
you; every path (guild, war, faith, crime, curse) is built with the same
anatomy as the curses; dungeons and combat are deadly and tactical; the world
moves without the player and its stories reach them through their own people.
Edition policy: new systems apply to new lives; old saves keep loading on the
version that made them.
