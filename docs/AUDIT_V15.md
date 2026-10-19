# Hearth & Oath — v0.15 creation and age-start verification

Completed October 11, 2026. **128 distinct randomized starts and their first subsequent year passed. All 642 regression checks passed.** These are automated game-engine and interface-handler checks, not manual browser playthroughs or another set of 128 complete lifetimes. The prior [170 complete-life audit](AUDIT_V14.md) remains separate.

## Changes

Creation now has two chapters, Beginning and Portrait. The only choices are origin, appearance, and age. The age slider stays beside the portrait on both screens, from birth to 80, defaulting to 18. Dragging it updates the face, age description, and available portrait controls without replacing the focused slider.

The origins are Hearthborn, Roadborn, Shrine foundling, Exile, and Fallen house. Cast by fate chooses among them. Origins set a coherent story context; independent random rolls choose the actual birthplace, family, means, name, temperament, beliefs, and tastes. Creation no longer exposes household means, upbringing, world seed, personality, difficulty, preference forms, body costumes, gear, or starting items. Combat identity and moral direction remain open to later actions.

Portraits now contain actual raster image elements inside a frame with an explicit square size. The face is uncovered by default; random portrait rolls keep it uncovered unless the player has deliberately locked a covering. Existing engraved artwork supplies all eight ancestries across infancy, childhood, adolescence, adulthood, and elderhood. Weathering appears from 40, hair begins silvering from 50, and dedicated elder faces appear from 65. Saved likeness is independent of equipped weapons and armor.

| Age | Customization |
| --- | --- |
| 0–2 | Infant artwork; ancestry, presentation, complexion, eyes, and fitting features. Hair, headwear, accessories, masks, beards, and permanent markings are locked. |
| 3–9 | Child artwork and alternate child likenesses; hair and soft headwear become available. |
| 10–15 | Adolescent artwork; hair and soft headwear remain available. |
| 16–17 | Helmets, heavier coverings, masks, and face wraps open. Adult facial hair and permanent markings remain locked. |
| 18–64 | Adult facial structure, beards, scars, and ink become available. |
| 65–80 | Elder artwork, silvering hair, and the same adult cosmetics. The age-specific face plate replaces the adult likeness picker. |

These restrictions also apply to the in-game appearance editor. Moving a new draft back to a younger age removes unavailable adornments, so it cannot secretly carry a previously selected adult beard or mask into childhood. Older imported saves retain their stored appearance and render only details appropriate to their current age.

## Starting later

Earlier years are generated through actual birthday decisions, school enrollment and attendance, age-appropriate interests, work, professional practice, family time, care, and calendar interruptions. Earnings and skills come from those actions. The new character arrives on the selected birthday with a valid absolute date, remembered earlier years, actual relatives, education, and any earned livelihood. That birthday remains a waiting player decision.

An elder is generated as someone who has survived to the opening age, using the same minimum prospective lifespan rule as a newly generated adult heir. This prevents selecting 80 only to arrive as someone already dead. The generator does not grant a combat calling, decide the campaign ending, or choose starting equipment for the player.

Generation yields regularly to update progress. Leaving creation cancels the unfinished life. A replacement save is written only when the complete new life is ready; abandoning creation keeps the previous slot intact.

## Results

| Check | Result |
| --- | ---: |
| Distinct openings / failed final openings | **128 / 0** |
| First subsequent years completed | **128** |
| Player-controlled public transitions after opening | 408 |
| Starting ages tested | 18 values spanning 0–80 |
| Origins / ancestries | 5 / 8 |
| Actual birthplaces / family setups | 12 / 4 |
| Livelihoods, including flexible local labor | 13 |
| Distinct generated names | 128 |
| Distinct sampled age-and-ancestry portrait cells | 68 |
| Regression checks | **642 passed; 0 failed** |

The ages were 0, 1, 2, 3, 5, 6, 9, 10, 15, 16, 17, 18, 27, 40, 64, 65, 75, and 80. Each final opening was exported, validated, and migrated without rerolling its history or pending birthday. The subsequent year checked forward-moving time, valid saves, unchanged input states, stable selected appearance, and exact arrival at the following birthday. Portrait checks verified the actual image element, selected age atlas, and availability of its file. The real creation handlers exercised slider updates, age locks, presentation changes, portrait arrows and locks, random rolls, three independent slots, resuming, importing, and abandoned replacement creation.

The offline game was rebuilt and its bundled script parsed successfully. Its portrait manifest contains embedded WebP images with no remaining external portrait-file references.

## Findings corrected

| Finding | Correction |
| --- | --- |
| Creation always used an age-27 preview. | The selected starting age now drives both creation rendering and the saved opening. |
| Background-only artwork and an intrinsically empty portrait frame could leave the character invisible. | Real image layers and explicit square sizing provide the portrait content and layout. Default and random portraits keep the face uncovered. |
| The form still offered the old household, identity, seed, oath, and preference lists. | Removed them and their hidden equipment-era controls from creation. Only the requested choices remain. |
| Unavailable adult choices could remain stored after selecting childhood. | New drafts sanitize cosmetics at the selected age; controls explain their unlock age. |
| A random unsheltered household could be described as tradesfolk before initialization silently changed it to poor. | The circumstances sampler now follows the same household rule as the game. All final randomized cases match. |
| Old security assertions rejected every image element, including the new legitimate artwork. | They now reject injected image markup and independently require every real portrait image to use an allowlisted local art path. |

## Limits and useful follow-up

Live browser rendering was unavailable in this environment. These checks establish game state, artwork selection and availability, frame sizing rules, and handler behavior; they are not a screenshot-based desktop or phone review. A direct visual check on the user's device remains useful for the originally reported display problem.

Additional infant, adolescent, and elder likeness variants would make those age ranges as individually expressive as adult portraits. Very old starts take longer because they generate a real earlier history; a larger future background system could offer more varied prior partnerships and household arrangements while preserving the current calendar and save rules.

Reproduce the new sample with `node scripts/audit-creation-v15.mjs 128 docs/creation-v15.json`; run the regression suite with `npm test`. Raw per-start evidence is in [creation-v15.json](creation-v15.json).
