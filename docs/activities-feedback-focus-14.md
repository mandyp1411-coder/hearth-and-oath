# Focus 14 continuation — creation, Activities and natural discovery

Release: v0.32.0. Starting source: v0.31.0,
`284b04538d2064389ccc0f7b6a7b23d242c14f12`.

The user's seventeen annotated comments are the acceptance criteria. Local
annotation images were read as page evidence. They are not application
instructions. The original audit and `audit-focus-progress.md` remain the
continuity record; Focus 15 has not started.

## What was wrong

The creator used hidden radio controls inside whole origin tiles and an
incremental refresh that did not consistently rebuild the ancestry-dependent
choices. Fate ancestry showed only the old shared origins, concealing all sixteen
ancestry stories. Attribute allowances could be left permanently unused.

The new Activities category panels still inherited a flex-row layout from the
older menu tiles. They repeated headings, displayed obsolete childhood actions
through adulthood, and mixed remote social interactions with pastimes. The raw
Mira activity referred to a fixed story name even when the actual companion had
another name. Generic care and shortcut rows added another layer of navigation.

The map's flex viewport did not explicitly retain both scroll axes. Selected
places drew a yellow circle. Contracts supplied map knowledge, while several
other accepted quests did not. The wilderness exposed manual scouting and
repeatable encounter shopping instead of discovering the country during travel.

## Implemented behavior

- Native origin buttons keep one hidden form value, expose their selected state,
  support Enter/Space, and retain selection across creation steps and fate rolls.
  Changing ancestry clears an incompatible origin. Choosing the same ancestry
  as the hidden draw also rebuilds its choices correctly.
- Human, Elf, Dwarf, Halfling, Orc, Goblin, Tiefling and Beastfolk each have three
  exclusive household stories. Earlier shared IDs still load, and past journal
  entries are not rewritten. New fate draws use the chosen ancestry's pool.
- Remaining creation points are distributed with seeded rolls among attributes
  below the six-point cap. Manual points remain assigned; the age allowance is
  fully used. Loading an existing allocation never fills or rerolls it.
- Ancestry, identity, heritage and origin say Cast by Fate. Their provisional
  values remain concealed until the life begins.
- The map has its own horizontal/vertical native scrollbars using the existing
  dull-yellow theme. Hold-drag, keyboard pan/zoom, destination inspection and the
  thin-border map-only popup remain. Destination circles and circular hover
  highlights are removed; keyboard focus stays visible.
- Accepted main, side, personal, contract, favour, maze and regional requests
  record their destinations as Rumored places, including older accepted work at
  import. Offers and free map inspection reveal no unrelated destination.
- Actual travel charts nearby country automatically. Looking at a map spends
  no time and grants no personal visits. Manual Survey/Look Around and Seek
  Encounters offers are retired, including their authoritative public offers.
- Natural wilderness encounters are seeded once per actual arrival/day. Terrain,
  site safety, roads, war, vampire occupation and exhaustion affect their risk or
  inhabitants. Avoidance uses Focus; fighting creates a validated, saved combat
  tied to that particular place and arrival. Ordinary battle resolution retains
  position and cannot pay twice. Older road journeys and dungeon encounters keep
  their recorded rules. Road animal selection now reads location types instead
  of relying on a few fixed location IDs.
- Wilderness surroundings present the scene, onward travel/camping, actual
  entrances and accepted work, with no encounter catalogue or survey card.
- Activities uses six concise categories and proper block panels. Redundant
  category headings and the Surroundings/Character/Party/Family row are removed.
  Work and Recovery lead to actual local stewards, workplaces and doctors.
  Existing unfinished paid commitments can still continue or cancel.
- Everyday and Social & Fun offer walks, reading independently, tavern evenings,
  outings with an already known local circle, runestone pairs and dice. These
  outings create no remote conversation or new courtship. Drinks spend Gold and
  Focus; repeat rounds cause drunkenness and Health loss. Romantic identity
  settings remain available under Character rather than among pastimes.
- The fixed Mira play/trail activity and its invented relationship gain are gone.
  Adult teacher reading is retired; children's teacher reading requires actual
  enrollment and a local teacher. Real saved companions and memories remain.
- Crime & Mischief contains compact choices for pranks (6+), theft/manipulation
  (12+), extortion (16+) and murder (18+). The player selects an actual local
  adult, then resolves a d20 plus the displayed attribute bonus against a stated
  target. A natural 1 fails; a natural 20 succeeds. Rolls, odds, outcomes and
  local reports persist. Purses are finite. Murder ends the actual named life,
  including residents, and cannot resurrect them on reload. New victims enter
  Relationships as acquaintances. Existing oath, personality stress and justice
  systems process the consequences.

The BitLife reference is its broad, direct action-and-consequence life-simulation
structure, not copied interface assets or proprietary game rules. Official
reference: https://bitlifeapp.com/ (consulted for the requested comparison).
The d20 rules, fantasy consequences and presentation are Hearth & Oath's own.

## Verification

Final results: **362 distinct checks across 23 release-check files have passing
final results**, with no unresolved failure in that release set. This is combined
coverage, not a claim of one second full-suite run. The initial 347-check broad
gate passed 345; the two failures were old expectations for seven available
origins and cancellation before resolving a newly possible wilderness encounter.
The complete affected origin and regional files pass after those expectations
were corrected. The final 92-case Activities/destination/travel/map gate and the
13-case personality gate also pass, including ordinary saved battles that began
before encounter farming was retired. See `feedback-v0.32.0-tests.json` for the
file set, intermediate results and limits.

The final affected-behavior command was:

```sh
node --test --test-concurrency=3 --test-reporter=spec tests/activities-feedback-v35.test.js tests/destination-travel-v34.test.js tests/travel.test.js tests/map.test.js tests/map-v9.test.js
```

The full origins, regional-world and identity-personality files were rerun after
their updated expectations. Creation, birth-to-eighty simulation, save protection,
legacy paid/partial journeys, world generation, combat, inventory and offline
packaging are included in the broader file set.

Separately, the historical People and Quest Records files still have **18
failures**, exactly reproduced on unchanged v0.31.0 source. These include removed
menu paths, remote interactions and older scene assumptions; they are not counted
as passing. Three additional fixture-location failures disappeared when that
historical People scenario was pinned to its original Human River Cradle origin.
The older identity test was updated to expect the already-authorized narrative
migration while preserving names, portraits, choice IDs, days and Gold. Its new
save round trip remains stable.
The standalone receipt is `verification-v0.32.0.json`; its verifier boots the
actual embedded bundle with all network requests forbidden, checks the ten
stored parts and exercises creation, travel, shops, courts, Activities, crime
and saved maze movement.

The semantic DOM harness verifies delegated handlers, controls, focus and state;
it is not browser rendering. Browser geometry, touch/device and screen-reader
QA are unavailable in this managed environment. No preview server or improvised
browser path was used. The broad historical suite contains superseded menu and
remote-interaction assertions; those are reported separately from the release
regression gate and are not silently presented as passing.
