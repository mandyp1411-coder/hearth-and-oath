# Design Bible Volume II: implementation status

The owner's supplied Volume II, "The Hand That Acts", governs new work from
v0.70 and supersedes Volume I where they disagree. This companion tracks
implementation and evidence without editing the owner's original PDF.

## Phase 1: prove one life

| Release | Scope | Status and evidence |
| --- | --- | --- |
| v0.70 | The archive and measuring tools | Merged as PR #14. The archive branch and packaging exist. `dist/js/archive-link.js` still has no published archive URL; packaging and browser fixtures do not prove a public deployment. Keep all compatibility code. |
| v0.71 | One farmer's life | Shipped as a playtest candidate in [PR #15](https://github.com/mandyp1411-coder/hearth-and-oath/pull/15). Sites version 104 is [published](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/); merge `6d692f1fd0184ef4ae0efcd527b70ab1e5819d7c` is complete. The [software record](measures/farmer-v071-verification.md) contains 3,939 selected passing assertions and five skips, with composite FAST/SLOW limits. The human playtest remains NOT RUN. |

No later Volume II release is claimed complete. Phase 2 waits for the
farmer's real playtest. The protocol and separate verdict are in
`docs/playtests/farmer-v071.md`.

The [session materials](playtests/farmer-v071.md#ready-to-use-session-materials)
now provide a player bundle with two genuine age-sixteen starts and separate
blank observer forms. Both starts passed full save validation and exact
import checks; one was opened in the live browser. This prepares the gate
without supplying a participant or a verdict. The runtime is unchanged.

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
