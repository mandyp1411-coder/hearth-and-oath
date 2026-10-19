# Hearth & Oath — 0.24.0 implementation and test report

This update expands the approved roadmap into a playable beta with more connected stories, party decisions, combat options, persistent dungeons, whole painted portraits and contextual music. It is an implementation report, not a claim of a finished public 1.0 or reviews from human critics.

## Implemented content and systems

- Six regional stories, 30 chapters and 150 choices. Current locations, living cast members and faiths come from actual game records. Earlier outcomes persist; displaced stories follow a surviving refuge. Offices can pass to new people without resurrecting their former holders.
- 24 personal story families. Existing saved three-chapter scenes retain their old contract; newly started stories use five chapters, including marriage, jealousy, festivals, desertion, false accusations, children leaving home and an actual curse survivor’s account.
- Six companions with 30 distinct situations and 90 authored constructive, commercial and coercive outcomes. Trust, respect and fear differ. Independent work, absence, departure and death affect party availability. Services and advanced techniques require attended decisions. Older three-person circles can expand through an explicit in-game invitation.
- Six faction paths with 18 attended agreements, actual time and fees, named region ties and usable shared, priced or controlled services. Quiet trade can conflict with the current region’s law; witnesses and older charges are not erased by a favorable outcome.
- 24 additional combat techniques across 12 earned callings, 48 enemy archetypes with 28 typed actions and 12 signature guardians with visible, once-only phases. Captured older battles retain their original effects. Target checks occur before spending magic or a turn; temporary ash constructs cannot resurrect named people.
- Six signature and 12 modular descents use persistent reciprocal room maps. Fog keeps unseen rooms unnamed. Side caches are finite. Archive, survey and living-contact leads open 36 guardian alternatives with actual skills, materials, food, money, laws and holdings.
- Unique egg, lens, crown and cup-receipt property has provenance and real ownership. Sales cannot pay twice. A pursuing guardian can be confronted; the lens gives a public place lead without revealing private knowledge. Finite story supply changes affect quoted prices without compounding or restocking sold goods.
- 256 curated portrait identities across eight races, with five linked ages: 1,024 new age paintings plus preserved adult anchors. 2,048 new adult/elder curse paintings preserve those identities through composed, hungry, feral and werewolf forms. New NPCs prefer these linked families; the full 11,776-image ordinary gallery remains available for the player.
- 15 original modal music pieces, 18 minutes 28 seconds in total, with regional, biome, menu, childhood, combat, boss, curse and legacy contexts. Gesture, mute, hidden-page and stale-load guards remain; original synthesis is the codec fallback.
- Compact disclosure panels, a Relics & claims pack section, paper dungeon maps and neutral map terrain tones. The self-contained offline download embeds the artwork, parchment texture and all 15 recordings.

The new art covers 32 linked identities per race. It does not turn every legacy gallery face into an individually matched age and curse family. The four original vampire blood lineages keep their distinct lore and powers; the new linked paintings depict hunger and transformation stages, rather than four separate lineage paintings for every identity.

## Verification

Generated art has decoded whole-cell registrations, source hashes, actual content rectangles and retained prompt/provenance records in `reference-art/linked-v27`. Art is built-in ImageGen; crops, aspect-preserving contain packing and AVIF encoding are technical registration only. No hair, beard, helmet or facial-feature overlays are used.

| Check | Result | What was checked |
| --- | --- | --- |
| Distinct automated lives | 100 / 100 passed | 26,665 public commands, 1,881 exact save reloads and 140 resolved battles across eight races and ten play policies. Starting ages were 0, 3, 10, 18, 25, 45 and 65. |
| Life endings | 89 retirements, 11 deaths | Ten refusing vampires died of blood starvation; one life ended under a local curse execution warrant. Retirement is a deliberate conclusion, not a claim that every run lasted to natural old age. |
| Connected gameplay journey | Passed | Earned all 24 new techniques, completed 30 regional chapters, 18 faction agreements and 30 companion chapters, and resolved both guardians in one signature descent using real leads and supplies. |
| Seeded paper maps | 512 / 512 passed | 512 distinct art and geometry hashes, 165 hexes per world, no printed place names or hidden-terrain leaks, immutable rendering and a camera containing the player. |
| Linked transformations | 2,048 / 2,048 checked | All 256 identities, adult and elder stages, and four forms retained their family and species; every crop stayed within its actual atlas and rendered as one image. |
| Encounter snapshots | Passed | Every registered encounter could be captured as a valid, immutable battle with canonical weakness names. |
| Full automated test suite | 802 / 802 passed; zero failures | Existing and new engine, migration, story, combat, dialogue, inventory, map, UI-contract and audio-contract regressions. |
| Offline build | Passed | JavaScript parsed after module translation. All 190 ordinary/enemy atlases, 64 curse atlases, parchment and 15 Ogg recordings were embedded in a self-contained download, stored in ten parts. |

The 100 lives are automated public-command runs, with recorded input-immutability checks and save validation after transitions. They are not human critics or browser play sessions. Resumed batches span development checkpoints; final affected-system regressions and the complete test suite were checked separately. Replays of the same seed are not counted as extra distinct lives.

The connected journey recorded 2,591 public commands, including unsuccessful driver attempts and resumed checkpoints. It is one connected journey, not another completed lifetime. Driver mistakes were corrected to use available free care and birthday feeding choices, rather than injecting resources or forcing outcomes.

The maps are procedural ink charts over one shared AI-generated parchment texture, not 512 separately AI-painted maps. A completed signature dungeon’s SVG was also rendered and visually checked after wrapping long room names and increasing label contrast; this does not replace browser layout QA. Audio was mechanically decoded and measured; those checks do not establish how it sounds on speakers or headphones.

Reproducible evidence is retained in `docs/playtest/roadmap-v27`: life summaries and compressed full command traces, the connected journey and its final save, the 512-map manifest, final test results and runtime hashes. The scripts default to ignored `artifacts/playtest/v27` output and can be run again without changing saves or runtime statistics directly.

## Problems found and fixed

| Finding | Fix and practical effect |
| --- | --- |
| A birthday and road encounter could collide at the same calendar boundary. | Birthday and urgent needs settle before the deferred road encounter. The same leg and encounter resume once. |
| Opening a new story could settle earlier household bills and invalidate the offered fee. | Zero-time RPG scene/menu actions no longer settle bills. Attended commitments pay their fee once; household costs settle against actual time. |
| Old households could lack a home location, and old companion trust could be fractional. | Additive migration uses the actual current place as a fallback and accepts bounded finite trust. Old circles keep their existing members and unfinished events. |
| New enemy weaknesses could make a legitimate battle save fail validation. | Physical weakness is accepted; sacred weakness maps to the actual radiance spell. Physical attacks exploit the corresponding weakness. |
| Healing could use requested damage rather than damage actually dealt. | Grave drain and enemy drains recover only from actual bounded damage. Bloodless targets cannot supply blood or bleeding. |
| A broken sacred oath could leave an alternate holy spell available. | The earned oath applies even after changing calling; affected sacred techniques show their actual restriction. |
| A necromantic attendant could be mistaken for a persistent companion. | Its battle actor is temporary, summoned once and excluded from NPC death/identity records. |
| A collected store survey hid the living-contact lead in the same room. | Both applicable leads remain separately available until attended. Guardian alternatives still need their own named participants and supplies. |
| Price consequences could accumulate or restore sold inventory. | Story supply adjustments use a saved ordinary base, expire after their actual term and never restock an item. |
| An alias in an imported creator function could produce invalid offline JavaScript. | Module aliases translate into valid destructuring; the build now parses the entire translated graph before embedding media. |
| Hair, facial parts and age variants could change a character’s apparent identity. | New linked families use whole paintings across age and curse stages. Targeted adult beastfolk and tiefling paintings were edited and visually inspected before final registration. |

Several test expectations also needed deliberate updates for the expanded content count, additive RPG migration and linked portrait layouts. Existing resource, pending-choice and old-battle checks were preserved; genuine failures were not bypassed by removing validation.

## Evaluation and next priorities

The strongest improvement is that the new material connects to the existing calendar, people, economy and consequences. A guardian can be resolved through lived investigation and supplies; a companion can build a useful service and still leave; a coercive outcome can benefit the player without rewriting its witnesses. That makes replay differences more substantial than a changed name or flavor sentence.

This remains smaller and less authored than a game such as Baldur’s Gate 3. More branching dialogue, distinctive recurring rivals, companion chemistry, situation-specific combat encounters and human-paced chapter editing would improve it further. These are design judgments from the implemented systems and test evidence, not a claim of equivalent production quality or a new critic survey.

## Remaining release gates

1. Human playtests of new, imported and inherited lives, including deliberate evil, curse refusal and civilian play.
2. Browser and device checks at desktop, tablet and phone sizes: scrolling, focus, touch targets, fullscreen, keyboard play, portrait rendering and save import/export.
3. Listening and browser playback checks for volume, codec support, loop seams, transitions, mute and background suspension.
4. Balance and pacing review of all callings, guardian phases, faction rewards, companion absence and late-life economy.
5. Expand linked artwork beyond the current curated families and review every individual face against its character role.
6. Further authored dialogue, rivalry, companion interplay and region-specific encounters, followed by accessibility and editorial review.

No supported browser preview or listening session was available for this pass. The update preserves the Site’s existing audience and remains a beta for further playtesting.
