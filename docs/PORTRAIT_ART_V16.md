# Portrait artwork — v0.16

Hearth & Oath now uses 40 v16 portrait atlases: five for each of eight ancestries. The renderer exposes **504 illustrated identities**: 216 adult faces and 288 age portraits. These counts describe unique source-image cells, not recolored copies made with complexion filters.

Adult portraits have three heritages, three presentations, and three likenesses for each ancestry. Infants, children, adolescents, and elders each have three heritages and three presentations. Hair, coverings, beards, and accessories are authored per ancestry, then moved and scaled with measured registration for the selected face. The same ancestry's adornment artwork serves its multiple faces; these overlays were not individually redrawn for all 504 faces.

## Asset manifest

All paths below are under `dist/art/portraits/`. The authoritative runtime manifest is `dist/js/portrait-art.js`.

| Ancestry | Adult faces | Age faces | Hair | Coverings | Beard and accessories |
|---|---|---|---|---|---|
| Human | `faces-human-v16.webp` | `ages-human-v16.webp` | `hair-human-v16.webp` | `covers-human-v16.webp` | `details-human-v16.webp` |
| Elf | `faces-elf-v16.webp` | `ages-elf-v16.webp` | `hair-elf-v16.webp` | `covers-elf-v16.webp` | `details-elf-v16.webp` |
| Dwarf | `faces-dwarf-v16.webp` | `ages-dwarf-v16.webp` | `hair-dwarf-v16.webp` | `covers-dwarf-v16.webp` | `details-dwarf-v16.webp` |
| Halfling | `faces-halfling-v16.webp` | `ages-halfling-v16.webp` | `hair-halfling-v16.webp` | `covers-halfling-v16.webp` | `details-halfling-v16.webp` |
| Orc | `faces-orc-v16.webp` | `ages-orc-v16.webp` | `hair-orc-v16.webp` | `covers-orc-v16.webp` | `details-orc-v16.webp` |
| Goblin | `faces-goblin-v16.webp` | `ages-goblin-v16.webp` | `hair-goblin-v16.webp` | `covers-goblin-v16.webp` | `details-goblin-v16.webp` |
| Tiefling | `faces-tiefling-v16.webp` | `ages-tiefling-v16.webp` | `hair-tiefling-v16.webp` | `covers-tiefling-v16.webp` | `details-tiefling-v16.webp` |
| Beastfolk | `faces-beastfolk-v16.webp` | `ages-beastfolk-v16.webp` | `hair-beastfolk-v16.webp` | `covers-beastfolk-v16.webp` | `details-beastfolk-v16.webp` |

## Production contract

All new artwork was generated or corrected with the built-in `image_gen` capability. Calls supplied a prompt, local reference-image paths when applicable, and the transparency flag. Hair, covering, and detail generation used `transparent_background: true`; complete face and age sheets used `false`. Resolution was requested in the prompt rather than with an unsupported size argument. The generation prompts used the existing art or newly generated ancestry face atlas as a visual and fitting reference. PNG output was converted to WebP with Pillow; that step compresses the supplied artwork and preserves alpha rather than painting faces or inventing extra layers. The game requires no image-generation service at runtime.

The common contract was a grave, hand-engraved fantasy-manual appearance: dense ink etching and crosshatching, subdued natural pigments, a charcoal `#10110f` background for complete faces, and genuine transparent alpha for separate wearable parts. Faces turn left in three-quarter view. The prompts exclude cartoon, anime, glossy rendering, labels, gutters, and visible grid lines. Faces are bald and clean-shaven so their own facial anatomy and heritage pigment remain visible below the chosen hair and covering.

The human/elf prompts used this exact shared style and layout instruction:

```text
Dense old fantasy RPG black ink engraving, dark charcoal background, muted natural pallid/bronze/deep brown heritage pigments. Uniform left-facing three-quarter portrait. Every head a distinct person, not copies tinted. No cute cartoon, anime, polished digital painting, text, watermark or labels. Exact six columns by six rows, equal square cells, no gaps borders gridlines.
```

The following is an exact representative production-prompt passage from the tiefling face atlas. Ancestry anatomy and intended landmarks varied across packs; the measured output geometry, rather than these requested coordinates, determines runtime placement.

```text
Use case: stylized-concept. Production asset: a square 6-column by 6-row sprite atlas, exactly 36 evenly sized square cells edge to edge, no gutters, borders, labels or text. Create complete BALD TIEFLING portraits for a grim old-school RPG. Each cell is an austere, believable three-quarter head-and-shoulders face turned LEFT. Dense hand-engraved ink, etching and crosshatching, worn old fantasy manual, charcoal #10110f backdrop, subdued pigments, no glossy rendering, no cartoon, no anime. They have modest short backward-angled horns and subtle fantastical ear shapes, otherwise convincing human faces. Horns stay beside the temples, leaving the central crown clear for fitted hair overlays. All portraits have visible faces and identical registered camera framing; bald head crown at x56% y16%, forehead x39% y28%, nearer eye x40% y39%, nose tip x29% y51%, mouth x37% y62%, chin x46% y73%, visible ear x73% y45%; robe shoulders below y85%. Within this fixed frame vary actual facial anatomy, noses, eye shapes, lips and age lines; NO identical face recoloring.
```

Ancestry additions preserve recognizable anatomy: elves have pointed ears; dwarves have broad noses and jaws; halfling adults retain adult proportions with softer, attentive features; orcs have broader jaws and lower tusks; goblins have narrow angular faces and longer pointed ears; tieflings have modest temple horns; beastfolk have actual wolf muzzles and pointed ears. These visual traits do not assign moral alignment or statistics.

### Adult atlas order

Adult atlases use a six-column, six-row grid in row-major order. `M`, `F`, and `A` mean masculine, feminine, and androgynous presentation. Each adult presentation has likenesses I, II, and III.

| Row | Cells | Ordered content |
|---|---|---|
| 1 | 0–5 | Ashlands M I, II, III; Ashlands F I, II, III |
| 2 | 6–11 | Ashlands A I, II, III; Sunlands M I, II, III |
| 3 | 12–17 | Sunlands F I, II, III; Sunlands A I, II, III |
| 4 | 18–23 | Sable Coast M I, II, III; Sable Coast F I, II, III |
| 5 | 24–29 | Sable Coast A I, II, III; child examples M, F, A |
| 6 | 30–35 | Adolescent examples M, F, A; elder examples M, F, A |

Runtime adult selection uses cells **0–26** only. The final nine examples remain in the source sheet; the dedicated age atlas supplies the runtime portraits for those stages. Across eight ancestries, 27 adult cells each produce 216 selectable adult identities.

### Age atlas order

Dedicated age atlases also use a six-column, six-row grid. Every stage has one illustrated likeness for each heritage and presentation. The reference ages in the art prompts were infancy 0–2, child 6, adolescent 14, and elder 70. Gameplay uses infancy below 3, childhood from 3–9, adolescence from 10–17, adulthood from 18–64, and elder portraits from 65 onward.

| Row | Cells | Ordered content |
|---|---|---|
| 1 | 0–5 | Infant Ashlands M, F, A; infant Sunlands M, F, A |
| 2 | 6–11 | Infant Sable Coast M, F, A; child Ashlands M, F, A |
| 3 | 12–17 | Child Sunlands M, F, A; child Sable Coast M, F, A |
| 4 | 18–23 | Adolescent Ashlands M, F, A; adolescent Sunlands M, F, A |
| 5 | 24–29 | Adolescent Sable Coast M, F, A; elder Ashlands M, F, A |
| 6 | 30–35 | Elder Sunlands M, F, A; elder Sable Coast M, F, A |

This adds 36 used age cells per ancestry, or 288 age portraits. Infant prompts require a large cranium, round cheeks, small nose, and short jaw rather than a miniature adult. A targeted dwarf correction softened the first nine infant heads while preserving heritage pigments and the other 27 cells. Species traits develop with age: small horn buds or tiny tusks in young children, and juvenile wolf muzzles in beastfolk.

### Hair atlas order

Each ancestry has 33 hairstyle selections. The six-column, six-row hair atlas uses the exact `hairStyle` option order in `AVATAR_OPTIONS`; its final three cells are unused transparent slots. Close cropped is rendered with the uncovered base scalp rather than an opaque scalp patch from the overlay.

| Row | Cells | Ordered styles |
|---|---|---|
| 1 | 0–5 | Rugged short cut; tangled shoulder cut; tied back; unruly curls; twin braids; close cropped |
| 2 | 6–11 | Long and flowing; chopped crop; side undercut; high bun; locs; rounded coils |
| 3 | 12–17 | Braided crown; rough side part; jagged bangs; uneven blunt fringe; long with heavy bangs; uneven brush crop |
| 4 | 18–23 | Heavy brow fringe; broken bangs and shaved side; wavy forelock; long widow’s peak; wild matted locks; double rope braids |
| 5 | 24–29 | Fishtail braid; windswept shag; monastic tonsure; short tight curls; half knot and fringe; rugged mohawk |
| 6 | 30–35 | Locks across one eye; ragged pageboy; long war braids; empty; empty; empty |

Hair-generation prompts require transparent face and ear openings, with only actual hair painted. Skin, scalp, copied ears, horns, and facial fur belong to the base portrait. Targeted image-generation corrections removed unwanted biological patches. The following exact cleanup prompt records that contract:

```text
Use case: precise-object-edit. Edit this transparent 6×6 hair sprite atlas. Keep EVERY hairstyle, all strands, shadows, colors, exact positions, exact cell grid and all three final empty cells UNCHANGED. Make only one surgical cleanup: remove any attached painted SKIN, SCALP, ears, horn fragments or face fur from every hair piece, replacing those unwanted patches with real ALPHA TRANSPARENCY. In particular side-undercut, shaved side/broken bangs, monastic tonsure, close-cropped and mohawk currently include solid grey/tan scalp regions — ALL such skin/scalp becomes transparent, while individual dark hair stubble/strands remain. On close-cropped style retain hair strands only, no skin-colored fill. Ear holes stay transparent; do not draw the head beneath hair. Preserve short hair pixels, do not redesign or reposition any item. Keep original resolution and composition, true transparent alpha background, no checkerboard painting, no labels, no new hair. Hair pixels ONLY.
```

The renderer also applies explicit scalp-hole clipping to the remaining human and elf undercut, shaved-side, mohawk, and human tonsure areas. This exposes the selected face's actual complexion rather than laying a differently colored scalp over it.

### Headwear and mask atlas order

Each ancestry's covering atlas has six columns and seven rows. The first 25 cells are headwear; the next 11 are masks and face wraps. The final six cells are unused transparent slots. `None` is a control choice with no sprite.

| Row | Cells | Ordered coverings |
|---|---|---|
| 1 | 0–5 | Closed iron helm; bone votive mask; mourning veil; linen blindfold; deep pilgrim cowl; battered kettle helm |
| 2 | 6–11 | Worn mail coif; leather beak mask; lower-face wrap; wool hood; bramble headdress; crooked broad-brim hat |
| 3 | 12–17 | Carved wooden mask; bone-trimmed hood; battered open sallet; open nasal helm; pointed bascinet; closed knight visor |
| 4 | 18–23 | Stitched leather cap; low wizard hat; chainmail face veil; frayed pilgrim hood; ragged bandana; horned iron helm |
| 5 | 24–29 | Wicker cage hood; bone face mask; wood face mask; plague face mask; lower-face scarf; plain blindfold |
| 6 | 30–35 | Mourning face veil; copper death mask; rune blindfold; raven skull mask; moth-eaten funeral veil; iron half mask |
| 7 | 36–41 | Empty; empty; empty; empty; empty; empty |

Coverings are requested as wearable materials with transparent openings, not a second head. Wolf-shaped masks and helmets accommodate beastfolk muzzles and ears. Tiefling pieces allow horns. Closed helmets take precedence over a selected face mask and conceal incompatible beard and eye-accessory layers; the saved cosmetic selections remain intact.

### Beard and accessory atlas order

Each ancestry has a four-column, four-row detail atlas: eight beard styles and eight raster accessories. The ribbon is a small SVG marking, making nine non-empty accessory choices in the controls.

| Row | Cells | Ordered details |
|---|---|---|
| 1 | 0–3 | Rough beard; tangled long beard; forked beard; braided beard |
| 2 | 4–7 | Coarse stubble; pointed goatee; heavy moustache; drooping moustache |
| 3 | 8–11 | Bronze circlet; round spectacles; silver earring; lantern amulet |
| 4 | 12–15 | Wildflower; raven feather; leather eyepatch; bronze ear cuff |

The prompts require hair or wearable material alone, with transparent mouth, tusk, and ear gaps. Biological skin, lips, ears, noses, teeth, and necks are supplied by the face layer. Separate corrections removed retained tusks, skin, copied ear anatomy, and unwanted beard material from moustache-only pieces. Beard, moustache, eyepatch, glasses, temple adornments, and collar amulet use separate placement profiles.

## Conversion and fitting metadata

| Pack | PNG-to-WebP conversion |
|---|---|
| Human / elf | Pillow WebP, quality 94, method 4 by default. Human faces and hair used quality 94/method 6; human covers and details used quality 93/method 4. Human ages and every elf sheet used quality 94/method 4. No resizing, cropping, or repainting. |
| Dwarf / halfling | Pillow WebP, quality 96, method 6; RGBA preserved. |
| Orc / goblin | Pillow WebP, quality 94 or 95, method 6; conversion only. |
| Tiefling / beastfolk | Pillow WebP, quality 94, `exact=True`; initial face conversions used method 6 and final overlays used method 4. |

Generative atlas packing can drift slightly or leave pixels from an adjacent piece near a boundary. Two read-only analysis scripts produce runtime metadata without rewriting the bitmaps:

- `scripts/register-portrait-art-v16.mjs` measures all 576 cells in the 16 adult/age sheets. It records the skull crown and upper-head span, each source hash, and offsets relative to frame 0 of the same ancestry. Failed scans use a conservative reference; width multipliers and offsets have bounded limits. Mouth coordinates are explicitly labeled placement references, not measured lips or irises. Its outputs are `dist/js/portrait-registration.js` and `docs/portrait-registration-v16.json`.
- `scripts/register-portrait-parts-v16.mjs` measures the primary connected alpha component of each used hair, cover, and detail cell. It writes `dist/js/portrait-part-bounds.js`, allowing source cropping to discard neighboring-cell fragments while preserving antialiased edges.

The produced detail sheets have some unequal row boundaries, so piece-specific source cropping and visual review are needed in addition to the intended grid contract. The generation tool also retained a few scalp planes despite the alpha instructions; explicit human/elf scalp-hole masks address those areas. Requested prompt landmarks and equal-cell instructions should not be treated as proof of the generated pixel layout.

`portraitComponents()` supplies the same fitted components to game rendering and native-canvas artwork review. Hair crown and shoulder-length tails use separate vertical placement; hats, beards, and accessories have their own profiles, with per-face registration applied to adornments. The face bitmap itself is not stretched. Legacy `skin`, `face`, and `portraitFace` values remain canonical save data but do not recolor or distort the selected new heritage portrait.

Regenerate metadata after replacing source art:

```sh
node scripts/register-portrait-art-v16.mjs
node scripts/register-portrait-parts-v16.mjs
```

The face-registration command refuses incomplete production input by default. `--allow-missing` exists only for interim work. A completed registry records all 16 sheets and their source hashes.

## Validation scope

The final focused run passed **61 automated tests** with no failures or skips. It covered 504 unique runtime source/cell identities, all ancestry and presentation combinations, age-specific selection, inherited heritage, old canonical-save migration, race-specific parts, covering precedence, character-creation handlers, and source-hash integrity. The part-registration checks also validate all 680 source crops, all 416 covering/detail hulls, 24 part-art hashes, the exact generated metadata hash, and the public components' actual rendered image percentages, clips, and transforms. The full game audit is documented separately in `AUDIT_V16.md`.

Pixel-registration checks and native-canvas contact sheets support artwork fitting review. The automated mapping tests verify selection and geometry contracts; they do not establish that every possible combination is artistically perfect or substitute for browser layout checks.
