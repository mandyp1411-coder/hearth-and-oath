# Hearth & Oath v0.23 — release and regression report

The update keeps the fantasy life simulation at the center and applies bounded improvements from the previous audit. It also adds dangerous werewolf and vampire progression, complete transformation paintings and local hunter consequences.

## Verification

| Check | Result |
| --- | --- |
| Public-command lives | 100 passed, 0 failed in the corrected run |
| Commands checked for input immutability and save validity | 33,848 |
| Exact save/reload comparisons | 2,904 |
| Completed party encounters | 140 |
| Life conclusions | 88 retirements, 10 deaths from blood starvation, 2 executions |
| Coverage | 10 behavior profiles × 10 lives; all eight ancestries and three presentations |
| Full regression suite | 773 passed, 0 failed |
| Standalone download | Builds successfully; 57,403,509 bytes in seven stored parts |
| Embedded art | All 174 existing and 32 new AVIF atlases, plus the paper texture |
| Standalone handler evaluation | Five viewport settings; zero network calls; disabled care and recovery path verified |

These are automated simulations and instrumented handler checks. They are **not human critic playtests, browser visual reviews or soundtrack listening sessions**. The 100 lives use public game commands, actual days, battles, choices and retirement or death. The driver never patches stats, items, time, outcomes or conditions. Save validity is checked after every command, with exact JSON reload comparisons at intervals and curse scenes. The release also retains the previous audit’s frozen findings and roadmap; those earlier fictional critic lenses are not relabeled as human research.

The corrected run covers civilian life, exploration, craft, relationships, sustained vampirism, prepared lycanthropy, predatory feeding, refusal of blood, untamed lycanthropy and combat. It does not imply that every story branch or every new bloodline was reached in these 100 lives. Dedicated regressions cover bloodline gifts, enemy roles, native portrait geometry, local pursuit, capital death, invalid imports and earlier saved decisions. The final art and legacy-invitation adjustments are checked separately and in the final full suite.

## What the prior audit changed

| Ticket | Delivered behavior | Scope |
| --- | --- | --- |
| R01 | Three returning personal accounts select later conflicts and replies from earlier care, enterprise or coercion. | The other authored arcs remain available; this is not a replacement of every chapter. |
| R02 | A small named cast has persistent wants, fears, remembered boundaries, refusal, bargaining and possible withdrawal. | Existing pending conversations keep their exact replies. Compulsory cooperation is identified as constrained. |
| R03 | Personal finales leave usable shelter or teaching; campaign aftermath supports actual aftercare and toll policies. Heirs carry their own upbringing and optional unfinished accounts. | Services have places, costs, cooldowns and recorded consequences. |
| R04 | Each faith’s first inquiry separates observation, witnesses and interpretation, with its own dilemma and a usable local practice. | Later legacy inquiry prompts remain authored in their existing form. Prospective aging differs by ancestry without changing saved death dates. |
| R05 | An unemployed character’s mentor refers to recorded training or past work. | Removes the invented current apprenticeship. |
| R06 | Mend and ward checks the actual selected ally and party wards. | A full-health unwarded ally remains a legitimate target. |
| R07 | Calling descriptions match their actual techniques, and current creation documentation describes whole portraits, editable names and age-based trait points. | Historical version notes remain labeled as history. |
| R08 | Party preparation shows the roster that can actually enter. Earned party cover, weapon-family counters and readable ward disruption add resource decisions. | Existing saved battles retain their actors and rules. |
| R09 | Six observed-country premises persist on visited hexes. Interrupted notes can reopen, repaired access improves trail rest, descents retain a source, clue and relic, and project planning shows known material routes. | No notes appear from surveying unvisited country. Settlement interiors retain the existing services. |
| R10 | Prices explain bounded seasonal/security/war causes. Conflicts keep claimant and grievance; prison concerns have named follow-ups. Ordinary loot can be sold as an atomic quoted basket. | This does not add a separate new supply-commission deck or player kingdom management. |
| R11 | Explicit choice intent makes stress effects truthful; guardian decisions do not stress a newborn. New coping callbacks, heir learning, optional paid donor attendance and repeat charter reminders connect needs to lived days. | Automation does not bypass consent, fees, absence, place or calendar interruptions. |
| R12 | Six regional and six faith motifs, a horror cue and quiet gaps strengthen audio identity. Player-facing handler, source, save and offline checks pass. | Browser layout and manual listening remain unverified in this environment. |
| R13 | A living person cannot become both dinner hosts; deceased circles get remembrance. Birthday feedback and descent-defeat costs survive later notices. | Uses the actual recorded cast and outcome. |
| R14 | Law text comes from the current regional code. New allegiance rejects cycles; old cycles are repaired without changing saved geography. | Defeated claimants cannot create circular liege chains. |
| R15 | Stolen property from a merchant is offered to a distinct covert buyer. Unknown older ownership is stated rather than invented. | Ordinary bulk sale validates the entire quote before any removal or payment. |

## The curse expansion

Four original blood lineages have their own lore, portrait progression, hunger profiles and six-MP gifts. A suffered bite can begin a three-day disease. Hungry days accumulate stress, physical starvation and humanity loss. Composed, starved, predatory and feral paintings follow the actual condition. Humane sustenance, named agreements and remembrance offer different ways to live with the appetite. Well-fed charm and immunity to ordinary old-age death coexist with lethal sunlight, starvation and hunter judgment.

New lycanthropy begins at control 12. Prepared refuges protect outsiders, while practice and repeated moons earn small capped gains. Acceptance grants no instant control. Uncontrolled settlement rampages can kill an actual adult and create local evidence. Isolation and resistance can injure or kill the hero. Adult and elder beast paintings follow ancestry and form; the stored mortal face returns between transformations.

Six regional orders enforce different curse policies. They respond to actual local reports, wait for the character’s return and retain evidence after escape or victory. Hunter defeat leads to custody rather than ordinary adventure recovery. Records can support a stay but cannot erase serious witnessed harm. Execution closes the actual life and leaves the existing successor system available. Prison supplies and moon chambers address needs without erasing the warrant.

The [curse guide](CURSES_V23.md) describes entry routes, each lineage, training, feeding and regional policies. The approach takes inspiration from *Vampire: The Masquerade*’s published themes of hunger, humanity, inherited blood gifts and hunters, using original lineages and rules rather than copying its clans. Primary design reference: [Paradox’s official overview](https://www.paradoxinteractive.com/games/world-of-darkness/products/tabletop-roleplaying/vampire-the-masquerade).

## Failures found and corrected

The first 100-life run completed 93 cases and stalled in seven. The driver repeatedly selected medical rest while urgent blood hunger prevented time from passing. A no-time acknowledgment already existed, so the life was recoverable, but the menu made the unavailable treatment look usable. New routine concerns now defer behind urgent needs. Already saved concerns show the blocking reason, keep acknowledgment enabled and preserve the pending scene when a blocked command is submitted. The driver now uses that recovery path. All 100 seeds were rerun, including the seven failures.

An earlier explorer pilot tried to age while offsite. The game correctly required return to a named place; the driver was changed to return through the actual previous hex. This was a driver assumption, not a granted teleport or patched state.

An intermediate full test run finished with 770 passes and two failures because the mustelid artwork was still being produced. The final asset was inspected, native crops were integrated and the dedicated 21-test curse suite passed afterward. Its artifact and final full-suite results are retained separately.

Packaging inspection found that dynamically selected transformation URLs were absent from the standalone bundle. An explicit 32-asset table and build assertion now embed them. The downloadable bytes are reassembled exactly; the instrumented game opens with network disabled and renders inline transformation art. High-quality AVIF encoding reduces delivery bytes from 82,507,423 master PNG bytes to 9,258,811 bytes without changing dimensions, crop bounds, composition or colors. Original built-in generated PNGs remain unchanged in the repository.

## Evidence and limits

Evidence is retained under `docs/release-v23/`: corrected life records, the first 100-life run, intermediate failures, final tests, standalone evaluation and the frozen prior findings. `scripts/release-backtest-v25.mjs` is the replay driver. The artwork prompt set, built-in generation provenance, inspection notes and original output locations are in [CURSE_ART_GENERATION_V23.json](CURSE_ART_GENERATION_V23.json); delivery paths and hashes are in [CURSE_ART_ENCODING_V23.json](CURSE_ART_ENCODING_V23.json). Runtime images are in `dist/art/curses/`, original paintings in `reference-art/curses-v23/`.

The portraits are whole paintings with integrated hair and facial features. Native supplement rectangles preserve ears and horns. Exact correspondence with every earlier mortal illustration is not asserted; Beastfolk anatomy takes priority over a distinct painting for every lineage combination. Some alternate cells are retained as assets rather than selectable faces.

The DOM checks exercise 390×844, 974×654, 1286×902, 1474×654 and 1920×1080 settings, but do not measure CSS geometry. No browser-control capability was available for this task, so no responsive screenshot or manual sound judgment is claimed. These are the remaining verification limits, not a claim of a bug-free game.

## Final regression result

`node --test --test-concurrency=4 tests/*.test.js` completed successfully: **773 tests passed, 0 failed, 0 skipped**. The successful full run took 364.646 seconds. The standalone build and five-surface handler evaluation also completed successfully.

No runtime source changed after these final checks. The exact source and artifact hashes are retained in `docs/release-v23/verification.json`.
