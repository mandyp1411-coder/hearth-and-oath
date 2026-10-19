# v0.45.0 verification

## Scope

This release integrates roadmap items 6–9 on top of published v0.44.0 (`236a5dff46d7fa0e43ad26aa01154d0823bb2d95`). It retains the current Journal, active-party camp and maze-resource rules, cross-tab save coordination and finite Second Wind self-use cost. It does not claim the remaining roadmap items are complete.

- Current Return destinations and authoritative action-cost presentation: source `cd88d0d` / verification `36510e0`, integrated as `09855df` / `e5a3371`.
- Action-earned balance regression harness, checked-in fixtures and measured baseline: source `2dd9de7` / `6188967`, integrated as `34b87de` / `f3e3afc`, with subsequent evidence-label clarification.
- Stolen equipment identity and provenance: source `38a6273`, integrated as `fee7fdc`. Integration correction `cb72e4e` supplies the current life to the new property-theft quote rows.
- Existing reading-size preference consistently applied to scoped service, Activity, counter and crafting text: source `038bd45`, integrated as `13033f1`. Existing art, palette, base sizes and mobile navigation remain unchanged.

No accounts, cloud saves, audience, purchases or security changes are included. Craft/provider/stale-confirm gates and save-conflict coordination remain authoritative. Fees, materials, time and expected household accrual stay separate; a forecast is not a new all-inclusive upfront price. Household costs may settle when ordinary actions finish as well as during commitments, Age up and end-of-life. Stolen equipment uses exact catalog stats and one asset identity, never a second saleable loot token; sale/return records preserve original ownership and prevent repeated disposal.

## Bounded source gate

The current integration gate runs one test worker at a time, never the historical aggregate:

```sh
UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/action-cost-clarity.test.js tests/stolen-equipment.test.js tests/earned-balance-gate.test.js tests/reading-scale-consistency.test.js tests/interface-consistency-v40.test.js tests/mobile-navigation-v401.test.js tests/journal-commitments.test.js tests/party-camp-recovery.test.js tests/maze-resource-rules.test.js tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/saves.test.js tests/save-deletion-v40.test.js tests/reliability.test.js tests/second-wind-balance.test.js tests/combat-focus.test.js tests/trade-craft-windows-v42.test.js tests/work-trade-separation.test.js
```

The initial combined run completed 287 tests: 286 passed and one source-regex assertion rejected insignificant whitespace in `var(--reading-scale, 1)`. The parser tolerance was corrected without removing the exactly-one-factor check. After the shared living-cost fine-print integration addition, the affected cost/reading/interface/mobile/harness gate passed **74/74** in 27.38 seconds; the final expanded CSS-cascade check separately passed **36/36**. All retained gameplay/save/Journal/camp/maze and theft/provider tests passed in the combined run. No failed gameplay assertion was suppressed, and a single all-291-test rerun is not claimed. The older `budget.test.js` literal birth-arrival prose assertion remains documented in the action-cost record; migration now supplies narrative edition 30, so that historical exact-text expectation is not represented as a passing current release check or weakened here. Seven accounting-focused tests in that supporting run passed.

## Earned-life evidence boundaries

The checked-in study measured 240 deterministic encounter cases and four actual-entry, resource-carrying expeditions on the v0.44 gameplay baseline at `abf06b2`. Twelve sensitivity cases are explicitly counterfactual. All four expedition routes returned through the entrance after 118 walks and remained unfinished withdrawals, not dungeon completions. They share a seed's geometry. Zero natural interruptions occurred, so separate existing camp/birthday tests cover that behavior.

The evidence-only ID7 branch had no gameplay delta and used a same-report zero-delta comparison control. The combined v0.45 graph includes other implementation changes; it is not claimed byte-identical to that baseline or independently subjected to another full 240-case/four-expedition matrix. A separate post-integration smoke replay checks five recorded representative command traces with exact final battle hashes against the current source. That bounded result does not certify all classes, traits, difficulties, dungeon completion, economy balance or human enjoyment. See the complete [method and evidence](balance/earned-regression-gate.md).

## Standalone gate

Build and embedded verifiers run separately, without a competing heavy Node process:

```sh
node --max-old-space-size=1536 scripts/build-offline.mjs
node --max-old-space-size=1536 --expose-gc scripts/verify-offline-cost-gear-v45.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-journal-maze-v44.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-saves-v431.mjs
node --max-old-space-size=768 --expose-gc scripts/verify-offline-followups-v43.mjs
```

The new actual-handler verifier uses synthetic slots and the exact standalone module graph, forbids network use and compares transitions with online engine results. It covers cost separation, current Return controls, interrupted/prepaid crafting and stolen equipment identity/disposal without duplicated payout. Retained verifiers protect Journal, camp/movement, independent saves/conflicts, latest unsaved export, Second Wind and contextual remembered conversations. Byte/part/hash identity is checked against the completed local download.

## Verification boundaries and results

- PASS: the final affected source gate, **74/74**, zero failures/skips, 27.38 seconds; the expanded final reading-cascade file separately passed **36/36** in 0.13 seconds. The initial combined run was **287 tests / 286 pass / 1 whitespace-parser failure**, 313.59 seconds; that assertion was corrected as described above, not hidden as a gameplay failure.
- PASS: independent read-only integration and new-verifier source review. Final syntax and diff hygiene checks pass.
- PASS: **five** representative recorded command traces reproduced exact final battle hashes on source `9f5cfa6f0a75574d0a17c5ffca7db35b81dbf3d0`, using the preserved fixture-set hash `b01c01219d07ca04e65291372943539d6c9497b8c7e9f1d556e732d6df37fff7`. The replay result records the original baseline revision separately. This is not a second full matrix.
- PASS: one serial **1536 MB** offline build, **16 parts**. No rebuild followed successful completion.
- PASS: all **four** actual embedded verifiers above, run sequentially with networking forbidden. The new cost/gear, retained Journal/maze and save verifiers agree on the exact artifact bytes and hash. The retained contextual-follow-up verifier also completed successfully.

Standalone artifact: **132,242,807 bytes**, **16 parts**. SHA-256: `62aa3cac9efe50ae361232e9360d6e6c97644958c12046246a6690c01861d16f`.

At the final pre-publication audience recheck, the existing public Site remained v0.44.0 / saved version 67 at its unchanged URL. This record is finalized before publication; native deployment and post-deployment browser observations are reported separately. The verified runtime source is unchanged by this evidence record and generated parts. No full historical aggregate pass is claimed.

Real-browser font ratios, narrow rendering, zoom, physical touch and screen readers are distinct from semantic handlers and source arithmetic. The real public v0.44 baseline reproduced fixed-size labels/descriptions/reasons and counter text at 150%; changed-CSS observations must occur against the deployed v0.45 stylesheet and be reported separately. Normal QA must not import, replace or delete lives or perform transactions merely for visual coverage. Restore prior display preferences afterward.
