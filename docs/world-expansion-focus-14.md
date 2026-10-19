# Focus 14 continuation: travel, everyday freedom and the room maze

Release: **v0.28.0**, 15 October 2026. Resumed from published v0.27.0, source
`129cb3f000273748ba1f3821daf6b66c21279ae5`. Focus 15 remains unstarted.

## Implemented brief

Use the world as the place where things happen. Replace paid road-preparation
controls with the existing Focus resource, offer concise Activities categories
without moving people out of their locations, and make towns worth visiting for
their residents and traditions. Replace new dungeon entries with an actual large
maze, preserving the quests, combat, loot and unfinished older saves. Keep the
muted yellow-gray palette, grayscale illustration treatment and map-only popup.

## Travel and camping

New journeys have no road-preparation form or departure charge. Road and hex
movement consume existing Focus, not another energy meter. Each normal travel
day drains 12% of maximum Focus rounded up, with a minimum of two. Below 25%
Focus a normal distance day takes two actual days; at zero it takes three. The
forecast includes this depletion, and the traveller can pause after a distance
step rather than committing the entire route at once.

Tired travel adds ten points to road danger; exhausted travel adds twenty.
At zero Focus, an exhausted day can also cause a stumble costing three to seven
Health. Continuing at zero Focus from the third unrested travel day carries a
one-percent daily fatal exhaustion chance, rising to a four-percent cap. These
rolls use saved travel counters; opening a screen cannot reroll them. Wear and
possible death occur after each actual day, including partially attended slow
steps. Birthdays interrupt movement without discarding the remaining step.

Camping spends one actual day. A pack restores 55% of maximum Focus rounded up,
eight Health and ten Stress; resting without one restores 20% Focus, two Health
and three Stress. Recovery is capped by the character's limits. A completed rest
resets consecutive unrested travel days. Town rest, inns and appropriate recovery
also restore Focus. Camps cannot bypass a pending decision, enemy, custody or an
ongoing commitment. Underground camps require a safe or suitable cleared room.

| Camp pack | Sheltered nights | Purchase price |
| --- | ---: | ---: |
| Traveller's Bedroll | 2 | 12 Gold |
| Trail Tent | 5 | 28 Gold |
| Expedition Camp | 10 | 50 Gold |

Packs are actual merchant goods. The existing two-inventory trade quote charges
once and adds a uniquely identified pack. Inventory shows remaining nights; each
sheltered camp consumes one. No extra camping checklist or preparation currency
is introduced. Spells and travel share the same visible Focus resource.

## Activities and settlements

Activities now has six compact categories: Everyday, Work & School, Recovery,
Training, Social & Fun, and Crime & Mischief. Rows lead with the action and its
real time or price; optional detail opens on demand. Existing commitments have
concise continue and end controls. Work, teaching, mentors and treatment shortcuts
walk the connected local area graph to their actual person. Recovery is a quick
route to the doctor or inn, alongside ordinary rest and camping when available.

Homes presents compact property listings using the existing real purchase,
ownership and upkeep systems. Purchases require visiting Homes and enough Gold;
the resulting property records its settlement. The activity and location panes
retain their scroll after actions. The map-only popup retains its narrow border,
hold-to-drag panning and independent dismissal.

Each settlement records a primary tradition from the six existing faiths. Public
shrines follow that actual local faith; joining, rituals and local customs are
offered there, rather than offering every religion from one keeper. Some towns
have no public shrine and show a Doctor's House instead. All six traditions have
a reachable shrine. Already accepted older petitions retain their named source
and can still be reported. These are distinct existing faiths, not six new fully
authored religions.

## Residents, relationships and names

Each settlement gains ten ordinary seeded residents with an occupation, personal
detail, portrait and actual area. Residents need not offer a service. A resident
enters Relationships only after being met; saved encounters keep their identity,
and people who have left do not silently become a different person under one ID.
Some adult residents can offer a small optional supply favour after meeting.
Acceptance adds a real Journal quest; delivery consumes two actual supplies and
pays twelve Gold once.

Adult ordinary residents and other eligible non-family world contacts can be
courted through local encounters. Orientation and the player's stated romantic
interests are independent of pronouns and ancestry. Both people must be adults,
interested, present, sufficiently close, and free of another current courtship;
individual boundaries can still prevent a relationship. Existing imported couples
remain compatible. New courtships use the canonical relationship and lineage
systems and retain the actual person's identity and memories. This is expanded
adult courtship, not a simulation of every person's off-screen love life.

Social & Fun includes local company, harmless pranks, existing pastimes, a real
twelve-tile Runestone Pairs game and a high/low dice wager. Boards and progress
save correctly. Time and daily limits prevent free repeat rewards; dice stakes
use actual Gold. The player's gender and romantic interests can be recorded in
the same category without changing anyone else's interests.

The new naming catalog covers all eight ancestries and 27 heritage IDs with
1,260 authored complete given names and 420 family names. Names are selected as
whole cultural forms; they are not random syllable mashups. Explicit personal
family names and all existing saved character names are retained.

## Replacement dungeon

All new authored, contract, regional and uncharted descents use the same seeded
11-by-11 maze: **121 actual rooms**, connected orthogonally by reciprocal doors,
with some loops. The map and directional controls move one real room per step;
keyboard arrows work while the maze grid is focused. Fog hides unknown content.
Rooms can be empty, hold finite loot, an enemy, a hazard, a safe camp or an
inscription for Notes. Room descriptions combine seeded architectural detail
with their actual contents. Existing grayscale art frames the room panel.

Moving costs one Focus. Six normal moves spend one actual day; at zero Focus,
three moves spend one day. Forward movement through an unresolved enemy or hazard
is blocked, while the arrival doorway permits retreat. Enemies use the existing
party combat system. Ordinary encounters can be avoided with sufficient Stealth;
non-contract guardians can accept paid negotiated passage. Contract targets
require actual battle proof. The goal has one entrance through its guardian.

Authored discoveries advance the actual campaign after leaving. Contracts retain
their target and record the guardian battle as proof, then require returning to
the real client for payment. Regional discoveries leave one usable shared route
or workshop service. Claimed caches and completed objectives cannot pay twice.
An unfinished non-radiant descent can resume at its entrance with findings intact;
fresh radiant descents receive a new run seed. Exit stairs exist at the entrance
and completed objective, rather than allowing arbitrary surface actions from any
underground room. Inventory supplies remain usable while exploring.

Older unfinished descents keep their existing engines, room states and decisions.
Older paid road journeys keep their original quotes and resolvers. Migration is
additive and does not charge for an old journey again or rewrite its waiting
encounter. The regression fixture includes synthetic saves generated using the
actual previous published engine, not newly constructed approximations.

## Verification and limits

The final acceptance command passed **179 checks, zero failures, zero skipped**
in 110.2 seconds:

```sh
node --test --test-concurrency=3 --test-reporter=spec \
  tests/world-expansion-v31.test.js tests/appearance-compat.test.js \
  tests/combat-focus.test.js tests/creation-feedback.test.js \
  tests/explore-trading.test.js tests/interface-overhaul.test.js \
  tests/map-camera.test.js tests/saves.test.js \
  tests/world-first-focus.test.js tests/new-life-v15.test.js \
  tests/offline-v16.test.js
```

Coverage includes real engine actions and semantic DOM handlers, actual
combat and proof payment, all four maze entry families, connected maze topology,
finite loot, partial travel at birthdays, camping supplies, local doctors and
faiths, property purchases, orientation guards, minigames, saves, map controls,
creation and all supported starting-age cases. Name checks exercise all heritage
IDs with deterministic used-name avoidance.

The offline build validates the imported module graph and parses its translated
JavaScript before embedding media. The rebuilt v0.28.0 standalone contains
**82,266,209 bytes** across ten stored parts. Concatenating those parts is exactly
equal to the complete HTML, SHA-256
`5b372dcdc961358fe3c3769a2a9c60e967845d424953414dc04c687c9de83c22`.
The actual embedded script also ran in an isolated VM with network access denied:
Continue, map popup and Escape, a real merchant camp-pack purchase with exact
payment and remaining nights, all six Activities categories, a memory-game board,
and 121-room maze rendering with arrow movement passed. The standalone includes
the complete original media. `git diff --check` passed.

Browser visual, device/touch and screen-reader QA were unavailable: the required
browser skill is not installed. Semantic DOM checks do not establish CSS geometry
or visual acceptance. No new art or audio files were added; existing media and
palette variables are unchanged.

The complete historical suite is **not claimed green**. A supplementary run of
`new-life-v15`, `rebuild` and `rebuild-v4` produced 33 passes and twelve failures:
all nineteen new-life cases passed, while older travel/path helpers assume
unrested travel has its original fixed duration, use retired `camp_rest`, or
expect the previous dungeon path after those helpers. Earlier suites also retain
superseded remote-service, planning and literal-prose expectations. Those older
test assumptions still need modernization; they have not been silently skipped
or relabelled as passing.
