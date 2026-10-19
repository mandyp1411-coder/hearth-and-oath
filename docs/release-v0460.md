# v0.46.0 integration verification

## Bounded scope

This source integrates roadmap IDs 10, 12, 13 and 14 on top of published v0.45.1, exact source `30e296bf0c72751ce9124b670cd1e1a64c149cf5`, saved Site version 69. It preserves the existing public audience and URL, the v0.45.1 narrow-counter correction, reading preferences, action-cost metadata, cross-tab save coordinator, current Journal/camp/maze rules and finite Second Wind self-use cost.

- ID10: replacement-trigger keyboard focus, contextual quantity names, one concise visible action outcome, modal/navigation guards and in-place storage-availability feedback. Source `f7b339a` + `33b12ca`, integrated as `939a936` + `7662e77`.
- ID12: collapsed Party combat readouts and readiness, backed by the same detached profile and unchanged move metadata used by new battle actors. Source `6aca296` + `d31d837`, integrated as `dea85d3` + `2dab42c`.
- ID13: readable combined effects and current already-visible intent recipients, using a shared pure recipient resolver with preserved typed/legacy targeting. Source `7e9dc29`, integrated as `f48a0d7`.
- ID14: quiet loading, a save-safe Retry on module startup failure, temporary-listener cleanup and static opening markup in standalone re-downloads. Source `1c92e3d` + `d4c35df`, integrated as `65f327a` + `bb3163e`.
- Integration hardening `3b57d1b`: the storage-failure status remains mounted and does not repeat identical warnings; partial boot failure clears only app-owned body modes that could clip Retry. No storage operation or game result is changed by these presentation corrections.

There are no new fees, rewards, balance grants, AI cycles, save fields, migrations, real-user-data exports, accounts, purchases, permissions, security settings or sharing changes. Profile viewing never recruits, restores resources or grants techniques. Intent prediction is current and conditional, not a future-cycle spoiler or a promised enemy-damage forecast. The sealed-action badge humanizes its recorded ID; some generic IDs do not yet display the command's specialized button label.

ID11's broad current-release-gate work is separate. Its separate immutable worktree is `01ac206cf4a7dec7e0c6f02fd684de95092b0695`, based on v0.45.1. Its results are not v0.46 full-source evidence and are not counted as this release completing ID11.

## Verification status

Source syntax and whitespace checks: PASS at the integration hardening snapshot. Independent source review cleared imports, initialization, roster/read-model sharing, target selection structure, offline-compatible direct exports and the preserved v0.45.1 stylesheet. The two integration hardenings passed the integrated boot cases and corrected final quota/keyboard cases below.

Previously completed isolated focused results, not yet final integrated passes:

- Keyboard/feedback: 20/20.
- Companion profile plus existing combat: 179/179.
- Combat status/intent plus existing combat/focus: 155/155; separate pre-extraction execution parity 1,285/1,285 complete captured-battle comparisons.
- Boot recovery: 12/12, plus one persistent-status contract check.

The planned final serial source commands are bounded to the changed behavior and adjacent save/counter/reading contracts. The separate menus check selects the hosted-entry persistent-status contract updated by boot recovery; it does not claim the rest of that historical navigation file was reconciled by this release:

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/keyboard-feedback.test.js tests/companion-combat-profile.test.js tests/companion-combat-profile-ui.test.js tests/combat-status-intent.test.js tests/combat-status-intent-ui.test.js tests/boot-recovery.test.js tests/combat.test.js tests/combat-focus.test.js tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/trade-craft-windows-v42.test.js tests/reading-scale-consistency.test.js tests/action-cost-clarity.test.js
node --test --test-name-pattern='persistent polite selection announcements' tests/menus-focus.test.js
node scripts/verify-combat-target-parity.mjs
```

Initial integrated source command at `8adb064c741103ccdce8dbcabee00807a2996398`: 406 tests, 403 PASS and 3 FAIL in 205.3 seconds. The three failures were one repeated fixture assumption in the added quota-timing assertions: this semantic DOM fixture returns boolean false for its default hidden property through getAttribute, not the null a browser returns for an absent attribute. The redundant attribute-null checks were removed; non-hidden property, no aria-hidden, status/live/atomic, exact node identity, focus and one-outcome checks remain. The corrected complete keyboard file then passed **20/20**, zero failures/skips/cancellations, in **32.9 seconds**, at `928d522f634121ba4820d6c91d6fa2e720b450bb`. The **386 non-keyboard cases** retain their passing integrated result; production runtime source did not change. A second single all-406 green invocation is not claimed. The separately selected persistent hosted-entry status contract passed **1/1** (33.7 seconds including its existing top-level fixture setup). Final current-source execution parity passed **1,285/1,285** exact complete captured-battle comparisons against pre-target-extraction `d31d837`: 468 legacy, 642 typed and 175 boss cases. These are bounded deterministic checks, not an earned-life balance certification. No unqualified historical npm-test pass is claimed.

## Standalone validation

All heavy checks/builds must run serially after the other release work has exited. The planned final commands are:

```sh
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-continuity-combat-v46.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-cost-gear-v45.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-journal-maze-v44.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-saves-v431.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-followups-v43.mjs
```

The new verifier (`97bd1ce`, integrated as `928d522`; enabled-second-outing fixture corrections (the obsolete-navigation test uses the visible Social & Fun Sketch command, not a disabled same-day Walk or Everyday-only Read command)) passed independent read-only source review. It executes the exact completed downloaded module graph with disposable synthetic lives, compare actual handlers with the current online engine/read models, forbid network and verify current manifest/part/artifact byte identity. It is not a browser or screen-reader test.

One serial 1536 MB offline build PASS at source `686d44734ac7295bfb1989c74de3945fa78ac2b0`, producing 16 parts. The first new-verifier run stopped at the second-outing test route because Read is not displayed in Social & Fun; that fixture now uses the visible free Sketch command. No production source or built bytes changed, and no rebuild was repeated. The next run reached the real file-mode re-download handler and exposed an existing lexical collision: the app’s local location() place helper shadowed browser location, so the file path wrongly tried a hosted fetch. The production check now explicitly uses globalThis.location.protocol; the extracted source regression retains the actual helper shadow. This real source correction requires affected source validation and one justified rebuild. The affected boot source file then passed **12/12**, zero failures, and a justified second 1536 MB build passed at `3952d60`. The completed exact-embedded continuity/combat checker passed **all 14 check groups** on that rebuilt artifact: **132,272,143 bytes**, 16 parts, SHA-256 `60dd408f40970c155229c6859e901dbc99df346b2619bdd2b42ae5bc789c03bb`. The actual file re-download produced the expected save-free static shell plus identical embedded scripts: **132,272,112 bytes**, SHA-256 `f5fc2a3ac598675e60e36ddac89ee5735890842f2eff7c544fd79a1a597d0536`. Network was forbidden with zero attempts.

The retained cost/gear checker initially stopped at its older detached-click expectation: it advanced the source engine to an unavailable-action notice, while ID10 rejects the detached actual target before invoking any game action. Its helper now leaves the source expectation unchanged and adds exact pre-click all-slot equality, including the prior receipt and every saved field. Independent read-only review confirmed that full source parity, accepted return/sale/craft assertions and stale safety remain enforced. This checker-only correction changes no runtime source or built bytes, so it does not justify another build. All retained serial checks then passed against the same exact rebuilt bytes and hash: cost/gear **11 check groups**; Journal/maze **9 groups**; save-conflict/neighbor preservation/recovery/finite Second Wind **6 groups**; and the remembered follow-up checker with exact played antecedent recognition, captured pending snapshot, one durable receipt, stale-click rejection and untouched neighboring slot. Network was forbidden throughout. The generated 16 parts and manifest are committed with this evidence; later checker/document changes do not alter runtime source or artifact bytes. No additional build was run after those checker-only changes.

## Browser evidence and limits

A real cloud-browser baseline on public v0.45.1 reproduced creator focus loss after Enter on Cast the bones and Space on Roll a name: activeElement became BODY both times. The unsaved empty-slot draft was abandoned. QA Aster remained age 18, 15 Gold, 11 Thaw, with unchanged Health/Focus and existing display settings; no import, replacement, deletion or transaction was used.

Post-publication v0.46 keyboard/native disclosures, quantities, Party profiles, current combat intent/effects and loaded boot UI: PENDING. Restore the prior 100% Book serif / 100% browser zoom and original cloud window after testing. Any disposable gameplay must stay separate from the existing QA Aster life.

No screen-reader speech, physical-device/touch, actual blocked-module browser failure or unearned-life balance certification is established by modeled handlers. Report those limits explicitly rather than treating ARIA/source checks as assistive-technology or layout acceptance.
