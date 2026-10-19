# Focus 14 follow-up: visible maps, useful shortcuts and local innkeepers

This v0.33.0 update continues from the published v0.32.0 source. It addresses the
four map/service/tavern comments and the subsequent request to remove the
unsolicited fate/civilian-life prompt. The muted yellow-gray palette is retained.

## Map

The general `.hex-board:not(.compact)` auto-height rule outranked the newer
journey chart's height. Combined with a zero flex basis on the viewport, the
inline chart collapsed. That general rule now excludes the journey map. The
journey chart has a definite viewport height independent of the old flex layout,
a larger aspect-ratio canvas, and its own dull-yellow horizontal and vertical
scrollbars. The popup remains a clean map with a close control. No movement grid
or destination circle returns.

Holding the primary mouse button pans the chart. Native scrollbar drags are
excluded from pointer capture; six-pixel drag detection suppresses the trailing
click and double-click. Arrow-key panning, zoom and Find My Position remain.
Single-click/keyboard selection inspects without time, money or discovery.
Pointer inspection waits briefly so the first click does not replace the DOM
target and break native double-clicks. A deliberate double-click calls the same
authoritative travel engine as Set Out, including route, age, danger, Focus,
pending encounter, saved partial crossing and arrival guards. Closing the map or
choosing another command cancels an outstanding inspection.

## Activities

Recovery opens the actual local doctor and healing area. Work opens the local
steward or workplace. Enrolled pupils get Attend Class and Study shortcuts; Talk
to Teacher opens the real teacher without inventing attendance. The shortcuts
walk through public areas first and recheck the action at the destination.

At an uninhabited gate or on a trail, no doctor or employer is invented. A shortcut
instead shows the route to a real provider in an already known, reachable
settlement. Inspection remains free and travel begins explicitly. The tests also
exposed schools being assigned to wilderness birthplaces with no public school
area; school location selection now requires an inhabited settlement. Existing
teacher identities, qualifications and course progress are retained.

## Tavern

The actual local Innkeeper opens the same illustrated two-sided barter inventory
as the market merchant, using a separate, explicitly bound vendor identity and
finite seasonal food/ale stock. Wrapped meals cost 6 Gold; bottled ale costs 3.
Honest unequipped gear and recovered treasure can pay for goods. Equipped items,
stolen goods, stale prices/stock, edited totals, remote counters and interrupted
commitments cannot trade. Clearing, inspecting and leaving an offer remain free.

Purchased food and ale appear in Inventory with muted item illustrations and
usable servings. A meal restores up to 8 Health and 5 Focus; adult ale eases
4 Stress, adds 2 Joy and costs 2 Focus. Each can be used once a day. Neither can
be used through a battle, pending encounter or unfinished journey.

A room costs 8 Gold and one actual night, restoring up to 20 Health, all Focus
and easing 8 Stress. It does not cure illness. Interrupted time grants neither
free recovery nor a room charge. The old two-day rest is not offered by the inn.

Asking for rumors gives the innkeeper's actual offered contract/client when one
is available. Directions mark the named destination; the client is present in
the tavern. Players still speak to the client and accept the work themselves.
With no available contract, the keeper can describe an actual neighboring road.
Heard leads appear in Journal Notes and retain their date; inspection does not
accept a quest, fabricate a destination or pay a reward. News is bounded to one
new request per day. Optional hospitality data validates stock, carried quantities,
dates and real destination IDs; older saves need no new field.

## Removed prompt

“Decide how much of this fate to carry” is no longer an offered action, and the
handler that generated its dialogue is removed. An older save captured with
`quest_decline` open dismisses that retired prompt without choosing a response,
spending time, changing quest status or touching discoveries and relationships.
The legacy event ID remains readable solely for save compatibility.

## Verification

Release results are recorded in `feedback-v0.33.0-tests.json` and the actual
embedded offline runtime receipt is `verification-v0.33.0.json`. The release gate
covers map gestures/travel, local shortcuts, school actions, inn trade and stale
quotes, consumables, rooms, rumors, prompt migration, creation, household,
Activities, campaign, combat, saves, world services and regional/travel behavior.
The offline verifier boots the actual compiled self-contained HTML with network
requests forbidden and checks every stored part against the complete artifact.

The semantic DOM harness verifies handlers, controls, focus and saved state. CSS
cascade and sizing checks cover the specific collapsed map regression. These
checks do not constitute browser geometry, touch/device or screen-reader QA;
those facilities are unavailable in this environment. Historical People/Quest
Records failures documented in v0.32.0 remain outside this release gate and are
not presented as passing. Focus 15 remains unstarted.
