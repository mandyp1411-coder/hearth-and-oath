# Combat status and recipient clarity (roadmap 13)

## Bounded change

Actor cards now present one readable row per effect. Poison, bleeding, burning, veil and bramble join their magnitude and remaining duration; their bookkeeping `Turns` keys are not independent badges. Guard interception and guarding damage reduction are distinguished and combined when both apply. Marks, charge, stolen power, weakness, fear, root, stun, silence, the actual sealed technique, ward, exposed armor, phase power, study, surrender and capture all have effect-specific labels and explanations. Unknown effect keys remain visible. The inactive older `burning` alias is identified as an old record rather than promising a nonexistent damage tick. A duration-only legacy poison still shows the executor's existing default 2-Health tick.

Badges carry short labels; a collapsed native “Effects explained” disclosure carries the longer descriptions. There is no new command, stat or effect.

Each living enemy with an already-visible intent now has a separate current-recipient line. It distinguishes aimed party actions, party-wide actions, self preparation, self/enemy support, enemy-wide support, a ward donor, drain recovery and a currently broken/silenced action. Preparation does not promise a hit. Recovery is explicitly from actual damage, if any. Legacy odd-round traits retain their separate nominal party target even on a support turn.

The battle header explains that guarding, Health, Focus, marks and intervening actions can change these predictions. Only the current visible action is read. No later cycle action, future phase contents or enemy-reply damage forecast is revealed. Player command previews keep their existing immediate-only explanation and calculation.

## Shared resolution and preserved mechanics

`enemy-targets.js` is the shared, pure recipient resolver used by typed enemy execution, legacy enemy execution and the UI. It never rolls, advances a plan, writes a status or sorts a saved array. The status presenter and HTML renderers are also read-only.

- Guard still selects the first living protector. Merely defending without `protecting` does not redirect a targeted action.
- Typed injury ties still keep captured actor order. Legacy injury ties still choose lower actual Health before captured actor order. Magic/armor/ward/agility ties retain their original stable order.
- Marks, living remembered targets, dead/missing remembered-target fallback, remembered attacker fallback and unafraid selection are unchanged.
- Self, group and support recipients are separate from the nominal party target. Execution still records exactly the same nominal `lastTargetId`, even after self/support/group plans.
- Ward recipients, first injured drain recovery recipient, highest-ward donor, living-only group membership and legacy trait targeting retain the original actor order.
- Phase activation, numeric damage, healing, wards, charge, turn order, statuses, saves and AI action cycles are unchanged. There are no save fields, migrations, balance changes or persistent writes from viewing.

This branch is based on companion-profile commit `d31d837` (roadmap 12). Integrate roadmap 12 before this change. `app.js` changes are limited to the new presenter import, actor-card status/recipient markup, the duplicate Guarding role suffix and the current-prediction caveat. No CSS changes are included.

## Verification

Completed source-only checks:

- All changed/new JavaScript passes `node --check`; `git diff --check` passes.
- Independent source review compared the original and extracted target logic and found no remaining mechanical or presentation findings after correcting drain recovery and the old burning alias.
- The application graph has 192 reachable modules, no dependency cycles or normalized identifier collisions. New imports/direct function exports match the standalone builder's supported translation. No build output was generated.

Focused runtime command:

`node --test --test-concurrency=1 tests/combat-status-intent.test.js tests/combat-status-intent-ui.test.js tests/combat.test.js tests/combat-focus.test.js`

Result: **155/155 passed**, zero failures/skips/cancellations, 69.3 seconds:

- 72 dependency-light status, resolver, typed-executor and renderer checks cover all legal effect labels, combined duration, inactive/legacy records, guard-only versus interception, all target policies, stable ties, marks, last target/attacker fallback, dead/missing actors, groups, self/support/donor/recovery targets, broken/silenced actions, legacy cycles/traits, escaping and frozen/no-RNG reads.
- 2 actual application-handler checks mount controlled valid age-18 saves. They inspect real actor cards, collapsed effect disclosures, single/group prediction text and the immediate-only preview explanation; opening details/menu and changing selected targets preserve life/slot bytes. An accepted Defend refreshes the aimed prediction to the protector while preserving party-wide coverage. Saves validate and migrate identically.
- 57 existing combat regressions and 24 combat-focus checks remain green.

Reproducible execution parity command:

`node scripts/verify-combat-target-parity.mjs`

The helper loads the original `combat.js` and `enemy-plans-v27.js` from pre-extraction commit `d31d837` into temporary modules, sharing all other unchanged dependencies with the current implementation. It compares complete resulting captured battles after one accepted potion decision and the following enemy action, not only the selected target. **1,285/1,285 exact equality checks passed**: 468 legacy cycle/trait/guard cases, 642 species-plan cases and 175 boss/activated-phase cases. Typed variants include protection, absent memories, broken charge, silence and bramble retaliation. Temporary files are removed. This is deterministic captured-battle QA, not earned-life balance evidence or a full-battle replay audit.

Remaining integration verification: browser geometry/native disclosure interaction and the final combined-release offline build/hosted-offline parity. Handler tests do not establish browser layout. No version bump, offline rebuild, publication or public-audience change was performed in this source-only branch.
