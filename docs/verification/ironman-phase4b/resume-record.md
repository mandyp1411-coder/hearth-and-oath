# Ironman app and creator integration resume record

The owner requested implementation from the attached development handoff on 18 October 2026. This resumes the bounded app and creator phase. Story expansion and party recovery design remain separate work.

The restored remote source is edb9a36dd6544f3d8de89dc262edc9a7e1f3ad3c, also retained by local branch preserve-ironman-resume-edb9a36. The working tree was clean on restore. The three later paused files listed in the handoff were not present in this committed source: app.js has SHA256 63bd6959dd3a61084ac63f756aa1051c43f9fbbaa1cb91956fb129307e607493, and both new test files were absent. Their unavailable exact contents have not been claimed recovered or overwritten. Integration was reconstructed against the preserved checkpoint and documented contract.

Production edits are limited to app.js and creator.js. A narrow additive test-surface change supplies actual Storage enumeration/removal and explicit touch-hold timer flushing. The engine, durable store and session are unchanged.

The finite source sequence uses a 512 MiB Node heap, UV thread pool 1, test concurrency 1 and TAP output. The new app file has a 240 second cap and creator 180 seconds. Relevant Standard handler files have 120 seconds each, with entry-flow 180 seconds. Earlier session/store/coordination/concurrency have 360/180/120/120 seconds respectively. Earlier pure/engine Ironman files have 180 seconds each. Each run must retain source identity, file identity, command, raw output, exit code, elapsed time and any signal/timeout. Failures are preserved before diagnosis; new fixes receive a new checkpoint and scoped rerun.

Browser acceptance is BLOCKED: the managed Linux environment does not provide control-browser; its skill directory is unavailable. Sites instructions prohibit an improvised browser path. Native hosted/standalone, real reload/two-tab/input/drag/touch/focus acceptance is not replaced by semantic handler tests. No Ironman deployment is accepted until the required native behavior is verified. Public v0.55.3/native 86 remains the release baseline.

Existing three lineage failures and v0.55.3 dialogue failures remain recorded baseline debt, not new passes or a whole-game certificate. No test counts across overlapping phases are added together.
