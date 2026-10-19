# Lifecycle portrait expansion

The final production set contains 32 newly generated AVIF atlases, 96 complete identities and 689 registered portraits. Every ancestry receives 12 identities. Each identity has seven distinct illustrated stages: infant, child, adolescent, adult, mature, older and elder. The 672 linked portraits are accompanied by 17 valid alternate infant paintings.

| Illustrated age | Game stage | Registered portraits |
| --- | --- | ---: |
| 1 | Infant, ages 0–2 | 113 |
| 7 | Child, ages 3–9 | 96 |
| 14 | Adolescent, ages 10–17 | 96 |
| 25 | Adult, ages 18–39 | 96 |
| 45 | Mature, ages 40–54 | 96 |
| 58 | Older, ages 55–64 | 96 |
| 72 | Elder, ages 65 and above | 96 |

The artwork uses the existing charcoal and graphite portrait references: practical medieval clothes, natural faces, restrained ancestry anatomy and dark backgrounds. The assets were generated with the built-in image generator. Production pixels were mechanically encoded to AVIF without repainting or programmatic recoloring. Some sources retain a slight warm channel drift despite neutral grayscale prompts; the game's shared grayscale treatment must cover every portrait surface.

The initial large sheets use their actual painted layouts: seven 6-column by 7-row sheets, three 6-column by 6-row sheets, and six transposed 7-column by 6-row sheets. Separately illustrated supplements complete omitted ages and repair inaccurate age drawings. A missing seventh row is never inferred, duplicated or sampled outside the source. Every exported source rectangle uses measured native boundaries. A tall final panel is cropped to its actual upper square so extra torso space does not shrink the face.

The native contact-sheet review found a recurring long-haired identity that had been painted too old in the youngest rows. The final catalog excludes its inaccurate infant and child cells in Human, Elf, Dwarf, Halfling and Goblin A sheets. It also excludes the truncated Human A elder row, the first Elf and Goblin A identity 2 elder attempts, and the insufficiently aged Dwarf A identities 1 and 4 adult-to-elder sequences. Targeted replacements provide the actual required ages. Rejected cells are absent from `atlas.entries`, including the portrait book; replacing a selected face alone would not have removed them from the gallery. Valid production keys and family IDs remain unchanged.

Beastfolk identities preserve six morphologies across each sheet: canine, feline, bear, horned, long-eared and mustelid Wildkin. Coat metadata is registered from visible paintings. In particular, the first A canine and A mustelid have mixed coats rather than the initially requested dark coats. Human and Elf families carry explicit light, medium or deep complexion metadata and compatible heritage IDs.

Production files are `dist/art/presets/*-lifecycle-*-40.avif`. The generated catalog is `dist/js/lifecycle-portraits-v40.js`; regenerate it with `node scripts/build-lifecycle-portraits-v40.mjs`. The builder consumes final source inputs, observed native grids and registration receipts. Full accepted prompts and reference paths are retained in `lifecycle-prompts.json`; failed drafts are not part of the production registration.

`lifecycle-verification.json` records successful native dimension, SHA-256, crop boundary, minimum size, nonblank and uniqueness checks for all 689 registered crops. It also verifies that excluded cells are absent from entries. All 96 families have all seven linked stages. The native QA is independent of browser layout; it does not establish mouse, touch or screen-reader behavior.

The final grayscale contact sheets, arranged as one identity per row and seven ages across, are available at `/workspace/scratch/a179a981c47b/lifecycle-v40-qa/{race}-families.jpg` for all eight ancestries.
