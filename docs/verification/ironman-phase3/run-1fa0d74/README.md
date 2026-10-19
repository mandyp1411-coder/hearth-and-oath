# Unpublished Ironman phase 3: guarded durable-store source evidence

This is partial source-phase acceptance, not a playable-mode, browser-storage, release or publication certificate. The archive MUST NOT be deployed.

## Exact scope and immutable identity

- Tested clean source: `1fa0d741256645c2ec9ae8c1a446ce3913ccd357`.
- Runtime: `4236bc1625cad23b631ad788dfc5cd265ad5d389991bbfa8ce57a840815b49f9` (624 files).
- Verification inputs: `50feaa604c423469b54ec0ac3be69b54c26395cb247bde122008c6251b7ef2a8` (407 files).
- All three identities matched exactly before and after execution. No production or test edits occurred during the gate.
- Twelve complete whole files: **160 PASS / 0 FAIL**, zero skipped/cancelled/todo. The two new files contain **79 PASS**; the ten existing Standard/cache/recovery suites contain **81 PASS**.
- Every test child was serial at 512 MiB / UV1 / concurrency 1 / TAP. Every numeric exit was 0; each timeout command was authoritatively awaited to terminal; every observed duration remained below its exact approved cap.

## Complete matrix

- tests/ironman-store.test.js: 44 PASS / 0 FAIL, exit 0, 75.578 s / 180 s cap.
- tests/ironman-save-coordination.test.js: 35 PASS / 0 FAIL, exit 0, 85.328 s / 120 s cap.
- tests/save-snapshot-cache.test.js: 6 PASS / 0 FAIL, exit 0, 0.305 s / 60 s cap.
- tests/save-health.test.js: 11 PASS / 0 FAIL, exit 0, 0.277 s / 60 s cap.
- tests/save-concurrency.test.js: 16 PASS / 0 FAIL, exit 0, 4.758 s / 120 s cap.
- tests/saves.test.js: 6 PASS / 0 FAIL, exit 0, 6.979 s / 120 s cap.
- tests/save-snapshot-fixtures.test.js: 1 PASS / 0 FAIL, exit 0, 3.145 s / 120 s cap.
- tests/save-deletion-v40.test.js: 8 PASS / 0 FAIL, exit 0, 15.291 s / 120 s cap.
- tests/winter-levy-aftermath-store.test.js: 4 PASS / 0 FAIL, exit 0, 8.312 s / 180 s cap.
- tests/save-conflict-ui.test.js: 11 PASS / 0 FAIL, exit 0, 16.786 s / 180 s cap.
- tests/save-health-ui.test.js: 10 PASS / 0 FAIL, exit 0, 8.322 s / 180 s cap.
- tests/reliability.test.js: 8 PASS / 0 FAIL, exit 0, 53.365 s / 180 s cap.

Summed file wall duration was 278.446 s. This is an observation, not an ETA or a whole-suite certificate.

## What the selected checks establish

The new suites exercise the actual createSaveStore/createSaveCoordinator APIs and actual engine validation/migration on published fictional adult fixtures, with explicitly controlled battle/stat/progression boundaries. They cover dedicated atomic per-run state/floor/attachment records, exact stale and ownership tokens, admitted lock callbacks, controlled unlocked-Standard-write interleavings, prefix discovery, archive/delete/reattachment, marker-first terminal ordering, failure/readback behavior, consumer purity and preservation of unrelated durable bytes. The coordination manager and storage failures are controlled in-memory test models; this does not prove every concurrent schedule or an actual browser lock/quota/crash behavior. The raw-token ABA limitation remains explicitly tested and disclosed.

The existing Standard suites retain their original assertions for three-slot persistence, mirror-first rollback, no-lock fallback, exact unfinished legacy snapshots/backups, cache invalidation, conflict/export/health handlers, and recovery after invalid results or quota failure. The controlled size-limit case observed a 1,999,500-character source, a genuine 276,825-character reply after pending-snapshot release, and rejection of a separately controlled 2,009,739-character oversized state. These are actual test observations, not capacity expansion.

## Limits and preserved debt

- Source-only partial Ironman phase 3, not complete mode or release acceptance.
- No session/creator/UI opt-in integration was executed; existing UI suites exercised Standard handlers only.
- Storage/lock failures and interleavings were controlled in-memory scenarios, not actual browser quota, cross-tab, native Web Locks or crash certification.
- No offline build, compiled checker, native/browser/AT, native save, publication or deployment was executed.
- Historical lineage/dialogue/followup failures remain separate unresolved debt, not current passes or waivers.
- No whole-game/full-software-gate certificate; no previous execution credit reused.

The previous phase 2 matrix remains separately recorded as 258 PASS / 3 FAIL with an exact accepted-phase-1 lineage baseline comparison. Those failures are not relabeled or absorbed here. No baseline comparison or waiver was requested, executed or used in this phase.

## Durable evidence and provenance

`source-logs-and-receipts.tar.gz` contains all twelve exact raw TAP logs, numeric exit files and individual receipts; complete frozen inputs and before/after reports; and the executed receipt-command pattern. `checkpoint.json` records every archived member byte count and SHA-256. Every member was decompressed and compared byte-for-byte to its original. `SHA256SUMS` hashes the archive, checkpoint and this README, excluding itself to avoid a cycle.

Two pre-test invocation errors are disclosed in an explicitly transcribed note, not represented as original raw transport logs: a JavaScript receipt-string construction error and an inner-shell quoting/syntax exit 2. Both occurred before any test child; only ignored invocation quoting was corrected. Exactly twelve test children then ran, once each. No failure was retried or reclassified.

This evidence contains only checked-in/generated fictional game fixtures and source-test output, not real user saves, credentials, environment dumps or personal information. Archive creation and hashing do not rerun tests. Evidence documentation is prepared after the tested commit and will be committed separately by root; that later documentation commit is not retroactively the tested source HEAD. No generated artifact or dist file was added or rebuilt.
