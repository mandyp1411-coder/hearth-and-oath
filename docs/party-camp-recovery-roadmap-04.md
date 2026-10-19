# Roadmap 4: recovery for the actual maze party

## Design boundary

The 121-room maze already carries companion Health and Focus between battles,
but its safe-room camp previously recovered only the hero. Modern maze camps
now give the same modest allowance to the present, active living expedition
party. A single attended camp day remains the unit of time and shelter use.

- Bare rest: up to 2 Health and ceil(20% of each traveller's maximum Focus).
- A usable bedroll, tent or expedition pack: up to 8 Health and ceil(55% of each
  traveller's maximum Focus), consuming exactly one night from the first usable
  pack. Pack capacities and purchase prices have not changed.
- Every gain is capped by that traveller's missing reserves. A full traveller
  gains zero; this is not a full-party restoration.
- Hero recovery and Stress relief remain unchanged: up to 3 Stress bare or 10
  with shelter. Ordinary attended-day household upkeep still applies.
- Companion slots match battle preparation: the first three recruited, active
  companions, then eligibility filtering. An unavailable companion does not
  silently promote a hidden fourth active slot.
- Companions marked away, departed or dead, or with `alive:false`, do not
  recover. Their home/anchor location is not used as a presence check, because
  the existing model leaves that anchor unchanged during active travel.
- Living companions at zero Health are explicitly downed and receive neither
  Health nor Focus from camp. Camp does not revive the dead or stabilize the
  downed. Targeted field medicine is a separate roadmap item.
- Inactive reserves and unrecruited people receive nothing. Trail camping,
  inn/home recovery and authentic older six-floor descents retain their existing
  recovery policies.

## Implementation

`campRecoveryView` in `dist/js/travel-energy.js` is a non-mutating calculation
shared by the maze action quote and camp execution. The action lists each
attending traveller's actual name and capped Health/Focus gains, actual Stress
relief, one attended day, ordinary living costs, and the selected pack/night.
Ineligible active companions receive a named reason rather than an implied heal.

Execution snapshots eligible attendee IDs before the day, calls the existing
calendar exactly once, and applies recovery only when that call attended the
whole day and the hero did not retire. It recalculates after calendar effects
and intersects with the original attendee IDs. A death or departure during the
night receives no reward; someone returning from independent work during that
day did not attend it and is not added to the recovery list. The receipt records
what actually happened after those calendar effects.

A zero-day interruption grants no recovery, kit consumption, Stress relief,
trail reset or receipt. A completed camp immediately followed by a birthday
decision has already paid and recovered once; the pending decision blocks a
second camp until resolved. Every later deliberate camp costs another full day.

The named receipt uses literal Journal text with current narrative-edition
metadata, preserving actual names and deltas through refresh and reload. Missing
stats never fabricate a reserve or introduce NaN. No persistent schema fields,
world seeds, maze generation, rooms, fog, peaceful routes or stair rules change.

## Verification

The focused acceptance suite is `tests/party-camp-recovery.test.js`. It covers
all three kit types and bare rest, pure quotes, actual deltas and caps, zero
maximum Focus, reserves/unrecruited/deceased/downed/unavailable cases, travelling
anchors, active-slot limits, missing stats, interrupted/retired/boundary changes,
repeated rest and kit exhaustion, legacy trail behavior, stale hostile-room
commands, actual engine upkeep, birthday interruption, actual lineage mortality,
Journal persistence, save migration and the production semantic UI.

Its controlled long-crawl fixture walks real adjacent rooms, uses existing
peaceful checks, camps through the public action, completes the finite objective
and exits by the actual stair. It checks paid days/kit nights, companion recovery,
unchanged reserve resources, exact maze layout and no second return reward. The
fixture uses deliberately controlled skills and starting depletion. It is not
an earned-life combat balance measurement or a dungeon-completion win-rate claim.

Independent read-only review checked the source, eligibility and calendar
boundaries, exact Journal preservation, syntax and diff hygiene. No blocking
production defects were found.

Final acceptance command:

```sh
node --test tests/party-camp-recovery.test.js
```

Result: **27/27 passed**, including the actual engine lineage-death boundary and
production semantic UI. Syntax checks for both modified modules and the new test,
and `git diff --check`, also passed.

The controlled `party-camp-recovery` crawl recorded 14 real movement steps and 4
attended days, including one camp and one expedition-kit night. The active ally
went from 10 Health / 0 Focus to 18 Health / 13 Focus; the reserve was unchanged.
The hero ended at 18 Health / 2 Focus after movement. The finite objective and
real stair exit completed without a second reward.

An earlier focused run passed 25/26 checks; its sole failure was a test attempting
to click an obsolete Explore tab when Continue had already opened the maze. That
fixture was corrected before the final run. A six-suite parallel regression was
stopped before it reported any results to avoid competing with the
memory-intensive release build. No full-suite result is claimed. No offline
bundle or version change is generated in this isolated source commit; integration
and publication remain separate release steps.
