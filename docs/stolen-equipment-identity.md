# Stolen equipment identity (roadmap 8 / life audit A2)

## Bounded implementation contract

The audited merchant theft knows the catalog item ID but currently writes only a resale loot token. The fix records a stolen piece as a distinct equipment instance with its explicit catalog base ID and immutable acquisition provenance. It must have exactly the ordinary catalog stats, not found-item quality or tier bonuses. It must never also remain a separately saleable loot entry.

Lawful catalog ownership remains one per catalog ID. Existing found/crafted instances and the 120-instance capacity stay unchanged; stolen pieces share that individual-piece capacity. Two stolen longswords are two different assets, even when they came from the same seasonal stock batch. A full gear bag prevents a new stall theft before time or stock is spent. Household silver and pickpocketed money remain valuables and currency, not gear.

The original owner, property reference, acquisition location/day, original loot reference and theft-time value remain on the piece across equip, unequip and save/reload. Individual sale uses the existing stolen-loot buyer policy: a separate fence when contraband is prohibited or the merchant was the victim; otherwise the local merchant. The existing 55% / 80% sale rates and witness roll remain unchanged. Normal barter, ordinary bulk sales and financial sale forecasts exclude stolen property. Removing a piece also clears its equipped slot, preventing a dangling bonus or second payout.

One optional explicit return can hand a piece back to its verified current original merchant at the local market, for no payment and without clearing criminal evidence. Stock is restored only if the merchant identity and original stock season still match; a newer season or retired merchant never receives phantom stock. Custody keeps its existing possession-preserving rules. There is no new automatic confiscation or law change.

Migration may convert only legacy stolen loot that supplies a recognized explicit catalog itemId or gearId. Names, artwork hints and stock/property string parsing are not identity evidence. Unknown, conflicting or capacity-blocked legacy loot remains unchanged. Existing pending scenes and historical records are not rewritten.

## Reachable controls

Activities → Crime & Mischief retains the currency-only act, labeled Pickpocket, and adds a collapsed Stall & Household Property section containing only the already-eligible existing stall/burglary descriptors. Its explanation distinguishes these longer stealth attempts from pickpocketing's d20. A stolen piece appears once under Inventory → Equipment, with its real illustration, Equip, original ownership and current sell/return descriptors. The production click handlers still use the authoritative immutable engine.

## Verification

- Passed: node --test --test-concurrency=1 tests/stolen-equipment.test.js, 21/21 cases, zero failures/skips (14.0 seconds).
- The genuine audit fixture uses public engine commands from day 8030 at age 22: first stall attempt fails; the existing cooperate/pay/account hearing is resolved; the second attempt succeeds on day 8034. No gold, skill, day, stock or equipment edits are used in that regression or its production-handler equivalent. It gives one exact-stat Iron longsword, which can be equipped, serialized, unequipped and fenced for one original-rate payment.
- Other explicitly controlled cases cover same-base distinct owners plus lawful ownership; the 120-instance pre-gate; household silver staying loot; ordinary barter/basket/forecast exclusion; 80% contraband sales and unchanged witness salt; no-payment return/replay; current-owner/current-season stock checks; original provenance in transfer history; explicit-ID-only legacy migration; future/overlong/conflicting/unknown/capacity-blocked legacy metadata; exact pending snapshots/history; and custody retaining/returning the same possessions.
- Production handler coverage follows Activities → Crime → existing hearing → return to Activities → theft → Inventory → Equip/Unequip → fence sale. An initial test script omitted returning to Activities after the hearing, which the app correctly leaves on Life; the script was corrected rather than deleting the assertion. The final full-file run passes.
- All changed JavaScript files pass node --check; git diff --check is clean. An independent read-only source/test-definition review found and verified fixes for acquisition UI reachability and conservative future-dated legacy migration, with no remaining source blockers.

This is focused engine/handler evidence, not a full-suite or real-browser visual/layout pass. No offline build, version change, main-branch integration or publication was performed in this source-only task.
