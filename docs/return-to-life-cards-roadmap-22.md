# Return-to-life saved cards (roadmap 22)

Source-only candidate based directly on roadmap 20 (`625ffc6c327ef22974f0afefa57aec3f79cac91f`). Published main remains `1959103`. This slice changes saved-life presentation only. It does not change simulation rules, slot persistence, schema, conflict tokens, or replacement/deletion behavior.

## Player-facing changes

- Each occupied one of the three independent rows shows one actual unfinished moment, when one exists: encounter, decision, reply, descent, sentence, road, workshop project, working commitment, canonical life commitment, or a year in progress. Higher-priority interruptions take precedence; a card never invents a next activity or displays a list of competing pending claims. Retired and otherwise settled lives make no pending claim.
- Every occupied row has a small native Export button beside, not inside, the Return/Replace button. Exporting neither opens the life nor advances time. Its accessible label and title identify the exact person, slot, and target. The current active game exports its latest playable session; other slots export this tab's local slot copy. A failed/conflicted copy is not relabeled as durable. The existing direct JSON download handler remains unchanged.
- The canonical roadmap 20 browser-health readout remains authoritative. Its durable timestamp is labeled Last saved, never Last played. The schema has no separately recorded last-played time, so this slice does not manufacture one from an attempted write, current clock, or file import. A durable older save lacking a valid timestamp says Save time unavailable; a never-saved session says No successful browser save yet.
- Unsaved cards explicitly identify latest-session or unsaved-copy content separately from the durable timestamp. Stale conflict-only cards identify this tab's older copy. The normal health label, timestamp, failure-only live region, and unload protection are unchanged. Quiet asynchronous health changes update source notes and timestamp text in place rather than detaching focused controls.
- The always-visible row Export replaces the otherwise duplicate failure-area export only on that card. Title, play workspace, and game-menu export escapes retain their existing default behavior. JSON exports are separate file copies and never assert browser-save success or cloud synchronization.
- Empty load rows remain disabled and have no export/delete controls or successful-save claim. Empty new-life rows remain creatable. Delete and replacement continue through their existing explicit reviews; canceling those dialogs changes no slot.

## Bounded implementation and preservation

The new `return-life-cards.js` adapter reads saved fields and injects the existing `getLifeCommitment` reader. It has no state ledger, clock, mutation, persistence, world serialization, or world cloning. The saved-life screen reuses its existing single `saveStore.list()` private copy; the active session is read directly when present. No new save-store API exposes internal references.

The app changes are limited to the helper import, in-place health/source-note presentation, saved-life row rendering, and slot-screen copy. The existing export handler, load coordination, imported-save validation, protected backups, deletion/replacement review tokens, neighbor merge, cross-tab locking, and dirty-session exit guard are untouched. Styles are scoped to the existing card controls and summary lines, with native buttons and the current scrollable slot list retained.

## Evidence completed

- `node --test --test-concurrency=1 tests/return-life-cards.test.js tests/save-health.test.js`: 17/17 passed, no failures/skips, 0.23 seconds. These are small pure/source contracts without engine imports. Seven new cases cover real-context priority, immutable same-source commitment reads, three independent labels, live/unsaved/stale distinctions, known/unknown/never-saved timestamps, non-duplicated health exports with preserved live regions, and unchanged direct export/native control/source boundaries. Ten existing roadmap 20 health contracts also pass.
- After the v0.48 integrator explicitly released all heavy work and roadmap 21's preceding batch exited, `node --test --test-concurrency=1 tests/return-life-cards-ui.test.js` passed 6/6, no failures/skips, exit 0, in 7.083 seconds on source `6bac8890edaf4ac38821797538be60f9ca17fe6f`. The shared lane was released to roadmap 19 immediately after this terminal result. These cases establish three independent saved rows/timestamps and actual decisions; empty/create behavior; Enter/Space and repeated direct exports with focus retention; exact unsaved active-session versus neighboring-copy exports without durable writes; download-failure preservation; and unchanged deletion/replacement review cancellation.
- Module syntax checks pass for app, save health, new adapter and prepared semantic tests. `git diff --check` passes.

## Outstanding gates

The six new semantic handler cases are green on the source candidate, not on a built or published aggregate. A release integrator should also rerun the directly affected roadmap 20 health/conflict cases against the final combined source after reconciling roadmap 21:


```
node --test --test-concurrency=1 tests/return-life-cards-ui.test.js tests/save-health-ui.test.js tests/save-conflict-ui.test.js
```

Source-only contracts are not browser, layout, download, assistive-technology, or full regression acceptance. Release verification still needs long names and contexts, all three occupied cards, known and legacy dates, narrow/short viewport and maximum reading-size overflow, native keyboard focus and repeated exports, an actual downloadable JSON file, unavailable storage, stale/deleted conflicts, and unchanged delete/replacement safeguards. Integrate this slice with roadmap 21's first-day-guide delta (`4f369b2` atop roadmap 20) before final aggregate checks. Only the owning release lane may rebuild offline/module manifests, verify final packaged-source parity, or publish.

No browser, build, publication, main mutation, or full historical regression suite was performed by this worker. The only engine-importing work was the explicitly serialized six-case semantic batch above.
