# Hero loadouts and favorite equipment: roadmap 27

Implementation branch: based on public v0.48, `b24cba83`.

## Approved boundaries

Four named full ten-slot arrangements remember exact owned item IDs, including intentional empty slots. Favorites are organizational bookmarks, not sale locks. No item is purchased, recreated, substituted by base design, duplicated, or assigned twice. No saved stats, training, base attributes, set rules, combat snapshots, item prices, or stolen-property provenance become editable through this feature.

The existing `equipmentActionReason` is the authoritative application policy and must remain unchanged. In-progress `cartography.pending` crossings and `timeline.journey` journeys are blocked. A merely marked `cartography.route` is not an active crossing; existing preparation behavior at settlements and safe paused hexes remains available. The initial proposal for an additional remaining-route lock was rejected and is not part of this feature.

Organizer metadata is optional and lazy. Old and fresh lives render an empty organizer without modifying their equipment object. Initialization and migration must not eagerly add empty metadata. Only a real favorite or saved-loadout mutation creates it. Missing pieces remain named bookmarks after sale/return; applying any unavailable arrangement changes nothing.

## Source architecture

`gear.js` validates the bounded optional metadata and removes favorite references through the existing `discardGear` hook. Presets keep exact missing IDs and display-only name snapshots. `gear-organizer.js` stages a detached complete arrangement by calling the existing `equipItem` operations; it does not implement another equipment rule engine. Application must recheck the authoritative engine barrier and stage against the current state. Failed and no-op commands leave the entire saved state, including notice, unchanged.

Preview must compare the existing full-loadout calculations once against the fully staged arrangement, including set thresholds and actual combat effects. It must not sum single-item deltas. Labels and missing-item names are bounded plain text and must pass through the existing HTML escaping helper whenever rendered.

Local replacement and deletion require an in-game review of the exact preset and a matching current fingerprint. Cancel/Escape and stale confirmations do nothing. Save-slot/life changes clear transient review state. No external approval or new travel policy is introduced.

## Verification record

Development is initially limited to isolated source and lightweight pure tests. Engine integration, full semantic suites, build/release checks, browser QA and publication await their assigned lane. This record will be updated with actual results, not assumed passes.

Isolated source now includes the engine command entry point and Inventory/app wiring. It does not change `equipmentActionReason` and never calls `afterAction` for a bookmark or label. The compact Loadouts disclosure does not add top-level navigation. Favorite filtering is a workspace preference only; favorites and loadouts themselves belong to the life's optional equipment metadata. Modal review and selected preset state are transient and reset on save-slot/life changes.

Lightweight checks: 25 pure core, comparison and renderer tests passed in approximately 0.31 seconds. They include absent metadata preservation, source migration guards, a full 120-instance bag, exact instance identity, missing/sold pieces, stolen provenance, strict shape limits, stale destructive reviews, escaping, and simultaneous three-/five-piece set deltas. Syntax checks passed for changed source and prepared runtime tests. The engine/runtime and delegated-handler test files are prepared but have not yet been executed; aggregate suites, standalone build, release checks and real browser QA remain unrun.
