# Hearth & Oath — v0.16 audit

This release rebuilds the portrait system and makes origins describe the circumstances of a birth. Character creation offers origin, appearance, and starting age; the unchosen name, family, fortune, temperament, beliefs, and tastes come from seeded fate. The existing charcoal, parchment, and worn-metal game menus remain.

## Origins and randomness

There are **21 origins**: five shared beginnings and two exclusive beginnings for each of eight ancestries. Every ancestry has seven eligible origins. **Cast by fate is the default and first choice**; it draws only from the selected ancestry's eligible pool. Changing ancestry clears an incompatible explicit origin to fate. A race-specific explicit origin also prevents a random appearance roll from silently changing that ancestry.

The shared beginnings are Hearthborn, Roadborn, Shrine foundling, Borderborn, and Fallen house. Their descriptions concern cradles, guardians, and the surrounding household rather than accomplishments attributed to an infant. Borderborn retains the old `exile` save identifier.

| Ancestry | Exclusive beginnings |
|---|---|
| Human | Bellward child; River cradle |
| Elf | Rootsong cradle; Inkbough child |
| Dwarf | Deephearth child; Maker's ward |
| Halfling | Gardenkin child; Waytable child |
| Orc | Witnessed hearth; Carved-bowl child |
| Goblin | Patchwork cradle; Crossing nest |
| Tiefling | Letter-hearth child; Lanternward child |
| Beastfolk | Moon-path cradle; Salt-landing child |

Origins influence the possible birthplace, family arrangement, household means, community, and generated early history. These are weighted possibilities, with independent rolls for each circumstance. The actual home starts at the birthplace, and the birth journal names the caring parent or community guardians. Character facts show Birthplace and Birth community. Origins do not prescribe alignment, a class, or the character's eventual profession. All shared origins remain available to all ancestries.

## Portrait changes and resolved defects

- Removed Facial features, Face shape, and Skin tone controls. Legacy values remain readable in saves but no longer stretch or recolor the face.
- Added three illustrated heritages, three presentations, and three adult likenesses per ancestry: **216 adult faces**. Four age stages add **288 infant, child, adolescent, and elder portraits**, for **504 selectable illustrated identities**.
- Kept portrait presentation separate from random life circumstances, and preserved heritage in generated relatives and children.
- Added 40 new engraved portrait atlases. Hair, beards, headwear, masks, and accessories use ancestry-specific art and per-face registration. The visible portrait retains a positive square height in the creator.
- Measured 680 source pieces and 416 covering/detail clipping hulls. Variable atlas rows now crop the intended piece instead of bleeding a neighboring item into the face.
- Corrected scalp-colored hair patches, floating hair strips, misplaced beards and accessories, abrupt long-hair edges, and the goblin base portraits' neighboring-row crescent. Final targeted native renders passed after these corrections.
- Adjusted hood openings to preserve beastfolk muzzles. Closed helmets take precedence over masks and suppress conflicting beards and accessories; open headwear keeps rear hair while concealing front locks that would cross its surface. Scars and eye marks render below coverings.
- Raised the orc/goblin open helmet brims and aligned their eyepatches with the near eye. A final 27-tile matrix across heritages and presentations passed after the adjustments.
- Age zero uses infant artwork with no hair, beard, mask, or headwear. Hair and suitable headwear unlock at 3; masks at 16; facial hair, scars, and ink at 18. Adult likeness selection applies at ages 18–64; the elder artwork takes over at 65.

The art manifest, layout, generation prompts, conversion settings, and fitting contract are recorded in [PORTRAIT_ART_V16.md](PORTRAIT_ART_V16.md). Adornments are drawn per ancestry and fitted to each face. They are shared within that ancestry, rather than being 504 separately repainted sets.

## Verification

The full automated suite passed **671/671 tests**, with no failures or skips. This includes the 666 existing release checks and five new download-integrity checks. The focused creator, portrait, and part-registration suite also passed **18/18 tests** after the source-fragment masks. Checks include origin eligibility and repeatable fate rolls, newborn care, save migration, inherited appearance, 504 distinct portrait selections, all style paths, source-image hashes, crop/hull geometry, and the renderer's actual CSS source percentages and fitting wrappers.

The final offline build embeds all **40 new portrait assets**, verified against each source bitmap's actual bytes, with no remaining external references to those portraits. Its one inline JavaScript bundle parses, and **all 47 source modules** pass syntax checks. The standalone HTML is **38,006,301 bytes**. The hosted entry point continues to use the same production modules. Final avatar SHA-256: `58052bab0ba52c49b47018d9bc670f82f0ca929b89b6dab88f449bca54695c83`.

The first publication attempt found the source service's per-file size limit on the large standalone HTML. Production now stores that generated download in five parts, each at most 8 MiB. Download game assembles them into the same single, self-contained HTML file. The old HTML URL opens the bundled edition through a small loading entry. A production-file check verified the assembled bytes match the generated standalone file exactly; UTF-8 boundary and missing/truncated-part tests pass. This packaging/download adjustment was made after the lifetime audit and does not change the audited life engine. The local build also emits `artifacts/hearth-and-oath.html`; older browser isolation harnesses need to use that assembled fixture instead of blocking the loading entry's required initial chunk requests. Browser behavior for this delivery path remains within the verification limit below.

The thirteen superseded portrait atlases are retained under `reference-art/legacy-portraits/` and excluded from the published directory. Runtime source references only the forty v16 atlases. Legacy save fields still migrate through the same canonical appearance normalizer; artwork paths are not taken from imported saves.

### Creation and starting-age audit

The reproducible run in [creation-v16.json](creation-v16.json) exercises all 21 origins at ages 0, 2, 7, 14, 17, 18, 40, 65, and 80: **189 distinct starts**. Shared origins rotate across ancestries; heritage and presentation vary. It checks the opening state, pre-start generated years, next public-engine year, family placement, birth/home location, age portrait, identity preservation, and serialization/migration. This is a creation-and-first-year audit, not 189 complete lifetimes.

The final run passed **189/189**, with **zero failures**, against the final renderer hash recorded above.

| Creation audit measure | Result |
|---|---:|
| Distinct starts and opening chronicles | 189 |
| Generated pre-start years | 5,103 |
| Subsequent public-engine years | 189 |
| Public transitions after the opening | 612 |
| Serialization/migration checks | 411 |
| Character identity checks | 3,795 |
| Distinct portrait selections in this run | 159 |
| Origin / ancestry / heritage / presentation coverage | 21 / 8 / 3 / 3 |

All four family arrangements and all twelve possible birthplaces appeared. The wider automated portrait mapping suite separately checks all 504 identities; the 189-start sample does not cover that entire portrait matrix.

### Full lifetime audit

A separate new run in [full-lives-v16.json](full-lives-v16.json) executes **104 fresh lives from age zero to retirement**. Four independent 26-life batches use weekly care, free care, guided care, and building policies. They act through public game-engine transitions, including choices and battle turns, and periodically serialize/reload the state. No direct stat grants, clock changes, or save edits are used to finish the journeys. Merge validation requires exactly indices 1–104, unique seeds, unique finished life hashes, and zero failed lives.

All **104/104 lives passed**, with **zero failures**. Every life ended through the real retirement action at an age from **35 to 85**. There were no death endings in this sample.

| Full-lifetime audit measure | Result |
|---|---:|
| Distinct completed lives and seeds | 104 |
| Distinct decision traces | 104 |
| Completed lived years | 6,200 |
| Public gameplay transitions | 63,271 |
| Input-state immutability checks | 63,271 |
| Save serialization/reloads | 30,801 |
| Runtime portrait and identity checks | 477,129 |
| Recorded children | 130 |
| Actual child continuations | 11 |
| Retirement / death endings | 104 / 0 |

All 21 origins, eight ancestries, three heritages, three presentations, four family arrangements, and twelve birthplaces appeared. The runs reached all six personal story arcs and 55 recorded story-choice keys. They recorded 17 battle victories and 25 retreats, plus 1,321 completed arrivals and 18 turned-back journeys. The thirteen profession states include the twelve professions and Unemployed.

These are successful runs of the tested paths. No gameplay failure was found that required a new engine fix after the birthplace/home correction. The visual review did find source fragments, hair join lines, and covering/accessory misalignment; those defects were corrected and rechecked as described above.

The lifetime batches began while final cosmetic masks were still being refined. Each batch's initial and final source hashes are preserved. All 17 other hashed gameplay/helper files remained unchanged; only `avatar.js` differed. All report-time snapshots match the final avatar hash. The final creation audit and final full test suite use that renderer. The lifetime audit covers the four policies named above. It does not establish cancellation-policy, relationship-policy, or transformation-scenario coverage, or repeat every main campaign ending.

### Visual review and limits

Native Canvas contact sheets render the application's actual source rectangles, fitting transforms, and nested clipping polygons. They were used to inspect identities, all hairstyles across the three presentations, and representative beards, coverings, masks, and accessories across ancestries. A final 45-tile targeted review verified the reported orc/goblin hair fragments, goblin base crescents, and tiefling tied-hair strip were removed. Another 27 final targeted tiles verified the corrected open goblin kettle helm and orc/goblin eyepatch fittings across all three heritages and presentations. The preceding orc/goblin part review sampled 12 of 25 headwear and 6 of 11 masks per ancestry, all eight beard styles and all eight raster accessories; it did not visually check every covering on every face.

This review checks bitmap composition. It does not reproduce CSS color filters, SVG markings, or responsive browser layout. Browser automation was unavailable in this environment, so **no manual browser playthrough or browser layout verification is claimed**. The 104 completed lives are automated engine journeys. Generated artwork can retain faint engraved edge strokes, and some selected bangs and closed coverings deliberately obscure the face.

## Further improvements identified

Future expansions could make each birth community recur in later story arcs, add more illustrated heritage lore, and replace the remaining code-drawn eye/scar markings with face-specific artwork. Those are content/art expansions beyond the defects corrected in this release. The audit is evidence for the scenarios tested, not proof that every possible RPG path or portrait combination is flawless.

## Reproduce

```sh
npm test
npm run build
node scripts/audit-creation-v16.mjs
node scripts/audit-full-rpg-v16.mjs 104 docs/full-lives-v16.json 0
node scripts/render-portrait-qa-v16.mjs human /tmp/human-parts.png
node scripts/render-portrait-qa-v16.mjs human /tmp/human-identities.png --identities
node scripts/render-portrait-qa-v16.mjs human /tmp/human-hair.png --all-hair
```

The art registration scripts verify the current source bitmap hashes; their machine-readable reports are [portrait-registration-v16.json](portrait-registration-v16.json) and [portrait-parts-v16.json](portrait-parts-v16.json).
