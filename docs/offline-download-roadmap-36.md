# Offline download feedback, roadmap 36

Source checkpoint based on published v0.49.1 (`99e19bd`). Publication and full release certification are separate.

## Implemented

- The drawer shows the validated total payload size in exact bytes (and MiB for larger files), received/reassembled bytes, and completed parts. Unknown size stays indeterminate until the manifest is validated. Browser cache use is explicitly uncertain; these are not claimed network-transfer percentages and there is no invented ETA.
- The backward-compatible `loadOfflineGame(fetcher, { signal, onProgress })` reads serial part streams when available and retains the historical array-buffer fallback. It never decodes individual UTF-8 parts. Parts must be unique and ordered, their sizes must sum exactly, and an untrusted manifest cannot request more than 512 MiB or 32 parts.
- Abort applies to manifest fetch/JSON, part fetch/body, and blocked reader operations. Cancellation rejects promptly, cancels/releases readers, and cannot return a complete Blob. Retry restarts with a distinct token. A late old request cannot update the new panel or trigger a file download.
- The drawer is updated in place, not through a game transition or whole-app render. A dedicated polite live region announces phase/size and at most three progress milestones, rather than every byte callback. Cancel/retry remain keyboard controls with focus retained when availability changes.
- Only a complete HTML Blob reaches the URL/download handoff. The browser, not the game, decides whether saving finishes. Each created URL is revoked by its own delayed callback.
- Local-file re-download never requests hosted parts and still rebuilds from the initial boot shell plus static head/scripts, never a live character or save UI. A local file missing its inline module fails safely rather than silently fetching the website.

Runtime validation continues to check exact byte sizes. Schema-2 checksums and provenance remain mandatory in the independent release gate; the runtime does not claim checksum verification. No artwork, music, save format, gameplay state, boot guard, or source-to-bundle build logic was removed.

## Focused evidence and remaining checks

`node --test tests/offline-v16.test.js tests/offline-download-progress.test.js tests/boot-recovery.test.js`

Initial focused run: 33/33 PASS in 0.20 seconds. These are pure loader/model/semantic panel and extracted production-helper checks, not a mounted app, compiled artifact, browser or screen reader. The existing boot regression executes the unchanged startup guard and checks that a local re-download preserves it and excludes private live markup.

`tests/offline-download-app.test.js` is prepared for the parent's serialized engine lane. It mounts the real app/module graph and checks actual drawer progress, cancel/retry, duplicate activation, close/reopen, switching the active slot, exact output bytes, and byte-identical durable saves across download-only operations. It is NOT RUN at this checkpoint.

Full source/embedded integration, regenerated-artifact identity, current complete art/music parity, browser layout/native download/cancellation and assistive-technology behavior remain NOT RUN here. Parent integration/publishing owns those checks; this source change alone is not full certification.

## Mounted-test fixture correction

The parent's first serialized run of `tests/offline-download-app.test.js` at `d27e560` failed 0/2 before mounting the app. Both failures were the fixture's `validateSave(life)` assertion, so none of the drawer flow assertions executed. Canonical migration had returned a valid life; the test then incorrectly renamed only `hero.name`. Production `validateLineage` (`dist/js/lineage.js`) requires the active hero record's name to match that field, and the captured lineage still correctly held the original name.

The correction uses the untouched canonical migrations of the recorded `base` and `offsite` lives. These captures have different recorded days and state while preserving all original names and lineage relationships. Slot switching is asserted by the exact second life and durable active-slot ID, not a test-only rename. No production validation, save gate, or fixture payload was changed. The corrected mounted tests are prepared for the parent's rerun and remain NOT RUN here.

## Composed single-announcement correction

Current source review found that the drawer's dedicated polite status and global live toast both announced ready/error/cancel. The narrow integrated UI correction lets a mounted download panel own those outcomes; the global toast is a fallback only when the panel is absent. Actual handler tests require the mounted panel status with no global duplicate for all three outcomes; extracted actual-helper tests count one intended assignment and unchanged focus, while stale old-token completion cannot announce. No loader, game, save, focus, practice/modal ownership or whole-app render behavior changes. Screen-reader testing is not claimed. Final composed runtime acceptance remains pending.
