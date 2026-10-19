# Focus 14 follow-up: confirmed journeys and home recovery

v0.33.2 continues from v0.33.1. This implements the user's latest map direction
and the additional Recovery request. The muted yellow-gray palette remains.

## Map interaction

Known location markers reveal a small subdued name label on hover or keyboard
focus. Printed city labels also remain clickable. A single click immediately
selects the place and opens the existing route card; the former 520ms destination
delay is removed. The card retains real time, danger, Focus and route information
and its departure button now reads Confirm Journey. Hover, selection, keyboard
inspection and destination double-clicks spend no days, gold or Focus and do not
write any life slot. Unknown places remain hidden.

The direct destination double-click departure function is removed. Only the
separate route-card command starts the existing guarded journey. Disconnected
confirmation controls and repeat clicks cannot start an old reviewed route.
Closed roads, pending moments, age limits and actual journey terms remain
enforced by the same simulation. Dungeon movement is unchanged.

The expanded map remains map-only. Select a place there, close it, and review
and confirm in Explore. Its focus return and selected place remain. Wheel zoom,
mouse drag, Find Me, Expand, hidden scrollbars and fading region labels remain.
Instructions and announcements describe the new interaction. No artwork or
palette variables change.

## Resting at an owned home

Recovery offers Go Home and Rest when the recorded home is an owned cottage,
townhouse or estate at the current settlement. The shortcut uses real local
walking actions to reach Homes, then the shared home_rest simulation command
spends one day in bed and restores all Focus. It leaves the player at Homes.
The same rest command is available when visiting Homes through Explore.

There is no room rental fee, camp-kit use, extra planning screen or new saved
ledger. Ordinary time-based provisions and upkeep continue to accrue and settle
through the existing budget. A completed rest resets travel's days without rest.
It grants no healing or condition cure and does not change ownership or bonds.
Repeated rests consume another day each.

An address in another city, lodgings, open country, a destroyed or evacuated
town, an ongoing journey and unresolved moments cannot provide remote rest.
Existing commitments still block it. The action rechecks ownership and availability
after time passes; an interrupted day grants no Focus or rested-travel benefit.
Existing homes keep their recorded tier and address. No save-format migration is
needed.

## Verification

The final selected regression gate passed all **155 checks across ten files**,
with no failures, cancellations or skipped checks. `npm run build` passed.
The release check receipt is `feedback-v0.33.2-tests.json`. The new focused files
exercise pointer hover and native click/double-click sequences, immediate route
review, SVG city-label selection, separate pointer and keyboard confirmation,
stale confirmation controls, blocked routes, real purchased homes, actual local
walking, living costs, repeated rests, remote rejection and interrupted recovery.
Existing map-camera, travel, services, world-expansion and protected-save checks
are included in the selected regression gate.

`scripts/verify-offline-journey-confirmation-v38.mjs` boots the actual embedded
standalone script with network requests forbidden. It verifies the new map flow
in both map surfaces and the purchased-home Recovery shortcut, alongside the
previous market, inn, Activities, old-save, journey and dungeon flows. It also
checks that all ten offline parts exactly reconstruct the downloadable artifact.
The resulting receipt is `verification-v0.33.2.json`. The ten parts reproduce
**82,270,022 bytes**, SHA-256
`22f079493c7f32bcbbd6bd84ea5b9acc03b6fa2e61f37eb028e98ef9325f7edb`.
The actual embedded script passes with **zero network requests**.

This is semantic DOM, simulation, camera math and bundled-runtime verification.
Rendered browser geometry, touch/device and screen-reader QA are unavailable.
The selected gate does not claim that the entire historical suite passes.
Focus 15 remains unstarted.
