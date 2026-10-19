# Hearth & Oath — v0.13 audit

Completed on October 11, 2026. **135 distinct life playthroughs passed**, followed by a **612-test regression suite with no failures**.

The update replaces the green interface cast with charcoal, bone, and restrained brass. It also adds 48 engraved youth faces and corrects how new children receive their looks. The game retains its title screen, save slots, character creation, ambient music, text adventure, civilian lives, and optional party combat.

## What was tested

These were automated playthroughs through the actual public game engine, from birth through a chosen retirement. They used offered actions, real elapsed time, wages, costs, choices, battles, and export/import. They did not patch ages, grant money, edit stats, or create adult saves to skip childhood.

The main 120 lives retired at ages 35, 45, 55, 65, 75, or 85. Fifteen additional lives retired at 35 and covered every combination of five household priorities and three living standards. Each life had a different seed and a different decision trace. Parenthood was deliberately exercised in every life; these results are a test sample, not a claim about how often ordinary players would become parents.

| Check | Result |
| --- | ---: |
| Finished lives / failures | 135 / 0 |
| Distinct seeds and decision traces | 135 each |
| Public state transitions checked | 81,493 |
| Export/import and migration checks | 33,431 |
| Repeated portrait and identity checks | 500,023 |
| Ancestries / birthplaces | 8 / 12 |
| Livelihoods observed | 12 professions plus local labor |
| Children welcomed or adopted | 168 |
| Actual heir handoffs, followed by another year | 14 |
| Road journeys arriving / choosing to turn back | 1,676 / 23 |
| Road encounter types encountered | All 13 |
| Battles won / lost / retreated from | 25 / 2 / 23 |
| Completed invoices | 269 |
| Distinct activity actions exercised | 152 |
| Separate regression checks | 612 passed |

Every transition checked save validity, nonnegative gold, bounded HP, forward-moving time, and preservation of the previous save. Reloads checked that pending situations and selected appearances did not reroll. The heir checks preserved the actual child's age, birth date, likeness, and stored pronouns.

All 135 lives used voluntary retirement. This audit does **not** claim 135 different campaign endings or naturally occurring deaths. Campaign resolution, supernatural conditions, class paths, mortality, older saves, creator controls, and pending commitments also have regression coverage, but they are not counted as additional full lives here.

## Problems found and fixed

| Finding | Change made |
| --- | --- |
| Interface paint and the title backdrop had a green cast that conflicted with the ink portraits. | Recolored the interface to warm charcoal and bone, used muted brass for selections, subdued the backdrop, and replaced bright primary fills with dark menu treatments. |
| All young ancestries shared generic human face cells. | Created separate 4×4 infant, child, and adolescent atlases: 16 faces per stage across all eight ancestries. |
| A newborn could render a parent's future helmet, mask, scars, or adult beard. | Newborns render a bare infant head. Young children retain suitable soft headwear; adult beard and marking choices appear at adulthood. The saved adult customization remains intact. |
| New biological children could copy a parent's entire costume; adoption rolled unrestricted palette combinations. | New children now use coherent seeded character generation. Biological children inherit family features; adopted children retain their own look. Existing child records are not regenerated. |
| A child's stored pronouns were not explicitly carried into the successor's creation. | New child identities store pronouns and retain them when the player continues as that child. |
| Some hair layers could obscure a wolf muzzle. | Added a runtime cutout for wolf faces. Portrait layers remain independent of inventory armor and weapons. |

The youth art was inspected directly and composed with existing hair plates for registration checks. Age transitions were exercised through real childhoods and through children born during the audit. Principal body, muted-text, button, and selection color pairs measured between **6.35:1 and 12.29:1** contrast. This is a check of those pairs, not a claim that every text element has been visually audited.

## What should improve next

| Priority | Finding from this audit | Suggested change |
| --- | --- | --- |
| High — improve dialogue | 6,265 of the 7,320 sampled conversations were fate or vocation scenes; the eight new ordinary story nodes appeared only 81 times. These lives often left the campaign and callings unresolved, and the policy sampled many available contacts. | Keep quest and mentor reminders available on request, but reduce their repeated prominence. Add personal callbacks, changing ambitions, disagreements, and mundane conversations that remain varied while a quest is unresolved. |
| High — add deeper adult stories | Long lives remain mechanically stable, but recurring birthday, career, and conversation structures become visible. More seeds alone will not conceal a finite story pool. | Add branching multi-year arcs specific to a profession, household, rival, place, or earlier decision. Let a consequence return in a changed form rather than repeat the same dilemma. |
| Medium — improve economic stakes | Closing savings ranged from 1,887 to 75,466 gold, with a median of 34,569. Most main lives used steady work and frugal living, so this is especially a finding about that strategy. | Review long-term wage growth and offer meaningful optional uses for wealth: patronage, ambitious businesses, land stewardship, education, and lasting local projects. Make large choices compete for resources without adding arbitrary fees to basic care. |
| Medium — reduce repeated care commands | The policies chose 21,246 quiet recovery weeks across these lives. That includes an intentionally conservative health target and is not a minimum required by the game. | Make annual priorities and ongoing care clearer in the year preview. Allow an explicit recovery plan so the player can commit suitable time with fewer repeated commands. Keep the time and livelihood tradeoff visible. |
| Medium — add portrait depth | Young ancestries now have appropriate faces, but each stage still uses a finite set of base heads. Older nonhuman faces have less dedicated plate variety than humans. | Add more individual youth likenesses and elder plates for every ancestry. Preserve consistent registration, independent hair/headwear, and continuity as a person ages. |
| Medium — add world reaction | Helpful and darker road choices function and apply their stated consequences, but wider long-term social reaction would make roleplay more convincing. | Add persistent rivalries, patrons, rumors with identifiable witnesses, faction responses, and NPC decisions. Let behavior shape reputation; appearance and ancestry should remain independent of moral alignment. |
| Low — remove clutter | Repeated instructional and reminder text contributes to the remaining menu-heavy feeling. | Collapse duplicate guidance and utility rows into contextual help. Keep costs, prerequisites, pending decisions, and save controls visible. Preserve civilian life, inventory, and character customization. |

My first follow-up would be **adult and NPC story depth**, especially ordinary dialogue that survives an unresolved main quest. The visual correction is substantial; more personal consequences would do the most to make the world feel less procedural in the wrong places.

## Verification limits and evidence

The playthroughs were engine-driven, not 135 manual browser sessions. Browser QA was unavailable in this environment. Actual browser rendering, phone touch behavior, live audio playback, autoplay permissions, and long interactive sessions still need device-level checking. Source-level entry-handler tests, the game-engine journeys, raster composition inspection, contrast checks, and the standalone offline build passed.

The offline game includes all three new youth atlases, parses successfully, and has no remaining module imports or missing CSS art references. Earlier-save compatibility checks pass.

- [Per-life seeds, choices, chronicles, hashes, and aggregated results](sandbox:/workspace/sites/hearth-and-oath/docs/audit-v13.json)
- [Reproducible audit runner](sandbox:/workspace/sites/hearth-and-oath/scripts/audit-playthroughs.mjs)
- [Artwork prompts, generation method, and saved asset paths](sandbox:/workspace/sites/hearth-and-oath/docs/PORTRAIT_ART_V13.md)

To reproduce the same set sequentially, run the main 120 lives, then 15 lives starting at index 120 with the `priority` argument, then combine both completed JSON outputs using `scripts/summarize-audit.mjs`.

