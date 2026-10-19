# v0.8: expeditions with people, concerns and remembered routes

The v0.7 audit found five readable but fixed dungeon graphs. New lives now receive **seeded, saved expedition definitions**: each of the five sites has three route layouts, three authored concerns, three inhabitant motives, a named custodian and a named witness. Each layout selects two optional chambers, for eight actual connected rooms. The mandatory discoveries and campaign encounter identities remain intact.

This is authored procedural variation, not a claim of infinite stories. Fifteen concerns describe different local problems: unfair water access, missing workers, refused covenant names, coerced copyists, a threatened nursery, confiscated refugee papers, living maintenance workers and the machinery of withdrawal. The seed chooses a concern and topology; the player's conduct determines what is done with them.

## What a player can do

- Hear an inhabitant's account without receiving a free clear, experience or supplies.
- Preserve a witness's words with their permission, or spend real materials making their refuge safer.
- Repair a neglected maintenance route and keep its work orders; a different option repairs the route while leaving the records there.
- Preserve a personal account, protect its wrapping, or recover the useful iron tool and leave its evidence behind. The one-time tool reward cannot also yield the preserved account.
- Use an optional service passage or another linked chamber rather than always crossing the same front encounter. A resolved optional route does not clear the guardian it bypasses.
- Negotiate a guard's concern through actual training, preserved evidence, practical aid or an active trusted companion with a relevant shared memory. The last guardian requires listening, practical aid, proof and trained judgment or trusted support; there are no combat rewards for peaceful passage.
- Complete the critical discovery with a private copy, a public material account, or a site-specific repair using actual ore, cloth or herbs. Repairing an emergency channel does not magically cure the region, restore a destroyed town or choose a campaign ending.

Publishing distinguishes material evidence from a living person's consent. A witness who actually agreed to a record can be named with their limits. Otherwise the public account redacts personal names. The game never invents a conversation merely because a witness name was generated.

## Systems connected by actual conduct

Practical aid gives companions a specific expedition memory. Negotiation uses an active, living companion with at least five relationship and a relevant memory, rather than silently treating a party slot as consent. A completed companion request can also provide genuine shared experience. The negotiated room records the person who spoke beside the player.

The new calling formations supply another kind of proof in relevant sites: guardian, knight and paladin at the watchtower; healer and elementalist in the cistern; druid, ranger and berserker in the root caverns; necromancer, thief and bard in the archive; assassin at the watchtower or core. A formation must actually reach its completed stage and day. Its title is recorded in the negotiation; it adds no free statistic or combat reward.

This connection has a real tradeoff. **Aid without copying personal records** leaves `variantProof` absent. A completed relevant formation can then satisfy the otherwise missing proof. Practical aid, listening and trained judgment or trusted support still remain necessary. Merely starting a course, possessing a class name or hearing the account supplies none of that work.

Discovery methods, aid, evidence, named memories and the expedition's full definition remain in the record. Actual successor lives inherit those records, keeping claimed caches and completed repairs in the same world instead of recreating them for a new generation.

## Compatibility and implementation contract

`initializeExploration(state, { fresh: true })` sets `flags.explorationVersion = 1` for a new birth game. Default initialization remains legacy. On the first entry into a previously unrecorded modern expedition, `generateDungeonDefinition(seed, id)` creates a version-one definition and copies it into both `state.dungeon.definition` and `flags.dungeonRecords[id].definition`.

An existing active expedition or partial/completed record without a definition always uses the original `DUNGEONS` graph. It is not rerolled by enabling future content. Existing pending room choices, battle contexts, chamber clears, cache rewards and campaign completion facts remain intact. The five mandatory room sets and encounter IDs are unchanged. Optional room IDs are the stable `witness`, `service` and `reliquary`; the event allowlist enumerates that finite superset.

The version-one generator is an immutable save contract. Validation compares a snapshot's canonical structure with its seed's version-one definition, rejecting edited reward amounts, routes, names or foreign seeds. Runtime exploration uses the saved snapshot. Future content must receive a new generation version rather than editing the v1 generator's tables or its base graph.

`dungeonView` adds objective, inhabitant, witness, motive, aid, evidence, supporting companion, supporting formation, optional-room markers and exits. UI rendering reads those fields; it does not mutate or regenerate a world. Action descriptors expose actual days, material requirements and blocked negotiation reasons. Timed effects consume resources only after a real day has elapsed; interrupted zero-day actions cannot award aid, evidence or repairs.

## Played evidence and limits

Three distinct age-zero lives reached retirement at 30 after full connected campaigns:

| Player | Seed | Ending | Actual public operations | Expeditions | Negotiated final guardians | Real battles |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Isca of the Witnesses | `v8-expedition-life-0` | Renew | 373 | 5 | 0 | 7 |
| Halwen the Restorer | `v8-expedition-life-109` | Release | 335 | 5 | 5 | 0 |
| Deryn of the Private Record | `v8-expedition-life-140` | Haven | 342 | 5 | 5 | 0 |

These are **1,050 real public-API operations**, with earned schooling, callings, work income, paid materials, recruited companions, actual battles or negotiated passage, campaign preparations and retirement. No age, currency, skill, party member or victory was granted by directly editing these lives. The policy obeys visible birthday locks before starting the next activity. A first driver attempt stopped at such a lock and was corrected to take the actual birthday; it is not counted as another life.

A separate genuine [Ranger formation life](playtest/fellowship-v8.json) verifies the synergy directly: after earning the calling, completing its sixteen real formation days and eight days helping a companion, the player spends one ore and one day on `aid_only` in Moonroot. No personal account is copied, so `variantProof` remains absent. The completed formation supplies the otherwise missing proof; the Thornheart negotiation records `formation_thornheart = ranger`. The spring is then discovered through actual offered choices without a fabricated battle or room clear.

The three seeds cover 38 of the 45 individual layout/concern/motive features across the five sites. This number counts individual features, not every combined definition. Focused tests also check 100 seeds per site: all 500 graphs are deterministic, connected, two-way and retain a mandatory final guardian before their critical objective. Seven new tests exercise immutable old battles, partial records, snapshot tampering, exact material use, interrupted time, real remembered support, all five quest objectives, formation proof and publication limits. The original exploration tests remain intact.

The [summary](playtest/dungeon-variants-v8.json) records each actual graph and resolution. [Complete action traces and final states](playtest/dungeon-variant-actions-v8.json.gz) preserve the three plays. Reproduce them with `node scripts/playtest-dungeon-variants.mjs`; run `node --test tests/dungeon-variants.test.js tests/exploration.test.js tests/campaign-roleplay.test.js` for the focused compatibility and story checks.

After final NPC lifespan and commitment integration, all three complete lives were played again on the frozen source, then repeated with the same seeds. Each pass performed 1,050 public operations. All final saves and compressed archived saves validate against that integrated source; both the complete transcripts and final states match exactly across the two passes. The [integration verification](playtest/dungeon-variants-v8-verification.json) preserves their hashes. These repeats do not add to the three distinct-life count.

The expansion varies topology, motives and consequences around five fixed critical expeditions. It does not yet add a general dungeon generator, new enemy families, repeatable endgame sites or autonomous lives for every named expedition witness. Those are later additions; these routes first establish persistent people, practical decisions and dependable campaign completion.
