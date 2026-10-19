# Portrait art v0.14

Two new original atlases generated with the built-in ImageGen tool. No API key, CLI fallback, runtime/CSS edits, commit, push, or publication was performed for this asset task.

## Assets

| Asset | Canvas | Layout | Purpose |
| --- | --- | --- | --- |
| `dist/art/portraits/elders-v14.webp` | 1254 × 1254 | 4 × 4 | Clearly aged elder heads |
| `dist/art/portraits/children-alt-v14.webp` | 1254 × 1254 | 4 × 4 | Alternate age-seven faces |

Both use flat near-black cells, bald humanoid heads, plain dark collars, left-facing three-quarter registration, and bone/charcoal dry engraving with dusty parchment undertones. Wolves retain facial fur. WebP was encoded at quality 94 with Pillow; conversion/resize only, no manual painted image editing.

## Cell mapping

Cells are row-major. Zero-based index:

| Index | Ancestry | Presentation |
| --- | --- | --- |
| 0 | Human | Masculine |
| 1 | Human | Feminine |
| 2 | Elf | Masculine |
| 3 | Elf | Feminine |
| 4 | Dwarf | Masculine |
| 5 | Dwarf | Feminine |
| 6 | Halfling | Masculine |
| 7 | Halfling | Feminine |
| 8 | Orc | Masculine |
| 9 | Orc | Feminine |
| 10 | Goblin | Masculine |
| 11 | Goblin | Feminine |
| 12 | Tiefling | Masculine |
| 13 | Tiefling | Feminine |
| 14 | Wolf beastfolk | Masculine |
| 15 | Wolf beastfolk | Feminine |

## References and retained sources

Style reference inspected: `dist/art/portraits/kin-v12.webp`.
Registration and cell-order reference inspected: `dist/art/portraits/children-v13.webp`.

Source PNGs are retained unchanged:

- Elder first pass (discarded because dwarf masculine had tusks): `/workspace/scratch/f1931ac2a2c5/generated_images/exec-5fb9efb8-e5e7-4c8f-aa1c-e5a3f99c8fe0.png`
- Elder corrected selected source: `/workspace/scratch/f1931ac2a2c5/generated_images/exec-9b06c91d-0dab-4853-8ade-729b01ee4567.png`
- Alternate children selected source: `/workspace/scratch/f1931ac2a2c5/generated_images/exec-3d8b0122-94cb-43d9-b07d-747c47ce1b2d.png`

## Visual QA

- Inspected references before generation and both selected full atlases after generation.
- Confirmed exactly 16 equal cells, requested order, three-quarter left-facing heads, consistent skull scale and collar placement, no text, frame, headwear, humanoid hair or beards.
- Elder faces have forehead and eye wrinkles, sagging cheeks, tired expressions and age spots. Orc tusks, goblin hooked noses, elf ears, small tiefling horns and wolf heads remain distinct.
- The first elder output mistakenly added orc tusks to dwarf masculine. A targeted ImageGen correction removed these; the selected elder atlas has a closed natural dwarf mouth while both orcs retain tusks.
- Alternate children use shorter noses, softer rounder cheeks/chins and changed small-mouth shapes compared with v13, without cartoon simplification, aged wrinkles, adult scars or sexualized attributes.
- Composed all 32 selected child/elder cells with existing hair, beards where age-appropriate, and soft hoods using the game's registered transformations and clip shapes. The new plates align with the established overlays. This raster composition check is not a browser rendering claim.
- The composition review found that human-shaped hood openings concealed wolf muzzles. The runtime CSS now opens the left edge of the four cloth hoods for wolf beastfolk and lycanthropes. Reviewed corrected cowl, wool hood, bone-trimmed hood, and frayed hood compositions against the previous crops; the muzzle remains visible.
- Saved canvases verified as 1254 × 1254 RGB WebP.

## Elder generation prompt

```text
Use case: stylized-concept.
Asset type: a square 4-column by 4-row registered portrait atlas for the original dark fantasy life simulation RPG Hearth & Oath.
Input images: Image 1, kin-v12.webp, is only a reference for traditional bone-and-charcoal engraving texture and grim plain collar; its ancestry order must NOT be copied. Image 2, children-v13.webp, is the exact layout, head angle, head placement and per-cell anatomy registration reference.
Primary request: create a NEW atlas of EXACTLY sixteen ELDERS, visibly old and distinct ancestral anatomy. Each portrait is bald except fur of wolf beastfolk, has no hairstyle, no beard, no accessory and wears only a dark simple cloth collar. Keep the same left-facing three-quarter head angle, registered skull scale and position as Image 2, consistent in all cells: head top near cell top, shoulders along bottom edge, nose points left, eyes, temples, ear and chin aligned to the reference. These are naturalistic elderly faces with aged craggy wrinkles, sagging cheeks, tired gentle or stern eyes, age spots and a visibly old bald scalp. Do not depict young adults with a texture filter.
EXACT row-major cell order:
Row 1: elderly human masculine, elderly human feminine, elderly elf masculine, elderly elf feminine.
Row 2: elderly dwarf masculine, elderly dwarf feminine, elderly halfling masculine, elderly halfling feminine.
Row 3: elderly orc masculine, elderly orc feminine, elderly goblin masculine, elderly goblin feminine.
Row 4: elderly tiefling masculine, elderly tiefling feminine, elderly wolf beastfolk masculine, elderly wolf beastfolk feminine.
Ancestry distinctions: human normal ears; elf elegant elongated outward pointed ears and long refined aged face; dwarf strong broad brows and stout broad face without beard; halfling smaller rounder gentle face with naturally aged rounded cheeks; orc broad jaw, broad nose, pointed ears, two small blunt lower tusks; goblin narrower angular face and prominent hook nose with sharply pointed ears; tiefling humanoid face with a matched pair of two SMALL skull horns near top, no large antlers; wolf beastfolk entirely anthro wolf head with wolf muzzle, upright wolf ears and naturally graying coarse facial fur, not a human in a costume.
Style/medium: match provided original artwork: finely scratched nineteenth-century wood engraving and dry crosshatching, stark bone and charcoal ink with sparse dusty parchment undertones, gritty old-school fantasy portrait art. Natural face anatomy, neutral weary expressions, painterly engraving, not cartoon. Flat near-pitch-black backgrounds, no gradients.
Composition constraints: an EXACT rigid 4x4 equal-cell square atlas, no external margin, no gutters, no visible grid, no frames, no text, no numbering, no logos, no watermarks. Each head fully contained in its own cell, never overlaps an adjacent cell. Head and collar composition carefully registered like Image 2 for a game that overlays separately drawn hair and headgear.
Avoid: copied portrait identities, hair/stubble/beards on humanoids, headwear, jewelry, dramatic expression, side-profile, front view, glossy rendering, bright colors, adult scars copied from Image 1, non-elder age, extra cells.
```

## Targeted elder correction prompt

```text
Use case: precise-object-edit. Edit target: the first image, a 4x4 sixteen-elder engraving portrait atlas. Supporting reference: second image, children-v13.webp, shows correct ancestry order and dwarf anatomy.
Make ONLY ONE precise change to the first image: in ROW 2 COLUMN 1 (zero-based cell index 4), the elder DWARF MASCULINE portrait currently incorrectly has two orc tusks. Remove those two tusks completely and render a natural closed humanlike mouth with thin elderly lips. Preserve that dwarf's broad stout wrinkled elderly face, broad nose, brows, head scale, head position, bald scalp, plain dark collar, matching scratch engraving texture, and original flat black background.
Do not change any other cell or any other part of the atlas. There must still be exactly 4 columns and 4 rows, the same square canvas and same registered head crop. In particular row 3 column 1 and row 3 column 2 are ORCS and MUST retain their small lower tusks. Row 4 tieflings must keep small horns; wolf cells must stay wolf heads. No new text, no frames, no margin, no watermark.
```

## Alternate children generation prompt

```text
Use case: stylized-concept.
Asset type: NEW square 4-column by 4-row registered portrait atlas for Hearth & Oath.
Input images: Image 1, kin-v12.webp, gives the bone-and-charcoal dry ink engraving style only; disregard its ancestry order and all adult facial proportions. Image 2, children-v13.webp, gives the exact 4x4 registration, bald head placement, plain dark collar, left-facing three-quarter angle, and the required ancestry cell order.
Primary request: create exactly sixteen DIFFERENT NEW CHILD CHARACTERS around age SEVEN. This is a distinct alternative face set, not a retexture of Image 2. Change their facial proportions visibly: rounder smaller chins, broader soft child cheeks, shorter button-like noses appropriate to ancestry, subtly spaced eyes and varied natural small mouths; no faces copied from the references. Warm but subdued neutral natural expressions. Bald humanoid scalp, no hair, no beard, no stubble, no headwear. Wolf beastfolk have normal naturally short coarse facial fur. These should clearly read as children, not small adults.
Preserve identical registered skull position and portrait scale for an existing layered hair/headgear system: forehead/scalp top near cell top, eyes, temples, ears and collar at approximately the reference positions; do not change the angle, crop or canvas. A slight child-specific jaw shape is desirable.
EXACT row-major cell order:
Row 1: human boy, human girl, elf boy, elf girl.
Row 2: dwarf boy, dwarf girl, halfling boy, halfling girl.
Row 3: orc boy, orc girl, goblin boy, goblin girl.
Row 4: tiefling boy, tiefling girl, wolf beastfolk boy, wolf beastfolk girl.
Distinct ancestry anatomy: human rounded normal ears; elf short refined youthful face with long pointed ears; dwarf broad squat child face and strong little brows WITHOUT tusks or beard; halfling extra-rounded cheerful but subdued small face WITHOUT tusks; orc broad nose and face with exactly two small blunt lower tusks; goblin narrow youthful angular face and hooked nose with pointed ears and NO tusks; tiefling normal youthful humanoid face, round ears and a pair of small horn buds from the scalp; wolf beastfolk fully anthro youthful wolf face with a short muzzle and upright wolf ears, visibly wolf children, no human costume.
Style/medium: natural gritty child realism in fine scratched wood engraving, dry crosshatching and stipple; bone and charcoal with sparse dusty parchment tones, match references. Avoid cute cartoon simplification, avoid photographic gloss, avoid adult scars, wrinkles or aged complexions. Every child safely fully clothed in a dark plain collar and shoulders. No sexualized attributes of any kind.
Layout constraints: rigid EXACTLY 4x4 equal-cell square atlas, each portrait wholly contained in one cell, no external margins, no gutters, no frames, no visible grid, no labels, no text, no numbering, no logos, no watermark. Flat pitch-dark backgrounds identical throughout. Same left-facing three-quarter head orientation throughout. Do NOT reuse exact adult/child reference identities.
```

