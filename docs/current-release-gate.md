# Current release validation contract (roadmap 11)

## Run one command

From a stable checkout, with no other build/test process changing its source:

```sh
npm run release:check
```

This runs every discovered `tests/**/*.test.js` serially, builds the standalone game once, validates its exact provenance/bytes, and runs every discovered top-level `scripts/verify-offline*.mjs` checker serially. It does not publish anything or touch real browser saves. No package dependencies are needed. It uses the installed Node test runner; Node 18+ is supported by the existing game tests. One large offline VM runs at a time, never in parallel with another checker or build. Allow sufficient memory for the complete illustrated/audio bundle (currently approximately 127 MiB before parsing). Coordinate the heavy lane with other work. Each subprocess has a declared 900,000 ms (15 minute) budget to prevent an unexplained hang from occupying the lane forever. Override only deliberately with `--file-timeout-ms MILLISECONDS`; expiration terminates that subprocess group and reports `ENVIRONMENT BLOCKED`, never PASS. Per-file command wall times and logs support diagnosis and budget review.

For a bundle already built by the current provenance-aware builder:

```sh
npm run release:check -- --existing-artifact
```

That marks the build itself `NOT RUN` (intentionally reused, not part of the required software result), but requires the same strict runtime/build-source identity, package/version, individual part SHA-256, ordered reconstructed SHA-256, byte totals, hosted loader SHA-256 and local standalone SHA-256. An old manifest without provenance, an old version, stale source, changed media or changed builder is a failure, not permission to reuse an artifact. The existing versioned checker scripts are additional semantic checks, not a substitute for identity validation.

Optional expected release constraints:

```sh
npm run release:check -- --expected-version 0.46.0 --expected-commit FULL_CHECKED_OUT_COMMIT_SHA
```

The version above is an example, not a declaration of a shipped version. The exact version, HEAD, dirty state and content identities actually tested are recorded in the report. Reports and logs are written under `artifacts/release-validation/`. Override with `--output artifacts/another-run`. Each test file gets its own JSON-lines result log. `checkpoint.partial.json` records progress as incomplete if the aggregate is interrupted; it must never be cited as a completed pass.

## What PASS means, and does not mean

The report uses exactly `PASS`, `FAIL`, `NOT RUN` and `ENVIRONMENT BLOCKED` for verification statuses. A skipped/todo test, zero actual test results, a failed assertion, malformed reporter output or nonzero runner exit cannot produce a passing current test file. Signals/spawn failures (including a signaled test VM wrapped by a still-running Node test coordinator) are `ENVIRONMENT BLOCKED`, with their actual signal/error, not fictional assertion failures. Unresolved known contract debt remains a visible failure and blocks the software gate. Exit codes: 0 complete software PASS; 1 FAIL; 2 incomplete or environment-blocked. Manual checks remain separately visible.

Required software layers:

- `test-contract`: Required prior regression files still exist, and all new matching tests/checkers are included automatically.
- `unit-mechanics`: Every discovered test file, including genuine old-save/migration and subsystem compatibility tests. This name does not imply all files contain only unit tests.
- `handlers`: Files using the real app over `mountApp`/`fakeSurface`, plus any explicit manifest tags. These verify delegated commands, semantic structure and synthetic-save effects.
- `responsive-css`: CSS/source assertions, including mobile navigation and reading-scale rules. These are not measurements of layout, clipping, touch or visual contrast.
- `accessibility-semantic`: Source/handler assertions involving ARIA, keys and focus. These are not screen-reader output, browser accessibility-tree or speech certification.
- `offline-build`: The current build completed, unless deliberately reused as above.
- `offline-identity`: Exact current runtime/build source and version correspond to both the downloadable artifact and the complete hosted part sequence.
- `offline-semantics`: Every matching current offline checker ran, sequentially. They exercise only the scenarios named by their code/logs. They do not prove all feature behavior in a real offline browser.
- `immutable-artifact`: Standalone/hosted bytes, loader and exact provenance manifest still match the initial artifact after the semantic checkers. Source immutability alone cannot establish this because generated artifacts are deliberately outside runtime source identity.
- `immutable-source`: Runtime content, build/test inputs and Git HEAD stayed unchanged throughout verification.

Category tags may overlap. Per-category result counts are not an additive count of unique tests. A passing subset or old audit cannot certify a whole category. Report the software gate and each manual status, not “all green” or “fully accessible.”

## Content and commit provenance

The builder writes schema-2 metadata in `dist/offline/manifest.json`: package version, standalone bytes/SHA-256, each part's bytes/SHA-256, the hosted loader SHA-256, ordered parts, runtime/build-input content identity, and the actual build-time Git HEAD/dirty flag. Runtime identity covers every file beneath `dist/` except generated `offline/` parts/manifest and the generated hosted offline loader, plus `package.json`, the builder and its identity implementation. This includes runtime JavaScript, CSS, entry HTML, all image/audio assets and generated catalogs. Symlink inputs are rejected.

The gate separately captures the test/checker/contract content identity and its actual test-time Git HEAD/dirty flag. It rehashes runtime and verification inputs and compares HEAD after the run. Generated logs live outside the source identity. A precommit build is supported without pretending it came from a clean commit: `buildGit` remains the commit/dirty state at build time; source SHA proves exact current runtime bytes. Committing generated artifacts later can change HEAD without invalidating equivalent source bytes. For a release, commit the desired source first, run the command from that stable snapshot, and use `--expected-commit` when a specific commit is required. Do not claim that an old report verifies later source, even if the version label stayed unchanged.

## Test inventory and historical contracts

`release-contract.json` lists the previously present tests and required offline checkers, category inference rules, manual evidence requirements and known contract-debt explanations. The discovery convention includes newly added tests and offline checkers without needing to edit an allowlist. Removal of a required file fails discovery; intentionally replacing/removing one requires a reviewed contract edit. New feature checks must use these naming conventions, or be explicitly added to the contract/runner. Audit scripts, art generators and old browser-playthrough scripts without the checker naming convention are not automatically treated as release checks.

There are no historical exclusions, expected-failure suppressions, blanket file quarantines or `skip` additions. One reviewed long-run cohort is now a separate stress file, still mandatory by default/full. A known-debt annotation explains an assertion's likely obsolete contract; it does not waive or reinterpret a failure. Default/full still runs every file, including all mechanical/import coverage inside annotated files. An explicit core-only run labels the reviewed stress file `NOT RUN` and cannot certify the full release. If a test really is about a retained legacy mode, its fixture and title must say so, preserve a real saved/migrated mode or explicit controlled subsystem precondition, and still run. Do not change current gameplay merely to satisfy a retired UI or literal-prose assertion. Do not relax resource/payment/attendance/forgery/old-save guarantees when updating an assertion.

Initial targeted reconciliation:

- Entry flow: current `creator-origin` buttons and the actual hidden successful field replace retired origin radios. Newly offered ancestry-specific origins replace injecting a retired shared origin into new creation. Three independent lives, resume, import/replacement and exact time/appearance assertions remain.
- UI feedback: Activities and actual Work & School/Work Steward entry replace remote School/Employment routes. Journal uses Active Quests/Archive/Notes, destination inspection requires Confirm Journey, market entry uses the named service, and purchase fixtures walk to the real market. Older dungeon doorway presentations remain explicitly labeled compatibility tests; the current 121-room UI remains required in `maze-resource-rules.test.js`.
- Story continuity, people focus and RPG v18 still need aggregate-led assertion triage. Their existing known debt remains blocking, not declared passing. Captured older prose, five-chapter schedules, personal-boundary safeguards, finite stock/payment and forged combat records must remain covered.

## Real browser and screen-reader evidence

The software command does not launch a browser or claim a screen-reader pass. It emits separate `browser-layout` and `screen-reader` statuses, initially `NOT RUN`. They are not required to turn the software result into PASS unless explicitly marked required in the contract. That separation is not visual acceptance. A release report must still disclose absent/blocked human validation and follow any release-specific browser requirements.

For evidence from a real current-source review, supply `--manual-evidence path/to/evidence.json`. Required envelope: `version`, `runtimeSha256`, optional `artifactSha256` for offline review, and `checks` keyed by the manual check IDs. Each check needs a valid `status` and `reason`; PASS additionally needs `evidencePath`, `reviewedAt` and `reviewer`. Evidence files are hashed and the human-supplied attestation is labeled as such, not treated as automated measurements. Version/runtime mismatch fails; an offline checksum mismatch also fails after artifact validation. Keep evidence files available for report review. Do not record PASS just because the fake surface accepts a viewport width.

Requiredness is owned by the release contract, not the evidence file: a row cannot override `requiredForSoftwareGate` or remove its human-attestation label. PASS requires nonempty evidence/reviewer fields and a valid review timestamp. The small gate suite explicitly checks these boundaries; this does not perform a real browser or screen-reader review.

A useful real review covers narrow/mobile and desktop widths, 100% and 150% reading size, long names, current navigation, wrapping and clipping; then actual assistive-technology names/order, selected state, dialog focus return and Latest Result announcements. Record the browser/OS/assistive technology, exact checked source/artifact, steps and observed limits.

## Lightweight development checks

```sh
node --test --test-concurrency=1 tests/release-gate.test.js
npm run release:check -- --inventory-only
npm run release:check -- --source-only
```

The first exercises only small synthetic gate fixtures and the real Node reporter. Inventory mode does not run game tests or build a bundle; source-only mode runs all source tests but no offline build/identity/embedded tests. Both report the omitted stages `NOT RUN`, exit incomplete and cannot certify a release. Syntax checks or focused individual tests remain useful developer evidence, not replacement release commands.

## Initial implementation evidence

On 2026-10-17 in the isolated source worktree, Node v24.19.0 ran the five small gate-infrastructure tests: 5 PASS, 0 FAIL, 0 skipped. Syntax checks and diff hygiene passed. The inventory-only command discovered 132 test files and 12 offline checkers and correctly returned exit 2 with source/handler/CSS/semantic/offline/manual stages `NOT RUN`. No game-suite aggregate, large offline build, real browser or screen-reader check was run for this source-first patch. At that initial stage, the entry/UI contract edits still required their targeted runtime run. The complete gate is not declared usable/green until actual failures are triaged and its current aggregate executes.

The first authorized targeted game run then completed `entry-flow.test.js` plus `ui-feedback.test.js` serially: 23 tests, 22 PASS / 1 FAIL, 0 skipped, 163.1 seconds. Entry flow passed fully, and all UI feedback cases except the revised age-16 Work Steward route passed. That failure was an obsolete test precondition: unemployed under-18s currently get a teacher shortcut, while trade selection is reached through the actual settlement/area/steward. The assertion was changed to that real route without changing gameplay. The subsequent pre-integration rerun passed **23/23**, 0 failed/skipped, in **164.2 seconds**; log `/tmp/hearth-current-gate-targeted-rerun.log`. These runs used the isolated pre-integration runtime based on commit 13033f1 with package v0.44.0, not the later published v45/v45.1 CSS correction. The full diagnostic gate must rebase onto that actual correction tip and run separately. Source log: `/tmp/hearth-current-gate-targeted.log` (ephemeral executor evidence). The initial source-first patch does not claim a full release pass.

## Core, full stress and resumable checkpoints

The default command remains full certification scope. `--tier core --source-only` is an explicit incremental development/triage mode, not a smaller release certification:

```sh
npm run release:check -- --tier core --source-only --output artifacts/core-check
```

Reports expose `coreTestStatus` and `fullTestStatus` separately. Omitted stress tests remain `NOT RUN` in the full test inventory and required unit layer; even a core PASS cannot make `softwareComplete` true or return a full-release success. Core retains every current handler, CSS/semantic check, guard, payment, migration and old-save test unless an individual repeated-cohort workload is reviewed and split while its critical representative assertions remain in core. New tests always default to core, even inside `tests/stress/`. A reviewed stress entry must supply its reason and retained core coverage in the manifest. Failure status is never a criterion for moving a case.

The only initial split is the original twelve-complete-childhood cohort from the mixed `birth-v9` file. Every original seed, three birthday forks, save validation, input purity, final record count, no-assigned-calling/no-enrollment condition and cross-cohort variety assertion stays in `tests/stress/childhood-lifetimes.test.js`. The other original birth/snapshot/version-6 compatibility checks stay in core; a single fixed complete current childhood uses the identical shared per-life assertions in core too. Thus full includes the entire original twelve-life cohort plus the core representative, not twelve reduced assertions or a silently smaller seed set. The full original mixed file measured 587.5 seconds; finer future case timings are now recorded. Other expensive files remain core until individually reviewed, even if that means an incomplete core run rather than an invented fast-pass claim.

For a deliberate boundary checkpoint, name the exact file:

```sh
npm run release:check -- --source-only --pause-after tests/birth-v6.test.js --output artifacts/paused-check
npm run release:check -- --source-only --resume artifacts/paused-check/checkpoint.json --output artifacts/resumed-check
```

For a run already in progress, create an empty `PAUSE` file inside that run's output directory. The runner checks it between subprocesses and stops before starting another file; it does not interrupt a long currently running file. Remove the marker before resuming. The fixed per-file budget remains available for a stalled subprocess. Signal handlers also attempt to stop the owned subprocess group and preserve completed-file evidence, marking the interrupted file `NOT RUN`, never reinterpreting an in-file partial as terminal.

A completed or cleanly paused schema-2 `checkpoint.json` has an actual final immutable-source comparison. `checkpoint.partial.json` is explicitly in progress and is not resumable. Resume requires the identical runtime/build content, test/runner/contract content, Git HEAD, version, Node version/platform/architecture and discovered inventory, plus intact SHA-256 diagnostic and structured reporter logs for every reused PASS/FAIL file. Reparsed actual reporter events must agree with saved status/counts; editing a checkpoint label cannot turn a failure into a pass. Any change rejects resume and requires a new run. A saved FAIL remains FAIL; blocked or uncompleted files run again. No dependency guessing or reuse across changed assertions/source is performed. An old schema-1 diagnostic cannot be silently promoted into this new protocol.

The core run can later be completed with default/full `--resume` on the exact same snapshot: already executed core results remain explicitly reused with their original log hashes, and the mandatory stress cohort runs. Source-only still leaves all offline stages `NOT RUN`. When new features or fixes change source, start new evidence for that new snapshot rather than laundering the old partial into it.

## First exact-v45.1 diagnostic and reconciliation

The isolated immutable source diagnostic at HEAD `01ac206cf4a7dec7e0c6f02fd684de95092b0695`, based on published v45.1 `30e296bf0c72751ce9124b670cd1e1a64c149cf5`, was deliberately stopped to release the shared lane. It completed 9 of 132 files: **110 PASS / 5 FAIL**, 0 skipped. The twelve-childhood cohort itself passed, but its mixed file took **587.5 seconds**. `birth.test.js` was interrupted before a terminal result; it and the later 122 files remain `NOT RUN`. Runtime/test/runner content and HEAD were rechecked after interruption and matched the starting snapshot. No build, offline VM, real browser or screen-reader run occurred. The preserved old-protocol checkpoint is `artifacts/release-validation-v451-source/checkpoint-interrupted.json`; its five failures are not waived and it is not a full pass or resumable schema-2 evidence.

Source-only reconciliation prepared after that stop, pending its authorized runtime replay:

- Wilderness: permit current trail rest and field behavior while still asserting that no enabled city service/correspondence can run from open country; direct travel/shop/reply/year-skip guards remain.
- Coercion: label the old authored pressure conversation as an explicit pre-grounded compatibility fixture, instead of demanding a pressure choice in new edition-30 everyday dialogue. The spoken stress cost and forged-reply no-op assertions remain.
- Young household contact: visit the real Homes area before speaking. Current grounded infant company uses its actual replies and daily cooldown, without changing days, money, campaign or obligations; the retained older young-contact scene still tests its yearly cooldown separately.
- Omen metaphors: retain the exact old birth/fifth-year omen wording as an explicit pre-grounded authored compatibility scenario, not a demand on new grounded birth prose. Original snapshot/effect/heir assertions remain.
- Adult titles: current grounded wording may differ from version-6 wording; assert exact current title/body capture and preserve the original hero/life/flags/cost effect comparisons rather than requiring identical titles across prose editions.

The lightweight gate-infrastructure suite now has **8 PASS / 0 FAIL**, including exact resume rejection, unreviewed stress-path default-to-core, log-tamper rejection and terminating a small own-process fixture at its declared budget. Pause-before-any-tests and inventory-only resume smoke checks completed without loading game modules, with all game/offline/manual verification correctly `NOT RUN`. These infrastructure checks do not validate the five amended game assertions or establish a current core pass.

A later light-only integrity review added explicit failure priority when an assertion failure and environmental signal coexist, and a required post-checker artifact/provenance comparison. Its small synthetic suite passed **9/9**, 0 failed/skipped, in 0.8 seconds. This includes rejecting changed standalone bytes or a changed build-provenance manifest after the initial identity check. No real bundle build or embedded VM was run for that refinement.

## Focused current-v46 replay and an actual clarity defect

The isolated branch was rebased onto published v0.46.0 `4c8f38c3f103a7977d8b6e86a74e2a33d22906a0`. The focused serial replay used clean HEAD `f94e5a8b670d47265c620873f90f91d9d3d3e7d4` on 2026-10-17, 04:10:08–04:14:57 UTC. Runtime SHA-256 was `fb5e58983148e08c34310d3d3a35e30193358119c4b812827808bfc3672ab0e5`; verification-input SHA-256 was `d57e94efdb010904c36ff62f999ed0d915c2da94a6f26207c8d7a110e230003c`. All before/after identities and HEAD matched. The result was **31 PASS / 1 FAIL**, 0 skipped, in 289.1 seconds, not a core aggregate or release pass:

- `audit-v21.test.js`: 23/23 PASS, 50.2 seconds, verifying the three amended contracts and retained safeguards.
- `birth-v9.test.js`: 8 PASS / 1 FAIL, 238.2 seconds. The legacy omen/snapshot case passed (19.7 seconds), as did the representative complete childhood (32.6 seconds). The 60-seed, seven-age, three-choice authored-scene matrix passed (158.0 seconds) and remains core pending any separate workload review. No further workload was moved out of core on the strength of this run.
- The adult chapter case failed because the eight-Gold contribution description was `Choose this action.` rather than retaining its actual conditional fee. This is a **production cost-disclosure defect**, not a stale assertion to weaken. The authored `effect.cost = 8` still deducts eight Gold only when affordable. `adultYearNarrative` supplies `Contribute 8 gold if you have it; otherwise bring what help you can.`, but the grounded numerical quotation filter omitted the verb `Contribute` and discarded that warning. Event choice cards have no separate fee quote to compensate.

The narrow production correction preserves numerical `Contribute` sentences in that existing filter without changing any effect, affordability, save record or elapsed time. The original `/8 gold/` assertion stays intact. A new automatically discovered current test file checks preservation of eight- and fifteen-Gold conditional quotes, no invented quote for nonnumerical help, presentation purity, and actual annual deductions at balances 100, 8, 7 and 0. That correction and its new tests are source-prepared in separate commit `539daf6`; runtime verification is still pending. It is not part of the ID15-only release being prepared concurrently.

Focused evidence is preserved in `artifacts/release-v46-targeted-contracts/report.json` and its checksummed per-file diagnostic/structured logs, with `/tmp/hearth-v46-contract-replay.log` as the ephemeral console log. The earlier v45.1 110 PASS / 5 FAIL diagnostic and all its omitted/interrupted files remain recorded as such. Neither record is silently promoted into later-source evidence. All other source tests, the required full stress cohort, offline build/identity/semantic checks, real browser layout and screen-reader checks were **NOT RUN** for this focused replay.

### Narrow correction replay on the published-v47 base

After rebasing onto published v0.47.0 `1959103`, clean isolated HEAD `b28a3558cf4d1831cf36633335e89baefa5070c2` ran only the five new annual-contribution regressions and the exact formerly failing adult-prose case. The serial run completed on 2026-10-17, 04:33:05–04:33:16 UTC: **6 selected PASS / 0 FAIL**, in 10.7 seconds, with unchanged source identities/HEAD. The new five-case file passed completely in 2.4 seconds, including actual affordable/unaffordable deductions. The exact adult-prose case passed in 7.6 seconds, retaining its original eight-Gold quote and all sixteen years of three-choice mechanical comparisons. The production correction's rebased separate commit is `eb8f81c`.

Runtime SHA-256 was `3963a9b25cbe42825d76225e3fc556e1a4dd7c87b42f39161681f6a9d940b8e4`; verification-input SHA-256 was `846ea1c36e5e16f157513a20007c707796c2ea142885962f7d6fbe3cf74b240c`. Evidence is in `artifacts/release-v47-contribution-focused/report.json` and checksummed logs, with the ephemeral console log `/tmp/hearth-v47-contribution-focused.log`.

That adult command used the explicit exact `--test-name-pattern`. Its other eight birth cases were **NOT RUN**, enumerated separately from the unchanged source inventory because Node v24 does not emit skipped reporter events for unselected cases. No fabricated pass/skip events were added. `birth-v9.test.js` as a whole, the current core aggregate and the software release gate remain **NOT RUN** for this selection. The earlier current-v46 31 PASS / 1 FAIL record is still retained as a result for its original snapshot; the narrow replay does not rewrite that history or certify all later source. No build, offline check, full stress cohort, real browser or screen-reader validation ran.
