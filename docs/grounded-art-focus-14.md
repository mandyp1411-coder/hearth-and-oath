# Grounded portraits, equipment and enemies — v0.34.0

This continues focus 14. Focus 15 remains unstarted.

The requested direction is a believable medieval low-fantasy world: weathered
faces, practical clothes and equipment, restrained creature anatomy, graphite
etching and charcoal shading. The shared muted bone/yellow-gray treatment stays
in place across creation, relationships, combat, inventory and situated shops.

## People and aging

The old adult stage covered ages 18–64. The portrait book now distinguishes
Adult (18–39), Mature (40–54), Older (55–64) and Elder (65+), alongside the three
existing childhood stages. There are 878 additional people portraits: 216 linked
four-age identities and 14 additional elder faces. All eight ancestries gain
adult, middle-age, older and elder artwork. Beastfolk retain their six animal
lineages and all 44 known presentation/coat/species cohorts.

New NPCs draw from both established and new complete families. Existing saved
adults gain deterministic compatible middle-age illustrations without rewriting
their chosen faces, names or earlier history. Heritage and observed complexion,
coat and animal form are kept. Older unlinked portraits were never painted as
exact identity sequences; their bridge matches those traits, rather than claiming
every original face has been individually repainted. New sequences keep the same
illustrated identity through their four adult ages.

Portrait selection preserves earlier age choices. Mortal age sequences and
transformation sheets use separate family indexing. Three blurred transformation
sheets are replaced in active rendering with 192 faithful etched redraws;
logical family/form IDs and original registration evidence remain addressable.
The audit found the other baseline portraits consistent after the existing
desaturation filter, so they remain available.

## Inventory and enemies

Two new inventory atlases provide 128 illustrations. All 44 real gear catalog
entries have distinct art, including individual rings, cloaks, gloves, armor and
weapons; found/crafted equipment inherits its base artwork. Supplies, carried
loot, food, medicine and three sizes of camping kit have recognizable art, shared
by equipment slots, Inventory, item details and merchant trading. Native crops
remove the grid strokes and correct lower-row drift.

Six enemy atlases add 384 paintings: eight variants for each of 40 additional
ordinary species, plus eight additional variants for each established boss.
New species use suitable terrain pools and executable combat plans. Ordinary
encounters cannot randomly substitute a boss. Existing saved enemy IDs/cells and
named contract targets retain their meanings. Creature labels are capitalized
throughout combat, while personal names and saved history remain intact.

## Production and verification records

- `art-v39/prompts.json`: production prompts and source references.
- `art-v39/registration.json`: finished asset dimensions, sizes and hashes.
- `art-v39/observed-grids.json`: independently inspected portrait/curse boundaries
  and phenotype metadata. Incomplete tall sheets use their actual seven rows;
  separately illustrated elder supplements complete the affected identities.
- `art-v39/foe-grids.json` and `inventory-grids.json`: measured creature and item
  crops, including nonuniform rows.
- `art-v39/verification.json`: encoded pixel checks for every new/replaced crop.
- `feedback-v0.34.0-tests.json` and `verification-v0.34.0.json`: release regression
  gate and actual self-contained game integration.

The source art was created or faithfully redrawn with the image-generation
workflow, then mechanically encoded and registered at its measured native
bounds. No recoloring or hand-drawn replacement faces were added during packing.
Visual review covers finished artwork, identity/age ordering and thumbnail
legibility. Semantic DOM integration verifies the actual embedded game with
network requests forbidden; browser geometry, touch/device and screen-reader QA
remain unavailable in this managed workspace.
