# Hearth & Oath — Identity and nature, v0.20

NPCs now keep a saved sequence of complete age portraits. Human and Elf sequences match observed complexion and visible hair family; Beastfolk sequences match animal family, coat and visible mane or scalp hair, with an additional species-family check for Wildkin. Other ancestries retain their ancestry, presentation, and visible hair family. Young adults are not assigned gray-haired adult anchors. Elder portraits can gray naturally. Masks, clothing and hair remain parts of complete illustrations.

Seven new registered atlases add 448 original, complete portraits. The full character book contains 10,752 portraits; the enemy book retains 384. Every new atlas passed the existing strict 8 × 8 registration checker. Its original PNG, actual generation/edit prompts, observed cell labels and AVIF hash are preserved under `reference-art/preset-v20/`.

Names draw from eight ancestry traditions and 27 heritage traditions. Family names can be inherited, while adoption preserves a child's own name and identity. Teachers, companions, rulers, merchants, travelers, colleagues, dungeon witnesses and bounty targets use the same cultural naming source. Bounties save the target's actual portrait identity with the contract. Regional place-name components and six regional naming histories are available in the map inspector. Existing saved names and pending scenes are preserved.

The Beginning screen has an editable name and a cultural name roll. An entered name survives ancestry changes and further fate rolls. The Attributes screen offers 20 named personality traits. Each costs one or two points and grants actual attribute bonuses. Opposite traits cannot be selected together. Starting traits apply after the simulated earlier years, so a newborn receives no adult trait bonuses. Further points can be spent in Character as the life grows; existing traits are lasting.

| Age | Total trait points |
| --- | ---: |
| 0–2 | 0 |
| 3–5 | 1 |
| 6–9 | 2 |
| 10–13 | 3 |
| 14–17 | 4 |
| 18–29 | 6 |
| 30–44 | 8 |
| 45–64 | 10 |
| 65+ | 12 |

A contrary act adds 6 stress per affected trait, capped at 12 for one choice. A compatible act relieves 2 per trait, capped at 4. The same conflict is charged at most once a day; the same source of relief works once a week. Invalid commands, failed costs and repeated combat settlement do not charge stress. Choices and actions show the relevant nature effect, and the chronicle records actual stress changes. Work, learning, care, charity, theft, coercive rulership, faith, the main story's coercion, predatory feeding, dangerous travel and combat choices are connected. A yearly grievance with an existing named person adds a choice between forgiveness, retaliation, a measured correction and time apart.

The attribute bonuses feed existing roleplay checks, initiative, attack and spell calculations. Vitality and intellect also add their usual health or magic capacity. Save/load does not apply a bonus twice, and a child successor does not inherit the parent's selected personality build.

## Verification

All 104 distinct fresh lives passed the completed audit. Each began at birth and reached retirement between ages 35 and 85; ten also continued into an existing child and advanced that child's life. The audit uses actual public game commands, exports and reloads; it is automated gameplay, not manual browser play. Native source artwork and registered crops were inspected. Browser automation was unavailable in this environment; actual entry handlers were exercised with the repository's simulated browser surface.

| Final verification | Result |
| --- | ---: |
| Automated tests | 693 passed, 0 failed |
| Distinct completed lives, seeds and decision traces | 104 each |
| Unresolved full-life audit failures | 0 |
| Actual engine commands, including one recorded replay | 83,730 |
| Save exports followed by migration/reload | 37,821 |
| Portrait checks across the lives | 593,740 |
| Previous-save immutability checks | 83,730 |
| Successful child-successor handoffs | 10 |
| Ancestries / portrait presentations / age stages exercised | 8 / 3 / 5 |
| Story arcs / distinct story branches exercised | 18 / 149 |
| Enemy species exercised | 44 |
| Runtime files changed during recorded final journeys | 0 |

The eight final seed ranges contain 103 initial passes and one audit-key failure. That life passed a separately recorded replay after the audit began identifying relatives by their actual lineage records. No runtime code changed between those ranges and the replay. The report preserves the initial attempt, replay, source hashes and exact counters rather than replacing the initial evidence. The full 104-life run took place after the portrait and stress fixes described below. The standalone game build succeeded with all 174 character and enemy atlas assets embedded.

A focused identity test follows 648 NPC identities across five age stages: 3,240 comparisons covering every ancestry, heritage and presentation. Naming checks exercise 2,160 seeded residents across the 27 heritage traditions. Focused gameplay checks cover newborn budgets, opposing traits, editable names, permanent attribute gains, theft stress, brave retreat, combat damage, inspection relief, a saved grievance, and old unfinished saves.

## Findings and remaining improvements

- The old age lookup could substitute a different hair tone or animal coat. Observed metadata and saved lifecycle selections replace that lookup for new NPCs. Additional art fills all 44 identifiable adult Beastfolk coat cohorts across every age stage.
- Two old adult Beastfolk cohorts have uncertain coat labels. They are excluded from new NPC identity rolls. A legacy drawing is retained if no verified match exists, instead of assigning an invented coat identity.
- The full-life audit also caught a Beastfolk sibling whose coat stayed constant but whose visible scalp hair changed from dark to light. The same hair-family matching now applies to Beastfolk as well as the other ancestries.
- Adult gray-haired artwork could introduce gray hair during young adulthood. New NPC rolls exclude those anchors; natural elder graying remains.
- A prison sentence correctly cancels an in-progress annual plan. The audit initially treated that cancellation as a stalled year. Its driver now serves the real sentence and begins the year again, while still requiring actual calendar progress.
- Two relatives in successive generations had the same name and occupied the same household role. The audit initially mistook them for one person. Their distinct birth and lineage records confirmed that both portraits were correct. The audit now follows lineage IDs and explicitly verifies that the retired player's exact appearance survives as the child's parent; the full affected life replay passed.
- Future art can improve recognition further by drawing the same individual at every age, retaining distinctive facial structure and marks. Current matching protects ancestry and coloring; it is not a one-to-one facial aging generator.
- More specific personality responses can be authored for additional individual story scenes, while retaining the visible stress previews and bounded relief rules.

Raw lives, counters, decision traces, source hashes and final character records are retained in `docs/full-lives-v20.json`, its eight source ranges and `docs/full-lives-v20-replay11.json`. Initial regression saves are retained in `docs/v20-audit-regressions/`.
