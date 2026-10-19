# Targetable field treatment

Field potions now have one exact eligibility/effect quote and one current-state execution path. Inventory keeps the existing hero action and adds explicitly named companion actions when there are recruited companions. Party exposes the same action beside the person's actual resources. Native buttons work with touch, Enter and Space; no saved target selection or new gameplay state is added.

An eligible living, available active traveler receives min(30, maxHp - hp) Health for one shared potion and no calendar time. Treatment does not restore Focus, cure illness, stabilize the downed, revive the deceased, change party membership, resolve a room, reveal map information, or grant proof, experience or rewards. Reserves and travelers outside the first three active slots cannot be treated. Names and effect previews are escaped.

The selected ID is re-resolved against current state. Full, missing, wrong-side, away, departed, dead and downed targets consume nothing. Pending battles, conversations, ordinary events, road crossings and journeys remain blocked. Companion care additionally respects attended work, custody and other existing commitments. Existing default and explicit hero use, notice, zero-day cost and legacy room-pause behavior are preserved.

Companion treatment in legacy descents requires the exact captured room and an actual quiet or resolved room. In mazes, unresolved enemies, guardians and traps block treatment until resolved or the party retreats. The pure gate accepts only an injected canonical current-position descriptor. It never reads a hidden destination.

## Verification in this branch

- Passed: 49 pure tests, approximately 0.22 seconds, using `timeout 5s node --test tests/field-treatment-pure.test.js`.
- Passed: JavaScript syntax checks for all changed modules and both test files; `git diff --check`.
- Passed: all eight focused runtime tests in `tests/field-treatment-runtime.test.js` against source `8ce703dcf50d27dc7a3d194a5661a929a5f2c92e`, run serially with a 512 MiB Node heap and a 90-second timeout. Terminal result: 8 passed, 0 failed, 0 skipped, 0 cancelled; 4.781 seconds; exit 0. The retained run log is `/tmp/hearth-field-treatment-runtime.log`.
- The passing runtime checks cover engine/public API quote and execution, unchanged invalid/stale targets, commitment locks and hero compatibility, save round-trip, canonical version-one maze safety, battle preview/execution potion parity, Inventory Enter/Space with focus/scroll and detached-button safety, Party controls, and empty-roster rendering. They use an existing saved-life fixture, not newly generated lifetimes.
- Not run: integrated version-two authored/signature maze checks, full regression, offline build, release checks, browser/layout, publication.
- Minimal bounded runtime rerun: `timeout 90s node --max-old-space-size=512 --test --test-concurrency=1 tests/field-treatment-runtime.test.js`.
- Additional established regressions to run before release: `tests/combat.test.js`, `tests/combat-focus.test.js`, `tests/world-first-focus.test.js`, `tests/keyboard-feedback.test.js`, and `tests/party-camp-recovery.test.js`.
- Browser verification must cover a narrow phone viewport and desktop: Inventory and Party treatment, exact near-cap effect, Enter/Space and touch, repeat and stale controls, disabled target reason, announcement, focus/scroll retention, safe descent treatment, danger/event/crossing blocks, save/reload, and unchanged ordinary hero treatment.

## Canonical maze adapter integration

This branch starts from v0.48 source and supports the existing version-one maze resolver. Unknown maze versions fail closed for companion treatment, rather than assuming an old geometry kind remains authoritative.

When the authored-maze identity work is integrated, update only the engine boundary to import `mazeRoomCell` rather than `mazeLayout` for field treatment, and replace its descriptor expression with `[1,2].includes(s.maze?.version) ? mazeRoomCell(s.maze) : null`. Do not pass a target cell ID. That adapter normalizes authored fight/boss/hazard and signature guardian/crossing to the same enemy/guardian/trap danger vocabulary. The pure gate and tests already include version-one and version-two descriptor contract cases. Re-run the focused runtime suite on the integrated source and add earned authored/signature current-room integration evidence before release.

The shared scalar is also used by the existing battle command resolver. Battle previews already call that same resolver. The passing focused combat integration test checks pure preview, exact chosen-ally effect, shared potion debit and unchanged cap at four injury levels, plus wrong-side rejection. No battle balance formula is otherwise changed.
