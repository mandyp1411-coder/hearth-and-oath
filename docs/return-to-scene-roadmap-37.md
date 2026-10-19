# Return to an actual scene (roadmap 37)

## Scope and source findings

Prepared against published v0.49.1 commit `99e19bd`, in the isolated sparse
`hearth-return-scene` worktree. No generated/offline files, artwork, save data,
version metadata or other roadmap branches are changed by this checkpoint.

`app.js` used to clear `serviceSession`, `shopSession` and `craftSession` before
ordinary tab navigation. The actual person scene instead uses `selectedContact`.
Work inquiries also need `serviceTopic`. The existing `workspaceReturn` is a
separate map/interruption mechanism and is intentionally unchanged.

`settlementServices` provides current, here-only, identity-bound providers;
`nearbyContacts` supplies actually present eligible contacts, rather than remote
relationship records. `currentShopSession` and `currentCraftSession` validate
actual merchant/artisan sessions. Existing view-position keys distinguish a
service or person from other place views; their scroll maps remain in use.

## Behavior

- Inventory or Journal (including the legacy quests/lore aliases) can expose one
  explicit `Return to [actual name]` control after leaving an actual person or
  service. A workbench is named as that person's workbench.
- Inventory/Journal switches, section changes, searching and item inspection
  retain the same origin. They do not create a history stack.
- Return directly reinstates the current scene's UI and restores its retained
  scrolling and safe last focus, or its heading. It does not call `visitService`,
  an engine command or a game-save operation. Ordinary workspace preferences
  remain separate and may still be saved.
- The trail binds the exact game and hero objects, action revision, active slot,
  seed/birth day/generation, day/age/phase, location/physical position/interior,
  exact participant snapshot and current provider identity. It rechecks these
  bindings both when rendered and when activated.
- Events, battles, pending replies, journeys/crossings, offsite states, descents,
  prison, ended lives and save conflicts reject the optional return.
- Any engine update clears the trail, including same-day equipment, potion or
  note actions. Replaced game objects reject it as well. Explicit scene close,
  unrelated navigation, title/load/import/slot changes or reload discard it.
- Trade and crafting retain only whitelisted browsing presentation. Staged goods,
  quantities, selected items/designs, confirmations and quotes are not captured.
  Returned trades start with fresh empty offers; returned workbenches require a
  new design inspection. Back/close and obsolete detached controls cannot commit
  a trade or craft.
- Focus callbacks use the existing render-revision guard so a newer modal,
  navigation or mandatory moment cannot be stolen by the old scene return.

The transient trail is not in game saves, exports or workspace preferences. It
holds one existing game reference and small frame/person/UI snapshots, not a
whole-save clone for each navigation. No providers are projected remotely.

## Verification at this checkpoint

Passed:

- `node --test tests/scene-return.test.js`: 50/50 pure leaf/controller tests,
  approximately 0.11 seconds. These cover identity/frame invalidation, participant
  replacement/availability, mandatory-state priority, utility navigation,
  bounded one-entry behavior, and safe session field projection.
- `node --check dist/js/app.js`
- `node --check dist/js/scene-return.js`
- `node --check tests/scene-return-ui.test.js`
- `git diff --check`

Prepared but NOT RUN pending the parent's serial heavy engine/VM lane:

- `tests/scene-return-ui.test.js`: 22 mounted production-handler cases for actual
  work inquiry/person returns; focus and retained scroll bookkeeping; read-only
  utility/section navigation; explicit close and stale controls; potion/equip/
  Journal-note invalidation; merchant, materials and inn basket reset; recipe
  reset; pending-reply/event priority; duplicate-seed slot/reload isolation;
  changed-slot conflicts; and newer-modal/navigation focus races.

Suggested focused serial run, before integrating/releasing:

```
node --test --test-concurrency=1 tests/scene-return-ui.test.js tests/keyboard-feedback.test.js tests/journal-commitments.test.js tests/save-conflict-ui.test.js tests/world-first-focus.test.js tests/explore-focus.test.js
```

The mounted surface is not browser layout, responsive, screenshot or assistive
technology evidence. Build, browser, compiled/offline VM, aggregate regression,
publication and deployed-site acceptance have NOT been run by this worker.
Those checks remain the publisher's serial responsibility. The later merge must
retain the newer first-day guide, save-health status and all existing UI paths.

## Parent-run integration and fixture correction

The parent subsequently ran all 22 mounted handler cases on `5f1ca42` in the
serial lane: **21 passed / 1 failed in 20.488 seconds**. The failure was the
same-seed cross-slot fixture, which renamed `hero.name` without updating its
active lineage record. `validateLineage` requires those names to match, so the
save store correctly discarded that invalid neighbor and rendered slot 2 as an
empty, disabled load card. This was not a missing or newly invented load route.

The corrected fixture uses independently cloned, otherwise identical captured
lives, including seed, owner, name and every saved field. It explicitly validates
both input lives and checks that both slots are occupied before proceeding. The test now follows the actual header Menu → Main
menu → title Load life → enabled saved-life card path, then checks exact active
slot IDs, exact loaded snapshots, unchanged neighboring slots, and absent scene
trails in both directions. No production code or cross-slot assertion was
weakened by this correction.

The corrected mounted suite has **not been rerun** at this follow-up checkpoint;
it remains queued for the parent's serial lane. The 21 earlier passes are not a
claim that the corrected full suite passes. The 50 pure tests and source syntax
checks were rerun separately and still pass.

## Outdoor mentor integration correction

Read-only integration review found that an actual here-only outdoor mentor has
the authoritative `trail` room but no settlement interior. The generic gate
fallback incorrectly rejected that source. The narrow correction allows only a
non-settlement mentor with no interior, the exact class-bound mentor/provider
identity, the actual person's current location, and that provider's real outdoor
room. Ordinary service room checks and all existing slot, revision, participant
and action-time validation remain intact.

- `timeout 5s node --test tests/scene-return.test.js`: **65/65 PASS**, 0.120 seconds.
  Added checks reject stale outdoor location/person/provider/class/room,
  unavailability, a newly occupied interior or settlement, and non-mentor bypass.
- `node --check dist/js/scene-return.js`,
  `node --check tests/scene-return-ui.test.js`, and `git diff --check`: PASS.
- Added one mounted production-handler regression for an actual forest Druid
  mentor, Inventory/Journal detours, unchanged save bytes/no repeated meeting,
  exact focus and identity, and real same-day item-action invalidation while the
  outdoor trail is still active. The updated
  mounted suite is now 23 cases and **NOT RUN at this checkpoint**. The parent's
  earlier 22/22 result applies to `36894da`, not this correction or a combined
  integration. No build, engine-backed, VM, browser or publication check ran here.

### Terminal mounted acceptance of the outdoor correction

The parent granted one serial heavy-lane run at clean runtime/test head
`4f5d404549b9dc4c6d7fa553cb1682d2ab8bb30f`. The command
`timeout 90s env NODE_OPTIONS=--max-old-space-size=512 UV_THREADPOOL_SIZE=1 node --test --test-concurrency=1 tests/scene-return-ui.test.js`
passed **23/23**, with zero failures and exit 0, in **22.659651 seconds**.
The new outdoor mentor case passed, including exact provider/focus and unchanged
saved life on return, then same-day potion invalidation while a new trail was
still active. This is isolated mounted production-handler evidence, not combined
roadmap 27/28/35/36, browser layout, compiled/offline or release certification.
No runtime code changed after that run; this paragraph records its result.

## Current composed integration correction

Read-only review against published v0.53.0 found a safe presentation loss: the newer inn/repertoire topic was not part of the older return whitelist. The narrow integrated correction retains only the exact current inn provider's `repertoire` topic, alongside the existing work provider's `commissions`; it retains no performance, permission, quote, selected piece, draft or promised action. A person view cannot inherit a service topic, and other provider/topic combinations remain rejected. Three pure regressions and an actual composed inn→repertoire→Inventory/Journal→Return regression are prepared; current combined runtime acceptance remains pending. Isolated historical passes above are not relabeled as a composed pass.
