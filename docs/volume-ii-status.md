# Design Bible Volume II: implementation status

The owner's supplied Volume II, "The Hand That Acts", governs new work from
v0.70 and supersedes Volume I where they disagree. This companion tracks
implementation and evidence without editing the owner's original PDF.

## Phase 1: prove one life

| Release | Scope | Status and evidence |
| --- | --- | --- |
| v0.70 | The archive and measuring tools | Merged as PR #14. The archive is now public as Sites version 1 through v0.71.2, and the main link is enabled in Sites 106. The full browser handoff remains NOT RUN after two service stalls. Keep all compatibility code. |
| v0.71 | One farmer's life | Shipped as a playtest candidate in [PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15). Sites version 104 is [published](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/); merge `6d692f1fd0184ef4ae0efcd527b70ab1e5819d7c` is complete. The [software record](measures/farmer-v071-verification.md) contains 3,939 selected passing assertions and five skips, with composite FAST/SLOW limits. The human playtest remains NOT RUN. |
| v0.72 | One rulebook | v0.72.0 takes the cutover on the owner's word (25 October 2026), before the farmer playtest: main admits the new rules only, old-rules lives meet their door and play on in the public archive. The old rules' code leaves main from v0.72.1. See [the plan](one-rulebook-v072.md). |

No later Volume II release is claimed complete. Phase 2's new kinds of life wait for the
farmer's real playtest. The protocol and separate verdict are in
`docs/playtests/farmer-v071.md`.

The owner has authorized [v0.72 preparation](one-rulebook-v072.md): source
inventory, save-preservation regressions and a storage boundary on a
separate branch. Retained decoding and incoming-write admission are now
separate; both rulebooks remain accepted by the current caller. A genuine
v0.61 fixture protects debt-only new-rule lives. This widens no livelihood,
removes no compatibility and waives neither gate.

The [first storage implementation](measures/one-rulebook-v072-storage-verification.md)
passed 448 selected save/Ironman/edition tests and one compiled session with
14 bounded cases. Strict content, import-graph build and artifact identity
passed. These are development results on draft PR #19; full FAST/SLOW,
formal release certification and browser/human gates remain NOT RUN.

The next v0.72 slice connects ordinary and Ironman simulation-entry fences,
including queued imports and reattachment. Its current policy stays unset:
both rulebooks remain accepted and no compatibility is removed. Raw old-save
decoding/export UI and the outstanding acceptance gates remain prerequisites
to the actual cutover.

That connected entry slice's [fresh record](measures/one-rulebook-v072-entry-verification.md)
has 500 selected tests passed across 31 files, zero failed/skipped, and one
compiled session with 14 cases. Source/artifact guards and content/import-
graph build pass. These development checks do not complete either acceptance
gate or certify the full release; v0.72 remains unpublished.

The next slice builds step 3 and closes a step-1 hazard. Under a refusing
policy, an old life meets its door: kept on the title and in its slot, never
opened, exported whole, sent to the archive; an old file is pointed there; a
kept Ironman run exports its head without adoption. `rulebook.js` still
admits both rulebooks; the door is tested by rehearsing the cutover through
the actual app. The store now keeps a life it cannot decode instead of
dropping it on the next save. Old Ironman records still need their own kept
path. Neither gate is waived and no compatibility is removed. See
[the plan](one-rulebook-v072.md#the-old-lifes-door-step-3).

The [session materials](playtests/farmer-v071.md#ready-to-use-session-materials)
shipped in [PR #16](https://github.com/mandyp1411-coder/hearth-and-oath/pull/16) with two genuine age-sixteen starts and separate
blank observer forms. Both starts passed full save validation and exact
import checks; one was opened in the live browser. This prepares the gate
without supplying a participant or a verdict. That kit did not change the runtime.

v0.71.1, the bounded repair of the farmer's first birthday, is published as
Sites version 105 in [PR #17](https://github.com/mandyp1411-coder/hearth-and-oath/pull/17).
Merge `02a79c80f849dee67a4c93797ed8806b13473aeb` is complete; fresh FAST/SLOW results are 3,947 passed, zero failed,
five skipped, and four targeted offline checks pass. The formal full gate
remains NOT RUN.
It retains new authored hints and derives a display for existing captured
choices from their actual effects. It does not rewrite history or add a
later livelihood. See [the patch checks](measures/farmer-v0711-verification.md).
The human farmer-and-heir gate remains NOT RUN.

The selected software results do not establish a strict single-snapshot
software-gate PASS. Offline evidence must retain its actual terminal status,
artifact identity and checker scope. The [edition ledger](../claude/edition-progress.md)
keeps the exact source, merge and deployment fields; pending delivery is not
reported as shipped.

## Save defaults for v0.71

Migration step 71 changes no past deeds. Saves begun before this release
receive no field, farm people, ambition, crop or retrospective story. New
common and bound births receive the bounded farmer system. An heir inherits
a real parent's farm consequences; a parent without a farm does not create
one during succession. Both old rulebooks remain playable in main while
archive deployment is unresolved.

## Acceptance that still requires people

Six to eight new players, plus the owner, play one farmer life and the
heir's first chapter. Most must remember two people, a choice-led turning
point, the life's purpose and understandable consequences, and want to
continue as the heir. Simulations measure mechanics; no simulated reviewer
is counted as a participant.

## v0.71.2: the old lives have a home

Main Sites 106 and the separate public archive version 1 are published in
[PR #18](https://github.com/mandyp1411-coder/hearth-and-oath/pull/18),
merged as `d1e218259b81e09fb33a2cb65913106a727e2996`.
The pinned archive accepts the exact old step-71 metadata without changing
its gameplay or a save's history. The builder keeps its standalone separate
from the size-checked host. Full fresh FAST/SLOW lanes have 3,949 passing
assertions, zero failed assertions and five skips; strict lanes remain FAIL.
Sixteen source-engine cases cover fourteen genuine old states; one compiled
startup check passes. Complete proof and auxiliary evidence limits are in
[the release record](measures/archive-v0712-verification.md).

Chrome opened the public archive and main exported a complete actual old
save. The full browser transfer loop remains NOT RUN after service stalls.
No human farmer verdict is supplied, no legacy code is removed, and no
later phase or further farmer-opening layout polish is included.
