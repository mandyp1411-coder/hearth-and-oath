# Unpublished Ironman phase 2 checkpoint: bf53d89

This is source-only partial-mode evidence, not a complete Ironman mode, full software certificate or release acceptance. No build, storage/session/creator UI exposure, native save or deployment was performed.

## Fresh source matrix

Tested clean source: `bf53d8917bbcc2ec5964829fd772ade75f730485`.
Runtime: `a64ec383e9dfa85fdc3490b2851e69178d4f859fb666496451770ab9f4578305` (623 files).
Verification: `aff8ad047285b0a5627279a0b6207478cd3f269882e021f843fb4908632516eb` (405 files).

All 12 authorized whole files completed: **258 PASS / 3 FAIL**, no skips/cancellations. Eleven files passed. The four Ironman files account for **146 passing cases**, including all 24 new accepted-engine cases. The matrix remains FAIL, not an all-green reclassification. Every test child was serial at 512 MiB / UV1 / concurrency 1 / TAP; actual numeric exits, logs, input hashes and original caps are preserved:

- tests/ironman-engine.test.js: 24 PASS / 0 FAIL, exit 0, 25.822 s / 180 s cap.
- tests/ironman-rules.test.js: 73 PASS / 0 FAIL, exit 0, 0.292 s / 30 s cap.
- tests/ironman-combat.test.js: 26 PASS / 0 FAIL, exit 0, 0.504 s / 120 s cap.
- tests/ironman-validation.test.js: 23 PASS / 0 FAIL, exit 0, 5.375 s / 120 s cap.
- tests/field-treatment-runtime.test.js: 8 PASS / 0 FAIL, exit 0, 6.649 s / 180 s cap.
- tests/party-camp-recovery.test.js: 27 PASS / 0 FAIL, exit 0, 66.868 s / 180 s cap.
- tests/companion-field-assists-engine.test.js: 10 PASS / 0 FAIL, exit 0, 14.071 s / 180 s cap.
- tests/adult-tournament-engine.test.js: 11 PASS / 0 FAIL, exit 0, 24.374 s / 180 s cap.
- tests/household.test.js: 19 PASS / 0 FAIL, exit 0, 63.673 s / 180 s cap.
- tests/identity-personality-v20.test.js: 13 PASS / 0 FAIL, exit 0, 102.591 s / 180 s cap.
- tests/saves.test.js: 6 PASS / 0 FAIL, exit 0, 8.231 s / 120 s cap.
- tests/lineage.test.js: 18 PASS / 3 FAIL, exit 1, 12.055 s / 180 s cap.

Summed file wall duration was 330.503 s. Every duration was within its finite individual cap; this observation is not an ETA or a broader certificate.

## Three retained lineage failures

The failed lineage cases were exactly:

1. Authentic covenant endings/destroyed settlements through adoption, retirement and succession.
2. Public separation preserving co-parent/children/estate and permitting another chosen partnership.
3. Ending courtship without a household pledge and rejecting forged endings.

One separately authorized whole-file run on exact accepted phase1 checkpoint `2f7021757c3e61091b75b21a6d8d6fa7e1291612` reproduced **18 PASS / 3 FAIL**, numeric exit 1 in **11.041 s** within 180 s. Test bytes were identical. Full failure payloads matched after removing only per-failure duration lines and substituting exact worktree prefixes. Line numbers, stacks, assertions, expected/actual values and every other payload byte were retained. These three remain FAIL, not skipped, repaired or waived by this checkpoint. Other prior dialogue/followup debt remains historical and was not rerun here.

## Direct Standard comparison

The approved fixed comparison against exact public `1c98c62ce80958aeb5c3bafe243a672c8bafb17e` passed, numeric exit 0 in **3.986 s** within 60 s at 512 MiB / UV1:

- All 27 ordinary battle/five-command sequences matched.
- The complete existing resolver list matched: 257 cases.
- 1,114 deep/raw and serialized comparisons covered sources, created battle states, action lists, previews, command/detailed results and traces, with input purity.
- Actual legacy-v5 midbattle migration/validation, genuinely offered retreat and accepted resolution matched exactly.
- No output normalization was applied.

The comparison core is byte-identical to the phase1 one-shot script. Only candidate HEAD/evidence paths and exact closed12-file admission were adapted, explicitly retaining the three matched failures. Both sparse baseline trees and the full candidate runtime/verification identities remained unchanged after all processes closed. Sparse baselines intentionally omit bulky art/audio/offline assets and make no baseline artifact claim.

## Previous failed attempt and durable records

`../stopped-4fcc262` preserves the initial **22 PASS / 2 FAIL** attempt and its original test SHA. That failure was not rewritten. Root reviewed a test-only exact three-field expected death-Journal presentation correction; production engine/lineage bytes were unchanged. This repaired checkpoint freshly reran the entire current matrix. No prior passing run is substituted as current execution.

- `source-and-standard-parity.tar.gz` contains all12 raw TAP logs, numeric exits, input/cap/timing receipts, source/final reports and fixed direct-comparison script/results/proof/output.
- `phase1-lineage-baseline-comparison.tar.gz` contains the actual authorized baseline TAP, numeric exit, source identity and complete normalized failure payloads.
- `checkpoint.json` pins archive/member lengths and SHA-256 hashes. Every member was read back and compared byte-for-byte with its original evidence.
- `SHA256SUMS` covers these files except itself, avoiding a hash cycle.

Phase2 covers current exact-person casualty application at accepted engine opening/command boundaries, hero terminal-before-settlement and public mutation guards, nonlethal controls, rejected resurrection/recruitment, next real battle exclusion and natural successor metadata carry. **Durable storage/tombstone transactions, session coordination, creator/UI exposure and release acceptance remain unimplemented/unaccepted.** No offline build, compiled checker, native browser/AT, native save or publication ran. Formal global software status remains NOT RUN. These unpublished partial-mode archives must never be deployed.

Only fictional generated/controlled or published legacy gameplay fixtures are involved. No real personal save, credentials, configuration or unrelated content is included. Packaging ran no gameplay/tests. A later evidence-only docs commit is not retroactively the tested source HEAD.
