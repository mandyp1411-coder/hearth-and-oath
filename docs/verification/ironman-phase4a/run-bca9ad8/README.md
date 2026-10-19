# Unpublished Ironman phase 4A: complete source acceptance retest

This is scoped DOM-free session source acceptance, not a complete Ironman mode, UI/store-in-browser, full software or release certificate. The evidence archive MUST NOT be deployed.

## Exact immutable inputs

- Tested clean source: `bca9ad8e1b51419dcc544efc5d4e81d3ccc8cf1b`.
- Runtime: `e21c05154782a82bcc00163d323b91b9da4825fd120712d7db00e75b46ba4726` (625 files).
- Verification: `f6542685fa543b6bfec9b38fd9fd6de33b69b164665853499119baba283ca484` (408 files).
- Production session module: a4bd047f5f4199f484ffde121c1551747ce0d5644d77ae60fd29afabd5c6edd7, unchanged from the stopped attempt.
- Reviewed repaired session test: 987a98e8413aec8301bb7cda4783b9d7739a1bd423326731f4d4d12ec0f65666, all original 73 cases.
- Source/runtime/verification matched exactly before and after. All tracked runtime/test/script dependencies outside the new session module/test remain exact to accepted phase 3. No inputs changed during execution.

## Fresh complete whole-file results

All four authorized original whole files ran freshly and unfiltered: **168 PASS / 0 FAIL**, zero skipped/cancelled/todo, every numeric exit 0. No diagnostic subsets or older executions supplied acceptance credit. Children were serial at 512 MiB / UV1 / concurrency 1 / TAP; every observed duration remained within its original cap.

- tests/ironman-session.test.js: 73 PASS / 0 FAIL, exit 0, 133.675 s / 360 s cap.
- tests/ironman-store.test.js: 44 PASS / 0 FAIL, exit 0, 76.960 s / 180 s cap.
- tests/ironman-save-coordination.test.js: 35 PASS / 0 FAIL, exit 0, 77.638 s / 120 s cap.
- tests/save-concurrency.test.js: 16 PASS / 0 FAIL, exit 0, 3.940 s / 120 s cap.

Summed file wall duration was 292.213 s. This is an observation, not an ETA or a whole-game claim. All authoritative sessions closed normally; every timeout command was awaited to terminal.

The 73 session cases cover reservation before lock admission, exact detached adoption, once-only casualty/fatal effects, uncertainty/retry/invalidation, guarded synchronous consumers, explicit lifecycle and authority choices, and exact stored-orphan recovery using the actual accepted store/coordinator/validator. Storage and lock races are controlled in-memory models, and combat/state boundaries are explicitly labeled fixtures. App and creator wiring is absent, so these are not actual user-interface or native-browser tests.

## Resource observation and earlier failures

The whole session file ran with same-launcher read-only /proc observations every second. The archive preserves all 134 observations, including PID/PPID/start identity, command, CPU times, RSS and reported process VmHWM. Maximum sampled individual RSS was 431,056 KiB; maximum observed individual VmHWM was 449,208 KiB. Per-process samples/HWM are not a combined/guaranteed peak, a heap-use measurement, proof of the earlier kill cause, or exhaustive orphan-absence proof.

The original dbec3c92 whole-file SIGKILL remains failed/incomplete with its cause undetermined. The isolated case42 assertion failure remains FAIL. Its sorted-key/callback-observability oracle repair and reduced test-history allocation were separately reviewed; no production change was made. The old raw logs and all five earlier failure/diagnostic evidence indices were rehashed unchanged. This fresh success does not retroactively relabel any older outcome or claim the exact cause of the original SIGKILL.

## Limits

- Unpublished partial phase 4A DOM-free session source acceptance only; not complete Ironman or release acceptance.
- No app/creator/store production change occurred in this phase; existing dependency suites were freshly rerun, not credited from older runs.
- No app/creator/UI binding, actual browser Web Locks/quota/cross-tab/native save, build/compiled checker, browser/AT or deployment was run.
- Fixtures use controlled in-memory storage/lock schedules and explicitly labeled combat/state boundaries, not an earned-life or exhaustive concurrency/balance claim.
- Earlier full-file SIGKILL and isolated case42 FAIL remain unchanged historical evidence; the old SIGKILL cause remains undetermined.
- Fresh unfiltered whole-file results alone supply this acceptance retest; earlier diagnostic subsets supply no passing credit.

## Durable raw evidence

The archive preserves eighteen exact frozen-input, raw TAP, numeric-exit, per-file receipt, executed command-pattern/monitor script, process-observation and final identity/report files. Every archive member was decompressed and compared byte-for-byte with its original. checkpoint.json lists each member SHA-256/size and all exact identities. SHA256SUMS covers this README, checkpoint and archive without hashing itself. No actual user saves, credentials, configuration dumps or personal information are included.

These evidence docs are prepared after the tested source commit. A later root documentation commit is not retroactively the tested source HEAD. No production/test/generated edit, offline build, compiled checker, browser/native-save action or deployment occurred during this gate.
