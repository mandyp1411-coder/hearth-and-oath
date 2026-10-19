# Focus 14 follow-up: map camera, People Here merchants and leisure

v0.33.1 continues from v0.33.0. The user's latest instructions supersede the
previous scrollbar and counter layouts. The muted yellow-gray palette remains.

## Map camera

Plain mouse-wheel input zooms toward the pointer in the inline map and the popup;
Alt is no longer required. Holding the primary mouse button pans. Native map
scrollbars are hidden, while the definite viewport height from v0.33.0 remains.
The inline controls are Find Me and Expand. The +/− buttons are removed; keyboard
pan, zoom and Home remain available. Wheel input outside the map is unaffected,
and Ctrl/Meta-wheel remains available to browser zoom. Double-clicking a known
place still starts the same guarded real journey as Set Out.

Large political region names now have an explicit `paper-region-title` class.
Both these titles and geographic region labels fade progressively with the map's
existing zoom variable, becoming invisible by 2×. City and location labels,
rivers, destination buttons, borders and travel rules are unaffected. The fade
respects reduced-motion preferences. Initial saved zoom and popup zoom use the
same styling; no simulation state changes when the camera moves.

## People Here

The final layout follows the user's latest direction: there is no dedicated
market or innkeeper counter screen. Both areas keep their normal environment
illustration and list actual local people in People Here. Select the merchant or
innkeeper to open their portrait, dialogue and services. Leaving returns to the
same public area. Underage characters can meet and leave a merchant while
independent trading remains age gated.

Markets have three distinct people: the existing General Merchant, an Apothecary
and a Travel Outfitter. The original merchant's identity, inventory, equipment
prices and older offers remain. The Apothecary offers healing potions at 9 Gold;
the Outfitter offers rations at 7 Gold and the existing camping kits. The general
merchant retains its broader stock and prices. These specialist selections draw
from the same actual settlement supply, so changing merchants cannot recreate
sold-out stock. Vendor-specific quotations bind to the correct person, location,
season, day, prices and current ownership. Edited, stale, remote and unaffordable
exchanges remain atomic. No extra saved merchant stock or migration is required.

The General Merchant's existing trade ID contains separators that are unsuitable
for the relationship book. Its service-person identity is normalized while its
original trade binding, name and portrait remain unchanged. A real visit records
only the person approached. Inspecting lists or offers does not introduce every
merchant automatically.

The innkeeper remains in People Here. The existing illustrated food/drink barter,
one-night room and real quest-rumor services remain available through the keeper's
dialogue. The reply menu gives clear food/drink, room, rumor and leave choices.
Rumors still point to actual clients and destinations, require the player to
accept the work, and remain in Journal Notes. Inn stock stays separate from market
stock. The market counter renderer and its unused styling are removed; the innkeeper keeps the normal NPC entry.

## Social & Fun

Social & Fun shows current Stress and organizes short activities under Time for
Yourself, At the Tavern, With Your Circle and Games. Existing walks, outings with
actual known people, drinking and playable games remain. No automatic courtship,
new friendship or phantom companion is attached to the new leisure choices.

| Activity | Gold | Days | Stress relief | Other effects |
| --- | ---: | ---: | ---: | --- |
| Spend Time Outdoors | 0 | 1 | 8 | 5 Joy, up to 3 Focus |
| Sketch Your Surroundings | 0 | 1 | 8 | 6 Joy |
| Have a Picnic | 4 | 1 | 10 | 8 Joy, up to 3 Focus |
| Listen to Music at the Tavern | 3 | 1 | 12 | 8 Joy |
| Eat at the Tavern | 6 | 1 | 8 | 6 Joy, up to 3 Focus and 6 Health |
| Play Board Games at the Tavern | 2 | 1 | 10 | 7 Joy |

Free outdoor time and sketching are also available at named wilderness locations
when no encounter is waiting. Picnic supplies require a settlement; tavern activities require being
in the real tavern. In-progress crossings, encounters and commitments keep their
normal guards. The player spends an actual day, the quoted fee and no unrecorded
relationship change. Interrupted time grants neither free rewards nor partial
fees. Health, Focus, Joy and Stress remain bounded, and repeating the same outing
on the saved completion day cannot grant another reward. The existing optional
leisure ledger accepts these new keys and still rejects unknown or future entries.

## Verification

The final automated release gate and actual embedded-runtime receipt are recorded
in `feedback-v0.33.1-tests.json` and `verification-v0.33.1.json`. Checks cover
pointer-anchored ordinary wheel zoom, saved/popup scale, map label classes and
control count, counter-free People Here entries, unique merchant identities,
profile stock/prices, stock depletion, stale/edited offers, underage dialogue,
inn purchases/rooms/rumors, all six leisure outcomes, real costs/time, clamping,
interruption, repeated use and save round trips. Existing travel, storage recovery,
world services, creation and core Activities behavior are also exercised.

The final standalone verifier boots the actual compiled HTML with network access
forbidden, checks all stored parts and their hash, and exercises the same new
camera, merchant and stress-relief paths. The semantic DOM harness verifies
handlers, focus, controls and saved state; it does not render browser layout.
Browser geometry, touch/device and screen-reader QA remain unavailable. No claim
is made that the entire historical test suite passes. The unrelated historical
People/Quest Records failures are documented in v0.32.0. Focus 15 remains unstarted.
