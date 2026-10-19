# Unpublished Ironman phase 4A: stopped SIGKILL attempt

This is a failed/incomplete source-phase execution, not session acceptance, a full test result, or a release/publication receipt. The archive MUST NOT be deployed.

## Exact frozen inputs

- Tested clean source: `dbec3c92649f2dd4a015b5f486a95196da34118b`.
- Runtime: `e21c05154782a82bcc00163d323b91b9da4825fd120712d7db00e75b46ba4726` (625 files).
- Verification: `49f1c25738041c2bfafc6877d4c7f29fe47ee863bf9156ef220accaefd81c447` (408 files).
- Source, runtime, verification and every selected file matched exactly before/after the stopped execution. All tracked dist/package/scripts/tests/release-contract dependencies were exact to accepted phase 3 except the new session module and test; earlier passes were not reused.

## Actual execution outcome

- Only tests/ironman-session.test.js started, with a single 360-second whole-file cap at 512 MiB / UV1 / concurrency 1 / TAP.
- The test child was reported as **SIGKILL**; its awaited Node test parent/timeout command exited **1** after **95.457 seconds**, below the cap. Original authoritative session: 84546.
- Raw TAP contains only one failed file-level ERR_TEST_FAILURE wrapper, reporter totals tests=1/pass=0/fail=1, no skipped/cancelled/todo. It contains no individual case verdicts or assertion stack.
- The authored 73 session cases receive **no individual PASS or assertion-failure credit** from this attempt.
- Cause is **UNDETERMINED**. The observed SIGKILL does not by itself prove out-of-memory, a specific assertion defect, or timeout exhaustion.
- The gate stopped immediately per authorization. No retries, heap/cap changes or baseline waivers occurred.

## Explicit NOT RUN remainder

- tests/ironman-store.test.js: NOT RUN; original approved cap 180 s.
- tests/ironman-save-coordination.test.js: NOT RUN; original approved cap 120 s.
- tests/save-concurrency.test.js: NOT RUN; original approved cap 120 s.

## Evidence integrity and limitations

`failed-source-receipts.tar.gz` preserves the exact raw TAP, numeric exit file, per-file receipt, complete source-input snapshot, stopped before/after report and executed receipt-command pattern. `checkpoint.json` gives every member byte count/SHA-256. Every member was decompressed and compared to its original byte-for-byte. `SHA256SUMS` hashes this README, checkpoint and archive, excluding itself to avoid a cycle.

No source/test edits, extra game processes, build, compiled checker, browser/native save, UI/creator exposure or deployment were performed. The existing accepted phase 3 records remain separately preserved historical evidence, not current three-file pass credit. All modeled-storage and partial-mode limitations remain. No full-game/global software acceptance is claimed.

Evidence files contain only fictional checked-in/generated game-fixture test output, not real user saves, credentials, configuration dumps or personal information. Archive hashing does not rerun tests. A later root documentation commit does not retroactively change the tested source commit above.
