# Hearth & Oath 0.23.1 — religion and life review

Completed on 13 October 2026. This is a source audit and an automated playthrough review of the actual game. The twenty lives used public game commands, actual choices, elapsed calendar days, real turn-based battles, and genuine retirement or death. They are not human critic surveys or manual browser play.

## Result

Twenty distinct seeds concluded: **17 retirements and 3 deaths**. The run recorded **14,243 commands, 1,844 exact save/reload checks and 40 completed battles**. It covered all eight ancestries, all three portrait presentations, starting ages 0, 10, 18, 25, 45, 65 and 80, and all six covenant endings.

The religious coverage was **57 completed inquiries**, including all **18 faith/request combinations**. Outcomes included 18 public accounts, 19 paid copies and 20 exclusive sales. Fifty-one requests reached their later yearly consequence. One elderly world had lost its suitable tidal destination; the game correctly offered an explicitly copied archive account rather than inventing a coast or a living harbor visit.

## Findings and changes

| Finding | Resulting behavior | Evidence |
| --- | --- | --- |
| Religious requests could send a tidal investigation to an unrelated or destroyed location. The three requests of a faith also reused one generic evidentiary premise. | Each of the 18 requests has a matching physical setting and a saved premise. The additional 12 requests now have distinct observations, disputed claims and replies. A missing physical setting uses a clearly dated archive copy. | 540 setting checks across 30 seeds; all 18 variants also completed in the lives. |
| A source could retire or a destination could be lost before fieldwork, yet the narrative still claimed a fresh conversation. | A matching present keeper can confirm the account. Otherwise the signed source remains, with no invented fresh testimony. | Focused absent/replaced-witness regressions and exact inquiry reloads. |
| Practicing a chosen faith abroad could make the local priest appear to belong to that faith. | Foreign practice is a personal rite. Local institutions keep their own traditions. Helping a temple does not enroll the hero in its congregation. | Cross-faith rites, inquiry and reporting checks; membership checked after every religious service in the lives. |
| Delayed campaign scenes could make a deceased parent, companion or friend speak and gain new trust. | New scenes use surviving people, dated records, sealed accounts or private remembrance. Deceased contacts receive no new trust, knowledge or practical obligation. An old ferry statement is not a promised present witness. | A naturally bereaved age-80 campaign and focused deceased-actor fixtures. The companion-death fixtures are tests, not additional completed lives. |
| A vampire friend could forget a prior confidence. Moon-curse conversation could grant immediate control. | New conversations remember the confidence. Modern wolf conversations grant no instant mastery; refuge, practice and real moons govern it. Older saved offers retain their advertised effects. | Knowledge and control regressions; prepared werewolves reached mastery through lived moons. |
| Public magic permission and clergy acceptance could be mistaken for immunity to a local curse warrant. | The laws screen displays the actual local hunter policy before discovery, including capital hearings. Congregation and public magic laws remain separate from curse law. | A predatory vampire was captured, heard and executed by the Silver Compact. Private acts did not create reports in unvisited regions. |
| A real vampire save became trapped one day before a birthday after hunger was paused. Feeding activities were blocked and the year would not reopen the need. The UI disabled the annual command too. | Explicit annual retries reopen the need. A dedicated **Meet blood hunger** menu command also works without spending time or cancelling a commitment. One-night refusal spends a real day, can hurt or kill the character, and still opens the real birthday. | Exact failing save retained in `tests/fixtures/hunger-birthday-v26.json`; public-command recovery to age-32 retirement; real app-handler regression. |
| Feeding text claimed a clinic or donor network in wilderness locations and showed a generic animal-blood relief amount for every lineage. | New menus use actual settlement presence and lineage-specific relief. Wilderness meals offer animal feeding; settlement donors and witnessed attacks have their own context. Prison meals use a locally recorded jailer ration rather than a secret hunt. | Feeding presence, Gloamwing relief, prison disclosure and older-offer compatibility regressions; an affected predatory life replay. |
| The patron’s invitation still described an immediate change instead of the implemented infection. | New invitation and notice describe the three-day disease, early cleansing, later restoration, hunger and regional warrants. | Curse progression regressions and rebuilt hosted/offline game. |

Personal worldview and formal congregation are intentionally separate. A minority Lantern chapter in another faith’s region, disagreement between clergy, or a permissive magic law beside a harsh curse law is not automatically a contradiction. Those distinctions were preserved. Existing saved pending scenes and completed historical entries were not rewritten to fit the new prose.

## Twenty lives

| Life | Character | Ancestry | Start → end age | Policy | Outcome | Covenant ending |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Berwyn Dategate | human | 0 → 32 | devout civilian | Retirement | renew |
| 02 | Savaela Saffrongarden | elf | 10 → 32 | pilgrim explorer | Retirement | release |
| 03 | Dazren Ochrehall | dwarf | 18 → 32 | skeptical artisan | Retirement | — |
| 04 | Fenniel Seedpatch | halfling | 18 → 32 | cross faith friend | Retirement | — |
| 05 | Azira Water-shared | orc | 18 → 32 | sustained vampire | Retirement | — |
| 06 | Sizzrel Spareneedle | goblin | 18 → 32 | prepared werewolf | Retirement | — |
| 07 | Sazorin Starjourney | tiefling | 18 → 32 | predatory vampire | Retirement | — |
| 08 | Nerrella Springlane | beastfolk | 18 → 18 | refusing vampire | Blood starvation ended the cursed life | — |
| 09 | Merlen Sunarch | human | 18 → 32 | untamed werewolf | Retirement | — |
| 10 | Olaesir Goldpetal | elf | 18 → 32 | covenant adventurer | Retirement | keeper |
| 11 | Naviessa Coldbank | human | 80 → 84 | devout civilian | Retirement | dominion |
| 12 | Aprin Willowpantry | halfling | 65 → 69 | pilgrim explorer | Retirement | shatter |
| 13 | Mazhal Water-returned | orc | 45 → 49 | skeptical artisan | Retirement | — |
| 14 | Tazzela Borrowkey | goblin | 25 → 32 | cross faith friend | Retirement | — |
| 15 | Farstar Starjourney | tiefling | 18 → 32 | sustained vampire | Retirement | — |
| 16 | Fellin Brookhearth | beastfolk | 18 → 32 | prepared werewolf | Retirement | — |
| 17 | Navira Alderford | human | 18 → 18 | predatory vampire | Executed under The Silver Compact’s local curse warrant | — |
| 18 | Savaelith Coppersong | elf | 18 → 18 | refusing vampire | Blood starvation ended the cursed life | — |
| 19 | Arvek Sunforgeseam | dwarf | 18 → 32 | untamed werewolf | Retirement | — |
| 20 | Pessibel Figcart | halfling | 18 → 32 | covenant adventurer | Retirement | haven |

The policy labels describe test behavior, not professions forced on the hero. A life was free to remain a civilian, pursue the covenant, change through a bite, decline blood or accept responsibility for the beast. Earlier years for older starts were generated by the same new-life simulation used by the game.

## Assessment

The strongest part is how one life connects household memory, faith, a curse, travel and law. The age-80 campaign retained a dead parent’s absence. A careful vampire used a named donor arrangement. A prepared werewolf reached control and mastery through real moons. A predatory vampire prospered to retirement under a hearing-based regional policy, while another died under a capital warrant. Two characters died of blood starvation after refusing feeding. An adventurous elf acquired the Gloamwing lineage through an actual dark encounter. These are materially different histories, rather than different summaries pasted over one outcome.

The campaign also supports six different resolutions with continuing costs. Religious accounts can be shared, priced or monopolized without forcing a moral identity or membership. This makes institutional conflict easier to roleplay than a universal “good faith / evil curse” rule.

Long curse lives remain too repetitive in places. The two uncontrolled-wolf policies and the repeat-offender vampire spent many commands on recurring moons, custody and hearings. Some repetition is the cost of their choices, but the prose needs more specific escalation and quieter intervals after a resolved case. Calm feeding routines could also use more relationship callbacks. These are pacing and content limits, not claims of a fully balanced or exhaustive game.

The solo test player repeatedly retreated from an early guardian. Recruiting actual companions and training through real activities resolved the loop. No enemy or player statistics were patched for the test. The game would benefit from clearer party-preparation guidance before an early dungeon, especially for a young civilian character.

## Next worthwhile work

1. Add a few personal religious stories tied to named households, rival interpretations and the hero’s recorded conduct. Favor returning people and consequences over another large generic encounter table.
2. Vary hunter escalation after a real resolved case: a named investigator, a change in supervision or a period of quiet, while retaining accountability for new assaults.
3. Give stable donor and moon-watch routines more domestic and relationship callbacks. This would add flavor without hiding their actual costs or consent.
4. Explain recommended party preparation at dungeon entrances. Preserve the ability to enter early or go alone, with the visible risk.

## Verification and limits

The initial broad regression run passed 783 tests. The final release run passed **788 tests, with 0 failures and 0 skips**. The hosted/offline build succeeded. Both offline handler runs passed under all five window configurations with **0 network calls**; the 57,428,977-byte standalone download reassembled to its exact SHA-256 hash. The new focused suite covers religious continuity, feeding, actual saved-calendar recovery and the real menu handler.

The standalone game includes the new story modules, all 206 inline AVIF atlases and the existing paper art. Network-blocked VM checks exercise actual menu handlers under five window configurations: 390×844, 974×654, 1286×902, 1474×654 and 1920×1080. These checks do **not** measure rendered CSS geometry or prove browser responsiveness. Browser layout, manual mouse feel and soundtrack listening were not available in this environment.

The twenty-life evidence spans the religion fixes and the subsequent feeding corrections. One exact stalled save was resumed after the fix, then its command history was joined to the earlier history of the same person. Final menu recovery was separately verified through the actual app handler and offline bundle. Failed test-player assumptions about a missing regional institution were corrected by visiting a real surviving institution; no religion or settlement was conjured into the world. Initial solo-retry pilots and repeated runs of the same seed are excluded from the count of twenty distinct lives.

Runtime hashes, full command/event transcripts, endings and reload counts are retained in `religion-v26/lives.json` and `religion-v26/summary.json`. A separate affected-life replay is in `religion-v26/feeding-followup-life-16.json`. The original hunger failure is kept as a regression fixture. No stats, clock, inventory, curse or reward patches were used in the twenty lives.
