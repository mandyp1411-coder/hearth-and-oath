# Homes and independent households, v0.41.0

Homes now leads with the current dwelling, its address and upkeep, rest, and shortcuts to Family and Belongings. Household time and upgrades use disclosure panels instead of a wall of actions. Adoption is not offered on the Homes screen; its existing system and saved children remain under Relationships → Family, including existing preparation and consent rules.

## Ownership and continuity

One primary household home is allowed. A cottage can upgrade to a townhouse or estate, and a townhouse to an estate. The engine, not only the UI, rejects same-tier/lower-tier purchases anywhere and prevents building another cottage. A review shows the old and new home/address, exact purchase cost, days, yearly upkeep, and estimated ordinary living costs. Repeated stale confirmations cannot charge twice.

Prices and time remain unchanged: cottage 120 Gold / 7 days / 30 yearly upkeep; townhouse 340 / 14 / 90; estate 900 / 21 / 240. Existing purchase behavior charged the full new home's price, so there is no invented trade-in credit or refund. The one saved primary-home record changes on upgrade. Belongings, spouse, children, family records, and buildings remain.

Older saves are not destructively normalized. Multiple previously built cottages remain, with their condition, repair options and benefits. They count as existing ownership even if old primary-home metadata is missing. Paid historical construction remains finishable, while a pending cottage prevents a conflicting new home purchase. No historical property is deleted, sold or liquidated.

## Rest and relatives

Home rest now eases up to 8 Stress, clamped at zero, only when the rest actually completes. Both the home action and Recovery shortcut still spend one day, restore all Focus, charge no rest fee, and retain ordinary household expenses and interruption rules.

Purchasing an owned home establishes the player's independent household. Spouse and children use its address; parents and origin relatives keep their recorded residence (or the established birthplace fallback) and remain family. They no longer appear in every room or at the player's current travel location. Visiting, gifts, meaningful support and conversation require their actual Homes area. Campaign displacement and saved conversations are not rewritten. These are derived rules, so existing saves resume without a destructive migration.

## Verification

Focused automated tests cover every tier across local, remote and missing-address saves; stale engine/UI actions; exact costs and time; household/belonging preservation; legacy multiple cottages, repairs and pending projects; Family adoption navigation; parent residence and visits; bounded Stress relief; and save/resume. `scripts/verify-offline-home-v41.mjs` runs the same essential flows against the actual standalone bundle with network forbidden. Browser visual evidence and final release test totals are recorded separately when complete.

### Final targeted checks

The combined release gate passed 109/109 tests (home/household, recovery, workshop, saves, family depth, world-first UI, work/trade separation and careers). A second narrower combined run passed 92/92. The standalone home and work/trade scripts both passed against the newly rebuilt artifact with no network access.

The older dialogue UI suite is not claimed green: it has the same four failures on the clean v0.40.1 baseline and this release (nearby-list assumptions, captured trait previews, old daily/annual dialogue assumptions and quest-topic expectations). Its frozen identity/no-mutation test was updated to stand in Homes, matching the intentional parent location rule, and passes. Review also caught and fixed the deceased-caregiver neighbor fallback and spouse values conversation after a move.

The established full standalone interface/art verifier also passed (`docs/verification-v0.41.0.json`): 132,150,598 bytes across 16 exact parts, embedded runtime and art, recovery, provider visits, save/inbox interactions and restored performance flow, with zero network requests. Browser visual checks are additional and do not change these semantic-test limitations.
