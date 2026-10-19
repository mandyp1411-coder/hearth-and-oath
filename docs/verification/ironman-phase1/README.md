# Unpublished Ironman phase 1 source checkpoint

This is a partial implementation gate, **not release acceptance or a complete Ironman mode**. No mode UI was exposed, no offline artifact was built, and nothing was published by this gate. The current public game is unaffected.

## Exact source matrix

Tested clean source: `6047db83bc183f887c1550585ca552f4abe5fe74`.
Runtime: `d40726b0926e1e0cf89bd8d8c0917e1ae339cffb6ef2790c38b72ce7009311ac` (623 files).
Verification: `ab46c15e4a047591d30aebc7601e08145385a81ced32d02b38d54676d0bbe6d4` (404 files).

All **13 complete source files passed: 429 PASS / 0 FAIL**, with no skips or cancellations. The three new files account for 122 cases. Each fresh test child ran serially at 512 MiB, UV1 and test concurrency 1, with raw TAP and its numeric exit preserved. Every actual duration was within the original individual cap:

- tests/ironman-rules.test.js: 73 PASS, exit 0, 0.276 s / 30 s cap.
- tests/ironman-combat.test.js: 26 PASS, exit 0, 0.523 s / 120 s cap.
- tests/ironman-validation.test.js: 23 PASS, exit 0, 5.564 s / 120 s cap.
- tests/tournament-ordinary-golden.test.js: 1 PASS, exit 0, 0.887 s / 30 s cap.
- tests/tactics-practice.test.js: 9 PASS, exit 0, 0.564 s / 60 s cap.
- tests/combat.test.js: 57 PASS, exit 0, 0.795 s / 60 s cap.
- tests/combat-status-intent.test.js: 72 PASS, exit 0, 0.285 s / 60 s cap.
- tests/tournament-command-policy.test.js: 4 PASS, exit 0, 0.845 s / 60 s cap.
- tests/companion-combat-profile.test.js: 120 PASS, exit 0, 0.553 s / 60 s cap.
- tests/battle-ui.test.js: 3 PASS, exit 0, 0.572 s / 30 s cap.
- tests/combat-focus.test.js: 24 PASS, exit 0, 49.733 s / 180 s cap.
- tests/saves.test.js: 6 PASS, exit 0, 8.231 s / 120 s cap.
- tests/adult-tournament-engine.test.js: 11 PASS, exit 0, 21.095 s / 180 s cap.

The summed per-file wall duration was 89.923 s. This is an observation, not an expected duration or a whole-suite certificate. Existing Standard save/UI cases in these files are regressions only; they do not establish the unimplemented Ironman storage/session/UI behavior.

## Unchanged Standard outputs

Existing behavioral goldens were not edited. The ordinary tournament test retains its 27 serialized sequences and the tactics-practice resolver retains its exact public-v48 result hash. The separate literal skill/tactic extraction assertion also passed unchanged.

One additional approved 60 s / 512 MiB / UV1 direct comparison ran against an isolated clean, source-only sparse checkout of exact public `1c98c62ce80958aeb5c3bafe243a672c8bafb17e`. It passed with numeric exit 0 in **3.450 s**:

- All 27 ordinary battle/five-command sequences matched.
- The complete existing resolver input list matched: **257 cases**.
- **1,114** raw/deep and serialized comparisons covered created states, action lists, previews, ordinary/detailed results and fixed traces, with input purity checks.
- The actual legacy-v5 midbattle migrated and validated identically, offered a real retreat, and produced identical accepted retreat/resolution outputs.
- **No output normalization** was used. Both candidate and public source identities stayed unchanged. Bulky art/audio/offline assets were absent only in the source differential checkout; no baseline artifact claim is made.

The fixed one-shot comparison script and its exact SHA, result, raw output, numeric exit and input pins are archived. It is not a general execution framework.

## Scope and durable evidence

Phase 1 covers pure metadata/identity rules, exact captured battle policy, per-decrement zero latches, same-battle non-revival, immediate hero terminal precedence, optional technique/enemy-plan hooks, preview purity and narrow validation. The HP-mutation inventory and contract remain the scope references.

**Not implemented or accepted here:** engine casualty settlement; permanent roster/lineage consequences at accepted boundaries; durable mortality floor/tombstone transactions; session coordination; creator opt-in or Ironman UI exposure. No offline build, compiled checker, native browser/AT or release acceptance ran. Formal global software status remains **NOT RUN**. Unrelated historical dialogue/followup/lineage failures remain unresolved and were not rerun or reclassified here.

- `source-logs-and-receipts.tar.gz` contains all 13 exact TAP logs, numeric exits, timings/caps/input identities and final source-only receipts.
- `public-standard-parity.tar.gz` contains the fixed comparison script, exact result, raw log and numeric exit.
- `checkpoint.json` records member byte lengths and SHA-256 hashes, the original source identity, public identity and limitations. Every archive member was read back and compared byte-for-byte with its original receipt.
- `SHA256SUMS` covers these files except itself, avoiding a hash cycle.

Only fictional generated/controlled or published legacy gameplay fixtures are involved. No real personal save, credential or configuration is included. Packaging ran no gameplay/tests. A later evidence-only docs commit is not retroactively the tested source commit.
