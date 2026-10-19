# Roadmap 28: detached tactics rehearsal checkpoint

## Status and source base

This is an isolated, unpublished feature branch. The initial resolver/scenario checkpoint was audited against public v0.48.0, commit `b24cba83` (Git abbreviation `b24cba8`). The branch was then rebased onto exact published v0.49.0 commit `4e91d5d` before the approved UI stage. Engine, save-store, release and publication code remain unchanged. Browser verification is still pending.

The worktree is `hearth-tactics-practice`, branch `roadmap/tactics-practice`. Further writes belong only in that worktree. The main published checkout is not a development target for this checkpoint.

## Implemented API

### `takeBattleActionDetailed(battle, actionId, targetId)`

The detailed resolver in `dist/js/combat.js` returns:

- `accepted`: whether the existing command validation accepted the action.
- `actionId`, `actorId`, `targetId`: the actual accepted command's identities; actor/target IDs are null for rejected commands.
- `reason`: the existing rejection reason, or an inactive-encounter explanation.
- `afterCommand`: a detached snapshot after the existing command application, seal/silence cleanup and intent refresh, but before `finishIfNeeded`, turn entry or automatic enemy actions. It is null on rejection.
- `battle`: exactly the existing normal resolver's result, including rejected-command log entries and automatic turns.

An immediate snapshot can contain a defeated enemy while `outcome` is still null because terminal resolution occurs afterward. Consumers must use `battle` for final outcome and turn state.

The old public `takeBattleAction` delegates to the same implementation without requesting a report. Its normal path retains the existing single full-battle clone. Only an accepted detailed call allocates the extra immediate-command snapshot. No damage, healing, ward, targeting, status, cost or enemy rules were copied into a second resolver.

### Pure practice-session module

`dist/js/tactics-practice.js` exports:

- `TACTICS_LESSONS`: four fixed lesson descriptions.
- `TACTICS_PRACTICE_NOTICE`: an explicit fictional-party/no-life-consequences notice.
- `createTacticsPractice(lessonId)`: a deterministic new session; it accepts no life or save object.
- `takeTacticsPracticeAction(session, actionId, targetId)`: a detached session transition using the detailed real resolver.

A session contains its lesson ID, battle, `active`/`completed`/`ended` status, feedback and ephemeral accepted-inspection evidence. It is not a life, save format or unlock record. Completing a lesson need not win the battle, so a completed session can still have `battle.outcome === null`. The future UI must stop offering commands based on session status, not only battle outcome.

Retry means calling the factory again. Leaving means dropping the session. There is intentionally no persistence or restoration API.

## Fixed fictional situations

Each situation starts from `createBattle` with a small synthetic training source and the existing public `root_spoor` encounter. It keeps one of that encounter's existing starter enemies and prunes the unused actor/order entry. Enemy stats, portraits, weakness, resistance and typed plans are not recreated. Rewards are zero, and no instance ID, expedition context, boss ID, boss phase or advanced trained technique is added.

1. Protect an ally: one wolf and an injured fictional ally. Real opening Inspect commands allow the actual wolf to mark the ally, then return to the guardian before its pack strike.
2. Disrupt a visible charge: one boar and a fictional staff caster. A real opening Defend command lets the boar prepare its normal visible charge.
3. Use an inspected weakness: one wolf and a fictional caster with the actual basic elemental spell prerequisites. Inspection must be performed during this session.
4. Cleanse a wound: one wolf, a fictional healer and an injured ally. The captured scenario starts with a normal two-turn bleeding status applied through `applyStatus`. The ally acts immediately after the healer. The healer uses the ordinary role's Cleansing ward, not an earned advanced technique.

These are scenario inputs and ordinary resolver actions, not easier replacement combat rules. A tutorial failure or defeat remains only a fictional battle result.

## Exact completion predicates

`B` is the pre-command battle, `C` the accepted immediate-command snapshot and `R` the actual normal post-turn result. Rejected actions never complete a lesson.

### Protect an ally

- B's real enemy target resolver selects the living injured ally, not the acting character.
- C's acting character is defending and protecting.
- C's same target resolver now selects that protector.
- R's actual wolf plan advances once and records the protector as `lastTargetId`.
- The ally's HP is unchanged, the protector survives, and the protector actually loses HP or ward from the reply.

### Disrupt a charge

- B's selected living enemy has a positive charge and its next authored plan is `charged_strike`.
- C's same enemy remains alive, with both charge and stolen power absent.
- R's actual enemy plan advances once.

A naturally spent charge or killing the enemy does not count. Inspect and a staff counter both work because the existing command resolver genuinely clears the charge. An uncharged base strike can still damage the caster.

### Exploit a weakness

- B's selected living enemy is inspected, and this session records an earlier accepted Inspect command against that same enemy.
- The accepted action is the basic spell matching that enemy's actual weakness.
- C shows real enemy HP loss and an actual five-MP caster expenditure.

Casting first, guessing, inspecting another target or using the wrong element does not count.

### Cleanse a wound

- B's selected practice ally is living and has positive bleeding damage and duration.
- C removes both bleeding keys, leaves the ally alive, and spends the actual four-MP support cost.
- R reaches that ally's next turn without a bleeding tick: its HP equals C's HP.

Healing alone, a potion, wrong targeting or duration expiry does not count.

## Source contracts

Line references below refer to public-v48 before this checkpoint's small resolver seam:

- Starter encounter data and actor creation: `dist/js/combat.js:58-65, 311-407`.
- Wound ticks and guard expiry: `dist/js/combat.js:152-180`.
- Actual protection, ward absorption and damage: `dist/js/combat.js:205-225`.
- Action availability and basic spell prerequisites: `dist/js/combat.js:410-438`.
- Support costs and cleansing: `dist/js/combat.js:552-593`.
- Target and command rejection: `dist/js/combat.js:606-618`.
- Staff counter, Inspect and elemental spells: `dist/js/combat.js:630-632`.
- Defend: `dist/js/combat.js:661-665`.
- Existing action and preview resolver: `dist/js/combat.js:675-745`.
- Guard priority and target selection: `dist/js/enemy-targets.js:14-39`.
- Existing wolf/boar cycles: `dist/js/encounter-design-v27.js:6-32, 65-92`.
- Plan application, last actual target and charge consumption: `dist/js/enemy-plans-v27.js:35-67`.

The boar design prose calls its rush armor-piercing, but the actual executor's pierce flag depends on spirit role. Practice wording intentionally does not repeat that inaccurate claim.

## Verified at this checkpoint

Command:

`node --test tests/tactics-practice.test.js tests/combat.test.js`

Result after recovery into the isolated worktree: 66 passed, zero failed, approximately 0.36 seconds. No engine/semantic/browser/build/release suite was run.

Coverage includes 257 resolver cases with byte-exact ordinary/detailed parity and a SHA-256 golden recorded from the unchanged public-v48 `combat.js` loaded from Git commit `b24cba8`. The aggregate golden is `c921da23f888771fbf863c6541438de5623a277e8216f04ade667af37662b2a3`.

The golden spans four scenarios, legacy warrior/mage/rogue inputs, six advanced-technique inputs, valid/invalid targets, depleted MP, unknown commands, inactive battle and terminal outcomes. Tests also check clone allocation, detached evidence, actual protection, natural charge consumption, foe death, inspection ordering, matching damage/cost, wound expiry, rejected commands, retreat, retry and terminal-session lockout.

## UI-stage boundaries

The resolver seam was reviewed before UI wiring. The approved shared renderer and memory-only controller are now implemented in source against v49. The following requirements remain release acceptance criteria, not claims of browser verification.

1. Extract a small pure shared battle read model/renderer instead of copying `app.js` battle UI. Inject portraits, context, IDs/radio names, operation namespace and outcome content. The normal life wrapper keeps real-life presentation; practice receives fictional context and no real rewards/recovery language.
2. Keep the entire session in module memory, outside `game`, `saved`, workspace settings and all save envelopes. Never install its battle in `game.battle`.
3. Use `combat.takeBattleActionDetailed` through the pure session transition, never `engine.chooseBattleAction` or `resolveBattle`. The former applies personality effects; the latter applies resources, growth, world facts and recovery.
4. Async practice entry must await the existing save-coordinator barrier and then recheck the exact original life identity, slot and view/request token. A canceled request or intervening navigation/new life must not open practice afterward.
5. Confirm the unchanged original life is durable and unconflicted before live-life practice opens. If undurable or conflicted, explain that saving needs attention; do not claim reload safety.
6. After that durable entry boundary, practice start, moves, target changes, retries, completion, defeat, retreat, Cancel, Escape, title and slot transitions must cause zero storage writes. Do not route them through `update`, `save`, `rememberWorkspace`, personality or reward handling.
7. Keep separate target state, namespaced controls/IDs and focus context. Make life controls inert and suppress their shortcuts/stale actions. Restore the entry trigger and original UI context on exit.
8. A reload discards only ephemeral practice. Do not restore by writing an old life over a newer competing tab; use the existing save-conflict behavior.
9. Verify exact canonical/save-envelope/legacy-mirror/backup/slot/workspace equality, reload/crash scenarios, pending-entry cancellation, competing tabs, storage failure, keyboard/focus behavior and real-browser layouts before release.

This addition teaches current mechanics. It is not an overall JRPG balancing change or evidence that the broader balance evaluation is complete.


## UI source and fast-test checkpoint

- `dist/js/battle-ui.js` now owns the shared pure read model and battle workspace rendering. The normal app wrapper retains actual life portraits, personality explanations and the unchanged real outcome expression. Practice supplies fictional context, its own operations/radio names/preview IDs, separate targets and outcome content. No fake game object is swapped into canonical app state.
- `dist/js/tactics-practice-session.js` coordinates memory-only requests behind the injected existing save queue. It rechecks the exact life object/content, slot, screen, tab, modal, view token, request and connected trigger inside the barrier. Request replacement/cancel and new lesson selection invalidate old tokens.
- The app additionally uses v49's fresh `hasUnsavedChanges(slot, life)` comparison, not just memoized health, to block an acknowledged object changed in place. A saved, available, durable, unconflicted baseline is required; the gate performs no save attempt itself.
- Active practice has positive, matching-session control dispatch before aliases and real handlers. Background operations, input/change/submit handlers, shortcuts, repeated keyboard activation and double-clicks cannot reach life mutation. Defensive update/save/workspace guards prevent accidental writes. Escape/overlay close discard practice and render the original context without a restoration write. Conflict detection discards practice before presenting the existing v49 conflict dialog.
- A successful async request is checked again after awaiting so a conflict/discard cannot be followed by a stale practice modal opening.

Fast command: `node --test tests/tactics-practice.test.js tests/tactics-practice-session.test.js tests/battle-ui.test.js tests/combat.test.js`.

Result: 76 tests passed, zero failed, approximately 0.38 seconds. The 257 public-v48 resolver output goldens and normal one-clone path still pass. New pure coverage includes queue barriers, exact context cancellation, saved-health failures, actual competing/deleted storage, an earlier real autosave completing before entry, token rotation, retry/discard/reload byte equality, fresh in-place mutation detection and renderer control namespaces.

Prepared, not yet run pending the shared engine-test lane: `tests/tactics-practice-ui.test.js`. It exercises actual app handlers for title-only rehearsal; all four lessons; all-key storage equality and zero writes; focus/context restoration; background aliases/stale controls; quota-blocked entry; competing-save discard; cancellation while the actual Web Lock coordinator is held; and a fresh app load from unchanged original storage. The common UI harness gains only an optional injected Locks object.

No aggregate engine/semantic, browser, build or release check has yet been run for the UI stage.
