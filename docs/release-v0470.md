# v0.47.0 save-path integration verification

## Scope and preserved contracts

Roadmap ID15 only, integrated on published v0.46.0 source `4c8f38c3f103a7977d8b6e86a74e2a33d22906a0` (PUBLIC Site version 70). The performance commits `ebe3566`, `ef03b6f` and `7b71996` integrate as `4bc4fc0`, `9fe3fd6` and `8481418`. The only behavior-changing runtime module is `saves.js`; app/package labels identify the new release. No mechanics, fees, rewards, history pruning, save fields, migrations, content, art, account, security, sharing or real-data export change is included.

The one-envelope private cache is keyed by exact durable envelope and legacy-mirror strings. Both keys are still read before every cache hit. Incoming state always validates, changed durable bytes fully migrate, mutation drafts and public results remain detached, failures invalidate, and explicit reload/reviewed replacement/deletion force fresh validation. Commit caches the actual durable value, not local unsaved overlays. Target revision and strict deletion tokens, Web Locks, rollback, backups and exact unsaved export remain in force.

Independent parent source review found no safety defect in the cache and surrounding latest/checkTarget/commit/adopt paths. That is source review, not runtime proof. Source syntax and whitespace checks pass. The retained offline continuity checker now accepts the current v0.46-or-later release while still requiring the package/manifest/artifact labels and byte identity to match. Its existing behavior assertions are unchanged.

## Measurements and limits

The retained controlled experiment measured clean baseline `8adb064` against isolated cache candidate `ebe3566`, with only `saves.js` differing in the runtime graph. One warmup and three measured samples per case passed the predeclared Node-only gates. Three-life/three-backup writes had medians 871.1 → 397.9 ms (54% lower); repeated writes 865.3 → 388.4 ms (55% lower). Incoming migration and durable reads remained mandatory. The cold-store/title-save-preparation median for the larger envelope rose 819.8 → 855.3 ms (+35.5 ms / 4.3%), within the predeclared bounded tolerance. These are Map-backed Node save-store measurements, not browser boot, DOM, localStorage disk, device responsiveness or whole-action speed promises. Complete source-bound samples and provenance are retained in [the ID15 record](save-performance-roadmap-15.md).

The cache runtime source is unchanged from the measured implementation; current integrated correctness must still pass independently. No new benchmark is inferred from browser tool round-trip time.

## Planned serial correctness and artifact gates

The isolated focused source run passed 56/56. Final current-source execution at clean `c2ee46d32b9c632422303b309f1497074ce551ff` passed **88/88**, zero failures/skips/cancellations, in **104.6 seconds**: the 56 save/cache/conflict/deletion/reliability cases plus 20 keyboard and 12 boot cases. This is a focused current-source gate, not a complete historical-suite pass. The following commands were serialized, with artifact checks following the build:

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/save-snapshot-cache.test.js tests/save-snapshot-fixtures.test.js tests/saves.test.js tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/save-deletion-v40.test.js tests/reliability.test.js tests/keyboard-feedback.test.js tests/boot-recovery.test.js
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-saves-v431.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-continuity-combat-v46.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-cost-gear-v45.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-journal-maze-v44.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-followups-v43.mjs
```

The save verifier adds actual compiled-graph cache contracts using real generated game lives: six cold migrations, one mandatory incoming warm migration, both actual durable key reads, complete unchanged metadata/history, private-copy isolation, full external neighbor/mirror invalidation, quota rollback/retry and explicit reload. Existing actual-handler neighboring-slot conflict, unsaved export, explicit recovery and finite Second Wind checks remain unchanged. These checks execute the downloaded graph, not an extracted replacement cache implementation. Network remains forbidden.

One 1536 MB build passed at source **`208596c63cf8beb65751a3bbcea4305fe7a0feac`**, producing **16 parts**. All final exact-embedded checks passed serially: strengthened cache/save/conflict/export **11 groups**, continuity/combat/boot/re-download **14 groups**, cost/gear **11 groups**, Journal/maze **9 groups**, and the remembered follow-up/receipt checker. Network was forbidden throughout. The standalone artifact and ordered parts are exactly **132,273,086 bytes**, SHA-256 **`24ef2d9855042800807bdabb8a66492b25b9e0a83d91d75b9c668765c333ea80`**. The actual file re-download handler produced its expected save-free static shell and identical scripts: **132,273,055 bytes**, SHA-256 **`84b8cc6fe097ba90b4dcc3b2e918ac6252de3a738cd13e32efaff54cbd21bc84`**. The generated parts/manifest are committed with this evidence. Subsequent changes are documentation/output only; no repeated build is needed for those unchanged runtime inputs.

The cache runtime blob is **`16520f745888c7829041579f2c1094f637cb6a14`**, exactly the measured `ebe3566` implementation. These are actual current artifact/handler correctness results, not a new timing experiment. A complete historical suite pass, ID11 completion, browser timings, screen-reader speech and physical-device behavior are not claimed.

## Publication and browser follow-through

Pending final gates: preserve the existing PUBLIC audience and same URL, publish the supported helper's exact pushed source/archive, and verify loaded v0.47.0 plus an ordinary manual save/reload without advancing or replacing QA Aster. Retain age 18, 15 Gold, 11 Thaw / Year 19, Health 56/56, Focus 31/31, Joy 91%, Stress 1%, original view and 100% Book serif settings. Do not import, inject state, delete, replace, progress time or perform a transaction merely for QA. Post-publication evidence belongs outside main so main remains clean at the exact published source.
