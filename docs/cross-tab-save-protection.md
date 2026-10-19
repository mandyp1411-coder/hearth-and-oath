# Cross-tab save protection

Roadmap item 1 addresses the confirmed v0.43.0 failure where a stale tab saving its active life serialized its entire old slot list and erased a life created in another tab.

## Behavior

- Each mutation reads the latest durable v1 envelope. An ordinary save changes only its target slot and active-slot selection, retaining other lives, their timestamps, deletion tombstones, and recovery backups.
- Slot revisions and the complete last-observed target/backup token detect a changed, replaced, deleted, or deleted-and-recreated target, including identical-content replacements. A rejected autosave retains its attempted snapshot for session play and export. A later save to another slot cannot silently authorize that stale snapshot.
- Browser autosaves, manual saves, character completion, imports, backup recovery, and deletions all use the same exclusive Web Lock when available. Same-tab operations keep their order even if an offline/opaque origin exposes Locks but denies using it.
- A conflict offers session export, explicit reload, or keeping the unsaved session open. Dismissing the dialog leaves a persistent warning. Normal menu/Continue navigation cannot silently clear a newly discovered queued-save conflict.
- Reload, import, and deletion requests that are still waiting for the lock can be cancelled. Reload adoption and navigation happen in the same synchronous critical section. Import uses the exact reviewed target token; deletion retains the existing stricter whole-list review contract.
- The compatibility mirror commits before the authoritative envelope. A failed import/deletion does not partially replace a life or its recovery backup. Autosave quota failures retain the live session for export and can retry against unchanged durable target data.
- Existing v1 saves and legacy fallback saves load without a write. Metadata is added lazily on later saves. An explicitly empty v1 envelope is authoritative, preventing deleted lives from returning through an older mirror. Title-screen imports now reach the reviewed import handler rather than stopping at the no-active-game guard.

## Boundaries

Web Locks coordinate tabs running this updated code. An already-open older build does not obey that lock and can still perform its old destructive write. Reload older game tabs after an update. The updated tab detects an old-build change before its next write and preserves its own unsaved life for export, but cannot retroactively prevent or undo data already erased by the old build.

Browsers/origins without usable Web Locks receive a visible one-tab saving warning. They still get durable target checks and latest-envelope merging, but localStorage has no atomic compare-and-swap, so truly simultaneous uncoordinated writes cannot be guaranteed safe. Use one game tab there. No account, cloud save, automatic destructive conflict resolution, or public-audience change is introduced.

## Verification

Focused checks cover the genuine full-engine two-tab new-slot reproduction; independent-slot writes; same-slot progress, deletion and identical-content replacement; reviewed imports; strict deletion reviews; backups; quota and read failures; old v1/legacy recovery; obsolete mirrors; old-build writes; Web Lock ordering and fallback; UI export/reload; title import/backup review; and pending navigation/import/delete/reload cancellation.

Command:

```sh
node --test tests/save-concurrency.test.js tests/save-conflict-ui.test.js tests/saves.test.js tests/save-deletion-v40.test.js tests/reliability.test.js
```

The independent reviewer found two asynchronous session-loss races during development. Both were fixed and are retained as deterministic held-lock regressions. These handler tests do not model CSS, physical touch, browser scheduling, or a full legacy-suite pass.

Actual isolated Chromium launch was blocked by the execution sandbox's socket restrictions; its escalated launch failed before execution. The connected cloud browser advertises no isolated-profile/context capability and cannot reach the local QA origin. No existing user or QA save was imported over, deleted, or replaced to work around those limits. Real-browser conflict layout, actual cross-process lock scheduling, and packaged-offline execution remain unverified unless a later release check records them.

The unrelated historical tests/entry-flow.test.js fails at line 41 on the unchanged v0.43.0 baseline and this branch because its origin-control assumptions are obsolete. That test is not claimed as passing and was not modified in this fix.
