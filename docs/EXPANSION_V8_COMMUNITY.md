# v0.8 civilian ambitions and community stewardship

The v0.7 audit found that a lifelong civilian could earn large savings without a future worth funding. This addition makes that future particular: a learning hall, clinic, maintained crossing, common garden or refuge has a charter, real construction, named people, a protected operating reserve and a story beyond its founder.

## A project is an ambition, with separately agreed milestones

`community.js` exports five undertakings. Each has three material, gold and time milestones. Total commitments range from 3,000 to 5,500 gold and 37 to 50 actual days. Their final contribution is an operating endowment, rather than a fee that disappears without a purpose.

Opening a proposal spends nothing. The player chooses its public or practical charter before construction. Every stage states its full quotation. Once actual work starts, `community.project.commitment` captures the original fee, materials and remaining days. A birthday, illness or promise can interrupt it; continuation finishes only the remaining work and cannot charge twice. A zero-day interruption charges nothing and produces no completion benefit. Between milestones, the player can return to ordinary work, travel and family life. One unfinished civic ambition exists at a time.

The undertaking records its founder, founding generation, actual site, milestones, material commitments and named beneficiaries. Incomplete work can be archived without invented output, refunded materials or returned money. Recognition follows actual accomplishments: a first institution, two kinds of service, a three-kind network spanning at least two places, and an actual successor taking stewardship. Recognition does not mint cash or statistics.

| Undertaking | Chartered service while its actual reserve funds operation |
| --- | --- |
| Learning hall | Public charter: up to 8 gold less for local school enrollment. Practical charter: an accessible apprentice route and 2 extra preparation points from actual supervised project practice. Neither gives a diploma. |
| Clinic | Up to 6 gold less for a chosen local care plan, with 14 additional days of physical recovery support. Care takes lived time; the building cannot instantly cure illness. |
| Wayhouse | 8 points less risk on a newly quoted local departure or destination. An already captured journey retains its quotation. |
| Common garden | Choose gathering grounds whose actual replenishment interval is 2 days shorter, with a 2-day minimum, or up to 30 gold of annual basic household food support. Reading a page never grants a stock. |
| Memorial refuge | A real refuge at a surviving settlement and up to 15 gold of annual basic food support. It can preserve the name of a destroyed place while its original destruction, deaths and campaign ending remain unchanged. |

Benefits use a maximum rather than additive stacking. A service must be standing, chartered open for operation, actually funded through the current day and located at an operating settlement.

## Endowments are protected, finite and accountable

The first endowment funds approximately ten operating years. Each real year consumes the institution's declared operating cost from its protected reserve. It never silently debits the household, pays interest or grants the hero money. Operation pauses when the reserve cannot fund another year. The building, founder and beneficiaries remain recorded.

A later contribution is a separate, explicit choice: 1,500 gold and a funding visit of up to four actual days. A zero-day visit takes no contribution. The player can pause or reopen the charter; a reopened service uses existing funds for future operation without retroactive charges for the paused years. The sidecar maintains the invariant:

`operatingBalance + operatingSpent === contributedGold`

Funded periods and deliberate pauses retain their real dates. `communityResourceIntervals` returns those actual intervals for gathering calculations, preventing faster regeneration from being applied to childhood, construction years, pauses or earlier unfunded years.

## People return to the institution's story

The charter captures particular living society neighbors, actual children or local family contacts. A deterministic named local charter keeper is used only when no such person exists; that keeper is not presented as an old acquaintance.

After lived years, a beneficiary's account can return with a practical problem about learning, continuing care, crossings, common food or the refuge's future. The player can give an actual day to listening, fund a small practical followup with real days and 20 gold, or delegate the response. The record remembers this individual, their response and actual time. A living child can develop one relevant practiced skill through a supported step; no purchased qualification or imposed adult career results. People who have died are remembered without offering living contact interactions. At most one unanswered account per institution is queued, keeping old wealth from creating an unchanged warning loop.

## Compatibility and succession

The optional `community` sidecar starts at the current day on import. It grants no invented historic works, rerolled settlement or past expense. All existing class, event and family records remain outside this module. Each proposed undertaking stores all three quoted stages and its operating cost before work begins, so later template changes cannot silently reprice that captured ambition.

`inheritCommunity(previous, next)` deep-copies completed infrastructure, protected balances, funded periods, charters and actual beneficiary records. It pays no cash and creates no duplicate operation. The child's gold estate was already calculated separately from money the founder spent on institutions. Unfinished personal proposals close as recorded unfinished history, with no free completion or refund. Taking stewardship as the new generation is a visible choice, rather than an inherited combat oath.

## Module contract

Root hooks: `initializeCommunity`, `communityActions`, `applyCommunityAction`, `applyCommunityChoice`, `communityEventIds`, `onCommunityTime`, `flushCommunityEvent`, `communityView`, `validateCommunity`.

Integration queries: `communitySupport(s, locationId)` returns `schoolFeeDiscount`, `apprenticeshipAvailable`, `schoolPreparationBonus`, `careFeeDiscount`, `careDays`, `roadRiskReduction`, `resourceRecoveryBonus`, `foodSupport`, `refuge`, and named `works`. `communityResourceIntervals(s, locationId, oldDay, newDay)` returns merged `{fromDay, toDay, bonus}` intervals without mutating the save. `communityFoodIntervals` returns actual `{fromDay, toDay, annualSupport}` spans; `communityFoodSupportAt` reads the rate on a particular day. A future food forecast may count operating years that the existing reserve can already fund, without taking that money before time passes.

Action handlers own their stated fees and bounded time. The root dispatches `community_` before generic action charging. Only a non-null `community.project.commitment` blocks other commitments; a plan between milestones is an ambition that can share a life with other activities. `onCommunityTime` advances operating accounts, not manual construction, so a handler's call to `spendDays` cannot double-credit work.

## Verification

Thirteen focused checks exercise resource conservation, paid interrupted milestones, zero-day behavior, split versus annual calendar operation, paused-year preservation, historic gathering and food periods, refuge consequences, actual child learning, successor fund conservation, beneficiary identities across reused local family IDs, a charter keeper's own lifespan and invalid accounting rejection.

`node scripts/playtest-community.mjs` plays two genuine public-API lives from birth. The smith and healer earn their money, gather finite resources, build three distinct institutions in at least two real settlements, allow real endowments to expire, choose actual replenishment and retire. The smith also welcomes an actual consenting older child, continues as that child and uses an inherited public learning fund for real academy enrollment. The script records every operation, offered choice and actual outcome in `artifacts/playtest/community`, with the summary in `docs/playtest/community-v8.json`. Final integrated replay counts are recorded there; scripted policies are evidence of the played routes, not a claim to exhaust all seeds and social arrangements.

The final frozen-source replay completed:

| Original life | Actual terminal age | Public operations before closing the life | Offered decisions | Civic decisions | Completed institutions |
| --- | ---: | ---: | ---: | ---: | --- |
| Tamsin Lowfire, classless blacksmith | 41 | 317 | 128 | 34 | Urban learning hall, village wayhouse, riverside winter commons |
| Neris Candle, classless healer | 41 | 359 | 135 | 31 | Village clinic, memorial refuge, protected riverside gathering commons |

These are two original lives, not a claim that their repeated verification runs add further lives. All five kinds of undertaking are exercised; the two original lives complete six real institutions across their actual regions. Both let their first endowment expire through actual years before a separately paid contribution resumes service. The smith's genuine sixteen-year-old adopted child, Neris Cinderwell, continues as generation two with unchanged inherited institution records and protected reserves, then travels to the city and pays **12 actual gold instead of 20** for academy enrollment under the inherited public hall's service. The child is not assigned a class, granted a diploma or counted as another completed original life.
