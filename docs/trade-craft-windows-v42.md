# At the Counter and the Workbench · v0.42.0

The Materials Merchant now opens the same barter workspace as the other merchants: illustrated stock and your carried inventory, item inspection, staged goods, exact credit and Gold totals, Clear Offer, and a single confirmation. Visiting, searching, inspecting, choosing and leaving spend nothing. The Work Steward remains responsible for work and commissions.

Material stock is the existing ore, cloth, timber, stone, hide and crystal. Each purchase remains one three-unit bundle, at 12/6/6/6/15/27 Gold respectively, and consumes one real day. Choosing another bundle replaces the requested bundle. One bundle per confirmed collection preserves the existing daily/birthday interruption boundary; it does not silently deliver a multi-day order before its time is spent. Ordinary unequipped gear and honestly recovered treasure may pay for the order using the established barter credit. Equipped and stolen goods remain excluded, and carried materials themselves are not newly made saleable.

The Craftsperson begins with a situated conversation and a dedicated workbench. Its design inventory has Equipment, Construction, Patterns and Other Work, with search and equipment slot/finish filters. A selected design shows the actual output, fee due now, time, relevant skill/workbench requirements, and each material's required and owned amounts. Legacy equipment belongs beside newer equipment, with its actual ingredients, rather than being hidden as an unrelated service. Locked designs explain their requirements; no input is spent while browsing.

Craft, Build, Study Pattern and Begin Work use the original engine actions, not a second production system. Standard and learned fitted patterns retain their original outputs, bonuses, fees, materials, time, quality and skill gains. Completed gear goes into Inventory without changing the equipped loadout. Construction retains the single-home rules. Special long commitments show their full duration rather than zero days at initiation. Other services with special terms preserve their description rather than claiming unknown material costs are free.

Existing interrupted workshop projects show their saved remaining days and can continue without a second fee or material deduction. Cancellation retains the existing loss of committed inputs and no unfinished output. Closing the workbench, leaving the artisan, changing location, navigating away or loading another life does not commit a selected design. Artisan identity, life, day, resources, ownership, workbench and current offer are rechecked; detached old confirmation buttons cannot trigger another craft.

No save schema changes, migration rewrite, new economy prices or balance adjustment are introduced. Existing merchant, family, home, commission and project identities remain intact.

## Verification

See the release verification record for final command outcomes and live browser coverage. Focused tests cover every material price/time/output, barter credit, invalid/stale quotes, provider/calendar/resource gates, real UI handlers, browsing/cancellation/navigation, legacy recipes, costs and full durations, exact engine crafting, stale confirmation rejection and interrupted-project reload/continuation. Existing Home/recovery, shared barter, workshop, work/commission, merchant and world-first UI tests remain regression constraints.

The offline verifier exercises the actual built standalone UI and delegates with network requests forbidden. Semantic DOM/VM checks verify commands and state, not browser geometry or physical touch behavior. Production visual QA uses only the separate QA life through ordinary game actions, without importing or replacing saves.

### Final prepublication checks

- 140/140 focused tests passed on the final implementation: dedicated trade/craft windows, general barter, Homes/household ownership and rest, work/commission separation, workshop production, world-first UI, local merchants and interface consistency.
- All edited JavaScript files pass `node --check`; `git diff --check` is clean.
- `npm run build` regenerated the actual standalone game and all 16 hosted parts.
- The actual embedded work/trade/craft verifier passed with network forbidden, including staging, exact purchase terms, saved commission continuity, design inspection, real crafting and stale confirmation rejection.
- The actual embedded Home verifier passed with network forbidden, including upgrades, rest, caregiver continuity and stale confirmation safety.
- The full established interface/art verifier passed with network forbidden. The standalone is 132,172,317 bytes, SHA-256 `65531575b01a8262022fdfba677a49ec965843d25161af919c8c427981dc9221`; its parts match the artifact byte-for-byte. See `verification-v0.42.0.json`.
- Independent review findings about birthday collection gates, legacy ingredients, full commitment durations, malformed quote safety, barter funding and keyboard focus were corrected and rechecked before publication.
- This is focused release coverage, not a claim that the entire historical test collection was rerun or is all green. Production browser geometry and ordinary QA gameplay are verified separately from these semantic/VM checks.
