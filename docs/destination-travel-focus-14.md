# Focus 14 continuation: destinations and simple journeys

Release **v0.31.0**. Continued from published v0.30.0, source
`666809ccfef664f136471a783282e34d2c011faa`. Focus 15 remains unstarted.

## Executable brief

Rebuild Explore around where the player is, where they want to go, and the
journey between those places. Use one continuous muted paper map, named
locations, an explicit departure and a compact travelling state. Remove the
representation switches, visible hex stepping and competing information panels.
Keep local life inside actual locations. Preserve existing geography, discovered
names, partial travel, paid terms, Focus, finite camp packs and calendar needs.
Finish and test the new flow, rebuild the standalone game, and publish.

The useful inspiration is a travelling character moving between places in a
living world. [Paradox's official Roads to Power description](https://www.paradoxinteractive.com/games/crusader-kings-iii/add-ons/crusader-kings-iii-roads-to-power)
describes a landless adventurer roaming the map and taking local work. The
adaptation here is our design inference: a destination and a journey should be
the primary units of interaction. This is not a reproduction of CK3's interface
or a claim to implement its strategy, camp-building or army systems.

## What was wrong

These findings come from source inspection and controlled command/UI fixtures,
not new human playtests.

- The main screen mixed named-road journeys with individual terrain crossings,
  two route planners, multiple Focus summaries, chart sheets, regional politics,
  a locator and a separate point inspector. A clear next action had to compete
  with all of them.
- A valid character in open country could not call the named-road travel
  command. That command required a named location, while reaching one depended
  on terrain-step controls. The new fixture reproduces this on actual published
  v0.30.0 code: the save is valid, `offsite` is true and named-road travel refuses
  to proceed.
- The earlier destination quote did not include all of the engine's travel
  barriers. A visible offer could therefore fail when acted on.
- A local chart could hide destinations elsewhere in the larger world. Picking
  a sheet was a camera choice presented as another travel decision.
- Small print, terrain dots and grid-based boundary fragments retained the feel
  of a board even when the grid itself was switched off.

## Delivered flow

| Situation | Explore shows | Actual command |
| --- | --- | --- |
| At a named place | Its illustration, name, region, concise context and Explore This Place | Opens the existing local areas and present NPCs |
| Inspecting another known place | Route line, estimated days without rest, road danger, Set Out and a concrete blocking reason when needed | Begins the actual road journey, or a terrain route from an offsite position |
| Travelling | Destination, progress, elapsed/remaining time, Focus, Continue Journey, Camp and a stopping control | Continues recorded movement and recovery through the existing resolvers |
| At a real road waypoint | Stay at This Waypoint | Ends the remaining journey at the actual reached place, retaining spent days and payment |
| On a country trail | Stop Here | Clears the remaining plan while retaining actual position and discoveries |
| In an older unfinished crossing | Finish This Stretch and Turn Back | Continues or cancels the exact saved crossing without rewriting attended days |

A single destination dropdown supplements named map pins. Inspecting a place,
clicking its printed name, using Enter/Space, panning, zooming and opening the
popup spend no game time and reveal no unknown place names. A double click also
only selects a destination; departure has one explicit Set Out command.

The map has four small controls: zoom out, zoom in, find the player, expand.
There are no chart sheets, grid toggle, terrain inspection, separate route
planning panels or six-direction controls in Explore. The popup has only its
map and close control inside a thin border. It preserves hold-drag panning,
wheel/keyboard zoom, focus containment, Escape and focus return. The camera uses
the full saved world regardless of an older saved chart-sheet preference.

At smaller widths the selected destination and departure controls precede the
map. The map remains pannable, with a shared minimum drawing size and enlarged
labels. Label placement reserves the actual enlarged text bounds, including on
a fully known 80-location atlas. Illustrations remain desaturated and the global
muted yellow-gray, bone, charcoal and brass variables are unchanged.

Regional borders now follow the exact nearest-anchor territorial partition as
continuous projected lines, clipped to the real land and lakes. They no longer
use movement-cell edge fragments in this map. Government and faith details are
under About This Place, with the larger learned accounts still in Journal
Notes. Courts, doctors, merchants and employers remain local people.

A moving token follows the saved road's real waypoints and actual attended leg
progress. Terrain routes use the existing saved coordinates. Drawing an
intermediate position grants no arrival, visit or new knowledge. Arrival teaches
new neighbouring road destinations from actual local signs, as rumors; merely
rendering or migrating a save does not create those observations.

## Movement and save guarantees

`exploreTravelPreview` and `startExploreJourney` share destination/age/commitment
rules. Child, custody, descent, waiting decision, project, employment and saved
annual-plan barriers are explicit. A paused automatic year target is not an
additional travel prohibition. Unknown destinations and disconnected roads are
rejected without spending resources.

Named-road journeys retain their encounter, attendance, payment and saved leg
logic. Offsite characters choose a named destination and follow a passable saved
terrain route. The old movement lattice remains an internal compatibility
mechanism, with no grid controls or per-cell choices in the new Explore UI.
There is no teleport to the last settlement. An idle offsite character can camp
before departing, or Look Around for one observed day to chart nearby places
without moving or inventing visits. Saved crossings are finished or
turned back before changing destination.

Continue attends a short stretch, with up to three iterations/three calendar
days for modern travel. It stops sooner for low Focus, an actual waypoint, an
encounter, a birthday/need or a completed journey. Previously paid journeys
retain their original continuation pace and terms. Camping consumes one real day
and one available sheltered night, applies existing Health/Focus/Stress recovery,
and preserves a partially attended step's original quote. Exhaustion and death
risks remain actual simulation consequences.

The committed `v30-explore-travel.json.gz` fixture was generated with the
unchanged published v0.30.0 modules and records its source SHA. It includes a
named-place life, a stranded offsite life, a planned country route and an active
road journey. Existing genuine v0.29.0/v0.28.0 slow crossings and the v0.27.0
paid-road/descent fixtures remain in the compatibility gate. No world, political
identity, paid fee, completed day or dungeon is regenerated during migration.

## Verification

The new destination suite checks real production handlers, road and offsite
arrival, genuine saved routes/crossings, camping, stopping, hidden names,
children and commitments, disconnected roads, map-only focus and Escape, drag
suppression, free inspection, a real travelling token, enlarged label bounds,
continuous territorial geometry, small-screen command availability, and exact
migration. These are controlled integration fixtures, not additional audited
lives or claims of balance or rendered-device acceptance.

The twenty-file regression gate passed **307 checks**, with zero failures,
cancellations or skips. After the final idle-camping review, the complete
**27-case Explore suite** passed, including its two added recovery/discovery
cases. Together these cover 309 distinct checks; the overlapping Explore cases
are not counted twice. Five direct production map exports also passed XML
parsing, reference-resolution and no-mutation checks.

Release commands:

```sh
node --test --test-concurrency=3 --test-reporter=spec \
  tests/destination-travel-v34.test.js tests/paper-atlas-v32.test.js \
  tests/regional-world-v33.test.js tests/world-v9.test.js tests/world.test.js \
  tests/map.test.js tests/map-v9.test.js tests/world-expansion-v31.test.js \
  tests/appearance-compat.test.js tests/combat-focus.test.js \
  tests/creation-feedback.test.js tests/explore-trading.test.js \
  tests/interface-overhaul.test.js tests/map-camera.test.js tests/saves.test.js \
  tests/world-first-focus.test.js tests/new-life-v15.test.js \
  tests/offline-v16.test.js tests/travel.test.js tests/reliability.test.js
node --test --test-reporter=spec tests/destination-travel-v34.test.js
npm run build
node scripts/verify-offline-explore-v34.mjs
```

The offline verification boots the **actual embedded standalone script**, with
network disabled, and exercises the new travel UI, old offsite-save arrival,
camping, local trading, the regional court, Activities and maze movement. Every
stored download part is concatenated and compared byte for byte with the full
standalone. [The machine-readable receipt](verification-v0.31.0.json) records its
version, byte count, part count and SHA-256. Shared paper texture data is embedded
once for both map renderers.

An exploratory broader run included the historical `health-focus.test.js` suite.
Its 28 failing health-test names were reproduced exactly against the unchanged
published v0.30.0 modules. Those assertions include the removed dedicated Health tab and retired guided recovery
planning. A separate old paid-road fixture also failed on that unchanged release
because the expanded regional map raised its preparation quote above its fixed
50-Gold budget. That unit fixture now explicitly uses the pre-regional world it
models; full modern worlds and genuine old paid journeys have separate coverage.
The obsolete health assertions are not counted as passing or silently skipped.
The final gate
above uses current doctor, recovery-item and genuine old-commitment coverage
alongside the changed travel systems. The entire historical suite is not claimed
green.

Browser layout, touch/device and screen-reader QA are unavailable because the
required browser skill is not installed. Semantic DOM, actual standalone VM,
SVG/XML, geometry and command checks do not measure full-page browser layout.
