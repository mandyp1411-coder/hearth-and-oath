# Focus 14 continuation: carried paper maps

Release **v0.29.0**, 15 October 2026. Resumed from v0.28.0, source
`a21cbcc043b5d274d74a0970b6bfbb56ddb8f54f`. Focus 15 remains unstarted.

## What changed

The old renderer painted the world as repeated terrain stamps inside a 165-hex
grid. It reduced saved coastlines, rivers and roads to grid fragments, placed
every drawing on a grid centre, omitted most labels, and made scattered locations
look unrelated to the countryside. The underlying atlas data was richer than the
image the player actually saw.

Explore now presents a carried paper atlas. Continuous saved coastlines, lakes,
woodland, mountain country, marshes and rivers replace painted tile backgrounds.
Twenty-five reusable pen-and-ink drawings distinguish towns, villages, harbours,
fortifications, towers, shrines, camps, ruins and mines, with varied trees, peaks,+hills and reeds. Small field drawings, coastal etching, paper grain, a compass,
title and travel scale complete the sheet. The muted yellow-gray palette remains;
no external image service, new bitmap artwork or audio is required.

Settlement drawings occupy their real saved map positions rather than a row of
grid centres. Their ink labels and drawings select the actual assigned travel
hex. Names wrap and seek clear spaces around the illustrations, using fine leader
lines when needed. Visible map names use consistent capitalization. Rivers and
roads follow their saved geography rather than straight lines between grid pins.
Known reported routes are dotted; closed roads remain visibly unavailable routes.

## One world, several sheets

Every world offers a Country Chart, Around Your Position, and three named regional
sheets. Worlds with multiple landmasses also have coastal sheets, giving five to
seven views of the same saved country. The selector changes the sheet without
spending time or moving the player. These are views of one world, not additional
worlds, destinations or travel modes. Find Me brings a distant regional sheet
back to the traveller; the known-place locator returns to the country sheet.

Travel Grid is off initially. Turning it on draws the underlying hex boundaries
over the paper. Movement still uses the same six neighbouring hexes, actual
terrain, Focus, interruptions and separate confirmation. Broad natural geography
is now public chart information. Unmet settlements, encounters, quest objectives
and discoveries are not exposed or accepted by opening the chart. Viewing a map
does not add a visit, survey, day, fee or discovery record.

The popup retains only the chosen map and close control inside its thin border.
Hold-to-drag, wheel zoom, keyboard camera controls, Escape and focus restoration
remain available. The camera cannot trigger travel during a drag. On a first
phone visit the local sheet provides a closer view; the player can choose the
country chart or retain a saved sheet and grid preference. Regular map controls
remain outside the popup. Local view changes retain the game content scroll.

## More coherent new countries

New geography uses map generation version 6. Six authored landform families cover
river basins, broken coasts, highlands, island chains, wooded basins and estuaries.
Seeded inlets, shoreline variation and orientation keep worlds distinct without
relying on a reused oval or uniform location scattering. Placement favours ports
near shores, mining sites in the highland area, woodland sites together, and
villages and cities in habitable heartlands, with real separation between sites.

New land roads seek passable ground around seas and lakes. Their recorded
waypoints and actual water crossings remain the travel graph. New hex road
corridors follow that same countryside. A new-world classification bug was also
corrected: a landmass's mountain or forest polygon can no longer overwrite open
sea, and inland lakes are actual water for hex travel. Open water still needs an
operating crossing. Sites receive dry travel cells.

Existing map generations 3, 4 and 5 remain supported and are not regenerated.
Their saved roads, site-to-hex assignments, terrain, discovery dates and pending
crossings retain their original mechanics. The new art draws their existing
geography; their older coarse travel approximations remain. An authentic synthetic
v0.28.0 save, generated using that published engine, verifies exact preservation
of every hex terrain value, road link, site key and unfinished crossing. New
generation version 6 is used prospectively when creating a country.

## Verification

The final sixteen-file release gate passed **228 checks, zero failures and zero
skipped**, in 106.3 seconds:

```sh
node --test --test-concurrency=3 --test-reporter=spec \
  tests/paper-atlas-v32.test.js tests/world-v9.test.js tests/world.test.js \
  tests/map.test.js tests/map-v9.test.js tests/world-expansion-v31.test.js \
  tests/appearance-compat.test.js tests/combat-focus.test.js \
  tests/creation-feedback.test.js tests/explore-trading.test.js \
  tests/interface-overhaul.test.js tests/map-camera.test.js tests/saves.test.js \
  tests/world-first-focus.test.js tests/new-life-v15.test.js \
  tests/offline-v16.test.js
```

Checks cover six landforms, deterministic generation,
connected routes, dry sites, lakes, open-water guards, road endpoints, vector
projection, SVG references and escaping, optional grid rendering, overlapping
label boxes, all sheet types, pure navigation, pointer and keyboard movement,
actual Focus travel, old saves and unfinished descents. Existing gameplay,
creation, combat, inventory, trading and supported starting ages are also included
in the release gate.

The rebuilt standalone v0.29.0 contains **82,307,393 bytes** in ten stored parts.
Their concatenation is exactly equal to the complete HTML, with SHA-256
`2f4d17d15a67dbe0f2125a9f16a906dea02ab51fdc5ca1f81f395787c99b2630`.
The actual embedded JavaScript passed an isolated VM run with network access
denied: title Continue, the paper atlas, optional grid, regional sheet switching
without state changes, the map-only popup and Escape, exact camp-pack purchase,
Activities and its memory board, and maze movement. The builder also validates
the module graph and parses translated JavaScript before embedding media.
`git diff --check` passed. Existing art/audio files and global palette variables
remain unchanged.

Twenty production SVG exports were checked as well-formed XML. Actual exports
from all six landform families and their regional sheets were
rendered with Inkscape for map-art inspection. This caught and corrected missing
SVG reference compatibility, label collisions and excessive terrain-mark density.
These are direct exports of the production renderer, not mockups or browser
screenshots. Browser layout, touch/device and screen-reader QA remain unavailable
because the required browser skill is not installed. Semantic DOM checks and SVG
inspection do not establish whole-page geometry or device acceptance.

The full historical suite is not claimed green. An exploratory map/menu run
encountered the already retired navigation, quest-tab and older dungeon assertions;
the two atlas-generation assertions were updated for generation 6 and real
variable-length road waypoints. Superseded menu/dungeon tests have not been
silently skipped or relabelled as passing. The complete audit's prior test limits
remain documented in the earlier focus records.
