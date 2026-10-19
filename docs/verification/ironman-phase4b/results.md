# Ironman app and creator source verification

Tested final integration checkpoint: 9f24f28d60d683ba4ec3edaa6cc1a8d0d89286ae. Production changes are app.js and creator.js only. Engine, combat, store and session production sources are unchanged from edb9a36. Later documentation commits preserve identical runtime and test inputs.

New controlled handler and creator cases: 46 PASS; no failed new feature case remains in the final checkpoint. These use a semantic DOM and controlled storage/Web Lock/failure models. They are not native browser or earned human playthrough acceptance.

| Final checkpoint file | Result | Cases |
| --- | --- | ---: |
| tests/entry-flow.test.js | PASS | 1/1 |
| tests/ironman-app-extended.test.js | PASS | 15/15 |
| tests/ironman-app.test.js | PASS | 23/23 |
| tests/ironman-creator.test.js | PASS | 8/8 |
| tests/save-concurrency.test.js | PASS | 16/16 |
| tests/save-conflict-ui.test.js | PASS | 11/11 |
| tests/save-deletion-v40.test.js | PASS | 8/8 |
| tests/save-guide-integration.test.js | PASS | 2/2 |
| tests/save-health-ui.test.js | PASS | 10/10 |

Earlier unchanged rules and persistence files were checked on 37c8146: Ironman session 73 PASS, store 44 PASS, coordination 35 PASS, rules 73 PASS, combat 26 PASS, validation 23 PASS, engine 24 PASS, Standard saves 6 PASS. Those results prove their recorded scope at that checkpoint. They are not added to historical phase totals or presented as a unique global case count.

Additional prior Standard practice, gear, guide, maze, notes and other whole-file results are retained in the execution index. Each record names its exact checkpoint and input hash. The final checkpoint reruns the save/entry files affected by the same-life autosave fix.

## Preserved failures and repairs

The initial 4e5631f app run was 19 PASS / 3 FAIL. Two failures exposed missing native classList APIs in the semantic test surface; one battle fixture was invalid at birth. The harness was extended and that fixture corrected. The af81747 app run was 21 PASS / 1 FAIL because its oracle tried Continue directly from an ended screen; the test now uses the visible return-to-menu control. Raw failures remain retained.

A real Standard queued-autosave regression was found by save-conflict-ui at af81747. The same-life durability guard was separated from view ownership; the original unchanged whole-file test passes on 37c8146 and the final checkpoint. Standard import also now explicitly releases the previous Ironman binding before adopting a Standard life.

| Baseline comparison file | Candidate failures | Baseline failures | Exact diagnostics after stated normalization |
| --- | ---: | ---: | --- |
| tests/trade-craft-windows-v42.test.js | 9 | 9 | True |
| tests/notifications-v40.test.js | 2 | 2 | True |
| tests/creator.test.js | 1 | 1 | True |
| tests/creator-v16.test.js | 1 | 1 | True |
| tests/lineage.test.js | 3 | 3 | True |
| tests/dialogue-ui-v22.test.js | 4 | 4 | True |

Matched baseline failures remain FAIL. Normalization removes only failure duration_ms lines and replaces the two exact absolute worktree roots. Assertions, expected/actual payloads, line numbers and stacks remain. Complete raw candidate and baseline outputs, hashes and comparisons are retained. Earlier conversation-followup failures were not rerun; the historical session SIGKILL remains undiagnosed and is not erased by later passing runs.

## Unfinished release acceptance

The final inventory discovers 243 whole test files and 24 offline check scripts. This bounded effort observed 28 distinct current-source whole files across its named checkpoints. The remaining full regression inventory is NOT RUN, not PASS. The all-test software gate is not certified.

Native hosted and actual standalone behavior, real reload/two tabs, browser storage and lock failures, input/drag/touch/focus geometry, physical-device and assistive-technology acceptance are BLOCKED by missing supported browser tooling. Semantic tests do not substitute for them.

Offline/hosted release builds, compiled-handler acceptance and public deployment are NOT RUN. No new release is accepted. Public v0.55.3/native 86 remains unchanged. The source is retained for the required native and full release follow-up. Story expansion, party recovery balancing and the separate repair backlog remain outside this increment.

## Evidence format

execution-index.json records command, source/file identity, cap, heap, duration, exit code, observed status and raw-output hashes. Runs are finite, serial, UV_THREADPOOL_SIZE=1 with 512 MiB Node heap. Each TAP output is preserved losslessly as .tap.gz; decompression reproduces the indexed raw SHA256. No timeout or signal was observed in these new runs.
