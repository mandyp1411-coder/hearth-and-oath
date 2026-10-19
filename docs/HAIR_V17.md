# Hearth & Oath v0.17 — Hair repair

**Status: withdrawn in v0.17.1.** The user reported that the hair-to-face fitting was worse after this update. The checks below describe the rejected build, not acceptance of its visual quality. Native artwork sheets and geometry assertions did not establish correct fitting in the user's browser. The exact pre-update portrait renderer, source bounds, styles and hair atlases have been restored; the rejected artwork and mesh utilities are archived under `reference-art/rejected-v17/`. The underlying fitting problem remains unresolved.

Verified 11 October 2026.

The rejected v0.17 build used a complete illustration and a continuous vertical mapping. Eight replacement transparent atlases retained the 33 hairstyle identities. Source registration measured the whole hair piece rather than its nominal grid cell. These changes passed the structural checks recorded below, but did not produce acceptable face fitting for the user.

## Findings and fixes

- The former renderer split the same hair image into a compressed crown and a differently stretched tail. The change of scale and two crop boundaries produced awkward joins. A single SVG component now reuses one complete bitmap through a continuous vertical mapping, with shared strip boundaries and antialias overlap.
- Several source drawings crossed nominal grid cells or touched other drawings. New atlas spacing isolates all 33 pieces for each ancestry. Registration measures the entire connected component and a padded silhouette envelope instead of assuming every hair drawing fits a grid cell.
- Shaved styles included pale painted scalp patches that covered the character's own complexion. Human and elf undercuts, shaved bangs, tonsures and mohawks received an additional alpha cleanup. Their base portrait supplies the scalp.
- Fixed scalp polygons and the special enlarged halfling fringe produced hard cuts or covered the face. Those hair-specific CSS and source crops are removed. The illustrated face openings and complete strands provide the shape.
- Generic avatar, save-slot and button SVG rules could override the dimensions of nested hair viewports. Those sizing rules now target direct children, protecting hair inside clickable portraits as well. The same mesh renders in small, large and creation portraits.
- High buns and mohawks could extend above the component frame. Their component overflow remains visible until the entire composition is reframed together. This also protects wide silhouettes and long child hair without moving hair separately from the face.
- Hat and leather-cap crowns could allow buns to protrude. A curved occlusion inside the painted covering tucks the crown beneath it while preserving bangs, side locks and loose lengths. Bandanas and decorative crowns retain their natural overlap.
- Map instances now pass their existing context namespace into the hair definitions. The regression suite caught duplicate SVG identifiers between multiple maps; the corresponding fix passed the original map tests.

## Verification

| Check | Result |
| --- | --- |
| Complete regression suite | 675 passed, zero failures |
| Identity and hairstyle geometry | 13,824 visible pairs checked |
| Replacement hair registration | 264 isolated source pieces across eight ancestries |
| All registered adornment components | 680 found; zero missing pieces or warnings |
| Adult artwork review | 792 native rendered selections: 33 styles × 3 presentations × 8 ancestries |
| Age, heritage and likeness review | 432 native rendered selections across child, adolescent, adult and elder faces |
| Hair with coverings | 240 native rendered selections across six headwear choices and five hairstyles |
| Source JavaScript | 48 modules parsed successfully |
| Standalone game | Inline bundle parsed; all 40 current portrait images matched source bytes |
| Offline download | Five parts reassembled to exactly 34,974,892 bytes |

The artwork sheets use the public `portraitComponents`, `portraitViewport` and actual `renderHairArtwork` functions. The native renderer decodes the selected WebP sprite into an in-memory PNG because its embedded-image loader lacks WebP support. It preserves the same bitmap content, source bounds, mesh and per-face fitting. These sheets assess artwork composition; browser CSS filters, interface interactions and browser performance were not independently exercised during this repair. No browser was available in the Sites environment. Earlier full-life simulation results remain in [AUDIT_V16.md](AUDIT_V16.md).

The cropped-scalp selection uses the chosen bare portrait, and infants retain their illustrated age plates. Age gates, saved hairstyle identities and hair-color filters continue through the existing renderer. The superseded hair sheets are retained in `reference-art/legacy-hair-v16/`.

Offline SHA-256: `fab19f7f7bc44ec969c0d9ef0532253a605e4525930d600f1dd8cb207c2f9000`.

Registration metadata SHA-256: `f15f9e2038c29b69c8d362194fbb985fceb5ea315e33bcfac0190e80175ca135`. See [portrait-parts-v17.json](portrait-parts-v17.json) for component bounds, source rectangles and bitmap hashes.

## Reproducing the checks

```sh
npm test
npm run build
node scripts/register-portrait-parts-v16.mjs > docs/portrait-parts-v17.json
node scripts/render-hair-qa-v17.mjs human /tmp/hair-human.png
node scripts/render-hair-qa-v17.mjs human /tmp/hair-human-ages.png --faces
node scripts/render-hair-qa-v17.mjs human /tmp/hair-human-covers.png --headwear
```

Repeat artwork commands for elf, dwarf, halfling, orc, goblin, tiefling and beastfolk. The optional artwork utilities require Sharp and the native canvas package from the Codex runtime. The shipped game has no package dependencies.

## Artwork production record

Tool: built-in ImageGen, referenced-image editing, `transparent_background: true`. The v0.16 ancestry sheets supplied the style and ordering. Two early repacking experiments were discarded. All eight final ancestry sheets were generated as isolated transparent sprites; human and elf also received targeted alpha-cleanup edits. Sharp encoded the final PNGs to WebP at quality 88 and alpha quality 100 without resizing or painting. The generated originals remain in the image-generation output.

Common repacking prompt:

> Use case: precise-object-edit. Repair this transparent 6x6 RPG hair atlas as a production sprite sheet. The 33 hair designs are good: preserve their exact style order, three-quarter view facing LEFT, antique etched detail and neutral brown colors. REPACK and RESCALE each entire hairstyle to 70% of its former width and height, centred in its own exact equal-size square cell with at least 12% ALPHA-TRANSPARENT GUTTER on all four sides. Absolutely no hairstyles touch or cross into their neighbors. ALL of every hairpiece must be present with finished tapered tips, no horizontal crop at the bottom, no hair entering another slot. Final three slots remain truly empty. Draw ONLY hair. All face, skin, scalp, ears, horns, or head-shaped fill must become genuine alpha transparency. Specifically undercut, mohawk, shaved-side bangs and tonsure must have NO skin-colored patch, no painted head, no copied ear: preserve only strands, stubble and actual hair in those areas. Maintain clear transparent ear/face openings. Heavy bangs cover the forehead and end just above eyes rather than spanning the entire face. Keep the same 33 designs in exact positions; do not change the head direction or add labels, numbers, grid lines, fake checkerboard, clothing or faces. Smaller fully contained sprites with plenty of transparent breathing room are the priority. Output a true RGBA transparent square 6x6 hair atlas, every item entirely isolated.

Ancestry-specific constraints retained the matching profile and hair texture. For tiefling and beastfolk, horn, ear and muzzle paint was excluded from the hair layers. Human, elf and orc instructions also emphasized keeping scalp and ear pigment transparent.

Human and elf alpha-cleanup prompt:

> Use case: precise-object-edit. Surgical ALPHA cleanup of this transparent 6x6 hair atlas. Keep every hair strand, all 33 hairstyles, colors, exact positions, exact size and spacing UNCHANGED. Do not repack, scale or redraw the hair. REMOVE ONLY the light cream/gray SKIN/SCALP fills inside five specific sprites, replacing every bit of flesh with TRUE alpha transparency. Row1 column6: close-cropped scalp. Row2 column3: undercut, light patch beside the swept hair and above the ear opening. Row4 column2: shaved-side broken bangs, pale scalp patch on right side. Row5 column3: monastic tonsure, light bald oval above fringe. Row5 column6: mohawk, light shaved-scalp side. The shaved parts MUST be empty transparent holes because another image supplies the character's own skin color. NO flesh colors remain in these five areas. Preserve the strands bordering the holes so their hairline edges stay natural and antialiased. The rest of the atlas is IDENTICAL: every other cell, all curls, braids, bangs and ponytails, three empty final slots, alpha background and original illustration details remain untouched. Output the corrected transparent atlas with no text or checkerboard.

Final generated PNG identifiers:

- dwarf: `exec-b065b9d1-dd32-4b73-ab46-3aed4140de92.png`
- halfling: `exec-0ca6ce41-ea34-4eae-9bdc-e7fa705a06e7.png`
- goblin: `exec-427a06d1-11bc-4066-8715-cf8adac54692.png`
- tiefling: `exec-61f32911-eee8-450b-a89a-893ea21836d6.png`
- beastfolk: `exec-a94e7449-73cd-47cc-bacd-d36205148381.png`
- human: `exec-30426c06-adb2-46ff-a2c6-1468c18bafa0.png`
- elf: `exec-454c4b07-1e0a-4d4a-912e-4ea9365dba61.png`
- orc: `exec-2064a20c-7987-4110-b3b2-535a5b7d08b3.png`

Production assets and hashes:

| Output | SHA-256 |
| --- | --- |
| `dist/art/portraits/hair-human-v17.webp` | `daf9bee5a39bcc7df7c9cdd5bd93849eae75bfb1691d5f2d23a25ef0bc610240` |
| `dist/art/portraits/hair-elf-v17.webp` | `5e53b88701b8f7b6b02449897163d4ffc0c81e828a894b586894ebd9e0f396e2` |
| `dist/art/portraits/hair-dwarf-v17.webp` | `6000a19eb72c948251eb181596cfcfd2c6ba8226a551a0820c25bc275f3b4215` |
| `dist/art/portraits/hair-halfling-v17.webp` | `2aee4f236bc9e863d34fba59529a76928ba297ba072b9b6b0d3c3bf317998631` |
| `dist/art/portraits/hair-orc-v17.webp` | `0a6b8bc831d9906f746c0fb4a09c4160a9fc277df4715128f68770cef4cd90dc` |
| `dist/art/portraits/hair-goblin-v17.webp` | `662336cd9238601b32200c178877ee9eddf24100a63087a00d5c8e9c72e9e49c` |
| `dist/art/portraits/hair-tiefling-v17.webp` | `59764be55ff9f97ffc7fa1fcf4f80bffa501e44813f0c25c4cea609a6db5c06e` |
| `dist/art/portraits/hair-beastfolk-v17.webp` | `b16547b61eb9d34cf4f95c43a327e1c7b1fe926e0a6df1916266ae2dce4dea43` |

