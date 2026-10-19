# v0.45.1 narrow-counter correction

This is a bounded responsive follow-up to v0.45.0, saved version 68 / source `66b58c100e945b765ef86e68b410935779ba999d`. The first live changed-stylesheet QA confirmed exact 1.5× counter font ratios at 150% reading size but also exposed an actual reflow defect: at a measured 320×380 CSS viewport, real Chrome 200% zoom and 150% reading size, a selected merchant description collapsed into a narrow text sliver beside its 76px art and action button. The inspector was 4,127px tall, despite the document having no horizontal overflow.

The correction changes only the selected-item description's narrow flex basis below 700px. Its first row reserves the unchanged 76px artwork and 16px gap beside the description; the existing wrapped flex layout moves the action button to the next row. No art, palette, base font size, game accounting, save schema, handler or audience changes are included. Version labels distinguish this corrected stylesheet from v0.45.0.

Source verification: `node --test --test-concurrency=1 tests/reading-scale-consistency.test.js` passes **37/37**, zero failures/skips, 140.63ms. The added source contract checks that the override stays within the existing narrow breakpoint, leaves the desktop flex/minimum-width rule intact and retains exactly one override. This does not prove browser geometry.

The live browser's DevTools responsive mode was explicitly blocked by organization policy and was not retried or bypassed. Ordinary OS window resizing and real Chrome zoom established measured 320×380 / 390×380 CSS stress viewports. These are short-window stress cases, not portrait-device emulation: at 320×380 the 287px header leaves a 44px main pane. Chrome's ordinary 100% window minimum was 500px, so 320px/390px at 100% zoom is not claimed. No game transaction, save import, replacement or deletion was performed; transient offer inspection was cleared without confirmation. After the first pass, Settings 100% Book serif, Chrome 100% zoom and the original 1188×761 CSS viewport were restored, and the QA life's day/Gold remained unchanged.

Independent read-only review found no blocker and independently reran the lightweight source file: **37/37**, 127ms, clean whitespace. Syntax and diff hygiene checks also pass.

PASS: one serial offline rebuild, then one actual embedded cost/gear verifier against the rebuilt artifact, without a competing heavy process:

```sh
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-cost-gear-v45.mjs
```

The verifier confirms ordered-part/artifact/manifest identity, fee/household-cost separation, read-only affordability, prepaid birthday continuation/current Return, single disposal/payout and full source-engine parity for its three synthetic slots. Networking is forbidden and no requests were attempted. It checks semantic handlers, not rendered CSS geometry. No gameplay implementation changed in this corrective release; the other three retained embedded verifiers and broad gameplay/save tests passed on v0.45.0, and are not represented as rerun on v0.45.1. The complete [original release record](release-v0450.md) retains those exact results and the bounded balance-evidence limitations.

Corrected standalone: **132,242,881 bytes**, **16 parts**, SHA-256 `4f604a973ec01f090115a2dfeb4d575d02c0068392ae3490dd05679f4e984282`.

This record is finalized before publication. Native deployment, live remeasurement of the corrected 320px inspector, remaining craft/action-reason/cost-detail observations and restoration of prior reading/font/zoom/window settings are separate post-publication results. The source contract and semantic verifier alone do not establish rendered acceptance.
