# v0.55.0 scoped Winter Levy aftermath checkpoint

This is selected release evidence, not a full software gate or publication receipt.

## Exact tested scope

- Tested clean source: `0afb8f527dbb5120ef4ef8ac822af67b369123bd`.
- Recovered published baseline: `3fede94833074a9ed55c9ba8b37625830a972074`.
- Thirteen complete source files: **171 PASS / 6 FAIL**, zero skipped/cancelled, eleven passing files and two failed files. Every declared file cap was respected.
- All three new feature files: **46 PASS / 0 FAIL**. Existing followup and lineage failures remain failures. All six exact failure payloads matched actual runs of their unchanged tests on the recovered baseline after only timing/location metadata and worktree-prefix normalization.
- Build: PASS, exit 0, 64.385 seconds within 300 seconds at 1536 MiB / UV1.
- Focused compiled checker: PASS, exit 0, 16.389 seconds within 300 seconds at 1536 MiB / UV1 / exposed GC. Its five actual embedded-handler scenarios reported zero attempted network requests.
- The formal software gate is **NOT RUN**. The separate global quality task remains pending. Browser layout, native download and screen-reader checks were **NOT RUN at this gate closure**; later root QA, if performed, needs its own evidence and must not relabel these original receipts.

The rebuilt artifact is 133,092,174 bytes in sixteen ordered parts, SHA-256 `828d1c56868105315eeb7370d15dad6947f88076888dbc8d0e238b428e6cc438`. Its manifest truthfully retains the clean tested source commit as producer. Exact runtime, verification, loader, manifest, part and artifact comparisons passed before and after the compiled checker.

## Durable evidence and integrity

`checkpoint.json` supplies every archive/member hash, exact source/build identities, per-file caps/results, and the six baseline-qualified failure names. `SHA256SUMS` covers this README, that checkpoint and all archives. It intentionally does not hash itself, avoiding a hash cycle.

- `scoped-logs-and-receipts.tar.gz` preserves exact current source TAP, numeric exit files, individual receipts, source snapshots, final source matrix, build output and the focused compiled-checker receipts.
- `baseline-logs-and-comparisons.tar.gz` preserves the actual baseline TAP, numeric exits, immutable sparse-source identities, comparison payload hashes and reports. Omitted bulky art/audio/offline assets are explicitly disclosed; this is source differential evidence, not baseline artifact acceptance.
- `prior-fixture-failure-receipts.tar.gz` preserves the earlier failed fixture attempts at ae2c59b and 7ab5a1c. These historical failures are not mixed into the final source counts or silently relabeled as passes.

Archives contain only existing generated/checked-in fictional game-fixture evidence, not real user saves, credentials or configuration dumps. Archive creation and round-trip member hashing do not rerun tests or provide additional gameplay evidence.

## Documentation versus tested commit

This tracked preservation and generated output will be recorded in a later commit. That later commit is not retroactively the tested source HEAD. Tests and runtime were verified at the explicit commit above; all original receipts keep their original hashes, timestamps and outcomes. The artifact's producer metadata is not rewritten merely to match a later documentation/generated-output commit.

No lost Ironman, detached-file session, capacity-expansion or broader pre-reset 0.55 feature/fix is claimed restored here. This release adds only the reconstructed connected Winter Levy aftermath on the recovered v0.54 baseline.
