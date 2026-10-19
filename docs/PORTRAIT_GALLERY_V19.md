# Hearth & Oath — portrait book, v0.19

Open **Choose portrait** beside the face in creation, or **Character → Choose portrait** during play. The book uses complete painted illustrations from the existing 10,304-character library. Presentation and collection filters cover knights, cloaks, scholars, healers, craftspeople, performers, court portraits and countryfolk. It displays 24 choices per page and loads their images lazily.

## Age and heritage

| Life stage | Eligible age |
| --- | --- |
| Infant | 0–2 |
| Child | 3–9 |
| Adolescent | 10–17 |
| Adult | 18–64 |
| Elder | 65+ |

Only the current stage can be selected. Other stages show their age restrictions. Each stage stores its exact selected illustration independently, including its presentation. Selecting an adult face leaves a previously chosen child face saved. Until a stage has its own selection, a deterministic matching illustration supplies the face. Save reloads do not reroll it.

Heritage is available in creation, Character and Lore. There are 27 named heritage profiles: three homelands for each of Human, Elf, Dwarf, Halfling, Orc, Goblin and Tiefling; and six Beastfolk lineages. Human and Elf portraits use native illustrated light, medium or deep complexion metadata. Beastfolk portraits follow canine, feline, bear, horned, long-eared or other anatomical families. Closed or otherwise unclassified adult portraits can be shared between compatible heritages. The other ancestry homelands supply family history and customs without arbitrarily restricting clothing or professions.

**Show heritage locks** displays the rest of the current age collection. Locked faces state which heritage is required. Heritage is part of the life’s background once recorded; it does not grant resources, skills, faith or a moral alignment. It describes an ancestral homeland rather than replacing the actual birthplace determined by the origin.

**Cast the bones** still draws fresh circumstances and an illustrated identity. A chosen heritage remains selected. It clears handpicked stage portraits so the new face can belong to fate. Pronouns and portrait presentation are independent choices.

## Existing lives and families

Earlier saves preserve their original appearance fields, pending decisions and battles exactly on import. An older life may record its heritage once in the portrait book. Choosing a face also records the currently inferred heritage. New lives choose or roll heritage at creation.

Portrait selection spends no time or currency and changes no stats, equipment, relationships or waiting decisions. A pending combat must finish before its recorded portrait can change. A finished life retains its recorded face; its living heir can choose their own.

New children can inherit a declared family heritage, receiving their own generated identity rather than the parent’s selected image. This also works in older worlds that predate the complete-portrait generation flag. Existing children and waiting adoption identities remain saved as they were. Wolf forms have a separate selection for each age, restricted to illustrated canines; mortal face choices remain stored.

## Verified behavior

The final regression run passed **680 tests, zero failures**, using `node --test --test-concurrency=4 tests/*.test.js`. This includes 17 dedicated gallery/heritage scenarios and the actual creation/game handler integration. The final offline build is 29,778,786 bytes across four parts; SHA-256: `2b1088e7096e8f8a2b7ef1b9bc090d3c3a4afda43ed734ddde1daa4ddd6aef76`.

- All 10,304 painted cells are reachable through at least one eligible heritage, and every selected face resolves the exact registered native crop.
- All 405 ancestry/heritage/stage/presentation combinations have real eligible art.
- Paged browsing covers every cell once within the selected collection, including the supplemental Elf age illustrations.
- Public selection rejects another age, ancestry, heritage, invalid file paths and malformed saved selectors.
- A handpicked Elf child portrait survives actual birth-to-age-three simulation, export and reload.
- Actual shell handlers select faces during creation and play, browse pages, preserve other save slots and resume the chosen portrait.
- Earlier save fixtures retain their original waiting mechanics; a real pending battle rejects a portrait change.
- An origin/fate form-capture issue that could erase a handpicked face was found and corrected. A separate inheritance edge case in older worlds was corrected.
- The complete offline game contains all 167 character/enemy atlases, its JavaScript parses, and its four parts reassemble exactly.

Browser interaction and responsive layout testing were unavailable in this managed environment. Handler integration, native crop geometry, exhaustive eligibility, legacy fixtures and offline byte verification were completed. The artwork itself is unchanged from v0.18: this update makes the existing complete illustrations selectable rather than adding layered hair or recoloring faces.

The [v0.18 audit](AUDIT_V18.md) remains the record of its 104 automated complete lives. Those journeys were not repeated or counted as new v0.19 playthroughs.
